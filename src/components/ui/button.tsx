"use client";

import { Loader2 } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg" | "icon";

// Primary is the one yellow pill on a screen. The design is explicit about
// this: the brand colour marks the single action that matters, and using it
// twice on one view is what makes it stop meaning anything.
const VARIANTS: Record<Variant, string> = {
  primary: "btn-cosmic",
  secondary:
    "bg-transparent text-foreground border border-border-strong hover:bg-brand-100",
  outline: "border border-border-strong bg-transparent text-foreground hover:bg-brand-100",
  ghost: "bg-transparent text-muted-foreground hover:bg-brand-100 hover:text-foreground",
  danger: "bg-danger-surface text-danger border border-danger/30 hover:bg-danger/15",
};

// Generous horizontal padding, so an action feels substantial rather than
// cramped. The medium height is the 51px the spec asks for.
const SIZES: Record<Size, string> = {
  sm: "h-9 px-5 text-xs gap-1.5",
  md: "h-[51px] px-8 text-[15px] gap-2",
  lg: "h-[56px] px-9 text-base gap-2",
  icon: "h-11 w-11 p-0",
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
