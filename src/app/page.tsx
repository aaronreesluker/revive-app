"use client";

import dynamic from "next/dynamic";
import { AppShell } from "../components/AppShell";
import { LoadingSpinner } from "../components/LoadingSpinner";

const OverviewPage = dynamic(() => import("../components/pages/OverviewPage").then((mod) => ({ default: mod.OverviewPage })), {
  loading: () => (
    <div className="flex items-center justify-center min-h-[400px]">
      <LoadingSpinner size="lg" text="Loading dashboard..." />
    </div>
  ),
  ssr: false,
});

export default function Home() {
  return (
    <AppShell>
      <OverviewPage />
    </AppShell>
  );
}

