// src/components/forms/login-form.tsx
"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, AlertCircle, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

const SCOPE_OPTIONS = [
  {
    value: "ADMIN",
    label: "Admin",
    hint: "Principal/office/admin accounts",
  },
  {
    value: "TEACHER",
    label: "Teacher",
    hint: "Teacher portal access",
  },
  {
    value: "STUDENT",
    label: "Student",
    hint: "Student portal access",
  },
  {
    value: "PARENT",
    label: "Parent",
    hint: "Parent portal access",
  },
] as const;

const LoginSchema = z
  .object({
    institution: z.string().optional(),
    scope: z.enum(["ADMIN", "TEACHER", "STUDENT", "PARENT"]).default("ADMIN"),
    loginMode: z.enum(["PASSWORD", "PHONE_OTP"]).default("PASSWORD"),
    email: z.string().optional(),
    password: z.string().optional(),
    phone: z.string().optional(),
    otpCode: z.string().optional(),
    otpChallengeId: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.scope !== "ADMIN" && !value.institution?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Institution slug is required for teacher/student/parent login scope.",
        path: ["institution"],
      });
    }

    if (value.loginMode === "PASSWORD") {
      if (!value.email?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Email is required",
          path: ["email"],
        });
      } else if (!z.string().email().safeParse(value.email.trim()).success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please enter a valid email address",
          path: ["email"],
        });
      }

      if (!value.password?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Password is required",
          path: ["password"],
        });
      }
    }

    if (value.loginMode === "PHONE_OTP") {
      if (!value.phone?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Phone number is required",
          path: ["phone"],
        });
      }
      if (!value.otpChallengeId?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Request OTP first",
          path: ["otpCode"],
        });
      }
      if (!value.otpCode?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "OTP code is required",
          path: ["otpCode"],
        });
      }
    }
  });

type LoginFormValues = z.infer<typeof LoginSchema>;

interface LoginFormProps {
  callbackUrl?: string;
  error?: string;
  googleEnabled?: boolean;
}

const AUTH_ERRORS: Record<string, string> = {
  OAuthSignin: "Error with OAuth sign in. Please try again.",
  OAuthCallback: "Error with OAuth callback. Please try again.",
  OAuthCreateAccount: "Could not create account. Please try again.",
  Callback: "Error in the sign in callback.",
  CredentialsSignin: "Invalid credentials or account is not approved.",
  SessionRequired: "Please sign in to access this page.",
  default: "An unexpected error occurred. Please try again.",
};

export function LoginForm({
  callbackUrl,
  error,
  googleEnabled = false,
}: LoginFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isSendingOtp, startOtpTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const [scopeCounts, setScopeCounts] = useState<Record<string, number> | null>(
    null,
  );
  const [scopeInfoError, setScopeInfoError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(
    error ? (AUTH_ERRORS[error] ?? AUTH_ERRORS.default) : null,
  );

  const {
    register,
    getValues,
    setValue,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      institution: "",
      scope: "ADMIN",
      loginMode: "PASSWORD",
      email: "",
      password: "",
      phone: "",
      otpCode: "",
      otpChallengeId: "",
    },
  });

  const selectedScope = useWatch({ control, name: "scope" });
  const selectedMode = useWatch({ control, name: "loginMode" });
  const institutionSlug =
    useWatch({ control, name: "institution" })?.trim().toLowerCase() ?? "";

  useEffect(() => {
    if (!institutionSlug) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/auth/scopes?institution=${encodeURIComponent(institutionSlug)}`,
          { signal: controller.signal },
        );
        const json = await res.json();
        if (!res.ok || json?.error) {
          setScopeCounts(null);
          setScopeInfoError("Institution not found or no approved users.");
          return;
        }
        setScopeCounts(json?.data?.counts ?? null);
        setScopeInfoError(null);
      } catch {
        if (!controller.signal.aborted) {
          setScopeCounts(null);
          setScopeInfoError("Could not load scope info.");
        }
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [institutionSlug]);

  const onSubmit = (values: LoginFormValues) => {
    setFormError(null);

    startTransition(async () => {
      const result = await signIn("credentials", {
        institution: values.institution?.trim(),
        scope: values.scope,
        loginMode: values.loginMode,
        email: values.email?.trim(),
        password: values.password,
        phone: values.phone?.trim(),
        otpCode: values.otpCode?.trim(),
        otpChallengeId: values.otpChallengeId?.trim(),
        redirect: false,
      });

      if (result?.error) {
        setFormError(
          AUTH_ERRORS[result.error] ?? AUTH_ERRORS.CredentialsSignin,
        );
        return;
      }

      toast.success("Welcome back!");
      router.push(callbackUrl ? decodeURIComponent(callbackUrl) : "/dashboard");
      router.refresh();
    });
  };

  const handleGoogleSignIn = () => {
    if (!googleEnabled) {
      toast.error("Google sign-in is not configured yet.");
      return;
    }
    startTransition(async () => {
      await signIn("google", {
        callbackUrl: callbackUrl
          ? decodeURIComponent(callbackUrl)
          : "/dashboard",
      });
    });
  };

  const handleSendOtp = () => {
    setFormError(null);
    const currentScope = getValues("scope");
    const currentInstitution =
      getValues("institution")?.trim().toLowerCase() ?? "";
    const currentPhone = getValues("phone")?.trim() ?? "";

    if (currentScope !== "ADMIN" && !currentInstitution) {
      setFormError("Institution slug is required for this scope.");
      return;
    }

    if (!currentPhone) {
      setFormError("Enter your approved phone number first.");
      return;
    }

    startOtpTransition(async () => {
      try {
        const res = await fetch("/api/auth/otp/send", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            institutionSlug: currentInstitution,
            scope: currentScope,
            phone: currentPhone,
          }),
        });
        const json = await res.json();

        if (!res.ok || json?.error) {
          setFormError(json?.error?.message ?? "Failed to send OTP.");
          return;
        }

        const challengeId = json?.data?.challengeId as string | null;
        if (!challengeId) {
          toast.success("If the account exists, an OTP has been sent.");
          return;
        }

        setValue("otpChallengeId", challengeId, { shouldValidate: true });
        toast.success("OTP sent to your phone.");

        if (json?.meta?.devOtp) {
          toast.info(`Dev OTP: ${json.meta.devOtp}`);
        }
      } catch {
        setFormError("Failed to send OTP.");
      }
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {formError && (
        <Alert
          variant="destructive"
          className="border-destructive/50 bg-destructive/10 text-destructive"
        >
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label>Login Scope</Label>
          <div className="grid grid-cols-2 gap-2">
            {SCOPE_OPTIONS.map((scope) => (
              <button
                key={scope.value}
                type="button"
                onClick={() =>
                  setValue("scope", scope.value, { shouldValidate: true })
                }
                className={cn(
                  "rounded-lg border px-3 py-2 text-left transition-colors",
                  selectedScope === scope.value
                    ? "border-primary bg-primary/10"
                    : "border-border bg-background hover:bg-muted/50",
                )}
                disabled={isPending || isSendingOtp}
              >
                <p className="text-sm font-medium">{scope.label}</p>
                <p className="text-[11px] text-muted-foreground">
                  {scope.hint}
                </p>
                {scopeCounts && institutionSlug ? (
                  <p className="mt-1 text-[11px] text-primary">
                    {scopeCounts[scope.value] ?? 0} account(s)
                  </p>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Sign in Method</Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() =>
                setValue("loginMode", "PASSWORD", { shouldValidate: true })
              }
              className={cn(
                "rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                selectedMode === "PASSWORD"
                  ? "border-primary bg-primary/10"
                  : "border-border bg-background hover:bg-muted/50",
              )}
              disabled={isPending || isSendingOtp}
            >
              Email + Password
            </button>
            <button
              type="button"
              onClick={() =>
                setValue("loginMode", "PHONE_OTP", { shouldValidate: true })
              }
              className={cn(
                "rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                selectedMode === "PHONE_OTP"
                  ? "border-primary bg-primary/10"
                  : "border-border bg-background hover:bg-muted/50",
              )}
              disabled={isPending || isSendingOtp}
            >
              Phone OTP
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="institution">
            Institution Slug (optional for Admin)
          </Label>
          <Input
            id="institution"
            type="text"
            autoComplete="organization"
            placeholder="e.g. greenfield-school"
            disabled={isPending || isSendingOtp}
            {...register("institution")}
          />
          {scopeInfoError && institutionSlug ? (
            <p className="text-xs text-muted-foreground">{scopeInfoError}</p>
          ) : null}
          {errors.institution && (
            <p className="text-xs text-destructive">
              {errors.institution.message}
            </p>
          )}
        </div>

        {selectedMode === "PASSWORD" ? (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                autoFocus
                placeholder="admin@dhadash-gps.vercel.app"
                disabled={isPending || isSendingOtp}
                className={errors.email ? "border-destructive" : ""}
                {...register("email")}
              />
              {errors.email && (
                <p className="text-xs text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/auth/forgot-password"
                  className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  disabled={isPending || isSendingOtp}
                  className={`pr-10 ${errors.password ? "border-destructive" : ""}`}
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Approved Phone Number</Label>
              <div className="flex gap-2">
                <Input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+8801XXXXXXXXX"
                  disabled={isPending || isSendingOtp}
                  className={errors.phone ? "border-destructive" : ""}
                  {...register("phone")}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSendOtp}
                  disabled={isPending || isSendingOtp}
                >
                  {isSendingOtp ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <Smartphone className="mr-1 h-4 w-4" />
                  )}
                  Send OTP
                </Button>
              </div>
              {errors.phone && (
                <p className="text-xs text-destructive">
                  {errors.phone.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="otpCode">OTP Code</Label>
              <Input
                id="otpCode"
                type="text"
                inputMode="numeric"
                placeholder="6-digit code"
                disabled={isPending || isSendingOtp}
                className={errors.otpCode ? "border-destructive" : ""}
                {...register("otpCode")}
              />
              <input type="hidden" {...register("otpChallengeId")} />
              {errors.otpCode && (
                <p className="text-xs text-destructive">
                  {errors.otpCode.message}
                </p>
              )}
            </div>
          </>
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={isPending || isSendingOtp}
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            or continue with
          </span>
        </div>
      </div>

      {googleEnabled ? (
        <Button
          variant="outline"
          className="w-full"
          onClick={handleGoogleSignIn}
          disabled={isPending || isSendingOtp}
          type="button"
        >
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </Button>
      ) : (
        <p className="text-center text-xs text-muted-foreground">
          Google sign-in is disabled. Set `AUTH_GOOGLE_ID` and
          `AUTH_GOOGLE_SECRET`.
        </p>
      )}

      <div className="rounded-xl border border-dashed border-primary/20 bg-primary/5 p-4 shadow-sm">
        <p className="text-xs font-semibold text-primary mb-2 flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          Demo Access
        </p>
        <div className="space-y-1 font-mono text-sm text-foreground/80">
          <div className="flex justify-between items-center group">
            <span>admin@dhadash-gps.vercel.app</span>
            <span className="text-muted-foreground group-hover:text-primary transition-colors text-xs">
              DH_Admin2026
            </span>
          </div>
          <div className="flex justify-between items-center group">
            <span>principal@school.edu</span>
            <span className="text-muted-foreground group-hover:text-primary transition-colors text-xs">
              principal123
            </span>
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Teacher, Student, or Parent?{" "}
        <Link
          href="/auth/request-access"
          className="underline underline-offset-4 hover:text-foreground"
        >
          Request institution access
        </Link>
      </p>
    </div>
  );
}
