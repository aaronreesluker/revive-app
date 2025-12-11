// Legacy tier system - now mapped to new plan system
// This is kept for backward compatibility with preview/demo features
// Maps: starter → lite, professional → core, enterprise → growth
export type TierId = "lite" | "core" | "growth";

export const TIER_SEQUENCE: TierId[] = ["lite", "core", "growth"];

export const tierOrder: Record<TierId, number> = {
  lite: 0,
  core: 1,
  growth: 2,
};

export const tierMeta: Record<
  TierId,
  {
    label: string;
    strapline: string;
    features: string[];
    highlightStat: string;
    color: string;
    tokenAllowance: number;
  }
> = {
  lite: {
    label: "Lite",
    strapline: "Get organised and centralise leads in one workspace.",
    features: [
      "Contact management & pipeline tracking",
      "AI assistant (unlimited messages)",
      "Basic analytics & reporting",
      "Payment collection & invoice management",
    ],
    highlightStat: "Get organised and centralise leads in one workspace",
    color: "text-emerald-400",
    tokenAllowance: 25000,
  },
  core: {
    label: "Core",
    strapline: "Never miss a lead – AI receptionist answers and follows up automatically.",
    features: [
      "AI receptionist answers calls & SMS 24/7",
      "Automated follow-ups & lead nurturing",
      "Advanced analytics & insights",
      "AI assistant (unlimited messages)",
    ],
    highlightStat: "Never miss a lead with AI receptionist",
    color: "text-blue-400",
    tokenAllowance: 75000,
  },
  growth: {
    label: "Growth",
    strapline: "Ops team in a box with multi-location and deeper automation.",
    features: [
      "Multi-location management",
      "Advanced workflows & bespoke automations",
      "Deeper reporting & analytics",
      "AI assistant (unlimited messages)",
    ],
    highlightStat: "Ops team in a box for scaling operations",
    color: "text-purple-400",
    tokenAllowance: 200000,
  },
};

export function getNextTier(current: TierId): TierId | null {
  const index = tierOrder[current];
  if (index === undefined) return null;
  return TIER_SEQUENCE[index + 1] ?? null;
}

export function getPreviousTier(current: TierId): TierId | null {
  const index = tierOrder[current];
  if (index === undefined) return null;
  return TIER_SEQUENCE[index - 1] ?? null;
}

export function isTierOrHigher(current: TierId, target: TierId): boolean {
  return tierOrder[current] >= tierOrder[target];
}
