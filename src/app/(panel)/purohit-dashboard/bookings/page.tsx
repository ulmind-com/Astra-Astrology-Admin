"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Flame,
  Phone,
  RefreshCw,
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
  LoadingBlock,
} from "@/components/ui";
import { purohitPortalApi, type PujaBookingData } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { useRequireAuth } from "@/providers/auth-provider";

export default function PurohitBookingsPage() {
  const { ready } = useRequireAuth({ roles: ["purohit"], signInPath: "/login" });
  const queryClient = useQueryClient();

  const [filter, setFilter] = React.useState<"all" | "active" | "completed">("all");

  const { data: bookings = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["purohit_me_bookings"],
    queryFn: async () => {
      const res = await purohitPortalApi.getMyBookings();
      return res.data;
    },
    enabled: ready,
    refetchInterval: 10000,
  });

  const completeMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      return await purohitPortalApi.completeBooking(bookingId);
    },
    onSuccess: () => {
      toast.success("পূজা সম্পন্ন হিসেবে চিহ্নিত করা হয়েছে।");
      queryClient.invalidateQueries({ queryKey: ["purohit_me_bookings"] });
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : "Failed to complete puja";
      toast.error(msg);
    },
  });

  const filteredBookings = React.useMemo(() => {
    if (filter === "active") {
      return bookings.filter((b: PujaBookingData) => b.status === "confirmed" || b.status === "in_progress");
    }
    if (filter === "completed") {
      return bookings.filter((b: PujaBookingData) => b.status === "completed");
    }
    return bookings;
  }, [bookings, filter]);

  if (!ready || isLoading) {
    return <LoadingBlock label="Loading your Puja Bookings..." />;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PanelHeader
        title="ভক্তদের পূজা বুকিং রেকর্ড (Puja Bookings History)"
        description="আপনার অধীনে বুক করা সমস্ত লাইভ পূজার তালিকা, ভক্তের সংকল্প তথ্য ও ভিডিও রুমে প্রবেশের সুবিধা।"
        action={
          <div className="flex items-center gap-2">
            <Link href="/purohit-dashboard">
              <Button variant="outline" size="sm">
                <ArrowLeft className="size-4 mr-1.5" />
                Back to Dashboard
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              loading={isFetching}
            >
              <RefreshCw className="size-3.5 mr-1" />
              Refresh
            </Button>
          </div>
        }
      />

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 dark:border-stone-800 pb-2">
        {[
          { id: "all", label: `All Bookings (${bookings.length})` },
          { id: "active", label: `Active / Live Now (${bookings.filter((b: PujaBookingData) => b.status === "confirmed" || b.status === "in_progress").length})` },
          { id: "completed", label: `Completed (${bookings.filter((b: PujaBookingData) => b.status === "completed").length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id as any)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filter === tab.id
                ? "bg-amber-600 text-white shadow-xs"
                : "text-stone-600 hover:text-stone-900 hover:bg-stone-100 dark:text-stone-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filteredBookings.length === 0 ? (
        <Card className="border border-dashed border-stone-300 dark:border-stone-700 p-8 text-center">
          <Calendar className="size-8 text-stone-400 mx-auto mb-2" />
          <p className="text-sm font-bold text-stone-700 dark:text-stone-300">কোনো বুকিং পাওয়া যায়নি।</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((b: PujaBookingData) => (
            <Card
              key={b.id}
              className="border border-stone-200 dark:border-stone-800 p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold text-amber-800">#{b.booking_number}</span>
                  <span className="text-xs text-stone-400">•</span>
                  <span className="text-xs text-stone-500">{new Date(b.created_at).toLocaleString("en-IN")}</span>
                  <Badge
                    tone="neutral"
                    className="text-[10px] font-bold"
                  >
                    {b.status.toUpperCase()}
                  </Badge>
                </div>

                <h4 className="font-bold text-stone-900 dark:text-white text-base">
                  {b.puja_name}
                </h4>

                <div className="flex flex-wrap items-center gap-4 text-xs text-stone-600 dark:text-stone-300">
                  <span className="flex items-center gap-1">
                    <User className="size-3.5 text-amber-600" />
                    <b>ভক্ত:</b> {b.sankalpa_name}
                  </span>
                  <span><b>গোত্র:</b> {b.sankalpa_gotra}</span>
                  {b.user_phone && (
                    <span className="flex items-center gap-1 text-stone-500">
                      <Phone className="size-3" /> {b.user_phone}
                    </span>
                  )}
                  <span className="font-bold text-emerald-600">Dakshina: ₹{b.amount_inr}</span>
                </div>

                {b.sankalpa_wish && (
                  <p className="text-xs text-stone-500 italic">
                    "মনস্কামনা: {b.sankalpa_wish}"
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
                {b.status !== "completed" && (
                  <>
                    <Link href={`/purohit-dashboard/room/${b.id}`} className="flex-1 md:flex-initial">
                      <Button
                        variant="primary"
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 w-full"
                      >
                        <Video className="size-4 mr-1.5" />
                        ভিডিও রুমে ঢুকুন
                      </Button>
                    </Link>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (confirm("Mark this puja as completed?")) {
                          completeMutation.mutate(b.id);
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

                {b.status === "completed" && (
                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="size-4" /> পূজা সম্পন্ন হয়েছে
                  </span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
