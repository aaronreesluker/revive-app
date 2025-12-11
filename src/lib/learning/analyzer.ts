/**
 * Analyzes learning events to extract patterns and insights.
 * This is the "brain" that learns from user behavior.
 */

import type { LearningEvent, LearnedPattern, LearningState } from "./types";

/**
 * Analyzes events to extract patterns and update the learning state.
 */
export function analyzeAndLearn(state: LearningState): LearningState {
  const now = Date.now();
  const patterns = new Map<string, LearnedPattern>();

  // Analyze events to build patterns
  for (const event of state.events) {
    const patternKey = extractPatternKey(event);
    if (!patternKey) continue;

    const existing = patterns.get(patternKey) || {
      id: patternKey,
      pattern: patternKey,
      count: 0,
      successRate: 0,
      averageValue: 0,
      lastSeen: event.timestamp,
      firstSeen: event.timestamp,
      metadata: {},
    };

    existing.count += 1;
    existing.lastSeen = Math.max(existing.lastSeen, event.timestamp);
    existing.firstSeen = Math.min(existing.firstSeen, event.timestamp);

    // Update success rate based on outcomes
    if (event.metadata.outcome) {
      const successWeight = event.metadata.outcome === "success" ? 1 : event.metadata.outcome === "partial" ? 0.5 : 0;
      existing.successRate = (existing.successRate * (existing.count - 1) + successWeight) / existing.count;
    }

    // Update average value
    if (typeof event.metadata.value === "number") {
      existing.averageValue = (existing.averageValue * (existing.count - 1) + event.metadata.value) / existing.count;
    }

    // Extract category from metadata
    if (event.metadata.category && !existing.metadata.category && typeof event.metadata.category === "string") {
      existing.metadata.category = event.metadata.category;
    }

    patterns.set(patternKey, existing);
  }

  // Update preferences based on activity
  const preferences = updatePreferences(state.events, state.preferences);

  return {
    ...state,
    patterns: Array.from(patterns.values()).sort((a, b) => b.count - a.count),
    preferences,
  };
}

/**
 * Extracts a pattern key from an event for grouping similar events.
 */
function extractPatternKey(event: LearningEvent): string | null {
  const parts: string[] = [event.type];

  if (event.metadata.recommendationId && typeof event.metadata.recommendationId === "string") {
    parts.push("rec", event.metadata.recommendationId.split("-")[0]); // Use prefix of recommendation ID
  }

  if (event.metadata.workflowId && typeof event.metadata.workflowId === "string") {
    parts.push("workflow", event.metadata.workflowId);
  }

  if (event.metadata.category && typeof event.metadata.category === "string") {
    parts.push(event.metadata.category);
  }

  if (event.metadata.action && typeof event.metadata.action === "string") {
    parts.push(event.metadata.action);
  }

  return parts.length > 1 ? parts.join("_") : null;
}

/**
 * Updates user preferences based on event activity.
 */
function updatePreferences(
  events: LearningEvent[],
  currentPreferences: LearningState["preferences"]
): LearningState["preferences"] {
  const categoryCounts = new Map<string, number>();
  const actionCounts = new Map<string, number>();
  const timeOfDayCounts = new Map<string, number>();
  const dayOfWeekCounts = new Map<string, number>();

  // Analyze recent events (last 30 days)
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const recentEvents = events.filter((e) => e.timestamp >= thirtyDaysAgo);

  for (const event of recentEvents) {
    // Count categories
    if (event.metadata.category && typeof event.metadata.category === "string") {
      categoryCounts.set(event.metadata.category, (categoryCounts.get(event.metadata.category) || 0) + 1);
    }

    // Count actions
    if (event.metadata.action && typeof event.metadata.action === "string") {
      actionCounts.set(event.metadata.action, (actionCounts.get(event.metadata.action) || 0) + 1);
    }

    // Count time of day activity
    const date = new Date(event.timestamp);
    const hour = date.getHours().toString();
    timeOfDayCounts.set(hour, (timeOfDayCounts.get(hour) || 0) + 1);

    // Count day of week activity
    const day = date.getDay().toString();
    dayOfWeekCounts.set(day, (dayOfWeekCounts.get(day) || 0) + 1);
  }

  // Get top categories and actions
  const preferredCategories = Array.from(categoryCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cat]) => cat);

  const preferredActions = Array.from(actionCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([action]) => action);

  return {
    preferredCategories,
    preferredActions,
    timeOfDayActivity: Object.fromEntries(timeOfDayCounts),
    dayOfWeekActivity: Object.fromEntries(dayOfWeekCounts),
  };
}

/**
 * Gets a relevance score for a recommendation based on learned patterns.
 * Higher score = more likely to be relevant to this user.
 */
export function getRecommendationRelevance(
  recommendationId: string,
  category: string,
  patterns: LearnedPattern[]
): number {
  let score = 0.5; // Base score

  // Check if user has engaged with similar recommendations
  const relevantPatterns = patterns.filter(
    (p) =>
      p.pattern.includes("rec") &&
      (p.pattern.includes(recommendationId.split("-")[0]) || p.metadata.category === category)
  );

  if (relevantPatterns.length > 0) {
    const avgSuccessRate = relevantPatterns.reduce((sum, p) => sum + p.successRate, 0) / relevantPatterns.length;
    const totalCount = relevantPatterns.reduce((sum, p) => sum + p.count, 0);
    // Boost score based on past engagement and success
    score = 0.5 + avgSuccessRate * 0.3 + Math.min(totalCount / 10, 0.2);
  }

  return Math.min(1, Math.max(0, score));
}

