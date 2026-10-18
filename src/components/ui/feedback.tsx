"use client";

import { AlertTriangle, CheckCircle2, Info, Loader2, Search, XCircle } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <Loader2 className="size-6 animate-spin text-brand-400" />
    </div>
  );
}

export function LoadingBlock({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <div className="medallion flex size-14 items-center justify-center rounded-full animate-pulse-glow">
        <Loader2 className="size-6 animate-spin text-brand-200" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("shimmer rounded-xl", className)} />;
}

type AlertTone = "info" | "warning" | "error" | "success";

const ALERT_CONFIG: Record<AlertTone, { classes: string; Icon: React.ComponentType<{ className?: string }> }> = {
  info: {
    classes: "border-info/30 bg-info-surface text-info",
    Icon: Info,
  },
  warning: {
    classes: "border-warning/30 bg-warning-surface text-warning",
    Icon: AlertTriangle,
  },
  error: {
    classes: "border-danger/35 bg-danger-surface text-danger",
    Icon: XCircle,
  },
  success: {
    classes: "border-success/30 bg-success-surface text-success",
    Icon: CheckCircle2,
  },
};

export function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: AlertTone;
  title?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const { classes, Icon } = ALERT_CONFIG[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex gap-3 rounded-xl border px-4 py-3.5 text-sm",
        classes,
        className,
      )}
    >
      <Icon className="mt-0.5 size-4.5 shrink-0" aria-hidden />
      <div className="min-w-0">
        {title && <p className="font-semibold leading-snug">{title}</p>}
        {children && <div className={cn("leading-relaxed", title && "mt-1 opacity-90")}>{children}</div>}
      </div>
    </div>
  );
}

export function EmptyState({
  icon: Icon = Search,
  title,
  description,
  action,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border-strong/50 px-8 py-20 text-center bg-surface/30">
      <span className="medallion mb-5 flex size-14 items-center justify-center rounded-2xl">
        <Icon className="size-6 text-brand-200" />
      </span>
      <p className="font-semibold text-foreground tracking-tight">{title}</p>
      {description && (
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
