import * as React from "react";

import { cn } from "@/lib/utils";

type Tone = "brand" | "gold" | "green" | "red" | "neutral" | "blue";

const TONES: Record<Tone, string> = {
  brand: "bg-brand-100 text-brand-800 dark:bg-brand-900/50 dark:text-brand-200",
  gold: "bg-gold-100 text-gold-700 dark:bg-gold-500/15 dark:text-gold-300",
  green: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  red: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
  blue: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
  neutral: "bg-surface-muted text-muted-foreground border border-border",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        TONES[tone],
        className,
      )}
      {...props}
    />
  );
}

/** The green/grey dot used for an astrologer's online state. */
export function StatusDot({ online, busy }: { online: boolean; busy?: boolean }) {
  const tone = busy ? "bg-gold-500" : online ? "bg-emerald-500" : "bg-slate-400";
  return (
    <span className="relative flex size-2.5" aria-hidden>
      {online && !busy && (
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
      )}
      <span className={cn("relative inline-flex size-2.5 rounded-full", tone)} />
    </span>
  );
}
