"use client";

/**
 * Samudrik Shastra Palm Reading Rule Book.
 *
 * This screen allows the platform's astrologers to calibrate palm line thresholds,
 * elemental hand types, and interpretations without requiring any code deployment.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Hand } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { PanelHeader } from "@/components/layout/panel-shell";
import {
  Alert,
  Badge,
  Button,
  Field,
  LoadingBlock,
  Switch,
  Textarea,
} from "@/components/ui";
import { palmReadingApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import type { PalmRule } from "@/types";

const KEY = ["admin", "palm-rules"] as const;

const FEATURE_ORDER = [
  "hand_type",
  "heart_line",
  "head_line",
  "life_line",
  "fate_line",
  "sun_line",
  "mounts",
  "fingers",
];

const FEATURE_LABELS: Record<string, string> = {
  hand_type: "হস্ত প্রকার ও পঞ্চভূত (Hand Type & Element)",
  heart_line: "হৃদয় রেখা (Heart Line / প্রেম ও আবেগ)",
  head_line: "মস্তিষ্ক রেখা (Head Line / মেধা ও বিচারবুদ্ধি)",
  life_line: "জীবন রেখা (Life Line / স্বাস্থ্য ও জীবনীশক্তি)",
  fate_line: "ভাগ্য রেখা (Fate Line / ভাগ্য ও কর্মজীবন)",
  sun_line: "রবি রেখা (Sun Line / খ্যাতি ও প্রতিষ্ঠা)",
  mounts: "গ্রহ পর্বত (Planetary Mounts / বৃহস্পতি, শুক্র ও চন্দ্র)",
  fingers: "অঙ্গুলি বিচার (Fingers & Thumb / ইচ্ছাশক্তি ও ব্যক্তিত্ব)",
};

export default function PalmRulesPage() {
  const { data: rules, isLoading } = useQuery({
    queryKey: KEY,
    queryFn: () => palmReadingApi.rules(),
  });

  const grouped = React.useMemo(() => {
    const map = new Map<string, PalmRule[]>();
    (rules ?? []).forEach((r) => map.set(r.feature, [...(map.get(r.feature) ?? []), r]));
    return FEATURE_ORDER.filter((f) => map.has(f)).map(
      (f) => [f, map.get(f)!] as [string, PalmRule[]],
    );
  }, [rules]);

  const reviewed = (rules ?? []).filter((r) => r.reviewed).length;

  return (
    <>
      <PanelHeader
        title="Palm rules (হস্তরেখা শাস্ত্র)"
        description="Samudrik Shastra interpretations, thresholds, and planetary mount bands."
      />

      <Alert tone="info" className="mb-6">
        <strong>অথেনটিক সমুদ্রিক শাস্ত্র ও বায়োমেট্রিক রুলবুক:</strong> The interpretations
        are traditional associations written fresh; the ratio bands are our computer-vision calibration.
        Admins and astrologers can adjust wording, conditions, and active status directly here. Changes
        apply immediately to all future readings without redeploying.
      </Alert>

      {isLoading ? (
        <LoadingBlock label="Loading palm rules…" />
      ) : (
        <>
          <p className="mb-5 text-sm text-muted-foreground">
            {rules?.length ?? 0} rules across {grouped.length} features ·{" "}
            <span className="text-foreground">{reviewed}</span> marked as reviewed by the
            client astrologer.
          </p>

          <div className="space-y-8">
            {grouped.map(([feature, items]) => (
              <section key={feature} className="space-y-3">
                <header className="flex items-center gap-2">
                  <Hand className="size-4 text-primary" />
                  <h2 className="font-display text-base font-semibold">
                    {FEATURE_LABELS[feature] ?? feature}
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    ({items.length} {items.length === 1 ? "option" : "options"})
                  </span>
                </header>

                <div className="space-y-3">
                  {items.map((rule) => (
                    <RuleRow key={rule.id} rule={rule} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      )}
    </>
  );
}

function RuleRow({ rule }: { rule: PalmRule }) {
  const queryClient = useQueryClient();
  const [meaning, setMeaning] = React.useState(rule.meaning);
  const [bands, setBands] = React.useState(() => JSON.stringify(rule.conditions, null, 1));
  const [open, setOpen] = React.useState(false);
  const [bandError, setBandError] = React.useState<string | null>(null);

  const save = useMutation({
    mutationFn: (body: Parameters<typeof palmReadingApi.updateRule>[1]) =>
      palmReadingApi.updateRule(rule.id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: KEY });
      toast.success("Saved. It applies to the next reading.");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });

  function saveAll() {
    setBandError(null);
    let parsed: Array<Record<string, unknown>>;
    try {
      parsed = JSON.parse(bands);
      if (!Array.isArray(parsed)) throw new Error("not a list");
    } catch {
      setBandError('The bands must be a list, like [{"metric": "ratio_2d_4d", "min": 1.02}]');
      return;
    }
    save.mutate({ meaning, conditions: parsed });
  }

  const dirty = meaning !== rule.meaning || bands !== JSON.stringify(rule.conditions, null, 1);

  return (
    <div className="rounded-xl border border-border p-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 text-left"
      >
        <span className="flex-1">
          <span className="font-semibold">{rule.label}</span>
          <span className="ml-2 text-xs text-muted-foreground">{rule.option}</span>
        </span>
        {rule.is_default && <Badge tone="neutral">fallback</Badge>}
        {rule.reviewed && (
          <Badge tone="green">
            <Check className="size-3" /> reviewed
          </Badge>
        )}
        {!rule.enabled && <Badge tone="red">off</Badge>}
      </button>

      {!open ? (
        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{rule.meaning}</p>
      ) : (
        <div className="mt-4 space-y-4">
          <Field label="What the reading says">
            <Textarea
              rows={6}
              value={meaning}
              maxLength={4000}
              onChange={(e) => setMeaning(e.target.value)}
            />
          </Field>

          <Field
            label="When it applies"
            error={bandError ?? undefined}
            hint={
              rule.is_default
                ? "This is the fallback — used when nothing else matches. Leave the bands empty."
                : "Every band must hold. min is included, max is not."
            }
          >
            <Textarea
              rows={4}
              value={bands}
              onChange={(e) => setBands(e.target.value)}
              className="font-mono text-xs"
            />
          </Field>

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={saveAll} loading={save.isPending} disabled={!dirty}>
              Save
            </Button>
            <Switch
              checked={rule.reviewed}
              label="Astrologer has checked this"
              onChange={(next) => save.mutate({ reviewed: next })}
            />
            <Switch
              checked={rule.enabled}
              label="In use"
              onChange={(next) => save.mutate({ enabled: next })}
            />
          </div>
        </div>
      )}
    </div>
  );
}
