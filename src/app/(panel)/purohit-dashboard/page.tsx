"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Flame,
  Phone,
  Play,
  Plus,
  RefreshCw,
  Sparkles,
  Star,
  User,
  Video,
} from "lucide-react";
import Link from "next/link";
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
  const { ready, user } = useRequireAuth({ roles: ["purohit"], signInPath: "/login" });
  const queryClient = useQueryClient();

  // Fetch Purohit Profile
  const { data: profileRes, isLoading: profileLoading } = useQuery({
    queryKey: ["purohit_me_profile"],
    queryFn: async () => {
      const res = await purohitPortalApi.getMyProfile();
      return res.data;
    },
    enabled: ready,
  });

  // Fetch Purohit Bookings
  const {
    data: bookingsRes,
    isLoading: bookingsLoading,
    refetch: refetchBookings,
  } = useQuery({
    queryKey: ["purohit_me_bookings"],
    queryFn: async () => {
      const res = await purohitPortalApi.getMyBookings();
      return res.data;
    },
    enabled: ready,
    refetchInterval: 8000, // Poll every 8s for live incoming bookings
  });

  const profile = profileRes;
  const bookings = bookingsRes || [];

  // Toggle Availability Mutation
  const availabilityMutation = useMutation({
    mutationFn: async (isOnline: boolean) => {
      const res = await purohitPortalApi.setAvailability(isOnline);
      return res.data;
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

  // Complete Booking Mutation
  const completeMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      return await purohitPortalApi.completeBooking(bookingId);
    },
    onSuccess: () => {
      toast.success("পূজা সফলভাবে সম্পন্ন হিসেবে চিহ্নিত করা হয়েছে।");
      refetchBookings();
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : "Failed to complete puja";
      toast.error(msg);
    },
  });

  if (!ready || profileLoading) {
    return <LoadingBlock label="Loading Purohit Altar Portal..." />;
  }

  const isOnline = profile?.is_online ?? false;
  const activePujas = profile?.pujas?.filter((p: PurohitPujaItem) => p.is_active) || [];
  const pendingOrConfirmed = bookings.filter((b: PujaBookingData) => b.status === "confirmed" || b.status === "in_progress");

  return (
    <div className="space-y-6">
      <PanelHeader
        title={`নমস্কার, ${profile?.display_name || user?.first_name}`}
        description={`পবিত্র বৈদিক পুরোহিত ড্যাশবোর্ড — ${profile?.title || "Vedic Acharya"}`}
        action={
          <Link href="/purohit-dashboard/pujas">
            <Button variant="outline" size="sm" className="font-bold">
              <BookOpen className="size-4 mr-1.5" />
              Manage Puja Catalog ({activePujas.length})
            </Button>
          </Link>
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
              className={`size-14 rounded-2xl flex items-center justify-center shrink-0 border ${
                isOnline
                  ? "bg-emerald-500 text-white border-emerald-400 shadow-lg shadow-emerald-500/20"
                  : "bg-stone-200 text-stone-500 border-stone-300 dark:bg-stone-800"
              }`}
            >
              <Flame className={`size-7 ${isOnline ? "animate-pulse" : ""}`} />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`size-2.5 rounded-full ${
                    isOnline ? "bg-emerald-500 animate-ping" : "bg-stone-400"
                  }`}
                />
                <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-white">
                  {isOnline
                    ? "🟢 আপনি এখন অনলাইন (পূজার জন্য উপলব্ধ)"
                    : "⚪ আপনি এখন অফলাইন"}
                </h3>
              </div>
              <p className="text-xs text-stone-600 dark:text-stone-300 mt-1">
                {isOnline
                  ? "ভক্তরা আপনাকে সরাসরি অনলাইন দেখতে পাচ্ছেন এবং আপনার ক্যাটালগ থেকে যে কোনো পূজা বুক করতে পারেন।"
                  : "টগলটি চালু করুন যাতে ভক্তরা আপনাকে অনলাইন দেখতে পান এবং তাৎক্ষণিক পূজা বুক করতে পারেন।"}
              </p>
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border border-stone-200 dark:border-stone-800">
          <CardBody className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <BookOpen className="size-5" />
            </div>
            <div>
              <span className="text-xs text-stone-500 font-medium">My Active Puja Catalog</span>
              <div className="text-xl font-bold text-stone-900 dark:text-white">
                {activePujas.length} Pujas Listed
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="border border-stone-200 dark:border-stone-800">
          <CardBody className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
              <CalendarDays className="size-5" />
            </div>
            <div>
              <span className="text-xs text-stone-500 font-medium">Total Pujas Conducted</span>
              <div className="text-xl font-bold text-stone-900 dark:text-white">
                {profile?.total_pujas_performed || 0} Devotees
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="border border-stone-200 dark:border-stone-800">
          <CardBody className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <Star className="size-5 text-emerald-600" />
            </div>
            <div>
              <span className="text-xs text-stone-500 font-medium">Devotee Rating</span>
              <div className="text-xl font-bold text-stone-900 dark:text-white">
                {profile?.rating?.toFixed(1) || "5.0"} ★★★★★
              </div>
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
                  <Badge tone="neutral" className="bg-emerald-100 text-emerald-900 border-emerald-300 font-bold">
                    PAID (₹{booking.amount_inr})
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

                {/* Action: Join Video Room */}
                <div className="flex items-center justify-between gap-2 pt-1">
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
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. PUJA CATALOG PREVIEW & QUICK ACTIONS                       */}
      {/* ------------------------------------------------------------- */}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {profile?.pujas?.map((puja: PurohitPujaItem) => (
              <div
                key={puja.id}
                className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/30 flex items-center justify-between"
              >
                <div>
                  <h5 className="font-bold text-xs text-stone-900 dark:text-white truncate max-w-[200px]">
                    {puja.puja_name}
                  </h5>
                  <span className="text-[11px] text-stone-500">{puja.duration_minutes} mins</span>
                </div>
                <Badge tone="neutral" className="font-bold text-xs bg-emerald-100 text-emerald-900 border-emerald-300">
                  ₹{puja.price_inr}
                </Badge>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
