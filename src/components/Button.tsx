"use client";

import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "../lib/utils";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "rounded-md font-medium transition-all hover:opacity-90 disabled:opacity-50",
          variant === "primary" && "brand-bg text-black",
          variant === "secondary" && "bg-zinc-900/60 text-zinc-200 ring-1 app-ring",
          variant === "ghost" && "text-zinc-300 hover:bg-zinc-900/40",
          size === "sm" && "px-3 py-1.5 text-xs",
          size === "md" && "px-4 py-2 text-sm",
          size === "lg" && "px-5 py-3 text-base",
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

