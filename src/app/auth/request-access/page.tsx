"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isGovtPrimaryModeEnabled } from "@/lib/config";

const SCOPE_OPTIONS_BASE = [
  { value: "TEACHER", label: "Teacher" },
  { value: "STUDENT", label: "Student" },
  { value: "PARENT", label: "Parent" },
] as const;

type Scope = (typeof SCOPE_OPTIONS_BASE)[number]["value"];

export default function RequestAccessPage() {
  const govtPrimaryMode = isGovtPrimaryModeEnabled();
  const scopeOptions = SCOPE_OPTIONS_BASE.map((option) =>
    option.value === "TEACHER" && govtPrimaryMode
      ? { ...option, label: "Assistant Teacher" }
      : option,
  );
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    institutionSlug: "",
    requestedScope: "TEACHER" as Scope,
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const set = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/auth/access-requests", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            institutionSlug: form.institutionSlug,
            requestedScope: form.requestedScope,
            fullName: form.fullName,
            email: form.email,
            phone: form.phone,
            password: form.password,
          }),
        });
        const json = await res.json();

        if (!res.ok || json?.error) {
          setError(json?.error?.message ?? "Failed to submit access request.");
          return;
        }

        toast.success("Access request submitted.");
        router.push(
          `/auth/pending-approval?institution=${encodeURIComponent(form.institutionSlug)}&scope=${encodeURIComponent(form.requestedScope)}`,
        );
      } catch {
        setError("Failed to submit access request.");
      }
    });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md space-y-6 rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6 lg:max-w-lg">
        <div className="text-center">
          <div className="mx-auto mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <UserCheck className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Request School Access
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Submit your request. Admin/Principal will approve your role access.
          </p>
        </div>

        {error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="institution">Institution Slug</Label>
            <Input
              id="institution"
              value={form.institutionSlug}
              onChange={(e) =>
                set("institutionSlug", e.target.value.toLowerCase())
              }
              placeholder="e.g. greenfield-school"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label>Requested Scope</Label>
            <div className="grid grid-cols-1 gap-2 xs:grid-cols-3">
              {scopeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => set("requestedScope", option.value)}
                  className={`rounded-lg border px-2 py-2 text-sm transition-colors ${
                    form.requestedScope === option.value
                      ? "border-primary bg-primary/10"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              value={form.fullName}
              onChange={(e) => set("fullName", e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">
              Approved Email (optional if phone provided)
            </Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone">
              Approved Phone (optional if email provided)
            </Label>
            <Input
              id="phone"
              type="tel"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="+8801XXXXXXXXX"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                className="pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm">Confirm Password</Label>
            <Input
              id="confirm"
              type={showPassword ? "text" : "password"}
              value={form.confirmPassword}
              onChange={(e) => set("confirmPassword", e.target.value)}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting…
              </>
            ) : (
              "Submit Access Request"
            )}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Already approved?{" "}
          <Link
            href="/auth/login/admin"
            className="text-primary underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
