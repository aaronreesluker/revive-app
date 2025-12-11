/**
 * Types for the continuous learning system.
 * The system learns from user behavior to improve recommendations and workflows.
 */

export type LearningEventType =
  | "recommendation_clicked"
  | "recommendation_dismissed"
  | "workflow_activated"
  | "workflow_succeeded"
  | "workflow_failed"
  | "contact_action_taken"
  | "payment_collected"
  | "automation_triggered"
  | "assistant_query"
  | "feature_used";

export type LearningEvent = {
  id: string;
  type: LearningEventType;
  timestamp: number;
  metadata: {
    recommendationId?: string;
    workflowId?: string;
    contactId?: string;
    action?: string;
    outcome?: "success" | "failure" | "partial";
    value?: number; // e.g., payment amount, time saved
    [key: string]: unknown;
  };
};

export type LearnedPattern = {
  id: string;
  pattern: string; // e.g., "recommendation_finance_clicked", "workflow_no_show_success"
  count: number;
  successRate: number; // 0-1, based on outcomes
  averageValue: number; // Average value/impact when this pattern occurs
  lastSeen: number;
  firstSeen: number;
  metadata: {
    category?: string;
    tags?: string[];
    [key: string]: unknown;
  };
};

export type LearningState = {
  events: LearningEvent[];
  patterns: LearnedPattern[];
  preferences: {
    preferredCategories: string[]; // Categories user engages with most
    preferredActions: string[]; // Actions user takes most often
    timeOfDayActivity: Record<string, number>; // Hour -> activity count
    dayOfWeekActivity: Record<string, number>; // Day -> activity count
  };
  lastUpdated: number;
};

