"use client";

import { useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { notificationFeed } from "@/lib/notifications";
import { cn } from "@/lib/utils";
import { Button } from "@/components/Button";
import { Bell, CreditCard, Gauge, Workflow } from "lucide-react";

export default function NotificationsPage() {
  return (
    <AppShell>
      <NotificationsContent />
    </AppShell>
  );
}

function NotificationsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedId = searchParams.get("notification") ?? notificationFeed[0]?.id ?? null;

  const selectedNotification = useMemo(
    () => notificationFeed.find((notification) => notification.id === selectedId) ?? notificationFeed[0] ?? null,
    [selectedId]
  );

  const unreadCount = useMemo(() => notificationFeed.filter((item) => !item.read).length, []);
  const paymentsCount = useMemo(() => notificationFeed.filter((item) => item.category === "payments").length, []);
  const tokensCount = useMemo(() => notificationFeed.filter((item) => item.category === "tokens").length, []);
  const workflowCount = useMemo(() => notificationFeed.filter((item) => item.category === "workflows").length, []);

  const renderCategoryIcon = useCallback((category?: string) => {
    const baseClass =
      "flex h-9 w-9 items-center justify-center rounded-full bg-[color-mix(in oklab,var(--brand),transparent 85%)] text-[color-mix(in oklab,var(--brand),black 20%)]";
    switch (category) {
      case "payments":
        return (
          <span className={baseClass}>
            <CreditCard size={16} />
          </span>
        );
      case "tokens":
        return (
          <span className={baseClass}>
            <Gauge size={16} />
          </span>
        );
      case "workflows":
        return (
          <span className={baseClass}>
            <Workflow size={16} />
          </span>
        );
      default:
        return (
          <span className={baseClass}>
            <Bell size={16} />
          </span>
        );
    }
  }, []);

  const handleSelect = (id: string) => {
    router.push(`/notifications?notification=${id}`);
  };

  if (!notificationFeed.length) {
    return (
      <div className="flex h-full items-center justify-center text-sm" style={{ color: "color-mix(in oklab, var(--foreground), transparent 40%)" }}>
        No notifications yet. They will appear here when your workspace starts generating activity.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-6">
      <header className="space-y-2">
        <div className="micro-title">Notification Center</div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold" style={{ color: "var(--foreground)" }}>
            Stay Ahead Of Every Signal
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.2em]" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
            <span>{notificationFeed.length} alerts</span>
            <span>•</span>
            <span>Real-time sync</span>
          </div>
        </div>
        <p className="text-sm" style={{ color: "color-mix(in oklab, var(--foreground), transparent 35%)" }}>
          Track payouts, automation alerts, and capacity updates from one place. Select an alert to see the full play-by-play.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-4">
        <div className="card-glass flex items-center gap-3 rounded-xl px-4 py-3">
          {renderCategoryIcon("general")}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>
              Unread Alerts
            </div>
            <div className="mt-2 text-2xl font-semibold" style={{ color: "var(--foreground)" }}>
              {unreadCount}
            </div>
            <div className="mt-1 text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 35%)" }}>
              Stay current by reviewing new updates daily.
            </div>
          </div>
        </div>
        <div className="card-glass flex items-center gap-3 rounded-xl px-4 py-3">
          {renderCategoryIcon("payments")}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>
              Payments Alerts
            </div>
            <div className="mt-2 text-2xl font-semibold" style={{ color: "var(--foreground)" }}>
              {paymentsCount}
            </div>
            <div className="mt-1 text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 35%)" }}>
              Payouts, invoices, and collections in the last 24 hrs.
            </div>
          </div>
        </div>
        <div className="card-glass flex items-center gap-3 rounded-xl px-4 py-3">
          {renderCategoryIcon("tokens")}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>
              Capacity Alerts
            </div>
            <div className="mt-2 text-2xl font-semibold" style={{ color: "var(--foreground)" }}>
              {tokensCount}
            </div>
            <div className="mt-1 text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 35%)" }}>
              Token usage warnings needing action.
            </div>
          </div>
        </div>
        <div className="card-glass flex items-center gap-3 rounded-xl px-4 py-3">
          {renderCategoryIcon("workflows")}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>
              Workflow Alerts
            </div>
            <div className="mt-2 text-2xl font-semibold" style={{ color: "var(--foreground)" }}>
              {workflowCount}
            </div>
            <div className="mt-1 text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 35%)" }}>
              Bespoke automation updates awaiting review.
            </div>
          </div>
        </div>
      </div>

      <div className="grid flex-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="card-glass sticky top-0 flex h-fit flex-col gap-3 rounded-xl p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.28em]" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
            Activity Feed
          </div>
          <div className="flex flex-col gap-2">
            {notificationFeed.map((notification) => {
              const isActive = selectedNotification?.id === notification.id;
              return (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => handleSelect(notification.id)}
                  className={cn(
                    "group flex flex-col rounded-xl border px-3 py-2 text-left transition-all app-ring",
                    isActive
                      ? "border-[color-mix(in oklab,var(--brand),transparent 10%)] bg-[color-mix(in oklab,var(--panel),var(--brand) 14%)] text-[color-mix(in oklab,var(--foreground),transparent 8%)] shadow-[0_16px_40px_rgba(0,0,0,0.18)]"
                      : "border-transparent bg-[color-mix(in oklab,var(--panel),white 68%)] hover:border-[color-mix(in oklab,var(--ring),transparent 30%)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.12)]"
                  )}
                >
                  <div className="flex items-center justify_between gap-2">
                    <div className="flex items-center gap-2">
                      {renderCategoryIcon(notification.category)}
                      <span className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
                        {(notification.category ?? "general").toUpperCase()}
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking_[0.18em]" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
                      {notification.timestamp}
                    </span>
                  </div>
                  <div className="mt-2 text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                    {notification.title}
                  </div>
                  <div className="mt-1 text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 35%)" }}>
                    {notification.message}
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="flex flex-col gap-4">
          <div className="card-glass flex flex-col gap-4 rounded-xl p-6">
            {selectedNotification ? (
              <>
                <div className="text-[11px] font-semibold uppercase tracking_[0.28em]" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
                  {selectedNotification.category ?? "General"}
                </div>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-semibold leading-tight" style={{ color: "var(--foreground)" }}>
                      {selectedNotification.title}
                    </h2>
                    <div className="mt-1 text-xs uppercase tracking_[0.24em]" style={{ color: "color-mix(in oklab, var(--foreground), transparent 55%)" }}>
                      {selectedNotification.timestamp}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs uppercase tracking_[0.18em]" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
                    <span>Status</span>
                    <span className="rounded-full bg-[color-mix(in oklab,var(--brand),transparent 86%)] px-2 py-0.5 font-semibold text-[color-mix(in oklab,var(--brand),black 20%)]">
                      Recorded
                    </span>
                  </div>
                </div>

                <div className="space-y-3 text-sm leading-relaxed" style={{ color: "color-mix(in oklab, var(--foreground), transparent 12%)" }}>
                  {selectedNotification.details.split("\n").map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>

                {selectedNotification.actionRoute && (
                  <div className="pt-2">
                    <Button variant="primary" onClick={() => router.push(selectedNotification.actionRoute!)} className="px-4 py-2 text-sm">
                      {selectedNotification.actionLabel ?? "Go to related area"}
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center text-sm" style={{ color: "color-mix(in oklab, var(--foreground), transparent 40%)" }}>
                Select a notification to view details.
              </div>
            )}
          </div>

          <div className="card-glass grid gap-3 rounded-xl p-4 lg:grid-cols-3">
            {notificationFeed.slice(0, 3).map((notification) => (
              <div
                key={`summary-${notification.id}`}
                className="rounded-lg border border-[color-mix(in oklab,var(--ring),transparent 60%)] bg-[color-mix(in oklab,var(--panel),white 72%)] p-3 text-sm"
                style={{ color: "color-mix(in oklab, var(--foreground), transparent 25%)" }}
              >
                <div className="flex items-center gap-2">
                  {renderCategoryIcon(notification.category)}
                  <div className="text-[10px] font-semibold uppercase tracking_[0.2em]" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
                    {notification.category ?? "General"}
                  </div>
                </div>
                <div className="mt-2 text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                  {notification.title}
                </div>
                <div className="mt-2 text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 40%)" }}>
                  {notification.message}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
