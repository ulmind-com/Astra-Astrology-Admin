"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Clock, IndianRupee, Plus, Trash2 } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

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
function Schedule() {
  const queryClient = useQueryClient();
  const { data: bookings, isLoading } = useQuery({
    queryKey: SCHEDULE_KEY,
    queryFn: () => appointmentApi.schedule(true),
    // A booking can arrive while this page is open.
    refetchInterval: 30_000,
  });

  const cancel = useMutation({
    mutationFn: (id: string) => appointmentApi.cancel(id, "Cancelled by the astrologer"),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SCHEDULE_KEY });
      toast.success("Appointment cancelled.");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming bookings</CardTitle>
        <CardDescription>What you have been booked for, soonest first.</CardDescription>
      </CardHeader>
      <CardBody>
        {isLoading ? (
          <LoadingBlock label="Loading your bookings…" />
        ) : !bookings?.length ? (
          <EmptyState
            icon={CalendarDays}
            title="Nothing booked yet"
            description="Bookings appear here as soon as someone takes a slot."
          />
        ) : (
          <ul className="divide-y divide-border">
            {bookings.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {dayLabel(a.starts_at)} · {clock(a.starts_at)} – {clock(a.ends_at)}
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {a.peer?.name ?? "Someone"} · {a.minutes} min
                    {a.user_note ? ` · “${a.user_note}”` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold tabular-nums">₹{rupees(a.price_paise)}</p>
                  <p className="text-xs text-muted-foreground">
                    ₹{rupees(a.balance_due_paise)} to collect
                  </p>
                </div>
                <Badge tone={a.status === "booked" ? "green" : "neutral"}>
                  {APPOINTMENT_STATUS_LABELS[a.status]}
                </Badge>
                {a.status === "booked" && (
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
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
