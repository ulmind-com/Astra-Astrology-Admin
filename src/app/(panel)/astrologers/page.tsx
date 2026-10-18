"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Users } from "lucide-react";
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
  EmptyState,
  Input,
  LoadingBlock,
  StatusDot,
} from "@/components/ui";
import { adminApi, adminSettingsApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { formatDate } from "@/lib/utils";
import { SKILL_LABELS } from "@/types";
import { useRequireAuth } from "@/providers/auth-provider";

export default function AstrologersListPage() {
  const { ready } = useRequireAuth({ roles: ["admin", "super_admin"], signInPath: "/login" });
  const [search, setSearch] = React.useState("");
  const [debounced, setDebounced] = React.useState("");

  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: defaults } = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: adminSettingsApi.get,
    enabled: ready,
  });

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ["admin", "astrologers", debounced],
    queryFn: () => adminApi.listAstrologers({ search: debounced || undefined, limit: 100 }),
    enabled: ready,
    placeholderData: (previous) => previous,
  });

  if (!ready) return <LoadingBlock />;

  return (
    <>
      <PanelHeader
        title="Astrologers"
        description="Accounts you have opened. Astrologers cannot sign themselves up."
        action={
          <Link href="/astrologers/new">
            <Button>
              <Plus className="size-4" />
              Add astrologer
            </Button>
          </Link>
        }
      />

      <div className="relative mb-5 max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name…"
          className="pl-10 h-10"
          aria-label="Search astrologers"
        />
      </div>

      {error ? (
        <Alert tone="error">{(error as ApiError).message}</Alert>
      ) : isLoading ? (
        <LoadingBlock label="Loading astrologers…" />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={Users}
          title={debounced ? "No astrologer matches that" : "No astrologers yet"}
          description={
            debounced
              ? "Try a different name."
              : "Create an account and they will be emailed a password to sign in with."
          }
          action={
            !debounced && (
              <Link href="/astrologers/new">
                <Button>
                  <Plus className="size-4" />
                  Add the first one
                </Button>
              </Link>
            )
          }
        />
      ) : (
        <Card className={isFetching ? "opacity-70" : undefined}>
          <CardBody className="p-0">
            {/* Wide table for desktop */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-surface-muted/30">
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">Astrologer</th>
                    <th className="px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">Specialities</th>
                    <th className="px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">Chat coins/min</th>
                    <th className="px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">Status</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">Added</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {data.map((astrologer) => (
                    <tr key={astrologer.id} className="transition-all duration-150 hover:bg-surface-muted/60 group">
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/astrologers/${astrologer.id}`}
                          className="flex items-center gap-3"
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
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-foreground group-hover:text-brand-300 transition-colors">{astrologer.display_name}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {astrologer.email}
                            </p>
                          </div>
                        </Link>
                      </td>
                      <td className="px-3 py-3.5">
                        <div className="flex max-w-xs flex-wrap gap-1">
                          {astrologer.skills.slice(0, 2).map((skill) => (
                            <Badge key={skill} tone="brand">
                              {SKILL_LABELS[skill]}
                            </Badge>
                          ))}
                          {astrologer.skills.length > 2 && (
                            <Badge>+{astrologer.skills.length - 2}</Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3.5 whitespace-nowrap font-medium text-foreground">
                        {astrologer.rates.chat_coins_per_minute ?? defaults?.default_chat_coins_per_minute ?? "—"}
                        {astrologer.rates.chat_coins_per_minute == null && (
                          <span className="ml-1 text-xs text-muted-foreground">(default)</span>
                        )}
                      </td>
                      <td className="px-3 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          <Badge tone={astrologer.status === "active" ? "green" : "red"}>
                            {astrologer.status}
                          </Badge>
                          {!astrologer.is_listed && <Badge>Unlisted</Badge>}
                          {astrologer.is_featured && <Badge tone="gold">Featured</Badge>}
                          {astrologer.must_change_password && (
                            <Badge tone="blue">Initial pwd</Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-sm text-muted-foreground">
                        {formatDate(astrologer.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-border md:hidden">
              {data.map((astrologer) => (
                <li key={astrologer.id}>
                  <Link
                    href={`/astrologers/${astrologer.id}`}
                    className="flex items-center gap-3 p-4"
                  >
                    <Avatar
                      src={astrologer.profile_image_url}
                      name={astrologer.display_name}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{astrologer.display_name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {astrologer.email}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        <Badge tone={astrologer.status === "active" ? "green" : "red"}>
                          {astrologer.status}
                        </Badge>
                        {!astrologer.is_listed && <Badge>Unlisted</Badge>}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}
    </>
  );
}
