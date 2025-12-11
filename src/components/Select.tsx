"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../lib/utils";

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type SelectProps = {
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
};

export function Select({
  options,
  value,
  defaultValue,
  name,
  required,
  disabled,
  onChange,
  placeholder = "Select...",
  className,
  buttonClassName,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(
    value ?? defaultValue ?? options.find((opt) => !opt.disabled)?.value ?? ""
  );
  const selectRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value !== undefined) {
      setSelectedValue(value);
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === selectedValue),
    [options, selectedValue]
  );

  const handleSelect = (optionValue: string) => {
    setSelectedValue(optionValue);
    onChange?.(optionValue);
    setIsOpen(false);
  };

  return (
    <div ref={selectRef} className={cn("relative", className)}>
      {name ? (
        <input type="hidden" name={name} value={selectedValue} required={required} />
      ) : null}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={cn(
          "flex w-full items-center justify-between rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm",
          "text-left shadow-sm transition focus:outline-none focus:ring-2 focus:ring-sky-400/70 focus:border-sky-300/60 hover:border-white/30",
          "backdrop-blur-sm",
          disabled && "cursor-not-allowed opacity-60",
          isOpen && "border-sky-400/60 ring-2 ring-sky-400/60",
          buttonClassName
        )}
        style={{
          color: selectedOption ? "var(--foreground)" : "color-mix(in oklab, var(--foreground), transparent 50%)",
          background: "color-mix(in oklab, var(--panel), transparent 15%)",
        }}
        disabled={disabled}
      >
        <span className="truncate">{selectedOption?.label || placeholder}</span>
        <ChevronDown
          size={16}
          className={cn(
            "ml-2 flex-shrink-0 text-white/60 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>

      <AnimatePresence>
        {isOpen && !disabled && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border app-ring shadow-2xl"
            style={{ 
              background: "rgba(12, 12, 16, 0.98)", 
              borderColor: "var(--ring)",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.2)"
            }}
          >
            <div className="max-h-60 overflow-y-auto">
              {options.map((option) => {
                if (option.disabled) {
                  return (
                    <div
                      key={option.value}
                      className="w-full px-3 py-2 text-left text-sm italic text-zinc-500/70"
                      style={{ background: "color-mix(in oklab, var(--surface), transparent 40%)" }}
                    >
                      {option.label}
                    </div>
                  );
                }
                const isSelected = option.value === selectedValue;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    className={cn(
                      "w-full px-3 py-2 text-left text-sm transition-colors",
                      "hover:bg-zinc-800/50",
                      isSelected && "brand-text bg-zinc-800/30"
                    )}
                    style={{
                      color: isSelected ? "var(--brand)" : "var(--foreground)",
                    }}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

