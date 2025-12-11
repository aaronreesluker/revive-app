/**
 * GoHighLevel Email API Integration
 * 
 * Handles sending emails through GHL's email API
 */

import { resolveGhlConfig, type GhlAdapterConfig } from "../ghl";

export interface GhlEmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  fromName?: string;
  replyTo?: string;
  locationId?: string;
}

export interface GhlEmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

type AuthHeader = {
  header: string;
  value: string;
  label: string;
};

type LocationSource = "options" | "env" | "jwt" | "pit" | "fallback";

interface PitContext {
  baseUrl: string;
  authMethod: AuthHeader;
  authCandidates: AuthHeader[];
  locationId?: string;
}

export interface ResolvedGhlContext {
  config: GhlAdapterConfig;
  authMethod: AuthHeader;
  authCandidates: AuthHeader[];
  baseUrl: string;
  versionedBaseUrl: string;
  locationId?: string;
  locationSource?: LocationSource;
  tokenType: "pit" | "jwt";
  tokenPreview: string;
  diagnostics: string[];
}

const SERVICES_BASE_URL = "https://services.leadconnectorhq.com";
const DEFAULT_BASE_URL = "https://rest.gohighlevel.com/v1";
const HARDCODED_FALLBACK_LOCATION_ID = "3wQD2SH7L4R72I2FaIgS";
const PIT_CACHE_TTL_MS = 1000 * 60 * 10;

const PIT_CONTEXT_CACHE = new Map<string, { expiresAt: number; context: PitContext }>();

const PIT_AUTH_TEMPLATES: Array<{
  header: string;
  label: string;
  buildValue: (token: string) => string;
}> = [
  { header: "Authorization", label: "Authorization: Bearer <token>", buildValue: (token) => `Bearer ${token}` },
  { header: "Authorization", label: "Authorization: <token>", buildValue: (token) => token },
  { header: "X-API-Key", label: "X-API-Key: <token>", buildValue: (token) => token },
  { header: "X-Auth-Token", label: "X-Auth-Token: <token>", buildValue: (token) => token },
];

const PARTIAL_SUCCESS_HINTS = [
  "scope",
  "permission",
  "switch to the new api token",
  "does not have access",
  "token does not have",
];

function maskToken(token: string): string {
  if (!token) return "";
  if (token.length <= 10) return token;
  return `${token.slice(0, 6)}...${token.slice(-4)}`;
}

function sanitizeBaseUrl(url?: string): string {
  if (!url) return DEFAULT_BASE_URL;
  return url.replace(/\/+$/, "");
}

function ensureVersionedBase(baseUrl: string): string {
  const sanitized = sanitizeBaseUrl(baseUrl);
  if (sanitized.includes("gohighlevel.com") && !sanitized.endsWith("/v1")) {
    return `${sanitized}/v1`;
  }
  return sanitized;
}

function joinUrl(baseUrl: string, path: string): string {
  const trimmedBase = baseUrl.replace(/\/+$/, "");
  const trimmedPath = path.replace(/^\/+/, "");
  return `${trimmedBase}/${trimmedPath}`;
}

function safeJsonParse<T = unknown>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function buildBaseHeaders(options?: { includeContentType?: boolean }) {
  const headers: Record<string, string> = {
    Accept: "application/json",
    Version: "2021-07-28",
  };
  if (options?.includeContentType !== false) {
    headers["Content-Type"] = "application/json";
  }
  return headers;
}

function buildHeaders(authMethod?: AuthHeader, options?: { includeContentType?: boolean }) {
  const headers = buildBaseHeaders(options);
  if (authMethod) {
    headers[authMethod.header] = authMethod.value;
  }
  return headers;
}

function buildPitBaseCandidates(baseUrl: string): string[] {
  const sanitized = sanitizeBaseUrl(baseUrl || DEFAULT_BASE_URL);
  const withoutVersion = sanitized.replace(/\/v1$/, "");
  const candidates = [
    SERVICES_BASE_URL,
    sanitized,
    `${withoutVersion}/v1`,
    withoutVersion,
    DEFAULT_BASE_URL,
  ].filter(Boolean);
  return Array.from(new Set(candidates));
}

function buildUserEndpoints(baseUrl: string): string[] {
  const sanitized = sanitizeBaseUrl(baseUrl);
  const endpoints = [joinUrl(sanitized, "users/me")];
  if (!sanitized.endsWith("/v1")) {
    endpoints.push(joinUrl(sanitized, "v1/users/me"));
  }
  return Array.from(new Set(endpoints));
}

function shouldTreatAsPartialSuccess(status: number, body: string) {
  if (status !== 401 && status !== 403) {
    return false;
  }
  const lower = body.toLowerCase();
  return PARTIAL_SUCCESS_HINTS.some((hint) => lower.includes(hint));
}

function extractLocationId(payload: any): string | undefined {
  return (
    payload?.locationId ||
    payload?.location_id ||
    payload?.location?.id ||
    payload?.user?.locationId ||
    payload?.locations?.[0]?.id
  );
}

function dedupeAuthHeaders(headers: AuthHeader[]): AuthHeader[] {
  const seen = new Set<string>();
  const ordered: AuthHeader[] = [];
  for (const header of headers) {
    if (!header) continue;
    const key = `${header.header}::${header.value}`;
    if (seen.has(key)) continue;
    seen.add(key);
    ordered.push(header);
  }
  return ordered;
}

const INVALID_TOKEN_HINTS = [
  "api key is invalid",
  "invalid api key",
  "invalid token",
  "unauthorized, switch to the new api token",
];

interface AuthenticatedFetchResult {
  status: number;
  statusText: string;
  headers: Headers;
  text: string;
  authUsed: AuthHeader;
}

function buildAttemptList(context: ResolvedGhlContext): AuthHeader[] {
  return dedupeAuthHeaders([context.authMethod, ...(context.authCandidates || [])]);
}

export async function fetchWithAuthRotation(
  context: ResolvedGhlContext,
  url: string,
  init: RequestInit
): Promise<AuthenticatedFetchResult> {
  const attempts = buildAttemptList(context);
  const invalidAttempts: string[] = [];
  let lastResult: AuthenticatedFetchResult | null = null;

  for (const auth of attempts) {
    const headers = new Headers(init.headers ?? {});
    const baseHeaders = buildHeaders(undefined, {
      includeContentType:
        init.method && init.method.toUpperCase() !== "GET" ? true : init.body ? true : false,
    });
    Object.entries(baseHeaders).forEach(([key, value]) => {
      if (!headers.has(key)) {
        headers.set(key, value);
      }
    });
    headers.set(auth.header, auth.value);

    const response = await fetch(url, {
      ...init,
      headers,
    });
    const text = await response.text();
    const result: AuthenticatedFetchResult = {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      text,
      authUsed: auth,
    };
    lastResult = result;

    const lower = text.toLowerCase();
    const isInvalidToken =
      response.status === 401 && INVALID_TOKEN_HINTS.some((hint) => lower.includes(hint));

    if (isInvalidToken) {
      invalidAttempts.push(`${auth.label} -> ${response.status} ${response.statusText}`);
      continue;
    }

    if (context.authMethod.header !== auth.header || context.authMethod.value !== auth.value) {
      console.log(`🔄 Switched auth header to ${auth.label}`);
      context.authMethod = auth;
    }
    return result;
  }

  if (invalidAttempts.length) {
    console.warn(`⚠️ All auth headers reported invalid token: ${invalidAttempts.join(" | ")}`);
  }

  if (lastResult) {
    return lastResult;
  }

  throw new Error("No authentication headers available for GHL request.");
}

async function resolvePitContext(apiKey: string, baseUrl: string, diagnostics: string[]): Promise<PitContext> {
  const baseCandidates = buildPitBaseCandidates(baseUrl);
  const authCandidates = PIT_AUTH_TEMPLATES.map<AuthHeader>((template) => ({
    header: template.header,
    label: template.label,
    value: template.buildValue(apiKey),
  }));

  const cached = PIT_CONTEXT_CACHE.get(apiKey);
  if (cached && cached.expiresAt > Date.now()) {
    diagnostics.push("Using cached PIT auth context.");
    return {
      ...cached.context,
      authCandidates: cached.context.authCandidates ?? authCandidates,
    };
  }

  let bestContext: PitContext = {
    baseUrl: sanitizeBaseUrl(baseCandidates[0] ?? baseUrl ?? DEFAULT_BASE_URL),
    authMethod: authCandidates[0],
    authCandidates,
  };

  for (const candidateBase of baseCandidates) {
    for (const authMethod of authCandidates) {
      for (const endpoint of buildUserEndpoints(candidateBase)) {
        diagnostics.push(`🔍 Trying ${endpoint} with ${authMethod.label}`);
        try {
          const response = await fetch(endpoint, {
            method: "GET",
            headers: buildHeaders(authMethod, { includeContentType: false }),
          });
          const bodyText = await response.text();
          diagnostics.push(`📡 ${endpoint} -> ${response.status} ${response.statusText}`);

          if (response.ok) {
            const payload = safeJsonParse(bodyText) ?? {};
            const locationId = extractLocationId(payload);
            if (locationId) {
              diagnostics.push(`✅ Extracted location_id ${locationId}`);
              const context: PitContext = {
                baseUrl: sanitizeBaseUrl(candidateBase),
                authMethod,
                authCandidates,
                locationId,
              };
              PIT_CONTEXT_CACHE.set(apiKey, { expiresAt: Date.now() + PIT_CACHE_TTL_MS, context });
              return context;
            }
          } else if (shouldTreatAsPartialSuccess(response.status, bodyText)) {
            diagnostics.push(`💡 Token recognized but missing scope for ${endpoint}`);
            bestContext = {
              baseUrl: sanitizeBaseUrl(candidateBase),
              authMethod,
              authCandidates,
            };
          } else {
            diagnostics.push(`⚠️ ${endpoint} failed: ${bodyText.substring(0, 120)}`);
          }
        } catch (error) {
          diagnostics.push(
            `❌ ${endpoint} error: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
    }
  }

  PIT_CONTEXT_CACHE.set(apiKey, { expiresAt: Date.now() + PIT_CACHE_TTL_MS, context: bestContext });
  return bestContext;
}

export async function resolveGhlContext(
  options: { locationId?: string } = {}
): Promise<ResolvedGhlContext> {
  const config = resolveGhlConfig();
  if (!config.apiKey) {
    throw new Error("GHL API key not configured. Add REVIVE_GHL_API_KEY to your environment variables.");
  }

  const diagnostics: string[] = [];
  const tokenType: "pit" | "jwt" = config.apiKey.startsWith("pit-") ? "pit" : "jwt";
  const tokenPreview = maskToken(config.apiKey);

  let locationId = options.locationId?.trim();
  let locationSource: LocationSource | undefined = locationId ? "options" : undefined;

  if (!locationId) {
    const envLocationId = process.env.REVIVE_GHL_LOCATION_ID?.trim();
    if (envLocationId) {
      diagnostics.push("Using REVIVE_GHL_LOCATION_ID from environment.");
      locationId = envLocationId;
      locationSource = "env";
    }
  }

  let baseUrl = sanitizeBaseUrl(config.baseUrl || DEFAULT_BASE_URL);
  let authMethod: AuthHeader = {
    header: "Authorization",
    value: `Bearer ${config.apiKey}`,
    label: "Authorization: Bearer <token>",
  };
  let authCandidates: AuthHeader[] = [authMethod];

  if (tokenType === "jwt" && !locationId) {
    diagnostics.push("Detected JWT token. Attempting to decode location_id.");
    try {
      const parts = config.apiKey.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(
          Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString()
        );
        if (payload.location_id || payload.locationId) {
          locationId = payload.location_id || payload.locationId;
          locationSource = "jwt";
          diagnostics.push(`✅ Extracted location_id ${locationId} from JWT payload.`);
        }
      }
    } catch (error) {
      diagnostics.push(
        `⚠️ Could not decode JWT payload: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  if (tokenType === "pit") {
    diagnostics.push("🔐 Detected Private Integration Token (PIT). Resolving auth context.");
    const pitContext = await resolvePitContext(config.apiKey, baseUrl, diagnostics);
    baseUrl = sanitizeBaseUrl(pitContext.baseUrl || baseUrl);
    authMethod = pitContext.authMethod ?? authMethod;
    authCandidates = dedupeAuthHeaders([
      pitContext.authMethod ?? authMethod,
      ...(pitContext.authCandidates ?? authCandidates),
    ]);
    if (!locationId && pitContext.locationId) {
      locationId = pitContext.locationId;
      locationSource = "pit";
    }
  } else {
    authCandidates = dedupeAuthHeaders(authCandidates);
  }

  if (!locationId) {
    const fallbackLocation =
      process.env.REVIVE_GHL_FALLBACK_LOCATION_ID?.trim() || HARDCODED_FALLBACK_LOCATION_ID;
    if (fallbackLocation) {
      locationId = fallbackLocation;
      locationSource = "fallback";
      diagnostics.push(
        "⚠️ Using fallback location_id. Set REVIVE_GHL_LOCATION_ID to override this value."
      );
    }
  }

  const versionedBaseUrl = ensureVersionedBase(baseUrl);

  return {
    config,
    authMethod,
    authCandidates,
    baseUrl,
    versionedBaseUrl,
    locationId: locationId || undefined,
    locationSource,
    tokenType,
    tokenPreview,
    diagnostics,
  };
}

/**
 * Send an email through GoHighLevel
 */
export async function sendGhlEmail(options: GhlEmailOptions): Promise<GhlEmailResponse> {
  try {
    const context = await resolveGhlContext({ locationId: options.locationId });

    if (!context.locationId) {
      return {
        success: false,
        error:
          "Location ID is required. Provide locationId in options or set REVIVE_GHL_LOCATION_ID for PIT tokens.",
      };
    }

    console.log(
      `📨 Sending GHL email for ${options.to} (location ${context.locationId}, auth ${context.authMethod.label}, base ${context.versionedBaseUrl})`
    );

    let contactId: string | null = null;
    try {
      const contactsBase = joinUrl(context.versionedBaseUrl, "contacts");
      const contactSearchUrl = `${joinUrl(
        contactsBase,
        "search"
      )}?locationId=${context.locationId}&email=${encodeURIComponent(options.to)}`;

      console.log(`🔍 Searching for contact: ${contactSearchUrl}`);
      const searchResult = await fetchWithAuthRotation(context, contactSearchUrl, {
        method: "GET",
      });

      console.log(
        `📡 Contact search -> ${searchResult.status} ${searchResult.statusText} (${searchResult.authUsed.label})`
      );

      if (searchResult.status >= 200 && searchResult.status < 300) {
        const contactData = safeJsonParse<any>(searchResult.text);
        if (contactData?.contacts?.length) {
          contactId = contactData.contacts[0].id;
          console.log(`✅ Found existing contact ${contactId}`);
        }
      } else if (searchResult.text) {
        console.warn(`⚠️ Contact search failed: ${searchResult.text.substring(0, 200)}`);
      }

      if (!contactId) {
        const createUrl = `${contactsBase}?locationId=${context.locationId}`;
        console.log(`📝 Creating contact via ${createUrl}`);
        const createResult = await fetchWithAuthRotation(context, createUrl, {
          method: "POST",
          body: JSON.stringify({
            email: options.to,
            firstName: options.to.split("@")[0] || "Invoice",
          }),
        });
        console.log(
          `📡 Contact create -> ${createResult.status} ${createResult.statusText} (${createResult.authUsed.label})`
        );

        if (createResult.status >= 200 && createResult.status < 300) {
          const newContact = safeJsonParse<any>(createResult.text);
          contactId = newContact?.contact?.id || newContact?.id;
          if (contactId) {
            console.log(`✅ Created contact ${contactId}`);
          }
        } else if (createResult.text) {
          console.warn(`⚠️ Contact creation failed: ${createResult.text.substring(0, 200)}`);
        }
      }
    } catch (contactError) {
      console.error("❌ Contact lookup/create failed:", contactError);
    }

    const baseEmailPayload = {
      ...(contactId && { contactId }),
      to: options.to,
      subject: options.subject,
      htmlBody: options.html,
      textBody: options.text,
      from: options.from,
      fromName: options.fromName,
      replyTo: options.replyTo || options.from,
    };

    const endpoints = [
      ...(contactId
        ? [
            {
              url: joinUrl(context.versionedBaseUrl, "conversations/messages"),
              body: {
                locationId: context.locationId,
                contactId,
                channel: "EMAIL",
                message: options.html || options.text || options.subject,
                subject: options.subject,
                direction: "OUTBOUND",
              },
            },
          ]
        : []),
      {
        url: `${SERVICES_BASE_URL}/conversations/messages/email?locationId=${context.locationId}`,
        body: baseEmailPayload,
      },
      {
        url: joinUrl(context.versionedBaseUrl, "conversations/messages/email"),
        body: {
          locationId: context.locationId,
          ...baseEmailPayload,
        },
      },
      {
        url: `${SERVICES_BASE_URL}/emails?locationId=${context.locationId}`,
        body: baseEmailPayload,
      },
      {
        url: joinUrl(context.versionedBaseUrl, "emails"),
        body: {
          locationId: context.locationId,
          ...baseEmailPayload,
        },
      },
    ];

    let successfulResponse: AuthenticatedFetchResult | null = null;
    let successMetadata: { endpoint: string } | null = null;
    let lastError = "";

    for (const endpoint of endpoints) {
      console.log(`🔁 Trying GHL email endpoint ${endpoint.url}`);
      try {
        const attempt = await fetchWithAuthRotation(context, endpoint.url, {
          method: "POST",
          body: JSON.stringify(endpoint.body),
        });
        if (attempt.status >= 200 && attempt.status < 300) {
          successfulResponse = attempt;
          successMetadata = { endpoint: endpoint.url };
          console.log(`✅ Email endpoint succeeded: ${endpoint.url}`);
          break;
        }
        lastError = `${endpoint.url} -> ${attempt.status} ${attempt.statusText}: ${attempt.text.substring(
          0,
          200
        )}`;
        console.warn(`⚠️ Endpoint failed: ${lastError}`);
      } catch (error) {
        lastError = `${endpoint.url} -> ${error instanceof Error ? error.message : String(error)}`;
        console.error(`❌ Endpoint error: ${lastError}`);
      }
    }

    if (!successfulResponse || !successMetadata) {
      return {
        success: false,
        error: lastError || "All GHL email endpoints failed. Check token scopes and locationId.",
      };
    }

    const payload = safeJsonParse<Record<string, any>>(successfulResponse.text);
    if (!payload) {
      return {
        success: false,
        error: `GHL API returned non-JSON response: ${successfulResponse.status} ${successfulResponse.statusText}`,
      };
    }

    console.log("✅ GHL Email sent successfully:", {
      endpoint: successMetadata.endpoint,
      messageId: payload.messageId || payload.id || payload.emailId,
      to: options.to,
    });

    return {
      success: true,
      messageId: payload.messageId || payload.id || payload.emailId,
    };
  } catch (error) {
    console.error("Error sending email via GHL:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error sending email",
    };
  }
}

/**
 * Trigger GHL workflow by updating contact with custom fields and tag
 * This is a workaround when the Conversations Email API is not available on the plan
 */
export interface GhlWorkflowTriggerOptions {
  to: string;
  invoiceNumber: string;
  invoiceAmount: string;
  invoiceDueDate: string;
  invoicePayLink: string;
  customerName?: string;
  locationId?: string;
}

export interface GhlWorkflowTriggerResponse {
  success: boolean;
  contactId?: string;
  error?: string;
}

export async function triggerGhlWorkflowEmail(
  options: GhlWorkflowTriggerOptions
): Promise<GhlWorkflowTriggerResponse> {
  try {
    const context = await resolveGhlContext({ locationId: options.locationId });

    if (!context.locationId) {
      return {
        success: false,
        error:
          "Location ID is required. Provide locationId in options or set REVIVE_GHL_LOCATION_ID for PIT tokens.",
      };
    }

    console.log(
      `📨 Triggering GHL workflow for ${options.to} (location ${context.locationId}, auth ${context.authMethod.label}, base ${context.versionedBaseUrl})`
    );

    // Find or create contact
    let contactId: string | null = null;
    const contactsBase = joinUrl(context.versionedBaseUrl, "contacts");
    const contactSearchUrl = `${joinUrl(
      contactsBase,
      "search"
    )}?locationId=${context.locationId}&email=${encodeURIComponent(options.to)}`;

    console.log(`🔍 Searching for contact: ${contactSearchUrl}`);
    const searchResult = await fetchWithAuthRotation(context, contactSearchUrl, {
      method: "GET",
    });

    console.log(
      `📡 Contact search -> ${searchResult.status} ${searchResult.statusText} (${searchResult.authUsed.label})`
    );

    if (searchResult.status >= 200 && searchResult.status < 300) {
      const contactData = safeJsonParse<any>(searchResult.text);
      if (contactData?.contacts?.length) {
        contactId = contactData.contacts[0].id;
        console.log(`✅ Found existing contact ${contactId}`);
      }
    } else if (searchResult.text) {
      console.warn(`⚠️ Contact search failed: ${searchResult.text.substring(0, 200)}`);
    }

    // Create contact if not found
    if (!contactId) {
      const createUrl = `${contactsBase}?locationId=${context.locationId}`;
      console.log(`📝 Creating contact via ${createUrl}`);
      
      const firstName = options.customerName?.split(" ")[0] || options.to.split("@")[0] || "Invoice";
      const lastName = options.customerName?.split(" ").slice(1).join(" ") || "";

      const createResult = await fetchWithAuthRotation(context, createUrl, {
        method: "POST",
        body: JSON.stringify({
          email: options.to,
          firstName,
          ...(lastName && { lastName }),
        }),
      });

      console.log(
        `📡 Contact create -> ${createResult.status} ${createResult.statusText} (${createResult.authUsed.label})`
      );

      if (createResult.status >= 200 && createResult.status < 300) {
        const newContact = safeJsonParse<any>(createResult.text);
        contactId = newContact?.contact?.id || newContact?.id;
        if (contactId) {
          console.log(`✅ Created contact ${contactId}`);
        }
      } else if (createResult.text) {
        console.warn(`⚠️ Contact creation failed: ${createResult.text.substring(0, 200)}`);
      }
    }

    if (!contactId) {
      return {
        success: false,
        error: "Failed to find or create contact. Cannot trigger workflow.",
      };
    }

    // Update contact with custom fields and tag to trigger workflow
    const updateUrl = `${contactsBase}/${contactId}?locationId=${context.locationId}`;
    console.log(`🏷️  Updating contact ${contactId} with invoice data and tag`);

    // Build custom fields object
    // Note: GHL custom fields can use different formats:
    // 1. Array format: customField: [{ name: "Field Name", value: "value" }]
    // 2. Object format: customField: { "Field Name": "value" }
    // 3. Direct format: { "Field Name": "value" } (if field name matches exactly)
    // We'll try multiple formats to ensure compatibility
    const basePayload = {
      email: options.to,
      tags: ["invoice:send"], // This triggers the workflow
    };

    // Try alternative payload formats for custom fields
    const updatePayloadAlternatives = [
      // Format 1: Array of custom field objects
      {
        ...basePayload,
        customField: [
          { name: "Invoice Number", value: options.invoiceNumber },
          { name: "Invoice Amount", value: options.invoiceAmount },
          { name: "Invoice Due Date", value: options.invoiceDueDate },
          { name: "Invoice Pay Link", value: options.invoicePayLink },
        ],
      },
      // Format 2: Object with field names as keys
      {
        ...basePayload,
        customField: {
          "Invoice Number": options.invoiceNumber,
          "Invoice Amount": options.invoiceAmount,
          "Invoice Due Date": options.invoiceDueDate,
          "Invoice Pay Link": options.invoicePayLink,
        },
      },
      // Format 3: Direct field assignment (may work if field names match exactly)
      {
        ...basePayload,
        "Invoice Number": options.invoiceNumber,
        "Invoice Amount": options.invoiceAmount,
        "Invoice Due Date": options.invoiceDueDate,
        "Invoice Pay Link": options.invoicePayLink,
      },
      // Format 4: lowercase/underscore variants
      {
        ...basePayload,
        customField: {
          "invoice_number": options.invoiceNumber,
          "invoice_amount": options.invoiceAmount,
          "invoice_due_date": options.invoiceDueDate,
          "invoice_pay_link": options.invoicePayLink,
        },
      },
    ];

    let updateSuccess = false;
    for (const payload of updatePayloadAlternatives) {
      try {
        const updateResult = await fetchWithAuthRotation(context, updateUrl, {
          method: "PUT",
          body: JSON.stringify(payload),
        });

        console.log(
          `📡 Contact update -> ${updateResult.status} ${updateResult.statusText} (${updateResult.authUsed.label})`
        );

        if (updateResult.status >= 200 && updateResult.status < 300) {
          updateSuccess = true;
          console.log(`✅ Contact updated successfully. Workflow should trigger.`);
          break;
        } else if (updateResult.text) {
          console.warn(`⚠️ Update attempt failed: ${updateResult.text.substring(0, 200)}`);
        }
      } catch (updateError) {
        console.error(`❌ Update error: ${updateError instanceof Error ? updateError.message : String(updateError)}`);
      }
    }

    if (!updateSuccess) {
      // Fallback: Try just adding the tag without custom fields
      console.log(`🔄 Fallback: Trying to add tag only`);
      const tagOnlyPayload = {
        tags: ["invoice:send"],
      };

      const tagResult = await fetchWithAuthRotation(context, updateUrl, {
        method: "PUT",
        body: JSON.stringify(tagOnlyPayload),
      });

      if (tagResult.status >= 200 && tagResult.status < 300) {
        console.log(`✅ Tag added successfully. Workflow should trigger.`);
        return {
          success: true,
          contactId,
        };
      }

      return {
        success: false,
        error: `Failed to update contact. Last response: ${tagResult.status} ${tagResult.statusText}`,
      };
    }

    return {
      success: true,
      contactId,
    };
  } catch (error) {
    console.error("Error triggering GHL workflow:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error triggering workflow",
    };
  }
}

/**
 * Get email status from GHL
 */
export async function getGhlEmailStatus(messageId: string, locationId?: string): Promise<{
  success: boolean;
  status?: string;
  error?: string;
}> {
  try {
    const context = await resolveGhlContext({ locationId });

    if (!context.locationId) {
      return {
        success: false,
        error: "Location ID is required to fetch email status.",
      };
    }

    const statusEndpoints = [
      `${SERVICES_BASE_URL}/emails/${messageId}?locationId=${context.locationId}`,
      `${joinUrl(context.versionedBaseUrl, `emails/${messageId}`)}?locationId=${context.locationId}`,
    ];

    let lastError = "";

    for (const endpoint of statusEndpoints) {
      try {
        const attempt = await fetchWithAuthRotation(context, endpoint, {
          method: "GET",
        });

        if (attempt.status >= 200 && attempt.status < 300) {
          const data = safeJsonParse<any>(attempt.text);
          return {
            success: true,
            status: data?.status || data?.data?.status || "unknown",
          };
        }

        lastError = `${endpoint} -> ${attempt.status} ${attempt.statusText}: ${attempt.text.substring(0, 200)}`;
      } catch (error) {
        lastError = `${endpoint} -> ${error instanceof Error ? error.message : String(error)}`;
      }
    }

    return {
      success: false,
      error: lastError || "Failed to fetch email status",
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

