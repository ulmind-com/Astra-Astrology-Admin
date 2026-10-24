"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Check,
  CheckCircle2,
  Coins,
  Copy,
  Info,
  Lock,
  Mail,
  MailCheck,
  MessageSquare,
  Phone,
  PhoneCall,
  ShieldCheck,
  Sparkles,
  Star,
  TriangleAlert,
  User,
  Video,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { LANGUAGE_SUGGESTIONS, SkillPicker, TagInput } from "@/components/skill-picker";
import { Avatar, Switch } from "@/components/ui";
import { adminApi, adminSettingsApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { useRequireAuth } from "@/providers/auth-provider";
import {
  MODE_LABELS,
  SKILL_LABELS,
  type AstrologerCreate,
  type AstrologerCreated,
  type ConsultationMode,
  type Skill,
} from "@/types";

export default function NewAstrologerPage() {
  const router = useRouter();
  const { ready } = useRequireAuth({
    roles: ["admin", "super_admin"],
    signInPath: "/login",
  });

  const { data: defaults } = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: adminSettingsApi.get,
    enabled: ready,
  });

  const [form, setForm] = React.useState({
    email: "",
    first_name: "",
    middle_name: "",
    last_name: "",
    phone: "",
    display_name: "",
    tagline: "",
    bio: "",
    experience_years: "5",
    chat: "",
    call: "",
    video: "",
    commission_percent: "20",
    is_listed: true,
    is_featured: false,
  });

  const [skills, setSkills] = React.useState<Skill[]>([
    "vedic" as Skill,
    "kundli" as Skill,
  ]);
  const [modes, setModes] = React.useState<ConsultationMode[]>([
    "chat",
    "call",
    "video",
  ]);
  const [languages, setLanguages] = React.useState<string[]>([
    "Hindi",
    "English",
  ]);
  const [specialisations, setSpecialisations] = React.useState<string[]>([
    "Love & Marriage",
    "Career & Wealth",
  ]);
  const [qualifications, setQualifications] = React.useState<string[]>([
    "Jyotish Acharya",
  ]);
  const [created, setCreated] = React.useState<AstrologerCreated | null>(null);

  const create = useMutation({
    mutationFn: (body: AstrologerCreate) => adminApi.createAstrologer(body),
    onSuccess: (result) => {
      setCreated(result);
      toast.success(
        result.welcome_email_sent
          ? "Astrologer created and credentials emailed successfully."
          : "Astrologer created — welcome email failed, please copy password manually."
      );
    },
    onError: (error: ApiError) => {
      if (error.status !== 422) toast.error(error.message);
    },
  });

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const number = (value: string) =>
      value.trim() === "" ? 0 : Number(value);
    const optional = (value: string) =>
      value.trim() === "" ? null : Number(value);

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
      commission_percent: optional(form.commission_percent),
      is_listed: form.is_listed,
      is_featured: form.is_featured,
      display_order: 0,
    });
  }

  const set =
    (key: keyof typeof form) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >
    ) =>
      setForm({ ...form, [key]: e.target.value });

  const errors = (create.error as ApiError | null)?.fieldErrors ?? {};

  if (!ready) return null;

  // ── SUCCESS STATE: CELEBRATION & PASSWORD VAULT ──
  if (created) {
    const { astrologer, welcome_email_sent, initial_password } = created;
    return (
      <div className="max-w-2xl mx-auto py-8">
        <div className="rounded-[32px] bg-white p-7 sm:p-9 border border-slate-100 shadow-[0_20px_50px_rgba(20,25,45,0.06)] relative overflow-hidden text-center">
          {/* Subtle celestial ambient light */}
          <div className="pointer-events-none absolute -top-16 -right-16 size-48 rounded-full bg-amber-400/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 size-48 rounded-full bg-emerald-400/15 blur-3xl" />

          {/* Success Icon */}
          <div className="mx-auto flex size-16 items-center justify-center rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-[0_10px_25px_rgba(16,185,129,0.35)] animate-in zoom-in-75 duration-300">
            <MailCheck className="size-8 stroke-[2.2]" />
          </div>

          <h2 className="mt-5 font-display text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Specialist Onboarded!
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            Account for{" "}
            <span className="font-bold text-slate-900">
              {astrologer.display_name}
            </span>{" "}
            has been successfully initialized in the Astra Blink network.
          </p>

          {/* Specialist Summary Pill */}
          <div className="mt-6 flex items-center justify-center gap-3 rounded-2xl bg-slate-50 p-3.5 border border-slate-100">
            <Avatar
              src={astrologer.profile_image_url}
              name={astrologer.display_name}
              size="md"
              className="size-11 rounded-xl ring-2 ring-white shadow-xs object-cover"
            />
            <div className="text-left">
              <p className="font-bold text-slate-900 text-sm leading-tight">
                {astrologer.display_name}
              </p>
              <p className="text-xs font-semibold text-slate-400">
                {astrologer.email}
              </p>
            </div>
            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
              <Check className="size-3" />
              Active Specialist
            </span>
          </div>

          {/* Password Section */}
          <div className="mt-6">
            {welcome_email_sent ? (
              <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/60 p-4 text-xs font-semibold text-emerald-800 text-left flex items-start gap-3">
                <CheckCircle2 className="size-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-sm">Credentials Dispatched</p>
                  <p className="mt-0.5 text-emerald-700 leading-relaxed">
                    A secure welcome email with sign-in instructions and their
                    temporary password has been dispatched to{" "}
                    <strong>{astrologer.email}</strong>.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-2xl border border-amber-200/80 bg-amber-50/60 p-4 text-xs font-semibold text-amber-800 text-left flex items-start gap-3">
                  <TriangleAlert className="size-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-sm">
                      Copy Initial Temporary Password
                    </p>
                    <p className="mt-0.5 text-amber-700 leading-relaxed">
                      The automated email could not be delivered. Please copy and
                      safely share the temporary password with the astrologer.
                      <strong> This will not be shown again.</strong>
                    </p>
                  </div>
                </div>

                {initial_password && (
                  <div className="flex items-center justify-between rounded-2xl bg-slate-900 p-4 text-white shadow-lg border border-slate-800">
                    <div className="text-left">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Generated Password
                      </span>
                      <p className="font-mono text-base font-bold text-amber-400 mt-0.5">
                        {initial_password}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        void navigator.clipboard.writeText(initial_password);
                        toast.success("Password copied to clipboard.");
                      }}
                      className="flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 px-3.5 py-2 text-xs font-bold text-white transition-all cursor-pointer"
                    >
                      <Copy className="size-3.5" />
                      <span>Copy</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => router.push("/astrologers")}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
            >
              Back to Directory
            </button>
            <Link href={`/astrologers/${astrologer.id}`}>
              <button className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#D97706] to-[#F59E0B] px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-[0_8px_20px_-4px_rgba(217,119,6,0.45)] hover:from-[#B45309] hover:to-[#D97706] transition-all cursor-pointer">
                <span>Manage Profile</span>
                <ArrowRight className="size-4" />
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── STUDIO FORM WITH LIVE SPECIALIST CARD PREVIEW ──
  return (
    <div className="space-y-6">
      {/* ── TOP STUDIO BREADCRUMB & HEADER ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/astrologers"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-[#D97706] transition-colors mb-2 cursor-pointer group"
          >
            <ArrowLeft className="size-3.5 group-hover:-translate-x-1 transition-transform" />
            <span>Specialist Directory</span>
          </Link>
          <div className="flex items-center gap-3">
            <h2 className="font-display text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Onboard Certified Astrologer
            </h2>
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-[#D97706] border border-amber-200/70">
              <Sparkles className="size-3 text-[#D97706]" />
              DealDeck Onboarding Studio
            </span>
          </div>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            Issue practitioner credentials, configure consultation rates & setup
            public directory visibility
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-slate-600 border border-slate-100 shadow-xs">
            <ShieldCheck className="size-4 text-emerald-600" />
            <span>Automated Password Dispatch</span>
          </span>
        </div>
      </div>

      {/* ── 2-COLUMN STUDIO GRID ── */}
      <form onSubmit={onSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ── LEFT COLUMN (8 COLS): 3D CONFIGURATION CARDS ── */}
          <div className="lg:col-span-8 space-y-6">
            {/* Card 1: Identity & Sign-In */}
            <div className="rounded-[28px] bg-white p-6 sm:p-7 border border-slate-100/90 shadow-[0_12px_32px_rgba(20,25,45,0.03)] space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-2xl bg-amber-50 text-[#D97706]">
                    <User className="size-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <h3 className="font-display text-base font-bold text-slate-900">
                      Identity & Account Credentials
                    </h3>
                    <p className="text-xs font-medium text-slate-400">
                      Sign-in identity and direct contact information
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600">
                  Step 1
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Email */}
                <div className="sm:col-span-2 space-y-1.5">
                  <label
                    htmlFor="email"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-700"
                  >
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="email"
                      type="email"
                      required
                      value={form.email}
                      onChange={set("email")}
                      placeholder="astrologer@example.com"
                      className={cn(
                        "h-11 w-full rounded-2xl border bg-slate-50/70 pl-10 pr-4 text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/30 focus:border-[#D97706]",
                        errors.email ? "border-rose-300 ring-2 ring-rose-100" : "border-slate-200"
                      )}
                    />
                  </div>
                  <p className="text-[11px] font-medium text-slate-400">
                    The astrologer will receive their sign-in instructions &
                    temporary password at this address.
                  </p>
                  {errors.email && (
                    <p className="text-xs font-semibold text-rose-600">
                      {errors.email}
                    </p>
                  )}
                </div>

                {/* First Name */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="first_name"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-700"
                  >
                    First Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="first_name"
                    type="text"
                    required
                    value={form.first_name}
                    onChange={set("first_name")}
                    placeholder="e.g. Ramesh"
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/30 focus:border-[#D97706]"
                  />
                </div>

                {/* Last Name */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="last_name"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-700"
                  >
                    Last Name
                  </label>
                  <input
                    id="last_name"
                    type="text"
                    value={form.last_name}
                    onChange={set("last_name")}
                    placeholder="e.g. Shastri"
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/30 focus:border-[#D97706]"
                  />
                </div>

                {/* Phone */}
                <div className="sm:col-span-2 space-y-1.5">
                  <label
                    htmlFor="phone"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-700"
                  >
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="phone"
                      type="tel"
                      value={form.phone}
                      onChange={set("phone")}
                      placeholder="+91 98765 43210"
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50/70 pl-10 pr-4 text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/30 focus:border-[#D97706]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Public Persona & Disciplines */}
            <div className="rounded-[28px] bg-white p-6 sm:p-7 border border-slate-100/90 shadow-[0_12px_32px_rgba(20,25,45,0.03)] space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                    <Sparkles className="size-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <h3 className="font-display text-base font-bold text-slate-900">
                      Public Persona & Astrology Disciplines
                    </h3>
                    <p className="text-xs font-medium text-slate-400">
                      Visible on the Astra Blink website and customer directory
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600">
                  Step 2
                </span>
              </div>

              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Display Name */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="display_name"
                      className="block text-xs font-bold uppercase tracking-wider text-slate-700"
                    >
                      Display Title / Name
                    </label>
                    <input
                      id="display_name"
                      type="text"
                      value={form.display_name}
                      onChange={set("display_name")}
                      placeholder="e.g. Acharya Ramesh Shastri"
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/30 focus:border-[#D97706]"
                    />
                    <p className="text-[11px] font-medium text-slate-400">
                      Leave blank to auto-use First & Last name.
                    </p>
                  </div>

                  {/* Years of Experience */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="experience_years"
                      className="block text-xs font-bold uppercase tracking-wider text-slate-700"
                    >
                      Years of Experience
                    </label>
                    <input
                      id="experience_years"
                      type="number"
                      min={0}
                      max={80}
                      value={form.experience_years}
                      onChange={set("experience_years")}
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 text-xs sm:text-sm font-bold text-slate-800 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/30 focus:border-[#D97706]"
                    />
                  </div>
                </div>

                {/* Tagline */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="tagline"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-700"
                  >
                    Tagline
                  </label>
                  <input
                    id="tagline"
                    type="text"
                    value={form.tagline}
                    onChange={set("tagline")}
                    placeholder="e.g. Renowned Gold Medalist Vedic Astrologer & Kundli Expert"
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/30 focus:border-[#D97706]"
                  />
                </div>

                {/* Bio Description */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="bio"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-700"
                  >
                    Professional Bio
                  </label>
                  <textarea
                    id="bio"
                    rows={3}
                    value={form.bio}
                    onChange={set("bio")}
                    placeholder="Describe their background, astrological lineage, Vedic training, and notable achievements…"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/30 focus:border-[#D97706]"
                  />
                </div>

                {/* Core Disciplines (SkillPicker) */}
                <div className="space-y-2 border-t border-slate-100 pt-4">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Core Specialities & Disciplines
                  </label>
                  <p className="text-[11px] font-medium text-slate-400 mb-2">
                    Select the astrological disciplines this practitioner is
                    certified to perform:
                  </p>
                  <SkillPicker value={skills} onChange={setSkills} />
                </div>

                {/* Consultation Types (Chat, Call, Video) */}
                <div className="space-y-2 border-t border-slate-100 pt-4">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Consultation Channels
                  </label>
                  <p className="text-[11px] font-medium text-slate-400 mb-2.5">
                    Enable the communication modes this specialist can receive
                    bookings for:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      {
                        mode: "chat" as ConsultationMode,
                        title: "Live Chat",
                        desc: "Text & Kundli analysis",
                        icon: MessageSquare,
                      },
                      {
                        mode: "call" as ConsultationMode,
                        title: "Voice Call",
                        desc: "High-clarity VoIP call",
                        icon: PhoneCall,
                      },
                      {
                        mode: "video" as ConsultationMode,
                        title: "Video Call",
                        desc: "Face-to-face consultation",
                        icon: Video,
                      },
                    ].map((item) => {
                      const active = modes.includes(item.mode);
                      const Icon = item.icon;
                      return (
                        <div
                          key={item.mode}
                          onClick={() =>
                            setModes((curr) =>
                              curr.includes(item.mode)
                                ? curr.filter((m) => m !== item.mode)
                                : [...curr, item.mode]
                            )
                          }
                          className={cn(
                            "flex items-center gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer",
                            active
                              ? "border-[#D97706] bg-amber-50/50 shadow-xs"
                              : "border-slate-200 bg-white hover:border-slate-300"
                          )}
                        >
                          <div
                            className={cn(
                              "flex size-10 shrink-0 items-center justify-center rounded-xl transition-all",
                              active
                                ? "bg-gradient-to-tr from-[#D97706] to-[#F59E0B] text-white shadow-xs"
                                : "bg-slate-100 text-slate-500"
                            )}
                          >
                            <Icon className="size-5" />
                          </div>
                          <div className="min-w-0">
                            <p
                              className={cn(
                                "text-xs font-bold truncate",
                                active ? "text-slate-900" : "text-slate-600"
                              )}
                            >
                              {item.title}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate">
                              {item.desc}
                            </p>
                          </div>
                          {active && (
                            <Check className="size-4 text-[#D97706] ml-auto stroke-[2.5]" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Languages */}
                <div className="space-y-2 border-t border-slate-100 pt-4">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Languages Spoken
                  </label>
                  <TagInput
                    value={languages}
                    onChange={setLanguages}
                    placeholder="Add a language (e.g. Hindi, English, Bengali)…"
                    suggestions={LANGUAGE_SUGGESTIONS}
                  />
                </div>

                {/* Specialisations & Qualifications */}
                <div className="grid gap-4 sm:grid-cols-2 border-t border-slate-100 pt-4">
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Sub-Specialisations
                    </label>
                    <TagInput
                      value={specialisations}
                      onChange={setSpecialisations}
                      placeholder="e.g. Kundli Milan, Matchmaking…"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Degrees & Qualifications
                    </label>
                    <TagInput
                      value={qualifications}
                      onChange={setQualifications}
                      placeholder="e.g. Jyotish Ratna, Ph.D…"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: Monetization & Rates */}
            <div className="rounded-[28px] bg-white p-6 sm:p-7 border border-slate-100/90 shadow-[0_12px_32px_rgba(20,25,45,0.03)] space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                    <Coins className="size-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <h3 className="font-display text-base font-bold text-slate-900">
                      Monetization, Rates & Platform Visibility
                    </h3>
                    <p className="text-xs font-medium text-slate-400">
                      Coins per started minute & directory listing rules
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600">
                  Step 3
                </span>
              </div>

              {/* Rates per minute */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <label
                    htmlFor="chat"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-700"
                  >
                    Chat Rate
                  </label>
                  <div className="relative">
                    <input
                      id="chat"
                      type="number"
                      min={0}
                      value={form.chat}
                      onChange={set("chat")}
                      placeholder={String(
                        defaults?.default_chat_coins_per_minute ?? 20
                      )}
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 text-xs sm:text-sm font-bold text-slate-900 placeholder-slate-400 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/30 focus:border-[#D97706]"
                    />
                    <span className="absolute top-1/2 right-3 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                      coins/min
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Default: {defaults?.default_chat_coins_per_minute ?? 20}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="call"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-700"
                  >
                    Voice Call Rate
                  </label>
                  <div className="relative">
                    <input
                      id="call"
                      type="number"
                      min={0}
                      value={form.call}
                      onChange={set("call")}
                      placeholder={String(
                        defaults?.default_call_coins_per_minute ?? 30
                      )}
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 text-xs sm:text-sm font-bold text-slate-900 placeholder-slate-400 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/30 focus:border-[#D97706]"
                    />
                    <span className="absolute top-1/2 right-3 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                      coins/min
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Default: {defaults?.default_call_coins_per_minute ?? 30}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="video"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-700"
                  >
                    Video Call Rate
                  </label>
                  <div className="relative">
                    <input
                      id="video"
                      type="number"
                      min={0}
                      value={form.video}
                      onChange={set("video")}
                      placeholder={String(
                        defaults?.default_video_coins_per_minute ?? 45
                      )}
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 text-xs sm:text-sm font-bold text-slate-900 placeholder-slate-400 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/30 focus:border-[#D97706]"
                    />
                    <span className="absolute top-1/2 right-3 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                      coins/min
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Default: {defaults?.default_video_coins_per_minute ?? 45}
                  </p>
                </div>
              </div>

              {/* Commission */}
              <div className="space-y-1.5 border-t border-slate-100 pt-4">
                <label
                  htmlFor="commission"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700"
                >
                  Platform Commission Share (%)
                </label>
                <div className="relative max-w-xs">
                  <input
                    id="commission"
                    type="number"
                    min={0}
                    max={100}
                    value={form.commission_percent}
                    onChange={set("commission_percent")}
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 text-xs sm:text-sm font-bold text-slate-900 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/30 focus:border-[#D97706]"
                  />
                  <span className="absolute top-1/2 right-3 -translate-y-1/2 text-xs font-black text-slate-400">
                    %
                  </span>
                </div>
                <p className="text-[11px] font-medium text-slate-400">
                  Percentage deducted by Astra platform from each session.
                </p>
              </div>

              {/* Switches */}
              <div className="space-y-3.5 border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between rounded-2xl bg-slate-50/80 p-4 border border-slate-100">
                  <div>
                    <p className="font-bold text-slate-900 text-xs sm:text-sm">
                      Public Web Directory Listing
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Make specialist discoverable in public search and category
                      listings.
                    </p>
                  </div>
                  <Switch
                    checked={form.is_listed}
                    onChange={(next) => setForm({ ...form, is_listed: next })}
                  />
                </div>

                <div className="flex items-center justify-between rounded-2xl bg-amber-50/50 p-4 border border-amber-200/60">
                  <div className="flex items-center gap-3">
                    <Star className="size-5 fill-amber-400 text-amber-500 shrink-0" />
                    <div>
                      <p className="font-bold text-slate-900 text-xs sm:text-sm">
                        Feature on Astra Home Carousel
                      </p>
                      <p className="text-[11px] text-amber-800">
                        Top picks are promoted with priority ranking across the web
                        app.
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={form.is_featured}
                    onChange={(next) => setForm({ ...form, is_featured: next })}
                  />
                </div>
              </div>
            </div>

            {/* Error Notification */}
            {create.error && (create.error as ApiError).status === 409 && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700 flex items-center gap-2">
                <TriangleAlert className="size-4 shrink-0" />
                <span>
                  An account with that email already exists. Please choose a
                  unique email.
                </span>
              </div>
            )}

            {/* Submission Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Link href="/astrologers">
                <button
                  type="button"
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </Link>
              <button
                type="submit"
                disabled={create.isPending}
                className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#D97706] to-[#F59E0B] px-6 py-3 text-xs sm:text-sm font-black text-white shadow-[0_10px_25px_-4px_rgba(217,119,6,0.5)] hover:from-[#B45309] hover:to-[#D97706] active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                {create.isPending ? (
                  <>
                    <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Onboarding Specialist…</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" />
                    <span>Create & Dispatch Credentials</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* ── RIGHT COLUMN (4 COLS): LIVE REAL-TIME CARD PREVIEW ── */}
          <div className="lg:col-span-4 sticky top-6 space-y-5">
            {/* Live Card */}
            <div className="rounded-[30px] bg-white p-5 sm:p-6 border border-slate-100 shadow-[0_16px_40px_rgba(20,25,45,0.06)] relative overflow-hidden">
              {/* Header Badge */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-[#D97706]">
                  <span className="size-2 rounded-full bg-[#D97706] animate-pulse" />
                  Live Preview
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                  Web Directory Card
                </span>
              </div>

              {/* Card Body */}
              <div className="mt-5 text-center">
                <div className="relative mx-auto size-20">
                  <div className="flex size-20 items-center justify-center rounded-3xl bg-gradient-to-tr from-[#B45309] via-[#D97706] to-[#F59E0B] text-white text-2xl font-black shadow-[0_8px_20px_rgba(217,119,6,0.35)]">
                    {(form.display_name || form.first_name || "A")
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                  <span className="absolute bottom-0 right-0 size-4 rounded-full bg-emerald-500 ring-2 ring-white shadow-xs" />
                </div>

                <div className="mt-3.5">
                  <div className="flex items-center justify-center gap-1.5">
                    <h4 className="font-display text-base font-black text-slate-900 truncate">
                      {form.display_name ||
                        (form.first_name
                          ? `${form.first_name} ${form.last_name}`
                          : "Astrologer Name")}
                    </h4>
                    {form.is_featured && (
                      <Star className="size-4 fill-amber-400 text-amber-500" />
                    )}
                  </div>
                  <p className="text-xs font-semibold text-slate-400">
                    {form.tagline || "Vedic & Kundli Specialist"}
                  </p>
                </div>

                {/* Rating & Exp Pill */}
                <div className="mt-3 flex items-center justify-center gap-2 text-xs font-bold text-slate-600">
                  <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-amber-700">
                    <Star className="size-3 fill-amber-400 text-amber-500" />
                    5.0 (New)
                  </span>
                  <span>•</span>
                  <span>{form.experience_years || 5} yrs exp</span>
                </div>

                {/* Skills Preview */}
                <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                  {skills.slice(0, 3).map((s) => (
                    <span
                      key={s}
                      className="rounded-lg bg-amber-50 border border-amber-200/70 px-2 py-0.5 text-[10px] font-bold text-[#B45309]"
                    >
                      {SKILL_LABELS[s] || s}
                    </span>
                  ))}
                  {skills.length > 3 && (
                    <span className="rounded-lg bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                      +{skills.length - 3}
                    </span>
                  )}
                </div>

                {/* Rate Card Ribbon */}
                <div className="mt-5 rounded-2xl bg-slate-50 p-3 border border-slate-100 flex items-center justify-between">
                  <div className="text-left">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Chat Consultation
                    </span>
                    <span className="font-black text-slate-900 text-sm">
                      {form.chat || defaults?.default_chat_coins_per_minute || 20}{" "}
                      coins/min
                    </span>
                  </div>
                  <div className="flex gap-1.5 text-slate-400">
                    {modes.includes("chat") && (
                      <MessageSquare className="size-4 text-[#D97706]" />
                    )}
                    {modes.includes("call") && (
                      <PhoneCall className="size-4 text-emerald-600" />
                    )}
                    {modes.includes("video") && (
                      <Video className="size-4 text-indigo-600" />
                    )}
                  </div>
                </div>

                <div className="mt-4">
                  <button
                    type="button"
                    disabled
                    className="w-full rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white opacity-90 cursor-not-allowed"
                  >
                    Consult Now
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Security & Workflow Info Card */}
            <div className="rounded-[26px] bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] p-5 text-white shadow-lg border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-bold">
                <Lock className="size-4" />
                <span>Security & Credentials</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                When you click create, a cryptographic random password is
                generated and sent to the practitioner. They must change it upon
                first login.
              </p>
              <div className="flex items-center gap-2 pt-1 border-t border-slate-800 text-[11px] text-slate-400">
                <BadgeCheck className="size-4 text-emerald-400 shrink-0" />
                <span>Instant directory synchronization</span>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
