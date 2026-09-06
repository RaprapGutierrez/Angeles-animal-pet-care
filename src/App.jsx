import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "./js/Utils/supabase";
import { useModuleAccess } from "./js/hooks/useModuleAccess";
import { ROUTE_TO_MODULE } from "./js/Utils/moduleAccess";

// Auth Pages.
const Login = React.lazy(() => import("./pages/Login-Register/Login"));
const Register = React.lazy(() => import("./pages/Login-Register/Register"));

// Information System (public landing)
const InformationSystemBranches = React.lazy(
  () => import("./pages/Information-system/InformationSystemBranches"),
);

const Dashboard = React.lazy(() => import("./pages/Dashboard/Dashboard"));
const PatientRecord = React.lazy(
  () => import("./pages/Patient-Record/Patientrecord"),
);
const Appointment = React.lazy(() => import("./pages/Appoinment/Appointment"));
const RoomAvailability = React.lazy(
  () => import("./pages/Room-Availability/Roomavailability"),
);
const Inventory = React.lazy(() => import("./pages/Inventory/Inventory"));
const PointOfSale = React.lazy(() => import("./pages/POS/Pointofsale"));
const Walkin = React.lazy(() => import("./pages/Walkin/Walkin"));
const Report = React.lazy(() => import("./pages/Report/Report"));
const Messages = React.lazy(() => import("./pages/Message/Messages"));
const Emergency = React.lazy(() => import("./pages/Emergency/Emergency"));
const AdminSecurity = React.lazy(
  () => import("./pages/Admin-Security/AdminSecurity"),
);
const ManagerControl = React.lazy(
  () => import("./pages/Manager-Control/ManagerControl"),
);
const Branches = React.lazy(() => import("./pages/Branch/Branches"));
const PredictiveAnalytics = React.lazy(
  () => import("./pages/Predictive-analytics/Predictiveanalytics"),
);

// Customer Pages
const CustomerDashboard = React.lazy(
  () => import("./pages/Customer/CustomerDashboard"),
);
const CustomerPets = React.lazy(() => import("./pages/Customer/CustomerPets"));
const CustomerAppointment = React.lazy(
  () => import("./pages/Customer/CustomerAppointment"),
);
const CustomerShop = React.lazy(() => import("./pages/Customer/CustomerShop"));
const CustomerMessages = React.lazy(
  () => import("./pages/Customer/CustomerMessages"),
);
const CustomerAIChat = React.lazy(
  () => import("./pages/Customer/CustomerAIChat"),
);
const CustomerEmergency = React.lazy(
  () => import("./pages/Customer/CustomerEmergency"),
);
const Profile = React.lazy(() => import("./pages/Profile/Profile"));
const CustomerBranches = React.lazy(
  () => import("./pages/Customer/CustomerBranches"),
);

// Guest Pages
const GuestAIChat = React.lazy(() => import("./pages/AI/GuestAIChat"));

// ── Auth guard helper ──────────────────────────────────────────────────────
// Converts a raw role string (from the JWT) into a canonical role name.
// Kept identical to Layout.jsx's normalizeRole so both files agree on the
// same five roles and never drift into typo'd variants.
const normalizeRole = (raw) => {
  if (!raw) return "Employee";
  const map = {
    super_admin: "super_admin",
    superadmin: "super_admin",
    admin: "Admin",
    manager: "Manager",
    employee: "Employee",
    customer: "Customer",
  };
  return map[String(raw).toLowerCase()] || raw;
};

const getRole = () => {
  try {
    const token = localStorage.getItem("hospital_jwt");
    if (!token) return null;
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      localStorage.removeItem("hospital_jwt");
      localStorage.removeItem("user_role");
      return null;
    }
    // IMPORTANT: role must come from the signed JWT only, never from
    // localStorage — that value is editable via DevTools and would let
    // anyone grant themselves admin/super_admin client-side. This mirrors
    // Layout.jsx's readUserInfo(), which already does this correctly.
    const meta = payload.user_metadata || {};
    const appMeta = payload.app_metadata || {};
    const rawRole = appMeta.role || meta.role || "Employee";
    return normalizeRole(rawRole);
  } catch {
    return null;
  }
};
const PrivateRoute = ({ children, allowedRoles }) => {
  const jwtRole = getRole();
  const [liveRole, setLiveRole] = useState(null);
  const [liveBranchId, setLiveBranchId] = useState(null);
  const [checked, setChecked] = useState(false);
  const location = useLocation();

  useEffect(() => {
    let active = true;
    if (!jwtRole) {
      setChecked(true);
      return;
    }
    const token = localStorage.getItem("hospital_jwt");
    let userId = null;
    try {
      userId = JSON.parse(atob(token.split(".")[1])).sub;
    } catch {
      // fall through — no id means we can't look up the live role,
      // so trust the JWT role rather than blocking access entirely
    }
    if (!userId) {
      setChecked(true);
      return;
    }
    supabase
      .from("profiles")
      .select("role, branch_id")
      .eq("id", userId)
      .single()
      .then(({ data }) => {
        if (!active) return;
        if (data?.role) setLiveRole(normalizeRole(data.role));
        if (data?.branch_id != null) setLiveBranchId(data.branch_id);
        setChecked(true);
      })
      .catch(() => {
        if (active) setChecked(true); // network/DB hiccup — fall back to JWT role rather than lock the user out
      });
    return () => {
      active = false;
    };
  }, [jwtRole]);

  // Render immediately off the trusted, signed JWT role instead of
  // blocking first paint on a DB round-trip. Once the live check resolves
  // (checked=true) and liveRole disagrees with the JWT role, `role` below
  // switches to the live value on the very next render and the allowedRoles
  // check re-runs against it — so a demoted/promoted user gets redirected
  // the moment we know, they just aren't blocked on a blank screen waiting
  // to find out. Actual data access is still enforced by Supabase RLS
  // regardless of what this component renders client-side.
  const role = liveRole || jwtRole || "Employee";
  const isCustomer = role.toLowerCase() === "customer";
  // Customers aren't part of the module system (see Layout.jsx's same
  // reasoning) — only look up module access for staff roles.
  const { hasModule, loading: modulesLoading } = useModuleAccess(
    !isCustomer ? role : null,
    !isCustomer ? liveBranchId : null,
  );

  if (!jwtRole) return <Navigate to="/login" replace />;

  const fallback = isCustomer ? "/customer/dashboard" : "/dashboard";
  if (
    allowedRoles &&
    !allowedRoles.some((r) => r.toLowerCase() === role.toLowerCase())
  ) {
    return <Navigate to={fallback} replace />;
  }

  // Module-level gate: closes the gap where unchecking a module in
  // Branches.jsx only hid the nav link but left the route itself open to
  // direct URL access. Only applies to staff roles and only to routes that
  // are actually in the module system (ROUTE_TO_MODULE) — anything not
  // mapped (e.g. /profile) is unaffected. We still wait on `checked` and
  // `modulesLoading` here specifically — not for the whole page, just for
  // this one gate — since briefly showing a de-authorized module is worse
  // than a moment's blank content in that slot.
  const moduleKey = ROUTE_TO_MODULE[location.pathname];
  if (!isCustomer && moduleKey) {
    if (!checked || modulesLoading) return null;
    if (!hasModule(moduleKey)) return <Navigate to={fallback} replace />;
  }

  return children;
};

const InformationSystemBranchesPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const role = getRole();
    if (role) {
      const redirect =
        role.toLowerCase() === "customer"
          ? "/customer/dashboard"
          : "/dashboard";
      navigate(redirect, { replace: true });
    }
  }, []);
  return <InformationSystemBranches onNavigate={(path) => navigate(path)} />;
};

// ── App ───────────────────────────────────────────────────────────────────
const App = () => {
  useEffect(() => {
    const handleUnload = () => {
      const stored = localStorage.getItem("sb_user");
      const user = stored ? JSON.parse(stored) : null;
      if (user?.id) {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}`;
        const data = JSON.stringify({ status: "Inactive" });
        navigator.sendBeacon(
          url,
          new Blob([data], { type: "application/json" }),
        );
      }
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, []);

  return (
    <BrowserRouter>
      <React.Suspense
        fallback={
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100vh",
              background: "#0f172a",
            }}
          />
        }
      >
        <Routes>
          {/* ── Public landing ── */}
          <Route path="/" element={<InformationSystemBranchesPage />} />
          <Route
            path="/information-system"
            element={<InformationSystemBranchesPage />}
          />

          {/* ── Info Site, reachable by logged-in users too — does NOT auto-redirect
           back to the dashboard the way "/" does above. Used by the "Go to Info
           Site" button in the dashboard topbar. ── */}
          <Route path="/info" element={<InformationSystemBranches />} />

          {/* ── Auth ── */}
          <Route
            path="/login"
            element={
              getRole() ? (
                <Navigate
                  to={
                    getRole().toLowerCase() === "customer"
                      ? "/customer/dashboard"
                      : "/dashboard"
                  }
                  replace
                />
              ) : (
                <Login />
              )
            }
          />
          <Route path="/register" element={<Register />} />

          {/* ── Guest access ── */}
          <Route path="/emergency-guest" element={<Emergency guestMode />} />
          <Route path="/guest-ai-chat" element={<GuestAIChat />} />

          {/* ── Staff / Admin routes ── */}
          <Route
            path="/dashboard"
            element={
              <PrivateRoute
                allowedRoles={["super_admin", "Admin", "Manager", "Employee"]}
              >
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/patient-records"
            element={
              <PrivateRoute
                allowedRoles={["super_admin", "Admin", "Manager", "Employee"]}
              >
                <PatientRecord />
              </PrivateRoute>
            }
          />
          <Route
            path="/appointments"
            element={
              <PrivateRoute
                allowedRoles={["super_admin", "Admin", "Manager", "Employee"]}
              >
                <Appointment />
              </PrivateRoute>
            }
          />
          <Route
            path="/room-availability"
            element={
              <PrivateRoute
                allowedRoles={["super_admin", "Admin", "Manager", "Employee"]}
              >
                <RoomAvailability />
              </PrivateRoute>
            }
          />
          <Route
            path="/inventory"
            element={
              <PrivateRoute
                allowedRoles={["super_admin", "Admin", "Manager", "Employee"]}
              >
                <Inventory />
              </PrivateRoute>
            }
          />
          <Route
            path="/point-of-sale"
            element={
              <PrivateRoute
                allowedRoles={["super_admin", "Admin", "Manager", "Employee"]}
              >
                <PointOfSale />
              </PrivateRoute>
            }
          />
          <Route
            path="/walk-in"
            element={
              <PrivateRoute
                allowedRoles={["super_admin", "Admin", "Manager", "Employee"]}
              >
                <Walkin />
              </PrivateRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <PrivateRoute allowedRoles={["super_admin", "Admin", "Manager"]}>
                <Report />
              </PrivateRoute>
            }
          />
          <Route
            path="/messages"
            element={
              <PrivateRoute
                allowedRoles={["super_admin", "Admin", "Manager", "Employee"]}
              >
                <Messages />
              </PrivateRoute>
            }
          />
          <Route
            path="/emergency"
            element={
              <PrivateRoute
                allowedRoles={["super_admin", "Admin", "Manager", "Employee"]}
              >
                <Emergency />
              </PrivateRoute>
            }
          />
          <Route
            path="/branches"
            element={
              <PrivateRoute allowedRoles={["super_admin", "Admin"]}>
                <Branches />
              </PrivateRoute>
            }
          />
          <Route
            path="/predictive-analytics"
            element={
              <PrivateRoute
                allowedRoles={["super_admin", "Admin", "Manager", "Employee"]}
              >
                <PredictiveAnalytics />
              </PrivateRoute>
            }
          />

          {/* ── Admin-only ── */}
          <Route
            path="/admin-security"
            element={
              <PrivateRoute allowedRoles={["super_admin", "Admin"]}>
                <AdminSecurity />
              </PrivateRoute>
            }
          />

          {/* ── Manager only ── */}
          <Route
            path="/manager-control"
            element={
              <PrivateRoute allowedRoles={["Manager"]}>
                <ManagerControl />
              </PrivateRoute>
            }
          />

          {/* ── Profile — any logged-in user ── */}
          <Route
            path="/profile"
            element={
              <PrivateRoute>
                <Profile />
              </PrivateRoute>
            }
          />
          <Route
            path="/customer/profile"
            element={
              <PrivateRoute>
                <Profile />
              </PrivateRoute>
            }
          />

          {/* ── Customer routes ── */}
          <Route
            path="/customer/dashboard"
            element={
              <PrivateRoute allowedRoles={["Customer"]}>
                <CustomerDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/customer/pets"
            element={
              <PrivateRoute allowedRoles={["Customer"]}>
                <CustomerPets />
              </PrivateRoute>
            }
          />
          <Route
            path="/customer/appointments"
            element={
              <PrivateRoute allowedRoles={["Customer"]}>
                <CustomerAppointment />
              </PrivateRoute>
            }
          />
          <Route
            path="/customer/shop"
            element={
              <PrivateRoute allowedRoles={["Customer"]}>
                <CustomerShop />
              </PrivateRoute>
            }
          />
          <Route
            path="/customer/messages"
            element={
              <PrivateRoute allowedRoles={["Customer"]}>
                <CustomerMessages />
              </PrivateRoute>
            }
          />
          <Route
            path="/customer/ai-chat"
            element={
              <PrivateRoute allowedRoles={["Customer"]}>
                <CustomerAIChat />
              </PrivateRoute>
            }
          />
          <Route
            path="/customer/emergency"
            element={
              <PrivateRoute allowedRoles={["Customer"]}>
                <CustomerEmergency />
              </PrivateRoute>
            }
          />
          <Route path="/customer/branches" element={<CustomerBranches />} />

          {/* ── Fallback ── */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </React.Suspense>
    </BrowserRouter>
  );
};

export default App;
