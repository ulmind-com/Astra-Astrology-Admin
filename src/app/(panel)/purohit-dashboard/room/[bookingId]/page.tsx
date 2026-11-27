"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Flame, ScrollText, Sparkles } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { BentoVideoStudio } from "@/components/call/bento-video-studio";
import { Button, LoadingBlock } from "@/components/ui";
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

  const [showSankalpaDrawer, setShowSankalpaDrawer] = React.useState(false);
  const [consecrateModalOpen, setConsecrateModalOpen] = React.useState(false);
  const [remainingSeconds, setRemainingSeconds] = React.useState<number | null>(null);
  const { onPujaEvent } = useRealtime();

  const { data: booking, isLoading, error } = useQuery({
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

  if (error || !booking || !booking.zego_token || !booking.zego_app_id || !user?.id) {
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
    app_id: booking.zego_app_id,
    token: booking.zego_token,
    room_id: booking.room_id,
    user_id: user.id,
    user_name: user.first_name ? `Purohit ${user.first_name}` : "Purohit Ji",
  };

  const timerText =
    remainingSeconds !== null && !isCompleted
      ? `${String(Math.floor(remainingSeconds / 60)).padStart(2, "0")}:${String(remainingSeconds % 60).padStart(2, "0")}`
      : isCompleted
      ? "CONSECRATED"
      : `${booking.puja_duration_minutes}:00`;

  const devoteeName = booking.sankalpa_name || booking.user_name || "ভক্ত";

  return (
    <>
      <BentoVideoStudio
        credentials={credentials}
        sessionId={booking.id}
        peerUserId={booking.user_id}
        peerName={devoteeName}
        peerRoleLabel="যজমান / ভক্ত (Devotee)"
        selfName={user.first_name || "Purohit"}
        selfRoleLabel="Presiding Purohit"
        selfAvatarUrl={user.avatar_url}
        title={booking.puja_name}
        subtitle={`বুকিং #${booking.booking_number} · গোত্র: ${booking.sankalpa_gotra || "কাশ্যপ"} · দক্ষিণা: ₹${booking.amount_inr}`}
        timerText={timerText}
        timerWarning={remainingSeconds !== null && remainingSeconds <= 120}
        onLeave={() => router.push("/purohit-dashboard/bookings")}
        checklistTitle="Puja Vidhi & Sankalpa Steps"
        initialTasks={[
          { id: "deepa", label: "দীপ প্রজ্বলন ও আচমন সম্পন্ন (Deepa & Achaman)", defaultDone: true },
          { id: "sankalpa", label: `সংকল্প পাঠ: ${devoteeName} (${booking.sankalpa_gotra || "Kashyapa"})` },
          { id: "ganesh", label: "শ্রী গণেশ ও গুরু বন্দনা" },
          { id: "main", label: `মূল ${booking.puja_name} অর্চনা` },
          { id: "aarti", label: "পুষ্পাঞ্জলি, আরতি ও শান্তি মন্ত্র পাঠ" },
        ]}
        leftExtra={
          <div className="space-y-1.5 text-[11px] text-emerald-100/80">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-300">সংকল্প তথ্য:</span>
              <span className="font-bold text-amber-300">₹{booking.amount_inr} PAID</span>
            </div>
            {booking.sankalpa_nakshatra && (
              <p>নক্ষত্র: <b className="text-white">{booking.sankalpa_nakshatra}</b></p>
            )}
            {booking.sankalpa_wish && (
              <p className="italic text-emerald-200/75 line-clamp-2">"{booking.sankalpa_wish}"</p>
            )}
          </div>
        }
        headerActions={
          <div className="flex items-center gap-2">
            {!isCompleted && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  if (confirm("আপনি কি নিশ্চিত যে এই পূজা সম্পূর্ণ ও সিদ্ধ হয়েছে?")) {
                    completeMutation.mutate();
                  }
                }}
                loading={completeMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs border border-emerald-400/40"
              >
                <CheckCircle2 className="size-3.5 mr-1" />
                সম্পন্ন করুন (Complete)
              </Button>
            )}
          </div>
        }
        sideActions={[
          {
            id: "sankalpa",
            icon: <ScrollText className="size-4" />,
            title: "Sanskrit Sankalpa Teleprompter",
            active: showSankalpaDrawer,
            onClick: () => setShowSankalpaDrawer((v) => !v),
          },
        ]}
        onToggleToolsDrawer={() => setShowSankalpaDrawer((v) => !v)}
        toolsDrawerActive={showSankalpaDrawer}
        bottomBannerText={`"ॐ विष्णुर्विष्णुर्विष्णुः ... [${booking.sankalpa_gotra || "कश्यप"}] गोत्रस्य [${devoteeName}] नाम्नः श्री [${booking.puja_name}] पूजनमहं करिष्ये।"`}
        rightDrawer={
          showSankalpaDrawer ? (
            <aside className="absolute right-0 top-0 bottom-0 w-full sm:w-80 bg-[#0A1A18]/95 backdrop-blur-xl border-l border-[#1E3B36] p-4 z-30 flex flex-col gap-3 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-[#1E3B36] pb-2">
                <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                  <Sparkles className="size-3.5" /> বৈদিক সংকল্প প্রম্পটার
                </span>
                <button
                  type="button"
                  onClick={() => setShowSankalpaDrawer(false)}
                  className="text-xs text-stone-400 hover:text-white cursor-pointer"
                >
                  Close &times;
                </button>
              </div>
              <div className="rounded-xl bg-[#0F2623] border border-[#244741] p-3 text-xs space-y-1.5">
                <p><span className="text-stone-400">যজমান:</span> <b className="text-amber-200">{devoteeName}</b></p>
                <p><span className="text-stone-400">গোত্র:</span> <b>{booking.sankalpa_gotra || "Kashyapa"}</b></p>
                {booking.sankalpa_nakshatra && (
                  <p><span className="text-stone-400">নক্ষত্র:</span> <b>{booking.sankalpa_nakshatra}</b></p>
                )}
                {booking.sankalpa_wish && (
                  <p className="pt-1 text-emerald-200/80 italic">"{booking.sankalpa_wish}"</p>
                )}
              </div>
              <div className="rounded-xl bg-black/30 border border-emerald-500/20 p-3 font-serif text-xs text-amber-100/90 leading-relaxed italic">
                "ॐ विष्णुर्विष्णुर्विष्णुः श्रीमद्भगवतो महापुरुषस्य विष्णोराज्ञया प्रवर्तमानस्य ब्रह्मणो द्वितीयपरार्धे श्रीश्वेतवाराहकल्पे वैवस्वतमन्वन्तरे अष्टाविंशतितमे कलियुगे कलिप्रथमचरणे जम्बूद्वीपे भारतवर्षे...{" "}
                <span className="text-emerald-300 font-bold">[{booking.sankalpa_gotra || "कश्यप"}]</span> गोत्रस्य{" "}
                <span className="text-emerald-300 font-bold">[{devoteeName}]</span> नाम्नः मम सकलपापक्षयपूर्वक आयुर्बलारोग्यैश्वर्याभिवृद्ध्यर्थं श्री{" "}
                <span className="text-emerald-300 font-bold">[{booking.puja_name}]</span> पूजनमहं करिष्ये।"
              </div>
            </aside>
          ) : undefined
        }
      />

      {consecrateModalOpen && (
        <div className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-3xl bg-[#0B1E1B] border-2 border-emerald-500/50 p-6 text-center shadow-2xl space-y-4 text-white">
            <div className="size-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="size-8" />
            </div>
            <div className="space-y-1">
              <h3 className="font-serif text-xl font-bold text-emerald-200">
                পবিত্র পূজা সফলভাবে সম্পন্ন ও প্রতিষ্ঠিত!
              </h3>
              <p className="text-xs text-stone-300">
                {devoteeName}-এর উদ্দেশ্যে অনুষ্ঠিত {booking.puja_name} সম্পন্ন হয়েছে এবং আপনার দক্ষিণা নিশ্চিত করা হয়েছে।
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-black/40 border border-emerald-500/20 text-xs text-amber-200 font-serif">
              "ॐ स्वस्ति न इन्द्रो वृद्धश्रवाः... ॐ शान्तिः शान्तिः शान्तिः॥"
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => router.push("/purohit-dashboard/bookings")}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2"
            >
              ড্যাশবোর্ডে ফিরুন
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
