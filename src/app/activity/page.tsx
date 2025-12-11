"use client";

import { AppShell } from "@/components/AppShell";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { recentActivity } from "@/data/dashboard";
import { useRouter } from "next/navigation";

export default function ActivityPage() {
  const router = useRouter();

  return (
    <ProtectedRoute>
      <AppShell>
      <div className="flex h-full flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-purple-500/10">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold" style={{ color: "var(--foreground)" }}>
            Activity Log
          </h1>
          <p className="text-sm" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>
            A consolidated feed of receptionist triggers, payments, automations, and review touchpoints.
          </p>
        </header>

        <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/10 p-4">
          {recentActivity.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-3 rounded-lg border border-white/5 bg-white/5 p-3 transition hover:border-white/20"
            >
              <div className="mt-0.5 flex-shrink-0 text-teal-300">{item.icon}</div>
              <div className="flex-1">
                <div className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                  {item.message}
                </div>
                <div className="mt-1 text-xs uppercase tracking-[0.3em]" style={{ color: "color-mix(in oklab, var(--foreground), transparent 55%)" }}>
                  {item.type}
                </div>
              </div>
              <div className="text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
                {item.time}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-auto flex justify-end">
          <button
            type="button"
            onClick={() => router.push("/assistant")}
            className="rounded-md bg-zinc-900/60 px-3 py-1.5 text-xs ring-1 app-ring hover:opacity-90"
          >
            Ask the assistant about this feed
          </button>
        </div>
      </div>
      </AppShell>
    </ProtectedRoute>
  );
}



