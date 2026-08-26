import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
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

    const { data: existingProfile, error: existingErr } = await supabaseAdmin
      .from("profiles")
      .select("id, deleted_at")
      .eq("id", userId)
      .single();

    if (existingErr || !existingProfile) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "User not found" }),
      };
    }
    if (!existingProfile.deleted_at) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "User must be soft-deleted before permanent deletion",
        }),
      };
    }

    const { error: authDeleteError } =
      await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authDeleteError) {
      console.warn("Auth delete warning (non-fatal):", authDeleteError.message);
    }

    const { error: profileDeleteError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (profileDeleteError) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: profileDeleteError.message }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
