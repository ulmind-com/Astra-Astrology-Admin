"use client";

import { useQuery } from "@tanstack/react-query";
import { IndianRupee, MessageCircle, Phone, TrendingUp, Video } from "lucide-react";
import * as React from "react";

import { PanelHeader } from "@/components/layout/panel-shell";
import {
  Alert,
  Card,
  CardBody,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  LoadingBlock,
} from "@/components/ui";
import { adminSettingsApi, earningsApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { formatDateTime } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { useRequireAuth } from "@/providers/auth-provider";
import { MODE_LABELS, formatEarning, type ConsultationMode } from "@/types";

const MODE_ICONS: Record<ConsultationMode, React.ComponentType<{ className?: string }>> = {
  chat: MessageCircle,
  call: Phone,
  video: Video,
};

function Stat({
  label,
  paise,
  minutes,
  highlight = false,
}: {
  label: string;
  paise: number;
  minutes: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        highlight
          ? "rounded-2xl bg-cosmos p-5 text-white"
          : "rounded-2xl border border-border bg-surface p-5"
      }
    >
      <p className={highlight ? "text-xs text-white/70" : "text-xs text-muted-foreground"}>
        {label}
      </p>
      <p className="mt-1.5 text-2xl font-bold tabular-nums">{formatEarning(paise)}</p>
      <p className={highlight ? "text-xs text-white/60" : "text-xs text-muted-foreground"}>
        {minutes} {minutes === 1 ? "minute" : "minutes"}
      </p>
    </div>
  );
}

export default function EarningsPage() {
  const { user } = useAuth();
  const isAstrologer = user?.role === "astrologer";
  const { ready } = useRequireAuth({
    roles: ["astrologer", "admin", "super_admin"],
    signInPath: "/login",
  });

  const mine = useQuery({
    queryKey: ["earnings", "mine"],
    queryFn: earningsApi.summary,
    enabled: ready && isAstrologer,
  });

  const recent = useQuery({
    queryKey: ["earnings", "recent"],
    queryFn: () => earningsApi.recent(50),
    enabled: ready && isAstrologer,
  });

  const platform = useQuery({
    queryKey: ["admin", "earnings"],
    queryFn: adminSettingsApi.earnings,
    enabled: ready && !isAstrologer,
  });

  const platformRecent = useQuery({
    queryKey: ["admin", "earnings", "recent"],
    queryFn: () => adminSettingsApi.recentEarnings(100),
    enabled: ready && !isAstrologer,
  });

  if (!ready) return <LoadingBlock />;

  // ------------------------------------------------------------ astrologer
  if (isAstrologer) {
    if (mine.isLoading) return <LoadingBlock label="Loading your earnings…" />;
    if (mine.error) return <Alert tone="error">{(mine.error as ApiError).message}</Alert>;
    const data = mine.data;
    if (!data) return null;

    return (
      <>
        <PanelHeader
          title="Earnings"
          description="What you have been credited for your consultations."
        />

        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Today" paise={data.today.earning_paise} minutes={data.today.minutes} highlight />
          <Stat label="This week" paise={data.this_week.earning_paise} minutes={data.this_week.minutes} />
          <Stat label="This month" paise={data.this_month.earning_paise} minutes={data.this_month.minutes} />
          <Stat label="All time" paise={data.all_time.earning_paise} minutes={data.all_time.minutes} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent</CardTitle>
            <CardDescription>Every minute you have been paid for.</CardDescription>
          </CardHeader>

          {!recent.data || recent.data.length === 0 ? (
            <CardBody>
              <EmptyState
                icon={TrendingUp}
                title="Nothing yet"
                description="Your earnings will appear here after your first consultation."
              />
            </CardBody>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 font-medium">When</th>
                    <th className="px-3 py-3 font-medium">Type</th>
                    <th className="px-5 py-3 font-medium text-right">Credited</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recent.data.map((row) => {
                    const Icon = MODE_ICONS[row.mode];
                    return (
                      <tr key={row.id} className="hover:bg-surface-muted/50">
                        <td className="px-5 py-3 whitespace-nowrap text-muted-foreground">
                          {formatDateTime(row.created_at)}
                        </td>
                        <td className="px-3 py-3">
                          <span className="flex items-center gap-2">
                            <Icon className="size-3.5 text-muted-foreground" />
                            {MODE_LABELS[row.mode]}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                          +{formatEarning(row.earning_paise)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </>
    );
  }

  // ----------------------------------------------------------------- admin
  if (platform.isLoading) return <LoadingBlock label="Loading earnings…" />;
  if (platform.error) return <Alert tone="error">{(platform.error as ApiError).message}</Alert>;
  const totals = platform.data;
  if (!totals) return null;

  return (
    <>
      <PanelHeader
        title="Earnings"
        description="What consultations have brought in, and how it was split."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-xs text-muted-foreground">Gross</p>
          <p className="mt-1.5 text-2xl font-bold tabular-nums">
            {formatEarning(totals.gross_paise)}
          </p>
          <p className="text-xs text-muted-foreground">
            {totals.coins_charged} coins over {totals.sessions}{" "}
            {totals.sessions === 1 ? "session" : "sessions"}
          </p>
        </div>
        <div className="rounded-2xl bg-cosmos p-5 text-white">
          <p className="flex items-center gap-1.5 text-xs text-white/70">
            <IndianRupee className="size-3.5" />
            Your commission
          </p>
          <p className="mt-1.5 text-2xl font-bold tabular-nums">
            {formatEarning(totals.commission_paise)}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-xs text-muted-foreground">Paid to astrologers</p>
          <p className="mt-1.5 text-2xl font-bold tabular-nums">
            {formatEarning(totals.payout_paise)}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent</CardTitle>
          <CardDescription>Each minute, and how it was split.</CardDescription>
        </CardHeader>

        {!platformRecent.data || platformRecent.data.length === 0 ? (
          <CardBody>
            <EmptyState
              icon={TrendingUp}
              title="Nothing yet"
              description="Earnings appear here once consultations start."
            />
          </CardBody>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">When</th>
                  <th className="px-3 py-3 font-medium">Astrologer</th>
                  <th className="px-3 py-3 font-medium">Type</th>
                  <th className="px-3 py-3 font-medium text-right">Gross</th>
                  <th className="px-3 py-3 font-medium text-right">Commission</th>
                  <th className="px-5 py-3 font-medium text-right">Paid out</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {platformRecent.data.map((row) => (
                  <tr key={row.id} className="hover:bg-surface-muted/50">
                    <td className="px-5 py-3 whitespace-nowrap text-muted-foreground">
                      {formatDateTime(row.created_at)}
                    </td>
                    <td className="px-3 py-3">{row.astrologer_name ?? "—"}</td>
                    <td className="px-3 py-3">{MODE_LABELS[row.mode]}</td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {formatEarning(row.gross_paise)}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {formatEarning(row.commission_paise)}
                      <span className="ml-1 text-xs text-muted-foreground">
                        {row.commission_percent}%
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-semibold tabular-nums">
                      {formatEarning(row.earning_paise)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
