"use client";

import {
  Check,
  Expand,
  Flame,
  Mic,
  MicOff,
  Minimize2,
  PhoneOff,
  Radio,
  Sparkles,
  Users,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
} from "lucide-react";
import * as React from "react";

import { Avatar } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useRealtime } from "@/providers/realtime-provider";
import type { CallCredentials } from "@/types";

export interface BentoTaskItem {
  id: string;
  label: string;
  defaultDone?: boolean;
}

export interface BentoSideAction {
  id: string;
  icon: React.ReactNode;
  title: string;
  active?: boolean;
  onClick: () => void;
}

export interface BentoVideoStudioProps {
  credentials: CallCredentials;
  sessionId: string;
  peerUserId?: string | null;
  peerName: string;
  peerRoleLabel: string;
  peerAvatarUrl?: string | null;
  selfName: string;
  selfRoleLabel: string;
  selfAvatarUrl?: string | null;
  title: string;
  subtitle?: string;
  timerText?: string;
  timerWarning?: boolean;
  audioOnly?: boolean;
  onLeave: () => void;
  checklistTitle: string;
  initialTasks: BentoTaskItem[];
  leftExtra?: React.ReactNode;
  headerActions?: React.ReactNode;
  sideActions?: BentoSideAction[];
  onToggleToolsDrawer?: () => void;
  toolsDrawerActive?: boolean;
  bottomBannerText: string;
  stageOverlay?: React.ReactNode;
  rightDrawer?: React.ReactNode;
}

const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun.cloudflare.com:3478" },
];

function buildRtcConfig(): RTCConfiguration {
  try {
    const raw = process.env.NEXT_PUBLIC_ICE_SERVERS_JSON;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return { iceServers: [...parsed, ...DEFAULT_ICE_SERVERS], iceCandidatePoolSize: 4 };
      }
    }
  } catch {
    /* ignore malformed env ICE JSON */
  }
  return { iceServers: DEFAULT_ICE_SERVERS, iceCandidatePoolSize: 4 };
}

const RTC_CONFIG: RTCConfiguration = buildRtcConfig();
const failedZegoAppIds = new Set<number>();

/**
 * Forest-Emerald Bento Video Conference Studio.
 *
 * Always keeps the remote participant on the large right hero stage (so Purohit/Astrologer
 * sees the devotee/client big, and vice versa), while placing the self camera tile and interactive
 * session checklist in the left bento column. Uses ZegoExpressEngine WebRTC as primary transport
 * with seamless automatic direct WebRTC fallback over `/api/v1/live` WebSocket if Zego rejects
 * offline/auth AppIDs.
 */
export function BentoVideoStudio({
  credentials,
  sessionId,
  peerUserId,
  peerName,
  peerRoleLabel,
  peerAvatarUrl,
  selfName,
  selfRoleLabel,
  selfAvatarUrl,
  title,
  subtitle,
  timerText,
  timerWarning = false,
  audioOnly = false,
  onLeave,
  checklistTitle,
  initialTasks,
  leftExtra,
  headerActions,
  sideActions = [],
  onToggleToolsDrawer,
  toolsDrawerActive = false,
  bottomBannerText,
  stageOverlay,
  rightDrawer,
}: BentoVideoStudioProps) {
  const { connected: wsConnected, sendLive, onWebrtcSignal } = useRealtime();

  const studioRef = React.useRef<HTMLDivElement>(null);
  const localVideoRef = React.useRef<HTMLVideoElement>(null);
  const remoteVideoRef = React.useRef<HTMLVideoElement>(null);
  const onLeaveRef = React.useRef(onLeave);
  onLeaveRef.current = onLeave;
  const credentialsRef = React.useRef(credentials);
  credentialsRef.current = credentials;
  const sendLiveRef = React.useRef(sendLive);
  sendLiveRef.current = sendLive;
  const onWebrtcSignalRef = React.useRef(onWebrtcSignal);
  onWebrtcSignalRef.current = onWebrtcSignal;
  const announceReadyRef = React.useRef<(() => void) | null>(null);

  const [localStream, setLocalStream] = React.useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = React.useState<MediaStream | null>(null);
  const [transportMode, setTransportMode] = React.useState<"connecting" | "zego" | "p2p" | "error">("connecting");
  const [statusLabel, setStatusLabel] = React.useState("সেশন সংযোগ হচ্ছে...");
  const [isMuted, setIsMuted] = React.useState(false);
  const [isCamOff, setIsCamOff] = React.useState(audioOnly);
  const [isSpeakerMuted, setIsSpeakerMuted] = React.useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = React.useState(false);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [micLevel, setMicLevel] = React.useState(0.2);
  const [tasks, setTasks] = React.useState<Record<string, boolean>>(() =>
    Object.fromEntries(initialTasks.map((t) => [t.id, Boolean(t.defaultDone)])),
  );
  const [retrySeed, setRetrySeed] = React.useState(0);

  // Sync streams cleanly onto video elements whenever streams or toggle flags update
  React.useEffect(() => {
    const vid = localVideoRef.current;
    if (vid && localStream) {
      if (vid.srcObject !== localStream) vid.srcObject = localStream;
      void vid.play().catch(() => undefined);
    }
  }, [localStream, isCamOff]);

  React.useEffect(() => {
    const vid = remoteVideoRef.current;
    if (!vid || !remoteStream) return;
    if (vid.srcObject !== remoteStream) vid.srcObject = remoteStream;
    vid.muted = isSpeakerMuted;
    void vid
      .play()
      .then(() => {
        if (!isSpeakerMuted) setAutoplayBlocked(false);
      })
      .catch(() => {
        if (!isSpeakerMuted) {
          vid.muted = true;
          setAutoplayBlocked(true);
          void vid.play().catch(() => undefined);
        }
      });
  }, [remoteStream, isSpeakerMuted]);

  React.useEffect(() => {
    if (wsConnected) {
      announceReadyRef.current?.();
    }
  }, [wsConnected]);

  // Live audio visualizer bars from local mic stream
  React.useEffect(() => {
    if (!localStream || isMuted) {
      setMicLevel(0.12);
      return;
    }
    let ctx: AudioContext | null = null;
    let timerId: number | undefined;
    try {
      const audioTrack = localStream.getAudioTracks()[0];
      if (!audioTrack) return;
      ctx = new AudioContext();
      const src = ctx.createMediaStreamSource(new MediaStream([audioTrack]));
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      src.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      timerId = window.setInterval(() => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((sum, v) => sum + v, 0) / Math.max(1, data.length);
        setMicLevel(Math.min(1, Math.max(0.12, avg / 90)));
      }, 140);
    } catch {
      /* AudioContext unavailable */
    }
    return () => {
      if (timerId) window.clearInterval(timerId);
      if (ctx) void ctx.close().catch(() => undefined);
    };
  }, [localStream, isMuted]);

  // Core Media & Dual Transport Lifecycle (ZegoExpress primary -> WebRTC P2P relay fallback)
  React.useEffect(() => {
    const activeCreds = credentialsRef.current;
    let cancelled = false;
    let streamRef: MediaStream | null = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let zg: any = null;
    let pc: RTCPeerConnection | null = null;
    let p2pInterval: number | undefined;
    let zegoTimeout: number | undefined;
    let fallbackStarted = false;
    let pendingIce: RTCIceCandidateInit[] = [];
    announceReadyRef.current = null;

    const stopStream = (s: MediaStream | null) => {
      s?.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {
          /* ignore */
        }
      });
    };

    const startP2PFallback = (activeLocal: MediaStream | null) => {
      if (zegoTimeout) {
        window.clearTimeout(zegoTimeout);
        zegoTimeout = undefined;
      }
      if (cancelled || fallbackStarted || !peerUserId) {
        if (!peerUserId && !cancelled) {
          setTransportMode("error");
          setStatusLabel("সংযোগ স্থাপন করা যায়নি");
        }
        return;
      }
      fallbackStarted = true;
      setTransportMode("p2p");
      setStatusLabel("Live Direct Video প্রস্তুত — অপর পক্ষের অপেক্ষায়");

      try {
        zg?.logoutRoom?.(activeCreds.room_id);
        zg?.destroyEngine?.();
      } catch {
        /* ignore */
      }
      zg = null;

      pc = new RTCPeerConnection(RTC_CONFIG);
      const remoteBuf = new MediaStream();

      const publishRemote = () => {
        if (!cancelled) {
          setRemoteStream(new MediaStream(remoteBuf.getTracks()));
        }
      };

      if (activeLocal) {
        activeLocal.getTracks().forEach((track) => {
          pc?.addTrack(track, activeLocal);
        });
      }

      pc.ontrack = (ev) => {
        const tracks = ev.streams[0]?.getTracks() ?? (ev.track ? [ev.track] : []);
        for (const t of tracks) {
          if (!remoteBuf.getTracks().some((x) => x.id === t.id)) {
            remoteBuf.addTrack(t);
          }
          t.onunmute = publishRemote;
          t.onended = publishRemote;
        }
        publishRemote();
        if (!cancelled) {
          setStatusLabel("লাইভ সরাসরি ভিডিও সংযুক্ত");
        }
      };

      pc.onicecandidate = (ev) => {
        if (ev.candidate && peerUserId) {
          sendLiveRef.current({
            type: "webrtc_signal",
            to_user: peerUserId,
            call_id: sessionId,
            data: { kind: "ice", candidate: ev.candidate.toJSON(), room_id: activeCreds.room_id },
          });
        }
      };

      const isOfferer = String(activeCreds.user_id) < String(peerUserId);
      let makingOffer = false;
      let lastOfferSentAt = 0;

      const sendOffer = async (forceRestart = false) => {
        if (cancelled || !pc || makingOffer) return;
        makingOffer = true;
        try {
          // Re-send pending offer if peer arrived late instead of stalling in have-local-offer.
          if (pc.signalingState === "have-local-offer") {
            if (!forceRestart && pc.localDescription && Date.now() - lastOfferSentAt < 6500) {
              sendLiveRef.current({
                type: "webrtc_signal",
                to_user: peerUserId,
                call_id: sessionId,
                data: { kind: "offer", sdp: pc.localDescription, room_id: activeCreds.room_id },
              });
              return;
            }
            await pc.setLocalDescription({ type: "rollback" } as RTCSessionDescriptionInit);
          }
          if (pc.signalingState !== "stable") return;
          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: !audioOnly,
            iceRestart: forceRestart,
          });
          await pc.setLocalDescription(offer);
          lastOfferSentAt = Date.now();
          sendLiveRef.current({
            type: "webrtc_signal",
            to_user: peerUserId,
            call_id: sessionId,
            data: { kind: "offer", sdp: pc.localDescription, room_id: activeCreds.room_id },
          });
        } finally {
          makingOffer = false;
        }
      };

      pc.onconnectionstatechange = () => {
        if (!pc || cancelled) return;
        if (pc.connectionState === "connected") {
          setStatusLabel("লাইভ সরাসরি ভিডিও সংযুক্ত");
        } else if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
          setStatusLabel("সংযোগ পুনরুদ্ধার হচ্ছে...");
          if (pc.connectionState === "failed") {
            if (isOfferer) {
              void sendOffer(true);
            } else {
              sendLiveRef.current({
                type: "webrtc_signal",
                to_user: peerUserId,
                call_id: sessionId,
                data: { kind: "need_offer", room_id: activeCreds.room_id },
              });
            }
          }
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (!pc || cancelled) return;
        if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
          setStatusLabel("লাইভ সরাসরি ভিডিও সংযুক্ত");
        } else if (pc.iceConnectionState === "failed") {
          setStatusLabel("সংযোগ পুনরুদ্ধার হচ্ছে...");
          if (isOfferer) {
            void sendOffer(true);
          } else {
            sendLiveRef.current({
              type: "webrtc_signal",
              to_user: peerUserId,
              call_id: sessionId,
              data: { kind: "need_offer", room_id: activeCreds.room_id },
            });
          }
        }
      };

      const flushIce = async () => {
        if (!pc?.remoteDescription) return;
        for (const c of pendingIce) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(c));
          } catch {
            /* ignore stale candidate */
          }
        }
        pendingIce = [];
      };

      const unsubSignal = onWebrtcSignalRef.current(async (msg) => {
        if (cancelled || !pc) return;
        if (msg.data?.room_id && msg.data.room_id !== activeCreds.room_id) return;
        if (msg.from_user && String(msg.from_user) !== String(peerUserId)) return;

        const kind = msg.data?.kind;
        const alreadyLive =
          (pc.connectionState === "connected" ||
            pc.iceConnectionState === "connected" ||
            pc.iceConnectionState === "completed") &&
          remoteBuf.getTracks().length > 0;
        try {
          if (kind === "ready") {
            if (alreadyLive) return;
            if (isOfferer) {
              await sendOffer(false);
            } else {
              sendLiveRef.current({
                type: "webrtc_signal",
                to_user: peerUserId,
                call_id: sessionId,
                data: { kind: "need_offer", room_id: activeCreds.room_id },
              });
            }
          } else if (kind === "need_offer" && isOfferer) {
            await sendOffer(pc.iceConnectionState === "failed" || pc.connectionState === "failed");
          } else if (kind === "offer" && msg.data.sdp) {
            if (pc.signalingState !== "stable") {
              await pc.setLocalDescription({ type: "rollback" } as RTCSessionDescriptionInit);
            }
            await pc.setRemoteDescription(new RTCSessionDescription(msg.data.sdp));
            await flushIce();
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            sendLiveRef.current({
              type: "webrtc_signal",
              to_user: peerUserId,
              call_id: sessionId,
              data: { kind: "answer", sdp: pc.localDescription, room_id: activeCreds.room_id },
            });
          } else if (kind === "answer" && msg.data.sdp) {
            if (pc.signalingState === "have-local-offer") {
              await pc.setRemoteDescription(new RTCSessionDescription(msg.data.sdp));
              await flushIce();
            }
          } else if (kind === "ice" && msg.data.candidate) {
            if (pc.remoteDescription) {
              await pc.addIceCandidate(new RTCIceCandidate(msg.data.candidate));
            } else {
              pendingIce.push(msg.data.candidate);
            }
          }
        } catch {
          /* signaling retry handles transient races */
        }
      });

      const announceReady = () => {
        if (cancelled) return;
        sendLiveRef.current({
          type: "webrtc_signal",
          to_user: peerUserId,
          call_id: sessionId,
          data: { kind: "ready", room_id: activeCreds.room_id },
        });
      };
      announceReadyRef.current = announceReady;

      announceReady();
      p2pInterval = window.setInterval(() => {
        const isLive =
          (pc?.connectionState === "connected" ||
            pc?.iceConnectionState === "connected" ||
            pc?.iceConnectionState === "completed") &&
          remoteBuf.getTracks().length > 0;
        if (isLive) return;
        announceReady();
        if (!isOfferer && pc?.signalingState === "stable" && !pc.currentRemoteDescription) {
          sendLiveRef.current({
            type: "webrtc_signal",
            to_user: peerUserId,
            call_id: sessionId,
            data: { kind: "need_offer", room_id: activeCreds.room_id },
          });
        }
      }, 2500);

      const originalClose = pc.close.bind(pc);
      pc.close = () => {
        unsubSignal();
        originalClose();
      };
    };

    (async () => {
      setTransportMode("connecting");
      setStatusLabel("ক্যামেরা ও মাইক্রোফোন প্রস্তুত হচ্ছে...");
      setRemoteStream(null);

      // 1. Capture local media stream safely
      try {
        streamRef = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: audioOnly ? false : { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        });
      } catch {
        try {
          streamRef = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          if (!cancelled) setIsCamOff(true);
        } catch {
          streamRef = null;
          if (!cancelled) setIsCamOff(true);
        }
      }

      if (cancelled) {
        stopStream(streamRef);
        return;
      }
      setLocalStream(streamRef);

      // 2. Try ZegoExpressEngine primary media server
      if (
        !activeCreds.app_id ||
        !activeCreds.token ||
        !activeCreds.user_id ||
        failedZegoAppIds.has(activeCreds.app_id)
      ) {
        startP2PFallback(streamRef);
        return;
      }

      try {
        const mod = await import("zego-express-engine-webrtc");
        if (cancelled) return;
        const ZegoExpressEngine = mod.ZegoExpressEngine;
        const serverUrl =
          activeCreds.server_url || `wss://webliveroom${activeCreds.app_id}-api.coolzcloud.com/ws`;
        zg = new ZegoExpressEngine(activeCreds.app_id, serverUrl);
        zg.setLogConfig?.({ logLevel: "disable" });

        const remoteMediaBuf = new MediaStream();
        let connectedZego = false;

        zegoTimeout = window.setTimeout(() => {
          if (!connectedZego && !fallbackStarted && !cancelled) {
            failedZegoAppIds.add(activeCreds.app_id);
            startP2PFallback(streamRef);
          }
        }, 3500);

        zg.on("roomStateUpdate", (_roomID: string, state: string, errorCode: number) => {
          if (cancelled || fallbackStarted) return;
          if (state === "CONNECTED" && errorCode === 0) {
            connectedZego = true;
            if (zegoTimeout) {
              window.clearTimeout(zegoTimeout);
              zegoTimeout = undefined;
            }
            setTransportMode("zego");
            setStatusLabel("Zego HD সংযুক্ত");
          } else if (state === "DISCONNECTED" || errorCode !== 0) {
            if (!connectedZego) {
              if (errorCode !== 0) failedZegoAppIds.add(activeCreds.app_id);
              startP2PFallback(streamRef);
            }
          }
        });

        zg.on(
          "roomStreamUpdate",
          async (_roomID: string, updateType: string, streamList: { streamID: string }[]) => {
            if (cancelled || fallbackStarted || !zg) return;
            if (updateType === "ADD") {
              for (const s of streamList) {
                try {
                  const playStream: MediaStream = await zg.startPlayingStream(s.streamID);
                  playStream.getTracks().forEach((t) => {
                    if (!remoteMediaBuf.getTracks().some((x) => x.id === t.id)) {
                      remoteMediaBuf.addTrack(t);
                    }
                  });
                  if (!cancelled) {
                    setRemoteStream(new MediaStream(remoteMediaBuf.getTracks()));
                    setStatusLabel("লাইভ ভিডিও সংযুক্ত");
                  }
                } catch {
                  /* ignore transient play retry */
                }
              }
            } else if (updateType === "DELETE") {
              setRemoteStream(null);
            }
          },
        );

        const ok = await zg.loginRoom(
          activeCreds.room_id,
          activeCreds.token,
          { userID: activeCreds.user_id, userName: activeCreds.user_name },
          { userUpdate: true },
        );

        if (!ok || cancelled) {
          if (!cancelled) {
            failedZegoAppIds.add(activeCreds.app_id);
            startP2PFallback(streamRef);
          }
          return;
        }

        if (streamRef) {
          const streamId = `${activeCreds.room_id}_${activeCreds.user_id}`;
          zg.startPublishingStream(streamId, streamRef);
        }
      } catch {
        failedZegoAppIds.add(activeCreds.app_id);
        startP2PFallback(streamRef);
      }
    })();

    return () => {
      cancelled = true;
      announceReadyRef.current = null;
      if (zegoTimeout) window.clearTimeout(zegoTimeout);
      if (p2pInterval) window.clearInterval(p2pInterval);
      try {
        pc?.close();
      } catch {
        /* ignore */
      }
      try {
        zg?.logoutRoom?.(activeCreds.room_id);
        zg?.destroyEngine?.();
      } catch {
        /* ignore */
      }
      stopStream(streamRef);
    };
  }, [
    sessionId,
    credentials.room_id,
    credentials.user_id,
    audioOnly,
    peerUserId,
    retrySeed,
  ]);

  const toggleMic = () => {
    const nextMuted = !isMuted;
    localStream?.getAudioTracks().forEach((t) => {
      t.enabled = !nextMuted;
    });
    setIsMuted(nextMuted);
  };

  const toggleCam = () => {
    if (audioOnly) return;
    const nextOff = !isCamOff;
    localStream?.getVideoTracks().forEach((t) => {
      t.enabled = !nextOff;
    });
    setIsCamOff(nextOff);
  };

  const toggleSpeaker = () => {
    const next = !isSpeakerMuted;
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = next;
      if (!next) void remoteVideoRef.current.play().catch(() => undefined);
    }
    setAutoplayBlocked(false);
    setIsSpeakerMuted(next);
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await studioRef.current?.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch {
      /* fullscreen blocked */
    }
  };

  const toggleTask = (id: string) => {
    setTasks((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const completedTasksCount = Object.values(tasks).filter(Boolean).length;
  const hasRemoteVideo = Boolean(remoteStream && remoteStream.getVideoTracks().some((t) => t.readyState === "live"));

  return (
    <div
      ref={studioRef}
      className="fixed inset-0 z-50 w-full h-dvh bg-[#061311] text-white flex flex-col p-2.5 sm:p-4 font-sans select-none overflow-y-auto lg:overflow-hidden"
    >
      {/* OUTER BENTO CONTAINER */}
      <div className="flex-1 flex flex-col rounded-3xl bg-[#0B1E1B] border border-[#1E3B36] p-3 sm:p-4 gap-3.5 shadow-[0_24px_80px_rgba(0,0,0,0.65)] min-h-0">
        {/* TOP STUDIO HEADER */}
        <header className="flex flex-wrap items-center justify-between gap-2.5 px-1">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-9 rounded-xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center shrink-0 text-emerald-300">
              <Flame className="size-4.5 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-serif font-bold text-sm sm:text-base text-white truncate">
                  {title}
                </h1>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#132E2A] border border-[#244A43] px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-ping" />
                  {transportMode === "zego"
                    ? "Zego HD"
                    : transportMode === "p2p"
                    ? "Live Direct Video"
                    : "Connecting..."}
                </span>
              </div>
              {subtitle && <p className="text-[11px] text-emerald-200/65 truncate">{subtitle}</p>}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {timerText && (
              <div
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-mono font-extrabold",
                  timerWarning
                    ? "bg-rose-500/20 border-rose-400/60 text-rose-200 animate-pulse"
                    : "bg-[#132E2A] border-[#265048] text-emerald-200",
                )}
              >
                <Radio className="size-3.5 text-emerald-400" />
                <span>{timerText}</span>
              </div>
            )}
            {headerActions}
          </div>
        </header>

        {/* BENTO WORKSPACE GRID */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3.5 min-h-0">
          {/* LEFT COLUMN: SELF VIDEO TILE + PARTICIPANT TILES + DAILY TASK CHECKLIST */}
          <div className="lg:col-span-4 flex flex-col gap-3.5 min-h-0">
            {/* TOP LEFT: PARTICIPANTS BENTO CARD */}
            <div className="rounded-2xl bg-[#0E2421] border border-[#1E3B36] p-3 space-y-2.5">
              <div className="grid grid-cols-2 gap-2.5">
                {/* Tile 1: Self Camera Preview ("You") */}
                <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-[#071614] border border-[#244741]">
                  {localStream && !isCamOff && !audioOnly ? (
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover scale-x-[-1]"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#122C28] to-[#081715]">
                      <Avatar src={selfAvatarUrl || undefined} name={selfName} size="md" />
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-2 flex items-end justify-between">
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-white truncate">You ({selfName})</p>
                      <p className="text-[9px] text-emerald-200/70 truncate">{selfRoleLabel}</p>
                    </div>
                    <span className="size-5 rounded-full bg-black/50 flex items-center justify-center text-emerald-300 shrink-0">
                      {isMuted ? <MicOff className="size-3 text-rose-400" /> : <Mic className="size-3" />}
                    </span>
                  </div>
                </div>

                {/* Tile 2: Remote Participant Identity Tile */}
                <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-gradient-to-br from-[#183833] to-[#0D221F] border border-[#244741] p-2.5 flex flex-col items-center justify-center text-center">
                  <Avatar
                    src={peerAvatarUrl || undefined}
                    name={peerName}
                    size="md"
                    className="ring-2 ring-emerald-400/40"
                  />
                  <p className="mt-1.5 text-[11px] font-bold text-white truncate max-w-full">{peerName}</p>
                  <p className="text-[9px] text-emerald-200/70 truncate max-w-full">{peerRoleLabel}</p>
                  <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-black/35 px-2 py-0.5 text-[9px] font-semibold text-emerald-300">
                    <span className={cn("size-1.5 rounded-full", remoteStream ? "bg-emerald-400" : "bg-amber-400 animate-pulse")} />
                    {remoteStream ? "Connected" : "Waiting"}
                  </span>
                </div>
              </div>

              {/* Compact Bottom Pair inside Participant Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-xl bg-[#132E2A] border border-[#244741] px-3 py-2 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-[9px] uppercase tracking-wider text-emerald-300/60 font-bold">Status</p>
                    <p className="text-[11px] font-bold text-white truncate">{statusLabel}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRetrySeed((n) => n + 1)}
                    className="text-[10px] font-bold text-emerald-300 hover:text-white underline shrink-0 ml-1 cursor-pointer"
                    title="Reconnect media stream"
                  >
                    Sync
                  </button>
                </div>

                <div className="rounded-xl bg-[#132E2A] border border-[#244741] px-3 py-2 flex items-center justify-center gap-2">
                  <Users className="size-4 text-emerald-300" />
                  <span className="text-xs font-extrabold text-white">
                    {remoteStream ? "2 Live" : "1 Live"}
                  </span>
                </div>
              </div>
            </div>

            {/* BOTTOM LEFT: INTERACTIVE CHECKLIST BENTO CARD ("Daily Task" match) */}
            <div className="rounded-2xl bg-[#0E2421] border border-[#1E3B36] p-4 flex-1 flex flex-col gap-3 min-h-[200px]">
              <div className="flex items-center justify-between border-b border-[#1E3B36] pb-2">
                <h3 className="text-xs font-bold text-white tracking-wide">{checklistTitle}</h3>
                <span className="text-[10px] font-bold text-emerald-300 bg-[#132E2A] px-2 py-0.5 rounded-full">
                  {completedTasksCount}/{initialTasks.length} Done
                </span>
              </div>

              <div className="space-y-2 overflow-y-auto pr-1">
                {initialTasks.map((task) => {
                  const checked = Boolean(tasks[task.id]);
                  return (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => toggleTask(task.id)}
                      className="w-full flex items-center gap-2.5 text-left group cursor-pointer"
                    >
                      <span
                        className={cn(
                          "size-4 rounded-[5px] flex items-center justify-center border transition-colors shrink-0",
                          checked
                            ? "bg-emerald-500 border-emerald-400 text-[#061311]"
                            : "bg-[#081715] border-[#2C554D] group-hover:border-emerald-400",
                        )}
                      >
                        {checked && <Check className="size-3 stroke-[3]" />}
                      </span>
                      <span
                        className={cn(
                          "text-xs transition-colors leading-snug",
                          checked ? "text-emerald-200/90 line-through" : "text-stone-200",
                        )}
                      >
                        {task.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {leftExtra && (
                <div className="mt-auto pt-2 border-t border-[#1E3B36]">{leftExtra}</div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: BIG REMOTE VIDEO HERO STAGE + LIVE WAVEFORM PROMPT BAR */}
          <div className="lg:col-span-8 flex flex-col gap-3.5 min-h-0">
            {/* BIG REMOTE VIDEO VIEWPORT (ALWAYS REMOTE PEER ON MAIN SCREEN) */}
            <div className="relative flex-1 min-h-[340px] lg:min-h-[440px] rounded-2xl overflow-hidden bg-[#05100E] border border-[#1E3B36] shadow-2xl">
              {/* Remote Participant Stream */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className={cn(
                  "w-full h-full object-cover transition-opacity duration-300",
                  hasRemoteVideo && !audioOnly ? "opacity-100" : "opacity-0 absolute inset-0 pointer-events-none",
                )}
              />

              {/* Fallback / Audio-only / Waiting Avatar State */}
              {(!hasRemoteVideo || audioOnly) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.14)_0%,rgba(6,19,17,0.96)_70%)] p-6 text-center">
                  <div className="relative flex size-28 sm:size-32 items-center justify-center">
                    <span className="absolute inset-0 rounded-full bg-emerald-400/20 animate-ping" />
                    <Avatar
                      src={peerAvatarUrl || undefined}
                      name={peerName}
                      size="xl"
                      className="size-24 sm:size-28 ring-4 ring-emerald-400/40 shadow-2xl"
                    />
                  </div>
                  <h2 className="mt-4 font-serif text-lg sm:text-xl font-bold text-white">
                    {peerName}
                  </h2>
                  <p className="text-xs text-emerald-200/75 mt-1">
                    {audioOnly
                      ? remoteStream
                        ? "HD Voice Consultation Live"
                        : `${peerRoleLabel} সংযোগের অপেক্ষায়...`
                      : remoteStream
                      ? "Peer camera is paused — audio active"
                      : `${peerRoleLabel} ভিডিও রুমে যুক্ত হচ্ছেন...`}
                  </p>
                </div>
              )}

              {/* Custom overlays (e.g. Falling Pushpanjali Petals / Session Meter) */}
              {stageOverlay}

              {autoplayBlocked && !isSpeakerMuted && (
                <button
                  type="button"
                  onClick={() => {
                    if (remoteVideoRef.current) {
                      remoteVideoRef.current.muted = false;
                      void remoteVideoRef.current.play().catch(() => undefined);
                    }
                    setAutoplayBlocked(false);
                  }}
                  className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs px-4 py-2 shadow-xl animate-bounce cursor-pointer"
                >
                  <Volume2 className="size-4" />
                  অডিও চালু করুন (Tap to Unmute)
                </button>
              )}

              {/* Bottom-Left Stage Nameplate */}
              <div className="absolute bottom-4 left-4 z-20 rounded-xl bg-black/50 backdrop-blur-md border border-white/10 px-3 py-1.5 pointer-events-none">
                <p className="text-xs font-bold text-white">{peerName}</p>
                <p className="text-[10px] text-emerald-300/80">{peerRoleLabel}</p>
              </div>

              {/* Right-Edge Vertical Quick Dock (matches reference screenshot) */}
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2 rounded-2xl bg-[#0D211E]/85 backdrop-blur-md border border-white/10 p-1.5">
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  title="Fullscreen"
                  className="size-9 rounded-xl flex items-center justify-center text-stone-200 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                >
                  {isFullscreen ? <Minimize2 className="size-4" /> : <Expand className="size-4" />}
                </button>
                {sideActions.map((act) => (
                  <button
                    key={act.id}
                    type="button"
                    onClick={act.onClick}
                    title={act.title}
                    className={cn(
                      "size-9 rounded-xl flex items-center justify-center transition-colors cursor-pointer",
                      act.active
                        ? "bg-emerald-500 text-[#061311]"
                        : "text-stone-200 hover:bg-white/10 hover:text-white",
                    )}
                  >
                    {act.icon}
                  </button>
                ))}
              </div>

              {/* Bottom-Center Floating Glass Control Bar */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 rounded-2xl bg-[#0D211E]/90 backdrop-blur-lg border border-white/15 px-3 py-2 shadow-2xl">
                <button
                  type="button"
                  onClick={toggleMic}
                  title={isMuted ? "Unmute Mic" : "Mute Mic"}
                  className={cn(
                    "size-10 rounded-xl flex items-center justify-center transition-colors cursor-pointer",
                    isMuted
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                      : "bg-white/10 text-white hover:bg-white/20",
                  )}
                >
                  {isMuted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
                </button>

                {!audioOnly && (
                  <button
                    type="button"
                    onClick={toggleCam}
                    title={isCamOff ? "Turn Camera On" : "Turn Camera Off"}
                    className={cn(
                      "size-10 rounded-xl flex items-center justify-center transition-colors cursor-pointer",
                      isCamOff
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                        : "bg-white/10 text-white hover:bg-white/20",
                    )}
                  >
                    {isCamOff ? <VideoOff className="size-4" /> : <Video className="size-4" />}
                  </button>
                )}

                <button
                  type="button"
                  onClick={toggleSpeaker}
                  title={isSpeakerMuted ? "Unmute Audio" : "Mute Audio"}
                  className={cn(
                    "size-10 rounded-xl flex items-center justify-center transition-colors cursor-pointer",
                    isSpeakerMuted
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                      : "bg-white/10 text-white hover:bg-white/20",
                  )}
                >
                  {isSpeakerMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
                </button>

                {onToggleToolsDrawer && (
                  <button
                    type="button"
                    onClick={onToggleToolsDrawer}
                    title="Toggle Drawer"
                    className={cn(
                      "size-10 rounded-xl flex items-center justify-center transition-colors cursor-pointer",
                      toolsDrawerActive
                        ? "bg-emerald-500 text-[#061311]"
                        : "bg-white/10 text-white hover:bg-white/20",
                    )}
                  >
                    <Sparkles className="size-4" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={onLeave}
                  title="Leave / End Call"
                  className="h-10 px-4 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold flex items-center gap-1.5 shadow-lg shadow-rose-600/30 transition-colors cursor-pointer"
                >
                  <PhoneOff className="size-4" />
                </button>
              </div>

              {/* Optional Collapsible Right Slide-in Panel */}
              {rightDrawer}
            </div>

            {/* BOTTOM RIGHT: TEAL WAVEFORM & LIVE PROMPT / TRANSCRIPT BAR */}
            <div className="rounded-2xl bg-[#0E2421] border border-[#1E3B36] px-4 py-3 flex items-center gap-4">
              {/* Animated Teal Vertical Bars */}
              <div className="flex items-center gap-1 h-8 px-2 shrink-0" aria-hidden="true">
                {[0.4, 0.85, 0.55, 1, 0.7, 0.9, 0.45].map((mult, idx) => {
                  const pct = Math.max(18, Math.min(100, Math.round(micLevel * mult * 100)));
                  return (
                    <span
                      key={idx}
                      style={{ height: `${pct}%` }}
                      className="w-1 rounded-full bg-gradient-to-t from-teal-500 to-emerald-300 transition-all duration-150"
                    />
                  );
                })}
              </div>
              <p className="text-xs text-stone-200/90 leading-relaxed line-clamp-2">
                {bottomBannerText}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
