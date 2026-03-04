import Link from "next/link";
import { Users, UserCheck, ClipboardCheck, CreditCard } from "lucide-react";
import { convertToBanglaDigits } from "@/lib/bangla-digits";
import { formatCurrency, cn } from "@/lib/utils";

interface StatsData {
  totalStudents: number;
  totalTeachers: number;
  todayAttendance: number;
  pendingFees: { amount: number; count: number };
}

interface StatsGridProps {
  stats: StatsData;
  isBangla?: boolean;
  govtPrimaryMode?: boolean;
}

function n(value: number, isBangla: boolean) {
  return isBangla ? convertToBanglaDigits(value) : String(value);
}

export function StatsGrid({
  stats,
  isBangla = false,
  govtPrimaryMode = false,
}: StatsGridProps) {
  const teacherLabel = isBangla
    ? govtPrimaryMode
      ? "সহকারী শিক্ষক"
      : "শিক্ষক"
    : govtPrimaryMode
      ? "Assistant Teachers"
      : "Teachers";

  const cards = [
    {
      id: "students",
      label: isBangla ? "শিক্ষার্থী" : "Students",
      value: n(stats.totalStudents, isBangla),
      icon: Users,
      color: "text-primary",
      href: "/dashboard/students",
    },
    {
      id: "teachers",
      label: teacherLabel,
      value: n(stats.totalTeachers, isBangla),
      icon: UserCheck,
      color: "text-primary",
      href: "/dashboard/teachers",
    },
    {
      id: "attendance",
      label: isBangla ? "আজকের উপস্থিতি" : "Present Today",
      value: n(stats.todayAttendance, isBangla),
      icon: ClipboardCheck,
      color: "text-primary",
      href: "/dashboard/attendance",
    },
    {
      id: "finance",
      label: isBangla ? "বকেয়া ফি" : "Pending Fees",
      value: formatCurrency(
        Number(stats.pendingFees.amount ?? 0),
        "BDT",
        isBangla ? "bn-BD" : "en-US",
      ),
      icon: CreditCard,
      color: "text-accent",
      subtitle: isBangla
        ? `${n(stats.pendingFees.count, isBangla)} টি ইনভয়েস`
        : `${stats.pendingFees.count} invoices`,
      href: "/dashboard/finance",
    },
  ];

  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Link
            key={card.label}
            href={card.href}
            className="group rounded-2xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/30 hover:bg-primary/5"
            data-testid={`stats-card-${card.id}`}
          >
            <div>
              <div className="mb-4 flex items-start justify-between">
                <p className="text-sm font-semibold text-muted-foreground">
                  {card.label}
                </p>
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg border border-current/20 bg-muted/30",
                    card.color,
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <p className="text-3xl font-bold leading-none tracking-tight sm:text-4xl">
                {card.value}
              </p>
              {card.subtitle ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {card.subtitle}
                </p>
              ) : null}
            </div>
          </Link>
        );
      })}
    </section>
  );
}
