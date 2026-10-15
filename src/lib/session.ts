/**
 * Where the signed-in session lives.
 *
 * `localStorage`, because the API returns bearer tokens rather than setting a
 * cookie. The backend has **no refresh endpoint yet**, so an expired access
 * token means signing in again — `client.ts` handles that by clearing the
 * session rather than trying to refresh something that does not exist.
 *
 * Every read and write is wrapped: storage throws in private windows and when
 * site data is blocked, and the app must still render.
 */

import type { TokenPair, UserPublic } from "@/types";

const ACCESS = "astra.access_token";
const REFRESH = "astra.refresh_token";
const EXPIRES = "astra.expires_at";
const USER = "astra.user";

const isBrowser = () => typeof window !== "undefined";

function read(key: string): string | null {
  if (!isBrowser()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* private window — the session just will not survive a reload */
  }
}

/** Fires when the session changes, so every tab and component can follow. */
const listeners = new Set<() => void>();

export function onSessionChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function announce() {
  listeners.forEach((fn) => fn());
}

export const session = {
  get accessToken(): string | null {
    return read(ACCESS);
  },

  get refreshToken(): string | null {
    return read(REFRESH);
  },

  get user(): UserPublic | null {
    const raw = read(USER);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as UserPublic;
    } catch {
      return null;
    }
  },

  get isExpired(): boolean {
    const at = read(EXPIRES);
    if (!at) return true;
    const ms = new Date(at).getTime();
    return Number.isNaN(ms) || ms <= Date.now();
  },

  get isSignedIn(): boolean {
    return Boolean(read(ACCESS)) && !session.isExpired;
  },

  save(tokens: TokenPair, user?: UserPublic) {
    write(ACCESS, tokens.access_token);
    write(REFRESH, tokens.refresh_token);
    write(EXPIRES, tokens.expires_at);
    if (user) write(USER, JSON.stringify(user));
    announce();
  },

  saveUser(user: UserPublic) {
    write(USER, JSON.stringify(user));
    announce();
  },

  clear() {
    if (!isBrowser()) return;
    try {
      [ACCESS, REFRESH, EXPIRES, USER].forEach((k) => window.localStorage.removeItem(k));
    } catch {
      /* nothing to do */
    }
    announce();
  },
};
