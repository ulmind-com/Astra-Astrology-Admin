"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Flame, Sparkles, User } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { CallRoom } from "@/components/call/call-room";
import { Badge, Button, LoadingBlock } from "@/components/ui";
import { purohitPortalApi, type PujaBookingData } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { useRequireAuth } from "@/providers/auth-provider";

export default function PurohitPujaRoomPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const router = useRouter();
  const { ready, user } = useRequireAuth({ roles: ["purohit", "admin", "super_admin"], signInPath: "/login" });

  const { data: res, isLoading, error } = useQuery({
    queryKey: ["puja_room_token", bookingId],
    queryFn: async () => {
      const resp = await purohitPortalApi.getRoomToken(bookingId);
      return resp.data;
    },
    enabled: ready && !!bookingId,
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      return await purohitPortalApi.completeBooking(bookingId);
    },
    onSuccess: () => {
      toast.success("পূজা সফলভাবে সম্পন্ন হয়েছে। আশীর্বাদ সর্বত্র বর্ষিত হোক!");
      router.push("/purohit-dashboard/bookings");
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : "Failed to complete puja";
      toast.error(msg);
    },
  });

  const booking = res;

  if (!ready || isLoading) {
    return <LoadingBlock label="বৈদিক পূজা ভিডিও রুমে সংযুক্ত করা হচ্ছে..." />;
  }

  if (error || !booking || !booking.zego_token) {
    return (
      <div className="p-8 text-center space-y-4 max-w-md mx-auto">
        <div className="size-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
          <Flame className="size-6" />
        </div>
        <h3 className="text-base font-bold text-stone-900 dark:text-white">রুম ওপেন করা যায়নি</h3>
        <p className="text-xs text-stone-500">
          রুমের টোকেন মেয়াদোত্তীর্ণ বা সংযোগে সমস্যা হয়েছে। দয়া করে ড্যাশবোর্ডে ফিরে যান।
        </p>
        <Link href="/purohit-dashboard">
          <Button variant="outline" size="sm">
            ড্যাশবোর্ডে ফিরুন
          </Button>
        </Link>
      </div>
    );
  }

  const credentials = {
    app_id: booking.zego_app_id || 1318055627, // Default fallback if not set
    token: booking.zego_token,
    room_id: booking.room_id,
    user_id: user?.id || "purohit",
    user_name: user?.first_name ? `Purohit ${user.first_name}` : "Purohit Ji",
  };

  return (
    <div className="space-y-4">
      {/* Top Bar with Devotee Sankalpa Prompt */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900">
        <div className="flex items-center gap-3">
          <Link href="/purohit-dashboard">
            <Button variant="outline" size="sm" className="p-2">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>

          <div>
            <div className="flex items-center gap-2">
              <Flame className="size-4 text-amber-600" />
              <h3 className="font-bold text-sm text-stone-900 dark:text-white">
                {booking.puja_name}
              </h3>
              <Badge tone="neutral" className="text-[10px] font-bold bg-emerald-100 text-emerald-900 border-emerald-300">
                LIVE
              </Badge>
            </div>
            <p className="text-xs text-stone-600 dark:text-stone-300">
              Devotee: <b>{booking.sankalpa_name}</b> | Gotra: <b>{booking.sankalpa_gotra}</b>
              {booking.sankalpa_wish && ` | Wish: "${booking.sankalpa_wish}"`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              if (confirm("Are you sure this puja session is complete?")) {
                completeMutation.mutate();
              }
            }}
            loading={completeMutation.isPending}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
          >
            <CheckCircle2 className="size-3.5 mr-1" />
            Mark Puja Completed
          </Button>
        </div>
      </div>

      {/* Video Call Room Area */}
      <div className="relative h-[72vh] w-full rounded-2xl overflow-hidden bg-stone-950 border border-stone-800 shadow-xl">
        <CallRoom
          credentials={credentials}
          onLeave={() => router.push("/purohit-dashboard")}
          className="absolute inset-0 size-full"
        />

        {/* Floating Sankalpa Teleprompter Pill at Bottom Left */}
        <div className="absolute bottom-4 left-4 z-20 max-w-sm rounded-xl bg-black/80 backdrop-blur-md p-3 text-white border border-amber-500/40 shadow-lg pointer-events-none">
          <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs uppercase tracking-wider mb-1">
            <Sparkles className="size-3" />
            <span>Vedic Sankalpa Prompt</span>
          </div>
          <p className="text-xs font-semibold">
            সংকল্প কর্তা: <span className="text-amber-200 font-bold">{booking.sankalpa_name}</span>
          </p>
          <p className="text-[11px] text-stone-300">
            গোত্র: <span className="text-white font-medium">{booking.sankalpa_gotra}</span>
          </p>
          {booking.sankalpa_wish && (
            <p className="text-[11px] text-stone-300 mt-0.5 italic">
              মনস্কামনা: "{booking.sankalpa_wish}"
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
