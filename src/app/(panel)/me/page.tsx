"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, ImagePlus, Lock, Trash2, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";

import { PanelHeader } from "@/components/layout/panel-shell";
import { LANGUAGE_SUGGESTIONS, SkillPicker, TagInput } from "@/components/skill-picker";
import {
  Alert,
  Avatar,
  Button,
  Card,
  CardBody,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Field,
  Input,
  LoadingBlock,
  StatusDot,
  Switch,
  Textarea,
} from "@/components/ui";
import { astrologerApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { formatCurrency } from "@/lib/utils";
import type { AstrologerUpdate, Skill } from "@/types";
import { useRequireAuth } from "@/providers/auth-provider";

const ME_KEY = ["astrologer", "me"] as const;

export default function AstrologerPanelPage() {
  const { ready } = useRequireAuth({ roles: ["astrologer"], signInPath: "/login" });
  const queryClient = useQueryClient();

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ME_KEY,
    queryFn: astrologerApi.me,
    enabled: ready,
  });

  const [form, setForm] = React.useState({
    first_name: "",
    last_name: "",
    phone: "",
    display_name: "",
    tagline: "",
    bio: "",
    experience_years: "0",
  });
  const [skills, setSkills] = React.useState<Skill[]>([]);
  const [languages, setLanguages] = React.useState<string[]>([]);
  const [specialisations, setSpecialisations] = React.useState<string[]>([]);
  const [qualifications, setQualifications] = React.useState<string[]>([]);
  const [uploading, setUploading] = React.useState(false);
  const photoRef = React.useRef<HTMLInputElement>(null);
  const galleryRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!profile) return;
    setForm({
      first_name: profile.first_name,
      last_name: profile.last_name ?? "",
      phone: profile.phone ?? "",
      display_name: profile.display_name,
      tagline: profile.tagline ?? "",
      bio: profile.bio ?? "",
      experience_years: String(profile.experience_years),
    });
    setSkills(profile.skills);
    setLanguages(profile.languages);
    setSpecialisations(profile.specialisations);
    setQualifications(profile.qualifications);
  }, [profile]);

  const save = useMutation({
    mutationFn: (body: AstrologerUpdate) => astrologerApi.updateMe(body),
    onSuccess: (updated) => {
      queryClient.setQueryData(ME_KEY, updated);
      toast.success("Profile updated.");
    },
    onError: (e: ApiError) => {
      if (e.status !== 422) toast.error(e.message);
    },
  });

  const availability = useMutation({
    mutationFn: (next: {
      is_online?: boolean;
      is_available_for_chat?: boolean;
      is_available_for_call?: boolean;
      is_available_for_video?: boolean;
    }) =>
      astrologerApi.setAvailability(next),
    onSuccess: (updated) => queryClient.setQueryData(ME_KEY, updated),
    onError: (e: ApiError) => toast.error(e.message),
  });

  async function uploadPhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      queryClient.setQueryData(ME_KEY, await astrologerApi.uploadImage(file));
      toast.success("Photo updated.");
    } catch (caught) {
      toast.error((caught as ApiError).message);
    } finally {
      setUploading(false);
      if (photoRef.current) photoRef.current.value = "";
    }
  }

  async function addGalleryImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await astrologerApi.addGalleryImage(file);
      await queryClient.invalidateQueries({ queryKey: ME_KEY });
      toast.success("Added to your gallery.");
    } catch (caught) {
      toast.error((caught as ApiError).message);
    } finally {
      setUploading(false);
      if (galleryRef.current) galleryRef.current.value = "";
    }
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    save.mutate({
      first_name: form.first_name,
      last_name: form.last_name.trim() || null,
      phone: form.phone.trim() || null,
      display_name: form.display_name,
      tagline: form.tagline.trim() || null,
      bio: form.bio.trim() || null,
      experience_years: Number(form.experience_years || 0),
      skills,
      languages,
      specialisations,
      qualifications,
    });
  }

  const set = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm({ ...form, [key]: e.target.value });

  const errors = (save.error as ApiError | null)?.fieldErrors ?? {};

  if (!ready) return null;
  if (isLoading) return <LoadingBlock label="Loading your profile…" />;
  if (error) return <Alert tone="error">{(error as ApiError).message}</Alert>;
  if (!profile) return null;

  return (
    <>
      <PanelHeader
        title="My profile"
        description="This is what people see in the directory."
      />

      {profile.must_change_password && (
        <Alert tone="warning" title="You are still using the password we emailed you" className="mb-6">
          <span className="flex flex-wrap items-center gap-2">
            Choose your own — only you should know it.
            <Link href="/me/password">
              <Button size="sm" variant="secondary">
                <Lock className="size-3.5" />
                Change password
              </Button>
            </Link>
          </span>
        </Alert>
      )}

      {/* ----------------------------------------------- availability */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Availability</CardTitle>
          <CardDescription>
            Going online puts you at the top of the directory.
          </CardDescription>
        </CardHeader>
        <CardBody className="space-y-4 pt-0">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-muted p-3.5">
            <StatusDot
              online={profile.availability.is_online}
              busy={profile.availability.is_busy}
            />
            <span className="flex-1 text-sm font-medium">
              {profile.availability.is_online ? "You are online" : "You are offline"}
            </span>
            <Switch
              checked={profile.availability.is_online}
              disabled={availability.isPending}
              onChange={(next) => availability.mutate({ is_online: next })}
            />
          </div>

          <Switch
            checked={profile.availability.is_available_for_chat}
            disabled={availability.isPending}
            onChange={(next) => availability.mutate({ is_available_for_chat: next })}
            label="Available for chat"
          />
          <Switch
            checked={profile.availability.is_available_for_call}
            disabled={availability.isPending}
            onChange={(next) => availability.mutate({ is_available_for_call: next })}
            label="Available for calls"
          />
          {/* Only shown when an admin has enabled video for this account —
              a toggle for something you cannot be booked for is noise. */}
          {profile.modes_enabled.includes("video") && (
            <Switch
              checked={profile.availability.is_available_for_video}
              disabled={availability.isPending}
              onChange={(next) => availability.mutate({ is_available_for_video: next })}
              label="Available for video calls"
            />
          )}
        </CardBody>
      </Card>

      {/* ------------------------------------------------------ photo */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Photo</CardTitle>
          <CardDescription>A clear face photo. We resize it for you.</CardDescription>
        </CardHeader>
        <CardBody className="flex flex-wrap items-center gap-5 pt-0">
          <Avatar src={profile.profile_image_url} name={profile.display_name} size="xl" />

          <div className="flex flex-wrap gap-2">
            <input
              ref={photoRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={uploadPhoto}
            />
            <Button
              variant="secondary"
              size="sm"
              loading={uploading}
              onClick={() => photoRef.current?.click()}
            >
              <Camera className="size-4" />
              {profile.profile_image_url ? "Change photo" : "Upload photo"}
            </Button>

            {profile.profile_image_url && (
              <Button
                variant="ghost"
                size="sm"
                disabled={uploading}
                className="text-danger hover:bg-danger/15"
                onClick={async () => {
                  setUploading(true);
                  try {
                    queryClient.setQueryData(ME_KEY, await astrologerApi.removeImage());
                    toast.success("Photo removed.");
                  } catch (caught) {
                    toast.error((caught as ApiError).message);
                  } finally {
                    setUploading(false);
                  }
                }}
              >
                <Trash2 className="size-4" />
                Remove
              </Button>
            )}
          </div>
        </CardBody>
      </Card>

      {/* ---------------------------------------------------- gallery */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Gallery</CardTitle>
          <CardDescription>Up to 12 images. {profile.gallery.length} used.</CardDescription>
        </CardHeader>
        <CardBody className="space-y-4 pt-0">
          {profile.gallery.length > 0 && (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {profile.gallery.map((image) => (
                <div
                  key={image.public_id}
                  className="group relative aspect-square overflow-hidden rounded-xl bg-surface-muted"
                >
                  <Image
                    src={image.url}
                    alt=""
                    fill
                    sizes="150px"
                    className="object-cover"
                    unoptimized
                  />
                  <button
                    type="button"
                    aria-label="Remove image"
                    onClick={async () => {
                      try {
                        await astrologerApi.removeGalleryImage(image.public_id);
                        await queryClient.invalidateQueries({ queryKey: ME_KEY });
                        toast.success("Image removed.");
                      } catch (caught) {
                        toast.error((caught as ApiError).message);
                      }
                    }}
                    className="absolute top-1.5 right-1.5 rounded-full bg-ink-900/40 p-1.5 text-brand-950 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={addGalleryImage}
          />
          <Button
            variant="secondary"
            size="sm"
            loading={uploading}
            disabled={profile.gallery.length >= 12}
            onClick={() => galleryRef.current?.click()}
          >
            <ImagePlus className="size-4" />
            {profile.gallery.length >= 12 ? "Gallery is full" : "Add an image"}
          </Button>
        </CardBody>
      </Card>

      {/* ---------------------------------------------------- details */}
      <form onSubmit={onSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Your details</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4 pt-0">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="First name" htmlFor="first_name" required error={errors.first_name}>
                <Input
                  id="first_name"
                  required
                  value={form.first_name}
                  onChange={set("first_name")}
                />
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
                <Input value={profile.email} disabled readOnly />
              </Field>
            </div>

            <Field label="Tagline" htmlFor="tagline" hint="One line, shown under your name">
              <Input id="tagline" value={form.tagline} onChange={set("tagline")} />
            </Field>

            <Field label="About you" htmlFor="bio">
              <Textarea id="bio" rows={5} value={form.bio} onChange={set("bio")} />
            </Field>

            <Field label="Specialities">
              <SkillPicker value={skills} onChange={setSkills} />
            </Field>

            <Field label="Languages you speak">
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
                placeholder="e.g. Marriage matching"
              />
            </Field>

            <Field label="Qualifications">
              <TagInput
                value={qualifications}
                onChange={setQualifications}
                placeholder="e.g. Jyotish Acharya"
              />
            </Field>
          </CardBody>

          <CardFooter className="justify-end">
            <Button type="submit" loading={save.isPending}>
              Save changes
            </Button>
          </CardFooter>
        </Card>
      </form>

    </>
  );
}
