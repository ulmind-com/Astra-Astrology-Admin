"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  CircleCheck,
  CircleSlash,
  Plus,
  Star,
  Users,
  ArrowUpRight,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { PanelHeader } from "@/components/layout/panel-shell";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  EmptyState,
  LoadingBlock,
  StatusDot,
} from "@/components/ui";
import { adminApi, healthApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { formatDateTime } from "@/lib/utils";
import { useRequireAuth } from "@/providers/auth-provider";

type StatTone = "brand" | "green" | "blue" | "gold";

const ICON_BOX_CLASSES: Record<StatTone, string> = {
  brand: "icon-box-brand",
  green: "icon-box-green",
  blue: "icon-box-blue",
  gold: "icon-box-gold",
};

const STAT_NUMBER_CLASSES: Record<StatTone, string> = {
  brand: "stat-number",
  green: "stat-number-green",
  blue: "stat-number-blue",
  gold: "stat-number-gold",
};

export default function DashboardPage() {
  const { ready } = useRequireAuth({ roles: ["admin", "super_admin"], signInPath: "/login" });

  const { data: astrologers, isLoading, error } = useQuery({
    queryKey: ["admin", "astrologers", "all"],
    queryFn: () => adminApi.listAstrologers({ limit: 100 }),
    enabled: ready,
  });

  const { data: health } = useQuery({
    queryKey: ["health"],
    queryFn: healthApi.check,
    enabled: ready,
    refetchInterval: 60_000,
  });

  if (!ready) return <LoadingBlock />;
  if (isLoading) return <LoadingBlock label="Loading dashboard…" />;
  if (error) return <Alert tone="error">{(error as ApiError).message}</Alert>;

  const list = astrologers ?? [];
  const online = list.filter((a) => a.availability.is_online).length;
  const listed = list.filter((a) => a.is_listed).length;
  const featured = list.filter((a) => a.is_featured).length;

  const stats: { label: string; value: number; icon: React.ComponentType<{ className?: string }>; tone: StatTone; sub?: string }[] = [
    { label: "Total astrologers", value: list.length, icon: Users, tone: "brand", sub: "All registered" },
    { label: "Online now", value: online, icon: Activity, tone: "green", sub: "Available now" },
    { label: "In directory", value: listed, icon: CircleCheck, tone: "blue", sub: "Publicly listed" },
    { label: "Featured", value: featured, icon: Star, tone: "gold", sub: "Promoted picks" },
  ];

  const recent = [...list]
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .slice(0, 5);

  return (
    <>
      <PanelHeader
        title="Dashboard"
        description="A real-time view of the platform — astrologers, availability and system health."
        action={
          <Link href="/astrologers/new">
            <Button>
              <Plus className="size-4" />
              Add astrologer
            </Button>
          </Link>
        }
      />

      {/* ── Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="card-stat group p-5 transition-all duration-300 hover:card-glow hover:-translate-y-0.5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70 mb-2">
                  {stat.label}
                </p>
                <p className={`text-3xl font-extrabold leading-none ${STAT_NUMBER_CLASSES[stat.tone]}`}>
                  {stat.value}
                </p>
                {stat.sub && (
                  <p className="mt-1.5 text-xs text-muted-foreground">{stat.sub}</p>
                )}
              </div>
              <span className={`icon-box flex size-11 shrink-0 items-center justify-center rounded-xl ${ICON_BOX_CLASSES[stat.tone]}`}>
                <stat.icon className="size-5" />
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main content */}
      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        {/* Recently added */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recently added</CardTitle>
            <Link
              href="/astrologers"
              className="inline-flex items-center gap-1 text-sm font-medium text-brand-300 hover:text-brand-200 transition-colors"
            >
              View all
              <ArrowUpRight className="size-3.5" />
            </Link>
          </CardHeader>
          <CardBody className="pt-0">
            {recent.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No astrologers yet"
                description="Create the first account and they will get an email with their password."
                action={
                  <Link href="/astrologers/new">
                    <Button>
                      <Plus className="size-4" />
                      Add astrologer
                    </Button>
                  </Link>
                }
              />
            ) : (
              <ul className="divide-y divide-border/60">
                {recent.map((astrologer) => (
                  <li key={astrologer.id}>
                    <Link
                      href={`/astrologers/${astrologer.id}`}
                      className="flex items-center gap-3.5 rounded-xl px-2 py-3.5 transition-all duration-200 hover:bg-surface-muted group"
                    >
                      <div className="relative shrink-0">
                        <Avatar
                          src={astrologer.profile_image_url}
                          name={astrologer.display_name}
                        />
                        <span className="absolute -right-0.5 -bottom-0.5 rounded-full bg-surface-solid p-[3px]">
                          <StatusDot
                            online={astrologer.availability.is_online}
                            busy={astrologer.availability.is_busy}
                          />
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground group-hover:text-brand-300 transition-colors">
                          {astrologer.display_name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {astrologer.email}
                        </p>
                      </div>
                      <div className="hidden text-right sm:block">
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(astrologer.created_at)}
                        </p>
                        {!astrologer.is_listed && (
                          <Badge tone="neutral" className="mt-1">
                            Unlisted
                          </Badge>
                        )}
                      </div>
                      <ArrowUpRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        {/* System health */}
        <Card>
          <CardHeader>
            <CardTitle>System health</CardTitle>
            {health && (
              <Badge tone={health.status === "ok" ? "green" : "red"}>
                {health.status === "ok" ? "● All good" : "● Degraded"}
              </Badge>
            )}
          </CardHeader>
          <CardBody className="space-y-3 pt-0">
            {health ? (
              <>
                {Object.entries(health.services ?? {}).map(([name, up]) => (
                  <div
                    key={name}
                    className="flex items-center justify-between rounded-lg bg-surface-muted/40 px-3 py-2.5 text-sm"
                  >
                    <span className="capitalize font-medium text-foreground/80">{name}</span>
                    {up ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success">
                        <CircleCheck className="size-3.5" />
                        Connected
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CircleSlash className="size-3.5" />
                        Not set
                      </span>
                    )}
                  </div>
                ))}
                <div className="pt-1 border-t border-border/60">
                  <p className="text-xs text-muted-foreground">
                    Environment: <span className="font-medium text-foreground/70">{health.environment}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Version: <span className="font-medium text-foreground/70">v{health.version}</span>
                  </p>
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="shimmer h-10 rounded-lg" />
                <div className="shimmer h-10 rounded-lg" />
                <div className="shimmer h-10 rounded-lg" />
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
