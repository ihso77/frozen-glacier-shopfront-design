import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const ownerEmail = "piohio309j@gmail.com";
    const ownerPassword = "HassanMohd2012!";

    console.log("Checking if owner account exists...");

    // Check if owner already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingOwner = existingUsers?.users?.find(u => u.email === ownerEmail);

    if (existingOwner) {
      console.log("Owner account already exists");
      
      // Make sure they have owner role
      const { data: existingRole } = await supabaseAdmin
        .from("user_roles")
        .select("*")
        .eq("user_id", existingOwner.id)
        .maybeSingle();

      if (!existingRole) {
        await supabaseAdmin.from("user_roles").insert({
          user_id: existingOwner.id,
          role: "owner",
        });
      } else if (existingRole.role !== "owner") {
        await supabaseAdmin
          .from("user_roles")
          .update({ role: "owner" })
          .eq("user_id", existingOwner.id);
      }

      return new Response(
        JSON.stringify({ success: true, message: "Owner account already exists" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Creating owner account...");

    // Create owner user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: ownerEmail,
      password: ownerPassword,
      email_confirm: true,
    });

    if (createError) {
      console.error("Error creating user:", createError);
      throw createError;
    }

    console.log("Owner user created:", newUser.user?.id);

    // Create profile
    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      user_id: newUser.user!.id,
      full_name: "Owner",
      email: ownerEmail,
    });

    if (profileError) {
      console.error("Profile error:", profileError);
    }

    // Create owner role
    const { error: roleError } = await supabaseAdmin.from("user_roles").insert({
      user_id: newUser.user!.id,
      role: "owner",
    });

    if (roleError) {
      console.error("Role error:", roleError);
    }

    console.log("Owner account setup complete");

    return new Response(
      JSON.stringify({ success: true, message: "Owner account created successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
