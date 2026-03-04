"use client";

import Link from "next/link";
import {
  ArchiveRestore,
  BarChart3,
  Bell,
  BookOpen,
  Bookmark,
  Calendar,
  ClipboardCheck,
  CreditCard,
  FileBadge,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Megaphone,
  School,
  Settings,
  ShieldCheck,
  Upload,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DialogClose } from "@/components/ui/dialog";
import type {
  MobileMenuIconKey,
  MobileMenuSection,
} from "./mobile-menu-config";

const iconMap: Record<MobileMenuIconKey, LucideIcon> = {
  dashboard: LayoutDashboard,
  "user-round": UserRound,
  "graduation-cap": GraduationCap,
  users: Users,
  "bar-chart": BarChart3,
  "book-open": BookOpen,
  bookmark: Bookmark,
  "clipboard-check": ClipboardCheck,
  school: School,
  "credit-card": CreditCard,
  calendar: Calendar,
  bell: Bell,
  megaphone: Megaphone,
  archive: ArchiveRestore,
  "shield-check": ShieldCheck,
  upload: Upload,
  settings: Settings,
  "file-text": FileText,
  "file-badge": FileBadge,
};

function hrefToTestId(href: string) {
  return `mobile-menu-link-${href
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()}`;
}

interface MobileMenuContentProps {
  homeHref: string;
  institutionName: string;
  userName: string;
  sections: MobileMenuSection[];
}

export function MobileMenuContent({
  homeHref,
  institutionName,
  userName,
  sections,
}: MobileMenuContentProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border/60 p-4">
        <DialogClose asChild>
          <Link
            href={homeHref}
            className="group flex items-center gap-3 rounded-xl border border-border/50 bg-background/70 px-3 py-2 transition-colors hover:bg-muted/60"
            data-testid="mobile-menu-home-link"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {institutionName}
              </p>
              <p className="text-xs text-muted-foreground">{userName}</p>
            </div>
          </Link>
        </DialogClose>
      </div>

      <nav
        aria-label="Mobile drawer menu"
        className="flex-1 space-y-4 overflow-y-auto px-3 py-3"
      >
        {sections.map((section) => (
          <section key={section.title}>
            <h3 className="px-2 pb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/80">
              {section.title}
            </h3>
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = iconMap[item.icon] ?? LayoutDashboard;

                return (
                  <DialogClose key={item.href} asChild>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-foreground/90 transition-colors",
                        "hover:bg-muted/70 active:scale-[0.99]",
                      )}
                      data-testid={hrefToTestId(item.href)}
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 bg-card">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </DialogClose>
                );
              })}
            </div>
          </section>
        ))}
      </nav>
    </div>
  );
}
