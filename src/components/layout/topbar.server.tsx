import Link from "next/link";
import { Bell, LogOut } from "lucide-react";
import type { Session } from "next-auth";
import { LanguageToggle } from "@/components/LanguageToggle";
import { getDict, normalizeLocale } from "@/lib/i18n/getDict";
import { cookies } from "next/headers";
import { isGovtPrimaryModeEnabled } from "@/lib/config";
import { getDefaultDashboardPath } from "@/lib/role-routing";
import { logoutAction } from "@/server/actions/session";
import { MobileMenuDrawer } from "./mobile-menu-drawer.client";
import { getMobileMenuSections } from "./mobile-menu-config";

export async function TopBarServer({ session }: { session: Session }) {
  const cookieStore = await cookies();
  const locale = normalizeLocale(
    cookieStore.get("locale")?.value ?? cookieStore.get("NEXT_LOCALE")?.value,
  );
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
    <header className="safe-top sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border/80 bg-card/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-card/85 sm:px-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-primary via-accent to-primary" />
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
      <div className="flex items-center gap-1.5 sm:gap-2">
        <LanguageToggle />
        <button
          className="rounded-xl border border-border/70 p-2 text-muted-foreground transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
          aria-label={t("notifications")}
        >
          <Bell className="h-4 w-4" />
        </button>
        <form action={logoutAction}>
          <button
            type="submit"
            className="rounded-xl border border-border/70 p-2 text-muted-foreground transition-colors hover:border-accent/40 hover:bg-accent/10 hover:text-accent"
            aria-label={locale === "bn" ? "লগআউট" : "Log out"}
            title={locale === "bn" ? "লগআউট" : "Log out"}
            data-testid="topbar-logout-button"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </form>
        <div
          className="hidden h-9 w-9 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-sm font-semibold text-primary sm:flex"
          aria-hidden="true"
        >
          {initials}
        </div>
      </div>
    </header>
  );
}
