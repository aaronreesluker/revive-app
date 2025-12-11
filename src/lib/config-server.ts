// Server-only config utilities
import type { BrandColors, AppConfig, ModuleConfig } from "./config-types";

export function generateThemeVars(colors: BrandColors): Record<string, string> {
  return {
    "--brand-primary": colors.primary,
    "--brand-secondary": colors.secondary || colors.primary,
    "--brand-accent": colors.accent || colors.primary,
  };
}

export function isModuleEnabled(config: AppConfig, module: keyof ModuleConfig): boolean {
  return config.modules[module] ?? false;
}

export function getPoweredByText(config: AppConfig): string | null {
  const { poweredByRevive } = config.branding;
  if (poweredByRevive === false) return null;
  if (typeof poweredByRevive === "string") return poweredByRevive;
  return "Powered by Revive";
}

