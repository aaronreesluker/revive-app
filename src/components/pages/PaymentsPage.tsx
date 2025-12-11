"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { StripeInvoice } from "@/lib/stripe-types";
import { usePayments } from "@/hooks/usePayments";
import { useAuth } from "@/context/AuthContext";
import { useEventLog } from "@/context/EventLogContext";
import { canViewCompanyData } from "@/lib/permissions";
import { Modal } from "../Modal";
import { Button } from "../Button";
import { Select, type SelectOption } from "../Select";
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  BellRing,
  Clock3,
  CreditCard,
  Download,
  ExternalLink,
  Mail,
  PieChart,
  Plus,
  Repeat2,
  SlidersHorizontal,
  Trash2,
  Wallet,
  Building2,
} from "lucide-react";
import { BacsSetupModal } from "./BacsSetupModal";
import { useBacsMandates } from "@/hooks/useBacsMandates";

const presetProducts = [
  { id: "prod-website-build", name: "Website Build Fee", description: "Custom website development and design", price: 0 },
  { id: "prod-seo", name: "SEO", description: "Search engine optimization services", price: 0 },
  { id: "prod-smm", name: "SMM", description: "Social media marketing and management", price: 0 },
  { id: "prod-apps", name: "Apps", description: "Mobile and web application development", price: 0 },
];

type ProductLine = {
  id: string;
  productId?: string;
  name: string;
  price: number;
  quantity: number;
};

type RequestResult = {
  link: string;
  amount: number;
  items: ProductLine[];
  paymentDate?: string | null;
  billingType: "one_time" | "recurring";
  billingInterval?: "weekly" | "monthly" | "quarterly" | "yearly" | null;
};

const createInitialProductLines = (): ProductLine[] => [
  {
    id: "line-1",
    productId: presetProducts[0]?.id,
    name: presetProducts[0]?.name || "",
    price: presetProducts[0]?.price || 0,
    quantity: 1,
  },
];

const today = () => new Date().toISOString().split("T")[0];

function formatInvoiceStatus(status: StripeInvoice["status"]) {
  switch (status) {
    case "paid":
      return { label: "Paid", className: "bg-emerald-600/20 text-emerald-300 ring-emerald-600/30" };
    case "open":
      return { label: "Due", className: "bg-amber-500/15 text-amber-200 ring-amber-400/30" };
    case "uncollectible":
      return { label: "Uncollectible", className: "bg-rose-500/15 text-rose-200 ring-rose-400/30" };
    case "void":
      return { label: "Voided", className: "bg-zinc-600/20 text-zinc-300 ring-zinc-500/30" };
    case "draft":
    default:
      return { label: "Draft", className: "bg-sky-500/15 text-sky-200 ring-sky-400/30" };
  }
}

function fallbackEmail(name: string) {
  return `${name.replace(/\s+/g, ".").toLowerCase()}@example.com`;
}

// Helper to load sales leads from localStorage
function loadSalesLeads() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem("revive-sales-leads");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function PaymentsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const effectiveRole = user?.role || "sales";
  const isSalesUser = effectiveRole === "sales";
  const canViewAllData = canViewCompanyData(effectiveRole);
  
  const {
    invoices: allInvoices,
    requests: allRequests,
    loading,
    error,
    source,
    createPaymentRequest,
    sendInvoiceEmail,
    queueCollectionsReminder,
    exportPayoutReport,
    updatePayoutRules,
  } = usePayments();

  const { mandates: bacsMandates, activeMandates, cancelMandate } = useBacsMandates();
  const { recordEvent } = useEventLog();

  const bacsByEmail = useMemo(() => {
    const map = new Map<string, boolean>();
    activeMandates.forEach((mandate) => {
      if (mandate.customerEmail) {
        map.set(mandate.customerEmail.toLowerCase(), true);
      }
    });
    return map;
  }, [activeMandates]);

  // Filter invoices and requests for sales users
  const invoices = useMemo(() => {
    if (canViewAllData) return allInvoices;
    // For sales users, only show invoices they created
    return allInvoices.filter((inv) => inv.createdBy === user?.id);
  }, [allInvoices, canViewAllData, user?.id]);

  const requests = useMemo(() => {
    if (canViewAllData) return allRequests;
    // For sales users, only show requests they created
    return allRequests.filter((req) => req.createdBy === user?.id);
  }, [allRequests, canViewAllData, user?.id]);

  // Calculate revenue from sales leads for sales users
  const salesLeadsRevenue = useMemo(() => {
    if (canViewAllData) return 0;
    const leads = loadSalesLeads();
    // Sum up revenue from closed leads (priceSoldAt + upsellAmount)
    return leads
      .filter((lead: any) => lead.status === "Closed")
      .reduce((sum: number, lead: any) => sum + (lead.priceSoldAt || 0) + (lead.upsellAmount || 0), 0);
  }, [canViewAllData]);

  const [selectedInvoice, setSelectedInvoice] = useState<StripeInvoice | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestState, setRequestState] = useState({
    customerName: "",
    customerEmail: "",
    description: "",
    paymentDate: today(),
    billingType: "one_time" as "one_time" | "recurring",
    billingInterval: "monthly" as "weekly" | "monthly" | "quarterly" | "yearly",
  });
  const [productLines, setProductLines] = useState<ProductLine[]>(createInitialProductLines());
  const [requestResult, setRequestResult] = useState<RequestResult | null>(null);
  const [showPayoutRulesModal, setShowPayoutRulesModal] = useState(false);
  const [showBacsSetupModal, setShowBacsSetupModal] = useState(false);
  const [payoutRules, setPayoutRules] = useState({
    threshold: 500,
    schedule: "weekly",
    autoDisburse: true,
    notifyAt: 80,
    destinations: {
      primary: "HSBC Business •••• 9921",
      secondaryEnabled: false,
      secondary: "FastPayDirect",
    },
  });

  const totalAmount = useMemo(
    () => productLines.reduce((sum, line) => sum + line.price * line.quantity, 0),
    [productLines],
  );

  const totalCollected = useMemo(() => {
    const invoiceRevenue = invoices.filter((inv) => inv.status === "paid").reduce((sum, inv) => sum + inv.amount, 0);
    // For sales users, add revenue from their closed sales leads
    return invoiceRevenue + (isSalesUser ? salesLeadsRevenue : 0);
  }, [invoices, isSalesUser, salesLeadsRevenue]);
  const outstandingValue = useMemo(
    () => invoices.filter((inv) => inv.status !== "paid").reduce((sum, inv) => sum + inv.amount, 0),
    [invoices],
  );
  const outstandingCount = useMemo(
    () => invoices.filter((inv) => inv.status !== "paid").length,
    [invoices],
  );
  const recurringTotal = useMemo(
    () => requests.filter((req) => req.billingType === "recurring").reduce((sum, req) => sum + req.amount, 0),
    [requests],
  );
  const activeSubscriptions = useMemo(
    () => requests.filter((req) => req.billingType === "recurring").length,
    [requests],
  );
  const collectedRate = useMemo(() => {
    if (!invoices.length) return 0;
    const paid = invoices.filter((inv) => inv.status === "paid").length;
    return Math.round((paid / invoices.length) * 100);
  }, [invoices]);

  const billingTypeOptions: SelectOption[] = [
    { value: "one_time", label: "One-time" },
    { value: "recurring", label: "Recurring" },
  ];

  const billingIntervalOptions: SelectOption[] = [
    { value: "weekly", label: "Weekly" },
    { value: "monthly", label: "Monthly" },
    { value: "quarterly", label: "Quarterly" },
    { value: "yearly", label: "Yearly" },
  ];

  const productOptions: SelectOption[] = [
    ...presetProducts.map((product) => ({
      value: product.id,
      label: `${product.name} • £${product.price.toFixed(2)}`,
    })),
    { value: "custom", label: "Custom product" },
  ];

  const outstandingLabel = outstandingCount > 0 ? `${outstandingCount} due` : "Up to date";

  const actionShortcuts = useMemo(() => {
    const shortcuts: Array<{
      id: string;
      icon: typeof BellRing;
      title: string;
      description: string;
      badge: string | null;
      action: () => void | Promise<void>;
    }> = [];

    // Only show actions for admin users
    if (canViewAllData) {
      shortcuts.push(
        {
          id: "reminders",
          icon: BellRing,
          title: "Send batch reminders",
          description: "Trigger email & SMS nudges for overdue invoices.",
          badge: outstandingCount > 0 ? outstandingLabel : null,
          action: async () => {
            const count = queueCollectionsReminder();
            alert(
              count
                ? `Queued personalised reminders for ${count} invoice${count > 1 ? "s" : ""}.`
                : "No outstanding invoices right now.",
            );
          },
        },
        {
          id: "export",
          icon: Download,
          title: "Export payout report",
          description: "Generate a CSV for your accounting platform.",
          badge: "CSV",
          action: () => {
            exportPayoutReport();
            alert("Payout report generated. Check your downloads.");
          },
        },
        {
          id: "rules",
          icon: SlidersHorizontal,
          title: "Set up payout rules",
          description: "Define thresholds, schedules, and auto-routing.",
          badge: null,
          action: () => setShowPayoutRulesModal(true),
        }
      );
    }

    return shortcuts;
  }, [outstandingCount, outstandingLabel, canViewAllData, queueCollectionsReminder, exportPayoutReport]);

  const openRequestModal = () => {
    setRequestState({
      customerName: "",
      customerEmail: "",
      description: "",
      paymentDate: today(),
      billingType: "one_time",
      billingInterval: "monthly",
    });
    setProductLines(createInitialProductLines());
    setRequestResult(null);
    setShowRequestModal(true);

    recordEvent({
      category: "payments",
      action: "request_payment_opened",
      summary: "Opened payment request modal",
      meta: {
        billingType: requestState.billingType,
      },
    });
  };

  const closeRequestModal = () => {
    setShowRequestModal(false);
    setRequestState({
      customerName: "",
      customerEmail: "",
      description: "",
      paymentDate: today(),
      billingType: "one_time",
      billingInterval: "monthly",
    });
    setProductLines(createInitialProductLines());
    setRequestResult(null);
  };

  const updateLine = (id: string, patch: Partial<ProductLine>) => {
    setProductLines((prev) => prev.map((line) => (line.id === id ? { ...line, ...patch } : line)));
  };

  const handleProductSelect = (line: ProductLine, productId: string) => {
    if (productId === "custom") {
      updateLine(line.id, { productId: undefined, name: "", price: 0 });
      return;
    }
    const product = presetProducts.find((p) => p.id === productId);
    if (product) {
      updateLine(line.id, { productId, name: product.name, price: product.price });
    }
  };

  const formatCurrency = (value: number) => `£${value.toLocaleString("en-GB", { minimumFractionDigits: 0 })}`;

  return (
    <div className="space-y-2 md:space-y-3 lg:space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xl md:text-2xl font-semibold truncate" style={{ color: "var(--foreground)" }}>
          Payments
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button 
            variant="secondary" 
            onClick={() => setShowBacsSetupModal(true)}
            className="w-full sm:w-auto min-h-[44px] md:min-h-0 text-sm"
          >
            <Building2 size={14} className="mr-2" />
            <span className="hidden sm:inline">Setup BACS Direct Debit</span>
            <span className="sm:hidden">Setup BACS</span>
          </Button>
          <Button 
            onClick={openRequestModal}
            className="w-full sm:w-auto min-h-[44px] md:min-h-0 text-sm"
          >
            Request Payment
          </Button>
        </div>
      </div>

      {(error || source === "fallback") && (
        <div
          className="flex items-start gap-2 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2.5 text-xs"
          style={{ color: "color-mix(in oklab, var(--foreground), transparent 30%)" }}
        >
          <AlertCircle size={14} className="text-amber-300 flex-shrink-0 mt-0.5" />
          <span className="break-words">
              {error
              ? error
              : "FastPayDirect API is offline. Showing live mock data so your dashboards stay rich."}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-lg border border-white/10 p-3 md:p-4 text-sm" style={{ background: "color-mix(in oklab, var(--panel), transparent 82%)" }}>
          <div className="flex items-center justify-between text-xs uppercase tracking-wide" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
            <span className="truncate pr-2">{isSalesUser ? "Account Produced Revenue" : "Total Collected"}</span>
            <CreditCard size={14} className="brand-text flex-shrink-0" />
          </div>
          <div className="mt-2 text-lg md:text-xl font-semibold" style={{ color: "var(--foreground)" }}>
            {formatCurrency(totalCollected)}
          </div>
          <p className="mt-1 text-[11px] leading-relaxed" style={{ color: "color-mix(in oklab, var(--foreground), transparent 60%)" }}>
            {isSalesUser 
              ? "Your payment requests and closed sales leads revenue."
              : "Includes paid invoices recorded in FastPayDirect or mock data."}
          </p>
        </div>
        <div className="rounded-lg border border-white/10 p-3 md:p-4 text-sm" style={{ background: "color-mix(in oklab, var(--panel), transparent 82%)" }}>
          <div className="flex items-center justify-between text-xs uppercase tracking-wide" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
            <span className="truncate pr-2">Outstanding</span>
            <Clock3 size={14} className="text-amber-300 flex-shrink-0" />
          </div>
          <div className="mt-2 text-lg md:text-xl font-semibold" style={{ color: "var(--foreground)" }}>
            {formatCurrency(outstandingValue)}
          </div>
          <p className="mt-1 text-[11px] leading-relaxed" style={{ color: "color-mix(in oklab, var(--foreground), transparent 60%)" }}>
            {outstandingCount ? `${outstandingCount} invoice${outstandingCount > 1 ? "s" : ""} awaiting collection` : "All caught up"}
          </p>
        </div>
        <div className="rounded-lg border border-white/10 p-3 md:p-4 text-sm" style={{ background: "color-mix(in oklab, var(--panel), transparent 82%)" }}>
          <div className="flex items-center justify-between text-xs uppercase tracking-wide" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
            <span className="truncate pr-2">Recurring</span>
            <Repeat2 size={14} className="text-sky-300 flex-shrink-0" />
          </div>
          <div className="mt-2 text-lg md:text-xl font-semibold" style={{ color: "var(--foreground)" }}>
            {formatCurrency(recurringTotal)}
          </div>
          <p className="mt-1 text-[11px] leading-relaxed" style={{ color: "color-mix(in oklab, var(--foreground), transparent 60%)" }}>
            {activeSubscriptions} active plan{activeSubscriptions === 1 ? "" : "s"} previewed
          </p>
        </div>
        <div className="rounded-lg border border-white/10 p-3 md:p-4 text-sm" style={{ background: "color-mix(in oklab, var(--panel), transparent 82%)" }}>
          <div className="flex items-center justify-between text-xs uppercase tracking-wide" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
            <span className="truncate pr-2">Collected Rate</span>
            <BadgeCheck size={14} className="text-emerald-300 flex-shrink-0" />
          </div>
          <div className="mt-2 text-lg md:text-xl font-semibold" style={{ color: "var(--foreground)" }}>
            {collectedRate}%
          </div>
          <p className="mt-1 text-[11px] leading-relaxed" style={{ color: "color-mix(in oklab, var(--foreground), transparent 60%)" }}>
            Target 95% to keep cash flow predictable
          </p>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-lg border border-white/10 p-3 md:p-4" style={{ background: "color-mix(in oklab, var(--panel), transparent 85%)" }}>
          <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-wide" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
            <span className="truncate pr-2">Collections Snapshot</span>
            <Wallet size={14} className="brand-text flex-shrink-0" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 55%)" }}>
            <div>
              <div className="text-[10px] md:text-[11px] uppercase tracking-wide">Settled last 7 days</div>
              <div className="mt-1 text-base md:text-lg font-semibold" style={{ color: "var(--foreground)" }}>
                {formatCurrency(Math.round(totalCollected * 0.18))}
              </div>
            </div>
            <div>
              <div className="text-[10px] md:text-[11px] uppercase tracking-wide">Refunds processed</div>
              <div className="mt-1 text-base md:text-lg font-semibold text-rose-300">
                -{formatCurrency(Math.min(120, Math.round(totalCollected * 0.04)))}
              </div>
            </div>
            <div>
              <div className="text-[10px] md:text-[11px] uppercase tracking-wide">Avg ticket size</div>
              <div className="mt-1 text-base md:text-lg font-semibold" style={{ color: "var(--foreground)" }}>
                {invoices.length ? formatCurrency(Math.round(totalCollected / Math.max(1, invoices.length))) : "£0"}
              </div>
          </div>
          </div>
        </div>
        <div className="rounded-lg border border-white/10 p-3 md:p-4" style={{ background: "color-mix(in oklab, var(--panel), transparent 85%)" }}>
          <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-wide" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
            <span className="truncate pr-2">Method Mix (est.)</span>
            <PieChart size={14} className="text-sky-300 flex-shrink-0" />
          </div>
          <div className="space-y-1.5 md:space-y-1 text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 55%)" }}>
            <div className="flex items-center justify-between">
              <span>Card</span>
              <span className="font-semibold">68%</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Bank transfer</span>
              <span className="font-semibold">21%</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Other</span>
              <span className="font-semibold">11%</span>
          </div>
            <button className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-teal-300 hover:text-teal-100 min-h-[32px] md:min-h-0">
              <span className="hidden sm:inline">View breakdown report</span>
              <span className="sm:hidden">View report</span>
            </button>
          </div>
        </div>
        {actionShortcuts.length > 0 && (
          <div className="rounded-lg border border-white/10 p-3 md:p-4 lg:col-span-2" style={{ background: "color-mix(in oklab, var(--panel), transparent 85%)" }}>
            <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-wide" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
              <span>Quick Actions</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-1 md:grid-cols-3 md:divide-x md:divide-white/5">
              {actionShortcuts.map(({ id, icon: Icon, title, description, badge, action }) => (
                <button
                  key={id}
                  type="button"
                  className="action-tile justify-between md:flex-col md:items-start md:text-left md:gap-3"
                  onClick={action}
                >
                  <span className="flex items-center gap-3 text-left">
                    <span className="action-tile__icon">
                      <Icon size={16} />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                        {title}
                      </span>
                      <span className="mt-0.5 block text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
                        {description}
                      </span>
                    </span>
                  </span>
                  {badge ? (
                    <span className="action-tile__badge md:self-end">{badge}</span>
                  ) : (
                    <span className="action-tile__chevron md:self-end">
                      <ArrowRight size={14} />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {activeMandates.length > 0 && (
        <div
          className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-2.5 text-xs leading-relaxed"
          style={{ color: "color-mix(in oklab, var(--foreground), transparent 15%)" }}
        >
          <span className="hidden sm:inline">
            You have{" "}
            <span className="font-semibold">{activeMandates.length}</span> active BACS Direct Debit
            mandate{activeMandates.length === 1 ? "" : "s"}. Customers with an active mandate are marked in the
            list below so you know who can be charged directly.
          </span>
          <span className="sm:hidden">
            <span className="font-semibold">{activeMandates.length}</span> active BACS mandate{activeMandates.length === 1 ? "" : "s"}.
          </span>
        </div>
      )}

      <div className="overflow-hidden rounded-lg ring-1 app-ring">
        <div className="table-wrapper -mx-3 md:mx-0 px-3 md:px-0">
          <table className="min-w-full text-sm">
          <thead style={{ background: "var(--panel)" }}>
            <tr>
              <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm">Invoice</th>
              <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm">Customer</th>
              <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm">Amount</th>
              <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm table-mobile-hidden">Status</th>
              <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm table-mobile-hidden">Due Date</th>
              <th className="px-3 md:px-4 py-2 md:py-3 text-right text-xs md:text-sm">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-3 md:px-4 py-4 md:py-6 text-center text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 40%)" }}>
                  Loading latest invoices…
                </td>
              </tr>
            ) : invoices.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 md:px-4 py-4 md:py-6 text-center text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 40%)" }}>
                  <span className="hidden sm:inline">No invoices yet. Create your first payment request to populate this table.</span>
                  <span className="sm:hidden">No invoices yet.</span>
                </td>
              </tr>
            ) : (
              invoices.map((inv) => {
                const status = formatInvoiceStatus(inv.status);
                const hasBacsMandate =
                  !!inv.customerEmail && bacsByEmail.get(inv.customerEmail.toLowerCase());
                return (
              <tr key={inv.id} className="border-t app-ring">
                    <td className="px-3 md:px-4 py-2 md:py-3 font-medium text-xs md:text-sm">{inv.invoiceNumber ?? inv.id.toUpperCase()}</td>
                    <td className="px-3 md:px-4 py-2 md:py-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs md:text-sm font-medium">{inv.customerName}</span>
                        {hasBacsMandate && (
                          <span className="inline-flex w-fit items-center gap-1 rounded-full bg-emerald-500/10 px-1.5 md:px-2 py-0.5 text-[9px] md:text-[10px] font-medium text-emerald-200 ring-1 ring-emerald-500/40">
                            BACS active
                          </span>
                        )}
                        {/* Show status on mobile instead of separate column */}
                        <span className={`md:hidden inline-flex w-fit rounded-full px-2 py-0.5 text-[9px] ring-1 ${status.className}`}>
                          {status.label}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm font-semibold">{formatCurrency(inv.amount)}</td>
                <td className="px-3 md:px-4 py-2 md:py-3 table-mobile-hidden">
                      <span className={`rounded-full px-2 py-1 text-xs ring-1 ${status.className}`}>{status.label}</span>
                </td>
                <td className="px-3 md:px-4 py-2 md:py-3 table-mobile-hidden text-xs md:text-sm" style={{ color: "color-mix(in oklab, var(--foreground), transparent 30%)" }}>
                      {inv.dueDate ? new Date(inv.dueDate * 1000).toLocaleDateString("en-GB") : "—"}
                </td>
                <td className="px-3 md:px-4 py-2 md:py-3 text-right">
                      <button 
                        onClick={() => router.push(`/invoices/${inv.id}`)} 
                        className="rounded-md px-2 py-1 text-[10px] md:text-xs ring-1 app-ring hover:opacity-90 min-h-[32px] md:min-h-0"
                      >
                        View
                      </button>
                </td>
              </tr>
                );
              })
            )}
          </tbody>
        </table>
        </div>
      </div>

      <Modal open={!!selectedInvoice} onClose={() => setSelectedInvoice(null)} title="Invoice Details">
        {selectedInvoice && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs font-medium" style={{ color: "color-mix(in oklab, var(--foreground), transparent 30%)" }}>
                  Invoice Number
                </p>
                <p className="mt-1 font-semibold" style={{ color: "var(--foreground)" }}>
                  {selectedInvoice.invoiceNumber ?? selectedInvoice.id.toUpperCase()}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium" style={{ color: "color-mix(in oklab, var(--foreground), transparent 30%)" }}>
                  Status
                </p>
                <div className="mt-1">
                  <span className={`rounded-full px-2 py-1 text-xs ring-1 ${formatInvoiceStatus(selectedInvoice.status).className}`}>
                    {formatInvoiceStatus(selectedInvoice.status).label}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium" style={{ color: "color-mix(in oklab, var(--foreground), transparent 30%)" }}>
                  Customer
                </p>
                <p className="mt-1" style={{ color: "var(--foreground)" }}>
                  {selectedInvoice.customerName}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium" style={{ color: "color-mix(in oklab, var(--foreground), transparent 30%)" }}>
                  Due date
                </p>
                <p className="mt-1" style={{ color: "var(--foreground)" }}>
                  {selectedInvoice.dueDate ? new Date(selectedInvoice.dueDate * 1000).toLocaleDateString("en-GB") : "Not set"}
                </p>
              </div>
            </div>

            <div className="border-t app-ring pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                  Total amount
                </span>
                <span className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>
                  {formatCurrency(selectedInvoice.amount)}
                </span>
              </div>
              <div className="mt-4 flex gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    router.push(`/invoices/${selectedInvoice.id}`);
                    setSelectedInvoice(null);
                  }}
                >
                  View Full Invoice
                </Button>
                {selectedInvoice.hostedInvoiceUrl && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => window.open(selectedInvoice.hostedInvoiceUrl!, "_blank")}
                  >
                    <ExternalLink size={14} className="mr-1" />
                    Payment Link
                  </Button>
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="secondary"
                className="flex-1 inline-flex items-center justify-center gap-2"
                onClick={() => {
                  alert(`Downloading invoice ${selectedInvoice.invoiceNumber ?? selectedInvoice.id} as PDF…`);
                }}
              >
                <Download size={14} />
                Download PDF
              </Button>
              <Button
                variant="secondary"
                className="flex-1 inline-flex items-center justify-center gap-2"
                onClick={async () => {
                  const email = selectedInvoice.customerEmail ?? fallbackEmail(selectedInvoice.customerName);
                  const success = await sendInvoiceEmail({
                    invoiceId: selectedInvoice.id,
                    customerEmail: email,
                    subject: `Invoice ${selectedInvoice.invoiceNumber ?? selectedInvoice.id}`,
                  });
                  alert(
                    success
                      ? `Invoice ${selectedInvoice.invoiceNumber ?? selectedInvoice.id} queued for delivery to ${email}.`
                      : "Failed to send invoice. Please try again later."
                  );
                }}
              >
                <Mail size={14} />
                Send Email
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={showRequestModal} onClose={closeRequestModal} title="Request Payment">
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setRequestResult(null);
            try {
              const result = await createPaymentRequest({
                customerName: requestState.customerName,
                customerEmail: requestState.customerEmail,
                description: requestState.description,
                paymentDate: requestState.paymentDate,
                billingType: requestState.billingType,
                billingInterval: requestState.billingType === "recurring" ? requestState.billingInterval : undefined,
                items: productLines,
              });
              setRequestResult({
                link: result.link,
                amount: result.amount,
                items: result.items,
                paymentDate: result.paymentDate ?? null,
                billingType: result.billingType,
                billingInterval: result.billingInterval ?? null,
              });

              recordEvent({
                category: "payments",
                action: "payment_request_created",
                summary: `Created payment request for £${result.amount.toFixed(2)}`,
                meta: {
                  customerName: requestState.customerName,
                  customerEmail: requestState.customerEmail,
                  billingType: result.billingType,
                  billingInterval: result.billingInterval,
                  items: result.items.map((item) => ({
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity,
                  })),
                },
              });
            } catch (err) {
              const message = err instanceof Error ? err.message : "Failed to create payment request";
              alert(message);
            }
          }}
          className="space-y-3"
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: "var(--foreground)" }}>
                Customer name
              </label>
              <input
                required
                type="text"
                className="w-full rounded-md bg-transparent px-3 py-2 ring-1 app-ring focus:outline-none focus:ring-2"
                value={requestState.customerName}
                onChange={(e) => setRequestState({ ...requestState, customerName: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: "var(--foreground)" }}>
                Customer email
              </label>
              <input
                type="email"
                className="w-full rounded-md bg-transparent px-3 py-2 ring-1 app-ring focus:outline-none focus:ring-2"
                value={requestState.customerEmail}
                onChange={(e) => setRequestState({ ...requestState, customerEmail: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: "var(--foreground)" }}>
                Payment date
              </label>
              <input
                type="date"
                className="w-full rounded-md bg-transparent px-3 py-2 text-sm ring-1 app-ring focus:outline-none focus:ring-2"
                value={requestState.paymentDate}
                onChange={(e) => setRequestState({ ...requestState, paymentDate: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: "var(--foreground)" }}>
                Billing type
              </label>
              <Select
                options={billingTypeOptions}
                value={requestState.billingType}
                onChange={(value) =>
                  setRequestState({
                    ...requestState,
                    billingType: value as "one_time" | "recurring",
                  })
                }
              />
            </div>
            {requestState.billingType === "recurring" && (
              <div>
                <label className="mb-1 block text-xs font-medium" style={{ color: "var(--foreground)" }}>
                  Billing interval
                </label>
                <Select
                  options={billingIntervalOptions}
                  value={requestState.billingInterval}
                  onChange={(value) =>
                    setRequestState({
                      ...requestState,
                      billingInterval: value as "weekly" | "monthly" | "quarterly" | "yearly",
                    })
                  }
                />
              </div>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium" style={{ color: "var(--foreground)" }}>
              Description / notes
            </label>
            <textarea
              rows={2}
              className="w-full rounded-md bg-transparent px-3 py-2 text-xs ring-1 app-ring focus:outline-none focus:ring-2"
              value={requestState.description}
              onChange={(e) => setRequestState({ ...requestState, description: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "color-mix(in oklab, var(--foreground), transparent 35%)" }}>
                Products
              </span>
              <button
                type="button"
                onClick={() =>
                  setProductLines((prev) => [
                    ...prev,
                    {
                      id: `line-${Date.now()}`,
                      productId: presetProducts[0]?.id,
                      name: presetProducts[0]?.name || "",
                      price: presetProducts[0]?.price || 0,
                      quantity: 1,
                    },
                  ])
                }
                className="inline-flex items-center gap-1 text-xs text-teal-400 hover:text-teal-200"
              >
                <Plus size={12} /> Add product
              </button>
            </div>

            <div className="space-y-2">
              {productLines.map((line) => (
                <div
                  key={line.id}
                  className="rounded-lg bg-zinc-900/40 p-3 ring-1 app-ring"
                  style={{ background: "color-mix(in oklab, var(--panel), transparent 15%)" }}
                >
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-6 md:items-end">
                    <div className="md:col-span-2">
                      <label className="mb-1 block text-[11px] font-medium" style={{ color: "color-mix(in oklab, var(--foreground), transparent 30%)" }}>
                        Product
                      </label>
                      <Select
                        options={productOptions}
                        value={line.productId ?? "custom"}
                        onChange={(value) => handleProductSelect(line, value)}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-1 block text-[11px] font-medium" style={{ color: "color-mix(in oklab, var(--foreground), transparent 30%)" }}>
                        Name
                      </label>
                      <input
                        type="text"
                        value={line.name}
                        onChange={(e) => updateLine(line.id, { name: e.target.value })}
                        className="w-full rounded-md bg-transparent px-3 py-2 text-sm ring-1 app-ring focus:outline-none focus:ring-2"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium" style={{ color: "color-mix(in oklab, var(--foreground), transparent 30%)" }}>
                        Price
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.price}
                        onChange={(e) => updateLine(line.id, { price: parseFloat(e.target.value || "0") })}
                        className="w-full rounded-md bg-transparent px-3 py-2 text-sm ring-1 app-ring focus:outline-none focus:ring-2"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium" style={{ color: "color-mix(in oklab, var(--foreground), transparent 30%)" }}>
                        Qty
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={line.quantity}
                        onChange={(e) => updateLine(line.id, { quantity: Math.max(1, parseInt(e.target.value || "1", 10)) })}
                        className="w-full rounded-md bg-transparent px-3 py-2 text-sm ring-1 app-ring focus:outline-none focus:ring-2"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2 md:col-span-1">
                      <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                        £{(line.price * line.quantity).toFixed(2)}
                      </span>
                      {productLines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setProductLines((prev) => prev.filter((pl) => pl.id !== line.id))}
                          className="rounded-md p-2 text-xs text-rose-300 hover:text-rose-200"
                          title="Remove line"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  {line.productId && (
                    <p className="mt-2 text-[11px]" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
                      {presetProducts.find((p) => p.id === line.productId)?.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-zinc-900/40 px-3 py-2 ring-1 app-ring" style={{ background: "color-mix(in oklab, var(--panel), transparent 20%)" }}>
            <span className="text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 30%)" }}>
              Total amount
            </span>
            <span className="text-base font-semibold" style={{ color: "var(--foreground)" }}>
              £{totalAmount.toFixed(2)}
            </span>
          </div>

          {requestResult && (
            <div className="space-y-2">
              <div className="rounded-md bg-zinc-900/60 p-3 text-xs ring-1 app-ring" style={{ color: "var(--foreground)" }}>
                Payment link: {" "}
                <a href={requestResult.link} className="underline" target="_blank" rel="noreferrer">
                  {requestResult.link}
                </a>
              </div>
              <div className="rounded-md bg-zinc-900/40 p-3 text-xs ring-1 app-ring" style={{ color: "color-mix(in oklab, var(--foreground), transparent 35%)" }}>
                <div>
                  Total: {" "}
                  <span className="font-semibold" style={{ color: "var(--foreground)" }}>
                    £{requestResult.amount.toFixed(2)}
                  </span>
                </div>
                <div className="mt-1">
                  Billing: {" "}
                  {requestResult.billingType === "recurring"
                    ? `Recurring (${requestResult.billingInterval ?? "monthly"})`
                    : "One-time"}
                </div>
                {requestResult.paymentDate && (
                  <div className="mt-1">
                    First charge: {new Date(requestResult.paymentDate).toLocaleDateString("en-GB")}
                  </div>
                )}
                <ul className="mt-2 space-y-1">
                  {requestResult.items.map((item) => (
                    <li key={item.id}>
                      {item.name} × {item.quantity} — £{(item.price * item.quantity).toFixed(2)}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={() => navigator.clipboard.writeText(requestResult.link)} className="flex-1">
                  Copy link
                </Button>
                <Button type="button" variant="primary" onClick={() => window.open(requestResult.link, "_blank")} className="flex-1">
                  Open link
                </Button>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={closeRequestModal} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="flex-1" disabled={!requestState.customerName || totalAmount <= 0}>
              Create request
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={showPayoutRulesModal} onClose={() => setShowPayoutRulesModal(false)} title="Payout Rules">
        <form
          className="space-y-4 text-sm"
          onSubmit={(event) => {
            event.preventDefault();
            updatePayoutRules({
              threshold: payoutRules.threshold,
              schedule: payoutRules.schedule,
              autoDisburse: payoutRules.autoDisburse,
              notifyAt: payoutRules.notifyAt,
              destinations: payoutRules.destinations,
            });
            alert("Payout rules updated. Changes go live next cycle.");
            setShowPayoutRulesModal(false);
          }}
        >
          <div>
            <label className="mb-1 block text-xs font-medium" style={{ color: "var(--foreground)" }}>
              Minimum balance before disbursing (£)
            </label>
            <input
              type="number"
              min={0}
              className="w-full rounded-md bg-transparent px-3 py-2 ring-1 app-ring focus:outline-none focus:ring-2"
              value={payoutRules.threshold}
              onChange={(e) => setPayoutRules((prev) => ({ ...prev, threshold: parseFloat(e.target.value || "0") }))}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: "var(--foreground)" }}>
                Disbursement cadence
              </label>
              <Select
                options={[
                  { value: "daily", label: "Daily" },
                  { value: "weekly", label: "Weekly (Friday)" },
                  { value: "biweekly", label: "Bi-weekly" },
                  { value: "monthly", label: "Monthly (Last business day)" },
                ]}
                value={payoutRules.schedule}
                onChange={(value) => setPayoutRules((prev) => ({ ...prev, schedule: value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: "var(--foreground)" }}>
                Notify finance team at % of threshold
              </label>
              <input
                type="number"
                min={10}
                max={100}
                className="w-full rounded-md bg-transparent px-3 py-2 ring-1 app-ring focus:outline-none focus:ring-2"
                value={payoutRules.notifyAt}
                onChange={(e) => setPayoutRules((prev) => ({ ...prev, notifyAt: parseInt(e.target.value || "0", 10) }))}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2" style={{ color: "color-mix(in oklab, var(--foreground), transparent 25%)" }}>
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                Auto-disburse when conditions are met
              </p>
              <p className="text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
                Disable to hold payouts for manual approval.
              </p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={payoutRules.autoDisburse}
                onChange={(e) => setPayoutRules((prev) => ({ ...prev, autoDisburse: e.target.checked }))}
              />
              <div className="peer h-6 w-11 rounded-full bg-zinc-700 ring-1 ring-zinc-600 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-zinc-300 after:bg-white after:transition-all peer-checked:bg-teal-600 peer-checked:after:translate-x-full peer-checked:after:border-white" />
            </label>
          </div>

          <div className="space-y-3 rounded-lg bg-white/5 p-3" style={{ color: "color-mix(in oklab, var(--foreground), transparent 35%)" }}>
            <div>
              <p className="text-xs uppercase tracking-wide" style={{ color: "color-mix(in oklab, var(--foreground), transparent 55%)" }}>
                Primary destination
              </p>
              <p className="mt-1 text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                {payoutRules.destinations.primary}
              </p>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-wide" style={{ color: "color-mix(in oklab, var(--foreground), transparent 55%)" }}>
                  Secondary routing
                </p>
                <p
                  className="text-sm"
                  style={{
                    color: payoutRules.destinations.secondaryEnabled
                      ? "var(--foreground)"
                      : "color-mix(in oklab, var(--foreground), transparent 55%)",
                  }}
                >
                  {payoutRules.destinations.secondary}
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={payoutRules.destinations.secondaryEnabled}
                  onChange={(e) =>
                    setPayoutRules((prev) => ({
                      ...prev,
                      destinations: { ...prev.destinations, secondaryEnabled: e.target.checked },
                    }))
                  }
                />
                <div className="peer h-6 w-11 rounded-full bg-zinc-700 ring-1 ring-zinc-600 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-zinc-300 after:bg-white after:transition-all peer-checked:bg-teal-600 peer-checked:after:translate-x-full peer-checked:after:border-white" />
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setShowPayoutRulesModal(false)}>
              Cancel
            </Button>
            <Button type="submit">Save payout rules</Button>
          </div>
        </form>
      </Modal>

      <BacsSetupModal
        open={showBacsSetupModal}
        onClose={() => setShowBacsSetupModal(false)}
        onSuccess={(mandateId) => {
          setShowBacsSetupModal(false);
          // Optionally show success message or refresh data
        }}
      />

      {activeMandates.length > 0 && (
        <div className="rounded-lg border border-white/10 p-3 md:p-4" style={{ background: "color-mix(in oklab, var(--panel), transparent 85%)" }}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Building2 size={14} className="md:w-4 md:h-4 brand-text flex-shrink-0" />
              <span className="text-xs md:text-sm font-semibold truncate" style={{ color: "var(--foreground)" }}>
                <span className="hidden sm:inline">Active BACS Direct Debit Mandates</span>
                <span className="sm:hidden">BACS Mandates</span>
              </span>
            </div>
            <span className="text-xs flex-shrink-0" style={{ color: "color-mix(in oklab, var(--foreground), transparent 40%)" }}>
              {activeMandates.length} active
            </span>
          </div>
          <div className="space-y-2">
            {activeMandates.map((mandate) => (
              <div
                key={mandate.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-md bg-zinc-900/40 p-3 ring-1 app-ring"
                style={{ background: "color-mix(in oklab, var(--panel), transparent 15%)" }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs md:text-sm font-medium truncate" style={{ color: "var(--foreground)" }}>
                      {mandate.customerName}
                    </span>
                    <span className="text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30 flex-shrink-0">
                      Active
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] md:text-xs break-words" style={{ color: "color-mix(in oklab, var(--foreground), transparent 40%)" }}>
                    <span className="break-all">{mandate.customerEmail}</span>
                    <span className="hidden sm:inline"> • </span>
                    <span className="block sm:inline">Ref: {mandate.reference}</span>
                  </div>
                  <div className="mt-1 text-[10px] md:text-xs font-mono" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>
                    <span className="hidden sm:inline">Sort Code: {mandate.sortCode} • </span>
                    <span>Account: ••••{mandate.accountNumber.slice(-4)}</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    if (confirm(`Are you sure you want to cancel the BACS mandate for ${mandate.customerName}?`)) {
                      try {
                        await cancelMandate(mandate.id);
                      } catch (err) {
                        alert(err instanceof Error ? err.message : "Failed to cancel mandate");
                      }
                    }
                  }}
                  className="min-h-[36px] md:min-h-0 w-full sm:w-auto"
                >
                  <Trash2 size={14} />
                  <span className="sm:hidden ml-2">Cancel</span>
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

