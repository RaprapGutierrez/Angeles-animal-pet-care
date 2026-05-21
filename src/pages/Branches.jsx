// src/pages/Branches.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Layout from '../components/layout';
import { supabase } from '../js/supabase';

if (typeof document !== 'undefined' && !document.getElementById('leaflet-css')) {
  const css = document.createElement('link');
  css.id = 'leaflet-css'; css.rel = 'stylesheet';
  css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  document.head.appendChild(css);
}

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
@keyframes slideDown {
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
}
.view-panel {
  animation: slideDown 0.2s ease;
}
`;
const Skel = ({ w = '100%', h = 16 }) => (
  <span className="skel" style={{ width: w, height: h, borderRadius: 8, display: 'block' }} />
);

const makeDivIcon = (L) => L.divIcon({
  html: `<div style="width:36px;height:36px;border-radius:50% 50% 50% 0;background:linear-gradient(135deg,#1e3a8a,#3b5fc0);transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 3px 10px rgba(30,58,138,0.4)"></div>`,
  iconSize: [36, 36], iconAnchor: [18, 36], popupAnchor: [0, -38], className: ''
});

// ── Module definitions ──
const MODULE_ICONS = {
  dashboard:   <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
  appointment: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  walkin:      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="7" r="3"/><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/></svg>,
  inventory:   <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 16V8a2 2 0 0 0-1-1.73L13 2.27a2 2 0 0 0-2 0L4 6.27A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>,
  billing:     <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>,
  reports:     <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  staff:       <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  branches:    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  history:     <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/></svg>,
  profile:     <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>,
};

const ALL_MODULES = {
  admin: [
    { key: 'dashboard',    label: 'Dashboard'   },
    { key: 'appointment',  label: 'Appointment' },
    { key: 'walkin',       label: 'Walk-in'     },
    { key: 'inventory',    label: 'Inventory'   },
    { key: 'billing',      label: 'Billing'     },
    { key: 'reports',      label: 'Reports'     },
    { key: 'staff',        label: 'Staff'       },
    { key: 'branches',     label: 'Branches'    },
  ],
  manager: [
    { key: 'dashboard',    label: 'Dashboard'   },
    { key: 'appointment',  label: 'Appointment' },
    { key: 'walkin',       label: 'Walk-in'     },
    { key: 'inventory',    label: 'Inventory'   },
    { key: 'billing',      label: 'Billing'     },
    { key: 'reports',      label: 'Reports'     },
    { key: 'staff',        label: 'Staff'       },
  ],
  employee: [
    { key: 'dashboard',    label: 'Dashboard'   },
    { key: 'appointment',  label: 'Appointment' },
    { key: 'walkin',       label: 'Walk-in'     },
    { key: 'billing',      label: 'Billing'     },
    { key: 'inventory',    label: 'Inventory'   },
  ],
  customer: [
    { key: 'dashboard',    label: 'Dashboard'   },
    { key: 'appointment',  label: 'Appointment' },
    { key: 'walkin',       label: 'Walk-in'     },
    { key: 'history',      label: 'History'     },
    { key: 'profile',      label: 'Profile'     },
  ],
};

const SERVICE_TRIGGER_MODULES = ['appointment', 'walkin'];
const SERVICES_LIST = ['Checkup', 'Surgery', 'Vaccination', 'Grooming', 'Dental', 'X-Ray', 'Emergency'];

const ROLE_COLORS = {
  admin:    { bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af', badge: '#1e3a8a' },
  manager:  { bg: '#f0fdf4', border: '#bbf7d0', text: '#14532d', badge: '#15803d' },
  employee: { bg: '#faf5ff', border: '#e9d5ff', text: '#581c87', badge: '#7c3aed' },
  customer: { bg: '#fff7ed', border: '#fed7aa', text: '#7c2d12', badge: '#ea580c' },
};
const ROLE_LABELS = { admin: 'Admin', manager: 'Manager', employee: 'Employee', customer: 'Customer' };

const defaultModules = () => ({
  admin:    ALL_MODULES.admin.map(m => m.key),
  manager:  ALL_MODULES.manager.map(m => m.key),
  employee: [],
  customer: [],
});

const generatePassword = () => {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ', lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789', special = '!@#$%^&*';
  const all = upper + lower + digits + special;
  const rand = (s) => s[Math.floor(Math.random() * s.length)];
  const required = [rand(upper), rand(lower), rand(digits), rand(special)];
  const rest = Array.from({ length: 8 }, () => rand(all));
  return [...required, ...rest].sort(() => Math.random() - 0.5).join('');
};

// ── Module Selector sub-component ──
const ModuleSelector = ({ modules, onChange }) => {
  const [activeRole, setActiveRole] = useState('admin');
  const roleModules = ALL_MODULES[activeRole];
  const selected = modules[activeRole] || [];

  const toggleModule = (key) => {
    const next = selected.includes(key)
      ? selected.filter(k => k !== key)
      : [...selected, key];
    onChange({ ...modules, [activeRole]: next });
  };

  const showServices = SERVICE_TRIGGER_MODULES.some(k => selected.includes(k));

  return (
    <div style={{ border: '1.5px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
      {/* Role tabs */}
      <div style={{ display: 'flex', borderBottom: '1.5px solid var(--border)', background: '#f8fafc' }}>
        {Object.keys(ALL_MODULES).map(role => {
          const c = ROLE_COLORS[role];
          const isActive = activeRole === role;
          return (
            <button key={role} onClick={() => setActiveRole(role)}
              style={{ flex: 1, padding: '8px 4px', fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                background: isActive ? c.bg : 'transparent',
                color: isActive ? c.text : 'var(--muted)',
                borderBottom: isActive ? `2px solid ${c.badge}` : '2px solid transparent',
              }}>
              {ROLE_LABELS[role]}
              <span style={{ marginLeft: 4, fontSize: 11, background: isActive ? c.badge : '#e2e8f0', color: isActive ? '#fff' : 'var(--muted)', padding: '1px 6px', borderRadius: 99 }}>
                {(modules[role] || []).length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Module chips */}
      <div style={{ padding: '12px 14px', background: '#fff' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px' }}>
          Select modules for {ROLE_LABELS[activeRole]}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {roleModules.map(mod => {
            const isOn = selected.includes(mod.key);
            const c = ROLE_COLORS[activeRole];
            return (
              <div key={mod.key} onClick={() => toggleModule(mod.key)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', userSelect: 'none',
                  background: isOn ? c.badge : '#f1f5f9',
                  color: isOn ? '#fff' : 'var(--muted)',
                  border: `1.5px solid ${isOn ? c.badge : 'var(--border)'}`,
                }}>
                <span style={{ display: 'flex', alignItems: 'center', opacity: isOn ? 1 : 0.6 }}>{MODULE_ICONS[mod.key]}</span>
                {mod.label}
                {isOn && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                )}
              </div>
            );
          })}
        </div>

        {/* Services — shown only when appointment or walk-in is active for this role */}
        {showServices && (
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px dashed var(--border)' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>
              Available Services for {ROLE_LABELS[activeRole]}
            </p>
            {/* NOTE: Services are stored separately at top-level form.services — this just clarifies they apply */}
            <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 8px' }}>
              ↳ The services below (set in the Services section) will be accessible under{' '}
              {SERVICE_TRIGGER_MODULES.filter(k => selected.includes(k)).map(k =>
                ALL_MODULES[activeRole].find(m => m.key === k)?.label
              ).join(' & ')} for this role.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Branch View Panel ──
const BranchViewPanel = ({ branch }) => {
  const modules = branch.modules || {};
  const roles = Object.keys(ROLE_LABELS);

  return (
    <div className="view-panel" style={{ borderTop: '1.5px solid var(--border)', padding: '14px 16px', background: '#f8fafc' }}>
      {/* Info row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', marginBottom: 12 }}>
        {[
          ['Email', branch.email],
          ['Manager', branch.manager],
          ['Coordinates', branch.lat && branch.lng ? `${branch.lat}, ${branch.lng}` : '—'],
          ['Status', branch.status],
        ].map(([label, val]) => (
          <div key={label}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 1px' }}>{label}</p>
            <p style={{ fontSize: 12, color: 'var(--text)', fontWeight: 600, margin: 0 }}>{val || '—'}</p>
          </div>
        ))}
      </div>

      {/* Services */}
      {branch.services && branch.services.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px' }}>Services</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {branch.services.map(svc => (
              <span key={svc} style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: 'var(--light-blue)', color: 'var(--royal)' }}>{svc}</span>
            ))}
          </div>
        </div>
      )}

      {/* Modules per role */}
      {roles.some(r => (modules[r] || []).length > 0) && (
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>Module Access</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {roles.map(role => {
              const mods = modules[role] || [];
              if (!mods.length) return null;
              const c = ROLE_COLORS[role];
              return (
                <div key={role} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 8, padding: '8px 10px' }}>
                  <p style={{ fontSize: 10, fontWeight: 800, color: c.text, textTransform: 'uppercase', margin: '0 0 6px' }}>
                    {ROLE_LABELS[role]}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                    {mods.map(k => {
                      const def = ALL_MODULES[role]?.find(m => m.key === k);
                      return def ? (
                        <span key={k} style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 99, background: c.badge, color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          <span style={{ display: 'flex', alignItems: 'center' }}>{MODULE_ICONS[def.key]}</span>
                          {def.label}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const Branches = () => {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editBranch, setEditBranch] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [createdAccount, setCreatedAccount] = useState(null);
  const [creating, setCreating] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [viewBranch, setViewBranch] = useState(null);

  const mapDivRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  const [form, setForm] = useState({
    name: '', address: '', phone: '', email: '',
    manager: '', status: 'Active', services: [],
    lat: '', lng: '', modules: defaultModules(),
  });

  const placeMarkers = useCallback((list) => {
    if (!window.L || !mapRef.current) { setTimeout(() => placeMarkers(list), 200); return; }
    const L = window.L, map = mapRef.current;
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    const validCoords = [];
    list.forEach(b => {
      const lat = parseFloat(b.lat), lng = parseFloat(b.lng);
      if (isNaN(lat) || isNaN(lng)) return;
      const marker = L.marker([lat, lng], { icon: makeDivIcon(L) }).addTo(map);
      marker.bindPopup(`<div style="font-family:sans-serif;min-width:220px;padding:4px"><div style="font-weight:800;font-size:14px;color:#1e3a8a;margin-bottom:4px">${b.name}</div><div style="font-size:12px;color:#64748b;margin-bottom:4px">${b.address || ''}</div><div style="font-size:12px;color:#64748b">${b.phone || ''}</div></div>`, { maxWidth: 280 });
      markersRef.current.push(marker);
      validCoords.push([lat, lng]);
    });
    if (validCoords.length > 0) map.fitBounds(validCoords, { padding: [40, 40] });
  }, []);

  const fetchBranches = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('branches').select('*').order('name');
    if (!error && data) setBranches(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchBranches(); }, [fetchBranches]);
  useEffect(() => { if (branches.length > 0) placeMarkers(branches); }, [branches, placeMarkers]);

  useEffect(() => {
    const initMap = () => {
      if (!mapDivRef.current || mapRef.current) return;
      const L = window.L;
      if (!L) return;
      const map = L.map(mapDivRef.current).setView([15.25, 120.58], 11);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 19 }).addTo(map);
      mapRef.current = map;
      setTimeout(() => { map.invalidateSize(); if (branches.length > 0) placeMarkers(branches); }, 150);
    };
    if (window.L) { initMap(); }
    else if (!document.getElementById('leaflet-js')) {
      const script = document.createElement('script');
      script.id = 'leaflet-js'; script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = initMap; document.head.appendChild(script);
    } else {
      const poll = setInterval(() => { if (window.L) { clearInterval(poll); initMap(); } }, 100);
      return () => clearInterval(poll);
    }
    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, []); // eslint-disable-line

  const openAdd = () => {
    setForm({ name: '', address: '', phone: '', email: '', manager: '', status: 'Active', services: [], lat: '', lng: '', modules: defaultModules() });
    setEditBranch(null); setShowModal(true);
  };
  const openEdit = (b) => {
    setForm({ ...b, services: b.services || [], lat: b.lat || '', lng: b.lng || '', modules: b.modules || defaultModules() });
    setEditBranch(b); setShowModal(true);
  };
  const toggleService = (svc) => setForm(prev => ({ ...prev, services: prev.services.includes(svc) ? prev.services.filter(s => s !== svc) : [...prev.services, svc] }));

  // Determine if services section should be shown (any role has appointment or walkin)
  const anyRoleHasServiceTrigger = Object.values(form.modules).some(mods =>
    SERVICE_TRIGGER_MODULES.some(k => mods.includes(k))
  );

  const saveBranch = async () => {
    if (!form.name) { alert('Branch name is required'); return; }
    if (!editBranch && !form.email) { alert('Branch email is required to create a manager account'); return; }
    setCreating(true);

    const payload = {
      name: form.name, address: form.address, phone: form.phone,
      email: form.email, manager: form.manager, status: form.status,
      services: form.services, lat: form.lat || null, lng: form.lng || null,
      modules: form.modules,
    };

    if (editBranch) {
      const { error } = await supabase.from('branches').update(payload).eq('id', editBranch.id);
      setCreating(false);
      if (error) { alert('Error: ' + error.message); return; }
      fetchBranches(); setShowModal(false);
    } else {
      const { error: insertError } = await supabase.from('branches').insert([payload]);
      if (insertError) { setCreating(false); alert('Error saving branch: ' + insertError.message); return; }

      try {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-branch-account`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({ email: form.email, branchName: form.name }),
          }
        );
        const result = await res.json();
        if (!result.success) throw new Error(result.error);
        setCreatedAccount({ email: form.email, password: result.password, branchName: form.name });
      } catch (err) {
        alert(`Branch saved! But manager account creation failed: ${err.message}`);
      }

      setCreating(false);
      fetchBranches(); setShowModal(false);
    }
  };

  const doDelete = async () => {
    const { error } = await supabase.from('branches').delete().eq('id', deleteId);
    if (error) { alert('Error: ' + error.message); return; }
    fetchBranches(); setDeleteId(null);
  };

  const S = {
    page: { width: '100%', minHeight: '100vh', display: 'block' },
    topbar: { background: '#fff', borderBottom: '1px solid var(--border)', padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 'var(--topbar-h)', zIndex: 50, width: '100%', boxSizing: 'border-box', gap: 12 },
    cont: { padding: '24px 28px', paddingTop: 'calc(var(--topbar-h) + var(--pagetop-h) + 20px)', width: '100%', boxSizing: 'border-box' },
    btn: { width: 'auto' },
  };

  return (
    <Layout>
      <div style={S.page}>
        <style>{SKEL_CSS}</style>
        <div style={S.topbar}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/icon/branches.png" alt="" style={{ width: 22, height: 22, filter: 'brightness(0) saturate(100%) invert(17%) sepia(82%) saturate(1200%) hue-rotate(210deg)' }} />
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', margin: 0 }}>Branch Management</h1>
              <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>Manage all hospital branches</p>
            </div>
          </div>
          <button className="btn btn-primary" onClick={openAdd} style={S.btn}>+ Add Branch</button>
        </div>

        <div style={S.cont}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 14, marginBottom: 24 }}>
            {loading ? (
              [1, 2].map(i => (
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
              { label: 'Total Branches', value: branches.length, icon: '/icon/branches.png', color: 'blue' },
              { label: 'Active', value: branches.filter(b => b.status === 'Active').length, icon: '/icon/available.png', color: 'green' },
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
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, borderRadius: '16px 16px 0 0', background: sc.color === 'blue' ? 'linear-gradient(90deg,#1e3a8a,#3b82f6)' : 'linear-gradient(90deg,#16a34a,#22c55e)' }} />
                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                  <div style={{ width: 46, height: 46, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: sc.color === 'blue' ? '#eff6ff' : '#f0fdf4' }}>
                    <img src={sc.icon} alt={sc.label} style={{ width: 24, height: 24, filter: sc.color === 'blue' ? 'brightness(0) saturate(100%) invert(17%) sepia(82%) saturate(1200%) hue-rotate(210deg)' : 'brightness(0) saturate(100%) invert(32%) sepia(80%) saturate(600%) hue-rotate(110deg) brightness(0.9)' }} />
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

          {/* Map */}
          <div style={{ background: '#fff', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)', marginBottom: 24, overflow: 'hidden', position: 'relative', zIndex: 0 }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}><h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Branch Locations</h2></div>
            <div ref={mapDivRef} style={{ height: 420, width: '100%', position: 'relative', zIndex: 0 }} />
          </div>

          {/* Branch Cards */}
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 18 }}>
              {[1, 2, 3, 4].map(i => (
                <div key={i} style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 14, overflow: 'hidden' }}>
                  <div style={{ height: 80, background: '#f1f5f9' }} className="skel" />
                  <div style={{ padding: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <Skel w="55%" h={14} />
                      <Skel w="20%" h={20} />
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}><Skel w={13} h={13} /><Skel w="75%" h={12} /></div>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}><Skel w={13} h={13} /><Skel w="50%" h={12} /></div>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}><Skel w={13} h={13} /><Skel w="60%" h={12} /></div>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                      <Skel w="25%" h={24} /><Skel w="25%" h={24} /><Skel w="25%" h={24} />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}><Skel w="30%" h={30} /><Skel w="30%" h={30} /></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 18 }}>
              {branches.map(b => {
                const isExpanded = expandedId === b.id;
                return (
                  <div key={b.id} style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', transition: 'all 0.2s', boxShadow: isExpanded ? '0 4px 24px rgba(30,58,138,0.13)' : 'var(--shadow)' }}>
                    <div style={{ height: 88, background: '#eef2ff', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', overflow: 'hidden', position: 'relative', borderBottom: '1.5px solid #c7d2fe' }}>
                      <svg viewBox="0 0 300 88" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}>
                        {/* sky bg */}
                        <rect width="300" height="88" fill="#eef2ff"/>
                        {/* clouds */}
                        <ellipse cx="60" cy="22" rx="22" ry="9" fill="#fff" opacity="0.7"/>
                        <ellipse cx="75" cy="18" rx="14" ry="8" fill="#fff" opacity="0.7"/>
                        <ellipse cx="230" cy="28" rx="18" ry="7" fill="#fff" opacity="0.6"/>
                        <ellipse cx="244" cy="24" rx="12" ry="6" fill="#fff" opacity="0.6"/>
                        {/* ground */}
                        <rect x="0" y="76" width="300" height="12" fill="#c7d2fe"/>
                        {/* left small building */}
                        <rect x="20" y="46" width="36" height="30" rx="2" fill="#a5b4fc"/>
                        <rect x="26" y="52" width="7" height="8" rx="1" fill="#e0e7ff"/>
                        <rect x="38" y="52" width="7" height="8" rx="1" fill="#e0e7ff"/>
                        <rect x="26" y="65" width="7" height="8" rx="1" fill="#e0e7ff"/>
                        <rect x="38" y="65" width="7" height="8" rx="1" fill="#e0e7ff"/>
                        {/* main center building */}
                        <rect x="95" y="22" width="110" height="54" rx="3" fill="#6366f1"/>
                        {/* main building windows */}
                        <rect x="108" y="30" width="12" height="10" rx="1" fill="#e0e7ff" opacity="0.9"/>
                        <rect x="127" y="30" width="12" height="10" rx="1" fill="#e0e7ff" opacity="0.9"/>
                        <rect x="146" y="30" width="12" height="10" rx="1" fill="#e0e7ff" opacity="0.9"/>
                        <rect x="165" y="30" width="12" height="10" rx="1" fill="#e0e7ff" opacity="0.9"/>
                        <rect x="108" y="46" width="12" height="10" rx="1" fill="#c7d2fe" opacity="0.8"/>
                        <rect x="127" y="46" width="12" height="10" rx="1" fill="#e0e7ff" opacity="0.9"/>
                        <rect x="146" y="46" width="12" height="10" rx="1" fill="#c7d2fe" opacity="0.8"/>
                        <rect x="165" y="46" width="12" height="10" rx="1" fill="#e0e7ff" opacity="0.9"/>
                        <rect x="108" y="62" width="12" height="10" rx="1" fill="#e0e7ff" opacity="0.9"/>
                        <rect x="165" y="62" width="12" height="10" rx="1" fill="#c7d2fe" opacity="0.8"/>
                        {/* main building door */}
                        <rect x="135" y="60" width="30" height="16" rx="2" fill="#312e81"/>
                        <circle cx="161" cy="68" r="2" fill="#a5b4fc"/>
                        {/* right small building */}
                        <rect x="244" y="40" width="40" height="36" rx="2" fill="#818cf8"/>
                        <rect x="250" y="47" width="8" height="8" rx="1" fill="#e0e7ff"/>
                        <rect x="263" y="47" width="8" height="8" rx="1" fill="#e0e7ff"/>
                        <rect x="250" y="60" width="8" height="8" rx="1" fill="#e0e7ff"/>
                        <rect x="263" y="60" width="8" height="8" rx="1" fill="#e0e7ff"/>
                        {/* flag */}
                        <line x1="150" y1="8" x2="150" y2="22" stroke="#4338ca" strokeWidth="1.5"/>
                        <polygon points="150,8 162,12 150,16" fill="#dc2626"/>
                      </svg>
                    </div>
                    <div style={{ padding: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{b.name}</h3>
                        <span className={`badge ${b.status === 'Active' ? 'badge-green' : 'badge-red'}`}>{b.status}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 5 }}>
                        <img src="/icon/location.png" alt="" style={{ width: 13, height: 13, marginTop: 1, flexShrink: 0, filter: 'brightness(0) saturate(100%) invert(40%)' }} />
                        <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>{b.address}</p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                        <img src="/icon/phone.png" alt="" style={{ width: 13, height: 13, flexShrink: 0, filter: 'brightness(0) saturate(100%) invert(40%)' }} />
                        <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>{b.phone}</p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                        <img src="/icon/admin.png" alt="" style={{ width: 13, height: 13, flexShrink: 0, filter: 'brightness(0) saturate(100%) invert(40%)' }} />
                        <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>Manager: <strong>{b.manager}</strong></p>
                      </div>

                      {/* Service badges (compact preview) */}
                      {b.services && b.services.length > 0 && !isExpanded && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
                          {b.services.slice(0, 3).map(svc => (
                            <span key={svc} style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: 'var(--light-blue)', color: 'var(--royal)' }}>{svc}</span>
                          ))}
                          {b.services.length > 3 && (
                            <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: '#f1f5f9', color: 'var(--muted)' }}>+{b.services.length - 3} more</span>
                          )}
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-ghost btn-sm" style={S.btn} onClick={() => openEdit(b)}>Edit</button>
                        <button className="btn btn-ghost btn-sm" style={{ ...S.btn, color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => setDeleteId(b.id)}>Delete</button>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ ...S.btn, marginLeft: 'auto' }}
                          onClick={() => setViewBranch(b)}
                        >
                          View
                        </button>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── VIEW BRANCH MODAL ── */}
      {viewBranch && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <img src="/icon/branches.png" alt="" style={{ width: 18, height: 18, filter: 'brightness(0) saturate(100%) invert(17%) sepia(82%) saturate(1200%) hue-rotate(210deg)' }} />
                <h3 style={{ margin: 0 }}>{viewBranch.name}</h3>
                <span className={`badge ${viewBranch.status === 'Active' ? 'badge-green' : 'badge-red'}`}>{viewBranch.status}</span>
              </div>
              <button className="btn btn-ghost btn-icon" style={S.btn} onClick={() => setViewBranch(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Basic Info */}
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px' }}>Branch Info</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px' }}>
                  {[
                    ['Address', viewBranch.address],
                    ['Phone', viewBranch.phone],
                    ['Email', viewBranch.email],
                    ['Manager', viewBranch.manager],
                    ['Coordinates', viewBranch.lat && viewBranch.lng ? `${viewBranch.lat}, ${viewBranch.lng}` : '—'],
                  ].map(([label, val]) => (
                    <div key={label} style={{ gridColumn: label === '📍 Address' ? '1 / -1' : undefined }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 2px' }}>{label}</p>
                      <p style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600, margin: 0 }}>{val || '—'}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Services */}
              {viewBranch.services && viewBranch.services.length > 0 && (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>Services</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {viewBranch.services.map(svc => (
                      <span key={svc} style={{ fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 99, background: 'var(--light-blue)', color: 'var(--royal)' }}>{svc}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Module Access per role */}
              {(() => {
                const modules = viewBranch.modules || {};
                const roles = Object.keys(ROLE_LABELS);
                const hasAny = roles.some(r => (modules[r] || []).length > 0);
                if (!hasAny) return null;
                return (
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px' }}>Module Access</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      {roles.map(role => {
                        const mods = modules[role] || [];
                        if (!mods.length) return null;
                        const c = ROLE_COLORS[role];
                        return (
                          <div key={role} style={{ background: c.bg, border: `1.5px solid ${c.border}`, borderRadius: 10, padding: '10px 12px' }}>
                            <p style={{ fontSize: 11, fontWeight: 800, color: c.text, textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 8px' }}>
                              {ROLE_LABELS[role]}
                              <span style={{ marginLeft: 6, fontSize: 10, background: c.badge, color: '#fff', padding: '1px 6px', borderRadius: 99 }}>{mods.length}</span>
                            </p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                              {mods.map(k => {
                                const def = ALL_MODULES[role]?.find(m => m.key === k);
                                return def ? (
                                  <span key={k} style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 99, background: c.badge, color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                    <span style={{ display: 'flex', alignItems: 'center' }}>{MODULE_ICONS[def.key]}</span>
                                    {def.label}
                                  </span>
                                ) : null;
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" style={S.btn} onClick={() => { setViewBranch(null); openEdit(viewBranch); }}>Edit Branch</button>
              <button className="btn btn-primary" style={S.btn} onClick={() => setViewBranch(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD/EDIT MODAL ── */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <div>
              {!editBranch && (
                <div style={{ height: 110, background: '#eef2ff', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', overflow: 'hidden', position: 'relative', borderBottom: '1.5px solid #c7d2fe' }}>
                  <svg viewBox="0 0 600 110" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}>
                    <rect width="600" height="110" fill="#eef2ff"/>
                    <ellipse cx="100" cy="32" rx="30" ry="12" fill="#fff" opacity="0.7"/>
                    <ellipse cx="122" cy="26" rx="20" ry="11" fill="#fff" opacity="0.7"/>
                    <ellipse cx="470" cy="36" rx="26" ry="10" fill="#fff" opacity="0.6"/>
                    <ellipse cx="490" cy="30" rx="18" ry="9" fill="#fff" opacity="0.6"/>
                    <rect x="0" y="96" width="600" height="14" fill="#c7d2fe"/>
                    {/* left building */}
                    <rect x="40" y="58" width="60" height="38" rx="2" fill="#a5b4fc"/>
                    <rect x="50" y="66" width="10" height="10" rx="1" fill="#e0e7ff"/>
                    <rect x="66" y="66" width="10" height="10" rx="1" fill="#e0e7ff"/>
                    <rect x="82" y="66" width="10" height="10" rx="1" fill="#e0e7ff"/>
                    <rect x="50" y="82" width="10" height="10" rx="1" fill="#e0e7ff"/>
                    <rect x="82" y="82" width="10" height="10" rx="1" fill="#e0e7ff"/>
                    {/* center main building */}
                    <rect x="200" y="20" width="200" height="76" rx="3" fill="#6366f1"/>
                    <rect x="218" y="32" width="16" height="13" rx="1" fill="#e0e7ff" opacity="0.9"/>
                    <rect x="242" y="32" width="16" height="13" rx="1" fill="#e0e7ff" opacity="0.9"/>
                    <rect x="266" y="32" width="16" height="13" rx="1" fill="#e0e7ff" opacity="0.9"/>
                    <rect x="290" y="32" width="16" height="13" rx="1" fill="#e0e7ff" opacity="0.9"/>
                    <rect x="314" y="32" width="16" height="13" rx="1" fill="#c7d2fe" opacity="0.9"/>
                    <rect x="338" y="32" width="16" height="13" rx="1" fill="#e0e7ff" opacity="0.9"/>
                    <rect x="218" y="52" width="16" height="13" rx="1" fill="#c7d2fe" opacity="0.8"/>
                    <rect x="242" y="52" width="16" height="13" rx="1" fill="#e0e7ff" opacity="0.9"/>
                    <rect x="266" y="52" width="16" height="13" rx="1" fill="#e0e7ff" opacity="0.9"/>
                    <rect x="290" y="52" width="16" height="13" rx="1" fill="#c7d2fe" opacity="0.8"/>
                    <rect x="314" y="52" width="16" height="13" rx="1" fill="#e0e7ff" opacity="0.9"/>
                    <rect x="338" y="52" width="16" height="13" rx="1" fill="#c7d2fe" opacity="0.8"/>
                    <rect x="218" y="72" width="16" height="13" rx="1" fill="#e0e7ff" opacity="0.9"/>
                    <rect x="338" y="72" width="16" height="13" rx="1" fill="#e0e7ff" opacity="0.9"/>
                    {/* door */}
                    <rect x="272" y="72" width="56" height="24" rx="2" fill="#312e81"/>
                    <circle cx="324" cy="84" r="3" fill="#818cf8"/>
                    {/* flag */}
                    <line x1="300" y1="6" x2="300" y2="20" stroke="#4338ca" strokeWidth="2"/>
                    <polygon points="300,6 318,11 300,16" fill="#dc2626"/>
                    {/* right building */}
                    <rect x="500" y="50" width="64" height="46" rx="2" fill="#818cf8"/>
                    <rect x="510" y="60" width="10" height="10" rx="1" fill="#e0e7ff"/>
                    <rect x="526" y="60" width="10" height="10" rx="1" fill="#e0e7ff"/>
                    <rect x="542" y="60" width="10" height="10" rx="1" fill="#e0e7ff"/>
                    <rect x="510" y="76" width="10" height="10" rx="1" fill="#e0e7ff"/>
                    <rect x="542" y="76" width="10" height="10" rx="1" fill="#e0e7ff"/>
                  </svg>
                  <button onClick={() => setShowModal(false)} style={{ position: 'absolute', top: 10, right: 14, background: 'rgba(255,255,255,0.8)', border: '1px solid #c7d2fe', borderRadius: 6, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 2 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              )}
              {editBranch && (
                <div className="modal-header">
                  <h3>Edit Branch</h3>
                  <button className="btn btn-ghost btn-icon" style={S.btn} onClick={() => setShowModal(false)}>✕</button>
                </div>
              )}
              {!editBranch && (
                <div style={{ padding: '16px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#1e1b4b' }}>Add New Branch</h3>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6366f1' }}>A manager account will be created automatically</p>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-body">
              {!editBranch && (
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#1e40af', marginBottom: 16, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1e40af" strokeWidth="2.5" strokeLinecap="round" style={{ marginTop: 1, flexShrink: 0 }}><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <span>Adding a branch will automatically create a <strong>manager account</strong> using the email below. The credentials will be shown after saving.</span>
                </div>
              )}
              <div className="form-grid">
                <div className="form-group form-full"><label>Branch Name *</label><input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Tarlac City Branch" /></div>
                <div className="form-group form-full"><label>Address</label><input type="text" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Full address" /></div>
                <div className="form-group"><label>Phone</label><input type="text" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                <div className="form-group"><label>Branch Email {!editBranch && <span style={{ color: '#dc2626' }}>*</span>}</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="manager@ach.com" /></div>
                <div className="form-group"><label>Manager Name</label><input type="text" value={form.manager} onChange={e => setForm({ ...form, manager: e.target.value })} /></div>
                <div className="form-group"><label>Status</label><select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}><option>Active</option><option>Inactive</option></select></div>
                <div className="form-group"><label>Latitude</label><input type="text" value={form.lat} onChange={e => setForm({ ...form, lat: e.target.value })} placeholder="e.g. 15.205205" /></div>
                <div className="form-group"><label>Longitude</label><input type="text" value={form.lng} onChange={e => setForm({ ...form, lng: e.target.value })} placeholder="e.g. 120.580370" /></div>

                {/* ── MODULE SELECTOR ── */}
                <div className="form-group form-full">
                  <label style={{ marginBottom: 8, display: 'block' }}>Module Access</label>
                  <ModuleSelector
                    modules={form.modules}
                    onChange={mods => setForm(prev => ({ ...prev, modules: mods }))}
                  />
                </div>

                {/* ── SERVICES — only when any role has appointment or walk-in ── */}
                {anyRoleHasServiceTrigger && (
                  <div className="form-group form-full">
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      Services
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: 99 }}>
                        shown because Appointment / Walk-in is enabled
                      </span>
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                      {SERVICES_LIST.map(svc => (
                        <div key={svc} onClick={() => toggleService(svc)} style={{ padding: '5px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: form.services.includes(svc) ? 'var(--royal)' : 'var(--bg)', color: form.services.includes(svc) ? '#fff' : 'var(--muted)', border: `1.5px solid ${form.services.includes(svc) ? 'var(--royal)' : 'var(--border)'}`, transition: 'all 0.15s' }}>
                          {svc}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" style={S.btn} onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" style={S.btn} onClick={saveBranch} disabled={creating}>
                {creating ? 'Saving…' : editBranch ? 'Save Branch' : 'Add Branch & Create Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CREDENTIALS POPUP ── */}
      {createdAccount && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
            <div style={{ background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', padding: '20px 24px 16px', borderBottom: '1px solid #bbf7d0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#14532d' }}>Branch Account Created!</h3>
                  <p style={{ margin: 0, fontSize: 12, color: '#16a34a', marginTop: 2 }}>Share these credentials with the branch manager</p>
                </div>
              </div>
            </div>
            <div style={{ padding: '20px 24px' }}>
              <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--muted)' }}>A manager account has been created for <strong>{createdAccount.branchName}</strong>.</p>
              {[['Branch', createdAccount.branchName], ['Email', createdAccount.email], ['Password', createdAccount.password]].map(([label, value]) => (
                <div key={label} style={{ marginBottom: 12 }}>
                  <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>{label}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', border: '1.5px solid var(--border)', borderRadius: 8, padding: '9px 14px' }}>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600, fontFamily: label === 'Password' ? 'monospace' : 'inherit' }}>{value}</span>
                    <button className="btn btn-ghost btn-sm" style={{ ...S.btn, fontSize: 11 }} onClick={() => navigator.clipboard.writeText(value)}>Copy</button>
                  </div>
                </div>
              ))}
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#92400e', display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 4 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#92400e" strokeWidth="2.5" strokeLinecap="round" style={{ marginTop: 1, flexShrink: 0 }}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                <span>This password will <strong>not</strong> be shown again. Copy it before closing. Tell the manager to change their password after first login.</span>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 24px', borderTop: '1px solid var(--border)' }}>
              <button className="btn btn-ghost" style={S.btn} onClick={() => { navigator.clipboard.writeText(`Branch: ${createdAccount.branchName}\nEmail: ${createdAccount.email}\nPassword: ${createdAccount.password}`); }}>Copy All</button>
              <button className="btn btn-primary" style={S.btn} onClick={() => setCreatedAccount(null)}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM ── */}
      {deleteId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <div className="modal-header"><h3>Delete Branch</h3></div>
            <div className="modal-body"><p style={{ color: 'var(--muted)' }}>Are you sure you want to delete this branch? This cannot be undone.</p></div>
            <div className="modal-footer">
              <button className="btn btn-ghost" style={S.btn} onClick={() => setDeleteId(null)}>Cancel</button>
              <button className="btn btn-danger" style={S.btn} onClick={doDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Branches;