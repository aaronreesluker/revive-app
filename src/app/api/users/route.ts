import { NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";

/**
 * GET /api/users
 * Returns all users (admin only)
 */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    
    if (!supabase) {
      console.log("[/api/users] Supabase not configured");
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    // Check if user is authenticated and is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.log("[/api/users] Auth error:", authError.message);
    }
    
    if (!user) {
      console.log("[/api/users] No user found in session");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    console.log("[/api/users] User authenticated:", user.email);

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

    // Use admin client to bypass RLS and fetch all profiles
    const adminClient = await createAdminClient();
    if (!adminClient) {
      return NextResponse.json(
        { error: "Admin client not configured" },
        { status: 500 }
      );
    }

    // Fetch all profiles using admin client (bypasses RLS)
    const { data: users, error } = await adminClient
      .from("profiles")
      .select("id, email, name, phone, role, created_at, tenant_id")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching users:", error);
      return NextResponse.json(
        { error: `Failed to fetch users: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      users: users || [],
    });
  } catch (error) {
    console.error("Users fetch error:", error);
    return NextResponse.json(
      { error: `Failed to fetch users: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 }
    );
  }
}

