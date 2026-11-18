"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Flame,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  Star,
  CheckCircle2,
  Trash2,
  ExternalLink,
  BookOpen,
  Calendar,
} from "lucide-react";
import Image from "next/image";
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
} from "@/components/ui";
import { adminPurohitApi, type PurohitData, type PurohitPujaItem } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { useRequireAuth } from "@/providers/auth-provider";

export default function AdminPurohitsPage() {
  const { ready } = useRequireAuth({ roles: ["admin", "super_admin"], signInPath: "/login" });
  const queryClient = useQueryClient();

  const [search, setSearch] = React.useState("");
  const [selectedPurohit, setSelectedPurohit] = React.useState<PurohitData | null>(null);
  const [catalogModalOpen, setCatalogModalOpen] = React.useState(false);

  const { data: res, isLoading } = useQuery({
    queryKey: ["admin_purohits"],
    queryFn: async () => {
      const response = await adminPurohitApi.list({ limit: 100 });
      return response.data;
    },
    enabled: ready,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await adminPurohitApi.delete(id);
    },
    onSuccess: () => {
      toast.success("Purohit deactivated successfully.");
      queryClient.invalidateQueries({ queryKey: ["admin_purohits"] });
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : "Failed to deactivate Purohit";
      toast.error(msg);
    },
  });

  const purohits = res || [];

  const filteredPurohits = React.useMemo(() => {
    if (!search.trim()) return purohits;
    const q = search.toLowerCase();
    return purohits.filter(
      (p: PurohitData) =>
        p.display_name.toLowerCase().includes(q) ||
        (p.city && p.city.toLowerCase().includes(q)) ||
        (p.phone && p.phone.includes(q)) ||
        (p.email && p.email.toLowerCase().includes(q))
    );
  }, [purohits, search]);

  if (!ready || isLoading) {
    return <LoadingBlock label="Loading Purohits & Vedic Pandits..." />;
  }

  const onlineCount = purohits.filter((p: PurohitData) => p.is_online).length;
  const totalPujasDone = purohits.reduce((acc: number, p: PurohitData) => acc + (p.total_pujas_performed || 0), 0);

  return (
    <div className="space-y-6">
      <PanelHeader
        title="Purohits & Vedic Pandits Hub"
        description="Manage verified Purohits, view live online availability, and oversee puja price catalogs."
        action={
          <Link href="/purohits/new">
            <Button variant="primary" size="sm" className="bg-amber-600 hover:bg-amber-700 text-white font-bold">
              <Plus className="size-4 mr-1.5" />
              Onboard New Purohit
            </Button>
          </Link>
        }
      />

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border border-stone-200 dark:border-stone-800">
          <CardBody className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-xl bg-stone-100 text-stone-700 flex items-center justify-center shrink-0">
              <Flame className="size-5 text-amber-600" />
            </div>
            <div>
              <span className="text-xs text-stone-500 font-medium">Total Registered Purohits</span>
              <div className="text-xl font-bold text-stone-900 dark:text-white">{purohits.length}</div>
            </div>
          </CardBody>
        </Card>

        <Card className="border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/30">
          <CardBody className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <span className="relative flex size-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full size-3 bg-emerald-500" />
              </span>
            </div>
            <div>
              <span className="text-xs text-emerald-900 font-medium">Currently Online for Puja</span>
              <div className="text-xl font-bold text-emerald-950">{onlineCount} Available</div>
            </div>
          </CardBody>
        </Card>

        <Card className="border border-indigo-200 dark:border-indigo-900/40 bg-indigo-50/30">
          <CardBody className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
              <Star className="size-5 text-indigo-600" />
            </div>
            <div>
              <span className="text-xs text-indigo-900 font-medium">Total Completed Pujas</span>
              <div className="text-xl font-bold text-indigo-950">{totalPujasDone} Pujas</div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Search Bar */}
      <Card className="border border-stone-200 dark:border-stone-800">
        <CardBody className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-stone-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Purohit name, city, phone, or email..."
              className="pl-9 text-xs"
            />
          </div>
        </CardBody>
      </Card>

      {/* Purohits Grid */}
      {filteredPurohits.length === 0 ? (
        <Card className="border border-dashed border-stone-300 dark:border-stone-700 p-8 text-center">
          <Flame className="size-10 text-stone-400 mx-auto mb-2" />
          <p className="text-sm font-bold text-stone-700 dark:text-stone-300">No Purohits found.</p>
          <p className="text-xs text-stone-500 mt-1">Click "Onboard New Purohit" to register the first priest.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPurohits.map((purohit) => (
            <Card
              key={purohit.id}
              className="border border-stone-200 dark:border-stone-800 overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow"
            >
              <div className="p-5 space-y-4">
                {/* Header info */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="relative size-12 rounded-full overflow-hidden bg-amber-100 shrink-0 border border-amber-200">
                      {purohit.avatar_url ? (
                        <Image src={purohit.avatar_url} alt={purohit.display_name} fill className="object-cover" unoptimized />
                      ) : (
                        <div className="size-full flex items-center justify-center text-amber-700 font-bold text-base">
                          {purohit.display_name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-stone-900 dark:text-white text-sm flex items-center gap-1.5">
                        {purohit.display_name}
                        {purohit.is_verified && <CheckCircle2 className="size-4 text-blue-500" />}
                      </h4>
                      <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">{purohit.title}</p>
                    </div>
                  </div>

                  {/* Online / Offline badge */}
                  {purohit.is_online ? (
                    <Badge tone="neutral" className="bg-emerald-100 text-emerald-900 border-emerald-300 font-bold text-[10px]">
                      🟢 Online Now
                    </Badge>
                  ) : (
                    <Badge tone="neutral" className="bg-stone-100 text-stone-600 border-stone-300 text-[10px]">
                      ⚪ Offline
                    </Badge>
                  )}
                </div>

                {/* Details */}
                <div className="space-y-1.5 text-xs text-stone-600 dark:text-stone-300 pt-2 border-t border-stone-100 dark:border-stone-800">
                  {purohit.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="size-3.5 text-stone-400" />
                      <span>{purohit.phone}</span>
                    </div>
                  )}
                  {purohit.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="size-3.5 text-stone-400" />
                      <span className="truncate">{purohit.email}</span>
                    </div>
                  )}
                  {purohit.city && (
                    <div className="flex items-center gap-2">
                      <MapPin className="size-3.5 text-stone-400" />
                      <span>{purohit.city}, {purohit.state || "India"}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 pt-1 text-[11px] text-stone-500">
                    <span>{purohit.experience_years} yrs exp</span>
                    <span>•</span>
                    <span>{purohit.languages?.join(", ")}</span>
                  </div>
                </div>

                {/* Puja Catalog Preview */}
                <div className="p-2.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 text-xs">
                  <div className="flex items-center justify-between font-bold text-amber-950 dark:text-amber-200">
                    <span>Price Catalog ({purohit.pujas?.length || 0} Pujas)</span>
                    <span className="text-[11px]">Starts ₹{purohit.starting_price_inr}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {(purohit.pujas || []).slice(0, 2).map((puja: PurohitPujaItem) => (
                      <span key={puja.id} className="inline-block px-2 py-0.5 rounded-md bg-white dark:bg-stone-900 border border-amber-200 text-[10px] text-stone-700 dark:text-stone-300 font-medium">
                        {puja.puja_name.split("(")[0]} (₹{puja.price_inr})
                      </span>
                    ))}
                    {(purohit.pujas?.length || 0) > 2 && (
                      <span className="text-[10px] text-amber-700 font-bold self-center">
                        +{purohit.pujas.length - 2} more
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="p-3 bg-stone-50/80 dark:bg-stone-900/40 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedPurohit(purohit);
                    setCatalogModalOpen(true);
                  }}
                  className="text-xs font-bold"
                >
                  <BookOpen className="size-3.5 mr-1" />
                  View Catalog ({purohit.pujas?.length || 0})
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (confirm(`Are you sure you want to deactivate Purohit ${purohit.display_name}?`)) {
                      deleteMutation.mutate(purohit.id);
                    }
                  }}
                  loading={deleteMutation.isPending}
                  className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-xs"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Catalog Modal */}
      {selectedPurohit && (
        <Modal
          open={catalogModalOpen}
          onClose={() => setCatalogModalOpen(false)}
          title={`Puja Price Catalog — ${selectedPurohit.display_name}`}
        >
          <div className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
            <p className="text-xs text-stone-500">
              Pujas and dakshina offered by this Purohit. Purohits can also add or customize these directly from their personal dashboard.
            </p>

            {(selectedPurohit.pujas || []).length === 0 ? (
              <p className="text-xs text-stone-400 italic py-4 text-center">No pujas currently in catalog.</p>
            ) : (
              <div className="space-y-3">
                {selectedPurohit.pujas.map((puja: PurohitPujaItem) => (
                  <div key={puja.id} className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/30 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h5 className="font-bold text-sm text-stone-900 dark:text-white">{puja.puja_name}</h5>
                        <p className="text-xs text-stone-500">{puja.duration_minutes} Minutes duration</p>
                      </div>
                      <Badge tone="neutral" className="bg-emerald-100 text-emerald-900 border-emerald-300 font-bold text-xs">
                        ₹{puja.price_inr}
                      </Badge>
                    </div>
                    {puja.description && (
                      <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">{puja.description}</p>
                    )}
                    {puja.samagri_notes && (
                      <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 text-[11px] text-amber-900 dark:text-amber-300">
                        <b>Samagri checklist for devotee:</b> {puja.samagri_notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
