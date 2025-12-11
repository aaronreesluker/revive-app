"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Button } from "../Button";
import { Select } from "../Select";
import { ChevronLeft, Copy, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Contact, ContactProfile } from "../../data/contacts";
import { usePayments } from "@/hooks/usePayments";
import { useContactDirectory } from "@/hooks/useContactDirectory";
import { useCurrentPlan } from "@/hooks/usePlanFeatures";
import { useBacsMandates } from "@/hooks/useBacsMandates";
import { useEventLog } from "@/context/EventLogContext";

type ContactWorkspaceProps = {
  contactId: string;
  initialContact: Contact;
  profile?: ContactProfile;
};

type PaymentMethod = "card" | "bacs" | "other";

export function ContactWorkspace({ contactId, initialContact, profile }: ContactWorkspaceProps) {
  const router = useRouter();
  const { createPaymentRequest } = usePayments();
  const { features } = useCurrentPlan();
  const { getMandateByCustomer } = useBacsMandates();
  const { recordEvent } = useEventLog();
  const {
    updateContact,
    getOwnerOptions,
    getStageOptions,
    getSourceOptions,
    findContact,
    timezoneOptions,
  } = useContactDirectory();

  const contact = findContact(contactId) ?? initialContact;
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [productName, setProductName] = useState("Strategy Workshop");
  const [chargeAmount, setChargeAmount] = useState("249"); // base price (ex VAT)
  const [chargeDescription, setChargeDescription] = useState("Strategy workshop deposit (ex VAT)");
  const [chargeEmail, setChargeEmail] = useState(contact.email ?? "");
  const [chargePending, setChargePending] = useState(false);
  const [chargeError, setChargeError] = useState<string | null>(null);
  const [chargeSuccess, setChargeSuccess] = useState<{
    link: string;
    amount: number;
    invoiceId: string;
  } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");

  const [editState, setEditState] = useState({
    name: contact.name,
    email: contact.email ?? "",
    phone: contact.phone ?? "",
    company: contact.company ?? "",
    stage: contact.stage ?? "",
    source: contact.source ?? "",
    timezone: contact.timezone ?? "",
    owner: contact.owner ?? "",
  });
  const [editStatus, setEditStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [editError, setEditError] = useState<string | null>(null);

  const primaryBillingEmail = useMemo(
    () => (chargeEmail || contact.email || "").trim(),
    [chargeEmail, contact.email],
  );

  const activeBacsMandate = useMemo(() => {
    if (!primaryBillingEmail) return undefined;
    try {
      return getMandateByCustomer(primaryBillingEmail);
    } catch {
      return undefined;
    }
  }, [getMandateByCustomer, primaryBillingEmail]);

  // Log when a contact workspace is viewed
  useEffect(() => {
    if (!contact) return;
    recordEvent({
      category: "system",
      action: "contact_viewed",
      summary: `Viewed contact workspace for ${contact.name}`,
      meta: {
        contactId: contact.id,
        email: contact.email,
      },
    });
  }, [contact, recordEvent]);

  const handleCharge = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const baseAmount = parseFloat(chargeAmount || "0");
    if (!Number.isFinite(baseAmount) || baseAmount <= 0) {
      setChargeError("Enter a valid product amount above zero.");
      return;
    }
    const vatAmount = parseFloat((baseAmount * 0.2).toFixed(2));
    const totalAmount = parseFloat((baseAmount + vatAmount).toFixed(2));
    setChargePending(true);
    setChargeError(null);
    try {
      const methodLabel =
        paymentMethod === "card" ? "CARD" : paymentMethod === "bacs" ? "BACS" : "OTHER";

      const result = await createPaymentRequest({
        customerName: contact.name,
        customerEmail: chargeEmail || undefined,
        description: `[${methodLabel}] ${chargeDescription || productName} • Net £${baseAmount.toFixed(
          2,
        )} + VAT £${vatAmount.toFixed(2)} (20%) = £${totalAmount.toFixed(2)}`,
        billingType: "one_time",
        items: [
          {
            id: `line-${Date.now()}`,
            name: productName || "Custom charge",
            // Store the total (including VAT) as the line amount so the payment link matches
            price: totalAmount,
            quantity: 1,
          },
        ],
      });

      setChargeSuccess({
        link: result.link,
        amount: result.amount,
        invoiceId: result.invoice.id,
      });

      recordEvent({
        category: "payments",
        action: "contact_payment_request_created",
        summary: `Created ${methodLabel.toLowerCase()} payment request for ${contact.name}`,
        meta: {
          contactId: contact.id,
          method: paymentMethod,
          netAmount: baseAmount,
          vatAmount,
          totalAmount,
          invoiceId: result.invoice.id,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create the payment link.";
      setChargeError(message);
      setChargeSuccess(null);
    } finally {
      setChargePending(false);
    }
  };

  const handleEditSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEditStatus("saving");
    setEditError(null);
    try {
      await updateContact(contact.id, {
        ...contact,
        ...editState,
      });
      setEditStatus("success");
      setTimeout(() => {
        setIsEditingProfile(false);
        setEditStatus("idle");
      }, 1000);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save contact.";
      setEditError(message);
      setEditStatus("error");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          className="inline-flex w-fit items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs font-medium ring-1 app-ring transition hover:bg-white/10"
          onClick={() => router.push("/contacts")}
        >
          <ChevronLeft size={14} />
          Back to contacts
        </button>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => alert(`Creating task for ${contact.name}…`)}
          >
            Create follow-up task
          </Button>
          <Button
            size="sm"
            onClick={() => alert("Export sent to your email.")}
          >
            Download contact export
          </Button>
        </div>
      </div>

        <div
          className="flex flex-col gap-4 rounded-xl border border-white/10 bg-white/5 p-4 md:flex-row md:items-center md:justify-between"
          style={{
            background:
              "color-mix(in oklab, var(--surface), transparent 4%)",
            borderColor: "color-mix(in oklab, var(--ring), transparent 40%)",
          }}
        >
        <div>
          <div className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
            {contact.name}
          </div>
          <div className="mt-1 text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 40%)" }}>
            {contact.email} • {contact.phone}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-zinc-900/60 px-2 py-1 text-[11px] ring-1 app-ring">
              Stage: {contact.stage}
            </span>
            <span className="rounded-full bg-sky-500/15 px-2 py-1 text-[11px]" style={{ color: "var(--brand)" }}>
              Source: {contact.source}
            </span>
            {profile?.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-white/10 px-2 py-1 text-[11px]">
                {tag}
              </span>
            ))}
          </div>
        </div>
        <div className="flex flex-1 flex-wrap justify-start gap-2 md:gap-3 md:justify-end">
          <div className="flex-1 min-w-[120px] sm:min-w-[140px] rounded-lg border border-white/10 bg-black/10 p-2 md:p-3">
            <div className="text-[10px] md:text-[11px]" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>
              Lifetime Value
            </div>
            <div className="mt-1 text-base md:text-lg font-semibold" style={{ color: "var(--foreground)" }}>
              {profile?.lifetimeValue ?? "—"}
            </div>
          </div>
          <div className="flex-1 min-w-[120px] sm:min-w-[140px] rounded-lg border border-white/10 bg-black/10 p-2 md:p-3">
            <div className="text-[10px] md:text-[11px]" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>
              Open Opportunities
            </div>
            <div className="mt-1 text-base md:text-lg font-semibold" style={{ color: "var(--foreground)" }}>
              {profile?.openOpportunities ?? 0}
            </div>
          </div>
          <div className="flex-1 min-w-[120px] sm:min-w-[140px] rounded-lg border border-white/10 bg-black/10 p-2 md:p-3">
            <div className="text-[10px] md:text-[11px]" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>
              Last Interaction
            </div>
            <div className="mt-1 text-xs md:text-sm" style={{ color: "var(--foreground)" }}>
              {profile?.lastContact ?? "No activity yet"}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:gap-5 lg:grid-cols-3">
        <div className="space-y-4 md:space-y-5 lg:col-span-2">
          <section
            className="rounded-xl border border-white/10 bg-white/5 p-3 md:p-4"
            style={{
              background: "color-mix(in oklab, var(--surface), transparent 6%)",
              borderColor: "color-mix(in oklab, var(--ring), transparent 45%)",
              boxShadow: "0 20px 40px -20px color-mix(in oklab, black, transparent 70%)",
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                Contact profile
              </h3>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setEditState({
                    name: contact.name,
                    email: contact.email ?? "",
                    phone: contact.phone ?? "",
                    company: contact.company ?? "",
                    stage: contact.stage ?? "",
                    source: contact.source ?? "",
                    timezone: contact.timezone ?? "",
                    owner: contact.owner ?? "",
                  });
                  setIsEditingProfile(true);
                  setEditStatus("idle");
                  setEditError(null);
                }}
              >
                Edit contact
              </Button>
            </div>
            {!isEditingProfile ? (
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div>
                  <div className="text-[11px]" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
                    Company
                  </div>
                  <div className="text-sm" style={{ color: "var(--foreground)" }}>
                    {contact.company || "—"}
                  </div>
                </div>
                <div>
                  <div className="text-[11px]" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
                    Owner
                  </div>
                  <div className="text-sm" style={{ color: "var(--foreground)" }}>
                    {contact.owner || "Unassigned"}
                  </div>
                </div>
                <div>
                  <div className="text-[11px]" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
                    Timezone
                  </div>
                  <div className="text-sm" style={{ color: "var(--foreground)" }}>
                    {contact.timezone || "—"}
                  </div>
                </div>
              </div>
            ) : (
              <form className="mt-3 space-y-3" onSubmit={handleEditSubmit}>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-[11px] font-medium" style={{ color: "color-mix(in oklab, var(--foreground), transparent 35%)" }}>
                      Full name
                    </label>
                    <input
                      type="text"
                      value={editState.name}
                      onChange={(event) => setEditState((prev) => ({ ...prev, name: event.target.value }))}
                      required
                      className="w-full rounded-md bg-transparent px-3 py-2 text-sm ring-1 app-ring focus:outline-none focus:ring-2"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium" style={{ color: "color-mix(in oklab, var(--foreground), transparent 35%)" }}>
                      Company
                    </label>
                    <input
                      type="text"
                      value={editState.company}
                      onChange={(event) => setEditState((prev) => ({ ...prev, company: event.target.value }))}
                      className="w-full rounded-md bg-transparent px-3 py-2 text-sm ring-1 app-ring focus:outline-none focus:ring-2"
                    />
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-[11px] font-medium" style={{ color: "color-mix(in oklab, var(--foreground), transparent 35%)" }}>
                      Email
                    </label>
                    <input
                      type="email"
                      value={editState.email}
                      onChange={(event) => setEditState((prev) => ({ ...prev, email: event.target.value }))}
                      className="w-full rounded-md bg-transparent px-3 py-2 text-sm ring-1 app-ring focus:outline-none focus:ring-2"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium" style={{ color: "color-mix(in oklab, var(--foreground), transparent 35%)" }}>
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={editState.phone}
                      onChange={(event) => setEditState((prev) => ({ ...prev, phone: event.target.value }))}
                      className="w-full rounded-md bg-transparent px-3 py-2 text-sm ring-1 app-ring focus:outline-none focus:ring-2"
                    />
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-[11px] font-medium" style={{ color: "color-mix(in oklab, var(--foreground), transparent 35%)" }}>
                      Stage
                    </label>
                    <Select
                      name="stage"
                      placeholder="Select stage"
                      value={editState.stage}
                      onChange={(value) => setEditState((prev) => ({ ...prev, stage: value }))}
                      options={getStageOptions().map((stageOption) => ({
                        value: stageOption,
                        label: stageOption,
                      }))}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium" style={{ color: "color-mix(in oklab, var(--foreground), transparent 35%)" }}>
                      Source
                    </label>
                    <Select
                      name="source"
                      placeholder="Select source"
                      value={editState.source}
                      onChange={(value) => setEditState((prev) => ({ ...prev, source: value }))}
                      options={getSourceOptions().map((sourceOption) => ({
                        value: sourceOption,
                        label: sourceOption,
                      }))}
                    />
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-[11px] font-medium" style={{ color: "color-mix(in oklab, var(--foreground), transparent 35%)" }}>
                      Timezone
                    </label>
                    <Select
                      name="timezone"
                      placeholder="Select timezone"
                      value={editState.timezone}
                      onChange={(value) => setEditState((prev) => ({ ...prev, timezone: value }))}
                      options={[
                        { value: "", label: "Not set" },
                        ...timezoneOptions,
                      ]}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium" style={{ color: "color-mix(in oklab, var(--foreground), transparent 35%)" }}>
                      Owner
                    </label>
                    <Select
                      name="owner"
                      placeholder="Assign owner"
                      value={editState.owner}
                      onChange={(value) => setEditState((prev) => ({ ...prev, owner: value }))}
                      options={[
                        { value: "", label: "Unassigned" },
                        ...getOwnerOptions().map((ownerOption) => ({
                          value: ownerOption,
                          label: ownerOption,
                        })),
                      ]}
                    />
                  </div>
                </div>

                {editError && (
                  <div className="rounded-md border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-[11px]" style={{ color: "color-mix(in oklab, var(--foreground), transparent 20%)" }}>
                    {editError}
                  </div>
                )}
                {editStatus === "success" && (
                  <div className="rounded-md border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-[11px]" style={{ color: "color-mix(in oklab, var(--foreground), transparent 20%)" }}>
                    Changes saved and synced with the workspace.
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex-1"
                    onClick={() => {
                      setIsEditingProfile(false);
                      setEditStatus("idle");
                      setEditError(null);
                    }}
                    disabled={editStatus === "saving"}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" className="flex-1" disabled={editStatus === "saving"}>
                    {editStatus === "saving" ? "Saving…" : "Save changes"}
                  </Button>
                </div>
              </form>
            )}
          </section>

          <section
            className="rounded-xl border border-white/10 bg-white/5 p-3 md:p-4"
            style={{
              background: "color-mix(in oklab, var(--surface), transparent 6%)",
              borderColor: "color-mix(in oklab, var(--ring), transparent 45%)",
              boxShadow: "0 20px 40px -20px color-mix(in oklab, black, transparent 70%)",
            }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                Activity timeline
              </h3>
              <button
                className="text-xs text-sky-300 underline-offset-2 hover:underline"
                onClick={() => alert("Activity export coming soon.")}
              >
                Export timeline
              </button>
            </div>
            <ul className="mt-4 space-y-3">
              {profile?.timeline.length ? (
                profile.timeline.map((event) => (
                  <li
                    key={event.id}
                    className="rounded-lg border border-white/10 bg-black/10 p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-medium" style={{ color: "var(--foreground)" }}>
                        {event.title}
                      </span>
                      <span style={{ color: "color-mix(in oklab, var(--foreground), transparent 40%)" }}>
                        {event.timestamp}
                      </span>
                    </div>
                    <div className="mt-1 text-[11px]" style={{ color: "color-mix(in oklab, var(--foreground), transparent 35%)" }}>
                      {event.actor}
                    </div>
                    <div className="mt-2 text-sm" style={{ color: "color-mix(in oklab, var(--foreground), transparent 15%)" }}>
                      {event.summary}
                    </div>
                  </li>
                ))
              ) : (
                <li className="rounded-lg border border-dashed border-white/20 p-4 text-sm" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>
                  Timeline events will show here once logged.
                </li>
              )}
            </ul>
          </section>

          <section className="rounded-xl border border-white/10 bg-white/5 p-4">
            <h3 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
              Strategist notes
            </h3>
            <ul className="mt-3 space-y-2 text-sm" style={{ color: "color-mix(in oklab, var(--foreground), transparent 15%)" }}>
              {profile?.notes.length ? (
                profile.notes.map((note, index) => (
                  <li key={index} className="rounded-lg border border-white/10 bg-black/10 p-3">
                    {note}
                  </li>
                ))
              ) : (
                <li className="rounded-lg border border-dashed border-white/20 p-4 text-sm" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>
                  Add notes to build a richer customer profile.
                </li>
              )}
            </ul>
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                onClick={() => alert("Opening note composer…")}
                className="flex-1"
              >
                Add note
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => alert("Uploading call transcript…")}
                className="flex-1"
              >
                Attach transcript
              </Button>
            </div>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="rounded-xl border border-white/10 bg-white/5 p-4">
            <h3 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
              Action hub
            </h3>
            <div className="mt-3 space-y-2">
              <Button
                variant="primary"
                size="sm"
                className="w-full"
                onClick={() => alert(`Sending SMS to ${contact.phone}`)}
              >
                Send message
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={() => alert(`Scheduling call with ${contact.name}`)}
              >
                Schedule call
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => alert("Adding to follow-up queue…")}
              >
                Queue follow-up
              </Button>
            </div>
          </section>

          <section className="rounded-xl border border-white/10 bg-white/5 p-4">
            <h3 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
              Workspace links
            </h3>
            <p className="mt-1 text-[11px]" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>
              Jump into other parts of the workspace with this contact in mind.
            </p>
            <div className="mt-3 grid grid-cols-1 gap-2 text-xs">
              <Button
                variant="secondary"
                size="sm"
                className="w-full justify-between"
                onClick={() => router.push(`/payments?contact=${encodeURIComponent(contact.id)}`)}
              >
                View payments
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="w-full justify-between"
                onClick={() => router.push(`/sales?contact=${encodeURIComponent(contact.id)}`)}
              >
                Open sales pipeline
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="w-full justify-between"
                onClick={() => router.push(`/workflows?contact=${encodeURIComponent(contact.id)}`)}
              >
                See automations
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="w-full justify-between"
                onClick={() => router.push(`/reviews?contact=${encodeURIComponent(contact.id)}`)}
              >
                Reviews & feedback
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between"
                onClick={() => router.push(`/insights?contact=${encodeURIComponent(contact.id)}`)}
              >
                Open AI insights
              </Button>
            </div>
          </section>

          <section
            className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4"
            style={{
              background: "color-mix(in oklab, var(--surface), transparent 6%)",
              borderColor: "color-mix(in oklab, var(--ring), transparent 45%)",
              boxShadow: "0 20px 40px -20px color-mix(in oklab, black, transparent 70%)",
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                  Collect payment
                </h3>
                <p
                  className="mt-1 text-[11px]"
                  style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}
                >
                  Use the same product + ex-VAT + VAT flow, then choose whether this is paid by card, BACS, or
                  something else.
                </p>
              </div>
              <div className="inline-flex rounded-full bg-black/40 p-1 text-[10px] ring-1 app-ring">
                <button
                  type="button"
                  className={`px-2 py-0.5 rounded-full ${
                    paymentMethod === "card" ? "bg-white text-black" : "text-white/70"
                  }`}
                  onClick={() => setPaymentMethod("card")}
                >
                  Card
                </button>
                <button
                  type="button"
                  className={`px-2 py-0.5 rounded-full ${
                    paymentMethod === "bacs" ? "bg-white text-black" : "text-white/70"
                  }`}
                  onClick={() => setPaymentMethod("bacs")}
                >
                  BACS
                </button>
                <button
                  type="button"
                  className={`px-2 py-0.5 rounded-full ${
                    paymentMethod === "other" ? "bg-white text-black" : "text-white/70"
                  }`}
                  onClick={() => setPaymentMethod("other")}
                >
                  Other
                </button>
              </div>
            </div>

            {activeBacsMandate && (
              <div
                className="flex items-center gap-2 rounded-md bg-emerald-500/10 px-3 py-2 text-[11px] ring-1 ring-emerald-400/40"
                style={{ color: "color-mix(in oklab, var(--foreground), transparent 10%)" }}
              >
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                <span>
                  BACS mandate active for{" "}
                  <span className="font-semibold">{activeBacsMandate.customerName}</span>. You can now charge this
                  customer directly from your payments workspace.
                </span>
              </div>
            )}

            {paymentMethod === "bacs" && !activeBacsMandate && (
              <div
                className="rounded-md bg-amber-500/10 px-3 py-2 text-[11px] ring-1 ring-amber-400/40"
                style={{ color: "color-mix(in oklab, var(--foreground), transparent 15%)" }}
              >
                No active BACS mandate found for this contact yet. Use{" "}
                <button
                  type="button"
                  className="underline underline-offset-2"
                  onClick={() => router.push(`/payments?contact=${encodeURIComponent(contact.id)}&bacs=1`)}
                >
                  Setup BACS Direct Debit
                </button>{" "}
                in the payments area once this payment is agreed.
              </div>
            )}

            <form className="space-y-3" onSubmit={handleCharge}>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[11px] font-medium" style={{ color: "color-mix(in oklab, var(--foreground), transparent 35%)" }}>
                    Product / service
                  </label>
                  <input
                    type="text"
                    value={productName}
                    onChange={(event) => {
                      setProductName(event.target.value);
                      setChargeSuccess(null);
                    }}
                    className="w-full rounded-md bg-transparent px-3 py-2 text-sm ring-1 app-ring focus:outline-none focus:ring-2"
                    placeholder="e.g. Boiler install"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium" style={{ color: "color-mix(in oklab, var(--foreground), transparent 35%)" }}>
                    Sale amount (ex VAT, GBP)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={chargeAmount}
                    onChange={(event) => {
                      setChargeAmount(event.target.value);
                      setChargeSuccess(null);
                    }}
                    className="w-full rounded-md bg-transparent px-3 py-2 text-sm ring-1 app-ring focus:outline-none focus:ring-2"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3 text-[11px]">
                {(() => {
                  const base = parseFloat(chargeAmount || "0");
                  const valid = Number.isFinite(base) && base > 0;
                  const vat = valid ? base * 0.2 : 0;
                  const total = valid ? base + vat : 0;
                  return (
                    <>
                      <div>
                        <div style={{ color: "color-mix(in oklab, var(--foreground), transparent 55%)" }}>Net</div>
                        <div style={{ color: "var(--foreground)" }}>£{valid ? base.toFixed(2) : "0.00"}</div>
                      </div>
                      <div>
                        <div style={{ color: "color-mix(in oklab, var(--foreground), transparent 55%)" }}>VAT 20%</div>
                        <div style={{ color: "var(--foreground)" }}>£{valid ? vat.toFixed(2) : "0.00"}</div>
                      </div>
                      <div>
                        <div style={{ color: "color-mix(in oklab, var(--foreground), transparent 55%)" }}>Total to charge</div>
                        <div style={{ color: "var(--foreground)" }}>£{valid ? total.toFixed(2) : "0.00"}</div>
                      </div>
                    </>
                  );
                })()}
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium" style={{ color: "color-mix(in oklab, var(--foreground), transparent 35%)" }}>
                  Internal notes / description (optional)
                </label>
                <input
                  type="text"
                  value={chargeDescription}
                  onChange={(event) => {
                    setChargeDescription(event.target.value);
                    setChargeSuccess(null);
                  }}
                  className="w-full rounded-md bg-transparent px-3 py-2 text-sm ring-1 app-ring focus:outline-none focus:ring-2"
                  placeholder="e.g. Final balance after materials"
                />
              </div>

              {chargeError && (
                <div className="rounded-md border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-[11px]" style={{ color: "color-mix(in oklab, var(--foreground), transparent 20%)" }}>
                  {chargeError}
                </div>
              )}

              {chargeSuccess && (
                <div className="space-y-2 rounded-md border border-emerald-400/30 bg-emerald-500/10 p-3 text-xs">
                  <div className="flex items-center justify-between gap-2" style={{ color: "var(--foreground)" }}>
                    <div>
                      <div className="text-sm font-semibold">Charge ready</div>
                      <div className="text-[11px]" style={{ color: "color-mix(in oklab, var(--foreground), transparent 35%)" }}>
                        £{chargeSuccess.amount.toFixed(2)} • Invoice {chargeSuccess.invoiceId}
                      </div>
                    </div>
                    <a
                      href={chargeSuccess.link}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1 text-[11px] ring-1 app-ring hover:bg-white/20"
                    >
                      Open link
                      <ExternalLink size={12} />
                    </a>
                  </div>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 text-[11px] ring-1 app-ring transition hover:bg-white/20"
                    onClick={() => navigator.clipboard.writeText(chargeSuccess.link)}
                  >
                    <Copy size={12} />
                    Copy link
                  </button>
                </div>
              )}

              <Button type="submit" variant="primary" className="w-full" disabled={chargePending}>
                {chargePending
                  ? "Generating link…"
                  : paymentMethod === "card"
                  ? "Generate card payment link"
                  : paymentMethod === "bacs"
                  ? "Log BACS payment amount"
                  : "Log other payment"}
              </Button>
            </form>
          </section>

          <section
            className="rounded-xl border border-white/10 bg-white/5 p-3 md:p-4"
            style={{
              background: "color-mix(in oklab, var(--surface), transparent 6%)",
              borderColor: "color-mix(in oklab, var(--ring), transparent 45%)",
              boxShadow: "0 20px 40px -20px color-mix(in oklab, black, transparent 75%)",
            }}
          >
            <h3 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
              Tasks & follow-ups
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
              {profile?.tasks.length ? (
                profile.tasks.map((task) => (
                  <li
                    key={task.id}
                    className="rounded-lg border border-white/10 bg-black/10 p-3"
                    style={{
                      opacity: task.status === "completed" ? 0.6 : 1,
                    }}
                  >
                    <div className="flex justify-between text-xs font-medium" style={{ color: "var(--foreground)" }}>
                      <span>{task.title}</span>
                      <span style={{ color: "color-mix(in oklab, var(--foreground), transparent 40%)" }}>
                        {task.status === "completed" ? "Completed" : "Open"}
                      </span>
                    </div>
                    <div className="mt-1 text-[11px]" style={{ color: "color-mix(in oklab, var(--foreground), transparent 35%)" }}>
                      {task.due}
                    </div>
                  </li>
                ))
              ) : (
                <li className="rounded-lg border border-dashed border-white/20 p-4 text-sm" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>
                  No tasks logged. Create one to keep momentum.
                </li>
              )}
            </ul>
            <Button
              variant="secondary"
              size="sm"
              className="mt-3 w-full"
              onClick={() => alert("Creating follow-up task…")}
            >
              Create task
            </Button>
          </section>
        </aside>
      </div>
    </div>
  );
}


