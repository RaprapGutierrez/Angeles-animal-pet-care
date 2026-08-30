// NEW FILE: src/js/hooks/useModuleAccess.js
import { useEffect, useState } from "react";
import { supabase } from "../Utils/supabase";
import { DEFAULT_MODULE_KEYS, buildNavLinks } from "../Utils/moduleAccess";

// Given the current user's role + branch, resolves which modules they have
// access to for THIS branch — reading branches.modules if an admin has
// configured it, falling back to DEFAULT_MODULE_KEYS otherwise so nothing
// breaks for branches nobody has touched in the Branches.jsx UI yet.
export const useModuleAccess = (role, branchId) => {
  const [moduleKeys, setModuleKeys] = useState(DEFAULT_MODULE_KEYS[role] || []);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!branchId || !role) return;
    let active = true;
    setLoading(true);

    supabase
      .from("branches")
      .select("modules")
      .eq("id", branchId)
      .single()
      .then(({ data }) => {
        if (!active) return;
        const savedForRole = data?.modules?.[role.toLowerCase()];
        // Only override defaults if the admin actually saved something
        // non-empty for this role — an empty/missing array means
        // "not configured yet", not "configured to have nothing".
        setModuleKeys(
          savedForRole && savedForRole.length > 0
            ? savedForRole
            : DEFAULT_MODULE_KEYS[role] || [],
        );
        setLoading(false);
      })
      .catch(() => {
        if (active) {
          setModuleKeys(DEFAULT_MODULE_KEYS[role] || []);
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [role, branchId]);

  const navLinks = buildNavLinks(role, moduleKeys);
  const hasModule = (key) => moduleKeys.includes(key);

  return { moduleKeys, navLinks, hasModule, loading };
};
