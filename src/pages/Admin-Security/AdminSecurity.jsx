
import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import Layout from '../../components/layout';
import { supabase, supabaseAdmin } from '../../js/Utils/supabase';
import { useCurrentUser } from '../../js/hooks/Usecurrentuser';
import { usePresence } from '../../js/hooks/usePresence';
import '../../styles/AdminSecurity.css';

const Skel = ({ w = '100%', h = 16, style }) => (
  <span className="skel" style={{ width: w, height: h, borderRadius: 8, display: 'block', ...style }} />
);

// ── Custom dropdown (matches Appointments.jsx) ──
const getOptValue = (opt) => (typeof opt === 'string' ? opt : opt.value);
const getOptLabel = (opt) => (typeof opt === 'string' ? opt : opt.label);
const getOptDisabled = (opt) => (typeof opt === 'string' ? false : !!opt.disabled);
const CustomSelect = ({ value, onChange, options, placeholder = '—', accent = '#6366f1' }) => {  const [open, setOpen] = React.useState(false);
  const [dropPos, setDropPos] = React.useState({ top: 0, left: 0, width: 0 });
 const triggerRef = React.useRef(null);
  const ref = React.useRef(null);
  const selected = options.find(o => getOptValue(o) === value);
  const label = selected ? getOptLabel(selected) : placeholder;

  React.useEffect(() => {
    const handler = (e) => {
      if (
        ref.current && !ref.current.contains(e.target) &&
        triggerRef.current && !triggerRef.current.contains(e.target)
      ) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = () => {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const dropHeight = Math.min((options.length + 1) * 38, 240);
      const showAbove = spaceBelow < dropHeight + 10;
      setDropPos({
        top: showAbove ? rect.top + window.scrollY - dropHeight - 6 : rect.bottom + window.scrollY + 6,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
    setOpen(o => !o);
  };

  const portal = open && typeof document !== 'undefined'
    ? ReactDOM.createPortal(
      <div ref={ref} style={{ position: 'absolute', top: dropPos.top, left: dropPos.left, width: dropPos.width, background: 'var(--card)', borderRadius: 12, zIndex: 99999, boxShadow: '0 16px 40px rgba(0,0,0,0.13), 0 4px 12px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.06)', border: '1.5px solid #e8edf4', maxHeight: 260, overflowY: 'auto', padding: '5px' }}>
         {([{ value: '', label: placeholder }, ...options]).map((opt, i) => {
          const optVal = getOptValue(opt);
          const optLabel = getOptLabel(opt);
          const optDisabled = getOptDisabled(opt);
          const isSelected = optVal === value;
          const isEmpty = optVal === '';
          return (
            <div key={i} onClick={() => { if ((!optDisabled && optVal !== '') || optVal === '') { onChange(optVal); setOpen(false); } }}
               style={{ padding: '8px 10px', fontSize: 13, fontWeight: isSelected ? 700 : 500, color: optDisabled ? '#cbd5e1' : isEmpty ? '#b0bac9' : isSelected ? accent : 'var(--text)', cursor: optDisabled ? 'not-allowed' : isEmpty ? 'default' : 'pointer', transition: 'background 0.12s, color 0.12s', background: isSelected ? `${accent}12` : 'transparent', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, opacity: optDisabled ? 0.45 : 1, marginBottom: 1 }}
              onMouseEnter={e => { if (!isSelected && !optDisabled && !isEmpty) e.currentTarget.style.background = '#f4f6fa'; }}
              onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = isSelected ? `${accent}12` : 'transparent'; }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                {!isEmpty && (
                  <div style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: isSelected ? accent : 'transparent', border: `1.5px solid ${isSelected ? accent : optDisabled ? '#e2e8f0' : '#cbd5e1'}`, transition: 'background 0.15s, border-color 0.15s' }} />
                )}
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{optLabel}</span>
              </div>
              {isSelected && !isEmpty && (
                <div style={{ width: 18, height: 18, borderRadius: 5, background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                </div>
              )}
            </div>
          );
        })}
      </div>,
      document.body
    )
    : null;

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div ref={triggerRef} onClick={handleOpen}
        style={{ width: '100%', padding: '8px 34px 8px 12px', border: '1.5px solid', borderRadius: 9, background: open ? 'linear-gradient(135deg, #ffffff 0%, #f5f3ff 100%)' : 'linear-gradient(to bottom, #ffffff 0%, #f8fafc 100%)', fontSize: 13, fontWeight: 600, color: value ? 'var(--text)' : '#b0bac9', cursor: 'pointer', userSelect: 'none', boxSizing: 'border-box', boxShadow: open ? `0 0 0 3px ${accent}22, 0 2px 8px rgba(0,0,0,0.08)` : '0 1px 3px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)', borderColor: open ? accent : '#dde3ec', transition: 'border-color 0.18s, box-shadow 0.18s, background 0.18s', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, position: 'relative', minHeight: 36 }}
        onMouseEnter={e => { if (!open) { e.currentTarget.style.borderColor = '#a5b4fc'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(99,102,241,0.10), inset 0 1px 0 rgba(255,255,255,0.9)'; } }}
        onMouseLeave={e => { if (!open) { e.currentTarget.style.borderColor = '#dde3ec'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)'; } }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{label}</span>
        <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', width: 20, height: 20, borderRadius: 6, background: open ? accent : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.18s', flexShrink: 0 }}>
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={open ? '#fff' : '#94a3b8'} strokeWidth="3" strokeLinecap="round" style={{ transition: 'transform 0.2s, stroke 0.18s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>
      {portal}
    </div>
  );
};

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

const generateOtpCode = () => String(Math.floor(100000 + Math.random() * 900000));

// Sends a 6-digit OTP to the user's personal email for second-factor verification.
// Inserts a row into email_verification_codes; an Edge Function / DB trigger
// (configured separately) is responsible for actually emailing the code.
const sendVerificationCode = async (userId, email) => {
  const { error: otpError } = await supabase.auth.signInWithOtp({
    email: email.toLowerCase(),
    options: {
      shouldCreateUser: true,
      emailRedirectTo: undefined,
    },
  });
  if (otpError) {
    console.warn('OTP send failed:', otpError.message);
    alert('Failed to send code: ' + otpError.message);
  }
  return null;
};

const sanitizeName = (v) => v.replace(/[^a-zA-Z\s'-]/g, '');

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
      <div onClick={onCancel} className="usr-confirm-scrim" />
      <div className="usr-confirm-wrap">
        <div className="usr-confirm-box">
          <div className="usr-confirm-card">
            <div className="usr-confirm-header" style={{ backgroundColor: color }}>
              <h5 className="usr-confirm-title">{title}</h5>
              <button onClick={onCancel} className="usr-confirm-close">✕</button>
            </div>
            <div className="usr-confirm-body"><p>{message}</p></div>
            <div className="usr-confirm-footer">
              <button onClick={onCancel} className="usr-confirm-cancel">Cancel</button>
              <button onClick={onConfirm} className="usr-confirm-confirm" style={{ backgroundColor: color }}>{confirmLabel}</button>
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
const rows = [['Name', credentials.fullName], ['Email', credentials.email], ['Password', credentials.password]];
  return (
    <div className="usr-modal-overlay z-1200">
      <div className="usr-modal-box max-w-440">
        <div className="usr-cred-header">
          <div className="usr-cred-header-row">
            <div className="usr-cred-header-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <div>
              <h3 className="usr-cred-header-title">Account Created!</h3>
              <p className="usr-cred-header-sub">Share these credentials with the user</p>
            </div>
          </div>
        </div>
        <div className="usr-cred-body">
          {rows.map(([label, value]) => (
            <div key={label} className="usr-cred-field">
              <p className="usr-cred-field-label">{label}</p>
              <div className={`usr-cred-field-value${label.includes('Password') ? ' mono' : ''}`}>{value}</div>
            </div>
          ))}
          <div className="usr-cred-warning">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#92400e" strokeWidth="2.5" strokeLinecap="round" style={{ marginTop: 1, flexShrink: 0 }}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
            <span>This password will not be shown again. Copy it before closing.</span>
          </div>
          {credentials.pendingVerification && (
            <div className="usr-cred-info">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1e40af" strokeWidth="2.5" strokeLinecap="round" style={{ marginTop: 1, flexShrink: 0 }}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
              <span>This address must be verified by entering the 6-digit code sent to it. The account stays inactive until verification is complete.</span>
            </div>
          )}
        </div>
        <div className="usr-cred-footer">
          <button className="btn btn-ghost usr-w-auto" onClick={copyAll}>{copied ? '✓ Copied!' : 'Copy All'}</button>
          <button className="btn btn-primary usr-w-auto" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
};
const LiveToast = ({ message, show, type = 'success' }) => {
  const cfg = {
    success: {
      accent: '#22c55e', iconBg: '#f0fdf4', iconColor: '#16a34a', labelBg: '#dcfce7', labelColor: '#166534', label: 'Success',
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
    },
    error: {
      accent: '#ef4444', iconBg: '#fef2f2', iconColor: '#dc2626', labelBg: '#fee2e2', labelColor: '#991b1b', label: 'Error',
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
    },
    info: {
      accent: '#3b82f6', iconBg: '#eff6ff', iconColor: '#2563eb', labelBg: '#dbeafe', labelColor: '#1e40af', label: 'Info',
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
    },
    warning: {
      accent: '#f59e0b', iconBg: '#fffbeb', iconColor: '#d97706', labelBg: '#fef3c7', labelColor: '#92400e', label: 'Warning',
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
    },
  };
  const c = cfg[type] || cfg.success;
  return (
    <div className={`usr-toast ${show ? 'show' : 'hide'}`}>
      <div className="usr-toast-accent-bar" style={{ background: c.accent }} />
      <div className="usr-toast-body">
        <div className="usr-toast-icon" style={{ background: c.iconBg, color: c.iconColor }}>
          {c.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ marginBottom: 5 }}>
            <span className="usr-toast-label" style={{ color: c.labelColor, background: c.labelBg }}>{c.label}</span>
          </div>
          <p className="usr-toast-message">{message}</p>
        </div>
      </div>
      <div className="usr-toast-progress-track" style={{ background: `${c.accent}22` }}>
        <div className="usr-toast-progress-fill" style={{ background: c.accent, width: show ? '0%' : '100%', transition: show ? 'width 3s linear' : 'none' }} />
      </div>
    </div>
  );
};

const DetailRow = ({ label, value }) => (
  <div className="usr-detail-row">
    <span className="usr-detail-label">{label}</span>
    <span className="usr-detail-value">{value || '—'}</span>
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

// ── Auto-send email change on mount ──────────────────────────────────────────
const AutoSendEmailChange = ({ pendingEmailChange, saving, onCancel, onSend }) => {  const hasRun = useRef(false);
  useEffect(() => {
    if (!hasRun.current) {
      hasRun.current = true;
      onSend();
    }
  }, []); // eslint-disable-line

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: 16 }}>
      <div style={{ background: 'var(--card)', borderRadius: 20, width: '100%', maxWidth: 420, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', padding: '32px 28px', textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#eff6ff', border: '1.5px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M2 7l8.5 6a2 2 0 0 0 3 0L22 7" /></svg>
        </div>
        <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>
          {saving ? 'Sending verification…' : 'Sending…'}
        </h3>
        <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
          Sending confirmation to<br />
          <strong style={{ color: 'var(--text)' }}>{pendingEmailChange.newEmail}</strong>
        </p>
        {saving && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <div style={{ width: 28, height: 28, border: '3px solid #bfdbfe', borderTop: '3px solid #2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        )}
        <button className="btn btn-ghost" style={{ width: 'auto' }} onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────
const AdminSecurity = () => {
  // ── FIX 1: destructure isSuperAdmin from useCurrentUser ──────────────────
  // canSeeAllBranches = true for both SuperAdmin AND Admin
  const { user: currentUser, isAdmin, isSuperAdmin, loading: userLoading } = useCurrentUser();
  const canSeeAllBranches = isSuperAdmin || isAdmin;
  const onlineIds = usePresence(currentUser?.id);

  const [branches, setBranches] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('users');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [adminsOnlyFilter, setAdminsOnlyFilter] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [viewUser, setViewUser] = useState(null);
  const [editUser, setEditUser] = useState(null);  
  const [confirm, setConfirm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletedUsers, setDeletedUsers] = useState([]);
  const [showDeletedModal, setShowDeletedModal] = useState(false);
  const [addForm, setAddForm] = useState({ first_name: '', last_name: '', email: '', password: '', role: 'Employee', status: 'Active', branch_id: '' });
  const [addErrors, setAddErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [editForm, setEditForm] = useState({ role: 'Employee', status: 'Active', first_name: '', last_name: '', branch_id: '', phone_number: '' });
 const [editFormOriginal, setEditFormOriginal] = useState(null);
  const [pendingEmailChange, setPendingEmailChange] = useState(null);
  const [showPersonalEmailPrompt, setShowPersonalEmailPrompt] = useState(false);
  const [personalEmailInput, setPersonalEmailInput] = useState('');
  const [personalEmailError, setPersonalEmailError] = useState('');
  const [otpInput, setOtpInput] = useState(['', '', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [otpVerifying, setOtpVerifying] = useState(false);

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


  const [toasts, setToasts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [logsPage, setLogsPage] = useState(1);
  const ROWS_PER_PAGE = 10;
  const LOGS_PER_PAGE = 10;
  const toastTimer = useRef(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const handleSort = (key) => {
    setSortConfig(prev => prev.key === key ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'asc' });
  };

  const showToast = (message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type, show: true }]);
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, show: false } : t));
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 400);
    }, 3000);
  };

  const [pwdRequests, setPwdRequests] = useState([]);
  const fetchPwdRequests = useCallback(async () => {
    let q = supabase.from('forgot_password_requests').select('*').eq('status', 'pending').order('created_at', { ascending: false });
    const { data } = await q;
    let rows = data || [];
    // Managers can only see/approve requests for users in their own branch —
    // only Admin/SuperAdmin see requests across all branches.
    if (!canSeeAllBranches && currentUser?.branchId && rows.length) {
      const { data: profs } = await supabaseAdmin
        .from('profiles')
        .select('id, branch_id')
        .in('id', rows.map(r => r.user_id).filter(Boolean));
      const branchById = new Map((profs || []).map(p => [p.id, p.branch_id]));
      rows = rows.filter(r => branchById.get(r.user_id) === currentUser.branchId);
    }
    setPwdRequests(rows);
  }, [canSeeAllBranches, currentUser]);


  const approvePwdRequest = (req) => {
    setConfirm({
      title: 'Approve Password Change',
      message: `Apply the new password requested by ${req.email}?`,
      type: 'success', confirmLabel: 'Approve',
      onConfirm: async () => {
        setConfirm(null);

        // Re-check branch ownership right before applying — the list can go
        // stale, and this is the action that actually changes a credential,
        // so it gets its own authorization check regardless of what the UI showed.
        if (!canSeeAllBranches && currentUser?.branchId) {
          const { data: prof } = await supabaseAdmin.from('profiles').select('branch_id').eq('id', req.user_id).single();
          if (!prof || prof.branch_id !== currentUser.branchId) {
            alert("You don't have permission to approve a password change for a user outside your branch.");
            setPwdRequests(prev => prev.filter(r => r.id !== req.id));
            return;
          }
        }

        const { error } = await supabaseAdmin.auth.admin.updateUserById(req.user_id, { password: req.new_password });
        if (error) { alert('Error: ' + error.message); return; }
        await supabase.from('forgot_password_requests').update({ status: 'approved', reviewed_at: new Date().toISOString(), reviewed_by: currentUser.id }).eq('id', req.id);
        setPwdRequests(prev => prev.filter(r => r.id !== req.id));
        showToast(`Password updated for ${req.email}`);
      },
    });
  };
  const rejectPwdRequest = (req) => {
    setConfirm({
      title: 'Reject Request', message: `Reject the password change request from ${req.email}?`,
      type: 'danger', confirmLabel: 'Reject',
      onConfirm: async () => {
        setConfirm(null);
        await supabase.from('forgot_password_requests').update({ status: 'rejected', reviewed_at: new Date().toISOString(), reviewed_by: currentUser.id }).eq('id', req.id);
        setPwdRequests(prev => prev.filter(r => r.id !== req.id));
      },
    });
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

    let query = supabaseAdmin
      .from('profiles')
      .select('*, branches(name)')
      .is('deleted_at', null)
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
    }
    setLoading(false);
  }, [canSeeAllBranches, currentUser, userLoading, branchFilter]);

  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

  const fetchDeletedUsers = useCallback(async () => {
    if (userLoading || !currentUser) return;
    let query = supabaseAdmin
      .from('profiles')
      .select('*, branches(name)')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });
    if (!canSeeAllBranches && currentUser.branchId) query = query.eq('branch_id', currentUser.branchId);
    else if (canSeeAllBranches && branchFilter) query = query.eq('branch_id', branchFilter);

    const { data, error } = await query;
    if (error) return;
    const now = Date.now();
    const expired = (data || []).filter(u => now - new Date(u.deleted_at).getTime() > THIRTY_DAYS_MS);
    if (expired.length > 0) {
      for (const u of expired) { try { await supabaseAdmin.auth.admin.deleteUser(u.id); } catch (e) { } }
      await supabaseAdmin.from('profiles').delete().in('id', expired.map(u => u.id));
    }
    setDeletedUsers((data || []).filter(u => now - new Date(u.deleted_at).getTime() <= THIRTY_DAYS_MS));
  }, [canSeeAllBranches, currentUser, userLoading, branchFilter]);

  // ── FIX 3: fetchPending — use canSeeAllBranches consistently ─────────────
  const fetchPending = useCallback(async () => {
    let query = supabaseAdmin
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

  // Backfill: create/link accounts for patient owners that have no owner_user_id yet,
  // and self-heal any half-created profiles (blank name / lowercase role) left over
  // from earlier signup triggers. Uses supabaseAdmin throughout so it can write to
  // ANY user's profile regardless of RLS (the acting user is staff, not the owner).
  const [syncingOwners, setSyncingOwners] = useState(false);
  const syncMissingOwnerAccounts = async () => {
    setSyncingOwners(true);
    try {
      const { data: patients, error: patErr } = await supabase
        .from('patients')
        .select('id, owner, owner_email, contact, branch_id, owner_user_id');
      if (patErr) { alert('Error fetching patients: ' + patErr.message); setSyncingOwners(false); return; }

      const targets = (patients || []).filter(p => p.owner && p.owner.trim());
      if (targets.length === 0) { showToast('No patient owners found', 'info'); setSyncingOwners(false); return; }

      let created = 0, linked = 0, fixed = 0, skipped = 0;
      for (const p of targets) {
        let ownerEmail = (p.owner_email || '').trim().toLowerCase();
        if (!ownerEmail) {
          const cleanName = p.owner.trim().toLowerCase().replace(/\s+/g, '.');
          ownerEmail = `${cleanName}@customer.com`;
        }

        let userId = p.owner_user_id || null;
        let needsFix = false;

        if (!userId) {
          const { data: existingProfile } = await supabaseAdmin.from('profiles').select('id, first_name, role').eq('email', ownerEmail).maybeSingle();
          if (existingProfile?.id) {
            userId = existingProfile.id;
            linked++;
            if (!existingProfile.first_name || (existingProfile.role || '').toLowerCase() !== 'customer') needsFix = true;
          } else {
            const password = generatePassword();
            const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
              email: ownerEmail, password, email_confirm: true,
              user_metadata: { full_name: p.owner, role: 'Customer' },
            });
            if (authError || !authData?.user?.id) { skipped++; continue; }
            userId = authData.user.id;
            created++;
            needsFix = true;
          }
        } else {
          const { data: existingProfile } = await supabaseAdmin.from('profiles').select('first_name, role').eq('id', userId).maybeSingle();
          if (!existingProfile?.first_name || (existingProfile?.role || '').toLowerCase() !== 'customer') needsFix = true;
        }

        if (userId && needsFix) {
          const parts = p.owner.trim().split(/\s+/);
          const first = parts[0] || ''; const last = parts.slice(1).join(' ') || '';
          const { error: upsertErr } = await supabaseAdmin.from('profiles').upsert(
            { id: userId, email: ownerEmail, first_name: first, last_name: last, role: 'Customer', branch_id: p.branch_id || null },
            { onConflict: 'id', ignoreDuplicates: false }
          );
          if (upsertErr) { skipped++; continue; }
          fixed++;
        }

        if (userId && userId !== p.owner_user_id) {
          await supabase.from('patients').update({ owner_user_id: userId, owner_email: ownerEmail }).eq('id', p.id);
        }
      }

      await supabase.from('activity_logs').insert([{
        user_id: currentUser.id,
        user_name: currentUser.fullName || currentUser.email,
        user_role: currentUser.role,
        action: 'Synced owner accounts',
        details: `Created ${created}, linked ${linked}, fixed ${fixed}, skipped ${skipped} of ${targets.length} patient owners`,
      }]);

      showToast(`Synced owners — created ${created}, fixed ${fixed}, skipped ${skipped}`);
      fetchUsers();
    } catch (err) {
      alert('Unexpected error: ' + err.message);
    }
    setSyncingOwners(false);
  };

  useEffect(() => {
    if (!userLoading) {
      fetchBranches();
      fetchUsers();
      fetchDeletedUsers();
      fetchPending();
      fetchPwdRequests();
      fetchCustomRoles();
      fetchLogs();
    }
  }, [userLoading, fetchUsers, fetchDeletedUsers, fetchPending, fetchPwdRequests, fetchCustomRoles, fetchBranches]);

  useEffect(() => { if (canSeeAllBranches) { fetchUsers(); fetchDeletedUsers(); } }, [branchFilter]); // eslint-disable-line

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
        if (!canSeeAllBranches && updated.branch_id !== currentUser?.branchId) return;
        if (updated.deleted_at) {
          setUsers((prev) => prev.filter(u => u.id !== updated.id));
          setDeletedUsers((prev) => prev.find(u => u.id === updated.id) ? prev.map(u => u.id === updated.id ? { ...u, ...updated } : u) : [updated, ...prev]);
          setViewUser(v => v?.id === updated.id ? null : v);
          return;
        }
        setDeletedUsers((prev) => prev.filter(u => u.id !== updated.id));
        setUsers((prev) => {
          if (!prev.find(u => u.id === updated.id)) {
            return [updated, ...prev];
          }
          return prev.map(u => u.id === updated.id ? { ...u, ...updated } : u);
        });
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
        } else {
          // Fetch fresh in case status differs
          fetchPending();
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pending_users' }, (payload) => {
        const req = payload.new;
        if (req.status !== 'pending') {
          setPendingRequests(prev => prev.filter(r => r.id !== req.id));
        } else {
          setPendingRequests(prev => prev.map(r => r.id === req.id ? req : r));
        }
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'pending_users' }, (payload) => {
        setPendingRequests(prev => prev.filter(r => r.id !== payload.old?.id));
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Fetch fresh data once subscribed to avoid missing any inserts during setup
          fetchPending();
        }
      });

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
  }, [canSeeAllBranches, currentUser, fetchPending]); // eslint-disable-line

  const fetchLogs = useCallback(async () => {
    const { data } = await supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    setLogs(data || []);
  }, []);

  useEffect(() => {
    if (!userLoading) fetchLogs();
  }, [userLoading, fetchLogs]);

  useEffect(() => {
    const logsSub = supabase
      .channel('realtime-activity-logs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_logs' }, (payload) => {
        setLogs(prev => [payload.new, ...prev]);
      })
      .subscribe();
    return () => supabase.removeChannel(logsSub);
  }, []);

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
    else if (addForm.first_name.trim().length < 2) errs.first_name = 'First name must be at least 2 characters';
    if (!addForm.last_name.trim()) errs.last_name = 'Last name is required';
    else if (addForm.last_name.trim().length < 2) errs.last_name = 'Last name must be at least 2 characters';
    if (!addForm.email.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addForm.email)) errs.email = 'Invalid email';
    else if (users.some(u => u.email?.toLowerCase() === addForm.email.toLowerCase())) errs.email = 'Email already exists';
    if (!addForm.password.trim()) errs.password = 'Password is required';
    else if (addForm.password.length < 8) errs.password = 'Password must be at least 8 characters';
    else if (!/[A-Z]/.test(addForm.password) || !/[a-z]/.test(addForm.password) || !/[0-9]/.test(addForm.password)) {
      errs.password = 'Password must include an uppercase letter, a lowercase letter, and a number';
    }
    if (!addForm.role) errs.role = 'Please select a role';
    // FIX 7: require branch selection for SuperAdmin/Admin when adding
    if (canSeeAllBranches && !addForm.branch_id) errs.branch_id = 'Please select a branch';
    return errs;
  };

  const isAddUserFormValid = () => {
    if (!addForm.first_name.trim() || addForm.first_name.trim().length < 2) return false;
    if (!addForm.last_name.trim() || addForm.last_name.trim().length < 2) return false;
    if (!addForm.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addForm.email)) return false;
    if (!addForm.password.trim() || addForm.password.length < 8) return false;
    if (!addForm.role) return false;
    if (canSeeAllBranches && !addForm.branch_id) return false;
    return true;
  };

  const handleAddUser = async () => {
    const errs = validateAdd();
    if (Object.keys(errs).length) { setAddErrors(errs); return; }
    setSaving(true);

    const isPersonalEmail = (addForm.role === 'Employee' || addForm.role === 'Customer' || addForm.role === 'Admin') && addForm.usePersonalEmail;

    try {
      // Step 1: Create auth user
      // If using a personal email, don't auto-confirm — Supabase will send a verification email
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: addForm.email.trim().toLowerCase(),
        password: addForm.password,
        email_confirm: !isPersonalEmail,
        user_metadata: {
          first_name: addForm.first_name.trim(),
          last_name: addForm.last_name.trim(),
          role: addForm.role,
          branch_id: addForm.branch_id || currentUser?.branchId || null,
          sex: addForm.sex || null,
        },
      });

      await supabase.from("activity_logs").insert([{
        user_id: currentUser.id,
        user_name: currentUser.fullName || currentUser.email,
        user_role: currentUser.role,
        action: "Created user account",
        details: `${addForm.first_name} ${addForm.last_name} · ${addForm.role} · ${addForm.email}`,
      }]);

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

      if (isPersonalEmail) {
        await sendVerificationCode(userId, addForm.email.trim().toLowerCase());
      }

      setSaving(false);
      setCreatedCredentials({
        fullName: `${addForm.first_name.trim()} ${addForm.last_name.trim()}`,
        email: addForm.email.trim().toLowerCase(),
        password: addForm.password,
        pendingVerification: isPersonalEmail,
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
        try {
          // Step 1: Create auth user or get existing
          const password = req.password_hint || generatePassword();
          let userId = null;

          const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: req.email,
            password,
            email_confirm: true,
            user_metadata: {
              first_name: req.first_name,
              last_name: req.last_name,
              role: req.role,
              branch_id: req.branch_id || null,
              sex: req.sex || null,
            },
          });

          if (authError) {
            if (authError.message?.includes('already been registered')) {
              // User exists in auth — find their ID
              const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
              const existing = listData?.users?.find(u => u.email?.toLowerCase() === req.email.toLowerCase());
              if (!existing) { alert('Could not find existing user. Please check manually.'); return; }
              userId = existing.id;
            } else {
              alert('Auth Error: ' + authError.message);
              return;
            }
          } else {
            userId = authData.user.id;
          }

          // Step 2: Resolve branch_id from branch name if branch_id is null
          let resolvedBranchId = req.branch_id ?? null;
          if (!resolvedBranchId && req.branch) {
            const branchName = req.branch.replace(/\s*Branch\s*$/i, '').trim();
            const { data: branchData } = await supabase
              .from('branches')
              .select('id')
              .ilike('name', branchName)
              .single();
            if (branchData?.id) resolvedBranchId = branchData.id;
          }

          // Step 3: Upsert profile with ALL fields from the request
          if (userId) {
            const { error: profileError } = await supabase.from("profiles").upsert([{
              id: userId,
              first_name: (req.first_name || '').trim(),
              last_name: (req.last_name || '').trim(),
              email: (req.email || '').toLowerCase().trim(),
              phone_number: (req.phone_number || '').trim(),
              sex: req.sex || null,
              role: req.role || "Customer",
              branch_id: resolvedBranchId || null,
              branch: req.branch || null,
              status: "Active",
            }], { onConflict: "id" });

            if (profileError) {
              console.error("Profile upsert error:", profileError);
            }
          }

          // Step 3: Mark as approved (triggers realtime UPDATE → ManagerControl removes from list), then delete
          await supabase.from('pending_users').update({ status: 'approved', branch_id: resolvedBranchId }).eq('id', req.id);
          await supabase.from('pending_users').delete().eq('id', req.id); setPendingRequests(prev => prev.filter(r => r.id !== req.id));

          // Step 3: Log
          await supabase.from('activity_logs').insert([{
            user_id: currentUser.id,
            user_name: currentUser.fullName || currentUser.email,
            user_role: currentUser.role,
            action: 'Approved account request',
            details: `Created account for ${req.first_name} ${req.last_name} (${req.email})`,
          }]);

          setCreatedCredentials({
            fullName: `${req.first_name} ${req.last_name}`,
            email: req.email,
            password,
          });
        } catch (err) {
          alert('Unexpected error: ' + err.message);
        }
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
    const initialForm = {
      role: u.role || 'Employee',
      status: u.status || 'Active',
      first_name: u.first_name || '',
      last_name: u.last_name || '',
      branch_id: u.branch_id || '',
      email: u.email || '',
      sex: u.sex || '',
      phone_number: u.phone_number || '',
    };
    setEditForm(initialForm);
    setEditFormOriginal(JSON.stringify(initialForm));
    setEditUser(u);
    setShowEditModal(true);
  };

  const hasUnsavedEditChanges = () => editFormOriginal !== null && JSON.stringify(editForm) !== editFormOriginal;

  const attemptCloseEditModal = () => {
    if (hasUnsavedEditChanges()) {
      setConfirm({
        title: 'Discard Changes?',
        message: "You have unsaved changes to this user's record. Do you want to discard them?",
        type: 'danger',
        confirmLabel: 'Discard',
        onConfirm: () => { setConfirm(null); setShowEditModal(false); setEditFormOriginal(null); },
      });
    } else {
      setShowEditModal(false);
      setEditFormOriginal(null);
    }
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
        sex: editForm.sex || null,
        phone_number: editForm.phone_number || null,
      };

      // SuperAdmin can also update email via admin API
      if (isSuperAdmin && editForm.email && editForm.email !== editUser.email) {
        const isPersonalEmail = ['Employee', 'Customer', 'Admin', 'SuperAdmin', 'Super Admin', 'super_admin'].includes(editForm.role) && editForm.usePersonalEmail;

        if (isPersonalEmail) {
          // Don't apply yet — show confirmation modal first.
          // Save the rest of the profile changes (non-email fields) now,
          // then pause and wait for the user to confirm the email change.
          const { error: partialError } = await supabaseAdmin
            .from('profiles')
            .update(updatePayload)
            .eq('id', editUser.id);

          if (partialError) { alert('Error: ' + partialError.message); setSaving(false); return; }

          await supabase.from("activity_logs").insert([{
            user_id: currentUser.id,
            user_name: currentUser.fullName || currentUser.email,
            user_role: currentUser.role,
            action: "Edited user",
            details: `Updated ${editForm.first_name} ${editForm.last_name} — role: ${editForm.role}, status: ${editForm.status}`,
          }]);

          setSaving(false);
          setPendingEmailChange({
            userId: editUser.id,
            newEmail: editForm.email.trim().toLowerCase(),
            fullName: `${editForm.first_name} ${editForm.last_name}`,
          });
          setShowEditModal(false);
          return;
        }

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

      await supabase.from("activity_logs").insert([{
        user_id: currentUser.id,
        user_name: currentUser.fullName || currentUser.email,
        user_role: currentUser.role,
        action: "Edited user",
        details: `Updated ${editForm.first_name} ${editForm.last_name} — role: ${editForm.role}, status: ${editForm.status}`,
      }]);

      const { error } = await supabaseAdmin
        .from('profiles')
        .update(updatePayload)
        .eq('id', editUser.id);

      if (error) { alert('Error: ' + error.message); setSaving(false); return; }

      showToast(`User ${editForm.first_name} updated successfully`);
      setShowEditModal(false);
      setEditFormOriginal(null);
    } catch (err) {
      alert('Unexpected error: ' + err.message);
    }
    setSaving(false);
  };

  const handleDelete = (u) => {
    setConfirm({
      title: 'Delete User?',
      message: `${fullName(u)} will move to Recently Deleted for 30 days before being permanently removed. Their login will be blocked immediately.`,
      type: 'danger',
      confirmLabel: 'Yes, Delete',
      onConfirm: async () => {
        setConfirm(null);
        try {
          // Block login immediately
          const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(
            u.id, { ban_duration: '876000h' }
          );
          if (banError) console.warn('Ban warning (non-fatal):', banError.message);

          const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', u.id);

          if (profileError) { alert('Error: ' + profileError.message); return; }

          await supabase.from("activity_logs").insert([{
            user_id: currentUser.id,
            user_name: currentUser.fullName || currentUser.email,
            user_role: currentUser.role,
            action: "Deleted user",
            details: `Moved to Recently Deleted: ${fullName(u)} (${u.email})`,
          }]);

          showToast(`${fullName(u)} moved to Recently Deleted`, 'info');
          if (viewUser?.id === u.id) setViewUser(null);
          fetchUsers(); fetchDeletedUsers();
        } catch (err) {
          alert('Unexpected error: ' + err.message);
        }
      },
    });
  };

  const restoreUser = (u) => {
    setConfirm({
      title: 'Restore User?',
      message: `${fullName(u)} will be restored and able to log in again.`,
      type: 'success',
      confirmLabel: 'Restore',
      onConfirm: async () => {
        setConfirm(null);
        try {
          const { error: unbanError } = await supabaseAdmin.auth.admin.updateUserById(u.id, { ban_duration: 'none' });
          if (unbanError) console.warn('Unban warning (non-fatal):', unbanError.message);

          const { error } = await supabaseAdmin.from('profiles').update({ deleted_at: null }).eq('id', u.id);
          if (error) { alert('Error: ' + error.message); return; }

          await supabase.from("activity_logs").insert([{
            user_id: currentUser.id,
            user_name: currentUser.fullName || currentUser.email,
            user_role: currentUser.role,
            action: "Restored user",
            details: `Restored: ${fullName(u)} (${u.email})`,
          }]);

          showToast(`${fullName(u)} restored`);
          fetchUsers(); fetchDeletedUsers();
        } catch (err) {
          alert('Unexpected error: ' + err.message);
        }
      },
    });
  };

  const permanentlyDeleteUser = (u) => {
    setConfirm({
      title: 'Delete Permanently',
      message: `Permanently delete ${fullName(u)}? This will also remove their login credentials. This cannot be undone.`,
      type: 'danger',
      confirmLabel: 'Delete Forever',
      onConfirm: async () => {
        setConfirm(null);
        try {
          try { await supabaseAdmin.auth.admin.deleteUser(u.id); } catch (e) { console.warn('Auth delete warning:', e.message); }

          const { error: profileError } = await supabaseAdmin.from('profiles').delete().eq('id', u.id);
          if (profileError) { alert('Profile delete error: ' + profileError.message); return; }

          await supabase.from("activity_logs").insert([{
            user_id: currentUser.id,
            user_name: currentUser.fullName || currentUser.email,
            user_role: currentUser.role,
            action: "Permanently deleted user",
            details: `Removed ${fullName(u)} (${u.email})`,
          }]);

          showToast(`${fullName(u)} permanently deleted`, 'info');
          fetchDeletedUsers();
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

  const handleConfirmEmailChange = useCallback(async () => {
    if (!pendingEmailChange) return;
    const { userId, newEmail } = pendingEmailChange;
    setSaving(true);
    try {
      // Generate a 6-digit code
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

      // Delete any existing codes for this user
      await supabaseAdmin
        .from('email_change_codes')
        .delete()
        .eq('user_id', userId);

      // Store the code
      const { error: insertErr } = await supabaseAdmin
        .from('email_change_codes')
        .insert([{ user_id: userId, new_email: newEmail, code, expires_at: expiresAt }]);

      if (insertErr) {
        alert('Failed to generate code: ' + insertErr.message);
        setSaving(false);
        setPendingEmailChange(null);
        return;
      }

      try {
        const ejsRes = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            service_id: 'service_q6dvu0a',
            template_id: 'template_19q9k4d',
            user_id: 'W_S05RXyTz9s1fDgY',
            accessToken: 'W_S05RXyTz9s1fDgY',
            template_params: {
              email: newEmail,
              passcode: code,
              to_email: newEmail,
            },
          }),
        });
        const ejsText = await ejsRes.text();
        console.log('EmailJS response:', ejsRes.status, ejsText);
      } catch (emailErr) {
        console.error('Email send failed:', emailErr);
      }

      setOtpInput(['', '', '', '', '', '']);
      setOtpError('');
      setPendingEmailChange(p => ({ ...p, sent: true, showOtp: true, _code: code }));
    } catch (err) {
      alert('Unexpected error: ' + err.message);
      setPendingEmailChange(null);
    }
    setSaving(false);
  }, [pendingEmailChange]);

  useEffect(() => {
    if (pendingEmailChange && !pendingEmailChange.sent && !pendingEmailChange.sending) {
      setPendingEmailChange(p => ({ ...p, sending: true }));
      handleConfirmEmailChange();
    }
  }, [pendingEmailChange, handleConfirmEmailChange]);

  const handleCancelEmailChange = () => {
    // Email change is discarded — profile email remains unchanged.
    // (Only the non-email fields saved earlier persist.)
    setPendingEmailChange(null);
    showToast('Email change cancelled');
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

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = !search || `${fullName(u)} ${u.email || ''}`.toLowerCase().includes(q);
    const matchRole = !roleFilter || u.role === roleFilter;
    const matchStatus = !statusFilter || u.status === statusFilter;
    const matchAdmins = !adminsOnlyFilter || ['admin', 'super_admin'].includes(u.role?.toLowerCase());
    return matchSearch && matchRole && matchStatus && matchAdmins;
  });

  useEffect(() => { setCurrentPage(1); }, [search, roleFilter, branchFilter, statusFilter, adminsOnlyFilter]);
  useEffect(() => { setLogsPage(1); }, [logSearch, logRole]);

  const sortedUsers = (() => {
    if (!sortConfig.key) return filtered;
    const { key, direction } = sortConfig;
    const arr = [...filtered];
    arr.sort((a, b) => {
      let av, bv;
      if (key === 'name') { av = fullName(a).toLowerCase(); bv = fullName(b).toLowerCase(); }
      else if (key === 'branch') {
        av = (a.branches?.name || branches.find(b => b.id === a.branch_id)?.name || '').toLowerCase();
        bv = (b.branches?.name || branches.find(b => b.id === b.branch_id)?.name || '').toLowerCase();
      } else if (key === 'created_at') {
        av = a.created_at ? new Date(a.created_at).getTime() : 0;
        bv = b.created_at ? new Date(b.created_at).getTime() : 0;
      } else {
        av = (a[key] || '').toString().toLowerCase();
        bv = (b[key] || '').toString().toLowerCase();
      }
      if (av < bv) return direction === 'asc' ? -1 : 1;
      if (av > bv) return direction === 'asc' ? 1 : -1;
      return 0;
    });
    return arr;
  })();

  const totalPages = Math.max(1, Math.ceil(sortedUsers.length / ROWS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = sortedUsers.slice((safePage - 1) * ROWS_PER_PAGE, safePage * ROWS_PER_PAGE);

  const filteredLogs = logs.filter(l => {
    const q = logSearch.toLowerCase();
    const name = l.user ? fullName(l.user).toLowerCase() : (l.user_name || "").toLowerCase();
    const role = l.user?.role || l.user_role || "";
    return (!logSearch || name.includes(q) || (l.action || '').toLowerCase().includes(q) || (l.details || '').toLowerCase().includes(q)) && (!logRole || role === logRole);
  });
  const logsTotalPages = Math.max(1, Math.ceil(filteredLogs.length / LOGS_PER_PAGE));
  const safeLogsPage = Math.min(logsPage, logsTotalPages);
  const paginatedLogs = filteredLogs.slice((safeLogsPage - 1) * LOGS_PER_PAGE, safeLogsPage * LOGS_PER_PAGE);

  // FIX 8: branchLabel — for SuperAdmin/Admin, show which branch is filtered
  // or "All Branches". For Manager, show their own branch name.
  const branchLabel = canSeeAllBranches
    ? (branchFilter
      ? (branches.find(b => String(b.id) === String(branchFilter))?.name || 'All Branches')
      : 'All Branches')
    : (branches.find(b => b.id === currentUser?.branchId)?.name || 'Your Branch');

  const counts = {
    total: users.length,
    active: users.filter(u => onlineIds.has(u.id)).length,
    admins: users.filter(u => ['admin', 'super_admin'].includes(u.role?.toLowerCase())).length,
    pending: pendingRequests.length,
  };

  const S = {
   page: { width: '100%', minHeight: '100vh', display: 'block' },
   topbar: { background: 'var(--card)', borderBottom: '1px solid var(--border)', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'fixed', top: 68, left: 0, right: 0, zIndex: 40, boxSizing: 'border-box', gap: 8, flexWrap: 'wrap' },
    cont: { padding: '12px 12px', paddingTop: 152, width: '100%', boxSizing: 'border-box' },
    btn: { width: 'auto' },
     td: { padding: '13px 14px', borderBottom: '1px solid var(--border)', color: 'var(--text)', verticalAlign: 'middle' },
    inp: { padding: '9px 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', background: 'var(--card)', color: 'var(--text)', outline: 'none' },
    inpErr: { padding: '9px 12px', border: '1.5px solid #f87171', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', background: 'var(--card)', color: 'var(--text)', outline: 'none' },
    errMsg: { fontSize: 11, color: '#dc2626', marginTop: 4 },
  };

  const TAB_LIST = [
    { key: 'users', label: 'Users' },
    { key: 'pending', label: `Pending Approval${pendingRequests.length > 0 ? ` (${pendingRequests.length})` : ''}` },
    { key: 'pwdrequests', label: `Password Requests${pwdRequests.length > 0 ? ` (${pwdRequests.length})` : ''}` },
    { key: 'roles', label: 'Roles' },
    { key: 'logs', label: 'Logs' },
  ];
  if (userLoading) return null;

  return (
    <Layout>
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 999999, display: 'flex', flexDirection: 'column', gap: 10, pointerEvents: 'none' }}>
        {toasts.slice().reverse().map(t => <LiveToast key={t.id} message={t.message} show={t.show} type={t.type} />)}
      </div>
      <div style={S.page}>
        <div style={S.topbar} className="branches-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
            <img src="/icon/admin.png" alt="" style={{ width: 22, height: 22, flexShrink: 0, filter: 'brightness(0) saturate(100%) invert(17%) sepia(82%) saturate(1200%) hue-rotate(210deg)' }} />
            <div style={{ minWidth: 0 }}>
              <h1 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Admin &amp; Security</h1>
              <p style={{ fontSize: 11, color: 'var(--muted)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {/* FIX 9: show SuperAdmin badge in header when applicable */}
                {isSuperAdmin
                  ? <span style={{ color: '#7c3aed', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>Super Admin</span>
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
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, minWidth: 0, maxWidth: 140 }}>
              <div style={{ width: 130 }}>
                <CustomSelect
                  value={branchFilter}
                  onChange={setBranchFilter}
                  placeholder="All Branches"
                  accent="#7c3aed"
                  options={branches.map(b => ({ value: b.id, label: b.name }))}
                />
              </div>
              {isSuperAdmin && (
                <span style={{ fontSize: 10, fontWeight: 700, background: '#ede9fe', color: '#6d28d9', borderRadius: 20, padding: '2px 8px', display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                  Super Admin
                </span>
              )}
            </div>
          )}
        </div>

        <div style={S.cont}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(195px,1fr))', gap: 14, marginBottom: 24 }}>
            {(
              [
                { label: 'Total Users', value: counts.total, icon: '/icon/total_user.png', color: 'blue', active: !statusFilter && !adminsOnlyFilter && tab === 'users', onClick: () => { setTab('users'); setStatusFilter(''); setAdminsOnlyFilter(false); } },
                { label: 'Active', value: counts.active, icon: '/icon/active_acc.png', color: 'green', active: statusFilter === 'Active', onClick: () => { setTab('users'); setAdminsOnlyFilter(false); setStatusFilter(f => f === 'Active' ? '' : 'Active'); } },
                { label: 'Admins', value: counts.admins, icon: '/icon/admin_2.png', color: 'purple', active: adminsOnlyFilter, onClick: () => { setTab('users'); setStatusFilter(''); setAdminsOnlyFilter(f => !f); } },
                { label: 'Pending Approval', value: counts.pending, icon: '/icon/pending.png', color: 'yellow', active: tab === 'pending', onClick: () => setTab('pending') },
              ].map((sc, i) => (
               <div
                 key={i}
                 className="fade-in usr-stat-card"
                 style={{ animationDelay: `${i * 0.1}s`, cursor: 'pointer' }}
                 role="button"
                 tabIndex={0}
                 title={`Show ${sc.label.toLowerCase()}`}
                 onClick={sc.onClick}
                 onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sc.onClick(); } }}
               >
                 <div className={`usr-stat-card-bar ${sc.color}`} />
                  <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                    <div className={`usr-stat-card-icon-wrap ${sc.color}`}>
                      <img src={sc.icon} alt={sc.label} style={{ width: 24, height: 24, filter: sc.color === 'blue' ? 'brightness(0) saturate(100%) invert(17%) sepia(82%) saturate(1200%) hue-rotate(210deg)' : sc.color === 'green' ? 'brightness(0) saturate(100%) invert(32%) sepia(80%) saturate(600%) hue-rotate(110deg) brightness(0.9)' : sc.color === 'purple' ? 'brightness(0) saturate(100%) invert(22%) sepia(96%) saturate(1600%) hue-rotate(255deg) brightness(0.85)' : 'brightness(0) saturate(100%) invert(52%) sepia(90%) saturate(600%) hue-rotate(10deg) brightness(0.9)' }} />
                    </div>
                  </div>
                  <div>
                    <p className="usr-stat-card-label">{sc.label}</p>
                    <h3 className="usr-stat-card-value">{sc.value}</h3>
                  </div>
                </div>              
              ))
            )}
          </div>

          {pendingRequests.length > 0 && (
            <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 10, padding: '12px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#fde68a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#92400e" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 15" /></svg>
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#92400e' }}>{pendingRequests.length} Account Request{pendingRequests.length > 1 ? 's' : ''} Awaiting Approval</p>
                  <p style={{ margin: 0, fontSize: 12, color: '#b45309' }}>Review and approve or reject.</p>
                </div>
              </div>
              <button className="btn" style={{ ...S.btn, background: '#d97706', color: '#fff', border: 'none', fontSize: 13, whiteSpace: 'nowrap' }} onClick={() => setTab('pending')}>Review Requests</button>
            </div>
          )}

          <div style={{ background: 'var(--card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', marginBottom: 20 }}>
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
                <div className="usr-toolbar" style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 8, padding: '8px 14px', flex: '1 1 180px', minWidth: 0 }}>
                    <img src="/icon/search.png" alt="" style={{ width: 16, height: 16, flexShrink: 0, filter: 'brightness(0) saturate(100%) invert(40%)' }} />
                    <input type="text" placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)} style={{ border: 'none', background: 'transparent', fontSize: 13, color: 'var(--text)', outline: 'none', fontFamily: 'inherit', width: '100%', minWidth: 0 }} />
                  </div>
                  <div style={{ width: 150, flex: '0 1 150px' }}>
                    <CustomSelect
                      value={roleFilter}
                      onChange={setRoleFilter}
                      placeholder="All Roles"
                      options={['Admin', 'Manager', 'Employee', 'Customer']}
                    />
                  </div>
                  {canSeeAllBranches && (
                    <button
                      className="btn btn-ghost usr-sync-btn"
                      style={{ width: 'auto', fontSize: 12, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
                      onClick={syncMissingOwnerAccounts}
                      disabled={syncingOwners}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M23 4v6h-6" /><path d="M1 20v-6h6" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
                      {syncingOwners ? 'Syncing…' : 'Sync Owner Accounts'}
                    </button>
                  )}
                  <button
                    onClick={() => setShowDeletedModal(true)}
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#fef2f2", border: "1.5px solid #fca5a5", color: "#dc2626", borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", flexShrink: 0, whiteSpace: 'nowrap' }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>
                    Recently Deleted {deletedUsers.length > 0 ? `(${deletedUsers.length})` : ""}
                  </button>
                </div>

                <div style={{ position: "fixed", bottom: 28, right: 28, zIndex: 999, display: "flex", alignItems: "center", gap: 10 }}
                  onMouseEnter={e => {
                    e.currentTarget.querySelector('.fab-tooltip').style.opacity = '1';
                    e.currentTarget.querySelector('.fab-tooltip').style.transform = 'translateX(0)';
                    e.currentTarget.querySelector('.fab-btn').style.transform = 'scale(1.1)';
                    e.currentTarget.querySelector('.fab-btn').style.boxShadow = '0 6px 28px rgba(30,58,138,0.5)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.querySelector('.fab-tooltip').style.opacity = '0';
                    e.currentTarget.querySelector('.fab-tooltip').style.transform = 'translateX(8px)';
                    e.currentTarget.querySelector('.fab-btn').style.transform = 'scale(1)';
                    e.currentTarget.querySelector('.fab-btn').style.boxShadow = '0 4px 20px rgba(30,58,138,0.4)';
                  }}>
                  <span className="fab-tooltip" style={{
                    opacity: 0, transform: 'translateX(8px)',
                    transition: 'opacity 0.2s ease, transform 0.2s ease',
                    background: 'linear-gradient(135deg, #0f172a, #1e3a8a)',
                    color: '#fff', fontSize: 12, fontWeight: 700,
                    padding: '8px 14px', borderRadius: 10,
                    whiteSpace: 'nowrap', pointerEvents: 'none',
                    boxShadow: '0 8px 24px rgba(30,58,138,0.35), 0 2px 8px rgba(0,0,0,0.2)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    display: 'flex', alignItems: 'center', gap: 7,
                    letterSpacing: '0.2px', position: 'relative',
                  }}>
                    <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: '#fff' }}>Add User</span>
                      <span style={{ fontSize: 10, fontWeight: 500, color: 'rgba(255,255,255,0.55)' }}>Create a new account</span>
                    </span>
                    <span style={{
                      position: 'absolute', right: -6, top: '50%',
                      transform: 'translateY(-50%)',
                      width: 0, height: 0,
                      borderTop: '6px solid transparent',
                      borderBottom: '6px solid transparent',
                      borderLeft: '6px solid #1e3a8a',
                    }} />
                  </span>
                  <button onClick={openAdd} className="fab-btn" style={{ width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg,#1e3a8a,#3b82f6)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 20px rgba(30,58,138,0.4)", transition: "transform 0.2s, box-shadow 0.2s", flexShrink: 0 }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </button>
                </div>

                <div style={{ fontSize: 11, fontWeight: 600, color: '#1e40af', background: '#dbeafe', border: '1px solid #bfdbfe', borderRadius: 6, padding: '4px 10px', marginBottom: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                  {canSeeAllBranches
                    ? (branchFilter
                      ? `Filtered: ${branchLabel}`
                      : `Showing all ${users.length} users across all branches`)
                    : `Your branch: ${branchLabel}`}
                </div>

                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                  {loading ? (
                    <div style={{ padding: '8px 0', minWidth: 600 }}>
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
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 780 }}>
                      <thead>
                        <tr>
                          {[
                            { label: 'User', key: 'name' },
                            { label: 'Email', key: 'email' },
                            { label: 'Role', key: 'role' },
                            { label: 'Sex', key: 'sex' },
                            ...(canSeeAllBranches ? [{ label: 'Branch', key: 'branch' }] : []),
                            { label: 'Status', key: 'status' },
                            { label: 'Joined', key: 'created_at' },
                            { label: 'Actions', key: null },
                          ].map(({ label, key }) => (
                            <th
                              key={label}
                              className="usr-th"
                              onClick={() => key && handleSort(key)}
                              style={{ cursor: key ? 'pointer' : 'default', userSelect: 'none' }}
                            >
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                {label}
                                {key && (
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"
                                    style={{
                                      opacity: sortConfig.key === key ? 1 : 0.3,
                                      transform: sortConfig.key === key && sortConfig.direction === 'desc' ? 'rotate(180deg)' : 'none',
                                      transition: 'transform 0.15s',
                                    }}>
                                    <polyline points="18 15 12 9 6 15" />
                                  </svg>
                                )}
                              </span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.length === 0 ? (
                          <tr>
                            <td colSpan={canSeeAllBranches ? 8 : 7} style={{ textAlign: 'center', padding: '48px 0', color: 'var(--muted)' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ color: '#cbd5e1' }}><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
                                <span style={{ fontSize: 13, fontWeight: 600 }}>No users found</span>
                                <span style={{ fontSize: 12 }}>Try adjusting your search or filters</span>
                              </div>
                            </td>
                          </tr>
                        ) : paginated.map((u, idx) => (
                          <tr key={u.id} className="fade-in" style={{ background: idx % 2 === 0 ? 'transparent' : 'var(--bg)', transition: 'background 0.15s', animationDelay: `${paginated.indexOf(u) * 0.06}s` }}
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
                                <span style={{
                                  fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 3,
                                  background: u.sex === 'Male' ? '#dbeafe' : '#fce7f3',
                                  color: u.sex === 'Male' ? '#1d4ed8' : '#be185d'
                                }}>
                                  {u.sex === 'Male'
                                    ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="10" cy="14" r="6" /><path d="M19 5l-5.5 5.5M19 5h-5M19 5v5" /></svg>
                                    : <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="10" r="6" /><path d="M12 16v6M9 19h6" /></svg>}
                                  {u.sex}
                                </span>
                              ) : <span style={{ fontSize: 12, color: 'var(--muted)' }}>—</span>}
                            </td>
                            {canSeeAllBranches && (
                              <td style={{ ...S.td, overflow: 'hidden' }}>
                                <span className="usr-td-branch-tag">
                                  {u.branches?.name || branches.find(b => b.id === u.branch_id)?.name || '—'}
                                </span>
                              </td>
                            )}
                            <td style={S.td}>
                             {u.status === 'Inactive' ? (
                                <span className="usr-pill deactivated"><span className="usr-pill-dot" />Deactivated</span>
                              ) : onlineIds.has(u.id) ? (
                                <span className="usr-pill active"><span className="usr-pill-dot" />Active</span>
                              ) : (
                                <span className="usr-pill inactive"><span className="usr-pill-dot" />Inactive</span>
                              )}                            </td>
                            <td style={{ ...S.td, fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{fmtDate(u.created_at)}</td>
                            <td style={S.td}>
                              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                 <button title="View" onClick={() => setViewUser(u)} className="usr-icon-btn view">
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                </button>
                                <button title="Edit" onClick={() => openEdit(u)} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 6, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                </button>
                                {u.status === 'Active' && (
                                     <button title="Deactivate" onClick={() => handleDeactivate(u)} className="usr-icon-btn warn">                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg>
                                  </button>
                                )}
                                {isSuperAdmin && (
                                  <button title="Reset Password" onClick={() => handleResetPassword(u)} className="usr-icon-btn purple">
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 9.9-1" /></svg>
                                  </button>
                                )}
                                <button title="Delete" onClick={() => handleDelete(u)} className="usr-icon-btn danger">
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>
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
                  <p style={{ fontSize: 11, color: 'var(--muted)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {canSeeAllBranches ? 'Requests from all branches awaiting approval.' : 'Accounts awaiting your approval.'}
                  </p>
                </div>
                {pendingRequests.length === 0 ? (
                  <div style={{ padding: '40px 0', textAlign: 'center' }}>
                    <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#f0fdf4', border: '1.5px solid #86efac', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                    </div>
                    <p style={{ color: 'var(--muted)', fontSize: 14, fontWeight: 600 }}>No pending requests — all clear!</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {pendingRequests.map(req => (
                      <div key={req.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', display: 'flex', alignItems: 'stretch' }}>
                        <div style={{ width: 4, flexShrink: 0, background: '#f59e0b' }} />
                        <div style={{ flex: 1, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <Avatar firstName={req.first_name} lastName={req.last_name} role={req.role || 'Employee'} size={40} />
                            <div>
                              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{[req.first_name, req.last_name].filter(Boolean).join(' ') || '—'}</p>
                              <p style={{ margin: 0, fontSize: 12, color: '#64748b', marginTop: 1 }}>{req.email}</p>
                              <div style={{ display: 'flex', gap: 5, marginTop: 6, flexWrap: 'wrap' }}>
                                <span className={`badge ${ROLE_BADGE[req.role] || 'badge-gray'}`} style={{ fontSize: 10 }}>{req.role || 'Employee'}</span>
                                {req.sex && (
                                  <span style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 3,
                                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                                    background: req.sex === 'Male' ? '#dbeafe' : '#fce7f3',
                                    color: req.sex === 'Male' ? '#1d4ed8' : '#be185d',
                                  }}>
                                    {req.sex === 'Male' ? '♂' : '♀'} {req.sex}
                                  </span>
                                )}
                                <span style={{ fontSize: 10, background: '#fef9c3', color: '#854d0e', borderRadius: 99, padding: '2px 8px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                                  Pending
                                </span>
                                {req.branch_id && branches.find(b => b.id === req.branch_id) && (
                                  <span style={{ fontSize: 10, background: '#dbeafe', color: '#1e40af', borderRadius: 99, padding: '2px 8px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
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
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                              Approve
                            </button>
                            <button onClick={() => handleRejectPending(req)} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
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

            {/* ══ PASSWORD REQUESTS TAB ══ */}
            {tab === 'pwdrequests' && (
              <div style={{ padding: 24 }}>
                <div style={{ marginBottom: 20 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 4px' }}>Password Change Requests</h3>
                  <p style={{ fontSize: 11, color: 'var(--muted)', margin: 0 }}>
                    Employees and customers submit a new password here; it only takes effect once you approve it.
                  </p>
                </div>
                {pwdRequests.length === 0 ? (
                  <div style={{ padding: '40px 0', textAlign: 'center' }}>
                    <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#f0fdf4', border: '1.5px solid #86efac', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                    </div>
                    <p style={{ color: 'var(--muted)', fontSize: 14, fontWeight: 600 }}>No pending password requests.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {pwdRequests.map(req => (
                      <div key={req.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', display: 'flex', alignItems: 'stretch' }}>
                        <div style={{ width: 4, flexShrink: 0, background: '#2563eb' }} />
                        <div style={{ flex: 1, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                          <div>
                            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{req.email}</p>
                            <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94a3b8' }}>Requested {fmtDate(req.created_at)}</p>
                          </div>
                          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                            <button onClick={() => approvePwdRequest(req)} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: '#16a34a', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                              Approve
                            </button>
                            <button onClick={() => rejectPwdRequest(req)} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
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

            {/* ══ ROLES TAB ══ */}            {tab === 'roles' && (
              <div style={{ padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 4px' }}>Role Management</h3>
                    <p style={{ fontSize: 11, color: 'var(--muted)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>System roles are built-in. Custom roles can be created and deleted.</p>
                  </div>
                  <button className="btn btn-primary" style={{ ...S.btn, display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => { setEditRoleTarget(null); setRoleForm(BLANK_ROLE_FORM); setRoleFormErrors({}); setShowRoleModal(true); }}>
                    <span style={{ fontSize: 18 }}>+</span> New Role
                  </button>
                </div>
                {rolesLoading ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
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
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
                    {allRoles.map(r => {
                      const permLabels = (r.perms || []).map(k => ALL_PERMISSIONS.find(p => p.key === k)?.label || k);
                      const dotColor = r.color || '#2563eb';
                      return (
                        <div key={r.id} style={{ background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 22, boxShadow: 'var(--shadow)', position: 'relative', overflow: 'hidden' }}>
                          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: dotColor, borderRadius: '12px 12px 0 0' }} />
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, marginTop: 8 }}>
                            <div style={{ width: 42, height: 42, borderRadius: 10, background: `${dotColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {r.icon ? <img src={r.icon} alt={r.role} style={{ width: 24, height: 24, filter: 'brightness(0) saturate(100%) invert(17%) sepia(82%) saturate(1200%) hue-rotate(210deg)' }} /> : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></svg>}
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
                  <p style={{ fontSize: 11, color: 'var(--muted)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Track who accessed the system and what actions were performed.</p>
                </div>
                <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 8, padding: '8px 14px', flex: 1 }}>
                    <img src="/icon/search.png" alt="" style={{ width: 16, height: 16, filter: 'brightness(0) saturate(100%) invert(40%)' }} />
                    <input type="text" placeholder="Search by name, action or IP…" value={logSearch} onChange={e => setLogSearch(e.target.value)} style={{ border: 'none', background: 'transparent', fontSize: 13, color: 'var(--text)', outline: 'none', fontFamily: 'inherit', width: '100%' }} />
                  </div>
                  <div style={{ width: 150 }}>
                    <CustomSelect
                      value={logRole}
                      onChange={setLogRole}
                      placeholder="All Roles"
                      options={['Admin', 'Manager', 'Employee', 'Customer']}
                    />
                  </div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: 'var(--bg)' }}>
                         {['User', 'Role', 'Action', 'Time', 'Status'].map(h => <th key={h} className="usr-th">{h}</th>)}                      </tr>
                    </thead>
                    <tbody>
                      {filteredLogs.length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ textAlign: 'center', padding: '48px 0', color: 'var(--muted)' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ color: '#cbd5e1' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
                              <span style={{ fontSize: 13, fontWeight: 600 }}>No logs found</span>
                            </div>
                          </td>
                        </tr>
                      ) : paginatedLogs.map((l, idx) => (
                        <tr key={l.id} style={{ background: idx % 2 === 0 ? 'transparent' : 'var(--bg)' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#f0f7ff'}
                          onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? 'transparent' : 'var(--bg)'}>
                          <td style={S.td}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                              <Avatar firstName={l.user_name?.split(' ')[0]} lastName={l.user_name?.split(' ')[1]} role={l.user_role} size={30} />
                              <span style={{ fontWeight: 600 }}>{l.user_name || '—'}</span>
                            </div>
                          </td>
                          <td style={S.td}><span className={`badge ${ROLE_BADGE[l.user_role] || 'badge-gray'}`} style={{ fontSize: 10 }}>{l.user_role || '—'}</span></td>
                          <td style={{ ...S.td, color: '#334155' }}>
                            <div style={{ fontWeight: 600 }}>{l.action}</div>
                            {l.details && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{l.details}</div>}
                          </td>
                          <td style={{ ...S.td, fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{l.created_at ? fmtTime(new Date(l.created_at)) : '—'}</td>
                          <td style={S.td}>
                            <span style={{
                              fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 4,
                              background: l.status === 'Success' ? '#dcfce7' : '#fef2f2',
                              color: l.status === 'Success' ? '#15803d' : '#dc2626'
                            }}>
                              {l.status === 'Success'
                                ? <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                                : <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>}
                              {l.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {logsTotalPages > 1 && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, padding: "14px 18px", borderTop: "1px solid var(--border)", marginTop: 8, flexWrap: "wrap" }}>
                    <button onClick={() => setLogsPage(p => Math.max(1, p - 1))} disabled={safeLogsPage === 1} style={{ padding: "6px 14px", borderRadius: 20, border: "1.5px solid var(--border)", background: "transparent", fontSize: 13, fontWeight: 600, color: safeLogsPage === 1 ? "var(--muted)" : "var(--text)", cursor: safeLogsPage === 1 ? "default" : "pointer", fontFamily: "inherit" }}>prev</button>
                    {Array.from({ length: logsTotalPages }, (_, i) => i + 1)
                      .filter(pg => pg === 1 || pg === logsTotalPages || (pg >= safeLogsPage - 1 && pg <= safeLogsPage + 1))
                      .reduce((acc, pg, idx, arr) => {
                        if (idx > 0 && pg - arr[idx - 1] > 1) acc.push('...');
                        acc.push(pg);
                        return acc;
                      }, [])
                      .map((pg, idx) => pg === '...'
                        ? <span key={`ellipsis-${idx}`} style={{ padding: "0 4px", color: "var(--muted)", fontSize: 13 }}>…</span>
                        : <button key={pg} onClick={() => setLogsPage(pg)} style={{ width: 34, height: 34, borderRadius: 20, border: "1.5px solid", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s", background: safeLogsPage === pg ? "var(--royal)" : "transparent", color: safeLogsPage === pg ? "#fff" : "var(--text)", borderColor: safeLogsPage === pg ? "var(--royal)" : "var(--border)" }}>{pg}</button>
                      )}
                    <button onClick={() => setLogsPage(p => Math.min(logsTotalPages, p + 1))} disabled={safeLogsPage === logsTotalPages} style={{ padding: "6px 14px", borderRadius: 20, border: "1.5px solid var(--border)", background: "transparent", fontSize: 13, fontWeight: 600, color: safeLogsPage === logsTotalPages ? "var(--muted)" : "var(--text)", cursor: safeLogsPage === logsTotalPages ? "default" : "pointer", fontFamily: "inherit" }}>next</button>
                  </div>
                )}
                <div style={{ marginTop: 6, fontSize: 12, color: 'var(--muted)', display: 'flex', justifyContent: 'space-between', padding: '0 4px' }}>
                  <span>Showing {filteredLogs.length} of {logs.length} entries</span>
                  <button className="btn btn-ghost btn-sm" style={S.btn} onClick={fetchLogs}>↻ Refresh</button>
                </div>
              </div>
            )}

            </div>
        </div>
      </div>

      {/* ══ ADD USER MODAL ══ */}
      {showAddModal && (
         <div className="usr-modal-overlay">
          <div className="usr-modal-box">

            {/* Clipboard bar */}
            <div className="usr-clipboard-bar">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.5px' }}>USER ACCOUNT FORM</span>
              </div>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'rgba(255,255,255,0.75)', lineHeight: 1, padding: '2px 6px' }}>✕</button>
            </div>

            {/* Record header */}
            <div style={{ background: 'var(--bg)', borderBottom: '2px solid var(--border)', padding: '14px 24px 12px', textAlign: 'center', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 4 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></svg>
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
                      onChange={e => { setAddForm(f => ({ ...f, first_name: sanitizeName(e.target.value) })); setAddErrors(er => ({ ...er, first_name: '' })); }}
                      className={`usr-inline-inp${addErrors.first_name ? ' err' : ''}`} />
                    {addErrors.first_name && <div style={{ fontSize: 10, color: '#dc2626', marginTop: 3 }}>{addErrors.first_name}</div>}
                  </div>
                  <div style={{ padding: '10px 16px' }}>
                    <div className="usr-field-label">Last Name <span style={{ color: '#ef4444' }}>*</span></div>
                    <input type="text" placeholder="e.g. Doe" value={addForm.last_name}
                      onChange={e => { setAddForm(f => ({ ...f, last_name: sanitizeName(e.target.value) })); setAddErrors(er => ({ ...er, last_name: '' })); }}
                      className={`usr-inline-inp${addErrors.last_name ? ' err' : ''}`} />
                    {addErrors.last_name && <div style={{ fontSize: 10, color: '#dc2626', marginTop: 3 }}>{addErrors.last_name}</div>}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #e2e8f0' }}>
                  <div style={{ padding: '10px 16px', borderRight: '1px solid #e2e8f0' }}>
                    <div className="usr-field-label">Sex</div>
                    <CustomSelect
                      value={addForm.sex}
                      onChange={val => setAddForm(f => ({ ...f, sex: val }))}
                      placeholder="— Select —"
                      options={['Male', 'Female']}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 14 }}>
                  <label>Phone Number</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={11}
                    value={editForm.phone_number}
                    onChange={e => setEditForm({ ...editForm, phone_number: e.target.value.replace(/\D/g, '').slice(0, 11) })}
                    placeholder="e.g. 09170000000"
                  />
                </div>
                  <div style={{ padding: '10px 16px' }}>
                    <div className="usr-field-label">Status</div>
                    <CustomSelect
                      value={addForm.status}
                      onChange={val => setAddForm(f => ({ ...f, status: val }))}
                      placeholder="— Select Status —"
                      options={['Active', 'Inactive']}
                    />
                  </div>
                </div>
              </div>

              {/* ── Section: Account Credentials ── */}
              <div style={{ borderBottom: '1.5px solid #e2e8f0' }}>
                <div className="usr-section-label">Account Credentials</div>
                <div style={{ padding: '10px 16px', borderBottom: '1px solid #e2e8f0' }}>
                  <div className="usr-field-label">Email Address <span style={{ color: '#ef4444' }}>*</span></div>
                  <input type="email" placeholder="email@example.com" value={addForm.email}
                    onChange={e => { setAddForm(f => ({ ...f, email: e.target.value })); setAddErrors(er => ({ ...er, email: '' })); }}
                    className={`usr-inline-inp${addErrors.email ? ' err' : ''}`} />
                  {addErrors.email && <div style={{ fontSize: 10, color: '#dc2626', marginTop: 3 }}>{addErrors.email}</div>}
                  {(addForm.role === 'Employee' || addForm.role === 'Customer' || addForm.role === 'Admin') && (
                    <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input type="checkbox" id="addPersonalEmail" checked={!!addForm.usePersonalEmail}
                        onChange={e => setAddForm(f => ({ ...f, usePersonalEmail: e.target.checked }))}
                        style={{ width: 14, height: 14, cursor: 'pointer' }} />
                      <label htmlFor="addPersonalEmail" style={{ fontSize: 11, color: 'var(--muted)', cursor: 'pointer' }}>
                        Use personal email (a 6-digit verification code will be sent to this address)
                      </label>
                    </div>
                  )}
                </div>
                <div style={{ padding: '10px 16px', borderBottom: '1px solid #e2e8f0' }}>
                  <div className="usr-field-label">Password <span style={{ color: '#ef4444' }}>*</span></div>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input type={showPassword ? 'text' : 'password'} value={addForm.password}
                      onChange={e => { setAddForm(f => ({ ...f, password: e.target.value })); setAddErrors(er => ({ ...er, password: '' })); }}
                      className={`usr-inline-inp${addErrors.password ? ' err' : ''}`}
                      style={{ paddingRight: 64, fontFamily: showPassword ? 'monospace' : 'inherit' }} />
                    <button type="button" onClick={() => setShowPassword(v => !v)}
                      style={{ position: 'absolute', right: 28, background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0, display: 'flex', alignItems: 'center' }}>
                      {showPassword
                        ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                        : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>}
                    </button>
                    <button type="button" onClick={() => setAddForm(f => ({ ...f, password: generatePassword() }))}
                      style={{ position: 'absolute', right: 0, background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb', padding: 0, display: 'flex', alignItems: 'center' }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M23 4v6h-6" /><path d="M1 20v-6h6" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
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
                    <CustomSelect
                      value={addForm.role}
                      onChange={val => { setAddForm(f => ({ ...f, role: val })); setAddErrors(er => ({ ...er, role: '' })); }}
                      placeholder="— Select Role —"
                      options={[...(isSuperAdmin ? ['Admin'] : []), 'Manager', 'Employee', 'Customer']}
                    />
                    {addErrors.role && <div style={{ fontSize: 10, color: '#dc2626', marginTop: 3 }}>{addErrors.role}</div>}
                  </div>
                  <div style={{ padding: '10px 16px' }}>
                    <div className="usr-field-label">Branch <span style={{ color: '#ef4444' }}>*</span></div>
                    {canSeeAllBranches ? (
                      <>
                        <CustomSelect
                          value={addForm.branch_id}
                          onChange={val => setAddForm(f => ({ ...f, branch_id: val }))}
                          placeholder="— Select branch —"
                          options={branches.map(b => ({ value: b.id, label: b.name }))}
                        />
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
            <div className="usr-modal-actions">
              <button className="btn btn-ghost usr-w-auto" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ ...S.btn, background: '#0f172a', borderColor: '#0f172a', display: 'inline-flex', alignItems: 'center', gap: 6, opacity: (!isAddUserFormValid() || saving) ? 0.5 : 1, cursor: (!isAddUserFormValid() || saving) ? 'not-allowed' : 'pointer' }}
                onClick={handleAddUser} disabled={saving || !isAddUserFormValid()}>
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
          <div style={{ position: 'fixed', top: 0, right: 0, height: '100vh', width: 380, background: 'var(--card)', zIndex: 1041, boxShadow: '-4px 0 24px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--card)' }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>User Details</span>
              <button className="btn btn-ghost btn-icon" style={S.btn} onClick={() => setViewUser(null)}>✕</button>
            </div>
            <div style={{ padding: '28px 24px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', color: 'var(--text)' }}>
              <Avatar firstName={viewUser.first_name} lastName={viewUser.last_name} role={viewUser.role} size={72} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 800, fontSize: 18 }}>{fullName(viewUser)}</div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>{viewUser.email || '—'}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <span className={`badge ${ROLE_BADGE[viewUser.role] || 'badge-gray'}`}>{viewUser.role || '—'}</span>
                <span className={`badge ${viewUser.status === 'Inactive' ? 'badge-red' : onlineIds.has(viewUser.id) ? 'badge-green' : 'badge-gray'}`}>
                  {viewUser.status === 'Inactive' ? 'Deactivated' : onlineIds.has(viewUser.id) ? 'Active' : 'Inactive'}
                </span>
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
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                Edit Role &amp; Status
              </button>
              {viewUser.status === 'Active' && (
                <button className="btn btn-sm" style={{ ...S.btn, width: '100%', color: '#d97706', background: '#fffbeb', border: '1px solid #fcd34d', padding: '9px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} onClick={() => handleDeactivate(viewUser)}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg>
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
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 9.9-1" /></svg>
                  Reset Password
                </button>
              )}
              <button className="btn btn-sm" style={{ ...S.btn, width: '100%', color: '#dc2626', background: '#fef2f2', border: '1px solid #fca5a5', padding: '9px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} onClick={() => handleDelete(viewUser)}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>
                Delete Permanently
              </button>
            </div>
          </div>
        </>
      )}

      {/* ══ EDIT USER MODAL — add email field for SuperAdmin ══ */}
      {showEditModal && editUser && (
          <div className="usr-modal-overlay">
          <div className="usr-modal-box max-w-420">            
          <div className="modal-header">
              <h3>Edit User</h3>
              <button className="btn btn-ghost btn-icon" style={S.btn} onClick={attemptCloseEditModal}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div className="form-group" style={{ margin: 0 }}><label>First Name</label><input type="text" value={editForm.first_name} onChange={e => setEditForm({ ...editForm, first_name: e.target.value })} /></div>
                <div className="form-group" style={{ margin: 0 }}><label>Last Name</label><input type="text" value={editForm.last_name} onChange={e => setEditForm({ ...editForm, last_name: e.target.value })} /></div>
              </div>
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label>Sex</label>
                <CustomSelect
                  value={editForm.sex}
                  onChange={val => setEditForm({ ...editForm, sex: val })}
                  placeholder="— Select —"
                  options={['Male', 'Female']}
                />
              </div>

              {/* SuperAdmin only: edit email */}
              {isSuperAdmin && (
                <div className="form-group" style={{ marginBottom: 14 }}>
                  <label>Email Address <span style={{ fontSize: 11, color: '#7c3aed', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3 }}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>SuperAdmin</span></label>
                  <input
                    type="email"
                    value={editForm.email ?? editUser.email}
                    onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                    style={S.inp}
                  />
                  {['Employee', 'Customer', 'Admin', 'SuperAdmin', 'Super Admin', 'super_admin'].includes(editForm.role) && (
                    <div style={{ marginTop: 8 }}>
                      <button
                        type="button"
                        onClick={() => { setPersonalEmailInput(''); setPersonalEmailError(''); setShowPersonalEmailPrompt(true); }}
                        style={{
                          fontSize: 12, fontWeight: 600, color: '#2563eb', background: '#eff6ff',
                          border: '1px solid #bfdbfe', borderRadius: 8, padding: '6px 12px',
                          cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
                        }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M2 7l8.5 6a2 2 0 0 0 3 0L22 7" /></svg>
                        Use Personal Email
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="form-group" style={{ marginBottom: 14 }}>
                <label>Role</label>
                <CustomSelect
                  value={editForm.role}
                  onChange={val => setEditForm({ ...editForm, role: val })}
                  placeholder="— Select Role —"
                  options={[...(isSuperAdmin ? ['Admin'] : []), 'Manager', 'Employee', 'Customer']}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label>Status</label>
                <CustomSelect
                  value={editForm.status}
                  onChange={val => setEditForm({ ...editForm, status: val })}
                  placeholder="— Select Status —"
                  options={['Active', 'Inactive']}
                />
              </div>
              {canSeeAllBranches && (
                <div className="form-group">
                  <label>Branch</label>
                  <CustomSelect
                    value={editForm.branch_id}
                    onChange={val => setEditForm({ ...editForm, branch_id: val })}
                    placeholder="— No branch —"
                    options={branches.map(b => ({ value: b.id, label: b.name }))}
                  />
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" style={S.btn} onClick={attemptCloseEditModal}>Cancel</button>
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

      {/* ══ PERSONAL EMAIL INPUT PROMPT ══ */}
      {showPersonalEmailPrompt && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001, padding: 16 }}>
          <div style={{ background: 'var(--card)', borderRadius: 20, width: '100%', maxWidth: 400, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', padding: '28px 24px', textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--bg)', border: '1.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M2 7l8.5 6a2 2 0 0 0 3 0L22 7" /></svg>
            </div>
            <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>Enter Personal Email</h3>
            <p style={{ margin: '0 0 16px', fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
              We'll send a 6-digit code to confirm this address.
            </p>
            <input
              type="email"
              autoFocus
              placeholder="you@example.com"
              value={personalEmailInput}
              onChange={e => { setPersonalEmailInput(e.target.value); setPersonalEmailError(''); }}
              style={{
                width: '100%', boxSizing: 'border-box', padding: '10px 14px', fontSize: 13,
                border: `1.5px solid ${personalEmailError ? '#f87171' : 'var(--border)'}`, borderRadius: 8,
                background: 'var(--bg)', color: 'var(--text)', outline: 'none', fontFamily: 'inherit', marginBottom: 4,
              }}
            />
            {personalEmailError && <div style={{ fontSize: 11, color: '#dc2626', marginBottom: 8, textAlign: 'left' }}>{personalEmailError}</div>}
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button className="btn btn-ghost" style={{ width: 'auto', flex: 1 }} onClick={() => setShowPersonalEmailPrompt(false)}>Cancel</button>
              <button
                className="btn btn-primary"
                style={{ width: 'auto', flex: 1 }}
                onClick={() => {
                  const val = personalEmailInput.trim().toLowerCase();
                  if (!val) { setPersonalEmailError('Email is required'); return; }
                  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) { setPersonalEmailError('Invalid email address'); return; }
                  if (val === (editUser?.email || '').toLowerCase()) { setPersonalEmailError('This is already the current email'); return; }
                  setShowPersonalEmailPrompt(false);
                  setPendingEmailChange({
                    userId: editUser.id,
                    newEmail: val,
                    fullName: `${editForm.first_name} ${editForm.last_name}`,
                    sent: false,
                  });
                }}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ UPDATING EMAIL ══ */}
      {pendingEmailChange && !pendingEmailChange.sent && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: 16 }}>
          <div style={{ background: 'var(--card)', borderRadius: 20, width: '100%', maxWidth: 420, padding: '32px 28px', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
              <div style={{ width: 32, height: 32, border: '3px solid #bfdbfe', borderTop: '3px solid #2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>Sending verification code…</h3>
            <p style={{ margin: '0 0 4px', fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
              Sending to<br />
              <strong style={{ color: 'var(--text)' }}>{pendingEmailChange.newEmail}</strong>
            </p>
          </div>
        </div>
      )}

      {/* ══ OTP ENTRY MODAL ══ */}
      {pendingEmailChange && pendingEmailChange.sent && pendingEmailChange.showOtp && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: 16 }}>
          <div style={{ background: 'var(--card)', borderRadius: 20, width: '100%', maxWidth: 420, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', padding: '32px 28px', textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--bg)', border: '1.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>Enter Verification Code</h3>
            <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
              Verifying email change to<br /><strong style={{ color: 'var(--text)' }}>{pendingEmailChange.newEmail}</strong>
            </p>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
              A 6-digit code has been sent to your email. Please check your inbox.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 6 }}>
              {otpInput.map((digit, i) => (
                <input
                  key={i}
                  id={`otp-digit-${i}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    setOtpInput(prev => {
                      const next = [...prev];
                      next[i] = val;
                      return next;
                    });
                    setOtpError('');
                    if (val && i < 6) {
                      const nextInput = document.getElementById(`otp-digit-${i + 1}`);
                      if (nextInput) nextInput.focus();
                    }
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Backspace' && !digit && i > 0) {
                      const prevInput = document.getElementById(`otp-digit-${i - 1}`);
                      if (prevInput) prevInput.focus();
                    }
                  }}
                  style={{
                    width: 44, height: 52, textAlign: 'center', fontSize: 20, fontWeight: 700,
                    border: `1.5px solid ${otpError ? '#f87171' : (digit ? '#2563eb' : 'var(--border)')}`,
                    borderRadius: 10, background: 'var(--bg)', color: 'var(--text)', outline: 'none', fontFamily: 'inherit',
                  }}
                />
              ))}
            </div>
            {otpError && <div style={{ fontSize: 11, color: '#dc2626', marginBottom: 10 }}>{otpError}</div>}
            <button
              className="btn btn-primary"
              style={{ width: '100%', marginTop: 12, opacity: otpInput.some(d => !d) ? 0.6 : 1 }}
              disabled={otpInput.some(d => !d) || otpVerifying}
              onClick={async () => {
                setOtpVerifying(true);
                setOtpError('');
                const code = otpInput.join('');

                // Verify against our own stored code
                const { data: codeRow, error: fetchErr } = await supabaseAdmin
                  .from('email_change_codes')
                  .select('*')
                  .eq('user_id', pendingEmailChange.userId)
                  .eq('new_email', pendingEmailChange.newEmail)
                  .single();

                if (fetchErr || !codeRow || codeRow.code !== code || new Date(codeRow.expires_at) < new Date()) {
                  setOtpError('Invalid or expired code. Please try again.');
                  setOtpInput(['', '', '', '', '', '']);
                  setOtpVerifying(false);
                  const firstInput = document.getElementById('otp-digit-0');
                  if (firstInput) firstInput.focus();
                  return;
                }

                // Clean up used code
                await supabaseAdmin.from('email_change_codes').delete().eq('user_id', pendingEmailChange.userId);

                // OTP verified — NOW update the existing user's email + profile
                const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(
                  pendingEmailChange.userId,
                  { email: pendingEmailChange.newEmail, email_confirm: true }
                );
                if (authErr) {
                  setOtpError('Email update failed: ' + authErr.message);
                  setOtpVerifying(false);
                  return;
                }

                await supabaseAdmin
                  .from('profiles')
                  .update({ email: pendingEmailChange.newEmail })
                  .eq('id', pendingEmailChange.userId);

                await supabase.from('activity_logs').insert([{
                  user_id: currentUser.id,
                  user_name: currentUser.fullName || currentUser.email,
                  user_role: currentUser.role,
                  action: 'Updated user email (OTP verified)',
                  details: `Email changed to ${pendingEmailChange.newEmail}`,
                }]);

                showToast('Email verified and updated successfully!');
                setOtpVerifying(false);
                setPendingEmailChange(null);
                fetchUsers();

                // If the updated user is the currently logged-in user,
                // refresh their session so the topbar/sidebar shows the new email
                if (pendingEmailChange.userId === currentUser?.id) {
                  const { data: refreshed } = await supabase.auth.refreshSession();
                  if (refreshed?.session) {
                    localStorage.setItem('hospital_jwt', refreshed.session.access_token);
                    // Force a full page reload so layout re-reads the new email from JWT
                    setTimeout(() => window.location.reload(), 800);
                  }
                }
              }}
            >
              {otpVerifying ? 'Verifying…' : 'Verify'}
            </button>
            <p style={{ margin: '14px 0 0', fontSize: 12, color: 'var(--muted)' }}>
              Didn't receive a code?{' '}
              <button
                type="button"
                onClick={() => {
                  setPendingEmailChange(p => ({ ...p, sent: false, sending: false, showOtp: false }));
                  showToast('Resending code…');
                }}
                style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 700, cursor: 'pointer', fontSize: 12, padding: 0 }}
              >
                Resend
              </button>
            </p>
          </div>
        </div>
      )}

      {/* ══ RECENTLY DELETED MODAL ══ */}
      {showDeletedModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.52)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16 }}>
          <div style={{ background: 'var(--card)', borderRadius: 14, width: '100%', maxWidth: 620, maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.28)' }}>
            <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Recently Deleted Users</h3>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Users are permanently removed 30 days after deletion.</p>
              </div>
              <button onClick={() => setShowDeletedModal(false)} style={{ background: '#f3f4f6', border: 'none', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', color: '#64748b', fontSize: 16 }}>✕</button>
            </div>
            <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
              {deletedUsers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)' }}>
                  <p style={{ fontSize: 13, margin: 0 }}>No recently deleted users.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {deletedUsers.map(u => {
                    const daysLeft = Math.max(0, 30 - Math.floor((Date.now() - new Date(u.deleted_at).getTime()) / (24 * 60 * 60 * 1000)));
                    return (
                      <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Avatar firstName={u.first_name} lastName={u.last_name} role={u.role} />
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{fullName(u)}</div>
                            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{u.email}{u.role ? ` · ${u.role}` : ''}</div>
                            <div style={{ fontSize: 11, color: daysLeft <= 5 ? '#dc2626' : '#92400e', fontWeight: 600, marginTop: 3 }}>
                              {daysLeft > 0 ? `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left before permanent deletion` : 'Deleting soon'}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => restoreUser(u)} style={{ background: '#f0fdf4', border: '1.5px solid #86efac', color: '#166534', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Restore</button>
                          <button onClick={() => permanentlyDeleteUser(u)} style={{ background: '#fef2f2', border: '1.5px solid #fca5a5', color: '#dc2626', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Delete Now</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" style={{ width: 'auto' }} onClick={() => setShowDeletedModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal show={!!confirm} title={confirm?.title} message={confirm?.message} type={confirm?.type} confirmLabel={confirm?.confirmLabel} onConfirm={confirm?.onConfirm} onCancel={() => setConfirm(null)} />
    </Layout>
  );
};

export default AdminSecurity;