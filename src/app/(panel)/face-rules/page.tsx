"use client";

/**
 * The face-reading rule book.
 *
 * This screen exists so the client's astrologer can correct the system
 * without anyone touching code. Two things are editable and they are very
 * different in standing:
 *
 *   the wording   — traditional associations, written by us, replaceable
 *   the bands     — our calibration, since no source gives a measurement
 *
 * The second is the one that will be wrong. It is labelled as ours on screen,
 * so nobody mistakes it for scripture.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ScanFace } from "lucide-react";
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
import { faceReadingApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import type { FaceRule } from "@/types";

const KEY = ["admin", "face-rules"] as const;

const FEATURE_ORDER = [
  "face_shape",
  "forehead",
  "eyebrows",
  "eyes",
  "nose",
  "lips",
  "chin",
  "cheeks",
];

const FEATURE_LABELS: Record<string, string> = {
  face_shape: "Face shape",
  forehead: "Forehead",
  eyebrows: "Eyebrows",
  eyes: "Eyes",
  nose: "Nose",
  lips: "Lips & smile",
  chin: "Chin & jaw",
  cheeks: "Cheeks",
};

export default function FaceRulesPage() {
  const { data: rules, isLoading } = useQuery({
    queryKey: KEY,
    queryFn: () => faceReadingApi.rules(),
  });

  const grouped = React.useMemo(() => {
    const map = new Map<string, FaceRule[]>();
    (rules ?? []).forEach((r) => map.set(r.feature, [...(map.get(r.feature) ?? []), r]));
    return FEATURE_ORDER.filter((f) => map.has(f)).map(
      (f) => [f, map.get(f)!] as [string, FaceRule[]],
    );
  }, [rules]);

  const reviewed = (rules ?? []).filter((r) => r.reviewed).length;

  return (
    <>
      <PanelHeader
        title="Face rules"
        description="What each measurement means, and the bands that decide it."
      />

      <Alert tone="info" className="mb-6">
        <strong>The wording is ours and the numbers are ours.</strong> The
        meanings are traditional associations written fresh; the bands are a
        calibration, because no source gives a measurement — &ldquo;broad&rdquo;
        simply means broader than most faces. Both are meant to be corrected
        here. Changes take effect on the next reading; nothing is redeployed.
      </Alert>

      {isLoading ? (
        <LoadingBlock label="Loading the rule book…" />
      ) : (
        <>
          <p className="mb-5 text-sm text-muted-foreground">
            {rules?.length ?? 0} rules · {reviewed} marked reviewed by an astrologer
          </p>
          {grouped.map(([feature, items]) => (
            <Card key={feature} className="mb-6">
              <CardHeader>
                <CardTitle>
                  <span className="flex items-center gap-2">
                    <ScanFace className="size-4 text-brand-700" />
                    {FEATURE_LABELS[feature] ?? feature}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardBody className="space-y-4 pt-0">
                {items.map((rule) => (
                  <RuleRow key={rule.id} rule={rule} />
                ))}
              </CardBody>
            </Card>
          ))}
        </>
      )}
    </>
  );
}

function RuleRow({ rule }: { rule: FaceRule }) {
  const queryClient = useQueryClient();
  const [meaning, setMeaning] = React.useState(rule.meaning);
  const [bands, setBands] = React.useState(() => JSON.stringify(rule.conditions, null, 1));
  const [open, setOpen] = React.useState(false);
  const [bandError, setBandError] = React.useState<string | null>(null);

  const save = useMutation({
    mutationFn: (body: Parameters<typeof faceReadingApi.updateRule>[1]) =>
      faceReadingApi.updateRule(rule.id, body),
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
      // Refused rather than saved half-broken: a malformed band would simply
      // never match, and the rule would go quiet without anyone noticing.
      setBandError("The bands must be a list, like [{\"metric\": \"nose_w\", \"min\": 0.27}]");
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
