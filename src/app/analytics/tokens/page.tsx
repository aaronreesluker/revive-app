"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import {
  ArrowLeft,
  Coins,
  Gauge,
  Users2,
  PieChart,
  Download,
  BarChart3,
  Clock3,
  Sun,
  Moon,
  Layers,
  PlusCircle,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { useRouter } from "next/navigation";
import { useTokens } from "@/context/TokenContext";
import { useTier } from "@/context/TierContext";
import { tierMeta } from "@/lib/tiers";
import { AppShell } from "@/components/AppShell";
import { useEventLog } from "@/context/EventLogContext";
import { Select } from "@/components/Select";

const distributionTemplate = [
  { team: "AI Receptionist", weight: 32, trend: "+8%", profitPerToken: 0.64 },
  { team: "Workflow Automations", weight: 24, trend: "+3%", profitPerToken: 0.58 },
  { team: "AI Insights", weight: 18, trend: "-2%", profitPerToken: 0.42 },
  { team: "Review Booster", weight: 14, trend: "+12%", profitPerToken: 0.36 },
];

const usageTemplate7d = [
  { label: "Mon", value: 420 },
  { label: "Tue", value: 610 },
  { label: "Wed", value: 770 },
  { label: "Thu", value: 580 },
  { label: "Fri", value: 830 },
  { label: "Sat", value: 340 },
  { label: "Sun", value: 260 },
];

const usageTemplate30d = Array.from({ length: 30 }).map((_, index) => {
  const day = index + 1;
  const base = 360 + Math.round(130 * Math.sin((index / 30) * Math.PI * 2));
  const weekendAdjustment = index % 7 === 4 ? 240 : index % 7 === 5 ? -90 : 0;
  return { label: `Day ${day}`, value: Math.max(base + weekendAdjustment, 120) };
});

type TimeframeOption = "7d" | "30d";

function TokenAnalyticsContent() {
  const [showDigestModal, setShowDigestModal] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<string | null>(null);
  const [pieAnimated, setPieAnimated] = useState(false);
  const [barsAnimated, setBarsAnimated] = useState(false);
  const [timeframe, setTimeframe] = useState<TimeframeOption>("7d");
  const { tier } = useTier();
  const {
    usedTokens,
    totalTokens,
    remainingTokens,
    totalAddOnTokens,
    baseAllowance,
    availableAddons,
    purchaseAddon,
    rolloverTokens,
    killswitchEnabled,
    killswitchTriggered,
  } = useTokens();
  const { events } = useEventLog();

  useEffect(() => {
    const applied = document.documentElement.getAttribute("data-theme");
    setCurrentTheme(applied);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "attributes" && mutation.attributeName === "data-theme") {
          setCurrentTheme(document.documentElement.getAttribute("data-theme"));
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setPieAnimated(true));
    const timer = window.setTimeout(() => setBarsAnimated(true), 120);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, []);

  const toggleThemeMode = () => {
    const next = currentTheme === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("revive-theme", next);
    setCurrentTheme(next);
  };

  const router = useRouter();
  const scaledDistribution = useMemo(() => {
    const totalWeight = distributionTemplate.reduce((acc, item) => acc + item.weight, 0);
    if (totalWeight === 0 || usedTokens === 0) {
      return distributionTemplate.map((item) => ({
        ...item,
        tokens: 0,
        profit: 0,
        profitPerToken: item.profitPerToken,
      }));
    }
    let assigned = 0;
    const provisional = distributionTemplate.map((item, index) => {
      if (index === distributionTemplate.length - 1) {
        const remaining = Math.max(usedTokens - assigned, 0);
        return { ...item, tokens: remaining };
      }
      const raw = (usedTokens * item.weight) / totalWeight;
      const rounded = Math.round(raw);
      assigned += rounded;
      return { ...item, tokens: rounded };
    });
    const totalAssigned = provisional.reduce((acc, item) => acc + item.tokens, 0);
    if (totalAssigned !== usedTokens) {
      const delta = totalAssigned - usedTokens;
      const lastIndex = provisional.length - 1;
      provisional[lastIndex] = {
        ...provisional[lastIndex],
        tokens: Math.max(provisional[lastIndex].tokens - delta, 0),
      };
    }
    return provisional.map((item) => {
      const profit = item.tokens * item.profitPerToken;
      return {
        ...item,
        profit,
      };
    });
  }, [usedTokens]);

  const defaultAddon = availableAddons[1] ?? availableAddons[0] ?? null;

  const timelineChartData = useMemo(() => {
    const template = timeframe === "30d" ? usageTemplate30d : usageTemplate7d;
    const templateTotal = template.reduce((sum, item) => sum + item.value, 0) || 1;
    const scale = usedTokens ? Math.max(usedTokens, templateTotal) / templateTotal : 1;
    return template.map((item) => ({
      day: item.label,
      tokens: Math.max(0, Math.round(item.value * scale)),
    }));
  }, [timeframe, usedTokens]);

  const totalProfit = useMemo(
    () => scaledDistribution.reduce((sum, entry) => sum + (entry.profit ?? 0), 0),
    [scaledDistribution]
  );

  const overallProfitPerToken = useMemo(() => {
    if (!usedTokens) return 0;
    return totalProfit / usedTokens;
  }, [totalProfit, usedTokens]);

  const mostEfficientAutomation = useMemo(() => {
    if (!scaledDistribution.length) return null;
    return scaledDistribution.reduce((best, entry) => {
      if (!best) return entry;
      return entry.profitPerToken > best.profitPerToken ? entry : best;
    }, scaledDistribution[0]);
  }, [scaledDistribution]);

  const formattedProfitPerToken = useMemo(() => {
    if (!usedTokens || !Number.isFinite(overallProfitPerToken)) {
      return "£0.00";
    }
    return `£${overallProfitPerToken.toFixed(2)}`;
  }, [overallProfitPerToken, usedTokens]);

  const formattedTotalProfit = useMemo(() => {
    if (!totalProfit) return "£0";
    return `£${Math.round(totalProfit).toLocaleString()}`;
  }, [totalProfit]);

  const handleAddOnPurchase = () => {
    if (!defaultAddon) return;
    purchaseAddon(defaultAddon.id);
    alert(`${defaultAddon.name} added. Tokens are live in your workspace.`);
  };

  const handleDownloadUsageReport = () => {
    alert("Usage report downloads are coming soon. For now, copy data directly from this dashboard.");
  };

  const timelineHighlights = useMemo(() => {
    if (!timelineChartData.length) {
      return [];
    }
    const sorted = [...timelineChartData].sort((a, b) => b.tokens - a.tokens);
    const busiest = sorted[0];
    const quietest = sorted[sorted.length - 1];
    const average = Math.round(
      timelineChartData.reduce((sum, entry) => sum + entry.tokens, 0) / timelineChartData.length
    );
    return [
      {
        title: "Busiest",
        value: busiest?.day ?? "—",
        change:
          busiest && average
            ? `+${Math.max(0, Math.round(((busiest.tokens - average) / Math.max(average, 1)) * 100))}% vs avg`
            : "",
      },
      {
        title: "Quietest",
        value: quietest?.day ?? "—",
        change:
          quietest && average
            ? `${Math.round(((quietest.tokens - average) / Math.max(average, 1)) * 100)}% vs avg`
            : "",
      },
      {
        title: "Daily Avg",
        value: `${average.toLocaleString()} tokens`,
        change: timeframe === "30d" ? "Rolling 30-day" : "Rolling 7-day",
      },
    ];
  }, [timelineChartData, timeframe]);

  const tokenEvents = useMemo(
    () => events.filter((entry) => entry.category === "tokens").slice(0, 6),
    [events]
  );

  return (
    <div className="space-y-8 px-4 pb-8 pt-6 md:px-8 overflow-x-hidden">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/settings"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 transition hover:bg-white/10"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: "var(--foreground)" }}>
              Token Analytics
            </h1>
            <p className="text-sm" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
              Lightweight overview of usage and distribution across automations.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={toggleThemeMode}
            className="rounded-md px-2 py-1 ring-1 app-ring hover:opacity-90 transition-opacity"
            title="Toggle theme"
            aria-label="Toggle theme"
          >
            <span className="inline-flex items-center gap-1">
              <Sun size={14} />
              <Moon size={14} />
            </span>
          </button>
          <Button variant="secondary" size="sm" onClick={handleDownloadUsageReport}>
            <Download size={16} className="mr-1" />
            Download usage CSV
          </Button>
          {defaultAddon && (
            <Button variant="primary" size="sm" className="inline-flex items-center gap-2" onClick={handleAddOnPurchase}>
              <PlusCircle size={16} />
              Add {Math.round(defaultAddon.tokens / 1000)}k tokens
            </Button>
          )}
          <Button variant="secondary" size="sm" className="inline-flex items-center gap-2" onClick={() => setShowDigestModal(true)}>
            <BarChart3 size={16} />
            Schedule Digest
          </Button>
        </div>
      </div>

      {remainingTokens === 0 && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-sm">
          <div className="flex items-start gap-3">
            <ShieldAlert size={18} className="text-rose-300" />
            <div>
              <div className="font-semibold" style={{ color: "var(--foreground)" }}>
                Token limit reached
              </div>
              <p className="text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
                {killswitchEnabled
                  ? "Kill switch is active, so automations are paused until you add a top-up or the allowance resets."
                  : "Add another pack or upgrade your plan to avoid interruptions. Enable the kill switch to auto-pause next time."}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3 xl:flex-nowrap">
        <SummaryCard
          icon={<Gauge size={18} />}
          label="Tokens Used"
          value={usedTokens.toLocaleString()}
          helper="Current billing cycle"
        />
        <SummaryCard
          icon={<TrendingUp size={18} />}
          label="Profit per Token"
          value={formattedProfitPerToken}
          helper={`Total ${formattedTotalProfit}`}
        />
        <SummaryCard
          icon={<Coins size={18} />}
          label="Plan Allowance"
          value={baseAllowance.toLocaleString()}
          helper={`Current plan: ${tierMeta[tier].label}`}
        />
        <SummaryCard
          icon={<Layers size={18} />}
          label="Add-on Tokens"
          value={totalAddOnTokens.toLocaleString()}
          helper="Top-up credits available"
        />
        <SummaryCard
          icon={<Layers size={18} />}
          label="Carryover"
          value={rolloverTokens.toLocaleString()}
          helper="Unused credits rolled into this month"
        />
        <SummaryCard
          icon={<Users2 size={18} />}
          label="Remaining"
          value={remainingTokens.toLocaleString()}
          helper="You’re projected to reach 90% on 26 Jan"
        />
        <SummaryCard
          icon={<ShieldAlert size={18} />}
          label="Kill Switch"
          value={killswitchEnabled ? (killswitchTriggered ? "Triggered" : "Armed") : "Off"}
          helper={killswitchEnabled ? "Pauses automations at 100%" : "Enable in Settings"}
        />
      </div>

      <div className="card-glass rounded-xl p-6 md:p-8">
        <div className="md:flex md:items-start md:gap-10">
          <div className="space-y-6 md:w-[320px] md:flex-none">
            <div className="flex items-center gap-2">
              <PieChart size={18} className="brand-text" />
              <h2 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>
                Usage by Automation
              </h2>
            </div>
            <div
              className="flex flex-col items-start gap-4 rounded-xl border border-white/5 p-6"
              style={{ background: "color-mix(in oklab, var(--panel), transparent 85%)" }}
            >
              <div className="relative flex h-40 w-40 items-center justify-center">
                <svg viewBox="0 0 36 36" className="h-full w-full">
                  <circle
                    cx="18"
                    cy="18"
                    r="16"
                    fill="none"
                    stroke="color-mix(in oklab, var(--panel), transparent 60%)"
                    strokeWidth="3"
                  />
                  {scaledDistribution.reduce<{ start: number; segments: ReactElement[] }>((acc, item, index) => {
                    const denominator = usedTokens || 1;
                    const portion = item.tokens / denominator;
                    const dashPrimary = 100 * portion;
                    const dashSecondary = 100 - dashPrimary;
                    const dashArray = pieAnimated ? `${dashPrimary} ${dashSecondary}` : `0 100`;
                    const strokeDashoffset = acc.start;
                    const color = ["#00b3b3", "#4ade80", "#38bdf8", "#fbbf24"][index % 4];
                    const delay = `${index * 160}ms`;
                    acc.segments.push(
                      <circle
                        key={item.team}
                        cx="18"
                        cy="18"
                        r="16"
                        fill="none"
                        stroke={color}
                        strokeWidth="3"
                        strokeDasharray={dashArray}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        opacity={pieAnimated ? 1 : 0}
                        style={{
                          transition: `stroke-dasharray 1.6s cubic-bezier(0.16, 0.84, 0.44, 1) ${delay}, opacity 0.6s ease ${delay}`,
                        }}
                      />
                    );
                    acc.start -= 100 * portion;
                    return acc;
                  }, { start: 25, segments: [] }).segments}
                </svg>
                <div className="absolute text-center">
                  <div className="text-xs uppercase tracking-wide" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>
                    Used
                  </div>
                  <div className="text-xl font-semibold" style={{ color: "var(--foreground)" }}>
                    {usedTokens.toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="space-y-2 text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
                {scaledDistribution.map((item, index) => {
                  const color = ["#00b3b3", "#4ade80", "#38bdf8", "#fbbf24"][index % 4];
                  return (
                    <div key={item.team} className="flex items-center gap-2">
                      <span className="inline-block h-2 w-2 flex-none rounded-full" style={{ background: color }} />
                      <span className="flex-1">{item.team}</span>
                      <span className="min-w-[40px] text-right">{usedTokens ? Math.round((item.tokens / usedTokens) * 100) : 0}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="mt-8 flex flex-1 flex-col gap-4 md:mt-0">
            <span className="block text-xs md:text-right" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
              Billing period • Jan 1 – Jan 31
            </span>
            <div className="rounded-xl border border-white/5 p-5" style={{ background: "color-mix(in oklab, var(--panel), transparent 85%)" }}>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-medium" style={{ color: "var(--foreground)" }}>
                  <Clock3 size={16} className="brand-text" /> Daily Timeline
                </div>
                <div className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setTimeframe("7d")}
                    className={`rounded-full px-2 py-1 transition ${timeframe === "7d" ? "bg-white/25 text-white" : "text-white/60"}`}
                  >
                    7 days
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeframe("30d")}
                    className={`rounded-full px-2 py-1 transition ${timeframe === "30d" ? "bg-white/25 text-white" : "text-white/60"}`}
                  >
                    30 days
                  </button>
                </div>
              </div>
              <div className="mb-4 grid gap-3 text-xs sm:grid-cols-3" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
                {timelineHighlights.map((item) => (
                  <div key={item.title} className="rounded-lg border border-white/5 bg-white/5 p-3">
                    <p className="uppercase tracking-wide" style={{ color: "color-mix(in oklab, var(--foreground), transparent 35%)" }}>
                      {item.title}
                    </p>
                    <p className="mt-1 text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                      {item.value}
                    </p>
                    <p className="text-[11px]" style={{ color: "color-mix(in oklab, var(--foreground), transparent 35%)" }}>
                      {item.change}
                    </p>
                  </div>
                ))}
              </div>
              <TimelineBarChart data={timelineChartData} animate={barsAnimated} />
              <p className="mt-3 text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
                {timeframe === "30d"
                  ? "30-day view smooths weekday peaks so finance can forecast top-up windows."
                  : "Weekly peaks typically land on Thursday and Friday—schedule automations accordingly."}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 space-y-2">
          {scaledDistribution.map((item) => {
            const denominator = usedTokens || 1;
            const width = Math.round((item.tokens / denominator) * 100);
            const isMostEfficient =
              Boolean(mostEfficientAutomation) && mostEfficientAutomation?.team === item.team && item.profitPerToken > 0;
            const profitDisplay = `£${item.profit?.toLocaleString(undefined, {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}`;
            const profitPerTokenDisplay = `£${item.profitPerToken.toFixed(2)}`;
            return (
              <div
                key={item.team}
                className={`space-y-2 rounded-lg border p-2.5 transition-shadow ${
                  isMostEfficient ? "border-emerald-400/50" : "border-white/5"
                }`}
                style={{
                  background: isMostEfficient
                    ? "color-mix(in oklab, var(--panel), transparent 65%)"
                    : "color-mix(in oklab, var(--panel), transparent 80%)",
                  boxShadow: isMostEfficient
                    ? "0 18px 38px -24px rgba(16, 185, 129, 0.6)"
                    : undefined,
                }}
              >
                {isMostEfficient && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-200">
                    <TrendingUp size={11} /> Most efficient
                  </span>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span style={{ color: "var(--foreground)" }}>{item.team}</span>
                  <div className="flex items-center gap-2 text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 35%)" }}>
                    <span>{item.tokens.toLocaleString()} tokens</span>
                    <span>({width}%)</span>
                    <span className="text-teal-300">{item.trend}</span>
                  </div>
                </div>
                <div
                  className="relative h-1.5 w-full overflow-hidden rounded-full"
                  style={{ background: "color-mix(in oklab, var(--panel), transparent 70%)" }}
                >
                  <div
                    className="absolute inset-y-0 left-0 rounded-full brand-bg"
                    style={{ width: `${width}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 40%)" }}>
                  <span>Profit</span>
                  <span className="font-medium" style={{ color: "var(--foreground)" }}>
                    {profitDisplay}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
                  <span>£ per token</span>
                  <span className="font-medium" style={{ color: isMostEfficient ? "var(--brand)" : "var(--foreground)" }}>
                    {profitPerTokenDisplay}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="card-glass rounded-xl p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>
            Recent token activity
          </h2>
          <Button variant="ghost" size="sm" onClick={() => router.push("/settings")} className="text-xs">
            Manage tokens
          </Button>
        </div>
        <div className="mt-4 space-y-3 text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 55%)" }}>
          {tokenEvents.length === 0 ? (
            <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-center text-[11px]">
              No token events logged yet. Actions from the settings page will appear here.
            </div>
          ) : (
            tokenEvents.map((event) => (
              <div key={event.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2" style={{ color: "var(--foreground)" }}>
                  <span className="text-sm font-semibold">{event.summary}</span>
                  <span className="text-[10px]" style={{ color: "color-mix(in oklab, var(--foreground), transparent 60%)" }}>
                    {new Date(event.createdAt).toLocaleString("en-GB", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                {event.meta ? (
                  <pre className="mt-2 rounded bg-black/20 p-2 text-[10px]" style={{ color: "color-mix(in oklab, var(--foreground), transparent 60%)" }}>
                    {JSON.stringify(event.meta, null, 2)}
                  </pre>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>

      <Modal open={showDigestModal} onClose={() => setShowDigestModal(false)} title="Schedule Weekly Digest">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            alert("Digest scheduled. We'll send summaries every Monday at 8 AM.");
            setShowDigestModal(false);
          }}
        >
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium" style={{ color: "var(--foreground)" }}>
                Send To
              </label>
              <input
                type="email"
                required
                defaultValue="john@example.com"
                className="w-full rounded-md bg-transparent px-3 py-2 text-sm ring-1 app-ring focus:outline-none focus:ring-2"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium" style={{ color: "var(--foreground)" }}>
                Frequency
              </label>
              <Select
                defaultValue="Weekly (recommended)"
                options={[
                  { value: "Weekly (recommended)", label: "Weekly (recommended)" },
                  { value: "Bi-weekly", label: "Bi-weekly" },
                  { value: "Monthly", label: "Monthly" },
                ]}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium" style={{ color: "var(--foreground)" }}>
              Send On
            </label>
            <Select
              defaultValue="Monday"
              options={[
                { value: "Monday", label: "Monday" },
                { value: "Tuesday", label: "Tuesday" },
                { value: "Wednesday", label: "Wednesday" },
                { value: "Thursday", label: "Thursday" },
                { value: "Friday", label: "Friday" },
              ]}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium" style={{ color: "var(--foreground)" }}>
              Summary Scope
            </label>
            <div className="rounded-lg border border-white/5 p-3 text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
              Includes plan usage, automation breakdown, and peak activity hours. Attach CSV export to email.
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowDigestModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="flex-1">
              Schedule Digest
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  helper,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div
      className="min-w-[160px] flex-1 rounded-lg border border-white/10 p-4 text-sm backdrop-blur"
      style={{
        background: "color-mix(in oklab, var(--panel), black 6%)",
        boxShadow: "0 8px 18px -14px rgba(0,0,0,0.35)",
      }}
    >
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide" style={{ color: "color-mix(in oklab, var(--foreground), transparent 40%)" }}>
        <span className="text-brand">{icon}</span>
        {label}
      </div>
      <div className="mt-1 text-xl font-semibold" style={{ color: "var(--foreground)" }}>
        {value}
      </div>
      <div className="mt-1 text-[11px]" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
        {helper}
      </div>
    </div>
  );
}

function TimelineBarChart({ data, animate }: { data: { day: string; tokens: number }[]; animate: boolean }) {
  const maxTokens = useMemo(() => (data.length ? Math.max(...data.map((item) => item.tokens)) : 0), [data]);
  return (
    <div className="relative h-52 w-full">
      <div className="pointer-events-none absolute inset-x-0 bottom-12 h-px" style={{ background: "color-mix(in oklab, var(--foreground), transparent 90%)" }} />
      <div className="flex h-full items-end justify-between gap-3">
        {data.map((item, index) => {
          const heightPercent = maxTokens ? Math.max((item.tokens / maxTokens) * 100, 6) : 6;
          const transitionDelay = animate ? `${index * 140}ms` : "0ms";
          return (
            <div
              key={item.day}
              className="group flex h-full flex-1 flex-col items-center gap-2"
              style={{ height: "100%" }}
            >
              <div className="flex h-full w-full items-end justify-center">
                <div
                  className="w-9 rounded-md transition-transform duration-200 group-hover:scale-[1.03]"
                  style={{
                    height: `${heightPercent}%`,
                    backgroundColor: "var(--brand)",
                    boxShadow: "0 16px 28px -18px rgba(17, 94, 89, 0.45)",
                    transform: animate ? "scaleY(1)" : "scaleY(0)",
                    transformOrigin: "bottom center",
                    transition: `transform 780ms cubic-bezier(0.19, 1, 0.22, 1) ${transitionDelay}`,
                  }}
                />
              </div>
              <span
                className="text-[11px] font-medium"
                style={{
                  color: "color-mix(in oklab, var(--foreground), transparent 35%)",
                  opacity: animate ? 1 : 0,
                  transform: animate ? "translateY(0)" : "translateY(6px)",
                  transition: "opacity 420ms ease, transform 420ms ease",
                  transitionDelay: animate ? `calc(${transitionDelay} + 180ms)` : "0ms",
                }}
              >
                {item.tokens.toLocaleString()} tokens
              </span>
              <span
                className="text-xs"
                style={{
                  color: "color-mix(in oklab, var(--foreground), transparent 50%)",
                  opacity: animate ? 1 : 0,
                  transform: animate ? "translateY(0)" : "translateY(6px)",
                  transition: "opacity 420ms ease, transform 420ms ease",
                  transitionDelay: animate ? `calc(${transitionDelay} + 240ms)` : "0ms",
                }}
              >
                {item.day}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function TokenAnalyticsPage() {
  return (
    <ProtectedRoute>
      <AppShell>
        <TokenAnalyticsContent />
      </AppShell>
    </ProtectedRoute>
  );
}
