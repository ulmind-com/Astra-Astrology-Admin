"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  Edit2,
  ExternalLink,
  Flame,
  Minus,
  Package,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Tag,
  Trash2,
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
  ConfirmModal,
  EmptyState,
  Input,
  LoadingBlock,
  Pagination,
  Select,
  Switch,
} from "@/components/ui";
import { shopAdminApi } from "@/lib/api";
import type { ShopProduct, ShopProductCategory } from "@/types";

export default function ProductsPage() {
  const queryClient = useQueryClient();

  // Search & Filter State
  const [searchTerm, setSearchTerm] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState("");
  const [selectedStockStatus, setSelectedStockStatus] = React.useState("");
  const [selectedActive, setSelectedActive] = React.useState<string>("");
  const [viewArchived, setViewArchived] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const pageSize = 15;

  // Delete modal state
  const [productToDelete, setProductToDelete] = React.useState<ShopProduct | null>(null);

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Categories list for filter dropdown
  const { data: categories = [] } = useQuery<ShopProductCategory[]>({
    queryKey: ["shop_categories"],
    queryFn: async () => {
      const res = await shopAdminApi.listCategories(true);
      return res || [];
    },
  });

  // Query products
  const {
    data: productData,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: [
      "shop_products",
      page,
      debouncedSearch,
      selectedCategory,
      selectedStockStatus,
      selectedActive,
      viewArchived,
    ],
    queryFn: async () => {
      const res = await shopAdminApi.listProducts({
        search: debouncedSearch || undefined,
        category_id: selectedCategory || undefined,
        stock_status: selectedStockStatus || undefined,
        is_active: selectedActive === "" ? undefined : selectedActive === "true",
        archived_only: viewArchived ? true : undefined,
        include_deleted: viewArchived ? true : false,
        page,
        limit: pageSize,
        sort_by: "-created_at",
      });
      return res;
    },
  });

  // Restore soft-deleted product mutation
  const restoreMutation = useMutation({
    mutationFn: async (id: string) => {
      return await shopAdminApi.restoreProduct(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shop_products"] });
      queryClient.invalidateQueries({ queryKey: ["shop_inventory"] });
      queryClient.invalidateQueries({ queryKey: ["shop_categories"] });
      toast.success("Product successfully restored to active store!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to restore product.");
    },
  });

  // Quick stock mutation
  const stockMutation = useMutation({
    mutationFn: async ({
      id,
      quantity,
      mode,
    }: {
      id: string;
      quantity: number;
      mode: "add" | "subtract" | "set";
    }) => {
      return await shopAdminApi.updateStock(id, { quantity, mode, reason: "Quick table adjustment" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shop_products"] });
      queryClient.invalidateQueries({ queryKey: ["shop_inventory"] });
      toast.success("Stock quantity updated.");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update stock.");
    },
  });

  // Toggle active status
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return await shopAdminApi.updateProduct(id, { is_active: isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shop_products"] });
      toast.success("Product visibility updated.");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update visibility.");
    },
  });

  // Delete product mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await shopAdminApi.deleteProduct(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shop_products"] });
      queryClient.invalidateQueries({ queryKey: ["shop_inventory"] });
      queryClient.invalidateQueries({ queryKey: ["shop_categories"] });
      toast.success("Product deleted and its images were purged from Cloudinary.");
      setProductToDelete(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete product.");
    },
  });

  const products = productData?.items || [];
  const total = productData?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PanelHeader
        title="Astro Products Catalog"
        description="Manage sacred gemstones, rudrakshas, yantras, authentic ritual items, and real-time inventory."
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching}
              className="flex items-center gap-1.5"
            >
              <RefreshCw className={`size-3.5 ${isRefetching ? "animate-spin" : ""}`} />
              Refresh
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

      {/* Filter and Search Bar */}
      <Card className="rounded-2xl border-slate-200/80 shadow-sm">
        <CardBody className="p-4 space-y-3">
          {/* Active vs Archived View Switcher */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setViewArchived(false);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  !viewArchived
                    ? "bg-amber-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Active Catalog
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewArchived(true);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewArchived
                    ? "bg-slate-800 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <span>Archived & Soft-Deleted</span>
                {viewArchived && (
                  <span className="size-2 rounded-full bg-amber-400 animate-pulse" />
                )}
              </button>
            </div>

            {viewArchived && (
              <span className="text-xs text-amber-700 font-semibold bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                Viewing archived products preserved for past orders
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <Input
                placeholder="Search title, SKU, benefits..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Category Dropdown */}
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
                  {c.name} ({c.product_count})
                </option>
              ))}
            </Select>

            {/* Stock Status Dropdown */}
            <Select
              value={selectedStockStatus}
              onChange={(e) => {
                setSelectedStockStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Stock Levels</option>
              <option value="in_stock">In Stock (&gt;0)</option>
              <option value="low_stock">⚠️ Low Stock (≤5)</option>
              <option value="out_of_stock">🚨 Out of Stock (0)</option>
            </Select>

            {/* Active Status Dropdown */}
            <Select
              value={selectedActive}
              onChange={(e) => {
                setSelectedActive(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Statuses</option>
              <option value="true">Active (Visible)</option>
              <option value="false">Inactive (Hidden)</option>
            </Select>
          </div>
        </CardBody>
      </Card>

      {/* Products Table */}
      <Card className="rounded-2xl border-slate-200/80 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12">
            <LoadingBlock label="Loading remedy catalog..." />
          </div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center">
            <EmptyState
              icon={Package}
              title="No products found"
              description="No remedy products match your current search or filters."
              action={
                <Link href="/products/new">
                  <Button className="mt-3 bg-amber-600 hover:bg-amber-700 text-white font-bold">
                    Create First Product
                  </Button>
                </Link>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3.5">Product</th>
                  <th className="px-4 py-3.5">Category & Rulership</th>
                  <th className="px-4 py-3.5">Pricing (₹)</th>
                  <th className="px-4 py-3.5">Stock & Quick Adjust</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => {
                  const isOutOfStock = p.stock_quantity === 0;
                  const isLow = p.stock_quantity > 0 && p.stock_quantity <= p.low_stock_threshold;

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-slate-50/60 transition-colors ${
                        isOutOfStock
                          ? "bg-red-50/20"
                          : isLow
                          ? "bg-amber-50/20"
                          : ""
                      }`}
                    >
                      {/* Product Thumbnail & Title */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="relative size-12 shrink-0 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                            {p.featured_image ? (
                              <Image
                                src={p.featured_image}
                                alt={p.title}
                                fill
                                sizes="48px"
                                className="object-cover"
                                unoptimized
                              />
                            ) : (
                              <div className="size-full flex items-center justify-center text-slate-400">
                                <Package className="size-6" />
                              </div>
                            )}
                            {p.is_energized && (
                              <span
                                className="absolute bottom-0 right-0 bg-amber-500 text-white p-0.5 rounded-tl text-[8px]"
                                title="Pran-Pratishthit Certified"
                              >
                                <Flame className="size-2.5 fill-current" />
                              </span>
                            )}
                          </div>
                          <div className="min-w-0 max-w-xs">
                            <Link
                              href={`/products/${p.id}/edit`}
                              className="font-bold text-slate-900 hover:text-amber-600 transition-colors truncate block"
                              title={p.title}
                            >
                              {p.title}
                            </Link>
                            <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                              <span className="font-mono text-[11px] font-semibold text-slate-500">
                                {p.sku}
                              </span>
                              {p.is_featured && (
                                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.2 rounded">
                                  Featured
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category & Rulership */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-1">
                          <Badge tone="neutral" className="capitalize">
                            {p.category_slug.replace(/-/g, " ")}
                          </Badge>
                          {p.ruling_planet && (
                            <p className="text-xs text-slate-500 flex items-center gap-1">
                              <Sparkles className="size-3 text-amber-500" />
                              <span>{p.ruling_planet}</span>
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Pricing */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 text-sm">
                              ₹{p.sale_price.toLocaleString("en-IN")}
                            </span>
                            {p.discount_percent > 0 && (
                              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1 rounded">
                                {p.discount_percent}% off
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 line-through">
                            ₹{p.mrp.toLocaleString("en-IN")}
                          </p>
                        </div>
                      </td>

                      {/* Stock & Quick Adjust Table Control */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                                isOutOfStock
                                  ? "bg-red-100 text-red-700 border border-red-200"
                                  : isLow
                                  ? "bg-amber-100 text-amber-800 border border-amber-200"
                                  : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              }`}
                            >
                              {isOutOfStock ? (
                                <>
                                  <XCircle className="size-3" /> Out of stock
                                </>
                              ) : isLow ? (
                                <>
                                  <AlertTriangle className="size-3" /> {p.stock_quantity} left
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="size-3" /> {p.stock_quantity} in stock
                                </>
                              )}
                            </span>
                          </div>

                          {/* 1-Click Inline +/- Buttons */}
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                stockMutation.mutate({ id: p.id, quantity: 1, mode: "subtract" })
                              }
                              disabled={p.stock_quantity <= 0 || stockMutation.isPending}
                              title="Decrease stock by 1"
                              className="size-6 rounded-md bg-slate-100 hover:bg-slate-200 disabled:opacity-40 flex items-center justify-center text-slate-600 transition-colors"
                            >
                              <Minus className="size-3" />
                            </button>
                            <span className="text-xs font-mono font-bold w-7 text-center">
                              {p.stock_quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                stockMutation.mutate({ id: p.id, quantity: 1, mode: "add" })
                              }
                              disabled={stockMutation.isPending}
                              title="Increase stock by 1"
                              className="size-6 rounded-md bg-slate-100 hover:bg-slate-200 disabled:opacity-40 flex items-center justify-center text-slate-600 transition-colors"
                            >
                              <Plus className="size-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                stockMutation.mutate({ id: p.id, quantity: 5, mode: "add" })
                              }
                              disabled={stockMutation.isPending}
                              title="Add 5 units"
                              className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 transition-colors ml-1"
                            >
                              +5
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Status Toggle / Archived Badge */}
                      <td className="px-4 py-3.5 text-center">
                        {p.is_deleted ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-300 px-2 py-0.5 rounded-full">
                            Archived
                          </span>
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <Switch
                              checked={p.is_active}
                              onChange={(val) =>
                                toggleActiveMutation.mutate({ id: p.id, isActive: val })
                              }
                            />
                            <span className="text-[10px] text-slate-400 font-semibold">
                              {p.is_active ? "Active" : "Hidden"}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {p.is_deleted ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => restoreMutation.mutate(p.id)}
                              disabled={restoreMutation.isPending}
                              className="text-xs font-bold text-emerald-700 border-emerald-300 hover:bg-emerald-50 flex items-center gap-1.5 cursor-pointer"
                              title="Restore Archived Product"
                            >
                              <RefreshCw className={`size-3.5 ${restoreMutation.isPending ? "animate-spin" : ""}`} />
                              Restore
                            </Button>
                          ) : (
                            <>
                              <Link href={`/products/${p.id}/edit`}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="size-8 p-0 text-slate-600 hover:text-amber-600"
                                  title="Edit Product"
                                >
                                  <Edit2 className="size-4" />
                                </Button>
                              </Link>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setProductToDelete(p)}
                                className="size-8 p-0 text-slate-400 hover:text-red-600"
                                title="Delete / Archive Product"
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
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

      {/* Delete / Archive Product Confirmation Modal */}
      {productToDelete && (
        <ConfirmModal
          open={!!productToDelete}
          title={`Delete "${productToDelete.title}"?`}
          description="If this product has historical customer orders, it will be safely soft-deleted (archived) so past invoices and receipts stay 100% intact. If it has no orders, it will be hard-deleted and its images purged from Cloudinary."
          confirmLabel="Archive / Delete"
          tone="danger"
          loading={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate(productToDelete.id)}
          onClose={() => setProductToDelete(null)}
        />
      )}
    </div>
  );
}
