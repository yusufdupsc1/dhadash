// src/app/auth/login/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LoginForm } from "@/components/forms/login-form";
import { isGovtPrimaryModeEnabled } from "@/lib/config";
import type { Metadata } from "next";
import {
  Shield,
  GraduationCap,
  Users,
  CreditCard,
  CalendarCheck,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Sign In — Dhadash",
  robots: { index: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const session = await auth();

  if (session) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const googleEnabled = Boolean(
    process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
  );
  const govtPrimaryMode = isGovtPrimaryModeEnabled();

  const features = [
    { icon: CalendarCheck, label: "উপস্থিতি", desc: "Digital attendance" },
    { icon: CreditCard, label: "ফি সংগ্রহ", desc: "Online collection" },
    { icon: GraduationCap, label: "গ্রেড ম্যানেজমেন্ট", desc: "Auto results" },
    { icon: Users, label: "অ্যাডমিশন", desc: "Student records" },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-[55%] relative bg-card border-r border-border/50 flex-col justify-between p-8 xl:p-12 overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent/5 rounded-full blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage: `
              linear-gradient(hsl(var(--foreground)) 1px, transparent 1px),
              linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)
            `,
              backgroundSize: "40px 40px",
            }}
          />
        </div>

        <div className="relative z-10">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
              <Shield className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <span className="font-bold text-2xl tracking-tight">ধাদাশ</span>
              <p className="text-xs text-muted-foreground">
                ধাদাশ সরকারি প্রাথমিক বিদ্যালয়
              </p>
            </div>
          </div>

          {/* Main tagline */}
          <blockquote className="space-y-4">
            <h2 className="text-3xl xl:text-4xl font-bold leading-tight text-foreground">
              স্কুল ম্যানেজমেন্টে
              <span className="text-primary"> স্মার্ট সলিউশন</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-md">
              {govtPrimaryMode
                ? "সরকারি প্রাথমিক বিদ্যালয়ের জন্য ডিজিটাল workflow। attendance, fee, notice — সবকিছু এক জায়গায়।"
                : "আধুনিক স্কুল অপারেশন সিস্টেম। শিক্ষক, শিক্ষার্থী ও অভিভাবকদের জন্য।"}
            </p>
          </blockquote>
        </div>

        {/* Feature grid */}
        <div className="relative z-10 grid grid-cols-2 gap-4">
          {features.map((f) => (
            <div
              key={f.label}
              className="flex items-start gap-3 p-4 rounded-xl bg-muted/40 border border-border/30 hover:bg-muted/60 transition-colors"
            >
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm">{f.label}</p>
                <p className="text-xs text-muted-foreground">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom info */}
        <div className="relative z-10 flex items-center justify-between text-xs text-muted-foreground pt-6 border-t border-border/30">
          <p>© 2024 ধাদাশ. বাংলাদেশে তৈরি।</p>
          <div className="flex items-center gap-4">
            <Link
              href="/terms"
              className="hover:text-foreground transition-colors"
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="hover:text-foreground transition-colors"
            >
              Privacy
            </Link>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-8 xl:px-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-md">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl">ধাদাশ</span>
          </div>

          <div className="space-y-2 mb-8">
            <h1 className="text-2xl xl:text-3xl font-bold tracking-tight">
              স্বাগতম!
            </h1>
            <p className="text-muted-foreground">আপনার একাউন্টে লগইন করুন</p>
          </div>

          <LoginForm
            callbackUrl={params.callbackUrl}
            error={params.error}
            googleEnabled={googleEnabled}
          />

          <p className="mt-6 text-center text-sm text-muted-foreground">
            নতুন স্কুল?{" "}
            <Link
              href="/auth/register"
              className="font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              এখনই রেজিস্টার করুন
            </Link>
          </p>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            লগইন করে আপনি আমাদের{" "}
            <Link
              href="/terms"
              className="underline underline-offset-4 hover:text-foreground"
            >
              Terms
            </Link>{" "}
            এবং{" "}
            <Link
              href="/privacy"
              className="underline underline-offset-4 hover:text-foreground"
            >
              Privacy Policy
            </Link>{" "}
            গ্রহণ করেন।
          </p>
        </div>
      </div>
    </main>
  );
}
