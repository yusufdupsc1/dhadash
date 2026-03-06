import Link from "next/link";

import { GovtMonogram } from "@/components/landing/govt-monogram";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Button } from "@/components/ui/button";

export function LandingHeader() {
  return (
    <header className="safe-top sticky top-0 z-50 border-b border-[#006a4e]/15 bg-white/95 backdrop-blur-md">
      <div className="govt-top-band" aria-label="Government identity strip">
        <div className="govt-top-band__segment govt-top-band__segment--left">
          <span className="govt-top-band__meta">National Education Service</span>
        </div>
        <div className="govt-top-band__segment govt-top-band__segment--center">
          <span className="govt-top-band__title">
            গণপ্রজাতন্ত্রী বাংলাদেশ সরকার
          </span>
        </div>
        <div className="govt-top-band__segment govt-top-band__segment--right">
          <span className="govt-top-band__meta">
            Ministry of Primary and Mass Education
          </span>
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-3 px-4 py-3 sm:min-h-20 sm:flex-nowrap sm:justify-between sm:gap-4 sm:px-8">
        <Link
          href="/"
          className="group flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3"
          aria-label="প্রাথমিক শিক্ষা ব্যবস্থাপনা সিস্টেম হোমপেজ"
        >
          <GovtMonogram className="h-12 w-12 shrink-0 group-hover:scale-[1.02] transition-transform" />
          <div className="min-w-0">
            <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-[#006a4e] sm:text-[11px]">
              Primary Education Ministry
            </p>
            <p className="truncate text-[13px] font-bold text-slate-900 sm:text-base">
              প্রাথমিক শিক্ষা ডিজিটাল ব্যবস্থাপনা প্ল্যাটফর্ম
            </p>
            <p className="hidden truncate text-[11px] text-slate-600 sm:block">
              সরকারি প্রাথমিক বিদ্যালয় প্রশাসন (শ্রেণি ১-৫)
            </p>
          </div>
        </Link>

        <nav
          aria-label="Landing Sections"
          className="hidden items-center gap-6 lg:flex"
        >
          {[
            { label: "ফিচারসমূহ", href: "#features" },
            { label: "রোলভিত্তিক মডিউল", href: "#modules" },
            { label: "রোলআউট পরিকল্পনা", href: "#plans" },
            { label: "পাইলট অভিজ্ঞতা", href: "#field-notes" },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm font-semibold text-slate-700 transition-colors hover:text-[#006a4e]"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          <div className="hidden xs:block">
            <LanguageToggle />
          </div>
          <Link
            href="/auth/login"
            prefetch={false}
            className="hidden rounded-md border border-[#006a4e]/20 px-3 py-2 text-sm font-semibold text-[#006a4e] transition-colors hover:border-[#006a4e]/40 hover:bg-[#006a4e]/5 sm:inline-flex"
          >
            লগইন
          </Link>
          <Link
            href="/#owner-signin"
            prefetch={false}
            className="hidden rounded-md border border-[#da291c]/30 px-3 py-2 text-sm font-semibold text-[#a1271c] transition-colors hover:border-[#da291c]/45 hover:bg-[#fff4f4] lg:inline-flex"
          >
            Owner Sign-In
          </Link>
          <Button
            asChild
            className="primary-cta h-10 rounded-md px-4 text-sm font-bold sm:px-5"
          >
            <Link href="/#demo-booking" prefetch={false}>
              ডেমো অনুরোধ
            </Link>
          </Button>
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 pb-3 text-[11px] text-slate-600 sm:px-8 lg:hidden">
        <span className="rounded-full bg-[#006a4e]/10 px-2 py-0.5 font-semibold text-[#006a4e]">
          Govt Official Theme
        </span>
        <span className="truncate">
          জাতীয় সেবার মান বজায় রেখে দ্রুত ও নিরাপদ ব্যবস্থাপনা।
        </span>
      </div>
    </header>
  );
}
