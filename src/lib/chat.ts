"use client";

/**
 * The chat client.
 *
 * Messages live in MongoDB and arrive over the same live socket as everything
 * else. The browser never touches a database: it loads the transcript with one
 * request, then listens, and posts what the person types back to the API.
 *
 * Firebase is not involved. It was, once — the browser subscribed to Firestore
 * directly — but that charged a document write for every line of every
 * consultation, and the rules needed to make it safe were a second place for
 * the "is this chat still open?" decision to live. Now there is one place: the
 * server, which refuses a message to a closed session whatever the client
 * tries.
 */

import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";

export type ChatMessage = {
  id: string;
  senderId: string;
  text: string;
  /** Null only for a message still in flight from this browser. */
  sentAt: Date | null;
  /** True while this browser's own send has not been confirmed. */
  pending: boolean;
};

export type ReadMarker = {
  userId: string;
  deliveredAt: Date | null;
  readAt: Date | null;
};

/** How far a message has got, WhatsApp-style. */
export type DeliveryState = "pending" | "sent" | "delivered" | "read";

type MessageWire = {
  id: string;
  session_id: string;
  sender_id: string;
  text: string;
  sent_at: string;
};

type MarkerWire = {
  user_id: string;
  delivered_at: string | null;
  read_at: string | null;
};

function toDate(value: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function toMessage(wire: MessageWire): ChatMessage {
  return {
    id: wire.id,
    senderId: wire.sender_id,
    text: wire.text,
    sentAt: toDate(wire.sent_at),
    pending: false,
  };
}

export function toMarker(wire: MarkerWire): ReadMarker {
  return {
    userId: wire.user_id,
    deliveredAt: toDate(wire.delivered_at),
    readAt: toDate(wire.read_at),
  };
}

/**
 * Works out a message's tick from the other person's markers.
 *
 * The comparison is against *their* timestamps rather than anything stored on
 * the message, which is why marking a long conversation read costs one small
 * write instead of one per message.
 */
export function deliveryStateOf(
  message: ChatMessage,
  peerMarker: ReadMarker | null,
): DeliveryState {
  if (message.pending || !message.sentAt) return "pending";
  if (!peerMarker) return "sent";
  if (peerMarker.readAt && peerMarker.readAt >= message.sentAt) return "read";
  if (peerMarker.deliveredAt && peerMarker.deliveredAt >= message.sentAt) return "delivered";
  return "sent";
}

/**
 * The conversation so far.
 *
 * May legitimately come back empty: messages are removed some time after a
 * chat ends, and how long is the admin's to set. The session and what it cost
 * are kept either way.
 */
export async function loadTranscript(
  sessionId: string,
): Promise<{ messages: ChatMessage[]; reads: ReadMarker[] }> {
  const data = await api.get<{ messages: MessageWire[]; reads: MarkerWire[] }>(
    endpoints.chats.messages(sessionId),
  );
  return {
    messages: (data.messages ?? []).map(toMessage),
    reads: (data.reads ?? []).map(toMarker),
  };
}

/** Sends one message. Refused by the server if the chat has ended. */
export async function sendMessage(sessionId: string, text: string): Promise<ChatMessage> {
  const wire = await api.post<MessageWire>(endpoints.chats.messages(sessionId), { text });
  return toMessage(wire);
}

/**
 * Says how far this person has got.
 *
 * `delivered` means their app has the messages; `read` means they were
 * actually looking.
 */
export async function markProgress(
  sessionId: string,
  level: "delivered" | "read",
): Promise<void> {
  await api.post(endpoints.chats.read(sessionId), { level });
}
