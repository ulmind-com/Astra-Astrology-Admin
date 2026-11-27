"use client";

import { Flame, PhoneOff, Sparkles, User, Video } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui";
import { useLoopingSound } from "@/hooks/use-sound";
import { purohitPortalApi, type PujaBookingData } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/providers/auth-provider";
import { useRealtime } from "@/providers/realtime-provider";

/**
 * Watches for incoming live Puja bookings across ALL Purohit Sanctuary pages
 * (45s Accept SLA popup with looping ringtone + Awaiting-Payment pill).
 */
export function IncomingPujaWatcher() {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { user, isSignedIn } = useAuth();
  const { onPujaEvent } = useRealtime();
  const isPurohit = isSignedIn && user?.role === "purohit";
  const [countdownSeconds, setCountdownSeconds] = React.useState<number | null>(null);

  const { data: activeBooking } = useQuery({
    queryKey: ["purohit_me_active_booking"],
    queryFn: async () => {
      const res = await purohitPortalApi.getActiveBooking();
      return ((res as any)?.data !== undefined ? (res as any).data : res) as PujaBookingData | null;
    },
    enabled: isPurohit,
    refetchInterval: isPurohit ? 8_000 : false,
    refetchOnWindowFocus: true,
  });

  React.useEffect(() => {
    if (!isPurohit) return;
    return onPujaEvent((msg) => {
      queryClient.invalidateQueries({ queryKey: ["purohit_me_active_booking"] });
      queryClient.invalidateQueries({ queryKey: ["purohit_me_bookings"] });
      queryClient.invalidateQueries({ queryKey: ["purohit_me_profile"] });
      if (msg.data.event === "puja_request") {
        toast.info(`নতুন পূজা অনুরোধ: ${msg.data.booking.puja_name} (${msg.data.booking.sankalpa_name})`);
      } else if (msg.data.event === "puja_expired" || msg.data.event === "puja_declined") {
        toast.info(msg.data.booking?.cancel_reason || "পূজা অনুরোধটি বাতিল হয়েছে।");
      }
    });
  }, [isPurohit, onPujaEvent, queryClient]);

  React.useEffect(() => {
    const deadlineIso =
      activeBooking?.status === "awaiting_acceptance"
        ? activeBooking.accept_expires_at
        : activeBooking?.status === "awaiting_payment"
        ? activeBooking.payment_expires_at
        : null;
    if (!deadlineIso) {
      setCountdownSeconds(null);
      return;
    }
    const deadlineMs = Date.parse(deadlineIso);
    if (Number.isNaN(deadlineMs)) return;
    const tick = () => {
      setCountdownSeconds(Math.max(0, Math.floor((deadlineMs - Date.now()) / 1000)));
    };
    tick();
    const t = window.setInterval(tick, 1000);
    return () => window.clearInterval(t);
  }, [activeBooking?.status, activeBooking?.accept_expires_at, activeBooking?.payment_expires_at]);

  const acceptMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const res = await purohitPortalApi.acceptBooking(bookingId);
      return ((res as any)?.data !== undefined ? (res as any).data : res) as PujaBookingData;
    },
    onSuccess: (booking) => {
      queryClient.invalidateQueries({ queryKey: ["purohit_me_active_booking"] });
      queryClient.invalidateQueries({ queryKey: ["purohit_me_bookings"] });
      queryClient.invalidateQueries({ queryKey: ["purohit_me_profile"] });
      toast.success(
        booking.status === "awaiting_payment"
          ? "অনুরোধ গৃহীত! ভক্ত ৯০ সেকেন্ডের মধ্যে পেমেন্ট করে রুমে প্রবেশ করবেন।"
          : `পূজা শুরু হচ্ছে — ${booking.puja_duration_minutes} মিনিটের লাইভ রুম খুলছে!`,
      );
      router.push(`/purohit-dashboard/room/${booking.id}`);
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Could not accept puja request");
    },
  });

  const declineMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      return await purohitPortalApi.declineBooking(bookingId, "Purohit is unavailable right now");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purohit_me_active_booking"] });
      queryClient.invalidateQueries({ queryKey: ["purohit_me_bookings"] });
      queryClient.invalidateQueries({ queryKey: ["purohit_me_profile"] });
      toast.info("অনুরোধ প্রত্যাখ্যান করা হয়েছে।");
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Could not decline request");
    },
  });

  const isRinging = Boolean(
    isPurohit &&
      activeBooking &&
      (activeBooking.status === "awaiting_acceptance" || activeBooking.status === "confirmed"),
  );
  useLoopingSound("ring", isRinging);

  const isWaitingPayOutsideRoom = Boolean(
    isPurohit &&
      activeBooking?.status === "awaiting_payment" &&
      !pathname?.includes(`/purohit-dashboard/room/${activeBooking.id}`),
  );

  if (isWaitingPayOutsideRoom && activeBooking) {
    return (
      <div className="fixed bottom-4 right-4 z-50 w-80 rounded-2xl border border-amber-400/50 bg-stone-950/95 p-4 text-white shadow-2xl">
        <div className="flex items-center justify-between text-xs font-bold text-amber-300">
          <span>⏳ ভক্ত পেমেন্ট করছেন...</span>
          <span className="font-mono">{countdownSeconds !== null ? `${countdownSeconds}s` : "90s"}</span>
        </div>
        <p className="mt-1 text-xs text-stone-300 truncate">
          {activeBooking.puja_name} · {activeBooking.sankalpa_name}
        </p>
        <Button
          variant="primary"
          size="sm"
          onClick={() => router.push(`/purohit-dashboard/room/${activeBooking.id}`)}
          className="mt-2.5 w-full bg-emerald-600 hover:bg-emerald-500 text-xs font-bold"
        >
          ওয়েটিং রুমে প্রবেশ করুন &rarr;
        </Button>
      </div>
    );
  }

  if (!isRinging || !activeBooking) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-4 sm:inset-auto sm:right-6 sm:top-6 sm:w-96 animate-in fade-in slide-in-from-top-4">
      <div className="overflow-hidden rounded-2xl border-2 border-amber-500/70 bg-stone-950 text-white shadow-2xl shadow-amber-950/60">
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 px-5 py-4">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-amber-100">
            <span className="flex items-center gap-1.5">
              <Flame className="size-4 animate-bounce text-yellow-200" />
              লাইভ পূজা অনুরোধ!
              {countdownSeconds !== null && (
                <span className="rounded bg-rose-950/70 px-1.5 py-0.5 font-mono text-[10px] text-amber-200">
                  {countdownSeconds}s
                </span>
              )}
            </span>
            <span className="rounded-full bg-black/30 px-2.5 py-0.5 text-[11px] font-extrabold text-white">
              {activeBooking.puja_duration_minutes} মি. • ₹{activeBooking.amount_inr}
            </span>
          </div>

          <h4 className="mt-2 font-serif text-lg font-bold text-white">
            {activeBooking.puja_name}
          </h4>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-amber-100">
            <User className="size-3.5" />
            ভক্ত: <b>{activeBooking.sankalpa_name}</b> • গোত্র: {activeBooking.sankalpa_gotra || "Kashyapa"}
          </p>
        </div>

        <div className="space-y-3 p-4">
          {activeBooking.sankalpa_wish && (
            <p className="rounded-xl border border-stone-800 bg-stone-900/90 p-2.5 text-xs italic text-stone-300">
              <Sparkles className="mr-1 inline size-3 text-amber-400" />
              "{activeBooking.sankalpa_wish}"
            </p>
          )}

          <p className="text-[11px] text-stone-400">
            {activeBooking.status === "awaiting_acceptance"
              ? `গ্রহণ করলে ভক্ত ৯০ সেকেন্ডের মধ্যে পেমেন্ট করে আপনার ${activeBooking.puja_duration_minutes} মিনিটের লাইভ রুমে প্রবেশ করবেন।`
              : `গ্রহণ করলে ${activeBooking.puja_duration_minutes} মিনিটের লাইভ ভিডিও পূজা রুম শুরু হবে।`}
          </p>

          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="flex-1 border-stone-700 bg-stone-900 text-rose-300 hover:bg-rose-950/60 hover:text-rose-200"
              disabled={acceptMutation.isPending || declineMutation.isPending}
              loading={declineMutation.isPending}
              onClick={() => declineMutation.mutate(activeBooking.id)}
            >
              <PhoneOff className="size-4" />
              প্রত্যাখ্যান
            </Button>
            <Button
              variant="primary"
              className="flex-[1.4] bg-emerald-600 font-bold text-white hover:bg-emerald-500 shadow-lg shadow-emerald-600/30"
              disabled={acceptMutation.isPending || declineMutation.isPending}
              loading={acceptMutation.isPending}
              onClick={() => acceptMutation.mutate(activeBooking.id)}
            >
              <Video className="size-4" />
              {activeBooking.status === "awaiting_acceptance" ? "গ্রহণ করুন (Pay অপেক্ষা)" : "গ্রহণ করে রুমে ঢুকুন"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
