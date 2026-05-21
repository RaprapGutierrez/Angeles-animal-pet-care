// Inventory.jsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Layout from '../components/layout';
import { supabase } from '../js/supabase';
import { useCurrentUser } from '../js/useCurrentUser';
import { useBranchFilter, withBranchId } from '../js/useBranchFilter';

/* ─── Skeleton ─────────────────────────────────────────────────────────────── */
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

/* ── Inventory item card ── */
@keyframes inv-slide-in {
  0%  { opacity: 0; transform: translateY(6px); }
  100%{ opacity: 1; transform: translateY(0); }
}
.inv-item-hero {
  background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 60%, #2563eb 100%);
  border-radius: 14px;
  padding: 20px 22px;
  margin-bottom: 20px;
  position: relative;
  overflow: hidden;
  animation: inv-slide-in 0.3s ease both;
}
.inv-item-hero::before {
  content: '';
  position: absolute;
  top: -40px; right: -40px;
  width: 180px; height: 180px;
  border-radius: 50%;
  background: rgba(255,255,255,0.04);
  pointer-events: none;
}
.inv-item-hero::after {
  content: '';
  position: absolute;
  bottom: -30px; left: -20px;
  width: 120px; height: 120px;
  border-radius: 50%;
  background: rgba(255,255,255,0.03);
  pointer-events: none;
}
.inv-field-card {
  background: #f8fafc;
  border: 1.5px solid var(--border, #e2e8f0);
  border-radius: 10px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  animation: inv-slide-in 0.25s ease both;
}
.inv-field-label {
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #94a3b8;
}
.inv-field-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--text, #1e293b);
}
.inv-row-hover:hover {
  background: #f8fafc !important;
  cursor: pointer;
}
.inv-row-hover:hover td {
  background: transparent;
}
/* Clipboard top bar */
.inv-clipboard-bar {
  background: linear-gradient(135deg, #0f172a, #1e3a8a);
  padding: 10px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-radius: 14px 14px 0 0;
}
/* Section headers in form */
.inv-section-label {
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
.stat-card-v2.blue::before   { background: linear-gradient(90deg,#1e3a8a,#3b82f6); }
.stat-card-v2.red::before    { background: linear-gradient(90deg,#dc2626,#ef4444); }
.stat-card-v2.yellow::before { background: linear-gradient(90deg,#d97706,#f59e0b); }
.stat-card-v2.green::before  { background: linear-gradient(90deg,#16a34a,#22c55e); }
.stat-card-v2 .stat-icon-v2 {
  width: 46px; height: 46px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.stat-card-v2 .stat-icon-v2.blue   { background: #eff6ff; }
.stat-card-v2 .stat-icon-v2.red    { background: #fff1f2; }
.stat-card-v2 .stat-icon-v2.yellow { background: #fffbeb; }
.stat-card-v2 .stat-icon-v2.green  { background: #f0fdf4; }
.stat-card-v2 .stat-icon-v2.blue   img { filter: brightness(0) saturate(100%) invert(17%) sepia(82%) saturate(1200%) hue-rotate(210deg); }
.stat-card-v2 .stat-icon-v2.red    img { filter: brightness(0) saturate(100%) invert(20%) sepia(90%) saturate(1200%) hue-rotate(340deg) brightness(0.9); }
.stat-card-v2 .stat-icon-v2.yellow img { filter: brightness(0) saturate(100%) invert(52%) sepia(90%) saturate(600%) hue-rotate(10deg) brightness(0.9); }
.stat-card-v2 .stat-icon-v2.green  img { filter: brightness(0) saturate(100%) invert(32%) sepia(80%) saturate(600%) hue-rotate(110deg) brightness(0.9); }
`;

const Skel = ({ w = '100%', h = 16 }) => (
  <span className="skel" style={{ width: w, height: h, borderRadius: 8, display: 'block' }} />
);

/* ─── Constants ─────────────────────────────────────────────────────────────── */
const CATEGORIES = ['Medicine', 'Vaccine', 'Supplies', 'Food', 'Equipment', 'Consultation', 'Grooming', 'Other'];
const UNITS = ['pcs', 'box', 'bottle', 'pack', 'kg', 'L', 'tablet', 'vial', 'sachet'];

const CAT_ICON = {
  Medicine:     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M8 12h8M12 8v8"/></svg>,
  Vaccine:      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 2 4 4-14 14H4v-4L18 2z"/><path d="m14.5 5.5 4 4"/><path d="M3 22l3-3"/><path d="M9 3 6 6"/></svg>,
  Supplies:     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 11V4a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h9"/><path d="M9 7h6M9 11h4M9 15h2"/><circle cx="17" cy="17" r="3"/><path d="m21 21-1.5-1.5"/></svg>,
  Food:         <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2.343V8a2 2 0 0 0 2 2h5.657a2 2 0 0 0 1.414-3.414L11.414.929A2 2 0 0 0 10 2.343z"/><path d="M10 2v6h6"/><path d="M10.5 10C7.46 10 5 12.46 5 15.5S7.46 21 10.5 21 16 18.54 16 15.5 13.54 10 10.5 10z"/></svg>,
  Equipment:    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18"/></svg>,
  Consultation: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
  Grooming:     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="6" r="3"/><path d="M6 9v12M6 9c0 3 4 6 4 9"/><path d="m14.5 2.5 7 7-7 7-3-3 4-4-4-4 3-3z"/></svg>,
  Other:        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>,
};
const CAT_COLOR = {
  Medicine: { bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af' },
  Vaccine:  { bg: '#f0fdf4', border: '#bbf7d0', text: '#166534' },
  Supplies: { bg: '#fef3c7', border: '#fde68a', text: '#92400e' },
  Food:     { bg: '#fdf4ff', border: '#e9d5ff', text: '#6b21a8' },
  Equipment:{ bg: '#f0fdf4', border: '#86efac', text: '#14532d' },
  Consultation:{ bg: '#fff1f2', border: '#fecdd3', text: '#9f1239' },
  Grooming: { bg: '#fff7ed', border: '#fed7aa', text: '#9a3412' },
  Other:    { bg: '#f8fafc', border: '#cbd5e1', text: '#475569' },
};

const getPermissions = (role) => {
  const r = (role || '').toLowerCase();
  if (['admin','super_admin','manager','employee','staff'].includes(r))
    return { canView: true, canAdd: true, canEdit: true, canDelete: true };
  return { canView: false, canAdd: false, canEdit: false, canDelete: false };
};

/* ─── Small helpers ─────────────────────────────────────────────────────────── */
const EditIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const LiveToast = ({ message, show, type = 'success' }) => {
  const colors = { success: { bg: '#1e293b', dot: '#22c55e' }, error: { bg: '#7f1d1d', dot: '#ef4444' }, info: { bg: '#1e3a8a', dot: '#60a5fa' } };
  const c = colors[type] || colors.success;
  return (
    <div style={{
      position:'fixed', bottom:24, right:24, zIndex:9999,
      background:c.bg, color:'#fff', borderRadius:10,
      padding:'11px 18px', fontSize:13, fontWeight:600,
      display:'flex', alignItems:'center', gap:8,
      boxShadow:'0 8px 24px rgba(0,0,0,0.22)',
      opacity: show ? 1 : 0,
      transform: show ? 'translateY(0)' : 'translateY(10px)',
      transition:'opacity 0.25s, transform 0.25s',
      pointerEvents:'none',
    }}>
      <span style={{ width:8, height:8, borderRadius:'50%', background:c.dot, display:'inline-block', flexShrink:0 }}/>
      {message}
    </div>
  );
};

/* ─── Expiry helper ──────────────────────────────────────────────────────────── */
const expiryInfo = (expiry) => {
  if (!expiry) return null;
  const days = Math.ceil((new Date(expiry) - new Date()) / (1000 * 60 * 60 * 24));
  return { days, expired: days < 0, soon: days >= 0 && days <= 30, critical: days >= 0 && days <= 7 };
};

/* ─── View Modal ─────────────────────────────────────────────────────────────── */
const ViewModal = ({ item, onClose, onEdit, onDelete }) => {
  if (!item) return null;
  const cat = item.category || 'Other';
  const catStyle = CAT_COLOR[cat] || CAT_COLOR.Other;
  const icon = CAT_ICON[cat] || '📦';
  const isLow = item.qty <= (item.threshold ?? 10);
  const exp = expiryInfo(item.expiry);

  const fields = [
    { label: 'Category',     value: item.category || '—' },
    { label: 'Quantity',     value: `${item.qty} ${item.unit || 'pcs'}`, highlight: isLow ? '#dc2626' : undefined },
    { label: 'Low Threshold',value: `${item.threshold ?? 10} ${item.unit || 'pcs'}` },
    { label: 'Unit Price',   value: `₱${Number(item.price || 0).toFixed(2)}` },
    { label: 'Supplier',     value: item.supplier || '—' },
    { label: 'Expiry Date',
      value: item.expiry
        ? `${item.expiry}${exp ? (exp.expired ? ' — EXPIRED' : exp.soon ? ` (${exp.days}d left)` : '') : ''}`
        : 'No expiry',
      highlight: exp ? (exp.expired ? '#dc2626' : exp.soon ? '#d97706' : undefined) : undefined,
    },
  ];

  return (
    <div style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(0,0,0,0.50)', display:'flex', alignItems:'center', justifyContent:'center', padding:20, overflowY:'auto' }}>
      <div style={{ background:'#fff', borderRadius:14, boxShadow:'0 24px 64px rgba(0,0,0,0.28)', width:'100%', maxWidth:560, maxHeight:'calc(100vh - 48px)', display:'flex', flexDirection:'column', overflow:'hidden', margin:'auto' }}>

        {/* Modal header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 24px', borderBottom:'1px solid #e2e8f0', background:'#fafafa', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:42, height:42, borderRadius:12, background:`linear-gradient(135deg, ${catStyle.bg}, #fff)`, border:`1.5px solid ${catStyle.border}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, color:catStyle.text }}>
              {React.cloneElement(icon, { width:20, height:20 })}
            </div>
            <div>
              <h3 style={{ margin:0, fontSize:17, fontWeight:700, color:'#1e293b' }}>{item.name}</h3>
              <p style={{ margin:0, fontSize:12, color:'#64748b', marginTop:2 }}>{item.category} · {item.unit}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'#94a3b8', lineHeight:1, padding:'2px 6px' }}>✕</button>
        </div>

        <div style={{ padding:'20px 24px', overflowY:'auto', flex:1 }}>
          {/* Hero banner */}
          <div className="inv-item-hero">
            <div style={{ position:'relative', zIndex:1 }}>
              <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:14 }}>
                <div style={{ width:56, height:56, borderRadius:16, flexShrink:0, background:'rgba(255,255,255,0.12)', display:'flex', alignItems:'center', justifyContent:'center', border:'2px solid rgba(255,255,255,0.2)', color:'rgba(255,255,255,0.9)' }}>
                  {React.cloneElement(icon, { width:26, height:26 })}
                </div>
                <div>
                  <h2 style={{ margin:0, fontSize:20, fontWeight:800, color:'#fff', lineHeight:1.2 }}>{item.name}</h2>
                  <p style={{ margin:'4px 0 0', fontSize:13, color:'rgba(255,255,255,0.65)' }}>
                    {item.category} · {item.unit}
                    {item.supplier ? ` · ${item.supplier}` : ''}
                  </p>
                </div>
                <div style={{ marginLeft:'auto', display:'flex', flexDirection:'column', gap:6, alignItems:'flex-end' }}>
                  <span style={{
                    background: isLow ? 'rgba(220,38,38,0.2)' : 'rgba(22,163,74,0.2)',
                    border: `1.5px solid ${isLow ? 'rgba(220,38,38,0.4)' : 'rgba(22,163,74,0.4)'}`,
                    color: isLow ? '#fca5a5' : '#bbf7d0',
                    borderRadius:20, padding:'3px 12px', fontSize:12, fontWeight:700,
                  }}>{isLow ? 'Low Stock' : 'In Stock'}</span>
                  <span style={{
                    background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.2)',
                    color:'rgba(255,255,255,0.85)', borderRadius:20, padding:'3px 12px', fontSize:12, fontWeight:700,
                  }}>{cat}</span>
                </div>
              </div>

              {/* Quick stats row */}
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {[
                  { icon:<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>, label:`${item.qty} ${item.unit || 'pcs'} in stock` },
                  { icon:<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>, label:`₱${Number(item.price||0).toFixed(2)} per unit` },
                  ...(item.expiry ? [{ icon:<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>, label:`Expires ${item.expiry}` }] : []),
                ].map(({ icon:ic, label }) => (
                  <span key={label} style={{ background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:8, padding:'5px 10px', fontSize:12, color:'rgba(255,255,255,0.8)', display:'flex', alignItems:'center', gap:6 }}>
                    <span>{ic}</span> {label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Fields grid */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {fields.map(({ label, value, highlight }) => (
              <div key={label} className="inv-field-card">
                <span className="inv-field-label">{label}</span>
                <span className="inv-field-value" style={highlight ? { color: highlight, fontWeight:700 } : {}}>{value}</span>
              </div>
            ))}

            {/* Stock bar — full width */}
            <div style={{ gridColumn:'1 / -1' }}>
              <div style={{ background: isLow ? '#fff5f5' : '#f0fdf4', border:`1.5px solid ${isLow ? '#fca5a5' : '#86efac'}`, borderRadius:10, padding:'14px 16px' }}>
                <p style={{ margin:'0 0 8px', fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:1, color: isLow ? '#dc2626' : '#16a34a', display:'flex', alignItems:'center', gap:5 }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                  Stock Level
                </p>
                <div style={{ background: isLow ? '#fee2e2' : '#dcfce7', borderRadius:99, height:8, overflow:'hidden' }}>
                  <div style={{
                    height:'100%', borderRadius:99,
                    background: isLow ? 'linear-gradient(90deg,#ef4444,#dc2626)' : 'linear-gradient(90deg,#22c55e,#16a34a)',
                    width:`${Math.min(100, (item.qty / Math.max(item.threshold ?? 10, 1)) * 50)}%`,
                    transition:'width 0.6s ease',
                  }}/>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', marginTop:5 }}>
                  <span style={{ fontSize:11, color: isLow ? '#dc2626' : '#16a34a', fontWeight:700 }}>
                    {item.qty} / {(item.threshold ?? 10) * 2} units
                  </span>
                  <span style={{ fontSize:11, color: isLow ? '#dc2626' : '#16a34a', fontWeight:700 }}>
                    Threshold: {item.threshold ?? 10}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display:'flex', justifyContent:'flex-end', gap:8, padding:'14px 24px', borderTop:'1px solid #e2e8f0', background:'#fafafa', flexShrink:0 }}>
          <button className="btn btn-ghost" style={{ width:'auto' }} onClick={onClose}>Close</button>
          <button className="btn btn-ghost" style={{ width:'auto', display:'inline-flex', alignItems:'center', gap:5 }} onClick={() => onEdit(item)}>
            <EditIcon/> Edit
          </button>
          <button className="btn btn-danger" style={{ width:'auto' }} onClick={() => onDelete(item.id)}>Delete</button>
        </div>
      </div>
    </div>
  );
};

/* ─── Add / Edit Modal (patient-record style) ────────────────────────────────── */
const ItemFormModal = ({ item, onClose, onSave, saving }) => {
  const isEdit = !!item?.id;
  const [form, setForm] = useState(
    item?.id
      ? { ...item }
      : { name:'', category:'Medicine', qty:0, unit:'pcs', threshold:10, price:0, expiry:'', supplier:'' }
  );

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const catStyle = CAT_COLOR[form.category] || CAT_COLOR.Other;
  const icon = CAT_ICON[form.category] || '📦';

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999, padding:16 }}>
      <div style={{ background:'#fff', borderRadius:14, width:'100%', maxWidth:600, maxHeight:'90vh', overflowY:'auto', display:'flex', flexDirection:'column', boxShadow:'0 20px 60px rgba(0,0,0,0.25)' }}>

        {/* Clipboard bar */}
        <div className="inv-clipboard-bar" style={{ flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:48, height:18, background:'rgba(255,255,255,0.25)', borderRadius:4, border:'2px solid rgba(255,255,255,0.35)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <div style={{ width:20, height:8, background:'rgba(255,255,255,0.4)', borderRadius:2 }}/>
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:18, cursor:'pointer', color:'rgba(255,255,255,0.75)', lineHeight:1, padding:'2px 6px' }}>✕</button>
        </div>

        {/* Medical record header */}
        <div style={{ background:'var(--bg,#f8fafc)', borderBottom:'2px solid var(--border,#e2e8f0)', padding:'14px 24px 12px', textAlign:'center', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, marginBottom:4 }}>
            <div style={{ width:28, height:28, borderRadius:8, background:catStyle.bg, border:`1px solid ${catStyle.border}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={catStyle.text} strokeWidth="2" strokeLinecap="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
            </div>
            <h3 style={{ margin:0, fontSize:15, fontWeight:800, color:'var(--text,#1e293b)', letterSpacing:'0.3px' }}>
              {isEdit ? 'Edit Inventory Item' : 'New Inventory Item'}
            </h3>
          </div>
          <p style={{ margin:0, fontSize:11, color:'#64748b', letterSpacing:'0.5px' }}>
            {isEdit ? `Updating: ${item.name}` : 'Fill in the item details below'}
          </p>
        </div>

        {/* Form body — section-divided like patient record */}
        <div style={{ flex:1, overflowY:'auto' }}>

          {/* ── Section: Item Identity ── */}
          <div style={{ borderBottom:'1.5px solid #e2e8f0' }}>
            <div className="inv-section-label">Item Information</div>

            {/* Row 1: Name · Category */}
            <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', borderBottom:'1px solid #e2e8f0' }}>
              <div style={{ padding:'10px 16px', borderRight:'1px solid #e2e8f0' }}>
                <div style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:6 }}>
                  Item Name <span style={{ color:'#ef4444' }}>*</span>
                </div>
                <input
                  type="text" value={form.name} onChange={e => set('name', e.target.value)}
                  placeholder="e.g. Amoxicillin 250mg"
                  style={{ width:'100%', border:'none', borderBottom:'1.5px solid #cbd5e1', background:'transparent', fontSize:13, fontWeight:600, color:'var(--text,#1e293b)', outline:'none', padding:'2px 0', fontFamily:'inherit', boxSizing:'border-box' }}
                />
              </div>
              <div style={{ padding:'10px 16px' }}>
                <div style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:6 }}>Category</div>
                <select value={form.category} onChange={e => set('category', e.target.value)}
                  style={{ width:'100%', border:'none', borderBottom:'1.5px solid #cbd5e1', background:'transparent', fontSize:13, fontWeight:600, color:'var(--text,#1e293b)', outline:'none', padding:'2px 0', fontFamily:'inherit' }}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Row 2: Qty · Unit · Threshold */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', borderBottom:'1px solid #e2e8f0' }}>
              <div style={{ padding:'10px 16px', borderRight:'1px solid #e2e8f0' }}>
                <div style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:6 }}>Quantity</div>
                <input type="number" value={form.qty} min={0}
                  onChange={e => set('qty', e.target.value)}
                  style={{ width:'100%', border:'none', borderBottom:'1.5px solid #cbd5e1', background:'transparent', fontSize:13, fontWeight:600, color:'var(--text,#1e293b)', outline:'none', padding:'2px 0', fontFamily:'inherit', boxSizing:'border-box' }}
                />
              </div>
              <div style={{ padding:'10px 16px', borderRight:'1px solid #e2e8f0' }}>
                <div style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:6 }}>Unit</div>
                <select value={form.unit} onChange={e => set('unit', e.target.value)}
                  style={{ width:'100%', border:'none', borderBottom:'1.5px solid #cbd5e1', background:'transparent', fontSize:13, fontWeight:600, color:'var(--text,#1e293b)', outline:'none', padding:'2px 0', fontFamily:'inherit' }}>
                  {UNITS.map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
              <div style={{ padding:'10px 16px' }}>
                <div style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:6 }}>Low Threshold</div>
                <input type="number" value={form.threshold} min={0}
                  onChange={e => set('threshold', e.target.value)}
                  style={{ width:'100%', border:'none', borderBottom:'1.5px solid #cbd5e1', background:'transparent', fontSize:13, fontWeight:600, color:'var(--text,#1e293b)', outline:'none', padding:'2px 0', fontFamily:'inherit', boxSizing:'border-box' }}
                />
              </div>
            </div>
          </div>

          {/* ── Section: Pricing & Supply ── */}
          <div style={{ borderBottom:'1.5px solid #e2e8f0' }}>
            <div className="inv-section-label">Pricing &amp; Supply</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', borderBottom:'1px solid #e2e8f0' }}>
              <div style={{ padding:'10px 16px', borderRight:'1px solid #e2e8f0' }}>
                <div style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:6 }}>Unit Price (₱)</div>
                <input type="number" value={form.price} min={0} step="0.01"
                  onChange={e => set('price', e.target.value)}
                  style={{ width:'100%', border:'none', borderBottom:'1.5px solid #cbd5e1', background:'transparent', fontSize:13, fontWeight:600, color:'var(--text,#1e293b)', outline:'none', padding:'2px 0', fontFamily:'inherit', boxSizing:'border-box' }}
                />
              </div>
              <div style={{ padding:'10px 16px' }}>
                <div style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:6 }}>Supplier</div>
                <input type="text" value={form.supplier} onChange={e => set('supplier', e.target.value)}
                  placeholder="Supplier name"
                  style={{ width:'100%', border:'none', borderBottom:'1.5px solid #cbd5e1', background:'transparent', fontSize:13, fontWeight:600, color:'var(--text,#1e293b)', outline:'none', padding:'2px 0', fontFamily:'inherit', boxSizing:'border-box' }}
                />
              </div>
            </div>
          </div>

          {/* ── Section: Expiry ── */}
          <div style={{ borderBottom:'1.5px solid #e2e8f0' }}>
            <div className="inv-section-label">Expiry / Validity</div>
            <div style={{ padding:'12px 16px', display:'flex', alignItems:'center', gap:14 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:6 }}>Expiry Date</div>
                <input type="date" value={form.expiry} onChange={e => set('expiry', e.target.value)}
                  style={{ width:'100%', border:'none', borderBottom:'1.5px solid #cbd5e1', background:'transparent', fontSize:13, fontWeight:600, color:'var(--text,#1e293b)', outline:'none', padding:'2px 0', fontFamily:'inherit', boxSizing:'border-box' }}
                />
              </div>
              {form.expiry && (() => {
                const e = expiryInfo(form.expiry);
                if (!e) return null;
                const c = e.expired ? { bg:'#fef2f2', border:'#fca5a5', text:'#dc2626', msg:'Expired!' }
                        : e.critical ? { bg:'#fef2f2', border:'#fca5a5', text:'#dc2626', msg:`${e.days}d left — Critical` }
                        : e.soon    ? { bg:'#fffbeb', border:'#fde68a', text:'#d97706', msg:`${e.days}d left — Expiring soon` }
                        : { bg:'#f0fdf4', border:'#86efac', text:'#16a34a', msg:`${e.days}d remaining` };
                return (
                  <div style={{ background:c.bg, border:`1px solid ${c.border}`, borderRadius:8, padding:'7px 12px', fontSize:12, fontWeight:700, color:c.text, flexShrink:0 }}>
                    {c.msg}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Footer note */}
          <div style={{ padding:'8px 16px', background:'var(--bg,#f8fafc)', borderTop:'1px solid var(--border,#e2e8f0)' }}>
            <p style={{ margin:0, fontSize:10, color:'#94a3b8', textAlign:'right', fontStyle:'italic' }}>Inventory Management System</p>
          </div>
        </div>

        {/* Modal footer */}
        <div style={{ display:'flex', justifyContent:'flex-end', gap:10, padding:'14px 24px', borderTop:'2px solid #e2e8f0', background:'#f8fafc', flexShrink:0 }}>
          <button className="btn btn-ghost" style={{ width:'auto' }} onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" style={{ width:'auto', background:'#0f172a', borderColor:'#0f172a', display:'inline-flex', alignItems:'center', gap:6 }}
            onClick={() => onSave(form)} disabled={saving}>
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Item'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Main Component ─────────────────────────────────────────────────────────── */
const Inventory = () => {
  const { user, loading: userLoading } = useCurrentUser();
  const { applyFilter, seeAllBranches, branchId } = useBranchFilter();

  const perms = useMemo(() => getPermissions(user?.role), [user]);

  const [items, setItems]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [catFilter, setCatFilter]   = useState('');
  const [stockFilter, setStockFilter] = useState('');

  // Modals
  const [viewItem, setViewItem]     = useState(null);   // view modal
  const [editItem, setEditItem]     = useState(null);   // add/edit modal (null = closed, {} = new, item = edit)
  const [deleteId, setDeleteId]     = useState(null);
  const [saving, setSaving]         = useState(false);

  const [toast, setToast]           = useState({ show:false, message:'', type:'success' });
  const [currentPage, setCurrentPage] = useState(1);
  const ROWS_PER_PAGE = 10;
  const toastTimer                  = useRef(null);

  const showToast = (message, type = 'success') => {
    clearTimeout(toastTimer.current);
    setToast({ show:true, message, type });
    toastTimer.current = setTimeout(() => setToast(t => ({ ...t, show:false })), 3000);
  };

  const applyFilterRef = useRef(applyFilter);
  useEffect(() => { applyFilterRef.current = applyFilter; }, [applyFilter]);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data, error } = await applyFilterRef.current(
      supabase.from('inventory').select('*').order('name')
    );
    if (!error) setItems(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (userLoading) return;
    if (!perms.canView) { setLoading(false); return; }
    fetchItems();
  }, [userLoading, perms.canView, fetchItems]);

  useEffect(() => {
    if (userLoading || !perms.canView) return;
    const matchesBranch = (r) => seeAllBranches || !branchId || r.branch_id === branchId;
    const ch = supabase.channel('inventory-realtime')
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'inventory' },
        p => { if (matchesBranch(p.new)) setItems(prev => [...prev, p.new].sort((a,b)=>a.name.localeCompare(b.name))); })
      .on('postgres_changes', { event:'UPDATE', schema:'public', table:'inventory' },
        p => { if (matchesBranch(p.new)) setItems(prev => prev.map(i => i.id===p.new.id ? p.new : i)); })
      .on('postgres_changes', { event:'DELETE', schema:'public', table:'inventory' },
        p => setItems(prev => prev.filter(i => i.id!==p.old.id)))
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [userLoading, perms.canView, seeAllBranches, branchId]);

  const lowStock = useMemo(() => items.filter(i => i.qty <= (i.threshold ?? 10)), [items]);
  const expiringSoon = useMemo(() => items.filter(i => {
    if (!i.expiry) return false;
    const days = (new Date(i.expiry) - new Date()) / (1000*60*60*24);
    return days <= 30 && days >= 0;
  }), [items]);

  const filtered = useMemo(() => items.filter(i => {
    const matchSearch = !search || i.name.toLowerCase().includes(search.toLowerCase()) ||
      (i.supplier||'').toLowerCase().includes(search.toLowerCase()) ||
      (i.category||'').toLowerCase().includes(search.toLowerCase());
    const matchCat    = !catFilter   || i.category === catFilter;
    const matchStock  = !stockFilter || (stockFilter==='low' ? i.qty<=(i.threshold??10) : i.qty>(i.threshold??10));
    return matchSearch && matchCat && matchStock;
  }), [items, search, catFilter, stockFilter]);

  useEffect(() => { setCurrentPage(1); }, [search, catFilter, stockFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * ROWS_PER_PAGE, safePage * ROWS_PER_PAGE);

  const openAdd = () => perms.canAdd && setEditItem({ name:'', category:'Medicine', qty:0, unit:'pcs', threshold:10, price:0, expiry:'', supplier:'' });
  const openEdit = (item, e) => { e?.stopPropagation(); perms.canEdit && setEditItem(item); };
  const openView = (item) => setViewItem(item);

  const handleSave = async (form) => {
    if (!form.name) { alert('Item name is required'); return; }
    setSaving(true);
    const base = {
      name:form.name, category:form.category, qty:Number(form.qty),
      unit:form.unit, threshold:Number(form.threshold),
      price:Number(form.price), expiry:form.expiry||null, supplier:form.supplier,
    };
    if (form.id) {
      const { error } = await supabase.from('inventory').update(base).eq('id', form.id);
      if (error) { alert('Error: '+error.message); setSaving(false); return; }
      showToast(`✓ ${form.name} updated`);
    } else {
      const payload = withBranchId(user, base);
      const { error } = await supabase.from('inventory').insert([payload]);
      if (error) { alert('Error: '+error.message); setSaving(false); return; }
      showToast(`✓ ${form.name} added to inventory`);
    }
    setSaving(false);
    setEditItem(null);
    // Also close view if editing the same item
    if (form.id && viewItem?.id === form.id) setViewItem(null);
  };

  const doDelete = async (id) => {
    const item = items.find(i => i.id===id);
    const { error } = await supabase.from('inventory').delete().eq('id', id);
    if (error) { alert('Error: '+error.message); return; }
    setDeleteId(null);
    setViewItem(null);
    showToast(`${item?.name || 'Item'} deleted`, 'info');
  };

  const S = {
    btn: { width:'auto' },
    inp: { padding:'9px 12px', border:'1.5px solid var(--border)', borderRadius:8, fontSize:13, fontFamily:'inherit', background:'#fff', color:'var(--text)', outline:'none' },
    card: { background:'#fff', borderRadius:'var(--radius-lg)', border:'1px solid var(--border)', boxShadow:'var(--shadow)', width:'100%', marginBottom:20 },
    th: { background:'var(--bg)', padding:'11px 14px', textAlign:'left', fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.5px', borderBottom:'1px solid var(--border)', whiteSpace:'nowrap' },
    td: { padding:'13px 14px', borderBottom:'1px solid var(--border)', color:'var(--text)', verticalAlign:'middle' },
  };

  if (userLoading) {
    return <Layout><div style={{ padding:40, textAlign:'center', color:'#64748b' }}><p style={{ fontSize:13 }}>Loading...</p></div></Layout>;
  }
  if (!loading && !perms.canView) {
    return (
      <Layout>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'60vh', gap:12 }}>
          <img src="/icon/inventory_2.png" alt="" style={{ width:48, opacity:0.3 }}/>
          <h2 style={{ color:'var(--muted)', fontWeight:700 }}>Access Restricted</h2>
          <p style={{ color:'var(--muted)', fontSize:14 }}>You do not have permission to view Inventory.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <style>{SKEL_CSS}</style>
      <LiveToast message={toast.message} show={toast.show} type={toast.type}/>

      {/* ── Topbar ── */}
      <div className="topbar">
        <div className="topbar-title">
          <img src="/icon/inventory_2.png" alt=""/>
          <div>
            <h1>Inventory</h1>
            <p>{user?.role ? user.role.charAt(0).toUpperCase()+user.role.slice(1) : 'Loading...'}</p>
          </div>
        </div>
        <div className="topbar-actions">
          <div style={{ display:'flex', alignItems:'center', gap:8, background:'var(--bg)', border:'1.5px solid var(--border)', borderRadius:8, padding:'8px 14px' }}>
            <img src="/icon/search.png" alt="" style={{ width:16, height:16, filter:'brightness(0) saturate(100%) invert(40%)' }}/>
            <input type="text" placeholder="Search items, category, supplier..." value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ border:'none', background:'transparent', fontSize:13, color:'var(--text)', outline:'none', fontFamily:'inherit', width:220 }}/>
          </div>
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)} style={{ ...S.inp, width:150 }}>
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
          {perms.canAdd && (
            <button className="btn btn-primary" onClick={openAdd} style={S.btn}>+ Add Item</button>
          )}
        </div>
      </div>

      <div className="content">
        {/* Low stock alert */}
        {lowStock.length > 0 && (
          <div style={{ display:'flex', alignItems:'center', gap:12, background:'#fee2e2', border:'1px solid #fca5a5', borderRadius:10, padding:'12px 16px', marginBottom:20 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <div>
              <strong style={{ color:'#dc2626', fontSize:13 }}>Low Stock Alert</strong>
              <p style={{ fontSize:12, color:'#dc2626', margin:0 }}>{lowStock.map(i=>i.name).join(', ')}</p>
            </div>
          </div>
        )}

        {/* Stat cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(195px,1fr))', gap:14, marginBottom:24 }}>
          {loading ? [1,2,3,4].map(i => (
            <div key={i} style={{ background:'#fff', border:'1.5px solid var(--border)', borderRadius:16, padding:20, display:'flex', flexDirection:'column', gap:14 }}>
              <div className="skel" style={{ width:46, height:46, borderRadius:12 }}/>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                <Skel w="45%" h={11}/><Skel w="30%" h={26}/><Skel w="60%" h={10}/>
              </div>
            </div>
          )) : [
            { label:'Total Items',   value:items.length,                                      icon:'/icon/inventory.png',   color:'blue',   sub:'All inventory items' },
            { label:'Low Stock',     value:lowStock.length,                                   icon:'/icon/warning.png',     color:'red',    sub:lowStock.length > 0 ? 'Reorder needed' : 'All stocked' },
            { label:'Expiring Soon', value:expiringSoon.length,                               icon:'/icon/appointment.png', color:'yellow', sub:expiringSoon.length > 0 ? 'Within 30 days' : 'None expiring' },
            { label:'Categories',    value:[...new Set(items.map(i=>i.category))].length,     icon:'/icon/category.png',    color:'green',  sub:'Distinct categories' },
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
                <span style={{ fontSize:11, fontWeight:600, color: sc.color==='red' && sc.value>0 ? '#dc2626' : sc.color==='yellow' && sc.value>0 ? '#d97706' : 'var(--muted)', display:'flex', alignItems:'center', gap:4 }}>
                  {sc.color==='red' && sc.value>0 && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}
                  {sc.color==='yellow' && sc.value>0 && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
                  {sc.sub}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div style={{ ...S.card, padding:'14px 22px', marginBottom:16 }}>
          <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
            {[
              { label:'All Stock',   value:'' },
              { label:'Low Stock',   value:'low' },
              { label:'In Stock',    value:'ok' },
            ].map(f => (
              <button key={f.value} onClick={() => setStockFilter(f.value)}
                style={{
                  padding:'5px 14px', borderRadius:20, fontSize:12, fontWeight:600,
                  cursor:'pointer', fontFamily:'inherit', border:'1.5px solid',
                  background: stockFilter===f.value ? 'var(--royal)' : 'transparent',
                  color: stockFilter===f.value ? '#fff' : 'var(--muted)',
                  borderColor: stockFilter===f.value ? 'var(--royal)' : 'var(--border)',
                  transition:'all 0.15s',
                }}>
                {f.label}
              </button>
            ))}
            <span style={{ color:'var(--muted)', fontSize:12, marginLeft:4 }}>{filtered.length} item{filtered.length!==1?'s':''}</span>
          </div>
        </div>

        {/* Table */}
        <div style={S.card}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 22px', borderBottom:'1px solid var(--border)' }}>
            <h2 style={{ fontSize:15, fontWeight:700 }}>All Items</h2>
            <span style={{ color:'var(--muted)', fontSize:13 }}>{filtered.length} items</span>
          </div>
          <div style={{ overflowX:'auto' }}>
            {loading ? (
              <div style={{ padding:'16px 22px' }}>
                {[1,2,3,4,5].map(i => (
                  <div key={i} style={{ display:'flex', gap:12, alignItems:'center', padding:'13px 0', borderBottom:'1px solid #f1f5f9' }}>
                    <Skel w="25%" h={14}/><Skel w="12%" h={22}/><Skel w="8%" h={14}/>
                    <Skel w="8%" h={14}/><Skel w="10%" h={14}/><Skel w="12%" h={14}/>
                    <Skel w="12%" h={14}/>
                  </div>
                ))}
              </div>
            ) : (
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                <thead>
                  <tr>
                    {['Item', 'Category', 'Stock', 'Price', 'Expiry', 'Supplier',
                      ...(perms.canEdit || perms.canDelete ? ['Actions'] : [])
                    ].map(h => <th key={h} style={S.th}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign:'center', padding:40, color:'var(--muted)' }}>
                        <div style={{ marginBottom:8 }}><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg></div>
                        <div style={{ fontSize:13 }}>No items found</div>
                      </td>
                    </tr>
                  ) : paginated.map(item => {
                    const isLow = item.qty <= (item.threshold ?? 10);
                    const exp = expiryInfo(item.expiry);
                    const cat = item.category || 'Other';
                    const cs  = CAT_COLOR[cat] || CAT_COLOR.Other;
                    return (
                      <tr key={item.id} className="inv-row-hover"
                        style={{ background: isLow ? '#fff5f5' : '#fff', transition:'background 0.15s' }}
                        onClick={() => openView(item)}>

                        {/* Item name */}
                        <td style={S.td}>
                          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                            <div style={{ width:34, height:34, borderRadius:10, flexShrink:0, background:cs.bg, border:`1px solid ${cs.border}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={cs.text} strokeWidth="2" strokeLinecap="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                            </div>
                            <div>
                              <div style={{ fontWeight:600, fontSize:13, color:'var(--text)' }}>{item.name}</div>
                              <div style={{ fontSize:11, color:'var(--muted)', marginTop:1 }}>{item.unit}</div>
                            </div>
                          </div>
                        </td>

                        {/* Category badge */}
                        <td style={S.td}>
                          <span style={{ display:'inline-flex', alignItems:'center', gap:5, background:cs.bg, border:`1px solid ${cs.border}`, color:cs.text, borderRadius:20, padding:'3px 10px', fontSize:11, fontWeight:700 }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                            {item.category}
                          </span>
                        </td>

                        {/* Stock */}
                        <td style={S.td}>
                          <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                              <strong style={{ color: isLow ? '#dc2626' : 'var(--text)', fontSize:14 }}>{item.qty}</strong>
                              <span style={{ fontSize:11, color:'var(--muted)' }}>{item.unit}</span>
                              {isLow && <span style={{ fontSize:10, background:'#fee2e2', color:'#dc2626', padding:'2px 6px', borderRadius:99, fontWeight:700 }}>Low</span>}
                            </div>
                            {/* mini stock bar */}
                            <div style={{ width:80, height:4, borderRadius:99, background: isLow ? '#fee2e2' : '#dcfce7', overflow:'hidden' }}>
                              <div style={{
                                height:'100%', borderRadius:99,
                                background: isLow ? '#ef4444' : '#22c55e',
                                width:`${Math.min(100, (item.qty / Math.max((item.threshold??10)*2, 1)) * 100)}%`,
                              }}/>
                            </div>
                          </div>
                        </td>

                        {/* Price */}
                        <td style={S.td}>
                          <span style={{ fontWeight:600 }}>₱{Number(item.price||0).toFixed(2)}</span>
                        </td>

                        {/* Expiry */}
                        <td style={S.td}>
                          {item.expiry ? (() => {
                            const color = exp?.expired ? '#dc2626' : exp?.soon ? '#d97706' : 'var(--text)';
                            return (
                              <div>
                                <span style={{ color, fontWeight: exp?.soon ? 700 : 400 }}>{item.expiry}</span>
                                {exp?.soon && !exp.expired && <div style={{ fontSize:10, color:'#d97706', fontWeight:700 }}>{exp.days}d left</div>}
                                {exp?.expired && <div style={{ fontSize:10, color:'#dc2626', fontWeight:700 }}>EXPIRED</div>}
                              </div>
                            );
                          })() : <span style={{ color:'var(--muted)', fontSize:12 }}>—</span>}
                        </td>

                        {/* Supplier */}
                        <td style={S.td}>
                          <span style={{ fontSize:12, color:'var(--muted)' }}>{item.supplier || '—'}</span>
                        </td>

                        {/* Actions */}
                        {(perms.canEdit || perms.canDelete) && (
                          <td style={S.td} onClick={e => e.stopPropagation()}>
                            <div style={{ display:'flex', gap:5 }}>
                              <button className="btn btn-ghost btn-sm" style={{ ...S.btn, fontSize:12 }}
                                onClick={() => openView(item)}>View</button>
                              {perms.canEdit && (
                                <button className="btn btn-ghost btn-sm" style={{ ...S.btn, fontSize:12 }}
                                  onClick={e => openEdit(item, e)}>Edit</button>
                              )}
                              {perms.canDelete && (
                                <button className="btn btn-ghost btn-sm"
                                  style={{ ...S.btn, fontSize:12, color:'var(--danger)', borderColor:'var(--danger)' }}
                                  onClick={e => { e.stopPropagation(); setDeleteId(item.id); }}>Delete</button>
                              )}
                            </div>
                          </td>
                        )}
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

      {/* ── View Modal ── */}
      {viewItem && (
        <ViewModal
          item={viewItem}
          onClose={() => setViewItem(null)}
          onEdit={(item) => { setViewItem(null); openEdit(item); }}
          onDelete={(id) => setDeleteId(id)}
        />
      )}

      {/* ── Add / Edit Modal ── */}
      {editItem !== null && (
        <ItemFormModal
          item={editItem}
          onClose={() => setEditItem(null)}
          onSave={handleSave}
          saving={saving}
        />
      )}

      {/* ── Delete Confirm ── */}
      {deleteId && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999, padding:16 }}>
          <div style={{ background:'#fff', borderRadius:14, width:'100%', maxWidth:400, display:'flex', flexDirection:'column', boxShadow:'0 20px 60px rgba(0,0,0,0.25)' }}>
            <div className="modal-header"><h3>Confirm Delete</h3></div>
            <div className="modal-body">
              <p style={{ color:'var(--muted)' }}>Are you sure you want to delete this item? This cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" style={S.btn} onClick={() => setDeleteId(null)}>Cancel</button>
              <button className="btn btn-danger" style={S.btn} onClick={() => doDelete(deleteId)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Inventory;