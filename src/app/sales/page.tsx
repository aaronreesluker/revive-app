"use client";

import dynamic from "next/dynamic";
import { AppShell } from "@/components/AppShell";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LoadingSpinner } from "@/components/LoadingSpinner";

const SalesPage = dynamic(() => import("@/components/pages/SalesPage").then((mod) => ({ default: mod.SalesPage })), {
  loading: () => (
    <div className="flex items-center justify-center min-h-[400px]">
      <LoadingSpinner size="lg" text="Loading sales analytics..." />
    </div>
  ),
  ssr: false,
});

export default function SalesAnalyticsPage() {
  return (
    <AppShell>
      <ProtectedRoute>
        <ErrorBoundary>
          <SalesPage />
        </ErrorBoundary>
      </ProtectedRoute>
    </AppShell>
  );
}

