"use client";

import { Clock, Phone, PhoneOff, Video } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";

import { CallRoom } from "@/components/call/call-room";
import { Alert, Avatar, Button, LoadingBlock } from "@/components/ui";
import { useCall, useCallActions, useCallHeartbeat, useCallTimer } from "@/hooks/use-call";
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
    <div className="relative flex h-[calc(100dvh-7rem)] flex-col overflow-hidden rounded-2xl bg-night-950 text-white shadow-sm">
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

      {connected && call.billing && (
        <div className="absolute inset-x-0 top-16 z-10 px-3">
          <BookedTime billing={call.billing} elapsedSeconds={seconds} onDark />
        </div>
      )}

      {connected ? (
        <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center gap-3 bg-gradient-to-b from-black/70 to-transparent px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{call.peer?.name}</p>
            <p className="flex items-center gap-1.5 text-xs text-white/70">
              <span className="size-1.5 rounded-full bg-emerald-400" />
              {formatDuration(seconds)}
            </p>
          </div>
          <Button
            size="sm"
            onClick={hangUp}
            disabled={end.isPending}
            className="pointer-events-auto bg-red-600 text-white hover:bg-red-700"
          >
            <PhoneOff className="size-4" />
            End
          </Button>
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
          ? "bg-amber-500/15 text-amber-600 dark:text-amber-300"
          : onDark
            ? "bg-white/10 text-white/80"
            : "bg-surface-muted text-muted-foreground",
      )}
    >
      <span className="flex items-center gap-1.5">
        <Clock className="size-3.5 shrink-0" />
        Booked for {billing.requested_minutes} min
      </span>
      <span className={cn("font-medium", lastMinute && "text-amber-500")}>
        {formatDuration(elapsedSeconds)} in · {billing.minutes_remaining} min left
      </span>
      {lastMinute && (
        <span className="ml-auto">Wrapping up — they may add more time.</span>
      )}
    </div>
  );
}
