"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Award,
  BookOpen,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  Globe,
  HeartHandshake,
  ImagePlus,
  Info,
  Lock,
  Maximize2,
  MessageSquare,
  Phone,
  PhoneCall,
  Save,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  Upload,
  User,
  Video,
  X,
  Zap,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";

import { LANGUAGE_SUGGESTIONS, SkillPicker, TagInput } from "@/components/skill-picker";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  LoadingBlock,
  Modal,
} from "@/components/ui";
import { astrologerApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { useRequireAuth } from "@/providers/auth-provider";
import type { AstrologerUpdate, Skill } from "@/types";

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

  // Loading states for media
  const [uploadingPhoto, setUploadingPhoto] = React.useState(false);
  const [uploadingBanner, setUploadingBanner] = React.useState(false);
  const [uploadingGallery, setUploadingGallery] = React.useState(false);

  // Lightbox modal state
  const [activeLightboxUrl, setActiveLightboxUrl] = React.useState<string | null>(null);

  const photoRef = React.useRef<HTMLInputElement>(null);
  const bannerRef = React.useRef<HTMLInputElement>(null);
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
      toast.success("Profile updated successfully!");
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
    }) => astrologerApi.setAvailability(next),
    onSuccess: (updated) => {
      queryClient.setQueryData(ME_KEY, updated);
      toast.success("Availability updated.");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });

  // Media Handlers
  async function uploadPhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const updated = await astrologerApi.uploadImage(file);
      queryClient.setQueryData(ME_KEY, updated);
      toast.success("Profile photo updated successfully!");
    } catch (caught) {
      toast.error((caught as ApiError).message);
    } finally {
      setUploadingPhoto(false);
      if (photoRef.current) photoRef.current.value = "";
    }
  }

  async function removePhoto() {
    setUploadingPhoto(true);
    try {
      const updated = await astrologerApi.removeImage();
      queryClient.setQueryData(ME_KEY, updated);
      toast.success("Profile photo removed.");
    } catch (caught) {
      toast.error((caught as ApiError).message);
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function uploadBanner(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingBanner(true);
    try {
      const updated = await astrologerApi.uploadBanner(file);
      queryClient.setQueryData(ME_KEY, updated);
      toast.success("Card banner image updated!");
    } catch (caught) {
      toast.error((caught as ApiError).message);
    } finally {
      setUploadingBanner(false);
      if (bannerRef.current) bannerRef.current.value = "";
    }
  }

  async function removeBanner() {
    setUploadingBanner(true);
    try {
      const updated = await astrologerApi.removeBanner();
      queryClient.setQueryData(ME_KEY, updated);
      toast.success("Custom banner removed. Cosmic default active.");
    } catch (caught) {
      toast.error((caught as ApiError).message);
    } finally {
      setUploadingBanner(false);
    }
  }

  async function addGalleryImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingGallery(true);
    try {
      await astrologerApi.addGalleryImage(file);
      await queryClient.invalidateQueries({ queryKey: ME_KEY });
      toast.success("Photo added to your astrologer gallery!");
    } catch (caught) {
      toast.error((caught as ApiError).message);
    } finally {
      setUploadingGallery(false);
      if (galleryRef.current) galleryRef.current.value = "";
    }
  }

  async function removeGalleryImage(publicId: string) {
    try {
      await astrologerApi.removeGalleryImage(publicId);
      await queryClient.invalidateQueries({ queryKey: ME_KEY });
      toast.success("Gallery photo deleted.");
    } catch (caught) {
      toast.error((caught as ApiError).message);
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
  if (isLoading) return <LoadingBlock label="Loading your astrologer profile…" />;
  if (error) return <Alert tone="error">{(error as ApiError).message}</Alert>;
  if (!profile) return null;

  const isOnline = profile.availability.is_online;
  const isBusy = profile.availability.is_busy;

  return (
    <div className="space-y-8 pb-24">
      {/* ------------------------------------------------ PASSWORD REMINDER */}
      {profile.must_change_password && (
        <div className="relative overflow-hidden rounded-3xl border border-amber-300 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-xs">
                <Lock className="size-5" />
              </div>
              <div className="space-y-0.5">
                <h3 className="font-display text-sm font-bold text-amber-950">
                  Temporary Onboarding Password Active
                </h3>
                <p className="text-xs text-amber-800">
                  Please configure a private master password known only to you.
                </p>
              </div>
            </div>
            <Link href="/me/password">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-amber-700 transition-all cursor-pointer"
              >
                <KeyRoundIcon className="size-3.5" />
                <span>Change Password Now</span>
              </button>
            </Link>
          </div>
        </div>
      )}

      {/* ------------------------------------------------ TOP COVER & PROFILE STAGE */}
      <div className="relative rounded-3xl border border-slate-200/90 bg-white shadow-[0_20px_50px_rgba(20,25,45,0.05)] overflow-hidden">
        {/* Banner Cover Area */}
        <div className="relative h-48 sm:h-64 w-full bg-gradient-to-br from-indigo-950 via-[#1A102F] to-[#2D1606] overflow-hidden group">
          {profile.banner_image_url ? (
            <Image
              src={profile.banner_image_url}
              alt="Directory Card Banner"
              fill
              sizes="(max-width: 1200px) 100vw, 1200px"
              className="object-cover transition-transform duration-700 group-hover:scale-102"
              unoptimized
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-gradient-to-tr from-[#0F172A] via-[#1E1B4B] to-[#451A03]">
              <div className="size-16 rounded-full bg-white/5 backdrop-blur-md flex items-center justify-center border border-white/10 mb-2">
                <Sparkles className="size-8 text-amber-400" />
              </div>
              <span className="rounded-full bg-amber-500/20 px-3.5 py-1 text-xs font-bold text-amber-300 border border-amber-500/30">
                Default Celestial Cosmic Banner
              </span>
              <p className="mt-1 text-xs text-slate-300">
                Upload a custom 1200×480 banner to personalize your profile appearance.
              </p>
            </div>
          )}

          {/* Banner Controls Floating on Cover */}
          <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
            <input
              ref={bannerRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={uploadBanner}
            />
            <button
              type="button"
              disabled={uploadingBanner}
              onClick={() => bannerRef.current?.click()}
              className="flex items-center gap-1.5 rounded-xl bg-black/60 backdrop-blur-md px-3.5 py-2 text-xs font-bold text-white border border-white/20 shadow-md hover:bg-black/80 hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <ImagePlus className="size-3.5 text-amber-400" />
              <span>{uploadingBanner ? "Uploading..." : profile.banner_image_url ? "Change Banner" : "Upload Banner"}</span>
            </button>

            {profile.banner_image_url && (
              <button
                type="button"
                disabled={uploadingBanner}
                onClick={removeBanner}
                className="flex size-8 items-center justify-center rounded-xl bg-black/60 backdrop-blur-md text-white/80 border border-white/20 hover:text-rose-400 hover:bg-black/80 transition-all cursor-pointer"
                title="Reset to default cosmic banner"
              >
                <Trash2 className="size-3.5" />
              </button>
            )}

            {profile.banner_image_url && (
              <button
                type="button"
                onClick={() => setActiveLightboxUrl(profile.banner_image_url || null)}
                className="flex size-8 items-center justify-center rounded-xl bg-black/60 backdrop-blur-md text-white/80 border border-white/20 hover:text-amber-400 hover:bg-black/80 transition-all cursor-pointer"
                title="View full banner"
              >
                <Maximize2 className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Profile Details & Photo Bar - Sitting cleanly on high-contrast white surface */}
        <div className="relative px-6 sm:px-8 pb-6 pt-3 bg-white">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            {/* Left: Avatar overlapping banner + Clean Text Info below */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
              {/* Only Avatar overlaps the banner */}
              <div className="relative -mt-16 sm:-mt-20 shrink-0 group">
                <Avatar
                  src={profile.profile_image_url}
                  name={profile.display_name}
                  size="xl"
                  className="size-28 sm:size-32 rounded-3xl ring-4 ring-white shadow-xl bg-white object-cover"
                />

                {/* Live Online Badge on Avatar */}
                <span
                  className={cn(
                    "absolute bottom-1 right-1 flex size-5 items-center justify-center rounded-full ring-2 ring-white shadow-sm",
                    isOnline ? "bg-emerald-500" : "bg-slate-400"
                  )}
                  title={isOnline ? "You are online" : "You are offline"}
                >
                  {isOnline && <span className="size-2 rounded-full bg-white animate-ping opacity-75" />}
                </span>

                {/* Upload Photo Overlay Button */}
                <input
                  ref={photoRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={uploadPhoto}
                />
                <button
                  type="button"
                  disabled={uploadingPhoto}
                  onClick={() => photoRef.current?.click()}
                  className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl bg-black/60 backdrop-blur-xs text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  title="Click to change profile picture"
                >
                  <Camera className="size-6 text-amber-400 mb-1" />
                  <span className="text-[10px] font-bold">
                    {uploadingPhoto ? "Uploading..." : "Change"}
                  </span>
                </button>
              </div>

              {/* Text Information - 100% CRISP, HIGH CONTRAST & READABLE ON WHITE */}
              <div className="space-y-2 pt-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                  <h1 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-slate-900 leading-tight">
                    {profile.display_name}
                  </h1>
                  <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-white shadow-xs">
                    <Sparkles className="size-3 fill-white" />
                    Verified Specialist
                  </span>
                  {profile.availability.is_busy ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-700 border border-rose-200">
                      <span className="size-1.5 rounded-full bg-rose-500" />
                      In Consultation
                    </span>
                  ) : isOnline ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                      <span className="relative flex size-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                      </span>
                      Available Now
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600 border border-slate-200">
                      Offline
                    </span>
                  )}
                </div>

                <p className="text-sm font-bold text-slate-600">
                  {profile.tagline || "Astrology & Horoscope Consultant"}
                </p>

                {/* Metadata badges with high contrast */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1 text-xs">
                  <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100/90 border border-slate-200/80 px-2.5 py-1 font-bold text-slate-700">
                    <Award className="size-3.5 text-amber-600" />
                    <span>{profile.experience_years} Years Experience</span>
                  </span>

                  <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100/90 border border-slate-200/80 px-2.5 py-1 font-bold text-slate-700">
                    <Globe className="size-3.5 text-sky-600" />
                    <span>{profile.languages.slice(0, 3).join(", ") || "Languages not set"}</span>
                  </span>

                  <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100/90 border border-slate-200/80 px-2.5 py-1 font-bold text-slate-700">
                    <Clock className="size-3.5 text-indigo-600" />
                    <span>Consultation by Appointment</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Photo Actions */}
            <div className="flex items-center justify-center md:justify-end gap-2.5 pt-2 sm:pt-0 shrink-0">
              <button
                type="button"
                onClick={() => photoRef.current?.click()}
                disabled={uploadingPhoto}
                className="flex items-center gap-1.5 rounded-2xl border border-slate-200/90 bg-white px-4 py-2 text-xs font-bold text-slate-800 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300 transition-all cursor-pointer shadow-xs"
              >
                <Camera className="size-4 text-amber-600" />
                <span>{uploadingPhoto ? "Uploading..." : "Change Photo"}</span>
              </button>

              {profile.profile_image_url && (
                <button
                  type="button"
                  onClick={removePhoto}
                  disabled={uploadingPhoto}
                  className="flex size-9 items-center justify-center rounded-2xl border border-slate-200/80 bg-white text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-all cursor-pointer shadow-xs"
                  title="Remove profile picture"
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------ AVAILABILITY & CHANNELS COMMAND CENTER */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-[0_16px_40px_rgba(20,25,45,0.05)] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-[0_6px_16px_rgba(16,185,129,0.3)]">
              <Zap className="size-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900">
                Consultation Availability & Live Channels
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Going online places your profile at the top of the Astra live astrologers directory.
              </p>
            </div>
          </div>

          {/* Master Online Toggle */}
          <button
            type="button"
            disabled={availability.isPending}
            onClick={() => availability.mutate({ is_online: !isOnline })}
            className={cn(
              "flex items-center gap-3 rounded-2xl px-5 py-2.5 text-xs font-bold transition-all cursor-pointer border shadow-xs",
              isOnline
                ? "bg-emerald-50 text-emerald-900 border-emerald-300 shadow-[0_4px_16px_rgba(16,185,129,0.15)] hover:bg-emerald-100"
                : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
            )}
          >
            <span className="relative flex size-2.5">
              {isOnline && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              )}
              <span
                className={cn(
                  "relative inline-flex size-2.5 rounded-full",
                  isOnline ? "bg-emerald-500" : "bg-slate-400"
                )}
              />
            </span>
            <span className="font-display text-sm">
              {isOnline ? "LIVE ONLINE NOW" : "CURRENTLY OFFLINE"}
            </span>
          </button>
        </div>

        {/* 3 Channels Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {/* Chat Channel */}
          <div
            onClick={() =>
              availability.mutate({
                is_available_for_chat: !profile.availability.is_available_for_chat,
              })
            }
            className={cn(
              "group relative flex items-center justify-between rounded-2xl border p-4.5 transition-all cursor-pointer",
              profile.availability.is_available_for_chat
                ? "border-amber-300 bg-amber-50/40 shadow-xs"
                : "border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300"
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex size-10 items-center justify-center rounded-xl transition-all",
                  profile.availability.is_available_for_chat
                    ? "bg-amber-500 text-white shadow-xs"
                    : "bg-slate-200 text-slate-500"
                )}
              >
                <MessageSquare className="size-5" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-slate-900">Live Chat</p>
                <p className="text-[11px] text-slate-500">Instant messaging</p>
              </div>
            </div>
            <div
              className={cn(
                "size-5 rounded-full flex items-center justify-center border transition-all",
                profile.availability.is_available_for_chat
                  ? "bg-amber-500 border-amber-500 text-white"
                  : "border-slate-300 bg-white"
              )}
            >
              {profile.availability.is_available_for_chat && <Check className="size-3 stroke-[3]" />}
            </div>
          </div>

          {/* Voice Call Channel */}
          <div
            onClick={() =>
              availability.mutate({
                is_available_for_call: !profile.availability.is_available_for_call,
              })
            }
            className={cn(
              "group relative flex items-center justify-between rounded-2xl border p-4.5 transition-all cursor-pointer",
              profile.availability.is_available_for_call
                ? "border-sky-300 bg-sky-50/40 shadow-xs"
                : "border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300"
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex size-10 items-center justify-center rounded-xl transition-all",
                  profile.availability.is_available_for_call
                    ? "bg-sky-600 text-white shadow-xs"
                    : "bg-slate-200 text-slate-500"
                )}
              >
                <PhoneCall className="size-5" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-slate-900">Audio Call</p>
                <p className="text-[11px] text-slate-500">Voice consultation</p>
              </div>
            </div>
            <div
              className={cn(
                "size-5 rounded-full flex items-center justify-center border transition-all",
                profile.availability.is_available_for_call
                  ? "bg-sky-600 border-sky-600 text-white"
                  : "border-slate-300 bg-white"
              )}
            >
              {profile.availability.is_available_for_call && <Check className="size-3 stroke-[3]" />}
            </div>
          </div>

          {/* Video Call Channel */}
          {profile.modes_enabled.includes("video") && (
            <div
              onClick={() =>
                availability.mutate({
                  is_available_for_video: !profile.availability.is_available_for_video,
                })
              }
              className={cn(
                "group relative flex items-center justify-between rounded-2xl border p-4.5 transition-all cursor-pointer",
                profile.availability.is_available_for_video
                  ? "border-indigo-300 bg-indigo-50/40 shadow-xs"
                  : "border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300"
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex size-10 items-center justify-center rounded-xl transition-all",
                    profile.availability.is_available_for_video
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-slate-200 text-slate-500"
                  )}
                >
                  <Video className="size-5" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-slate-900">Video Call</p>
                  <p className="text-[11px] text-slate-500">Live HD face-to-face</p>
                </div>
              </div>
              <div
                className={cn(
                  "size-5 rounded-full flex items-center justify-center border transition-all",
                  profile.availability.is_available_for_video
                    ? "bg-indigo-600 border-indigo-600 text-white"
                    : "border-slate-300 bg-white"
                )}
              >
                {profile.availability.is_available_for_video && <Check className="size-3 stroke-[3]" />}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------ GALLERY STUDIO (UP TO 12 IMAGES) */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-[0_16px_40px_rgba(20,25,45,0.05)] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-600 to-orange-500 text-white shadow-[0_6px_16px_rgba(217,119,6,0.3)]">
              <ImagePlus className="size-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-lg font-bold text-slate-900">
                  Astrologer Portfolio & Gallery
                </h2>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                  {profile.gallery.length} / 12 Photos
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Upload your puja ceremonies, certificates, consultation room, and astrological charts.
              </p>
            </div>
          </div>

          {/* Add to Gallery Action Button */}
          <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={addGalleryImage}
          />
          <button
            type="button"
            disabled={uploadingGallery || profile.gallery.length >= 12}
            onClick={() => galleryRef.current?.click()}
            className="flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition-all cursor-pointer disabled:opacity-50 shadow-xs"
          >
            <PlusIcon className="size-4" />
            <span>{uploadingGallery ? "Uploading Photo..." : profile.gallery.length >= 12 ? "Gallery Limit Reached" : "Upload New Image"}</span>
          </button>
        </div>

        {/* Gallery Grid */}
        {profile.gallery.length === 0 ? (
          <div
            onClick={() => galleryRef.current?.click()}
            className="group rounded-3xl border-2 border-dashed border-slate-200 hover:border-amber-400 bg-slate-50/50 hover:bg-amber-50/30 p-10 text-center space-y-3 transition-all cursor-pointer"
          >
            <div className="size-14 mx-auto rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-center group-hover:scale-110 transition-transform">
              <ImagePlus className="size-7 text-amber-500" />
            </div>
            <div>
              <p className="font-display text-sm font-bold text-slate-800">
                Your consultation photo gallery is empty
              </p>
              <p className="mt-1 text-xs text-slate-400 max-w-md mx-auto">
                Clients trust astrologers with verified photos of Vedic ceremonies, degree credentials, and study altars. Click here to upload your first image!
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-bold text-amber-700 border border-amber-200 shadow-2xs">
              + Click to Select Image (Max 10MB)
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
            {profile.gallery.map((image, index) => (
              <div
                key={image.public_id}
                className="group relative aspect-square overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-100 shadow-xs transition-all hover:shadow-md hover:scale-[1.02]"
              >
                <Image
                  src={image.url}
                  alt={`Astrologer Gallery ${index + 1}`}
                  fill
                  sizes="(max-width: 768px) 50vw, 200px"
                  className="object-cover transition-transform duration-500 group-hover:scale-108"
                  unoptimized
                />

                {/* Index Pill */}
                <span className="absolute bottom-2 left-2 rounded-md bg-black/60 backdrop-blur-xs px-1.5 py-0.5 text-[9px] font-bold text-white shadow-xs">
                  #{index + 1}
                </span>

                {/* Hover Gradient Overlay with Actions */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                  <button
                    type="button"
                    onClick={() => setActiveLightboxUrl(image.url)}
                    className="flex size-8 items-center justify-center rounded-xl bg-white/90 text-slate-900 hover:bg-white hover:scale-110 transition-all cursor-pointer shadow-md"
                    title="View full resolution"
                  >
                    <Maximize2 className="size-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => removeGalleryImage(image.public_id)}
                    className="flex size-8 items-center justify-center rounded-xl bg-rose-500/90 text-white hover:bg-rose-600 hover:scale-110 transition-all cursor-pointer shadow-md"
                    title="Delete photo"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {/* Quick Add Card Slot */}
            {profile.gallery.length < 12 && (
              <button
                type="button"
                disabled={uploadingGallery}
                onClick={() => galleryRef.current?.click()}
                className="aspect-square flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 hover:border-amber-400 bg-slate-50/60 hover:bg-amber-50/30 transition-all cursor-pointer text-slate-400 hover:text-amber-600 gap-1"
              >
                <PlusIcon className="size-5" />
                <span className="text-[10px] font-bold">Add Photo</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* ------------------------------------------------ DETAILS FORM (YOUR DETAILS) */}
      <form onSubmit={onSubmit} className="space-y-8">
        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-[0_16px_40px_rgba(20,25,45,0.05)] space-y-8">
          {/* Section 1: Basic Identity */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <User className="size-5 text-amber-600" />
              <h3 className="font-display text-base font-bold text-slate-900">
                Personal Identity & Public Name
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="first_name" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  First Name <span className="text-amber-500">*</span>
                </label>
                <input
                  id="first_name"
                  required
                  value={form.first_name}
                  onChange={set("first_name")}
                  className={cn(
                    "w-full rounded-2xl border bg-slate-50/70 px-4 py-2.5 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500",
                    errors.first_name ? "border-rose-400" : "border-slate-200/90"
                  )}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="last_name" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Last Name
                </label>
                <input
                  id="last_name"
                  value={form.last_name}
                  onChange={set("last_name")}
                  className="w-full rounded-2xl border border-slate-200/90 bg-slate-50/70 px-4 py-2.5 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="display_name" className="flex items-center justify-between text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <span>Display Name <span className="text-amber-500">*</span></span>
                  <span className="text-[10px] text-amber-600 font-semibold lowercase">public on website</span>
                </label>
                <input
                  id="display_name"
                  required
                  value={form.display_name}
                  onChange={set("display_name")}
                  placeholder="e.g. Acharya Shreeman K."
                  className="w-full rounded-2xl border border-slate-200/90 bg-slate-50/70 px-4 py-2.5 text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="phone" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Phone Number
                </label>
                <input
                  id="phone"
                  value={form.phone}
                  onChange={set("phone")}
                  placeholder="+91 98765 43210"
                  className="w-full rounded-2xl border border-slate-200/90 bg-slate-50/70 px-4 py-2.5 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="exp" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Years of Experience
                </label>
                <input
                  id="exp"
                  type="number"
                  min={0}
                  max={90}
                  value={form.experience_years}
                  onChange={set("experience_years")}
                  className="w-full rounded-2xl border border-slate-200/90 bg-slate-50/70 px-4 py-2.5 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center justify-between text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <span>Registered Email</span>
                  <span className="text-[10px] text-slate-400 font-semibold lowercase">read-only</span>
                </label>
                <input
                  value={profile.email}
                  disabled
                  readOnly
                  className="w-full rounded-2xl border border-slate-200 bg-slate-100/80 px-4 py-2.5 text-sm font-semibold text-slate-500 cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Editorial & Brand Persona */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <Sparkles className="size-5 text-amber-600" />
              <h3 className="font-display text-base font-bold text-slate-900">
                Editorial Brand & Biography
              </h3>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="tagline" className="flex items-center justify-between text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <span>Professional Tagline</span>
                  <span className="text-[10px] text-slate-400 font-normal">Shown immediately below your name</span>
                </label>
                <input
                  id="tagline"
                  value={form.tagline}
                  onChange={set("tagline")}
                  placeholder="e.g. Renowned Vedic Astrologer, Kundli & Gemology Expert"
                  className="w-full rounded-2xl border border-slate-200/90 bg-slate-50/70 px-4 py-2.5 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="bio" className="flex items-center justify-between text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <span>About You & Consultation Approach</span>
                  <span className="text-[10px] text-slate-400 font-normal">Clients read this before booking</span>
                </label>
                <textarea
                  id="bio"
                  rows={5}
                  value={form.bio}
                  onChange={set("bio")}
                  placeholder="Introduce your lineage, background, special techniques, and how you assist clients with relationship, career, and spiritual questions..."
                  className="w-full rounded-2xl border border-slate-200/90 bg-slate-50/70 px-4 py-3 text-sm font-medium leading-relaxed text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Specialities & Languages */}
          <div className="space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <BookOpen className="size-5 text-amber-600" />
              <h3 className="font-display text-base font-bold text-slate-900">
                Astrological Specialities & Credentials
              </h3>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Astrological Specialities (Click to toggle)
              </label>
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/40 p-4">
                <SkillPicker value={skills} onChange={setSkills} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Languages Spoken
                </label>
                <TagInput
                  value={languages}
                  onChange={setLanguages}
                  placeholder="Type language & press Enter"
                  suggestions={LANGUAGE_SUGGESTIONS}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Other Focus Areas
                </label>
                <TagInput
                  value={specialisations}
                  onChange={setSpecialisations}
                  placeholder="e.g. Matchmaking, Muhurat"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Degrees & Qualifications
                </label>
                <TagInput
                  value={qualifications}
                  onChange={setQualifications}
                  placeholder="e.g. Jyotish Acharya, PhD"
                />
              </div>
            </div>
          </div>

          {/* Form Action Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-100">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <Sparkles className="size-4 text-amber-500" />
              <span>Changes reflect immediately across the public website directory.</span>
            </div>

            <button
              type="submit"
              disabled={save.isPending}
              className={cn(
                "w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl py-3 px-8 text-sm font-bold text-white transition-all cursor-pointer",
                "bg-gradient-to-r from-[#D97706] via-[#EA580C] to-[#F59E0B]",
                "shadow-[0_10px_25px_-5px_rgba(217,119,6,0.5)] hover:shadow-[0_14px_30px_-5px_rgba(217,119,6,0.65)] hover:scale-[1.01] active:scale-[0.99]",
                "disabled:opacity-50 disabled:pointer-events-none"
              )}
            >
              <Save className="size-4 stroke-[2.2]" />
              <span>{save.isPending ? "Saving Profile..." : "Save Profile Changes"}</span>
            </button>
          </div>
        </div>
      </form>

      {/* ------------------------------------------------ LIGHTBOX MODAL */}
      <Modal
        open={Boolean(activeLightboxUrl)}
        onClose={() => setActiveLightboxUrl(null)}
        title="High-Resolution Preview"
        size="lg"
      >
        {activeLightboxUrl && (
          <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black my-2">
            <Image
              src={activeLightboxUrl}
              alt="Preview"
              fill
              className="object-contain"
              unoptimized
            />
          </div>
        )}
      </Modal>
    </div>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function KeyRoundIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M15 7a2 2 0 0 1 2 2m4 0a6 6 0 0 1-7.743 5.743L11 17H9v2H7v2H4a1 1 0 0 1-1-1v-2.586a1 1 0 0 1 .293-.707l5.964-5.964A6 6 0 1 1 21 9Z" />
    </svg>
  );
}
