"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import type { PropsWithChildren } from "react";
import { cn } from "../lib/utils";

export type ModalProps = PropsWithChildren<{
  open: boolean;
  onClose: () => void;
  title?: string;
  className?: string;
}>;

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            className={cn(
              "relative z-10 w-full max-w-lg rounded-xl p-6 shadow-2xl",
              "bg-zinc-950 border border-zinc-800/80",
              "backdrop-blur-xl",
              className
            )}
            style={{
              background: "var(--surface)",
              borderColor: "var(--ring)",
            }}
          >
            {title && (
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
                <button
                  onClick={onClose}
                  className="rounded-md bg-zinc-800/60 p-1 text-zinc-300 hover:bg-zinc-700"
                >
                  <X size={18} />
                </button>
              </div>
            )}
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

