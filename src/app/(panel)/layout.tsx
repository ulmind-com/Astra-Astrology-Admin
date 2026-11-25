"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

import { PanelShell } from "@/components/layout/panel-shell";
import { LoadingBlock } from "@/components/ui";
import { useRequireAuth } from "@/providers/auth-provider";
import type { UserRole } from "@/types";

function allowedRolesForPath(pathname: string): UserRole[] {
  if (pathname.startsWith("/purohit-dashboard")) {
    return ["purohit", "admin", "super_admin"];
  }
  if (pathname === "/me/password" || pathname.startsWith("/earnings")) {
    return ["astrologer", "purohit", "admin", "super_admin"];
  }
  if (
    pathname.startsWith("/me") ||
    pathname.startsWith("/appointments") ||
    pathname.startsWith("/reviews") ||
    pathname.startsWith("/call") ||
    pathname.startsWith("/chat")
  ) {
    return ["astrologer", "admin", "super_admin"];
  }
  return ["admin", "super_admin"];
}

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const roles = React.useMemo(() => allowedRolesForPath(pathname), [pathname]);

  // Enforce strict per-route role boundaries before mounting panel pages.
  const { ready } = useRequireAuth({
    roles,
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
