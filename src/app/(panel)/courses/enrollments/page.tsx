"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  Eye,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
  AdminCourseOrder,
  CourseAdminItem,
  PageMeta,
} from "@/types";

type TabMode = "orders" | "enrollments";

const ORDER_STATUS_META: Record<
  string,
  { label: string; className: string; dotClass: string }
> = {
  paid: {
    label: "Paid & Enrolled",
    className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
    dotClass: "bg-emerald-500",
  },
  created: {
    label: "Pending / Unverified",
    className: "bg-amber-500/10 text-amber-600 border-amber-500/30",
    dotClass: "bg-amber-500 animate-pulse",
  },
  failed: {
    label: "Failed",
    className: "bg-rose-500/10 text-rose-600 border-rose-500/30",
    dotClass: "bg-rose-500",
  },
  refunded: {
    label: "Refunded / Revoked",
    className: "bg-slate-500/10 text-slate-500 border-slate-500/30",
    dotClass: "bg-slate-400",
  },
};

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

export default function CourseEnrollmentsAdminPage() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const initialCourseId = searchParams.get("course_id") || "";
  const initialTab = (searchParams.get("tab") as TabMode) || "orders";

  const [tab, setTab] = React.useState<TabMode>(initialTab);
  const [courseFilter, setCourseFilter] = React.useState(initialCourseId);
  const [orderStatusFilter, setOrderStatusFilter] = React.useState<string>("");
  const [searchInput, setSearchInput] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [ordersPage, setOrdersPage] = React.useState(1);
  const [enrollmentsPage, setEnrollmentsPage] = React.useState(1);
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);
  const [reconcilingId, setReconcilingId] = React.useState<string | null>(null);

  // Manual Grant Modal State
  const [grantOpen, setGrantOpen] = React.useState(false);
  const [grantCourseId, setGrantCourseId] = React.useState("");
  const [grantEmail, setGrantEmail] = React.useState("");
  const [grantUserId, setGrantUserId] = React.useState("");
  const [grantPaymentId, setGrantPaymentId] = React.useState("");
  const [grantAmountPaid, setGrantAmountPaid] = React.useState("");
  const [grantAccessDays, setGrantAccessDays] = React.useState("");
  const [grantNote, setGrantNote] = React.useState("");

  // Revoke Confirmation State
  const [revokeTarget, setRevokeTarget] = React.useState<AdminCourseEnrollment | null>(null);

  React.useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setOrdersPage(1);
      setEnrollmentsPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // 1. Courses list for filter & manual enroll dropdown
  const { data: courses = [] } = useQuery({
    queryKey: ["admin-courses-dropdown"],
    queryFn: async () => {
      const res = await courseAdminApi.listCourses({ limit: 100 });
      return res as CourseAdminItem[];
    },
  });

  // 2. Course Payment Orders Query
  const {
    data: ordersData,
    isLoading: isOrdersLoading,
    isFetching: isOrdersFetching,
    refetch: refetchOrders,
  } = useQuery({
    queryKey: [
      "admin-course-orders",
      orderStatusFilter,
      courseFilter,
      debouncedSearch,
      ordersPage,
    ],
    queryFn: () =>
      courseAdminApi.listOrders({
        status: orderStatusFilter || undefined,
        course_id: courseFilter || undefined,
        search: debouncedSearch || undefined,
        page: ordersPage,
        limit: 25,
      }),
    placeholderData: (prev) => prev,
  });

  // 3. Course Enrollments Query
  const {
    data: enrollmentsData,
    isLoading: isEnrollmentsLoading,
    isFetching: isEnrollmentsFetching,
    refetch: refetchEnrollments,
  } = useQuery({
    queryKey: [
      "admin-course-enrollments",
      courseFilter,
      debouncedSearch,
      enrollmentsPage,
    ],
    queryFn: () =>
      courseAdminApi.listEnrollments({
        course_id: courseFilter || undefined,
        search: debouncedSearch || undefined,
        page: enrollmentsPage,
        limit: 25,
      }),
    placeholderData: (prev) => prev,
  });

  // Reconcile Order with Razorpay
  const reconcileMutation = useMutation({
    mutationFn: async (orderId: string) => {
      setReconcilingId(orderId);
      return courseAdminApi.reconcileOrder(orderId);
    },
    onSuccess: (updatedOrder: AdminCourseOrder) => {
      void queryClient.invalidateQueries({ queryKey: ["admin-course-orders"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-course-enrollments"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      if (updatedOrder.status === "paid") {
        toast.success(
          `Verified with Razorpay! Payment settled & student enrolled (${updatedOrder.razorpay_payment_id || updatedOrder.razorpay_order_id}).`
        );
      } else {
        toast.info(
          `Razorpay status: ${updatedOrder.status.toUpperCase()}${updatedOrder.failure_reason ? ` — ${updatedOrder.failure_reason}` : ""}`
        );
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to check order with Razorpay");
    },
    onSettled: () => setReconcilingId(null),
  });

  // Manual Grant Enrollment
  const grantMutation = useMutation({
    mutationFn: async () => {
      if (!grantCourseId) throw new Error("Please select a course.");
      if (!grantEmail.trim() && !grantUserId.trim()) {
        throw new Error("Enter the student's email or user ID.");
      }
      const parsedAmount = grantAmountPaid.trim() ? Number(grantAmountPaid) : 0;
      if (Number.isNaN(parsedAmount) || parsedAmount < 0) {
        throw new Error("Amount paid must be 0 or greater.");
      }
      const parsedDays = grantAccessDays.trim() ? Number(grantAccessDays) : undefined;
      if (parsedDays !== undefined && (Number.isNaN(parsedDays) || parsedDays <= 0)) {
        throw new Error("Access validity days must be at least 1.");
      }
      return courseAdminApi.grantEnrollment(grantCourseId, {
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
        `Enrolled ${res.student_name || res.student_email || res.user_id} in "${res.course_title || "Course"}".`
      );
      setGrantOpen(false);
      setGrantEmail("");
      setGrantUserId("");
      setGrantPaymentId("");
      setGrantAmountPaid("");
      setGrantAccessDays("");
      setGrantNote("");
      void queryClient.invalidateQueries({ queryKey: ["admin-course-enrollments"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-course-orders"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to grant enrollment");
    },
  });

  // Revoke Enrollment
  const revokeMutation = useMutation({
    mutationFn: async (item: AdminCourseEnrollment) =>
      courseAdminApi.revokeEnrollment(item.course_id, item.id),
    onSuccess: () => {
      toast.success("Enrollment revoked.");
      setRevokeTarget(null);
      void queryClient.invalidateQueries({ queryKey: ["admin-course-enrollments"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to revoke enrollment");
    },
  });

  const handleCopy = (val: string, key: string) => {
    void navigator.clipboard.writeText(val);
    setCopiedKey(key);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const openGrantForOrder = (order: AdminCourseOrder) => {
    setGrantCourseId(order.course_id);
    setGrantEmail(order.student_email || "");
    setGrantUserId(order.user_id);
    setGrantPaymentId(order.razorpay_payment_id || "");
    setGrantAmountPaid(String(order.amount_inr || 0));
    setGrantAccessDays("");
    setGrantNote(`Recovered from Razorpay order ${order.razorpay_order_id}`);
    setGrantOpen(true);
  };

  const isRefreshing = tab === "orders" ? isOrdersFetching : isEnrollmentsFetching;
  const orders = ordersData?.items ?? [];
  const enrollments = enrollmentsData?.items ?? [];

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-2 -mb-3">
        <Link
          href="/courses"
          className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Gurukul Courses
        </Link>
      </div>

      <PanelHeader
        title="Course Orders & Enrollments"
        description="Reconcile Razorpay course orders, inspect stuck payments, and manually grant or revoke student access."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void refetchOrders();
                void refetchEnrollments();
              }}
              disabled={isRefreshing}
              className="gap-1.5"
            >
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (!grantCourseId && courses[0]?.id) {
                  setGrantCourseId(courses[0].id);
                }
                setGrantOpen(true);
              }}
              className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
            >
              <UserPlus className="h-4 w-4" />
              Grant Manual Access
            </Button>
          </div>
        }
      />

      {/* Top Summary Cards - Ultra Pro Luxury Glassmorphism */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative overflow-hidden rounded-3xl border border-amber-200/90 dark:border-amber-900/40 bg-gradient-to-br from-white via-white to-amber-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-amber-950/20 p-5 shadow-xs hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
                <span>Pending / Unverified</span>
              </div>
              <p className="text-3xl font-black text-slate-900 dark:text-white mt-2">
                {ordersData?.created_count ?? 0}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Awaiting gateway verification</p>
            </div>
            <div className="size-12 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
              <Clock className="size-6" />
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-emerald-200/90 dark:border-emerald-900/40 bg-gradient-to-br from-white via-white to-emerald-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/20 p-5 shadow-xs hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                <span className="size-2 rounded-full bg-emerald-500" />
                <span>Paid Orders</span>
              </div>
              <p className="text-3xl font-black text-slate-900 dark:text-white mt-2">
                {ordersData?.paid_count ?? 0}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Confirmed Razorpay transactions</p>
            </div>
            <div className="size-12 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
              <CheckCircle2 className="size-6" />
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-rose-200/90 dark:border-rose-900/40 bg-gradient-to-br from-white via-white to-rose-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-rose-950/20 p-5 shadow-xs hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                <span className="size-2 rounded-full bg-rose-500" />
                <span>Failed / Refunded</span>
              </div>
              <p className="text-3xl font-black text-slate-900 dark:text-white mt-2">
                {(ordersData?.failed_count ?? 0) + (ordersData?.refunded_count ?? 0)}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Rejected or refunded payments</p>
            </div>
            <div className="size-12 rounded-2xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
              <XCircle className="size-6" />
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-amber-300/90 dark:border-amber-700/50 bg-gradient-to-br from-amber-500/10 via-white to-orange-50/60 dark:from-amber-950/30 dark:via-slate-900 dark:to-slate-900 p-5 shadow-xs hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                <span className="size-2 rounded-full bg-amber-500" />
                <span>Active Enrollments</span>
              </div>
              <p className="text-3xl font-black text-slate-900 dark:text-white mt-2">
                {enrollmentsData?.total ?? 0}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Enrolled Gurukul students</p>
            </div>
            <div className="size-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
              <Users className="size-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Mode Switch & Filters */}
      <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-950/80 p-1.5 gap-1">
            <button
              type="button"
              onClick={() => setTab("orders")}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer",
                tab === "orders"
                  ? "bg-gradient-to-r from-amber-600 to-amber-500 text-white shadow-xs font-black scale-[1.01]"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <CreditCard className="size-4" />
              <span>Payment Orders ({ordersData?.total ?? 0})</span>
            </button>
            <button
              type="button"
              onClick={() => setTab("enrollments")}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer",
                tab === "enrollments"
                  ? "bg-gradient-to-r from-amber-600 to-amber-500 text-white shadow-xs font-black scale-[1.01]"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <ShieldCheck className="size-4" />
              <span>Enrolled Students ({enrollmentsData?.total ?? 0})</span>
            </button>
          </div>

          {tab === "orders" && (
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { key: "", label: "All" },
                {
                  key: "created",
                  label: `Pending (${ordersData?.created_count ?? 0})`,
                },
                { key: "paid", label: `Paid (${ordersData?.paid_count ?? 0})` },
                { key: "failed", label: `Failed (${ordersData?.failed_count ?? 0})` },
                {
                  key: "refunded",
                  label: `Refunded (${ordersData?.refunded_count ?? 0})`,
                },
              ].map((pill) => (
                <button
                  key={pill.key}
                  type="button"
                  onClick={() => {
                    setOrderStatusFilter(pill.key);
                    setOrdersPage(1);
                  }}
                  className={cn(
                    "rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer border",
                    orderStatusFilter === pill.key
                      ? "bg-amber-500/15 border-amber-500 text-amber-700 dark:text-amber-300 font-black shadow-2xs"
                      : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  )}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by student email, name, Razorpay order_id or pay_id..."
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 pl-10 pr-4 py-2.5 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-amber-500 focus:outline-hidden transition-colors"
            />
          </div>

          <select
            value={courseFilter}
            onChange={(e) => {
              setCourseFilter(e.target.value);
              setOrdersPage(1);
              setEnrollmentsPage(1);
            }}
            className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:border-amber-500 focus:outline-hidden transition-colors cursor-pointer"
          >
            <option value="">All Masterclasses</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Orders Tab Content - Ultra Pro Table */}
      {tab === "orders" && (
        <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
          {isOrdersLoading ? (
            <div className="p-12">
              <LoadingBlock label="Reconciling live course orders from Razorpay..." />
            </div>
          ) : orders.length === 0 ? (
            <div className="p-12 text-center">
              <EmptyState
                icon={CreditCard}
                title="No course orders found"
                description="Course Razorpay orders will appear here once students initiate checkout."
              />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/70 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <tr>
                      <th className="py-3.5 px-4 font-bold">Student</th>
                      <th className="py-3.5 px-4 font-bold">Course</th>
                      <th className="py-3.5 px-4 font-bold">Razorpay Order / Payment</th>
                      <th className="py-3.5 px-4 font-bold">Amount</th>
                      <th className="py-3.5 px-4 font-bold">Status</th>
                      <th className="py-3.5 px-4 font-bold">Created</th>
                      <th className="py-3.5 px-4 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {orders.map((order) => {
                      const meta = ORDER_STATUS_META[order.status] ?? {
                        label: order.status,
                        className: "bg-muted text-muted-foreground border-border",
                        dotClass: "bg-muted-foreground",
                      };
                      const canReconcile = order.status !== "refunded";
                      const studentInitials = (order.student_name || "Student")
                        .split(" ")
                        .map((s) => s[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase();

                      return (
                        <tr key={order.id} className="hover:bg-amber-50/40 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-4 align-top">
                            <div className="flex items-start gap-2.5">
                              <div className="size-8 rounded-full bg-gradient-to-br from-amber-500/15 to-orange-500/15 text-amber-700 dark:text-amber-300 font-black text-xs flex items-center justify-center shrink-0 border border-amber-300/40 dark:border-amber-700/40">
                                {studentInitials}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 dark:text-white">
                                  {order.student_name || "Unknown Student"}
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                                  {order.student_email || order.user_id}
                                </div>
                                {order.student_phone && (
                                  <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                                    {order.student_phone}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 align-top max-w-[220px]">
                            <div className="font-bold text-slate-900 dark:text-white line-clamp-2">
                              {order.course_title || order.course_id}
                            </div>
                            {order.method && (
                              <span className="inline-block mt-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                {order.method}
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 align-top font-mono text-[11px]">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-900 dark:text-white">
                                {order.razorpay_order_id}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  handleCopy(order.razorpay_order_id, `ord-${order.id}`)
                                }
                                className="text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer transition-colors"
                                title="Copy Razorpay Order ID"
                              >
                                {copiedKey === `ord-${order.id}` ? (
                                  <CheckCircle2 className="size-3.5 text-emerald-500" />
                                ) : (
                                  <Copy className="size-3.5" />
                                )}
                              </button>
                            </div>
                            {order.razorpay_payment_id && (
                              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 mt-1">
                                <span>{order.razorpay_payment_id}</span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleCopy(
                                      order.razorpay_payment_id || "",
                                      `pay-${order.id}`
                                    )
                                  }
                                  className="hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer transition-colors"
                                  title="Copy Payment ID"
                                >
                                  {copiedKey === `pay-${order.id}` ? (
                                    <CheckCircle2 className="size-3 text-emerald-500" />
                                  ) : (
                                    <Copy className="size-3" />
                                  )}
                                </button>
                              </div>
                            )}
                            {order.failure_reason && (
                              <p className="font-sans text-[10px] text-rose-500 mt-1 flex items-center gap-1">
                                <AlertTriangle className="size-3 shrink-0" />
                                {order.failure_reason}
                              </p>
                            )}
                          </td>

                          <td className="py-3.5 px-4 align-top whitespace-nowrap font-black text-slate-900 dark:text-white">
                            {order.currency} {order.amount_inr.toLocaleString("en-IN")}
                          </td>

                          <td className="py-3.5 px-4 align-top whitespace-nowrap">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold shadow-2xs",
                                meta.className
                              )}
                            >
                              <span className={cn("size-1.5 rounded-full", meta.dotClass)} />
                              {meta.label}
                            </span>
                            {order.verified_via && (
                              <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                                via {order.verified_via}
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4 align-top whitespace-nowrap text-slate-500 dark:text-slate-400">
                            <div className="font-medium">{formatDateTime(order.created_at)}</div>
                            {order.paid_at && (
                              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                                Paid: {formatDateTime(order.paid_at)}
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4 align-top text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {canReconcile && (
                                <button
                                  type="button"
                                  disabled={reconcilingId === order.id}
                                  onClick={() => reconcileMutation.mutate(order.id)}
                                  className={cn(
                                    "inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-[11px] font-bold transition-all border cursor-pointer",
                                    order.status === "created"
                                      ? "bg-amber-600 hover:bg-amber-700 text-white border-amber-600 shadow-2xs"
                                      : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                                  )}
                                >
                                  <RefreshCw
                                    className={cn(
                                      "size-3",
                                      reconcilingId === order.id && "animate-spin text-amber-500"
                                    )}
                                  />
                                  <span>Check Razorpay</span>
                                </button>
                              )}
                              {order.status !== "paid" && (
                                <button
                                  type="button"
                                  onClick={() => openGrantForOrder(order)}
                                  className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-bold border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                  title="Manually enroll this student"
                                >
                                  <Plus className="size-3 text-emerald-600" />
                                  <span>Enroll</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {ordersData && (
                <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
                  <Pagination
                    meta={buildPageMeta(
                      ordersData.total,
                      ordersData.page,
                      ordersData.limit,
                      ordersData.pages
                    )}
                    onPage={setOrdersPage}
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Enrollments Tab Content - Ultra Pro Table */}
      {tab === "enrollments" && (
        <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
          {isEnrollmentsLoading ? (
            <div className="p-12">
              <LoadingBlock label="Retrieving registered student records..." />
            </div>
          ) : enrollments.length === 0 ? (
            <div className="p-12 text-center">
              <EmptyState
                icon={Users}
                title="No enrollments found"
                description="Active student enrollments appear here. You can also grant access manually."
              />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/70 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <tr>
                      <th className="py-3.5 px-4 font-bold">Student</th>
                      <th className="py-3.5 px-4 font-bold">Course</th>
                      <th className="py-3.5 px-4 font-bold">Payment Reference</th>
                      <th className="py-3.5 px-4 font-bold">Amount</th>
                      <th className="py-3.5 px-4 font-bold">Progress</th>
                      <th className="py-3.5 px-4 font-bold">Enrolled At</th>
                      <th className="py-3.5 px-4 font-bold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {enrollments.map((item) => {
                      const studentInitials = (item.student_name || "Student")
                        .split(" ")
                        .map((s) => s[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase();

                      return (
                        <tr key={item.id} className="hover:bg-amber-50/40 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-4 align-top">
                            <div className="flex items-start gap-2.5">
                              <div className="size-8 rounded-full bg-gradient-to-br from-amber-500/15 to-orange-500/15 text-amber-700 dark:text-amber-300 font-black text-xs flex items-center justify-center shrink-0 border border-amber-300/40 dark:border-amber-700/40">
                                {studentInitials}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 dark:text-white">
                                  {item.student_name || "Unknown Student"}
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                                  {item.student_email || item.user_id}
                                </div>
                                {item.student_phone && (
                                  <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                                    {item.student_phone}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 align-top max-w-[220px]">
                            <div className="font-bold text-slate-900 dark:text-white line-clamp-2">
                              {item.course_title || item.course_id}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 align-top font-mono text-[11px]">
                            <div className="font-semibold text-slate-900 dark:text-white">
                              {item.payment_id || "—"}
                            </div>
                            {item.order_id && (
                              <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                                {item.order_id}
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4 align-top whitespace-nowrap font-black text-slate-900 dark:text-white">
                            {item.amount_paid > 0
                              ? `${item.currency} ${item.amount_paid.toLocaleString("en-IN")}`
                              : "Free / Manual"}
                          </td>

                          <td className="py-3.5 px-4 align-top whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-slate-900 dark:text-white text-xs">
                                {Math.round(item.progress_percent)}%
                              </span>
                              <div className="w-16 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="bg-gradient-to-r from-amber-500 to-emerald-500 h-full rounded-full transition-all duration-500"
                                  style={{ width: `${Math.min(100, Math.max(0, item.progress_percent))}%` }}
                                />
                              </div>
                            </div>
                            {item.certificate_issued && (
                              <span className="inline-block mt-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full">
                                🎓 Certified
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 align-top whitespace-nowrap text-slate-500 dark:text-slate-400">
                            <div className="font-medium">Enrolled: {formatDateTime(item.enrolled_at)}</div>
                            {item.expires_at ? (
                              item.is_expired ? (
                                <div className="mt-1">
                                  <span className="text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 px-2 py-0.5 rounded-full">
                                    Expired: {formatDateTime(item.expires_at)}
                                  </span>
                                </div>
                              ) : (
                                <div className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5">
                                  Expires: {formatDateTime(item.expires_at)}
                                </div>
                              )
                            ) : (
                              <div className="mt-1">
                                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                                  Lifetime Access
                                </span>
                              </div>
                            )}
                            <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                              Last seen: {formatDateTime(item.last_accessed_at)}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 align-top text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <Link
                                href={`/courses/${item.course_id}/learners`}
                                className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-bold border border-slate-200 dark:border-slate-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                                title="View Course Learners & Progress Breakdown"
                              >
                                <Eye className="size-3" />
                                <span>Progress</span>
                              </Link>
                              <button
                                type="button"
                                onClick={() => setRevokeTarget(item)}
                                className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-bold border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                              >
                                <Trash2 className="size-3" />
                                <span>Revoke</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {enrollmentsData && (
                <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
                  <Pagination
                    meta={buildPageMeta(
                      enrollmentsData.total,
                      enrollmentsData.page,
                      enrollmentsData.limit,
                      enrollmentsData.pages
                    )}
                    onPage={setEnrollmentsPage}
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Manual Enrollment Modal */}
      <Modal
        open={grantOpen}
        onClose={() => setGrantOpen(false)}
        title="Grant Manual Course Access"
        description="Use this to unlock a course manually (e.g., bank transfer, support recovery, or complimentary scholar access)."
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setGrantOpen(false)}
              disabled={grantMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => grantMutation.mutate()}
              loading={grantMutation.isPending}
              className="gap-1.5"
            >
              <UserPlus className="h-4 w-4" />
              Confirm Enrollment
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Target Masterclass *">
            <Select
              value={grantCourseId}
              onChange={(e) => setGrantCourseId(e.target.value)}
            >
              <option value="">Select course...</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} ({c.currency} {c.price})
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Student Email"
            hint="Enter student email (preferred) or User ID below."
          >
            <Input
              type="email"
              value={grantEmail}
              onChange={(e) => setGrantEmail(e.target.value)}
              placeholder="student@example.com"
            />
          </Field>

          <Field label="Or Student User ID (Optional)">
            <Input
              value={grantUserId}
              onChange={(e) => setGrantUserId(e.target.value)}
              placeholder="e.g. 67f..."
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Amount Paid (INR)">
              <Input
                type="number"
                min={0}
                value={grantAmountPaid}
                onChange={(e) => setGrantAmountPaid(e.target.value)}
                placeholder="0"
              />
            </Field>

            <Field label="Payment / UTR Reference">
              <Input
                value={grantPaymentId}
                onChange={(e) => setGrantPaymentId(e.target.value)}
                placeholder="pay_... or UTR"
              />
            </Field>
          </div>

          <Field
            label="Access Validity (Days)"
            hint="Number of days the student has access. Leave blank for course default / lifetime access."
          >
            <Input
              type="number"
              min={1}
              value={grantAccessDays}
              onChange={(e) => setGrantAccessDays(e.target.value)}
              placeholder="e.g. 30, 90, 365 (blank = course default or lifetime)"
            />
          </Field>

          <Field label="Admin Note (Audit Trail)">
            <Input
              value={grantNote}
              onChange={(e) => setGrantNote(e.target.value)}
              placeholder="Reason for manual access"
            />
          </Field>
        </div>
      </Modal>

      {/* Revoke Confirmation Modal */}
      <ConfirmModal
        open={Boolean(revokeTarget)}
        onClose={() => setRevokeTarget(null)}
        onConfirm={() => revokeTarget && revokeMutation.mutate(revokeTarget)}
        loading={revokeMutation.isPending}
        title="Revoke Course Access?"
        description={
          revokeTarget
            ? `Remove ${revokeTarget.student_name || revokeTarget.student_email || revokeTarget.user_id}'s enrollment from "${revokeTarget.course_title || revokeTarget.course_id}"? They will lose access immediately.`
            : undefined
        }
        confirmLabel="Revoke Access"
        tone="danger"
      />
    </div>
  );
}
