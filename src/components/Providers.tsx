"use client";

import { TierProvider } from "../context/TierContext";
import { TokenProvider } from "../context/TokenContext";
import { OperationsProvider } from "../context/OperationsContext";
import { LearningProvider } from "../context/LearningContext";
import { ToastProvider } from "../context/ToastContext";
import { ContextErrorBoundary } from "./ContextBoundary";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ContextErrorBoundary name="Providers" fallbackMessage="Failed to initialize app providers">
      <TierProvider>
        <TokenProvider>
          <OperationsProvider>
            <LearningProvider>
              <ToastProvider>
                {children}
              </ToastProvider>
            </LearningProvider>
          </OperationsProvider>
        </TokenProvider>
      </TierProvider>
    </ContextErrorBoundary>
  );
}

