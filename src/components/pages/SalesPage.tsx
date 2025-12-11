"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  TrendingUp, 
  TrendingDown, 
  Download, 
  Upload,
  Filter,
  ArrowUpDown,
  BarChart3,
  DollarSign,
  Target,
  Package,
  ArrowRight,
  Plus,
  Edit,
  Trash2,
  X,
  Phone,
  Building2,
  CheckCircle,
  Calendar,
  XCircle
} from "lucide-react";
import { usePayments } from "@/hooks/usePayments";
import { useContactDirectory } from "@/hooks/useContactDirectory";
import { useSalesLeads } from "@/hooks/useSalesLeads";
import { useSalesMetrics } from "@/hooks/useSalesMetrics";
import { useToast } from "@/context/ToastContext";
import { useEventLog } from "@/context/EventLogContext";
import { Button } from "../Button";
import { Modal } from "../Modal";
import { Select, type SelectOption } from "../Select";
import { SalesSummaryCards } from "./sales/SalesSummaryCards";
import { SalesTable } from "./sales/SalesTable";
import { formatCurrency } from "@/lib/utils/format";
import type { StripeInvoice } from "@/lib/stripe-types";
import type { Contact } from "@/data/contacts";
import type { SalesLead, IndustryMetrics, LeadStatus, SortField, SortDirection } from "@/types/sales";

// Common industries
const COMMON_INDUSTRIES = [
  "Plumbing",
  "Electrical",
  "HVAC",
  "Heating & Cooling",
  "Roofing",
  "Carpentry",
  "Painting",
  "Flooring",
  "Bathroom Renovation",
  "Kitchen Renovation",
  "General Maintenance",
  "Emergency Repair",
  "Inspection",
  "Installation",
  "Landscaping",
  "Tiling",
  "Handyman",
  "General Contractor",
  "Plastering",
  "Glazing",
  "Locksmith",
  "Appliance Repair",
  "Drainage",
  "Guttering",
];

const CUSTOM_INDUSTRIES_KEY = "revive-custom-industries";

function loadCustomIndustries(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_INDUSTRIES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Remove duplicates (case-insensitive) from loaded data
    const seen = new Set<string>();
    const unique: string[] = [];
    for (const industry of parsed) {
      const lower = industry.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        unique.push(industry);
      }
    }
    return unique;
  } catch {
    return [];
  }
}

function saveCustomIndustry(industry: string) {
  if (typeof window === "undefined") return;
  if (!industry.trim()) return;
  const normalized = industry.trim();
  // Check if it's already in common industries (case-insensitive)
  const isCommon = COMMON_INDUSTRIES.some(
    (common) => common.toLowerCase() === normalized.toLowerCase()
  );
  if (isCommon) return; // Don't save if it's already a common industry
  
  try {
    const existing = loadCustomIndustries();
    // Check if it's already in custom industries (case-insensitive)
    const alreadyExists = existing.some(
      (custom) => custom.toLowerCase() === normalized.toLowerCase()
    );
    if (!alreadyExists) {
      const updated = [...existing, normalized];
      window.localStorage.setItem(CUSTOM_INDUSTRIES_KEY, JSON.stringify(updated));
    }
  } catch {
    // ignore storage errors
  }
}

const formatPhone = (phone: string) => {
  // Basic phone formatting
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 11 && cleaned.startsWith("0")) {
    return `${cleaned.slice(0, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`;
  }
  return phone;
};

export function SalesPage() {
  const router = useRouter();
  const { invoices, loading } = usePayments();
  const { addContact } = useContactDirectory();
  const { showToast } = useToast();
  const { recordEvent } = useEventLog();
  const { leads, addLead, updateLead, deleteLead, setLeads } = useSalesLeads();
  const [sortField, setSortField] = useState<SortField | "industry">("industry");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [filterIndustry, setFilterIndustry] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<LeadStatus | "">("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingLead, setEditingLead] = useState<SalesLead | null>(null);
  const [showClosingModal, setShowClosingModal] = useState(false);
  const [closingLead, setClosingLead] = useState<SalesLead | null>(null);
  const [customIndustries, setCustomIndustries] = useState<string[]>(() => loadCustomIndustries());
  
  // Use the metrics hook
  const allLeads = useMemo(() => {
    // Combine manual leads with invoice-derived leads
    const invoiceLeads: SalesLead[] = invoices
      .filter((inv) => inv.status === "paid" && inv.description)
      .map((inv) => {
        const industryMatch = inv.description?.match(/\b(Plumbing|Electrical|HVAC|Roofing|Carpentry|Painting|Flooring|Tiling|Handyman|General Contractor|Plastering|Glazing|Locksmith|Appliance Repair|Drainage|Guttering|Bathroom Renovation|Kitchen Renovation|General Maintenance|Emergency Repair|Inspection|Installation|Landscaping|Heating & Cooling)\b/i);
        const industry = industryMatch ? industryMatch[1] : "Other";
        return {
          id: `invoice-${inv.id}`,
          businessName: inv.customerName || "Unknown",
          industry,
          phoneNumber: "",
          currentPrice: 0,
          status: "Closed" as LeadStatus,
          priceSoldAt: inv.amount,
          closedDate: inv.created,
          createdAt: inv.created || Date.now(),
          updatedAt: inv.created || Date.now(),
        };
      });
    return [...leads, ...invoiceLeads];
  }, [leads, invoices]);
  
  const industryMetrics = useSalesMetrics(allLeads);
  const [formData, setFormData] = useState({
    businessName: "",
    industry: "",
    phoneNumber: "",
    currentPrice: 0,
    status: "Appointment Booked" as LeadStatus,
    source: "",
    salesRep: "",
    location: "",
    companySize: "",
    notes: "",
  });
  const [closingData, setClosingData] = useState({
    priceSoldAt: 0,
    upsellAmount: 0,
    upsellDescription: "",
    discount: 0,
    winReason: "",
    lossReason: "",
    followUpCount: 0,
    responseTime: 0,
    meetingDuration: 0,
    appointmentDate: 0,
    quoteSentDate: 0,
    quoteAcceptedDate: 0,
    isRepeatCustomer: false,
  });
  const [useCustomIndustry, setUseCustomIndustry] = useState(false);

  // Sync is handled by useSalesLeads hook

  // Combine common industries with custom industries
  const allIndustries = useMemo(() => {
    const combined = [...COMMON_INDUSTRIES, ...customIndustries];
    // Remove duplicates (case-insensitive) and sort
    const seen = new Set<string>();
    const unique: string[] = [];
    for (const industry of combined) {
      const lower = industry.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        unique.push(industry);
      }
    }
    return unique.sort();
  }, [customIndustries]);

  const industryOptions: SelectOption[] = [
    { value: "", label: "Select an industry..." },
    ...allIndustries.map((industry) => ({ value: industry, label: industry })),
    { value: "__custom__", label: "Custom industry..." },
  ];

  const statusOptions: SelectOption[] = [
    { value: "Appointment Booked", label: "Appointment Booked" },
    { value: "Closed", label: "Closed" },
    { value: "Not Interested", label: "Not Interested" },
  ];

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const matchesIndustry = filterIndustry === "" || lead.industry.toLowerCase().includes(filterIndustry.toLowerCase());
      const matchesStatus = filterStatus === "" || lead.status === filterStatus;
      return matchesIndustry && matchesStatus;
    });
  }, [leads, filterIndustry, filterStatus]);

  const sortedLeads = useMemo(() => {
    const sorted = [...filteredLeads].sort((a, b) => {
      let aVal: any = a[sortField as keyof SalesLead];
      let bVal: any = b[sortField as keyof SalesLead];
      
      if (sortField === "calculatedRevenue") {
        aVal = a.status === "Closed" ? (a.priceSoldAt || 0) + (a.upsellAmount || 0) : 0;
        bVal = b.status === "Closed" ? (b.priceSoldAt || 0) + (b.upsellAmount || 0) : 0;
      }
      
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }
      
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDirection === "asc" 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      
      return 0;
    });
    return sorted;
  }, [filteredLeads, sortField, sortDirection]);

  // Industry metrics are calculated by useSalesMetrics hook above
  
  // Sort metrics
  const sortedMetrics = useMemo(() => {
    const sorted = [...industryMetrics].sort((a, b) => {
      if (sortField === "industry") {
        return sortDirection === "asc" 
          ? a.industry.localeCompare(b.industry)
          : b.industry.localeCompare(a.industry);
      }
      const aVal = a[sortField as keyof IndustryMetrics] as number;
      const bVal = b[sortField as keyof IndustryMetrics] as number;
      return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
    });
    return sorted;
  }, [industryMetrics, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const handleAddLead = () => {
    setEditingLead(null);
    setFormData({
      businessName: "",
      industry: "",
      phoneNumber: "",
      currentPrice: 0,
      status: "Appointment Booked",
      source: "",
      salesRep: "",
      location: "",
      companySize: "",
      notes: "",
    });
    setUseCustomIndustry(false);
    setShowAddModal(true);

    recordEvent({
      category: "workflows",
      action: "lead_add_started",
      summary: "Opened add lead modal",
      meta: {},
    });
  };

  const handleEditLead = (lead: SalesLead) => {
    setEditingLead(lead);
    setFormData({
      businessName: lead.businessName,
      industry: lead.industry,
      phoneNumber: lead.phoneNumber,
      currentPrice: lead.currentPrice,
      status: lead.status,
      source: lead.source || "",
      salesRep: lead.salesRep || "",
      location: lead.location || "",
      companySize: lead.companySize || "",
      notes: lead.notes || "",
    });
    setUseCustomIndustry(!allIndustries.includes(lead.industry));
    setShowAddModal(true);
  };

  const handleAddClosingData = (lead: SalesLead) => {
    setClosingLead(lead);
    setClosingData({
      priceSoldAt: lead.priceSoldAt || lead.currentPrice,
      upsellAmount: lead.upsellAmount || 0,
      upsellDescription: lead.upsellDescription || "",
      discount: lead.discount || 0,
      winReason: lead.winReason || "",
      lossReason: lead.lossReason || "",
      followUpCount: lead.followUpCount || 0,
      responseTime: lead.responseTime || 0,
      meetingDuration: lead.meetingDuration || 0,
      appointmentDate: lead.appointmentDate || 0,
      quoteSentDate: lead.quoteSentDate || 0,
      quoteAcceptedDate: lead.quoteAcceptedDate || 0,
      isRepeatCustomer: lead.isRepeatCustomer || false,
    });
    setShowClosingModal(true);
  };

  const handleDeleteLead = (id: string) => {
    if (confirm("Are you sure you want to delete this lead?")) {
      deleteLead(id);
      showToast("Lead deleted successfully", "success");
    }
  };

  const createContactFromLead = (lead: SalesLead) => {
    // Generate email from business name if not provided
    const email = `${lead.businessName.toLowerCase().replace(/[^a-z0-9]/g, ".")}@example.com`;
    
    // Map status to contact stage
    const stageMap: Record<LeadStatus, string> = {
      "Closed": "Customer",
      "Appointment Booked": "Booked",
      "Not Interested": "Dormant",
    };

    const contact: Contact = {
      id: `contact-${lead.id}`,
      name: lead.businessName,
      email: email,
      phone: lead.phoneNumber,
      stage: stageMap[lead.status] || "New Lead",
      source: "Sales",
      createdAt: new Date(lead.createdAt).toISOString().split("T")[0],
      company: lead.businessName,
      owner: undefined,
    };

    addContact(contact);
  };

  const handleSaveLead = () => {
    if (!formData.businessName.trim()) {
      alert("Please enter a business name");
      return;
    }
    if (!formData.industry.trim()) {
      alert("Please select or enter an industry");
      return;
    }
    if (!formData.phoneNumber.trim()) {
      alert("Please enter a phone number");
      return;
    }

    // Save custom industry if it's not in the common list
    if (!COMMON_INDUSTRIES.some(c => c.toLowerCase() === formData.industry.trim().toLowerCase()) && 
        !customIndustries.some(c => c.toLowerCase() === formData.industry.trim().toLowerCase())) {
      saveCustomIndustry(formData.industry.trim());
      setCustomIndustries((prev) => [...prev, formData.industry.trim()]);
    }

    if (editingLead) {
      updateLead(editingLead.id, {
        businessName: formData.businessName,
        industry: formData.industry,
        phoneNumber: formData.phoneNumber,
        currentPrice: formData.currentPrice,
        status: formData.status,
        source: formData.source,
        salesRep: formData.salesRep,
        location: formData.location,
        companySize: formData.companySize,
        notes: formData.notes,
      });
      setShowAddModal(false);
      setEditingLead(null);
    } else {
      const newLead: SalesLead = {
        id: `lead-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        ...formData,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      addLead(newLead);
      // Automatically create contact from lead
      createContactFromLead(newLead);
      recordEvent({
        category: "workflows",
        action: "lead_created",
        summary: `Created sales lead for ${newLead.businessName}`,
        meta: {
          industry: newLead.industry,
          status: newLead.status,
          currentPrice: newLead.currentPrice,
        },
      });
      
      // If status is "Closed", open closing data modal
      if (formData.status === "Closed") {
        setShowAddModal(false);
        setEditingLead(null);
        // Set up closing data with default values
        setClosingData({
          priceSoldAt: formData.currentPrice || 0,
          upsellAmount: 0,
          upsellDescription: "",
          discount: 0,
          winReason: "",
          lossReason: "",
          followUpCount: 0,
          responseTime: 0,
          meetingDuration: 0,
          appointmentDate: 0,
          quoteSentDate: 0,
          quoteAcceptedDate: 0,
          isRepeatCustomer: false,
        });
        setClosingLead(newLead);
        setShowClosingModal(true);
      } else {
        setShowAddModal(false);
        setEditingLead(null);
      }
    }
  };

  const handleSaveClosingData = () => {
    if (!closingLead) return;
    if (closingData.priceSoldAt <= 0) {
      alert("Please enter a valid sale price");
      return;
    }

    updateLead(closingLead.id, {
      status: "Closed",
      priceSoldAt: closingData.priceSoldAt,
      upsellAmount: closingData.upsellAmount || 0,
      upsellDescription: closingData.upsellDescription || "",
      closedDate: Date.now(),
      discount: closingData.discount,
      winReason: closingData.winReason,
      lossReason: closingData.lossReason,
      followUpCount: closingData.followUpCount,
      responseTime: closingData.responseTime,
      meetingDuration: closingData.meetingDuration,
      appointmentDate: closingData.appointmentDate,
      quoteSentDate: closingData.quoteSentDate,
      quoteAcceptedDate: closingData.quoteAcceptedDate,
      isRepeatCustomer: closingData.isRepeatCustomer,
    });

    recordEvent({
      category: "workflows",
      action: "lead_closed",
      summary: `Marked lead ${closingLead.businessName} as Closed`,
      meta: {
        priceSoldAt: closingData.priceSoldAt,
        upsellAmount: closingData.upsellAmount,
      },
    });

    setShowClosingModal(false);
    setClosingLead(null);
  };

  const exportToCSV = () => {
    const header = "Business Name,Industry,Phone,Current Price,Status,Price Sold At,Upsell Amount,Upsell Description,Closed Date\n";
    const rows = sortedLeads.map((lead) => [
      `"${lead.businessName}"`,
      lead.industry,
      lead.phoneNumber,
      lead.currentPrice.toFixed(2),
      lead.status,
      lead.priceSoldAt?.toFixed(2) || "",
      lead.upsellAmount?.toFixed(2) || "",
      `"${lead.upsellDescription || ""}"`,
      lead.closedDate ? new Date(lead.closedDate).toISOString().split("T")[0] : "",
    ].join(",")).join("\n");
    
    const csv = `${header}${rows}`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `sales-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const parseCSV = (csvText: string): SalesLead[] => {
    const lines = csvText.split("\n").filter((line) => line.trim());
    if (lines.length < 2) return [];

    // Parse header to find column indices
    const header = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
    const businessNameIdx = header.findIndex((h) => 
      h.toLowerCase().includes("business") && h.toLowerCase().includes("name")
    );
    const industryIdx = header.findIndex((h) => 
      h.toLowerCase() === "industry" || h.toLowerCase() === "trade" // Support both for backward compatibility
    );
    const phoneIdx = header.findIndex((h) => 
      h.toLowerCase().includes("phone") || h.toLowerCase().includes("number")
    );
    const currentPriceIdx = header.findIndex((h) => 
      h.toLowerCase().includes("current") && h.toLowerCase().includes("price")
    );
    const statusIdx = header.findIndex((h) => h.toLowerCase() === "status");
    const priceSoldIdx = header.findIndex((h) => 
      h.toLowerCase().includes("price") && h.toLowerCase().includes("sold")
    );
    const upsellAmountIdx = header.findIndex((h) => 
      h.toLowerCase().includes("upsell") && h.toLowerCase().includes("amount")
    );
    const upsellDescIdx = header.findIndex((h) => 
      h.toLowerCase().includes("upsell") && h.toLowerCase().includes("description")
    );
    const closedDateIdx = header.findIndex((h) => 
      h.toLowerCase().includes("closed") && h.toLowerCase().includes("date")
    );

    const importedLeads: SalesLead[] = [];
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      // Simple CSV parsing (handles quoted fields)
      const values: string[] = [];
      let current = "";
      let inQuotes = false;

      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
          values.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      values.push(current.trim());

      const getValue = (idx: number) => {
        if (idx === -1 || idx >= values.length) return "";
        return values[idx].replace(/^"|"$/g, "").trim();
      };

      const businessName = getValue(businessNameIdx);
      const industry = getValue(industryIdx);
      const phone = getValue(phoneIdx);
      const currentPrice = parseFloat(getValue(currentPriceIdx)) || 0;
      const status = getValue(statusIdx) as LeadStatus;
      const priceSoldAt = getValue(priceSoldIdx) ? parseFloat(getValue(priceSoldIdx)) : undefined;
      const upsellAmount = getValue(upsellAmountIdx) ? parseFloat(getValue(upsellAmountIdx)) : undefined;
      const upsellDescription = getValue(upsellDescIdx);
      const closedDateStr = getValue(closedDateIdx);

      // Validate required fields
      if (!businessName || !industry || !phone) {
        errors.push(`Row ${i + 1}: Missing required fields (Business Name, Industry, or Phone)`);
        continue;
      }

      // Save custom industry if it's not in the common list (case-insensitive check)
      const normalizedIndustry = industry.trim();
      const isCommon = COMMON_INDUSTRIES.some(
        (common) => common.toLowerCase() === normalizedIndustry.toLowerCase()
      );
      const isCustom = customIndustries.some(
        (custom) => custom.toLowerCase() === normalizedIndustry.toLowerCase()
      );
      if (!isCommon && !isCustom) {
        saveCustomIndustry(normalizedIndustry);
        setCustomIndustries((prev) => [...prev, normalizedIndustry]);
      }

      // Validate status
      const validStatus: LeadStatus = 
        status === "Closed" || status === "Appointment Booked" || status === "Not Interested"
          ? status
          : "Appointment Booked";

      const closedDate = closedDateStr ? Date.parse(closedDateStr) : undefined;

      const lead: SalesLead = {
        id: `lead-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 9)}`,
        businessName,
        industry,
        phoneNumber: phone,
        currentPrice,
        status: validStatus,
        priceSoldAt,
        upsellAmount,
        upsellDescription: upsellDescription || undefined,
        closedDate: closedDate && !isNaN(closedDate) ? closedDate : undefined,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      importedLeads.push(lead);
    }

    if (errors.length > 0) {
      alert(`Imported ${importedLeads.length} leads with ${errors.length} error(s):\n${errors.slice(0, 5).join("\n")}${errors.length > 5 ? `\n... and ${errors.length - 5} more` : ""}`);
    }

    return importedLeads;
  };

  const handleImportCSV = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const csvText = event.target?.result as string;
        if (!csvText) {
          alert("Failed to read CSV file");
          return;
        }

        const importedLeads = parseCSV(csvText);
        if (importedLeads.length === 0) {
          alert("No valid leads found in CSV file. Please check the format.");
          return;
        }

        if (confirm(`Import ${importedLeads.length} lead(s)? This will add them to your existing leads and create contacts.`)) {
          importedLeads.forEach((lead) => {
            addLead(lead);
            createContactFromLead(lead);
          });
          showToast(`Successfully imported ${importedLeads.length} lead(s)`, "success");
          alert(`Successfully imported ${importedLeads.length} lead(s) and created contacts!`);
        }
      };
      reader.onerror = () => {
        alert("Error reading CSV file");
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const totalStats = useMemo(() => {
    const closed = leads.filter((l) => l.status === "Closed");
    const totalRevenue = closed.reduce((sum, l) => sum + (l.priceSoldAt || 0), 0);
    const totalUpsells = closed.reduce((sum, l) => sum + (l.upsellAmount || 0), 0);
    const appointments = leads.filter((l) => l.status === "Appointment Booked" || l.status === "Closed");
    const conversionRate = appointments.length > 0 ? (closed.length / appointments.length) * 100 : 0;
    
    // Calculate average sales cycle
    const salesCycles = closed
      .filter((l) => l.closedDate && l.createdAt)
      .map((l) => (l.closedDate! - l.createdAt) / (1000 * 60 * 60 * 24));
    const averageSalesCycle = salesCycles.length > 0 
      ? salesCycles.reduce((sum, days) => sum + days, 0) / salesCycles.length 
      : 0;

    // Average follow-ups
    const followUpCounts = leads
      .filter((l) => l.followUpCount !== undefined)
      .map((l) => l.followUpCount || 0);
    const averageFollowUps = followUpCounts.length > 0
      ? followUpCounts.reduce((sum, count) => sum + count, 0) / followUpCounts.length
      : 0;

    // Quote acceptance rate
    const quotesSent = leads.filter((l) => l.quoteSentDate).length;
    const quotesAccepted = leads.filter((l) => l.quoteAcceptedDate).length;
    const quoteAcceptanceRate = quotesSent > 0 ? (quotesAccepted / quotesSent) * 100 : 0;

    // Repeat customer rate
    const repeatCustomers = closed.filter((l) => l.isRepeatCustomer).length;
    const repeatCustomerRate = closed.length > 0 ? (repeatCustomers / closed.length) * 100 : 0;

    // Highest average revenue industry - calculate from industry metrics
    const industryMap = new Map<string, { totalRevenue: number; closedCount: number }>();
    closed.forEach((lead) => {
      const industry = lead.industry;
      const revenue = (lead.priceSoldAt || 0) + (lead.upsellAmount || 0);
      if (!industryMap.has(industry)) {
        industryMap.set(industry, { totalRevenue: 0, closedCount: 0 });
      }
      const existing = industryMap.get(industry)!;
      industryMap.set(industry, {
        totalRevenue: existing.totalRevenue + revenue,
        closedCount: existing.closedCount + 1,
      });
    });

    let highestAvgRevIndustry: string | null = null;
    let highestAvgRevIndustryValue = 0;
    industryMap.forEach((data, industry) => {
      const avgRevenue = data.closedCount > 0 ? data.totalRevenue / data.closedCount : 0;
      // If no revenue data, still show the industry if it has closed leads
      if (data.closedCount > 0 && (avgRevenue > highestAvgRevIndustryValue || (highestAvgRevIndustry === null && avgRevenue === 0))) {
        highestAvgRevIndustryValue = avgRevenue;
        highestAvgRevIndustry = industry;
      }
    });

    return {
      totalLeads: leads.length,
      closed: closed.length,
      appointmentBooked: leads.filter((l) => l.status === "Appointment Booked").length,
      notInterested: leads.filter((l) => l.status === "Not Interested").length,
      closeRate: leads.length > 0 ? (closed.length / leads.length) * 100 : 0,
      totalRevenue,
      totalUpsells,
      conversionRate,
      averageSalesCycle,
      averageFollowUps,
      quoteAcceptanceRate,
      repeatCustomerRate,
      highestAvgRevIndustry,
      highestAvgRevIndustryValue,
    };
  }, [leads]);

  const pipelineValue = useMemo(() => {
    const openLeads = leads.filter((l) => l.status !== "Closed" && l.status !== "Not Interested");
    const exVat = openLeads.reduce((sum, l) => sum + (l.currentPrice || 0), 0);
    const incVat = exVat * 1.2;
    return { exVat, incVat };
  }, [leads]);

  const getStatusIcon = (status: LeadStatus) => {
    switch (status) {
      case "Closed":
        return <CheckCircle size={14} className="text-emerald-400" />;
      case "Appointment Booked":
        return <Calendar size={14} className="text-amber-400" />;
      case "Not Interested":
        return <XCircle size={14} className="text-rose-400" />;
    }
  };

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <th
      className="cursor-pointer select-none px-3 py-3 text-left text-xs font-semibold uppercase tracking-[0.15em] hover:bg-white/5 transition-colors whitespace-nowrap"
      style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-2">
        {children}
        {sortField === field && (
          <ArrowUpDown size={12} className={sortDirection === "asc" ? "rotate-180" : ""} />
        )}
      </div>
    </th>
  );

  return (
    <div className="flex flex-col gap-6 min-w-0 max-w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-semibold truncate" style={{ color: "var(--foreground)" }}>
            Sales Analytics
          </h1>
          <p className="mt-1 text-xs sm:text-sm" style={{ color: "color-mix(in oklab, var(--foreground), transparent 40%)" }}>
            Track leads, appointments, and closing data by industry
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 min-w-0 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Filter by industry..."
            value={filterIndustry}
            onChange={(e) => setFilterIndustry(e.target.value)}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/50 min-h-[44px] sm:min-h-0 flex-1 sm:flex-initial sm:w-auto"
            style={{ color: "var(--foreground)" }}
          />
          <Select
            options={[
              { value: "", label: "All Statuses" },
              ...statusOptions,
            ]}
            value={filterStatus}
            onChange={(value) => setFilterStatus(value as LeadStatus | "")}
            placeholder="Filter status..."
            className="w-full sm:w-48 min-h-[44px] sm:min-h-0"
          />
          <button
            onClick={handleAddLead}
            className="group relative inline-flex items-center justify-center gap-2 rounded-lg px-4 md:px-5 py-2.5 md:py-2.5 text-sm font-semibold transition-all duration-200 min-h-[44px] md:min-h-0 flex-shrink-0 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] overflow-hidden w-full sm:w-auto"
            style={{
              background: "linear-gradient(135deg, var(--brand) 0%, color-mix(in oklab, var(--brand), black 15%) 100%)",
              color: "var(--background)",
              border: "1px solid color-mix(in oklab, var(--brand), transparent 30%)",
            }}
          >
            <div
              className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              style={{
                background: "linear-gradient(135deg, color-mix(in oklab, var(--brand), white 10%) 0%, var(--brand) 100%)",
              }}
            />
            <span className="relative z-10 flex items-center gap-2">
              <Plus size={16} className="transition-transform duration-200 group-hover:rotate-90" strokeWidth={2.5} />
              <span>Add Lead</span>
            </span>
          </button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleImportCSV}
            className="inline-flex items-center gap-2 min-h-[44px] sm:min-h-0 w-full sm:w-auto"
          >
            <Upload size={14} />
            <span className="hidden sm:inline">Import CSV</span>
            <span className="sm:hidden">Import</span>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={exportToCSV}
            className="inline-flex items-center gap-2 min-h-[44px] sm:min-h-0 w-full sm:w-auto"
          >
            <Download size={14} />
            <span className="hidden sm:inline">Export CSV</span>
            <span className="sm:hidden">Export</span>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <SalesSummaryCards stats={totalStats} formatCurrency={formatCurrency} />

      {/* Pipeline by value widget */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <div
          className="rounded-lg border border-white/10 bg-white/5 p-3"
          style={{ boxShadow: "0 18px 32px -20px color-mix(in oklab, black, transparent 70%)" }}
        >
          <div
            className="text-[11px] uppercase tracking-[0.18em]"
            style={{ color: "color-mix(in oklab, var(--foreground), transparent 55%)" }}
          >
            Pipeline by value
          </div>
          <div className="mt-1 flex items-baseline gap-3">
            <div>
              <div className="text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
                Open opportunities (ex VAT)
              </div>
              <div className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>
                {formatCurrency(pipelineValue.exVat)}
              </div>
            </div>
            <div>
              <div className="text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
                With 20% VAT
              </div>
              <div className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>
                {formatCurrency(pipelineValue.incVat)}
              </div>
            </div>
          </div>
          <p
            className="mt-2 text-[11px]"
            style={{ color: "color-mix(in oklab, var(--foreground), transparent 55%)" }}
          >
            Based on leads that are still open in the pipeline (excluding closed and not interested).
          </p>
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-xl border border-white/10 overflow-hidden min-w-0" style={{ background: "color-mix(in oklab, var(--panel), transparent 82%)" }}>
        <div className="overflow-x-auto">
          <div className="table-wrapper -mx-3 md:mx-0">
            <table className="w-full text-sm" style={{ minWidth: "1000px" }}>
            <thead>
              <tr style={{ background: "color-mix(in oklab, var(--panel), transparent 60%)" }}>
                <SortableHeader field="businessName">Business</SortableHeader>
                <SortableHeader field="industry">Industry</SortableHeader>
                <SortableHeader field="phoneNumber">Phone</SortableHeader>
                <SortableHeader field="currentPrice">Current Price</SortableHeader>
                <SortableHeader field="status">Status</SortableHeader>
                <SortableHeader field="priceSoldAt">Price Sold</SortableHeader>
                <SortableHeader field="upsellAmount">Upsell</SortableHeader>
                <SortableHeader field="calculatedRevenue">Total Revenue</SortableHeader>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-[0.15em] whitespace-nowrap" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedLeads.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
                    No leads found. Click "Add Lead" to get started.
                  </td>
                </tr>
              ) : (
                sortedLeads.map((lead, index) => {
                  const totalRevenue = lead.status === "Closed" 
                    ? (lead.priceSoldAt || 0) + (lead.upsellAmount || 0)
                    : 0;
                  
                  return (
                    <tr
                      key={lead.id}
                      className="border-t border-white/5 hover:bg-white/5 transition-colors"
                      style={{ 
                        background: index % 2 === 0 
                          ? "transparent" 
                          : "color-mix(in oklab, var(--panel), transparent 40%)"
                      }}
                    >
                      <td className="px-3 py-3 font-medium whitespace-nowrap" style={{ color: "var(--foreground)" }}>
                        <div className="flex items-center gap-2">
                          <Building2 size={14} style={{ color: "color-mix(in oklab, var(--foreground), transparent 60%)" }} />
                          {lead.businessName}
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap" style={{ color: "color-mix(in oklab, var(--foreground), transparent 25%)" }}>
                        {lead.industry}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap" style={{ color: "color-mix(in oklab, var(--foreground), transparent 25%)" }}>
                        <div className="flex items-center gap-1.5">
                          <Phone size={12} style={{ color: "color-mix(in oklab, var(--foreground), transparent 60%)" }} />
                          {formatPhone(lead.phoneNumber)}
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap" style={{ color: "color-mix(in oklab, var(--foreground), transparent 25%)" }}>
                        {formatCurrency(lead.currentPrice)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(lead.status)}
                          <span style={{ color: "var(--foreground)" }}>
                            {lead.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap" style={{ color: "color-mix(in oklab, var(--foreground), transparent 25%)" }}>
                        {lead.priceSoldAt ? formatCurrency(lead.priceSoldAt) : "-"}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap" style={{ color: "color-mix(in oklab, var(--foreground), transparent 25%)" }}>
                        {lead.upsellAmount ? (
                          <div className="flex flex-col">
                            <span>{formatCurrency(lead.upsellAmount)}</span>
                            {lead.upsellDescription && (
                              <span className="text-[10px]" style={{ color: "color-mix(in oklab, var(--foreground), transparent 60%)" }}>
                                {lead.upsellDescription}
                              </span>
                            )}
                          </div>
                        ) : "-"}
                      </td>
                      <td className="px-3 py-3 font-medium whitespace-nowrap" style={{ color: "var(--foreground)" }}>
                        {totalRevenue > 0 ? formatCurrency(totalRevenue) : "-"}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          {lead.status !== "Closed" && (
                            <button
                              onClick={() => handleAddClosingData(lead)}
                              className="p-1 rounded hover:bg-white/10 transition-colors"
                              title="Add closing data"
                            >
                              <CheckCircle size={14} className="text-emerald-400" />
                            </button>
                          )}
                          <button
                            onClick={() => handleEditLead(lead)}
                            className="p-1 rounded hover:bg-white/10 transition-colors"
                            title="Edit lead"
                          >
                            <Edit size={14} style={{ color: "color-mix(in oklab, var(--foreground), transparent 60%)" }} />
                          </button>
                          <button
                            onClick={() => handleDeleteLead(lead.id)}
                            className="p-1 rounded hover:bg-white/10 transition-colors"
                            title="Delete lead"
                          >
                            <Trash2 size={14} style={{ color: "color-mix(in oklab, var(--foreground), transparent 60%)" }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          </div>
        </div>
      </div>

      {/* Industry Summary Section */}
      {industryMetrics.length > 0 && (
        <div className="rounded-xl border border-white/10 p-4" style={{ background: "color-mix(in oklab, var(--panel), transparent 82%)" }}>
          <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--foreground)" }}>
            Performance by Industry
          </h2>
          <SalesTable
            metrics={sortedMetrics}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={(field) => {
              if (sortField === field) {
                setSortDirection(sortDirection === "asc" ? "desc" : "asc");
              } else {
                setSortField(field);
                setSortDirection("desc");
              }
            }}
          />
          <div className="hidden overflow-x-auto">
            <div className="table-wrapper -mx-3 md:mx-0">
              <table className="w-full text-xs" style={{ minWidth: "1200px" }}>
              <thead>
                <tr style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
                  <th className="px-3 py-2 text-left">Industry</th>
                  <th className="px-3 py-2 text-left">Total Leads</th>
                  <th className="px-3 py-2 text-left">Closed</th>
                  <th className="px-3 py-2 text-left">Close Rate</th>
                  <th className="px-3 py-2 text-left">Conversion</th>
                  <th className="px-3 py-2 text-left">Revenue</th>
                  <th className="px-3 py-2 text-left">Avg Sale</th>
                  <th className="px-3 py-2 text-left">Sales Cycle</th>
                  <th className="px-3 py-2 text-left">Avg Follow-ups</th>
                  <th className="px-3 py-2 text-left">Quote Accept</th>
                  <th className="px-3 py-2 text-left">Repeat Rate</th>
                  <th className="px-3 py-2 text-left">Upsells</th>
                </tr>
              </thead>
              <tbody>
                {industryMetrics.map((metric, index) => (
                  <tr
                    key={metric.industry}
                    className="border-t border-white/5"
                    style={{ 
                      background: index % 2 === 0 
                        ? "transparent" 
                        : "color-mix(in oklab, var(--panel), transparent 40%)"
                    }}
                  >
                    <td className="px-3 py-2 font-medium" style={{ color: "var(--foreground)" }}>
                      {metric.industry}
                    </td>
                    <td className="px-3 py-2" style={{ color: "color-mix(in oklab, var(--foreground), transparent 25%)" }}>
                      {metric.totalLeads}
                    </td>
                    <td className="px-3 py-2" style={{ color: "color-mix(in oklab, var(--foreground), transparent 25%)" }}>
                      {metric.closed}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span style={{ color: "var(--foreground)" }}>
                          {metric.closeRate.toFixed(1)}%
                        </span>
                        {metric.closeRate >= 50 ? (
                          <TrendingUp size={12} className="text-emerald-400" />
                        ) : metric.closeRate < 30 ? (
                          <TrendingDown size={12} className="text-rose-400" />
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-2" style={{ color: "color-mix(in oklab, var(--foreground), transparent 25%)" }}>
                      {metric.conversionRate > 0 ? `${metric.conversionRate.toFixed(1)}%` : "-"}
                    </td>
                    <td className="px-3 py-2 font-medium" style={{ color: "var(--foreground)" }}>
                      {formatCurrency(metric.totalRevenue)}
                    </td>
                    <td className="px-3 py-2" style={{ color: "color-mix(in oklab, var(--foreground), transparent 25%)" }}>
                      {formatCurrency(metric.averageSalePrice)}
                    </td>
                    <td className="px-3 py-2" style={{ color: "color-mix(in oklab, var(--foreground), transparent 25%)" }}>
                      {metric.averageSalesCycle > 0 ? `${metric.averageSalesCycle.toFixed(1)}d` : "-"}
                    </td>
                    <td className="px-3 py-2" style={{ color: "color-mix(in oklab, var(--foreground), transparent 25%)" }}>
                      {metric.averageFollowUps > 0 ? metric.averageFollowUps.toFixed(1) : "-"}
                    </td>
                    <td className="px-3 py-2" style={{ color: "color-mix(in oklab, var(--foreground), transparent 25%)" }}>
                      {metric.quoteAcceptanceRate > 0 ? `${metric.quoteAcceptanceRate.toFixed(1)}%` : "-"}
                    </td>
                    <td className="px-3 py-2" style={{ color: "color-mix(in oklab, var(--foreground), transparent 25%)" }}>
                      {metric.repeatCustomerRate > 0 ? `${metric.repeatCustomerRate.toFixed(1)}%` : "-"}
                    </td>
                    <td className="px-3 py-2" style={{ color: "color-mix(in oklab, var(--foreground), transparent 25%)" }}>
                      {metric.totalUpsells} ({formatCurrency(metric.upsellRevenue)})
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Lead Modal */}
      <Modal
        open={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingLead(null);
        }}
        title={editingLead ? "Edit Lead" : "Add New Lead"}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
              Business Name
            </label>
            <input
              type="text"
              value={formData.businessName}
              onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/50"
              style={{ color: "var(--foreground)" }}
              placeholder="e.g., ABC Plumbing Ltd"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
              Industry
            </label>
            {!useCustomIndustry ? (
              <Select
                options={industryOptions}
                value={formData.industry || ""}
                onChange={(value) => {
                  if (value === "__custom__") {
                    setUseCustomIndustry(true);
                    setFormData({ ...formData, industry: "" });
                  } else {
                    setFormData({ ...formData, industry: value });
                  }
                }}
                placeholder="Select an industry..."
                className="w-full"
              />
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/50"
                  style={{ color: "var(--foreground)" }}
                  placeholder="Enter custom industry name..."
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => {
                    setUseCustomIndustry(false);
                    setFormData({ ...formData, industry: "" });
                  }}
                  className="text-xs text-brand hover:underline"
                >
                  ← Back to industry list
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
              Phone Number
            </label>
            <input
              type="tel"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/50"
              style={{ color: "var(--foreground)" }}
              placeholder="e.g., 07123 456789"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
              Current Price (£)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.currentPrice}
              onChange={(e) => setFormData({ ...formData, currentPrice: parseFloat(e.target.value) || 0 })}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/50"
              style={{ color: "var(--foreground)" }}
              placeholder="Price they are currently paying"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
              Status
            </label>
            <Select
              options={statusOptions}
              value={formData.status}
              onChange={(value) => setFormData({ ...formData, status: value as LeadStatus })}
              className="w-full"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowAddModal(false);
                setEditingLead(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveLead}
            >
              {editingLead ? "Update" : "Add"} Lead
            </Button>
          </div>
        </div>
      </Modal>

      {/* Closing Data Modal */}
      <Modal
        open={showClosingModal}
        onClose={() => {
          setShowClosingModal(false);
          setClosingLead(null);
        }}
        title="Add Closing Data"
      >
        {closingLead && (
          <div className="space-y-4">
            <div className="rounded-lg border border-white/10 p-3 bg-white/5">
              <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
                Lead Details
              </div>
              <div className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                {closingLead.businessName} • {closingLead.industry}
              </div>
              <div className="text-xs mt-1" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
                Current Price: {formatCurrency(closingLead.currentPrice)}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
                Price Sold At (£)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={closingData.priceSoldAt}
                onChange={(e) => setClosingData({ ...closingData, priceSoldAt: parseFloat(e.target.value) || 0 })}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/50"
                style={{ color: "var(--foreground)" }}
                placeholder="Final sale price"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
                Upsell Amount (£)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={closingData.upsellAmount}
                onChange={(e) => setClosingData({ ...closingData, upsellAmount: parseFloat(e.target.value) || 0 })}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/50"
                style={{ color: "var(--foreground)" }}
                placeholder="Additional upsell revenue"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
                Upsell Description (Optional)
              </label>
              <input
                type="text"
                value={closingData.upsellDescription}
                onChange={(e) => setClosingData({ ...closingData, upsellDescription: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/50"
                style={{ color: "var(--foreground)" }}
                placeholder="e.g., Extended warranty, Additional service"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowClosingModal(false);
                  setClosingLead(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveClosingData}
              >
                Mark as Closed
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
