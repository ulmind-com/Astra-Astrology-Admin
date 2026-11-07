"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Banknote,
  Building,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
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
  Lock,
  MessageCircle,
  Percent,
  Phone,
  QrCode,
  Radio,
  Receipt,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
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
import { toast } from "sonner";

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
  type AstrologerEarningsBalance,
  type AstrologerPayoutRecord,
  type ConsultationMode,
  type EarningRow,
} from "@/types";

const MODE_ICONS: Record<ConsultationMode, React.ComponentType<{ className?: string }>> = {
  chat: MessageCircle,
  call: Phone,
  video: Video,
  appointment: Calendar,
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
  if (mode === "video") {
    return {
      label: "Video Call",
      icon: Video,
      className: "bg-purple-50 text-purple-800 border-purple-200/80",
    };
  }
  return {
    label: "Scheduled Appointment",
    icon: Calendar,
    className: "bg-sky-50 text-sky-800 border-sky-200/80",
  };
}

export default function EarningsPage() {
  const { user } = useAuth();
  const isAstrologer = user?.role === "astrologer";
  const { ready } = useRequireAuth({
    roles: ["astrologer", "admin", "super_admin"],
    signInPath: "/login",
  });

  // Astrologer Sub-Tabs
  const [astroTab, setAstroTab] = React.useState<"consultations" | "payouts" | "banking">("consultations");

  // Admin Sub-Tabs
  const [adminTab, setAdminTab] = React.useState<"ledger" | "payout_desk">("ledger");
  const [adminPayoutFilter, setAdminPayoutFilter] = React.useState<string>("all");

  // Astrologer Search, Filter & Pagination State
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [selectedMode, setSelectedMode] = React.useState<ConsultationMode | "">("");
  const [selectedWindow, setSelectedWindow] = React.useState<string>("");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  // Admin Ledger Search, Filter & Pagination State
  const [adminSearch, setAdminSearch] = React.useState("");
  const [debouncedAdminSearch, setDebouncedAdminSearch] = React.useState("");
  const [adminMode, setAdminMode] = React.useState<ConsultationMode | "">("");
  const [adminPage, setAdminPage] = React.useState(1);
  const [adminPageSize, setAdminPageSize] = React.useState(20);

  // Inspection drawer state (works for both Astrologer and Admin)
  const [previewRow, setPreviewRow] = React.useState<any | null>(null);

  // Modals state
  const [isPayoutModalOpen, setIsPayoutModalOpen] = React.useState(false);
  const [isBankModalOpen, setIsBankModalOpen] = React.useState(false);
  const [settlePayoutTarget, setSettlePayoutTarget] = React.useState<AstrologerPayoutRecord | null>(null);
  const [rejectPayoutTarget, setRejectPayoutTarget] = React.useState<AstrologerPayoutRecord | null>(null);

  // Payout Form State
  const [payoutAmountRupees, setPayoutAmountRupees] = React.useState<string>("");
  const [payoutMethod, setPayoutMethod] = React.useState<"bank_transfer" | "upi">("bank_transfer");

  // Bank Form State
  const [bankForm, setBankForm] = React.useState({
    account_holder_name: "",
    account_number: "",
    confirm_account_number: "",
    ifsc: "",
    bank_name: "",
    upi_id: "",
    pan_card: "",
  });

  // Admin Settle/Reject Form State
  const [utrNumber, setUtrNumber] = React.useState("");
  const [adminNotes, setAdminNotes] = React.useState("");
  const [rejectionReason, setRejectionReason] = React.useState("");

  // Debounce search input
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedAdminSearch(adminSearch);
      setAdminPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [adminSearch]);

  // =========================================================================
  // ASTROLOGER QUERIES
  // =========================================================================
  const mine = useQuery({
    queryKey: ["earnings", "mine"],
    queryFn: earningsApi.summary,
    enabled: ready && isAstrologer,
  });

  const astroBalance = useQuery({
    queryKey: ["earnings", "balance"],
    queryFn: earningsApi.balance,
    enabled: ready && isAstrologer,
    refetchInterval: 10000,
  });

  const astroPayouts = useQuery({
    queryKey: ["earnings", "payouts"],
    queryFn: () => earningsApi.myPayouts(100),
    enabled: ready && isAstrologer,
  });

  // Paginated Consultations for Astrologer with Search & Filter
  const paginatedConsultations = useQuery({
    queryKey: [
      "earnings",
      "paginated",
      page,
      pageSize,
      selectedMode,
      debouncedSearch,
      selectedWindow,
    ],
    queryFn: () =>
      earningsApi.paginated({
        page,
        limit: pageSize,
        mode: selectedMode || undefined,
        search: debouncedSearch || undefined,
        window: selectedWindow || undefined,
      }),
    enabled: ready && isAstrologer,
  });

  // Synchronize bankForm with astroBalance data
  React.useEffect(() => {
    if (astroBalance.data) {
      const b = astroBalance.data;
      setBankForm((prev) => ({
        ...prev,
        account_holder_name: b.account_holder_name || "",
        bank_name: b.bank_name || "",
        ifsc: b.ifsc || "",
        upi_id: b.upi_id || "",
        pan_card: b.pan_card || "",
      }));
      if (!payoutAmountRupees && b.withdrawable_balance_paise > 0) {
        const withdrawRupees = Math.floor(b.withdrawable_balance_paise / 100);
        if (withdrawRupees >= Math.floor(b.min_payout_amount_paise / 100)) {
          setPayoutAmountRupees(withdrawRupees.toString());
        }
      }
    }
  }, [astroBalance.data]);

  // =========================================================================
  // ADMIN QUERIES
  // =========================================================================
  const platform = useQuery({
    queryKey: ["admin", "earnings"],
    queryFn: adminSettingsApi.earnings,
    enabled: ready && !isAstrologer,
    refetchInterval: 10000,
  });

  const platformRecent = useQuery({
    queryKey: ["admin", "earnings", "recent"],
    queryFn: () => adminSettingsApi.recentEarnings(100),
    enabled: ready && !isAstrologer,
    refetchInterval: 10000,
  });

  const adminPaginatedLedger = useQuery({
    queryKey: [
      "admin",
      "earnings",
      "paginated",
      adminPage,
      adminPageSize,
      adminMode,
      debouncedAdminSearch,
    ],
    queryFn: () =>
      earningsApi.adminPaginated({
        page: adminPage,
        limit: adminPageSize,
        mode: adminMode || undefined,
        search: debouncedAdminSearch || undefined,
      }),
    enabled: ready && !isAstrologer && adminTab === "ledger",
  });

  const adminPayouts = useQuery({
    queryKey: ["admin", "payouts", adminPayoutFilter],
    queryFn: () =>
      earningsApi.adminPayouts(adminPayoutFilter === "all" ? undefined : adminPayoutFilter, 100),
    enabled: ready && !isAstrologer,
    refetchInterval: 10000,
  });

  // =========================================================================
  // MUTATIONS
  // =========================================================================
  const requestPayoutMutation = useMutation({
    mutationFn: async () => {
      const amountPaise = Math.round(parseFloat(payoutAmountRupees) * 100);
      if (isNaN(amountPaise) || amountPaise <= 0) {
        throw new Error("Please enter a valid amount.");
      }
      return earningsApi.requestPayout({
        amount_paise: amountPaise,
        payout_method: payoutMethod,
      });
    },
    onSuccess: () => {
      toast.success("Payout request submitted successfully! Admin will process your transfer.");
      setIsPayoutModalOpen(false);
      void astroBalance.refetch();
      void astroPayouts.refetch();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to submit payout request.");
    },
  });

  const updateBankMutation = useMutation({
    mutationFn: async () => {
      if (bankForm.account_number && bankForm.account_number !== bankForm.confirm_account_number) {
        throw new Error("Bank Account Number and confirmation do not match!");
      }
      return earningsApi.updateBankDetails({
        account_holder_name: bankForm.account_holder_name || undefined,
        account_number: bankForm.account_number || undefined,
        ifsc: bankForm.ifsc || undefined,
        bank_name: bankForm.bank_name || undefined,
        upi_id: bankForm.upi_id || undefined,
        pan_card: bankForm.pan_card || undefined,
      });
    },
    onSuccess: () => {
      toast.success("Banking and payout coordinates saved securely.");
      setIsBankModalOpen(false);
      void astroBalance.refetch();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to save bank details.");
    },
  });

  const settlePayoutMutation = useMutation({
    mutationFn: async ({ id, utr, notes }: { id: string; utr: string; notes?: string }) => {
      if (!utr.trim()) throw new Error("UTR / Transaction Reference number is required.");
      return earningsApi.adminSettlePayout(id, { utr_number: utr.trim(), admin_notes: notes });
    },
    onSuccess: () => {
      toast.success("Payout settled and marked paid with UTR reference.");
      setSettlePayoutTarget(null);
      setUtrNumber("");
      setAdminNotes("");
      void adminPayouts.refetch();
      void platform.refetch();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to settle payout.");
    },
  });

  const rejectPayoutMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      if (!reason.trim()) throw new Error("A clear rejection reason is required.");
      return earningsApi.adminRejectPayout(id, { rejection_reason: reason.trim() });
    },
    onSuccess: () => {
      toast.success("Payout request rejected. Locked balance refunded back to astrologer.");
      setRejectPayoutTarget(null);
      setRejectionReason("");
      void adminPayouts.refetch();
      void platform.refetch();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to reject payout.");
    },
  });

  if (!ready) return <LoadingBlock />;

  // ──────────────────────────────────────────────────────────────────────────
  // 1. ASTROLOGER VIEW (EARNINGS, WITHDRAWALS & BANKING)
  // ──────────────────────────────────────────────────────────────────────────
  if (isAstrologer) {
    if (mine.isLoading || astroBalance.isLoading) {
      return <LoadingBlock label="Loading your Vedic earnings vault…" />;
    }
    if (mine.error) {
      return (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700">
          {(mine.error as ApiError).message}
        </div>
      );
    }

    const summaryData = mine.data;
    const balanceData = astroBalance.data || {
      total_earned_paise: summaryData?.all_time.earning_paise || 0,
      total_settled_paise: 0,
      total_pending_paise: 0,
      withdrawable_balance_paise: summaryData?.all_time.earning_paise || 0,
      min_payout_amount_paise: 50000,
      has_bank_details: false,
    };

    const withdrawableRupees = Math.floor(balanceData.withdrawable_balance_paise / 100);
    const minPayoutRupees = Math.floor(balanceData.min_payout_amount_paise / 100);

    const consultationsPageData = paginatedConsultations.data;
    const consultationsList = consultationsPageData?.items || [];
    const meta = consultationsPageData?.meta || {
      page: 1,
      limit: pageSize,
      total: 0,
      total_pages: 1,
      has_next: false,
      has_prev: false,
    };

    return (
      <div className="space-y-6">
        {/* Header Strip */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#D97706] to-[#F59E0B] text-white shadow-md">
                <TrendingUp className="size-4.5" />
              </span>
              <h2 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-slate-900 leading-tight">
                Cosmic Earnings & Payouts
              </h2>
            </div>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              Live consultation ledger, verified bank settlements, and instant withdrawal vault.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                void mine.refetch();
                void astroBalance.refetch();
                void astroPayouts.refetch();
                void paginatedConsultations.refetch();
              }}
              disabled={astroBalance.isFetching || paginatedConsultations.isFetching}
              className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw
                className={cn(
                  "size-3.5",
                  (astroBalance.isFetching || paginatedConsultations.isFetching) &&
                    "animate-spin text-[#D97706]"
                )}
              />
              <span>Refresh Vault</span>
            </button>
          </div>
        </div>

        {/* 4 Hero Financial Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* Card 1: Available Withdrawable Balance */}
          <div className="relative overflow-hidden rounded-[26px] bg-gradient-to-br from-[#065F46] via-[#047857] to-[#10B981] p-5 text-white shadow-[0_14px_30px_-6px_rgba(16,185,129,0.45)] flex flex-col justify-between min-h-[160px]">
            <div className="pointer-events-none absolute -right-6 -bottom-6 size-32 rounded-full bg-white/10 blur-xl" />
            <div className="flex items-center justify-between">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md">
                <Wallet className="size-5 text-white stroke-[2.2]" />
              </div>
              <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-black text-white uppercase tracking-wider">
                Withdrawable
              </span>
            </div>
            <div className="mt-2">
              <p className="text-xs font-semibold text-emerald-100">Available to Withdraw</p>
              <h3 className="font-display text-3xl font-black tracking-tight text-white leading-none mt-1">
                {formatEarning(balanceData.withdrawable_balance_paise)}
              </h3>
            </div>
            <div className="mt-3 pt-2 border-t border-white/15 flex items-center justify-between">
              <span className="text-[10px] font-medium text-emerald-100">
                Min payout: ₹{minPayoutRupees}
              </span>
              <button
                onClick={() => {
                  if (!balanceData.has_bank_details) {
                    toast.error("Please add your Bank Account or UPI ID before requesting a payout.");
                    setIsBankModalOpen(true);
                  } else {
                    setIsPayoutModalOpen(true);
                  }
                }}
                disabled={withdrawableRupees < minPayoutRupees}
                className={cn(
                  "flex items-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-black transition-all cursor-pointer shadow-xs",
                  withdrawableRupees >= minPayoutRupees
                    ? "bg-white text-emerald-900 hover:bg-emerald-50 active:scale-95"
                    : "bg-white/20 text-white/60 cursor-not-allowed"
                )}
              >
                <Zap className="size-3 fill-current" />
                <span>Withdraw</span>
              </button>
            </div>
          </div>

          {/* Card 2: Pending Clearance */}
          <div className="rounded-[26px] bg-white p-5 border border-slate-100/90 shadow-[0_10px_28px_rgba(20,25,45,0.03)] flex flex-col justify-between min-h-[160px]">
            <div className="flex items-center justify-between">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-amber-50 text-[#D97706]">
                <Clock className="size-5 stroke-[2.2]" />
              </div>
              <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                In Processing
              </span>
            </div>
            <div className="mt-2">
              <p className="text-xs font-semibold text-slate-400">Pending Clearance</p>
              <h3 className="font-display text-3xl font-black tracking-tight text-amber-600 leading-none mt-1">
                {formatEarning(balanceData.total_pending_paise)}
              </h3>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-medium">
              <span>Requested payouts undergoing bank clearance</span>
            </div>
          </div>

          {/* Card 3: Settled to Bank */}
          <div className="rounded-[26px] bg-white p-5 border border-slate-100/90 shadow-[0_10px_28px_rgba(20,25,45,0.03)] flex flex-col justify-between min-h-[160px]">
            <div className="flex items-center justify-between">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                <CheckCircle2 className="size-5 stroke-[2.2]" />
              </div>
              <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700">
                Settled to Bank
              </span>
            </div>
            <div className="mt-2">
              <p className="text-xs font-semibold text-slate-400">Total Settled</p>
              <h3 className="font-display text-3xl font-black tracking-tight text-indigo-600 leading-none mt-1">
                {formatEarning(balanceData.total_settled_paise)}
              </h3>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-medium">
              <span>Disbursed directly via NEFT/IMPS/UPI</span>
            </div>
          </div>

          {/* Card 4: Lifetime Gross Consultations */}
          <div className="rounded-[26px] bg-white p-5 border border-slate-100/90 shadow-[0_10px_28px_rgba(20,25,45,0.03)] flex flex-col justify-between min-h-[160px]">
            <div className="flex items-center justify-between">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-slate-50 text-slate-700">
                <Coins className="size-5 stroke-[2.2]" />
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-700">
                Lifetime Revenue
              </span>
            </div>
            <div className="mt-2">
              <p className="text-xs font-semibold text-slate-400">Total Consultations Gross</p>
              <h3 className="font-display text-3xl font-black tracking-tight text-slate-900 leading-none mt-1">
                {formatEarning(balanceData.total_earned_paise)}
              </h3>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-medium">
              <span>{summaryData?.all_time.minutes || 0} mins across live & appointments</span>
            </div>
          </div>
        </div>

        {/* Bank Details Prompt Warning if missing */}
        {!balanceData.has_bank_details && (
          <div className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-amber-900">
            <div className="flex items-center gap-3">
              <AlertCircle className="size-5 text-amber-600 shrink-0" />
              <div className="text-xs font-semibold">
                <p className="font-bold text-amber-950">Add your bank or UPI details to withdraw earnings</p>
                <p className="text-amber-800">
                  Your payouts require an authenticated Bank Account (IFSC) or UPI Virtual Payment Address (VPA).
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsBankModalOpen(true)}
              className="rounded-xl bg-[#D97706] px-3.5 py-1.5 text-xs font-black text-white hover:bg-amber-600 active:scale-95 transition-all cursor-pointer shrink-0"
            >
              Add Banking Details
            </button>
          </div>
        )}

        {/* 3 Astrologer Sub-Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => setAstroTab("consultations")}
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer",
              astroTab === "consultations"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-white text-slate-600 hover:bg-slate-100"
            )}
          >
            <Receipt className="size-3.5" />
            <span>Consultations Log</span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-mono",
                astroTab === "consultations" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
              )}
            >
              {meta.total}
            </span>
          </button>

          <button
            onClick={() => setAstroTab("payouts")}
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer",
              astroTab === "payouts"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-white text-slate-600 hover:bg-slate-100"
            )}
          >
            <IndianRupee className="size-3.5" />
            <span>Payout Requests & History</span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-mono",
                astroTab === "payouts" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
              )}
            >
              {astroPayouts.data?.length || 0}
            </span>
          </button>

          <button
            onClick={() => setAstroTab("banking")}
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer",
              astroTab === "banking"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-white text-slate-600 hover:bg-slate-100"
            )}
          >
            <Building className="size-3.5" />
            <span>Bank & UPI Settings</span>
            {balanceData.has_bank_details ? (
              <span className="size-2 rounded-full bg-emerald-500" />
            ) : (
              <span className="size-2 rounded-full bg-amber-500" />
            )}
          </button>
        </div>

        {/* TAB 1: CONSULTATIONS LOG (FULL SEARCH, MODE FILTER & PAGINATION) */}
        {astroTab === "consultations" && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="space-y-3 rounded-[24px] bg-white p-4 border border-slate-100/90 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Search Box */}
                <div className="relative w-full sm:w-72">
                  <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by client name or ID…"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-9 pr-8 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/30"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      className="absolute top-1/2 right-2.5 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>

                {/* Consultation Mode Filter Tabs */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { id: "", label: "All Sessions" },
                    { id: "chat", label: "💬 Chat" },
                    { id: "call", label: "📞 Voice" },
                    { id: "video", label: "📹 Video" },
                    { id: "appointment", label: "📅 Appointments" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setSelectedMode(tab.id as ConsultationMode | "");
                        setPage(1);
                      }}
                      className={cn(
                        "rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer",
                        selectedMode === tab.id
                          ? "bg-[#D97706] text-white shadow-xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Time Window Tabs */}
                <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200/60">
                  {[
                    { id: "", label: "All Time" },
                    { id: "today", label: "Today" },
                    { id: "this_week", label: "This Week" },
                    { id: "this_month", label: "This Month" },
                  ].map((w) => (
                    <button
                      key={w.id}
                      onClick={() => {
                        setSelectedWindow(w.id);
                        setPage(1);
                      }}
                      className={cn(
                        "rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all cursor-pointer",
                        selectedWindow === w.id
                          ? "bg-white text-slate-900 shadow-xs"
                          : "text-slate-500 hover:text-slate-900"
                      )}
                    >
                      {w.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Consultations Table */}
            <div className="overflow-hidden rounded-[26px] bg-white border border-slate-100/90 shadow-[0_12px_32px_rgba(20,25,45,0.03)]">
              {paginatedConsultations.isLoading ? (
                <div className="py-16 text-center text-xs text-slate-400">
                  <RefreshCw className="size-6 animate-spin mx-auto text-[#D97706] mb-2" />
                  <span>Loading consultations ledger…</span>
                </div>
              ) : consultationsList.length === 0 ? (
                <div className="py-16 text-center text-xs text-slate-400">
                  <Receipt className="size-8 mx-auto text-slate-300 mb-2" />
                  <p className="font-bold text-slate-700">No consultations found matching your criteria</p>
                  {(search || selectedMode || selectedWindow) && (
                    <button
                      onClick={() => {
                        setSearch("");
                        setSelectedMode("");
                        setSelectedWindow("");
                        setPage(1);
                      }}
                      className="mt-3 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                    >
                      Reset filters
                    </button>
                  )}
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
                        <th className="py-4 px-4 text-right">Credited Payout</th>
                        <th className="py-4 pr-6 pl-4 text-right">Receipt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {consultationsList.map((row) => {
                        const badge = getModeBadge(row.mode);
                        const Icon = badge.icon;
                        return (
                          <tr
                            key={row.id}
                            onClick={() => setPreviewRow(row)}
                            className="hover:bg-amber-50/20 transition-colors cursor-pointer group"
                          >
                            <td className="py-4 pl-6 pr-4 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <Avatar
                                  src={row.user_avatar || row.user_image_url}
                                  name={row.user_name || "Client"}
                                  size="sm"
                                  className="size-8"
                                />
                                <div>
                                  <span className="font-bold text-slate-900 group-hover:text-[#D97706] transition-colors block text-xs">
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
                            <td className="py-4 px-4 text-right font-mono text-sm font-black text-emerald-600">
                              +{formatEarning(row.earning_paise)}
                            </td>
                            <td
                              className="py-4 pr-6 pl-4 text-right whitespace-nowrap"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => setPreviewRow(row)}
                                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-900 hover:text-white transition-all cursor-pointer"
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
              )}

              {/* Pagination Footer */}
              {meta.total > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-4 p-4 border-t border-slate-100 bg-slate-50/60">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-slate-500">
                      Showing{" "}
                      <span className="font-bold text-slate-900">
                        {Math.min((page - 1) * pageSize + 1, meta.total)}
                      </span>{" "}
                      to{" "}
                      <span className="font-bold text-slate-900">
                        {Math.min(page * pageSize, meta.total)}
                      </span>{" "}
                      of <span className="font-bold text-slate-900">{meta.total}</span> consultations
                    </span>

                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setPage(1);
                      }}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-700 focus:outline-none"
                    >
                      <option value={10}>10 per page</option>
                      <option value={20}>20 per page</option>
                      <option value={50}>50 per page</option>
                      <option value={100}>100 per page</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={!meta.has_prev}
                      className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                    >
                      <ChevronLeft className="size-4" />
                      <span>Previous</span>
                    </button>

                    <span className="px-3 py-1 text-xs font-bold font-mono text-slate-800">
                      Page {page} of {meta.total_pages || 1}
                    </span>

                    <button
                      onClick={() => setPage((p) => Math.min(meta.total_pages, p + 1))}
                      disabled={!meta.has_next}
                      className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                    >
                      <span>Next</span>
                      <ChevronRight className="size-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: PAYOUT REQUESTS & HISTORY */}
        {astroTab === "payouts" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-[24px] bg-white p-4 border border-slate-100 shadow-sm">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Disbursement History</h4>
                <p className="text-xs text-slate-500">
                  Track your requested payouts, UTR numbers, and bank transfer statuses.
                </p>
              </div>
              <button
                onClick={() => {
                  if (!balanceData.has_bank_details) {
                    toast.error("Please add your Bank Account or UPI ID first.");
                    setIsBankModalOpen(true);
                  } else {
                    setIsPayoutModalOpen(true);
                  }
                }}
                disabled={withdrawableRupees < minPayoutRupees}
                className={cn(
                  "flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black transition-all cursor-pointer shadow-xs",
                  withdrawableRupees >= minPayoutRupees
                    ? "bg-[#D97706] text-white hover:bg-amber-600 active:scale-95"
                    : "bg-slate-100 text-slate-400 cursor-not-allowed"
                )}
              >
                <Zap className="size-3.5" />
                <span>New Payout Request</span>
              </button>
            </div>

            <div className="overflow-hidden rounded-[26px] bg-white border border-slate-100/90 shadow-[0_12px_32px_rgba(20,25,45,0.03)]">
              {!astroPayouts.data || astroPayouts.data.length === 0 ? (
                <div className="py-16 text-center text-xs text-slate-400">
                  <Banknote className="size-8 mx-auto text-slate-300 mb-2" />
                  <p className="font-bold text-slate-700">No payout requests yet</p>
                  <p className="text-slate-400 mt-1">
                    When you withdraw your earnings, track the settlement status and UTR here.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        <th className="py-4 pl-6 pr-4">Requested At</th>
                        <th className="py-4 px-4">Method & Destination</th>
                        <th className="py-4 px-4 text-right">Gross Amount</th>
                        <th className="py-4 px-4 text-right">TDS (Tax)</th>
                        <th className="py-4 px-4 text-right">Net Payable</th>
                        <th className="py-4 px-4 text-center">Status</th>
                        <th className="py-4 pr-6 pl-4 text-right">Reference / UTR</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {astroPayouts.data.map((payout) => (
                        <tr key={payout.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 pl-6 pr-4 whitespace-nowrap">
                            <span className="font-bold text-slate-900 block">
                              {formatDateTime(payout.requested_at)}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {timeAgo(payout.requested_at)}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              {payout.payout_method === "upi" ? (
                                <QrCode className="size-4 text-indigo-600" />
                              ) : (
                                <Building className="size-4 text-emerald-600" />
                              )}
                              <div>
                                <span className="font-bold text-slate-800 capitalize block">
                                  {payout.payout_method === "upi" ? "Instant UPI" : "Bank Transfer"}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {payout.payout_method === "upi"
                                    ? payout.upi_id
                                    : `${payout.bank_name || "Bank"} (••${payout.account_number_last4 || "••"})`}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-right font-mono font-bold text-slate-700">
                            {formatEarning(payout.amount_paise)}
                          </td>
                          <td className="py-4 px-4 text-right font-mono text-slate-400">
                            {payout.tds_paise > 0 ? `-${formatEarning(payout.tds_paise)}` : "₹0"}
                          </td>
                          <td className="py-4 px-4 text-right font-mono font-black text-emerald-600 text-sm">
                            {formatEarning(payout.net_payable_paise)}
                          </td>
                          <td className="py-4 px-4 text-center">
                            {payout.status === "settled" && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                                <CheckCircle2 className="size-3 text-emerald-600" />
                                Settled
                              </span>
                            )}
                            {payout.status === "pending" && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                                <Clock className="size-3 text-amber-600 animate-spin" />
                                Processing
                              </span>
                            )}
                            {payout.status === "approved" && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[10px] font-bold text-blue-700">
                                Approved
                              </span>
                            )}
                            {payout.status === "rejected" && (
                              <span
                                className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 px-2.5 py-0.5 text-[10px] font-bold text-rose-700"
                                title={payout.rejection_reason || "Rejected"}
                              >
                                Rejected
                              </span>
                            )}
                          </td>
                          <td className="py-4 pr-6 pl-4 text-right font-mono text-[11px]">
                            {payout.utr_number ? (
                              <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                UTR: {payout.utr_number}
                              </span>
                            ) : payout.rejection_reason ? (
                              <span className="text-rose-600 font-sans text-[10px]">
                                {payout.rejection_reason}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: BANK & UPI SETTINGS */}
        {astroTab === "banking" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-[26px] bg-white p-6 border border-slate-100 shadow-[0_10px_28px_rgba(20,25,45,0.03)] space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                    <Building className="size-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Bank Account (NEFT/IMPS)</h4>
                    <p className="text-[11px] text-slate-400">Direct settlement to your savings/current account</p>
                  </div>
                </div>
                {balanceData.account_number_last4 ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                    <CheckCircle2 className="size-3" />
                    Configured
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                    Not Added
                  </span>
                )}
              </div>

              <div className="space-y-3 rounded-2xl bg-slate-50/70 p-4 border border-slate-100 text-xs font-semibold">
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-400">Account Holder:</span>
                  <span className="font-bold text-slate-900">
                    {balanceData.account_holder_name || "—"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-400">Bank Name:</span>
                  <span className="font-bold text-slate-900">{balanceData.bank_name || "—"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-400">Account Number:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {balanceData.account_number_last4
                      ? `••••••••${balanceData.account_number_last4}`
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-400">IFSC Code:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {balanceData.ifsc || "—"}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">PAN Card (for TDS credit):</span>
                  <span className="font-mono font-bold text-slate-900">
                    {balanceData.pan_card || "—"}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setIsBankModalOpen(true)}
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-800 hover:bg-slate-50 active:scale-98 transition-all cursor-pointer shadow-xs"
              >
                {balanceData.account_number_last4 ? "Update Bank Details" : "Add Bank Account"}
              </button>
            </div>

            <div className="rounded-[26px] bg-white p-6 border border-slate-100 shadow-[0_10px_28px_rgba(20,25,45,0.03)] space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                    <QrCode className="size-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Instant UPI VPA</h4>
                    <p className="text-[11px] text-slate-400">GPay, PhonePe, Paytm, BHIM instant transfer</p>
                  </div>
                </div>
                {balanceData.upi_id ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                    <CheckCircle2 className="size-3" />
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                    Not Added
                  </span>
                )}
              </div>

              <div className="rounded-2xl bg-slate-50/70 p-4 border border-slate-100 text-xs font-semibold space-y-3">
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">UPI Virtual ID:</span>
                  <span className="font-mono font-bold text-indigo-700">
                    {balanceData.upi_id || "—"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  UPI transfers are processed automatically for amounts up to ₹1,00,000 per transaction.
                </p>
              </div>

              <button
                onClick={() => setIsBankModalOpen(true)}
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-800 hover:bg-slate-50 active:scale-98 transition-all cursor-pointer shadow-xs"
              >
                {balanceData.upi_id ? "Change UPI ID" : "Configure UPI VPA"}
              </button>
            </div>
          </div>
        )}

        {/* ── MODALS (REQUEST PAYOUT & BANK DETAILS) ── */}
        {isPayoutModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
              onClick={() => setIsPayoutModalOpen(false)}
            />
            <div className="relative z-10 w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <Wallet className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">Request Earnings Payout</h3>
                    <p className="text-xs text-slate-400">Withdraw to verified Bank or UPI</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsPayoutModalOpen(false)}
                  className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="mt-5 space-y-4">
                <div className="flex items-center justify-between rounded-2xl bg-emerald-50/70 p-3.5 border border-emerald-100">
                  <span className="text-xs font-semibold text-emerald-800">Available to Withdraw:</span>
                  <span className="font-mono text-base font-black text-emerald-900">
                    {formatEarning(balanceData.withdrawable_balance_paise)}
                  </span>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">
                    Withdrawal Amount (₹)
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                      ₹
                    </span>
                    <input
                      type="number"
                      value={payoutAmountRupees}
                      onChange={(e) => setPayoutAmountRupees(e.target.value)}
                      placeholder={`Min ₹${minPayoutRupees}`}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-8 pr-4 font-mono text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPayoutAmountRupees(minPayoutRupees.toString())}
                      className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-200"
                    >
                      Min ₹{minPayoutRupees}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setPayoutAmountRupees(
                          Math.floor(withdrawableRupees / 2).toString()
                        )
                      }
                      className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-200"
                    >
                      50%
                    </button>
                    <button
                      type="button"
                      onClick={() => setPayoutAmountRupees(withdrawableRupees.toString())}
                      className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-200"
                    >
                      All (₹{withdrawableRupees})
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">
                    Disbursement Channel
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setPayoutMethod("bank_transfer")}
                      disabled={!balanceData.account_number_last4}
                      className={cn(
                        "flex items-center gap-2 rounded-xl p-3 border text-left transition-all",
                        payoutMethod === "bank_transfer"
                          ? "border-emerald-500 bg-emerald-50/50 text-emerald-950 font-bold ring-1 ring-emerald-500"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                        !balanceData.account_number_last4 && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <Building className="size-4 shrink-0 text-emerald-600" />
                      <div className="text-[11px] leading-tight">
                        <p className="font-bold">Bank Transfer</p>
                        <p className="text-[9px] text-slate-400">
                          ••{balanceData.account_number_last4 || "None"}
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPayoutMethod("upi")}
                      disabled={!balanceData.upi_id}
                      className={cn(
                        "flex items-center gap-2 rounded-xl p-3 border text-left transition-all",
                        payoutMethod === "upi"
                          ? "border-indigo-500 bg-indigo-50/50 text-indigo-950 font-bold ring-1 ring-indigo-500"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                        !balanceData.upi_id && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <QrCode className="size-4 shrink-0 text-indigo-600" />
                      <div className="text-[11px] leading-tight">
                        <p className="font-bold">Instant UPI</p>
                        <p className="text-[9px] text-slate-400 truncate max-w-[100px]">
                          {balanceData.upi_id || "None"}
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                {parseFloat(payoutAmountRupees) > 0 && (
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 space-y-1.5 text-[11px]">
                    <div className="flex justify-between text-slate-600">
                      <span>Requested Payout:</span>
                      <span className="font-mono font-bold text-slate-900">
                        ₹{parseFloat(payoutAmountRupees).toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Applicable TDS (0% under threshold):</span>
                      <span className="font-mono font-bold text-slate-900">₹0</span>
                    </div>
                    <div className="flex justify-between font-bold text-emerald-700 pt-1 border-t border-slate-200">
                      <span>Net Settlement:</span>
                      <span className="font-mono text-xs">
                        ₹{parseFloat(payoutAmountRupees).toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsPayoutModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => requestPayoutMutation.mutate()}
                  disabled={
                    requestPayoutMutation.isPending ||
                    !parseFloat(payoutAmountRupees) ||
                    parseFloat(payoutAmountRupees) < minPayoutRupees ||
                    parseFloat(payoutAmountRupees) > withdrawableRupees
                  }
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {requestPayoutMutation.isPending ? (
                    <RefreshCw className="size-3.5 animate-spin" />
                  ) : (
                    <Send className="size-3.5" />
                  )}
                  <span>Submit Payout Request</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {isBankModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
              onClick={() => setIsBankModalOpen(false)}
            />
            <div className="relative z-10 w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-amber-50 text-[#D97706]">
                    <Building className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">Bank & UPI Settlement Settings</h3>
                    <p className="text-xs text-slate-400">Configure your payout receiving accounts</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsBankModalOpen(false)}
                  className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Account Holder Name (as per Bank passbook)
                  </label>
                  <input
                    type="text"
                    value={bankForm.account_holder_name}
                    onChange={(e) =>
                      setBankForm({ ...bankForm, account_holder_name: e.target.value })
                    }
                    placeholder="e.g. Acharya Rajesh Sharma"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/30"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={bankForm.bank_name}
                      onChange={(e) => setBankForm({ ...bankForm, bank_name: e.target.value })}
                      placeholder="e.g. HDFC Bank, SBI"
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/30"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">IFSC Code</label>
                    <input
                      type="text"
                      value={bankForm.ifsc}
                      onChange={(e) =>
                        setBankForm({ ...bankForm, ifsc: e.target.value.toUpperCase() })
                      }
                      placeholder="e.g. HDFC0001234"
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 font-mono text-xs font-semibold text-slate-800 uppercase focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/30"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Bank Account Number
                  </label>
                  <input
                    type="password"
                    value={bankForm.account_number}
                    onChange={(e) => setBankForm({ ...bankForm, account_number: e.target.value })}
                    placeholder={
                      balanceData.account_number_last4
                        ? `••••••••${balanceData.account_number_last4} (leave blank to keep)`
                        : "Enter full account number"
                    }
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 font-mono text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/30"
                  />
                </div>

                {bankForm.account_number && (
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Confirm Account Number
                    </label>
                    <input
                      type="text"
                      value={bankForm.confirm_account_number}
                      onChange={(e) =>
                        setBankForm({ ...bankForm, confirm_account_number: e.target.value })
                      }
                      placeholder="Re-enter account number"
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 font-mono text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/30"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      UPI VPA (Optional)
                    </label>
                    <input
                      type="text"
                      value={bankForm.upi_id}
                      onChange={(e) => setBankForm({ ...bankForm, upi_id: e.target.value })}
                      placeholder="e.g. mobile@upi"
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 font-mono text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/30"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      PAN Card Number (TDS)
                    </label>
                    <input
                      type="text"
                      value={bankForm.pan_card}
                      onChange={(e) =>
                        setBankForm({ ...bankForm, pan_card: e.target.value.toUpperCase() })
                      }
                      placeholder="e.g. ABCDE1234F"
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 font-mono text-xs font-semibold text-slate-800 uppercase focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/30"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsBankModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => updateBankMutation.mutate()}
                  disabled={updateBankMutation.isPending}
                  className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 active:scale-95 transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {updateBankMutation.isPending && (
                    <RefreshCw className="size-3.5 animate-spin" />
                  )}
                  <span>Save Banking Profile</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── INTERACTIVE CONSULTATION SPLIT RECEIPT DRAWER FOR ASTROLOGER ── */}
        {previewRow && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <div
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-md transition-opacity"
              onClick={() => setPreviewRow(null)}
            />
            <div className="relative z-10 flex h-full w-full max-w-lg flex-col bg-white shadow-2xl border-l border-slate-100 overflow-hidden animate-in slide-in-from-right duration-300">
              <div className="relative p-6 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
                <button
                  onClick={() => setPreviewRow(null)}
                  className="absolute top-4 right-4 flex size-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                >
                  <X className="size-4" />
                </button>
                <div className="flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#D97706] to-[#F59E0B] text-white shadow-md">
                    <Receipt className="size-6 stroke-[2.2]" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-black text-white tracking-tight">
                      Consultation Earning Receipt
                    </h3>
                    <p className="text-xs font-semibold text-slate-400">
                      Vedic consultation record & credited payout
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl bg-white/10 backdrop-blur-md p-4 border border-white/10 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">
                      Credited Payout
                    </span>
                    <span className="font-mono text-2xl font-black text-emerald-400">
                      +{formatEarning(previewRow.earning_paise)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">
                      Session Length
                    </span>
                    <span className="font-mono text-xl font-bold text-amber-300">
                      {previewRow.minutes} Minutes
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs font-semibold">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Client Details
                  </span>
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={previewRow.user_avatar || previewRow.user_image_url}
                      name={previewRow.user_name || "Client"}
                      size="sm"
                      className="size-9"
                    />
                    <div>
                      <p className="font-bold text-slate-900 text-sm">
                        {previewRow.user_name || "Client Consultation"}
                      </p>
                      <p className="text-[10px] font-mono text-slate-400">
                        Client ID: {previewRow.user_id || "—"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-white p-4 space-y-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Session Logistics
                  </span>
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Consultation Channel:</span>
                    <span className="font-bold text-slate-900">
                      {MODE_LABELS[previewRow.mode as ConsultationMode] || previewRow.mode}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Client Coins Charged:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {previewRow.coins_charged != null ? `${formatCoins(previewRow.coins_charged)} Coins` : "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-500">Timestamp (IST):</span>
                    <span className="text-slate-800 font-bold">
                      {formatDateTime(previewRow.created_at)}
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Consultation Ledger ID
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(previewRow.id);
                        toast.success("Ledger ID copied to clipboard");
                      }}
                      className="flex items-center gap-1 text-[10px] text-amber-700 hover:text-amber-900 cursor-pointer"
                    >
                      <Copy className="size-3" />
                      <span>Copy</span>
                    </button>
                  </div>
                  <p className="font-mono text-[11px] text-slate-600 break-all select-all">
                    {previewRow.id}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-2">
                  <ShieldCheck className="size-4 text-emerald-600 shrink-0" />
                  <span>Permanent double-entry revenue record. Immutable and audited.</span>
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">
                  Astra Blink Revenue Engine v2.5
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

  // ──────────────────────────────────────────────────────────────────────────
  // 2. ADMIN & SUPER ADMIN VIEW (ULTRA-PRO REVENUE ENGINE & PAYOUT DESK)
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
  const payoutsList = adminPayouts.data || [];

  const adminLedgerPageData = adminPaginatedLedger.data;
  const adminRows = adminLedgerPageData?.items || [];
  const adminMeta = adminLedgerPageData?.meta || {
    page: 1,
    limit: adminPageSize,
    total: 0,
    total_pages: 1,
    has_next: false,
    has_prev: false,
  };

  const effectiveCommissionPercent =
    totals.gross_paise > 0
      ? Math.round((totals.commission_paise / totals.gross_paise) * 100)
      : 30;

  const effectivePayoutPercent = 100 - effectiveCommissionPercent;

  const chatSessionsCount = recentList.filter((r) => r.mode === "chat").length;
  const callSessionsCount = recentList.filter((r) => r.mode === "call").length;
  const videoSessionsCount = recentList.filter((r) => r.mode === "video").length;
  const appointmentSessionsCount = recentList.filter((r) => r.mode === "appointment").length;

  const pendingPayoutsCount = payoutsList.filter((p) => p.status === "pending").length;

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
            Real-time consultation revenue engine: Gross billing, platform commission take rate & net specialist payouts.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              void platform.refetch();
              void platformRecent.refetch();
              void adminPaginatedLedger.refetch();
              void adminPayouts.refetch();
            }}
            disabled={platform.isFetching || adminPaginatedLedger.isFetching}
            className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw
              className={cn(
                "size-3.5",
                (platform.isFetching || adminPaginatedLedger.isFetching) &&
                  "animate-spin text-[#D97706]"
              )}
            />
            <span>Sync Ledger</span>
          </button>
        </div>
      </div>

      {/* ── 2. ADMIN SUB-TABS: LEDGER VS PAYOUT DESK ── */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setAdminTab("ledger")}
          className={cn(
            "flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer",
            adminTab === "ledger"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-100"
          )}
        >
          <Receipt className="size-3.5" />
          <span>Consultation Ledger & Split Wire</span>
        </button>

        <button
          onClick={() => setAdminTab("payout_desk")}
          className={cn(
            "flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer relative",
            adminTab === "payout_desk"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-100"
          )}
        >
          <Building className="size-3.5" />
          <span>Astrologer Payout Settlement Desk</span>
          {pendingPayoutsCount > 0 && (
            <span className="flex items-center justify-center rounded-full bg-amber-500 px-1.5 py-0.2 text-[10px] font-black text-white">
              {pendingPayoutsCount} pending
            </span>
          )}
        </button>
      </div>

      {/* ── TAB 1: ADMIN LEDGER & REVENUE ENGINE ── */}
      {adminTab === "ledger" && (
        <div className="space-y-6">
          {recentList.length > 0 && (
            <div className="relative overflow-hidden rounded-[22px] bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-2.5 sm:p-3 text-white shadow-lg border border-slate-800/90">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 rounded-xl bg-amber-500/20 px-3 py-1 text-[10px] font-black tracking-wider uppercase text-amber-400 shrink-0 border border-amber-500/30 shadow-inner">
                  <Radio className="size-3 animate-pulse text-amber-400" />
                  Revenue Wire
                </span>

                <div className="relative flex-1 overflow-hidden mask-gradient-x">
                  <div className="animate-marquee flex items-center gap-8 whitespace-nowrap text-xs font-semibold text-slate-200">
                    {[...recentList.slice(0, 8), ...recentList.slice(0, 8)].map((row, idx) => (
                      <div
                        key={`${row.id}-${idx}`}
                        onClick={() => setPreviewRow(row)}
                        className="group flex items-center gap-2 hover:text-amber-300 transition-colors cursor-pointer shrink-0 py-0.5"
                      >
                        <span className="text-slate-300 font-bold group-hover:text-amber-400">
                          {row.astrologer_name || "Specialist"}
                        </span>
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded-md border border-amber-500/30">
                          Gross: {formatEarning(row.gross_paise)}
                        </span>
                        <span className="inline-flex items-center gap-0.5 font-mono text-[11px] font-bold bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded-md border border-emerald-500/30">
                          Paid: +{formatEarning(row.earning_paise)}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          ({MODE_LABELS[row.mode]} • {row.minutes}m)
                        </span>
                        <span className="text-[10px] text-slate-400">({timeAgo(row.created_at)})</span>
                        <span className="text-slate-700 ml-2">•</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4 DealDeck 3D KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
            <div className="relative overflow-hidden rounded-[26px] bg-gradient-to-br from-[#B45309] via-[#D97706] to-[#F59E0B] p-5 text-white shadow-[0_14px_30px_-6px_rgba(217,119,6,0.45)] flex flex-col justify-between min-h-[155px]">
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
                <p className="text-xs font-semibold text-white/80">Gross Consultation Revenue</p>
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

            <div className="rounded-[26px] bg-white p-5 border border-amber-200/90 shadow-[0_10px_28px_rgba(217,119,6,0.06)] flex flex-col justify-between min-h-[155px]">
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
                <p className="text-xs font-semibold text-slate-400">Your Platform Commission</p>
                <div className="mt-0.5 flex items-baseline justify-between">
                  <h3 className="font-display text-3xl font-black tracking-tight text-[#D97706] leading-none">
                    {formatEarning(totals.commission_paise)}
                  </h3>
                  <span className="text-[10px] font-bold text-amber-700">Net Profit</span>
                </div>
                <p className="mt-1 text-[10px] font-medium text-slate-400">
                  Retained directly from all live & appointment sessions
                </p>
              </div>
            </div>

            <div className="rounded-[26px] bg-white p-5 border border-emerald-100/90 shadow-[0_10px_28px_rgba(16,185,129,0.05)] flex flex-col justify-between min-h-[155px]">
              <div className="flex items-center justify-between">
                <div className="flex size-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <Wallet className="size-5 stroke-[2.2]" />
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  <CheckCircle2 className="size-3 text-emerald-600" />
                  {effectivePayoutPercent}% Specialists
                </span>
              </div>
              <div className="mt-3">
                <p className="text-xs font-semibold text-slate-400">Earned by Astrologers</p>
                <div className="mt-0.5 flex items-baseline justify-between">
                  <h3 className="font-display text-3xl font-black tracking-tight text-emerald-600 leading-none">
                    {formatEarning(totals.payout_paise)}
                  </h3>
                  <span className="text-[10px] font-bold text-emerald-700">Credited</span>
                </div>
                <p className="mt-1 text-[10px] font-medium text-slate-400">
                  Directly credited to verified specialist ledgers
                </p>
              </div>
            </div>

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
                <p className="text-xs font-semibold text-slate-400">Split Breakdown Meter</p>
                <div className="mt-0.5 flex items-baseline justify-between">
                  <h3 className="font-display text-lg font-black tracking-tight text-slate-900 leading-none">
                    {effectiveCommissionPercent}% Cut / {effectivePayoutPercent}% Specialist
                  </h3>
                </div>
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

          {/* Filter Bar */}
          <div className="space-y-4 rounded-[28px] bg-white p-5 sm:p-6 border border-slate-100/90 shadow-[0_10px_30px_rgba(20,25,45,0.03)]">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="relative w-full max-w-md">
                <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={adminSearch}
                  onChange={(e) => setAdminSearch(e.target.value)}
                  placeholder="Filter by astrologer name, specialist ID or session mode…"
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50/70 pl-10 pr-9 text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/30 focus:border-[#D97706]"
                />
                {adminSearch && (
                  <button
                    onClick={() => setAdminSearch("")}
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
                  { id: "chat", label: "💬 Chat", count: chatSessionsCount },
                  { id: "call", label: "📞 Voice", count: callSessionsCount },
                  { id: "video", label: "📹 Video", count: videoSessionsCount },
                  { id: "appointment", label: "📅 Appointments", count: appointmentSessionsCount },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setAdminMode(tab.id as ConsultationMode | "");
                      setAdminPage(1);
                    }}
                    className={cn(
                      "flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer",
                      adminMode === tab.id
                        ? "bg-slate-900 text-white shadow-xs"
                        : "bg-slate-100/80 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900"
                    )}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.2 rounded-md font-mono",
                        adminMode === tab.id
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

          {/* Table */}
          {adminRows.length === 0 ? (
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
                    {adminRows.map((row) => {
                      const badge = getModeBadge(row.mode);
                      const Icon = badge.icon;
                      return (
                        <tr
                          key={row.id}
                          onClick={() => setPreviewRow(row)}
                          className="group transition-colors hover:bg-amber-50/20 cursor-pointer"
                        >
                          <td className="py-4 pl-6 pr-4 whitespace-nowrap">
                            <span className="text-slate-800 font-bold text-xs block">
                              {formatDateTime(row.created_at)}
                            </span>
                            <span className="text-[10px] font-semibold text-[#D97706] flex items-center gap-1 mt-0.5">
                              <span className="size-1 rounded-full bg-[#D97706] animate-pulse" />
                              {timeAgo(row.created_at)}
                            </span>
                          </td>
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
                          <td className="py-4 px-4 text-right whitespace-nowrap">
                            <span className="font-mono text-sm font-black text-slate-900 block">
                              {formatEarning(row.gross_paise)}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-400">
                              {row.coins_charged} coins
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right whitespace-nowrap">
                            <span className="font-mono text-sm font-black text-[#D97706] block">
                              {formatEarning(row.commission_paise)}
                            </span>
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded-md">
                              {row.commission_percent}% Cut
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right whitespace-nowrap">
                            <span className="font-mono text-sm font-black text-emerald-600 block">
                              {formatEarning(row.earning_paise)}
                            </span>
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-md">
                              {100 - row.commission_percent}% Net
                            </span>
                          </td>
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

              {/* Admin Pagination Footer */}
              {adminMeta.total > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-4 p-4 border-t border-slate-100 bg-slate-50/60">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-slate-500">
                      Showing{" "}
                      <span className="font-bold text-slate-900">
                        {Math.min((adminPage - 1) * adminPageSize + 1, adminMeta.total)}
                      </span>{" "}
                      to{" "}
                      <span className="font-bold text-slate-900">
                        {Math.min(adminPage * adminPageSize, adminMeta.total)}
                      </span>{" "}
                      of <span className="font-bold text-slate-900">{adminMeta.total}</span> sessions
                    </span>

                    <select
                      value={adminPageSize}
                      onChange={(e) => {
                        setAdminPageSize(Number(e.target.value));
                        setAdminPage(1);
                      }}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-700 focus:outline-none"
                    >
                      <option value={10}>10 per page</option>
                      <option value={20}>20 per page</option>
                      <option value={50}>50 per page</option>
                      <option value={100}>100 per page</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setAdminPage((p) => Math.max(1, p - 1))}
                      disabled={!adminMeta.has_prev}
                      className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                    >
                      <ChevronLeft className="size-4" />
                      <span>Previous</span>
                    </button>

                    <span className="px-3 py-1 text-xs font-bold font-mono text-slate-800">
                      Page {adminPage} of {adminMeta.total_pages || 1}
                    </span>

                    <button
                      onClick={() => setAdminPage((p) => Math.min(adminMeta.total_pages, p + 1))}
                      disabled={!adminMeta.has_next}
                      className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                    >
                      <span>Next</span>
                      <ChevronRight className="size-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: ADMIN PAYOUT SETTLEMENT DESK ── */}
      {adminTab === "payout_desk" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-[24px] bg-white p-4 border border-slate-100 shadow-sm">
            <div>
              <h4 className="font-bold text-slate-900 text-sm">Astrologer Withdrawal Requests</h4>
              <p className="text-xs text-slate-500">
                Process bank transfers, enter UTR transaction numbers, or decline unauthorized requests.
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              {[
                { id: "all", label: "All Requests" },
                { id: "pending", label: "⏳ Pending Clearance" },
                { id: "settled", label: "✅ Settled" },
                { id: "rejected", label: "❌ Rejected" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setAdminPayoutFilter(tab.id)}
                  className={cn(
                    "rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer",
                    adminPayoutFilter === tab.id
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-[26px] bg-white border border-slate-100/90 shadow-[0_12px_32px_rgba(20,25,45,0.03)]">
            {payoutsList.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-400">
                <Building className="size-8 mx-auto text-slate-300 mb-2" />
                <p className="font-bold text-slate-700">No payout requests in this filter</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="py-4 pl-6 pr-4">Astrologer</th>
                      <th className="py-4 px-4">Requested At</th>
                      <th className="py-4 px-4">Payout Method & Details</th>
                      <th className="py-4 px-4 text-right">Net Payable</th>
                      <th className="py-4 px-4 text-center">Status</th>
                      <th className="py-4 px-4">UTR Reference</th>
                      <th className="py-4 pr-6 pl-4 text-right">Settlement Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payoutsList.map((payout) => (
                      <tr key={payout.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-4 pl-6 pr-4 whitespace-nowrap">
                          <p className="font-bold text-slate-900 text-xs">
                            {payout.astrologer_name || "Specialist"}
                          </p>
                          <span className="font-mono text-[9px] text-slate-400 block truncate">
                            ID: {payout.astrologer_id}
                          </span>
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className="font-bold text-slate-900 block">
                            {formatDateTime(payout.requested_at)}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {timeAgo(payout.requested_at)}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="space-y-0.5">
                            <span className="font-bold text-slate-800 capitalize flex items-center gap-1.5">
                              {payout.payout_method === "upi" ? (
                                <QrCode className="size-3.5 text-indigo-600" />
                              ) : (
                                <Building className="size-3.5 text-emerald-600" />
                              )}
                              {payout.payout_method === "upi" ? "UPI VPA" : "Bank Transfer"}
                            </span>
                            {payout.payout_method === "upi" ? (
                              <p className="font-mono text-[11px] text-indigo-700 select-all font-bold">
                                {payout.upi_id}
                              </p>
                            ) : (
                              <div className="font-mono text-[10px] text-slate-600">
                                <p className="font-bold text-slate-800">
                                  {payout.account_holder_name} • {payout.bank_name}
                                </p>
                                <p className="select-all">
                                  A/C: {payout.account_number_masked || `••${payout.account_number_last4}`} | IFSC: {payout.ifsc}
                                </p>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-right whitespace-nowrap">
                          <span className="font-mono text-base font-black text-emerald-600 block">
                            {formatEarning(payout.net_payable_paise)}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Gross: {formatEarning(payout.amount_paise)}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          {payout.status === "settled" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                              <CheckCircle2 className="size-3 text-emerald-600" />
                              Settled
                            </span>
                          )}
                          {payout.status === "pending" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                              <Clock className="size-3 text-amber-600 animate-spin" />
                              Pending
                            </span>
                          )}
                          {payout.status === "rejected" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 px-2.5 py-0.5 text-[10px] font-bold text-rose-700">
                              Rejected
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 font-mono text-[11px]">
                          {payout.utr_number ? (
                            <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 select-all">
                              {payout.utr_number}
                            </span>
                          ) : payout.rejection_reason ? (
                            <span className="text-rose-600 text-[10px] font-sans">
                              {payout.rejection_reason}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-4 pr-6 pl-4 text-right whitespace-nowrap">
                          {payout.status === "pending" ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => {
                                  setSettlePayoutTarget(payout);
                                  setUtrNumber("");
                                }}
                                className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 active:scale-95 transition-all cursor-pointer shadow-xs"
                              >
                                Mark Paid (UTR)
                              </button>
                              <button
                                onClick={() => {
                                  setRejectPayoutTarget(payout);
                                  setRejectionReason("");
                                }}
                                className="rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-all cursor-pointer"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-medium">Completed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL: ADMIN SETTLE PAYOUT ── */}
      {settlePayoutTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => setSettlePayoutTarget(null)}
          />
          <div className="relative z-10 w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="size-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Settle Astrologer Payout</h3>
                  <p className="text-xs text-slate-400">Confirm bank disbursement with UTR</p>
                </div>
              </div>
              <button
                onClick={() => setSettlePayoutTarget(null)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="rounded-2xl bg-emerald-50/60 p-3.5 border border-emerald-100">
                <div className="flex justify-between text-xs text-emerald-900 font-semibold mb-1">
                  <span>Astrologer:</span>
                  <span className="font-bold">{settlePayoutTarget.astrologer_name || "Specialist"}</span>
                </div>
                <div className="flex justify-between text-xs text-emerald-900 font-semibold">
                  <span>Payable Amount:</span>
                  <span className="font-mono text-sm font-black">
                    {formatEarning(settlePayoutTarget.net_payable_paise)}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Bank UTR / Transaction Reference Number *
                </label>
                <input
                  type="text"
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value)}
                  placeholder="e.g. HDFC20261108123456"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 font-mono text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Admin Internal Notes (Optional)
                </label>
                <input
                  type="text"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="e.g. Paid via corporate netbanking"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSettlePayoutTarget(null)}
                className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  settlePayoutMutation.mutate({
                    id: settlePayoutTarget.id,
                    utr: utrNumber,
                    notes: adminNotes,
                  })
                }
                disabled={settlePayoutMutation.isPending || !utrNumber.trim()}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 active:scale-95 disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {settlePayoutMutation.isPending && (
                  <RefreshCw className="size-3.5 animate-spin" />
                )}
                <span>Confirm Settlement</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: ADMIN REJECT PAYOUT ── */}
      {rejectPayoutTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => setRejectPayoutTarget(null)}
          />
          <div className="relative z-10 w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                  <ShieldAlert className="size-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Decline Payout Request</h3>
                  <p className="text-xs text-slate-400">Funds will be refunded to astrologer balance</p>
                </div>
              </div>
              <button
                onClick={() => setRejectPayoutTarget(null)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="rounded-2xl bg-rose-50/60 p-3.5 border border-rose-100 text-xs text-rose-900 font-semibold space-y-1">
                <div className="flex justify-between">
                  <span>Astrologer:</span>
                  <span className="font-bold">{rejectPayoutTarget.astrologer_name || "Specialist"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Amount to Refund:</span>
                  <span className="font-mono font-bold text-rose-700">
                    {formatEarning(rejectPayoutTarget.amount_paise)}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Reason for Rejection *
                </label>
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Invalid IFSC code or beneficiary bank account name mismatch."
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/30"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setRejectPayoutTarget(null)}
                className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  rejectPayoutMutation.mutate({
                    id: rejectPayoutTarget.id,
                    reason: rejectionReason,
                  })
                }
                disabled={rejectPayoutMutation.isPending || !rejectionReason.trim()}
                className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white hover:bg-rose-700 active:scale-95 disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {rejectPayoutMutation.isPending && (
                  <RefreshCw className="size-3.5 animate-spin" />
                )}
                <span>Decline & Refund</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 6. INTERACTIVE SLIDE-OVER 3D REVENUE SPLIT INSPECTOR (ADMIN VIEW) ── */}
      {previewRow && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-md transition-opacity"
            onClick={() => setPreviewRow(null)}
          />

          <div className="relative z-10 flex h-full w-full max-w-lg flex-col bg-white shadow-2xl border-l border-slate-100 overflow-hidden animate-in slide-in-from-right duration-300">
            <div className="relative p-6 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
              <button
                onClick={() => setPreviewRow(null)}
                className="absolute top-4 right-4 flex size-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
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

            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs font-semibold scrollbar-thin">
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

              <div className="rounded-2xl border border-slate-100 bg-white p-4 space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  3-Way Split Accounting Waterfall
                </span>

                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-slate-400" />
                    <span className="text-slate-600">Total Gross Charged:</span>
                  </div>
                  <span className="font-mono text-sm font-black text-slate-900">
                    {formatEarning(previewRow.gross_paise)}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-slate-100 bg-amber-50/50 -mx-4 px-4">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-[#D97706]" />
                    <span className="text-amber-900 font-bold">
                      Platform Fee ({previewRow.commission_percent || 30}% Cut):
                    </span>
                  </div>
                  <span className="font-mono text-sm font-black text-[#D97706]">
                    +{formatEarning(previewRow.commission_paise || (previewRow.gross_paise - previewRow.earning_paise))}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-slate-100 bg-emerald-50/50 -mx-4 px-4">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-emerald-500" />
                    <span className="text-emerald-900 font-bold">
                      Astrologer Payout ({100 - (previewRow.commission_percent || 30)}% Net):
                    </span>
                  </div>
                  <span className="font-mono text-sm font-black text-emerald-600">
                    +{formatEarning(previewRow.earning_paise)}
                  </span>
                </div>

                <div className="pt-2">
                  <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="bg-[#D97706]"
                      style={{ width: `${previewRow.commission_percent || 30}%` }}
                      title={`Platform: ${previewRow.commission_percent || 30}%`}
                    />
                    <div
                      className="bg-emerald-500 flex-1"
                      title={`Astrologer: ${100 - (previewRow.commission_percent || 30)}%`}
                    />
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                    <span>Platform Fee ({previewRow.commission_percent || 30}%)</span>
                    <span>Astrologer ({100 - (previewRow.commission_percent || 30)}%)</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-white p-4 space-y-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Session Logistics
                </span>

                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Consultation Channel:</span>
                  <span className="font-bold text-slate-900">
                    {MODE_LABELS[previewRow.mode as ConsultationMode] || previewRow.mode}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">User Coins Deducted:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {previewRow.coins_charged != null ? `${previewRow.coins_charged} Coins` : "—"}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-500">Timestamp (IST):</span>
                  <span className="text-slate-800 font-bold">
                    {formatDateTime(previewRow.created_at)}
                  </span>
                </div>
              </div>

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
                <span>Permanent double-entry revenue record. Immutable and audited.</span>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                Astra Blink Revenue Engine v2.5
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
