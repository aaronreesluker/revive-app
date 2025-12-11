"use client";

import { AppShell } from "../../components/AppShell";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import { SettingsPage } from "../../components/pages/SettingsPage";

export default function Settings() {
  return (
    <ProtectedRoute>
      <AppShell>
        <SettingsPage />
      </AppShell>
    </ProtectedRoute>
  );
}

