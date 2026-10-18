"use client";

import { ArrowDown, Loader2, SendHorizonal } from "lucide-react";
import * as React from "react";

import { DeliveryTicks } from "@/components/chat/delivery-ticks";
import { Alert } from "@/components/ui";
import {
  deliveryStateOf,
  loadTranscript,
  markProgress,
  sendMessage,
  toMarker,
  toMessage,
  type ChatMessage,
  type ReadMarker,
} from "@/lib/chat";
import { cn } from "@/lib/utils";
import { useChatEvents } from "@/providers/realtime-provider";

/** "Today" and "Yesterday" read better than a date nobody needs to parse. */
function dayLabel(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(date, today)) return "Today";
  if (same(date, yesterday)) return "Yesterday";
  return date.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
}

function clockTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function ChatRoom({
  sessionId,
  myUserId,
  canSend,
  peerName,
  closedNotice,
}: {
  sessionId: string;
  /** This person's own id, which is how their messages are told apart. */
  myUserId: string;
  canSend: boolean;
  peerName?: string | null;
  closedNotice?: string;
}) {
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [markers, setMarkers] = React.useState<Record<string, ReadMarker>>({});
  const [ready, setReady] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [atBottom, setAtBottom] = React.useState(true);

  const scrollRef = React.useRef<HTMLDivElement>(null);
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const boxRef = React.useRef<HTMLTextAreaElement>(null);

  // ----------------------------------------------------------- connect
  //
  // One request for the transcript, then the socket keeps it current. The
  // socket is already open for the rest of the app, so joining a chat costs
  // nothing more than a listener.
  React.useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const { messages: loaded, reads } = await loadTranscript(sessionId);
        if (cancelled) return;
        setMessages(loaded);
        setMarkers(Object.fromEntries(reads.map((r) => [r.userId, r])));
        setReady(true);
      } catch {
        if (!cancelled) setError("Could not load this conversation.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  useChatEvents(
    React.useCallback(
      (event) => {
        const data = event.data as Record<string, string>;
        if (data.session_id !== sessionId) return;

        if (event.type === "chat_message") {
          setMessages((current) => {
            // The sender already added this optimistically, and the server
            // echo arrives for both sides — so never add it twice.
            if (current.some((m) => m.id === data.id)) return current;
            const incoming = toMessage(data as never);
            // Replace this browser's own pending copy rather than appending a
            // duplicate beside it.
            const pendingIndex = current.findIndex(
              (m) => m.pending && m.senderId === incoming.senderId && m.text === incoming.text,
            );
            if (pendingIndex >= 0) {
              const next = [...current];
              next[pendingIndex] = incoming;
              return next;
            }
            return [...current, incoming];
          });
        }

        if (event.type === "chat_read") {
          const marker = toMarker(data as never);
          setMarkers((current) => ({ ...current, [marker.userId]: marker }));
        }

        if (event.type === "chat_ended") {
          setMessages((current) => current);
        }
      },
      [sessionId],
    ),
  );

  // ------------------------------------------------------------ receipts
  const lastIncoming = React.useMemo(
    () => messages.filter((m) => m.senderId !== myUserId).at(-1)?.id ?? null,
    [messages, myUserId],
  );

  React.useEffect(() => {
    if (!ready || !lastIncoming) return;

    // Delivered as soon as this app has them; read only when the tab is
    // actually in front of someone. Marking read while the window is hidden
    // would be a lie the other person can see.
    const level = () => (document.visibilityState === "visible" ? "read" : "delivered");
    const mark = () => void markProgress(sessionId, level()).catch(() => {});

    mark();
    document.addEventListener("visibilitychange", mark);
    return () => document.removeEventListener("visibilitychange", mark);
  }, [ready, lastIncoming, sessionId]);

  // ------------------------------------------------------------ scrolling
  const scrollToBottom = React.useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  }, []);

  React.useEffect(() => {
    // Only follow along if they were already at the bottom — yanking someone
    // away from older messages they are reading is maddening.
    if (atBottom) scrollToBottom(messages.length > 1);
  }, [messages.length, atBottom, scrollToBottom]);

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 80);
  }

  // -------------------------------------------------------------- sending
  async function submit() {
    const text = draft.trim();
    if (!text || sending) return;

    setSending(true);
    setDraft("");

    // Shown straight away as pending, so typing feels immediate; the server's
    // echo replaces it with the stored message a moment later.
    const optimistic: ChatMessage = {
      id: `pending-${Date.now()}`,
      senderId: myUserId,
      text,
      sentAt: null,
      pending: true,
    };
    setMessages((current) => [...current, optimistic]);
    setAtBottom(true);

    try {
      const saved = await sendMessage(sessionId, text);
      setMessages((current) =>
        current.some((m) => m.id === saved.id)
          ? current.filter((m) => m.id !== optimistic.id)
          : current.map((m) => (m.id === optimistic.id ? saved : m)),
      );
    } catch {
      setMessages((current) => current.filter((m) => m.id !== optimistic.id));
      setDraft(text); // never lose what they typed
      setError("That message did not send. The chat may have ended.");
    } finally {
      setSending(false);
      boxRef.current?.focus();
    }
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends, Shift+Enter makes a new line — what everyone expects.
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  }

  const peerId = Object.keys(markers).find((id) => id !== myUserId) ?? null;
  const peerMarker = peerId ? markers[peerId] : null;

  let lastDay = "";

  return (
    <div className="flex h-full flex-col bg-surface-muted/40">
      {/* ------------------------------------------------------ messages */}
      <div className="relative flex-1 overflow-hidden">
        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="h-full overflow-y-auto px-3 py-4 sm:px-4"
        >
          {error && (
            <Alert tone="warning" className="mb-3">
              {error}
            </Alert>
          )}

          {!ready && !error ? (
            <p className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Connecting…
            </p>
          ) : messages.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm font-medium">
                {peerName ? `You are connected with ${peerName}` : "You are connected"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Say hello and ask your question.
              </p>
            </div>
          ) : (
            <ul className="space-y-1">
              {messages.map((message, index) => {
                const mine = message.senderId === myUserId;
                const previous = messages[index - 1];
                // Group runs from the same person so the thread reads as turns
                // rather than a wall of identical bubbles.
                const grouped = previous?.senderId === message.senderId;

                const day = message.sentAt ? dayLabel(message.sentAt) : "";
                const newDay = Boolean(day) && day !== lastDay;
                if (newDay) lastDay = day;

                return (
                  <React.Fragment key={message.id}>
                    {newDay && (
                      <li className="flex justify-center py-3">
                        <span className="rounded-full bg-surface px-3 py-1 text-[11px] font-medium text-muted-foreground shadow-sm">
                          {day}
                        </span>
                      </li>
                    )}
                    <li
                      className={cn(
                        "flex",
                        mine ? "justify-end" : "justify-start",
                        grouped && !newDay ? "mt-0.5" : "mt-2",
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[82%] px-3.5 py-2 text-sm shadow-sm sm:max-w-[70%]",
                          mine
                            ? "rounded-2xl rounded-br-md bg-brand-600 text-white"
                            : "rounded-2xl rounded-bl-md bg-surface text-foreground",
                        )}
                      >
                        <p className="whitespace-pre-wrap break-words leading-relaxed">
                          {message.text}
                        </p>
                        <span
                          className={cn(
                            "mt-1 flex items-center justify-end gap-1 text-[10px]",
                            mine ? "text-white/70" : "text-muted-foreground",
                          )}
                        >
                          {message.sentAt ? clockTime(message.sentAt) : "…"}
                          {mine && <DeliveryTicks state={deliveryStateOf(message, peerMarker)} />}
                        </span>
                      </div>
                    </li>
                  </React.Fragment>
                );
              })}
            </ul>
          )}
          <div ref={bottomRef} />
        </div>

        {!atBottom && messages.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setAtBottom(true);
              scrollToBottom();
            }}
            aria-label="Jump to the latest message"
            className="absolute bottom-3 right-4 flex size-9 items-center justify-center rounded-full bg-surface shadow-lg ring-1 ring-border transition-transform hover:scale-105"
          >
            <ArrowDown className="size-4" />
          </button>
        )}
      </div>

      {/* ----------------------------------------------------- composer */}
      {canSend ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          className="flex items-end gap-2 border-t border-border bg-surface p-2.5 sm:p-3"
        >
          <textarea
            ref={boxRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Write a message…"
            rows={1}
            maxLength={4000}
            className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-border bg-surface-muted/60 px-4 py-2.5 text-sm leading-relaxed outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-brand-400"
          />
          <button
            type="submit"
            disabled={!draft.trim() || sending}
            aria-label="Send message"
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white transition-all hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {sending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <SendHorizonal className="size-4" />
            )}
          </button>
        </form>
      ) : (
        <p className="border-t border-border bg-surface px-4 py-3.5 text-center text-sm text-muted-foreground">
          {closedNotice ?? "This chat has ended."}
        </p>
      )}
    </div>
  );
}
