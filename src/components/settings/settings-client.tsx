// src/components/settings/settings-client.tsx
"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Save,
  Building2,
  GraduationCap,
  ShieldCheck,
  RefreshCw,
  CreditCard,
  Plus,
  Database,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  updateInstitutionProfile,
  updateInstitutionSettings,
  createFeeCategory,
  updateFeeCategory,
  loadGovtPrimaryDemoData,
  type FeeCategoryData,
  type InstitutionProfileData,
  type InstitutionSettingsData,
} from "@/server/actions/settings";
import { isGovtPrimaryModeEnabled } from "@/lib/config";

type Institution = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  timezone: string;
  currency: string;
  plan: string;
  planExpiry: Date | null;
  logo: string | null;
} | null;

type SettingsRow = {
  academicYear: string;
  termsPerYear: number;
  workingDays: number[];
  emailNotifs: boolean;
  smsNotifs: boolean;
  lateFeePercent: number;
  gracePeriodDays: number;
  signatoryName: string | null;
  signatoryTitle: string | null;
  coSignatoryName: string | null;
  coSignatoryTitle: string | null;
  certificateFooter: string | null;
  certificateLogoUrl: string | null;
  publicReportsEnabled: boolean;
  publicReportsDescription: string | null;
} | null;

type AccessRequestRow = {
  id: string;
  requestedScope: "TEACHER" | "STUDENT" | "PARENT";
  status: "PENDING" | "APPROVED" | "REJECTED";
  fullName: string;
  email: string | null;
  phone: string | null;
  requestedAt: string;
  rejectionReason: string | null;
};

type FeeCategoryRow = {
  id: string;
  name: string;
  feeType:
    | "TUITION"
    | "TRANSPORT"
    | "LIBRARY"
    | "LABORATORY"
    | "SPORTS"
    | "EXAMINATION"
    | "UNIFORM"
    | "MISC";
  isPreset: boolean;
};

interface Props {
  institution: Institution;
  settings: SettingsRow;
  feeCategories: FeeCategoryRow[];
  viewerRole: string;
}

const PLAN_COLORS: Record<string, string> = {
  STARTER: "bg-muted text-muted-foreground",
  PROFESSIONAL: "bg-blue-500/10 text-blue-600",
  ENTERPRISE: "bg-purple-500/10 text-purple-600",
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const FEE_TYPE_OPTIONS: FeeCategoryRow["feeType"][] = [
  "TUITION",
  "EXAMINATION",
  "MISC",
  "SPORTS",
  "LIBRARY",
  "TRANSPORT",
  "LABORATORY",
  "UNIFORM",
];

function ProfileTab({
  institution,
  canEdit,
}: {
  institution: Institution;
  canEdit: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<InstitutionProfileData>({
    name: institution?.name ?? "",
    email: institution?.email ?? "",
    phone: institution?.phone ?? "",
    website: institution?.website ?? "",
    address: institution?.address ?? "",
    city: institution?.city ?? "",
    country: institution?.country ?? "Bangladesh",
    timezone: institution?.timezone ?? "Asia/Dhaka",
    currency: institution?.currency ?? "BDT",
  });
  const set = (k: keyof InstitutionProfileData, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      toast.error("Only SUPER_ADMIN / ADMIN can update institution profile.");
      return;
    }
    startTransition(async () => {
      const res = await updateInstitutionProfile(form);
      if (res.success) toast.success("Institution profile updated");
      else toast.error(res.error);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <h2 className="font-semibold">Institution Profile</h2>
        <span
          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${PLAN_COLORS[institution?.plan ?? "STARTER"]}`}
        >
          {institution?.plan ?? "STARTER"}
        </span>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="inst-name">Institution Name *</Label>
        <Input
          id="inst-name"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          required
          disabled={!canEdit}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="inst-email">Contact Email</Label>
          <Input
            id="inst-email"
            type="email"
            value={form.email ?? ""}
            onChange={(e) => set("email", e.target.value)}
            disabled={!canEdit}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="inst-phone">Phone</Label>
          <Input
            id="inst-phone"
            value={form.phone ?? ""}
            onChange={(e) => set("phone", e.target.value)}
            disabled={!canEdit}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="inst-web">Website</Label>
        <Input
          id="inst-web"
          type="url"
          value={form.website ?? ""}
          onChange={(e) => set("website", e.target.value)}
          placeholder="https://..."
          disabled={!canEdit}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="inst-addr">Address</Label>
        <Input
          id="inst-addr"
          value={form.address ?? ""}
          onChange={(e) => set("address", e.target.value)}
          disabled={!canEdit}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="inst-city">City</Label>
          <Input
            id="inst-city"
            value={form.city ?? ""}
            onChange={(e) => set("city", e.target.value)}
            disabled={!canEdit}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="inst-country">Country</Label>
          <Input
            id="inst-country"
            value={form.country ?? ""}
            onChange={(e) => set("country", e.target.value)}
            placeholder="Bangladesh"
            disabled={!canEdit}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Timezone</Label>
          <Select
            value={form.timezone}
            onValueChange={(v) => set("timezone", v)}
            disabled={!canEdit}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["Asia/Dhaka", "Asia/Kolkata", "Asia/Dubai", "UTC"].map((tz) => (
                <SelectItem key={tz} value={tz}>
                  {tz}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Currency</Label>
          <Select
            value={form.currency}
            onValueChange={(v) => set("currency", v)}
            disabled={!canEdit}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["BDT", "USD", "INR", "AED", "EUR"].map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button
        type="submit"
        disabled={pending || !canEdit}
        className="w-full gap-2 sm:w-auto"
      >
        <Save className="h-4 w-4" />
        {pending ? "Saving..." : "Save Profile"}
      </Button>
    </form>
  );
}

function AcademicTab({
  settings,
  canEdit,
}: {
  settings: SettingsRow;
  canEdit: boolean;
}) {
  const govtPrimaryMode = isGovtPrimaryModeEnabled();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<InstitutionSettingsData>({
    academicYear: settings?.academicYear ?? "2024-2025",
    termsPerYear: settings?.termsPerYear ?? 3,
    workingDays: settings?.workingDays ?? [1, 2, 3, 4, 5],
    emailNotifs: settings?.emailNotifs ?? true,
    smsNotifs: settings?.smsNotifs ?? false,
    lateFeePercent: settings?.lateFeePercent ?? 0,
    gracePeriodDays: settings?.gracePeriodDays ?? 7,
    signatoryName: settings?.signatoryName ?? "",
    signatoryTitle: settings?.signatoryTitle ?? "",
    coSignatoryName: settings?.coSignatoryName ?? "",
    coSignatoryTitle: settings?.coSignatoryTitle ?? "",
    certificateFooter: settings?.certificateFooter ?? "",
    certificateLogoUrl: settings?.certificateLogoUrl ?? "",
    publicReportsEnabled: settings?.publicReportsEnabled ?? false,
    publicReportsDescription: settings?.publicReportsDescription ?? "",
  } as InstitutionSettingsData & {
    publicReportsEnabled: boolean;
    publicReportsDescription: string;
  });
  const set = (k: keyof typeof form, v: unknown) =>
    setForm((f) => ({ ...f, [k]: v }));
  const termOptions = (() => {
    const baseOptions = govtPrimaryMode ? [2, 3] : [1, 2, 3, 4];
    if (!baseOptions.includes(form.termsPerYear)) {
      return [...baseOptions, form.termsPerYear].sort((a, b) => a - b);
    }
    return baseOptions;
  })();

  const toggleDay = (day: number) => {
    const days = form.workingDays as number[];
    set(
      "workingDays",
      days.includes(day)
        ? days.filter((d) => d !== day)
        : [...days, day].sort(),
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      toast.error("Only SUPER_ADMIN / ADMIN can update institution settings.");
      return;
    }

    startTransition(async () => {
      const res = await updateInstitutionSettings(
        form as InstitutionSettingsData,
      );
      if (res.success) toast.success("Settings updated");
      else toast.error(res.error);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <div>
        <h2 className="font-semibold mb-4">Academic Settings</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="s-year">Academic Year</Label>
            <Input
              id="s-year"
              value={form.academicYear}
              onChange={(e) => set("academicYear", e.target.value)}
              placeholder="2024-2025"
              disabled={!canEdit}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-terms">
              {govtPrimaryMode ? "Assessment Terms Per Year" : "Terms Per Year"}
            </Label>
            <Select
              value={String(form.termsPerYear)}
              onValueChange={(v) => set("termsPerYear", Number(v))}
              disabled={!canEdit}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {termOptions.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} term{n > 1 ? "s" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {govtPrimaryMode ? (
              <p className="text-xs text-muted-foreground">
                Govt Primary mode keeps term setup focused on primary-school
                assessment cycles.
              </p>
            ) : null}
          </div>
        </div>
        <div className="space-y-1.5 mt-4">
          <Label>Working Days</Label>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((d, i) => {
              const dayNum = i + 1;
              const active = (form.workingDays as number[]).includes(dayNum);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDay(dayNum)}
                  disabled={!canEdit}
                  className={`w-10 h-10 rounded-full text-xs font-medium border transition-all ${
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:border-muted-foreground"
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="border-t border-border pt-5">
        <h2 className="font-semibold mb-4">Finance Settings</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="s-latefee">Late Fee %</Label>
            <Input
              id="s-latefee"
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={form.lateFeePercent}
              onChange={(e) => set("lateFeePercent", Number(e.target.value))}
              disabled={!canEdit}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-grace">Grace Period (days)</Label>
            <Input
              id="s-grace"
              type="number"
              min={0}
              value={form.gracePeriodDays}
              onChange={(e) => set("gracePeriodDays", Number(e.target.value))}
              disabled={!canEdit}
            />
          </div>
        </div>
      </div>

      <div className="border-t border-border pt-5">
        <h2 className="font-semibold mb-4">Notifications</h2>
        <div className="space-y-3">
          {[
            {
              key: "emailNotifs" as const,
              label: "Email Notifications",
              desc: "Send notifications via email",
            },
            {
              key: "smsNotifs" as const,
              label: "SMS Notifications",
              desc: "Send notifications via SMS",
            },
          ].map(({ key, label, desc }) => (
            <div
              key={key}
              className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
            >
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <button
                type="button"
                onClick={() => canEdit && set(key, !form[key])}
                disabled={!canEdit}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  form[key] ? "bg-primary" : "bg-muted"
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form[key] ? "translate-x-6" : "translate-x-1"}`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-border pt-5">
        <h2 className="font-semibold mb-4">Certificate Signatures</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="sig-name">Signatory Name</Label>
            <Input
              id="sig-name"
              value={form.signatoryName ?? ""}
              onChange={(e) => set("signatoryName", e.target.value)}
              placeholder="Md. Rahman"
              disabled={!canEdit}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sig-title">Signatory Title</Label>
            <Input
              id="sig-title"
              value={form.signatoryTitle ?? ""}
              onChange={(e) => set("signatoryTitle", e.target.value)}
              placeholder="Principal"
              disabled={!canEdit}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cosig-name">Co-signatory Name</Label>
            <Input
              id="cosig-name"
              value={form.coSignatoryName ?? ""}
              onChange={(e) => set("coSignatoryName", e.target.value)}
              placeholder="Ayesha Akter"
              disabled={!canEdit}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cosig-title">Co-signatory Title</Label>
            <Input
              id="cosig-title"
              value={form.coSignatoryTitle ?? ""}
              onChange={(e) => set("coSignatoryTitle", e.target.value)}
              placeholder="Class Teacher"
              disabled={!canEdit}
            />
          </div>
        </div>
        <div className="space-y-1.5 mt-4">
          <Label htmlFor="cert-logo">Certificate Logo URL</Label>
          <Input
            id="cert-logo"
            value={form.certificateLogoUrl ?? ""}
            onChange={(e) => set("certificateLogoUrl", e.target.value)}
            placeholder="https://..."
            disabled={!canEdit}
          />
        </div>
        <div className="space-y-1.5 mt-4">
          <Label htmlFor="cert-footer">Certificate Footer Note</Label>
          <Input
            id="cert-footer"
            value={form.certificateFooter ?? ""}
            onChange={(e) => set("certificateFooter", e.target.value)}
            placeholder="Verified by BD-GPS Academy"
            disabled={!canEdit}
          />
        </div>
      </div>

      <div className="border-t border-border pt-5">
        <h2 className="font-semibold mb-4">Public Reports (Guest Read-only)</h2>
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
          <div>
            <p className="text-sm font-medium">Enable Public School Reports</p>
            <p className="text-xs text-muted-foreground">
              Guests can view aggregated school metrics only.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              canEdit && set("publicReportsEnabled", !form.publicReportsEnabled)
            }
            disabled={!canEdit}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              form.publicReportsEnabled ? "bg-primary" : "bg-muted"
            } disabled:cursor-not-allowed disabled:opacity-60`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.publicReportsEnabled ? "translate-x-6" : "translate-x-1"}`}
            />
          </button>
        </div>
        <div className="space-y-1.5 mt-4">
          <Label htmlFor="public-description">Public Page Description</Label>
          <Input
            id="public-description"
            value={(form.publicReportsDescription as string) ?? ""}
            onChange={(e) => set("publicReportsDescription", e.target.value)}
            placeholder="Short message shown on public school page"
            disabled={!canEdit}
          />
        </div>
      </div>

      <Button
        type="submit"
        disabled={pending || !canEdit}
        className="w-full gap-2 sm:w-auto"
      >
        <Save className="h-4 w-4" />
        {pending ? "Saving..." : "Save Settings"}
      </Button>
    </form>
  );
}

function FeeCategoriesTab({
  initialRows,
  canEdit,
  showDemoLoader,
}: {
  initialRows: FeeCategoryRow[];
  canEdit: boolean;
  showDemoLoader: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [rows, setRows] = useState<FeeCategoryRow[]>(initialRows);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<FeeCategoryRow["feeType"]>("MISC");

  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  const patchRow = (
    id: string,
    patch: Partial<Pick<FeeCategoryRow, "name" | "feeType">>,
  ) => {
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  };

  const handleCreate = () => {
    if (!canEdit) {
      toast.error("Only SUPER_ADMIN / ADMIN can manage fee categories.");
      return;
    }
    const trimmed = newName.trim();
    if (!trimmed) {
      toast.error("Category name is required.");
      return;
    }

    startTransition(async () => {
      const payload: FeeCategoryData = {
        name: trimmed,
        feeType: newType,
      };
      const res = await createFeeCategory(payload);
      if (!res.success || !res.data) {
        toast.error(res.error ?? "Failed to create fee category.");
        return;
      }

      setRows((prev) => [
        ...prev,
        {
          id: res.data.id,
          name: res.data.name,
          feeType: res.data.feeType as FeeCategoryRow["feeType"],
          isPreset: false,
        },
      ]);
      setNewName("");
      setNewType("MISC");
      toast.success("Fee category added");
    });
  };

  const handleSave = (row: FeeCategoryRow) => {
    if (!canEdit) {
      toast.error("Only SUPER_ADMIN / ADMIN can manage fee categories.");
      return;
    }
    const trimmed = row.name.trim();
    if (!trimmed) {
      toast.error("Category name is required.");
      return;
    }

    startTransition(async () => {
      const payload: FeeCategoryData = {
        name: trimmed,
        feeType: row.feeType,
      };
      const res = await updateFeeCategory(row.id, payload);
      if (!res.success || !res.data) {
        toast.error(res.error ?? "Failed to update fee category.");
        return;
      }

      patchRow(row.id, {
        name: res.data.name,
        feeType: res.data.feeType as FeeCategoryRow["feeType"],
      });
      toast.success("Fee category updated");
    });
  };

  const handleLoadGovtPrimaryDemo = () => {
    if (!canEdit) {
      toast.error("Only SUPER_ADMIN / ADMIN can load demo data.");
      return;
    }

    startTransition(async () => {
      const res = await loadGovtPrimaryDemoData();
      if (!res.success || !res.data) {
        toast.error(res.error ?? "Failed to load demo data.");
        return;
      }

      toast.success(
        `Demo data loaded: ${res.data.classes} classes, ${res.data.studentsCreated} students created (${res.data.studentsUpdated} updated).`,
      );
    });
  };

  return (
    <div className="max-w-3xl space-y-5">
      <div className="space-y-1">
        <h2 className="font-semibold">Fee Categories</h2>
        <p className="text-xs text-muted-foreground">
          Bangladesh presets are initialized once per institution. You can
          rename and adjust type anytime.
        </p>
      </div>

      {showDemoLoader ? (
        <div className="rounded-lg border border-border p-3">
          <p className="mb-1 text-sm font-medium">Development Tools</p>
          <p className="mb-3 text-xs text-muted-foreground">
            Load Govt Primary demo setup for the current school: Class 3/5,
            sections A/B, students, routine, notice, and one attendance day.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={handleLoadGovtPrimaryDemo}
            disabled={!canEdit || pending}
          >
            <Database className="mr-1.5 h-4 w-4" />
            Load Govt Primary Demo Data
          </Button>
        </div>
      ) : null}

      <div className="rounded-lg border border-border p-3">
        <p className="mb-3 text-xs font-medium text-muted-foreground">
          Add Category
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_180px_auto]">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Development Fee"
            disabled={!canEdit || pending}
          />
          <Select
            value={newType}
            onValueChange={(v) => setNewType(v as FeeCategoryRow["feeType"])}
            disabled={!canEdit || pending}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FEE_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            onClick={handleCreate}
            disabled={!canEdit || pending}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Add
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {rows.length === 0 ? (
          <p className="rounded-lg border border-border p-3 text-sm text-muted-foreground">
            No fee categories configured yet.
          </p>
        ) : (
          rows.map((row) => (
            <div key={row.id} className="rounded-lg border border-border p-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_180px_auto]">
                <Input
                  value={row.name}
                  onChange={(e) => patchRow(row.id, { name: e.target.value })}
                  disabled={!canEdit || pending}
                />
                <Select
                  value={row.feeType}
                  onValueChange={(v) =>
                    patchRow(row.id, {
                      feeType: v as FeeCategoryRow["feeType"],
                    })
                  }
                  disabled={!canEdit || pending}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FEE_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleSave(row)}
                  disabled={!canEdit || pending}
                >
                  Save
                </Button>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                {row.isPreset ? "Preset category" : "Custom category"}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function AccessRequestsTab({ canReview }: { canReview: boolean }) {
  const [rows, setRows] = useState<AccessRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("ALL");
  const [scope, setScope] = useState<string>("ALL");
  const [query, setQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  async function load() {
    if (!canReview) return;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status !== "ALL") params.set("status", status);
      if (scope !== "ALL") params.set("scope", scope);
      if (query.trim()) params.set("q", query.trim());
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);
      params.set("limit", "200");

      const res = await fetch(
        `/api/v1/security/access-requests?${params.toString()}`,
      );
      const json = await res.json();
      if (!res.ok || json?.error) {
        throw new Error(
          json?.error?.message || "Failed to load access requests",
        );
      }
      setRows((json?.data ?? []) as AccessRequestRow[]);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load access requests",
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredRows = useMemo(() => rows, [rows]);

  async function review(id: string, action: "approve" | "reject") {
    if (!canReview) return;

    setPendingId(id);
    try {
      let rejectionReason = "";
      if (action === "reject") {
        rejectionReason =
          window.prompt(
            "Reason for rejection",
            "Details do not match institution registry",
          ) || "";
      }

      const res = await fetch(
        `/api/v1/security/access-requests/${id}/${action}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body:
            action === "reject"
              ? JSON.stringify({ rejectionReason })
              : undefined,
        },
      );
      const json = await res.json();

      if (!res.ok || json?.error) {
        throw new Error(json?.error?.message || `Failed to ${action} request`);
      }

      toast.success(`Request ${action}d`);
      await load();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : `Failed to ${action} request`,
      );
    } finally {
      setPendingId(null);
    }
  }

  if (!canReview) {
    return (
      <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
        Access request review is available for SUPER_ADMIN, ADMIN, and
        PRINCIPAL.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <Label>Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-full min-w-0 sm:w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label>Scope</Label>
          <Select value={scope} onValueChange={setScope}>
            <SelectTrigger className="w-full min-w-0 sm:w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              <SelectItem value="TEACHER">Teacher</SelectItem>
              <SelectItem value="STUDENT">Student</SelectItem>
              <SelectItem value="PARENT">Parent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1 min-w-0 flex-[1_1_220px] sm:min-w-[200px]">
          <Label>Search</Label>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, email, phone"
          />
        </div>

        <div className="space-y-1">
          <Label>From</Label>
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-full min-w-0 sm:w-[165px]"
          />
        </div>

        <div className="space-y-1">
          <Label>To</Label>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-full min-w-0 sm:w-[165px]"
          />
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => void load()}
          disabled={loading}
        >
          <RefreshCw
            className={`mr-1 h-4 w-4 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>

        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setStatus("ALL");
            setScope("ALL");
            setQuery("");
            setFromDate("");
            setToDate("");
          }}
        >
          Clear filters
        </Button>
      </div>

      <div className="space-y-2">
        {loading ? (
          <p className="text-sm text-muted-foreground">
            Loading access requests...
          </p>
        ) : filteredRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No access requests found.
          </p>
        ) : (
          filteredRows.map((row) => (
            <div key={row.id} className="rounded-lg border border-border p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-sm">{row.fullName}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.requestedScope} • {row.email ?? "no-email"} •{" "}
                    {row.phone ?? "no-phone"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Requested {new Date(row.requestedAt).toLocaleString()}
                  </p>
                  {row.rejectionReason ? (
                    <p className="text-xs text-destructive mt-1">
                      Reason: {row.rejectionReason}
                    </p>
                  ) : null}
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      row.status === "PENDING"
                        ? "bg-amber-500/15 text-amber-700"
                        : row.status === "APPROVED"
                          ? "bg-emerald-500/15 text-emerald-700"
                          : "bg-rose-500/15 text-rose-700"
                    }`}
                  >
                    {row.status}
                  </span>

                  {row.status === "PENDING" ? (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => void review(row.id, "approve")}
                        disabled={pendingId === row.id}
                      >
                        Approve
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => void review(row.id, "reject")}
                        disabled={pendingId === row.id}
                      >
                        Reject
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function SettingsClient({
  institution,
  settings,
  feeCategories,
  viewerRole,
}: Props) {
  const govtPrimaryMode = isGovtPrimaryModeEnabled();
  const showDemoLoader = process.env.NODE_ENV === "development";
  const canEditSettings = ["SUPER_ADMIN", "ADMIN"].includes(viewerRole);
  const canReviewRequests = ["SUPER_ADMIN", "ADMIN", "PRINCIPAL"].includes(
    viewerRole,
  );
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const allowedTabs = govtPrimaryMode
    ? (["profile", "academic", "fees"] as const)
    : (["profile", "academic", "fees", "access"] as const);
  const activeTab =
    requestedTab && (allowedTabs as readonly string[]).includes(requestedTab)
      ? requestedTab
      : "profile";

  const setTab = (nextTab: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", nextTab);
    router.replace(`/dashboard/settings?${params.toString()}`);
  };

  return (
    <>
      <PageHeader
        title={govtPrimaryMode ? "Primary School Settings" : "Settings"}
        description={
          govtPrimaryMode
            ? "Manage school profile, primary academics, and fee categories."
            : "Manage institution profile, operations, and security workflows"
        }
      />
      <Tabs value={activeTab} onValueChange={setTab}>
        <TabsList className="mb-6 w-full overflow-x-auto sm:w-auto">
          <TabsTrigger value="profile" className="gap-1.5">
            <Building2 className="h-3.5 w-3.5" />
            {govtPrimaryMode ? "School Profile" : "Profile"}
          </TabsTrigger>
          <TabsTrigger value="academic" className="gap-1.5">
            <GraduationCap className="h-3.5 w-3.5" />
            Academic
          </TabsTrigger>
          <TabsTrigger value="fees" className="gap-1.5">
            <CreditCard className="h-3.5 w-3.5" />
            Fees
          </TabsTrigger>
          {!govtPrimaryMode ? (
            <TabsTrigger value="access" className="gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" />
              Access Requests
            </TabsTrigger>
          ) : null}
        </TabsList>
        <TabsContent value="profile">
          <ProfileTab institution={institution} canEdit={canEditSettings} />
        </TabsContent>
        <TabsContent value="academic">
          <AcademicTab settings={settings} canEdit={canEditSettings} />
        </TabsContent>
        <TabsContent value="fees">
          <FeeCategoriesTab
            initialRows={feeCategories}
            canEdit={canEditSettings}
            showDemoLoader={showDemoLoader}
          />
        </TabsContent>
        {!govtPrimaryMode ? (
          <TabsContent value="access">
            <AccessRequestsTab canReview={canReviewRequests} />
          </TabsContent>
        ) : null}
      </Tabs>
    </>
  );
}
