// src/components/layout/sidebar.tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";
import type { Session } from "next-auth";
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
  FileText,
  ChevronRight,
  ChevronDown,
  ShieldCheck,
  GraduationCap,
  UserRound,
  ArchiveRestore,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useGovtPrimaryT, useT } from "@/lib/i18n/client";
import { isGovtPrimaryModeEnabled } from "@/lib/config";

interface SidebarProps {
  session: Session;
}

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

export function Sidebar({ session }: SidebarProps) {
  const { t } = useT();
  const { t: tg } = useGovtPrimaryT();
  const govtPrimaryMode = isGovtPrimaryModeEnabled();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const userRole = (session.user as any)?.role ?? "";
  const userInitials =
    (session.user.name ?? "User")
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ?? "U";

  const isActive = (href: string, exact = false) => {
    if (href.includes("?")) {
      const [pathOnly, rawQuery] = href.split("?", 2);
      if (!pathOnly || pathname !== pathOnly) return false;
      const queryParams = new URLSearchParams(rawQuery ?? "");
      for (const [key, value] of queryParams.entries()) {
        if (searchParams.get(key) !== value) {
          return false;
        }
      }
      return true;
    }
    if (href === "/dashboard") return pathname === "/dashboard";
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {},
  );

  const groupedExpanded = (() => {
    const next = { ...expandedGroups };
    for (const section of NAV_SECTIONS) {
      for (const item of section.items) {
        if (!item.children?.length) continue;
        const hasActiveChild = item.children.some((child) =>
          isActive(child.href, child.exact),
        );
        const key = item.href;
        if (typeof next[key] === "undefined") {
          next[key] = hasActiveChild || isActive(item.href);
        }
      }
    }
    return next;
  })();

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
    <TooltipProvider delayDuration={0}>
      <aside className="hidden h-svh w-[230px] flex-shrink-0 flex-col border-r border-border/80 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 lg:flex xl:w-[250px]">
        {/* Brand */}
        <div className="flex items-center gap-2.5 h-14 px-4 border-b border-border">
          <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center flex-shrink-0 shadow-sm">
            <ShieldCheck className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-sm tracking-tight truncate">
            ধাদাশ
          </span>
          <Badge
            variant="outline"
            className="ml-auto text-[10px] font-mono py-0"
          >
            v1.0
          </Badge>
        </div>

        {/* Institution badge */}
        <div className="px-3 py-2.5 border-b border-border">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-muted/50">
            <div className="h-5 w-5 rounded bg-accent/20 flex items-center justify-center flex-shrink-0">
              <School className="h-3 w-3 text-accent" />
            </div>
            <span className="text-xs font-medium truncate text-foreground/80">
              {(session.user as any)?.institutionName ??
                (govtPrimaryMode ? t("school_name") : t("institution"))}
            </span>
            <ChevronRight className="h-3 w-3 text-muted-foreground ml-auto flex-shrink-0" />
          </div>
        </div>

        {/* Navigation */}
        <nav
          aria-label="Primary"
          className="flex-1 overflow-y-auto py-3 px-2 space-y-4"
        >
          {NAV_SECTIONS.map((section) => {
            const visibleItems = section.items.filter(
              (item) =>
                (!item.roles || item.roles.includes(userRole)) &&
                !(
                  govtPrimaryMode &&
                  GOVT_PRIMARY_HIDDEN_NAV_HREFS.has(item.href)
                ),
            );
            if (visibleItems.length === 0) return null;

            return (
              <div key={section.label}>
                <p className="px-2 mb-1 text-[10px] font-semibold tracking-widest uppercase text-muted-foreground/60">
                  {localizeSection(section.label)}
                </p>
                <div className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const hasChildren = Boolean(item.children?.length);
                    const visibleChildren = (item.children ?? []).filter(
                      (child) =>
                        (!child.roles || child.roles.includes(userRole)) &&
                        !(
                          govtPrimaryMode &&
                          GOVT_PRIMARY_HIDDEN_NAV_HREFS.has(child.href)
                        ),
                    );
                    const hasActiveChild = visibleChildren.some((child) =>
                      isActive(child.href, child.exact),
                    );
                    const active = isActive(item.href) || hasActiveChild;

                    if (!hasChildren || visibleChildren.length === 0) {
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          prefetch={false}
                          className={cn(
                            "flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm font-medium transition-all duration-150",
                            active
                              ? "sidebar-active-item"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted",
                          )}
                        >
                          <item.icon
                            className={cn(
                              "h-4 w-4 flex-shrink-0",
                              active
                                ? "sidebar-active-icon"
                                : "text-muted-foreground",
                            )}
                          />
                          <span className="truncate">
                            {localizeItem(item.label)}
                          </span>
                          {item.badge && (
                            <span className="ml-auto font-mono text-[10px] bg-destructive/10 text-destructive px-1.5 py-0.5 rounded">
                              {item.badge}
                            </span>
                          )}
                          {active && (
                            <span className="sidebar-active-dot ml-auto h-1.5 w-1.5 rounded-full flex-shrink-0" />
                          )}
                        </Link>
                      );
                    }

                    const expanded = groupedExpanded[item.href];

                    return (
                      <div key={item.href} className="space-y-1">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedGroups((prev) => ({
                              ...prev,
                              [item.href]: !expanded,
                            }))
                          }
                          className={cn(
                            "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-all duration-150",
                            active
                              ? "sidebar-active-item"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground",
                          )}
                        >
                          <item.icon
                            className={cn(
                              "h-4 w-4 flex-shrink-0",
                              active
                                ? "sidebar-active-icon"
                                : "text-muted-foreground",
                            )}
                          />
                          <span className="truncate">
                            {localizeItem(item.label)}
                          </span>
                          <ChevronDown
                            className={cn(
                              "ml-auto h-3.5 w-3.5 transition-transform",
                              expanded ? "rotate-0" : "-rotate-90",
                            )}
                          />
                        </button>

                        {expanded ? (
                          <div className="space-y-0.5 pl-8">
                            {visibleChildren.map((child) => (
                              <Link
                                key={child.href}
                                href={child.href}
                                prefetch={false}
                                className={cn(
                                  "flex items-center rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                                  isActive(child.href, child.exact)
                                    ? "sidebar-active-item"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                                )}
                              >
                                <FileText className="mr-1.5 h-3.5 w-3.5" />
                                {localizeItem(child.label)}
                              </Link>
                            ))}
                          </div>
                        ) : null}
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
          <div className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted transition-colors group">
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
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => signOut({ callbackUrl: "/auth/login" })}
                  className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-muted-foreground hover:text-destructive"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Sign out</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}
