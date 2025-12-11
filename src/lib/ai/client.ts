/**
 * AI API client with cost tracking and fallback support.
 * Supports OpenAI and Anthropic APIs.
 */

import { getModelForPlan, estimateCost, type AIModel } from "./config";

export interface AIRequest {
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  model?: AIModel;
  maxTokens?: number;
  temperature?: number;
}

export interface AIResponse {
  content: string;
  model: AIModel;
  inputTokens: number;
  outputTokens: number;
  cost: number;
}

/**
 * Call OpenAI API
 */
async function callOpenAI(
  request: AIRequest,
  apiKey: string,
  model: AIModel = "gpt-3.5-turbo"
): Promise<AIResponse> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: request.messages,
      max_tokens: request.maxTokens ?? 1000,
      temperature: request.temperature ?? 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(`OpenAI API error: ${error.error?.message || error.error || "Unknown error"}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content || "";
  const inputTokens = data.usage?.prompt_tokens || 0;
  const outputTokens = data.usage?.completion_tokens || 0;

  return {
    content,
    model,
    inputTokens,
    outputTokens,
    cost: estimateCost(model, inputTokens, outputTokens),
  };
}

/**
 * Call Anthropic API
 */
async function callAnthropic(
  request: AIRequest,
  apiKey: string,
  model: AIModel = "claude-3-haiku"
): Promise<AIResponse> {
  // Convert messages format for Anthropic
  const systemMessage = request.messages.find((m) => m.role === "system");
  const conversationMessages = request.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    }));

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      messages: conversationMessages,
      max_tokens: request.maxTokens ?? 1000,
      temperature: request.temperature ?? 0.7,
      ...(systemMessage && { system: systemMessage.content }),
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(`Anthropic API error: ${error.error?.message || error.error || "Unknown error"}`);
  }

  const data = await response.json();
  const content = data.content[0]?.text || "";
  const inputTokens = data.usage?.input_tokens || 0;
  const outputTokens = data.usage?.output_tokens || 0;

  return {
    content,
    model,
    inputTokens,
    outputTokens,
    cost: estimateCost(model, inputTokens, outputTokens),
  };
}

/**
 * Main AI client function - automatically selects provider based on model
 */
export async function callAI(
  request: AIRequest,
  planId: string,
  useCase: "learning" | "assistant"
): Promise<AIResponse> {
  const model = request.model || getModelForPlan(planId, useCase);
  
  // Get API keys from environment
  const openAIKey = process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  // Determine which provider to use
  const isOpenAI = model.startsWith("gpt-");
  const isAnthropic = model.startsWith("claude-");

  if (isOpenAI && openAIKey) {
    return callOpenAI(request, openAIKey, model);
  }

  if (isAnthropic && anthropicKey) {
    return callAnthropic(request, anthropicKey, model);
  }

  // Fallback: try OpenAI with GPT-3.5 if no specific key
  if (openAIKey) {
    return callOpenAI(request, openAIKey, "gpt-3.5-turbo");
  }

  // No API keys available - throw error
  throw new Error(
    "No AI API keys configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY in environment variables."
  );
}

