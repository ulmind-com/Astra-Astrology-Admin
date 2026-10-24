"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  Building2,
  CheckCircle2,
  Clock,
  Coins,
  Copy,
  CreditCard,
  ExternalLink,
  Eye,
  Filter,
  Flame,
  Globe,
  HelpCircle,
  Pause,
  Play,
  QrCode,
  Radio,
  Receipt,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sparkles,
  TrendingUp,
  User,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Avatar, LoadingBlock, Pagination } from "@/components/ui";
import { adminWalletApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { cn, formatDateTime, timeAgo } from "@/lib/utils";
import { useRequireAuth } from "@/providers/auth-provider";
import {
  PAYMENT_STATUS_LABELS,
  formatCoins,
  formatPaise,
  type PaymentOrder,
  type PaymentOrderStatus,
} from "@/types";

function getMethodBadge(method?: string | null) {
  const m = (method || "").toLowerCase();
  if (m.includes("upi")) {
    return {
      label: "UPI Payment",
      icon: Smartphone,
      className: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
    };
  }
  if (m.includes("netbanking") || m.includes("bank")) {
    return {
      label: "Net Banking",
      icon: Building2,
      className: "bg-indigo-50 text-indigo-700 border-indigo-200/80",
    };
  }
  if (m.includes("card")) {
    return {
      label: "Credit / Debit Card",
      icon: CreditCard,
      className: "bg-amber-50 text-[#D97706] border-amber-200/80",
    };
  }
  if (m.includes("wallet")) {
    return {
      label: "Digital Wallet",
      icon: Wallet,
      className: "bg-cyan-50 text-cyan-700 border-cyan-200/80",
    };
  }
  return {
    label: method ? method.toUpperCase() : "Gateway Order",
    icon: Banknote,
    className: "bg-slate-100 text-slate-700 border-slate-200",
  };
}

function getPackTierName(paise: number) {
  const rs = paise / 100;
  if (rs >= 5000) return "🌟 Celestial Supreme Pack";
  if (rs >= 2000) return "✨ Astral Diamond Pack";
  if (rs >= 1000) return "💎 Golden Astro Pack";
  if (rs >= 500) return "⚡ Growth Booster Pack";
  if (rs >= 200) return "🔮 Quick Reading Pack";
  return "🪙 Starter Astro Pack";
}

export default function PaymentsPage() {
  const { ready } = useRequireAuth({
    roles: ["admin", "super_admin"],
    signInPath: "/login",
  });
  const queryClient = useQueryClient();

  const [page, setPage] = React.useState(1);
  const [status, setStatus] = React.useState<PaymentOrderStatus | "">("");
  const [search, setSearch] = React.useState("");
  const [isLivePolling, setIsLivePolling] = React.useState(true);
  const [previewOrder, setPreviewOrder] = React.useState<PaymentOrder | null>(null);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  // Live telecast auto-polling every 4 seconds
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["admin", "payments", page, status],
    queryFn: () =>
      adminWalletApi.payments({
        page,
        limit: 25,
        status: status || undefined,
      }),
    enabled: ready,
    refetchInterval: isLivePolling ? 4000 : false,
    placeholderData: (previous) => previous,
  });

  const reconcile = useMutation({
    mutationFn: (orderId: string) => adminWalletApi.reconcilePayment(orderId),
    onSuccess: (order) => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "payments"] });
      toast.success(
        `Order verified: Status is ${PAYMENT_STATUS_LABELS[order.status]}.`
      );
    },
    onError: (e: ApiError) => toast.error(e.message),
  });

  const allItems = (data?.items || []) as PaymentOrder[];

  // Local filtered search (by Razorpay ID, email, method, or receipt)
  const filteredItems = React.useMemo(() => {
    if (!search.trim()) return allItems;
    const q = search.toLowerCase();
    return allItems.filter(
      (o) =>
        o.razorpay_order_id?.toLowerCase().includes(q) ||
        o.razorpay_payment_id?.toLowerCase().includes(q) ||
        o.user_email?.toLowerCase().includes(q) ||
        o.user_name?.toLowerCase().includes(q) ||
        o.method?.toLowerCase().includes(q) ||
        o.receipt?.toLowerCase().includes(q) ||
        o.user_id?.toLowerCase().includes(q)
    );
  }, [allItems, search]);

  // Aggregate Financial Metrics
  const totalSettledPaise = React.useMemo(
    () =>
      allItems
        .filter((o) => o.status === "paid")
        .reduce((acc, o) => acc + (o.amount_paise || 0), 0),
    [allItems]
  );

  const totalSettledCoins = React.useMemo(
    () =>
      allItems
        .filter((o) => o.status === "paid")
        .reduce((acc, o) => acc + (o.coins || 0), 0),
    [allItems]
  );

  const paidOrdersCount = allItems.filter((o) => o.status === "paid").length;
  const createdOrdersCount = allItems.filter((o) => o.status === "created").length;
  const failedOrdersCount = allItems.filter((o) => o.status === "failed").length;

  const avgOrderPaise =
    paidOrdersCount > 0 ? Math.round(totalSettledPaise / paidOrdersCount) : 0;

  const upiCount = allItems.filter((o) =>
    o.method?.toLowerCase().includes("upi")
  ).length;
  const netbankingCount = allItems.filter((o) =>
    o.method?.toLowerCase().includes("netbanking")
  ).length;

  const handleCopy = (text: string, id: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  if (!ready) return <LoadingBlock />;

  return (
    <div className="space-y-6">
      {/* ── 1. TOP LIVE CASH TELECAST HUD CONTROL BAR ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex size-7.5 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#D97706] to-[#F59E0B] text-white shadow-xs">
              <Banknote className="size-4" />
            </span>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-slate-900 leading-tight">
                Live Inflow Telecast
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-700">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-ping" />
                GATEWAY LIVE
              </span>
            </div>
          </div>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            Real-time cash inflow radar. Watch who is recharging, how much cash is
            clearing & which packages users are buying.
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
            title="Toggle real-time live cash telecast stream"
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
              {isLivePolling ? "Inflow Stream (4s)" : "Stream Paused"}
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

      {/* ── 2. CONTINUOUS LIVE CASH INFLOW TICKER WIRE ── */}
      {allItems.length > 0 && (
        <div className="relative overflow-hidden rounded-[22px] bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-2.5 sm:p-3 text-white shadow-lg border border-slate-800/90">
          <div className="flex items-center gap-3">
            {/* Live Wire Badge */}
            <span className="flex items-center gap-1.5 rounded-xl bg-emerald-500/20 px-3 py-1 text-[10px] font-black tracking-wider uppercase text-emerald-400 shrink-0 border border-emerald-500/30 shadow-inner">
              <Radio className="size-3 animate-pulse text-emerald-400" />
              Cash Inflow Wire
            </span>

            {/* Marquee Track */}
            <div className="relative flex-1 overflow-hidden mask-gradient-x">
              <div className="animate-marquee flex items-center gap-8 whitespace-nowrap text-xs font-semibold text-slate-200">
                {[...allItems.slice(0, 8), ...allItems.slice(0, 8)].map(
                  (order, idx) => {
                    const isPaid = order.status === "paid";
                    const isCreated = order.status === "created";
                    return (
                      <div
                        key={`${order.id}-${idx}`}
                        onClick={() => setPreviewOrder(order)}
                        className="group flex items-center gap-2 hover:text-emerald-300 transition-colors cursor-pointer shrink-0 py-0.5"
                      >
                        {/* Who */}
                        <span className="text-slate-300 font-bold group-hover:text-amber-400">
                          {order.user_email?.split("@")[0] ||
                            order.user_name ||
                            "Customer"}
                        </span>

                        {/* Amount */}
                        <span
                          className={cn(
                            "inline-flex items-center gap-0.5 font-black font-mono text-[11px] px-1.5 py-0.5 rounded-md",
                            isPaid
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : isCreated
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                          )}
                        >
                          <TrendingUp className="size-3" />
                          {formatPaise(order.amount_paise)}
                        </span>

                        {/* Purpose (Coins minted) */}
                        <span className="text-[11px] text-slate-400">
                          ({formatCoins(order.coins)} coins • {order.method || "Online"})
                        </span>

                        {/* Time */}
                        <span className="text-[10px] text-slate-400">
                          ({timeAgo(order.created_at)})
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

      {/* ── 3. 4 DEALDECK 3D KPI CASH FLOW CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Total Gross Inflow (Hero Solar Gold Gradient) */}
        <div className="relative overflow-hidden rounded-[26px] bg-gradient-to-br from-[#B45309] via-[#D97706] to-[#F59E0B] p-5 text-white shadow-[0_14px_30px_-6px_rgba(217,119,6,0.45)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_-6px_rgba(217,119,6,0.6)] flex flex-col justify-between min-h-[145px]">
          <div className="pointer-events-none absolute -right-6 -bottom-6 size-32 rounded-full bg-white/10 blur-xl" />
          <div className="flex items-center justify-between">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md shadow-xs">
              <Banknote className="size-5 text-white stroke-[2.2]" />
            </div>
            <span className="rounded-full bg-white/20 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-black text-white">
              Settled Cash
            </span>
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold text-white/80">
              Total Inflow Volume
            </p>
            <div className="mt-0.5 flex items-baseline justify-between">
              <h3 className="font-display text-3xl font-black tracking-tight text-white leading-none">
                {formatPaise(totalSettledPaise)}
              </h3>
              <span className="text-[11px] font-bold text-white/90">
                {formatCoins(totalSettledCoins)} Coins
              </span>
            </div>
            <p className="mt-1 text-[10px] font-medium text-white/70">
              Gross real-time deposits collected on platform
            </p>
          </div>
        </div>

        {/* Card 2: Settled & Paid Orders */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            setStatus((prev) => (prev === "paid" ? "" : "paid"));
            setPage(1);
          }}
          className={cn(
            "rounded-[26px] bg-white p-5 border shadow-[0_10px_28px_rgba(20,25,45,0.03)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(20,25,45,0.07)] cursor-pointer group flex flex-col justify-between min-h-[145px]",
            status === "paid"
              ? "border-emerald-400 ring-2 ring-emerald-100 shadow-md"
              : "border-slate-100/90"
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 group-hover:scale-105 transition-transform">
              <CheckCircle2 className="size-5 stroke-[2.2]" />
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
              <TrendingUp className="size-3 text-emerald-600" />
              Settled & Credited
            </span>
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold text-slate-400">
              Successful Payments
            </p>
            <div className="mt-0.5 flex items-baseline justify-between">
              <h3 className="font-display text-3xl font-black tracking-tight text-emerald-600 leading-none">
                {paidOrdersCount}
              </h3>
              <span className="text-[10px] font-bold text-emerald-700">
                {allItems.length > 0
                  ? Math.round((paidOrdersCount / allItems.length) * 100)
                  : 100}
                % Settle Rate
              </span>
            </div>
            <p className="mt-1 text-[10px] font-medium text-slate-400">
              Instant Razorpay verification & coin issuance
            </p>
          </div>
        </div>

        {/* Card 3: In-Flight & Pending Attempts */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            setStatus((prev) => (prev === "created" ? "" : "created"));
            setPage(1);
          }}
          className={cn(
            "rounded-[26px] bg-white p-5 border shadow-[0_10px_28px_rgba(20,25,45,0.03)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(20,25,45,0.07)] cursor-pointer group flex flex-col justify-between min-h-[145px]",
            status === "created"
              ? "border-amber-400 ring-2 ring-amber-100 shadow-md"
              : "border-slate-100/90"
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-amber-50 text-[#D97706] group-hover:scale-105 transition-transform">
              <Clock className="size-5 stroke-[2.2]" />
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">
              <RefreshCw className="size-3 text-amber-600" />
              In-Flight Checkout
            </span>
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold text-slate-400">
              Pending Reconcile
            </p>
            <div className="mt-0.5 flex items-baseline justify-between">
              <h3 className="font-display text-3xl font-black tracking-tight text-[#D97706] leading-none">
                {createdOrdersCount}
              </h3>
              <span className="text-[10px] font-bold text-amber-700">
                1-Click Check
              </span>
            </div>
            <p className="mt-1 text-[10px] font-medium text-slate-400">
              Checkout started • Can be queried from Razorpay
            </p>
          </div>
        </div>

        {/* Card 4: Average Order Value & Rail Distribution */}
        <div className="rounded-[26px] bg-white p-5 border border-slate-100/90 shadow-[0_10px_28px_rgba(20,25,45,0.03)] flex flex-col justify-between min-h-[145px]">
          <div className="flex items-center justify-between">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <Smartphone className="size-5 stroke-[2.2]" />
            </div>
            <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700">
              Payment Rails
            </span>
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold text-slate-400">
              Avg Order Value (AOV)
            </p>
            <div className="mt-0.5 flex items-baseline justify-between">
              <h3 className="font-display text-lg sm:text-xl font-black tracking-tight text-slate-900 leading-none">
                {formatPaise(avgOrderPaise)}
              </h3>
              <span className="text-[10px] font-bold text-slate-500">
                UPI ({upiCount}) • Netbank ({netbankingCount})
              </span>
            </div>
            {/* Visual payment rail breakdown bar */}
            <div className="mt-2.5 flex h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="bg-emerald-500"
                style={{
                  width: `${
                    upiCount + netbankingCount > 0
                      ? (upiCount / (upiCount + netbankingCount)) * 100
                      : 60
                  }%`,
                }}
                title={`UPI: ${upiCount}`}
              />
              <div
                className="bg-indigo-500 flex-1"
                title={`Netbanking: ${netbankingCount}`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. SEARCH & STATUS FILTER BAR ── */}
      <div className="space-y-4 rounded-[28px] bg-white p-5 sm:p-6 border border-slate-100/90 shadow-[0_10px_30px_rgba(20,25,45,0.03)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Razorpay order ID, payment ID, email or receipt…"
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

          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "", label: "All Attempts", count: allItems.length },
              {
                id: "paid",
                label: "Paid & Settled 🟢",
                count: paidOrdersCount,
              },
              {
                id: "created",
                label: "In-Flight ⏳",
                count: createdOrdersCount,
              },
              {
                id: "failed",
                label: "Failed 🔴",
                count: failedOrdersCount,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setStatus(tab.id as PaymentOrderStatus | "");
                  setPage(1);
                }}
                className={cn(
                  "flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer",
                  status === tab.id
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100/80 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900"
                )}
              >
                <span>{tab.label}</span>
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.2 rounded-md font-mono",
                    status === tab.id
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

      {/* ── 5. PAYMENTS MATRIX TABLE ── */}
      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700">
          {(error as ApiError).message}
        </div>
      ) : isLoading && !data ? (
        <LoadingBlock label="Connecting to live cash inflow feed…" />
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[28px] bg-white py-16 px-4 text-center border border-slate-100 shadow-sm">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-amber-50 text-[#D97706] mb-3">
            <CreditCard className="size-7" />
          </div>
          <h3 className="font-display text-base font-bold text-slate-900">
            No payment attempts match this filter
          </h3>
          <p className="mt-1 text-xs text-slate-400 max-w-sm">
            Try resetting your search query or status filter to see other orders.
          </p>
          {(search || status) && (
            <button
              onClick={() => {
                setSearch("");
                setStatus("");
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
                  <th className="py-4 pl-6 pr-4">Cash Inflow & Pack</th>
                  <th className="py-4 px-4">Customer & Account (Ke)</th>
                  <th className="py-4 px-4">Payment Rail & Gateway</th>
                  <th className="py-4 px-4">Settlement Status</th>
                  <th className="py-4 px-4">Exact Time (Kakhon - IST)</th>
                  <th className="py-4 pr-6 pl-4 text-right">Actions & Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((order) => {
                  const isPaid = order.status === "paid";
                  const isCreated = order.status === "created";
                  const isFailed = order.status === "failed";
                  const methodBadge = getMethodBadge(order.method);
                  const MethodIcon = methodBadge.icon;
                  const packName = getPackTierName(order.amount_paise);

                  return (
                    <tr
                      key={order.id}
                      onClick={() => setPreviewOrder(order)}
                      className="group transition-colors hover:bg-amber-50/20 cursor-pointer"
                    >
                      {/* Cash Inflow & Pack Column */}
                      <td className="py-4 pl-6 pr-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <span
                            className={cn(
                              "flex size-10 shrink-0 items-center justify-center rounded-2xl shadow-xs transition-transform group-hover:scale-105",
                              isPaid
                                ? "bg-emerald-50 text-emerald-600 border border-emerald-200/80"
                                : isCreated
                                ? "bg-amber-50 text-[#D97706] border border-amber-200/80"
                                : "bg-rose-50 text-rose-600 border border-rose-200/80"
                            )}
                          >
                            <TrendingUp className="size-5 stroke-[2.4]" />
                          </span>
                          <div>
                            <span className="font-mono text-base font-black text-slate-900 tracking-tight block">
                              {formatPaise(order.amount_paise)}
                            </span>
                            <span className="text-[10px] font-bold text-emerald-700 block mt-0.5">
                              +{formatCoins(order.coins)} Coins ({order.coins_per_rupee}🪙/₹)
                            </span>
                            <span className="text-[9px] font-bold text-slate-400 block mt-0.5">
                              {packName}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Customer & Account Column (Ke) */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <Avatar
                            name={order.user_email || order.user_name || "Customer"}
                            size="sm"
                            className="size-8.5 rounded-xl ring-2 ring-slate-100 object-cover shrink-0"
                          />
                          <div className="min-w-0 max-w-xs">
                            <p className="font-bold text-slate-900 group-hover:text-[#D97706] transition-colors truncate text-xs">
                              {order.user_name ||
                                order.user_email?.split("@")[0] ||
                                "Customer"}
                            </p>
                            <p className="text-[10px] font-semibold text-slate-400 truncate">
                              {order.user_email || "Email hidden"}
                            </p>
                            <span className="font-mono text-[9px] text-slate-400 block truncate">
                              UID: {order.user_id?.slice(0, 8)}...
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Payment Rail & Gateway Details */}
                      <td className="py-4 px-4">
                        <div className="space-y-1 max-w-xs">
                          {/* Rail Badge */}
                          <div className="flex items-center gap-1.5">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10px] font-bold",
                                methodBadge.className
                              )}
                            >
                              <MethodIcon className="size-3" />
                              {methodBadge.label}
                            </span>
                          </div>

                          {/* Razorpay Order ID */}
                          <div className="flex items-center gap-1">
                            <span className="font-mono text-[11px] font-semibold text-slate-700 truncate">
                              {order.razorpay_order_id}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopy(order.razorpay_order_id, order.id);
                              }}
                              className="text-slate-400 hover:text-slate-600 p-0.5"
                              title="Copy Order ID"
                            >
                              {copiedId === order.id ? (
                                <CheckCircle2 className="size-3 text-emerald-600" />
                              ) : (
                                <Copy className="size-3" />
                              )}
                            </button>
                          </div>

                          {/* Failure Reason if any */}
                          {order.failure_reason && (
                            <p className="text-[10px] font-semibold text-rose-600 truncate flex items-center gap-1">
                              <ShieldAlert className="size-3 shrink-0" />
                              {order.failure_reason}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Settlement Status */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div>
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-black",
                              isPaid
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-xs"
                                : isCreated
                                ? "bg-amber-50 text-amber-800 border border-amber-200/80"
                                : "bg-rose-50 text-rose-700 border border-rose-200/80"
                            )}
                          >
                            <span
                              className={cn(
                                "size-1.5 rounded-full",
                                isPaid
                                  ? "bg-emerald-500"
                                  : isCreated
                                  ? "bg-amber-500 animate-pulse"
                                  : "bg-rose-500"
                              )}
                            />
                            {PAYMENT_STATUS_LABELS[order.status]}
                          </span>

                          {order.verified_via && (
                            <span className="text-[10px] font-semibold text-slate-400 block mt-1">
                              via {order.verified_via}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Timestamp (Kakhon - IST) */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="text-slate-800 font-bold text-xs block">
                          {formatDateTime(order.created_at)}
                        </span>
                        <span className="text-[10px] font-semibold text-[#D97706] flex items-center gap-1 mt-0.5">
                          <span className="size-1 rounded-full bg-[#D97706] animate-pulse" />
                          {timeAgo(order.created_at)}
                        </span>
                      </td>

                      {/* Actions & Audit */}
                      <td
                        className="py-4 pr-6 pl-4 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-2">
                          {isCreated && (
                            <button
                              disabled={reconcile.isPending}
                              onClick={() => reconcile.mutate(order.id)}
                              className="flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-900 shadow-xs hover:bg-amber-100 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                              title="Ask Razorpay API if money was debited from user"
                            >
                              <RefreshCw
                                className={cn(
                                  "size-3 text-amber-700",
                                  reconcile.isPending && "animate-spin"
                                )}
                              />
                              <span>Check</span>
                            </button>
                          )}

                          <button
                            onClick={() => setPreviewOrder(order)}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all cursor-pointer"
                          >
                            Inspect
                          </button>
                        </div>
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

      {/* ── 6. INTERACTIVE SLIDE-OVER 3D PAYMENT INSPECTOR DRAWER ── */}
      {previewOrder && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
            onClick={() => setPreviewOrder(null)}
          />

          {/* Drawer Container */}
          <div className="relative z-10 flex h-full w-full max-w-lg flex-col bg-white shadow-2xl border-l border-slate-100 overflow-hidden animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="relative p-6 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
              <button
                onClick={() => setPreviewOrder(null)}
                className="absolute top-4 right-4 flex size-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>

              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex size-11 items-center justify-center rounded-2xl text-white shadow-md",
                    previewOrder.status === "paid"
                      ? "bg-emerald-600"
                      : previewOrder.status === "created"
                      ? "bg-gradient-to-tr from-[#D97706] to-[#F59E0B]"
                      : "bg-rose-600"
                  )}
                >
                  <Banknote className="size-6 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-black text-white tracking-tight">
                    Inflow Payment Receipt
                  </h3>
                  <p className="text-xs font-semibold text-slate-400">
                    Razorpay Gateway Settlement Record
                  </p>
                </div>
              </div>

              {/* Big Cash Amount Banner */}
              <div className="mt-5 rounded-2xl bg-white/10 backdrop-blur-md p-4 border border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">
                    Cash Cleared
                  </span>
                  <span className="font-mono text-2xl font-black text-white">
                    {formatPaise(previewOrder.amount_paise)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">
                    Coins Credited
                  </span>
                  <span className="font-mono text-2xl font-black text-emerald-400">
                    +{formatCoins(previewOrder.coins)} Coins
                  </span>
                </div>
              </div>
            </div>

            {/* Receipt Details Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs font-semibold scrollbar-thin">
              {/* Customer Account */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Customer & Wallet (Ke)
                </span>
                <p className="font-bold text-slate-900 text-sm">
                  {previewOrder.user_name ||
                    previewOrder.user_email ||
                    "Customer"}
                </p>
                <p className="text-[11px] font-semibold text-slate-500">
                  {previewOrder.user_email || "—"}
                </p>
                <p className="text-[10px] font-mono text-slate-400 break-all">
                  User ID: {previewOrder.user_id}
                </p>
              </div>

              {/* Gateway & Order Properties */}
              <div className="rounded-2xl border border-slate-100 bg-white p-4 space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Razorpay Transaction Audit
                </span>

                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Settlement Status:</span>
                  <span
                    className={cn(
                      "font-bold uppercase",
                      previewOrder.status === "paid"
                        ? "text-emerald-600"
                        : previewOrder.status === "created"
                        ? "text-[#B45309]"
                        : "text-rose-600"
                    )}
                  >
                    {PAYMENT_STATUS_LABELS[previewOrder.status]}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Payment Rail:</span>
                  <span className="font-bold text-slate-900">
                    {previewOrder.method?.toUpperCase() || "Standard Gateway"}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Recharge Pack:</span>
                  <span className="font-bold text-slate-900">
                    {getPackTierName(previewOrder.amount_paise)}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Conversion Rate:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {previewOrder.coins_per_rupee} Coin / ₹1
                  </span>
                </div>

                {previewOrder.verified_via && (
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Verification Source:</span>
                    <span className="font-bold text-emerald-700">
                      via {previewOrder.verified_via}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Attempt Started (IST):</span>
                  <span className="text-slate-800 font-bold">
                    {formatDateTime(previewOrder.created_at)}
                  </span>
                </div>

                {previewOrder.paid_at && (
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-500">Paid & Settled (IST):</span>
                    <span className="text-emerald-700 font-bold">
                      {formatDateTime(previewOrder.paid_at)}
                    </span>
                  </div>
                )}
              </div>

              {/* Cryptographic Order and Payment Hashes */}
              <div className="space-y-3">
                {/* Razorpay Order ID */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Razorpay Order ID
                    </span>
                    <button
                      onClick={() =>
                        handleCopy(
                          previewOrder.razorpay_order_id,
                          "order_id_copy"
                        )
                      }
                      className="flex items-center gap-1 text-[10px] font-bold text-[#D97706] hover:text-[#B45309] cursor-pointer"
                    >
                      {copiedId === "order_id_copy" ? (
                        <>
                          <CheckCircle2 className="size-3 text-emerald-600" />
                          <span className="text-emerald-600">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="size-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="font-mono text-[11px] text-slate-700 select-all">
                    {previewOrder.razorpay_order_id}
                  </p>
                </div>

                {/* Razorpay Payment ID if paid */}
                {previewOrder.razorpay_payment_id && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Razorpay Payment ID
                      </span>
                      <button
                        onClick={() =>
                          handleCopy(
                            previewOrder.razorpay_payment_id!,
                            "payment_id_copy"
                          )
                        }
                        className="flex items-center gap-1 text-[10px] font-bold text-[#D97706] hover:text-[#B45309] cursor-pointer"
                      >
                        {copiedId === "payment_id_copy" ? (
                          <>
                            <CheckCircle2 className="size-3 text-emerald-600" />
                            <span className="text-emerald-600">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="size-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="font-mono text-[11px] text-emerald-700 select-all">
                      {previewOrder.razorpay_payment_id}
                    </p>
                  </div>
                )}
              </div>

              {/* Action Reconcile Button in drawer if in-flight */}
              {previewOrder.status === "created" && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Clock className="size-4 text-amber-700" />
                    <span className="font-bold text-amber-900 text-xs">
                      Payment In-Flight
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-800">
                    If the user claims money left their bank account, click below
                    to query Razorpay servers and automatically credit the coins.
                  </p>
                  <button
                    disabled={reconcile.isPending}
                    onClick={() => reconcile.mutate(previewOrder.id)}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#D97706] hover:bg-[#B45309] text-white py-2 text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw
                      className={cn(
                        "size-3.5",
                        reconcile.isPending && "animate-spin"
                      )}
                    />
                    <span>Reconcile with Razorpay Now</span>
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-2">
                <ShieldCheck className="size-4 text-emerald-600 shrink-0" />
                <span>
                  Permanent gateway order ledger. Cryptographically audited.
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                Astra Blink Inflow v2.4
              </span>
              <button
                onClick={() => setPreviewOrder(null)}
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
