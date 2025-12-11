"use server";

import { promises as fs } from "fs";
import path from "path";
import type { TokenAddon } from "@/lib/tokens";

export type TokenSnapshot = {
  usedTokens: number;
  baseAllowance: number;
  remainingTokens: number;
  rolloverTokens: number;
  purchases: Array<{
    purchaseId: string;
    addon: TokenAddon;
    purchasedAt: string;
    autoTopUp?: boolean;
    chargeGBP?: number;
  }>;
  lastResetPeriod?: string;
  killswitchEnabled?: boolean;
  autoTopUpNotice?: unknown;
};

const DATA_ROOT = path.join(process.cwd(), "tmp", "assistant-data");
const TOKENS_PATH = path.join(DATA_ROOT, "tokens.json");

async function ensureDataRoot() {
  try {
    await fs.mkdir(DATA_ROOT, { recursive: true });
  } catch {
    // ignore
  }
}

export async function loadTokensSnapshot(): Promise<TokenSnapshot> {
  await ensureDataRoot();
  try {
    const payload = await fs.readFile(TOKENS_PATH, "utf-8");
    const parsed = JSON.parse(payload);
    return {
      usedTokens: Number(parsed.usedTokens ?? 0),
      baseAllowance: Number(parsed.baseAllowance ?? 25000),
      remainingTokens: Number(parsed.remainingTokens ?? Math.max(0, 25000 - Number(parsed.usedTokens ?? 0))),
      rolloverTokens: Number(parsed.rolloverTokens ?? 0),
      purchases: Array.isArray(parsed.purchases) ? parsed.purchases : [],
      lastResetPeriod: typeof parsed.lastResetPeriod === "string" ? parsed.lastResetPeriod : undefined,
      killswitchEnabled: Boolean(parsed.killswitchEnabled ?? false),
      autoTopUpNotice: parsed.autoTopUpNotice ?? null,
    };
  } catch {
    return {
      usedTokens: 18420,
      baseAllowance: 25000,
      remainingTokens: 25000 - 18420,
      rolloverTokens: 0,
      purchases: [],
    };
  }
}

export async function persistTokensSnapshot(snapshot: TokenSnapshot) {
  await ensureDataRoot();
  await fs.writeFile(TOKENS_PATH, JSON.stringify(snapshot, null, 2), "utf-8");
}

