/**
 * AI API configuration and cost management.
 */

export type AIModel = "gpt-4" | "gpt-3.5-turbo" | "claude-3-haiku" | "claude-3-sonnet";

export interface ModelConfig {
  model: AIModel;
  inputCostPer1K: number; // USD
  outputCostPer1K: number; // USD
  maxTokens: number;
  useForLearning: boolean;
  useForAssistant: boolean;
}

export const MODEL_CONFIGS: Record<AIModel, ModelConfig> = {
  "gpt-4": {
    model: "gpt-4",
    inputCostPer1K: 0.03,
    outputCostPer1K: 0.06,
    maxTokens: 8192,
    useForLearning: false, // Too expensive for batch analysis
    useForAssistant: true,
  },
  "gpt-3.5-turbo": {
    model: "gpt-3.5-turbo",
    inputCostPer1K: 0.0015,
    outputCostPer1K: 0.002,
    maxTokens: 16385,
    useForLearning: true, // Cost-effective for batch analysis
    useForAssistant: true,
  },
  "claude-3-haiku": {
    model: "claude-3-haiku",
    inputCostPer1K: 0.00025,
    outputCostPer1K: 0.00125,
    maxTokens: 200000,
    useForLearning: true, // Very cost-effective
    useForAssistant: true,
  },
  "claude-3-sonnet": {
    model: "claude-3-sonnet",
    inputCostPer1K: 0.003,
    outputCostPer1K: 0.015,
    maxTokens: 200000,
    useForLearning: false,
    useForAssistant: true,
  },
};

/**
 * Default models based on use case and cost optimization
 */
export const DEFAULT_MODELS = {
  learning: "claude-3-haiku" as AIModel, // Cheapest for batch analysis
  assistant: "gpt-3.5-turbo" as AIModel, // Balance of cost and quality
  assistantPremium: "gpt-4" as AIModel, // For Growth plan users (optional)
};

/**
 * Global monthly AI cost limit (USD) for in-house use
 * This prevents going overboard with token usage
 */
export const GLOBAL_MONTHLY_AI_COST_LIMIT = 200.0; // ~148,000 GPT-3.5 conversations

/**
 * @deprecated Use GLOBAL_MONTHLY_AI_COST_LIMIT instead
 * Kept for backward compatibility
 */
export const PLAN_AI_COST_LIMITS: Record<string, number> = {
  lite: GLOBAL_MONTHLY_AI_COST_LIMIT,
  core: GLOBAL_MONTHLY_AI_COST_LIMIT,
  growth: GLOBAL_MONTHLY_AI_COST_LIMIT,
};

/**
 * Estimate cost for a request
 */
export function estimateCost(
  model: AIModel,
  inputTokens: number,
  outputTokens: number
): number {
  const config = MODEL_CONFIGS[model];
  const inputCost = (inputTokens / 1000) * config.inputCostPer1K;
  const outputCost = (outputTokens / 1000) * config.outputCostPer1K;
  return inputCost + outputCost;
}

/**
 * Get recommended model for a plan
 */
export function getModelForPlan(planId: string, useCase: "learning" | "assistant"): AIModel {
  if (useCase === "assistant" && planId === "growth") {
    // Growth plan can optionally use GPT-4, but default to GPT-3.5 for cost control
    return DEFAULT_MODELS.assistant;
  }
  return useCase === "learning" ? DEFAULT_MODELS.learning : DEFAULT_MODELS.assistant;
}
