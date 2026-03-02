"use client";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { showMacDeleteToast, showMacStatusToast } from "@/components/ui/macos-toast";
import { isGovtPrimaryModeEnabled } from "@/lib/config";
import { convertToCSV, downloadCSV } from "@/lib/csv-export";
import { useT } from "@/lib/i18n/client";
import { formatDate } from "@/lib/utils";
import { exportStudentsToCSV, setStudentStatus } from "@/server/actions/students";
import { Edit3, Plus, ToggleLeft, ToggleRight, Trash2, Download } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

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

type ClassRow = { id: string; name: string; grade: string; section: string };

interface Props {
  students: Student[];
  classes: ClassRow[];
  total: number;
  pages: number;
  currentPage: number;
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-500/10 text-green-600",
  INACTIVE: "bg-red-500/10 text-red-600",
  GRADUATED: "bg-blue-500/10 text-blue-600",
  SUSPENDED: "bg-yellow-500/10 text-yellow-600",
  EXPELLED: "bg-destructive/10 text-destructive",
  TRANSFERRED: "bg-muted text-muted-foreground",
};

type EditState = {
  id: string;
  studentNameBn: string;
  studentNameEn: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: "MALE" | "FEMALE" | "OTHER" | "";
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

type CreateState = {
  studentNameBn: string;
  studentNameEn: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: "MALE" | "FEMALE" | "OTHER" | "";
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
  parentFirstName: string;
  parentLastName: string;
  parentEmail: string;
  parentPhone: string;
  parentRelation: string;
  fatherName: string;
  motherName: string;
  guardianPhone: string;
  birthRegNo: string;
  nidNo: string;
};

function toDateInputValue(value?: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
}

const GOVT_PRIMARY_ADMISSION_GRADES = new Set(["1", "2", "3", "4", "5"]);
const NUMERIC_ROLL_PATTERN = /^\d+$/;

function splitEnglishName(fullName: string) {
  const cleaned = fullName.trim().replace(/\s+/g, " ");
  if (!cleaned) return { firstName: "", lastName: "" };
  const parts = cleaned.split(" ");
  const firstName = parts.shift() ?? "";
  const lastName = parts.join(" ") || ".";
  return { firstName, lastName };
}

function getInitialCreateState(): CreateState {
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
    parentFirstName: "",
    parentLastName: "",
    parentEmail: "",
    parentPhone: "",
    parentRelation: "Guardian",
    fatherName: "",
    motherName: "",
    guardianPhone: "",
    birthRegNo: "",
    nidNo: "",
  };
}

export function StudentsTable({ students, classes, total, pages, currentPage }: Props) {
  const { t } = useT();
  const router = useRouter();
  const govtPrimaryMode = isGovtPrimaryModeEnabled();
  const [pending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState<CreateState>(getInitialCreateState());
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<EditState | null>(null);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  const classOptions = useMemo(
    () =>
      govtPrimaryMode
        ? classes.filter((cls) => GOVT_PRIMARY_ADMISSION_GRADES.has(cls.grade))
        : classes,
    [classes, govtPrimaryMode],
  );

  function openEditor(student: Student) {
    setEditing({
      id: student.id,
      studentNameBn: student.studentNameBn ?? "",
      studentNameEn: student.studentNameEn ?? `${student.firstName} ${student.lastName}`.trim(),
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email ?? "",
      phone: student.phone ?? "",
      dateOfBirth: toDateInputValue(student.dateOfBirth),
      gender: ((student.gender as "MALE" | "FEMALE" | "OTHER" | null) ?? "") as
        | "MALE"
        | "FEMALE"
        | "OTHER"
        | "",
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
      country: student.country ?? "",
      fatherName: student.fatherName ?? "",
      motherName: student.motherName ?? "",
      guardianPhone: student.guardianPhone ?? "",
      birthRegNo: student.birthRegNo ?? "",
      nidNo: student.nidNo ?? "",
    });
  }

  function updateEdit<K extends keyof EditState>(key: K, value: EditState[K]) {
    setEditing((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function updateCreate<K extends keyof CreateState>(key: K, value: CreateState[K]) {
    setCreating((prev) => ({ ...prev, [key]: value }));
  }

  function handleCreateClassChange(classId: string) {
    const selectedClass = classOptions.find((cls) => cls.id === classId);
    setCreating((prev) => ({
      ...prev,
      classId,
      section: selectedClass?.section ?? "",
    }));
  }

  function handleEditClassChange(classId: string) {
    const selectedClass = classOptions.find((cls) => cls.id === classId);
    setEditing((prev) =>
      prev
        ? {
            ...prev,
            classId,
            section: selectedClass?.section ?? "",
          }
        : prev,
    );
  }

  function resetCreateForm() {
    setCreating(getInitialCreateState());
  }

  function getGovtAdmissionValidationMessage(values: {
    studentNameEn: string;
    classId: string;
    section: string;
    rollNo: string;
    birthRegNo: string;
    dateOfBirth: string;
    guardianName: string;
    guardianPhone: string;
  }) {
    if (!values.studentNameEn.trim()) return t("student_name_en_required");
    if (!values.classId.trim()) return t("class_required");
    if (!values.section.trim()) return t("section_required");
    if (!values.rollNo.trim()) return t("roll_required");
    if (!NUMERIC_ROLL_PATTERN.test(values.rollNo.trim())) return t("roll_must_be_numeric");
    if (!values.birthRegNo.trim() && !values.dateOfBirth.trim()) {
      return t("student_birth_or_dob_required");
    }
    if (!values.guardianName.trim()) return t("guardian_name_required");
    if (!values.guardianPhone.trim()) return t("guardian_phone_required");
    return null;
  }

  async function handleCreate() {
    if (govtPrimaryMode) {
      const validationMessage = getGovtAdmissionValidationMessage(creating);
      if (validationMessage) {
        toast.error(validationMessage);
        return;
      }
    } else if (
      !creating.studentNameEn.trim() ||
      !creating.fatherName.trim() ||
      !creating.motherName.trim() ||
      !creating.guardianPhone.trim()
    ) {
      toast.error(t("student_required_identity_fields"));
      return;
    }

    startTransition(async () => {
      try {
        const resolvedNameEn =
          creating.studentNameEn.trim() ||
          `${creating.firstName} ${creating.lastName}`.trim();
        const nameParts = splitEnglishName(resolvedNameEn);
        const res = await fetch("/api/v1/students", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            studentNameBn: creating.studentNameBn.trim(),
            studentNameEn: resolvedNameEn,
            firstName: nameParts.firstName,
            lastName: nameParts.lastName,
            email: creating.email.trim(),
            phone: creating.phone.trim(),
            dateOfBirth: creating.dateOfBirth || undefined,
            gender: creating.gender || undefined,
            classId: creating.classId || undefined,
            rollNo: creating.rollNo.trim(),
            guardianName: creating.guardianName.trim(),
            address: creating.address.trim(),
            village: creating.village.trim(),
            ward: creating.ward.trim(),
            upazila: creating.upazila.trim(),
            district: creating.district.trim(),
            city: creating.city.trim(),
            country: creating.country.trim(),
            parentFirstName: creating.parentFirstName.trim(),
            parentLastName: creating.parentLastName.trim(),
            parentEmail: creating.parentEmail.trim(),
            parentPhone: creating.parentPhone.trim(),
            parentRelation: creating.parentRelation.trim(),
            fatherName: creating.fatherName.trim(),
            motherName: creating.motherName.trim(),
            guardianPhone: creating.guardianPhone.trim(),
            birthRegNo: creating.birthRegNo.trim(),
            nidNo: creating.nidNo.trim(),
          }),
        });

        const json = await res.json();
        if (!res.ok || json?.error) {
          throw new Error(json?.error?.message ?? "Failed to create student");
        }

        toast.success("Student created");
        const studentCredential = json?.data?.studentCredential;
        const parentCredential = json?.data?.parentCredential;
        if (studentCredential) {
          toast.info(
            `Student login: ${studentCredential.email} / ${studentCredential.password}`,
            { duration: 12000 },
          );
        }
        if (parentCredential) {
          toast.info(
            `Parent login: ${parentCredential.email} / ${parentCredential.password}`,
            { duration: 12000 },
          );
        }
        setCreateOpen(false);
        resetCreateForm();
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to create student");
      }
    });
  }

  async function handleSave() {
    if (!editing) return;
    if (govtPrimaryMode) {
      const validationMessage = getGovtAdmissionValidationMessage(editing);
      if (validationMessage) {
        toast.error(validationMessage);
        return;
      }
    } else if (
      !editing.studentNameEn.trim() ||
      !editing.fatherName.trim() ||
      !editing.motherName.trim() ||
      !editing.guardianPhone.trim()
    ) {
      toast.error(t("student_required_identity_fields"));
      return;
    }

    startTransition(async () => {
      try {
        const resolvedNameEn =
          editing.studentNameEn.trim() ||
          `${editing.firstName} ${editing.lastName}`.trim();
        const nameParts = splitEnglishName(resolvedNameEn);
        const res = await fetch(`/api/v1/students/${editing.id}`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            studentNameBn: editing.studentNameBn.trim(),
            studentNameEn: resolvedNameEn,
            firstName: nameParts.firstName,
            lastName: nameParts.lastName,
            email: editing.email,
            phone: editing.phone,
            dateOfBirth: editing.dateOfBirth || undefined,
            gender: editing.gender || undefined,
            classId: editing.classId || undefined,
            rollNo: editing.rollNo.trim(),
            guardianName: editing.guardianName.trim(),
            address: editing.address.trim(),
            village: editing.village.trim(),
            ward: editing.ward.trim(),
            upazila: editing.upazila.trim(),
            district: editing.district.trim(),
            city: editing.city.trim(),
            country: editing.country.trim(),
            fatherName: editing.fatherName.trim(),
            motherName: editing.motherName.trim(),
            guardianPhone: editing.guardianPhone.trim(),
            birthRegNo: editing.birthRegNo.trim(),
            nidNo: editing.nidNo.trim(),
          }),
        });

        const json = await res.json();
        if (!res.ok || json?.error) {
          throw new Error(json?.error?.message ?? "Failed to update student");
        }

        toast.success("Student updated");
        setEditing(null);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to update student");
      }
    });
  }

  async function handleDelete(student: Student) {
    const confirmed = window.confirm(
      `Delete ${student.firstName} ${student.lastName}? This will deactivate the student record.`,
    );

    if (!confirmed) return;

    startTransition(async () => {
      try {
        const res = await fetch(`/api/v1/students/${student.id}`, {
          method: "DELETE",
        });

        const json = await res.json();
        if (!res.ok || json?.error) {
          throw new Error(json?.error?.message ?? "Failed to delete student");
        }

        showMacDeleteToast({
          entity: "Student",
          name: `${student.firstName} ${student.lastName}`,
        });
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to delete student");
      }
    });
  }

  function handleToggleActive(student: Student) {
    const targetStatus = student.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    startTransition(async () => {
      const res = await setStudentStatus(
        student.id,
        targetStatus as "ACTIVE" | "INACTIVE",
      );
      if (res.success) {
        showMacStatusToast({
          entity: "Student",
          status: targetStatus,
          name: `${student.firstName} ${student.lastName}`,
        });
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  async function handleExportCSV() {
    startTransition(async () => {
      try {
        const result = await exportStudentsToCSV({});
        if (!result.success || !result.data) {
          toast.error(result.error || "Failed to export students");
          return;
        }

        const headers = [
          "studentId",
          "firstName",
          "lastName",
          "email",
          "phone",
          "dateOfBirth",
          "gender",
          "class",
          "status",
          "joinedDate",
        ] as const;
        const headerLabels = [
          "Student ID",
          "First Name",
          "Last Name",
          "Email",
          "Phone",
          "Date of Birth",
          "Gender",
          "Class",
          "Status",
          "Joined Date",
        ];

        const csv = convertToCSV(result.data, headers, headerLabels);
        const timestamp = new Date().toISOString().slice(0, 10);
        downloadCSV(csv, `students_${timestamp}.csv`);
        toast.success(`Exported ${result.data.length} students`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Export failed");
      }
    });
  }

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          <p className="text-sm text-muted-foreground">Showing {students.length} of {total}</p>
          <p className="text-sm text-muted-foreground">Page {currentPage} / {Math.max(pages, 1)}</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" size="sm" onClick={handleExportCSV} disabled={pending || students.length === 0} variant="outline">
            <Download className="mr-1.5 h-4 w-4" />
            Export CSV
          </Button>
          <Button type="button" size="sm" onClick={() => setCreateOpen(true)} disabled={pending}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add Student
          </Button>
        </div>
      </div>
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <table className="table-dense w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="text-muted-foreground">
              <th className="whitespace-nowrap">Student</th>
              <th className="whitespace-nowrap">ID</th>
              <th className="whitespace-nowrap">Class</th>
              <th>Email</th>
              <th className="whitespace-nowrap">Status</th>
              <th className="whitespace-nowrap">Joined</th>
              <th className="whitespace-nowrap text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {students.length ? (
              students.map((student) => {
                const statusKey = student.status.trim().toUpperCase();
                const statusLabel = statusKey.replace("_", " ");

                return (
                  <tr key={student.id}>
                    <td className="font-medium">
                      <Link href={`/dashboard/students/${student.id}`} className="hover:underline">
                        {student.firstName} {student.lastName}
                      </Link>
                    </td>
                    <td>{student.studentId}</td>
                    <td>{student.class?.name ?? "-"}</td>
                    <td>{student.email ?? "-"}</td>
                    <td>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          STATUS_COLORS[statusKey] ?? "bg-muted text-muted-foreground"
                        }`}
                      >
                        {statusLabel}
                      </span>
                    </td>
                    <td>{student.createdAt ? formatDate(student.createdAt) : "-"}</td>
                    <td>
                      <div className="flex items-center justify-end gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => openEditor(student)} disabled={pending}>
                          <Edit3 className="mr-1 h-3.5 w-3.5" /> Edit
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleActive(student)}
                          disabled={pending}
                        >
                          {student.status === "ACTIVE" ? (
                            <>
                              <ToggleRight className="mr-1 h-3.5 w-3.5 text-green-600" />
                              Inactive
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="mr-1 h-3.5 w-3.5 text-muted-foreground" />
                              Active
                            </>
                          )}
                        </Button>
                        <Button type="button" size="sm" variant="destructive" onClick={() => handleDelete(student)} disabled={pending}>
                          <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td className="text-muted-foreground" colSpan={7}>
                  No students found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) resetCreateForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Student</DialogTitle>
            <DialogDescription>Create a student profile and optional guardian details.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="create-studentNameEn">{t("student_name_en")} *</Label>
                <Input id="create-studentNameEn" value={creating.studentNameEn} onChange={(e) => updateCreate("studentNameEn", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="create-studentNameBn">{t("student_name_bn")} ({t("optional")})</Label>
                <Input id="create-studentNameBn" value={creating.studentNameBn} onChange={(e) => updateCreate("studentNameBn", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="create-email">Email</Label>
                <Input id="create-email" type="email" value={creating.email} onChange={(e) => updateCreate("email", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="create-phone">Phone</Label>
                <Input id="create-phone" value={creating.phone} onChange={(e) => updateCreate("phone", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="create-birthRegNo">{t("birth_reg_no")}</Label>
                <Input id="create-birthRegNo" value={creating.birthRegNo} onChange={(e) => updateCreate("birthRegNo", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="create-dob">{t("date_of_birth")}</Label>
                <Input id="create-dob" type="date" value={creating.dateOfBirth} onChange={(e) => updateCreate("dateOfBirth", e.target.value)} />
              </div>
              {govtPrimaryMode ? (
                <p className="sm:col-span-2 text-xs text-muted-foreground">
                  {t("student_birth_or_dob_hint")}
                </p>
              ) : null}
              <div className="space-y-1.5">
                <Label htmlFor="create-gender">{t("gender")}</Label>
                <select
                  id="create-gender"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={creating.gender}
                  onChange={(e) => updateCreate("gender", e.target.value as CreateState["gender"])}
                >
                  <option value="">{t("select_gender")}</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="create-class">{t("class")}{govtPrimaryMode ? " *" : ""}</Label>
                <select
                  id="create-class"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={creating.classId}
                  onChange={(e) => handleCreateClassChange(e.target.value)}
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
                <Label htmlFor="create-section">{t("section")}{govtPrimaryMode ? " *" : ""}</Label>
                <Input id="create-section" value={creating.section} readOnly />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="create-roll">{t("roll")}{govtPrimaryMode ? " *" : ""}</Label>
                <Input id="create-roll" inputMode="numeric" pattern="[0-9]*" value={creating.rollNo} onChange={(e) => updateCreate("rollNo", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="create-guardianName">{t("guardian_name")}{govtPrimaryMode ? " *" : ""}</Label>
                <Input id="create-guardianName" value={creating.guardianName} onChange={(e) => updateCreate("guardianName", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="create-guardianPhone">{t("guardian_phone")} *</Label>
                <Input id="create-guardianPhone" value={creating.guardianPhone} onChange={(e) => updateCreate("guardianPhone", e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="create-fatherName">{t("father_name")}{govtPrimaryMode ? ` (${t("optional")})` : " *"}</Label>
                <Input id="create-fatherName" value={creating.fatherName} onChange={(e) => updateCreate("fatherName", e.target.value)} required={!govtPrimaryMode} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="create-motherName">{t("mother_name")}{govtPrimaryMode ? ` (${t("optional")})` : " *"}</Label>
                <Input id="create-motherName" value={creating.motherName} onChange={(e) => updateCreate("motherName", e.target.value)} required={!govtPrimaryMode} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="create-village">{t("village")}</Label>
                <Input id="create-village" value={creating.village} onChange={(e) => updateCreate("village", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="create-ward">{t("ward")}</Label>
                <Input id="create-ward" value={creating.ward} onChange={(e) => updateCreate("ward", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="create-upazila">{t("upazila")}</Label>
                <Input id="create-upazila" value={creating.upazila} onChange={(e) => updateCreate("upazila", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="create-district">{t("district")}</Label>
                <Input id="create-district" value={creating.district} onChange={(e) => updateCreate("district", e.target.value)} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="create-address">{t("address")}</Label>
                <Input id="create-address" value={creating.address} onChange={(e) => updateCreate("address", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="create-city">City</Label>
                <Input id="create-city" value={creating.city} onChange={(e) => updateCreate("city", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="create-country">Country</Label>
                <Input id="create-country" value={creating.country} onChange={(e) => updateCreate("country", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="create-nidNo">{t("nid_no")} ({t("optional")})</Label>
                <Input id="create-nidNo" value={creating.nidNo} onChange={(e) => updateCreate("nidNo", e.target.value)} />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} disabled={pending}>
                Cancel
              </Button>
              <Button type="button" onClick={handleCreate} disabled={pending}>
                Create Student
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
            <DialogDescription>Update student profile and class assignment.</DialogDescription>
          </DialogHeader>

          {editing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-studentNameEn">{t("student_name_en")} *</Label>
                  <Input id="edit-studentNameEn" value={editing.studentNameEn} onChange={(e) => updateEdit("studentNameEn", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-studentNameBn">{t("student_name_bn")} ({t("optional")})</Label>
                  <Input id="edit-studentNameBn" value={editing.studentNameBn} onChange={(e) => updateEdit("studentNameBn", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input id="edit-email" type="email" value={editing.email} onChange={(e) => updateEdit("email", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-phone">Phone</Label>
                  <Input id="edit-phone" value={editing.phone} onChange={(e) => updateEdit("phone", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-birthRegNo">{t("birth_reg_no")}</Label>
                  <Input id="edit-birthRegNo" value={editing.birthRegNo} onChange={(e) => updateEdit("birthRegNo", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-dob">{t("date_of_birth")}</Label>
                  <Input id="edit-dob" type="date" value={editing.dateOfBirth} onChange={(e) => updateEdit("dateOfBirth", e.target.value)} />
                </div>
                {govtPrimaryMode ? (
                  <p className="sm:col-span-2 text-xs text-muted-foreground">
                    {t("student_birth_or_dob_hint")}
                  </p>
                ) : null}
                <div className="space-y-1.5">
                  <Label htmlFor="edit-gender">{t("gender")}</Label>
                  <select
                    id="edit-gender"
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={editing.gender}
                    onChange={(e) => updateEdit("gender", e.target.value as EditState["gender"])}
                  >
                    <option value="">{t("select_gender")}</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-class">{t("class")}{govtPrimaryMode ? " *" : ""}</Label>
                  <select
                    id="edit-class"
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={editing.classId}
                    onChange={(e) => handleEditClassChange(e.target.value)}
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
                  <Label htmlFor="edit-section">{t("section")}{govtPrimaryMode ? " *" : ""}</Label>
                  <Input id="edit-section" value={editing.section} readOnly />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-roll">{t("roll")}{govtPrimaryMode ? " *" : ""}</Label>
                  <Input id="edit-roll" inputMode="numeric" pattern="[0-9]*" value={editing.rollNo} onChange={(e) => updateEdit("rollNo", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-guardianName">{t("guardian_name")}{govtPrimaryMode ? " *" : ""}</Label>
                  <Input id="edit-guardianName" value={editing.guardianName} onChange={(e) => updateEdit("guardianName", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-guardianPhone">{t("guardian_phone")} *</Label>
                  <Input id="edit-guardianPhone" value={editing.guardianPhone} onChange={(e) => updateEdit("guardianPhone", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-fatherName">{t("father_name")}{govtPrimaryMode ? ` (${t("optional")})` : " *"}</Label>
                  <Input id="edit-fatherName" value={editing.fatherName} onChange={(e) => updateEdit("fatherName", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-motherName">{t("mother_name")}{govtPrimaryMode ? ` (${t("optional")})` : " *"}</Label>
                  <Input id="edit-motherName" value={editing.motherName} onChange={(e) => updateEdit("motherName", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-village">{t("village")}</Label>
                  <Input id="edit-village" value={editing.village} onChange={(e) => updateEdit("village", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-ward">{t("ward")}</Label>
                  <Input id="edit-ward" value={editing.ward} onChange={(e) => updateEdit("ward", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-upazila">{t("upazila")}</Label>
                  <Input id="edit-upazila" value={editing.upazila} onChange={(e) => updateEdit("upazila", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-district">{t("district")}</Label>
                  <Input id="edit-district" value={editing.district} onChange={(e) => updateEdit("district", e.target.value)} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="edit-address">{t("address")}</Label>
                  <Input id="edit-address" value={editing.address} onChange={(e) => updateEdit("address", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-city">City</Label>
                  <Input id="edit-city" value={editing.city} onChange={(e) => updateEdit("city", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-country">Country</Label>
                  <Input id="edit-country" value={editing.country} onChange={(e) => updateEdit("country", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-nidNo">{t("nid_no")} ({t("optional")})</Label>
                  <Input id="edit-nidNo" value={editing.nidNo} onChange={(e) => updateEdit("nidNo", e.target.value)} />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditing(null)} disabled={pending}>
                  Cancel
                </Button>
                <Button type="button" onClick={handleSave} disabled={pending}>
                  Save Changes
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}
