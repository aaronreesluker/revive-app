// Shared types that can be used in both server and client components
export type BrandColors = {
  primary: string;
  secondary?: string;
  accent?: string;
};

export type ModuleConfig = {
  overview?: boolean;
  contacts?: boolean;
  workflows?: boolean;
  reviews?: boolean;
  payments?: boolean;
  insights?: boolean;
  settings?: boolean;
  receptionist?: boolean;
};

export type AppConfig = {
  branding: {
    name: string;
    logoUrl?: string;
    colors: BrandColors;
    poweredByRevive?: boolean | string;
  };
  modules: ModuleConfig;
  copy?: Record<string, unknown>;
  auth?: Record<string, unknown>;
  demoMode?: boolean;
};

