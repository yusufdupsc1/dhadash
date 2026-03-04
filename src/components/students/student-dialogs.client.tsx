"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/lib/i18n/client";
import { isGovtPrimaryModeEnabled } from "@/lib/config";

type Student = {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
  studentNameBn?: string | null;
  studentNameEn?: string | null;
  email: string | null;
  phone?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  guardianName?: string | null;
  rollNo?: string | null;
  address?: string | null;
  village?: string | null;
  ward?: string | null;
  upazila?: string | null;
  district?: string | null;
  city?: string | null;
  country?: string | null;
  fatherName?: string | null;
  motherName?: string | null;
  guardianPhone?: string | null;
  birthRegNo?: string | null;
  nidNo?: string | null;
  classId?: string | null;
  status: string;
  createdAt: string | null;
  class: { name: string; grade: string; section: string } | null;
};

type FormData = {
id?: string;
studentNameBn: string;
studentNameEn: string;
firstName: string;
lastName: string;
email: string;
phone: string;
dateOfBirth: string;
gender: string;
classId: string;
section: string;
rollNo: string;
guardianName: string;
address: string;
village: string;
ward: string;
upazila: string;
district: string;
city: string;
country: string;
fatherName: string;
motherName: string;
guardianPhone: string;
birthRegNo: string;
nidNo: string;
};

// --- Helpers ---
function toDateInputValue(value?: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
}

const GOVT_PRIMARY_ADMISSION_GRADES = new Set(["1", "2", "3", "4", "5"]);

function splitEnglishName(fullName: string) {
  const cleaned = fullName.trim().replace(/\s+/g, " ");
  if (!cleaned) return { firstName: "", lastName: "" };
  const parts = cleaned.split(" ");
  const firstName = parts.shift() ?? "";
  const lastName = parts.join(" ") || ".";
  return { firstName, lastName };
}

function getInitialState(): FormData {
  return {
    studentNameBn: "",
    studentNameEn: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    gender: "",
    classId: "",
    section: "",
    rollNo: "",
    guardianName: "",
    address: "",
    village: "",
    ward: "",
    upazila: "",
    district: "",
    city: "",
    country: "Bangladesh",
    fatherName: "",
    motherName: "",
    guardianPhone: "",
    birthRegNo: "",
    nidNo: "",
  };
}

interface StudentDialogsProps {
  classes: any[];
  allStudents: Student[];
}

export function StudentDialogs({ classes, allStudents }: StudentDialogsProps) {
  const { t } = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const govtPrimaryMode = isGovtPrimaryModeEnabled();
  const [pending, startTransition] = useTransition();

  const dialogParam = searchParams.get("dialog");
  const editParam = searchParams.get("edit");

  const [formData, setFormData] = useState<FormData>(getInitialState());

  // Handle Edit State
  useEffect(() => {
    if (editParam) {
      const student = allStudents.find((s) => s.id === editParam);
      if (student) {
        setFormData({
          id: student.id,
          studentNameBn: student.studentNameBn ?? "",
          studentNameEn:
            student.studentNameEn ??
            `${student.firstName} ${student.lastName}`.trim(),
          firstName: student.firstName,
          lastName: student.lastName,
          email: student.email ?? "",
          phone: student.phone ?? "",
          dateOfBirth: toDateInputValue(student.dateOfBirth),
          gender: student.gender ?? "",
          classId: student.classId ?? "",
          section: student.class?.section ?? "",
          rollNo: student.rollNo ?? "",
          guardianName: student.guardianName ?? "",
          address: student.address ?? "",
          village: student.village ?? "",
          ward: student.ward ?? "",
          upazila: student.upazila ?? "",
          district: student.district ?? "",
          city: student.city ?? "",
          country: student.country ?? "Bangladesh",
          fatherName: student.fatherName ?? "",
          motherName: student.motherName ?? "",
          guardianPhone: student.guardianPhone ?? "",
          birthRegNo: student.birthRegNo ?? "",
          nidNo: student.nidNo ?? "",
        });
      }
    } else if (dialogParam !== "create") {
      setFormData(getInitialState());
    }
  }, [editParam, dialogParam, allStudents]);

  const classOptions = useMemo(
    () =>
      govtPrimaryMode
        ? classes.filter((cls) => GOVT_PRIMARY_ADMISSION_GRADES.has(cls.grade))
        : classes,
    [classes, govtPrimaryMode],
  );

  const closeDialog = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("dialog");
    params.delete("edit");
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const updateField = (key: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleClassChange = (classId: string) => {
    const selectedClass = classOptions.find((cls) => cls.id === classId);
    setFormData((prev) => ({
      ...prev,
      classId,
      section: selectedClass?.section ?? "",
    }));
  };

  async function handleAction() {
    const isEdit = !!editParam;
    const url = isEdit ? `/api/v1/students/${editParam}` : "/api/v1/students";
    const method = isEdit ? "PUT" : "POST";

    startTransition(async () => {
      try {
        const resolvedNameEn =
          formData.studentNameEn.trim() ||
          `${formData.firstName} ${formData.lastName}`.trim();
        const nameParts = splitEnglishName(resolvedNameEn);

        const res = await fetch(url, {
          method,
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            ...formData,
            studentNameEn: resolvedNameEn,
            firstName: nameParts.firstName,
            lastName: nameParts.lastName,
          }),
        });

        const json = await res.json();
        if (!res.ok || json?.error) {
          throw new Error(json?.error?.message ?? "Action failed");
        }

        toast.success(isEdit ? "Student updated" : "Student created");
        closeDialog();
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Error occurred");
      }
    });
  }

  return (
    <>
      <Dialog
        open={dialogParam === "create" || !!editParam}
        onOpenChange={(open) => !open && closeDialog()}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editParam ? "Edit Student" : "Add New Student"}
            </DialogTitle>
            <DialogDescription>
              {editParam
                ? "Update profile details."
                : "Create a new student record."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t("student_name_en")} *</Label>
              <Input
                value={formData.studentNameEn}
                onChange={(e) => updateField("studentNameEn", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("student_name_bn")}</Label>
              <Input
                value={formData.studentNameBn}
                onChange={(e) => updateField("studentNameBn", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("class")}</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={formData.classId}
                onChange={(e) => handleClassChange(e.target.value)}
              >
                <option value="">Unassigned</option>
                {classOptions.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.grade} - {cls.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("roll")}</Label>
              <Input
                value={formData.rollNo}
                onChange={(e) => updateField("rollNo", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("guardian_name")}</Label>
              <Input
                value={formData.guardianName}
                onChange={(e) => updateField("guardianName", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("guardian_phone")} *</Label>
              <Input
                value={formData.guardianPhone}
                onChange={(e) => updateField("guardianPhone", e.target.value)}
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={closeDialog} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={handleAction} disabled={pending}>
              {editParam ? "Save Changes" : "Create Student"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
