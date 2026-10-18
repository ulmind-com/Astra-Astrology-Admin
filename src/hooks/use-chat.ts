"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";

import { chatApi } from "@/lib/api";
import { isChatLive, type ChatSession } from "@/types";

export const CHAT_KEY = ["chat"] as const;

const POLL_MS = 3000;
const HEARTBEAT_MS = 30_000;

/** The chat this account is in, if any. */
export function useActiveChat(enabled = true) {
  return useQuery({
    queryKey: CHAT_KEY,
    queryFn: chatApi.active,
    enabled,
    refetchInterval: POLL_MS,
    refetchIntervalInBackground: true,
  });
}

export function useChat(id: string | null) {
  return useQuery({
    queryKey: [...CHAT_KEY, id],
    queryFn: () => chatApi.get(id!),
    enabled: Boolean(id),
    refetchInterval: (query) => {
      const data = query.state.data as ChatSession | undefined;
      return data && !isChatLive(data.chat.status) ? false : POLL_MS;
    },
    refetchIntervalInBackground: true,
  });
}

/**
 * Keeps the session alive.
 *
 * A chat has no stream to watch, so without this the server cannot tell a
 * thoughtful pause from a closed tab — and it has to be able to, or an
 * abandoned chat would hold both people hostage.
 */
export function useChatHeartbeat(id: string | null, active: boolean) {
  React.useEffect(() => {
    if (!id || !active) return;
    const send = () => void chatApi.heartbeat(id).catch(() => {});
    send();
    const timer = setInterval(send, HEARTBEAT_MS);
    return () => clearInterval(timer);
  }, [id, active]);
}

export function useChatActions() {
  const queryClient = useQueryClient();
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: CHAT_KEY });
  };

  return {
    accept: useMutation({ mutationFn: (id: string) => chatApi.accept(id), onSuccess: refresh }),
    decline: useMutation({ mutationFn: (id: string) => chatApi.decline(id), onSuccess: refresh }),
    end: useMutation({
      mutationFn: ({ id, reason }: { id: string; reason?: string }) => chatApi.end(id, reason),
      onSuccess: refresh,
    }),
  };
}

export function useChatTimer(startedAt: string | null | undefined): number {
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
