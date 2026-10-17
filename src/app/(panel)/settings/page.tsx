"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Coins, History, Loader2 } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { PanelHeader } from "@/components/layout/panel-shell";
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  Field,
  Input,
  LoadingBlock,
  Textarea,
} from "@/components/ui";
import { adminSettingsApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { formatDateTime } from "@/lib/utils";
import { useRequireAuth } from "@/providers/auth-provider";
import { coinWord, formatCoins } from "@/types";

const EXAMPLES = [100, 500, 1000];

export default function SettingsPage() {
  const { ready } = useRequireAuth({ roles: ["admin", "super_admin"], signInPath: "/login" });
  const queryClient = useQueryClient();

  const { data: settings, isLoading, error } = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: adminSettingsApi.get,
    enabled: ready,
  });

  const { data: history } = useQuery({
    queryKey: ["admin", "coin-rate-history"],
    queryFn: adminSettingsApi.coinRateHistory,
    enabled: ready,
  });

  const [rate, setRate] = React.useState("");
  const [note, setNote] = React.useState("");
  const [fieldError, setFieldError] = React.useState<string | null>(null);

  // Seeded once the current rate arrives, then left alone so typing is not
  // overwritten by a background refetch.
  React.useEffect(() => {
    if (settings && rate === "") setRate(String(settings.coins_per_rupee));
  }, [settings, rate]);

  const save = useMutation({
    mutationFn: () => adminSettingsApi.setCoinRate(Number(rate), note.trim() || undefined),
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "coin-rate-history"] });
      setNote("");
      toast.success(
        `₹1 now buys ${updated.coins_per_rupee} ${coinWord(updated.coins_per_rupee)}.`,
      );
    },
    onError: (e: ApiError) => setFieldError(e.message),
  });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setFieldError(null);

    const value = Number(rate);
    if (!rate.trim() || !Number.isInteger(value) || value < 1) {
      setFieldError("Enter a whole number of coins, 1 or more.");
      return;
    }
    save.mutate();
  }

  if (!ready) return <LoadingBlock />;
  if (isLoading) return <LoadingBlock label="Loading settings…" />;
  if (error) return <Alert tone="error">{(error as ApiError).message}</Alert>;

  const preview = Number(rate) >= 1 && Number.isInteger(Number(rate)) ? Number(rate) : null;
  const changed = settings && preview !== null && preview !== settings.coins_per_rupee;

  return (
    <>
      <PanelHeader
        title="Settings"
        description="Platform-wide controls. Changes here are recorded against your account."
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>
            <span className="flex items-center gap-2">
              <Coins className="size-4 text-gold-500" />
              Coins per rupee
            </span>
          </CardTitle>
          <CardDescription>
            How many coins someone gets for each rupee they recharge.
          </CardDescription>
        </CardHeader>

        <CardBody className="space-y-5">
          <form onSubmit={submit} className="space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <Field label="₹1 buys" required className="w-40">
                <Input
                  type="number"
                  min={1}
                  step={1}
                  value={rate}
                  invalid={Boolean(fieldError)}
                  onChange={(e) => setRate(e.target.value)}
                />
              </Field>
              <p className="pb-2.5 text-sm text-muted-foreground">
                {preview === null ? "coins" : coinWord(preview)}
              </p>
            </div>

            <Field
              label="Why (optional)"
              hint="Kept with the change, so it is clear later why the rate moved."
            >
              <Textarea
                rows={2}
                placeholder="Festival offer"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </Field>

            {fieldError && <Alert tone="error">{fieldError}</Alert>}

            {changed && (
              <Alert tone="info" title="This only affects new recharges">
                Coins people already hold keep the rate they were bought at, and a
                payment already in progress is credited at the rate it was quoted.
              </Alert>
            )}

            <Button type="submit" disabled={save.isPending || !changed}>
              {save.isPending && <Loader2 className="size-4 animate-spin" />}
              {changed ? "Save new rate" : "Saved"}
            </Button>
          </form>

          {/* A worked example, so the effect is obvious before saving. */}
          {preview !== null && (
            <div className="rounded-xl border border-border bg-surface-muted/50 p-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                What people will get
              </p>
              <div className="grid grid-cols-3 gap-3 text-sm">
                {EXAMPLES.map((rupees) => (
                  <div key={rupees}>
                    <p className="font-semibold">₹{rupees}</p>
                    <p className="text-brand-600 dark:text-brand-300">
                      {formatCoins(rupees * preview)} {coinWord(rupees * preview)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <span className="flex items-center gap-2">
              <History className="size-4" />
              Rate history
            </span>
          </CardTitle>
          <CardDescription>Every change, and who made it.</CardDescription>
        </CardHeader>

        {!history || history.length === 0 ? (
          <CardBody>
            <EmptyState
              icon={History}
              title="No changes yet"
              description="The rate has not been changed since the platform was set up."
            />
          </CardBody>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">When</th>
                  <th className="px-3 py-3 font-medium">Change</th>
                  <th className="px-3 py-3 font-medium">By</th>
                  <th className="px-5 py-3 font-medium">Why</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {history.map((change, index) => (
                  <tr key={index} className="hover:bg-surface-muted/50">
                    <td className="px-5 py-3 whitespace-nowrap text-muted-foreground">
                      {formatDateTime(change.created_at)}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap tabular-nums">
                      {change.from_rate} → <strong>{change.to_rate}</strong> per ₹
                    </td>
                    <td className="px-3 py-3">{change.changed_by_email ?? "—"}</td>
                    <td className="px-5 py-3 text-muted-foreground">{change.note ?? "—"}</td>
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
