"use client";

import {
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
  { href: "/earnings", label: "Earnings", icon: TrendingUp },
  { href: "/me/password", label: "Password", icon: Lock },
];

export function PanelShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => setOpen(false), [pathname]);

  const nav = user?.role === "astrologer" ? ASTROLOGER_NAV : ADMIN_NAV;

  // "/me" is a prefix of "/me/password", so match the most specific item only.
  const activeHref = nav
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2 border-b border-border px-5">
        <span className="medallion flex size-9 items-center justify-center rounded-xl text-brand-100">
          <Sparkles className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate font-display text-sm font-semibold leading-tight tracking-wide">Astra Astrology</p>
          <p className="text-[11px] leading-tight text-muted-foreground">
            {user ? ROLE_LABELS[user.role] : "Panel"}
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {nav.map((item) => {
          const active = item.href === activeHref;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "btn-cosmic text-white"
                  : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <Avatar src={user?.avatar_url} name={user?.full_name} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user?.full_name}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="mt-1 w-full justify-start text-danger hover:bg-danger/15"
          onClick={() => signOut()}
        >
          <LogOut className="size-4" />
          Sign out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-dvh">
      <aside className="hidden w-64 shrink-0 border-r border-border bg-night-950/60 backdrop-blur-xl lg:block">
        <div className="sticky top-0 h-dvh">{sidebar}</div>
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 bg-night-950/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          />
          <aside className="absolute inset-y-0 left-0 w-64 border-r border-border bg-night-900 shadow-glow">
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border bg-night-950/55 px-4 backdrop-blur-xl">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </Button>

          <div className="ml-auto flex items-center gap-2">
            {user && <Badge tone="brand">{ROLE_LABELS[user.role]}</Badge>}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">{children}</main>

        <footer className="mt-auto flex justify-center border-t border-border px-4 py-6">
          <UlmindCredit />
        </footer>

        {/* Rings on every panel page, since a call can arrive at any time. */}
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
    <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </header>
  );
}
