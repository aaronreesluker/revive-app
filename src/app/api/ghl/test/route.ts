/**
 * API Route: GET /api/ghl/test
 * Test GoHighLevel API connection and extract location_id from JWT
 */

import { NextResponse } from "next/server";
import { resolveGhlContext } from "@/lib/ghl/email";

export async function GET() {
  try {
    const context = await resolveGhlContext();

    return NextResponse.json({
      success: true,
      message: "GHL API key is configured",
      hasApiKey: true,
      apiKeyPrefix: context.tokenPreview,
      locationId: context.locationId,
      locationSource: context.locationSource,
      environment: context.config.environment,
      baseUrl: context.baseUrl,
      versionedBaseUrl: context.versionedBaseUrl,
      tokenType: context.tokenType,
      authHeader: context.authMethod.header,
      authStrategy: context.authMethod.label,
      diagnostics: context.diagnostics.slice(-10),
      nextSteps: context.locationId
        ? "✅ Ready to send emails! Location ID resolved."
        : "⚠️ Configure REVIVE_GHL_LOCATION_ID or regenerate a token tied to a location.",
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

