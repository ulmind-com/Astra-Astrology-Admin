"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Check,
  Clock,
  Coins,
  Edit2,
  Flame,
  ListChecks,
  Plus,
  Sparkles,
  Tag,
  Trash2,
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
  Field,
  Input,
  LoadingBlock,
  Modal,
  Switch,
} from "@/components/ui";
import { purohitPortalApi, type PurohitPujaItem, type PurohitData } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { useRequireAuth } from "@/providers/auth-provider";

// Pre-configured Sacred Vedic Puja Templates for 1-Click Fast Setup
const VEDIC_PUJA_PRESETS = [
  {
    name: "রুদ্রাভিষেক পূজা ও শিব অর্চনা (Rudrabhishek)",
    description:
      "ভগবান মহাদেবের প্রীতি কামনায় বৈদিক পঞ্চামৃত (দুগ্ধ, দধি, ঘৃত, মধু, শর্করা) দ্বারা রুদ্রসূক্ত ও নমকম-চমকম পাঠ সহকারে বিশেষ রুদ্রাভিষেক মহাযজ্ঞ।",
    duration: 60,
    price: 501,
    samagri: ["গঙ্গাজল", "কাঁচা দুধ", "দই", "খাঁটি ঘি", "মধু", "বাতাসা", "বেলপাতা (১০৮টি)", "ধুতুরা ফুল", "শ্বেত চন্দন", "কর্পূর"],
  },
  {
    name: "শ্রী সত্যনারায়ণ পূজা ও ব্রতকথা (Satyanarayan Katha)",
    description:
      "গৃহস্থে শান্তি, শ্রীবৃদ্ধি ও সাফল্য কামনায় ভগবান শ্রী সত্যনারায়ণের মহাবৈদিক পূজা, শালগ্রাম শিলা অভিষেক এবং পঞ্চ অধ্যায় ব্রতকথা শ্রবণ।",
    duration: 75,
    price: 701,
    samagri: ["শালগ্রাম শিলা/ছবি", "পঞ্চামৃত", "সিরনি নৈবেদ্য", "তুলসীপাতা", "কলাপাতা", "পানের খিলি", "সুপারি", "হরিতকী", "ধূপ-প্রদীপ"],
  },
  {
    name: "গৃহপ্রবেশ ও বাস্তু শান্তি পূজা (Griha Pravesh & Vastu)",
    description:
      "নতুন গৃহে প্রবেশকালে গ্রহদোষ ও বাস্তুদোষ নাশ, নবগ্রহ হোম, বিঘ্নহর্তা গণেশ আহ্বান এবং কুলদেবী-কুলদেবতার আশীর্বাদ কামনায় মহাশান্তি অনুষ্ঠান।",
    duration: 90,
    price: 1100,
    samagri: ["মঙ্গল ঘট", "আম্রপল্লব", "নারিকেল", "পঞ্চশস্য", "যজ্ঞের সমিধ", "ঘি", "হলুদ সুতো", "স্বস্তিক সিঁদুর", "পঞ্চরত্ন"],
  },
  {
    name: "মহামৃত্যুঞ্জয় জপ ও সংকল্প শান্তি (Mahamrityunjaya Japa)",
    description:
      "রোগমুক্তি, আরোগ্য লাভ, দীর্ঘায়ু এবং অকালমৃত্যুর ভয় দূরীকরণে রুদ্রদেবের মহাশক্তিশালী মহামৃত্যুঞ্জয় মন্ত্র জপ ও বিশেষ সংকল্প আরতি।",
    duration: 45,
    price: 551,
    samagri: ["রুদ্রাক্ষ মালা", "গঙ্গাজল", "তিল ও যব", "ঘৃত প্রদীপ", "বেলপাতা", "শ্বেত চন্দন", "সাদা ফুল", "মিষ্টি প্রসাদ"],
  },
  {
    name: "নবগ্রহ শান্তি ও বৈদিক হোম (Navagraha Shanti Homa)",
    description:
      "রাশিতে রবি, চন্দ্র, মঙ্গল, বুধ, বৃহস্পতি, শুক্র, শনি, রাহু ও কেতুর অশুভ প্রভাব প্রশমন এবং জীবনের সর্বক্ষেত্রে উন্নতি কামনায় নবগ্রহ শান্তি।",
    duration: 60,
    price: 801,
    samagri: ["নবগ্রহ সমিধ কাষ্ঠ", "তিল-ঘি", "হবন কুণ্ড/তামার থালা", "নয় রঙের ফুল", "নয়টি সুপারি", "জব", "লোবান", "কর্পূর"],
  },
  {
    name: "শ্রী মহালক্ষ্মী পূজা ও বৈভব সংকল্প (Lakshmi Puja)",
    description:
      "গৃহস্থে অচলা লক্ষ্মীর কৃপা, ধনধান্য লাভ এবং ব্যবসা বা কর্মক্ষেত্রে শ্রীবৃদ্ধি কামনায় শ্রীসূক্ত ও কনকধারা স্তোত্র পাঠ সহকারে মহালক্ষ্মী পূজা।",
    duration: 45,
    price: 501,
    samagri: ["লক্ষ্মী-গণেশ প্রতিমা/ছবি", "পদ্মফুল/গোলাপ", "ধূপ-দীপ", "পঞ্চ ফল", "মিষ্টান্ন নৈবেদ্য", "রৌপ্য/তামার মুদ্রা", "সিঁদুর", "ধনে ও চাল"],
  },
];

const COMMON_SAMAGRI_SUGGESTIONS = [
  "গঙ্গাজল",
  "পঞ্চামৃত",
  "বেলপাতা (১০৮টি)",
  "তুলসীপাতা",
  "খাঁটি ঘি",
  "ঘৃত প্রদীপ",
  "ধূপকাঠি ও কর্পূর",
  "পানের খিলি ও সুপারি",
  "ফলমূল ও মিষ্টি নৈবেদ্য",
  "যজ্ঞের সমিধ ও কাষ্ঠ",
  "তিল ও যব",
  "শ্বেত চন্দন",
  "মঙ্গল ঘট ও আম্রপল্লব",
];

export default function PurohitPujaCatalogPage() {
  const { ready } = useRequireAuth({ roles: ["purohit"], signInPath: "/login" });
  const queryClient = useQueryClient();

  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<PurohitPujaItem | null>(null);

  // Form State
  const [formData, setFormData] = React.useState({
    puja_name: "",
    description: "",
    duration_minutes: 45,
    price_inr: 100,
    samagri_notes: "",
    is_active: true,
  });

  // Samagri Tags State
  const [samagriTags, setSamagriTags] = React.useState<string[]>([]);
  const [newTagInput, setNewTagInput] = React.useState("");

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

  // Add Puja Mutation
  const addMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      return await purohitPortalApi.addPuja(payload);
    },
    onSuccess: () => {
      toast.success("✅ নতুন বৈদিক পূজা সফলভাবে ক্যাটালগে যুক্ত হয়েছে!");
      queryClient.invalidateQueries({ queryKey: ["purohit_me_profile"] });
      setModalOpen(false);
      resetForm();
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : "Failed to add puja";
      toast.error(msg);
    },
  });

  // Edit Puja Mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      return await purohitPortalApi.updatePuja(id, payload);
    },
    onSuccess: () => {
      toast.success("✅ পূজার তথ্য ও দক্ষিণা সফলভাবে আপডেট হয়েছে!");
      queryClient.invalidateQueries({ queryKey: ["purohit_me_profile"] });
      setModalOpen(false);
      resetForm();
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : "Failed to update puja";
      toast.error(msg);
    },
  });

  // Delete Puja Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await purohitPortalApi.deletePuja(id);
    },
    onSuccess: () => {
      toast.success("পূজাটি সফলভাবে ক্যাটালগ থেকে মুছে ফেলা হয়েছে।");
      queryClient.invalidateQueries({ queryKey: ["purohit_me_profile"] });
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : "Failed to delete puja";
      toast.error(msg);
    },
  });

  const resetForm = () => {
    setEditingItem(null);
    setFormData({
      puja_name: "",
      description: "",
      duration_minutes: 45,
      price_inr: 100,
      samagri_notes: "",
      is_active: true,
    });
    setSamagriTags([]);
    setNewTagInput("");
  };

  const handleOpenAdd = () => {
    resetForm();
    setModalOpen(true);
  };

  const handleOpenEdit = (item: PurohitPujaItem) => {
    setEditingItem(item);
    
    // Parse samagri_notes into tags if comma-separated or keep as is
    const notes = item.samagri_notes || "";
    const parsedTags = notes
      ? notes
          .split(/[,;\n]/)
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    setSamagriTags(parsedTags);
    setFormData({
      puja_name: item.puja_name,
      description: item.description || "",
      duration_minutes: item.duration_minutes,
      price_inr: item.price_inr,
      samagri_notes: notes,
      is_active: item.is_active,
    });
    setModalOpen(true);
  };

  const applyPreset = (preset: typeof VEDIC_PUJA_PRESETS[0]) => {
    setFormData((prev) => ({
      ...prev,
      puja_name: preset.name,
      description: preset.description,
      duration_minutes: preset.duration,
      price_inr: preset.price,
      samagri_notes: preset.samagri.join(", "),
    }));
    setSamagriTags(preset.samagri);
    toast.info(`"${preset.name}" টেমপ্লেট সফলভাবে লোড হয়েছে! আপনি নিজের মতো পরিবর্তন করতে পারেন।`);
  };

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed || samagriTags.includes(trimmed)) return;
    const updated = [...samagriTags, trimmed];
    setSamagriTags(updated);
    setFormData((prev) => ({
      ...prev,
      samagri_notes: updated.join(", "),
    }));
    setNewTagInput("");
  };

  const removeTag = (indexToRemove: number) => {
    const updated = samagriTags.filter((_, i) => i !== indexToRemove);
    setSamagriTags(updated);
    setFormData((prev) => ({
      ...prev,
      samagri_notes: updated.join(", "),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.puja_name.trim()) {
      toast.error("পূজার নাম লিখুন (Please enter puja name)");
      return;
    }
    if (formData.price_inr < 1) {
      toast.error("দক্ষিণা কমপক্ষে ₹১ হতে হবে (Dakshina must be at least ₹1)");
      return;
    }

    const payload = {
      ...formData,
      samagri_notes: samagriTags.length > 0 ? samagriTags.join(", ") : formData.samagri_notes.trim(),
    };

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, payload });
    } else {
      addMutation.mutate(payload);
    }
  };

  if (!ready || (isLoading && !profile)) {
    return <LoadingBlock label="Loading your Puja Catalog..." />;
  }

  const pujas = profile?.pujas || [];
  const activePujas = pujas.filter((p) => p.is_active);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <PanelHeader
        title="আমার বৈদিক পূজা ও দক্ষিণা ক্যাটালগ (Price Catalog)"
        description="আপনি যে যে শুভ পূজা পরিচালনা করেন তা নিজের ইচ্ছামতো যুক্ত করুন এবং আপনার ব্যক্তিগত দক্ষিণা (Price) নির্ধারণ করুন।"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/purohit-dashboard">
              <Button variant="outline" size="sm">
                <ArrowLeft className="size-4 mr-1.5" />
                ড্যাশবোর্ড (Dashboard)
              </Button>
            </Link>

            <Link href="/purohit-dashboard/availability">
              <Button variant="outline" size="sm" className="border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-50">
                <Calendar className="size-4 mr-1.5 text-amber-600" />
                স্লট ও শুভ মুহূর্ত (Availability)
              </Button>
            </Link>

            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenAdd}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-md shadow-amber-600/20"
            >
              <Plus className="size-4 mr-1.5" />
              নতুন পূজা যুক্ত করুন
            </Button>
          </div>
        }
      />

      {/* Info Callout Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 text-xs text-stone-700 dark:text-stone-300 flex items-start gap-3.5 shadow-sm">
        <div className="size-8 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
          <Flame className="size-5" />
        </div>
        <div className="space-y-1">
          <p className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-2">
            <span>বৈদিক লাইভ পূজা ও দক্ষিণা ব্যবস্থা</span>
            <Badge tone="brand" className="text-[10px]">
              ১০০% পুরোহিত পারিশ্রমিক
            </Badge>
          </p>
          <p className="leading-relaxed text-stone-600 dark:text-stone-400">
            পুরোহিত ডোমেইন সাধারণ জ্যোতিষী পরামর্শের মতো কোনো অ্যাপয়েন্টমেন্ট বুকিং নয়। এখানে আপনার তালিকাভুক্ত প্রতিটি পূজা ভক্তরা লাইভ ভিডিও সংযোগের মাধ্যমে পালন করবেন। ভক্তরা আপনার নির্ধারিত দক্ষিণায় অনলাইনে বুক করবেন এবং ভিডিও কলে আপনার বৈদিক সংকল্প ও আচার গ্রহণ করবেন।
          </p>
        </div>
      </div>

      {/* 1-Click Fast Setup Shortcuts Banner */}
      <Card className="border border-amber-200/80 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-amber-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300">
              দ্রুত পূজা টেমপ্লেট (1-Click Vedic Templates)
            </h4>
          </div>
          <span className="text-[11px] text-stone-500">
            ক্লিক করে দ্রুত ফর্ম পূরণ করুন
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {VEDIC_PUJA_PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => {
                applyPreset(preset);
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-300/80 dark:border-amber-800 bg-white dark:bg-stone-900 text-xs font-medium text-stone-800 dark:text-stone-200 hover:border-amber-600 hover:bg-amber-50/60 dark:hover:bg-amber-950/40 transition-colors shadow-sm"
            >
              <Plus className="size-3 text-amber-600" />
              <span>{preset.name.split(" ")[0]}</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                ₹{preset.price}
              </span>
            </button>
          ))}
        </div>
      </Card>

      {/* Puja Catalog Cards Grid */}
      {pujas.length === 0 ? (
        <Card className="border border-dashed border-stone-300 dark:border-stone-700 p-12 text-center">
          <BookOpen className="size-12 text-stone-400 mx-auto mb-3" />
          <h4 className="text-base font-bold text-stone-800 dark:text-white">
            আপনার পূজা ক্যাটালগ এখনো খালি
          </h4>
          <p className="text-xs text-stone-500 mt-1 max-w-md mx-auto">
            উপরে "নতুন পূজা যুক্ত করুন" বাটনে ক্লিক করে অথবা উপরের যেকোনো বৈদিক টেমপ্লেটে ক্লিক করে আপনার প্রথম পূজা এবং দক্ষিণা তালিকাভুক্ত করুন।
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenAdd}
            className="mt-5 bg-amber-600 text-white font-bold"
          >
            <Plus className="size-4 mr-1.5" />
            প্রথম পূজা যুক্ত করুন
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-stone-500 px-1">
            <span>
              মোট পূজা: <b>{pujas.length}</b> টি (সক্রিয়: <b>{activePujas.length}</b> টি)
            </span>
            <span className="text-[11px]">
              ভক্তরা সক্রিয় পূজাগুলো সরাসরি দেখতে ও বুক করতে পারেন
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pujas.map((puja: PurohitPujaItem) => {
              // Parse samagri into pill preview
              const tags = (puja.samagri_notes || "")
                .split(/[,;\n]/)
                .map((t) => t.trim())
                .filter(Boolean);

              return (
                <Card
                  key={puja.id}
                  className={`border-2 transition-all overflow-hidden flex flex-col justify-between ${
                    puja.is_active
                      ? "border-amber-200/80 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm"
                      : "border-stone-200/60 opacity-60 bg-stone-50 dark:bg-stone-900/40"
                  }`}
                >
                  <div className="p-5 space-y-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <h4 className="font-bold text-stone-900 dark:text-white text-base flex items-center gap-1.5">
                          <Flame className="size-4 text-amber-600 shrink-0" />
                          <span>{puja.puja_name}</span>
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-stone-500 font-medium">
                          <span className="flex items-center gap-1">
                            <Clock className="size-3.5 text-stone-400" />
                            {puja.duration_minutes} মিনিট
                          </span>
                          <span>•</span>
                          <span className="text-stone-400 text-[11px]">বৈদিক সংকল্প বিধি</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-1 text-lg font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-900">
                          <Coins className="size-4" />
                          <span>₹{puja.price_inr}</span>
                        </div>
                        <Badge
                          tone={puja.is_active ? "green" : "neutral"}
                          className="text-[10px] font-bold"
                        >
                          {puja.is_active ? "সক্রিয় (Active)" : "নিষ্ক্রিয় (Inactive)"}
                        </Badge>
                      </div>
                    </div>

                    {puja.description && (
                      <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed line-clamp-3">
                        {puja.description}
                      </p>
                    )}

                    {/* Samagri Preview */}
                    {tags.length > 0 && (
                      <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-800 dark:text-amber-400">
                          <ListChecks className="size-3.5" />
                          <span>প্রয়োজনীয় বৈদিক সামগ্রী ({tags.length}):</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {tags.slice(0, 7).map((tag, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-2 py-0.5 rounded-md bg-white dark:bg-stone-800 border border-amber-200/80 dark:border-amber-800/60 text-[10px] font-medium text-stone-700 dark:text-stone-300"
                            >
                              {tag}
                            </span>
                          ))}
                          {tags.length > 7 && (
                            <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold self-center">
                              +{tags.length - 7} আরও
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Footer Actions */}
                  <div className="p-3 bg-stone-50/90 dark:bg-stone-900/60 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-stone-500 font-medium">বুকিং খোলা:</span>
                      <Switch
                        checked={puja.is_active}
                        onChange={(checked: boolean) =>
                          updateMutation.mutate({ id: puja.id, payload: { is_active: checked } })
                        }
                      />
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(puja)}
                        className="text-stone-700 hover:text-stone-900 text-xs"
                      >
                        <Edit2 className="size-3.5 mr-1" />
                        সম্পাদনা (Edit)
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm(`আপনি কি নিশ্চিত যে "${puja.puja_name}" মুছে ফেলতে চান?`)) {
                            deleteMutation.mutate(puja.id);
                          }
                        }}
                        className="text-rose-600 hover:bg-rose-50 text-xs"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Add / Edit Puja Modal Form */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          editingItem
            ? "পূজার বিবরণ ও দক্ষিণা সম্পাদনা (Edit Puja)"
            : "নতুন বৈদিক পূজা ক্যাটালগে যোগ করুন (Add New Puja)"
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4 p-1 max-h-[80vh] overflow-y-auto pr-1">
          {/* Preset Quick Loader inside Modal */}
          {!editingItem && (
            <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 space-y-1.5">
              <span className="text-[11px] font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1">
                <Sparkles className="size-3 text-amber-600" />
                <span>জনপ্রিয় বৈদিক পূজা থেকে বেছে নিন (Auto-Fill Preset):</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {VEDIC_PUJA_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className="px-2 py-1 rounded-lg bg-white dark:bg-stone-900 border border-amber-300 dark:border-amber-800 text-[11px] font-medium text-stone-800 dark:text-stone-200 hover:bg-amber-100 transition-colors"
                  >
                    {preset.name.split(" ")[0]} (₹{preset.price})
                  </button>
                ))}
              </div>
            </div>
          )}

          <Field
            label="পূজার নাম (Puja Name) *"
            hint="যেমন: রুদ্রাভিষেক পূজা, শ্রী সত্যনারায়ণ ব্রতকথা, গৃহপ্রবেশ ও বাস্তু শান্তি"
          >
            <Input
              required
              value={formData.puja_name}
              onChange={(e) => setFormData({ ...formData, puja_name: e.target.value })}
              placeholder="e.g. রুদ্রাভিষেক পূজা ও পঞ্চামৃত অর্চনা (Rudrabhishek Puja)"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field
              label="আপনার দক্ষিণা / ফি (₹ INR) *"
              hint="এই পূজার জন্য আপনার পারিশ্রমিক"
            >
              <Input
                type="number"
                min={1}
                required
                value={formData.price_inr}
                onChange={(e) =>
                  setFormData({ ...formData, price_inr: Number(e.target.value) || 0 })
                }
                placeholder="501"
                className="font-bold text-emerald-600 dark:text-emerald-400"
              />
            </Field>

            <Field
              label="সময়সীমা (মিনিট) *"
              hint="লাইভ পূজার রুম ঠিক এত মিনিটের জন্য খোলা থাকবে (যেমন 30 মি. বা 60 মি.)"
            >
              <div className="space-y-1.5">
                <Input
                  type="number"
                  min={10}
                  max={480}
                  required
                  value={formData.duration_minutes}
                  onChange={(e) =>
                    setFormData({ ...formData, duration_minutes: Number(e.target.value) || 30 })
                  }
                  placeholder="30"
                />
                <div className="flex flex-wrap gap-1">
                  {[15, 30, 45, 60, 90, 120].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setFormData({ ...formData, duration_minutes: mins })}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-colors ${
                        formData.duration_minutes === mins
                          ? "bg-amber-600 text-white border-amber-600"
                          : "bg-stone-50 dark:bg-stone-900 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:border-amber-400"
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>
            </Field>
          </div>

          <Field
            label="পূজার বৈদিক পদ্ধতি ও মাহাত্ম্য (Vedic Procedure & Significance)"
            hint="এই পূজার শুভ ফল এবং কোন দেবতার উদ্দেশ্যে কিভাবে পরিচালিত হবে"
          >
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              placeholder="যেমন: ভগবান মহাদেবের প্রীতি কামনায় বৈদিক পঞ্চামৃত অভিষেক ও রুদ্রসূক্ত পাঠ সহকারে বিশেষ রুদ্রাভিষেক..."
              className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 p-2.5 text-xs focus:border-amber-600 focus:outline-none"
            />
          </Field>

          {/* Interactive Samagri Tag/Pill Builder */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-800 dark:text-stone-200 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ListChecks className="size-3.5 text-amber-600" />
                <span>অন্তর্ভুক্ত সামগ্রী তালিকা (Included Samagri Checklist)</span>
              </span>
              <span className="text-[10px] text-stone-400 font-normal">
                ভক্ত ঘরে যা প্রস্তুত রাখবেন
              </span>
            </label>

            {/* Quick Add Pills */}
            <div className="flex flex-wrap gap-1 p-2 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700">
              <span className="text-[10px] font-bold text-stone-500 w-full mb-0.5">
                ক্লিক করে যোগ করুন:
              </span>
              {COMMON_SAMAGRI_SUGGESTIONS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => addTag(item)}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors ${
                    samagriTags.includes(item)
                      ? "bg-amber-600 text-white"
                      : "bg-white dark:bg-stone-700 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-600 hover:border-amber-500"
                  }`}
                >
                  {samagriTags.includes(item) ? `✓ ${item}` : `+ ${item}`}
                </button>
              ))}
            </div>

            {/* Tag Input Field */}
            <div className="flex gap-2">
              <Input
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag(newTagInput);
                  }
                }}
                placeholder="অন্য কোনো সামগ্রী লিখুন এবং 'যোগ করুন' চাপুন..."
                className="text-xs"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addTag(newTagInput)}
                className="shrink-0 font-bold text-xs"
              >
                যোগ করুন
              </Button>
            </div>

            {/* Active Selected Tags Display */}
            {samagriTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-white dark:bg-stone-900 border border-amber-200 dark:border-stone-700">
                {samagriTags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-xs font-semibold text-amber-900 dark:text-amber-200"
                  >
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => removeTag(idx)}
                      className="text-amber-700 hover:text-rose-600 ml-0.5"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-stone-200 dark:border-stone-800">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-stone-700 dark:text-stone-300">
                বুকিংয়ের জন্য সক্রিয় রাখুন:
              </span>
              <Switch
                checked={formData.is_active}
                onChange={(checked: boolean) =>
                  setFormData({ ...formData, is_active: checked })
                }
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" type="button" onClick={() => setModalOpen(false)}>
                বাতিল (Cancel)
              </Button>
              <Button
                variant="primary"
                type="submit"
                loading={addMutation.isPending || updateMutation.isPending}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
              >
                {editingItem ? "আপডেট করুন (Update Puja)" : "সংরক্ষণ করুন (Save Puja)"}
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
