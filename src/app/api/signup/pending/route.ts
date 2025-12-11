import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";

/**
 * GET /api/signup/pending
 * Returns all pending signup requests (admin only)
 */
export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    
    if (!supabase) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    // Check if user is authenticated and is admin
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get user profile to check role
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, role")
      .eq("id", user.id)
      .single();

    if (!profile || (!isAdminEmail((profile as any).email) && (profile as any).role !== "admin")) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    // Fetch pending signups
    const { data: pendingSignups, error } = await supabase
      .from("pending_signups")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching pending signups:", error);
      return NextResponse.json(
        { error: `Failed to fetch pending signups: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      pendingSignups: pendingSignups || [],
    });
  } catch (error) {
    console.error("Pending signups error:", error);
    return NextResponse.json(
      { error: `Failed to fetch pending signups: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 }
    );
  }
}

