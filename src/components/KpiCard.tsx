"use client";

import { memo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "../lib/utils";
import { Modal } from "./Modal";

export type KpiCardProps = {
  label: string;
  value: string | number;
  delta?: number;
  intent?: "good" | "bad" | "neutral";
  highlight?: boolean;
  className?: string;
  onInteract?: () => void;
  drilldown?: {
    title: string;
    timeline: Array<{ date: string; value: number }>;
    bullets: string[];
  };
};

export const KpiCard = memo(function KpiCard({
  label,
  value,
  delta = 0,
  intent = "neutral",
  highlight = false,
  className,
  onInteract,
  drilldown,
}: KpiCardProps) {
  const [showDrilldown, setShowDrilldown] = useState(false);
  const isPositive = delta >= 0;

  const handleClick = () => {
    if (drilldown) {
      setShowDrilldown(true);
      onInteract?.();
    }
  };

  return (
    <>
      <motion.button
        onClick={handleClick}
        disabled={!drilldown}
        initial={{ rotateX: 90, opacity: 0 }}
        animate={{ rotateX: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }}
        className={cn(
          "card-glass w-full rounded-xl p-4 text-left transition-all",
          highlight && "ring-1 ring-teal-400/50 shadow-[0_0_0_4px_rgba(20,184,166,0.08)]",
          drilldown && "cursor-pointer hover:scale-[1.02]",
          className
        )}
      >
        <div className="text-sm text-zinc-400">{label}</div>
        <div className="mt-1 text-2xl font-semibold text-zinc-100">{value}</div>
        <div className={cn("mt-2 flex items-center gap-1 text-xs", isPositive ? "text-emerald-400" : "text-rose-400")}>
          {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          <span>
            {isPositive ? "+" : ""}
            {Math.abs(delta)}%
          </span>
          <span className="text-zinc-500">vs last period</span>
        </div>
        <div className={cn("mt-3 h-1.5 w-full overflow-hidden rounded-full", "bg-zinc-800")}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, Math.abs(delta))}%` }}
            transition={{ duration: 1.1, delay: 0.2 }}
            className={cn("h-full", isPositive ? "brand-bg" : "bg-rose-500")}
          />
        </div>
      </motion.button>
      {drilldown && (
        <Modal open={showDrilldown} onClose={() => setShowDrilldown(false)} title={drilldown.title}>
          <div className="space-y-4">
            <div>
              <h3 className="mb-2 text-sm font-medium text-zinc-300">7-Day Trend</h3>
              <div className="flex h-24 items-end justify-between gap-1 rounded-lg bg-zinc-900/60 p-2">
                {drilldown.timeline.map((point, i) => (
                  <motion.div
                    key={i}
                    initial={{ height: 0 }}
                    animate={{ height: `${(point.value / Math.max(...drilldown.timeline.map((p) => p.value))) * 100}%` }}
                    transition={{ delay: i * 0.05 }}
                    className="flex-1 rounded-t bg-teal-500/60"
                    title={`${point.date}: ${point.value}`}
                  />
                ))}
              </div>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-medium text-zinc-300">Key Insights</h3>
              <ul className="space-y-1 text-sm text-zinc-400">
                {drilldown.bullets.map((bullet, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-teal-500" />
                    {bullet}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
});

