"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Award,
  BadgeCheck,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Coins,
  Copy,
  CreditCard,
  ExternalLink,
  Eye,
  FileText,
  Globe,
  GraduationCap,
  LayoutGrid,
  LayoutList,
  Mail,
  MessageSquare,
  Phone,
  PhoneCall,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  UserCheck,
  Users,
  Video,
  X,
  XCircle,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";

import {
  Avatar,
  Badge,
  Button,
  Card,
  CardBody,
  Field,
  Input,
  LoadingBlock,
  Modal,
  StatusDot,
} from "@/components/ui";
import {
  adminApi,
  adminSettingsApi,
  type AstrologerApplicationApprovalResult,
  type AstrologerApplicationData,
} from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { cn, formatDate } from "@/lib/utils";
import { useRequireAuth } from "@/providers/auth-provider";
import {
  SKILLS,
  SKILL_LABELS,
  type AstrologerProfile,
  type Skill,
} from "@/types";

export default function AstrologersListPage() {
  const { ready } = useRequireAuth({
    roles: ["admin", "super_admin"],
    signInPath: "/login",
  });
  const queryClient = useQueryClient();

  // Active Tab: "verified" | "applications"
  const [activeTab, setActiveTab] = React.useState<"verified" | "applications">("verified");

  // Application States
  const [appStatusFilter, setAppStatusFilter] = React.useState<string>("pending");
  const [appSearch, setAppSearch] = React.useState("");
  const [detailModalApp, setDetailModalApp] = React.useState<AstrologerApplicationData | null>(null);
  const [rejectModalApp, setRejectModalApp] = React.useState<AstrologerApplicationData | null>(null);
  const [rejectionReason, setRejectionReason] = React.useState("");
  const [approvalResult, setApprovalResult] = React.useState<AstrologerApplicationApprovalResult | null>(null);
  const [copiedField, setCopiedField] = React.useState<string | null>(null);

  const [search, setSearch] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [selectedSkill, setSelectedSkill] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<
    "all" | "online" | "featured" | "listed" | "initial_pwd"
  >("all");
  const [viewMode, setViewMode] = React.useState<"table" | "grid">("table");
  const [previewAstrologer, setPreviewAstrologer] =
    React.useState<AstrologerProfile | null>(null);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: defaults } = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: adminSettingsApi.get,
    enabled: ready,
  });

  const {
    data: astrologersList,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ["admin", "astrologers", debounced],
    queryFn: () =>
      adminApi.listAstrologers({
        search: debounced || undefined,
        limit: 100,
      }),
    enabled: ready,
    placeholderData: (previous) => previous,
  });

  // Fetch Astrologer Applications
  const {
    data: appRes,
    isLoading: isLoadingApps,
    isFetching: isFetchingApps,
    refetch: refetchApps,
  } = useQuery({
    queryKey: ["admin_astrologer_applications", appStatusFilter, appSearch],
    queryFn: async () => {
      const res = await adminApi.listAstrologerApplications({
        status: appStatusFilter === "all" ? undefined : appStatusFilter,
        search: appSearch.trim() || undefined,
        limit: 100,
      });
      const data = (res as any)?.data !== undefined ? (res as any).data : res;
      return (Array.isArray(data) ? data : []) as AstrologerApplicationData[];
    },
    enabled: ready,
    staleTime: 0,
    refetchOnMount: "always",
    refetchInterval: 10000,
  });

  const applications = Array.isArray(appRes) ? appRes : [];
  const pendingAppsCount = applications.filter((a) => a.status === "pending").length;

  const approveMutation = useMutation({
    mutationFn: async (appId: string) => {
      const res = await adminApi.approveAstrologerApplication(appId);
      return (res as any)?.data !== undefined ? (res as any).data : res;
    },
    onSuccess: (result: AstrologerApplicationApprovalResult) => {
      toast.success(result.message || "Astrologer approved successfully!");
      setApprovalResult(result);
      if (detailModalApp?.id === result.application_id) {
        setDetailModalApp(null);
      }
      queryClient.invalidateQueries({ queryKey: ["admin", "astrologers"] });
      queryClient.invalidateQueries({ queryKey: ["admin_astrologer_applications"] });
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : "Failed to approve application";
      toast.error(msg);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await adminApi.rejectAstrologerApplication(id, { reason: reason || undefined });
      return (res as any)?.data !== undefined ? (res as any).data : res;
    },
    onSuccess: () => {
      toast.success("Astrologer application marked as rejected.");
      setRejectModalApp(null);
      setRejectionReason("");
      if (detailModalApp) {
        setDetailModalApp(null);
      }
      queryClient.invalidateQueries({ queryKey: ["admin_astrologer_applications"] });
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : "Failed to reject application";
      toast.error(msg);
    },
  });

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success(`Copied ${fieldName} to clipboard!`);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const allAstrologers = astrologersList || [];

  // Metrics
  const onlineCount = allAstrologers.filter(
    (a) => a.availability?.is_online
  ).length;
  const featuredCount = allAstrologers.filter((a) => a.is_featured).length;
  const listedCount = allAstrologers.filter((a) => a.is_listed).length;
  const avgRate = allAstrologers.length
    ? Math.round(
        allAstrologers.reduce(
          (acc, a) =>
            acc +
            (a.rates?.chat_coins_per_minute ??
              defaults?.default_chat_coins_per_minute ??
              20),
          0
        ) / allAstrologers.length
      )
    : 20;

  // Filtered List
  const filteredAstrologers = React.useMemo(() => {
    return allAstrologers.filter((a) => {
      // Skill Filter
      if (selectedSkill !== "all") {
        if (!a.skills || !a.skills.includes(selectedSkill as Skill)) {
          return false;
        }
      }

      // Status Filter
      if (statusFilter === "online" && !a.availability?.is_online) return false;
      if (statusFilter === "featured" && !a.is_featured) return false;
      if (statusFilter === "listed" && !a.is_listed) return false;
      if (statusFilter === "initial_pwd" && !a.must_change_password) return false;

      return true;
    });
  }, [allAstrologers, selectedSkill, statusFilter]);

  if (!ready) return <LoadingBlock />;

  return (
    <div className="space-y-6">
      {/* ── 1. TOP HEADER & STUDIO ACTIONS ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex size-7 items-center justify-center rounded-xl bg-amber-500/15 text-[#D97706]">
              <Sparkles className="size-4" />
            </span>
            <h2 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-slate-900 leading-tight">
              Specialist Directory & Applications
            </h2>
          </div>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            Certified Vedic, Tarot, KP, and Nadi practitioners active across Astra Blink
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Refresh Button */}
          <button
            onClick={() => {
              refetch();
              refetchApps();
            }}
            disabled={isFetching || isFetchingApps}
            className="flex items-center gap-1.5 rounded-2xl bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer"
            title="Refresh Directory"
          >
            <RefreshCw
              className={cn(
                "size-3.5",
                (isFetching || isFetchingApps) && "animate-spin text-amber-600"
              )}
            />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {activeTab === "verified" && (
            <>
              {/* View Switcher */}
              <div className="flex items-center rounded-2xl bg-white p-1 shadow-sm border border-slate-100">
                <button
                  onClick={() => setViewMode("table")}
                  className={cn(
                    "flex size-9 items-center justify-center rounded-xl transition-all",
                    viewMode === "table"
                      ? "bg-slate-900 text-white shadow-xs"
                      : "text-slate-400 hover:text-slate-800 hover:bg-slate-50"
                  )}
                  title="Table View"
                  aria-label="Table View"
                >
                  <LayoutList className="size-4" />
                </button>
                <button
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "flex size-9 items-center justify-center rounded-xl transition-all",
                    viewMode === "grid"
                      ? "bg-slate-900 text-white shadow-xs"
                      : "text-slate-400 hover:text-slate-800 hover:bg-slate-50"
                  )}
                  title="Grid View"
                  aria-label="Grid View"
                >
                  <LayoutGrid className="size-4" />
                </button>
              </div>

              {/* Add Astrologer CTA */}
              <Link href="/astrologers/new">
                <button className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#D97706] to-[#F59E0B] px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-[0_8px_20px_-4px_rgba(217,119,6,0.45)] transition-all hover:from-[#B45309] hover:to-[#D97706] hover:shadow-[0_12px_25px_-4px_rgba(217,119,6,0.55)] active:scale-95 cursor-pointer">
                  <Plus className="size-4 stroke-[2.5]" />
                  <span>Manual Add</span>
                </button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* ── TOP TABS: VERIFIED SPECIALISTS vs APPLICATIONS ── */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab("verified")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer",
            activeTab === "verified"
              ? "bg-[#D97706] text-white shadow-sm shadow-amber-600/30"
              : "text-slate-600 hover:bg-slate-100"
          )}
        >
          <UserCheck className="size-4" />
          Verified Specialists ({allAstrologers.length})
        </button>

        <button
          onClick={() => setActiveTab("applications")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer relative",
            activeTab === "applications"
              ? "bg-[#D97706] text-white shadow-sm shadow-amber-600/30"
              : "text-slate-600 hover:bg-slate-100"
          )}
        >
          <Clock className="size-4" />
          ⏳ Pending Applications
          {pendingAppsCount > 0 && (
            <span
              className={cn(
                "ml-1 px-2 py-0.5 rounded-full text-xs font-black",
                activeTab === "applications"
                  ? "bg-white text-amber-800"
                  : "bg-amber-600 text-white"
              )}
            >
              {pendingAppsCount}
            </span>
          )}
        </button>
      </div>

      {/* ── TAB 1: VERIFIED SPECIALISTS ── */}
      {activeTab === "verified" && (
        <div className="space-y-6">

      {/* ── 2. 4 DEALDECK 3D METRIC CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Total Astrologers (Hero Golden Gradient) */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            setSelectedSkill("all");
            setStatusFilter("all");
          }}
          className="relative overflow-hidden rounded-[26px] bg-gradient-to-br from-[#B45309] via-[#D97706] to-[#F59E0B] p-5 text-white shadow-[0_14px_30px_-6px_rgba(217,119,6,0.45)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_-6px_rgba(217,119,6,0.6)] cursor-pointer group flex flex-col justify-between min-h-[145px]"
        >
          <div className="pointer-events-none absolute -right-6 -bottom-6 size-32 rounded-full bg-white/10 blur-xl group-hover:scale-125 transition-transform" />
          <div className="flex items-center justify-between">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md shadow-xs">
              <Users className="size-5 text-white stroke-[2.2]" />
            </div>
            <span className="rounded-full bg-white/20 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-black text-white">
              100% Verified
            </span>
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold text-white/80">
              Total Practitioners
            </p>
            <div className="mt-0.5 flex items-baseline justify-between">
              <h3 className="font-display text-3xl font-black tracking-tight text-white leading-none">
                {allAstrologers.length}
              </h3>
              <span className="text-[10px] font-medium text-white/70">
                Network Specialists
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Active / Online Now */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setStatusFilter("online")}
          className={cn(
            "rounded-[26px] bg-white p-5 border shadow-[0_10px_28px_rgba(20,25,45,0.03)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(20,25,45,0.07)] cursor-pointer group flex flex-col justify-between min-h-[145px]",
            statusFilter === "online"
              ? "border-emerald-400 ring-2 ring-emerald-100"
              : "border-slate-100/90"
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 group-hover:scale-105 transition-transform">
              <Activity className="size-5 stroke-[2.2]" />
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Now
            </span>
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold text-slate-400">
              Online Practitioners
            </p>
            <div className="mt-0.5 flex items-baseline justify-between">
              <h3 className="font-display text-3xl font-black tracking-tight text-slate-900 leading-none">
                {onlineCount}
              </h3>
              <span className="text-[10px] font-medium text-slate-400">
                Accepting Sessions
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Featured Top Picks */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setStatusFilter("featured")}
          className={cn(
            "rounded-[26px] bg-white p-5 border shadow-[0_10px_28px_rgba(20,25,45,0.03)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(20,25,45,0.07)] cursor-pointer group flex flex-col justify-between min-h-[145px]",
            statusFilter === "featured"
              ? "border-amber-400 ring-2 ring-amber-100"
              : "border-slate-100/90"
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 group-hover:scale-105 transition-transform">
              <Star className="size-5 stroke-[2.2] fill-amber-400 text-amber-400" />
            </div>
            <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
              Top Picks
            </span>
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold text-slate-400">
              Featured Specialists
            </p>
            <div className="mt-0.5 flex items-baseline justify-between">
              <h3 className="font-display text-3xl font-black tracking-tight text-slate-900 leading-none">
                {featuredCount}
              </h3>
              <span className="text-[10px] font-medium text-slate-400">
                Web Home Carousel
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Average Consultation Coins */}
        <div className="rounded-[26px] bg-white p-5 border border-slate-100/90 shadow-[0_10px_28px_rgba(20,25,45,0.03)] flex flex-col justify-between min-h-[145px]">
          <div className="flex items-center justify-between">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <Coins className="size-5 stroke-[2.2]" />
            </div>
            <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700">
              Platform Base
            </span>
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold text-slate-400">
              Avg Consultation Rate
            </p>
            <div className="mt-0.5 flex items-baseline justify-between">
              <h3 className="font-display text-3xl font-black tracking-tight text-slate-900 leading-none">
                {avgRate}{" "}
                <span className="text-sm font-bold text-slate-400">
                  coins/min
                </span>
              </h3>
              <span className="text-[10px] font-medium text-slate-400">
                {listedCount} Listed Online
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. FILTER, SEARCH & DISCIPLINE BAR ── */}
      <div className="space-y-4 rounded-[28px] bg-white p-5 sm:p-6 border border-slate-100/90 shadow-[0_10px_30px_rgba(20,25,45,0.03)]">
        {/* Search Bar + Quick Status Pills */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search astrologers by name, email, phone or tagline…"
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

          {/* Quick Status Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "all", label: "All Specialists", count: allAstrologers.length },
              { id: "online", label: "Online", count: onlineCount },
              { id: "featured", label: "Featured", count: featuredCount },
              { id: "listed", label: "Public Directory", count: listedCount },
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

        {/* Speciality Discipline Chips */}
        <div className="border-t border-slate-100 pt-3.5">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
            <span className="shrink-0 text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1">
              Discipline:
            </span>
            <button
              onClick={() => setSelectedSkill("all")}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1 text-xs font-bold transition-all cursor-pointer",
                selectedSkill === "all"
                  ? "bg-gradient-to-r from-[#D97706] to-[#F59E0B] text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
              )}
            >
              All Disciplines
            </button>
            {SKILLS.map((skill) => {
              const active = selectedSkill === skill;
              const count = allAstrologers.filter((a) =>
                a.skills?.includes(skill)
              ).length;
              return (
                <button
                  key={skill}
                  onClick={() => setSelectedSkill(skill)}
                  className={cn(
                    "shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition-all cursor-pointer",
                    active
                      ? "bg-gradient-to-r from-[#D97706] to-[#F59E0B] text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900"
                  )}
                >
                  <span>{SKILL_LABELS[skill]}</span>
                  {count > 0 && (
                    <span
                      className={cn(
                        "rounded-full px-1.5 text-[9px] font-black",
                        active ? "bg-white/25 text-white" : "bg-slate-200 text-slate-700"
                      )}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── 4. MAIN SPECIALISTS DISPLAY: TABLE OR LUXURY GRID ── */}
      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700">
          {(error as ApiError).message}
        </div>
      ) : isLoading ? (
        <LoadingBlock label="Loading verified astrologers…" />
      ) : filteredAstrologers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[28px] bg-white py-16 px-4 text-center border border-slate-100 shadow-sm">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-amber-50 text-[#D97706] mb-3">
            <Users className="size-7" />
          </div>
          <h3 className="font-display text-base font-bold text-slate-900">
            {debounced || selectedSkill !== "all" || statusFilter !== "all"
              ? "No astrologers match this filter"
              : "No astrologers registered yet"}
          </h3>
          <p className="mt-1 text-xs text-slate-400 max-w-sm">
            {debounced || selectedSkill !== "all" || statusFilter !== "all"
              ? "Try resetting your search query or discipline filters to see more results."
              : "Start building your astrology network. Add certified practitioners and issue credentials."}
          </p>
          <div className="mt-4 flex gap-2">
            {(debounced || selectedSkill !== "all" || statusFilter !== "all") && (
              <button
                onClick={() => {
                  setSearch("");
                  setSelectedSkill("all");
                  setStatusFilter("all");
                }}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
              >
                Clear all filters
              </button>
            )}
            <Link href="/astrologers/new">
              <button className="rounded-xl bg-gradient-to-r from-[#D97706] to-[#F59E0B] px-4 py-2 text-xs font-bold text-white shadow-sm hover:from-[#B45309] hover:to-[#D97706] transition-all cursor-pointer">
                + Add Astrologer
              </button>
            </Link>
          </div>
        </div>
      ) : viewMode === "table" ? (
        /* ── TABLE VIEW ── */
        <div className="overflow-hidden rounded-[28px] bg-white border border-slate-100/90 shadow-[0_12px_32px_rgba(20,25,45,0.03)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-4 pl-6 pr-4">Astrologer & Identity</th>
                  <th className="py-4 px-4">Specialities</th>
                  <th className="py-4 px-4">Consultation Rates</th>
                  <th className="py-4 px-4">Availability</th>
                  <th className="py-4 px-4">Experience</th>
                  <th className="py-4 px-4">Joined (IST)</th>
                  <th className="py-4 pr-6 pl-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAstrologers.map((astrologer) => (
                  <tr
                    key={astrologer.id}
                    className="group transition-colors hover:bg-slate-50/80 cursor-pointer"
                    onClick={() => setPreviewAstrologer(astrologer)}
                  >
                    {/* Astrologer Column */}
                    <td className="py-4 pl-6 pr-4">
                      <div className="flex items-center gap-3.5">
                        <div className="relative shrink-0">
                          <Avatar
                            src={astrologer.profile_image_url}
                            name={astrologer.display_name}
                            size="md"
                            className="size-11 rounded-2xl ring-2 ring-slate-100 object-cover"
                          />
                          <span className="absolute -right-0.5 -bottom-0.5 rounded-full bg-white p-[2px] shadow-xs">
                            <StatusDot
                              online={astrologer.availability?.is_online}
                              busy={astrologer.availability?.is_busy}
                            />
                          </span>
                        </div>
                        <div className="min-w-0 max-w-xs">
                          <div className="flex items-center gap-1.5">
                            <p className="truncate font-bold text-slate-900 group-hover:text-[#D97706] transition-colors text-sm">
                              {astrologer.display_name}
                            </p>
                            {astrologer.is_featured && (
                              <span
                                title="Featured Specialist"
                                className="inline-flex items-center"
                              >
                                <Star className="size-3.5 fill-amber-400 text-amber-500" />
                              </span>
                            )}
                          </div>
                          <p className="truncate text-[11px] font-semibold text-slate-400">
                            {astrologer.email}
                          </p>
                          {astrologer.tagline && (
                            <p className="truncate text-[10px] font-medium text-slate-500 mt-0.5">
                              {astrologer.tagline}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Specialities Column */}
                    <td className="py-4 px-4">
                      <div className="flex max-w-[210px] flex-wrap gap-1.5">
                        {astrologer.skills?.slice(0, 2).map((skill) => (
                          <span
                            key={skill}
                            className="rounded-lg bg-amber-50/80 border border-amber-200/60 px-2 py-0.5 text-[10px] font-bold text-[#B45309]"
                          >
                            {SKILL_LABELS[skill] || skill}
                          </span>
                        ))}
                        {(astrologer.skills?.length || 0) > 2 && (
                          <span className="rounded-lg bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                            +{(astrologer.skills?.length || 0) - 2}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Consultation Rates Column */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 rounded-xl bg-slate-50 px-2.5 py-1 text-xs font-black text-slate-900 border border-slate-100">
                          <Coins className="size-3 text-[#D97706]" />
                          {astrologer.rates?.chat_coins_per_minute ??
                            defaults?.default_chat_coins_per_minute ??
                            20}{" "}
                          <span className="text-[10px] font-semibold text-slate-400">
                            /min
                          </span>
                        </span>
                      </div>
                    </td>

                    {/* Availability / Status Column */}
                    <td className="py-4 px-4">
                      <div className="flex flex-wrap gap-1.5 max-w-[170px]">
                        {astrologer.availability?.is_online ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200/60">
                            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Online
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-500">
                            <span className="size-1.5 rounded-full bg-slate-400" />
                            Offline
                          </span>
                        )}

                        {astrologer.is_featured && (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200/60">
                            Featured
                          </span>
                        )}

                        {!astrologer.is_listed && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                            Unlisted
                          </span>
                        )}

                        {astrologer.must_change_password && (
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200/60">
                            Initial Pwd
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Experience Column */}
                    <td className="py-4 px-4 whitespace-nowrap font-bold text-slate-700">
                      {astrologer.experience_years
                        ? `${astrologer.experience_years} years`
                        : "10+ years"}
                    </td>

                    {/* Joined Date (IST) */}
                    <td className="py-4 px-4 whitespace-nowrap text-slate-400 font-semibold text-[11px]">
                      {formatDate(astrologer.created_at)}
                    </td>

                    {/* Actions Column */}
                    <td
                      className="py-4 pr-6 pl-4 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setPreviewAstrologer(astrologer)}
                          className="flex size-8 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-[#D97706] hover:text-white transition-all cursor-pointer"
                          title="Quick View"
                        >
                          <Eye className="size-3.5" />
                        </button>
                        <Link href={`/astrologers/${astrologer.id}`}>
                          <button className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-xs transition-all hover:bg-slate-900 hover:text-white hover:border-slate-900 cursor-pointer">
                            Manage
                          </button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ── LUXURY GRID VIEW ── */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredAstrologers.map((astrologer) => (
            <div
              key={astrologer.id}
              onClick={() => setPreviewAstrologer(astrologer)}
              className="rounded-[28px] bg-white p-5 sm:p-6 border border-slate-100/90 shadow-[0_10px_30px_rgba(20,25,45,0.03)] hover:-translate-y-1.5 hover:shadow-[0_20px_42px_rgba(20,25,45,0.08)] transition-all duration-300 relative group cursor-pointer flex flex-col justify-between"
            >
              <div>
                {/* Top Row: Avatar & Badges */}
                <div className="flex items-start justify-between gap-3">
                  <div className="relative">
                    <Avatar
                      src={astrologer.profile_image_url}
                      name={astrologer.display_name}
                      size="lg"
                      className="size-14 rounded-2xl ring-2 ring-slate-100 object-cover shadow-sm"
                    />
                    <span className="absolute -bottom-1 -right-1 rounded-full bg-white p-0.5 shadow-xs">
                      <StatusDot
                        online={astrologer.availability?.is_online}
                        busy={astrologer.availability?.is_busy}
                      />
                    </span>
                  </div>

                  <div className="flex flex-col items-end gap-1.5">
                    {astrologer.availability?.is_online ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200/60">
                        <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Online Now
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                        Offline
                      </span>
                    )}

                    {astrologer.is_featured && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-700 border border-amber-200">
                        <Star className="size-2.5 fill-amber-500 text-amber-500" />
                        Featured
                      </span>
                    )}
                  </div>
                </div>

                {/* Name & Tagline */}
                <div className="mt-3.5">
                  <h4 className="font-display text-base font-bold text-slate-900 group-hover:text-[#D97706] transition-colors truncate">
                    {astrologer.display_name}
                  </h4>
                  <p className="text-xs font-semibold text-slate-400 truncate">
                    {astrologer.email}
                  </p>
                  <p className="mt-1 text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {astrologer.tagline ||
                      astrologer.bio ||
                      "Certified astrology specialist on Astra Blink"}
                  </p>
                </div>

                {/* Skill Badges */}
                <div className="mt-3.5 flex flex-wrap gap-1.5">
                  {astrologer.skills?.slice(0, 3).map((skill) => (
                    <span
                      key={skill}
                      className="rounded-lg bg-amber-50/80 border border-amber-200/60 px-2.5 py-1 text-[10px] font-bold text-[#B45309]"
                    >
                      {SKILL_LABELS[skill] || skill}
                    </span>
                  ))}
                  {(astrologer.skills?.length || 0) > 3 && (
                    <span className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">
                      +{(astrologer.skills?.length || 0) - 3}
                    </span>
                  )}
                </div>
              </div>

              {/* Bottom Card Ribbon & Actions */}
              <div className="mt-5 border-t border-slate-100 pt-3.5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Rate Card
                  </span>
                  <span className="font-extrabold text-slate-900 text-sm">
                    {astrologer.rates?.chat_coins_per_minute ??
                      defaults?.default_chat_coins_per_minute ??
                      20}{" "}
                    <span className="text-xs font-semibold text-slate-400">
                      coins/min
                    </span>
                  </span>
                </div>

                <div
                  className="flex items-center gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Link href={`/astrologers/${astrologer.id}`}>
                    <button className="rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-slate-800 transition-all cursor-pointer">
                      Manage
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
      )}

      {/* ── TAB 2: PENDING & PROCESSED ASTROLOGER APPLICATIONS ── */}
      {activeTab === "applications" && (
        <div className="space-y-5">
          {/* Controls: Search & Filter Tabs */}
          <Card className="border border-slate-200">
            <CardBody className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <Input
                  value={appSearch}
                  onChange={(e) => setAppSearch(e.target.value)}
                  placeholder="Search by name, phone, email, app #..."
                  className="pl-9 text-xs"
                />
              </div>

              <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
                {[
                  { key: "pending", label: "Pending" },
                  { key: "approved", label: "Approved" },
                  { key: "rejected", label: "Rejected" },
                  { key: "all", label: "All" },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setAppStatusFilter(tab.key)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer",
                      appStatusFilter === tab.key
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </CardBody>
          </Card>

          {/* Applications List */}
          {isLoadingApps ? (
            <LoadingBlock label="Loading Astrologer onboarding applications..." />
          ) : applications.length === 0 ? (
            <Card className="border border-dashed border-slate-300 p-8 text-center">
              <Clock className="size-10 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">
                No {appStatusFilter !== "all" ? appStatusFilter : ""} applications found.
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Applicants who complete the website registration at /become-an-astrologer will appear here.
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {applications.map((app) => (
                <Card
                  key={app.id}
                  className={cn(
                    "border transition-all overflow-hidden",
                    app.status === "pending"
                      ? "border-amber-300/80 bg-amber-50/15"
                      : app.status === "approved"
                      ? "border-emerald-200 bg-emerald-50/15"
                      : "border-rose-200 bg-rose-50/15"
                  )}
                >
                  <CardBody className="p-5 space-y-4">
                    {/* Top Row: App #, Date, Status */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-md bg-slate-100 text-slate-800">
                          {app.application_number}
                        </span>
                        <span className="text-xs text-slate-400">
                          Applied: {new Date(app.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>

                      <div>
                        {app.status === "pending" && (
                          <Badge tone="neutral" className="bg-amber-100 text-amber-900 border-amber-300 font-bold text-xs">
                            ⏳ Pending Review
                          </Badge>
                        )}
                        {app.status === "approved" && (
                          <Badge tone="neutral" className="bg-emerald-100 text-emerald-900 border-emerald-300 font-bold text-xs">
                            ✅ Approved & Live
                          </Badge>
                        )}
                        {app.status === "rejected" && (
                          <Badge tone="neutral" className="bg-rose-100 text-rose-900 border-rose-300 font-bold text-xs">
                            ❌ Rejected
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Applicant Profile Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Column 1: Identity & Contact */}
                      <div className="flex items-start gap-3">
                        <div className="relative size-14 rounded-2xl overflow-hidden bg-amber-100 shrink-0 border border-amber-200">
                          {app.avatar_url ? (
                            <Image src={app.avatar_url} alt={app.full_name} fill className="object-cover" unoptimized />
                          ) : (
                            <div className="size-full flex items-center justify-center text-amber-700 font-bold text-lg">
                              {app.full_name.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-bold text-base text-slate-900 flex items-center gap-1.5">
                            {app.full_name}
                            {app.age && <span className="text-xs font-normal text-slate-500">({app.age} yrs{app.gender ? `, ${app.gender}` : ""})</span>}
                          </h4>
                          <div className="text-xs text-slate-600 flex items-center gap-1.5">
                            <Phone className="size-3.5 text-slate-400" />
                            <span>{app.phone}</span>
                          </div>
                          <div className="text-xs text-slate-600 flex items-center gap-1.5">
                            <Mail className="size-3.5 text-slate-400" />
                            <span className="truncate">{app.email}</span>
                          </div>
                          <div className="text-xs text-slate-600 flex items-center gap-1.5">
                            <Globe className="size-3.5 text-slate-400" />
                            <span>{app.city}, {app.state} {app.pincode ? `(${app.pincode})` : ""}</span>
                          </div>
                        </div>
                      </div>

                      {/* Column 2: Competence, Skills & Specialisations */}
                      <div className="space-y-2 border-t md:border-t-0 md:border-l border-slate-100 md:pl-4">
                        <div className="flex items-center gap-2">
                          <Award className="size-4 text-amber-600" />
                          <span className="font-bold text-xs text-slate-900">
                            {app.experience_years} Years Professional Experience
                          </span>
                        </div>
                        <div className="text-xs text-slate-500">
                          Languages: <span className="text-slate-800 font-medium">{app.languages?.join(", ")}</span>
                        </div>

                        {/* Disciplines / Skills */}
                        <div>
                          <div className="text-[11px] font-bold text-slate-500 mb-1">
                            Astrological Disciplines ({app.skills?.length || 0}):
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {(app.skills || []).map((skill, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200/80 text-[10px] text-amber-900 font-semibold"
                              >
                                {SKILL_LABELS[skill as Skill] || skill.replace("_", " ").toUpperCase()}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Specialisations */}
                        {(app.specialisations || []).length > 0 && (
                          <div>
                            <div className="text-[11px] font-bold text-slate-500 mb-1">
                              Consultation Focus:
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {app.specialisations.slice(0, 3).map((spec, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] text-slate-700 font-medium"
                                >
                                  {spec}
                                </span>
                              ))}
                              {app.specialisations.length > 3 && (
                                <span className="text-[10px] text-amber-600 font-bold self-center">
                                  +{app.specialisations.length - 3} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Column 3: Payout Details & Verification Doc */}
                      <div className="space-y-2 border-t md:border-t-0 md:border-l border-slate-100 md:pl-4">
                        <div className="flex items-center gap-2 text-xs">
                          <CreditCard className="size-4 text-slate-400" />
                          <span className="font-bold text-slate-800">Payout Details:</span>
                        </div>
                        <div className="text-xs text-slate-600 space-y-0.5">
                          {app.upi_id && <div>UPI: <span className="font-mono text-slate-900 font-bold">{app.upi_id}</span></div>}
                          {app.bank_account_number && (
                            <div>Bank: <span className="font-mono">{app.bank_account_number.slice(-4).padStart(app.bank_account_number.length, "*")}</span> ({app.bank_ifsc || "IFSC"})</div>
                          )}
                          {app.bank_account_holder && <div>Holder: {app.bank_account_holder}</div>}
                          {app.pan_card && <div>PAN: <span className="font-mono uppercase">{app.pan_card}</span></div>}
                        </div>

                        {/* ID Document Link */}
                        <div className="pt-1">
                          {app.identity_proof_url ? (
                            <a
                              href={app.identity_proof_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline"
                            >
                              <FileText className="size-3.5" />
                              View Certificate / Credentials
                              <ExternalLink className="size-3" />
                            </a>
                          ) : (
                            <span className="text-xs text-slate-400 italic">No document attached</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bio or Rejection Reason Note */}
                    {app.bio && (
                      <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <b>Background & Consultation Philosophy:</b> {app.bio}
                      </div>
                    )}

                    {app.status === "rejected" && app.rejection_reason && (
                      <div className="text-xs text-rose-700 bg-rose-50 p-3 rounded-xl border border-rose-200">
                        <b>Rejection Reason:</b> {app.rejection_reason}
                      </div>
                    )}

                    {/* Action Bar */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDetailModalApp(app)}
                        className="text-xs font-semibold cursor-pointer"
                      >
                        <Eye className="size-3.5 mr-1 text-slate-500" />
                        View Full Details
                      </Button>

                      {app.status === "pending" && (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setRejectModalApp(app);
                              setRejectionReason("");
                            }}
                            className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-bold cursor-pointer"
                          >
                            <XCircle className="size-3.5 mr-1" />
                            Reject
                          </Button>

                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => approveMutation.mutate(app.id)}
                            loading={approveMutation.isPending && approveMutation.variables === app.id}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer"
                          >
                            <CheckCircle2 className="size-3.5 mr-1" />
                            Approve & Onboard
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 5. INTERACTIVE 3D QUICK PROFILE SLIDE-OVER DRAWER ── */}
      {previewAstrologer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
            onClick={() => setPreviewAstrologer(null)}
          />

          {/* Drawer Body */}
          <div className="relative z-10 flex h-full w-full max-w-lg flex-col bg-white shadow-2xl border-l border-slate-100 overflow-hidden animate-in slide-in-from-right duration-300">
            {/* Header with Avatar & Banner */}
            <div className="relative p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white">
              <button
                onClick={() => setPreviewAstrologer(null)}
                className="absolute top-4 right-4 flex size-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>

              <div className="flex items-center gap-4">
                <Avatar
                  src={previewAstrologer.profile_image_url}
                  name={previewAstrologer.display_name}
                  size="lg"
                  className="size-16 rounded-2xl ring-4 ring-white/10 object-cover"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-lg font-black text-white truncate">
                      {previewAstrologer.display_name}
                    </h3>
                    {previewAstrologer.is_featured && (
                      <Star className="size-4 fill-amber-400 text-amber-400 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs font-semibold text-slate-300 truncate">
                    {previewAstrologer.email}
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-amber-300 font-bold">
                    <span>
                      {previewAstrologer.experience_years
                        ? `${previewAstrologer.experience_years} Years Experience`
                        : "Verified Specialist"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Drawer Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-thin">
              {/* Consultation Modes */}
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Supported Modes
                </span>
                <div className="mt-2 grid grid-cols-3 gap-2.5">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3 text-center">
                    <MessageSquare className="size-4 text-[#D97706] mx-auto mb-1" />
                    <p className="text-[10px] font-bold text-slate-500">Chat</p>
                    <p className="font-black text-slate-900 text-xs mt-0.5">
                      {previewAstrologer.rates?.chat_coins_per_minute ?? 20} coins
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3 text-center">
                    <PhoneCall className="size-4 text-emerald-600 mx-auto mb-1" />
                    <p className="text-[10px] font-bold text-slate-500">Call</p>
                    <p className="font-black text-slate-900 text-xs mt-0.5">
                      {previewAstrologer.rates?.call_coins_per_minute ?? 30} coins
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3 text-center">
                    <Video className="size-4 text-indigo-600 mx-auto mb-1" />
                    <p className="text-[10px] font-bold text-slate-500">Video</p>
                    <p className="font-black text-slate-900 text-xs mt-0.5">
                      {previewAstrologer.rates?.video_coins_per_minute ?? 45} coins
                    </p>
                  </div>
                </div>
              </div>

              {/* Bio & Tagline */}
              {previewAstrologer.bio && (
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    About / Bio
                  </span>
                  <p className="mt-1.5 text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                    {previewAstrologer.bio}
                  </p>
                </div>
              )}

              {/* Specialities */}
              {previewAstrologer.skills && previewAstrologer.skills.length > 0 && (
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Core Specialities
                  </span>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {previewAstrologer.skills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-lg bg-amber-50 border border-amber-200/80 px-2.5 py-1 text-xs font-bold text-[#B45309]"
                      >
                        {SKILL_LABELS[skill] || skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Languages */}
              {previewAstrologer.languages &&
                previewAstrologer.languages.length > 0 && (
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Languages Spoken
                    </span>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {previewAstrologer.languages.map((lang) => (
                        <span
                          key={lang}
                          className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700"
                        >
                          {lang}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              {/* Quick Metadata Info */}
              <div className="space-y-2 border-t border-slate-100 pt-4 text-xs font-semibold text-slate-600">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Phone:</span>
                  <span>{previewAstrologer.phone || "Not set"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Public Directory:</span>
                  <span
                    className={
                      previewAstrologer.is_listed
                        ? "text-emerald-600 font-bold"
                        : "text-slate-500"
                    }
                  >
                    {previewAstrologer.is_listed ? "Listed" : "Unlisted"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Commission Share:</span>
                  <span>{previewAstrologer.commission_percent ?? 20}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Joined Platform:</span>
                  <span>{formatDate(previewAstrologer.created_at)}</span>
                </div>
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <button
                onClick={() => setPreviewAstrologer(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Close
              </button>
              <Link href={`/astrologers/${previewAstrologer.id}`}>
                <button className="rounded-xl bg-gradient-to-r from-[#D97706] to-[#F59E0B] px-4 py-2 text-xs font-bold text-white shadow-sm hover:from-[#B45309] hover:to-[#D97706] transition-all flex items-center gap-1.5">
                  <span>Manage Specialist</span>
                  <ArrowRight className="size-3.5" />
                </button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: APPLICATION FULL DETAILS                                            */}
      {/* ========================================================================= */}
      {detailModalApp && (
        <Modal
          open={!!detailModalApp}
          onClose={() => setDetailModalApp(null)}
          title={`Astrologer Application — ${detailModalApp.application_number}`}
        >
          <div className="space-y-4 max-h-[75vh] overflow-y-auto p-1 text-xs">
            {/* Header */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-200">
              <div>
                <h4 className="font-bold text-base text-slate-900">{detailModalApp.full_name}</h4>
                <p className="text-slate-500">
                  {detailModalApp.experience_years} Years Experience
                  {detailModalApp.age ? ` • Age: ${detailModalApp.age}` : ""}
                  {detailModalApp.gender ? ` • ${detailModalApp.gender}` : ""}
                </p>
              </div>
              <Badge
                tone="neutral"
                className={cn(
                  "font-bold text-xs",
                  detailModalApp.status === "pending"
                    ? "bg-amber-100 text-amber-900 border-amber-300"
                    : detailModalApp.status === "approved"
                    ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                    : "bg-rose-100 text-rose-900 border-rose-300"
                )}
              >
                {detailModalApp.status.toUpperCase()}
              </Badge>
            </div>

            {/* Contact & Location */}
            <div className="space-y-2 border p-3 rounded-xl border-slate-200">
              <h5 className="font-bold text-slate-900">Contact & Address</h5>
              <div className="grid grid-cols-2 gap-2 text-slate-600">
                <div>Email: <b className="text-slate-900">{detailModalApp.email}</b></div>
                <div>Phone: <b className="text-slate-900">{detailModalApp.phone}</b></div>
                <div>City: {detailModalApp.city}</div>
                <div>State: {detailModalApp.state}</div>
                <div>Pincode: {detailModalApp.pincode || "N/A"}</div>
                <div>Address: {detailModalApp.address || "N/A"}</div>
              </div>
            </div>

            {/* Disciplines & Specialisations */}
            <div className="space-y-2 border p-3 rounded-xl border-slate-200">
              <h5 className="font-bold text-slate-900">Astrological Disciplines & Focus</h5>
              <p><b>Languages:</b> {detailModalApp.languages?.join(", ")}</p>
              <div>
                <b>Practiced Systems:</b>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(detailModalApp.skills || []).map((s, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200 text-[11px] font-semibold">
                      {SKILL_LABELS[s as Skill] || s}
                    </span>
                  ))}
                </div>
              </div>
              {(detailModalApp.specialisations || []).length > 0 && (
                <div className="mt-1">
                  <b>Consultation Focus:</b>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {detailModalApp.specialisations.map((spec, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px]">
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {(detailModalApp.qualifications || []).length > 0 && (
                <div className="mt-1">
                  <b>Qualifications & Titles:</b>
                  <p className="mt-0.5 text-slate-700">{detailModalApp.qualifications.join(", ")}</p>
                </div>
              )}
              {detailModalApp.bio && (
                <div className="mt-2 pt-2 border-t border-slate-100">
                  <b>Background & Lineage:</b>
                  <p className="mt-1 leading-relaxed text-slate-700">{detailModalApp.bio}</p>
                </div>
              )}
            </div>

            {/* Bank & Payout */}
            <div className="space-y-2 border p-3 rounded-xl border-slate-200">
              <h5 className="font-bold text-slate-900">Financial & Payout Information</h5>
              <div className="grid grid-cols-2 gap-2 text-slate-600">
                <div>UPI ID: <b className="font-mono text-slate-900">{detailModalApp.upi_id || "N/A"}</b></div>
                <div>PAN Card: <b className="font-mono text-slate-900">{detailModalApp.pan_card || "N/A"}</b></div>
                <div>Account Holder: {detailModalApp.bank_account_holder || "N/A"}</div>
                <div>Account Number: <span className="font-mono">{detailModalApp.bank_account_number || "N/A"}</span></div>
                <div>IFSC Code: <span className="font-mono">{detailModalApp.bank_ifsc || "N/A"}</span></div>
                <div>Bank Name: {detailModalApp.bank_name || "N/A"}</div>
              </div>
            </div>

            {/* Attached Verification Doc */}
            {detailModalApp.identity_proof_url && (
              <div className="p-3 rounded-xl border border-blue-200 bg-blue-50/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="size-4 text-blue-600" />
                  <span className="font-bold text-blue-900">Certificate / Identity Document</span>
                </div>
                <a
                  href={detailModalApp.identity_proof_url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1 bg-blue-600 text-white rounded-lg font-bold flex items-center gap-1 hover:bg-blue-700"
                >
                  Open Document <ExternalLink className="size-3" />
                </a>
              </div>
            )}

            {/* Actions */}
            {detailModalApp.status === "pending" && (
              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setRejectModalApp(detailModalApp);
                    setRejectionReason("");
                  }}
                  className="text-rose-600 hover:text-rose-700"
                >
                  Reject Application
                </Button>
                <Button
                  variant="primary"
                  onClick={() => approveMutation.mutate(detailModalApp.id)}
                  loading={approveMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  Approve & Onboard
                </Button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL: APPROVAL SUCCESS & CREDENTIALS                                       */}
      {/* ========================================================================= */}
      {approvalResult && (
        <Modal
          open={!!approvalResult}
          onClose={() => setApprovalResult(null)}
          title="🎉 Astrologer Approved & Live!"
        >
          <div className="space-y-4 p-1 text-xs">
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900">
              <h4 className="font-bold text-sm mb-1">
                {approvalResult.display_name} is now an active Astrologer!
              </h4>
              <p>
                {approvalResult.email_sent
                  ? `An official welcome email with login credentials has been sent to ${approvalResult.email}.`
                  : `User account & Astrologer profile created. Welcome email could not be sent automatically; please provide the credentials manually.`}
              </p>
            </div>

            <div className="space-y-3 border p-4 rounded-xl border-slate-200 bg-slate-50">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Login Email</label>
                <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 mt-1">
                  <span className="font-mono font-bold text-slate-900">{approvalResult.email}</span>
                  <button
                    onClick={() => copyToClipboard(approvalResult.email, "Email")}
                    className="text-slate-500 hover:text-amber-600 cursor-pointer"
                  >
                    {copiedField === "Email" ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Initial Password</label>
                <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 mt-1">
                  <span className="font-mono font-bold text-amber-700 text-sm">{approvalResult.temporary_password}</span>
                  <button
                    onClick={() => copyToClipboard(approvalResult.temporary_password, "Password")}
                    className="text-slate-500 hover:text-amber-600 cursor-pointer"
                  >
                    {copiedField === "Password" ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Astrologer Portal URL</label>
                <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 mt-1">
                  <span className="font-mono text-slate-700 truncate mr-2">{approvalResult.dashboard_url}</span>
                  <button
                    onClick={() => copyToClipboard(approvalResult.dashboard_url, "Portal URL")}
                    className="text-slate-500 hover:text-amber-600 cursor-pointer"
                  >
                    {copiedField === "Portal URL" ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="primary"
                onClick={() => setApprovalResult(null)}
                className="bg-slate-900 text-white font-bold"
              >
                Done
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REJECT APPLICATION                                                   */}
      {/* ========================================================================= */}
      {rejectModalApp && (
        <Modal
          open={!!rejectModalApp}
          onClose={() => setRejectModalApp(null)}
          title={`Reject Application — ${rejectModalApp.application_number}`}
        >
          <div className="space-y-4 p-1 text-xs">
            <p className="text-slate-600">
              Are you sure you want to reject the application submitted by <b>{rejectModalApp.full_name}</b>?
            </p>

            <Field label="Rejection Reason (Optional)">
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Incomplete credentials, certification verification unconfirmed, etc."
                rows={3}
                className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs focus:border-rose-500 focus:outline-none"
              />
            </Field>

            <div className="flex items-center justify-end gap-2 pt-3 border-t">
              <Button variant="outline" onClick={() => setRejectModalApp(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() =>
                  rejectMutation.mutate({
                    id: rejectModalApp.id,
                    reason: rejectionReason,
                  })
                }
                loading={rejectMutation.isPending}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                Confirm Rejection
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
