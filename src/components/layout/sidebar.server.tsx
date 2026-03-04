import { type Session } from "next-auth";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  CreditCard,
  BarChart3,
  Calendar,
  Bell,
  Settings,
  LogOut,
  School,
  BookOpen,
  Bookmark,
  ChevronRight,
  ChevronDown,
  ShieldCheck,
  GraduationCap,
  UserRound,
  ArchiveRestore,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getDict, normalizeLocale } from "@/lib/i18n/getDict";
import { cookies } from "next/headers";
import { isGovtPrimaryModeEnabled } from "@/lib/config";
import { logoutAction } from "@/server/actions/session";
import { ActiveLink } from "./active-link.client";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  roles?: string[];
  children?: Array<{
    label: string;
    href: string;
    roles?: string[];
    exact?: boolean;
  }>;
}

const NAV_SECTIONS: { label: string; items: NavItem[] }[] = [
  {
    label: "Overview",
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        roles: ["SUPER_ADMIN", "ADMIN", "PRINCIPAL", "STAFF"],
      },
      {
        label: "Teacher Portal",
        href: "/dashboard/portal/teacher",
        icon: UserRound,
        roles: ["TEACHER"],
      },
      {
        label: "Student Portal",
        href: "/dashboard/portal/student",
        icon: GraduationCap,
        roles: ["STUDENT"],
      },
      {
        label: "Parent Portal",
        href: "/dashboard/portal/parent",
        icon: Users,
        roles: ["PARENT"],
      },
      {
        label: "Analytics",
        href: "/dashboard/analytics",
        icon: BarChart3,
        roles: ["SUPER_ADMIN", "ADMIN", "PRINCIPAL", "STAFF"],
      },
    ],
  },
  {
    label: "Academic",
    items: [
      {
        label: "Students",
        href: "/dashboard/students",
        icon: GraduationCap,
        roles: ["SUPER_ADMIN", "ADMIN", "PRINCIPAL", "STAFF"],
        children: [
          {
            label: "All Students",
            href: "/dashboard/students",
            roles: ["SUPER_ADMIN", "ADMIN", "PRINCIPAL", "STAFF"],
            exact: true,
          },
          {
            label: "Student Reports",
            href: "/dashboard/students/reports",
            roles: ["SUPER_ADMIN", "ADMIN", "PRINCIPAL", "STAFF", "TEACHER"],
          },
        ],
      },
      {
        label: "Subjects",
        href: "/dashboard/subjects",
        icon: Bookmark,
        roles: ["SUPER_ADMIN", "ADMIN", "PRINCIPAL", "STAFF"],
      },
      {
        label: "Teachers",
        href: "/dashboard/teachers",
        icon: Users,
        roles: ["SUPER_ADMIN", "ADMIN", "PRINCIPAL", "STAFF"],
      },
      {
        label: "Classes",
        href: "/dashboard/classes",
        icon: BookOpen,
        roles: ["SUPER_ADMIN", "ADMIN", "PRINCIPAL", "STAFF"],
      },
      {
        label: "Attendance",
        href: "/dashboard/attendance",
        icon: ClipboardCheck,
        roles: ["SUPER_ADMIN", "ADMIN", "PRINCIPAL", "STAFF", "TEACHER"],
      },
      {
        label: "Grades",
        href: "/dashboard/grades",
        icon: School,
        roles: ["SUPER_ADMIN", "ADMIN", "PRINCIPAL", "STAFF", "TEACHER"],
      },
    ],
  },
  {
    label: "Administration",
    items: [
      {
        label: "Finance",
        href: "/dashboard/finance",
        icon: CreditCard,
        roles: ["SUPER_ADMIN", "ADMIN", "PRINCIPAL"],
      },
      {
        label: "Events",
        href: "/dashboard/events",
        icon: Calendar,
        roles: ["SUPER_ADMIN", "ADMIN", "PRINCIPAL", "STAFF", "TEACHER"],
      },
      {
        label: "Announcements",
        href: "/dashboard/announcements",
        icon: Bell,
        roles: ["SUPER_ADMIN", "ADMIN", "PRINCIPAL", "STAFF", "TEACHER"],
      },
    ],
  },
  {
    label: "System",
    items: [
      {
        label: "Governance",
        href: "/dashboard/control",
        icon: ArchiveRestore,
        roles: ["SUPER_ADMIN", "ADMIN", "PRINCIPAL"],
        children: [
          {
            label: "Inactive Records",
            href: "/dashboard/control/inactive",
            roles: ["SUPER_ADMIN", "ADMIN", "PRINCIPAL"],
            exact: true,
          },
          {
            label: "Access Requests",
            href: "/dashboard/settings?tab=access",
            roles: ["SUPER_ADMIN", "ADMIN", "PRINCIPAL"],
          },
          {
            label: "Visitor Control",
            href: "/dashboard/control/visitors",
            roles: ["SUPER_ADMIN", "ADMIN", "PRINCIPAL"],
          },
          {
            label: "Import Center",
            href: "/dashboard/control/imports",
            roles: ["SUPER_ADMIN", "ADMIN", "PRINCIPAL"],
          },
        ],
      },
      {
        label: "Institution",
        href: "/dashboard/settings",
        icon: Settings,
        roles: ["SUPER_ADMIN", "ADMIN", "PRINCIPAL"],
        children: [
          {
            label: "Profile & Logo",
            href: "/dashboard/settings?tab=profile",
            roles: ["SUPER_ADMIN", "ADMIN", "PRINCIPAL"],
          },
          {
            label: "Academic & Signatures",
            href: "/dashboard/settings?tab=academic&focus=signatures",
            roles: ["SUPER_ADMIN", "ADMIN", "PRINCIPAL"],
          },
          {
            label: "Fee Categories",
            href: "/dashboard/settings?tab=fees",
            roles: ["SUPER_ADMIN", "ADMIN", "PRINCIPAL"],
          },
          {
            label: "Guest Public Reports",
            href: "/dashboard/settings?tab=academic&focus=public",
            roles: ["SUPER_ADMIN", "ADMIN", "PRINCIPAL"],
          },
        ],
      },
    ],
  },
];

const GOVT_PRIMARY_HIDDEN_NAV_HREFS = new Set<string>([
  "/dashboard/analytics",
  "/dashboard/control",
  "/dashboard/control/inactive",
  "/dashboard/control/visitors",
  "/dashboard/control/imports",
  "/dashboard/settings?tab=access",
  "/dashboard/settings?tab=academic&focus=public",
]);

const sectionLabelMap: Record<string, string> = {
  Overview: "overview",
  Academic: "academic",
  Administration: "administration",
  System: "system",
};

const itemLabelMap: Record<string, string> = {
  Dashboard: "dashboard",
  "Teacher Portal": "teacher_portal",
  "Student Portal": "student_portal",
  "Parent Portal": "parent_portal",
  Analytics: "analytics",
  Students: "student",
  "All Students": "student",
  "Student Reports": "reports",
  Teachers: "assistant_teacher",
  Attendance: "attendance",
  Finance: "fees",
  Events: "routine",
  Grades: "result",
  Governance: "governance",
  Institution: "school_name",
  Classes: "classes",
  Subjects: "subjects",
  Announcements: "notice",
  Class: "class",
};

export async function SidebarServer({ session }: { session: Session }) {
  const cookieStore = await cookies();
  const locale = normalizeLocale(
    cookieStore.get("locale")?.value ?? cookieStore.get("NEXT_LOCALE")?.value,
  );
  const dict = getDict(locale);
  const govtPrimaryMode = isGovtPrimaryModeEnabled();
  const userRole = (session.user as any)?.role ?? "";

  const userInitials =
    (session.user.name ?? "User")
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ?? "U";

  const t = (key: string) => dict.common[key] || key;
  const tg = (key: string) => dict.govtPrimary[key] || dict.common[key] || key;

  const localizeSection = (label: string) => {
    const key = sectionLabelMap[label];
    return key ? t(key) : label;
  };

  const localizeItem = (label: string) => {
    if (govtPrimaryMode && label === "Teacher Portal")
      return t("assistant_teacher_portal");
    if (govtPrimaryMode && label === "Institution")
      return t("primary_school_setup");
    if (govtPrimaryMode && label === "Students") return t("student");
    if (govtPrimaryMode && label === "Teachers") return tg("assistant_teacher");
    if (govtPrimaryMode && label === "Classes") return t("primary_classes");
    if (govtPrimaryMode && label === "Events") return tg("routine");
    if (govtPrimaryMode && label === "Announcements") return tg("notice_board");
    if (govtPrimaryMode && label === "Grades") return tg("result_sheet");
    const key = itemLabelMap[label];
    return key ? t(key) : label;
  };

  return (
    <aside className="relative hidden h-svh w-[242px] flex-shrink-0 flex-col border-r border-border/80 bg-card/95 lg:flex xl:w-[258px]">
      <div className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-primary/40 via-border to-accent/40" />
      {/* Brand */}
      <Link
        href="/dashboard"
        className="flex h-14 items-center gap-2.5 border-b border-border px-4 transition-colors hover:bg-muted/50"
      >
        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-primary shadow-sm">
          <ShieldCheck className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="truncate text-sm font-bold tracking-tight">
          Dhadash
        </span>
        <Badge
          variant="outline"
          className="ml-auto border-primary/20 bg-primary/5 py-0 font-mono text-[10px] text-primary"
        >
          v1.0
        </Badge>
      </Link>

      {/* Institution badge */}
      <div className="px-3 py-2.5 border-b border-border">
        <div className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/40 px-2 py-1.5">
          <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded bg-accent/20">
            <School className="h-3 w-3 text-accent" />
          </div>
          <span className="text-xs font-medium truncate text-foreground/80">
            {(session.user as any)?.institutionName ??
              (govtPrimaryMode ? t("school_name") : t("institution"))}
          </span>
          <ChevronRight className="ml-auto h-3 w-3 flex-shrink-0 text-muted-foreground" />
        </div>
      </div>

      {/* Navigation */}
      <nav
        aria-label="Primary"
        className="flex-1 space-y-4 overflow-y-auto px-2 py-3"
      >
        {NAV_SECTIONS.map((section) => {
          const visibleItems = section.items.filter(
            (item) =>
              (!item.roles || item.roles.includes(userRole)) &&
              !(
                govtPrimaryMode && GOVT_PRIMARY_HIDDEN_NAV_HREFS.has(item.href)
              ),
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.label}>
              <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
                {localizeSection(section.label)}
              </p>
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const visibleChildren = (item.children ?? []).filter(
                    (child) =>
                      (!child.roles || child.roles.includes(userRole)) &&
                      !(
                        govtPrimaryMode &&
                        GOVT_PRIMARY_HIDDEN_NAV_HREFS.has(child.href)
                      ),
                  );

                  if (visibleChildren.length === 0) {
                    return (
                      <ActiveLink
                        key={item.href}
                        href={item.href}
                        className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-primary/5 hover:text-primary"
                        activeClassName="sidebar-active-item"
                      >
                        <item.icon className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">
                          {localizeItem(item.label)}
                        </span>
                        {item.badge && (
                          <span className="ml-auto font-mono text-[10px] bg-destructive/10 text-destructive px-1.5 py-0.5 rounded">
                            {item.badge}
                          </span>
                        )}
                      </ActiveLink>
                    );
                  }

                  // For collapsible items, we'll keep them simple for now as requested
                  // Server Sidebar doesn't have expandedGroups state, so we'll just show the main Link
                  // The user said: "Do NOT use usePathname/useSearchParams in the sidebar"
                  // and "Only wrap Link rendering with ActiveLink; do not convert entire sidebar client."
                  return (
                    <div key={item.href} className="space-y-1">
                      <ActiveLink
                        href={item.href}
                        className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-primary/5 hover:text-primary"
                        activeClassName="sidebar-active-item"
                      >
                        <item.icon className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">
                          {localizeItem(item.label)}
                        </span>
                        <ChevronDown className="ml-auto h-3.5 w-3.5" />
                      </ActiveLink>

                      {/* We could potentially show children if we want, but it would be static.
                          Let's keep it simple as per instructions. */}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="border-t border-border p-3">
        <div className="group flex items-center gap-2.5 rounded-lg p-2 transition-colors hover:bg-muted">
          <Avatar className="h-7 w-7 flex-shrink-0">
            <AvatarImage src={session.user.image ?? ""} />
            <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-semibold">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate">
              {session.user.name ?? "User"}
            </p>
            <p className="text-[10px] text-muted-foreground truncate">
              {userRole.charAt(0) + userRole.slice(1).toLowerCase()}
            </p>
          </div>

          <form action={logoutAction} className="ml-auto">
            <button
              type="submit"
              className="flex items-center gap-1 rounded-md border border-border/70 px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-accent/30 hover:bg-accent/10 hover:text-accent"
              title={locale === "bn" ? "লগআউট" : "Log out"}
              aria-label={locale === "bn" ? "লগআউট" : "Log out"}
              data-testid="sidebar-logout-button"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>{locale === "bn" ? "লগআউট" : "Logout"}</span>
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
