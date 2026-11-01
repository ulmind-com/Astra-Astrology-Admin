"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { startRegistration } from "@simplewebauthn/browser";
import {
  Fingerprint,
  Plus,
  Trash2,
  ShieldCheck,
  Smartphone,
  Laptop,
  Key,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Sparkles,
  Lock,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";

import { PanelHeader } from "@/components/layout/panel-shell";
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardDescription,
  CardHeader,
  CardTitle,
  Field,
  Input,
  LoadingBlock,
} from "@/components/ui";
import { passkeyApi, type PasskeyInfo } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { playNavFeedback } from "@/lib/sound";
import { useAuth, useRequireAuth } from "@/providers/auth-provider";

export default function PasskeysSecurityPage() {
  const { ready } = useRequireAuth({
    roles: ["admin", "super_admin", "astrologer"],
    signInPath: "/login",
  });
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [deviceName, setDeviceName] = React.useState("");
  const [isRegistering, setIsRegistering] = React.useState(false);
  const [deviceSupported, setDeviceSupported] = React.useState<boolean | null>(null);

  // Check WebAuthn platform authenticator support
  React.useEffect(() => {
    if (typeof window !== "undefined" && window.PublicKeyCredential) {
      if (PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
        PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
          .then((avail) => setDeviceSupported(avail))
          .catch(() => setDeviceSupported(false));
      } else {
        setDeviceSupported(true);
      }
    } else {
      setDeviceSupported(false);
    }
  }, []);

  const { data: passkeys, isLoading, error } = useQuery({
    queryKey: ["auth", "passkeys", "mine"],
    queryFn: passkeyApi.listMine,
    enabled: ready,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => passkeyApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth", "passkeys", "mine"] });
      toast.success("Passkey removed successfully.");
    },
    onError: (err: unknown) => {
      const msg = err instanceof ApiError ? err.message : "Failed to delete passkey.";
      toast.error(msg);
    },
  });

  const handleAddPasskey = async () => {
    try {
      playNavFeedback();
      setIsRegistering(true);

      // 1. Fetch options from backend
      toast.loading("Preparing device sensor...", { id: "passkey-reg" });
      const optionsRes = await passkeyApi.getRegisterOptions();

      // 2. Trigger native device fingerprint / Face ID prompt
      toast.loading("Touch your fingerprint sensor or verify with Face ID...", {
        id: "passkey-reg",
      });
      const attResp = await startRegistration({ optionsJSON: optionsRes });

      // 3. Send response to backend for cryptographic verification
      toast.loading("Verifying security key with server...", { id: "passkey-reg" });
      const verified = await passkeyApi.verifyRegistration({
        credential: attResp,
        device_name: deviceName.trim() || undefined,
      });

      queryClient.invalidateQueries({ queryKey: ["auth", "passkeys", "mine"] });
      setDeviceName("");
      toast.success("Biometric Passkey registered successfully!", {
        id: "passkey-reg",
        description: `You can now use ${verified.device_name} to log in without entering a password.`,
      });
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        toast.error("Fingerprint scan was cancelled or timed out.", { id: "passkey-reg" });
      } else if (err.name === "InvalidStateError") {
        toast.error("This fingerprint / passkey is already registered for your account.", {
          id: "passkey-reg",
        });
      } else {
        const msg = err instanceof ApiError ? err.message : err.message || "Failed to register passkey.";
        toast.error(msg, { id: "passkey-reg" });
      }
    } finally {
      setIsRegistering(false);
    }
  };

  if (!ready) return <LoadingBlock />;

  return (
    <>
      <PanelHeader
        title="Biometric Passkeys & Security"
        description="Log in instantly using your device's fingerprint sensor, Touch ID, Face ID, or Windows Hello. No passwords or OTPs required."
        action={
          <div className="flex items-center gap-2">
            <Link
              href="/me"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border/80 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" />
              Back to Profile
            </Link>
          </div>
        }
      />

      <div className="max-w-4xl space-y-6">
        {/* Device sensor capability status card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-border/60 bg-gradient-to-r from-amber-500/10 via-primary/5 to-transparent backdrop-blur-sm">
          <div className="flex items-center gap-3.5">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner">
              <Fingerprint className="size-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                Biometric Login Status
                {deviceSupported === true ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    <CheckCircle2 className="size-3" /> Sensor Ready
                  </span>
                ) : deviceSupported === false ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 border border-amber-500/30">
                    <AlertCircle className="size-3" /> Platform Authenticator Not Detected
                  </span>
                ) : null}
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Your device hardware (Touch ID / Fingerprint / Windows Hello) is ready to register passkeys.
              </p>
            </div>
          </div>
        </div>

        {/* Add New Passkey Box */}
        <Card className="border-primary/20 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="size-4 text-primary" />
              Add a New Fingerprint / Passkey
            </CardTitle>
            <CardDescription>
              Touch your fingerprint sensor when prompted to bind this device to your account.
            </CardDescription>
          </CardHeader>
          <CardBody>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
              <div className="flex-1">
                <Field
                  label="Device Label (Optional)"
                  hint="e.g. 'My MacBook Pro', 'Office PC', or 'Samsung Galaxy'"
                >
                  <Input
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                    placeholder="e.g. My Laptop Touch ID"
                    disabled={isRegistering}
                  />
                </Field>
              </div>
              <Button
                type="button"
                onClick={handleAddPasskey}
                disabled={isRegistering}
                className="h-10 px-5 text-xs font-bold shadow-glow shrink-0 flex items-center gap-2"
              >
                <Fingerprint className={`size-4 ${isRegistering ? "animate-pulse" : ""}`} />
                {isRegistering ? "Scanning Fingerprint..." : "Scan & Add Fingerprint"}
              </Button>
            </div>
          </CardBody>
        </Card>

        {/* List of Registered Passkeys */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Key className="size-4 text-brand-600" />
              Your Registered Passkeys
            </CardTitle>
            <CardDescription>
              These devices can log into your account instantly with biometric verification.
            </CardDescription>
          </CardHeader>
          <CardBody>
            {isLoading ? (
              <LoadingBlock label="Loading registered passkeys..." />
            ) : error ? (
              <Alert tone="error">{(error as ApiError).message}</Alert>
            ) : !passkeys || passkeys.length === 0 ? (
              <div className="text-center py-10 px-4 rounded-xl border border-dashed border-border/70 bg-muted/10">
                <Fingerprint className="size-10 mx-auto text-muted-foreground/60 mb-3" />
                <h4 className="text-sm font-semibold text-foreground">No Passkeys Registered Yet</h4>
                <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
                  Click the button above to add your device's fingerprint or Touch ID for 1-click passwordless sign-in.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {passkeys.map((passkey) => (
                  <div
                    key={passkey.id}
                    className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground/80">
                        {passkey.device_name.toLowerCase().includes("phone") ||
                        passkey.device_name.toLowerCase().includes("android") ||
                        passkey.device_name.toLowerCase().includes("ios") ? (
                          <Smartphone className="size-5" />
                        ) : (
                          <Laptop className="size-5" />
                        )}
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                          {passkey.device_name}
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold bg-primary/10 text-primary">
                            Active
                          </span>
                        </h4>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Added on {new Date(passkey.created_at).toLocaleDateString()} •{" "}
                          {passkey.last_used_at
                            ? `Last used ${new Date(passkey.last_used_at).toLocaleDateString()}`
                            : "Never used yet"}
                        </p>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Are you sure you want to remove "${passkey.device_name}"?`)) {
                          deleteMutation.mutate(passkey.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                      className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    >
                      <Trash2 className="size-3.5 mr-1" />
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Security Best Practices Card */}
        <div className="rounded-xl border border-border/50 bg-muted/20 p-4 text-xs text-muted-foreground space-y-1.5">
          <p className="font-semibold text-foreground flex items-center gap-1.5">
            <ShieldCheck className="size-3.5 text-emerald-600" />
            End-to-End Cryptographic Security
          </p>
          <p>
            Your raw biometric data (fingerprint or face) never leaves your device's Secure Enclave.
            Authentication is verified mathematically via W3C WebAuthn public-key cryptography.
          </p>
        </div>
      </div>
    </>
  );
}

