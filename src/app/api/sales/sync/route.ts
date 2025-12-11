/**
 * API route for syncing sales leads from client to server
 * This allows the AI assistant to access sales data
 * 
 * @route POST /api/sales/sync
 * @body { leads: SalesLead[] }
 * @returns { success: boolean, data?: { synced: number, total: number }, error?: string }
 */

import { NextRequest } from "next/server";
import { persistSalesSnapshot } from "@/lib/data-adapters/sales";
import { createErrorResponse, createSuccessResponse } from "@/lib/utils/api";
import { validateData, SalesLeadSchema } from "@/lib/utils/validation";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { leads } = body;

    if (!Array.isArray(leads)) {
      return createErrorResponse("Leads array required", "INVALID_INPUT", 400);
    }

    // Validate each lead
    const validatedLeads = [];
    for (const lead of leads) {
      const result = validateData(SalesLeadSchema, lead);
      if (!result.success) {
        console.warn(`Invalid lead data: ${result.error}`, lead);
        continue; // Skip invalid leads
      }
      validatedLeads.push(result.data);
    }

    await persistSalesSnapshot({ leads: validatedLeads });

    return createSuccessResponse({ synced: validatedLeads.length, total: leads.length });
  } catch (error) {
    console.error("Failed to sync sales leads:", error);
    return createErrorResponse(
      error instanceof Error ? error.message : "Failed to sync sales leads",
      "SYNC_ERROR",
      500
    );
  }
}

