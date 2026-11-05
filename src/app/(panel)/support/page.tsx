"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Filter,
  LifeBuoy,
  Mail,
  MessageSquare,
  Phone,
  RefreshCw,
  Search,
  Shield,
  Smartphone,
  Trash2,
  User,
  X,
  Zap,
} from "lucide-react";
import React, { useState } from "react";

import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { playNavFeedback } from "@/lib/sound";
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

const PRIORITY_THEMES: Record<TicketPriority, { badge: string; dot: string }> = {
  low: { badge: "bg-slate-500/10 text-slate-400 border-slate-500/20", dot: "bg-slate-400" },
  medium: { badge: "bg-blue-500/10 text-blue-400 border-blue-500/20", dot: "bg-blue-400" },
  high: { badge: "bg-amber-500/10 text-amber-400 border-amber-500/20", dot: "bg-amber-400" },
  urgent: { badge: "bg-rose-500/10 text-rose-400 border-rose-500/20", dot: "bg-rose-500 animate-pulse" },
};

const STATUS_THEMES: Record<TicketStatus, { bg: string; text: string; border: string }> = {
  open: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30" },
  in_progress: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30" },
  resolved: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30" },
  closed: { bg: "bg-slate-500/10", text: "text-slate-400", border: "border-slate-500/30" },
};

export default function AdminSupportPage() {
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

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
  const { data: ticketData, isLoading, refetch, isRefetching } = useQuery<{ items: SupportTicket[]; meta: any }>({
    queryKey: ["admin", "support", "list", statusFilter, categoryFilter, search],
    queryFn: () =>
      api.get<{ items: SupportTicket[]; meta: any }>(endpoints.support.adminTickets, {
        query: {
          status: statusFilter,
          category: categoryFilter,
          search: search.trim() || undefined,
          limit: 50,
        },
      }),
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
      api.patch<SupportTicket>(endpoints.support.adminTicket(selectedTicket!.id), payload),
    onSuccess: (updated) => {
      setSelectedTicket(updated);
      qc.invalidateQueries({ queryKey: ["admin", "support"] });
    },
  });

  // Delete ticket mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete<{ message: string }>(endpoints.support.adminTicket(id)),
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
      {/* ── Page Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20">
              <LifeBuoy className="size-5" />
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-white">Support & Inquiries</h1>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Real-time client tickets submitted from DivinLink Mobile and Web apps.
          </p>
        </div>

        <button
          onClick={() => {
            playNavFeedback();
            refetch();
          }}
          disabled={isRefetching}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-white/10"
        >
          <RefreshCw className={`size-3.5 ${isRefetching ? "animate-spin text-amber-400" : ""}`} />
          Refresh
        </button>
      </div>

      {/* ── Statistics Strip ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-4 backdrop-blur-xl">
          <p className="text-xs font-medium text-slate-400">Total Tickets</p>
          <p className="mt-1.5 font-display text-2xl font-bold text-white">{stats?.total ?? 0}</p>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500">
            <MessageSquare className="size-3 text-slate-400" />
            <span>All time received</span>
          </div>
        </div>

        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-4 backdrop-blur-xl">
          <p className="text-xs font-medium text-amber-400">Open / Pending</p>
          <p className="mt-1.5 font-display text-2xl font-bold text-amber-300">{stats?.open ?? 0}</p>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-400/80">
            <AlertCircle className="size-3" />
            <span>Needs immediate review</span>
          </div>
        </div>

        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/[0.04] p-4 backdrop-blur-xl">
          <p className="text-xs font-medium text-blue-400">In Progress</p>
          <p className="mt-1.5 font-display text-2xl font-bold text-blue-300">{stats?.in_progress ?? 0}</p>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-blue-400/80">
            <Clock className="size-3" />
            <span>Currently being handled</span>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4 backdrop-blur-xl">
          <p className="text-xs font-medium text-emerald-400">Resolved</p>
          <p className="mt-1.5 font-display text-2xl font-bold text-emerald-300">{stats?.resolved ?? 0}</p>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-400/80">
            <CheckCircle2 className="size-3" />
            <span>Closed successfully</span>
          </div>
        </div>
      </div>

      {/* ── Search & Filter Controls ── */}
      <div className="flex flex-col gap-3 rounded-2xl border border-white/5 bg-slate-900/40 p-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by ticket #, user name, email, or subject..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black/30 py-2 pl-10 pr-4 text-xs text-white placeholder-slate-500 focus:border-amber-500/50 focus:outline-none"
          />
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2">
          <Filter className="size-3.5 text-slate-400" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-slate-200 focus:border-amber-500/50 focus:outline-none"
          >
            <option value="all">All Categories</option>
            <option value="wallet_billing">Wallet & Billing</option>
            <option value="consultation">Consultations & Calls</option>
            <option value="readings">Tarot & Readings</option>
            <option value="account">Account & Login</option>
            <option value="technical">Technical Issues</option>
            <option value="general">General</option>
          </select>
        </div>

        {/* Status Tab Chips */}
        <div className="flex flex-wrap gap-1">
          {["all", "open", "in_progress", "resolved", "closed"].map((st) => (
            <button
              key={st}
              onClick={() => {
                playNavFeedback();
                setStatusFilter(st);
              }}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium capitalize transition-colors ${
                statusFilter === st
                  ? "bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              }`}
            >
              {st.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tickets Table / Cards ── */}
      <div className="rounded-2xl border border-white/5 bg-slate-900/40 backdrop-blur-xl">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <RefreshCw className="size-6 animate-spin text-amber-400/80" />
            <p className="mt-3 text-xs">Loading support tickets...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <LifeBuoy className="size-10 text-slate-600" />
            <p className="mt-3 font-display text-sm font-semibold text-slate-300">No support tickets found</p>
            <p className="mt-1 text-xs text-slate-500">
              {search || statusFilter !== "all" || categoryFilter !== "all"
                ? "Try adjusting your search query or filters."
                : "No client inquiries have been submitted yet."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-3.5">Ticket ID</th>
                  <th className="px-4 py-3.5">Client</th>
                  <th className="px-4 py-3.5">Subject & Category</th>
                  <th className="px-4 py-3.5">Priority</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Date</th>
                  <th className="px-4 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                {tickets.map((t) => {
                  const priTheme = PRIORITY_THEMES[t.priority] || PRIORITY_THEMES.medium;
                  const stTheme = STATUS_THEMES[t.status] || STATUS_THEMES.open;

                  return (
                    <tr
                      key={t.id}
                      onClick={() => handleOpenDetail(t)}
                      className="cursor-pointer transition-colors hover:bg-white/[0.03]"
                    >
                      <td className="whitespace-nowrap px-4 py-3.5 font-mono font-medium text-amber-300">
                        {t.ticket_number}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="flex size-7 items-center justify-center rounded-full bg-white/5 text-[11px] font-bold text-slate-300 ring-1 ring-white/10">
                            {t.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-white">{t.name}</p>
                            <p className="text-[11px] text-slate-500">{t.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="max-w-[260px] truncate px-4 py-3.5">
                        <p className="font-medium text-slate-200 truncate">{t.subject}</p>
                        <span className="inline-block mt-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium bg-white/5 text-slate-400 border border-white/5">
                          {CATEGORY_LABELS[t.category] || t.category}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${priTheme.badge}`}>
                          <span className={`size-1.5 rounded-full ${priTheme.dot}`} />
                          {t.priority}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${stTheme.bg} ${stTheme.text} ${stTheme.border}`}>
                          {t.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-slate-400">
                        {new Date(t.created_at).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDetail(t);
                          }}
                          className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-slate-200 transition-colors hover:bg-white/10 hover:text-white"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Ticket Detail Drawer ── */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg border-l border-white/10 bg-slate-950 p-6 shadow-2xl flex flex-col justify-between overflow-y-auto">
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-amber-300">{selectedTicket.ticket_number}</span>
                    <button
                      onClick={() => copyTicketNumber(selectedTicket.ticket_number)}
                      className="text-slate-400 hover:text-white"
                      title="Copy Ticket ID"
                    >
                      <Copy className="size-3.5" />
                    </button>
                    {copiedId && <span className="text-[10px] text-emerald-400">Copied!</span>}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Received on {new Date(selectedTicket.created_at).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* Client Info Card */}
              <div className="rounded-xl border border-white/5 bg-slate-900/60 p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="size-4 text-amber-400" />
                    <span className="text-xs font-semibold text-white">{selectedTicket.name}</span>
                  </div>
                  <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] uppercase font-bold text-slate-400 border border-white/5">
                    {selectedTicket.source || "Mobile"}
                  </span>
                </div>
                <div className="flex flex-col gap-1 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <Mail className="size-3.5 text-slate-500" />
                    <a href={`mailto:${selectedTicket.email}?subject=Re: ${selectedTicket.ticket_number} - ${selectedTicket.subject}`} className="text-amber-400/90 hover:underline">
                      {selectedTicket.email}
                    </a>
                  </div>
                  {selectedTicket.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="size-3.5 text-slate-500" />
                      <span>{selectedTicket.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Subject & Inquiry Message */}
              <div className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Subject</span>
                <p className="text-sm font-semibold text-white">{selectedTicket.subject}</p>
                
                <span className="inline-block mt-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Client Message
                </span>
                <div className="rounded-xl border border-white/5 bg-black/40 p-4 text-xs leading-relaxed text-slate-200 whitespace-pre-wrap">
                  {selectedTicket.message}
                </div>
              </div>

              {/* Quick Reply Button */}
              <div>
                <a
                  href={`mailto:${selectedTicket.email}?subject=Re: Support Ticket ${selectedTicket.ticket_number} [DivinLink]&body=Hi ${selectedTicket.name},%0D%0A%0D%0AThank you for contacting DivinLink Support regarding '%20${selectedTicket.subject}%20'.%0D%0A%0D%0A`}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-black transition-colors hover:bg-amber-400"
                >
                  <Mail className="size-4" />
                  Reply to Client via Email
                </a>
              </div>

              {/* Status & Priority Selectors */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Ticket Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as TicketStatus)}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Priority Level</label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as TicketPriority)}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
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
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Internal Resolution Notes (Admin Only)
                </label>
                <textarea
                  rows={3}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Record actions taken, refund transaction IDs, or follow-up notes..."
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 p-3 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between border-t border-white/10 pt-4 mt-6">
              <button
                onClick={() => {
                  if (confirm(`Are you sure you want to delete ticket ${selectedTicket.ticket_number}?`)) {
                    deleteMutation.mutate(selectedTicket.id);
                  }
                }}
                disabled={deleteMutation.isPending}
                className="inline-flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300"
              >
                <Trash2 className="size-3.5" />
                Delete
              </button>

              <button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="rounded-xl bg-white px-5 py-2 text-xs font-bold text-black transition-colors hover:bg-slate-200 disabled:opacity-50"
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
