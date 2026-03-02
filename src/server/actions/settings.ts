// src/server/actions/settings.ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isGovtPrimaryModeEnabled } from "@/lib/config";
import { GOVT_PRIMARY_FEE_PRESETS } from "@/lib/finance/fee-presets";

const InstitutionSettingsSchema = z.object({
  academicYear: z.string().min(1, "Academic year is required"),
  termsPerYear: z.coerce.number().min(1).max(4).default(3),
  workingDays: z.array(z.number()).default([1, 2, 3, 4, 5]),
  emailNotifs: z.boolean().default(true),
  smsNotifs: z.boolean().default(false),
  lateFeePercent: z.coerce.number().min(0).max(100).default(0),
  gracePeriodDays: z.coerce.number().min(0).max(365).default(7),
  signatoryName: z.string().optional(),
  signatoryTitle: z.string().optional(),
  coSignatoryName: z.string().optional(),
  coSignatoryTitle: z.string().optional(),
  certificateFooter: z.string().optional(),
  certificateLogoUrl: z.string().url().optional().or(z.literal("")),
  publicReportsEnabled: z.boolean().default(false),
  publicReportsDescription: z.string().max(240).optional().or(z.literal("")),
  useBanglaDigits: z.boolean().default(false),
});

const InstitutionProfileSchema = z.object({
  name: z.string().min(1, "Institution name is required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional().default("Bangladesh"),
  timezone: z.string().default("Asia/Dhaka"),
  currency: z.string().default("BDT"),
});

const FeeCategorySchema = z.object({
  name: z.string().min(1, "Category name is required").max(80),
  feeType: z
    .enum([
      "TUITION",
      "TRANSPORT",
      "LIBRARY",
      "LABORATORY",
      "SPORTS",
      "EXAMINATION",
      "UNIFORM",
      "MISC",
    ])
    .default("MISC"),
});

export type InstitutionSettingsData = z.infer<typeof InstitutionSettingsSchema>;
export type InstitutionProfileData = z.infer<typeof InstitutionProfileSchema>;
export type FeeCategoryData = z.infer<typeof FeeCategorySchema>;

type ActionResult<T = void> =
  | { success: true; data?: T; error?: never }
  | {
      success: false;
      error: string;
      fieldErrors?: Record<string, string[]>;
      data?: never;
    };

const GOVT_PRIMARY_DEMO_BLUEPRINT = [
  { grade: "3", section: "A", name: "Class 3" },
  { grade: "3", section: "B", name: "Class 3" },
  { grade: "5", section: "A", name: "Class 5" },
  { grade: "5", section: "B", name: "Class 5" },
] as const;

const GOVT_PRIMARY_DEMO_STUDENTS_PER_SECTION = 20;

const GOVT_PRIMARY_DEMO_FIRST_NAMES = [
  "Ayan",
  "Mahi",
  "Tanvir",
  "Nusrat",
  "Rifat",
  "Jannat",
  "Siam",
  "Taslima",
  "Arif",
  "Shanta",
  "Sabbir",
  "Rima",
  "Nabil",
  "Sharmin",
  "Tamim",
  "Mim",
  "Fardin",
  "Sadia",
  "Farhan",
  "Tania",
] as const;

const GOVT_PRIMARY_DEMO_LAST_NAMES = [
  "Rahman",
  "Ahmed",
  "Hossain",
  "Islam",
  "Karim",
  "Sarker",
  "Khan",
  "Akter",
] as const;

function getDemoAttendanceDate() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  const day = date.getDay();
  if (day === 5) {
    date.setDate(date.getDate() - 1);
  } else if (day === 6) {
    date.setDate(date.getDate() - 2);
  }
  return date;
}

async function ensureBangladeshFeeCategoryPresets(institutionId: string) {
  const existing = await db.feeCategory.count({ where: { institutionId } });
  if (existing > 0) return;

  await db.feeCategory.createMany({
    data: GOVT_PRIMARY_FEE_PRESETS.map((preset) => ({
      name: preset.titleEn,
      feeType: preset.feeType,
      isPreset: true,
      institutionId,
    })),
    skipDuplicates: true,
  });
}

async function getAuthContext() {
  const session = await auth();
  const user = session?.user as
    | { id?: string; institutionId?: string; role?: string }
    | undefined;

  if (!user?.id || !user.institutionId || !user.role) {
    throw new Error("Unauthorized");
  }

  if (!["SUPER_ADMIN", "ADMIN"].includes(user.role)) {
    throw new Error("Insufficient permissions");
  }

  return {
    userId: user.id,
    institutionId: user.institutionId,
    role: user.role,
  };
}

export async function getInstitutionSettings() {
  const session = await auth();
  const user = session?.user as { institutionId?: string } | undefined;

  if (!user?.institutionId) throw new Error("Unauthorized");

  await ensureBangladeshFeeCategoryPresets(user.institutionId);

  const [institution, settings, feeCategories] = await Promise.all([
    db.institution.findUnique({
      where: { id: user.institutionId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        website: true,
        address: true,
        city: true,
        country: true,
        timezone: true,
        currency: true,
        plan: true,
        planExpiry: true,
        logo: true,
      },
    }),
    db.institutionSettings.findUnique({
      where: { institutionId: user.institutionId },
    }),
    db.feeCategory.findMany({
      where: { institutionId: user.institutionId },
      select: {
        id: true,
        name: true,
        feeType: true,
        isPreset: true,
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return { institution, settings, feeCategories };
}

export async function updateInstitutionProfile(
  formData: InstitutionProfileData,
): Promise<ActionResult> {
  try {
    const { institutionId, userId } = await getAuthContext();
    const parsed = InstitutionProfileSchema.safeParse(formData);

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

    await db.$transaction(async (tx) => {
      await tx.institution.update({
        where: { id: institutionId },
        data: {
          name: data.name,
          email: data.email || null,
          phone: data.phone || null,
          website: data.website || null,
          address: data.address || null,
          city: data.city || null,
          country: data.country || null,
          timezone: data.timezone,
          currency: data.currency,
        },
      });

      await tx.auditLog.create({
        data: {
          action: "UPDATE",
          entity: "Institution",
          entityId: institutionId,
          newValues: { name: data.name },
          userId,
        },
      });
    });

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error) {
    console.error("[UPDATE_INSTITUTION_PROFILE]", error);
    return { success: false, error: "Failed to update institution profile." };
  }
}

export async function updateInstitutionSettings(
  formData: InstitutionSettingsData,
): Promise<ActionResult> {
  try {
    const { institutionId, userId } = await getAuthContext();
    const parsed = InstitutionSettingsSchema.safeParse(formData);

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

    await db.$transaction(async (tx) => {
      await tx.institutionSettings.upsert({
        where: { institutionId },
        create: {
          institutionId,
          academicYear: data.academicYear,
          termsPerYear: data.termsPerYear,
          workingDays: data.workingDays,
          emailNotifs: data.emailNotifs,
          smsNotifs: data.smsNotifs,
          lateFeePercent: data.lateFeePercent,
          gracePeriodDays: data.gracePeriodDays,
          signatoryName: data.signatoryName || null,
          signatoryTitle: data.signatoryTitle || null,
          coSignatoryName: data.coSignatoryName || null,
          coSignatoryTitle: data.coSignatoryTitle || null,
          certificateFooter: data.certificateFooter || null,
          certificateLogoUrl: data.certificateLogoUrl || null,
          publicReportsEnabled: data.publicReportsEnabled,
          publicReportsDescription: data.publicReportsDescription || null,
        },
        update: {
          academicYear: data.academicYear,
          termsPerYear: data.termsPerYear,
          workingDays: data.workingDays,
          emailNotifs: data.emailNotifs,
          smsNotifs: data.smsNotifs,
          lateFeePercent: data.lateFeePercent,
          gracePeriodDays: data.gracePeriodDays,
          signatoryName: data.signatoryName || null,
          signatoryTitle: data.signatoryTitle || null,
          coSignatoryName: data.coSignatoryName || null,
          coSignatoryTitle: data.coSignatoryTitle || null,
          certificateFooter: data.certificateFooter || null,
          certificateLogoUrl: data.certificateLogoUrl || null,
          publicReportsEnabled: data.publicReportsEnabled,
          publicReportsDescription: data.publicReportsDescription || null,
        },
      });

      await tx.auditLog.create({
        data: {
          action: "UPDATE",
          entity: "InstitutionSettings",
          entityId: institutionId,
          newValues: data as Record<string, unknown>,
          userId,
        },
      });
    });

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error) {
    console.error("[UPDATE_INSTITUTION_SETTINGS]", error);
    return { success: false, error: "Failed to update settings." };
  }
}

export async function createFeeCategory(
  formData: FeeCategoryData,
): Promise<ActionResult<{ id: string; name: string; feeType: string }>> {
  try {
    const { institutionId } = await getAuthContext();
    const parsed = FeeCategorySchema.safeParse(formData);

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

    const category = await db.feeCategory.create({
      data: {
        institutionId,
        name: parsed.data.name.trim(),
        feeType: parsed.data.feeType,
      },
      select: {
        id: true,
        name: true,
        feeType: true,
      },
    });

    revalidatePath("/dashboard/settings");
    return { success: true, data: category };
  } catch (error) {
    console.error("[CREATE_FEE_CATEGORY]", error);
    return { success: false, error: "Failed to create fee category." };
  }
}

export async function updateFeeCategory(
  categoryId: string,
  formData: FeeCategoryData,
): Promise<ActionResult<{ id: string; name: string; feeType: string }>> {
  try {
    const { institutionId } = await getAuthContext();
    const parsed = FeeCategorySchema.safeParse(formData);

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

    const existing = await db.feeCategory.findFirst({
      where: { id: categoryId, institutionId },
      select: { id: true },
    });
    if (!existing) {
      return { success: false, error: "Fee category not found." };
    }

    const category = await db.feeCategory.update({
      where: { id: categoryId },
      data: {
        name: parsed.data.name.trim(),
        feeType: parsed.data.feeType,
      },
      select: {
        id: true,
        name: true,
        feeType: true,
      },
    });

    revalidatePath("/dashboard/settings");
    return { success: true, data: category };
  } catch (error) {
    console.error("[UPDATE_FEE_CATEGORY]", error);
    return { success: false, error: "Failed to update fee category." };
  }
}

export async function loadGovtPrimaryDemoData(): Promise<
  ActionResult<{
    classes: number;
    studentsCreated: number;
    studentsUpdated: number;
    routineEntries: number;
    attendanceEntries: number;
    noticeCreated: boolean;
    attendanceDate: string;
  }>
> {
  try {
    const { institutionId, userId } = await getAuthContext();

    if (process.env.NODE_ENV !== "development") {
      return {
        success: false,
        error: "Demo seed loader is available in development only.",
      };
    }

    if (!isGovtPrimaryModeEnabled()) {
      return {
        success: false,
        error: "Govt Primary mode is disabled.",
      };
    }

    const settings = await db.institutionSettings.findUnique({
      where: { institutionId },
      select: { academicYear: true },
    });

    const attendanceDate = getDemoAttendanceDate();
    const academicYear =
      settings?.academicYear ??
      `${attendanceDate.getFullYear()}-${attendanceDate.getFullYear() + 1}`;

    const seedSummary = await db.$transaction(async (tx) => {
      const classMap = new Map<string, { id: string; grade: string; section: string }>();

      for (const blueprint of GOVT_PRIMARY_DEMO_BLUEPRINT) {
        const classroom = await tx.class.upsert({
          where: {
            institutionId_grade_section_academicYear: {
              institutionId,
              grade: blueprint.grade,
              section: blueprint.section,
              academicYear,
            },
          },
          update: {
            name: blueprint.name,
            isActive: true,
            capacity: 40,
          },
          create: {
            institutionId,
            name: blueprint.name,
            grade: blueprint.grade,
            section: blueprint.section,
            academicYear,
            capacity: 40,
            isActive: true,
          },
          select: {
            id: true,
            grade: true,
            section: true,
          },
        });

        classMap.set(`${blueprint.grade}-${blueprint.section}`, classroom);
      }

      let studentsCreated = 0;
      let studentsUpdated = 0;

      for (const blueprint of GOVT_PRIMARY_DEMO_BLUEPRINT) {
        const classKey = `${blueprint.grade}-${blueprint.section}`;
        const classroom = classMap.get(classKey);
        if (!classroom) continue;

        for (
          let index = 1;
          index <= GOVT_PRIMARY_DEMO_STUDENTS_PER_SECTION;
          index += 1
        ) {
          const studentCode = `GPD-${blueprint.grade}${blueprint.section}-${String(index).padStart(2, "0")}`;
          const firstName =
            GOVT_PRIMARY_DEMO_FIRST_NAMES[
              (index + Number(blueprint.grade)) % GOVT_PRIMARY_DEMO_FIRST_NAMES.length
            ];
          const lastName =
            GOVT_PRIMARY_DEMO_LAST_NAMES[
              (index + blueprint.section.charCodeAt(0)) % GOVT_PRIMARY_DEMO_LAST_NAMES.length
            ];

          const existing = await tx.student.findUnique({
            where: {
              institutionId_studentId: {
                institutionId,
                studentId: studentCode,
              },
            },
            select: { id: true },
          });

          await tx.student.upsert({
            where: {
              institutionId_studentId: {
                institutionId,
                studentId: studentCode,
              },
            },
            update: {
              firstName,
              lastName,
              studentNameBn: `${firstName} ${lastName}`,
              studentNameEn: `${firstName} ${lastName}`,
              classId: classroom.id,
              status: "ACTIVE",
              guardianName: `${firstName} Guardian`,
              guardianPhone: `017${blueprint.grade}${blueprint.section === "A" ? "1" : "2"}${String(index).padStart(5, "0")}`,
              fatherName: `Md. ${lastName}`,
              motherName: `Mrs. ${lastName}`,
              birthRegNo: `BR-${blueprint.grade}${blueprint.section}-${String(100000 + index)}`,
              rollNo: String(index),
            },
            create: {
              institutionId,
              studentId: studentCode,
              firstName,
              lastName,
              studentNameBn: `${firstName} ${lastName}`,
              studentNameEn: `${firstName} ${lastName}`,
              classId: classroom.id,
              status: "ACTIVE",
              guardianName: `${firstName} Guardian`,
              guardianPhone: `017${blueprint.grade}${blueprint.section === "A" ? "1" : "2"}${String(index).padStart(5, "0")}`,
              fatherName: `Md. ${lastName}`,
              motherName: `Mrs. ${lastName}`,
              birthRegNo: `BR-${blueprint.grade}${blueprint.section}-${String(100000 + index)}`,
              rollNo: String(index),
            },
          });

          if (existing) {
            studentsUpdated += 1;
          } else {
            studentsCreated += 1;
          }
        }
      }

      const routineClass = classMap.get("3-A");
      const routineTemplate = [
        ["Bangla", "English", "Mathematics", "General Science", "Religion", "Drawing"],
        ["Mathematics", "Bangla", "English", "General Science", "ICT", "Physical Education"],
        ["Bangla", "Mathematics", "English", "BGS", "Religion", "Handwriting"],
        ["English", "Bangla", "Mathematics", "General Science", "Arts", "Music"],
        ["Mathematics", "Bangla", "English", "BGS", "Religion", "Games"],
      ] as const;

      let routineEntries = 0;

      if (routineClass) {
        for (let dayOfWeek = 0; dayOfWeek < routineTemplate.length; dayOfWeek += 1) {
          const subjects = routineTemplate[dayOfWeek];
          for (let periodNo = 1; periodNo <= subjects.length; periodNo += 1) {
            await tx.classRoutineEntry.upsert({
              where: {
                classId_dayOfWeek_periodNo: {
                  classId: routineClass.id,
                  dayOfWeek,
                  periodNo,
                },
              },
              update: {
                subjectName: subjects[periodNo - 1],
              },
              create: {
                institutionId,
                classId: routineClass.id,
                dayOfWeek,
                periodNo,
                subjectName: subjects[periodNo - 1],
              },
            });
            routineEntries += 1;
          }
        }
      }

      const demoStudents = await tx.student.findMany({
        where: {
          institutionId,
          classId: {
            in: Array.from(classMap.values()).map((item) => item.id),
          },
          studentId: {
            startsWith: "GPD-",
          },
        },
        select: {
          id: true,
          classId: true,
        },
      });

      let attendanceEntries = 0;
      for (let index = 0; index < demoStudents.length; index += 1) {
        const student = demoStudents[index];
        if (!student.classId) continue;
        await tx.attendance.upsert({
          where: {
            studentId_date: {
              studentId: student.id,
              date: attendanceDate,
            },
          },
          update: {
            classId: student.classId,
            status: index % 11 === 0 ? "ABSENT" : "PRESENT",
            markedAt: new Date(),
          },
          create: {
            institutionId,
            classId: student.classId,
            studentId: student.id,
            date: attendanceDate,
            status: index % 11 === 0 ? "ABSENT" : "PRESENT",
          },
        });
        attendanceEntries += 1;
      }

      const noticeTitle = "Govt Primary Demo Notice";
      const noticeBody =
        "Demo notice: Monthly guardian meeting is scheduled for Thursday at 10:00 AM.";

      const existingNotice = await tx.announcement.findFirst({
        where: {
          institutionId,
          title: noticeTitle,
        },
        select: { id: true },
      });

      let noticeCreated = false;
      if (!existingNotice) {
        await tx.announcement.create({
          data: {
            institutionId,
            title: noticeTitle,
            content: noticeBody,
            priority: "NORMAL",
            targetAudience: ["ALL"],
            publishedAt: attendanceDate,
          },
        });
        noticeCreated = true;
      }

      await tx.auditLog.create({
        data: {
          action: "LOAD_GOVT_PRIMARY_DEMO_DATA",
          entity: "Institution",
          entityId: institutionId,
          userId,
          newValues: {
            academicYear,
            classes: classMap.size,
            studentsCreated,
            studentsUpdated,
            routineEntries,
            attendanceEntries,
            noticeCreated,
            attendanceDate: attendanceDate.toISOString(),
          },
        },
      });

      return {
        classes: classMap.size,
        studentsCreated,
        studentsUpdated,
        routineEntries,
        attendanceEntries,
        noticeCreated,
      };
    });

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/classes");
    revalidatePath("/dashboard/students");
    revalidatePath("/dashboard/attendance");
    revalidatePath("/dashboard/timetable");
    revalidatePath("/dashboard/notices");

    return {
      success: true,
      data: {
        ...seedSummary,
        attendanceDate: attendanceDate.toISOString().slice(0, 10),
      },
    };
  } catch (error) {
    console.error("[LOAD_GOVT_PRIMARY_DEMO_DATA]", error);
    return { success: false, error: "Failed to load Govt Primary demo data." };
  }
}
