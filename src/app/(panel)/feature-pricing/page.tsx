"use client";

import { useQuery } from "@tanstack/react-query";
import * as React from "react";

import { PanelHeader } from "@/components/layout/panel-shell";
import { FeaturePricingCard } from "@/components/settings/feature-pricing-card";
import { Alert, LoadingBlock } from "@/components/ui";
import { adminSettingsApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { useRequireAuth } from "@/providers/auth-provider";

export default function FeaturePricingPage() {
  const { ready } = useRequireAuth({ roles: ["admin", "super_admin"], signInPath: "/login" });

  const { data: settings, isLoading, error } = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: adminSettingsApi.get,
    enabled: ready,
  });

  if (!ready) return <LoadingBlock />;
  if (isLoading) return <LoadingBlock label="Loading feature pricing..." />;
  if (error) return <Alert tone="error">{(error as ApiError).message}</Alert>;
  if (!settings) return null;

  return (
    <>
      <PanelHeader
        title="Feature Pricing & Coin Control"
        description="Configure coin costs per calculation for public astrology features (Kundli, KP, Nakshatra, Palm, etc.). Setting 0 coins makes a feature completely free."
      />
      <FeaturePricingCard settings={settings} />
    </>
  );
}
