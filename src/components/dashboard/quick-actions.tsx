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
import { cn } from "@/lib/utils";

const actions = [
  {
    label: "Add Pupil",
    href: "/dashboard/students",
    icon: UserPlus,
    color: "text-cyan-600",
    bg: "bg-cyan-50",
  },
  {
    label: "Take Attendance",
    href: "/dashboard/attendance",
    icon: CalendarCheck,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    label: "Create Notice",
    href: "/dashboard/announcements",
    icon: Megaphone,
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  {
    label: "Collect Fee",
    href: "/dashboard/finance",
    icon: Banknote,
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    label: "Add Result",
    href: "/dashboard/grades",
    icon: FileBadge,
    color: "text-violet-600",
    bg: "bg-violet-50",
  },
  {
    label: "Send SMS",
    href: "/dashboard/notices",
    icon: MessagesSquare,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
  },
  {
    label: "Primary Exams",
    href: "/dashboard/exams/primary",
    icon: FileText,
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
  {
    label: "Timetable",
    href: "/dashboard/timetable",
    icon: CalendarDays,
    color: "text-sky-600",
    bg: "bg-sky-50",
  },
  {
    label: "Student Reports",
    href: "/dashboard/students/reports",
    icon: FileBadge,
    color: "text-pink-600",
    bg: "bg-pink-50",
  },
];

export function QuickActions() {
  return (
    <section className="group relative overflow-hidden rounded-3xl border border-border/40 bg-card/60 backdrop-blur-xl p-4 sm:p-6 shadow-sm transition-premium hover:border-primary/20 premium-shadow h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex flex-col">
          <h2 className="text-sm font-black tracking-tight text-foreground/80 uppercase">
            Quick Actions
          </h2>
        </div>
        <Link
          href="/dashboard/settings"
          className="text-[10px] font-bold text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors uppercase tracking-widest leading-none"
        >
          View All <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div
        className="grid grid-cols-3 gap-2 sm:gap-3 flex-1 items-center"
        data-testid="quick-actions-grid"
      >
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.href}
              href={action.href}
              className="flex min-h-24 flex-col items-center justify-center gap-1.5 rounded-xl border border-border/40 bg-background/40 px-1.5 py-2 group/action transition-colors hover:bg-muted/40"
              data-testid={`quick-action-${action.label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <div
                className={cn(
                  "h-10 w-10 rounded-xl sm:h-12 sm:w-12 sm:rounded-2xl flex items-center justify-center shadow-sm border border-black/5 transition-premium relative overflow-hidden",
                  action.bg,
                  action.color,
                  "hover:scale-105 hover:shadow-lg active:scale-95",
                )}
              >
                {/* Micro-shimmer effect on hover */}
                <div className="absolute inset-0 bg-white/40 translate-x-[-100%] group-hover/action:translate-x-[100%] transition-transform duration-700" />
                <Icon className="h-5 w-5 sm:h-6 sm:w-6 transition-transform duration-500 group-hover/action:rotate-6" />
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold tracking-tight text-muted-foreground/80 group-hover/action:text-foreground transition-colors leading-tight text-center px-0.5 line-clamp-2 w-full">
                {action.label}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
