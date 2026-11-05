"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Copy,
  Filter,
  LifeBuoy,
  Mail,
  MessageSquare,
  Phone,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  User,
  X,
} from "lucide-react";
import React, { useState } from "react";

import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { playNavFeedback } from "@/lib/sound";
import { cn } from "@/lib/utils";
import type {
  SupportTicket,
  SupportTicketStats,
  SupportTicketUpdatePayload,
  TicketPriority,
  TicketStatus,
} from "@/types/support";

const CATEGORY_LABELS: Record<string, string> = {
  wallet_billing: "Wallet & Billing",
  consultation: "Consultation & Calls",
  readings: "Tarot & Readings",
  account: "Account & Login",
  technical: "Technical Issues",
  general: "General Inquiry",
};

const PRIORITY_THEMES: Record<
  TicketPriority,
  { badge: string; dot: string; label: string }
> = {
  low: {
    badge: "bg-slate-100 text-slate-700 border-slate-200",
    dot: "bg-slate-400",
    label: "Low",
  },
  medium: {
    badge: "bg-blue-50 text-blue-700 border-blue-200/70",
    dot: "bg-blue-500",
    label: "Medium",
  },
  high: {
    badge: "bg-amber-50 text-amber-700 border-amber-200/70",
    dot: "bg-amber-500",
    label: "High",
  },
  urgent: {
    badge: "bg-rose-50 text-rose-700 border-rose-200/70",
    dot: "bg-rose-500 animate-pulse",
    label: "Urgent",
  },
};

const STATUS_THEMES: Record<
  TicketStatus,
  { bg: string; text: string; border: string; label: string }
> = {
  open: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200/80",
    label: "Open",
  },
  in_progress: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200/80",
    label: "In Progress",
  },
  resolved: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200/80",
    label: "Resolved",
  },
  closed: {
    bg: "bg-slate-100",
    text: "text-slate-600",
    border: "border-slate-200",
    label: "Closed",
  },
};

export default function AdminSupportPage() {
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(
    null
  );

  // Form state for selected ticket drawer
  const [editStatus, setEditStatus] = useState<TicketStatus>("open");
  const [editPriority, setEditPriority] = useState<TicketPriority>("medium");
  const [adminNotes, setAdminNotes] = useState("");
  const [copiedId, setCopiedId] = useState(false);

  // Fetch ticket statistics
  const { data: stats } = useQuery<SupportTicketStats>({
    queryKey: ["admin", "support", "stats"],
    queryFn: () => api.get<SupportTicketStats>(endpoints.support.adminStats),
    refetchInterval: 30000,
  });

  // Fetch paginated tickets
  const {
    data: ticketData,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery<{ items: SupportTicket[]; meta: Record<string, unknown> }>({
    queryKey: ["admin", "support", "list", statusFilter, categoryFilter, search],
    queryFn: () =>
      api.get<{ items: SupportTicket[]; meta: Record<string, unknown> }>(
        endpoints.support.adminTickets,
        {
          query: {
            status: statusFilter,
            category: categoryFilter,
            search: search.trim() || undefined,
            limit: 50,
          },
        }
      ),
  });

  const tickets = ticketData?.items ?? [];

  // Open drawer
  const handleOpenDetail = (ticket: SupportTicket) => {
    playNavFeedback();
    setSelectedTicket(ticket);
    setEditStatus(ticket.status);
    setEditPriority(ticket.priority);
    setAdminNotes(ticket.admin_notes || "");
  };

  // Update ticket mutation
  const updateMutation = useMutation({
    mutationFn: (payload: SupportTicketUpdatePayload) =>
      api.patch<SupportTicket>(
        endpoints.support.adminTicket(selectedTicket!.id),
        payload
      ),
    onSuccess: (updated) => {
      setSelectedTicket(updated);
      qc.invalidateQueries({ queryKey: ["admin", "support"] });
    },
  });

  // Delete ticket mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      api.delete<{ message: string }>(endpoints.support.adminTicket(id)),
    onSuccess: () => {
      setSelectedTicket(null);
      qc.invalidateQueries({ queryKey: ["admin", "support"] });
    },
  });

  const handleSave = () => {
    if (!selectedTicket) return;
    updateMutation.mutate({
      status: editStatus,
      priority: editPriority,
      admin_notes: adminNotes,
    });
  };

  const copyTicketNumber = (num: string) => {
    navigator.clipboard.writeText(num);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* ── 1. Top Header & Studio Actions ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex size-7 items-center justify-center rounded-xl bg-amber-500/15 text-[#D97706]">
              <LifeBuoy className="size-4" />
            </span>
            <h2 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-slate-900 leading-tight">
              Support & Inquiries
            </h2>
          </div>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            Real-time client tickets submitted from DivinLink Mobile and Web apps
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              playNavFeedback();
              refetch();
            }}
            disabled={isRefetching}
            className="flex items-center gap-2 rounded-2xl border border-slate-200/90 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs transition-all hover:bg-slate-50 active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw
              className={cn(
                "size-3.5",
                isRefetching ? "animate-spin text-[#D97706]" : "text-slate-400"
              )}
            />
            <span className="hidden sm:inline">
              {isRefetching ? "Syncing..." : "Sync"}
            </span>
          </button>
        </div>
      </div>

      {/* ── 2. 4 DealDeck 3D Metric Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Total Tickets (Hero Golden Gradient) */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            playNavFeedback();
            setStatusFilter("all");
            setCategoryFilter("all");
          }}
          className="relative overflow-hidden rounded-[26px] bg-gradient-to-br from-[#B45309] via-[#D97706] to-[#F59E0B] p-5 text-white shadow-[0_14px_30px_-6px_rgba(217,119,6,0.45)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_-6px_rgba(217,119,6,0.6)] cursor-pointer group flex flex-col justify-between min-h-[145px]"
        >
          <div className="pointer-events-none absolute -right-6 -bottom-6 size-32 rounded-full bg-white/10 blur-xl group-hover:scale-125 transition-transform" />
          <div className="flex items-center justify-between">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md shadow-xs">
              <MessageSquare className="size-5 text-white stroke-[2.2]" />
            </div>
            <span className="rounded-full bg-white/20 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-black text-white">
              All Channels
            </span>
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold text-white/80">
              Total Inquiries
            </p>
            <div className="mt-0.5 flex items-baseline justify-between">
              <h3 className="font-display text-3xl font-black tracking-tight text-white leading-none">
                {stats?.total ?? 0}
              </h3>
              <span className="text-[10px] font-medium text-white/70">
                All time received
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Open / Pending */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            playNavFeedback();
            setStatusFilter("open");
          }}
          className={cn(
            "rounded-[26px] bg-white p-5 border shadow-[0_10px_28px_rgba(20,25,45,0.03)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(20,25,45,0.07)] cursor-pointer group flex flex-col justify-between min-h-[145px]",
            statusFilter === "open"
              ? "border-amber-400 ring-2 ring-amber-100"
              : "border-slate-100/90"
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 group-hover:scale-105 transition-transform">
              <AlertCircle className="size-5 stroke-[2.2]" />
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200/80 px-2 py-0.5 text-[10px] font-bold text-amber-700">
              <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
              Action Required
            </span>
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold text-slate-400">
              Open / Pending
            </p>
            <div className="mt-0.5 flex items-baseline justify-between">
              <h3 className="font-display text-3xl font-black tracking-tight text-slate-900 leading-none">
                {stats?.open ?? 0}
              </h3>
              <span className="text-[10px] font-medium text-slate-400">
                Needs Review
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: In Progress */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            playNavFeedback();
            setStatusFilter("in_progress");
          }}
          className={cn(
            "rounded-[26px] bg-white p-5 border shadow-[0_10px_28px_rgba(20,25,45,0.03)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(20,25,45,0.07)] cursor-pointer group flex flex-col justify-between min-h-[145px]",
            statusFilter === "in_progress"
              ? "border-blue-400 ring-2 ring-blue-100"
              : "border-slate-100/90"
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 group-hover:scale-105 transition-transform">
              <Clock className="size-5 stroke-[2.2]" />
            </div>
            <span className="rounded-full bg-blue-50 border border-blue-200/80 px-2.5 py-0.5 text-[10px] font-bold text-blue-700">
              Under Review
            </span>
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold text-slate-400">
              In Progress
            </p>
            <div className="mt-0.5 flex items-baseline justify-between">
              <h3 className="font-display text-3xl font-black tracking-tight text-slate-900 leading-none">
                {stats?.in_progress ?? 0}
              </h3>
              <span className="text-[10px] font-medium text-slate-400">
                Being Handled
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Resolved */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            playNavFeedback();
            setStatusFilter("resolved");
          }}
          className={cn(
            "rounded-[26px] bg-white p-5 border shadow-[0_10px_28px_rgba(20,25,45,0.03)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(20,25,45,0.07)] cursor-pointer group flex flex-col justify-between min-h-[145px]",
            statusFilter === "resolved"
              ? "border-emerald-400 ring-2 ring-emerald-100"
              : "border-slate-100/90"
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 group-hover:scale-105 transition-transform">
              <CheckCircle2 className="size-5 stroke-[2.2]" />
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#3CFE8A]/25 px-2.5 py-0.5 text-[10px] font-bold text-[#059669] shadow-2xs">
              Closed Successfully
            </span>
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold text-slate-400">
              Resolved Tickets
            </p>
            <div className="mt-0.5 flex items-baseline justify-between">
              <h3 className="font-display text-3xl font-black tracking-tight text-slate-900 leading-none">
                {stats?.resolved ?? 0}
              </h3>
              <span className="text-[10px] font-medium text-slate-400">
                Client Satisfied
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. Filter, Search & Category Bar ── */}
      <div className="space-y-4 rounded-[28px] bg-white p-5 sm:p-6 border border-slate-100/90 shadow-[0_10px_30px_rgba(20,25,45,0.03)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by ticket #, user name, email, or subject…"
              className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50/70 pl-10 pr-9 text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/30 focus:border-[#D97706]"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Quick Status Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "all", label: "All Tickets", count: stats?.total ?? tickets.length },
              { id: "open", label: "Open", count: stats?.open ?? 0 },
              { id: "in_progress", label: "In Progress", count: stats?.in_progress ?? 0 },
              { id: "resolved", label: "Resolved", count: stats?.resolved ?? 0 },
              { id: "closed", label: "Closed", count: stats?.closed ?? 0 },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  playNavFeedback();
                  setStatusFilter(tab.id);
                }}
                className={cn(
                  "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer",
                  statusFilter === tab.id
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100/80 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900"
                )}
              >
                <span>{tab.label}</span>
                <span
                  className={cn(
                    "rounded-full px-1.5 text-[9px] font-black",
                    statusFilter === tab.id
                      ? "bg-white/20 text-white"
                      : "bg-slate-200 text-slate-700"
                  )}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Category Horizontal Filter Chips */}
        <div className="border-t border-slate-100 pt-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
              <Filter className="size-3" /> Category:
            </span>
            <button
              onClick={() => {
                playNavFeedback();
                setCategoryFilter("all");
              }}
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-xs font-bold transition-all cursor-pointer",
                categoryFilter === "all"
                  ? "bg-gradient-to-r from-[#D97706] to-[#F59E0B] text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900"
              )}
            >
              All Categories
            </button>
            {Object.entries(CATEGORY_LABELS).map(([catKey, label]) => {
              const active = categoryFilter === catKey;
              return (
                <button
                  key={catKey}
                  onClick={() => {
                    playNavFeedback();
                    setCategoryFilter(catKey);
                  }}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1 text-xs font-bold transition-all cursor-pointer",
                    active
                      ? "bg-gradient-to-r from-[#D97706] to-[#F59E0B] text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900"
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── 4. Main Tickets Table Display ── */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center rounded-[28px] bg-white py-20 px-4 text-center border border-slate-100/90 shadow-sm">
          <RefreshCw className="size-8 text-[#D97706] animate-spin mb-3" />
          <p className="text-xs font-semibold text-slate-400">Loading support inquiries…</p>
        </div>
      ) : tickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[28px] bg-white py-16 px-4 text-center border border-slate-100/90 shadow-sm">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-amber-50 text-[#D97706] mb-3">
            <LifeBuoy className="size-7" />
          </div>
          <h3 className="font-display text-base font-bold text-slate-900">
            {search || statusFilter !== "all" || categoryFilter !== "all"
              ? "No tickets match this filter"
              : "No support tickets submitted yet"}
          </h3>
          <p className="mt-1 text-xs text-slate-400 max-w-sm">
            {search || statusFilter !== "all" || categoryFilter !== "all"
              ? "Try resetting your search query or status filters to view other tickets."
              : "When users reach out from the DivinLink Mobile or Web apps, tickets will automatically stream here in real-time."}
          </p>
          {(search || statusFilter !== "all" || categoryFilter !== "all") && (
            <button
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
                setCategoryFilter("all");
              }}
              className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
            >
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-[28px] bg-white border border-slate-100/90 shadow-[0_12px_32px_rgba(20,25,45,0.03)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-4 pl-6 pr-4">Ticket & User</th>
                  <th className="py-4 px-4">Subject & Message</th>
                  <th className="py-4 px-4">Category</th>
                  <th className="py-4 px-4">Priority</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 px-4">Received</th>
                  <th className="py-4 pr-6 pl-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tickets.map((t) => {
                  const pTheme =
                    PRIORITY_THEMES[t.priority] || PRIORITY_THEMES.medium;
                  const sTheme = STATUS_THEMES[t.status] || STATUS_THEMES.open;

                  return (
                    <tr
                      key={t.id}
                      onClick={() => handleOpenDetail(t)}
                      className="group transition-colors hover:bg-slate-50/80 cursor-pointer"
                    >
                      {/* Ticket # & User Info */}
                      <td className="py-4 pl-6 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-[#D97706] font-bold ring-1 ring-amber-100">
                            <User className="size-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[11px] font-bold text-[#B45309] bg-amber-50/80 border border-amber-200/60 px-1.5 py-0.5 rounded-md">
                                {t.ticket_number}
                              </span>
                              <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[9px] font-bold uppercase text-slate-500">
                                {t.source || "App"}
                              </span>
                            </div>
                            <p className="mt-1 truncate font-bold text-slate-900 group-hover:text-[#D97706] transition-colors text-sm">
                              {t.name}
                            </p>
                            <p className="truncate text-[11px] font-semibold text-slate-400">
                              {t.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Subject & Message snippet */}
                      <td className="py-4 px-4 max-w-xs">
                        <p className="truncate font-bold text-slate-800 text-xs">
                          {t.subject}
                        </p>
                        <p className="mt-0.5 truncate text-[11px] font-medium text-slate-400">
                          {t.message}
                        </p>
                      </td>

                      {/* Category */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="rounded-lg bg-slate-100 border border-slate-200/60 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                          {CATEGORY_LABELS[t.category] || t.category}
                        </span>
                      </td>

                      {/* Priority */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold border",
                            pTheme.badge
                          )}
                        >
                          <span className={cn("size-1.5 rounded-full", pTheme.dot)} />
                          {pTheme.label}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-[10px] font-bold border",
                            sTheme.bg,
                            sTheme.text,
                            sTheme.border
                          )}
                        >
                          {sTheme.label}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-4 px-4 whitespace-nowrap text-[11px] font-medium text-slate-400">
                        {new Date(t.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>

                      {/* Actions */}
                      <td className="py-4 pr-6 pl-4 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDetail(t);
                          }}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition-all group-hover:border-[#D97706]/40 cursor-pointer"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 5. Clean Ticket Detail Drawer ── */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg border-l border-slate-100 bg-white p-6 shadow-2xl flex flex-col justify-between overflow-y-auto">
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-[#B45309] bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                      {selectedTicket.ticket_number}
                    </span>
                    <button
                      onClick={() => copyTicketNumber(selectedTicket.ticket_number)}
                      className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                      title="Copy Ticket ID"
                    >
                      <Copy className="size-3.5" />
                    </button>
                    {copiedId && (
                      <span className="text-[10px] font-bold text-emerald-600">
                        Copied!
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    Received on {new Date(selectedTicket.created_at).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* Client Info Card */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="size-4 text-[#D97706]" />
                    <span className="text-xs font-bold text-slate-900">
                      {selectedTicket.name}
                    </span>
                  </div>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] uppercase font-bold text-slate-500 border border-slate-200">
                    {selectedTicket.source || "App"}
                  </span>
                </div>
                <div className="flex flex-col gap-1 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Mail className="size-3.5 text-slate-400" />
                    <a
                      href={`mailto:${selectedTicket.email}?subject=Re: ${selectedTicket.ticket_number} - ${selectedTicket.subject}`}
                      className="text-[#D97706] hover:underline font-semibold"
                    >
                      {selectedTicket.email}
                    </a>
                  </div>
                  {selectedTicket.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="size-3.5 text-slate-400" />
                      <span className="font-semibold">{selectedTicket.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Subject & Inquiry Message */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Inquiry Subject
                </span>
                <p className="text-sm font-bold text-slate-900">
                  {selectedTicket.subject}
                </p>

                <span className="inline-block mt-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Client Message
                </span>
                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-xs font-medium leading-relaxed text-slate-700 whitespace-pre-wrap">
                  {selectedTicket.message}
                </div>
              </div>

              {/* Quick Reply Button */}
              <div>
                <a
                  href={`mailto:${selectedTicket.email}?subject=Re: Support Ticket ${selectedTicket.ticket_number} [DivinLink]&body=Hi ${selectedTicket.name},%0D%0A%0D%0AThank you for contacting DivinLink Support regarding '${selectedTicket.subject}'.%0D%0A%0D%0A`}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#D97706] to-[#F59E0B] px-4 py-3 text-xs sm:text-sm font-bold text-white shadow-[0_8px_20px_-4px_rgba(217,119,6,0.45)] hover:from-[#B45309] hover:to-[#D97706] transition-all active:scale-95 cursor-pointer"
                >
                  <Mail className="size-4" />
                  Reply to Client via Email
                </a>
              </div>

              {/* Status & Priority Selectors */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Ticket Status
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as TicketStatus)}
                    className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/30 focus:border-[#D97706]"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Priority Level
                  </label>
                  <select
                    value={editPriority}
                    onChange={(e) =>
                      setEditPriority(e.target.value as TicketPriority)
                    }
                    className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/30 focus:border-[#D97706]"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              {/* Internal Admin Resolution Notes */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Internal Resolution Notes (Admin Only)
                </label>
                <textarea
                  rows={3}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Record actions taken, refund transaction IDs, or follow-up notes..."
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50/70 p-3 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/30 focus:border-[#D97706]"
                />
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-6">
              <button
                onClick={() => {
                  if (
                    confirm(
                      `Are you sure you want to delete ticket ${selectedTicket.ticket_number}?`
                    )
                  ) {
                    deleteMutation.mutate(selectedTicket.id);
                  }
                }}
                disabled={deleteMutation.isPending}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 transition-colors cursor-pointer"
              >
                <Trash2 className="size-3.5" />
                Delete Ticket
              </button>

              <button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="rounded-2xl bg-slate-900 px-6 py-2.5 text-xs font-bold text-white transition-all hover:bg-slate-800 active:scale-95 shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
