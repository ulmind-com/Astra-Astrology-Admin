"use client";

import { PhoneOff } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";

import { CallRoom } from "@/components/call/call-room";
import { Alert, Button, LoadingBlock } from "@/components/ui";
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

  useCallHeartbeat(id, live);
  const seconds = useCallTimer(call?.started_at);

  React.useEffect(() => {
    if (call && !isCallLive(call.status)) {
      const timer = setTimeout(() => router.replace("/me"), 2500);
      return () => clearTimeout(timer);
    }
  }, [call, router]);

  const hangUp = React.useCallback(() => end.mutate({ id }), [end, id]);

  if (!ready || isLoading) return <LoadingBlock label="Connecting…" />;
  if (error) return <Alert tone="error">{(error as ApiError).message}</Alert>;
  if (!call) return null;

  return (
    <div className="flex h-[calc(100dvh-8rem)] flex-col overflow-hidden rounded-2xl bg-night-950 text-white">
      <header className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{call.peer?.name ?? "Caller"}</p>
          <p className="text-xs text-white/60">
            {connected ? formatDuration(seconds) : CALL_STATUS_LABELS[call.status]}
          </p>
        </div>
        {live && (
          <Button
            size="sm"
            onClick={hangUp}
            disabled={end.isPending}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            <PhoneOff className="size-4" />
            End
          </Button>
        )}
      </header>

      <div className="relative flex-1">
        {connected && data?.credentials ? (
          <CallRoom credentials={data.credentials} onLeave={hangUp} className="absolute inset-0" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
            <span className="flex size-16 items-center justify-center rounded-full bg-white/10">
              <PhoneOff className="size-7" />
            </span>
            <p className="font-semibold">{CALL_STATUS_LABELS[call.status]}</p>
            {call.duration_seconds > 0 && (
              <p className="text-sm text-white/60">
                Lasted {formatDuration(call.duration_seconds)}
              </p>
            )}
            <Button variant="secondary" onClick={() => router.replace("/me")}>
              Back to my profile
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
