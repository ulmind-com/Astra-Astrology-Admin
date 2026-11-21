"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Flame,
  Info,
  Moon,
  RefreshCw,
  Save,
  Sparkles,
  Sun,
  Sunrise,
  Sunset,
  X,
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
import { purohitPortalApi, type PurohitData } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { useRequireAuth } from "@/providers/auth-provider";

// Weekly Days Definition
const DAYS_OF_WEEK = [
  { key: "monday", label: "সোমবার (Monday)", deity: "শিব অর্চনা ও রুদ্রাভিষেক" },
  { key: "tuesday", label: "মঙ্গলবার (Tuesday)", deity: "শ্রী হনুমান ও মঙ্গল শান্তি" },
  { key: "wednesday", label: "বুধবার (Wednesday)", deity: "শ্রী গণেশ বিঘ্নহর্তা পূজা" },
  { key: "thursday", label: "বৃহস্পতিবার (Thursday)", deity: "সত্যনারায়ণ কথা ও বিষ্ণু পূজা" },
  { key: "friday", label: "শুক্রবার (Friday)", deity: "শ্রী মহালক্ষ্মী ও বৈভব সংকল্প" },
  { key: "saturday", label: "শনিবার (Saturday)", deity: "শনি শান্তি ও মহামৃত্যুঞ্জয় জপ" },
  { key: "sunday", label: "রবিবার (Sunday)", deity: "শ্রী সূর্য দেব ও সর্বকার্য সিদ্ধি" },
];

// Sacred Auspicious Muhurats / Timing Blocks
const AUSPICIOUS_SLOTS = [
  {
    key: "brahma_muhurat",
    title: "ব্রাহ্ম মুহূর্ত ও প্রাতঃকাল (Brahma Muhurat)",
    timeRange: "04:30 AM – 06:30 AM",
    description: "পরম পবিত্র মুহূর্ত — ধ্যান, মহামৃত্যুঞ্জয় জপ ও রুদ্রাভিষেক মহাযজ্ঞের জন্য শ্রেষ্ঠ সময়।",
    icon: Sunrise,
    color: "from-amber-500/10 to-orange-500/10 border-amber-300 dark:border-amber-800",
  },
  {
    key: "morning",
    title: "প্রাতঃকালীন শুভ বেলা (Morning Puja)",
    timeRange: "07:00 AM – 11:30 AM",
    description: "গৃহপ্রবেশ, বাস্তু শান্তি, পঞ্চামৃত অভিষেক এবং শ্রী সত্যনারায়ণ ব্রতকথার প্রধান সময়।",
    icon: Sun,
    color: "from-yellow-500/10 to-amber-500/10 border-yellow-300 dark:border-yellow-800",
  },
  {
    key: "afternoon",
    title: "অপরাহ্ন কাল (Afternoon Shanti)",
    timeRange: "02:00 PM – 05:00 PM",
    description: "গ্রহ শান্তি, কালসর্প দোষ নিবারণ এবং বিশেষ বৈদিক সংকল্পের অপরাহ্ন সময়।",
    icon: Clock,
    color: "from-blue-500/10 to-cyan-500/10 border-blue-300 dark:border-blue-800",
  },
  {
    key: "evening",
    title: "সন্ধ্যা আরতি ও প্রদোষ কাল (Evening Aarti)",
    timeRange: "06:00 PM – 09:30 PM",
    description: "শ্রী মহালক্ষ্মী স্তোত্র, প্রদোষ আরতি, হোম সংকল্প ও শান্তিময় নৈবেদ্য নিবেদনের শুভ কাল।",
    icon: Sunset,
    color: "from-purple-500/10 to-indigo-500/10 border-purple-300 dark:border-purple-800",
  },
];

export default function PurohitAvailabilityPage() {
  const { ready } = useRequireAuth({ roles: ["purohit"], signInPath: "/login" });
  const queryClient = useQueryClient();

  // Profile Query
  const { data: profile, isLoading } = useQuery({
    queryKey: ["purohit_me_profile"],
    queryFn: async () => {
      const res = await purohitPortalApi.getMyProfile();
      return ((res as any)?.data !== undefined ? (res as any).data : res) as PurohitData;
    },
    enabled: ready,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Local State
  const [isOnline, setIsOnline] = React.useState<boolean>(false);
  const [selectedDays, setSelectedDays] = React.useState<string[]>([
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ]);
  const [selectedSlots, setSelectedSlots] = React.useState<string[]>([
    "brahma_muhurat",
    "morning",
    "afternoon",
    "evening",
  ]);
  const [weeklySchedule, setWeeklySchedule] = React.useState<Record<string, string[]>>({});
  const [hasChanges, setHasChanges] = React.useState(false);

  // Sync state when profile loads
  React.useEffect(() => {
    if (profile) {
      setIsOnline(profile.is_online ?? false);
      if (profile.available_days && profile.available_days.length > 0) {
        setSelectedDays(profile.available_days);
      }
      if (profile.available_slots && profile.available_slots.length > 0) {
        setSelectedSlots(profile.available_slots);
      }
      if (profile.weekly_schedule) {
        setWeeklySchedule(profile.weekly_schedule);
      }
      setHasChanges(false);
    }
  }, [profile]);

  // Save Availability Mutation
  const saveMutation = useMutation({
    mutationFn: async (payload: {
      is_online: boolean;
      available_days: string[];
      available_slots: string[];
      weekly_schedule: Record<string, string[]>;
    }) => {
      return await purohitPortalApi.setAvailability(payload);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(["purohit_me_profile"], updated);
      setHasChanges(false);
      toast.success("✅ আপনার সাপ্তাহিক লাইভ পূজা উপলব্ধতা ও শুভ মুহূর্ত সংরক্ষিত হয়েছে!");
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : "Failed to save availability";
      toast.error(msg);
    },
  });

  // Toggle Day
  const handleToggleDay = (dayKey: string) => {
    let updated: string[];
    if (selectedDays.includes(dayKey)) {
      if (selectedDays.length === 1) {
        toast.warning("কমপক্ষে একটি দিন নির্বাচিত থাকতে হবে।");
        return;
      }
      updated = selectedDays.filter((d) => d !== dayKey);
    } else {
      updated = [...selectedDays, dayKey];
    }
    setSelectedDays(updated);
    setHasChanges(true);
  };

  // Toggle Slot
  const handleToggleSlot = (slotKey: string) => {
    let updated: string[];
    if (selectedSlots.includes(slotKey)) {
      if (selectedSlots.length === 1) {
        toast.warning("কমপক্ষে একটি শুভ মুহূর্ত নির্বাচিত থাকতে হবে।");
        return;
      }
      updated = selectedSlots.filter((s) => s !== slotKey);
    } else {
      updated = [...selectedSlots, slotKey];
    }
    setSelectedSlots(updated);
    setHasChanges(true);
  };

  // Preset Handlers
  const handleSelectAllDays = () => {
    setSelectedDays(DAYS_OF_WEEK.map((d) => d.key));
    setHasChanges(true);
  };

  const handleSelectWeekdays = () => {
    setSelectedDays(["monday", "tuesday", "wednesday", "thursday", "friday"]);
    setHasChanges(true);
  };

  const handleSelectWeekends = () => {
    setSelectedDays(["saturday", "sunday"]);
    setHasChanges(true);
  };

  const handleSelectAllSlots = () => {
    setSelectedSlots(AUSPICIOUS_SLOTS.map((s) => s.key));
    setHasChanges(true);
  };

  const handleSave = () => {
    saveMutation.mutate({
      is_online: isOnline,
      available_days: selectedDays,
      available_slots: selectedSlots,
      weekly_schedule: weeklySchedule,
    });
  };

  if (!ready || (isLoading && !profile)) {
    return <LoadingBlock label="Loading your Sacred Availability Calendar..." />;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <PanelHeader
        title="পবিত্র বৈদিক সময় ও শুভ মুহূর্ত ব্যবস্থাপনা (Auspicious Slots & Weekly Availability)"
        description="লাইভ ভিডিও পূজার জন্য আপনার সাপ্তাহিক উপলব্ধ দিন ও শুভ মুহূর্ত নির্ধারণ করুন।"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/purohit-dashboard">
              <Button variant="outline" size="sm">
                <ArrowLeft className="size-4 mr-1.5" />
                ড্যাশবোর্ড (Dashboard)
              </Button>
            </Link>

            <Link href="/purohit-dashboard/pujas">
              <Button variant="outline" size="sm" className="border-amber-500/40 text-amber-700 dark:text-amber-300">
                <BookOpen className="size-4 mr-1.5 text-amber-600" />
                পূজা ক্যাটালগ (Puja Catalog)
              </Button>
            </Link>

            <Button
              variant="primary"
              size="sm"
              loading={saveMutation.isPending}
              onClick={handleSave}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-md shadow-amber-600/20"
            >
              <Save className="size-4 mr-1.5" />
              পরিবর্তন সংরক্ষণ করুন (Save)
            </Button>
          </div>
        }
      />

      {/* Critical Domain Clarification Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border border-amber-500/30 text-xs text-stone-800 dark:text-stone-200 flex items-start gap-3.5 shadow-sm">
        <div className="size-8 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
          <Flame className="size-5" />
        </div>
        <div className="space-y-1">
          <p className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-2">
            <span>বৈদিক লাইভ পূজা সময়সূচী — কোনো সাধারণ অ্যাপয়েন্টমেন্ট নয়</span>
            <Badge tone="green" className="text-[10px]">
              Live Vedic Rituals Only
            </Badge>
          </p>
          <p className="leading-relaxed text-stone-600 dark:text-stone-400">
            বৈদিক পুরোহিত ডোমেইন কেবল <b>লাইভ ভিডিও পূজার</b> জন্য নিবেদিত। এটি জ্যোতিষীদের মতো ১-অন-১ কুষ্ঠি বিচার বা চ্যাট অ্যাপয়েন্টমেন্ট নয়। ভক্তরা আপনার নির্বাচিত দিন ও শুভ মুহূর্তের ভিত্তিতে অনলাইনে বুক করবেন এবং ভিডিও সংযোগে সরাসরি আপনার সঙ্গে বৈদিক সংকল্প ও পূজা পরিচালনা করবেন।
          </p>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 1. MASTER LIVE ALTAR ONLINE / OFFLINE TOGGLE                  */}
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
              className={`size-12 rounded-2xl flex items-center justify-center shrink-0 border overflow-hidden ${
                isOnline
                  ? "border-emerald-400 shadow-lg shadow-emerald-500/20 bg-emerald-500 text-white"
                  : "border-stone-300 dark:border-stone-700 bg-stone-200 dark:bg-stone-800 text-stone-500"
              }`}
            >
              <Flame className={`size-6 ${isOnline ? "animate-pulse" : ""}`} />
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
                  ? "ভক্তরা আপনাকে সরাসরি অনলাইন দেখতে পাচ্ছেন এবং আপনার নির্ধারিত মুহূর্তে তাত্ক্ষণিক পূজা বুক করতে পারেন।"
                  : "টগলটি চালু করুন যাতে ভক্তরা আপনাকে অনলাইন দেখতে পান এবং লাইভ ভিডিও পূজার জন্য বুক করতে পারেন।"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-center">
            <span className="text-xs font-bold text-stone-700 dark:text-stone-300">
              {isOnline ? "Online" : "Offline"}
            </span>
            <Switch
              checked={isOnline}
              onChange={(checked: boolean) => {
                setIsOnline(checked);
                setHasChanges(true);
              }}
            />
          </div>
        </CardBody>
      </Card>

      {/* ------------------------------------------------------------- */}
      {/* 2. WEEKLY DAYS SELECTOR (দিন নির্বাচন)                        */}
      {/* ------------------------------------------------------------- */}
      <Card className="border border-stone-200 dark:border-stone-800">
        <CardHeader className="p-5 border-b border-stone-100 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold text-stone-900 dark:text-white flex items-center gap-2">
              <Calendar className="size-4 text-amber-600" />
              <span>সাপ্তাহিক উপলব্ধ দিনসমূহ (Available Days of Week)</span>
            </CardTitle>
            <p className="text-xs text-stone-500 mt-0.5">
              আপনি সপ্তাহের কোন কোন বারে লাইভ পূজা পরিচালনার জন্য ফাঁকা আছেন তা নির্বাচন করুন।
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={handleSelectAllDays}
              className="px-2.5 py-1 rounded-lg border border-stone-300 dark:border-stone-700 text-[11px] font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            >
              সব দিন (All 7 Days)
            </button>
            <button
              type="button"
              onClick={handleSelectWeekdays}
              className="px-2.5 py-1 rounded-lg border border-stone-300 dark:border-stone-700 text-[11px] font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            >
              সোম – শুক্র (Mon-Fri)
            </button>
            <button
              type="button"
              onClick={handleSelectWeekends}
              className="px-2.5 py-1 rounded-lg border border-stone-300 dark:border-stone-700 text-[11px] font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            >
              শনি – রবি (Weekends)
            </button>
          </div>
        </CardHeader>

        <CardBody className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {DAYS_OF_WEEK.map((day) => {
              const active = selectedDays.includes(day.key);
              return (
                <button
                  key={day.key}
                  type="button"
                  onClick={() => handleToggleDay(day.key)}
                  className={`p-3.5 rounded-xl border-2 text-left transition-all flex flex-col justify-between space-y-2 ${
                    active
                      ? "border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 shadow-sm"
                      : "border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/40 opacity-60 hover:opacity-100"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-stone-900 dark:text-white">
                      {day.label}
                    </span>
                    <span
                      className={`size-5 rounded-full flex items-center justify-center text-xs font-bold ${
                        active
                          ? "bg-amber-600 text-white"
                          : "bg-stone-200 dark:bg-stone-700 text-stone-400"
                      }`}
                    >
                      {active ? "✓" : "+"}
                    </span>
                  </div>

                  <span className="text-[11px] text-stone-500 dark:text-stone-400 leading-tight">
                    {day.deity}
                  </span>

                  <div className="pt-1">
                    <Badge
                      tone={active ? "brand" : "neutral"}
                      className="text-[10px]"
                    >
                      {active ? "উপলব্ধ (Active)" : "ছুটি (Off)"}
                    </Badge>
                  </div>
                </button>
              );
            })}
          </div>
        </CardBody>
      </Card>

      {/* ------------------------------------------------------------- */}
      {/* 3. SACRED AUSPICIOUS MUHURATS (শুভ মুহূর্ত ও পূজার বেলা)      */}
      {/* ------------------------------------------------------------- */}
      <Card className="border border-stone-200 dark:border-stone-800">
        <CardHeader className="p-5 border-b border-stone-100 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold text-stone-900 dark:text-white flex items-center gap-2">
              <Sparkles className="size-4 text-amber-600" />
              <span>বৈদিক শুভ মুহূর্ত ও পূজার বেলা (Auspicious Time Slots)</span>
            </CardTitle>
            <p className="text-xs text-stone-500 mt-0.5">
              আপনি কোন কোন শুভ তিথি ও বেলায় ভক্তদের সাথে লাইভ ভিডিও পূজা সম্পন্ন করবেন তা নির্বাচন করুন।
            </p>
          </div>

          <button
            type="button"
            onClick={handleSelectAllSlots}
            className="px-2.5 py-1 rounded-lg border border-stone-300 dark:border-stone-700 text-[11px] font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors self-start sm:self-center"
          >
            সব মুহূর্ত নির্বাচন করুন (All Slots)
          </button>
        </CardHeader>

        <CardBody className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {AUSPICIOUS_SLOTS.map((slot) => {
              const active = selectedSlots.includes(slot.key);
              const IconComp = slot.icon;

              return (
                <div
                  key={slot.key}
                  onClick={() => handleToggleSlot(slot.key)}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between space-y-3 ${
                    active
                      ? `bg-gradient-to-br ${slot.color} shadow-sm border-amber-500`
                      : "border-stone-200 dark:border-stone-800 bg-stone-50/40 dark:bg-stone-900/30 opacity-60 hover:opacity-100"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
                        <IconComp className="size-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-stone-900 dark:text-white">
                          {slot.title}
                        </h4>
                        <span className="font-mono text-xs font-bold text-amber-800 dark:text-amber-400">
                          ⏱️ {slot.timeRange}
                        </span>
                      </div>
                    </div>

                    <Switch
                      checked={active}
                      onChange={() => handleToggleSlot(slot.key)}
                    />
                  </div>

                  <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                    {slot.description}
                  </p>

                  <div className="flex items-center justify-between pt-1 border-t border-stone-200/60 dark:border-stone-800">
                    <span className="text-[11px] text-stone-500">
                      লাইভ পূজার বুকিং গ্রহণ:
                    </span>
                    <Badge
                      tone={active ? "green" : "neutral"}
                      className="text-[10px] font-bold"
                    >
                      {active ? "বুকিং সক্রিয় (Open)" : "বন্ধ (Closed)"}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>

      {/* Bottom Sticky Action Bar */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-lg">
        <div className="flex items-center gap-2">
          {hasChanges ? (
            <span className="flex size-2 rounded-full bg-amber-500 animate-ping" />
          ) : (
            <CheckCircle2 className="size-4 text-emerald-500" />
          )}
          <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">
            {hasChanges
              ? "আপনার পরিবর্তনগুলো এখনো সংরক্ষণ করা হয়নি।"
              : "সব সেটিংস আপ-টু-ডেট রয়েছে।"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/purohit-dashboard">
            <Button variant="outline" size="sm">
              বাতিল (Cancel)
            </Button>
          </Link>

          <Button
            variant="primary"
            size="sm"
            loading={saveMutation.isPending}
            onClick={handleSave}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-md shadow-amber-600/20"
          >
            <Save className="size-4 mr-1.5" />
            সংরক্ষণ করুন (Save Schedule)
          </Button>
        </div>
      </div>
    </div>
  );
}
