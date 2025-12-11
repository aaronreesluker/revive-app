"use client";

import { useState, useRef, type ReactNode, type TouchEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export interface SwipeAction {
  id: string;
  label: string;
  icon: ReactNode;
  color: string;
  bgColor: string;
  onClick: () => void;
}

interface SwipeableRowProps {
  children: ReactNode;
  leftActions?: SwipeAction[];
  rightActions?: SwipeAction[];
  threshold?: number;
  className?: string;
}

export function SwipeableRow({
  children,
  leftActions = [],
  rightActions = [],
  threshold = 80,
  className,
}: SwipeableRowProps) {
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const startX = useRef(0);
  const currentX = useRef(0);

  const hasLeftActions = leftActions.length > 0;
  const hasRightActions = rightActions.length > 0;

  const handleTouchStart = (e: TouchEvent) => {
    startX.current = e.touches[0].clientX;
    currentX.current = startX.current;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isSwiping) return;
    
    currentX.current = e.touches[0].clientX;
    let diff = currentX.current - startX.current;
    
    // Apply resistance and limits
    const maxSwipe = threshold * 1.5;
    
    if (diff > 0 && !hasLeftActions) diff = 0;
    if (diff < 0 && !hasRightActions) diff = 0;
    
    // Apply resistance
    const resistance = 0.5;
    if (Math.abs(diff) > threshold) {
      diff = Math.sign(diff) * (threshold + (Math.abs(diff) - threshold) * resistance);
    }
    
    diff = Math.max(-maxSwipe, Math.min(maxSwipe, diff));
    setSwipeX(diff);
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);
    
    if (Math.abs(swipeX) >= threshold) {
      // Trigger action
      if (swipeX > 0 && leftActions.length > 0) {
        leftActions[0].onClick();
      } else if (swipeX < 0 && rightActions.length > 0) {
        rightActions[0].onClick();
      }
    }
    
    // Reset position
    setSwipeX(0);
  };

  const leftProgress = Math.max(0, swipeX / threshold);
  const rightProgress = Math.max(0, -swipeX / threshold);

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* Left actions background */}
      {hasLeftActions && (
        <div 
          className="absolute inset-y-0 left-0 flex items-center"
          style={{ 
            width: Math.max(0, swipeX),
            background: leftActions[0].bgColor,
          }}
        >
          <motion.div
            className="flex items-center gap-2 px-4"
            animate={{ 
              opacity: leftProgress,
              scale: 0.8 + leftProgress * 0.2 
            }}
          >
            <span className={leftActions[0].color}>{leftActions[0].icon}</span>
            {leftProgress > 0.5 && (
              <span className={cn("text-sm font-medium", leftActions[0].color)}>
                {leftActions[0].label}
              </span>
            )}
          </motion.div>
        </div>
      )}

      {/* Right actions background */}
      {hasRightActions && (
        <div 
          className="absolute inset-y-0 right-0 flex items-center justify-end"
          style={{ 
            width: Math.max(0, -swipeX),
            background: rightActions[0].bgColor,
          }}
        >
          <motion.div
            className="flex items-center gap-2 px-4"
            animate={{ 
              opacity: rightProgress,
              scale: 0.8 + rightProgress * 0.2 
            }}
          >
            {rightProgress > 0.5 && (
              <span className={cn("text-sm font-medium", rightActions[0].color)}>
                {rightActions[0].label}
              </span>
            )}
            <span className={rightActions[0].color}>{rightActions[0].icon}</span>
          </motion.div>
        </div>
      )}

      {/* Main content */}
      <motion.div
        className="relative bg-[var(--surface)]"
        animate={{ x: swipeX }}
        transition={{ type: isSwiping ? "tween" : "spring", duration: isSwiping ? 0 : 0.3 }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ touchAction: "pan-y" }}
      >
        {children}
      </motion.div>
    </div>
  );
}


