"use client";

import { Loader2 } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg" | "icon";

// Primary is the one gradient pill on a screen — the reference design uses it
// sparingly, and so does this, so the next step is always obvious.
const VARIANTS: Record<Variant, string> = {
  primary: "btn-cosmic text-white",
  secondary:
    "bg-surface-muted text-foreground border border-border hover:border-border-strong hover:bg-surface-raised",
  outline:
    "border border-border-strong bg-transparent text-foreground hover:bg-surface-muted",
  ghost: "bg-transparent text-muted-foreground hover:bg-surface-muted hover:text-foreground",
  danger: "bg-danger-surface text-danger border border-danger/40 hover:bg-danger/25",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3.5 text-xs gap-1.5",
  md: "h-10 px-5 text-sm gap-2",
  lg: "h-12 px-7 text-base gap-2",
  icon: "h-10 w-10 p-0",
};

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "primary", size = "md", loading, disabled, children, ...props },
    ref,
  ) => (
    <button
      ref={ref}
      // A loading button stays disabled, so a double click cannot fire twice.
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center rounded-full font-medium",
        "transition-all disabled:cursor-not-allowed disabled:opacity-60",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  ),
);
Button.displayName = "Button";
