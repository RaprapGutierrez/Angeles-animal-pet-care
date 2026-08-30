export const MODULE_ROUTES = {
  dashboard: { href: "/dashboard", label: "Dashboard" },
  "patient-records": { href: "/patient-records", label: "Patient Records" },
  appointment: { href: "/appointments", label: "Appointments" },
  "room-availability": { href: "/room-availability", label: "Room Status" },
  walkin: { href: "/walk-in", label: "Walk-In" },
  inventory: { href: "/inventory", label: "Inventory" },
  billing: { href: "/point-of-sale", label: "Point of Sale" },
  reports: { href: "/reports", label: "Reports" },
  messages: { href: "/messages", label: "Messages" },
  emergency: { href: "/emergency", label: "Emergency" },
  "predictive-analytics": {
    href: "/predictive-analytics",
    label: "Predictive Analytics",
  },
  branches: { href: "/branches", label: "Branches" },
  "admin-security": { href: "/admin-security", label: "Admin Security" },
  // "staff" is context-dependent: Manager Control for managers, not a route
  // for admins in your current nav (ADMIN_LINKS never links to it) — handled
  // as a special case in buildNavLinks below rather than a flat mapping.
};

// Falls back to today's hardcoded arrays when a branch has no saved
// modules config yet (modules is null/undefined, or missing this role's key)
// — this is what keeps every existing branch working unchanged today.
export const DEFAULT_MODULE_KEYS = {
  Admin: [
    "dashboard",
    "patient-records",
    "appointment",
    "room-availability",
    "inventory",
    "billing",
    "walkin",
    "reports",
    "messages",
    "emergency",
    "branches",
    "admin-security",
    "predictive-analytics",
  ],
  super_admin: [
    "dashboard",
    "patient-records",
    "appointment",
    "room-availability",
    "inventory",
    "billing",
    "walkin",
    "reports",
    "messages",
    "emergency",
    "branches",
    "admin-security",
    "predictive-analytics",
  ],
  Manager: [
    "dashboard",
    "patient-records",
    "appointment",
    "room-availability",
    "inventory",
    "billing",
    "walkin",
    "reports",
    "messages",
    "emergency",
    "staff",
    "predictive-analytics",
  ],
  Employee: [
    "dashboard",
    "patient-records",
    "appointment",
    "room-availability",
    "inventory",
    "billing",
    "walkin",
    "messages",
    "emergency",
    "predictive-analytics",
  ],
};

// Reverse lookup: route path -> module key, so PrivateRoute can tell which
// module gates the page someone is trying to reach. Built from MODULE_ROUTES
// plus the one special case (manager-control maps to the "staff" key, same
// as buildNavLinks handles below).
export const ROUTE_TO_MODULE = Object.entries(MODULE_ROUTES).reduce(
  (acc, [key, def]) => {
    acc[def.href] = key;
    return acc;
  },
  { "/manager-control": "staff" },
);

// Builds the sidebar nav link array for a role, given that role's saved
// module keys from branches.modules (or the defaults above if unset).
export const buildNavLinks = (role, moduleKeys) => {
  const links = moduleKeys
    .filter((key) => key !== "staff" || role === "Manager") // "staff" only maps to a route for managers today
    .map((key) => {
      if (key === "staff")
        return { label: "Manager Control", href: "/manager-control" };
      const def = MODULE_ROUTES[key];
      return def ? { label: def.label, href: def.href } : null;
    })
    .filter(Boolean);
  return links;
};
