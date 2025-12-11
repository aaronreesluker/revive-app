"use server";

import { NextResponse } from "next/server";
import { getAssistantContext } from "@/lib/assistant-context";

export async function GET() {
  try {
    const context = await getAssistantContext();
    return NextResponse.json(context);
  } catch (error) {
    console.error("Failed to build assistant context", error);
    return NextResponse.json({ error: "Unable to build assistant context" }, { status: 500 });
  }
}

