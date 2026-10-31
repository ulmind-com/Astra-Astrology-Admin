"use client";

import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  CheckCircle2,
  Filter,
  Heart,
  MessageCircle,
  MessageSquare,
  Phone,
  RefreshCw,
  Search,
  Sparkles,
  Star,
  ThumbsUp,
  User,
  Video,
} from "lucide-react";
import * as React from "react";

import { Avatar, LoadingBlock } from "@/components/ui";
import { reviewApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { cn, formatDateTime, timeAgo } from "@/lib/utils";
import { useRequireAuth } from "@/providers/auth-provider";
import type { Review, ReviewKind } from "@/types";

type FilterTab = "all" | ReviewKind;

function getKindBadge(kind: ReviewKind) {
  switch (kind) {
    case "chat":
      return {
        label: "Live Chat",
        icon: MessageCircle,
        className: "bg-amber-50 text-amber-800 border-amber-200/80",
      };
    case "call":
      return {
        label: "Voice Call",
        icon: Phone,
        className: "bg-emerald-50 text-emerald-800 border-emerald-200/80",
      };
    case "video":
      return {
        label: "Video Call",
        icon: Video,
        className: "bg-purple-50 text-purple-800 border-purple-200/80",
      };
    case "appointment":
      return {
        label: "Appointment",
        icon: CalendarDays,
        className: "bg-sky-50 text-sky-800 border-sky-200/80",
      };
    default:
      return {
        label: "Consultation",
        icon: MessageSquare,
        className: "bg-slate-50 text-slate-700 border-slate-200",
      };
  }
}

export default function AstrologerReviewsPage() {
  const { ready } = useRequireAuth({
    roles: ["astrologer", "admin", "super_admin"],
    signInPath: "/login",
  });

  const [activeTab, setActiveTab] = React.useState<FilterTab>("all");
  const [starFilter, setStarFilter] = React.useState<number | 0>(0);
  const [search, setSearch] = React.useState("");

  const reviewsQuery = useQuery({
    queryKey: ["astrologer", "reviews", "mine"],
    queryFn: () => reviewApi.myReviews({ limit: 100 }),
    enabled: ready,
    refetchInterval: 15000,
  });

  if (!ready) return <LoadingBlock />;
  if (reviewsQuery.isLoading) {
    return <LoadingBlock label="Loading verified client feedback & ratings…" />;
  }
  if (reviewsQuery.error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm font-semibold text-rose-700">
        {(reviewsQuery.error as ApiError).message || "Failed to load reviews"}
      </div>
    );
  }

  const reviewData = reviewsQuery.data;
  const items: Review[] = (reviewData?.items as Review[]) || [];
  const summary = reviewData?.summary || { average: 5.0, count: 0, breakdown: {} };
  const totalCount = summary.count || items.length;
  const avgRating = summary.average ? Number(summary.average.toFixed(1)) : 5.0;

  // Breakdown counts for 5 down to 1
  const breakdown: Record<number, number> = {
    5: summary.breakdown?.["5"] ?? items.filter((r) => r.stars === 5).length,
    4: summary.breakdown?.["4"] ?? items.filter((r) => r.stars === 4).length,
    3: summary.breakdown?.["3"] ?? items.filter((r) => r.stars === 3).length,
    2: summary.breakdown?.["2"] ?? items.filter((r) => r.stars === 2).length,
    1: summary.breakdown?.["1"] ?? items.filter((r) => r.stars === 1).length,
  };

  // 4 & 5 stars percentage
  const positiveReviews = (breakdown[5] || 0) + (breakdown[4] || 0);
  const positiveRate = totalCount > 0 ? Math.round((positiveReviews / totalCount) * 100) : 100;

  // Filtered reviews
  const filtered = items.filter((rev) => {
    if (activeTab !== "all" && rev.kind !== activeTab) return false;
    if (starFilter > 0 && rev.stars !== starFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = rev.author_name?.toLowerCase().includes(q);
      const matchText = rev.text?.toLowerCase().includes(q);
      if (!matchName && !matchText) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-20">
      {/* ── HEADER ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#D97706] to-[#F59E0B] text-white shadow-xs">
              <Star className="size-4.5 fill-current" />
            </span>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-slate-900 leading-tight">
                Reviews & Client Feedback
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200/80 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-800">
                <Sparkles className="size-3 text-amber-600" />
                VERIFIED CLIENTS
              </span>
            </div>
          </div>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Real feedback and ratings submitted by clients following consultations across chat, voice, video, and appointments.
          </p>
        </div>

        <button
          onClick={() => void reviewsQuery.refetch()}
          disabled={reviewsQuery.isFetching}
          className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={cn("size-3.5", reviewsQuery.isFetching && "animate-spin text-[#D97706]")} />
          <span>Refresh</span>
        </button>
      </div>

      {/* ── TOP STATS MATRIX (3 CARDS) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Overall Average Rating */}
        <div className="rounded-[26px] bg-gradient-to-br from-amber-500 to-amber-600 p-6 text-white shadow-[0_12px_32px_rgba(217,119,6,0.25)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-white/20 backdrop-blur-md px-3 py-1 text-[11px] font-black uppercase tracking-wider text-white">
              Overall Rating
            </span>
            <Star className="size-5 fill-white text-white opacity-80" />
          </div>

          <div className="my-3">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-5xl font-black tracking-tight leading-none">
                {avgRating}
              </span>
              <span className="text-xl font-bold text-amber-100">/ 5.0</span>
            </div>
            <div className="flex items-center gap-1 mt-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={cn(
                    "size-4.5",
                    s <= Math.round(avgRating)
                      ? "fill-white text-white"
                      : "fill-white/30 text-transparent"
                  )}
                />
              ))}
              <span className="ml-2 text-xs font-bold text-amber-100">
                ({totalCount} {totalCount === 1 ? "review" : "reviews"})
              </span>
            </div>
          </div>

          <p className="text-[11px] font-medium text-amber-100/90">
            Based on all verified consultations on the platform.
          </p>
        </div>

        {/* Card 2: Star Rating Distribution Breakdown */}
        <div className="rounded-[26px] bg-white p-6 border border-slate-100/90 shadow-[0_10px_28px_rgba(20,25,45,0.03)] flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="font-display text-xs font-bold uppercase tracking-wider text-slate-400">
              Rating Distribution
            </h3>
            <span className="text-xs font-bold text-slate-700 font-mono">
              {totalCount} Total
            </span>
          </div>

          <div className="space-y-1.5 py-2">
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = breakdown[stars] || 0;
              const pct = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
              return (
                <button
                  key={stars}
                  type="button"
                  onClick={() => setStarFilter((prev) => (prev === stars ? 0 : stars))}
                  className={cn(
                    "w-full flex items-center gap-2 text-xs py-0.5 rounded-lg transition-all text-left group cursor-pointer",
                    starFilter === stars && "bg-amber-50 px-1 font-bold"
                  )}
                >
                  <span className="w-8 font-bold text-slate-700 flex items-center gap-1 font-mono">
                    {stars} <Star className="size-3 fill-amber-500 text-amber-500" />
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden relative">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-8 text-right font-mono text-[11px] text-slate-400 group-hover:text-slate-700">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <p className="text-[10px] text-slate-400">
            Click any star level to filter reviews below.
          </p>
        </div>

        {/* Card 3: Satisfaction Insight */}
        <div className="rounded-[26px] bg-white p-6 border border-slate-100/90 shadow-[0_10px_28px_rgba(20,25,45,0.03)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <ThumbsUp className="size-5 stroke-[2.2]" />
            </div>
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
              Client Satisfaction
            </span>
          </div>

          <div className="my-3">
            <p className="text-xs font-semibold text-slate-400">Positive Feedback</p>
            <h3 className="font-display text-4xl font-black tracking-tight text-emerald-600 leading-tight">
              {positiveRate}%
            </h3>
            <p className="mt-1 text-xs text-slate-500 font-medium">
              Rated 4 or 5 stars by {positiveReviews} satisfied clients.
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100 text-[11px] text-slate-600 flex items-start gap-2">
            <Sparkles className="size-3.5 text-amber-500 shrink-0 mt-0.5" />
            <span>High ratings improve your ranking in directory search and client discovery.</span>
          </div>
        </div>
      </div>

      {/* ── FILTER & SEARCH TOOLBAR ── */}
      <div className="rounded-2xl bg-white border border-slate-100 p-3 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Consultation Mode Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          {(
            [
              { key: "all", label: "All Reviews" },
              { key: "chat", label: "Live Chat" },
              { key: "call", label: "Voice Call" },
              { key: "video", label: "Video Call" },
              { key: "appointment", label: "Appointments" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer",
                activeTab === tab.key
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search input & Active Filters */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {starFilter > 0 && (
            <button
              onClick={() => setStarFilter(0)}
              className="inline-flex items-center gap-1 rounded-xl bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-bold text-amber-800 cursor-pointer hover:bg-amber-100"
            >
              <span>{starFilter} ★ only</span>
              <span className="text-amber-500 ml-1">×</span>
            </button>
          )}

          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by client or keyword..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-8 pr-3 py-1.5 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-amber-500 focus:outline-hidden"
            />
          </div>
        </div>
      </div>

      {/* ── REVIEWS FEEDBACK LIST ── */}
      {filtered.length === 0 ? (
        <div className="rounded-[28px] bg-white border border-slate-100 p-12 text-center shadow-xs">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 mb-3">
            <MessageSquare className="size-6" />
          </div>
          <h3 className="font-display text-base font-bold text-slate-900">
            {items.length === 0 ? "No Client Reviews Yet" : "No Matching Reviews"}
          </h3>
          <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
            {items.length === 0
              ? "When clients complete consultations and submit ratings or testimonials, they will appear here."
              : "Try adjusting your filter or search query to see other client reviews."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((review) => {
            const badge = getKindBadge(review.kind);
            const Icon = badge.icon;
            const hasText = Boolean(review.text && review.text.trim().length > 0);

            return (
              <div
                key={review.id}
                className="rounded-[24px] bg-white border border-slate-100/90 p-5 shadow-[0_6px_20px_rgba(20,25,45,0.03)] hover:shadow-md hover:border-amber-200/60 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top Header: Client Info & Session Mode */}
                  <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={review.author_avatar}
                        name={review.author_name || "Verified Client"}
                        size="md"
                        className="size-10 rounded-2xl shadow-xs"
                      />
                      <div>
                        <h4 className="font-display text-xs font-bold text-slate-900">
                          {review.author_name || "Verified Client"}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold",
                              badge.className
                            )}
                          >
                            <Icon className="size-3" />
                            {badge.label}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            • {timeAgo(review.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Star Rating Badge */}
                    <div className="flex items-center gap-1 rounded-xl bg-amber-50 px-2.5 py-1 border border-amber-200/80 shrink-0">
                      <Star className="size-3.5 fill-amber-500 text-amber-500" />
                      <span className="font-mono text-xs font-black text-amber-900">
                        {review.stars}.0
                      </span>
                    </div>
                  </div>

                  {/* Star row */}
                  <div className="flex items-center gap-1 pt-3">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={cn(
                          "size-3.5",
                          s <= review.stars
                            ? "fill-amber-400 text-amber-400"
                            : "fill-slate-100 text-slate-200"
                        )}
                      />
                    ))}
                  </div>

                  {/* Feedback Message Body - NEVER FAKE TEXT */}
                  <div className="mt-2.5">
                    {hasText ? (
                      <blockquote className="rounded-xl bg-amber-50/40 border border-amber-100/60 p-3 text-xs leading-relaxed text-slate-800 font-medium italic">
                        &ldquo;{review.text}&rdquo;
                      </blockquote>
                    ) : (
                      <p className="text-xs italic text-slate-400 py-1">
                        Rated {review.stars} stars without written comments.
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer timestamp & insight */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                  <span>{formatDateTime(review.created_at)}</span>
                  {review.stars >= 4 ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                      <CheckCircle2 className="size-3 text-emerald-600" />
                      Satisfied Client
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-amber-700 font-bold">
                      <Sparkles className="size-3 text-amber-600" />
                      Actionable Feedback
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

