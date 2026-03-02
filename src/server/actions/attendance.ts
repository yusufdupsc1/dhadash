// src/server/actions/attendance.ts
"use server";

import { auth } from "@/lib/auth";
import { isGovtPrimaryModeEnabled, isPrimaryGrade, PRIMARY_GRADES } from "@/lib/config";
import { db } from "@/lib/db";
import {
    buildStudentVisibilityWhere,
    getTeacherClassScope,
    isPrivilegedOrStaff,
} from "@/lib/server/role-scope";
import {
    asPlainArray,
    normalizeGroupCount,
    toIsoDate,
} from "@/lib/server/serializers";
import { createDomainEvent, publishDomainEvent } from "@/server/events/publish";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const AttendanceEntrySchema = z.object({
  studentId: z.string(),
  status: z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED", "HOLIDAY"]),
  remarks: z.string().optional(),
});

const MarkAttendanceSchema = z.object({
  classId: z.string().min(1, "Class is required"),
  date: z.string().min(1, "Date is required"),
  entries: z.array(AttendanceEntrySchema).min(1, "At least one entry required"),
});

export type MarkAttendanceData = z.infer<typeof MarkAttendanceSchema>;

type ActionResult<T = void> =
  | { success: true; data?: T; error?: never }
  | {
      success: false;
      error: string;
      fieldErrors?: Record<string, string[]>;
      data?: never;
    };

async function getAuthContext() {
  const session = await auth();
  const user = session?.user as
    | {
        id?: string;
        institutionId?: string;
        role?: string;
        email?: string | null;
        phone?: string | null;
      }
    | undefined;

  if (!user?.id || !user.institutionId || !user.role) {
    throw new Error("Unauthorized");
  }
  return {
    userId: user.id,
    institutionId: user.institutionId,
    role: user.role,
    email: user.email,
    phone: user.phone,
  };
}

export async function markAttendance(
  formData: MarkAttendanceData,
): Promise<ActionResult> {
  try {
    const { institutionId, userId, role, email, phone } = await getAuthContext();
    const parsed = MarkAttendanceSchema.safeParse(formData);

    if (!parsed.success) {
      return {
        success: false,
        error: "Validation failed",
        fieldErrors: parsed.error.flatten().fieldErrors as Record<
          string,
          string[]
        >,
      };
    }

    const data = parsed.data;
    const date = new Date(data.date);
    date.setHours(0, 0, 0, 0);

    if (!isPrivilegedOrStaff(role) && role !== "TEACHER") {
      return { success: false, error: "Insufficient permissions" };
    }

    if (role === "TEACHER") {
      const classIds = await getTeacherClassScope({
        institutionId,
        userId,
        email,
        phone,
      });
      if (!classIds.includes(data.classId)) {
        return { success: false, error: "You can only mark attendance for assigned classes." };
      }
    }

    // Verify class belongs to institution
    const cls = await db.class.findFirst({
      where: { id: data.classId, institutionId },
      select: { id: true, grade: true },
    });
    if (!cls) return { success: false, error: "Class not found" };
    if (isGovtPrimaryModeEnabled() && !isPrimaryGrade(cls.grade)) {
      return { success: false, error: "Only Class 1 to 5 attendance is allowed in Govt Primary mode." };
    }

    const studentIds = data.entries.map((entry) => entry.studentId);
    const validStudents = await db.student.count({
      where: {
        institutionId,
        classId: data.classId,
        id: { in: studentIds },
      },
    });
    if (validStudents !== studentIds.length) {
      return { success: false, error: "Some students are not in the selected class." };
    }

    // Upsert attendance records
    await db.$transaction(async (tx) => {
      for (const entry of data.entries) {
        await tx.attendance.upsert({
          where: { studentId_date: { studentId: entry.studentId, date } },
          create: {
            date,
            status: entry.status,
            remarks: entry.remarks || null,
            institutionId,
            classId: data.classId,
            studentId: entry.studentId,
          },
          update: {
            status: entry.status,
            remarks: entry.remarks || null,
            markedAt: new Date(),
          },
        });
      }

      await tx.auditLog.create({
        data: {
          action: "MARK_ATTENDANCE",
          entity: "Attendance",
          entityId: data.classId,
          newValues: {
            date: data.date,
            classId: data.classId,
            count: data.entries.length,
          },
          userId,
        },
      });
    });

    publishDomainEvent(
      createDomainEvent("AttendanceMarked", institutionId, {
        classId: data.classId,
        date: data.date,
        entriesCount: data.entries.length,
        markedBy: userId,
      }),
    );
    publishDomainEvent(
      createDomainEvent("NotificationCreated", institutionId, {
        channel: "attendance",
        title: "Attendance submitted",
        body: `${data.entries.length} attendance records were saved.`,
        actorId: userId,
        entityId: data.classId,
      }),
    );

    revalidatePath("/dashboard/attendance");
    return { success: true };
  } catch (error) {
    console.error("[MARK_ATTENDANCE]", error);
    return { success: false, error: "Failed to mark attendance." };
  }
}

export async function getAttendanceForClass({
  classId,
  date,
}: {
  classId: string;
  date: string;
}) {
  const { institutionId, role, userId, email, phone } = await getAuthContext();

  const d = new Date(date);
  d.setHours(0, 0, 0, 0);

  let allowedClassId = classId;
  let studentFilter: Record<string, unknown> = {};

  if (role === "TEACHER") {
    const classIds = await getTeacherClassScope({
      institutionId,
      userId,
      email,
      phone,
    });
    if (!classIds.includes(classId)) {
      return [];
    }
  } else if (!isPrivilegedOrStaff(role)) {
    const visibility = await buildStudentVisibilityWhere({
      institutionId,
      role,
      userId,
      email,
      phone,
    });
    studentFilter = visibility;
    allowedClassId = classId || "";
  }

  const classAllowed = await db.class.findFirst({
    where: {
      id: classId,
      institutionId,
      ...(isGovtPrimaryModeEnabled() ? { grade: { in: [...PRIMARY_GRADES] } } : {}),
    },
    select: { id: true },
  });
  if (!classAllowed) return [];

  const [students, attendance] = await Promise.all([
    db.student.findMany({
      where: {
        institutionId,
        status: "ACTIVE",
        ...(allowedClassId ? { classId: allowedClassId } : {}),
        ...studentFilter,
      },
      select: {
        id: true,
        studentId: true,
        firstName: true,
        lastName: true,
        photo: true,
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    }),
    db.attendance.findMany({
      where: { classId, institutionId, date: d },
      select: { studentId: true, status: true, remarks: true },
    }),
  ]);

  const attendanceMap = new Map(attendance.map((a) => [a.studentId, a]));

  return students.map((s) => ({
    ...s,
    attendance: attendanceMap.get(s.id) ?? null,
  }));
}

export async function getAttendanceSummary({
  classId,
  startDate,
  endDate,
}: {
  classId?: string;
  startDate: string;
  endDate: string;
}) {
  const { institutionId, role, userId, email, phone } = await getAuthContext();

  let where: Record<string, unknown> = {
    institutionId,
    ...(isGovtPrimaryModeEnabled() ? { class: { grade: { in: [...PRIMARY_GRADES] } } } : {}),
    date: {
      gte: new Date(startDate),
      lte: new Date(endDate),
    },
  };

  if (role === "TEACHER") {
    const classIds = await getTeacherClassScope({
      institutionId,
      userId,
      email,
      phone,
    });
    const scopedClassIds = classId
      ? classIds.filter((id) => id === classId)
      : classIds;
    if (scopedClassIds.length === 0) {
      return {
        total: 0,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
        presentRate: 0,
        breakdown: [],
      };
    }
    where = {
      ...where,
      classId: { in: scopedClassIds },
    };
  } else if (!isPrivilegedOrStaff(role)) {
    const visibility = await buildStudentVisibilityWhere({
      institutionId,
      role,
      userId,
      email,
      phone,
    });
    where = {
      ...where,
      ...(classId ? { classId } : {}),
      student: visibility,
    };
  } else {
    where = {
      ...where,
      ...(classId && { classId }),
    };
  }

  const data = await db.attendance.groupBy({
    by: ["status"],
    where,
    _count: true,
  });

  const breakdown = asPlainArray(data).map((item) => ({
    status: item.status,
    _count: normalizeGroupCount(item._count),
  }));

  const total = breakdown.reduce((sum, item) => sum + item._count, 0);
  const present = breakdown.find((item) => item.status === "PRESENT")?._count ?? 0;
  const absent = breakdown.find((item) => item.status === "ABSENT")?._count ?? 0;
  const late = breakdown.find((item) => item.status === "LATE")?._count ?? 0;
  const excused = breakdown.find((item) => item.status === "EXCUSED")?._count ?? 0;

  return {
    total,
    present,
    absent,
    late,
    excused,
    presentRate: total > 0 ? Math.round((present / total) * 100) : 0,
    breakdown,
  };
}

export async function getAttendanceTrend({
  classId,
  days = 30,
}: {
  classId?: string;
  days?: number;
}) {
  const { institutionId, role, userId, email, phone } = await getAuthContext();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  let where: Record<string, unknown> = {
    institutionId,
    ...(isGovtPrimaryModeEnabled() ? { class: { grade: { in: [...PRIMARY_GRADES] } } } : {}),
    date: { gte: startDate },
  };

  if (role === "TEACHER") {
    const classIds = await getTeacherClassScope({
      institutionId,
      userId,
      email,
      phone,
    });
    const scopedClassIds = classId
      ? classIds.filter((id) => id === classId)
      : classIds;
    if (scopedClassIds.length === 0) {
      return [];
    }
    where = {
      ...where,
      classId: { in: scopedClassIds },
    };
  } else if (!isPrivilegedOrStaff(role)) {
    const visibility = await buildStudentVisibilityWhere({
      institutionId,
      role,
      userId,
      email,
      phone,
    });
    where = {
      ...where,
      ...(classId ? { classId } : {}),
      student: visibility,
    };
  } else {
    where = {
      ...where,
      ...(classId && { classId }),
    };
  }

  const data = await db.attendance.groupBy({
    by: ["date", "status"],
    where,
    _count: true,
    orderBy: { date: "asc" },
  });

  return asPlainArray(data).map((item) => ({
    date: toIsoDate(item.date),
    status: item.status,
    _count: normalizeGroupCount(item._count),
  }));
}

// ─── Export Functionality ───────────────────────────────

export async function exportAttendanceRegisterToCSV(params: {
  classId: string;
  date: string;
}): Promise<{
  success: boolean;
  data?: Array<{
    rolNo: string;
    studentId: string;
    firstName: string;
    lastName: string;
    status: string;
  }>;
  error?: string;
}> {
  try {
    const session = await auth();
    const user = session?.user as
      | {
          id?: string;
          institutionId?: string;
          role?: string;
          email?: string | null;
          phone?: string | null;
        }
      | undefined;

    if (!user?.institutionId) {
      return { success: false, error: "Unauthorized" };
    }

    const { institutionId, id: userId, role, email, phone } = user;

    // Verify class exists
    const classExists = await db.class.findUnique({
      where: { id: params.classId },
      select: { institutionId: true },
    });

    if (!classExists || classExists.institutionId !== institutionId) {
      return { success: false, error: "Class not found" };
    }

    // Get students for the class with attendance
    const attendanceDate = new Date(params.date);
    attendanceDate.setHours(0, 0, 0, 0);

    const students = await db.student.findMany({
      where: {
        classId: params.classId,
        institutionId,
      },
      select: {
        id: true,
        studentId: true,
        firstName: true,
        lastName: true,
        rollNo: true,
        attendance: {
          where: {
            date: attendanceDate,
          },
          select: {
            status: true,
          },
          take: 1,
        },
      },
      orderBy: [
        { rollNo: "asc" },
        { firstName: "asc" },
      ],
    });

    const exportData = asPlainArray(students).map((student, index) => ({
      rolNo: student.rollNo || String(index + 1),
      studentId: student.studentId,
      firstName: student.firstName,
      lastName: student.lastName,
      status: student.attendance?.[0]?.status || "ABSENT",
    }));

    return { success: true, data: exportData };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Export failed",
    };
  }
}
