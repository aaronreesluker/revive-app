import { NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { signupId, reason } = body as {
      signupId: string;
      reason?: string | null;
    };

    if (!signupId) {
      return NextResponse.json(
        { error: "Signup ID is required" },
        { status: 400 }
      );
    }

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

    // Get pending signup
    const { data: pendingSignup, error: fetchError } = await supabase
      .from("pending_signups")
      .select("*")
      .eq("id", signupId)
      .single();

    if (fetchError || !pendingSignup) {
      return NextResponse.json(
        { error: "Pending signup not found" },
        { status: 404 }
      );
    }

    const signup = pendingSignup as any;
    if (signup.status !== "pending") {
      return NextResponse.json(
        { error: `This signup request has already been ${signup.status}` },
        { status: 400 }
      );
    }

    // Update pending signup status to rejected (use admin client to bypass RLS)
    const adminClient = await createAdminClient();
    if (!adminClient) {
      return NextResponse.json(
        { error: "Admin client not configured" },
        { status: 500 }
      );
    }

    const { error: updateError } = await adminClient
      .from("pending_signups")
      .update({
        status: "rejected",
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        rejection_reason: reason || null,
      } as any)
      .eq("id", signupId);

    if (updateError) {
      console.error("Error rejecting signup:", updateError);
      return NextResponse.json(
        { error: `Failed to reject signup: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Signup request rejected",
      email: signup.email,
    });
  } catch (error) {
    console.error("Reject signup error:", error);
    return NextResponse.json(
      { error: `Failed to reject signup: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 }
    );
  }
}

