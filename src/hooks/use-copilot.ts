"use client";

import { useQuery } from "@tanstack/react-query";

import { callApi } from "@/lib/api";

export const COPILOT_KEY = ["copilot"] as const;

/** The dasha moves by days, not seconds. Refreshed only on a long interval so
 *  a panel left open through a whole session cannot hammer the backend. */
const REFRESH_MS = 5 * 60 * 1000;

/**
 * The Co-Pilot summary for a live call.
 *
 * `enabled` is the caller's judgement about whether this viewer is the
 * astrologer on a live call; nothing is requested while it is false, so a
 * session where the panel is never opened costs nothing.
 */
export function useCoPilot(callId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: [...COPILOT_KEY, callId],
    queryFn: () => callApi.copilot(callId!),
    enabled: Boolean(callId) && enabled,
    refetchInterval: REFRESH_MS,
    // Derived from a saved chart, so what is already on screen stays valid
    // while a refresh is in flight.
    staleTime: REFRESH_MS,
    retry: 1,
  });
}
