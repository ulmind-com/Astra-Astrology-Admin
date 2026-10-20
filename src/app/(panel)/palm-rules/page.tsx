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
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Field,
  Input,
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
        title="Palm reading rules (হস্তরেখা বিচার শাস্ত্র)"
        description="Samudrik Shastra interpretations, thresholds, and planetary mount bands."
      />

      <Alert tone="info" className="mb-6">
        <strong>অথেনটিক সমুদ্রিক শাস্ত্র ও বায়োমেট্রিক রুলবুক:</strong> The interpretations
        are grounded in classical Vedic chiromancy; the ratio bands are our computer-vision calibration.
        Admins and astrologers can adjust wording, conditions, and active status directly here. Changes
        apply immediately to all future scans without redeploying.
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

                <div className="grid gap-3 lg:grid-cols-2">
                  {items.map((rule) => (
                    <RuleCard key={rule.id} rule={rule} />
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

function RuleCard({ rule }: { rule: PalmRule }) {
  const qc = useQueryClient();
  const [label, setLabel] = React.useState(rule.label);
  const [meaning, setMeaning] = React.useState(rule.meaning);
  const [area, setArea] = React.useState(rule.area ?? "");
  const [enabled, setEnabled] = React.useState(rule.enabled);
  const [reviewed, setReviewed] = React.useState(rule.reviewed);

  React.useEffect(() => {
    setLabel(rule.label);
    setMeaning(rule.meaning);
    setArea(rule.area ?? "");
    setEnabled(rule.enabled);
    setReviewed(rule.reviewed);
  }, [rule]);

  const dirty =
    label !== rule.label ||
    meaning !== rule.meaning ||
    (area || null) !== rule.area ||
    enabled !== rule.enabled ||
    reviewed !== rule.reviewed;

  const mutation = useMutation({
    mutationFn: () =>
      palmReadingApi.updateRule(rule.id, {
        label,
        meaning,
        area: area.trim() || null,
        enabled,
        reviewed,
      }),
    onSuccess: (updated) => {
      qc.setQueryData<PalmRule[]>(KEY, (prev) =>
        prev ? prev.map((r) => (r.id === updated.id ? updated : r)) : [updated],
      );
      toast.success(`Updated "${updated.label}"`);
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Save failed.");
    },
  });

  return (
    <Card className={!enabled ? "opacity-60" : undefined}>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm font-medium">{rule.option}</CardTitle>
          {rule.is_default && <Badge variant="secondary">Default</Badge>}
          {reviewed && (
            <Badge variant="outline" className="border-emerald-500/40 text-emerald-600">
              <Check className="mr-1 size-3" /> Reviewed
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Enabled</span>
          <Switch checked={enabled} onCheckedChange={setEnabled} size="sm" />
        </div>
      </CardHeader>

      <CardBody className="space-y-3 pt-0">
        <Field label="Label (shown in the section header)">
          <Input value={label} onChange={(e) => setLabel(e.target.value)} size="sm" />
        </Field>

        <Field label="Meaning (the reading text)">
          <Textarea
            value={meaning}
            onChange={(e) => setMeaning(e.target.value)}
            rows={4}
            className="text-xs leading-relaxed"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Life area (optional)">
            <Input
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder="e.g. personality, career, love"
              size="sm"
            />
          </Field>
          <Field label="Conditions">
            <p className="pt-2 font-mono text-xs text-muted-foreground">
              {rule.conditions.length === 0
                ? "— (fallback rule)"
                : rule.conditions
                    .map((c) => {
                      if (c.min != null && c.max != null) {
                        return `${c.min} ≤ ${c.metric} < ${c.max}`;
                      }
                      if (c.min != null) return `${c.metric} ≥ ${c.min}`;
                      if (c.max != null) return `${c.metric} < ${c.max}`;
                      return c.metric;
                    })
                    .join(", ")}
            </p>
          </Field>
        </div>

        <div className="flex items-center justify-between pt-2">
          <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={reviewed}
              onChange={(e) => setReviewed(e.target.checked)}
              className="rounded"
            />
            Astrologer-approved wording
          </label>

          <Button
            size="sm"
            disabled={!dirty || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
