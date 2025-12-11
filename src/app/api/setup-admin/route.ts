import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * One-time setup route to create Aaron's admin account
 * Call this once: POST /api/setup-admin with { password: "YourSecurePassword" }
 * Then delete this file for security
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { password } = body as { password: string };

    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const adminClient = await createAdminClient();
    if (!adminClient) {
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 500 }
      );
    }

    const email = "aaron@revivemarketing.uk";
    const name = "Aaron";

    // Check if user already exists
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const existingUser = existingUsers?.users.find((u: any) => u.email === email);

    if (existingUser) {
      // User exists, just update profile to admin
      const { error: profileError } = await adminClient
        .from("profiles")
        .update({
          name,
          role: "admin",
          email,
          tenant_id: "default-tenant",
        })
        .eq("id", existingUser.id);

      if (profileError) {
        return NextResponse.json(
          { error: `Failed to update profile: ${profileError.message}` },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Admin account already exists. Profile updated to admin role.",
        email,
        note: "You can now log in with your existing password.",
      });
    }

    // Create new user
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
      },
    });

    if (createError || !newUser.user) {
      return NextResponse.json(
        { error: `Failed to create user: ${createError?.message || "Unknown error"}` },
        { status: 500 }
      );
    }

    // Update profile with admin role
    const { error: profileError } = await adminClient
      .from("profiles")
      .update({
        name,
        role: "admin",
        phone: null,
        tenant_id: "default-tenant",
      })
      .eq("id", newUser.user.id);

    if (profileError) {
      return NextResponse.json(
        { error: `Failed to update profile: ${profileError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Admin account created successfully!",
      email,
      password: password, // Return password so you can copy it
      note: "You can now log in at /login",
    });
  } catch (error) {
    console.error("Setup admin error:", error);
    return NextResponse.json(
      { error: `Failed to setup admin: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 }
    );
  }
}

