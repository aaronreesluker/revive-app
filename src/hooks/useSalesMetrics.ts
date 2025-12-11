/**
 * Custom hook for calculating sales metrics
 */

import { useMemo } from "react";
import type { SalesLead, IndustryMetrics } from "@/types/sales";

/**
 * Calculate industry metrics from sales leads
 */
export function calculateIndustryMetrics(leads: SalesLead[]): IndustryMetrics[] {
  const industryMap = new Map<string, {
    leads: SalesLead[];
  }>();

  leads.forEach((lead) => {
    if (!industryMap.has(lead.industry)) {
      industryMap.set(lead.industry, { leads: [] });
    }
    industryMap.get(lead.industry)!.leads.push(lead);
  });

  const metrics: IndustryMetrics[] = Array.from(industryMap.entries()).map(([industry, data]) => {
    const totalLeads = data.leads.length;
    const closed = data.leads.filter((l) => l.status === "Closed").length;
    const appointmentBooked = data.leads.filter((l) => l.status === "Appointment Booked").length;
    const notInterested = data.leads.filter((l) => l.status === "Not Interested").length;
    const closeRate = totalLeads > 0 ? (closed / totalLeads) * 100 : 0;
    
    const closedLeads = data.leads.filter((l) => l.status === "Closed");
    const totalRevenue = closedLeads.reduce((sum, lead) => sum + (lead.priceSoldAt || 0), 0);
    const averageSalePrice = closedLeads.length > 0 ? totalRevenue / closedLeads.length : 0;
    
    const upsellLeads = closedLeads.filter((l) => l.upsellAmount && l.upsellAmount > 0);
    const totalUpsells = upsellLeads.length;
    const upsellRevenue = upsellLeads.reduce((sum, lead) => sum + (lead.upsellAmount || 0), 0);
    const averageUpsell = totalUpsells > 0 ? upsellRevenue / totalUpsells : 0;

    // Calculate sales cycle time (days from creation to close)
    const salesCycles = closedLeads
      .filter((l) => l.closedDate && l.createdAt)
      .map((l) => (l.closedDate! - l.createdAt) / (1000 * 60 * 60 * 24));
    const averageSalesCycle = salesCycles.length > 0 
      ? salesCycles.reduce((sum, days) => sum + days, 0) / salesCycles.length 
      : 0;

    // Calculate average follow-ups
    const followUpCounts = data.leads
      .filter((l) => l.followUpCount !== undefined)
      .map((l) => l.followUpCount || 0);
    const averageFollowUps = followUpCounts.length > 0
      ? followUpCounts.reduce((sum, count) => sum + count, 0) / followUpCounts.length
      : 0;

    // Conversion rate (appointment to close)
    const appointments = data.leads.filter((l) => 
      l.status === "Appointment Booked" || l.status === "Closed"
    );
    const conversionRate = appointments.length > 0 
      ? (closed / appointments.length) * 100 
      : 0;

    // Average discount
    const discounts = closedLeads
      .filter((l) => l.discount !== undefined && l.discount > 0)
      .map((l) => l.discount!);
    const averageDiscount = discounts.length > 0
      ? discounts.reduce((sum, disc) => sum + disc, 0) / discounts.length
      : 0;

    // Repeat customer rate
    const repeatCustomers = closedLeads.filter((l) => l.isRepeatCustomer).length;
    const repeatCustomerRate = closedLeads.length > 0
      ? (repeatCustomers / closedLeads.length) * 100
      : 0;

    // Average meeting duration
    const meetingDurations = data.leads
      .filter((l) => l.meetingDuration && l.meetingDuration > 0)
      .map((l) => l.meetingDuration!);
    const averageMeetingDuration = meetingDurations.length > 0
      ? meetingDurations.reduce((sum, dur) => sum + dur, 0) / meetingDurations.length
      : 0;

    // Quote acceptance rate
    const quotesSent = data.leads.filter((l) => l.quoteSentDate).length;
    const quotesAccepted = data.leads.filter((l) => l.quoteAcceptedDate).length;
    const quoteAcceptanceRate = quotesSent > 0 ? (quotesAccepted / quotesSent) * 100 : 0;

    // Top win reason
    const winReasons = closedLeads
      .filter((l) => l.winReason)
      .map((l) => l.winReason!);
    const winReasonCounts = winReasons.reduce((acc, reason) => {
      acc[reason] = (acc[reason] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const topWinReason = Object.entries(winReasonCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0];

    // Top loss reason
    const lostLeads = data.leads.filter((l) => l.status === "Not Interested");
    const lossReasons = lostLeads
      .filter((l) => l.lossReason)
      .map((l) => l.lossReason!);
    const lossReasonCounts = lossReasons.reduce((acc, reason) => {
      acc[reason] = (acc[reason] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const topLossReason = Object.entries(lossReasonCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0];

    // Top source
    const sources = data.leads
      .filter((l) => l.source)
      .map((l) => l.source!);
    const sourceCounts = sources.reduce((acc, source) => {
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const topSource = Object.entries(sourceCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0];

    return {
      industry,
      totalLeads,
      closed,
      appointmentBooked,
      notInterested,
      closeRate,
      totalRevenue,
      averageSalePrice,
      totalUpsells,
      upsellRevenue,
      averageUpsell,
      averageSalesCycle,
      averageFollowUps,
      conversionRate,
      averageDiscount,
      repeatCustomerRate,
      averageMeetingDuration,
      quoteAcceptanceRate,
      topWinReason,
      topLossReason,
      topSource,
    };
  });

  return metrics;
}

/**
 * Hook to calculate and memoize industry metrics
 */
export function useSalesMetrics(leads: SalesLead[]) {
  return useMemo(() => calculateIndustryMetrics(leads), [leads]);
}


