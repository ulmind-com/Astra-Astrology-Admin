"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";

import { milanApi } from "@/lib/api";
import { isCallLive } from "@/types";
import type { MilanRoomSession } from "@/types/milan";

export const MILAN_KEY = ["milan"] as const;

/** Poll fast enough that a chamber opening is not missed, slow enough to be cheap. */
const POLL_MS = 4000;
const HEARTBEAT_MS = 20_000;

/** A chamber waiting for this astrologer, if any. */
export function useIncomingMilan(enabled = true) {
  return useQuery({
    queryKey: [...MILAN_KEY, "incoming"],
    queryFn: milanApi.incoming,
    enabled,
    refetchInterval: POLL_MS,
    // Keeps watching while the tab is in the background.
    refetchIntervalInBackground: true,
  });
}

export function useMilanRoom(id: string | null) {
  return useQuery({
    queryKey: [...MILAN_KEY, id],
    queryFn: () => milanApi.get(id!),
    enabled: Boolean(id),
    refetchInterval: (query) => {
      const data = query.state.data as MilanRoomSession | undefined;
      // Once it is over there is nothing left to watch.
      return data && !isCallLive(data.room.status) ? false : POLL_MS;
    },
    refetchIntervalInBackground: true,
  });
}

/**
 * Tells the server the astrologer is still in the chamber.
 *
 * The host's own check-in is what charges the minutes; this one is what
 * stops the sweeper deciding the astrologer has gone.
 */
export function useMilanHeartbeat(id: string | null, active: boolean) {
  React.useEffect(() => {
    if (!id || !active) return;
    const send = () => void milanApi.heartbeat(id).catch(() => {});
    send();
    const timer = setInterval(send, HEARTBEAT_MS);
    return () => clearInterval(timer);
  }, [id, active]);
}

export function useMilanActions() {
  const queryClient = useQueryClient();
  const refresh = () => void queryClient.invalidateQueries({ queryKey: MILAN_KEY });

  return {
    accept: useMutation({ mutationFn: milanApi.accept, onSuccess: refresh }),
    decline: useMutation({ mutationFn: milanApi.decline, onSuccess: refresh }),
    end: useMutation({
      mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
        milanApi.end(id, reason),
      onSuccess: refresh,
    }),
  };
}
