import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

import type { ConsultationMode, ResolvedRates } from "@/types";

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
/**
 * Coins per started minute, by mode.
 *
 * The public payload has the platform default already filled in, so there is
 * no blank to interpret here — a card can print the number it is given.
 */
const RATE_KEYS = {
  chat: "chat_coins_per_minute",
  call: "call_coins_per_minute",
  video: "video_coins_per_minute",
} as const;

export function coinsPerMinute(rates: ResolvedRates, mode: ConsultationMode): number {
  return rates[RATE_KEYS[mode]] ?? 0;
}

export function debounce<A extends unknown[]>(fn: (...args: A) => void, ms = 300) {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: A) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}
