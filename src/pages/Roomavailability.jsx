// RoomAvailability.jsx
import React, { useState, useEffect } from 'react';
import Layout from '../components/layout';
import { supabase } from '../js/supabase';
import { useCurrentUser } from '../js/useCurrentUser';

/* ─── Styles ──────────────────────────────────────────────────────────────── */
const STYLES = `
@keyframes shimmer {
  0%   { background-position: -600px 0 }
  100% { background-position:  600px 0 }
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.5; transform: scale(0.75); }
}
.skel {
  background: linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%);
  background-size: 600px 100%;
  animation: shimmer 1.4s infinite linear;
  border-radius: 8px;
  display: block;
}
.room-card {
  background: #fff;
  border-radius: 16px;
  border: 1.5px solid var(--border);
  padding: 0;
  cursor: pointer;
  transition: transform 0.18s, box-shadow 0.18s, border-color 0.18s;
  overflow: hidden;
  animation: fadeIn 0.25s ease both;
}
.room-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 28px rgba(30,58,138,0.13);
}
.room-card.available { border-color: #86efac; }
.room-card.occupied  { border-color: #93c5fd; }
.room-card.quarantine{ border-color: #fca5a5; }
.room-card.cleaning  { border-color: #fde68a; }

.room-status-bar {
  height: 5px;
  border-radius: 0;
}
.room-status-bar.available  { background: linear-gradient(90deg,#16a34a,#22c55e); }
.room-status-bar.occupied   { background: linear-gradient(90deg,#1e3a8a,#3b82f6); }
.room-status-bar.quarantine { background: linear-gradient(90deg,#dc2626,#ef4444); }
.room-status-bar.cleaning   { background: linear-gradient(90deg,#d97706,#f59e0b); }

.status-pill {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 11px; font-weight: 700;
  padding: 3px 10px; border-radius: 99px;
}
.status-pill.available  { background:#dcfce7; color:#15803d; }
.status-pill.occupied   { background:#dbeafe; color:#1e40af; }
.status-pill.quarantine { background:#fee2e2; color:#b91c1c; }
.status-pill.cleaning   { background:#fef9c3; color:#92400e; }

.status-dot {
  width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0;
}
.status-dot.available  { background:#16a34a; }
.status-dot.occupied   { background:#2563eb; animation: pulse-dot 1.5s infinite; }
.status-dot.quarantine { background:#dc2626; animation: pulse-dot 1s infinite; }
.status-dot.cleaning   { background:#d97706; }

.room-action-btn {
  flex: 1; padding: 8px 0; border: none; border-radius: 8px;
  font-size: 12px; font-weight: 700; cursor: pointer;
  font-family: inherit; transition: filter 0.15s, transform 0.1s;
  display: flex; align-items: center; justify-content: center; gap: 5px;
}
.room-action-btn:hover { filter: brightness(0.93); transform: scale(0.97); }

.view-field-row {
  display: flex; gap: 0;
  border-bottom: 1px solid #f1f5f9;
}
.view-field-row:last-child { border-bottom: none; }
.view-field-label {
  font-size: 10px; font-weight: 800; text-transform: uppercase;
  letter-spacing: 1px; color: #94a3b8; min-width: 120px;
  padding: 10px 16px; background: #f8fafc;
  display: flex; align-items: center;
  border-right: 1px solid #f1f5f9;
}
.view-field-value {
  font-size: 13px; font-weight: 600; color: var(--text);
  padding: 10px 16px; flex: 1; display: flex; align-items: center;
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
  cursor: pointer;
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
.stat-card-v2.green::before  { background: linear-gradient(90deg,#16a34a,#22c55e); }
.stat-card-v2.blue::before   { background: linear-gradient(90deg,#1e3a8a,#3b82f6); }
.stat-card-v2.red::before    { background: linear-gradient(90deg,#dc2626,#ef4444); }
.stat-card-v2.yellow::before { background: linear-gradient(90deg,#d97706,#f59e0b); }
.stat-card-v2 .stat-icon-v2 {
  width: 46px; height: 46px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.stat-card-v2 .stat-icon-v2.green  { background: #f0fdf4; }
.stat-card-v2 .stat-icon-v2.blue   { background: #eff6ff; }
.stat-card-v2 .stat-icon-v2.red    { background: #fff1f2; }
.stat-card-v2 .stat-icon-v2.yellow { background: #fffbeb; }
.stat-card-v2 .stat-icon-v2.green  img { filter: brightness(0) saturate(100%) invert(32%) sepia(80%) saturate(600%) hue-rotate(110deg) brightness(0.9); }
.stat-card-v2 .stat-icon-v2.blue   img { filter: brightness(0) saturate(100%) invert(17%) sepia(82%) saturate(1200%) hue-rotate(210deg); }
.stat-card-v2 .stat-icon-v2.red    img { filter: brightness(0) saturate(100%) invert(20%) sepia(90%) saturate(1200%) hue-rotate(340deg) brightness(0.9); }
.stat-card-v2 .stat-icon-v2.yellow img { filter: brightness(0) saturate(100%) invert(52%) sepia(90%) saturate(600%) hue-rotate(10deg) brightness(0.9); }
`;

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
const Skel = ({ w = '100%', h = 16 }) => (
  <span className="skel" style={{ width: w, height: h }} />
);

const statusKey = (s) => (s || 'available').toLowerCase().replace(/\s+/g, '');

const STATUS_LABEL = { Available: 'Available', Occupied: 'Occupied', Quarantine: 'Quarantine', Cleaning: 'Cleaning' };
const STATUS_COLOR = { Available: '#16a34a', Occupied: '#1e3a8a', Quarantine: '#dc2626', Cleaning: '#d97706' };

const StatusPill = ({ status }) => (
  <span className={`status-pill ${statusKey(status)}`}>
    <span className={`status-dot ${statusKey(status)}`} />
    {status}
  </span>
);

/* ─── Room Card ───────────────────────────────────────────────────────────── */
const RoomCard = ({ room, onView }) => {
  const sk = statusKey(room.status);
  const isOccupied = room.status !== 'Available';
  return (
    <div className={`room-card ${sk}`} onClick={() => onView(room)}>
      <div className={`room-status-bar ${sk}`} />
      <div style={{ padding: '14px 16px 12px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>
              {room.number}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, fontWeight: 600 }}>
              {room.type || 'General'}{room.infected ? ' · 🔴 Isolation' : ''}
            </div>
          </div>
          <StatusPill status={room.status} />
        </div>

        {/* Patient info */}
        {isOccupied && room.patient ? (
          <div style={{ background: '#f8fafc', borderRadius: 8, padding: '8px 10px', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: STATUS_COLOR[room.status] + '22', border: `1.5px solid ${STATUS_COLOR[room.status]}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={STATUS_COLOR[room.status]} strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{room.patient}</div>
            </div>
            {room.diagnosis && (
              <div style={{ fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={room.diagnosis}>
                {room.diagnosis}
              </div>
            )}
          </div>
        ) : (
          <div style={{ padding: '8px 0', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: '#86efac', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#86efac" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
              Ready for admission
            </span>
          </div>
        )}

        {/* Footer hint */}
        <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, letterSpacing: '0.3px', textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3 }}>
          Click to manage
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
        </div>
      </div>
    </div>
  );
};

/* ─── Skeleton Cards ──────────────────────────────────────────────────────── */
const CardSkel = () => (
  <div style={{ background: '#fff', borderRadius: 16, border: '1.5px solid #e2e8f0', overflow: 'hidden' }}>
    <div style={{ height: 5, background: '#e2e8f0' }} />
    <div style={{ padding: '14px 16px 12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <div><Skel w={60} h={20} /><div style={{ marginTop: 6 }}><Skel w={80} h={11} /></div></div>
        <Skel w={80} h={22} />
      </div>
      <div style={{ background: '#f8fafc', borderRadius: 8, padding: '8px 10px', marginBottom: 8 }}>
        <Skel w="70%" h={13} />
        <div style={{ marginTop: 6 }}><Skel w="50%" h={11} /></div>
      </div>
    </div>
  </div>
);

const StatCardSkeleton = () => (
  <div style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 14, pointerEvents: 'none' }}>
    <div className="skel" style={{ width: 46, height: 46, borderRadius: 12 }} />
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <Skel w="45%" h={11} />
      <Skel w="30%" h={26} />
      <Skel w="60%" h={10} />
    </div>
  </div>
);

/* ─── View Modal ──────────────────────────────────────────────────────────── */
const ViewModal = ({ room, onClose, onEdit, onDelete }) => {
  if (!room) return null;
  const sk = statusKey(room.status);
  const color = STATUS_COLOR[room.status] || '#64748b';

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.52)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 460, boxShadow: '0 24px 64px rgba(0,0,0,0.28)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        {/* Top color bar */}
        <div style={{ height: 6, background: `linear-gradient(90deg,${color},${color}99)` }} />

        {/* Header */}
        <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 50, height: 50, borderRadius: 14, background: color + '18', border: `2px solid ${color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
              {room.infected
                ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                : room.status === 'Available'
                  ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                  : room.status === 'Occupied'
                    ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1e3a8a" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                    : room.status === 'Quarantine'
                      ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                      : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
              }
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>Room {room.number}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                {room.type || 'General Ward'}{room.infected ? ' · Isolation' : ''}
              </div>
              <div style={{ marginTop: 6 }}><StatusPill status={room.status} /></div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--muted)', lineHeight: 1, padding: '2px 4px' }}>✕</button>
        </div>

        {/* Fields */}
        <div style={{ flex: 1 }}>
          {[
            { label: 'Room Number', value: room.number },
            { label: 'Type', value: room.type || 'General' },
            { label: 'Status', value: <StatusPill status={room.status} /> },
            { label: 'Isolation', value: room.infected ? 'Yes — Isolation / Infected' : 'No' },
            { label: 'Patient', value: room.patient || '— No patient assigned —' },
            { label: 'Diagnosis', value: room.diagnosis || '— None —' },
          ].map(({ label, value }) => (
            <div key={label} className="view-field-row">
              <div className="view-field-label">{label}</div>
              <div className="view-field-value">{value}</div>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
          <button className="room-action-btn" style={{ background: '#eff6ff', color: '#1e40af' }} onClick={onEdit}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg> Edit Room
          </button>
          <button className="room-action-btn" style={{ background: '#fef2f2', color: '#dc2626' }} onClick={onDelete}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg> Delete
          </button>
          <button className="room-action-btn" style={{ background: '#f1f5f9', color: '#475569' }} onClick={onClose}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg> Close
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Add / Edit Modal (PatientRecord style) ─────────────────────────────── */
const RoomFormModal = ({ editRoom, form, setForm, onSave, onClose, saving }) => {
  const isEdit = !!editRoom;
  const fieldStyle = {
    width: '100%', border: 'none', borderBottom: '1.5px solid #cbd5e1',
    background: 'transparent', fontSize: 13, fontWeight: 600,
    color: 'var(--text)', outline: 'none', padding: '2px 0',
    fontFamily: 'inherit', boxSizing: 'border-box',
  };
  const selectStyle = { ...fieldStyle };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.52)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16, overflowY: 'auto' }}>
      <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 580, maxHeight: 'calc(100vh - 32px)', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.28)', overflow: 'hidden', margin: 'auto' }}>

        {/* ── Clipboard top bar ── */}
        <div style={{ background: 'linear-gradient(135deg, #0f172a, #1e3a8a)', padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: '14px 14px 0 0', flexShrink: 0 }}>
          <div style={{ width: 48, height: 18, background: 'rgba(255,255,255,0.25)', borderRadius: 4, border: '2px solid rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 20, height: 8, background: 'rgba(255,255,255,0.4)', borderRadius: 2 }} />
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'rgba(255,255,255,0.75)', lineHeight: 1, padding: '2px 6px' }}>✕</button>
        </div>

        {/* ── Record header ── */}
        <div style={{ background: 'var(--bg)', borderBottom: '2px solid var(--border)', padding: '14px 24px 12px', textAlign: 'center', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: '#eff6ff', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1e40af" strokeWidth="2" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
            </div>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--text)', letterSpacing: '0.3px' }}>
              {isEdit ? `Update Room ${editRoom.number}` : 'New Room Record'}
            </h3>
          </div>
          <p style={{ margin: 0, fontSize: 11, color: 'var(--muted)' }}>
            {isEdit ? 'Edit room details and current occupancy status' : 'Register a new room or ward to the system'}
          </p>
        </div>

        {/* ── Body ── */}
        <div style={{ overflowY: 'auto', flex: 1 }}>

          {/* Section 1: Room Identity */}
          <div style={{ borderBottom: '1.5px solid #e2e8f0' }}>
            <div style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', padding: '6px 16px' }}>
              <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: '#64748b' }}>Room Identity</span>
            </div>

            {/* Row: Number · Type */}
            <div style={{ display: 'grid', gridTemplateColumns: isEdit ? '1fr' : '1fr 1fr', borderBottom: '1px solid #e2e8f0' }}>
              {!isEdit && (
                <div style={{ padding: '10px 16px', borderRight: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>
                    Room Number <span style={{ color: '#ef4444' }}>*</span>
                  </div>
                  <input
                    type="text" value={form.number || ''}
                    onChange={e => setForm({ ...form, number: e.target.value })}
                    placeholder="e.g. 101"
                    style={fieldStyle}
                  />
                </div>
              )}
              <div style={{ padding: '10px 16px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>Ward Type</div>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} style={selectStyle}>
                  <option>General</option><option>Isolation</option><option>ICU</option><option>Recovery</option>
                </select>
              </div>
            </div>

            {/* Row: Status · Isolation */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
              <div style={{ padding: '10px 16px', borderRight: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>Status</div>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={selectStyle}>
                  <option>Available</option><option>Occupied</option><option>Quarantine</option><option>Cleaning</option>
                </select>
              </div>
              <div style={{ padding: '10px 16px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>Isolation / Infected</div>
                <select value={form.infected ? 'yes' : 'no'} onChange={e => setForm({ ...form, infected: e.target.value === 'yes' })} style={selectStyle}>
                  <option value="no">No</option><option value="yes">Yes — Isolation</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Occupant */}
          <div style={{ borderBottom: '1.5px solid #e2e8f0' }}>
            <div style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', padding: '6px 16px' }}>
              <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: '#64748b' }}>Current Occupant</span>
            </div>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>Patient Name</div>
              <input
                type="text" value={form.patient || ''}
                onChange={e => setForm({ ...form, patient: e.target.value })}
                placeholder="Leave blank if unoccupied"
                style={fieldStyle}
              />
            </div>
          </div>

          {/* Section 3: Diagnosis / Notes */}
          <div style={{ borderBottom: '1.5px solid #e2e8f0' }}>
            <div style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', padding: '6px 16px' }}>
              <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: '#64748b' }}>Diagnosis / Notes</span>
            </div>
            <div style={{ padding: '12px 16px', minHeight: 70 }}>
              <textarea
                value={form.diagnosis || ''}
                onChange={e => setForm({ ...form, diagnosis: e.target.value })}
                placeholder="Describe the condition, reason for occupancy, or any notes..."
                style={{
                  width: '100%', border: 'none', background: 'transparent',
                  fontSize: 13, color: 'var(--text)', outline: 'none',
                  resize: 'vertical', minHeight: 64, fontFamily: 'inherit',
                  lineHeight: 1.8, boxSizing: 'border-box',
                  backgroundImage: 'repeating-linear-gradient(transparent,transparent 27px,rgba(147,197,253,0.25) 27px,rgba(147,197,253,0.25) 28px)',
                }}
              />
            </div>
          </div>

          {/* Footer watermark */}
          <div style={{ padding: '6px 16px', background: 'var(--bg)' }}>
            <p style={{ margin: 0, fontSize: 10, color: 'var(--muted)', textAlign: 'right', fontStyle: 'italic' }}>Angeles Animal Care Hospital</p>
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 24px', borderTop: '2px solid #e2e8f0', background: '#f8fafc', flexShrink: 0 }}>
          <button className="btn btn-ghost" style={{ width: 'auto' }} onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            style={{ width: 'auto', background: '#0f172a', borderColor: '#0f172a', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            onClick={onSave} disabled={saving}
          >
            {saving ? 'Saving...' : (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                {isEdit ? 'Save Changes' : 'Create Room'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Confirm Modal ───────────────────────────────────────────────────────── */
const ConfirmModal = ({ show, title, message, onConfirm, onCancel, confirmColor = '#dc2626', confirmText = 'Confirm' }) => {
  if (!show) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.52)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.28)', overflow: 'hidden' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{title}</h3>
        </div>
        <div style={{ padding: '16px 22px' }}>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--muted)' }}>{message}</p>
        </div>
        <div style={{ padding: '12px 22px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button className="btn btn-ghost" style={{ width: 'auto' }} onClick={onCancel}>Cancel</button>
          <button className="btn" style={{ width: 'auto', background: confirmColor, color: '#fff', border: 'none' }} onClick={onConfirm}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
};

/* ─── Toast ───────────────────────────────────────────────────────────────── */
const Toast = ({ message, show, type = 'success' }) => {
  const c = { success: { bg: '#1e293b', dot: '#22c55e' }, error: { bg: '#7f1d1d', dot: '#ef4444' }, info: { bg: '#1e3a8a', dot: '#60a5fa' } }[type] || {};
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 99999, background: c.bg, color: '#fff', borderRadius: 10, padding: '11px 18px', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.22)', opacity: show ? 1 : 0, transform: show ? 'translateY(0)' : 'translateY(10px)', transition: 'opacity 0.25s,transform 0.25s', pointerEvents: 'none', minWidth: 220 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.dot, display: 'inline-block', flexShrink: 0 }} />
      {message}
    </div>
  );
};

/* ─── Main Component ──────────────────────────────────────────────────────── */
const RoomAvailability = () => {
  const { user, isAdmin, seeAllBranches, loading: userLoading } = useCurrentUser();

  const [branchFilter, setBranchFilter] = useState('');
  const [branches, setBranches] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');

  // Modals
  const [viewRoom, setViewRoom] = useState(null);       // view modal
  const [formRoom, setFormRoom] = useState(null);       // add/edit modal (null = closed, false = new, obj = edit)
  const [form, setForm] = useState({ number: '', type: 'General', status: 'Available', patient: '', diagnosis: '', infected: false });
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState({ show: false });

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const toastTimer = React.useRef(null);

  const showToast = (message, type = 'success') => {
    clearTimeout(toastTimer.current);
    setToast({ show: true, message, type });
    toastTimer.current = setTimeout(() => setToast(t => ({ ...t, show: false })), 3000);
  };

  useEffect(() => {
    if (!seeAllBranches) return;
    supabase.from('branches').select('id,name').order('name').then(({ data }) => setBranches(data || []));
  }, [seeAllBranches]);

  const fetchRooms = async () => {
    if (userLoading || !user) return;
    setLoading(true);
    let q = supabase.from('rooms').select('*').order('number');
    if (!seeAllBranches && user?.branchId) q = q.eq('branch_id', user.branchId);
    if (seeAllBranches && branchFilter) q = q.eq('branch_id', branchFilter);
    const { data, error } = await q;
    if (!error) setRooms(data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (userLoading || !user) return;
    fetchRooms();
    const ch = supabase.channel('rooms-availability-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, () => fetchRooms())
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [user, userLoading, seeAllBranches, branchFilter]);

  const openCreate = () => {
    setForm({ number: '', type: 'General', status: 'Available', patient: '', diagnosis: '', infected: false });
    setFormRoom(false); // false = new
  };
  const openEdit = (room) => {
    setViewRoom(null);
    setForm({ ...room });
    setFormRoom(room);
  };

  const saveRoom = async () => {
    if (saving) return;
    setSaving(true);
    if (formRoom) {
      // Edit
      const { error } = await supabase.from('rooms').update({
        status: form.status, patient: form.patient, diagnosis: form.diagnosis,
        type: form.type, infected: form.infected,
      }).eq('id', formRoom.id);
      setSaving(false);
      if (error) { showToast('Error: ' + error.message, 'error'); return; }
      showToast(`✓ Room ${formRoom.number} updated`);
    } else {
      // Create
      if (!form.number?.toString().trim()) { setSaving(false); showToast('Room number is required', 'error'); return; }
      const { error } = await supabase.from('rooms').insert([{
        number: form.number, type: form.type, status: form.status,
        patient: form.patient || '', diagnosis: form.diagnosis || '',
        infected: !!form.infected, branch_id: user?.branchId ?? null,
      }]);
      setSaving(false);
      if (error) { showToast('Error: ' + error.message, 'error'); return; }
      showToast(`✓ Room ${form.number} created`);
    }
    fetchRooms();
    setFormRoom(null);
  };

  const deleteRoom = (room) => {
    setConfirm({
      show: true,
      title: `Delete Room ${room.number}?`,
      message: `This will permanently remove Room ${room.number} from the system. This cannot be undone.`,
      confirmText: 'Yes, Delete',
      confirmColor: '#dc2626',
      onConfirm: async () => {
        setConfirm({ show: false });
        const { error } = await supabase.from('rooms').delete().eq('id', room.id);
        if (error) { showToast('Error: ' + error.message, 'error'); return; }
        setViewRoom(null);
        showToast(`Room ${room.number} deleted`, 'info');
        fetchRooms();
      },
      onCancel: () => setConfirm({ show: false }),
    });
  };

  /* Derived */
  const counts = {
    available: rooms.filter(r => r.status === 'Available').length,
    occupied: rooms.filter(r => r.status === 'Occupied').length,
    quarantine: rooms.filter(r => r.status === 'Quarantine').length,
    cleaning: rooms.filter(r => r.status === 'Cleaning').length,
  };
  const filterMap = { All: rooms, Available: rooms.filter(r => r.status === 'Available'), Occupied: rooms.filter(r => r.status === 'Occupied'), Quarantine: rooms.filter(r => r.status === 'Quarantine'), Cleaning: rooms.filter(r => r.status === 'Cleaning') };
  const filtered = filterMap[filter] || rooms;
  const generalRooms = filtered.filter(r => !r.infected);
  const isolationRooms = filtered.filter(r => r.infected);

  const branchLabel = seeAllBranches ? (branchFilter ? (branches.find(b => b.id === branchFilter)?.name ?? 'Branch') : 'All Branches') : 'My Branch';

  const S = {
    inp: { padding: '9px 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', background: '#fff', color: 'var(--text)', outline: 'none' },
    card: { background: '#fff', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)', width: '100%', marginBottom: 20 },
  };

  const FILTER_TABS = ['All', 'Available', 'Occupied', 'Quarantine', 'Cleaning'];
  const TAB_COLORS = { All: 'var(--royal)', Available: '#16a34a', Occupied: '#1e3a8a', Quarantine: '#dc2626', Cleaning: '#d97706' };

  return (
    <Layout>
      <style>{STYLES}</style>
      <Toast message={toast.message} show={toast.show} type={toast.type} />
      <ConfirmModal {...confirm} />

      {/* ── TOPBAR ── */}
      <div className="topbar">
        <div className="topbar-title">
          <img src="/icon/room.png" alt="" />
          <div>
            <h1>Room Availability</h1>
            <p>{branchLabel} — Monitor and manage room status</p>
          </div>
        </div>
        <div className="topbar-actions">
          {seeAllBranches && (
            <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)} style={{ ...S.inp, width: 180 }}>
              <option value="">All Branches</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
          <button className="btn btn-primary" style={{ width: 'auto', whiteSpace: 'nowrap' }} onClick={openCreate}>+ Add Room</button>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="content">

        {/* Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(195px,1fr))', gap: 14, marginBottom: 20 }}>
          {loading
            ? [1, 2, 3, 4].map(i => <StatCardSkeleton key={i} />)
            : [
              { label: 'Available',  value: counts.available,  icon: '/icon/available.png', color: 'green',  f: 'Available',  sub: counts.available > 0 ? 'Ready for admission' : 'None available' },
              { label: 'Occupied',   value: counts.occupied,   icon: '/icon/confirm.png',   color: 'blue',   f: 'Occupied',   sub: 'Currently in use' },
              { label: 'Quarantine', value: counts.quarantine, icon: '/icon/warning.png',   color: 'red',    f: 'Quarantine', sub: counts.quarantine > 0 ? 'Needs attention' : 'None flagged' },
              { label: 'Cleaning',   value: counts.cleaning,   icon: '/icon/cleaning.png',  color: 'yellow', f: 'Cleaning',   sub: 'Being sanitized' },
            ].map((sc, i) => (
              <div key={i} className={`stat-card-v2 ${sc.color}`}
                onClick={() => setFilter(f => f === sc.f ? 'All' : sc.f)}>
                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                  <div className={`stat-icon-v2 ${sc.color}`}>
                    <img src={sc.icon} alt="" style={{ width: 24, height: 24 }} />
                  </div>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{sc.label}</p>
                  <h3 style={{ margin: '4px 0 6px', fontSize: 26, fontWeight: 800, lineHeight: 1 }}>{sc.value}</h3>
                  <span style={{ fontSize: 11, fontWeight: 600, color: sc.color === 'red' && sc.value > 0 ? '#dc2626' : 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    {sc.color === 'red' && sc.value > 0 && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}
                    {sc.sub}
                  </span>
                </div>
              </div>
            ))
          }
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          {FILTER_TABS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding: '6px 16px', borderRadius: 99, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', border: '1.5px solid', transition: 'all 0.15s', background: filter === f ? TAB_COLORS[f] : 'transparent', color: filter === f ? '#fff' : 'var(--muted)', borderColor: filter === f ? TAB_COLORS[f] : 'var(--border)' }}>
              {f}
            </button>
          ))}
          <span style={{ marginLeft: 4, color: 'var(--muted)', fontSize: 12 }}>{filtered.length} room{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {loading ? (
          <>
            {/* General section skeleton */}
            <div style={{ marginBottom: 8 }}><Skel w={160} h={13} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 16, marginBottom: 32 }}>
              {[1, 2, 3, 4, 5, 6].map(i => <CardSkel key={i} />)}
            </div>
          </>
        ) : (
          <>
            {/* General Wards */}
            {generalRooms.length > 0 && (
              <section style={{ marginBottom: 32 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                  <h3 style={{ margin: 0, fontSize: 12, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>General Wards</h3>
                  <span style={{ background: '#f1f5f9', color: 'var(--muted)', borderRadius: 99, fontSize: 11, fontWeight: 700, padding: '2px 8px' }}>{generalRooms.length}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))', gap: 16 }}>
                  {generalRooms.map(room => <RoomCard key={room.id} room={room} onView={setViewRoom} />)}
                </div>
              </section>
            )}

            {/* Isolation Rooms */}
            {isolationRooms.length > 0 && (
              <section style={{ marginBottom: 32 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                  <h3 style={{ margin: 0, fontSize: 12, fontWeight: 800, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Isolation / Infected Rooms</h3>
                  <span style={{ background: '#fee2e2', color: '#dc2626', borderRadius: 99, fontSize: 11, fontWeight: 700, padding: '2px 8px' }}>{isolationRooms.length}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))', gap: 16 }}>
                  {isolationRooms.map(room => <RoomCard key={room.id} room={room} onView={setViewRoom} />)}
                </div>
              </section>
            )}

            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
                <div style={{ marginBottom: 10 }}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                </div>
                <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>No rooms match this filter.</p>
                <p style={{ fontSize: 12, margin: '4px 0 0' }}>Try selecting a different status or add a new room.</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── View Modal ── */}
      {viewRoom && (
        <ViewModal
          room={viewRoom}
          onClose={() => setViewRoom(null)}
          onEdit={() => openEdit(viewRoom)}
          onDelete={() => deleteRoom(viewRoom)}
        />
      )}

      {/* ── Add / Edit Modal ── */}
      {formRoom !== null && (
        <RoomFormModal
          editRoom={formRoom || null}
          form={form}
          setForm={setForm}
          onSave={saveRoom}
          onClose={() => setFormRoom(null)}
          saving={saving}
        />
      )}
    </Layout>
  );
};

export default RoomAvailability;