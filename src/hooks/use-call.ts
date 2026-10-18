"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";

import { callApi } from "@/lib/api";
import { isCallLive, type CallSession } from "@/types";

export const CALL_KEY = ["call"] as const;

/** Poll fast enough that a ring is not missed, slow enough to be cheap. */
const POLL_MS = 3000;
const HEARTBEAT_MS = 20_000;

/** The call this account is on, if any. Polled, so both sides stay in step. */
export function useActiveCall(enabled = true) {
  return useQuery({
    queryKey: CALL_KEY,
    queryFn: callApi.active,
    enabled,
    refetchInterval: POLL_MS,
    // Keeps ringing while the tab is in the background.
    refetchIntervalInBackground: true,
  });
}

export function useCall(id: string | null) {
  return useQuery({
    queryKey: [...CALL_KEY, id],
    queryFn: () => callApi.get(id!),
    enabled: Boolean(id),
    refetchInterval: (query) => {
      const data = query.state.data as CallSession | undefined;
      // Once it is over there is nothing left to watch.
      return data && !isCallLive(data.call.status) ? false : POLL_MS;
    },
    refetchIntervalInBackground: true,
  });
}

/**
 * Tells the server we are still on the call.
 *
 * Without this the server cannot tell a quiet call from a closed laptop, and
 * the sweeper would either cut live calls short or leave dead ones open.
 */
export function useCallHeartbeat(id: string | null, active: boolean) {
  React.useEffect(() => {
    if (!id || !active) return;
    const send = () => void callApi.heartbeat(id).catch(() => {});
    send();
    const timer = setInterval(send, HEARTBEAT_MS);
    return () => clearInterval(timer);
  }, [id, active]);
}

export function useCallActions() {
  const queryClient = useQueryClient();
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: CALL_KEY });
  };

  return {
    accept: useMutation({ mutationFn: (id: string) => callApi.accept(id), onSuccess: refresh }),
    decline: useMutation({ mutationFn: (id: string) => callApi.decline(id), onSuccess: refresh }),
    end: useMutation({
      mutationFn: ({ id, reason }: { id: string; reason?: string }) => callApi.end(id, reason),
      onSuccess: refresh,
    }),
  };
}

/** Counts up from the moment the call was answered, using the server's clock. */
export function useCallTimer(startedAt: string | null | undefined): number {
  const [seconds, setSeconds] = React.useState(0);

  React.useEffect(() => {
    if (!startedAt) {
      setSeconds(0);
      return;
    }
    const started = new Date(startedAt).getTime();
    const tick = () => setSeconds(Math.max(0, Math.floor((Date.now() - started) / 1000)));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [startedAt]);

  return seconds;
}
