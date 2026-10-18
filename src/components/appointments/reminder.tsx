"use client";

/**
 * Tells an astrologer an appointment is about to start.
 *
 * Worked out in the browser from the schedule it already has, rather than by
 * anything scheduled on the server: the panel is open, it knows when the next
 * booking is, and a timer is enough. A server-side job would need a scheduler,
 * a way to reach this particular browser, and a record of what it had already
 * sent — all to say something the page can work out for itself.
 *
 * Each booking is announced once. The id is remembered so that a refetch, a
 * route change or a re-render does not sound the alert again for a booking the
 * astrologer has already been told about.
 */

import { useQuery } from "@tanstack/react-query";
import * as React from "react";
import { toast } from "sonner";

import { useAlertOn } from "@/hooks/use-sound";
import { appointmentApi } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";

/** How long before the start to say something. */
const WARN_MINUTES = 5;
/** How often to re-check. Often enough that the warning is not late. */
const TICK_MS = 20_000;

export function AppointmentReminder() {
  const { user } = useAuth();
  const isAstrologer = user?.role === "astrologer";

  const { data: bookings } = useQuery({
    queryKey: ["appointments", "schedule"],
    queryFn: () => appointmentApi.schedule(true),
    enabled: isAstrologer,
    refetchInterval: 60_000,
    refetchIntervalInBackground: true,
  });

  const [dueId, setDueId] = React.useState<string | null>(null);
  const announced = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    if (!isAstrologer) return;

    const check = () => {
      const now = Date.now();
      const soon = (bookings ?? []).find((a) => {
        if (a.status !== "booked") return false;
        const starts = new Date(a.starts_at).getTime();
        const minutesAway = (starts - now) / 60_000;
        // Still ahead, and inside the warning window.
        return minutesAway > 0 && minutesAway <= WARN_MINUTES;
      });

      if (!soon || announced.current.has(soon.id)) return;
      announced.current.add(soon.id);
      setDueId(soon.id);

      const minutes = Math.max(
        1,
        Math.round((new Date(soon.starts_at).getTime() - now) / 60_000),
      );
      toast.info(`Appointment in ${minutes} minute${minutes === 1 ? "" : "s"}`, {
        description: `${soon.peer?.name ?? "Someone"} · ${soon.minutes} minutes`,
        duration: 15_000,
      });
    };

    check();
    const timer = window.setInterval(check, TICK_MS);
    return () => window.clearInterval(timer);
  }, [bookings, isAstrologer]);

  // The same alert a chat request makes, so "something needs you" sounds the
  // same whatever it is.
  useAlertOn("notify", dueId);

  return null;
}
