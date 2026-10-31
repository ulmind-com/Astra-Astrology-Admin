"use client";

import {
  ArrowRight,
  Eye,
  EyeOff,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { Alert, Year } from "@/components/ui";
import { UlmindCredit } from "@/components/ulmind-credit";
import { authApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { apiBase } from "@/lib/env";
import { playNavFeedback } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

type PortalType = "admin" | "astrologer";

/* ---------------------------------------------------------------------------
   Astrology illustration — a golden celestial scene sitting inside soft
   layered blobs, the way the reference puts its illustration inside organic
   shapes. Pure SVG; the zodiac ring turns slowly (reduced-motion safe).
   ------------------------------------------------------------------------- */
function AstrologyScene() {
  const stars = [
    [70, 70, 1.4, 0.8], [120, 48, 1, 0.6], [180, 60, 1.6, 0.9], [240, 44, 1, 0.5],
    [300, 70, 1.3, 0.75], [92, 150, 1.1, 0.6], [268, 150, 1.4, 0.8], [60, 230, 1, 0.5],
    [300, 232, 1.5, 0.85], [150, 300, 1.2, 0.65], [214, 300, 1, 0.55], [184, 256, 0.9, 0.5],
  ] as const;
  const ticks = Array.from({ length: 12 }, (_, i) => i * 30);
  const cx = 184;
  const cy = 176;

  return (
    <svg viewBox="0 0 368 340" aria-hidden="true" className="h-full w-full">
      <defs>
        <radialGradient id="blobA" cx="50%" cy="48%" r="60%">
          <stop offset="0%" stopColor="#FBF1CF" />
          <stop offset="100%" stopColor="#F3E3A6" />
        </radialGradient>
        <radialGradient id="blobB" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#F6E9B8" />
          <stop offset="100%" stopColor="#EAD98A" />
        </radialGradient>
        <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#B4871A" />
          <stop offset="55%" stopColor="#9c7b16" />
          <stop offset="100%" stopColor="#6b520f" />
        </linearGradient>
        <radialGradient id="moonFill" cx="38%" cy="34%" r="70%">
          <stop offset="0%" stopColor="#FFFBEA" />
          <stop offset="100%" stopColor="#F0CC5A" />
        </radialGradient>
      </defs>

      {/* soft organic blobs, layered */}
      <path
        fill="url(#blobA)"
        opacity="0.55"
        d="M184 22 C262 22 330 70 334 150 C338 230 300 300 214 322 C150 338 78 320 44 258 C8 196 26 110 92 60 C120 38 150 22 184 22 Z"
      />
      <path
        fill="url(#blobB)"
        opacity="0.9"
        d="M186 56 C248 54 300 96 302 160 C304 222 268 276 200 292 C146 304 92 288 68 236 C44 184 60 118 110 80 C134 62 160 56 186 56 Z"
      />

      {/* stars */}
      {stars.map(([sx, sy, r, o], i) => (
        <g key={i} opacity={o}>
          <circle cx={sx} cy={sy} r={r} fill="#B4871A" />
        </g>
      ))}

      {/* turning zodiac */}
      <g
        className="motion-safe:animate-[spin_80s_linear_infinite]"
        style={{ transformOrigin: `${cx}px ${cy}px` }}
      >
        <circle cx={cx} cy={cy} r="104" fill="none" stroke="url(#gold)" strokeWidth="2" opacity="0.85" />
        <circle cx={cx} cy={cy} r="86" fill="none" stroke="url(#gold)" strokeWidth="1.4" opacity="0.7" />
        {ticks.map((deg) => {
          const rad = (deg * Math.PI) / 180;
          const x1 = cx + Math.cos(rad) * 80;
          const y1 = cy + Math.sin(rad) * 80;
          const x2 = cx + Math.cos(rad) * 92;
          const y2 = cy + Math.sin(rad) * 92;
          const dx = cx + Math.cos(rad) * 104;
          const dy = cy + Math.sin(rad) * 104;
          return (
            <g key={deg}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="url(#gold)" strokeWidth="2.2" opacity="0.9" />
              <circle cx={dx} cy={dy} r="2.8" fill="#8a6a12" />
            </g>
          );
        })}
        <circle cx={cx} cy={cy} r="54" fill="none" stroke="url(#gold)" strokeWidth="1.4" opacity="0.7" />
        <circle cx={cx + 54} cy={cy} r="4.5" fill="#B4871A" />
      </g>

      {/* central sun + crescent moon */}
      <g>
        {/* sun rays */}
        {Array.from({ length: 12 }).map((_, i) => {
          const rad = (i * 30 * Math.PI) / 180;
          return (
            <line
              key={i}
              x1={cx + Math.cos(rad) * 30}
              y1={cy + Math.sin(rad) * 30}
              x2={cx + Math.cos(rad) * 40}
              y2={cy + Math.sin(rad) * 40}
              stroke="#9c7b16"
              strokeWidth="2.8"
              strokeLinecap="round"
              opacity="0.95"
            />
          );
        })}
        <circle cx={cx} cy={cy} r="27" fill="url(#moonFill)" stroke="#B4871A" strokeWidth="1.5" />
        <circle cx={cx + 9} cy={cy - 3} r="23" fill="url(#blobB)" />
        <circle cx={cx + 2} cy={cy - 1} r="3" fill="#8a6a12" opacity="0.6" />
      </g>

      {/* small constellation */}
      <g stroke="#B4871A" strokeWidth="1.3" opacity="0.6" fill="#C9A227">
        <polyline points="236,236 262,220 284,232 306,214" fill="none" />
        <circle cx="236" cy="236" r="2.4" />
        <circle cx="262" cy="220" r="2.4" />
        <circle cx="284" cy="232" r="2.4" />
        <circle cx="306" cy="214" r="2.6" />
      </g>
    </svg>
  );
}

/* The white organic card shape, matching the reference's wavy right edge. */
function OrganicWhite({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 620 760"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={className}
    >
      <path
        fill="#ffffff"
        d="M0 0 H470 C500 34 476 86 506 130 C548 192 588 300 540 404 C502 486 548 560 470 640 C428 684 452 724 410 760 H0 Z"
      />
    </svg>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, user, loading } = useAuth();

  const initialPortal: PortalType =
    searchParams.get("portal") === "astrologer" ? "astrologer" : "admin";

  const [portal, setPortal] = React.useState<PortalType>(initialPortal);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState<ApiError | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (loading || !user) return;
    router.replace(user.role === "astrologer" ? "/me" : "/dashboard");
  }, [user, loading, router]);

  // The API is on a platform that sleeps when idle, so the first request after
  // a while pays a cold-start of several seconds — which is exactly the login
  // tap. Wake it the moment this page opens, in the background, so the backend
  // is warm by the time credentials are submitted. Fire-and-forget: a failure
  // here changes nothing, the real login still reports its own errors.
  React.useEffect(() => {
    const controller = new AbortController();
    fetch(`${apiBase}/health`, { signal: controller.signal, cache: "no-store" }).catch(
      () => {},
    );
    return () => controller.abort();
  }, []);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const result = await authApi.login(email, password);
      if (result.user.role === "user") {
        setError(
          new ApiError(
            "This portal is exclusively for verified Astrologers and Platform Administrators.",
            403,
            "insufficient_role",
          ),
        );
        setBusy(false);
        return;
      }
      signIn(result);
      if (result.user.role === "astrologer") {
        toast.success(`Welcome back, Astrologer ${result.user.first_name}!`);
        router.replace("/me");
      } else {
        toast.success(`Signed in as Super Admin ${result.user.first_name}`);
        router.replace("/dashboard");
      }
    } catch (caught) {
      setError(caught as ApiError);
    } finally {
      setBusy(false);
    }
  }

  const fillSampleAccount = (role: PortalType) => {
    playNavFeedback();
    if (role === "admin") {
      setEmail("astroapp26@gmail.com");
      setPassword("");
      toast.info("Super Admin account selected. Enter your password to sign in.");
    } else {
      setEmail("samiransamanta490@gmail.com");
      setPassword("");
      toast.info("Astrologer account selected (Kanu Banarjee). Enter your password to sign in.");
    }
  };

  const switchPortal = (next: PortalType) => {
    playNavFeedback();
    setPortal(next);
    setError(null);
    window.history.replaceState(null, "", `/login?portal=${next}`);
  };

  const isAstrologerMode = portal === "astrologer";

  return (
    <div
      className="relative flex min-h-dvh w-full items-center justify-center overflow-hidden p-4 sm:p-8 lg:p-12"
      style={{
        background:
          "radial-gradient(900px 600px at 85% 15%, #b8901d 0%, transparent 55%)," +
          "linear-gradient(135deg, #8a6c15 0%, #6b520f 55%, #574110 100%)",
      }}
    >
      {/* faint bokeh circles, like the reference */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.12]">
        <div className="absolute left-[10%] top-[12%] size-40 rounded-full bg-white blur-2xl" />
        <div className="absolute right-[14%] top-[16%] size-44 rounded-full bg-white blur-2xl" />
        <div className="absolute right-[24%] bottom-[14%] size-56 rounded-full bg-white blur-3xl" />
        <div className="absolute right-[8%] bottom-[10%] size-28 rounded-full bg-white blur-xl" />
      </div>

      {/* The floating premium card, centred in the page */}
      <div
        className="relative grid w-full max-w-6xl grid-cols-1 overflow-hidden rounded-[36px] border border-white/15 shadow-[0_50px_120px_-30px_rgba(0,0,0,0.65)] lg:min-h-[620px] lg:grid-cols-[1.15fr_1fr]"
        style={{
          background:
            "radial-gradient(800px 500px at 88% 12%, #E0B63C 0%, transparent 55%)," +
            "linear-gradient(135deg, #b8901d 0%, #9c7b16 55%, #7a5f12 100%)",
        }}
      >
        {/* ===================== LEFT: white organic card ===================== */}
        <div className="relative hidden lg:block">
          {/* white blob background */}
          <OrganicWhite className="absolute inset-y-0 left-0 h-full w-[115%]" />

          {/* content over white */}
          <div className="relative h-full py-12 pl-12 pr-24">
            {/* logo top-left */}
            <div className="flex items-center gap-3">
              <span className="relative flex size-11 items-center justify-center rounded-2xl overflow-hidden shadow-[0_6px_18px_rgba(224,182,60,0.4)]">
                <Image
                  src="/logo.png"
                  alt="DivinLink"
                  width={44}
                  height={44}
                  className="size-full object-contain"
                  priority
                />
              </span>
              <div className="leading-tight">
                <p className="font-serif-display text-lg font-semibold tracking-wide text-[#8a6a12]">
                  DIVINLINK
                </p>
                <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#B4871A]">
                  Astrology & Consult
                </p>
              </div>
            </div>

            {/* centre illustration — vertically & horizontally centred in the card */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center pr-16">
              <div className="w-full max-w-[380px]">
                <AstrologyScene />
              </div>
            </div>

            {/* footer bottom-left: copyright + ULMIND credit */}
            <div className="absolute bottom-12 left-12 space-y-3">
              <p className="text-[11px] font-medium leading-relaxed text-[#a9975f]">
                © <Year /> DivinLink
                <br />
                Verified Consultation Platform
              </p>
              <UlmindCredit variant="light" />
            </div>
          </div>
        </div>

        {/* ===================== RIGHT: form over gold ===================== */}
        <div className="relative flex flex-col justify-center px-6 py-10 sm:px-10 lg:pr-14">
          {/* mobile brand + mini illustration */}
          <div className="mb-8 flex flex-col items-center gap-3 lg:hidden">
            <div className="w-40">
              <AstrologyScene />
            </div>
            <div className="flex items-center gap-2">
              <span className="relative flex size-9 items-center justify-center rounded-xl overflow-hidden shadow-soft">
                <Image
                  src="/logo.png"
                  alt="DivinLink"
                  width={36}
                  height={36}
                  className="size-full object-contain"
                  priority
                />
              </span>
              <span className="font-serif-display text-lg font-semibold tracking-wide text-white">
                DivinLink
              </span>
            </div>
          </div>

          <div className="mx-auto w-full max-w-sm">
            <h1 className="font-display text-4xl font-black tracking-tight text-white">Login</h1>

            {/* subtle portal switch (kept for functionality) */}
            <div className="mt-5 grid grid-cols-2 gap-1 rounded-full border border-white/20 bg-white/10 p-1 backdrop-blur-sm">
              <button
                type="button"
                onClick={() => switchPortal("admin")}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-full py-2 text-xs font-bold transition-all cursor-pointer",
                  !isAstrologerMode ? "bg-[#FFFBEA] text-[#7a5f12] shadow-sm" : "text-white/70 hover:text-white"
                )}
              >
                <ShieldCheck className="size-3.5" />
                Super Admin
              </button>
              <button
                type="button"
                onClick={() => switchPortal("astrologer")}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-full py-2 text-xs font-bold transition-all cursor-pointer",
                  isAstrologerMode ? "bg-[#FFFBEA] text-[#7a5f12] shadow-sm" : "text-white/70 hover:text-white"
                )}
              >
                <Sparkles className="size-3.5" />
                Astrologer
              </button>
            </div>

            {error && (
              <Alert tone="error" className="mt-5 rounded-2xl">
                {error.message}
              </Alert>
            )}

            <form onSubmit={onSubmit} className="mt-6 space-y-5" noValidate>
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-semibold text-white/90">
                  {isAstrologerMode ? "Astrologer Email" : "Username"}
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your username"
                  className="w-full rounded-xl border border-white/20 bg-white/12 px-4 py-3 text-sm font-medium text-white placeholder:text-white/50 transition-all focus:border-[#FFFBEA] focus:bg-white/18 focus:outline-hidden focus:ring-4 focus:ring-[#FFFBEA]/20"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-semibold text-white/90">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full rounded-xl border border-white/20 bg-white/12 px-4 py-3 pr-11 text-sm font-medium text-white placeholder:text-white/50 transition-all focus:border-[#FFFBEA] focus:bg-white/18 focus:outline-hidden focus:ring-4 focus:ring-[#FFFBEA]/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-white/60 transition-colors hover:text-white cursor-pointer"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                <div className="flex items-center justify-end">
                  <Link
                    href="/forgot-password"
                    className="text-xs font-medium text-white/80 transition-colors hover:text-white hover:underline"
                  >
                    Forgot Password?
                  </Link>
                </div>
              </div>

              <button
                type="submit"
                disabled={busy || !email || !password}
                className={cn(
                  "flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-bold text-[#7a5f12] transition-all cursor-pointer",
                  "bg-gradient-to-r from-[#FFFBEA] via-[#FBF1CF] to-[#F3E3A6]",
                  "shadow-[0_12px_28px_-10px_rgba(0,0,0,0.5)] hover:brightness-105 hover:scale-[1.01] active:scale-[0.99]",
                  "disabled:opacity-50 disabled:pointer-events-none disabled:shadow-none"
                )}
              >
                {busy
                  ? "Authenticating..."
                  : isAstrologerMode
                  ? "Login to Astrologer Studio"
                  : "Login to Console"}
                <ArrowRight className="size-4" />
              </button>
            </form>

            {/* switch / "register" line */}
            <div className="mt-6 text-center text-sm font-semibold text-white/90">
              {isAstrologerMode ? "Are you a Platform Admin?" : "Are you an Astrologer?"}
              <br />
              <button
                type="button"
                onClick={() => switchPortal(isAstrologerMode ? "admin" : "astrologer")}
                className="mt-0.5 inline-flex items-center gap-1 text-[#FFFBEA] underline underline-offset-2 transition-colors hover:text-white cursor-pointer"
              >
                {isAstrologerMode ? "Admin Login" : "Astrologer Login"}
              </button>
            </div>

            <div className="mt-3 text-center text-[11px] text-white/70">
              <button
                type="button"
                onClick={() => fillSampleAccount(portal)}
                className="font-semibold underline underline-offset-2 hover:text-white cursor-pointer"
              >
                {isAstrologerMode ? "Autofill Astrologer (Kanu)" : "Autofill Super Admin"}
              </button>
            </div>

            {/* ULMIND credit — mobile only (desktop shows it on the left card) */}
            <div className="mt-6 flex justify-center lg:hidden">
              <UlmindCredit variant="light" />
            </div>
          </div>
        </div>

        {/* contact, bottom-right of the card (reference) */}
        <p className="absolute bottom-6 right-8 hidden text-right text-[11px] leading-relaxed text-white/75 lg:block">
          Have a problem? Contact us at
          <br />
          <span className="underline underline-offset-2">astroapp26@gmail.com</span>
        </p>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-[#9c7b16] text-[#FFFBEA]">
          Loading portal...
        </div>
      }
    >
      <LoginForm />
    </React.Suspense>
  );
}
