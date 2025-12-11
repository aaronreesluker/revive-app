"use client";

import { memo } from "react";
import { TrendingUp, CheckCircle, DollarSign, Calendar, Phone } from "lucide-react";
import type { SalesLead } from "@/types/sales";

type TotalStats = {
  totalLeads: number;
  closed: number;
  appointmentBooked: number;
  notInterested: number;
  closeRate: number;
  totalRevenue: number;
  totalUpsells: number;
  conversionRate: number;
  averageSalesCycle: number;
  averageFollowUps: number;
  quoteAcceptanceRate: number;
  repeatCustomerRate: number;
  highestAvgRevIndustry: string | null;
  highestAvgRevIndustryValue: number;
};

type SalesSummaryCardsProps = {
  stats: TotalStats;
  formatCurrency: (value: number) => string;
};

export const SalesSummaryCards = memo(function SalesSummaryCards({ stats, formatCurrency }: SalesSummaryCardsProps) {
  return (
    <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6 overflow-x-auto">
      <div className="group relative rounded-lg border border-white/10 p-4 transition-all hover:border-white/20" style={{ background: "color-mix(in oklab, var(--panel), transparent 80%)" }}>
        <div className="flex items-center justify-between text-xs uppercase tracking-wide transition-opacity group-hover:opacity-0" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
          <span>Top Industry</span>
          <TrendingUp size={14} className="text-emerald-300 cursor-help transition-transform group-hover:scale-110" />
        </div>
        <div className="mt-2 text-2xl font-semibold transition-opacity group-hover:opacity-0" style={{ color: "var(--foreground)" }}>
          {stats.highestAvgRevIndustry || "-"}
        </div>
        <p className="mt-1 text-[11px] transition-opacity group-hover:opacity-0 truncate" style={{ color: "color-mix(in oklab, var(--foreground), transparent 55%)" }}>
          {stats.highestAvgRevIndustryValue > 0 ? formatCurrency(stats.highestAvgRevIndustryValue) : "No data"}
        </p>
        <div className="absolute inset-0 flex items-center justify-center p-4 opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none">
          <p className="text-xs text-center leading-relaxed" style={{ color: "var(--foreground)" }}>
            Industry with the highest average revenue per sale. This helps identify the most profitable service types.
          </p>
        </div>
      </div>
      <div className="group relative rounded-lg border border-white/10 p-4 transition-all hover:border-white/20" style={{ background: "color-mix(in oklab, var(--panel), transparent 80%)" }}>
        <div className="flex items-center justify-between text-xs uppercase tracking-wide transition-opacity group-hover:opacity-0" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
          <span>Closed</span>
          <CheckCircle size={14} className="text-emerald-400 cursor-help transition-transform group-hover:scale-110" />
        </div>
        <div className="mt-2 text-2xl font-semibold transition-opacity group-hover:opacity-0" style={{ color: "var(--foreground)" }}>
          {stats.closed}
        </div>
        <p className="mt-1 text-[11px] transition-opacity group-hover:opacity-0" style={{ color: "color-mix(in oklab, var(--foreground), transparent 55%)" }}>
          {stats.closeRate.toFixed(1)}% close rate
        </p>
        <div className="absolute inset-0 flex items-center justify-center p-4 opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none">
          <p className="text-xs text-center leading-relaxed" style={{ color: "var(--foreground)" }}>
            Successfully closed deals. Close rate shows percentage of leads that converted to sales.
          </p>
        </div>
      </div>
      <div className="group relative rounded-lg border border-white/10 p-4 transition-all hover:border-white/20" style={{ background: "color-mix(in oklab, var(--panel), transparent 80%)" }}>
        <div className="flex items-center justify-between text-xs uppercase tracking-wide transition-opacity group-hover:opacity-0" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
          <span>Total Revenue</span>
          <DollarSign size={14} className="text-sky-300 cursor-help transition-transform group-hover:scale-110" />
        </div>
        <div className="mt-2 text-2xl font-semibold transition-opacity group-hover:opacity-0" style={{ color: "var(--foreground)" }}>
          {formatCurrency(stats.totalRevenue)}
        </div>
        <p className="mt-1 text-[11px] transition-opacity group-hover:opacity-0" style={{ color: "color-mix(in oklab, var(--foreground), transparent 55%)" }}>
          {formatCurrency(stats.totalUpsells)} from upsells
        </p>
        <div className="absolute inset-0 flex items-center justify-center p-4 opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none">
          <p className="text-xs text-center leading-relaxed" style={{ color: "var(--foreground)" }}>
            Total revenue from all closed deals, including base sales and additional upsell revenue.
          </p>
        </div>
      </div>
      <div className="group relative rounded-lg border border-white/10 p-4 transition-all hover:border-white/20" style={{ background: "color-mix(in oklab, var(--panel), transparent 80%)" }}>
        <div className="flex items-center justify-between text-xs uppercase tracking-wide transition-opacity group-hover:opacity-0" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
          <span>Conversion</span>
          <TrendingUp size={14} className="text-amber-300 cursor-help transition-transform group-hover:scale-110" />
        </div>
        <div className="mt-2 text-2xl font-semibold transition-opacity group-hover:opacity-0" style={{ color: "var(--foreground)" }}>
          {stats.conversionRate.toFixed(1)}%
        </div>
        <p className="mt-1 text-[11px] transition-opacity group-hover:opacity-0" style={{ color: "color-mix(in oklab, var(--foreground), transparent 55%)" }}>
          Appointment to close
        </p>
        <div className="absolute inset-0 flex items-center justify-center p-4 opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none">
          <p className="text-xs text-center leading-relaxed" style={{ color: "var(--foreground)" }}>
            Percentage of appointments that successfully converted to closed deals. Higher rates indicate better sales effectiveness.
          </p>
        </div>
      </div>
      <div className="group relative rounded-lg border border-white/10 p-4 transition-all hover:border-white/20" style={{ background: "color-mix(in oklab, var(--panel), transparent 80%)" }}>
        <div className="flex items-center justify-between text-xs uppercase tracking-wide transition-opacity group-hover:opacity-0" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
          <span>Sales Cycle</span>
          <Calendar size={14} className="text-purple-300 cursor-help transition-transform group-hover:scale-110" />
        </div>
        <div className="mt-2 text-2xl font-semibold transition-opacity group-hover:opacity-0" style={{ color: "var(--foreground)" }}>
          {stats.averageSalesCycle > 0 ? stats.averageSalesCycle.toFixed(1) : "-"}
        </div>
        <p className="mt-1 text-[11px] transition-opacity group-hover:opacity-0" style={{ color: "color-mix(in oklab, var(--foreground), transparent 55%)" }}>
          {stats.averageSalesCycle > 0 ? "days avg" : "No data"}
        </p>
        <div className="absolute inset-0 flex items-center justify-center p-4 opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none">
          <p className="text-xs text-center leading-relaxed" style={{ color: "var(--foreground)" }}>
            Average number of days from initial lead creation to deal closure. Shorter cycles indicate faster sales processes.
          </p>
        </div>
      </div>
      <div className="group relative rounded-lg border border-white/10 p-4 transition-all hover:border-white/20 overflow-hidden" style={{ background: "color-mix(in oklab, var(--panel), transparent 80%)" }}>
        <div className="flex items-center justify-between text-xs uppercase tracking-wide transition-opacity group-hover:opacity-0" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
          <span>Avg Follow-ups</span>
          <Phone size={14} className="text-blue-300 cursor-help transition-transform group-hover:scale-110" />
        </div>
        <div className="mt-2 text-2xl font-semibold transition-opacity group-hover:opacity-0" style={{ color: "var(--foreground)" }}>
          {stats.averageFollowUps > 0 ? stats.averageFollowUps.toFixed(1) : "-"}
        </div>
        <p className="mt-1 text-[11px] transition-opacity group-hover:opacity-0 truncate" style={{ color: "color-mix(in oklab, var(--foreground), transparent 55%)" }}>
          {stats.averageFollowUps > 0 ? "per lead" : "No data"}
        </p>
        <div className="absolute inset-0 flex items-center justify-center p-4 opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none">
          <p className="text-xs text-center leading-relaxed" style={{ color: "var(--foreground)" }}>
            Average number of follow-up attempts per lead. More follow-ups often correlate with higher conversion rates.
          </p>
        </div>
      </div>
    </div>
  );
});


