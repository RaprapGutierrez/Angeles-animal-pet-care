
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Layout from '../components/layout';
import { supabase, supabaseAdmin } from '../js/supabase';
import { useCurrentUser } from '../js/useCurrentUser';

const SKEL_CSS = `
@keyframes shimmer {
  0%   { background-position: -600px 0 }
  100% { background-position:  600px 0 }
}
.skel {
  background: linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%);
  background-size: 600px 100%;
  animation: shimmer 1.4s infinite linear;
  border-radius: 8px;
  display: block;
}
.usr-clipboard-bar {
  background: linear-gradient(135deg, #0f172a, #1e3a8a);
  padding: 10px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-radius: 14px 14px 0 0;
}
.usr-section-label {
  background: #f1f5f9;
  border-bottom: 1px solid #e2e8f0;
  padding: 6px 16px;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #64748b;
}
.usr-inline-inp {
  width: 100%;
  border: none;
  border-bottom: 1.5px solid #cbd5e1;
  background: transparent;
  font-size: 13px;
  font-weight: 600;
  color: var(--text, #1e293b);
  outline: none;
  padding: 2px 0;
  font-family: inherit;
  box-sizing: border-box;
}
.usr-inline-inp:focus {
  border-bottom-color: #2563eb;
}
.usr-inline-inp.err {
  border-bottom-color: #ef4444;
}
.usr-field-label {
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: #94a3b8;
  margin-bottom: 6px;
}
`;
const Skel = ({ w = '100%', h = 16 }) => (
  <span className="skel" style={{ width: w, height: h, borderRadius: 8, display: 'block' }} />
);

// ── Constants ─────────────────────────────────────────────────────────────────
const ROLE_BADGE = {
  Admin: 'badge-purple', Manager: 'badge-blue',
  Employee: 'badge-green', Customer: 'badge-gray',
};
const AVATAR_COLORS = {
  Admin: { bg: '#ede9fe', color: '#6d28d9' },
  Manager: { bg: '#dbeafe', color: '#1d4ed8' },
  Employee: { bg: '#dcfce7', color: '#15803d' },
  Customer: { bg: '#f3f4f6', color: '#4b5563' },
};
const ALL_PERMISSIONS = [
  { key: 'all_modules', label: 'All modules' },
  { key: 'user_management', label: 'User management' },
  { key: 'system_settings', label: 'System settings' },
  { key: 'reports', label: 'Reports & Analytics' },
  { key: 'patient_records', label: 'Patient records' },
  { key: 'appointments', label: 'Appointments' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'walk_in', label: 'Walk-in' },
  { key: 'room_availability', label: 'Room availability' },
  { key: 'view_own_pets', label: 'View own pets' },
  { key: 'book_appointments', label: 'Book appointments' },
  { key: 'view_shop', label: 'View shop' },
  { key: 'send_messages', label: 'Send messages' },
];
const SYSTEM_ROLES = [
  { id: 'admin', role: 'Admin', icon: '/icon/admin.png', system: true, desc: 'Full system access.', perms: ['all_modules', 'user_management', 'system_settings', 'reports'] },
  { id: 'manager', role: 'Manager', icon: '/icon/manager.png', system: true, desc: 'Manages daily operations.', perms: ['patient_records', 'appointments', 'inventory', 'reports'] },
  { id: 'employee', role: 'Employee', icon: '/icon/staff.png', system: true, desc: 'Access to patient care modules.', perms: ['patient_records', 'appointments', 'walk_in', 'room_availability'] },
  { id: 'customer', role: 'Customer', icon: '/icon/customer.png', system: true, desc: 'Customer portal only.', perms: ['view_own_pets', 'book_appointments', 'view_shop', 'send_messages'] },
];
const BLANK_ROLE_FORM = { role: '', desc: '', color: '#2563eb', perms: [] };

const generatePassword = () => {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ', lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789', special = '!@#$%&*';
  const all = upper + lower + digits + special;
  const pick = (s) => s[Math.floor(Math.random() * s.length)];
  const required = [pick(upper), pick(lower), pick(digits), pick(special)];
  const rest = Array.from({ length: 4 }, () => pick(all));
  return [...required, ...rest].sort(() => Math.random() - 0.5).join('');
};

const fmtDate = (str) => str ? new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const fmtTime = (d) => {
  const pad = (n) => String(n).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// ── Sub-components ─────────────────────────────────────────────────────────────
const Avatar = ({ firstName, lastName, role, size = 36 }) => {
  const initials = [firstName, lastName].filter(Boolean).map(n => n.charAt(0).toUpperCase()).join('') || '?';
  const palette = AVATAR_COLORS[role] || { bg: '#f3f4f6', color: '#4b5563' };
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: palette.bg, color: palette.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: size * 0.38, flexShrink: 0, border: `1.5px solid ${palette.color}22`, userSelect: 'none' }}>
      {initials}
    </div>
  );
};

const Toggle = ({ checked, onChange, label }) => (
  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
    <div onClick={() => onChange(!checked)} style={{ width: 44, height: 24, borderRadius: 12, position: 'relative', transition: 'background 0.2s', background: checked ? '#2563eb' : '#d1d5db', flexShrink: 0, cursor: 'pointer' }}>
      <div style={{ position: 'absolute', top: 3, left: checked ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
    </div>
    <span style={{ fontSize: 13, color: 'var(--text)' }}>{label}</span>
  </label>
);

const ConfirmModal = ({ show, title, message, onConfirm, onCancel, confirmLabel = 'Confirm', type = 'primary' }) => {
  if (!show) return null;
  const colors = { primary: '#2563eb', danger: '#dc2626', success: '#16a34a' };
  const color = colors[type] || colors.primary;
  return (
    <>
      <div onClick={onCancel} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1050 }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 1055, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, pointerEvents: 'none' }}>
        <div style={{ width: '100%', maxWidth: 480, pointerEvents: 'all' }}>
          <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ backgroundColor: color, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h5 style={{ color: '#fff', fontWeight: 700, fontSize: 15, margin: 0 }}>{title}</h5>
              <button onClick={onCancel} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ padding: '20px 20px 8px' }}><p style={{ margin: 0, fontSize: 14, color: '#374151', lineHeight: 1.6 }}>{message}</p></div>
            <div style={{ padding: '12px 20px 16px', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={onCancel} style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 18px', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#374151' }}>Cancel</button>
              <button onClick={onConfirm} style={{ backgroundColor: color, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 22px', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>{confirmLabel}</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

const CredentialCard = ({ credentials, onClose }) => {
  const [copied, setCopied] = useState(false);
  const copyAll = () => {
    const text = `Name: ${credentials.fullName}\nEmail: ${credentials.email}\nPassword: ${credentials.password}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 24px 64px rgba(0,0,0,0.30)', width: '100%', maxWidth: 440, overflow: 'hidden' }}>
        <div style={{ background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', padding: '20px 24px 16px', borderBottom: '1px solid #bbf7d0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#14532d' }}>Account Created!</h3>
              <p style={{ margin: 0, fontSize: 12, color: '#16a34a', marginTop: 2 }}>Share these credentials with the user</p>
            </div>
          </div>
        </div>
        <div style={{ padding: '20px 24px' }}>
          {[['Name', credentials.fullName], ['Email', credentials.email], ['Password', credentials.password]].map(([label, value]) => (
            <div key={label} style={{ marginBottom: 12 }}>
              <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>{label}</p>
              <div style={{ background: '#f8fafc', border: '1.5px solid var(--border)', borderRadius: 8, padding: '9px 14px', fontSize: 13, fontWeight: 600, color: 'var(--text)', fontFamily: label.includes('Password') ? 'monospace' : 'inherit' }}>{value}</div>
            </div>
          ))}
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#92400e', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#92400e" strokeWidth="2.5" strokeLinecap="round" style={{ marginTop: 1, flexShrink: 0 }}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <span>This password will not be shown again. Copy it before closing.</span>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 24px', borderTop: '1px solid var(--border)' }}>
          <button className="btn btn-ghost" style={{ width: 'auto' }} onClick={copyAll}>{copied ? '✓ Copied!' : 'Copy All'}</button>
          <button className="btn btn-primary" style={{ width: 'auto' }} onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
};

const LiveToast = ({ message, show }) => (
  <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9998, background: '#1e293b', color: '#fff', borderRadius: 10, padding: '10px 18px', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.22)', opacity: show ? 1 : 0, transform: show ? 'translateY(0)' : 'translateY(10px)', transition: 'opacity 0.25s, transform 0.25s', pointerEvents: 'none' }}>
    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
    {message}
  </div>
);

const DetailRow = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
    <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</span>
    <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{value || '—'}</span>
  </div>
);

const generateLogs = (users) => {
  const actions = ['Logged in', 'Viewed dashboard', 'Updated patient record', 'Edited appointment', 'Viewed reports', 'Changed user role', 'Exported data', 'Updated inventory', 'Viewed admin panel', 'Logged out'];
  const logs = [];
  const now = new Date();
  users.slice(0, 12).forEach((u, i) => {
    const count = Math.floor(Math.random() * 3) + 1;
    for (let j = 0; j < count; j++) {
      const minsAgo = Math.floor(Math.random() * 1440);
      const ts = new Date(now - minsAgo * 60000);
      logs.push({ id: `${u.id}-${j}`, user: u, action: actions[Math.floor(Math.random() * actions.length)], timestamp: ts, ip: `192.168.${Math.floor(Math.random() * 5)}.${Math.floor(Math.random() * 254) + 1}`, status: Math.random() > 0.08 ? 'Success' : 'Failed' });
    }
  });
  return logs.sort((a, b) => b.timestamp - a.timestamp);
};

// ── Main Component ─────────────────────────────────────────────────────────────
const AdminSecurity = () => {
  // ── FIX 1: destructure isSuperAdmin from useCurrentUser ──────────────────
  // canSeeAllBranches = true for both SuperAdmin AND Admin
  const { user: currentUser, isAdmin, isSuperAdmin, loading: userLoading } = useCurrentUser();
  const canSeeAllBranches = isSuperAdmin || isAdmin;

  const [branches, setBranches] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('users');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [pendingRequests, setPendingRequests] = useState([]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [viewUser, setViewUser] = useState(null);
  const [editUser, setEditUser] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [saving, setSaving] = useState(false);

  const [addForm, setAddForm] = useState({ first_name: '', last_name: '', email: '', password: '', role: 'Employee', status: 'Active', branch_id: '' });
  const [addErrors, setAddErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [editForm, setEditForm] = useState({ role: 'Employee', status: 'Active', first_name: '', last_name: '', branch_id: '' });

  const [logs, setLogs] = useState([]);
  const [logSearch, setLogSearch] = useState('');
  const [logRole, setLogRole] = useState('');

  const [customRoles, setCustomRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editRoleTarget, setEditRoleTarget] = useState(null);
  const [roleForm, setRoleForm] = useState(BLANK_ROLE_FORM);
  const [roleFormErrors, setRoleFormErrors] = useState({});
  const [roleSaving, setRoleSaving] = useState(false);

  const [settings, setSettings] = useState({ allowSelfRegister: true, requireEmailVerify: true, twoFactorAdmin: false, sessionTimeout: 30, maxLoginAttempts: 5, allowCustomerPortal: true, maintenanceMode: false, allowRoleChange: true, showActivityLogs: true, autoDeactivateInactive: false, inactiveDays: 90, passwordMinLength: 6 });
  const [settingsSaved, setSettingsSaved] = useState(false);

  const [liveToast, setLiveToast] = useState({ show: false, message: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const ROWS_PER_PAGE = 10;
  const toastTimer = useRef(null);

  const showToast = (message) => {
    clearTimeout(toastTimer.current);
    setLiveToast({ show: true, message });
    toastTimer.current = setTimeout(() => setLiveToast({ show: false, message: '' }), 3000);
  };

  // ── Fetch branches ────────────────────────────────────────────────────────
  const fetchBranches = useCallback(async () => {
    const { data } = await supabase.from('branches').select('id, name').order('name');
    setBranches(data || []);
  }, []);

  // ── FIX 2: fetchUsers — removed stray `req.branch_id` reference that
  //    caused a ReferenceError and stopped all users from loading ────────────
  const fetchUsers = useCallback(async () => {
    if (userLoading || !currentUser) return;
    setLoading(true);

    let query = supabase
      .from('profiles')
      .select('*, branches(name)')
      .order('created_at', { ascending: false });

    if (canSeeAllBranches) {
      // SuperAdmin / Admin: optionally filter by selected branch dropdown
      if (branchFilter) {
        query = query.eq('branch_id', branchFilter);
      }
      // else: no filter → fetch ALL branches
    } else {
      // Manager: always scope to their own branch only
      if (currentUser.branchId) {
        query = query.eq('branch_id', currentUser.branchId);
      }
    }

    const { data, error } = await query;
    if (!error) {
      const fetched = data || [];
      setUsers(fetched);
      setLogs(generateLogs(fetched));
    }
    setLoading(false);
  }, [canSeeAllBranches, currentUser, userLoading, branchFilter]);

  // ── FIX 3: fetchPending — use canSeeAllBranches consistently ─────────────
  const fetchPending = useCallback(async () => {
    let query = supabase
      .from('pending_users')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (!canSeeAllBranches && currentUser?.branchId) {
      query = query.eq('branch_id', currentUser.branchId);
    }
    // SuperAdmin/Admin: no branch filter → see pending from all branches

    const { data } = await query;
    setPendingRequests(data || []);
  }, [canSeeAllBranches, currentUser]);

  const fetchCustomRoles = useCallback(async () => {
    setRolesLoading(true);
    const { data, error } = await supabase.from('roles').select('*').order('created_at', { ascending: true });
    if (!error) setCustomRoles(data || []);
    setRolesLoading(false);
  }, []);

  useEffect(() => {
    if (!userLoading) {
      fetchBranches();
      fetchUsers();
      fetchPending();
      fetchCustomRoles();
    }
  }, [userLoading, fetchUsers, fetchPending, fetchCustomRoles, fetchBranches]);

  useEffect(() => { if (canSeeAllBranches) fetchUsers(); }, [branchFilter]); // eslint-disable-line

  // ── FIX 4: Realtime subscriptions — removed stray `req.branch_id`
  //    reference inside INSERT handler that caused a ReferenceError ──────────
  useEffect(() => {
    const profilesSub = supabase
      .channel('realtime-profiles-admin')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, (payload) => {
        const newUser = payload.new;
        // Managers: only show inserts from their own branch
        if (!canSeeAllBranches && newUser.branch_id !== currentUser?.branchId) return;
        setUsers((prev) => prev.find(u => u.id === newUser.id) ? prev : [newUser, ...prev]);
        showToast(`New user added: ${newUser.first_name || newUser.email}`);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, (payload) => {
        const updated = payload.new;
        setUsers((prev) => prev.map(u => u.id === updated.id ? { ...u, ...updated } : u));
        setViewUser(v => v?.id === updated.id ? { ...v, ...updated } : v);
        showToast(`User updated: ${updated.first_name || updated.email}`);
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'profiles' }, (payload) => {
        const deletedId = payload.old?.id;
        setUsers((prev) => prev.filter(u => u.id !== deletedId));
        setViewUser(v => v?.id === deletedId ? null : v);
        showToast('User removed');
      })
      .subscribe();

    // ── FIX 5: pending INSERT handler — was using `req` before it was
    //    defined (payload destructured below). Fixed variable name. ──────────
    const pendingSub = supabase
      .channel('realtime-pending-admin')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pending_users' }, (payload) => {
        const newReq = payload.new;
        if (newReq.status === 'pending') {
          if (!canSeeAllBranches && newReq.branch_id !== currentUser?.branchId) return;
          setPendingRequests(prev => prev.find(r => r.id === newReq.id) ? prev : [newReq, ...prev]);
          showToast(`New account request from ${newReq.first_name || newReq.email}`);
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pending_users' }, (payload) => {
        const req = payload.new;
        if (req.status !== 'pending') setPendingRequests(prev => prev.filter(r => r.id !== req.id));
        else setPendingRequests(prev => prev.map(r => r.id === req.id ? req : r));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'pending_users' }, (payload) => {
        setPendingRequests(prev => prev.filter(r => r.id !== payload.old?.id));
      })
      .subscribe();

    const rolesSub = supabase
      .channel('realtime-roles-admin')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'roles' }, (payload) => {
        setCustomRoles(prev => prev.find(r => r.id === payload.new.id) ? prev : [...prev, payload.new]);
        showToast(`New role created: ${payload.new.role}`);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'roles' }, (payload) => {
        setCustomRoles(prev => prev.map(r => r.id === payload.new.id ? { ...r, ...payload.new } : r));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'roles' }, (payload) => {
        setCustomRoles(prev => prev.filter(r => r.id !== payload.old?.id));
        showToast('Role deleted');
      })
      .subscribe();

    return () => {
      supabase.removeChannel(profilesSub);
      supabase.removeChannel(pendingSub);
      supabase.removeChannel(rolesSub);
    };
  }, [canSeeAllBranches, currentUser]); // eslint-disable-line

  useEffect(() => { if (users.length > 0) setLogs(generateLogs(users)); }, [users]);

  const allRoles = [...SYSTEM_ROLES, ...customRoles];
  const fullName = (u) => [u.first_name, u.last_name].filter(Boolean).join(' ') || u.name || '—';

  const openAdd = () => {
    const pwd = generatePassword();
    setAddForm({
      first_name: '', last_name: '', email: '', password: pwd,
      role: 'Employee', status: 'Active',
      sex: '',
      branch_id: canSeeAllBranches ? '' : (currentUser?.branchId || ''),
    });
    setAddErrors({});
    setShowPassword(false);
    setShowAddModal(true);
  };

  const validateAdd = () => {
    const errs = {};
    if (!addForm.first_name.trim()) errs.first_name = 'First name is required';
    if (!addForm.last_name.trim()) errs.last_name = 'Last name is required';
    if (!addForm.email.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addForm.email)) errs.email = 'Invalid email';
    else if (users.some(u => u.email?.toLowerCase() === addForm.email.toLowerCase())) errs.email = 'Email already exists';
    if (!addForm.password.trim()) errs.password = 'Password is required';
    // FIX 7: require branch selection for SuperAdmin/Admin when adding
    if (canSeeAllBranches && !addForm.branch_id) errs.branch_id = 'Please select a branch';
    return errs;
  };

  const handleAddUser = async () => {
    const errs = validateAdd();
    if (Object.keys(errs).length) { setAddErrors(errs); return; }
    setSaving(true);

    try {
      // Step 1: Create auth user
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: addForm.email.trim().toLowerCase(),
        password: addForm.password,
        email_confirm: true,
      });

      if (authError) {
        // If user already exists in auth, try to find their profile
        if (authError.message?.includes('already been registered')) {
          setAddErrors({ email: 'This email is already registered in the system.' });
          setSaving(false);
          return;
        }
        alert('Auth Error: ' + authError.message);
        setSaving(false);
        return;
      }

      const userId = authData.user.id;

      // Step 2: Check if profile already exists (prevents pkey duplicate)
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single();

      if (existingProfile) {
        // Profile exists — just update it instead of inserting
        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({
            first_name: addForm.first_name.trim(),
            last_name: addForm.last_name.trim(),
            email: addForm.email.trim().toLowerCase(),
            role: addForm.role,
            status: addForm.status,
            sex: addForm.sex || null,
            branch_id: addForm.branch_id || currentUser?.branchId || null,
          })
          .eq('id', userId);

        if (updateError) {
          alert('Error updating existing profile: ' + updateError.message);
          setSaving(false);
          return;
        }
      } else {
        // Step 3: Insert fresh profile
        const { error: insertError } = await supabaseAdmin
          .from('profiles')
          .insert([{
            id: userId,
            first_name: addForm.first_name.trim(),
            last_name: addForm.last_name.trim(),
            email: addForm.email.trim().toLowerCase(),
            role: addForm.role,
            status: addForm.status,
            sex: addForm.sex || null,
            branch_id: addForm.branch_id || currentUser?.branchId || null,
          }]);

        if (insertError) {
          // Rollback: delete the auth user we just created
          await supabaseAdmin.auth.admin.deleteUser(userId);
          alert('Error creating profile: ' + insertError.message);
          setSaving(false);
          return;
        }
      }

      setSaving(false);
      setCreatedCredentials({
        fullName: `${addForm.first_name.trim()} ${addForm.last_name.trim()}`,
        email: addForm.email.trim().toLowerCase(),
        password: addForm.password,
      });
      setShowAddModal(false);

    } catch (err) {
      alert('Unexpected error: ' + err.message);
      setSaving(false);
    }
  };

  const handleApprovePending = (req) => {
    setConfirm({
      title: 'Approve Account Request',
      message: `Approve and create account for ${[req.first_name, req.last_name].filter(Boolean).join(' ')} (${req.email})?`,
      type: 'success', confirmLabel: 'Approve & Create',
      onConfirm: async () => {
        setConfirm(null);
        const { error } = await supabaseAdmin.from('profiles').insert([{ // ← changed
          first_name: req.first_name,
          last_name: req.last_name,
          email: req.email,
          role: req.role,
          status: 'Active',
          branch_id: req.branch_id || currentUser?.branchId || null
        }]);
        if (error) { alert('Error: ' + error.message); return; }
        await supabase.from('pending_users').update({ status: 'approved' }).eq('id', req.id);
        setCreatedCredentials({ fullName: `${req.first_name} ${req.last_name}`, email: req.email, password: req.password_hint || '—' });
      },
    });
  };

  const handleRejectPending = (req) => {
    setConfirm({
      title: 'Reject Request', message: `Reject account request for ${[req.first_name, req.last_name].filter(Boolean).join(' ')}?`,
      type: 'danger', confirmLabel: 'Reject',
      onConfirm: async () => { setConfirm(null); await supabase.from('pending_users').update({ status: 'rejected' }).eq('id', req.id); },
    });
  };

  const openEdit = (u) => {
    setEditForm({
      role: u.role || 'Employee',
      status: u.status || 'Active',
      first_name: u.first_name || '',
      last_name: u.last_name || '',
      branch_id: u.branch_id || '',
      email: u.email || '',
      sex: u.sex || '',
    });
    setEditUser(u);
    setShowEditModal(true);
  };

  // ── ENHANCED saveUser — SuperAdmin can edit ANY field including email ─────
  const saveUser = async () => {
    setSaving(true);
    try {
      const updatePayload = {
        role: editForm.role,
        status: editForm.status,
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        branch_id: editForm.branch_id || null,
      };

      // SuperAdmin can also update email via admin API
      if (isSuperAdmin && editForm.email && editForm.email !== editUser.email) {
        const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
          editUser.id,
          { email: editForm.email.trim().toLowerCase(), email_confirm: true }
        );
        if (authUpdateError) {
          alert('Email update error: ' + authUpdateError.message);
          setSaving(false);
          return;
        }
        updatePayload.email = editForm.email.trim().toLowerCase();
      }

      const { error } = await supabaseAdmin
        .from('profiles')
        .update(updatePayload)
        .eq('id', editUser.id);

      if (error) { alert('Error: ' + error.message); setSaving(false); return; }

      showToast(`User ${editForm.first_name} updated successfully`);
      setShowEditModal(false);
    } catch (err) {
      alert('Unexpected error: ' + err.message);
    }
    setSaving(false);
  };

  const handleDelete = (u) => {
    setConfirm({
      title: 'Delete User',
      message: `Permanently delete ${fullName(u)}? ${isSuperAdmin ? 'This will also remove their login credentials.' : ''}`,
      type: 'danger',
      confirmLabel: 'Delete Permanently',
      onConfirm: async () => {
        setConfirm(null);
        try {
          // SuperAdmin: delete from auth too (cascades to profile via trigger,
          // or do both explicitly if no cascade is set)
          if (isSuperAdmin) {
            const { error: authDelError } = await supabaseAdmin.auth.admin.deleteUser(u.id);
            if (authDelError && !authDelError.message?.includes('not found')) {
              alert('Auth delete error: ' + authDelError.message);
              return;
            }
          }

          // Always delete the profile row
          const { error } = await supabaseAdmin
            .from('profiles')
            .delete()
            .eq('id', u.id);

          if (error) { alert('Error: ' + error.message); return; }
          showToast(`${fullName(u)} deleted`);
          if (viewUser?.id === u.id) setViewUser(null);
        } catch (err) {
          alert('Unexpected error: ' + err.message);
        }
      },
    });
  };

  // ── NEW: SuperAdmin can reset any user's password ─────────────────────────
  const handleResetPassword = (u) => {
    const newPassword = generatePassword();
    setConfirm({
      title: 'Reset Password',
      message: `Reset password for ${fullName(u)}? A new password will be generated and shown to you.`,
      type: 'primary',
      confirmLabel: 'Reset Password',
      onConfirm: async () => {
        setConfirm(null);
        const { error } = await supabaseAdmin.auth.admin.updateUserById(u.id, { password: newPassword });
        if (error) { alert('Error: ' + error.message); return; }
        setCreatedCredentials({
          fullName: fullName(u),
          email: u.email,
          password: newPassword,
        });
        showToast(`Password reset for ${fullName(u)}`);
      },
    });
  };

  const handleDeactivate = (u) => {
    setConfirm({
      title: 'Deactivate User', message: `Deactivate ${fullName(u)}?`,
      type: 'danger', confirmLabel: 'Deactivate',
      onConfirm: async () => { await supabase.from('profiles').update({ status: 'Inactive' }).eq('id', u.id); setConfirm(null); },
    });
  };

  const validateRoleForm = () => {
    const errs = {};
    if (!roleForm.role.trim()) errs.role = 'Role name is required';
    else if (allRoles.some(r => r.role.toLowerCase() === roleForm.role.trim().toLowerCase() && r.id !== editRoleTarget?.id)) errs.role = 'Role already exists';
    if (!roleForm.desc.trim()) errs.desc = 'Description is required';
    if (roleForm.perms.length === 0) errs.perms = 'Select at least one permission';
    return errs;
  };

  const saveRole = async () => {
    const errs = validateRoleForm();
    if (Object.keys(errs).length) { setRoleFormErrors(errs); return; }
    setRoleSaving(true);
    const payload = { role: roleForm.role.trim(), desc: roleForm.desc.trim(), color: roleForm.color, perms: roleForm.perms };
    let error;
    if (editRoleTarget) ({ error } = await supabase.from('roles').update(payload).eq('id', editRoleTarget.id));
    else ({ error } = await supabase.from('roles').insert([payload]));
    setRoleSaving(false);
    if (error) { alert('Error: ' + error.message); return; }
    setShowRoleModal(false);
  };

  const handleDeleteRole = (r) => {
    setConfirm({
      title: 'Delete Role', message: `Delete the "${r.role}" role?`,
      type: 'danger', confirmLabel: 'Delete Role',
      onConfirm: async () => { const { error } = await supabase.from('roles').delete().eq('id', r.id); setConfirm(null); if (error) alert('Error: ' + error.message); },
    });
  };

  const togglePerm = (key) => {
    setRoleForm(f => ({ ...f, perms: f.perms.includes(key) ? f.perms.filter(p => p !== key) : [...f.perms, key] }));
    setRoleFormErrors(e => ({ ...e, perms: '' }));
  };

  const saveSettings = () => { localStorage.setItem('adminSettings', JSON.stringify(settings)); setSettingsSaved(true); setTimeout(() => setSettingsSaved(false), 2500); };

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    return (!search || `${fullName(u)} ${u.email || ''}`.toLowerCase().includes(q)) && (!roleFilter || u.role === roleFilter);
  });

  useEffect(() => { setCurrentPage(1); }, [search, roleFilter, branchFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * ROWS_PER_PAGE, safePage * ROWS_PER_PAGE);

  const filteredLogs = logs.filter(l => {
    const q = logSearch.toLowerCase();
    const name = fullName(l.user).toLowerCase();
    return (!logSearch || name.includes(q) || l.action.toLowerCase().includes(q) || l.ip.includes(q)) && (!logRole || l.user.role === logRole);
  });

  // FIX 8: branchLabel — for SuperAdmin/Admin, show which branch is filtered
  // or "All Branches". For Manager, show their own branch name.
  const branchLabel = canSeeAllBranches
    ? (branchFilter
      ? (branches.find(b => String(b.id) === String(branchFilter))?.name || 'All Branches')
      : 'All Branches')
    : (branches.find(b => b.id === currentUser?.branchId)?.name || 'Your Branch');

  const counts = {
    total: users.length,
    active: users.filter(u => u.status === 'Active').length,
    admins: users.filter(u => ['admin', 'super_admin'].includes(u.role?.toLowerCase())).length,
    pending: pendingRequests.length,
  };

  const S = {
    page: { width: '100%', minHeight: '100vh', display: 'block' },
    topbar: { background: '#fff', borderBottom: '1px solid var(--border)', padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 'var(--topbar-h)', zIndex: 99, width: '100%', boxSizing: 'border-box', gap: 12 },
    cont: { padding: '24px 28px', paddingTop: 'calc(var(--topbar-h) + var(--pagetop-h) + 20px)', width: '100%', boxSizing: 'border-box' },
    th: { background: 'var(--bg)', padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--border)' },
    td: { padding: '13px 14px', borderBottom: '1px solid var(--border)', color: 'var(--text)', verticalAlign: 'middle' },
    btn: { width: 'auto' },
    inp: { padding: '9px 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', background: '#fff', color: 'var(--text)', outline: 'none' },
    inpErr: { padding: '9px 12px', border: '1.5px solid #f87171', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', background: '#fff', color: 'var(--text)', outline: 'none' },
    errMsg: { fontSize: 11, color: '#dc2626', marginTop: 4 },
  };

  const TAB_LIST = [
    { key: 'users', label: 'Users' },
    { key: 'pending', label: `Pending Approval${pendingRequests.length > 0 ? ` (${pendingRequests.length})` : ''}` },
    { key: 'roles', label: 'Roles' },
    { key: 'logs', label: 'Logs' },
    { key: 'settings', label: 'Settings' },
  ];

  if (userLoading) return <Layout><div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Loading...</div></Layout>;

  return (
    <Layout>
      <LiveToast message={liveToast.message} show={liveToast.show} />
      <div style={S.page}>
        <style>{SKEL_CSS}</style>
        <div style={S.topbar}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/icon/admin.png" alt="" style={{ width: 22, height: 22, filter: 'brightness(0) saturate(100%) invert(17%) sepia(82%) saturate(1200%) hue-rotate(210deg)' }} />
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', margin: 0 }}>Admin &amp; Security</h1>
              <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
                {/* FIX 9: show SuperAdmin badge in header when applicable */}
                {isSuperAdmin
                  ? <span style={{ color: '#7c3aed', fontWeight: 700 }}>Super Admin</span>
                  : branchLabel
                } · Manage users, roles and system access
                <span style={{ marginLeft: 10, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: '#16a34a' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block', animation: 'livePulse 2s infinite' }} />
                  Live
                </span>
              </p>
            </div>
          </div>

          {/* FIX 10: Branch filter shown for BOTH Admin and SuperAdmin ─────── */}
          {canSeeAllBranches && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {isSuperAdmin && (
                <span style={{ fontSize: 11, fontWeight: 700, background: '#ede9fe', color: '#6d28d9', borderRadius: 20, padding: '3px 10px', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                  Super Admin
                </span>
              )}
              <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)} style={{ ...S.inp, width: 180 }}>
                <option value="">All Branches</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          )}
        </div>

        <style>{`@keyframes livePulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.4); } }`}</style>

        <div style={S.cont}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
            {loading ? (
              [1, 2, 3, 4].map(i => (
                <div key={i} className="stat-card">
                  <Skel w={48} h={48} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <Skel w="60%" h={12} />
                    <Skel w="40%" h={22} />
                  </div>
                </div>
              ))
            ) : (
              [
                { label: 'Total Users', value: counts.total, icon: '/icon/total_user.png', color: 'blue' },
                { label: 'Active', value: counts.active, icon: '/icon/active_acc.png', color: 'green' },
                { label: 'Admins', value: counts.admins, icon: '/icon/admin_2.png', color: 'purple' },
                { label: 'Pending Approval', value: counts.pending, icon: '/icon/pending.png', color: 'yellow' },
              ].map((sc, i) => (
                <div key={i} style={{
                  background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 16,
                  padding: 20, display: 'flex', flexDirection: 'column', gap: 14,
                  position: 'relative', overflow: 'hidden', cursor: 'default',
                  transition: 'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease',
                  boxShadow: '0 2px 12px rgba(30,58,138,0.05)',
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(30,58,138,0.10)'; e.currentTarget.style.borderColor = 'rgba(30,58,138,0.25)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(30,58,138,0.05)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                >
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, borderRadius: '16px 16px 0 0', background: sc.color === 'blue' ? 'linear-gradient(90deg,#1e3a8a,#3b82f6)' : sc.color === 'green' ? 'linear-gradient(90deg,#16a34a,#22c55e)' : sc.color === 'purple' ? 'linear-gradient(90deg,#7c3aed,#a855f7)' : 'linear-gradient(90deg,#d97706,#f59e0b)' }} />
                  <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                    <div style={{ width: 46, height: 46, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: sc.color === 'blue' ? '#eff6ff' : sc.color === 'green' ? '#f0fdf4' : sc.color === 'purple' ? '#f3f0ff' : '#fffbeb' }}>
                      <img src={sc.icon} alt={sc.label} style={{ width: 24, height: 24, filter: sc.color === 'blue' ? 'brightness(0) saturate(100%) invert(17%) sepia(82%) saturate(1200%) hue-rotate(210deg)' : sc.color === 'green' ? 'brightness(0) saturate(100%) invert(32%) sepia(80%) saturate(600%) hue-rotate(110deg) brightness(0.9)' : sc.color === 'purple' ? 'brightness(0) saturate(100%) invert(22%) sepia(96%) saturate(1600%) hue-rotate(255deg) brightness(0.85)' : 'brightness(0) saturate(100%) invert(52%) sepia(90%) saturate(600%) hue-rotate(10deg) brightness(0.9)' }} />
                    </div>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{sc.label}</p>
                    <h3 style={{ margin: '4px 0 6px', fontSize: 26, fontWeight: 800, lineHeight: 1 }}>{sc.value}</h3>
                  </div>
                </div>
              ))
            )}
          </div>

          {pendingRequests.length > 0 && (
            <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 10, padding: '12px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#fde68a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#92400e" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/></svg>
              </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#92400e' }}>{pendingRequests.length} Account Request{pendingRequests.length > 1 ? 's' : ''} Awaiting Approval</p>
                  <p style={{ margin: 0, fontSize: 12, color: '#b45309' }}>Review and approve or reject.</p>
                </div>
              </div>
              <button className="btn" style={{ ...S.btn, background: '#d97706', color: '#fff', border: 'none', fontSize: 13, whiteSpace: 'nowrap' }} onClick={() => setTab('pending')}>Review Requests</button>
            </div>
          )}

          <div style={{ background: '#fff', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', marginBottom: 20 }}>
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 20px', overflowX: 'auto' }}>
              {TAB_LIST.map(t => (
                <div key={t.key} onClick={() => setTab(t.key)} style={{ padding: '14px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', borderBottom: `2px solid ${tab === t.key ? 'var(--royal)' : 'transparent'}`, color: tab === t.key ? 'var(--royal)' : 'var(--muted)', transition: 'all 0.18s', whiteSpace: 'nowrap' }}>
                  {t.label}
                </div>
              ))}
            </div>

            {/* ══ USERS TAB ══ */}
            {tab === 'users' && (
              <div style={{ padding: 20 }}>
                <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 8, padding: '8px 14px', flex: 1 }}>
                    <img src="/icon/search.png" alt="" style={{ width: 16, height: 16, filter: 'brightness(0) saturate(100%) invert(40%)' }} />
                    <input type="text" placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)} style={{ border: 'none', background: 'transparent', fontSize: 13, color: 'var(--text)', outline: 'none', fontFamily: 'inherit', width: '100%' }} />
                  </div>
                  <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={{ ...S.inp, width: 140 }}>
                    <option value="">All Roles</option>
                    <option>Admin</option><option>Manager</option><option>Employee</option><option>Customer</option>
                  </select>
                  <button className="btn btn-primary" style={{ ...S.btn, display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }} onClick={openAdd}>
                    <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Add User
                  </button>
                </div>

                <div style={{ fontSize: 11, fontWeight: 600, color: '#1e40af', background: '#dbeafe', border: '1px solid #bfdbfe', borderRadius: 6, padding: '4px 10px', marginBottom: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                    <polyline points="9 22 9 12 15 12 15 22"/>
                  </svg>
                  {canSeeAllBranches
                    ? (branchFilter
                      ? `Filtered: ${branchLabel}`
                      : `Showing all ${users.length} users across all branches`)
                    : `Your branch: ${branchLabel}`}
                </div>

                <div style={{ overflowX: 'auto' }}>
                  {loading ? (
                    <div style={{ padding: '8px 0' }}>
                      {/* Table header skeleton */}
                      <div style={{ display: 'flex', gap: 12, marginBottom: 12, padding: '11px 14px', background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                        {['22%', '20%', '12%', '10%', ...(canSeeAllBranches ? ['12%'] : []), '10%', '12%', '18%'].map((w, i) => (
                          <Skel key={i} w={w} h={13} />
                        ))}
                      </div>
                      {/* Table row skeletons */}
                      {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '13px 14px', borderBottom: '1px solid #f1f5f9' }}>
                          {/* Avatar + name */}
                          <div style={{ width: '22%', display: 'flex', alignItems: 'center', gap: 10 }}>
                            <Skel w={36} h={36} style={{ borderRadius: '50%', flexShrink: 0 }} />
                            <Skel w="65%" h={14} />
                          </div>
                          <Skel w="20%" h={13} />
                          <Skel w="12%" h={22} />
                          <Skel w="10%" h={22} />   {/* ← Sex column skeleton */}
                          {canSeeAllBranches && <Skel w="12%" h={22} />}
                          <Skel w="10%" h={22} />
                          <Skel w="12%" h={13} />
                          {/* Action buttons */}
                          <div style={{ width: '18%', display: 'flex', gap: 6 }}>
                            <Skel w="30%" h={28} />
                            <Skel w="30%" h={28} />
                            <Skel w="30%" h={28} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, tableLayout: 'fixed' }}>
                      <colgroup>
                        <col style={{ width: '19%' }} />
                        <col style={{ width: '18%' }} />
                        <col style={{ width: '10%' }} />
                        <col style={{ width: '9%' }} />
                        {canSeeAllBranches && <col style={{ width: '11%' }} />}
                        <col style={{ width: '9%' }} />
                        <col style={{ width: '10%' }} />
                        <col style={{ width: canSeeAllBranches ? '14%' : '25%' }} />
                      </colgroup>
                      <thead>
                        <tr style={{ background: 'var(--bg)' }}>
                          {['User', 'Email', 'Role', 'Sex', ...(canSeeAllBranches ? ['Branch'] : []), 'Status', 'Joined', 'Actions'].map(h => (
                            <th key={h} style={{ ...S.th, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.length === 0 ? (
                          <tr>
                            <td colSpan={canSeeAllBranches ? 8 : 7} style={{ textAlign: 'center', padding: '48px 0', color: 'var(--muted)' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ color: '#cbd5e1' }}><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                                <span style={{ fontSize: 13, fontWeight: 600 }}>No users found</span>
                                <span style={{ fontSize: 12 }}>Try adjusting your search or filters</span>
                              </div>
                            </td>
                          </tr>
                        ) : paginated.map((u, idx) => (
                          <tr key={u.id} style={{ background: idx % 2 === 0 ? 'transparent' : 'var(--bg)', transition: 'background 0.15s' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f0f7ff'}
                            onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? 'transparent' : 'var(--bg)'}>
                            <td style={{ ...S.td, overflow: 'hidden' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                                <Avatar firstName={u.first_name} lastName={u.last_name} role={u.role} />
                                <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fullName(u)}</div>
                              </div>
                            </td>
                            <td style={{ ...S.td, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--muted)', fontSize: 12 }}>{u.email || '—'}</td>
                            <td style={S.td}><span className={`badge ${ROLE_BADGE[u.role] || 'badge-gray'}`} style={{ fontSize: 10, whiteSpace: 'nowrap' }}>{u.role || '—'}</span></td>
                            <td style={S.td}>
                              {u.sex ? (
                                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 3,
                                  background: u.sex === 'Male' ? '#dbeafe' : '#fce7f3',
                                  color: u.sex === 'Male' ? '#1d4ed8' : '#be185d' }}>
                                  {u.sex === 'Male'
                                    ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="10" cy="14" r="6"/><path d="M19 5l-5.5 5.5M19 5h-5M19 5v5"/></svg>
                                    : <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="10" r="6"/><path d="M12 16v6M9 19h6"/></svg>}
                                  {u.sex}
                                </span>
                              ) : <span style={{ fontSize: 12, color: 'var(--muted)' }}>—</span>}
                            </td>
                            {canSeeAllBranches && (
                              <td style={{ ...S.td, overflow: 'hidden' }}>
                                <span style={{ fontSize: 11, background: '#f1f5f9', color: '#475569', borderRadius: 6, padding: '2px 8px', fontWeight: 600, display: 'inline-block', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {u.branches?.name || branches.find(b => b.id === u.branch_id)?.name || '—'}
                                </span>
                              </td>
                            )}
                            <td style={S.td}>
                              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 4,
                                background: u.status === 'Active' ? '#dcfce7' : '#fee2e2',
                                color: u.status === 'Active' ? '#15803d' : '#b91c1c' }}>
                                <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', flexShrink: 0 }} />
                                {u.status || 'Active'}
                              </span>
                            </td>
                            <td style={{ ...S.td, fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{fmtDate(u.created_at)}</td>
                            <td style={S.td}>
                              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                <button title="View" onClick={() => setViewUser(u)} style={{ background: 'none', border: '1px solid #bfdbfe', borderRadius: 6, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#2563eb' }}>
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                </button>
                                <button title="Edit" onClick={() => openEdit(u)} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 6, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                </button>
                                {u.status === 'Active' && (
                                  <button title="Deactivate" onClick={() => handleDeactivate(u)} style={{ background: 'none', border: '1px solid #fcd34d', borderRadius: 6, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#d97706' }}>
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                                  </button>
                                )}
                                {isSuperAdmin && (
                                  <button title="Reset Password" onClick={() => handleResetPassword(u)} style={{ background: 'none', border: '1px solid #c4b5fd', borderRadius: 6, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#7c3aed' }}>
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
                                  </button>
                                )}
                                <button title="Delete" onClick={() => handleDelete(u)} style={{ background: 'none', border: '1px solid #fca5a5', borderRadius: 6, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#dc2626' }}>
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
               {!loading && totalPages > 1 && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, padding: "14px 18px", borderTop: "1px solid var(--border)", marginTop: 8 }}>
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage === 1} style={{ padding: "6px 14px", borderRadius: 20, border: "1.5px solid var(--border)", background: "transparent", fontSize: 13, fontWeight: 600, color: safePage === 1 ? "var(--muted)" : "var(--text)", cursor: safePage === 1 ? "default" : "pointer", fontFamily: "inherit" }}>prev</button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(pg => (
                      <button key={pg} onClick={() => setCurrentPage(pg)} style={{ width: 34, height: 34, borderRadius: 20, border: "1.5px solid", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s", background: safePage === pg ? "var(--royal)" : "transparent", color: safePage === pg ? "#fff" : "var(--text)", borderColor: safePage === pg ? "var(--royal)" : "var(--border)" }}>{pg}</button>
                    ))}
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} style={{ padding: "6px 14px", borderRadius: 20, border: "1.5px solid var(--border)", background: "transparent", fontSize: 13, fontWeight: 600, color: safePage === totalPages ? "var(--muted)" : "var(--text)", cursor: safePage === totalPages ? "default" : "pointer", fontFamily: "inherit" }}>next</button>
                  </div>
                )}
                {!loading && <div style={{ marginTop: 6, fontSize: 12, color: 'var(--muted)', paddingLeft: 4 }}>Showing {filtered.length} of {users.length} users</div>}
              </div>
            )}

            {/* ══ PENDING TAB ══ */}
            {tab === 'pending' && (
              <div style={{ padding: 24 }}>
                <div style={{ marginBottom: 20 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 4px' }}>Pending Account Requests</h3>
                  <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
                    {canSeeAllBranches ? 'Requests from all branches awaiting approval.' : 'Accounts awaiting your approval.'}
                  </p>
                </div>
                {pendingRequests.length === 0 ? (
                  <div style={{ padding: '40px 0', textAlign: 'center' }}>
                    <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#f0fdf4', border: '1.5px solid #86efac', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <p style={{ color: 'var(--muted)', fontSize: 14, fontWeight: 600 }}>No pending requests — all clear!</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {pendingRequests.map(req => (
                      <div key={req.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', display: 'flex', alignItems: 'stretch' }}>
                        <div style={{ width: 4, flexShrink: 0, background: '#f59e0b' }} />
                        <div style={{ flex: 1, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <Avatar firstName={req.first_name} lastName={req.last_name} role={req.role || 'Employee'} size={40} />
                            <div>
                              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{[req.first_name, req.last_name].filter(Boolean).join(' ') || '—'}</p>
                              <p style={{ margin: 0, fontSize: 12, color: '#64748b', marginTop: 1 }}>{req.email}</p>
                              <div style={{ display: 'flex', gap: 5, marginTop: 6, flexWrap: 'wrap' }}>
                                <span className={`badge ${ROLE_BADGE[req.role] || 'badge-gray'}`} style={{ fontSize: 10 }}>{req.role || 'Employee'}</span>
                                <span style={{ fontSize: 10, background: '#fef9c3', color: '#854d0e', borderRadius: 99, padding: '2px 8px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                  Pending
                                </span>
                                {req.branch_id && branches.find(b => b.id === req.branch_id) && (
                                  <span style={{ fontSize: 10, background: '#dbeafe', color: '#1e40af', borderRadius: 99, padding: '2px 8px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                                    {branches.find(b => b.id === req.branch_id)?.name}
                                  </span>
                                )}
                                <span style={{ fontSize: 10, color: '#94a3b8' }}>
                                  {fmtDate(req.created_at)}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                            <button onClick={() => handleApprovePending(req)} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: '#16a34a', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                              Approve
                            </button>
                            <button onClick={() => handleRejectPending(req)} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                              Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ══ ROLES TAB ══ */}
            {tab === 'roles' && (
              <div style={{ padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 4px' }}>Role Management</h3>
                    <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>System roles are built-in. Custom roles can be created and deleted.</p>
                  </div>
                  <button className="btn btn-primary" style={{ ...S.btn, display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => { setEditRoleTarget(null); setRoleForm(BLANK_ROLE_FORM); setRoleFormErrors({}); setShowRoleModal(true); }}>
                    <span style={{ fontSize: 18 }}>+</span> New Role
                  </button>
                </div>
                {rolesLoading ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 18 }}>
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 14, padding: 22, position: 'relative', overflow: 'hidden' }}>
                        {/* Top accent bar */}
                        <div className="skel" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, borderRadius: '12px 12px 0 0' }} />
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, marginTop: 12 }}>
                          <Skel w={42} h={42} style={{ borderRadius: 10 }} />
                          <Skel w="25%" h={24} />
                        </div>
                        <Skel w="55%" h={15} style={{ marginBottom: 8 }} />
                        <Skel w="90%" h={12} style={{ marginBottom: 4 }} />
                        <Skel w="75%" h={12} style={{ marginBottom: 16 }} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <Skel w="70%" h={12} />
                          <Skel w="65%" h={12} />
                          <Skel w="60%" h={12} />
                        </div>
                        <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
                          <Skel w="40%" h={12} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 18 }}>
                    {allRoles.map(r => {
                      const permLabels = (r.perms || []).map(k => ALL_PERMISSIONS.find(p => p.key === k)?.label || k);
                      const dotColor = r.color || '#2563eb';
                      return (
                        <div key={r.id} style={{ background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 22, boxShadow: 'var(--shadow)', position: 'relative', overflow: 'hidden' }}>
                          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: dotColor, borderRadius: '12px 12px 0 0' }} />
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, marginTop: 8 }}>
                            <div style={{ width: 42, height: 42, borderRadius: 10, background: `${dotColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {r.icon ? <img src={r.icon} alt={r.role} style={{ width: 24, height: 24, filter: 'brightness(0) saturate(100%) invert(17%) sepia(82%) saturate(1200%) hue-rotate(210deg)' }} /> : <span style={{ fontSize: 18 }}>🏷️</span>}
                            </div>
                            <div style={{ display: 'flex', gap: 6 }}>
                              {r.system ? <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: '#f3f4f6', color: '#6b7280', textTransform: 'uppercase' }}>System</span> : (
                                <>
                                  <button className="btn btn-ghost btn-sm" style={{ ...S.btn, fontSize: 12 }} onClick={() => { setEditRoleTarget(r); setRoleForm({ role: r.role, desc: r.desc || '', color: r.color || '#2563eb', perms: r.perms || [] }); setRoleFormErrors({}); setShowRoleModal(true); }}>Edit</button>
                                  <button className="btn btn-sm" style={{ ...S.btn, fontSize: 12, color: '#dc2626', background: '#fef2f2', border: '1px solid #fca5a5' }} onClick={() => handleDeleteRole(r)}>Delete</button>
                                </>
                              )}
                            </div>
                          </div>
                          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{r.role}</h3>
                          <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14, lineHeight: 1.5, flex: 1 }}>{r.desc}</p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            {permLabels.map(p => <span key={p} style={{ fontSize: 12, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ fontSize: 10 }}>✓</span> {p}</span>)}
                            {permLabels.length === 0 && <span style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>No permissions assigned</span>}
                          </div>
                          <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--muted)' }}>
                            {users.filter(u => u.role === r.role).length} user(s) assigned
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ══ LOGS TAB ══ */}
            {tab === 'logs' && (
              <div style={{ padding: 20 }}>
                <div style={{ marginBottom: 16 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 4px' }}>System Access History</h3>
                  <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>Track who accessed the system and what actions were performed.</p>
                </div>
                <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 8, padding: '8px 14px', flex: 1 }}>
                    <img src="/icon/search.png" alt="" style={{ width: 16, height: 16, filter: 'brightness(0) saturate(100%) invert(40%)' }} />
                    <input type="text" placeholder="Search by name, action or IP…" value={logSearch} onChange={e => setLogSearch(e.target.value)} style={{ border: 'none', background: 'transparent', fontSize: 13, color: 'var(--text)', outline: 'none', fontFamily: 'inherit', width: '100%' }} />
                  </div>
                  <select value={logRole} onChange={e => setLogRole(e.target.value)} style={{ ...S.inp, width: 140 }}>
                    <option value="">All Roles</option>
                    <option>Admin</option><option>Manager</option><option>Employee</option><option>Customer</option>
                  </select>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: 'var(--bg)' }}>
                        {['User', 'Role', 'Action', 'IP Address', 'Time', 'Status'].map(h => <th key={h} style={S.th}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLogs.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: '48px 0', color: 'var(--muted)' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ color: '#cbd5e1' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                              <span style={{ fontSize: 13, fontWeight: 600 }}>No logs found</span>
                            </div>
                          </td>
                        </tr>
                      ) : filteredLogs.map((l, idx) => (
                        <tr key={l.id} style={{ background: idx % 2 === 0 ? 'transparent' : 'var(--bg)' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#f0f7ff'}
                          onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? 'transparent' : 'var(--bg)'}>
                          <td style={S.td}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                              <Avatar firstName={l.user.first_name} lastName={l.user.last_name} role={l.user.role} size={28} />
                              <span style={{ fontWeight: 600 }}>{fullName(l.user)}</span>
                            </div>
                          </td>
                          <td style={S.td}><span className={`badge ${ROLE_BADGE[l.user.role] || 'badge-gray'}`} style={{ fontSize: 10 }}>{l.user.role || '—'}</span></td>
                          <td style={{ ...S.td, color: '#334155' }}>{l.action}</td>
                          <td style={S.td}>
                            <code style={{ fontSize: 11, background: '#f8fafc', border: '1px solid #e2e8f0', padding: '2px 7px', borderRadius: 5, color: '#475569', fontFamily: 'monospace', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>
                              {l.ip}
                            </code>
                          </td>
                          <td style={{ ...S.td, fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{fmtTime(l.timestamp)}</td>
                          <td style={S.td}>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 4,
                              background: l.status === 'Success' ? '#dcfce7' : '#fef2f2',
                              color: l.status === 'Success' ? '#15803d' : '#dc2626' }}>
                              {l.status === 'Success'
                                ? <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                                : <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>}
                              {l.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ marginTop: 14, fontSize: 12, color: 'var(--muted)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Showing {filteredLogs.length} of {logs.length} entries</span>
                  <button className="btn btn-ghost btn-sm" style={S.btn} onClick={() => setLogs(generateLogs(users))}>↻ Refresh</button>
                </div>
              </div>
            )}

            {/* ══ SETTINGS TAB ══ */}
            {tab === 'settings' && (
              <div style={{ padding: 24 }}>
                <div style={{ marginBottom: 20 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 4px' }}>System Settings</h3>
                  <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>Control system-wide behavior, security policies, and access permissions.</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
                  {[
                    { title: 'Registration & Access', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>, items: [{ label: 'Allow self-registration', key: 'allowSelfRegister' }, { label: 'Require email verification', key: 'requireEmailVerify' }, { label: 'Enable customer portal', key: 'allowCustomerPortal' }, { label: 'Allow role changes by admin', key: 'allowRoleChange' }] },
                    { title: 'System Behavior', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>, items: [{ label: 'Enable activity logging', key: 'showActivityLogs' }, { label: 'Auto-deactivate inactive accounts', key: 'autoDeactivateInactive' }] },
                  ].map(section => (
                    <div key={section.title} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                      <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg)' }}>
                        <span style={{ color: '#64748b' }}>{section.icon}</span>
                        <span style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.7px' }}>{section.title}</span>
                      </div>
                      <div style={{ padding: '4px 0' }}>
                        {section.items.map((item, i) => (
                          <div key={item.key} style={{ padding: '12px 18px', borderBottom: i < section.items.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                            <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{item.label}</span>
                            <Toggle checked={settings[item.key]} onChange={v => setSettings(s => ({ ...s, [item.key]: v }))} label="" />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                    <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg)' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.7px' }}>Security</span>
                    </div>
                    <div style={{ padding: '4px 0' }}>
                      <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>Require 2FA for Admin accounts</span>
                        <Toggle checked={settings.twoFactorAdmin} onChange={v => setSettings(s => ({ ...s, twoFactorAdmin: v }))} label="" />
                      </div>
                      {[{ label: 'Session timeout (minutes)', key: 'sessionTimeout', min: 5, max: 480, width: 90 }, { label: 'Max login attempts', key: 'maxLoginAttempts', min: 2, max: 20, width: 72 }, { label: 'Min password length', key: 'passwordMinLength', min: 4, max: 32, width: 72 }].map((item, i, arr) => (
                        <div key={item.key} style={{ padding: '11px 18px', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                          <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{item.label}</span>
                          <input type="number" min={item.min} max={item.max} value={settings[item.key]} onChange={e => setSettings(s => ({ ...s, [item.key]: +e.target.value }))} style={{ ...S.inp, width: item.width, padding: '5px 8px', textAlign: 'center', fontWeight: 600 }} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 14 }}>
                  <button className="btn btn-primary" style={S.btn} onClick={saveSettings}>Save Settings</button>
                  {settingsSaved && <span style={{ fontSize: 13, color: '#16a34a', fontWeight: 600 }}>✅ Settings saved</span>}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══ ADD USER MODAL ══ */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>

            {/* Clipboard bar */}
            <div className="usr-clipboard-bar" style={{ flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 48, height: 18, background: 'rgba(255,255,255,0.25)', borderRadius: 4, border: '2px solid rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 20, height: 8, background: 'rgba(255,255,255,0.4)', borderRadius: 2 }} />
                </div>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.5px' }}>USER ACCOUNT FORM</span>
              </div>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'rgba(255,255,255,0.75)', lineHeight: 1, padding: '2px 6px' }}>✕</button>
            </div>

            {/* Record header */}
            <div style={{ background: 'var(--bg, #f8fafc)', borderBottom: '2px solid var(--border, #e2e8f0)', padding: '14px 24px 12px', textAlign: 'center', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 4 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                </div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--text, #1e293b)', letterSpacing: '0.3px' }}>New User Account</h3>
              </div>
              <p style={{ margin: 0, fontSize: 11, color: '#64748b', letterSpacing: '0.5px' }}>Fill in the user details below</p>
            </div>

            {/* Form body */}
            <div style={{ flex: 1, overflowY: 'auto' }}>

              {/* ── Section: Personal Info ── */}
              <div style={{ borderBottom: '1.5px solid #e2e8f0' }}>
                <div className="usr-section-label">Personal Information</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #e2e8f0' }}>
                  <div style={{ padding: '10px 16px', borderRight: '1px solid #e2e8f0' }}>
                    <div className="usr-field-label">First Name <span style={{ color: '#ef4444' }}>*</span></div>
                    <input type="text" placeholder="e.g. Jane" value={addForm.first_name}
                      onChange={e => setAddForm(f => ({ ...f, first_name: e.target.value }))}
                      className={`usr-inline-inp${addErrors.first_name ? ' err' : ''}`} />
                    {addErrors.first_name && <div style={{ fontSize: 10, color: '#dc2626', marginTop: 3 }}>{addErrors.first_name}</div>}
                  </div>
                  <div style={{ padding: '10px 16px' }}>
                    <div className="usr-field-label">Last Name <span style={{ color: '#ef4444' }}>*</span></div>
                    <input type="text" placeholder="e.g. Doe" value={addForm.last_name}
                      onChange={e => setAddForm(f => ({ ...f, last_name: e.target.value }))}
                      className={`usr-inline-inp${addErrors.last_name ? ' err' : ''}`} />
                    {addErrors.last_name && <div style={{ fontSize: 10, color: '#dc2626', marginTop: 3 }}>{addErrors.last_name}</div>}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #e2e8f0' }}>
                  <div style={{ padding: '10px 16px', borderRight: '1px solid #e2e8f0' }}>
                    <div className="usr-field-label">Sex</div>
                    <select value={addForm.sex} onChange={e => setAddForm(f => ({ ...f, sex: e.target.value }))}
                      className="usr-inline-inp" style={{ cursor: 'pointer' }}>
                      <option value="">— Select —</option>
                      <option>Male</option>
                      <option>Female</option>
                    </select>
                  </div>
                  <div style={{ padding: '10px 16px' }}>
                    <div className="usr-field-label">Status</div>
                    <select value={addForm.status} onChange={e => setAddForm(f => ({ ...f, status: e.target.value }))}
                      className="usr-inline-inp" style={{ cursor: 'pointer' }}>
                      <option>Active</option><option>Inactive</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* ── Section: Account Credentials ── */}
              <div style={{ borderBottom: '1.5px solid #e2e8f0' }}>
                <div className="usr-section-label">Account Credentials</div>
                <div style={{ padding: '10px 16px', borderBottom: '1px solid #e2e8f0' }}>
                  <div className="usr-field-label">Email Address <span style={{ color: '#ef4444' }}>*</span></div>
                  <input type="email" placeholder="email@example.com" value={addForm.email}
                    onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))}
                    className={`usr-inline-inp${addErrors.email ? ' err' : ''}`} />
                  {addErrors.email && <div style={{ fontSize: 10, color: '#dc2626', marginTop: 3 }}>{addErrors.email}</div>}
                </div>
                <div style={{ padding: '10px 16px', borderBottom: '1px solid #e2e8f0' }}>
                  <div className="usr-field-label">Password <span style={{ color: '#ef4444' }}>*</span></div>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input type={showPassword ? 'text' : 'password'} value={addForm.password}
                      onChange={e => setAddForm(f => ({ ...f, password: e.target.value }))}
                      className={`usr-inline-inp${addErrors.password ? ' err' : ''}`}
                      style={{ paddingRight: 64, fontFamily: showPassword ? 'monospace' : 'inherit' }} />
                    <button type="button" onClick={() => setShowPassword(v => !v)}
                      style={{ position: 'absolute', right: 28, background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0, display: 'flex', alignItems: 'center' }}>
                      {showPassword
                        ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                        : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
                    </button>
                    <button type="button" onClick={() => setAddForm(f => ({ ...f, password: generatePassword() }))}
                      style={{ position: 'absolute', right: 0, background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb', padding: 0, display: 'flex', alignItems: 'center' }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                    </button>
                  </div>
                  {addErrors.password && <div style={{ fontSize: 10, color: '#dc2626', marginTop: 3 }}>{addErrors.password}</div>}
                </div>
              </div>

              {/* ── Section: Role & Branch ── */}
              <div style={{ borderBottom: '1.5px solid #e2e8f0' }}>
                <div className="usr-section-label">Role &amp; Assignment</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #e2e8f0' }}>
                  <div style={{ padding: '10px 16px', borderRight: '1px solid #e2e8f0' }}>
                    <div className="usr-field-label">Role</div>
                    <select value={addForm.role} onChange={e => setAddForm(f => ({ ...f, role: e.target.value }))}
                      className="usr-inline-inp" style={{ cursor: 'pointer' }}>
                      {isSuperAdmin && <option>Admin</option>}
                      <option>Manager</option><option>Employee</option><option>Customer</option>
                    </select>
                  </div>
                  <div style={{ padding: '10px 16px' }}>
                    <div className="usr-field-label">Branch <span style={{ color: '#ef4444' }}>*</span></div>
                    {canSeeAllBranches ? (
                      <>
                        <select value={addForm.branch_id} onChange={e => setAddForm(f => ({ ...f, branch_id: e.target.value }))}
                          className={`usr-inline-inp${addErrors.branch_id ? ' err' : ''}`} style={{ cursor: 'pointer' }}>
                          <option value="">— Select branch —</option>
                          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                        {addErrors.branch_id && <div style={{ fontSize: 10, color: '#dc2626', marginTop: 3 }}>{addErrors.branch_id}</div>}
                      </>
                    ) : (
                      <div className="usr-inline-inp" style={{ color: '#94a3b8', cursor: 'default' }}>
                        {branches.find(b => b.id === currentUser?.branchId)?.name || 'Your Branch'}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer note */}
              <div style={{ padding: '8px 16px', background: 'var(--bg, #f8fafc)', borderTop: '1px solid var(--border, #e2e8f0)' }}>
                <p style={{ margin: 0, fontSize: 10, color: '#94a3b8', textAlign: 'right', fontStyle: 'italic' }}>User Management System</p>
              </div>
            </div>

            {/* Modal footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 24px', borderTop: '2px solid #e2e8f0', background: '#f8fafc', flexShrink: 0 }}>
              <button className="btn btn-ghost" style={S.btn} onClick={() => setShowAddModal(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ ...S.btn, background: '#0f172a', borderColor: '#0f172a', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                onClick={handleAddUser} disabled={saving}>
                {saving ? 'Creating…' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {createdCredentials && <CredentialCard credentials={createdCredentials} onClose={() => setCreatedCredentials(null)} />}

      {/* ══ VIEW USER PANEL ══ */}
      {viewUser && (
        <>
          <div onClick={() => setViewUser(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 1040, backdropFilter: 'blur(2px)' }} />
          <div style={{ position: 'fixed', top: 0, right: 0, height: '100vh', width: 380, background: '#fff', zIndex: 1041, boxShadow: '-4px 0 24px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>User Details</span>
              <button className="btn btn-ghost btn-icon" style={S.btn} onClick={() => setViewUser(null)}>✕</button>
            </div>
            <div style={{ padding: '28px 24px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
              <Avatar firstName={viewUser.first_name} lastName={viewUser.last_name} role={viewUser.role} size={72} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 800, fontSize: 18 }}>{fullName(viewUser)}</div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>{viewUser.email || '—'}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <span className={`badge ${ROLE_BADGE[viewUser.role] || 'badge-gray'}`}>{viewUser.role || '—'}</span>
                <span className={`badge ${viewUser.status === 'Active' ? 'badge-green' : 'badge-red'}`}>{viewUser.status || 'Active'}</span>
              </div>
            </div>
            <div style={{ padding: '16px 24px', flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Account Info</div>
              <DetailRow label="User ID" value={viewUser.id} />
              <DetailRow label="First Name" value={viewUser.first_name} />
              <DetailRow label="Last Name" value={viewUser.last_name} />
              <DetailRow label="Email" value={viewUser.email} />
              <DetailRow label="Sex" value={viewUser.sex} />
              <DetailRow label="Role" value={viewUser.role} />
              <DetailRow label="Branch" value={viewUser.branches?.name || branches.find(b => b.id === viewUser.branch_id)?.name || '—'} />
              <DetailRow label="Status" value={viewUser.status} />
              <DetailRow label="Joined" value={fmtDate(viewUser.created_at)} />
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
             <button className="btn btn-primary" style={{ ...S.btn, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} onClick={() => openEdit(viewUser)}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                Edit Role &amp; Status
              </button>
              {viewUser.status === 'Active' && (
                <button className="btn btn-sm" style={{ ...S.btn, width: '100%', color: '#d97706', background: '#fffbeb', border: '1px solid #fcd34d', padding: '9px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} onClick={() => handleDeactivate(viewUser)}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                  Deactivate Account
                </button>
              )}
              {/* ✅ ADD THIS — was missing from view panel */}
              {isSuperAdmin && (
                <button
                  className="btn btn-sm"
                  style={{ ...S.btn, width: '100%', color: '#7c3aed', background: '#ede9fe', border: '1px solid #c4b5fd', padding: '9px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  onClick={() => { setViewUser(null); handleResetPassword(viewUser); }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
                  Reset Password
                </button>
              )}
              <button className="btn btn-sm" style={{ ...S.btn, width: '100%', color: '#dc2626', background: '#fef2f2', border: '1px solid #fca5a5', padding: '9px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} onClick={() => handleDelete(viewUser)}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                Delete Permanently
              </button>
            </div>
          </div>
        </>
      )}

      {/* ══ EDIT USER MODAL — add email field for SuperAdmin ══ */}
      {showEditModal && editUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 420, maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <div className="modal-header">
              <h3>Edit User</h3>
              <button className="btn btn-ghost btn-icon" style={S.btn} onClick={() => setShowEditModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div className="form-group" style={{ margin: 0 }}><label>First Name</label><input type="text" value={editForm.first_name} onChange={e => setEditForm({ ...editForm, first_name: e.target.value })} /></div>
                <div className="form-group" style={{ margin: 0 }}><label>Last Name</label><input type="text" value={editForm.last_name} onChange={e => setEditForm({ ...editForm, last_name: e.target.value })} /></div>
              </div>

              {/* SuperAdmin only: edit email */}
              {isSuperAdmin && (
                <div className="form-group" style={{ marginBottom: 14 }}>
                  <label>Email Address <span style={{ fontSize: 11, color: '#7c3aed', fontWeight: 700 }}>👑 SuperAdmin</span></label>
                  <input
                    type="email"
                    value={editForm.email ?? editUser.email}
                    onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                    style={S.inp}
                  />
                </div>
              )}

              <div className="form-group" style={{ marginBottom: 14 }}>
                <label>Role</label>
                <select value={editForm.role} onChange={e => setEditForm({ ...editForm, role: e.target.value })}>
                  {isSuperAdmin && <option>Admin</option>}
                  <option>Manager</option><option>Employee</option><option>Customer</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label>Status</label>
                <select value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })}>
                  <option>Active</option><option>Inactive</option>
                </select>
              </div>
              {canSeeAllBranches && (
                <div className="form-group">
                  <label>Branch</label>
                  <select value={editForm.branch_id} onChange={e => setEditForm({ ...editForm, branch_id: e.target.value })}>
                    <option value="">— No branch —</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" style={S.btn} onClick={() => setShowEditModal(false)}>Cancel</button>
              <button className="btn btn-primary" style={S.btn} onClick={saveUser} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ ROLE MODAL ══ */}
      {showRoleModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <div className="modal-header">
              <h3>{editRoleTarget ? `Edit Role — ${editRoleTarget.role}` : 'Create New Role'}</h3>
              <button className="btn btn-ghost btn-icon" style={S.btn} onClick={() => setShowRoleModal(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Role Name <span style={{ color: '#dc2626' }}>*</span></label>
                  <input type="text" placeholder="e.g. Receptionist" value={roleForm.role} onChange={e => { setRoleForm(f => ({ ...f, role: e.target.value })); setRoleFormErrors(er => ({ ...er, role: '' })); }} style={roleFormErrors.role ? S.inpErr : {}} />
                  {roleFormErrors.role && <div style={S.errMsg}>{roleFormErrors.role}</div>}
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Color</label>
                  <input type="color" value={roleForm.color} onChange={e => setRoleForm(f => ({ ...f, color: e.target.value }))} style={{ width: 44, height: 38, border: '1.5px solid var(--border)', borderRadius: 8, cursor: 'pointer', padding: 2 }} />
                </div>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Description <span style={{ color: '#dc2626' }}>*</span></label>
                <textarea rows={2} value={roleForm.desc} onChange={e => { setRoleForm(f => ({ ...f, desc: e.target.value })); setRoleFormErrors(er => ({ ...er, desc: '' })); }} style={{ ...(roleFormErrors.desc ? S.inpErr : S.inp), width: '100%', resize: 'vertical', boxSizing: 'border-box' }} />
                {roleFormErrors.desc && <div style={S.errMsg}>{roleFormErrors.desc}</div>}
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8 }}>Permissions <span style={{ color: '#dc2626' }}>*</span></label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '6px 14px', background: 'var(--bg)', border: `1.5px solid ${roleFormErrors.perms ? '#f87171' : 'var(--border)'}`, borderRadius: 8, padding: '12px 14px' }}>
                  {ALL_PERMISSIONS.map(p => (
                    <label key={p.key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                      <input type="checkbox" checked={roleForm.perms.includes(p.key)} onChange={() => togglePerm(p.key)} style={{ accentColor: roleForm.color, width: 14, height: 14 }} />
                      {p.label}
                    </label>
                  ))}
                </div>
                {roleFormErrors.perms && <div style={S.errMsg}>{roleFormErrors.perms}</div>}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" style={S.btn} onClick={() => setShowRoleModal(false)}>Cancel</button>
              <button className="btn btn-primary" style={S.btn} onClick={saveRole} disabled={roleSaving}>{roleSaving ? 'Saving…' : editRoleTarget ? 'Save Changes' : 'Create Role'}</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal show={!!confirm} title={confirm?.title} message={confirm?.message} type={confirm?.type} confirmLabel={confirm?.confirmLabel} onConfirm={confirm?.onConfirm} onCancel={() => setConfirm(null)} />
    </Layout>
  );
};


export default AdminSecurity;
