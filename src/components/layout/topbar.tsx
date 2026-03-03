"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Bell,
  LogOut,
  Settings,
  User,
  ChevronDown,
  Menu,
  Search,
  X,
  Printer,
} from "lucide-react";
import type { Session } from "next-auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useGovtPrimaryT, useT } from "@/lib/i18n/client";
import { isGovtPrimaryModeEnabled } from "@/lib/config";

interface TopBarProps {
  session: Session;
  onMenuClick?: () => void;
}

export function TopBar({ session, onMenuClick }: TopBarProps) {
  const { t } = useT();
  const { t: tg } = useGovtPrimaryT();
  const router = useRouter();
  const govtPrimaryMode = isGovtPrimaryModeEnabled();
  const role = (session.user as { role?: string } | undefined)?.role;
  const [searchOpen, setSearchOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const topLabel = govtPrimaryMode
    ? role === "PRINCIPAL"
      ? tg("head_teacher")
      : role === "TEACHER"
        ? tg("assistant_teacher")
        : t("school_name")
    : t("institution");

  const userName = session.user?.name || "User";
  const userEmail = session.user?.email || "";
  const userInitials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleLogout = async () => {
    await signOut({ redirect: false, callbackUrl: "/auth/login" });
    router.push("/auth/login");
    router.refresh();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <header className="safe-top sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border/80 bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-4">
      {/* Left section */}
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* School info - hidden on mobile */}
        <div className="hidden sm:block min-w-0">
          <p className="text-xs text-muted-foreground">{topLabel}</p>
          <p className="truncate text-sm font-semibold">
            {(session.user as { institutionName?: string }).institutionName ??
              "ধাদাশ সরকারি প্রাথমিক বিদ্যালয়"}
          </p>
        </div>
      </div>

      {/* Center - Search (desktop) */}
      <div className="hidden md:flex flex-1 max-w-md mx-4">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search students, teachers..."
            className="w-full pl-10 bg-muted/50 border-0 focus-visible:ring-1"
          />
        </div>
      </div>

      {/* Mobile search toggle */}
      {searchOpen && (
        <div className="absolute inset-x-0 top-14 p-3 bg-background border-b border-border md:hidden">
          <Input
            type="search"
            placeholder="Search..."
            className="w-full"
            autoFocus
          />
        </div>
      )}

      {/* Right section */}
      <div className="flex items-center gap-1">
        {/* Print button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePrint}
          className="hidden sm:flex"
          title="Print Dashboard"
        >
          <Printer className="h-4 w-4" />
        </Button>
        {/* Mobile search toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setSearchOpen(!searchOpen)}
        >
          {searchOpen ? (
            <X className="h-4 w-4" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </Button>

        {/* Notifications bell */}
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          onClick={() => setNotifOpen(!notifOpen)}
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500" />
        </Button>

        {/* Notifications dropdown */}
        {notifOpen && (
          <div className="absolute right-4 top-16 w-80 rounded-xl border border-border bg-background shadow-xl z-50">
            <div className="flex items-center justify-between p-3 border-b">
              <span className="font-semibold text-sm">Notifications</span>
              <button
                onClick={() => setNotifOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              <div className="p-3 hover:bg-muted/50 cursor-pointer border-b">
                <p className="font-medium text-sm">New student registered</p>
                <p className="text-xs text-muted-foreground">
                  Rahim Ahmed joined Class 3
                </p>
                <p className="text-xs text-muted-foreground mt-1">2 min ago</p>
              </div>
              <div className="p-3 hover:bg-muted/50 cursor-pointer border-b">
                <p className="font-medium text-sm">Fee payment received</p>
                <p className="text-xs text-muted-foreground">
                  ৳ 2,500 from Karim family
                </p>
                <p className="text-xs text-muted-foreground mt-1">15 min ago</p>
              </div>
              <div className="p-3 hover:bg-muted/50 cursor-pointer">
                <p className="font-medium text-sm">Attendance ready</p>
                <p className="text-xs text-muted-foreground">
                  Daily summary is ready
                </p>
                <p className="text-xs text-muted-foreground mt-1">1 hour ago</p>
              </div>
            </div>
            <div className="p-2 border-t">
              <Button variant="ghost" size="sm" className="w-full" asChild>
                <Link href="/dashboard/announcements">
                  View all notifications
                </Link>
              </Button>
            </div>
          </div>
        )}

        {/* User avatar with dropdown */}
        <div className="relative">
          <Button
            variant="ghost"
            className="flex items-center gap-2 px-2 h-auto py-1.5"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={session.user?.image ?? ""} />
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="hidden sm:flex flex-col items-start">
              <span className="text-sm font-medium truncate max-w-[100px]">
                {userName}
              </span>
              <span className="text-xs text-muted-foreground">{role}</span>
            </div>
            <ChevronDown className="h-3 w-3 text-muted-foreground hidden sm:block" />
          </Button>

          {/* User menu dropdown */}
          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-56 rounded-xl border border-border bg-background shadow-xl z-50">
              <div className="p-3 border-b">
                <p className="font-medium text-sm">{userName}</p>
                <p className="text-xs text-muted-foreground">{userEmail}</p>
              </div>
              <div className="p-1">
                <Link
                  href="/dashboard/settings"
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted text-sm"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <User className="h-4 w-4" />
                  <span>Profile</span>
                </Link>
                <Link
                  href="/dashboard/settings"
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted text-sm"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </Link>
              </div>
              <div className="p-1 border-t">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-red-50 text-red-600 text-sm"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Log out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
