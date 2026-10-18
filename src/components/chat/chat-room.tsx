"use client";

import { Loader2, SendHorizonal } from "lucide-react";
import * as React from "react";

import { Alert } from "@/components/ui";
import {
  isChatConfigured,
  sendMessage,
  signInToChat,
  watchMessages,
  type ChatMessage,
} from "@/lib/chat";
import { cn } from "@/lib/utils";
import type { FirebaseCredentials } from "@/types";

/**
 * The live message list and composer.
 *
 * Messages go straight from this browser to Firestore and back — our server is
 * never in the path, which is why a chat feels instant. The server's job is to
 * decide whether the conversation is open at all, and Firestore's rules refuse
 * anything written to a closed one.
 */
export function ChatRoom({
  conversationId,
  firebase,
  canSend,
  closedNotice,
}: {
  conversationId: string;
  firebase: FirebaseCredentials;
  /** False once the session is over — the rules would refuse the write anyway,
   *  but the composer should not pretend otherwise. */
  canSend: boolean;
  closedNotice?: string;
}) {
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [ready, setReady] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState("");
  const [sending, setSending] = React.useState(false);

  const bottomRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!isChatConfigured()) {
      // NEXT_PUBLIC_* values are baked in when the server starts, so a dev
      // server that was running before they were added will never see them.
      setError(
        "Chat is not configured in this build. If the Firebase keys were just " +
          "added, restart the dev server so it picks them up.",
      );
      return;
    }

    let unsubscribe: (() => void) | null = null;
    let cancelled = false;

    (async () => {
      try {
        await signInToChat(firebase.custom_token, firebase.uid);
        if (cancelled) return;

        unsubscribe = await watchMessages(
          conversationId,
          (next) => {
            if (!cancelled) {
              setMessages(next);
              setReady(true);
            }
          },
          (err) => {
            if (cancelled) return;
            // A refusal from the rules means the conversation is closed — the
            // system working. Anything else is usually a blocked request: ad
            // blockers and strict privacy modes routinely stop requests to
            // firestore.googleapis.com, and the page then looks broken for a
            // reason that has nothing to do with the app.
            const code = (err as { code?: string }).code ?? "";
            setError(
              code === "permission-denied"
                ? "This conversation is no longer open."
                : "Could not reach the chat service. An ad blocker or privacy " +
                    "extension may be blocking it — try again with it switched off.",
            );
          },
        );
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "";
        setError(
          message.includes("blocked") || message.includes("network")
            ? "Could not reach the chat service. An ad blocker or privacy " +
                "extension may be blocking it — try again with it switched off."
            : "Could not connect to the conversation.",
        );
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [conversationId, firebase.custom_token, firebase.uid]);

  // Follow the conversation as it grows.
  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;

    setSending(true);
    setDraft("");
    try {
      await sendMessage(conversationId, firebase.uid, text);
    } catch {
      // Put it back rather than losing what they typed.
      setDraft(text);
      setError("That message did not send. The chat may have ended.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {error && <Alert tone="warning" className="mb-3">{error}</Alert>}

        {!ready && !error ? (
          <p className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Connecting…
          </p>
        ) : messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No messages yet. Say hello.
          </p>
        ) : (
          <ul className="space-y-2">
            {messages.map((message) => {
              const mine = message.senderUid === firebase.uid;
              return (
                <li
                  key={message.id}
                  className={cn("flex", mine ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[78%] rounded-2xl px-3.5 py-2 text-sm",
                      mine
                        ? "rounded-br-sm bg-brand-600 text-white"
                        : "rounded-bl-sm bg-surface-muted text-foreground",
                    )}
                  >
                    <p className="whitespace-pre-wrap break-words">{message.text}</p>
                    <p
                      className={cn(
                        "mt-0.5 text-[10px]",
                        mine ? "text-white/60" : "text-muted-foreground",
                      )}
                    >
                      {message.pending || !message.sentAt
                        ? "Sending…"
                        : message.sentAt.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <div ref={bottomRef} />
      </div>

      {canSend ? (
        <form onSubmit={send} className="flex gap-2 border-t border-border p-3">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Write a message…"
            maxLength={4000}
            autoComplete="off"
            className="h-11 flex-1 rounded-xl border border-border bg-surface px-3.5 text-sm outline-none placeholder:text-muted-foreground/70 focus:border-brand-400"
          />
          <button
            type="submit"
            disabled={!draft.trim() || sending}
            aria-label="Send"
            className="flex size-11 items-center justify-center rounded-xl bg-brand-600 text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <SendHorizonal className="size-4" />
            )}
          </button>
        </form>
      ) : (
        <p className="border-t border-border px-4 py-3 text-center text-sm text-muted-foreground">
          {closedNotice ?? "This chat has ended."}
        </p>
      )}
    </div>
  );
}
