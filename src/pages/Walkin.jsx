// ============================================================
// Walkins.jsx  — walk-in guest vs registered client toggle
// ============================================================
import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import Layout from '../components/layout';
import { supabase } from '../js/supabase';
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
.wk-row-hover:hover { background: #f8fafc !important; cursor: pointer; }
.wk-clipboard-bar {
  background: linear-gradient(135deg, #0f172a, #1e3a8a);
  padding: 10px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-radius: 14px 14px 0 0;
}
.wk-section-label {
  background: #f1f5f9;
  border-bottom: 1px solid #e2e8f0;
  padding: 6px 16px;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #64748b;
}
.stat-card-v2 {
  background: var(--card, #fff);
  border: 1.5px solid var(--border);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
  position: relative;
  overflow: hidden;
}
.stat-card-v2::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 3px;
  border-radius: 16px 16px 0 0;
  opacity: 0;
  transition: opacity 0.18s ease;
}
.stat-card-v2:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(30,58,138,0.10);
  border-color: rgba(30,58,138,0.25);
}
.stat-card-v2:hover::before { opacity: 1; }
.stat-card-v2.blue::before   { background: linear-gradient(90deg,#1e3a8a,#3b82f6); }
.stat-card-v2.green::before  { background: linear-gradient(90deg,#16a34a,#22c55e); }
.stat-card-v2.yellow::before { background: linear-gradient(90deg,#d97706,#f59e0b); }
.stat-card-v2 .stat-icon-v2 {
  width: 46px; height: 46px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.stat-card-v2 .stat-icon-v2.blue   { background: #eff6ff; }
.stat-card-v2 .stat-icon-v2.green  { background: #f0fdf4; }
.stat-card-v2 .stat-icon-v2.yellow { background: #fffbeb; }
.stat-card-v2 .stat-icon-v2.blue   img { filter: brightness(0) saturate(100%) invert(17%) sepia(82%) saturate(1200%) hue-rotate(210deg); }
.stat-card-v2 .stat-icon-v2.green  img { filter: brightness(0) saturate(100%) invert(32%) sepia(80%) saturate(600%) hue-rotate(110deg) brightness(0.9); }
.stat-card-v2 .stat-icon-v2.yellow img { filter: brightness(0) saturate(100%) invert(52%) sepia(90%) saturate(600%) hue-rotate(10deg) brightness(0.9); }
`;

const Skel = ({ w = '100%', h = 16 }) => (
  <span className="skel" style={{ width: w, height: h, borderRadius: 8, display: 'block' }} />
);

const STATUS_BADGE = { Waiting: 'badge-yellow', Attended: 'badge-green', Cancelled: 'badge-red' };
const VETS = ['Dr. Santos', 'Dr. Reyes', 'Dr. Cruz', 'Dr. Garcia'];
const today = new Date().toISOString().split('T')[0];
const MAX_GROOMERS = 2;
const EMPTY_FORM = { patient: '', species: 'Dog', owner: '', owner_id: null, contact: '', purpose: 'Checkup', vet: '', notes: '', status: 'Waiting' };
const CustomSelect = ({ value, onChange, options, placeholder = '—', accent = '#6366f1' }) => {
  const [open, setOpen] = React.useState(false);
  const [dropPos, setDropPos] = React.useState({ top: 0, left: 0, width: 0 });
  const triggerRef = React.useRef(null);
  const ref = React.useRef(null);
  const selected = options.find(o => (o.value ?? o) === value);
  const label = selected ? (selected.label ?? selected) : placeholder;

  React.useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target) && triggerRef.current && !triggerRef.current.contains(e.target)) setOpen(false);
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
        <div ref={ref} style={{ position: 'absolute', top: dropPos.top, left: dropPos.left, width: dropPos.width, background: '#fff', borderRadius: 10, zIndex: 99999, boxShadow: '0 8px 24px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.08)', border: '1.5px solid #e2e8f0', maxHeight: 240, overflowY: 'auto' }}>
          {[{ value: '', label: placeholder }, ...options].map((opt, i) => {
            const optVal = opt.value ?? opt;
            const optLabel = opt.label ?? opt;
            const isSelected = optVal === value;
            const isEmpty = optVal === '';
            return (
              <div key={i} onClick={() => { onChange(optVal); setOpen(false); }}
                style={{ padding: '9px 14px', fontSize: 13, fontWeight: isSelected ? 700 : 500, color: isEmpty ? '#94a3b8' : isSelected ? '#4f46e5' : '#1e293b', cursor: 'pointer', transition: 'background 0.1s', background: isSelected ? '#eff6ff' : 'transparent', borderBottom: i < options.length ? '1px solid #f1f5f9' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f8fafc'; }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}>
                <span>{optLabel}</span>
                {isSelected && !isEmpty && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
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
        style={{ width: '100%', padding: '7px 28px 7px 10px', border: '1.5px solid #e2e8f0', borderRadius: 8, background: 'linear-gradient(to bottom, #ffffff, #f8fafc)', fontSize: 13, fontWeight: 600, color: value ? 'var(--text)' : '#94a3b8', cursor: 'pointer', userSelect: 'none', boxSizing: 'border-box', boxShadow: open ? '0 0 0 3px rgba(99,102,241,0.12), 0 1px 3px rgba(0,0,0,0.06)' : '0 1px 3px rgba(0,0,0,0.06)', borderColor: open ? accent : '#e2e8f0', transition: 'border-color 0.15s, box-shadow 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>{label}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>
      {portal}
    </div>
  );
};

const Walkin = () => {
  const { user, isAdmin, seeAllBranches, loading: userLoading } = useCurrentUser();

  const [toast, setToast] = useState({ show: false, message: '' });
  const toastTimer = useRef(null);

  const [branchFilter, setBranchFilter] = useState('');
  const [branches, setBranches] = useState([]);
  const [walkins, setWalkins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ROWS_PER_PAGE = 10;
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [conflictType, setConflictType] = useState(null);
  const [groomingUsed, setGroomingUsed] = useState(0);

  // ── Owner type toggle ─────────────────────────────────────────────────────
  const [ownerType, setOwnerType] = useState('walkin'); // 'walkin' | 'registered'
  const [clients, setClients] = useState([]);
  const [ownerSearch, setOwnerSearch] = useState('');
  const [showOwnerDrop, setShowOwnerDrop] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const ownerRef = useRef(null);

  const showToast = (message) => {
    clearTimeout(toastTimer.current);
    setToast({ show: true, message });
    toastTimer.current = setTimeout(() => setToast({ show: false, message: '' }), 3000);
  };

  // ── Fetch branches ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!seeAllBranches) return;
    supabase.from('branches').select('id, name').order('name').then(({ data }) => setBranches(data || []));
  }, [seeAllBranches]);

  // ── Close dropdown on outside click ──────────────────────────────────────
  useEffect(() => {
    const h = (e) => { if (ownerRef.current && !ownerRef.current.contains(e.target)) setShowOwnerDrop(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // ── Fetch registered clients (branch-scoped) ──────────────────────────────
  const fetchClients = useCallback(async () => {
    if (!user) return;
    let q = supabase.from('profiles').select('id, first_name, last_name, email, phone, role').eq('status', 'Active').order('first_name');
    if (!seeAllBranches && user?.branchId) q = q.eq('branch_id', user.branchId);
    if (seeAllBranches && branchFilter) q = q.eq('branch_id', branchFilter);
    const { data, error } = await q;
    if (error) { console.error('fetchClients error:', error.message); setClients([]); return; }
    setClients(
      (data || []).map((p) => ({
        ...p,
        full_name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.email || 'Unnamed',
      }))
    );
  }, [user, seeAllBranches, branchFilter]);

  // ── Fetch walk-ins (branch-scoped) ────────────────────────────────────────
  const fetchWalkins = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    let q = supabase.from('walkins').select('*').order('arrived_at', { ascending: false });
    if (!seeAllBranches && user?.branchId) q = q.eq('branch_id', user.branchId);
    if (seeAllBranches && branchFilter) q = q.eq('branch_id', branchFilter);
    const { data, error } = await q;
    if (error) console.error('Fetch error:', error);
    else setWalkins(data || []);
    setLoading(false);
  }, [user, seeAllBranches, branchFilter]);

  useEffect(() => {
    if (userLoading || !user) return;
    fetchWalkins();
    fetchClients();

    const walkinChannel = supabase.channel('walkins-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'walkins' }, (p) => setWalkins(prev => [p.new, ...prev]))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'walkins' }, (p) => setWalkins(prev => prev.map(w => w.id === p.new.id ? p.new : w)))
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'walkins' }, (p) => setWalkins(prev => prev.filter(w => w.id !== p.old.id)))
      .subscribe();

    const profilesChannel = supabase.channel('walkin-profiles-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchClients())
      .subscribe();

    return () => {
      supabase.removeChannel(walkinChannel);
      supabase.removeChannel(profilesChannel);
      clearTimeout(toastTimer.current);
    };
  }, [user, userLoading, seeAllBranches, branchFilter, fetchClients, fetchWalkins]);

  if (!userLoading && !user) {
    return (
      <Layout>
        <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Please log in</h2>
          <p style={{ fontSize: 13 }}>Your branch could not be detected. Please sign in again.</p>
        </div>
      </Layout>
    );
  }

  useEffect(() => {
    if (form.purpose !== 'Grooming') { setConflictType(null); setGroomingUsed(0); return; }
    const excludeId = editItem?.id ?? null;
    const used = walkins.filter(w => w.purpose === 'Grooming' && w.status === 'Waiting' && w.id !== excludeId).length;
    setGroomingUsed(used);
    setConflictType(used >= MAX_GROOMERS ? 'grooming' : null);
  }, [form.purpose, walkins, editItem]);

  const todayWalkins = walkins.filter(w => w.arrived_at?.startsWith(today));

  useEffect(() => { setCurrentPage(1); }, [walkins.length]);

  const totalPages = Math.max(1, Math.ceil(walkins.length / ROWS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = walkins.slice((safePage - 1) * ROWS_PER_PAGE, safePage * ROWS_PER_PAGE);
  const isGrooming = form.purpose === 'Grooming';

  const branchLabel = (() => {
    if (!seeAllBranches) return 'My Branch';
    if (branchFilter) return branches.find(b => b.id === branchFilter)?.name ?? 'Selected Branch';
    return 'All Branches';
  })();

  const filteredClients = (() => {
    const q = ownerSearch.toLowerCase().trim();
    if (!q) return clients;
    return clients.filter((c) =>
      c.full_name.toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.phone || '').includes(q)
    );
  })();

  // ── Owner helpers ─────────────────────────────────────────────────────────
  const selectOwner = (client) => {
    setSelectedClient(client);
    setOwnerSearch(client.full_name);
    setShowOwnerDrop(false);
    setForm(prev => ({ ...prev, owner: client.full_name, owner_id: client.id, contact: client.phone || prev.contact }));
  };

  const clearOwner = (e) => {
    e?.stopPropagation();
    setSelectedClient(null);
    setOwnerSearch('');
    setForm(prev => ({ ...prev, owner: '', owner_id: null, contact: '' }));
  };

  // ── Modal open/close ──────────────────────────────────────────────────────
  const openAdd = () => {
    setEditItem(null);
    setForm(EMPTY_FORM);
    setOwnerType('walkin');
    setConflictType(null);
    setGroomingUsed(0);
    setSelectedClient(null);
    setOwnerSearch('');
    setShowModal(true);
  };

  const openEdit = (w) => {
    setEditItem(w);
    setOwnerType(w.owner_id ? 'registered' : 'walkin');
    setForm({
      patient: w.patient || '',
      species: w.species || 'Dog',
      owner: w.owner || '',
      owner_id: w.owner_id || null,
      contact: w.contact || '',
      purpose: w.purpose || 'Checkup',
      vet: w.vet || '',
      notes: w.notes || '',
      status: w.status || 'Waiting',
    });
    setConflictType(null);
    setGroomingUsed(0);
    setOwnerSearch(w.owner || '');
    const matched = clients.find(c => c.id === w.owner_id || c.full_name === w.owner);
    setSelectedClient(matched || null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false); setEditItem(null); setForm(EMPTY_FORM);
    setConflictType(null); setGroomingUsed(0);
    setSelectedClient(null); setOwnerSearch('');
    setOwnerType('walkin');
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const upsertPatient = async () => {
    const { data: existing } = await supabase.from('patients').select('owner').eq('owner', form.owner.trim()).maybeSingle();
    if (!existing) {
      await supabase.from('patients').insert([{
        owner: form.owner.trim(),
        contact: form.contact.trim() || null,
        owner_id: ownerType === 'registered' ? (form.owner_id || null) : null,
        status: 'Outpatient',
        health: 'Good',
        branch_id: user?.branchId ?? null,
        created_at: new Date().toISOString(),
      }]);
    }
  };

  const saveWalkin = async () => {
    if (!form.patient.trim()) { alert('Please enter the patient (pet) name.'); return; }
    if (!form.owner.trim()) { alert('Please enter the owner name.'); return; }
    if (conflictType) { alert('Cannot save: grooming is fully booked.'); return; }
    setSaving(true);

    const payload = {
      patient: form.patient.trim(),
      species: form.species,
      owner: form.owner.trim(),
      owner_id: ownerType === 'registered' ? (form.owner_id || null) : null,
      contact: form.contact.trim(),
      purpose: form.purpose,
      vet: form.purpose === 'Grooming' ? null : (form.vet || null),
      notes: form.notes.trim(),
      status: form.status,
    };

    if (editItem) {
      const { error } = await supabase.from('walkins').update(payload).eq('id', editItem.id);
      setSaving(false);
      if (error) { alert('Error updating: ' + error.message); return; }
    } else {
      const { error } = await supabase.from('walkins').insert([{
        ...payload,
        arrived_at: new Date().toISOString(),
        branch_id: user?.branchId ?? null,
      }]).select();
      setSaving(false);
      if (error) { alert('Error saving: ' + error.message); return; }
      await upsertPatient();
    }

    closeModal();
    showToast(editItem ? '✓ Walk-in updated successfully!' : '✓ Walk-in registered successfully!');
  };

  const updateStatus = async (id, status) => {
    const { error } = await supabase.from('walkins').update({ status }).eq('id', id);
    if (error) alert('Error updating status: ' + error.message);
  };

  const deleteWalkin = async (id) => {
    if (!window.confirm('Permanently delete this walk-in? This cannot be undone.')) return;
    const { error } = await supabase.from('walkins').delete().eq('id', id);
    if (error) alert('Error deleting walk-in: ' + error.message);
  };

  const S = {
    page: { width: '100%', minHeight: '100vh', display: 'block' },
    topbar: { background: '#fff', borderBottom: '1px solid var(--border)', padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'fixed', top: 'var(--topbar-h)', zIndex: 50, left: 'var(--current-sidebar-w, 62px)', right: 0, boxSizing: 'border-box', gap: 12 },
    cont: { padding: '24px 28px', paddingTop: 'calc(var(--topbar-h) + 64px + 24px)', boxSizing: 'border-box' },
    card: { background: '#fff', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)', width: '100%', marginBottom: 20 },
    th: { background: 'var(--bg)', padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--border)' },
    td: { padding: '13px 14px', borderBottom: '1px solid var(--border)', color: 'var(--text)', verticalAlign: 'middle' },
    btn: { width: 'auto' },
    inp: { padding: '9px 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', background: '#fff', color: 'var(--text)', outline: 'none' },
    textInput: { width: '100%', padding: '9px 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' },
  };

  {/* Walk-in Guest — plain text inputs */ }
  {
    ownerType === 'walkin' && (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, display: 'block', marginBottom: 4 }}>Full Name *</label>
          <input
            type="text"
            placeholder="e.g. Juan dela Cruz"
            value={form.owner}
            onChange={e => setForm(prev => ({ ...prev, owner: e.target.value, owner_id: null }))}
            style={S.textInput}
          />
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, display: 'block', marginBottom: 4 }}>Contact</label>
          <input
            type="text"
            placeholder="e.g. 09xx-xxx-xxxx"
            value={form.contact}
            onChange={e => setForm(prev => ({ ...prev, contact: e.target.value }))}
            style={S.textInput}
          />
        </div>
      </div>
    )
  }

  {/* Registered Client — searchable dropdown */ }
  {
    ownerType === 'registered' && (
      <div ref={ownerRef} style={{ position: 'relative' }}>
        {selectedClient ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 8, padding: '9px 12px' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--royal)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
              {(selectedClient.first_name?.[0] || '?').toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#166534' }}>{selectedClient.full_name}</p>
              <p style={{ margin: 0, fontSize: 11, color: '#16a34a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selectedClient.email || ''}{selectedClient.phone ? ` · ${selectedClient.phone}` : ''}
              </p>
            </div>
            <button type="button" onClick={clearOwner} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 14, fontWeight: 700, padding: 0, width: 'auto' }}>✕</button>
          </div>
        ) : (
          <>
            <div
              onClick={() => setShowOwnerDrop(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', border: `1.5px solid ${showOwnerDrop ? 'var(--royal)' : 'var(--border)'}`, borderRadius: 8, background: '#fff', cursor: 'text', boxSizing: 'border-box', transition: 'border-color 0.15s' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5" style={{ flexShrink: 0 }}>
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Search registered client name, email or phone..."
                value={ownerSearch}
                onChange={e => { setOwnerSearch(e.target.value); setShowOwnerDrop(true); }}
                onFocus={() => setShowOwnerDrop(true)}
                style={{ border: 'none', background: 'transparent', fontSize: 13, color: 'var(--text)', outline: 'none', fontFamily: 'inherit', width: '100%' }}
              />
              {ownerSearch && (
                <button type="button" onClick={clearOwner} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 14, padding: 0, width: 'auto' }}>✕</button>
              )}
            </div>

            {showOwnerDrop && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1.5px solid var(--border)', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 9999, maxHeight: 220, overflowY: 'auto', marginTop: 4 }}>
                <div style={{ padding: '7px 12px 5px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{branchLabel} Clients</span>
                  <span style={{ fontSize: 10, color: 'var(--muted)' }}>{filteredClients.length} found</span>
                </div>
                {clients.length === 0 ? (
                  <div style={{ padding: '14px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                    <div style={{ marginBottom: 4 }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                    </div>
                    No clients in {branchLabel} yet.
                  </div>
                ) : filteredClients.length === 0 ? (
                  <div style={{ padding: '14px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                    <div style={{ marginBottom: 4 }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                    </div>
                    No client matching "{ownerSearch}"
                  </div>
                ) : filteredClients.map((c) => (
                  <div key={c.id} onClick={() => selectOwner(c)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)', transition: 'background 0.12s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--light-blue)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--royal)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                      {(c.first_name?.[0] || '?').toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{c.full_name}</p>
                      <p style={{ margin: 0, fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.email || ''}{c.phone ? ` · ${c.phone}` : ''}
                      </p>
                    </div>
                    {c.role && (
                      <span style={{ fontSize: 9, background: '#dbeafe', color: '#1e40af', borderRadius: 4, padding: '2px 5px', fontWeight: 700, flexShrink: 0 }}>
                        {c.role.toUpperCase()}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Layout>
      <style>{SKEL_CSS}</style>

      {/* ══ Success Toast ══ */}
      <div style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 99999,
        background: '#1e293b',
        color: '#fff',
        borderRadius: 10,
        padding: '12px 20px',
        fontSize: 13,
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        boxShadow: '0 8px 24px rgba(0,0,0,0.22)',
        opacity: toast.show ? 1 : 0,
        transform: toast.show ? 'translateY(0)' : 'translateY(12px)',
        transition: 'opacity 0.25s, transform 0.25s',
        pointerEvents: 'none',
        minWidth: 220,
      }}>
        <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
        </span>
        {toast.message}
      </div>
      <div style={S.page}>
        {/* ══ Topbar ══ */}
        <div style={S.topbar}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/icon/walkin.png" alt="" style={{ width: 22, height: 22, filter: 'brightness(0) saturate(100%) invert(17%) sepia(82%) saturate(1200%) hue-rotate(210deg)' }} />
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', margin: 0 }}>Walk-In Registration</h1>
              <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>{branchLabel} — Record walk-in visits</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {seeAllBranches && (
              <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)} style={{ ...S.inp, width: 180 }}>
                <option value="">All Branches</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            )}
            <button className="btn btn-primary" onClick={openAdd} style={S.btn}>+ Register Walk-In</button>
          </div>
        </div>

        {/* ══ Content ══ */}
        <div className="content">
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(195px,1fr))', gap:14, marginBottom:24 }}>
            {loading ? (
              [1, 2, 3].map(i => (
                <div key={i} style={{ background:'#fff', border:'1.5px solid var(--border)', borderRadius:16, padding:20, display:'flex', flexDirection:'column', gap:14 }}>
                  <div className="skel" style={{ width:46, height:46, borderRadius:12 }}/>
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    <Skel w="45%" h={11}/><Skel w="30%" h={26}/><Skel w="60%" h={10}/>
                  </div>
                </div>
              ))
            ) : (
              [
                { label: "Today's Walk-Ins", value: todayWalkins.length,                              icon: '/icon/walkin.png',   color: 'blue',   sub: 'Recorded today' },
                { label: 'Attended',         value: walkins.filter(w => w.status === 'Attended').length, icon: '/icon/attended.png', color: 'green',  sub: 'Visits completed' },
                { label: 'Waiting',          value: walkins.filter(w => w.status === 'Waiting').length,  icon: '/icon/pending.png',  color: 'yellow', sub: walkins.filter(w => w.status === 'Waiting').length > 0 ? 'Currently in queue' : 'Queue clear' },
              ].map((sc, i) => (
                <div key={i} className={`stat-card-v2 ${sc.color}`}>
                  <div style={{ display:'flex', alignItems:'flex-start' }}>
                    <div className={`stat-icon-v2 ${sc.color}`}>
                      <img src={sc.icon} alt="" style={{ width:24, height:24 }}/>
                    </div>
                  </div>
                  <div>
                    <p style={{ margin:0, fontSize:11, fontWeight:600, color:'var(--muted)', textTransform:'uppercase', letterSpacing:0.5 }}>{sc.label}</p>
                    <h3 style={{ margin:'4px 0 6px', fontSize:26, fontWeight:800, lineHeight:1 }}>{sc.value}</h3>
                    <span style={{ fontSize:11, fontWeight:600, color: sc.color==='yellow' && sc.value>0 ? '#d97706' : 'var(--muted)', display:'flex', alignItems:'center', gap:4 }}>
                      {sc.color==='yellow' && sc.value>0 && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
                      {sc.sub}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Grooming alert banner */}
          {(() => {
            const gw = walkins.filter(w => w.purpose === 'Grooming' && w.status === 'Waiting').length;
            if (!gw) return null;
            const isFull = gw >= MAX_GROOMERS;
            return (
              <div style={{ background: isFull ? '#fef2f2' : '#f3e8ff', border: `1.5px solid ${isFull ? '#fecaca' : '#d8b4fe'}`, borderRadius: 10, padding: '12px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><line x1="20" y1="4" x2="8.12" y2="15.88" /><line x1="14.47" y1="14.48" x2="20" y2="20" /><line x1="8.12" y1="8.12" x2="12" y2="12" /></svg>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: isFull ? '#991b1b' : '#6b21a8' }}>
                    {isFull ? `Grooming Fully Booked — Both groomers (${MAX_GROOMERS}/${MAX_GROOMERS}) are currently busy` : `Grooming — ${gw}/${MAX_GROOMERS} groomer${gw > 1 ? 's' : ''} currently occupied`}
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: isFull ? '#b91c1c' : '#7c3aed' }}>
                    {isFull ? 'No grooming walk-ins can be accepted right now.' : `${MAX_GROOMERS - gw} groomer slot${MAX_GROOMERS - gw > 1 ? 's' : ''} still available.`}
                  </p>
                </div>
              </div>
            );
          })()}

          <div style={S.card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 22px', borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ fontSize: 15, fontWeight: 700 }}>Walk-In Records</h2>
              <span style={{ color: 'var(--muted)', fontSize: 13 }}>{walkins.length} total</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              {loading ? (
                <div style={{ padding: '16px 22px' }}>
                  {/* Table header skeleton */}
                  <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                    {['4%', '14%', '18%', '12%', '14%', '10%', '16%'].map((w, i) => (
                      <Skel key={i} w={w} h={13} />
                    ))}
                  </div>
                  {/* Table row skeletons */}
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '13px 0', borderBottom: '1px solid #f1f5f9' }}>
                      <Skel w="4%" h={13} />
                      <div style={{ width: '14%', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <Skel w="80%" h={14} />
                        <Skel w="50%" h={11} />
                      </div>
                      <div style={{ width: '18%', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <Skel w="70%" h={13} />
                        <Skel w="55%" h={10} />
                        <Skel w="60%" h={10} />
                      </div>
                      <Skel w="12%" h={22} />
                      <Skel w="14%" h={13} />
                      <Skel w="10%" h={22} />
                      <div style={{ width: '16%', display: 'flex', gap: 6 }}>
                        <Skel w="48%" h={28} />
                        <Skel w="48%" h={28} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 640 }}>
                  <thead>
                    <tr>{['#', 'Patient', 'Owner', 'Purpose', 'Vet / Service', 'Status', 'Actions'].map(h => (
                      <th key={h} style={S.th}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {walkins.length === 0 ? (
                      <tr><td colSpan={7} style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>No walk-ins recorded yet</td></tr>
                    ) : paginated.map((w, i) => {
                      const purposeIcons = {
                        Grooming: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><line x1="20" y1="4" x2="8.12" y2="15.88" /><line x1="14.47" y1="14.48" x2="20" y2="20" /><line x1="8.12" y1="8.12" x2="12" y2="12" /></svg>,
                        Emergency: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>,
                        Checkup: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>,
                        Vaccination: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m18 2 4 4" /><path d="m17 7 3-3" /><path d="M19 9 8.7 19.3a1 1 0 0 1-1.4 0l-3-3a1 1 0 0 1 0-1.4L14 5" /><path d="m9 11 4 4" /><path d="m5 19-3 3" /><path d="m14 4 6 6" /></svg>,
                        Dental: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2a5 5 0 0 1 5 5c0 5-5 13-5 13S7 12 7 7a5 5 0 0 1 5-5z" /></svg>,
                        Other: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>,
                      };
                      const purposeStyle = {
                        Grooming: { bg: '#f3e8ff', color: '#7c3aed' },
                        Emergency: { bg: '#fee2e2', color: '#dc2626' },
                        Checkup: { bg: '#eff6ff', color: '#1e40af' },
                        Vaccination: { bg: '#f0fdf4', color: '#166534' },
                        Dental: { bg: '#fef3c7', color: '#92400e' },
                        Other: { bg: '#f1f5f9', color: '#475569' },
                      }[w.purpose] || { bg: '#f1f5f9', color: '#475569' };
                      const ownerInitials = (w.owner || '?').split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase();
                      return (
                        <tr key={w.id} className="wk-row-hover" style={{ background: '#fff', transition: 'background 0.15s' }}>
                          <td style={S.td}>
                            <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>{i + 1}</span>
                          </td>
                          <td style={S.td}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                              <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, background: w.species === 'Cat' ? '#f0fdf4' : '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {w.species === 'Cat'
                                  ? <svg width="16" height="16" viewBox="0 0 16 16" fill="#16a34a" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" clipRule="evenodd" d="M1 7L4.80061 1.43926C5.56059 0.527292 6.68638 0 7.8735 0H8V4L12 5L15 10L14.1875 11.2188C13.4456 12.3316 12.1967 13 10.8593 13H9L7 16H5L1 7ZM10 9C10.5523 9 11 8.55229 11 8C11 7.44772 10.5523 7 10 7C9.44771 7 9 7.44772 9 8C9 8.55229 9.44771 9 10 9Z" /><path d="M10 0.465878V2.43845L12 2.93845V0H11.8735C11.2125 0 10.5704 0.163501 10 0.465878Z" /></svg>
                                  : <svg width="16" height="16" viewBox="0 0 16 16" fill="#1d4ed8" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" clipRule="evenodd" d="M16 4V7C16 9.20914 14.2091 11 12 11H10V15H0V13L0.931622 10.8706C1.25226 10.9549 1.59036 11 1.94124 11C3.74931 11 5.32536 9.76947 5.76388 8.01538L3.82359 7.53031C3.60766 8.39406 2.83158 9.00001 1.94124 9.00001C1.87789 9.00001 1.81539 8.99702 1.75385 8.99119C1.02587 8.92223 0.432187 8.45551 0.160283 7.83121C0.0791432 7.64491 0.0266588 7.44457 0.00781272 7.23658C-0.0112323 7.02639 0.00407892 6.80838 0.0588889 6.58914C0.0588882 6.58914 0.0588896 6.58913 0.0588889 6.58914L0.698705 4.02986C1.14387 2.24919 2.7438 1 4.57928 1H10L12 4H16ZM9 6C9.55229 6 10 5.55228 10 5C10 4.44772 9.55229 4 9 4C8.44771 4 8 4.44772 8 5C8 5.55228 8.44771 6 9 6Z" /></svg>
                                }
                              </div>
                              <div>
                                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{w.patient}</div>
                                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{w.species}</div>
                              </div>
                            </div>
                          </td>
                          <td style={S.td}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: w.owner_id ? 'var(--royal)' : 'var(--bg)', border: '1.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: w.owner_id ? '#fff' : 'var(--muted)' }}>
                                {ownerInitials}
                              </div>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{w.owner || '—'}</div>
                                <div style={{ fontSize: 10, color: w.owner_id ? 'var(--royal)' : 'var(--muted)', fontWeight: 600, marginTop: 1 }}>
                                  {w.owner_id ? (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                      <svg width="9" height="9" viewBox="0 0 24 24" fill="var(--royal)" stroke="none"><circle cx="12" cy="12" r="6" /></svg> Registered Client
                                    </span>
                                  ) : (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="5" r="2" /><path d="M12 22V12m0 0l-3 3m3-3l3 3" /><path d="M9 9H5m14 0h-4" /></svg> Walk-in Guest
                                    </span>
                                  )}
                                </div>
                                {w.contact && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{w.contact}</div>}
                              </div>
                            </div>
                          </td>
                          <td style={S.td}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: purposeStyle.bg, color: purposeStyle.color, borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>
                              {purposeIcons[w.purpose] || purposeIcons.Other} {w.purpose}
                            </span>
                          </td>
                          <td style={S.td}>
                            {w.purpose === 'Grooming'
                              ? <span style={{ fontSize: 11, background: '#f3e8ff', color: '#7c3aed', borderRadius: 20, padding: '3px 10px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round"><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><line x1="20" y1="4" x2="8.12" y2="15.88" /><line x1="14.47" y1="14.48" x2="20" y2="20" /><line x1="8.12" y1="8.12" x2="12" y2="12" /></svg>
                                Grooming Team
                              </span>
                              : <span style={{ fontSize: 13, color: 'var(--text)' }}>{w.vet || <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>Unassigned</span>}</span>
                            }
                          </td>
                          <td style={S.td}><span className={`badge ${STATUS_BADGE[w.status] || 'badge-gray'}`}>{w.status}</span></td>
                          <td style={S.td}>
                            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                              {w.status === 'Waiting' && (
                                <button className="btn btn-ghost btn-sm" style={{ ...S.btn, fontSize: 12, color: 'var(--success)', display: 'inline-flex', alignItems: 'center', gap: 4 }} onClick={() => updateStatus(w.id, 'Attended')}>
                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg> Attended
                                </button>
                              )}
                              {w.status === 'Waiting' && <button className="btn btn-ghost btn-sm" style={{ ...S.btn, fontSize: 12, color: 'var(--danger)' }} onClick={() => updateStatus(w.id, 'Cancelled')}>Cancel</button>}
                              <button className="btn btn-ghost btn-sm" style={{ ...S.btn, fontSize: 12 }} onClick={() => openEdit(w)}>Edit</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
            {totalPages > 1 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, padding: "14px 18px", borderTop: "1px solid var(--border)" }}>
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage === 1} style={{ padding: "6px 14px", borderRadius: 20, border: "1.5px solid var(--border)", background: "transparent", fontSize: 13, fontWeight: 600, color: safePage === 1 ? "var(--muted)" : "var(--text)", cursor: safePage === 1 ? "default" : "pointer", fontFamily: "inherit" }}>prev</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(pg => (
                  <button key={pg} onClick={() => setCurrentPage(pg)} style={{ width: 34, height: 34, borderRadius: 20, border: "1.5px solid", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s", background: safePage === pg ? "var(--royal)" : "transparent", color: safePage === pg ? "#fff" : "var(--text)", borderColor: safePage === pg ? "var(--royal)" : "var(--border)" }}>{pg}</button>
                ))}
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} style={{ padding: "6px 14px", borderRadius: 20, border: "1.5px solid var(--border)", background: "transparent", fontSize: 13, fontWeight: 600, color: safePage === totalPages ? "var(--muted)" : "var(--text)", cursor: safePage === totalPages ? "default" : "pointer", fontFamily: "inherit" }}>next</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══ Modal ══ */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>

            {/* Clipboard bar */}
            <div className="wk-clipboard-bar" style={{ flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 48, height: 18, background: 'rgba(255,255,255,0.25)', borderRadius: 4, border: '2px solid rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 20, height: 8, background: 'rgba(255,255,255,0.4)', borderRadius: 2 }} />
                </div>
              </div>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'rgba(255,255,255,0.75)', lineHeight: 1, padding: '2px 6px' }}>✕</button>
            </div>

            {/* Record header */}
            <div style={{ background: 'var(--bg, #f8fafc)', borderBottom: '2px solid var(--border, #e2e8f0)', padding: '14px 24px 12px', textAlign: 'center', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 4 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--royal)" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--text, #1e293b)', letterSpacing: '0.3px' }}>
                  {editItem ? 'Edit Walk-In Record' : 'Walk-In Registration'}
                </h3>
              </div>
              <p style={{ margin: 0, fontSize: 11, color: '#64748b', letterSpacing: '0.5px' }}>
                {editItem ? `Updating: ${editItem.patient}` : 'Fill in the visit details below'}
              </p>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>

              {/* ── Section: Patient ── */}
              <div style={{ borderBottom: '1.5px solid #e2e8f0' }}>
                <div className="wk-section-label">Patient Information</div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', borderBottom: '1px solid #e2e8f0' }}>
                  <div style={{ padding: '10px 16px', borderRight: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>Patient Name <span style={{ color: '#ef4444' }}>*</span></div>
                    <input type="text" value={form.patient} onChange={e => setForm({ ...form, patient: e.target.value })} placeholder="Pet name"
                      style={{ width: '100%', border: 'none', borderBottom: '1.5px solid #cbd5e1', background: 'transparent', fontSize: 13, fontWeight: 600, color: 'var(--text, #1e293b)', outline: 'none', padding: '2px 0', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ padding: '10px 16px' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>Species</div>
                    <CustomSelect
                      value={form.species}
                      onChange={val => setForm({ ...form, species: val })}
                      options={['Dog', 'Cat']}
                      placeholder="— Select Species —"
                    />
                  </div>
                </div>
              </div>

              {/* ── Section: Owner ── */}
              <div style={{ borderBottom: '1.5px solid #e2e8f0', position: 'relative', zIndex: showOwnerDrop ? 200 : 'auto' }}>
                <div className="wk-section-label">Owner / Client</div>
                <div style={{ padding: '12px 16px' }}>

                  {/* Toggle */}
                  <div style={{ display: 'flex', border: '1.5px solid var(--border)', borderRadius: 8, overflow: 'hidden', marginBottom: 12, width: 'fit-content' }}>
                    {[{ key: 'walkin', label: 'Walk-in Guest' }, { key: 'registered', label: 'Registered Client' }].map(({ key, label }) => (
                      <button key={key} type="button" onClick={() => { setOwnerType(key); clearOwner(); }}
                        style={{ padding: '7px 18px', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s', background: ownerType === key ? 'var(--royal)' : '#fff', color: ownerType === key ? '#fff' : 'var(--muted)' }}>
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* Walk-in Guest inputs */}
                  {ownerType === 'walkin' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>Full Name <span style={{ color: '#ef4444' }}>*</span></div>
                        <input type="text" placeholder="e.g. Juan dela Cruz" value={form.owner}
                          onChange={e => setForm(prev => ({ ...prev, owner: e.target.value, owner_id: null }))}
                          style={{ width: '100%', border: 'none', borderBottom: '1.5px solid #cbd5e1', background: 'transparent', fontSize: 13, fontWeight: 600, color: 'var(--text, #1e293b)', outline: 'none', padding: '2px 0', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>Contact</div>
                        <input type="text" placeholder="e.g. 09xx-xxx-xxxx" value={form.contact}
                          onChange={e => setForm(prev => ({ ...prev, contact: e.target.value }))}
                          style={{ width: '100%', border: 'none', borderBottom: '1.5px solid #cbd5e1', background: 'transparent', fontSize: 13, fontWeight: 600, color: 'var(--text, #1e293b)', outline: 'none', padding: '2px 0', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                      </div>
                    </div>
                  )}

                  {/* Registered Client dropdown */}
                  {ownerType === 'registered' && (
                    <div ref={ownerRef} style={{ position: 'relative' }}>
                      {selectedClient ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 8, padding: '9px 12px' }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--royal)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                            {(selectedClient.first_name?.[0] || '?').toUpperCase()}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#166534' }}>{selectedClient.full_name}</p>
                            <p style={{ margin: 0, fontSize: 11, color: '#16a34a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {selectedClient.email || ''}{selectedClient.phone ? ` · ${selectedClient.phone}` : ''}
                            </p>
                          </div>
                          <button type="button" onClick={clearOwner} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 14, fontWeight: 700, padding: 0, width: 'auto' }}>✕</button>
                        </div>
                      ) : (
                        <>
                          <div onClick={() => setShowOwnerDrop(true)}
                            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', border: `1.5px solid ${showOwnerDrop ? 'var(--royal)' : 'var(--border)'}`, borderRadius: 8, background: '#fff', cursor: 'text', boxSizing: 'border-box', transition: 'border-color 0.15s' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5" style={{ flexShrink: 0 }}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                            <input type="text" placeholder="Search by name, email or phone..." value={ownerSearch}
                              onChange={e => { setOwnerSearch(e.target.value); setShowOwnerDrop(true); }}
                              onFocus={() => setShowOwnerDrop(true)}
                              style={{ border: 'none', background: 'transparent', fontSize: 13, color: 'var(--text)', outline: 'none', fontFamily: 'inherit', width: '100%' }} />
                            {ownerSearch && <button type="button" onClick={clearOwner} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 14, padding: 0, width: 'auto' }}>✕</button>}
                          </div>
                          {showOwnerDrop && (
                            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1.5px solid var(--border)', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 9999, maxHeight: 220, overflowY: 'auto', marginTop: 4 }}>
                              <div style={{ padding: '7px 12px 5px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{branchLabel} Clients</span>
                                <span style={{ fontSize: 10, color: 'var(--muted)' }}>{filteredClients.length} found</span>
                              </div>
                              {clients.length === 0 ? (
                                <div style={{ padding: '14px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}><div style={{ marginBottom: 4 }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg></div>No clients in {branchLabel} yet.</div>
                              ) : filteredClients.length === 0 ? (
                                <div style={{ padding: '14px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}><div style={{ marginBottom: 4 }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg></div>No client matching "{ownerSearch}"</div>
                              ) : filteredClients.map((c) => (
                                <div key={c.id} onClick={() => selectOwner(c)}
                                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)', transition: 'background 0.12s' }}
                                  onMouseEnter={e => e.currentTarget.style.background = 'var(--light-blue)'}
                                  onMouseLeave={e => e.currentTarget.style.background = ''}>
                                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--royal)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                                    {(c.first_name?.[0] || '?').toUpperCase()}
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{c.full_name}</p>
                                    <p style={{ margin: 0, fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.email || ''}{c.phone ? ` · ${c.phone}` : ''}</p>
                                  </div>
                                  {c.role && <span style={{ fontSize: 9, background: '#dbeafe', color: '#1e40af', borderRadius: 4, padding: '2px 5px', fontWeight: 700, flexShrink: 0 }}>{c.role.toUpperCase()}</span>}
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* ── Section: Visit Details ── */}
              <div style={{ borderBottom: '1.5px solid #e2e8f0' }}>
                <div className="wk-section-label">Visit Details</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #e2e8f0' }}>
                  <div style={{ padding: '10px 16px', borderRight: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>Purpose</div>
                    <CustomSelect
                      value={form.purpose}
                      onChange={val => setForm({ ...form, purpose: val, vet: val === 'Grooming' ? '' : form.vet })}
                      options={['Checkup', 'Vaccination', 'Emergency', 'Grooming', 'Dental', 'Other']}
                      placeholder="— Select Purpose —"
                    />
                  </div>
                  <div style={{ padding: '10px 16px' }}>
                    {!isGrooming ? (
                      <>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>Assign Vet</div>
                        <CustomSelect
                          value={form.vet}
                          onChange={val => setForm({ ...form, vet: val })}
                          options={VETS}
                          placeholder="Unassigned"
                        />
                      </>
                    ) : (
                      <div style={{ paddingTop: 4 }}>
                        <div style={{ background: '#f3e8ff', border: '1px solid #d8b4fe', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#6b21a8', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round"><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><line x1="20" y1="4" x2="8.12" y2="15.88" /><line x1="14.47" y1="14.48" x2="20" y2="20" /><line x1="8.12" y1="8.12" x2="12" y2="12" /></svg>
                          <strong>Grooming</strong> — handled by our {MAX_GROOMERS} groomers.
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status row — edit only */}
                {editItem && (
                  <div style={{ padding: '10px 16px', borderBottom: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>Status</div>
                    <CustomSelect
                      value={form.status}
                      onChange={val => setForm({ ...form, status: val })}
                      options={['Waiting', 'Attended', 'Cancelled']}
                      placeholder="— Select Status —"
                    />
                  </div>
                )}
              </div>

              {/* ── Section: Notes ── */}
              <div style={{ borderBottom: '1.5px solid #e2e8f0' }}>
                <div className="wk-section-label">Notes / Remarks</div>
                <div style={{ padding: '12px 16px', minHeight: 70 }}>
                  <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                    placeholder="Additional notes, symptoms, or special instructions..."
                    style={{
                      width: '100%', border: 'none', background: 'transparent', fontSize: 13, color: 'var(--text)', outline: 'none', resize: 'vertical', minHeight: 60, fontFamily: 'inherit', lineHeight: 1.8, boxSizing: 'border-box',
                      backgroundImage: 'repeating-linear-gradient(transparent, transparent 27px, rgba(147,197,253,0.25) 27px, rgba(147,197,253,0.25) 28px)',
                    }} />
                </div>
              </div>

              {/* Conflict alerts */}
              {conflictType === 'grooming' && (
                <div style={{ margin: '0 16px 16px', background: '#fef3c7', border: '1.5px solid #fcd34d', borderRadius: 8, padding: '12px 16px', fontSize: 13 }}>
                  <p style={{ margin: 0, fontWeight: 700, color: '#92400e', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#92400e" strokeWidth="2" strokeLinecap="round"><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><line x1="20" y1="4" x2="8.12" y2="15.88" /><line x1="14.47" y1="14.48" x2="20" y2="20" /><line x1="8.12" y1="8.12" x2="12" y2="12" /></svg>
                    Grooming Fully Booked Right Now
                  </p>
                  <p style={{ margin: '4px 0 0', color: '#b45309' }}>Both groomers ({MAX_GROOMERS}/{MAX_GROOMERS}) are currently busy.</p>
                </div>
              )}
              {isGrooming && !conflictType && (
                <div style={{ margin: '0 16px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#15803d', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="2" strokeLinecap="round"><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><line x1="20" y1="4" x2="8.12" y2="15.88" /><line x1="14.47" y1="14.48" x2="20" y2="20" /><line x1="8.12" y1="8.12" x2="12" y2="12" /></svg>
                  <span><strong>{MAX_GROOMERS - groomingUsed} of {MAX_GROOMERS}</strong> groomer slot{(MAX_GROOMERS - groomingUsed) !== 1 ? 's' : ''} available.</span>
                </div>
              )}

              {/* Footer note */}
              <div style={{ padding: '8px 16px', background: 'var(--bg, #f8fafc)', borderTop: '1px solid var(--border, #e2e8f0)' }}>
                <p style={{ margin: 0, fontSize: 10, color: '#94a3b8', textAlign: 'right', fontStyle: 'italic' }}>Walk-In Registration System</p>
              </div>
            </div>

            {/* Modal footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 24px', borderTop: '2px solid #e2e8f0', background: '#f8fafc', flexShrink: 0 }}>
              <button className="btn btn-ghost" style={S.btn} onClick={closeModal}>Cancel</button>
              <button className="btn btn-primary"
                style={{ ...S.btn, background: '#0f172a', borderColor: '#0f172a', opacity: conflictType ? 0.5 : 1, cursor: conflictType ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                onClick={saveWalkin} disabled={saving || !!conflictType}>
                {saving ? 'Saving...' : (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                    {editItem ? 'Save Changes' : 'Register Walk-In'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Walkin;