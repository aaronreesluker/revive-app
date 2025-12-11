/**
 * Script to create initial admin account for Aaron
 * Run with: npx tsx scripts/create-admin.ts
 * 
 * This creates Aaron's admin account directly in Supabase
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("❌ Missing Supabase configuration!");
  console.error("Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function createAdminAccount() {
  const email = "aaron@revivemarketing.uk";
  const password = process.env.ADMIN_INITIAL_PASSWORD || "Revive!2024"; // Change this!
  const name = "Aaron";

  console.log("🔐 Creating admin account for Aaron...");
  console.log(`Email: ${email}`);

  try {
    // Create user in Supabase Auth
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
      },
    });

    if (createError) {
      if (createError.message.includes("already registered")) {
        console.log("ℹ️  User already exists, updating profile...");
        
        // Get existing user
        const { data: existingUser } = await adminClient.auth.admin.listUsers();
        const user = existingUser?.users.find(u => u.email === email);
        
        if (!user) {
          console.error("❌ Could not find existing user");
          process.exit(1);
        }

        // Update profile
        const { error: profileError } = await adminClient
          .from("profiles")
          .update({
            name,
            role: "admin",
            email,
            tenant_id: "default-tenant",
          })
          .eq("id", user.id);

        if (profileError) {
          console.error("❌ Error updating profile:", profileError);
          process.exit(1);
        }

        console.log("✅ Profile updated successfully!");
        console.log(`\n📧 Login credentials:`);
        console.log(`   Email: ${email}`);
        console.log(`   Password: ${password}`);
        return;
      }
      
      console.error("❌ Error creating user:", createError);
      process.exit(1);
    }

    if (!newUser.user) {
      console.error("❌ Failed to create user");
      process.exit(1);
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
      console.error("❌ Error updating profile:", profileError);
      process.exit(1);
    }

    console.log("✅ Admin account created successfully!");
    console.log(`\n📧 Login credentials:`);
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`\n⚠️  Please change your password after first login!`);
  } catch (error) {
    console.error("❌ Unexpected error:", error);
    process.exit(1);
  }
}

createAdminAccount();

