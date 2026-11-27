"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { LoadingBlock } from "@/components/ui";

/**
 * Legacy weekly appointment schedule route — replaced cleanly by Uber-style
 * automatic live presence on the Purohit Dashboard.
 */
export default function PurohitAvailabilityRedirectPage() {
  const router = useRouter();
  React.useEffect(() => {
    router.replace("/purohit-dashboard");
  }, [router]);

  return <LoadingBlock label="Redirecting to Live Purohit Dashboard..." />;
}
