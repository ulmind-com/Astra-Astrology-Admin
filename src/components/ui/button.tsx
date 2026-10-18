"use client";

import { Loader2 } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg" | "icon";

const VARIANTS: Record<Variant, string> = {
  primary: "btn-cosmic text-white font-semibold",
  secondary:
    "bg-surface-muted text-foreground border border-border hover:border-border-strong hover:bg-surface-raised transition-all",
  outline:
    "border border-border-strong bg-transparent text-foreground hover:bg-surface-muted hover:border-brand-400/50 transition-all",
  ghost: "bg-transparent text-muted-foreground hover:bg-surface-muted hover:text-foreground transition-colors",
  danger:
    "bg-danger-surface text-danger border border-danger/40 hover:bg-danger/25 hover:border-danger/60 transition-all",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-4 text-xs gap-1.5 rounded-full",
  md: "h-10 px-5 text-sm gap-2 rounded-full",
  lg: "h-12 px-8 text-base gap-2.5 rounded-full",
  icon: "h-10 w-10 p-0 rounded-xl",
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
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center font-medium",
        "transition-all disabled:cursor-not-allowed disabled:opacity-55",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
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
