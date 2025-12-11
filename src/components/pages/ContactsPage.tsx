"use client";

import { Fragment, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../Button";
import { Plus, Search, Eye, ChevronsUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Modal } from "../Modal";
import { useContactDirectory } from "@/hooks/useContactDirectory";
import { contactProfiles, type Contact } from "@/data/contacts";

type SortColumn = "name" | "email" | "phone" | "stage" | "source" | "company" | "lifetimeValue";

const STAGE_ORDER = [
  "New Lead",
  "Working",
  "Qualified",
  "Booked",
  "Onboarding",
  "Paid",
  "Customer",
  "Recurring Customer",
  "Advocate",
  "Dormant",
  "Churned",
];

const stageRank = (stage: string) => {
  const index = STAGE_ORDER.findIndex((entry) => entry.toLowerCase() === stage.toLowerCase());
  return index === -1 ? STAGE_ORDER.length + 1 : index;
};

type ContactRow = Contact & {
  lifetimeValueLabel: string;
  lifetimeValueAmount: number;
};

export function ContactsPage() {
  const router = useRouter();
  const { contacts } = useContactDirectory();
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [sortColumn, setSortColumn] = useState<SortColumn>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const pipelineSummary = useMemo(() => {
    const totals = contacts.reduce(
      (acc, contact) => {
        const stage = contact.stage || "Unclassified";
        acc.byStage[stage] = (acc.byStage[stage] ?? 0) + 1;
        if (["New Lead", "Working", "Qualified", "Booked", "Onboarding"].includes(stage)) {
          acc.pipeline += 1;
        }
        if (["Paid", "Customer", "Recurring Customer", "Advocate"].includes(stage)) {
          acc.customers += 1;
        }
        return acc;
      },
      {
        total: contacts.length,
        pipeline: 0,
        customers: 0,
        byStage: {} as Record<string, number>,
      }
    );
    return totals;
  }, [contacts]);

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return contacts
      .map<ContactRow>((contact) => {
        const profile = contactProfiles[contact.id];
        const lifetimeValueRaw = profile?.lifetimeValue ?? "£0";
        const sanitized = lifetimeValueRaw.replace(/[^\d.-]/g, "");
        const lifetimeValueAmount = Number.isFinite(Number(sanitized)) ? parseFloat(sanitized || "0") : 0;
        return {
          ...contact,
          lifetimeValueLabel: lifetimeValueRaw,
          lifetimeValueAmount,
        };
      })
      .filter((c) => {
        return (
          c.name.toLowerCase().includes(term) ||
          c.email.toLowerCase().includes(term) ||
          c.phone.includes(term) ||
          (c.company ?? "").toLowerCase().includes(term) ||
          (c.owner ?? "").toLowerCase().includes(term)
        );
      })
      .sort((a, b) => {
        const direction = sortDirection === "asc" ? 1 : -1;
        let primary = 0;
        switch (sortColumn) {
          case "email":
            primary = (a.email ?? "").localeCompare(b.email ?? "") * direction;
            if (primary !== 0) return primary;
            return a.name.localeCompare(b.name) * direction;
          case "phone":
            primary = (a.phone ?? "").localeCompare(b.phone ?? "") * direction;
            if (primary !== 0) return primary;
            return a.name.localeCompare(b.name) * direction;
          case "stage":
            return (stageRank(a.stage) - stageRank(b.stage)) * direction;
          case "source":
            primary = a.source.localeCompare(b.source) * direction;
            if (primary !== 0) return primary;
            return a.name.localeCompare(b.name) * direction;
          case "company":
            primary = (a.company ?? "").localeCompare(b.company ?? "") * direction;
            if (primary !== 0) return primary;
            return a.name.localeCompare(b.name) * direction;
          case "lifetimeValue":
            primary = (a.lifetimeValueAmount - b.lifetimeValueAmount) * direction;
            if (primary !== 0) return primary;
            return a.name.localeCompare(b.name) * direction;
          case "name":
          default:
            return a.name.localeCompare(b.name) * direction;
        }
      });
  }, [contacts, search, sortColumn, sortDirection]);

  const toggleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const renderSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) {
      return <ChevronsUpDown size={14} className="text-white/40" />;
    }
    return sortDirection === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
  };

  const renderSortBadge = (column: SortColumn) => {
    if (sortColumn !== column) return null;
    let label = "";
    if (column === "stage") {
      label = "pipeline";
    } else if (column === "lifetimeValue") {
      label = "value";
    } else if (column === "phone") {
      label = "0–9";
    } else {
      label = "A–Z";
    }
    return (
      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{ border: "1px solid color-mix(in oklab, var(--ring), transparent 60%)" }}>
        {label}
      </span>
    );
  };

  const stageGroupMeta = (stage: string) => {
    const index = STAGE_ORDER.findIndex((entry) => entry.toLowerCase() === stage.toLowerCase());
    if (index !== -1) {
      return {
        title: `Stage ${index + 1} • ${STAGE_ORDER[index]}`,
        helper: "Pipeline priority",
      };
    }
    const label = stage || "Unclassified";
    return {
      title: `Unclassified • ${label}`,
      helper: "Pipeline priority",
    };
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-white/10 bg-white/5 p-3">
          <div className="text-[11px] uppercase tracking-[0.18em]" style={{ color: "color-mix(in oklab, var(--foreground), transparent 55%)" }}>
            Contacts
          </div>
          <div className="mt-1 text-xl font-semibold" style={{ color: "var(--foreground)" }}>
            {pipelineSummary.total}
          </div>
          <div className="mt-1 text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
            Total people in your CRM
          </div>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/5 p-3">
          <div className="text-[11px] uppercase tracking-[0.18em]" style={{ color: "color-mix(in oklab, var(--foreground), transparent 55%)" }}>
            Active pipeline
          </div>
          <div className="mt-1 text-xl font-semibold" style={{ color: "var(--foreground)" }}>
            {pipelineSummary.pipeline}
          </div>
          <div className="mt-1 text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
            Leads moving from first contact to onboarding
          </div>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/5 p-3">
          <div className="text-[11px] uppercase tracking-[0.18em]" style={{ color: "color-mix(in oklab, var(--foreground), transparent 55%)" }}>
            Customers
          </div>
          <div className="mt-1 text-xl font-semibold" style={{ color: "var(--foreground)" }}>
            {pipelineSummary.customers}
          </div>
          <div className="mt-1 text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
            Paying or returning customers
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts..."
            className="w-full rounded-md bg-transparent pl-10 pr-4 py-2.5 md:py-2 text-sm ring-1 app-ring min-h-[44px] md:min-h-0"
          />
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="group relative inline-flex items-center justify-center gap-2 rounded-lg px-4 md:px-5 py-2.5 md:py-3 text-sm font-semibold transition-all duration-200 min-h-[44px] md:min-h-0 w-full sm:w-auto flex-shrink-0 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] overflow-hidden"
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
            <span>Add Contact</span>
          </span>
        </button>
      </div>

      <div className="overflow-auto rounded-lg ring-1 app-ring">
        <div className="table-wrapper -mx-3 md:mx-0">
          <table className="min-w-full text-sm">
          <thead style={{ background: "var(--panel)" }}>
            <tr>
              <th className="px-4 py-3 text-left">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 font-semibold hover:opacity-80"
                  onClick={() => toggleSort("name")}
                >
                  Name
                  {renderSortIcon("name")}
                  {renderSortBadge("name")}
                </button>
              </th>
              <th className="px-4 py-3 text-left">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 font-semibold hover:opacity-80"
                  onClick={() => toggleSort("email")}
                >
                  Email
                  {renderSortIcon("email")}
                  {renderSortBadge("email")}
                </button>
              </th>
              <th className="px-4 py-3 text-left">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 font-semibold hover:opacity-80"
                  onClick={() => toggleSort("phone")}
                >
                  Phone
                  {renderSortIcon("phone")}
                  {renderSortBadge("phone")}
                </button>
              </th>
              <th className="px-4 py-3 text-left">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 font-semibold hover:opacity-80"
                  onClick={() => toggleSort("stage")}
                >
                  Stage
                  {renderSortIcon("stage")}
                  {renderSortBadge("stage")}
                </button>
              </th>
              <th className="px-4 py-3 text-left table-mobile-hidden">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 font-semibold hover:opacity-80"
                  onClick={() => toggleSort("source")}
                >
                  Source
                  {renderSortIcon("source")}
                  {renderSortBadge("source")}
                </button>
              </th>
              <th className="px-4 py-3 text-left table-mobile-hidden">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 font-semibold hover:opacity-80"
                  onClick={() => toggleSort("company")}
                >
                  Company
                  {renderSortIcon("company")}
                  {renderSortBadge("company")}
                </button>
              </th>
              <th className="px-4 py-3 text-left">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 font-semibold hover:opacity-80"
                  onClick={() => toggleSort("lifetimeValue")}
                >
                  LTV (demo)
                  {renderSortIcon("lifetimeValue")}
                  {renderSortBadge("lifetimeValue")}
                </button>
              </th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              let lastStageBucket: number | null = null;
              return filtered.map((contact) => {
                const rows: React.ReactNode[] = [];
                const currentStageBucket = stageRank(contact.stage);
                if (sortColumn === "stage" && currentStageBucket !== lastStageBucket) {
                  lastStageBucket = currentStageBucket;
                  const { title, helper } = stageGroupMeta(contact.stage);
                  rows.push(
                    <tr key={`stage-header-${currentStageBucket}`} className="bg-white/5">
                      <td colSpan={8} className="px-4 py-2">
                        <div className="flex items-center justify-between text-xs uppercase tracking-[0.25em]" style={{ color: "color-mix(in oklab, var(--foreground), transparent 55%)" }}>
                          <span>{helper}</span>
                          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px]" style={{ border: "1px solid color-mix(in oklab, var(--ring), transparent 55%)" }}>
                            Pipeline order
                          </span>
                        </div>
                        <div className="mt-1 text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                          {title}
                        </div>
                      </td>
                    </tr>
                  );
                }

                rows.push(
                  <tr key={contact.id} className="border-t app-ring">
                    <td className="px-4 py-3 font-medium">{contact.name}</td>
                    <td className="px-4 py-3" style={{ color: "color-mix(in oklab, var(--foreground), transparent 30%)" }}>
                      {contact.email}
                    </td>
                    <td className="px-4 py-3 table-mobile-hidden" style={{ color: "color-mix(in oklab, var(--foreground), transparent 30%)" }}>
                      {contact.phone}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-zinc-900/60 px-2 py-1 text-xs ring-1 app-ring">{contact.stage}</span>
                    </td>
                    <td className="px-4 py-3 table-mobile-hidden" style={{ color: "color-mix(in oklab, var(--foreground), transparent 30%)" }}>
                      {contact.source}
                    </td>
                    <td className="px-4 py-3 table-mobile-hidden" style={{ color: "color-mix(in oklab, var(--foreground), transparent 30%)" }}>
                      {contact.company ?? "—"}
                    </td>
                    <td className="px-4 py-3 font-medium table-mobile-hidden" style={{ color: "var(--foreground)" }}>
                      {contact.lifetimeValueLabel}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => router.push(`/contacts/${contact.id}`)}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs ring-1 app-ring hover:opacity-90"
                      >
                        <Eye size={12} />
                        View
                      </button>
                    </td>
                  </tr>
                );

                return <Fragment key={`contact-row-${contact.id}`}>{rows}</Fragment>;
              });
            })()}
          </tbody>
        </table>
        </div>
      </div>

      {/* Contact Detail Modal */}
      {/* detail modal removed in favor of dedicated route */}

      {/* Add Contact Modal */}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Contact">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            alert("Contact added successfully!");
            setShowAddModal(false);
          }}
          className="space-y-4"
        >
          <div>
            <label className="mb-1 block text-sm font-medium" style={{ color: "var(--foreground)" }}>
              Full Name
            </label>
            <input
              type="text"
              required
              className="w-full rounded-md bg-transparent px-3 py-2 ring-1 app-ring focus:outline-none focus:ring-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium" style={{ color: "var(--foreground)" }}>
              Email
            </label>
            <input
              type="email"
              required
              className="w-full rounded-md bg-transparent px-3 py-2 ring-1 app-ring focus:outline-none focus:ring-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium" style={{ color: "var(--foreground)" }}>
              Phone
            </label>
            <input
              type="tel"
              required
              className="w-full rounded-md bg-transparent px-3 py-2 ring-1 app-ring focus:outline-none focus:ring-2"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="flex-1">
              Add Contact
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

