"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Coins,
  Copy,
  CreditCard,
  ExternalLink,
  Eye,
  Filter,
  Flame,
  HelpCircle,
  MessageSquare,
  Pause,
  PhoneCall,
  Play,
  Radio,
  Receipt,
  RefreshCw,
  Scale,
  Scan,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  User,
  Video,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import * as React from "react";

import { Avatar, LoadingBlock, Pagination } from "@/components/ui";
import { adminWalletApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { cn, formatDateTime, timeAgo } from "@/lib/utils";
import { useRequireAuth } from "@/providers/auth-provider";
import {
  TRANSACTION_REASON_LABELS,
  formatCoins,
  formatPaise,
  type AdminTransaction,
  type TransactionDirection,
  type TransactionReason,
} from "@/types";

export default function TransactionsPage() {
  const { ready } = useRequireAuth({
    roles: ["admin", "super_admin"],
    signInPath: "/login",
  });

  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState("");
  const [reason, setReason] = React.useState<TransactionReason | "">("");
  const [direction, setDirection] = React.useState<TransactionDirection | "">("");
  const [isLivePolling, setIsLivePolling] = React.useState(true);
  const [previewTxn, setPreviewTxn] = React.useState<AdminTransaction | null>(null);
  const [copiedHash, setCopiedHash] = React.useState(false);

  // Auto-polling query: updates every 4 seconds when isLivePolling is true
  const { data, isLoading, isFetching, error, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["admin", "transactions", page, reason, direction],
    queryFn: () =>
      adminWalletApi.transactions({
        page,
        limit: 25,
        reason: reason || undefined,
        direction: direction || undefined,
      }),
    enabled: ready,
    refetchInterval: isLivePolling ? 4000 : false,
    placeholderData: (previous) => previous,
  });

  const allItems = data?.items || [];

  // Filtered by local search query if provided
  const filteredItems = React.useMemo(() => {
    if (!search.trim()) return allItems;
    const q = search.toLowerCase();
    return allItems.filter(
      (txn) =>
        txn.user_email?.toLowerCase().includes(q) ||
        txn.note?.toLowerCase().includes(q) ||
        txn.reason?.toLowerCase().includes(q) ||
        txn.id.toLowerCase().includes(q)
    );
  }, [allItems, search]);

  // Aggregate Metrics for Live Stream
  const totalVolume = React.useMemo(
    () => allItems.reduce((acc, txn) => acc + (txn.amount_coins || 0), 0),
    [allItems]
  );
  const totalDebits = React.useMemo(
    () =>
      allItems
        .filter((t) => t.direction === "debit")
        .reduce((acc, t) => acc + (t.amount_coins || 0), 0),
    [allItems]
  );
  const totalCredits = React.useMemo(
    () =>
      allItems
        .filter((t) => t.direction === "credit")
        .reduce((acc, t) => acc + (t.amount_coins || 0), 0),
    [allItems]
  );

  const debitTxnsCount = allItems.filter((t) => t.direction === "debit").length;
  const creditTxnsCount = allItems.filter((t) => t.direction === "credit").length;

  // Breakdown of "Kothay Urache" (Where they are spending)
  const palmScanCount = allItems.filter((t) =>
    t.note?.toLowerCase().includes("palm")
  ).length;
  const chatCount = allItems.filter(
    (t) => t.reason === "consultation" && !t.note?.toLowerCase().includes("palm")
  ).length;
  const rechargeCount = allItems.filter((t) => t.reason === "recharge").length;

  const handleCopyHash = (hash: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(hash);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    }
  };

  if (!ready) return <LoadingBlock />;

  return (
    <div className="space-y-6">
      {/* ── 1. TOP LIVE TELECAST HUD CONTROL BAR ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex size-7.5 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#D97706] to-[#F59E0B] text-white shadow-xs">
              <Zap className="size-4" />
            </span>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-slate-900 leading-tight">
                Live Ledger Telecast
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200/80 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-rose-600">
                <span className="size-1.5 rounded-full bg-rose-500 animate-ping" />
                ON-AIR
              </span>
            </div>
          </div>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            Real-time money velocity radar. Watch who is spending, consulting &
            recharging across Astra Blink live.
          </p>
        </div>

        {/* Telecast Controls & Auto-Polling Switch */}
        <div className="flex items-center gap-2.5">
          {/* Live Telecast Radar Toggle Button */}
          <button
            onClick={() => setIsLivePolling((prev) => !prev)}
            className={cn(
              "flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-bold transition-all shadow-xs cursor-pointer",
              isLivePolling
                ? "bg-slate-900 text-white border border-slate-800"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            )}
            title="Toggle real-time live telecast stream"
          >
            <span className="relative flex size-2.5">
              {isLivePolling && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              )}
              <span
                className={cn(
                  "relative inline-flex size-2.5 rounded-full",
                  isLivePolling ? "bg-emerald-500" : "bg-slate-400"
                )}
              />
            </span>
            <span>
              {isLivePolling ? "Live Telecast (4s)" : "Telecast Paused"}
            </span>
            {isLivePolling ? (
              <Pause className="size-3 text-slate-400 ml-0.5" />
            ) : (
              <Play className="size-3 text-[#D97706] ml-0.5" />
            )}
          </button>

          {/* Manual Radar Sync Button */}
          <button
            onClick={() => void refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw
              className={cn(
                "size-3.5",
                isFetching ? "animate-spin text-[#D97706]" : "text-slate-400"
              )}
            />
            <span className="hidden sm:inline">Sync Now</span>
          </button>
        </div>
      </div>

      {/* ── 2. CONTINUOUS LIVE TELECAST TICKER MARQUEE ── */}
      {allItems.length > 0 && (
        <div className="relative overflow-hidden rounded-[22px] bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-2.5 sm:p-3 text-white shadow-lg border border-slate-800/90">
          <div className="flex items-center gap-3">
            {/* Live Wire Badge */}
            <span className="flex items-center gap-1.5 rounded-xl bg-amber-500/20 px-3 py-1 text-[10px] font-black tracking-wider uppercase text-amber-400 shrink-0 border border-amber-500/30 shadow-inner">
              <Radio className="size-3 animate-pulse text-amber-400" />
              Live Wire
            </span>

            {/* Marquee Track (Smooth looping marquee) */}
            <div className="relative flex-1 overflow-hidden mask-gradient-x">
              <div className="animate-marquee flex items-center gap-8 whitespace-nowrap text-xs font-semibold text-slate-200">
                {/* Render items twice for infinite loop */}
                {[...allItems.slice(0, 8), ...allItems.slice(0, 8)].map(
                  (txn, idx) => {
                    const isCredit = txn.direction === "credit";
                    const isPalm = txn.note?.toLowerCase().includes("palm");
                    const isChat = txn.note?.toLowerCase().includes("chat");
                    return (
                      <div
                        key={`${txn.id}-${idx}`}
                        onClick={() => setPreviewTxn(txn)}
                        className="group flex items-center gap-2 hover:text-amber-300 transition-colors cursor-pointer shrink-0 py-0.5"
                      >
                        {/* Who */}
                        <span className="text-slate-300 font-bold group-hover:text-amber-400">
                          {txn.user_email?.split("@")[0] || "User"}
                        </span>

                        {/* Otha / Nama Delta */}
                        <span
                          className={cn(
                            "inline-flex items-center gap-0.5 font-black font-mono text-[11px] px-1.5 py-0.5 rounded-md",
                            isCredit
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          )}
                        >
                          {isCredit ? (
                            <ArrowUpRight className="size-3" />
                          ) : (
                            <ArrowDownRight className="size-3" />
                          )}
                          {isCredit ? "+" : "-"}
                          {formatCoins(txn.amount_coins)} coins
                        </span>

                        {/* Where ("Kothay Urache") */}
                        <span className="text-[11px] text-slate-400">
                          {isPalm
                            ? "Palm reading scan"
                            : isChat
                            ? "Astro Chat"
                            : txn.note || TRANSACTION_REASON_LABELS[txn.reason]}
                        </span>

                        {/* Relative time */}
                        <span className="text-[10px] text-slate-400">
                          ({timeAgo(txn.created_at)})
                        </span>

                        <span className="text-slate-700 ml-2">•</span>
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. 4 DEALDECK 3D KPI FLOW CARDS (OTHA / NAMA / URACHE) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Total Flow Velocity (Hero Solar Gold Gradient) */}
        <div className="relative overflow-hidden rounded-[26px] bg-gradient-to-br from-[#B45309] via-[#D97706] to-[#F59E0B] p-5 text-white shadow-[0_14px_30px_-6px_rgba(217,119,6,0.45)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_-6px_rgba(217,119,6,0.6)] flex flex-col justify-between min-h-[145px]">
          <div className="pointer-events-none absolute -right-6 -bottom-6 size-32 rounded-full bg-white/10 blur-xl" />
          <div className="flex items-center justify-between">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md shadow-xs">
              <Coins className="size-5 text-white stroke-[2.2]" />
            </div>
            <span className="rounded-full bg-white/20 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-black text-white">
              Ledger Telecast
            </span>
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold text-white/80">
              Live Coin Velocity
            </p>
            <div className="mt-0.5 flex items-baseline justify-between">
              <h3 className="font-display text-3xl font-black tracking-tight text-white leading-none">
                {formatCoins(totalVolume)}
              </h3>
              <span className="text-[11px] font-bold text-white/90">
                ≈ ₹{formatCoins(totalVolume)}
              </span>
            </div>
            <p className="mt-1 text-[10px] font-medium text-white/70">
              Total volume streaming across {allItems.length} events
            </p>
          </div>
        </div>

        {/* Card 2: Outflow / Coins Spent ("Urache" ↘ Debits / Nama) */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            setDirection((prev) => (prev === "debit" ? "" : "debit"));
            setPage(1);
          }}
          className={cn(
            "rounded-[26px] bg-white p-5 border shadow-[0_10px_28px_rgba(20,25,45,0.03)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(20,25,45,0.07)] cursor-pointer group flex flex-col justify-between min-h-[145px]",
            direction === "debit"
              ? "border-amber-400 ring-2 ring-amber-100 shadow-md"
              : "border-slate-100/90"
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 group-hover:scale-105 transition-transform">
              <ArrowDownRight className="size-5 stroke-[2.2]" />
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">
              <TrendingDown className="size-3 text-amber-600" />
              Spent / Urache (Nama)
            </span>
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold text-slate-400">
              Consultations & Scans
            </p>
            <div className="mt-0.5 flex items-baseline justify-between">
              <h3 className="font-display text-3xl font-black tracking-tight text-[#D97706] leading-none">
                -{formatCoins(totalDebits)}
              </h3>
              <span className="text-[10px] font-bold text-amber-700">
                {debitTxnsCount} spend events
              </span>
            </div>
            <p className="mt-1 text-[10px] font-medium text-slate-400">
              Coins spent on live consultations & biometric scans
            </p>
          </div>
        </div>

        {/* Card 3: Inflow / Deposits ("Otha" ↗ Credits) */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            setDirection((prev) => (prev === "credit" ? "" : "credit"));
            setPage(1);
          }}
          className={cn(
            "rounded-[26px] bg-white p-5 border shadow-[0_10px_28px_rgba(20,25,45,0.03)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(20,25,45,0.07)] cursor-pointer group flex flex-col justify-between min-h-[145px]",
            direction === "credit"
              ? "border-emerald-400 ring-2 ring-emerald-100 shadow-md"
              : "border-slate-100/90"
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 group-hover:scale-105 transition-transform">
              <ArrowUpRight className="size-5 stroke-[2.2]" />
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
              <TrendingUp className="size-3 text-emerald-600" />
              Deposits / Inflow (Otha)
            </span>
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold text-slate-400">
              Recharges & Top-ups
            </p>
            <div className="mt-0.5 flex items-baseline justify-between">
              <h3 className="font-display text-3xl font-black tracking-tight text-emerald-600 leading-none">
                +{formatCoins(totalCredits)}
              </h3>
              <span className="text-[10px] font-bold text-emerald-700">
                {creditTxnsCount} deposits
              </span>
            </div>
            <p className="mt-1 text-[10px] font-medium text-slate-400">
              User recharges, promo credits & wallet adjustments
            </p>
          </div>
        </div>

        {/* Card 4: Top Channel Live Activity ("Kothay Beshi Urache") */}
        <div className="rounded-[26px] bg-white p-5 border border-slate-100/90 shadow-[0_10px_28px_rgba(20,25,45,0.03)] flex flex-col justify-between min-h-[145px]">
          <div className="flex items-center justify-between">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <Flame className="size-5 stroke-[2.2]" />
            </div>
            <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700">
              Kothay Urache
            </span>
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold text-slate-400">
              Live Session Hotspot
            </p>
            <div className="mt-0.5 flex items-baseline justify-between">
              <h3 className="font-display text-lg sm:text-xl font-black tracking-tight text-slate-900 leading-none">
                Palm Scans ({palmScanCount})
              </h3>
              <span className="text-[10px] font-bold text-slate-500">
                Chat ({chatCount})
              </span>
            </div>
            {/* Visual breakdown bar */}
            <div className="mt-2.5 flex h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="bg-purple-500"
                style={{
                  width: `${
                    palmScanCount + chatCount > 0
                      ? (palmScanCount / (palmScanCount + chatCount)) * 100
                      : 50
                  }%`,
                }}
                title={`Palm Scans: ${palmScanCount}`}
              />
              <div
                className="bg-amber-400 flex-1"
                title={`Chat Consultations: ${chatCount}`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. SEARCH & FLOW DIRECTION FILTER BAR ── */}
      <div className="space-y-4 rounded-[28px] bg-white p-5 sm:p-6 border border-slate-100/90 shadow-[0_10px_30px_rgba(20,25,45,0.03)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search user email, note, reason or txn ID…"
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

          {/* Direction Flow Pills (Otha / Nama) */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "", label: "All Movements", count: allItems.length },
              {
                id: "debit",
                label: "Spent ↘ (Urache)",
                count: debitTxnsCount,
              },
              {
                id: "credit",
                label: "Added ↗ (Otha)",
                count: creditTxnsCount,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setDirection(tab.id as TransactionDirection | "");
                  setPage(1);
                }}
                className={cn(
                  "flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer",
                  direction === tab.id
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100/80 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900"
                )}
              >
                <span>{tab.label}</span>
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.2 rounded-md font-mono",
                    direction === tab.id
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

        {/* Reason / Channel Pills Carousel ("Kothay Urache") */}
        <div className="border-t border-slate-100 pt-3.5">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
            <span className="shrink-0 text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
              <Filter className="size-3" />
              Channel:
            </span>
            <button
              onClick={() => {
                setReason("");
                setPage(1);
              }}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1 text-xs font-bold transition-all cursor-pointer",
                reason === ""
                  ? "bg-gradient-to-r from-[#D97706] to-[#F59E0B] text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
              )}
            >
              All Channels
            </button>
            {Object.entries(TRANSACTION_REASON_LABELS).map(([val, label]) => {
              const active = reason === val;
              return (
                <button
                  key={val}
                  onClick={() => {
                    setReason(val as TransactionReason);
                    setPage(1);
                  }}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1 text-xs font-bold transition-all cursor-pointer",
                    active
                      ? "bg-gradient-to-r from-[#D97706] to-[#F59E0B] text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900"
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── 5. LIVE LEDGER TELECAST TABLE ── */}
      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700">
          {(error as ApiError).message}
        </div>
      ) : isLoading && !data ? (
        <LoadingBlock label="Connecting to live ledger telecast stream…" />
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[28px] bg-white py-16 px-4 text-center border border-slate-100 shadow-sm">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-amber-50 text-[#D97706] mb-3">
            <Receipt className="size-7" />
          </div>
          <h3 className="font-display text-base font-bold text-slate-900">
            No live transactions match this filter
          </h3>
          <p className="mt-1 text-xs text-slate-400 max-w-sm">
            Try adjusting your direction or channel filters to see the live
            ledger stream.
          </p>
          {(search || reason || direction) && (
            <button
              onClick={() => {
                setSearch("");
                setReason("");
                setDirection("");
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
                  <th className="py-4 pl-6 pr-4">Flow Velocity (Otha / Nama)</th>
                  <th className="py-4 px-4">User & Identity (Ke)</th>
                  <th className="py-4 px-4">Service Destination (Kothay Urache)</th>
                  <th className="py-4 px-4 text-right">Wallet Shift (Before → After)</th>
                  <th className="py-4 px-4">Exact Time (Kakhon - IST)</th>
                  <th className="py-4 pr-6 pl-4 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((txn) => {
                  const isCredit = txn.direction === "credit";
                  const isPalm = txn.note?.toLowerCase().includes("palm");
                  const isChat = txn.note?.toLowerCase().includes("chat");
                  const isCall = txn.note?.toLowerCase().includes("call");

                  // Calculate balance before transaction for visual jump
                  const balanceBefore = isCredit
                    ? txn.balance_after_coins - txn.amount_coins
                    : txn.balance_after_coins + txn.amount_coins;

                  return (
                    <tr
                      key={txn.id}
                      onClick={() => setPreviewTxn(txn)}
                      className="group transition-colors hover:bg-amber-50/20 cursor-pointer"
                    >
                      {/* Flow & Amount Column (Otha / Nama) */}
                      <td className="py-4 pl-6 pr-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={cn(
                              "flex size-9.5 shrink-0 items-center justify-center rounded-2xl shadow-xs transition-transform group-hover:scale-105",
                              isCredit
                                ? "bg-emerald-50 text-emerald-600 border border-emerald-200/80"
                                : "bg-amber-50 text-[#D97706] border border-amber-200/80"
                            )}
                          >
                            {isCredit ? (
                              <ArrowUpRight className="size-5 stroke-[2.5]" />
                            ) : (
                              <ArrowDownRight className="size-5 stroke-[2.5]" />
                            )}
                          </span>
                          <div>
                            <span
                              className={cn(
                                "font-mono text-sm font-black tracking-tight",
                                isCredit ? "text-emerald-600" : "text-[#B45309]"
                              )}
                            >
                              {isCredit ? "+" : "-"}
                              {formatCoins(txn.amount_coins)} coins
                            </span>
                            <span
                              className={cn(
                                "text-[10px] font-bold block",
                                isCredit ? "text-emerald-700" : "text-amber-800"
                              )}
                            >
                              {isCredit
                                ? "↗ Added / Deposit (Otha)"
                                : "↘ Spent / Outflow (Urache)"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* User Column (Ke) */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <Avatar
                            name={txn.user_email || "User"}
                            size="sm"
                            className="size-8.5 rounded-xl ring-2 ring-slate-100 object-cover shrink-0"
                          />
                          <div className="min-w-0 max-w-xs">
                            <p className="font-bold text-slate-900 group-hover:text-[#D97706] transition-colors truncate text-xs">
                              {txn.user_email?.split("@")[0] || "Anonymous User"}
                            </p>
                            <p className="text-[10px] font-semibold text-slate-400 truncate">
                              {txn.user_email || "—"}
                            </p>
                            <span className="font-mono text-[9px] text-slate-400 block truncate">
                              UID: {txn.user_id?.slice(0, 8)}...
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Service / Channel Column (Kothay Urache) */}
                      <td className="py-4 px-4">
                        <div className="flex items-start gap-2.5 max-w-xs">
                          <span
                            className={cn(
                              "mt-0.5 flex size-7 items-center justify-center rounded-xl shrink-0",
                              isPalm
                                ? "bg-purple-50 text-purple-600"
                                : isChat
                                ? "bg-amber-50 text-[#D97706]"
                                : isCall
                                ? "bg-emerald-50 text-emerald-600"
                                : "bg-slate-100 text-slate-600"
                            )}
                          >
                            {isPalm ? (
                              <Scan className="size-4" />
                            ) : isChat ? (
                              <MessageSquare className="size-4" />
                            ) : isCall ? (
                              <PhoneCall className="size-4" />
                            ) : (
                              <Receipt className="size-4" />
                            )}
                          </span>
                          <div className="min-w-0">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-lg px-2 py-0.5 text-[10px] font-bold",
                                isPalm
                                  ? "bg-purple-100/70 text-purple-800"
                                  : isChat
                                  ? "bg-amber-100/70 text-amber-900"
                                  : "bg-slate-100 text-slate-700"
                              )}
                            >
                              {isPalm
                                ? "Palm Reading Scan"
                                : isChat
                                ? "Live Astro Chat"
                                : TRANSACTION_REASON_LABELS[txn.reason] ||
                                  txn.reason}
                            </span>
                            {txn.note && (
                              <p className="text-[11px] font-semibold text-slate-700 truncate mt-0.5">
                                {txn.note}
                              </p>
                            )}
                            {txn.amount_paise != null && (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/50 px-1.5 py-0.2 rounded-md inline-block mt-0.5">
                                Paid {formatPaise(txn.amount_paise)}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Wallet Shift (Before → After Balance Otha / Nama) */}
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <div className="flex flex-col items-end">
                          <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400">
                            <span>{formatCoins(balanceBefore)}</span>
                            <span className="text-slate-300">→</span>
                            <span className="font-bold text-slate-900 text-xs">
                              {formatCoins(txn.balance_after_coins)}
                            </span>
                          </div>
                          <span className="text-[10px] font-semibold text-slate-400 mt-0.5">
                            {formatCoins(txn.balance_after_coins)} coins left
                          </span>
                        </div>
                      </td>

                      {/* Timestamp (Kakhon - IST) */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="text-slate-800 font-bold text-xs block">
                          {formatDateTime(txn.created_at)}
                        </span>
                        <span className="text-[10px] font-semibold text-[#D97706] flex items-center gap-1">
                          <span className="size-1 rounded-full bg-[#D97706] animate-pulse" />
                          {timeAgo(txn.created_at)}
                        </span>
                      </td>

                      {/* Inspect Receipt Column */}
                      <td
                        className="py-4 pr-6 pl-4 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => setPreviewTxn(txn)}
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

          {/* Pagination */}
          {data?.meta && (
            <div className="p-4 border-t border-slate-100 bg-slate-50/50">
              <Pagination meta={data.meta} onPage={setPage} />
            </div>
          )}
        </div>
      )}

      {/* ── 6. INTERACTIVE SLIDE-OVER 3D RECEIPT INSPECTOR ── */}
      {previewTxn && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
            onClick={() => setPreviewTxn(null)}
          />

          {/* Drawer Container */}
          <div className="relative z-10 flex h-full w-full max-w-lg flex-col bg-white shadow-2xl border-l border-slate-100 overflow-hidden animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="relative p-6 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
              <button
                onClick={() => setPreviewTxn(null)}
                className="absolute top-4 right-4 flex size-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>

              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex size-11 items-center justify-center rounded-2xl text-white shadow-md",
                    previewTxn.direction === "credit"
                      ? "bg-emerald-600"
                      : "bg-gradient-to-tr from-[#D97706] to-[#F59E0B]"
                  )}
                >
                  <Receipt className="size-6 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-black text-white tracking-tight">
                    Transaction Receipt
                  </h3>
                  <p className="text-xs font-semibold text-slate-400">
                    Immutable Double-Entry Ledger Record
                  </p>
                </div>
              </div>

              {/* Big Amount Banner with Delta & INR */}
              <div className="mt-5 rounded-2xl bg-white/10 backdrop-blur-md p-4 border border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">
                    Flow Delta (Otha / Nama)
                  </span>
                  <span
                    className={cn(
                      "font-mono text-2xl font-black",
                      previewTxn.direction === "credit"
                        ? "text-emerald-400"
                        : "text-amber-400"
                    )}
                  >
                    {previewTxn.direction === "credit" ? "+" : "-"}
                    {formatCoins(previewTxn.amount_coins)} Coins
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">
                    Equivalent INR
                  </span>
                  <span className="font-extrabold text-white text-base">
                    ₹{formatCoins(previewTxn.amount_coins)}
                  </span>
                </div>
              </div>
            </div>

            {/* Receipt Details Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs font-semibold scrollbar-thin">
              {/* User Account */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  User Account (Ke)
                </span>
                <p className="font-bold text-slate-900 text-sm">
                  {previewTxn.user_email || "Anonymous User"}
                </p>
                <p className="text-[10px] font-mono text-slate-400 break-all">
                  User ID: {previewTxn.user_id}
                </p>
              </div>

              {/* Transaction Properties */}
              <div className="rounded-2xl border border-slate-100 bg-white p-4 space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Service & Channel Breakdown (Kothay Urache)
                </span>

                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Service Reason:</span>
                  <span className="font-bold text-slate-900">
                    {TRANSACTION_REASON_LABELS[previewTxn.reason]}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Session Note:</span>
                  <span className="font-bold text-slate-900">
                    {previewTxn.note || "Standard session"}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Flow Direction:</span>
                  <span
                    className={cn(
                      "font-bold uppercase",
                      previewTxn.direction === "credit"
                        ? "text-emerald-600"
                        : "text-[#B45309]"
                    )}
                  >
                    {previewTxn.direction === "credit"
                      ? "Inflow / Deposit (Otha)"
                      : "Outflow / Spent (Urache)"}
                  </span>
                </div>

                {/* Balance Shift Card */}
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Balance Remaining:</span>
                  <span className="font-mono font-black text-slate-900 text-sm">
                    {formatCoins(previewTxn.balance_after_coins)} coins
                  </span>
                </div>

                {previewTxn.amount_paise != null && (
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Cash Paid:</span>
                    <span className="font-bold text-emerald-700">
                      {formatPaise(previewTxn.amount_paise)}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-500">Exact Time (IST):</span>
                  <span className="text-slate-800 font-bold">
                    {formatDateTime(previewTxn.created_at)}
                  </span>
                </div>
              </div>

              {/* Cryptographic ID Box with 1-Click Copy */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Audit Transaction Hash
                  </span>
                  <button
                    onClick={() => handleCopyHash(previewTxn.id)}
                    className="flex items-center gap-1 text-[10px] font-bold text-[#D97706] hover:text-[#B45309] cursor-pointer"
                  >
                    {copiedHash ? (
                      <>
                        <CheckCircle2 className="size-3 text-emerald-600" />
                        <span className="text-emerald-600">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="size-3" />
                        <span>Copy Hash</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="font-mono text-[11px] text-slate-600 break-all select-all">
                  {previewTxn.id}
                </p>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-2">
                <ShieldCheck className="size-4 text-emerald-600 shrink-0" />
                <span>
                  Permanent double-entry ledger entry. Immutable and cryptographically
                  verified.
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                Astra Blink Core Ledger v2.4
              </span>
              <button
                onClick={() => setPreviewTxn(null)}
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
