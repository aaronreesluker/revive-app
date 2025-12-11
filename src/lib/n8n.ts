/**
 * n8n automation adapter stubs.
 *
 * The real implementation should:
 *   • Read secrets from server-side env vars or a secrets manager.
 *   • Sign requests with a Personal Access Token (PAT) that has execution scope.
 *   • Provide helpers for triggering workflows (POST /executions) and polling status.
 *   • Surface audit events back into the Revive event log for full traceability.
 *
 * TODO:
 *   - Swap the validation stub for a heartbeat call to `/me` once the endpoint is exposed.
 *   - Stream execution IDs back into operations tickets for reconciliation.
 *   - Add retry/backoff helpers for transient queue errors.
 */

export type N8nEnvironment = "sandbox" | "production";

export interface N8nAdapterConfig {
  apiKey: string;
  baseUrl: string;
  environment: N8nEnvironment;
}

export interface N8nCredentialValidation {
  ok: boolean;
  message: string;
}

export const N8N_ENV_VARS = {
  apiKey: "REVIVE_N8N_API_KEY",
  baseUrl: "REVIVE_N8N_BASE_URL",
  sandboxFlag: "REVIVE_N8N_SANDBOX",
} as const;

const N8N_DEFAULT_BASE_URL = "https://n8n.example.com/api/v1";
const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);

function readBoolean(value: string | undefined): boolean {
  if (!value) return false;
  return TRUE_VALUES.has(value.trim().toLowerCase());
}

/**
 * Resolve the server-side configuration for the n8n adapter.
 */
export function resolveN8nConfig(env: NodeJS.ProcessEnv = process.env): N8nAdapterConfig {
  const apiKey = env[N8N_ENV_VARS.apiKey] ?? "";
  const baseUrl = env[N8N_ENV_VARS.baseUrl] ?? N8N_DEFAULT_BASE_URL;
  const environment: N8nEnvironment = readBoolean(env[N8N_ENV_VARS.sandboxFlag]) ? "sandbox" : "production";

  return {
    apiKey,
    baseUrl,
    environment,
  };
}

export function validateN8nToken(apiKey: string): N8nCredentialValidation {
  if (!apiKey) {
    return { ok: false, message: "Missing access token" };
  }
  if (!/^n8n_[a-z0-9]{24,}$/i.test(apiKey)) {
    return {
      ok: false,
      message: "Tokens must start with n8n_ and contain at least 24 trailing characters.",
    };
  }
  return { ok: true, message: "Token format looks healthy. Replace with a real /me check when wiring the API." };
}

export interface N8nAdapter {
  config: N8nAdapterConfig;
  validateToken: (token?: string) => N8nCredentialValidation;
}

export function createN8nAdapter(env: NodeJS.ProcessEnv = process.env): N8nAdapter {
  const config = resolveN8nConfig(env);
  return {
    config,
    validateToken: (token = config.apiKey) => validateN8nToken(token),
  };
}


