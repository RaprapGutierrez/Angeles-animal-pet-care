import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Auth Pages
import Login    from './pages/Login';
import Register from './pages/Register';

// Information System (public landing)
import InformationSystemBranches from './pages/InformationSystemBranches';
import MainHospitalBranch  from './pages/MainHospitalBranch';

import Dashboard        from './pages/Dashboard';
import PatientRecord    from './pages/Patientrecord';
import Appointment      from './pages/Appointment';
import RoomAvailability from './pages/Roomavailability';
import Inventory        from './pages/Inventory';
import PointOfSale      from './pages/PointOfSale';
import Walkin           from './pages/Walkin';
import Report           from './pages/Report';
import Messages         from './pages/Messages';
import Emergency        from './pages/Emergency';
import AdminSecurity    from './pages/AdminSecurity';
import ManagerControl   from './pages/ManagerControl';
import Branches         from './pages/Branches';
import PredictiveAnalytics from './pages/PredictiveAnalytics'; 

// Customer Pages
import CustomerDashboard   from './pages/CustomerDashboard';
import CustomerPets        from './pages/CustomerPets';
import CustomerAppointment from './pages/CustomerAppointment';
import CustomerShop        from './pages/CustomerShop';
import CustomerMessages    from './pages/CustomerMessages';
import CustomerAIChat      from './pages/CustomerAIChat';
import CustomerEmergency   from './pages/CustomerEmergency';
import Profile             from './pages/Profile';
import CustomerBranches    from './pages/CustomerBranches';

// Guest Pages
import GuestAIChat from "./pages/GuestAIChat";

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

// ── App ───────────────────────────────────────────────────────────────────
const App = () => (
  <BrowserRouter>
    <Routes>
      {/* ── Public landing ── */}
      <Route path="/"                   element={<InformationSystemBranches />} />
      <Route path="/information-system" element={<InformationSystemBranches />} />
      <Route path="/branches/main-hospital" element={<MainHospitalBranch />} />

      {/* ── Auth ── */}
      <Route path="/login"    element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* ── Guest access ── */}
      <Route path="/emergency-guest" element={<Emergency guestMode />} />
      <Route path="/guest-ai-chat"   element={<GuestAIChat />} />

      {/* ── Staff / Admin routes ── */}
      <Route path="/dashboard"         element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/patient-records"   element={<PrivateRoute><PatientRecord /></PrivateRoute>} />
      <Route path="/appointments"      element={<PrivateRoute><Appointment /></PrivateRoute>} />
      <Route path="/room-availability" element={<PrivateRoute><RoomAvailability /></PrivateRoute>} />
      <Route path="/inventory"         element={<PrivateRoute><Inventory /></PrivateRoute>} />
      <Route path="/point-of-sale"     element={<PrivateRoute><PointOfSale /></PrivateRoute>} />
      <Route path="/walk-in"           element={<PrivateRoute><Walkin /></PrivateRoute>} />
      <Route path="/reports"           element={<PrivateRoute><Report /></PrivateRoute>} />
      <Route path="/messages"          element={<PrivateRoute><Messages /></PrivateRoute>} />
      <Route path="/emergency"         element={<PrivateRoute><Emergency /></PrivateRoute>} />
      <Route path="/branches"          element={<PrivateRoute><Branches /></PrivateRoute>} />
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
      <Route path="/profile"          element={<PrivateRoute><Profile /></PrivateRoute>} />
      <Route path="/customer/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />

      {/* ── Customer routes ── */}
      <Route path="/customer/dashboard"    element={<PrivateRoute allowedRoles={['Customer']}><CustomerDashboard /></PrivateRoute>} />
      <Route path="/customer/pets"         element={<PrivateRoute allowedRoles={['Customer']}><CustomerPets /></PrivateRoute>} />
      <Route path="/customer/appointments" element={<PrivateRoute allowedRoles={['Customer']}><CustomerAppointment /></PrivateRoute>} />
      <Route path="/customer/shop"         element={<PrivateRoute allowedRoles={['Customer']}><CustomerShop /></PrivateRoute>} />
      <Route path="/customer/messages"     element={<PrivateRoute allowedRoles={['Customer']}><CustomerMessages /></PrivateRoute>} />
      <Route path="/customer/ai-chat"      element={<PrivateRoute allowedRoles={['Customer']}><CustomerAIChat /></PrivateRoute>} />
      <Route path="/customer/emergency"    element={<PrivateRoute allowedRoles={['Customer']}><CustomerEmergency /></PrivateRoute>} />
      <Route path="/customer/branches"     element={<CustomerBranches />} />

      {/* ── Fallback ── */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter>
);

export default App;