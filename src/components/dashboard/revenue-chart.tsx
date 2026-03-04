import { formatCurrency, formatDate } from "@/lib/utils";

interface RevenueRow {
  paidAt: Date;
  _sum: { amount: number | null };
}

interface RevenueChartProps {
  data: RevenueRow[];
  isBangla?: boolean;
}

export function RevenueChart({
  data,
  isBangla = false,
}: RevenueChartProps) {
  return (
    <section className="flex h-full flex-col rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <h2 className="mb-4 flex items-center justify-between gap-2 text-xl font-semibold">
        {isBangla ? "ফি সংগ্রহ (এই বছর)" : "Revenue (This Year)"}
        <span className="rounded-full border border-accent/20 bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
          {isBangla ? "চলতি বছর" : "YTD"}
        </span>
      </h2>

      <div className="flex-1 space-y-2">
        {data.length ? (
          data.map((row, idx) => (
            <div
              key={`${row.paidAt.toISOString()}-${idx}`}
              className="flex items-center justify-between rounded-xl border border-border bg-muted/20 px-3 py-2.5 transition-colors hover:border-primary/30 hover:bg-primary/5"
            >
              <span className="text-sm text-muted-foreground">
                {formatDate(row.paidAt)}
              </span>
              <span className="text-sm font-semibold">
                {formatCurrency(
                  Number(row._sum.amount ?? 0),
                  "BDT",
                  isBangla ? "bn-BD" : "en-US",
                )}
              </span>
            </div>
          ))
        ) : (
          <div className="flex h-full min-h-32 items-center justify-center rounded-xl border border-dashed border-border bg-muted/10 p-4 text-center text-sm text-muted-foreground">
            {isBangla
              ? "এখনও কোনো পেমেন্ট রেকর্ড হয়নি"
              : "No payments recorded yet."}
          </div>
        )}
      </div>
    </section>
  );
}
