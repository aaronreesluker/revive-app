"use client";

import dynamic from "next/dynamic";
import { AppShell } from "../../components/AppShell";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import { ErrorBoundary } from "../../components/ErrorBoundary";
import { LoadingSpinner } from "../../components/LoadingSpinner";

const PaymentsPage = dynamic(() => import("../../components/pages/PaymentsPage").then((mod) => ({ default: mod.PaymentsPage })), {
  loading: () => (
    <div className="flex items-center justify-center min-h-[400px]">
      <LoadingSpinner size="lg" text="Loading payments..." />
    </div>
  ),
  ssr: false,
});

export default function Payments() {
  return (
    <ProtectedRoute>
      <AppShell>
        <ErrorBoundary>
          <PaymentsPage />
        </ErrorBoundary>
      </AppShell>
    </ProtectedRoute>
  );
}

