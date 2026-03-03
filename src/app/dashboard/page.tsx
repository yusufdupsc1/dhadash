// src/app/dashboard/page.tsx
// Dashboard Overview — React 19 Server Component

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getDashboardStats } from "@/server/actions/students";
import { db } from "@/lib/db";
import { StatsGrid } from "@/components/dashboard/stats-grid";
import { AttendanceChart } from "@/components/dashboard/attendance-chart";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { RecentStudents } from "@/components/dashboard/recent-students";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { UpcomingEvents } from "@/components/dashboard/upcoming-events";
import { ExecutiveCommandCenter } from "@/components/dashboard/executive-command-center";
import { ClassOverviewWidget } from "@/components/dashboard/class-overview-widget";
import { AttendanceSummaryWidget } from "@/components/dashboard/attendance-summary-widget";
import { FeeCollectionWidget } from "@/components/dashboard/fee-collection-widget";
import { StudentStatusWidget } from "@/components/dashboard/student-status-widget";
import { NoticeBoardWidget } from "@/components/dashboard/notice-board-widget";
import { TeacherStatusWidget } from "@/components/dashboard/teacher-status-widget";
import { StudentSearchWidget } from "@/components/dashboard/student-search-widget";
import { DEFAULT_LOCALE, DEFAULT_TIMEZONE } from "@/lib/utils";
import { safeLoader } from "@/lib/server/safe-loader";
import { isGovtPrimaryModeEnabled } from "@/lib/config";
import { getDefaultDashboardPath } from "@/lib/role-routing";
import { Role } from "@prisma/client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "DH-gps Admin",
};

// Next.js 15/16 — no caching by default for dynamic data
export const dynamic = "force-dynamic";

async function getAttendanceData(institutionId: string) {
  try {
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const data = await db.attendance.groupBy({
      by: ["date", "status"],
      where: {
        institutionId,
        date: { gte: last30Days },
      },
      _count: true,
      orderBy: { date: "asc" },
    });

    // Prisma groupBy returns `_count` as an object (`{ _all: number }`).
    // Normalize to a plain number to avoid rendering object values in React.
    return data.map(
      (row: {
        date: Date;
        status: string;
        _count?: number | { _all?: number };
      }) => ({
        date: row.date,
        status: row.status,
        _count:
          typeof row._count === "number"
            ? row._count
            : Number(row._count?._all ?? 0),
      }),
    );
  } catch (error) {
    console.error("[DASHBOARD_ATTENDANCE]", error);
    return [];
  }
}

async function getRevenueData(institutionId: string) {
  try {
    const year = new Date().getFullYear();
    const data = await db.payment.groupBy({
      by: ["paidAt"],
      where: {
        institutionId,
        paidAt: {
          gte: new Date(`${year}-01-01`),
          lte: new Date(`${year}-12-31`),
        },
      },
      _sum: { amount: true },
    });
    return data;
  } catch (error) {
    console.error("[DASHBOARD_REVENUE]", error);
    return [];
  }
}

async function getUpcomingEvents(institutionId: string) {
  try {
    return await db.event.findMany({
      where: {
        institutionId,
        startDate: { gte: new Date() },
      },
      orderBy: { startDate: "asc" },
      take: 5,
    });
  } catch (error) {
    console.error("[DASHBOARD_EVENTS]", error);
    return [];
  }
}

async function getClassOverviewData(institutionId: string) {
  try {
    const classes = await db.class.findMany({
      where: { institutionId, isActive: true },
      include: {
        students: { where: { status: "ACTIVE" } },
        attendance: {
          where: {
            date: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        },
      },
      orderBy: { grade: "asc" },
      take: 6,
    });

    return classes.map((cls) => {
      const studentCount = cls.students.length;
      const attendanceRecords = cls.attendance;
      const presentCount = attendanceRecords.filter(
        (a) => a.status === "PRESENT",
      ).length;
      const attendanceRate =
        attendanceRecords.length > 0
          ? Math.round((presentCount / attendanceRecords.length) * 100)
          : 0;

      return {
        name: cls.name,
        studentCount,
        attendanceRate,
        avgGrade: 0,
      };
    });
  } catch (error) {
    console.error("[DASHBOARD_CLASS_OVERVIEW]", error);
    return [];
  }
}

async function getTodayAttendanceSummary(institutionId: string) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await db.attendance.groupBy({
      by: ["status"],
      where: {
        institutionId,
        date: today,
      },
      _count: true,
    });

    const total = attendance.reduce((sum, a) => sum + Number(a._count), 0);
    const present = attendance.find((a) => a.status === "PRESENT")?._count || 0;
    const absent = attendance.find((a) => a.status === "ABSENT")?._count || 0;
    const late = attendance.find((a) => a.status === "LATE")?._count || 0;

    return {
      present: Number(present),
      absent: Number(absent),
      late: Number(late),
      total,
    };
  } catch (error) {
    console.error("[DASHBOARD_TODAY_ATTENDANCE]", error);
    return { present: 0, absent: 0, late: 0, total: 0 };
  }
}

async function getFeeSummary(institutionId: string) {
  try {
    const currentMonth = new Date();
    currentMonth.setDate(1);

    const fees = await db.fee.findMany({
      where: {
        institutionId,
        createdAt: { gte: currentMonth },
      },
      select: { status: true, amount: true },
    });

    const totalStudents = await db.student.count({
      where: { institutionId, status: "ACTIVE" },
    });

    const collected = fees
      .filter((f) => f.status === "PAID")
      .reduce((sum, f) => sum + Number(f.amount), 0);
    const pending = fees
      .filter((f) => f.status === "UNPAID" || f.status === "PARTIAL")
      .reduce((sum, f) => sum + Number(f.amount), 0);

    return {
      collected,
      pending,
      overdue: Math.floor(pending * 0.1),
      totalStudents,
    };
  } catch (error) {
    console.error("[DASHBOARD_FEE_SUMMARY]", error);
    return { collected: 0, pending: 0, overdue: 0, totalStudents: 0 };
  }
}

async function getStudentStatusData(institutionId: string) {
  try {
    const [active, inactive, transferred, graduated] = await Promise.all([
      db.student.count({ where: { institutionId, status: "ACTIVE" } }),
      db.student.count({ where: { institutionId, status: "INACTIVE" } }),
      db.student.count({ where: { institutionId, status: "TRANSFERRED" } }),
      db.student.count({ where: { institutionId, status: "GRADUATED" } }),
    ]);

    return {
      active,
      inactive,
      transferred,
      graduated,
      total: active + inactive + transferred + graduated,
    };
  } catch (error) {
    console.error("[DASHBOARD_STUDENT_STATUS]", error);
    return { active: 0, inactive: 0, transferred: 0, graduated: 0, total: 0 };
  }
}

async function getTeacherStatusData(institutionId: string) {
  try {
    const [active, total] = await Promise.all([
      db.teacher.count({ where: { institutionId, status: "ACTIVE" } }),
      db.teacher.count({ where: { institutionId } }),
    ]);

    return {
      active,
      onLeave: total - active,
      total,
    };
  } catch (error) {
    console.error("[DASHBOARD_TEACHER_STATUS]", error);
    return { active: 0, onLeave: 0, total: 0 };
  }
}

async function getNotices(institutionId: string) {
  try {
    return await db.announcement.findMany({
      where: { institutionId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        content: true,
        priority: true,
        createdAt: true,
      },
    });
  } catch (error) {
    console.error("[DASHBOARD_NOTICES]", error);
    return [];
  }
}

async function getExecutiveData(institutionId: string) {
  try {
    const [
      institution,
      settings,
      pendingAccessRequests,
      parentAccounts,
      userRoleCounts,
      inactiveStudents,
      inactiveTeachers,
      inactiveClasses,
      inactiveSubjects,
    ] = await Promise.all([
      db.institution.findUnique({
        where: { id: institutionId },
        select: {
          slug: true,
          name: true,
          logo: true,
          email: true,
          phone: true,
          website: true,
          address: true,
          city: true,
          country: true,
        },
      }),
      db.institutionSettings.findUnique({
        where: { institutionId },
        select: {
          signatoryName: true,
          signatoryTitle: true,
          certificateLogoUrl: true,
          publicReportsEnabled: true,
        },
      }),
      db.accessRequest.count({
        where: { institutionId, status: "PENDING" },
      }),
      db.parent.count({
        where: {
          student: { institutionId },
        },
      }),
      db.user.groupBy({
        by: ["role"],
        where: {
          institutionId,
          isActive: true,
          approvalStatus: "APPROVED",
        },
        _count: { _all: true },
      }),
      db.student.count({ where: { institutionId, status: "INACTIVE" } }),
      db.teacher.count({ where: { institutionId, status: "INACTIVE" } }),
      db.class.count({ where: { institutionId, isActive: false } }),
      db.subject.count({ where: { institutionId, isActive: false } }),
    ]);

    const roleMix = {
      admins: 0,
      principals: 0,
      teachers: 0,
      students: 0,
      parents: 0,
    };

    for (const row of userRoleCounts) {
      const count = Number(row._count?._all ?? 0);
      if (row.role === Role.SUPER_ADMIN || row.role === Role.ADMIN) {
        roleMix.admins += count;
      } else if (row.role === Role.PRINCIPAL) {
        roleMix.principals += count;
      } else if (row.role === Role.TEACHER) {
        roleMix.teachers += count;
      } else if (row.role === Role.STUDENT) {
        roleMix.students += count;
      } else if (row.role === Role.PARENT) {
        roleMix.parents += count;
      }
    }

    const profileFields = [
      institution?.name,
      institution?.email,
      institution?.phone,
      institution?.website,
      institution?.address,
      institution?.city,
      institution?.country,
      institution?.logo,
    ];
    const completedProfileFields = profileFields.filter(
      (value) => typeof value === "string" && value.trim().length > 0,
    ).length;
    const profileCompletion = Math.round(
      (completedProfileFields / profileFields.length) * 100,
    );

    return {
      institutionSlug: institution?.slug ?? "school",
      profileCompletion,
      signatureReady: Boolean(
        settings?.signatoryName?.trim() && settings?.signatoryTitle?.trim(),
      ),
      logoReady: Boolean(
        institution?.logo?.trim() || settings?.certificateLogoUrl?.trim(),
      ),
      publicReportsEnabled: Boolean(settings?.publicReportsEnabled),
      pendingAccessRequests,
      parentAccounts,
      roleMix,
      inactive: {
        students: inactiveStudents,
        teachers: inactiveTeachers,
        classes: inactiveClasses,
        subjects: inactiveSubjects,
      },
      sslCommerzConfigured: Boolean(
        process.env.SSLCOMMERZ_STORE_ID &&
        process.env.SSLCOMMERZ_STORE_PASSWORD,
      ),
      stripeConfigured:
        Boolean(
          !isGovtPrimaryModeEnabled() &&
          process.env.STRIPE_SECRET_KEY &&
          process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
        ) || undefined,
    };
  } catch (error) {
    console.error("[DASHBOARD_EXECUTIVE]", error);
    return {
      institutionSlug: "school",
      profileCompletion: 0,
      signatureReady: false,
      logoReady: false,
      publicReportsEnabled: false,
      pendingAccessRequests: 0,
      parentAccounts: 0,
      roleMix: {
        admins: 0,
        principals: 0,
        teachers: 0,
        students: 0,
        parents: 0,
      },
      inactive: {
        students: 0,
        teachers: 0,
        classes: 0,
        subjects: 0,
      },
      sslCommerzConfigured: false,
      stripeConfigured: undefined,
    };
  }
}

export default async function DashboardPage() {
  const session = await auth();
  const govtPrimaryMode = isGovtPrimaryModeEnabled();
  const user = session?.user as
    | {
        institutionId?: string;
        institutionName?: string;
        name?: string | null;
        role?: string;
      }
    | undefined;
  if (!user?.institutionId) {
    return null;
  }

  if (user.role && ["TEACHER", "STUDENT", "PARENT"].includes(user.role)) {
    redirect(getDefaultDashboardPath(user.role));
  }

  const institutionId = user.institutionId;
  const institutionName = user.institutionName ?? "your institution";
  const userName = user.name?.split(" ")[0] ?? "there";
  const now = new Date();
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      hour12: false,
      timeZone: DEFAULT_TIMEZONE,
    }).format(now),
  );
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const statsResult = await safeLoader(
    "DASHBOARD_STATS",
    () => getDashboardStats(),
    null,
    { institutionId },
  );
  const attendanceData = await safeLoader(
    "DASHBOARD_ATTENDANCE",
    () => getAttendanceData(institutionId),
    [],
    { institutionId },
  );
  const revenueData = await safeLoader(
    "DASHBOARD_REVENUE",
    () => getRevenueData(institutionId),
    [],
    { institutionId },
  );
  const events = await safeLoader(
    "DASHBOARD_EVENTS",
    () => getUpcomingEvents(institutionId),
    [],
    { institutionId },
  );

  const classOverview = await safeLoader(
    "DASHBOARD_CLASS_OVERVIEW",
    () => getClassOverviewData(institutionId),
    [],
    { institutionId },
  );

  const todayAttendance = await safeLoader(
    "DASHBOARD_TODAY_ATTENDANCE",
    () => getTodayAttendanceSummary(institutionId),
    { present: 0, absent: 0, late: 0, total: 0 },
    { institutionId },
  );

  const feeSummary = await safeLoader(
    "DASHBOARD_FEE_SUMMARY",
    () => getFeeSummary(institutionId),
    { collected: 0, pending: 0, overdue: 0, totalStudents: 0 },
    { institutionId },
  );

  const studentStatus = await safeLoader(
    "DASHBOARD_STUDENT_STATUS",
    () => getStudentStatusData(institutionId),
    { active: 0, inactive: 0, transferred: 0, graduated: 0, total: 0 },
    { institutionId },
  );

  const teacherStatus = await safeLoader(
    "DASHBOARD_TEACHER_STATUS",
    () => getTeacherStatusData(institutionId),
    { active: 0, onLeave: 0, total: 0 },
    { institutionId },
  );

  const notices = await safeLoader(
    "DASHBOARD_NOTICES",
    () => getNotices(institutionId),
    [],
    { institutionId },
  );

  const executive = await safeLoader(
    "DASHBOARD_EXECUTIVE",
    () => getExecutiveData(institutionId),
    {
      institutionSlug: "school",
      profileCompletion: 0,
      signatureReady: false,
      logoReady: false,
      publicReportsEnabled: false,
      pendingAccessRequests: 0,
      parentAccounts: 0,
      roleMix: {
        admins: 0,
        principals: 0,
        teachers: 0,
        students: 0,
        parents: 0,
      },
      inactive: {
        students: 0,
        teachers: 0,
        classes: 0,
        subjects: 0,
      },
      sslCommerzConfigured: false,
      stripeConfigured: undefined,
    },
    { institutionId },
  );

  const stats = statsResult ?? {
    totalStudents: 0,
    totalTeachers: 0,
    todayAttendance: 0,
    pendingFees: { amount: 0, count: 0 },
    recentStudents: [],
  };

  return (
    <div className="space-y-6 animate-fade-in sm:space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-muted-foreground tracking-wide uppercase">
          {now.toLocaleDateString(DEFAULT_LOCALE, {
            timeZone: DEFAULT_TIMEZONE,
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {greeting}, <span className="text-primary">{userName}</span>
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s what&apos;s happening at{" "}
          <strong>{institutionName}</strong> today.
          {govtPrimaryMode ? " Govt Primary mode is active." : ""}
        </p>
      </div>

      {/* KPI Stats */}
      <StatsGrid stats={stats} />

      {/* Student Search Widget */}
      <StudentSearchWidget institutionId={institutionId} />

      {/* New Widgets Row - Mobile Optimized */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AttendanceSummaryWidget data={todayAttendance} />
        <FeeCollectionWidget data={feeSummary} />
        <StudentStatusWidget data={studentStatus} />
        <TeacherStatusWidget data={teacherStatus} />
      </div>

      {/* Class Overview */}
      <ClassOverviewWidget classes={classOverview} />

      {!govtPrimaryMode ? (
        <ExecutiveCommandCenter
          institutionSlug={executive.institutionSlug}
          profileCompletion={executive.profileCompletion}
          signatureReady={executive.signatureReady}
          logoReady={executive.logoReady}
          publicReportsEnabled={executive.publicReportsEnabled}
          pendingAccessRequests={executive.pendingAccessRequests}
          parentAccounts={executive.parentAccounts}
          roleMix={executive.roleMix}
          inactive={executive.inactive}
          sslCommerzConfigured={executive.sslCommerzConfigured}
          stripeConfigured={executive.stripeConfigured}
        />
      ) : null}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AttendanceChart data={attendanceData} />
        </div>
        <div>
          <RevenueChart data={revenueData} />
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentStudents students={stats.recentStudents} />
        </div>
        <div className="space-y-6">
          <QuickActions />
          <UpcomingEvents events={events} />
        </div>
      </div>
    </div>
  );
}
