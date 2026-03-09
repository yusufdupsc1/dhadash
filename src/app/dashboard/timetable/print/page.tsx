import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ classId?: string }>;
}

const ROUTINE_DAYS = [
  { dayOfWeek: 0, label: "রবিবার" },
  { dayOfWeek: 1, label: "সোমবার" },
  { dayOfWeek: 2, label: "মঙ্গলবার" },
  { dayOfWeek: 3, label: "বুধবার" },
  { dayOfWeek: 4, label: "বৃহস্পতিবার" },
] as const;

const ROUTINE_PERIODS = [1, 2, 3, 4, 5, 6] as const;

export default async function TimetablePrintPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const session = await auth();
  const currentUser = session?.user as
    | { id?: string; institutionId?: string }
    | undefined;
  const institutionId = currentUser?.institutionId;

  if (!institutionId) {
    redirect("/auth/login/admin");
  }

  if (!params.classId) {
    return (
      <main className="print-a4 p-4">
        <p className="text-sm">Missing class parameter.</p>
      </main>
    );
  }

  const [institution, classroom, entries] = await Promise.all([
    db.institution.findUnique({
      where: { id: institutionId },
      select: { name: true, address: true },
    }),
    db.class.findFirst({
      where: {
        id: params.classId,
        institutionId,
        isActive: true,
        grade: { in: ["1", "2", "3", "4", "5"] },
      },
      select: {
        id: true,
        name: true,
        grade: true,
        section: true,
      },
    }),
    db.classRoutineEntry.findMany({
      where: {
        institutionId,
        classId: params.classId,
      },
      select: {
        dayOfWeek: true,
        periodNo: true,
        subjectName: true,
      },
    }),
  ]);

  if (!classroom) {
    return (
      <main className="print-a4 p-4">
        <p className="text-sm">Class not found or not allowed.</p>
      </main>
    );
  }

  const cellMap = new Map<string, string>(
    entries.map((entry) => [
      `${entry.dayOfWeek}-${entry.periodNo}`,
      entry.subjectName,
    ]),
  );

  const generatedDate = new Date().toLocaleDateString("bn-BD", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <main className="print-a4 text-slate-900">
      <header className="mb-4 border-b border-slate-300 pb-3 text-center">
        <h1 className="text-xl font-bold">ক্লাস রুটিন</h1>
        <p className="text-xs text-slate-600">Class Routine (Govt Primary)</p>
        <p className="mt-2 text-sm font-semibold">
          {institution?.name ?? "School"}
        </p>
        <p className="text-xs text-slate-600">
          {institution?.address ?? "Bangladesh"}
        </p>
      </header>

      <section className="mb-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        <p>
          <span className="font-semibold">তারিখ:</span> {generatedDate}
        </p>
        <p>
          <span className="font-semibold">শ্রেণি:</span> {classroom.grade}
        </p>
        <p>
          <span className="font-semibold">সেকশন:</span> {classroom.section}
        </p>
        <p>
          <span className="font-semibold">ক্লাস নাম:</span> {classroom.name}
        </p>
      </section>

      <table className="w-full border-collapse text-sm routine-print-table">
        <thead>
          <tr>
            <th>দিন / পিরিয়ড</th>
            {ROUTINE_PERIODS.map((periodNo) => (
              <th key={periodNo}>পিরিয়ড {periodNo}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROUTINE_DAYS.map((day) => (
            <tr key={day.dayOfWeek}>
              <td className="font-semibold">{day.label}</td>
              {ROUTINE_PERIODS.map((periodNo) => (
                <td key={`${day.dayOfWeek}-${periodNo}`}>
                  {cellMap.get(`${day.dayOfWeek}-${periodNo}`) ?? ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <footer className="mt-12 grid grid-cols-1 gap-8 text-center text-sm sm:grid-cols-2">
        <div>
          <p className="pt-10">....................................</p>
          <p className="font-semibold">শ্রেণি শিক্ষক</p>
          <p className="text-xs text-slate-600">Class Teacher</p>
        </div>
        <div>
          <p className="pt-10">....................................</p>
          <p className="font-semibold">প্রধান শিক্ষক</p>
          <p className="text-xs text-slate-600">Head Teacher</p>
        </div>
      </footer>
    </main>
  );
}
