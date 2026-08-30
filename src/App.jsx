import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "./js/Utils/supabase";
import { useModuleAccess } from "./js/hooks/useModuleAccess";
import { ROUTE_TO_MODULE } from "./js/Utils/moduleAccess";

// Auth Pages.
import Login from "./pages/Login-Register/Login";
import Register from "./pages/Login-Register/Register";

// Information System (public landing)
import InformationSystemBranches from "./pages/Information-system/InformationSystemBranches";

import Dashboard from "./pages/Dashboard/Dashboard";
import PatientRecord from "./pages/Patient-Record/Patientrecord";
import Appointment from "./pages/Appoinment/Appointment";
import RoomAvailability from "./pages/Room-Availability/Roomavailability";
import Inventory from "./pages/Inventory/Inventory";
import PointOfSale from "./pages/POS/Pointofsale";
import Walkin from "./pages/Walkin/Walkin";
import Report from "./pages/Report/Report";
import Messages from "./pages/Message/Messages";
import Emergency from "./pages/Emergency/Emergency";
import AdminSecurity from "./pages/Admin-Security/AdminSecurity";
import ManagerControl from "./pages/Manager-Control/ManagerControl";
import Branches from "./pages/Branch/Branches";
import PredictiveAnalytics from "./pages/Predictive-analytics/Predictiveanalytics";

// Customer Pages
import CustomerDashboard from "./pages/Customer/CustomerDashboard";
import CustomerPets from "./pages/Customer/CustomerPets";
import CustomerAppointment from "./pages/Customer/CustomerAppointment";
import CustomerShop from "./pages/Customer/CustomerShop";
import CustomerMessages from "./pages/Customer/CustomerMessages";
import CustomerAIChat from "./pages/Customer/CustomerAIChat";
import CustomerEmergency from "./pages/Customer/CustomerEmergency";
import Profile from "./pages/Profile/Profile";
import CustomerBranches from "./pages/Customer/CustomerBranches";

// Guest Pages
import GuestAIChat from "./pages/AI/GuestAIChat";

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
  const [liveRole, setLiveRole] = useState(jwtRole);
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

  const role = liveRole || jwtRole || "Employee";
  const isCustomer = role.toLowerCase() === "customer";
  // Customers aren't part of the module system (see Layout.jsx's same
  // reasoning) — only look up module access for staff roles.
  const { hasModule, loading: modulesLoading } = useModuleAccess(
    !isCustomer && checked ? role : null,
    !isCustomer && checked ? liveBranchId : null,
  );

  if (!jwtRole) return <Navigate to="/login" replace />;
  // Brief pause while the live role is confirmed — avoids a flash of the
  // wrong page's content if the JWT role and DB role have diverged.
  if (!checked) return null;

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
  // mapped (e.g. /profile) is unaffected.
  const moduleKey = ROUTE_TO_MODULE[location.pathname];
  if (!isCustomer && moduleKey) {
    if (modulesLoading) return null;
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
    </BrowserRouter>
  );
};

export default App;
