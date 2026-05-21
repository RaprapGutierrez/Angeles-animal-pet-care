import React, { useState, useEffect, useCallback, useMemo, useRef, memo } from "react";
import Layout from "../components/layout";
import { supabase } from "../js/supabase";
import { useNavigate } from "react-router-dom";
import { useCurrentUser } from "../js/useCurrentUser";
import { withBranchId } from "../js/useBranchFilter";

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
`;
const Skel = ({ w = '100%', h = 16 }) => (
  <span className="skel" style={{ width: w, height: h, borderRadius: 8, display: 'block' }} />
);

// ─── Constants ────────────────────────────────────────────────────────────────
const EMERGENCY_TYPES = [
  "Hit by Vehicle / Trauma",
  "Difficulty Breathing / Respiratory Distress",
  "Seizure / Convulsion",
  "Severe Bleeding / Open Wound",
  "Unconscious / Unresponsive",
  "Suspected Poisoning / Toxic Ingestion",
  "Broken Bone / Fracture",
  "Severe Vomiting / Diarrhea",
  "Eye / Ear Injury",
  "Allergic Reaction / Anaphylaxis",
  "Birthing Emergency / Dystocia",
  "Heatstroke / Hyperthermia",
  "Animal Bite / Fight Wound",
  "Choking / Airway Obstruction",
  "Cardiac Arrest / No Pulse",
  "Bloat / GDV (Gastric Dilatation)",
  "Urinary Blockage",
  "Paralysis / Cannot Walk",
  "Severe Lethargy / Collapse",
  "Suspected Fracture / Limping",
  "Other",
];

const BRANCHES = [
  "Main Branch",
  "Mabalacat Branch",
  "Tarlac City",
  "San Fernando Branch",
  "Angeles City",
];

const STATUS_COLORS = {
  pending: { bg: "#fef9c3", border: "#fde047", text: "#854d0e" },
  responding: { bg: "#dbeafe", border: "#93c5fd", text: "#1d4ed8" },
  resolved: { bg: "#dcfce7", border: "#86efac", text: "#166534" },
};



// ─── Success Modal ────────────────────────────────────────────────────────────
const SuccessModal = ({ show, guestMode, onClose }) => {
  useEffect(() => {
    if (show) {
      const t = setTimeout(onClose, 4000);
      return () => clearTimeout(t);
    }
  }, [show, onClose]);

  if (!show) return null;


  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 99999,
      background: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16,
      animation: "fadeIn 0.2s ease",
    }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes popIn  { from { opacity: 0; transform: scale(0.85) translateY(20px) } to { opacity: 1; transform: scale(1) translateY(0) } }
        @keyframes shrink { from { width: 100% } to { width: 0% } }
      `}</style>

      <div style={{
        background: "#fff", borderRadius: 16, overflow: "hidden",
        width: "100%", maxWidth: 420,
        boxShadow: "0 24px 64px rgba(0,0,0,0.25)",
        animation: "popIn 0.35s cubic-bezier(0.34,1.56,0.64,1)",
      }}>
        {/* Header */}
        <div style={{
          background: "linear-gradient(135deg, #16a34a, #15803d)",
          padding: "20px 24px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
           <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "rgba(255,255,255,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <h5 style={{ margin: 0, color: "#fff", fontWeight: 700, fontSize: 15 }}>
              Alert Sent Successfully
            </h5>
          </div>
          <button onClick={onClose} style={{
            background: "none", border: "none", color: "#fff",
            fontSize: 18, cursor: "pointer", lineHeight: 1, padding: 0, opacity: 0.8,
          }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: "24px 24px 8px", textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#dcfce7", border: "2px solid #86efac", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <img src="/icon/emergency_2.png" alt="" style={{ width: 30, height: 30, filter: "brightness(0) saturate(100%) invert(16%) sepia(90%) saturate(2000%) hue-rotate(340deg)" }} />
          </div>
          <h4 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 700, color: "#0f172a" }}>
            {guestMode ? "Emergency Report Submitted!" : "Emergency Alert Sent!"}
          </h4>
          <p style={{ margin: 0, fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>
            {guestMode
              ? "Our team has been notified immediately and will respond to your report shortly. Please keep your phone line open."
              : "All relevant staff and branches have been notified. Monitor the status in the alert panel."}
          </p>
        </div>

        {/* Info box */}
        <div style={{ margin: "16px 24px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, padding: "10px 14px" }}>
          <p style={{ margin: 0, fontSize: 12, color: "#166534", fontWeight: 600 }}>
            🕐 Auto-closing in 4 seconds...
          </p>
        </div>

        {/* Progress bar */}
        <div style={{ margin: "0 24px", height: 4, background: "#e2e8f0", borderRadius: 99, overflow: "hidden" }}>
          <div style={{
            height: "100%", background: "#16a34a", borderRadius: 99,
            animation: "shrink 4s linear forwards",
          }} />
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 24px 24px", display: "flex", justifyContent: "center" }}>
          <button onClick={onClose} style={{
            background: "#16a34a", color: "#fff", border: "none",
            borderRadius: 8, padding: "10px 40px",
            fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
          }}>
            OK, Got It
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Guest Banner ─────────────────────────────────────────────────────────────
const GuestBanner = ({ onExit }) => (
  <div style={{
    background: "linear-gradient(135deg, #dc2626, #b91c1c)",
    color: "#fff", padding: "10px 28px",
    display: "flex", alignItems: "center", justifyContent: "space-between",
    fontSize: 13, fontWeight: 600, fontFamily: "inherit",
  }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <img src="/icon/emergency_2.png" alt="" style={{ width: 15, height: 15, filter: "brightness(0) invert(1)" }} />
      </div>
      <span>Emergency Guest Access — Limited session. Your report will be sent to staff immediately.</span>
    </div>
    <button onClick={onExit} style={{
      background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.4)",
      color: "#fff", borderRadius: 6, padding: "4px 12px", fontSize: 12,
      fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
    }}>
      ✕ Exit
    </button>
  </div>
);

// ─── Alert Card ───────────────────────────────────────────────────────────────
const AlertCard = ({ a, showActions = false, onUpdateStatus }) => {
  const status = a.status || "pending";
  const col = STATUS_COLORS[status] || STATUS_COLORS.pending;

  return (
    <div style={{
      background: col.bg, border: `1px solid ${col.border}`,
      borderRadius: 10, padding: "14px 16px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#dc2626", flexShrink: 0, marginTop: 1 }} />
          <strong style={{ fontSize: 13, color: "#dc2626", lineHeight: 1.3 }}>{a.type}</strong>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, marginLeft: 8 }}>
          <span style={{
            fontSize: 10, fontWeight: 700, color: col.text,
            background: "#fff", border: `1px solid ${col.border}`,
            borderRadius: 99, padding: "3px 9px", textTransform: "capitalize", letterSpacing: "0.3px",
          }}>
            {status === "pending" ? "Pending" : status === "responding" ? "Responding" : "Resolved"}
          </span>
          <span style={{ fontSize: 11, color: "var(--muted)", whiteSpace: "nowrap" }}>
            {new Date(a.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>

      <p style={{ fontSize: 12, color: "var(--text)", margin: "0 0 8px", lineHeight: 1.5 }}>{a.description}</p>

      {a.guest_full_name && (
        <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 4 }}>
          <p style={{ fontSize: 11, color: "var(--muted)", margin: 0 }}>
            <span style={{ fontWeight: 600, color: "var(--text)" }}>{a.guest_full_name}</span>
            {a.guest_contact ? <span> · {a.guest_contact}</span> : ""}
            {a.guest_address ? <span> · {a.guest_address}</span> : ""}
          </p>
        </div>
      )}
      {a.patient_name && (
        <p style={{ fontSize: 11, color: "var(--muted)", margin: "0 0 4px" }}>
          Patient: <span style={{ fontWeight: 600, color: "var(--text)" }}>{a.patient_name}</span>
        </p>
      )}

      <p style={{ fontSize: 11, color: "var(--muted)", margin: 0, borderTop: `1px solid ${col.border}`, paddingTop: 8, marginTop: 6 }}>
        Branch: <strong style={{ color: "var(--text)" }}>{a.branch}</strong> · Sent by: <strong style={{ color: "var(--text)" }}>{a.sent_by}</strong>
      </p>

      {showActions && status !== "resolved" && (
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          {status === "pending" && (
            <button onClick={() => onUpdateStatus(a.id, "responding")} style={{
              fontSize: 11, fontWeight: 700, padding: "6px 14px", borderRadius: 6,
              cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5,
              background: "#dbeafe", color: "#1d4ed8", border: "1px solid #93c5fd",
            }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#1d4ed8", display: "inline-block" }} />
              Mark Responding
            </button>
          )}
          <button onClick={() => onUpdateStatus(a.id, "resolved")} style={{
            fontSize: 11, fontWeight: 700, padding: "6px 14px", borderRadius: 6,
            cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5,
            background: "#dcfce7", color: "#166534", border: "1px solid #86efac",
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
            Mark Resolved
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Emergency Form ───────────────────────────────────────────────────────────
const EmergencyForm = memo(({ guestMode, sending, onSend, onExit }) => {
  const [form, setForm] = useState({
    type: EMERGENCY_TYPES[0],
    description: "",
    branch: BRANCHES[0],
    guest_full_name: "",
    guest_contact: "",
    guest_address: "",
    patient_name: "",
  });
  const [errors, setErrors] = useState({});

  const set = (key, val) => {
    setForm(f => ({ ...f, [key]: val }));
    setErrors(e => ({ ...e, [key]: "" }));
  };

  const validate = () => {
    const errs = {};
    if (!form.description.trim()) errs.description = "Please describe the emergency.";
    if (guestMode) {
      if (!form.guest_full_name.trim()) errs.guest_full_name = "Full name is required.";
      if (!form.guest_contact.trim()) errs.guest_contact = "Contact number is required.";
      if (!form.guest_address.trim()) errs.guest_address = "Address is required.";
      if (!form.patient_name.trim()) errs.patient_name = "Patient (pet) name is required.";
    }
    return errs;
  };

  const handleSend = useCallback(async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    const result = await onSend(form);
    if (result?.success) {
      setForm({ type: EMERGENCY_TYPES[0], description: "", branch: BRANCHES[0], guest_full_name: "", guest_contact: "", guest_address: "", patient_name: "" });
      setErrors({});
    }
  }, [form, onSend]);

  const inp = (hasErr) => ({
    width: "100%", padding: "9px 12px", boxSizing: "border-box",
    border: `1.5px solid ${hasErr ? "#f87171" : "var(--border)"}`,
    borderRadius: 8, fontSize: 13, fontFamily: "inherit",
    background: "#fff", color: "var(--text)", outline: "none",
  });
  const errStyle = { fontSize: 11, color: "#dc2626", marginTop: 3 };
  const labelStyle = { fontSize: 13, fontWeight: 600, color: "var(--text)", display: "block", marginBottom: 5 };

  return (
    <div style={{
      background: "#fff", borderRadius: "var(--radius-lg)",
      border: "1px solid var(--border)", padding: 24, boxShadow: "var(--shadow)",
    }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, color: "#dc2626" }}>
        {guestMode ? "🚨 Report an Emergency" : "Send Emergency Alert"}
      </h3>
      {guestMode && (
        <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 16, marginTop: 0 }}>
          No account needed. Fill in your details and we'll respond immediately.
        </p>
      )}
      <hr style={{ border: "none", borderTop: "1px solid var(--border)", marginBottom: 20 }} />

      {guestMode && (
        <>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Your Full Name <span style={{ color: "#dc2626" }}>*</span></label>
            <input type="text" placeholder="e.g. Juan dela Cruz" value={form.guest_full_name} onChange={e => set("guest_full_name", e.target.value)} style={inp(errors.guest_full_name)} />
            {errors.guest_full_name && <p style={errStyle}>{errors.guest_full_name}</p>}
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Contact Number <span style={{ color: "#dc2626" }}>*</span></label>
            <input type="tel" placeholder="e.g. 09XX-XXX-XXXX" value={form.guest_contact} onChange={e => set("guest_contact", e.target.value)} style={inp(errors.guest_contact)} />
            {errors.guest_contact && <p style={errStyle}>{errors.guest_contact}</p>}
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Your Address <span style={{ color: "#dc2626" }}>*</span></label>
            <input type="text" placeholder="e.g. 123 Rizal St., Angeles City" value={form.guest_address} onChange={e => set("guest_address", e.target.value)} style={inp(errors.guest_address)} />
            {errors.guest_address && <p style={errStyle}>{errors.guest_address}</p>}
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Patient Name (Pet) <span style={{ color: "#dc2626" }}>*</span></label>
            <input type="text" placeholder="e.g. Brownie" value={form.patient_name} onChange={e => set("patient_name", e.target.value)} style={inp(errors.patient_name)} />
            {errors.patient_name && <p style={errStyle}>{errors.patient_name}</p>}
          </div>
          <hr style={{ border: "none", borderTop: "1px solid var(--border)", marginBottom: 16 }} />
        </>
      )}

      <div className="form-group" style={{ marginBottom: 14 }}>
        <label>Emergency Type</label>
        <select value={form.type} onChange={e => set("type", e.target.value)}>
          {EMERGENCY_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Description <span style={{ color: "#dc2626" }}>*</span></label>
        <textarea
          value={form.description}
          onChange={e => set("description", e.target.value)}
          placeholder="Describe the emergency situation in detail..."
          style={{ ...inp(errors.description), minHeight: 90, resize: "vertical" }}
        />
        {errors.description && <p style={errStyle}>{errors.description}</p>}
      </div>

      <div className="form-group" style={{ marginBottom: 20 }}>
        <label>Nearest Branch</label>
        <select value={form.branch} onChange={e => set("branch", e.target.value)}>
          {BRANCHES.map(b => <option key={b}>{b}</option>)}
        </select>
      </div>

      <button
        className="send-alert-btn"
        onClick={handleSend}
        disabled={sending}
        style={{
          width: "100%", padding: "13px",
          background: sending ? "#94a3b8" : "#dc2626",
          color: "#fff", border: "none", borderRadius: 9,
          fontSize: 14, fontWeight: 700, letterSpacing: "0.3px",
          cursor: sending ? "not-allowed" : "pointer",
          fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}
      >
        {sending ? (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
            Sending...
          </>
        ) : (
          <>
            <img src="/icon/emergency_2.png" alt="" style={{ width: 15, height: 15, filter: "brightness(0) invert(1)" }} />
            Send Emergency Alert
          </>
        )}
      </button>

      {guestMode && (
        <button onClick={onExit} style={{
          width: "100%", marginTop: 10, padding: "10px",
          background: "transparent", color: "#64748b",
          border: "1px solid #e2e8f0", borderRadius: 8,
          fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
        }}>
          ← Back to Login
        </button>
      )}
    </div>
  );
});

// ─── Admin View ───────────────────────────────────────────────────────────────
const AdminView = ({ alerts, loading, onRefresh, onUpdateStatus }) => {
  const pending = alerts.filter(a => ["pending", "responding"].includes(a.status || "pending"));
  const resolved = alerts.filter(a => (a.status || "pending") === "resolved");
  const responding = alerts.filter(a => (a.status || "pending") === "responding");

  const S = {
    page: { width: "100%", minHeight: "100vh", display: "block" },
    topbar: { background: "#fff", borderBottom: "1px solid var(--border)", padding: "14px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 68, zIndex: 50, width: "100%", boxSizing: "border-box" },
    cont: { padding: "24px 28px", paddingTop: "calc(var(--topbar-h) + var(--pagetop-h) + 20px)", width: "100%", boxSizing: "border-box" },
  };

  return (
    <div style={S.page}>
      <style>{SKEL_CSS}</style>
      <div style={S.topbar}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/icon/emergency_2.png" alt="" style={{ width: 22, height: 22, filter: "brightness(0) saturate(100%) invert(17%) sepia(82%) saturate(1200%) hue-rotate(210deg)" }} />
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", margin: 0 }}>Emergency Notifications</h1>
            <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>Monitor and manage incoming emergency alerts</p>
          </div>
        </div>
        <button onClick={onRefresh} style={{ fontSize: 12, fontWeight: 700, padding: "7px 14px", borderRadius: 8, border: "1.5px solid var(--border)", background: "#fff", cursor: "pointer", fontFamily: "inherit", color: "var(--text)", display: "flex", alignItems: "center", gap: 6 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          Refresh
        </button>
      </div>

      <div style={S.cont}>
        <div style={{ borderRadius: 14, marginBottom: 24, overflow: "hidden", width: "100%" }}>
          <img src="/image/emergency_alert_system.png" alt="Emergency Alert System" style={{ width: "100%", height: "auto", display: "block", borderRadius: 14 }} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
          {[
            { label: "Total Alerts", value: alerts.length, color: "#6366f1", bg: "#eef2ff", border: "#c7d2fe" },
            { label: "Pending", value: pending.length, color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
            { label: "Responding", value: responding.length, color: "#1d4ed8", bg: "#dbeafe", border: "#93c5fd" },
            { label: "Resolved", value: resolved.length, color: "#16a34a", bg: "#f0fdf4", border: "#86efac" },
          ].map(s => (
            <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 12, padding: "18px 20px", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%", background: s.color, borderRadius: "12px 0 0 12px" }} />
              <div style={{ fontSize: 30, fontWeight: 800, color: s.color, lineHeight: 1, marginBottom: 4 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: s.color, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.4px", opacity: 0.8 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
          <div style={{ background: "#fff", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", padding: 24, boxShadow: "var(--shadow)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#dc2626", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                <img src="/icon/warning.png" alt="" style={{ width: 16, height: 16, filter: "brightness(0) saturate(100%) invert(20%) sepia(80%) saturate(2000%) hue-rotate(350deg)", flexShrink: 0 }} />
                Pending Alerts
                {pending.length > 0 && (
                  <span style={{ marginLeft: 8, background: "#dc2626", color: "#fff", borderRadius: 20, fontSize: 11, padding: "1px 8px", fontWeight: 800 }}>
                    {pending.length}
                  </span>
                )}
              </h3>
            </div>
            <hr style={{ border: "none", borderTop: "1px solid var(--border)", marginBottom: 16 }} />
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[1, 2, 3].map(i => (
                  <div key={i} style={{ background: '#fef9c3', border: '1px solid #fde047', borderRadius: 10, padding: '12px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Skel w="40%" h={13} />
                      <Skel w="20%" h={13} />
                    </div>
                    <Skel w="90%" h={12} style={{ marginBottom: 6 }} />
                    <Skel w="60%" h={11} />
                  </div>
                ))}
              </div>
            ) : pending.length === 0 ? (
              <div style={{ textAlign: "center", padding: "30px 0" }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#f0fdf4", border: "1.5px solid #86efac", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <p style={{ color: "var(--muted)", fontSize: 13, fontWeight: 600 }}>All clear — no pending alerts</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: 420, overflowY: "auto" }}>
                {alerts.map(a => <AlertCard key={a.id + a.status} a={a} showActions={true} onUpdateStatus={onUpdateStatus} />)}
              </div>
            )}
          </div>

          <div style={{ background: "#fff", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", padding: 24, boxShadow: "var(--shadow)" }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--royal)", margin: "0 0 16px", display: "flex", alignItems: "center", gap: 8 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              Alert History ({alerts.length})
            </h3>
            <hr style={{ border: "none", borderTop: "1px solid var(--border)", marginBottom: 16 }} />
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[1, 2, 3, 4].map(i => (
                  <div key={i} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Skel w="35%" h={13} />
                      <Skel w="18%" h={13} />
                    </div>
                    <Skel w="85%" h={12} style={{ marginBottom: 6 }} />
                    <Skel w="55%" h={11} />
                  </div>
                ))}
              </div>
            ) : alerts.length === 0 ? (
              <p style={{ color: "var(--muted)", fontSize: 13, textAlign: "center", padding: 20 }}>No alerts yet</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: 420, overflowY: "auto" }}>
                {alerts.map(a => <AlertCard key={a.id + a.status} a={a} showActions={true} onUpdateStatus={onUpdateStatus} />)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Staff View ───────────────────────────────────────────────────────────────
const StaffView = ({ alerts, loading, sending, onSend, onExit }) => {
  const S = {
    page: { width: "100%", minHeight: "100vh", display: "block" },
    topbar: { background: "#fff", borderBottom: "1px solid var(--border)", padding: "14px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 68, zIndex: 50, width: "100%", boxSizing: "border-box" },
    cont: { padding: "24px 28px", paddingTop: "calc(var(--topbar-h) + var(--pagetop-h) + 20px)", width: "100%", boxSizing: "border-box" },
  };

  <style>{`
  .send-alert-btn:not(:disabled):hover { opacity: 0.88; transform: translateY(-1px); box-shadow: 0 4px 14px rgba(220,38,38,0.3); }
  .send-alert-btn { transition: all 0.18s; }
`}</style>

  return (
    <div style={S.page}>
      <div style={S.topbar}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/icon/emergency_2.png" alt="" style={{ width: 22, height: 22, filter: "brightness(0) saturate(100%) invert(17%) sepia(82%) saturate(1200%) hue-rotate(210deg)" }} />
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", margin: 0 }}>Emergency Notification</h1>
            <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>Send emergency alerts to branches</p>
          </div>
        </div>
      </div>
      <div style={S.cont}>
        <div style={{ borderRadius: 14, marginBottom: 24, overflow: "hidden", width: "100%" }}>
          <img src="/image/emergency_alert_system.png" alt="Emergency Alert System" style={{ width: "100%", height: "auto", display: "block", borderRadius: 14 }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
          <EmergencyForm guestMode={false} sending={sending} onSend={onSend} onExit={onExit} />
          <div style={{ background: "#fff", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", padding: 24, boxShadow: "var(--shadow)" }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: "var(--royal)", display: "flex", alignItems: "center", gap: 8 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              Alert History
            </h3>
            <hr style={{ border: "none", borderTop: "1px solid var(--border)", marginBottom: 20 }} />
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[1, 2, 3].map(i => (
                  <div key={i} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Skel w="38%" h={13} />
                      <Skel w="18%" h={13} />
                    </div>
                    <Skel w="80%" h={12} style={{ marginBottom: 6 }} />
                    <Skel w="50%" h={11} />
                  </div>
                ))}
              </div>
            ) : alerts.length === 0 ? (
              <p style={{ color: "var(--muted)", fontSize: 13, textAlign: "center", padding: 20 }}>No alerts sent yet</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: 400, overflowY: "auto" }}>
                {alerts.map(a => <AlertCard key={a.id + a.status} a={a} />)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Customer View ────────────────────────────────────────────────────────────
const CustomerView = ({ sending, onSend }) => {
  const S = {
    page: { width: "100%", minHeight: "100vh", display: "block" },
    topbar: { background: "#fff", borderBottom: "1px solid var(--border)", padding: "14px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 68, zIndex: 50, width: "100%", boxSizing: "border-box" },
    cont: { padding: "24px 28px", paddingTop: "calc(var(--topbar-h) + var(--pagetop-h) + 20px)", width: "100%", boxSizing: "border-box" },
  };
  return (
    <div style={S.page}>
      <div style={S.topbar}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/icon/emergency_2.png" alt="" style={{ width: 22, height: 22, filter: "brightness(0) saturate(100%) invert(17%) sepia(82%) saturate(1200%) hue-rotate(210deg)" }} />
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", margin: 0 }}>Emergency</h1>
            <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>Report an emergency — our team responds immediately</p>
          </div>
        </div>
      </div>
      <div style={S.cont}>
        <div style={{ borderRadius: 14, marginBottom: 24, overflow: "hidden", width: "100%" }}>
          <img src="/image/emergency_alert_system.png" alt="Emergency Alert System" style={{ width: "100%", height: "auto", display: "block", borderRadius: 14 }} />
        </div>
        <div style={{ background: "#fef2f2", border: "1.5px solid #fca5a5", borderRadius: 10, padding: "12px 20px", marginBottom: 24, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#fecaca", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <img src="/icon/emergency_2.png" alt="" style={{ width: 18, height: 18, filter: "brightness(0) saturate(100%) invert(16%) sepia(90%) saturate(2000%) hue-rotate(340deg)" }} />
        </div>
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "#991b1b" }}>Emergency Reporting</p>
            <p style={{ margin: 0, fontSize: 12, color: "#dc2626" }}>Use this to immediately notify our staff of a pet emergency.</p>
          </div>
        </div>
        <div style={{ maxWidth: 560 }}>
          <EmergencyForm guestMode={false} sending={sending} onSend={onSend} onExit={null} />
        </div>
      </div>
    </div>
  );
};

// ─── Guest View ───────────────────────────────────────────────────────────────
const GuestView = ({ sending, onSend, onExit }) => (
  <div style={{ width: "100%", minHeight: "100vh", display: "block", background: "#fff" }}>
    <GuestBanner onExit={onExit} />
    <div style={{ background: "#fff", borderBottom: "1px solid var(--border)", padding: "14px 28px", display: "flex", alignItems: "center", gap: 10 }}>
      <img src="/icon/emergency_2.png" alt="" style={{ width: 22, height: 22, filter: "brightness(0) saturate(100%) invert(17%) sepia(82%) saturate(1200%) hue-rotate(210deg)" }} />
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", margin: 0 }}>Emergency Report</h1>
        <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>Submit an emergency report — no account needed</p>
      </div>
    </div>
    <div style={{ padding: "24px 28px", width: "100%", boxSizing: "border-box" }}>
      <div style={{ borderRadius: 14, marginBottom: 24, overflow: "hidden", width: "100%" }}>
        <img src="/image/emergency_alert_system.png" alt="Emergency Alert System" style={{ width: "100%", height: "auto", display: "block", borderRadius: 14 }} />
      </div>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <EmergencyForm guestMode={true} sending={sending} onSend={onSend} onExit={onExit} />
        <div style={{ marginTop: 16, textAlign: "center" }}>
          <p style={{ fontSize: 13, color: "#64748b", marginBottom: 8 }}>Already have an account?</p>
          <a href="/login" style={{ display: "inline-block", padding: "10px 28px", background: "#0f1f4b", color: "#fff", borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
            Sign In to Your Account
          </a>
        </div>
      </div>
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const Emergency = ({ guestMode = false }) => {
  const { user, isAdmin, isCustomer, loading: userLoading } = useCurrentUser();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const navigate = useNavigate();



  const senderName = user
    ? `${user.firstName} ${user.lastName}`.trim() || user.email || 'Staff'
    : 'Staff';

  // ── Fetch all alerts (admin sees all; staff sees branch-filtered via RLS or explicit filter) ──
  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("emergency_alerts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (!error) setAlerts(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAlerts();

    const channel = supabase
      .channel("emergency-alerts-realtime-" + Date.now()) // ← unique channel name prevents stale subs
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "emergency_alerts" },
        (payload) => {
          setAlerts(prev => {
            const exists = prev.some(a => a.id === payload.new.id);
            if (exists) return prev;
            return [payload.new, ...prev].slice(0, 50);
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "emergency_alerts" },
        (payload) => {
          setAlerts(prev =>
            prev.map(a => a.id === payload.new.id ? { ...a, ...payload.new } : a)
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "emergency_alerts" },
        (payload) => {
          setAlerts(prev => prev.filter(a => a.id !== payload.old.id));
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("✅ Realtime connected");
        }
        if (status === "CLOSED" || status === "CHANNEL_ERROR") {
          console.warn("⚠️ Realtime disconnected, refetching...");
          fetchAlerts(); // fallback refetch if realtime drops
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAlerts]);

  useEffect(() => {
    if (guestMode) {
      document.body.style.paddingTop = "0";
      document.body.style.overflow = "auto";
    }
    return () => { if (guestMode) document.body.style.paddingTop = "68px"; };
  }, [guestMode]);

  // ── Send alert — include branch_id from user ───────────────────────────────
  const sendAlert = useCallback(async (formData) => {
    setSending(true);
    const base = {
      type: formData.type,
      description: formData.description.trim(),
      branch: formData.branch,
      status: "pending",
      sent_by: guestMode
        ? (formData.guest_full_name?.trim() || "Emergency Guest")
        : senderName,
      ...(guestMode ? {
        guest_full_name: formData.guest_full_name?.trim() || null,
        guest_contact: formData.guest_contact?.trim() || null,
        guest_address: formData.guest_address?.trim() || null,
        patient_name: formData.patient_name?.trim() || null,
      } : {}),
    };

    const payload = guestMode ? base : withBranchId(user, base);
    const { error } = await supabase.from("emergency_alerts").insert([payload]).select();
    setSending(false);

    if (error) { alert("Error: " + error.message); return; }

    setSuccessModal(true); // ← REPLACE alert() WITH THIS
    return { success: true };
  }, [guestMode, user, senderName]);

  const updateStatus = useCallback(async (id, status) => {
    // Update UI instantly
    setAlerts(prev =>
      prev.map(a => a.id === id ? { ...a, status } : a)
    );

    const { error } = await supabase
      .from("emergency_alerts")
      .update({ status })
      .eq("id", id);

    if (error) {
      console.error("Status update failed:", error.message);
      fetchAlerts(); // rollback by refetching real data
    }
  }, [fetchAlerts]);

  const handleGuestExit = useCallback(() => {
    localStorage.removeItem("hospital_jwt");
    localStorage.removeItem("sb_user");
    navigate("/login");
  }, [navigate]);

  // ── Render ──────────────────────────────────────────────────────────────────
  if (guestMode) {
    return (
      <>
        <SuccessModal show={successModal} guestMode={true} onClose={() => setSuccessModal(false)} />
        <GuestView sending={sending} onSend={sendAlert} onExit={handleGuestExit} />
      </>
    );
  }

  if (isAdmin) {
    return (
      <Layout>
        <SuccessModal show={successModal} guestMode={false} onClose={() => setSuccessModal(false)} />
        <AdminView alerts={alerts} loading={loading} onRefresh={fetchAlerts} onUpdateStatus={updateStatus} />
      </Layout>
    );
  }

  if (isCustomer) {
    return (
      <Layout>
        <SuccessModal show={successModal} guestMode={false} onClose={() => setSuccessModal(false)} />
        <CustomerView sending={sending} onSend={sendAlert} />
      </Layout>
    );
  }

  return (
    <Layout>
      <SuccessModal show={successModal} guestMode={false} onClose={() => setSuccessModal(false)} />
      <StaffView alerts={alerts} loading={loading} sending={sending} onSend={sendAlert} onExit={handleGuestExit} />
    </Layout>
  );
};

export default Emergency;