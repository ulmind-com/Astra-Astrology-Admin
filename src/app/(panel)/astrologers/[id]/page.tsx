"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink, UserX } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { PanelHeader } from "@/components/layout/panel-shell";
import { LANGUAGE_SUGGESTIONS, SkillPicker, TagInput } from "@/components/skill-picker";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  CardBody,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  ConfirmModal,
  Field,
  Input,
  LoadingBlock,
  Select,
  StatusDot,
  Switch,
  Textarea,
} from "@/components/ui";
import { adminApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { cn, formatDateTime } from "@/lib/utils";
import { MODE_LABELS, type AstrologerAdminUpdate, type ConsultationMode, type Skill } from "@/types";
import { useRequireAuth } from "@/providers/auth-provider";

export default function EditAstrologerPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { ready } = useRequireAuth({ roles: ["admin", "super_admin"], signInPath: "/login" });

  const { data: astrologer, isLoading, error } = useQuery({
    queryKey: ["admin", "astrologer", id],
    queryFn: () => adminApi.getAstrologer(id),
    enabled: ready && Boolean(id),
  });

  const [form, setForm] = React.useState({
    first_name: "",
    middle_name: "",
    last_name: "",
    phone: "",
    display_name: "",
    tagline: "",
    bio: "",
    experience_years: "0",
    chat: "",
    offer_chat: "",
    call: "",
    offer_call: "",
    video: "",
    offer_video: "",
    commission_percent: "50",
    status: "active",
    is_listed: true,
    is_featured: false,
    display_order: "0",
  });
  const [skills, setSkills] = React.useState<Skill[]>([]);
  const [modes, setModes] = React.useState<ConsultationMode[]>([]);
  const [languages, setLanguages] = React.useState<string[]>([]);
  const [specialisations, setSpecialisations] = React.useState<string[]>([]);
  const [qualifications, setQualifications] = React.useState<string[]>([]);
  const [confirmDeactivate, setConfirmDeactivate] = React.useState(false);

  React.useEffect(() => {
    if (!astrologer) return;
    const r = astrologer.rates;
    setForm({
      first_name: astrologer.first_name,
      middle_name: astrologer.middle_name ?? "",
      last_name: astrologer.last_name ?? "",
      phone: astrologer.phone ?? "",
      display_name: astrologer.display_name,
      tagline: astrologer.tagline ?? "",
      bio: astrologer.bio ?? "",
      experience_years: String(astrologer.experience_years),
      chat: String(r.chat_per_minute),
      offer_chat: r.offer_chat_per_minute?.toString() ?? "",
      call: String(r.call_per_minute),
      offer_call: r.offer_call_per_minute?.toString() ?? "",
      video: String(r.video_per_minute),
      offer_video: r.offer_video_per_minute?.toString() ?? "",
      commission_percent: String(astrologer.commission_percent),
      status: astrologer.status,
      is_listed: astrologer.is_listed,
      is_featured: astrologer.is_featured,
      display_order: String(astrologer.display_order),
    });
    setSkills(astrologer.skills);
    setModes(astrologer.modes_enabled);
    setLanguages(astrologer.languages);
    setSpecialisations(astrologer.specialisations);
    setQualifications(astrologer.qualifications);
  }, [astrologer]);

  const save = useMutation({
    mutationFn: (body: AstrologerAdminUpdate) => adminApi.updateAstrologer(id, body),
    onSuccess: (updated) => {
      queryClient.setQueryData(["admin", "astrologer", id], updated);
      queryClient.invalidateQueries({ queryKey: ["admin", "astrologers"] });
      toast.success("Astrologer updated.");
    },
    onError: (e: ApiError) => {
      if (e.status !== 422) toast.error(e.message);
    },
  });

  const deactivate = useMutation({
    mutationFn: () => adminApi.deactivateAstrologer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin"] });
      toast.success("Astrologer deactivated.");
      router.push("/astrologers");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const num = (v: string) => (v.trim() === "" ? 0 : Number(v));
    const optional = (v: string) => (v.trim() === "" ? null : Number(v));

    save.mutate({
      first_name: form.first_name,
      middle_name: form.middle_name.trim() || null,
      last_name: form.last_name.trim() || null,
      phone: form.phone.trim() || null,
      display_name: form.display_name,
      tagline: form.tagline.trim() || null,
      bio: form.bio.trim() || null,
      skills,
      modes_enabled: modes,
      languages,
      specialisations,
      qualifications,
      experience_years: num(form.experience_years),
      rates: {
        chat_per_minute: num(form.chat),
        offer_chat_per_minute: optional(form.offer_chat),
        call_per_minute: num(form.call),
        offer_call_per_minute: optional(form.offer_call),
        video_per_minute: num(form.video),
        offer_video_per_minute: optional(form.offer_video),
        currency: "INR",
      },
      commission_percent: num(form.commission_percent),
      status: form.status as AstrologerAdminUpdate["status"],
      is_listed: form.is_listed,
      is_featured: form.is_featured,
      display_order: num(form.display_order),
    });
  }

  const set = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm({ ...form, [key]: e.target.value });

  const errors = (save.error as ApiError | null)?.fieldErrors ?? {};

  if (!ready) return null;
  if (isLoading) return <LoadingBlock label="Loading astrologer…" />;
  if (error) return <Alert tone="error">{(error as ApiError).message}</Alert>;
  if (!astrologer) return null;

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
        title={astrologer.display_name}
        description={astrologer.email}
        action={
          astrologer.slug && astrologer.is_listed ? (
            <a
              href={`/astrologers/${astrologer.slug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:underline dark:text-brand-300"
            >
              Public page
              <ExternalLink className="size-3.5" />
            </a>
          ) : null
        }
      />

      <Card className="mb-6">
        <CardBody className="flex flex-wrap items-center gap-4">
          <div className="relative">
            <Avatar
              src={astrologer.profile_image_url}
              name={astrologer.display_name}
              size="lg"
            />
            <span className="absolute -right-0.5 -bottom-0.5 rounded-full bg-surface p-0.5">
              <StatusDot
                online={astrologer.availability.is_online}
                busy={astrologer.availability.is_busy}
              />
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap gap-1.5">
              <Badge tone={astrologer.status === "active" ? "green" : "red"}>
                {astrologer.status}
              </Badge>
              <Badge tone={astrologer.availability.is_online ? "green" : "neutral"}>
                {astrologer.availability.is_online ? "Online" : "Offline"}
              </Badge>
              {astrologer.must_change_password && (
                <Badge tone="blue">Has not set their own password</Badge>
              )}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Last sign-in: {formatDateTime(astrologer.last_login_at)}
              {" · "}Added {formatDateTime(astrologer.created_at)}
            </p>
          </div>
        </CardBody>
      </Card>

      <form onSubmit={onSubmit} className="max-w-3xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4 pt-0">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="First name" htmlFor="first_name" required error={errors.first_name}>
                <Input id="first_name" required value={form.first_name} onChange={set("first_name")} />
              </Field>
              <Field label="Last name" htmlFor="last_name">
                <Input id="last_name" value={form.last_name} onChange={set("last_name")} />
              </Field>
              <Field label="Display name" htmlFor="display_name" required>
                <Input
                  id="display_name"
                  required
                  value={form.display_name}
                  onChange={set("display_name")}
                />
              </Field>
              <Field label="Phone" htmlFor="phone" error={errors.phone}>
                <Input id="phone" value={form.phone} onChange={set("phone")} />
              </Field>
              <Field label="Years of experience" htmlFor="exp">
                <Input
                  id="exp"
                  type="number"
                  min={0}
                  max={90}
                  value={form.experience_years}
                  onChange={set("experience_years")}
                />
              </Field>
              <Field label="Email" hint="Cannot be changed">
                <Input value={astrologer.email} disabled readOnly />
              </Field>
            </div>

            <Field label="Tagline" htmlFor="tagline">
              <Input id="tagline" value={form.tagline} onChange={set("tagline")} />
            </Field>

            <Field label="Bio" htmlFor="bio">
              <Textarea id="bio" rows={4} value={form.bio} onChange={set("bio")} />
            </Field>

            <Field label="Specialities">
              <SkillPicker value={skills} onChange={setSkills} />
            </Field>

            <Field
              label="Consultation types"
              hint="What this astrologer can be booked for. Unticked means people cannot start that kind of session at all."
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

            <Field label="Other specialisations">
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
            <CardTitle>Rates</CardTitle>
            <CardDescription>
              Leave an offer price empty to charge the full rate.
            </CardDescription>
          </CardHeader>
          <CardBody className="space-y-4 pt-0">
            {(["chat", "call", "video"] as const).map((mode) => (
              <div key={mode} className="grid gap-3 sm:grid-cols-2">
                <Field label={`${mode[0].toUpperCase()}${mode.slice(1)} ₹/min`} htmlFor={mode}>
                  <Input
                    id={mode}
                    type="number"
                    min={0}
                    value={form[mode]}
                    onChange={set(mode)}
                  />
                </Field>
                <Field label="Offer price ₹/min" htmlFor={`offer_${mode}`} hint="Optional">
                  <Input
                    id={`offer_${mode}`}
                    type="number"
                    min={0}
                    value={form[`offer_${mode}` as keyof typeof form] as string}
                    onChange={set(`offer_${mode}` as keyof typeof form)}
                  />
                </Field>
              </div>
            ))}

            <Field
              label="Commission %"
              htmlFor="commission"
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
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Listing and status</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4 pt-0">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Account status" htmlFor="status">
                <Select id="status" value={form.status} onChange={set("status")}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </Select>
              </Field>
              <Field
                label="Display order"
                htmlFor="order"
                hint="Lower numbers come first"
              >
                <Input
                  id="order"
                  type="number"
                  value={form.display_order}
                  onChange={set("display_order")}
                />
              </Field>
            </div>

            {form.status !== "active" && (
              <Alert tone="warning">
                A non-active account cannot sign in, and is taken out of the public
                directory automatically.
              </Alert>
            )}

            <div className="space-y-3 border-t border-border pt-4">
              <Switch
                checked={form.is_listed}
                onChange={(next) => setForm({ ...form, is_listed: next })}
                label="Show in the public directory"
              />
              <Switch
                checked={form.is_featured}
                onChange={(next) => setForm({ ...form, is_featured: next })}
                label="Feature them"
              />
            </div>
          </CardBody>

          <CardFooter className="justify-end">
            <Button type="submit" loading={save.isPending}>
              Save changes
            </Button>
          </CardFooter>
        </Card>

        <Card className="border-red-200 dark:border-red-500/30">
          <CardHeader>
            <CardTitle className="text-red-700 dark:text-red-400">Deactivate</CardTitle>
            <CardDescription>
              Suspends the account and removes them from the directory. Their history is
              kept, so this is not a delete.
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-end">
            <Button
              type="button"
              variant="danger"
              onClick={() => setConfirmDeactivate(true)}
              disabled={astrologer.status !== "active"}
            >
              <UserX className="size-4" />
              {astrologer.status === "active" ? "Deactivate" : "Already deactivated"}
            </Button>
          </CardFooter>
        </Card>
      </form>

      <ConfirmModal
        open={confirmDeactivate}
        onClose={() => setConfirmDeactivate(false)}
        onConfirm={() => deactivate.mutate()}
        loading={deactivate.isPending}
        title={`Deactivate ${astrologer.display_name}?`}
        description="They will not be able to sign in, and will disappear from the directory. You can set the status back to active later."
        confirmLabel="Deactivate"
      />
    </>
  );
}
