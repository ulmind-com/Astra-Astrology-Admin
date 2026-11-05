"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Calendar,
  CalendarCheck,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Coins,
  Compass,
  DollarSign,
  Edit3,
  ExternalLink,
  Eye,
  FileText,
  Flame,
  Gem,
  HelpCircle,
  IndianRupee,
  Info,
  MessageSquare,
  PhoneCall,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  TrendingUp,
  User,
  Video,
  X,
  Zap,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Alert, Avatar, Badge, Button, EmptyState, LoadingBlock, Modal } from "@/components/ui";
import { appointmentApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { APPOINTMENT_STATUS_LABELS, type Appointment, type VedicPrescription } from "@/types";

const PILLAR_LABELS: Record<string, { label: string; icon: string }> = {
  career_wealth: { label: "Career & Wealth", icon: "💼" },
  love_marriage: { label: "Love & Kundali Milan", icon: "💍" },
  health_longevity: { label: "Health & Vitality", icon: "🌿" },
  dosha_graha_shanti: { label: "Graha Shanti & Doshas", icon: "🔥" },
  business_expansion: { label: "Business & Investments", icon: "📈" },
  spiritual_guidance: { label: "Spiritual Path & Moksha", icon: "🕉️" },
};

const CARD_KEY = ["appointments", "card"] as const;
const WINDOWS_KEY = ["appointments", "windows"] as const;
const SCHEDULE_KEY = ["appointments", "schedule"] as const;

/** A date-time input wants "YYYY-MM-DDTHH:mm" in the browser's own timezone. */
function toLocalInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

function rupees(paise: number): string {
  return (paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function dayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function clock(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function isSameDay(isoA: string, dateB: Date = new Date()): boolean {
  const a = new Date(isoA);
  return (
    a.getFullYear() === dateB.getFullYear() &&
    a.getMonth() === dateB.getMonth() &&
    a.getDate() === dateB.getDate()
  );
}

function isUpcoming(a: { status: string; ends_at: string }): boolean {
  return a.status === "booked" && new Date(a.ends_at).getTime() >= Date.now();
}

function dayRelative(iso: string): string {
  const now = new Date();
  if (isSameDay(iso, now)) return "Today";
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (isSameDay(iso, tomorrow)) return "Tomorrow";
  return dayLabel(iso);
}

type ScheduleTab = "upcoming" | "today" | "all" | "past";

export default function AppointmentsPage() {
  const { user } = useAuth();
  const isAstrologer = user?.role === "astrologer";

  if (!isAstrologer) {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl border border-slate-200/90 bg-white p-8 shadow-sm">
          <div className="flex items-center gap-3 text-amber-600">
            <Info className="size-6" />
            <h2 className="font-display text-lg font-bold text-slate-900">Astrologer Portal Only</h2>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Consultation scheduling and appointment slots are only configured for certified astrologer profiles.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Top Banner / Hero Overview */}
      <AppointmentHero />

      {/* Main Grid: Pricing Engine & Schedule Slots */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Smart Pricing & Simulator */}
        <div className="lg:col-span-5 xl:col-span-5 space-y-6">
          <PriceCard />
        </div>

        {/* Right Column: Time Availability Manager */}
        <div className="lg:col-span-7 xl:col-span-7 space-y-6">
          <OpenHours />
        </div>
      </div>

      {/* Full-Width Bookings & Schedule Table */}
      <Schedule />
    </div>
  );
}

/* ----------------------------------------------------------- hero glance */
function AppointmentHero() {
  const { data: card } = useQuery({ queryKey: CARD_KEY, queryFn: () => appointmentApi.card() });
  const { data: windows } = useQuery({ queryKey: WINDOWS_KEY, queryFn: () => appointmentApi.windows() });
  const { data: bookings } = useQuery({ queryKey: SCHEDULE_KEY, queryFn: () => appointmentApi.schedule(false) });

  const upcomingCount = (bookings ?? []).filter(isUpcoming).length;
  const todayCount = (bookings ?? []).filter((a) => isSameDay(a.starts_at)).length;
  const windowsCount = (windows ?? []).length;
  const isEnabled = card?.enabled ?? false;

  const perMinuteRate =
    card && card.block_minutes > 0
      ? (card.price_paise / 100 / card.block_minutes).toFixed(2)
      : "0";

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white via-amber-50/25 to-white p-6 sm:p-8 shadow-[0_16px_40px_rgba(20,25,45,0.04)]">
      {/* Background celestial glow decoration */}
      <div className="pointer-events-none absolute -right-16 -top-16 size-72 rounded-full bg-gradient-to-br from-amber-300/20 via-orange-300/10 to-transparent blur-3xl" />
      <div className="pointer-events-none absolute -left-16 -bottom-16 size-60 rounded-full bg-gradient-to-tr from-amber-200/20 to-transparent blur-2xl" />

      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100/80 px-3 py-1 text-xs font-bold text-amber-900 border border-amber-300/60 shadow-xs">
              <Sparkles className="size-3.5 text-amber-600 fill-amber-600" />
              <span>Astrologer Appointment Hub</span>
            </span>

            {isEnabled ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                </span>
                Calendar Live & Bookable
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 border border-slate-200">
                <span className="size-2 rounded-full bg-slate-400" />
                Calendar Paused
              </span>
            )}
          </div>

          <h1 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            Appointments & Consultation Manager
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-medium">
            Set your consultation fees, open custom time windows, and manage all your incoming client bookings from one place.
          </p>
        </div>

        {/* Quick KPI Stat Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 shrink-0">
          <div className="rounded-2xl border border-slate-200/80 bg-white/90 backdrop-blur-md p-3.5 shadow-xs text-center space-y-1 min-w-[110px]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Rate / Min</p>
            <p className="font-display text-lg sm:text-xl font-black text-amber-600">
              ₹{perMinuteRate}
            </p>
            <p className="text-[10px] font-semibold text-slate-400">
              ₹{card ? card.price_paise / 100 : 0} / {card?.block_minutes ?? 30}m
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white/90 backdrop-blur-md p-3.5 shadow-xs text-center space-y-1 min-w-[110px]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Upcoming</p>
            <p className="font-display text-lg sm:text-xl font-black text-slate-900">
              {upcomingCount}
            </p>
            <p className="text-[10px] font-semibold text-emerald-600">
              {todayCount} scheduled today
            </p>
          </div>

          <div className="col-span-2 sm:col-span-1 rounded-2xl border border-slate-200/80 bg-white/90 backdrop-blur-md p-3.5 shadow-xs text-center space-y-1 min-w-[110px]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Open Slots</p>
            <p className="font-display text-lg sm:text-xl font-black text-slate-900">
              {windowsCount}
            </p>
            <p className="text-[10px] font-semibold text-slate-400">
              Available windows
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- price card */
function PriceCard() {
  const queryClient = useQueryClient();
  const { data: card, isLoading } = useQuery({
    queryKey: CARD_KEY,
    queryFn: () => appointmentApi.card(),
  });

  const [form, setForm] = React.useState({ rupees: "", block: "30" });
  const [cancelWindow, setCancelWindow] = React.useState<number>(30);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    if (card && !ready) {
      setForm({ rupees: String(card.price_paise / 100), block: String(card.block_minutes) });
      setCancelWindow(card.cancellation_window_minutes ?? 30);
      setReady(true);
    }
  }, [card, ready]);

  const save = useMutation({
    mutationFn: (body: {
      enabled?: boolean;
      price_paise?: number;
      block_minutes?: number;
      cancellation_window_minutes?: number;
    }) => appointmentApi.updateCard(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CARD_KEY });
      toast.success("Pricing preferences updated successfully!");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });

  if (isLoading || !card) {
    return (
      <div className="rounded-3xl border border-slate-200/90 bg-white p-8">
        <LoadingBlock label="Loading consultation rates…" />
      </div>
    );
  }

  const price = Number(form.rupees);
  const block = Number(form.block);

  // Rate presets for 1-click convenience
  const pricePresets = [
    { rupees: 250, block: 30, label: "Starter (₹250)" },
    { rupees: 450, block: 30, label: "Popular (₹450)" },
    { rupees: 550, block: 30, label: "Pro (₹550)" },
    { rupees: 750, block: 30, label: "Expert (₹750)" },
    { rupees: 1100, block: 30, label: "Master (₹1,100)" },
  ];

  return (
    <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-[0_16px_40px_rgba(20,25,45,0.05)] space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 pb-5 border-b border-slate-100">
        <div className="flex items-center gap-3.5">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#B45309] via-[#D97706] to-[#F59E0B] shadow-[0_6px_16px_rgba(217,119,6,0.3)]">
            <IndianRupee className="size-5 text-white stroke-[2.2]" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">
              Consultation Fee Engine
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Base rate charged for scheduled bookings.
            </p>
          </div>
        </div>

        {/* Live Toggle Pill */}
        <button
          type="button"
          onClick={() => save.mutate({ enabled: !card.enabled })}
          className={cn(
            "group flex items-center gap-2 rounded-2xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer border",
            card.enabled
              ? "bg-emerald-50 text-emerald-800 border-emerald-300 shadow-xs hover:bg-emerald-100 ring-2 ring-emerald-500/20"
              : "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 ring-2 ring-amber-500/20"
          )}
          title={card.enabled ? "Click to pause bookings" : "Click to enable bookings"}
        >
          <span
            className={cn(
              "size-2 rounded-full transition-all",
              card.enabled ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
            )}
          />
          <span>{card.enabled ? "Accepting Bookings (Live)" : "Bookings Paused"}</span>
        </button>
      </div>

      {/* Warning banner when bookings are paused */}
      {!card.enabled && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50/90 p-3.5 text-xs text-amber-900 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 text-amber-600 shrink-0" />
            <span className="font-medium">
              Your appointment calendar is currently paused. Clients cannot see your slots on the website.
            </span>
          </div>
          <button
            type="button"
            onClick={() => save.mutate({ enabled: true })}
            className="rounded-xl bg-amber-600 px-3 py-1.5 font-bold text-white hover:bg-amber-700 transition-colors shadow-2xs cursor-pointer text-xs"
          >
            Activate Bookings Now
          </button>
        </div>
      )}

      {/* Quick Rate Presets */}
      <div className="space-y-2">
        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Quick Price Presets
        </label>
        <div className="flex flex-wrap gap-1.5">
          {pricePresets.map((preset) => {
            const isSelected = price === preset.rupees && block === preset.block;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => setForm({ rupees: String(preset.rupees), block: String(preset.block) })}
                className={cn(
                  "rounded-xl px-2.5 py-1.5 text-xs font-bold transition-all cursor-pointer border",
                  isSelected
                    ? "bg-amber-500 text-white border-amber-500 shadow-xs scale-105"
                    : "bg-slate-50 text-slate-600 border-slate-200/80 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200"
                )}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Input Fields */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="price-rupees" className="flex items-center gap-1 text-xs font-bold text-slate-800 uppercase tracking-wider">
            <span>Price (₹)</span>
            <span className="text-amber-500">*</span>
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 font-bold">
              ₹
            </span>
            <input
              id="price-rupees"
              type="number"
              min={0}
              step={1}
              value={form.rupees}
              onChange={(e) => setForm((f) => ({ ...f, rupees: e.target.value }))}
              placeholder="e.g. 500"
              className="w-full rounded-2xl border border-slate-200/90 bg-slate-50/70 pl-8 pr-3 py-2.5 text-sm font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="block-minutes" className="flex items-center gap-1 text-xs font-bold text-slate-800 uppercase tracking-wider">
            <span>Per (Minutes)</span>
            <span className="text-amber-500">*</span>
          </label>
          <div className="relative">
            <input
              id="block-minutes"
              type="number"
              min={5}
              step={5}
              value={form.block}
              onChange={(e) => setForm((f) => ({ ...f, block: e.target.value }))}
              placeholder="30"
              className="w-full rounded-2xl border border-slate-200/90 bg-slate-50/70 pl-4 pr-12 py-2.5 text-sm font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
            />
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-xs font-bold text-slate-400">
              mins
            </span>
          </div>
        </div>
      </div>

      {/* Live Booking Breakdown / Tier Simulator */}
      {price > 0 && block > 0 && (
        <div className="rounded-2xl border border-amber-200/60 bg-amber-50/40 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-amber-600 fill-amber-600" />
              What Clients Pay By Session
            </span>
            <span className="text-xs font-bold text-amber-800">
              ~₹{(price / block).toFixed(2)}/min
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[15, 30, 60].map((m) => {
              const computed = Math.round((price * 100 * m) / block);
              const isStandard = m === block;
              return (
                <div
                  key={m}
                  className={cn(
                    "rounded-xl p-2.5 text-center transition-all border",
                    isStandard
                      ? "bg-white border-amber-300 shadow-xs"
                      : "bg-white/60 border-amber-200/50"
                  )}
                >
                  <p className="text-[11px] font-bold text-slate-500">{m} Mins</p>
                  <p className="font-display text-sm font-black text-slate-900">
                    ₹{rupees(computed)}
                  </p>
                  {isStandard && (
                    <span className="inline-block mt-0.5 rounded-full bg-amber-100 px-1.5 py-0.2 text-[9px] font-bold text-amber-800">
                      Standard
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Cancellation Grace Window (Rule 5) */}
      <div className="space-y-2.5 pt-2 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="size-3.5 text-amber-600" />
            <span>Client Cancellation Grace Window</span>
          </label>
          <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
            {cancelWindow} minutes
          </span>
        </div>
        <p className="text-[11px] text-slate-500">
          Clients can only cancel their booking within this window after reservation. Beyond this window, bookings are locked.
        </p>
        <div className="flex flex-wrap gap-2">
          {[15, 30, 45, 60, 120].map((mins) => (
            <button
              key={mins}
              type="button"
              onClick={() => setCancelWindow(mins)}
              className={cn(
                "rounded-xl px-3 py-1.5 text-xs font-bold transition-all border cursor-pointer",
                cancelWindow === mins
                  ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              )}
            >
              {mins} Mins {mins === 30 && "(Standard)"}
            </button>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <button
        type="button"
        disabled={save.isPending || !(price > 0 && block >= 5)}
        onClick={() =>
          save.mutate({
            price_paise: Math.round(price * 100),
            block_minutes: block,
            cancellation_window_minutes: cancelWindow,
            enabled: true,
          })
        }
        className={cn(
          "w-full flex items-center justify-center gap-2 rounded-2xl py-3 px-6 text-sm font-bold text-white transition-all cursor-pointer",
          "bg-gradient-to-r from-[#D97706] via-[#EA580C] to-[#F59E0B]",
          "shadow-[0_8px_20px_-4px_rgba(217,119,6,0.45)] hover:shadow-[0_12px_28px_-4px_rgba(217,119,6,0.55)] hover:scale-[1.01] active:scale-[0.99]",
          "disabled:opacity-50 disabled:pointer-events-none disabled:shadow-none"
        )}
      >
        <Check className="size-4 stroke-[2.5]" />
        <span>{save.isPending ? "Saving Pricing..." : "Save Rate & Activate Bookings"}</span>
      </button>
    </div>
  );
}

/* ------------------------------------------------------------- open hours */
function OpenHours() {
  const queryClient = useQueryClient();
  const { data: windows, isLoading } = useQuery({
    queryKey: WINDOWS_KEY,
    queryFn: () => appointmentApi.windows(),
  });

  // Default time picker state
  const [from, setFrom] = React.useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(17, 0, 0, 0);
    return toLocalInput(d);
  });
  const [to, setTo] = React.useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(20, 0, 0, 0);
    return toLocalInput(d);
  });

  const add = useMutation({
    mutationFn: () =>
      appointmentApi.addWindow(
        new Date(from).toISOString(),
        new Date(to).toISOString(),
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: WINDOWS_KEY });
      void queryClient.invalidateQueries({ queryKey: CARD_KEY });
      toast.success("Availability window opened & live on website!");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => appointmentApi.removeWindow(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: WINDOWS_KEY });
      toast.success("Slot removed.");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });

  // Astrologer Quick-Add Presets (Super Fun & One-Click!)
  const applyPreset = (daysOffset: number, startHour: number, endHour: number) => {
    const start = new Date();
    start.setDate(start.getDate() + daysOffset);
    start.setHours(startHour, 0, 0, 0);

    const end = new Date();
    end.setDate(end.getDate() + daysOffset);
    end.setHours(endHour, 0, 0, 0);

    setFrom(toLocalInput(start));
    setTo(toLocalInput(end));
    toast.info("Preset applied! Click '+ Open Selected Hours' to confirm.");
  };

  // Grouped by day
  const byDay = React.useMemo(() => {
    const groups = new Map<string, typeof windows>();
    (windows ?? []).forEach((w) => {
      const key = w.day;
      groups.set(key, [...(groups.get(key) ?? []), w]);
    });
    return [...groups.entries()];
  }, [windows]);

  return (
    <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-[0_16px_40px_rgba(20,25,45,0.05)] space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 pb-5 border-b border-slate-100">
        <div className="flex items-center gap-3.5">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 shadow-[0_6px_16px_rgba(3,105,161,0.25)]">
            <Clock className="size-5 text-white stroke-[2.2]" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">
              Availability & Open Windows
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Open blocks of time where clients can reserve appointments with you.
            </p>
          </div>
        </div>

        <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700 border border-sky-200/70">
          {(windows ?? []).length} Slots Active
        </span>
      </div>

      {/* Quick Time Presets */}
      <div className="space-y-2">
        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          ⚡ One-Click Schedule Presets
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => applyPreset(0, 18, 21)}
            className="rounded-xl border border-slate-200/80 bg-slate-50/70 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-sky-50 hover:text-sky-700 hover:border-sky-200 transition-all cursor-pointer"
          >
            🌅 Today Evening (6 PM – 9 PM)
          </button>
          <button
            type="button"
            onClick={() => applyPreset(0, 20, 23)}
            className="rounded-xl border border-slate-200/80 bg-slate-50/70 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-sky-50 hover:text-sky-700 hover:border-sky-200 transition-all cursor-pointer"
          >
            🌙 Tonight (8 PM – 11 PM)
          </button>
          <button
            type="button"
            onClick={() => applyPreset(1, 10, 13)}
            className="rounded-xl border border-slate-200/80 bg-slate-50/70 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-sky-50 hover:text-sky-700 hover:border-sky-200 transition-all cursor-pointer"
          >
            ☀️ Tomorrow Morning (10 AM – 1 PM)
          </button>
          <button
            type="button"
            onClick={() => applyPreset(1, 18, 22)}
            className="rounded-xl border border-slate-200/80 bg-slate-50/70 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-sky-50 hover:text-sky-700 hover:border-sky-200 transition-all cursor-pointer"
          >
            🌆 Tomorrow Evening (6 PM – 10 PM)
          </button>
        </div>
      </div>

      {/* Date-time Pickers + Add Button */}
      <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="space-y-1.5">
            <label htmlFor="slot-from" className="text-xs font-bold text-slate-700">From (Start Date & Time)</label>
            <input
              id="slot-from"
              type="datetime-local"
              step={300}
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="slot-until" className="text-xs font-bold text-slate-700">Until (End Date & Time)</label>
            <input
              id="slot-until"
              type="datetime-local"
              step={300}
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500"
            />
          </div>
        </div>

        <button
          type="button"
          disabled={add.isPending || !from || !to}
          onClick={() => add.mutate()}
          className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition-all cursor-pointer disabled:opacity-50"
        >
          <Plus className="size-4" />
          <span>{add.isPending ? "Opening Window..." : "+ Open Selected Hours"}</span>
        </button>
      </div>

      {/* Active Slots Timeline Display */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Current Active Schedule
          </h3>
          <span className="text-xs font-medium text-slate-400">
            {byDay.length} scheduled days
          </span>
        </div>

        {isLoading ? (
          <LoadingBlock label="Loading active slots…" />
        ) : byDay.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center space-y-2">
            <CalendarDays className="size-8 mx-auto text-slate-300" />
            <p className="text-xs font-bold text-slate-700">No hours opened yet</p>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
              Use the quick presets above to open your evening or morning consultation hours.
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
            {byDay.map(([day, items]) => {
              const dateObj = new Date(`${day}T00:00:00`);
              const isToday = isSameDay(dateObj.toISOString());

              return (
                <div
                  key={day}
                  className="rounded-2xl border border-slate-200/80 bg-white p-3.5 space-y-2.5 transition-all hover:border-slate-300 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display text-xs font-bold text-slate-900 flex items-center gap-2">
                      <Calendar className="size-3.5 text-sky-600" />
                      {dateObj.toLocaleDateString("en-IN", {
                        weekday: "long",
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                    {isToday && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                        Today
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {(items ?? []).map((w) => (
                      <div
                        key={w.id}
                        className="group inline-flex items-center gap-2 rounded-xl border border-slate-200/90 bg-slate-50/70 px-3 py-1.5 text-xs transition-all hover:bg-slate-100"
                      >
                        <Clock className="size-3.5 text-amber-600" />
                        <span className="font-semibold tabular-nums text-slate-800">
                          {clock(w.starts_at)} – {clock(w.ends_at)}
                        </span>
                        <button
                          type="button"
                          aria-label="Remove slot"
                          title="Remove availability slot"
                          disabled={remove.isPending}
                          onClick={() => remove.mutate(w.id)}
                          className="ml-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- schedule */
function Schedule() {
  const queryClient = useQueryClient();
  const [tab, setTab] = React.useState<ScheduleTab>("upcoming");
  const [cancelTargetId, setCancelTargetId] = React.useState<string | null>(null);

  // Advanced Dossier & Prescription state
  const [dossierAppointment, setDossierAppointment] = React.useState<Appointment | null>(null);
  const [prescriptionAppointment, setPrescriptionAppointment] = React.useState<Appointment | null>(null);
  const [prescriptionForm, setPrescriptionForm] = React.useState<{
    gemstone: string;
    rudraksha: string;
    mantra: string;
    mantra_count: number;
    daan_remedy: string;
    astrologer_notes: string;
  }>({
    gemstone: "",
    rudraksha: "",
    mantra: "",
    mantra_count: 108,
    daan_remedy: "",
    astrologer_notes: "",
  });

  const openPrescriptionModal = (a: Appointment) => {
    setPrescriptionAppointment(a);
    setPrescriptionForm({
      gemstone: a.prescription?.gemstone || "",
      rudraksha: a.prescription?.rudraksha || "",
      mantra: a.prescription?.mantra || "",
      mantra_count: a.prescription?.mantra_count || 108,
      daan_remedy: a.prescription?.daan_remedy || "",
      astrologer_notes: a.prescription?.astrologer_notes || "",
    });
  };

  const updatePrescriptionMutation = useMutation({
    mutationFn: () =>
      appointmentApi.updatePrescription(prescriptionAppointment!.id, {
        gemstone: prescriptionForm.gemstone.trim() || null,
        rudraksha: prescriptionForm.rudraksha.trim() || null,
        mantra: prescriptionForm.mantra.trim() || null,
        mantra_count: Number(prescriptionForm.mantra_count) || null,
        daan_remedy: prescriptionForm.daan_remedy.trim() || null,
        astrologer_notes: prescriptionForm.astrologer_notes.trim() || null,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SCHEDULE_KEY });
      setPrescriptionAppointment(null);
      toast.success("Vedic prescription issued and synced to client in real-time!");
    },
    onError: (e: ApiError) => toast.error(e.message || "Failed to update prescription."),
  });

  const {
    data: bookings,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: SCHEDULE_KEY,
    queryFn: () => appointmentApi.schedule(false),
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
  });

  const cancel = useMutation({
    mutationFn: (id: string) => appointmentApi.cancel(id, "Cancelled by the astrologer"),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SCHEDULE_KEY });
      setCancelTargetId(null);
      toast.success("Appointment cancelled. Client has been 100% refunded.");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });

  const complete = useMutation({
    mutationFn: (id: string) => appointmentApi.complete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SCHEDULE_KEY });
      toast.success("Appointment completed and balance coins captured!");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });

  const allBookings = React.useMemo(() => bookings ?? [], [bookings]);
  const upcomingList = React.useMemo(() => allBookings.filter(isUpcoming), [allBookings]);
  const todayList = React.useMemo(
    () => allBookings.filter((a) => isSameDay(a.starts_at)),
    [allBookings],
  );
  const pastList = React.useMemo(() => allBookings.filter((a) => !isUpcoming(a)), [allBookings]);

  const displayedList = React.useMemo(() => {
    if (tab === "upcoming") {
      return [...upcomingList].sort(
        (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
      );
    }
    if (tab === "today") {
      return [...todayList].sort(
        (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
      );
    }
    if (tab === "past") {
      return [...pastList].sort(
        (a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime(),
      );
    }
    return [...allBookings].sort(
      (a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime(),
    );
  }, [tab, upcomingList, todayList, pastList, allBookings]);

  return (
    <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-[0_16px_40px_rgba(20,25,45,0.05)] space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
              <CalendarCheck className="size-5 stroke-[2.2]" />
            </div>
            <h2 className="font-display text-xl font-bold text-slate-900">
              Bookings & Scheduled Consultations
            </h2>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            {tab === "upcoming"
              ? "All confirmed upcoming bookings, soonest first."
              : tab === "today"
              ? "All sessions scheduled for today."
              : tab === "past"
              ? "Completed, missed, or past consultation sessions."
              : "Entire booking ledger on record."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Pill Tabs */}
          <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-100/80 p-1 text-xs">
            <button
              type="button"
              onClick={() => setTab("upcoming")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-bold transition-all cursor-pointer",
                tab === "upcoming"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <span>Upcoming</span>
              {upcomingList.length > 0 && (
                <span className="rounded-full bg-amber-500 text-white px-1.5 py-0.2 text-[10px] font-black">
                  {upcomingList.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setTab("today")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-bold transition-all cursor-pointer",
                tab === "today"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <span>Today</span>
              {todayList.length > 0 && (
                <span className="rounded-full bg-emerald-500 text-white px-1.5 py-0.2 text-[10px] font-black">
                  {todayList.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setTab("all")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-bold transition-all cursor-pointer",
                tab === "all"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <span>All ({allBookings.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setTab("past")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-bold transition-all cursor-pointer",
                tab === "past"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <span>Past</span>
            </button>
          </div>

          {/* Refresh Action */}
          <button
            type="button"
            onClick={() => {
              void refetch();
              toast.success("Schedule updated.");
            }}
            disabled={isFetching}
            className="flex size-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-amber-600 hover:bg-amber-50 transition-all cursor-pointer disabled:opacity-50 shadow-xs"
            title="Refresh bookings"
          >
            <RefreshCw className={cn("size-4", isFetching && "animate-spin text-amber-600")} />
          </button>
        </div>
      </div>

      {/* Bookings List */}
      {isLoading ? (
        <LoadingBlock label="Fetching appointment ledger…" />
      ) : !displayedList.length ? (
        <div className="py-12 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/40">
          <CalendarDays className="size-12 mx-auto text-slate-300 mb-3" />
          <h3 className="font-display text-sm font-bold text-slate-800">
            {tab === "upcoming"
              ? "No upcoming consultations"
              : tab === "today"
              ? "No consultations booked for today"
              : tab === "past"
              ? "No past consultations on record"
              : "No appointments booked yet"}
          </h3>
          <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
            {tab === "upcoming" && allBookings.length > 0
              ? "You have past records, but no future slots booked at the moment."
              : "As soon as clients book a consultation from your public profile, it will appear here instantly."}
          </p>
          {tab === "upcoming" && allBookings.length > 0 && (
            <div className="mt-4">
              <Button variant="secondary" size="sm" onClick={() => setTab("all")}>
                View All Bookings ({allBookings.length})
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {displayedList.map((a) => {
            const isTodayBooking = isSameDay(a.starts_at);
            const upcoming = isUpcoming(a);
            const startsMs = new Date(a.starts_at).getTime();
            const endsMs = new Date(a.ends_at).getTime();
            const now = Date.now();
            const isLiveWindow = a.status === "booked" && startsMs - now <= 15 * 60_000 && endsMs >= now;
            const pillar = a.consultation_pillar ? PILLAR_LABELS[a.consultation_pillar] : null;
            const hasPrescription = Boolean(
              a.prescription?.gemstone || a.prescription?.rudraksha || a.prescription?.mantra,
            );

            return (
              <div
                key={a.id}
                className={cn(
                  "relative rounded-2xl border p-5 transition-all space-y-4",
                  isLiveWindow
                    ? "border-amber-400 bg-amber-50/40 ring-2 ring-amber-400/20 shadow-md"
                    : isTodayBooking && upcoming
                    ? "border-amber-300 bg-amber-50/20 shadow-xs"
                    : "border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-2xs"
                )}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Client Info & Time */}
                  <div className="flex items-start gap-4">
                    <Avatar
                      name={a.peer?.name || "Client"}
                      src={a.peer?.avatar_url ?? undefined}
                      size="md"
                      className="size-11 ring-2 ring-slate-100"
                    />
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-display font-bold text-slate-900 text-sm sm:text-base">
                          {a.peer?.name || "Client"}
                        </span>
                        {isTodayBooking && (
                          <span className="rounded-full bg-amber-500 text-white px-2 py-0.5 text-[10px] font-black uppercase tracking-wider">
                            Today
                          </span>
                        )}
                        <Badge
                          tone={
                            a.status === "booked"
                              ? upcoming
                                ? "green"
                                : "neutral"
                              : a.status === "completed"
                              ? "blue"
                              : a.status === "cancelled"
                              ? "red"
                              : "neutral"
                          }
                        >
                          {APPOINTMENT_STATUS_LABELS[a.status]}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                        <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                          <Clock className="size-3.5 text-amber-600" />
                          {dayRelative(a.starts_at)} · {clock(a.starts_at)} – {clock(a.ends_at)}
                        </span>
                        <span>•</span>
                        <span>{a.minutes} min session</span>
                      </div>

                      {a.user_note && (
                        <div className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600 italic border border-slate-100 max-w-lg">
                          “{a.user_note}”
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Financial Details */}
                  <div className="flex flex-wrap sm:flex-nowrap items-center justify-between md:justify-end gap-6 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                    <div className="text-left md:text-right space-y-0.5">
                      <p className="font-display text-base font-black tabular-nums text-slate-900">
                        ₹{rupees(a.price_paise)}
                      </p>
                      {a.status === "booked" ? (
                        <p className="text-xs font-bold text-amber-700 flex items-center justify-end gap-1">
                          <span>₹{rupees(a.balance_due_paise)} in escrow</span>
                          <span className="text-[10px] text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded font-semibold">
                            {a.held_coins ?? 0} coins
                          </span>
                        </p>
                      ) : a.status === "completed" ? (
                        <p className="text-xs font-semibold text-emerald-600">Session Completed</p>
                      ) : (
                        <p className="text-xs font-semibold text-slate-400">Cancelled</p>
                      )}
                      <p className="text-[10px] text-slate-400 tabular-nums">
                        Deposit: ₹{rupees(a.deposit_paise)} ({a.deposit_coins} coins)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Astrological Metadata & Fast Actions Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    {pillar && (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-2.5 py-1 font-semibold text-amber-800 border border-amber-500/20 text-[11px]">
                        <span>{pillar.icon}</span>
                        <span>{pillar.label}</span>
                      </span>
                    )}

                    {a.muhurat_type && (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 font-semibold text-slate-700 border border-slate-200 text-[11px]">
                        <Sparkles className="size-3 text-amber-500" />
                        <span>{a.muhurat_type}</span>
                      </span>
                    )}

                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-lg px-2.5 py-1 font-semibold text-[11px] border",
                        hasPrescription
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-slate-50 text-slate-500 border-slate-200"
                      )}
                    >
                      <FileText className="size-3" />
                      <span>{hasPrescription ? "Prescription Issued" : "Prescription Pending"}</span>
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* View Dossier */}
                    <button
                      type="button"
                      onClick={() => setDossierAppointment(a)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-amber-600 transition-colors cursor-pointer shadow-2xs"
                    >
                      <Eye className="size-3.5 text-slate-400" />
                      <span>Client Dossier</span>
                    </button>

                    {/* Prescription Editor */}
                    <button
                      type="button"
                      onClick={() => openPrescriptionModal(a)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-500/20 transition-colors cursor-pointer shadow-2xs"
                    >
                      <Edit3 className="size-3.5 text-amber-600" />
                      <span>{hasPrescription ? "Edit Prescription" : "Write Prescription"}</span>
                    </button>

                    {/* Enter Chamber (Live) */}
                    {isLiveWindow && (
                      <a
                        href={`/calls`}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-sm animate-pulse"
                      >
                        <Video className="size-3.5" />
                        <span>Enter Chamber</span>
                      </a>
                    )}

                    {/* Complete Session Action (Capture Escrow) */}
                    {a.status === "booked" && (
                      <button
                        type="button"
                        disabled={complete.isPending}
                        onClick={() => complete.mutate(a.id)}
                        className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                      >
                        <CheckCircle2 className="size-3.5 text-emerald-600" />
                        <span>Complete Session</span>
                      </button>
                    )}

                    {/* Cancellation Trigger */}
                    {a.status === "booked" && upcoming && (
                      <button
                        type="button"
                        onClick={() => setCancelTargetId(a.id)}
                        className="rounded-xl border border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Client Astrological Dossier Modal */}
      <Modal
        open={Boolean(dossierAppointment)}
        onClose={() => setDossierAppointment(null)}
        title="Client Astrological Dossier"
        description="Comprehensive pre-consultation details and birth chart snapshot submitted by the client."
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <Button variant="secondary" onClick={() => setDossierAppointment(null)}>
              Close Dossier
            </Button>
          </div>
        }
      >
        {dossierAppointment && (
          <div className="space-y-4 py-2 text-xs">
            {/* Client Profile Header */}
            <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3.5 border border-slate-200">
              <Avatar
                name={dossierAppointment.peer?.name || "Client"}
                src={dossierAppointment.peer?.avatar_url ?? undefined}
                size="md"
              />
              <div className="min-w-0 flex-1">
                <h4 className="font-display font-bold text-sm text-slate-900 truncate">
                  {dossierAppointment.peer?.name || "Client"}
                </h4>
                <p className="text-[11px] text-slate-500">
                  Appointment Session · {dossierAppointment.minutes} mins · {dayRelative(dossierAppointment.starts_at)}
                </p>
              </div>
            </div>

            {/* Consultation Focus Pillar */}
            {dossierAppointment.consultation_pillar && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-3.5 space-y-1">
                <p className="text-[10px] uppercase font-bold text-amber-700 flex items-center gap-1.5">
                  <Compass className="size-3.5 text-amber-600" />
                  <span>Primary Consultation Focus Pillar</span>
                </p>
                <p className="font-bold text-slate-900 text-sm">
                  {PILLAR_LABELS[dossierAppointment.consultation_pillar]?.icon}{" "}
                  {PILLAR_LABELS[dossierAppointment.consultation_pillar]?.label || dossierAppointment.consultation_pillar}
                </p>
              </div>
            )}

            {/* Birth Details Snapshot */}
            <div className="rounded-2xl border border-slate-200 bg-white p-3.5 space-y-2.5">
              <p className="text-[11px] font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="size-3.5 text-amber-600" />
                <span>Birth Chart Details</span>
              </p>

              {dossierAppointment.birth_details ? (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                    <span className="text-[10px] text-slate-400 block">Date of Birth</span>
                    <span className="font-bold text-slate-800">
                      {dossierAppointment.birth_details.date_of_birth || "Not specified"}
                    </span>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                    <span className="text-[10px] text-slate-400 block">Time of Birth</span>
                    <span className="font-bold text-slate-800">
                      {dossierAppointment.birth_details.time_of_birth || "Not specified"}
                    </span>
                  </div>
                  <div className="col-span-2 rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                    <span className="text-[10px] text-slate-400 block">Place of Birth</span>
                    <span className="font-bold text-slate-800">
                      {dossierAppointment.birth_details.place_of_birth || "Not specified"}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-slate-400 italic">No specific birth coordinates submitted.</p>
              )}
            </div>

            {/* Client Notes & Inquiries */}
            {dossierAppointment.user_note && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-1">
                <p className="text-[10px] uppercase font-bold text-slate-500">
                  Client Specific Inquiries / Questions
                </p>
                <p className="text-slate-800 leading-relaxed italic bg-white p-2.5 rounded-xl border border-slate-200">
                  “{dossierAppointment.user_note}”
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Sacred Vedic Prescription Editor Modal */}
      <Modal
        open={Boolean(prescriptionAppointment)}
        onClose={() => setPrescriptionAppointment(null)}
        title="Write / Issue Vedic Prescription"
        description="Prescribe consecrated gemstones, authentic rudraksha, sacred mantras, and remedial daan. This instantly updates on the client's screen in real time."
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <Button variant="secondary" onClick={() => setPrescriptionAppointment(null)}>
              Cancel
            </Button>
            <Button
              loading={updatePrescriptionMutation.isPending}
              onClick={() => updatePrescriptionMutation.mutate()}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
            >
              <Check className="size-3.5 mr-1" />
              Save & Issue Prescription
            </Button>
          </div>
        }
      >
        <div className="space-y-3.5 py-2 text-xs max-h-[70vh] overflow-y-auto pr-1">
          <div>
            <label className="block text-[11px] font-bold text-slate-800 mb-1 flex items-center gap-1.5">
              <Gem className="size-3.5 text-amber-600" />
              <span>Recommended Gemstone (রত্ন প্রতিকার)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Natural Yellow Sapphire (Pokhraj) - 5.25 Carats in Gold on Index Finger"
              value={prescriptionForm.gemstone}
              onChange={(e) => setPrescriptionForm((p) => ({ ...p, gemstone: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-800 mb-1 flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-amber-600" />
              <span>Recommended Rudraksha (রুদ্রাক্ষ প্রতিকার)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. 7 Mukhi Mahalaxmi Rudraksha energized with Om Hreem Shreem"
              value={prescriptionForm.rudraksha}
              onChange={(e) => setPrescriptionForm((p) => ({ ...p, rudraksha: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="block text-[11px] font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                <Flame className="size-3.5 text-amber-600" />
                <span>Sacred Vedic Mantra (সিদ্ধ মন্ত্র)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. ॐ ग्रां ग्रीं ग्रौं सः गुरवे नमः"
                value={prescriptionForm.mantra}
                onChange={(e) => setPrescriptionForm((p) => ({ ...p, mantra: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-800 mb-1">
                Japa Count (জপ)
              </label>
              <input
                type="number"
                value={prescriptionForm.mantra_count}
                onChange={(e) => setPrescriptionForm((p) => ({ ...p, mantra_count: Number(e.target.value) }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-800 mb-1">
              Vedic Daan & Charitable Rituals (দান ও পূজার বিধান)
            </label>
            <input
              type="text"
              placeholder="e.g. Donate yellow sweets and grams on Thursday morning at temple"
              value={prescriptionForm.daan_remedy}
              onChange={(e) => setPrescriptionForm((p) => ({ ...p, daan_remedy: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-800 mb-1">
              Astrologer Guidance & Custom Directives (বিশেষ পরামর্শ)
            </label>
            <textarea
              rows={3}
              placeholder="Detailed personalized instructions for the seeker..."
              value={prescriptionForm.astrologer_notes}
              onChange={(e) => setPrescriptionForm((p) => ({ ...p, astrologer_notes: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
            />
          </div>
        </div>
      </Modal>

      {/* Confirmation Modal for Session Cancellation */}
      <Modal
        open={Boolean(cancelTargetId)}
        onClose={() => setCancelTargetId(null)}
        title="Cancel Consultation Booking"
        description="Are you sure you want to cancel this scheduled appointment? The client will be notified and any deposit will be returned."
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <Button variant="secondary" onClick={() => setCancelTargetId(null)}>
              Keep Appointment
            </Button>
            <Button
              variant="danger"
              loading={cancel.isPending}
              onClick={() => {
                if (cancelTargetId) cancel.mutate(cancelTargetId);
              }}
            >
              Yes, Cancel Session
            </Button>
          </div>
        }
      >
        <div className="space-y-3 py-2">
          <Alert tone="warning">
            Frequent cancellations may impact your astrologer profile rating and ranking in the Astra directory.
          </Alert>
        </div>
      </Modal>
    </div>
  );
}
