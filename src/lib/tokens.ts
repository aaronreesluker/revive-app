import type { TierId } from "./tiers";

export type TokenAddon = {
  id: string;
  name: string;
  tokens: number;
  priceGBP: number;
  description: string;
  recommendedTiers?: TierId[];
  highlight?: string;
};

export const tokenAddons: TokenAddon[] = [
  {
    id: "burst-15k",
    name: "15k Burst Pack",
    tokens: 15000,
    priceGBP: 19,
    description: "Perfect for seasonal campaigns or receptionist overages.",
    recommendedTiers: ["lite", "core"],
  },
  {
    id: "scale-50k",
    name: "50k Scale Pack",
    tokens: 50000,
    priceGBP: 39,
    description: "Adds capacity for new automations and follow-up sequences.",
    recommendedTiers: ["core", "growth"],
    highlight: "Most popular",
  },
  {
    id: "ops-125k",
    name: "125k Ops Pack",
    tokens: 125000,
    priceGBP: 79,
    description: "Ideal for multi-location teams or bespoke AI workflows.",
    recommendedTiers: ["growth"],
  },
];

export const autoTopUpPack: TokenAddon = {
  id: "auto-topup-25k",
  name: "Auto Top-Up Pack",
  tokens: 25000,
  priceGBP: 27,
  description: "Automatically applied when usage exceeds allowance and kill switch is off.",
  highlight: "Automatic",
};
