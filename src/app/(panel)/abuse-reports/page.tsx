"use client";

/**
 * Trust & Safety Desk: Abuse Reports & Incident Monitoring.
 *
 * Central administrator screen to:
 * 1. Audit every client red-flag incident filed by astrologers during calls or appointments.
 * 2. Investigate misconduct reports, record admin findings, and update case statuses.
 * 3. Unblock clients from an astrologer's blacklist if reports are resolved or dismissed.
 * 4. Monitor safety intelligence: repeat offenders and astrologer flagging frequency.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  Filter,
  Loader2,
  PhoneCall,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  User,
  UserCheck,
  UserX,
  Users,
  Video,
  X,
  Zap,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { PanelHeader } from "@/components/layout/panel-shell";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  ConfirmModal,
  EmptyState,
  Field,
  Input,
  LoadingBlock,
  Modal,
  Pagination,
  Select,
  Textarea,
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

const STATUS_BADGES: Record<string, { label: string; tone: "gold" | "blue" | "green" | "neutral" }> = {
  pending: { label: "Pending", tone: "gold" },
  reviewed: { label: "Under Review", tone: "blue" },
  resolved: { label: "Resolved", tone: "green" },
  dismissed: { label: "Dismissed", tone: "neutral" },
};

export default function AbuseReportsPage() {
  const { ready } = useRequireAuth({
    roles: ["admin", "super_admin"],
    signInPath: "/login",
  });
  const queryClient = useQueryClient();

  // Active view tab: reports ledger vs safety intelligence
  const [activeTab, setActiveTab] = React.useState<"reports" | "repeat_offenders" | "astro_analytics">("reports");

  // Filtering state
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

  // Queries
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

  // Modal & Detail States
  const [selected, setSelected] = React.useState<AbuseReportListItem | null>(null);
  const [detail, setDetail] = React.useState<AbuseReportOut | null>(null);
  const [isDetailLoading, setIsDetailLoading] = React.useState(false);
  const [reviewStatus, setReviewStatus] = React.useState<"reviewed" | "resolved" | "dismissed">("reviewed");
  const [adminNotes, setAdminNotes] = React.useState("");

  const openReview = (item: AbuseReportListItem) => {
    setSelected(item);
    setReviewStatus(item.status === "pending" ? "reviewed" : (item.status as any));
    setAdminNotes("");
    setDetail(null);
    setIsDetailLoading(true);
    adminAbuseApi
      .get(item.id)
      .then((d) => {
        setDetail(d);
        if (d.admin_notes) setAdminNotes(d.admin_notes);
      })
      .catch((e) => toast.error(e.message || "Failed to load report details."))
      .finally(() => setIsDetailLoading(false));
  };

  const reviewMutation = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error("No report selected");
      const body: AbuseReportReviewRequest = {
        status: reviewStatus,
        admin_notes: adminNotes.trim() || null,
      };
      return adminAbuseApi.review(selected.id, body);
    },
    onSuccess: () => {
      toast.success("Incident report review status updated.");
      setSelected(null);
      setDetail(null);
      void refresh();
    },
    onError: (e: ApiError) => toast.error(e.message || "Failed to update report status."),
  });

  const [unblockTarget, setUnblockTarget] = React.useState<{
    reportId: string;
    clientUserId: string;
    clientName: string;
    astrologerName: string;
  } | null>(null);

  const unblockMutation = useMutation({
    mutationFn: () => {
      if (!unblockTarget) throw new Error("No unblock target selected");
      return adminAbuseApi.unblockClient(unblockTarget.reportId, {
        client_user_id: unblockTarget.clientUserId,
      });
    },
    onSuccess: (result) => {
      if (result.unblocked) {
        toast.success(`Client ${unblockTarget?.clientName} removed from ${unblockTarget?.astrologerName}'s blacklist.`);
      } else {
        toast.info("Client was not actively on this astrologer's blacklist.");
      }
      setUnblockTarget(null);
      void refresh();
    },
    onError: (e: ApiError) => toast.error(e.message || "Failed to unblock client."),
  });

  if (!ready) return <LoadingBlock label="Verifying safety credentials…" />;

  const statusCounts = {
    pending: stats?.pending_reports ?? 0,
    reviewed: stats?.reviewed_reports ?? 0,
    resolved: stats?.resolved_reports ?? 0,
    dismissed: stats?.dismissed_reports ?? 0,
  };

  return (
    <>
      <PanelHeader
        title="Abuse Reports & Safety Desk"
        description="Audit red-flagged client misconduct, investigate consultation disputes, and manage astrologer blacklist statuses."
      />

      <Alert tone="info" className="mb-6">
        <strong>Trust & Safety Incident Governance:</strong> When an astrologer terminates a live call or appointment
        via Red-Flag, the client is flagged and optionally added to their personal blacklist. Administrators review
        evidence, determine case resolution, and can immediately restore client booking privileges when appropriate.
      </Alert>

      {/* Top Metric Cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
        <Card className="border-border">
          <CardBody className="p-4">
            <span className="text-xs font-medium text-muted-foreground">Total Incidents</span>
            <p className="mt-1 text-2xl font-bold text-foreground">{stats?.total_reports ?? 0}</p>
            <span className="text-[10px] text-muted-foreground">+{stats?.reports_this_month ?? 0} this month</span>
          </CardBody>
        </Card>
        <Card className="border-border">
          <CardBody className="p-4">
            <span className="text-xs font-medium text-amber-600">Pending Review</span>
            <p className="mt-1 text-2xl font-bold text-amber-600">{statusCounts.pending}</p>
            <span className="text-[10px] text-muted-foreground">Awaiting admin action</span>
          </CardBody>
        </Card>
        <Card className="border-border">
          <CardBody className="p-4">
            <span className="text-xs font-medium text-blue-600">Under Review</span>
            <p className="mt-1 text-2xl font-bold text-blue-600">{statusCounts.reviewed}</p>
            <span className="text-[10px] text-muted-foreground">Active investigations</span>
          </CardBody>
        </Card>
        <Card className="border-border">
          <CardBody className="p-4">
            <span className="text-xs font-medium text-success">Resolved Cases</span>
            <p className="mt-1 text-2xl font-bold text-success">{statusCounts.resolved}</p>
            <span className="text-[10px] text-muted-foreground">Action taken & closed</span>
          </CardBody>
        </Card>
        <Card className="border-border">
          <CardBody className="p-4">
            <span className="text-xs font-medium text-muted-foreground">Dismissed</span>
            <p className="mt-1 text-2xl font-bold text-muted-foreground">{statusCounts.dismissed}</p>
            <span className="text-[10px] text-muted-foreground">Non-actionable / false</span>
          </CardBody>
        </Card>
      </div>

      {/* Main Tabs Switcher */}
      <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-border pb-3">
        <Button
          variant={activeTab === "reports" ? "primary" : "secondary"}
          size="sm"
          onClick={() => setActiveTab("reports")}
          className="flex items-center gap-1.5"
        >
          <ShieldAlert className="size-4" />
          <span>Incident Reports ({stats?.total_reports ?? 0})</span>
        </Button>
        <Button
          variant={activeTab === "repeat_offenders" ? "primary" : "secondary"}
          size="sm"
          onClick={() => setActiveTab("repeat_offenders")}
          className="flex items-center gap-1.5"
        >
          <UserX className="size-4" />
          <span>Repeat Offenders ({stats?.top_flagged_clients?.length ?? 0})</span>
        </Button>
        <Button
          variant={activeTab === "astro_analytics" ? "primary" : "secondary"}
          size="sm"
          onClick={() => setActiveTab("astro_analytics")}
          className="flex items-center gap-1.5"
        >
          <Users className="size-4" />
          <span>Astrologer Flagging Dynamics ({stats?.top_flagging_astrologers?.length ?? 0})</span>
        </Button>
      </div>

      {/* TAB 1: INCIDENT REPORTS TABLE */}
      {activeTab === "reports" && (
        <div className="space-y-6">
          {/* Filter Toolbar */}
          <Card className="border-border">
            <CardBody className="p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                {/* Search Input */}
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by astrologer name, client name or incident reason…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-11"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>

                {/* Status Chips */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { id: "all", label: "All" },
                    { id: "pending", label: "Pending", count: statusCounts.pending },
                    { id: "reviewed", label: "Under Review", count: statusCounts.reviewed },
                    { id: "resolved", label: "Resolved", count: statusCounts.resolved },
                    { id: "dismissed", label: "Dismissed", count: statusCounts.dismissed },
                  ].map((tab) => (
                    <Button
                      key={tab.id}
                      variant={statusFilter === tab.id ? "primary" : "secondary"}
                      size="sm"
                      onClick={() => {
                        setStatusFilter(tab.id as Status);
                        setPage(1);
                      }}
                      className="h-8 text-xs"
                    >
                      {tab.label} {tab.id !== "all" ? `(${tab.count})` : ""}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Date Filters */}
              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="font-medium">Incident Date Range:</span>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => {
                    setFromDate(e.target.value);
                    setPage(1);
                  }}
                  className="h-9 rounded-full border border-border bg-surface px-3 text-xs text-foreground focus:border-brand-500"
                />
                <span>to</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => {
                    setToDate(e.target.value);
                    setPage(1);
                  }}
                  className="h-9 rounded-full border border-border bg-surface px-3 text-xs text-foreground focus:border-brand-500"
                />

                {(search || statusFilter !== "all" || fromDate || toDate) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearch("");
                      setStatusFilter("all");
                      setFromDate("");
                      setToDate("");
                      setDebounced("");
                      setPage(1);
                    }}
                    className="h-8 text-xs"
                  >
                    Reset Filters
                  </Button>
                )}

                <div className="ml-auto">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={refresh}
                    disabled={isFetching || statsLoading}
                    className="h-8 text-xs"
                  >
                    <RotateCcw className={cn("mr-1.5 size-3.5", isFetching && "animate-spin")} />
                    Refresh
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Table Container */}
          {isLoading ? (
            <LoadingBlock label="Fetching abuse incidents and blacklist records…" />
          ) : items.length === 0 ? (
            <EmptyState
              title="No abuse reports found"
              description={
                debounced || statusFilter !== "all" || fromDate || toDate
                  ? "Try adjusting your search criteria or date filters."
                  : "No client misconduct reports have been filed by any astrologer yet."
              }
              action={
                debounced || statusFilter !== "all" || fromDate || toDate ? (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSearch("");
                      setStatusFilter("all");
                      setFromDate("");
                      setToDate("");
                      setDebounced("");
                      setPage(1);
                    }}
                  >
                    Clear Search Filters
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <Card className="overflow-hidden border-border">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border bg-surface-subtle/50 font-semibold text-muted-foreground">
                      <th className="py-3.5 pl-6 pr-4">Incident ID</th>
                      <th className="py-3.5 pl-4 pr-4">Astrologer</th>
                      <th className="py-3.5 pl-4 pr-4">Client</th>
                      <th className="py-3.5 pl-4 pr-4">Reason / Notes</th>
                      <th className="py-3.5 pl-4 pr-4 text-center">Blacklist State</th>
                      <th className="py-3.5 pl-4 pr-4 text-center">Status</th>
                      <th className="py-3.5 pl-4 pr-4">Filed (IST)</th>
                      <th className="py-3.5 pl-4 pr-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {items.map((item) => {
                      const badgeInfo = STATUS_BADGES[item.status] || { label: item.status, tone: "neutral" };
                      return (
                        <tr key={item.id} className="transition-colors hover:bg-surface-subtle/40">
                          {/* Incident ID */}
                          <td className="py-3.5 pl-6 pr-4">
                            <span className="font-mono font-bold text-foreground">
                              #{item.id.slice(-6).toUpperCase()}
                            </span>
                          </td>

                          {/* Astrologer */}
                          <td className="py-3.5 pl-4 pr-4">
                            <div className="flex items-center gap-2.5">
                              <Avatar name={item.astrologer_name ?? "Astrologer"} size="sm" />
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-foreground">
                                  {item.astrologer_name || "Unknown Astrologer"}
                                </p>
                                <span className="font-mono text-[10px] text-muted-foreground">
                                  ID: {item.astrologer_id.slice(-6)}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Client */}
                          <td className="py-3.5 pl-4 pr-4">
                            <div className="flex items-center gap-2.5">
                              <Avatar name={item.client_name ?? "Client"} size="sm" />
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-foreground">
                                  {item.client_name || "Client"}
                                </p>
                                <span className="text-[10px] text-muted-foreground">
                                  {item.client_email_masked || `UID: ${item.client_user_id.slice(-6)}`}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Reason */}
                          <td className="py-3.5 pl-4 pr-4 max-w-xs">
                            <p className="line-clamp-2 text-foreground">{item.reason}</p>
                          </td>

                          {/* Blacklist State */}
                          <td className="py-3.5 pl-4 pr-4 text-center">
                            {item.action_taken === "blacklisted" ? (
                              <Badge tone="red">Blacklisted</Badge>
                            ) : (
                              <Badge tone="gold">Flagged Only</Badge>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 pl-4 pr-4 text-center">
                            <Badge tone={badgeInfo.tone}>{badgeInfo.label}</Badge>
                          </td>

                          {/* Filed Date */}
                          <td className="py-3.5 pl-4 pr-4 whitespace-nowrap text-muted-foreground">
                            {formatDateTime(item.created_at)}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 pl-4 pr-6 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => openReview(item)}
                                className="h-7 px-2.5 text-xs"
                                title="Investigate and change review status"
                              >
                                <Eye className="mr-1 size-3.5" />
                                Investigate
                              </Button>

                              {item.action_taken === "blacklisted" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    setUnblockTarget({
                                      reportId: item.id,
                                      clientUserId: item.client_user_id,
                                      clientName: item.client_name ?? "Client",
                                      astrologerName: item.astrologer_name ?? "Astrologer",
                                    })
                                  }
                                  className="h-7 px-2 text-xs text-success hover:bg-success-surface"
                                  title="Unblock client from this astrologer's blacklist"
                                >
                                  <UserCheck className="mr-1 size-3.5" />
                                  Unblock
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {meta && (
                <div className="border-t border-border p-4 bg-surface-subtle/30">
                  <Pagination meta={meta} onPage={setPage} />
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      {/* TAB 2: REPEAT OFFENDERS MONITORING */}
      {activeTab === "repeat_offenders" && (
        <div className="space-y-4">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserX className="size-5 text-danger" />
                <span>Repeat Flagged Clients (একাধিক জ্যোতিষীর দ্বারা রিপোর্টকৃত ব্যবহারকারী)</span>
              </CardTitle>
            </CardHeader>
            <CardBody className="p-0">
              {(!stats?.top_flagged_clients || stats.top_flagged_clients.length === 0) ? (
                <div className="p-8 text-center text-muted-foreground">
                  <ShieldCheck className="mx-auto mb-2 size-8 text-success" />
                  <p>No repeat offenders identified. All reported users have single isolated flags.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border bg-surface-subtle/50 font-semibold text-muted-foreground">
                        <th className="py-3.5 pl-6 pr-4">Client User</th>
                        <th className="py-3.5 pl-4 pr-4">User ID</th>
                        <th className="py-3.5 pl-4 pr-4">Masked Email</th>
                        <th className="py-3.5 pl-4 pr-4 text-center">Total Flagged Times</th>
                        <th className="py-3.5 pl-4 pr-4 text-center">Threat Risk</th>
                        <th className="py-3.5 pl-4 pr-6 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {stats.top_flagged_clients.map((c) => {
                        const isSevere = c.report_count >= 3;
                        return (
                          <tr key={c.client_user_id} className="hover:bg-surface-subtle/30">
                            <td className="py-3.5 pl-6 pr-4 font-semibold text-foreground">
                              <div className="flex items-center gap-2.5">
                                <Avatar name={c.client_name || "User"} size="sm" />
                                <span>{c.client_name || "Client"}</span>
                              </div>
                            </td>
                            <td className="py-3.5 pl-4 pr-4 font-mono text-muted-foreground">
                              {c.client_user_id}
                            </td>
                            <td className="py-3.5 pl-4 pr-4 text-muted-foreground">
                              {c.client_email_masked || "—"}
                            </td>
                            <td className="py-3.5 pl-4 pr-4 text-center">
                              <Badge tone={isSevere ? "red" : "gold"}>
                                {c.report_count} incident{c.report_count > 1 ? "s" : ""}
                              </Badge>
                            </td>
                            <td className="py-3.5 pl-4 pr-4 text-center">
                              {isSevere ? (
                                <Badge tone="red">Critical Repeat Offender</Badge>
                              ) : (
                                <Badge tone="gold">Multiple Warnings</Badge>
                              )}
                            </td>
                            <td className="py-3.5 pl-4 pr-6 text-right">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                  setSearch(c.client_name || c.client_user_id);
                                  setActiveTab("reports");
                                }}
                                className="h-7 text-xs"
                              >
                                View Related Reports
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      )}

      {/* TAB 3: ASTROLOGER FLAGGING DYNAMICS */}
      {activeTab === "astro_analytics" && (
        <div className="space-y-4">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="size-5 text-brand-700" />
                <span>Astrologer Red-Flag Frequency (জ্যোতিষীদের রিপোর্ট পর্যালোচনা)</span>
              </CardTitle>
            </CardHeader>
            <CardBody className="p-0">
              {(!stats?.top_flagging_astrologers || stats.top_flagging_astrologers.length === 0) ? (
                <div className="p-8 text-center text-muted-foreground">
                  <p>No astrologer flagging data recorded yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border bg-surface-subtle/50 font-semibold text-muted-foreground">
                        <th className="py-3.5 pl-6 pr-4">Astrologer</th>
                        <th className="py-3.5 pl-4 pr-4">Profile ID</th>
                        <th className="py-3.5 pl-4 pr-4 text-center">Total Red-Flags Filed</th>
                        <th className="py-3.5 pl-4 pr-6 text-right">Audit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {stats.top_flagging_astrologers.map((a) => (
                        <tr key={a.astrologer_id} className="hover:bg-surface-subtle/30">
                          <td className="py-3.5 pl-6 pr-4 font-semibold text-foreground">
                            <div className="flex items-center gap-2.5">
                              <Avatar name={a.astrologer_name || "Astrologer"} size="sm" />
                              <span>{a.astrologer_name || "Unknown Astrologer"}</span>
                            </div>
                          </td>
                          <td className="py-3.5 pl-4 pr-4 font-mono text-muted-foreground">
                            {a.astrologer_id}
                          </td>
                          <td className="py-3.5 pl-4 pr-4 text-center">
                            <Badge tone="blue">{a.report_count} flag{a.report_count > 1 ? "s" : ""}</Badge>
                          </td>
                          <td className="py-3.5 pl-4 pr-6 text-right">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                setSearch(a.astrologer_name || a.astrologer_id);
                                setActiveTab("reports");
                              }}
                              className="h-7 text-xs"
                            >
                              Audit Astrologer&apos;s Reports
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      )}

      {/* INVESTIGATION & REVIEW MODAL */}
      <Modal
        open={Boolean(selected)}
        onClose={() => {
          setSelected(null);
          setDetail(null);
        }}
        title={`Incident Investigation: #${selected?.id.slice(-6).toUpperCase()}`}
        description="Review session misconduct report, file evidence notes, and adjust resolution status."
        size="lg"
        footer={
          <div className="flex w-full items-center justify-between gap-3">
            <div>
              {detail && detail.action_taken === "blacklisted" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (selected && detail) {
                      setUnblockTarget({
                        reportId: selected.id,
                        clientUserId: selected.client_user_id,
                        clientName: selected.client_name ?? "Client",
                        astrologerName: selected.astrologer_name ?? "Astrologer",
                      });
                    }
                  }}
                  className="text-success hover:bg-success-surface text-xs"
                >
                  <UserCheck className="mr-1.5 size-3.5" />
                  Unblock Client from Blacklist
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setSelected(null);
                  setDetail(null);
                }}
                disabled={reviewMutation.isPending}
              >
                Close
              </Button>
              <Button
                onClick={() => reviewMutation.mutate()}
                loading={reviewMutation.isPending}
              >
                Update Decision: {reviewStatus.toUpperCase()}
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4 py-2 text-xs">
          {isDetailLoading ? (
            <LoadingBlock label="Loading full incident dossier…" />
          ) : detail ? (
            <>
              {/* Context Breakdown */}
              <div className="grid grid-cols-1 gap-3 rounded-xl border border-border bg-surface-subtle/30 p-3.5 sm:grid-cols-2">
                <div>
                  <span className="text-[11px] font-medium text-muted-foreground">Reporting Astrologer:</span>
                  <p className="font-semibold text-foreground">{detail.astrologer_name || "Unknown"}</p>
                  <span className="font-mono text-[10px] text-muted-foreground">{detail.astrologer_email || `ID: ${detail.astrologer_id}`}</span>
                </div>

                <div>
                  <span className="text-[11px] font-medium text-muted-foreground">Reported Client:</span>
                  <p className="font-semibold text-foreground">{detail.client_name || "Unknown"}</p>
                  <span className="font-mono text-[10px] text-muted-foreground">{detail.client_email_masked || `UID: ${detail.client_user_id}`}</span>
                </div>

                <div>
                  <span className="text-[11px] font-medium text-muted-foreground">Incident Timestamp:</span>
                  <p className="font-semibold text-foreground">{formatDateTime(detail.created_at)}</p>
                </div>

                <div>
                  <span className="text-[11px] font-medium text-muted-foreground">Blacklist Action:</span>
                  <div className="mt-0.5">
                    {detail.action_taken === "blacklisted" ? (
                      <Badge tone="red">Client Placed on Astrologer Blacklist</Badge>
                    ) : (
                      <Badge tone="gold">Flagged Only (Booking Permitted)</Badge>
                    )}
                  </div>
                </div>

                {detail.call_id && (
                  <div>
                    <span className="text-[11px] font-medium text-muted-foreground">Call Session Ref:</span>
                    <p className="font-mono font-semibold text-foreground">#{detail.call_id}</p>
                  </div>
                )}

                {detail.appointment_id && (
                  <div>
                    <span className="text-[11px] font-medium text-muted-foreground">Appointment Ref:</span>
                    <p className="font-mono font-semibold text-foreground">#{detail.appointment_id}</p>
                  </div>
                )}
              </div>

              {/* Astrologer's Complaint */}
              <div className="rounded-xl border border-border p-3.5 space-y-1.5">
                <span className="font-semibold text-foreground">Astrologer&apos;s Complaint Reason:</span>
                <p className="text-foreground leading-relaxed bg-surface-subtle/40 p-2.5 rounded-lg border border-border">
                  {detail.reason}
                </p>
                {detail.notes && (
                  <>
                    <span className="font-semibold text-foreground text-[11px] block pt-1">Additional Session Notes:</span>
                    <p className="text-muted-foreground text-[11px] italic bg-surface-subtle/20 p-2.5 rounded-lg">
                      {detail.notes}
                    </p>
                  </>
                )}
              </div>

              {/* Status Picker */}
              <div className="space-y-1.5">
                <label className="block font-semibold text-foreground">Investigation Decision / Resolution:</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: "reviewed", label: "Under Review (তদন্তাধীন)", tone: "blue" },
                    { id: "resolved", label: "Resolved / Misconduct Confirmed (নিষ্পত্তিকৃত)", tone: "green" },
                    { id: "dismissed", label: "Dismissed / False Flag (খারিজ)", tone: "neutral" },
                  ].map((s) => (
                    <Button
                      key={s.id}
                      type="button"
                      variant={reviewStatus === s.id ? "primary" : "secondary"}
                      size="sm"
                      onClick={() => setReviewStatus(s.id as any)}
                      className="text-xs"
                    >
                      {s.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Admin Notes */}
              <Field label="Admin Trust & Safety Investigation Findings:">
                <Textarea
                  rows={3}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Record your investigation rationale, verification call outcome, or decision details…"
                  className="text-xs"
                />
              </Field>

              {detail.reviewed_at && (
                <div className="text-[10px] text-muted-foreground text-right">
                  Last investigated: {formatDateTime(detail.reviewed_at)}
                </div>
              )}
            </>
          ) : (
            <p className="text-muted-foreground">Unable to load incident details.</p>
          )}
        </div>
      </Modal>

      {/* UNBLOCK CONFIRM MODAL */}
      <ConfirmModal
        open={Boolean(unblockTarget)}
        onClose={() => setUnblockTarget(null)}
        onConfirm={() => unblockMutation.mutate()}
        title="Unblock Client from Astrologer Blacklist"
        description={
          unblockTarget
            ? `Are you sure you want to remove ${unblockTarget.clientName} from ${unblockTarget.astrologerName}'s personal blacklist? The client will be permitted to book consultations with this astrologer again.`
            : undefined
        }
        confirmLabel="Unblock Client"
        tone="primary"
        loading={unblockMutation.isPending}
      />
    </>
  );
}
