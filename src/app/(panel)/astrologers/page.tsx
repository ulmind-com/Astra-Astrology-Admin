"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Coins,
  Eye,
  Globe,
  GraduationCap,
  LayoutGrid,
  LayoutList,
  Mail,
  MessageSquare,
  Phone,
  PhoneCall,
  Plus,
  Search,
  Sparkles,
  Star,
  Users,
  Video,
  X,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { Avatar, LoadingBlock, StatusDot } from "@/components/ui";
import { adminApi, adminSettingsApi } from "@/lib/api";
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
              Specialist Directory
            </h2>
          </div>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            Certified Vedic, Tarot, KP, and Nadi practitioners active across
            Astra Blink
          </p>
        </div>

        <div className="flex items-center gap-3">
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
              <span>Add Astrologer</span>
            </button>
          </Link>
        </div>
      </div>

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
    </div>
  );
}
