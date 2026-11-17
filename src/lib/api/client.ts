/**
 * The one place the app talks to the API.
 *
 * It unwraps the `{ success, message, data }` envelope, throws a real `ApiError`
 * so React Query and forms can react to it, and attaches the bearer token.
 *
 * A 401 is handled once, in `send` below: the refresh token is exchanged for
 * a new pair and the request is retried. Only if that fails does the session
 * end — an astrologer mid-consultation must not be signed out just because
 * their access token reached the end of its day.
 */

import { endpoints } from "@/lib/api/endpoints";
import { apiBase } from "@/lib/env";
import { session } from "@/lib/session";
import type { ApiEnvelope, ApiErrorBody, TokenPair, ValidationDetail } from "@/types";

/**
 * Pydantic prefixes a custom validator's message with "Value error, ". Useful
 * in a stack trace, noise next to a form field.
 */
function tidyMessage(message: string): string {
  const cleaned = message.replace(/^Value error,\s*/i, "");
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

/**
 * A 401 normally means the token is gone, so the session ends. These codes mean
 * something else: a password or Google credential the user just typed was wrong.
 * Ending the session there would sign someone out for a typo.
 */
const CREDENTIAL_CODES = new Set([
  "invalid_password",
  "password_not_set",
  "invalid_id_token",
  "user_not_found",
  // "You are not signed in" on a locked lesson, which is not a dead session.
  "sign_in_required",
]);

function endsSession(status: number, code: string | undefined): boolean {
  return status === 401 && !(code && CREDENTIAL_CODES.has(code));
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: ApiErrorBody["details"];

  constructor(
    message: string,
    status: number,
    code = "unknown_error",
    details?: ApiErrorBody["details"],
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** `{ field: message }`, ready to drop into a form. */
  get fieldErrors(): Record<string, string> {
    if (!Array.isArray(this.details)) return {};
    return Object.fromEntries(
      (this.details as ValidationDetail[]).map((d) => [d.field, tidyMessage(d.message)]),
    );
  }

  get isUnauthorized() {
    return this.status === 401;
  }

  get isOffline() {
    return this.status === 0;
  }
}

type Query = Record<string, string | number | boolean | undefined | null>;

type Options = Omit<RequestInit, "body" | "method"> & {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  query?: Query;
  /** Set false for endpoints that must stay anonymous. */
  auth?: boolean;
};

function buildUrl(path: string, query?: Query): string {
  const url = new URL(`${apiBase}${path.startsWith("/") ? path : `/${path}`}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

/** Lets the auth provider sign the user out when the token stops working. */
const onUnauthorized = new Set<() => void>();

export function onAuthExpired(fn: () => void): () => void {
  onUnauthorized.add(fn);
  return () => onUnauthorized.delete(fn);
}

/**
 * Exchanges the refresh token for a new pair.
 *
 * Single-flight: a panel screen fires several requests at once, and if each
 * refreshed on its own the later ones would be rotating a token the earlier
 * ones had already replaced, and all but one would be signed out.
 */
let refreshInFlight: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  const token = session.refreshToken;
  if (!token) return false;

  refreshInFlight ??= (async () => {
    try {
      const response = await fetch(buildUrl(endpoints.auth.refresh), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: token }),
      });
      if (!response.ok) return false;
      const payload = (await response.json()) as ApiEnvelope<TokenPair>;
      if (!payload?.data?.access_token) return false;
      session.save(payload.data);
      return true;
    } catch {
      // Offline. Not a dead session — leave it alone and let the original
      // request surface the network error.
      return false;
    } finally {
      setTimeout(() => {
        refreshInFlight = null;
      }, 0);
    }
  })();

  return refreshInFlight;
}

type Sent = { response: Response; payload: unknown };

async function send(path: string, options: Options): Promise<Sent> {
  const { method = "GET", body, query, auth = true, ...rest } = options;

  const headers = new Headers(rest.headers);
  const isFormData = body instanceof FormData;
  if (body !== undefined && !isFormData) headers.set("Content-Type", "application/json");
  if (auth) {
    const token = session.accessToken;
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      ...rest,
      method,
      headers,
      body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      "Could not reach the server. Check your connection and try again.",
      0,
      "network_error",
    );
  }

  if (response.status === 204) return { response, payload: null };

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    /* a proxy error page, say — handled by the caller */
  }
  return { response, payload };
}

/** One request, with a single retry after refreshing an expired token. */
async function sendWithRefresh(path: string, options: Options): Promise<Sent> {
  const sent = await send(path, options);
  const { response } = sent;
  const auth = options.auth ?? true;

  if (response.ok || response.status !== 401 || !auth) return sent;

  const code = (sent.payload as ApiErrorBody | null)?.error_code;
  if (code && CREDENTIAL_CODES.has(code)) return sent;
  if (!session.refreshToken) return sent;

  const refreshed = await refreshSession();
  if (refreshed) return send(path, options);

  // The refresh token is gone too, so this session is over. Clear it and try
  // once more as a visitor: the catalogue and other open pages must still
  // render rather than showing an error to someone who simply came back
  // after a month. A page that genuinely needs an account answers 401 again,
  // which is what it would have done anyway.
  session.clear();
  onUnauthorized.forEach((fn) => fn());
  return send(path, { ...options, auth: false });
}

function raise(sent: Sent, auth: boolean): never {
  const error = sent.payload as ApiErrorBody | null;

  if (auth && endsSession(sent.response.status, error?.error_code)) {
    session.clear();
    onUnauthorized.forEach((fn) => fn());
  }

  throw new ApiError(
    error?.message ?? `Request failed (${sent.response.status})`,
    sent.response.status,
    error?.error_code,
    error?.details,
  );
}

export async function apiFetch<T>(path: string, options: Options = {}): Promise<T> {
  const sent = await sendWithRefresh(path, options);
  if (!sent.response.ok) raise(sent, options.auth ?? true);
  if (sent.response.status === 204) return undefined as T;
  return (sent.payload as ApiEnvelope<T>)?.data as T;
}

/** Same request, but keeps the `message` the API sent alongside the data. */
export async function apiFetchEnvelope<T>(
  path: string,
  options: Options = {},
): Promise<ApiEnvelope<T>> {
  const sent = await sendWithRefresh(path, options);
  if (!sent.response.ok) raise(sent, options.auth ?? true);
  return sent.payload as ApiEnvelope<T>;
}

export const api = {
  get: <T>(path: string, options?: Options) => apiFetch<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: Options) =>
    apiFetch<T>(path, { ...options, method: "POST", body }),
  put: <T>(path: string, body?: unknown, options?: Options) =>
    apiFetch<T>(path, { ...options, method: "PUT", body }),
  patch: <T>(path: string, body?: unknown, options?: Options) =>
    apiFetch<T>(path, { ...options, method: "PATCH", body }),
  delete: <T>(path: string, options?: Options) =>
    apiFetch<T>(path, { ...options, method: "DELETE" }),
};
