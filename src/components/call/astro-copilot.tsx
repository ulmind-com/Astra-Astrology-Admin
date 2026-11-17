"use client";

/**
 * The astrologer's live Co-Pilot.
 *
 * A tab on the left edge of the call stage that opens into a one-glance
 * summary of where the client stands:
 * - Lagna (Ascendant), Moon Sign & Nakshatra
 * - 9 Graha Placements (houses, signs, retrograde status)
 * - Running Vimshottari Mahadasha & Antardasha
 * - Saturn's Sade Sati / Dhaiya phase
 * - Instant Remedy Focus (Gemstone, Beej Mantra, Deity, Rituals)
 * - In-Chamber Birth Rectification & Entry Form with auto-geocoding.
 */

import { useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  Check,
  ChevronLeft,
  Clock,
  Compass,
  Edit3,
  Loader2,
  MapPin,
  RefreshCw,
  Sparkles,
  TriangleAlert,
  X,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { COPILOT_KEY, useCoPilot } from "@/hooks/use-copilot";
import { callApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import type {
  CoPilotBirthDetailsInput,
  CoPilotDashaPeriod,
  CoPilotPlanetPosition,
  CoPilotSadeSati,
  CoPilotSummary,
} from "@/types/copilot";

const SADE_SATI_TONE: Record<CoPilotSadeSati["impact_level"], string> = {
  high: "border-rose-500/40 bg-rose-950/60 text-rose-200",
  medium: "border-amber-500/40 bg-amber-950/60 text-amber-200",
  favorable: "border-emerald-500/40 bg-emerald-950/60 text-emerald-200",
};

const COMMON_CITIES = [
  "Kolkata",
  "Howrah",
  "Purba Medinipur",
  "Siliguri",
  "Dhaka",
  "New Delhi",
  "Mumbai",
  "Bengaluru",
];

function DashaRow({ label, period }: { label: string; period: CoPilotDashaPeriod }) {
  const pct = Math.max(0, Math.min(100, period.percent_complete));
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] p-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[10px] font-bold tracking-wider text-brand-300/80">{label}</p>
        <p className="shrink-0 text-[10px] text-white/55">{period.days_remaining} days left</p>
      </div>
      <div className="mt-0.5 flex items-baseline justify-between">
        <p className="truncate text-base font-bold text-amber-200">{period.lord_label}</p>
        <span className="text-[10px] font-medium text-white/50">{pct.toFixed(0)}% elapsed</span>
      </div>
      <p className="text-[10px] text-white/60">
        {period.starts_on} → {period.ends_on}
      </p>
      <div className="mt-1.5 h-[3px] overflow-hidden rounded-full bg-white/12">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-200"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function GrahaGrid({ planets }: { planets: CoPilotPlanetPosition[] }) {
  if (!planets || planets.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold tracking-wider text-white/50">
          PLANETARY POSITIONS (গ্রহাবস্থান)
        </p>
        <span className="text-[9px] text-white/40">Vedic Bhava</span>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {planets.map((p) => (
          <div
            key={p.name}
            className="flex flex-col rounded-lg border border-white/8 bg-white/[0.04] p-1.5 transition-colors hover:bg-white/[0.08]"
          >
            <div className="flex items-center justify-between">
              <span className="truncate text-[11px] font-bold text-brand-200">{p.label}</span>
              {p.is_retrograde && (
                <span className="rounded bg-rose-500/20 px-1 py-0.2 text-[8px] font-bold text-rose-300">
                  R
                </span>
              )}
            </div>
            <div className="mt-0.5 flex items-baseline justify-between text-[10px]">
              <span className="font-semibold text-amber-300/90">{p.house}H</span>
              <span className="truncate text-white/60" title={p.sign}>
                {p.sign_label}
              </span>
            </div>
            {p.degree_formatted && (
              <span className="text-[9px] text-white/40">{p.degree_formatted}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function BirthEntryForm({
  callId,
  initialPlace = "",
  initialDate = "",
  initialTime = "",
  onSuccess,
  onCancel,
}: {
  callId: string;
  initialPlace?: string;
  initialDate?: string;
  initialTime?: string;
  onSuccess: () => void;
  onCancel?: () => void;
}) {
  const [dateOfBirth, setDateOfBirth] = React.useState(initialDate);
  const [timeOfBirth, setTimeOfBirth] = React.useState(initialTime);
  const [isTimeUnknown, setIsTimeUnknown] = React.useState(!initialTime);
  const [place, setPlace] = React.useState(initialPlace);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dateOfBirth) {
      toast.error("Please enter client's birth date");
      return;
    }
    if (!place.trim()) {
      toast.error("Please enter client's birthplace");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CoPilotBirthDetailsInput = {
        date_of_birth: dateOfBirth,
        time_of_birth: isTimeUnknown ? null : timeOfBirth || null,
        is_time_known: !isTimeUnknown,
        place: place.trim(),
      };

      await callApi.updateCopilotBirthDetails(callId, payload);
      await queryClient.invalidateQueries({ queryKey: [...COPILOT_KEY, callId] });
      toast.success("Client Kundli & Dasha chart calculated successfully! ✨");
      onSuccess();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update birth details");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-3">
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <p className="flex items-center gap-1.5 text-xs font-bold text-amber-200">
          <Calendar className="size-3.5 text-brand-300" />
          <span>Enter / Rectify Birth Details</span>
        </p>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-[10px] text-white/50 hover:text-white"
          >
            Cancel
          </button>
        )}
      </div>

      <div>
        <label className="block text-[10px] font-semibold tracking-wider text-white/70">
          DATE OF BIRTH (জন্মতারিখ) *
        </label>
        <div className="relative mt-1">
          <input
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            required
            className="w-full rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs text-white placeholder-white/40 focus:border-brand-300 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="block text-[10px] font-semibold tracking-wider text-white/70">
            TIME OF BIRTH (সময়)
          </label>
          <label className="flex cursor-pointer items-center gap-1.5 text-[10px] text-amber-300/90">
            <input
              type="checkbox"
              checked={isTimeUnknown}
              onChange={(e) => {
                setIsTimeUnknown(e.target.checked);
                if (e.target.checked) setTimeOfBirth("");
              }}
              className="size-3 rounded border-white/20 bg-white/10 text-brand-400 focus:ring-0"
            />
            Unknown / আনুমানিক
          </label>
        </div>
        {!isTimeUnknown && (
          <div className="relative mt-1">
            <input
              type="time"
              value={timeOfBirth}
              onChange={(e) => setTimeOfBirth(e.target.value)}
              className="w-full rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs text-white placeholder-white/40 focus:border-brand-300 focus:outline-none"
            />
          </div>
        )}
      </div>

      <div>
        <label className="block text-[10px] font-semibold tracking-wider text-white/70">
          BIRTHPLACE / CITY (জন্মস্থান) *
        </label>
        <div className="relative mt-1">
          <input
            type="text"
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            placeholder="e.g. Kolkata, West Bengal"
            required
            className="w-full rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs text-white placeholder-white/40 focus:border-brand-300 focus:outline-none"
          />
        </div>

        {/* Quick city suggestions */}
        <div className="mt-1.5 flex flex-wrap gap-1">
          {COMMON_CITIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setPlace(c)}
              className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] text-white/70 transition-colors hover:border-brand-300/40 hover:bg-white/10 hover:text-white"
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-3 py-2 text-xs font-bold text-slate-950 shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="size-3.5 animate-spin" />
            <span>Calculating Kundli Chart…</span>
          </>
        ) : (
          <>
            <Sparkles className="size-3.5" />
            <span>Calculate Chart (কুন্ডলী আঁকুন)</span>
          </>
        )}
      </button>
    </form>
  );
}

function Panel({
  callId,
  data,
  onClose,
}: {
  callId: string;
  data: CoPilotSummary;
  onClose: () => void;
}) {
  const [isEditing, setIsEditing] = React.useState(false);

  return (
    <div className="flex max-h-full flex-col overflow-hidden rounded-2xl border border-brand-300/30 bg-night-950/98 text-white shadow-2xl backdrop-blur-2xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2.5">
        <p className="flex min-w-0 items-center gap-1.5 text-xs font-semibold">
          <Sparkles className="size-3.5 shrink-0 text-brand-300" />
          <span className="truncate">{data.client_name}</span>
        </p>
        <div className="flex items-center gap-1">
          {data.is_ready && (
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              title="Edit / Rectify client birth details"
              className={cn(
                "rounded-lg p-1 transition-colors hover:bg-white/10",
                isEditing ? "bg-amber-500/20 text-amber-300" : "text-white/60 hover:text-white"
              )}
            >
              <Edit3 className="size-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Co-Pilot"
            className="shrink-0 rounded-lg p-1 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {isEditing ? (
        <BirthEntryForm
          callId={callId}
          initialPlace={data.birth_place_str}
          initialDate={data.birth_date_str ? data.birth_date_str.split("-").reverse().join("-") : ""}
          initialTime={data.is_birth_time_known ? data.birth_time_str : ""}
          onSuccess={() => setIsEditing(false)}
          onCancel={() => setIsEditing(false)}
        />
      ) : !data.is_ready ? (
        <div className="space-y-3 p-3">
          <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-950/50 p-2.5">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-300" />
            <p className="text-[11px] leading-snug text-white/85">{data.unavailable_reason}</p>
          </div>

          <BirthEntryForm
            callId={callId}
            onSuccess={() => setIsEditing(false)}
          />
        </div>
      ) : (
        <div className="min-h-0 space-y-3.5 overflow-y-auto px-3 py-3">
          {/* Accuracy alert */}
          {data.accuracy_note && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-950/50 p-2">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-amber-300" />
              <p className="text-[10px] leading-snug text-white/85">{data.accuracy_note}</p>
            </div>
          )}

          {/* Vedic Identity Card */}
          <div className="rounded-xl border border-brand-300/20 bg-brand-950/40 p-2.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <Compass className="size-3.5 text-brand-300" />
                <span className="font-semibold text-white/70">Lagna:</span>
                <span className="font-bold text-brand-200">
                  {data.ascendant || "Aries"}
                  {data.ascendant_degree ? ` (${data.ascendant_degree})` : ""}
                </span>
              </div>
            </div>

            <div className="mt-1 flex items-center justify-between text-[11px]">
              <div>
                <span className="text-white/50">Rashi:&nbsp;</span>
                <span className="font-bold text-amber-200">{data.moon_sign}</span>
              </div>
              <div>
                <span className="text-white/50">Nakshatra:&nbsp;</span>
                <span className="font-semibold text-white/85">{data.nakshatra}</span>
              </div>
            </div>

            <div className="mt-1.5 flex flex-wrap items-center gap-2 border-t border-white/8 pt-1.5 text-[9px] text-white/50">
              {data.birth_date_str && (
                <span className="flex items-center gap-1">
                  <Calendar className="size-2.5" />
                  {data.birth_date_str}
                </span>
              )}
              {data.birth_time_str && (
                <span className="flex items-center gap-1">
                  <Clock className="size-2.5" />
                  {data.birth_time_str}
                </span>
              )}
              {data.birth_place_str && (
                <span className="flex items-center gap-1 truncate max-w-[140px]" title={data.birth_place_str}>
                  <MapPin className="size-2.5 shrink-0" />
                  <span className="truncate">{data.birth_place_str}</span>
                </span>
              )}
            </div>
          </div>

          {/* Planetary Placements (Graha Sthiti) */}
          {data.planets && data.planets.length > 0 && <GrahaGrid planets={data.planets} />}

          {/* Vimshottari Dasha */}
          <div className="space-y-2">
            {data.mahadasha && <DashaRow label="CURRENT MAHADASHA" period={data.mahadasha} />}
            {data.antardasha && <DashaRow label="CURRENT ANTARDASHA" period={data.antardasha} />}
          </div>

          {/* Sade Sati Analysis */}
          {data.sade_sati && (
            <div className={cn("rounded-xl border p-2.5", SADE_SATI_TONE[data.sade_sati.impact_level])}>
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold tracking-wider text-white/60">SATURN TRANSIT</p>
                <span className="rounded bg-black/30 px-1.5 py-0.5 text-[9px] font-bold capitalize">
                  {data.sade_sati.impact_level}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] font-bold leading-snug">{data.sade_sati.phase_title}</p>
              <p className="mt-0.5 text-[10px] text-white/60">
                Saturn in {data.sade_sati.saturn_sign} · {data.sade_sati.saturn_house_from_moon}th from Moon
              </p>
              <p className="mt-1 text-[10px] leading-snug text-white/80">
                {data.sade_sati.description}
              </p>
              {data.sade_sati.remedy_summary && (
                <p className="mt-1.5 border-t border-white/10 pt-1 text-[10px] font-medium text-amber-200/90">
                  💡 {data.sade_sati.remedy_summary}
                </p>
              )}
            </div>
          )}

          {/* Remedy Focus */}
          {data.remedy_focus && (
            <div className="space-y-1.5 rounded-xl border border-amber-500/25 bg-amber-950/20 p-2.5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold tracking-wider text-amber-300/80">REMEDY FOCUS</p>
                <span className="text-xs font-bold text-gold-300">
                  {data.remedy_focus.planet_label}
                </span>
              </div>
              <p className="text-[10px] leading-snug text-white/75">{data.remedy_focus.reason}</p>

              {data.remedy_focus.gemstone && (
                <div className="rounded-lg bg-black/20 p-1.5 text-[10px]">
                  <span className="font-semibold text-brand-300">Gemstone:&nbsp;</span>
                  <span className="text-white/80">
                    {data.remedy_focus.gemstone} ({data.remedy_focus.gemstone_metal} · {data.remedy_focus.gemstone_finger} · {data.remedy_focus.gemstone_day})
                  </span>
                </div>
              )}

              {data.remedy_focus.beej_mantra && (
                <div className="rounded-lg bg-brand-950/40 p-1.5 text-[10px] font-medium text-brand-200">
                  <span className="font-bold">Mantra:&nbsp;</span>
                  <span>{data.remedy_focus.beej_mantra}</span>
                </div>
              )}

              {data.remedy_focus.remedies && data.remedy_focus.remedies.length > 0 && (
                <ul className="space-y-1 pt-1 text-[10px] text-white/80">
                  {data.remedy_focus.remedies.slice(0, 3).map((line) => (
                    <li key={line} className="flex items-start gap-1.5">
                      <span className="text-amber-400">•</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
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
    <div className="absolute bottom-4 left-3 top-24 z-30 flex w-[320px] max-w-[calc(100%-1.5rem)] flex-col justify-start">
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
        <Panel callId={callId} data={data} onClose={() => setOpen(false)} />
      )}
    </div>
  );
}
