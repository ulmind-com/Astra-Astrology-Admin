"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  CheckCircle2,
  Clock,
  Coins,
  Copy,
  CreditCard,
  ExternalLink,
  Eye,
  Filter,
  Flame,
  HelpCircle,
  IndianRupee,
  MessageCircle,
  Percent,
  Phone,
  Radio,
  Receipt,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  User,
  Users,
  Video,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import * as React from "react";

import { Avatar, LoadingBlock } from "@/components/ui";
import { adminSettingsApi, earningsApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { cn, formatDateTime, timeAgo } from "@/lib/utils";
import { useAuth, useRequireAuth } from "@/providers/auth-provider";
import {
  MODE_LABELS,
  formatCoins,
  formatEarning,
  type AdminEarningRow,
  type ConsultationMode,
} from "@/types";

const MODE_ICONS: Record<ConsultationMode, React.ComponentType<{ className?: string }>> = {
  chat: MessageCircle,
  call: Phone,
  video: Video,
};

function getModeBadge(mode: ConsultationMode) {
  if (mode === "chat") {
    return {
      label: "Live Chat",
      icon: MessageCircle,
      className: "bg-amber-50 text-amber-800 border-amber-200/80",
    };
  }
  if (mode === "call") {
    return {
      label: "Voice Call",
      icon: Phone,
      className: "bg-emerald-50 text-emerald-800 border-emerald-200/80",
    };
  }
  return {
    label: "Video Call",
    icon: Video,
    className: "bg-purple-50 text-purple-800 border-purple-200/80",
  };
}

export default function EarningsPage() {
  const { user } = useAuth();
  const isAstrologer = user?.role === "astrologer";
  const { ready } = useRequireAuth({
    roles: ["astrologer", "admin", "super_admin"],
    signInPath: "/login",
  });

  const [search, setSearch] = React.useState("");
  const [selectedMode, setSelectedMode] = React.useState<ConsultationMode | "">("");
  const [previewRow, setPreviewRow] = React.useState<AdminEarningRow | null>(null);

  // Astrologer Queries
  const mine = useQuery({
    queryKey: ["earnings", "mine"],
    queryFn: earningsApi.summary,
    enabled: ready && isAstrologer,
  });

  const recent = useQuery({
    queryKey: ["earnings", "recent"],
    queryFn: () => earningsApi.recent(50),
    enabled: ready && isAstrologer,
  });

  // Admin Platform Queries
  const platform = useQuery({
    queryKey: ["admin", "earnings"],
    queryFn: adminSettingsApi.earnings,
    enabled: ready && !isAstrologer,
    refetchInterval: 5000,
  });

  const platformRecent = useQuery({
    queryKey: ["admin", "earnings", "recent"],
    queryFn: () => adminSettingsApi.recentEarnings(100),
    enabled: ready && !isAstrologer,
    refetchInterval: 5000,
  });

  if (!ready) return <LoadingBlock />;

  // ──────────────────────────────────────────────────────────────────────────
  // 1. ASTROLOGER VIEW
  // ──────────────────────────────────────────────────────────────────────────
  if (isAstrologer) {
    if (mine.isLoading) return <LoadingBlock label="Loading your earnings…" />;
    if (mine.error) {
      return (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700">
          {(mine.error as ApiError).message}
        </div>
      );
    }
    const data = mine.data;
    if (!data) return null;

    return (
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex size-7.5 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#D97706] to-[#F59E0B] text-white shadow-xs">
              <TrendingUp className="size-4" />
            </span>
            <h2 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-slate-900 leading-tight">
              Consultation Earnings
            </h2>
          </div>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            Real-time breakdown of all payouts credited for your consultations.
          </p>
        </div>

        {/* 4 DealDeck 3D Astrologer Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* Today Card (Hero Gold) */}
          <div className="relative overflow-hidden rounded-[26px] bg-gradient-to-br from-[#B45309] via-[#D97706] to-[#F59E0B] p-5 text-white shadow-[0_14px_30px_-6px_rgba(217,119,6,0.45)] flex flex-col justify-between min-h-[145px]">
            <div className="pointer-events-none absolute -right-6 -bottom-6 size-32 rounded-full bg-white/10 blur-xl" />
            <div className="flex items-center justify-between">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md">
                <Coins className="size-5 text-white stroke-[2.2]" />
              </div>
              <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-black text-white">
                Today
              </span>
            </div>
            <div className="mt-3">
              <p className="text-xs font-semibold text-white/80">Today&apos;s Revenue</p>
              <h3 className="font-display text-3xl font-black tracking-tight text-white leading-none mt-0.5">
                {formatEarning(data.today.earning_paise)}
              </h3>
              <p className="mt-1 text-[10px] font-medium text-white/70">
                {data.today.minutes} {data.today.minutes === 1 ? "min" : "mins"} consulted today
              </p>
            </div>
          </div>

          {/* This Week */}
          <div className="rounded-[26px] bg-white p-5 border border-slate-100/90 shadow-[0_10px_28px_rgba(20,25,45,0.03)] flex flex-col justify-between min-h-[145px]">
            <div className="flex items-center justify-between">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-amber-50 text-[#D97706]">
                <Clock className="size-5 stroke-[2.2]" />
              </div>
              <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                This Week
              </span>
            </div>
            <div className="mt-3">
              <p className="text-xs font-semibold text-slate-400">Weekly Earnings</p>
              <h3 className="font-display text-3xl font-black tracking-tight text-slate-900 leading-none mt-0.5">
                {formatEarning(data.this_week.earning_paise)}
              </h3>
              <p className="mt-1 text-[10px] font-medium text-slate-400">
                {data.this_week.minutes} minutes active
              </p>
            </div>
          </div>

          {/* This Month */}
          <div className="rounded-[26px] bg-white p-5 border border-slate-100/90 shadow-[0_10px_28px_rgba(20,25,45,0.03)] flex flex-col justify-between min-h-[145px]">
            <div className="flex items-center justify-between">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                <TrendingUp className="size-5 stroke-[2.2]" />
              </div>
              <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700">
                This Month
              </span>
            </div>
            <div className="mt-3">
              <p className="text-xs font-semibold text-slate-400">Monthly Earnings</p>
              <h3 className="font-display text-3xl font-black tracking-tight text-slate-900 leading-none mt-0.5">
                {formatEarning(data.this_month.earning_paise)}
              </h3>
              <p className="mt-1 text-[10px] font-medium text-slate-400">
                {data.this_month.minutes} minutes active
              </p>
            </div>
          </div>

          {/* All Time */}
          <div className="rounded-[26px] bg-white p-5 border border-slate-100/90 shadow-[0_10px_28px_rgba(20,25,45,0.03)] flex flex-col justify-between min-h-[145px]">
            <div className="flex items-center justify-between">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="size-5 stroke-[2.2]" />
              </div>
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                Lifetime
              </span>
            </div>
            <div className="mt-3">
              <p className="text-xs font-semibold text-slate-400">Total Lifetime Payout</p>
              <h3 className="font-display text-3xl font-black tracking-tight text-emerald-600 leading-none mt-0.5">
                {formatEarning(data.all_time.earning_paise)}
              </h3>
              <p className="mt-1 text-[10px] font-medium text-slate-400">
                {data.all_time.minutes} total minutes consulted
              </p>
            </div>
          </div>
        </div>

        {/* Astrologer Recent Table */}
        <div className="overflow-hidden rounded-[28px] bg-white border border-slate-100/90 shadow-[0_12px_32px_rgba(20,25,45,0.03)]">
          <div className="p-5 sm:p-6 border-b border-slate-100">
            <h3 className="font-display text-base font-bold text-slate-900">
              Recent Consultations
            </h3>
            <p className="text-xs text-slate-400">
              Chronological log of every consultation session credited to you.
            </p>
          </div>

          {!recent.data || recent.data.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400">
              No consultations completed yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="py-4 pl-6 pr-4">Client</th>
                    <th className="py-4 px-4">When (IST)</th>
                    <th className="py-4 px-4">Session Type</th>
                    <th className="py-4 px-4 text-right">Client Coins</th>
                    <th className="py-4 px-4 text-right">Duration</th>
                    <th className="py-4 pr-6 pl-4 text-right">Credited Payout</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recent.data.map((row) => {
                    const badge = getModeBadge(row.mode);
                    const Icon = badge.icon;
                    return (
                      <tr key={row.id} className="hover:bg-amber-50/20 transition-colors">
                        <td className="py-4 pl-6 pr-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <Avatar
                              src={row.user_avatar || row.user_image_url}
                              name={row.user_name || "Client"}
                              size="sm"
                              className="size-8"
                            />
                            <div>
                              <span className="font-bold text-slate-900 block text-xs">
                                {row.user_name || "Client Consultation"}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                ID: {row.user_id ? `${row.user_id.slice(-6)}` : "—"}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className="font-bold text-slate-900 block">
                            {formatDateTime(row.created_at)}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {timeAgo(row.created_at)}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-bold",
                              badge.className
                            )}
                          >
                            <Icon className="size-3.5" />
                            {badge.label}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right font-mono font-bold text-amber-700">
                          {row.coins_charged != null && row.coins_charged > 0
                            ? `${formatCoins(row.coins_charged)} coins`
                            : "—"}
                        </td>
                        <td className="py-4 px-4 text-right font-mono font-bold text-slate-700">
                          {row.minutes} min
                        </td>
                        <td className="py-4 pr-6 pl-4 text-right font-mono text-sm font-black text-emerald-600">
                          +{formatEarning(row.earning_paise)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 2. ADMIN & SUPER ADMIN VIEW (ULTRA-PRO REVENUE ENGINE)
  // ──────────────────────────────────────────────────────────────────────────
  if (platform.isLoading) return <LoadingBlock label="Loading platform earnings matrix…" />;
  if (platform.error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700">
        {(platform.error as ApiError).message}
      </div>
    );
  }
  const totals = platform.data;
  if (!totals) return null;

  const recentList = platformRecent.data || [];

  // Filtered recent rows by search or mode
  const filteredRows = recentList.filter((row) => {
    const matchesMode = selectedMode ? row.mode === selectedMode : true;
    if (!matchesMode) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      row.astrologer_name?.toLowerCase().includes(q) ||
      row.astrologer_id.toLowerCase().includes(q) ||
      row.id.toLowerCase().includes(q) ||
      MODE_LABELS[row.mode]?.toLowerCase().includes(q)
    );
  });

  const effectiveCommissionPercent =
    totals.gross_paise > 0
      ? Math.round((totals.commission_paise / totals.gross_paise) * 100)
      : 30;

  const effectivePayoutPercent = 100 - effectiveCommissionPercent;

  const chatSessionsCount = recentList.filter((r) => r.mode === "chat").length;
  const callSessionsCount = recentList.filter((r) => r.mode === "call").length;
  const videoSessionsCount = recentList.filter((r) => r.mode === "video").length;

  return (
    <div className="space-y-6">
      {/* ── 1. TOP LIVE REVENUE ENGINE HUD STRIP ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex size-7.5 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#D97706] to-[#F59E0B] text-white shadow-xs">
              <TrendingUp className="size-4" />
            </span>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-slate-900 leading-tight">
                Earnings & Revenue Split
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-700">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-ping" />
                SPLIT ACTIVE
              </span>
            </div>
          </div>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            Real-time consultation revenue engine: Gross billing, platform commission
            take rate & net specialist payouts.
          </p>
        </div>

        {/* Sync Button */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              void platform.refetch();
              void platformRecent.refetch();
            }}
            disabled={platform.isFetching || platformRecent.isFetching}
            className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw
              className={cn(
                "size-3.5",
                (platform.isFetching || platformRecent.isFetching) &&
                  "animate-spin text-[#D97706]"
              )}
            />
            <span>Sync Ledger</span>
          </button>
        </div>
      </div>

      {/* ── 2. CONTINUOUS LIVE REVENUE MARQUEE TICKER WIRE ── */}
      {recentList.length > 0 && (
        <div className="relative overflow-hidden rounded-[22px] bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-2.5 sm:p-3 text-white shadow-lg border border-slate-800/90">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 rounded-xl bg-amber-500/20 px-3 py-1 text-[10px] font-black tracking-wider uppercase text-amber-400 shrink-0 border border-amber-500/30 shadow-inner">
              <Radio className="size-3 animate-pulse text-amber-400" />
              Revenue Wire
            </span>

            {/* Marquee Track */}
            <div className="relative flex-1 overflow-hidden mask-gradient-x">
              <div className="animate-marquee flex items-center gap-8 whitespace-nowrap text-xs font-semibold text-slate-200">
                {[...recentList.slice(0, 8), ...recentList.slice(0, 8)].map(
                  (row, idx) => (
                    <div
                      key={`${row.id}-${idx}`}
                      onClick={() => setPreviewRow(row)}
                      className="group flex items-center gap-2 hover:text-amber-300 transition-colors cursor-pointer shrink-0 py-0.5"
                    >
                      <span className="text-slate-300 font-bold group-hover:text-amber-400">
                        {row.astrologer_name || "Specialist"}
                      </span>

                      {/* Gross and Payout pill */}
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded-md border border-amber-500/30">
                        Gross: {formatEarning(row.gross_paise)}
                      </span>

                      <span className="inline-flex items-center gap-0.5 font-mono text-[11px] font-bold bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded-md border border-emerald-500/30">
                        Paid: +{formatEarning(row.earning_paise)}
                      </span>

                      <span className="text-[11px] text-slate-400">
                        ({MODE_LABELS[row.mode]} • {row.minutes}m)
                      </span>

                      <span className="text-[10px] text-slate-400">
                        ({timeAgo(row.created_at)})
                      </span>

                      <span className="text-slate-700 ml-2">•</span>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. 4 DEALDECK 3D KPI REVENUE SPLIT CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Gross Revenue (Hero Celestial Solar Gold Gradient) */}
        <div className="relative overflow-hidden rounded-[26px] bg-gradient-to-br from-[#B45309] via-[#D97706] to-[#F59E0B] p-5 text-white shadow-[0_14px_30px_-6px_rgba(217,119,6,0.45)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_-6px_rgba(217,119,6,0.6)] flex flex-col justify-between min-h-[155px]">
          <div className="pointer-events-none absolute -right-6 -bottom-6 size-32 rounded-full bg-white/10 blur-xl" />
          <div className="flex items-center justify-between">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md shadow-xs">
              <Banknote className="size-5 text-white stroke-[2.2]" />
            </div>
            <span className="rounded-full bg-white/20 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-black text-white">
              Total Gross
            </span>
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold text-white/80">
              Gross Consultation Revenue
            </p>
            <div className="mt-0.5 flex items-baseline justify-between">
              <h3 className="font-display text-3xl font-black tracking-tight text-white leading-none">
                {formatEarning(totals.gross_paise)}
              </h3>
              <span className="text-[11px] font-bold text-white/90">
                {formatCoins(totals.coins_charged)} Coins
              </span>
            </div>
            <p className="mt-1 text-[10px] font-medium text-white/70">
              Generated across {totals.sessions} consultation sessions
            </p>
          </div>
        </div>

        {/* Card 2: Your Commission (Platform Margin) */}
        <div className="rounded-[26px] bg-white p-5 border border-amber-200/90 shadow-[0_10px_28px_rgba(217,119,6,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(217,119,6,0.12)] flex flex-col justify-between min-h-[155px]">
          <div className="flex items-center justify-between">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-amber-50 text-[#D97706]">
              <Percent className="size-5 stroke-[2.2]" />
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">
              <Zap className="size-3 text-amber-600" />
              {effectiveCommissionPercent}% Platform Cut
            </span>
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold text-slate-400">
              Your Platform Commission
            </p>
            <div className="mt-0.5 flex items-baseline justify-between">
              <h3 className="font-display text-3xl font-black tracking-tight text-[#D97706] leading-none">
                {formatEarning(totals.commission_paise)}
              </h3>
              <span className="text-[10px] font-bold text-amber-700">
                Net Profit
              </span>
            </div>
            <p className="mt-1 text-[10px] font-medium text-slate-400">
              Retained directly from all live astrologer sessions
            </p>
          </div>
        </div>

        {/* Card 3: Paid to Astrologers (Payout) */}
        <div className="rounded-[26px] bg-white p-5 border border-emerald-100/90 shadow-[0_10px_28px_rgba(16,185,129,0.05)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(16,185,129,0.1)] flex flex-col justify-between min-h-[155px]">
          <div className="flex items-center justify-between">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <Wallet className="size-5 stroke-[2.2]" />
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
              <CheckCircle2 className="size-3 text-emerald-600" />
              {effectivePayoutPercent}% Paid Out
            </span>
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold text-slate-400">
              Paid to Astrologers
            </p>
            <div className="mt-0.5 flex items-baseline justify-between">
              <h3 className="font-display text-3xl font-black tracking-tight text-emerald-600 leading-none">
                {formatEarning(totals.payout_paise)}
              </h3>
              <span className="text-[10px] font-bold text-emerald-700">
                Settled
              </span>
            </div>
            <p className="mt-1 text-[10px] font-medium text-slate-400">
              Directly credited to verified specialist wallets
            </p>
          </div>
        </div>

        {/* Card 4: Revenue Split & Mode Dynamics */}
        <div className="rounded-[26px] bg-white p-5 border border-slate-100/90 shadow-[0_10px_28px_rgba(20,25,45,0.03)] flex flex-col justify-between min-h-[155px]">
          <div className="flex items-center justify-between">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <Activity className="size-5 stroke-[2.2]" />
            </div>
            <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700">
              Split Ratio
            </span>
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold text-slate-400">
              Split Breakdown Meter
            </p>
            <div className="mt-0.5 flex items-baseline justify-between">
              <h3 className="font-display text-lg font-black tracking-tight text-slate-900 leading-none">
                {effectiveCommissionPercent}% Cut / {effectivePayoutPercent}% Astrologer
              </h3>
            </div>
            {/* Visual dual progress split bar */}
            <div className="mt-2.5 flex h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="bg-[#D97706]"
                style={{ width: `${effectiveCommissionPercent}%` }}
                title={`Commission: ${effectiveCommissionPercent}%`}
              />
              <div
                className="bg-emerald-500 flex-1"
                title={`Astrologer Payout: ${effectivePayoutPercent}%`}
              />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[10px] font-semibold text-slate-400">
              <span>Platform ({formatEarning(totals.commission_paise)})</span>
              <span>Astrologers ({formatEarning(totals.payout_paise)})</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. SEARCH & SESSION MODE FILTER BAR ── */}
      <div className="space-y-4 rounded-[28px] bg-white p-5 sm:p-6 border border-slate-100/90 shadow-[0_10px_30px_rgba(20,25,45,0.03)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by astrologer name, specialist ID or session mode…"
              className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50/70 pl-10 pr-9 text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/30 focus:border-[#D97706]"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Consultation Mode Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "", label: "All Sessions", count: recentList.length },
              {
                id: "chat",
                label: "💬 Live Chat",
                count: chatSessionsCount,
              },
              {
                id: "call",
                label: "📞 Voice Call",
                count: callSessionsCount,
              },
              {
                id: "video",
                label: "📹 Video Call",
                count: videoSessionsCount,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedMode(tab.id as ConsultationMode | "")}
                className={cn(
                  "flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer",
                  selectedMode === tab.id
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100/80 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900"
                )}
              >
                <span>{tab.label}</span>
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.2 rounded-md font-mono",
                    selectedMode === tab.id
                      ? "bg-white/20 text-white"
                      : "bg-slate-200/60 text-slate-500"
                  )}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── 5. RECENT SESSIONS REVENUE SPLIT TABLE ── */}
      {filteredRows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[28px] bg-white py-16 px-4 text-center border border-slate-100 shadow-sm">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-amber-50 text-[#D97706] mb-3">
            <Receipt className="size-7" />
          </div>
          <h3 className="font-display text-base font-bold text-slate-900">
            No consultations match this filter
          </h3>
          <p className="mt-1 text-xs text-slate-400 max-w-sm">
            Try adjusting your mode filter or search query to view recent sessions.
          </p>
          {(search || selectedMode) && (
            <button
              onClick={() => {
                setSearch("");
                setSelectedMode("");
              }}
              className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
            >
              Reset all filters
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-[28px] bg-white border border-slate-100/90 shadow-[0_12px_32px_rgba(20,25,45,0.03)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-4 pl-6 pr-4">When (IST)</th>
                  <th className="py-4 px-4">Astrologer & Specialist</th>
                  <th className="py-4 px-4">Session & Length</th>
                  <th className="py-4 px-4 text-right">Gross Charged</th>
                  <th className="py-4 px-4 text-right">Commission (Your Cut)</th>
                  <th className="py-4 px-4 text-right">Paid to Astrologer</th>
                  <th className="py-4 pr-6 pl-4 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.map((row) => {
                  const badge = getModeBadge(row.mode);
                  const Icon = badge.icon;

                  return (
                    <tr
                      key={row.id}
                      onClick={() => setPreviewRow(row)}
                      className="group transition-colors hover:bg-amber-50/20 cursor-pointer"
                    >
                      {/* When (IST) */}
                      <td className="py-4 pl-6 pr-4 whitespace-nowrap">
                        <span className="text-slate-800 font-bold text-xs block">
                          {formatDateTime(row.created_at)}
                        </span>
                        <span className="text-[10px] font-semibold text-[#D97706] flex items-center gap-1 mt-0.5">
                          <span className="size-1 rounded-full bg-[#D97706] animate-pulse" />
                          {timeAgo(row.created_at)}
                        </span>
                      </td>

                      {/* Astrologer */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <Avatar
                            name={row.astrologer_name || "Astrologer"}
                            size="sm"
                            className="size-8.5 rounded-xl ring-2 ring-slate-100 object-cover shrink-0"
                          />
                          <div className="min-w-0 max-w-xs">
                            <p className="font-bold text-slate-900 group-hover:text-[#D97706] transition-colors truncate text-xs">
                              {row.astrologer_name || "Specialist"}
                            </p>
                            <span className="font-mono text-[9px] text-slate-400 block truncate">
                              ID: {row.astrologer_id.slice(0, 8)}...
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Session Type & Length */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-bold",
                              badge.className
                            )}
                          >
                            <Icon className="size-3.5" />
                            {badge.label}
                          </span>
                          <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                            {row.minutes} min
                          </span>
                        </div>
                      </td>

                      {/* Gross Charged */}
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <span className="font-mono text-sm font-black text-slate-900 block">
                          {formatEarning(row.gross_paise)}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400">
                          {row.coins_charged} coins
                        </span>
                      </td>

                      {/* Commission (Platform Cut) */}
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <span className="font-mono text-sm font-black text-[#D97706] block">
                          {formatEarning(row.commission_paise)}
                        </span>
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded-md">
                          {row.commission_percent}% Cut
                        </span>
                      </td>

                      {/* Paid Out (Specialist Payout) */}
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <span className="font-mono text-sm font-black text-emerald-600 block">
                          {formatEarning(row.earning_paise)}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-md">
                          {100 - row.commission_percent}% Net
                        </span>
                      </td>

                      {/* Actions */}
                      <td
                        className="py-4 pr-6 pl-4 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => setPreviewRow(row)}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all cursor-pointer"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 6. INTERACTIVE SLIDE-OVER 3D REVENUE SPLIT INSPECTOR ── */}
      {previewRow && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
            onClick={() => setPreviewRow(null)}
          />

          {/* Drawer Container */}
          <div className="relative z-10 flex h-full w-full max-w-lg flex-col bg-white shadow-2xl border-l border-slate-100 overflow-hidden animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="relative p-6 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
              <button
                onClick={() => setPreviewRow(null)}
                className="absolute top-4 right-4 flex size-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>

              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#D97706] to-[#F59E0B] text-white shadow-md">
                  <Percent className="size-6 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-black text-white tracking-tight">
                    Consultation Split Receipt
                  </h3>
                  <p className="text-xs font-semibold text-slate-400">
                    Gross Billing & Payout Settlement Breakdown
                  </p>
                </div>
              </div>

              {/* Big Gross Banner */}
              <div className="mt-5 rounded-2xl bg-white/10 backdrop-blur-md p-4 border border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">
                    Gross User Charge
                  </span>
                  <span className="font-mono text-2xl font-black text-white">
                    {formatEarning(previewRow.gross_paise)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">
                    Session Duration
                  </span>
                  <span className="font-mono text-xl font-bold text-amber-300">
                    {previewRow.minutes} Minutes
                  </span>
                </div>
              </div>
            </div>

            {/* Split Breakdown Waterfall */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs font-semibold scrollbar-thin">
              {/* Specialist Profile */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Astrologer / Specialist
                </span>
                <p className="font-bold text-slate-900 text-sm">
                  {previewRow.astrologer_name || "Specialist"}
                </p>
                <p className="text-[10px] font-mono text-slate-400 break-all">
                  Specialist ID: {previewRow.astrologer_id}
                </p>
              </div>

              {/* Revenue Waterfall Breakdown */}
              <div className="rounded-2xl border border-slate-100 bg-white p-4 space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  3-Way Split Accounting Waterfall
                </span>

                {/* 1. Gross */}
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-slate-400" />
                    <span className="text-slate-600">Total Gross Charged:</span>
                  </div>
                  <span className="font-mono text-sm font-black text-slate-900">
                    {formatEarning(previewRow.gross_paise)}
                  </span>
                </div>

                {/* 2. Platform Cut */}
                <div className="flex items-center justify-between py-2 border-b border-slate-100 bg-amber-50/50 -mx-4 px-4">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-[#D97706]" />
                    <span className="text-amber-900 font-bold">
                      Platform Fee ({previewRow.commission_percent}% Cut):
                    </span>
                  </div>
                  <span className="font-mono text-sm font-black text-[#D97706]">
                    +{formatEarning(previewRow.commission_paise)}
                  </span>
                </div>

                {/* 3. Astrologer Net */}
                <div className="flex items-center justify-between py-2 border-b border-slate-100 bg-emerald-50/50 -mx-4 px-4">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-emerald-500" />
                    <span className="text-emerald-900 font-bold">
                      Astrologer Payout ({100 - previewRow.commission_percent}% Net):
                    </span>
                  </div>
                  <span className="font-mono text-sm font-black text-emerald-600">
                    +{formatEarning(previewRow.earning_paise)}
                  </span>
                </div>

                {/* Visual Ratio */}
                <div className="pt-2">
                  <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="bg-[#D97706]"
                      style={{ width: `${previewRow.commission_percent}%` }}
                      title={`Platform: ${previewRow.commission_percent}%`}
                    />
                    <div
                      className="bg-emerald-500 flex-1"
                      title={`Astrologer: ${100 - previewRow.commission_percent}%`}
                    />
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                    <span>Platform Fee ({previewRow.commission_percent}%)</span>
                    <span>Astrologer ({100 - previewRow.commission_percent}%)</span>
                  </div>
                </div>
              </div>

              {/* Consultation Details */}
              <div className="rounded-2xl border border-slate-100 bg-white p-4 space-y-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Session Logistics
                </span>

                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Consultation Channel:</span>
                  <span className="font-bold text-slate-900">
                    {MODE_LABELS[previewRow.mode]}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">User Coins Deducted:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {previewRow.coins_charged} Coins
                  </span>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-500">Timestamp (IST):</span>
                  <span className="text-slate-800 font-bold">
                    {formatDateTime(previewRow.created_at)}
                  </span>
                </div>
              </div>

              {/* Cryptographic Session ID */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Consultation Ledger ID
                </span>
                <p className="font-mono text-[11px] text-slate-600 break-all select-all">
                  {previewRow.id}
                </p>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-2">
                <ShieldCheck className="size-4 text-emerald-600 shrink-0" />
                <span>
                  Permanent double-entry revenue record. Immutable and audited.
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                Astra Blink Revenue Engine v2.4
              </span>
              <button
                onClick={() => setPreviewRow(null)}
                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Close Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
