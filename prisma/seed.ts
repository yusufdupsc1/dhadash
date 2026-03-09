// prisma/seed.ts
import {
  AttendanceStatus,
  EmployeeStatus,
  EventType,
  FeeStatus,
  FeeType,
  Gender,
  Plan,
  Priority,
  PrismaClient,
  RecordPeriodType,
  RecordSource,
  Role,
  StudentRecordType,
  StudentStatus,
} from "@prisma/client";
import bcryptjs from "bcryptjs";
import { config as loadEnv } from "dotenv";
import { GOVT_PRIMARY_FEE_PRESETS } from "../src/lib/finance/fee-presets";

// Keep seed behavior deterministic across shells:
// 1) load .env defaults, 2) override with .env.local if present.
loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

const db = new PrismaClient();

function makeSeedPdfDataUri(title: string, studentName: string) {
  const text = [
    "%PDF-1.1",
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Contents 4 0 R >> endobj",
    "4 0 obj << /Length 55 >> stream",
    `BT /F1 12 Tf 20 160 Td (${title} - ${studentName}) Tj ET`,
    "endstream endobj",
    "xref 0 5",
    "0000000000 65535 f ",
    "trailer << /Root 1 0 R /Size 5 >>",
    "startxref",
    "9",
    "%%EOF",
  ].join("\n");
  return `data:application/pdf;base64,${Buffer.from(text, "utf8").toString("base64")}`;
}

async function main() {
  console.log("🌱 Seeding BD-GPS database...\n");
  const enableDemoPlaceholders =
    (process.env.ENABLE_DEMO_PLACEHOLDERS ?? "false") === "true";
  const seedDemoStudents =
    (process.env.SEED_DEMO_STUDENTS ?? "false") === "true";
  const govtPrimaryMode =
    (process.env.GOVT_PRIMARY_MODE ??
      process.env.NEXT_PUBLIC_GOVT_PRIMARY_MODE ??
      "true") === "true";
  const ownerCredentialHash = await bcryptjs.hash("yusuf_ali", 12);

  // ── Institution ──────────────────────────────
  const institution = await db.institution.upsert({
    where: { slug: "bd-gps" },
    update: {},
    create: {
      name: "BD-GPS Govt Primary Demo School",
      slug: "bd-gps",
      email: "admin@school.edu",
      phone: "+8801700000000",
      address: "123 Innovation Way",
      city: "Dhaka",
      country: "BD",
      timezone: "Asia/Dhaka",
      currency: "BDT",
      plan: Plan.PROFESSIONAL,
    },
  });
  console.log(`✅ Institution: ${institution.name}`);

  // ── Institution Settings ─────────────────────
  await db.institutionSettings.upsert({
    where: { institutionId: institution.id },
    update: {},
    create: {
      institutionId: institution.id,
      academicYear: "2024-2025",
      termsPerYear: 3,
      emailNotifs: true,
      signatoryName: "Md. Abdul Karim",
      signatoryTitle: "Principal",
      coSignatoryName: "Ayesha Sultana",
      coSignatoryTitle: "Class Teacher",
      certificateFooter: "Issued by BD-GPS Govt Primary Demo School, Dhaka",
    },
  });

  await db.feeCategory.createMany({
    data: GOVT_PRIMARY_FEE_PRESETS.map((preset) => ({
      institutionId: institution.id,
      name: preset.titleEn,
      feeType: preset.feeType,
      isPreset: true,
    })),
    skipDuplicates: true,
  });

  // ── Admin User ───────────────────────────────
  const hashedPassword = await bcryptjs.hash("admin123", 12);
  const adminUser = await db.user.upsert({
    where: { email: "admin@school.edu" },
    update: {
      name: "Alex Admin",
      password: hashedPassword,
      role: Role.ADMIN,
      emailVerified: new Date(),
      isActive: true,
      institutionId: institution.id,
    },
    create: {
      name: "Alex Admin",
      email: "admin@school.edu",
      password: hashedPassword,
      role: Role.ADMIN,
      emailVerified: new Date(),
      institutionId: institution.id,
    },
  });
  console.log(`✅ Admin user: ${adminUser.email}`);

  // ── Super Admin (localhost demo) ───────────────────────────────
  const superAdminPassword = await bcryptjs.hash("superadmin123", 12);
  const superAdminUser = await db.user.upsert({
    where: { email: "superadmin@school.edu" },
    update: {
      name: "Demo Super Admin",
      password: superAdminPassword,
      role: Role.SUPER_ADMIN,
      emailVerified: new Date(),
      approvalStatus: "APPROVED",
      isActive: true,
      institutionId: institution.id,
    },
    create: {
      name: "Demo Super Admin",
      email: "superadmin@school.edu",
      password: superAdminPassword,
      role: Role.SUPER_ADMIN,
      emailVerified: new Date(),
      approvalStatus: "APPROVED",
      isActive: true,
      institutionId: institution.id,
    },
  });
  console.log(`✅ Super admin user: ${superAdminUser.email}`);

  // ── Owner Super Admin (Ministry Authority) ─────────────
  const ministryInstitution = await db.institution.upsert({
    where: { slug: "mope-owner-control" },
    update: {
      name: "Ministry of Primary and Mass Education - Owner Control",
      email: "owner@mope.gov.bd",
      country: "BD",
      timezone: "Asia/Dhaka",
      currency: "BDT",
      isActive: true,
    },
    create: {
      name: "Ministry of Primary and Mass Education - Owner Control",
      slug: "mope-owner-control",
      email: "owner@mope.gov.bd",
      country: "BD",
      timezone: "Asia/Dhaka",
      currency: "BDT",
      plan: Plan.ENTERPRISE,
      isActive: true,
    },
  });

  await db.user.upsert({
    where: { email: "yusuf_ali" },
    update: {
      name: "Yusuf_Ali",
      password: ownerCredentialHash,
      role: Role.SUPER_ADMIN,
      approvalStatus: "APPROVED",
      emailVerified: new Date(),
      isActive: true,
      institutionId: ministryInstitution.id,
    },
    create: {
      name: "Yusuf_Ali",
      email: "yusuf_ali",
      password: ownerCredentialHash,
      role: Role.SUPER_ADMIN,
      approvalStatus: "APPROVED",
      emailVerified: new Date(),
      isActive: true,
      institutionId: ministryInstitution.id,
    },
  });
  console.log("✅ Owner super admin: yusuf_ali");

  // ── Principal ────────────────────────────────
  const principalPwd = await bcryptjs.hash("principal123", 12);
  await db.user.upsert({
    where: { email: "principal@school.edu" },
    update: {
      name: "Dr. Sarah Chen",
      password: principalPwd,
      role: Role.PRINCIPAL,
      emailVerified: new Date(),
      isActive: true,
      institutionId: institution.id,
    },
    create: {
      name: "Dr. Sarah Chen",
      email: "principal@school.edu",
      password: principalPwd,
      role: Role.PRINCIPAL,
      emailVerified: new Date(),
      institutionId: institution.id,
    },
  });
  console.log("✅ Principal user: principal@school.edu");

  // ── Subjects ─────────────────────────────────
  const subjectData = [
    { name: "Bangla", code: "BAN", isCore: true },
    { name: "English", code: "ENG", isCore: true },
    { name: "Mathematics", code: "MTH", isCore: true },
    { name: "General Science", code: "GSC", isCore: true },
    { name: "Bangladesh and Global Studies", code: "BGS", isCore: true },
    { name: "Religion", code: "REL", isCore: true },
  ];

  const subjects = [];
  for (const s of subjectData) {
    const subject = await db.subject.upsert({
      where: {
        institutionId_code: { institutionId: institution.id, code: s.code },
      },
      update: {},
      create: { ...s, institutionId: institution.id },
    });
    subjects.push(subject);
  }
  console.log(`✅ Subjects: ${subjects.length}`);

  // ── Classes ──────────────────────────────────
  const classData = govtPrimaryMode
    ? [
        { name: "Pre-Primary", grade: "PP", section: "A" },
        { name: "Class One", grade: "1", section: "A" },
        { name: "Class Two", grade: "2", section: "A" },
        { name: "Class Three", grade: "3", section: "A" },
        { name: "Class Four", grade: "4", section: "A" },
        { name: "Class Five", grade: "5", section: "A" },
      ]
    : [
        { name: "Class One", grade: "1", section: "A" },
        { name: "Class Two", grade: "2", section: "A" },
        { name: "Class Three", grade: "3", section: "A" },
        { name: "Class Four", grade: "4", section: "A" },
        { name: "Class Five", grade: "5", section: "A" },
      ];

  const classes = [];
  for (const c of classData) {
    const classroom = await db.class.upsert({
      where: {
        institutionId_grade_section_academicYear: {
          institutionId: institution.id,
          grade: c.grade,
          section: c.section,
          academicYear: "2024-2025",
        },
      },
      update: {},
      create: {
        ...c,
        academicYear: "2024-2025",
        capacity: 30,
        institutionId: institution.id,
      },
    });
    classes.push(classroom);
  }
  console.log(`✅ Classes: ${classes.length}`);

  // ── Teachers ─────────────────────────────────
  const teacherData = [
    {
      firstName: "Fahim",
      lastName: "Hasan",
      email: "fahim.hasan@school.edu",
      specialization: "Mathematics",
    },
    {
      firstName: "Nusrat",
      lastName: "Jahan",
      email: "nusrat.jahan@school.edu",
      specialization: "General Science",
    },
    {
      firstName: "Rakib",
      lastName: "Hossain",
      email: "rakib.hossain@school.edu",
      specialization: "Bangla",
    },
    {
      firstName: "Sharmin",
      lastName: "Akter",
      email: "sharmin.akter@school.edu",
      specialization: "English",
    },
    {
      firstName: "Mahmud",
      lastName: "Rahman",
      email: "mahmud.rahman@school.edu",
      specialization: "Bangladesh and Global Studies",
    },
    {
      firstName: "Tanjina",
      lastName: "Sultana",
      email: "tanjina.sultana@school.edu",
      specialization: "Religion",
    },
  ];

  const teachers = [];
  for (let i = 0; i < teacherData.length; i++) {
    const t = teacherData[i];
    const teacher = await db.teacher.upsert({
      where: {
        institutionId_teacherId: {
          institutionId: institution.id,
          teacherId: `TCH-2024-${String(i + 1).padStart(3, "0")}`,
        },
      },
      update: {},
      create: {
        ...t,
        teacherId: `TCH-2024-${String(i + 1).padStart(3, "0")}`,
        gender: i % 2 === 0 ? Gender.MALE : Gender.FEMALE,
        salary: 55000 + i * 5000,
        status: EmployeeStatus.ACTIVE,
        institutionId: institution.id,
      },
    });
    teachers.push(teacher);
  }
  console.log(`✅ Teachers: ${teachers.length}`);

  // ── Demo Teacher User (tenant-scoped teacher login) ───────────────
  const demoTeacher = teachers[0];
  const teacherPwd = await bcryptjs.hash("teacher123", 12);
  const teacherUser = await db.user.upsert({
    where: { email: "teacher.demo@school.edu" },
    update: {
      name: `${demoTeacher.firstName} ${demoTeacher.lastName}`,
      password: teacherPwd,
      role: Role.TEACHER,
      emailVerified: new Date(),
      approvalStatus: "APPROVED",
      isActive: true,
      phone: "+8801700000011",
      institutionId: institution.id,
    },
    create: {
      name: `${demoTeacher.firstName} ${demoTeacher.lastName}`,
      email: "teacher.demo@school.edu",
      password: teacherPwd,
      role: Role.TEACHER,
      emailVerified: new Date(),
      approvalStatus: "APPROVED",
      isActive: true,
      phone: "+8801700000011",
      institutionId: institution.id,
    },
  });

  await db.teacher.update({
    where: { id: demoTeacher.id },
    data: {
      email: "teacher.demo@school.edu",
      phone: "+8801700000011",
      userId: teacherUser.id,
    },
  });
  console.log("✅ Teacher user: teacher.demo@school.edu");

  // ── Demo Student + Parent + Users (tenant-scoped portal logins) ───
  const demoStudent = await db.student.upsert({
    where: {
      institutionId_studentId: {
        institutionId: institution.id,
        studentId: "STU-DEMO-0001",
      },
    },
    update: {
      firstName: "Rafi",
      lastName: "Student",
      email: "student.demo@school.edu",
      phone: "+8801700000022",
      classId: classes[0]?.id,
      status: StudentStatus.ACTIVE,
      guardianPhone: "+8801700000033",
    },
    create: {
      studentId: "STU-DEMO-0001",
      firstName: "Rafi",
      lastName: "Student",
      email: "student.demo@school.edu",
      phone: "+8801700000022",
      classId: classes[0]?.id,
      status: StudentStatus.ACTIVE,
      fatherName: "Kamal Uddin",
      motherName: "Sharmin Akter",
      guardianPhone: "+8801700000033",
      institutionId: institution.id,
    },
  });

  const studentPwd = await bcryptjs.hash("student123", 12);
  await db.user.upsert({
    where: { email: "student.demo@school.edu" },
    update: {
      name: `${demoStudent.firstName} ${demoStudent.lastName}`,
      password: studentPwd,
      role: Role.STUDENT,
      emailVerified: new Date(),
      approvalStatus: "APPROVED",
      isActive: true,
      phone: "+8801700000022",
      institutionId: institution.id,
    },
    create: {
      name: `${demoStudent.firstName} ${demoStudent.lastName}`,
      email: "student.demo@school.edu",
      password: studentPwd,
      role: Role.STUDENT,
      emailVerified: new Date(),
      approvalStatus: "APPROVED",
      isActive: true,
      phone: "+8801700000022",
      institutionId: institution.id,
    },
  });
  console.log("✅ Student user: student.demo@school.edu");

  const existingParent = await db.parent.findFirst({
    where: {
      studentId: demoStudent.id,
      email: { equals: "parent.demo@school.edu", mode: "insensitive" },
    },
    select: { id: true },
  });

  if (existingParent) {
    await db.parent.update({
      where: { id: existingParent.id },
      data: {
        firstName: "Parvin",
        lastName: "Guardian",
        phone: "+8801700000033",
        relation: "Mother",
      },
    });
  } else {
    await db.parent.create({
      data: {
        firstName: "Parvin",
        lastName: "Guardian",
        email: "parent.demo@school.edu",
        phone: "+8801700000033",
        relation: "Mother",
        studentId: demoStudent.id,
      },
    });
  }

  const parentPwd = await bcryptjs.hash("parent123", 12);
  await db.user.upsert({
    where: { email: "parent.demo@school.edu" },
    update: {
      name: "Parvin Guardian",
      password: parentPwd,
      role: Role.PARENT,
      emailVerified: new Date(),
      approvalStatus: "APPROVED",
      isActive: true,
      phone: "+8801700000033",
      institutionId: institution.id,
    },
    create: {
      name: "Parvin Guardian",
      email: "parent.demo@school.edu",
      password: parentPwd,
      role: Role.PARENT,
      emailVerified: new Date(),
      approvalStatus: "APPROVED",
      isActive: true,
      phone: "+8801700000033",
      institutionId: institution.id,
    },
  });
  console.log("✅ Parent user: parent.demo@school.edu");

  if (seedDemoStudents) {
    // ── Students ─────────────────────────────────
    const firstNames = [
      "Ayaan",
      "Arisha",
      "Tanvir",
      "Mahi",
      "Nabil",
      "Sadia",
      "Rafi",
      "Nafisa",
      "Samiha",
      "Tahmid",
      "Farhan",
      "Mehjabin",
      "Raiyan",
      "Tasnim",
      "Adnan",
      "Mim",
      "Sajid",
      "Anika",
    ];
    const lastNames = [
      "Rahman",
      "Ahmed",
      "Hossain",
      "Islam",
      "Karim",
      "Khan",
      "Chowdhury",
      "Sarker",
      "Akter",
      "Begum",
    ];

    let studentCount = 0;
    for (let c = 0; c < classes.length; c++) {
      for (let s = 0; s < 10; s++) {
        const firstName = firstNames[(c * 10 + s) % firstNames.length];
        const lastName = lastNames[(c * 10 + s) % lastNames.length];
        const sid = `STU-2024-${String(studentCount + 1).padStart(4, "0")}`;

        await db.student.upsert({
          where: {
            institutionId_studentId: {
              institutionId: institution.id,
              studentId: sid,
            },
          },
          update: {},
          create: {
            studentId: sid,
            firstName,
            lastName,
            email: `${firstName.toUpperCase()}.${lastName.toUpperCase()}@student.school.edu`,
            gender: s % 2 === 0 ? Gender.MALE : Gender.FEMALE,
            dateOfBirth: new Date(2006 + (c % 4), s % 12, (s % 28) + 1),
            status: StudentStatus.ACTIVE,
            classId: classes[c].id,
            fatherName: `Md. ${lastName}`,
            motherName: `Mrs. ${lastName}`,
            guardianPhone: `017${String(10000000 + studentCount).slice(-8)}`,
            birthRegNo: `BRN${String(1000000000 + studentCount)}`,
            institutionId: institution.id,
          },
        });
        studentCount++;
      }
    }
    console.log(`✅ Students: ${studentCount}`);

    // ── Attendance (last 7 days) ─────────────────
    const students = await db.student.findMany({
      where: { institutionId: institution.id },
      take: 30,
    });

    for (let d = 6; d >= 0; d--) {
      const date = new Date();
      date.setDate(date.getDate() - d);
      date.setHours(0, 0, 0, 0);

      // Skip weekends
      if (date.getDay() === 0 || date.getDay() === 6) continue;

      for (const student of students) {
        const rand = Math.random();
        const status =
          rand > 0.9
            ? AttendanceStatus.ABSENT
            : rand > 0.85
              ? AttendanceStatus.LATE
              : AttendanceStatus.PRESENT;

        await db.attendance.upsert({
          where: { studentId_date: { studentId: student.id, date } },
          update: {},
          create: {
            date,
            status,
            studentId: student.id,
            classId: student.classId!,
            institutionId: institution.id,
          },
        });
      }
    }
    console.log(`✅ Attendance records seeded`);

    // ── Grades ───────────────────────────────────
    for (const student of students) {
      for (const subject of subjects) {
        const score = Math.floor(55 + Math.random() * 45);
        await db.grade.create({
          data: {
            institutionId: institution.id,
            studentId: student.id,
            subjectId: subject.id,
            score,
            maxScore: 100,
            percentage: score,
            letterGrade:
              score >= 80
                ? "A+"
                : score >= 70
                  ? "A"
                  : score >= 60
                    ? "A-"
                    : score >= 50
                      ? "B"
                      : "C",
            term: "Term 1 2025",
            remarks: score >= 60 ? "Good progress" : "Needs improvement",
          },
        });
      }
    }
    console.log(`✅ Grades seeded for ${students.length} students`);

    // ── Fees ─────────────────────────────────────
    const allStudents = await db.student.findMany({
      where: { institutionId: institution.id },
      take: 50,
    });

    for (const student of allStudents) {
      const rand = Math.random();
      const status =
        rand > 0.7
          ? FeeStatus.PAID
          : rand > 0.4
            ? FeeStatus.PARTIAL
            : FeeStatus.UNPAID;

      const presetTitles = [
        "মাসিক ফি",
        "ভর্তি ফি",
        "পরীক্ষা ফি",
        "সেশন চার্জ",
        "কোচিং ফি",
      ];
      const feeTitle =
        presetTitles[Math.floor(Math.random() * presetTitles.length)];

      await db.fee.create({
        data: {
          title: feeTitle,
          amount: 1500,
          dueDate: new Date("2024-09-15"),
          term: "Term 1",
          academicYear: "2024-2025",
          feeType: FeeType.TUITION,
          status,
          studentId: student.id,
          institutionId: institution.id,
        },
      });
    }
    console.log(`✅ Fees seeded for ${allStudents.length} students`);
  } else {
    console.log(
      "ℹ️ Student/attendance/grade/fee demo seeding skipped (set SEED_DEMO_STUDENTS=true to enable)",
    );
  }

  // ── Events ───────────────────────────────────
  const events = [
    {
      title: "Annual Sports Day",
      startDate: new Date("2025-03-15"),
      type: EventType.SPORTS,
    },
    {
      title: "Science Fair 2025",
      startDate: new Date("2025-04-10"),
      type: EventType.ACADEMIC,
    },
    {
      title: "Parent-Teacher Conference",
      startDate: new Date("2025-02-28"),
      type: EventType.GENERAL,
    },
    {
      title: "Mid-Term Examinations",
      startDate: new Date("2025-03-03"),
      type: EventType.EXAM,
    },
  ];

  for (const e of events) {
    await db.event.create({
      data: { ...e, institutionId: institution.id },
    });
  }
  console.log(`✅ Events: ${events.length}`);

  // ── Announcements ────────────────────────────
  await db.announcement.create({
    data: {
      title: "Welcome to Academic Year 2024-2025",
      content:
        "We are excited to welcome all students and staff to another great academic year. Please review the updated school policies available in the student portal.",
      priority: Priority.HIGH,
      targetAudience: ["ALL"],
      institutionId: institution.id,
    },
  });
  console.log(`✅ Announcements seeded`);

  // ── Demo placeholders: progress + certificates ──
  if (institution.slug === "bd-gps" && enableDemoPlaceholders) {
    const demoStudents = await db.student.findMany({
      where: { institutionId: institution.id, status: StudentStatus.ACTIVE },
      include: { class: true },
      take: 18,
    });

    const bundles: Array<{
      recordType: StudentRecordType;
      periodType: RecordPeriodType;
      periodLabel: string;
      title: string;
    }> = [
      {
        recordType: StudentRecordType.ID_CARD,
        periodType: RecordPeriodType.CUSTOM,
        periodLabel: "Identity",
        title: "ID Card",
      },
      {
        recordType: StudentRecordType.RESULT_SHEET,
        periodType: RecordPeriodType.MONTHLY,
        periodLabel: "2026-01",
        title: "Result Sheet Report",
      },
      {
        recordType: StudentRecordType.ATTENDANCE_RECORD,
        periodType: RecordPeriodType.WEEKLY,
        periodLabel: "2026-W08",
        title: "Attendance Record",
      },
      {
        recordType: StudentRecordType.BEHAVIOR_TRACKING,
        periodType: RecordPeriodType.QUARTERLY,
        periodLabel: "2026-Q1",
        title: "Behavior Tracking Report",
      },
      {
        recordType: StudentRecordType.FINAL_EXAM_CERTIFICATE,
        periodType: RecordPeriodType.ANNUAL,
        periodLabel: "2025",
        title: "Final Exam Certificate",
      },
      {
        recordType: StudentRecordType.CHARACTER_CERTIFICATE,
        periodType: RecordPeriodType.ANNUAL,
        periodLabel: "2025",
        title: "Character Certificate",
      },
      {
        recordType: StudentRecordType.EXTRA_SKILLS_CERTIFICATE,
        periodType: RecordPeriodType.QUARTERLY,
        periodLabel: "2026-Q1",
        title: "Extra Skills Certificate",
      },
      {
        recordType: StudentRecordType.TRANSFER_CERTIFICATE,
        periodType: RecordPeriodType.CUSTOM,
        periodLabel: "Transfer",
        title: "Transfer Certificate",
      },
      {
        recordType: StudentRecordType.WEEKLY_PROGRESS,
        periodType: RecordPeriodType.WEEKLY,
        periodLabel: "2026-W08",
        title: "Weekly Progress Record",
      },
      {
        recordType: StudentRecordType.MONTHLY_PROGRESS,
        periodType: RecordPeriodType.MONTHLY,
        periodLabel: "2026-01",
        title: "Monthly Progress Record",
      },
      {
        recordType: StudentRecordType.QUARTERLY_PROGRESS,
        periodType: RecordPeriodType.QUARTERLY,
        periodLabel: "2026-Q1",
        title: "Quarterly Progress Record",
      },
      {
        recordType: StudentRecordType.ANNUAL_FINAL_REPORT,
        periodType: RecordPeriodType.ANNUAL,
        periodLabel: "2025",
        title: "Annual Final Progress Report",
      },
    ];

    for (const student of demoStudents) {
      for (const item of bundles) {
        const fileName = `${student.studentId}-${item.recordType}-${item.periodLabel}.pdf`;
        const fileUrl = makeSeedPdfDataUri(
          item.title,
          `${student.firstName} ${student.lastName}`,
        );
        await db.studentRecord.upsert({
          where: {
            studentId_periodType_periodLabel_recordType: {
              studentId: student.id,
              periodType: item.periodType,
              periodLabel: item.periodLabel,
              recordType: item.recordType,
            },
          },
          update: {
            title: item.title,
            fileName,
            fileUrl,
            source: RecordSource.MANUAL,
          },
          create: {
            institutionId: institution.id,
            studentId: student.id,
            title: item.title,
            fileName,
            fileUrl,
            periodType: item.periodType,
            periodLabel: item.periodLabel,
            recordType: item.recordType,
            source: RecordSource.MANUAL,
            metadata: {
              className: student.class?.name ?? null,
              demo: true,
            },
          },
        });
      }
    }
    console.log(
      `✅ Demo placeholder records seeded for ${demoStudents.length} students`,
    );
  } else {
    console.log(
      "ℹ️ Demo placeholders skipped (set ENABLE_DEMO_PLACEHOLDERS=true to seed)",
    );
  }

  console.log("\n🎉 Seeding complete!\n");
  console.log("Demo credentials:");
  console.log("  SuperAdmin: superadmin@school.edu / superadmin123");
  console.log("  Admin:     admin@school.edu / admin123");
  console.log("  Principal: principal@school.edu / principal123");
  console.log("  Teacher:   teacher.demo@school.edu / teacher123");
  console.log("  Student:   student.demo@school.edu / student123");
  console.log("  Parent:    parent.demo@school.edu / parent123");
  console.log("  Owner:     yusuf_ali / yusuf_ali");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
