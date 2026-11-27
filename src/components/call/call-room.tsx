"use client";

import * as React from "react";

import type { CallCredentials } from "@/types";

/**
 * The ZEGOCLOUD call room.
 *
 * The token is minted by our backend and arrives in `credentials` — the
 * ServerSecret never reaches the browser, which is ZEGOCLOUD's own requirement
 * for production. `generateKitTokenForTest` would put that secret in client
 * code, so it is deliberately not used anywhere here.
 *
 * The SDK is loaded with a dynamic import inside an effect because it touches
 * `window` and `navigator.mediaDevices` on import, which breaks server
 * rendering.
 */
export function CallRoom({
  credentials,
  onLeave,
  className,
  audioOnly = false,
  group = false,
  stayInRoomOnPeerLeave = false,
}: {
  credentials: CallCredentials;
  onLeave: () => void;
  className?: string;
  /** A voice call is the same room with the camera left off. */
  audioOnly?: boolean;
  /**
   * A multi-party chamber rather than a 1:1 call.
   *
   * This changes two things that would otherwise be wrong with more than two
   * people in the room: the layout becomes a grid, and one person leaving
   * stops meaning the session is over.
   */
  group?: boolean;
  /** Keep user inside room even if remote participant drops/refreshes. */
  stayInRoomOnPeerLeave?: boolean;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [retryCount, setRetryCount] = React.useState(0);

  // Held in a ref so re-renders never re-join the room, and so the leave
  // handler can always see the latest callback.
  const leaveRef = React.useRef(onLeave);
  leaveRef.current = onLeave;

  React.useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let instance: any = null;
    const joinAttemptedAt = Date.now();
    setError(null);

    (async () => {
      try {
        if (!credentials.app_id || !credentials.token || !credentials.user_id) {
          setError("Video room credentials are missing or incomplete.");
          return;
        }
        const { ZegoUIKitPrebuilt } = await import("@zegocloud/zego-uikit-prebuilt");
        if (cancelled || !containerRef.current) return;

        const kitToken = ZegoUIKitPrebuilt.generateKitTokenForProduction(
          credentials.app_id,
          credentials.token,
          credentials.room_id,
          credentials.user_id,
          credentials.user_name,
        );

        instance = ZegoUIKitPrebuilt.create(kitToken);
        instance.joinRoom({
          container: containerRef.current,
          scenario: {
            mode: group
              ? ZegoUIKitPrebuilt.GroupCall
              : ZegoUIKitPrebuilt.OneONoneCall,
          },
          showPreJoinView: false,
          showScreenSharingButton: false,
          showRoomDetailsButton: false,
          showUserList: group,
          showTextChat: false,
          turnOnCameraWhenJoining: !audioOnly,
          turnOnMicrophoneWhenJoining: true,
          showMyCameraToggleButton: !audioOnly,
          showAudioVideoSettingsButton: !audioOnly,
          onLeaveRoom: () => {
            if (cancelled) return;
            // Immediate disconnect (<4s after join) means SDK login/auth/network failed,
            // not the user intentionally clicking Leave — show error instead of silently redirecting out.
            if (Date.now() - joinAttemptedAt < 4000) {
              setError(
                "ভিডিও রুমে সংযোগ করা যায়নি (ZEGOCLOUD auth/connection error অথবা ক্যামেরা পারমিশন ব্লক)।",
              );
              return;
            }
            leaveRef.current();
          },
          ...(group || stayInRoomOnPeerLeave ? {} : { onUserLeave: () => leaveRef.current() }),
        });
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error && e.message.includes("Permission")
              ? "We need access to your camera and microphone to start the call."
              : "Could not start the call. Please check your camera and microphone.",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      try {
        instance?.destroy?.();
      } catch {
        /* the SDK is already gone */
      }
    };
    // Re-run only when room, user identity, token, mode, or explicit retry changes.
  }, [
    credentials.app_id,
    credentials.room_id,
    credentials.token,
    credentials.user_id,
    audioOnly,
    group,
    stayInRoomOnPeerLeave,
    retryCount,
  ]);

  if (error) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center text-white">
        <p className="max-w-md text-sm font-medium text-rose-300">{error}</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setRetryCount((c) => c + 1)}
            className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-500 cursor-pointer"
          >
            পুনরায় চেষ্টা করুন (Retry)
          </button>
          <button
            type="button"
            onClick={() => leaveRef.current()}
            className="rounded-xl border border-stone-600 px-4 py-2 text-xs font-bold text-stone-300 hover:bg-stone-800 cursor-pointer"
          >
            ফিরে যান
          </button>
        </div>
      </div>
    );
  }

  return <div ref={containerRef} className={className} />;
}
