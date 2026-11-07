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
  Flag,
  Flame,
  Gem,
  HelpCircle,
  IndianRupee,
  Info,
  MessageSquare,
  PhoneCall,
  Plus,
  RefreshCw,
  Save,
  Copy,
  Lock,
  Unlock,
  Link2,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  TrendingUp,
  User,
  UserX,
  Video,
  X,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { Alert, Avatar, Badge, Button, EmptyState, LoadingBlock, Modal } from "@/components/ui";
import { GoogleCalendarSuite } from "@/components/appointments/google-calendar";
import { appointmentApi, astrologerApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import {
  APPOINTMENT_STATUS_LABELS,
  type Appointment,
  type BlacklistedClient,
  type PrivateInviteLink,
  type VedicPrescription,
} from "@/types";

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
const BLACKLIST_KEY = ["appointments", "blacklist"] as const;
const PRIVATE_LINKS_KEY = ["appointments", "private_links"] as const;

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
type AppointmentPortalTab = "calendar" | "rates_windows" | "vip_private" | "ledger";

export default function AppointmentsPage() {
  const { user } = useAuth();
  const isAstrologer = user?.role === "astrologer";
  const [activeTab, setActiveTab] = React.useState<AppointmentPortalTab>("calendar");

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
      <AppointmentHero
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
      />

      {/* Top Level Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-2 bg-slate-100/80 rounded-2xl border border-slate-200">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab("calendar")}
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all cursor-pointer",
              activeTab === "calendar"
                ? "bg-white text-slate-900 shadow-sm font-extrabold ring-1 ring-slate-900/5"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
            )}
          >
            <Calendar className="size-4 text-sky-600" />
            <span>Interactive Google Calendar</span>
            <span className="rounded-full bg-sky-100 text-sky-800 text-[10px] px-2 py-0.2 font-black">
              Week/Month
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("rates_windows")}
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all cursor-pointer",
              activeTab === "rates_windows"
                ? "bg-white text-slate-900 shadow-sm font-extrabold ring-1 ring-slate-900/5"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
            )}
          >
            <Clock className="size-4 text-amber-600" />
            <span>Fee Engine & Availability Windows</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("vip_private")}
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all cursor-pointer",
              activeTab === "vip_private"
                ? "bg-white text-slate-900 shadow-sm font-extrabold ring-1 ring-slate-900/5"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
            )}
          >
            <Zap className="size-4 text-amber-500 fill-amber-500/20" />
            <span>VIP Tatkal & Private Links</span>
            <span className="rounded-full bg-amber-100 text-amber-800 text-[10px] px-2 py-0.2 font-black">
              VIP / জরুরি
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("ledger")}
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all cursor-pointer",
              activeTab === "ledger"
                ? "bg-white text-slate-900 shadow-sm font-extrabold ring-1 ring-slate-900/5"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
            )}
          >
            <FileText className="size-4 text-emerald-600" />
            <span>Client Dossier & Ledger</span>
          </button>
        </div>

        <p className="text-xs text-slate-500 font-medium px-2 hidden md:block">
          {activeTab === "calendar"
            ? "📅 Google Calendar time-grid with live needle, week/month views & 1-click slot creation."
            : activeTab === "rates_windows"
            ? "⚙️ Set consultation fees, grace periods, and open hours."
            : activeTab === "vip_private"
            ? "⚡ Emergency Tatkal slots at premium rates & secret passcode-protected VIP booking links."
            : "📋 Complete booking records, prescriptions, and escrow details."}
        </p>
      </div>

      {/* 1. INTERACTIVE GOOGLE CALENDAR (PRIMARY TAB) */}
      {activeTab === "calendar" && (
        <div className="space-y-6">
          <Schedule initialDisplayMode="calendar" />
        </div>
      )}

      {/* 2. RATES & AVAILABILITY ENGINE TAB */}
      {activeTab === "rates_windows" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5 xl:col-span-5 space-y-6">
            <PriceCard />
          </div>
          <div className="lg:col-span-7 xl:col-span-7 space-y-6">
            <OpenHours />
          </div>
        </div>
      )}

      {/* 3. VIP TATKAL & PRIVATE LINKS TAB */}
      {activeTab === "vip_private" && (
        <div className="space-y-6">
          <VipTatkalAndPrivateManager />
        </div>
      )}

      {/* 4. BOOKINGS LEDGER TAB */}
      {activeTab === "ledger" && (
        <div className="space-y-6">
          <Schedule initialDisplayMode="list" />
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------------------- hero glance */
function AppointmentHero({
  activeTab,
  onSelectTab,
}: {
  activeTab?: AppointmentPortalTab;
  onSelectTab?: (tab: AppointmentPortalTab) => void;
}) {
  const queryClient = useQueryClient();
  const { data: card } = useQuery({ queryKey: CARD_KEY, queryFn: () => appointmentApi.card() });
  const { data: windows } = useQuery({ queryKey: WINDOWS_KEY, queryFn: () => appointmentApi.windows() });
  const { data: bookings } = useQuery({ queryKey: SCHEDULE_KEY, queryFn: () => appointmentApi.schedule(false) });
  const { data: profile } = useQuery({ queryKey: ["astrologer", "me"], queryFn: () => astrologerApi.me() });

  const [openPauseModal, setOpenPauseModal] = React.useState(false);
  const [pauseDuration, setPauseDuration] = React.useState(3);
  const [pauseReason, setPauseReason] = React.useState("");

  const isBrahmaPaused = Boolean(
    profile?.brahma_pause_until && new Date(profile.brahma_pause_until).getTime() > Date.now()
  );

  const activatePause = useMutation({
    mutationFn: () => appointmentApi.activateBrahmaPause({ duration_hours: pauseDuration, reason: pauseReason || null }),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: ["astrologer", "me"] });
      void queryClient.invalidateQueries({ queryKey: SCHEDULE_KEY });
      setOpenPauseModal(false);
      setPauseReason("");
      toast.success(
        `Brahma Pause activated until ${new Date(res.pause_until).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}. ${res.affected_appointments_count} seeker(s) notified with rescue options.`
      );
    },
    onError: (e: ApiError) => toast.error(e.message),
  });

  const resumePause = useMutation({
    mutationFn: () => appointmentApi.resumeBrahmaPause(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["astrologer", "me"] });
      void queryClient.invalidateQueries({ queryKey: SCHEDULE_KEY });
      toast.success("Brahma Pause ended. Normal schedule restored!");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });

  const upcomingCount = (bookings ?? []).filter(isUpcoming).length;
  const todayCount = (bookings ?? []).filter((a) => isSameDay(a.starts_at)).length;
  const windowsCount = (windows ?? []).length;
  const isEnabled = card?.enabled ?? false;

  const perMinuteRate =
    card && card.block_minutes > 0
      ? (card.price_paise / 100 / card.block_minutes).toFixed(2)
      : "0";

  return (
    <div className="space-y-4">
      {/* Active Brahma Pause Notice Banner */}
      {isBrahmaPaused && (
        <div className="rounded-3xl border border-purple-300 bg-gradient-to-r from-purple-50 via-purple-100/70 to-purple-50 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-300">
          <div className="flex items-center gap-3.5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-purple-600 text-white shadow-md">
              <span className="text-lg">🕊️</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-sm font-bold text-purple-950">
                  Brahma Pause (Emergency Break) is Active
                </span>
                <span className="rounded-full bg-purple-200/80 px-2 py-0.5 text-[10px] font-bold text-purple-900 animate-pulse">
                  Live Offline
                </span>
              </div>
              <p className="text-xs text-purple-800 font-medium mt-0.5">
                Shield active until {new Date(profile!.brahma_pause_until!).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}.
                Affected seekers have been notified with complimentary 1-click rescue choices.
                {profile?.brahma_pause_reason ? ` (Reason: "${profile.brahma_pause_reason}")` : ""}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            loading={resumePause.isPending}
            onClick={() => resumePause.mutate()}
            className="bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shrink-0 cursor-pointer shadow-xs"
          >
            End Pause & Resume Schedule
          </Button>
        </div>
      )}

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

              {/* Brahma Pause Trigger Button */}
              {!isBrahmaPaused ? (
                <button
                  type="button"
                  onClick={() => setOpenPauseModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 px-3 py-1 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                  title="Pause consultations due to emergency"
                >
                  <span>🕊️ Brahma Pause (জরুরি বিরতি)</span>
                </button>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-100 text-purple-900 border border-purple-300 px-3 py-1 text-xs font-bold shadow-2xs">
                  <span>🕊️ On Pause</span>
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
            <div
              onClick={() => onSelectTab?.("rates_windows")}
              className="rounded-2xl border border-slate-200/80 bg-white/90 backdrop-blur-md p-3.5 shadow-xs text-center space-y-1 min-w-[110px] cursor-pointer hover:border-amber-300 hover:shadow-sm transition-all"
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Rate / Min</p>
              <p className="font-display text-lg sm:text-xl font-black text-amber-600">
                ₹{perMinuteRate}
              </p>
              <p className="text-[10px] font-semibold text-slate-400">
                ₹{card ? card.price_paise / 100 : 0} / {card?.block_minutes ?? 30}m
              </p>
            </div>

            <div
              onClick={() => onSelectTab?.("calendar")}
              className="rounded-2xl border border-slate-200/80 bg-white/90 backdrop-blur-md p-3.5 shadow-xs text-center space-y-1 min-w-[110px] cursor-pointer hover:border-amber-300 hover:shadow-sm transition-all"
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Upcoming</p>
              <p className="font-display text-lg sm:text-xl font-black text-slate-900">
                {upcomingCount}
              </p>
              <p className="text-[10px] font-semibold text-emerald-600">
                {todayCount} scheduled today
              </p>
            </div>

            <div
              onClick={() => onSelectTab?.("rates_windows")}
              className="col-span-2 sm:col-span-1 rounded-2xl border border-slate-200/80 bg-white/90 backdrop-blur-md p-3.5 shadow-xs text-center space-y-1 min-w-[110px] cursor-pointer hover:border-amber-300 hover:shadow-sm transition-all"
            >
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

      {/* Brahma Pause Modal */}
      <Modal
        open={openPauseModal}
        onClose={() => setOpenPauseModal(false)}
        title="Activate Brahma Pause (জরুরি বৈদিক বিরতি)"
        description="Temporarily pause consultations due to personal emergencies or spiritual rites. Your live call availability will go offline, and booked seekers will be automatically offered complimentary 1-click rescue choices."
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <Button variant="secondary" onClick={() => setOpenPauseModal(false)}>
              Cancel
            </Button>
            <Button
              loading={activatePause.isPending}
              onClick={() => activatePause.mutate()}
              className="bg-purple-700 hover:bg-purple-800 text-white font-bold"
            >
              Activate Brahma Pause
            </Button>
          </div>
        }
      >
        <div className="space-y-4 py-2 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-slate-800 mb-1.5">
              Pause Duration *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { hours: 3, label: "3 Hours", sub: "Short emergency" },
                { hours: 6, label: "6 Hours", sub: "Half day" },
                { hours: 12, label: "12 Hours", sub: "Full day" },
                { hours: 24, label: "24 Hours", sub: "Full day & night" },
              ].map((opt) => (
                <button
                  key={opt.hours}
                  type="button"
                  onClick={() => setPauseDuration(opt.hours)}
                  className={cn(
                    "rounded-xl p-2.5 text-center transition-all border cursor-pointer",
                    pauseDuration === opt.hours
                      ? "bg-purple-50 border-purple-400 ring-2 ring-purple-500/20 text-purple-950 font-bold"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                  )}
                >
                  <p className="text-xs font-bold">{opt.label}</p>
                  <p className="text-[9px] text-slate-500">{opt.sub}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-800 mb-1">
              Reason / Message for Seekers (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Unforeseen personal emergency / Sacred temple rites"
              value={pauseReason}
              onChange={(e) => setPauseReason(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-purple-500 focus:outline-none"
            />
          </div>

          <Alert tone="info">
            <strong>Seeker Protection:</strong> Any seeker with an appointment during your pause will receive a dignified email offering either a 1-click free reschedule to tomorrow or an instant 100% refund.
          </Alert>
        </div>
      </Modal>
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
  const [bufferMins, setBufferMins] = React.useState<number>(10);
  const [followUpEnabled, setFollowUpEnabled] = React.useState<boolean>(true);
  const [followUpDays, setFollowUpDays] = React.useState<number>(7);
  const [followUpMaxQuestions, setFollowUpMaxQuestions] = React.useState<number>(3);
  const [tatkalEnabled, setTatkalEnabled] = React.useState<boolean>(true);
  const [tatkalMultiplier, setTatkalMultiplier] = React.useState<number>(1.5);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    if (card && !ready) {
      setForm({ rupees: String(card.price_paise / 100), block: String(card.block_minutes) });
      setCancelWindow(card.cancellation_window_minutes ?? 30);
      setBufferMins(card.buffer_minutes ?? 10);
      setFollowUpEnabled(card.follow_up_enabled ?? true);
      setFollowUpDays(card.follow_up_window_days ?? 7);
      setFollowUpMaxQuestions(card.follow_up_max_messages ?? 3);
      setTatkalEnabled(card.tatkal_enabled ?? true);
      setTatkalMultiplier(card.tatkal_default_multiplier ?? 1.5);
      setReady(true);
    }
  }, [card, ready]);

  const save = useMutation({
    mutationFn: (body: {
      enabled?: boolean;
      price_paise?: number;
      block_minutes?: number;
      cancellation_window_minutes?: number;
      buffer_minutes?: number;
      follow_up_enabled?: boolean;
      follow_up_window_days?: number;
      follow_up_max_messages?: number;
      tatkal_enabled?: boolean;
      tatkal_default_multiplier?: number;
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

      {/* Inter-Session Meditation & Energy Buffer */}
      <div className="space-y-2.5 pt-2 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-purple-600" />
            <span>Inter-Session Meditation Buffer (শক্তি পুনরুদ্ধার বাফার)</span>
          </label>
          <span className="text-[11px] font-bold text-purple-800 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-full">
            {bufferMins} minutes
          </span>
        </div>
        <p className="text-[11px] text-slate-500">
          Automatic quiet interval after every consultation for spiritual cleansing and breathing room before your next seeker.
        </p>
        <div className="flex flex-wrap gap-2">
          {[0, 5, 10, 15, 20].map((mins) => (
            <button
              key={mins}
              type="button"
              onClick={() => setBufferMins(mins)}
              className={cn(
                "rounded-xl px-3 py-1.5 text-xs font-bold transition-all border cursor-pointer",
                bufferMins === mins
                  ? "bg-purple-900 text-white border-purple-900 shadow-xs"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              )}
            >
              {mins === 0 ? "No Buffer (0m)" : `${mins} Mins`} {mins === 10 && "(Recommended)"}
            </button>
          ))}
        </div>
      </div>

      {/* Complimentary Remedy Follow-up Window Authority */}
      <div className="space-y-3 rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-500/5 via-orange-500/5 to-amber-500/10 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-amber-600" />
            <span className="text-xs font-bold text-slate-800">
              Complimentary Remedy Follow-up Pass (রেমিডি ফলো-আপ উইন্ডো)
            </span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={followUpEnabled}
              onChange={(e) => setFollowUpEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
          </label>
        </div>

        <p className="text-[11px] text-slate-600 leading-relaxed">
          Allow seekers to ask quick clarification questions about your sacred prescription (gemstone finger, mantra japa timing, ritual guidance) for free within the pass window.
        </p>

        {followUpEnabled && (
          <div className="space-y-3 pt-1 border-t border-amber-200/50">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1.5">
                Pass Validity Window (কত দিনের মধ্যে প্রশ্ন করতে পারবে)
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[3, 5, 7, 10, 14].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setFollowUpDays(days)}
                    className={cn(
                      "rounded-xl px-3 py-1.5 text-xs font-bold transition-all border cursor-pointer",
                      followUpDays === days
                        ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    )}
                  >
                    {days} Days {days === 7 && "(Standard)"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1.5">
                Max Complimentary Questions (সর্বোচ্চ কয়টি প্রশ্ন করতে পারবে)
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[1, 2, 3, 5].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setFollowUpMaxQuestions(count)}
                    className={cn(
                      "rounded-xl px-3 py-1.5 text-xs font-bold transition-all border cursor-pointer",
                      followUpMaxQuestions === count
                        ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    )}
                  >
                    {count} {count === 1 ? "Question" : "Questions"} {count === 3 && "(Recommended)"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Emergency Tatkal Multiplier Defaults */}
      <div className="space-y-3 rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-500/5 via-yellow-500/5 to-amber-500/10 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="size-4 text-amber-600 fill-amber-500/20" />
            <span className="text-xs font-bold text-slate-800">
              VIP Tatkal Consultation Multiplier (জরুরি স্লট রেট)
            </span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={tatkalEnabled}
              onChange={(e) => setTatkalEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
          </label>
        </div>

        <p className="text-[11px] text-slate-600 leading-relaxed">
          Default multiplier charged when opening instant emergency Tatkal windows outside or alongside normal hours.
        </p>

        {tatkalEnabled && (
          <div className="space-y-1.5 pt-1 border-t border-amber-200/50">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">
              Default Emergency Multiplier (ডিফল্ট প্রিমিয়াম গুণক)
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[1.25, 1.5, 1.75, 2.0, 2.5, 3.0].map((mult) => (
                <button
                  key={mult}
                  type="button"
                  onClick={() => setTatkalMultiplier(mult)}
                  className={cn(
                    "rounded-xl px-3 py-1.5 text-xs font-bold transition-all border cursor-pointer",
                    tatkalMultiplier === mult
                      ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  )}
                >
                  {mult}x {mult === 1.5 && "(Standard Tatkal)"} {mult === 2.0 && "(Double)"}
                </button>
              ))}
            </div>
            {price > 0 && (
              <p className="text-[11px] font-semibold text-amber-800 pt-1">
                ⚡ Tatkal Session: ~₹{Math.round(price * tatkalMultiplier)} per {block} mins
              </p>
            )}
          </div>
        )}
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
            buffer_minutes: bufferMins,
            follow_up_enabled: followUpEnabled,
            follow_up_window_days: followUpDays,
            follow_up_max_messages: followUpMaxQuestions,
            tatkal_enabled: tatkalEnabled,
            tatkal_default_multiplier: tatkalMultiplier,
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
function Schedule({
  initialDisplayMode = "calendar",
}: {
  initialDisplayMode?: "calendar" | "list" | "blacklist";
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [displayMode, setDisplayMode] = React.useState<"calendar" | "list" | "blacklist">(initialDisplayMode);
  const [tab, setTab] = React.useState<ScheduleTab>("upcoming");
  const [cancelTargetId, setCancelTargetId] = React.useState<string | null>(null);
  const [enteringChamberId, setEnteringChamberId] = React.useState<string | null>(null);

  const handleEnterChamber = async (appointmentId: string) => {
    setEnteringChamberId(appointmentId);
    try {
      const res = await appointmentApi.joinChamber(appointmentId);
      const callId = (res as any)?.call_id || (res as any)?.data?.call_id;
      if (callId) {
        router.push(`/call/${callId}`);
      } else {
        toast.error("Could not obtain chamber credentials. Please try again.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to enter consultation chamber.");
    } finally {
      setEnteringChamberId(null);
    }
  };

  // Availability windows query for Google Calendar integration
  const { data: windows } = useQuery({
    queryKey: WINDOWS_KEY,
    queryFn: () => appointmentApi.windows(),
  });

  // Advanced Dossier & Prescription state
  const [dossierAppointment, setDossierAppointment] = React.useState<Appointment | null>(null);
  const [preflightData, setPreflightData] = React.useState<Record<string, any> | null>(null);
  const [isLoadingPreflight, setIsLoadingPreflight] = React.useState(false);

  const [privateNotesText, setPrivateNotesText] = React.useState<string>("");
  const [savingPrivateNotes, setSavingPrivateNotes] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (dossierAppointment) {
      setPrivateNotesText(dossierAppointment.astrologer_private_notes || "");
      if (dossierAppointment.preflight_dossier) {
        setPreflightData(dossierAppointment.preflight_dossier);
      } else {
        setIsLoadingPreflight(true);
        appointmentApi
          .getPreflight(dossierAppointment.id)
          .then((res) => {
            setPreflightData(res.data);
          })
          .catch(() => {})
          .finally(() => setIsLoadingPreflight(false));
      }
    } else {
      setPreflightData(null);
      setPrivateNotesText("");
    }
  }, [dossierAppointment]);

  const handleSavePrivateNotes = async () => {
    if (!dossierAppointment) return;
    setSavingPrivateNotes(true);
    try {
      const updated = await appointmentApi.updatePrivateNotes(
        dossierAppointment.id,
        privateNotesText
      );
      setDossierAppointment(updated);
      toast.success("Confidential vault notes saved securely!");
      void queryClient.invalidateQueries({ queryKey: SCHEDULE_KEY });
    } catch (err: any) {
      toast.error(err?.message || "Failed to save private vault notes.");
    } finally {
      setSavingPrivateNotes(false);
    }
  };

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

  // Courtesy Reschedule state & mutation (Option B)
  const [rescheduleAppointment, setRescheduleAppointment] = React.useState<Appointment | null>(null);
  const [rescheduleForm, setRescheduleForm] = React.useState<{ newStartsAt: string; reason: string }>({
    newStartsAt: "",
    reason: "",
  });

  const rescheduleMutation = useMutation({
    mutationFn: () => {
      if (!rescheduleAppointment || !rescheduleForm.newStartsAt) {
        throw new Error("Please select a new time slot.");
      }
      return appointmentApi.reschedule(
        rescheduleAppointment.id,
        new Date(rescheduleForm.newStartsAt).toISOString(),
        rescheduleForm.reason.trim() || undefined,
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SCHEDULE_KEY });
      setRescheduleAppointment(null);
      setDossierAppointment(null);
      toast.success("Appointment courtesy rescheduled! Client notified via email & calendar.");
    },
    onError: (e: any) => toast.error(e?.message || "Failed to reschedule appointment."),
  });

  // Client No-Show state & mutation (10-15m wait rule)
  const [noShowAppointment, setNoShowAppointment] = React.useState<Appointment | null>(null);
  const [noShowReason, setNoShowReason] = React.useState("");

  const noShowMutation = useMutation({
    mutationFn: () => {
      if (!noShowAppointment) throw new Error("No appointment selected.");
      return appointmentApi.markNoShow(
        noShowAppointment.id,
        noShowReason.trim() || undefined,
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SCHEDULE_KEY });
      setNoShowAppointment(null);
      setDossierAppointment(null);
      toast.success("Appointment closed as Client No-Show. Session balance captured as compensation.");
    },
    onError: (e: any) => toast.error(e?.message || "Failed to mark no-show."),
  });

  // Blacklist query
  const { data: blacklist, isLoading: blacklistLoading } = useQuery({
    queryKey: BLACKLIST_KEY,
    queryFn: () => appointmentApi.myBlacklist(),
    enabled: displayMode === "blacklist",
  });

  // Red-Flag & Abuse Report state & mutation
  const [redFlagAppointment, setRedFlagAppointment] = React.useState<Appointment | null>(null);
  const [redFlagReason, setRedFlagReason] = React.useState("Abusive language / Verbal harassment");
  const [redFlagNotes, setRedFlagNotes] = React.useState("");
  const [redFlagBlacklist, setRedFlagBlacklist] = React.useState(true);

  const redFlagMutation = useMutation({
    mutationFn: () => {
      if (!redFlagAppointment) throw new Error("No appointment selected.");
      return appointmentApi.redFlag(redFlagAppointment.id, {
        reason: redFlagReason,
        notes: redFlagNotes.trim() || undefined,
        blacklist_client: redFlagBlacklist,
        terminate_call: true,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SCHEDULE_KEY });
      void queryClient.invalidateQueries({ queryKey: BLACKLIST_KEY });
      setRedFlagAppointment(null);
      setDossierAppointment(null);
      toast.success("Incident logged. Client red-flagged and session compensation captured.");
    },
    onError: (e: any) => toast.error(e?.message || "Failed to submit red-flag report."),
  });

  // Unblock client state & mutation
  const [unblockTarget, setUnblockTarget] = React.useState<BlacklistedClient | null>(null);
  const unblockMutation = useMutation({
    mutationFn: (userId: string) => appointmentApi.unblockClient(userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: BLACKLIST_KEY });
      setUnblockTarget(null);
      toast.success("Client unblocked. They can now book appointments with you.");
    },
    onError: (e: any) => toast.error(e?.message || "Failed to unblock client."),
  });

  // Birth Time Rectification (BTR) state & mutation
  const [btrAppointment, setBtrAppointment] = React.useState<Appointment | null>(null);
  const [btrNote, setBtrNote] = React.useState("");
  const btrMutation = useMutation({
    mutationFn: () => {
      if (!btrAppointment) throw new Error("No appointment selected.");
      return appointmentApi.requestBtr(btrAppointment.id, btrNote.trim() || undefined);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SCHEDULE_KEY });
      setBtrAppointment(null);
      if (dossierAppointment && btrAppointment && dossierAppointment.id === btrAppointment.id) {
        setDossierAppointment({
          ...dossierAppointment,
          btr_requested: true,
          btr_request_note: btrNote.trim() || null,
          btr_fulfilled: false,
        });
      }
      toast.success("Birth Time Rectification request sent to seeker via email & in-app prompt.");
    },
    onError: (e: any) => toast.error(e?.message || "Failed to request BTR."),
  });

  // Follow-up Pass state & mutations
  const [issuePassAppointment, setIssuePassAppointment] = React.useState<Appointment | null>(null);
  const [passWindowDays, setPassWindowDays] = React.useState<number>(7);
  const [passMaxQuestions, setPassMaxQuestions] = React.useState<number>(3);
  const [passNotes, setPassNotes] = React.useState<string>("");
  const [followUpReplyText, setFollowUpReplyText] = React.useState<string>("");
  const [sendingFollowUpReply, setSendingFollowUpReply] = React.useState<boolean>(false);

  const issuePassMutation = useMutation({
    mutationFn: () => {
      if (!issuePassAppointment) throw new Error("No appointment selected.");
      return appointmentApi.issueFollowUpPass(issuePassAppointment.id, {
        window_days: passWindowDays,
        max_messages: passMaxQuestions,
        notes: passNotes.trim() || undefined,
      });
    },
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({ queryKey: SCHEDULE_KEY });
      setIssuePassAppointment(null);
      if (dossierAppointment && updated && dossierAppointment.id === updated.id) {
        setDossierAppointment(updated);
      }
      toast.success(`Complimentary ${passWindowDays}-day remedy follow-up pass issued successfully!`);
    },
    onError: (e: any) => toast.error(e?.message || "Failed to issue follow-up pass."),
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
    <div className="space-y-6">
      {/* Top View Selector Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-3xl border border-slate-200/90 bg-white shadow-xs">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setDisplayMode("calendar")}
            className={cn(
              "inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-extrabold transition-all cursor-pointer border",
              displayMode === "calendar"
                ? "bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/10"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            )}
          >
            <Calendar className="size-4 text-sky-400" />
            <span>Google Calendar Schedule</span>
          </button>

          <button
            type="button"
            onClick={() => setDisplayMode("list")}
            className={cn(
              "inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-extrabold transition-all cursor-pointer border",
              displayMode === "list"
                ? "bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/10"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            )}
          >
            <FileText className="size-4 text-amber-400" />
            <span>Bookings Ledger ({allBookings.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setDisplayMode("blacklist")}
            className={cn(
              "inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-extrabold transition-all cursor-pointer border",
              displayMode === "blacklist"
                ? "bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/10"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            )}
          >
            <ShieldAlert className="size-4 text-rose-500" />
            <span>Blacklist Shield ({blacklist?.length ?? 0})</span>
          </button>
        </div>

        <p className="text-xs text-slate-500 font-medium hidden sm:block">
          {displayMode === "calendar"
            ? "📅 Interactive Google Calendar view with live time indicator and 1-click slot activation."
            : displayMode === "blacklist"
            ? "🛡️ Screening & Abuse Shield: Manage blocked clients and review safety incident flags."
            : "📋 Full chronological table of client bookings, prescriptions, and cancellation status."}
        </p>
      </div>

      {/* 1. GOOGLE CALENDAR SUITE (Default Hero Experience) */}
      {displayMode === "calendar" && (
        <GoogleCalendarSuite
          bookings={allBookings}
          windows={windows ?? []}
          onOpenSession={(a) => setDossierAppointment(a)}
          onOpenPrescription={(a) => openPrescriptionModal(a)}
          onCancelAppointment={(id) => setCancelTargetId(id)}
          onCompleteAppointment={(id) => complete.mutate(id)}
          onAddWindow={async (fromIso, toIso) => {
            await appointmentApi.addWindow(fromIso, toIso);
            void queryClient.invalidateQueries({ queryKey: WINDOWS_KEY });
            void queryClient.invalidateQueries({ queryKey: CARD_KEY });
          }}
          onRemoveWindow={async (id) => {
            await appointmentApi.removeWindow(id);
            void queryClient.invalidateQueries({ queryKey: WINDOWS_KEY });
            void queryClient.invalidateQueries({ queryKey: CARD_KEY });
          }}
        />
      )}

      {/* 2. CLASSIC LEDGER & TABLE LIST VIEW */}
      {displayMode === "list" && (
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
            const isLiveWindow = a.status === "booked" && now >= startsMs - 10 * 60_000 && now <= endsMs + 15 * 60_000;
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
                      <button
                        type="button"
                        disabled={enteringChamberId === a.id}
                        onClick={() => handleEnterChamber(a.id)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-sm animate-pulse cursor-pointer disabled:opacity-50"
                      >
                        {enteringChamberId === a.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Video className="size-3.5" />
                        )}
                        <span>{enteringChamberId === a.id ? "Entering..." : "Enter Chamber"}</span>
                      </button>
                    )}

                    {/* Complete Session Action (Capture Escrow) - Only eligible after session start time */}
                    {a.status === "booked" && now >= startsMs && (
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
    </div>
      )}

      {/* 3. BLACKLIST SHIELD (SCREENING & ABUSE SHIELD) */}
      {displayMode === "blacklist" && (
        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-[0_16px_40px_rgba(20,25,45,0.05)] space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="flex size-9 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600">
                  <ShieldAlert className="size-5 stroke-[2.2]" />
                </div>
                <h2 className="font-display text-xl font-bold text-slate-900">
                  Client Screening & Abuse Shield
                </h2>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Clients blacklisted from booking your profile. Blocked users cannot schedule sessions with you.
              </p>
            </div>

            <Badge tone="neutral" className="px-3 py-1 text-xs font-bold self-start sm:self-auto">
              {blacklist?.length ?? 0} Blocked Clients
            </Badge>
          </div>

          {blacklistLoading ? (
            <LoadingBlock label="Loading blacklist shield..." />
          ) : !blacklist?.length ? (
            <EmptyState
              icon={ShieldCheck}
              title="No Blacklisted Clients"
              description="Your consultation chamber is secure and clean. No clients have been red-flagged or blocked."
            />
          ) : (
            <div className="space-y-3">
              {blacklist.map((client) => (
                <div
                  key={client.user_id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200/90 bg-slate-50/50 p-4 transition-all hover:bg-white hover:border-slate-300"
                >
                  <div className="flex items-center gap-3.5">
                    <Avatar src={client.avatar_url ?? undefined} name={client.name} size="md" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{client.name}</span>
                        <Badge tone="red" className="text-[10px]">
                          Blacklisted
                        </Badge>
                        {client.total_reports > 1 && (
                          <Badge tone="gold" className="text-[10px]">
                            {client.total_reports} Incidents
                          </Badge>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500 flex flex-wrap items-center gap-2">
                        {client.email_masked && <span>{client.email_masked}</span>}
                        {client.phone_masked && <span>• {client.phone_masked}</span>}
                        {client.blacklisted_at && (
                          <span>• Flagged on {new Date(client.blacklisted_at).toLocaleDateString()}</span>
                        )}
                      </p>
                      {client.last_reason && (
                        <p className="mt-1.5 text-xs text-rose-700 font-medium">
                          <strong>Reason:</strong> {client.last_reason}
                        </p>
                      )}
                      {client.notes && (
                        <p className="text-[11px] text-slate-500 italic mt-0.5">
                          "{client.notes}"
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setUnblockTarget(client)}
                      className="text-xs font-bold border-slate-200 hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50"
                    >
                      <UserX className="size-3.5 mr-1" />
                      Unblock Client
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Client Astrological Dossier Modal */}
      <Modal
        open={Boolean(dossierAppointment)}
        onClose={() => setDossierAppointment(null)}
        title="Client Astrological Dossier & AI Pre-Flight"
        description="Comprehensive pre-consultation details, cosmic resonance index, and automated AI astrological briefing."
        footer={
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
            <div className="flex items-center gap-2 flex-wrap">
              {dossierAppointment?.status === "completed" && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    window.open(appointmentApi.getCertificateHtmlUrl(dossierAppointment.id), "_blank");
                  }}
                  className="border-amber-500/30 text-amber-600 hover:bg-amber-50 font-bold text-xs"
                >
                  <FileText className="size-3.5 mr-1.5" />
                  View Divya Certificate
                </Button>
              )}

              {dossierAppointment?.status === "booked" && (
                <>
                  {(() => {
                    const startMs = new Date(dossierAppointment.starts_at).getTime();
                    const endMs = new Date(dossierAppointment.ends_at).getTime();
                    const nowMs = Date.now();
                    const isLiveWindow = nowMs >= startMs - 10 * 60_000 && nowMs <= endMs + 15 * 60_000;
                    if (!isLiveWindow) return null;
                    const isEntering = enteringChamberId === dossierAppointment.id;
                    return (
                      <Button
                        size="sm"
                        disabled={isEntering}
                        onClick={() => handleEnterChamber(dossierAppointment.id)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md"
                      >
                        {isEntering ? (
                          <Loader2 className="size-3.5 mr-1 animate-spin" />
                        ) : (
                          <Video className="size-3.5 mr-1" />
                        )}
                        {isEntering ? "Entering..." : "Enter Live Chamber"}
                      </Button>
                    );
                  })()}

                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={Boolean(dossierAppointment.rescheduled_count && dossierAppointment.rescheduled_count >= 1)}
                    onClick={() => {
                      const d = new Date(dossierAppointment.starts_at);
                      d.setDate(d.getDate() + 1);
                      setRescheduleForm({
                        newStartsAt: toLocalInput(d),
                        reason: "",
                      });
                      setRescheduleAppointment(dossierAppointment);
                    }}
                    className="border-amber-500/30 text-amber-800 hover:bg-amber-50 text-xs font-bold"
                  >
                    <CalendarDays className="size-3.5 mr-1 text-amber-600" />
                    {dossierAppointment.rescheduled_count && dossierAppointment.rescheduled_count >= 1
                      ? "Rescheduled (1/1 Used)"
                      : "Courtesy Reschedule (১-বার ফ্রি)"}
                  </Button>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      const startMs = new Date(dossierAppointment.starts_at).getTime();
                      const elapsedMins = (Date.now() - startMs) / 60_000;
                      if (elapsedMins < 10) {
                        toast.error(
                          `You must wait at least 10 minutes into the scheduled consultation before marking a client no-show. Session started at ${new Date(dossierAppointment.starts_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`
                        );
                        return;
                      }
                      setNoShowReason("");
                      setNoShowAppointment(dossierAppointment);
                    }}
                    className="border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-bold"
                  >
                    <AlertCircle className="size-3.5 mr-1 text-rose-600" />
                    Mark No-Show
                  </Button>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setBtrNote(dossierAppointment.btr_request_note || "Lagna cusp / Navamsha D9 precision check. Please verify exact hospital birth time.");
                      setBtrAppointment(dossierAppointment);
                    }}
                    className={cn(
                      "text-xs font-bold",
                      dossierAppointment.btr_fulfilled
                        ? "border-emerald-300 text-emerald-800 bg-emerald-50/50"
                        : dossierAppointment.btr_requested
                        ? "border-sky-300 text-sky-800 bg-sky-50/50"
                        : "border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                    )}
                  >
                    <Clock className="size-3.5 mr-1 text-indigo-600" />
                    {dossierAppointment.btr_fulfilled
                      ? "BTR Rectified ✓"
                      : dossierAppointment.btr_requested
                      ? "BTR Requested ⏳"
                      : "Request BTR"}
                  </Button>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setRedFlagReason("Abusive language / Verbal harassment");
                      setRedFlagNotes("");
                      setRedFlagBlacklist(true);
                      setRedFlagAppointment(dossierAppointment);
                    }}
                    className="border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-bold"
                  >
                    <Flag className="size-3.5 mr-1 text-rose-600" />
                    Red-Flag / Shield
                  </Button>
                </>
              )}
            </div>

            <Button variant="secondary" onClick={() => setDossierAppointment(null)}>
              Close Dossier
            </Button>
          </div>
        }
      >
        {dossierAppointment && (
          <div className="space-y-4 py-2 text-xs">
            {/* Red-Flag Misconduct Notice if marked */}
            {dossierAppointment.abuse_flagged && (
              <div className="rounded-2xl border border-rose-300 bg-rose-50/80 p-3.5 text-rose-950 text-xs flex items-center gap-2.5">
                <ShieldAlert className="size-4 text-rose-600 shrink-0" />
                <div>
                  <span className="font-bold block text-rose-950">
                    Red-Flagged for Policy Misconduct ({dossierAppointment.abuse_reason})
                  </span>
                  <span className="text-[11px] text-rose-800">
                    Session was terminated due to code-of-conduct violation and logged with Trust & Safety. Escrow consultation fee was credited to your earnings.
                  </span>
                </div>
              </div>
            )}

            {/* Birth Time Rectification (BTR) Notice */}
            {dossierAppointment.btr_requested && (
              <div
                className={cn(
                  "rounded-2xl border p-3.5 text-xs flex items-center gap-2.5",
                  dossierAppointment.btr_fulfilled
                    ? "border-emerald-300 bg-emerald-50 text-emerald-950"
                    : "border-sky-300 bg-sky-50 text-sky-950"
                )}
              >
                <Clock
                  className={cn(
                    "size-4 shrink-0",
                    dossierAppointment.btr_fulfilled ? "text-emerald-600" : "text-sky-600"
                  )}
                />
                <div>
                  <span className="font-bold block">
                    {dossierAppointment.btr_fulfilled
                      ? "Birth Time Rectified by Seeker ✓"
                      : "Birth Time Rectification (BTR) Requested"}
                  </span>
                  <span className="text-[11px] opacity-80">
                    {dossierAppointment.btr_fulfilled
                      ? `The seeker updated their exact birth parameters on ${dossierAppointment.btr_updated_at ? new Date(dossierAppointment.btr_updated_at).toLocaleString() : "recently"}. Pre-flight calculations refreshed.`
                      : `Awaiting seeker confirmation. Request note: "${dossierAppointment.btr_request_note || "Please confirm exact hospital birth time."}"`}
                  </span>
                </div>
              </div>
            )}

            {/* Client No-Show Notice if marked */}
            {dossierAppointment.is_no_show && (
              <div className="rounded-2xl border border-rose-300 bg-rose-50/80 p-3.5 text-rose-900 text-xs flex items-center gap-2.5">
                <AlertCircle className="size-4 text-rose-600 shrink-0" />
                <div>
                  <span className="font-bold block text-rose-950">Client No-Show / Missed Consultation</span>
                  <span className="text-[11px] text-rose-700">
                    The astrologer waited for {dossierAppointment.no_show_wait_minutes || 15} minutes in the chamber.
                    The session was closed and the escrow fee was settled as compensation.
                  </span>
                </div>
              </div>
            )}

            {/* Courtesy Reschedule Notice if applied */}
            {Boolean(dossierAppointment.rescheduled_count && dossierAppointment.rescheduled_count > 0) && (
              <div className="rounded-2xl border border-amber-300 bg-amber-50/70 p-3 text-amber-950 text-xs flex items-center gap-2.5">
                <CalendarDays className="size-4 text-amber-600 shrink-0" />
                <div>
                  <span className="font-bold block">Courtesy Reschedule Applied (1/1 Used)</span>
                  <span className="text-[11px] text-amber-800">
                    Moved to current slot by the astrologer without charging extra fees.
                    {dossierAppointment.reschedule_reason ? ` Note: "${dossierAppointment.reschedule_reason}"` : ""}
                  </span>
                </div>
              </div>
            )}

            {/* Client Profile Header with Cosmic Synergy Score */}
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3.5 border border-slate-200">
              <div className="flex items-center gap-3 min-w-0">
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

              <div className="text-right shrink-0">
                <span className="inline-flex items-center gap-1 rounded-full bg-linear-to-r from-amber-500/10 to-orange-500/15 border border-amber-500/30 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                  <Sparkles className="size-3 text-amber-500" />
                  <span>{dossierAppointment.cosmic_synergy_score || 88}% Synergy</span>
                </span>
              </div>
            </div>

            {/* AI Astrological Pre-Flight Intelligence Dossier */}
            <div className="rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/70 via-indigo-50/30 to-purple-50/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-indigo-600" />
                  <span>🔮 AI Astrological Pre-Flight Intelligence (T-15m)</span>
                </p>
                {isLoadingPreflight && (
                  <span className="text-[10px] text-indigo-500 animate-pulse">Synthesizing Kundli...</span>
                )}
              </div>

              {preflightData ? (
                <div className="space-y-2.5 text-[11px]">
                  {/* Planetary Gochars */}
                  <div className="rounded-xl bg-white/90 p-2.5 border border-indigo-100 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-indigo-700 block">Planetary Gochar Transits</span>
                    <ul className="list-disc list-inside space-y-0.5 text-slate-700 text-[11px]">
                      <li>{preflightData.planetary_transits?.saturn_gochar || "Saturn in active transit restructuring"}</li>
                      <li>{preflightData.planetary_transits?.jupiter_gochar || "Jupiter in auspicious trine aspect"}</li>
                      <li>{preflightData.planetary_transits?.rahu_ketu_axis || "Karmic nodal alignment on pivotal axis"}</li>
                    </ul>
                  </div>

                  {/* AI Strategic Directives */}
                  <div className="rounded-xl bg-white/90 p-2.5 border border-indigo-100 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-indigo-700 block">Consultation Guidance Synthesis</span>
                    <ul className="list-disc list-inside space-y-1 text-slate-700 text-[11px]">
                      {(preflightData.ai_executive_summary || []).map((summary: string, idx: number) => (
                        <li key={idx} className="leading-relaxed">{summary}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl bg-white/80 p-3 text-slate-500 italic text-[11px]">
                  AI Astrological pre-flight briefing is generating automatically based on client birth chart...
                </div>
              )}
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
                <span>Birth Chart Coordinates</span>
              </p>

              {dossierAppointment.birth_details ? (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                    <span className="text-[10px] text-slate-400 block">Date of Birth</span>
                    <span className="font-bold text-slate-800">
                      {dossierAppointment.birth_details.date_of_birth || dossierAppointment.birth_details.dob || "Not specified"}
                    </span>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                    <span className="text-[10px] text-slate-400 block">Time of Birth</span>
                    <span className="font-bold text-slate-800">
                      {dossierAppointment.birth_details.time_of_birth || dossierAppointment.birth_details.tob || "Not specified"}
                    </span>
                  </div>
                  <div className="col-span-2 rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                    <span className="text-[10px] text-slate-400 block">Place of Birth</span>
                    <span className="font-bold text-slate-800">
                      {dossierAppointment.birth_details.place_of_birth || dossierAppointment.birth_details.pob || "Not specified"}
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

            {/* Complimentary Remedy Follow-up Pass Section */}
            <div className="rounded-2xl border border-amber-300/80 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-amber-500/15 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-amber-700" />
                  <span className="font-bold text-slate-900 text-xs">
                    Remedy Clarification Pass (সৌজন্যমূলক ফলো-আপ উইন্ডো)
                  </span>
                </div>
                {dossierAppointment.follow_up_pass_enabled ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Active · {dossierAppointment.follow_up_messages_used || 0}/{dossierAppointment.follow_up_max_messages || 3} Questions Used
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                    Not Active
                  </span>
                )}
              </div>

              {dossierAppointment.follow_up_pass_enabled && dossierAppointment.follow_up_expires_at && (
                <p className="text-[11px] text-amber-900 font-medium flex items-center justify-between">
                  <span>Validity: {dossierAppointment.follow_up_window_days || 7} Days</span>
                  <span>Expires: {new Date(dossierAppointment.follow_up_expires_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                </p>
              )}

              {/* Follow-up Messages Thread */}
              {dossierAppointment.follow_up_thread && dossierAppointment.follow_up_thread.length > 0 ? (
                <div className="space-y-2 rounded-xl bg-white p-3 border border-amber-200/80 max-h-56 overflow-y-auto">
                  {dossierAppointment.follow_up_thread.map((msg: any) => {
                    const isAstro = msg.sender_role === "astrologer";
                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          "rounded-xl p-2.5 text-xs max-w-[85%]",
                          isAstro
                            ? "ml-auto bg-amber-50 border border-amber-200 text-amber-950"
                            : "mr-auto bg-slate-100 text-slate-900"
                        )}
                      >
                        <div className="flex items-center justify-between gap-2 text-[10px] font-bold text-slate-500 mb-1">
                          <span>{msg.sender_name} ({isAstro ? "Panditji" : "Client"})</span>
                          <span>{new Date(msg.sent_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                        <p className="whitespace-pre-line leading-relaxed">{msg.text}</p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 italic bg-white/60 p-2.5 rounded-xl border border-amber-200/60">
                  {dossierAppointment.follow_up_pass_enabled
                    ? "Seeker has not asked any remedy questions yet."
                    : "No remedy clarification pass has been issued for this seeker."}
                </p>
              )}

              {/* Action Buttons & Reply Box */}
              <div className="flex flex-col gap-2 pt-1">
                {dossierAppointment.follow_up_pass_enabled && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Write guidance / answer to seeker..."
                      value={followUpReplyText}
                      onChange={(e) => setFollowUpReplyText(e.target.value)}
                      className="flex-1 rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                    <Button
                      size="sm"
                      disabled={sendingFollowUpReply || !followUpReplyText.trim()}
                      onClick={async () => {
                        setSendingFollowUpReply(true);
                        try {
                          const updated = await appointmentApi.sendFollowUpMessage(
                            dossierAppointment.id,
                            followUpReplyText.trim()
                          );
                          setDossierAppointment(updated);
                          setFollowUpReplyText("");
                          toast.success("Guidance reply sent to seeker!");
                          void queryClient.invalidateQueries({ queryKey: SCHEDULE_KEY });
                        } catch (err: any) {
                          toast.error(err?.message || "Failed to send follow-up reply.");
                        } finally {
                          setSendingFollowUpReply(false);
                        }
                      }}
                      className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
                    >
                      Send Answer
                    </Button>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setPassWindowDays(dossierAppointment.follow_up_window_days || 7);
                      setPassMaxQuestions(dossierAppointment.follow_up_max_messages || 3);
                      setPassNotes(dossierAppointment.follow_up_notes || "");
                      setIssuePassAppointment(dossierAppointment);
                    }}
                    className="text-amber-800 border-amber-300 hover:bg-amber-100 text-xs font-semibold"
                  >
                    <Sparkles className="size-3.5 mr-1 text-amber-600" />
                    {dossierAppointment.follow_up_pass_enabled ? "Adjust / Extend Pass" : "Issue Follow-up Pass"}
                  </Button>
                </div>
              </div>
            </div>

            {/* 🔒 Private Astrological Dossier / Vault (গোপন জ্যোতিষী নোটস) */}
            <div className="rounded-2xl border-2 border-amber-300/80 bg-gradient-to-br from-amber-50/70 via-orange-50/40 to-slate-50 p-4 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="size-7 rounded-lg bg-amber-500/20 text-amber-700 flex items-center justify-center font-bold">
                    <Lock className="size-4 text-amber-700" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <span>Private Astrological Vault (গোপন জ্যোতিষী নোটস)</span>
                      <span className="text-[10px] font-semibold text-amber-700 bg-amber-100/90 border border-amber-300 px-2 py-0.5 rounded-full">
                        100% Confidential
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Strictly invisible to seeker. Document psychological observations, sensitive doshas, or hidden astrological insights.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <textarea
                  rows={4}
                  maxLength={5000}
                  placeholder="গোপন পর্যবেক্ষণ লিখে রাখুন: যেমন মানসিক অস্থিরতা, রাহু-চন্দ্রের গোচর প্রতিক্রিয়া, পারিবারিক সংবেদনশীল তথ্য বা পরবর্তী ভিজিটের জন্য গোপন প্রস্তুতি..."
                  value={privateNotesText}
                  onChange={(e) => setPrivateNotesText(e.target.value)}
                  className="w-full rounded-xl border border-amber-200/90 bg-white p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 leading-relaxed font-sans shadow-inner"
                />
                <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                  <span>
                    {dossierAppointment.astrologer_private_notes_updated_at ? (
                      <span className="text-emerald-700 font-medium">
                        Last saved: {new Date(dossierAppointment.astrologer_private_notes_updated_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                      </span>
                    ) : (
                      <span>No private notes saved yet</span>
                    )}
                  </span>
                  <span>{privateNotesText.length} / 5000 chars</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  size="sm"
                  disabled={savingPrivateNotes || privateNotesText === (dossierAppointment.astrologer_private_notes || "")}
                  onClick={handleSavePrivateNotes}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm"
                >
                  <Save className="size-3.5 mr-1" />
                  {savingPrivateNotes ? "Saving to Vault..." : "Save Private Notes"}
                </Button>
              </div>
            </div>
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

      {/* Courtesy Reschedule Modal (Option B) */}
      <Modal
        open={Boolean(rescheduleAppointment)}
        onClose={() => setRescheduleAppointment(null)}
        title="Courtesy Reschedule (সৌজন্যমূলক রি-শিডিউল)"
        description="Grant a 1-time courtesy reschedule for this client without extra fees. The deposit and escrow balance will seamlessly transfer to the new slot."
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <Button variant="secondary" onClick={() => setRescheduleAppointment(null)}>
              Cancel
            </Button>
            <Button
              loading={rescheduleMutation.isPending}
              onClick={() => rescheduleMutation.mutate()}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
            >
              <CalendarDays className="size-3.5 mr-1" />
              Confirm Reschedule
            </Button>
          </div>
        }
      >
        <div className="space-y-4 py-2 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-slate-800 mb-1">
              New Date & Time (IST) *
            </label>
            <input
              type="datetime-local"
              step="300"
              value={rescheduleForm.newStartsAt}
              onChange={(e) => setRescheduleForm((p) => ({ ...p, newStartsAt: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Must be within an open Availability Window in your schedule and on a 5-minute mark.
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-800 mb-1">
              Reason / Emergency Note (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Client requested emergency reschedule due to medical appointment"
              value={rescheduleForm.reason}
              onChange={(e) => setRescheduleForm((p) => ({ ...p, reason: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <Alert tone="info">
            <strong>Policy:</strong> Only 1 courtesy reschedule is permitted per booking. The client will receive an updated email with new Google Calendar sync.
          </Alert>
        </div>
      </Modal>

      {/* Mark Client No-Show Modal (10-15m wait rule) */}
      <Modal
        open={Boolean(noShowAppointment)}
        onClose={() => setNoShowAppointment(null)}
        title="Mark Client No-Show (১০-১৫ মিনিট অপেক্ষা পরবর্তী)"
        description="Confirm that you were present in the consultation chamber and waited for the client. The session will be closed and your consultation fee will be settled."
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <Button variant="secondary" onClick={() => setNoShowAppointment(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={noShowMutation.isPending}
              onClick={() => noShowMutation.mutate()}
              className="font-bold"
            >
              <AlertCircle className="size-3.5 mr-1" />
              Confirm Client No-Show
            </Button>
          </div>
        }
      >
        <div className="space-y-3.5 py-2 text-xs">
          <Alert tone="warning">
            You are certifying that you waited in the chamber for at least 10–15 minutes and the client was absent.
            The escrowed session coins will be captured to your account as compensation.
          </Alert>

          <div>
            <label className="block text-[11px] font-bold text-slate-800 mb-1">
              No-Show Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Client did not enter chamber after 15m wait"
              value={noShowReason}
              onChange={(e) => setNoShowReason(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
            />
          </div>
        </div>
      </Modal>

      {/* Red-Flag & Abuse Shield Modal */}
      <Modal
        open={Boolean(redFlagAppointment)}
        onClose={() => setRedFlagAppointment(null)}
        title="Red-Flag Client & Report Misconduct (অনুপযুক্ত ক্লায়েন্ট রিপোর্ট)"
        description="Terminates session immediately due to policy violation, logs an official report with Trust & Safety, and captures your consultation compensation."
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <Button variant="secondary" onClick={() => setRedFlagAppointment(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={redFlagMutation.isPending}
              onClick={() => redFlagMutation.mutate()}
              className="font-bold bg-rose-600 hover:bg-rose-700 text-white"
            >
              <Flag className="size-3.5 mr-1" />
              Terminate & Red-Flag
            </Button>
          </div>
        }
      >
        <div className="space-y-4 py-2 text-xs">
          <Alert tone="error">
            <strong>Client Screening Shield:</strong> If a client behaves abusively or violates conduct, you have the full authority to terminate the session. The client's held escrow fee will not be refunded to them.
          </Alert>

          <div>
            <label className="block text-[11px] font-bold text-slate-800 mb-1.5">
              Reason for Incident Flag *
            </label>
            <select
              value={redFlagReason}
              onChange={(e) => setRedFlagReason(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 bg-white focus:border-rose-500 focus:outline-none"
            >
              <option value="Abusive language / Verbal harassment">Abusive language / Verbal harassment (অশোভন আচরণ / কটূক্তি)</option>
              <option value="Threats or Hostile intimidation">Threats or Hostile intimidation (হুমকি প্রদর্শন)</option>
              <option value="Inappropriate or Vulgar behavior">Inappropriate or Vulgar behavior (অশ্লীল আচরণ)</option>
              <option value="Fraudulent identity or Bad faith consultation">Fraudulent identity or Bad faith (ভুয়া তথ্য / অপব্যবহার)</option>
              <option value="Other platform code-of-conduct violation">Other code-of-conduct violation (অন্যান্য নীতিমালা লঙ্ঘন)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-800 mb-1.5">
              Incident Notes for Platform Audit
            </label>
            <textarea
              rows={3}
              placeholder="Describe what occurred during the consultation session..."
              value={redFlagNotes}
              onChange={(e) => setRedFlagNotes(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-900 focus:border-rose-500 focus:outline-none"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={redFlagBlacklist}
              onChange={(e) => setRedFlagBlacklist(e.target.checked)}
              className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 size-4"
            />
            <span className="font-semibold text-slate-800 text-xs">
              Blacklist client from booking with me again (ব্যক্তিগত প্রোফাইল থেকে ব্লক)
            </span>
          </label>
        </div>
      </Modal>

      {/* Request Birth Time Rectification (BTR) Modal */}
      <Modal
        open={Boolean(btrAppointment)}
        onClose={() => setBtrAppointment(null)}
        title="Request Birth Time Rectification (BTR)"
        description="Notify the seeker to clarify or submit their exact verified birth time for maximum Vedic astrological accuracy."
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <Button variant="secondary" onClick={() => setBtrAppointment(null)}>
              Cancel
            </Button>
            <Button
              loading={btrMutation.isPending}
              onClick={() => btrMutation.mutate()}
              className="font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Clock className="size-3.5 mr-1" />
              Send BTR Request
            </Button>
          </div>
        }
      >
        <div className="space-y-4 py-2 text-xs">
          <Alert tone="info">
            In Vedic astrology, divisional charts (D9 Navamsha) and Lagna sandhi change every few minutes. Requesting BTR alerts the client to provide exact hospital records.
          </Alert>

          <div>
            <label className="block text-[11px] font-bold text-slate-800 mb-1.5">
              Preset Reasons (1-Click Fill)
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {[
                "Lagna cusp / sandhi detected. Please confirm exact birth minute from hospital card.",
                "Birth minute is approximate. Please verify exact time for accurate Navamsha D9 analysis.",
                "Dasha transitions are sensitive. Kindly confirm exact time with family or birth record.",
              ].map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setBtrNote(preset)}
                  className="rounded-lg border border-indigo-200 bg-indigo-50/60 px-2.5 py-1 text-[11px] text-indigo-900 hover:bg-indigo-100 text-left transition-colors cursor-pointer"
                >
                  {preset.slice(0, 45)}...
                </button>
              ))}
            </div>

            <label className="block text-[11px] font-bold text-slate-800 mb-1">
              Instructions for Seeker *
            </label>
            <textarea
              rows={3}
              value={btrNote}
              onChange={(e) => setBtrNote(e.target.value)}
              placeholder="e.g. Please check your hospital birth card or family records and update the exact minutes..."
              className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>
      </Modal>

      {/* Unblock Client Modal */}
      <Modal
        open={Boolean(unblockTarget)}
        onClose={() => setUnblockTarget(null)}
        title="Unblock Client from My Profile?"
        description={`Allow ${unblockTarget?.name ?? "this client"} to book future consultations with you again.`}
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <Button variant="secondary" onClick={() => setUnblockTarget(null)}>
              Cancel
            </Button>
            <Button
              loading={unblockMutation.isPending}
              onClick={() => unblockTarget && unblockMutation.mutate(unblockTarget.user_id)}
              className="font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <UserX className="size-3.5 mr-1" />
              Confirm Unblock
            </Button>
          </div>
        }
      >
        <p className="text-xs text-slate-600 py-2 leading-relaxed">
          Removing <strong>{unblockTarget?.name}</strong> from your blacklist will enable them to view your available calendar slots and book appointments as a normal seeker.
        </p>
      </Modal>

      {/* Issue / Update Follow-Up Pass Modal */}
      <Modal
        open={Boolean(issuePassAppointment)}
        onClose={() => setIssuePassAppointment(null)}
        title="Issue Complimentary Follow-up Pass (রেমিডি ফলো-আপ পাস)"
        description="Grant a free 7-day (or custom) inbox follow-up pass for this consultation so the client can clarify prescribed remedies, mantras, or rituals."
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <Button variant="secondary" onClick={() => setIssuePassAppointment(null)}>
              Cancel
            </Button>
            <Button
              loading={issuePassMutation.isPending}
              onClick={() => issuePassMutation.mutate()}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
            >
              <Sparkles className="size-3.5 mr-1" />
              Confirm & Issue Pass
            </Button>
          </div>
        }
      >
        <div className="space-y-4 py-2 text-xs">
          <Alert tone="info">
            The seeker can submit up to the specified questions without paying coins. You can reply from the consultation dossier at your convenience.
          </Alert>

          <div>
            <label className="block text-[11px] font-bold text-slate-800 mb-1.5">
              Pass Validity Duration (কত দিনের বৈধতা) *
            </label>
            <div className="flex flex-wrap gap-2">
              {[3, 5, 7, 10, 14, 21].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setPassWindowDays(days)}
                  className={cn(
                    "rounded-xl px-3 py-1.5 text-xs font-bold border transition-all cursor-pointer",
                    passWindowDays === days
                      ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  )}
                >
                  {days} Days {days === 7 && "(Standard)"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-800 mb-1.5">
              Allowed Free Questions (সর্বোচ্চ কয়টি প্রশ্ন) *
            </label>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 5].map((cnt) => (
                <button
                  key={cnt}
                  type="button"
                  onClick={() => setPassMaxQuestions(cnt)}
                  className={cn(
                    "rounded-xl px-3 py-1.5 text-xs font-bold border transition-all cursor-pointer",
                    passMaxQuestions === cnt
                      ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  )}
                >
                  {cnt} {cnt === 1 ? "Question" : "Questions"} {cnt === 3 && "(Recommended)"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-800 mb-1">
              Instructions for Seeker (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Feel free to ask about gemstone wearing rituals or mantra counts"
              value={passNotes}
              onChange={(e) => setPassNotes(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ------------------------------------------------------------- VIP Tatkal & Private Manager */
function VipTatkalAndPrivateManager() {
  const queryClient = useQueryClient();
  const { data: windows, isLoading: windowsLoading } = useQuery({
    queryKey: WINDOWS_KEY,
    queryFn: () => appointmentApi.windows(60),
  });
  const { data: links, isLoading: linksLoading } = useQuery({
    queryKey: PRIVATE_LINKS_KEY,
    queryFn: () => appointmentApi.getPrivateLinks(),
  });
  const { data: card } = useQuery({
    queryKey: CARD_KEY,
    queryFn: () => appointmentApi.card(),
  });

  // Tatkal Modal State
  const [openTatkalModal, setOpenTatkalModal] = React.useState(false);
  const [tatkalStart, setTatkalStart] = React.useState(() => {
    const d = new Date(Date.now() + 15 * 60 * 1000);
    d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0);
    return toLocalInput(d);
  });
  const [tatkalDuration, setTatkalDuration] = React.useState<number>(30);
  const [tatkalMultiplier, setTatkalMultiplier] = React.useState<number>(1.5);
  const [tatkalFixedRupees, setTatkalFixedRupees] = React.useState<string>("");
  const [tatkalTitle, setTatkalTitle] = React.useState<string>("VIP Tatkal Emergency Slot");

  // Private Link Modal State
  const [openPrivateModal, setOpenPrivateModal] = React.useState(false);
  const [linkTitle, setLinkTitle] = React.useState("");
  const [clientName, setClientName] = React.useState("");
  const [clientEmail, setClientEmail] = React.useState("");
  const [passcode, setPasscode] = React.useState("");
  const [pricingMode, setPricingMode] = React.useState<"standard" | "multiplier" | "fixed" | "discount">("standard");
  const [linkMultiplier, setLinkMultiplier] = React.useState<number>(1.5);
  const [customRupees, setCustomRupees] = React.useState("");
  const [discountPercent, setDiscountPercent] = React.useState(20);
  const [maxUses, setMaxUses] = React.useState<number>(1);
  const [expiresHours, setExpiresHours] = React.useState<number>(48);
  const [notes, setNotes] = React.useState("");

  // Mutations
  const createTatkal = useMutation({
    mutationFn: (body: {
      starts_at: string;
      minutes: number;
      multiplier?: number;
      fixed_paise?: number | null;
      custom_title?: string;
    }) => appointmentApi.openTatkalWindow(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: WINDOWS_KEY });
      setOpenTatkalModal(false);
      toast.success("Emergency Tatkal Window created successfully!");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });

  const createPrivateLink = useMutation({
    mutationFn: (body: {
      title: string;
      client_name?: string;
      client_email?: string;
      passcode?: string;
      custom_price_paise?: number;
      discount_percent?: number;
      is_tatkal?: boolean;
      max_uses?: number;
      expires_in_hours?: number;
      notes?: string;
    }) => appointmentApi.createPrivateLink(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PRIVATE_LINKS_KEY });
      setOpenPrivateModal(false);
      setLinkTitle("");
      setClientName("");
      setClientEmail("");
      setPasscode("");
      setCustomRupees("");
      setNotes("");
      toast.success("Private invite link generated!");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });

  const removeWindow = useMutation({
    mutationFn: (id: string) => appointmentApi.removeWindow(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: WINDOWS_KEY });
      toast.success("Tatkal window removed.");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });

  const deleteLink = useMutation({
    mutationFn: (id: string) => appointmentApi.deletePrivateLink(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PRIVATE_LINKS_KEY });
      toast.success("Private invite link revoked.");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });

  const tatkalWindows = (windows || []).filter((w) => w.is_tatkal);

  const copyToClipboard = (inviteCode: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    let webOrigin = origin.replace(":3001", ":3000").replace("admin.", "");
    if (!webOrigin.startsWith("http")) {
      webOrigin = "https://astra-astrology.com";
    }
    const fullUrl = `${webOrigin}/appointments/private/${inviteCode}`;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(fullUrl).then(
        () => toast.success("Private invite link copied to clipboard!"),
        () => toast.error("Failed to copy link")
      );
    } else {
      toast.info(`Link: ${fullUrl}`);
    }
  };

  const handleOpenTatkalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedDate = new Date(tatkalStart);
    if (isNaN(parsedDate.getTime())) {
      toast.error("Please enter a valid start time");
      return;
    }
    const fixedPaise = tatkalFixedRupees ? Math.round(Number(tatkalFixedRupees) * 100) : null;
    createTatkal.mutate({
      starts_at: parsedDate.toISOString(),
      minutes: tatkalDuration,
      multiplier: fixedPaise ? undefined : tatkalMultiplier,
      fixed_paise: fixedPaise,
      custom_title: tatkalTitle.trim() || undefined,
    });
  };

  const handleCreatePrivateLinkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkTitle.trim()) {
      toast.error("Please provide a title for the private link");
      return;
    }
    let customPaise: number | undefined = undefined;
    let discount: number | undefined = undefined;
    let isTatkal = false;

    if (pricingMode === "fixed" && customRupees) {
      customPaise = Math.round(Number(customRupees) * 100);
    } else if (pricingMode === "discount") {
      discount = discountPercent;
    } else if (pricingMode === "multiplier") {
      isTatkal = true;
    }

    createPrivateLink.mutate({
      title: linkTitle.trim(),
      client_name: clientName.trim() || undefined,
      client_email: clientEmail.trim() || undefined,
      passcode: passcode.trim() || undefined,
      custom_price_paise: customPaise,
      discount_percent: discount,
      is_tatkal: isTatkal,
      max_uses: maxUses,
      expires_in_hours: expiresHours,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="rounded-3xl border border-amber-200/90 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-amber-500/15 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 border border-amber-300 px-3 py-1 text-xs font-black text-amber-900 uppercase tracking-wider">
              <Zap className="size-3.5 fill-amber-600 text-amber-600" />
              <span>VIP & Emergency Authority</span>
            </div>
            <h2 className="font-display text-2xl font-black text-slate-900 tracking-tight">
              VIP Tatkal Slots & Private Invite Links
            </h2>
            <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
              Open immediate emergency slots at premium rates when regular bookings are full, or issue discreet, password-protected private booking links for celebrity seekers.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                const d = new Date(Date.now() + 15 * 60 * 1000);
                d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0);
                setTatkalStart(toLocalInput(d));
                setOpenTatkalModal(true);
              }}
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 px-4 py-2.5 text-xs font-black text-white shadow-md hover:shadow-lg hover:scale-[1.02] transition-all cursor-pointer"
            >
              <Zap className="size-4 fill-white" />
              <span>+ Open Tatkal Slot</span>
            </button>

            <button
              type="button"
              onClick={() => setOpenPrivateModal(true)}
              className="flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-xs font-black text-white shadow-md hover:bg-slate-800 hover:scale-[1.02] transition-all cursor-pointer"
            >
              <Lock className="size-4 text-amber-400" />
              <span>+ Generate Private Link</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Active Tatkal Slots (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="size-4 text-amber-600 fill-amber-600" />
              <h3 className="font-display text-base font-bold text-slate-900">
                Active Emergency Tatkal Slots
              </h3>
            </div>
            <span className="text-xs font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
              {tatkalWindows.length} Active
            </span>
          </div>

          {windowsLoading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <LoadingBlock label="Loading Tatkal windows…" />
            </div>
          ) : tatkalWindows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/40 p-8 text-center space-y-3">
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                <Zap className="size-6 fill-amber-600 text-amber-600" />
              </div>
              <h4 className="font-bold text-slate-800 text-sm">No Emergency Slots Open</h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Need to accommodate an urgent seeker? Open an immediate Tatkal window with custom premium pricing.
              </p>
              <button
                type="button"
                onClick={() => setOpenTatkalModal(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-amber-700 transition-colors shadow-xs cursor-pointer"
              >
                <Plus className="size-3.5 stroke-[3]" />
                <span>Open Instant Tatkal</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {tatkalWindows.map((win) => {
                const start = new Date(win.starts_at);
                const end = new Date(win.ends_at);
                const durationMins = Math.round((end.getTime() - start.getTime()) / 60000);
                const mult = win.tatkal_multiplier ?? 1.5;

                return (
                  <div
                    key={win.id}
                    className="group relative rounded-2xl border border-amber-200 bg-white p-4 shadow-sm hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-300 px-2 py-0.5 text-[10px] font-black text-amber-800 uppercase tracking-wide">
                            <Zap className="size-3 fill-amber-600 text-amber-600" />
                            {win.tatkal_fixed_paise ? `₹${rupees(win.tatkal_fixed_paise)} Fixed` : `${mult}x Premium`}
                          </span>
                          {win.is_private && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 border border-slate-300 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
                              <Lock className="size-2.5" />
                              Private
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-sm text-slate-900">
                          {win.custom_title || "VIP Tatkal Consultation"}
                        </h4>
                        <p className="text-xs text-slate-600 font-medium">
                          📅 {dayLabel(win.starts_at)} • {clock(win.starts_at)} – {clock(win.ends_at)}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Duration: {durationMins} minutes
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeWindow.mutate(win.id)}
                        disabled={removeWindow.isPending}
                        className="rounded-xl p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Remove Tatkal Window"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Private Invite-Only Links Directory (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="size-4 text-slate-700" />
              <h3 className="font-display text-base font-bold text-slate-900">
                Discreet & Private Invite Links
              </h3>
            </div>
            <span className="text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
              {links?.length ?? 0} Generated
            </span>
          </div>

          {linksLoading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <LoadingBlock label="Loading private links…" />
            </div>
          ) : !links || links.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center space-y-3">
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                <Link2 className="size-6" />
              </div>
              <h4 className="font-bold text-slate-800 text-sm">No Private Links Generated</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Generate dedicated private booking links for discreet VIP clients. Links do not show up on your public profile and can be locked with a PIN code.
              </p>
              <button
                type="button"
                onClick={() => setOpenPrivateModal(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
              >
                <Plus className="size-3.5 stroke-[3]" />
                <span>Create First Private Link</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {links.map((link) => {
                const isExhausted = link.uses_count >= link.max_uses;
                const isExpired = link.expires_at ? new Date(link.expires_at).getTime() < Date.now() : false;
                const isLive = link.is_active && !isExhausted && !isExpired;

                return (
                  <div
                    key={link.id}
                    className={cn(
                      "rounded-2xl border p-4 transition-all space-y-3",
                      isLive
                        ? "border-slate-200 bg-white shadow-sm hover:shadow-md"
                        : "border-slate-200/60 bg-slate-50/70 opacity-75"
                    )}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider",
                            isLive
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : isExhausted
                              ? "bg-amber-100 text-amber-800 border border-amber-300"
                              : "bg-rose-100 text-rose-800 border border-rose-300"
                          )}
                        >
                          <span
                            className={cn(
                              "size-1.5 rounded-full",
                              isLive ? "bg-emerald-500" : isExhausted ? "bg-amber-500" : "bg-rose-500"
                            )}
                          />
                          {isLive ? "Active Link" : isExhausted ? "Used Up" : "Expired"}
                        </span>

                        {link.has_passcode ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                            <Lock className="size-2.5 text-amber-600" />
                            PIN Protected
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                            <Unlock className="size-2.5" />
                            Direct Access
                          </span>
                        )}

                        {link.is_tatkal && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                            <Zap className="size-2.5 fill-amber-600" />
                            Tatkal
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => copyToClipboard(link.invite_code)}
                          className="flex items-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
                          title="Copy Private Link"
                        >
                          <Copy className="size-3.5" />
                          <span>Copy Link</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => deleteLink.mutate(link.id)}
                          disabled={deleteLink.isPending}
                          className="rounded-xl p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Revoke Link"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="font-bold text-sm text-slate-900">{link.title}</p>
                        {link.client_name && (
                          <p className="text-slate-600 font-medium mt-0.5">
                            Client: <span className="font-bold text-slate-800">{link.client_name}</span>
                          </p>
                        )}
                        {link.notes && (
                          <p className="text-[11px] text-slate-500 italic mt-1">"{link.notes}"</p>
                        )}
                      </div>

                      <div className="space-y-1 sm:text-right">
                        <p className="text-slate-600">
                          Rate:{" "}
                          <span className="font-bold text-slate-900">
                            {link.custom_price_paise
                              ? `₹${rupees(link.custom_price_paise)} Fixed`
                              : link.discount_percent
                              ? `${link.discount_percent}% Off`
                              : link.is_tatkal
                              ? "Tatkal Rate"
                              : "Standard Rate"}
                          </span>
                        </p>
                        <p className="text-slate-500">
                          Usage: <span className="font-bold text-slate-700">{link.uses_count}</span> of{" "}
                          <span className="font-bold text-slate-700">{link.max_uses}</span> bookings
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Expires: {link.expires_at ? new Date(link.expires_at).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          }) : "Never"}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: Open Emergency Tatkal Window */}
      <Modal
        open={openTatkalModal}
        onClose={() => setOpenTatkalModal(false)}
        title="⚡ Open Emergency Tatkal Window"
      >
        <form onSubmit={handleOpenTatkalSubmit} className="space-y-4">
          <Alert tone="info">
            Emergency Tatkal windows are marked with a golden badge and allow seekers to book at premium fees even during off-hours or peak times.
          </Alert>

          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
              Window Title / Purpose
            </label>
            <input
              type="text"
              value={tatkalTitle}
              onChange={(e) => setTatkalTitle(e.target.value)}
              placeholder="e.g. VIP Tatkal Emergency Slot"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                Start Date & Time *
              </label>
              <input
                type="datetime-local"
                value={tatkalStart}
                onChange={(e) => setTatkalStart(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                Duration (Minutes) *
              </label>
              <select
                value={tatkalDuration}
                onChange={(e) => setTatkalDuration(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
              >
                <option value={30}>30 Minutes</option>
                <option value={45}>45 Minutes</option>
                <option value={60}>60 Minutes (1 Hour)</option>
                <option value={90}>90 Minutes (1.5 Hours)</option>
                <option value={120}>120 Minutes (2 Hours)</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
              Emergency Pricing Model
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Multiplier Option
                </span>
                <div className="flex flex-wrap gap-1">
                  {[1.25, 1.5, 1.75, 2.0, 2.5].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setTatkalMultiplier(m);
                        setTatkalFixedRupees("");
                      }}
                      className={cn(
                        "rounded-lg px-2.5 py-1 text-xs font-bold border transition-all cursor-pointer",
                        !tatkalFixedRupees && tatkalMultiplier === m
                          ? "bg-amber-600 text-white border-amber-600"
                          : "bg-slate-50 text-slate-700 border-slate-200"
                      )}
                    >
                      {m}x
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Or Fixed Fee (₹)
                </span>
                <input
                  type="number"
                  min={0}
                  step={50}
                  value={tatkalFixedRupees}
                  onChange={(e) => setTatkalFixedRupees(e.target.value)}
                  placeholder="e.g. 1500"
                  className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setOpenTatkalModal(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createTatkal.isPending}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              {createTatkal.isPending ? "Opening Window..." : "Open Tatkal Window"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: Create Private Invite Link */}
      <Modal
        open={openPrivateModal}
        onClose={() => setOpenPrivateModal(false)}
        title="🔒 Generate VIP Private Invite Link"
      >
        <form onSubmit={handleCreatePrivateLinkSubmit} className="space-y-4">
          <Alert tone="info">
            Private links do not appear on your public profile or marketplace directory. Only clients who receive this link (and know the optional PIN) can book.
          </Alert>

          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
              Link Title / Description *
            </label>
            <input
              type="text"
              required
              value={linkTitle}
              onChange={(e) => setLinkTitle(e.target.value)}
              placeholder="e.g. Private Kundali Reading for Mr. Singhania"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                Client Name (Optional)
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g. Vikram Singhania"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                Secret Passcode / PIN (Optional)
              </label>
              <input
                type="text"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="e.g. 7869 or VIP2026"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-none font-mono"
              />
              <span className="text-[10px] text-slate-400">Leave blank for open access via URL</span>
            </div>
          </div>

          {/* Pricing override options */}
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
              Pricing Mode
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { id: "standard", label: "Standard Rate" },
                { id: "multiplier", label: "Tatkal (1.5x)" },
                { id: "fixed", label: "Custom ₹" },
                { id: "discount", label: "Discount %" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPricingMode(opt.id as any)}
                  className={cn(
                    "rounded-xl px-2 py-1.5 text-xs font-bold border transition-all cursor-pointer text-center",
                    pricingMode === opt.id
                      ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {pricingMode === "fixed" && (
              <div className="pt-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Custom Fixed Fee for this Session (₹)
                </label>
                <input
                  type="number"
                  min={0}
                  step={50}
                  value={customRupees}
                  onChange={(e) => setCustomRupees(e.target.value)}
                  placeholder="e.g. 2500"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
                />
              </div>
            )}

            {pricingMode === "discount" && (
              <div className="pt-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Discount Percentage (%)
                </label>
                <div className="flex gap-2">
                  {[10, 20, 25, 50].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDiscountPercent(d)}
                      className={cn(
                        "rounded-xl px-3 py-1 text-xs font-bold border transition-all cursor-pointer",
                        discountPercent === d
                          ? "bg-amber-600 text-white border-amber-600"
                          : "bg-white text-slate-700 border-slate-200"
                      )}
                    >
                      {d}% Off
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                Maximum Uses *
              </label>
              <select
                value={maxUses}
                onChange={(e) => setMaxUses(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
              >
                <option value={1}>1-Time Use Only (Single Booking)</option>
                <option value={2}>2 Bookings</option>
                <option value={3}>3 Bookings</option>
                <option value={5}>5 Bookings</option>
                <option value={10}>10 Bookings</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                Link Expiry Window *
              </label>
              <select
                value={expiresHours}
                onChange={(e) => setExpiresHours(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
              >
                <option value={24}>24 Hours (1 Day)</option>
                <option value={48}>48 Hours (2 Days)</option>
                <option value={72}>72 Hours (3 Days)</option>
                <option value={168}>7 Days (1 Week)</option>
                <option value={720}>30 Days (1 Month)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
              Internal Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. VIP referral from Chairman Office"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setOpenPrivateModal(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createPrivateLink.isPending}
              className="bg-slate-900 text-white hover:bg-slate-800"
            >
              {createPrivateLink.isPending ? "Generating..." : "Generate Private Link"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
