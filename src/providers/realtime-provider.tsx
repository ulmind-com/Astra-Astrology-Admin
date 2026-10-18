"use client";

/**
 * Keeps what is already on screen true.
 *
 * Rather than asking every component to subscribe, this holds the one live
 * socket and patches the React Query cache in place: a card rendered from a
 * REST response is updated the moment the backend says something changed, and
 * the component that drew it needs no knowledge of any of this.
 *
 * What arrives:
 *
 *   astrologer  — price, presence, rating, listing
 *   settings    — coin rate, recharge and session limits
 *   wallet      — this person's coins, when signed in
 *
 * And one thing arrives from nowhere at all: presence *expiring*. A panel that
 * closes drops its socket and the backend says so, but a backend that goes
 * away says nothing ever again — so a timer re-judges freshness on a tick and
 * lets those cards go grey on their own.
 *
 * For an astrologer, holding this socket *is* being online. There is no
 * heartbeat request: the connection is the signal, and it dies with the tab.
 */

import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import * as React from "react";

import { apiBase } from "@/lib/env";
import {
  isPresent,
  openLive,
  type LiveAstrologer,
  type LiveConnection,
  type LivePlatform,
} from "@/lib/realtime";
import { onSessionChange, session } from "@/lib/session";

/** How often presence is re-judged against the clock. */
const DECAY_MS = 5_000;

/** Anything the socket carries that is about a chat rather than the market. */
export type ChatEvent =
  | { type: "chat_message"; data: Record<string, unknown> }
  | { type: "chat_read"; data: Record<string, unknown> }
  | { type: "chat_ended"; data: { session_id: string; reason?: string | null } };

type ChatListener = (event: ChatEvent) => void;

type RealtimeValue = {
  astrologers: Map<string, LiveAstrologer>;
  platform: LivePlatform | null;
  connected: boolean;
  /** Subscribe to chat traffic. Returns the unsubscribe function. */
  onChat: (listener: ChatListener) => () => void;
};

const RealtimeContext = React.createContext<RealtimeValue>({
  astrologers: new Map(),
  platform: null,
  connected: false,
  onChat: () => () => {},
});

/** The shape of whatever a REST astrologer looks like, as far as patching cares. */
type PatchableAstrologer = {
  id: string;
  /** Present only on the private profile shape — see `isPrivateShape`. */
  email?: string;
  rates?: Record<string, number | null>;
  availability?: Record<string, unknown>;
  rating?: { average: number; count: number };
  is_featured?: boolean;
  total_consultations?: number;
};

/**
 * Is this the astrologer's own record rather than their public card?
 *
 * It matters because the two carry different rates. The public card shows the
 * *resolved* price, with the platform default already filled in. The private
 * record keeps the raw override, where `null` means "whatever the platform
 * charges" — and the admin screens read that null to show "using platform
 * rate" and to leave the input blank. Overwriting it with a resolved number
 * would turn every astrologer into one with a private deal, which is the bug
 * that put a 50% commission on everybody once already.
 *
 * Email is the discriminator: it is on the private shape and never on the
 * public one, which is the whole point of the public one.
 */
function isPrivateShape(astrologer: PatchableAstrologer): boolean {
  return "email" in astrologer;
}

/**
 * Overlays the live values onto one REST astrologer.
 *
 * Returns the original object when nothing differs, so React Query's identity
 * check can skip the re-render — without that, every tick of the decay timer
 * would re-render the whole directory.
 */
function merge(rest: PatchableAstrologer, live: LiveAstrologer, now: number): PatchableAstrologer {
  const next: PatchableAstrologer = {
    ...rest,
    availability: {
      ...(rest.availability ?? {}),
      // The TTL is applied here, not taken from the document: a stale card
      // still claims to be online, and only the clock can say otherwise.
      is_online: isPresent(live, now),
      is_busy: live.availability.is_busy,
      is_available_for_chat: live.availability.is_available_for_chat,
      is_available_for_call: live.availability.is_available_for_call,
      is_available_for_video: live.availability.is_available_for_video,
      last_seen_at: live.availability.last_seen_at,
    },
  };

  if (!isPrivateShape(rest)) {
    next.rates = {
      chat_coins_per_minute: live.rates.chat_coins_per_minute,
      call_coins_per_minute: live.rates.call_coins_per_minute,
      video_coins_per_minute: live.rates.video_coins_per_minute,
    };
    next.rating = { average: live.rating.average, count: live.rating.count };
    next.total_consultations = live.total_consultations;
    next.is_featured = live.is_featured;
  }

  return JSON.stringify(next) === JSON.stringify(rest) ? rest : next;
}

/** One astrologer, a list of them, or a page of them — patched in place. */
function patchValue(
  value: unknown,
  byId: Map<string, LiveAstrologer>,
  now: number,
): unknown {
  if (!value) return value;

  const one = (item: PatchableAstrologer) => {
    const live = byId.get(item?.id);
    return live ? merge(item, live, now) : item;
  };

  const patchList = (list: PatchableAstrologer[]) => {
    let touched = false;
    const next = list.map((item) => {
      const merged = one(item);
      if (merged !== item) touched = true;
      return merged;
    });
    return touched ? next : list;
  };

  if (Array.isArray(value)) {
    return patchList(value as PatchableAstrologer[]);
  }

  const page = value as { items?: PatchableAstrologer[] };
  if (Array.isArray(page.items)) {
    const items = patchList(page.items);
    return items === page.items ? value : { ...page, items };
  }

  const single = value as PatchableAstrologer;
  return single.id ? one(single) : value;
}

/**
 * Applies the live map over every astrologer sitting in the query cache.
 *
 * Matched by key rather than listed one by one, so a new screen that fetches
 * astrologers under a new key is live without anyone remembering to add it
 * here. Covers the public directory (`["astrologers", …]`), a single profile
 * (`["astrologer", slug]`) and the admin list (`["admin", "astrologers", …]`).
 */
function patchCache(client: QueryClient, byId: Map<string, LiveAstrologer>, now: number): void {
  if (byId.size === 0) return;

  client.setQueriesData(
    {
      predicate: (query) =>
        query.queryKey.some(
          (part) => typeof part === "string" && part.startsWith("astrologer"),
        ),
    },
    (old: unknown) => patchValue(old, byId, now),
  );
}

/** Only the part of `WalletSummary` this file touches. */
type WalletShape = { wallet: { balance_coins: number } };

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [astrologers, setAstrologers] = React.useState<Map<string, LiveAstrologer>>(new Map());
  const [platform, setPlatform] = React.useState<LivePlatform | null>(null);
  const [connected, setConnected] = React.useState(false);

  // Held in a ref as well as state: the decay timer needs the latest map
  // without being torn down and rebuilt every time one arrives.
  const latest = React.useRef<Map<string, LiveAstrologer>>(new Map());

  // Chat traffic is handed straight to whoever is listening rather than kept
  // in state: a chat window owns its own transcript, and storing every message
  // here as well would mean two copies drifting apart.
  const chatListeners = React.useRef<Set<ChatListener>>(new Set());
  const onChat = React.useCallback((listener: ChatListener) => {
    chatListeners.current.add(listener);
    return () => {
      chatListeners.current.delete(listener);
    };
  }, []);

  // Reopened whenever the session changes. The token is sent when the socket
  // is opened, so a socket opened as a visitor stays a visitor — signing in
  // would otherwise leave the new user with no wallet updates until they
  // reloaded the page.
  const [sessionEpoch, setSessionEpoch] = React.useState(0);
  React.useEffect(() => onSessionChange(() => setSessionEpoch((n) => n + 1)), []);

  React.useEffect(() => {
    let live: LiveConnection | null = null;

    live = openLive(apiBase, () => session.accessToken, (message) => {
      switch (message.type) {
        case "ready":
          setConnected(true);
          break;

        case "astrologer": {
          // A new Map each time, so React sees the change.
          const next = new Map(latest.current);
          next.set(message.data.id, message.data);
          latest.current = next;
          setAstrologers(next);
          patchCache(queryClient, next, Date.now());
          break;
        }

        case "settings":
          setPlatform(message.data);
          break;

        case "wallet":
          // Patched rather than invalidated: an invalidation would refetch and
          // briefly show the old number again before the new one lands. The
          // balance sits at `wallet.balance_coins`, not at the top level.
          queryClient.setQueryData<WalletShape | undefined>(["wallet"], (old) => {
            if (!old?.wallet || old.wallet.balance_coins === message.data.balance_coins) {
              return old;
            }
            return {
              ...old,
              wallet: { ...old.wallet, balance_coins: message.data.balance_coins },
            };
          });
          break;

        case "chat_message":
        case "chat_read":
        case "chat_ended":
          chatListeners.current.forEach((listener) => listener(message as ChatEvent));
          break;

        default:
          break;
      }
    });

    return () => {
      live?.close();
      setConnected(false);
    };
  }, [queryClient, sessionEpoch]);

  // Presence has to expire without anyone sending anything, so this re-judges
  // the cards on a tick. `merge` returns the same object when nothing changed,
  // so an idle tick costs no re-render.
  React.useEffect(() => {
    const timer = window.setInterval(() => {
      patchCache(queryClient, latest.current, Date.now());
    }, DECAY_MS);
    return () => window.clearInterval(timer);
  }, [queryClient]);

  const value = React.useMemo(
    () => ({ astrologers, platform, connected, onChat }),
    [astrologers, platform, connected, onChat],
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtime(): RealtimeValue {
  return React.useContext(RealtimeContext);
}

/** The live platform numbers, or null until the first message lands. */
export function usePlatform(): LivePlatform | null {
  return useRealtime().platform;
}

/** The live view of one astrologer, or null if nothing has been said about them. */
export function useLiveAstrologer(id: string | undefined): LiveAstrologer | null {
  const { astrologers } = useRealtime();
  return id ? (astrologers.get(id) ?? null) : null;
}

/** Subscribe to chat traffic for as long as the component is mounted. */
export function useChatEvents(listener: (event: ChatEvent) => void): void {
  const { onChat } = useRealtime();

  // Held in a ref so a listener that closes over changing state does not tear
  // the subscription down and rebuild it on every render.
  const ref = React.useRef(listener);
  React.useEffect(() => {
    ref.current = listener;
  }, [listener]);

  React.useEffect(() => onChat((event) => ref.current(event)), [onChat]);
}
