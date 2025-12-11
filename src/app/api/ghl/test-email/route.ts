/**
 * API Route: POST /api/ghl/test-email
 * Test different GHL email endpoints to find the correct one
 */

import { NextResponse } from "next/server";
import { resolveGhlContext } from "@/lib/ghl/email";

export async function POST() {
  try {
    const context = await resolveGhlContext();

    if (!context.locationId) {
      return NextResponse.json({
        success: false,
        error: "Location ID could not be resolved. Set REVIVE_GHL_LOCATION_ID for PIT tokens.",
      }, { status: 400 });
    }

    const servicesBase = "https://services.leadconnectorhq.com";
    const versionedBase = context.versionedBaseUrl;
    const headers = {
      [context.authMethod.header]: context.authMethod.value,
      "Content-Type": "application/json",
      Accept: "application/json",
      Version: "2021-07-28",
    };

    const basePayload = {
      locationId: context.locationId,
      to: "test@example.com",
      subject: "Test Email",
      htmlBody: "<p>Integration test</p>",
      textBody: "Integration test",
    };

    const endpoints = [
      {
        name: "Services: conversations/messages/email (query locationId)",
        url: `${servicesBase}/conversations/messages/email?locationId=${context.locationId}`,
        body: basePayload,
      },
      {
        name: "REST: conversations/messages/email (body locationId)",
        url: joinUrl(versionedBase, "conversations/messages/email"),
        body: basePayload,
      },
      {
        name: "Services: emails (query locationId)",
        url: `${servicesBase}/emails?locationId=${context.locationId}`,
        body: basePayload,
      },
      {
        name: "REST: emails (body locationId)",
        url: joinUrl(versionedBase, "emails"),
        body: basePayload,
      },
    ];

    const results: Array<{
      endpoint: string;
      url: string;
      status?: number;
      statusText?: string;
      response?: unknown;
      error?: string;
      success: boolean;
    }> = [];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint.url, {
          method: "POST",
          headers,
          body: JSON.stringify(endpoint.body),
        });
        const text = await response.text();
        let parsed: unknown = text;
        const json = safeJsonParse(text);
        if (json !== null) {
          parsed = json;
        }
        results.push({
          endpoint: endpoint.name,
          url: endpoint.url,
          status: response.status,
          statusText: response.statusText,
          response: parsed,
          success: response.ok,
        });
      } catch (error) {
        results.push({
          endpoint: endpoint.name,
          url: endpoint.url,
          error: error instanceof Error ? error.message : "Unknown error",
          success: false,
        });
      }
    }

    return NextResponse.json({
      success: true,
      locationId: context.locationId,
      tokenType: context.tokenType,
      authHeader: context.authMethod.header,
      diagnostics: context.diagnostics.slice(-10),
      results,
      recommendation: results.find((r) => r.success)?.endpoint || "No working endpoint found",
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

function joinUrl(baseUrl: string, path: string) {
  const trimmedBase = baseUrl.replace(/\/+$/, "");
  const trimmedPath = path.replace(/^\/+/, "");
  return `${trimmedBase}/${trimmedPath}`;
}

function safeJsonParse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

