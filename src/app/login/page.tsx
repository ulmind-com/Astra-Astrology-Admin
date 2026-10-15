"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { Alert, Button, Field, Input, Year } from "@/components/ui";
import { authApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/providers/auth-provider";

export default function AdminLoginPage() {
  const router = useRouter();
  const { signIn, user, loading } = useAuth();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<ApiError | null>(null);
  const [busy, setBusy] = React.useState(false);

  // Already signed in — go where this role belongs.
  React.useEffect(() => {
    if (loading || !user) return;
    router.replace(user.role === "astrologer" ? "/me" : "/dashboard");
  }, [user, loading, router]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const result = await authApi.login(email, password);

      // This panel is not for ordinary users; say so rather than looping them
      // through a dashboard they cannot see.
      if (result.user.role === "user") {
        setError(
          new ApiError(
            "This panel is for astrologers and admins. Your account is a regular user account.",
            403,
            "insufficient_role",
          ),
        );
        setBusy(false);
        return;
      }

      signIn(result);
      toast.success(`Signed in as ${result.user.first_name}`);
      router.replace(result.user.role === "astrologer" ? "/me" : "/dashboard");
    } catch (caught) {
      setError(caught as ApiError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-stars relative flex min-h-dvh items-center justify-center bg-cosmos px-4">
      <div className="relative w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-white/10 text-white backdrop-blur">
            <Sparkles className="size-6" />
          </span>
          <h1 className="mt-4 text-2xl font-bold text-white">Astra Astrology</h1>
          <p className="mt-1 text-sm text-brand-100/70">Admin & astrologer panel</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/95 p-6 shadow-lift backdrop-blur dark:bg-surface/95">
          {error && (
            <Alert tone="error" className="mb-5">
              {error.message}
            </Alert>
          )}

          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <Field label="Email" htmlFor="email" error={error?.fieldErrors.email}>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@astra.com"
              />
            </Field>

            <Field label="Password" htmlFor="password" error={error?.fieldErrors.password}>
              <Input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </Field>

            <Button type="submit" className="w-full" loading={busy}>
              Sign in
              <ArrowRight className="size-4" />
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            Forgot your password?{" "}
            <Link
              href="/forgot-password"
              className="font-medium text-brand-600 hover:underline dark:text-brand-300"
            >
              Reset it
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-brand-100/50">
          © <Year /> Astra Astrology
        </p>
      </div>
    </div>
  );
}
