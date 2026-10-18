"use client";

import { MessageSquare } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";

import { ChatRoom } from "@/components/chat/chat-room";
import { Alert, Avatar, Button, LoadingBlock } from "@/components/ui";
import { useChat, useChatActions, useChatHeartbeat, useChatTimer } from "@/hooks/use-chat";
import { ApiError } from "@/lib/api/client";
import { useRequireAuth } from "@/providers/auth-provider";
import { CHAT_STATUS_LABELS, formatDuration, isChatLive } from "@/types";

export default function AstrologerChatPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { ready } = useRequireAuth({ roles: ["astrologer"], signInPath: "/login" });

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
                <span className="size-1.5 rounded-full bg-emerald-500" />
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
            className={confirming ? "bg-red-600 text-white hover:bg-red-700" : undefined}
          >
            {confirming ? "Tap to confirm" : "End chat"}
          </Button>
        ) : (
          <Button size="sm" variant="secondary" onClick={() => router.replace("/me")}>
            Back
          </Button>
        )}
      </header>

      <div className="flex-1 overflow-hidden">
        {data?.firebase ? (
          <ChatRoom
            conversationId={chat.conversation_id}
            firebase={data.firebase}
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
