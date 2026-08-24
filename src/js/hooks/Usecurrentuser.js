import { useState, useEffect } from "react";
import { supabase } from "../Utils/supabase";

let _cache = null;
let _loginLogged = false;

export const useCurrentUser = () => {
  const [user, setUser] = useState(_cache);
  const [loading, setLoading] = useState(!_cache);

  useEffect(() => {
    const fetch = async () => {
      if (_cache) {
        setUser(_cache);
        setLoading(false);
        return;
      }
      setLoading(true);
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email, role, branch_id, status")
        .eq("id", authUser.id)
        .single();

      const result = {
        id: authUser.id,
        email: authUser.email,
        firstName: profile?.first_name || "",
        lastName: profile?.last_name || "",
        fullName:
          [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
          authUser.email,
        role: (profile?.role || "").toLowerCase(),
        branchId: profile?.branch_id ?? null,
        status: profile?.status || "Active",
      };

      _cache = result;
      setUser(result);
      setLoading(false);

      // Log the login event only once per session
      if (!_loginLogged) {
        _loginLogged = true;
        const { error: logError } = await supabase
          .from("activity_logs")
          .insert([
            {
              user_id: result.id,
              user_name: result.fullName,
              user_role: result.role,
              action: "Logged in",
              details: `${result.fullName} signed in`,
              status: "Success",
            },
          ]);
        if (logError) console.error("Activity log insert error:", logError);
      }
    };

    fetch();
  }, []);

  const normalizedRole = (user?.role || "").replace(/[\s_-]/g, "");
  const isSuperAdmin = normalizedRole === "superadmin";
  const isAdmin = user?.role === "admin" || isSuperAdmin;
  const isManager = user?.role === "manager";
  const isEmployee = user?.role === "employee" || user?.role === "staff";
  const isCustomer = user?.role === "customer";
  const seeAllBranches = isAdmin;

  return {
    user,
    loading,
    isSuperAdmin,
    isAdmin,
    isManager,
    isEmployee,
    isCustomer,
    seeAllBranches,
  };
};

supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === "SIGNED_OUT") {
    if (_cache) {
      await supabase.from("activity_logs").insert([
        {
          user_id: _cache.id,
          user_name: _cache.fullName,
          user_role: _cache.role,
          action: "Logged out",
          details: `${_cache.fullName} signed out`,
          status: "Success",
        },
      ]);
    }
    _cache = null;
    _loginLogged = false;
    try {
      localStorage.removeItem("user_role");
    } catch {}
  }
});
