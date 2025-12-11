import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * Cleanup endpoint to delete a pending signup by email
 * This is useful for cleaning up test signups or stuck requests
 * Usage: POST /api/signup/cleanup with { email: "user@example.com" }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body as { email: string };

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

            const adminClient = await createAdminClient();
    if (!adminClient) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    // Find and delete the pending signup
    const { data: deleted, error } = await adminClient
      .from("pending_signups")
      .delete()
      .eq("email", email.toLowerCase())
      .select();

    if (error) {
      console.error("Error deleting pending signup:", error);
      return NextResponse.json(
        { error: `Failed to delete pending signup: ${error.message}` },
        { status: 500 }
      );
    }

    if (!deleted || deleted.length === 0) {
      return NextResponse.json({
        success: true,
        message: `No pending signup found for ${email}`,
        deleted: false,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Pending signup for ${email} has been deleted`,
      deleted: true,
      deletedCount: deleted.length,
    });
  } catch (error) {
    console.error("Cleanup error:", error);
    return NextResponse.json(
      { error: `Failed to cleanup: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 }
    );
  }
}

