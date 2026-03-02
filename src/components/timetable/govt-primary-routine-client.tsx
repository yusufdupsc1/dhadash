"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Printer, Save, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { saveClassRoutine } from "@/server/actions/class-routine";

type ClassRow = {
  id: string;
  name: string;
  grade: string;
  section: string;
};

type RoutineGrid = {
  classId: string;
  className: string | null;
  grade: string | null;
  section: string | null;
  rows: Array<{
    dayOfWeek: number;
    label: string;
    periods: Array<{
      periodNo: number;
      subjectName: string;
    }>;
  }>;
};

interface Props {
  classes: ClassRow[];
  selectedClassId: string;
  routine: RoutineGrid;
}

const GOVT_PRIMARY_ROUTINE_GRADES = new Set(["1", "2", "3", "4", "5"]);

function cellKey(dayOfWeek: number, periodNo: number): string {
  return `${dayOfWeek}-${periodNo}`;
}

function mapFromRoutine(routine: RoutineGrid): Record<string, string> {
  const map: Record<string, string> = {};
  for (const row of routine.rows) {
    for (const cell of row.periods) {
      map[cellKey(row.dayOfWeek, cell.periodNo)] = cell.subjectName;
    }
  }
  return map;
}

export function GovtPrimaryRoutineClient({
  classes,
  selectedClassId,
  routine,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const filteredClasses = useMemo(() => {
    const primary = classes.filter((c) => GOVT_PRIMARY_ROUTINE_GRADES.has(c.grade));
    return primary.length > 0 ? primary : classes;
  }, [classes]);

  const selectedClass =
    filteredClasses.find((item) => item.id === selectedClassId) ??
    filteredClasses[0] ??
    null;

  const [selectedGrade, setSelectedGrade] = useState(selectedClass?.grade ?? "");
  const [selectedSection, setSelectedSection] = useState(selectedClass?.section ?? "");
  const [matrix, setMatrix] = useState<Record<string, string>>(() => mapFromRoutine(routine));

  useEffect(() => {
    setSelectedGrade(selectedClass?.grade ?? "");
    setSelectedSection(selectedClass?.section ?? "");
  }, [selectedClassId, selectedClass?.grade, selectedClass?.section]);

  useEffect(() => {
    setMatrix(mapFromRoutine(routine));
  }, [routine]);

  const gradeOptions = useMemo(
    () =>
      Array.from(new Set(filteredClasses.map((item) => item.grade))).sort(
        (a, b) => Number(a) - Number(b),
      ),
    [filteredClasses],
  );

  const sectionOptions = useMemo(
    () =>
      Array.from(
        new Set(
          filteredClasses
            .filter((item) => item.grade === selectedGrade)
            .map((item) => item.section),
        ),
      ).sort(),
    [filteredClasses, selectedGrade],
  );

  const activeClass = useMemo(
    () =>
      filteredClasses.find(
        (item) =>
          item.grade === selectedGrade && item.section === selectedSection,
      ) ?? null,
    [filteredClasses, selectedGrade, selectedSection],
  );

  const pushClass = (classId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (classId) {
      params.set("classId", classId);
    } else {
      params.delete("classId");
    }
    router.push(`?${params.toString()}`);
  };

  const handleGradeChange = (grade: string) => {
    const firstForGrade = filteredClasses.find((item) => item.grade === grade) ?? null;
    setSelectedGrade(grade);
    setSelectedSection(firstForGrade?.section ?? "");
    pushClass(firstForGrade?.id ?? "");
  };

  const handleSectionChange = (section: string) => {
    setSelectedSection(section);
    const match =
      filteredClasses.find(
        (item) => item.grade === selectedGrade && item.section === section,
      ) ?? null;
    pushClass(match?.id ?? "");
  };

  const updateCell = (dayOfWeek: number, periodNo: number, value: string) => {
    setMatrix((prev) => ({
      ...prev,
      [cellKey(dayOfWeek, periodNo)]: value,
    }));
  };

  const handleSave = () => {
    if (!activeClass) {
      toast.error("Select class and section first.");
      return;
    }

    const emptyPeriods: string[] = [];
    routine.rows.forEach((row) => {
      row.periods.forEach((period) => {
        const subject = matrix[cellKey(row.dayOfWeek, period.periodNo)]?.trim();
        if (!subject) {
          emptyPeriods.push(`${row.label} Period ${period.periodNo}`);
        }
      });
    });

    if (emptyPeriods.length > 0) {
      if (emptyPeriods.length > 5) {
        toast.warning(`${emptyPeriods.length} periods are empty. Save anyway?`, {
          action: { label: "Save", onClick: performSave },
        });
      } else {
        toast.warning(`Empty periods found: ${emptyPeriods.join(", ")}`, {
          action: { label: "Save Anyway", onClick: performSave },
        });
      }
      return;
    }

    performSave();
  };

  const performSave = () => {
    if (!activeClass) return;

    startTransition(async () => {
      const entries = routine.rows.flatMap((row) =>
        row.periods.map((period) => ({
          dayOfWeek: row.dayOfWeek,
          periodNo: period.periodNo,
          subjectName: matrix[cellKey(row.dayOfWeek, period.periodNo)] ?? "",
        })),
      );

      const result = await saveClassRoutine({
        classId: activeClass.id,
        entries,
      });

      if (result.success) {
        toast.success("Routine saved successfully.");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to save routine");
        if (result.fieldErrors) {
          Object.entries(result.fieldErrors).forEach(([field, messages]) => {
            toast.error(`${field}: ${messages.join(", ")}`);
          });
        }
      }
    });
  };

  const openPrintView = () => {
    if (!activeClass) {
      toast.error("Select class and section first.");
      return;
    }

    const url = `/dashboard/timetable/print?classId=${encodeURIComponent(activeClass.id)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Class Routine"
        description="Govt Primary (Class 1-5) weekly routine register"
      />

      <div className="rounded-lg border border-border bg-card p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4 sm:items-end">
          <div className="space-y-1.5">
            <Label>Class</Label>
            <Select value={selectedGrade} onValueChange={handleGradeChange}>
              <SelectTrigger>
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

          <div className="space-y-1.5">
            <Label>Section</Label>
            <Select value={selectedSection} onValueChange={handleSectionChange}>
              <SelectTrigger>
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

          <Button type="button" variant="outline" onClick={openPrintView} className="sm:col-span-1">
            <Printer className="mr-1.5 h-4 w-4" />
            Print A4
          </Button>

          <Button type="button" onClick={handleSave} disabled={pending || !activeClass}>
            <Save className="mr-1.5 h-4 w-4" />
            {pending ? "Saving..." : "Save Routine"}
          </Button>
        </div>
      </div>

      {activeClass ? (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full min-w-[820px] text-sm routine-grid-table">
            <thead>
              <tr>
                <th className="w-36 text-left">Weekday</th>
                <th className="text-left">Period 1</th>
                <th className="text-left">Period 2</th>
                <th className="text-left">Period 3</th>
                <th className="text-left">Period 4</th>
                <th className="text-left">Period 5</th>
                <th className="text-left">Period 6</th>
              </tr>
            </thead>
            <tbody>
              {routine.rows.map((row) => (
                <tr key={row.dayOfWeek}>
                  <td className="font-medium">{row.label}</td>
                  {row.periods.map((period) => (
                    <td key={`${row.dayOfWeek}-${period.periodNo}`}>
                      <Input
                        value={matrix[cellKey(row.dayOfWeek, period.periodNo)] ?? ""}
                        onChange={(event) =>
                          updateCell(row.dayOfWeek, period.periodNo, event.target.value)
                        }
                        placeholder="বাংলা / Math / বিজ্ঞান"
                        className="h-9"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border p-10 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="font-medium text-foreground mb-1">No classes available</p>
          <p className="text-sm text-muted-foreground">Classes 1-5 not found. Create classes in settings first.</p>
        </div>
      )}
    </div>
  );
}
