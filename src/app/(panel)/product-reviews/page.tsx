"use client";

import * as React from "react";
import Image from "next/image";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Star,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Trash2,
  Search,
  Filter,
  RefreshCw,
  ThumbsUp,
  Image as ImageIcon,
  ExternalLink,
  MessageSquare,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { shopAdminApi, type ProductReviewItem } from "@/lib/api";
import { formatDateTime, timeAgo } from "@/lib/utils";

export default function ProductReviewsAdminPage() {
  const queryClient = useQueryClient();

  // State
  const [page, setPage] = React.useState<number>(1);
  const [search, setSearch] = React.useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = React.useState<string>("");
  const [ratingFilter, setRatingFilter] = React.useState<number | undefined>(undefined);
  const [visibilityFilter, setVisibilityFilter] = React.useState<"all" | "active" | "hidden">("all");
  const [selectedImage, setSelectedImage] = React.useState<string | null>(null);
  const [hideModalReview, setHideModalReview] = React.useState<ProductReviewItem | null>(null);
  const [hiddenReason, setHiddenReason] = React.useState<string>("");

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch reviews
  const isHiddenParam =
    visibilityFilter === "active" ? false : visibilityFilter === "hidden" ? true : undefined;

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["admin_product_reviews", page, debouncedSearch, ratingFilter, isHiddenParam],
    queryFn: async () => {
      return await shopAdminApi.listReviews({
        page,
        limit: 15,
        search: debouncedSearch || undefined,
        rating: ratingFilter,
        is_hidden: isHiddenParam,
      });
    },
  });

  const reviews = data?.items || [];
  const totalReviews = data?.total || 0;
  const totalPages = data?.pages || 1;

  // Moderate mutation (hide / unhide)
  const moderateMutation = useMutation({
    mutationFn: async ({
      id,
      isHidden,
      reason,
    }: {
      id: string;
      isHidden: boolean;
      reason?: string;
    }) => {
      return await shopAdminApi.moderateReview(id, {
        is_hidden: isHidden,
        hidden_reason: reason,
      });
    },
    onSuccess: (_, variables) => {
      toast.success(
        variables.isHidden
          ? "Review has been hidden from public store."
          : "Review has been restored to public store."
      );
      queryClient.invalidateQueries({ queryKey: ["admin_product_reviews"] });
      setHideModalReview(null);
      setHiddenReason("");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update review status.");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await shopAdminApi.deleteReview(id);
    },
    onSuccess: () => {
      toast.success("Review permanently deleted.");
      queryClient.invalidateQueries({ queryKey: ["admin_product_reviews"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to delete review.");
    },
  });

  const handleDelete = (review: ProductReviewItem) => {
    if (
      window.confirm(
        `Are you sure you want to permanently delete this review by "${review.author_name}"? This action cannot be undone.`
      )
    ) {
      deleteMutation.mutate(review.id);
    }
  };

  const handleToggleHide = (review: ProductReviewItem) => {
    if (review.is_hidden) {
      // Restore directly
      moderateMutation.mutate({ id: review.id, isHidden: false });
    } else {
      // Open modal to specify reason
      setHideModalReview(review);
      setHiddenReason("");
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* =================================================================== */}
      {/* 1. Header Banner */}
      {/* =================================================================== */}
      <div className="rounded-3xl border border-amber-300/80 dark:border-amber-900/50 bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-white dark:to-slate-900 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 font-bold shadow-sm">
                <Star className="size-5 fill-current" />
              </div>
              <div>
                <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                  Devotee Product Reviews & Ratings
                </h1>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Verified buyer testimonials, photo proofs of sacred items, and community ratings
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-2xs self-start sm:self-auto cursor-pointer"
          >
            <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 2. Filters & Search Bar */}
      {/* =================================================================== */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by devotee name, headline, or text..."
            className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-10 pr-4 py-2.5 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-amber-500 focus:outline-hidden transition-colors shadow-2xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Star Filter */}
          <div className="flex items-center gap-1 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1 text-xs shadow-2xs">
            <button
              type="button"
              onClick={() => {
                setRatingFilter(undefined);
                setPage(1);
              }}
              className={`rounded-xl px-3 py-1.5 font-bold transition-all cursor-pointer ${
                ratingFilter === undefined
                  ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              All Stars
            </button>
            {[5, 4, 3, 2, 1].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => {
                  setRatingFilter(r);
                  setPage(1);
                }}
                className={`flex items-center gap-1 rounded-xl px-2.5 py-1.5 font-bold transition-all cursor-pointer ${
                  ratingFilter === r
                    ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <span>{r}</span>
                <Star className="size-3 fill-current text-amber-500" />
              </button>
            ))}
          </div>

          {/* Visibility Filter */}
          <div className="flex items-center gap-1 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1 text-xs shadow-2xs">
            {(["all", "active", "hidden"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setVisibilityFilter(tab);
                  setPage(1);
                }}
                className={`rounded-xl px-3 py-1.5 font-bold capitalize transition-all cursor-pointer ${
                  visibilityFilter === tab
                    ? "bg-gradient-to-r from-[#D97706] to-[#EA580C] text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 3. Reviews List Grid */}
      {/* =================================================================== */}
      {isLoading ? (
        <div className="py-24 text-center text-xs font-bold text-slate-500">
          Loading devotee reviews...
        </div>
      ) : reviews.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-14 text-center space-y-3.5 shadow-xs">
          <div className="size-12 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-inner">
            <MessageSquare className="size-6" />
          </div>
          <h3 className="font-bold text-base text-slate-900 dark:text-white">
            No reviews found
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            {debouncedSearch || ratingFilter || visibilityFilter !== "all"
              ? "Try adjusting your filters or search keywords."
              : "When devotees receive their consecrated remedies and submit reviews, they will appear here in real time."}
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {reviews.map((rev) => (
            <div
              key={rev.id}
              className={`rounded-3xl border p-5 transition-all bg-white dark:bg-slate-900 shadow-xs ${
                rev.is_hidden
                  ? "border-rose-300 dark:border-rose-900/50 bg-rose-50/30 dark:bg-rose-950/20"
                  : "border-slate-200/90 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-500"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                {/* Devotee Info & Rating */}
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {rev.author_name}
                    </span>

                    {/* Verified Buyer Badge */}
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
                      <ShieldCheck className="size-3 text-emerald-600 shrink-0" />
                      <span>Verified Buyer</span>
                    </span>

                    {/* Status Badge */}
                    {rev.is_hidden ? (
                      <span className="rounded-full bg-rose-100 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 px-2.5 py-0.5 text-[10px] font-bold text-rose-800 dark:text-rose-300">
                        Hidden from Store
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
                        Live on Store
                      </span>
                    )}

                    <span className="text-[11px] text-slate-400">
                      • {timeAgo(rev.created_at)}
                    </span>
                  </div>

                  {/* Stars Row */}
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`size-3.5 ${
                            s <= rev.rating
                              ? "text-amber-500 fill-amber-500"
                              : "text-slate-200 dark:text-slate-700"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {rev.rating}.0 / 5.0
                    </span>

                    <span className="text-slate-300 dark:text-slate-700">|</span>

                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      Product: <code className="text-amber-700 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded-md">{rev.product_slug}</code>
                    </span>
                  </div>

                  {/* Headline */}
                  {rev.title && (
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white pt-1">
                      &ldquo;{rev.title}&rdquo;
                    </h4>
                  )}

                  {/* Comment */}
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed pt-0.5 whitespace-pre-wrap">
                    {rev.comment}
                  </p>

                  {/* Attached Photos */}
                  {rev.images && rev.images.length > 0 && (
                    <div className="pt-2 space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                        <ImageIcon className="size-3" />
                        <span>Devotee Parcel Photos ({rev.images.length}):</span>
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {rev.images.map((img, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setSelectedImage(img)}
                            className="relative size-16 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 hover:scale-105 transition-transform cursor-pointer shadow-2xs"
                          >
                            <Image
                              src={img}
                              alt="Review Photo"
                              fill
                              sizes="64px"
                              className="object-cover"
                              unoptimized
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Helpful Count */}
                  {rev.helpful_count > 0 && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 flex items-center gap-1">
                      <ThumbsUp className="size-3 text-amber-500" />
                      <span>{rev.helpful_count} devotees found this review helpful</span>
                    </p>
                  )}
                </div>

                {/* Moderation Actions */}
                <div className="flex sm:flex-col items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleToggleHide(rev)}
                    disabled={moderateMutation.isPending}
                    className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                      rev.is_hidden
                        ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {rev.is_hidden ? (
                      <>
                        <Eye className="size-3.5" />
                        <span>Restore Review</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="size-3.5" />
                        <span>Hide Review</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(rev)}
                    disabled={deleteMutation.isPending}
                    className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300 transition-colors cursor-pointer"
                  >
                    <Trash2 className="size-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* =================================================================== */}
      {/* 4. Pagination */}
      {/* =================================================================== */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800 text-xs">
          <span className="text-slate-500">
            Showing Page {page} of {totalPages} ({totalReviews} total reviews)
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-1.5 font-bold text-slate-700 dark:text-slate-300 disabled:opacity-40 cursor-pointer shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-1.5 font-bold text-slate-700 dark:text-slate-300 disabled:opacity-40 cursor-pointer shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* Photo Preview Lightbox Modal */}
      {/* =================================================================== */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="relative max-w-2xl max-h-[85vh] w-full bg-white dark:bg-slate-900 rounded-3xl overflow-hidden p-3 shadow-2xl border border-slate-200 dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 z-10 size-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black transition-colors"
            >
              <X className="size-4" />
            </button>
            <div className="relative aspect-4/3 w-full rounded-2xl overflow-hidden bg-slate-950">
              <Image
                src={selectedImage}
                alt="Enlarged Review Proof"
                fill
                className="object-contain"
                unoptimized
              />
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* Hide Reason Modal */}
      {/* =================================================================== */}
      {hideModalReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <EyeOff className="size-4 text-rose-500" />
                <span>Hide Review from Public Store</span>
              </h3>
              <button
                type="button"
                onClick={() => setHideModalReview(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              This review by <strong className="text-slate-800 dark:text-slate-200">{hideModalReview.author_name}</strong> will be immediately removed from the customer product page and will not count towards the product&apos;s average rating.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Reason for Hiding (Internal Note):
              </label>
              <input
                type="text"
                value={hiddenReason}
                onChange={(e) => setHiddenReason(e.target.value)}
                placeholder="e.g. Inappropriate language, spam, or off-topic"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:border-amber-500 focus:outline-hidden"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setHideModalReview(null)}
                className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  moderateMutation.mutate({
                    id: hideModalReview.id,
                    isHidden: true,
                    reason: hiddenReason || "Moderated by admin",
                  })
                }
                disabled={moderateMutation.isPending}
                className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-2 text-xs shadow-md transition-colors cursor-pointer"
              >
                {moderateMutation.isPending ? "Hiding..." : "Confirm Hide"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
