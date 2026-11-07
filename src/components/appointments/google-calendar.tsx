"use client";

import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  ExternalLink,
  Eye,
  FileText,
  Flame,
  Gem,
  Info,
  Maximize2,
  MessageSquare,
  PhoneCall,
  Plus,
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

import { Avatar, Badge, Button, Modal } from "@/components/ui";
import { cn } from "@/lib/utils";
import { APPOINTMENT_STATUS_LABELS, type Appointment } from "@/types";

export type CalendarViewType = "week" | "month" | "day" | "agenda";

export interface GoogleCalendarProps {
  bookings: Appointment[];
  windows: Array<{ id: string; day: string; starts_at: string; ends_at: string; is_tatkal?: boolean; custom_title?: string | null }>;
  onOpenSession: (appointment: Appointment) => void;
  onOpenPrescription: (appointment: Appointment) => void;
  onCancelAppointment: (appointmentId: string) => void;
  onCompleteAppointment: (appointmentId: string) => void;
  onAddWindow: (fromIso: string, toIso: string) => Promise<void>;
  onRemoveWindow?: (id: string) => Promise<void> | void;
  isAstrologer?: boolean;
}

const PILLAR_ICONS: Record<string, { label: string; icon: string }> = {
  career_wealth: { label: "Career & Wealth", icon: "💼" },
  love_marriage: { label: "Love & Marriage", icon: "💍" },
  health_longevity: { label: "Health & Vitality", icon: "🌿" },
  dosha_graha_shanti: { label: "Graha Shanti & Doshas", icon: "🔥" },
  business_expansion: { label: "Business & Investments", icon: "📈" },
  spiritual_guidance: { label: "Spiritual Path & Moksha", icon: "🕉️" },
};

function formatTime(d: Date): string {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
}

function formatDateKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6); // 6 AM to 11 PM (18 hours)
const HOUR_HEIGHT = 64; // pixels per hour

export function GoogleCalendarSuite({
  bookings,
  windows,
  onOpenSession,
  onOpenPrescription,
  onCancelAppointment,
  onCompleteAppointment,
  onAddWindow,
  onRemoveWindow,
  isAstrologer = true,
}: GoogleCalendarProps) {
  const [currentDate, setCurrentDate] = React.useState<Date>(() => new Date());
  const [view, setView] = React.useState<CalendarViewType>("week");

  // Delete window state
  const [deleteTargetWindow, setDeleteTargetWindow] = React.useState<{
    id: string;
    starts_at: string;
    ends_at: string;
    day: string;
  } | null>(null);
  const [isDeletingWindow, setIsDeletingWindow] = React.useState(false);
  const [manageSlotsModalOpen, setManageSlotsModalOpen] = React.useState(false);

  const handleDeleteWindow = async () => {
    if (!deleteTargetWindow || !onRemoveWindow) return;
    setIsDeletingWindow(true);
    try {
      await onRemoveWindow(deleteTargetWindow.id);
      toast.success("Availability window removed successfully!");
      setDeleteTargetWindow(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to remove availability window.");
    } finally {
      setIsDeletingWindow(false);
    }
  };

  // Quick slot opening modal state
  const [quickSlotModal, setQuickSlotModal] = React.useState<{
    isOpen: boolean;
    date: Date;
    startHour: number;
    startMinute: number;
    endHour: number;
    endMinute: number;
  }>({
    isOpen: false,
    date: new Date(),
    startHour: 18,
    startMinute: 0,
    endHour: 21,
    endMinute: 0,
  });

  const [isOpeningSlot, setIsOpeningSlot] = React.useState(false);

  // Live real-time tick for current time red line (updates every 30s)
  const [now, setNow] = React.useState<Date>(() => new Date());
  React.useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  // Calculate upcoming session for 15-min Live Countdown HUD
  const upcomingUrgentBooking = React.useMemo(() => {
    const nowMs = now.getTime();
    return bookings.find((b) => {
      if (b.status !== "booked") return false;
      const s = new Date(b.starts_at).getTime();
      const e = new Date(b.ends_at).getTime();
      return s - nowMs <= 15 * 60_000 && e >= nowMs;
    });
  }, [bookings, now]);

  // Navigate actions
  const jumpToday = () => setCurrentDate(new Date());

  const prevPeriod = () => {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      if (view === "month") next.setMonth(next.getMonth() - 1);
      else if (view === "week") next.setDate(next.getDate() - 7);
      else if (view === "day") next.setDate(next.getDate() - 1);
      else next.setDate(next.getDate() - 7);
      return next;
    });
  };

  const nextPeriod = () => {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      if (view === "month") next.setMonth(next.getMonth() + 1);
      else if (view === "week") next.setDate(next.getDate() + 7);
      else if (view === "day") next.setDate(next.getDate() + 1);
      else next.setDate(next.getDate() + 7);
      return next;
    });
  };

  // Header period title (e.g. "November 2026" or "Nov 2 - 8, 2026")
  const periodTitle = React.useMemo(() => {
    if (view === "month") {
      return currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    }
    if (view === "day") {
      return currentDate.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
    // Week title
    const d = new Date(currentDate);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
    const startOfWeek = new Date(d.setDate(diff));
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    const m1 = startOfWeek.toLocaleDateString("en-US", { month: "short" });
    const m2 = endOfWeek.toLocaleDateString("en-US", { month: "short" });
    if (m1 === m2) {
      return `${m1} ${startOfWeek.getDate()} – ${endOfWeek.getDate()}, ${startOfWeek.getFullYear()}`;
    }
    return `${m1} ${startOfWeek.getDate()} – ${m2} ${endOfWeek.getDate()}, ${startOfWeek.getFullYear()}`;
  }, [currentDate, view]);

  // Week days (Mon to Sun)
  const weekDays = React.useMemo(() => {
    const d = new Date(currentDate);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(monday);
      dayDate.setDate(monday.getDate() + i);
      days.push(dayDate);
    }
    return days;
  }, [currentDate]);

  // Handle click on empty slot to quick open window
  const handleSlotClick = (dayDate: Date, hour: number) => {
    setQuickSlotModal({
      isOpen: true,
      date: dayDate,
      startHour: hour,
      startMinute: 0,
      endHour: Math.min(hour + 3, 23),
      endMinute: 0,
    });
  };

  const handleConfirmQuickSlot = async () => {
    setIsOpeningSlot(true);
    try {
      const from = new Date(quickSlotModal.date);
      from.setHours(quickSlotModal.startHour, quickSlotModal.startMinute, 0, 0);

      const to = new Date(quickSlotModal.date);
      to.setHours(quickSlotModal.endHour, quickSlotModal.endMinute, 0, 0);

      await onAddWindow(from.toISOString(), to.toISOString());
      toast.success(
        `Availability window opened from ${formatTime(from)} to ${formatTime(to)} on ${quickSlotModal.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}!`,
      );
      setQuickSlotModal((prev) => ({ ...prev, isOpen: false }));
    } catch {
      // Error handled by caller
    } finally {
      setIsOpeningSlot(false);
    }
  };

  // Generate Google Calendar Link for an appointment
  const getGoogleCalendarUrl = (a: Appointment) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    const toUtcStr = (date: Date) =>
      `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(
        date.getUTCHours(),
      )}${pad(date.getUTCMinutes())}00Z`;

    const start = toUtcStr(new Date(a.starts_at));
    const end = toUtcStr(new Date(a.ends_at));
    const clientName = a.peer?.name || "Client";
    const topic = a.consultation_pillar ? PILLAR_ICONS[a.consultation_pillar]?.label : "Astrology";

    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: `Sacred Consultation: ${clientName} (${topic})`,
      dates: `${start}/${end}`,
      details: `Astrology consultation session with ${clientName}. Topic: ${topic}. Notes: ${a.user_note || "None"}. Room: https://astra-astrology-admin-five.vercel.app/appointments`,
      location: "DivinLink Sacred Chamber",
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  };

  return (
    <div className="rounded-3xl border border-slate-200/90 bg-white shadow-[0_16px_40px_rgba(20,25,45,0.06)] overflow-hidden">
      {/* 1. Live 15-Minute Countdown Ticker HUD Banner */}
      {upcomingUrgentBooking && (
        <div className="relative overflow-hidden bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 px-5 py-3 text-white shadow-inner flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="relative flex size-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
              <span className="relative inline-flex rounded-full size-3 bg-white" />
            </span>
            <div className="flex items-center gap-2 text-xs font-black tracking-wide uppercase">
              <Zap className="size-4 text-amber-200 fill-amber-200" />
              <span>Session Starts in &lt; 15 Minutes!</span>
            </div>
            <span className="hidden sm:inline-block text-xs font-semibold text-amber-100">
              • Client {upcomingUrgentBooking.peer?.name || "Client"} · {formatTime(new Date(upcomingUrgentBooking.starts_at))} – {formatTime(new Date(upcomingUrgentBooking.ends_at))}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenSession(upcomingUrgentBooking)}
              className="flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-50 transition-all cursor-pointer shadow-xs"
            >
              <Video className="size-3.5 text-amber-600" />
              <span>Enter Sacred Chamber Now</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. Top Google Calendar Control Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 sm:p-6 border-b border-slate-100 bg-slate-50/50">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#0284C7] to-[#0369A1] text-white shadow-[0_4px_12px_rgba(3,105,161,0.25)]">
            <CalendarIcon className="size-5 stroke-[2.2]" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-lg font-bold text-slate-900 tracking-tight">
                {periodTitle}
              </h2>
              <span className="hidden sm:inline-block rounded-full bg-sky-100 px-2.5 py-0.5 text-[10px] font-bold text-sky-800">
                IST (GMT+05:30)
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Google Calendar visual view of your open availability & confirmed client consultations.
            </p>
          </div>
        </div>

        {/* View Switchers & Navigation Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Navigation group */}
          <div className="inline-flex items-center rounded-2xl border border-slate-200 bg-white p-1 shadow-2xs">
            <button
              type="button"
              onClick={jumpToday}
              className="rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer"
            >
              Today
            </button>
            <div className="h-4 w-px bg-slate-200 mx-1" />
            <button
              type="button"
              onClick={prevPeriod}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              title="Previous"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={nextPeriod}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              title="Next"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          {/* View selector buttons */}
          <div className="inline-flex items-center rounded-2xl border border-slate-200 bg-slate-100/80 p-1 shadow-2xs text-xs font-bold">
            {(["week", "month", "day", "agenda"] as CalendarViewType[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={cn(
                  "rounded-xl px-3 py-1.5 capitalize transition-all cursor-pointer",
                  view === v
                    ? "bg-white text-slate-900 shadow-xs ring-1 ring-slate-900/5 font-extrabold"
                    : "text-slate-600 hover:text-slate-900",
                )}
              >
                {v}
              </button>
            ))}
          </div>

          {/* Quick Active Slots Manager Button */}
          {onRemoveWindow && (
            <button
              type="button"
              onClick={() => setManageSlotsModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-2xl border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-800 hover:bg-sky-100 transition-all cursor-pointer shadow-2xs"
              title="Manage and delete active consultation slots"
            >
              <Clock className="size-3.5 text-sky-600" />
              <span>Active Slots ({windows.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. CALENDAR BODY BY VIEW */}
      {view === "week" && (
        <WeekCalendarView
          weekDays={weekDays}
          bookings={bookings}
          windows={windows}
          now={now}
          onSlotClick={handleSlotClick}
          onOpenSession={onOpenSession}
          getGoogleCalendarUrl={getGoogleCalendarUrl}
          onDeleteWindow={(w) => setDeleteTargetWindow(w)}
        />
      )}

      {view === "month" && (
        <MonthCalendarView
          currentDate={currentDate}
          bookings={bookings}
          windows={windows}
          onSelectDate={(d) => {
            setCurrentDate(d);
            setView("day");
          }}
          onOpenSession={onOpenSession}
        />
      )}

      {view === "day" && (
        <DayCalendarView
          date={currentDate}
          bookings={bookings}
          windows={windows}
          now={now}
          onSlotClick={(h) => handleSlotClick(currentDate, h)}
          onOpenSession={onOpenSession}
          onOpenPrescription={onOpenPrescription}
          onCancelAppointment={onCancelAppointment}
          onCompleteAppointment={onCompleteAppointment}
          getGoogleCalendarUrl={getGoogleCalendarUrl}
          onDeleteWindow={(w) => setDeleteTargetWindow(w)}
        />
      )}

      {view === "agenda" && (
        <AgendaCalendarView
          bookings={bookings}
          onOpenSession={onOpenSession}
          onOpenPrescription={onOpenPrescription}
          onCancelAppointment={onCancelAppointment}
          onCompleteAppointment={onCompleteAppointment}
          getGoogleCalendarUrl={getGoogleCalendarUrl}
        />
      )}

      {/* 4. Quick Slot Opening Modal (1-Click Google Calendar UX) */}
      <Modal
        open={quickSlotModal.isOpen}
        onClose={() => setQuickSlotModal((prev) => ({ ...prev, isOpen: false }))}
        title="Open Availability Window"
        description={`Set open booking hours for ${quickSlotModal.date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}.`}
      >
        <div className="space-y-5 pt-2">
          <div className="rounded-2xl border border-sky-200/70 bg-sky-50/50 p-4 space-y-2 text-xs text-sky-950">
            <div className="flex items-center gap-2 font-bold text-sky-900">
              <Sparkles className="size-4 text-sky-600" />
              <span>Fast Calendar Slot Activation</span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Opening this window permits clients to reserve 15, 30, or 60-minute consultations with you during this timeframe.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Start Time (IST)</label>
              <select
                value={quickSlotModal.startHour}
                onChange={(e) =>
                  setQuickSlotModal((prev) => ({
                    ...prev,
                    startHour: Number(e.target.value),
                    endHour: Math.max(prev.endHour, Number(e.target.value) + 1),
                  }))
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800"
              >
                {HOURS.map((h) => {
                  const d = new Date();
                  d.setHours(h, 0, 0, 0);
                  return (
                    <option key={h} value={h}>
                      {formatTime(d)}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">End Time (IST)</label>
              <select
                value={quickSlotModal.endHour}
                onChange={(e) =>
                  setQuickSlotModal((prev) => ({ ...prev, endHour: Number(e.target.value) }))
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800"
              >
                {HOURS.filter((h) => h > quickSlotModal.startHour).map((h) => {
                  const d = new Date();
                  d.setHours(h, 0, 0, 0);
                  return (
                    <option key={h} value={h}>
                      {formatTime(d)}
                    </option>
                  );
                })}
                <option value={24}>12:00 AM (Midnight)</option>
              </select>
            </div>
          </div>

          {/* Already open slots on this selected date */}
          {(() => {
            const dateKey = formatDateKey(quickSlotModal.date);
            const dayWins = windows.filter((w) => formatDateKey(new Date(w.starts_at)) === dateKey);
            if (dayWins.length === 0) return null;
            return (
              <div className="space-y-2 rounded-2xl border border-sky-200/80 bg-sky-50/60 p-3.5">
                <div className="text-[11px] font-bold text-sky-950 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="size-3 text-sky-600" />
                    <span>Already Open Slots on this Day:</span>
                  </span>
                  <span className="text-sky-700 font-semibold">{dayWins.length} slot(s) active</span>
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-0.5">
                  {dayWins.map((w) => (
                    <div
                      key={w.id}
                      className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-sky-100 text-xs shadow-2xs"
                    >
                      <span className="font-semibold text-slate-800 tabular-nums">
                        {formatTime(new Date(w.starts_at))} – {formatTime(new Date(w.ends_at))}
                      </span>
                      {onRemoveWindow && (
                        <button
                          type="button"
                          onClick={() => {
                            setQuickSlotModal((p) => ({ ...p, isOpen: false }));
                            setDeleteTargetWindow(w);
                          }}
                          className="text-rose-600 hover:text-rose-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors px-2 py-1 rounded-md hover:bg-rose-50"
                        >
                          <Trash2 className="size-3" />
                          <span>Delete Slot</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuickSlotModal((prev) => ({ ...prev, isOpen: false }))}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={isOpeningSlot}
              onClick={handleConfirmQuickSlot}
              className="bg-sky-600 hover:bg-sky-700 text-white font-bold"
            >
              {isOpeningSlot ? "Opening Hours…" : "Confirm & Open Hours"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* 5. Delete Slot Confirmation Modal (স্লট মুছে ফেলার ডায়ালগ) */}
      {deleteTargetWindow && (
        <Modal
          open={Boolean(deleteTargetWindow)}
          onClose={() => setDeleteTargetWindow(null)}
          title="Delete Availability Slot (স্লট বন্ধ / মুছে ফেলুন)"
          description="Are you sure you want to delete this open slot? Once removed, clients will no longer be able to book appointments during this time."
          footer={
            <div className="flex items-center justify-end gap-3 w-full">
              <Button variant="secondary" onClick={() => setDeleteTargetWindow(null)}>
                Keep Slot
              </Button>
              <Button
                disabled={isDeletingWindow}
                onClick={handleDeleteWindow}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                <Trash2 className="size-3.5 mr-1" />
                {isDeletingWindow ? "Deleting..." : "Delete Slot"}
              </Button>
            </div>
          }
        >
          <div className="space-y-3 py-2 text-xs">
            <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3.5 space-y-1.5">
              <div className="flex items-center gap-2 text-rose-900 font-bold">
                <Clock className="size-4 text-rose-600" />
                <span>
                  {new Date(deleteTargetWindow.starts_at).toLocaleDateString("en-IN", {
                    weekday: "long",
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
              <p className="text-slate-800 font-semibold text-xs pl-6">
                Time: {formatTime(new Date(deleteTargetWindow.starts_at))} – {formatTime(new Date(deleteTargetWindow.ends_at))}
              </p>
            </div>
            <p className="text-[11px] text-slate-500 italic">
              Note: If a client has already confirmed a booking inside these hours, the slot cannot be deleted until that appointment is rescheduled or cancelled.
            </p>
          </div>
        </Modal>
      )}

      {/* 6. Manage All Active Slots Modal (সব স্লট তালিকা ও নিয়ন্ত্রণ) */}
      {manageSlotsModalOpen && (
        <Modal
          open={manageSlotsModalOpen}
          onClose={() => setManageSlotsModalOpen(false)}
          title={`Manage Active Slots (${windows.length} Open Windows)`}
          description="View and delete any of your open consultation hours. Removing a slot immediately frees your calendar and updates the website."
          footer={
            <div className="flex items-center justify-end w-full">
              <Button variant="secondary" onClick={() => setManageSlotsModalOpen(false)}>
                Close
              </Button>
            </div>
          }
        >
          <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto pr-1">
            {windows.length === 0 ? (
              <div className="text-center py-8 text-slate-400 space-y-2">
                <Clock className="size-8 mx-auto text-slate-300" />
                <p className="font-bold text-xs">No active slots opened</p>
                <p className="text-[11px]">Click on any calendar day or time to open availability.</p>
              </div>
            ) : (
              windows.map((w) => {
                const s = new Date(w.starts_at);
                const e = new Date(w.ends_at);
                const isPast = e.getTime() < Date.now();
                return (
                  <div
                    key={w.id}
                    className={cn(
                      "flex items-center justify-between gap-3 p-3.5 rounded-2xl border transition-all",
                      isPast
                        ? "bg-slate-50 border-slate-200 opacity-60"
                        : "bg-white border-slate-200 hover:border-sky-300 shadow-2xs"
                    )}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">
                          {s.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                        </span>
                        {isPast && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-slate-200 text-slate-600">
                            Past
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-sky-800 font-semibold tabular-nums">
                        {formatTime(s)} – {formatTime(e)}
                      </p>
                    </div>

                    {onRemoveWindow && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setManageSlotsModalOpen(false);
                          setDeleteTargetWindow(w);
                        }}
                        className="text-rose-600 border-rose-200 hover:bg-rose-50 text-xs font-bold shrink-0"
                      >
                        <Trash2 className="size-3.5 mr-1" />
                        Delete
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

/* =========================================================================
   1. WEEK VIEW (The Core Google Calendar Experience)
========================================================================= */
function WeekCalendarView({
  weekDays,
  bookings,
  windows,
  now,
  onSlotClick,
  onOpenSession,
  getGoogleCalendarUrl,
  onDeleteWindow,
}: {
  weekDays: Date[];
  bookings: Appointment[];
  windows: Array<{ id: string; day: string; starts_at: string; ends_at: string }>;
  now: Date;
  onSlotClick: (date: Date, hour: number) => void;
  onOpenSession: (appointment: Appointment) => void;
  getGoogleCalendarUrl: (a: Appointment) => string;
  onDeleteWindow?: (w: { id: string; starts_at: string; ends_at: string; day: string }) => void;
}) {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to 9 AM or current hour on mount
  React.useEffect(() => {
    if (scrollContainerRef.current) {
      const currentHour = now.getHours();
      const targetHour = Math.max(currentHour - 1, 8);
      const targetScroll = (targetHour - 6) * HOUR_HEIGHT;
      scrollContainerRef.current.scrollTop = targetScroll;
    }
  }, []);

  const todayKey = formatDateKey(now);

  return (
    <div className="flex flex-col flex-1 select-none">
      {/* Week Header Row */}
      <div className="grid grid-cols-[64px_repeat(7,1fr)] border-b border-slate-200 bg-white sticky top-0 z-20 shadow-xs">
        <div className="p-3 text-center border-r border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-end justify-center pb-2">
          Time
        </div>

        {weekDays.map((d) => {
          const isToday = formatDateKey(d) === todayKey;
          const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
          const dayNum = d.getDate();

          return (
            <div
              key={d.toISOString()}
              className={cn(
                "p-2.5 text-center border-r border-slate-100 transition-colors",
                isToday ? "bg-amber-50/50" : "bg-white",
              )}
            >
              <p
                className={cn(
                  "text-[10px] font-extrabold uppercase tracking-wider",
                  isToday ? "text-amber-600" : "text-slate-400",
                )}
              >
                {dayName}
              </p>
              <div className="mt-1 flex justify-center">
                <span
                  className={cn(
                    "inline-flex size-8 items-center justify-center rounded-full font-display text-sm font-black transition-all",
                    isToday
                      ? "bg-amber-500 text-white shadow-[0_4px_10px_rgba(245,158,11,0.4)]"
                      : "text-slate-800",
                  )}
                >
                  {dayNum}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Week Scrollable Time Grid */}
      <div
        ref={scrollContainerRef}
        className="relative overflow-y-auto max-h-[640px] grid grid-cols-[64px_repeat(7,1fr)] bg-slate-50/20"
      >
        {/* Time labels column */}
        <div className="border-r border-slate-100 bg-white text-right pr-2 select-none">
          {HOURS.map((h) => {
            const timeDate = new Date();
            timeDate.setHours(h, 0, 0, 0);
            return (
              <div
                key={h}
                style={{ height: `${HOUR_HEIGHT}px` }}
                className="relative -top-2 text-[10px] font-bold text-slate-400"
              >
                {formatTime(timeDate)}
              </div>
            );
          })}
        </div>

        {/* 7 Days Columns */}
        {weekDays.map((colDate) => {
          const dateKey = formatDateKey(colDate);
          const isToday = dateKey === todayKey;

          // Windows active on this day
          const dayWindows = windows.filter((w) => {
            const wStart = new Date(w.starts_at);
            return formatDateKey(wStart) === dateKey;
          });

          // Bookings active on this day
          const dayBookings = bookings.filter((b) => {
            const bStart = new Date(b.starts_at);
            return formatDateKey(bStart) === dateKey;
          });

          // Current time needle position (if today)
          let currentMinutesOffset = -1;
          if (isToday) {
            const h = now.getHours();
            const m = now.getMinutes();
            if (h >= 6 && h <= 23) {
              currentMinutesOffset = (h - 6) * 60 + m;
            }
          }

          return (
            <div
              key={dateKey}
              className={cn(
                "relative border-r border-slate-100 transition-colors group",
                isToday ? "bg-amber-50/20" : "hover:bg-slate-50/40",
              )}
              style={{ height: `${HOURS.length * HOUR_HEIGHT}px` }}
            >
              {/* Hour horizontal grid lines & click handler */}
              {HOURS.map((h) => (
                <div
                  key={h}
                  onClick={() => onSlotClick(colDate, h)}
                  style={{ height: `${HOUR_HEIGHT}px` }}
                  className="border-b border-slate-100/90 cursor-pointer hover:bg-sky-50/30 transition-colors relative"
                  title={`Click to open availability at ${h}:00 on ${dateKey}`}
                />
              ))}

              {/* Availability Windows (Interactive Background Blocks) */}
              {dayWindows.map((w) => {
                const s = new Date(w.starts_at);
                const e = new Date(w.ends_at);
                const startMins = Math.max(0, (s.getHours() - 6) * 60 + s.getMinutes());
                const endMins = Math.min(HOURS.length * 60, (e.getHours() - 6) * 60 + e.getMinutes());
                const top = (startMins / 60) * HOUR_HEIGHT;
                const height = Math.max(26, ((endMins - startMins) / 60) * HOUR_HEIGHT);

                return (
                  <div
                    key={w.id}
                    style={{ top: `${top}px`, height: `${height}px` }}
                    className="absolute inset-x-1 rounded-xl bg-gradient-to-b from-sky-500/15 to-indigo-500/15 border border-sky-400/40 p-1.5 z-10 overflow-hidden hover:border-sky-500 hover:bg-sky-500/20 transition-all group/win"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="inline-flex items-center gap-1 rounded-md bg-sky-100/90 px-1.5 py-0.5 text-[9px] font-bold text-sky-900 shadow-2xs">
                        <Sparkles className="size-2.5 text-sky-600 shrink-0" />
                        <span className="truncate">Open: {formatTime(s)} – {formatTime(e)}</span>
                      </span>
                      {onDeleteWindow && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteWindow(w);
                          }}
                          className="size-5 rounded-md bg-white/95 hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer shadow-2xs shrink-0"
                          title="Delete this open availability slot"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Booked Appointments (Event Cards) */}
              {dayBookings.map((b) => {
                const s = new Date(b.starts_at);
                const e = new Date(b.ends_at);
                const startMins = Math.max(0, (s.getHours() - 6) * 60 + s.getMinutes());
                const endMins = Math.min(HOURS.length * 60, (e.getHours() - 6) * 60 + e.getMinutes());
                const top = (startMins / 60) * HOUR_HEIGHT;
                const height = Math.max(34, ((endMins - startMins) / 60) * HOUR_HEIGHT);

                const isCancelled = b.status === "cancelled";
                const isCompleted = b.status === "completed";
                const isNoShow = Boolean(b.is_no_show);
                const pillar = b.consultation_pillar ? PILLAR_ICONS[b.consultation_pillar] : null;

                return (
                  <div
                    key={b.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenSession(b);
                    }}
                    style={{ top: `${top}px`, height: `${height}px` }}
                    className={cn(
                      "absolute inset-x-1.5 rounded-xl p-2 cursor-pointer z-20 transition-all shadow-xs overflow-hidden flex flex-col justify-between border",
                      isCancelled
                        ? "bg-rose-50 text-rose-800 border-rose-300 opacity-70"
                        : isNoShow
                        ? "bg-amber-50 text-amber-950 border-amber-400 hover:shadow-md"
                        : isCompleted
                        ? "bg-emerald-50 text-emerald-900 border-emerald-300 hover:shadow-md"
                        : "bg-gradient-to-tr from-sky-600 to-indigo-600 text-white border-sky-400 hover:shadow-lg hover:scale-[1.01]",
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 leading-tight">
                        <span className="font-bold text-[11px] truncate">
                          {b.peer?.name || "Client"}
                        </span>
                        {pillar && (
                          <span className="text-[10px] shrink-0" title={pillar.label}>
                            {pillar.icon}
                          </span>
                        )}
                      </div>

                      <p
                        className={cn(
                          "text-[9px] font-medium truncate mt-0.5",
                          isCancelled
                            ? "text-rose-600"
                            : isNoShow
                            ? "text-amber-800"
                            : isCompleted
                            ? "text-emerald-700"
                            : "text-sky-100",
                        )}
                      >
                        {formatTime(s)} – {formatTime(e)} ({b.minutes}m)
                      </p>
                    </div>

                    {height >= 50 && (
                      <div className="flex items-center justify-between text-[9px] font-bold mt-1 pt-1 border-t border-white/20">
                        <span className="uppercase tracking-wider">
                          {isNoShow ? "Client No-Show" : APPOINTMENT_STATUS_LABELS[b.status]}
                        </span>
                        <a
                          href={getGoogleCalendarUrl(b)}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="hover:underline opacity-80 hover:opacity-100"
                          title="Add to Google Calendar"
                        >
                          📅 GCal
                        </a>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Google Calendar Current Time Red Laser Needle */}
              {isToday && currentMinutesOffset >= 0 && (
                <div
                  style={{ top: `${(currentMinutesOffset / 60) * HOUR_HEIGHT}px` }}
                  className="absolute inset-x-0 z-30 pointer-events-none flex items-center"
                >
                  <span className="size-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.9)] -ml-1 animate-pulse" />
                  <div className="h-0.5 flex-1 bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.7)]" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* =========================================================================
   2. MONTH VIEW (Classic Month Grid with Event Chips)
========================================================================= */
function MonthCalendarView({
  currentDate,
  bookings,
  windows,
  onSelectDate,
  onOpenSession,
}: {
  currentDate: Date;
  bookings: Appointment[];
  windows: Array<{ id: string; day: string; starts_at: string; ends_at: string }>;
  onSelectDate: (d: Date) => void;
  onOpenSession: (appointment: Appointment) => void;
}) {
  const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const startDay = monthStart.getDay(); // 0 is Sunday
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();

  // Offset to start on Monday
  const paddingDays = startDay === 0 ? 6 : startDay - 1;
  const totalCells = Math.ceil((paddingDays + daysInMonth) / 7) * 7;

  const todayKey = formatDateKey(new Date());

  const days = [];
  for (let i = 0; i < totalCells; i++) {
    const dayOffset = i - paddingDays + 1;
    const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayOffset);
    const isCurrentMonth = dayOffset > 0 && dayOffset <= daysInMonth;
    days.push({ date: dateObj, isCurrentMonth });
  }

  return (
    <div className="flex flex-col flex-1">
      {/* Weekday Names Header */}
      <div className="grid grid-cols-7 border-b border-slate-200 bg-white text-center text-[10px] font-bold uppercase tracking-wider text-slate-400 py-2.5">
        <span>Mon</span>
        <span>Tue</span>
        <span>Wed</span>
        <span>Thu</span>
        <span>Fri</span>
        <span>Sat</span>
        <span>Sun</span>
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-100 gap-px">
        {days.map(({ date, isCurrentMonth }) => {
          const key = formatDateKey(date);
          const isToday = key === todayKey;

          const dayBookings = bookings.filter((b) => formatDateKey(new Date(b.starts_at)) === key);
          const dayWindows = windows.filter((w) => formatDateKey(new Date(w.starts_at)) === key);

          return (
            <div
              key={key}
              onClick={() => onSelectDate(date)}
              className={cn(
                "min-h-[110px] p-2 bg-white flex flex-col justify-between cursor-pointer transition-colors hover:bg-sky-50/20 group",
                !isCurrentMonth && "bg-slate-50/60 text-slate-400",
                isToday && "ring-2 ring-inset ring-amber-400",
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "inline-flex size-6 items-center justify-center rounded-full text-xs font-bold",
                    isToday ? "bg-amber-500 text-white font-black" : "text-slate-700",
                  )}
                >
                  {date.getDate()}
                </span>

                {dayWindows.length > 0 && (
                  <span className="size-2 rounded-full bg-sky-500" title="Open Window active" />
                )}
              </div>

              {/* Event Chips */}
              <div className="mt-1 space-y-1 overflow-hidden">
                {dayBookings.slice(0, 3).map((b) => (
                  <div
                    key={b.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenSession(b);
                    }}
                    className={cn(
                      "rounded-md px-1.5 py-0.5 text-[9px] font-bold truncate flex items-center justify-between gap-1",
                      b.status === "booked"
                        ? "bg-sky-100 text-sky-900 border border-sky-300"
                        : b.status === "completed"
                        ? "bg-emerald-100 text-emerald-900"
                        : "bg-slate-100 text-slate-500 line-through",
                    )}
                  >
                    <span className="truncate">{b.peer?.name || "Client"}</span>
                    <span className="text-[8px] opacity-75 shrink-0">
                      {formatTime(new Date(b.starts_at))}
                    </span>
                  </div>
                ))}

                {dayBookings.length > 3 && (
                  <p className="text-[9px] font-bold text-slate-400 pl-1">
                    +{dayBookings.length - 3} more
                  </p>
                )}
              </div>

              <div className="text-[9px] text-slate-400 group-hover:text-sky-600 transition-colors pt-1">
                {dayWindows.length > 0 ? `${dayWindows.length} open window(s)` : ""}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* =========================================================================
   3. DAY VIEW (Detailed 24-Hour Consultation Chamber Timeline)
========================================================================= */
function DayCalendarView({
  date,
  bookings,
  windows,
  now,
  onSlotClick,
  onOpenSession,
  onOpenPrescription,
  onCancelAppointment,
  onCompleteAppointment,
  getGoogleCalendarUrl,
  onDeleteWindow,
}: {
  date: Date;
  bookings: Appointment[];
  windows: Array<{ id: string; day: string; starts_at: string; ends_at: string }>;
  now: Date;
  onSlotClick: (hour: number) => void;
  onOpenSession: (appointment: Appointment) => void;
  onOpenPrescription: (appointment: Appointment) => void;
  onCancelAppointment: (appointmentId: string) => void;
  onCompleteAppointment: (appointmentId: string) => void;
  getGoogleCalendarUrl: (a: Appointment) => string;
  onDeleteWindow?: (w: { id: string; starts_at: string; ends_at: string; day: string }) => void;
}) {
  const dateKey = formatDateKey(date);
  const isToday = dateKey === formatDateKey(now);

  const dayBookings = bookings.filter((b) => formatDateKey(new Date(b.starts_at)) === dateKey);
  const dayWindows = windows.filter((w) => formatDateKey(new Date(w.starts_at)) === dateKey);

  return (
    <div className="p-6 space-y-6">
      {/* Day Overview Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h3 className="font-display text-lg font-bold text-slate-900">
            {date.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </h3>
          <p className="text-xs text-slate-500">
            {dayBookings.length} booking(s) scheduled · {dayWindows.length} open window(s) active
          </p>
        </div>

        <Button size="sm" onClick={() => onSlotClick(18)} className="bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs">
          <Plus className="size-3.5 mr-1" />
          <span>Open New Hours on this Day</span>
        </Button>
      </div>

      {/* Active Open Slots on this Day */}
      {dayWindows.length > 0 && (
        <div className="rounded-2xl border border-sky-200/80 bg-gradient-to-br from-sky-50/70 via-indigo-50/30 to-slate-50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sky-950 flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-sky-600" />
              <span>Active Open Consultation Hours (সক্রিয় খোলা স্লট)</span>
            </span>
            <span className="text-[11px] font-bold text-sky-700 bg-sky-100 px-2.5 py-0.5 rounded-full">
              {dayWindows.length} Active Window{dayWindows.length > 1 ? "s" : ""}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {dayWindows.map((w) => {
              const s = new Date(w.starts_at);
              const e = new Date(w.ends_at);
              return (
                <div
                  key={w.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-sky-200 bg-white p-3 shadow-2xs hover:border-sky-300 transition-all"
                >
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-800 tabular-nums">
                      {formatTime(s)} – {formatTime(e)}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Duration: {Math.round((e.getTime() - s.getTime()) / 60000)} mins
                    </p>
                  </div>
                  {onDeleteWindow && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onDeleteWindow(w)}
                      className="text-rose-600 border-rose-200 hover:bg-rose-50 text-xs font-bold shrink-0"
                      title="Delete this open slot"
                    >
                      <Trash2 className="size-3.5 mr-1" />
                      Delete
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Hourly View */}
      <div className="space-y-4">
        {HOURS.map((h) => {
          const hourStart = new Date(date);
          hourStart.setHours(h, 0, 0, 0);
          const hourEnd = new Date(date);
          hourEnd.setHours(h + 1, 0, 0, 0);

          const slotBookings = dayBookings.filter((b) => {
            const s = new Date(b.starts_at);
            return s.getHours() === h;
          });

          const isWindowActive = dayWindows.some((w) => {
            const s = new Date(w.starts_at);
            const e = new Date(w.ends_at);
            return s <= hourStart && hourEnd <= e;
          });

          return (
            <div
              key={h}
              className={cn(
                "rounded-2xl border p-4 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4",
                slotBookings.length > 0
                  ? "bg-white border-sky-300 shadow-sm"
                  : isWindowActive
                  ? "bg-sky-50/40 border-sky-200"
                  : "bg-slate-50/30 border-slate-200/70 hover:bg-slate-50",
              )}
            >
              <div className="flex items-center gap-3">
                <span className="font-display text-sm font-bold text-slate-700 min-w-[70px]">
                  {formatTime(hourStart)}
                </span>

                {isWindowActive && (
                  <span className="rounded-full bg-sky-100 text-sky-800 px-2.5 py-0.5 text-[10px] font-bold">
                    Open Window
                  </span>
                )}
              </div>

              {slotBookings.length > 0 ? (
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {slotBookings.map((b) => (
                    <div
                      key={b.id}
                      onClick={() => onOpenSession(b)}
                      className="rounded-xl border border-slate-200 p-3 bg-white hover:border-sky-400 cursor-pointer transition-all shadow-2xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900">{b.peer?.name || "Client"}</span>
                        {b.is_no_show ? (
                          <Badge tone="gold">Client No-Show</Badge>
                        ) : (
                          <Badge tone={b.status === "booked" ? "green" : b.status === "completed" ? "blue" : "red"}>
                            {APPOINTMENT_STATUS_LABELS[b.status]}
                          </Badge>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-500">
                        {formatTime(new Date(b.starts_at))} – {formatTime(new Date(b.ends_at))} ({b.minutes} min)
                      </p>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenPrescription(b);
                          }}
                          className="text-amber-700 font-bold hover:underline"
                        >
                          📜 Prescription
                        </button>

                        <a
                          href={getGoogleCalendarUrl(b)}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-sky-600 font-bold hover:underline"
                        >
                          📅 Add to GCal
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onSlotClick(h)}
                  className="text-xs font-semibold text-slate-400 hover:text-sky-600 transition-colors"
                >
                  + Click to open slot at this hour
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* =========================================================================
   4. AGENDA / LIST VIEW (Mobile Friendly Chronological Feed)
========================================================================= */
function AgendaCalendarView({
  bookings,
  onOpenSession,
  onOpenPrescription,
  onCancelAppointment,
  onCompleteAppointment,
  getGoogleCalendarUrl,
}: {
  bookings: Appointment[];
  onOpenSession: (appointment: Appointment) => void;
  onOpenPrescription: (appointment: Appointment) => void;
  onCancelAppointment: (appointmentId: string) => void;
  onCompleteAppointment: (appointmentId: string) => void;
  getGoogleCalendarUrl: (a: Appointment) => string;
}) {
  const sorted = React.useMemo(() => {
    return [...bookings].sort(
      (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
    );
  }, [bookings]);

  if (!sorted.length) {
    return (
      <div className="p-12 text-center text-slate-400">
        <Clock className="size-10 mx-auto text-slate-300 mb-2" />
        <p className="text-sm font-bold text-slate-700">No scheduled appointments on record</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      {sorted.map((b) => {
        const s = new Date(b.starts_at);
        const e = new Date(b.ends_at);
        const pillar = b.consultation_pillar ? PILLAR_ICONS[b.consultation_pillar] : null;

        return (
          <div
            key={b.id}
            onClick={() => onOpenSession(b)}
            className="rounded-2xl border border-slate-200 bg-white p-4.5 hover:border-slate-300 transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs"
          >
            <div className="flex items-start gap-3.5">
              <Avatar name={b.peer?.name || "Client"} src={b.peer?.avatar_url ?? undefined} size="md" />
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm text-slate-900">{b.peer?.name || "Client"}</h4>
                  {b.is_no_show ? (
                    <Badge tone="gold">Client No-Show</Badge>
                  ) : (
                    <Badge tone={b.status === "booked" ? "green" : b.status === "completed" ? "blue" : "red"}>
                      {APPOINTMENT_STATUS_LABELS[b.status]}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  📅 {s.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} · {formatTime(s)} – {formatTime(e)} ({b.minutes} mins)
                </p>
                {pillar && (
                  <p className="text-xs text-amber-700 font-semibold mt-1">
                    {pillar.icon} {pillar.label}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={getGoogleCalendarUrl(b)}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all"
              >
                📅 Add to GCal
              </a>
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenPrescription(b);
                }}
              >
                Prescription
              </Button>
              <Button size="sm" onClick={() => onOpenSession(b)}>
                Open Session
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
