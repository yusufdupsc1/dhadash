import {
  LayoutDashboard,
  GraduationCap,
  Users,
  Calendar,
  ClipboardCheck,
  School,
  Bell,
  CreditCard,
} from "lucide-react";
import type { Session } from "next-auth";
import { isGovtPrimaryModeEnabled } from "@/lib/config";
import { getDict, normalizeLocale } from "@/lib/i18n/getDict";
import { cookies } from "next/headers";
import { ActiveLink } from "./active-link.client";

function getItems(role?: string) {
  const isPrivileged = ["SUPER_ADMIN", "ADMIN", "PRINCIPAL"].includes(
    role ?? "",
  );

  if (role === "STUDENT") {
    return [
      {
        href: "/dashboard/portal/student",
        labelKey: "dashboard",
        icon: LayoutDashboard,
      },
      { href: "/dashboard/portal/student", labelKey: "fees", icon: CreditCard },
      { href: "/dashboard/portal/student", labelKey: "result", icon: School },
      { href: "/dashboard/portal/student", labelKey: "notice", icon: Bell },
    ];
  }
  if (role === "PARENT") {
    return [
      {
        href: "/dashboard/portal/parent",
        labelKey: "dashboard",
        icon: LayoutDashboard,
      },
      { href: "/dashboard/students", labelKey: "student", icon: GraduationCap },
      { href: "/dashboard/portal/parent", labelKey: "fees", icon: CreditCard },
      { href: "/dashboard/portal/parent", labelKey: "notice", icon: Bell },
    ];
  }
  if (role === "TEACHER") {
    return [
      {
        href: "/dashboard/portal/teacher",
        labelKey: "dashboard",
        icon: LayoutDashboard,
      },
      {
        href: "/dashboard/attendance",
        labelKey: "attendance",
        icon: ClipboardCheck,
      },
      { href: "/dashboard/grades", labelKey: "result", icon: School },
      { href: "/dashboard/events", labelKey: "routine", icon: Calendar },
    ];
  }

  if (isPrivileged) {
    return [
      { href: "/dashboard", labelKey: "home", icon: LayoutDashboard },
      { href: "/dashboard/students", labelKey: "student", icon: GraduationCap },
      {
        href: "/dashboard/attendance",
        labelKey: "attendance",
        icon: ClipboardCheck,
      },
      { href: "/dashboard/finance", labelKey: "fees", icon: CreditCard },
    ];
  }

  return [
    { href: "/dashboard", labelKey: "home", icon: LayoutDashboard },
    { href: "/dashboard/students", labelKey: "student", icon: GraduationCap },
    { href: "/dashboard/teachers", labelKey: "assistant_teacher", icon: Users },
    { href: "/dashboard/events", labelKey: "routine", icon: Calendar },
  ];
}

export async function MobileNavServer({ session }: { session: Session }) {
  const role = (session.user as { role?: string } | undefined)?.role;
  const items = getItems(role);
  const govtPrimaryMode = isGovtPrimaryModeEnabled();

  const cookieStore = await cookies();
  const locale = normalizeLocale(
    cookieStore.get("locale")?.value ?? cookieStore.get("NEXT_LOCALE")?.value,
  );
  const dict = getDict(locale);

  const t = (key: string) => {
    if (govtPrimaryMode && dict.govtPrimary[key]) {
      return dict.govtPrimary[key];
    }
    return dict.common[key] || key;
  };

  return (
    <nav
      aria-label="Mobile primary"
      className="safe-bottom fixed inset-x-0 bottom-0 z-50 flex h-18 items-center justify-around border-t border-border/70 bg-card/95 px-2 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur-xl lg:hidden"
    >
      {items.map((item) => (
        <ActiveLink
          key={item.href}
          href={item.href}
          className="group flex h-full flex-1 flex-col items-center justify-center gap-1 transition-premium active:scale-90"
          activeClassName="mobile-nav-active"
        >
          <div className="relative flex h-9 w-[78%] items-center justify-center rounded-xl border border-transparent text-muted-foreground transition-all duration-300 group-[.mobile-nav-active]:border-primary/30 group-[.mobile-nav-active]:bg-primary/10 group-[.mobile-nav-active]:text-primary">
            <item.icon className="h-5 w-5 transition-all duration-300 group-[.mobile-nav-active]:scale-110" />
          </div>

          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground transition-colors group-[.mobile-nav-active]:text-primary">
            {t(item.labelKey)}
          </span>
        </ActiveLink>
      ))}
    </nav>
  );
}
