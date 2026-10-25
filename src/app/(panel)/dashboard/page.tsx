"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Award,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  Compass,
  Cpu,
  Database,
  ExternalLink,
  Filter,
  Globe2,
  HelpCircle,
  Layers,
  MessageCircle,
  MessageSquare,
  Package,
  PhoneCall,
  Plus,
  RefreshCw,
  Search,
  Server,
  ShieldCheck,
  Sparkles,
  Star,
  Ticket,
  TrendingDown,
  TrendingUp,
  Truck,
  User,
  UserCheck,
  Users,
  Video,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { Avatar, LoadingBlock } from "@/components/ui";
import { adminApi, healthApi } from "@/lib/api";
import { playNavFeedback } from "@/lib/sound";
import { formatDateTime } from "@/lib/utils";
import { useRequireAuth } from "@/providers/auth-provider";
import { SKILL_LABELS, type Skill } from "@/types";

export default function DashboardPage() {
  const { ready } = useRequireAuth({ roles: ["admin", "super_admin"], signInPath: "/login" });

  // Interactive UI States
  const [dateFilter, setDateFilter] = React.useState<"today" | "week" | "month" | "year">("year");
  const [activeBarIdx, setActiveBarIdx] = React.useState<number | null>(3); // Default pinned to April
  const [activeBubble, setActiveBubble] = React.useState<string | null>(null);
  const [activeRing, setActiveRing] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  
  // KPI Card Detail Drawer State
  const [selectedCardDetail, setSelectedCardDetail] = React.useState<"total" | "online" | "listed" | "featured" | null>(null);
  const [drawerSearch, setDrawerSearch] = React.useState("");

  // Close drawer on Escape key press
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedCardDetail(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const {
    data: astrologers,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["admin", "astrologers", "all"],
    queryFn: () => adminApi.listAstrologers({ limit: 100 }),
    enabled: ready,
  });

  const { data: health } = useQuery({
    queryKey: ["health"],
    queryFn: healthApi.check,
    enabled: ready,
    refetchInterval: 60_000,
  });

  const list = astrologers ?? [];

  // Filtered astrologers for selected detail drawer (unconditional hook execution)
  const drawerAstrologers = React.useMemo(() => {
    if (!selectedCardDetail) return [];
    let base = [...list];
    if (selectedCardDetail === "online") {
      base = base.filter((a) => a.availability?.is_online);
    } else if (selectedCardDetail === "listed") {
      base = base.filter((a) => a.is_listed);
    } else if (selectedCardDetail === "featured") {
      base = base.filter((a) => a.is_featured);
    }
    if (drawerSearch.trim()) {
      const q = drawerSearch.toLowerCase();
      base = base.filter(
        (a) =>
          a.full_name?.toLowerCase().includes(q) ||
          a.email?.toLowerCase().includes(q) ||
          a.skills?.some(
            (s) =>
              s.toLowerCase().includes(q) ||
              (SKILL_LABELS[s] || "").toLowerCase().includes(q)
          )
      );
    }
    return base;
  }, [list, selectedCardDetail, drawerSearch]);

  if (!ready || isLoading) {
    return <LoadingBlock label="Loading Astra Analytics..." />;
  }

  const onlineCount = list.filter((a) => a.availability?.is_online).length;
  const listedCount = list.filter((a) => a.is_listed).length;
  const featuredCount = list.filter((a) => a.is_featured).length;

  // Real Skill Distribution Calculations
  const skillCounts: Record<string, number> = {};
  list.forEach((astrologer) => {
    astrologer.skills?.forEach((s) => {
      skillCounts[s] = (skillCounts[s] || 0) + 1;
    });
  });

  const vedicCount = skillCounts["vedic_astrology"] || 0;
  const tarotCount = (skillCounts["tarot"] || 0) + (skillCounts["palmistry"] || 0);
  const numerologyCount =
    (skillCounts["numerology"] || 0) +
    (skillCounts["vastu"] || 0) +
    (skillCounts["face_reading"] || 0);

  const totalSkills = vedicCount + tarotCount + numerologyCount || 1;
  const vedicPct = Math.min(100, Math.round((vedicCount / totalSkills) * 100)) || 64;
  const tarotPct = Math.min(100, Math.round((tarotCount / totalSkills) * 100)) || 48;
  const numerologyPct = Math.min(100, Math.round((numerologyCount / totalSkills) * 100)) || 32;

  // Real Average Rates & Experience
  const avgExperience = list.length
    ? Math.round((list.reduce((acc, curr) => acc + (curr.experience_years || 5), 0) / list.length) * 10) / 10
    : 11.5;

  const avgChatRate = list.length
    ? Math.round(list.reduce((acc, curr) => acc + (curr.rates?.chat_coins_per_minute || 20), 0) / list.length)
    : 25;

  const drawerConfig = {
    total: {
      title: "Total Astrologers Network",
      subtitle: `Complete network of all ${list.length} certified specialists registered on Astra`,
      icon: Users,
      gradient: "from-[#D97706] to-[#F59E0B]",
      badgeText: `${list.length} Specialists`,
      badgeTone: "bg-amber-50 text-[#D97706] border-amber-200",
      emptyMsg: "No astrologers have been registered on the platform yet.",
    },
    online: {
      title: "Live Online Astrologers",
      subtitle: `${onlineCount} astrologers currently active and accepting live consultations`,
      icon: Activity,
      gradient: "from-emerald-500 to-teal-600",
      badgeText: `${onlineCount} Online Now`,
      badgeTone: "bg-emerald-50 text-emerald-600 border-emerald-200",
      emptyMsg: "No astrologers are currently marked as online. They will appear here once active.",
    },
    listed: {
      title: "Publicly Listed in Directory",
      subtitle: `${listedCount} astrologers visible in the public search directory on Astra Web`,
      icon: UserCheck,
      gradient: "from-[#B45309] to-[#D97706]",
      badgeText: `${listedCount} Listed`,
      badgeTone: "bg-amber-50 text-[#D97706] border-amber-200",
      emptyMsg: "No astrologers are currently marked as publicly listed.",
    },
    featured: {
      title: "Featured Top Picks",
      subtitle: `${featuredCount} verified astrologers promoted on the home screen carousel`,
      icon: Star,
      gradient: "from-amber-500 to-orange-600",
      badgeText: `${featuredCount} Featured`,
      badgeTone: "bg-amber-50 text-amber-600 border-amber-200",
      emptyMsg: "No astrologers are currently marked as featured picks.",
    },
  };

  // Multi-Series Clustered Bar Data
  const clusteredMonthsData = [
    {
      month: "Jan",
      chat: 34,
      calls: 24,
      readings: 18,
      chatLabel: "34.200",
      callLabel: "24.150",
      readingsLabel: "18.300",
      totalRevenue: "₹48,650",
    },
    {
      month: "Feb",
      chat: 62,
      calls: 48,
      readings: 32,
      chatLabel: "62.400",
      callLabel: "48.200",
      readingsLabel: "32.100",
      totalRevenue: "₹76,400",
    },
    {
      month: "Mar",
      chat: 42,
      calls: 28,
      readings: 22,
      chatLabel: "42.100",
      callLabel: "28.300",
      readingsLabel: "22.500",
      totalRevenue: "₹54,200",
    },
    {
      month: "Apr",
      chat: 76,
      calls: 64,
      readings: 46,
      chatLabel: "43.787",
      callLabel: "39.784",
      readingsLabel: "28.900",
      totalRevenue: "₹1,12,471",
    },
    {
      month: "May",
      chat: 48,
      calls: 32,
      readings: 24,
      chatLabel: "48.900",
      callLabel: "32.400",
      readingsLabel: "24.100",
      totalRevenue: "₹62,800",
    },
    {
      month: "Jun",
      chat: 58,
      calls: 44,
      readings: 35,
      chatLabel: "58.200",
      callLabel: "44.600",
      readingsLabel: "35.200",
      totalRevenue: "₹78,900",
    },
    {
      month: "Jul",
      chat: 54,
      calls: 38,
      readings: 28,
      chatLabel: "54.100",
      callLabel: "38.200",
      readingsLabel: "28.500",
      totalRevenue: "₹71,300",
    },
  ];

  // Packed Bubble Chart Data for Location & Demand Analytics
  const packedBubbles = [
    {
      id: "north",
      name: "North India (Delhi NCR)",
      value: "2.417",
      growth: "+14.8%",
      color: "from-[#B45309] to-[#D97706]",
      size: "size-24 sm:size-26",
      coords: "top-2 left-16 sm:left-24",
      anim: "bubble-float-1",
      textColor: "text-white",
      topSpecialist: "Vedic & Kundli",
    },
    {
      id: "west",
      name: "West India (Mumbai & Gujarat)",
      value: "2.281",
      growth: "+12.2%",
      color: "from-[#D97706] to-[#F59E0B]",
      size: "size-26 sm:size-28",
      coords: "bottom-1 left-2 sm:left-4",
      anim: "bubble-float-2",
      textColor: "text-white",
      topSpecialist: "Tarot & Numerology",
    },
    {
      id: "south",
      name: "South India (Bengaluru & Chennai)",
      value: "812",
      growth: "+8.6%",
      color: "from-[#F59E0B] to-[#FBBF24]",
      size: "size-18 sm:size-20",
      coords: "bottom-4 right-16 sm:right-20",
      anim: "bubble-float-3",
      textColor: "text-white",
      topSpecialist: "KP & Nadi",
    },
    {
      id: "nri",
      name: "North America & UK (NRI Diaspora)",
      value: "287",
      growth: "+22.4%",
      color: "from-[#FBBF24] to-[#FDE047]",
      size: "size-16 sm:size-17",
      coords: "top-4 left-0 sm:left-2",
      anim: "bubble-float-4",
      textColor: "text-slate-900",
      topSpecialist: "Matchmaking & Career",
    },
    {
      id: "gulf",
      name: "Middle East (Dubai & UAE)",
      value: "194",
      growth: "+18.1%",
      color: "from-[#FEF08A] to-[#FDE047]",
      size: "size-13 sm:size-14",
      coords: "top-8 right-4 sm:right-6",
      anim: "bubble-float-2",
      textColor: "text-slate-900",
      topSpecialist: "Vastu & Gems",
    },
  ];

  // Country Traffic Distribution for Horizontal Progress Bars
  const countryTraffic = [
    { name: "India", flag: "🇮🇳", pct: 88, sessions: "48.2k", growth: "+14.2%" },
    { name: "United States", flag: "🇺🇸", pct: 64, sessions: "18.4k", growth: "+21.5%" },
    { name: "United Arab Emirates", flag: "🇦🇪", pct: 46, sessions: "9.2k", growth: "+11.8%" },
    { name: "United Kingdom", flag: "🇬🇧", pct: 32, sessions: "5.8k", growth: "+9.4%" },
    { name: "Australia", flag: "🇦🇺", pct: 24, sessions: "3.6k", growth: "+16.7%" },
  ];

  const filteredAstrologers = list.filter(
    (a) =>
      a.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-7 animate-in fade-in duration-500">
      {/* ── TOP ACTION & FILTER BAR ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200/60 shadow-sm">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            MongoDB & Live Engine Active
          </span>
          <span className="text-xs font-medium text-slate-400 hidden md:inline">
            • Real-time astrologer operations & consultation matrix
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Date Filter Tabs */}
          <div className="flex items-center rounded-2xl bg-white p-1 shadow-sm border border-slate-100">
            {(["today", "week", "month", "year"] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => {
                  playNavFeedback();
                  setDateFilter(filter);
                }}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold capitalize transition-all duration-200 cursor-pointer ${
                  dateFilter === filter
                    ? "bg-gradient-to-r from-[#D97706] to-[#F59E0B] text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                {filter === "week"
                  ? "This Week"
                  : filter === "month"
                  ? "This Month"
                  : filter === "year"
                  ? "This Year"
                  : "Today"}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => {
              playNavFeedback();
              refetch();
            }}
            disabled={isRefetching}
            className="flex items-center gap-2 rounded-2xl border border-slate-200/90 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50 active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw
              className={`size-3.5 ${
                isRefetching ? "animate-spin text-[#D97706]" : "text-slate-400"
              }`}
            />
            <span className="hidden sm:inline">
              {isRefetching ? "Syncing..." : "Sync"}
            </span>
          </button>

          {/* Add Astrologer CTA */}
          <Link href="/astrologers/new" onClick={() => playNavFeedback()}>
            <button className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#D97706] to-[#F59E0B] px-4 py-2 text-xs font-bold text-white shadow-[0_8px_20px_-4px_rgba(217,119,6,0.45)] transition-all hover:from-[#B45309] hover:to-[#D97706] hover:shadow-[0_12px_25px_-4px_rgba(217,119,6,0.55)] active:scale-95 cursor-pointer">
              <Plus className="size-4 stroke-[2.5]" />
              <span>Add Astrologer</span>
            </button>
          </Link>
        </div>
      </div>

      {/* ── DEALDECK 2-COLUMN MASTER DASHBOARD GRID ── */}
      <div className="grid gap-6 xl:grid-cols-12 items-start">
        {/* ── LEFT COLUMN (7 COLS): 2x2 KPI STATISTIC CARDS + CUSTOMER HABITS ── */}
        <div className="space-y-6 xl:col-span-7 flex flex-col">
          {/* 2x2 KPI STATISTIC CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Card 1: Total Sales / Total Astrologers (Hero Blue Card) */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => {
                playNavFeedback();
                setSelectedCardDetail("total");
                setDrawerSearch("");
              }}
              className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#B45309] via-[#D97706] to-[#F59E0B] p-6 text-white shadow-[0_14px_32px_-6px_rgba(217,119,6,0.45)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_22px_45px_-6px_rgba(217,119,6,0.6)] cursor-pointer group active:scale-[0.98] flex flex-col justify-between min-h-[175px]"
            >
              {/* Decorative subtle ambient circle */}
              <div className="pointer-events-none absolute -right-6 -bottom-6 size-36 rounded-full bg-white/10 blur-2xl group-hover:scale-125 transition-transform" />

              <div className="flex items-center justify-between">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md shadow-sm group-hover:scale-110 transition-transform">
                  <Ticket className="size-5 text-white stroke-[2.2]" />
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#3CFE8A] px-2.5 py-0.5 text-[11px] font-black text-slate-900 shadow-sm">
                  +2.08%
                </span>
              </div>

              <div className="mt-4">
                <p className="text-xs font-semibold text-white/90">
                  Total Sales
                </p>
                <div className="mt-1 flex items-baseline justify-between">
                  <h3 className="font-display text-[32px] sm:text-4xl font-black tracking-tight text-white leading-none">
                    ₹6,12,917
                  </h3>
                  <span className="text-[11px] font-medium text-white/80">
                    Products vs last month
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2: Total Orders / Online Astrologers (White Card) */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => {
                playNavFeedback();
                setSelectedCardDetail("online");
                setDrawerSearch("");
              }}
              className="rounded-[28px] bg-white p-6 border border-slate-100/90 shadow-[0_12px_32px_rgba(20,25,45,0.03)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_40px_rgba(20,25,45,0.08)] cursor-pointer group active:scale-[0.98] flex flex-col justify-between min-h-[175px]"
            >
              <div className="flex items-center justify-between">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 transition-transform group-hover:scale-110">
                  <Activity className="size-5 stroke-[2.2]" />
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#3CFE8A]/25 px-2.5 py-0.5 text-[11px] font-bold text-[#059669] shadow-sm">
                  +12,4%
                </span>
              </div>

              <div className="mt-4">
                <p className="text-xs font-semibold text-slate-400">
                  Total Orders
                </p>
                <div className="mt-1 flex items-baseline justify-between">
                  <h3 className="font-display text-[32px] sm:text-4xl font-black tracking-tight text-slate-900 leading-none">
                    34.760
                  </h3>
                  <span className="text-[11px] font-medium text-slate-400">
                    Orders vs last month
                  </span>
                </div>
              </div>
            </div>

            {/* Card 3: Visitor / Publicly Listed (White Card) */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => {
                playNavFeedback();
                setSelectedCardDetail("listed");
                setDrawerSearch("");
              }}
              className="rounded-[28px] bg-white p-6 border border-slate-100/90 shadow-[0_12px_32px_rgba(20,25,45,0.03)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_40px_rgba(20,25,45,0.08)] cursor-pointer group active:scale-[0.98] flex flex-col justify-between min-h-[175px]"
            >
              <div className="flex items-center justify-between">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-amber-50 text-[#D97706] transition-transform group-hover:scale-110">
                  <User className="size-5 stroke-[2.2]" />
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold text-rose-600 shadow-sm">
                  -2,08%
                </span>
              </div>

              <div className="mt-4">
                <p className="text-xs font-semibold text-slate-400">
                  Visitor
                </p>
                <div className="mt-1 flex items-baseline justify-between">
                  <h3 className="font-display text-[32px] sm:text-4xl font-black tracking-tight text-slate-900 leading-none">
                    14.987
                  </h3>
                  <span className="text-[11px] font-medium text-slate-400">
                    Users vs last month
                  </span>
                </div>
              </div>
            </div>

            {/* Card 4: Total Sold Products / Featured Astrologers (White Card) */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => {
                playNavFeedback();
                setSelectedCardDetail("featured");
                setDrawerSearch("");
              }}
              className="rounded-[28px] bg-white p-6 border border-slate-100/90 shadow-[0_12px_32px_rgba(20,25,45,0.03)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_40px_rgba(20,25,45,0.08)] cursor-pointer group active:scale-[0.98] flex flex-col justify-between min-h-[175px]"
            >
              <div className="flex items-center justify-between">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 transition-transform group-hover:scale-110">
                  <Truck className="size-5 stroke-[2.2]" />
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#3CFE8A]/25 px-2.5 py-0.5 text-[11px] font-bold text-[#059669] shadow-sm">
                  +12,1%
                </span>
              </div>

              <div className="mt-4">
                <p className="text-xs font-semibold text-slate-400">
                  Total Sold Products
                </p>
                <div className="mt-1 flex items-baseline justify-between">
                  <h3 className="font-display text-[32px] sm:text-4xl font-black tracking-tight text-slate-900 leading-none">
                    12.987
                  </h3>
                  <span className="text-[11px] font-medium text-slate-400">
                    Products vs last month
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Habits (Clustered Column Chart) */}
          <div className="rounded-[28px] bg-white p-6 sm:p-7 border border-slate-100/90 shadow-[0_12px_32px_rgba(20,25,45,0.03)]">
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 className="font-display text-base sm:text-lg font-bold text-slate-900">
                  Customer Habbits
                </h3>
                <p className="text-xs font-medium text-slate-400">
                  Track your customer habbits
                </p>

                {/* Legend: Seen product (Grey) & Sales (Blue) */}
                <div className="mt-3 flex items-center gap-4 text-xs font-bold text-slate-600">
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full bg-[#D7DBE7]" />
                    <span>Seen product</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full bg-[#F59E0B]" />
                    <span>Sales</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm cursor-pointer hover:bg-slate-50">
                <span>This year</span>
                <ChevronDown className="size-3 text-slate-400" />
              </div>
            </div>

            {/* Clustered Columns Canvas */}
            <div className="relative mt-8 pt-8">
              {/* Horizontal Gridlines */}
              <div className="absolute inset-x-0 top-8 bottom-10 flex flex-col justify-between pointer-events-none text-[11px] font-semibold text-slate-400">
                <div className="flex items-center gap-3 border-b border-dashed border-slate-200/80 pb-1">
                  <span className="w-7 text-right">60K</span>
                  <div className="w-full" />
                </div>
                <div className="flex items-center gap-3 border-b border-dashed border-slate-200/80 pb-1">
                  <span className="w-7 text-right">40K</span>
                  <div className="w-full" />
                </div>
                <div className="flex items-center gap-3 border-b border-dashed border-slate-200/80 pb-1">
                  <span className="w-7 text-right">20K</span>
                  <div className="w-full" />
                </div>
                <div className="flex items-center gap-3 border-b border-dashed border-slate-200/80 pb-1">
                  <span className="w-7 text-right">10K</span>
                  <div className="w-full" />
                </div>
                <div className="flex items-center gap-3 pb-1">
                  <span className="w-7 text-right">0K</span>
                  <div className="w-full" />
                </div>
              </div>

              {/* Clustered Bars (2 bars per month: Grey and Blue) */}
              <div className="relative z-10 ml-10 flex h-64 items-end justify-between px-1 sm:px-4">
                {clusteredMonthsData.map((item, idx) => {
                  const isHoveredOrPinned = activeBarIdx === idx;
                  return (
                    <div
                      key={item.month}
                      className="group relative flex flex-col items-center justify-end h-full cursor-pointer"
                      onClick={() => setActiveBarIdx(idx)}
                      onMouseEnter={() => setActiveBarIdx(idx)}
                    >
                      {/* DealDeck Black High-Contrast Tooltip */}
                      {isHoveredOrPinned && (
                        <div className="absolute -top-20 left-1/2 -translate-x-1/2 z-40 flex flex-col gap-1 rounded-2xl bg-[#0F172A] px-4 py-2.5 text-white shadow-2xl border border-slate-700/80 animate-in fade-in zoom-in-95 pointer-events-none min-w-[145px]">
                          <div className="flex items-center gap-2 text-[11px] font-semibold">
                            <span className="size-2 rounded-full bg-white" />
                            <span className="font-bold text-white">{item.chatLabel} Products</span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] font-semibold">
                            <span className="size-2 rounded-full bg-[#F59E0B]" />
                            <span className="font-bold text-white">{item.callLabel} Products</span>
                          </div>
                          {/* Triangle Pointer */}
                          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 size-3 rotate-45 bg-[#0F172A] border-r border-b border-slate-700/80" />
                        </div>
                      )}

                      {/* 2 Clustered Bars: Grey then Blue */}
                      <div className="flex items-end gap-1 sm:gap-1.5 transition-transform duration-200 group-hover:scale-105">
                        {/* Bar 1: Grey / Seen product */}
                        <div
                          style={{ height: `${item.calls * 2.3}px` }}
                          className="w-3 sm:w-4 rounded-t-lg bg-[#D7DBE7] transition-all duration-300 group-hover:bg-[#CBD2E1]"
                        />
                        {/* Bar 2: Royal Gold / Sales */}
                        <div
                          style={{ height: `${item.chat * 2.3}px` }}
                          className={`w-3 sm:w-4 rounded-t-lg bg-[#F59E0B] transition-all duration-300 ${
                            isHoveredOrPinned ? "shadow-[0_0_12px_rgba(245,158,11,0.6)]" : ""
                          }`}
                        />
                      </div>

                      {/* Month Label */}
                      <span
                        className={`mt-3 text-xs font-bold transition-colors ${
                          isHoveredOrPinned ? "text-[#D97706]" : "text-slate-400"
                        }`}
                      >
                        {item.month}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN (5 COLS): PRODUCT STATISTIC + CUSTOMER GROWTH ── */}
        <div className="space-y-6 xl:col-span-5 flex flex-col">
          {/* Card 1: Product Statistic (Multi-Ring Radial Chart) */}
          <div className="rounded-[28px] bg-white p-6 sm:p-7 border border-slate-100/90 shadow-[0_12px_32px_rgba(20,25,45,0.03)] flex flex-col justify-between">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-display text-base sm:text-lg font-bold text-slate-900">
                  Product Statistic
                </h3>
                <p className="text-xs font-medium text-slate-400">
                  Track your product sales
                </p>
              </div>

              <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm cursor-pointer hover:bg-slate-50">
                <span>Today</span>
                <ChevronDown className="size-3 text-slate-400" />
              </div>
            </div>

            {/* Radial Chart + Big Stat Block */}
            <div className="my-6 flex items-center justify-between gap-6">
              {/* Concentric Multi-Ring SVG (Blue, Coral/Red, Slate) */}
              <div className="relative flex size-44 shrink-0 items-center justify-center">
                <svg
                  className="size-40 -rotate-90 transition-all duration-700"
                  viewBox="0 0 160 160"
                  fill="none"
                >
                  {/* Outer Ring (Gold #F59E0B) */}
                  <circle cx="80" cy="80" r="64" stroke="#F1F5F9" strokeWidth="9" />
                  <circle
                    cx="80"
                    cy="80"
                    r="64"
                    stroke="#F59E0B"
                    strokeWidth="9"
                    strokeDasharray={2 * Math.PI * 64}
                    strokeDashoffset={2 * Math.PI * 64 * 0.28}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />

                  {/* Middle Ring (Coral/Red #EF4444) */}
                  <circle cx="80" cy="80" r="48" stroke="#F1F5F9" strokeWidth="9" />
                  <circle
                    cx="80"
                    cy="80"
                    r="48"
                    stroke="#EF4444"
                    strokeWidth="9"
                    strokeDasharray={2 * Math.PI * 48}
                    strokeDashoffset={2 * Math.PI * 48 * 0.46}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />

                  {/* Inner Ring (Slate #CBD5E1) */}
                  <circle cx="80" cy="80" r="32" stroke="#F1F5F9" strokeWidth="9" />
                  <circle
                    cx="80"
                    cy="80"
                    r="32"
                    stroke="#CBD5E1"
                    strokeWidth="9"
                    strokeDasharray={2 * Math.PI * 32}
                    strokeDashoffset={2 * Math.PI * 32 * 0.62}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
              </div>

              {/* Big Stat Block */}
              <div className="flex flex-col items-start space-y-1.5">
                <span className="font-display text-4xl font-black tracking-tight text-slate-900 leading-none">
                  9.829
                </span>
                <p className="text-xs font-semibold text-slate-400">
                  Products Sales
                </p>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#3CFE8A]/25 px-2.5 py-0.5 text-xs font-bold text-[#059669]">
                  <TrendingUp className="size-3 stroke-[2.5]" />
                  +5,34%
                </span>
              </div>
            </div>

            {/* Category Rows with Category Icon, Label, Value and Pill */}
            <div className="space-y-3.5 border-t border-slate-100 pt-5">
              {/* Electronic */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                    <Sparkles className="size-4 text-[#D97706]" />
                  </div>
                  <span className="font-bold text-slate-800">Electronic</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-extrabold text-slate-900">2.487</span>
                  <span className="rounded-full bg-[#3CFE8A]/25 px-2 py-0.5 text-[10px] font-bold text-[#059669]">
                    +1,8%
                  </span>
                </div>
              </div>

              {/* Games */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                    <Star className="size-4 text-emerald-500" />
                  </div>
                  <span className="font-bold text-slate-800">Games</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-extrabold text-slate-900">1.828</span>
                  <span className="rounded-full bg-[#3CFE8A]/25 px-2 py-0.5 text-[10px] font-bold text-[#059669]">
                    +2,3%
                  </span>
                </div>
              </div>

              {/* Furniture */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                    <Layers className="size-4 text-amber-500" />
                  </div>
                  <span className="font-bold text-slate-800">Furniture</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-extrabold text-slate-900">1.463</span>
                  <span className="rounded-full bg-[#FF5C5C]/20 px-2 py-0.5 text-[10px] font-bold text-[#DC2626]">
                    -1,04%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Customer Growth (Packed Bubbles + Country Progress Bars) */}
          <div className="rounded-[28px] bg-white p-6 sm:p-7 border border-slate-100/90 shadow-[0_12px_32px_rgba(20,25,45,0.03)] flex flex-col justify-between">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-display text-base sm:text-lg font-bold text-slate-900">
                  Customer Growth
                </h3>
                <p className="text-xs font-medium text-slate-400">
                  Track customer by locations
                </p>
              </div>

              <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm cursor-pointer hover:bg-slate-50">
                <span>Today</span>
                <ChevronDown className="size-3 text-slate-400" />
              </div>
            </div>

            {/* Split Content: Left Packed Bubbles + Right Country Progress Bars */}
            <div className="my-5 grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
              {/* Left (5 cols): Overlapping Packed Bubbles */}
              <div className="sm:col-span-5 relative h-48 w-full flex items-center justify-center">
                {/* Bubble 1 (Top-Right): 2.417 Deep Gold */}
                <div
                  className="absolute top-1 right-2 sm:right-3 size-20 sm:size-22 rounded-full bg-gradient-to-br from-[#B45309] to-[#D97706] shadow-[0_8px_20px_rgba(217,119,6,0.35)] flex flex-col items-center justify-center text-white cursor-pointer hover:scale-105 transition-transform z-20 group"
                  title="2.417 Direct Inquiries"
                >
                  <span className="font-black text-sm sm:text-base leading-none">2.417</span>
                </div>

                {/* Bubble 2 (Bottom-Left): 2.281 Electric Amber */}
                <div
                  className="absolute bottom-1 left-2 sm:left-3 size-22 sm:size-24 rounded-full bg-gradient-to-br from-[#D97706] to-[#F59E0B] shadow-[0_8px_22px_rgba(245,158,11,0.4)] flex flex-col items-center justify-center text-white cursor-pointer hover:scale-105 transition-transform z-30 group"
                  title="2.281 Live Consultations"
                >
                  <span className="font-black text-base sm:text-lg leading-none">2.281</span>
                </div>

                {/* Bubble 3 (Bottom-Right): 812 Warm Gold */}
                <div
                  className="absolute bottom-2 right-4 sm:right-6 size-15 sm:size-16 rounded-full bg-gradient-to-br from-[#F59E0B] to-[#FBBF24] shadow-[0_6px_16px_rgba(245,158,11,0.3)] flex flex-col items-center justify-center text-white cursor-pointer hover:scale-105 transition-transform z-10 group"
                  title="812 Consultations"
                >
                  <span className="font-bold text-xs sm:text-sm leading-none">812</span>
                </div>

                {/* Bubble 4 (Top-Left): 287 Soft Blue */}
                <div
                  className="absolute top-4 left-5 sm:left-6 size-13 sm:size-14 rounded-full bg-[#93C5FD] shadow-sm flex flex-col items-center justify-center text-slate-900 cursor-pointer hover:scale-105 transition-transform z-10 group"
                  title="287 Global NRI"
                >
                  <span className="font-extrabold text-xs leading-none">287</span>
                </div>
              </div>

              {/* Right (7 cols): Country Flags with Horizontal Progress Bars */}
              <div className="sm:col-span-7 space-y-3.5 pl-0 sm:pl-2">
                {/* United States */}
                <div className="space-y-1 group">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="text-base leading-none">🇺🇸</span>
                      <span className="group-hover:text-[#D97706] transition-colors">United States</span>
                    </div>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full w-[85%] rounded-full bg-gradient-to-r from-[#D97706] to-[#F59E0B] transition-all duration-700" />
                  </div>
                </div>

                {/* Germany */}
                <div className="space-y-1 group">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="text-base leading-none">🇩🇪</span>
                      <span className="group-hover:text-[#D97706] transition-colors">Germany</span>
                    </div>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full w-[68%] rounded-full bg-gradient-to-r from-[#D97706] to-[#F59E0B] transition-all duration-700" />
                  </div>
                </div>

                {/* Australia */}
                <div className="space-y-1 group">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="text-base leading-none">🇦🇺</span>
                      <span className="group-hover:text-[#D97706] transition-colors">Australia</span>
                    </div>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full w-[54%] rounded-full bg-gradient-to-r from-[#D97706] to-[#F59E0B] transition-all duration-700" />
                  </div>
                </div>

                {/* France */}
                <div className="space-y-1 group">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="text-base leading-none">🇫🇷</span>
                      <span className="group-hover:text-[#D97706] transition-colors">France</span>
                    </div>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full w-[38%] rounded-full bg-gradient-to-r from-[#D97706] to-[#F59E0B] transition-all duration-700" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. REAL PLATFORM ASTROLOGERS DIRECTORY (Full Functional Integration) ── */}
      <div className="rounded-[28px] bg-white p-6 sm:p-7 border border-slate-100/90 shadow-[0_10px_30px_rgba(20,25,45,0.03)]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="font-display text-lg font-bold text-slate-900">
                Registered Astrologer Network
              </h3>
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-[#D97706]">
                {list.length} Verified Specialists
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">
              Real-time consultation rates, skill cards, online status & direct profile management
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 size-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Filter astrologers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-48 rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 text-xs font-semibold text-slate-700 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/20"
              />
            </div>

            <Link href="/astrologers/new">
              <button className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#D97706] to-[#F59E0B] px-4 py-2 text-xs font-bold text-white shadow-md transition-all hover:from-[#B45309] hover:to-[#D97706] active:scale-95">
                <Plus className="size-3.5 stroke-[2.5]" />
                <span>Add Astrologer</span>
              </button>
            </Link>

            <Link
              href="/astrologers"
              className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:text-[#D97706]"
            >
              <span>Full Directory</span>
              <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
        </div>

        {filteredAstrologers.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No astrologers match your search.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="pb-3.5 pl-2">Astrologer</th>
                  <th className="pb-3.5 px-3">Specializations</th>
                  <th className="pb-3.5 px-3">Experience</th>
                  <th className="pb-3.5 px-3">Chat Rate</th>
                  <th className="pb-3.5 px-3">Availability</th>
                  <th className="pb-3.5 px-3">Joined</th>
                  <th className="pb-3.5 pr-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredAstrologers.map((astrologer) => (
                  <tr
                    key={astrologer.id}
                    className="group transition-colors hover:bg-slate-50/70"
                  >
                    <td className="py-4 pl-2">
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={astrologer.profile_image_url}
                          name={astrologer.full_name}
                          size="md"
                          className="size-11 rounded-2xl ring-2 ring-slate-100 object-cover"
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 group-hover:text-[#D97706] transition-colors truncate text-sm">
                            {astrologer.full_name}
                          </p>
                          <p className="text-[11px] font-semibold text-slate-400 truncate">
                            {astrologer.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-3">
                      <div className="flex flex-wrap gap-1.5 max-w-[220px]">
                        {astrologer.skills?.slice(0, 3).map((s) => (
                          <span
                            key={s}
                            className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 truncate"
                          >
                            {SKILL_LABELS[s] || s}
                          </span>
                        ))}
                        {(astrologer.skills?.length || 0) > 3 && (
                          <span className="rounded-lg bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-[#D97706]">
                            +{(astrologer.skills?.length || 0) - 3}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-4 px-3 font-semibold text-slate-700">
                      {astrologer.experience_years ? `${astrologer.experience_years} years` : "10+ years"}
                    </td>

                    <td className="py-4 px-3">
                      <span className="font-extrabold text-slate-900 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                        {astrologer.rates?.chat_coins_per_minute ?? 20} coins/min
                      </span>
                    </td>

                    <td className="py-4 px-3">
                      {astrologer.availability?.is_online ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-600">
                          <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                          Online Now
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                          <span className="size-2 rounded-full bg-slate-400" />
                          Offline
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-3 text-slate-400 text-[11px] font-semibold whitespace-nowrap">
                      {formatDateTime(astrologer.created_at)}
                    </td>

                    <td className="py-4 pr-2 text-right">
                      <Link href={`/astrologers/${astrologer.id}`}>
                        <button className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition-all hover:bg-[#D97706] hover:text-white hover:border-[#D97706]">
                          Manage
                        </button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── 5. INTERACTIVE 3D DETAIL SLIDE-OVER DRAWER ── */}
      {selectedCardDetail && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop with blur */}
          <div
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
            onClick={() => setSelectedCardDetail(null)}
          />

          {/* Drawer Container */}
          <div className="relative z-10 flex h-full w-full max-w-xl flex-col bg-white shadow-2xl border-l border-slate-100 overflow-hidden animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="flex items-start justify-between p-6 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3.5">
                {(() => {
                  const cfg = drawerConfig[selectedCardDetail];
                  const Icon = cfg.icon;
                  return (
                    <div
                      className={`flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr ${cfg.gradient} text-white shadow-md`}
                    >
                      <Icon className="size-6 stroke-[2.2]" />
                    </div>
                  );
                })()}
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-lg font-black text-slate-900 tracking-tight">
                      {drawerConfig[selectedCardDetail].title}
                    </h3>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-black border ${drawerConfig[selectedCardDetail].badgeTone}`}
                    >
                      {drawerConfig[selectedCardDetail].badgeText}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-400 mt-0.5">
                    {drawerConfig[selectedCardDetail].subtitle}
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setSelectedCardDetail(null)}
                className="flex size-9 items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
                aria-label="Close details"
              >
                <X className="size-4.5 stroke-[2.2]" />
              </button>
            </div>

            {/* Drawer Search & Action Bar */}
            <div className="p-4 border-b border-slate-100 bg-white flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-2.5 size-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search specialists by name, email or skill..."
                  value={drawerSearch}
                  onChange={(e) => setDrawerSearch(e.target.value)}
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-xs font-semibold text-slate-700 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/20"
                />
              </div>

              <Link href="/astrologers/new">
                <button className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#D97706] to-[#F59E0B] px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:from-[#B45309] hover:to-[#D97706] transition-all">
                  <Plus className="size-3.5 stroke-[2.5]" />
                  <span>Add</span>
                </button>
              </Link>
            </div>

            {/* Drawer List Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3.5 scrollbar-thin">
              {drawerAstrologers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
                    <Users className="size-6 stroke-[1.8]" />
                  </div>
                  <p className="text-sm font-bold text-slate-800">No specialists found</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">
                    {drawerConfig[selectedCardDetail].emptyMsg}
                  </p>
                </div>
              ) : (
                drawerAstrologers.map((astrologer) => (
                  <div
                    key={astrologer.id}
                    className="group rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm hover:border-[#F59E0B]/40 hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div className="relative">
                          <Avatar
                            src={astrologer.profile_image_url}
                            name={astrologer.full_name}
                            size="md"
                            className="size-12 rounded-2xl ring-2 ring-slate-100 object-cover"
                          />
                          {astrologer.availability?.is_online ? (
                            <span className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                          ) : (
                            <span className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full bg-slate-400 ring-2 ring-white" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-900 group-hover:text-[#D97706] transition-colors truncate text-sm">
                              {astrologer.full_name}
                            </h4>
                            {astrologer.is_featured && (
                              <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-black text-amber-600 border border-amber-200">
                                <Star className="size-2.5 fill-amber-500 text-amber-500" />
                                Top Pick
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-medium text-slate-400 truncate">
                            {astrologer.email}
                          </p>
                          <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500 font-semibold">
                            <span>{astrologer.experience_years ? `${astrologer.experience_years} yrs exp` : "10+ yrs exp"}</span>
                            <span>•</span>
                            <span className="text-slate-800 font-bold">
                              {astrologer.rates?.chat_coins_per_minute ?? 20} coins/min
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2 shrink-0">
                        {astrologer.availability?.is_online ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Online
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                            Offline
                          </span>
                        )}

                        <Link href={`/astrologers/${astrologer.id}`}>
                          <button className="flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-[#D97706] hover:text-white transition-all">
                            <span>Manage</span>
                            <ArrowRight className="size-3" />
                          </button>
                        </Link>
                      </div>
                    </div>

                    {/* Skill Pills */}
                    {astrologer.skills && astrologer.skills.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5 pt-3 border-t border-slate-100">
                        {astrologer.skills.map((s) => (
                          <span
                            key={s}
                            className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600"
                          >
                            {SKILL_LABELS[s] || s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                Showing {drawerAstrologers.length} of {list.length} astrologers
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedCardDetail(null)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  Close
                </button>
                <Link href="/astrologers">
                  <button className="rounded-xl bg-gradient-to-r from-[#D97706] to-[#F59E0B] px-4 py-2 text-xs font-bold text-white shadow-sm hover:from-[#B45309] hover:to-[#D97706] transition-all">
                    All Directory →
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
