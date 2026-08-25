import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowegitd" };
  }

  try {
    const { userId } = JSON.parse(event.body || "{}");
    if (!userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "userId is required" }),
      };
    }

    const authHeader = event.headers.authorization || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Missing auth token" }),
      };
    }

    const supabaseAsCaller = createClient(SUPABASE_URL, ANON_KEY);
    const {
      data: { user: caller },
      error: callerErr,
    } = await supabaseAsCaller.auth.getUser(token);

    if (callerErr || !caller) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Invalid or expired session" }),
      };
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: callerProfile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", caller.id)
      .single();

    const allowedRoles = ["admin", "super_admin", "superadmin"];
    if (
      profileErr ||
      !allowedRoles.includes((callerProfile?.role || "").toLowerCase())
    ) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: "Not authorized" }),
      };
    }

    if (caller.id === userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "You can't delete your own account" }),
      };
    }

    const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      {
        ban_duration: "876000h",
      },
    );
    if (banError) {
      console.warn("Ban warning (non-fatal):", banError.message);
    }

    const { data: profileData, error: profileUpdateError } = await supabaseAdmin
      .from("profiles")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", userId)
      .select();

    if (profileUpdateError) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: profileUpdateError.message }),
      };
    }
    if (!profileData || profileData.length === 0) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "No profile was updated" }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, profile: profileData[0] }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
