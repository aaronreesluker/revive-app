"use client";

import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/Button";
import { Send, Sparkles, Loader2 } from "lucide-react";
import { useEventLog } from "@/context/EventLogContext";
import { useCurrentPlan } from "@/hooks/usePlanFeatures";
import { useLearning } from "@/context/LearningContext";
import { useAuth } from "@/context/AuthContext";
import { canViewCompanyData } from "@/lib/permissions";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
};

const ADMIN_STARTER_PROMPTS = [
  "Summarise this week's automation performance",
  "Draft an email update for my VIP clients",
  "Where are we burning the most tokens right now?",
  "Suggest an escalation plan for overdue tasks",
];

const SALES_STARTER_PROMPTS = [
  "What's my close rate this month?",
  "Which trades are performing best for me?",
  "Help me draft a follow-up message for a lead",
  "What's my total revenue from closed deals?",
];

/**
 * Extracts a category from a user query to help the learning system
 * understand what types of questions users ask most often.
 */
function extractQueryCategory(query: string): string {
  const lower = query.toLowerCase();
  
  if (lower.includes("token") || lower.includes("usage") || lower.includes("burn")) {
    return "tokens";
  }
  if (lower.includes("automation") || lower.includes("workflow") || lower.includes("agent")) {
    return "automations";
  }
  if (lower.includes("payment") || lower.includes("invoice") || lower.includes("revenue") || lower.includes("collect")) {
    return "payments";
  }
  if (lower.includes("review") || lower.includes("feedback") || lower.includes("rating")) {
    return "reviews";
  }
  if (lower.includes("contact") || lower.includes("client") || lower.includes("customer") || lower.includes("lead")) {
    return "contacts";
  }
  if (lower.includes("draft") || lower.includes("email") || lower.includes("message") || lower.includes("script")) {
    return "drafting";
  }
  if (lower.includes("summary") || lower.includes("report") || lower.includes("insight") || lower.includes("analytics")) {
    return "analytics";
  }
  if (lower.includes("task") || lower.includes("ticket") || lower.includes("follow") || lower.includes("escalat")) {
    return "operations";
  }
  
  return "general";
}

export default function AssistantPage() {
  const { user } = useAuth();
  const effectiveRole = user?.role || "sales";
  const isSalesUser = effectiveRole === "sales";
  const canViewAllData = canViewCompanyData(effectiveRole);
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "assistant-welcome",
      role: "assistant",
      content: isSalesUser
        ? "Hey! I'm your sales assistant. Ask about your leads, close rates, revenue, or help with follow-ups and I'll pull context from your sales data."
        : "Hey! I'm your Revive ops copilot. Ask about automations, token usage, or draft comms and I'll pull context from the workspace.",
      createdAt: Date.now(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const { recordEvent } = useEventLog();
  const { features } = useCurrentPlan();
  const { recordEvent: recordLearningEvent } = useLearning();
  
  const starterPrompts = isSalesUser ? SALES_STARTER_PROMPTS : ADMIN_STARTER_PROMPTS;
  
  // Message counting removed for in-house use

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    
    // Message limit check removed for in-house use (effectively unlimited)

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
      createdAt: Date.now(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsStreaming(true);

    recordEvent({
      category: "system",
      action: "assistant_prompt_sent",
      summary: `Assistant prompt: ${trimmed.slice(0, 48)}${trimmed.length > 48 ? "…" : ""}`,
      severity: "info",
    });

    // Record learning event - track what users ask about
    recordLearningEvent({
      type: "assistant_query",
      metadata: {
        query: trimmed,
        queryLength: trimmed.length,
        category: extractQueryCategory(trimmed),
        action: "query_sent",
      },
    });

    try {
      // Call AI API
      let responseText = "";
      try {
        // Get tenant ID from auth (all users in same tenant share token pool)
        const tenantId = user?.tenantId || "demo-agency";
        
        const aiResponse = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "x-tenant-id": tenantId, // Pass tenant ID so usage is tracked at business level
          },
            body: JSON.stringify({
            messages: [
              ...messages.map((m) => ({ role: m.role, content: m.content })),
              { role: "user" as const, content: trimmed },
            ],
            useCase: isSalesUser ? "sales_assistant" : "assistant",
          }),
        });

        if (aiResponse.ok) {
          const data = await aiResponse.json();
          responseText = data.content || "I'm having trouble processing that. Could you rephrase?";
        } else {
          // Fallback to mock response if AI unavailable
          responseText =
            "Here's a quick plan:\n\n• Pull the latest ticket activity and highlight anything older than 48 hours\n• Queue follow-up drafts for your high-value accounts\n• Bundle token insights for your next client call\n\nWant me to prep any specific assets?";
        }
      } catch (aiError) {
        // Fallback to mock response
        console.warn("AI API unavailable, using fallback:", aiError);
        responseText =
          "Here's a quick plan:\n\n• Pull the latest ticket activity and highlight anything older than 48 hours\n• Queue follow-up drafts for your high-value accounts\n• Bundle token insights for your next client call\n\nWant me to prep any specific assets?";
      }

      let index = 0;
      const streamId = `assistant-stream-${Date.now()}`;
      const interval = setInterval(() => {
        index += 1;
        setMessages((prev) => {
          const existing = prev.find((message) => message.id === streamId);
          if (existing) {
            return prev.map((message) =>
              message.id === streamId
                ? { ...message, content: responseText.slice(0, index) }
                : message
            );
          }
          return [
            ...prev,
            {
              id: streamId,
              role: "assistant",
              content: responseText.slice(0, index),
              createdAt: Date.now(),
            },
          ];
        });
        if (index >= responseText.length) {
          clearInterval(interval);
          setIsStreaming(false);
          
          // Record successful interaction
          recordLearningEvent({
            type: "assistant_query",
            metadata: {
              query: trimmed,
              category: extractQueryCategory(trimmed),
              action: "response_received",
              outcome: "success",
              responseLength: responseText.length,
            },
          });
        }
      }, 12);
    } catch (error) {
      setIsStreaming(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-error-${Date.now()}`,
          role: "assistant",
          content: "Hmm, I hit a snag reaching the assistant service. Mind trying again?",
          createdAt: Date.now(),
        },
      ]);
      
      // Record failed interaction
      recordLearningEvent({
        type: "assistant_query",
        metadata: {
          query: trimmed,
          category: extractQueryCategory(trimmed),
          action: "response_failed",
          outcome: "failure",
        },
      });
    }
  };

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="flex flex-col rounded-3xl border border-white/10 bg-white/5 p-4 md:p-6 shadow-xl shadow-teal-500/10">
        <header className="mb-3 md:mb-4 flex flex-col gap-2 rounded-2xl bg-gradient-to-r from-teal-500/20 via-sky-400/20 to-transparent p-3 md:p-4">
          <div className="flex items-center gap-2 md:gap-3 text-xs md:text-sm uppercase tracking-[0.35em]" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
            <Sparkles size={14} className="md:w-4 md:h-4" />
            AI Copilot
          </div>
          <div className="flex flex-wrap items-end justify-between gap-2 md:gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl md:text-2xl font-semibold leading-tight" style={{ color: "var(--foreground)" }}>
                {isSalesUser ? "Sales Assistant" : "Assistant Studio"}
              </h1>
              <p className="mt-1 text-xs md:text-sm leading-relaxed" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
                {isSalesUser
                  ? "Ask about your leads, close rates, revenue, or get help with follow-ups. The assistant pulls context from your sales data and closed deals."
                  : "Ask for briefs, insights, or action plans across your Revive workspace. The assistant pulls context from tickets, payments, reviews, and automations."}
              </p>
            </div>
          </div>
        </header>

        <div className="grid gap-3 md:gap-4 lg:grid-cols-[minmax(0,1fr),320px]">
          <section className="flex flex-col rounded-2xl border border-white/10 bg-black/10 min-h-[calc(100vh-280px)] md:min-h-[400px] max-h-[calc(100vh-200px)] md:max-h-none overflow-hidden">
            <div className="space-y-3 p-3 md:p-4 overflow-y-auto flex-1 -webkit-overflow-scrolling-touch min-h-0">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`max-w-prose rounded-xl px-3 py-2.5 md:px-4 md:py-3 text-sm shadow-lg ring-1 ${
                    message.role === "assistant"
                      ? "bg-gradient-to-br from-white/10 to-white/5 ring-white/10"
                      : "ml-auto bg-teal-500/80 text-black ring-teal-400/30"
                  }`}
                >
                  <div className="flex justify-between text-[10px] md:text-[11px] uppercase tracking-[0.3em]" style={{ color: "color-mix(in oklab, var(--foreground), transparent 55%)" }}>
                    <span>{message.role === "assistant" ? "assistant" : "you"}</span>
                    <span>{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <div className="mt-1.5 md:mt-2 whitespace-pre-wrap text-xs md:text-sm leading-relaxed" style={{ color: "var(--foreground)" }}>
                    {message.content}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <form
              className="mt-3 md:mt-4 flex items-end gap-2 rounded-xl border border-white/10 bg-white/5 p-2 md:p-3 flex-shrink-0"
              onSubmit={(event) => {
                event.preventDefault();
                sendMessage();
              }}
            >
              <div className="flex-1 flex items-end gap-2">
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  rows={2}
                  placeholder="Ask the assistant anything…"
                  className="flex-1 resize-none rounded-lg bg-transparent px-3 md:px-4 py-2.5 md:py-2 text-sm md:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50 min-h-[52px] md:min-h-[44px] max-h-[120px] overflow-y-auto"
                  style={{ color: "var(--foreground)" }}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isStreaming}
                  className="flex items-center justify-center rounded-lg bg-teal-500 hover:bg-teal-600 active:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 p-3 md:p-2.5 min-w-[52px] md:min-w-[auto] min-h-[52px] md:min-h-[44px] flex-shrink-0 shadow-lg shadow-teal-500/20 hover:shadow-teal-500/30"
                  aria-label="Send message"
                >
                  {isStreaming ? (
                    <Loader2 size={18} className="md:w-4 md:h-4 animate-spin text-white" />
                  ) : (
                    <Send size={18} className="md:w-4 md:h-4 text-white" />
                  )}
                  <span className="hidden md:inline md:ml-1.5 text-sm font-medium text-white">Send</span>
                </button>
              </div>
            </form>
          </section>

          <aside className="space-y-3 md:space-y-4 rounded-2xl border border-white/10 bg-white/5 p-3 md:p-4">
            <div>
              <h2 className="text-xs md:text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                Starter prompts
              </h2>
              <p className="mt-1 text-[10px] md:text-xs leading-relaxed" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>
                {isSalesUser
                  ? "Tap to auto-fill the composer. The assistant uses your sales leads, close rates, and revenue data."
                  : "Tap to auto-fill the composer. The assistant blends operational data, payments, reviews, and automations."}
              </p>
              <div className="mt-2 md:mt-3 grid gap-2">
                {starterPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    className="rounded-lg border border-white/10 bg-black/10 px-3 py-2.5 md:py-2 text-left text-xs md:text-sm transition hover:border-teal-400/60 hover:bg-teal-500/10 min-h-[44px] md:min-h-0"
                    onClick={() => {
                      setInput(prompt);
                      // Track which starter prompts are used most
                      recordLearningEvent({
                        type: "assistant_query",
                        metadata: {
                          query: prompt,
                          category: extractQueryCategory(prompt),
                          action: "starter_prompt_selected",
                        },
                      });
                    }}
                    style={{ color: "var(--foreground)" }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/10 p-2.5 md:p-3 text-[10px] md:text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
              <div className="mb-1.5 md:mb-2 text-xs md:text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                What can it do?
              </div>
              <ul className="space-y-1 leading-relaxed">
                {isSalesUser ? (
                  <>
                    <li>• Track your close rates and revenue</li>
                    <li>• Get insights on which trades perform best</li>
                    <li>• Draft follow-up messages for leads</li>
                    <li>• Analyze your sales pipeline</li>
                  </>
                ) : (
                  <>
                    <li>• Summarise automation/ticket queues</li>
                    <li>• Draft reviews + outreach scripts</li>
                    <li>• Recommend token allocation changes</li>
                    <li>• Flag payment or follow-up issues</li>
                  </>
                )}
              </ul>
            </div>
          </aside>
        </div>
      </div>
      </AppShell>
    </ProtectedRoute>
  );
}


