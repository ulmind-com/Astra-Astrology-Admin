"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  BookOpen,
  Edit2,
  Flame,
  Plus,
  Power,
  Sparkles,
  Trash2,
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
  Field,
  Input,
  LoadingBlock,
  Modal,
  Switch,
} from "@/components/ui";
import { purohitPortalApi, type PurohitPujaItem, type PurohitData } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { useRequireAuth } from "@/providers/auth-provider";

export default function PurohitPujaCatalogPage() {
  const { ready } = useRequireAuth({ roles: ["purohit"], signInPath: "/login" });
  const queryClient = useQueryClient();

  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<PurohitPujaItem | null>(null);

  const [formData, setFormData] = React.useState({
    puja_name: "",
    description: "",
    duration_minutes: 45,
    price_inr: 100,
    samagri_notes: "",
    is_active: true,
  });

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
      toast.success("✅ নতুন পূজা সফলভাবে ক্যাটালগে যুক্ত হয়েছে!");
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
      toast.success("পূজাটি সফলভাবে মুছে ফেলা হয়েছে।");
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
  };

  const handleOpenAdd = () => {
    resetForm();
    setModalOpen(true);
  };

  const handleOpenEdit = (item: PurohitPujaItem) => {
    setEditingItem(item);
    setFormData({
      puja_name: item.puja_name,
      description: item.description || "",
      duration_minutes: item.duration_minutes,
      price_inr: item.price_inr,
      samagri_notes: item.samagri_notes || "",
      is_active: item.is_active,
    });
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.puja_name.trim()) {
      toast.error("Please enter puja name.");
      return;
    }
    if (formData.price_inr <= 0) {
      toast.error("Price must be at least ₹1.");
      return;
    }

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, payload: formData });
    } else {
      addMutation.mutate(formData);
    }
  };

  if (!ready || (isLoading && !profile)) {
    return <LoadingBlock label="Loading your Puja Catalog..." />;
  }

  const pujas = profile?.pujas || [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PanelHeader
        title="আমার পূজা ও দক্ষিণা ক্যাটালগ (Price Catalog)"
        description="আপনি নিজে যে যে পূজা পরিচালনা করেন তা নিজের ইচ্ছামতো তৈরি করুন এবং দক্ষিণা (Price) সেট করুন।"
        action={
          <div className="flex items-center gap-2">
            <Link href="/purohit-dashboard">
              <Button variant="outline" size="sm">
                <ArrowLeft className="size-4 mr-1.5" />
                Back to Dashboard
              </Button>
            </Link>
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenAdd}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
            >
              <Plus className="size-4 mr-1.5" />
              নতুন পুজো তৈরি করুন
            </Button>
          </div>
        }
      />

      {/* Info Callout */}
      <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 text-xs text-amber-900 dark:text-amber-300 flex items-start gap-3">
        <Sparkles className="size-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold">দক্ষিণা নির্ধারণের স্বাধীনতা:</p>
          <p className="mt-0.5 leading-relaxed">
            এখানে আপনার তালিকাভুক্ত প্রতিটি পূজা ভক্তরা সরাসরি দেখতে পাবেন। আপনি যে দক্ষিণা নির্ধারণ করবেন, ভক্তরা সেই মূল্যেই অনলাইনে আপনাকে বুক করবেন।
          </p>
        </div>
      </div>

      {/* Puja Cards Grid */}
      {pujas.length === 0 ? (
        <Card className="border border-dashed border-stone-300 dark:border-stone-700 p-10 text-center">
          <BookOpen className="size-10 text-stone-400 mx-auto mb-2" />
          <h4 className="text-base font-bold text-stone-800 dark:text-white">আপনার ক্যাটালগ এখনো খালি</h4>
          <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
            উপরে "নতুন পুজো তৈরি করুন" বাটনে ক্লিক করে আপনার প্রথম পূজা এবং দক্ষিণা যুক্ত করুন।
          </p>
          <Button variant="primary" size="sm" onClick={handleOpenAdd} className="mt-4 bg-amber-600 text-white font-bold">
            <Plus className="size-4 mr-1" /> Add Your First Puja
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pujas.map((puja: PurohitPujaItem) => (
            <Card
              key={puja.id}
              className={`border-2 transition-all overflow-hidden flex flex-col justify-between ${
                puja.is_active
                  ? "border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900"
                  : "border-stone-200/60 opacity-60 bg-stone-50 dark:bg-stone-900/40"
              }`}
            >
              <div className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-stone-900 dark:text-white text-base">
                      {puja.puja_name}
                    </h4>
                    <span className="text-xs text-stone-500 font-medium">
                      ⏱️ সময়সীমা: {puja.duration_minutes} মিনিট
                    </span>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                      ₹{puja.price_inr}
                    </span>
                    <Badge
                      tone="neutral"
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

                {puja.samagri_notes && (
                  <div className="p-2.5 rounded-lg bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 text-[11px] text-stone-600 dark:text-stone-300">
                    <span className="font-bold text-amber-700 dark:text-amber-400 block mb-0.5">
                      ভক্তি সামগ্রী নির্দেশিকা:
                    </span>
                    {puja.samagri_notes}
                  </div>
                )}
              </div>

              {/* Card Footer Actions */}
              <div className="p-3 bg-stone-50/80 dark:bg-stone-900/60 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-stone-500">বুকিংয়ের জন্য উন্মুক্ত:</span>
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
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm(`Are you sure you want to delete ${puja.puja_name}?`)) {
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
          ))}
        </div>
      )}

      {/* Add / Edit Puja Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? "পূজার বিবরণ ও দক্ষিণা পরিবর্তন করুন" : "নতুন পূজা ক্যাটালগে যোগ করুন"}
      >
        <form onSubmit={handleSubmit} className="space-y-4 p-1">
          <Field label="পূজার নাম (Puja Name) *" hint="যেমন: লক্ষ্মী পূজা, সত্যনারায়ণ কথা, জন্মদিন শান্তি">
            <Input
              required
              value={formData.puja_name}
              onChange={(e) => setFormData({ ...formData, puja_name: e.target.value })}
              placeholder="e.g. শ্রী লক্ষ্মী পূজা ও ধন শান্তি (Lakshmi Puja)"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="আপনার দক্ষিণা / ফি (₹ INR) *" hint="এই পূজার জন্য আপনার পারিশ্রমিক">
              <Input
                type="number"
                min={1}
                required
                value={formData.price_inr}
                onChange={(e) => setFormData({ ...formData, price_inr: Number(e.target.value) || 0 })}
                placeholder="100"
                className="font-bold text-emerald-600"
              />
            </Field>

            <Field label="সময়সীমা (মিনিট)" hint="পূজা সম্পন্ন হতে আনুমানিক কত মিনিট লাগবে">
              <Input
                type="number"
                min={10}
                max={480}
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: Number(e.target.value) || 45 })}
                placeholder="45"
              />
            </Field>
          </div>

          <Field label="পূজার মাহাত্ম্য ও বিবরণ (Description)">
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              placeholder="এই পূজার শুভ ফল, কোন দেবতার উদ্দেশ্যে করা হয় এবং এতে কী কী বৈদিক মন্ত্র ও আরতি থাকবে..."
              className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 p-2.5 text-xs focus:border-amber-600 focus:outline-none"
            />
          </Field>

          <Field label="ভক্তের জন্য সামগ্রী চেকলিস্ট (Samagri Checklist)">
            <textarea
              value={formData.samagri_notes}
              onChange={(e) => setFormData({ ...formData, samagri_notes: e.target.value })}
              rows={2}
              placeholder="যেমন: ১টি প্রদীপ, ঘি, পানপাতা, মিষ্টি প্রসাদ, গঙ্গাজল ও ফুল ঘরে প্রস্তুত রাখতে হবে..."
              className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 p-2.5 text-xs focus:border-amber-600 focus:outline-none"
            />
          </Field>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-stone-700 dark:text-stone-300">তাত্ক্ষণিক সক্রিয় রাখুন:</span>
              <Switch
                checked={formData.is_active}
                onChange={(checked: boolean) => setFormData({ ...formData, is_active: checked })}
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" type="button" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                loading={addMutation.isPending || updateMutation.isPending}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
              >
                {editingItem ? "Update Puja" : "Save & Add to Catalog"}
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
