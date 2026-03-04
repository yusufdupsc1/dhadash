import { formatDate } from "@/lib/utils";

interface AttendanceRow {
  date: Date;
  status: string;
  _count: number;
}

interface AttendanceChartProps {
  data: AttendanceRow[];
  isBangla?: boolean;
}

function statusLabel(status: string, isBangla: boolean) {
  if (!isBangla) return status;
  if (status === "PRESENT") return "উপস্থিত";
  if (status === "ABSENT") return "অনুপস্থিত";
  if (status === "LATE") return "দেরি";
  if (status === "EXCUSED") return "ছুটি";
  return status;
}

export function AttendanceChart({
  data,
  isBangla = false,
}: AttendanceChartProps) {
  return (
    <section className="flex h-full flex-col rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <h2 className="mb-4 flex items-center justify-between gap-2 text-xl font-semibold">
        {isBangla ? "গত ৩০ দিনের উপস্থিতি" : "Attendance (Last 30 Days)"}
        <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
          {isBangla ? "সংক্ষিপ্ত" : "Overview"}
        </span>
      </h2>

      <div className="max-h-72 flex-1 overflow-auto rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 z-10 bg-card">
            <tr className="border-b border-border text-muted-foreground">
              <th className="px-4 py-2.5 font-medium">{isBangla ? "তারিখ" : "Date"}</th>
              <th className="px-4 py-2.5 font-medium">{isBangla ? "অবস্থা" : "Status"}</th>
              <th className="px-4 py-2.5 text-right font-medium">
                {isBangla ? "সংখ্যা" : "Count"}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/80">
            {data.length ? (
              data.map((row, idx) => (
                <tr key={`${row.date.toISOString()}-${row.status}-${idx}`}>
                  <td className="px-4 py-2.5">{formatDate(row.date)}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        row.status === "PRESENT"
                          ? "bg-primary/10 text-primary"
                          : row.status === "ABSENT"
                            ? "bg-accent/10 text-accent"
                            : row.status === "LATE"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {statusLabel(row.status, isBangla)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold">{row._count}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-10 text-center text-muted-foreground" colSpan={3}>
                  {isBangla
                    ? "এখনও উপস্থিতির তথ্য পাওয়া যায়নি"
                    : "No attendance data available yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
