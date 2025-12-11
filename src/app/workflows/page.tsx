"use client";

import { AppShell } from "../../components/AppShell";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import { WorkflowsPage } from "../../components/pages/WorkflowsPage";

export default function Workflows() {
  return (
    <ProtectedRoute>
      <AppShell>
        <WorkflowsPage />
      </AppShell>
    </ProtectedRoute>
  );
}

