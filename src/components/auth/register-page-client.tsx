"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, ShieldCheck, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  registerInstitution,
  type RegisterFormData,
} from "@/server/actions/auth";

const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One number", test: (p: string) => /[0-9]/.test(p) },
];

export function RegisterPageClient() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<RegisterFormData>({
    institutionName: "",
    adminName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const set = (k: keyof RegisterFormData, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const res = await registerInstitution(form);
      if ("error" in res) {
        setError(res.error);
      } else {
        toast.success("Institution registered! Please sign in.");
        router.push("/auth/login");
      }
    });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        {/* Brand */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Create your institution
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Set up Dhadash for your school in under a minute.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-border bg-card p-8 shadow-lg">
          {error && (
            <div className="mb-4 rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="reg-inst">Institution / School Name *</Label>
              <Input
                id="reg-inst"
                placeholder="Bright Future Academy"
                value={form.institutionName}
                onChange={(e) => set("institutionName", e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reg-name">Your Full Name *</Label>
              <Input
                id="reg-name"
                placeholder="Dr. Jane Smith"
                value={form.adminName}
                onChange={(e) => set("adminName", e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reg-email">Email Address *</Label>
              <Input
                id="reg-email"
                type="email"
                placeholder="admin@school.edu"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reg-pass">Password *</Label>
              <div className="relative">
                <Input
                  id="reg-pass"
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPass ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {/* Password rules */}
              {form.password && (
                <div className="mt-2 space-y-1">
                  {PASSWORD_RULES.map(({ label, test }) => (
                    <div key={label} className="flex items-center gap-1.5">
                      <CheckCircle2
                        className={`h-3.5 w-3.5 ${
                          test(form.password)
                            ? "text-green-500"
                            : "text-muted-foreground/40"
                        }`}
                      />
                      <span
                        className={`text-xs ${
                          test(form.password)
                            ? "text-green-500"
                            : "text-muted-foreground"
                        }`}
                      >
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reg-confirm">Confirm Password *</Label>
              <Input
                id="reg-confirm"
                type="password"
                placeholder="••••••••"
                value={form.confirmPassword}
                onChange={(e) => set("confirmPassword", e.target.value)}
                className={
                  form.confirmPassword && form.confirmPassword !== form.password
                    ? "border-destructive"
                    : ""
                }
                required
              />
              {form.confirmPassword &&
                form.confirmPassword !== form.password && (
                  <p className="text-xs text-destructive">
                    Passwords do not match
                  </p>
                )}
            </div>

            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating institution…
                </>
              ) : (
                "Enroll Institution"
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/auth/login"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
