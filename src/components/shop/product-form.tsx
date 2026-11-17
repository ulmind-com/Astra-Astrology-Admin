"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Award,
  CheckCircle2,
  DollarSign,
  FileCheck,
  Flame,
  HelpCircle,
  Info,
  Loader2,
  Package,
  Plus,
  Save,
  ShieldCheck,
  Sparkles,
  Tag,
  Video,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { ProductImageUploader } from "@/components/shop/product-image-uploader";
import {
  Button,
  Card,
  CardBody,
  CardDescription,
  CardHeader,
  CardTitle,
  Field,
  Input,
  Select,
  Switch,
  Textarea,
} from "@/components/ui";
import { shopAdminApi } from "@/lib/api";
import type { ShopProduct, ShopProductCategory, ShopProductInput } from "@/types";

const RULING_PLANETS = [
  "Surya (Sun)",
  "Chandra (Moon)",
  "Mangala (Mars)",
  "Budha (Mercury)",
  "Guru (Jupiter)",
  "Shukra (Venus)",
  "Shani (Saturn)",
  "Rahu (North Node)",
  "Ketu (South Node)",
];

const LIFE_PILLAR_OPTIONS = [
  "Career & Business",
  "Love & Marriage",
  "Wealth & Prosperity",
  "Health & Vitality",
  "Spiritual Growth",
  "Protection & Nazar Dosha",
  "Academic & Education",
];

const RASHI_OPTIONS = [
  "Mesha (Aries)",
  "Vrishabha (Taurus)",
  "Mithuna (Gemini)",
  "Karka (Cancer)",
  "Simha (Leo)",
  "Kanya (Virgo)",
  "Tula (Libra)",
  "Vrischika (Scorpio)",
  "Dhanu (Sagittarius)",
  "Makara (Capricorn)",
  "Kumbha (Aquarius)",
  "Meena (Pisces)",
];

const DEITY_SUGGESTIONS = [
  "Lord Shiva",
  "Goddess Lakshmi",
  "Lord Ganesha",
  "Lord Hanuman",
  "Lord Vishnu",
  "Goddess Durga",
  "Lord Kartikeya / Murugan",
  "Navagraha Devatas",
];

interface ProductFormProps {
  initialProduct?: ShopProduct | null;
  isEditing?: boolean;
}

export function ProductForm({ initialProduct, isEditing = false }: ProductFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Categories query
  const { data: categories = [], isLoading: isLoadingCategories } = useQuery<ShopProductCategory[]>({
    queryKey: ["shop_categories"],
    queryFn: async () => {
      const res = await shopAdminApi.listCategories(true);
      return res || [];
    },
  });

  // Form State
  const [title, setTitle] = React.useState(initialProduct?.title || "");
  const [slug, setSlug] = React.useState(initialProduct?.slug || "");
  const [sku, setSku] = React.useState(initialProduct?.sku || "");
  const [categoryId, setCategoryId] = React.useState(initialProduct?.category_id || "");
  const [categoryType, setCategoryType] = React.useState(initialProduct?.category_type || "other");
  const [shortDesc, setShortDesc] = React.useState(initialProduct?.short_description || "");
  const [detailedDesc, setDetailedDesc] = React.useState(initialProduct?.detailed_description || "");

  // Astrological Attributes
  const [rulingPlanet, setRulingPlanet] = React.useState(initialProduct?.ruling_planet || "");
  const [deity, setDeity] = React.useState(initialProduct?.deity || "");
  const [beejMantra, setBeejMantra] = React.useState(initialProduct?.beej_mantra || "");
  const [wearInstructions, setWearInstructions] = React.useState(initialProduct?.wear_instructions || "");
  const [benefits, setBenefits] = React.useState<string[]>(initialProduct?.benefits || []);
  const [benefitInput, setBenefitInput] = React.useState("");
  const [lifePillars, setLifePillars] = React.useState<string[]>(initialProduct?.life_pillars || []);
  const [recommendedRashis, setRecommendedRashis] = React.useState<string[]>(
    initialProduct?.recommended_for_rashis || []
  );

  // Pricing & Inventory
  const [mrp, setMrp] = React.useState<number>(initialProduct?.mrp || 0);
  const [salePrice, setSalePrice] = React.useState<number>(initialProduct?.sale_price || 0);
  const [costPrice, setCostPrice] = React.useState<number | undefined>(initialProduct?.cost_price || undefined);
  const [stockQuantity, setStockQuantity] = React.useState<number>(initialProduct?.stock_quantity ?? 10);
  const [lowStockThreshold, setLowStockThreshold] = React.useState<number>(
    initialProduct?.low_stock_threshold ?? 5
  );
  const [weightGrams, setWeightGrams] = React.useState<number>(initialProduct?.weight_grams || 100);

  // Media
  const [images, setImages] = React.useState<string[]>(initialProduct?.images || []);
  const [featuredImage, setFeaturedImage] = React.useState<string>(initialProduct?.featured_image || "");
  const [certificateImageUrl, setCertificateImageUrl] = React.useState<string>(
    initialProduct?.certificate_image_url || ""
  );
  const [videoUrl, setVideoUrl] = React.useState<string>(initialProduct?.video_url || "");
  const [isUploadingCert, setIsUploadingCert] = React.useState(false);

  // Status
  const [isActive, setIsActive] = React.useState<boolean>(initialProduct?.is_active ?? true);
  const [isFeatured, setIsFeatured] = React.useState<boolean>(initialProduct?.is_featured ?? false);
  const [isEnergized, setIsEnergized] = React.useState<boolean>(initialProduct?.is_energized ?? true);

  // Auto-slugify when title changes (if not editing or if slug matches old title)
  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    if (!isEditing || !slug) {
      const generated = newTitle
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "");
      setSlug(generated);
    }
  };

  // Sync category type when categoryId selected
  React.useEffect(() => {
    if (categoryId && categories.length > 0) {
      const matched = categories.find((c) => c.id === categoryId);
      if (matched) {
        setCategoryType(matched.category_type);
      }
    }
  }, [categoryId, categories]);

  const addBenefit = () => {
    const val = benefitInput.trim();
    if (val && !benefits.includes(val)) {
      setBenefits([...benefits, val]);
      setBenefitInput("");
    }
  };

  const removeBenefit = (item: string) => {
    setBenefits(benefits.filter((b) => b !== item));
  };

  const togglePillar = (pillar: string) => {
    if (lifePillars.includes(pillar)) {
      setLifePillars(lifePillars.filter((p) => p !== pillar));
    } else {
      setLifePillars([...lifePillars, pillar]);
    }
  };

  const toggleRashi = (rashi: string) => {
    if (recommendedRashis.includes(rashi)) {
      setRecommendedRashis(recommendedRashis.filter((r) => r !== rashi));
    } else {
      setRecommendedRashis([...recommendedRashis, rashi]);
    }
  };

  const handleCertificateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingCert(true);
    const toastId = toast.loading("Uploading authentic certificate...");
    try {
      const res = await shopAdminApi.uploadImage(file);
      if (res?.url) {
        setCertificateImageUrl(res.url);
        toast.success("Authentic lab certificate uploaded successfully.", { id: toastId });
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to upload certificate.", { id: toastId });
    } finally {
      setIsUploadingCert(false);
      e.target.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Please enter a product title.");
      return;
    }
    if (!categoryId) {
      toast.error("Please select a product category.");
      return;
    }
    if (!shortDesc.trim()) {
      toast.error("Please provide a short summary description.");
      return;
    }
    if (salePrice <= 0 || mrp <= 0) {
      toast.error("MRP and Selling Price must be greater than ₹0.");
      return;
    }
    if (salePrice > mrp) {
      toast.error("Sale price cannot exceed MRP.");
      return;
    }
    if (images.length === 0 && !featuredImage) {
      toast.error("Please upload at least one product image.");
      return;
    }

    const primaryImage = featuredImage || images[0];

    const payload: ShopProductInput = {
      title: title.trim(),
      slug: slug.trim() || undefined,
      sku: sku.trim() || undefined,
      short_description: shortDesc.trim(),
      detailed_description: detailedDesc.trim() || shortDesc.trim(),
      category_id: categoryId,
      category_type: categoryType,
      ruling_planet: rulingPlanet || undefined,
      deity: deity || undefined,
      benefits,
      life_pillars: lifePillars,
      recommended_for_rashis: recommendedRashis,
      beej_mantra: beejMantra.trim() || undefined,
      wear_instructions: wearInstructions.trim() || undefined,
      mrp: Number(mrp),
      sale_price: Number(salePrice),
      cost_price: costPrice !== undefined ? Number(costPrice) : undefined,
      stock_quantity: Number(stockQuantity),
      low_stock_threshold: Number(lowStockThreshold),
      weight_grams: Number(weightGrams),
      images: images.length > 0 ? images : [primaryImage],
      featured_image: primaryImage,
      video_url: videoUrl.trim() || undefined,
      certificate_image_url: certificateImageUrl.trim() || undefined,
      is_active: isActive,
      is_featured: isFeatured,
      is_energized: isEnergized,
    };

    setIsSubmitting(true);
    const toastId = toast.loading(isEditing ? "Updating remedy product..." : "Creating remedy product...");

    try {
      if (isEditing && initialProduct?.id) {
        await shopAdminApi.updateProduct(initialProduct.id, payload);
        toast.success("Product updated successfully! Discarded images were cleanly purged from Cloudinary.", {
          id: toastId,
        });
      } else {
        await shopAdminApi.createProduct(payload);
        toast.success("Sacred remedy product created successfully!", { id: toastId });
      }
      router.push("/products");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to save product.", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const discountPercent = mrp > 0 && salePrice > 0 ? Math.round(((mrp - salePrice) / mrp) * 100) : 0;
  const marginINR = costPrice !== undefined ? salePrice - costPrice : undefined;

  return (
    <form onSubmit={handleSubmit} className="space-y-8 pb-16">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/products"
            className="size-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:text-slate-900 hover:border-slate-300 transition-colors shadow-sm"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              {isEditing ? `Edit: ${initialProduct?.title}` : "Add New Sacred Remedy Product"}
            </h1>
            <p className="text-xs text-slate-500">
              Set authentic scriptural metadata, high-efficiency WebP imagery, and real-time inventory control.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/products">
            <Button variant="outline" type="button" disabled={isSubmitting}>
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold flex items-center gap-2 shadow-sm"
          >
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {isEditing ? "Save Changes" : "Publish Product"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Main Product Data */}
        <div className="lg:col-span-2 space-y-8">
          {/* Section 1: Basic Information */}
          <Card className="rounded-2xl border-slate-200/80 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Package className="size-4 text-amber-600" />
                <CardTitle className="text-base font-bold text-slate-800">Basic Information</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Essential customer-facing titles, category assignment, and SKU identifiers.
              </CardDescription>
            </CardHeader>
            <CardBody className="space-y-4 pt-4">
              <Field label="Product Title *" hint="Display name on store listing">
                <Input
                  required
                  placeholder="e.g. Certified 5-Mukhi Nepal Rudraksha Mala (108+1 Beads)"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Category *">
                  <Select
                    required
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    disabled={isLoadingCategories}
                  >
                    <option value="">-- Choose Category --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.category_type.toUpperCase()})
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field label="SKU Code" hint="Unique inventory code">
                  <Input
                    placeholder="e.g. ASTRA-RUD-5M-108"
                    value={sku}
                    onChange={(e) => setSku(e.target.value.toUpperCase())}
                  />
                </Field>
              </div>

              <Field label="Custom SEO Slug" hint="Leave blank to auto-generate from title">
                <Input
                  placeholder="e.g. certified-5-mukhi-nepal-rudraksha-mala"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                />
              </Field>

              <Field label="Short Summary *" hint="1-2 sentences shown on product cards and checkout">
                <Textarea
                  required
                  rows={2}
                  placeholder="Hand-selected authentic 5-Mukhi Nepal Rudraksha blessed for Jupiter pacification, memory, and spiritual peace."
                  value={shortDesc}
                  onChange={(e) => setShortDesc(e.target.value)}
                />
              </Field>

              <Field
                label="Detailed Description & Scriptural Essence *"
                hint="Rich overview of origin, authentic Vedic references, and cleansing rituals"
              >
                <Textarea
                  required
                  rows={6}
                  placeholder="Write the full authentic details, Vedic references (e.g. Shiva Purana, Lal Kitab), purification rituals, and certified origins here..."
                  value={detailedDesc}
                  onChange={(e) => setDetailedDesc(e.target.value)}
                />
              </Field>
            </CardBody>
          </Card>

          {/* Section 2: Media & Image Gallery (Cloudinary WebP Auto-Compressed) */}
          <Card className="rounded-2xl border-slate-200/80 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-amber-600" />
                <CardTitle className="text-base font-bold text-slate-800">Media & Cloudinary Assets</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Upload authentic photos. Images are automatically compressed to bounded WebP and orphaned images
                are purged upon updates.
              </CardDescription>
            </CardHeader>
            <CardBody className="space-y-6 pt-4">
              <ProductImageUploader
                images={images}
                featuredImage={featuredImage}
                onChange={(newImages, newFeatured) => {
                  setImages(newImages);
                  setFeaturedImage(newFeatured);
                }}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                <Field label="Authentic Certificate Image (Optional)" hint="Government or Gemological lab certificate">
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleCertificateUpload}
                      disabled={isUploadingCert}
                    />
                    {certificateImageUrl && (
                      <a
                        href={certificateImageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="size-9 shrink-0 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center text-amber-600 hover:text-amber-700"
                        title="View Certificate"
                      >
                        <FileCheck className="size-4" />
                      </a>
                    )}
                  </div>
                </Field>

                <Field label="Video Showcase URL (Optional)" hint="YouTube / Cloudinary video link">
                  <Input
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                  />
                </Field>
              </div>
            </CardBody>
          </Card>

          {/* Section 3: Astrological Canon & Sacred Properties */}
          <Card className="rounded-2xl border-slate-200/80 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Flame className="size-4 text-amber-600" />
                <CardTitle className="text-base font-bold text-slate-800">
                  Astrological Metadata & Lal Kitab Canon
                </CardTitle>
              </div>
              <CardDescription className="text-xs">
                Planetary rulerships, presiding deities, mantras, and personalized Vedic recommendation tags.
              </CardDescription>
            </CardHeader>
            <CardBody className="space-y-6 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Ruling Planet (গ্রহ)">
                  <Select value={rulingPlanet} onChange={(e) => setRulingPlanet(e.target.value)}>
                    <option value="">-- None / Neutral --</option>
                    {RULING_PLANETS.map((planet) => (
                      <option key={planet} value={planet}>
                        {planet}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field label="Presiding Deity (ইষ্টদেবতা)">
                  <Input
                    placeholder="e.g. Lord Shiva, Goddess Mahalakshmi"
                    value={deity}
                    onChange={(e) => setDeity(e.target.value)}
                    list="deity-list"
                  />
                  <datalist id="deity-list">
                    {DEITY_SUGGESTIONS.map((d) => (
                      <option key={d} value={d} />
                    ))}
                  </datalist>
                </Field>
              </div>

              {/* Benefits Tag Input */}
              <div className="space-y-2">
                <Field label="Astrological Benefits (উপকারিতা)" hint="Press Enter or Click '+' to add tags">
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g. Removes Pitra Dosha, Attracts Wealth, Calms Mind"
                      value={benefitInput}
                      onChange={(e) => setBenefitInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addBenefit();
                        }
                      }}
                    />
                    <Button type="button" onClick={addBenefit} variant="outline" className="shrink-0">
                      <Plus className="size-4" />
                    </Button>
                  </div>
                </Field>

                {benefits.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {benefits.map((b) => (
                      <span
                        key={b}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 text-xs font-semibold"
                      >
                        {b}
                        <button
                          type="button"
                          onClick={() => removeBenefit(b)}
                          className="hover:text-red-600 transition-colors"
                        >
                          <X className="size-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Life Pillars Multi-select */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">Target Life Pillars</label>
                <div className="flex flex-wrap gap-2">
                  {LIFE_PILLAR_OPTIONS.map((pillar) => {
                    const isSelected = lifePillars.includes(pillar);
                    return (
                      <button
                        key={pillar}
                        type="button"
                        onClick={() => togglePillar(pillar)}
                        className={`text-xs px-3 py-1.5 rounded-xl border font-medium transition-all ${
                          isSelected
                            ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                            : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        {pillar}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Recommended Rashis Multi-select */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">Recommended Zodiac Signs (রাশি)</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {RASHI_OPTIONS.map((rashi) => {
                    const isSelected = recommendedRashis.includes(rashi);
                    return (
                      <button
                        key={rashi}
                        type="button"
                        onClick={() => toggleRashi(rashi)}
                        className={`text-xs p-2 rounded-xl border text-left font-medium transition-all ${
                          isSelected
                            ? "bg-amber-100/70 text-amber-950 border-amber-300 ring-1 ring-amber-300 font-bold"
                            : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        {rashi}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <Field label="Beej Mantra (বীজ মন্ত্র)" hint="Chanting formula for the user">
                  <Input
                    placeholder="e.g. ॐ ह्रीं नमः (Om Hreem Namah)"
                    value={beejMantra}
                    onChange={(e) => setBeejMantra(e.target.value)}
                  />
                </Field>

                <Field label="Wearing / Placement Instructions" hint="Vidhi, Muhurat, and Direction">
                  <Input
                    placeholder="e.g. Wear on Shukla Paksha Monday after purifying in Gangajal"
                    value={wearInstructions}
                    onChange={(e) => setWearInstructions(e.target.value)}
                  />
                </Field>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Right 1 Col: Pricing, Inventory, & Status Toggles */}
        <div className="space-y-8">
          {/* Section 4: Pricing & Margin Calculator */}
          <Card className="rounded-2xl border-slate-200/80 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <DollarSign className="size-4 text-emerald-600" />
                <CardTitle className="text-base font-bold text-slate-800">Pricing & Margins</CardTitle>
              </div>
              <CardDescription className="text-xs">
                All pricing is denominated in real Indian Rupees (₹).
              </CardDescription>
            </CardHeader>
            <CardBody className="space-y-4 pt-4">
              <Field label="Original MRP (₹) *" hint="Strike-through retail price">
                <Input
                  required
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="2999"
                  value={mrp || ""}
                  onChange={(e) => setMrp(parseFloat(e.target.value) || 0)}
                />
              </Field>

              <Field label="Selling Sale Price (₹) *" hint="The actual customer checkout price">
                <Input
                  required
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="1999"
                  value={salePrice || ""}
                  onChange={(e) => setSalePrice(parseFloat(e.target.value) || 0)}
                />
              </Field>

              <Field
                label="Procurement / Cost Price (₹)"
                hint="Internal only: used to calculate admin profit margins"
              >
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="850"
                  value={costPrice !== undefined ? costPrice : ""}
                  onChange={(e) =>
                    setCostPrice(e.target.value === "" ? undefined : parseFloat(e.target.value) || 0)
                  }
                />
              </Field>

              {/* Profit & Discount Pill Box */}
              <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Customer Discount:</span>
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    {discountPercent}% OFF
                  </span>
                </div>
                {marginINR !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Gross Margin per Unit:</span>
                    <span className="font-bold text-slate-800">
                      ₹{marginINR.toLocaleString("en-IN")} (
                      {salePrice > 0 ? Math.round((marginINR / salePrice) * 100) : 0}%)
                    </span>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>

          {/* Section 5: Inventory & Warehouse Alerts */}
          <Card className="rounded-2xl border-slate-200/80 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Package className="size-4 text-amber-600" />
                <CardTitle className="text-base font-bold text-slate-800">Inventory & Stock</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Control active stock counts and automatic low-stock warnings.
              </CardDescription>
            </CardHeader>
            <CardBody className="space-y-4 pt-4">
              <Field label="In-Stock Units *" hint="Current warehouse quantity">
                <Input
                  required
                  type="number"
                  min="0"
                  placeholder="25"
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(parseInt(e.target.value) || 0)}
                />
              </Field>

              <Field label="Low-Stock Alert Threshold" hint="Triggers amber warning when stock drops to this level">
                <Input
                  type="number"
                  min="1"
                  placeholder="5"
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(parseInt(e.target.value) || 5)}
                />
              </Field>

              <Field label="Package Weight (grams)" hint="Used for courier delivery shipping slabs">
                <Input
                  type="number"
                  min="1"
                  placeholder="100"
                  value={weightGrams}
                  onChange={(e) => setWeightGrams(parseFloat(e.target.value) || 100)}
                />
              </Field>
            </CardBody>
          </Card>

          {/* Section 6: Status & Spiritual Certification */}
          <Card className="rounded-2xl border-slate-200/80 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-amber-600" />
                <CardTitle className="text-base font-bold text-slate-800">Status & Sanctification</CardTitle>
              </div>
            </CardHeader>
            <CardBody className="space-y-4 pt-4">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <div>
                  <p className="text-xs font-bold text-slate-800">Active Listing</p>
                  <p className="text-[11px] text-slate-500">Visible to customers in store</p>
                </div>
                <Switch checked={isActive} onChange={setIsActive} />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <div>
                  <p className="text-xs font-bold text-slate-800">Featured Remedy</p>
                  <p className="text-[11px] text-slate-500">Showcased in top homepage carousel</p>
                </div>
                <Switch checked={isFeatured} onChange={setIsFeatured} />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50/60 border border-amber-200/80">
                <div>
                  <div className="flex items-center gap-1">
                    <p className="text-xs font-bold text-amber-950">Pran-Pratishthit Certified</p>
                    <Award className="size-3 text-amber-600" />
                  </div>
                  <p className="text-[11px] text-amber-700">Display Vedic Sanctification badge</p>
                </div>
                <Switch checked={isEnergized} onChange={setIsEnergized} />
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </form>
  );
}
