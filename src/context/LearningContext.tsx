"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ContextErrorBoundary } from "@/components/ContextBoundary";
import type { LearningEvent, LearningState } from "@/lib/learning/types";
import { loadLearningState, saveLearningState } from "@/lib/learning/storage";
import { analyzeAndLearn, getRecommendationRelevance } from "@/lib/learning/analyzer";

type LearningContextValue = {
  state: LearningState;
  recordEvent: (event: Omit<LearningEvent, "id" | "timestamp">) => void;
  getRelevanceScore: (recommendationId: string, category: string) => number;
  clearLearningData: () => void;
};

const LearningContext = createContext<LearningContextValue | undefined>(undefined);

export function LearningProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<LearningState>(() => loadLearningState());
  const analysisTimerRef = useRef<number | null>(null);

  // Periodically analyze and learn from events
  useEffect(() => {
    const analyze = () => {
      setState((current) => {
        const analyzed = analyzeAndLearn(current);
        saveLearningState(analyzed);
        return analyzed;
      });
    };

    // Analyze immediately on mount
    analyze();

    // Then analyze every 5 minutes
    analysisTimerRef.current = window.setInterval(analyze, 5 * 60 * 1000);

    return () => {
      if (analysisTimerRef.current) {
        window.clearInterval(analysisTimerRef.current);
      }
    };
  }, []);

  // Save state whenever it changes
  useEffect(() => {
    saveLearningState(state);
  }, [state]);

  const recordEvent = useCallback((event: Omit<LearningEvent, "id" | "timestamp">) => {
    const fullEvent: LearningEvent = {
      ...event,
      id: `learn-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: Date.now(),
    };

    setState((current) => {
      const updated = {
        ...current,
        events: [fullEvent, ...current.events].slice(0, 1000),
      };

      // Trigger immediate analysis for important events
      if (["workflow_succeeded", "workflow_failed", "payment_collected"].includes(event.type)) {
        return analyzeAndLearn(updated);
      }

      return updated;
    });
  }, []);

  const getRelevanceScore = useCallback(
    (recommendationId: string, category: string) => {
      return getRecommendationRelevance(recommendationId, category, state.patterns);
    },
    [state.patterns]
  );

  const clearLearningData = useCallback(() => {
    const emptyState: LearningState = {
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
    setState(emptyState);
    saveLearningState(emptyState);
  }, []);

  const value = useMemo<LearningContextValue>(
    () => ({
      state,
      recordEvent,
      getRelevanceScore,
      clearLearningData,
    }),
    [state, recordEvent, getRelevanceScore, clearLearningData]
  );

  return (
    <ContextErrorBoundary name="LearningContext" onReset={clearLearningData}>
      <LearningContext.Provider value={value}>{children}</LearningContext.Provider>
    </ContextErrorBoundary>
  );
}

export function useLearning() {
  const ctx = useContext(LearningContext);
  if (!ctx) {
    throw new Error("useLearning must be used within a LearningProvider");
  }
  return ctx;
}

