"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronRight,
  Eye,
  EyeOff,
  HelpCircle,
  KeyRound,
  Lock,
  Mail,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Wallet,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { Alert, Avatar, Button } from "@/components/ui";
import { authApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { useAuth, useRequireAuth } from "@/providers/auth-provider";

export default function ChangePasswordPage() {
  const { ready } = useRequireAuth({
    roles: ["astrologer", "admin", "super_admin"],
    signInPath: "/login",
  });
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [current, setCurrent] = React.useState("");
  const [next, setNext] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [mismatch, setMismatch] = React.useState(false);

  // Visibility toggles
  const [showCurrent, setShowCurrent] = React.useState(false);
  const [showNext, setShowNext] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);

  // Live password evaluation
  const hasMinLength = next.length >= 8;
  const hasUpper = /[A-Z]/.test(next);
  const hasLower = /[a-z]/.test(next);
  const hasNumber = /[0-9]/.test(next);
  const hasSpecial = /[^A-Za-z0-9]/.test(next);

  const passedCount = [
    hasMinLength,
    hasUpper && hasLower,
    hasNumber,
    hasSpecial,
  ].filter(Boolean).length;

  const strengthDetails = React.useMemo(() => {
    if (!next) return { score: 0, label: "Not entered", color: "bg-slate-200", textColor: "text-slate-400" };
    if (passedCount <= 1) return { score: 1, label: "Weak", color: "bg-rose-500", textColor: "text-rose-600" };
    if (passedCount === 2) return { score: 2, label: "Fair", color: "bg-amber-500", textColor: "text-amber-600" };
    if (passedCount === 3) return { score: 3, label: "Good", color: "bg-sky-500", textColor: "text-sky-600" };
    return { score: 4, label: "Excellent & Secure", color: "bg-emerald-500", textColor: "text-emerald-600" };
  }, [next, passedCount]);

  const passwordsMatch = confirm.length > 0 && next === confirm;
  const passwordsMismatch = confirm.length > 0 && next !== confirm;

  const change = useMutation({
    mutationFn: () => authApi.changePassword(next, current),
    onSuccess: async () => {
      toast.success("Master password updated successfully!");
      await queryClient.invalidateQueries({ queryKey: ["astrologer", "me"] });
      router.push("/me");
    },
    onError: (error: ApiError) => {
      if (error.status !== 422) {
        toast.error(error.message || "Failed to update password.");
      }
    },
  });

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (next !== confirm) {
      setMismatch(true);
      return;
    }
    setMismatch(false);
    change.mutate();
  }

  const errors = (change.error as ApiError | null)?.fieldErrors ?? {};

  if (!ready) return null;

  return (
    <div className="space-y-8 pb-12">
      {/* Top Header / Breadcrumb Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <Link
            href="/me"
            className="group inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-amber-600 transition-colors"
          >
            <span className="flex size-6 items-center justify-center rounded-lg bg-white border border-slate-200/80 shadow-xs group-hover:bg-amber-50 group-hover:border-amber-200 transition-all">
              <ArrowLeft className="size-3.5 stroke-[2.5]" />
            </span>
            <span>Back to Astrologer Profile</span>
          </Link>
          <div className="flex items-center gap-3 pt-1">
            <h1 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              Security & Password
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 border border-emerald-200/60 shadow-xs">
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
              256-Bit SSL Protected
            </span>
          </div>
          <p className="text-sm font-medium text-slate-500">
            Manage your credentials to keep your consultation appointments, earnings, and client charts protected.
          </p>
        </div>

        {/* Quick Role Badge */}
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur-md px-4 py-2.5 shadow-sm">
          <Avatar
            name={user?.full_name || "Astrologer"}
            src={user?.avatar_url ?? undefined}
            size="sm"
            className="ring-2 ring-amber-400/30"
          />
          <div className="text-left leading-tight">
            <p className="text-xs font-bold text-slate-900">
              {user?.full_name || "Astrologer"}
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600">
              {user?.role === "astrologer" ? "Certified Astrologer" : user?.role || "Staff"}
            </p>
          </div>
        </div>
      </div>

      {/* Main 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Ultra-Pro Password Change Form */}
        <div className="lg:col-span-7 xl:col-span-7">
          <div className="relative rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-[0_16px_40px_rgba(20,25,45,0.05)] transition-all">
            {/* Header Icon & Card Title */}
            <div className="flex items-start gap-4 pb-6 border-b border-slate-100">
              <div className="relative flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#B45309] via-[#D97706] to-[#F59E0B] shadow-[0_8px_20px_rgba(217,119,6,0.35)]">
                <KeyRound className="size-6 text-white stroke-[2.2]" />
                <span className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full bg-white shadow-xs">
                  <ShieldCheck className="size-3 text-emerald-600" />
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-lg font-bold text-slate-900">
                    Update Master Password
                  </h2>
                  <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 border border-amber-200/60">
                    Required
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-slate-500">
                  If you are using the temporary password issued at onboarding, choose a private passphrase known only to you.
                </p>
              </div>
            </div>

            {/* Error Banner */}
            {change.error && (change.error as ApiError).status !== 422 && (
              <div className="mt-6">
                <Alert tone="error" className="rounded-2xl border-rose-200 bg-rose-50/80 text-rose-800">
                  <ShieldAlert className="size-4 shrink-0 text-rose-600" />
                  <span>{(change.error as ApiError).message}</span>
                </Alert>
              </div>
            )}

            {/* Form */}
            <form onSubmit={onSubmit} className="mt-6 space-y-6" noValidate>
              {/* Current Password Field */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="current"
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider"
                  >
                    <span>Current Password</span>
                    <span className="text-amber-500">*</span>
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-xs font-semibold text-amber-600 hover:text-amber-700 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <Lock className="size-4.5" />
                  </div>
                  <input
                    id="current"
                    type={showCurrent ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    value={current}
                    onChange={(e) => setCurrent(e.target.value)}
                    placeholder="Enter current password"
                    className={cn(
                      "w-full rounded-2xl border bg-slate-50/60 pl-11 pr-11 py-3 text-sm font-medium text-slate-900 placeholder:text-slate-400 transition-all",
                      "focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500",
                      errors.current_password
                        ? "border-rose-400 bg-rose-50/40 text-rose-900 focus:ring-rose-400"
                        : "border-slate-200/90"
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-700 transition-colors"
                    title={showCurrent ? "Hide password" : "Show password"}
                  >
                    {showCurrent ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                {errors.current_password && (
                  <p className="text-xs font-semibold text-rose-600 animate-in fade-in">
                    {errors.current_password}
                  </p>
                )}
              </div>

              {/* New Password Field */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="new"
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider"
                  >
                    <span>New Password</span>
                    <span className="text-amber-500">*</span>
                  </label>
                  {next.length > 0 && (
                    <span className={cn("text-xs font-bold", strengthDetails.textColor)}>
                      {strengthDetails.label}
                    </span>
                  )}
                </div>

                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <KeyRound className="size-4.5" />
                  </div>
                  <input
                    id="new"
                    type={showNext ? "text" : "password"}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={next}
                    onChange={(e) => setNext(e.target.value)}
                    placeholder="Enter new strong password"
                    className={cn(
                      "w-full rounded-2xl border bg-slate-50/60 pl-11 pr-11 py-3 text-sm font-medium text-slate-900 placeholder:text-slate-400 transition-all",
                      "focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500",
                      errors.new_password
                        ? "border-rose-400 bg-rose-50/40 text-rose-900 focus:ring-rose-400"
                        : "border-slate-200/90"
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNext(!showNext)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-700 transition-colors"
                    title={showNext ? "Hide password" : "Show password"}
                  >
                    {showNext ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                {errors.new_password && (
                  <p className="text-xs font-semibold text-rose-600 animate-in fade-in">
                    {errors.new_password}
                  </p>
                )}

                {/* Dynamic Strength Progress Bars */}
                {next.length > 0 && (
                  <div className="pt-1.5 space-y-1.5">
                    <div className="grid grid-cols-4 gap-1.5">
                      {[1, 2, 3, 4].map((step) => (
                        <div
                          key={step}
                          className={cn(
                            "h-1.5 rounded-full transition-all duration-300",
                            step <= strengthDetails.score ? strengthDetails.color : "bg-slate-200"
                          )}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Password Criteria Checklist */}
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                  <div
                    className={cn(
                      "flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-medium border transition-all",
                      hasMinLength
                        ? "bg-emerald-50/80 text-emerald-800 border-emerald-200"
                        : "bg-slate-50 text-slate-500 border-slate-200/60"
                    )}
                  >
                    {hasMinLength ? (
                      <Check className="size-3.5 text-emerald-600 stroke-[3]" />
                    ) : (
                      <span className="size-2 rounded-full bg-slate-300" />
                    )}
                    <span>At least 8 characters</span>
                  </div>

                  <div
                    className={cn(
                      "flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-medium border transition-all",
                      hasUpper && hasLower
                        ? "bg-emerald-50/80 text-emerald-800 border-emerald-200"
                        : "bg-slate-50 text-slate-500 border-slate-200/60"
                    )}
                  >
                    {hasUpper && hasLower ? (
                      <Check className="size-3.5 text-emerald-600 stroke-[3]" />
                    ) : (
                      <span className="size-2 rounded-full bg-slate-300" />
                    )}
                    <span>Upper & lower case</span>
                  </div>

                  <div
                    className={cn(
                      "flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-medium border transition-all",
                      hasNumber
                        ? "bg-emerald-50/80 text-emerald-800 border-emerald-200"
                        : "bg-slate-50 text-slate-500 border-slate-200/60"
                    )}
                  >
                    {hasNumber ? (
                      <Check className="size-3.5 text-emerald-600 stroke-[3]" />
                    ) : (
                      <span className="size-2 rounded-full bg-slate-300" />
                    )}
                    <span>Contains number (0-9)</span>
                  </div>

                  <div
                    className={cn(
                      "flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-medium border transition-all",
                      hasSpecial
                        ? "bg-emerald-50/80 text-emerald-800 border-emerald-200"
                        : "bg-slate-50 text-slate-500 border-slate-200/60"
                    )}
                  >
                    {hasSpecial ? (
                      <Check className="size-3.5 text-emerald-600 stroke-[3]" />
                    ) : (
                      <span className="size-2 rounded-full bg-slate-300" />
                    )}
                    <span>Special symbol (!@#$)</span>
                  </div>
                </div>
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="confirm"
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider"
                  >
                    <span>Confirm New Password</span>
                    <span className="text-amber-500">*</span>
                  </label>
                  {passwordsMatch && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 animate-in fade-in">
                      <CheckCircle2 className="size-3.5" />
                      Passwords match
                    </span>
                  )}
                  {passwordsMismatch && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 animate-in fade-in">
                      <XCircle className="size-3.5" />
                      Does not match
                    </span>
                  )}
                </div>

                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <ShieldCheck className="size-4.5" />
                  </div>
                  <input
                    id="confirm"
                    type={showConfirm ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => {
                      setConfirm(e.target.value);
                      setMismatch(false);
                    }}
                    placeholder="Repeat new password"
                    className={cn(
                      "w-full rounded-2xl border bg-slate-50/60 pl-11 pr-11 py-3 text-sm font-medium text-slate-900 placeholder:text-slate-400 transition-all",
                      "focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500",
                      mismatch || passwordsMismatch
                        ? "border-rose-400 bg-rose-50/40 text-rose-900 focus:ring-rose-400"
                        : passwordsMatch
                        ? "border-emerald-400 bg-emerald-50/20 text-slate-900 focus:ring-emerald-400"
                        : "border-slate-200/90"
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-700 transition-colors"
                    title={showConfirm ? "Hide password" : "Show password"}
                  >
                    {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                {mismatch && (
                  <p className="text-xs font-semibold text-rose-600 animate-in fade-in">
                    The two passwords do not match. Please verify carefully.
                  </p>
                )}
              </div>

              {/* Form Action Buttons */}
              <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <Link href="/me" className="w-full sm:w-auto">
                  <Button
                    variant="secondary"
                    type="button"
                    className="w-full sm:w-auto rounded-2xl py-3 px-6 text-sm font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-900 border-slate-200/80 cursor-pointer"
                  >
                    Cancel
                  </Button>
                </Link>
                <button
                  type="submit"
                  disabled={change.isPending || !next || !current || passwordsMismatch}
                  className={cn(
                    "w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl py-3 px-7 text-sm font-bold text-white transition-all cursor-pointer",
                    "bg-gradient-to-r from-[#D97706] via-[#EA580C] to-[#F59E0B]",
                    "shadow-[0_10px_25px_-5px_rgba(217,119,6,0.5)] hover:shadow-[0_14px_30px_-5px_rgba(217,119,6,0.65)] hover:scale-[1.01] active:scale-[0.99]",
                    "disabled:opacity-50 disabled:pointer-events-none disabled:shadow-none"
                  )}
                >
                  <KeyRound className="size-4 stroke-[2.2]" />
                  <span>{change.isPending ? "Updating Password..." : "Update Master Password"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Security Context & Astrologer Trust Cards */}
        <div className="lg:col-span-5 xl:col-span-5 space-y-6">
          {/* Astrologer Identity Card */}
          <div className="rounded-3xl border border-slate-200/90 bg-gradient-to-br from-white via-amber-50/20 to-white p-6 shadow-[0_10px_30px_rgba(20,25,45,0.03)]">
            <div className="flex items-center gap-3.5">
              <div className="relative">
                <Avatar
                  name={user?.full_name || "Astrologer"}
                  src={user?.avatar_url ?? undefined}
                  size="md"
                  className="size-14 ring-4 ring-amber-400/20 shadow-md"
                />
                <span className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-white">
                  <Check className="size-2.5 text-white stroke-[3]" />
                </span>
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-display font-bold text-slate-900">
                    {user?.full_name || "Astrologer Account"}
                  </h3>
                  <Sparkles className="size-3.5 text-amber-500 fill-amber-500" />
                </div>
                <p className="text-xs font-medium text-slate-500 truncate max-w-[200px]">
                  {user?.email}
                </p>
                <div className="pt-1 flex items-center gap-2">
                  <span className="rounded-full bg-amber-100/80 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                    Certified Specialist
                  </span>
                  <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-emerald-500" />
                    Verified
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Security Protocols Notice */}
          <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-[0_10px_30px_rgba(20,25,45,0.03)] space-y-4">
            <div className="flex items-center gap-2.5 text-slate-900">
              <Shield className="size-5 text-[#D97706] stroke-[2.2]" />
              <h3 className="font-display text-sm font-bold">
                Why Astrologer Security Matters
              </h3>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Your Astrologer account holds privileged access to sensitive user consultations, horoscope databases, and financial balances:
            </p>

            <div className="space-y-3 pt-1">
              <div className="flex items-start gap-3 rounded-2xl bg-slate-50/80 p-3 border border-slate-100">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-amber-100/80 text-amber-800">
                  <Sparkles className="size-3.5" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-slate-900">Client Kundli & Horoscopes</h4>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    Personal birth times, locations, and confidential palm scans are strictly protected.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl bg-slate-50/80 p-3 border border-slate-100">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-emerald-100/80 text-emerald-800">
                  <Wallet className="size-3.5" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-slate-900">Earnings & Payout Routing</h4>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    Ensures withdrawal transactions and commission ledger history cannot be tampered with.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl bg-slate-50/80 p-3 border border-slate-100">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-sky-100/80 text-sky-800">
                  <ShieldCheck className="size-3.5" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-slate-900">Live Call & Chat Verification</h4>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    Prevents impersonation during private live audio, video, and chat consultations.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Best Practices Card */}
          <div className="rounded-3xl border border-slate-200/90 bg-gradient-to-br from-slate-900 via-slate-950 to-[#1c1304] p-6 text-white shadow-xl space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
                <Sparkles className="size-3.5" />
              </span>
              <h4 className="font-display text-xs font-bold uppercase tracking-wider text-amber-400">
                Security Recommendations
              </h4>
            </div>
            <ul className="space-y-2 text-xs text-slate-300">
              <li className="flex items-start gap-2">
                <span className="mt-1 size-1.5 shrink-0 rounded-full bg-amber-400" />
                <span>Do not use common names, birthdates, or telephone numbers.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 size-1.5 shrink-0 rounded-full bg-amber-400" />
                <span>Never share OTPs or recovery tokens even if requested by platform staff.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 size-1.5 shrink-0 rounded-full bg-amber-400" />
                <span>Sign out immediately if accessing the portal from shared or internet cafe computers.</span>
              </li>
            </ul>

            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <HelpCircle className="size-3 text-amber-400" />
                Need help?
              </span>
              <Link
                href="mailto:support@astraastrology.com"
                className="font-semibold text-amber-400 hover:text-amber-300 hover:underline"
              >
                Contact Security Desk
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
