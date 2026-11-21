"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Ticket,
  Plus,
  Search,
  Sparkles,
  Percent,
  Coins,
  Copy,
  Calendar,
  Users,
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  Power,
  RefreshCw,
  Gift,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

import { PanelHeader } from "@/components/layout/panel-shell";
import {
  Badge,
  Button,
  Card,
  CardBody,
  Field,
  Input,
  LoadingBlock,
  Select,
  Switch,
} from "@/components/ui";
import { shopAdminApi, type ShopCoupon, type ShopCouponInput } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { useRequireAuth } from "@/providers/auth-provider";

function formatINR(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

const DEFAULT_FORM_DATA: ShopCouponInput = {
  code: "",
  title: "",
  description: "",
  discount_type: "percentage",
  discount_value: 10,
  min_order_amount: 0,
  max_discount_amount: undefined,
  usage_limit: undefined,
  per_user_limit: 1,
  first_order_only: false,
  is_highlighted: false,
  start_date: "",
  expiry_date: "",
  is_active: true,
};

export default function CouponsPage() {
  const { ready } = useRequireAuth({ roles: ["admin", "super_admin"], signInPath: "/login" });
  const queryClient = useQueryClient();

  // Search & Filter State
  const [activeTab, setActiveTab] = React.useState<"all" | "active" | "inactive" | "expired">("all");
  const [search, setSearch] = React.useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = React.useState<string>("");
  const [page, setPage] = React.useState<number>(1);

  // Modal State
  const [modalOpen, setModalOpen] = React.useState<boolean>(false);
  const [editingCoupon, setEditingCoupon] = React.useState<ShopCoupon | null>(null);
  const [formData, setFormData] = React.useState<ShopCouponInput>(DEFAULT_FORM_DATA);

  // Debounce search
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Fetch Coupons Query
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin_shop_coupons", page, activeTab, debouncedSearch],
    queryFn: async () => {
      let isActiveParam: boolean | undefined = undefined;
      if (activeTab === "active") isActiveParam = true;
      if (activeTab === "inactive") isActiveParam = false;

      const res = await shopAdminApi.listCoupons({
        page,
        limit: 50,
        search: debouncedSearch || undefined,
        is_active: isActiveParam,
      });
      return res;
    },
    enabled: ready,
  });

  const allCoupons = data?.items || [];
  const totalCount = data?.total || 0;

  // Filter for expired if tab selected
  const coupons = React.useMemo(() => {
    if (activeTab === "expired") {
      const now = new Date();
      return allCoupons.filter((c) => c.expiry_date && new Date(c.expiry_date) < now);
    }
    return allCoupons;
  }, [allCoupons, activeTab]);

  // Create / Update Mutation
  const saveMutation = useMutation({
    mutationFn: async (payload: ShopCouponInput) => {
      if (editingCoupon) {
        return await shopAdminApi.updateCoupon(editingCoupon.id, payload);
      }
      return await shopAdminApi.createCoupon(payload);
    },
    onSuccess: (saved) => {
      toast.success(
        editingCoupon
          ? `Coupon ${saved.code} updated successfully!`
          : `New coupon ${saved.code} created and live!`
      );
      setModalOpen(false);
      setEditingCoupon(null);
      setFormData(DEFAULT_FORM_DATA);
      queryClient.invalidateQueries({ queryKey: ["admin_shop_coupons"] });
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : "Failed to save coupon";
      toast.error(msg);
    },
  });

  // Toggle Active Mutation
  const toggleMutation = useMutation({
    mutationFn: async (id: string) => {
      return await shopAdminApi.toggleCouponActive(id);
    },
    onSuccess: (updated) => {
      toast.success(`Coupon ${updated.code} is now ${updated.is_active ? "Active" : "Inactive"}`);
      queryClient.invalidateQueries({ queryKey: ["admin_shop_coupons"] });
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : "Failed to toggle status";
      toast.error(msg);
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await shopAdminApi.deleteCoupon(id);
    },
    onSuccess: () => {
      toast.success("Coupon deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["admin_shop_coupons"] });
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : "Failed to delete coupon";
      toast.error(msg);
    },
  });

  const handleOpenCreate = () => {
    setEditingCoupon(null);
    setFormData(DEFAULT_FORM_DATA);
    setModalOpen(true);
  };

  const handleOpenEdit = (coupon: ShopCoupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      title: coupon.title,
      description: coupon.description || "",
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      min_order_amount: coupon.min_order_amount,
      max_discount_amount: coupon.max_discount_amount || undefined,
      usage_limit: coupon.usage_limit || undefined,
      per_user_limit: coupon.per_user_limit,
      first_order_only: coupon.first_order_only,
      is_highlighted: coupon.is_highlighted,
      start_date: coupon.start_date ? new Date(coupon.start_date).toISOString().slice(0, 10) : "",
      expiry_date: coupon.expiry_date ? new Date(coupon.expiry_date).toISOString().slice(0, 10) : "",
      is_active: coupon.is_active,
    });
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title?.trim()) {
      toast.error("Please enter a title for the coupon offer");
      return;
    }
    if (!editingCoupon && !formData.code?.trim()) {
      toast.error("Please enter a coupon code");
      return;
    }
    if (formData.discount_type === "percentage" && (formData.discount_value <= 0 || formData.discount_value > 100)) {
      toast.error("Percentage discount must be between 1% and 100%");
      return;
    }

    const payload: ShopCouponInput = {
      ...formData,
      code: formData.code?.trim().toUpperCase(),
      title: formData.title.trim(),
      description: formData.description?.trim() || undefined,
      discount_value: Number(formData.discount_value),
      min_order_amount: Number(formData.min_order_amount || 0),
      max_discount_amount: formData.max_discount_amount ? Number(formData.max_discount_amount) : undefined,
      usage_limit: formData.usage_limit ? Number(formData.usage_limit) : undefined,
      per_user_limit: Number(formData.per_user_limit || 1),
      start_date: formData.start_date ? new Date(formData.start_date).toISOString() : undefined,
      expiry_date: formData.expiry_date ? new Date(formData.expiry_date).toISOString() : undefined,
    };

    saveMutation.mutate(payload);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Coupon code copied to clipboard!");
  };

  if (!ready || isLoading) {
    return <LoadingBlock label="Loading Coupon Hub..." />;
  }

  // Quick stats
  const activeCount = allCoupons.filter((c) => c.is_active && c.is_valid_now).length;
  const totalRedemptions = allCoupons.reduce((acc, c) => acc + (c.usage_count || 0), 0);
  const firstOrderDealsCount = allCoupons.filter((c) => c.first_order_only).length;

  return (
    <div className="space-y-6">
      <PanelHeader
        title="Promotional Coupons & Smart Offers"
        description="Create and manage voucher discounts, configure minimum order thresholds, first-buyer deals, and automated cart recommendations."
        action={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => refetch()} loading={isFetching}>
              <RefreshCw className="size-3.5 mr-1" />
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenCreate}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
            >
              <Plus className="size-3.5 mr-1" />
              Create Coupon
            </Button>
          </div>
        }
      />

      {/* ------------------------------------------------------------------- */}
      {/* 1. Summary Metric Cards */}
      {/* ------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-stone-200 dark:border-stone-800">
          <CardBody className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <Ticket className="size-5" />
            </div>
            <div>
              <span className="text-xs text-stone-500 font-medium">Total Promo Codes</span>
              <div className="text-lg font-bold text-stone-900 dark:text-white">{totalCount}</div>
            </div>
          </CardBody>
        </Card>

        <Card className="border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/30">
          <CardBody className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="size-5 text-emerald-600" />
            </div>
            <div>
              <span className="text-xs text-emerald-900 font-medium">Active & Redeemable</span>
              <div className="text-lg font-bold text-emerald-950">{activeCount}</div>
            </div>
          </CardBody>
        </Card>

        <Card className="border border-indigo-200 dark:border-indigo-900/40 bg-indigo-50/30">
          <CardBody className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
              <TrendingUp className="size-5 text-indigo-600" />
            </div>
            <div>
              <span className="text-xs text-indigo-900 font-medium">Total Redemptions</span>
              <div className="text-lg font-bold text-indigo-950">{totalRedemptions} times</div>
            </div>
          </CardBody>
        </Card>

        <Card className="border border-purple-200 dark:border-purple-900/40 bg-purple-50/30">
          <CardBody className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
              <Sparkles className="size-5 text-purple-600" />
            </div>
            <div>
              <span className="text-xs text-purple-900 font-medium">1st-Order Incentives</span>
              <div className="text-lg font-bold text-purple-950">{firstOrderDealsCount} coupons</div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* 2. Filter Navigation Tabs & Search Controls */}
      {/* ------------------------------------------------------------------- */}
      <Card className="border border-stone-200 dark:border-stone-800">
        <CardBody className="p-4 space-y-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-2 border-b border-stone-200 dark:border-stone-800 pb-2 overflow-x-auto scrollbar-none">
            {[
              { id: "all", label: `All Coupons (${totalCount})` },
              { id: "active", label: `Active (${activeCount})` },
              { id: "inactive", label: "Inactive" },
              { id: "expired", label: "Expired" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-amber-600 text-white shadow-2xs"
                    : "text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-stone-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search coupon by promo code, title, or description..."
              className="pl-9 text-xs"
            />
          </div>
        </CardBody>
      </Card>

      {/* ------------------------------------------------------------------- */}
      {/* 3. Coupons Grid */}
      {/* ------------------------------------------------------------------- */}
      {coupons.length === 0 ? (
        <Card className="border border-stone-200 dark:border-stone-800 p-12 text-center">
          <div className="size-14 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center mx-auto mb-3">
            <Ticket className="size-7" />
          </div>
          <h3 className="font-bold text-stone-900 dark:text-white text-base">No coupons found</h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1 mb-4">
            No discount codes match your current filter. Create a promotional coupon to delight your devotees!
          </p>
          <Button variant="primary" size="sm" onClick={handleOpenCreate} className="bg-amber-600 text-white font-bold">
            <Plus className="size-3.5 mr-1" />
            Create First Coupon
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {coupons.map((coupon) => {
            const isPercentage = coupon.discount_type === "percentage";
            const isExpired = coupon.expiry_date && new Date(coupon.expiry_date) < new Date();
            const usagePercent =
              coupon.usage_limit && coupon.usage_limit > 0
                ? Math.min(100, Math.round((coupon.usage_count / coupon.usage_limit) * 100))
                : 0;

            return (
              <div
                key={coupon.id}
                className={`relative rounded-2xl border transition-all overflow-hidden p-5 space-y-4 bg-white dark:bg-stone-900 shadow-xs ${
                  coupon.is_active && !isExpired
                    ? "border-amber-200 dark:border-stone-700 hover:border-amber-400 hover:shadow-md"
                    : "border-stone-200 dark:border-stone-800 opacity-75"
                }`}
              >
                {/* Header: Discount Badge & Code */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-base font-black text-amber-700 dark:text-amber-400 tracking-wider">
                        {coupon.code}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(coupon.code)}
                        className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 p-1 rounded-md"
                        title="Copy code"
                      >
                        <Copy className="size-3.5" />
                      </button>
                    </div>
                    <h4 className="font-bold text-xs text-stone-900 dark:text-white line-clamp-1">
                      {coupon.title}
                    </h4>
                  </div>

                  <div className="shrink-0 text-right">
                    <span
                      className={`inline-block font-black text-xs px-2.5 py-1 rounded-lg ${
                        isPercentage
                          ? "bg-amber-100 text-amber-900 border border-amber-300"
                          : "bg-emerald-100 text-emerald-900 border border-emerald-300"
                      }`}
                    >
                      {isPercentage ? `${coupon.discount_value}% OFF` : `₹${coupon.discount_value} FLAT`}
                    </span>
                  </div>
                </div>

                {coupon.description && (
                  <p className="text-[11px] text-stone-500 line-clamp-2 italic">
                    "{coupon.description}"
                  </p>
                )}

                {/* Badges / Conditions */}
                <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                  {coupon.min_order_amount > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-medium border border-stone-200 dark:border-stone-700">
                      Min: {formatINR(coupon.min_order_amount)}
                    </span>
                  )}
                  {coupon.max_discount_amount && isPercentage && (
                    <span className="px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-medium border border-stone-200 dark:border-stone-700">
                      Cap: {formatINR(coupon.max_discount_amount)}
                    </span>
                  )}
                  {coupon.first_order_only && (
                    <span className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 font-bold border border-purple-300 dark:border-purple-800">
                      🎁 1st Order Only
                    </span>
                  )}
                  {coupon.per_user_limit > 1 && (
                    <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 font-medium border border-blue-200 dark:border-blue-800">
                      {coupon.per_user_limit}x per devotee
                    </span>
                  )}
                  {coupon.is_highlighted && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold border border-amber-300">
                      ⭐ Highlighted
                    </span>
                  )}
                </div>

                {/* Usage progress */}
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-stone-500 flex items-center gap-1">
                      <Users className="size-3 text-stone-400" />
                      <span>Redemptions</span>
                    </span>
                    <span className="font-bold text-stone-800 dark:text-stone-200 font-mono">
                      {coupon.usage_count}{" "}
                      {coupon.usage_limit ? `/ ${coupon.usage_limit}` : "(Unlimited)"}
                    </span>
                  </div>
                  {coupon.usage_limit && (
                    <div className="w-full h-1.5 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full transition-all"
                        style={{ width: `${usagePercent}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Expiry / Date Range */}
                <div className="flex items-center justify-between text-[11px] pt-1 text-stone-500 border-t border-stone-100 dark:border-stone-800">
                  <div className="flex items-center gap-1">
                    <Calendar className="size-3 text-stone-400" />
                    <span>
                      {coupon.expiry_date
                        ? isExpired
                          ? "Expired on " + new Date(coupon.expiry_date).toLocaleDateString("en-IN")
                          : "Valid till " + new Date(coupon.expiry_date).toLocaleDateString("en-IN")
                        : "No Expiry Date (Standing)"}
                    </span>
                  </div>

                  <span
                    className={`font-bold ${
                      isExpired
                        ? "text-rose-600"
                        : coupon.is_active
                        ? "text-emerald-600"
                        : "text-stone-400"
                    }`}
                  >
                    {isExpired ? "Expired" : coupon.is_active ? "● Live" : "○ Inactive"}
                  </span>
                </div>

                {/* Action Toolbar */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={coupon.is_active}
                      onChange={() => toggleMutation.mutate(coupon.id)}
                      disabled={toggleMutation.isPending}
                    />
                    <span
                      className={`text-xs font-bold ${
                        coupon.is_active ? "text-emerald-600 dark:text-emerald-400" : "text-stone-400"
                      }`}
                    >
                      {coupon.is_active ? "Active" : "Paused"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEdit(coupon)}
                      className="h-7 px-2 text-xs"
                      title="Edit Coupon"
                    >
                      <Edit2 className="size-3.5 mr-1" />
                      Edit
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Are you sure you want to permanently delete coupon ${coupon.code}?`)) {
                          deleteMutation.mutate(coupon.id);
                        }
                      }}
                      loading={deleteMutation.isPending}
                      className="h-7 px-2 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                      title="Delete Coupon"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* 4. Create / Edit Coupon Modal */}
      {/* ------------------------------------------------------------------- */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-stone-900 p-5 sm:p-6 space-y-4 shadow-2xl border border-stone-200 dark:border-stone-800 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
              <div className="flex items-center gap-2">
                <div className="size-9 rounded-xl bg-amber-600 text-white flex items-center justify-center">
                  <Ticket className="size-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-stone-900 dark:text-white">
                    {editingCoupon ? `Edit Coupon #${editingCoupon.code}` : "Create Promotional Coupon"}
                  </h3>
                  <p className="text-xs text-stone-500">
                    Define discount percentage, thresholds, and first-order rules
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-lg"
              >
                <XCircle className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Coupon Code" hint="Devotees will enter this code at checkout">
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. DIVINE30, FESTIVE100"
                    disabled={!!editingCoupon}
                    className="font-mono font-bold tracking-wider uppercase text-xs"
                    required
                  />
                </Field>

                <Field label="Discount Type">
                  <Select
                    value={formData.discount_type}
                    onChange={(e) => setFormData({ ...formData, discount_type: e.target.value as any })}
                    className="text-xs font-semibold"
                  >
                    <option value="percentage">Percentage Discount (%)</option>
                    <option value="flat">Flat Cash Discount (₹)</option>
                  </Select>
                </Field>
              </div>

              <Field label="Offer Headline / Title" hint="Shown on cart and recommendations banner">
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. 30% Off on Sacred Kashi Consecrated Remedies"
                  className="text-xs font-medium"
                  required
                />
              </Field>

              <Field label="Description (Optional)" hint="Short explanation of why devotee qualifies">
                <Input
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g. Valid on all Rudraksha beads and temple brass yantras"
                  className="text-xs"
                />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field
                  label={formData.discount_type === "percentage" ? "Discount Value (%)" : "Flat Discount (₹)"}
                  hint={formData.discount_type === "percentage" ? "e.g. 30 for 30%" : "e.g. 100 for ₹100"}
                >
                  <Input
                    type="number"
                    min="1"
                    max={formData.discount_type === "percentage" ? "100" : undefined}
                    value={formData.discount_value}
                    onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) || 0 })}
                    className="text-xs font-mono font-bold"
                    required
                  />
                </Field>

                <Field label="Min Order Value (₹)" hint="Cart subtotal needed">
                  <Input
                    type="number"
                    min="0"
                    value={formData.min_order_amount}
                    onChange={(e) => setFormData({ ...formData, min_order_amount: parseFloat(e.target.value) || 0 })}
                    placeholder="0 (Any)"
                    className="text-xs font-mono"
                  />
                </Field>

                <Field
                  label="Max Discount Cap (₹)"
                  hint={formData.discount_type === "percentage" ? "Cap on % discount" : "N/A for flat"}
                >
                  <Input
                    type="number"
                    min="1"
                    value={formData.max_discount_amount || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        max_discount_amount: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                    placeholder="No cap"
                    disabled={formData.discount_type === "flat"}
                    className="text-xs font-mono"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Total Redemptions Cap" hint="Leave empty for unlimited">
                  <Input
                    type="number"
                    min="1"
                    value={formData.usage_limit || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        usage_limit: e.target.value ? parseInt(e.target.value, 10) : undefined,
                      })
                    }
                    placeholder="Unlimited"
                    className="text-xs font-mono"
                  />
                </Field>

                <Field label="Max Uses Per Devotee" hint="How many times each user can redeem">
                  <Input
                    type="number"
                    min="1"
                    value={formData.per_user_limit}
                    onChange={(e) => setFormData({ ...formData, per_user_limit: parseInt(e.target.value, 10) || 1 })}
                    className="text-xs font-mono"
                    required
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Valid From Date">
                  <Input
                    type="date"
                    value={formData.start_date || ""}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="text-xs"
                  />
                </Field>

                <Field label="Expiry Date">
                  <Input
                    type="date"
                    value={formData.expiry_date || ""}
                    onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                    className="text-xs"
                  />
                </Field>
              </div>

              {/* Toggles */}
              <div className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50 space-y-2.5">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-stone-800 dark:text-stone-200">
                  <input
                    type="checkbox"
                    checked={formData.first_order_only}
                    onChange={(e) => setFormData({ ...formData, first_order_only: e.target.checked })}
                    className="rounded border-stone-300 text-amber-600 focus:ring-amber-500 size-4"
                  />
                  <span>🎁 First-Time Order Only (Exclusive to new devotees)</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-stone-800 dark:text-stone-200">
                  <input
                    type="checkbox"
                    checked={formData.is_highlighted}
                    onChange={(e) => setFormData({ ...formData, is_highlighted: e.target.checked })}
                    className="rounded border-stone-300 text-amber-600 focus:ring-amber-500 size-4"
                  />
                  <span>⭐ Highlight in Cart & Offers Drawer (Promote prominently)</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-stone-800 dark:text-stone-200">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="rounded border-stone-300 text-amber-600 focus:ring-amber-500 size-4"
                  />
                  <span>● Active and ready for redemption</span>
                </label>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-200 dark:border-stone-800">
                <Button variant="secondary" size="sm" type="button" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  type="submit"
                  loading={saveMutation.isPending}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
                >
                  {editingCoupon ? "Save Changes" : "Create & Launch Coupon"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
