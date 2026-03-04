"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Menu } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { MobileMenuSection } from "./mobile-menu-config";

const MobileMenuContent = dynamic(
  () =>
    import("./mobile-menu-content.client").then((mod) => mod.MobileMenuContent),
  {
    ssr: false,
    loading: () => (
      <div className="p-4 text-sm text-muted-foreground">Loading menu...</div>
    ),
  },
);

interface MobileMenuDrawerProps {
  homeHref: string;
  institutionName: string;
  userName: string;
  sections: MobileMenuSection[];
}

export function MobileMenuDrawer({
  homeHref,
  institutionName,
  userName,
  sections,
}: MobileMenuDrawerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-background/70 text-foreground/90 transition-colors hover:bg-muted/70 active:scale-95 lg:hidden"
          aria-label="Open menu"
          data-testid="mobile-menu-trigger"
          id="mobile-menu-trigger"
        >
          <Menu className="h-5 w-5" />
        </button>
      </DialogTrigger>
      <DialogContent
        className="fixed inset-y-0 left-0 z-50 h-full w-[min(86vw,21rem)] max-w-none translate-x-0 translate-y-0 rounded-none border-r border-border p-0 data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Navigation Menu</DialogTitle>
        </DialogHeader>
        {open ? (
          <MobileMenuContent
            homeHref={homeHref}
            institutionName={institutionName}
            userName={userName}
            sections={sections}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
