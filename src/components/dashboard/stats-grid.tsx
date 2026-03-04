import Link from "next/link";
import {
  Users,
  UserCheck,
  ClipboardCheck,
  CreditCard,
  ArrowUpRight,
} from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { isGovtPrimaryModeEnabled } from "@/lib/config";

interface StatsData {
  totalStudents: number;
  totalTeachers: number;
  todayAttendance: number;
  pendingFees: { amount: number; count: number };
}

export function StatsGrid({ stats }: { stats: StatsData }) {
  const teacherLabel = isGovtPrimaryModeEnabled()
    ? "Assistant Teachers"
    : "Teachers";

  const cards = [
    {
      id: "students",
      label: "Total Students",
      value: stats.totalStudents,
      icon: Users,
      color: "blue",
      trend: "+2% from last wk",
      href: "/dashboard/students",
    },
    {
      id: "teachers",
      label: teacherLabel,
      value: stats.totalTeachers,
      icon: UserCheck,
      color: "emerald",
      trend: "All sessions active",
      href: "/dashboard/teachers",
    },
    {
      id: "attendance",
      label: "Present Today",
      value: stats.todayAttendance,
      icon: ClipboardCheck,
      color: "purple",
      trend: "Synced 5m ago",
      href: "/dashboard/attendance",
    },
    {
      id: "finance",
      label: "Revenue Tracker",
      value: formatCurrency(Number(stats.pendingFees.amount ?? 0)),
      icon: CreditCard,
      color: "amber",
      subtitle: `${stats.pendingFees.count} pending invoices`,
      trend: "Awaiting clearance",
      href: "/dashboard/finance",
    },
  ];

  const colorMap: Record<string, string> = {
    blue: "bg-blue-500/10 text-blue-600 border-blue-200/50",
    emerald: "bg-emerald-500/10 text-emerald-600 border-emerald-200/50",
    purple: "bg-purple-500/10 text-purple-600 border-purple-200/50",
    amber: "bg-amber-500/10 text-amber-600 border-amber-200/50",
  };

  return (
    <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Link
            key={card.label}
            href={card.href}
            className="group relative flex flex-col justify-between overflow-hidden rounded-[2rem] border border-border/40 bg-card/60 backdrop-blur-sm p-6 shadow-sm transition-premium hover:shadow-xl hover:-translate-y-1 premium-shadow cursor-pointer active:scale-[0.99]"
            data-testid={`stats-card-${card.id}`}
          >
            {/* Background Accent */}
            <div
              className={cn(
                "absolute -right-4 -top-4 h-24 w-24 rounded-full blur-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-20",
                card.color === "blue"
                  ? "bg-blue-500"
                  : card.color === "emerald"
                    ? "bg-emerald-500"
                    : card.color === "purple"
                      ? "bg-purple-500"
                      : "bg-amber-500",
              )}
            />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-5">
                <div
                  className={cn(
                    "h-12 w-12 rounded-2xl flex items-center justify-center border transition-transform duration-500 group-hover:scale-110",
                    colorMap[card.color],
                  )}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <div className="h-8 w-8 rounded-full bg-muted/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-[11px] font-black uppercase tracking-[0.15em] text-muted-foreground/70">
                  {card.label}
                </p>
                <div className="flex items-baseline gap-1">
                  <h3 className="text-3xl font-black tracking-tight text-foreground tabular-nums">
                    {card.value}
                  </h3>
                </div>
                {card.subtitle && (
                  <p className="text-[10px] font-bold text-muted-foreground block truncate">
                    {card.subtitle}
                  </p>
                )}
              </div>
            </div>

            <div className="relative z-10 mt-6 pt-4 border-t border-border/40">
              <div className="flex items-center gap-1.5">
                <span className="flex h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                <span className="text-[10px] font-bold text-muted-foreground tracking-tight italic">
                  {card.trend}
                </span>
              </div>
            </div>
          </Link>
        );
      })}
    </section>
  );
}
