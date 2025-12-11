"use client";

import { type ReactNode } from "react";
import { motion } from "framer-motion";
import { 
  Users, 
  CreditCard, 
  Workflow, 
  Star, 
  Phone, 
  FileText, 
  Search,
  Plus,
  ArrowRight
} from "lucide-react";
import { Button } from "./Button";

type EmptyStateType = 
  | "contacts"
  | "payments"
  | "workflows"
  | "reviews"
  | "calls"
  | "invoices"
  | "search"
  | "generic";

interface EmptyStateProps {
  type?: EmptyStateType;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  icon?: ReactNode;
}

const defaultContent: Record<EmptyStateType, { icon: ReactNode; title: string; description: string; actionLabel: string }> = {
  contacts: {
    icon: <Users size={48} />,
    title: "No contacts yet",
    description: "Start building your customer directory by adding your first contact or importing from your CRM.",
    actionLabel: "Add Contact",
  },
  payments: {
    icon: <CreditCard size={48} />,
    title: "No payments recorded",
    description: "Once you start receiving payments, they'll appear here. Create an invoice to get started.",
    actionLabel: "Create Invoice",
  },
  workflows: {
    icon: <Workflow size={48} />,
    title: "No active workflows",
    description: "Automate your business processes by creating your first workflow. We'll help you get started.",
    actionLabel: "Create Workflow",
  },
  reviews: {
    icon: <Star size={48} />,
    title: "No reviews yet",
    description: "Reviews from your customers will appear here. Send review requests to start collecting feedback.",
    actionLabel: "Request Reviews",
  },
  calls: {
    icon: <Phone size={48} />,
    title: "No call activity",
    description: "Your AI receptionist call history will appear here once you start receiving calls.",
    actionLabel: "Set Up Receptionist",
  },
  invoices: {
    icon: <FileText size={48} />,
    title: "No invoices created",
    description: "Create professional invoices and send them to your customers with just a few clicks.",
    actionLabel: "Create Invoice",
  },
  search: {
    icon: <Search size={48} />,
    title: "No results found",
    description: "We couldn't find anything matching your search. Try different keywords or filters.",
    actionLabel: "Clear Search",
  },
  generic: {
    icon: <FileText size={48} />,
    title: "Nothing here yet",
    description: "This section is empty. Get started by adding your first item.",
    actionLabel: "Get Started",
  },
};

export function EmptyState({
  type = "generic",
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  icon,
}: EmptyStateProps) {
  const defaults = defaultContent[type];
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center py-12 px-4 text-center"
    >
      {/* Decorative background */}
      <div className="relative mb-6">
        <div 
          className="absolute inset-0 blur-3xl opacity-20 rounded-full"
          style={{ background: "linear-gradient(135deg, var(--brand), transparent)" }}
        />
        <div 
          className="relative flex items-center justify-center w-24 h-24 rounded-2xl"
          style={{ 
            background: "linear-gradient(135deg, color-mix(in oklab, var(--brand), transparent 85%), color-mix(in oklab, var(--brand), transparent 95%))",
            color: "var(--brand)"
          }}
        >
          {icon || defaults.icon}
        </div>
      </div>

      {/* Content */}
      <h3 
        className="text-xl font-semibold mb-2"
        style={{ color: "var(--foreground)" }}
      >
        {title || defaults.title}
      </h3>
      <p 
        className="text-sm max-w-md mb-6"
        style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}
      >
        {description || defaults.description}
      </p>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {onAction && (
          <Button onClick={onAction} className="inline-flex items-center gap-2">
            <Plus size={16} />
            {actionLabel || defaults.actionLabel}
          </Button>
        )}
        {onSecondaryAction && secondaryActionLabel && (
          <Button variant="secondary" onClick={onSecondaryAction} className="inline-flex items-center gap-2">
            {secondaryActionLabel}
            <ArrowRight size={14} />
          </Button>
        )}
      </div>

      {/* Decorative dots */}
      <div className="flex items-center gap-1.5 mt-8">
        {[1, 2, 3].map((i) => (
          <motion.div
            key={i}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1 * i, duration: 0.2 }}
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: "color-mix(in oklab, var(--brand), transparent 70%)" }}
          />
        ))}
      </div>
    </motion.div>
  );
}


