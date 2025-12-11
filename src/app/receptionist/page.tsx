"use client";

import { AppShell } from "../../components/AppShell";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import { ReceptionistPage } from "../../components/pages/ReceptionistPage";

export default function Receptionist() {
  return (
    <ProtectedRoute>
      <AppShell>
        <ReceptionistPage />
      </AppShell>
    </ProtectedRoute>
  );
}
