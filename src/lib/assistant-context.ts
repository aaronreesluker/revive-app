"use server";

import { loadTokensSnapshot } from "@/lib/data-adapters/tokens";
import { loadPaymentsSnapshot } from "@/lib/data-adapters/payments";
import { loadReviewsSnapshot } from "@/lib/data-adapters/reviews";
import { loadSalesSnapshot } from "@/lib/data-adapters/sales";

export type AssistantContext = {
  tokens: Awaited<ReturnType<typeof loadTokensSnapshot>>;
  payments: Awaited<ReturnType<typeof loadPaymentsSnapshot>>;
  reviews: Awaited<ReturnType<typeof loadReviewsSnapshot>>;
  sales: Awaited<ReturnType<typeof loadSalesSnapshot>>;
  summary: {
    tokens: string;
    payments: string;
    reviews: string;
    sales: string;
  };
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(value);
}

export async function getAssistantContext(): Promise<AssistantContext> {
  const [tokens, payments, reviews, sales] = await Promise.all([
    loadTokensSnapshot(),
    loadPaymentsSnapshot(),
    loadReviewsSnapshot(),
    loadSalesSnapshot(),
  ]);

  const outstandingValue = payments.invoices
    .filter((invoice) => invoice.status !== "paid")
    .reduce((sum, invoice) => sum + invoice.amount, 0);
  const paidValue = payments.invoices
    .filter((invoice) => invoice.status === "paid")
    .reduce((sum, invoice) => sum + invoice.amount, 0);

  const openFollowUps = reviews.followUps.filter((item) => item.status !== "completed").length;
  const completedFollowUps = reviews.followUps.filter((item) => item.status === "completed").length;

  // Calculate sales metrics
  const closedLeads = sales.leads.filter((l) => l.status === "Closed");
  const totalRevenue = closedLeads.reduce((sum, l) => sum + (l.priceSoldAt || 0), 0);
  const totalUpsells = closedLeads.reduce((sum, l) => sum + (l.upsellAmount || 0), 0);
  const closeRate = sales.leads.length > 0 ? (closedLeads.length / sales.leads.length) * 100 : 0;
  
  // Group by industry
  const industryStats = sales.leads.reduce((acc, lead) => {
    if (!acc[lead.industry]) {
      acc[lead.industry] = { total: 0, closed: 0, revenue: 0 };
    }
    acc[lead.industry].total++;
    if (lead.status === "Closed") {
      acc[lead.industry].closed++;
      acc[lead.industry].revenue += (lead.priceSoldAt || 0) + (lead.upsellAmount || 0);
    }
    return acc;
  }, {} as Record<string, { total: number; closed: number; revenue: number }>);

  const topIndustry = Object.entries(industryStats)
    .sort((a, b) => b[1].revenue - a[1].revenue)[0];

  return {
    tokens,
    payments,
    reviews,
    sales,
    summary: {
      tokens: `Used ${tokens.usedTokens.toLocaleString()} of ${tokens.baseAllowance.toLocaleString()} allowance (${tokens.remainingTokens.toLocaleString()} remaining). ${
        tokens.purchases.length
      } add-on purchases recorded.`,
      payments: `Collected ${formatCurrency(paidValue)} with ${formatCurrency(outstandingValue)} still outstanding. ${
        payments.requests.length
      } payment requests logged.`,
      reviews: `${openFollowUps} follow-ups open, ${completedFollowUps} completed. ${
        reviews.tickets.length
      } operations tickets active.`,
      sales: `${sales.leads.length} total leads with ${closedLeads.length} closed (${closeRate.toFixed(1)}% close rate). Total revenue: ${formatCurrency(totalRevenue)} (${formatCurrency(totalUpsells)} from upsells). ${
        topIndustry ? `Top performing industry: ${topIndustry[0]} with ${formatCurrency(topIndustry[1].revenue)} revenue.` : ""
      }`,
    },
  };
}

