"use client";

import { Check, CheckCheck, Clock } from "lucide-react";

import { cn } from "@/lib/utils";
import type { DeliveryState } from "@/lib/chat";

/**
 * The WhatsApp ticks.
 *
 *   clock   — still leaving this device
 *   ✓       — Firestore has it
 *   ✓✓      — the other app has it
 *   ✓✓ blue — they actually read it
 *
 * Only ever shown on your own messages: a tick on someone else's tells you
 * nothing you did not already know.
 */
export function DeliveryTicks({
  state,
  className,
}: {
  state: DeliveryState;
  className?: string;
}) {
  const label = {
    pending: "Sending",
    sent: "Sent",
    delivered: "Delivered",
    read: "Read",
  }[state];

  if (state === "pending") {
    return <Clock className={cn("size-3.5 opacity-70", className)} aria-label={label} />;
  }
  if (state === "sent") {
    return <Check className={cn("size-3.5 opacity-70", className)} aria-label={label} />;
  }
  return (
    <CheckCheck
      className={cn("size-3.5", state === "read" ? "text-info" : "opacity-70", className)}
      aria-label={label}
    />
  );
}
