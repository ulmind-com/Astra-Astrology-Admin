"use client";

import * as React from "react";
import Image from "next/image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Package,
  Clock,
  CheckCircle2,
  AlertCircle,
  Truck,
  Sparkles,
  Flame,
  Plane,
  ShieldCheck,
  Coins,
  Gift,
  ExternalLink,
  Copy,
  ChevronRight,
  Search,
  Filter,
  RefreshCw,
  ShoppingBag,
  MapPin,
  FileText,
  MessageSquare,
  XCircle,
  Check,
  ArrowRight,
  Printer,
  Calendar,
  Send,
  Phone,
  Mail,
  User,
  Info,
  QrCode,
  Maximize2,
  CreditCard,
} from "lucide-react";
import { toast } from "sonner";

import { PanelHeader } from "@/components/layout/panel-shell";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Field,
  Input,
  LoadingBlock,
  Modal,
  Select,
} from "@/components/ui";
import { shopAdminApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { apiBase } from "@/lib/env";
import { useRequireAuth } from "@/providers/auth-provider";

function formatINR(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

// Courier list & Smart Tracking URL generators
const COURIER_PRESETS: Record<string, { label: string; makeUrl: (awb: string) => string }> = {
  DTDC: {
    label: "DTDC Express",
    makeUrl: (awb) => `https://track.dtdc.com/ct/track?trackingNo=${awb.trim()}`,
  },
  "Blue Dart": {
    label: "Blue Dart Express",
    makeUrl: (awb) => `https://www.bluedart.com/tracking?trackFor=0&trackNo=${awb.trim()}`,
  },
  Delhivery: {
    label: "Delhivery Air Cargo",
    makeUrl: (awb) => `https://www.delhivery.com/track/package/${awb.trim()}`,
  },
  "India Post": {
    label: "India Post (Speed Post)",
    makeUrl: (awb) => `https://www.indiapost.gov.in/_layouts/15/dpt.cept.tracking/trackconsignment.aspx`,
  },
  Trackon: {
    label: "Trackon Courier",
    makeUrl: (awb) => `https://trackon.in/tracking.php?awb=${awb.trim()}`,
  },
  Xpressbees: {
    label: "Xpressbees",
    makeUrl: (awb) => `https://www.xpressbees.com/shipment/tracking?awb=${awb.trim()}`,
  },
  Shadowfax: {
    label: "Shadowfax",
    makeUrl: (awb) => `https://tracker.shadowfax.in/#/track?awb=${awb.trim()}`,
  },
  Other: {
    label: "Other Courier",
    makeUrl: (awb) => ``,
  },
};

// Smart auto-detection based on AWB format
function detectCourierFromAwb(awb: string): string {
  const clean = awb.trim().toUpperCase();
  if (!clean) return "DTDC";

  // DTDC AWBs often start with letters like D, B, Z, K or are 9 digits
  if (/^[A-Z]\d{7,10}$/.test(clean) || clean.startsWith("D") || clean.startsWith("B") || clean.startsWith("Z")) {
    return "DTDC";
  }
  // Blue dart is strictly 11 numeric digits
  if (/^\d{11}$/.test(clean)) {
    return "Blue Dart";
  }
  // Delhivery is usually 12-14 numeric digits
  if (/^\d{12,14}$/.test(clean)) {
    return "Delhivery";
  }
  // India Post speed post format: 2 letters, 9 digits, 2 letters (e.g., EE123456789IN)
  if (/^[A-Z]{2}\d{9}[A-Z]{2}$/.test(clean)) {
    return "India Post";
  }
  return "DTDC";
}

const STATUS_MAP: Record<
  string,
  { label: string; badge: string; color: string }
> = {
  placed: { label: "Placed", badge: "bg-stone-100 text-stone-800 border-stone-200", color: "stone" },
  confirmed: { label: "Confirmed", badge: "bg-blue-100 text-blue-900 border-blue-300", color: "blue" },
  sanctifying: { label: "In Kashi Consecration", badge: "bg-amber-100 text-amber-900 border-amber-300", color: "amber" },
  packed: { label: "Wax-Sealed & Packed", badge: "bg-indigo-100 text-indigo-900 border-indigo-300", color: "indigo" },
  shipped: { label: "Dispatched", badge: "bg-purple-100 text-purple-900 border-purple-300", color: "purple" },
  out_for_delivery: { label: "Out for Delivery", badge: "bg-teal-100 text-teal-900 border-teal-300", color: "teal" },
  delivered: { label: "Delivered", badge: "bg-emerald-100 text-emerald-900 border-emerald-300", color: "emerald" },
  rto: { label: "RTO (Courier Return)", badge: "bg-rose-100 text-rose-900 border-rose-300", color: "rose" },
  cancelled: { label: "Cancelled", badge: "bg-rose-100 text-rose-900 border-rose-300", color: "rose" },
  returned: { label: "Returned", badge: "bg-stone-200 text-stone-700 border-stone-400", color: "stone" },
  expired: { label: "Expired (Unpaid)", badge: "bg-amber-50 text-amber-800 border-amber-200", color: "amber" },
};

export default function AdminOrdersPage() {
  const { ready } = useRequireAuth({ roles: ["admin", "super_admin"], signInPath: "/login" });
  const queryClient = useQueryClient();

  // Search & Filter State
  const [activeTab, setActiveTab] = React.useState<string>("all");
  const [search, setSearch] = React.useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = React.useState<string>("");
  const [page, setPage] = React.useState<number>(1);
  const [paymentFilter, setPaymentFilter] = React.useState<string>("all");

  // Detail & Dispatch Drawer Modal
  const [selectedOrder, setSelectedOrder] = React.useState<any | null>(null);
  const [manageModalOpen, setManageModalOpen] = React.useState<boolean>(false);
  const [labelPrintOpen, setLabelPrintOpen] = React.useState<boolean>(false);

  // Dispatch Form State inside Modal
  const [courierPartner, setCourierPartner] = React.useState<string>("DTDC");
  const [awbNumber, setAwbNumber] = React.useState<string>("");
  const [trackingUrl, setTrackingUrl] = React.useState<string>("");
  const [estimatedDelivery, setEstimatedDelivery] = React.useState<string>("");
  const [dispatchNotes, setDispatchNotes] = React.useState<string>("");
  const [targetStatus, setTargetStatus] = React.useState<string>("");
  const [rtoReason, setRtoReason] = React.useState<string>("");

  // Refund Management State
  const [refundTxnId, setRefundTxnId] = React.useState<string>("");
  const [refundNotes, setRefundNotes] = React.useState<string>("");
  const [qrZoomOpen, setQrZoomOpen] = React.useState<boolean>(false);

  // Search debounce
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Fetch Orders Query
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin_shop_orders", page, activeTab, paymentFilter, debouncedSearch],
    queryFn: async () => {
      let statusParam: string | undefined = undefined;
      let refundStatusParam: string | undefined = undefined;
      if (activeTab === "refund_pending") refundStatusParam = "pending";
      else if (activeTab === "placed") statusParam = "placed";
      else if (activeTab === "needs_consecration") statusParam = "confirmed";
      else if (activeTab === "sanctifying") statusParam = "sanctifying";
      else if (activeTab === "packed") statusParam = "packed";
      else if (activeTab === "shipped") statusParam = "shipped";
      else if (activeTab === "delivered") statusParam = "delivered";
      else if (activeTab === "rto") statusParam = "rto";
      else if (activeTab === "cancelled") statusParam = "cancelled";
      else if (activeTab === "abandoned") statusParam = "abandoned";
      else if (activeTab === "expired") statusParam = "expired";

      const res = await shopAdminApi.listOrders({
        page,
        limit: 25,
        status: statusParam,
        refund_status: refundStatusParam,
        payment_status: paymentFilter !== "all" ? paymentFilter : undefined,
        search: debouncedSearch || undefined,
      });
      return res;
    },
    enabled: ready,
  });

  const orders = data?.items || [];
  const totalCount = data?.total || 0;

  // Complete refund mutation
  const completeRefundMutation = useMutation({
    mutationFn: async ({
      orderId,
      transactionId,
      notes,
    }: {
      orderId: string;
      transactionId?: string;
      notes?: string;
    }) => {
      return await shopAdminApi.completeRefund(orderId, {
        transaction_id: transactionId?.trim() || undefined,
        notes: notes?.trim() || undefined,
      });
    },
    onSuccess: (updated) => {
      toast.success(
        `Refund completed for Order #${updated.order_number}! Customer email sent & QR code purged from Cloudinary.`
      );
      setSelectedOrder(updated);
      setRefundTxnId("");
      setRefundNotes("");
      queryClient.invalidateQueries({ queryKey: ["admin_shop_orders"] });
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : "Failed to complete refund";
      toast.error(msg);
    },
  });

  // Update order mutation
  const updateMutation = useMutation({
    mutationFn: async ({ orderId, payload }: { orderId: string; payload: any }) => {
      return await shopAdminApi.updateOrder(orderId, payload);
    },
    onSuccess: (updated) => {
      toast.success(`Order #${updated.order_number} status updated to ${updated.order_status}`);
      setSelectedOrder(updated);
      queryClient.invalidateQueries({ queryKey: ["admin_shop_orders"] });
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : "Failed to update order";
      toast.error(msg);
    },
  });

  // Cancel order mutation
  const cancelMutation = useMutation({
    mutationFn: async ({ orderId, reason }: { orderId: string; reason?: string }) => {
      return await shopAdminApi.cancelOrder(orderId, reason);
    },
    onSuccess: (updated) => {
      toast.success(`Order #${updated.order_number} cancelled and stock restored`);
      setSelectedOrder(updated);
      queryClient.invalidateQueries({ queryKey: ["admin_shop_orders"] });
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : "Failed to cancel order";
      toast.error(msg);
    },
  });

  // Manual sweep of expired abandoned checkouts
  const sweepMutation = useMutation({
    mutationFn: async () => {
      return await shopAdminApi.sweepAbandonedInventory();
    },
    onSuccess: (res: any) => {
      const count = res?.restored_orders_count ?? 0;
      toast.success(`Inventory TTL Sweep: ${count} expired checkout(s) restored.`);
      refetch();
      queryClient.invalidateQueries({ queryKey: ["admin_shop_orders"] });
      queryClient.invalidateQueries({ queryKey: ["shop_inventory"] });
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : "Failed to sweep expired checkouts";
      toast.error(msg);
    },
  });

  // Sync modal state when an order is opened
  const handleOpenManageModal = (order: any) => {
    setSelectedOrder(order);
    const existingCourier = order.courier_partner || "DTDC";
    setCourierPartner(existingCourier);
    setAwbNumber(order.tracking_id || "");
    setTrackingUrl(order.tracking_url || "");
    setEstimatedDelivery(
      order.estimated_delivery_date
        ? new Date(order.estimated_delivery_date).toISOString().slice(0, 10)
        : ""
    );
    setDispatchNotes("");
    setRtoReason(order.rto_reason || "");
    setRefundTxnId("");
    setRefundNotes("");
    setQrZoomOpen(false);
    setTargetStatus(order.order_status);
    setManageModalOpen(true);
  };

  // Smart AWB handler: auto-generates tracking link
  const handleAwbChange = (newAwb: string) => {
    setAwbNumber(newAwb);
    if (!newAwb.trim()) {
      setTrackingUrl("");
      return;
    }
    // Auto detect courier if currently on DTDC or default
    const detected = detectCourierFromAwb(newAwb);
    let chosenCourier = courierPartner;
    if (courierPartner === "DTDC" || !courierPartner) {
      chosenCourier = detected;
      setCourierPartner(detected);
    }
    const preset = COURIER_PRESETS[chosenCourier] || COURIER_PRESETS.DTDC;
    if (preset && chosenCourier !== "Other") {
      setTrackingUrl(preset.makeUrl(newAwb));
    }
  };

  const handleCourierChange = (newCourier: string) => {
    setCourierPartner(newCourier);
    if (awbNumber.trim() && newCourier !== "Other") {
      const preset = COURIER_PRESETS[newCourier];
      if (preset) {
        setTrackingUrl(preset.makeUrl(awbNumber));
      }
    }
  };

  const handleSaveFulfillment = () => {
    if (!selectedOrder) return;
    const payload: any = {
      order_status: targetStatus,
      courier_partner: courierPartner,
      tracking_id: awbNumber.trim() || undefined,
      tracking_url: trackingUrl.trim() || undefined,
      estimated_delivery_date: estimatedDelivery ? new Date(estimatedDelivery).toISOString() : undefined,
      notes: dispatchNotes.trim() || undefined,
      rto_reason: targetStatus === "rto" ? (rtoReason.trim() || "Courier Return to Origin (Customer Unreached/Refused)") : undefined,
    };
    updateMutation.mutate({ orderId: selectedOrder.id, payload });
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const handlePrintShippingSlip = () => {
    window.print();
  };

  if (!ready || isLoading) {
    return <LoadingBlock label="Loading Remedy Orders Hub..." />;
  }

  // Quick summary counts
  const pendingConsecrationCount = orders.filter(
    (o) => o.order_status === "confirmed" || o.order_status === "placed"
  ).length;
  const inConsecrationCount = orders.filter((o) => o.order_status === "sanctifying").length;
  const inTransitCount = orders.filter(
    (o) => o.order_status === "shipped" || o.order_status === "out_for_delivery"
  ).length;

  return (
    <div className="space-y-6">
      <PanelHeader
        title="Remedy Orders & Sacred Dispatch Hub"
        description="Manage devotee orders, Kashi Vishwanath Pran-Pratishtha consecration progress, and multi-courier dispatch tracking (DTDC, Blue Dart, Delhivery)."
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => sweepMutation.mutate()}
              loading={sweepMutation.isPending}
              title="Sweep expired unpaid checkouts and restore reserved stock"
            >
              <Sparkles className="size-3.5 mr-1 text-purple-600" />
              Sweep Expired Carts
            </Button>
            <Button variant="secondary" size="sm" onClick={() => refetch()} loading={isFetching}>
              <RefreshCw className="size-3.5 mr-1" />
              Refresh
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
            <div className="size-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <Package className="size-5" />
            </div>
            <div>
              <span className="text-xs text-stone-500 font-medium">Total Orders</span>
              <div className="text-lg font-bold text-stone-900 dark:text-white">{totalCount}</div>
            </div>
          </CardBody>
        </Card>

        <Card className="border border-amber-200 dark:border-amber-900/40 bg-amber-50/30">
          <CardBody className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <Flame className="size-5 animate-pulse text-orange-600" />
            </div>
            <div>
              <span className="text-xs text-amber-900 font-medium">Ready for Kashi Consecration</span>
              <div className="text-lg font-bold text-amber-950">{pendingConsecrationCount}</div>
            </div>
          </CardBody>
        </Card>

        <Card className="border border-indigo-200 dark:border-indigo-900/40 bg-indigo-50/30">
          <CardBody className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
              <Plane className="size-5 text-indigo-600" />
            </div>
            <div>
              <span className="text-xs text-indigo-900 font-medium">In Express Air Cargo</span>
              <div className="text-lg font-bold text-indigo-950">{inTransitCount}</div>
            </div>
          </CardBody>
        </Card>

        <Card className="border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/30">
          <CardBody className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <ShieldCheck className="size-5 text-emerald-600" />
            </div>
            <div>
              <span className="text-xs text-emerald-900 font-medium">Delivered & Consecrated</span>
              <div className="text-lg font-bold text-emerald-950">
                {orders.filter((o) => o.order_status === "delivered").length}
              </div>
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
              { id: "all", label: "All Valid Orders" },
              { id: "placed", label: "New (Placed)" },
              { id: "refund_pending", label: "⚠️ Refund Requests" },
              { id: "needs_consecration", label: `Queued for Kashi (${pendingConsecrationCount})` },
              { id: "sanctifying", label: `In Pooja (${inConsecrationCount})` },
              { id: "packed", label: "Packed & Sealed" },
              { id: "shipped", label: `In Transit (${inTransitCount})` },
              { id: "delivered", label: "Delivered" },
              { id: "rto", label: "RTO (Courier Return)" },
              { id: "cancelled", label: "Cancelled" },
              { id: "abandoned", label: "Abandoned Checkouts" },
              { id: "expired", label: "Expired (Unpaid)" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
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

          {/* Search bar & Payment Filter */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-stone-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by Order ID, Devotee Name, Phone, Email, or City..."
                className="pl-9 text-xs"
              />
            </div>

            <div className="w-full sm:w-48 shrink-0">
              <Select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="text-xs"
              >
                <option value="all">All Payment Methods</option>
                <option value="paid">Online Paid (Razorpay)</option>
                <option value="pending">Cash on Delivery (Pending)</option>
              </Select>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* ------------------------------------------------------------------- */}
      {/* 3. Orders Table */}
      {/* ------------------------------------------------------------------- */}
      <Card className="border border-stone-200 dark:border-stone-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 dark:bg-stone-900/60 text-stone-500 font-bold uppercase tracking-wider border-b border-stone-200 dark:border-stone-800">
              <tr>
                <th className="p-3.5">Order ID & Date</th>
                <th className="p-3.5">Devotee & Sankalpa</th>
                <th className="p-3.5">Items & Gifts</th>
                <th className="p-3.5">Total & Payment</th>
                <th className="p-3.5">Consecration / Logistics Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800/80">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-stone-500">
                    No remedy orders found matching this filter.
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const cfg = STATUS_MAP[order.order_status] || {
                    label: order.order_status,
                    badge: "bg-stone-100 text-stone-800",
                  };
                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-amber-50/30 dark:hover:bg-stone-900/40 transition-colors"
                    >
                      {/* Order ID & Date */}
                      <td className="p-3.5 align-top">
                        <div className="font-mono font-bold text-stone-900 dark:text-white flex items-center gap-1">
                          <span>#{order.order_number}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(order.order_number)}
                            className="text-stone-400 hover:text-stone-700 p-0.5"
                          >
                            <Copy className="size-3" />
                          </button>
                        </div>
                        <div className="text-[11px] text-stone-500">
                          {new Date(order.created_at).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                      </td>

                      {/* Devotee & Sankalpa Info */}
                      <td className="p-3.5 align-top space-y-0.5">
                        <div className="font-bold text-stone-900 dark:text-white">
                          {order.sankalpa?.devotee_name ||
                            order.shipping_address?.recipient_name ||
                            "Devotee"}
                        </div>
                        {order.sankalpa?.gotra && (
                          <div className="text-[11px] text-amber-800 font-medium">
                            🪔 Gotra: {order.sankalpa.gotra}
                          </div>
                        )}
                        <div className="text-[10px] text-stone-500">
                          {order.shipping_address?.city}, {order.shipping_address?.state} ({order.shipping_address?.pincode})
                        </div>
                      </td>

                      {/* Items */}
                      <td className="p-3.5 align-top space-y-1">
                        <div className="font-medium text-stone-800 dark:text-stone-200 max-w-xs truncate">
                          {order.items?.map((it: any) => `${it.title} (x${it.quantity})`).join(", ")}
                        </div>
                        {order.free_gifts && order.free_gifts.length > 0 && (
                          <div className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-900/50 px-2 py-0.5">
                            <Gift className="size-3 text-amber-600" />
                            <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300">
                              + Gift: {order.free_gifts[0]?.title || order.free_gifts[0]?.badge}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Total & Payment */}
                      <td className="p-3.5 align-top space-y-1">
                        <div className="font-bold text-stone-900 dark:text-white">
                          {formatINR(order.grand_total)}
                        </div>
                        <span
                          className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            order.payment_method === "razorpay"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-stone-200 text-stone-700"
                          }`}
                        >
                          {order.payment_method === "razorpay" ? "Prepaid (Online)" : "COD"}
                        </span>
                      </td>

                      {/* Status & Courier */}
                      <td className="p-3.5 align-top space-y-1">
                        <span
                          className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${cfg.badge}`}
                        >
                          {cfg.label}
                        </span>

                        {order.refund_status === "pending" && (
                          <div className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-900 border border-rose-300">
                            <AlertCircle className="size-3 text-rose-600 animate-pulse" />
                            <span>Refund Pending ({formatINR(order.refund_amount || order.grand_total)})</span>
                          </div>
                        )}

                        {order.refund_status === "completed" && (
                          <div className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="size-3 text-emerald-600" />
                            <span>Refunded</span>
                          </div>
                        )}

                        {order.tracking_id && (
                          <div className="text-[11px] text-indigo-700 font-medium flex items-center gap-1">
                            <Plane className="size-3" />
                            <span>
                              {order.courier_partner || "Courier"}: {order.tracking_id}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Action */}
                      <td className="p-3.5 align-top text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`${apiBase}/admin/shop/orders/${order.id}/invoice/html?print=true`, "_blank")}
                            title="Print GST Invoice / Packing Slip"
                            className="h-8 text-xs font-bold text-amber-800 border-amber-300 hover:bg-amber-50"
                          >
                            <Printer className="size-3.5 mr-1 text-amber-600" />
                            <span>Invoice</span>
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleOpenManageModal(order)}
                            className="h-8 text-xs font-bold"
                          >
                            <span>Manage</span>
                            <ChevronRight className="size-3.5 ml-1" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ------------------------------------------------------------------- */}
      {/* 4. Order Management & Smart Dispatch Modal */}
      {/* ------------------------------------------------------------------- */}
      {manageModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-stone-900 p-5 sm:p-6 space-y-5 shadow-2xl border border-stone-200 dark:border-stone-800 my-8 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
              <div className="flex items-center gap-2">
                <div className="size-9 rounded-xl bg-amber-600 text-white flex items-center justify-center">
                  <Package className="size-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-stone-900 dark:text-white flex items-center gap-2">
                    <span>Manage Order #{selectedOrder.order_number}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(selectedOrder.order_number)}
                      className="text-stone-400 hover:text-stone-700"
                    >
                      <Copy className="size-3.5" />
                    </button>
                  </h3>
                  <p className="text-xs text-stone-500">
                    Grand Total: {formatINR(selectedOrder.grand_total)} • Method:{" "}
                    {selectedOrder.payment_method?.toUpperCase()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(`${apiBase}/admin/shop/orders/${selectedOrder.id}/invoice/html?print=true`, "_blank")}
                  className="text-xs font-bold border-amber-300 text-amber-800 hover:bg-amber-50"
                >
                  <Printer className="size-3.5 mr-1 text-amber-600" />
                  <span>Print Invoice & Slip</span>
                </Button>
                <button
                  type="button"
                  onClick={() => setManageModalOpen(false)}
                  className="text-stone-400 hover:text-stone-600 p-1 rounded-lg"
                >
                  <XCircle className="size-5" />
                </button>
              </div>
            </div>

            {/* Devotee Sankalpa Card */}
            {selectedOrder.sankalpa?.devotee_name && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-950 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-amber-900">
                  <Sparkles className="size-3.5 text-orange-600" />
                  <span>Kashi Vishwanath Devotee Sankalpa Details</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                  <div>
                    <span className="text-stone-500 block">Devotee Name:</span>
                    <span className="font-bold">{selectedOrder.sankalpa.devotee_name}</span>
                  </div>
                  <div>
                    <span className="text-stone-500 block">Gotra:</span>
                    <span className="font-bold">{selectedOrder.sankalpa.gotra || "Kashyapa (Default)"}</span>
                  </div>
                  <div>
                    <span className="text-stone-500 block">Birth Nakshatra:</span>
                    <span className="font-bold">{selectedOrder.sankalpa.birth_nakshatra || "Not specified"}</span>
                  </div>
                  {selectedOrder.sankalpa.specific_wish && (
                    <div className="col-span-2 sm:col-span-3">
                      <span className="text-stone-500 block">Prayer Intention:</span>
                      <span className="italic">"{selectedOrder.sankalpa.specific_wish}"</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Complimentary gift(s) to INCLUDE in this parcel — packing reminder */}
            {selectedOrder.free_gifts && selectedOrder.free_gifts.length > 0 && (
              <div className="rounded-xl border-2 border-amber-300 bg-amber-50/80 dark:bg-amber-950/20 p-3.5 space-y-2">
                <div className="font-bold flex items-center gap-1.5 text-amber-900 dark:text-amber-300 text-sm">
                  <Gift className="size-4 text-amber-600" />
                  <span>Include FREE Gift in this parcel</span>
                </div>
                {selectedOrder.free_gifts.map((g: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-2 rounded-lg bg-white dark:bg-stone-900 border border-amber-200 dark:border-amber-900/40 px-3 py-2"
                  >
                    <span className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                      {g.title || g.badge}
                    </span>
                    <span className="shrink-0 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                      FREE{g.value ? ` · ${formatINR(g.value)}` : ""}
                    </span>
                  </div>
                ))}
                <p className="text-[11px] text-amber-800 dark:text-amber-300/80">
                  Please pack the complimentary gift along with the order before dispatch.
                </p>
              </div>
            )}

            {/* ----------------------------------------------------------- */}
            {/* Devotee Refund Payout Hub (High Priority Action) */}
            {/* ----------------------------------------------------------- */}
            {selectedOrder.refund_status === "pending" && (
              <div className="rounded-2xl border-2 border-rose-400 bg-rose-50/70 dark:bg-rose-950/30 p-5 space-y-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="size-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <CreditCard className="size-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-rose-950 dark:text-rose-200 flex items-center gap-2">
                        <span>Devotee Refund Payout Hub</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-200 text-rose-900 border border-rose-300 uppercase tracking-wider">
                          Action Required
                        </span>
                      </h4>
                      <p className="text-xs text-rose-700 dark:text-rose-300">
                        Customer cancelled within allowed window. Refund amount:{" "}
                        <b>{formatINR(selectedOrder.refund_amount || selectedOrder.grand_total)}</b> (SLA:{" "}
                        {selectedOrder.refund_sla_days || 3} business days).
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[11px] text-stone-500 block">Total to Refund</span>
                    <span className="text-xl font-black text-rose-700 dark:text-rose-400 font-mono">
                      {formatINR(selectedOrder.refund_amount || selectedOrder.grand_total)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                  {/* Devotee UPI Info */}
                  <div className="p-3.5 rounded-xl bg-white dark:bg-stone-900 border border-rose-200 dark:border-rose-900 space-y-2">
                    <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                      Devotee UPI ID
                    </span>
                    <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                      <code className="text-xs font-mono font-bold text-stone-900 dark:text-white break-all">
                        {selectedOrder.refund_upi_id || "No UPI ID specified"}
                      </code>
                      {selectedOrder.refund_upi_id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(selectedOrder.refund_upi_id)}
                          className="h-7 px-2 text-xs shrink-0"
                          title="Copy UPI ID"
                        >
                          <Copy className="size-3.5 mr-1" />
                          Copy
                        </Button>
                      )}
                    </div>
                    {selectedOrder.refund_requested_at && (
                      <p className="text-[10px] text-stone-500">
                        Cancellation Request: {new Date(selectedOrder.refund_requested_at).toLocaleString("en-IN")}
                      </p>
                    )}
                  </div>

                  {/* Devotee UPI QR Code */}
                  <div className="p-3.5 rounded-xl bg-white dark:bg-stone-900 border border-rose-200 dark:border-rose-900 space-y-2">
                    <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                      Devotee UPI QR Code
                    </span>
                    {selectedOrder.refund_qr_code_url ? (
                      <div className="flex items-center gap-3">
                        <div
                          onClick={() => setQrZoomOpen(true)}
                          className="relative size-20 rounded-lg border border-stone-200 dark:border-stone-700 overflow-hidden cursor-pointer hover:opacity-90 group shrink-0 bg-stone-100"
                          title="Click to zoom and scan QR"
                        >
                          <Image
                            src={selectedOrder.refund_qr_code_url}
                            alt="Devotee Refund UPI QR"
                            fill
                            className="object-contain"
                            unoptimized
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                            <Maximize2 className="size-4" />
                          </div>
                        </div>
                        <div className="space-y-1 text-xs">
                          <p className="font-semibold text-stone-800 dark:text-stone-200">
                            Screenshot uploaded by devotee
                          </p>
                          <button
                            type="button"
                            onClick={() => setQrZoomOpen(true)}
                            className="text-xs text-rose-600 dark:text-rose-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <QrCode className="size-3.5" />
                            <span>Scan QR (Click to Enlarge)</span>
                          </button>
                          <p className="text-[10px] text-stone-400">
                            *Auto-purged from Cloudinary once marked complete.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 rounded-lg bg-stone-50 dark:bg-stone-800 text-stone-400 text-xs italic text-center">
                        No QR code image uploaded (UPI ID provided).
                      </div>
                    )}
                  </div>
                </div>

                {/* Refund Execution Form */}
                <div className="p-3.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-3">
                  <span className="font-bold text-xs text-stone-900 dark:text-white block">
                    Record Payout & Finalize Refund
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Bank UTR / Transaction Reference (Optional)">
                      <Input
                        value={refundTxnId}
                        onChange={(e) => setRefundTxnId(e.target.value)}
                        placeholder="e.g. UPI/328491823/ICICI or UTR number"
                        className="text-xs font-mono"
                      />
                    </Field>
                    <Field label="Admin Notes (Optional)">
                      <Input
                        value={refundNotes}
                        onChange={(e) => setRefundNotes(e.target.value)}
                        placeholder="e.g. Paid via PhonePe by Admin"
                        className="text-xs"
                      />
                    </Field>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                    <p className="text-[11px] text-stone-500">
                      ⚡ Completing refund will send confirmation email to customer & purge QR image from Cloudinary.
                    </p>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        if (
                          confirm(
                            `Confirm that ₹${selectedOrder.refund_amount || selectedOrder.grand_total} has been refunded to ${selectedOrder.refund_upi_id || "the devotee"}?`
                          )
                        ) {
                          completeRefundMutation.mutate({
                            orderId: selectedOrder.id,
                            transactionId: refundTxnId,
                            notes: refundNotes,
                          });
                        }
                      }}
                      loading={completeRefundMutation.isPending}
                      className="bg-rose-600 hover:bg-rose-700 text-white font-bold shrink-0"
                    >
                      <CheckCircle2 className="size-3.5 mr-1" />
                      Complete Refund & Send Email
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Completed Refund Card */}
            {selectedOrder.refund_status === "completed" && (
              <div className="rounded-xl border border-emerald-300 bg-emerald-50/70 dark:bg-emerald-950/20 p-4 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-bold flex items-center gap-1.5 text-emerald-900 dark:text-emerald-200">
                    <CheckCircle2 className="size-4 text-emerald-600" />
                    <span>Refund Completed & Paid Out</span>
                  </div>
                  <span className="font-mono font-bold text-emerald-800 dark:text-emerald-300 text-sm">
                    {formatINR(selectedOrder.refund_amount || selectedOrder.grand_total)}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-emerald-950 dark:text-emerald-200">
                  <div>
                    <span className="text-stone-500 block">Devotee UPI ID:</span>
                    <span className="font-mono font-bold">{selectedOrder.refund_upi_id || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-stone-500 block">Bank UTR / Ref:</span>
                    <span className="font-mono font-bold">{selectedOrder.refund_transaction_id || "Direct Transfer"}</span>
                  </div>
                  <div>
                    <span className="text-stone-500 block">Completed On:</span>
                    <span className="font-medium">
                      {selectedOrder.refund_completed_at
                        ? new Date(selectedOrder.refund_completed_at).toLocaleString("en-IN")
                        : "Completed"}
                    </span>
                  </div>
                </div>
                {selectedOrder.refund_notes && (
                  <p className="text-[11px] text-stone-600 dark:text-stone-400 italic">
                    Note: "{selectedOrder.refund_notes}"
                  </p>
                )}
                <p className="text-[10px] text-stone-500">
                  🛡️ Cloudinary QR code screenshot was permanently purged upon completion to conserve storage.
                </p>
              </div>
            )}

            {/* Shipping Address & Customer Contact */}
            <div className="rounded-xl border border-stone-200 dark:border-stone-800 p-3.5 text-xs space-y-1">
              <span className="font-bold text-stone-900 dark:text-white flex items-center gap-1.5">
                <MapPin className="size-3.5 text-stone-500" />
                Shipping Destination:
              </span>
              <p className="text-stone-600 dark:text-stone-300">
                {selectedOrder.shipping_address?.recipient_name} | {selectedOrder.shipping_address?.street_address},{" "}
                {selectedOrder.shipping_address?.city}, {selectedOrder.shipping_address?.state} -{" "}
                {selectedOrder.shipping_address?.pincode}
              </p>
              <div className="flex items-center gap-4 text-stone-500 pt-1">
                <span>Phone: {selectedOrder.shipping_address?.phone_number || selectedOrder.user_phone}</span>
                <span>Email: {selectedOrder.user_email}</span>
              </div>
            </div>

            {/* ----------------------------------------------------------- */}
            {/* Sacred Fulfillment & Courier Dispatch Hub */}
            {/* ----------------------------------------------------------- */}
            <div className="rounded-xl border-2 border-indigo-200 bg-indigo-50/30 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-indigo-950 flex items-center gap-2">
                  <Plane className="size-4 text-indigo-600" />
                  <span>Update Consecration & Dispatch Telemetry</span>
                </span>
                <Badge tone="neutral" className="bg-white">
                  Current: {selectedOrder.order_status?.toUpperCase()}
                </Badge>
              </div>

              {/* Status Selector Stepper */}
              <Field label="Set Order Stage">
                <Select
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value)}
                  className="text-xs font-bold"
                >
                  <option value="confirmed">1. Confirmed (Queued for Kashi Consecration)</option>
                  <option value="sanctifying">2. In Kashi Consecration (Puja in Progress)</option>
                  <option value="packed">3. Wax-Sealed & Packed (Ready to Ship)</option>
                  <option value="shipped">4. Dispatched via Courier (In Transit)</option>
                  <option value="out_for_delivery">5. Out for Delivery</option>
                  <option value="delivered">6. Delivered (Unlocks 100% Cashback Coins)</option>
                  <option value="rto">7. RTO (Courier Return to Origin - Parcel Undelivered)</option>
                  <option value="cancelled">Cancelled</option>
                </Select>
              </Field>

              {/* RTO Specific Details */}
              {targetStatus === "rto" && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 space-y-2">
                  <Field label="RTO Reason" hint="Why was the parcel returned by courier?">
                    <Input
                      value={rtoReason}
                      onChange={(e) => setRtoReason(e.target.value)}
                      placeholder="e.g. Customer refused delivery / Phone unreachable / Fake Address"
                      className="text-xs font-medium"
                    />
                  </Field>
                  <p className="text-[11px] text-rose-800 leading-relaxed">
                    ⚠️ <b>Automated Protection Active:</b> Marking as RTO will atomically restore product stock to the warehouse, cancel any pending cashback coins, and record the attempt. If this phone number exceeds the max RTO threshold, COD will be automatically blocked for this user.
                  </p>
                </div>
              )}

              {/* Courier Dispatch Controls (Shows prominently for Shipped / Packed) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <Field label="Courier Partner">
                  <Select
                    value={courierPartner}
                    onChange={(e) => handleCourierChange(e.target.value)}
                    className="text-xs"
                  >
                    {Object.keys(COURIER_PRESETS).map((key) => (
                      <option key={key} value={key}>
                        {COURIER_PRESETS[key].label}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field label="AWB / Tracking Number" hint="Paste DTDC/Blue Dart AWB (Auto-detects URL)">
                  <Input
                    value={awbNumber}
                    onChange={(e) => handleAwbChange(e.target.value)}
                    placeholder="e.g. D12345678 or 142100874"
                    className="text-xs font-mono font-bold"
                  />
                </Field>
              </div>

              {/* Live Tracking URL with 1-click Test */}
              <Field label="Live Tracking URL" hint="Auto-generated official tracking link sent to devotee">
                <div className="flex gap-2">
                  <Input
                    value={trackingUrl}
                    onChange={(e) => setTrackingUrl(e.target.value)}
                    placeholder="https://track.dtdc.com/ct/track?trackingNo=..."
                    className="text-xs flex-1"
                  />
                  {trackingUrl && (
                    <a
                      href={trackingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold flex items-center gap-1 shrink-0"
                    >
                      <span>Test Link</span>
                      <ExternalLink className="size-3" />
                    </a>
                  )}
                </div>
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Estimated Delivery Date">
                  <Input
                    type="date"
                    value={estimatedDelivery}
                    onChange={(e) => setEstimatedDelivery(e.target.value)}
                    className="text-xs"
                  />
                </Field>

                <Field label="Fulfillment Notes (Optional)">
                  <Input
                    value={dispatchNotes}
                    onChange={(e) => setDispatchNotes(e.target.value)}
                    placeholder="e.g. Consecrated with Kashi Gangajal, DTDC Air Cargo"
                    className="text-xs"
                  />
                </Field>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-indigo-200/80">
                <div className="flex items-center gap-2">
                  {/* WhatsApp Customer Update Button */}
                  <a
                    href={`https://wa.me/${(selectedOrder.shipping_address?.phone_number || selectedOrder.user_phone || "").replace(/\D/g, "")}?text=নমস্কার%20${encodeURIComponent(selectedOrder.sankalpa?.devotee_name || selectedOrder.shipping_address?.recipient_name || "")},%20আপনার%20অর্ডার%20${selectedOrder.order_number}%20কাশীর%20বিশ্বনাথ%20ঘাটে%20পবিত্র%20প্রাণ-প্রতিষ্ঠা%20সম্পন্ন%20হয়েছে।%20আপনার%20পার্সেলটি%20${encodeURIComponent(courierPartner)}%20(AWB:%20${awbNumber})%20মারফত%20ডিসপ্যাচ%20হয়েছে।%20ট্র্যাক%20করুন:%20${encodeURIComponent(trackingUrl)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-2xs"
                  >
                    <MessageSquare className="size-3.5" />
                    <span>Send WhatsApp Ping</span>
                  </a>

                  {/* Print Shipping Slip Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const printContent = `
                        <html>
                          <head>
                            <title>Shipping Label - ${selectedOrder.order_number}</title>
                            <style>
                              body { font-family: sans-serif; padding: 20px; font-size: 13px; max-width: 500px; margin: auto; border: 2px dashed #444; border-radius: 8px; }
                              h2 { margin: 0 0 5px 0; font-size: 18px; }
                              .badge { background: #fef3c7; color: #92400e; padding: 3px 8px; border-radius: 4px; font-weight: bold; }
                              .to { margin-top: 15px; border-top: 1px solid #ccc; padding-top: 10px; }
                              .footer { margin-top: 20px; font-size: 11px; color: #666; border-top: 1px solid #eee; padding-top: 8px; }
                            </style>
                          </head>
                          <body>
                            <h2>DIVINLINK SACRED REMEDIES</h2>
                            <p><b>From:</b> DivinLink Kashi Consecration Hub, Varanasi, UP - 221001</p>
                            <p><b>Order ID:</b> #${selectedOrder.order_number} | <b>Courier:</b> ${courierPartner} | <b>AWB:</b> ${awbNumber || 'PENDING'}</p>
                            <div class="to">
                              <span class="badge">CONSECRATED VEDIC SHIPMENT</span>
                              <p><b>Deliver To:</b><br/>
                              ${selectedOrder.shipping_address?.recipient_name}<br/>
                              ${selectedOrder.shipping_address?.street_address}<br/>
                              ${selectedOrder.shipping_address?.city}, ${selectedOrder.shipping_address?.state} - <b>${selectedOrder.shipping_address?.pincode}</b><br/>
                              Phone: ${selectedOrder.shipping_address?.phone_number || selectedOrder.user_phone}</p>
                            </div>
                            ${selectedOrder.sankalpa?.gotra ? `<p><b>Devotee Gotra:</b> ${selectedOrder.sankalpa.gotra}</p>` : ''}
                            <div class="footer">
                              ⚠️ FRAGILE CONSECRATED ITEM: Contains Vedic Rudraksha Beads, Crystal Plate & Holy Ganga Jal. Handle with divine care.
                            </div>
                          </body>
                        </html>
                      `;
                      const win = window.open("", "_blank");
                      win?.document.write(printContent);
                      win?.document.close();
                      win?.print();
                    }}
                  >
                    <Printer className="size-3.5 mr-1" />
                    Print Label
                  </Button>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSaveFulfillment}
                  loading={updateMutation.isPending}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                >
                  <Send className="size-3.5 mr-1" />
                  Save & Update Telemetry
                </Button>
              </div>
            </div>

            {/* Cancel Order Section (For Admins) */}
            {selectedOrder.order_status !== "cancelled" && (
              <div className="pt-2 flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-rose-600 hover:bg-rose-50 text-xs"
                  onClick={() => {
                    if (confirm("Are you sure you want to cancel this order and restore stock?")) {
                      cancelMutation.mutate({ orderId: selectedOrder.id });
                    }
                  }}
                  loading={cancelMutation.isPending}
                >
                  <XCircle className="size-3.5 mr-1" />
                  Cancel Order & Restore Inventory
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. QR Code Zoom Modal */}
      {qrZoomOpen && selectedOrder?.refund_qr_code_url && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4 animate-in fade-in cursor-pointer"
          onClick={() => setQrZoomOpen(false)}
        >
          <div
            className="relative max-w-sm w-full bg-white dark:bg-stone-900 rounded-2xl p-6 text-center space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-stone-200 dark:border-stone-800">
              <div className="text-left">
                <h4 className="font-bold text-sm text-stone-900 dark:text-white">
                  Scan Devotee UPI QR Code
                </h4>
                <p className="text-[11px] text-stone-500">
                  Amount to Refund: {formatINR(selectedOrder.refund_amount || selectedOrder.grand_total)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setQrZoomOpen(false)}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-lg"
              >
                <XCircle className="size-5" />
              </button>
            </div>

            <div className="relative size-72 mx-auto rounded-xl border-2 border-stone-200 overflow-hidden bg-white p-2">
              <Image
                src={selectedOrder.refund_qr_code_url}
                alt="Devotee Refund UPI QR Code"
                fill
                className="object-contain"
                unoptimized
              />
            </div>

            {selectedOrder.refund_upi_id && (
              <div className="flex items-center justify-center gap-2 p-2 rounded-lg bg-stone-100 dark:bg-stone-800 text-xs font-mono font-bold">
                <span>{selectedOrder.refund_upi_id}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(selectedOrder.refund_upi_id)}
                  className="text-stone-500 hover:text-stone-800"
                  title="Copy UPI ID"
                >
                  <Copy className="size-3.5" />
                </button>
              </div>
            )}

            <p className="text-xs text-stone-500">
              Scan with PhonePe, Google Pay, or Paytm from your phone to send the refund.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
