"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, KeyRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { PanelHeader } from "@/components/layout/panel-shell";
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Field,
  Input,
} from "@/components/ui";
import { authApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { useRequireAuth } from "@/providers/auth-provider";

export default function ChangePasswordPage() {
  const { ready } = useRequireAuth({
    roles: ["astrologer", "admin", "super_admin"],
    signInPath: "/login",
  });
  const router = useRouter();
  const queryClient = useQueryClient();

  const [current, setCurrent] = React.useState("");
  const [next, setNext] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [mismatch, setMismatch] = React.useState(false);

  const change = useMutation({
    mutationFn: () => authApi.changePassword(next, current),
    onSuccess: async () => {
      toast.success("Password changed.");
      // `must_change_password` has flipped, so the profile banner must refresh.
      await queryClient.invalidateQueries({ queryKey: ["astrologer", "me"] });
      router.push("/me");
    },
    onError: (error: ApiError) => {
      if (error.status !== 422) toast.error(error.message);
    },
  });

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (next !== confirm) {
      setMismatch(true);
      return;
    }
    setMismatch(false);
    change.mutate();
  }

  const errors = (change.error as ApiError | null)?.fieldErrors ?? {};

  if (!ready) return null;

  return (
    <>
      <Link
        href="/me"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        My profile
      </Link>

      <PanelHeader title="Change password" />

      <form onSubmit={onSubmit} className="max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Choose your own password</CardTitle>
            <CardDescription>
              If you are still on the one we emailed you, replace it — only you should
              know the password you keep.
            </CardDescription>
          </CardHeader>

          <CardBody className="space-y-4 pt-0">
            <Field
              label="Current password"
              htmlFor="current"
              required
              error={errors.current_password}
            >
              <Input
                id="current"
                type="password"
                required
                autoComplete="current-password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
              />
            </Field>

            <Field
              label="New password"
              htmlFor="new"
              required
              hint="At least 6 characters"
              error={errors.new_password}
            >
              <Input
                id="new"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={next}
                invalid={Boolean(errors.new_password)}
                onChange={(e) => setNext(e.target.value)}
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

            {change.error && (change.error as ApiError).status !== 422 && (
              <Alert tone="error">{(change.error as ApiError).message}</Alert>
            )}
          </CardBody>

          <CardFooter className="justify-end">
            <Link href="/me">
              <Button variant="secondary" type="button">
                Cancel
              </Button>
            </Link>
            <Button type="submit" loading={change.isPending}>
              <KeyRound className="size-4" />
              Change password
            </Button>
          </CardFooter>
        </Card>
      </form>
    </>
  );
}
