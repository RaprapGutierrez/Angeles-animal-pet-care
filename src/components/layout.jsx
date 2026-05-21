import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../js/supabase';
import { getNavLinks, getBranchId } from '../js/branchTables';

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
const normalizeRole = (raw) => {
  if (!raw) return 'Employee';
  const map = {
    super_admin: 'super_admin',
    superadmin: 'super_admin',
    admin: 'Admin',
    manager: 'Manager',
    employee: 'Employee',
    customer: 'Customer',
  };
  return map[String(raw).toLowerCase()] || raw;
};

const parseBranch = (email) => {
  if (!email) return null;
  const domain = email.split('@')[1] || '';
  const parts = domain.split('.');
  const ROLE_SEGMENTS = new Set(['admin', 'manager', 'employee', 'staff', 'vet']);
  if (parts.length < 3) return null;
  const candidate = parts[0].toLowerCase();
  if (!ROLE_SEGMENTS.has(parts[1]?.toLowerCase())) return null;
  const BRANCH_NAMES = {
    sf: 'San Fernando',
    sanfernando: 'San Fernando',
    mabalacat: 'Mabalacat',
    main: 'Main',
    angeles: 'Angeles',
    tarlac: 'Tarlac',
    magalang: 'Magalang',
  };
  return BRANCH_NAMES[candidate] || (candidate.charAt(0).toUpperCase() + candidate.slice(1));
};

// Maps branch name → numeric ID (mirrors branchTables.js BRANCH_ID_MAP)
const BRANCH_NAME_TO_ID = {
  main: 1,
  mabalacat: 1,
  mabalacat2: 2,
  tarlac: 3,
  angeles: 4,
  angelescity: 4,
  sanfernando: 5,
  sf: 5,
  magalang: 6,
};

const BRANCH_COLORS = {
  1: '#7C3AED',
  2: '#0EA5E9',
  3: '#10B981',
  4: '#7C3AED',
  5: '#F59E0B',
  6: '#EF4444',
};

const BRANCH_DISPLAY_NAMES = {
  1: 'Main Branch',
  2: 'Mabalacat 2',
  3: 'Tarlac',
  4: 'Angeles City',
  5: 'San Fernando',
  6: 'Magalang',
};

const normalizeBranchKey = (b) =>
  String(b || '').toLowerCase().replace(/\s+/g, '').trim();

const readUserInfo = () => {
  try {
    const token = localStorage.getItem('hospital_jwt');
    if (!token) return { name: 'User', role: 'Employee', email: '', id: '', branch: null, branchId: 4 };
    const payload = JSON.parse(atob(token.split('.')[1]));
    const meta = payload.user_metadata || {};
    const appMeta = payload.app_metadata || {};
    const firstName = meta.first_name || '';
    const lastName = meta.last_name || '';
    const name = (firstName || lastName)
      ? `${firstName} ${lastName}`.trim()
      : payload.email?.split('@')[0] || 'User';
    const storedRole = localStorage.getItem('user_role') || '';
    const rawRole = storedRole || meta.role || appMeta.role || payload.role || 'Employee';
    const role = normalizeRole(rawRole);
    const email = payload.email || '';
    const branch = parseBranch(email) || localStorage.getItem('user_branch') || null;

    // Resolve numeric branch ID
    const key = normalizeBranchKey(branch);
    const branchId = BRANCH_NAME_TO_ID[key] || 4;

    return { name, role, email, id: payload.sub || '', branch, branchId };
  } catch {
    return { name: 'User', role: 'Employee', email: '', id: '', branch: null, branchId: 4 };
  }
};

const roleIsCustomer = (role) => role === 'Customer';

/* ─────────────────────────────────────────────
   STATUS COLORS
───────────────────────────────────────────── */
const STATUS_COLORS = {
  pending: { bg: '#fef9c3', border: '#fde047', text: '#854d0e', badge: '#f59e0b' },
  responding: { bg: '#dbeafe', border: '#93c5fd', text: '#1d4ed8', badge: '#2563eb' },
  resolved: { bg: '#dcfce7', border: '#86efac', text: '#166534', badge: '#16a34a' },
};
/* ─────────────────────────────────────────────
   TOAST NOTIFICATION SYSTEM
───────────────────────────────────────────── */
const TOAST_ICONS = {
  emergency: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  message:   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  stock:     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>,
};

const TOAST_COLORS = {
  emergency: { bg: '#fef2f2', border: '#fecaca', icon: '#ef4444', title: '#dc2626' },
  message:   { bg: '#eff6ff', border: '#bfdbfe', icon: '#2563eb', title: '#1d4ed8' },
  stock:     { bg: '#fffbeb', border: '#fde68a', icon: '#d97706', title: '#b45309' },
};

const Toast = ({ id, type, title, body, onClose }) => {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const c = TOAST_COLORS[type] || TOAST_COLORS.message;

  useEffect(() => {
    // Animate in
    const t1 = setTimeout(() => setVisible(true), 10);
    // Auto-dismiss after 5s
    const t2 = setTimeout(() => {
      setLeaving(true);
      setTimeout(() => onClose(id), 350);
    }, 5000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [id, onClose]);

  const handleClose = () => {
    setLeaving(true);
    setTimeout(() => onClose(id), 350);
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      background: c.bg, border: `1px solid ${c.border}`,
      borderLeft: `4px solid ${c.icon}`,
      borderRadius: 12, padding: '12px 14px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
      minWidth: 300, maxWidth: 360,
      transform: visible && !leaving ? 'translateX(0)' : 'translateX(120%)',
      opacity: visible && !leaving ? 1 : 0,
      transition: 'transform 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.35s ease',
      cursor: 'default',
      position: 'relative',
    }}>
      <span style={{ flexShrink: 0, marginTop: 1, display: 'flex', alignItems: 'center' }}>{TOAST_ICONS[type]}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 800, color: c.title }}>{title}</p>
        <p style={{ margin: 0, fontSize: 12, color: '#4b5563', lineHeight: 1.4,
          overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box',
          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{body}</p>
      </div>
      <button onClick={handleClose} style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: '#9ca3af', fontSize: 14, lineHeight: 1,
        padding: 2, flexShrink: 0, fontFamily: 'inherit',
      }}>✕</button>
      {/* Progress bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: 3, borderRadius: '0 0 12px 12px',
        background: `${c.icon}33`, overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', background: c.icon,
          animation: 'toastProgress 5s linear forwards',
        }} />
      </div>
    </div>
  );
};

const ToastContainer = ({ toasts, onClose }) => (
  <div style={{
    position: 'fixed', bottom: 24, right: 24,
    display: 'flex', flexDirection: 'column', gap: 10,
    zIndex: 999999, pointerEvents: 'none',
  }}>
    {toasts.map(t => (
      <div key={t.id} style={{ pointerEvents: 'auto' }}>
        <Toast {...t} onClose={onClose} />
      </div>
    ))}
  </div>
);

/* ─────────────────────────────────────────────
   ALERT DETAIL MODAL 
───────────────────────────────────────────── */
const AlertDetailModal = ({ alert, onClose, onUpdateStatus, isAdmin }) => {
  const [updating, setUpdating] = useState(false);
  if (!alert) return null;
  const status = alert.status || 'pending';
  const col = STATUS_COLORS[status] || STATUS_COLORS.pending;

  const handleUpdate = async (newStatus) => {
    setUpdating(true);
    await onUpdateStatus(alert.id, newStatus);
    setUpdating(false);
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '28px', maxWidth: 460, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', animation: 'modalIn 0.18s ease' }}>
        <style>{`@keyframes modalIn { from { opacity:0; transform:scale(0.95) } to { opacity:1; transform:scale(1) } }`}</style>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ display: 'flex', alignItems: 'center' }}>
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
</span>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: '#dc2626', margin: 0 }}>{alert.type}</h3>
              <span style={{ fontSize: 11, fontWeight: 700, color: col.text, background: col.bg, border: `1px solid ${col.border}`, borderRadius: 20, padding: '2px 10px', textTransform: 'capitalize', display: 'inline-block', marginTop: 4 }}>{status}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontFamily: 'inherit' }}>
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
</button>
        </div>
        <div style={{ background: '#f8fafc', borderRadius: 10, padding: '16px', marginBottom: 20 }}>
          <div style={{ marginBottom: 12 }}>
            <p style={{ fontSize: 11, color: '#64748b', fontWeight: 600, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Description</p>
            <p style={{ fontSize: 14, color: '#1e293b', margin: 0, lineHeight: 1.6 }}>{alert.description}</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { label: 'Branch', value: alert.branch },
              { label: 'Sent By', value: alert.sent_by },
              { label: 'Date', value: new Date(alert.created_at).toLocaleDateString() },
              { label: 'Time', value: new Date(alert.created_at).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }) },
            ].map(item => (
              <div key={item.label}>
                <p style={{ fontSize: 11, color: '#64748b', fontWeight: 600, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: 0.5 }}>{item.label}</p>
                <p style={{ fontSize: 13, color: '#1e293b', margin: 0, fontWeight: 600 }}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>
        {isAdmin && status !== 'resolved' && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            {status === 'pending' && (
              <button onClick={() => handleUpdate('responding')} disabled={updating} style={{ flex: 1, padding: '10px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: 13, background: '#dbeafe', color: '#1d4ed8', border: '1px solid #93c5fd', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
  <svg width="12" height="12" viewBox="0 0 24 24" fill="#1d4ed8" stroke="none"><circle cx="12" cy="12" r="10"/></svg>
  Mark Responding
</button>
            )}
            <button onClick={() => handleUpdate('resolved')} disabled={updating} style={{ flex: 1, padding: '10px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: 13, background: '#dcfce7', color: '#166534', border: '1px solid #86efac', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
  {updating ? 'Updating...' : (<><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg> Mark Resolved</>)}
</button>
          </div>
        )}
        <button onClick={onClose} style={{ width: '100%', padding: '10px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: 13, background: 'transparent', color: '#64748b', border: '1px solid #e2e8f0' }}>Close</button>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   GENERIC CONFIRM MODAL
───────────────────────────────────────────── */
export const Modal = ({ show, title, message, type = 'confirm', onConfirm, onCancel, confirmText = 'Confirm', cancelText = 'Cancel', confirmColor = 'var(--royal)' }) => {
  if (!show) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 14, padding: '28px 28px 22px', maxWidth: 400, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', animation: 'modalIn 0.18s ease' }}>
        <style>{`@keyframes modalIn { from { opacity:0; transform:scale(0.95) } to { opacity:1; transform:scale(1) } }`}</style>
        <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)', marginBottom: 10 }}>{title}</h3>
        <p style={{ fontSize: 14, color: '#64748b', marginBottom: 24, lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          {onCancel && (
            <button onClick={onCancel} style={{ padding: '9px 20px', border: '1.5px solid var(--border)', borderRadius: 8, background: '#fff', color: 'var(--text)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{cancelText}</button>
          )}
          <button onClick={onConfirm} style={{ padding: '9px 20px', border: 'none', borderRadius: 8, background: confirmColor, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   INLINE SVG ICON MAP
───────────────────────────────────────────── */
const NAV_ICONS = {
  dashboard: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
  patient: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>,
  appointment: <><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></>,
  room: <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></>,
  inventory: <><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /></>,
  pos: <><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8" /><path d="M12 17v4" /></>,
  'point of sale': <><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8" /><path d="M12 17v4" /></>,
  'walk-in': <><path d="M13 4a1 1 0 1 0 2 0 1 1 0 0 0-2 0" /><path d="M7.5 17.5L9 13l3 2 2-5" /><path d="M9 13l-2 5" /></>,
  walkin: <><path d="M13 4a1 1 0 1 0 2 0 1 1 0 0 0-2 0" /><path d="M7.5 17.5L9 13l3 2 2-5" /><path d="M9 13l-2 5" /></>,
  report: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></>,
  message: <><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></>,
  emergency: <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></>,
  branch: <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M9 22V12h6v10" /></>,
  admin: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></>,
  security: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></>,
  manager: <><circle cx="12" cy="8" r="4" /><path d="M20 21a8 8 0 1 0-16 0" /><path d="M12 14v7" /><path d="M9 17h6" /></>,
  staff: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
  schedule: <><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></>,
  billing: <><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></>,
  ai: <><path d="M12 2a10 10 0 1 0 10 10" /><path d="M12 8v4l3 3" /><circle cx="18" cy="6" r="3" /></>,
  shop: <><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></>,
  pets: <><path d="M10 5.172C10 3.782 8.423 2.679 6.5 3c-2.823.47-4.113 6.006-4 7 .08.703 1.725 1.722 3.656 1 1.261-.472 1.96-1.45 2.344-2.5" /><path d="M14.267 5.172c0-1.39 1.577-2.493 3.5-2.172 2.823.47 4.113 6.006 4 7-.08.703-1.725 1.722-3.656 1-1.261-.472-1.96-1.45-2.344-2.5" /><path d="M8 14v.5" /><path d="M16 14v.5" /><path d="M11.25 16.25h1.5L12 17l-.75-.75z" /><path d="M4.42 11.247A13.152 13.152 0 0 0 4 14.556C4 18.728 7.582 21 12 21s8-2.272 8-6.444c0-1.061-.162-2.2-.493-3.309m-9.243-6.082A8.801 8.801 0 0 1 12 5c.78 0 1.5.108 2.161.306" /></>,
  default: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" /></>,
};

export const getNavIcon = (label = '', href = '') => {
  const key = (label + ' ' + href).toLowerCase();
  for (const [k, svg] of Object.entries(NAV_ICONS)) {
    if (key.includes(k)) return svg;
  }
  return NAV_ICONS.default;
};

/* ─────────────────────────────────────────────
   SIDEBAR ITEM
───────────────────────────────────────────── */
const SidebarItem = ({ href, label, badge, isActive, isAI, isEmergency, isExpanded }) => {
  const [hovered, setHovered] = useState(false);

  let activeColor = '#7c3aed';
  if (isEmergency) activeColor = '#ef4444';
  if (isAI) activeColor = '#818cf8';

  const iconColor = isActive || hovered ? '#ffffff' : 'rgba(255,255,255,0.55)';
  const svgPaths = getNavIcon(label, href);

  return (
    <Link
      to={href}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={!isExpanded ? label : undefined}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        width: isExpanded ? 'calc(100% - 0px)' : 44,
        height: 44,
        borderRadius: 12,
        marginBottom: 4,
        paddingLeft: isExpanded ? 12 : 0,
        paddingRight: isExpanded ? 8 : 0,
        justifyContent: isExpanded ? 'flex-start' : 'center',
        background: isActive
          ? `${activeColor}22`
          : hovered ? 'rgba(255,255,255,0.08)' : 'transparent',
        borderLeft: isActive ? `3px solid ${activeColor}` : '3px solid transparent',
        transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
        textDecoration: 'none',
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, width: 20, height: 20 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'stroke 0.18s', display: 'block' }}>
          {svgPaths}
        </svg>
      </span>

      <span style={{
        marginLeft: 10,
        fontSize: 13,
        fontWeight: isActive ? 700 : 500,
        color: isActive || hovered ? '#fff' : 'rgba(255,255,255,0.7)',
        whiteSpace: 'nowrap',
        opacity: isExpanded ? 1 : 0,
        maxWidth: isExpanded ? 160 : 0,
        overflow: 'hidden',
        transition: 'opacity 0.2s cubic-bezier(0.4,0,0.2,1), max-width 0.25s cubic-bezier(0.4,0,0.2,1)',
        transitionDelay: isExpanded ? '0.06s' : '0s',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}>
        {label}
        {isAI && (
          <span style={{ background: '#818cf8', borderRadius: 4, fontSize: 9, fontWeight: 700, padding: '1px 4px', color: '#fff', letterSpacing: '0.02em' }}>AI</span>
        )}
      </span>

      {badge > 0 && (
        <span style={{
          marginLeft: isExpanded ? 'auto' : undefined,
          position: isExpanded ? 'relative' : 'absolute',
          top: isExpanded ? undefined : 4,
          right: isExpanded ? undefined : 4,
          background: isEmergency ? '#ef4444' : '#2563eb',
          color: '#fff',
          borderRadius: isExpanded ? 20 : '50%',
          width: isExpanded ? 'auto' : 16,
          height: isExpanded ? 18 : 16,
          minWidth: isExpanded ? 18 : undefined,
          fontSize: 9, fontWeight: 800,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: isExpanded ? '0 6px' : 0,
          border: isExpanded ? 'none' : '2px solid #1e1b4b',
          flexShrink: 0,
          transition: 'all 0.25s',
        }}>
          {badge > 9 ? '9+' : badge}
        </span>
      )}

      {!isExpanded && hovered && (
        <div style={{
          position: 'absolute',
          left: 'calc(100% + 12px)',
          top: '50%',
          transform: 'translateY(-50%)',
          background: '#1e293b',
          color: '#fff',
          fontSize: 11, fontWeight: 700,
          padding: '5px 10px',
          borderRadius: 7,
          whiteSpace: 'nowrap',
          zIndex: 99999,
          pointerEvents: 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          animation: 'tooltipIn 0.12s ease',
        }}>
          {label}
          {isAI && <span style={{ marginLeft: 5, background: '#818cf8', borderRadius: 4, fontSize: 9, padding: '1px 4px' }}>AI</span>}
          <span style={{
            position: 'absolute', left: -5, top: '50%', transform: 'translateY(-50%)',
            width: 0, height: 0,
            borderTop: '5px solid transparent', borderBottom: '5px solid transparent',
            borderRight: '5px solid #1e293b',
          }} />
        </div>
      )}
    </Link>
  );
};

/* ─────────────────────────────────────────────
   BRANCH PILL — shown in sidebar when expanded
───────────────────────────────────────────── */
const BranchPill = ({ branchId, branchName, isExpanded }) => {
  const color = BRANCH_COLORS[branchId] || '#7C3AED';
  const displayName = BRANCH_DISPLAY_NAMES[branchId] || branchName || 'Main Branch';

  if (!isExpanded) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 28, marginBottom: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}88` }} />
      </div>
    );
  }

  return (
    <div style={{
      margin: '0 8px 10px',
      padding: '6px 10px',
      borderRadius: 8,
      background: `${color}18`,
      border: `0.5px solid ${color}44`,
      display: 'flex',
      alignItems: 'center',
      gap: 7,
      transition: 'all 0.25s',
    }}>
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.07em', color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', marginBottom: 1 }}>Branch</div>
        <div style={{ fontSize: 12, color: '#fff', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   NOTIFICATION DROPDOWN PANEL
───────────────────────────────────────────── */
const NotifDropdown = ({ activeTab, setActiveTab, easAlerts, msgAlerts, stockAlerts, easCount, msgCount, stockCount, onAlertClick, onClose }) => {
  const tabIcons = {
  emergency: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  messages:  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  stock:     <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>,
};
const tabs = [
  { key: 'emergency', label: 'Emergency', count: easCount, color: '#ef4444' },
  { key: 'messages', label: 'Messages', count: msgCount, color: '#2563eb' },
  { key: 'stock', label: 'Stock', count: stockCount, color: '#f59e0b' },
];  

  const lists = { emergency: easAlerts, messages: msgAlerts, stock: stockAlerts };
  const items = lists[activeTab] || [];

  const renderItem = (item) => {
    if (activeTab === 'emergency') {
      const col = STATUS_COLORS[item.status] || STATUS_COLORS.pending;
      return (
        <div
          key={item.id}
          onClick={() => { onAlertClick(item); onClose(); }}
          style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.12s' }}
          onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: '#dc2626' }}>{item.type}</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: col.text, background: col.bg, border: `1px solid ${col.border}`, borderRadius: 20, padding: '1px 8px', textTransform: 'capitalize' }}>{item.status}</span>
          </div>
          <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 4px', lineHeight: 1.4 }}>{item.description?.slice(0, 80)}{item.description?.length > 80 ? '…' : ''}</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <span style={{ fontSize: 10, color: '#94a3b8', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
  <svg width="9" height="9" viewBox="0 0 24 24" fill="#94a3b8" stroke="none"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
  {item.branch}
</span>
            <span style={{ fontSize: 10, color: '#94a3b8' }}>{new Date(item.created_at).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
      );
    }
    if (activeTab === 'messages') {
      return (
        <div
          key={item.id}
          style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
          onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#7c3aed22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#7c3aed', flexShrink: 0 }}>
              {(item.sender_name || item.sender_email || '?').charAt(0).toUpperCase()}
            </div>
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', margin: 0 }}>{item.sender_name || item.sender_email || 'Unknown'}</p>
              <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>{item.content?.slice(0, 60)}{item.content?.length > 60 ? '…' : ''}</p>
            </div>
          </div>
          <span style={{ fontSize: 10, color: '#94a3b8' }}>{new Date(item.created_at).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      );
    }
    if (activeTab === 'stock') {
      const isLow = item.stock <= item.reorder_level;
      return (
        <div key={item.id} style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>{item.name}</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: isLow ? '#dc2626' : '#f59e0b', background: isLow ? '#fee2e2' : '#fef9c3', borderRadius: 20, padding: '1px 8px' }}>
              {isLow ? 'Critical' : 'Low'}
            </span>
          </div>
          <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>Stock: <strong style={{ color: '#dc2626' }}>{item.stock}</strong> / Reorder at: {item.reorder_level}</p>
         {item.branch && (
  <span style={{ fontSize: 10, color: '#94a3b8', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
    <svg width="9" height="9" viewBox="0 0 24 24" fill="#94a3b8" stroke="none"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
    {item.branch}
  </span>
)}
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{
      position: 'absolute',
      top: 'calc(100% + 10px)',
      right: 0,
      width: 340,
      background: '#fff',
      borderRadius: 14,
      boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
      border: '1px solid #e2e8f0',
      zIndex: 9999,
      overflow: 'hidden',
      animation: 'dropIn 0.15s ease',
    }}>
      <div style={{ padding: '14px 16px 0', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#1e293b' }}>Notifications</h4>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center', fontFamily: 'inherit' }}>
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
</button>
        </div>
        <div style={{ display: 'flex', gap: 2 }}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1, padding: '6px 4px', border: 'none',
                borderBottom: activeTab === tab.key ? `2px solid ${tab.color}` : '2px solid transparent',
                background: 'transparent', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                color: activeTab === tab.key ? tab.color : '#94a3b8', fontFamily: 'inherit',
                transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              }}
            >
              {tabIcons[tab.key]}{tab.label}
              {tab.count > 0 && (
                <span style={{ background: tab.color, color: '#fff', borderRadius: '50%', width: 16, height: 16, fontSize: 9, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  {tab.count > 9 ? '9+' : tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
      <div style={{ maxHeight: 320, overflowY: 'auto' }}>
        {items.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'center' }}>
  {activeTab === 'emergency'
    ? <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
    : activeTab === 'messages'
      ? <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      : <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
  }
</div>
            <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>No {activeTab} alerts</p>
          </div>
        ) : items.map(renderItem)}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   AVATAR DROPDOWN
───────────────────────────────────────────── */
const AvatarDropdown = ({ user, onLogout, onClose }) => {
  const color = BRANCH_COLORS[user.branchId] || '#7C3AED';
  const displayBranch = BRANCH_DISPLAY_NAMES[user.branchId] || user.branch;

  // ✅ Correct profile path based on role
  const profilePath = user.role?.toLowerCase() === 'customer' ? '/customer/profile' : '/profile';

  return (
    <div style={{
      position: 'absolute', top: 'calc(100% + 10px)', right: 0, width: 220,
      background: '#fff', borderRadius: 14, boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
      border: '1px solid #e2e8f0', zIndex: 9999, overflow: 'hidden', animation: 'dropIn 0.15s ease',
    }}>
      <div style={{ padding: '16px', borderBottom: '1px solid #f1f5f9' }}>
        <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 800, color: '#1e293b' }}>{user.name}</p>
        <p style={{ margin: '0 0 6px', fontSize: 11, color: '#64748b' }}>{user.email}</p>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#7c3aed', background: '#7c3aed15', borderRadius: 20, padding: '2px 10px' }}>
          {user.role}
        </span>
        {displayBranch && (
          <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: color, background: `${color}18`, borderRadius: 20, padding: '2px 10px', border: `0.5px solid ${color}44`, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" stroke="none">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
            {displayBranch}
          </span>
        )}
      </div>

      <div style={{ padding: '6px' }}>
        {/* View Profile */}
        <Link
          to={profilePath}
          onClick={onClose}
          style={{
            width: '100%', padding: '9px 12px', borderRadius: 8,
            background: 'transparent', color: '#1e293b', fontSize: 13, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
            display: 'flex', alignItems: 'center', gap: 8, transition: 'background 0.12s',
            textDecoration: 'none',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          View Profile
        </Link>

        {/* Divider */}
        <div style={{ height: 1, background: '#f1f5f9', margin: '4px 0' }} />

        {/* Sign Out */}
        <button
          onClick={onLogout}
          style={{
            width: '100%', padding: '9px 12px', border: 'none', borderRadius: 8,
            background: 'transparent', color: '#ef4444', fontSize: 13, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
            display: 'flex', alignItems: 'center', gap: 8, transition: 'background 0.12s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Sign Out
        </button>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   MAIN LAYOUT
───────────────────────────────────────────── */
export const Layout = ({ children }) => {
  const [showLogout, setShowLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutAnimating, setLogoutAnimating] = useState(false);
  const [showNotifDrop, setShowNotifDrop] = useState(false);
  const [showAvatar, setShowAvatar] = useState(false);
  const [activeTab, setActiveTab] = useState('emergency');
  const [selectedAlert, setSelectedAlert] = useState(null);

  // ── Sidebar: hover-to-expand ──
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [sidebarPinned, setSidebarPinned] = useState(false);
  const sidebarHoverTimer = useRef(null);
  const isExpanded = sidebarPinned || sidebarExpanded;

  const handleSidebarEnter = () => {
    if (sidebarPinned) return;
    clearTimeout(sidebarHoverTimer.current);
    setSidebarExpanded(true);
  };
  const handleSidebarLeave = () => {
    if (sidebarPinned) return;
    sidebarHoverTimer.current = setTimeout(() => setSidebarExpanded(false), 120);
  };
  const togglePin = () => {
    setSidebarPinned(p => !p);
    setSidebarExpanded(false);
  };
  const [easAlerts, setEasAlerts] = useState([]);
  const [msgAlerts, setMsgAlerts] = useState([]);
  const [stockAlerts, setStockAlerts] = useState([]);
  const [easCount, setEasCount] = useState(0);
  const [msgCount, setMsgCount] = useState(0);
  const [stockCount, setStockCount] = useState(0);

  // ── Toast state ──
  const [toasts, setToasts] = useState([]);
  const prevEasIds  = useRef(new Set());
  const prevMsgIds  = useRef(new Set());
  const prevStockIds = useRef(new Set());
  const isFirstLoad = useRef({ eas: true, msg: true, stock: true });

  const pushToast = useCallback((type, title, body) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, type, title, body }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const notifDropRef = useRef(null);
  const avatarDropRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  const user = readUserInfo();
  const isCustomer = roleIsCustomer(user.role);
  const isAdmin = user.role === 'Admin' || user.role === 'super_admin';
  const isManager = user.role === 'Manager';

  // ── KEY FIX: pass branchId (number) to getNavLinks ──
  const navLinks = getNavLinks(user.role, user.branchId);

  const accentColor = BRANCH_COLORS[user.branchId] || '#7C3AED';
  const portalLabel = isCustomer
    ? 'Customer Portal'
    : BRANCH_DISPLAY_NAMES[user.branchId]
      ? `${BRANCH_DISPLAY_NAMES[user.branchId]} · Management System`
      : 'Management System';
  const avatarLetter = user.name?.charAt(0)?.toUpperCase() || 'U';
  const totalUnread = easCount + msgCount + stockCount;

  const SIDEBAR_W = isExpanded ? 220 : 62;
  const SIDEBAR_TRANSITION = 'width 0.3s cubic-bezier(0.4,0,0.2,1)';

  /* ── Fetch notifications ── */
  useEffect(() => {
    if (isCustomer) return;

    const fetchEmergencyAlerts = async () => {
      try {
        const { data } = await supabase
          .from('emergency_alerts')
          .select('*')
          .neq('status', 'resolved')
          .order('created_at', { ascending: false })
          .limit(20);
        if (data) {
          setEasAlerts(data);
          setEasCount(data.length);
          if (!isFirstLoad.current.eas) {
            data.forEach(a => {
              if (!prevEasIds.current.has(a.id)) {
                pushToast('emergency', `🚨 ${a.type}`, `${a.description?.slice(0, 80) || ''}${a.branch ? ` • ${a.branch}` : ''}`);
              }
            });
          }
          isFirstLoad.current.eas = false;
          prevEasIds.current = new Set(data.map(a => a.id));
        }
      } catch (e) { console.error('EAS fetch error:', e); }
    };

    const fetchMessages = async () => {
      try {
        const { data } = await supabase
          .from('messages')
          .select('*, sender:sender_id(first_name, last_name, email)')
          .eq('read', false)
          .order('created_at', { ascending: false })
          .limit(20);
        if (data) {
          const enriched = data.map(m => ({
            ...m,
            sender_name: m.sender ? `${m.sender.first_name || ''} ${m.sender.last_name || ''}`.trim() : null,
            sender_email: m.sender?.email || null,
          }));
          setMsgAlerts(enriched);
          setMsgCount(data.length);
          if (!isFirstLoad.current.msg) {
            enriched.forEach(m => {
              if (!prevMsgIds.current.has(m.id)) {
                const sender = m.sender_name || m.sender_email || 'Someone';
                pushToast('message', `New message from ${sender}`, m.content?.slice(0, 80) || m.message?.slice(0, 80) || '');
              }
            });
          }
          isFirstLoad.current.msg = false;
          prevMsgIds.current = new Set(enriched.map(m => m.id));
        }
      } catch (e) { console.error('Messages fetch error:', e); }
    };

    const fetchStockAlerts = async () => {
      try {
        const { data } = await supabase
          .from('inventory')
          .select('*')
          .lte('stock', supabase.raw('reorder_level * 1.2'))
          .order('stock', { ascending: true })
          .limit(20);
        if (data) {
          setStockAlerts(data);
          setStockCount(data.length);
          if (!isFirstLoad.current.stock) {
            data.forEach(item => {
              if (!prevStockIds.current.has(item.id)) {
                pushToast('stock', `Low Stock: ${item.name}`, `Only ${item.stock} left (reorder at ${item.reorder_level})${item.branch ? ` • ${item.branch}` : ''}`);
              }
            });
          }
          isFirstLoad.current.stock = false;
          prevStockIds.current = new Set(data.map(i => i.id));
        }
      } catch (e) { console.error('Stock fetch error:', e); }
    };

    fetchEmergencyAlerts();
    fetchMessages();
    fetchStockAlerts();

    const easSub = supabase.channel('eas-layout').on('postgres_changes', { event: '*', schema: 'public', table: 'emergency_alerts' }, () => fetchEmergencyAlerts()).subscribe();
    const msgSub = supabase.channel('msg-layout').on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => fetchMessages()).subscribe();
    const invSub = supabase.channel('inv-layout').on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, () => fetchStockAlerts()).subscribe();

    return () => {
      supabase.removeChannel(easSub);
      supabase.removeChannel(msgSub);
      supabase.removeChannel(invSub);
    };
  }, [isCustomer]);

  /* ── Document title ── */
  useEffect(() => {
    document.title = totalUnread > 0 ? `(${totalUnread}) Angeles Animal Pet Care` : 'Angeles Animal Pet Care';
  }, [totalUnread]);

  /* ── Click outside to close dropdowns ── */
  useEffect(() => {
    const handler = (e) => {
      if (notifDropRef.current && !notifDropRef.current.contains(e.target)) setShowNotifDrop(false);
      if (avatarDropRef.current && !avatarDropRef.current.contains(e.target)) setShowAvatar(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* ── Alert status update ── */
  const handleUpdateAlertStatus = async (id, newStatus) => {
    try {
      await supabase.from('emergency_alerts').update({ status: newStatus }).eq('id', id);
      setEasAlerts(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
      if (newStatus === 'resolved') {
        setEasAlerts(prev => prev.filter(a => a.id !== id));
        setEasCount(prev => Math.max(0, prev - 1));
      }
    } catch (e) { console.error('Update alert error:', e); }
  };

  /* ── Logout ── */
  const handleLogout = async () => {
    setLoggingOut(true);
    setLogoutAnimating(true);
    try {
      await supabase.auth.signOut();
      localStorage.removeItem('hospital_jwt');
      localStorage.removeItem('user_branch');
      // Hold the animation for 1.8s before navigating
      await new Promise(res => setTimeout(res, 1800));
      navigate('/login');
    } catch (e) {
      console.error('Logout error:', e);
      setLogoutAnimating(false);
    } finally {
      setLoggingOut(false);
      setShowLogout(false);
    }
  };

  return (
    <>
      <style>{`
        :root {
          --royal:      ${accentColor};
          --text:       #1e293b;
          --border:     #e2e8f0;
          --sidebar-bg: #1e1b4b;
        }
        * { box-sizing: border-box; }
        body { margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background: #f8fafc; }

        @keyframes tooltipIn  { from { opacity:0; transform:translateY(-50%) translateX(-4px) } to { opacity:1; transform:translateY(-50%) translateX(0) } }
        @keyframes dropIn     { from { opacity:0; transform:translateY(-6px) }                  to { opacity:1; transform:translateY(0) } }
        @keyframes modalIn    { from { opacity:0; transform:scale(0.95) }                        to { opacity:1; transform:scale(1) } }
        @keyframes pulse-dot      { 0%,100% { opacity:1 } 50% { opacity:0.4 } }
       @keyframes toastProgress  { from { width:100% } to { width:0% } }
        @keyframes logoutFadeOut  { 0% { opacity:1; transform:scale(1) } 60% { opacity:0.6; transform:scale(0.97) } 100% { opacity:0; transform:scale(0.94) } }
        @keyframes logoutSpinner  { to { transform:rotate(360deg) } }
        @keyframes logoutSlideUp  { 0% { opacity:0; transform:translateY(16px) } 100% { opacity:1; transform:translateY(0) } }
        .sidebar-shell { transition: ${SIDEBAR_TRANSITION}; }

        .sidebar-section-label {
  overflow: hidden;
  white-space: nowrap;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.3);
  padding: 4px 0 4px 14px;   /* ← reduced top padding from 12px to 4px */
  transition: opacity 0.2s ease, max-height 0.25s ease;
  flex-shrink: 0;             /* ← add this so it never gets squished */
}
.sidebar-section-label.collapsed { opacity: 0; max-height: 0; padding-top: 0; padding-bottom: 0; }
.sidebar-section-label.expanded  { opacity: 1; max-height: 40px; }

        .sidebar-logo-text {
          overflow: hidden;
          white-space: nowrap;
          transition: opacity 0.2s ease, max-width 0.25s cubic-bezier(0.4,0,0.2,1);
          transition-delay: 0.06s;
        }
        .sidebar-logo-text.collapsed { opacity: 0; max-width: 0; }
        .sidebar-logo-text.expanded  { opacity: 1; max-width: 100%;  }

        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 4px; }
      `}</style>

      <ToastContainer toasts={toasts} onClose={removeToast} />

      {/* ── Logout overlay animation ── */}
      {logoutAnimating && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 999999,
          background: 'rgba(15,10,40,0.92)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 20,
          animation: 'logoutFadeOut 1.8s ease forwards',
          animationDelay: '0.9s',
        }}>
          {/* Logo */}
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            overflow: 'hidden', border: '3px solid rgba(255,255,255,0.15)',
            boxShadow: `0 0 40px ${accentColor}66`,
            animation: 'logoutSlideUp 0.4s ease forwards',
            marginBottom: 4,
          }}>
            <img
              src="../public/image/446805041_881106557364617_1125518808684788316_n.jpg"
              alt="Logo"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>

          {/* Spinner ring */}
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            border: `3px solid rgba(255,255,255,0.1)`,
            borderTop: `3px solid ${accentColor}`,
            animation: 'logoutSpinner 0.8s linear infinite',
          }} />

          {/* Text */}
          <div style={{
            textAlign: 'center',
            animation: 'logoutSlideUp 0.4s ease 0.1s both',
          }}>
            <p style={{
              margin: '0 0 6px', fontSize: 17, fontWeight: 800,
              color: '#fff', letterSpacing: 0.3,
            }}>
              Signing out…
            </p>
            <p style={{
              margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.45)',
            }}>
              Angeles Animal Pet Care
            </p>
          </div>

          {/* Accent bar at bottom */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            height: 3,
            background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
          }} />
        </div>
      )}

      <Modal
        show={showLogout}
        title="Sign Out"
        message="Are you sure you want to sign out of Angeles Animal Pet Care?"
        onConfirm={handleLogout}
        onCancel={() => setShowLogout(false)}
        confirmText={loggingOut ? 'Signing out…' : 'Sign Out'}
        cancelText="Cancel"
        confirmColor="#ef4444"
      />

      {selectedAlert && (
        <AlertDetailModal
          alert={selectedAlert}
          onClose={() => setSelectedAlert(null)}
          onUpdateStatus={handleUpdateAlertStatus}
          isAdmin={isAdmin || isManager}
        />
      )}

      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', '--current-sidebar-w': `${SIDEBAR_W}px` }}>

        {/* ══════════════════════════════════════
            SIDEBAR
        ══════════════════════════════════════ */}
        <aside
          className="sidebar-shell"
          onMouseEnter={handleSidebarEnter}
          onMouseLeave={handleSidebarLeave}
          style={{
            width: SIDEBAR_W,
            minWidth: SIDEBAR_W,
            background: 'var(--sidebar-bg)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: isExpanded ? 'flex-start' : 'center',
            paddingTop: 12,
            paddingBottom: 12,
            position: 'relative',
            zIndex: 100,
            boxShadow: '4px 0 24px rgba(0,0,0,0.18)',
            overflow: 'hidden',
          }}
        >
          {/* Accent bar — color changes per branch */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: accentColor, transition: 'background 0.3s' }} />

          {/* ── Logo row ── */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            width: '100%',
            paddingLeft: isExpanded ? 14 : 0,
            paddingRight: isExpanded ? 10 : 0,
            justifyContent: isExpanded ? 'flex-start' : 'center',
            marginTop: 8,
            marginBottom: 16,
            transition: 'padding 0.3s cubic-bezier(0.4,0,0.2,1), justify-content 0.3s',
          }}>
            <div
              onClick={togglePin}
              style={{
                width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', overflow: 'hidden',
                border: '2px solid rgba(255,255,255,0.15)',
                background: '#fff',
              }}
            >
              <img
                src="../public/image/446805041_881106557364617_1125518808684788316_n.jpg"
                alt="Logo"
                style={{ width: 38, height: 38, objectFit: 'cover', borderRadius: '50%' }}
              />
            </div>

            <div className={`sidebar-logo-text ${isExpanded ? 'expanded' : 'collapsed'}`}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1 }}
            >
              <div>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: '#fff', lineHeight: 1.3, whiteSpace: 'normal', wordBreak: 'break-word' }}>
                  {user.branchId === 1 ? 'Angeles Animal Pet Care Hospital' : 'Angeles Animal Pet Care Center'}
                </p>
                <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.45)', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 130 }}>
                  {BRANCH_DISPLAY_NAMES[user.branchId] || user.branch || 'Management'}
                </p>
              </div>
              {/* X button when pinned */}
              {sidebarPinned && (
                <button
                  onClick={togglePin}
                  style={{
                    background: 'rgba(255,255,255,0.1)', border: 'none',
                    borderRadius: 6, width: 24, height: 24,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: 'rgba(255,255,255,0.6)',
                    fontSize: 14, lineHeight: 1, flexShrink: 0,
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              )}
            </div>
          </div>

          {/* Divider */}
          <div style={{
            width: isExpanded ? 'calc(100% - 28px)' : 30,
            marginLeft: isExpanded ? 14 : 0,
            height: 1,
            background: 'rgba(255,255,255,0.1)',
            marginBottom: 10,
            transition: 'width 0.3s, margin-left 0.3s',
          }} />

          {/* ── Branch pill ── */}
          <BranchPill
            branchId={user.branchId}
            branchName={user.branch}
            isExpanded={isExpanded}
          />

          {/* ── Nav links ── */}
          <nav style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: isExpanded ? 'flex-start' : 'center',
            width: '100%',
            paddingLeft: 8,
            paddingRight: 8,
            overflowY: 'auto',
            overflowX: 'hidden',  // ← changed from 'visible' to 'hidden'
            paddingTop: 0,
          }}>
            <span className={`sidebar-section-label ${isExpanded ? 'expanded' : 'collapsed'}`}>
              Navigation
            </span>

            {navLinks.map((link) => {
              const isActive = location.pathname === link.href || location.pathname.startsWith(link.href + '/');
              const isEmergency = link.href?.toLowerCase().includes('emergency');
              const isAI = /\bai\b/.test(link.href?.toLowerCase()) || /\bai\b/.test(link.label?.toLowerCase());
              const badge = isEmergency ? easCount : 0;

              return (
                <SidebarItem
                  key={link.href}
                  href={link.href}
                  label={link.label}
                  badge={badge}
                  isActive={isActive}
                  isEmergency={isEmergency}
                  isAI={isAI}
                  isExpanded={isExpanded}
                />
              );
            })}
          </nav>

          {/* Divider */}
          <div style={{
            width: isExpanded ? 'calc(100% - 28px)' : 30,
            marginLeft: isExpanded ? 14 : 0,
            height: 1,
            background: 'rgba(255,255,255,0.1)',
            marginBottom: 12,
            transition: 'width 0.3s, margin-left 0.3s',
          }} />

          {/* ── Bottom: user row ── */}
          <div style={{
            display: 'flex',
            flexDirection: isExpanded ? 'row' : 'column',
            alignItems: 'center',
            gap: 8,
            width: '100%',
            paddingLeft: isExpanded ? 10 : 0,
            paddingRight: isExpanded ? 10 : 0,
            justifyContent: isExpanded ? 'flex-start' : 'center',
            transition: 'padding 0.3s',
          }}>
            <button
              onClick={() => setShowLogout(true)}
              title="Sign Out"
              style={{
                width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                background: `linear-gradient(135deg, ${accentColor}, #4f46e5)`,
                border: '2px solid rgba(255,255,255,0.15)',
                color: '#fff', fontSize: 13, fontWeight: 800,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'inherit', transition: 'transform 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = `0 4px 12px ${accentColor}88`; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              {avatarLetter}
            </button>

            <span style={{
              fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)',
              whiteSpace: 'nowrap',
              opacity: isExpanded ? 1 : 0,
              maxWidth: isExpanded ? 120 : 0,
              overflow: 'hidden',
              display: isExpanded ? 'block' : 'none',
              transition: 'opacity 0.2s, max-width 0.25s cubic-bezier(0.4,0,0.2,1)',
              transitionDelay: isExpanded ? '0.06s' : '0s'
            }}>
              {user.name}
            </span>
          </div>
        </aside>

        {/* ══════════════════════════════════════
            MAIN AREA
        ══════════════════════════════════════ */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

          {/* ── TOPBAR ── */}
          <header style={{
            height: 56, minHeight: 56,
            background: '#fff', borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center',
            paddingLeft: 20, paddingRight: 16, gap: 12,
            position: 'sticky', top: 0, zIndex: 50,
          }}>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
              <img
                src="../public/image/446805041_881106557364617_1125518808684788316_n.jpg"
                alt="APC Logo"
                style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
              />
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.branchId === 1 ? 'Angeles Animal Pet Care Hospital' : 'Angeles Animal Pet Care Center'}
                </p>
                <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {portalLabel}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              {/* Bell */}
              {!isCustomer && (
                <div ref={notifDropRef} style={{ position: 'relative' }}>
                  <button
                    onClick={() => { setShowNotifDrop(v => !v); setShowAvatar(false); }}
                    style={{
                      position: 'relative', width: 36, height: 36, borderRadius: 10,
                      background: showNotifDrop ? '#f1f5f9' : 'transparent',
                      border: '1px solid var(--border)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 16, transition: 'background 0.15s', fontFamily: 'inherit',
                    }}
                    onMouseEnter={e => !showNotifDrop && (e.currentTarget.style.background = '#f8fafc')}
                    onMouseLeave={e => !showNotifDrop && (e.currentTarget.style.background = 'transparent')}
                    title="Notifications"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                    {totalUnread > 0 && (
                      <span style={{
                        position: 'absolute', top: 4, right: 4,
                        background: easCount > 0 ? '#ef4444' : '#2563eb',
                        color: '#fff', borderRadius: '50%',
                        width: 15, height: 15, fontSize: 8, fontWeight: 800,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: '2px solid #fff',
                        animation: easCount > 0 ? 'pulse-dot 1.5s infinite' : 'none',
                      }}>
                        {totalUnread > 9 ? '9+' : totalUnread}
                      </span>
                    )}
                  </button>
                  {showNotifDrop && (
                    <NotifDropdown
                      activeTab={activeTab} setActiveTab={setActiveTab}
                      easAlerts={easAlerts} msgAlerts={msgAlerts} stockAlerts={stockAlerts}
                      easCount={easCount} msgCount={msgCount} stockCount={stockCount}
                      onAlertClick={setSelectedAlert}
                      onClose={() => setShowNotifDrop(false)}
                    />
                  )}
                </div>
              )}

              {/* Avatar dropdown */}
              <div ref={avatarDropRef} style={{ position: 'relative' }}>
                <button
                  onClick={() => { setShowAvatar(v => !v); setShowNotifDrop(false); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '5px 10px 5px 5px', borderRadius: 10,
                    border: '1px solid var(--border)',
                    background: showAvatar ? '#f1f5f9' : 'transparent',
                    cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => !showAvatar && (e.currentTarget.style.background = '#f8fafc')}
                  onMouseLeave={e => !showAvatar && (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%',
                    background: `linear-gradient(135deg, ${accentColor}, #4f46e5)`,
                    color: '#fff', fontSize: 11, fontWeight: 800,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    {avatarLetter}
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>{user.name}</p>
                    <p style={{ margin: 0, fontSize: 10, color: '#94a3b8', lineHeight: 1.2 }}>{user.role}</p>
                  </div>
                 <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" style={{ marginLeft: 2 }}><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                {showAvatar && (
                  <AvatarDropdown
                    user={user}
                    onLogout={() => { setShowAvatar(false); setShowLogout(true); }}
                    onClose={() => setShowAvatar(false)}
                  />
                )}
              </div>
            </div>
          </header>

          {/* ── PAGE CONTENT ── */}
          <main style={{
            flex: 1, overflowY: 'auto', overflowX: 'hidden',
            padding: 24, background: '#f8fafc',
          }}>
            {children}
          </main>
        </div>
      </div>
    </>
  );
};

export default Layout;