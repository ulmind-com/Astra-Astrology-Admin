"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Coins,
  Flame,
  Flower2,
  Maximize2,
  PhoneOff,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Sun,
  User,
  Volume2,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { CallRoom } from "@/components/call/call-room";
import { Badge, Button, LoadingBlock } from "@/components/ui";
import { purohitPortalApi, type PujaBookingData } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { useRequireAuth } from "@/providers/auth-provider";
import { useRealtime } from "@/providers/realtime-provider";

export default function PurohitPujaRoomPage() {
  const params = useParams<{ bookingId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const bookingId = params?.bookingId || "";

  const { ready, user } = useRequireAuth({
    roles: ["purohit", "admin", "super_admin"],
    signInPath: "/login",
  });

  // UI States
  const [showSankalpaDrawer, setShowSankalpaDrawer] = React.useState(true);
  const [vedicAudioMode, setVedicAudioMode] = React.useState(true);
  const [consecrateModalOpen, setConsecrateModalOpen] = React.useState(false);
  const [remainingSeconds, setRemainingSeconds] = React.useState<number | null>(null);
  const { onPujaEvent } = useRealtime();

  const { data: res, isLoading, error } = useQuery({
    queryKey: ["puja_room_token", bookingId],
    queryFn: async () => {
      const resp = await purohitPortalApi.getRoomToken(bookingId);
      return ((resp as any)?.data !== undefined ? (resp as any).data : resp) as PujaBookingData;
    },
    enabled: ready && Boolean(bookingId),
    refetchOnWindowFocus: false,
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      return await purohitPortalApi.completeBooking(bookingId);
    },
    onSuccess: () => {
      setConsecrateModalOpen(true);
      toast.success("✅ পবিত্র পূজা সফলভাবে সম্পন্ন ও প্রতিষ্ঠিত হিসেবে চিহ্নিত হয়েছে!");
      queryClient.invalidateQueries({ queryKey: ["puja_room_token", bookingId] });
      queryClient.invalidateQueries({ queryKey: ["purohit_me_bookings"] });
      queryClient.invalidateQueries({ queryKey: ["purohit_me_active_booking"] });
      queryClient.invalidateQueries({ queryKey: ["purohit_me_profile"] });
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : "Failed to complete puja";
      toast.error(msg);
    },
  });

  const booking = res;

  // Countdown synced cleanly with backend `expires_at`
  React.useEffect(() => {
    if (!booking?.expires_at || booking.status === "completed") return;
    const expiryMs = Date.parse(booking.expires_at);
    if (Number.isNaN(expiryMs)) return;

    const tick = () => {
      const secs = Math.max(0, Math.floor((expiryMs - Date.now()) / 1000));
      setRemainingSeconds(secs);
      if (secs === 0 && !consecrateModalOpen) {
        setConsecrateModalOpen(true);
        queryClient.invalidateQueries({ queryKey: ["purohit_me_profile"] });
        queryClient.invalidateQueries({ queryKey: ["purohit_me_bookings"] });
        toast.info("নির্ধারিত পূজার সময় সম্পূর্ণ হয়েছে।");
      }
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [booking?.expires_at, booking?.status, consecrateModalOpen, queryClient]);

  React.useEffect(() => {
    return onPujaEvent((msg) => {
      if (String(msg.data.booking?.id) === bookingId && msg.data.event === "puja_ended") {
        setConsecrateModalOpen(true);
        queryClient.invalidateQueries({ queryKey: ["purohit_me_profile"] });
        queryClient.invalidateQueries({ queryKey: ["purohit_me_bookings"] });
      }
    });
  }, [bookingId, onPujaEvent, queryClient]);

  if (!ready || isLoading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-6 text-white">
        <LoadingBlock label="বৈদিক ভার্চুয়াল মন্দির চেম্বারে সংযোগ স্থাপন করা হচ্ছে..." />
      </div>
    );
  }

  if (error || !booking || !booking.zego_token) {
    return (
      <div className="p-10 text-center space-y-4 max-w-md mx-auto">
        <div className="size-14 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-500 flex items-center justify-center mx-auto">
          <Flame className="size-7" />
        </div>
        <h3 className="text-base font-bold text-stone-900 dark:text-white font-serif">
          ভার্চুয়াল পূজা রুম চালু করা যায়নি
        </h3>
        <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
          রুমের টোকেনের মেয়াদ শেষ হয়েছে অথবা সংযোগে সমস্যা হয়েছে। দয়া করে ড্যাশবোর্ডে ফিরে যান।
        </p>
        <Link href="/purohit-dashboard">
          <Button variant="outline" size="sm" className="font-bold">
            <ArrowLeft className="size-4 mr-1.5" />
            ড্যাশবোর্ডে ফিরুন
          </Button>
        </Link>
      </div>
    );
  }

  const isCompleted = booking.status === "completed";

  const credentials = {
    app_id: booking.zego_app_id || 1318055627,
    token: booking.zego_token,
    room_id: booking.room_id,
    user_id: user?.id || "purohit",
    user_name: user?.first_name ? `Purohit ${user.first_name}` : "Purohit Ji",
  };

  return (
    <div className="space-y-3 font-sans">
      {/* ------------------------------------------------------------- */}
      {/* 1. TOP CONTROL BAR                                            */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-stone-900 via-[#101726] to-stone-900 border border-amber-500/30 text-white shadow-xl">
        <div className="flex items-center gap-3">
          <Link href="/purohit-dashboard">
            <Button variant="outline" size="sm" className="p-2 border-stone-700 bg-stone-800 text-stone-300 hover:text-white" title="ড্যাশবোর্ডে ফিরুন">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>

          <div>
            <div className="flex items-center gap-2">
              <Flame className="size-4 text-amber-500 animate-pulse" />
              <h3 className="font-bold text-sm sm:text-base text-amber-200 font-serif">
                {booking.puja_name}
              </h3>
              <Badge tone="green" className="text-[10px] font-bold">
                {isCompleted ? "CONSECRATED" : "LIVE RITUAL"}
              </Badge>
            </div>
            <p className="text-xs text-stone-300">
              যজমান: <b className="text-white">{booking.sankalpa_name}</b> | গোত্র: <b className="text-amber-200">{booking.sankalpa_gotra || "Kashyapa"}</b> | বুকিং #{booking.booking_number}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {remainingSeconds !== null && !isCompleted && (
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-extrabold ${
                remainingSeconds <= 120
                  ? "bg-rose-500/20 border-rose-400/60 text-rose-200 animate-pulse"
                  : "bg-emerald-500/20 border-emerald-400/40 text-emerald-200"
              }`}
              title="Remaining live puja room time"
            >
              <Clock className="size-3.5" />
              <span>
                {String(Math.floor(remainingSeconds / 60)).padStart(2, "0")}:
                {String(remainingSeconds % 60).padStart(2, "0")}
              </span>
            </div>
          )}

          {/* Vedic Audio Optimization Mode */}
          <button
            type="button"
            onClick={() => {
              setVedicAudioMode(!vedicAudioMode);
              toast.info(
                !vedicAudioMode
                  ? "🕉️ বৈদিক মন্ত্র ও শঙ্খ মোড সক্রিয় — ঘণ্টাধ্বনি ও শঙ্খের স্বর ক্লিপিং ছাড়াই প্রবহমান।"
                  : "🎙️ স্ট্যান্ডার্ড স্পিচ মোড সক্রিয়।"
              );
            }}
            className={`hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
              vedicAudioMode
                ? "bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-sm shadow-amber-500/20"
                : "bg-stone-900 border-stone-700 text-stone-400 hover:text-white"
            }`}
          >
            <Sparkles className="size-3.5 text-amber-400" />
            <span>{vedicAudioMode ? "Vedic Chanting Mode: ON" : "Vedic Audio: OFF"}</span>
          </button>

          {/* Toggle Sankalpa Teleprompter Drawer */}
          <button
            type="button"
            onClick={() => setShowSankalpaDrawer(!showSankalpaDrawer)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
              showSankalpaDrawer
                ? "bg-amber-950/60 border-amber-500/40 text-amber-200"
                : "bg-stone-900/80 border-stone-700 text-stone-300 hover:text-white"
            }`}
          >
            <ScrollText className="size-3.5 text-amber-400" />
            <span className="hidden sm:inline">যজমানের সংকল্প</span>
            {showSankalpaDrawer ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
          </button>

          {/* Complete Sacred Puja & Mark Consecrated Button */}
          {!isCompleted && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                if (confirm("আপনি কি নিশ্চিত যে এই পূজা সম্পূর্ণ ও সিদ্ধ হয়েছে? এটি দক্ষিণা নিশ্চিত করবে।")) {
                  completeMutation.mutate();
                }
              }}
              loading={completeMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 border border-emerald-400/40"
            >
              <CheckCircle2 className="size-3.5 mr-1" />
              Complete Sacred Puja & Mark Consecrated
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/purohit-dashboard/bookings")}
            className="border-rose-900/60 bg-rose-950/30 text-rose-300 hover:bg-rose-900/50 text-xs font-bold"
          >
            <PhoneOff className="size-3.5 mr-1" />
            <span className="hidden sm:inline">ত্যাগ করুন</span>
          </Button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. MAIN VIRTUAL TEMPLE & HAVAN FEED                           */}
      {/* ------------------------------------------------------------- */}
      <div className="relative h-[74vh] w-full rounded-2xl overflow-hidden bg-stone-950 border-2 border-amber-500/20 shadow-2xl flex flex-col md:flex-row">
        {/* Large Havan / Deity Viewport */}
        <div className="flex-1 relative w-full h-full bg-black">
          <CallRoom
            credentials={credentials}
            onLeave={() => router.push("/purohit-dashboard/bookings")}
            className="w-full h-full"
            audioOnly={false}
            group={false}
          />

          {/* Top Left Floating Indicator */}
          <div className="absolute top-4 left-4 z-20 flex items-center gap-2 pointer-events-none">
            <div className="px-3 py-1.5 rounded-xl bg-black/80 backdrop-blur-md border border-amber-500/40 text-amber-300 flex items-center gap-2 text-xs font-bold shadow-lg">
              <span className="size-2 rounded-full bg-red-500 animate-ping" />
              <span>হোমকুণ্ড ও বেদী ক্যামেরা (Havan Feed • 1080p HD)</span>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* 3. YAJAMANA SANKALPA TELEPROMPTER DRAWER                      */}
        {/* ------------------------------------------------------------- */}
        {showSankalpaDrawer && (
          <aside className="w-full md:w-96 bg-[#0B0F19] border-t md:border-t-0 md:border-l border-amber-500/30 flex flex-col z-20 shadow-2xl max-h-[45vh] md:max-h-full overflow-y-auto">
            <div className="p-3.5 border-b border-amber-500/20 bg-stone-950/90 flex items-center justify-between sticky top-0 backdrop-blur-md z-10">
              <div className="flex items-center gap-2">
                <ScrollText className="size-4 text-amber-400" />
                <h4 className="font-serif font-bold text-xs uppercase tracking-wider text-amber-200">
                  যজমানের বৈদিক সংকল্প বিবরণ
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowSankalpaDrawer(false)}
                className="text-stone-400 hover:text-white p-1 text-xs"
              >
                হাইড &times;
              </button>
            </div>

            <div className="p-4 space-y-3.5 text-xs">
              {/* Devotee Info Card */}
              <div className="p-3.5 rounded-2xl bg-stone-900/90 border border-amber-500/30 space-y-2.5">
                <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                    যজমান / সংকল্প কর্তা
                  </span>
                  <Badge tone="green" className="text-[10px] font-bold">
                    PAID (₹{booking.amount_inr})
                  </Badge>
                </div>

                <div>
                  <span className="text-[11px] text-stone-400 block">নাম:</span>
                  <strong className="text-base font-bold text-amber-200">
                    {booking.sankalpa_name}
                  </strong>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-stone-800">
                  <div>
                    <span className="text-[11px] text-stone-400 block">গোত্র (Gotra):</span>
                    <strong className="text-stone-200 font-semibold">
                      {booking.sankalpa_gotra || "কশ্যপ (Kashyapa)"}
                    </strong>
                  </div>

                  <div>
                    <span className="text-[11px] text-stone-400 block">নক্ষত্র (Nakshatra):</span>
                    <strong className="text-stone-200 font-semibold">
                      {booking.sankalpa_nakshatra || "রোহিণী / হস্তা"}
                    </strong>
                  </div>
                </div>

                {booking.sankalpa_wish && (
                  <div className="pt-2 border-t border-stone-800">
                    <span className="text-[11px] text-stone-400 block">বিশেষ মনস্কামনা ও সংকল্প ইচ্ছা:</span>
                    <p className="mt-0.5 text-stone-300 italic bg-black/40 p-2.5 rounded-xl border border-stone-800 leading-relaxed">
                      "{booking.sankalpa_wish}"
                    </p>
                  </div>
                )}
              </div>

              {/* Sanskrit Vedic Sankalpa Prompter for Purohit */}
              <div className="p-3.5 rounded-2xl bg-amber-950/20 border border-amber-500/20 space-y-2">
                <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
                  <Sparkles className="size-3.5" />
                  <span>বৈদিক সংকল্প পাঠ প্রম্পটার (Sanskrit Text):</span>
                </div>

                <div className="font-serif text-[11px] text-amber-100/90 bg-black/50 p-3 rounded-xl border border-amber-500/20 leading-relaxed italic">
                  "ॐ विष्णुर्विष्णुर्विष्णुः श्रीमद्भगवतो महापुरुषस्य विष्णोराज्ञया प्रवर्तमानस्य ब्रह्मणो द्वितीयपरार्धे श्रीश्वेतवाराहकल्पे वैवस्वतमन्वन्तरे अष्टाविंशतितमे कलियुगे कलिप्रथमचरणे जम्बूद्वीपे भारतवर्षे... <span className="text-amber-300 font-bold">[{booking.sankalpa_gotra || "कश्यप"}]</span> गोत्रस्य <span className="text-amber-300 font-bold">[{booking.sankalpa_name}]</span> नाम्नः मम सकलपापक्षयपूर्वक आयुर्बलारोग्यैश्वर्याभिवृद्ध्यर्थं শ্রী <span className="text-amber-300 font-bold">[{booking.puja_name}]</span> पूजनमहं करिष्ये।"
                </div>
              </div>

              {/* Complete Puja Action in Drawer */}
              {!isCompleted && (
                <div className="pt-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      if (confirm("আপনি কি নিশ্চিত যে পূজা সম্পূর্ণ ও সিদ্ধ হয়েছে? এটি দক্ষিণা নিশ্চিত করবে।")) {
                        completeMutation.mutate();
                      }
                    }}
                    loading={completeMutation.isPending}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 shadow-lg shadow-emerald-600/30"
                  >
                    <CheckCircle2 className="size-4 mr-1.5" />
                    Complete Sacred Puja & Mark Consecrated
                  </Button>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. CONSECRATION BENEDICTION MODAL                             */}
      {/* ------------------------------------------------------------- */}
      {consecrateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-3xl bg-gradient-to-b from-[#131B2E] to-stone-950 border-2 border-amber-500/50 p-6 text-center shadow-2xl space-y-4 animate-in fade-in zoom-in-95 text-white">
            <div className="size-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center mx-auto text-emerald-400 shadow-lg shadow-emerald-500/30">
              <CheckCircle2 className="size-8" />
            </div>

            <div className="space-y-1">
              <h3 className="font-serif text-xl font-bold text-amber-200">
                পবিত্র পূজা সফলভাবে সম্পন্ন ও প্রতিষ্ঠিত!
              </h3>
              <p className="text-xs text-stone-300">
                {booking.sankalpa_name}-এর উদ্দেশ্যে অনুষ্ঠিত {booking.puja_name} সম্পন্ন হিসেবে ডাটাবেজে নথিবদ্ধ করা হয়েছে এবং আপনার দক্ষিণা নিশ্চিত করা হয়েছে।
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-black/50 border border-amber-500/20 text-xs text-amber-300 font-serif">
              "ॐ स्वस्ति न इन्द्रो वृद्धश्रवाः स्वस्ति नः पूषा विश्ववेदाः। स्वस्ति नस्तार्क्ष्यो अरिष्टनेमिः स्वस्ति नो बृहस्पतिर्दधातु॥ ॐ शान्तिः शान्तिः शान्तिः॥"
            </div>

            <div className="pt-2 flex justify-center">
              <Button
                variant="primary"
                size="sm"
                onClick={() => router.push("/purohit-dashboard/bookings")}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-6 py-2"
              >
                ড্যাশবোর্ডে ফিরুন
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
