"use client";

// Re-export types for convenience
export type { BrandColors, ModuleConfig, AppConfig } from "./config-types";

import type { AppConfig } from "./config-types";

// Client-side only config loader
export async function loadConfig(path: string = "/config.json"): Promise<AppConfig> {
  // Client-side: fetch from public path
  const response = await fetch(path);
  if (!response.ok) {
    console.warn(`Config not found at ${path}, using defaults`);
    return getDefaultConfig();
  }
  return await response.json();
}

function getDefaultConfig(): AppConfig {
  return {
    branding: {
      name: "Revive",
      colors: { primary: "#00b3b3" },
      poweredByRevive: true,
    },
    modules: {
      overview: true,
      contacts: true,
      workflows: true,
      reviews: true,
      payments: true,
      insights: true,
      settings: true,
      receptionist: true,
    },
    demoMode: false,
  };
}


