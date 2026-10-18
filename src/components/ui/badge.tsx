import * as React from "react";

import { cn } from "@/lib/utils";

type Tone = "brand" | "gold" | "green" | "red" | "neutral" | "blue";

// Tinted glass rather than a solid chip: on the night sky a filled pastel
// badge reads as a hole punched in the page.
const TONES: Record<Tone, string> = {
  brand:
    "bg-brand-500/15 text-brand-200 border border-brand-400/40 shadow-[0_0_8px_-2px_rgb(168_85_247/0.3)]",
  gold:
    "bg-gold-500/12 text-gold-300 border border-gold-400/35 shadow-[0_0_8px_-2px_rgb(245_158_11/0.3)]",
  green: "bg-success-surface text-success border border-success/30",
  red: "bg-danger-surface text-danger border border-danger/30",
  blue: "bg-info-surface text-info border border-info/30",
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
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium leading-none tracking-wide",
        TONES[tone],
        className,
      )}
      {...props}
    />
  );
}

/** The green/grey/amber dot used for an astrologer's online state. */
export function StatusDot({ online, busy }: { online: boolean; busy?: boolean }) {
  const tone = busy ? "bg-gold-400" : online ? "bg-success" : "bg-brand-300/30";
  return (
    <span className="relative flex size-2.5" aria-hidden>
      {online && !busy && (
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-55" />
      )}
      <span className={cn("relative inline-flex size-2.5 rounded-full", tone)} />
    </span>
  );
}
