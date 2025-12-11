"use client";

import { motion } from "framer-motion";
import { Fragment, type PropsWithChildren, useEffect, useRef, useState } from "react";
import { CommandPalette } from "./CommandPalette";

export type DesktopFrameProps = PropsWithChildren<{
  brandName?: string | null;
  tagline?: string | string[];
  poweredBy?: string;
  headerExtras?: React.ReactNode;
}>;

export function DesktopFrame({ children, brandName, tagline, poweredBy, headerExtras }: DesktopFrameProps) {
  const displayBrandName = brandName ?? "Revive";
  const contentRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLHeadingElement | null>(null);
  const [showPoweredBy, setShowPoweredBy] = useState(!poweredBy);
  const [headerVisible, setHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

  // Scroll detection for header show/hide on mobile
  useEffect(() => {
    const node = contentRef.current;
    if (!node) return;

    const handleScroll = () => {
      const currentScrollY = node.scrollTop;
      const isScrollingDown = currentScrollY > lastScrollY.current;
      const isScrollingUp = currentScrollY < lastScrollY.current;
      const scrollDifference = Math.abs(currentScrollY - lastScrollY.current);

      // Only hide/show if scroll difference is significant (prevents jitter)
      if (scrollDifference > 5) {
        if (isScrollingDown && currentScrollY > 50) {
          // Hide header when scrolling down past 50px
          setHeaderVisible(false);
        } else if (isScrollingUp) {
          // Show header when scrolling up
          setHeaderVisible(true);
        }
      }

      lastScrollY.current = currentScrollY;

      // Show header when at top
      if (currentScrollY <= 10) {
        setHeaderVisible(true);
      }

      // Handle powered by footer visibility
      if (poweredBy) {
        const { scrollTop, scrollHeight, clientHeight } = node;
        if (scrollHeight <= clientHeight) {
          setShowPoweredBy(true);
          return;
        }
        setShowPoweredBy(scrollTop + clientHeight >= scrollHeight - 16);
      }
    };

    node.addEventListener("scroll", handleScroll, { passive: true });
    return () => node.removeEventListener("scroll", handleScroll);
  }, [poweredBy]);

  return (
    <div className="flex h-screen w-screen flex-col app-shell">
      <header 
        ref={headerRef}
        className={`mobile-header flex items-center justify-between gap-2 md:gap-4 border-b app-ring px-2 md:px-5 py-2 md:py-3 transition-transform duration-300 ease-in-out ${
          headerVisible ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="flex items-center gap-1.5 md:gap-3 text-xs md:text-sm min-w-0 flex-1 overflow-hidden" style={{ color: "var(--foreground)" }}>
          {Array.isArray(tagline) && tagline.length > 0 ? (
            <span className="tagline-dot-list hidden sm:inline-flex">
              {tagline.map((word, index) => (
                <Fragment key={`${word}-${index}`}>
                  <span className="tagline-dot-list__word">{word.toUpperCase()}</span>
                  {index < tagline.length - 1 && <span className="tagline-dot-list__dot" aria-hidden="true" />}
                </Fragment>
              ))}
            </span>
          ) : (
            tagline && typeof tagline === "string" && (
              <span className="micro-title hidden sm:inline" style={{ letterSpacing: "0.6em", fontSize: "0.62rem", color: "color-mix(in oklab, var(--foreground), transparent 32%)" }}>
                {tagline.toUpperCase()}
              </span>
            )
          )}
        </div>
        <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
          <CommandPalette />
          {headerExtras}
        </div>
      </header>
      <main ref={contentRef} className="relative flex-1 overflow-y-auto overflow-x-hidden rounded-xl app-main app-ring p-3 md:p-6">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="min-h-full">
          {children}
        </motion.div>
      </main>
      {poweredBy && showPoweredBy && (
        <footer className="border-t app-ring px-5 py-2 text-center text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>
          {poweredBy}
        </footer>
      )}
    </div>
  );
}

