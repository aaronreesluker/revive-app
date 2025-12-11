"use client";

import { memo } from "react";
import { ArrowUpDown, Edit, Trash2 } from "lucide-react";
import type { SalesLead, IndustryMetrics, SortField, SortDirection } from "@/types/sales";

type SalesTableProps = {
  metrics: IndustryMetrics[];
  sortField: SortField | "industry";
  sortDirection: SortDirection;
  onSort: (field: SortField | "industry") => void;
  onEdit?: (industry: string) => void;
  onDelete?: (industry: string) => void;
};

export const SalesTable = memo(function SalesTable({
  metrics,
  sortField,
  sortDirection,
  onSort,
  onEdit,
  onDelete,
}: SalesTableProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(value);

  const SortButton = ({ field, children }: { field: SortField | "industry"; children: React.ReactNode }) => (
    <button
      onClick={() => onSort(field)}
      className="flex items-center gap-1 hover:opacity-70 transition-opacity"
      style={{ color: "var(--foreground)" }}
    >
      {children}
      <ArrowUpDown size={12} className={sortField === field ? "opacity-100" : "opacity-30"} />
    </button>
  );

  return (
    <div className="rounded-lg border border-white/10 overflow-hidden" style={{ background: "color-mix(in oklab, var(--panel), transparent 80%)" }}>
      <div className="overflow-x-auto">
        <table className="w-full" style={{ minWidth: "800px" }}>
          <thead>
            <tr style={{ background: "color-mix(in oklab, var(--panel), transparent 60%)" }}>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap">
                <SortButton field="industry">Industry</SortButton>
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap">
                Leads
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap">
                Closed
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap">
                Close Rate
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap">
                Revenue
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap">
                Avg Sale
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap">
                Upsells
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap">
                Conversion
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap">
                Sales Cycle
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap">
                Avg Follow-ups
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap">
                Quote Accept
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap">
                Repeat Rate
              </th>
              {(onEdit || onDelete) && (
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {metrics.length === 0 ? (
              <tr>
                <td colSpan={12} className="px-3 py-8 text-center text-sm" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>
                  No industry data available
                </td>
              </tr>
            ) : (
              metrics.map((metric) => (
                <tr key={metric.industry} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                  <td className="px-3 py-3 text-sm font-medium whitespace-nowrap" style={{ color: "var(--foreground)" }}>
                    {metric.industry}
                  </td>
                  <td className="px-3 py-3 text-sm whitespace-nowrap" style={{ color: "var(--foreground)" }}>
                    {metric.totalLeads}
                  </td>
                  <td className="px-3 py-3 text-sm whitespace-nowrap" style={{ color: "var(--foreground)" }}>
                    {metric.closed}
                  </td>
                  <td className="px-3 py-3 text-sm whitespace-nowrap" style={{ color: "var(--foreground)" }}>
                    {metric.closeRate.toFixed(1)}%
                  </td>
                  <td className="px-3 py-3 text-sm whitespace-nowrap" style={{ color: "var(--foreground)" }}>
                    {formatCurrency(metric.totalRevenue)}
                  </td>
                  <td className="px-3 py-3 text-sm whitespace-nowrap" style={{ color: "var(--foreground)" }}>
                    {formatCurrency(metric.averageSalePrice)}
                  </td>
                  <td className="px-3 py-3 text-sm whitespace-nowrap" style={{ color: "var(--foreground)" }}>
                    {metric.totalUpsells} ({formatCurrency(metric.upsellRevenue)})
                  </td>
                  <td className="px-3 py-3 text-sm whitespace-nowrap" style={{ color: "var(--foreground)" }}>
                    {metric.conversionRate.toFixed(1)}%
                  </td>
                  <td className="px-3 py-3 text-sm whitespace-nowrap" style={{ color: "var(--foreground)" }}>
                    {metric.averageSalesCycle > 0 ? `${metric.averageSalesCycle.toFixed(1)}d` : "-"}
                  </td>
                  <td className="px-3 py-3 text-sm whitespace-nowrap" style={{ color: "var(--foreground)" }}>
                    {metric.averageFollowUps > 0 ? metric.averageFollowUps.toFixed(1) : "-"}
                  </td>
                  <td className="px-3 py-3 text-sm whitespace-nowrap" style={{ color: "var(--foreground)" }}>
                    {metric.quoteAcceptanceRate > 0 ? `${metric.quoteAcceptanceRate.toFixed(1)}%` : "-"}
                  </td>
                  <td className="px-3 py-3 text-sm whitespace-nowrap" style={{ color: "var(--foreground)" }}>
                    {metric.repeatCustomerRate > 0 ? `${metric.repeatCustomerRate.toFixed(1)}%` : "-"}
                  </td>
                  {(onEdit || onDelete) && (
                    <td className="px-3 py-3 text-sm whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {onEdit && (
                          <button
                            onClick={() => onEdit(metric.industry)}
                            className="p-1 rounded hover:bg-white/10 transition-colors"
                            aria-label="Edit"
                          >
                            <Edit size={14} style={{ color: "color-mix(in oklab, var(--foreground), transparent 60%)" }} />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={() => onDelete(metric.industry)}
                            className="p-1 rounded hover:bg-white/10 transition-colors"
                            aria-label="Delete"
                          >
                            <Trash2 size={14} className="text-rose-400" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
});


