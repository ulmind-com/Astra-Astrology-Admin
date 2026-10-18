"use client";

import { Clock, MessageSquare } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";

import { ChatRoom } from "@/components/chat/chat-room";
import { Alert, Avatar, Button, LoadingBlock } from "@/components/ui";
import { useChat, useChatActions, useChatHeartbeat, useChatTimer } from "@/hooks/use-chat";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { useAuth, useRequireAuth } from "@/providers/auth-provider";
import {
  CHAT_STATUS_LABELS,
  formatDuration,
  isChatLive,
  type SessionBilling,
} from "@/types";

export default function AstrologerChatPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { ready } = useRequireAuth({ roles: ["astrologer"], signInPath: "/login" });

  const { user } = useAuth();
  const { data, isLoading, error } = useChat(ready ? id : null);
  const { end } = useChatActions();
  const [confirming, setConfirming] = React.useState(false);

  const chat = data?.chat;
  const live = chat ? isChatLive(chat.status) : false;
  const active = chat?.status === "active";

  useChatHeartbeat(id, live);
  const seconds = useChatTimer(chat?.started_at);

  if (!ready || isLoading) return <LoadingBlock label="Opening the chat…" />;
  if (error) return <Alert tone="error">{(error as ApiError).message}</Alert>;
  if (!chat) return null;

  return (
    <div className="flex h-[calc(100dvh-7rem)] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <Avatar src={chat.peer?.avatar_url} name={chat.peer?.name} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight">
            {chat.peer?.name ?? "Caller"}
          </p>
          <p className="flex items-center gap-1.5 text-xs leading-tight text-muted-foreground">
            {active ? (
              <>
                <span className="size-1.5 rounded-full bg-success" />
                {formatDuration(seconds)}
              </>
            ) : (
              CHAT_STATUS_LABELS[chat.status]
            )}
          </p>
        </div>

        {live ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              if (!confirming) {
                setConfirming(true);
                setTimeout(() => setConfirming(false), 4000);
                return;
              }
              end.mutate({ id });
            }}
            disabled={end.isPending}
            className={confirming ? "bg-rose-600 text-brand-950 hover:bg-rose-500" : undefined}
          >
            {confirming ? "Tap to confirm" : "End chat"}
          </Button>
        ) : (
          <Button size="sm" variant="secondary" onClick={() => router.replace("/me")}>
            Back
          </Button>
        )}
      </header>

      {chat.billing && active && (
        <div className="border-b border-border px-3 py-2">
          <BookedTime billing={chat.billing} elapsedSeconds={seconds} />
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        {live ? (
          <ChatRoom
            sessionId={chat.id}
            myUserId={user?.id ?? ""}
            canSend={active}
            peerName={chat.peer?.name}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
            <span className="flex size-16 items-center justify-center rounded-full bg-surface-muted">
              <MessageSquare className="size-6 text-muted-foreground" />
            </span>
            <div>
              <p className="text-lg font-semibold">{CHAT_STATUS_LABELS[chat.status]}</p>
              {chat.duration_seconds > 0 && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatDuration(chat.duration_seconds)} · {chat.message_count}{" "}
                  {chat.message_count === 1 ? "message" : "messages"}
                </p>
              )}
            </div>
            <Button variant="secondary" onClick={() => router.replace("/me")}>
              Back to my profile
            </Button>
          </div>
        )}
      </div>
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
            ? "bg-ink-900/5 text-ink-700"
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