/**
 * Export Server Action - Centralized Export Handler
 * Orchestrates the entire export process with security, validation, and audit logging
 */

"use server";

import { auth } from "@/lib/auth";
import { convertToCSV } from "@/lib/csv-export";
import { db } from "@/lib/db";
import { buildStudentExportWhere, canExport, getExportScope } from "@/lib/exports/access-control";
import { logExportActivity } from "@/lib/exports/audit-logger";
import { createDownloadToken } from "@/lib/exports/encryption";
import { checkExportRateLimit, getRateLimitMessage } from "@/lib/exports/rate-limiter";
import {
    validateExportRequest,
    type AttendanceExportRequest,
    type StudentListExportRequest
} from "@/lib/exports/validation";
import { logApiError } from "@/lib/logger";
import { getTeacherClassScope } from "@/lib/server/role-scope";
import { asPlainArray, toIsoDate } from "@/lib/server/serializers";

interface ExportActionResult {
  success: boolean;
  downloadToken?: string;
  fileId?: string;
  expiresIn?: number;
  recordCount?: number;
  estimatedSize?: string;
  error?: string;
  rateLimitMessage?: string;
  validationErrors?: Record<string, string[]>;
}

/**
 * Main export server action
 * Called from client to initiate export process
 */
export async function requestExport(data: unknown): Promise<ExportActionResult> {
  try {
    // 1. Authenticate user
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
      return { success: false, error: "Unauthorized" };
    }

    // 2. Validate request structure
    const validated = validateExportRequest(data);
    if (!validated.valid) {
      return {
        success: false,
        error: "Invalid export request",
        validationErrors: validated.errors,
      };
    }

    const request = validated.data;

    // 3. Check basic permission
    if (!canExport(user.role, request.exportType)) {
      return {
        success: false,
        error: `You do not have permission to export ${request.exportType}`,
      };
    }

    // 4. Check rate limiting
    const rateLimit = await checkExportRateLimit(user.id, user.institutionId);
    if (!rateLimit.allowed) {
      return {
        success: false,
        error: "Export rate limit exceeded",
        rateLimitMessage: getRateLimitMessage(rateLimit),
      };
    }

    // 5. Get client IP for audit logging
    const ipAddress = process.env.NODE_ENV === "development" ? "127.0.0.1" : "0.0.0.0"; // In production, extract from headers

    // 6. Route to specific export handler
    let result: ExportActionResult;
    if (request.exportType === "STUDENT_LIST") {
      result = await exportStudentList(
        user.id,
        user.institutionId,
        user.role,
        user.email || "",
        user.phone || "",
        request as StudentListExportRequest,
        ipAddress,
      );
    } else {
      result = await exportAttendanceRegister(
        user.id,
        user.institutionId,
        user.role,
        user.email || "",
        user.phone || "",
        request as AttendanceExportRequest,
        ipAddress,
      );
    }

    return result;
  } catch (error) {
    logApiError("EXPORT_SERVER_ACTION", error);
    return { success: false, error: "Export failed. Please try again." };
  }
}

/**
 * Export student list
 */
async function exportStudentList(
  userId: string,
  institutionId: string,
  role: string,
  email: string,
  phone: string,
  request: StudentListExportRequest,
  ipAddress: string,
): Promise<ExportActionResult> {
  try {
    // Get teacher's class scope if teacher
    let teacherClassIds: string[] = [];
    if (role === "TEACHER") {
      teacherClassIds = await getTeacherClassScope({
        institutionId,
        userId,
        email,
        phone,
      });
      if (teacherClassIds.length === 0) {
        return {
          success: false,
          error: "You are not assigned to any classes",
        };
      }
    }

    // Build access scope
    const scope = getExportScope(role, teacherClassIds, undefined, undefined);

    // Build Prisma where clause
    const whereClause = {
      institutionId,
      ...buildStudentExportWhere(scope),
      ...(request.classId && role !== "TEACHER" ? { classId: request.classId } : {}),
      ...(request.classId && role === "TEACHER" && teacherClassIds.includes(request.classId)
        ? { classId: request.classId }
        : {}),
      ...(request.status ? { status: request.status } : {}),
      ...(request.search
        ? {
            OR: [
              { firstName: { contains: request.search, mode: "insensitive" as const } },
              { lastName: { contains: request.search, mode: "insensitive" as const } },
              { studentId: { contains: request.search, mode: "insensitive" as const } },
              { email: { contains: request.search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    // Fetch students
    const students = await db.student.findMany({
      where: whereClause,
      select: {
        id: true,
        studentId: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        dateOfBirth: true,
        gender: true,
        status: true,
        createdAt: true,
        class: { select: { name: true, grade: true, section: true } },
      },
      orderBy: { createdAt: "desc" },
      take: request.pageSize,
    });

    const recordCount = students.length;

    // Build export data (exclude PII if GDPR mode enabled)
    const exportData = asPlainArray(students).map((student) => ({
      studentId: student.studentId || "",
      firstName: student.firstName,
      lastName: student.lastName,
      email: request.gdprMinimalMode ? "[REDACTED]" : student.email || "",
      phone: request.gdprMinimalMode ? "[REDACTED]" : student.phone || "",
      dateOfBirth: request.gdprMinimalMode ? "[REDACTED]" : student.dateOfBirth ? toIsoDate(student.dateOfBirth) : "",
      gender: student.gender || "",
      class: student.class
        ? `${student.class.grade} - ${student.class.name}`
        : "",
      status: student.status,
      joinedDate: toIsoDate(student.createdAt),
    }));

    // Generate CSV
    const headers = [
      "studentId",
      "firstName",
      "lastName",
      "email",
      "phone",
      "dateOfBirth",
      "gender",
      "class",
      "status",
      "joinedDate",
    ] as const;
    const headerLabels = [
      "Student ID",
      "First Name",
      "Last Name",
      "Email",
      "Phone",
      "Date of Birth",
      "Gender",
      "Class",
      "Status",
      "Joined Date",
    ];

    const csv = convertToCSV(exportData, headers, headerLabels);
    const fileSize = csv.length;

    // Create download token
    const tokenResult = await createDownloadToken({
      institutionId,
      userId,
      fileId: Math.random().toString(36).substring(7),
      exportType: "STUDENT_LIST",
    });

    if (!tokenResult) {
      throw new Error("Failed to create download token");
    }

    // Log audit
    await logExportActivity({
      institutionId,
      userId,
      exportType: "STUDENT_LIST",
      recordCount,
      fileSize,
      filters: {
        classId: request.classId,
        status: request.status,
        search: request.search,
      },
      ipAddress,
      status: "SUCCESS",
    });

    return {
      success: true,
      downloadToken: tokenResult.token,
      recordCount,
      estimatedSize: `${(fileSize / 1024).toFixed(2)} KB`,
      expiresIn: tokenResult.expiresIn,
    };
  } catch (error) {
    logApiError("EXPORT_STUDENT_LIST", error);

    await logExportActivity({
      institutionId,
      userId,
      exportType: "STUDENT_LIST",
      recordCount: 0,
      fileSize: 0,
      ipAddress,
      status: "FAILED",
      errorReason: error instanceof Error ? error.message : "Unknown error",
    });

    return { success: false, error: "Failed to export student list" };
  }
}

/**
 * Export attendance register
 */
async function exportAttendanceRegister(
  userId: string,
  institutionId: string,
  role: string,
  email: string,
  phone: string,
  request: AttendanceExportRequest,
  ipAddress: string,
): Promise<ExportActionResult> {
  try {
    // Get teacher's class scope if teacher
    let teacherClassIds: string[] = [];
    if (role === "TEACHER") {
      teacherClassIds = await getTeacherClassScope({
        institutionId,
        userId,
        email,
        phone,
      });
      if (!teacherClassIds.includes(request.classId)) {
        return {
          success: false,
          error: "You do not have access to this class",
        };
      }
    }

    const attendanceDate = new Date(request.date);
    attendanceDate.setHours(0, 0, 0, 0);

    // Fetch students with attendance
    const students = await db.student.findMany({
      where: {
        classId: request.classId,
        institutionId,
      },
      select: {
        id: true,
        studentId: true,
        firstName: true,
        lastName: true,
        rollNo: true,
        attendance: {
          where: { date: attendanceDate },
          select: { status: true },
          take: 1,
        },
      },
      orderBy: [{ rollNo: { sort: "asc", nulls: "last" } }, { firstName: "asc" }],
    });

    const recordCount = students.length;

    // Build export data
    const exportData = asPlainArray(students).map((student, index) => ({
      rolNo: student.rollNo || String(index + 1),
      studentId: student.studentId,
      firstName: student.firstName,
      lastName: student.lastName,
      status: request.gdprMinimalMode ? "[REDACTED]" : student.attendance?.[0]?.status || "ABSENT",
    }));

    // Generate CSV
    const headers = ["rolNo", "studentId", "firstName", "lastName", "status"] as const;
    const headerLabels = ["Roll No", "Student ID", "First Name", "Last Name", "Status"];

    const csv = convertToCSV(exportData, headers, headerLabels);
    const fileSize = csv.length;

    // Create download token
    const tokenResult = await createDownloadToken({
      institutionId,
      userId,
      fileId: Math.random().toString(36).substring(7),
      exportType: "ATTENDANCE_REGISTER",
    });

    if (!tokenResult) {
      throw new Error("Failed to create download token");
    }

    // Log audit
    await logExportActivity({
      institutionId,
      userId,
      exportType: "ATTENDANCE_REGISTER",
      recordCount,
      fileSize,
      filters: {
        classId: request.classId,
        date: request.date,
      },
      ipAddress,
      status: "SUCCESS",
    });

    return {
      success: true,
      downloadToken: tokenResult.token,
      recordCount,
      estimatedSize: `${(fileSize / 1024).toFixed(2)} KB`,
      expiresIn: tokenResult.expiresIn,
    };
  } catch (error) {
    logApiError("EXPORT_ATTENDANCE_REGISTER", error);

    await logExportActivity({
      institutionId,
      userId,
      exportType: "ATTENDANCE_REGISTER",
      recordCount: 0,
      fileSize: 0,
      ipAddress,
      status: "FAILED",
      errorReason: error instanceof Error ? error.message : "Unknown error",
    });

    return { success: false, error: "Failed to export attendance register" };
  }
}
