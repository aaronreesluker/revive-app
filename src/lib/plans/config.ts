import type { FeatureFlags, PlanConfig, PlanId } from "./types";

/**
 * Simplified for in-house use: All features enabled by default
 * Token limits are handled separately to prevent going overboard
 */
export const DEFAULT_FEATURES: FeatureFlags = {
  aiReceptionist: true,
  autoFollowUps: true,
  payments: true,
  reviews: true,
  advancedWorkflows: true,
  multiLocation: true,
  advancedAnalytics: true,
  assistantMessagesLimit: 999_999, // Effectively unlimited for in-house use
  jointTokenCollective: true,
  jointTokenCollectivePricePerUser: 0, // No charge for in-house use
};

export const DEFAULT_PLAN_ID: PlanId = "core";

// Minimal plan config for backward compatibility
export function getPlanConfig(planId: PlanId | null | undefined): PlanConfig {
  return {
    id: DEFAULT_PLAN_ID,
    name: "Internal",
    label: "Internal",
    strapline: "Internal use",
    outcome: "All features enabled",
    features: DEFAULT_FEATURES,
  };
}

export function getFeatureFlags(planId: PlanId | null | undefined): FeatureFlags {
  return DEFAULT_FEATURES;
}


