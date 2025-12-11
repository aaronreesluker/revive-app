/**
 * Storage utilities for the learning system.
 * Persists learning data to localStorage for continuous improvement.
 */

import type { LearningState } from "./types";

const STORAGE_KEY = "revive-learning-state";
const MAX_EVENTS = 1000; // Keep last 1000 events for pattern analysis
const MAX_PATTERNS = 200; // Keep top 200 patterns

export function loadLearningState(): LearningState {
  if (typeof window === "undefined") {
    return createEmptyState();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createEmptyState();

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return createEmptyState();

    // Normalize and validate
    return {
      events: Array.isArray(parsed.events) ? parsed.events.slice(0, MAX_EVENTS) : [],
      patterns: Array.isArray(parsed.patterns) ? parsed.patterns.slice(0, MAX_PATTERNS) : [],
      preferences: parsed.preferences || createEmptyState().preferences,
      lastUpdated: typeof parsed.lastUpdated === "number" ? parsed.lastUpdated : Date.now(),
    };
  } catch {
    return createEmptyState();
  }
}

export function saveLearningState(state: LearningState): boolean {
  if (typeof window === "undefined") return false;

  try {
    // Trim events and patterns to max sizes
    const trimmed: LearningState = {
      ...state,
      events: state.events.slice(0, MAX_EVENTS),
      patterns: state.patterns.slice(0, MAX_PATTERNS),
      lastUpdated: Date.now(),
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    return true;
  } catch {
    return false;
  }
}

function createEmptyState(): LearningState {
  return {
    events: [],
    patterns: [],
    preferences: {
      preferredCategories: [],
      preferredActions: [],
      timeOfDayActivity: {},
      dayOfWeekActivity: {},
    },
    lastUpdated: Date.now(),
  };
}

