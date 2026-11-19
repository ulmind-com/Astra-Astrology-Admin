"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Flame,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  Star,
  CheckCircle2,
  Trash2,
  ExternalLink,
  BookOpen,
  Calendar,
  Edit2,
  RefreshCw,
  Clock,
  XCircle,
  FileText,
  Copy,
  Check,
  Eye,
  CreditCard,
  ShieldCheck,
  Award,
  AlertCircle,
  UserCheck,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";

import { PanelHeader } from "@/components/layout/panel-shell";
import { PurohitAvatarUploader } from "@/components/purohits/purohit-avatar-uploader";
import {
  Badge,
  Button,
  Card,
  CardBody,
  Field,
  Input,
  LoadingBlock,
  Modal,
} from "@/components/ui";
import {
  adminPurohitApi,
  type PurohitApplicationApprovalResult,
  type PurohitApplicationData,
  type PurohitData,
  type PurohitPujaItem,
} from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { useRequireAuth } from "@/providers/auth-provider";

export default function AdminPurohitsPage() {
  const { ready } = useRequireAuth({ roles: ["admin", "super_admin"], signInPath: "/login" });
  const queryClient = useQueryClient();

  // Active Tab: "verified" or "applications"
  const [activeTab, setActiveTab] = React.useState<"verified" | "applications">("verified");

  // Search & Filter State
  const [search, setSearch] = React.useState("");
  const [appStatusFilter, setAppStatusFilter] = React.useState<string>("pending");
  const [appSearch, setAppSearch] = React.useState("");

  // Verified Purohit Modals
  const [selectedPurohit, setSelectedPurohit] = React.useState<PurohitData | null>(null);
  const [catalogModalOpen, setCatalogModalOpen] = React.useState(false);
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [editingPurohit, setEditingPurohit] = React.useState<PurohitData | null>(null);
  const [editForm, setEditForm] = React.useState({
    display_name: "",
    title: "",
    avatar_url: "",
    phone: "",
    city: "",
    state: "",
    pincode: "",
    experience_years: 5,
    languages: ["Bengali", "Sanskrit"],
    bio: "",
  });

  // Application Modals & Review State
  const [detailModalApp, setDetailModalApp] = React.useState<PurohitApplicationData | null>(null);
  const [rejectModalApp, setRejectModalApp] = React.useState<PurohitApplicationData | null>(null);
  const [rejectionReason, setRejectionReason] = React.useState("");
  const [approvalResult, setApprovalResult] = React.useState<PurohitApplicationApprovalResult | null>(null);
  const [copiedField, setCopiedField] = React.useState<string | null>(null);

  // 1. Fetch Verified Purohits
  const {
    data: res,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["admin_purohits"],
    queryFn: async () => {
      const response = await adminPurohitApi.list({ limit: 100 });
      const data = (response as any)?.data !== undefined ? (response as any).data : response;
      return (Array.isArray(data) ? data : []) as PurohitData[];
    },
    enabled: ready,
    staleTime: 0,
    refetchOnMount: "always",
    refetchInterval: 15000,
  });

  // 2. Fetch Applications
  const {
    data: appRes,
    isLoading: isLoadingApps,
    isFetching: isFetchingApps,
    refetch: refetchApps,
  } = useQuery({
    queryKey: ["admin_purohit_applications", appStatusFilter, appSearch],
    queryFn: async () => {
      const response = await adminPurohitApi.listApplications({
        status: appStatusFilter === "all" ? undefined : appStatusFilter,
        search: appSearch.trim() || undefined,
        limit: 100,
      });
      const data = (response as any)?.data !== undefined ? (response as any).data : response;
      return (Array.isArray(data) ? data : []) as PurohitApplicationData[];
    },
    enabled: ready,
    staleTime: 0,
    refetchOnMount: "always",
    refetchInterval: 10000,
  });

  // 3. Update Purohit Profile
  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: typeof editForm }) => {
      const res = await adminPurohitApi.update(id, payload);
      return (res as any)?.data !== undefined ? (res as any).data : res;
    },
    onSuccess: () => {
      toast.success("Purohit profile & avatar updated successfully!");
      setEditModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin_purohits"] });
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : "Failed to update Purohit";
      toast.error(msg);
    },
  });

  // 4. Deactivate Purohit
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await adminPurohitApi.delete(id);
    },
    onSuccess: () => {
      toast.success("Purohit deactivated successfully.");
      queryClient.invalidateQueries({ queryKey: ["admin_purohits"] });
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : "Failed to deactivate Purohit";
      toast.error(msg);
    },
  });

  // 5. Approve Application Mutation
  const approveMutation = useMutation({
    mutationFn: async (appId: string) => {
      const res = await adminPurohitApi.approveApplication(appId);
      return (res as any)?.data !== undefined ? (res as any).data : res;
    },
    onSuccess: (result: PurohitApplicationApprovalResult) => {
      toast.success(result.message || "Purohit approved & onboarded successfully!");
      setApprovalResult(result);
      if (detailModalApp?.id === result.application_id) {
        setDetailModalApp(null);
      }
      queryClient.invalidateQueries({ queryKey: ["admin_purohits"] });
      queryClient.invalidateQueries({ queryKey: ["admin_purohit_applications"] });
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : "Failed to approve application";
      toast.error(msg);
    },
  });

  // 6. Reject Application Mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await adminPurohitApi.rejectApplication(id, { reason: reason || undefined });
      return (res as any)?.data !== undefined ? (res as any).data : res;
    },
    onSuccess: () => {
      toast.success("Application marked as rejected.");
      setRejectModalApp(null);
      setRejectionReason("");
      if (detailModalApp) {
        setDetailModalApp(null);
      }
      queryClient.invalidateQueries({ queryKey: ["admin_purohit_applications"] });
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : "Failed to reject application";
      toast.error(msg);
    },
  });

  const purohits = Array.isArray(res) ? res : [];
  const applications = Array.isArray(appRes) ? appRes : [];
  const pendingCount = applications.filter((a) => a.status === "pending").length;

  const filteredPurohits = React.useMemo(() => {
    if (!search.trim()) return purohits;
    const q = search.toLowerCase();
    return purohits.filter(
      (p: PurohitData) =>
        (p.display_name && p.display_name.toLowerCase().includes(q)) ||
        (p.city && p.city.toLowerCase().includes(q)) ||
        (p.phone && p.phone.includes(q)) ||
        (p.email && p.email.toLowerCase().includes(q))
    );
  }, [purohits, search]);

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success(`Copied ${fieldName} to clipboard!`);
    setTimeout(() => setCopiedField(null), 2500);
  };

  if (!ready || isLoading) {
    return <LoadingBlock label="Loading Purohits & Vedic Pandits..." />;
  }

  const onlineCount = purohits.filter((p: PurohitData) => p.is_online).length;
  const totalPujasDone = purohits.reduce((acc: number, p: PurohitData) => acc + (p.total_pujas_performed || 0), 0);

  return (
    <div className="space-y-6">
      <PanelHeader
        title="Purohits & Vedic Pandits Hub"
        description="Manage verified Vedic priests, review self-onboarding applications, and oversee live puja availability."
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetch();
                refetchApps();
              }}
              disabled={isFetching || isFetchingApps}
              className="text-xs font-semibold"
              title="Refresh lists"
            >
              <RefreshCw
                className={cn(
                  "size-3.5 mr-1.5",
                  (isFetching || isFetchingApps) && "animate-spin text-amber-600"
                )}
              />
              Refresh
            </Button>
            <Link href="/purohits/new">
              <Button variant="primary" size="sm" className="bg-amber-600 hover:bg-amber-700 text-white font-bold">
                <Plus className="size-4 mr-1.5" />
                Manual Onboard
              </Button>
            </Link>
          </div>
        }
      />

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="border border-stone-200 dark:border-stone-800">
          <CardBody className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 flex items-center justify-center shrink-0">
              <Flame className="size-5 text-amber-600" />
            </div>
            <div>
              <span className="text-xs text-stone-500 font-medium">Verified Purohits</span>
              <div className="text-xl font-bold text-stone-900 dark:text-white">{purohits.length}</div>
            </div>
          </CardBody>
        </Card>

        <Card className="border border-amber-200 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20">
          <CardBody className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 flex items-center justify-center shrink-0 relative">
              <Clock className="size-5 text-amber-700" />
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
                </span>
              )}
            </div>
            <div>
              <span className="text-xs text-amber-900 dark:text-amber-300 font-medium">Pending Applications</span>
              <div className="text-xl font-bold text-amber-950 dark:text-amber-200">{pendingCount} Waiting</div>
            </div>
          </CardBody>
        </Card>

        <Card className="border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/30">
          <CardBody className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 flex items-center justify-center shrink-0">
              <span className="relative flex size-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full size-3 bg-emerald-500" />
              </span>
            </div>
            <div>
              <span className="text-xs text-emerald-900 dark:text-emerald-300 font-medium">Online for Live Puja</span>
              <div className="text-xl font-bold text-emerald-950 dark:text-emerald-100">{onlineCount} Available</div>
            </div>
          </CardBody>
        </Card>

        <Card className="border border-indigo-200 dark:border-indigo-900/40 bg-indigo-50/30">
          <CardBody className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 flex items-center justify-center shrink-0">
              <Star className="size-5 text-indigo-600" />
            </div>
            <div>
              <span className="text-xs text-indigo-900 dark:text-indigo-300 font-medium">Completed Pujas</span>
              <div className="text-xl font-bold text-indigo-950 dark:text-indigo-100">{totalPujasDone} Pujas</div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 dark:border-stone-800 pb-2">
        <button
          onClick={() => setActiveTab("verified")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all",
            activeTab === "verified"
              ? "bg-amber-600 text-white shadow-sm shadow-amber-600/30"
              : "text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800/60"
          )}
        >
          <UserCheck className="size-4" />
          Verified Purohits ({purohits.length})
        </button>

        <button
          onClick={() => setActiveTab("applications")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all relative",
            activeTab === "applications"
              ? "bg-amber-600 text-white shadow-sm shadow-amber-600/30"
              : "text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800/60"
          )}
        >
          <Clock className="size-4" />
          ⏳ Pending Applications
          {pendingCount > 0 && (
            <span
              className={cn(
                "ml-1 px-2 py-0.5 rounded-full text-xs font-black",
                activeTab === "applications"
                  ? "bg-white text-amber-700"
                  : "bg-amber-600 text-white"
              )}
            >
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: VERIFIED PUROHITS */}
      {/* ========================================================================= */}
      {activeTab === "verified" && (
        <div className="space-y-5">
          {/* Search Bar */}
          <Card className="border border-stone-200 dark:border-stone-800">
            <CardBody className="p-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-stone-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search verified Purohit by name, city, phone, or email..."
                  className="pl-9 text-xs"
                />
              </div>
            </CardBody>
          </Card>

          {/* Purohits Grid */}
          {filteredPurohits.length === 0 ? (
            <Card className="border border-dashed border-stone-300 dark:border-stone-700 p-8 text-center">
              <Flame className="size-10 text-stone-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-stone-700 dark:text-stone-300">No Purohits found.</p>
              <p className="text-xs text-stone-500 mt-1">Click "Manual Onboard" or approve a pending application.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredPurohits.map((purohit) => (
                <Card
                  key={purohit.id}
                  className="border border-stone-200 dark:border-stone-800 overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow"
                >
                  <div className="p-5 space-y-4">
                    {/* Header info */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="relative size-12 rounded-full overflow-hidden bg-amber-100 shrink-0 border border-amber-200">
                          {purohit.avatar_url ? (
                            <Image src={purohit.avatar_url} alt={purohit.display_name} fill className="object-cover" unoptimized />
                          ) : (
                            <div className="size-full flex items-center justify-center text-amber-700 font-bold text-base">
                              {purohit.display_name.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div>
                          <h4 className="font-bold text-stone-900 dark:text-white text-sm flex items-center gap-1.5">
                            {purohit.display_name}
                            {purohit.is_verified && <CheckCircle2 className="size-4 text-blue-500" />}
                          </h4>
                          <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">{purohit.title}</p>
                        </div>
                      </div>

                      {/* Online / Offline badge */}
                      {purohit.is_online ? (
                        <Badge tone="neutral" className="bg-emerald-100 text-emerald-900 border-emerald-300 font-bold text-[10px]">
                          🟢 Online Now
                        </Badge>
                      ) : (
                        <Badge tone="neutral" className="bg-stone-100 text-stone-600 border-stone-300 text-[10px]">
                          ⚪ Offline
                        </Badge>
                      )}
                    </div>

                    {/* Details */}
                    <div className="space-y-1.5 text-xs text-stone-600 dark:text-stone-300 pt-2 border-t border-stone-100 dark:border-stone-800">
                      {purohit.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="size-3.5 text-stone-400" />
                          <span>{purohit.phone}</span>
                        </div>
                      )}
                      {purohit.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="size-3.5 text-stone-400" />
                          <span className="truncate">{purohit.email}</span>
                        </div>
                      )}
                      {purohit.city && (
                        <div className="flex items-center gap-2">
                          <MapPin className="size-3.5 text-stone-400" />
                          <span>{purohit.city}, {purohit.state || "India"}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 pt-1 text-[11px] text-stone-500">
                        <span>{purohit.experience_years} yrs exp</span>
                        <span>•</span>
                        <span>{purohit.languages?.join(", ")}</span>
                      </div>
                    </div>

                    {/* Puja Catalog Preview */}
                    <div className="p-2.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 text-xs">
                      <div className="flex items-center justify-between font-bold text-amber-950 dark:text-amber-200">
                        <span>Price Catalog ({purohit.pujas?.length || 0} Pujas)</span>
                        <span className="text-[11px]">Starts ₹{purohit.starting_price_inr}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {(purohit.pujas || []).slice(0, 2).map((puja: PurohitPujaItem) => (
                          <span key={puja.id} className="inline-block px-2 py-0.5 rounded-md bg-white dark:bg-stone-900 border border-amber-200 text-[10px] text-stone-700 dark:text-stone-300 font-medium">
                            {puja.puja_name.split("(")[0]} (₹{puja.price_inr})
                          </span>
                        ))}
                        {(purohit.pujas?.length || 0) > 2 && (
                          <span className="text-[10px] text-amber-700 font-bold self-center">
                            +{purohit.pujas.length - 2} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="p-3 bg-stone-50/80 dark:bg-stone-900/40 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingPurohit(purohit);
                          setEditForm({
                            display_name: purohit.display_name,
                            title: purohit.title || "Vedic Acharya",
                            avatar_url: purohit.avatar_url || "",
                            phone: purohit.phone || "",
                            city: purohit.city || "",
                            state: purohit.state || "",
                            pincode: purohit.pincode || "",
                            experience_years: purohit.experience_years || 5,
                            languages: purohit.languages || ["Bengali", "Sanskrit"],
                            bio: purohit.bio || "",
                          });
                          setEditModalOpen(true);
                        }}
                        className="text-xs font-bold bg-white dark:bg-stone-900 hover:bg-amber-50 hover:text-amber-700"
                      >
                        <Edit2 className="size-3.5 mr-1 text-amber-600" />
                        Edit
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedPurohit(purohit);
                          setCatalogModalOpen(true);
                        }}
                        className="text-xs font-bold"
                      >
                        <BookOpen className="size-3.5 mr-1" />
                        Catalog ({purohit.pujas?.length || 0})
                      </Button>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Are you sure you want to deactivate Purohit ${purohit.display_name}?`)) {
                          deleteMutation.mutate(purohit.id);
                        }
                      }}
                      loading={deleteMutation.isPending}
                      className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-xs"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PENDING & PROCESSED APPLICATIONS */}
      {/* ========================================================================= */}
      {activeTab === "applications" && (
        <div className="space-y-5">
          {/* Controls: Search & Filter Tabs */}
          <Card className="border border-stone-200 dark:border-stone-800">
            <CardBody className="p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-stone-400" />
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
                      "px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap",
                      appStatusFilter === tab.key
                        ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900"
                        : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300"
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
            <LoadingBlock label="Loading Purohit onboarding applications..." />
          ) : applications.length === 0 ? (
            <Card className="border border-dashed border-stone-300 dark:border-stone-700 p-8 text-center">
              <Clock className="size-10 text-stone-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-stone-700 dark:text-stone-300">
                No {appStatusFilter !== "all" ? appStatusFilter : ""} applications found.
              </p>
              <p className="text-xs text-stone-500 mt-1">
                Applicants who complete the website registration at /become-a-purohit will appear here.
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
                      ? "border-amber-300/80 dark:border-amber-900/60 bg-amber-50/10"
                      : app.status === "approved"
                      ? "border-emerald-200 dark:border-emerald-950/60 bg-emerald-50/10"
                      : "border-rose-200 dark:border-rose-950/60 bg-rose-50/10"
                  )}
                >
                  <CardBody className="p-5 space-y-4">
                    {/* Top Row: App #, Date, Status */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200/60 dark:border-stone-800 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200">
                          {app.application_number}
                        </span>
                        <span className="text-xs text-stone-400">
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
                        <div className="relative size-14 rounded-xl overflow-hidden bg-amber-100 shrink-0 border border-amber-200">
                          {app.avatar_url ? (
                            <Image src={app.avatar_url} alt={app.full_name} fill className="object-cover" unoptimized />
                          ) : (
                            <div className="size-full flex items-center justify-center text-amber-700 font-bold text-lg">
                              {app.full_name.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-bold text-base text-stone-900 dark:text-white flex items-center gap-1.5">
                            {app.full_name}
                            {app.age && <span className="text-xs font-normal text-stone-500">({app.age} yrs)</span>}
                          </h4>
                          <div className="text-xs text-stone-600 dark:text-stone-300 flex items-center gap-1.5">
                            <Phone className="size-3.5 text-stone-400" />
                            <span>{app.phone}</span>
                          </div>
                          <div className="text-xs text-stone-600 dark:text-stone-300 flex items-center gap-1.5">
                            <Mail className="size-3.5 text-stone-400" />
                            <span className="truncate">{app.email}</span>
                          </div>
                          <div className="text-xs text-stone-600 dark:text-stone-300 flex items-center gap-1.5">
                            <MapPin className="size-3.5 text-stone-400" />
                            <span>{app.city}, {app.state} {app.pincode ? `(${app.pincode})` : ""}</span>
                          </div>
                        </div>
                      </div>

                      {/* Column 2: Vedic Tradition & Pujas */}
                      <div className="space-y-2 border-t md:border-t-0 md:border-l border-stone-100 dark:border-stone-800 md:pl-4">
                        <div className="flex items-center gap-2">
                          <Award className="size-4 text-amber-600" />
                          <span className="font-bold text-xs text-stone-900 dark:text-stone-200">
                            {app.vedic_shakha || "Vedic Acharya"}
                          </span>
                          <span className="text-xs text-stone-500">
                            • {app.experience_years} yrs exp
                          </span>
                        </div>
                        <div className="text-xs text-stone-500">
                          Languages: <span className="text-stone-700 dark:text-stone-300 font-medium">{app.languages?.join(", ")}</span>
                        </div>

                        <div>
                          <div className="text-[11px] font-bold text-stone-600 dark:text-stone-400 mb-1">
                            Puja Specializations ({app.specializations?.length || 0}):
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {(app.specializations || []).map((spec, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200/70 text-[10px] text-amber-950 dark:text-amber-200 font-semibold"
                              >
                                {spec}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Column 3: Verification & Payout Details */}
                      <div className="space-y-2 border-t md:border-t-0 md:border-l border-stone-100 dark:border-stone-800 md:pl-4">
                        <div className="flex items-center gap-2 text-xs">
                          <CreditCard className="size-4 text-stone-400" />
                          <span className="font-bold text-stone-800 dark:text-stone-200">Payout Details:</span>
                        </div>
                        <div className="text-xs text-stone-600 dark:text-stone-400 space-y-0.5">
                          {app.upi_id && <div>UPI: <span className="font-mono text-stone-800 dark:text-stone-200 font-bold">{app.upi_id}</span></div>}
                          {app.bank_account_number && (
                            <div>Bank: <span className="font-mono">{app.bank_account_number.slice(-4).padStart(app.bank_account_number.length, "*")}</span> ({app.bank_ifsc || "IFSC"})</div>
                          )}
                          {app.bank_account_holder && <div>Holder: {app.bank_account_holder}</div>}
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
                              View Certificate / ID Proof
                              <ExternalLink className="size-3" />
                            </a>
                          ) : (
                            <span className="text-xs text-stone-400 italic">No document attached</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bio or Rejection Reason Note */}
                    {app.bio && (
                      <div className="text-xs text-stone-600 dark:text-stone-300 bg-stone-50 dark:bg-stone-900/50 p-2.5 rounded-xl border border-stone-200/60 dark:border-stone-800">
                        <b>Lineage & Gurukul Bio:</b> {app.bio}
                      </div>
                    )}

                    {app.status === "rejected" && app.rejection_reason && (
                      <div className="text-xs text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 p-2.5 rounded-xl border border-rose-200/60 dark:border-rose-900/40">
                        <b>Rejection Reason:</b> {app.rejection_reason}
                      </div>
                    )}

                    {/* Action Bar */}
                    <div className="flex items-center justify-between pt-3 border-t border-stone-200/60 dark:border-stone-800">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDetailModalApp(app)}
                        className="text-xs font-semibold"
                      >
                        <Eye className="size-3.5 mr-1 text-stone-500" />
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
                            className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-bold"
                          >
                            <XCircle className="size-3.5 mr-1" />
                            Reject
                          </Button>

                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => approveMutation.mutate(app.id)}
                            loading={approveMutation.isPending && approveMutation.variables === app.id}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
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

      {/* ========================================================================= */}
      {/* MODAL: APPLICATION FULL DETAILS */}
      {/* ========================================================================= */}
      {detailModalApp && (
        <Modal
          open={!!detailModalApp}
          onClose={() => setDetailModalApp(null)}
          title={`Application Details — ${detailModalApp.application_number}`}
        >
          <div className="space-y-4 max-h-[75vh] overflow-y-auto p-1 text-xs">
            {/* Header */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200">
              <div>
                <h4 className="font-bold text-base text-stone-900 dark:text-white">{detailModalApp.full_name}</h4>
                <p className="text-stone-500">{detailModalApp.vedic_shakha} • {detailModalApp.experience_years} Years Experience</p>
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

            {/* Identity & Location */}
            <div className="space-y-2 border p-3 rounded-xl border-stone-200 dark:border-stone-800">
              <h5 className="font-bold text-stone-900 dark:text-white">Contact & Address</h5>
              <div className="grid grid-cols-2 gap-2 text-stone-600 dark:text-stone-300">
                <div>Email: <b className="text-stone-900 dark:text-white">{detailModalApp.email}</b></div>
                <div>Phone: <b className="text-stone-900 dark:text-white">{detailModalApp.phone}</b></div>
                <div>City: {detailModalApp.city}</div>
                <div>State: {detailModalApp.state}</div>
                <div>Pincode: {detailModalApp.pincode || "N/A"}</div>
                <div>Address: {detailModalApp.address || "N/A"}</div>
              </div>
            </div>

            {/* Vedic Knowledge */}
            <div className="space-y-2 border p-3 rounded-xl border-stone-200 dark:border-stone-800">
              <h5 className="font-bold text-stone-900 dark:text-white">Vedic Knowledge & Pujas</h5>
              <p><b>Vedic Tradition:</b> {detailModalApp.vedic_shakha}</p>
              <p><b>Languages:</b> {detailModalApp.languages?.join(", ")}</p>
              <div>
                <b>Puja Catalog Specializations:</b>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(detailModalApp.specializations || []).map((s, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 border text-[11px] font-medium">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
              {detailModalApp.bio && (
                <div className="mt-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                  <b>Bio & Gurukul Lineage:</b>
                  <p className="mt-1 leading-relaxed text-stone-700 dark:text-stone-300">{detailModalApp.bio}</p>
                </div>
              )}
            </div>

            {/* Bank & Payout */}
            <div className="space-y-2 border p-3 rounded-xl border-stone-200 dark:border-stone-800">
              <h5 className="font-bold text-stone-900 dark:text-white">Financial & Dakshina Payout Info</h5>
              <div className="grid grid-cols-2 gap-2 text-stone-600 dark:text-stone-300">
                <div>UPI ID: <b className="font-mono text-stone-900 dark:text-white">{detailModalApp.upi_id || "N/A"}</b></div>
                <div>Account Holder: {detailModalApp.bank_account_holder || "N/A"}</div>
                <div>Account Number: <span className="font-mono">{detailModalApp.bank_account_number || "N/A"}</span></div>
                <div>IFSC Code: <span className="font-mono">{detailModalApp.bank_ifsc || "N/A"}</span></div>
              </div>
            </div>

            {/* Attached Verification Doc */}
            {detailModalApp.identity_proof_url && (
              <div className="p-3 rounded-xl border border-blue-200 bg-blue-50/40 dark:bg-blue-950/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="size-4 text-blue-600" />
                  <span className="font-bold text-blue-900 dark:text-blue-300">Certificate / Identity Document</span>
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
      {/* MODAL: APPROVAL SUCCESS & CREDENTIALS */}
      {/* ========================================================================= */}
      {approvalResult && (
        <Modal
          open={!!approvalResult}
          onClose={() => setApprovalResult(null)}
          title="🎉 Purohit Approved & Live!"
        >
          <div className="space-y-4 p-1 text-xs">
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 text-emerald-900 dark:text-emerald-200">
              <h4 className="font-bold text-sm mb-1">
                {approvalResult.display_name} is now an active Purohit!
              </h4>
              <p>
                {approvalResult.email_sent
                  ? `An official welcome email with login credentials has been sent to ${approvalResult.email}.`
                  : `User account & Purohit profile created. Welcome email could not be sent automatically; please provide the credentials manually.`}
              </p>
            </div>

            <div className="space-y-3 border p-4 rounded-xl border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900">
              <div>
                <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Login Email</label>
                <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 mt-1">
                  <span className="font-mono font-bold text-stone-900 dark:text-white">{approvalResult.email}</span>
                  <button
                    onClick={() => copyToClipboard(approvalResult.email, "Email")}
                    className="text-stone-500 hover:text-amber-600"
                  >
                    {copiedField === "Email" ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Initial Password</label>
                <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 mt-1">
                  <span className="font-mono font-bold text-amber-700 dark:text-amber-400 text-sm">{approvalResult.temporary_password}</span>
                  <button
                    onClick={() => copyToClipboard(approvalResult.temporary_password, "Password")}
                    className="text-stone-500 hover:text-amber-600"
                  >
                    {copiedField === "Password" ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Purohit Portal URL</label>
                <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 mt-1">
                  <span className="font-mono text-stone-700 dark:text-stone-300 truncate mr-2">{approvalResult.dashboard_url}</span>
                  <button
                    onClick={() => copyToClipboard(approvalResult.dashboard_url, "Portal URL")}
                    className="text-stone-500 hover:text-amber-600"
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
                className="bg-stone-900 text-white font-bold"
              >
                Done
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REJECT APPLICATION */}
      {/* ========================================================================= */}
      {rejectModalApp && (
        <Modal
          open={!!rejectModalApp}
          onClose={() => setRejectModalApp(null)}
          title={`Reject Application — ${rejectModalApp.application_number}`}
        >
          <div className="space-y-4 p-1 text-xs">
            <p className="text-stone-600 dark:text-stone-300">
              Are you sure you want to reject the application submitted by <b>{rejectModalApp.full_name}</b>?
            </p>

            <Field label="Rejection Reason (Optional)">
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Incomplete verification documents, experience requirement unmet, etc."
                rows={3}
                className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 p-2.5 text-xs focus:border-rose-500 focus:outline-none"
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

      {/* ========================================================================= */}
      {/* MODAL: PUJA CATALOG */}
      {/* ========================================================================= */}
      {selectedPurohit && (
        <Modal
          open={catalogModalOpen}
          onClose={() => setCatalogModalOpen(false)}
          title={`Puja Price Catalog — ${selectedPurohit.display_name}`}
        >
          <div className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
            <p className="text-xs text-stone-500">
              Pujas and dakshina offered by this Purohit. Purohits can also add or customize these directly from their personal dashboard.
            </p>

            {(selectedPurohit.pujas || []).length === 0 ? (
              <p className="text-xs text-stone-400 italic py-4 text-center">No pujas currently in catalog.</p>
            ) : (
              <div className="space-y-3">
                {selectedPurohit.pujas.map((puja: PurohitPujaItem) => (
                  <div key={puja.id} className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/30 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h5 className="font-bold text-sm text-stone-900 dark:text-white">{puja.puja_name}</h5>
                        <p className="text-xs text-stone-500">{puja.duration_minutes} Minutes duration</p>
                      </div>
                      <Badge tone="neutral" className="bg-emerald-100 text-emerald-900 border-emerald-300 font-bold text-xs">
                        ₹{puja.price_inr}
                      </Badge>
                    </div>
                    {puja.description && (
                      <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">{puja.description}</p>
                    )}
                    {puja.samagri_notes && (
                      <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 text-[11px] text-amber-900 dark:text-amber-300">
                        <b>Samagri checklist for devotee:</b> {puja.samagri_notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT PUROHIT & AVATAR */}
      {/* ========================================================================= */}
      {editingPurohit && (
        <Modal
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          title={`Edit Profile — ${editingPurohit.display_name}`}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateMutation.mutate({ id: editingPurohit.id, payload: editForm });
            }}
            className="space-y-4 max-h-[75vh] overflow-y-auto p-1"
          >
            <PurohitAvatarUploader
              value={editForm.avatar_url}
              onChange={(url) => setEditForm({ ...editForm, avatar_url: url })}
              name={editForm.display_name}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Display Name">
                <Input
                  required
                  value={editForm.display_name}
                  onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
                />
              </Field>
              <Field label="Sacred Title">
                <Input
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  placeholder="Vedic Acharya"
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Phone">
                <Input
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                />
              </Field>
              <Field label="City">
                <Input
                  value={editForm.city}
                  onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Experience (Years)">
                <Input
                  type="number"
                  value={editForm.experience_years}
                  onChange={(e) =>
                    setEditForm({ ...editForm, experience_years: Number(e.target.value) || 0 })
                  }
                />
              </Field>
              <Field label="Languages (comma separated)">
                <Input
                  value={editForm.languages.join(", ")}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      languages: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                    })
                  }
                />
              </Field>
            </div>

            <Field label="Sacred Bio & Lineage">
              <textarea
                value={editForm.bio}
                onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                rows={3}
                placeholder="Vedic Priest background..."
                className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 p-2.5 text-xs focus:border-amber-600 focus:outline-none"
              />
            </Field>

            <div className="flex justify-end gap-2 pt-3 border-t border-stone-200 dark:border-stone-800">
              <Button variant="outline" type="button" onClick={() => setEditModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                loading={updateMutation.isPending}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
              >
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
