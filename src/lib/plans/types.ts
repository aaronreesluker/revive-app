"use client";

export type PlanId = "lite" | "core" | "growth";

export interface FeatureFlags {
  aiReceptionist: boolean;
  autoFollowUps: boolean;
  payments: boolean;
  reviews: boolean;
  advancedWorkflows: boolean;
  multiLocation: boolean;
  advancedAnalytics: boolean;
  /**
   * Soft cap for assistant chat messages per billing period.
   * Use 0 for "no access" and a large number (e.g. 999999) to represent "effectively unlimited" in demos.
   */
  assistantMessagesLimit: number;
  /**
   * Joint token collective - shared token pool for teams.
   * Price per additional user: £50/month
   */
  jointTokenCollective: boolean;
  jointTokenCollectivePricePerUser: number; // GBP per month
}

export interface PlanConfig {
  id: PlanId;
  /**
   * Internal name, e.g. "Lite", "Core", "Growth".
   */
  name: string;
  /**
   * Short label suitable for UI chips / badges.
   */
  label: string;
  /**
   * Short marketing strapline.
   */
  strapline: string;
  /**
   * One‑line outcome description used in pricing / onboarding copy.
   */
  outcome: string;
  features: FeatureFlags;
}


