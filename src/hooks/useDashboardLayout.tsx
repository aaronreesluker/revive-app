"use client";

import { useState, useEffect, useCallback } from "react";

export interface DashboardCard {
  id: string;
  title: string;
  visible: boolean;
  order: number;
  size?: "small" | "medium" | "large";
}

const STORAGE_KEY = "revive-dashboard-layout";

const defaultCards: DashboardCard[] = [
  { id: "leads", title: "Leads Received", visible: true, order: 0, size: "small" },
  { id: "bookings", title: "Bookings", visible: true, order: 1, size: "small" },
  { id: "show-rate", title: "Show Rate", visible: true, order: 2, size: "small" },
  { id: "review-rate", title: "Review Rate", visible: true, order: 3, size: "small" },
  { id: "receptionist", title: "AI Receptionist Activity", visible: true, order: 4, size: "medium" },
  { id: "payments", title: "Recent Payments", visible: true, order: 5, size: "medium" },
  { id: "activity", title: "Activity Feed", visible: true, order: 6, size: "medium" },
  { id: "insights", title: "Recommended Actions", visible: true, order: 7, size: "large" },
];

export function useDashboardLayout() {
  const [cards, setCards] = useState<DashboardCard[]>(defaultCards);
  const [isEditing, setIsEditing] = useState(false);

  // Load saved layout from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsedCards = JSON.parse(saved) as DashboardCard[];
        // Merge with defaults to handle new cards
        const merged = defaultCards.map((defaultCard) => {
          const savedCard = parsedCards.find((c) => c.id === defaultCard.id);
          return savedCard ? { ...defaultCard, ...savedCard } : defaultCard;
        });
        setCards(merged.sort((a, b) => a.order - b.order));
      }
    } catch {
      // Use defaults if parse fails
    }
  }, []);

  // Save layout to localStorage
  const saveLayout = useCallback((newCards: DashboardCard[]) => {
    setCards(newCards);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newCards));
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Toggle card visibility
  const toggleCard = useCallback((cardId: string) => {
    const newCards = cards.map((card) =>
      card.id === cardId ? { ...card, visible: !card.visible } : card
    );
    saveLayout(newCards);
  }, [cards, saveLayout]);

  // Reorder cards (for drag and drop)
  const reorderCards = useCallback((fromIndex: number, toIndex: number) => {
    const newCards = [...cards];
    const [removed] = newCards.splice(fromIndex, 1);
    newCards.splice(toIndex, 0, removed);
    
    // Update order property
    const reordered = newCards.map((card, index) => ({
      ...card,
      order: index,
    }));
    
    saveLayout(reordered);
  }, [cards, saveLayout]);

  // Change card size
  const setCardSize = useCallback((cardId: string, size: DashboardCard["size"]) => {
    const newCards = cards.map((card) =>
      card.id === cardId ? { ...card, size } : card
    );
    saveLayout(newCards);
  }, [cards, saveLayout]);

  // Reset to defaults
  const resetLayout = useCallback(() => {
    saveLayout(defaultCards);
  }, [saveLayout]);

  // Get visible cards in order
  const visibleCards = cards
    .filter((card) => card.visible)
    .sort((a, b) => a.order - b.order);

  // Get hidden cards
  const hiddenCards = cards.filter((card) => !card.visible);

  return {
    cards,
    visibleCards,
    hiddenCards,
    isEditing,
    setIsEditing,
    toggleCard,
    reorderCards,
    setCardSize,
    resetLayout,
  };
}

// Dashboard customization panel component
export function DashboardCustomizer({
  cards,
  onToggle,
  onReset,
  onClose,
}: {
  cards: DashboardCard[];
  onToggle: (id: string) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        className="w-full max-w-md rounded-xl border border-white/10 shadow-xl overflow-hidden"
        style={{ background: "var(--surface)" }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h3 className="font-semibold" style={{ color: "var(--foreground)" }}>
            Customize Dashboard
          </h3>
          <button
            onClick={onClose}
            className="rounded p-1 hover:bg-white/10"
            style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}
          >
            ✕
          </button>
        </div>

        <div className="p-4 max-h-[60vh] overflow-y-auto">
          <p className="text-xs mb-4" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>
            Toggle cards to show or hide them on your dashboard.
          </p>

          <div className="space-y-2">
            {cards.map((card) => (
              <label
                key={card.id}
                className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3 cursor-pointer hover:bg-white/10 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={card.visible}
                  onChange={() => onToggle(card.id)}
                  className="rounded border-white/20 bg-white/10 text-teal-500 focus:ring-teal-500"
                />
                <span className="text-sm" style={{ color: "var(--foreground)" }}>
                  {card.title}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
          <button
            onClick={onReset}
            className="text-sm hover:underline"
            style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}
          >
            Reset to defaults
          </button>
          <button
            onClick={onClose}
            className="rounded-lg bg-teal-500 px-4 py-2 text-sm font-medium text-white hover:bg-teal-600 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}


