"use client";

import { X } from "lucide-react";
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

  const chat = data?.chat;
  const live = chat ? isChatLive(chat.status) : false;
  const active = chat?.status === "active";

  useChatHeartbeat(id, live);
  const seconds = useChatTimer(chat?.started_at);

  if (!ready || isLoading) return <LoadingBlock label="Opening the chat…" />;
  if (error) return <Alert tone="error">{(error as ApiError).message}</Alert>;
  if (!chat) return null;

  return (
    <div className="flex h-[calc(100dvh-8rem)] flex-col overflow-hidden rounded-2xl border border-border bg-surface">
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <Avatar src={chat.peer?.avatar_url} name={chat.peer?.name} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{chat.peer?.name ?? "Caller"}</p>
          <p className="text-xs text-muted-foreground">
            {active ? formatDuration(seconds) : CHAT_STATUS_LABELS[chat.status]}
          </p>
        </div>
        {live ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => end.mutate({ id })}
            disabled={end.isPending}
          >
            <X className="size-4" />
            End
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
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
            <p className="font-semibold">{CHAT_STATUS_LABELS[chat.status]}</p>
            {chat.duration_seconds > 0 && (
              <p className="text-sm text-muted-foreground">
                Lasted {formatDuration(chat.duration_seconds)} · {chat.message_count} messages
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
