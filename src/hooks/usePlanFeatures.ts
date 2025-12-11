"use client";

import { useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import type { FeatureFlags, PlanConfig, PlanId } from "@/lib/plans/types";
import { getFeatureFlags, getPlanConfig } from "@/lib/plans/config";
import { getPlanForTenant } from "@/lib/plans/current";

export type { PlanId, PlanConfig, FeatureFlags };

export function useCurrentPlan(): {
  loading: boolean;
  planId: PlanId;
  plan: PlanConfig;
  features: FeatureFlags;
} {
  const { user, loading } = useAuth();

  const planId: PlanId = useMemo(() => {
    if (!user) return getPlanForTenant(null);
    return getPlanForTenant(user.tenantId);
  }, [user]);

  const plan = useMemo(() => getPlanConfig(planId), [planId]);
  const features = useMemo(() => plan.features, [plan]);

  return { loading, planId, plan, features };
}


