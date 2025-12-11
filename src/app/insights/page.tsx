"use client";

import { AppShell } from "../../components/AppShell";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import { InsightsPage } from "../../components/pages/InsightsPage";

export default function Insights() {
  return (
    <ProtectedRoute>
      <AppShell>
        <InsightsPage />
      </AppShell>
    </ProtectedRoute>
  );
}

