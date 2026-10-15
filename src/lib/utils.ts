import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

import type { ConsultationMode, RateCard } from "@/types";

/** Tailwind-aware className joiner. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "INR"): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-IN").format(value);
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/** "3 minutes ago", for activity lists. */
export function timeAgo(value: string | Date | null | undefined): string {
  if (!value) return "never";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "never";

  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const steps: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, "second"],
    [60, "minute"],
    [24, "hour"],
    [7, "day"],
    [4.345, "week"],
    [12, "month"],
  ];

  let amount = seconds;
  for (const [size, unit] of steps) {
    if (Math.abs(amount) < size) return rtf.format(-Math.round(amount), unit);
    amount /= size;
  }
  return rtf.format(-Math.round(amount), "year");
}

export function initials(name: string | null | undefined, fallback = "?"): string {
  if (!name?.trim()) return fallback;
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

/** "vedic_astrology" -> "Vedic Astrology" */
export function titleCase(value: string): string {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * What a user actually pays for a mode — the offer rate when one is set.
 *
 * Written against the real `RateCard` rather than an index signature, because
 * the card also carries `currency`, which is not a number.
 */
const BASE_KEYS = {
  chat: "chat_per_minute",
  call: "call_per_minute",
  video: "video_per_minute",
} as const;

const OFFER_KEYS = {
  chat: "offer_chat_per_minute",
  call: "offer_call_per_minute",
  video: "offer_video_per_minute",
} as const;

export function baseRate(rates: RateCard, mode: ConsultationMode): number {
  return rates[BASE_KEYS[mode]] ?? 0;
}

export function effectiveRate(rates: RateCard, mode: ConsultationMode): number {
  const offer = rates[OFFER_KEYS[mode]];
  return typeof offer === "number" ? offer : baseRate(rates, mode);
}

export function hasDiscount(rates: RateCard, mode: ConsultationMode): boolean {
  const offer = rates[OFFER_KEYS[mode]];
  return typeof offer === "number" && offer < baseRate(rates, mode);
}

export function debounce<A extends unknown[]>(fn: (...args: A) => void, ms = 300) {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: A) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}
