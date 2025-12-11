import { NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminClient } from "@/lib/supabase/server";
import { sendGhlEmail } from "@/lib/ghl/email";
import { isAdminEmail } from "@/lib/admin";

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 500 }
      );
    }

    // Check if user is admin (Aaron)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized - Please log in first" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, email")
      .eq("id", user.id)
      .single();

    if (!profile || !isAdminEmail((profile as any).email)) {
      return NextResponse.json({ error: "Only admins can approve accounts" }, { status: 403 });
    }

    const body = await request.json();
    const { signupId, password, role } = body as {
      signupId: string;
      password?: string; // Optional - will use password from pending signup if not provided
      role?: "admin" | "sales"; // Role for the new user (defaults to "sales")
    };
    
    const userRole = role || "sales"; // Default to sales if not specified

    if (!signupId) {
      return NextResponse.json(
        { error: "Signup ID is required" },
        { status: 400 }
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
        { error: "Signup request not found" },
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

    // Use password from request or from pending signup (stored in reason field temporarily)
    const accountPassword = password || signup.reason;
    if (!accountPassword) {
      return NextResponse.json(
        { error: "Password is required to create account" },
        { status: 400 }
      );
    }

    // Create user account in Supabase Auth
    const adminClient = await createAdminClient();
    if (!adminClient) {
      return NextResponse.json(
        { error: "Admin client not configured" },
        { status: 500 }
      );
    }

    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email: signup.email,
      password: accountPassword,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        name: signup.name,
      },
    });

    if (createError || !newUser.user) {
      console.error("Error creating user:", createError);
      return NextResponse.json(
        { error: "Failed to create user account" },
        { status: 500 }
      );
    }

    // Update profile with additional info and role (use adminClient to bypass RLS)
    // First check if profile exists, if not create it
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
          name: signup.name,
          email: signup.email,
          phone: signup.phone,
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
          name: signup.name,
          email: signup.email,
          phone: signup.phone,
          role: userRole,
          tenant_id: "default-tenant",
        });
      
      if (insertError) {
        console.error("Error creating profile:", insertError);
      }
    }

    // Update pending signup status and clear password from reason field
    await adminClient
      .from("pending_signups")
      .update({
        status: "approved",
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        reason: null, // Clear password that was stored here
      } as any)
      .eq("id", signupId);

    // Send welcome email to new user
    const welcomeHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #00b3b3;">Welcome to Revive Console!</h2>
        <p>Your account has been approved. You can now log in:</p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Email:</strong> ${signup.email}</p>
          <p><strong>Password:</strong> ${accountPassword}</p>
        </div>
        <div style="margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001"}/login" 
             style="background: #00b3b3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Log In Now
          </a>
        </div>
        <p style="color: #666; font-size: 12px;">
          Please change your password after your first login.
        </p>
      </div>
    `;

    await sendGhlEmail({
      to: signup.email,
      subject: "Your Revive Console Account is Ready",
      html: welcomeHtml,
      text: `Welcome to Revive Console!\n\nYour account has been approved.\n\nEmail: ${signup.email}\nPassword: ${accountPassword}\n\nLog in at: ${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001"}/login\n\nPlease change your password after your first login.`,
      fromName: "Revive Console",
    });

    return NextResponse.json({
      success: true,
      message: "Account approved and created successfully",
      userId: newUser.user.id,
      email: signup.email,
      role: userRole,
    });
  } catch (error) {
    console.error("Approve signup error:", error);
    return NextResponse.json(
      { error: "Failed to approve signup" },
      { status: 500 }
    );
  }
}

