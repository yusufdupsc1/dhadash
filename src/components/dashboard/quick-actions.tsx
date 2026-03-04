import Link from "next/link";
import {
  UserPlus,
  CalendarCheck,
  Megaphone,
  Banknote,
  FileText,
  MessagesSquare,
  FileBadge,
  CalendarDays,
  ArrowRight,
} from "lucide-react";
import { cookies } from "next/headers";
import { cn } from "@/lib/utils";
import { normalizeLocale } from "@/lib/i18n/getDict";

const actions = [
  {
    label: { en: "Add Student", bn: "শিক্ষার্থী যোগ করুন" },
    href: "/dashboard/students",
    icon: UserPlus,
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    label: { en: "Take Attendance", bn: "উপস্থিতি নিন" },
    href: "/dashboard/attendance",
    icon: CalendarCheck,
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    label: { en: "Create Notice", bn: "নোটিশ প্রকাশ করুন" },
    href: "/dashboard/announcements",
    icon: Megaphone,
    color: "text-accent",
    bg: "bg-accent/10",
  },
  {
    label: { en: "Collect Fee", bn: "ফি সংগ্রহ" },
    href: "/dashboard/finance",
    icon: Banknote,
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    label: { en: "Add Result", bn: "রেজাল্ট এন্ট্রি" },
    href: "/dashboard/grades",
    icon: FileBadge,
    color: "text-accent",
    bg: "bg-accent/10",
  },
  {
    label: { en: "Send SMS", bn: "এসএমএস পাঠান" },
    href: "/dashboard/notices",
    icon: MessagesSquare,
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    label: { en: "Primary Exams", bn: "প্রাথমিক পরীক্ষা" },
    href: "/dashboard/exams/primary",
    icon: FileText,
    color: "text-accent",
    bg: "bg-accent/10",
  },
  {
    label: { en: "Timetable", bn: "রুটিন" },
    href: "/dashboard/timetable",
    icon: CalendarDays,
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    label: { en: "Student Reports", bn: "শিক্ষার্থী রিপোর্ট" },
    href: "/dashboard/students/reports",
    icon: FileBadge,
    color: "text-accent",
    bg: "bg-accent/10",
  },
];

export async function QuickActions() {
  const cookieStore = await cookies();
  const locale = normalizeLocale(
    cookieStore.get("locale")?.value ?? cookieStore.get("NEXT_LOCALE")?.value,
  );
  const isBangla = locale === "bn";

  return (
    <section className="relative flex h-full flex-col overflow-hidden rounded-3xl border border-primary/15 bg-card/95 p-4 shadow-sm sm:p-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-primary via-accent to-primary" />
      <div className="flex items-center justify-between mb-4">
        <div className="flex flex-col">
          <h2 className="text-sm font-extrabold uppercase tracking-[0.14em] text-foreground/80">
            {isBangla ? "দ্রুত কাজ" : "Quick Actions"}
          </h2>
        </div>
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-1 text-[10px] font-bold uppercase leading-none tracking-widest text-muted-foreground transition-colors hover:text-primary"
        >
          {isBangla ? "সব দেখুন" : "View All"} <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div
        className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3"
        data-testid="quick-actions-grid"
      >
        {actions.map((action) => {
          const Icon = action.icon;
          const label = isBangla ? action.label.bn : action.label.en;
          return (
            <Link
              key={action.href}
              href={action.href}
              className="group/action flex min-h-24 flex-col items-center justify-center gap-1.5 rounded-xl border border-border/80 bg-background/70 px-1.5 py-2 transition-colors hover:border-primary/30 hover:bg-primary/5"
              data-testid={`quick-action-${action.label.en.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <div
                className={cn(
                  "relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border shadow-sm transition-premium sm:h-12 sm:w-12 sm:rounded-2xl",
                  action.bg,
                  action.color,
                  "border-current/15 hover:scale-105 hover:shadow-md active:scale-95",
                )}
              >
                <Icon className="h-5 w-5 sm:h-6 sm:w-6 transition-transform duration-500 group-hover/action:rotate-6" />
              </div>
              <span className="w-full px-0.5 text-center text-[10px] font-semibold leading-tight text-muted-foreground transition-colors group-hover/action:text-primary sm:text-[11px]">
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
