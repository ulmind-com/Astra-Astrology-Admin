"use client";

import { MessageCircle, Phone, PhoneOff, Video } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { Avatar, Button } from "@/components/ui";
import { useActiveCall, useCallActions } from "@/hooks/use-call";
import { useAlertOn, useLoopingSound } from "@/hooks/use-sound";
import { useActiveChat, useChatActions } from "@/hooks/use-chat";
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

  const { data: chatData } = useActiveChat(isAstrologer);
  const chatActions = useChatActions();

  const call = data?.call;
  const ringing = call?.status === "ringing";

  const chat = chatData?.chat;
  const chatWaiting = chat?.status === "requested";

  // A ringing call rings, for as long as it is ringing. Stops by itself the
  // moment it is answered, declined, or the caller gives up.
  useLoopingSound("ring", ringing);

  // A chat has no ringing state — someone is simply waiting — so it gets one
  // alert rather than a tone that would have to be silenced by hand.
  useAlertOn("notify", chatWaiting ? chat?.id : null);

  // Once answered, each has its own screen.
  React.useEffect(() => {
    if (call?.status === "active") router.push(`/call/${call.id}`);
  }, [call?.status, call?.id, router]);

  React.useEffect(() => {
    if (chat?.status === "active") router.push(`/chat/${chat.id}`);
  }, [chat?.status, chat?.id, router]);

  if (!isAstrologer) return null;

  // A call interrupts; a chat can wait. If both somehow arrive, the call wins.
  if (!ringing && chatWaiting && chat) {
    return (
      <div className="fixed inset-x-0 bottom-0 z-50 p-4 sm:inset-auto sm:right-6 sm:top-6 sm:w-80">
        <div className="card-surface overflow-hidden rounded-2xl border border-border shadow-2xl">
          <div className="bg-cosmos px-5 py-4 text-white">
            <p className="flex items-center gap-2 text-xs text-white/70">
              <MessageCircle className="size-3.5" />
              Chat request
            </p>
            <div className="mt-3 flex items-center gap-3">
              <Avatar src={chat.peer?.avatar_url} name={chat.peer?.name} size="md" />
              <div className="min-w-0">
                <p className="truncate font-semibold">{chat.peer?.name ?? "Someone"}</p>
                <p className="text-xs text-white/60">wants to chat</p>
              </div>
            </div>
          </div>

          <div className="flex gap-2 p-4">
            <Button
              variant="secondary"
              className="flex-1"
              disabled={chatActions.decline.isPending}
              onClick={() =>
                chatActions.decline.mutate(chat.id, {
                  onError: (e: Error) => toast.error((e as ApiError).message),
                })
              }
            >
              Decline
            </Button>
            <Button
              className="flex-1 bg-success text-white hover:bg-success"
              disabled={chatActions.accept.isPending}
              onClick={() =>
                chatActions.accept.mutate(chat.id, {
                  onSuccess: () => router.push(`/chat/${chat.id}`),
                  onError: (e: Error) => toast.error((e as ApiError).message),
                })
              }
            >
              Accept
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!ringing || !call) return null;

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
            className="flex-1 bg-success text-white hover:bg-success"
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
