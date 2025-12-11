import { NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";

/**
 * POST /api/users/sync-profiles
 * Sync missing profiles for all auth users (admin only)
 * This fixes cases where users were created but profiles weren't
 */
export async function POST() {
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

    const adminClient = await createAdminClient();
    if (!adminClient) {
      return NextResponse.json(
        { error: "Admin client not configured" },
        { status: 500 }
      );
    }

    // Get all auth users
    const { data: authUsers, error: authError } = await adminClient.auth.admin.listUsers();
    
    if (authError) {
      return NextResponse.json(
        { error: `Failed to list users: ${authError.message}` },
        { status: 500 }
      );
    }

    // Get all existing profiles
    const { data: existingProfiles } = await adminClient
      .from("profiles")
      .select("id, email");

    const existingProfileIds = new Set(existingProfiles?.map((p: any) => p.id) || []);
    
    const synced: string[] = [];
    const errors: string[] = [];

    // Create missing profiles
    for (const authUser of authUsers.users) {
      if (!existingProfileIds.has(authUser.id)) {
        const { error: insertError } = await adminClient
          .from("profiles")
          .insert({
            id: authUser.id,
            email: authUser.email,
            name: authUser.user_metadata?.name || authUser.email?.split("@")[0] || "User",
            role: isAdminEmail(authUser.email) ? "admin" : "sales",
            tenant_id: "default-tenant",
          });

        if (insertError) {
          errors.push(`${authUser.email}: ${insertError.message}`);
        } else {
          synced.push(authUser.email || authUser.id);
        }
      }
    }

    // Also update any profiles missing email
    const { data: profilesWithoutEmail } = await adminClient
      .from("profiles")
      .select("id")
      .is("email", null);

    for (const p of profilesWithoutEmail || []) {
      const authUser = authUsers.users.find((u: any) => u.id === p.id);
      if (authUser?.email) {
        await adminClient
          .from("profiles")
          .update({ email: authUser.email })
          .eq("id", p.id);
        synced.push(`Updated email for ${authUser.email}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${synced.length} profiles`,
      synced,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Sync profiles error:", error);
    return NextResponse.json(
      { error: `Failed to sync profiles: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 }
    );
  }
}

