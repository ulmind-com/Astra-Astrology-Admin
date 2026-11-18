"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Sparkles,
  ShoppingBag,
  Plus,
  Trash2,
  Save,
  RotateCw,
  Eye,
  Video,
  Layers,
  Image as ImageIcon,
  CheckCircle2,
  ExternalLink,
  Flame,
  RefreshCw,
  ShieldCheck,
  Truck,
  Coins,
  Lock,
  Info,
  Clock,
  AlertTriangle,
} from "lucide-react";
import Image from "next/image";
import * as React from "react";
import { toast } from "sonner";

import { PanelHeader } from "@/components/layout/panel-shell";
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardDescription,
  CardHeader,
  CardTitle,
  Field,
  Input,
  LoadingBlock,
  Switch,
} from "@/components/ui";
import {
  shopAdminApi,
  type ShopBannerSettingsData,
  type ShopHeroBannerItem,
  type ShopStoreReelItem,
} from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { useRequireAuth } from "@/providers/auth-provider";

type ActiveTab = "hero_banners" | "announcement" | "policies" | "reels";

const DEFAULT_SHOP_DATA: ShopBannerSettingsData = {
  announcement_bar_text: "🛍️ Discover Sacred Jewellery & Energised Remedies Based on Your Mulank & Kundli ✨",
  announcement_bar_link: "/shop",
  announcement_bar_active: true,
  cod_enabled: true,
  cashback_credit_timing: "on_delivery",
  allow_user_cancellation: true,
  cancellation_grace_hours: 24,
  hero_banners: [
    {
      id: "banner-1",
      title: "WEAR YOUR ZODIAC",
      subtitle: "Discover the new zodiac ring collection handcrafted in sterling silver and energized with Vedic rituals.",
      cta_text: "SHOP NOW",
      cta_link: "/shop?category=zodiac",
      badge_text: "NEW LAUNCH",
      image_url: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=1600&q=80",
      is_active: true,
    },
    {
      id: "banner-2",
      title: "SACRED NEPALI RUDRAKSHA",
      subtitle: "1 to 14 Mukhi divine Rudraksha beads collected from the high Himalayas with government lab certification.",
      cta_text: "EXPLORE MALAS",
      cta_link: "/shop?category=rudraksha",
      badge_text: "100% PRANA-PRATISHTHIT",
      image_url: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=1600&q=80",
      is_active: true,
    },
    {
      id: "banner-3",
      title: "SUPER DHAN YOG BAND",
      subtitle: "Activate Mahalakshmi and Kuber vibrations to attract financial breakthroughs, wealth retention, and business growth.",
      cta_text: "ORDER NOW",
      cta_link: "/shop?category=bracelets",
      badge_text: "BESTSELLER",
      image_url: "https://images.unsplash.com/photo-1611591475879-166258f33cf2?auto=format&fit=crop&w=1600&q=80",
      is_active: true,
    },
    {
      id: "banner-4",
      title: "ORIGINAL KARUNGALI MALA",
      subtitle: "Pure black ebony wood beads for shielding against malefic Rahu, evil eye, negative entities and karmic blocks.",
      cta_text: "VIEW KARUNGALI",
      cta_link: "/shop?category=karungali",
      badge_text: "DIVINE SHIELD",
      image_url: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=1600&q=80",
      is_active: true,
    },
    {
      id: "banner-5",
      title: "PRAN-PRATISHTHIT RATNA",
      subtitle: "Unheated, untreated natural gemstones tested and certified by government recognized gemological laboratories.",
      cta_text: "DISCOVER RATNA",
      cta_link: "/shop?category=gemstones",
      badge_text: "LAB CERTIFIED",
      image_url: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=1600&q=80",
      is_active: true,
    },
  ],
  reels: [
    {
      id: "reel-1",
      user_handle: "@sneha_vats",
      user_name: "Sneha Vats",
      rating: 5,
      quote: "Wearing the 7-Mukhi Rudraksha cleared my Saturn Sade Sati career blocks in 3 weeks! 🌟",
      thumbnail_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80",
      video_url: "https://assets.mixkit.co/videos/preview/mixkit-hands-holding-a-sparkling-gemstone-41315-large.mp4",
      likes_count: "4.8k",
      tagged_product_title: "খাঁটি নেপালি ৭-মুখী রুদ্রাক্ষ",
      tagged_product_price: 1899,
      tagged_product_slug: "nepali-7-mukhi-rudraksha",
      is_active: true,
    },
    {
      id: "reel-2",
      user_handle: "@rohit_astroglow",
      user_name: "Rohit K.",
      rating: 5,
      quote: "Unboxing my Super Dhan Yog Band! The energy feel is absolutely authentic and energizing. 💰",
      thumbnail_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80",
      video_url: "https://assets.mixkit.co/videos/preview/mixkit-woman-wearing-spiritual-beads-bracelet-43098-large.mp4",
      likes_count: "3.9k",
      tagged_product_title: "Super Dhan Yog Band",
      tagged_product_price: 1099,
      tagged_product_slug: "super-dhan-yog-band",
      is_active: true,
    },
    {
      id: "reel-3",
      user_handle: "@dr_kunal",
      user_name: "Dr. Kunal Mehta",
      rating: 5,
      quote: "Pyrite Stud Ring transformed my clinic consultation inquiries within a month! ✨",
      thumbnail_url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80",
      video_url: "https://assets.mixkit.co/videos/preview/mixkit-shiny-gemstones-and-crystals-on-display-42410-large.mp4",
      likes_count: "5.2k",
      tagged_product_title: "Pyrite Stud Ring",
      tagged_product_price: 799,
      tagged_product_slug: "pyrite-stud-ring",
      is_active: true,
    },
    {
      id: "reel-4",
      user_handle: "@ananya_sen",
      user_name: "Ananya Sen",
      rating: 5,
      quote: "Original Karungali Mala quality is incredible, heavy and pure ebony wood with silver caps. 🙏",
      thumbnail_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&q=80",
      video_url: "https://assets.mixkit.co/videos/preview/mixkit-close-up-of-hands-holding-rosary-beads-42998-large.mp4",
      likes_count: "4.1k",
      tagged_product_title: "Original Karungali Malai (108 Beads)",
      tagged_product_price: 1299,
      tagged_product_slug: "original-karungali-malai",
      is_active: true,
    },
    {
      id: "reel-5",
      user_handle: "@vikram_aditya",
      user_name: "Vikram Aditya",
      rating: 5,
      quote: "Mulank 4 Rahu bracelet brought immense mental focus and shielded me from burnout. 🔮",
      thumbnail_url: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=600&q=80",
      video_url: "https://assets.mixkit.co/videos/preview/mixkit-person-meditating-with-crystals-in-front-42350-large.mp4",
      likes_count: "2.8k",
      tagged_product_title: "Mulank 4 Rahu Crystal Bracelet",
      tagged_product_price: 999,
      tagged_product_slug: "mulank-4-rahu-crystal-bracelet",
      is_active: true,
    },
  ],
};

export default function ShopCMSPage() {
  const { ready } = useRequireAuth({ roles: ["admin", "super_admin"], signInPath: "/login" });
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = React.useState<ActiveTab>("hero_banners");

  const { data: serverData, isLoading, refetch } = useQuery<ShopBannerSettingsData>({
    queryKey: ["admin_shop_banners"],
    queryFn: async () => {
      const res = await shopAdminApi.getBannerSettings() as unknown as ShopBannerSettingsData;
      return res;
    },
    enabled: ready,
  });

  const [formData, setFormData] = React.useState<ShopBannerSettingsData>(DEFAULT_SHOP_DATA);
  const [isDirty, setIsDirty] = React.useState(false);

  React.useEffect(() => {
    if (serverData) {
      setFormData({
        announcement_bar_text: serverData.announcement_bar_text ?? DEFAULT_SHOP_DATA.announcement_bar_text,
        announcement_bar_link: serverData.announcement_bar_link ?? DEFAULT_SHOP_DATA.announcement_bar_link,
        announcement_bar_active: serverData.announcement_bar_active ?? true,
        hero_banners: serverData.hero_banners?.length ? serverData.hero_banners : DEFAULT_SHOP_DATA.hero_banners,
        reels: serverData.reels?.length ? serverData.reels : DEFAULT_SHOP_DATA.reels,
        cod_enabled: serverData.cod_enabled ?? true,
        cashback_credit_timing: serverData.cashback_credit_timing ?? "on_delivery",
        allow_user_cancellation: serverData.allow_user_cancellation ?? true,
        cancellation_grace_hours: serverData.cancellation_grace_hours ?? 24,
      });
    }
  }, [serverData]);

  const saveMutation = useMutation({
    mutationFn: async (payload: Partial<ShopBannerSettingsData>) => {
      return await shopAdminApi.updateBannerSettings(payload as any);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(["admin_shop_banners"], updated);
      setIsDirty(false);
      toast.success("Shop CMS settings updated successfully!");
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : "Failed to save Shop CMS settings";
      toast.error(msg);
    },
  });

  if (!ready || isLoading) {
    return <LoadingBlock label="Loading Shop CMS..." />;
  }

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  const addHeroBanner = () => {
    const newBanner: ShopHeroBannerItem = {
      id: `banner-${Date.now()}`,
      title: "NEW SACRED COLLECTION",
      subtitle: "Discover pure energised Vedic remedies handcrafted for your planetary protection.",
      cta_text: "SHOP NOW",
      cta_link: "/shop",
      badge_text: "FEATURED",
      image_url: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=1600&q=80",
      is_active: true,
    };
    setFormData((prev) => ({
      ...prev,
      hero_banners: [...prev.hero_banners, newBanner],
    }));
    setIsDirty(true);
  };

  const removeHeroBanner = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      hero_banners: prev.hero_banners.filter((_, i) => i !== index),
    }));
    setIsDirty(true);
  };

  const updateHeroBanner = (index: number, patch: Partial<ShopHeroBannerItem>) => {
    setFormData((prev) => {
      const updated = [...prev.hero_banners];
      updated[index] = { ...updated[index], ...patch };
      return { ...prev, hero_banners: updated };
    });
    setIsDirty(true);
  };

  const addReel = () => {
    const newReel: ShopStoreReelItem = {
      id: `reel-${Date.now()}`,
      user_handle: "@customer",
      user_name: "Customer Review",
      rating: 5,
      quote: "Amazing results after wearing this consecrated remedy! Highly recommended.",
      thumbnail_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80",
      video_url: "https://assets.mixkit.co/videos/preview/mixkit-hands-holding-a-sparkling-gemstone-41315-large.mp4",
      likes_count: "3.2k",
      tagged_product_title: "Consecrated Remedy",
      tagged_product_price: 999,
      tagged_product_slug: "nepali-7-mukhi-rudraksha",
      is_active: true,
    };
    setFormData((prev) => ({
      ...prev,
      reels: [...prev.reels, newReel],
    }));
    setIsDirty(true);
  };

  const removeReel = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      reels: prev.reels.filter((_, i) => i !== index),
    }));
    setIsDirty(true);
  };

  const updateReel = (index: number, patch: Partial<ShopStoreReelItem>) => {
    setFormData((prev) => {
      const updated = [...prev.reels];
      updated[index] = { ...updated[index], ...patch };
      return { ...prev, reels: updated };
    });
    setIsDirty(true);
  };

  return (
    <div className="space-y-6 pb-20">
      <PanelHeader
        title="Astra AstroStore CMS"
        description="Manage hero carousel cards, announcement ticker, and customer video stories in real time."
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading || saveMutation.isPending}
            >
              <RotateCw className="size-4 mr-1.5" />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saveMutation.isPending}
            >
              <Save className="size-4 mr-1.5" />
              {saveMutation.isPending ? "Saving..." : isDirty ? "Save Changes *" : "Saved"}
            </Button>
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 dark:border-stone-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("hero_banners")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
            activeTab === "hero_banners"
              ? "bg-amber-600 text-white shadow-xs"
              : "text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-900"
          }`}
        >
          <Layers className="size-4" />
          <span>Hero Banners ({formData.hero_banners.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("announcement")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
            activeTab === "announcement"
              ? "bg-amber-600 text-white shadow-xs"
              : "text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-900"
          }`}
        >
          <Sparkles className="size-4" />
          <span>Top Announcement</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("policies")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
            activeTab === "policies"
              ? "bg-amber-600 text-white shadow-xs"
              : "text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-900"
          }`}
        >
          <ShieldCheck className="size-4 text-emerald-400" />
          <span>🛡️ COD, Policies & Anti-Fraud</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("reels")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
            activeTab === "reels"
              ? "bg-amber-600 text-white shadow-xs"
              : "text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-900"
          }`}
        >
          <Video className="size-4" />
          <span>Customer Video Reels ({formData.reels.length})</span>
        </button>
      </div>

      {/* Hero Banners Tab */}
      {activeTab === "hero_banners" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-stone-900 dark:text-white">
                Store Hero Carousel Slides
              </h3>
              <p className="text-xs text-stone-500">
                Large auto-scrolling promotional banners featured right at the top of the store page.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={addHeroBanner}>
              <Plus className="size-4 mr-1.5" />
              Add Banner Slide
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {formData.hero_banners.map((b, idx) => (
              <Card key={b.id || idx} className="overflow-hidden border border-stone-200 dark:border-stone-800">
                <CardHeader className="bg-stone-50/80 dark:bg-stone-900/50 flex flex-row items-center justify-between border-b border-stone-200 dark:border-stone-800 py-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-6 items-center justify-center rounded-full bg-amber-500 text-white text-xs font-bold">
                      {idx + 1}
                    </span>
                    <CardTitle className="text-sm font-bold text-stone-900 dark:text-white">
                      {b.title || `Slide #${idx + 1}`}
                    </CardTitle>
                    {b.badge_text && (
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300">
                        {b.badge_text}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-stone-600 dark:text-stone-400 font-medium">Active</span>
                      <Switch
                        checked={b.is_active}
                        onChange={(val: boolean) => updateHeroBanner(idx, { is_active: val })}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeHeroBanner(idx)}
                      className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </CardHeader>

                <CardBody className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
                  {/* Preview Thumbnail */}
                  <div className="lg:col-span-4 space-y-2">
                    <div className="relative aspect-16/9 w-full rounded-xl overflow-hidden bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-inner">
                      {b.image_url ? (
                        <Image
                          src={b.image_url}
                          alt={b.title}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center text-stone-400">
                          <ImageIcon className="size-8" />
                        </div>
                      )}
                    </div>
                    <Field label="Banner Image URL">
                      <Input
                        value={b.image_url}
                        onChange={(e) => updateHeroBanner(idx, { image_url: e.target.value })}
                        placeholder="https://..."
                      />
                    </Field>
                  </div>

                  {/* Form fields */}
                  <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Main Title / Headline">
                      <Input
                        value={b.title}
                        onChange={(e) => updateHeroBanner(idx, { title: e.target.value })}
                        placeholder="e.g. WEAR YOUR ZODIAC"
                      />
                    </Field>

                    <Field label="Badge / Eyebrow Text">
                      <Input
                        value={b.badge_text || ""}
                        onChange={(e) => updateHeroBanner(idx, { badge_text: e.target.value })}
                        placeholder="e.g. NEW LAUNCH / BESTSELLER"
                      />
                    </Field>

                    <div className="md:col-span-2">
                      <Field label="Subtitle / Tagline">
                        <Input
                          value={b.subtitle}
                          onChange={(e) => updateHeroBanner(idx, { subtitle: e.target.value })}
                          placeholder="e.g. Discover the new zodiac ring collection handcrafted in sterling silver..."
                        />
                      </Field>
                    </div>

                    <Field label="CTA Button Label">
                      <Input
                        value={b.cta_text}
                        onChange={(e) => updateHeroBanner(idx, { cta_text: e.target.value })}
                        placeholder="e.g. SHOP NOW"
                      />
                    </Field>

                    <Field label="CTA Link (Internal or external)">
                      <Input
                        value={b.cta_link}
                        onChange={(e) => updateHeroBanner(idx, { cta_link: e.target.value })}
                        placeholder="e.g. /shop?category=zodiac"
                      />
                    </Field>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Top Announcement Tab */}
      {activeTab === "announcement" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold">Top Running Notice Bar</CardTitle>
            <CardDescription>
              Displays at the very top of the store with a gold accent background and emoji highlights.
            </CardDescription>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
              <span className="text-sm font-semibold text-stone-900 dark:text-white">
                Enable Announcement Bar
              </span>
              <Switch
                checked={formData.announcement_bar_active}
                onChange={(val: boolean) => {
                  setFormData((prev) => ({ ...prev, announcement_bar_active: val }));
                  setIsDirty(true);
                }}
              />
            </div>

            <Field label="Announcement Text">
              <Input
                value={formData.announcement_bar_text || ""}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, announcement_bar_text: e.target.value }));
                  setIsDirty(true);
                }}
                placeholder="🛍️ Discover Sacred Jewellery Based on Your Mulank ✨"
              />
            </Field>

            <Field label="Announcement Link">
              <Input
                value={formData.announcement_bar_link || ""}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, announcement_bar_link: e.target.value }));
                  setIsDirty(true);
                }}
                placeholder="/shop"
              />
            </Field>

            <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 p-3 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2">
              <Sparkles className="size-4 text-amber-600 shrink-0" />
              <span>Preview: {formData.announcement_bar_text || "(No announcement set)"}</span>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Store Policies, COD & Anti-Fraud Tab */}
      {activeTab === "policies" && (
        <div className="space-y-6">
          <div>
            <h3 className="text-base font-bold text-stone-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="size-5 text-emerald-600" />
              <span>Store Policies, COD & Anti-Fraud Security Controls</span>
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Manage Cash on Delivery (COD) availability, customer order cancellation rules, and anti-fraud cashback coin release triggers.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. COD Control Card */}
            <Card className="border border-stone-200 dark:border-stone-800">
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Truck className="size-4 text-amber-600" />
                  <span>Cash on Delivery (COD) Control</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Enable or disable Cash on Delivery across the entire AstroStore with 1 click.
                </CardDescription>
              </CardHeader>
              <CardBody className="space-y-4">
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50">
                  <div className="space-y-0.5 pr-4">
                    <span className="text-xs font-bold text-stone-900 dark:text-white">
                      Enable Cash on Delivery (COD)
                    </span>
                    <p className="text-[11px] text-stone-500">
                      When turned off, customers can only pay using Prepaid methods (UPI, Cards, NetBanking).
                    </p>
                  </div>
                  <Switch
                    checked={formData.cod_enabled ?? true}
                    onChange={(checked) => {
                      setFormData((prev) => ({ ...prev, cod_enabled: checked }));
                      setIsDirty(true);
                    }}
                  />
                </div>

                <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-300 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <Info className="size-3.5" />
                    <span>Current Status: {(formData.cod_enabled ?? true) ? "COD is Active" : "COD is Disabled"}</span>
                  </div>
                  <p className="text-[11px]">
                    {(formData.cod_enabled ?? true)
                      ? "Customers across serviceable PIN codes can place orders with Cash on Delivery."
                      : "Only online payment is allowed. Checkout and Pincode tracker will show COD as disabled."}
                  </p>
                </div>
              </CardBody>
            </Card>

            {/* 2. Cashback Credit Timing Trigger Card */}
            <Card className="border border-stone-200 dark:border-stone-800">
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Coins className="size-4 text-emerald-600" />
                  <span>Cashback Coins Disbursement Trigger</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Configure precisely when 100% wallet cashback coins are unlocked and credited to the devotee's wallet.
                </CardDescription>
              </CardHeader>
              <CardBody className="space-y-3">
                {/* Option A: On Delivery (Recommended) */}
                <label
                  className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                    (formData.cashback_credit_timing || "on_delivery") === "on_delivery"
                      ? "border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-xs"
                      : "border-stone-200 dark:border-stone-800 hover:border-stone-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="cashback_timing"
                    value="on_delivery"
                    checked={(formData.cashback_credit_timing || "on_delivery") === "on_delivery"}
                    onChange={() => {
                      setFormData((prev) => ({ ...prev, cashback_credit_timing: "on_delivery" }));
                      setIsDirty(true);
                    }}
                    className="mt-0.5 accent-emerald-600"
                  />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-stone-900 dark:text-white">
                        🛡️ Upon Successful Delivery (Recommended • 100% Anti-Fraud)
                      </span>
                      <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-sm bg-emerald-100 text-emerald-800">
                        SAFE
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-600 dark:text-stone-400 leading-relaxed">
                      Cashback coins are reserved upon order confirmation and credited to the devotee's wallet only after physical doorstep delivery. Eliminates cancellation abuse where a user spends coins on astrologers and cancels the order!
                    </p>
                  </div>
                </label>

                {/* Option B: On Payment */}
                <label
                  className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                    formData.cashback_credit_timing === "on_payment"
                      ? "border-amber-600 bg-amber-50/50 dark:bg-amber-950/20 shadow-xs"
                      : "border-stone-200 dark:border-stone-800 hover:border-stone-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="cashback_timing"
                    value="on_payment"
                    checked={formData.cashback_credit_timing === "on_payment"}
                    onChange={() => {
                      setFormData((prev) => ({ ...prev, cashback_credit_timing: "on_payment" }));
                      setIsDirty(true);
                    }}
                    className="mt-0.5 accent-amber-600"
                  />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-stone-900 dark:text-white">
                        ⚡ Instant Upon Online Payment Verification
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-600 dark:text-stone-400 leading-relaxed">
                      Coins are credited immediately. If customer spends the coins on consultations, our automatic anti-fraud lock prevents them from cancelling the order.
                    </p>
                  </div>
                </label>
              </CardBody>
            </Card>

            {/* 3. Customer Order Cancellation Policy */}
            <Card className="border border-stone-200 dark:border-stone-800">
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Clock className="size-4 text-blue-600" />
                  <span>Customer Order Cancellation Policy</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Controls whether and how long customers can cancel orders before dispatch.
                </CardDescription>
              </CardHeader>
              <CardBody className="space-y-4">
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50">
                  <div className="space-y-0.5 pr-4">
                    <span className="text-xs font-bold text-stone-900 dark:text-white">
                      Allow Online Cancellation Before Dispatch
                    </span>
                    <p className="text-[11px] text-stone-500">
                      When disabled, customers cannot cancel orders online and must contact customer support.
                    </p>
                  </div>
                  <Switch
                    checked={formData.allow_user_cancellation ?? true}
                    onChange={(checked) => {
                      setFormData((prev) => ({ ...prev, allow_user_cancellation: checked }));
                      setIsDirty(true);
                    }}
                  />
                </div>

                <Field label="Cancellation Grace Window (Hours)" hint="Hours from order placement during which cancellation is allowed before shipping.">
                  <Input
                    type="number"
                    min={1}
                    max={168}
                    value={formData.cancellation_grace_hours ?? 24}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, cancellation_grace_hours: Number(e.target.value) }));
                      setIsDirty(true);
                    }}
                  />
                </Field>
              </CardBody>
            </Card>

            {/* 4. Anti-Fraud Spent Coins Protection Shield Status */}
            <Card className="border border-stone-200 dark:border-stone-800">
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Lock className="size-4 text-emerald-600" />
                  <span>Anti-Gaming Spent Coins Shield</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Automated financial security guard built into backend cancellation endpoints.
                </CardDescription>
              </CardHeader>
              <CardBody className="space-y-3">
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-950 dark:text-emerald-300 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <CheckCircle2 className="size-4.5 text-emerald-600" />
                    <span>Real-Time Coin Spent Protection: ACTIVE</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    If an order's credited cashback coins have already been consumed by the devotee for live astrologer calls or chats, the backend strictly rejects any cancellation attempt with an error message:
                  </p>
                  <blockquote className="p-2 rounded bg-white/80 dark:bg-black/30 border-l-2 border-emerald-600 text-[10px] font-mono">
                    "এই অর্ডারের জন্য প্রাপ্ত ক্যাশব্যাক কয়েন ইতিমধ্যে জ্যোতিষী পরামর্শে ব্যবহার করা হয়েছে। তাই এই অর্ডারটি সরাসরি বাতিল করা সম্ভব নয়।"
                  </blockquote>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {/* Customer Reels Tab */}
      {activeTab === "reels" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-stone-900 dark:text-white">
                Customer Stories & Video Reels
              </h3>
              <p className="text-xs text-stone-500">
                Vertical 9:16 video cards in the 'Loved by You, Shared by You' section with verified reviews & tagged products.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={addReel}>
              <Plus className="size-4 mr-1.5" />
              Add Story Reel
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {formData.reels.map((r, idx) => (
              <Card key={r.id || idx} className="overflow-hidden border border-stone-200 dark:border-stone-800 flex flex-col justify-between">
                <CardHeader className="bg-stone-50/80 dark:bg-stone-900/50 flex flex-row items-center justify-between border-b border-stone-200 dark:border-stone-800 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="flex size-5 items-center justify-center rounded-full bg-amber-500 text-white text-[11px] font-bold">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold text-stone-900 dark:text-white">
                      {r.user_handle || `@user${idx + 1}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={r.is_active}
                      onChange={(val: boolean) => updateReel(idx, { is_active: val })}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeReel(idx)}
                      className="text-rose-600 hover:text-rose-700 p-1"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </CardHeader>

                <CardBody className="p-4 space-y-3">
                  <div className="relative aspect-9/16 max-h-48 w-full rounded-xl overflow-hidden bg-stone-900 mx-auto">
                    {r.thumbnail_url ? (
                      <Image
                        src={r.thumbnail_url}
                        alt={r.user_handle}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center text-stone-500">
                        <Video className="size-8" />
                      </div>
                    )}
                    <span className="absolute bottom-2 left-2 text-[10px] font-bold bg-black/70 text-white px-2 py-0.5 rounded-md">
                      ❤️ {r.likes_count}
                    </span>
                  </div>

                  <Field label="Thumbnail URL">
                    <Input
                      value={r.thumbnail_url}
                      onChange={(e) => updateReel(idx, { thumbnail_url: e.target.value })}
                      placeholder="https://..."
                    />
                  </Field>

                  <Field label="Video URL (mp4 preview)">
                    <Input
                      value={r.video_url || ""}
                      onChange={(e) => updateReel(idx, { video_url: e.target.value })}
                      placeholder="https://..."
                    />
                  </Field>

                  <div className="grid grid-cols-2 gap-2">
                    <Field label="User Handle">
                      <Input
                        value={r.user_handle}
                        onChange={(e) => updateReel(idx, { user_handle: e.target.value })}
                        placeholder="@username"
                      />
                    </Field>
                    <Field label="Likes Count">
                      <Input
                        value={r.likes_count}
                        onChange={(e) => updateReel(idx, { likes_count: e.target.value })}
                        placeholder="e.g. 4.8k"
                      />
                    </Field>
                  </div>

                  <Field label="Review / Quote">
                    <Input
                      value={r.quote}
                      onChange={(e) => updateReel(idx, { quote: e.target.value })}
                      placeholder="Customer quote..."
                    />
                  </Field>

                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Tagged Product Title">
                      <Input
                        value={r.tagged_product_title || ""}
                        onChange={(e) => updateReel(idx, { tagged_product_title: e.target.value })}
                        placeholder="Product name"
                      />
                    </Field>
                    <Field label="Tagged Price (₹)">
                      <Input
                        type="number"
                        value={r.tagged_product_price || ""}
                        onChange={(e) =>
                          updateReel(idx, { tagged_product_price: Number(e.target.value) || 0 })
                        }
                        placeholder="999"
                      />
                    </Field>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
