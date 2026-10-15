"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { LoadingBlock } from "@/components/ui";
import { useAuth } from "@/providers/auth-provider";

/**
 * One door for everyone. Where it leads depends on the role, because admins and
 * astrologers share this app but not the same screens.
 */
export default function RootPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  React.useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (user.role === "astrologer") router.replace("/me");
    else router.replace("/dashboard");
  }, [user, loading, router]);

  return (
    <div className="flex min-h-dvh items-center justify-center">
      <LoadingBlock label="Taking you to your panel…" />
    </div>
  );
}
