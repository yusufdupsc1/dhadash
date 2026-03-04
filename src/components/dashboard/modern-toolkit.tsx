import {
  BookOpenCheck,
  ClipboardList,
  FileSpreadsheet,
  MessagesSquare,
  ArrowUpRight,
} from "lucide-react";
import { cookies } from "next/headers";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { normalizeLocale } from "@/lib/i18n/getDict";

const features = [
  {
    title: {
      en: "Daily Teaching Board",
      bn: "দৈনিক পাঠ বোর্ড",
    },
    description:
      "Class plan, homework focus, and attendance checklist in one place.",
    descriptionBn:
      "এক জায়গায় ক্লাস পরিকল্পনা, হোমওয়ার্ক ফোকাস এবং উপস্থিতি চেকলিস্ট।",
    icon: ClipboardList,
    color: "text-primary",
    bg: "bg-primary/10",
    metric: { en: "Daily Ready", bn: "দৈনিক প্রস্তুত" },
  },
  {
    title: {
      en: "Guardian Communication",
      bn: "অভিভাবক যোগাযোগ",
    },
    description:
      "Notice and SMS communication channel for school to guardian updates.",
    descriptionBn:
      "স্কুল থেকে অভিভাবকের আপডেটের জন্য নোটিশ ও এসএমএস যোগাযোগ চ্যানেল।",
    icon: MessagesSquare,
    color: "text-accent",
    bg: "bg-accent/10",
    metric: { en: "SMS Active", bn: "এসএমএস সক্রিয়" },
  },
  {
    title: {
      en: "Result & Report Desk",
      bn: "রেজাল্ট ও রিপোর্ট ডেস্ক",
    },
    description:
      "Manage exam results, report sheets, and printable records quickly.",
    descriptionBn: "দ্রুত পরীক্ষা ফলাফল, রিপোর্ট শিট এবং প্রিন্ট রেকর্ড তৈরি করুন।",
    icon: FileSpreadsheet,
    color: "text-primary",
    bg: "bg-primary/10",
    metric: { en: "Print Ready", bn: "প্রিন্ট রেডি" },
  },
  {
    title: {
      en: "Curriculum Snapshot",
      bn: "পাঠ্যসূচি স্ন্যাপশট",
    },
    description:
      "Keep class-wise subject coverage and routine aligned across grades.",
    descriptionBn:
      "শ্রেণিভিত্তিক বিষয় কাভারেজ ও রুটিনকে সমন্বিতভাবে পরিচালনা করুন।",
    icon: BookOpenCheck,
    color: "text-accent",
    bg: "bg-accent/10",
    metric: { en: "Class Scope", bn: "শ্রেণি ভিত্তিক" },
  },
];

export async function ModernToolkit() {
  const cookieStore = await cookies();
  const locale = normalizeLocale(
    cookieStore.get("locale")?.value ?? cookieStore.get("NEXT_LOCALE")?.value,
  );
  const isBangla = locale === "bn";

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <div className="flex flex-col gap-0.5">
          <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground/90">
            {isBangla ? "স্কুল অপারেশন টুলকিট" : "School Operations Toolkit"}
            <span className="flex h-4 items-center justify-center rounded-full bg-primary/10 px-2 text-[8px] font-black uppercase tracking-widest text-primary ring-1 ring-inset ring-primary/20">
              {isBangla ? "নতুন" : "New"}
            </span>
          </h2>
          <p className="text-xs text-muted-foreground">
            {isBangla
              ? "দৈনিক প্রশাসনিক কাজ দ্রুত শেষ করার জন্য প্রয়োজনীয় ব্লক।"
              : "Essential blocks to run daily school administration faster."}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:text-primary"
        >
          {isBangla ? "সব দেখুন" : "View All"}{" "}
          <ArrowUpRight className="ml-1 h-3 w-3" />
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {features.map((feature, i) => (
          <Card
            key={i}
            className="group relative overflow-hidden border-border/70 bg-card p-4 transition-premium hover:border-primary/35 hover:bg-primary/5"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-primary/60 via-accent/70 to-primary/60" />

            <div className="flex items-start justify-between mb-4">
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl border border-current/15 ${feature.bg} ${feature.color} transition-transform group-hover:scale-105`}
              >
                <feature.icon className="h-6 w-6" />
              </div>
              <span className={`text-[11px] font-bold ${feature.color} leading-none`}>
                {isBangla ? feature.metric.bn : feature.metric.en}
              </span>
            </div>

            <div className="space-y-2">
              <h3 className="text-base font-semibold text-foreground transition-colors group-hover:text-primary">
                {isBangla ? feature.title.bn : feature.title.en}
              </h3>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {isBangla ? feature.descriptionBn : feature.description}
              </p>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted/30">
                <div className="h-full w-[70%] rounded-full bg-primary/50" />
              </div>
              <span className="text-[9px] font-bold uppercase text-muted-foreground/70">
                {isBangla ? "চলমান" : "Active"}
              </span>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
