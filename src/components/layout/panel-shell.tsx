"use client";

import {
  CalendarDays,
  CreditCard,
  LayoutDashboard,
  Lock,
  LogOut,
  Menu,
  Sparkles,
  UserRound,
  Receipt,
  Settings,
  TrendingUp,
  Users,
  Wallet,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

import { AppointmentReminder } from "@/components/appointments/reminder";
import { IncomingCallWatcher } from "@/components/call/incoming-call";
import { Avatar, Badge, Button } from "@/components/ui";
import { UlmindCredit } from "@/components/ulmind-credit";
import { cn } from "@/lib/utils";
import { ROLE_LABELS } from "@/types";
import { useAuth } from "@/providers/auth-provider";

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };

const ADMIN_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/astrologers", label: "Astrologers", icon: Users },
  { href: "/wallets", label: "Wallets", icon: Wallet },
  { href: "/transactions", label: "Transactions", icon: Receipt },
  { href: "/payments", label: "Payments", icon: CreditCard },
  { href: "/earnings", label: "Earnings", icon: TrendingUp },
  { href: "/settings", label: "Settings", icon: Settings },
];

const ASTROLOGER_NAV: NavItem[] = [
  { href: "/me", label: "My profile", icon: UserRound },
  { href: "/appointments", label: "Appointments", icon: CalendarDays },
  { href: "/earnings", label: "Earnings", icon: TrendingUp },
  { href: "/me/password", label: "Password", icon: Lock },
];

export function PanelShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => setOpen(false), [pathname]);

  const nav = user?.role === "astrologer" ? ASTROLOGER_NAV : ADMIN_NAV;

  const activeHref = nav
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  const sidebar = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="relative flex h-16 items-center gap-3 border-b border-border/60 px-5">
        <span className="medallion flex size-9 shrink-0 items-center justify-center rounded-xl text-brand-100 shadow-[0_0_16px_-4px_rgb(168_85_247/0.7)]">
          <Sparkles className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate font-display text-sm font-bold leading-tight tracking-wide text-foreground">
            Astra Astrology
          </p>
          <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/80">
            {user ? ROLE_LABELS[user.role] : "Panel"}
          </p>
        </div>
        {/* Subtle hairline accent */}
        <div className="hairline absolute inset-x-0 bottom-0 h-px" aria-hidden />
      </div>

      {/* Nav items */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
          Navigation
        </p>
        {nav.map((item) => {
          const active = item.href === activeHref;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                active
                  ? "nav-active"
                  : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
              )}
            >
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-lg transition-all duration-200",
                  active
                    ? "bg-brand-500/25 text-brand-200"
                    : "text-muted-foreground group-hover:text-foreground",
                )}
              >
                <item.icon className="size-4" />
              </span>
              {item.label}
              {active && (
                <span className="ml-auto size-1.5 rounded-full bg-brand-400" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="border-t border-border/60 p-3">
        <div className="mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 bg-surface-muted/40">
          <Avatar src={user?.avatar_url} name={user?.full_name} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-foreground">{user?.full_name}</p>
            <p className="truncate text-[10px] text-muted-foreground">{user?.email}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-danger hover:bg-danger/10 hover:text-danger rounded-xl"
          onClick={() => signOut()}
        >
          <LogOut className="size-3.5" />
          Sign out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-dvh">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-border/60 bg-night-950/70 backdrop-blur-2xl lg:block">
        <div className="sticky top-0 h-dvh">{sidebar}</div>
      </aside>

      {/* Mobile drawer overlay */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 bg-night-950/75 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          />
          <aside className="absolute inset-y-0 left-0 w-64 border-r border-border/60 bg-night-900 shadow-glow">
            {sidebar}
          </aside>
        </div>
      )}

      {/* Main content area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border/60 bg-night-950/60 px-4 backdrop-blur-xl">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden rounded-xl"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </Button>

          {/* Breadcrumb hint */}
          <div className="hidden items-center gap-2 text-sm text-muted-foreground lg:flex">
            <Sparkles className="size-3.5 text-brand-400" />
            <span className="font-medium text-foreground capitalize">
              {activeHref?.replace("/", "") || "Dashboard"}
            </span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {user && (
              <Badge tone="brand" className="hidden sm:inline-flex">
                {ROLE_LABELS[user.role]}
              </Badge>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>

        <footer className="mt-auto flex justify-center border-t border-border/60 px-4 py-5">
          <UlmindCredit />
        </footer>

        <IncomingCallWatcher />
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
    <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
