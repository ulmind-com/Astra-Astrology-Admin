"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Flame,
  Gem,
  Printer,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import QRCode from "qrcode";
import * as React from "react";
import { toast } from "sonner";

import { Badge, Button } from "@/components/ui";
import { appointmentApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Appointment } from "@/types";

export interface DivyaParamarshaModalProps {
  appointment: Appointment | null;
  onClose: () => void;
  onEditPrescription?: (a: Appointment) => void;
}

export function DivyaParamarshaModal({
  appointment,
  onClose,
  onEditPrescription,
}: DivyaParamarshaModalProps) {
  const [qrDataUrl, setQrDataUrl] = React.useState<string>("");
  const [copiedLink, setCopiedLink] = React.useState(false);

  // Fetch verified certificate data from backend
  const { data: certData, isLoading } = useQuery({
    queryKey: ["appointment", "certificate", appointment?.id],
    queryFn: () => appointmentApi.getCertificate(appointment!.id),
    enabled: Boolean(appointment?.id),
    staleTime: 60_000,
  });

  const cert = certData || appointment?.certificate_data || null;

  // Verification URL
  const verifyUrl = React.useMemo(() => {
    if (typeof window === "undefined" || !appointment) return "";
    const origin = window.location.origin.replace("admin", "web").replace(":3001", ":3000");
    return `${origin}/verify/prescription/${appointment.id}`;
  }, [appointment]);

  // Generate QR Code data URL
  React.useEffect(() => {
    if (!verifyUrl) return;
    QRCode.toDataURL(verifyUrl, {
      width: 240,
      margin: 1,
      color: {
        dark: "#1A1306",
        light: "#FAF5E9",
      },
      errorCorrectionLevel: "M",
    })
      .then((url) => setQrDataUrl(url))
      .catch(() => {});
  }, [verifyUrl]);

  if (!appointment) return null;

  const clientName =
    cert?.client?.name ||
    appointment.peer?.name ||
    (appointment.birth_details as any)?.name ||
    "Seeker";

  const astroName =
    cert?.astrologer?.name ||
    (appointment as any)?.astrologer?.name ||
    "Vedic Astrologer";

  const pillar = (
    cert?.consultation_pillar ||
    appointment.consultation_pillar ||
    "Vedic Consultation"
  )
    .replace(/_/g, " ")
    .toUpperCase();

  const rx = cert?.sacred_prescription || appointment.prescription || {};
  const gemstone = rx.consecrated_gemstone || rx.gemstone || "Not prescribed in this session";
  const rudraksha = rx.sacred_rudraksha || rx.rudraksha || "Not prescribed in this session";
  const mantra = rx.vedic_mantra || rx.mantra || "ॐ नमो भगवते वासुदेवाय";
  const japaCount = rx.japa_count || rx.mantra_count || 108;
  const daan = rx.daan_charity_ritual || rx.daan_remedy || "Feed birds / cows on auspicious morning";
  const sankalpa =
    rx.sankalpa ||
    "May my consciousness align with cosmic harmony, dissolving karmic obstacles through spiritual perseverance.";
  const guidance =
    rx.astrologer_guidance ||
    rx.astrologer_notes ||
    "Maintain daily meditative practice and follow prescribed remedies diligently.";

  const certId = cert?.certificate_id || `ASTRA-DIVYA-${appointment.id.slice(-8).toUpperCase()}`;
  const issuedDate = cert?.issued_at
    ? new Date(cert.issued_at).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : new Date().toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

  const verificationHash =
    cert?.digital_seal?.verification_hash ||
    `SHA256:${appointment.id.slice(0, 16).toUpperCase()}`;

  const handleCopyLink = () => {
    if (!verifyUrl) return;
    navigator.clipboard.writeText(verifyUrl);
    setCopiedLink(true);
    toast.success("Verification link copied to clipboard!");
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="relative w-full max-w-4xl bg-slate-950 border border-amber-500/30 rounded-3xl shadow-[0_25px_80px_rgba(0,0,0,0.85)] overflow-hidden my-auto print:border-none print:shadow-none print:rounded-none print:bg-white print:max-w-none print:w-full">
        {/* Top Floating Control Bar (Hidden when printed) */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 px-6 border-b border-amber-500/20 bg-slate-900/90 print:hidden">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40">
              <Sparkles className="size-4" />
            </div>
            <div>
              <h3 className="font-display text-sm font-bold text-amber-200">
                Divya Paramarsha Certificate (দিব্য পরামর্শ সনদ)
              </h3>
              <p className="text-[11px] text-slate-400">
                Royal Vedic Certificate with Digital Seal & Verification QR Code
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onEditPrescription && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  onClose();
                  onEditPrescription(appointment);
                }}
                className="text-xs font-bold border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800"
              >
                Edit Remedies
              </Button>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyLink}
              className="text-xs font-bold border-amber-500/40 text-amber-300 hover:bg-amber-500/10"
              title="Copy public scan verification URL"
            >
              {copiedLink ? <Check className="size-3.5 mr-1" /> : <Copy className="size-3.5 mr-1" />}
              <span>{copiedLink ? "Copied!" : "Copy Scan Link"}</span>
            </Button>

            <a
              href={verifyUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-bold transition-all"
            >
              <ExternalLink className="size-3.5" />
              <span>Verify Page</span>
            </a>

            <Button
              size="sm"
              onClick={handlePrint}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs shadow-md"
            >
              <Printer className="size-3.5 mr-1" />
              <span>Print / Save PDF</span>
            </Button>

            <button
              type="button"
              onClick={onClose}
              className="size-8 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 flex items-center justify-center transition-colors ml-1 cursor-pointer"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* =========================================================================
            ROYAL VEDIC CERTIFICATE CANVAS (Printable A4 / High-Res Layout)
        ========================================================================= */}
        <div
          id="divya-certificate-canvas"
          className="relative p-6 sm:p-10 md:p-12 bg-gradient-to-br from-[#10141E] via-[#0B0E15] to-[#14121F] text-slate-100 overflow-hidden print:p-8 print:bg-white print:text-black"
        >
          {/* Double Royal Gold Filigree Borders */}
          <div className="absolute inset-3 sm:inset-4 border-2 border-amber-500/40 rounded-2xl pointer-events-none print:border-amber-700 print:inset-2" />
          <div className="absolute inset-5 sm:inset-6 border border-amber-500/20 rounded-xl pointer-events-none print:border-amber-600/40 print:inset-4" />

          {/* Corner Sacred Vedic Flourishes */}
          <div className="absolute top-5 left-6 text-amber-500/70 text-lg sm:text-xl font-serif select-none pointer-events-none print:text-amber-800">
            ⚜
          </div>
          <div className="absolute top-5 right-6 text-amber-500/70 text-lg sm:text-xl font-serif select-none pointer-events-none print:text-amber-800">
            ⚜
          </div>
          <div className="absolute bottom-5 left-6 text-amber-500/70 text-lg sm:text-xl font-serif select-none pointer-events-none print:text-amber-800">
            ⚜
          </div>
          <div className="absolute bottom-5 right-6 text-amber-500/70 text-lg sm:text-xl font-serif select-none pointer-events-none print:text-amber-800">
            ⚜
          </div>

          <div className="relative z-10 space-y-6">
            {/* Header: Sacred Om & Royal Title */}
            <div className="text-center space-y-1">
              <div className="inline-block text-3xl sm:text-4xl text-amber-300 select-none animate-pulse print:text-amber-800 print:animate-none">
                ॐ
              </div>
              <h1 className="font-serif text-xl sm:text-2xl md:text-3xl font-extrabold tracking-widest text-[#FBF0D3] uppercase print:text-black">
                Divya Paramarsha Certificate
              </h1>
              <p className="text-[10px] sm:text-[11px] font-bold tracking-[0.25em] text-amber-400/80 uppercase print:text-amber-900">
                দিব্য পরামর্শ পত্ৰিকা • Sacred Vedic Remedial Consecration
              </p>
            </div>

            {/* Sacred Vedic Gayatri Shloka Banner */}
            <div className="max-w-2xl mx-auto rounded-xl bg-amber-500/10 border border-amber-500/30 p-2.5 px-4 text-center space-y-0.5 print:bg-amber-50 print:border-amber-400">
              <p className="font-serif text-xs sm:text-[13px] font-bold text-amber-200 tracking-wide print:text-amber-900">
                ॐ भूर्भुवः स्वः तत्सवितुर्वरेण्यं भर्गो देवस्य धीमहि धियो यो नः प्रचोदयात्॥
              </p>
              <p className="text-[9.5px] sm:text-[10px] text-slate-400 italic print:text-slate-700">
                &ldquo;May the supreme celestial illumination awaken and direct our inner intellect and karma.&rdquo;
              </p>
            </div>

            {/* Recipient Block */}
            <div className="text-center space-y-1.5 py-1">
              <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-slate-400 print:text-slate-600">
                This Consecrated Astrological Record Certifies That
              </p>
              <h2 className="font-serif text-xl sm:text-2xl font-black text-white border-b-2 border-amber-500/40 inline-block px-8 pb-1 tracking-wide print:text-black print:border-amber-700">
                {clientName}
              </h2>
              <p className="text-xs text-slate-300 max-w-xl mx-auto leading-relaxed pt-1 print:text-slate-800">
                Has successfully completed a sacred {appointment.minutes}-minute Vedic consultation in{" "}
                <span className="font-bold text-amber-300 print:text-amber-900">{pillar}</span>, receiving personalized
                planetary diagnostics and authentic remedial directives from{" "}
                <span className="font-bold text-amber-200 print:text-black">Acharya {astroName}</span>.
              </p>
            </div>

            {/* 5-Pillar Sacred Prescription Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              {/* Pillar 1: Gemstone */}
              <div className="rounded-xl border border-amber-500/25 bg-white/[0.03] p-3.5 space-y-1 print:border-slate-300 print:bg-slate-50">
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-amber-400 print:text-amber-800">
                  <Gem className="size-3.5 text-amber-400" />
                  <span>1. Consecrated Gemstone (রত্ন প্রতিকার)</span>
                </div>
                <p className="text-xs font-semibold text-slate-100 leading-snug print:text-black">
                  {gemstone}
                </p>
              </div>

              {/* Pillar 2: Rudraksha */}
              <div className="rounded-xl border border-amber-500/25 bg-white/[0.03] p-3.5 space-y-1 print:border-slate-300 print:bg-slate-50">
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-amber-400 print:text-amber-800">
                  <Sparkles className="size-3.5 text-amber-400" />
                  <span>2. Sacred Rudraksha (রুদ্রাক্ষ বিধান)</span>
                </div>
                <p className="text-xs font-semibold text-slate-100 leading-snug print:text-black">
                  {rudraksha}
                </p>
              </div>

              {/* Pillar 3: Vedic Mantra (Full Span) */}
              <div className="md:col-span-2 rounded-xl border border-amber-500/35 bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-amber-500/10 p-3.5 text-center space-y-1.5 print:bg-amber-50/60 print:border-amber-300">
                <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-amber-300 print:text-amber-900">
                  <Flame className="size-3.5 text-amber-400" />
                  <span>3. Sacred Beej Mantra & Japa Count (বীজমন্ত্র ও জপ)</span>
                </div>
                <p className="font-serif text-base sm:text-lg font-bold text-amber-200 tracking-wide print:text-amber-950">
                  {mantra}
                </p>
                <p className="text-[10px] font-semibold text-slate-300 print:text-slate-700">
                  Consecrated Count: <span className="font-black text-amber-400 print:text-black">{japaCount} Chants Daily</span> during Brahma Muhurat / Morning Pooja
                </p>
              </div>

              {/* Pillar 4: Daan & Charity */}
              <div className="rounded-xl border border-amber-500/25 bg-white/[0.03] p-3.5 space-y-1 print:border-slate-300 print:bg-slate-50">
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-amber-400 print:text-amber-800">
                  <span>🌾</span>
                  <span>4. Daan & Seva Ritual (দান ও পূজার বিধান)</span>
                </div>
                <p className="text-xs font-semibold text-slate-100 leading-snug print:text-black">
                  {daan}
                </p>
              </div>

              {/* Pillar 5: Sacred Sankalpa */}
              <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-3.5 space-y-1 print:border-slate-300 print:bg-slate-50">
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-indigo-300 print:text-indigo-900">
                  <span>🧘</span>
                  <span>5. Vedic Sankalpa (সংকল্প বাক্য)</span>
                </div>
                <p className="text-xs font-semibold text-slate-200 italic leading-snug print:text-black">
                  &ldquo;{sankalpa}&rdquo;
                </p>
              </div>

              {/* Astrologer Directives (Full Span) */}
              {guidance && (
                <div className="md:col-span-2 rounded-xl border border-slate-800 bg-black/20 p-3 space-y-1 print:border-slate-300 print:bg-slate-50">
                  <div className="text-[9.5px] font-black uppercase tracking-wider text-slate-400 print:text-slate-700">
                    📜 Astrologer Special Directives (বিশেষ নির্দেশিকা)
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed print:text-black">
                    {guidance}
                  </p>
                </div>
              )}
            </div>

            {/* Footer: Astrologer Signature, Golden Digital Seal, and Authentic QR Code */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-amber-500/30 items-center print:border-amber-700">
              {/* 1. Digital Signature */}
              <div className="text-left space-y-0.5">
                <p className="font-serif italic text-xl text-amber-300 tracking-wide print:text-amber-900">
                  Acharya {astroName}
                </p>
                <p className="font-bold text-xs text-white uppercase tracking-wider print:text-black">
                  {astroName}
                </p>
                <p className="text-[10px] text-slate-400 print:text-slate-600">
                  Certified Vedic Astrologer & Jyotish Acharya
                </p>
                <p className="text-[9px] text-slate-500 pt-0.5 print:text-slate-700">
                  Date of Consecration: <span className="font-bold">{issuedDate}</span>
                </p>
              </div>

              {/* 2. Golden Digital Seal (দিব্য সীলমোহর) */}
              <div className="flex flex-col items-center justify-center text-center space-y-1">
                <div className="relative flex size-18 items-center justify-center rounded-full border-2 border-amber-400 bg-gradient-to-tr from-amber-500/20 via-amber-400/5 to-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.25)] print:border-amber-700 print:shadow-none">
                  <div className="absolute inset-1 border border-dashed border-amber-400/50 rounded-full" />
                  <div className="text-center">
                    <span className="text-sm font-black text-amber-300">☸</span>
                    <p className="text-[6.5px] font-black uppercase tracking-tighter text-amber-200">
                      ASTRA SEAL
                    </p>
                  </div>
                </div>

                <div className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-[9px] font-black text-amber-300 uppercase tracking-wider print:border-amber-700 print:text-amber-900">
                  <ShieldCheck className="size-3 text-amber-400 print:text-amber-800" />
                  <span>Authentic & Consecrated</span>
                </div>

                <p className="text-[8.5px] font-mono text-slate-500 truncate max-w-[190px] print:text-slate-700">
                  UID: {certId}
                </p>
              </div>

              {/* 3. Unique Authenticity QR Code */}
              <div className="flex flex-col items-center sm:items-end justify-center text-center sm:text-right space-y-1">
                {qrDataUrl ? (
                  <div className="p-1 rounded-xl bg-[#FAF5E9] border border-amber-500/60 shadow-md">
                    <img
                      src={qrDataUrl}
                      alt="Astra Authenticity Verification QR Code"
                      className="size-16 sm:size-18 block rounded-lg"
                    />
                  </div>
                ) : (
                  <div className="size-18 rounded-xl bg-slate-800 animate-pulse" />
                )}
                <p className="text-[8.5px] font-bold text-slate-400 max-w-[140px] leading-tight print:text-slate-700">
                  Scan QR code to verify certificate authenticity on Astra network
                </p>
                <p className="text-[7.5px] font-mono text-amber-400/80 print:text-amber-900">
                  {verificationHash.slice(0, 18)}...
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
