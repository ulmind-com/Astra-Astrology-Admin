"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  AlertTriangle,
  ArrowUpDown,
  Boxes,
  CheckCircle2,
  DollarSign,
  Edit2,
  Filter,
  Minus,
  Package,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  TrendingDown,
  Warehouse,
  XCircle,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";

import { PanelHeader } from "@/components/layout/panel-shell";
import {
  Badge,
  Button,
  Card,
  CardBody,
  EmptyState,
  Input,
  LoadingBlock,
  Pagination,
  Select,
} from "@/components/ui";
import { shopAdminApi } from "@/lib/api";
import type { ShopInventorySummary, ShopProduct, ShopProductCategory } from "@/types";

export default function InventoryPage() {
  const queryClient = useQueryClient();

  // Filter state
  const [activeTab, setActiveTab] = React.useState<"all" | "out_of_stock" | "low_stock" | "in_stock">(
    "all"
  );
  const [searchTerm, setSearchTerm] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState("");
  const [page, setPage] = React.useState(1);
  const pageSize = 20;

  // Inline custom quantity input state map
  const [customStockInput, setCustomStockInput] = React.useState<Record<string, string>>({});

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Inventory KPI summary query
  const {
    data: summary,
    isLoading: isLoadingSummary,
    refetch: refetchSummary,
  } = useQuery<ShopInventorySummary>({
    queryKey: ["shop_inventory"],
    queryFn: async () => {
      const res = await shopAdminApi.getInventorySummary();
      return res!;
    },
  });

  // Categories list
  const { data: categories = [] } = useQuery<ShopProductCategory[]>({
    queryKey: ["shop_categories"],
    queryFn: async () => {
      const res = await shopAdminApi.listCategories(true);
      return res || [];
    },
  });

  // Query products with active tab filter
  const stockStatusParam = activeTab === "all" ? undefined : activeTab;
  const {
    data: productData,
    isLoading: isLoadingProducts,
    isRefetching,
    refetch: refetchProducts,
  } = useQuery({
    queryKey: [
      "shop_products_inventory",
      page,
      debouncedSearch,
      selectedCategory,
      stockStatusParam,
    ],
    queryFn: async () => {
      const res = await shopAdminApi.listProducts({
        search: debouncedSearch || undefined,
        category_id: selectedCategory || undefined,
        stock_status: stockStatusParam,
        page,
        limit: pageSize,
        sort_by: "stock_quantity", // lowest stock first for inventory awareness!
      });
      return res;
    },
  });

  // Stock update mutation
  const stockMutation = useMutation({
    mutationFn: async ({
      id,
      quantity,
      mode,
      reason,
    }: {
      id: string;
      quantity: number;
      mode: "add" | "subtract" | "set";
      reason?: string;
    }) => {
      return await shopAdminApi.updateStock(id, { quantity, mode, reason });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["shop_products_inventory"] });
      queryClient.invalidateQueries({ queryKey: ["shop_products"] });
      queryClient.invalidateQueries({ queryKey: ["shop_inventory"] });
      toast.success(`Stock updated for ${res?.title}: now ${res?.stock_quantity} units.`);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update stock.");
    },
  });

  const handleCustomSetStock = (productId: string) => {
    const rawVal = customStockInput[productId];
    if (rawVal === undefined || rawVal === "") return;
    const val = parseInt(rawVal);
    if (isNaN(val) || val < 0) {
      toast.error("Please enter a valid stock quantity (≥ 0).");
      return;
    }
    stockMutation.mutate({
      id: productId,
      quantity: val,
      mode: "set",
      reason: "Admin manual warehouse restock",
    });
    // Clear input
    setCustomStockInput((prev) => {
      const copy = { ...prev };
      delete copy[productId];
      return copy;
    });
  };

  const handleRefreshAll = () => {
    refetchSummary();
    refetchProducts();
  };

  const products = productData?.items || [];
  const total = productData?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <PanelHeader
        title="Warehouse Inventory & Stock Alerts"
        description="Monitor real-time warehouse counts, low-stock warnings, and execute 1-click batch adjustments."
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshAll}
              disabled={isRefetching}
              className="flex items-center gap-1.5"
            >
              <RefreshCw className={`size-3.5 ${isRefetching ? "animate-spin" : ""}`} />
              Refresh Metrics
            </Button>
            <Link href="/products/new">
              <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white font-bold flex items-center gap-1.5 shadow-sm">
                <Plus className="size-4" />
                Add Product
              </Button>
            </Link>
          </div>
        }
      />

      {/* KPI Alert Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Products */}
        <Card className="rounded-2xl border-slate-200/80 shadow-sm p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Products</span>
            <Boxes className="size-4 text-slate-600" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              {summary?.total_products ?? 0}
            </span>
            <p className="text-[11px] text-slate-400">Total catalog items</p>
          </div>
        </Card>

        {/* Total Units */}
        <Card className="rounded-2xl border-slate-200/80 shadow-sm p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Units</span>
            <Warehouse className="size-4 text-slate-600" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              {summary?.total_stock_units ?? 0}
            </span>
            <p className="text-[11px] text-slate-400">Physical pieces in stock</p>
          </div>
        </Card>

        {/* 🚨 Out of Stock (Red Alert) */}
        <Card
          onClick={() => {
            setActiveTab("out_of_stock");
            setPage(1);
          }}
          className={`rounded-2xl shadow-sm p-4 flex flex-col justify-between cursor-pointer transition-all ${
            (summary?.out_of_stock_count ?? 0) > 0
              ? "border-red-400 bg-red-50/50 hover:bg-red-50 ring-1 ring-red-400/40"
              : "border-slate-200/80 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-red-600">Out of Stock</span>
            <XCircle className="size-4 text-red-600 animate-pulse" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-red-700 tracking-tight">
              {summary?.out_of_stock_count ?? 0}
            </span>
            <p className="text-[11px] text-red-600/80">Requires urgent restocking</p>
          </div>
        </Card>

        {/* ⚠️ Low Stock Alert (Amber Alert) */}
        <Card
          onClick={() => {
            setActiveTab("low_stock");
            setPage(1);
          }}
          className={`rounded-2xl shadow-sm p-4 flex flex-col justify-between cursor-pointer transition-all ${
            (summary?.low_stock_count ?? 0) > 0
              ? "border-amber-400 bg-amber-50/50 hover:bg-amber-50 ring-1 ring-amber-400/40"
              : "border-slate-200/80 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Low Stock</span>
            <AlertTriangle className="size-4 text-amber-600" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-amber-800 tracking-tight">
              {summary?.low_stock_count ?? 0}
            </span>
            <p className="text-[11px] text-amber-700/80">Under threshold (≤5 left)</p>
          </div>
        </Card>

        {/* Healthy Stock */}
        <Card
          onClick={() => {
            setActiveTab("in_stock");
            setPage(1);
          }}
          className="rounded-2xl border-slate-200/80 shadow-sm p-4 flex flex-col justify-between cursor-pointer hover:border-slate-300 transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Healthy</span>
            <CheckCircle2 className="size-4 text-emerald-600" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-emerald-700 tracking-tight">
              {summary?.healthy_stock_count ?? 0}
            </span>
            <p className="text-[11px] text-emerald-600/80">Well stocked remedies</p>
          </div>
        </Card>

        {/* Total Valuation */}
        <Card className="rounded-2xl border-slate-200/80 shadow-sm p-4 flex flex-col justify-between bg-gradient-to-br from-slate-900 to-slate-800 text-white">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Asset Valuation</span>
            <DollarSign className="size-4 text-amber-400" />
          </div>
          <div className="mt-2">
            <span className="text-lg font-black text-white tracking-tight">
              ₹{(summary?.total_inventory_valuation_mrp ?? 0).toLocaleString("en-IN")}
            </span>
            <p className="text-[10px] text-slate-300">
              Cost: ₹{(summary?.total_inventory_valuation_cost ?? 0).toLocaleString("en-IN")}
            </p>
          </div>
        </Card>
      </div>

      {/* Tabs and Filters */}
      <Card className="rounded-2xl border-slate-200/80 shadow-sm">
        <CardBody className="p-4 space-y-4">
          {/* Quick Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3">
            <button
              type="button"
              onClick={() => {
                setActiveTab("all");
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === "all"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All Items ({summary?.total_products ?? 0})
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("low_stock");
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeTab === "low_stock"
                  ? "bg-amber-500 text-white shadow-sm"
                  : "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/60"
              }`}
            >
              <AlertTriangle className="size-3.5" />
              Low Stock Alerts ({summary?.low_stock_count ?? 0})
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("out_of_stock");
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeTab === "out_of_stock"
                  ? "bg-red-600 text-white shadow-sm"
                  : "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200/60"
              }`}
            >
              <XCircle className="size-3.5" />
              Out of Stock ({summary?.out_of_stock_count ?? 0})
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("in_stock");
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeTab === "in_stock"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/60"
              }`}
            >
              <CheckCircle2 className="size-3.5" />
              Healthy ({summary?.healthy_stock_count ?? 0})
            </button>
          </div>

          {/* Search & Category Filter */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <Input
                placeholder="Search inventory by title or SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>

            <div className="flex items-center justify-end text-xs text-slate-500 font-medium">
              Sorted by: <span className="font-bold text-slate-800 ml-1">Lowest Stock First</span>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Inventory Table */}
      <Card className="rounded-2xl border-slate-200/80 shadow-sm overflow-hidden">
        {isLoadingProducts ? (
          <div className="p-12">
            <LoadingBlock label="Loading inventory items..." />
          </div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center">
            <EmptyState
              icon={Boxes}
              title="No inventory records found"
              description="No remedy products match this filter."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3.5">Item & SKU</th>
                  <th className="px-4 py-3.5">Category</th>
                  <th className="px-4 py-3.5">Current Stock Level</th>
                  <th className="px-4 py-3.5">1-Click Quick Adjust</th>
                  <th className="px-4 py-3.5">Set Quantity</th>
                  <th className="px-4 py-3.5 text-right">Holding Value</th>
                  <th className="px-4 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => {
                  const isZero = p.stock_quantity === 0;
                  const isLow = p.stock_quantity > 0 && p.stock_quantity <= p.low_stock_threshold;
                  const holdingMRP = p.stock_quantity * p.mrp;

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isZero
                          ? "bg-red-50/30 border-l-4 border-l-red-500"
                          : isLow
                          ? "bg-amber-50/30 border-l-4 border-l-amber-500"
                          : ""
                      }`}
                    >
                      {/* Product & SKU */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="relative size-11 shrink-0 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                            {p.featured_image ? (
                              <Image
                                src={p.featured_image}
                                alt={p.title}
                                fill
                                sizes="44px"
                                className="object-cover"
                                unoptimized
                              />
                            ) : (
                              <div className="size-full flex items-center justify-center text-slate-400">
                                <Package className="size-5" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 max-w-xs">
                            <span className="font-bold text-slate-900 truncate block">
                              {p.title}
                            </span>
                            <span className="font-mono text-[11px] font-semibold text-slate-400">
                              {p.sku}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3.5">
                        <Badge tone="neutral" className="capitalize">
                          {p.category_slug.replace(/-/g, " ")}
                        </Badge>
                      </td>

                      {/* Stock Level with Alert Badge */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-base font-black font-mono ${
                                isZero
                                  ? "text-red-700"
                                  : isLow
                                  ? "text-amber-800"
                                  : "text-slate-800"
                              }`}
                            >
                              {p.stock_quantity}
                            </span>
                            <span
                              className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                isZero
                                  ? "bg-red-100 text-red-800 border border-red-300"
                                  : isLow
                                  ? "bg-amber-100 text-amber-800 border border-amber-300"
                                  : "bg-emerald-100 text-emerald-800"
                              }`}
                            >
                              {isZero ? "OUT OF STOCK" : isLow ? "LOW STOCK" : "NORMAL"}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">
                            Alert threshold: ≤ {p.low_stock_threshold} units
                          </p>
                        </div>
                      </td>

                      {/* 1-Click Adjust Buttons (-5, -1, +1, +5, +10) */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              stockMutation.mutate({ id: p.id, quantity: 5, mode: "subtract" })
                            }
                            disabled={p.stock_quantity < 5 || stockMutation.isPending}
                            title="Subtract 5"
                            className="text-xs font-bold px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-30 text-slate-700 transition-colors"
                          >
                            -5
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              stockMutation.mutate({ id: p.id, quantity: 1, mode: "subtract" })
                            }
                            disabled={p.stock_quantity <= 0 || stockMutation.isPending}
                            title="Subtract 1"
                            className="size-7 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-30 flex items-center justify-center text-slate-700 transition-colors"
                          >
                            <Minus className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              stockMutation.mutate({ id: p.id, quantity: 1, mode: "add" })
                            }
                            disabled={stockMutation.isPending}
                            title="Add 1"
                            className="size-7 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 flex items-center justify-center transition-colors border border-emerald-200"
                          >
                            <Plus className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              stockMutation.mutate({ id: p.id, quantity: 5, mode: "add" })
                            }
                            disabled={stockMutation.isPending}
                            title="Add 5"
                            className="text-xs font-bold px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 transition-colors border border-emerald-200"
                          >
                            +5
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              stockMutation.mutate({ id: p.id, quantity: 10, mode: "add" })
                            }
                            disabled={stockMutation.isPending}
                            title="Add 10"
                            className="text-xs font-bold px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 transition-colors border border-emerald-200"
                          >
                            +10
                          </button>
                        </div>
                      </td>

                      {/* Direct Absolute Quantity Input */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <Input
                            type="number"
                            min="0"
                            placeholder={String(p.stock_quantity)}
                            value={customStockInput[p.id] ?? ""}
                            onChange={(e) =>
                              setCustomStockInput({ ...customStockInput, [p.id]: e.target.value })
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleCustomSetStock(p.id);
                              }
                            }}
                            className="w-20 text-center font-mono font-bold h-8 text-xs"
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleCustomSetStock(p.id)}
                            disabled={
                              customStockInput[p.id] === undefined ||
                              customStockInput[p.id] === "" ||
                              stockMutation.isPending
                            }
                            className="h-8 px-2 text-xs font-bold"
                          >
                            Set
                          </Button>
                        </div>
                      </td>

                      {/* Holding Value */}
                      <td className="px-4 py-3.5 text-right font-mono text-xs">
                        <span className="font-bold text-slate-800">
                          ₹{holdingMRP.toLocaleString("en-IN")}
                        </span>
                        <p className="text-[10px] text-slate-400">
                          @ ₹{p.sale_price.toLocaleString("en-IN")}/unit
                        </p>
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3.5 text-right">
                        <Link href={`/products/${p.id}/edit`}>
                          <Button variant="ghost" size="sm" className="size-8 p-0 text-slate-600 hover:text-amber-600">
                            <Edit2 className="size-3.5" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">
              Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total} products
            </span>
            <Pagination
              meta={{
                page,
                limit: pageSize,
                total,
                total_pages: totalPages,
                has_prev: page > 1,
                has_next: page < totalPages,
              }}
              onPage={setPage}
            />
          </div>
        )}
      </Card>
    </div>
  );
}
