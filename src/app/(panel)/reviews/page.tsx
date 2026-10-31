"use client";

import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  Filter,
  MessageCircle,
  MessageSquare,
  Phone,
  RefreshCw,
  Search,
  Sparkles,
  Star,
  User,
  Video,
} from "lucide-react";
import * as React from "react";

import { Avatar, LoadingBlock } from "@/components/ui";
import { reviewApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { cn, formatDateTime, timeAgo } from "@/lib/utils";
import { useAuth, useRequireAuth } from "@/providers/auth-provider";
import {
  REVIEW_KIND_LABELS,
  type Review,
  type ReviewKind,
} from "@/types";

function getKindBadge(kind: ReviewKind) {
  if (kind === "chat") {
    return {
      label: "Live Chat",
      icon: MessageCircle,
      className: "bg-amber-50 text-amber-800 border-amber-200/80",
    };
  }
  if (kind === "call") {
    return {
      label: "Voice Call",
      icon: Phone,
      className: "bg-emerald-50 text-emerald-800 border-emerald-200/80",
    };
  }
  if (kind === "video") {
    return {
      label: "Video Call",
      icon: Video,
      className: "bg-purple-50 text-purple-800 border-purple-200/80",
    };
  }
  return {
    label: "Appointment",
    icon: CalendarDays,
    className: "bg-blue-50 text-blue-800 border-blue-200/80",
  };
}

export default function ReviewsPage() {
  const { user } = useAuth();
  const { ready } = useRequireAuth({
    roles: ["astrologer", "admin", "super_admin"],
    signInPath: "/login",
  });

  const [starFilter, setStarFilter] = React.useState<number | "all">("all");
  const [kindFilter, setKindFilter] = React.useState<ReviewKind | "all">("all");
  const [search, setSearch] = React.useState("");

  const reviewsQuery = useQuery({
    queryKey: ["reviews", "astrologer", "me"],
    queryFn: () => reviewApi.forMe({ limit: 100 }),
    enabled: ready,
  });

  if (!ready || reviewsQuery.isLoading) {
    return <LoadingBlock label="Loading client feedback and reviews…" />;
  }

  if (reviewsQuery.error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm font-semibold text-rose-700">
        {(reviewsQuery.error as ApiError).message || "Failed to load reviews."}
      </div>
    );
  }

  const reviewData = reviewsQuery.data;
  const items = reviewData?.items ?? [];
  const summary = reviewData?.summary ?? {
    average: 0,
    count: 0,
    breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  };

  const filteredItems = items.filter((r) => {
    if (starFilter !== "all" && r.stars !== starFilter) return false;
    if (kindFilter !== "all" && r.kind !== kindFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchAuthor = (r.author_name || "").toLowerCase().includes(q);
      const matchText = (r.text || "").toLowerCase().includes(q);
      if (!matchAuthor && !matchText) return false;
    }
    return true;
  });

  const totalReviews = summary.count || items.length;
  const breakdown = summary.breakdown || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 text-white shadow-xs">
              <Star className="size-4.5 fill-white" />
            </span>
            <h2 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-slate-900 leading-tight">
              Client Feedback & Reviews
            </h2>
          </div>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            Ratings and feedback submitted by clients for your chat, call, and video consultations.
          </p>
        </div>

        <button
          onClick={() => void reviewsQuery.refetch()}
          disabled={reviewsQuery.isFetching}
          className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs disabled:opacity-50"
        >
          <RefreshCw className={cn("size-3.5", reviewsQuery.isFetching && "animate-spin")} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Ratings Overview Hero Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Rating Score Hero Card */}
        <div className="relative overflow-hidden rounded-[26px] bg-gradient-to-br from-[#92400E] via-[#D97706] to-[#F59E0B] p-6 text-white shadow-[0_14px_30px_-6px_rgba(217,119,6,0.35)] flex flex-col justify-between">
          <div className="pointer-events-none absolute -right-6 -bottom-6 size-36 rounded-full bg-white/10 blur-xl" />
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/20 backdrop-blur-md px-3 py-1 text-xs font-bold text-white">
              <Sparkles className="size-3.5" />
              <span>Overall Rating</span>
            </span>
            <span className="text-[11px] font-bold text-white/80">
              {totalReviews} verified {totalReviews === 1 ? "review" : "reviews"}
            </span>
          </div>

          <div className="my-4">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-5xl sm:text-6xl font-black tracking-tight leading-none">
                {summary.average > 0 ? summary.average.toFixed(1) : "5.0"}
              </span>
              <span className="text-xl font-bold text-white/70">/ 5.0</span>
            </div>
            <div className="flex items-center gap-1 mt-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={cn(
                    "size-5",
                    star <= Math.round(summary.average || 5)
                      ? "fill-white text-white"
                      : "fill-white/30 text-white/30"
                  )}
                />
              ))}
            </div>
          </div>

          <p className="text-xs font-medium text-white/80">
            Calculated across all completed consultations. Hidden reviews are excluded.
          </p>
        </div>

        {/* Rating Breakdown Bars Card */}
        <div className="lg:col-span-2 rounded-[26px] bg-white p-6 border border-slate-100/90 shadow-[0_10px_28px_rgba(20,25,45,0.03)] flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-display text-sm font-bold text-slate-900">
              Rating Distribution
            </h3>
            <span className="text-xs text-slate-400 font-medium">
              Client Satisfaction
            </span>
          </div>

          <div className="space-y-2.5 my-3">
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = breakdown[stars] || 0;
              const percent = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
              return (
                <div key={stars} className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1 w-14 shrink-0 font-bold text-slate-700">
                    <span>{stars}</span>
                    <Star className="size-3 fill-amber-400 text-amber-400" />
                  </div>
                  <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className="w-10 text-right font-mono font-bold text-slate-600 shrink-0">
                    {count}
                  </span>
                  <span className="w-12 text-right text-[11px] text-slate-400 shrink-0">
                    {percent}%
                  </span>
                </div>
              );
            })}
          </div>

          <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>Client reviews update automatically after every consultation rating.</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl bg-white border border-slate-100/90 p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by client name or feedback text…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          {/* Star Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1">
              <Filter className="size-3" />
              <span>Stars:</span>
            </span>
            <button
              onClick={() => setStarFilter("all")}
              className={cn(
                "px-2.5 py-1 rounded-lg font-bold text-xs transition-colors",
                starFilter === "all"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              All
            </button>
            {[5, 4, 3, 2, 1].map((s) => (
              <button
                key={s}
                onClick={() => setStarFilter(s)}
                className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-xs transition-colors",
                  starFilter === s
                    ? "bg-amber-500 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                <span>{s}</span>
                <Star className={cn("size-3", starFilter === s ? "fill-white" : "fill-amber-400 text-amber-400")} />
              </button>
            ))}
          </div>
        </div>

        {/* Consultation Mode Filter */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <span className="text-[11px] font-bold text-slate-400 mr-1">Consultation Mode:</span>
          {(["all", "chat", "call", "video", "appointment"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setKindFilter(mode)}
              className={cn(
                "px-2.5 py-1 rounded-lg font-bold text-xs capitalize transition-colors",
                kindFilter === mode
                  ? "bg-slate-800 text-white shadow-xs"
                  : "bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100"
              )}
            >
              {mode === "all" ? "All Modes" : REVIEW_KIND_LABELS[mode] || mode}
            </button>
          ))}
          {(starFilter !== "all" || kindFilter !== "all" || search) && (
            <button
              onClick={() => {
                setStarFilter("all");
                setKindFilter("all");
                setSearch("");
              }}
              className="ml-auto text-[11px] font-bold text-amber-700 hover:text-amber-800"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Review Cards Grid / List */}
      {filteredItems.length === 0 ? (
        <div className="rounded-[28px] bg-white border border-slate-100/90 p-12 text-center shadow-xs">
          <div className="flex size-14 items-center justify-center rounded-full bg-amber-50 text-amber-600 mx-auto mb-3">
            <Star className="size-6 stroke-[1.8]" />
          </div>
          <h4 className="font-display text-base font-bold text-slate-900">
            No reviews found
          </h4>
          <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
            {items.length === 0
              ? "You have not received any client reviews yet. Reviews will appear here once clients complete consultations."
              : "No reviews match your selected star or mode filters. Try resetting the filters."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredItems.map((r) => {
            const badge = getKindBadge(r.kind);
            const KindIcon = badge.icon;
            return (
              <div
                key={r.id}
                className="rounded-[24px] bg-white border border-slate-100 p-5 shadow-[0_8px_24px_rgba(20,25,45,0.02)] hover:shadow-[0_12px_30px_rgba(20,25,45,0.05)] transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top: Author, Stars & Mode */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={r.author_avatar_url}
                        name={r.author_name || "Client"}
                        className="size-10 ring-2 ring-slate-100"
                      />
                      <div>
                        <h4 className="font-bold text-sm text-slate-900">
                          {r.author_name || "Client"}
                        </h4>
                        <div className="flex items-center gap-1 mt-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={cn(
                                "size-3.5",
                                star <= r.stars
                                  ? "fill-amber-400 text-amber-400"
                                  : "fill-slate-100 text-slate-200"
                              )}
                            />
                          ))}
                          <span className="ml-1 text-[11px] font-bold text-slate-700">
                            {r.stars}.0
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Mode Badge */}
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[11px] font-bold shrink-0",
                        badge.className
                      )}
                    >
                      <KindIcon className="size-3" />
                      {badge.label}
                    </span>
                  </div>

                  {/* Feedback Text */}
                  <div className="rounded-xl bg-slate-50/70 p-3.5 border border-slate-100 text-xs text-slate-700 leading-relaxed font-medium">
                    {r.text ? (
                      <p className="italic">&ldquo;{r.text}&rdquo;</p>
                    ) : (
                      <p className="text-slate-400 italic">No written comment left with this rating.</p>
                    )}
                  </div>
                </div>

                {/* Footer: Date and details */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span>{formatDateTime(r.created_at)}</span>
                  <span>{timeAgo(r.created_at)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

