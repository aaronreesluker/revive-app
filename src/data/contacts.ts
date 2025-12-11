export type Contact = {
  id: string;
  name: string;
  email: string;
  phone: string;
  stage: string;
  source: string;
  createdAt: string;
  company?: string;
  timezone?: string;
  owner?: string;
};

export type ContactProfile = {
  id: string;
  tags: string[];
  lastContact: string;
  lifetimeValue: string;
  openOpportunities: number;
  notes: string[];
  tasks: Array<{
    id: string;
    title: string;
    due: string;
    status: "open" | "completed";
  }>;
  timeline: Array<{
    id: string;
    type: "call" | "task" | "note" | "email";
    title: string;
    timestamp: string;
    actor: string;
    summary: string;
  }>;
};

export const mockContacts: Contact[] = [
  {
    id: "1",
    name: "Alex Contractor",
    email: "alex@example.com",
    phone: "(555) 123-4567",
    stage: "New Lead",
    source: "Google Ads",
    createdAt: "2024-01-15",
    company: "Contractor Co.",
    timezone: "America/New_York",
    owner: "Jordan Blake",
  },
  {
    id: "2",
    name: "Jordan Mills",
    email: "jordan@millsco.com",
    phone: "(555) 555-9101",
    stage: "Qualified",
    source: "Referral",
    createdAt: "2024-01-14",
    company: "Mills & Co.",
    timezone: "Europe/London",
    owner: "Alice Shaw",
  },
  {
    id: "3",
    name: "Priya Kapoor",
    email: "priya@homes.io",
    phone: "(555) 444-8877",
    stage: "Booked",
    source: "Website",
    createdAt: "2024-01-13",
    company: "Homes.io",
    timezone: "Asia/Kolkata",
    owner: "Priya Kendre",
  },
];

export const contactProfiles: Record<string, ContactProfile> = {
  "1": {
    id: "1",
    tags: ["General Contractor", "High Intent", "Premium Tier"],
    lastContact: "3 hours ago via SMS",
    lifetimeValue: "$18,400",
    openOpportunities: 2,
    notes: [
      "Interested in AI receptionist for after-hours coverage.",
      "Asked for quarterly analytics export and KPI coaching.",
    ],
    tasks: [
      { id: "t1", title: "Send bespoke automation proposal", due: "Due Today · 4:00 PM", status: "open" },
      { id: "t2", title: "Follow up on onboarding checklist", due: "Completed Yesterday", status: "completed" },
    ],
    timeline: [
      {
        id: "tl1",
        type: "call",
        title: "Call • Explored workflow gaps",
        timestamp: "Today · 11:15 AM",
        actor: "Jordan Blake",
        summary: "Discussed routing rules and integrations. Agreed to map existing GHL funnels.",
      },
      {
        id: "tl2",
        type: "note",
        title: "Note • Requires payment recovery playbook",
        timestamp: "Yesterday · 5:42 PM",
        actor: "Priya Kendre",
        summary: "Wants automated dunning for overdue invoices. Shared sample copy for review.",
      },
      {
        id: "tl3",
        type: "email",
        title: "Email • Sent dashboard digest",
        timestamp: "Mon · 9:20 AM",
        actor: "Revive Automations",
        summary: "Weekly usage summary delivered. CTR on review requests up 12%.",
      },
    ],
  },
  "2": {
    id: "2",
    tags: ["Home Services", "Referral"],
    lastContact: "Yesterday via Slack Connect",
    lifetimeValue: "$8,950",
    openOpportunities: 1,
    notes: ["Evaluating review escalation automations.", "Prefers insight briefings every Monday morning."],
    tasks: [
      { id: "t3", title: "Draft review follow-up script", due: "Due Tomorrow", status: "open" },
      { id: "t4", title: "Confirm sandbox credentials", due: "Completed Monday", status: "completed" },
    ],
    timeline: [
      {
        id: "tl4",
        type: "note",
        title: "Note • Shared competitor benchmark",
        timestamp: "Yesterday · 2:05 PM",
        actor: "Alice Shaw",
        summary: "Provided token usage trends compared with regional averages.",
      },
      {
        id: "tl5",
        type: "call",
        title: "Call • Intake with ops manager",
        timestamp: "Tue · 3:40 PM",
        actor: "Ethan Miller",
        summary: "Walked through existing Zapier flows; flagged manual invoice reminders.",
      },
    ],
  },
  "3": {
    id: "3",
    tags: ["Real Estate", "Upsell Target"],
    lastContact: "4 days ago via Email",
    lifetimeValue: "$12,670",
    openOpportunities: 3,
    notes: ["Needs multilingual receptionist coverage.", "Potential pilot for AI Insights add-on."],
    tasks: [
      { id: "t5", title: "Prepare multi-language script pack", due: "Due Friday", status: "open" },
      { id: "t6", title: "Book insights tour", due: "Completed Last Week", status: "completed" },
    ],
    timeline: [
      {
        id: "tl6",
        type: "email",
        title: "Email • Shared AI recap",
        timestamp: "Fri · 6:10 PM",
        actor: "Revive Automations",
        summary: "Sent weekly review summary with escalation recommendations.",
      },
      {
        id: "tl7",
        type: "task",
        title: "Task • Capture CRM field mapping",
        timestamp: "Thu · 1:25 PM",
        actor: "Jordan Blake",
        summary: "Documented required custom fields for n8n connector.",
      },
    ],
  },
};


