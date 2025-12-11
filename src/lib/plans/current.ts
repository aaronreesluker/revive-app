import type { PlanId } from "./types";
import { DEFAULT_PLAN_ID } from "./config";

/**
 * Simplified for in-house use: All tenants get the same plan
 */
export function getPlanForTenant(tenantId: string | null | undefined): PlanId {
  return DEFAULT_PLAN_ID;
}


