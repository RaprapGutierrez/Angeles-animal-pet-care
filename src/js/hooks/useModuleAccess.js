// NEW FILE: src/js/hooks/useModuleAccess.js
import { useEffect, useState } from "react";
import { supabase } from "../Utils/supabase";
import { DEFAULT_MODULE_KEYS, buildNavLinks } from "../Utils/moduleAccess";

// Layout.jsx wraps itself around each individual page rather than sitting
// once at the router level, so it fully remounts on every navigation — which
// reset this hook back to DEFAULT_MODULE_KEYS every time, flashing the full
// default nav list before narrowing to the branch's real saved config. This
// in-memory cache (lives for the browser tab's session, cleared on refresh)
// lets repeat navigations skip straight to the last known-good value instead
// of flashing defaults on every click.
const moduleAccessCache = new Map();

// Given the current user's role + branch, resolves which modules they have
// access to for THIS branch — reading branches.modules if an admin has
// configured it, falling back to DEFAULT_MODULE_KEYS otherwise so nothing
// breaks for branches nobody has touched in the Branches.jsx UI yet.
export const useModuleAccess = (role, branchId) => {
  const cacheKey = role && branchId ? `${role}:${branchId}` : null;
  const cached = cacheKey ? moduleAccessCache.get(cacheKey) : undefined;

  const [moduleKeys, setModuleKeys] = useState(
    () => cached || DEFAULT_MODULE_KEYS[role] || [],
  );
  const [loading, setLoading] = useState(() => cached === undefined);

  useEffect(() => {
    if (!branchId || !role) return;
    let active = true;
    setLoading(moduleAccessCache.get(cacheKey) === undefined);

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
        const resolved =
          savedForRole && savedForRole.length > 0
            ? savedForRole
            : DEFAULT_MODULE_KEYS[role] || [];
        setModuleKeys(resolved);
        if (cacheKey) moduleAccessCache.set(cacheKey, resolved);
        setLoading(false);
      })
      .catch(() => {
        if (active) {
          const fallback = DEFAULT_MODULE_KEYS[role] || [];
          setModuleKeys(fallback);
          if (cacheKey) moduleAccessCache.set(cacheKey, fallback);
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [role, branchId, cacheKey]);

  const navLinks = buildNavLinks(role, moduleKeys);
  const hasModule = (key) => moduleKeys.includes(key);

  return { moduleKeys, navLinks, hasModule, loading };
};
