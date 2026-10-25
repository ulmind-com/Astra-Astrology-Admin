"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Sparkles,
  Sun,
  Compass,
  HeartHandshake,
  Orbit,
  Hourglass,
  Moon,
  Star,
  Hand,
  ScanFace,
  Loader2,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

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
  Switch,
} from "@/components/ui";
import { adminSettingsApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { coinWord, type PlatformSettings } from "@/types";

interface FeatureConfig {
  id: string;
  keyPrefix: string;
  name: string;
  bengaliName: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultCoins: number;
  publicUrl: string;
}

const FEATURES: FeatureConfig[] = [
  {
    id: "daily_horoscope",
    keyPrefix: "daily_horoscope",
    name: "Daily Horoscope",
    bengaliName: "দৈনিক রাশিফল",
    description: "Real-time Swiss Ephemeris Moon transit (Gochar) and daily Vedic Panchang.",
    icon: Sun,
    defaultCoins: 0,
    publicUrl: "https://astra-astrology-web.vercel.app/daily-horoscope",
  },
  {
    id: "kundli",
    keyPrefix: "kundli",
    name: "Kundli (Birth Chart)",
    bengaliName: "জন্মকুষ্ঠি ও লগ্ন ছক",
    description: "Vedic Lagna (D1), Navamsa (D9), 3x3 Vimshottari Dasha, planetary positions & yogas.",
    icon: Compass,
    defaultCoins: 20,
    publicUrl: "https://astra-astrology-web.vercel.app/kundli",
  },
  {
    id: "kundli_matching",
    keyPrefix: "kundli_matching",
    name: "Kundli Matching",
    bengaliName: "বিবাহ মিলন ও গুণ বিচার",
    description: "36 Gunas Ashtakoot Milan, Rajjoo Dosha, Vedha Dosha, and Manglik compatibility.",
    icon: HeartHandshake,
    defaultCoins: 20,
    publicUrl: "https://astra-astrology-web.vercel.app/kundli-matching",
  },
  {
    id: "kp_calculator",
    keyPrefix: "kp_calculator",
    name: "KP Astrology",
    bengaliName: "কেপি জ্যোতিষ ক্যালকুলেটর",
    description: "Krishnamurti Paddhati 12 Placidus cusps, Ruling Planets, and sub-lord hierarchy.",
    icon: Orbit,
    defaultCoins: 20,
    publicUrl: "https://astra-astrology-web.vercel.app/kp-calculator",
  },
  {
    id: "dasha_calculator",
    keyPrefix: "dasha_calculator",
    name: "Dasha Calculator",
    bengaliName: "বিংশোত্তরী দশা ক্যালকুলেটর",
    description: "Complete Vimshottari Mahadasha, Antardasha, and Pratyantardasha timeline.",
    icon: Hourglass,
    defaultCoins: 15,
    publicUrl: "https://astra-astrology-web.vercel.app/dasha-calculator",
  },
  {
    id: "rashi_calculator",
    keyPrefix: "rashi_calculator",
    name: "Rashi Calculator",
    bengaliName: "চন্দ্র রাশি ক্যালকুলেটর",
    description: "Moon Sign calculation, traits, Vedic remedies, and Avakahada Chakra.",
    icon: Moon,
    defaultCoins: 10,
    publicUrl: "https://astra-astrology-web.vercel.app/rashi-calculator",
  },
  {
    id: "nakshatra_calculator",
    keyPrefix: "nakshatra_calculator",
    name: "Nakshatra Calculator",
    bengaliName: "জন্ম নক্ষত্র ক্যালকুলেটর",
    description: "Birth Star, Pada, Tarabala, Deity, Sacred Tree, and Beej Mantra.",
    icon: Star,
    defaultCoins: 10,
    publicUrl: "https://astra-astrology-web.vercel.app/nakshatra-calculator",
  },
  {
    id: "palm_reading",
    keyPrefix: "palm_reading",
    name: "Palm Reading (AI Scan)",
    bengaliName: "হস্তরেখা বিচার (কম্পিউটার ভিশন)",
    description: "AI Computer Vision hand detection, major crease tracing, and palmistry analysis.",
    icon: Hand,
    defaultCoins: 25,
    publicUrl: "https://astra-astrology-web.vercel.app/palm-reading",
  },
  {
    id: "face_reading",
    keyPrefix: "face_reading",
    name: "Face Reading (AI Scan)",
    bengaliName: "মুখমণ্ডল বিচার (সমুদ্রিক শাস্ত্র)",
    description: "Facial morphology measurements and Vedic Samudrika Shastra reading.",
    icon: ScanFace,
    defaultCoins: 25,
    publicUrl: "https://astra-astrology-web.vercel.app/face-reading",
  },
];

export function FeaturePricingCard({ settings }: { settings: PlatformSettings }) {
  const queryClient = useQueryClient();

  const [form, setForm] = React.useState<Record<string, { coins: string; enabled: boolean }>>(() => {
    const initial: Record<string, { coins: string; enabled: boolean }> = {};
    for (const f of FEATURES) {
      const coinsKey = `${f.keyPrefix}_coins` as keyof PlatformSettings;
      const enabledKey = `${f.keyPrefix}_enabled` as keyof PlatformSettings;
      const rawCoins = settings[coinsKey];
      const rawEnabled = settings[enabledKey];

      initial[f.id] = {
        coins: String(typeof rawCoins === "number" ? rawCoins : f.defaultCoins),
        enabled: typeof rawEnabled === "boolean" ? rawEnabled : true,
      };
    }
    return initial;
  });

  const [fieldError, setFieldError] = React.useState<string | null>(null);

  // Sync state if settings change
  React.useEffect(() => {
    if (settings) {
      setForm((prev) => {
        const next = { ...prev };
        for (const f of FEATURES) {
          const coinsKey = `${f.keyPrefix}_coins` as keyof PlatformSettings;
          const enabledKey = `${f.keyPrefix}_enabled` as keyof PlatformSettings;
          const rawCoins = settings[coinsKey];
          const rawEnabled = settings[enabledKey];

          next[f.id] = {
            coins: String(typeof rawCoins === "number" ? rawCoins : f.defaultCoins),
            enabled: typeof rawEnabled === "boolean" ? rawEnabled : true,
          };
        }
        return next;
      });
    }
  }, [settings]);

  const save = useMutation({
    mutationFn: (payload: Record<string, any>) => adminSettingsApi.setFeaturePricing(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
      toast.success("Feature coin pricing updated successfully!");
    },
    onError: (e: ApiError) => setFieldError(e.message),
  });

  const handleCoinChange = (featureId: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      [featureId]: {
        ...prev[featureId],
        coins: value,
      },
    }));
  };

  const handleToggle = (featureId: string, enabled: boolean) => {
    setForm((prev) => ({
      ...prev,
      [featureId]: {
        ...prev[featureId],
        enabled,
      },
    }));
  };

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setFieldError(null);

    const payload: Record<string, any> = {};

    for (const f of FEATURES) {
      const val = form[f.id];
      const coinsNum = Number(val.coins);

      if (!val.coins.trim() || !Number.isInteger(coinsNum) || coinsNum < 0) {
        setFieldError(`Enter a valid whole coin amount (0 or more) for ${f.name}.`);
        return;
      }

      payload[`${f.keyPrefix}_coins`] = coinsNum;
      payload[`${f.keyPrefix}_enabled`] = val.enabled;
    }

    save.mutate(payload);
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>
          <span className="flex items-center gap-2">
            <Sparkles className="size-4 text-brand-600" />
            Feature Coin Pricing & Controls (ফিচার কয়েন কন্ট্রোল)
          </span>
        </CardTitle>
        <CardDescription>
          Set how many coins a user must spend per calculation. Setting <strong>0 coins</strong> makes the feature completely free.
        </CardDescription>
      </CardHeader>

      <CardBody>
        <form onSubmit={submit} className="space-y-6">
          <div className="divide-y divide-border rounded-xl border border-border bg-surface/50">
            {FEATURES.map((feat) => {
              const Icon = feat.icon;
              const current = form[feat.id] || { coins: "0", enabled: true };
              const coinNumber = Number(current.coins);
              const isFree = coinNumber === 0;

              return (
                <div
                  key={feat.id}
                  className="flex flex-col gap-4 p-4 transition-colors sm:flex-row sm:items-center sm:justify-between hover:bg-surface-muted/30"
                >
                  {/* Left: Icon, Name & Description */}
                  <div className="flex items-start gap-3.5">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:border-brand-800">
                      <Icon className="size-5" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-foreground">{feat.name}</span>
                        <span className="text-xs text-muted-foreground font-serif">
                          ({feat.bengaliName})
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-bold border ${
                            !current.enabled
                              ? "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300"
                              : isFree
                              ? "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300"
                              : "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300"
                          }`}
                        >
                          {!current.enabled
                            ? "Disabled"
                            : isFree
                            ? "Free (বিনামূল্যে)"
                            : `${coinNumber} ${coinWord(coinNumber)}`}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground max-w-xl">
                        {feat.description}
                      </p>
                    </div>
                  </div>

                  {/* Right: Controls (Coins Input & Enable Toggle) */}
                  <div className="flex items-center gap-4 self-end sm:self-center">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                        Coins:
                      </span>
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        value={current.coins}
                        onChange={(e) => handleCoinChange(feat.id, e.target.value)}
                        className="w-24 text-center font-bold"
                      />
                    </div>

                    <div className="min-w-28">
                      <Switch
                        checked={current.enabled}
                        label={current.enabled ? "Enabled" : "Off"}
                        onChange={(val) => handleToggle(feat.id, val)}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {fieldError && <Alert tone="error">{fieldError}</Alert>}

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-muted-foreground">
              Changes take effect immediately across all web clients without a redeploy.
            </span>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending && <Loader2 className="size-4 animate-spin" />}
              Save feature pricing
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
