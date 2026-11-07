"use client";

import * as React from "react";
import {
  AlertTriangle,
  Calendar,
  Check,
  Clock,
  Compass,
  Copy,
  Flame,
  Gem,
  Info,
  Loader2,
  MapPin,
  Moon,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Sun,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { appointmentApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Appointment } from "@/types";

interface PreFlightDossierModalProps {
  open: boolean;
  onClose: () => void;
  appointmentId: string;
  appointment?: Appointment | null;
  initialDossier?: Record<string, any> | null;
  onEnterChamber?: () => void;
  isLiveChamber?: boolean;
}

const PILLAR_ICONS: Record<string, string> = {
  career_wealth: "💼",
  love_marriage: "💍",
  health_longevity: "🌿",
  dosha_graha_shanti: "🔥",
  business_expansion: "📈",
  spiritual_guidance: "🕉️",
};

export function PreFlightDossierModal({
  open,
  onClose,
  appointmentId,
  appointment,
  initialDossier,
  onEnterChamber,
  isLiveChamber = false,
}: PreFlightDossierModalProps) {
  const [dossier, setDossier] = React.useState<Record<string, any> | null>(initialDossier || null);
  const [loading, setLoading] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"diagnosis" | "chart" | "afflictions">("diagnosis");
  const [copiedQuestion, setCopiedQuestion] = React.useState(false);

  const fetchDossier = React.useCallback(
    async (refresh = false) => {
      if (!appointmentId) return;
      setLoading(true);
      try {
        const res = await appointmentApi.getPreflight(appointmentId, refresh);
        setDossier(res.data);
        if (refresh) {
          toast.success("AI Pre-Flight Cosmic Dossier refreshed!");
        }
      } catch (err: any) {
        toast.error(err?.message || "Failed to load pre-flight dossier.");
      } finally {
        setLoading(false);
      }
    },
    [appointmentId],
  );

  React.useEffect(() => {
    if (open) {
      if (!dossier || dossier.appointment_id !== appointmentId) {
        if (initialDossier) {
          setDossier(initialDossier);
        } else {
          void fetchDossier(false);
        }
      }
    }
  }, [open, appointmentId, initialDossier, dossier, fetchDossier]);

  if (!open) return null;

  const core = dossier?.core_identity || {};
  const dasha = dossier?.current_vimshottari_dasha || {};
  const afflicted = (dossier?.afflicted_planets || []) as Array<any>;
  const pillarHouses = dossier?.pillar_house_analysis?.houses_details || [];
  const diagnosis = dossier?.executive_cosmic_diagnosis || {};
  const iceBreaker = diagnosis.opening_ice_breaker_bn || "";
  const coreDistress = diagnosis.core_distress_bn || diagnosis.core_distress_en || "";
  const cheatSheet = diagnosis.one_glance_cheat_sheet || dossier?.ai_executive_summary || [];
  const remedy = diagnosis.remedial_blueprint || {};
  const isBirthReady = dossier?.is_birth_details_available ?? true;
  const chartModeLabel = dossier?.chart_mode_bn || (isBirthReady ? "জন্ম কুণ্ডলী (Natal)" : "প্রশ্ন কুণ্ডলী (Horary)");
  const pillarKey = dossier?.focus_topic_key || appointment?.consultation_pillar || "career_wealth";
  const pillarIcon = PILLAR_ICONS[pillarKey] || "🔮";

  const handleCopyQuestion = () => {
    if (!iceBreaker) return;
    navigator.clipboard.writeText(iceBreaker);
    setCopiedQuestion(true);
    toast.success("Opening ice-breaker copied to clipboard!");
    setTimeout(() => setCopiedQuestion(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden text-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Strip */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-linear-to-r from-amber-500/10 via-indigo-500/10 to-purple-500/10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-linear-to-tr from-amber-500 to-indigo-600 text-white shadow-md shadow-amber-500/20 shrink-0 text-lg">
              {pillarIcon}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-display font-black text-sm sm:text-base text-slate-900 truncate">
                  AI Pre-Flight Cosmic Dossier
                </h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-200/80 px-2.5 py-0.5 text-[10px] font-black text-indigo-700">
                  <Sparkles className="size-3 text-indigo-600" />
                  {chartModeLabel}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200/80 px-2 py-0.5 text-[10px] font-black text-amber-700">
                  {dossier?.cosmic_synergy_score || 88}% Synergy
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate mt-0.5">
                Seeker: <span className="font-bold text-slate-700">{dossier?.client_name || appointment?.peer?.name || "Client"}</span> · Topic:{" "}
                <span className="font-bold text-indigo-700">{dossier?.focus_topic || "Vedic Consultation"}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => void fetchDossier(true)}
              disabled={loading}
              title="Recalculate & Refresh Dossier"
              className="flex size-8 items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={cn("size-3.5", loading && "animate-spin text-amber-600")} />
            </button>
            <button
              onClick={onClose}
              className="flex size-8 items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-500 transition-colors cursor-pointer"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-100 px-5 bg-slate-50/50 text-xs font-bold gap-2 pt-2">
          <button
            onClick={() => setActiveTab("diagnosis")}
            className={cn(
              "px-3.5 py-2 border-b-2 transition-all cursor-pointer flex items-center gap-1.5",
              activeTab === "diagnosis"
                ? "border-amber-500 text-amber-700 font-black bg-amber-50/60 rounded-t-xl"
                : "border-transparent text-slate-500 hover:text-slate-800",
            )}
          >
            <Zap className="size-3.5 text-amber-500" />
            <span>১-নজরে ডায়াগনসিস (1-Glance Cheat Sheet)</span>
          </button>

          <button
            onClick={() => setActiveTab("chart")}
            className={cn(
              "px-3.5 py-2 border-b-2 transition-all cursor-pointer flex items-center gap-1.5",
              activeTab === "chart"
                ? "border-indigo-500 text-indigo-700 font-black bg-indigo-50/60 rounded-t-xl"
                : "border-transparent text-slate-500 hover:text-slate-800",
            )}
          >
            <Compass className="size-3.5 text-indigo-500" />
            <span>কুণ্ডলী, দশা ও ভাবাবস্থান (Planetary Grid)</span>
          </button>

          <button
            onClick={() => setActiveTab("afflictions")}
            className={cn(
              "px-3.5 py-2 border-b-2 transition-all cursor-pointer flex items-center gap-1.5",
              activeTab === "afflictions"
                ? "border-rose-500 text-rose-700 font-black bg-rose-50/60 rounded-t-xl"
                : "border-transparent text-slate-500 hover:text-slate-800",
            )}
          >
            <ShieldAlert className="size-3.5 text-rose-500" />
            <span>পীড়িত গ্রহ সতর্কতা ({afflicted.length})</span>
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {loading && !dossier ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
              <Loader2 className="size-8 animate-spin text-amber-500" />
              <p className="font-bold text-slate-700">Synthesizing Client Vedic Kundli Dossier...</p>
              <p className="text-slate-400 text-[11px]">Calculating Lagna, Dasha periods, and afflicted transits in real-time.</p>
            </div>
          ) : (
            <>
              {/* TAB 1: 1-GLANCE DIAGNOSIS */}
              {activeTab === "diagnosis" && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  {/* Golden Opening Ice-Breaker Question */}
                  {iceBreaker && (
                    <div className="rounded-2xl border-2 border-amber-300 bg-linear-to-br from-amber-50 via-amber-50/70 to-orange-50/40 p-4 space-y-2 text-amber-950 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-amber-800">
                          <Sparkles className="size-3.5 text-amber-600" />
                          <span>কল শুরুর গোল্ডেন ওপেনিং প্রশ্ন (Astrologer&apos;s Ice-Breaker)</span>
                        </span>
                        <button
                          onClick={handleCopyQuestion}
                          className="flex items-center gap-1 rounded-lg bg-white/90 px-2 py-1 text-[10px] font-bold text-amber-800 border border-amber-200 hover:bg-white shadow-2xs transition-all cursor-pointer"
                        >
                          {copiedQuestion ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                          <span>{copiedQuestion ? "কপি হয়েছে!" : "কপি করুন"}</span>
                        </button>
                      </div>
                      <p className="text-xs sm:text-sm font-black text-amber-950 leading-relaxed italic border-l-3 border-amber-500 pl-3">
                        &ldquo;{iceBreaker}&rdquo;
                      </p>
                      <p className="text-[10px] text-amber-800/80">
                        💡 কল শুরু করে চার্ট খোঁজার বদলে প্রথম ১০ সেকেন্ডেই এই প্রশ্নটি করলে ক্লায়েন্ট তাৎক্ষণিকভাবে আশ্বস্ত হবেন।
                      </p>
                    </div>
                  )}

                  {/* Core Suffering (কী সমস্যায় ভুগছে) */}
                  <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 space-y-1.5">
                    <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-rose-800">
                      <AlertTriangle className="size-3.5 text-rose-600" />
                      <span>ক্লায়েন্টের মূল সমস্যা ও মানসিক পীড়া (Root Cosmic Distress)</span>
                    </span>
                    <p className="text-xs font-bold text-rose-950 leading-relaxed">
                      {coreDistress}
                    </p>
                  </div>

                  {/* 1-Glance Cheat Sheet Grid */}
                  <div className="rounded-2xl border border-indigo-200/80 bg-indigo-50/40 p-4 space-y-2.5">
                    <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-indigo-900">
                      <Zap className="size-3.5 text-indigo-600" />
                      <span>জ্যোতিষীর দ্রুত চিট-শীট (Executive 1-Glance Scanning Points)</span>
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {cheatSheet.map((item: string, idx: number) => (
                        <div
                          key={idx}
                          className="rounded-xl border border-indigo-100 bg-white/90 p-2.5 flex items-start gap-2 shadow-2xs"
                        >
                          <span className="flex size-4 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-black text-indigo-700 shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-800 leading-relaxed">
                            {item}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Prescriptive Remedies Blueprint */}
                  {remedy && (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-2.5">
                      <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-900">
                        <Gem className="size-3.5 text-emerald-600" />
                        <span>প্রস্তাবিত বৈদিক প্রতিকার ব্লুপ্রিন্ট (Session Prescription Blueprint)</span>
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                        <div className="rounded-xl bg-white/90 p-2.5 border border-emerald-100 space-y-0.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">রত্ন (Gemstone)</span>
                          <p className="font-black text-emerald-900">{remedy.gemstone || "পরামর্শ অনুযায়ী নির্ধার্য"}</p>
                        </div>
                        <div className="rounded-xl bg-white/90 p-2.5 border border-emerald-100 space-y-0.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">রুদ্রাক্ষ (Rudraksha)</span>
                          <p className="font-black text-emerald-900">{remedy.rudraksha || "৫ মুখী নেপালি রুদ্রাক্ষ"}</p>
                        </div>
                        <div className="rounded-xl bg-white/90 p-2.5 border border-emerald-100 space-y-0.5 sm:col-span-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">বৈদিক মন্ত্র ও দান</span>
                          <p className="font-bold text-slate-800">{remedy.mantra} · {remedy.charity_ritual}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: CHART & PLANETARY GRID */}
              {activeTab === "chart" && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  {/* 3 Core Identity Cards: Lagna, Moon Sign, Nakshatra */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-2xl border-2 border-amber-300 bg-linear-to-b from-amber-50/80 to-white p-3.5 space-y-1">
                      <span className="text-[10px] font-black uppercase text-amber-800 flex items-center gap-1">
                        <Sun className="size-3.5 text-amber-600" />
                        <span>লগ্ন (Ascendant)</span>
                      </span>
                      <p className="text-base font-black text-slate-900">
                        {core.lagna_bn || core.lagna || "—"}
                      </p>
                      <p className="text-[11px] text-slate-500 font-medium">
                        লগ্নাধিপতি: <span className="font-bold text-slate-700">{core.lagna_lord_bn || core.lagna_lord || "—"}</span>
                      </p>
                    </div>

                    <div className="rounded-2xl border-2 border-indigo-300 bg-linear-to-b from-indigo-50/80 to-white p-3.5 space-y-1">
                      <span className="text-[10px] font-black uppercase text-indigo-800 flex items-center gap-1">
                        <Moon className="size-3.5 text-indigo-600" />
                        <span>চন্দ্র রাশি (Moon Sign)</span>
                      </span>
                      <p className="text-base font-black text-slate-900">
                        {core.chandra_rashi_bn || core.chandra_rashi || "—"}
                      </p>
                      <p className="text-[11px] text-slate-500 font-medium">
                        রাশিপতি: <span className="font-bold text-slate-700">{core.chandra_lord_bn || core.chandra_lord || "—"}</span>
                      </p>
                    </div>

                    <div className="rounded-2xl border-2 border-purple-300 bg-linear-to-b from-purple-50/80 to-white p-3.5 space-y-1">
                      <span className="text-[10px] font-black uppercase text-purple-800 flex items-center gap-1">
                        <Sparkles className="size-3.5 text-purple-600" />
                        <span>জন্ম নক্ষত্র (Nakshatra)</span>
                      </span>
                      <p className="text-base font-black text-slate-900">
                        {core.nakshatra_bn || core.nakshatra || "—"}
                      </p>
                      <p className="text-[11px] text-slate-500 font-medium">
                        নক্ষত্রপতি: <span className="font-bold text-slate-700">{core.nakshatra_lord_bn || core.nakshatra_lord || "—"}</span>
                      </p>
                    </div>
                  </div>

                  {/* Active Vimshottari Dasha Banner */}
                  <div className="rounded-2xl border border-sky-200 bg-sky-50/60 p-4 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-sky-800 flex items-center gap-1.5">
                        <Clock className="size-3.5 text-sky-600" />
                        <span>চলতি বিংশোত্তরী দশা (Running Vimshottari Dasha)</span>
                      </span>
                      {dasha.end_date && (
                        <span className="text-[10px] font-bold text-sky-700 bg-white/80 px-2 py-0.5 rounded-full border border-sky-200">
                          মেয়াদ: {dasha.end_date} পর্যন্ত
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-black text-sky-950">
                      {dasha.mahadasha_lord_bn || dasha.mahadasha_lord} মহাদশা · {dasha.antardasha_lord_bn || dasha.antardasha_lord} অন্তর্দশা
                    </p>
                    <p className="text-[11px] text-sky-900 leading-relaxed">
                      {dasha.verdict_bn} {dasha.karmic_phase_bn}
                    </p>
                  </div>

                  {/* Consultation Pillar Houses Analysis */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-black uppercase text-slate-400 block tracking-wider">
                      পিলারভিত্তিক ভাব ও গ্রহাবস্থান ({dossier?.focus_topic || "কনসালটেশন"})
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {pillarHouses.map((h: any) => (
                        <div
                          key={h.house_num}
                          className="rounded-2xl border border-slate-200 bg-white p-3 space-y-1.5 shadow-2xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-black text-xs text-slate-900">{h.title_bn}</span>
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                              {h.sign_bn} (পতি: {h.lord_bn})
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 leading-relaxed">
                            {h.summary_bn}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: AFFLICTED PLANETS */}
              {activeTab === "afflictions" && (
                <div className="space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
                      <ShieldAlert className="size-4 text-rose-600" />
                      <span>পীড়িত গ্রহ পর্যবেক্ষণ তালিকা ({afflicted.length}টি গ্রহ চিহ্নিত)</span>
                    </span>
                  </div>

                  {afflicted.length === 0 ? (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-8 text-center space-y-1">
                      <Sparkles className="size-8 text-emerald-600 mx-auto" />
                      <p className="font-bold text-emerald-950 text-xs">কোনো তীব্র পীড়িত গ্রহ চিহ্নিত হয়নি</p>
                      <p className="text-[11px] text-emerald-700">গ্রহাবস্থান সামগ্রিকভাবে ভারসাম্যপূর্ণ ও ইতিবাচক।</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {afflicted.map((a: any, idx: number) => {
                        const isHigh = a.severity === "high";
                        return (
                          <div
                            key={idx}
                            className={cn(
                              "rounded-2xl border p-3.5 space-y-1.5 transition-all",
                              isHigh
                                ? "border-rose-300 bg-rose-50/70 text-rose-950"
                                : "border-amber-300 bg-amber-50/60 text-amber-950",
                            )}
                          >
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "flex size-6 items-center justify-center rounded-lg text-xs font-black text-white",
                                  isHigh ? "bg-rose-600" : "bg-amber-600"
                                )}>
                                  {a.planet_bn?.[0] || a.planet?.[0]}
                                </span>
                                <span className="font-black text-sm text-slate-900">
                                  {a.planet_bn || a.planet} ({a.sign_bn || a.sign})
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/90 border border-slate-200 text-slate-600">
                                  {a.house}ম ভাব
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 flex-wrap">
                                {(a.reasons || []).map((r: string, rIdx: number) => (
                                  <span
                                    key={rIdx}
                                    className="rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold border border-rose-200 text-rose-700 shadow-2xs"
                                  >
                                    {r}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <p className="text-[11px] font-medium leading-relaxed opacity-90 pl-8">
                              ⚠️ <span className="font-bold">লক্ষণ ও প্রভাব:</span> {a.symptom_bn}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Birth Details Coordinates Footer Banner */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 flex items-center justify-between flex-wrap gap-2 text-[11px] text-slate-600">
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Calendar className="size-3 text-slate-400" />
                    <span>DOB: <b>{dossier?.birth_snapshot?.dob || "Not provided"}</b></span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="size-3 text-slate-400" />
                    <span>TOB: <b>{dossier?.birth_snapshot?.tob || "12:00 PM"}</b></span>
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3 text-slate-400" />
                    <span>POB: <b>{dossier?.birth_snapshot?.pob || "Kolkata, WB"}</b></span>
                  </span>
                </div>
                {!isBirthReady && (
                  <span className="text-[10px] text-amber-700 font-bold bg-amber-100/80 px-2 py-0.5 rounded-md">
                    * জন্মতারিখ না থাকায় প্রশ্ন কুণ্ডলী ব্যবহৃত
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 bg-white">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            বন্ধ করুন (Close)
          </button>

          {isLiveChamber && onEnterChamber && (
            <button
              onClick={() => {
                onClose();
                onEnterChamber();
              }}
              className="flex items-center gap-2 rounded-xl bg-linear-to-r from-emerald-600 to-teal-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:from-emerald-700 hover:to-teal-700 transition-all cursor-pointer"
            >
              <Sparkles className="size-3.5" />
              <span>চেম্বারে প্রবেশ করুন (Enter Chamber)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
