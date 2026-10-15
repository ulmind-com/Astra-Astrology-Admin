"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  CircleCheck,
  CircleSlash,
  Plus,
  Star,
  Users,
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

export default function DashboardPage() {
  // An astrologer landing here gets sent to their own screen.
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

  const stats = [
    { label: "Astrologers", value: list.length, icon: Users, tone: "brand" as const },
    { label: "Online now", value: online, icon: Activity, tone: "green" as const },
    { label: "In directory", value: listed, icon: CircleCheck, tone: "blue" as const },
    { label: "Featured", value: featured, icon: Star, tone: "gold" as const },
  ];

  const recent = [...list]
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .slice(0, 5);

  return (
    <>
      <PanelHeader
        title="Dashboard"
        description="How the platform looks right now."
        action={
          <Link href="/astrologers/new">
            <Button>
              <Plus className="size-4" />
              Add astrologer
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardBody className="flex items-center gap-4">
              <span className="flex size-11 items-center justify-center rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-200">
                <stat.icon className="size-5" />
              </span>
              <div>
                <p className="text-2xl font-bold leading-none">{stat.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recently added</CardTitle>
            <Link
              href="/astrologers"
              className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-300"
            >
              View all
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
              <ul className="divide-y divide-border">
                {recent.map((astrologer) => (
                  <li key={astrologer.id}>
                    <Link
                      href={`/astrologers/${astrologer.id}`}
                      className="flex items-center gap-3 py-3 transition-colors hover:bg-surface-muted"
                    >
                      <div className="relative">
                        <Avatar
                          src={astrologer.profile_image_url}
                          name={astrologer.display_name}
                        />
                        <span className="absolute -right-0.5 -bottom-0.5 rounded-full bg-surface p-0.5">
                          <StatusDot
                            online={astrologer.availability.is_online}
                            busy={astrologer.availability.is_busy}
                          />
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{astrologer.display_name}</p>
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
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2.5 pt-0">
            {health ? (
              <>
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge tone={health.status === "ok" ? "green" : "red"}>
                    {health.status}
                  </Badge>
                </div>
                {Object.entries(health.services ?? {}).map(([name, up]) => (
                  <div key={name} className="flex items-center justify-between text-sm">
                    <span className="capitalize text-muted-foreground">{name}</span>
                    {up ? (
                      <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                        <CircleCheck className="size-3.5" />
                        Connected
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                        <CircleSlash className="size-3.5" />
                        Not configured
                      </span>
                    )}
                  </div>
                ))}
                <p className="pt-2 text-xs text-muted-foreground">
                  Environment: {health.environment} · v{health.version}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Checking…</p>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
