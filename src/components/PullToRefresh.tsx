"use client";

import { useState, useRef, useCallback, type ReactNode, type TouchEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw } from "lucide-react";

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void>;
  threshold?: number;
  className?: string;
}

export function PullToRefresh({ 
  children, 
  onRefresh, 
  threshold = 80,
  className 
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const canPull = useCallback(() => {
    if (!containerRef.current) return false;
    // Only allow pull when scrolled to top
    return containerRef.current.scrollTop <= 0;
  }, []);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (isRefreshing) return;
    if (!canPull()) return;
    
    startY.current = e.touches[0].clientY;
    setIsPulling(true);
  }, [isRefreshing, canPull]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPulling || isRefreshing) return;
    if (!canPull()) {
      setPullDistance(0);
      return;
    }

    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;
    
    if (diff > 0) {
      // Apply resistance - the more you pull, the harder it gets
      const resistance = 0.4;
      const distance = diff * resistance;
      setPullDistance(Math.min(distance, threshold * 1.5));
    }
  }, [isPulling, isRefreshing, canPull, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling) return;
    setIsPulling(false);

    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(threshold);
      
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [isPulling, pullDistance, threshold, isRefreshing, onRefresh]);

  const progress = Math.min(pullDistance / threshold, 1);
  const isReady = pullDistance >= threshold;

  return (
    <div
      ref={containerRef}
      className={className}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ 
        overflowY: "auto", 
        WebkitOverflowScrolling: "touch",
        touchAction: isPulling ? "none" : "auto"
      }}
    >
      {/* Pull indicator */}
      <AnimatePresence>
        {(pullDistance > 0 || isRefreshing) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center overflow-hidden"
            style={{ 
              height: pullDistance,
              minHeight: isRefreshing ? threshold : 0
            }}
          >
            <motion.div
              className="flex flex-col items-center gap-2"
              animate={{ 
                rotate: isRefreshing ? 360 : progress * 180,
                scale: isReady || isRefreshing ? 1 : 0.8 + progress * 0.2
              }}
              transition={{ 
                rotate: isRefreshing ? { repeat: Infinity, duration: 1, ease: "linear" } : { duration: 0 },
                scale: { duration: 0.1 }
              }}
            >
              <RefreshCw 
                size={24} 
                style={{ 
                  color: isReady || isRefreshing 
                    ? "var(--brand)" 
                    : "color-mix(in oklab, var(--foreground), transparent 50%)"
                }} 
              />
            </motion.div>
            {!isRefreshing && pullDistance > 30 && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute mt-10 text-xs"
                style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}
              >
                {isReady ? "Release to refresh" : "Pull to refresh"}
              </motion.span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <motion.div
        animate={{ 
          y: isPulling && pullDistance > 0 ? pullDistance * 0.3 : 0 
        }}
        transition={{ duration: 0.1 }}
      >
        {children}
      </motion.div>
    </div>
  );
}


