/**
 * Go High Level (GHL) adapter stubs.
 *
 * These helpers document the shape of the configuration we expect once the real
 * API wiring is ready. The live implementation should:
 *   • Resolve credentials from server-side environment variables only.
 *   • Exchange the API key for an auth token and store it securely.
 *   • Add typed fetch wrappers for the contact, pipeline, and campaign endpoints.
 *   • Stream audit events back into the Revive event log for cross-platform traceability.
 *
 * TODO:
 *   - Replace the validation stub with a live `GET /users/me` smoke test.
 *   - Cache the resolved configuration in a secure secret store.
 *   - Add helpers for syncing opportunities and for triggering campaign actions.
 */

export type GhlEnvironment = "sandbox" | "production";

export interface GhlAdapterConfig {
  apiKey: string;
  baseUrl: string;
  environment: GhlEnvironment;
}

export interface GhlCredentialValidation {
  ok: boolean;
  message: string;
}

export const GHL_ENV_VARS = {
  apiKey: "REVIVE_GHL_API_KEY",
  baseUrl: "REVIVE_GHL_BASE_URL",
  sandboxFlag: "REVIVE_GHL_SANDBOX",
} as const;

const GHL_DEFAULT_BASE_URL = "https://rest.gohighlevel.com/v1";
const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);

function readBoolean(value: string | undefined): boolean {
  if (!value) return false;
  return TRUE_VALUES.has(value.trim().toLowerCase());
}

/**
 * Resolve the server-side configuration for the GHL adapter.
 * Ensure this runs on the server only—never expose API keys in client bundles.
 */
export function resolveGhlConfig(env: NodeJS.ProcessEnv = process.env): GhlAdapterConfig {
  const apiKey = env[GHL_ENV_VARS.apiKey] ?? "";
  const baseUrl = env[GHL_ENV_VARS.baseUrl] ?? GHL_DEFAULT_BASE_URL;
  const environment: GhlEnvironment = readBoolean(env[GHL_ENV_VARS.sandboxFlag]) ? "sandbox" : "production";

  return {
    apiKey,
    baseUrl,
    environment,
  };
}

/**
 * Lightweight validation for demo purposes. Real implementations should call a GHL endpoint.
 */
export function validateGhlApiKey(apiKey: string): GhlCredentialValidation {
  if (!apiKey) {
    return { ok: false, message: "Missing API key" };
  }
  if (!/^ghl_(sandbox|live)_[a-z0-9]{16,}$/i.test(apiKey)) {
    return {
      ok: false,
      message: "Keys must start with ghl_live_ or ghl_sandbox_ and include at least 20 trailing characters.",
    };
  }
  return { ok: true, message: "Looks good. Replace this check with a real /users endpoint ping." };
}

export interface GhlAdapter {
  config: GhlAdapterConfig;
  validateKey: (apiKey?: string) => GhlCredentialValidation;
}

/**
 * Factory returning a typed adapter skeleton. Attach real HTTP clients here later.
 */
export function createGhlAdapter(env: NodeJS.ProcessEnv = process.env): GhlAdapter {
  const config = resolveGhlConfig(env);
  return {
    config,
    validateKey: (apiKey = config.apiKey) => validateGhlApiKey(apiKey),
  };
}

