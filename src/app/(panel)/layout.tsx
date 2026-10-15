"use client";

import { PanelShell } from "@/components/layout/panel-shell";
import { LoadingBlock } from "@/components/ui";
import { useRequireAuth } from "@/providers/auth-provider";

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  // Ordinary users have no business in this app at all.
  const { ready } = useRequireAuth({
    roles: ["admin", "super_admin", "astrologer"],
    signInPath: "/login",
  });

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <LoadingBlock label="Checking your access…" />
      </div>
    );
  }

  return <PanelShell>{children}</PanelShell>;
}
