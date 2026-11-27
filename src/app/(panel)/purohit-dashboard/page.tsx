"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Coins,
  Flame,
  Phone,
  Play,
  Plus,
  RefreshCw,
  Sparkles,
  Star,
  UploadCloud,
  User,
  Video,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { PanelHeader } from "@/components/layout/panel-shell";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  LoadingBlock,
  Switch,
} from "@/components/ui";
import { purohitPortalApi, type PujaBookingData, type PurohitData, type PurohitPujaItem } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { useRequireAuth } from "@/providers/auth-provider";

export default function PurohitDashboardPage() {
  const router = useRouter();
  const { ready, user } = useRequireAuth({ roles: ["purohit"], signInPath: "/login" });
  const queryClient = useQueryClient();

  // Fetch Purohit Profile (cached for 5 minutes, zero redundant network blocking)
  const { data: profileRes, isLoading: profileLoading } = useQuery({
    queryKey: ["purohit_me_profile"],
    queryFn: async () => {
      const res = await purohitPortalApi.getMyProfile();
      return ((res as any)?.data !== undefined ? (res as any).data : res) as PurohitData;
    },
    enabled: ready,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Fetch Purohit Bookings (cached for 30s, polished polling)
  const {
    data: bookingsRes,
    isLoading: bookingsLoading,
    refetch: refetchBookings,
  } = useQuery({
    queryKey: ["purohit_me_bookings"],
    queryFn: async () => {
      const res = await purohitPortalApi.getMyBookings();
      const list = (res as any)?.data !== undefined ? (res as any).data : res;
      return (Array.isArray(list) ? list : []) as PujaBookingData[];
    },
    enabled: ready,
    staleTime: 30 * 1000,
    refetchInterval: 15_000,
    refetchOnWindowFocus: false,
  });

  const profile = profileRes;
  const bookings = bookingsRes || [];

  // Toggle Availability Mutation
  const availabilityMutation = useMutation({
    mutationFn: async (isOnline: boolean) => {
      const res = await purohitPortalApi.setAvailability(isOnline);
      return ((res as any)?.data !== undefined ? (res as any).data : res) as PurohitData;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(["purohit_me_profile"], updated);
      toast.success(
        updated.is_online
          ? "🟢 আপনি এখন অনলাইন — ভক্তরা আপনাকে পূজার জন্য বুক করতে পারবেন!"
          : "⚪ আপনি এখন অফলাইন — কোনো নতুন বুকিং কল আসবে না।"
      );
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : "Failed to toggle status";
      toast.error(msg);
    },
  });

  // Accept Booking Mutation
  const acceptMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const res = await purohitPortalApi.acceptBooking(bookingId);
      return ((res as any)?.data !== undefined ? (res as any).data : res) as PujaBookingData;
    },
    onSuccess: (booking) => {
      toast.success(`পূজা শুরু হয়েছে — ${booking.puja_duration_minutes} মিনিটের লাইভ রুম চালু হয়েছে!`);
      queryClient.invalidateQueries({ queryKey: ["purohit_me_profile"] });
      queryClient.invalidateQueries({ queryKey: ["purohit_me_active_booking"] });
      refetchBookings();
      router.push(`/purohit-dashboard/room/${booking.id}`);
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Failed to accept puja");
    },
  });

  // Decline Booking Mutation
  const declineMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      return await purohitPortalApi.declineBooking(bookingId, "Purohit unavailable right now");
    },
    onSuccess: () => {
      toast.info("পূজা অনুরোধ প্রত্যাখ্যান করা হয়েছে এবং ভক্তের টাকা অটো-রিফান্ড হয়েছে।");
      queryClient.invalidateQueries({ queryKey: ["purohit_me_profile"] });
      queryClient.invalidateQueries({ queryKey: ["purohit_me_active_booking"] });
      refetchBookings();
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Failed to decline puja");
    },
  });

  // Complete Booking Mutation
  const completeMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      return await purohitPortalApi.completeBooking(bookingId);
    },
    onSuccess: () => {
      toast.success("পূজা সফলভাবে সম্পন্ন হিসেবে চিহ্নিত করা হয়েছে।");
      queryClient.invalidateQueries({ queryKey: ["purohit_me_profile"] });
      queryClient.invalidateQueries({ queryKey: ["purohit_me_active_booking"] });
      refetchBookings();
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : "Failed to complete puja";
      toast.error(msg);
    },
  });

  // Avatar Upload Mutation
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const avatarMutation = useMutation({
    mutationFn: async (file: File) => {
      const res = await purohitPortalApi.uploadAvatar(file);
      return (res as any)?.data || res;
    },
    onSuccess: () => {
      toast.success("প্রোফাইল ছবি সফলভাবে আপডেট করা হয়েছে!");
      queryClient.invalidateQueries({ queryKey: ["purohit_me_profile"] });
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : "Failed to update profile image";
      toast.error(msg);
    },
  });

  if (!ready || (profileLoading && !profileRes)) {
    return <LoadingBlock label="Loading Purohit Altar Portal..." />;
  }

  const isOnline = profile?.is_online ?? false;
  const isBusy = profile?.is_busy ?? false;
  const allPujas = profile?.pujas || [];
  const activePujas = allPujas.filter((p: PurohitPujaItem) => p.is_active);
  const pendingOrConfirmed = bookings.filter(
    (b: PujaBookingData) =>
      b.status === "awaiting_acceptance" ||
      b.status === "awaiting_payment" ||
      b.status === "confirmed" ||
      b.status === "in_progress",
  );
  const completedBookings = bookings.filter((b: PujaBookingData) => b.status === "completed");
  const completedCount = profile?.total_pujas_performed ?? completedBookings.length;
  const uniqueDevotees = new Set(
    bookings.filter((b) => b.status === "completed" || b.status === "confirmed" || b.status === "in_progress").map((b) => b.user_id)
  ).size;
  const totalDakshina = completedBookings.reduce((sum, b) => sum + (b.amount_inr || 0), 0);
  const hasRating = Boolean(profile?.rating && profile.rating > 0 && completedCount > 0);

  return (
    <div className="space-y-6">
      <PanelHeader
        title={`নমস্কার, ${profile?.display_name || user?.first_name}`}
        description={`লাইভ অন-ডিমান্ড পুরোহিত পোর্টাল — ড্যাশবোর্ড খোলা থাকলেই আপনি অনলাইন ও পূজার জন্য প্রস্তুত`}
        action={
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/jpg"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) avatarMutation.mutate(file);
              }}
            />
            <Button
              variant="outline"
              size="sm"
              loading={avatarMutation.isPending}
              onClick={() => fileInputRef.current?.click()}
              className="font-bold text-xs bg-white dark:bg-stone-900 hover:bg-amber-50 hover:text-amber-700"
            >
              <UploadCloud className="size-4 mr-1.5 text-amber-600" />
              Update Avatar
            </Button>
            <Link href="/purohit-dashboard/pujas">
              <Button variant="outline" size="sm" className="font-bold text-xs">
                <BookOpen className="size-4 mr-1.5" />
                Manage Puja Catalog ({activePujas.length})
              </Button>
            </Link>
          </div>
        }
      />

      {/* ------------------------------------------------------------- */}
      {/* 1. HERO AVAILABILITY TOGGLE CARD (THE CORE REQUIREMENT)       */}
      {/* ------------------------------------------------------------- */}
      <Card
        className={`border-2 transition-all overflow-hidden ${
          isOnline
            ? "border-emerald-500 bg-gradient-to-r from-emerald-50 via-teal-50 to-white dark:from-emerald-950/40 dark:via-teal-950/20 dark:to-stone-900"
            : "border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-900/40"
        }`}
      >
        <CardBody className="p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className={`relative size-14 rounded-2xl flex items-center justify-center shrink-0 border overflow-hidden ${
                isOnline
                  ? "border-emerald-400 shadow-lg shadow-emerald-500/20 bg-emerald-500"
                  : "border-stone-300 dark:border-stone-700 bg-stone-200 dark:bg-stone-800"
              }`}
            >
              {profile?.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={profile.display_name}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <Flame className={`size-7 ${isOnline ? "text-white animate-pulse" : "text-stone-500"}`} />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`size-2.5 rounded-full ${
                    isBusy ? "bg-amber-500 animate-pulse" : isOnline ? "bg-emerald-500 animate-ping" : "bg-stone-400"
                  }`}
                />
                <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-white">
                  {isBusy
                    ? "🟡 আপনি এখন একটি লাইভ পূজায় ব্যস্ত আছেন"
                    : isOnline
                    ? "🟢 আপনি এখন অনলাইন (লাইভ পূজার জন্য উপলব্ধ)"
                    : "⚪ আপনি এখন অফলাইন"}
                </h3>
              </div>
              <p className="text-xs text-stone-600 dark:text-stone-300 mt-1">
                {isBusy
                  ? "চলমান পূজা চলাকালীন নতুন সার্চ রেজাল্টে আপনাকে দেখানো হবে না। পূজা শেষ হলেই আপনি আবার অটোমেটিক উপলব্ধ হবেন।"
                  : isOnline
                  ? "ভক্তরা এখন সার্চ করলে আপনার ক্যাটালগের পূজা দেখতে পাবেন এবং সাথে সাথে বুক করে লাইভ ভিডিও রুমে যুক্ত হবেন। ওয়েবসাইট বন্ধ বা লগআউট করলে আপনি নিজে থেকেই অফলাইন হয়ে যাবেন।"
                  : "টগলটি চালু করুন যাতে ভক্তরা আপনাকে অনলাইন দেখতে পান এবং তাৎক্ষণিক লাইভ পূজা বুক করতে পারেন।"}
              </p>

              {isBusy && profile?.busy_booking_id && (
                <div className="pt-2">
                  <Link href={`/purohit-dashboard/room/${profile.busy_booking_id}`}>
                    <Button variant="primary" size="sm" className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold">
                      <Video className="size-3.5 mr-1.5" />
                      চলমান লাইভ পূজা রুমে ফিরে যান &rarr;
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-center">
            <span className="text-xs font-bold text-stone-700 dark:text-stone-300">
              {isOnline ? "Online" : "Offline"}
            </span>
            <Switch
              checked={isOnline}
              disabled={availabilityMutation.isPending}
              onChange={(checked: boolean) => availabilityMutation.mutate(checked)}
            />
          </div>
        </CardBody>
      </Card>

      {/* ------------------------------------------------------------- */}
      {/* 2. STATS & PRICE CATALOG OVERVIEW                             */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Puja Catalog */}
        <Card className="border border-stone-200 dark:border-stone-800">
          <CardBody className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-xl bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
              <BookOpen className="size-5" />
            </div>
            <div className="min-w-0">
              <span className="text-xs text-stone-500 font-medium truncate block">
                Active Puja Catalog
              </span>
              <div className="text-xl font-bold text-stone-900 dark:text-white">
                {activePujas.length} {activePujas.length === 1 ? "Puja" : "Pujas"} Listed
              </div>
              <span className="text-[10px] text-stone-400">
                {allPujas.length > activePujas.length
                  ? `${allPujas.length - activePujas.length} inactive in catalog`
                  : allPujas.length === 0
                  ? "No pujas created yet"
                  : "All offerings active"}
              </span>
            </div>
          </CardBody>
        </Card>

        {/* Card 2: Total Completed Pujas */}
        <Card className="border border-stone-200 dark:border-stone-800">
          <CardBody className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <CalendarDays className="size-5" />
            </div>
            <div className="min-w-0">
              <span className="text-xs text-stone-500 font-medium truncate block">
                Total Pujas Conducted
              </span>
              <div className="text-xl font-bold text-stone-900 dark:text-white">
                {completedCount} {completedCount === 1 ? "Puja" : "Pujas"}
              </div>
              <span className="text-[10px] text-stone-400">
                {completedCount > 0 ? `${uniqueDevotees} unique devotees served` : "No completed pujas yet"}
              </span>
            </div>
          </CardBody>
        </Card>

        {/* Card 3: Total Dakshina Received */}
        <Card className="border border-stone-200 dark:border-stone-800">
          <CardBody className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Coins className="size-5" />
            </div>
            <div className="min-w-0">
              <span className="text-xs text-stone-500 font-medium truncate block">
                Total Dakshina Received
              </span>
              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                ₹{totalDakshina.toLocaleString("en-IN")}
              </div>
              <span className="text-[10px] text-stone-400">
                {completedCount > 0 ? "From completed bookings" : "Awaiting first completed puja"}
              </span>
            </div>
          </CardBody>
        </Card>

        {/* Card 4: Devotee Rating */}
        <Card className="border border-stone-200 dark:border-stone-800">
          <CardBody className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Star className="size-5 fill-amber-500/20" />
            </div>
            <div className="min-w-0">
              <span className="text-xs text-stone-500 font-medium truncate block">
                Devotee Rating
              </span>
              <div className="text-xl font-bold text-stone-900 dark:text-white flex items-center gap-1.5">
                {hasRating ? (
                  <>
                    <span>{profile?.rating?.toFixed(1)}</span>
                    <span className="text-amber-500 text-sm">★</span>
                  </>
                ) : (
                  <span className="text-sm font-semibold text-stone-500 dark:text-stone-400">
                    New Purohit
                  </span>
                )}
              </div>
              <span className="text-[10px] text-stone-400">
                {hasRating ? "Based on devotee reviews" : "No ratings yet"}
              </span>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. LIVE INCOMING BOOKINGS FOR PUROHIT                         */}
      {/* ------------------------------------------------------------- */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-stone-900 dark:text-white flex items-center gap-2">
              <Flame className="size-5 text-amber-600" />
              <span>Live & Active Puja Bookings ({pendingOrConfirmed.length})</span>
            </h3>
            {pendingOrConfirmed.length > 0 && (
              <span className="flex size-2">
                <span className="animate-ping absolute inline-flex size-2 rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetchBookings()}
            loading={bookingsLoading}
            className="text-xs text-stone-500"
          >
            <RefreshCw className="size-3.5 mr-1" />
            Refresh
          </Button>
        </div>

        {pendingOrConfirmed.length === 0 ? (
          <Card className="border border-dashed border-stone-300 dark:border-stone-700 p-8 text-center">
            <Flame className="size-8 text-stone-400 mx-auto mb-2" />
            <p className="text-sm font-bold text-stone-700 dark:text-stone-300">
              কোনো সক্রিয় পূজা বুকিং এই মুহূর্তে নেই।
            </p>
            <p className="text-xs text-stone-500 mt-1">
              {isOnline
                ? "আপনি অনলাইনে আছেন। কোনো ভক্ত পূজা বুক করলে সাথে সাথে এই তালিকায় প্রদর্শিত হবে।"
                : "উপরে অনলাইন সুইচটি অন করুন যাতে ভক্তরা আপনাকে বুক করতে পারেন।"}
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingOrConfirmed.map((booking: PujaBookingData) => (
              <Card
                key={booking.id}
                className="border-2 border-amber-300 dark:border-amber-800 bg-amber-50/20 dark:bg-amber-950/10 p-5 space-y-4"
              >
                <div className="flex items-start justify-between gap-2 border-b border-amber-200/60 pb-3">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-amber-800 uppercase tracking-wider block">
                      #{booking.booking_number}
                    </span>
                    <h4 className="font-bold text-stone-900 dark:text-white text-base">
                      {booking.puja_name}
                    </h4>
                    <p className="text-xs text-stone-500">
                      Duration: {booking.puja_duration_minutes} mins | Dakshina: ₹{booking.amount_inr}
                    </p>
                  </div>
                  <Badge
                    tone="neutral"
                    className={
                      booking.payment_status === "paid"
                        ? "bg-emerald-100 text-emerald-900 border-emerald-300 font-bold"
                        : "bg-amber-100 text-amber-900 border-amber-300 font-bold"
                    }
                  >
                    {booking.payment_status === "paid"
                      ? `PAID (₹${booking.amount_inr})`
                      : booking.status === "awaiting_payment"
                      ? `PAYMENT PENDING (₹${booking.amount_inr})`
                      : `NEW REQUEST (₹${booking.amount_inr})`}
                  </Badge>
                </div>

                {/* Devotee Vedic Sankalpa Information */}
                <div className="p-3 rounded-xl bg-white dark:bg-stone-900 border border-amber-200/80 text-xs space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-stone-900 dark:text-white">
                    <User className="size-3.5 text-amber-600" />
                    <span>ভক্তের নাম: {booking.sankalpa_name}</span>
                  </div>
                  <p className="text-stone-600 dark:text-stone-300">
                    <b>গোত্র (Gotra):</b> {booking.sankalpa_gotra}
                  </p>
                  {booking.sankalpa_wish && (
                    <p className="text-stone-600 dark:text-stone-300">
                      <b>বিশেষ মনস্কামনা:</b> {booking.sankalpa_wish}
                    </p>
                  )}
                  {booking.user_phone && (
                    <p className="text-stone-500 text-[11px] flex items-center gap-1 pt-1">
                      <Phone className="size-3" />
                      <span>{booking.user_phone}</span>
                    </p>
                  )}
                </div>

                {/* Action: Accept/Decline or Join Video Room */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  {booking.status === "confirmed" || booking.status === "awaiting_acceptance" ? (
                    <>
                      <Button
                        variant="primary"
                        size="sm"
                        loading={acceptMutation.isPending}
                        onClick={() => acceptMutation.mutate(booking.id)}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20"
                      >
                        <Video className="size-4 mr-1.5" />
                        {booking.status === "awaiting_acceptance"
                          ? "গ্রহণ করুন (Pay অপেক্ষা)"
                          : "গ্রহণ করে লাইভ রুম চালু করুন"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        loading={declineMutation.isPending}
                        onClick={() => declineMutation.mutate(booking.id)}
                        className="text-xs font-bold text-rose-600 border-rose-300 hover:bg-rose-50"
                      >
                        প্রত্যাখ্যান
                      </Button>
                    </>
                  ) : booking.status === "awaiting_payment" ? (
                    <Link href={`/purohit-dashboard/room/${booking.id}`} className="flex-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-amber-400 text-amber-800 hover:bg-amber-50 font-bold text-xs"
                      >
                        ⏳ ভক্ত পেমেন্ট করছেন... ওয়েটিং রুমে যান &rarr;
                      </Button>
                    </Link>
                  ) : (
                    <>
                      <Link href={`/purohit-dashboard/room/${booking.id}`} className="flex-1">
                        <Button
                          variant="primary"
                          size="sm"
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20"
                        >
                          <Video className="size-4 mr-1.5" />
                          পূজার ভিডিও রুমে জয়েন করুন &rarr;
                        </Button>
                      </Link>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (confirm("Are you sure this puja session is complete?")) {
                            completeMutation.mutate(booking.id);
                          }
                        }}
                        loading={completeMutation.isPending}
                        className="text-xs font-bold"
                      >
                        <CheckCircle2 className="size-3.5 mr-1 text-emerald-600" />
                        সম্পন্ন
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. EARNINGS & PUJA CATALOG QUICK ACTIONS                      */}
      {/* ------------------------------------------------------------- */}
      <Card className="border border-emerald-200/80 bg-emerald-50/40 dark:bg-emerald-950/20">
        <CardBody className="p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="font-bold text-sm text-stone-900 dark:text-white flex items-center gap-2">
              <Coins className="size-4 text-emerald-600" />
              <span>দক্ষিণা আয় ও ব্যাংক পেআউট ডেস্ক (Earnings &amp; Payouts)</span>
            </h4>
            <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5">
              সম্পন্ন পূজার মোট দক্ষিণা, ব্যাংক অ্যাকাউন্ট / UPI QR আপডেট এবং পেআউট রিকোয়েস্ট পরিচালনা করুন।
            </p>
          </div>
          <Link href="/earnings">
            <Button variant="primary" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs">
              আয় ও পেআউট দেখুন →
            </Button>
          </Link>
        </CardBody>
      </Card>

      <Card className="border border-stone-200 dark:border-stone-800">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <BookOpen className="size-4 text-amber-600" />
              <span>আপনার ব্যক্তিগত পূজা ও দক্ষিণা ক্যাটালগ (Price Catalog)</span>
            </CardTitle>
            <p className="text-xs text-stone-500 mt-0.5">
              আপনি নিজে নতুন পূজা তৈরি করতে পারেন এবং যে কোনো পূজার দক্ষিণা (Price) নিজের ইচ্ছামতো পরিবর্তন করতে পারেন।
            </p>
          </div>
          <Link href="/purohit-dashboard/pujas">
            <Button variant="primary" size="sm" className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs">
              <Plus className="size-3.5 mr-1" />
              নতুন পুজো যোগ করুন
            </Button>
          </Link>
        </CardHeader>
        <CardBody className="p-4">
          {allPujas.length === 0 ? (
            <div className="text-center py-8 px-4 border border-dashed border-stone-200 dark:border-stone-800 rounded-xl">
              <BookOpen className="size-8 text-stone-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                আপনার ক্যাটালগে এখনো কোনো পূজা যুক্ত করা হয়নি।
              </p>
              <p className="text-[11px] text-stone-500 mt-1 max-w-sm mx-auto">
                ভক্তরা যাতে আপনাকে বিভিন্ন পূজার জন্য অনলাইনে বুক করতে পারেন, নিচের বাটনে ক্লিক করে পূজা ও দক্ষিণা যুক্ত করুন।
              </p>
              <Link href="/purohit-dashboard/pujas">
                <Button variant="outline" size="sm" className="mt-3 text-xs font-bold text-amber-700 hover:bg-amber-50">
                  <Plus className="size-3.5 mr-1" />
                  নতুন পূজা যুক্ত করুন
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {allPujas.map((puja: PurohitPujaItem) => (
                <div
                  key={puja.id}
                  className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/30 flex items-center justify-between"
                >
                  <div className="min-w-0 pr-2">
                    <h5 className="font-bold text-xs text-stone-900 dark:text-white truncate">
                      {puja.puja_name}
                    </h5>
                    <span className="text-[11px] text-stone-500">
                      {puja.duration_minutes} mins {puja.is_active ? "" : "• (Inactive)"}
                    </span>
                  </div>
                  <Badge tone="neutral" className="font-bold text-xs bg-emerald-100 text-emerald-900 border-emerald-300 shrink-0">
                    ₹{puja.price_inr}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
