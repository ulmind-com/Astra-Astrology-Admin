"use client";

/**
 * The live socket.
 *
 * One WebSocket to our own backend, carrying everything a screen needs to stay
 * true: astrologer cards, platform rates, and — when signed in — this person's
 * coin balance. MongoDB is the database behind all of it; this only delivers
 * what MongoDB has already accepted.
 *
 * Not Firestore. Firebase is kept for authentication and the chat transcript;
 * paying a document write for every minute of every consultation to make a
 * price update appear is not a trade worth making when we own a socket.
 *
 * The connection looks after itself: it reconnects with a widening backoff, it
 * pings so a half-open socket is noticed rather than silently believed, and it
 * gives up gracefully if the backend has no socket at all — REST still works,
 * so a failure here is a slower screen, never a broken one.
 */

export type LiveRates = {
  chat_coins_per_minute: number;
  call_coins_per_minute: number;
  video_coins_per_minute: number;
};

export type LiveAvailability = {
  is_online: boolean;
  is_busy: boolean;
  is_available_for_chat: boolean;
  is_available_for_call: boolean;
  is_available_for_video: boolean;
  /** When their panel last reported in. Null means never, or switched off. */
  last_seen_at: string | null;
  /** How long a report stays good for — sent by the server, not assumed here. */
  ttl_seconds: number;
};

export type LiveAstrologer = {
  id: string;
  slug: string | null;
  display_name: string;
  is_listed: boolean;
  is_featured: boolean;
  modes_enabled: string[];
  rates: LiveRates;
  rating: { average: number; count: number };
  total_consultations: number;
  availability: LiveAvailability;
};

export type LivePlatform = {
  coins_per_rupee: number;
  min_recharge_paise: number;
  max_recharge_paise: number;
  default_rates: LiveRates;
  min_session_minutes: number;
  max_session_minutes: number;
};

import type { FeaturePricingItem } from "@/types";

export type LiveMessage =
  | { type: "ready"; data: { signed_in: boolean } }
  | { type: "pong" }
  | { type: "astrologer"; data: LiveAstrologer }
  | { type: "settings"; data: LivePlatform }
  | { type: "feature_pricing"; data: Record<string, FeaturePricingItem> }
  | { type: "wallet"; data: { balance_coins: number } }
  // Chat traffic. Typed loosely here on purpose: the chat client owns the
  // shape of a message, and repeating it in two places would be one more
  // thing to keep in step.
  | { type: "chat_message"; data: Record<string, string> }
  | { type: "chat_read"; data: Record<string, string> }
  | { type: "chat_ended"; data: { session_id: string; reason?: string | null } };

/**
 * Whether this astrologer is actually at their desk.
 *
 * The same two-part test the backend applies, repeated here on purpose. If the
 * backend goes away, the last message anyone received still says they are
 * online — only the clock can reveal that it has gone stale. Without this a
 * card would stay green until something came back to correct it.
 */
export function isPresent(astrologer: LiveAstrologer, now: number = Date.now()): boolean {
  const { is_online, last_seen_at, ttl_seconds } = astrologer.availability;
  if (!is_online || !last_seen_at) return false;
  const seen = Date.parse(last_seen_at);
  if (Number.isNaN(seen)) return false;
  return now - seen <= ttl_seconds * 1000;
}

/** How often we prove the socket is still alive. */
const PING_MS = 25_000;
/** Reconnect delay: grows on repeated failure so a dead backend is not hammered. */
const RECONNECT_MIN_MS = 1_000;
const RECONNECT_MAX_MS = 30_000;

function socketUrl(apiBase: string, token: string | null): string {
  // Same origin and scheme as the API, upgraded to ws/wss.
  const base = apiBase.replace(/^http/, "ws");
  const url = new URL(`${base}/live`);
  if (token) url.searchParams.set("token", token);
  return url.toString();
}

export type LiveConnection = { close: () => void };

/**
 * Opens the socket and keeps it open.
 *
 * Returns a handle whose `close()` stops everything, including any pending
 * reconnect — so a component unmounting cannot leave a socket reopening behind
 * it for the rest of the session.
 */
export function openLive(
  apiBase: string,
  getToken: () => string | null,
  onMessage: (message: LiveMessage) => void,
): LiveConnection {
  let socket: WebSocket | null = null;
  let pingTimer: number | undefined;
  let retryTimer: number | undefined;
  let backoff = RECONNECT_MIN_MS;
  let closed = false;

  const clearTimers = () => {
    window.clearInterval(pingTimer);
    window.clearTimeout(retryTimer);
  };

  const scheduleReconnect = () => {
    if (closed) return;
    retryTimer = window.setTimeout(connect, backoff);
    backoff = Math.min(backoff * 2, RECONNECT_MAX_MS);
  };

  function connect() {
    if (closed) return;
    try {
      socket = new WebSocket(socketUrl(apiBase, getToken()));
    } catch {
      scheduleReconnect();
      return;
    }

    socket.onopen = () => {
      // Only a connection that actually opened resets the backoff; otherwise a
      // backend that accepts and immediately drops would be retried forever at
      // full speed.
      backoff = RECONNECT_MIN_MS;
      window.clearInterval(pingTimer);
      pingTimer = window.setInterval(() => {
        if (socket?.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: "ping" }));
        }
      }, PING_MS);
    };

    socket.onmessage = (event) => {
      try {
        onMessage(JSON.parse(event.data as string) as LiveMessage);
      } catch {
        /* a message we do not understand is not worth dropping the socket for */
      }
    };

    socket.onclose = () => {
      window.clearInterval(pingTimer);
      scheduleReconnect();
    };

    // `onerror` is always followed by `onclose`, which already reconnects.
    socket.onerror = () => {};
  }

  connect();

  return {
    close: () => {
      closed = true;
      clearTimers();
      // Detached first, so the close does not schedule another reconnect.
      if (socket) {
        socket.onclose = null;
        socket.onerror = null;
        socket.close();
      }
    },
  };
}
