"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Users,
  GraduationCap,
  FileText,
  CreditCard,
  CalendarCheck,
  Shield,
  BarChart3,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/client";

export function Hero() {
  const { t } = useT();

  const features = [
    {
      label: "ডিজিটাল উপস্থিতি",
      icon: CalendarCheck,
      desc: "মোবাইলে attendance",
    },
    { label: "ফি সংগ্রহ", icon: CreditCard, desc: "Online payment" },
    { label: "রেজাল্ট প্রস্তুত", icon: FileText, desc: "Auto grading" },
    { label: "অ্যানালিটিক্স", icon: BarChart3, desc: "Real-time insights" },
  ];

  const stats = [
    { value: "৫০০+", label: "স্কুল" },
    { value: "৫০,০০০+", label: "শিক্ষার্থী" },
    { value: "৯৯.৯%", label: "Uptime" },
  ];

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-background via-background to-primary/5">
      {/* Animated background patterns */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/10 blur-3xl animate-pulse" />
        <div
          className="absolute top-40 -left-40 h-96 w-96 rounded-full bg-accent/10 blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-64 w-full max-w-3xl bg-gradient-to-t from-primary/5 to-transparent blur-3xl" />
      </div>

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
          linear-gradient(hsl(var(--foreground)) 1px, transparent 1px),
          linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)
        `,
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:py-32">
        <div className="grid gap-16 lg:grid-cols-2 lg:gap-12">
          {/* Left content */}
          <div className="flex flex-col justify-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm backdrop-blur-sm mb-6 w-fit">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="font-medium text-primary">
                বাংলাদেশের প্রথম স্কুল ম্যানেজমেন্ট সিস্টেম
              </span>
            </div>

            {/* Main heading */}
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl leading-[1.1]">
              স্কুল ম্যানেজমেন্টে
              <span className="block text-primary">নতুন মানসম্পন্ন</span>
            </h1>

            <p className="mt-6 max-w-xl text-lg text-muted-foreground leading-relaxed">
              প্রধান শিক্ষক, সহকারী শিক্ষক ও অফিস স্টাফদের জন্য তৈরি।
              attendance, fee, notice ও result print workflow এক ক্লিকে।
            </p>

            {/* Feature pills */}
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {features.map((feature) => (
                <div
                  key={feature.label}
                  className="flex items-center gap-2 rounded-xl border border-border/50 bg-card/50 p-3 hover:bg-card transition-colors"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <feature.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {feature.label}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {feature.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Button
                asChild
                size="lg"
                className="rounded-full px-8 h-12 text-base shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all"
              >
                <Link href="/#demo-booking" prefetch={false}>
                  ডেমো বুক করুন
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="rounded-full px-8 h-12 text-base border-2 hover:bg-primary/5 transition-all"
              >
                <Link href="/auth/register" prefetch={false}>
                  বিনামূল্যে শুরু করুন
                </Link>
              </Button>
            </div>

            {/* Trust indicators */}
            <div className="mt-10 flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>কোনো ক্রেডিট কার্ড নেই</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-green-600" />
                <span>নিরাপদ ডেটা</span>
              </div>
            </div>

            {/* Stats */}
            <div className="mt-12 grid grid-cols-3 gap-6 border-t border-border/50 pt-8">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="text-2xl font-bold text-primary">
                    {stat.value}
                  </p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right content - Dashboard Preview */}
          <div className="relative hidden lg:block">
            <div className="sticky top-24">
              {/* Main dashboard card */}
              <div className="relative rounded-2xl border border-border/50 bg-card/80 backdrop-blur-xl shadow-2xl overflow-hidden">
                {/* Dashboard header */}
                <div className="flex items-center justify-between border-b border-border/50 bg-muted/30 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                      <span className="text-primary-foreground font-bold text-sm">
                        ধ
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold">ধাদাশ ড্যাশবোর্ড</p>
                      <p className="text-xs text-muted-foreground">
                        ড্যাশবোর্ড overview
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span className="text-xs text-muted-foreground">Live</span>
                  </div>
                </div>

                {/* Dashboard content mockup */}
                <div className="p-4 space-y-4">
                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      {
                        label: "শিক্ষার্থী",
                        value: "১,২৫০",
                        icon: Users,
                        color: "bg-blue-500",
                      },
                      {
                        label: "শিক্ষক",
                        value: "৪৫",
                        icon: GraduationCap,
                        color: "bg-green-500",
                      },
                      {
                        label: "উপস্থিতি",
                        value: "৯৮%",
                        icon: CalendarCheck,
                        color: "bg-purple-500",
                      },
                    ].map((stat) => (
                      <div
                        key={stat.label}
                        className="rounded-xl bg-muted/40 p-3"
                      >
                        <div
                          className={`h-7 w-7 rounded-lg ${stat.color} flex items-center justify-center mb-2`}
                        >
                          <stat.icon className="h-3.5 w-3.5 text-white" />
                        </div>
                        <p className="text-lg font-bold">{stat.value}</p>
                        <p className="text-xs text-muted-foreground">
                          {stat.label}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Chart placeholder */}
                  <div className="rounded-xl bg-muted/40 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold">মাসিক attendance</p>
                      <span className="text-xs text-green-600 font-medium">
                        +12%
                      </span>
                    </div>
                    <div className="flex items-end gap-1 h-20">
                      {[65, 78, 82, 70, 88, 92, 85, 90, 95, 88, 92, 98].map(
                        (h, i) => (
                          <div
                            key={i}
                            className="flex-1 bg-primary/60 rounded-t-sm hover:bg-primary transition-colors"
                            style={{ height: `${h}%` }}
                          />
                        ),
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating cards */}
              <div
                className="absolute -right-4 top-1/3 rounded-xl border border-border/50 bg-card/90 p-3 shadow-xl backdrop-blur-sm animate-bounce"
                style={{ animationDuration: "3s" }}
              >
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Payment Received</p>
                    <p className="text-xs text-muted-foreground">৳ ২৫,০০০</p>
                  </div>
                </div>
              </div>

              <div className="absolute -left-4 bottom-1/3 rounded-xl border border-border/50 bg-card/90 p-3 shadow-xl backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <FileText className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">New Notice</p>
                    <p className="text-xs text-muted-foreground">৩টি নোটিশ</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
