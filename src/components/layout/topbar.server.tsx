import Link from "next/link";
import { Bell } from "lucide-react";
import type { Session } from "next-auth";
import { LanguageToggle } from "@/components/LanguageToggle";
import { getDict } from "@/lib/i18n/getDict";
import { cookies } from "next/headers";
import { isGovtPrimaryModeEnabled } from "@/lib/config";
import { getDefaultDashboardPath } from "@/lib/role-routing";
import { MobileMenuDrawer } from "./mobile-menu-drawer.client";
import { getMobileMenuSections } from "./mobile-menu-config";

export async function TopBarServer({ session }: { session: Session }) {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "bn";
  const dict = getDict(locale);
  const govtPrimaryMode = isGovtPrimaryModeEnabled();
  const role = (session.user as { role?: string } | undefined)?.role;

  const t = (key: string) => dict.common[key] || key;
  const tg = (key: string) => dict.govtPrimary[key] || dict.common[key] || key;

  const topLabel = govtPrimaryMode
    ? role === "PRINCIPAL"
      ? tg("head_teacher")
      : role === "TEACHER"
        ? tg("assistant_teacher")
        : t("school_name")
    : t("institution");
  const institutionName =
    (session.user as { institutionName?: string }).institutionName ?? "Dhadash";
  const homeHref = getDefaultDashboardPath(role);
  const userName = session.user.name ?? "User";
  const initials =
    userName
      .split(" ")
      .map((part) => part[0] ?? "")
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U";
  const menuSections = getMobileMenuSections({
    role,
    govtPrimaryMode,
    t,
    tg,
  });

  return (
    <header className="safe-top sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border/80 bg-background/80 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:px-6">
      <div className="flex min-w-0 items-center gap-2.5">
        <MobileMenuDrawer
          homeHref={homeHref}
          institutionName={institutionName}
          userName={userName}
          sections={menuSections}
        />
        <Link
          href={homeHref}
          className="min-w-0 rounded-md px-1 py-0.5 transition-colors hover:bg-muted/60"
          data-testid="topbar-home-link"
          aria-label="Go to home dashboard"
        >
          <p className="text-xs text-muted-foreground">{topLabel}</p>
          <p className="truncate text-sm font-semibold">{institutionName}</p>
        </Link>
      </div>
      <div className="flex items-center gap-2">
        <LanguageToggle />
        <button
          className="rounded-full border border-transparent p-2 text-muted-foreground transition-colors hover:border-border hover:bg-muted hover:text-foreground"
          aria-label={t("notifications")}
        >
          <Bell className="h-4 w-4" />
        </button>
        <div
          className="hidden h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary sm:flex"
          aria-hidden="true"
        >
          {initials}
        </div>
      </div>
    </header>
  );
}
