"use client";

import { type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

export function ToastContainer({ toasts, onClose }: { toasts: Toast[]; onClose: (id: string) => void }) {
  return (
    <div className="fixed bottom-20 md:bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={() => onClose(toast.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
  const icons: Record<ToastType, ReactNode> = {
    success: <CheckCircle2 size={18} className="text-emerald-400" />,
    error: <XCircle size={18} className="text-rose-400" />,
    warning: <AlertCircle size={18} className="text-amber-400" />,
    info: <Info size={18} className="text-blue-400" />,
  };

  const borderColors: Record<ToastType, string> = {
    success: "border-emerald-500/30",
    error: "border-rose-500/30",
    warning: "border-amber-500/30",
    info: "border-blue-500/30",
  };

  const bgColors: Record<ToastType, string> = {
    success: "bg-emerald-500/10",
    error: "bg-rose-500/10",
    warning: "bg-amber-500/10",
    info: "bg-blue-500/10",
  };

  // Auto-dismiss after duration
  const duration = toast.duration ?? 4000;
  if (duration > 0) {
    setTimeout(onRemove, duration);
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.95 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn(
        "pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur-md",
        "min-w-[280px] max-w-[380px]",
        borderColors[toast.type],
        bgColors[toast.type]
      )}
      style={{ background: "color-mix(in oklab, var(--surface), transparent 10%)" }}
    >
      <div className="flex-shrink-0 mt-0.5">{icons[toast.type]}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
          {toast.message}
        </div>
      </div>
      <button
        onClick={onRemove}
        className="flex-shrink-0 rounded p-1 hover:bg-white/10 transition-colors"
        aria-label="Dismiss"
      >
        <X size={14} style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }} />
      </button>
    </motion.div>
  );
}
