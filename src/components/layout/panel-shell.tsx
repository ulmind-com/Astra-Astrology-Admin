"use client";

import {
  Bell,
  CreditCard,
  Home,
  LogOut,
  Menu,
  Receipt,
  ScanFace,
  Search,
  Settings,
  Sparkles,
  TrendingUp,
  UserRound,
  Users,
  Wallet,
  X,
  Zap,
  PanelLeftClose,
  PanelLeftOpen,
  CalendarDays,
  Lock,
  Bot,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

import { AppointmentReminder } from "@/components/appointments/reminder";
import { IncomingCallWatcher } from "@/components/call/incoming-call";
import { Avatar, Button } from "@/components/ui";
import { ThemeToggle } from "@/components/theme-toggle";
import { UlmindCredit } from "@/components/ulmind-credit";
import { playNavFeedback } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const ASTROLOGER_NAV: NavItem[] = [
  { href: "/me", label: "My Profile", icon: UserRound },
  { href: "/appointments", label: "Appointments", icon: CalendarDays },
  { href: "/earnings", label: "Earnings", icon: TrendingUp },
  { href: "/me/password", label: "Password", icon: Lock },
];

const ADMIN_MENU_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/astrologers", label: "Astrologers", icon: Users },
];

const ADMIN_FINANCIAL_NAV: NavItem[] = [
  { href: "/wallets", label: "Wallets", icon: Wallet },
  { href: "/transactions", label: "Transactions", icon: Receipt },
  { href: "/payments", label: "Payments", icon: CreditCard },
  { href: "/earnings", label: "Earnings", icon: TrendingUp },
];

const ADMIN_TOOLS_NAV: NavItem[] = [
  { href: "/ai-knowledge", label: "AI Astrologer Hub", icon: Bot },
  { href: "/feature-pricing", label: "Feature Pricing", icon: Sparkles },
  { href: "/face-rules", label: "Face Rules", icon: ScanFace },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function PanelShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [open, setOpen] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [showProfileMenu, setShowProfileMenu] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(false);
  const [hoveredNav, setHoveredNav] = React.useState<string | null>(null);

  React.useEffect(() => setOpen(false), [pathname]);

  // Load user's collapsed preference safely on mount
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("astra_sidebar_collapsed");
      if (saved !== null) {
        setCollapsed(saved === "true");
      }
    } catch {
      // ignore
    }
  }, []);

  const toggleCollapsed = () => {
    playNavFeedback();
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("astra_sidebar_collapsed", String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const currentDate =
    new Date().toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }) + " (IST)";

  const renderNavGroup = (title: string, items: NavItem[], isMobile = false) => {
    const isIconOnly = collapsed && !isMobile;

    return (
      <div className="space-y-1">
        {isIconOnly ? (
          <div className="my-2.5 h-px w-6 mx-auto bg-slate-100" />
        ) : (
          <p className="px-3 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
            {title}
          </p>
        )}

        <div className={cn("space-y-1", isIconOnly && "flex flex-col items-center")}>
          {items.map((item) => {
            const isActive =
              item.href === "/dashboard" || item.href === "/me"
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(item.href + "/");

            if (isIconOnly) {
              return (
                <div
                  key={item.label}
                  className="relative group flex justify-center py-0.5"
                  onMouseEnter={() => setHoveredNav(item.label)}
                  onMouseLeave={() => setHoveredNav(null)}
                >
                  <Link
                    href={item.href}
                    onClick={() => playNavFeedback()}
                    className={cn(
                      "flex size-11 items-center justify-center rounded-2xl transition-all duration-200 relative",
                      isActive
                        ? "bg-gradient-to-r from-[#D97706] to-[#F59E0B] text-white shadow-[0_8px_20px_-4px_rgba(245,158,11,0.5)] font-bold scale-[1.02]"
                        : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 active:scale-95"
                    )}
                    aria-label={item.label}
                  >
                    <item.icon
                      className={cn(
                        "size-5 stroke-[2] transition-transform group-hover:scale-110",
                        isActive ? "text-white" : "text-slate-400"
                      )}
                    />
                    {isActive && (
                      <span className="absolute right-1 top-1 size-1.5 rounded-full bg-white shadow-sm" />
                    )}
                  </Link>

                  {/* Floating Ultra-Pro Glass Tooltip */}
                  {hoveredNav === item.label && (
                    <div className="absolute left-[54px] top-1/2 -translate-y-1/2 z-50 pointer-events-none whitespace-nowrap rounded-xl bg-[#0F172A] px-3 py-1.5 text-xs font-bold text-white shadow-[0_10px_25px_rgba(0,0,0,0.3)] border border-slate-700/60 animate-in fade-in zoom-in-95 duration-150 flex items-center gap-2">
                      <span>{item.label}</span>
                      {isActive && (
                        <span className="size-1.5 rounded-full bg-amber-400" />
                      )}
                      <div className="absolute -left-1 top-1/2 -translate-y-1/2 size-2 rotate-45 bg-[#0F172A] border-l border-b border-slate-700/60" />
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => playNavFeedback()}
                className={cn(
                  "flex items-center gap-3.5 rounded-2xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-200 group",
                  isActive
                    ? "bg-gradient-to-r from-[#D97706] to-[#F59E0B] text-white shadow-[0_8px_20px_-4px_rgba(245,158,11,0.5)] font-bold scale-[1.01]"
                    : "text-slate-500 hover:bg-slate-100/70 hover:text-slate-900 active:scale-[0.98]"
                )}
              >
                <item.icon
                  className={cn(
                    "size-4.5 stroke-[2] transition-transform group-hover:scale-110",
                    isActive ? "text-white" : "text-slate-400"
                  )}
                />
                <span className="truncate">{item.label}</span>
                {isActive && (
                  <span className="ml-auto size-1.5 rounded-full bg-white shadow-sm" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    );
  };

  const renderSidebarContent = (isMobile = false) => {
    const isIconOnly = collapsed && !isMobile;

    return (
      <div
        className={cn(
          "flex h-full flex-col justify-between transition-all duration-300",
          isIconOnly ? "p-3 py-5" : "p-5"
        )}
      >
        <div className="space-y-6">
          {/* Brand Header */}
          <div
            className={cn(
              "flex items-center justify-between pb-2 border-b border-slate-100 transition-all",
              isIconOnly && "justify-center"
            )}
          >
            {isIconOnly ? (
              <div
                className="relative group flex justify-center py-1"
                onMouseEnter={() => setHoveredNav("brand_logo")}
                onMouseLeave={() => setHoveredNav(null)}
              >
                <button
                  onClick={toggleCollapsed}
                  className="relative flex size-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#B45309] via-[#D97706] to-[#F59E0B] shadow-[0_4px_16px_rgba(217,119,6,0.4)] hover:scale-105 active:scale-95 transition-all cursor-pointer ring-2 ring-transparent hover:ring-amber-200"
                  aria-label="Expand sidebar"
                  title="Click to expand sidebar"
                >
                  <Sparkles className="size-5 text-white" />
                  <span className="absolute -top-0.5 -right-0.5 flex size-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
                  </span>
                </button>

                {hoveredNav === "brand_logo" && (
                  <div className="absolute left-[54px] top-1/2 -translate-y-1/2 z-50 pointer-events-none whitespace-nowrap rounded-xl bg-[#0F172A] px-3 py-1.5 text-xs font-bold text-white shadow-[0_10px_25px_rgba(0,0,0,0.3)] border border-slate-700/60 animate-in fade-in zoom-in-95 duration-150 flex items-center gap-1.5">
                    <span>Astra Astrology • Click to expand</span>
                    <div className="absolute -left-1 top-1/2 -translate-y-1/2 size-2 rotate-45 bg-[#0F172A] border-l border-b border-slate-700/60" />
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between w-full">
                <button
                  onClick={!isMobile ? toggleCollapsed : undefined}
                  className={cn(
                    "group flex items-center gap-2.5 rounded-xl p-1 -m-1 text-left transition-all",
                    !isMobile && "hover:bg-slate-50 cursor-pointer"
                  )}
                  title={!isMobile ? "Click to collapse sidebar" : undefined}
                >
                  <div className="relative flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-[#B45309] via-[#D97706] to-[#F59E0B] shadow-[0_4px_16px_rgba(217,119,6,0.4)] group-hover:scale-105 transition-transform">
                    <Sparkles className="size-5 text-white" />
                    <span className="absolute -top-0.5 -right-0.5 flex size-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-display text-lg font-black tracking-tight text-slate-900 leading-tight">
                      Astra Astrology
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-tight">
                      {user?.role === "astrologer" ? "Astrologer" : "Super Admin"}
                    </span>
                  </div>
                </button>

                {!isMobile ? (
                  <button
                    onClick={toggleCollapsed}
                    className="flex size-7 items-center justify-center rounded-lg text-slate-400 hover:text-[#D97706] hover:bg-amber-50 transition-colors cursor-pointer"
                    aria-label="Collapse sidebar"
                    title="Collapse sidebar to icon-only"
                  >
                    <PanelLeftClose className="size-4 stroke-[2.2]" />
                  </button>
                ) : (
                  <button
                    onClick={() => setOpen(false)}
                    className="rounded-lg p-1 text-slate-400 hover:text-slate-700"
                    aria-label="Close sidebar"
                  >
                    <X className="size-5" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Navigation Sections */}
          {user?.role === "astrologer" ? (
            renderNavGroup("ASTROLOGER PORTAL", ASTROLOGER_NAV, isMobile)
          ) : (
            <>
              {/* Section 1: MENU */}
              {renderNavGroup("MENU", ADMIN_MENU_NAV, isMobile)}

              {/* Section 2: FINANCIAL */}
              {renderNavGroup("FINANCIAL", ADMIN_FINANCIAL_NAV, isMobile)}

              {/* Section 3: TOOLS & SYSTEM */}
              {renderNavGroup("TOOLS & SYSTEM", ADMIN_TOOLS_NAV, isMobile)}
            </>
          )}
        </div>

        {/* Bottom Cluster Card */}
        <div className="mt-auto pt-4 shrink-0">
          {isIconOnly ? (
            <div
              className="relative group flex justify-center py-1"
              onMouseEnter={() => setHoveredNav("cluster_status")}
              onMouseLeave={() => setHoveredNav(null)}
            >
              {user?.role === "astrologer" ? (
                <div
                  className="relative flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] text-white shadow-md border border-slate-800"
                  aria-label="Live Cluster"
                >
                  <Zap className="size-5 text-emerald-400" />
                  <span className="absolute -top-0.5 -right-0.5 flex size-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
                  </span>
                </div>
              ) : (
                <Link
                  href="/astrologers/new"
                  onClick={() => playNavFeedback()}
                  className="relative flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] text-white shadow-md border border-slate-800 transition-all hover:scale-105 hover:border-slate-700 active:scale-95"
                  aria-label="Add Astrologer"
                >
                  <Zap className="size-5 text-emerald-400" />
                  <span className="absolute -top-0.5 -right-0.5 flex size-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
                  </span>
                </Link>
              )}

              {hoveredNav === "cluster_status" && (
                <div className="absolute left-[54px] top-1/2 -translate-y-1/2 z-50 pointer-events-none whitespace-nowrap rounded-xl bg-[#0F172A] px-3 py-2 text-xs text-white shadow-[0_10px_25px_rgba(0,0,0,0.3)] border border-slate-700/60 animate-in fade-in zoom-in-95 duration-150 flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-emerald-400" />
                    <span className="font-bold text-white">Live Cluster v2.4</span>
                  </div>
                  {user?.role !== "astrologer" && (
                    <span className="text-[10px] text-slate-400 font-medium">+ Add Astrologer</span>
                  )}
                  <div className="absolute -left-1 top-1/2 -translate-y-1/2 size-2 rotate-45 bg-[#0F172A] border-l border-b border-slate-700/60" />
                </div>
              )}
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-[22px] bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] p-4 text-white shadow-lg border border-slate-800">
              <div className="relative z-10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                      Live Cluster
                    </span>
                  </div>
                  <span className="rounded-full bg-slate-800/80 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                    v2.4
                  </span>
                </div>

                <div>
                  <h4 className="font-display text-xs font-bold text-white leading-tight">
                    Astra Astrology Core
                  </h4>
                  <p className="mt-0.5 text-[10px] font-medium leading-relaxed text-slate-400">
                    Voice, chat & palm reading engine connected
                  </p>
                </div>

                {user?.role !== "astrologer" && (
                  <Link href="/astrologers/new" onClick={() => playNavFeedback()} className="block pt-1">
                    <button className="w-full rounded-xl bg-gradient-to-r from-[#D97706] to-[#F59E0B] py-2 text-[11px] font-bold text-white shadow-md transition-all duration-200 hover:from-[#B45309] hover:to-[#D97706] active:scale-95 cursor-pointer">
                      + Add Astrologer
                    </button>
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-dvh bg-[#EEF1F8] p-3 sm:p-5 lg:p-7 font-sans text-slate-800 antialiased selection:bg-[#F59E0B] selection:text-slate-950">
      <div className="flex min-h-[calc(100vh-2.5rem)] gap-6">
        {/* Desktop Sidebar */}
        <aside
          className={cn(
            "hidden shrink-0 rounded-[28px] bg-white shadow-[0_10px_35px_rgba(20,25,45,0.03)] border border-slate-100 lg:block transition-[width] duration-300 ease-in-out relative z-30",
            collapsed ? "w-[84px]" : "w-[260px]"
          )}
        >
          <div className="sticky top-7 h-[calc(100vh-3.5rem)] overflow-y-auto overflow-x-hidden no-scrollbar">
            {renderSidebarContent(false)}
          </div>
        </aside>

        {/* Mobile Sidebar Drawer */}
        {open && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
            />
            <aside className="absolute inset-y-0 left-0 w-[270px] bg-white shadow-2xl">
              {renderSidebarContent(true)}
            </aside>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top Floating Header */}
          <header className="mb-6 flex flex-wrap items-center justify-between gap-4 pt-1">
            {/* Left Header */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setOpen(true)}
                className="lg:hidden flex size-10 items-center justify-center rounded-full bg-white shadow-sm border border-slate-100 text-slate-700"
                aria-label="Open sidebar"
              >
                <Menu className="size-5" />
              </button>

              <div>
                <h1 className="font-display text-2xl sm:text-[26px] font-black tracking-tight text-slate-900 leading-tight">
                  {pathname === "/dashboard"
                    ? "Platform Overview"
                    : pathname === "/me"
                    ? "My Astrologer Profile"
                    : pathname === "/me/password"
                    ? "Security & Password"
                    : pathname === "/appointments"
                    ? "Appointments & Sessions"
                    : pathname === "/earnings"
                    ? "Earnings & Payouts"
                    : pathname === "/astrologers"
                    ? "Certified Specialists"
                    : pathname.slice(1).replace("/", " - ").toUpperCase()}
                </h1>
                <p className="mt-0.5 text-xs font-semibold text-slate-400">
                  {currentDate}
                </p>
              </div>
            </div>

            {/* Right Header: Theme Toggle, Search Circle, Bell Circle, User Pill */}
            <div className="flex items-center gap-3">
              {/* Day / Night Theme Toggle */}
              <ThemeToggle />

              {/* Search Circular Button */}
              <div className="relative">
                <button
                  onClick={() => {
                    playNavFeedback();
                    setSearchOpen(!searchOpen);
                  }}
                  aria-label="Search"
                  className="flex size-11 items-center justify-center rounded-full bg-white shadow-[0_4px_16px_rgba(20,25,45,0.04)] border border-slate-100 text-slate-700 transition-all hover:bg-slate-50 hover:scale-105 active:scale-95 cursor-pointer"
                >
                  <Search className="size-4.5 text-slate-600" />
                </button>

                {searchOpen && (
                  <div className="absolute right-0 top-13 z-50 w-72 rounded-2xl bg-white p-3 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
                    <input
                      type="text"
                      placeholder="Search astrologers, wallets, reports..."
                      autoFocus
                      className="w-full rounded-xl bg-slate-50 px-3.5 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
                    />
                  </div>
                )}
              </div>

              {/* Notification Circular Button */}
              <button
                onClick={() => playNavFeedback()}
                aria-label="Notifications"
                className="relative flex size-11 items-center justify-center rounded-full bg-white shadow-[0_4px_16px_rgba(20,25,45,0.04)] border border-slate-100 text-slate-700 transition-all hover:bg-slate-50 hover:scale-105 active:scale-95 cursor-pointer"
              >
                <Bell className="size-4.5 text-slate-600" />
                <span className="absolute top-2.5 right-2.5 size-2 rounded-full bg-[#FF4D4D] ring-2 ring-white" />
              </button>

              {/* User Profile Pill */}
              <div className="relative">
                <button
                  onClick={() => {
                    playNavFeedback();
                    setShowProfileMenu(!showProfileMenu);
                  }}
                  className="flex items-center gap-3 rounded-full bg-white py-1.5 pl-1.5 pr-4 shadow-[0_4px_16px_rgba(20,25,45,0.04)] border border-slate-100 transition-all hover:bg-slate-50 cursor-pointer"
                >
                  <Avatar
                    src={user?.avatar_url}
                    name={user?.full_name || (user?.role === "astrologer" ? "Astrologer" : "Super Admin")}
                    size="sm"
                    className="size-8 rounded-full object-cover"
                  />
                  <div className="text-left">
                    <p className="text-xs font-extrabold text-slate-900 leading-none">
                      {user?.full_name || (user?.role === "astrologer" ? "Astrologer" : "Super Admin")}
                    </p>
                    <p className="mt-0.5 text-[10px] font-semibold text-slate-400 leading-none">
                      {user?.role === "astrologer" ? "Astrologer" : "Super Admin"}
                    </p>
                  </div>
                </button>

                {showProfileMenu && (
                  <div className="absolute right-0 top-13 z-50 w-52 rounded-2xl bg-white p-2 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
                    <div className="px-3 py-2 border-b border-slate-100">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {user?.full_name || "Super Admin"}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {user?.email || "astroapp26@gmail.com"}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        playNavFeedback();
                        signOut();
                      }}
                      className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      <LogOut className="size-3.5" />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Children Dashboard Content */}
          <main className="flex-1 pb-6">{children}</main>

          {/* Footer credit */}
          <footer className="mt-auto flex justify-center py-4">
            <UlmindCredit />
          </footer>

          <IncomingCallWatcher />
          <AppointmentReminder />
        </div>
      </div>
    </div>
  );
}

export function PanelHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h2 className="font-display text-xl font-bold tracking-tight text-slate-900">
          {title}
        </h2>
        {description && (
          <p className="mt-0.5 text-xs font-medium text-slate-400">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
