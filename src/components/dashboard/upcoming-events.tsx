import { formatDate } from "@/lib/utils";
import { CalendarDays, ArrowRight } from "lucide-react";
import Link from "next/link";

interface EventItem {
  id: string;
  title: string;
  startDate: Date;
  type: string;
}

interface UpcomingEventsProps {
  events: EventItem[];
  isBangla?: boolean;
}

export function UpcomingEvents({
  events,
  isBangla = false,
}: UpcomingEventsProps) {
  return (
    <section className="group relative flex h-full flex-col overflow-hidden rounded-[2rem] border border-border bg-card p-6 shadow-sm transition-premium hover:border-primary/25">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-primary/60 via-accent/60 to-primary/60" />
      <div className="flex items-center justify-between mb-6">
        <div className="flex flex-col">
          <h2 className="text-lg font-bold tracking-tight text-foreground/90">
            {isBangla ? "একাডেমিক ক্যালেন্ডার" : "Academic Calendar"}
          </h2>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {isBangla ? "নির্ধারিত ইভেন্ট" : "Scheduled Events"}
          </p>
        </div>
        <Link
          href="/dashboard/events"
          className="flex items-center gap-1 text-[11px] font-bold uppercase leading-none tracking-widest text-muted-foreground transition-colors hover:text-primary"
        >
          {isBangla ? "পূর্ণ তালিকা" : "Full Schedule"}{" "}
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="space-y-4 flex-1 relative z-10">
        {events.length ? (
          events.map((event, i) => (
            <div
              key={event.id}
              className="group/item relative overflow-hidden rounded-2xl border border-border bg-muted/20 px-4 py-4 transition-premium hover:border-primary/20 hover:bg-primary/5"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-semibold leading-tight text-foreground/90 transition-colors group-hover/item:text-primary">
                    {event.title}
                  </p>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-primary">
                      {event.type}
                    </span>
                    <span className="text-muted-foreground/60">•</span>
                    <span className="text-muted-foreground font-medium">
                      {formatDate(event.startDate)}
                    </span>
                  </div>
                </div>
                <div className="flex h-10 w-10 flex-col items-center justify-center rounded-xl border border-border/70 bg-background/60 shadow-sm">
                  <span className="text-[10px] font-black text-primary leading-none">
                    {new Date(event.startDate).getDate()}
                  </span>
                  <span className="text-[8px] font-bold text-muted-foreground uppercase">
                    {new Date(event.startDate).toLocaleString("default", {
                      month: "short",
                    })}
                  </span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex h-40 flex-col items-center justify-center rounded-[1.5rem] border-2 border-dashed border-border/60 bg-muted/10 p-6">
            <CalendarDays className="h-10 w-10 text-muted-foreground/20 mb-3" />
            <p className="text-sm font-bold text-muted-foreground/60">
              {isBangla ? "কোনো ইভেন্ট নেই" : "No scheduled events"}
            </p>
            <p className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground/40">
              {isBangla ? "ক্যালেন্ডার ফাঁকা" : "Calendar is clear"}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
