"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Sparkles,
  RotateCw,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Save,
  Layers,
  Award,
  BookOpen,
  ArrowRight,
  Flame,
  Settings2,
  Eye,
  Sliders,
  Compass,
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
import { cmsAdminApi, type HomePageCMSData } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { useRequireAuth } from "@/providers/auth-provider";

type ActiveTab = "hero" | "chakra" | "cards" | "stats" | "services" | "cta";

export default function HomepageCMSPage() {
  const { ready } = useRequireAuth({ roles: ["admin", "super_admin"], signInPath: "/login" });
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = React.useState<ActiveTab>("hero");
  const [formData, setFormData] = React.useState<HomePageCMSData | null>(null);
  const [isDirty, setIsDirty] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const { data: serverData, isLoading, error } = useQuery({
    queryKey: ["admin", "cms", "homepage"],
    queryFn: cmsAdminApi.getHomepage,
    enabled: ready,
  });

  // Sync formData with serverData initially
  React.useEffect(() => {
    if (serverData && !formData) {
      setFormData(serverData);
    }
  }, [serverData, formData]);

  const updateField = <K extends keyof HomePageCMSData>(key: K, value: HomePageCMSData[K]) => {
    setFormData((prev) => {
      if (!prev) return prev;
      return { ...prev, [key]: value };
    });
    setIsDirty(true);
  };

  const updateCard = (index: number, field: "title" | "subtitle" | "link" | "icon", value: string) => {
    setFormData((prev) => {
      if (!prev) return prev;
      const nextCards = [...prev.hero_cards];
      if (nextCards[index]) {
        nextCards[index] = { ...nextCards[index], [field]: value };
      }
      return { ...prev, hero_cards: nextCards };
    });
    setIsDirty(true);
  };

  const updateStat = (index: number, field: "value" | "label", value: string) => {
    setFormData((prev) => {
      if (!prev) return prev;
      const nextStats = [...prev.trust_stats];
      if (nextStats[index]) {
        nextStats[index] = { ...nextStats[index], [field]: value };
      }
      return { ...prev, trust_stats: nextStats };
    });
    setIsDirty(true);
  };

  const saveMutation = useMutation<HomePageCMSData, unknown, HomePageCMSData>({
    mutationFn: (data: HomePageCMSData) => cmsAdminApi.updateHomepage(data),
    onSuccess: (updated: HomePageCMSData) => {
      setFormData(updated);
      setIsDirty(false);
      queryClient.setQueryData(["admin", "cms", "homepage"], updated);
      toast.success("Homepage content saved and live on site!", {
        description: "All changes are immediately reflected on the homepage.",
      });
    },
    onError: (err: unknown) => {
      const msg = err instanceof ApiError ? err.message : "Failed to save homepage changes.";
      toast.error(msg);
    },
  });

  const resetMutation = useMutation<HomePageCMSData, unknown, void>({
    mutationFn: () => cmsAdminApi.resetHomepage(),
    onSuccess: (resetted: HomePageCMSData) => {
      setFormData(resetted);
      setIsDirty(false);
      queryClient.setQueryData(["admin", "cms", "homepage"], resetted);
      toast.success("Homepage restored to factory defaults.");
    },
    onError: (err: unknown) => {
      const msg = err instanceof ApiError ? err.message : "Failed to reset homepage content.";
      toast.error(msg);
    },
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file (PNG, JPG, WebP, SVG).");
      return;
    }

    try {
      setIsUploading(true);
      toast.loading("Uploading image to media server...", { id: "uploading-img" });
      const res = await cmsAdminApi.uploadImage(file);
      updateField("hero_chakra_image_url", res.url);
      toast.success("Image uploaded successfully!", { id: "uploading-img" });
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : "Failed to upload image.";
      toast.error(msg, { id: "uploading-img" });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (!ready) return <LoadingBlock />;
  if (isLoading) return <LoadingBlock label="Loading Homepage CMS data..." />;
  if (error) return <Alert tone="error">{(error as ApiError).message}</Alert>;
  if (!formData) return null;

  return (
    <>
      <PanelHeader
        title="Homepage CMS & Theme Customizer"
        description="Full control over hero typography, texts, action buttons, feature cards, and the rotating celestial zodiac chakra — exactly like Shopify / WordPress theme customizers."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <a
              href="https://astra-astrology-web.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border/80 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="size-3.5" />
              Live Site
            </a>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (confirm("Are you sure you want to restore factory default copy and imagery?")) {
                  resetMutation.mutate();
                }
              }}
              disabled={resetMutation.isPending || saveMutation.isPending}
              className="text-xs"
            >
              <RefreshCw className={`size-3.5 mr-1.5 ${resetMutation.isPending ? "animate-spin" : ""}`} />
              Reset Defaults
            </Button>

            <Button
              size="sm"
              onClick={() => formData && saveMutation.mutate(formData)}
              disabled={!isDirty || saveMutation.isPending}
              className="text-xs shadow-glow"
            >
              <Save className={`size-3.5 mr-1.5 ${saveMutation.isPending ? "animate-spin" : ""}`} />
              {saveMutation.isPending ? "Saving..." : isDirty ? "Save Changes *" : "Saved"}
            </Button>
          </div>
        }
      />

      {/* Unsaved indicator banner */}
      {isDirty && (
        <div className="mb-4 flex items-center justify-between rounded-xl bg-amber-500/10 border border-amber-500/30 px-4 py-2.5 text-xs font-medium text-amber-700 dark:text-amber-400">
          <span className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
            You have unsaved changes. Don't forget to click "Save Changes" to publish.
          </span>
          <Button
            size="sm"
            onClick={() => saveMutation.mutate(formData)}
            disabled={saveMutation.isPending}
            className="h-7 text-xs px-2.5"
          >
            Publish Now
          </Button>
        </div>
      )}

      {/* Tabs Bar */}
      <div className="mb-6 flex overflow-x-auto no-scrollbar gap-1 border-b border-border/60 pb-2">
        {[
          { id: "hero", label: "Hero & Typography", icon: Sparkles },
          { id: "chakra", label: "Celestial Chakra Wheel", icon: RotateCw },
          { id: "cards", label: "2x2 Feature Cards", icon: Layers },
          { id: "stats", label: "Trust Metrics", icon: Award },
          { id: "services", label: "Services & Steps", icon: BookOpen },
          { id: "cta", label: "CTA Banner", icon: Flame },
        ].map(({ id, label, icon: Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id as ActiveTab)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
              }`}
            >
              <Icon className="size-3.5" />
              {label}
            </button>
          );
        })}
      </div>

      {/* ────────────────────────────────────────── TAB 1: HERO & TYPOGRAPHY */}
      {activeTab === "hero" && (
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="size-4 text-brand-600" />
                Hero Headline & Typography
              </CardTitle>
              <CardDescription>
                Customize the main header texts that every visitor sees on the homepage above the fold.
              </CardDescription>
            </CardHeader>
            <CardBody className="space-y-4">
              <Field label="Eyebrow Tagline" hint="Appears above the main headline in terracotta font">
                <Input
                  value={formData.hero_eyebrow}
                  onChange={(e) => updateField("hero_eyebrow", e.target.value)}
                  placeholder="Explore the Horoscope"
                />
              </Field>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="Headline Line 1" hint="First row of main hero title">
                  <Input
                    value={formData.hero_title_line1}
                    onChange={(e) => updateField("hero_title_line1", e.target.value)}
                    placeholder="WELCOME TO THE"
                  />
                </Field>
                <Field label="Headline Line 2" hint="Second row prefix">
                  <Input
                    value={formData.hero_title_line2}
                    onChange={(e) => updateField("hero_title_line2", e.target.value)}
                    placeholder="WORLD OF"
                  />
                </Field>
                <Field label="Highlighted Accent Word" hint="Rendered in decorative luxury terracotta font">
                  <Input
                    value={formData.hero_title_highlight}
                    onChange={(e) => updateField("hero_title_highlight", e.target.value)}
                    placeholder="ASTROLOGY"
                  />
                </Field>
              </div>

              {/* Live Preview Box */}
              <div className="rounded-xl border border-border/60 bg-[#fffaf5] dark:bg-[#1a1622] p-6 text-center">
                <span className="text-xs font-serif italic tracking-wide text-[#b06d4e]">
                  {formData.hero_eyebrow || "Explore the Horoscope"}
                </span>
                <h2 className="mt-2 text-2xl md:text-3xl font-black text-[#4D4664] dark:text-zinc-100">
                  {formData.hero_title_line1 || "WELCOME TO THE"}<br />
                  <span>{formData.hero_title_line2 || "WORLD OF"} </span>
                  <span className="font-serif font-bold text-[#b06d4e]">
                    {formData.hero_title_highlight || "ASTROLOGY"} ✦
                  </span>
                </h2>
              </div>

              <Field label="Hero Subtitle / Description" hint="Introductory paragraph under headline">
                <textarea
                  rows={3}
                  value={formData.hero_description}
                  onChange={(e) => updateField("hero_description", e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Learn about astrology, zodiac signs..."
                />
              </Field>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="rounded-lg border border-border/60 p-4 space-y-3 bg-muted/20">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Primary CTA Button
                  </span>
                  <Field label="Button Text">
                    <Input
                      value={formData.hero_cta_primary_text}
                      onChange={(e) => updateField("hero_cta_primary_text", e.target.value)}
                      placeholder="Find an Astrologer"
                    />
                  </Field>
                  <Field label="Button Destination Link">
                    <Input
                      value={formData.hero_cta_primary_link}
                      onChange={(e) => updateField("hero_cta_primary_link", e.target.value)}
                      placeholder="/astrologers"
                    />
                  </Field>
                </div>

                <div className="rounded-lg border border-border/60 p-4 space-y-3 bg-muted/20">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Secondary CTA Button
                  </span>
                  <Field label="Button Text">
                    <Input
                      value={formData.hero_cta_secondary_text}
                      onChange={(e) => updateField("hero_cta_secondary_text", e.target.value)}
                      placeholder="Kundli Matching"
                    />
                  </Field>
                  <Field label="Button Destination Link">
                    <Input
                      value={formData.hero_cta_secondary_link}
                      onChange={(e) => updateField("hero_cta_secondary_link", e.target.value)}
                      placeholder="/kundli-matching"
                    />
                  </Field>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* ────────────────────────────────────────── TAB 2: CELESTIAL CHAKRA WHEEL */}
      {activeTab === "chakra" && (
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <RotateCw className="size-4 text-brand-600" />
                Animated Celestial Zodiac Chakra Wheel
              </CardTitle>
              <CardDescription>
                Customize the sacred astrological chakra wheel displayed on the right of the hero section.
              </CardDescription>
            </CardHeader>
            <CardBody className="space-y-6">
              <div className="flex flex-col lg:flex-row items-center gap-8 p-6 rounded-2xl border border-border/60 bg-[#fffaf5] dark:bg-[#181520]">
                {/* Visual Wheel Preview */}
                <div className="relative size-56 sm:size-64 shrink-0 flex items-center justify-center rounded-full bg-gradient-to-tr from-[#f6d7c2]/40 via-[#faebd9]/30 to-[#f9e5a8]/30 shadow-inner">
                  {formData.hero_chakra_image_url ? (
                    <div
                      className={`relative size-48 sm:size-52 ${
                        formData.hero_chakra_enabled ? "animate-spin" : ""
                      }`}
                      style={{
                        animationDuration: `${formData.hero_chakra_speed_seconds || 60}s`,
                      }}
                    >
                      <img
                        src={formData.hero_chakra_image_url}
                        alt="Chakra Preview"
                        className="size-full object-contain select-none"
                      />
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">No image set</div>
                  )}
                  <span className="absolute bottom-2 text-[10px] font-semibold bg-background/80 backdrop-blur px-2 py-0.5 rounded-full border border-border">
                    {formData.hero_chakra_enabled
                      ? `${formData.hero_chakra_speed_seconds}s per revolution`
                      : "Rotation Disabled"}
                  </span>
                </div>

                {/* Controls */}
                <div className="flex-1 w-full space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-border/60">
                    <div>
                      <h4 className="text-sm font-semibold">Enable Rotation Animation</h4>
                      <p className="text-xs text-muted-foreground">
                        Turn kinetic astrological rotation on or off
                      </p>
                    </div>
                    <Switch
                      checked={formData.hero_chakra_enabled}
                      onChange={(checked: boolean) => updateField("hero_chakra_enabled", checked)}
                    />
                  </div>

                  <Field
                    label="Rotation Speed (Seconds per 360° turn)"
                    hint="Lower is faster (e.g. 30s = energetic, 60s = majestic, 120s = calm)"
                  >
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min={10}
                        max={180}
                        step={5}
                        value={formData.hero_chakra_speed_seconds}
                        onChange={(e) =>
                          updateField("hero_chakra_speed_seconds", Number(e.target.value))
                        }
                        className="w-full accent-primary cursor-pointer"
                      />
                      <span className="w-16 font-mono text-xs font-bold text-center px-2 py-1 bg-muted rounded border border-border">
                        {formData.hero_chakra_speed_seconds}s
                      </span>
                    </div>
                  </Field>

                  <Field label="Chakra Image Source URL" hint="Direct image link or upload a custom image">
                    <div className="flex gap-2">
                      <Input
                        value={formData.hero_chakra_image_url}
                        onChange={(e) => updateField("hero_chakra_image_url", e.target.value)}
                        placeholder="/zodiac-chakra.png"
                        className="font-mono text-xs"
                      />
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="shrink-0 text-xs"
                      >
                        <Upload className="size-3.5 mr-1.5" />
                        {isUploading ? "Uploading..." : "Upload File"}
                      </Button>
                    </div>
                  </Field>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => updateField("hero_chakra_image_url", "/zodiac-chakra.png")}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Use Built-in Sacred Mandala (/zodiac-chakra.png)
                    </Button>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* ────────────────────────────────────────── TAB 3: 2x2 FEATURE CARDS */}
      {activeTab === "cards" && (
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="size-4 text-brand-600" />
                2x2 Hero Feature Cards
              </CardTitle>
              <CardDescription>
                Customize the 4 interactive quick-action cards in the hero section (title, badge, target URL, icon).
              </CardDescription>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {formData.hero_cards.map((card, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-border/70 p-4 space-y-3 bg-card shadow-sm hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-center justify-between border-b border-border/50 pb-2">
                      <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                        <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-[10px]">
                          {idx + 1}
                        </span>
                        Card #{idx + 1}
                      </span>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        Icon: {card.icon}
                      </span>
                    </div>

                    <Field label="Card Title">
                      <Input
                        value={card.title}
                        onChange={(e) => updateCard(idx, "title", e.target.value)}
                        placeholder="Zodiac Signs"
                      />
                    </Field>

                    <Field label="Action Label">
                      <Input
                        value={card.subtitle}
                        onChange={(e) => updateCard(idx, "subtitle", e.target.value)}
                        placeholder="READ MORE"
                      />
                    </Field>

                    <Field
                      label="Link / Action"
                      hint="Path like /rashi-calculator or 'modal:chinese' to open Chinese Zodiac modal"
                    >
                      <Input
                        value={card.link}
                        onChange={(e) => updateCard(idx, "link", e.target.value)}
                        placeholder="/rashi-calculator"
                      />
                    </Field>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* ────────────────────────────────────────── TAB 4: TRUST METRICS */}
      {activeTab === "stats" && (
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="size-4 text-brand-600" />
                Trust Statistics Strip
              </CardTitle>
              <CardDescription>
                Customize the 3 social proof metrics placed right under the hero section.
              </CardDescription>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {formData.trust_stats.map((stat, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-border/70 p-4 space-y-3 bg-card shadow-sm"
                  >
                    <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                      Stat #{idx + 1}
                    </span>
                    <Field label="Metric Value (Number / Rating)">
                      <Input
                        value={stat.value}
                        onChange={(e) => updateStat(idx, "value", e.target.value)}
                        placeholder="500+"
                        className="font-bold font-mono text-base"
                      />
                    </Field>
                    <Field label="Metric Label / Subtitle">
                      <Input
                        value={stat.label}
                        onChange={(e) => updateStat(idx, "label", e.target.value)}
                        placeholder="VERIFIED ASTROLOGERS"
                      />
                    </Field>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* ────────────────────────────────────────── TAB 5: SERVICES & STEPS */}
      {activeTab === "services" && (
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="size-4 text-brand-600" />
                "What You Can Ask About" & "How It Works"
              </CardTitle>
              <CardDescription>
                Customize section headers and the 3 onboarding steps for clients.
              </CardDescription>
            </CardHeader>
            <CardBody className="space-y-6">
              {/* Services Header */}
              <div className="space-y-4 rounded-xl border border-border/60 p-4 bg-muted/20">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Services Section Header
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Eyebrow Badge">
                    <Input
                      value={formData.services_eyebrow}
                      onChange={(e) => updateField("services_eyebrow", e.target.value)}
                      placeholder="What we offer"
                    />
                  </Field>
                  <Field label="Section Title">
                    <Input
                      value={formData.services_title}
                      onChange={(e) => updateField("services_title", e.target.value)}
                      placeholder="What you can ask about"
                    />
                  </Field>
                </div>
                <Field label="Section Subtitle">
                  <Input
                    value={formData.services_description}
                    onChange={(e) => updateField("services_description", e.target.value)}
                    placeholder="Traditional methods, interpreted by people..."
                  />
                </Field>
              </div>

              {/* How it works 3 steps */}
              <div className="space-y-4 rounded-xl border border-border/60 p-4 bg-muted/20">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  How It Works (3 Steps)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-2">
                  <Field label="Badge Text">
                    <Input
                      value={formData.how_it_works_badge}
                      onChange={(e) => updateField("how_it_works_badge", e.target.value)}
                      placeholder="How it works"
                    />
                  </Field>
                  <Field label="Headline">
                    <Input
                      value={formData.how_it_works_title}
                      onChange={(e) => updateField("how_it_works_title", e.target.value)}
                      placeholder="Three steps to clarity"
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-lg border border-border bg-card p-3.5 space-y-2">
                    <span className="text-xs font-bold text-primary">Step 1</span>
                    <Field label="Title">
                      <Input
                        value={formData.step1_title}
                        onChange={(e) => updateField("step1_title", e.target.value)}
                        placeholder="Pick your astrologer"
                      />
                    </Field>
                    <Field label="Body">
                      <textarea
                        rows={2}
                        value={formData.step1_body}
                        onChange={(e) => updateField("step1_body", e.target.value)}
                        className="w-full rounded border border-border bg-background p-2 text-xs"
                      />
                    </Field>
                  </div>

                  <div className="rounded-lg border border-border bg-card p-3.5 space-y-2">
                    <span className="text-xs font-bold text-primary">Step 2</span>
                    <Field label="Title">
                      <Input
                        value={formData.step2_title}
                        onChange={(e) => updateField("step2_title", e.target.value)}
                        placeholder="Recharge your wallet"
                      />
                    </Field>
                    <Field label="Body">
                      <textarea
                        rows={2}
                        value={formData.step2_body}
                        onChange={(e) => updateField("step2_body", e.target.value)}
                        className="w-full rounded border border-border bg-background p-2 text-xs"
                      />
                    </Field>
                  </div>

                  <div className="rounded-lg border border-border bg-card p-3.5 space-y-2">
                    <span className="text-xs font-bold text-primary">Step 3</span>
                    <Field label="Title">
                      <Input
                        value={formData.step3_title}
                        onChange={(e) => updateField("step3_title", e.target.value)}
                        placeholder="Connect instantly"
                      />
                    </Field>
                    <Field label="Body">
                      <textarea
                        rows={2}
                        value={formData.step3_body}
                        onChange={(e) => updateField("step3_body", e.target.value)}
                        className="w-full rounded border border-border bg-background p-2 text-xs"
                      />
                    </Field>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* ────────────────────────────────────────── TAB 6: CTA BANNER */}
      {activeTab === "cta" && (
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Flame className="size-4 text-brand-600" />
                Bottom Call-to-Action Banner
              </CardTitle>
              <CardDescription>
                Customize the high-converting conversion banner at the bottom of the homepage.
              </CardDescription>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Badge Text">
                  <Input
                    value={formData.cta_badge}
                    onChange={(e) => updateField("cta_badge", e.target.value)}
                    placeholder="Get started today"
                  />
                </Field>
                <Field label="Main Heading">
                  <Input
                    value={formData.cta_title}
                    onChange={(e) => updateField("cta_title", e.target.value)}
                    placeholder="Ready when you are"
                  />
                </Field>
              </div>

              <Field label="Description Body">
                <textarea
                  rows={2}
                  value={formData.cta_description}
                  onChange={(e) => updateField("cta_description", e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  placeholder="Create an account, add your birth details..."
                />
              </Field>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="rounded-lg border border-border/60 p-4 space-y-3 bg-muted/20">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Primary Button
                  </span>
                  <Field label="Label">
                    <Input
                      value={formData.cta_primary_text}
                      onChange={(e) => updateField("cta_primary_text", e.target.value)}
                      placeholder="Get started — it's free"
                    />
                  </Field>
                  <Field label="URL Link">
                    <Input
                      value={formData.cta_primary_link}
                      onChange={(e) => updateField("cta_primary_link", e.target.value)}
                      placeholder="/register"
                    />
                  </Field>
                </div>

                <div className="rounded-lg border border-border/60 p-4 space-y-3 bg-muted/20">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Secondary Button
                  </span>
                  <Field label="Label">
                    <Input
                      value={formData.cta_secondary_text}
                      onChange={(e) => updateField("cta_secondary_text", e.target.value)}
                      placeholder="Browse astrologers"
                    />
                  </Field>
                  <Field label="URL Link">
                    <Input
                      value={formData.cta_secondary_link}
                      onChange={(e) => updateField("cta_secondary_link", e.target.value)}
                      placeholder="/astrologers"
                    />
                  </Field>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </>
  );
}
