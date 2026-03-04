"use client";

import { useEffect, useState } from "react";
import { ArrowUp, LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/server/actions/session";

export function MobileFAB() {
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const getScrollContainer = () =>
      document.getElementById("dashboard-main") as HTMLElement | null;

    const onScroll = () => {
      const container = getScrollContainer();
      const top = container ? container.scrollTop : window.scrollY;
      setShowScrollTop(top > 280);
    };

    const container = getScrollContainer();
    if (container) {
      container.addEventListener("scroll", onScroll, { passive: true });
    } else {
      window.addEventListener("scroll", onScroll, { passive: true });
    }

    onScroll();
    return () => {
      if (container) {
        container.removeEventListener("scroll", onScroll);
      } else {
        window.removeEventListener("scroll", onScroll);
      }
    };
  }, []);

  const scrollToTop = () => {
    const container = document.getElementById("dashboard-main") as
      | HTMLElement
      | null;
    if (container) {
      container.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="fixed bottom-24 right-5 z-40 flex flex-col gap-3 lg:hidden">
      <button
        onClick={scrollToTop}
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary shadow-lg backdrop-blur-md transition-all hover:bg-primary hover:text-white active:scale-90",
          showScrollTop
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-2 opacity-0",
        )}
        title="Back to top"
        aria-label="Scroll to top"
        data-testid="scroll-top-fab"
      >
        <ArrowUp className="h-5 w-5" />
      </button>

      <form action={logoutAction}>
        <button
          type="submit"
          className="flex h-12 w-12 items-center justify-center rounded-2xl border border-accent/30 bg-accent/10 text-accent shadow-lg backdrop-blur-md transition-all active:scale-90 hover:bg-accent hover:text-white"
          title="Sign out"
          aria-label="Sign out"
          data-testid="mobile-fab-logout-button"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </form>

      <Link
        href="/dashboard/settings"
        className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary shadow-lg backdrop-blur-md transition-all active:scale-90 hover:bg-primary hover:text-white"
        title="Settings"
      >
        <Settings className="h-5 w-5 animate-spin-slow" />
      </Link>
    </div>
  );
}
