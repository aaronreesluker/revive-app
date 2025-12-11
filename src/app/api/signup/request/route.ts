import { NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminClient } from "@/lib/supabase/server";
import { sendGhlEmail } from "@/lib/ghl/email";
import { ADMIN_EMAILS } from "@/lib/admin";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, name, phone, password } = body as {
      email: string;
      name: string;
      phone: string;
      password: string;
    };

    if (!email || !name || !phone || !password) {
      return NextResponse.json(
        { error: "Email, name, phone, and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

        // Use admin client to check for existing signups (bypasses RLS)
        const adminClient = await createAdminClient();
    
    if (!adminClient) {
      return NextResponse.json(
        { error: "Database not configured. Please contact support." },
        { status: 500 }
      );
    }

    // Check if email already exists in pending signups
    const { data: existingPending, error: pendingError } = await adminClient
      .from("pending_signups")
      .select("id, status")
      .eq("email", email.toLowerCase())
      .maybeSingle();

    if (pendingError && pendingError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error("Error checking pending signups:", pendingError);
      return NextResponse.json(
        { error: `Database error: ${pendingError.message}` },
        { status: 500 }
      );
    }

    if (existingPending) {
      if (existingPending.status === "pending") {
        return NextResponse.json(
          { error: "A signup request for this email is already pending approval. Please wait for admin approval or contact support." },
          { status: 400 }
        );
      }
      if (existingPending.status === "approved") {
        return NextResponse.json(
          { error: "This email has already been approved. Please check your email for login instructions or try logging in." },
          { status: 400 }
        );
      }
      // If rejected, allow resubmission by deleting the old record first
      if (existingPending.status === "rejected") {
        const { error: deleteError } = await adminClient
          .from("pending_signups")
          .delete()
          .eq("id", existingPending.id);
        
        if (deleteError) {
          console.error("Error deleting rejected signup:", deleteError);
          return NextResponse.json(
            { error: "A previous signup request was rejected. Please contact support to resubmit." },
            { status: 400 }
          );
        }
        // Continue to create new signup request below
      }
    }

    // Create pending signup request
    // Note: We store the password temporarily. In production, consider encrypting it.
    // The password will be used when the admin approves the account.
    let signupId: string;
    
    const { data: signup, error } = await adminClient
      .from("pending_signups")
      .insert({
        email: email.toLowerCase(),
        name,
        phone: phone,
        reason: password, // Temporarily store password in reason field (will be moved to dedicated field)
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating pending signup:", error);
      
      // Handle duplicate key error specifically
      if (error.code === '23505') { // Unique constraint violation
        return NextResponse.json(
          { error: "A signup request for this email already exists. Please wait for admin approval or contact support if you believe this is an error." },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: `Failed to create signup request: ${error.message || error.code || JSON.stringify(error)}` },
        { status: 500 }
      );
    }

    signupId = signup.id;

    // Send approval email to all admins
    const approvalUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001"}/admin/approve-signup/${signupId}`;
    
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #00b3b3;">New Staff Account Signup Request</h2>
        <p>A new staff member has requested access to Revive Console:</p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone:</strong> ${phone}</p>
        </div>
        <div style="margin: 30px 0;">
          <a href="${approvalUrl}" 
             style="background: #00b3b3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-right: 10px;">
            Verify & Create Account
          </a>
          <a href="${approvalUrl.replace('/approve-signup/', '/reject-signup/')}" 
             style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Reject Request
          </a>
        </div>
        <p style="color: #666; font-size: 12px;">
          Or copy this link: ${approvalUrl}
        </p>
      </div>
    `;

    const emailText = `
New Staff Account Signup Request

A new staff member has requested access to Revive Console:

Name: ${name}
Email: ${email}
Phone: ${phone}

Verify & Create Account: ${approvalUrl}
Reject: ${approvalUrl.replace('/approve-signup/', '/reject-signup/')}
    `;

    // Send email to all admins (non-blocking - don't fail signup if email fails)
    // Email will be sent if GHL API key is configured, otherwise just log the URL
    ADMIN_EMAILS.forEach(adminEmail => {
      // Wrap in try-catch since sendGhlEmail might throw synchronously
      (async () => {
        try {
          const result = await sendGhlEmail({
            to: adminEmail,
            subject: `New Revive Console Signup Request - ${name}`,
            html: emailHtml,
            text: emailText,
            fromName: "Revive Console",
          });
          if (!result.success) {
            console.warn(`Failed to send email to ${adminEmail}:`, result.error);
            console.log(`📧 Manual approval URL: ${approvalUrl}`);
          }
        } catch (error) {
          console.warn(`Failed to send approval email to ${adminEmail}:`, error instanceof Error ? error.message : String(error));
          // Log the approval URL so Aaron can manually approve
          console.log(`📧 Manual approval URL for ${name}: ${approvalUrl}`);
        }
      })();
    });

    return NextResponse.json({
      success: true,
      message: "Signup request submitted successfully. You will receive an email once your account is approved.",
      signupId,
    });
  } catch (error) {
    console.error("Signup request error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to process signup request: ${errorMessage}` },
      { status: 500 }
    );
  }
}

