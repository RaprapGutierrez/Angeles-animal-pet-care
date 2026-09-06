import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const allowedRoles = ["admin", "super_admin", "superadmin"];

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const { action } = body;

    if (!["create", "update", "restore"].includes(action)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Invalid action. Use create, update, or restore.",
        }),
      };
    }

    // Get Bearer token from the logged-in Super Admin
    const authHeader =
      event.headers.authorization || event.headers.Authorization || "";

    const token = authHeader.replace(/^Bearer\s+/i, "").trim();

    if (!token) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Missing auth token" }),
      };
    }

    // Client used only to verify the logged-in user
    const supabaseAsCaller = createClient(SUPABASE_URL, ANON_KEY);

    const {
      data: { user: caller },
      error: callerError,
    } = await supabaseAsCaller.auth.getUser(token);

    if (callerError || !caller) {
      return {
        statusCode: 401,
        body: JSON.stringify({
          error: "Invalid or expired session",
        }),
      };
    }

    // Server-side admin client
    // NEVER expose this key to the frontend
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Check caller's role
    const { data: callerProfile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", caller.id)
      .single();

    if (
      profileError ||
      !allowedRoles.includes((callerProfile?.role || "").toLowerCase())
    ) {
      return {
        statusCode: 403,
        body: JSON.stringify({
          error: "Not authorized",
        }),
      };
    }

    // =========================================================
    // CREATE USER
    // =========================================================
    if (action === "create") {
      const { email, password, first_name, last_name, role, branch_id, sex } =
        body;

      if (!email || !password || !first_name || !last_name || !role) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error:
              "Email, password, first name, last name, and role are required.",
          }),
        };
      }

      const normalizedEmail = email.trim().toLowerCase();

      // Create Supabase Auth user
      const { data: authData, error: authError } =
        await supabaseAdmin.auth.admin.createUser({
          email: normalizedEmail,
          password,
          email_confirm: true,
          user_metadata: {
            first_name: first_name.trim(),
            last_name: last_name.trim(),
            role,
            branch_id: branch_id || null,
            sex: sex || null,
          },
        });

      if (authError) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: authError.message,
          }),
        };
      }

      const newUser = authData.user;

      if (!newUser) {
        return {
          statusCode: 500,
          body: JSON.stringify({
            error: "User was not created.",
          }),
        };
      }

      // Create/update profile
      const { data: profileData, error: profileCreateError } =
        await supabaseAdmin
          .from("profiles")
          .upsert(
            {
              id: newUser.id,
              email: normalizedEmail,
              first_name: first_name.trim(),
              last_name: last_name.trim(),
              role,
              branch_id: branch_id || null,
              sex: sex || null,
              status: "Active",
              deleted_at: null,
            },
            {
              onConflict: "id",
            },
          )
          .select()
          .single();

      if (profileCreateError) {
        // Roll back Auth user if profile creation fails
        await supabaseAdmin.auth.admin.deleteUser(newUser.id);

        return {
          statusCode: 500,
          body: JSON.stringify({
            error: profileCreateError.message,
          }),
        };
      }

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: "User created successfully.",
          user: newUser,
          profile: profileData,
        }),
      };
    }

    // =========================================================
    // UPDATE USER
    // =========================================================
    if (action === "update") {
      const {
        userId,
        email,
        password,
        first_name,
        last_name,
        role,
        branch_id,
        sex,
        status,
      } = body;

      if (!userId) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: "userId is required.",
          }),
        };
      }

      const authUpdates = {};

      if (email) {
        authUpdates.email = email.trim().toLowerCase();
      }

      if (password && password.trim()) {
        authUpdates.password = password;
      }

      if (
        first_name !== undefined ||
        last_name !== undefined ||
        role !== undefined ||
        branch_id !== undefined ||
        sex !== undefined
      ) {
        authUpdates.user_metadata = {
          first_name: first_name?.trim() || "",
          last_name: last_name?.trim() || "",
          role: role || "",
          branch_id: branch_id || null,
          sex: sex || null,
        };
      }

      // Update Auth user
      if (Object.keys(authUpdates).length > 0) {
        const { error: authUpdateError } =
          await supabaseAdmin.auth.admin.updateUserById(userId, authUpdates);

        if (authUpdateError) {
          return {
            statusCode: 400,
            body: JSON.stringify({
              error: authUpdateError.message,
            }),
          };
        }
      }

      // Update profile
      const profileUpdates = {};

      if (email !== undefined) {
        profileUpdates.email = email.trim().toLowerCase();
      }

      if (first_name !== undefined) {
        profileUpdates.first_name = first_name.trim();
      }

      if (last_name !== undefined) {
        profileUpdates.last_name = last_name.trim();
      }

      if (role !== undefined) {
        profileUpdates.role = role;
      }

      if (branch_id !== undefined) {
        profileUpdates.branch_id = branch_id || null;
      }

      if (sex !== undefined) {
        profileUpdates.sex = sex || null;
      }

      if (status !== undefined) {
        profileUpdates.status = status;
      }

      if (Object.keys(profileUpdates).length > 0) {
        const { data: profileData, error: profileUpdateError } =
          await supabaseAdmin
            .from("profiles")
            .update(profileUpdates)
            .eq("id", userId)
            .select()
            .single();

        if (profileUpdateError) {
          return {
            statusCode: 500,
            body: JSON.stringify({
              error: profileUpdateError.message,
            }),
          };
        }

        return {
          statusCode: 200,
          body: JSON.stringify({
            success: true,
            message: "User updated successfully.",
            profile: profileData,
          }),
        };
      }

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: "User updated successfully.",
        }),
      };
    }

    // =========================================================
    // RESTORE USER
    // =========================================================
    if (action === "restore") {
      const { userId } = body;

      if (!userId) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: "userId is required.",
          }),
        };
      }

      // Remove Auth ban
      const { error: restoreAuthError } =
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          ban_duration: "none",
        });

      if (restoreAuthError) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: restoreAuthError.message,
          }),
        };
      }

      // Restore profile
      const { data: profileData, error: restoreProfileError } =
        await supabaseAdmin
          .from("profiles")
          .update({
            deleted_at: null,
            status: "Active",
          })
          .eq("id", userId)
          .select()
          .single();

      if (restoreProfileError) {
        return {
          statusCode: 500,
          body: JSON.stringify({
            error: restoreProfileError.message,
          }),
        };
      }

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: "User restored successfully.",
          profile: profileData,
        }),
      };
    }

    return {
      statusCode: 400,
      body: JSON.stringify({
        error: "Unsupported action.",
      }),
    };
  } catch (error) {
    console.error("admin-user-management:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message || "Internal server error",
      }),
    };
  }
}
