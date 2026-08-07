import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';

// Auth Pages.
import Login from './pages/Login-Register/Login';
import Register from './pages/Login-Register/Register';

// Information System (public landing)
import InformationSystemBranches from './pages/Information-system/InformationSystemBranches';

import Dashboard from './pages/Dashboard/Dashboard';
import PatientRecord from './pages/Patient-Record/Patientrecord';
import Appointment from './pages/Appoinment/Appointment';
import RoomAvailability from './pages/Room-Availability/Roomavailability';
import Inventory from './pages/Inventory/Inventory';
import PointOfSale from './pages/POS/PointOfSale';
import Walkin from './pages/Walkin/Walkin';
import Report from './pages/Report/Report';
import Messages from './pages/Message/Messages';
import Emergency from './pages/Emergency/Emergency';
import AdminSecurity from './pages/Admin-Security/AdminSecurity';
import ManagerControl from './pages/Manager-Control/ManagerControl';
import Branches from './pages/Branch/Branches';
import PredictiveAnalytics from './pages/Predictive-analytics/Predictiveanalytics';

// Customer Pages
import CustomerDashboard from './pages/Customer/CustomerDashboard';
import CustomerPets from './pages/Customer/CustomerPets';
import CustomerAppointment from './pages/Customer/CustomerAppointment';
import CustomerShop from './pages/Customer/CustomerShop';
import CustomerMessages from './pages/Customer/CustomerMessages';
import CustomerAIChat from './pages/Customer/CustomerAIChat';
import CustomerEmergency from './pages/Customer/CustomerEmergency';
import Profile from './pages/Profile/Profile';
import CustomerBranches from './pages/Customer/CustomerBranches';

// Guest Pages
import GuestAIChat from "./pages/AI/GuestAIChat";

// ── Auth guard helper ──────────────────────────────────────────────────────
const getRole = () => {
  try {
    const token = localStorage.getItem('hospital_jwt');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      localStorage.removeItem('hospital_jwt');
      localStorage.removeItem('user_role');
      return null;
    }
    return localStorage.getItem('user_role') || null;
  } catch {
    return null;
  }
};

const PrivateRoute = ({ children, allowedRoles }) => {
  const role = getRole();
  if (!role) return <Navigate to="/login" replace />;
  const fallback = role.toLowerCase() === 'customer' ? '/customer/dashboard' : '/dashboard';
  if (allowedRoles && !allowedRoles.some(r => r.toLowerCase() === role.toLowerCase())) {
    return <Navigate to={fallback} replace />;
  }
  return children;
};


const InformationSystemBranchesPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const role = getRole();
    if (role) {
      const redirect = role.toLowerCase() === 'customer' ? '/customer/dashboard' : '/dashboard';
      navigate(redirect, { replace: true });
    }
  }, []);
  return <InformationSystemBranches onNavigate={(path) => navigate(path)} />;
};


// ── App ───────────────────────────────────────────────────────────────────
const App = () => {
  useEffect(() => {
    const handleUnload = () => {
      const stored = localStorage.getItem('sb_user');
      const user = stored ? JSON.parse(stored) : null;
      if (user?.id) {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}`;
        const data = JSON.stringify({ status: 'Inactive' });
        navigator.sendBeacon(url, new Blob([data], { type: 'application/json' }));
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);

  return (
  <BrowserRouter>
    <Routes>
      {/* ── Public landing ── */}
      <Route path="/" element={<InformationSystemBranchesPage />} />
      <Route path="/information-system" element={<InformationSystemBranchesPage />} />

      {/* ── Auth ── */}
       <Route path="/login" element={
        getRole()
          ? <Navigate to={getRole().toLowerCase() === 'customer' ? '/customer/dashboard' : '/dashboard'} replace />
          : <Login />
      } />
      <Route path="/register" element={<Register />} />

      {/* ── Guest access ── */}
      <Route path="/emergency-guest" element={<Emergency guestMode />} />
      <Route path="/guest-ai-chat" element={<GuestAIChat />} />

      {/* ── Staff / Admin routes ── */}
      <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/patient-records" element={<PrivateRoute><PatientRecord /></PrivateRoute>} />
      <Route path="/appointments" element={<PrivateRoute><Appointment /></PrivateRoute>} />
      <Route path="/room-availability" element={<PrivateRoute><RoomAvailability /></PrivateRoute>} />
      <Route path="/inventory" element={<PrivateRoute><Inventory /></PrivateRoute>} />
      <Route path="/point-of-sale" element={<PrivateRoute><PointOfSale /></PrivateRoute>} />
      <Route path="/walk-in" element={<PrivateRoute><Walkin /></PrivateRoute>} />
      <Route path="/reports" element={<PrivateRoute><Report /></PrivateRoute>} />
      <Route path="/messages" element={<PrivateRoute><Messages /></PrivateRoute>} />
      <Route path="/emergency" element={<PrivateRoute><Emergency /></PrivateRoute>} />
      <Route path="/branches" element={<PrivateRoute><Branches /></PrivateRoute>} />
      <Route path="/predictive-analytics" element={<PrivateRoute><PredictiveAnalytics /></PrivateRoute>} />

      {/* ── Admin-only ── */}
      <Route path="/admin-security" element={
        <PrivateRoute allowedRoles={['super_admin', 'admin', 'Admin', 'Super Admin']}>
          <AdminSecurity />
        </PrivateRoute>
      } />

      {/* ── Manager + Admin ── */}
      <Route path="/manager-control" element={
        <PrivateRoute allowedRoles={['Admin', 'Manager']}>
          <ManagerControl />
        </PrivateRoute>
      } />

      {/* ── Profile — any logged-in user ── */}
      <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
      <Route path="/customer/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />

      {/* ── Customer routes ── */}
      <Route path="/customer/dashboard" element={<PrivateRoute allowedRoles={['Customer']}><CustomerDashboard /></PrivateRoute>} />
      <Route path="/customer/pets" element={<PrivateRoute allowedRoles={['Customer']}><CustomerPets /></PrivateRoute>} />
      <Route path="/customer/appointments" element={<PrivateRoute allowedRoles={['Customer']}><CustomerAppointment /></PrivateRoute>} />
      <Route path="/customer/shop" element={<PrivateRoute allowedRoles={['Customer']}><CustomerShop /></PrivateRoute>} />
      <Route path="/customer/messages" element={<PrivateRoute allowedRoles={['Customer']}><CustomerMessages /></PrivateRoute>} />
      <Route path="/customer/ai-chat" element={<PrivateRoute allowedRoles={['Customer']}><CustomerAIChat /></PrivateRoute>} />
      <Route path="/customer/emergency" element={<PrivateRoute allowedRoles={['Customer']}><CustomerEmergency /></PrivateRoute>} />
      <Route path="/customer/branches" element={<CustomerBranches />} />

      {/* ── Fallback ── */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter>
  );
};

export default App;