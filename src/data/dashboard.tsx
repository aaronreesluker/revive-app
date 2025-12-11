"use client";

import type { ReactNode } from "react";
import { Phone, PoundSterling, Calendar, MessageSquare, CheckCircle, AlertCircle } from "lucide-react";

type ActivityItem = {
  id: number;
  type: string;
  message: string;
  time: string;
  icon: ReactNode;
};

export const recentReceptionistTriggers = [
  { id: 1, type: "call", contact: "Sarah Johnson", action: "Scheduled appointment", time: "2 min ago", status: "success" },
  { id: 2, type: "call", contact: "Mike Chen", action: "Answered FAQ about pricing", time: "15 min ago", status: "success" },
  { id: 3, type: "message", contact: "Emma Davis", action: "Sent follow-up SMS", time: "1 hour ago", status: "success" },
  { id: 4, type: "call", contact: "Robert Wilson", action: "Rescheduled appointment", time: "2 hours ago", status: "success" },
  { id: 5, type: "message", contact: "Lisa Anderson", action: "Sent quote via SMS", time: "3 hours ago", status: "success" },
];

export const receptionistHighlights = [
  {
    id: "highlight-1",
    caller: "Sarah Johnson",
    time: "3 min ago",
    summary: "Requested updated quote. Routed to ops for callback.",
    intent: "Quote request",
    sla: "Response due 15:45",
  },
  {
    id: "highlight-2",
    caller: "Daniel Clark",
    time: "8 min ago",
    summary: "Escalated to management after missing SLA.",
    intent: "Escalation",
    sla: "Critical",
  },
  {
    id: "highlight-3",
    caller: "Olivia Patel",
    time: "12 min ago",
    summary: "Left voicemail about follow-up sequence. Logged ticket.",
    intent: "Follow-up",
    sla: "Response due 18:00",
  },
];

export const recentPayments = [
  { id: 1, customer: "Alex Contractor", amount: 1800, status: "paid", date: "Today", invoice: "INV-1001" },
  { id: 2, customer: "Jordan Mills", amount: 950, status: "pending", date: "Today", invoice: "INV-1002" },
  { id: 3, customer: "Priya Kapoor", amount: 4200, status: "paid", date: "Yesterday", invoice: "INV-1003" },
  { id: 4, customer: "Tom Rodriguez", amount: 1250, status: "overdue", date: "2 days ago", invoice: "INV-1004" },
];

export const recentActivity: ActivityItem[] = [
  { id: 1, type: "workflow", message: "AI Receptionist answered call from Sarah Johnson", time: "2 min ago", icon: <Phone size={14} /> },
  { id: 2, type: "payment", message: "Payment received: £1,800 from Alex Contractor", time: "15 min ago", icon: <PoundSterling size={14} /> },
  { id: 3, type: "booking", message: "Appointment scheduled: Mike Chen - Thu 2PM", time: "1 hour ago", icon: <Calendar size={14} /> },
  { id: 4, type: "message", message: "5-Minute Reach Out sent to Emma Davis", time: "2 hours ago", icon: <MessageSquare size={14} /> },
  { id: 5, type: "review", message: "Review request sent to Priya Kapoor", time: "3 hours ago", icon: <CheckCircle size={14} /> },
  { id: 6, type: "payment", message: "Payment reminder sent: Tom Rodriguez - £1,250", time: "5 hours ago", icon: <AlertCircle size={14} /> },
];



