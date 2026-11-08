"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  CheckCircle2,
  Edit2,
  ExternalLink,
  Flame,
  Image as ImageIcon,
  Layers,
  LayoutTemplate,
  Loader2,
  Megaphone,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  ShieldCheck,
  Tag,
  Trash2,
  UploadCloud,
} from "lucide-react";
import Image from "next/image";
import * as React from "react";
import { toast } from "sonner";

import { PanelHeader } from "@/components/layout/panel-shell";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardDescription,
  CardHeader,
  CardTitle,
  ConfirmModal,
  EmptyState,
  Field,
  Input,
  LoadingBlock,
  Modal,
  Select,
  Switch,
  Textarea,
} from "@/components/ui";
import { shopAdminApi } from "@/lib/api";
import type {
  ShopBannerSettings,
  ShopHeroBannerItem,
  ShopProductCategory,
  ShopProductCategoryCreate,
} from "@/types";

const CATEGORY_TYPES = [
  { value: "rudraksha", label: "Rudraksha (রুদ্রাক্ষ)" },
  { value: "gemstones", label: "Gemstones (রত্ন ও উপরত্ন)" },
  { value: "yantra", label: "Yantra (শ্রীযন্ত্র ও নবগ্রহ যন্ত্র)" },
  { value: "kawach", label: "Kawach & Amulets (রক্ষাকবচ)" },
  { value: "mala", label: "Sacred Malas & Rosaries (জপমালা)" },
  { value: "puja_samagri", label: "Puja & Hawan Samagri (পূজা সামগ্রী)" },
  { value: "other", label: "Other Spiritual Items (অন্যান্য)" },
];

export default function CategoriesAndBannersPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = React.useState<"categories" | "banners">("categories");

  // =========================================================================
  // CATEGORIES STATE & QUERIES
  // =========================================================================
  const [categoryModalOpen, setCategoryModalOpen] = React.useState(false);
  const [editingCategory, setEditingCategory] = React.useState<ShopProductCategory | null>(null);
  const [categoryToDelete, setCategoryToDelete] = React.useState<ShopProductCategory | null>(null);

  // Category Form State
  const [catName, setCatName] = React.useState("");
  const [catSlug, setCatSlug] = React.useState("");
  const [catDescription, setCatDescription] = React.useState("");
  const [catType, setCatType] = React.useState("other");
  const [catDisplayOrder, setCatDisplayOrder] = React.useState(0);
  const [catIsActive, setCatIsActive] = React.useState(true);
  const [catIconUrl, setCatIconUrl] = React.useState("");
  const [catBannerUrl, setCatBannerUrl] = React.useState("");
  const [isUploadingCatIcon, setIsUploadingCatIcon] = React.useState(false);
  const [isUploadingCatBanner, setIsUploadingCatBanner] = React.useState(false);

  const {
    data: categories = [],
    isLoading: isLoadingCategories,
    refetch: refetchCategories,
  } = useQuery<ShopProductCategory[]>({
    queryKey: ["shop_categories"],
    queryFn: async () => {
      const res = await shopAdminApi.listCategories(true);
      return res || [];
    },
  });

  const openCreateModal = () => {
    setEditingCategory(null);
    setCatName("");
    setCatSlug("");
    setCatDescription("");
    setCatType("other");
    setCatDisplayOrder(categories.length);
    setCatIsActive(true);
    setCatIconUrl("");
    setCatBannerUrl("");
    setCategoryModalOpen(true);
  };

  const openEditModal = (cat: ShopProductCategory) => {
    setEditingCategory(cat);
    setCatName(cat.name);
    setCatSlug(cat.slug);
    setCatDescription(cat.description || "");
    setCatType(cat.category_type || "other");
    setCatDisplayOrder(cat.display_order);
    setCatIsActive(cat.is_active);
    setCatIconUrl(cat.icon_url || "");
    setCatBannerUrl(cat.banner_url || "");
    setCategoryModalOpen(true);
  };

  const handleCatImageUpload = async (file: File, type: "icon" | "banner") => {
    const isIcon = type === "icon";
    if (isIcon) setIsUploadingCatIcon(true);
    else setIsUploadingCatBanner(true);

    const toastId = toast.loading(`Compressing & uploading ${type}...`);
    try {
      const res = await shopAdminApi.uploadImage(file);
      if (res?.url) {
        if (isIcon) setCatIconUrl(res.url);
        else setCatBannerUrl(res.url);
        toast.success(`${isIcon ? "Category icon" : "Category banner"} uploaded.`, { id: toastId });
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to upload image.", { id: toastId });
    } finally {
      if (isIcon) setIsUploadingCatIcon(false);
      else setIsUploadingCatBanner(false);
    }
  };

  const saveCategoryMutation = useMutation({
    mutationFn: async () => {
      const payload: ShopProductCategoryCreate = {
        name: catName.trim(),
        slug: catSlug.trim() || undefined,
        description: catDescription.trim() || undefined,
        category_type: catType,
        display_order: Number(catDisplayOrder),
        is_active: catIsActive,
        icon_url: catIconUrl.trim() || undefined,
        banner_url: catBannerUrl.trim() || undefined,
      };

      if (editingCategory) {
        return await shopAdminApi.updateCategory(editingCategory.id, payload);
      } else {
        return await shopAdminApi.createCategory(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shop_categories"] });
      toast.success(editingCategory ? "Category updated." : "New category created.");
      setCategoryModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save category.");
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      return await shopAdminApi.deleteCategory(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shop_categories"] });
      toast.success("Category deleted and its media purged.");
      setCategoryToDelete(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete category.");
    },
  });

  // =========================================================================
  // BANNER & ANNOUNCEMENT CMS STATE & QUERIES
  // =========================================================================
  const [announcementText, setAnnouncementText] = React.useState("");
  const [announcementLink, setAnnouncementLink] = React.useState("");
  const [announcementActive, setAnnouncementActive] = React.useState(true);
  const [heroBanners, setHeroBanners] = React.useState<ShopHeroBannerItem[]>([]);
  const [isUploadingBannerIndex, setIsUploadingBannerIndex] = React.useState<number | null>(null);

  const {
    data: bannerSettings,
    isLoading: isLoadingBanners,
    refetch: refetchBanners,
  } = useQuery<ShopBannerSettings>({
    queryKey: ["shop_banners"],
    queryFn: async () => {
      const res = await shopAdminApi.getBannerSettings();
      return res!;
    },
  });

  React.useEffect(() => {
    if (bannerSettings) {
      setAnnouncementText(bannerSettings.announcement_bar_text || "");
      setAnnouncementLink(bannerSettings.announcement_bar_link || "");
      setAnnouncementActive(bannerSettings.announcement_bar_active ?? true);
      setHeroBanners(bannerSettings.hero_banners || []);
    }
  }, [bannerSettings]);

  const saveBannersMutation = useMutation({
    mutationFn: async () => {
      return await shopAdminApi.updateBannerSettings({
        announcement_bar_text: announcementText.trim() || undefined,
        announcement_bar_link: announcementLink.trim() || undefined,
        announcement_bar_active: announcementActive,
        hero_banners: heroBanners,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shop_banners"] });
      toast.success("Store banners and announcement bar updated.");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update banners.");
    },
  });

  const addHeroBanner = () => {
    const newId = `banner-${Date.now()}`;
    const newBanner: ShopHeroBannerItem = {
      id: newId,
      title: "Sacred Energized Rudrakshas",
      subtitle: "Authentic Himalayan beads purified with Vedic Shiva mantras",
      cta_text: "Explore Collection",
      cta_link: "/shop/category/rudraksha",
      badge_text: "100% Authentic & Certified",
      image_url: "",
      is_active: true,
    };
    setHeroBanners([...heroBanners, newBanner]);
  };

  const removeHeroBanner = (idx: number) => {
    setHeroBanners(heroBanners.filter((_, i) => i !== idx));
  };

  const updateBannerField = (idx: number, field: keyof ShopHeroBannerItem, val: any) => {
    const updated = [...heroBanners];
    updated[idx] = { ...updated[idx], [field]: val };
    setHeroBanners(updated);
  };

  const handleHeroBannerImageUpload = async (file: File, idx: number) => {
    setIsUploadingBannerIndex(idx);
    const toastId = toast.loading("Compressing & uploading banner image...");
    try {
      const res = await shopAdminApi.uploadImage(file);
      if (res?.url) {
        updateBannerField(idx, "image_url", res.url);
        toast.success("Banner image uploaded and compressed to WebP.", { id: toastId });
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to upload image.", { id: toastId });
    } finally {
      setIsUploadingBannerIndex(null);
    }
  };

  const cleanupCloudinaryMutation = useMutation({
    mutationFn: async () => {
      return await shopAdminApi.cleanupOrphanedImages(false);
    },
    onSuccess: (data) => {
      toast.success(
        `Cloudinary Cleanup: Scanned ${data.scanned_count} assets, found ${data.orphaned_found_count} orphaned, successfully purged ${data.purged_count} unused images!`
      );
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to run garbage collection.");
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <PanelHeader
        title="Categories & Store Banners"
        description="Organize remedy categories, upload sacred category banners, and configure homepage store promotions."
        action={
          <div className="flex items-center gap-2">
            {activeTab === "categories" ? (
              <Button
                onClick={openCreateModal}
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="size-4" />
                Add Category
              </Button>
            ) : (
              <Button
                onClick={() => saveBannersMutation.mutate()}
                disabled={saveBannersMutation.isPending}
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold flex items-center gap-1.5 shadow-sm"
              >
                {saveBannersMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                Save Banners
              </Button>
            )}
          </div>
        }
      />

      {/* Tab Switcher */}
      <div className="flex items-center gap-3 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab("categories")}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === "categories"
              ? "border-amber-600 text-amber-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Layers className="size-4" />
          Product Categories ({categories.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("banners")}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === "banners"
              ? "border-amber-600 text-amber-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Megaphone className="size-4" />
          Store Banners & Announcement Bar
        </button>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: CATEGORIES LIST */}
      {/* ===================================================================== */}
      {activeTab === "categories" && (
        <Card className="rounded-2xl border-slate-200/80 shadow-sm overflow-hidden">
          {isLoadingCategories ? (
            <div className="p-12">
              <LoadingBlock label="Loading categories..." />
            </div>
          ) : categories.length === 0 ? (
            <div className="p-12 text-center">
              <EmptyState
                icon={Layers}
                title="No categories found"
                description="Create your first sacred remedy category."
                action={
                  <Button onClick={openCreateModal} className="mt-3 bg-amber-600 text-white font-bold">
                    Add Category
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/80 border-b border-slate-200/80 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3.5">Category</th>
                    <th className="px-4 py-3.5">Canonical Type</th>
                    <th className="px-4 py-3.5">Slug</th>
                    <th className="px-4 py-3.5 text-center">Products</th>
                    <th className="px-4 py-3.5 text-center">Order</th>
                    <th className="px-4 py-3.5 text-center">Status</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {categories.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Name & Icon */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0 overflow-hidden relative">
                            {c.icon_url ? (
                              <Image
                                src={c.icon_url}
                                alt={c.name}
                                fill
                                sizes="40px"
                                className="object-cover"
                                unoptimized
                              />
                            ) : (
                              <Tag className="size-4 text-amber-600" />
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block">{c.name}</span>
                            {c.description && (
                              <p className="text-xs text-slate-400 truncate max-w-xs">{c.description}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Type */}
                      <td className="px-4 py-3.5">
                        <Badge tone="neutral" className="capitalize">
                          {c.category_type}
                        </Badge>
                      </td>

                      {/* Slug */}
                      <td className="px-4 py-3.5 font-mono text-xs text-slate-500">
                        {c.slug}
                      </td>

                      {/* Product Count */}
                      <td className="px-4 py-3.5 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold font-mono">
                          {c.product_count} items
                        </span>
                      </td>

                      {/* Order */}
                      <td className="px-4 py-3.5 text-center font-mono text-xs text-slate-500">
                        {c.display_order}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 text-center">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            c.is_active
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {c.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(c)}
                            className="size-8 p-0 text-slate-600 hover:text-amber-600"
                            title="Edit Category"
                          >
                            <Edit2 className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setCategoryToDelete(c)}
                            className="size-8 p-0 text-slate-400 hover:text-red-600"
                            title="Delete Category"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: STORE BANNERS & ANNOUNCEMENT CMS */}
      {/* ===================================================================== */}
      {activeTab === "banners" && (
        <div className="space-y-8">
          {/* Announcement Bar Settings */}
          <Card className="rounded-2xl border-slate-200/80 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Megaphone className="size-4 text-amber-600" />
                  <CardTitle className="text-base font-bold text-slate-800">
                    Top Store Announcement Bar
                  </CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600">
                    {announcementActive ? "Active on Store" : "Hidden"}
                  </span>
                  <Switch checked={announcementActive} onChange={setAnnouncementActive} />
                </div>
              </div>
              <CardDescription className="text-xs">
                Highlighted ticker strip shown across the top of the AstroStore marketplace.
              </CardDescription>
            </CardHeader>
            <CardBody className="space-y-4 pt-4">
              <Field
                label="Announcement Headline Text"
                hint="e.g. 🕉️ Free Vedic Energization & Sacred Gangajal with all Certified Rudraksha Malas this week!"
              >
                <Input
                  value={announcementText}
                  onChange={(e) => setAnnouncementText(e.target.value)}
                  placeholder="Type promotional headline..."
                />
              </Field>

              <Field label="Announcement Target URL (Optional)" hint="e.g. /shop/category/rudraksha">
                <Input
                  value={announcementLink}
                  onChange={(e) => setAnnouncementLink(e.target.value)}
                  placeholder="/shop/category/rudraksha"
                />
              </Field>
            </CardBody>
          </Card>

          {/* Hero Carousel Slides */}
          <Card className="rounded-2xl border-slate-200/80 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <LayoutTemplate className="size-4 text-amber-600" />
                  <CardTitle className="text-base font-bold text-slate-800">
                    Store Homepage Hero Carousel Slides
                  </CardTitle>
                </div>
                <Button
                  type="button"
                  onClick={addHeroBanner}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1.5 text-xs font-bold"
                >
                  <Plus className="size-3.5" />
                  Add Slide
                </Button>
              </div>
              <CardDescription className="text-xs">
                Featured large banners shown on the AstroStore homepage with CTA buttons and WebP artwork.
              </CardDescription>
            </CardHeader>
            <CardBody className="space-y-6 pt-4">
              {heroBanners.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <p className="text-xs text-slate-500">No hero banners created yet.</p>
                  <Button
                    type="button"
                    onClick={addHeroBanner}
                    variant="outline"
                    size="sm"
                    className="mt-3 gap-1.5 text-xs font-bold"
                  >
                    <Plus className="size-3.5" />
                    Create First Banner Slide
                  </Button>
                </div>
              ) : (
                heroBanners.map((banner, idx) => (
                  <div
                    key={banner.id || idx}
                    className="p-5 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-4 relative"
                  >
                    <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="size-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-bold text-slate-800">Slide #{idx + 1}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium text-slate-500">
                            {banner.is_active ? "Live" : "Draft"}
                          </span>
                          <Switch
                            checked={banner.is_active}
                            onChange={(val: boolean) => updateBannerField(idx, "is_active", val)}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeHeroBanner(idx)}
                          className="text-slate-400 hover:text-red-600 transition-colors"
                          title="Remove Slide"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Field label="Banner Title">
                        <Input
                          value={banner.title}
                          onChange={(e) => updateBannerField(idx, "title", e.target.value)}
                          placeholder="e.g. Natural Ceylon Blue Sapphire"
                        />
                      </Field>

                      <Field label="Badge Tag (Optional)">
                        <Input
                          value={banner.badge_text || ""}
                          onChange={(e) => updateBannerField(idx, "badge_text", e.target.value)}
                          placeholder="e.g. 100% Certified Lab Origin"
                        />
                      </Field>
                    </div>

                    <Field label="Subtitle / Brief Description">
                      <Input
                        value={banner.subtitle}
                        onChange={(e) => updateBannerField(idx, "subtitle", e.target.value)}
                        placeholder="e.g. Energized for Shani Sade Sati relief and swift career ascension"
                      />
                    </Field>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Field label="CTA Button Text">
                        <Input
                          value={banner.cta_text}
                          onChange={(e) => updateBannerField(idx, "cta_text", e.target.value)}
                          placeholder="e.g. Buy Now"
                        />
                      </Field>

                      <Field label="CTA Button Link">
                        <Input
                          value={banner.cta_link}
                          onChange={(e) => updateBannerField(idx, "cta_link", e.target.value)}
                          placeholder="e.g. /shop/products/ceylon-blue-sapphire"
                        />
                      </Field>
                    </div>

                    {/* Banner Image Uploader */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700">Banner Artwork (WebP)</label>
                      <div className="flex flex-col sm:flex-row items-center gap-4">
                        {banner.image_url ? (
                          <div className="relative h-24 w-44 rounded-xl overflow-hidden bg-slate-200 border border-slate-300 shrink-0">
                            <Image
                              src={banner.image_url}
                              alt="Slide preview"
                              fill
                              sizes="176px"
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                        ) : (
                          <div className="h-24 w-44 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 text-xs shrink-0 bg-white">
                            No Image
                          </div>
                        )}

                        <div className="space-y-1 w-full">
                          <Input
                            type="file"
                            accept="image/*"
                            disabled={isUploadingBannerIndex === idx}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleHeroBannerImageUpload(file, idx);
                            }}
                          />
                          <p className="text-[11px] text-slate-400">
                            Recommended size: 1200x500px • Auto-compressed to WebP format.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardBody>
          </Card>

          {/* Cloudinary Storage Quota Optimizer Card */}
          <Card className="rounded-2xl border-slate-200/80 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-emerald-600" />
                  <CardTitle className="text-base font-bold text-slate-800">
                    Cloudinary Quota & Asset Garbage Collector
                  </CardTitle>
                </div>
                <Button
                  type="button"
                  onClick={() => cleanupCloudinaryMutation.mutate()}
                  disabled={cleanupCloudinaryMutation.isPending}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1.5 text-xs font-bold border-emerald-300 text-emerald-800 hover:bg-emerald-50"
                >
                  {cleanupCloudinaryMutation.isPending ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="size-3.5" />
                  )}
                  Run Orphan Image Scan & Cleanup
                </Button>
              </div>
              <CardDescription className="text-xs">
                Scans Cloudinary for abandoned upload drafts and disconnected images older than 2 hours that are
                not referenced in any product or category. Preserves your free account storage and bandwidth.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* ===================================================================== */}
      {/* CREATE / EDIT CATEGORY MODAL */}
      {/* ===================================================================== */}
      <Modal
        open={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        title={editingCategory ? `Edit Category: ${editingCategory.name}` : "Create New Category"}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!catName.trim()) {
              toast.error("Please provide category name.");
              return;
            }
            saveCategoryMutation.mutate();
          }}
          className="space-y-4 pt-2"
        >
          <Field label="Category Name *">
            <Input
              required
              placeholder="e.g. Certified Rudraksha (রুদ্রাক্ষ)"
              value={catName}
              onChange={(e) => {
                setCatName(e.target.value);
                if (!editingCategory) {
                  setCatSlug(
                    e.target.value
                      .toLowerCase()
                      .replace(/[^\w\s-]/g, "")
                      .replace(/[\s_-]+/g, "-")
                      .replace(/^-+|-+$/g, "")
                  );
                }
              }}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Canonical Category Type *">
              <Select value={catType} onChange={(e) => setCatType(e.target.value)}>
                {CATEGORY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Slug (SEO URL)">
              <Input
                placeholder="rudraksha"
                value={catSlug}
                onChange={(e) => setCatSlug(e.target.value)}
              />
            </Field>
          </div>

          <Field label="Description">
            <Textarea
              rows={2}
              placeholder="Authentic scriptural beads and energized remedies..."
              value={catDescription}
              onChange={(e) => setCatDescription(e.target.value)}
            />
          </Field>

          {/* Icon Upload */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Category Icon (WebP)</label>
            <div className="flex items-center gap-3">
              {catIconUrl ? (
                <div className="size-10 rounded-xl overflow-hidden relative border border-slate-200 shrink-0">
                  <Image src={catIconUrl} alt="icon" fill sizes="40px" className="object-cover" unoptimized />
                </div>
              ) : null}
              <Input
                type="file"
                accept="image/*"
                disabled={isUploadingCatIcon}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleCatImageUpload(f, "icon");
                }}
              />
            </div>
          </div>

          {/* Banner Upload */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Category Header Banner (WebP)</label>
            <div className="flex items-center gap-3">
              {catBannerUrl ? (
                <div className="h-10 w-20 rounded-xl overflow-hidden relative border border-slate-200 shrink-0">
                  <Image src={catBannerUrl} alt="banner" fill sizes="80px" className="object-cover" unoptimized />
                </div>
              ) : null}
              <Input
                type="file"
                accept="image/*"
                disabled={isUploadingCatBanner}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleCatImageUpload(f, "banner");
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <Field label="Display Order (ক্রম)">
              <Input
                type="number"
                min="0"
                value={catDisplayOrder}
                onChange={(e) => setCatDisplayOrder(parseInt(e.target.value) || 0)}
              />
            </Field>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 self-end">
              <div>
                <p className="text-xs font-bold text-slate-800">Active Status</p>
                <p className="text-[10px] text-slate-400">Visible in store</p>
              </div>
              <Switch checked={catIsActive} onChange={setCatIsActive} />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCategoryModalOpen(false)}
              disabled={saveCategoryMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saveCategoryMutation.isPending}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
            >
              {saveCategoryMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {editingCategory ? "Save Changes" : "Create Category"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* DELETE CATEGORY CONFIRM MODAL */}
      {categoryToDelete && (
        <ConfirmModal
          open={!!categoryToDelete}
          title={`Delete Category "${categoryToDelete.name}"?`}
          description={
            categoryToDelete.product_count > 0
              ? `This category contains ${categoryToDelete.product_count} active product(s). You must reassign or delete these products first.`
              : "Are you sure you want to delete this category? Its icons and banner artwork will be purged from Cloudinary."
          }
          confirmLabel={categoryToDelete.product_count > 0 ? "Understood" : "Delete Category"}
          tone="danger"
          loading={deleteCategoryMutation.isPending}
          onConfirm={() => {
            if (categoryToDelete.product_count > 0) {
              setCategoryToDelete(null);
            } else {
              deleteCategoryMutation.mutate(categoryToDelete.id);
            }
          }}
          onClose={() => setCategoryToDelete(null)}
        />
      )}
    </div>
  );
}
