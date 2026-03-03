// src/components/attendance/attendance-client.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { convertToCSV, downloadCSV } from "@/lib/csv-export";
import { useGovtPrimaryT, useT } from "@/lib/i18n/client";
import {
  exportAttendanceRegisterToCSV,
  getAttendanceForClass,
  markAttendance,
} from "@/server/actions/attendance";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  Printer,
  Users,
  XCircle,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

type ClassRow = { id: string; name: string; grade: string; section: string };
type Summary = {
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  presentRate: number;
};

interface Props {
  classes: ClassRow[];
  selectedClassId: string;
  selectedDate: string;
  summary: Summary;
}

type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED" | "HOLIDAY";

type StudentRow = {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
  attendance: { status: AttendanceStatus; remarks: string | null } | null;
};

const STATUS_CONFIG: Record<
  AttendanceStatus,
  { label: string; icon: React.ElementType; color: string; bg: string }
> = {
  PRESENT: {
    label: "উপস্থিত",
    icon: CheckCircle2,
    color: "text-green-600",
    bg: "bg-green-500/10",
  },
  ABSENT: {
    label: "অনুপস্থিত",
    icon: XCircle,
    color: "text-red-600",
    bg: "bg-red-500/10",
  },
  LATE: {
    label: "দেরিতে",
    icon: Clock,
    color: "text-yellow-600",
    bg: "bg-yellow-500/10",
  },
  EXCUSED: {
    label: "ছুটিযুক্ত",
    icon: AlertCircle,
    color: "text-blue-600",
    bg: "bg-blue-500/10",
  },
  HOLIDAY: {
    label: "ছুটি",
    icon: AlertCircle,
    color: "text-muted-foreground",
    bg: "bg-muted",
  },
};

const INTERACTIVE_STATUSES: Array<{
  key: Exclude<AttendanceStatus, "HOLIDAY">;
  symbol: string;
}> = [
  { key: "PRESENT", symbol: "P" },
  { key: "ABSENT", symbol: "A" },
];

const GOVT_PRIMARY_REGISTER_GRADES = new Set(["1", "2", "3", "4", "5"]);

export function AttendanceClient({
  classes,
  selectedClassId,
  selectedDate,
  summary,
}: Props) {
  const { t } = useT();
  const { t: tg } = useGovtPrimaryT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [attendanceMap, setAttendanceMap] = useState<
    Record<string, AttendanceStatus>
  >({});
  const [date, setDate] = useState(selectedDate);

  const registerClasses = useMemo(() => {
    const filtered = classes.filter((cls) =>
      GOVT_PRIMARY_REGISTER_GRADES.has(cls.grade),
    );
    return filtered.length > 0 ? filtered : classes;
  }, [classes]);

  const initialClass =
    registerClasses.find((cls) => cls.id === selectedClassId) ??
    registerClasses[0] ??
    null;

  const [selectedGrade, setSelectedGrade] = useState(initialClass?.grade ?? "");
  const [selectedSection, setSelectedSection] = useState(
    initialClass?.section ?? "",
  );

  const gradeOptions = useMemo(
    () =>
      Array.from(new Set(registerClasses.map((cls) => cls.grade))).sort(
        (a, b) => Number(a) - Number(b),
      ),
    [registerClasses],
  );

  const sectionOptions = useMemo(
    () =>
      Array.from(
        new Set(
          registerClasses
            .filter((cls) => cls.grade === selectedGrade)
            .map((cls) => cls.section),
        ),
      ).sort(),
    [registerClasses, selectedGrade],
  );

  const classId = useMemo(
    () =>
      registerClasses.find(
        (cls) => cls.grade === selectedGrade && cls.section === selectedSection,
      )?.id ?? "",
    [registerClasses, selectedGrade, selectedSection],
  );

  const updateUrl = (newClassId: string, newDate: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newClassId) params.set("classId", newClassId);
    else params.delete("classId");
    params.set("date", newDate);
    router.push(`?${params.toString()}`);
  };

  const loadStudents = () => {
    if (!classId) {
      toast.error("Please select class and section");
      return;
    }
    startTransition(async () => {
      const rows = await getAttendanceForClass({ classId, date });
      setStudents(rows as StudentRow[]);
      const map: Record<string, AttendanceStatus> = {};
      rows.forEach((s) => {
        map[s.id] = (s.attendance?.status as AttendanceStatus) ?? "PRESENT";
      });
      setAttendanceMap(map);
      setLoaded(true);
      updateUrl(classId, date);
    });
  };

  const setStatus = (id: string, status: AttendanceStatus) => {
    setAttendanceMap((m) => ({ ...m, [id]: status }));
  };

  const setAll = (status: AttendanceStatus) => {
    const map: Record<string, AttendanceStatus> = {};
    students.forEach((s) => {
      map[s.id] = status;
    });
    setAttendanceMap(map);
  };

  const handleSubmit = () => {
    if (!students.length) {
      toast.error("No students available for this class. Add students first.");
      return;
    }
    startTransition(async () => {
      const res = await markAttendance({
        classId,
        date,
        entries: students.map((s) => ({
          studentId: s.id,
          status: attendanceMap[s.id] ?? "PRESENT",
        })),
      });
      if (res.success) {
        toast.success(`Attendance saved for ${students.length} students`);
      } else {
        toast.error(res.error || "Failed to save attendance");
        if (res.fieldErrors) {
          Object.entries(res.fieldErrors).forEach(([field, messages]) => {
            toast.error(`${field}: ${messages.join(", ")}`);
          });
        }
      }
    });
  };

  const openPrintView = () => {
    if (!classId || !date) {
      toast.error("Select class and date first");
      return;
    }

    const url = `/dashboard/attendance/print?classId=${encodeURIComponent(classId)}&date=${encodeURIComponent(date)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleExportCSV = () => {
    if (!classId || !date) {
      toast.error("Select class and date first");
      return;
    }

    startTransition(async () => {
      try {
        const result = await exportAttendanceRegisterToCSV({ classId, date });
        if (!result.success || !result.data) {
          toast.error(result.error || "Failed to export attendance");
          return;
        }

        const headers = [
          "rolNo",
          "studentId",
          "firstName",
          "lastName",
          "status",
        ] as const;
        const headerLabels = [
          "Roll No",
          "Student ID",
          "First Name",
          "Last Name",
          "Status",
        ];

        const csv = convertToCSV(result.data, headers, headerLabels);
        const timestamp = new Date().toISOString().slice(0, 10);
        downloadCSV(csv, `attendance_${timestamp}.csv`);
        toast.success(`Exported ${result.data.length} records`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Export failed");
      }
    });
  };

  const stats = [
    {
      label: "উপস্থিত",
      value: summary.present,
      color: "text-green-600",
      bg: "bg-green-500/10",
    },
    {
      label: "অনুপস্থিত",
      value: summary.absent,
      color: "text-red-600",
      bg: "bg-red-500/10",
    },
    {
      label: "দেরিতে",
      value: summary.late,
      color: "text-yellow-600",
      bg: "bg-yellow-500/10",
    },
    {
      label: "ছুটিযুক্ত",
      value: summary.excused,
      color: "text-blue-600",
      bg: "bg-blue-500/10",
    },
  ];

  return (
    <>
      <PageHeader
        title={tg("attendance_register")}
        description="দৈনিক উপস্থিতি নিন ও রেজিস্টার প্রিন্ট করুন"
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-border bg-card p-3 sm:p-4"
          >
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {s.label}
            </p>
            <p className={`mt-1 text-xl font-bold sm:text-2xl ${s.color}`}>
              {s.value}
            </p>
          </div>
        ))}
        <div className="rounded-xl border border-border bg-card p-4 col-span-2 sm:col-span-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex-1 bg-muted rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all"
              style={{ width: `${summary.presentRate}%` }}
            />
          </div>
          <span className="text-center text-sm font-semibold sm:text-left">
            {summary.presentRate}% attendance rate (last 30 days)
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="font-semibold mb-3">Daily Attendance Register</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4 sm:items-end">
          <div className="w-full space-y-1.5 sm:w-auto">
            <Label>{t("class")}</Label>
            <Select
              value={selectedGrade}
              onValueChange={(gradeValue) => {
                const nextSections = Array.from(
                  new Set(
                    registerClasses
                      .filter((cls) => cls.grade === gradeValue)
                      .map((cls) => cls.section),
                  ),
                ).sort();
                setSelectedGrade(gradeValue);
                setSelectedSection(nextSections[0] ?? "");
                setLoaded(false);
              }}
            >
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {gradeOptions.map((grade) => (
                  <SelectItem key={grade} value={grade}>
                    Class {grade}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full space-y-1.5 sm:w-auto">
            <Label>{t("section")}</Label>
            <Select
              value={selectedSection}
              onValueChange={(v) => {
                setSelectedSection(v);
                setLoaded(false);
              }}
            >
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue placeholder="Select section" />
              </SelectTrigger>
              <SelectContent>
                {sectionOptions.map((section) => (
                  <SelectItem key={section} value={section}>
                    {section}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full space-y-1.5 sm:w-auto">
            <Label>তারিখ</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setLoaded(false);
              }}
              className="w-full sm:w-40"
            />
          </div>
          <Button
            onClick={loadStudents}
            disabled={pending || !classId}
            className="w-full sm:w-auto sm:min-w-36"
          >
            <Users className="h-4 w-4 mr-1.5" /> {t("students")}
          </Button>
        </div>
      </div>

      {!loaded && (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <Users className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">
            Select a class and date, then click &quot;Students&quot; to load
            attendance records
          </p>
        </div>
      )}

      {loaded && students.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex flex-col gap-3 p-4 border-b border-border sm:flex-row sm:items-center sm:justify-between">
            <p className="font-semibold">{students.length} students</p>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              {(["PRESENT", "ABSENT"] as AttendanceStatus[]).map((s) => (
                <Button
                  key={s}
                  variant="outline"
                  size="sm"
                  onClick={() => setAll(s)}
                >
                  Mark All {STATUS_CONFIG[s].label}
                </Button>
              ))}
              <Button size="sm" onClick={handleSubmit} disabled={pending}>
                {pending ? "Saving..." : "Save Attendance"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                disabled={pending}
                className="no-print"
              >
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Export CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={openPrintView}
                className="no-print"
              >
                <Printer className="h-3.5 w-3.5 mr-1.5" />
                Print Register
              </Button>
            </div>
          </div>
          <div className="divide-y divide-border/60">
            {students.map((s) => {
              const status = attendanceMap[s.id] ?? "PRESENT";
              return (
                <div
                  key={s.id}
                  className="flex flex-col gap-2 px-4 py-3 hover:bg-muted/30 transition-colors sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-sm">
                      {s.firstName} {s.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {s.studentId}
                    </p>
                  </div>
                  <div className="w-full sm:w-auto">
                    <div className="flex snap-x items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:justify-end">
                      {INTERACTIVE_STATUSES.map(({ key, symbol }) => {
                        const c = STATUS_CONFIG[key];
                        const Icon = c.icon;
                        return (
                          <button
                            key={key}
                            onClick={() => setStatus(s.id, key)}
                            className={`group snap-start inline-flex min-w-[4.5rem] items-center justify-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-semibold transition-all duration-200 active:scale-95 ${
                              status === key
                                ? `${c.bg} ${c.color} border-current shadow-sm`
                                : "border-border text-muted-foreground hover:border-muted-foreground hover:bg-muted/50"
                            }`}
                          >
                            <span
                              className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${status === key ? "bg-white/70" : "bg-muted"}`}
                            >
                              {symbol}
                            </span>
                            <Icon className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">{c.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {loaded && students.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <Users className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
          <p className="font-medium text-foreground mb-1">No students found</p>
          <p className="text-sm text-muted-foreground mb-4">
            This class has no active students. Add students first to mark
            attendance.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const newParams = new URLSearchParams(searchParams.toString());
              newParams.delete("classId");
              newParams.delete("date");
              router.push(`/dashboard/students?${newParams.toString()}`);
            }}
          >
            Go to Students
          </Button>
        </div>
      )}
    </>
  );
}
