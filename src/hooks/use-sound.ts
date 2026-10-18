"use client";

/**
 * The two sounds the app makes.
 *
 * Browsers refuse to play audio until the person has interacted with the page
 * at least once — which is exactly the case that matters here, since a call
 * can arrive on a tab that has been sitting untouched. So the first click,
 * key press or touch anywhere unlocks playback for the rest of the session,
 * and until then a refused play is swallowed rather than thrown: a missing
 * ring is a worse experience, not a broken one.
 *
 * Both files are loaded lazily, the first time something wants to play them,
 * so a page that never rings never fetches them.
 */

import * as React from "react";

export type SoundName = "ring" | "notify";

const SOURCES: Record<SoundName, string> = {
  // Loops while a call is ringing.
  ring: "/video_call.mp3",
  // One short alert when a request arrives.
  notify: "/notification.mp3",
};

const VOLUME: Record<SoundName, number> = {
  ring: 0.8,
  notify: 0.6,
};

const elements = new Map<SoundName, HTMLAudioElement>();

/** True once the person has interacted and the browser will allow audio. */
let unlocked = false;

function markUnlocked() {
  unlocked = true;
}

if (typeof window !== "undefined") {
  // `once` on each: the first interaction of any kind is enough, and the
  // listeners remove themselves rather than lingering on every page.
  for (const event of ["pointerdown", "keydown", "touchstart"] as const) {
    window.addEventListener(event, markUnlocked, { once: true, passive: true });
  }
}

function element(name: SoundName): HTMLAudioElement {
  let audio = elements.get(name);
  if (!audio) {
    audio = new Audio(SOURCES[name]);
    audio.preload = "auto";
    audio.volume = VOLUME[name];
    elements.set(name, audio);
  }
  return audio;
}

/** Plays once. Safe to call when the browser will refuse. */
export function playSound(name: SoundName): void {
  if (typeof window === "undefined") return;
  const audio = element(name);
  audio.loop = false;
  try {
    audio.currentTime = 0;
    void audio.play().catch(() => {
      /* blocked until the first interaction — nothing to do about it */
    });
  } catch {
    /* ditto */
  }
}

function stop(name: SoundName): void {
  const audio = elements.get(name);
  if (!audio) return;
  audio.pause();
  try {
    audio.currentTime = 0;
  } catch {
    /* a source that never loaded cannot be rewound */
  }
}

/**
 * Loops a sound for as long as `active` is true.
 *
 * Used for the ringtone: it starts when a call begins ringing and stops the
 * moment it is answered, declined, or the component goes away — including on
 * a route change, which is what stops a ring following someone into the call
 * screen they just answered on.
 */
export function useLoopingSound(name: SoundName, active: boolean): void {
  React.useEffect(() => {
    if (!active) {
      stop(name);
      return;
    }

    const audio = element(name);
    audio.loop = true;

    const start = () => {
      void audio.play().catch(() => {
        /* still locked; the retry below covers the common case */
      });
    };

    start();

    // If the browser refused because nothing had been clicked yet, try again
    // on the first interaction — otherwise an untouched tab would stay silent
    // for the whole call.
    const retry = () => {
      if (active) start();
    };
    if (!unlocked) {
      window.addEventListener("pointerdown", retry, { once: true });
      window.addEventListener("keydown", retry, { once: true });
    }

    return () => {
      window.removeEventListener("pointerdown", retry);
      window.removeEventListener("keydown", retry);
      stop(name);
    };
  }, [name, active]);
}

/**
 * Plays a one-shot each time `trigger` becomes a new, non-null id.
 *
 * Keyed on the id rather than on "something changed", so a re-render or a
 * refetch that returns the same request stays silent — only a genuinely
 * different request sounds the alert.
 *
 * It does fire for a request that was already waiting when the panel opened,
 * which is deliberate: someone sitting in the queue is exactly who the
 * astrologer needs to be told about.
 */
export function useAlertOn(name: SoundName, trigger: string | null | undefined): void {
  const previous = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (trigger && trigger !== previous.current) playSound(name);
    previous.current = trigger ?? null;
  }, [name, trigger]);
}
