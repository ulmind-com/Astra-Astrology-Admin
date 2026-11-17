"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  Award,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  Download,
  ExternalLink,
  Eye,
  GraduationCap,
  Layers,
  Percent,
  PlayCircle,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  Video,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { PanelHeader } from "@/components/layout/panel-shell";
import {
  Badge,
  Button,
  Card,
  CardBody,
  ConfirmModal,
  EmptyState,
  Field,
  Input,
  LoadingBlock,
  Modal,
  Pagination,
  Select,
} from "@/components/ui";
import { courseAdminApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import type {
  AdminCourseEnrollment,
  AdminCourseLearnerDetail,
  AdminCourseLearnersResponse,
  PageMeta,
} from "@/types";

function formatDateTime(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds <= 0) return "0 mins";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

function buildPageMeta(total: number, page: number, limit: number, pages: number): PageMeta {
  const safePages = Math.max(1, pages);
  return {
    total,
    page,
    limit,
    total_pages: safePages,
    has_prev: page > 1,
    has_next: page < safePages,
  };
}

export default function CourseLearnersPage() {
  const params = useParams();
  const courseId = params.id as string;
  const queryClient = useQueryClient();

  const [searchInput, setSearchInput] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [sortBy, setSortBy] = React.useState("enrolled_desc");
  const [page, setPage] = React.useState(1);
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);

  // Detailed Progress Drawer State
  const [selectedLearnerUserId, setSelectedLearnerUserId] = React.useState<string | null>(null);

  // Manual Grant Modal State
  const [grantOpen, setGrantOpen] = React.useState(false);
  const [grantEmail, setGrantEmail] = React.useState("");
  const [grantUserId, setGrantUserId] = React.useState("");
  const [grantPaymentId, setGrantPaymentId] = React.useState("");
  const [grantAmountPaid, setGrantAmountPaid] = React.useState("");
  const [grantAccessDays, setGrantAccessDays] = React.useState("");
  const [grantNote, setGrantNote] = React.useState("");

  // Revoke Modal State
  const [revokeTarget, setRevokeTarget] = React.useState<AdminCourseEnrollment | null>(null);

  React.useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Fetch Course Learners & Analytics
  const {
    data: learnersResponse,
    isLoading,
    isFetching,
    refetch,
  } = useQuery<AdminCourseLearnersResponse>({
    queryKey: ["admin-course-learners", courseId, debouncedSearch, statusFilter, sortBy, page],
    queryFn: () =>
      courseAdminApi.getCourseLearners(courseId, {
        search: debouncedSearch || undefined,
        progress_status: statusFilter,
        sort_by: sortBy,
        page,
        limit: 25,
      }),
    enabled: Boolean(courseId),
  });

  // Fetch Detailed Learner Progress
  const {
    data: learnerDetail,
    isLoading: isLearnerDetailLoading,
  } = useQuery<AdminCourseLearnerDetail>({
    queryKey: ["admin-learner-progress", courseId, selectedLearnerUserId],
    queryFn: () => courseAdminApi.getLearnerProgress(courseId, selectedLearnerUserId!),
    enabled: Boolean(courseId && selectedLearnerUserId),
  });

  // Grant Enrollment Mutation
  const grantMutation = useMutation({
    mutationFn: async () => {
      if (!grantEmail.trim() && !grantUserId.trim()) {
        throw new Error("Enter the student's email or user ID.");
      }
      const parsedAmount = grantAmountPaid.trim() ? Number(grantAmountPaid) : 0;
      if (Number.isNaN(parsedAmount) || parsedAmount < 0) {
        throw new Error("Amount paid must be 0 or greater.");
      }
      const parsedDays = grantAccessDays.trim() ? Number(grantAccessDays) : undefined;
      return courseAdminApi.grantEnrollment(courseId, {
        email: grantEmail.trim() || undefined,
        user_id: grantUserId.trim() || undefined,
        payment_id: grantPaymentId.trim() || undefined,
        amount_paid: parsedAmount,
        access_duration_days: parsedDays,
        note: grantNote.trim() || undefined,
      });
    },
    onSuccess: (res) => {
      toast.success(
        `Successfully enrolled ${res.student_name || res.student_email || "Student"}!`
      );
      setGrantOpen(false);
      setGrantEmail("");
      setGrantUserId("");
      setGrantPaymentId("");
      setGrantAmountPaid("");
      setGrantAccessDays("");
      setGrantNote("");
      void queryClient.invalidateQueries({ queryKey: ["admin-course-learners", courseId] });
      void queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to grant enrollment");
    },
  });

  // Revoke Enrollment Mutation
  const revokeMutation = useMutation({
    mutationFn: async (enrollmentId: string) => {
      return courseAdminApi.revokeEnrollment(courseId, enrollmentId);
    },
    onSuccess: () => {
      toast.success("Enrollment access revoked successfully.");
      setRevokeTarget(null);
      void queryClient.invalidateQueries({ queryKey: ["admin-course-learners", courseId] });
      void queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      if (selectedLearnerUserId === revokeTarget?.user_id) {
        setSelectedLearnerUserId(null);
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to revoke enrollment");
    },
  });

  const handleCopy = (text: string, key: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleExportCSV = () => {
    if (!learnersResponse?.items || learnersResponse.items.length === 0) {
      toast.info("No learner data to export.");
      return;
    }

    const headers = [
      "Student Name",
      "Email",
      "Phone",
      "Progress %",
      "Completed Lessons",
      "Total Lessons",
      "Certified",
      "Certificate ID",
      "Amount Paid (INR)",
      "Payment ID",
      "Order ID",
      "Enrolled Date",
      "Last Active",
    ];

    const rows = learnersResponse.items.map((i) => [
      `"${(i.student_name || "Unknown").replace(/"/g, '""')}"`,
      `"${(i.student_email || "").replace(/"/g, '""')}"`,
      `"${(i.student_phone || "").replace(/"/g, '""')}"`,
      `${Math.round(i.progress_percent)}%`,
      i.completed_lessons_count ?? 0,
      i.total_lessons_count ?? 0,
      i.certificate_issued ? "Yes" : "No",
      `"${(i.certificate_id || "").replace(/"/g, '""')}"`,
      i.amount_paid ?? 0,
      `"${(i.payment_id || "").replace(/"/g, '""')}"`,
      `"${(i.order_id || "").replace(/"/g, '""')}"`,
      `"${formatDateTime(i.enrolled_at)}"`,
      `"${formatDateTime(i.last_accessed_at)}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Learners_${learnersResponse.course_slug || courseId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Learners CSV downloaded successfully!");
  };

  const stats = learnersResponse?.stats || {
    total_enrolled: 0,
    completed_count: 0,
    in_progress_count: 0,
    not_started_count: 0,
    average_progress_percent: 0,
    total_revenue: 0,
    total_lessons_in_course: 0,
  };

  const learners = learnersResponse?.items || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Header & Breadcrumb */}
      <PanelHeader
        title={learnersResponse ? `${learnersResponse.course_title} — Learners` : "Course Learners"}
        description="Comprehensive student enrollment ledger, real-time curriculum completion rates, and lesson progress."
        action={
          <div className="flex items-center gap-2 flex-wrap">
            <Link href="/courses">
              <Button variant="outline" size="sm" className="gap-1.5">
                <ArrowLeft className="h-4 w-4" />
                All Courses
              </Button>
            </Link>

            <Link href={`/courses/${courseId}/curriculum`}>
              <Button variant="outline" size="sm" className="gap-1.5 text-amber-600 border-amber-500/30 hover:bg-amber-500/10">
                <Layers className="h-4 w-4" />
                Curriculum
              </Button>
            </Link>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={learners.length === 0}
              className="gap-1.5 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="gap-1.5"
            >
              <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
              Refresh
            </Button>

            <Button
              size="sm"
              onClick={() => setGrantOpen(true)}
              className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
            >
              <UserPlus className="h-4 w-4" />
              Enroll Student
            </Button>
          </div>
        }
      />

      {/* 6 Key Performance Analytics Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <Card className="border-border/80">
          <CardBody className="p-3.5">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">Total Enrolled</span>
              <Users className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-2xl font-black text-foreground">{stats.total_enrolled}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Students registered</div>
          </CardBody>
        </Card>

        <Card className="border-border/80">
          <CardBody className="p-3.5">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">Certified (100%)</span>
              <GraduationCap className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-black text-emerald-600">{stats.completed_count}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Completed full course</div>
          </CardBody>
        </Card>

        <Card className="border-border/80">
          <CardBody className="p-3.5">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">In Progress</span>
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-2xl font-black text-amber-600">{stats.in_progress_count}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Active learners</div>
          </CardBody>
        </Card>

        <Card className="border-border/80">
          <CardBody className="p-3.5">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">Not Started</span>
              <AlertCircle className="h-4 w-4 text-slate-400" />
            </div>
            <div className="text-2xl font-black text-foreground">{stats.not_started_count}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">0% progress</div>
          </CardBody>
        </Card>

        <Card className="border-border/80">
          <CardBody className="p-3.5">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">Avg. Completion</span>
              <Percent className="h-4 w-4 text-purple-500" />
            </div>
            <div className="text-2xl font-black text-purple-600">{stats.average_progress_percent}%</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Classroom average</div>
          </CardBody>
        </Card>

        <Card className="border-border/80">
          <CardBody className="p-3.5">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">Total Revenue</span>
              <CreditCard className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-black text-foreground">
              ₹{stats.total_revenue.toLocaleString("en-IN")}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Collected fees</div>
          </CardBody>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <CardBody className="p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by student name, email, phone, order..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap">
            {/* Filter by Progress Status */}
            <div className="flex items-center rounded-lg border border-border p-0.5 bg-muted/40 text-xs font-semibold">
              {[
                { key: "all", label: "All" },
                { key: "completed", label: "100% Completed" },
                { key: "in_progress", label: "In Progress" },
                { key: "not_started", label: "Not Started" },
                { key: "expired", label: "Expired" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setStatusFilter(tab.key);
                    setPage(1);
                  }}
                  className={cn(
                    "px-2.5 py-1 rounded-md transition-all",
                    statusFilter === tab.key
                      ? "bg-background text-foreground shadow-sm font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Sort Dropdown */}
            <Select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
              className="w-44 text-xs"
            >
              <option value="enrolled_desc">Enrolled: Newest First</option>
              <option value="enrolled_asc">Enrolled: Oldest First</option>
              <option value="progress_desc">Progress: Highest First</option>
              <option value="progress_asc">Progress: Lowest First</option>
              <option value="last_active_desc">Last Active: Recent First</option>
            </Select>
          </div>
        </CardBody>
      </Card>

      {/* Learners Data Table */}
      <Card>
        <CardBody className="p-0 overflow-hidden">
          {isLoading ? (
            <div className="p-10">
              <LoadingBlock label="Loading enrolled learners & progress..." />
            </div>
          ) : learners.length === 0 ? (
            <div className="p-10">
              <EmptyState
                icon={Users}
                title="No learners match this criteria"
                description={
                  debouncedSearch || statusFilter !== "all"
                    ? "Try resetting your search query or progress filter."
                    : "No students have enrolled in this course yet. You can manually enroll students anytime."
                }
                action={
                  <Button
                    size="sm"
                    onClick={() => setGrantOpen(true)}
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    <UserPlus className="h-4 w-4 mr-1.5" />
                    Enroll First Student
                  </Button>
                }
              />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground font-bold">
                    <tr>
                      <th className="py-3.5 px-4">Student</th>
                      <th className="py-3.5 px-4">Enrollment & Access</th>
                      <th className="py-3.5 px-4">Fee & Order</th>
                      <th className="py-3.5 px-4 min-w-[200px]">Curriculum Progress</th>
                      <th className="py-3.5 px-4">Certificate</th>
                      <th className="py-3.5 px-4">Last Active</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {learners.map((learner) => {
                      const pct = Math.round(learner.progress_percent || 0);
                      const isComplete = pct >= 100 || learner.certificate_issued;
                      const completedCount = learner.completed_lessons_count ?? 0;
                      const totalCount = learner.total_lessons_count || stats.total_lessons_in_course;

                      return (
                        <tr key={learner.id} className="hover:bg-muted/20 transition-colors">
                          {/* Student Profile */}
                          <td className="py-3.5 px-4 align-top">
                            <div className="flex items-start gap-2.5">
                              <div className="h-8 w-8 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold flex items-center justify-center shrink-0 border border-amber-500/20 text-xs">
                                {(learner.student_name || learner.student_email || "S")[0].toUpperCase()}
                              </div>
                              <div>
                                <button
                                  type="button"
                                  onClick={() => setSelectedLearnerUserId(learner.user_id)}
                                  className="font-bold text-foreground hover:text-amber-600 text-left transition-colors cursor-pointer"
                                >
                                  {learner.student_name || "DivinLink Scholar"}
                                </button>
                                <div className="text-[11px] text-muted-foreground">
                                  {learner.student_email || learner.user_id}
                                </div>
                                {learner.student_phone && (
                                  <div className="text-[10px] text-muted-foreground/80 font-mono mt-0.5">
                                    {learner.student_phone}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Access Details */}
                          <td className="py-3.5 px-4 align-top whitespace-nowrap">
                            <div className="font-medium text-foreground">
                              {formatDateTime(learner.enrolled_at)}
                            </div>
                            {learner.expires_at ? (
                              learner.is_expired ? (
                                <Badge tone="red" className="mt-1 text-[10px]">
                                  Expired
                                </Badge>
                              ) : (
                                <div className="text-[10px] text-amber-600 font-medium mt-0.5">
                                  Valid till: {formatDateTime(learner.expires_at)}
                                </div>
                              )
                            ) : (
                              <Badge tone="neutral" className="mt-1 text-[10px]">
                                Lifetime Access
                              </Badge>
                            )}
                          </td>

                          {/* Fee & Payment Ref */}
                          <td className="py-3.5 px-4 align-top whitespace-nowrap">
                            <div className="font-bold text-foreground">
                              {learner.amount_paid > 0
                                ? `${learner.currency} ${learner.amount_paid.toLocaleString("en-IN")}`
                                : "Free / Scholarship"}
                            </div>
                            {learner.payment_id ? (
                              <div className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground mt-0.5">
                                <span>{learner.payment_id.slice(-10)}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(learner.payment_id || "", `pay-${learner.id}`)}
                                  className="hover:text-foreground cursor-pointer"
                                  title="Copy Payment ID"
                                >
                                  {copiedKey === `pay-${learner.id}` ? (
                                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </button>
                              </div>
                            ) : learner.order_id ? (
                              <span className="font-mono text-[10px] text-muted-foreground/80">
                                {learner.order_id.slice(-10)}
                              </span>
                            ) : null}
                          </td>

                          {/* Visual Progress Bar */}
                          <td className="py-3.5 px-4 align-top">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span
                                className={cn(
                                  "font-bold",
                                  isComplete
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : pct > 0
                                    ? "text-amber-600 dark:text-amber-400"
                                    : "text-muted-foreground"
                                )}
                              >
                                {pct}% Complete
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {completedCount} / {totalCount} lessons
                              </span>
                            </div>

                            {/* Animated Visual Bar */}
                            <div className="h-2 w-full rounded-full bg-muted overflow-hidden border border-border/50">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all duration-500",
                                  isComplete
                                    ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                                    : pct > 0
                                    ? "bg-gradient-to-r from-amber-500 to-orange-500"
                                    : "bg-slate-300 dark:bg-slate-700"
                                )}
                                style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                              />
                            </div>
                          </td>

                          {/* Certificate Status */}
                          <td className="py-3.5 px-4 align-top whitespace-nowrap">
                            {learner.certificate_issued ? (
                              <div>
                                <Badge tone="green" className="gap-1 font-bold">
                                  <Award className="h-3 w-3 text-emerald-500" />
                                  Certified
                                </Badge>
                                {learner.certificate_url && (
                                  <a
                                    href={learner.certificate_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-1 text-[10px] text-amber-600 hover:text-amber-700 hover:underline mt-1 font-medium"
                                  >
                                    <span>View Degree</span>
                                    <ExternalLink className="h-2.5 w-2.5" />
                                  </a>
                                )}
                              </div>
                            ) : isComplete ? (
                              <Badge tone="gold" className="text-[10px]">
                                Ready to Issue
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-[11px]">—</span>
                            )}
                          </td>

                          {/* Last Active */}
                          <td className="py-3.5 px-4 align-top whitespace-nowrap text-[11px] text-muted-foreground">
                            {formatDateTime(learner.last_accessed_at)}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 align-top text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedLearnerUserId(learner.user_id)}
                                className="h-7 px-2.5 text-[11px] gap-1 hover:border-amber-500/50 hover:text-amber-600"
                                title="View Lesson-by-Lesson Progress"
                              >
                                <Eye className="h-3 w-3 text-amber-500" />
                                Progress
                              </Button>

                              <Button
                                size="sm"
                                variant="danger"
                                onClick={() => setRevokeTarget(learner)}
                                className="h-7 w-7 p-0"
                                title="Revoke Enrollment"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {learnersResponse && (
                <div className="p-4 border-t border-border">
                  <Pagination
                    meta={buildPageMeta(
                      learnersResponse.total,
                      learnersResponse.page,
                      learnersResponse.limit,
                      learnersResponse.pages
                    )}
                    onPage={setPage}
                  />
                </div>
              )}
            </>
          )}
        </CardBody>
      </Card>

      {/* ========================================================================= */}
      {/* DETAILED STUDENT LESSON-BY-LESSON PROGRESS MODAL / DRAWER */}
      {/* ========================================================================= */}
      <Modal
        open={Boolean(selectedLearnerUserId)}
        onClose={() => setSelectedLearnerUserId(null)}
        title="Student Curriculum Progress & Watch Analytics"
        size="lg"
      >
        <div className="space-y-6">
          {isLearnerDetailLoading || !learnerDetail ? (
            <div className="py-12">
              <LoadingBlock label="Fetching student watch history & lesson milestones..." />
            </div>
          ) : (
            <>
              {/* Student Header Card */}
              <div className="p-4 rounded-xl bg-muted/40 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 flex items-center justify-center font-bold text-lg">
                    {(learnerDetail.student_name || learnerDetail.student_email || "S")[0].toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-bold text-base text-foreground">
                      {learnerDetail.student_name || "DivinLink Scholar"}
                    </h4>
                    <p className="text-xs text-muted-foreground">{learnerDetail.student_email || "No email"}</p>
                    {learnerDetail.student_phone && (
                      <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                        📱 {learnerDetail.student_phone}
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-right sm:border-l sm:border-border sm:pl-4">
                  <div className="text-xs text-muted-foreground">Enrolled Date</div>
                  <div className="font-semibold text-xs text-foreground mt-0.5">
                    {formatDateTime(learnerDetail.enrolled_at)}
                  </div>
                  <div className="mt-1">
                    {learnerDetail.is_expired ? (
                      <Badge tone="red" className="text-[10px]">
                        Access Expired
                      </Badge>
                    ) : (
                      <Badge tone="green" className="text-[10px]">
                        Active Student
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Progress Summary Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg bg-card border border-border text-center">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground">Progress</div>
                  <div className="text-xl font-black text-amber-600 mt-0.5">
                    {Math.round(learnerDetail.progress_percent)}%
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-card border border-border text-center">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground">Completed</div>
                  <div className="text-xl font-black text-foreground mt-0.5">
                    {learnerDetail.completed_lessons_count} / {learnerDetail.total_lessons_count}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-card border border-border text-center">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground">Total Watched</div>
                  <div className="text-xl font-black text-foreground mt-0.5">
                    {formatDuration(learnerDetail.total_watched_seconds)}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-card border border-border text-center">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground">Certificate</div>
                  <div className="text-xs font-bold text-emerald-600 mt-1 flex items-center justify-center gap-1">
                    {learnerDetail.certificate_issued ? (
                      <Badge tone="green" className="text-[10px]">
                        Issued
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs font-normal">Pending</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Certificate Banner if Issued */}
              {learnerDetail.certificate_issued && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Award className="h-6 w-6 text-emerald-500 shrink-0" />
                    <div>
                      <div className="font-bold text-emerald-900 dark:text-emerald-300 text-xs">
                        Official Gurukul Consecrated Certificate Earned
                      </div>
                      <div className="text-[10px] text-emerald-700/80 dark:text-emerald-400 font-mono mt-0.5">
                        Certificate ID: {learnerDetail.certificate_id || "VERIFIED"}
                      </div>
                    </div>
                  </div>
                  {learnerDetail.certificate_url && (
                    <a
                      href={learnerDetail.certificate_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                    >
                      <span>View Credential</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              )}

              {/* Curriculum Breakdown: Modules & Lessons */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-amber-500" />
                    Curriculum Lesson Milestones
                  </h4>
                  <span className="text-xs text-muted-foreground">
                    {learnerDetail.sections.reduce((acc, s) => acc + s.lessons.length, 0)} Total Lectures
                  </span>
                </div>

                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                  {learnerDetail.sections.map((section, sIdx) => (
                    <div key={section.section_id} className="border border-border rounded-xl overflow-hidden bg-card">
                      <div className="p-3 bg-muted/40 border-b border-border flex items-center justify-between">
                        <span className="font-bold text-xs text-foreground">
                          Module {sIdx + 1}: {section.title}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {section.lessons.filter((l) => l.is_completed).length} / {section.lessons.length} done
                        </span>
                      </div>

                      <div className="divide-y divide-border/60">
                        {section.lessons.length === 0 ? (
                          <div className="p-3 text-xs text-muted-foreground italic">
                            No lessons published in this section yet.
                          </div>
                        ) : (
                          section.lessons.map((lesson, lIdx) => (
                            <div
                              key={lesson.lesson_id}
                              className={cn(
                                "p-3 flex items-center justify-between gap-3 text-xs transition-colors",
                                lesson.is_completed
                                  ? "bg-emerald-500/5 hover:bg-emerald-500/10"
                                  : lesson.watched_seconds > 0
                                  ? "bg-amber-500/5 hover:bg-amber-500/10"
                                  : "hover:bg-muted/20"
                              )}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                {lesson.is_completed ? (
                                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                                ) : lesson.watched_seconds > 0 ? (
                                  <PlayCircle className="h-4 w-4 text-amber-500 shrink-0" />
                                ) : (
                                  <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                                )}

                                <div className="min-w-0">
                                  <p className="font-semibold text-foreground truncate">
                                    {lIdx + 1}. {lesson.title}
                                  </p>
                                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                                    <span>⏱️ {lesson.duration_minutes || "—"} min lecture</span>
                                    {lesson.watched_seconds > 0 && (
                                      <span>• Watched {formatDuration(lesson.watched_seconds)}</span>
                                    )}
                                    {lesson.completed_at && (
                                      <span className="text-emerald-600 font-medium">
                                        • Completed {formatDateTime(lesson.completed_at)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="shrink-0 text-right">
                                {lesson.is_completed ? (
                                  <Badge tone="green" className="text-[10px] font-bold">
                                    Finished
                                  </Badge>
                                ) : lesson.watched_seconds > 0 ? (
                                  <Badge tone="gold" className="text-[10px]">
                                    In Progress
                                  </Badge>
                                ) : (
                                  <span className="text-[10px] text-muted-foreground">Unwatched</span>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end pt-2 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setSelectedLearnerUserId(null)}>
              Close Progress
            </Button>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* MANUAL ENROLL STUDENT MODAL */}
      {/* ========================================================================= */}
      <Modal
        open={grantOpen}
        onClose={() => setGrantOpen(false)}
        title="Manually Enroll Student"
      >
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Grant instant masterclass access to a student. You can look up by their registered email or user ID.
          </p>

          <Field label="Student Email Address *">
            <Input
              type="email"
              placeholder="student@example.com"
              value={grantEmail}
              onChange={(e) => setGrantEmail(e.target.value)}
            />
          </Field>

          <Field label="Or User ID (Optional)">
            <Input
              placeholder="e.g. 6af9d3..."
              value={grantUserId}
              onChange={(e) => setGrantUserId(e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Fee Amount Paid (₹)">
              <Input
                type="number"
                placeholder="0 for Scholarship"
                value={grantAmountPaid}
                onChange={(e) => setGrantAmountPaid(e.target.value)}
              />
            </Field>

            <Field label="Access Days (Blank = Lifetime)">
              <Input
                type="number"
                placeholder="e.g. 365"
                value={grantAccessDays}
                onChange={(e) => setGrantAccessDays(e.target.value)}
              />
            </Field>
          </div>

          <Field label="Payment ID / Transaction Ref (Optional)">
            <Input
              placeholder="e.g. UPI / Cash / Razorpay ID"
              value={grantPaymentId}
              onChange={(e) => setGrantPaymentId(e.target.value)}
            />
          </Field>

          <Field label="Admin Internal Note (Optional)">
            <Input
              placeholder="Reason for manual enrollment..."
              value={grantNote}
              onChange={(e) => setGrantNote(e.target.value)}
            />
          </Field>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setGrantOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => grantMutation.mutate()}
              disabled={grantMutation.isPending}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {grantMutation.isPending ? "Enrolling..." : "Grant Access"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* REVOKE ENROLLMENT CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      <ConfirmModal
        open={Boolean(revokeTarget)}
        onClose={() => setRevokeTarget(null)}
        onConfirm={() => {
          if (revokeTarget) revokeMutation.mutate(revokeTarget.id);
        }}
        title="Revoke Student Enrollment?"
        description={`Are you sure you want to revoke course access for "${revokeTarget?.student_name || revokeTarget?.student_email || "this student"}"? They will immediately lose access to the curriculum, videos, and study notes.`}
        confirmLabel="Yes, Revoke Access"
        tone="danger"
        loading={revokeMutation.isPending}
      />
    </div>
  );
}
