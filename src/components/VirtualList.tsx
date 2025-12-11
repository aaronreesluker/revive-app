"use client";

import { useState, useRef, useCallback, useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  renderItem: (item: T, index: number) => ReactNode;
  overscan?: number;
  className?: string;
  containerHeight?: number | string;
}

export function VirtualList<T>({
  items,
  itemHeight,
  renderItem,
  overscan = 5,
  className,
  containerHeight = 400,
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeightPx, setContainerHeightPx] = useState(
    typeof containerHeight === "number" ? containerHeight : 400
  );

  // Update container height if it's a dynamic value
  useEffect(() => {
    if (typeof containerHeight === "number") {
      setContainerHeightPx(containerHeight);
      return;
    }
    
    const updateHeight = () => {
      if (containerRef.current) {
        setContainerHeightPx(containerRef.current.clientHeight);
      }
    };
    
    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, [containerHeight]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Calculate visible range
  const totalHeight = items.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length,
    Math.ceil((scrollTop + containerHeightPx) / itemHeight) + overscan
  );

  // Get visible items
  const visibleItems = items.slice(startIndex, endIndex);
  const offsetY = startIndex * itemHeight;

  return (
    <div
      ref={containerRef}
      className={cn("overflow-y-auto", className)}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, index) => (
            <div key={startIndex + index} style={{ height: itemHeight }}>
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Table-specific virtual list
interface VirtualTableProps<T> {
  items: T[];
  columns: {
    key: keyof T | string;
    header: string;
    width?: string | number;
    render?: (item: T, index: number) => ReactNode;
  }[];
  rowHeight?: number;
  headerHeight?: number;
  className?: string;
  containerHeight?: number | string;
  onRowClick?: (item: T, index: number) => void;
}

export function VirtualTable<T extends Record<string, unknown>>({
  items,
  columns,
  rowHeight = 56,
  headerHeight = 48,
  className,
  containerHeight = 500,
  onRowClick,
}: VirtualTableProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeightPx, setContainerHeightPx] = useState(
    typeof containerHeight === "number" ? containerHeight : 500
  );

  useEffect(() => {
    if (typeof containerHeight === "number") {
      setContainerHeightPx(containerHeight);
      return;
    }
    
    const updateHeight = () => {
      if (containerRef.current) {
        setContainerHeightPx(containerRef.current.clientHeight - headerHeight);
      }
    };
    
    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, [containerHeight, headerHeight]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Calculate visible range
  const totalHeight = items.length * rowHeight;
  const overscan = 3;
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const endIndex = Math.min(
    items.length,
    Math.ceil((scrollTop + containerHeightPx) / rowHeight) + overscan
  );

  const visibleItems = items.slice(startIndex, endIndex);
  const offsetY = startIndex * rowHeight;

  return (
    <div className={cn("border border-white/10 rounded-xl overflow-hidden", className)}>
      {/* Header */}
      <div
        className="flex items-center border-b border-white/10 bg-white/5"
        style={{ height: headerHeight }}
      >
        {columns.map((col) => (
          <div
            key={String(col.key)}
            className="px-4 py-3 text-xs font-semibold uppercase tracking-wider truncate"
            style={{
              width: col.width ?? `${100 / columns.length}%`,
              color: "color-mix(in oklab, var(--foreground), transparent 40%)",
            }}
          >
            {col.header}
          </div>
        ))}
      </div>

      {/* Body */}
      <div
        ref={containerRef}
        className="overflow-y-auto"
        style={{ height: typeof containerHeight === "number" ? containerHeight - headerHeight : `calc(${containerHeight} - ${headerHeight}px)` }}
        onScroll={handleScroll}
      >
        <div style={{ height: totalHeight, position: "relative" }}>
          <div style={{ transform: `translateY(${offsetY}px)` }}>
            {visibleItems.map((item, index) => {
              const actualIndex = startIndex + index;
              return (
                <div
                  key={actualIndex}
                  className={cn(
                    "flex items-center border-b border-white/5 transition-colors",
                    onRowClick && "cursor-pointer hover:bg-white/5"
                  )}
                  style={{ height: rowHeight }}
                  onClick={() => onRowClick?.(item, actualIndex)}
                >
                  {columns.map((col) => (
                    <div
                      key={String(col.key)}
                      className="px-4 py-3 text-sm truncate"
                      style={{
                        width: col.width ?? `${100 / columns.length}%`,
                        color: "var(--foreground)",
                      }}
                    >
                      {col.render
                        ? col.render(item, actualIndex)
                        : String(item[col.key as keyof T] ?? "-")}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Empty state */}
      {items.length === 0 && (
        <div
          className="flex items-center justify-center py-12 text-sm"
          style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}
        >
          No data available
        </div>
      )}
    </div>
  );
}


