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
import { adminApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { formatCurrency, formatDate } from "@/lib/utils";
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
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name"
          className="pl-9"
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
            {/* A table on wide screens; the same rows stack on a phone. */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead className="border-b border-border text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 font-medium">Astrologer</th>
                    <th className="px-3 py-3 font-medium">Specialities</th>
                    <th className="px-3 py-3 font-medium">Chat rate</th>
                    <th className="px-3 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Added</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.map((astrologer) => (
                    <tr key={astrologer.id} className="transition-colors hover:bg-surface-muted">
                      <td className="px-5 py-3">
                        <Link
                          href={`/astrologers/${astrologer.id}`}
                          className="flex items-center gap-3"
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
                          <div className="min-w-0">
                            <p className="truncate font-medium">{astrologer.display_name}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {astrologer.email}
                            </p>
                          </div>
                        </Link>
                      </td>
                      <td className="px-3 py-3">
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
                      <td className="px-3 py-3 whitespace-nowrap">
                        {formatCurrency(astrologer.rates.chat_per_minute)}/min
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1">
                          <Badge tone={astrologer.status === "active" ? "green" : "red"}>
                            {astrologer.status}
                          </Badge>
                          {!astrologer.is_listed && <Badge>Unlisted</Badge>}
                          {astrologer.is_featured && <Badge tone="gold">Featured</Badge>}
                          {astrologer.must_change_password && (
                            <Badge tone="blue">Password not set</Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap text-muted-foreground">
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
