"use client";

import { Loader2 } from "lucide-react";

type LoadingSpinnerProps = {
  size?: "sm" | "md" | "lg";
  className?: string;
  text?: string;
};

export function LoadingSpinner({ size = "md", className = "", text }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };

  return (
    <div className={`flex flex-col items-center justify-center gap-2 ${className}`}>
      <Loader2 className={`${sizeClasses[size]} animate-spin`} style={{ color: "var(--foreground)" }} />
      {text && (
        <p className="text-sm" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>
          {text}
        </p>
      )}
    </div>
  );
}


