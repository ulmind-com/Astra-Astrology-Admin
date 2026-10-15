/**
 * The one place the app talks to the API.
 *
 * It unwraps the `{ success, message, data }` envelope, throws a real `ApiError`
 * so React Query and forms can react to it, and attaches the bearer token.
 *
 * There is no token refresh: the backend does not expose a refresh endpoint yet,
 * so a 401 ends the session rather than silently retrying.
 */

import { apiBase } from "@/lib/env";
import { session } from "@/lib/session";
import type { ApiEnvelope, ApiErrorBody, ValidationDetail } from "@/types";

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
      (this.details as ValidationDetail[]).map((d) => [d.field, d.message]),
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

export async function apiFetch<T>(path: string, options: Options = {}): Promise<T> {
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

  if (response.status === 204) return undefined as T;

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    /* a proxy error page, say — handled below */
  }

  if (!response.ok) {
    const error = payload as ApiErrorBody | null;

    if (response.status === 401 && auth) {
      session.clear();
      onUnauthorized.forEach((fn) => fn());
    }

    throw new ApiError(
      error?.message ?? `Request failed (${response.status})`,
      response.status,
      error?.error_code,
      error?.details,
    );
  }

  return (payload as ApiEnvelope<T>)?.data as T;
}

/** Same request, but keeps the `message` the API sent alongside the data. */
export async function apiFetchEnvelope<T>(
  path: string,
  options: Options = {},
): Promise<ApiEnvelope<T>> {
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
    throw new ApiError("Could not reach the server.", 0, "network_error");
  }

  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | ApiErrorBody | null;

  if (!response.ok) {
    const error = payload as ApiErrorBody | null;
    if (response.status === 401 && auth) {
      session.clear();
      onUnauthorized.forEach((fn) => fn());
    }
    throw new ApiError(
      error?.message ?? `Request failed (${response.status})`,
      response.status,
      error?.error_code,
      error?.details,
    );
  }

  return payload as ApiEnvelope<T>;
}

export const api = {
  get: <T>(path: string, options?: Options) => apiFetch<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: Options) =>
    apiFetch<T>(path, { ...options, method: "POST", body }),
  patch: <T>(path: string, body?: unknown, options?: Options) =>
    apiFetch<T>(path, { ...options, method: "PATCH", body }),
  delete: <T>(path: string, options?: Options) =>
    apiFetch<T>(path, { ...options, method: "DELETE" }),
};
