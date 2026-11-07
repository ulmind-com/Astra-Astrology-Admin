"use client";

/**
 * The astrologer's live Co-Pilot.
 *
 * A tab on the left edge of the call stage that opens into a one-glance
 * summary of where the client stands: the running Mahadasha and Antardasha,
 * Saturn's Sade Sati phase, and the single planet worth prescribing for.
 *
 * Left, because the Cosmic Whiteboard docks right and is far wider; the two
 * must never land on top of each other.
 *
 * It is deliberately quiet about what it does not know. When the client's
 * saved birth details cannot produce a chart the panel says so instead of
 * showing a dasha, because an astrologer reading a confident period out of a
 * placeholder birth date is worse than an empty panel.
 */

import { ChevronLeft, Sparkles, TriangleAlert, X } from "lucide-react";
import * as React from "react";

import { useCoPilot } from "@/hooks/use-copilot";
import { cn } from "@/lib/utils";
import type {
  CoPilotDashaPeriod,
  CoPilotSadeSati,
  CoPilotSummary,
} from "@/types/copilot";

const SADE_SATI_TONE: Record<CoPilotSadeSati["impact_level"], string> = {
  high: "border-rose-500/40 bg-rose-950/60 text-rose-200",
  medium: "border-amber-500/40 bg-amber-950/60 text-amber-200",
  favorable: "border-emerald-500/40 bg-emerald-950/60 text-emerald-200",
};

function DashaRow({ label, period }: { label: string; period: CoPilotDashaPeriod }) {
  // Clamped because a bar is drawn from it, and a period that has just rolled
  // over can report a hair outside 0-100.
  const pct = Math.max(0, Math.min(100, period.percent_complete));
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[10px] font-semibold tracking-wider text-white/50">{label}</p>
        <p className="shrink-0 text-[10px] text-white/55">{period.days_remaining} days left</p>
      </div>
      <p className="truncate text-base font-semibold text-brand-300">{period.lord_label}</p>
      <p className="text-[11px] text-white/60">
        {period.starts_on} → {period.ends_on}
      </p>
      <div className="mt-1 h-[3px] overflow-hidden rounded-full bg-white/12">
        <div className="h-full rounded-full bg-brand-300" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-0.5 text-[10px] text-white/55">{pct.toFixed(0)}% elapsed</p>
    </div>
  );
}

function Panel({ data, onClose }: { data: CoPilotSummary; onClose: () => void }) {
  return (
    <div className="flex max-h-full flex-col overflow-hidden rounded-2xl border border-brand-300/25 bg-night-950/96 text-white shadow-2xl backdrop-blur-xl">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
        <p className="flex min-w-0 items-center gap-1.5 text-xs font-semibold">
          <Sparkles className="size-3.5 shrink-0 text-brand-300" />
          <span className="truncate">{data.client_name}</span>
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Co-Pilot"
          className="shrink-0 rounded-lg p-1 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="size-4" />
        </button>
      </div>

      {!data.is_ready ? (
        <div className="m-3 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-950/50 p-2.5">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-300" />
          <p className="text-[11px] leading-snug text-white/85">{data.unavailable_reason}</p>
        </div>
      ) : (
        <div className="min-h-0 space-y-3 overflow-y-auto px-3 py-3">
          {data.accuracy_note && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-950/50 p-2.5">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-amber-300" />
              <p className="text-[11px] leading-snug text-white/85">{data.accuracy_note}</p>
            </div>
          )}

          <p className="text-[11px] text-white/55">
            {data.moon_sign} · {data.nakshatra}
          </p>

          {data.mahadasha && <DashaRow label="MAHADASHA" period={data.mahadasha} />}
          {data.antardasha && <DashaRow label="ANTARDASHA" period={data.antardasha} />}

          {data.sade_sati && (
            <div className={cn("rounded-xl border p-2.5", SADE_SATI_TONE[data.sade_sati.impact_level])}>
              <p className="text-[10px] font-semibold tracking-wider text-white/50">SADE SATI</p>
              <p className="text-[11px] font-semibold leading-snug">{data.sade_sati.phase_title}</p>
              <p className="mt-0.5 text-[11px] text-white/60">
                Saturn in {data.sade_sati.saturn_sign} · house{" "}
                {data.sade_sati.saturn_house_from_moon} from Moon
              </p>
              <p className="mt-1 text-[11px] leading-snug text-white/75">
                {data.sade_sati.description}
              </p>
            </div>
          )}

          {data.remedy_focus && (
            <div className="space-y-1 border-t border-white/10 pt-2.5">
              <p className="text-[10px] font-semibold tracking-wider text-white/50">REMEDY FOCUS</p>
              <p className="text-[15px] font-semibold text-gold-300">
                {data.remedy_focus.planet_label}
              </p>
              <p className="text-[11px] leading-snug text-white/75">{data.remedy_focus.reason}</p>
              <ul className="space-y-1 pt-0.5">
                {data.remedy_focus.remedies.map((line) => (
                  <li key={line} className="text-[11px] leading-snug text-white/80">
                    •&nbsp;&nbsp;{line}
                  </li>
                ))}
              </ul>
              {data.remedy_focus.beej_mantra && (
                <p className="pt-0.5 text-[11px] font-semibold leading-snug text-brand-200">
                  {data.remedy_focus.beej_mantra}
                </p>
              )}
              {data.remedy_focus.gemstone && (
                <p className="text-[11px] leading-snug text-white/60">
                  {data.remedy_focus.gemstone} · {data.remedy_focus.gemstone_metal} ·{" "}
                  {data.remedy_focus.gemstone_finger} · {data.remedy_focus.gemstone_day}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AstroCoPilot({ callId, enabled }: { callId: string | null; enabled: boolean }) {
  const [open, setOpen] = React.useState(false);
  // Only fetched once the astrologer actually opens it.
  const { data, isLoading, isError, refetch } = useCoPilot(callId, enabled && open);

  if (!enabled || !callId) return null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Open the live Co-Pilot"
        className="absolute left-0 top-1/3 z-30 flex flex-col items-center gap-1 rounded-r-xl border border-l-0 border-brand-300/30 bg-night-950/92 px-2 py-3 text-white shadow-lg transition-colors hover:bg-night-900"
      >
        <Sparkles className="size-4 text-brand-300" />
        <span className="text-[9px] font-bold leading-[11px]">
          Co-
          <br />
          Pilot
        </span>
        <ChevronLeft className="size-3 rotate-180 text-white/50" />
      </button>
    );
  }

  return (
    <div className="absolute bottom-4 left-3 top-28 z-30 flex w-[280px] max-w-[calc(100%-1.5rem)] flex-col justify-start">
      {isLoading ? (
        <div className="flex items-center gap-2 rounded-2xl border border-brand-300/25 bg-night-950/96 px-3 py-3 text-white shadow-2xl">
          <Sparkles className="size-4 animate-pulse text-brand-300" />
          <p className="text-[11px] text-white/80">Reading the chart…</p>
        </div>
      ) : isError || !data ? (
        <div className="space-y-2 rounded-2xl border border-brand-300/25 bg-night-950/96 px-3 py-3 text-white shadow-2xl">
          <p className="text-[11px] text-white/80">Could not load the Co-Pilot.</p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void refetch()}
              className="text-[11px] font-semibold text-brand-300 hover:underline"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-[11px] text-white/55 hover:underline"
            >
              Close
            </button>
          </div>
        </div>
      ) : (
        <Panel data={data} onClose={() => setOpen(false)} />
      )}
    </div>
  );
}
