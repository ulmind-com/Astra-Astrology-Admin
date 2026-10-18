"use client";

import { Phone, PhoneOff, Video } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";

import { CallRoom } from "@/components/call/call-room";
import { Alert, Avatar, Button, LoadingBlock } from "@/components/ui";
import { useCall, useCallActions, useCallHeartbeat, useCallTimer } from "@/hooks/use-call";
import { ApiError } from "@/lib/api/client";
import { useRequireAuth } from "@/providers/auth-provider";
import { CALL_STATUS_LABELS, formatDuration, isCallLive } from "@/types";

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
