"use client";

import Link from "next/link";
import { Shield, Menu, X } from "lucide-react";
import { useState } from "react";

import { LanguageToggle } from "@/components/LanguageToggle";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/client";

export function LandingHeader() {
  const { t } = useT();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center shadow-md shadow-primary/20">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold tracking-tight">ধাদাশ</span>
        </Link>

        {/* Desktop Navigation */}
        <nav
          aria-label="Marketing"
          className="hidden items-center gap-8 md:flex"
        >
          <a
            href="#features"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            ফিচার
          </a>
          <a
            href="#pricing"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            মূল্য
          </a>
          <a
            href="#testimonials"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            মতামত
          </a>
          <a
            href="#contact"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            যোগাযোগ
          </a>
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <LanguageToggle />

          {/* Desktop buttons */}
          <div className="hidden sm:flex items-center gap-2">
            <Button asChild variant="ghost" className="font-medium">
              <Link href="/auth/login" prefetch={false}>
                লগইন
              </Link>
            </Button>
            <Button
              asChild
              className="rounded-full px-5 font-medium shadow-md shadow-primary/20"
            >
              <Link href="/#demo-booking" prefetch={false}>
                ডেমো বুক
              </Link>
            </Button>
          </div>

          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border/50 bg-background/95 backdrop-blur-xl">
          <nav className="flex flex-col p-4 space-y-2">
            <a
              href="#features"
              className="px-4 py-3 text-sm font-medium rounded-lg hover:bg-muted transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              ফিচার
            </a>
            <a
              href="#pricing"
              className="px-4 py-3 text-sm font-medium rounded-lg hover:bg-muted transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              মূল্য
            </a>
            <a
              href="#testimonials"
              className="px-4 py-3 text-sm font-medium rounded-lg hover:bg-muted transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              মতামত
            </a>
            <div className="flex gap-2 pt-2">
              <Button asChild variant="outline" className="flex-1">
                <Link href="/auth/login" prefetch={false}>
                  লগইন
                </Link>
              </Button>
              <Button asChild className="flex-1">
                <Link href="/#demo-booking" prefetch={false}>
                  ডেমো বুক
                </Link>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
