"use client";

import { ArrowLeft, KeyRound } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { Alert, Button, Field, Input, LoadingBlock } from "@/components/ui";
import { authApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";

function ForgotPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = React.useState(params.get("email") ?? "");
  const [error, setError] = React.useState<ApiError | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const sent = await authApi.forgotPassword(email);
      toast.success(`We sent a reset code to ${sent.email}`);
      // Only the address is carried over. The code is never put in the URL or
      // filled in for the user: proving they can read the inbox is the whole
      // point of the reset, and a code the page already knows proves nothing.
      router.push(`/reset-password?email=${encodeURIComponent(sent.email)}`);
    } catch (caught) {
      setError(caught as ApiError);
    } finally {
      setBusy(false);
    }
  }

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
        <KeyRound className="size-5" />
      </span>

      <h1 className="mt-4 text-2xl font-bold tracking-tight">Forgot your password?</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Enter the email you registered with and we will send a code to reset it.
      </p>

      {error && (
        <Alert tone="error" className="mt-5">
          {error.message}
          {error.code === "user_not_found" && (
            <>
              {" "}
              <Link href="/register" className="font-semibold underline">
                Create an account
              </Link>
              .
            </>
          )}
        </Alert>
      )}

      <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
        <Field label="Email" htmlFor="email" error={error?.fieldErrors.email}>
          <Input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </Field>

        <Button type="submit" className="w-full" loading={busy}>
          Send reset code
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
          <ForgotPasswordForm />
        </React.Suspense>
      </div>
    </div>
  );
}
