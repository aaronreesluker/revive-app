export type AppNotification = {
  id: string;
  title: string;
  message: string;
  details: string;
  timestamp: string;
  read?: boolean;
  category?: "payments" | "tokens" | "workflows" | "general";
  actionLabel?: string;
  actionRoute?: string;
};

export const notificationFeed: AppNotification[] = [
  {
    id: "notif-1",
    title: "Payout sent",
    message: "£4,320 transferred to HSBC business account.",
    details:
      "Stripe initiated a full payout to the HSBC Business account ending ••92. The transfer covers invoices INV-1042 through INV-1047. Expect funds to clear within the next business day.",
    timestamp: "2h ago",
    category: "payments",
  },
  {
    id: "notif-2",
    title: "Token usage at 85%",
    message: "Automations will pause soon. Add-on pack recommended.",
    details:
      "You've consumed 42,500 of the 50,000 tokens available on the Professional plan. Enable auto top-ups or purchase an add-on pack to avoid service interruptions.",
    timestamp: "4h ago",
    category: "tokens",
    actionLabel: "Manage capacity",
    actionRoute: "/settings",
  },
  {
    id: "notif-3",
    title: "Enterprise workflow request ready",
    message: "Custom AI receptionist improvements waiting for review.",
    details:
      "Success engineering has finalised the bespoke automation that connects the AI Receptionist to Salesforce. Review the playbook and approve deployment to go live.",
    timestamp: "Yesterday",
    category: "workflows",
    actionLabel: "Review playbook",
    actionRoute: "/workflows",
    read: true,
  },
];
