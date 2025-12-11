import { NextRequest, NextResponse } from "next/server";
import { callAI } from "@/lib/ai/client";
import { GLOBAL_MONTHLY_AI_COST_LIMIT } from "@/lib/ai/config";
import { trackAIUsage, checkTenantLimit } from "@/lib/ai/usage-tracking";
import { getAssistantContext } from "@/lib/assistant-context";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, useCase = "assistant" } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Messages array required" }, { status: 400 });
    }

    // Get tenant info (in real app, get from authenticated session)
    // tenantId represents the business/company - all users in that company share the same pool
    const tenantId = request.headers.get("x-tenant-id") || "demo-agency";
    const monthlyLimit = GLOBAL_MONTHLY_AI_COST_LIMIT;

    // Check if tenant (business) has exceeded their monthly limit
    // This is shared across ALL users in the same company
    const limitCheck = checkTenantLimit(tenantId, "default", monthlyLimit);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          error: "Monthly AI usage limit exceeded",
          currentCost: limitCheck.currentCost,
          limit: monthlyLimit,
        },
        { status: 429 }
      );
    }

    // Get assistant context for system message
    let contextMessage = "";
    const isSalesAssistant = useCase === "sales_assistant";
    try {
      const context = await getAssistantContext();
      if (isSalesAssistant) {
        // Sales-focused context
        contextMessage = `You are a sales assistant helping a salesperson track their performance. Focus on:
- Sales leads and close rates
- Revenue from closed deals (including upsells)
- Trade-specific performance
- Follow-up recommendations
- Sales pipeline insights

Current sales context:
${context.summary.sales}

You have access to detailed sales leads data including leads by trade, close rates, revenue, and upsells. When asked about sales, leads, trades, or revenue, reference this data. Keep responses focused on sales performance and actionable insights.`;
      } else {
        // Admin/ops context
        contextMessage = `Current business context:\n${Object.entries(context.summary)
          .map(([key, value]) => `- ${key}: ${value}`)
          .join("\n")}\n\nYou have access to sales leads data including leads by trade, close rates, revenue, and upsells. When asked about sales, leads, or trades, reference this data.`;
      }
    } catch (err) {
      console.warn("Failed to load assistant context:", err);
    }

    // Build messages with system context
    const messagesWithContext = contextMessage
      ? [
          {
            role: "system" as const,
            content: contextMessage,
          },
          ...messages,
        ]
      : messages;

    // Call AI
    const response = await callAI(
      {
        messages: messagesWithContext,
        maxTokens: 1000,
        temperature: 0.7,
      },
      "default",
      useCase as "learning" | "assistant"
    );

    // Track usage for billing/analytics
    trackAIUsage({
      tenantId,
      timestamp: Date.now(),
      model: response.model,
      inputTokens: response.inputTokens,
      outputTokens: response.outputTokens,
      cost: response.cost,
      useCase: useCase as "assistant" | "learning" | "receptionist",
      requestId: `req-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    });

    return NextResponse.json({
      content: response.content,
      model: response.model,
      usage: {
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
        cost: response.cost,
        monthlyCost: limitCheck.currentCost + response.cost,
        monthlyLimit,
        remaining: limitCheck.remaining - response.cost,
      },
    });
  } catch (error) {
    console.error("AI API error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    
    // Return error but don't expose API key issues to client
    if (message.includes("API key")) {
      return NextResponse.json(
        { error: "AI service temporarily unavailable" },
        { status: 503 }
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

