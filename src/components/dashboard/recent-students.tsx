import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { UserRound, ArrowRight } from "lucide-react";

interface StudentItem {
  id: string;
  firstName: string;
  lastName: string;
  studentId: string;
  createdAt: string | null;
  class: { name: string } | null;
}

interface RecentStudentsProps {
  students: StudentItem[];
  isBangla?: boolean;
}

export function RecentStudents({
  students,
  isBangla = false,
}: RecentStudentsProps) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          {isBangla ? "সাম্প্রতিক ভর্তি" : "Recent Enrollments"}
        </h2>
        <Link
          href="/dashboard/students"
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          {isBangla ? "তালিকা দেখুন" : "View directory"}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="space-y-2">
        {students.length ? (
          students.map((student) => (
            <div
              key={student.id}
              className="flex items-center justify-between rounded-xl border border-border bg-muted/20 px-3 py-2.5 transition-colors hover:border-primary/25 hover:bg-primary/5"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-xs font-semibold text-primary">
                  {student.firstName[0]}
                  {student.lastName[0]}
                </div>
                <div>
                  <p className="text-sm font-semibold">
                    {student.firstName} {student.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {student.studentId}
                    {student.class?.name ? ` • ${student.class.name}` : ""}
                  </p>
                </div>
              </div>
              <p className="rounded-full border border-border bg-background px-2 py-0.5 text-xs text-muted-foreground">
                {student.createdAt ? formatDate(student.createdAt) : "—"}
              </p>
            </div>
          ))
        ) : (
          <div className="flex min-h-28 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/10 text-center text-sm text-muted-foreground">
            <UserRound className="mb-2 h-5 w-5 text-muted-foreground/70" />
            {isBangla ? "সাম্প্রতিক ভর্তি নেই" : "No recent enrollments"}
          </div>
        )}
      </div>
    </section>
  );
}
