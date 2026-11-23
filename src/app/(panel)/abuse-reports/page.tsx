"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Filter,
  Loader2,
  ShieldAlert,
  User,
  UserCheck,
  X,
  Zap,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import {
  Avatar,
  Button,
  ConfirmModal,
  LoadingBlock,
  Modal,
  Pagination,
} from "@/components/ui";
import { adminAbuseApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { cn, formatDateTime } from "@/lib/utils";
import { useRequireAuth } from "@/providers/auth-provider";
import type {
  AbuseReportListItem,
  AbuseReportOut,
  AbuseReportReviewRequest,
  AbuseReportStats,
} from "@/lib/api";

type Status = "all" | "pending" | "reviewed" | "resolved" | "dismissed";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-100",
  reviewed: "bg-blue-50 text-blue-700 border-blue-100",
  resolved: "bg-emerald-50 text-emerald-700 border-emerald-100",
  dismissed: "bg-slate-50 text-slate-700 border-slate-100",
};

export default function AbuseReportsPage() {
  const { ready } = useRequireAuth({
    roles: ["admin", "super_admin"],
    signInPath: "/login",
  });
  const queryClient = useQueryClient();

  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<Status>("all");
  const [fromDate, setFromDate] = React.useState("");
  const [toDate, setToDate] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [debounced, setDebounced] = React.useState("");

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["admin", "abuse-reports", "stats"],
    queryFn: adminAbuseApi.stats,
    enabled: ready,
  });

  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      "admin",
      "abuse-reports",
      debounced,
      statusFilter,
      fromDate,
      toDate,
      page,
    ],
    queryFn: () =>
      adminAbuseApi.list({
        page,
        limit: 20,
        status: statusFilter === "all" ? undefined : statusFilter,
        search: debounced || undefined,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
      }),
    enabled: ready,
    placeholderData: (previous) => previous,
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin", "abuse-reports"] as const });
    void refetch();
  };

  const items: AbuseReportListItem[] = data?.items || [];
  const meta = data?.meta;

  const [selected, setSelected] = React.useState<AbuseReportListItem | null>(null);
  const [detail, setDetail] = React.useState<AbuseReportOut | null>(null);
  const [reviewStatus, setReviewStatus] = React.useState<"reviewed" | "resolved" | "dismissed">(
    "reviewed",
  );
  const [adminNotes, setAdminNotes] = React.useState("");

  const openReview = (item: AbuseReportListItem) => {
    setSelected(item);
    setReviewStatus("reviewed");
    setAdminNotes("");
    setDetail(null);
    void adminAbuseApi
      .get(item.id)
      .then((d) => setDetail(d))
      .catch(() => {});
  };

  const review = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error("No report selected");
      const body: AbuseReportReviewRequest = {
        status: reviewStatus,
        admin_notes: adminNotes.trim() || null,
      };
      return adminAbuseApi.review(selected.id, body);
    },
    onSuccess: () => {
      toast.success("Report reviewed and status updated.");
      setSelected(null);
      setDetail(null);
      void refresh();
    },
    onError: (e: ApiError) => toast.error(e.message),
  });

  const [unblockTarget, setUnblockTarget] = React.useState<{
    reportId: string;
    clientUserId: string;
    clientName: string;
  } | null>(null);

  const unblock = useMutation({
    mutationFn: () => {
      if (!unblockTarget) throw new Error("No unblock target");
      return adminAbuseApi.unblockClient(unblockTarget.reportId, {
        client_user_id: unblockTarget.clientUserId,
      });
    },
    onSuccess: (result) => {
      if (result.unblocked) {
        toast.success("Client removed from astrologer's blacklist.");
      } else {
        toast.info("Client was not on this astrologer's blacklist.");
      }
      setUnblockTarget(null);
      void refresh();
    },
    onError: (e: ApiError) => toast.error(e.message),
  });

  if (!ready) return <LoadingBlock />;

  const statusCounts = {
    pending: stats?.pending_reports ?? 0,
    reviewed: stats?.reviewed_reports ?? 0,
    resolved: stats?.resolved_reports ?? 0,
    dismissed: stats?.dismissed_reports ?? 0,
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
              <ShieldAlert className="size-5" />
            </span>
            <h2 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-slate-900 leading-tight">
              Abuse Reports & Safety
            </h2>
          </div>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            Central trust & safety desk for every client red-flag filed by
            astrologers. Investigate, review status, and unblock clients.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => void refresh()}
            disabled={isFetching || statsLoading}
            className="flex items-center gap-2 rounded-2xl border border-slate-200/90 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs transition-all hover:bg-slate-50 active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Loader2
              className={cn(
                "size-3.5",
                isFetching ? "animate-spin text-[#D97706]" : "text-slate-400"
              )}
            />
            <span>{isFetching ? "Syncing…" : "Refresh"}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
        <KpiCard
          title="Total Reports"
          value={stats?.total_reports ?? 0}
          subtitle={
            stats?.reports_this_month
              ? `+${stats.reports_this_month} this month`
              : "—"
          }
          icon={User}
          gradient="from-slate-800 via-slate-700 to-slate-900"
          accent="text-slate-400"
        />
        <KpiCard
          title="Pending Review"
          value={statusCounts.pending}
          subtitle="Awaiting admin action"
          icon={ShieldAlert}
          gradient="from-amber-500 to-amber-600"
          accent="text-[#D97706]"
          isAlert={statusCounts.pending > 0}
        />
        <KpiCard
          title="Resolved"
          value={statusCounts.resolved}
          subtitle="Closed after investigation"
          icon={UserCheck}
          gradient="from-emerald-500 to-emerald-600"
          accent="text-emerald-600"
        />
        <KpiCard
          title="Dismissed"
          value={statusCounts.dismissed}
          subtitle="Found not actionable"
          icon={X}
          gradient="from-rose-500 to-rose-600"
          accent="text-rose-600"
        />
      </div>

      <div className="rounded-[28px] bg-white p-5 sm:p-6 border border-slate-100/90 shadow-[0_10px_30px_rgba(20,25,45,0.03)] flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 hidden sm:block">
            Status
          </label>
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: "all", label: "All" },
              { id: "pending", label: "Pending", count: statusCounts.pending },
              { id: "reviewed", label: "Reviewed", count: statusCounts.reviewed },
              { id: "resolved", label: "Resolved", count: statusCounts.resolved },
              { id: "dismissed", label: "Dismissed", count: statusCounts.dismissed },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as Status)}
                className={cn(
                  "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer border",
                  statusFilter === tab.id
                    ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                    : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900"
                )}
              >
                <span>{tab.label}</span>
                {tab.id !== "all" && (
                  <span className="rounded-full px-1.5 py-0.5 text-[9px] font-black opacity-80">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="relative w-full max-w-md">
          <Filter className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search astrologer or client name…"
            className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50/70 pl-10 pr-9 text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#D97706]/30 focus:border-[#D97706]"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-800 focus:border-[#D97706] focus:ring-1 focus:ring-[#D97706]"
          />
          <span className="text-[10px] text-slate-400">to</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-800 focus:border-[#D97706] focus:ring-1 focus:ring-[#D97706]"
          />
        </div>

        {(search || statusFilter !== "all" || fromDate || toDate) && (
          <button
            onClick={() => {
              setSearch("");
              setStatusFilter("all");
              setFromDate("");
              setToDate("");
              setDebounced("");
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
          >
            Clear filters
          </button>
        )}
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700">
          {(error as ApiError).message}
        </div>
      ) : (isLoading || statsLoading) && !data ? (
        <LoadingBlock label="Loading abuse reports…" />
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[28px] bg-white py-16 px-4 text-center border border-slate-100 shadow-sm">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 mb-4">
            <ShieldAlert className="size-8" />
          </div>
          <h3 className="font-display text-base font-bold text-slate-900">
            {debounced || statusFilter !== "all" || fromDate || toDate
              ? "No reports match your filters"
              : "No abuse reports yet"}
          </h3>
          <p className="mt-1 text-xs text-slate-400 max-w-sm">
            {debounced || statusFilter !== "all" || fromDate || toDate
              ? "Try resetting your filters to see all platform reports."
              : "No client has been red-flagged by any astrologer yet. Reports appear here automatically when an astrologer terminates a call for misconduct."}
          </p>
          {(debounced || statusFilter !== "all" || fromDate || toDate) && (
            <button
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
                setFromDate("");
                setToDate("");
                setDebounced("");
                setPage(1);
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
                  <th className="py-4 pl-6 pr-4">Report</th>
                  <th className="py-4 pl-4">Astrologer</th>
                  <th className="py-4 pl-4">Client</th>
                  <th className="py-4 pl-4">Reason</th>
                  <th className="py-4 pl-4 text-center">Action</th>
                  <th className="py-4 pl-4 text-center">Status</th>
                  <th className="py-4 pl-4">Filed (IST)</th>
                  <th className="py-4 pr-6 pl-4 text-right">Admin Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="group transition-colors hover:bg-slate-50/60"
                  >
                    <td className="py-4 pl-6 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-7 items-center justify-center rounded-xl bg-rose-50 text-rose-600 shrink-0">
                          <ShieldAlert className="size-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-bold text-slate-900 group-hover:text-[#D97706] transition-colors text-sm">
                            #{item.id.slice(-6)}
                          </p>
                          <p className="truncate text-[10px] font-semibold text-slate-400">
                            {item.action_taken === "blacklisted"
                              ? "Client blacklisted"
                              : "Flagged only"}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 pl-4 pr-4">
                      <div className="flex items-center gap-3">
                        <Avatar
                          name={item.astrologer_name ?? "Unknown"}
                          size="md"
                          className="size-9 rounded-xl ring-2 ring-slate-100 object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="truncate font-bold text-slate-900 text-sm">
                            {item.astrologer_name ?? "Unknown Astrologer"}
                          </p>
                          <p className="truncate text-[10px] font-semibold text-slate-400">
                            #{item.astrologer_id.slice(-6)}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 pl-4 pr-4">
                      <div className="flex items-center gap-3">
                        <Avatar
                          name={item.client_name ?? "Unknown"}
                          size="md"
                          className="size-9 rounded-xl ring-2 ring-slate-100 object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="truncate font-bold text-slate-900 text-sm">
                            {item.client_name ?? "Unknown Client"}
                          </p>
                          <p className="truncate text-[10px] font-semibold text-slate-400">
                            {item.client_email_masked ?? item.client_user_id.slice(-6)}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 pl-4 pr-4">
                      <p className="text-sm text-slate-800 font-medium max-w-xs break-words">
                        {item.reason}
                      </p>
                    </td>

                    <td className="py-4 pl-4 pr-4 text-center">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold border",
                          item.action_taken === "blacklisted"
                            ? "bg-rose-50 text-rose-700 border-rose-100"
                            : "bg-amber-50 text-amber-700 border-amber-100"
                        )}
                      >
                        {item.action_taken === "blacklisted" ? (
                          <>
                            <span className="size-1.5 rounded-full bg-rose-500" /> Blacklisted
                          </>
                        ) : (
                          <>
                            <span className="size-1.5 rounded-full bg-amber-500" /> Flagged
                          </>
                        )}
                      </span>
                    </td>

                    <td className="py-4 pl-4 pr-4 text-center">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold border",
                          STATUS_COLORS[item.status] ||
                            "bg-slate-50 text-slate-700 border-slate-100"
                        )}
                      >
                        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                      </span>
                    </td>

                    <td className="py-4 pl-4 pr-4 whitespace-nowrap text-slate-600 font-semibold text-[11px]">
                      {formatDateTime(item.created_at)}
                    </td>

                    <td className="py-4 pr-6 pl-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openReview(item)}
                          className="flex size-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition-all cursor-pointer"
                          title="Investigate & review"
                        >
                          <Zap className="size-3.5" />
                        </button>
                        {item.status === "pending" && (
                          <button
                            onClick={() => {
                              setUnblockTarget({
                                reportId: item.id,
                                clientUserId: item.client_user_id,
                                clientName: item.client_name ?? "Unknown",
                              });
                            }}
                            className="flex size-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-all cursor-pointer"
                            title="Unblock client from astrologer's blacklist"
                          >
                            <User className="size-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {meta && (
            <div className="p-4 border-t border-slate-100 bg-slate-50/50">
              <Pagination meta={meta} onPage={setPage} />
            </div>
          )}
        </div>
      )
      }

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={`Investigate Report #${selected?.id.slice(-6)}`}
        description={selected ? `Reason: ${selected.reason}` : undefined}
        size="lg"
        footer={
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
              <span className={cn("rounded-full px-1.5 py-0.5 border", STATUS_COLORS[selected?.status ?? "pending"])}>
                {selected?.status}
              </span>
            </div>
            <Button variant="secondary" onClick={() => setSelected(null)} disabled={review.isPending}>
              Close
            </Button>
            {detail && (
              <Button
                variant="primary"
                onClick={() => review.mutate()}
                disabled={review.isPending}
                loading={review.isPending}
              >
                {review.isPending ? <Loader2 className="size-3.5 animate-spin" /> : null}
                {review.isPending ? "Updating…" : `Mark ${reviewStatus}`}
              </Button>
            )}
          </div>
        }
      >
        <div className="space-y-5">
          {detail && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DetailRow label="Report ID" value={`#${detail.id.slice(-6)}`} />
              <DetailRow label="Astrologer" value={detail.astrologer_name ?? "Unknown"} />
              <DetailRow label="Client" value={detail.client_name ?? "Unknown"} />
              <DetailRow label="Client Email" value={detail.client_email_masked ?? "—"} />
              <DetailRow label="Action Taken" value={detail.action_taken.replace("_", " ").toUpperCase()} />
              <DetailRow label="Current Status" value={detail.status.charAt(0).toUpperCase() + detail.status.slice(1)} />
              {detail.appointment_id && <DetailRow label="Appointment" value={`#${detail.appointment_id.slice(-6)}`} />}
              {detail.call_id && <DetailRow label="Call Session" value={`#${detail.call_id.slice(-6)}`} />}
              <DetailRow label="Filed At" value={formatDateTime(detail.created_at)} />
              {detail.reviewed_at && (
                <DetailRow label="Last Reviewed" value={formatDateTime(detail.reviewed_at)} />
              )}
            </div>
          )}

          <div className="border-t border-slate-100 pt-4 space-y-2">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              New Review Status
            </label>
            <div className="flex gap-2">
              {["reviewed", "resolved", "dismissed"].map((s) => (
                <button
                  key={s}
                  onClick={() => setReviewStatus(s as "reviewed" | "resolved" | "dismissed")}
                  className={cn(
                    "flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-all border",
                    reviewStatus === s
                      ? "bg-rose-600 text-white border-rose-600 shadow-xs ring-2 ring-rose-100"
                      : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                  )}
                >
                  <span className="size-1.5 rounded-full" />
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Admin Investigation Notes
            </label>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={3}
              placeholder="Record your findings, evidence, and decision rationale…"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#D97706]/30 focus:border-[#D97706]"
            />
            {detail?.admin_notes && (
              <div className="rounded-lg bg-amber-50 border border-amber-100 p-3 text-[11px] font-medium text-amber-800">
                Previous admin notes: {detail.admin_notes}
              </div>
            )}
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={Boolean(unblockTarget)}
        onClose={() => setUnblockTarget(null)}
        onConfirm={() => unblock.mutate()}
        title="Unblock Client from Blacklist"
        description={
          unblockTarget
            ? `Remove ${unblockTarget.clientName} from the reporting astrologer's personal blacklist. The client can book with this astrologer again.`
            : undefined
        }
        confirmLabel="Unblock"
        loading={unblock.isPending}
      />
    </div>
  );
}

/* ──────────────────── Sub-components ──────────────────── */

function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  gradient,
  accent,
  isAlert = false,
}: {
  title: string;
  value: number;
  subtitle: string;
  icon: React.ElementType;
  gradient: string;
  accent: string;
  isAlert?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-[26px] p-5 text-white shadow-[0_14px_30px_-6px_rgba(0,0,0,0.25)] transition-all duration-300 hover:-translate-y-1 cursor-pointer group flex flex-col justify-between min-h-[145px]",
        gradient,
        isAlert ? "animate-pulse" : ""
      )}
    >
      <div className="pointer-events-none absolute -right-4 -bottom-4 size-28 rounded-full bg-white/10 blur-2xl group-hover:scale-125 transition-transform" />
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex size-10 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md shadow-xs group-hover:scale-110 transition-transform">
          <Icon className="size-5 text-white stroke-[2.2]" />
        </div>
        {isAlert && (
          <span className="inline-flex items-center gap-1 rounded-full bg-white/20 backdrop-blur-md px-2 py-0.5 text-[10px] font-black text-white">
            <span className="size-2 rounded-full bg-white animate-pulse" />
            Needs Attention
          </span>
        )}
      </div>
      <div className="relative z-10 mt-3">
        <p className="text-xs font-semibold text-white/80">{title}</p>
        <div className="mt-0.5 flex items-baseline justify-between">
          <h3 className="font-display text-3xl sm:text-4xl font-black tracking-tight text-white leading-none">
            {value}
          </h3>
          <span className="text-[11px] font-bold text-white/80">{subtitle}</span>
        </div>
      </div>
      <div className="relative z-10 mt-auto pt-4">
        <span className={cn("text-[10px] font-bold uppercase tracking-wider", accent)}>
          Trust & Safety Desk
        </span>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-slate-100 pb-2 pt-1">
      <span className="text-[11px] font-semibold text-slate-500">{label}</span>
      <span className="text-[11px] font-bold text-slate-900 truncate max-w-xs">{value}</span>
    </div>
  );
}

