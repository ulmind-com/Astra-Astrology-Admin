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
}: {
  credentials: CallCredentials;
  onLeave: () => void;
  className?: string;
  /** A voice call is the same room with the camera left off. */
  audioOnly?: boolean;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [error, setError] = React.useState<string | null>(null);

  // Held in a ref so re-renders never re-join the room, and so the leave
  // handler can always see the latest callback.
  const leaveRef = React.useRef(onLeave);
  leaveRef.current = onLeave;

  React.useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let instance: any = null;

    (async () => {
      try {
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
          scenario: { mode: ZegoUIKitPrebuilt.OneONoneCall },
          showPreJoinView: false,
          showScreenSharingButton: false,
          showRoomDetailsButton: false,
          showUserList: false,
          showTextChat: false,
          turnOnCameraWhenJoining: !audioOnly,
          turnOnMicrophoneWhenJoining: true,
          // On a voice call the camera button is hidden rather than merely
          // off, so nobody turns their camera on by accident.
          showMyCameraToggleButton: !audioOnly,
          showAudioVideoSettingsButton: !audioOnly,
          // Leaving the room is reported to our server too — the room is the
          // pipe, but the session is ours.
          onLeaveRoom: () => leaveRef.current(),
          // When the other person drops out there is nobody left to talk to.
          onUserLeave: () => leaveRef.current(),
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
    // Re-joining on a changed token would drop the live call, so this runs
    // once per room.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [credentials.room_id, audioOnly]);

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center p-6 text-center">
        <p className="max-w-sm text-sm text-red-500">{error}</p>
      </div>
    );
  }

  return <div ref={containerRef} className={className} />;
}
