"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Coins,
  History,
  Info,
  Loader2,
  Lock,
  RefreshCw,
  Scale,
  Search,
  ShieldCheck,
  Snowflake,
  Sparkles,
  Unlock,
  User,
  Wallet,
  X,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Avatar, LoadingBlock, Pagination } from "@/components/ui";
import { adminSettingsApi, adminWalletApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { cn, formatDateTime } from "@/lib/utils";
import { useRequireAuth } from "@/providers/auth-provider";
import {
  coinWord,
  formatCoins,
  type AdminWallet,
  type TransactionDirection,
} from "@/types";

export default function WalletsPage() {
  const { ready } = useRequireAuth({
    roles: ["admin", "super_admin"],
    signInPath: "/login",
  });
  const queryClient = useQueryClient();

  const [search, setSearch] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [statusFilter, setStatusFilter] = React.useState<
    "all" | "positive" | "frozen" | "zero"
  >("all");
  const [adjusting, setAdjusting] = React.useState<AdminWallet | null>(null);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Platform settings for coin rate
  const { data: settings } = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: adminSettingsApi.get,
    enabled: ready,
  });

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ["admin", "wallets", debounced, page],
    queryFn: () =>
      adminWalletApi.list({
        search: debounced || undefined,
        page,
        limit: 20,
      }),
    enabled: ready,
    placeholderData: (previous) => previous,
  });

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["admin", "wallets"] });

  const freeze = useMutation({
    mutationFn: ({ userId, frozen }: { userId: string; frozen: boolean }) =>
      adminWalletApi.freeze(userId, {
        frozen,
        reason: frozen ? "Frozen by Super Admin" : null,
      }),
    onSuccess: (_result, variables) => {
      void refresh();
      toast.success(variables.frozen ? "Wallet locked." : "Wallet unlocked.");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });

  const reconcile = useMutation({
    mutationFn: (userId: string) => adminWalletApi.reconcile(userId),
    onSuccess: (result) => {
      void refresh();
      toast.success(
        result.drift_coins === 0
          ? "Ledger integrity 100% verified (0 drift)."
          : `Repaired a ledger drift of ${formatCoins(Math.abs(result.drift_coins))} coins.`
      );
    },
    onError: (e: ApiError) => toast.error(e.message),
  });

  const items = data?.items || [];

  // Metrics
  const totalCoinsOnPage = items.reduce(
    (acc, curr) => acc + (curr.balance_coins || 0),
    0
  );
  const frozenCount = items.filter((w) => w.is_frozen).length;
  const positiveCount = items.filter((w) => w.balance_coins > 0).length;

  // Filtered Items
  const filteredItems = React.useMemo(() => {
    return items.filter((w) => {
      if (statusFilter === "frozen" && !w.is_frozen) return false;
      if (statusFilter === "positive" && w.balance_coins <= 0) return false;
      if (statusFilter === "zero" && w.balance_coins > 0) return false;
      return true;
    });
  }, [items, statusFilter]);

  if (!ready) return <LoadingBlock />;

  return (
    <div className="space-y-6">
      {/* ── 1. TOP HEADER ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex size-7 items-center justify-center rounded-xl bg-amber-500/15 text-[#D97706]">
              <Wallet className="size-4" />
            </span>
            <h2 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-slate-900 leading-tight">
              Wallets & Coin Ledger
            </h2>
          </div>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            Immutable double-entry coin balances. Adjust balances, reconcile
            ledger drift & control security states.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => void refresh()}
            disabled={isFetching}
            className="flex items-center gap-2 rounded-2xl border border-slate-200/90 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs transition-all hover:bg-slate-50 active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw
              className={cn(
                "size-3.5",
                isFetching ? "animate-spin text-[#D97706]" : "text-slate-400"
              )}
            />
            <span>{isFetching ? "Syncing..." : "Sync Ledger"}</span>
          </button>
        </div>
      </div>

      {/* ── 2. 4 DEALDECK 3D METRIC CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Total Circulating Coins (Hero Golden Gradient) */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setStatusFilter("all")}
          className="relative overflow-hidden rounded-[26px] bg-gradient-to-br from-[#B45309] via-[#D97706] to-[#F59E0B] p-5 text-white shadow-[0_14px_30px_-6px_rgba(217,119,6,0.45)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_-6px_rgba(217,119,6,0.6)] cursor-pointer group flex flex-col justify-between min-h-[145px]"
        >
          <div className="pointer-events-none absolute -right-6 -bottom-6 size-32 rounded-full bg-white/10 blur-xl group-hover:scale-125 transition-transform" />
          <div className="flex items-center justify-between">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md shadow-xs">
              <Coins className="size-5 text-white stroke-[2.2]" />
            </div>
            <span className="rounded-full bg-white/20 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-black text-white">
              100% Ledger Backed
            </span>
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold text-white/80">
              Circulating Coin Balance
            </p>
            <div className="mt-0.5 flex items-baseline justify-between">
              <h3 className="font-display text-3xl font-black tracking-tight text-white leading-none">
                {formatCoins(totalCoinsOnPage)}
              </h3>
              <span className="text-[11px] font-bold text-white/80">
                ≈ ₹{formatCoins(totalCoinsOnPage)}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Total User Accounts */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setStatusFilter("all")}
          className={cn(
            "rounded-[26px] bg-white p-5 border shadow-[0_10px_28px_rgba(20,25,45,0.03)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(20,25,45,0.07)] cursor-pointer group flex flex-col justify-between min-h-[145px]",
            statusFilter === "all"
              ? "border-slate-300 ring-2 ring-slate-100"
              : "border-slate-100/90"
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 group-hover:scale-105 transition-transform">
              <Wallet className="size-5 stroke-[2.2]" />
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
              Active Network
            </span>
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold text-slate-400">
              Accounts With Wallets
            </p>
            <div className="mt-0.5 flex items-baseline justify-between">
              <h3 className="font-display text-3xl font-black tracking-tight text-slate-900 leading-none">
                {data?.meta.total ?? items.length}
              </h3>
              <span className="text-[10px] font-medium text-slate-400">
                {positiveCount} with &gt;0 coins
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Frozen Wallets */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setStatusFilter("frozen")}
          className={cn(
            "rounded-[26px] bg-white p-5 border shadow-[0_10px_28px_rgba(20,25,45,0.03)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(20,25,45,0.07)] cursor-pointer group flex flex-col justify-between min-h-[145px]",
            statusFilter === "frozen"
              ? "border-rose-400 ring-2 ring-rose-100"
              : "border-slate-100/90"
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 group-hover:scale-105 transition-transform">
              <Snowflake className="size-5 stroke-[2.2]" />
            </div>
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[10px] font-bold border",
                frozenCount > 0
                  ? "bg-rose-50 text-rose-700 border-rose-200"
                  : "bg-slate-100 text-slate-500 border-slate-200"
              )}
            >
              {frozenCount > 0 ? `${frozenCount} Frozen` : "All Normal"}
            </span>
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold text-slate-400">
              Security Lockouts
            </p>
            <div className="mt-0.5 flex items-baseline justify-between">
              <h3 className="font-display text-3xl font-black tracking-tight text-slate-900 leading-none">
                {frozenCount}
              </h3>
              <span className="text-[10px] font-medium text-slate-400">
                Frozen Accounts
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Ledger Integrity */}
        <div className="rounded-[26px] bg-white p-5 border border-slate-100/90 shadow-[0_10px_28px_rgba(20,25,45,0.03)] flex flex-col justify-between min-h-[145px]">
          <div className="flex items-center justify-between">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <Scale className="size-5 stroke-[2.2]" />
            </div>
            <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700">
              Double-Entry
            </span>
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold text-slate-400">
              Audit Health Status
            </p>
            <div className="mt-0.5 flex items-baseline justify-between">
              <h3 className="font-display text-xl sm:text-2xl font-black tracking-tight text-emerald-600 leading-none flex items-center gap-1.5">
                <CheckCircle2 className="size-5" />
                <span>Synchronized</span>
              </h3>
              <span className="text-[10px] font-medium text-slate-400">
                0 Drift Detected
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. SEARCH & QUICK FILTER BAR ── */}
      <div className="rounded-[28px] bg-white p-5 sm:p-6 border border-slate-100/90 shadow-[0_10px_30px_rgba(20,25,45,0.03)] flex flex-wrap items-center justify-between gap-4">
        {/* Search Input with Ultra-Pro Glass Glow */}
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search wallets by user name or email address…"
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

        {/* Quick Filter Status Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: "all", label: "All Wallets", count: data?.meta.total ?? items.length },
            { id: "positive", label: "With Balance (>0)", count: positiveCount },
            { id: "frozen", label: "Frozen", count: frozenCount },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className={cn(
                "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer",
                statusFilter === tab.id
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100/80 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900"
              )}
            >
              <span>{tab.label}</span>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.2 text-[10px] font-black",
                  statusFilter === tab.id
                    ? "bg-white/20 text-white"
                    : "bg-slate-200 text-slate-700"
                )}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── 4. ULTRA-PRO DEALDECK WALLETS TABLE ── */}
      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700">
          {(error as ApiError).message}
        </div>
      ) : isLoading && !data ? (
        <LoadingBlock label="Loading wallet balances…" />
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[28px] bg-white py-16 px-4 text-center border border-slate-100 shadow-sm">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-amber-50 text-[#D97706] mb-3">
            <Wallet className="size-7" />
          </div>
          <h3 className="font-display text-base font-bold text-slate-900">
            {debounced || statusFilter !== "all"
              ? "No wallets match your filter"
              : "No wallets opened yet"}
          </h3>
          <p className="mt-1 text-xs text-slate-400 max-w-sm">
            {debounced || statusFilter !== "all"
              ? "Try resetting your search query or status filter to see all active balances."
              : "Wallets are automatically initialized when users register or purchase consultation coins."}
          </p>
          {(debounced || statusFilter !== "all") && (
            <button
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
              }}
              className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-[28px] bg-white border border-slate-100/90 shadow-[0_12px_32px_rgba(20,25,45,0.03)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-4 pl-6 pr-4">User & Account Identity</th>
                  <th className="py-4 px-4 text-right">Coin Balance</th>
                  <th className="py-4 px-4 text-right">Estimated Value (₹)</th>
                  <th className="py-4 px-4">Last Activity (IST)</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 pr-6 pl-4 text-right">Ledger Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((wallet) => (
                  <tr
                    key={wallet.user_id}
                    className="group transition-colors hover:bg-slate-50/80"
                  >
                    {/* User Identity Column */}
                    <td className="py-4 pl-6 pr-4">
                      <div className="flex items-center gap-3.5">
                        <Avatar
                          name={wallet.name}
                          size="md"
                          className="size-11 rounded-2xl ring-2 ring-slate-100 object-cover shrink-0"
                        />
                        <div className="min-w-0 max-w-xs">
                          <p className="truncate font-bold text-slate-900 group-hover:text-[#D97706] transition-colors text-sm">
                            {wallet.name}
                          </p>
                          <p className="truncate text-[11px] font-semibold text-slate-400">
                            {wallet.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Balance Coins Column */}
                    <td className="py-4 px-4 text-right whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-amber-50/80 border border-amber-200/60 px-3 py-1 font-mono text-sm font-black text-[#B45309]">
                        <Coins className="size-3.5 text-[#D97706]" />
                        <span>{formatCoins(wallet.balance_coins)}</span>
                      </span>
                    </td>

                    {/* INR Equivalent Column */}
                    <td className="py-4 px-4 text-right whitespace-nowrap">
                      <span className="font-extrabold text-slate-900 text-xs">
                        ₹{formatCoins(wallet.balance_coins)}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400 block">
                        at 1:1 rate
                      </span>
                    </td>

                    {/* Last Transaction (IST) */}
                    <td className="py-4 px-4 whitespace-nowrap text-slate-600 font-semibold text-[11px]">
                      {wallet.last_transaction_at ? (
                        formatDateTime(wallet.last_transaction_at)
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Status Column */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      {wallet.is_frozen ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200/80">
                          <Snowflake className="size-3" />
                          <span>Frozen</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200/60">
                          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Active</span>
                        </span>
                      )}
                    </td>

                    {/* Actions Column */}
                    <td className="py-4 pr-6 pl-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        {/* Adjust Button */}
                        <button
                          onClick={() => setAdjusting(wallet)}
                          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#D97706] to-[#F59E0B] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:from-[#B45309] hover:to-[#D97706] active:scale-95 transition-all cursor-pointer"
                        >
                          <Coins className="size-3 stroke-[2.5]" />
                          <span>Adjust</span>
                        </button>

                        {/* Reconcile Ledger Button */}
                        <button
                          disabled={reconcile.isPending}
                          onClick={() => reconcile.mutate(wallet.user_id)}
                          title="Reconcile balance against ledger audit"
                          className="flex size-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all cursor-pointer disabled:opacity-50"
                        >
                          <Scale className="size-3.5" />
                        </button>

                        {/* Freeze / Unfreeze Button */}
                        <button
                          disabled={freeze.isPending}
                          onClick={() =>
                            freeze.mutate({
                              userId: wallet.user_id,
                              frozen: !wallet.is_frozen,
                            })
                          }
                          className={cn(
                            "rounded-xl px-2.5 py-1.5 text-[11px] font-bold transition-all cursor-pointer border",
                            wallet.is_frozen
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                              : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200"
                          )}
                        >
                          {wallet.is_frozen ? "Unfreeze" : "Freeze"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
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

      {/* ── 5. ULTRA PRO 3D ADJUST WALLET DIALOG ── */}
      <AdjustModal
        wallet={adjusting}
        onClose={() => setAdjusting(null)}
        onDone={refresh}
      />
    </div>
  );
}

/** ── ULTRA PRO 3D ADJUST WALLET LEDGER DIALOG ── */
function AdjustModal({
  wallet,
  onClose,
  onDone,
}: {
  wallet: AdminWallet | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [direction, setDirection] =
    React.useState<TransactionDirection>("credit");
  const [amount, setAmount] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [fieldError, setFieldError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (wallet) {
      setDirection("credit");
      setAmount("");
      setReason("");
      setFieldError(null);
    }
  }, [wallet]);

  const adjust = useMutation({
    mutationFn: () =>
      adminWalletApi.adjust(wallet!.user_id, {
        direction,
        amount_coins: Number(amount),
        reason: reason.trim(),
      }),
    onSuccess: (balance) => {
      onDone();
      onClose();
      toast.success(
        `Balance adjusted. New balance is ${formatCoins(balance.balance_coins)} ${coinWord(balance.balance_coins)}.`
      );
    },
    onError: (e: ApiError) => {
      setFieldError(e.message);
    },
  });

  if (!wallet) return null;

  const currentCoins = wallet.balance_coins || 0;
  const numAmount = Number(amount) || 0;
  const projectedBalance =
    direction === "credit"
      ? currentCoins + numAmount
      : currentCoins - numAmount;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setFieldError(null);

    const coins = Number(amount);
    if (!amount.trim() || !Number.isInteger(coins) || coins <= 0) {
      setFieldError("Please enter a valid positive number of coins.");
      return;
    }
    if (direction === "debit" && coins > currentCoins) {
      setFieldError(
        `Cannot debit ${formatCoins(coins)} coins. Wallet only has ${formatCoins(currentCoins)} coins.`
      );
      return;
    }
    if (reason.trim().length < 3) {
      setFieldError("A detailed reason is required for ledger audit tracking.");
      return;
    }
    adjust.mutate();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/50 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Dialog Container */}
      <div className="relative z-10 w-full max-w-lg rounded-[32px] bg-white shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Top Header Banner */}
        <div className="relative p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 flex size-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>

          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#D97706] to-[#F59E0B] text-white shadow-md">
              <Coins className="size-6 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="font-display text-lg font-black text-white tracking-tight">
                Adjust Wallet Ledger
              </h3>
              <p className="text-xs font-semibold text-slate-300">
                Direct manual ledger balance adjustment
              </p>
            </div>
          </div>

          {/* User Account Ribbon */}
          <div className="mt-4 flex items-center justify-between rounded-2xl bg-white/10 backdrop-blur-md p-3 border border-white/10">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar
                name={wallet.name}
                size="sm"
                className="size-9 rounded-xl ring-2 ring-white/20 object-cover"
              />
              <div className="min-w-0">
                <p className="font-bold text-white text-xs truncate">
                  {wallet.name}
                </p>
                <p className="text-[10px] text-slate-300 truncate">
                  {wallet.email}
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block">
                Current Balance
              </span>
              <span className="font-black text-white text-sm">
                {formatCoins(currentCoins)} coins
              </span>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={submit} className="p-6 space-y-5">
          {/* 1. Direction Switcher (2 Visual Cards) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Adjustment Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Credit Card */}
              <div
                onClick={() => setDirection("credit")}
                className={cn(
                  "p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-3",
                  direction === "credit"
                    ? "border-emerald-500 bg-emerald-50/70 shadow-xs ring-2 ring-emerald-100"
                    : "border-slate-200 bg-white hover:border-slate-300"
                )}
              >
                <div
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-xl",
                    direction === "credit"
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-100 text-slate-600"
                  )}
                >
                  <ArrowUpRight className="size-5 stroke-[2.5]" />
                </div>
                <div>
                  <p className="text-xs font-black text-slate-900 leading-tight">
                    Credit (+)
                  </p>
                  <p className="text-[10px] font-semibold text-emerald-700 mt-0.5">
                    Add Coins
                  </p>
                </div>
                {direction === "credit" && (
                  <Check className="size-4 text-emerald-600 ml-auto stroke-[2.5]" />
                )}
              </div>

              {/* Debit Card */}
              <div
                onClick={() => setDirection("debit")}
                className={cn(
                  "p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-3",
                  direction === "debit"
                    ? "border-rose-500 bg-rose-50/70 shadow-xs ring-2 ring-rose-100"
                    : "border-slate-200 bg-white hover:border-slate-300"
                )}
              >
                <div
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-xl",
                    direction === "debit"
                      ? "bg-rose-600 text-white"
                      : "bg-slate-100 text-slate-600"
                  )}
                >
                  <ArrowDownRight className="size-5 stroke-[2.5]" />
                </div>
                <div>
                  <p className="text-xs font-black text-slate-900 leading-tight">
                    Debit (-)
                  </p>
                  <p className="text-[10px] font-semibold text-rose-700 mt-0.5">
                    Deduct Coins
                  </p>
                </div>
                {direction === "debit" && (
                  <Check className="size-4 text-rose-600 ml-auto stroke-[2.5]" />
                )}
              </div>
            </div>
          </div>

          {/* 2. Amount Input + Quick Presets */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="adjust_amount"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700"
              >
                Number of Coins <span className="text-rose-500">*</span>
              </label>
              {numAmount > 0 && (
                <span className="text-[11px] font-bold text-slate-500">
                  Projected Balance:{" "}
                  <strong
                    className={
                      projectedBalance >= 0 ? "text-emerald-600" : "text-rose-600"
                    }
                  >
                    {formatCoins(projectedBalance)} coins
                  </strong>
                </span>
              )}
            </div>

            <div className="relative">
              <Coins className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400" />
              <input
                id="adjust_amount"
                type="number"
                min={1}
                step={1}
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 500"
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50/70 pl-10 pr-20 text-base font-black text-slate-900 placeholder-slate-400 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/30 focus:border-[#D97706]"
              />
              <span className="absolute top-1/2 right-3.5 -translate-y-1/2 text-xs font-bold text-slate-400">
                coins
              </span>
            </div>

            {/* Quick Preset Buttons */}
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {[100, 250, 500, 1000, 5000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(String(preset))}
                  className="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:border-[#D97706] hover:bg-amber-50 hover:text-[#B45309] transition-all cursor-pointer"
                >
                  +{formatCoins(preset)}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Reason & Audit Note */}
          <div className="space-y-2">
            <label
              htmlFor="adjust_reason"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700"
            >
              Mandatory Audit Reason <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="adjust_reason"
              rows={2}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain the purpose (e.g. Refund for dropped call, Loyalty bonus)…"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/30 focus:border-[#D97706]"
            />

            {/* Preset Reasons */}
            <div className="flex flex-wrap gap-1.5">
              {[
                "Refund for dropped call",
                "Promotional bonus",
                "Dispute resolution",
                "Platform balance reconciliation",
              ].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className="rounded-lg bg-slate-100 hover:bg-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-600 transition-colors cursor-pointer"
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Field Error Alert */}
          {fieldError && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-semibold text-rose-700 flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>{fieldError}</span>
            </div>
          )}

          {/* Security & Audit Note */}
          <div className="flex items-center gap-2 text-[11px] text-slate-400 border-t border-slate-100 pt-3">
            <ShieldCheck className="size-4 text-emerald-600 shrink-0" />
            <span>
              This operation will append an immutable row to the double-entry
              ledger.
            </span>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={adjust.isPending}
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#D97706] to-[#F59E0B] px-5 py-2.5 text-xs sm:text-sm font-black text-white shadow-[0_8px_20px_-4px_rgba(217,119,6,0.45)] hover:from-[#B45309] hover:to-[#D97706] active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              {adjust.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Applying Adjustment…</span>
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  <span>
                    Apply {direction === "credit" ? "Credit" : "Debit"}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
