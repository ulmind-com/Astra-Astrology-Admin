"use client";

import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, Copy, MailCheck, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { PanelHeader } from "@/components/layout/panel-shell";
import { LANGUAGE_SUGGESTIONS, SkillPicker, TagInput } from "@/components/skill-picker";
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
  Switch,
  Textarea,
} from "@/components/ui";
import { adminApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import {
  MODE_LABELS,
  type AstrologerCreate,
  type AstrologerCreated,
  type ConsultationMode,
  type Skill,
} from "@/types";
import { useRequireAuth } from "@/providers/auth-provider";

export default function NewAstrologerPage() {
  const router = useRouter();
  const { ready } = useRequireAuth({ roles: ["admin", "super_admin"], signInPath: "/login" });

  const [form, setForm] = React.useState({
    email: "",
    first_name: "",
    middle_name: "",
    last_name: "",
    phone: "",
    display_name: "",
    tagline: "",
    bio: "",
    experience_years: "0",
    chat: "",
    call: "",
    video: "",
    commission_percent: "50",
    is_listed: true,
    is_featured: false,
  });
  const [skills, setSkills] = React.useState<Skill[]>([]);
  const [modes, setModes] = React.useState<ConsultationMode[]>([
    "chat",
    "call",
    "video",
  ]);
  const [languages, setLanguages] = React.useState<string[]>([]);
  const [specialisations, setSpecialisations] = React.useState<string[]>([]);
  const [qualifications, setQualifications] = React.useState<string[]>([]);
  const [created, setCreated] = React.useState<AstrologerCreated | null>(null);

  const create = useMutation({
    mutationFn: (body: AstrologerCreate) => adminApi.createAstrologer(body),
    onSuccess: (result) => {
      setCreated(result);
      toast.success(
        result.welcome_email_sent
          ? "Astrologer created and emailed their password."
          : "Astrologer created — the welcome email failed.",
      );
    },
    onError: (error: ApiError) => {
      if (error.status !== 422) toast.error(error.message);
    },
  });

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const number = (value: string) => (value.trim() === "" ? 0 : Number(value));
    // Blank means "use the platform default" — a real choice, not zero.
    const optional = (value: string) => (value.trim() === "" ? null : Number(value));

    create.mutate({
      email: form.email,
      first_name: form.first_name,
      middle_name: form.middle_name.trim() || null,
      last_name: form.last_name.trim() || null,
      phone: form.phone.trim() || null,
      display_name: form.display_name.trim() || null,
      tagline: form.tagline.trim() || null,
      bio: form.bio.trim() || null,
      skills,
      modes_enabled: modes,
      languages,
      specialisations,
      qualifications,
      experience_years: number(form.experience_years),
      rates: {
        chat_coins_per_minute: optional(form.chat),
        call_coins_per_minute: optional(form.call),
        video_coins_per_minute: optional(form.video),
      },
      commission_percent: number(form.commission_percent),
      is_listed: form.is_listed,
      is_featured: form.is_featured,
      display_order: 0,
    });
  }

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [key]: e.target.value });

  const errors = (create.error as ApiError | null)?.fieldErrors ?? {};

  if (!ready) return null;

  // ------------------------------------------------------------- done
  if (created) {
    const { astrologer, welcome_email_sent, initial_password } = created;
    return (
      <>
        <PanelHeader title="Astrologer created" />

        <Card className="max-w-xl">
          <CardBody className="space-y-5">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                <MailCheck className="size-5" />
              </span>
              <div>
                <p className="font-semibold">{astrologer.display_name}</p>
                <p className="text-sm text-muted-foreground">{astrologer.email}</p>
              </div>
            </div>

            {welcome_email_sent ? (
              <Alert tone="success" title="Sign-in details emailed">
                They have been sent their email address and a temporary password, and
                will be asked to change it after signing in.
              </Alert>
            ) : (
              <>
                <Alert tone="warning" title="The welcome email could not be sent">
                  The account exists, but you will have to pass the password on yourself.
                  <strong> This is the only time it is shown.</strong>
                </Alert>

                {initial_password && (
                  <div className="flex items-center gap-2 rounded-xl border border-border bg-surface-muted p-3">
                    <code className="flex-1 font-mono text-sm">{initial_password}</code>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        void navigator.clipboard.writeText(initial_password);
                        toast.success("Password copied.");
                      }}
                    >
                      <Copy className="size-3.5" />
                      Copy
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardBody>

          <CardFooter className="justify-end">
            <Button variant="secondary" onClick={() => router.push("/astrologers")}>
              Back to list
            </Button>
            <Link href={`/astrologers/${astrologer.id}`}>
              <Button>Open profile</Button>
            </Link>
          </CardFooter>
        </Card>
      </>
    );
  }

  // ------------------------------------------------------------- form
  return (
    <>
      <Link
        href="/astrologers"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Astrologers
      </Link>

      <PanelHeader
        title="Add an astrologer"
        description="They will be emailed a password — you do not choose one for them."
      />

      <form onSubmit={onSubmit} className="max-w-3xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>
              The email is their sign-in identity and cannot be changed later.
            </CardDescription>
          </CardHeader>
          <CardBody className="grid gap-4 pt-0 sm:grid-cols-2">
            <Field
              label="Email"
              htmlFor="email"
              required
              className="sm:col-span-2"
              error={errors.email}
            >
              <Input
                id="email"
                type="email"
                required
                value={form.email}
                invalid={Boolean(errors.email)}
                onChange={set("email")}
                placeholder="astrologer@example.com"
              />
            </Field>

            <Field label="First name" htmlFor="first_name" required error={errors.first_name}>
              <Input
                id="first_name"
                required
                value={form.first_name}
                invalid={Boolean(errors.first_name)}
                onChange={set("first_name")}
              />
            </Field>

            <Field label="Middle name" htmlFor="middle_name">
              <Input id="middle_name" value={form.middle_name} onChange={set("middle_name")} />
            </Field>

            <Field label="Last name" htmlFor="last_name">
              <Input id="last_name" value={form.last_name} onChange={set("last_name")} />
            </Field>

            <Field label="Phone" htmlFor="phone" error={errors.phone}>
              <Input
                id="phone"
                type="tel"
                value={form.phone}
                invalid={Boolean(errors.phone)}
                onChange={set("phone")}
              />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Public profile</CardTitle>
            <CardDescription>What people see in the directory.</CardDescription>
          </CardHeader>
          <CardBody className="space-y-4 pt-0">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Display name"
                htmlFor="display_name"
                hint="Defaults to their full name"
              >
                <Input
                  id="display_name"
                  value={form.display_name}
                  onChange={set("display_name")}
                  placeholder="Acharya Ravi Sharma"
                />
              </Field>

              <Field label="Years of experience" htmlFor="experience_years">
                <Input
                  id="experience_years"
                  type="number"
                  min={0}
                  max={90}
                  value={form.experience_years}
                  onChange={set("experience_years")}
                />
              </Field>
            </div>

            <Field label="Tagline" htmlFor="tagline">
              <Input
                id="tagline"
                value={form.tagline}
                onChange={set("tagline")}
                placeholder="Vedic astrologer since 2012"
              />
            </Field>

            <Field label="Bio" htmlFor="bio">
              <Textarea id="bio" rows={4} value={form.bio} onChange={set("bio")} />
            </Field>

            <Field label="Specialities">
              <SkillPicker value={skills} onChange={setSkills} />
            </Field>

            <Field
              label="Consultation types"
              hint="What they can be booked for. Unticked means people cannot start that kind of session at all."
            >
              <div className="flex flex-wrap gap-2">
                {(["chat", "call", "video"] as ConsultationMode[]).map((mode) => {
                  const on = modes.includes(mode);
                  return (
                    <button
                      key={mode}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        setModes((current) =>
                          current.includes(mode)
                            ? current.filter((m) => m !== mode)
                            : [...current, mode],
                        )
                      }
                      className={cn(
                        "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                        on
                          ? "border-brand-500 bg-brand-500 text-white"
                          : "border-border bg-surface hover:border-border-strong",
                      )}
                    >
                      {MODE_LABELS[mode]}
                    </button>
                  );
                })}
              </div>
            </Field>

            <Field label="Languages">
              <TagInput
                value={languages}
                onChange={setLanguages}
                placeholder="Add a language"
                suggestions={LANGUAGE_SUGGESTIONS}
              />
            </Field>

            <Field label="Other specialisations" hint="Free text — e.g. Marriage matching">
              <TagInput
                value={specialisations}
                onChange={setSpecialisations}
                placeholder="Add a speciality"
              />
            </Field>

            <Field label="Qualifications">
              <TagInput
                value={qualifications}
                onChange={setQualifications}
                placeholder="Add a qualification"
              />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rates and listing</CardTitle>
            <CardDescription>
              Coins per started minute. Leave a box empty to use the platform
              default. Astrologers cannot change their own pricing.
            </CardDescription>
          </CardHeader>
          <CardBody className="space-y-4 pt-0">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Chat coins/min" htmlFor="chat" hint="Blank = default">
                <Input id="chat" type="number" min={0} value={form.chat} onChange={set("chat")} />
              </Field>
              <Field label="Call coins/min" htmlFor="call" hint="Blank = default">
                <Input id="call" type="number" min={0} value={form.call} onChange={set("call")} />
              </Field>
              <Field label="Video coins/min" htmlFor="video" hint="Blank = default">
                <Input
                  id="video"
                  type="number"
                  min={0}
                  value={form.video}
                  onChange={set("video")}
                />
              </Field>
            </div>

            <Field
              label="Commission %"
              htmlFor="commission"
              hint="The platform's share of each consultation"
              error={errors.commission_percent}
            >
              <Input
                id="commission"
                type="number"
                min={0}
                max={100}
                value={form.commission_percent}
                onChange={set("commission_percent")}
                className="max-w-32"
              />
            </Field>

            <div className="space-y-3 border-t border-border pt-4">
              <Switch
                checked={form.is_listed}
                onChange={(next) => setForm({ ...form, is_listed: next })}
                label="Show in the public directory"
                description="Turn off to set the profile up before anyone sees it."
              />
              <Switch
                checked={form.is_featured}
                onChange={(next) => setForm({ ...form, is_featured: next })}
                label="Feature them"
                description="Featured astrologers appear above the rest."
              />
            </div>
          </CardBody>

          <CardFooter className="justify-end">
            <Link href="/astrologers">
              <Button variant="secondary" type="button">
                Cancel
              </Button>
            </Link>
            <Button type="submit" loading={create.isPending}>
              Create and send password
            </Button>
          </CardFooter>
        </Card>

        {create.error && (create.error as ApiError).status === 409 && (
          <Alert tone="error" title="That email is taken">
            <span className="flex items-start gap-1.5">
              <TriangleAlert className="mt-0.5 size-0" aria-hidden />
              {(create.error as ApiError).message}
            </span>
          </Alert>
        )}
      </form>
    </>
  );
}
