import { NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";

/**
 * POST /api/users/create
 * Create a new user account (admin only)
 */
export async function POST(request: Request) {
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

    const body = await request.json();
    const { email, name, phone, password, role } = body as {
      email: string;
      name: string;
      phone?: string;
      password: string;
      role: "admin" | "sales";
    };

    // Validate required fields
    if (!email || !name || !password) {
      return NextResponse.json(
        { error: "Email, name, and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const userRole = role || "sales";

    // Create user with admin client
    const adminClient = await createAdminClient();
    if (!adminClient) {
      return NextResponse.json(
        { error: "Admin client not configured" },
        { status: 500 }
      );
    }

    // Check if user already exists
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const existingUser = existingUsers?.users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());

    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 400 }
      );
    }

    // Create the user
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email: email.toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: {
        name,
      },
    });

    if (createError || !newUser.user) {
      console.error("Error creating user:", createError);
      return NextResponse.json(
        { error: `Failed to create user: ${createError?.message || "Unknown error"}` },
        { status: 500 }
      );
    }

    // Update or create profile with role and additional info
    // First check if profile exists (might be auto-created by trigger)
    const { data: existingProfile } = await adminClient
      .from("profiles")
      .select("id")
      .eq("id", newUser.user.id)
      .single();

    if (existingProfile) {
      // Update existing profile
      const { error: updateError } = await adminClient
        .from("profiles")
        .update({
          name,
          email: email.toLowerCase(),
          phone: phone || null,
          role: userRole,
          tenant_id: "default-tenant",
        })
        .eq("id", newUser.user.id);

      if (updateError) {
        console.error("Error updating profile:", updateError);
      }
    } else {
      // Create new profile
      const { error: insertError } = await adminClient
        .from("profiles")
        .insert({
          id: newUser.user.id,
          name,
          email: email.toLowerCase(),
          phone: phone || null,
          role: userRole,
          tenant_id: "default-tenant",
        });

      if (insertError) {
        console.error("Error creating profile:", insertError);
      }
    }

    return NextResponse.json({
      success: true,
      message: "User created successfully",
      user: {
        id: newUser.user.id,
        email: newUser.user.email,
        name,
        role: userRole,
      },
    });
  } catch (error) {
    console.error("Create user error:", error);
    return NextResponse.json(
      { error: `Failed to create user: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 }
    );
  }
}

