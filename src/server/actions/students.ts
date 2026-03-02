// src/server/actions/students.ts
// Server Actions — Students CRUD (Next.js 16 Server Actions)
"use server";

import { auth } from "@/lib/auth";
import { isGovtPrimaryModeEnabled, PRIMARY_GRADES } from "@/lib/config";
import { db } from "@/lib/db";
import { buildStudentVisibilityWhere, isPrivilegedOrStaff } from "@/lib/server/role-scope";
import { asPlainArray, toIsoDate } from "@/lib/server/serializers";
import {
    provisionRoleUser,
    type ProvisionedCredential,
} from "@/server/services/user-provisioning";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// ─── Schemas ───────────────────────────────
type ValidationLocale = "bn" | "en";

const VALIDATION_MESSAGES: Record<
  ValidationLocale,
  {
    studentNameEnRequired: string;
    firstNameRequired: string;
    lastNameRequired: string;
    invalidEmail: string;
    guardianNameRequired: string;
    fatherNameRequired: string;
    motherNameRequired: string;
    guardianPhoneRequired: string;
    classRequired: string;
    classRangeRestricted: string;
    sectionRequired: string;
    rollRequired: string;
    rollNumericRequired: string;
    birthRegOrDateOfBirthRequired: string;
  }
> = {
  en: {
    studentNameEnRequired: "Student name (English) is required",
    firstNameRequired: "First name is required",
    lastNameRequired: "Last name is required",
    invalidEmail: "Invalid email",
    guardianNameRequired: "Guardian name is required",
    fatherNameRequired: "Father name is required",
    motherNameRequired: "Mother name is required",
    guardianPhoneRequired: "Guardian phone is required",
    classRequired: "Class is required",
    classRangeRestricted: "Only Class 1 to 5 is allowed in Govt Primary mode",
    sectionRequired: "Section is required",
    rollRequired: "Roll is required",
    rollNumericRequired: "Roll must be numeric",
    birthRegOrDateOfBirthRequired: "Birth registration number or date of birth is required",
  },
  bn: {
    studentNameEnRequired: "শিক্ষার্থীর ইংরেজি নাম আবশ্যক",
    firstNameRequired: "শিক্ষার্থীর নাম আবশ্যক",
    lastNameRequired: "শিক্ষার্থীর পদবি/শেষ নাম আবশ্যক",
    invalidEmail: "ইমেইল ঠিকানা সঠিক নয়",
    guardianNameRequired: "অভিভাবকের নাম আবশ্যক",
    fatherNameRequired: "বাবার নাম আবশ্যক",
    motherNameRequired: "মায়ের নাম আবশ্যক",
    guardianPhoneRequired: "গার্ডিয়ানের মোবাইল নম্বর আবশ্যক",
    classRequired: "শ্রেণি নির্বাচন করুন",
    classRangeRestricted: "সরকারি প্রাথমিক মোডে শুধুমাত্র ১ম থেকে ৫ম শ্রেণি অনুমোদিত",
    sectionRequired: "সেকশন আবশ্যক",
    rollRequired: "রোল নম্বর আবশ্যক",
    rollNumericRequired: "রোল নম্বর শুধু সংখ্যা হতে হবে",
    birthRegOrDateOfBirthRequired: "জন্ম নিবন্ধন নম্বর অথবা জন্ম তারিখের অন্তত একটি আবশ্যক",
  },
};

function normalizeValidationLocale(locale?: string): ValidationLocale {
  if ((locale ?? "").toLowerCase().startsWith("bn")) return "bn";
  return "en";
}

const StudentSchema = (locale: ValidationLocale = "en") => {
  const m = VALIDATION_MESSAGES[locale];
  return z.object({
    firstName: z.string().max(50).optional().or(z.literal("")),
    lastName: z.string().max(50).optional().or(z.literal("")),
    studentNameBn: z.string().max(120).optional().or(z.literal("")),
    studentNameEn: z.string().max(120).optional().or(z.literal("")),
    email: z.string().email(m.invalidEmail).optional().or(z.literal("")),
    phone: z.string().optional(),
    dateOfBirth: z.string().optional(),
    gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
    classId: z.string().optional(),
    rollNo: z.string().max(20).optional().or(z.literal("")),
    guardianName: z.string().max(120).optional().or(z.literal("")),
    address: z.string().optional(),
    village: z.string().max(120).optional().or(z.literal("")),
    ward: z.string().max(80).optional().or(z.literal("")),
    upazila: z.string().max(120).optional().or(z.literal("")),
    district: z.string().max(120).optional().or(z.literal("")),
    city: z.string().optional(),
    country: z.string().optional(),
    parentFirstName: z.string().optional(),
    parentLastName: z.string().optional(),
    parentEmail: z.string().email(m.invalidEmail).optional().or(z.literal("")),
    parentPhone: z.string().optional(),
    parentRelation: z.string().optional(),
    fatherName: z.string().optional(),
    motherName: z.string().optional(),
    guardianPhone: z.string().optional(),
    birthRegNo: z.string().optional(),
    nidNo: z.string().optional(),
  });
};

export type StudentFormData = z.infer<ReturnType<typeof StudentSchema>>;
const GOVT_PRIMARY_ADMISSION_GRADES = new Set(["1", "2", "3", "4", "5"]);
const VALID_STUDENT_STATUSES = [
  "ACTIVE",
  "INACTIVE",
  "GRADUATED",
  "SUSPENDED",
  "EXPELLED",
  "TRANSFERRED",
] as const;
type StudentStatus = (typeof VALID_STUDENT_STATUSES)[number];

type ActionResult<T = void> =
  | { success: true; data?: T; error?: never }
  | {
    success: false;
    error: string;
    fieldErrors?: Record<string, string[]>;
    data?: never;
  };

// ─── Helper: get session + institution ─────
async function getAuthContext() {
  const session = await auth();
  const user = session?.user as
    | { id?: string; institutionId?: string; role?: string; email?: string | null; phone?: string | null }
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

// ─── Generate Student ID ────────────────────
async function generateStudentId(institutionId: string): Promise<string> {
  const year = new Date().getFullYear();
  const count = await db.student.count({ where: { institutionId } });
  return `STU-${year}-${String(count + 1).padStart(4, "0")}`;
}

async function validateGovtPrimaryClass(institutionId: string, classId?: string) {
  if (!isGovtPrimaryModeEnabled() || !classId) return { valid: true as const };
  const cls = await db.class.findFirst({
    where: {
      id: classId,
      institutionId,
    },
    select: { grade: true, section: true },
  });
  if (!cls || !GOVT_PRIMARY_ADMISSION_GRADES.has(cls.grade)) {
    return { valid: false as const, reason: "CLASS_RESTRICTED" as const };
  }
  if (!cls.section?.trim()) {
    return { valid: false as const, reason: "SECTION_REQUIRED" as const };
  }
  return { valid: true as const };
}

function splitEnglishName(fullName: string) {
  const cleaned = fullName.trim().replace(/\s+/g, " ");
  if (!cleaned) return { firstName: "", lastName: "" };
  const parts = cleaned.split(" ");
  const firstName = parts.shift() ?? "";
  const lastName = parts.join(" ") || ".";
  return { firstName, lastName };
}

function validateStudentFields(
  data: StudentFormData,
  locale: ValidationLocale,
) {
  const m = VALIDATION_MESSAGES[locale];
  const fieldErrors: Record<string, string[]> = {};
  const govtPrimaryMode = isGovtPrimaryModeEnabled();

  if (govtPrimaryMode) {
    if (!data.studentNameEn?.trim()) fieldErrors.studentNameEn = [m.studentNameEnRequired];
    if (!data.guardianName?.trim()) fieldErrors.guardianName = [m.guardianNameRequired];
    if (!data.guardianPhone?.trim()) fieldErrors.guardianPhone = [m.guardianPhoneRequired];
    if (!data.birthRegNo?.trim() && !data.dateOfBirth?.trim()) {
      fieldErrors.birthRegNo = [m.birthRegOrDateOfBirthRequired];
      fieldErrors.dateOfBirth = [m.birthRegOrDateOfBirthRequired];
    }
    if (!data.classId?.trim()) fieldErrors.classId = [m.classRequired];
    if (!data.rollNo?.trim()) {
      fieldErrors.rollNo = [m.rollRequired];
    } else if (!/^\d+$/.test(data.rollNo.trim())) {
      fieldErrors.rollNo = [m.rollNumericRequired];
    }
  } else {
    if (!data.studentNameEn?.trim() && !(data.firstName?.trim() && data.lastName?.trim())) {
      fieldErrors.studentNameEn = [m.studentNameEnRequired];
    }
    if (!data.fatherName?.trim()) fieldErrors.fatherName = [m.fatherNameRequired];
    if (!data.motherName?.trim()) fieldErrors.motherName = [m.motherNameRequired];
    if (!data.guardianPhone?.trim()) fieldErrors.guardianPhone = [m.guardianPhoneRequired];
  }

  const studentNameEn = data.studentNameEn?.trim() || `${data.firstName ?? ""} ${data.lastName ?? ""}`.trim();
  const resolvedNames = splitEnglishName(studentNameEn);

  return {
    fieldErrors,
    hasErrors: Object.keys(fieldErrors).length > 0,
    studentNameEn,
    firstName: resolvedNames.firstName,
    lastName: resolvedNames.lastName,
  };
}

// ─── CREATE ─────────────────────────────────
export async function createStudent(
  formData: StudentFormData,
  locale?: string,
): Promise<
  ActionResult<{
    id: string;
    studentId: string;
    studentCredential?: ProvisionedCredential | null;
    parentCredential?: ProvisionedCredential | null;
  }>
> {
  try {
    const { institutionId, userId, role } = await getAuthContext();
    if (!isPrivilegedOrStaff(role)) {
      return { success: false, error: "Insufficient permissions" };
    }
    const currentLocale = normalizeValidationLocale(locale);
    const parsed = StudentSchema(currentLocale).safeParse(formData);

    if (!parsed.success) {
      return {
        success: false,
        error: currentLocale === "bn" ? "তথ্য যাচাই ব্যর্থ হয়েছে" : "Validation failed",
        fieldErrors: parsed.error.flatten().fieldErrors as Record<
          string,
          string[]
        >,
      };
    }

    const data = parsed.data;
    const validated = validateStudentFields(data, currentLocale);
    if (validated.hasErrors) {
      return {
        success: false,
        error: currentLocale === "bn" ? "তথ্য যাচাই ব্যর্থ হয়েছে" : "Validation failed",
        fieldErrors: validated.fieldErrors,
      };
    }
    const classValidation = await validateGovtPrimaryClass(institutionId, data.classId);
    if (!classValidation.valid) {
      const m = VALIDATION_MESSAGES[currentLocale];
      if (classValidation.reason === "SECTION_REQUIRED") {
        return {
          success: false,
          error: currentLocale === "bn" ? "তথ্য যাচাই ব্যর্থ হয়েছে" : "Validation failed",
          fieldErrors: { section: [m.sectionRequired] },
        };
      }
      return {
        success: false,
        error: currentLocale === "bn" ? "তথ্য যাচাই ব্যর্থ হয়েছে" : "Validation failed",
        fieldErrors: { classId: [m.classRangeRestricted] },
      };
    }
    const studentId = await generateStudentId(institutionId);

    const student = await db.$transaction(async (tx) => {
      const studentName = validated.studentNameEn;
      let studentCredential: ProvisionedCredential | null = null;
      let parentCredential: ProvisionedCredential | null = null;

      if (data.email) {
        const provisionedStudent = await provisionRoleUser({
          tx,
          institutionId,
          role: "STUDENT",
          email: data.email,
          displayName: validated.studentNameEn || studentName,
          passwordSeed: studentId,
        });
        studentCredential = provisionedStudent.credential;
      }

      const s = await tx.student.create({
        data: {
          studentId,
          firstName: validated.firstName,
          lastName: validated.lastName,
          studentNameBn: data.studentNameBn?.trim() || null,
          studentNameEn: validated.studentNameEn || null,
          email: data.email || null,
          phone: data.phone || null,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
          gender: data.gender || null,
          guardianName: data.guardianName?.trim() || null,
          rollNo: data.rollNo?.trim() || null,
          address: data.address || null,
          village: data.village?.trim() || null,
          ward: data.ward?.trim() || null,
          upazila: data.upazila?.trim() || null,
          district: data.district?.trim() || null,
          city: data.city || null,
          country: data.country || null,
          classId: data.classId || null,
          fatherName: data.fatherName?.trim() || null,
          motherName: data.motherName?.trim() || null,
          guardianPhone: data.guardianPhone?.trim() || null,
          birthRegNo: data.birthRegNo || null,
          nidNo: data.nidNo || null,
          institutionId,
        },
      });

      // Create parent if provided
      if (data.parentFirstName && data.parentLastName) {
        const parentName = `${data.parentFirstName} ${data.parentLastName}`.trim();
        if (data.parentEmail) {
          const provisionedParent = await provisionRoleUser({
            tx,
            institutionId,
            role: "PARENT",
            email: data.parentEmail,
            displayName: parentName,
            passwordSeed: `${studentId}-guardian`,
          });
          parentCredential = provisionedParent.credential;
        }

        await tx.parent.create({
          data: {
            firstName: data.parentFirstName,
            lastName: data.parentLastName,
            email: data.parentEmail || `parent-${s.id}@noreply.local`,
            phone: data.parentPhone || null,
            relation: data.parentRelation || "Parent",
            studentId: s.id,
          },
        });
      }

      // Audit log
      await tx.auditLog.create({
        data: {
          action: "CREATE",
          entity: "Student",
          entityId: s.id,
          newValues: {
            studentId,
            firstName: validated.firstName,
            lastName: validated.lastName,
          },
          userId,
        },
      });

      return {
        student: s,
        studentCredential,
        parentCredential,
      };
    });

    revalidatePath("/dashboard/students");
    return {
      success: true,
      data: {
        id: student.student.id,
        studentId: student.student.studentId,
        studentCredential: student.studentCredential,
        parentCredential: student.parentCredential,
      },
    };
  } catch (error) {
    console.error("[CREATE_STUDENT]", error);
    return {
      success: false,
      error: "Failed to create student. Please try again.",
    };
  }
}

// ─── UPDATE ─────────────────────────────────
export async function updateStudent(
  id: string,
  formData: StudentFormData,
  locale?: string,
): Promise<ActionResult> {
  try {
    const { institutionId, userId, role } = await getAuthContext();
    if (!isPrivilegedOrStaff(role)) {
      return { success: false, error: "Insufficient permissions" };
    }
    const currentLocale = normalizeValidationLocale(locale);
    const parsed = StudentSchema(currentLocale).safeParse(formData);

    if (!parsed.success) {
      return {
        success: false,
        error: currentLocale === "bn" ? "তথ্য যাচাই ব্যর্থ হয়েছে" : "Validation failed",
        fieldErrors: parsed.error.flatten().fieldErrors as Record<
          string,
          string[]
        >,
      };
    }

    const existing = await db.student.findFirst({
      where: { id, institutionId },
    });

    if (!existing) {
      return { success: false, error: "Student not found" };
    }

    const data = parsed.data;
    const validated = validateStudentFields(data, currentLocale);
    if (validated.hasErrors) {
      return {
        success: false,
        error: currentLocale === "bn" ? "তথ্য যাচাই ব্যর্থ হয়েছে" : "Validation failed",
        fieldErrors: validated.fieldErrors,
      };
    }
    const classValidation = await validateGovtPrimaryClass(institutionId, data.classId);
    if (!classValidation.valid) {
      const m = VALIDATION_MESSAGES[currentLocale];
      if (classValidation.reason === "SECTION_REQUIRED") {
        return {
          success: false,
          error: currentLocale === "bn" ? "তথ্য যাচাই ব্যর্থ হয়েছে" : "Validation failed",
          fieldErrors: { section: [m.sectionRequired] },
        };
      }
      return {
        success: false,
        error: currentLocale === "bn" ? "তথ্য যাচাই ব্যর্থ হয়েছে" : "Validation failed",
        fieldErrors: { classId: [m.classRangeRestricted] },
      };
    }

    await db.$transaction(async (tx) => {
      await tx.student.update({
        where: { id },
        data: {
          firstName: validated.firstName,
          lastName: validated.lastName,
          studentNameBn: data.studentNameBn?.trim() || null,
          studentNameEn: validated.studentNameEn || null,
          email: data.email || null,
          phone: data.phone || null,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
          gender: data.gender || null,
          guardianName: data.guardianName?.trim() || null,
          rollNo: data.rollNo?.trim() || null,
          address: data.address || null,
          village: data.village?.trim() || null,
          ward: data.ward?.trim() || null,
          upazila: data.upazila?.trim() || null,
          district: data.district?.trim() || null,
          city: data.city || null,
          country: data.country || null,
          classId: data.classId || null,
          fatherName: data.fatherName?.trim() || null,
          motherName: data.motherName?.trim() || null,
          guardianPhone: data.guardianPhone?.trim() || null,
          birthRegNo: data.birthRegNo || null,
          nidNo: data.nidNo || null,
        },
      });

      await tx.auditLog.create({
        data: {
          action: "UPDATE",
          entity: "Student",
          entityId: id,
          oldValues: {
            firstName: existing.firstName,
            lastName: existing.lastName,
          },
          newValues: { firstName: validated.firstName, lastName: validated.lastName },
          userId,
        },
      });
    });

    revalidatePath("/dashboard/students");
    revalidatePath(`/dashboard/students/${id}`);
    return { success: true };
  } catch (error) {
    console.error("[UPDATE_STUDENT]", error);
    return { success: false, error: "Failed to update student." };
  }
}

// ─── GET STUDENT DETAILS ─────────────────────
export async function getStudentById(id: string) {
  const { institutionId, role, userId, email, phone } = await getAuthContext();
  const visibilityWhere = await buildStudentVisibilityWhere({
    institutionId,
    role,
    userId,
    email,
    phone,
  });

  const student = await db.student.findFirst({
    where: {
      id,
      institutionId,
      ...(isGovtPrimaryModeEnabled() ? { class: { grade: { in: [...PRIMARY_GRADES] } } } : {}),
      ...visibilityWhere,
    },
    include: {
      class: { select: { name: true, grade: true, section: true } },
      parents: {
        select: {
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
          relation: true,
        },
      },
    },
  });

  if (!student) return null;

  return {
    id: student.id,
    studentId: student.studentId,
    firstName: student.firstName,
    lastName: student.lastName,
    studentNameBn: student.studentNameBn,
    studentNameEn: student.studentNameEn,
    email: student.email,
    phone: student.phone,
    dateOfBirth: toIsoDate(student.dateOfBirth),
    gender: student.gender,
    address: student.address,
    guardianName: student.guardianName,
    rollNo: student.rollNo,
    village: student.village,
    ward: student.ward,
    upazila: student.upazila,
    district: student.district,
    city: student.city,
    country: student.country,
    fatherName: student.fatherName,
    motherName: student.motherName,
    guardianPhone: student.guardianPhone,
    birthRegNo: student.birthRegNo,
    nidNo: student.nidNo,
    status: student.status,
    createdAt: toIsoDate(student.createdAt),
    class: student.class
      ? {
          name: student.class.name,
          grade: student.class.grade,
          section: student.class.section,
        }
      : null,
    parents: asPlainArray(student.parents),
  };
}

// ─── DELETE ─────────────────────────────────
export async function deleteStudent(id: string): Promise<ActionResult> {
  try {
    const { institutionId, role, userId } = await getAuthContext();

    if (!["SUPER_ADMIN", "ADMIN", "PRINCIPAL"].includes(role)) {
      return { success: false, error: "Insufficient permissions" };
    }

    const student = await db.student.findFirst({
      where: { id, institutionId },
    });

    if (!student) {
      return { success: false, error: "Student not found" };
    }

    await db.$transaction(async (tx) => {
      await tx.student.update({
        where: { id },
        data: { status: "INACTIVE" },
      });

      await tx.auditLog.create({
        data: {
          action: "DEACTIVATE",
          entity: "Student",
          entityId: id,
          userId,
        },
      });
    });

    revalidatePath("/dashboard/students");
    revalidatePath("/dashboard/control/inactive");
    return { success: true };
  } catch (error) {
    console.error("[DELETE_STUDENT]", error);
    return { success: false, error: "Failed to delete student." };
  }
}

export async function setStudentStatus(
  id: string,
  status: Extract<StudentStatus, "ACTIVE" | "INACTIVE">,
): Promise<ActionResult> {
  try {
    const { institutionId, role, userId } = await getAuthContext();

    if (!["SUPER_ADMIN", "ADMIN", "PRINCIPAL", "STAFF"].includes(role)) {
      return { success: false, error: "Insufficient permissions" };
    }

    const student = await db.student.findFirst({
      where: { id, institutionId },
      select: { id: true, status: true },
    });
    if (!student) {
      return { success: false, error: "Student not found" };
    }

    await db.$transaction(async (tx) => {
      await tx.student.update({
        where: { id },
        data: { status },
      });
      await tx.auditLog.create({
        data: {
          action: status === "ACTIVE" ? "ACTIVATE" : "DEACTIVATE",
          entity: "Student",
          entityId: id,
          oldValues: { status: student.status },
          newValues: { status },
          userId,
        },
      });
    });

    revalidatePath("/dashboard/students");
    revalidatePath("/dashboard/control/inactive");
    return { success: true };
  } catch (error) {
    console.error("[SET_STUDENT_STATUS]", error);
    return { success: false, error: "Failed to update student status." };
  }
}

// ─── GET STUDENTS (paginated) ────────────────
export async function getStudents({
  page = 1,
  limit = 20,
  search = "",
  classId = "",
  status = "ACTIVE",
}: {
  page?: number;
  limit?: number;
  search?: string;
  classId?: string;
  status?: string;
}) {
  const { institutionId, role, userId, email, phone } = await getAuthContext();
  const normalizedStatus =
    status === "ALL" ||
    VALID_STUDENT_STATUSES.includes(
      status as (typeof VALID_STUDENT_STATUSES)[number],
    )
      ? status
      : "ACTIVE";

  const where: Record<string, unknown> = {
    institutionId,
    ...(isGovtPrimaryModeEnabled() ? { class: { grade: { in: [...PRIMARY_GRADES] } } } : {}),
    ...(await buildStudentVisibilityWhere({
      institutionId,
      role,
      userId,
      email,
      phone,
    })),
    ...(normalizedStatus !== "ALL" && { status: normalizedStatus }),
    ...(classId && { classId }),
    ...(search && {
      OR: [
        { firstName: { contains: search, mode: "insensitive" as const } },
        { lastName: { contains: search, mode: "insensitive" as const } },
        { email: { contains: search, mode: "insensitive" as const } },
        { studentId: { contains: search, mode: "insensitive" as const } },
      ],
    }),
  };

  const [students, total] = await Promise.all([
    db.student.findMany({
      where,
      include: {
        class: { select: { name: true, grade: true, section: true } },
        parents: { select: { firstName: true, lastName: true, phone: true } },
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.student.count({ where }),
  ]);

  return {
    students: asPlainArray(students).map((student) => ({
      id: student.id,
      studentId: student.studentId,
      firstName: student.firstName,
      lastName: student.lastName,
      studentNameBn: student.studentNameBn,
      studentNameEn: student.studentNameEn,
      email: student.email,
      phone: student.phone,
      dateOfBirth: toIsoDate(student.dateOfBirth),
      gender: student.gender,
      address: student.address,
      guardianName: student.guardianName,
      rollNo: student.rollNo,
      village: student.village,
      ward: student.ward,
      upazila: student.upazila,
      district: student.district,
      city: student.city,
      country: student.country,
      fatherName: student.fatherName,
      motherName: student.motherName,
      guardianPhone: student.guardianPhone,
      birthRegNo: student.birthRegNo,
      nidNo: student.nidNo,
      classId: student.classId,
      status: student.status,
      createdAt: toIsoDate(student.createdAt),
      class: student.class
        ? {
            name: student.class.name,
            grade: student.class.grade,
            section: student.class.section,
          }
        : null,
    })),
    total,
    pages: Math.max(1, Math.ceil(total / limit)),
    page,
  };
}

// ─── GET DASHBOARD STATS ─────────────────────
export async function getDashboardStats() {
  const { institutionId } = await getAuthContext();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalStudents,
    totalTeachers,
    todayAttendance,
    pendingFees,
    recentStudents,
  ] = await Promise.all([
    db.student.count({ where: { institutionId, status: "ACTIVE" } }),
    db.teacher.count({ where: { institutionId, status: "ACTIVE" } }),
    db.attendance.count({
      where: { institutionId, date: today, status: "PRESENT" },
    }),
    db.fee.aggregate({
      where: {
        institutionId,
        status: { in: ["UNPAID", "PARTIAL", "OVERDUE"] },
      },
      _sum: { amount: true },
      _count: true,
    }),
    db.student.findMany({
      where: { institutionId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        studentId: true,
        createdAt: true,
        class: { select: { name: true } },
      },
    }),
  ]);

  return {
    totalStudents,
    totalTeachers,
    todayAttendance,
    pendingFees: {
      amount: Number(pendingFees._sum.amount ?? 0),
      count: pendingFees._count,
    },
    recentStudents: asPlainArray(recentStudents).map((student) => ({
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      studentId: student.studentId,
      createdAt: toIsoDate(student.createdAt),
      class: student.class ? { name: student.class.name } : null,
    })),
  };
}

// ─── Export Functionality ───────────────────────────────

export async function exportStudentsToCSV(params: {
  search?: string;
  classId?: string;
  status?: string;
}): Promise<{
  success: boolean;
  data?: Array<{
    studentId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    dateOfBirth: string;
    gender: string;
    class: string;
    status: string;
    joinedDate: string;
  }>;
  error?: string;
}> {
  try {
    const session = await auth();
    const user = session?.user as { institutionId?: string } | undefined;
    const institutionId = user?.institutionId;

    if (!institutionId) {
      return { success: false, error: "Unauthorized" };
    }

    const where: Parameters<typeof db.student.findMany>[0]["where"] = {
      institutionId,
    };

    if (params.status) {
      where.status = params.status;
    }
    if (params.classId) {
      where.classId = params.classId;
    }
    if (params.search) {
      where.OR = [
        { firstName: { contains: params.search, mode: "insensitive" } },
        { lastName: { contains: params.search, mode: "insensitive" } },
        { studentId: { contains: params.search, mode: "insensitive" } },
        { email: { contains: params.search, mode: "insensitive" } },
      ];
    }

    const students = await db.student.findMany({
      where,
      select: {
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
    });

    const exportData = asPlainArray(students).map((student) => ({
      studentId: student.studentId || "",
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email || "",
      phone: student.phone || "",
      dateOfBirth: student.dateOfBirth ? toIsoDate(student.dateOfBirth) : "",
      gender: student.gender || "",
      class: student.class
        ? `${student.class.grade} - ${student.class.name}`
        : "",
      status: student.status,
      joinedDate: toIsoDate(student.createdAt),
    }));

    return { success: true, data: exportData };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Export failed",
    };
  }
}
