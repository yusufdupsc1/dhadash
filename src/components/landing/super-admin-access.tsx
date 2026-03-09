import { LockKeyhole, ShieldCheck } from "lucide-react";
import { ownerSignInAction } from "@/server/actions/owner-auth";

export function SuperAdminAccess() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-4 sm:px-8">
      <div
        id="owner-signin"
        className="rounded-2xl border border-[#006a4e]/20 bg-white p-5 shadow-sm sm:p-6"
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#006a4e]">
              BD-GPS Central Control Access
            </p>
            <h2 className="mt-1 text-xl font-black text-slate-900">
              সেন্ট্রাল সুপার অ্যাডমিন সাইন-ইন (BD-GPS নিয়ন্ত্রিত)
            </h2>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full border border-[#006a4e]/25 bg-[#f2faf7] px-3 py-1 text-xs font-semibold text-[#006a4e]">
            <ShieldCheck className="h-3.5 w-3.5" />
            Central Authority Only
          </span>
        </div>

        <p className="mb-4 text-sm text-slate-700">
          কেবল অনুমোদিত সেন্ট্রাল সুপার অ্যাডমিন অ্যাকাউন্ট এই কনসোলে প্রবেশ
          করতে পারবে। সফল লগইনের পর সরাসরি Central Super Admin Dashboard-এ
          নেওয়া হবে।
        </p>

        <div className="mb-4 rounded-lg border border-[#da291c]/20 bg-[#fff7f7] px-3 py-2 text-xs text-slate-700">
          <p className="font-semibold text-[#a1271c]">Central Authentication</p>
          <p className="mt-1">
            Use ministry-issued central super-admin credentials. Demo credentials are
            only available in controlled non-production environments.
          </p>
        </div>

        <form
          action={ownerSignInAction}
          className="grid gap-3 md:grid-cols-[1fr_1fr_auto]"
        >
          <input
            type="text"
            name="username"
            autoComplete="username"
            aria-label="Central super admin username"
            className="h-11 rounded-md border border-[#006a4e]/25 bg-white px-3 text-sm outline-none ring-offset-1 focus:border-[#006a4e] focus:ring-2 focus:ring-[#006a4e]/20"
            placeholder="Central super admin username"
            required
          />
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            aria-label="Central super admin password"
            className="h-11 rounded-md border border-[#006a4e]/25 bg-white px-3 text-sm outline-none ring-offset-1 focus:border-[#006a4e] focus:ring-2 focus:ring-[#006a4e]/20"
            placeholder="Central super admin password"
            required
          />
          <button
            type="submit"
            className="primary-cta inline-flex h-11 w-full items-center justify-center rounded-md px-5 text-sm font-bold md:w-auto"
          >
            <LockKeyhole className="mr-2 h-4 w-4" />
            Central Super Admin Sign In
          </button>
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            className="hidden"
            aria-hidden="true"
          />
        </form>
      </div>
    </section>
  );
}
