"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Clock, IndianRupee, Plus, RefreshCw, Trash2 } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

import { PanelHeader } from "@/components/layout/panel-shell";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  Field,
  Input,
  LoadingBlock,
  Switch,
} from "@/components/ui";
import { appointmentApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/providers/auth-provider";
import { APPOINTMENT_STATUS_LABELS } from "@/types";

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
  return new Date(iso).toLocaleDateString([], {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function clock(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function AppointmentsPage() {
  const { user } = useAuth();
  const isAstrologer = user?.role === "astrologer";

  if (!isAstrologer) {
    return (
      <>
        <PanelHeader title="Appointments" />
        <Alert tone="info">Only astrologers have a booking calendar.</Alert>
      </>
    );
  }

  return (
    <>
      <PanelHeader
        title="Appointments"
        description="What you charge, when you are free, and who has booked you."
      />
      <PriceCard />
      <OpenHours />
      <Schedule />
    </>
  );
}

/* ------------------------------------------------------------------ price */
function PriceCard() {
  const queryClient = useQueryClient();
  const { data: card, isLoading } = useQuery({
    queryKey: CARD_KEY,
    queryFn: () => appointmentApi.card(),
  });

  const [form, setForm] = React.useState({ rupees: "", block: "30" });
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    if (card && !ready) {
      setForm({ rupees: String(card.price_paise / 100), block: String(card.block_minutes) });
      setReady(true);
    }
  }, [card, ready]);

  const save = useMutation({
    mutationFn: (body: { enabled?: boolean; price_paise?: number; block_minutes?: number }) =>
      appointmentApi.updateCard(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CARD_KEY });
      toast.success("Saved.");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });

  if (isLoading || !card) return <LoadingBlock label="Loading your price…" />;

  const price = Number(form.rupees);
  const block = Number(form.block);

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>
          <span className="flex items-center gap-2">
            <IndianRupee className="size-4 text-brand-700" />
            What you charge
          </span>
        </CardTitle>
        <CardDescription>
          Quote a block — &ldquo;30 minutes for ₹250&rdquo;. Any other length is worked
          out from it, so a 40-minute booking needs no separate price.
        </CardDescription>
      </CardHeader>
      <CardBody className="space-y-5">
        <Switch
          checked={card.enabled}
          label="Take appointments"
          description={
            card.enabled
              ? "People can book you from the website."
              : "Your calendar is hidden until this is on."
          }
          onChange={(next) => save.mutate({ enabled: next })}
        />

        <div className="flex flex-wrap gap-4">
          <Field label="Price (₹)" required className="w-36">
            <Input
              type="number"
              min={0}
              step={1}
              value={form.rupees}
              onChange={(e) => setForm((f) => ({ ...f, rupees: e.target.value }))}
            />
          </Field>
          <Field label="for how many minutes" required className="w-44">
            <Input
              type="number"
              min={5}
              step={5}
              value={form.block}
              onChange={(e) => setForm((f) => ({ ...f, block: e.target.value }))}
            />
          </Field>
        </div>

        {price > 0 && block > 0 && (
          <div className="rounded-xl border border-border bg-surface-muted/50 p-4 text-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              So a booking costs
            </p>
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1">
              {[30, 60, 40].map((m) => (
                <span key={m}>
                  <strong className="tabular-nums">{m} min</strong>{" "}
                  <span className="text-muted-foreground">
                    ₹{rupees(Math.round((price * 100 * m) / block))}
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}

        <Button
          loading={save.isPending}
          onClick={() =>
            save.mutate({ price_paise: Math.round(price * 100), block_minutes: block })
          }
          disabled={!(price > 0 && block >= 5)}
        >
          Save price
        </Button>
      </CardBody>
    </Card>
  );
}

/* ------------------------------------------------------------- open hours */
function OpenHours() {
  const queryClient = useQueryClient();
  const { data: windows, isLoading } = useQuery({
    queryKey: WINDOWS_KEY,
    queryFn: () => appointmentApi.windows(),
  });

  // Defaults to this evening, which is when most people take bookings.
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
      toast.success("Hours opened.");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => appointmentApi.removeWindow(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: WINDOWS_KEY });
      toast.success("Hours closed.");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });

  // Grouped by day, because that is how someone thinks about their week.
  const byDay = React.useMemo(() => {
    const groups = new Map<string, typeof windows>();
    (windows ?? []).forEach((w) => {
      const key = w.day;
      groups.set(key, [...(groups.get(key) ?? []), w]);
    });
    return [...groups.entries()];
  }, [windows]);

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>
          <span className="flex items-center gap-2">
            <CalendarDays className="size-4 text-brand-700" />
            When you are free
          </span>
        </CardTitle>
        <CardDescription>
          Open a stretch of a day and people can book inside it. Times are yours —
          whatever your device is set to.
        </CardDescription>
      </CardHeader>
      <CardBody className="space-y-5">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="From" className="w-56">
            <Input type="datetime-local" step={300} value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label="Until" className="w-56">
            <Input type="datetime-local" step={300} value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
          <Button loading={add.isPending} onClick={() => add.mutate()}>
            <Plus className="size-4" />
            Open these hours
          </Button>
        </div>

        {isLoading ? (
          <LoadingBlock label="Loading your calendar…" />
        ) : byDay.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="No hours opened yet"
            description="Until you open some, nobody can book you."
          />
        ) : (
          <ul className="space-y-3">
            {byDay.map(([day, items]) => (
              <li key={day} className="rounded-xl border border-border p-4">
                <p className="font-display text-sm font-semibold">
                  {new Date(`${day}T00:00:00`).toLocaleDateString([], {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(items ?? []).map((w) => (
                    <span
                      key={w.id}
                      className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-muted px-3 py-1.5 text-xs"
                    >
                      <Clock className="size-3.5 text-brand-700" />
                      <span className="tabular-nums">
                        {clock(w.starts_at)} – {clock(w.ends_at)}
                      </span>
                      <button
                        type="button"
                        aria-label="Close these hours"
                        onClick={() => remove.mutate(w.id)}
                        className="text-muted-foreground transition-colors hover:text-danger"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}

/* --------------------------------------------------------------- schedule */
type ScheduleTab = "upcoming" | "today" | "all" | "past";

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

function Schedule() {
  const queryClient = useQueryClient();
  const [tab, setTab] = React.useState<ScheduleTab>("upcoming");

  // Fetch all appointments so the astrologer has complete visibility
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
      toast.success("Appointment cancelled.");
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
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Bookings & Schedule</CardTitle>
          <CardDescription>
            {tab === "upcoming"
              ? "Upcoming appointments, soonest first."
              : tab === "today"
                ? "All appointments scheduled for today."
                : tab === "past"
                  ? "Completed, missed, and past appointments."
                  : "All appointments on record."}
          </CardDescription>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Tabs */}
          <div className="inline-flex rounded-lg border border-border bg-surface-muted p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setTab("upcoming")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-colors",
                tab === "upcoming"
                  ? "bg-brand text-brand-950 font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span>Upcoming</span>
              {upcomingList.length > 0 && (
                <span className="rounded-full bg-brand-950/15 px-1.5 py-0.2 text-[10px] font-bold">
                  {upcomingList.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setTab("today")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-colors",
                tab === "today"
                  ? "bg-brand text-brand-950 font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span>Today</span>
              {todayList.length > 0 && (
                <span className="rounded-full bg-brand-950/15 px-1.5 py-0.2 text-[10px] font-bold">
                  {todayList.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setTab("all")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-colors",
                tab === "all"
                  ? "bg-brand text-brand-950 font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span>All</span>
              {allBookings.length > 0 && (
                <span className="rounded-full bg-brand-950/15 px-1.5 py-0.2 text-[10px] font-bold">
                  {allBookings.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setTab("past")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-colors",
                tab === "past"
                  ? "bg-brand text-brand-950 font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span>Past</span>
              {pastList.length > 0 && (
                <span className="rounded-full bg-brand-950/15 px-1.5 py-0.2 text-[10px] font-bold">
                  {pastList.length}
                </span>
              )}
            </button>
          </div>

          {/* Refresh Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              void refetch();
              toast.success("Schedule refreshed.");
            }}
            disabled={isFetching}
            title="Refresh bookings"
            className="h-8 px-2 text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={cn("size-3.5", isFetching && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>
      <CardBody>
        {isLoading ? (
          <LoadingBlock label="Loading your bookings…" />
        ) : !displayedList.length ? (
          <div className="py-6">
            <EmptyState
              icon={CalendarDays}
              title={
                tab === "upcoming"
                  ? "No upcoming bookings"
                  : tab === "today"
                    ? "No bookings today"
                    : tab === "past"
                      ? "No past bookings"
                      : "Nothing booked yet"
              }
              description={
                tab === "upcoming" && allBookings.length > 0
                  ? "You have no upcoming future slots, but you have bookings on record."
                  : "Bookings appear here as soon as someone takes a slot."
              }
            />
            {tab === "upcoming" && allBookings.length > 0 && (
              <div className="mt-4 flex justify-center">
                <Button variant="secondary" size="sm" onClick={() => setTab("all")}>
                  View All ({allBookings.length}) Bookings
                </Button>
              </div>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {displayedList.map((a) => {
              const isTodayBooking = isSameDay(a.starts_at);
              const upcoming = isUpcoming(a);

              return (
                <li key={a.id} className="flex flex-wrap items-center gap-4 py-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-foreground">
                        {dayRelative(a.starts_at)} · {clock(a.starts_at)} – {clock(a.ends_at)}
                      </p>
                      {isTodayBooking && (
                        <span className="rounded-full border border-amber-300/40 bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900 dark:bg-amber-950/60 dark:text-amber-200">
                          TODAY
                        </span>
                      )}
                      {!upcoming && a.status === "booked" && (
                        <span className="rounded-full border border-border bg-surface-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          Ended
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-foreground/80">
                      <span className="font-medium text-foreground">
                        {a.peer?.name ?? "Client"}
                      </span>
                      <span className="text-muted-foreground"> · {a.minutes} min consultation</span>
                    </p>
                    {a.user_note && (
                      <p className="mt-1 inline-block rounded-md bg-surface-muted/80 px-2.5 py-1 text-xs text-muted-foreground italic">
                        “{a.user_note}”
                      </p>
                    )}
                  </div>

                  <div className="text-right">
                    <p className="font-semibold tabular-nums text-foreground">
                      ₹{rupees(a.price_paise)}
                    </p>
                    {a.balance_due_paise > 0 ? (
                      <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                        ₹{rupees(a.balance_due_paise)} to collect
                      </p>
                    ) : (
                      <p className="text-xs font-medium text-success">Fully paid</p>
                    )}
                    <p className="text-[11px] text-muted-foreground tabular-nums">
                      Deposit: ₹{rupees(a.deposit_paise)} ({a.deposit_coins} coins)
                    </p>
                  </div>

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

                  {a.status === "booked" && upcoming && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-danger hover:bg-danger/15"
                      loading={cancel.isPending}
                      onClick={() => cancel.mutate(a.id)}
                    >
                      Cancel
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
