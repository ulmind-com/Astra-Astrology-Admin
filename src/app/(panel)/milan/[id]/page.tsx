"use client";

/**
 * The multi-party Vedic chamber, from the astrologer's side.
 *
 * The astrologer does not own this room — the host opened it, the host pays
 * for it, and the invitations are the host's to hand out. What the
 * astrologer needs is to see who has actually arrived, and to be able to
 * close the session.
 */

import { PhoneOff, Users } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";

import { CallRoom } from "@/components/call/call-room";
import { Alert, Avatar, Button, LoadingBlock, Modal } from "@/components/ui";
import { useMilanActions, useMilanHeartbeat, useMilanRoom } from "@/hooks/use-milan";
import { ApiError } from "@/lib/api/client";
import { useRequireAuth } from "@/providers/auth-provider";
import { CALL_STATUS_LABELS, formatDuration, isCallLive } from "@/types";
import { MILAN_PURPOSE_LABELS } from "@/types/milan";

export default function AstrologerMilanPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { ready } = useRequireAuth({ roles: ["astrologer"], signInPath: "/login" });

  const { data, isLoading, error } = useMilanRoom(ready ? id : null);
  const { end } = useMilanActions();

  const room = data?.room;
  const credentials = data?.credentials ?? null;
  const live = room ? isCallLive(room.status) : false;
  const connected = room?.status === "active";

  useMilanHeartbeat(id, live);

  const [elapsed, setElapsed] = React.useState(0);
  React.useEffect(() => {
    if (!room?.started_at) return;
    const started = new Date(room.started_at).getTime();
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - started) / 1000)));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [room?.started_at]);

  const [endOpen, setEndOpen] = React.useState(false);
  const [rosterOpen, setRosterOpen] = React.useState(false);

  React.useEffect(() => {
    if (room && !isCallLive(room.status)) {
      const timer = setTimeout(() => router.replace("/me"), 3000);
      return () => clearTimeout(timer);
    }
  }, [room, router]);

  if (!ready || isLoading) return <LoadingBlock label="Connecting…" />;
  if (error) return <Alert tone="error">{(error as ApiError).message}</Alert>;
  if (!room) return null;

  const present = room.occupants.filter((o) => o.is_present);

  return (
    <div className="relative flex h-[calc(100dvh-7rem)] flex-col overflow-hidden rounded-2xl bg-night-950 text-white shadow-sm">
      {connected && credentials ? (
        <CallRoom
          credentials={credentials}
          onLeave={() => end.mutate({ id })}
          className="absolute inset-0"
          audioOnly={room.mode !== "video"}
          group
        />
      ) : (
        <div className="absolute inset-0 bg-cosmos" />
      )}

      {/* No Co-Pilot here. It reads one client's chart from a 1:1 call
          session, and a matching chamber has two charts and no call
          session — showing one of them would be worse than showing none. */}

      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center gap-3 bg-gradient-to-b from-black/70 to-transparent px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">
            {room.host_name}
            {present.length ? ` +${present.length}` : ""}
          </p>
          <p className="text-xs text-white/70">
            {MILAN_PURPOSE_LABELS[room.purpose].en}
            {connected ? ` · ${formatDuration(elapsed)}` : ""}
          </p>
        </div>
        <div className="pointer-events-auto flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => setRosterOpen(true)}>
            <Users className="size-4" />
            {present.length + 1}
          </Button>
          <Button
            size="sm"
            onClick={() => setEndOpen(true)}
            className="bg-rose-600 text-white hover:bg-rose-500"
          >
            <PhoneOff className="size-4" />
            End
          </Button>
        </div>
      </header>

      {!connected && (
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
          <Avatar name={room.host_name ?? undefined} size="xl" />
          <div>
            <p className="text-lg font-semibold">{room.host_name}</p>
            <p className="mt-1 text-sm text-white/60">
              {CALL_STATUS_LABELS[room.status]}
            </p>
          </div>
          <Button variant="secondary" onClick={() => router.replace("/me")}>
            Back to my profile
          </Button>
        </div>
      )}

      <Modal
        open={rosterOpen}
        onClose={() => setRosterOpen(false)}
        title="Who is in the chamber"
        description="The host invites and cancels; you see who has arrived."
      >
        <ul className="space-y-2">
          <li className="flex items-center justify-between rounded-xl border border-border px-3 py-2">
            <span className="text-sm font-medium">{room.host_name}</span>
            <span className="text-xs text-muted-foreground">Host</span>
          </li>
          {room.occupants.map((o) => (
            <li
              key={o.seat_id}
              className="flex items-center justify-between rounded-xl border border-border px-3 py-2"
            >
              <span className="text-sm font-medium">{o.display_name || o.label}</span>
              <span className="text-xs text-muted-foreground">
                {o.is_present ? "In the chamber" : "Not joined yet"}
              </span>
            </li>
          ))}
          {room.occupants.length === 0 && (
            <li className="px-3 py-2 text-sm text-muted-foreground">
              The host has not invited anyone else.
            </li>
          )}
        </ul>
      </Modal>

      <Modal
        open={endOpen}
        onClose={() => setEndOpen(false)}
        title="End this chamber?"
        description="Everyone will be disconnected and the invitations will stop working."
      >
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setEndOpen(false)}>
            Stay
          </Button>
          <Button
            disabled={end.isPending}
            onClick={() => end.mutate({ id }, { onSuccess: () => setEndOpen(false) })}
            className="bg-rose-600 text-white hover:bg-rose-500"
          >
            End it
          </Button>
        </div>
      </Modal>
    </div>
  );
}
