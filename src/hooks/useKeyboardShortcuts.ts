"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

type ShortcutHandler = () => void;

interface Shortcut {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: ShortcutHandler;
  description: string;
}

// Global registry of shortcuts for help display
export const shortcuts: Shortcut[] = [];

export function useKeyboardShortcuts() {
  const router = useRouter();

  // Define all keyboard shortcuts
  const shortcutHandlers: Shortcut[] = [
    {
      key: "k",
      meta: true,
      ctrl: true,
      handler: () => {
        // Cmd+K opens search - handled by CommandPalette
      },
      description: "Open search",
    },
    {
      key: "n",
      meta: true,
      ctrl: true,
      shift: true,
      handler: () => router.push("/contacts?action=new"),
      description: "New contact",
    },
    {
      key: "d",
      meta: true,
      ctrl: true,
      handler: () => router.push("/"),
      description: "Go to Dashboard",
    },
    {
      key: "c",
      meta: true,
      ctrl: true,
      shift: true,
      handler: () => router.push("/contacts"),
      description: "Go to Contacts",
    },
    {
      key: "w",
      meta: true,
      ctrl: true,
      shift: true,
      handler: () => router.push("/workflows"),
      description: "Go to Workflows",
    },
    {
      key: "s",
      meta: true,
      ctrl: true,
      shift: true,
      handler: () => router.push("/settings"),
      description: "Go to Settings",
    },
    {
      key: "a",
      meta: true,
      ctrl: true,
      shift: true,
      handler: () => router.push("/assistant"),
      description: "Open Assistant",
    },
    {
      key: "?",
      shift: true,
      handler: () => {
        // Show keyboard shortcuts help
        const event = new CustomEvent("show-shortcuts-help");
        window.dispatchEvent(event);
      },
      description: "Show keyboard shortcuts",
    },
  ];

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in inputs
    const target = e.target as HTMLElement;
    if (
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable
    ) {
      return;
    }

    for (const shortcut of shortcutHandlers) {
      const metaOrCtrl = shortcut.meta || shortcut.ctrl;
      const metaMatch = metaOrCtrl ? (e.metaKey || e.ctrlKey) : true;
      const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
      const altMatch = shortcut.alt ? e.altKey : !e.altKey;
      const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();

      if (keyMatch && metaMatch && shiftMatch && altMatch) {
        e.preventDefault();
        shortcut.handler();
        break;
      }
    }
  }, [shortcutHandlers]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return shortcutHandlers;
}

// Keyboard shortcuts help modal component
export function getShortcutKey(shortcut: Shortcut): string {
  const parts: string[] = [];
  if (shortcut.meta || shortcut.ctrl) {
    parts.push(navigator.platform.includes("Mac") ? "⌘" : "Ctrl");
  }
  if (shortcut.shift) parts.push("⇧");
  if (shortcut.alt) parts.push("⌥");
  parts.push(shortcut.key.toUpperCase());
  return parts.join(" + ");
}


