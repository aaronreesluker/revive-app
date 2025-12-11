"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, 
  X, 
  Users, 
  CreditCard, 
  Workflow, 
  FileText,
  Sparkles,
  Phone
} from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  route?: string;
  action?: () => void;
}

export function QuickActions() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const actions: QuickAction[] = [
    { 
      id: "contact", 
      label: "Add Contact", 
      icon: <Users size={20} />, 
      color: "text-purple-400",
      bgColor: "bg-purple-500/20",
      route: "/contacts?action=new"
    },
    { 
      id: "invoice", 
      label: "Create Invoice", 
      icon: <FileText size={20} />, 
      color: "text-blue-400",
      bgColor: "bg-blue-500/20",
      route: "/invoices?action=new"
    },
    { 
      id: "workflow", 
      label: "New Workflow", 
      icon: <Workflow size={20} />, 
      color: "text-amber-400",
      bgColor: "bg-amber-500/20",
      route: "/workflows?action=new"
    },
    { 
      id: "assistant", 
      label: "Ask Assistant", 
      icon: <Sparkles size={20} />, 
      color: "text-teal-400",
      bgColor: "bg-teal-500/20",
      route: "/assistant"
    },
  ];

  const handleAction = (action: QuickAction) => {
    setIsOpen(false);
    if (action.action) {
      action.action();
    } else if (action.route) {
      router.push(action.route);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* FAB Container */}
      <div className="fixed bottom-24 md:bottom-6 right-4 md:right-6 z-50 flex flex-col-reverse items-end gap-2">
        {/* Action buttons */}
        <AnimatePresence>
          {isOpen && (
            <>
              {actions.map((action, index) => (
                <motion.button
                  key={action.id}
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: 20 }}
                  transition={{ delay: index * 0.05, duration: 0.2 }}
                  onClick={() => handleAction(action)}
                  className={cn(
                    "flex items-center gap-3 rounded-full pl-4 pr-5 py-3 shadow-lg",
                    "border border-white/10 hover:border-white/20 transition-all",
                    "hover:scale-105 active:scale-95"
                  )}
                  style={{ background: "var(--surface)" }}
                >
                  <span className={cn("flex items-center justify-center w-8 h-8 rounded-full", action.bgColor, action.color)}>
                    {action.icon}
                  </span>
                  <span className="text-sm font-medium whitespace-nowrap" style={{ color: "var(--foreground)" }}>
                    {action.label}
                  </span>
                </motion.button>
              ))}
            </>
          )}
        </AnimatePresence>

        {/* Main FAB */}
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "flex items-center justify-center w-14 h-14 rounded-full shadow-lg",
            "bg-gradient-to-br from-teal-500 to-cyan-600",
            "hover:from-teal-400 hover:to-cyan-500 transition-all",
            "hover:scale-105 active:scale-95"
          )}
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.2 }}
          aria-label={isOpen ? "Close quick actions" : "Open quick actions"}
        >
          {isOpen ? (
            <X size={24} className="text-white" />
          ) : (
            <Plus size={24} className="text-white" />
          )}
        </motion.button>
      </div>
    </>
  );
}


