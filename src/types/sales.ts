/**
 * Sales-related type definitions
 */

export type LeadStatus = "Closed" | "Appointment Booked" | "Not Interested";

export type SalesLead = {
  id: string;
  businessName: string;
  industry: string;
  phoneNumber: string;
  currentPrice: number; // Initial price they're paying
  status: LeadStatus;
  // Closing data (added later)
  priceSoldAt?: number;
  upsellAmount?: number;
  upsellDescription?: string;
  closedDate?: number;
  createdAt: number;
  updatedAt: number;
  // New metrics for improved sales insights
  source?: string; // Where the lead came from (e.g., "Website", "Referral", "Cold Call", "Social Media")
  salesRep?: string; // Sales person handling the lead
  followUpCount?: number; // Number of follow-up attempts
  responseTime?: number; // Time in hours from lead creation to first response
  meetingDuration?: number; // Meeting duration in minutes
  discount?: number; // Discount percentage applied
  winReason?: string; // Why they bought (e.g., "Price", "Quality", "Service", "Urgency")
  lossReason?: string; // Why they didn't buy (e.g., "Too Expensive", "Not Ready", "Competitor")
  appointmentDate?: number; // When appointment was booked
  quoteSentDate?: number; // When quote was sent
  quoteAcceptedDate?: number; // When quote was accepted
  isRepeatCustomer?: boolean; // Whether they were a previous customer
  companySize?: string; // e.g., "Solo", "2-5", "6-20", "20+"
  location?: string; // Geographic location
  notes?: string; // Additional notes
};

export type IndustryMetrics = {
  industry: string;
  totalLeads: number;
  closed: number;
  appointmentBooked: number;
  notInterested: number;
  closeRate: number;
  totalRevenue: number;
  averageSalePrice: number;
  totalUpsells: number;
  upsellRevenue: number;
  averageUpsell: number;
  // New metrics
  averageSalesCycle: number; // Average days from lead to close
  averageFollowUps: number; // Average follow-up attempts per lead
  conversionRate: number; // Appointment to close rate
  averageDiscount: number; // Average discount percentage
  repeatCustomerRate: number; // Percentage of repeat customers
  averageMeetingDuration: number; // Average meeting duration in minutes
  quoteAcceptanceRate: number; // Percentage of quotes accepted
  topWinReason?: string; // Most common win reason
  topLossReason?: string; // Most common loss reason
  topSource?: string; // Most common lead source
};

export type SortField = keyof SalesLead | "calculatedRevenue";
export type SortDirection = "asc" | "desc";


