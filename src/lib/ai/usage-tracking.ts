/**
 * AI usage tracking per tenant/client.
 * 
 * Architecture options:
 * 
 * Option 1: Single API Key (Recommended for most SaaS)
 * - You maintain one OpenAI/Anthropic account
 * - All clients use your API key
 * - You track usage per tenant and bill them accordingly
 * - Pros: Simple, you control costs, easier to manage
 * - Cons: You pay upfront, need to track usage carefully
 * 
 * Option 2: Bring Your Own Key (BYOK)
 * - Clients provide their own API keys
 * - Usage is billed directly to them
 * - You just proxy requests
 * - Pros: No cost to you, clients control their own limits
 * - Cons: More complex, clients need API accounts, harder to support
 * 
 * This implementation supports Option 1 (single key) with per-tenant tracking.
 */

export type AIUsageRecord = {
  tenantId: string;
  timestamp: number;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number; // USD
  useCase: "assistant" | "learning" | "receptionist";
  requestId: string;
};

// Storage key prefix for tenant-level AI usage tracking
// All users within the same tenant share the same usage pool
const STORAGE_KEY_PREFIX = "revive-ai-usage-tenant-";

/**
 * Track AI usage for a tenant
 */
export function trackAIUsage(record: AIUsageRecord): void {
  if (typeof window === "undefined") {
    // Server-side: Store in database or send to analytics service
    // For now, we'll log it (in production, use your database)
    console.log("[AI Usage]", record);
    return;
  }

  // Client-side: Store in localStorage for demo (in production, send to API)
  try {
    const key = `${STORAGE_KEY_PREFIX}${record.tenantId}`;
    const existing = localStorage.getItem(key);
    const records: AIUsageRecord[] = existing ? JSON.parse(existing) : [];
    records.push(record);
    
    // Keep only last 1000 records per tenant
    const trimmed = records.slice(-1000);
    localStorage.setItem(key, JSON.stringify(trimmed));
  } catch (error) {
    console.warn("Failed to track AI usage:", error);
  }
}

/**
 * Get usage summary for a tenant (last 30 days)
 */
export function getTenantUsage(tenantId: string): {
  totalCost: number;
  totalRequests: number;
  totalTokens: number;
  byUseCase: Record<string, { cost: number; requests: number }>;
  byModel: Record<string, { cost: number; requests: number }>;
} {
  if (typeof window === "undefined") {
    // Server-side: Query database
    return {
      totalCost: 0,
      totalRequests: 0,
      totalTokens: 0,
      byUseCase: {},
      byModel: {},
    };
  }

  try {
    const key = `${STORAGE_KEY_PREFIX}${tenantId}`;
    const existing = localStorage.getItem(key);
    if (!existing) {
      return {
        totalCost: 0,
        totalRequests: 0,
        totalTokens: 0,
        byUseCase: {},
        byModel: {},
      };
    }

    const records: AIUsageRecord[] = JSON.parse(existing);
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recent = records.filter((r) => r.timestamp >= thirtyDaysAgo);

    const totalCost = recent.reduce((sum, r) => sum + r.cost, 0);
    const totalRequests = recent.length;
    const totalTokens = recent.reduce((sum, r) => sum + r.inputTokens + r.outputTokens, 0);

    const byUseCase: Record<string, { cost: number; requests: number }> = {};
    const byModel: Record<string, { cost: number; requests: number }> = {};

    for (const record of recent) {
      // Group by use case
      if (!byUseCase[record.useCase]) {
        byUseCase[record.useCase] = { cost: 0, requests: 0 };
      }
      byUseCase[record.useCase].cost += record.cost;
      byUseCase[record.useCase].requests += 1;

      // Group by model
      if (!byModel[record.model]) {
        byModel[record.model] = { cost: 0, requests: 0 };
      }
      byModel[record.model].cost += record.cost;
      byModel[record.model].requests += 1;
    }

    return {
      totalCost,
      totalRequests,
      totalTokens,
      byUseCase,
      byModel,
    };
  } catch (error) {
    console.warn("Failed to get tenant usage:", error);
    return {
      totalCost: 0,
      totalRequests: 0,
      totalTokens: 0,
      byUseCase: {},
      byModel: {},
    };
  }
}

/**
 * Check if tenant has exceeded their AI cost limit
 */
export function checkTenantLimit(tenantId: string, planId: string, monthlyLimit: number): {
  allowed: boolean;
  currentCost: number;
  remaining: number;
} {
  const usage = getTenantUsage(tenantId);
  const currentCost = usage.totalCost;
  const remaining = Math.max(0, monthlyLimit - currentCost);
  const allowed = remaining > 0;

  return { allowed, currentCost, remaining };
}

