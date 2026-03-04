// src/app/dashboard/page.tsx
// Dashboard Overview — React 19 Server Component

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getDashboardStats } from "@/server/actions/students";
import { db } from "@/lib/db";
import { StatsGrid } from "@/components/dashboard/stats-grid";
import { AttendanceChart } from "@/components/dashboard/attendance-chart";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { RecentStudents } from "@/components/dashboard/recent-students";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { UpcomingEvents } from "@/components/dashboard/upcoming-events";
import { ExecutiveCommandCenter } from "@/components/dashboard/executive-command-center";
import { ModernToolkit } from "@/components/dashboard/modern-toolkit";
import { DEFAULT_TIMEZONE } from "@/lib/utils";
import { safeLoader } from "@/lib/server/safe-loader";
import { isGovtPrimaryModeEnabled } from "@/lib/config";
import { getDefaultDashboardPath } from "@/lib/role-routing";
import { normalizeLocale } from "@/lib/i18n/getDict";
import { Role } from "@prisma/client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
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
  const cookieStore = await cookies();
  const locale = normalizeLocale(
    cookieStore.get("locale")?.value ?? cookieStore.get("NEXT_LOCALE")?.value,
  );
  const isBangla = locale === "bn";
  const localeTag = isBangla ? "bn-BD" : "en-US";
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
  const institutionName = user.institutionName ?? (isBangla ? "আপনার প্রতিষ্ঠান" : "your institution");
  const userName = user.name?.split(" ")[0] ?? (isBangla ? "আপনি" : "there");
  const now = new Date();
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      hour12: false,
      timeZone: DEFAULT_TIMEZONE,
    }).format(now),
  );
  const greeting =
    isBangla
      ? hour < 12
        ? "শুভ সকাল"
        : hour < 17
          ? "শুভ অপরাহ্ন"
          : "শুভ সন্ধ্যা"
      : hour < 12
        ? "Good morning"
        : hour < 17
          ? "Good afternoon"
          : "Good evening";

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
    <div className="space-y-8 animate-fade-in pb-12">
      <div className="relative overflow-hidden rounded-[2.2rem] border border-primary/15 bg-gradient-to-br from-primary/[0.08] via-card to-accent/[0.07] p-6 shadow-sm sm:p-10">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-primary via-accent to-primary" />
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />

        <div className="grid grid-cols-1 gap-8 items-start">
          <div className="space-y-6">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-1.5 w-8 rounded-full bg-bd-green" />
                <p className="text-[10px] font-black text-primary/70 tracking-[0.25em] uppercase">
                  {now.toLocaleDateString(localeTag, {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>

              <h1 className="text-3xl font-black leading-[1.15] tracking-tight text-foreground sm:text-5xl">
                {greeting}, <br />
                <span className="text-primary">{userName}</span>
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-lg">
                {isBangla ? (
                  <>
                    <strong>{institutionName}</strong> এর সব গুরুত্বপূর্ণ
                    স্কুল-অপারেশন এখন এক জায়গায়। সব ডেটা সমন্বিত ও সুরক্ষিত।
                  </>
                ) : (
                  <>
                    All critical school operations are available in one place
                    for <strong>{institutionName}</strong>. Everything is synced
                    and secured.
                  </>
                )}
                {govtPrimaryMode && (
                  <span className="ml-2 inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-primary">
                    {isBangla ? "জিপি মোড চালু" : "GP Mode Active"}
                  </span>
                )}
              </p>
              <div className="mt-6 max-w-3xl">
                <QuickActions />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <StatsGrid
        stats={stats}
        isBangla={isBangla}
        govtPrimaryMode={govtPrimaryMode}
      />

      {/* Modern Toolkit Widgets */}
      <ModernToolkit />

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
          <AttendanceChart data={attendanceData} isBangla={isBangla} />
        </div>
        <div>
          <RevenueChart data={revenueData} isBangla={isBangla} />
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-3">
          <RecentStudents students={stats.recentStudents} isBangla={isBangla} />
        </div>
        <div className="lg:col-span-3">
          <UpcomingEvents events={events} isBangla={isBangla} />
        </div>
      </div>
    </div>
  );
}
