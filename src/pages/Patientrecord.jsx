import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import Layout from "../components/layout";
import { Modal } from "../components/layout";
import { supabase, sb } from "../js/supabase";
import { useCurrentUser } from "../js/useCurrentUser";
import { withBranchId } from "../js/useBranchFilter";

const userIcon = "/icon/user.png";
const checkIcon = "/icon/already-have-acc.png";
const plusIcon = "/icon/new-acc.png";

const Ic = ({ src, size = 14, style = {} }) => (
  <img
    src={src} alt="" width={size} height={size}
    style={{ objectFit: "contain", flexShrink: 0, display: "inline-block", verticalAlign: "middle", mixBlendMode: "multiply", ...style }}
    onError={e => { e.target.style.display = "none"; }}
  />
);

const HEALTH_BADGE = { Good: "badge-green", Fair: "badge-yellow", Critical: "badge-red" };
const STATUS_BADGE = { Admitted: "badge-blue", Outpatient: "badge-gray" };
const FREQ_OPTIONS = ["Once daily", "Twice daily", "Three times daily", "Every 8 hours", "Every 12 hours", "As needed", "Weekly", "Other"];
const ROUTE_OPTIONS = ["Oral", "Topical", "Injection", "IV", "Eye drops", "Ear drops", "Other"];

const ADD_TABS = ["info", "vaccination", "treatment"];
const OWNER_STEPS = { ASK: "ask", SEARCH: "search", FORM: "form" };

const T_PATIENTS = "patients";
const T_PROFILES = "profiles";
const T_ROOMS = "rooms";
const T_MESSAGES = "messages";
const T_VACCINATIONS = "vaccinations";
const T_TREATMENTS = "treatments";
const T_PRESCRIPTIONS = "prescriptions";
const ROWS_PER_PAGE = 10;

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const SkeletonStyles = () => (
  <style>{`
    @keyframes sk-shimmer {
      0%   { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    .sk {
      background: linear-gradient(90deg, var(--border) 25%, rgba(0,0,0,0.04) 50%, var(--border) 75%);
      background-size: 200% 100%;
      animation: sk-shimmer 1.4s ease-in-out infinite;
      border-radius: 6px;
    }

    /* ── Vaccination Card ── */
    @keyframes vax-stamp {
      0% { transform: scale(1.4) rotate(-8deg); opacity: 0; }
      60% { transform: scale(0.95) rotate(2deg); opacity: 1; }
      100% { transform: scale(1) rotate(0deg); opacity: 1; }
    }
    .vax-card {
      background: linear-gradient(145deg, #f0fdf4 0%, #ffffff 40%, #f7fef9 100%);
      border: 1px solid #bbf7d0;
      border-radius: 14px;
      padding: 18px 20px;
      position: relative;
      overflow: hidden;
      transition: box-shadow 0.2s, transform 0.2s;
    }
    .vax-card:hover {
      box-shadow: 0 6px 20px rgba(22,163,74,0.12);
      transform: translateY(-1px);
    }
    .vax-card::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 4px;
      background: linear-gradient(90deg, #16a34a, #22c55e, #86efac);
      border-radius: 14px 14px 0 0;
    }
    .vax-card::after {
      content: '';
      position: absolute;
      bottom: 10px; right: 14px;
      width: 28px; height: 28px;
      opacity: 0.06;
      pointer-events: none;
    }
    .vax-stamp {
      position: absolute;
      top: 12px; right: 14px;
      width: 52px; height: 52px;
      border-radius: 50%;
      border: 2.5px solid #16a34a;
      display: flex; align-items: center; justify-content: center;
      flex-direction: column;
      background: #f0fdf4;
      animation: vax-stamp 0.4s cubic-bezier(0.34,1.56,0.64,1) both;
    }
    .vax-stamp-text { font-size: 7px; font-weight: 800; color: #16a34a; text-transform: uppercase; letter-spacing: 0.5px; text-align: center; line-height: 1.2; }

    /* ── Treatment Paper ── */
    .treat-paper {
      background: #fffef5;
      border: 1px solid #e8e0c8;
      border-radius: 3px;
      padding: 20px 22px;
      position: relative;
      box-shadow: 2px 3px 8px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.05);
      margin-bottom: 12px;
      transition: box-shadow 0.2s;
    }
    .treat-paper:hover {
      box-shadow: 3px 5px 14px rgba(0,0,0,0.12);
    }
    .treat-paper::before {
      content: '';
      position: absolute;
      left: 42px; top: 0; bottom: 0;
      width: 1px;
      background: rgba(220,38,38,0.25);
    }
    .treat-paper::after {
      content: '';
      position: absolute;
      top: 0; left: 0;
      width: 0; height: 0;
      border-style: solid;
      border-width: 0 16px 16px 0;
      border-color: transparent #e8e0c8 transparent transparent;
    }
    .treat-lines {
      background-image: repeating-linear-gradient(
        transparent,
        transparent 27px,
        rgba(147,197,253,0.3) 27px,
        rgba(147,197,253,0.3) 28px
      );
    }

    /* ── Prescription Slip ── */
    .rx-slip {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      overflow: hidden;
      margin-bottom: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      transition: box-shadow 0.2s, transform 0.2s;
    }
    .rx-slip:hover {
      box-shadow: 0 6px 20px rgba(30,58,138,0.10);
      transform: translateY(-1px);
    }
    .rx-slip-header {
      background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
      padding: 12px 16px;
      display: flex; align-items: center; justify-content: space-between;
    }
    .rx-symbol {
      font-size: 22px;
      font-weight: 900;
      color: rgba(255,255,255,0.15);
      font-style: italic;
      position: absolute;
      right: 14px; top: 8px;
      line-height: 1;
      pointer-events: none;
    }
    .rx-slip-body {
      padding: 14px 16px;
    }
    .rx-field-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      border-radius: 20px;
      padding: 3px 10px;
      font-size: 11px;
      color: #475569;
      font-weight: 600;
    }
    .rx-field-pill.blue { background: #eff6ff; border-color: #bfdbfe; color: #1e40af; }
    .rx-field-pill.green { background: #f0fdf4; border-color: #bbf7d0; color: #166534; }
    .rx-field-pill.amber { background: #fffbeb; border-color: #fde68a; color: #92400e; }

    /* ── Info card ── */
    .info-field-card {
      background: #f8fafc;
      border: 1.5px solid var(--border);
      border-radius: 10px;
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .info-field-label {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #94a3b8;
    }
    .info-field-value {
      font-size: 14px;
      font-weight: 600;
      color: var(--text);
    }
    .patient-hero {
      background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 60%, #2563eb 100%);
      border-radius: 14px;
      padding: 20px 22px;
      margin-bottom: 20px;
      position: relative;
      overflow: hidden;
    }
    .patient-hero::before {
      content: '';
      position: absolute;
      top: -40px; right: -40px;
      width: 180px; height: 180px;
      border-radius: 50%;
      background: rgba(255,255,255,0.04);
      pointer-events: none;
    }/* ── Modern Select Styling ── */
    .form-group select {
      width: 100%;
      padding: 9px 36px 9px 12px;
      border: 1.5px solid #e2e8f0;
      border-radius: 10px;
      background: #f8fafc;
      color: var(--text);
      font-size: 13px;
      font-weight: 600;
      font-family: inherit;
      outline: none;
      appearance: none;
      cursor: pointer;
      background-image:
        url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%236366f1' stroke-width='2.5' stroke-linecap='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E"),
        linear-gradient(to bottom, #ffffff 0%, #f1f5f9 100%);
      background-repeat: no-repeat, no-repeat;
      background-position: right 11px center, 0 0;
      background-size: 10px 10px, 100% 100%;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8);
      transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
    }
    .form-group select:focus {
      border-color: #6366f1;
      box-shadow: 0 0 0 3px rgba(99,102,241,0.12), 0 1px 3px rgba(0,0,0,0.06);
      background-image:
        url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%236366f1' stroke-width='2.5' stroke-linecap='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E"),
        linear-gradient(to bottom, #ffffff 0%, #eff6ff 100%);
      background-repeat: no-repeat, no-repeat;
      background-position: right 11px center, 0 0;
      background-size: 10px 10px, 100% 100%;
    }
    .form-group select:hover:not(:focus) {
      border-color: #a5b4fc;
      background-image:
        url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%236366f1' stroke-width='2.5' stroke-linecap='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E"),
        linear-gradient(to bottom, #ffffff 0%, #eef2ff 100%);
      background-repeat: no-repeat, no-repeat;
      background-position: right 11px center, 0 0;
      background-size: 10px 10px, 100% 100%;
      box-shadow: 0 2px 6px rgba(99,102,241,0.08), inset 0 1px 0 rgba(255,255,255,0.9);
    }

    .next-due-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: #fef3c7;
      border: 1px solid #fde68a;
      border-radius: 20px;
      padding: 3px 10px;
      font-size: 11px;
      font-weight: 700;
      color: #92400e;
    }
    .stat-card-v2 {
      background: var(--card);
      border: 1.5px solid var(--border);
      border-radius: 16px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
      cursor: pointer;
      text-decoration: none;
      color: var(--text);
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
    .stat-card-v2.red::before    { background: linear-gradient(90deg,#dc2626,#ef4444); }
    .stat-card-v2 .stat-icon-v2 {
      width: 46px; height: 46px; border-radius: 12px;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .stat-card-v2 .stat-icon-v2.blue   { background: #eff6ff; }
    .stat-card-v2 .stat-icon-v2.green  { background: #f0fdf4; }
    .stat-card-v2 .stat-icon-v2.yellow { background: #fffbeb; }
    .stat-card-v2 .stat-icon-v2.red    { background: #fff1f2; }
    .stat-card-v2 .stat-icon-v2.blue   img { filter: brightness(0) saturate(100%) invert(17%) sepia(82%) saturate(1200%) hue-rotate(210deg); }
    .stat-card-v2 .stat-icon-v2.green  img { filter: brightness(0) saturate(100%) invert(32%) sepia(80%) saturate(600%) hue-rotate(110deg) brightness(0.9); }
    .stat-card-v2 .stat-icon-v2.yellow img { filter: brightness(0) saturate(100%) invert(52%) sepia(90%) saturate(600%) hue-rotate(10deg) brightness(0.9); }
    .stat-card-v2 .stat-icon-v2.red    img { filter: brightness(0) saturate(100%) invert(20%) sepia(90%) saturate(1200%) hue-rotate(340deg) brightness(0.9); }
  `}</style>
);

const Sk = ({ w = "100%", h = 14, r = 6, style = {} }) => (
  <div className="sk" style={{ width: w, height: h, borderRadius: r, flexShrink: 0, ...style }} />
);

const StatCardSkeleton = () => (
  <div style={{ background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 14, pointerEvents: 'none' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div className="sk" style={{ width: 46, height: 46, borderRadius: 12 }} />
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <Sk w="45%" h={11} />
      <Sk w="30%" h={26} />
      <Sk w="60%" h={10} />
    </div>
  </div>
);

const TableRowSkeleton = () => (
  <tr>
    {[120, 100, 90, 110, 70, 60, 50, 80].map((w, i) => (
      <td key={i} style={{ padding: "13px 14px", borderBottom: "1px solid var(--border)" }}>
        <Sk w={w} h={13} />
      </td>
    ))}
  </tr>
);

// ── Sub-components ────────────────────────────────────────────────────────────
const VaxFields = ({ form, setForm }) => (
  <div className="form-grid">
    <div className="form-group"><label>Vaccine Name *</label><input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Rabies Vaccine" /></div>
    <div className="form-group"><label>Date Given *</label><input type="date" value={form.date_given} onChange={e => setForm({ ...form, date_given: e.target.value })} /></div>
    <div className="form-group"><label>Next Due Date</label><input type="date" value={form.next_due} onChange={e => setForm({ ...form, next_due: e.target.value })} /></div>
    <div className="form-group"><label>Given By</label><input type="text" value={form.given_by} onChange={e => setForm({ ...form, given_by: e.target.value })} placeholder="Vet name" /></div>
  </div>
);

const TreatFields = ({ form, setForm }) => (
  <div className="form-grid">
    <div className="form-group"><label>Date *</label><input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
    <div className="form-group"><label>Vet</label><input type="text" value={form.vet} onChange={e => setForm({ ...form, vet: e.target.value })} placeholder="Vet name" /></div>
    <div className="form-group form-full"><label>Diagnosis *</label><input type="text" value={form.diagnosis} onChange={e => setForm({ ...form, diagnosis: e.target.value })} placeholder="e.g. Skin infection" /></div>
    <div className="form-group form-full"><label>Notes</label><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Treatment details..." style={{ minHeight: 72 }} /></div>
  </div>
);

const RoomSelect = ({ value, onChange, rooms }) => {
  const availableRooms = rooms.filter(r => r.status === "Available");
  const unavailableRooms = rooms.filter(r => r.status !== "Available");
  return (
    <>
      {rooms.length === 0 ? (
        <div style={{ padding: "9px 12px", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 13, color: "var(--muted)", background: "var(--bg)" }}>Loading rooms…</div>
      ) : (
        <select value={value} onChange={onChange}>
          <option value="">— No room assigned —</option>
          {availableRooms.length > 0 && (
            <optgroup label="Available">
              {availableRooms.map(r => (
                <option key={r.id} value={r.number}>{r.number}{r.type ? ` · ${r.type}` : ""}{r.infected ? " Isolation" : ""}</option>
              ))}
            </optgroup>
          )}
          {unavailableRooms.length > 0 && (
            <optgroup label="Unavailable">
              {unavailableRooms.map(r => (
                <option key={r.id} value={r.number} disabled>{r.number}{r.type ? ` · ${r.type}` : ""} — {r.status}{r.patient ? ` (${r.patient})` : ""}</option>
              ))}
            </optgroup>
          )}
        </select>
      )}
      <div style={{ marginTop: 5, fontSize: 11, color: "var(--muted)", display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#16a34a", display: "inline-block" }} />
        {availableRooms.length} available
        <span style={{ marginLeft: 6, width: 7, height: 7, borderRadius: "50%", background: "#9ca3af", display: "inline-block" }} />
        {unavailableRooms.length} unavailable
      </div>
    </>
  );
};

const CredentialCard = ({ credentials, onClose }) => {
  const [copied, setCopied] = React.useState(false);
  const copyAll = () => {
    const text = `Name: ${credentials.fullName}\nEmail: ${credentials.email}\nPassword: ${credentials.password}`;
    navigator.clipboard?.writeText(text).catch(() => {
      const el = document.createElement("textarea");
      el.value = text; document.body.appendChild(el); el.select();
      document.execCommand("copy"); document.body.removeChild(el);
    });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1200, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 24px 64px rgba(0,0,0,0.30)", width: "100%", maxWidth: 440, overflow: "hidden" }}>
        <div style={{ background: "linear-gradient(135deg,#f0fdf4,#dcfce7)", padding: "20px 24px 16px", borderBottom: "1px solid #bbf7d0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Ic src={checkIcon} size={24} style={{ mixBlendMode: "normal", filter: "brightness(0) invert(1)" }} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#14532d" }}>Account Created!</h3>
              <p style={{ margin: 0, fontSize: 12, color: "#16a34a", marginTop: 2 }}>Share these credentials with the owner</p>
            </div>
          </div>
        </div>
        <div style={{ padding: "20px 24px" }}>
          {[["Name", credentials.fullName], ["Email", credentials.email], ["Password", credentials.password]].map(([label, value]) => (
            <div key={label} style={{ marginBottom: 12 }}>
              <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.4px" }}>{label}</p>
              <div style={{ background: "#f8fafc", border: "1.5px solid var(--border)", borderRadius: 8, padding: "9px 14px", fontSize: 13, fontWeight: 600, color: "var(--text)", fontFamily: label === "Password" ? "monospace" : "inherit" }}>{value}</div>
            </div>
          ))}
          <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#92400e", display: "flex", alignItems: "flex-start", gap: 8, marginTop: 4 }}>
            <span>Please save or share these credentials now. The password won't be shown again.</span>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "14px 24px", borderTop: "1px solid var(--border)" }}>
          <button className="btn btn-ghost" style={{ width: "auto" }} onClick={copyAll}>{copied ? "Copied!" : "Copy All"}</button>
          <button className="btn btn-primary" style={{ width: "auto" }} onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
};

const LiveToast = ({ message, show, type = 'success' }) => {
  const colors = {
    success: { bg: '#1e293b', dot: '#22c55e' },
    error: { bg: '#7f1d1d', dot: '#ef4444' },
    info: { bg: '#1e3a8a', dot: '#60a5fa' },
  };
  const c = colors[type] || colors.success;
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      background: c.bg, color: '#fff', borderRadius: 10,
      padding: '11px 18px', fontSize: 13, fontWeight: 600,
      display: 'flex', alignItems: 'center', gap: 8,
      boxShadow: '0 8px 24px rgba(0,0,0,0.22)',
      opacity: show ? 1 : 0,
      transform: show ? 'translateY(0)' : 'translateY(10px)',
      transition: 'opacity 0.25s, transform 0.25s',
      pointerEvents: 'none',
    }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.dot, display: 'inline-block', flexShrink: 0 }} />
      {message}
    </div>
  );
};

const EditIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const CustomSelect = ({ value, onChange, options, placeholder = "—", accent = "#6366f1" }) => {
  const [open, setOpen] = React.useState(false);
  const [dropPos, setDropPos] = React.useState({ top: 0, left: 0, width: 0 });
  const triggerRef = React.useRef(null);
  const ref = React.useRef(null);
  const selected = options.find(o => (o.value ?? o) === value);
  const label = selected ? (selected.label ?? selected) : placeholder;

  React.useEffect(() => {
    const handler = (e) => {
      if (
        ref.current && !ref.current.contains(e.target) &&
        triggerRef.current && !triggerRef.current.contains(e.target)
      ) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
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

  const portal = open && typeof document !== "undefined"
    ? ReactDOM.createPortal(
      <div
        ref={ref}
        style={{
          position: "absolute",
          top: dropPos.top,
          left: dropPos.left,
          width: dropPos.width,
          background: "#fff",
          borderRadius: 10,
          zIndex: 99999,
          boxShadow: "0 8px 24px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.08)",
          border: "1.5px solid #e2e8f0",
          maxHeight: 240,
          overflowY: "auto",
        }}
      >
        {[{ value: "", label: placeholder }, ...options].map((opt, i) => {
          const optVal = opt.value ?? opt;
          const optLabel = opt.label ?? opt;
          const isSelected = optVal === value;
          const isEmpty = optVal === "";
          return (
            <div
              key={i}
              onClick={() => { onChange(optVal); setOpen(false); }}
              style={{
                padding: "9px 14px", fontSize: 13, fontWeight: isSelected ? 700 : 500,
                color: isEmpty ? "#94a3b8" : isSelected ? "#4f46e5" : "#1e293b",
                cursor: "pointer", transition: "background 0.1s",
                background: isSelected ? "#eff6ff" : "transparent",
                borderBottom: i < options.length ? "1px solid #f1f5f9" : "none",
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}
              onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "#f8fafc"; }}
              onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
            >
              <span>{optLabel}</span>
              {isSelected && !isEmpty && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
              )}
            </div>
          );
        })}
      </div>,
      document.body
    )
    : null;

  return (
    <div style={{ position: "relative", width: "100%" }}>
      {/* Trigger */}
      <div
        ref={triggerRef}
        onClick={handleOpen}
        style={{
          width: "100%", padding: "7px 28px 7px 10px", border: "1.5px solid #e2e8f0",
          borderRadius: 8, background: "linear-gradient(to bottom, #ffffff, #f8fafc)",
          fontSize: 13, fontWeight: 600, color: value ? "var(--text)" : "#94a3b8",
          cursor: "pointer", userSelect: "none", boxSizing: "border-box",
          boxShadow: open ? "0 0 0 3px rgba(99,102,241,0.12), 0 1px 3px rgba(0,0,0,0.06)" : "0 1px 3px rgba(0,0,0,0.06)",
          borderColor: open ? accent : "#e2e8f0",
          transition: "border-color 0.15s, box-shadow 0.15s",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}
      >
        <span>{label}</span>
        <svg
          width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={accent}
          strokeWidth="2.5" strokeLinecap="round"
          style={{ flexShrink: 0, transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
      {portal}
    </div>
  );
};

// ─── Premium View Tab Components ──────────────────────────────────────────────

/** Patient Info Tab — Hero card + structured fields */
const PatientInfoTab = ({ patient }) => {
  const healthColor = { Good: '#16a34a', Fair: '#d97706', Critical: '#dc2626' }[patient.health] || '#64748b';
  const statusColor = { Admitted: '#1e3a8a', Outpatient: '#0891b2' }[patient.status] || '#64748b';

  return (
    <div style={{ paddingTop: 4 }}>
      {/* Hero banner */}
      <div className="patient-hero">
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16, flexShrink: 0,
              background: 'rgba(255,255,255,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 26, border: '2px solid rgba(255,255,255,0.2)',
            }}>
              {patient.species === 'Cat'
                ? <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="1.5" strokeLinecap="round"><path d="M12 5c-4.4 0-8 3.1-8 7 0 2.4 1.3 4.5 3.3 5.8L6 21h12l-1.3-3.2C18.7 16.5 20 14.4 20 12c0-3.9-3.6-7-8-7z" /><path d="M5 5 3 1l3 3M19 5l2-4-3 3" /><circle cx="9" cy="12" r="1" /><circle cx="15" cy="12" r="1" /></svg>
                : <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="1.5" strokeLinecap="round"><path d="M10 5.172C10 3.782 8.423 2.679 6.5 3c-2 .336-3.5 2.112-3.5 4v3a3 3 0 0 0 6 0V5.172zM14 5.172C14 3.782 15.577 2.679 17.5 3c2 .336 3.5 2.112 3.5 4v3a3 3 0 0 0-6 0V5.172z" /><path d="M8 14v.5M16 14v.5M11.25 16.25h1.5L12 17z" /><path d="M4.42 11.247A13.152 13.152 0 0 0 4 14.556C4 18.728 7.582 21 12 21s8-2.272 8-6.444c0-1.061-.162-2.2-.493-3.309" /></svg>}
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>{patient.name}</h2>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.65)' }}>
                {patient.species}{patient.breed ? ` · ${patient.breed}` : ''}{patient.gender ? ` · ${patient.gender}` : ''}
              </p>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
              <span style={{
                background: `${healthColor}22`, border: `1.5px solid ${healthColor}66`,
                color: healthColor === '#16a34a' ? '#bbf7d0' : healthColor === '#d97706' ? '#fde68a' : '#fca5a5',
                borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 700,
              }}>{patient.health}</span>
              <span style={{
                background: `${statusColor}22`, border: `1.5px solid ${statusColor}55`,
                color: '#bfdbfe', borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 700,
              }}>{patient.status}</span>
            </div>
          </div>
          {/* Quick stats row */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>, label: patient.room ? `Room ${patient.room}` : 'No Room Assigned' },
              { icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>, label: patient.owner || 'No Owner' },
              { icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5 19.79 19.79 0 0 1 1.6 4.9 2 2 0 0 1 3.58 2.72h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.1a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.5 17.5z" /></svg>, label: patient.contact || 'No Contact' },
            ].map(({ icon, label }) => (
              <span key={label} style={{
                background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 8, padding: '5px 10px', fontSize: 12, color: 'rgba(255,255,255,0.8)',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span>{icon}</span> {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Fields grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {[
          { label: 'Patient Name', value: patient.name },
          { label: 'Species', value: patient.species },
          { label: 'Breed', value: patient.breed || '—' },
          { label: 'Sex / Gender', value: patient.gender || '—' },
          { label: 'Owner Name', value: patient.owner || '—' },
          { label: 'Contact Number', value: patient.contact || '—' },
          { label: 'Owner Email', value: patient.owner_email || '—' },
          { label: 'Assigned Room', value: patient.room ? `Room ${patient.room}` : 'N/A' },
        ].map(({ label, value, icon }) => (
          <div key={label} className="info-field-card">
            <span className="info-field-label">{label}</span>
            <span className="info-field-value">{value}</span>
          </div>
        ))}

        {/* Condition — full width */}
        {patient.condition && (
          <div style={{ gridColumn: '1 / -1' }}>
            <div style={{
              background: '#fffbeb', border: '1.5px solid #fde68a',
              borderRadius: 10, padding: '14px 16px',
            }}>
              <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: '#92400e', display: 'flex', alignItems: 'center', gap: 5 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
                Condition / Diagnosis
              </p>
              <p style={{ margin: 0, fontSize: 14, color: '#78350f', lineHeight: 1.6, fontWeight: 500 }}>
                {patient.condition}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/** Vaccination Card Tab */
const VaxCard = ({ v, onEdit, onDelete, isEditing }) => {
  const isExpired = v.next_due && new Date(v.next_due) < new Date();
  const isDueSoon = v.next_due && !isExpired && (new Date(v.next_due) - new Date()) < 30 * 24 * 3600 * 1000;

  return (
    <div className="vax-card">
      {/* Stamp */}
      <div className="vax-stamp">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
        <span className="vax-stamp-text">VACC'D</span>
      </div>

      {/* Card header */}
      <div style={{ marginBottom: 12, paddingRight: 60 }}>
        <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#14532d' }}>{v.name}</h4>
        {v.given_by && (
          <p style={{ margin: '3px 0 0', fontSize: 12, color: '#16a34a', fontWeight: 600 }}>
            Administered by: {v.given_by}
          </p>
        )}
      </div>

      {/* Dates row */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
        <div style={{
          background: '#dcfce7', border: '1px solid #86efac',
          borderRadius: 8, padding: '6px 12px',
        }}>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: 0.5 }}>Date Given</p>
          <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 700, color: '#14532d' }}>
            {new Date(v.date_given).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        {v.next_due && (
          <div style={{
            background: isExpired ? '#fef2f2' : isDueSoon ? '#fffbeb' : '#f0fdf4',
            border: `1px solid ${isExpired ? '#fca5a5' : isDueSoon ? '#fde68a' : '#86efac'}`,
            borderRadius: 8, padding: '6px 12px',
          }}>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: isExpired ? '#991b1b' : isDueSoon ? '#92400e' : '#166534', textTransform: 'uppercase', letterSpacing: 0.5 }}>Next Due</p>
            <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 700, color: isExpired ? '#dc2626' : isDueSoon ? '#d97706' : '#14532d' }}>
              {new Date(v.next_due).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            {isExpired && <span style={{ fontSize: 10, color: '#dc2626', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3 }}><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>OVERDUE</span>}
            {isDueSoon && <span style={{ fontSize: 10, color: '#d97706', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3 }}><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>Due soon</span>}
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, borderTop: '1px dashed #86efac', paddingTop: 10, marginTop: 4 }}>
        <button onClick={() => onEdit(v)} style={{ background: 'none', border: 'none', color: '#16a34a', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}>
          <EditIcon /> Edit
        </button>
        <button onClick={() => onDelete(v.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}>
          Delete
        </button>
      </div>
    </div>
  );
};

/** Treatment Paper Tab */
const TreatmentPaper = ({ t, onEdit, onDelete }) => (
  <div className="treat-paper treat-lines">
    {/* Corner fold */}
    <div style={{ position: 'absolute', top: 0, right: 0, width: 0, height: 0, borderStyle: 'solid', borderWidth: '0 24px 24px 0', borderColor: 'transparent #e8e0c8 transparent transparent' }} />

    <div style={{ paddingLeft: 50 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12, paddingRight: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6, background: '#f1f5f9', flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
            </span>
            <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#1e293b' }}>{t.diagnosis}</h4>
          </div>
          {t.vet && (
            <p style={{ margin: 0, fontSize: 12, color: '#64748b', fontStyle: 'italic' }}>
              Dr. {t.vet}
            </p>
          )}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
            {new Date(t.date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Notes — lined paper style */}
      {t.notes && (
        <div style={{ borderTop: '1px solid rgba(147,197,253,0.4)', paddingTop: 10 }}>
          <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: '#94a3b8' }}>Clinical Notes</p>
          <p style={{ margin: 0, fontSize: 13, color: '#334155', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{t.notes}</p>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginTop: 12, borderTop: '1px solid #e8e0c8', paddingTop: 8 }}>
        <button onClick={() => onEdit(t)} style={{ background: 'none', border: 'none', color: '#d97706', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}>
          <EditIcon /> Edit
        </button>
        <button onClick={() => onDelete(t.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}>
          Delete
        </button>
      </div>
    </div>
  </div>
);

/** Prescription Slip */
const PrescriptionSlip = ({ rx, onEdit, onDelete }) => (
  <div className="rx-slip">
    {/* Header */}
    <div className="rx-slip-header" style={{ position: 'relative' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2" strokeLinecap="round"><path d="M10.5 20H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H20a2 2 0 0 1 2 2v3" /><circle cx="18" cy="18" r="3" /><path d="m22 22-1.5-1.5" /></svg>
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#fff' }}>{rx.medicine}</h4>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>{rx.dosage}</span>
          </div>
        </div>
      </div>
      <span className="rx-symbol">℞</span>
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <button onClick={() => onEdit(rx)} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', color: '#fff', cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: 'inherit', borderRadius: 6, padding: '5px 10px' }}>
          Edit
        </button>
        <button onClick={() => onDelete(rx.id)} style={{ background: 'rgba(239,68,68,0.25)', border: '1px solid rgba(239,68,68,0.4)', color: '#fca5a5', cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: 'inherit', borderRadius: 6, padding: '5px 10px' }}>
          Delete
        </button>
      </div>
    </div>

    {/* Body */}
    <div className="rx-slip-body">
      {/* Pill tags */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
        {rx.frequency && <span className="rx-field-pill blue"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg> {rx.frequency}</span>}
        {rx.route && <span className="rx-field-pill green"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="2" x2="12" y2="6" /><path d="M12 14v8" /><path d="M8 10c0-2.2 1.8-4 4-4s4 1.8 4 4" /></svg> {rx.route}</span>}
        {rx.duration && <span className="rx-field-pill amber"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg> {rx.duration}</span>}
        {rx.prescribed_by && <span className="rx-field-pill"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg> {rx.prescribed_by}</span>}
        {rx.date_prescribed && <span className="rx-field-pill"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg> {new Date(rx.date_prescribed).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
      </div>

      {/* Instructions */}
      {rx.instructions && (
        <div style={{
          background: '#fffbeb', border: '1px solid #fde68a',
          borderRadius: 8, padding: '8px 12px',
          display: 'flex', gap: 8, alignItems: 'flex-start',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 1 }}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
          <p style={{ margin: 0, fontSize: 12, color: '#78350f', lineHeight: 1.5 }}>
            <strong>Instructions:</strong> {rx.instructions}
          </p>
        </div>
      )}
    </div>
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────
const PatientRecord = () => {
  const { user, isAdmin, seeAllBranches, loading: userLoading } = useCurrentUser();
  const [branchFilter, setBranchFilter] = useState("");
  const [branches, setBranches] = useState([]);

  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [patients, setPatients] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeModal, setActiveModal] = useState(null);
  const [activeTab, setActiveTab] = useState("info");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [vaccinations, setVaccinations] = useState([]);
  const [treatments, setTreatments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [savingPatient, setSavingPatient] = useState(false);
  const [rxSaving, setRxSaving] = useState(false);
  const [vaxSaving, setVaxSaving] = useState(false);
  const [treatSaving, setTreatSaving] = useState(false);
  const [showRxForm, setShowRxForm] = useState(false);
  const [showVaxForm, setShowVaxForm] = useState(false);
  const [showTreatForm, setShowTreatForm] = useState(false);
  const [editingVaxId, setEditingVaxId] = useState(null);
  const [editingTreatId, setEditingTreatId] = useState(null);
  const [editingRxId, setEditingRxId] = useState(null);
  const [editVaxForm, setEditVaxForm] = useState({ name: "", date_given: "", next_due: "", given_by: "" });
  const [editTreatForm, setEditTreatForm] = useState({ date: "", diagnosis: "", notes: "", vet: "" });
  const [editRxForm, setEditRxForm] = useState({ medicine: "", dosage: "", frequency: "Once daily", route: "Oral", duration: "", instructions: "", prescribed_by: "", date_prescribed: "" });
  const [pendingVax, setPendingVax] = useState([]);
  const [pendingTreat, setPendingTreat] = useState([]);
  const [addVaxForm, setAddVaxForm] = useState({ name: "", date_given: new Date().toISOString().slice(0, 10), next_due: "", given_by: "" });
  const [addTreatForm, setAddTreatForm] = useState({ date: new Date().toISOString().slice(0, 10), diagnosis: "", notes: "", vet: "" });
  const [showAddVaxForm, setShowAddVaxForm] = useState(false);
  const [showAddTreatForm, setShowAddTreatForm] = useState(false);
  const [ownerStep, setOwnerStep] = useState(OWNER_STEPS.ASK);
  const [ownerSearchQuery, setOwnerSearchQuery] = useState("");
  const [ownerSearchRes, setOwnerSearchRes] = useState([]);
  const [ownerSearchLoading, setOwnerSearchLoading] = useState(false);
  const [selectedOwnerProfile, setSelectedOwnerProfile] = useState(null);
  const [existingAccModal, setExistingAccModal] = useState({ show: false, email: "", existingName: "", onContinue: null });
  const [appModal, setAppModal] = useState({ show: false, title: "", message: "", onConfirm: null, onCancel: null, confirmText: "OK", cancelText: null, confirmColor: "var(--royal)" });
  const [form, setForm] = useState({ name: "", species: "", breed: "", gender: "", owner: "", owner_first: "", owner_last: "", contact: "", owner_email: "", condition: "", status: "Outpatient", health: "Good", room: "" });
  const [rxForm, setRxForm] = useState({ medicine: "", dosage: "", frequency: "Once daily", route: "Oral", duration: "", instructions: "", prescribed_by: "", date_prescribed: new Date().toISOString().slice(0, 10) });
  const [vaxForm, setVaxForm] = useState({ name: "", date_given: new Date().toISOString().slice(0, 10), next_due: "", given_by: "" });
  const [treatForm, setTreatForm] = useState({ date: new Date().toISOString().slice(0, 10), diagnosis: "", notes: "", vet: "" });
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const toastTimer = useRef(null);
  const [editingPatient, setEditingPatient] = useState(null);
  const [editPatientForm, setEditPatientForm] = useState({ name: '', species: '', breed: '', gender: '', owner: '', contact: '', owner_email: '', condition: '', status: 'Outpatient', health: 'Good', room: '' });
  const [editPatientSaving, setEditPatientSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!seeAllBranches) return;
    supabase.from("branches").select("id, name").then(({ data }) => setBranches(data || []));
  }, [seeAllBranches]);

  if (userLoading) {
    return (
      <Layout>
        <SkeletonStyles />
        <div className="topbar" style={{ position: "fixed", top: 56, left: "var(--current-sidebar-w, 62px)", right: 0, zIndex: 90, background: "#fff" }}>
          <div className="topbar-title">
            <div className="sk" style={{ width: 22, height: 22, borderRadius: 6 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Sk w={160} h={16} /><Sk w={220} h={11} />
            </div>
          </div>
          <div className="topbar-actions">
            <Sk w={200} h={36} r={8} /><Sk w={120} h={36} r={8} />
          </div>
        </div>
        <div className="content">
          <div className="stat-grid" style={{ marginBottom: 20 }}>
            <StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton />
          </div>
          <div style={{ background: "#fff", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", boxShadow: "var(--shadow)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 22px", borderBottom: "1px solid var(--border)" }}>
              <Sk w={120} h={15} /><Sk w={60} h={13} />
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>{[140, 110, 90, 120, 80, 70, 60, 90].map((w, i) => (<th key={i} style={{ padding: "11px 14px", background: "var(--bg)", borderBottom: "1px solid var(--border)" }}><Sk w={w} h={11} /></th>))}</tr></thead>
              <tbody><TableRowSkeleton /><TableRowSkeleton /><TableRowSkeleton /><TableRowSkeleton /></tbody>
            </table>
          </div>
        </div>
      </Layout>
    );
  }

  const showAlert = (title, message) => setAppModal({ show: true, title, message, onConfirm: () => setAppModal(m => ({ ...m, show: false })), onCancel: null, confirmText: "OK", cancelText: null, confirmColor: "var(--royal)" });
  const showConfirm = (title, message, onConfirm, confirmColor = "#dc2626") => setAppModal({ show: true, title, message, onConfirm: () => { setAppModal(m => ({ ...m, show: false })); onConfirm(); }, onCancel: () => setAppModal(m => ({ ...m, show: false })), confirmText: "Yes, Delete", cancelText: "Cancel", confirmColor });

  const showToast = (message, type = 'success') => {
    clearTimeout(toastTimer.current);
    setToast({ show: true, message, type });
    toastTimer.current = setTimeout(() => setToast(t => ({ ...t, show: false })), 3000);
  };

  const fetchPatients = async () => {
    setLoading(true);
    let q = supabase.from(T_PATIENTS).select("*").order("created_at", { ascending: false });
    if (!seeAllBranches && user?.branchId) q = q.eq("branch_id", user.branchId);
    if (seeAllBranches && branchFilter) q = q.eq("branch_id", branchFilter);
    const { data, error } = await q;
    if (!error) setPatients(data || []);
    setLoading(false);
  };

  const fetchRooms = async () => {
    let q = supabase.from(T_ROOMS).select("*").order("number");
    if (!seeAllBranches && user?.branchId) q = q.eq("branch_id", user.branchId);
    if (seeAllBranches && branchFilter) q = q.eq("branch_id", branchFilter);
    const { data, error } = await q;
    if (!error && data) setRooms(data);
  };

  useEffect(() => {
    if (!user) return;
    fetchPatients(); fetchRooms();
    const patientChannel = supabase.channel("patients-realtime").on("postgres_changes", { event: "*", schema: "public", table: T_PATIENTS }, () => fetchPatients()).subscribe();
    const roomChannel = supabase.channel("rooms-realtime").on("postgres_changes", { event: "*", schema: "public", table: T_ROOMS }, () => fetchRooms()).subscribe();
    return () => { supabase.removeChannel(patientChannel); supabase.removeChannel(roomChannel); };
  }, [user, branchFilter]);

  const fetchMedical = async (patientId) => {
    const [vax, treat, rx] = await Promise.all([
      supabase.from(T_VACCINATIONS).select("*").eq("patient_id", patientId),
      supabase.from(T_TREATMENTS).select("*").eq("patient_id", patientId),
      supabase.from(T_PRESCRIPTIONS).select("*").eq("patient_id", patientId).order("date_prescribed", { ascending: false }),
    ]);
    setVaccinations(vax.data || []); setTreatments(treat.data || []); setPrescriptions(rx.data || []);
  };

  const filtered = patients.filter(p => {
    const matchSearch = !search || `${p.name} ${p.owner} ${p.species} ${p.breed} ${p.condition}`.toLowerCase().includes(search.toLowerCase());
    const matchFilter = statusFilter === "all" || p.status === statusFilter || (statusFilter === "Critical" && p.health === "Critical");
    return matchSearch && matchFilter;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * ROWS_PER_PAGE, safePage * ROWS_PER_PAGE);
  useEffect(() => { setCurrentPage(1); }, [search, statusFilter]);

  useEffect(() => {
    if (ownerStep !== OWNER_STEPS.SEARCH) return;
    if (!ownerSearchQuery.trim()) { setOwnerSearchRes([]); return; }
    const t = setTimeout(async () => {
      setOwnerSearchLoading(true);
      const q = ownerSearchQuery.trim();
      const { data, error } = await supabase
        .from(T_PROFILES)
        .select("id, first_name, last_name, email, role, branch_id")
        .in("role", ["customer", "Customer"])
        .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%`)
        .limit(20);
      if (error) console.error("Owner search error:", error);
      const mapped = (data || []).map(p => ({
        ...p,
        full_name: [p.first_name, p.last_name].filter(Boolean).join(" ") || p.email,
        branch_name: branches.find(b => b.id === p.branch_id)?.name || null,
      }));
      setOwnerSearchRes(mapped);
      setOwnerSearchLoading(false);
    }, 280);
    return () => clearTimeout(t);
  }, [ownerSearchQuery, ownerStep, branchFilter]);

  const openAdd = () => {
    setForm({ name: "", species: "", breed: "", gender: "", owner: "", owner_first: "", owner_last: "", contact: "", owner_email: "", condition: "", status: "Outpatient", health: "Good", room: "" });
    setPendingVax([]); setPendingTreat([]);
    setAddVaxForm({ name: "", date_given: new Date().toISOString().slice(0, 10), next_due: "", given_by: "" });
    setAddTreatForm({ date: new Date().toISOString().slice(0, 10), diagnosis: "", notes: "", vet: "" });
    setShowAddVaxForm(false); setShowAddTreatForm(false);
    setActiveTab("info"); setOwnerStep(OWNER_STEPS.ASK);
    setOwnerSearchQuery(""); setOwnerSearchRes([]); setSelectedOwnerProfile(null);
    fetchRooms(); setActiveModal("add");
  };

  const openView = (p) => {
    setSelectedPatient(p); setActiveTab("info");
    fetchMedical(p.id); fetchRooms();
    setShowRxForm(false); setShowVaxForm(false); setShowTreatForm(false);
    setEditingVaxId(null); setEditingTreatId(null); setEditingRxId(null);
    setActiveModal("view");
  };

  const closeModal = () => {
    setActiveModal(null); setActiveTab("info");
    setShowRxForm(false); setShowVaxForm(false); setShowTreatForm(false);
    setEditingVaxId(null); setEditingTreatId(null); setEditingRxId(null);
    setOwnerStep(OWNER_STEPS.ASK);
    setOwnerSearchQuery(""); setOwnerSearchRes([]); setSelectedOwnerProfile(null);
  };

  const addPendingVax = () => {
    if (!addVaxForm.name || !addVaxForm.date_given) { showAlert("Missing Fields", "Vaccine name and date given are required."); return; }
    setPendingVax(prev => [...prev, { ...addVaxForm, _key: Date.now() }]);
    setAddVaxForm({ name: "", date_given: new Date().toISOString().slice(0, 10), next_due: "", given_by: "" });
    setShowAddVaxForm(false);
  };
  const removePendingVax = (key) => setPendingVax(prev => prev.filter(v => v._key !== key));
  const addPendingTreat = () => {
    if (!addTreatForm.diagnosis) { showAlert("Missing Fields", "Diagnosis is required."); return; }
    setPendingTreat(prev => [...prev, { ...addTreatForm, _key: Date.now() }]);
    setAddTreatForm({ date: new Date().toISOString().slice(0, 10), diagnosis: "", notes: "", vet: "" });
    setShowAddTreatForm(false);
  };
  const removePendingTreat = (key) => setPendingTreat(prev => prev.filter(t => t._key !== key));

  const generatePassword = (name) => {
    const clean = (name || "owner").replace(/\s+/g, "").toLowerCase();
    return `${clean}@VetCare${Math.floor(1000 + Math.random() * 9000)}`;
  };

  const ensureProfile = async (userId, email, fullName) => {
    const parts = (fullName || "").trim().split(/\s+/);
    const first = parts[0] || ""; const last = parts.slice(1).join(" ") || "";
    await supabase.from(T_PROFILES).upsert(
      { id: userId, email, first_name: first, last_name: last, role: "Customer", branch_id: user?.branchId ?? null },
      { onConflict: "id", ignoreDuplicates: false }
    );
  };

  const occupyRoom = async (roomNumber, patientName, diagnosis) => {
    if (!roomNumber) return;
    const room = rooms.find(r => r.number === roomNumber);
    if (!room) return;
    await supabase.from(T_ROOMS).update({ status: "Occupied", patient: patientName || "", diagnosis: diagnosis || "" }).eq("id", room.id);
  };

  const freeRoom = async (roomNumber) => {
    if (!roomNumber) return;
    const { data } = await supabase.from(T_ROOMS).select("id").eq("number", roomNumber).single();
    if (!data) return;
    await supabase.from(T_ROOMS).update({ status: "Available", patient: "", diagnosis: "" }).eq("id", data.id);
  };

  const resolveOwnerFullName = () => {
    if (ownerStep === OWNER_STEPS.FORM) return [form.owner_first.trim(), form.owner_last.trim()].filter(Boolean).join(" ") || "";
    if (selectedOwnerProfile) return selectedOwnerProfile.full_name || form.owner;
    return form.owner.trim();
  };

  const executeSavePatient = async ({ ownerUserId, ownerPassword, resolvedEmail, existingAccountFound = false }) => {
    if (form.room) {
      const chosenRoom = rooms.find(r => r.number === form.room);
      if (chosenRoom && chosenRoom.status !== "Available") {
        setSavingPatient(false);
        showAlert("Room Unavailable", `Room ${form.room} is currently "${chosenRoom.status}"${chosenRoom.patient ? ` (${chosenRoom.patient})` : ""}. Please choose a different room.`);
        return;
      }
    }
    const fullOwnerName = resolveOwnerFullName();
    const patientPayload = withBranchId(user, {
      name: form.name, species: form.species, breed: form.breed, gender: form.gender,
      owner: fullOwnerName, contact: form.contact, owner_email: resolvedEmail,
      condition: form.condition, status: form.status, health: form.health, room: form.room,
    });
    const insertPayload = { ...patientPayload, ...(ownerUserId ? { owner_user_id: ownerUserId } : {}) };
    const { data: ins, error: err } = await supabase.from(T_PATIENTS).insert([insertPayload]).select().single();
    if (err) { setSavingPatient(false); showAlert("Error", err.message); return; }
    const patientId = ins.id;
    if (form.room) await occupyRoom(form.room, form.name, form.condition);
    if (pendingVax.length > 0) await supabase.from(T_VACCINATIONS).insert(pendingVax.map(({ _key, ...v }) => ({ ...v, patient_id: patientId })));
    if (pendingTreat.length > 0) await supabase.from(T_TREATMENTS).insert(pendingTreat.map(({ _key, ...t }) => ({ ...t, patient_id: patientId })));
    if (ownerUserId) {
      const staffUser = sb.getUser();
      if (staffUser?.id) {
        const ownerName = selectedOwnerProfile?.full_name || fullOwnerName || "there";
        await supabase.from(T_MESSAGES).insert([withBranchId(user, {
          sender_id: staffUser.id, receiver_id: ownerUserId, is_read: false,
          message: `Hello ${ownerName}! Welcome to Angeles Animal Care Hospital.\n\nYour pet ${form.name} (${form.species}) has been successfully registered. Feel free to message us anytime!`,
        })]);
      }
    }
    setSavingPatient(false);
    fetchPatients(); fetchRooms(); closeModal();
    if (existingAccountFound) {
      showToast(`✓ ${form.name} registered & linked to existing account`);
    } else if (ownerUserId && ownerPassword) {
      setCreatedCredentials({ fullName: resolveOwnerFullName(), email: resolvedEmail, password: ownerPassword });
      showToast(`✓ ${form.name} registered & owner account created`);
    } else if (ownerUserId) {
      showToast(`✓ ${form.name} registered — welcome message sent`);
    } else {
      showToast(`✓ ${form.name} registered successfully`);
    }
  };

  const savePatient = async () => {
    if (!form.name || !form.species) { showAlert("Missing Fields", "Please fill in Patient Name and Species."); return; }
    if (ownerStep === OWNER_STEPS.FORM && !form.owner_first.trim() && !form.owner_last.trim()) { showAlert("Missing Fields", "Please enter at least a first or last name for the owner."); return; }
    if (savingPatient) return;
    setSavingPatient(true);
    let ownerUserId = null; let ownerPassword = null;
    const ownerEmail = form.owner_email?.trim().toLowerCase() || "";
    if (selectedOwnerProfile) {
      ownerUserId = selectedOwnerProfile.id;
      await ensureProfile(ownerUserId, selectedOwnerProfile.email, selectedOwnerProfile.full_name || form.owner);
      await executeSavePatient({ ownerUserId, ownerPassword: null, resolvedEmail: selectedOwnerProfile.email });
      return;
    }
    const fullOwnerName = resolveOwnerFullName();
    if (ownerEmail) {
      ownerPassword = generatePassword(fullOwnerName);
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: ownerEmail, password: ownerPassword,
        options: { data: { full_name: fullOwnerName || ownerEmail, role: "customer" } },
      });
      if (signUpError) {
        if (signUpError.message?.toLowerCase().includes("already registered")) {
          const { data: existing } = await supabase.from(T_PROFILES).select("id, full_name, email").eq("email", ownerEmail).single();
          ownerUserId = existing?.id || null;
          if (ownerUserId) await ensureProfile(ownerUserId, ownerEmail, fullOwnerName || ownerEmail);
          setSavingPatient(false);
          setExistingAccModal({
            show: true, email: ownerEmail, existingName: existing?.full_name || "",
            onContinue: async () => {
              setExistingAccModal(m => ({ ...m, show: false }));
              setSavingPatient(true);
              await executeSavePatient({ ownerUserId, ownerPassword: null, resolvedEmail: ownerEmail, existingAccountFound: true });
            },
          });
          return;
        } else {
          setSavingPatient(false); showAlert("Account Error", `Could not create owner account: ${signUpError.message}`); return;
        }
      } else {
        ownerUserId = signUpData?.user?.id || null;
        if (ownerUserId) await ensureProfile(ownerUserId, ownerEmail, fullOwnerName || ownerEmail);
      }
    }
    await executeSavePatient({ ownerUserId, ownerPassword, resolvedEmail: ownerEmail || null });
  };

  const doDelete = async (id) => {
    const patient = patients.find(p => p.id === id);
    const { error } = await supabase.from(T_PATIENTS).delete().eq("id", id);
    if (error) { showAlert("Error", error.message); return; }
    if (patient?.room) await freeRoom(patient.room);
    fetchPatients(); fetchRooms(); closeModal();
  };

  const openEditPatient = (p) => {
    setEditPatientForm({ name: p.name || '', species: p.species || '', breed: p.breed || '', gender: p.gender || '', owner: p.owner || '', contact: p.contact || '', owner_email: p.owner_email || '', condition: p.condition || '', status: p.status || 'Outpatient', health: p.health || 'Good', room: p.room || '' });
    setEditingPatient(p); fetchRooms();
  };

  const closeEditPatient = () => setEditingPatient(null);

  const saveEditPatient = async () => {
    if (!editPatientForm.name || !editPatientForm.species) { showAlert('Missing Fields', 'Patient name and species are required.'); return; }
    if (editPatientSaving) return;
    setEditPatientSaving(true);
    const oldRoom = editingPatient.room; const newRoom = editPatientForm.room;
    if (oldRoom && oldRoom !== newRoom) await freeRoom(oldRoom);
    if (newRoom && newRoom !== oldRoom) {
      const chosenRoom = rooms.find(r => r.number === newRoom);
      if (chosenRoom && chosenRoom.status !== 'Available') {
        setEditPatientSaving(false);
        showAlert('Room Unavailable', `Room ${newRoom} is currently "${chosenRoom.status}"${chosenRoom.patient ? ` (${chosenRoom.patient})` : ''}. Please choose a different room.`);
        return;
      }
      await occupyRoom(newRoom, editPatientForm.name, editPatientForm.condition);
    }
    const { error } = await supabase.from(T_PATIENTS).update({ name: editPatientForm.name, species: editPatientForm.species, breed: editPatientForm.breed, gender: editPatientForm.gender, owner: editPatientForm.owner, contact: editPatientForm.contact, owner_email: editPatientForm.owner_email, condition: editPatientForm.condition, status: editPatientForm.status, health: editPatientForm.health, room: editPatientForm.room || null }).eq('id', editingPatient.id);
    setEditPatientSaving(false);
    if (error) { showAlert('Error', error.message); return; }
    showToast(`✓ ${editPatientForm.name} updated successfully`);
    closeEditPatient(); fetchPatients(); fetchRooms();
  };

  const saveVax = async () => {
    if (!vaxForm.name || !vaxForm.date_given) { showAlert("Missing Fields", "Vaccine name and date given are required."); return; }
    if (vaxSaving) return; setVaxSaving(true);
    const { error } = await supabase.from(T_VACCINATIONS).insert([{ patient_id: selectedPatient.id, ...vaxForm }]);
    setVaxSaving(false);
    if (error) { showAlert("Error", error.message); return; }
    setVaxForm({ name: "", date_given: new Date().toISOString().slice(0, 10), next_due: "", given_by: "" });
    setShowVaxForm(false); showToast('✓ Vaccination record saved'); await fetchMedical(selectedPatient.id);
  };
  const startEditVax = (v) => { setEditingVaxId(v.id); setEditVaxForm({ name: v.name, date_given: v.date_given, next_due: v.next_due || "", given_by: v.given_by || "" }); setShowVaxForm(false); };
  const saveEditVax = async () => {
    if (!editVaxForm.name || !editVaxForm.date_given) { showAlert("Missing Fields", "Vaccine name and date given are required."); return; }
    if (vaxSaving) return; setVaxSaving(true);
    const { error } = await supabase.from(T_VACCINATIONS).update(editVaxForm).eq("id", editingVaxId);
    setVaxSaving(false);
    if (error) { showAlert("Error", error.message); return; }
    setEditingVaxId(null); showToast('✓ Vaccination updated'); await fetchMedical(selectedPatient.id);
  };
  const deleteVax = (vaxId) => showConfirm("Delete Vaccination", "Delete this vaccination record?", async () => { await supabase.from(T_VACCINATIONS).delete().eq("id", vaxId); showToast('Vaccination record deleted', 'info'); await fetchMedical(selectedPatient.id); });

  const saveTreat = async () => {
    if (!treatForm.diagnosis) { showAlert("Missing Fields", "Diagnosis is required."); return; }
    if (treatSaving) return; setTreatSaving(true);
    const { error } = await supabase.from(T_TREATMENTS).insert([{ patient_id: selectedPatient.id, ...treatForm }]);
    setTreatSaving(false);
    if (error) { showAlert("Error", error.message); return; }
    setTreatForm({ date: new Date().toISOString().slice(0, 10), diagnosis: "", notes: "", vet: "" });
    setShowTreatForm(false); showToast('✓ Treatment record saved'); await fetchMedical(selectedPatient.id);
  };
  const startEditTreat = (t) => { setEditingTreatId(t.id); setEditTreatForm({ date: t.date, diagnosis: t.diagnosis, notes: t.notes || "", vet: t.vet || "" }); setShowTreatForm(false); };
  const saveEditTreat = async () => {
    if (!editTreatForm.diagnosis) { showAlert("Missing Fields", "Diagnosis is required."); return; }
    if (treatSaving) return; setTreatSaving(true);
    const { error } = await supabase.from(T_TREATMENTS).update(editTreatForm).eq("id", editingTreatId);
    setTreatSaving(false);
    if (error) { showAlert("Error", error.message); return; }
    setEditingTreatId(null); showToast('✓ Treatment updated'); await fetchMedical(selectedPatient.id);
  };
  const deleteTreat = (treatId) => showConfirm("Delete Treatment", "Delete this treatment record?", async () => { await supabase.from(T_TREATMENTS).delete().eq("id", treatId); showToast('Treatment record deleted', 'info'); await fetchMedical(selectedPatient.id); });

  const saveRx = async () => {
    if (!rxForm.medicine || !rxForm.dosage) { showAlert("Missing Fields", "Medicine name and dosage are required."); return; }
    if (rxSaving) return; setRxSaving(true);
    const { error } = await supabase.from(T_PRESCRIPTIONS).insert([{ patient_id: selectedPatient.id, ...rxForm }]);
    setRxSaving(false);
    if (error) { showAlert("Error", error.message); return; }
    setRxForm({ medicine: "", dosage: "", frequency: "Once daily", route: "Oral", duration: "", instructions: "", prescribed_by: "", date_prescribed: new Date().toISOString().slice(0, 10) });
    setShowRxForm(false); showToast('✓ Prescription record saved'); await fetchMedical(selectedPatient.id);
  };
  const startEditRx = (rx) => {
    setEditingRxId(rx.id);
    setEditRxForm({ medicine: rx.medicine, dosage: rx.dosage, frequency: rx.frequency || "Once daily", route: rx.route || "Oral", duration: rx.duration || "", instructions: rx.instructions || "", prescribed_by: rx.prescribed_by || "", date_prescribed: rx.date_prescribed || new Date().toISOString().slice(0, 10) });
    setShowRxForm(false);
  };
  const saveEditRx = async () => {
    if (!editRxForm.medicine || !editRxForm.dosage) { showAlert("Missing Fields", "Medicine name and dosage are required."); return; }
    if (rxSaving) return; setRxSaving(true);
    const { error } = await supabase.from(T_PRESCRIPTIONS).update(editRxForm).eq("id", editingRxId);
    setRxSaving(false);
    if (error) { showAlert("Error", error.message); return; }
    setEditingRxId(null); showToast('✓ Prescription updated'); await fetchMedical(selectedPatient.id);
  };
  const deleteRx = (rxId) => showConfirm("Delete Prescription", "Delete this prescription? This cannot be undone.", async () => { await supabase.from(T_PRESCRIPTIONS).delete().eq("id", rxId); showToast('✓ Prescription deleted', 'info'); await fetchMedical(selectedPatient.id); });

  const S = {
    btn: { width: "auto" },
    inp: { padding: "9px 12px", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 13, fontFamily: "inherit", background: "#fff", color: "var(--text)", outline: "none" },
    card: { background: "#fff", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", boxShadow: "var(--shadow)", width: "100%", marginBottom: 20 },
    th: { background: "var(--bg)", padding: "11px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: "1px solid var(--border)" },
    td: { padding: "13px 14px", borderBottom: "1px solid var(--border)", color: "var(--text)", verticalAlign: "middle" },
    overlay: { position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.50)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", overflowY: "auto" },
    modalWrap: { background: "#fff", borderRadius: 14, boxShadow: "0 24px 64px rgba(0,0,0,0.28)", width: "100%", maxWidth: 720, maxHeight: "calc(100vh - 48px)", display: "flex", flexDirection: "column", overflow: "hidden", margin: "auto" },
    modalHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: "1px solid var(--border)", flexShrink: 0 },
    modalBody: { padding: "22px 24px", overflowY: "auto", flex: 1 },
    modalFooter: { display: "flex", justifyContent: "flex-end", gap: 10, padding: "14px 24px", borderTop: "1px solid var(--border)", flexShrink: 0 },
    formBox: { background: "#f8fafc", border: "1.5px solid var(--border)", borderRadius: 10, padding: 20, marginBottom: 16 },
    editBox: { background: "#eff6ff", border: "1.5px solid #bfdbfe", borderRadius: 10, padding: 20, marginBottom: 8 },
  };

  const thStyle = { padding: "8px 12px", background: "var(--bg)", fontSize: 11, fontWeight: 700, color: "var(--muted)", textAlign: "left", borderBottom: "1px solid var(--border)" };
  const tdStyle = { padding: "10px 12px", borderBottom: "1px solid var(--border)" };
  const VIEW_TABS = ["info", "vaccination", "treatment", "prescription"];

  const TabBar = ({ tabs, active, onSelect, counts = {} }) => (
    <div className="tab-bar">
      {tabs.map(t => (
        <div key={t} className={`tab${active === t ? " active" : ""}`} onClick={() => onSelect(t)}>
          {t.charAt(0).toUpperCase() + t.slice(1)}
          {counts[t] > 0 && (
            <span style={{ marginLeft: 6, background: t === "prescription" ? "#1e3a8a" : t === "vaccination" ? "#16a34a" : "#d97706", color: "#fff", borderRadius: 10, fontSize: 10, padding: "1px 6px", fontWeight: 700 }}>
              {counts[t]}
            </span>
          )}
        </div>
      ))}
    </div>
  );

  const SectionHeader = ({ color, label, onAdd, showForm, onCancelForm }) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
      <h4 style={{ fontSize: 14, fontWeight: 700, color, margin: 0 }}>{label}</h4>
      {!showForm
        ? <button className="btn btn-primary" style={{ ...S.btn, fontSize: 13, display: "inline-flex", alignItems: "center", gap: 5 }} onClick={onAdd}><Ic src={plusIcon} size={12} style={{ mixBlendMode: "normal", filter: "brightness(0) invert(1)" }} /> Add</button>
        : <button className="btn btn-ghost btn-sm" style={S.btn} onClick={onCancelForm}>✕ Cancel</button>
      }
    </div>
  );

  const ownerIsConfirmed = ownerStep === OWNER_STEPS.FORM || (ownerStep === OWNER_STEPS.SEARCH && selectedOwnerProfile);

  const OwnerStepUI = () => {
    if (ownerStep === OWNER_STEPS.ASK) {
      return (
        <div style={{ marginBottom: 24 }}>
          <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "14px 18px", marginBottom: 18, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 36, height: 36, borderRadius: "50%", background: "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Ic src={userIcon} size={20} style={{ mixBlendMode: "normal", filter: "brightness(0) saturate(100%) invert(20%) sepia(90%) saturate(800%) hue-rotate(210deg)" }} />
            </span>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#1e40af" }}>Does the pet owner already have an account?</p>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "#3b82f6" }}>This helps us link the patient to an existing owner or create a new one.</p>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <button onClick={() => { setOwnerStep(OWNER_STEPS.SEARCH); setOwnerSearchQuery(""); setOwnerSearchRes([]); setSelectedOwnerProfile(null); }}
              style={{ background: "#f0fdf4", border: "2px solid #bbf7d0", borderRadius: 12, padding: "20px 16px", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}>
              <div style={{ marginBottom: 8 }}><Ic src={checkIcon} size={28} style={{ mixBlendMode: "normal" }} /></div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#166534", marginBottom: 4 }}>Yes, they have an account</div>
              <div style={{ fontSize: 12, color: "#16a34a", lineHeight: 1.4 }}>Search and link to an existing customer profile.</div>
            </button>
            <button onClick={() => { setOwnerStep(OWNER_STEPS.FORM); setSelectedOwnerProfile(null); }}
              style={{ background: "#faf5ff", border: "2px solid #e9d5ff", borderRadius: 12, padding: "20px 16px", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}>
              <div style={{ marginBottom: 8 }}><Ic src={plusIcon} size={28} style={{ mixBlendMode: "normal" }} /></div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#6b21a8", marginBottom: 4 }}>No, create a new account</div>
              <div style={{ fontSize: 12, color: "#9333ea", lineHeight: 1.4 }}>Fill in owner details and we'll set up their account.</div>
            </button>
          </div>
        </div>
      );
    }
    if (ownerStep === OWNER_STEPS.SEARCH) {
      return (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <button onClick={() => { setOwnerStep(OWNER_STEPS.ASK); setSelectedOwnerProfile(null); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: 13, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4, padding: "4px 0" }}>← Back</button>
            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--text)" }}>Search Customer Account</h4>
          </div>
          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "9px 14px", marginBottom: 12, fontSize: 12, color: "#166534", display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
            <span>Only showing <strong>Customer</strong> accounts.</span>
          </div>
          {selectedOwnerProfile ? (
            <div style={{ background: "#f0fdf4", border: "1.5px solid #22c55e", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#22c55e,#16a34a)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 14 }}>
                  {(selectedOwnerProfile.full_name || selectedOwnerProfile.email || "?")[0].toUpperCase()}
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#166534" }}>{selectedOwnerProfile.full_name || selectedOwnerProfile.email}</p>
                  <p style={{ margin: 0, fontSize: 11, color: "#16a34a" }}>{selectedOwnerProfile.email}</p>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, background: "#dcfce7", color: "#166534", borderRadius: 99, padding: "3px 10px", fontWeight: 700 }}>Selected</span>
                <button onClick={() => setSelectedOwnerProfile(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", fontSize: 12, fontFamily: "inherit", fontWeight: 600 }}>Change</button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ position: "relative", marginBottom: 10 }}>
                <input autoFocus type="text" value={ownerSearchQuery} onChange={e => setOwnerSearchQuery(e.target.value)} placeholder="Search by customer name or email…"
                  style={{ width: "100%", padding: "10px 12px", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 13, color: "var(--text)", boxSizing: "border-box", background: "var(--bg)", outline: "none", fontFamily: "inherit" }} />
              </div>
              {ownerSearchLoading && (
                <div style={{ padding: "10px 0" }}>
                  {[1, 2, 3].map(i => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", border: "1px solid var(--border)", borderRadius: 8, marginBottom: 6 }}>
                      <div className="sk" style={{ width: 34, height: 34, borderRadius: "50%" }} />
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                        <Sk w="50%" h={13} /><Sk w="70%" h={11} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {!ownerSearchLoading && ownerSearchQuery.trim() && ownerSearchRes.length === 0 && (
                <div style={{ textAlign: "center", padding: "20px 0", color: "var(--muted)" }}>
                  <p style={{ fontSize: 13, margin: 0 }}>No customer accounts found for "<strong>{ownerSearchQuery}</strong>"</p>
                </div>
              )}
              {!ownerSearchLoading && !ownerSearchQuery.trim() && (
                <p style={{ fontSize: 12, color: "var(--muted)", textAlign: "center", padding: "10px 0" }}>Start typing to search customer accounts…</p>
              )}
              {ownerSearchRes.length > 0 && (
                <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", marginBottom: 4 }}>
                  {ownerSearchRes.map((p, i) => (
                    <div key={p.id} onClick={() => { setSelectedOwnerProfile(p); setForm(prev => ({ ...prev, owner: p.full_name || prev.owner, owner_email: p.email })); }}
                      style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: i < ownerSearchRes.length - 1 ? "1px solid var(--border)" : "none", cursor: "pointer", background: "#fff", transition: "background 0.12s" }}
                      onMouseOver={e => e.currentTarget.style.background = "#f0fdf4"}
                      onMouseOut={e => e.currentTarget.style.background = "#fff"}>
                      <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg,#0ea5e9,#06b6d4)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 13 }}>
                        {(p.full_name || p.email || "?")[0].toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.full_name || p.email}</p>
                        <p style={{ margin: 0, fontSize: 11, color: "var(--muted)" }}>{p.email}</p>
                      </div>
                      <span style={{ fontSize: 12, color: "#16a34a", fontWeight: 600, flexShrink: 0 }}>Select →</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          <div style={{ borderTop: "1px solid var(--border)", marginTop: 16, paddingTop: 14 }}>
            {!selectedOwnerProfile && (
              <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>
                Can't find the owner?{' '}
                <button onClick={() => { setOwnerStep(OWNER_STEPS.FORM); setSelectedOwnerProfile(null); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--royal)", fontSize: 12, fontWeight: 600, fontFamily: "inherit", padding: 0 }}>
                  Create a new account instead →
                </button>
              </p>
            )}
          </div>
        </div>
      );
    }
    if (ownerStep === OWNER_STEPS.FORM) {
      return (
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <button onClick={() => { setOwnerStep(OWNER_STEPS.ASK); setSelectedOwnerProfile(null); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: 13, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4, padding: "4px 0" }}>← Back</button>
            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--text)" }}>New Owner Details</h4>
          </div>
          <div style={{ background: "#faf5ff", border: "1px solid #e9d5ff", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#6b21a8", display: "flex", alignItems: "flex-start", gap: 8 }}>
            <Ic src={plusIcon} size={14} style={{ mixBlendMode: "normal", marginTop: 1 }} />
            <span>Fill in the owner's details and we'll automatically create a login account and send them a welcome message in <strong>Messages</strong>.</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const VaxEditRow = ({ v }) => (
    <div style={{ background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: 10, padding: 20, marginBottom: 8 }}>
      <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 700, color: "#166534", display: "flex", alignItems: "center", gap: 6 }}>
        <EditIcon /> Editing: {v.name}
      </p>
      <VaxFields form={editVaxForm} setForm={setEditVaxForm} />
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
        <button className="btn btn-ghost" style={S.btn} onClick={() => setEditingVaxId(null)}>Cancel</button>
        <button className="btn btn-primary" style={S.btn} onClick={saveEditVax} disabled={vaxSaving}>{vaxSaving ? "Saving..." : "Save Changes"}</button>
      </div>
    </div>
  );

  const TreatEditRow = ({ t }) => (
    <div style={{ background: "#fffbeb", border: "1.5px solid #fde68a", borderRadius: 10, padding: 20, marginBottom: 8 }}>
      <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 700, color: "#92400e", display: "flex", alignItems: "center", gap: 6 }}>
        <EditIcon /> Editing: {t.diagnosis}
      </p>
      <TreatFields form={editTreatForm} setForm={setEditTreatForm} />
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
        <button className="btn btn-ghost" style={S.btn} onClick={() => setEditingTreatId(null)}>Cancel</button>
        <button className="btn btn-primary" style={S.btn} onClick={saveEditTreat} disabled={treatSaving}>{treatSaving ? "Saving..." : "Save Changes"}</button>
      </div>
    </div>
  );

  return (
    <Layout>
      <SkeletonStyles />
      <LiveToast message={toast.message} show={toast.show} type={toast.type} />
      <Modal show={appModal.show} title={appModal.title} message={appModal.message} onConfirm={appModal.onConfirm} onCancel={appModal.onCancel} confirmText={appModal.confirmText} cancelText={appModal.cancelText} confirmColor={appModal.confirmColor} />

      {existingAccModal.show && (
        <div style={{ ...S.overlay, zIndex: 1100 }}>
          <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 24px 64px rgba(0,0,0,0.30)", width: "100%", maxWidth: 440, overflow: "hidden" }}>
            <div style={{ background: "linear-gradient(135deg,#fef3c7,#fde68a)", padding: "20px 24px 16px", borderBottom: "1px solid #fde68a" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Ic src={userIcon} size={24} style={{ mixBlendMode: "normal", filter: "brightness(0) invert(1)" }} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#92400e" }}>Account Already Exists</h3>
                  <p style={{ margin: 0, fontSize: 12, color: "#b45309", marginTop: 2 }}>This email is already registered in the system</p>
                </div>
              </div>
            </div>
            <div style={{ padding: "20px 24px" }}>
              <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "14px 16px", marginBottom: 16 }}>
                <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: "#92400e" }}>{existingAccModal.email}</p>
                {existingAccModal.existingName && <p style={{ margin: 0, fontSize: 12, color: "#b45309" }}>Registered as: <strong>{existingAccModal.existingName}</strong></p>}
              </div>
              <p style={{ fontSize: 13, color: "var(--text)", margin: "0 0 16px", lineHeight: 1.6 }}>The patient will be linked to the <strong>existing account</strong> automatically.</p>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "14px 24px", borderTop: "1px solid var(--border)" }}>
              <button className="btn btn-ghost" style={S.btn} onClick={() => setExistingAccModal(m => ({ ...m, show: false }))}>Cancel</button>
              <button className="btn btn-primary" style={{ ...S.btn, background: "#f59e0b", borderColor: "#f59e0b" }} onClick={existingAccModal.onContinue}>Got it — Continue Saving</button>
            </div>
          </div>
        </div>
      )}

      {/* ── TOPBAR ── */}
      <div className="topbar" style={{ position: "fixed", top: 56, left: "var(--current-sidebar-w, 62px)", right: 0, zIndex: 90, background: "#fff" }}>
        <div className="topbar-title">
          <img src="/icon/patient_record.png" alt="" />
          <div>
            <h1>Patient Records</h1>
            <p>Manage all patient medical records</p>
          </div>
        </div>
        <div className="topbar-actions">
          {seeAllBranches && (
            <div style={{ position: "relative", width: 190 }}>
              <CustomSelect
                value={branchFilter}
                onChange={val => setBranchFilter(val)}
                placeholder="All Branches"
                accent="#7c3aed"
                options={branches.map(b => ({ value: b.id, label: b.name }))}
              />
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--bg)", border: "1.5px solid var(--border)", borderRadius: 8, padding: "8px 14px" }}>
            <img src="/icon/search.png" alt="" style={{ width: 16, height: 16, filter: "brightness(0) saturate(100%) invert(40%)" }} />
            <input type="text" placeholder="Search patient, owner, species..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ border: "none", background: "transparent", fontSize: 13, color: "var(--text)", outline: "none", fontFamily: "inherit", width: 220 }} />
          </div>
          <button className="btn btn-primary" onClick={openAdd} style={{ ...S.btn, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Ic src={plusIcon} size={13} style={{ mixBlendMode: "normal", filter: "brightness(0) invert(1)" }} />
            Add Patient
          </button>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="content" style={{ paddingTop: 90 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(195px, 1fr))', gap: 14, marginBottom: 24 }}>
          {loading ? (
            [1, 2, 3, 4].map(i => <StatCardSkeleton key={i} />)
          ) : (
            [
              { label: "Total Patients", value: patients.length, icon: "/icon/attended.png", color: "blue", sub: "All registered patients" },
              { label: "Admitted", value: patients.filter(p => p.status === "Admitted").length, icon: "/icon/admitted.png", color: "green", sub: "Currently admitted" },
              { label: "Outpatient", value: patients.filter(p => p.status === "Outpatient").length, icon: "/icon/outpatient.png", color: "yellow", sub: "Outpatient visits" },
              { label: "Critical", value: patients.filter(p => p.health === "Critical").length, icon: "/icon/critical.png", color: "red", sub: patients.filter(p => p.health === "Critical").length > 0 ? "Needs attention" : "All stable" },
            ].map((sc, i) => (
              <div key={i} className={`stat-card-v2 ${sc.color}`}>
                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                  <div className={`stat-icon-v2 ${sc.color}`}>
                    <img src={sc.icon} alt="" style={{ width: 24, height: 24 }} />
                  </div>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{sc.label}</p>
                  <h3 style={{ margin: '4px 0 6px', fontSize: 26, fontWeight: 800, lineHeight: 1 }}>{sc.value}</h3>
                  <span style={{ fontSize: 11, fontWeight: 600, color: sc.color === 'red' && sc.value > 0 ? '#dc2626' : 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    {sc.color === 'red' && sc.value > 0 && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>}
                    {sc.sub}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        <div style={S.card}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid var(--border)", flexWrap: "wrap", gap: 10 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700 }}>All Patients</h2>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              {[
                { label: "All", value: "all" },
                { label: "Admitted", value: "Admitted" },
                { label: "Outpatient", value: "Outpatient" },
                { label: "Critical", value: "Critical" },
              ].map(f => (
                <button key={f.value} onClick={() => setStatusFilter(f.value)}
                  style={{
                    padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                    cursor: "pointer", fontFamily: "inherit", border: "1.5px solid",
                    background: statusFilter === f.value ? "var(--royal)" : "transparent",
                    color: statusFilter === f.value ? "#fff" : "var(--muted)",
                    borderColor: statusFilter === f.value ? "var(--royal)" : "var(--border)",
                    transition: "all 0.15s",
                  }}>
                  {f.label}
                </button>
              ))}
              <span style={{ color: "var(--muted)", fontSize: 12, marginLeft: 6 }}>{filtered.length} record{filtered.length !== 1 ? "s" : ""}</span>
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            {loading ? (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 720 }}>
                <thead>
                  <tr>
                    <th style={S.th}>Patient</th>
                    <th style={S.th}>Owner</th>
                    <th style={S.th}>Condition</th>
                    <th style={S.th}>Status</th>
                    <th style={S.th}>Health</th>
                    <th style={S.th}>Room</th>
                    <th style={{ ...S.th, textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody><TableRowSkeleton /><TableRowSkeleton /><TableRowSkeleton /><TableRowSkeleton /><TableRowSkeleton /></tbody>
              </table>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 720 }}>
                <thead><tr>{["Patient", "Owner", "Condition", "Status", "Health", "Room", "Actions"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {paginated.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: "48px 20px", color: "var(--muted)" }}>
                        <div style={{ marginBottom: 8 }}><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round"><circle cx="7" cy="10" r="2" /><circle cx="17" cy="10" r="2" /><circle cx="4" cy="6" r="1.5" /><circle cx="20" cy="6" r="1.5" /><path d="M12 14c-3.3 0-6 2-6 4.5h12c0-2.5-2.7-4.5-6-4.5z" /></svg></div>
                        <div style={{ fontSize: 13 }}>No patients match your search or filter.</div>
                      </td>
                    </tr>
                  ) : paginated.map(p => {
                    const criticalDot = { width: 7, height: 7, borderRadius: "50%", flexShrink: 0, display: "inline-block" };
                    const healthDotColor = { Good: "#16a34a", Fair: "#d97706", Critical: "#dc2626" }[p.health] || "#9ca3af";
                    const statusDotColor = { Admitted: "#2563eb", Outpatient: "#9ca3af" }[p.status] || "#9ca3af";
                    const initials = (p.owner || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
                    return (
                      <tr key={p.id} style={{ cursor: "pointer" }} onClick={() => openView(p)}>
                        {/* Patient */}
                        <td style={S.td}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, background: p.species === "Cat" ? "#f0fdf4" : "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>
                              {p.species === "Cat"
                                ? <svg width="16" height="16" viewBox="0 0 16 16" fill="#16a34a" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" clipRule="evenodd" d="M1 7L4.80061 1.43926C5.56059 0.527292 6.68638 0 7.8735 0H8V4L12 5L15 10L14.1875 11.2188C13.4456 12.3316 12.1967 13 10.8593 13H9L7 16H5L1 7ZM10 9C10.5523 9 11 8.55229 11 8C11 7.44772 10.5523 7 10 7C9.44771 7 9 7.44772 9 8C9 8.55229 9.44771 9 10 9Z" /><path d="M10 0.465878V2.43845L12 2.93845V0H11.8735C11.2125 0 10.5704 0.163501 10 0.465878Z" /></svg>
                                : <svg width="16" height="16" viewBox="0 0 16 16" fill="#1d4ed8" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" clipRule="evenodd" d="M16 4V7C16 9.20914 14.2091 11 12 11H10V15H0V13L0.931622 10.8706C1.25226 10.9549 1.59036 11 1.94124 11C3.74931 11 5.32536 9.76947 5.76388 8.01538L3.82359 7.53031C3.60766 8.39406 2.83158 9.00001 1.94124 9.00001C1.87789 9.00001 1.81539 8.99702 1.75385 8.99119C1.02587 8.92223 0.432187 8.45551 0.160283 7.83121C0.0791432 7.64491 0.0266588 7.44457 0.00781272 7.23658C-0.0112323 7.02639 0.00407892 6.80838 0.0588889 6.58914C0.0588882 6.58914 0.0588896 6.58913 0.0588889 6.58914L0.698705 4.02986C1.14387 2.24919 2.7438 1 4.57928 1H10L12 4H16ZM9 6C9.55229 6 10 5.55228 10 5C10 4.44772 9.55229 4 9 4C8.44771 4 8 4.44772 8 5C8 5.55228 8.44771 6 9 6Z" /></svg>}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text)" }}>{p.name}</div>
                              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}>
                                {p.species}{p.breed ? ` · ${p.breed}` : ""}{p.gender ? ` · ${p.gender}` : ""}
                              </div>
                            </div>
                          </div>
                        </td>
                        {/* Owner */}
                        <td style={S.td}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, background: "var(--bg)", border: "1.5px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "var(--muted)" }}>
                              {initials}
                            </div>
                            <div>
                              <div style={{ fontSize: 13, color: "var(--text)" }}>{p.owner || "—"}</div>
                              {p.contact && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}>{p.contact}</div>}
                            </div>
                          </div>
                        </td>
                        {/* Condition */}
                        <td style={S.td}>
                          {p.condition
                            ? <span style={{ fontSize: 12, color: "var(--muted)", display: "block", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={p.condition}>{p.condition}</span>
                            : <span style={{ fontSize: 12, color: "var(--muted)", fontStyle: "italic" }}>No diagnosis</span>
                          }
                        </td>
                        {/* Status */}
                        <td style={S.td}>
                          <span className={`badge ${STATUS_BADGE[p.status] || "badge-gray"}`} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                            <span style={{ ...criticalDot, background: statusDotColor }} />
                            {p.status}
                          </span>
                        </td>
                        {/* Health */}
                        <td style={S.td}>
                          <span className={`badge ${HEALTH_BADGE[p.health] || "badge-gray"}`} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                            <span style={{ ...criticalDot, background: healthDotColor, ...(p.health === "Critical" ? { animation: "sk-shimmer 1s ease-in-out infinite" } : {}) }} />
                            {p.health}
                          </span>
                        </td>
                        {/* Room */}
                        <td style={S.td}>
                          {p.room
                            ? <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1e40af", borderRadius: 6, padding: "3px 9px", fontSize: 12, fontWeight: 600 }}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg> {p.room}</span>
                            : <span style={{ fontSize: 12, color: "var(--muted)", fontStyle: "italic" }}>Unassigned</span>
                          }
                        </td>
                        {/* Actions */}
                        <td style={{ ...S.td, textAlign: "right" }} onClick={e => e.stopPropagation()}>
                          <div style={{ display: "flex", gap: 5, justifyContent: "flex-end" }}>
                            <button className="btn btn-ghost btn-sm" style={{ ...S.btn, fontSize: 12 }} onClick={() => openView(p)}>View</button>
                            <button className="btn btn-ghost btn-sm" style={{ ...S.btn, fontSize: 12 }} onClick={() => openEditPatient(p)}>Edit</button>
                            <button className="btn btn-ghost btn-sm" style={{ ...S.btn, fontSize: 12, color: "var(--danger)", borderColor: "var(--danger)" }}
                              onClick={() => showConfirm("Delete Patient", `Delete ${p.name}? This cannot be undone.`, () => doDelete(p.id))}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, padding: "14px 18px", borderTop: "1px solid var(--border)" }}>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={safePage === 1}
              style={{ padding: "6px 14px", borderRadius: 20, border: "1.5px solid var(--border)", background: "transparent", fontSize: 13, fontWeight: 600, color: safePage === 1 ? "var(--muted)" : "var(--text)", cursor: safePage === 1 ? "default" : "pointer", fontFamily: "inherit" }}>
              prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(pg => (
              <button key={pg} onClick={() => setCurrentPage(pg)}
                style={{
                  width: 34, height: 34, borderRadius: 20, border: "1.5px solid", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
                  background: safePage === pg ? "var(--royal)" : "transparent",
                  color: safePage === pg ? "#fff" : "var(--text)",
                  borderColor: safePage === pg ? "var(--royal)" : "var(--border)",
                }}>
                {pg}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              style={{ padding: "6px 14px", borderRadius: 20, border: "1.5px solid var(--border)", background: "transparent", fontSize: 13, fontWeight: 600, color: safePage === totalPages ? "var(--muted)" : "var(--text)", cursor: safePage === totalPages ? "default" : "pointer", fontFamily: "inherit" }}>
              next
            </button>
          </div>
        )}
      </div>

      {/* ── ADD PATIENT MODAL ── */}
      {activeModal === "add" && (
        <div style={S.overlay}>
          <div style={S.modalWrap}>
            <div style={{ flexShrink: 0 }}>
              {/* Clipboard top bar */}
              <div style={{ background: "linear-gradient(135deg, #0f172a, #1e3a8a)", padding: "10px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", borderRadius: "14px 14px 0 0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 48, height: 18, background: "rgba(255,255,255,0.25)", borderRadius: 4, border: "2px solid rgba(255,255,255,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ width: 20, height: 8, background: "rgba(255,255,255,0.4)", borderRadius: 2 }} />
                  </div>
                </div>
                <button onClick={closeModal} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "rgba(255,255,255,0.75)", lineHeight: 1, padding: "2px 6px" }}>✕</button>
              </div>
              {/* Medical record header */}
              <div style={{ background: "var(--bg)", borderBottom: "2px solid var(--border)", padding: "14px 24px 12px", textAlign: "center", position: "relative" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 4 }}>
                  <img src="/icon/patient_record.png" alt="" style={{ width: 22, height: 22, objectFit: "contain" }} onError={e => { e.target.style.display = "none"; }} />
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "var(--text)", letterSpacing: "0.3px" }}>Angeles Pet Care</h3>
                </div>
                <p style={{ margin: 0, fontSize: 11, color: "var(--muted)", letterSpacing: "0.5px" }}>
                  {ownerStep === OWNER_STEPS.ASK ? "Step 1 — Verify owner account" : "Patient Registration Record"}
                </p>
              </div>
            </div>
            {ownerIsConfirmed && (
              <div style={{ padding: "0 24px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
                <TabBar tabs={ADD_TABS} active={activeTab} onSelect={t => { setActiveTab(t); setShowAddVaxForm(false); setShowAddTreatForm(false); }}
                  counts={{ vaccination: pendingVax.length, treatment: pendingTreat.length }} />
              </div>
            )}
            <div style={S.modalBody}>
              {activeTab === "info" && <OwnerStepUI />}
              {activeTab === "info" && ownerIsConfirmed && (
                <div style={{ paddingTop: 4 }}>

                  {/* ── Section: Patient Identity ── */}
                  <div style={{ borderBottom: "1.5px solid #e2e8f0", marginBottom: 0 }}>
                    <div style={{ background: "#f1f5f9", borderBottom: "1px solid #e2e8f0", padding: "6px 16px" }}>
                      <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px", color: "#64748b" }}>Patient Information</span>
                    </div>
                    {/* Row 1: Name · Gender · D.o.B / Species */}
                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", borderBottom: "1px solid #e2e8f0" }}>
                      <div style={{ padding: "10px 14px", borderRight: "1px solid #e2e8f0" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>Patient Name <span style={{ color: "#ef4444" }}>*</span></div>
                        <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Buddy"
                          style={{ width: "100%", border: "none", borderBottom: "1.5px solid #cbd5e1", background: "transparent", fontSize: 13, fontWeight: 600, color: "var(--text)", outline: "none", padding: "2px 0", fontFamily: "inherit", boxSizing: "border-box" }} />
                      </div>
                      <div style={{ padding: "10px 14px", borderRight: "1px solid #e2e8f0" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>Sex / Gender</div>
                        <CustomSelect
                          value={form.gender}
                          onChange={val => setForm({ ...form, gender: val })}
                          placeholder="—"
                          options={["Male", "Female", "Unknown"]}
                        />
                      </div>
                      <div style={{ padding: "10px 14px" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>Species <span style={{ color: "#ef4444" }}>*</span></div>
                        <CustomSelect
                          value={form.species}
                          onChange={val => setForm({ ...form, species: val })}
                          placeholder="—"
                          options={["Dog", "Cat"]}
                        />
                      </div>
                    </div>
                    {/* Row 2: Breed · Status · Health · Room */}
                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", borderBottom: "1px solid #e2e8f0" }}>
                      <div style={{ padding: "10px 14px", borderRight: "1px solid #e2e8f0" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>Breed</div>
                        <input type="text" value={form.breed} onChange={e => setForm({ ...form, breed: e.target.value })} placeholder="e.g. Aspin"
                          style={{ width: "100%", border: "none", borderBottom: "1.5px solid #cbd5e1", background: "transparent", fontSize: 13, fontWeight: 600, color: "var(--text)", outline: "none", padding: "2px 0", fontFamily: "inherit", boxSizing: "border-box" }} />
                      </div>
                      <div style={{ padding: "10px 14px", borderRight: "1px solid #e2e8f0" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>Status</div>
                        <CustomSelect
                          value={form.status}
                          onChange={val => setForm({ ...form, status: val })}
                          placeholder="—"
                          options={["Outpatient", "Admitted"]}
                        />
                      </div>
                      <div style={{ padding: "10px 14px", borderRight: "1px solid #e2e8f0" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>Health</div>
                        <CustomSelect
                          value={form.health}
                          onChange={val => setForm({ ...form, health: val })}
                          placeholder="—"
                          options={["Good", "Fair", "Critical"]}
                        />
                      </div>
                      <div style={{ padding: "10px 14px" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>Room / Ward</div>
                        <CustomSelect
                          value={form.room}
                          onChange={val => setForm({ ...form, room: val })}
                          placeholder="— None —"
                          options={rooms.filter(r => r.status === "Available").map(r => ({ value: r.number, label: `${r.number}${r.type ? ` · ${r.type}` : ""}` }))}
                        />
                      </div>
                    </div>
                  </div>

                  {/* ── Section: Owner / Method of Admittance ── */}
                  <div style={{ borderBottom: "1.5px solid #e2e8f0" }}>
                    <div style={{ background: "#f1f5f9", borderBottom: "1px solid #e2e8f0", padding: "6px 16px" }}>
                      <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px", color: "#64748b" }}>Owner / Admittance</span>
                    </div>
                    {ownerStep === OWNER_STEPS.FORM ? (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: "1px solid #e2e8f0" }}>
                        <div style={{ padding: "10px 14px", borderRight: "1px solid #e2e8f0" }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>Owner First Name <span style={{ color: "#ef4444" }}>*</span></div>
                          <input type="text" value={form.owner_first} onChange={e => setForm({ ...form, owner_first: e.target.value })} placeholder="e.g. Juan"
                            style={{ width: "100%", border: "none", borderBottom: "1.5px solid #cbd5e1", background: "transparent", fontSize: 13, fontWeight: 600, color: "var(--text)", outline: "none", padding: "2px 0", fontFamily: "inherit", boxSizing: "border-box" }} />
                        </div>
                        <div style={{ padding: "10px 14px" }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>Owner Last Name <span style={{ color: "#ef4444" }}>*</span></div>
                          <input type="text" value={form.owner_last} onChange={e => setForm({ ...form, owner_last: e.target.value })} placeholder="e.g. dela Cruz"
                            style={{ width: "100%", border: "none", borderBottom: "1.5px solid #cbd5e1", background: "transparent", fontSize: 13, fontWeight: 600, color: "var(--text)", outline: "none", padding: "2px 0", fontFamily: "inherit", boxSizing: "border-box" }} />
                        </div>
                      </div>
                    ) : (
                      <div style={{ padding: "10px 14px", borderBottom: "1px solid #e2e8f0" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>Owner Name</div>
                        <input type="text" value={form.owner} onChange={e => setForm({ ...form, owner: e.target.value })} readOnly={!!selectedOwnerProfile}
                          style={{ width: "100%", border: "none", borderBottom: "1.5px solid #cbd5e1", background: "transparent", fontSize: 13, fontWeight: 600, color: selectedOwnerProfile ? "#94a3b8" : "var(--text)", outline: "none", padding: "2px 0", fontFamily: "inherit", boxSizing: "border-box" }} />
                      </div>
                    )}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: "1px solid #e2e8f0" }}>
                      <div style={{ padding: "10px 14px", borderRight: "1px solid #e2e8f0" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>Contact Number</div>
                        <input type="text" value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} placeholder="e.g. 0917-000-0000"
                          style={{ width: "100%", border: "none", borderBottom: "1.5px solid #cbd5e1", background: "transparent", fontSize: 13, fontWeight: 600, color: "var(--text)", outline: "none", padding: "2px 0", fontFamily: "inherit", boxSizing: "border-box" }} />
                      </div>
                      <div style={{ padding: "10px 14px" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 4 }}>
                          Owner Email
                          {selectedOwnerProfile
                            ? <span style={{ marginLeft: 6, color: "#16a34a", fontWeight: 700, textTransform: "none", letterSpacing: 0 }}>✓ linked</span>
                            : <span style={{ marginLeft: 6, color: "#94a3b8", fontWeight: 400, textTransform: "none", letterSpacing: 0, fontSize: 10 }}>(creates login)</span>}
                        </div>
                        <input type="email" value={form.owner_email} onChange={e => setForm({ ...form, owner_email: e.target.value })} placeholder="owner@email.com" readOnly={!!selectedOwnerProfile}
                          style={{ width: "100%", border: "none", borderBottom: "1.5px solid #cbd5e1", background: "transparent", fontSize: 13, fontWeight: 600, color: selectedOwnerProfile ? "#94a3b8" : "var(--text)", outline: "none", padding: "2px 0", fontFamily: "inherit", boxSizing: "border-box" }} />
                      </div>
                    </div>
                  </div>

                  {/* ── Section: Initial Symptoms ── */}
                  <div style={{ borderBottom: "1.5px solid #e2e8f0" }}>
                    <div style={{ background: "#f1f5f9", borderBottom: "1px solid #e2e8f0", padding: "6px 16px" }}>
                      <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px", color: "#64748b" }}>Initial Condition / Diagnosis</span>
                    </div>
                    <div style={{ padding: "12px 16px", minHeight: 70 }}>
                      <textarea value={form.condition} onChange={e => setForm({ ...form, condition: e.target.value })} placeholder="Describe the patient's condition, presenting symptoms, or initial diagnosis..."
                        style={{
                          width: "100%", border: "none", background: "transparent", fontSize: 13, color: "var(--text)", outline: "none", resize: "vertical", minHeight: 60, fontFamily: "inherit", lineHeight: 1.8, boxSizing: "border-box",
                          backgroundImage: "repeating-linear-gradient(transparent, transparent 27px, rgba(147,197,253,0.25) 27px, rgba(147,197,253,0.25) 28px)"
                        }} />
                    </div>
                  </div>

                  {/* ── Footer note ── */}
                  <div style={{ padding: "8px 16px", background: "var(--bg)", borderTop: "1px solid var(--border)" }}>
                    <p style={{ margin: 0, fontSize: 10, color: "var(--muted)", textAlign: "right", fontStyle: "italic" }}>Angeles Animal Care Hospital</p>
                  </div>
                </div>
              )}
              {activeTab === "vaccination" && ownerIsConfirmed && (
                <div style={{ paddingTop: 4 }}>
                  <SectionHeader color="#16a34a" label="Vaccinations" showForm={showAddVaxForm} onAdd={() => setShowAddVaxForm(true)} onCancelForm={() => setShowAddVaxForm(false)} />
                  {showAddVaxForm && (
                    <div style={S.formBox}>
                      <VaxFields form={addVaxForm} setForm={setAddVaxForm} />
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
                        <button className="btn btn-ghost" style={S.btn} onClick={() => setShowAddVaxForm(false)}>Cancel</button>
                        <button className="btn btn-primary" style={S.btn} onClick={addPendingVax}>Add to List</button>
                      </div>
                    </div>
                  )}
                  {pendingVax.length === 0 && !showAddVaxForm && <p style={{ color: "var(--muted)", fontSize: 13, textAlign: "center", padding: "28px 0" }}>No vaccinations added yet.</p>}
                  {pendingVax.length > 0 && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      {pendingVax.map(v => (
                        <div key={v._key} className="vax-card">
                          <h4 style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 800, color: '#14532d', paddingRight: 60 }}>{v.name}</h4>
                          {v.given_by && <p style={{ margin: '0 0 8px', fontSize: 12, color: '#16a34a' }}>By: {v.given_by}</p>}
                          <div style={{ fontSize: 12, color: '#166534' }}>Given: {v.date_given}{v.next_due ? ` · Due: ${v.next_due}` : ''}</div>
                          <button onClick={() => removePendingVax(v._key)} style={{ marginTop: 8, background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit" }}>Remove</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {activeTab === "treatment" && ownerIsConfirmed && (
                <div style={{ paddingTop: 4 }}>
                  <SectionHeader color="#d97706" label="Treatments" showForm={showAddTreatForm} onAdd={() => setShowAddTreatForm(true)} onCancelForm={() => setShowAddTreatForm(false)} />
                  {showAddTreatForm && (
                    <div style={S.formBox}>
                      <TreatFields form={addTreatForm} setForm={setAddTreatForm} />
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
                        <button className="btn btn-ghost" style={S.btn} onClick={() => setShowAddTreatForm(false)}>Cancel</button>
                        <button className="btn btn-primary" style={S.btn} onClick={addPendingTreat}>Add to List</button>
                      </div>
                    </div>
                  )}
                  {pendingTreat.length === 0 && !showAddTreatForm && <p style={{ color: "var(--muted)", fontSize: 13, textAlign: "center", padding: "28px 0" }}>No treatments added yet.</p>}
                  {pendingTreat.length > 0 && (
                    <div>
                      {pendingTreat.map(t => (
                        <div key={t._key} className="treat-paper">
                          <div style={{ paddingLeft: 50 }}>
                            <h4 style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 800, color: '#1e293b' }}>{t.diagnosis}</h4>
                            {t.vet && <p style={{ margin: '0 0 4px', fontSize: 12, color: '#64748b', fontStyle: 'italic' }}>Dr. {t.vet}</p>}
                            <p style={{ margin: '0 0 8px', fontSize: 12, color: '#94a3b8' }}>{t.date}</p>
                            {t.notes && <p style={{ margin: '0 0 8px', fontSize: 13, color: '#334155', lineHeight: 1.6 }}>{t.notes}</p>}
                            <button onClick={() => removePendingTreat(t._key)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit" }}>Remove</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div style={{ ...S.modalFooter, background: "#f8fafc", borderTop: "2px solid #e2e8f0", gap: 8 }}>
              {ownerIsConfirmed && activeTab !== "info" && (
                <button className="btn btn-ghost" style={S.btn} onClick={() => setActiveTab("info")}>← Back to Info</button>
              )}
              <div style={{ flex: 1 }} />
              <button className="btn btn-ghost" style={S.btn} onClick={closeModal}>Cancel</button>
              {ownerIsConfirmed && (
                <button className="btn btn-primary" style={{ ...S.btn, display: "inline-flex", alignItems: "center", gap: 6, background: "#0f172a", borderColor: "#0f172a" }} onClick={savePatient} disabled={savingPatient}>
                  <Ic src={checkIcon} size={13} style={{ mixBlendMode: "normal", filter: "brightness(0) invert(1)" }} />
                  {savingPatient ? "Filing Record..." : `File Record${pendingVax.length + pendingTreat.length > 0 ? ` + ${pendingVax.length + pendingTreat.length} Record(s)` : ""}`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── VIEW PATIENT MODAL ── */}
      {activeModal === "view" && selectedPatient && (
        <div style={S.overlay}>
          <div style={S.modalWrap}>
            <div style={{ ...S.modalHeader, background: '#fafafa', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: 'linear-gradient(135deg,#1e3a8a,#3b82f6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {selectedPatient.species === 'Cat'
                    ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.8" strokeLinecap="round"><path d="M12 5c-4.4 0-8 3.1-8 7 0 2.4 1.3 4.5 3.3 5.8L6 21h12l-1.3-3.2C18.7 16.5 20 14.4 20 12c0-3.9-3.6-7-8-7z" /><path d="M5 5 3 1l3 3M19 5l2-4-3 3" /><circle cx="9" cy="12" r="1" /><circle cx="15" cy="12" r="1" /></svg>
                    : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.8" strokeLinecap="round"><path d="M10 5.172C10 3.782 8.423 2.679 6.5 3c-2 .336-3.5 2.112-3.5 4v3a3 3 0 0 0 6 0V5.172zM14 5.172C14 3.782 15.577 2.679 17.5 3c2 .336 3.5 2.112 3.5 4v3a3 3 0 0 0-6 0V5.172z" /><path d="M8 14v.5M16 14v.5M11.25 16.25h1.5L12 17z" /><path d="M4.42 11.247A13.152 13.152 0 0 0 4 14.556C4 18.728 7.582 21 12 21s8-2.272 8-6.444c0-1.061-.162-2.2-.493-3.309" /></svg>}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "var(--text)" }}>
                    {selectedPatient.name}
                    <span className={`badge ${STATUS_BADGE[selectedPatient.status] || "badge-gray"}`} style={{ marginLeft: 8, fontSize: 11, verticalAlign: "middle" }}>{selectedPatient.status}</span>
                    <span className={`badge ${HEALTH_BADGE[selectedPatient.health] || "badge-gray"}`} style={{ marginLeft: 5, fontSize: 11, verticalAlign: "middle" }}>{selectedPatient.health}</span>
                  </h3>
                  <p style={{ margin: 0, fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                    {selectedPatient.species} · {selectedPatient.breed} · Owner: {selectedPatient.owner}
                  </p>
                </div>
              </div>
              <button onClick={closeModal} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--muted)", lineHeight: 1, padding: "2px 6px" }}>✕</button>
            </div>

            <div style={{ padding: "0 24px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
              <TabBar tabs={VIEW_TABS} active={activeTab}
                onSelect={t => { setActiveTab(t); setShowRxForm(false); setShowVaxForm(false); setShowTreatForm(false); setEditingVaxId(null); setEditingTreatId(null); setEditingRxId(null); }}
                counts={{ prescription: prescriptions.length, vaccination: vaccinations.length, treatment: treatments.length }} />
            </div>

            <div style={S.modalBody}>

              {/* ── INFO TAB ── */}
              {activeTab === "info" && <PatientInfoTab patient={selectedPatient} />}

              {/* ── VACCINATION TAB ── */}
              {activeTab === "vaccination" && (
                <div style={{ paddingTop: 4 }}>
                  {/* Header bar */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#166534', display: 'flex', alignItems: 'center', gap: 6 }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="2" x2="12" y2="6" /><path d="M12 14v8" /><path d="M8 10c0-2.2 1.8-4 4-4s4 1.8 4 4" /><line x1="8" y1="18" x2="16" y2="18" /></svg>Vaccination Record</h4>
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--muted)' }}>{vaccinations.length} vaccination{vaccinations.length !== 1 ? 's' : ''} on record</p>
                    </div>
                    {!showVaxForm
                      ? <button className="btn btn-primary" style={{ ...S.btn, background: '#16a34a', borderColor: '#16a34a', display: 'inline-flex', alignItems: 'center', gap: 5 }} onClick={() => { setShowVaxForm(true); setEditingVaxId(null); }}>
                        <Ic src={plusIcon} size={12} style={{ mixBlendMode: "normal", filter: "brightness(0) invert(1)" }} /> Add Vaccine
                      </button>
                      : <button className="btn btn-ghost btn-sm" style={S.btn} onClick={() => setShowVaxForm(false)}>✕ Cancel</button>
                    }
                  </div>

                  {showVaxForm && (
                    <div style={{ ...S.formBox, background: '#f0fdf4', border: '1.5px solid #86efac', marginBottom: 20 }}>
                      <VaxFields form={vaxForm} setForm={setVaxForm} />
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
                        <button className="btn btn-ghost" style={S.btn} onClick={() => setShowVaxForm(false)}>Cancel</button>
                        <button className="btn btn-primary" style={{ ...S.btn, background: '#16a34a', borderColor: '#16a34a' }} onClick={saveVax} disabled={vaxSaving}>{vaxSaving ? "Saving..." : "Save Vaccination"}</button>
                      </div>
                    </div>
                  )}

                  {vaccinations.length === 0 && !showVaxForm ? (
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                      <div style={{ marginBottom: 8 }}><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round"><line x1="12" y1="2" x2="12" y2="6" /><path d="M12 14v8" /><path d="M8 10c0-2.2 1.8-4 4-4s4 1.8 4 4" /><line x1="8" y1="18" x2="16" y2="18" /></svg></div>
                      <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>No vaccination records yet.</p>
                      <p style={{ color: "var(--muted)", fontSize: 12, margin: '4px 0 0' }}>Click <strong>Add Vaccine</strong> to get started.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      {vaccinations.map(v => (
                        <React.Fragment key={v.id}>
                          {editingVaxId === v.id ? (
                            <div style={{ gridColumn: '1 / -1' }}>
                              <VaxEditRow v={v} />
                            </div>
                          ) : (
                            <VaxCard v={v} onEdit={startEditVax} onDelete={deleteVax} isEditing={editingVaxId === v.id} />
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── TREATMENT TAB ── */}
              {activeTab === "treatment" && (
                <div style={{ paddingTop: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#92400e', display: 'flex', alignItems: 'center', gap: 6 }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>Treatment Records</h4>
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--muted)' }}>{treatments.length} treatment{treatments.length !== 1 ? 's' : ''} on file</p>
                    </div>
                    {!showTreatForm
                      ? <button className="btn btn-primary" style={{ ...S.btn, display: 'inline-flex', alignItems: 'center', gap: 5 }} onClick={() => { setShowTreatForm(true); setEditingTreatId(null); }}>
                        <Ic src={plusIcon} size={12} style={{ mixBlendMode: "normal", filter: "brightness(0) invert(1)" }} /> Add Treatment
                      </button>
                      : <button className="btn btn-ghost btn-sm" style={S.btn} onClick={() => setShowTreatForm(false)}>✕ Cancel</button>
                    }
                  </div>

                  {showTreatForm && (
                    <div style={{ ...S.formBox, marginBottom: 20 }}>
                      <TreatFields form={treatForm} setForm={setTreatForm} />
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
                        <button className="btn btn-ghost" style={S.btn} onClick={() => setShowTreatForm(false)}>Cancel</button>
                        <button className="btn btn-primary" style={S.btn} onClick={saveTreat} disabled={treatSaving}>{treatSaving ? "Saving..." : "Save Treatment"}</button>
                      </div>
                    </div>
                  )}

                  {treatments.length === 0 && !showTreatForm ? (
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                      <div style={{ marginBottom: 8 }}><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg></div>
                      <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>No treatment records yet.</p>
                    </div>
                  ) : (
                    <div>
                      {treatments.map(t => (
                        <React.Fragment key={t.id}>
                          {editingTreatId === t.id ? (
                            <TreatEditRow t={t} />
                          ) : (
                            <TreatmentPaper t={t} onEdit={startEditTreat} onDelete={deleteTreat} />
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── PRESCRIPTION TAB ── */}
              {activeTab === "prescription" && (
                <div style={{ paddingTop: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: 6 }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M10.5 20H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H20a2 2 0 0 1 2 2v3" /><circle cx="18" cy="18" r="3" /><path d="m22 22-1.5-1.5" /></svg>Prescriptions</h4>
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--muted)' }}>{prescriptions.length} prescription{prescriptions.length !== 1 ? 's' : ''} on file</p>
                    </div>
                    {!showRxForm
                      ? <button className="btn btn-primary" style={{ ...S.btn, display: 'inline-flex', alignItems: 'center', gap: 5 }} onClick={() => { setShowRxForm(true); setEditingRxId(null); }}>
                        <Ic src={plusIcon} size={12} style={{ mixBlendMode: "normal", filter: "brightness(0) invert(1)" }} /> Add Prescription
                      </button>
                      : <button className="btn btn-ghost btn-sm" style={S.btn} onClick={() => setShowRxForm(false)}>✕ Cancel</button>
                    }
                  </div>

                  {showRxForm && (
                    <div style={{ ...S.formBox, marginBottom: 20 }}>
                      <div className="form-grid">
                        <div className="form-group"><label>Medicine / Drug Name *</label><input type="text" value={rxForm.medicine} onChange={e => setRxForm({ ...rxForm, medicine: e.target.value })} placeholder="e.g. Amoxicillin" /></div>
                        <div className="form-group"><label>Dosage *</label><input type="text" value={rxForm.dosage} onChange={e => setRxForm({ ...rxForm, dosage: e.target.value })} placeholder="e.g. 250mg" /></div>
                        <div className="form-group"><label>Frequency</label><select value={rxForm.frequency} onChange={e => setRxForm({ ...rxForm, frequency: e.target.value })}>{FREQ_OPTIONS.map(f => <option key={f}>{f}</option>)}</select></div>
                        <div className="form-group"><label>Route</label><select value={rxForm.route} onChange={e => setRxForm({ ...rxForm, route: e.target.value })}>{ROUTE_OPTIONS.map(r => <option key={r}>{r}</option>)}</select></div>
                        <div className="form-group"><label>Duration</label><input type="text" value={rxForm.duration} onChange={e => setRxForm({ ...rxForm, duration: e.target.value })} placeholder="e.g. 7 days" /></div>
                        <div className="form-group"><label>Date Prescribed</label><input type="date" value={rxForm.date_prescribed} onChange={e => setRxForm({ ...rxForm, date_prescribed: e.target.value })} /></div>
                        <div className="form-group"><label>Prescribed By</label><input type="text" value={rxForm.prescribed_by} onChange={e => setRxForm({ ...rxForm, prescribed_by: e.target.value })} placeholder="Vet name" /></div>
                        <div className="form-group form-full"><label>Special Instructions</label><textarea value={rxForm.instructions} onChange={e => setRxForm({ ...rxForm, instructions: e.target.value })} placeholder="e.g. Give with food..." style={{ minHeight: 72 }} /></div>
                      </div>
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
                        <button className="btn btn-ghost" style={S.btn} onClick={() => setShowRxForm(false)}>Cancel</button>
                        <button className="btn btn-primary" style={S.btn} onClick={saveRx} disabled={rxSaving}>{rxSaving ? "Saving..." : "Save Prescription"}</button>
                      </div>
                    </div>
                  )}

                  {prescriptions.length === 0 && !showRxForm && (
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                      <div style={{ marginBottom: 8 }}><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round"><path d="M10.5 20H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H20a2 2 0 0 1 2 2v3" /><circle cx="18" cy="18" r="3" /><path d="m22 22-1.5-1.5" /></svg></div>
                      <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>No prescription records yet.</p>
                    </div>
                  )}

                  {prescriptions.map(rx => (
                    <div key={rx.id}>
                      {editingRxId === rx.id ? (
                        <div style={{ background: "#eff6ff", border: "1.5px solid #bfdbfe", borderRadius: 10, padding: 20, marginBottom: 12 }}>
                          <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 700, color: "#1e40af", display: "flex", alignItems: "center", gap: 6 }}>
                            <EditIcon /> Editing: {rx.medicine}
                          </p>
                          <div className="form-grid">
                            <div className="form-group"><label>Medicine *</label><input type="text" value={editRxForm.medicine} onChange={e => setEditRxForm({ ...editRxForm, medicine: e.target.value })} /></div>
                            <div className="form-group"><label>Dosage *</label><input type="text" value={editRxForm.dosage} onChange={e => setEditRxForm({ ...editRxForm, dosage: e.target.value })} /></div>
                            <div className="form-group"><label>Frequency</label><select value={editRxForm.frequency} onChange={e => setEditRxForm({ ...editRxForm, frequency: e.target.value })}>{FREQ_OPTIONS.map(f => <option key={f}>{f}</option>)}</select></div>
                            <div className="form-group"><label>Route</label><select value={editRxForm.route} onChange={e => setEditRxForm({ ...editRxForm, route: e.target.value })}>{ROUTE_OPTIONS.map(r => <option key={r}>{r}</option>)}</select></div>
                            <div className="form-group"><label>Duration</label><input type="text" value={editRxForm.duration} onChange={e => setEditRxForm({ ...editRxForm, duration: e.target.value })} /></div>
                            <div className="form-group"><label>Date Prescribed</label><input type="date" value={editRxForm.date_prescribed} onChange={e => setEditRxForm({ ...editRxForm, date_prescribed: e.target.value })} /></div>
                            <div className="form-group"><label>Prescribed By</label><input type="text" value={editRxForm.prescribed_by} onChange={e => setEditRxForm({ ...editRxForm, prescribed_by: e.target.value })} /></div>
                            <div className="form-group form-full"><label>Instructions</label><textarea value={editRxForm.instructions} onChange={e => setEditRxForm({ ...editRxForm, instructions: e.target.value })} style={{ minHeight: 72 }} /></div>
                          </div>
                          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
                            <button className="btn btn-ghost" style={S.btn} onClick={() => setEditingRxId(null)}>Cancel</button>
                            <button className="btn btn-primary" style={S.btn} onClick={saveEditRx} disabled={rxSaving}>{rxSaving ? "Saving..." : "Save Changes"}</button>
                          </div>
                        </div>
                      ) : (
                        <PrescriptionSlip rx={rx} onEdit={startEditRx} onDelete={deleteRx} />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={S.modalFooter}>
              <button className="btn btn-ghost" style={S.btn} onClick={closeModal}>Close</button>
            </div>
          </div>
        </div>
      )}

      {createdCredentials && <CredentialCard credentials={createdCredentials} onClose={() => setCreatedCredentials(null)} />}

      {/* ── EDIT PATIENT MODAL ── */}
      {editingPatient && (
        <div style={{ ...S.overlay, zIndex: 1050 }}>
          <div style={{ ...S.modalWrap, maxWidth: 680 }}>
            <div style={S.modalHeader}>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>Edit Patient — {editingPatient.name}</h3>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Update patient information below.</p>
              </div>
              <button onClick={closeEditPatient} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--muted)', lineHeight: 1, padding: '2px 6px' }}>✕</button>
            </div>
            <div style={S.modalBody}>
              <div className="form-grid">
                <div className="form-group"><label>Patient Name *</label><input type="text" value={editPatientForm.name} onChange={e => setEditPatientForm({ ...editPatientForm, name: e.target.value })} placeholder="e.g. Buddy" /></div>
                <div className="form-group"><label>Species *</label><select value={editPatientForm.species} onChange={e => setEditPatientForm({ ...editPatientForm, species: e.target.value })}><option value="">Select</option><option>Dog</option><option>Cat</option></select></div>
                <div className="form-group"><label>Breed</label><input type="text" value={editPatientForm.breed} onChange={e => setEditPatientForm({ ...editPatientForm, breed: e.target.value })} placeholder="e.g. Aspin" /></div>
                <div className="form-group"><label>Sex / Gender</label><select value={editPatientForm.gender} onChange={e => setEditPatientForm({ ...editPatientForm, gender: e.target.value })}><option value="">Select</option><option>Male</option><option>Female</option><option>Unknown</option></select></div>
                <div className="form-full" style={{ borderTop: '1px solid var(--border)', margin: '4px 0' }} />
                <div className="form-group"><label>Owner Name</label><input type="text" value={editPatientForm.owner} onChange={e => setEditPatientForm({ ...editPatientForm, owner: e.target.value })} /></div>
                <div className="form-group"><label>Owner Contact</label><input type="text" value={editPatientForm.contact} onChange={e => setEditPatientForm({ ...editPatientForm, contact: e.target.value })} /></div>
                <div className="form-group form-full"><label>Owner Email</label><input type="email" value={editPatientForm.owner_email} onChange={e => setEditPatientForm({ ...editPatientForm, owner_email: e.target.value })} placeholder="owner@email.com" /></div>
                <div className="form-full" style={{ borderTop: '1px solid var(--border)', margin: '4px 0' }} />
                <div className="form-group"><label>Status</label><select value={editPatientForm.status} onChange={e => setEditPatientForm({ ...editPatientForm, status: e.target.value })}><option>Outpatient</option><option>Admitted</option></select></div>
                <div className="form-group"><label>Health</label><select value={editPatientForm.health} onChange={e => setEditPatientForm({ ...editPatientForm, health: e.target.value })}><option>Good</option><option>Fair</option><option>Critical</option></select></div>
                <div className="form-group">
                  <label>Room</label>
                  <RoomSelect value={editPatientForm.room} onChange={e => setEditPatientForm({ ...editPatientForm, room: e.target.value })}
                    rooms={rooms.map(r => r.number === editingPatient.room && r.status !== 'Available' ? { ...r, status: 'Available' } : r)} />
                </div>
                <div className="form-group form-full"><label>Condition / Diagnosis</label><textarea value={editPatientForm.condition} onChange={e => setEditPatientForm({ ...editPatientForm, condition: e.target.value })} placeholder="Describe condition..." /></div>
              </div>
            </div>
            <div style={S.modalFooter}>
              <button className="btn btn-ghost" style={S.btn} onClick={closeEditPatient}>Cancel</button>
              <button className="btn btn-primary" style={{ ...S.btn, display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={saveEditPatient} disabled={editPatientSaving}>
                <Ic src={checkIcon} size={13} style={{ mixBlendMode: 'normal', filter: 'brightness(0) invert(1)' }} />
                {editPatientSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default PatientRecord;