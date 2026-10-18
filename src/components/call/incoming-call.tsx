"use client";

import { Phone, PhoneOff, Video } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { Avatar, Button } from "@/components/ui";
import { useActiveCall, useCallActions } from "@/hooks/use-call";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/providers/auth-provider";

/**
 * Watches for a call on every astrologer page.
 *
 * It lives in the panel shell rather than on one screen, because a call can
 * arrive while the astrologer is editing their profile — a ring that only
 * showed on a dashboard would be missed.
 */
export function IncomingCallWatcher() {
  const router = useRouter();
  const { user } = useAuth();
  const isAstrologer = user?.role === "astrologer";

  const { data } = useActiveCall(isAstrologer);
  const { accept, decline } = useCallActions();

  const call = data?.call;
  const ringing = call?.status === "ringing";

  // Once answered, the call has its own screen.
  React.useEffect(() => {
    if (call?.status === "active") router.push(`/call/${call.id}`);
  }, [call?.status, call?.id, router]);

  if (!isAstrologer || !ringing || !call) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-4 sm:inset-auto sm:right-6 sm:top-6 sm:w-80">
      <div className="card-surface overflow-hidden rounded-2xl border border-border shadow-2xl">
        <div className="bg-cosmos px-5 py-4 text-white">
          <p className="flex items-center gap-2 text-xs text-white/70">
            <Video className="size-3.5" />
            Incoming video call
          </p>
          <div className="mt-3 flex items-center gap-3">
            <Avatar src={call.peer?.avatar_url} name={call.peer?.name} size="md" />
            <div className="min-w-0">
              <p className="truncate font-semibold">{call.peer?.name ?? "Someone"}</p>
              <p className="text-xs text-white/60">is calling you…</p>
            </div>
          </div>
        </div>

        <div className="flex gap-2 p-4">
          <Button
            variant="secondary"
            className="flex-1"
            disabled={decline.isPending}
            onClick={() =>
              decline.mutate(call.id, {
                onError: (e: Error) => toast.error((e as ApiError).message),
              })
            }
          >
            <PhoneOff className="size-4" />
            Decline
          </Button>
          <Button
            className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700"
            disabled={accept.isPending}
            onClick={() =>
              accept.mutate(call.id, {
                onSuccess: () => router.push(`/call/${call.id}`),
                onError: (e: Error) => toast.error((e as ApiError).message),
              })
            }
          >
            <Phone className="size-4" />
            Answer
          </Button>
        </div>
      </div>
    </div>
  );
}
