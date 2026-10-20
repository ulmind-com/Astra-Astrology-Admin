"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Coins, History, Loader2, Timer, Wallet } from "lucide-react";
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
  Switch,
  Textarea,
} from "@/components/ui";
import { adminSettingsApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { formatDateTime } from "@/lib/utils";
import { useRequireAuth } from "@/providers/auth-provider";
import {
  coinWord,
  formatCoins,
  formatEarning,
  type PlatformSettings,
} from "@/types";

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
  // Everything below reads the loaded settings, so narrow once here rather
  // than guarding each field.
  if (!settings) return null;

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
              <Coins className="size-4 text-gold-600" />
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
                    <p className="text-brand-700 dark:text-brand-700">
                      {formatCoins(rupees * preview)} {coinWord(rupees * preview)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      <RechargeLimitsCard settings={settings} />

      <ConsultationDefaultsCard settings={settings} />

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

/**
 * What a user may top up.
 *
 * Kept next to the coin rate because the two are read together: a minimum of
 * ₹200 at 5 coins per rupee means nobody can buy fewer than 1,000 coins, and
 * that is the number worth checking before saving.
 */
function RechargeLimitsCard({ settings }: { settings: PlatformSettings }) {
  const queryClient = useQueryClient();

  const [min, setMin] = React.useState(String(settings.min_recharge_paise / 100));
  const [max, setMax] = React.useState(String(settings.max_recharge_paise / 100));
  const [fieldError, setFieldError] = React.useState<string | null>(null);

  const save = useMutation({
    mutationFn: () =>
      adminSettingsApi.setRechargeLimits({
        min_recharge_paise: Number(min) * 100,
        max_recharge_paise: Number(max) * 100,
      }),
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
      toast.success(
        `Recharges are now ₹${updated.min_recharge_paise / 100} to ₹${
          updated.max_recharge_paise / 100
        }.`,
      );
    },
    onError: (e: ApiError) => setFieldError(e.message),
  });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setFieldError(null);

    const lo = Number(min);
    const hi = Number(max);
    if (!Number.isInteger(lo) || lo < 1 || !Number.isInteger(hi) || hi < 1) {
      setFieldError("Use whole rupees, 1 or more.");
      return;
    }
    if (lo > hi) {
      setFieldError("The smallest recharge cannot be more than the largest.");
      return;
    }
    save.mutate();
  }

  const changed =
    Number(min) * 100 !== settings.min_recharge_paise ||
    Number(max) * 100 !== settings.max_recharge_paise;

  const minCoins = Number(min) >= 1 ? Number(min) * settings.coins_per_rupee : null;

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>
          <span className="flex items-center gap-2">
            <Wallet className="size-4 text-brand-700" />
            Recharge limits
          </span>
        </CardTitle>
        <CardDescription>
          What a user may add to their wallet in one go. They are told the
          minimum before they type an amount.
        </CardDescription>
      </CardHeader>

      <CardBody>
        <form onSubmit={submit} className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <Field label="Smallest recharge (₹)" required className="w-44">
              <Input
                type="number"
                min={1}
                step={1}
                value={min}
                onChange={(e) => setMin(e.target.value)}
              />
            </Field>
            <Field label="Largest recharge (₹)" required className="w-44">
              <Input
                type="number"
                min={1}
                step={1}
                value={max}
                onChange={(e) => setMax(e.target.value)}
              />
            </Field>
          </div>

          {minCoins !== null && (
            <p className="text-sm text-muted-foreground">
              At {settings.coins_per_rupee} {coinWord(settings.coins_per_rupee)} per ₹1,
              the smallest recharge buys{" "}
              <strong className="text-brand-700 dark:text-brand-700">
                {formatCoins(minCoins)} {coinWord(minCoins)}
              </strong>
              .
            </p>
          )}

          {fieldError && <Alert tone="error">{fieldError}</Alert>}

          <Button type="submit" disabled={save.isPending || !changed}>
            {save.isPending && <Loader2 className="size-4 animate-spin" />}
            {changed ? "Save limits" : "Saved"}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}

/**
 * What a consultation costs, and what the platform keeps.
 *
 * These are the defaults. An astrologer with their own rate or commission uses
 * theirs; everyone else moves when this moves, which is what makes onboarding
 * a new astrologer a decision-free step.
 */
function ConsultationDefaultsCard({ settings }: { settings: PlatformSettings }) {
  const queryClient = useQueryClient();

  const [form, setForm] = React.useState({
    chat: String(settings.default_chat_coins_per_minute),
    call: String(settings.default_call_coins_per_minute),
    video: String(settings.default_video_coins_per_minute),
    commission: String(settings.default_commission_percent),
    minMinutes: String(settings.min_session_minutes),
    maxMinutes: String(settings.max_session_minutes),
    retentionDays: String(settings.chat_retention_days),
    apptCommission: String(settings.appointment_commission_percent),
    apptMin: String(settings.min_appointment_minutes),
    apptMax: String(settings.max_appointment_minutes),
    apptDaysAhead: String(settings.appointment_booking_days_ahead),
    faceCoins: String(settings.face_reading_coins),
    faceEnabled: settings.face_reading_enabled,
    palmCoins: String(settings.palm_reading_coins ?? 50),
    palmEnabled: settings.palm_reading_enabled ?? true,
  });
  const [fieldError, setFieldError] = React.useState<string | null>(null);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const save = useMutation({
    mutationFn: () =>
      adminSettingsApi.setConsultationDefaults({
        default_chat_coins_per_minute: Number(form.chat),
        default_call_coins_per_minute: Number(form.call),
        default_video_coins_per_minute: Number(form.video),
        default_commission_percent: Number(form.commission),
        min_session_minutes: Number(form.minMinutes),
        max_session_minutes: Number(form.maxMinutes),
        chat_retention_days: Number(form.retentionDays),
        appointment_commission_percent: Number(form.apptCommission),
        min_appointment_minutes: Number(form.apptMin),
        max_appointment_minutes: Number(form.apptMax),
        appointment_booking_days_ahead: Number(form.apptDaysAhead),
        face_reading_coins: Number(form.faceCoins),
        face_reading_enabled: form.faceEnabled,
        palm_reading_coins: Number(form.palmCoins),
        palm_reading_enabled: form.palmEnabled,
      }),
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
      toast.success(
        `Chat ${updated.default_chat_coins_per_minute}, call ${updated.default_call_coins_per_minute}, video ${updated.default_video_coins_per_minute} coins a minute.`,
      );
    },
    onError: (e: ApiError) => setFieldError(e.message),
  });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setFieldError(null);

    const nums = [form.chat, form.call, form.video].map(Number);
    if (nums.some((n) => !Number.isInteger(n) || n < 1)) {
      setFieldError("Rates must be whole coins, 1 or more.");
      return;
    }
    const commission = Number(form.commission);
    if (Number.isNaN(commission) || commission < 0 || commission > 100) {
      setFieldError("Commission must be between 0 and 100.");
      return;
    }
    if (Number(form.minMinutes) > Number(form.maxMinutes)) {
      setFieldError("The shortest session cannot be longer than the longest.");
      return;
    }
    const retention = Number(form.retentionDays);
    if (!Number.isInteger(retention) || retention < 0) {
      setFieldError("Keep chats for a whole number of days, 0 or more.");
      return;
    }
    const apptCommission = Number(form.apptCommission);
    if (Number.isNaN(apptCommission) || apptCommission < 0 || apptCommission > 100) {
      setFieldError("Appointment commission must be between 0 and 100.");
      return;
    }
    const apptMin = Number(form.apptMin);
    const apptMax = Number(form.apptMax);
    if (apptMin > apptMax) {
      setFieldError("The shortest appointment cannot be longer than the longest.");
      return;
    }
    // Appointments sit on a five-minute grid, so the limits must too.
    if (apptMin % 5 || apptMax % 5) {
      setFieldError("Appointment lengths must be multiples of 5 minutes.");
      return;
    }
    const faceCoins = Number(form.faceCoins);
    if (!Number.isInteger(faceCoins) || faceCoins < 0) {
      setFieldError("A face reading must cost a whole number of coins, 0 or more.");
      return;
    }
    save.mutate();
  }

  const commission = Number(form.commission);
  const videoRate = Number(form.video);
  // What one video minute is worth, and who gets what — the figure worth
  // checking before saving.
  const grossPaise =
    Number.isFinite(videoRate) && settings.coins_per_rupee
      ? Math.round((videoRate * 100) / settings.coins_per_rupee)
      : 0;
  const astrologerPaise = Math.round(grossPaise * (1 - commission / 100));

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>
          <span className="flex items-center gap-2">
            <Timer className="size-4 text-brand-700" />
            Consultation pricing
          </span>
        </CardTitle>
        <CardDescription>
          The default cost of a minute, and the platform&apos;s share. An
          astrologer with their own rate or commission keeps theirs.
        </CardDescription>
      </CardHeader>

      <CardBody>
        <form onSubmit={submit} className="space-y-5">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Coins per minute
            </p>
            <div className="flex flex-wrap gap-4">
              <Field label="Chat" required className="w-32">
                <Input type="number" min={1} step={1} value={form.chat} onChange={set("chat")} />
              </Field>
              <Field label="Voice call" required className="w-32">
                <Input type="number" min={1} step={1} value={form.call} onChange={set("call")} />
              </Field>
              <Field label="Video call" required className="w-32">
                <Input type="number" min={1} step={1} value={form.video} onChange={set("video")} />
              </Field>
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <Field
              label="Commission %"
              required
              hint="The platform's share of each minute."
              className="w-40"
            >
              <Input
                type="number"
                min={0}
                max={100}
                step="0.5"
                value={form.commission}
                onChange={set("commission")}
              />
            </Field>
            <Field label="Shortest session (min)" required className="w-40">
              <Input
                type="number"
                min={1}
                step={1}
                value={form.minMinutes}
                onChange={set("minMinutes")}
              />
            </Field>
            <Field label="Longest session (min)" required className="w-40">
              <Input
                type="number"
                min={1}
                step={1}
                value={form.maxMinutes}
                onChange={set("maxMinutes")}
              />
            </Field>
          </div>

          {/* ------------------------------------------------- face reading */}
          <div className="rounded-xl border border-border bg-surface-muted/40 p-4">
            <p className="mb-3 font-display text-sm font-semibold">Face reading</p>
            <div className="flex flex-wrap items-end gap-4">
              <Field
                label="Cost per reading (coins)"
                required
                className="w-52"
                hint={Number(form.faceCoins) === 0 ? "Free" : undefined}
              >
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={form.faceCoins}
                  onChange={set("faceCoins")}
                />
              </Field>
              <div className="pb-2">
                <Switch
                  checked={form.faceEnabled}
                  label="Offer face reading"
                  onChange={(next: boolean) => setForm((f) => ({ ...f, faceEnabled: next }))}
                />
              </div>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Charged when the reading is produced. The photo is measured on the
              user&apos;s own device and never reaches the server — only the
              proportions do. What each measurement <em>means</em> is edited
              under <strong>Face rules</strong>.
            </p>
          </div>

          {/* ------------------------------------------------- palm reading */}
          <div className="rounded-xl border border-border bg-surface-muted/40 p-4">
            <p className="mb-3 font-display text-sm font-semibold">Palm reading (হস্তরেখা বিচার)</p>
            <div className="flex flex-wrap items-end gap-4">
              <Field
                label="Cost per reading (coins)"
                required
                className="w-52"
                hint={Number(form.palmCoins) === 0 ? "Free" : undefined}
              >
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={form.palmCoins}
                  onChange={set("palmCoins")}
                />
              </Field>
              <div className="pb-2">
                <Switch
                  checked={form.palmEnabled}
                  label="Offer palm reading"
                  onChange={(next: boolean) => setForm((f) => ({ ...f, palmEnabled: next }))}
                />
              </div>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Charged when the palm reading is produced. Supports live 3D MediaPipe + OpenCV
              Samudrik Shastra biometric scans. What each line &amp; mount measurement <em>means</em> is edited
              under <strong>Palm rules</strong>.
            </p>
          </div>

          {/* ------------------------------------------------- appointments */}
          <div className="rounded-xl border border-border bg-surface-muted/40 p-4">
            <p className="mb-3 font-display text-sm font-semibold">Scheduled appointments</p>
            <div className="flex flex-wrap gap-4">
              <Field
                label="Commission (%)"
                required
                className="w-40"
                hint="Taken when booked"
              >
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={form.apptCommission}
                  onChange={set("apptCommission")}
                />
              </Field>
              <Field label="Shortest (min)" required className="w-36">
                <Input type="number" min={5} step={5} value={form.apptMin} onChange={set("apptMin")} />
              </Field>
              <Field label="Longest (min)" required className="w-36">
                <Input type="number" min={5} step={5} value={form.apptMax} onChange={set("apptMax")} />
              </Field>
              <Field label="Book up to (days ahead)" required className="w-48">
                <Input
                  type="number"
                  min={1}
                  step={1}
                  value={form.apptDaysAhead}
                  onChange={set("apptDaysAhead")}
                />
              </Field>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              The commission is taken from the user&apos;s wallet the moment they book
              and is <strong>not returned</strong> if they cancel — that is what stops a
              calendar filling with bookings nobody means to keep. The astrologer
              collects the rest at the appointment itself.
            </p>
          </div>

          {/* ------------------------------------------------ chat history */}
          <div className="rounded-xl border border-border bg-surface-muted/40 p-4">
            <Field
              label="Keep chat messages for (days)"
              required
              className="w-44"
              hint={
                Number(form.retentionDays) === 0
                  ? "Deleted the moment a chat ends."
                  : `Deleted ${form.retentionDays} day(s) after a chat ends.`
              }
            >
              <Input
                type="number"
                min={0}
                step={1}
                value={form.retentionDays}
                onChange={set("retentionDays")}
              />
            </Field>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Messages are removed by the database itself once this long has
              passed — the session and what it cost are always kept. Changing
              this re-dates chats that have already finished, so shortening it
              clears out old messages too.
              {Number(form.retentionDays) === 0 && (
                <span className="mt-1 block text-warning">
                  With 0 days there is nothing left to check if someone
                  disputes what was said or what they were charged.
                </span>
              )}
            </p>
          </div>

          {grossPaise > 0 && (
            <div className="rounded-xl border border-border bg-surface-muted/50 p-4 text-sm">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                One video minute
              </p>
              <p>
                {videoRate} {coinWord(videoRate)} ={" "}
                <strong>{formatEarning(grossPaise)}</strong> · astrologer gets{" "}
                <strong className="text-success">
                  {formatEarning(astrologerPaise)}
                </strong>
                , you keep{" "}
                <strong>{formatEarning(grossPaise - astrologerPaise)}</strong>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                A coin is worth what people pay for it — {settings.coins_per_rupee} per ₹1.
              </p>
            </div>
          )}

          {fieldError && <Alert tone="error">{fieldError}</Alert>}

          <Button type="submit" disabled={save.isPending}>
            {save.isPending && <Loader2 className="size-4 animate-spin" />}
            Save pricing
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
