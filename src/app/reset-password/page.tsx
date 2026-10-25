"use client";

import { ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { Alert, Button, Field, Input, LoadingBlock } from "@/components/ui";
import { authApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();

  const [email, setEmail] = React.useState(params.get("email") ?? "");
  // Deliberately not read from the URL — the code has to come from the inbox.
  const [code, setCode] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [error, setError] = React.useState<ApiError | null>(null);
  const [mismatch, setMismatch] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    // Checked here rather than server-side: the API only ever sees one password.
    if (password !== confirm) {
      setMismatch(true);
      return;
    }
    setMismatch(false);

    setBusy(true);
    try {
      await authApi.resetPassword(email, code, password);
      toast.success("Password reset. You can sign in now.");
      router.replace(`/login?email=${encodeURIComponent(email)}`);
    } catch (caught) {
      setError(caught as ApiError);
    } finally {
      setBusy(false);
    }
  }

  const fieldErrors = error?.fieldErrors ?? {};
  const attemptsLeft = (error?.details as { attempts_left?: number })?.attempts_left;

  return (
    <div className="mx-auto w-full max-w-sm">
      <Link
        href="/login"
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to sign in
      </Link>

      <span className="flex size-11 items-center justify-center rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-100 dark:text-ink-800">
        <ShieldCheck className="size-5" />
      </span>

      <h1 className="mt-4 text-2xl font-bold tracking-tight">Set a new password</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Enter the code we emailed you, then choose a new password.
      </p>

      {error && (
        <Alert tone="error" className="mt-5">
          {error.message}
          {typeof attemptsLeft === "number" && attemptsLeft === 0 && (
            <>
              {" "}
              <Link href="/forgot-password" className="font-semibold underline">
                Request a new code
              </Link>
              .
            </>
          )}
        </Alert>
      )}

      <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
        <Field label="Email" htmlFor="email" error={fieldErrors.email}>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>

        <Field label="Reset code" htmlFor="code" error={fieldErrors.code}>
          <Input
            id="code"
            inputMode="numeric"
            required
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="000000"
            className="text-center font-mono text-lg tracking-[0.4em]"
          />
        </Field>

        <Field
          label="New password"
          htmlFor="password"
          required
          hint="At least 6 characters"
          error={fieldErrors.new_password}
        >
          <Input
            id="password"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>

        <Field
          label="Confirm new password"
          htmlFor="confirm"
          required
          error={mismatch ? "The two passwords do not match." : undefined}
        >
          <Input
            id="confirm"
            type="password"
            required
            autoComplete="new-password"
            value={confirm}
            invalid={mismatch}
            onChange={(e) => {
              setConfirm(e.target.value);
              setMismatch(false);
            }}
          />
        </Field>

        <Button type="submit" className="w-full" loading={busy}>
          Reset password
        </Button>
      </form>
    </div>
  );
}


/**
 * `useSearchParams` reads something only known per request, so the page shell
 * prerenders and the form streams in behind this boundary.
 */
export default function Page() {
  return (
    <div className="bg-stars flex min-h-dvh items-center justify-center bg-cosmos px-4">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-surface p-8 shadow-lift">
        <React.Suspense fallback={<LoadingBlock />}>
          <ResetPasswordForm />
        </React.Suspense>
      </div>
    </div>
  );
}
