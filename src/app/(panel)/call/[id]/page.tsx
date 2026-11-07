"use client";

import { Clock, Flag, Lock, Moon, Phone, PhoneOff, Save, Sparkles, Sun, Video } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { AstroCoPilot } from "@/components/call/astro-copilot";
import { CallRoom } from "@/components/call/call-room";
import { CosmicWhiteboard } from "@/components/call/cosmic-whiteboard";
import { Alert, Avatar, Button, LoadingBlock, Modal } from "@/components/ui";
import { useCall, useCallActions, useCallHeartbeat, useCallTimer } from "@/hooks/use-call";
import { appointmentApi, whiteboardApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { useRequireAuth } from "@/providers/auth-provider";
import {
  CALL_STATUS_LABELS,
  formatDuration,
  isCallLive,
  type SessionBilling,
} from "@/types";

export default function AstrologerCallPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { ready } = useRequireAuth({ roles: ["astrologer"], signInPath: "/login" });

  const { data, isLoading, error } = useCall(ready ? id : null);
  const { end } = useCallActions();

  const call = data?.call;
  const live = call ? isCallLive(call.status) : false;
  const connected = call?.status === "active";
  const isVideo = call?.mode === "video";

  useCallHeartbeat(id, live);
  const seconds = useCallTimer(call?.started_at);

  const [redFlagOpen, setRedFlagOpen] = React.useState(false);
  const [redFlagReason, setRedFlagReason] = React.useState("Abusive language / Verbal harassment");
  const [redFlagNotes, setRedFlagNotes] = React.useState("");
  const [submittingRedFlag, setSubmittingRedFlag] = React.useState(false);

  const [extendOpen, setExtendOpen] = React.useState(false);
  const [extendMinutes, setExtendMinutes] = React.useState<number>(10);
  const [offeringExtension, setOfferingExtension] = React.useState(false);

  const [whiteboardOpen, setWhiteboardOpen] = React.useState(false);

  // Theme State (Supports Ultra Pro Light & Dark)
  const [theme, setTheme] = React.useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("astra_call_theme");
      if (saved === "light" || saved === "dark") return saved;
    }
    return "light";
  });
  const isDark = theme === "dark";

  const toggleTheme = () => {
    const next = isDark ? "light" : "dark";
    setTheme(next);
    if (typeof window !== "undefined") {
      localStorage.setItem("astra_call_theme", next);
    }
  };

  const [vaultOpen, setVaultOpen] = React.useState(false);
  const [vaultNotes, setVaultNotes] = React.useState("");
  const [loadingVault, setLoadingVault] = React.useState(false);
  const [savingVault, setSavingVault] = React.useState(false);

  React.useEffect(() => {
    if (vaultOpen && call?.appointment_id) {
      setLoadingVault(true);
      appointmentApi
        .schedule(false)
        .then((items) => {
          const appt = items.find((a) => a.id === call.appointment_id);
          if (appt) {
            setVaultNotes(appt.astrologer_private_notes || "");
          }
        })
        .catch(() => {})
        .finally(() => setLoadingVault(false));
    }
  }, [vaultOpen, call?.appointment_id]);

  const handleSaveVaultNotes = async () => {
    if (!call?.appointment_id) return;
    setSavingVault(true);
    try {
      await appointmentApi.updatePrivateNotes(call.appointment_id, vaultNotes);
      toast.success("Confidential vault notes saved!");
      setVaultOpen(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save vault notes.");
    } finally {
      setSavingVault(false);
    }
  };

  React.useEffect(() => {
    if (call && !isCallLive(call.status)) {
      const timer = setTimeout(() => router.replace("/me"), 3000);
      return () => clearTimeout(timer);
    }
  }, [call, router]);

  const hangUp = React.useCallback(() => end.mutate({ id }), [end, id]);

  if (!ready || isLoading) return <LoadingBlock label="Connecting…" />;
  if (error) return <Alert tone="error">{(error as ApiError).message}</Alert>;
  if (!call) return null;

  const Icon = isVideo ? Video : Phone;

  return (
    <div
      className={cn(
        "relative flex h-[calc(100dvh-7rem)] flex-col overflow-hidden rounded-2xl shadow-sm transition-colors duration-300",
        isDark ? "bg-night-950 text-white" : "bg-[#fcf9f2] text-slate-900 border border-[#ecdcb0]",
      )}
    >
      {connected && data?.credentials ? (
        <CallRoom
          credentials={data.credentials}
          onLeave={hangUp}
          className="absolute inset-0"
          audioOnly={!isVideo}
        />
      ) : (
        <div className="absolute inset-0 bg-cosmos" />
      )}

      {/* Live Co-Pilot. Docked left, clear of the whiteboard on the right. */}
      {connected && <AstroCoPilot callId={id} enabled />}

      {connected && (
        <CosmicWhiteboard
          callId={id}
          peerUserId={call.user_id}
          role="astrologer"
          isOpen={whiteboardOpen}
          onClose={() => {
            setWhiteboardOpen(false);
            void whiteboardApi.toggle(id);
          }}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      )}

      {connected && call.billing && (
        <div className="absolute inset-x-0 top-16 z-10 px-3">
          <BookedTime billing={call.billing} elapsedSeconds={seconds} onDark={isDark} />
        </div>
      )}

      {connected ? (
        <header
          className={cn(
            "pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center gap-3 px-4 py-3 transition-colors",
            isDark
              ? "bg-gradient-to-b from-black/80 to-transparent text-white"
              : "bg-gradient-to-b from-black/60 to-transparent text-white drop-shadow-xs",
          )}
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{call.peer?.name}</p>
            <p className="flex items-center gap-1.5 text-xs text-white/80">
              <span className="size-1.5 rounded-full bg-success" />
              {formatDuration(seconds)}
            </p>
          </div>
          <div className="pointer-events-auto flex items-center gap-2">
            {/* Call Room Light / Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              className={cn(
                "flex size-8 items-center justify-center rounded-xl transition-all shadow-sm",
                isDark
                  ? "bg-white/10 hover:bg-white/20 text-amber-300 border border-white/10"
                  : "bg-white/90 hover:bg-white text-amber-700 border border-amber-300 shadow-xs",
              )}
              title={isDark ? "Switch to Sacred Ivory Light Mode" : "Switch to Cosmic Night Dark Mode"}
            >
              {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>

            <Button
              size="sm"
              onClick={() => {
                setWhiteboardOpen((v) => !v);
                void whiteboardApi.toggle(id);
              }}
              className={cn(
                "text-xs font-bold transition-all shadow-sm",
                whiteboardOpen
                  ? "bg-amber-400 text-slate-950 border border-amber-300 ring-2 ring-amber-400/50"
                  : isDark
                    ? "bg-amber-950/70 hover:bg-amber-900 text-amber-200 border border-amber-500/40"
                    : "bg-white hover:bg-amber-50 text-[#78350f] border border-amber-300 shadow-xs font-bold",
              )}
              title="Toggle live Kundali cosmic whiteboard"
            >
              <Sparkles className="size-3.5 mr-1 text-amber-400" />
              Cosmic Whiteboard
            </Button>
            {call.appointment_id && (
              <>
                {call.extension_offer?.status === "pending" ? (
                  <span className="flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-950/70 px-2.5 py-1 text-xs font-semibold text-amber-200 animate-pulse">
                    <Clock className="size-3.5 text-amber-400" />
                    Offer Sent (+{call.extension_offer.extra_minutes}m)...
                  </span>
                ) : call.extension_offer?.status === "accepted" ? (
                  <span className="flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-950/70 px-2.5 py-1 text-xs font-semibold text-emerald-200">
                    <Clock className="size-3.5 text-emerald-400" />
                    Extended (+{call.extension_offer.extra_minutes}m)!
                  </span>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => setExtendOpen(true)}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 border border-amber-400 text-xs font-bold"
                    title="Offer 10 or 15 mins extension to client"
                  >
                    <Clock className="size-3.5 mr-1" />
                    Offer Extension
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={() => setVaultOpen(true)}
                  className="bg-amber-950/70 hover:bg-amber-900 text-amber-200 border border-amber-500/40 text-xs font-bold shadow-sm"
                  title="Open Confidential Astrologer Dossier Vault"
                >
                  <Lock className="size-3.5 mr-1 text-amber-300" />
                  Private Vault
                </Button>
              </>
            )}
            <Button
              size="sm"
              onClick={() => setRedFlagOpen(true)}
              className="bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-500/40 text-xs font-bold"
              title="Terminate session and report client misconduct"
            >
              <Flag className="size-3.5 mr-1 text-rose-400" />
              Red-Flag
            </Button>
            <Button
              size="sm"
              onClick={hangUp}
              disabled={end.isPending}
              className="bg-rose-600 text-white hover:bg-rose-500"
            >
              <PhoneOff className="size-4" />
              End
            </Button>
          </div>
        </header>
      ) : (
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
          <Avatar src={call.peer?.avatar_url} name={call.peer?.name} size="xl" />
          <div>
            <p className="text-lg font-semibold">{call.peer?.name}</p>
            <p className="mt-1 flex items-center justify-center gap-2 text-sm text-white/60">
              <Icon className="size-4" />
              {CALL_STATUS_LABELS[call.status]}
            </p>
            {call.duration_seconds > 0 && (
              <p className="mt-1 text-sm text-white/60">
                {formatDuration(call.duration_seconds)}
              </p>
            )}
          </div>
          <Button variant="secondary" onClick={() => router.replace("/me")}>
            Back to my profile
          </Button>
        </div>
      )}

      {/* Red-Flag & Abuse Termination Modal */}
      {redFlagOpen && (
        <Modal
          open={redFlagOpen}
          onClose={() => setRedFlagOpen(false)}
          title="Red-Flag & Terminate Call (অপব্যবহার রিপোর্ট)"
          description="End this session immediately, log an official misconduct incident, and blacklist this client from booking you again."
          footer={
            <div className="flex items-center justify-end gap-3 w-full">
              <Button variant="secondary" onClick={() => setRedFlagOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                disabled={submittingRedFlag}
                onClick={async () => {
                  setSubmittingRedFlag(true);
                  try {
                    if (call.appointment_id) {
                      await appointmentApi.redFlag(call.appointment_id, {
                        reason: redFlagReason,
                        notes: redFlagNotes.trim() || undefined,
                        blacklist_client: true,
                        terminate_call: true,
                      });
                    }
                    hangUp();
                    toast.success("Call terminated. Client red-flagged for policy violation.");
                    router.replace("/appointments");
                  } catch (err: any) {
                    toast.error(err?.message || "Failed to submit red-flag report.");
                    hangUp();
                  } finally {
                    setSubmittingRedFlag(false);
                    setRedFlagOpen(false);
                  }
                }}
                className="font-bold bg-rose-600 text-white"
              >
                <Flag className="size-3.5 mr-1" />
                Terminate & Red-Flag
              </Button>
            </div>
          }
        >
          <div className="space-y-3.5 py-2 text-xs text-slate-800">
            <Alert tone="error">
              This will immediately disconnect the call, report the seeker for misconduct, and protect your session compensation.
            </Alert>
            <div>
              <label className="block text-[11px] font-bold mb-1">Reason *</label>
              <select
                value={redFlagReason}
                onChange={(e) => setRedFlagReason(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 bg-white"
              >
                <option value="Abusive language / Verbal harassment">Abusive language / Verbal harassment</option>
                <option value="Threats or Hostile intimidation">Threats or Hostile intimidation</option>
                <option value="Inappropriate or Vulgar behavior">Inappropriate or Vulgar behavior</option>
                <option value="Fraudulent identity or Bad faith">Fraudulent identity or Bad faith</option>
                <option value="Other platform violation">Other platform violation</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold mb-1">Notes (Optional)</label>
              <textarea
                rows={2}
                value={redFlagNotes}
                onChange={(e) => setRedFlagNotes(e.target.value)}
                placeholder="What happened in the chamber..."
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900"
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Offer Extension Modal */}
      {extendOpen && Boolean(call.appointment_id) && (
        <Modal
          open={extendOpen}
          onClose={() => setExtendOpen(false)}
          title="Offer Session Extension (সেশন বৃদ্ধি প্রস্তাব)"
          description="Send an instant in-chamber extension offer to the client. If they accept, extra consultation fee is debited from their wallet and the chamber clock extends seamlessly."
          footer={
            <div className="flex items-center justify-end gap-3 w-full">
              <Button variant="secondary" onClick={() => setExtendOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                disabled={offeringExtension}
                onClick={async () => {
                  setOfferingExtension(true);
                  try {
                    await appointmentApi.offerExtension(call.appointment_id!, extendMinutes);
                    toast.success(`Extension offer for +${extendMinutes} minutes sent to seeker!`);
                    setExtendOpen(false);
                  } catch (err: any) {
                    toast.error(err?.message || "Failed to send extension offer.");
                  } finally {
                    setOfferingExtension(false);
                  }
                }}
                className="font-bold bg-amber-500 hover:bg-amber-400 text-slate-950"
              >
                <Clock className="size-3.5 mr-1" />
                {offeringExtension ? "Sending Offer..." : `Offer +${extendMinutes} Minutes`}
              </Button>
            </div>
          }
        >
          <div className="space-y-4 py-2 text-xs text-slate-800">
            <Alert tone="info">
              The seeker will receive a live prompt on their screen. The call will stay connected without interruption while they respond.
            </Alert>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-2">
                Select Extension Duration *
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setExtendMinutes(10)}
                  className={cn(
                    "flex flex-col items-center justify-center p-3.5 rounded-xl border text-center transition-all",
                    extendMinutes === 10
                      ? "border-amber-500 bg-amber-50/80 text-amber-950 font-bold shadow-sm"
                      : "border-slate-200 hover:border-slate-300 text-slate-600 bg-white"
                  )}
                >
                  <span className="text-sm font-extrabold">+10 Minutes</span>
                  <span className="text-[10px] text-slate-700 font-medium mt-0.5">Recommended extension</span>
                </button>
                <button
                  type="button"
                  onClick={() => setExtendMinutes(15)}
                  className={cn(
                    "flex flex-col items-center justify-center p-3.5 rounded-xl border text-center transition-all",
                    extendMinutes === 15
                      ? "border-amber-500 bg-amber-50/80 text-amber-950 font-bold shadow-sm"
                      : "border-slate-200 hover:border-slate-300 text-slate-600 bg-white"
                  )}
                >
                  <span className="text-sm font-extrabold">+15 Minutes</span>
                  <span className="text-[10px] text-slate-700 font-medium mt-0.5">Deep consultation</span>
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* 🔒 Private Astrological Vault Modal */}
      {vaultOpen && (
        <Modal
          open={vaultOpen}
          onClose={() => setVaultOpen(false)}
          title="🔒 Private Astrological Vault (গোপন জ্যোতিষী নোটস)"
          description="Confidential observations strictly hidden from the seeker. Jot down notes in real-time during this consultation."
          footer={
            <div className="flex items-center justify-end gap-3 w-full">
              <Button variant="secondary" onClick={() => setVaultOpen(false)}>
                Close
              </Button>
              <Button
                disabled={savingVault || loadingVault}
                onClick={handleSaveVaultNotes}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
              >
                <Save className="size-3.5 mr-1" />
                {savingVault ? "Saving..." : "Save Vault Notes"}
              </Button>
            </div>
          }
        >
          <div className="space-y-3 py-2 text-xs">
            {loadingVault ? (
              <p className="text-slate-500 italic">Decrypting vault notes...</p>
            ) : (
              <>
                <textarea
                  rows={6}
                  maxLength={5000}
                  placeholder="গোপন পর্যবেক্ষণ লিখে রাখুন: ক্লায়েন্টের মানসিক অবস্থা, গোপন দোষ, পারিবারিক সংবেদনশীল তথ্য..."
                  value={vaultNotes}
                  onChange={(e) => setVaultNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-900 focus:border-amber-500 focus:outline-none leading-relaxed"
                />
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span className="text-emerald-700 font-medium">100% Client-Invisible</span>
                  <span>{vaultNotes.length} / 5000 chars</span>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

/**
 * What the astrologer needs to know about the clock.
 *
 * They are not paying, so no coins here — only how long was booked and how
 * much of it is left, which is what decides whether to start a new topic.
 */
function BookedTime({
  billing,
  elapsedSeconds,
  onDark = false,
}: {
  billing: SessionBilling;
  elapsedSeconds: number;
  onDark?: boolean;
}) {
  const lastMinute = billing.minutes_remaining <= 1;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2 text-xs",
        lastMinute
          ? "bg-warning-surface text-warning"
          : onDark
            ? "bg-white/10 text-white/80"
            : "bg-surface-muted text-muted-foreground",
      )}
    >
      <span className="flex items-center gap-1.5">
        <Clock className="size-3.5 shrink-0" />
        Booked for {billing.requested_minutes} min
      </span>
      <span className={cn("font-medium", lastMinute && "text-warning")}>
        {formatDuration(elapsedSeconds)} in · {billing.minutes_remaining} min left
      </span>
      {lastMinute && (
        <span className="ml-auto">Wrapping up — they may add more time.</span>
      )}
    </div>
  );
}
