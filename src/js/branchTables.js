import { useEffect, useState } from 'react';

const BRANCH_ID_MAP = {
  'main':        1,
  'mabalacat':   1,
  'mabalacat2':  2,
  'tarlac':      3,
  'angeles':     4,
  'angelescity': 4,
  'sanfernando': 5,
  'sf':          5,
  'magalang':    6,
};

const normalizeBranch = (branch) =>
  String(branch || '').toLowerCase().replace(/\s+/g, '').trim();

export const getBranchId = () => {
  const branch = getUserBranch();
  const normalized = normalizeBranch(branch);
  return BRANCH_ID_MAP[normalized] || 4;
};

export const parseBranchFromEmail = (email) => {
  if (!email) return null;
  const domain = email.split('@')[1] || '';
  const candidate = domain.split('.')[0]?.toLowerCase();
  const map = {
    sf:          'San Fernando',
    sanfernando: 'San Fernando',
    mabalacat:   'Mabalacat',
    angeles:     'Main',
    main:        'Main',
    tarlac:      'Tarlac',
    magalang:    'Magalang',
  };
  return map[candidate] || null;
};

export const getUserBranch = () => {
  try {
    const stored = localStorage.getItem('user_branch');
    if (stored && stored !== 'null' && stored !== 'undefined') return stored;
    const token = localStorage.getItem('hospital_jwt');
    if (!token) return 'Main';
    const base64 = token.split('.')[1];
    if (!base64) return 'Main';
    const payload = JSON.parse(atob(base64));
    const email = payload.email || payload.user_metadata?.email || '';
    return parseBranchFromEmail(email) || 'Main';
  } catch {
    return 'Main';
  }
};

export const useBranch = () => {
  const [branch, setBranch] = useState(getUserBranch());
  useEffect(() => {
    const refresh = () => setBranch(getUserBranch());
    window.addEventListener('focus', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);
  return branch;
};

// ─────────────────────────────────────────────────────────────────────────────
// NAV LINK ARRAYS
// ─────────────────────────────────────────────────────────────────────────────

const ADMIN_LINKS = [
  { label: 'Dashboard',        href: '/dashboard' },
  { label: 'Patient Records',  href: '/patient-records' },
  { label: 'Appointments',     href: '/appointments' },
  { label: 'Room Status',      href: '/room-availability' },
  { label: 'Inventory',        href: '/inventory' },
  { label: 'Point of Sale',    href: '/point-of-sale' },
  { label: 'Walk-In',          href: '/walk-in' },
  { label: 'Reports',          href: '/reports' },
  { label: 'Messages',         href: '/messages' },
  { label: 'Emergency',        href: '/emergency' },
  { label: 'Branches',         href: '/branches' },
  { label: 'Admin Security',   href: '/admin-security' },
  { label: 'Predictive Analytics', href: '/predictive-analytics' }
];

// ── Main (branch 1) ──────────────────────────────────────────────────────────
const MANAGER_MAIN_LINKS = [
  { label: 'Dashboard',       href: '/dashboard' },
  { label: 'Patient Records', href: '/patient-records' },
  { label: 'Appointments',    href: '/appointments' },
  { label: 'Room Status',     href: '/room-availability' },
  { label: 'Inventory',       href: '/inventory' },
  { label: 'Point of Sale',   href: '/point-of-sale' },
  { label: 'Walk-In',         href: '/walk-in' },
  { label: 'Reports',         href: '/reports' },
  { label: 'Messages',        href: '/messages' },
  { label: 'Emergency',       href: '/emergency' },
  { label: 'Manager Control', href: '/manager-control' },
  { label: 'Predictive Analytics', href: '/predictive-analytics' }
];

const EMPLOYEE_MAIN_LINKS = [
  { label: 'Dashboard',       href: '/dashboard' },
  { label: 'Patient Records', href: '/patient-records' },
  { label: 'Appointments',    href: '/appointments' },
  { label: 'Room Status',     href: '/room-availability' },
  { label: 'Inventory',       href: '/inventory' },
  { label: 'Point of Sale',   href: '/point-of-sale' },
  { label: 'Walk-In',         href: '/walk-in' },
  { label: 'Messages',        href: '/messages' },
  { label: 'Emergency',       href: '/emergency' },
  { label: 'Predictive Analytics', href: '/predictive-analytics' }
];

const CUSTOMER_MAIN_LINKS = [
  { label: 'Dashboard',    href: '/customer/dashboard' },
  { label: 'My Pets',      href: '/customer/pets' },
  { label: 'Appointments', href: '/customer/appointments' },
  { label: 'Shop',         href: '/customer/shop' },
  { label: 'Messages',     href: '/customer/messages' },
  { label: 'AI Chat',      href: '/customer/ai-chat' },
  { label: 'Emergency',    href: '/customer/emergency' },
  { label: 'Branches',     href: '/customer/branches' },
];

// ── Mabalacat 2 (branch 2) ───────────────────────────────────────────────────
const MANAGER_MABALACAT_LINKS = [
  { label: 'Dashboard',       href: '/dashboard' },
  { label: 'Patient Records', href: '/patient-records' },
  { label: 'Appointments',    href: '/appointments' },
  { label: 'Room Status',     href: '/room-availability' },
  { label: 'Inventory',       href: '/inventory' },
  { label: 'Point of Sale',   href: '/point-of-sale' },
  { label: 'Walk-In',         href: '/walk-in' },
  { label: 'Reports',         href: '/reports' },
  { label: 'Messages',        href: '/messages' },
  { label: 'Emergency',       href: '/emergency' },
  { label: 'Manager Control', href: '/manager-control' },
  { label: 'Predictive Analytics', href: '/predictive-analytics' }
];

const EMPLOYEE_MABALACAT_LINKS = [
  { label: 'Dashboard',       href: '/dashboard' },
  { label: 'Patient Records', href: '/patient-records' },
  { label: 'Appointments',    href: '/appointments' },
  { label: 'Room Status',     href: '/room-availability' },
  { label: 'Inventory',       href: '/inventory' },
  { label: 'Point of Sale',   href: '/point-of-sale' },
  { label: 'Walk-In',         href: '/walk-in' },
  { label: 'Messages',        href: '/messages' },
  { label: 'Emergency',       href: '/emergency' },
  { label: 'Predictive Analytics', href: '/predictive-analytics' }
];

const CUSTOMER_MABALACAT_LINKS = [
  { label: 'Dashboard',    href: '/customer/dashboard' },
  { label: 'My Pets',      href: '/customer/pets' },
  { label: 'Appointments', href: '/customer/appointments' },
  { label: 'Shop',         href: '/customer/shop' },
  { label: 'Messages',     href: '/customer/messages' },
  { label: 'AI Chat',      href: '/customer/ai-chat' },
  { label: 'Emergency',    href: '/customer/emergency' },
  { label: 'Branches',     href: '/customer/branches' },
];

// ── Tarlac (branch 3) ────────────────────────────────────────────────────────
const MANAGER_TARLAC_LINKS = [
  { label: 'Dashboard',       href: '/dashboard' },
  { label: 'Patient Records', href: '/patient-records' },
  { label: 'Appointments',    href: '/appointments' },
  { label: 'Room Status',     href: '/room-availability' },
  { label: 'Inventory',       href: '/inventory' },
  { label: 'Point of Sale',   href: '/point-of-sale' },
  { label: 'Walk-In',         href: '/walk-in' },
  { label: 'Reports',         href: '/reports' },
  { label: 'Messages',        href: '/messages' },
  { label: 'Emergency',       href: '/emergency' },
  { label: 'Manager Control', href: '/manager-control' },
];

const EMPLOYEE_TARLAC_LINKS = [
  { label: 'Dashboard',       href: '/dashboard' },
  { label: 'Patient Records', href: '/patient-records' },
  { label: 'Appointments',    href: '/appointments' },
  { label: 'Room Status',     href: '/room-availability' },
  { label: 'Inventory',       href: '/inventory' },
  { label: 'Point of Sale',   href: '/point-of-sale' },
  { label: 'Walk-In',         href: '/walk-in' },
  { label: 'Messages',        href: '/messages' },
  { label: 'Emergency',       href: '/emergency' },
];

const CUSTOMER_TARLAC_LINKS = [
  { label: 'Dashboard',    href: '/customer/dashboard' },
  { label: 'My Pets',      href: '/customer/pets' },
  { label: 'Appointments', href: '/customer/appointments' },
  { label: 'Shop',         href: '/customer/shop' },
  { label: 'Messages',     href: '/customer/messages' },
  { label: 'AI Chat',      href: '/customer/ai-chat' },
  { label: 'Emergency',    href: '/customer/emergency' },
  { label: 'Branches',     href: '/customer/branches' },
];

// ── Angeles (branch 4) ───────────────────────────────────────────────────────
const MANAGER_ANGELES_LINKS = [
  { label: 'Dashboard',       href: '/dashboard' },
  { label: 'Patient Records', href: '/patient-records' },
  { label: 'Appointments',    href: '/appointments' },
  { label: 'Room Status',     href: '/room-availability' },
  { label: 'Inventory',       href: '/inventory' },
  { label: 'Point of Sale',   href: '/point-of-sale' },
  { label: 'Walk-In',         href: '/walk-in' },
  { label: 'Reports',         href: '/reports' },
  { label: 'Messages',        href: '/messages' },
  { label: 'Emergency',       href: '/emergency' },
  { label: 'Manager Control', href: '/manager-control' },
];

const EMPLOYEE_ANGELES_LINKS = [
  { label: 'Dashboard',       href: '/dashboard' },
  { label: 'Patient Records', href: '/patient-records' },
  { label: 'Appointments',    href: '/appointments' },
  { label: 'Room Status',     href: '/room-availability' },
  { label: 'Inventory',       href: '/inventory' },
  { label: 'Point of Sale',   href: '/point-of-sale' },
  { label: 'Walk-In',         href: '/walk-in' },
  { label: 'Messages',        href: '/messages' },
  { label: 'Emergency',       href: '/emergency' },
];

const CUSTOMER_ANGELES_LINKS = [
  { label: 'Dashboard',    href: '/customer/dashboard' },
  { label: 'My Pets',      href: '/customer/pets' },
  { label: 'Appointments', href: '/customer/appointments' },
  { label: 'Shop',         href: '/customer/shop' },
  { label: 'Messages',     href: '/customer/messages' },
  { label: 'AI Chat',      href: '/customer/ai-chat' },
  { label: 'Emergency',    href: '/customer/emergency' },
  { label: 'Branches',     href: '/customer/branches' },
];

// ── San Fernando (branch 5) ──────────────────────────────────────────────────
const MANAGER_SF_LINKS = [
  { label: 'Dashboard',       href: '/dashboard' },
  { label: 'Patient Records', href: '/patient-records' },
  { label: 'Appointments',    href: '/appointments' },
  { label: 'Room Status',     href: '/room-availability' },
  { label: 'Inventory',       href: '/inventory' },
  { label: 'Point of Sale',   href: '/point-of-sale' },
  { label: 'Walk-In',         href: '/walk-in' },
  { label: 'Reports',         href: '/reports' },
  { label: 'Messages',        href: '/messages' },
  { label: 'Emergency',       href: '/emergency' },
  { label: 'Manager Control', href: '/manager-control' },
];

const EMPLOYEE_SF_LINKS = [
  { label: 'Dashboard',       href: '/dashboard' },
  { label: 'Patient Records', href: '/patient-records' },
  { label: 'Appointments',    href: '/appointments' },
  { label: 'Room Status',     href: '/room-availability' },
  { label: 'Inventory',       href: '/inventory' },
  { label: 'Point of Sale',   href: '/point-of-sale' },
  { label: 'Walk-In',         href: '/walk-in' },
  { label: 'Messages',        href: '/messages' },
  { label: 'Emergency',       href: '/emergency' },
];

const CUSTOMER_SF_LINKS = [
  { label: 'Dashboard',    href: '/customer/dashboard' },
  { label: 'My Pets',      href: '/customer/pets' },
  { label: 'Appointments', href: '/customer/appointments' },
  { label: 'Shop',         href: '/customer/shop' },
  { label: 'Messages',     href: '/customer/messages' },
  { label: 'AI Chat',      href: '/customer/ai-chat' },
  { label: 'Emergency',    href: '/customer/emergency' },
  { label: 'Branches',     href: '/customer/branches' },
];

// ── Magalang (branch 6) ──────────────────────────────────────────────────────
const MANAGER_MAGALANG_LINKS = [
  { label: 'Dashboard',       href: '/dashboard' },
  { label: 'Patient Records', href: '/patient-records' },
  { label: 'Appointments',    href: '/appointments' },
  { label: 'Room Status',     href: '/room-availability' },
  { label: 'Inventory',       href: '/inventory' },
  { label: 'Point of Sale',   href: '/point-of-sale' },
  { label: 'Walk-In',         href: '/walk-in' },
  { label: 'Reports',         href: '/reports' },
  { label: 'Messages',        href: '/messages' },
  { label: 'Emergency',       href: '/emergency' },
  { label: 'Manager Control', href: '/manager-control' },
];

const EMPLOYEE_MAGALANG_LINKS = [
  { label: 'Dashboard',       href: '/dashboard' },
  { label: 'Patient Records', href: '/patient-records' },
  { label: 'Appointments',    href: '/appointments' },
  { label: 'Room Status',     href: '/room-availability' },
  { label: 'Inventory',       href: '/inventory' },
  { label: 'Point of Sale',   href: '/point-of-sale' },
  { label: 'Walk-In',         href: '/walk-in' },
  { label: 'Messages',        href: '/messages' },
  { label: 'Emergency',       href: '/emergency' },
];

const CUSTOMER_MAGALANG_LINKS = [
  { label: 'Dashboard',    href: '/customer/dashboard' },
  { label: 'My Pets',      href: '/customer/pets' },
  { label: 'Appointments', href: '/customer/appointments' },
  { label: 'Shop',         href: '/customer/shop' },
  { label: 'Messages',     href: '/customer/messages' },
  { label: 'AI Chat',      href: '/customer/ai-chat' },
  { label: 'Emergency',    href: '/customer/emergency' },
  { label: 'Branches',     href: '/customer/branches' },
];

// ─────────────────────────────────────────────────────────────────────────────
// getNavLinks
// ─────────────────────────────────────────────────────────────────────────────
export const getNavLinks = (role, branchId) => {
  const r  = String(role || '').toLowerCase().replace(/[\s_]/g, '');
  const id = Number(branchId);

  switch (r) {
    case 'superadmin':
    case 'admin':
      return ADMIN_LINKS;

    case 'manager':
      if (id === 5) return MANAGER_SF_LINKS;
      if (id === 2) return MANAGER_MABALACAT_LINKS;
      if (id === 3) return MANAGER_TARLAC_LINKS;
      if (id === 4) return MANAGER_ANGELES_LINKS;
      if (id === 6) return MANAGER_MAGALANG_LINKS;
      return MANAGER_MAIN_LINKS;

    case 'employee':
    case 'staff':
      if (id === 5) return EMPLOYEE_SF_LINKS;
      if (id === 2) return EMPLOYEE_MABALACAT_LINKS;
      if (id === 3) return EMPLOYEE_TARLAC_LINKS;
      if (id === 4) return EMPLOYEE_ANGELES_LINKS;
      if (id === 6) return EMPLOYEE_MAGALANG_LINKS;
      return EMPLOYEE_MAIN_LINKS;

    case 'customer':
    case 'guest':
      if (id === 5) return CUSTOMER_SF_LINKS;
      if (id === 2) return CUSTOMER_MABALACAT_LINKS;
      if (id === 3) return CUSTOMER_TARLAC_LINKS;
      if (id === 4) return CUSTOMER_ANGELES_LINKS;
      if (id === 6) return CUSTOMER_MAGALANG_LINKS;
      return CUSTOMER_MAIN_LINKS;

    default:
      return EMPLOYEE_MAIN_LINKS;
  }
};