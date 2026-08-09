// src/pages/Appointments.jsx
import React, { useState, useEffect, useCallback } from "react";
import ReactDOM from "react-dom";
import Layout from "../../components/layout";
import { supabase } from "../../js/Utils/supabase";
import { useCurrentUser } from "../../js/hooks/Usecurrentuser";
import { logActivity } from "../../js/Utils/logActivity";
import "../../styles/Appointments.css";

const STATUS_BADGE = { Confirmed: "badge-green", Pending: "badge-yellow", Cancelled: "badge-red", Completed: "badge-blue", Missed: "badge-gray" };
const STATUS_DOT = { Confirmed: "#16a34a", Pending: "#d97706", Cancelled: "#dc2626", Completed: "#1e3a8a", Missed: "#6b7280" };
const isPastDue = (appt) => appt?.date && appt.date < today && ["Pending", "Confirmed"].includes(appt.status);
const VETS = ["Dr. Santos", "Dr. Reyes", "Dr. Cruz", "Dr. Garcia"];
const TIMES = ["08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM", "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM"];
const today = new Date().toISOString().split("T")[0];
const ROWS_PER_PAGE = 10;
const EMPTY = { patient: "", owner: "", ownerId: "", contact: "", vet: "", date: "", time: "", purpose: "Consultation", imagingType: "", species: "", status: "Pending", notes: "", room: "", mode: "new", existingId: null, price: "" };

const S = {
  btn: {
    padding: "8px 16px",
    borderRadius: 8,
    border: "1.5px solid var(--border)",
    background: "transparent",
    color: "var(--text)",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
  },
};

const canEdit = (appt) => appt?.status === "Pending";
const sanitizeContact = (v) => v.replace(/\D/g, "").slice(0, 11);
const sanitizeName = (v) => v.replace(/[^a-zA-Z\s'-]/g, "");

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
      let left = rect.left + window.scrollX;
      const maxLeft = window.scrollX + window.innerWidth - rect.width - 8;
      const minLeft = window.scrollX + 8;
      if (left > maxLeft) left = maxLeft;
      if (left < minLeft) left = minLeft;
      setDropPos({
        top: showAbove ? rect.top + window.scrollY - dropHeight - 6 : rect.bottom + window.scrollY + 6,
        left,
        width: rect.width,
      });
    }
    setOpen(o => !o);
  };

  const portal = open && typeof document !== "undefined"
    ? ReactDOM.createPortal(
      <div ref={ref} style={{ position: "absolute", top: dropPos.top, left: dropPos.left, width: dropPos.width, background: "var(--card)", borderRadius: 12, zIndex: 99999, boxShadow: "0 16px 40px rgba(0,0,0,0.13), 0 4px 12px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.06)", border: "1.5px solid #e8edf4", maxHeight: 260, overflowY: "auto", padding: "5px" }}>
        {[{ value: "", label: placeholder }, ...options].map((opt, i) => {
          const optVal = opt.value ?? opt;
          const optLabel = opt.label ?? opt;
          const isSelected = optVal === value;
          const isEmpty = optVal === "";
          return (
            <div key={i} onClick={() => { if (!opt.disabled && optVal !== "" || optVal === "") { onChange(optVal); setOpen(false); } }}
              style={{ padding: "8px 10px", fontSize: 13, fontWeight: isSelected ? 700 : 500, color: opt.disabled ? "#cbd5e1" : isEmpty ? "#b0bac9" : isSelected ? accent : "var(--text)", cursor: opt.disabled ? "not-allowed" : isEmpty ? "default" : "pointer", transition: "background 0.12s, color 0.12s", background: isSelected ? `${accent}12` : "transparent", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, opacity: opt.disabled ? 0.45 : 1, marginBottom: 1 }}
              onMouseEnter={e => { if (!isSelected && !opt.disabled && !isEmpty) e.currentTarget.style.background = "#f4f6fa"; }}
              onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = isSelected ? `${accent}12` : "transparent"; }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                {!isEmpty && (
                  <div style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0, background: isSelected ? accent : "transparent", border: `1.5px solid ${isSelected ? accent : opt.disabled ? "#e2e8f0" : "#cbd5e1"}`, transition: "background 0.15s, border-color 0.15s" }} />
                )}
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{optLabel}</span>
              </div>
              {isSelected && !isEmpty && (
                <div style={{ width: 18, height: 18, borderRadius: 5, background: accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
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
    <div style={{ position: "relative", width: "100%" }}>
      <div ref={triggerRef} onClick={handleOpen}
        style={{ width: "100%", padding: "8px 34px 8px 12px", border: "1.5px solid", borderRadius: 9, background: open ? "linear-gradient(135deg, #ffffff 0%, #f5f3ff 100%)" : "linear-gradient(to bottom, #ffffff 0%, #f8fafc 100%)", fontSize: 13, fontWeight: 600, color: value ? "var(--text)" : "#b0bac9", cursor: "pointer", userSelect: "none", boxSizing: "border-box", boxShadow: open ? `0 0 0 3px ${accent}22, 0 2px 8px rgba(0,0,0,0.08)` : "0 1px 3px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)", borderColor: open ? accent : "#dde3ec", transition: "border-color 0.18s, box-shadow 0.18s, background 0.18s", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, position: "relative", minHeight: 36 }}
        onMouseEnter={e => { if (!open) { e.currentTarget.style.borderColor = "#a5b4fc"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(99,102,241,0.10), inset 0 1px 0 rgba(255,255,255,0.9)"; } }}
        onMouseLeave={e => { if (!open) { e.currentTarget.style.borderColor = "#dde3ec"; e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)"; } }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{label}</span>
        <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", width: 20, height: 20, borderRadius: 6, background: open ? accent : "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.18s", flexShrink: 0 }}>
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={open ? "#fff" : "#94a3b8"} strokeWidth="3" strokeLinecap="round" style={{ transition: "transform 0.2s, stroke 0.18s", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>
      {portal}
    </div>
  );
};


/* ── Reusable skeleton block ── */
const Skel = ({ w = "100%", h = 14, style = {} }) => (
  <span className="skel" style={{ display: "block", width: w, height: h, borderRadius: 6, ...style }} />
);

/* ── Skeleton for stat cards ── */
const StatCardSkeleton = () => (
  <div style={{ background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 14, pointerEvents: 'none' }}>
    <div className="skel" style={{ width: 46, height: 46, borderRadius: 12 }} />
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <Skel w="45%" h={11} />
      <Skel w="30%" h={26} />
      <Skel w="60%" h={10} />
    </div>
  </div>
);
/* ── Skeleton for table rows ── */
const TableRowSkeleton = ({ cols = 7 }) => (
  <tr>
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i} style={{ padding: "15px 14px", borderBottom: "1px solid var(--border)" }}>
        {i === 0 ? (
          <>
            <Skel w="70%" h={13} style={{ marginBottom: 6 }} />
            <Skel w="40%" h={11} />
          </>
        ) : i === 3 ? (
          <>
            <Skel w="60%" h={13} style={{ marginBottom: 6 }} />
            <Skel w="45%" h={11} />
          </>
        ) : i === 5 ? (
          <Skel w={64} h={22} style={{ borderRadius: 20 }} />
        ) : i === 6 ? (
          <div style={{ display: "flex", gap: 6 }}>
            <Skel w={52} h={28} style={{ borderRadius: 8 }} />
            <Skel w={52} h={28} style={{ borderRadius: 8 }} />
          </div>
        ) : (
          <Skel w={`${55 + Math.random() * 30}%`} h={13} />
        )}
      </td>
    ))}
  </tr>
);

/* ── Skeleton for calendar cells ── */
const CalendarSkeleton = () => (
  <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
      <div key={d} style={{ textAlign: "center", fontWeight: 700, fontSize: 12, color: "var(--muted)", padding: "8px 0" }}>{d}</div>
    ))}
    {Array.from({ length: 35 }).map((_, i) => (
      <div key={i} style={{ minHeight: 76, border: "1px solid var(--border)", borderRadius: 8, padding: 6, background: "#fff" }}>
        <Skel w={20} h={13} style={{ marginBottom: 6 }} />
        {i % 4 === 0 && <Skel w="90%" h={18} style={{ marginBottom: 3, borderRadius: 4 }} />}
        {i % 7 === 2 && <Skel w="80%" h={18} style={{ borderRadius: 4 }} />}
      </div>
    ))}
  </div>
);

const DatePicker = ({ value, onChange, placeholder = "Pick a date", min = "" }) => {
  const [open, setOpen] = React.useState(false);
  const [viewDate, setViewDate] = React.useState(() => value ? new Date(value + "T00:00:00") : new Date());
  const triggerRef = React.useRef(null);
  const popRef = React.useRef(null);

  React.useEffect(() => {
    if (value) setViewDate(new Date(value + "T00:00:00"));
  }, [value]);

  React.useEffect(() => {
    const handler = (e) => {
      if (popRef.current && !popRef.current.contains(e.target) && triggerRef.current && !triggerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const [popPos, setPopPos] = React.useState({ top: 0, left: 0, width: 280, fixed: false });
  const handleOpen = () => {
    if (!open && triggerRef.current) {
      const isMobile = window.innerWidth < 480;
      if (isMobile) {
        const popWidth = Math.min(320, window.innerWidth - 24);
        setPopPos({
          top: Math.max(12, (window.innerHeight - 360) / 2),
          left: (window.innerWidth - popWidth) / 2,
          width: popWidth,
          fixed: true,
        });
      } else {
        const rect = triggerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const popWidth = Math.max(rect.width, 280);
        let left = rect.left;
        const maxLeft = window.innerWidth - popWidth - 8;
        if (left > maxLeft) left = Math.max(8, maxLeft);
        setPopPos({
          top: spaceBelow > 320 ? rect.bottom + 6 : Math.max(8, rect.top - 310 - 6),
          left,
          width: popWidth,
          fixed: true,
        });
      }
    }
    setOpen(o => !o);
  };

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const todayStr = new Date().toISOString().split("T")[0];

  const selectDay = (day) => {
    const m = String(month + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    const str = `${year}-${m}-${d}`;
    if (min && str < min) return;
    onChange(str);
    setOpen(false);
  };

  const displayValue = value ? new Date(value + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : placeholder;

  const portal = open && typeof document !== "undefined" ? ReactDOM.createPortal(
    <div ref={popRef} style={{ position: "fixed", top: popPos.top, left: popPos.left, width: popPos.width, zIndex: 99999, background: "var(--card)", border: "1.5px solid #e8edf4", borderRadius: 14, boxShadow: "0 16px 48px rgba(0,0,0,0.16), 0 4px 12px rgba(0,0,0,0.08)", overflow: "hidden", maxHeight: "calc(100vh - 24px)", overflowY: "auto" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#0f172a,#1e3a8a)", padding: "14px 16px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={() => setViewDate(new Date(year, month - 1, 1))}
          style={{ width: 28, height: 28, borderRadius: 8, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.1)", cursor: "pointer", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#fff", lineHeight: 1.2 }}>{MONTHS[month]}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>{year}</div>
        </div>
        <button onClick={() => setViewDate(new Date(year, month + 1, 1))}
          style={{ width: 28, height: 28, borderRadius: 8, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.1)", cursor: "pointer", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
        </button>
      </div>

      {/* Day labels */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", padding: "10px 12px 4px", gap: 2 }}>
        {DAY_LABELS.map((d, i) => (
          <div key={d} style={{ textAlign: "center", fontSize: 10, fontWeight: 800, color: i === 0 ? "#ef4444" : i === 6 ? "#3b82f6" : "#94a3b8", padding: "3px 0", textTransform: "uppercase", letterSpacing: "0.4px" }}>{d}</div>
        ))}
      </div>

      {/* Day grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", padding: "2px 12px 12px", gap: 2 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const m = String(month + 1).padStart(2, "0");
          const d = String(day).padStart(2, "0");
          const dateStr = `${year}-${m}-${d}`;
          const isSelected = dateStr === value;
          const isToday = dateStr === todayStr;
          const isDisabled = min && dateStr < min;
          const isSun = i % 7 === 0;
          const isSat = i % 7 === 6;
          return (
            <div key={i} onClick={() => !isDisabled && selectDay(day)}
              style={{
                width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: isSelected ? 800 : isToday ? 700 : 500,
                cursor: isDisabled ? "not-allowed" : "pointer",
                background: isSelected ? "linear-gradient(135deg,#1e3a8a,#3b82f6)" : isToday ? "#eff6ff" : "transparent",
                color: isSelected ? "#fff" : isDisabled ? "#cbd5e1" : isToday ? "#1e40af" : isSun ? "#ef4444" : isSat ? "#3b82f6" : "var(--text)",
                border: isToday && !isSelected ? "1.5px solid #bfdbfe" : "none",
                boxShadow: isSelected ? "0 2px 8px rgba(30,58,138,0.35)" : "none",
                transition: "background 0.12s",
                margin: "auto",
              }}
              onMouseEnter={e => { if (!isSelected && !isDisabled) e.currentTarget.style.background = "#f1f5f9"; }}
              onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = isToday ? "#eff6ff" : "transparent"; }}
            >{day}</div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{ padding: "8px 12px 10px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={() => { onChange(""); setOpen(false); }}
          style={{ fontSize: 11, fontWeight: 700, color: "#64748b", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: "4px 8px", borderRadius: 6 }}>
          Clear
        </button>
        <button onClick={() => { selectDay(new Date().getDate()); setViewDate(new Date()); }}
          style={{ fontSize: 11, fontWeight: 700, color: "#1e40af", background: "#eff6ff", border: "1px solid #bfdbfe", cursor: "pointer", fontFamily: "inherit", padding: "4px 10px", borderRadius: 6 }}>
          Today
        </button>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div style={{ position: "relative" }}>
      <div ref={triggerRef} onClick={handleOpen}
        style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", border: "1.5px solid", borderColor: open ? "#6366f1" : "#dde3ec", borderRadius: 9, background: open ? "linear-gradient(135deg,#ffffff,#f5f3ff)" : "linear-gradient(to bottom,#ffffff,#f8fafc)", cursor: "pointer", userSelect: "none", minWidth: 160, boxShadow: open ? "0 0 0 3px rgba(99,102,241,0.12),0 2px 8px rgba(0,0,0,0.08)" : "0 1px 3px rgba(0,0,0,0.06),inset 0 1px 0 rgba(255,255,255,0.9)", transition: "all 0.18s" }}
        onMouseEnter={e => { if (!open) { e.currentTarget.style.borderColor = "#a5b4fc"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(99,102,241,0.10),inset 0 1px 0 rgba(255,255,255,0.9)"; } }}
        onMouseLeave={e => { if (!open) { e.currentTarget.style.borderColor = "#dde3ec"; e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.06),inset 0 1px 0 rgba(255,255,255,0.9)"; } }}>
        <div style={{ width: 20, height: 20, borderRadius: 6, background: open ? "#6366f1" : "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.18s" }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={open ? "#fff" : "#94a3b8"} strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: value ? "var(--text)" : "#b0bac9", flex: 1, whiteSpace: "nowrap" }}>{displayValue}</span>
        {value && (
          <div onClick={e => { e.stopPropagation(); onChange(""); }}
            style={{ width: 16, height: 16, borderRadius: "50%", background: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </div>
        )}
      </div>
      {portal}
    </div>
  );
};

const LockBadge = ({ status }) => {
  const map = {
    Confirmed: { bg: "#f0fdf4", color: "#15803d", icon: <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>, label: "Locked — Approved" },
    Completed: { bg: "#eff6ff", color: "#1e40af", icon: <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>, label: "Completed" },
    Cancelled: { bg: "#fef2f2", color: "#dc2626", icon: <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>, label: "Cancelled" },
  };
  const cfg = map[status];
  if (!cfg) return null;
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: cfg.bg, color: cfg.color, display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
      {cfg.icon} {cfg.label}
    </span>
  );
};

const AppModal = ({ show, title, message, confirmText = "OK", cancelText = null, confirmColor = "var(--royal)", onConfirm, onCancel }) => {
  if (!show) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.50)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 99999, padding: 16 }}>
      <div style={{ background: "var(--card)", borderRadius: 14, width: "100%", maxWidth: 440, boxShadow: "0 20px 60px rgba(0,0,0,0.28)", overflow: "hidden" }}>
        <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--border)" }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{title}</h3>
        </div>
        <div style={{ padding: "16px 22px" }}>
          {message && <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>{message}</p>}
        </div>
        <div style={{ padding: "12px 22px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 10 }}>
          {cancelText && <button className="btn btn-ghost" style={{ width: "auto" }} onClick={onCancel}>{cancelText}</button>}
          <button className="btn" style={{ width: "auto", background: confirmColor, color: "#fff", border: "none" }} onClick={onConfirm}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
};

const Appointment = () => {
  const { user, isAdmin, isEmployee, isCustomer, seeAllBranches, loading: userLoading } = useCurrentUser();

  const [branches, setBranches] = useState([]);
  const [branchFilter, setBranchFilter] = useState("");
  const [customers, setCustomers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [services, setServices] = useState([]);
  const [appts, setAppts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("list");
  const [showBook, setShowBook] = useState(false);
  const [showView, setShowView] = useState(false);
  const [showReviews, setShowReviews] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [search, setSearch] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [calMonth, setCalMonth] = useState(new Date());
  const [approving, setApproving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [approveModal, setApproveModal] = useState({ show: false, appt: null, room: '' });
  const [conflictType, setConflictType] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [bookStep, setBookStep] = useState("service");

  // ── Multi-pet booking (new appointments only; editing stays single-pet) ──
  const EMPTY_PET_APPT = { mode: 'new', existingId: null, patient: '', species: '', purpose: 'Consultation', imagingType: '', vet: '', date: '', time: '', notes: '', price: '' };
  const [extraPets, setExtraPets] = useState([]);
  const [existingPatients, setExistingPatients] = useState([]);
  const [loadingExistingPatients, setLoadingExistingPatients] = useState(false);
   const [modal, setModal] = useState({ show: false, title: "", message: "", confirmText: "OK", cancelText: null, confirmColor: "var(--royal)", onConfirm: null, onCancel: null });
  const [cancelModal, setCancelModal] = useState({ show: false, id: null, reason: "", customReason: "" });
  const CANCEL_REASONS = ["Owner request", "Schedule conflict", "Pet unavailable", "Staff unavailable", "Weather / Emergency", "Duplicate booking", "Other"];
  const [toasts, setToasts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState(null);
  const [sortDir, setSortDir] = useState("desc");
  const toastTimerRef = React.useRef(null);

  const closeModal = () => setModal(m => ({ ...m, show: false }));
  const showAlert = (title, message) => setModal({ show: true, title, message, confirmText: "OK", cancelText: null, confirmColor: "var(--royal)", onConfirm: closeModal, onCancel: null });
  const showConfirm = (title, message, onConfirm, confirmText = "Confirm", confirmColor = "#dc2626") =>
    setModal({ show: true, title, message, confirmText, cancelText: "Cancel", confirmColor, onConfirm: () => { closeModal(); onConfirm(); }, onCancel: closeModal });

  useEffect(() => {
    if (seeAllBranches) supabase.from("branches").select("id,name").order("name").then(({ data }) => setBranches(data || []));
  }, [seeAllBranches]);

  useEffect(() => {
    supabase.from("inventory").select("name, price, branch_id").eq("category", "Service")
      .then(({ data }) => setServices(data || []));
  }, []);

  const SERVICE_META = {
    Consultation: { icon: <svg viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}><path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.3.3 0 1 0 .3.3" /><path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4" /><circle cx="20" cy="10" r="2" /></svg>, color: "#475569", bg: "#f8fafc" },
    Vaccination:  { icon: <svg viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}><path d="m18 2 4 4" /><path d="m17 7 3-3" /><path d="M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-2.5 0-3.4L15 5" /><path d="m9 11 4 4" /><path d="m5 19-3 3" /><path d="m14 4 6 6" /></svg>, color: "#15803d", bg: "#f0fdf4" },
    Deworming:    { icon: <svg viewBox="0 0 24 24" fill="none" stroke="#6d28d9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}><path d="M6 3c0 4 3 4 3 8s-3 4-3 8" /><path d="M12 3c0 4 3 4 3 8s-3 4-3 8" /><path d="M18 3c0 4 3 4 3 8s-3 4-3 8" /></svg>, color: "#6d28d9", bg: "#f3e8ff" },
    Imaging:      { icon: <svg viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-5-5L5 21" /></svg>, color: "#1d4ed8", bg: "#eff6ff" },
    Diagnostics:  { icon: <svg viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}><path d="M6 2v6" /><path d="M18 2v6" /><path d="M3 8h18" /><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" /><path d="M9 15h6" /><path d="M12 12v6" /></svg>, color: "#dc2626", bg: "#fee2e2" },
  };
  const SERVICE_OPTIONS = ["Consultation", "Vaccination", "Deworming", "Imaging", "Diagnostics"];

  const getServicePrice = (purpose, branchId, imagingType) => {
    if (!purpose) return null;
    const lookupName = purpose === "Imaging" && imagingType ? `Imaging - ${imagingType}` : purpose;
    const exact = services.find(s => s.name === lookupName && String(s.branch_id) === String(branchId));
    if (exact) return exact.price;
    const fallback = services.find(s => s.name === lookupName && s.branch_id == null);
    if (fallback) return fallback.price;
    return null;
  };

  useEffect(() => {
    if (userLoading || !user) return;
    const fetchCustomers = async () => {
      let q = supabase.from("profiles").select("id,first_name,last_name,phone,email").eq("role", "Customer").eq("status", "Active").order("first_name");
      if (!seeAllBranches && user.branchId) q = q.eq("branch_id", user.branchId);
      const { data } = await q;
      setCustomers(data || []);
    };
    fetchCustomers();
  }, [user, seeAllBranches, userLoading]);

  const fetchRooms = useCallback(async () => {
    if (userLoading || !user) return;
    let q = supabase.from("rooms").select("*").order("number");
    if (!seeAllBranches && user.branchId) q = q.eq("branch_id", user.branchId);
    if (seeAllBranches && branchFilter) q = q.eq("branch_id", branchFilter);
    const { data, error } = await q;
    if (!error) setRooms(data || []);
  }, [user, seeAllBranches, branchFilter, userLoading]);

   useEffect(() => {
    fetchRooms();
    const ch = supabase.channel(`appt-rooms-rt-${user?.branchId || "all"}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms" }, () => fetchRooms())
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [fetchRooms]);

  const fetchReviews = useCallback(async () => {
    if (userLoading || !user) return;
    setLoadingReviews(true);
    let q = supabase.from("reviews").select("*").order("created_at", { ascending: false });
    if (!seeAllBranches && user.branchId) q = q.eq("branch_id", user.branchId);
    if (seeAllBranches && branchFilter) q = q.eq("branch_id", branchFilter);
    const { data, error } = await q;
    if (!error) setReviews(data || []);
    setLoadingReviews(false);
  }, [user, seeAllBranches, branchFilter, userLoading]);

  const openReviews = () => { fetchReviews(); setShowReviews(true); };

  useEffect(() => {
    if (user) logActivity(user, 'Viewed appointments', 'Opened appointments list');
  }, []);

  const fetchExistingPatientsFor = async (ownerName, ownerUserId) => {
    if (!ownerName && !ownerUserId) { setExistingPatients([]); return; }
    setLoadingExistingPatients(true);
    let q = supabase.from('patients').select('id, name, species, owner, owner_user_id');
    if (ownerUserId) q = q.eq('owner_user_id', ownerUserId);
    else q = q.eq('owner', ownerName);
    const { data, error } = await q.order('name');
    if (!error) setExistingPatients(data || []);
    setLoadingExistingPatients(false);
  };

  const fetchAppts = useCallback(async () => {
    if (userLoading || !user) return;
    setLoading(true);
    let q = supabase.from("appointments").select("*").order("date", { ascending: true });
    if (!seeAllBranches && user.branchId) q = q.eq("branch_id", user.branchId);
    if (seeAllBranches && branchFilter) q = q.eq("branch_id", branchFilter);
    const { data, error } = await q;
    if (!error) setAppts(data || []);
    setLoading(false);
  }, [user, seeAllBranches, branchFilter, userLoading]);

  useEffect(() => { fetchAppts(); }, [fetchAppts]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`appointments-rt-${user.branchId || "all"}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "appointments" }, (p) => setAppts(prev => [...prev, p.new]))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "appointments" }, (p) => {
        setAppts(prev => prev.map(a => a.id === p.new.id ? p.new : a));
        setSelectedAppt(prev => prev?.id === p.new.id ? p.new : prev);
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "appointments" }, (p) => {
        setAppts(prev => prev.filter(a => a.id !== p.old.id));
        setSelectedAppt(prev => prev?.id === p.old.id ? null : prev);
      })
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [user]);

  useEffect(() => {
    if (!form.date || !form.time) { setConflictType(null); return; }
    const excludeId = editMode ? selectedAppt?.id : null;
    const slotTaken = appts.some(a => a.date === form.date && a.time === form.time && ["Pending", "Confirmed"].includes(a.status) && a.id !== excludeId);
    setConflictType(slotTaken ? "time" : null);
  }, [form.date, form.time, appts, editMode, selectedAppt]);

  useEffect(() => { setCurrentPage(1); }, [search, filterDate, filterStatus, sortField, sortDir]);

  const filtered = appts.filter(a => {
    const q = search.toLowerCase();
    if (isCustomer && user && a.user_id !== user.id) return false;
    return (
      (!search || `${a.patient} ${a.owner} ${a.vet}`.toLowerCase().includes(q)) &&
      (!filterDate || a.date === filterDate) &&
      (!filterStatus || a.status === filterStatus)
    );
  });

  let sortedFiltered = filtered;
  if (sortField) {
    sortedFiltered = [...filtered].sort((a, b) => {
      let av, bv;
      if (sortField === "created_at") {
        av = new Date(a.created_at || `${a.date}T${a.time || "00:00"}`).getTime();
        bv = new Date(b.created_at || `${b.date}T${b.time || "00:00"}`).getTime();
      } else {
        av = (a.patient || "").toString().toLowerCase();
        bv = (b.patient || "").toString().toLowerCase();
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }

  const totalPages = Math.max(1, Math.ceil(sortedFiltered.length / ROWS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = sortedFiltered.slice((safePage - 1) * ROWS_PER_PAGE, safePage * ROWS_PER_PAGE);

  const counts = {
    today: appts.filter(a => a.date === today).length,
    pending: appts.filter(a => a.status === "Pending").length,
    confirmed: appts.filter(a => a.status === "Confirmed").length,
    cancelled: appts.filter(a => a.status === "Cancelled").length,
  };

  const openBook = () => {
    setForm({ ...EMPTY, owner: isCustomer ? `${user.firstName} ${user.lastName}`.trim() : "", ownerId: isCustomer ? user.id : "" });
    setSelectedAppt(null); setEditMode(false); setConflictType(null);
    setExtraPets([]); setExistingPatients([]);
    setBookStep("service");
    if (isCustomer) fetchExistingPatientsFor(`${user.firstName} ${user.lastName}`.trim(), user.id);
    fetchRooms();
    setShowBook(true);
  };

  const openEdit = (a) => {
    if (!canEdit(a)) {
      showAlert("Cannot Edit", a.status === "Confirmed" ? "Confirmed appointments cannot be edited." : a.status === "Completed" ? "Completed appointments cannot be modified." : "Cancelled appointments cannot be modified.");
      return;
    }
    setSelectedAppt(a); setForm({ ...EMPTY, ...a, room: a.room || "", ownerId: a.user_id || "" }); setEditMode(true); setConflictType(null);
    setExtraPets([]); setExistingPatients([]);
    setBookStep("form");
    fetchRooms();
    setShowBook(true); setShowView(false);
  };

  const selectService = (val) => {
    const branchForLookup = seeAllBranches ? (branchFilter || user?.branchId) : user?.branchId;
    const looked = getServicePrice(val, branchForLookup, null);
    setForm(prev => ({ ...prev, purpose: val, imagingType: "", price: looked != null ? looked : "" }));
    setBookStep("pet");
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
      <div className="live-toast" style={{
        position: 'relative',
        width: 340, pointerEvents: 'none',
        opacity: show ? 1 : 0,
        transform: show ? 'translateX(0) scale(1)' : 'translateX(calc(100% + 32px)) scale(0.97)',
        transition: 'transform 0.32s cubic-bezier(0.22,1,0.36,1), opacity 0.32s ease',
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 12, overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)',
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: c.accent }} />
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11, padding: '14px 14px 12px' }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: c.iconBg, color: c.iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
            {c.icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ marginBottom: 5 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: c.labelColor, background: c.labelBg, borderRadius: 4, padding: '2px 7px' }}>{c.label}</span>
            </div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text)', lineHeight: 1.4 }}>{message}</p>
          </div>
        </div>
        <div style={{ height: 2, background: `${c.accent}22` }}>
          <div style={{ height: '100%', background: c.accent, opacity: 0.6, width: show ? '0%' : '100%', transition: show ? 'width 3s linear' : 'none' }} />
        </div>
      </div>
    );
  };

  // ── Extra pet list helpers ────────────────────────────────────────────
  const updateExtraPet = (idx, patch) => setExtraPets(prev => prev.map((p, i) => i === idx ? { ...p, ...patch } : p));
  const addExtraPet = () => setExtraPets(prev => [...prev, { ...EMPTY_PET_APPT, purpose: form.purpose, price: form.price }]);
  const removeExtraPet = (idx) => setExtraPets(prev => prev.filter((_, i) => i !== idx));

  const isSlotTakenAppt = (date, time, excludeIdx) => {
    if (!date || !time) return false;
    const usedFromExisting = appts.some(a => a.date === date && a.time === time && ["Pending", "Confirmed"].includes(a.status));
    const usedFromMain = form.date === date && form.time === time;
    const usedFromBatch = extraPets.some((p, i) => i !== excludeIdx && p.date === date && p.time === time);
    return usedFromExisting || usedFromMain || usedFromBatch;
  };

  const isMainPetValid = () => {
    const patientOk = form.mode === "existing" ? !!form.existingId : !!form.patient.trim();
    const imagingOk = form.purpose !== "Imaging" || !!form.imagingType;
    return patientOk && !!form.owner && !!form.date && !!form.time && !!form.vet && imagingOk;
  };

  const isExtraPetsValid = () => extraPets.every(p => {
    const patientOk = p.mode === "existing" ? !!p.existingId : !!p.patient.trim();
    const imagingOk = p.purpose !== "Imaging" || !!p.imagingType;
    return patientOk && !!p.date && !!p.time && !!p.vet && imagingOk;
  });

  const canSubmitAppointment = !conflictType && isMainPetValid() && (editMode || isExtraPetsValid());

  // Bookings made between 12:00 AM and 6:00 AM are still saved, but staff
  // aren't monitoring the system overnight, so warn up front that approval
  // (for non-admin/employee submitted requests) happens once the clinic opens.
  const isMidnightBookingHour = () => {
    const h = new Date().getHours();
    return h >= 0 && h < 6;
  };

  const saveAppointment = async () => {
    if (!form.patient || !form.owner || !form.date || !form.time) { showAlert("Missing Fields", "Please fill in all required fields."); return; }
    if (!form.vet) { showAlert("Missing Fields", "Please select a veterinarian."); return; }
    if (form.purpose === "Imaging" && !form.imagingType) { showAlert("Missing Fields", "Please select an imaging type (X-ray, Ultrasound, or CT-scan)."); return; }
    if (conflictType) { showAlert("Time Slot Unavailable", "This time slot is already booked."); return; }

    if (!editMode) {
      for (const p of extraPets) {
        if (p.mode === 'existing' && !p.existingId) { showAlert("Missing Fields", "Please select an existing pet for each entry, or switch to \"New Pet\"."); return; }
        if (p.mode === 'new' && !p.patient.trim()) { showAlert("Missing Fields", "Please enter a pet name for each new pet."); return; }
        if (!p.date || !p.time) { showAlert("Missing Fields", "Please select a date and time for each pet."); return; }
        if (!p.vet) { showAlert("Missing Fields", "Please select a veterinarian for each pet."); return; }
        if (p.purpose === "Imaging" && !p.imagingType) { showAlert("Missing Fields", "Please select an imaging type for each pet receiving imaging."); return; }
        if (isSlotTakenAppt(p.date, p.time, extraPets.indexOf(p))) { showAlert("Time Slot Unavailable", `The slot on ${p.date} at ${p.time} is already booked.`); return; }
      }
    }

    if (!editMode && !isAdmin && !isEmployee && isMidnightBookingHour()) {
      showAlert(
        "Outside Clinic Hours",
        "It's currently between 12:00 AM and 6:00 AM. Your request will be submitted, but staff will review and approve it once the clinic opens in the morning."
      );
    }

    let conflictQuery = supabase.from("appointments").select("id").eq("date", form.date).eq("time", form.time).in("status", ["Pending", "Confirmed"]);
    if (editMode && selectedAppt?.id) conflictQuery = conflictQuery.neq("id", selectedAppt.id);
    const { data: clashes } = await conflictQuery;
    if (clashes?.length) { showAlert("Time Slot Unavailable", "This slot was just booked by someone else."); await fetchAppts(); return; }

    const finalStatus = editMode ? form.status : (isAdmin ? "Confirmed" : "Pending");
    const payload = {
      patient: form.patient, owner: form.owner, user_id: form.ownerId || null,
      contact: form.contact, vet: form.vet,
      date: form.date, time: form.time, purpose: form.purpose,
      price: form.price === "" ? 0 : Number(form.price),
      species: form.species || null,
      room: form.room || null,
      notes: form.notes, status: finalStatus,
      ...(!editMode && !seeAllBranches && user?.branchId ? { branch_id: user.branchId } : {}),
      ...(!editMode && seeAllBranches && branchFilter ? { branch_id: Number(branchFilter) } : {}),
    };

    if (editMode) {
      const oldRoom = selectedAppt?.room;
      if (oldRoom && oldRoom !== form.room) {
        const oldRoomRow = rooms.find(r => r.number === oldRoom);
        if (oldRoomRow) await supabase.from("rooms").update({ status: "Available", patient: "", diagnosis: "" }).eq("id", oldRoomRow.id);
      }
      if (form.room && form.room !== oldRoom) {
        const newRoomRow = rooms.find(r => r.number === form.room);
        if (newRoomRow) await supabase.from("rooms").update({ status: "Occupied", patient: form.patient, diagnosis: form.purpose }).eq("id", newRoomRow.id);
      }
      const { error } = await supabase.from("appointments").update(payload).eq("id", selectedAppt.id);
      if (error) { showAlert("Error", error.message); return; }
      logActivity(user, 'Updated appointment', `Edited appointment for: ${form.patient}`);
      setShowBook(false);
      showToast('✓ Appointment updated successfully', 'success');
      return;
    }

    const { data: insertedAppt, error } = await supabase.from("appointments").insert([payload]).select().single();
    if (error) { showAlert("Error", error.message); return; }
    logActivity(user, 'Created appointment', `Booked appointment for: ${form.patient}`);
    if (form.patient.trim() && form.owner.trim()) {
      const { data: existing, error: existingErr } = await supabase
        .from("patients")
        .select("id")
        .eq("name", form.patient.trim())
        .eq("owner", form.owner.trim())
        .maybeSingle();
      if (existingErr) console.error('Patient lookup failed:', existingErr.message);
      if (!existing) {
        const { error: patientErr } = await supabase.from("patients").insert([{
          name: form.patient.trim(),
          species: form.species || null,
          owner: form.owner.trim(),
          contact: form.contact || null,
          owner_user_id: form.ownerId || null,
          owner_email: form.ownerEmail || null,
          status: "Outpatient",
          health: "Good",
          branch_id: insertedAppt?.branch_id || user?.branchId || null,
        }]);
        if (patientErr) {
          console.error('Auto patient-record creation failed:', patientErr.message);
          showToast(`⚠ Appointment booked, but patient record wasn't created: ${patientErr.message}`, 'error');
        }
      }
    }

    // Extra pets — same owner, individual date/time/purpose/vet
    for (const p of extraPets) {
      const petName = p.mode === 'existing'
        ? (existingPatients.find(ep => ep.id === p.existingId)?.name || '')
        : p.patient.trim();
      const petSpecies = p.mode === 'existing'
        ? (existingPatients.find(ep => ep.id === p.existingId)?.species || '')
        : p.species;

      const extraPayload = {
        patient: petName, owner: form.owner, user_id: form.ownerId || null,
        contact: form.contact, vet: p.vet,
        date: p.date, time: p.time, purpose: p.purpose,
        price: p.price === "" ? 0 : Number(p.price),
        species: petSpecies || null,
        notes: p.notes, status: finalStatus,
        ...(!seeAllBranches && user?.branchId ? { branch_id: user.branchId } : {}),
        ...(seeAllBranches && branchFilter ? { branch_id: Number(branchFilter) } : {}),
      };
      const { data: insertedExtra, error: extraErr } = await supabase.from("appointments").insert([extraPayload]).select().single();
      if (extraErr) { console.warn('Extra pet appointment failed:', extraErr.message); continue; }

      if (p.mode === 'new' && petName) {
        const { data: existing, error: existingErr } = await supabase
          .from("patients")
          .select("id")
          .eq("name", petName)
          .eq("owner", form.owner.trim())
          .maybeSingle();
        if (existingErr) console.error('Patient lookup failed:', existingErr.message);
        if (!existing) {
          const { error: patientErr } = await supabase.from("patients").insert([{
            name: petName,
            species: petSpecies || null,
            owner: form.owner.trim(),
            contact: form.contact || null,
            owner_user_id: form.ownerId || null,
            owner_email: form.ownerEmail || null,
            status: "Outpatient",
            health: "Good",
            branch_id: insertedExtra?.branch_id || user?.branchId || null,
          }]);
          if (patientErr) {
            console.error('Auto patient-record creation failed (extra pet):', patientErr.message);
            showToast(`⚠ Extra pet appointment booked, but patient record wasn't created: ${patientErr.message}`, 'error');
          }
        }
      }
    }

    setShowBook(false);
    const total = 1 + extraPets.length;
    if (isAdmin || isEmployee) {
      showToast(total > 1 ? `✓ ${total} appointments confirmed successfully` : '✓ Appointment confirmed successfully', 'success');
    } else {
      showToast(total > 1 ? `✓ ${total} requests submitted — awaiting staff approval` : '✓ Request submitted — awaiting staff approval', 'warning');
    }
  };

  const openApproveModal = (appt) => {
    fetchRooms();
    setApproveModal({ show: true, appt, room: '' });
  };

  const approveAppt = async (id, roomNumber = null) => {
    setApproving(true);
    const updatePayload = { status: "Confirmed" };
    if (roomNumber) updatePayload.room = roomNumber;
    const { error } = await supabase.from("appointments").update(updatePayload).eq("id", id);
    if (error) { setApproving(false); showAlert("Error", error.message); return; }

    const appt = appts.find(a => a.id === id);

    // Occupy the assigned room
    if (roomNumber) {
      const roomRow = rooms.find(r => r.number === roomNumber);
      if (roomRow) {
        await supabase.from("rooms").update({ status: "Occupied", patient: appt?.patient || "", diagnosis: appt?.purpose || "" }).eq("id", roomRow.id);
      }
    }

    // Auto-add / update patient record with the room
    if (appt) {
      const { data: existing } = await supabase
        .from("patients")
        .select("id")
        .eq("name", appt.patient)
        .eq("owner", appt.owner)
        .maybeSingle();
      if (!existing) {
        await supabase.from("patients").insert([{
          name: appt.patient,
          species: appt.species || null,
          owner: appt.owner || null,
          contact: appt.contact || null,
          owner_user_id: appt.user_id || null,
          owner_email: appt.owner_email || appt.contact_email || null,
          status: "Outpatient",
          health: "Good",
          room: roomNumber || null,
          branch_id: appt.branch_id || user?.branchId || null,
        }]);
      } else if (roomNumber) {
        await supabase.from("patients").update({ room: roomNumber }).eq("id", existing.id);
      }
    }

    setApproving(false);
    logActivity(user, 'Approved appointment', `Confirmed appointment ID: ${id}${roomNumber ? ` — Room ${roomNumber}` : ''}`);
    showToast(roomNumber ? `✓ Appointment approved & Room ${roomNumber} assigned` : '✓ Appointment approved (no room assigned)', 'success');
  };
  const completeAppt = async (id) => {
    setCompleting(true);
    const { error } = await supabase.from("appointments").update({ status: "Completed" }).eq("id", id);
    setCompleting(false);
    if (error) { showAlert("Error", error.message); return; }
    showToast('✓ Appointment marked as completed', 'info');
  };

  const cancelAppt = (id) => setCancelModal({ show: true, id, reason: "", customReason: "" });

  const confirmCancelAppt = async () => {
    const { id, reason, customReason } = cancelModal;
    if (!reason) { showAlert("Reason Required", "Please select a reason for cancelling this appointment."); return; }
    if (reason === "Other" && !customReason.trim()) { showAlert("Reason Required", "Please describe the reason for cancellation."); return; }
    const finalReason = reason === "Other" ? customReason.trim() : reason;
    const { error } = await supabase.from("appointments").update({ status: "Cancelled", cancel_reason: finalReason }).eq("id", id);
    if (error) { showAlert("Error", error.message); return; }
    logActivity(user, 'Cancelled appointment', `Cancelled appointment ID: ${id} — Reason: ${finalReason}`);
    setCancelModal({ show: false, id: null, reason: "", customReason: "" });
    setShowView(false);
    showToast('Appointment cancelled', 'warning');
  };

  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type, show: true }]);
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, show: false } : t));
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 400);
    }, 3000);
  };

  const deleteAppt = (id) => showConfirm(
    "Delete Appointment", "Permanently delete this appointment?",
    async () => {
      const { error } = await supabase.from("appointments").delete().eq("id", id);
      if (error) { showAlert("Error", error.message); return; }
      logActivity(user, 'Deleted appointment', `Deleted appointment ID: ${id}`);
      setShowView(false);
      showToast('Appointment deleted', 'info');
    },
    "Yes, Delete", "#dc2626"
  );

  const changeMonth = dir => setCalMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + dir, 1));
  const calLabel = calMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const renderCalendar = () => {
    if (loading) return <CalendarSkeleton />;

    const days = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 0).getDate();
    const firstDay = new Date(calMonth.getFullYear(), calMonth.getMonth(), 1).getDay();
    const monthStr = `${calMonth.getFullYear()}-${String(calMonth.getMonth() + 1).padStart(2, "0")}`;
    const cells = [...Array(firstDay).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];

     const apptColor = (a) => {
      if (a.purpose === "Deworming") return { bg: "#7c3aed", pill: "#f3e8ff", text: "#6d28d9" };
      if (a.purpose === "Diagnostics") return { bg: "#dc2626", pill: "#fee2e2", text: "#b91c1c" };
      if (a.status === "Missed") return { bg: "#6b7280", pill: "#f1f5f9", text: "#374151" };
      if (a.status === "Pending") return { bg: "#d97706", pill: "#fef3c7", text: "#92400e" };
      if (a.status === "Confirmed") return { bg: "#1e3a8a", pill: "#dbeafe", text: "#1e40af" };
      if (a.status === "Completed") return { bg: "#0891b2", pill: "#e0f2fe", text: "#0369a1" };
      if (a.status === "Cancelled") return { bg: "#9ca3af", pill: "#f1f5f9", text: "#64748b" };
      return { bg: "#6366f1", pill: "#eff6ff", text: "#4f46e5" };
    };

    const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    return (
      <div>
        {/* Day headers */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3, marginBottom: 3 }}>
          {DAY_LABELS.map((d, i) => (
            <div key={d} style={{
              textAlign: "center", fontWeight: 800, fontSize: 10,
              color: i === 0 ? "#ef4444" : i === 6 ? "#3b82f6" : "#94a3b8",
              padding: "8px 0", textTransform: "uppercase", letterSpacing: "0.4px",
            }}>{d.slice(0, 2)}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3 }}>
          {cells.map((day, i) => {
            if (!day) return (
              <div key={i} style={{ minHeight: 100, borderRadius: 10, background: "#fafafa", border: "1px solid #f1f5f9" }} />
            );

            const dateStr = `${monthStr}-${String(day).padStart(2, "0")}`;
            const dayAppts = appts.filter(a => {
              if (a.date !== dateStr) return false;
              if (!search) return true;
              const q = search.toLowerCase();
              return `${a.patient} ${a.owner} ${a.vet}`.toLowerCase().includes(q);
            });
            const isToday = dateStr === today;
            const isSun = i % 7 === 0;
            const isSat = i % 7 === 6;
            const hasAppts = dayAppts.length > 0;
            const dayNum = new Date(dateStr).getDay();

            return (
              <div key={i} style={{
                minHeight: 70,
                border: isToday ? "2px solid #3b82f6" : "1px solid #e8edf4",
                borderRadius: 8,
                background: isToday ? "#eff6ff" : isSun || isSat ? "#fafbff" : "#fff",
                position: "relative",
                transition: "box-shadow 0.15s, transform 0.15s",
                overflow: "hidden",
              }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 4px 16px rgba(30,58,138,0.10)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "translateY(0)"; }}
              >
                {/* Top accent line for today */}
                {isToday && (
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg,#1e3a8a,#3b82f6)", borderRadius: "10px 10px 0 0" }} />
                )}

                <div style={{ padding: "5px 5px 4px" }}>
                  {/* Day number */}
                  <div style={{ marginBottom: 5, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{
                      width: isToday ? 26 : 22, height: isToday ? 26 : 22,
                      borderRadius: "50%", display: "inline-flex",
                      alignItems: "center", justifyContent: "center",
                      fontSize: isToday ? 13 : 12,
                      fontWeight: isToday ? 900 : isSun || isSat ? 700 : 600,
                      color: isToday ? "#fff" : isSun ? "#ef4444" : isSat ? "#3b82f6" : "var(--text)",
                      background: isToday ? "linear-gradient(135deg,#1e3a8a,#3b82f6)" : "transparent",
                      boxShadow: isToday ? "0 2px 8px rgba(30,58,138,0.35)" : "none",
                      flexShrink: 0,
                    }}>{day}</span>
                    {hasAppts && (
                      <span style={{
                        fontSize: 9, fontWeight: 800, color: "#fff",
                        background: dayAppts.length > 2 ? "#dc2626" : "#1e3a8a",
                        borderRadius: 99, padding: "1px 5px", lineHeight: 1.6,
                      }}>{dayAppts.length}</span>
                    )}
                  </div>

                  {/* Appointment pills */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {dayAppts.slice(0, 2).map(a => {
                      const c = apptColor(a);
                      return (
                        <div key={a.id}
                          onClick={() => { setSelectedAppt(a); setShowView(true); }}
                          style={{
                            fontSize: 9, padding: "2px 4px", borderRadius: 5,
                            cursor: "pointer", overflow: "hidden",
                            textOverflow: "ellipsis", whiteSpace: "nowrap",
                            background: c.bg,
                            color: "#fff",
                            fontWeight: 700,
                            letterSpacing: "0.1px",
                            boxShadow: `0 1px 3px ${c.bg}66`,
                            display: "flex", alignItems: "center", gap: 4,
                            transition: "filter 0.12s, transform 0.12s",
                          }}
                          onMouseEnter={e => { e.currentTarget.style.filter = "brightness(0.88)"; e.currentTarget.style.transform = "scale(1.02)"; }}
                          onMouseLeave={e => { e.currentTarget.style.filter = "none"; e.currentTarget.style.transform = "scale(1)"; }}
                        >
                          <span style={{ fontSize: 9, opacity: 0.85, flexShrink: 0 }}>{a.time?.replace(" AM", "a").replace(" PM", "p")}</span>
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{a.patient}</span>
                        </div>
                      );
                    })}
                    {dayAppts.length > 2 && (
                      <div style={{
                        fontSize: 10, fontWeight: 700, color: "#1e40af",
                        background: "#dbeafe", borderRadius: 6,
                        padding: "2px 6px", textAlign: "center",
                        cursor: "pointer",
                      }}
                        onClick={() => { setSelectedAppt(dayAppts[2]); setShowView(true); }}
                      >
                        +{dayAppts.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  /* ── Full-page user loading state ── */
  if (userLoading) return (
    <Layout>
      <div className="topbar">
        <div className="topbar-title">
          <Skel w={32} h={32} style={{ borderRadius: 8, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <Skel w={160} h={20} style={{ marginBottom: 6 }} />
            <Skel w={220} h={13} />
          </div>
        </div>
      </div>
      <div className="content appt-content">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(195px,1fr))', gap: 14, marginBottom: 24 }}>
          {[1, 2, 3, 4].map(i => <StatCardSkeleton key={i} />)}
        </div>
        <div style={{ background: "#fff", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", boxShadow: "var(--shadow)", overflow: "hidden" }}>
          <div style={{ padding: "16px 22px", borderBottom: "1px solid var(--border)" }}>
            <Skel w={160} h={18} />
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
             <tr>{["Patient", "Owner", "Veterinarian", "Date & Time", "Room", "Purpose", "Price", "Status", "Actions"].map(h => (
                <th key={h} className="appt-th">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map(i => <TableRowSkeleton key={i} cols={9} />)}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );

  return (
    <Layout>
      <AppModal {...modal} />
      {approveModal.show && approveModal.appt && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000, padding: 16 }}>
          <div style={{ background: "var(--card)", borderRadius: 14, width: "100%", maxWidth: 420, boxShadow: "0 24px 64px rgba(0,0,0,0.28)", overflow: "hidden" }}>
            <div style={{ background: "linear-gradient(135deg,#14532d,#16a34a)", padding: "16px 20px" }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#fff" }}>Approve Appointment</h3>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "rgba(255,255,255,0.8)" }}>
                {approveModal.appt.patient} — {approveModal.appt.date} at {approveModal.appt.time}
              </p>
            </div>
            <div style={{ padding: "18px 20px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>
                Assign Room (optional)
              </div>
              <CustomSelect
                value={approveModal.room}
                onChange={val => setApproveModal(m => ({ ...m, room: val }))}
                placeholder="No room assigned"
                accent="#16a34a"
                options={rooms.filter(r => r.status === "Available").map(r => ({ value: r.number, label: `${r.number}${r.type ? ` · ${r.type}` : ""}` }))}
              />
              <div style={{ marginTop: 6, fontSize: 11, color: "var(--muted)" }}>
                {rooms.filter(r => r.status === "Available").length} room(s) available. Customers can't pick a room when booking — assign one now if needed.
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "14px 20px", borderTop: "1px solid var(--border)" }}>
              <button className="btn btn-ghost" style={S.btn} onClick={() => setApproveModal({ show: false, appt: null, room: '' })}>Cancel</button>
              <button className="btn" style={{ ...S.btn, background: "#16a34a", color: "#fff", border: "none" }} disabled={approving}
                onClick={async () => {
                  const id = approveModal.appt.id;
                  const room = approveModal.room;
                  setApproveModal({ show: false, appt: null, room: '' });
                  await approveAppt(id, room || null);
                }}>
                {approving ? "Approving…" : "Approve & Lock"}
              </button>
            </div>
          </div>
        </div>
      )}
      {cancelModal.show && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000, padding: 16 }}>
          <div style={{ background: "var(--card)", borderRadius: 14, width: "100%", maxWidth: 440, boxShadow: "0 24px 64px rgba(0,0,0,0.28)", overflow: "hidden" }}>
            <div style={{ background: "linear-gradient(135deg,#7f1d1d,#dc2626)", padding: "16px 20px" }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#fff" }}>Cancel Appointment</h3>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "rgba(255,255,255,0.85)" }}>Please tell us why this appointment is being cancelled.</p>
            </div>
            <div style={{ padding: "18px 20px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>
                Reason <span style={{ color: "#ef4444" }}>*</span>
              </div>
              <CustomSelect
                value={cancelModal.reason}
                onChange={val => setCancelModal(m => ({ ...m, reason: val }))}
                placeholder="— Select reason —"
                accent="#dc2626"
                options={CANCEL_REASONS}
              />
              {cancelModal.reason === "Other" && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>
                    Please specify <span style={{ color: "#ef4444" }}>*</span>
                  </div>
                  <textarea
                    value={cancelModal.customReason}
                    onChange={e => setCancelModal(m => ({ ...m, customReason: e.target.value }))}
                    placeholder="Describe the reason for cancellation..."
                    style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 8, background: "transparent", fontSize: 13, color: "var(--text)", outline: "none", resize: "vertical", minHeight: 70, fontFamily: "inherit", lineHeight: 1.6, boxSizing: "border-box", padding: "8px 10px" }}
                  />
                </div>
              )}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "14px 20px", borderTop: "1px solid var(--border)" }}>
              <button className="btn btn-ghost" style={S.btn} onClick={() => setCancelModal({ show: false, id: null, reason: "", customReason: "" })}>Back</button>
              <button className="btn" style={{ ...S.btn, background: "#dc2626", color: "#fff", border: "none" }} onClick={confirmCancelAppt}>Confirm Cancellation</button>
            </div>
          </div>
        </div>
      )}
        {showReviews && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000, padding: 16 }}>
          <div style={{ background: "var(--card)", borderRadius: 14, width: "100%", maxWidth: 560, maxHeight: "80vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 64px rgba(0,0,0,0.28)", overflow: "hidden" }}>
            <div style={{ background: "linear-gradient(135deg,#78350f,#d97706)", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#fff" }}>Customer Reviews</h3>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "rgba(255,255,255,0.85)" }}>{reviews.length} review{reviews.length !== 1 ? "s" : ""}</p>
              </div>
              <button onClick={() => setShowReviews(false)} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8, width: 30, height: 30, cursor: "pointer", color: "#fff" }}>✕</button>
            </div>
            <div style={{ overflowY: "auto", flex: 1, padding: "14px 20px" }}>
              {loadingReviews ? (
                <p style={{ textAlign: "center", color: "var(--muted)", padding: 20 }}>Loading reviews…</p>
              ) : reviews.length === 0 ? (
                <p style={{ textAlign: "center", color: "var(--muted)", padding: 20 }}>No reviews yet.</p>
              ) : reviews.map(r => (
                <div key={r.id} style={{ borderBottom: "1px solid var(--border)", padding: "12px 0" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{r.patient}{r.owner ? ` · ${r.owner}` : ""}</span>
                    <span style={{ fontSize: 11, color: "var(--muted)" }}>{new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                  <div style={{ display: "flex", gap: 2, marginBottom: 6 }}>
                    {[1, 2, 3, 4, 5].map(s => (
                      <svg key={s} width="14" height="14" viewBox="0 0 24 24" fill={s <= r.rating ? "#f59e0b" : "none"} stroke={s <= r.rating ? "#f59e0b" : "#cbd5e1"} strokeWidth="1.5">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    ))}
                  </div>
                  {r.comment && <p style={{ margin: 0, fontSize: 13, color: "var(--text)", lineHeight: 1.5 }}>{r.comment}</p>}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", padding: "12px 20px", borderTop: "1px solid var(--border)" }}>
              <button className="btn btn-ghost" style={S.btn} onClick={() => setShowReviews(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      <div className="toast-stack" style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 999999, display: 'flex', flexDirection: 'column-reverse', gap: 10, pointerEvents: 'none' }}>
        {toasts.slice(-3).map(t => (
          <LiveToast key={t.id} message={t.message} show={t.show} type={t.type} />
        ))}
      </div>

      {/* ── TOPBAR ── */}
      <div className="topbar appt-topbar" style={{ position: "fixed", top: 68, left: "var(--current-sidebar-w, 62px)", right: 0, zIndex: 40, background: "#fff", flexWrap: "wrap" }}>
        <div className="topbar-title">
          <img src="/icon/appointment.png" alt="" />
          <div>
            <h1>Appointments</h1>
            <p>
              {isAdmin ? "Manage & approve appointments — All Branches" : isCustomer ? "Your appointments" : "Manage & approve appointments"}
            </p>
          </div>
        </div>
        <div className="topbar-actions">
          {seeAllBranches && branches.length > 0 && (
            <div style={{ width: 180 }}>
              <CustomSelect
                value={branchFilter}
                onChange={val => setBranchFilter(val)}
                placeholder="All Branches"
                accent="#7c3aed"
                options={branches.map(b => ({ value: b.id, label: b.name }))}
              />
            </div>
          )}
          {isAdmin && (
            <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 6, background: "#dbeafe", color: "#1e3a8a", border: "1px solid #bfdbfe", display: "inline-flex", alignItems: "center", gap: 5 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
              Admin Mode
            </span>
          )}
          {isCustomer && (
            <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 6, background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a", display: "inline-flex", alignItems: "center", gap: 5 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
              Requires staff approval
            </span>
          )}
            <div style={{ display: "flex", border: "1.5px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
            {["list", "calendar"].map(v => (
              <button key={v} onClick={() => setView(v)} style={{ padding: "7px 18px", border: "none", background: view === v ? "var(--royal)" : "#fff", color: view === v ? "#fff" : "var(--muted)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", textTransform: "capitalize" }}>
                {v === "list" ? "List" : "Calendar"}
              </button>
            ))}
          </div>
          <button className="appt-reviews-btn" onClick={openReviews} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 16px", borderRadius: 8, border: "1.5px solid #fde68a", background: "#fffbeb", color: "#92400e", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
            Reviews
          </button>
          <div className="fab-wrap" style={{ position: "fixed", bottom: 28, right: 28, zIndex: 999, display: "flex", alignItems: "center", gap: 10 }}
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
                <span style={{ fontSize: 12, fontWeight: 800, color: '#fff' }}>
                  {isCustomer ? 'Book Appointment' : 'New Appointment'}
                </span>
                <span style={{ fontSize: 10, fontWeight: 500, color: 'rgba(255,255,255,0.55)' }}>
                  {isCustomer ? 'Request a visit' : 'Schedule a visit'}
                </span>
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
            <button onClick={openBook} className="fab-btn" style={{ width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg,#1e3a8a,#3b82f6)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 20px rgba(30,58,138,0.4)", transition: "transform 0.2s, box-shadow 0.2s", flexShrink: 0 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ── PAGE CONTENT ── */}
      <div className="content appt-content">
        {isAdmin && counts.pending > 0 && (
          <div style={{ background: "#fffbeb", border: "1.5px solid #fde68a", borderRadius: 10, padding: "12px 20px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(217,119,6,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "#92400e" }}>{counts.pending} Appointment{counts.pending > 1 ? "s" : ""} Awaiting Approval</p>
                <p style={{ margin: 0, fontSize: 12, color: "#b45309" }}>Once approved, appointments are locked from further edits.</p>
              </div>
            </div>
            <button className="btn" style={{ ...S.btn, background: "#d97706", color: "#fff", border: "none", fontSize: 13, whiteSpace: "nowrap" }} onClick={() => { setFilterStatus("Pending"); setView("list"); }}>View Pending</button>
          </div>
        )}

        {/* ── Stat Cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(195px,1fr))', gap: 14, marginBottom: 24 }}>
          {loading
            ? [1, 2, 3, 4].map(i => <StatCardSkeleton key={i} />)
            : [
              { label: "Today's Appointments", value: counts.today, icon: "/icon/calendar.png", color: "blue", filter: "", sub: "Scheduled today" },
              { label: "Pending Approval", value: counts.pending, icon: "/icon/pending.png", color: "yellow", filter: "Pending", sub: counts.pending > 0 ? "Needs attention" : "All cleared", subColor: counts.pending > 0 ? "#d97706" : undefined },
              { label: "Confirmed", value: counts.confirmed, icon: "/icon/confirm.png", color: "green", filter: "Confirmed", sub: "Approved & locked" },
              { label: "Cancelled", value: counts.cancelled, icon: "/icon/cancel.png", color: "red", filter: "Cancelled", sub: "Cancelled visits" },
            ].map((sc, i) => (
              <div key={i} className={`stat-card-v2 ${sc.color} fade-in`} style={{ cursor: 'pointer', animationDelay: `${i * 0.1}s` }}
                onClick={() => { setFilterStatus(sc.filter); setView("list"); }}>
                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                  <div className={`stat-icon-v2 ${sc.color}`}>
                    <img src={sc.icon} alt="" style={{ width: 24, height: 24 }} />
                  </div>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{sc.label}</p>
                  <h3 style={{ margin: '4px 0 6px', fontSize: 26, fontWeight: 800, lineHeight: 1 }}>{sc.value}</h3>
                  <span style={{ fontSize: 11, fontWeight: 600, color: sc.subColor || 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    {sc.color === 'yellow' && sc.value > 0 && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>}
                    {sc.sub}
                  </span>
                </div>
              </div>
            ))
          }
        </div>

        {view === "list" && (
          <>
            <div className="appt-card" style={{ padding: "14px 22px", marginBottom: 16 }}>
              <div className="fade-in" style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--bg)", border: "1.5px solid var(--border)", borderRadius: 8, padding: "8px 14px", flex: "1 1 200px", minWidth: 180 }}>
                  <img src="/icon/search.png" alt="" style={{ width: 16, height: 16, filter: "brightness(0) saturate(100%) invert(40%)" }} />
                  <input type="text" placeholder="Search patient, vet, owner..." value={search} onChange={e => setSearch(e.target.value)} style={{ border: "none", background: "transparent", fontSize: 13, color: "var(--text)", outline: "none", fontFamily: "inherit", width: "100%" }} />
                </div>
                <div style={{ flex: "1 1 160px", minWidth: 150 }}>
                  <DatePicker value={filterDate} onChange={setFilterDate} placeholder="Filter by date" />
                </div>
                <div style={{ flex: "1 1 130px", minWidth: 130, maxWidth: 220 }}>
                  <CustomSelect
                    value={filterStatus}
                    onChange={val => setFilterStatus(val)}
                    placeholder="All Status"
                    options={["Confirmed", "Pending", "Missed", "Cancelled", "Completed"]}
                  />
                </div>
                <div style={{ flex: "1 1 130px", minWidth: 130, maxWidth: 220 }}>
                  <CustomSelect
                    value={
                      !sortField ? "" :
                        sortField === "created_at" && sortDir === "desc" ? "newest" :
                          sortField === "created_at" && sortDir === "asc" ? "oldest" :
                            sortField === "patient" && sortDir === "asc" ? "az" : ""
                    }
                    onChange={val => {
                      if (val === "newest") { setSortField("created_at"); setSortDir("desc"); }
                      else if (val === "oldest") { setSortField("created_at"); setSortDir("asc"); }
                      else if (val === "az") { setSortField("patient"); setSortDir("asc"); }
                      else { setSortField(null); }
                    }}
                    placeholder="Sort by…"
                    accent="#6366f1"
                    options={[
                      { value: "newest", label: "Newest" },
                      { value: "oldest", label: "Oldest" },
                      { value: "az", label: "A-Z" },
                    ]}
                  />
                </div>
                {filterStatus && (
                  <button onClick={() => setFilterStatus("")} className="appt-input" style={{ padding: "9px 14px", cursor: "pointer", whiteSpace: "nowrap", color: "var(--muted)", fontSize: 12 }}>✕ Clear</button>
                )}
              </div>
            </div>

            <div className="appt-card">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 22px", borderBottom: "1px solid var(--border)" }}>
                <h2 style={{ fontSize: 15, fontWeight: 700 }}>Appointments</h2>
                {loading
                  ? <Skel w={80} h={13} />
                  : <span style={{ color: "var(--muted)", fontSize: 13 }}>{sortedFiltered.length} records</span>
                }
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 780 }}>
                  <thead>
                   <tr>{["Patient", "Owner", "Veterinarian", "Date & Time", "Room", "Purpose", "Price", "Status", "Actions"].map(h => <th key={h} className="appt-th">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      [1, 2, 3, 4, 5, 6].map(i => <TableRowSkeleton key={i} cols={9} />)
                    ) : paginated.length === 0 ? (
                      <tr><td colSpan={9} style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>No appointments found</td></tr>
                    ) : paginated.map((a, idx) => {
                      const statusDotColor = { Confirmed: "#16a34a", Pending: "#d97706", Cancelled: "#dc2626", Completed: "#2563eb" }[a.status] || "#9ca3af";
                      const ownerInitials = (a.owner || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
                      const purposeStyle = {
                        Consultation: { bg: "#f8fafc", color: "#475569", icon: <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.3.3 0 1 0 .3.3" /><path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4" /><circle cx="20" cy="10" r="2" /></svg> },
                        Vaccination: { bg: "#f0fdf4", color: "#15803d", icon: <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 2l4 4-10 10H8v-4L18 2z" /><path d="M8 16L4 20" /><path d="M14 8l2 2" /></svg> },
                        Deworming: { bg: "#f3e8ff", color: "#6d28d9", icon: <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><line x1="20" y1="4" x2="8.12" y2="15.88" /><line x1="14.47" y1="14.48" x2="20" y2="20" /><line x1="8.12" y1="8.12" x2="12" y2="12" /></svg> },
                        Imaging: { bg: "#eff6ff", color: "#1d4ed8", icon: <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-5-5L5 21" /></svg> },
                        Diagnostics: { bg: "#fee2e2", color: "#dc2626", icon: <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg> },
                      }[a.purpose] || { bg: "#f8fafc", color: "#475569", icon: null };
                      return (
                        <tr key={a.id} className="fade-in" style={{ cursor: "pointer", background: !canEdit(a) ? "var(--bg)" : "var(--card)", animationDelay: `${idx * 0.06}s` }}
                          onClick={() => { setSelectedAppt(a); setShowView(true); }}>
                          {/* Patient */}
                          <td className="appt-td">
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, background: a.species === "Cat" ? "#f0fdf4" : "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                {a.species === "Cat"
                                  ? <svg width="16" height="16" viewBox="0 0 16 16" fill="#16a34a" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" clipRule="evenodd" d="M1 7L4.80061 1.43926C5.56059 0.527292 6.68638 0 7.8735 0H8V4L12 5L15 10L14.1875 11.2188C13.4456 12.3316 12.1967 13 10.8593 13H9L7 16H5L1 7ZM10 9C10.5523 9 11 8.55229 11 8C11 7.44772 10.5523 7 10 7C9.44771 7 9 7.44772 9 8C9 8.55229 9.44771 9 10 9Z" /><path d="M10 0.465878V2.43845L12 2.93845V0H11.8735C11.2125 0 10.5704 0.163501 10 0.465878Z" /></svg>
                                  : <svg width="16" height="16" viewBox="0 0 16 16" fill="#1d4ed8" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" clipRule="evenodd" d="M16 4V7C16 9.20914 14.2091 11 12 11H10V15H0V13L0.931622 10.8706C1.25226 10.9549 1.59036 11 1.94124 11C3.74931 11 5.32536 9.76947 5.76388 8.01538L3.82359 7.53031C3.60766 8.39406 2.83158 9.00001 1.94124 9.00001C1.87789 9.00001 1.81539 8.99702 1.75385 8.99119C1.02587 8.92223 0.432187 8.45551 0.160283 7.83121C0.0791432 7.64491 0.0266588 7.44457 0.00781272 7.23658C-0.0112323 7.02639 0.00407892 6.80838 0.0588889 6.58914C0.0588882 6.58914 0.0588896 6.58913 0.0588889 6.58914L0.698705 4.02986C1.14387 2.24919 2.7438 1 4.57928 1H10L12 4H16ZM9 6C9.55229 6 10 5.55228 10 5C10 4.44772 9.55229 4 9 4C8.44771 4 8 4.44772 8 5C8 5.55228 8.44771 6 9 6Z" /></svg>
                                }
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, fontSize: 13 }}>{a.patient}</div>
                                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}>{a.purpose}</div>
                              </div>
                            </div>
                          </td>
                          {/* Owner */}
                          <td className="appt-td">
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, background: "var(--bg)", border: "1.5px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "var(--muted)" }}>
                                {ownerInitials}
                              </div>
                              <div>
                                <div style={{ fontSize: 13 }}>{a.owner || "—"}</div>
                                {a.contact && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}>{a.contact}</div>}
                              </div>
                            </div>
                          </td>
                          {/* Vet */}
                          <td className="appt-td">
                            <span style={{ fontSize: 13, display: "inline-flex", alignItems: "center", gap: 5 }}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
                              {a.vet || "—"}
                            </span>
                          </td>
                          {/* Date & Time */}
                          <td className="appt-td">
                            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "4px 10px" }}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                              <div>
                                <div style={{ fontWeight: 600, fontSize: 12, color: "#1e40af" }}>{a.date}</div>
                                <div style={{ fontSize: 11, color: "#3b82f6" }}>{a.time}</div>
                              </div>
                            </div>
                          </td>
                          {/* Room */}
                          <td className="appt-td">
                            {a.room
                              ? <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1e40af", borderRadius: 6, padding: "3px 9px", fontSize: 12, fontWeight: 600 }}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg> {a.room}</span>
                              : <span style={{ fontSize: 12, color: "var(--muted)", fontStyle: "italic" }}>Unassigned</span>}
                          </td>
                          {/* Purpose */}
                          <td className="appt-td">
                            <span style={{ fontSize: 11, padding: "3px 9px", borderRadius: 6, fontWeight: 600, background: purposeStyle.bg, color: purposeStyle.color, display: "inline-flex", alignItems: "center", gap: 4 }}>
                              {purposeStyle.icon}{a.purpose}
                            </span>
                          </td>
                          {/* Price */}
                          <td className="appt-td">
                            <span style={{ fontSize: 12, fontWeight: 700, color: "#16a34a" }}>
                              {a.price ? `₱${Number(a.price).toLocaleString()}` : "—"}
                            </span>
                          </td>
                          {/* Status */}
                          <td className="appt-td">
                            <span className={`badge ${STATUS_BADGE[a.status] || "badge-gray"}`} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                              <span style={{ width: 6, height: 6, borderRadius: "50%", background: statusDotColor, flexShrink: 0, display: "inline-block" }} />
                              {a.status}
                            </span>
                          </td>
                          {/* Actions */}
                          <td className="appt-td" style={{ textAlign: "left", padding: "8px 14px" }} onClick={e => e.stopPropagation()}>
                            <div style={{ display: "flex", gap: 6, justifyContent: "flex-start", alignItems: "center" }}>
                              {/* View */}
                              <button title="View" className="btn btn-sm" style={{ ...S.btn, height: 28, padding: "0 10px", gap: 5, display: "inline-flex", alignItems: "center", justifyContent: "center", background: "#eff6ff", border: "1.5px solid #bfdbfe", color: "#1d4ed8", borderRadius: 20, fontSize: 11, fontWeight: 600 }}
                                onClick={() => { setSelectedAppt(a); setShowView(true); }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                View
                              </button>
                              {/* Approve */}
                              {a.status === "Pending" && !isPastDue(a) && (isAdmin || isEmployee) && (
                                <button title="Approve" className="btn btn-sm" style={{ ...S.btn, height: 28, padding: "0 10px", gap: 5, display: "inline-flex", alignItems: "center", justifyContent: "center", background: "#f0fdf4", border: "1.5px solid #86efac", color: "#16a34a", borderRadius: 20, fontSize: 11, fontWeight: 600 }}
                                  onClick={() => openApproveModal(a)}>
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                                  Approve
                                </button>
                              )}
                              {/* Edit */}
                              {canEdit(a) && (
                                <button title="Edit" className="btn btn-sm" style={{ ...S.btn, height: 28, padding: "0 10px", gap: 5, display: "inline-flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", border: "1.5px solid #e2e8f0", color: "#475569", borderRadius: 20, fontSize: 11, fontWeight: 600 }}
                                  onClick={() => openEdit(a)}>
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                  Edit
                                </button>
                              )}
                              {/* Mark Complete */}
                              {a.status === "Confirmed" && (isAdmin || isEmployee) && (
                                <button title="Mark Complete" className="btn btn-sm" style={{ ...S.btn, height: 28, padding: "0 10px", gap: 5, display: "inline-flex", alignItems: "center", justifyContent: "center", background: "#eff6ff", border: "1.5px solid #93c5fd", color: "#1e3a8a", borderRadius: 20, fontSize: 11, fontWeight: 600 }}
                                  onClick={() => showConfirm("Mark Complete", `Mark ${a.patient}'s appointment as completed?`, () => completeAppt(a.id), "Mark Complete", "#1e3a8a")}>
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                                  Done
                                </button>
                              )}
                             {/* Cancel */}
                              {(a.status === "Pending" || a.status === "Confirmed") && !isPastDue(a) && (
                                <button title="Cancel" className="btn btn-sm" style={{ ...S.btn, height: 28, padding: "0 10px", gap: 5, display: "inline-flex", alignItems: "center", justifyContent: "center", background: "#fef2f2", border: "1.5px solid #fca5a5", color: "#dc2626", borderRadius: 20, fontSize: 11, fontWeight: 600 }}
                                  onClick={() => cancelAppt(a.id)}>
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                  Cancel
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            {totalPages > 1 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, padding: "14px 18px", borderTop: "1px solid var(--border)" }}>
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
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
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
                  style={{ padding: "6px 14px", borderRadius: 20, border: "1.5px solid var(--border)", background: "transparent", fontSize: 13, fontWeight: 600, color: safePage === totalPages ? "var(--muted)" : "var(--text)", cursor: safePage === totalPages ? "default" : "pointer", fontFamily: "inherit" }}>
                  next
                </button>
              </div>
            )}
          </>
        )}

        {view === "calendar" && (
          <div className="appt-card">
            {/* Dark gradient month nav — matches date-picker popup header */}
            <div style={{ background: "linear-gradient(135deg,#0f172a,#1e3a8a)", padding: "14px 16px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <button onClick={() => changeMonth(-1)}
                style={{ width: 28, height: 28, borderRadius: 8, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.1)", cursor: "pointer", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.18)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
              </button>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", lineHeight: 1.2 }}>{calMonth.toLocaleDateString("en-US", { month: "long" })}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>{calMonth.getFullYear()}</div>
              </div>
              <button onClick={() => changeMonth(1)}
                style={{ width: 28, height: 28, borderRadius: 8, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.1)", cursor: "pointer", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.18)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
              </button>
            </div>

            {/* Search + Today — footer-style row like the popup */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderBottom: "1px solid var(--border)", background: "var(--bg)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--card)", border: "1.5px solid var(--border)", borderRadius: 8, padding: "8px 14px", flex: 1 }}>
                <img src="/icon/search.png" alt="" style={{ width: 16, height: 16, filter: "brightness(0) saturate(100%) invert(40%)" }} />
                <input type="text" placeholder="Search patient or owner..." value={search} onChange={e => setSearch(e.target.value)}
                  style={{ border: "none", background: "transparent", fontSize: 13, color: "var(--text)", outline: "none", fontFamily: "inherit", width: "100%" }} />
                {search && (
                  <button onClick={() => setSearch("")}
                    style={{ background: "#f1f5f9", border: "none", cursor: "pointer", color: "#64748b", width: 18, height: 18, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                    ✕
                  </button>
                )}
              </div>
              <button onClick={() => setCalMonth(new Date())}
                style={{ fontSize: 12, fontWeight: 700, color: "#1e40af", background: "#eff6ff", border: "1px solid #bfdbfe", cursor: "pointer", fontFamily: "inherit", padding: "8px 14px", borderRadius: 8, whiteSpace: "nowrap", flexShrink: 0, transition: "background 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.background = "#dbeafe"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "#eff6ff"; }}>
                Today
              </button>
            </div>
            {/* Legend */}
            <div style={{ display: "flex", gap: 8, padding: "10px 14px", borderBottom: "1px solid var(--border)", flexWrap: "wrap", alignItems: "center", background: "var(--bg)", overflowx: "auto" }}>
              {[
                { color: "#1e3a8a", bg: "#dbeafe", label: "Confirmed" },
                { color: "#d97706", bg: "#fef3c7", label: "Pending" },
                { color: "#7c3aed", bg: "#f3e8ff", label: "Deworming" },
                { color: "#dc2626", bg: "#fee2e2", label: "Diagnostics" },
              ].map(({ color, bg, label }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 5, background: bg, border: `1px solid ${color}33`, borderRadius: 20, padding: "3px 10px" }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, display: "inline-block", flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: color, fontWeight: 700 }}>{label}</span>
                </div>
              ))}
              {search && (
                <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--royal)", fontWeight: 700, background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 20, padding: "3px 10px" }}>
                  🔍 "{search}"
                </span>
              )}
            </div>
            <div style={{ padding: "8px 8px 16px", overflowX: "auto" }}>
              <div style={{ minWidth: 320 }}>
                {renderCalendar()}
              </div>
            </div>
          </div>
        )}

        {/* ══ BOOK / EDIT MODAL ══ */}
        {showBook && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "12px", overflowY: "auto", boxSizing: "border-box" }}>
            <div style={{ background: "var(--card)", borderRadius: 14, width: "100%", maxWidth: 620, maxHeight: "calc(100vh - 24px)", display: "flex", flexDirection: "column", boxShadow: "0 24px 64px rgba(0,0,0,0.28)", overflow: "hidden", margin: "auto", boxSizing: "border-box" }}>

              {/* ── Clipboard top bar ── */}
              <div style={{ background: "linear-gradient(135deg, #0f172a, #1e3a8a)", padding: "10px 24px", display: "flex", alignItems: "center", justifyContent: "flex-end", borderRadius: "14px 14px 0 0", flexShrink: 0 }}>
                <button onClick={() => setShowBook(false)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "rgba(255,255,255,0.75)", lineHeight: 1, padding: "2px 6px" }}>✕</button>
              </div>

              {/* ── Record header ── */}
              <div style={{ background: "var(--bg)", borderBottom: "2px solid var(--border)", padding: "14px 24px 12px", textAlign: "center", flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 4 }}>
                  <img src="/icon/appointment.png" alt="" style={{ width: 22, height: 22, objectFit: "contain" }} onError={e => { e.target.style.display = "none"; }} />
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "var(--text)", letterSpacing: "0.3px" }}>
                    {editMode ? "Edit Appointment" : "Appointment Record"}
                  </h3>
                </div>
                <p style={{ margin: 0, fontSize: 11, color: "var(--muted)" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                    {isAdmin
                      ? <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>Admin booking — confirmed immediately</>
                      : isCustomer
                        ? <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>Request will be reviewed by staff</>
                        : "New bookings start as Pending until approved"}
                  </span>
                </p>
              </div>

              {/* ── Modal body: section-divided form ── */}
              <div style={{ overflowY: "auto", flex: 1 }}>

                {/* Step 1: Service picker (new bookings only) */}
                {!editMode && bookStep === "service" && (
                  <div style={{ padding: "18px 16px" }}>
                    <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.6px" }}>
                      Select a Service
                    </p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
                      {SERVICE_OPTIONS.map(opt => {
                        const meta = SERVICE_META[opt] || { icon: <svg viewBox="0 0 24 24" fill="#475569" style={{ width: 16, height: 16 }}><path d="M8.5 12c1.4 0 2.5-1.6 2.5-3.5S9.9 5 8.5 5 6 6.6 6 8.5 7.1 12 8.5 12zm7 0c1.4 0 2.5-1.6 2.5-3.5S16.9 5 15.5 5 13 6.6 13 8.5s1.1 3.5 2.5 3.5zM4.5 15c1.1 0 2-1.3 2-2.8s-.9-2.8-2-2.8-2 1.3-2 2.8.9 2.8 2 2.8zm15 0c1.1 0 2-1.3 2-2.8s-.9-2.8-2-2.8-2 1.3-2 2.8.9 2.8 2 2.8zM12 13.5c-2.3 0-5.5 3-5.5 5.5 0 1.1.9 1.5 2 1.5 1.2 0 2.3-.8 3.5-.8s2.3.8 3.5.8c1.1 0 2-.4 2-1.5 0-2.5-3.2-5.5-5.5-5.5z" /></svg>, color: "#475569", bg: "#f8fafc" };
                        const branchForLookup = seeAllBranches ? (branchFilter || user?.branchId) : user?.branchId;
                        const price = opt === "Imaging"
                          ? null
                          : getServicePrice(opt, branchForLookup);
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => selectService(opt)}
                            style={{
                              display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                              padding: "16px 10px", borderRadius: 12, cursor: "pointer",
                              border: `1.5px solid ${meta.color}33`, background: meta.bg,
                              fontFamily: "inherit", transition: "transform 0.12s, box-shadow 0.12s",
                            }}
                            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 6px 16px ${meta.color}22`; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
                          >
                            <span style={{ display: 'inline-flex' }}>{meta.icon}</span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: meta.color }}>{opt}</span>
                            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>
                            {opt === "Imaging" ? "Choose type next" : (price != null ? `₱${Number(price).toLocaleString()}` : "Contact clinic")}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Section: Owner / Contact — moved before pet selection so "Existing Pet" has an owner to look up */}
                {(editMode || bookStep !== "service") && (
                <div style={{ borderBottom: "1.5px solid #e2e8f0" }}>
                  <div style={{ background: "#f1f5f9", borderBottom: "1px solid #e2e8f0", padding: "6px 16px" }}>
                    <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px", color: "#64748b", display: "inline-flex", alignItems: "center", gap: 5 }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                      Owner / Contact
                    </span>
                  </div>

                  {/* Row: Owner · Contact */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: "1px solid #e2e8f0" }}>
                    <div style={{ padding: "10px 16px", borderRight: "1px solid #e2e8f0" }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>
                        Owner <span style={{ color: "#ef4444" }}>*</span>
                      </div>
                      {isCustomer ? (
                        <input
                          type="text" value={form.owner} readOnly
                          style={{ width: "100%", border: "none", borderBottom: "1.5px solid #cbd5e1", background: "transparent", fontSize: 13, fontWeight: 600, color: "#94a3b8", outline: "none", padding: "2px 0", fontFamily: "inherit", boxSizing: "border-box", cursor: "not-allowed" }}
                        />
                      ) : (
                        <CustomSelect
                          value={form.ownerId || ""}
                          onChange={val => {
                            const sel = customers.find(c => c.id === val);
                            const ownerName = sel ? `${sel.first_name} ${sel.last_name}`.trim() : "";
                            setForm({ ...form, ownerId: sel?.id || "", owner: ownerName, contact: sel?.phone || "", ownerEmail: sel?.email || "" });
                            fetchExistingPatientsFor(ownerName, sel?.id || null);
                          }}
                          placeholder="— Select customer —"
                          options={customers.map(c => ({ value: c.id, label: `${c.first_name} ${c.last_name}${c.phone ? ` — ${c.phone}` : ""}` }))}
                        />
                      )}
                    </div>
                    <div style={{ padding: "10px 16px" }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>Contact Number</div>
                      <input
                        type="text" value={form.contact}
                        onChange={e => setForm({ ...form, contact: sanitizeContact(e.target.value) })}
                        placeholder="e.g. 09170000000"
                        inputMode="numeric"
                        maxLength={11}
                        style={{ width: "100%", border: "none", borderBottom: "1.5px solid #cbd5e1", background: "transparent", fontSize: 13, fontWeight: 600, color: "var(--text)", outline: "none", padding: "2px 0", fontFamily: "inherit", boxSizing: "border-box" }}
                      />
                      {form.contact && form.contact.length !== 11 && (
                        <p style={{ fontSize: 11, color: "#dc2626", margin: "4px 0 0" }}>Contact number must be 11 digits.</p>
                      )}
                    </div>
                  </div>
                </div>
                )}

                {/* Patient & Service (locked service/price) — shown once a service is picked or when editing */}
                {(editMode || bookStep !== "service") && (
                <div style={{ borderBottom: '1.5px solid #e2e8f0' }}>
                  <div style={{ background: 'var(--bg)', borderBottom: '1px solid #e2e8f0', padding: '6px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="7" cy="10" r="2" /><circle cx="17" cy="10" r="2" /><circle cx="4" cy="6" r="1.5" /><circle cx="20" cy="6" r="1.5" /><path d="M12 14c-3.3 0-6 2-6 4.5h12c0-2.5-2.7-4.5-6-4.5z" /></svg>
                      Patient &amp; Service {extraPets.length > 0 ? `(Pet 1 of ${1 + extraPets.length})` : ''}
                    </span>
                    {!editMode && (
                      <button style={{ padding: '4px 10px', borderRadius: 6, border: '1.5px dashed #c7d2fe', background: '#f5f3ff', color: '#6366f1', fontWeight: 600, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                        onClick={addExtraPet}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                        Add Another Pet
                      </button>
                    )}
                  </div>

                  {/* Locked service + price display */}
                  <div style={{ padding: "10px 16px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 12 }}>
                    {(() => {
                      const meta = SERVICE_META[form.purpose] || { icon: <svg viewBox="0 0 24 24" fill="#475569" style={{ width: 16, height: 16 }}><path d="M8.5 12c1.4 0 2.5-1.6 2.5-3.5S9.9 5 8.5 5 6 6.6 6 8.5 7.1 12 8.5 12zm7 0c1.4 0 2.5-1.6 2.5-3.5S16.9 5 15.5 5 13 6.6 13 8.5s1.1 3.5 2.5 3.5zM4.5 15c1.1 0 2-1.3 2-2.8s-.9-2.8-2-2.8-2 1.3-2 2.8.9 2.8 2 2.8zm15 0c1.1 0 2-1.3 2-2.8s-.9-2.8-2-2.8-2 1.3-2 2.8.9 2.8 2 2.8zM12 13.5c-2.3 0-5.5 3-5.5 5.5 0 1.1.9 1.5 2 1.5 1.2 0 2.3-.8 3.5-.8s2.3.8 3.5.8c1.1 0 2-.4 2-1.5 0-2.5-3.2-5.5-5.5-5.5z" /></svg>, color: "#475569", bg: "#f8fafc"  };
                      return (
                        <>
                          <div style={{ width: 44, height: 44, borderRadius: 10, background: meta.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                            {meta.icon}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px" }}>Service</div>
                            <div style={{ fontSize: 14, fontWeight: 800, color: meta.color }}>{form.purpose}</div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px" }}>Price</div>
                            <div style={{ fontSize: 14, fontWeight: 800, color: "#16a34a" }}>
                              {form.price !== "" ? `₱${Number(form.price).toLocaleString()}` : "—"}
                            </div>
                          </div>
                          {!editMode && (
                            <button
                              type="button"
                              onClick={() => setBookStep("service")}
                              style={{ fontSize: 11, fontWeight: 700, color: "#6366f1", background: "#f5f3ff", border: "1px solid #c7d2fe", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}
                            >
                              Change
                            </button>
                          )}
                        </>
                      );
                    })()}
                  </div>
                  <div style={{ padding: "0 16px 8px", fontSize: 11, color: "var(--muted)", fontStyle: "italic" }}>
                    Price is fixed per service and can only be changed in the system by staff.
                  </div>

                  {/* Row 1: Patient Toggle */}
                  <div style={{ padding: "10px 16px", borderBottom: "1px solid #e2e8f0" }}>
                    <div style={{ display: "flex", border: "1.5px solid var(--border)", borderRadius: 8, overflow: "hidden", width: "fit-content", marginBottom: 14 }}>
                      {[{ key: "new", label: "New Pet" }, { key: "existing", label: "Existing Pet" }].map(({ key, label }) => (
                        <button key={key} type="button"
                          onClick={() => setForm(prev => key === "existing" ? { ...prev, mode: "existing", patient: "", species: "" } : { ...prev, mode: "new", existingId: null })}
                          style={{ padding: "6px 16px", border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", background: form.mode === key ? "var(--royal)" : "#fff", color: form.mode === key ? "#fff" : "var(--muted)" }}>
                          {label}
                        </button>
                      ))}
                    </div>

                    {form.mode === "existing" ? (
                      loadingExistingPatients ? (
                        <div style={{ fontSize: 12, color: "var(--muted)" }}>Loading {form.owner || "owner"}'s pets…</div>
                      ) : existingPatients.length === 0 ? (
                        <div style={{ fontSize: 12, color: "var(--muted)", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px" }}>
                          No registered pets found for this owner yet. Switch to "New Pet" to add one.
                        </div>
                      ) : (
                        <CustomSelect
                          value={form.existingId || ""}
                          onChange={val => {
                            const sel = existingPatients.find(ep => ep.id === val);
                            setForm(prev => ({ ...prev, existingId: sel?.id || null, patient: sel?.name || "", species: sel?.species || "" }));
                          }}
                          placeholder="— Select a pet —"
                          options={existingPatients.map(ep => ({ value: ep.id, label: `${ep.name}${ep.species ? ` (${ep.species})` : ""}` }))}
                        />
                      )
                    ) : (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>
                            Patient Name <span style={{ color: "#ef4444" }}>*</span>
                          </div>
                          <input
                            type="text" value={form.patient}
                            onChange={e => setForm({ ...form, patient: sanitizeName(e.target.value) })}
                            placeholder="e.g. Buddy"
                            style={{ width: "100%", border: "none", borderBottom: "1.5px solid #cbd5e1", background: "transparent", fontSize: 13, fontWeight: 600, color: "var(--text)", outline: "none", padding: "2px 0", fontFamily: "inherit", boxSizing: "border-box" }}
                          />
                        </div>
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>Species</div>
                          <CustomSelect
                            value={form.species}
                            onChange={val => setForm({ ...form, species: val })}
                            placeholder="— Select Species —"
                            options={["Dog", "Cat"]}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Veterinarian — purpose is now locked from Step 1 */}
                  <div style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <div style={{ padding: "10px 16px" }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>
                        Veterinarian <span style={{ color: "#ef4444" }}>*</span>
                      </div>
                      <CustomSelect
                        value={form.vet}
                        onChange={val => setForm({ ...form, vet: val })}
                        placeholder="— Select Veterinarian —"
                        options={VETS}
                      />
                      {form.purpose === "Imaging" && (
                        <>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px", margin: "10px 0 6px" }}>
                            Imaging Type <span style={{ color: "#ef4444" }}>*</span>
                          </div>
                          <CustomSelect
                            value={form.imagingType}
                            onChange={val => {
                              const branchForLookup = seeAllBranches ? (branchFilter || user?.branchId) : user?.branchId;
                              const looked = getServicePrice(form.purpose, branchForLookup, val);
                              setForm({ ...form, imagingType: val, price: looked != null ? looked : form.price });
                            }}
                            placeholder="— Select Imaging Type —"
                            options={["X-ray", "Ultrasound", "CT-scan"]}
                          />
                        </>
                      )}
                    </div>
                  </div>
                </div>
                )}

                {/* ── Extra pets (additional appointments for the same owner) ── */}
                {!editMode && extraPets.map((p, idx) => {
                  const pTaken = isSlotTakenAppt(p.date, p.time, idx);
                  return (
                    <div key={idx} style={{ borderBottom: "1.5px solid #e2e8f0" }}>
                      <div style={{ background: "var(--bg)", borderBottom: "1px solid #e2e8f0", padding: "6px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px", color: "#64748b" }}>
                          Pet {idx + 2} of {1 + extraPets.length}
                        </span>
                        <button onClick={() => removeExtraPet(idx)} style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", fontSize: 11, fontWeight: 700, padding: "2px 6px", display: "inline-flex", alignItems: "center", gap: 4, fontFamily: "inherit" }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                          Remove
                        </button>
                      </div>

                      <div style={{ padding: "10px 16px", borderBottom: "1px solid #e2e8f0" }}>
                        <div style={{ display: "flex", border: "1.5px solid var(--border)", borderRadius: 8, overflow: "hidden", width: "fit-content", marginBottom: p.mode === "existing" ? 10 : 0 }}>
                          {[{ key: "new", label: "New Pet" }, { key: "existing", label: "Existing Pet" }].map(({ key, label }) => (
                            <button key={key} type="button"
                              onClick={() => updateExtraPet(idx, key === "existing" ? { mode: "existing", patient: "", species: "" } : { mode: "new", existingId: null })}
                              style={{ padding: "6px 16px", border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", background: p.mode === key ? "var(--royal)" : "#fff", color: p.mode === key ? "#fff" : "var(--muted)" }}>
                              {label}
                            </button>
                          ))}
                        </div>

                        {p.mode === "existing" ? (
                          loadingExistingPatients ? (
                            <div style={{ fontSize: 12, color: "var(--muted)" }}>Loading {form.owner || "owner"}'s pets…</div>
                          ) : existingPatients.length === 0 ? (
                            <div style={{ fontSize: 12, color: "var(--muted)", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px" }}>
                              No registered pets found for this owner yet. Switch to "New Pet" to add one.
                            </div>
                          ) : (
                            <CustomSelect
                              value={p.existingId || ""}
                              onChange={val => {
                                const sel = existingPatients.find(ep => ep.id === val);
                                updateExtraPet(idx, { existingId: sel?.id || null, species: sel?.species || "" });
                              }}
                              placeholder="— Select a pet —"
                              options={existingPatients.map(ep => ({ value: ep.id, label: `${ep.name}${ep.species ? ` (${ep.species})` : ""}` }))}
                            />
                          )
                        ) : (
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                            <div>
                              <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>Patient Name <span style={{ color: "#ef4444" }}>*</span></div>
                               <input type="text" value={p.patient} onChange={e => updateExtraPet(idx, { patient: sanitizeName(e.target.value) })} placeholder="e.g. Buddy"
                                style={{ width: "100%", border: "none", borderBottom: "1.5px solid #cbd5e1", background: "transparent", fontSize: 13, fontWeight: 600, color: "var(--text)", outline: "none", padding: "2px 0", fontFamily: "inherit", boxSizing: "border-box" }} />
                            </div>
                            <div>
                              <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>Species</div>
                              <CustomSelect value={p.species} onChange={val => updateExtraPet(idx, { species: val })} options={["Dog", "Cat"]} placeholder="— Select Species —" />
                            </div>
                          </div>
                        )}
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: "1px solid #e2e8f0" }}>
                        <div style={{ padding: "10px 16px", borderRight: "1px solid #e2e8f0" }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>Service</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: (SERVICE_META[form.purpose] || {}).color || "var(--text)" }}>{form.purpose}</div>
                          <div style={{ marginTop: 8, fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>Price (₱)</div>
                          <div style={{ fontSize: 14, fontWeight: 800, color: "#16a34a" }}>
                            {form.price !== "" ? Number(form.price).toLocaleString() : "—"}
                          </div>
                        </div>
                        <div style={{ padding: "10px 16px" }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>
                            Veterinarian <span style={{ color: "#ef4444" }}>*</span>
                          </div>
                          <CustomSelect value={p.vet} onChange={val => updateExtraPet(idx, { vet: val })} options={VETS} placeholder="— Select Veterinarian —" />
                          {p.purpose === "Imaging" && (
                            <>
                              <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px", margin: "10px 0 6px" }}>
                                Imaging Type <span style={{ color: "#ef4444" }}>*</span>
                              </div>
                              <CustomSelect
                                value={p.imagingType}
                                onChange={val => {
                                  const branchForLookup = seeAllBranches ? (branchFilter || user?.branchId) : user?.branchId;
                                  const looked = getServicePrice(p.purpose, branchForLookup, val);
                                  updateExtraPet(idx, { imagingType: val, price: looked != null ? looked : p.price });
                                }}
                                placeholder="— Select Imaging Type —"
                                options={["X-ray", "Ultrasound", "CT-scan"]}
                              />
                            </>
                          )}
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: "1px solid #e2e8f0" }}>
                        <div style={{ padding: "10px 16px", borderRight: "1px solid #e2e8f0" }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>
                            Date <span style={{ color: "#ef4444" }}>*</span>
                          </div>
                          <DatePicker value={p.date} min={today} onChange={val => updateExtraPet(idx, { date: val })} placeholder="Select date" />
                        </div>
                        <div style={{ padding: "10px 16px" }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>
                            Time <span style={{ color: "#ef4444" }}>*</span>
                          </div>
                          <CustomSelect
                            value={p.time}
                            onChange={val => updateExtraPet(idx, { time: val })}
                            placeholder="— Select Time —"
                            options={TIMES.map(t => {
                              const taken = p.date && isSlotTakenAppt(p.date, t, idx);
                              return { value: t, label: taken ? `${t} — Taken` : t, disabled: taken };
                            })}
                          />
                        </div>
                      </div>

                      {pTaken && (
                        <div style={{ background: "#fee2e2", borderTop: "1px solid #fca5a5", padding: "10px 16px" }}>
                          <p style={{ margin: 0, color: "#b91c1c", fontSize: 11, fontWeight: 700 }}>This time slot is already taken. Please choose a different time.</p>
                        </div>
                      )}

                      <div style={{ padding: "10px 16px" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>Notes for this pet</div>
                        <textarea value={p.notes} onChange={e => updateExtraPet(idx, { notes: e.target.value })} placeholder="Notes for this pet..."
                          style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 8, background: "transparent", fontSize: 13, color: "var(--text)", outline: "none", resize: "vertical", minHeight: 50, fontFamily: "inherit", lineHeight: 1.6, boxSizing: "border-box", padding: "8px 10px" }} />
                      </div>
                    </div>
                  );
                })}

                {/* Section 2: Schedule — only after service is picked */}
                {(editMode || bookStep !== "service") && (
                <div style={{ borderBottom: "1.5px solid #e2e8f0" }}>
                  <div style={{ background: "#f1f5f9", borderBottom: "1px solid #e2e8f0", padding: "6px 16px" }}>
                    <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px", color: "#64748b", display: "inline-flex", alignItems: "center", gap: 5 }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                      Schedule
                    </span>
                  </div>

                  {/* Row: Date · Time */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: "1px solid #e2e8f0" }}>
                    <div style={{ padding: "10px 16px", borderRight: "1px solid #e2e8f0" }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>
                        Date <span style={{ color: "#ef4444" }}>*</span>
                      </div>
                      <DatePicker
                        value={form.date} min={today}
                        onChange={val => setForm({ ...form, date: val })}
                        placeholder="Select date"
                      />
                    </div>
                    <div style={{ padding: "10px 16px" }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>
                        Time <span style={{ color: "#ef4444" }}>*</span>
                      </div>
                      <CustomSelect
                        value={form.time}
                        onChange={val => setForm({ ...form, time: val })}
                        placeholder="— Select Time —"
                        options={TIMES.map(t => {
                          const excludeId = editMode ? selectedAppt?.id : null;
                          const isBooked = form.date && appts.some(a =>
                            a.date === form.date && a.time === t &&
                            ["Pending", "Confirmed"].includes(a.status) && a.id !== excludeId
                          );
                          return { value: t, label: isBooked ? `${t} — Taken` : t, disabled: isBooked };
                        })}
                      />
                      {form.date && (
                        <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#dc2626", display: "inline-block", flexShrink: 0 }} />
                          Slots marked "Taken" are booked for {form.date}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Conflict banner */}
                  {conflictType === "time" && (
                    <div style={{ background: "#fee2e2", borderTop: "1px solid #fca5a5", padding: "10px 16px", display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(220,38,38,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg>
                      </div>
                      <div>
                        <p style={{ margin: 0, fontWeight: 700, color: "#991b1b", fontSize: 12 }}>Time Slot Already Taken</p>
                        <p style={{ margin: 0, color: "#b91c1c", fontSize: 11 }}>Please select a different time.</p>
                      </div>
                    </div>
                  )}

                  {/* Room assignment — staff only */}
                  {(isAdmin || isEmployee) && (
                    <div style={{ padding: "10px 16px", borderTop: "1px solid #e2e8f0" }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>Assign Room</div>
                      <CustomSelect
                        value={form.room}
                        onChange={val => setForm({ ...form, room: val })}
                        placeholder="No room assigned"
                        accent="#16a34a"
                        options={rooms.filter(r => r.status === "Available" || r.number === form.room).map(r => ({ value: r.number, label: `${r.number}${r.type ? ` · ${r.type}` : ""}${r.status !== "Available" && r.number !== form.room ? ` — ${r.status}` : ""}` }))}
                      />
                      <div style={{ marginTop: 5, fontSize: 11, color: "var(--muted)" }}>
                        {rooms.filter(r => r.status === "Available").length} room(s) available
                      </div>
                    </div>
                  )}

                  {/* Admin status override */}
                  {editMode && isAdmin && (
                    <div style={{ padding: "10px 16px", borderTop: "1px solid #e2e8f0" }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>Status</div>
                      <CustomSelect
                        value={form.status}
                        onChange={val => setForm({ ...form, status: val })}
                        placeholder="— Select Status —"
                        options={["Pending", "Confirmed", "Completed", "Cancelled"]}
                      />
                    </div>
                  )}
                </div>
                )}

                {/* Section 4: Notes — only after schedule is picked */}
                {form.date && form.time && (
                <div style={{ borderBottom: "1.5px solid #e2e8f0" }}>
                  <div style={{ background: "#f1f5f9", borderBottom: "1px solid #e2e8f0", padding: "6px 16px" }}>
                    <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px", color: "#64748b", display: "inline-flex", alignItems: "center", gap: 5 }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
                      Additional Notes
                    </span>
                  </div>
                  <div style={{ padding: "12px 16px", minHeight: 70 }}>
                    <textarea
                      value={form.notes}
                      onChange={e => setForm({ ...form, notes: e.target.value })}
                      placeholder="Describe any additional symptoms, requests, or concerns..."
                      style={{
                        width: "100%", border: "none", background: "transparent",
                        fontSize: 13, color: "var(--text)", outline: "none",
                        resize: "vertical", minHeight: 64, fontFamily: "inherit",
                        lineHeight: 1.8, boxSizing: "border-box",
                        backgroundImage: "repeating-linear-gradient(transparent, transparent 27px, rgba(147,197,253,0.25) 27px, rgba(147,197,253,0.25) 28px)"
                      }}
                    />
                  </div>
                </div>
                )}

                {/* Footer watermark */}
                <div style={{ padding: "6px 16px", background: "var(--bg)" }}>
                  <p style={{ margin: 0, fontSize: 10, color: "var(--muted)", textAlign: "right", fontStyle: "italic" }}>Angeles Animal Care Hospital</p>
                </div>
              </div>

              {/* ── Modal footer ── */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "14px 24px", borderTop: "2px solid var(--border)", background: "var(--bg)", flexShrink: 0, flexWrap: "wrap" }}>
                <div>
                  {!editMode && bookStep !== "service" && (
                    <button className="btn btn-ghost" style={S.btn} onClick={() => setBookStep("service")}>← Change Service</button>
                  )}
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button className="btn btn-ghost" style={S.btn} onClick={() => setShowBook(false)}>Cancel</button>
                  {(editMode || bookStep !== "service") && (
                    <button
                      className="btn btn-primary"
                      style={{
                        ...S.btn,
                        background: "#0f172a",
                        borderColor: "#0f172a",
                        color: "#fff",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        opacity: canSubmitAppointment ? 1 : 0.5,
                        cursor: canSubmitAppointment ? "pointer" : "not-allowed",
                        pointerEvents: canSubmitAppointment ? "auto" : "none",
                      }}
                      onClick={saveAppointment}
                      disabled={!canSubmitAppointment}
                    >
                      {editMode ? "Save Changes" : isAdmin
                        ? <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg> {extraPets.length > 0 ? `File ${1 + extraPets.length} Appointments` : "File Appointment"}</>
                        : extraPets.length > 0 ? `Submit ${1 + extraPets.length} Requests` : "Submit Request"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══ VIEW MODAL ══ */}
        {showView && selectedAppt && (() => {
           const statusConfig = {
            Pending: { hero: "linear-gradient(135deg, #78350f, #d97706)", badge: "#fef3c7", badgeText: "#92400e", border: "#fde68a", dot: "#d97706" },
            Confirmed: { hero: "linear-gradient(135deg, #14532d, #16a34a)", badge: "#dcfce7", badgeText: "#14532d", border: "#86efac", dot: "#16a34a" },
            Cancelled: { hero: "linear-gradient(135deg, #7f1d1d, #dc2626)", badge: "#fee2e2", badgeText: "#991b1b", border: "#fca5a5", dot: "#dc2626" },
            Completed: { hero: "linear-gradient(135deg, #1e3a8a, #2563eb)", badge: "#dbeafe", badgeText: "#1e3a8a", border: "#93c5fd", dot: "#2563eb" },
            Missed: { hero: "linear-gradient(135deg, #374151, #6b7280)", badge: "#f1f5f9", badgeText: "#374151", border: "#cbd5e1", dot: "#6b7280" },
          };
          const cfg = statusConfig[selectedAppt.status] || statusConfig.Pending;
          const purposeStyle = {
            Consultation: { bg: "#f8fafc", color: "#475569", icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.3.3 0 1 0 .3.3" /><path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4" /><circle cx="20" cy="10" r="2" /></svg> },
            Vaccination: { bg: "#f0fdf4", color: "#15803d", icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="2" x2="12" y2="6" /><path d="M12 14v8" /><path d="M8 10c0-2.2 1.8-4 4-4s4 1.8 4 4" /></svg> },
            Deworming: { bg: "#f3e8ff", color: "#6d28d9", icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><line x1="20" y1="4" x2="8.12" y2="15.88" /><line x1="14.47" y1="14.48" x2="20" y2="20" /><line x1="8.12" y1="8.12" x2="12" y2="12" /></svg> },
            Imaging: { bg: "#eff6ff", color: "#1d4ed8", icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-5-5L5 21" /></svg> },
            Diagnostics: { bg: "#fee2e2", color: "#dc2626", icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg> },
          }[selectedAppt.purpose] || { bg: "#f8fafc", color: "#475569", icon: null };

          return (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 16 }}>
              <div style={{ background: "var(--card)", borderRadius: 16, width: "100%", maxWidth: 520, maxHeight: "92vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 64px rgba(0,0,0,0.30)", overflow: "hidden" }}>

                {/* ── Hero Header ── */}
                <div style={{ background: cfg.hero, padding: "22px 24px 20px", position: "relative", overflow: "hidden", flexShrink: 0 }}>
                  {/* Decorative circles */}
                  <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.06)", pointerEvents: "none" }} />
                  <div style={{ position: "absolute", bottom: -20, left: 60, width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.04)", pointerEvents: "none" }} />

                  <div style={{ position: "relative", zIndex: 1 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        {/* Pet avatar */}
                        <div style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(255,255,255,0.15)", border: "2px solid rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {selectedAppt.species === "Cat"
                            ? <svg width="24" height="24" viewBox="0 0 16 16" fill="rgba(255,255,255,0.9)" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" clipRule="evenodd" d="M1 7L4.80061 1.43926C5.56059 0.527292 6.68638 0 7.8735 0H8V4L12 5L15 10L14.1875 11.2188C13.4456 12.3316 12.1967 13 10.8593 13H9L7 16H5L1 7ZM10 9C10.5523 9 11 8.55229 11 8C11 7.44772 10.5523 7 10 7C9.44771 7 9 7.44772 9 8C9 8.55229 9.44771 9 10 9Z" /><path d="M10 0.465878V2.43845L12 2.93845V0H11.8735C11.2125 0 10.5704 0.163501 10 0.465878Z" /></svg>
                            : <svg width="24" height="24" viewBox="0 0 16 16" fill="rgba(255,255,255,0.9)" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" clipRule="evenodd" d="M16 4V7C16 9.20914 14.2091 11 12 11H10V15H0V13L0.931622 10.8706C1.25226 10.9549 1.59036 11 1.94124 11C3.74931 11 5.32536 9.76947 5.76388 8.01538L3.82359 7.53031C3.60766 8.39406 2.83158 9.00001 1.94124 9.00001C1.87789 9.00001 1.81539 8.99702 1.75385 8.99119C1.02587 8.92223 0.432187 8.45551 0.160283 7.83121C0.0791432 7.64491 0.0266588 7.44457 0.00781272 7.23658C-0.0112323 7.02639 0.00407892 6.80838 0.0588889 6.58914C0.0588882 6.58914 0.0588896 6.58913 0.0588889 6.58914L0.698705 4.02986C1.14387 2.24919 2.7438 1 4.57928 1H10L12 4H16ZM9 6C9.55229 6 10 5.55228 10 5C10 4.44772 9.55229 4 9 4C8.44771 4 8 4.44772 8 5C8 5.55228 8.44771 6 9 6Z" /><path d="M9 15H10V11H9V15Z" /></svg>
                          }
                        </div>
                        <div>
                          <h3 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: "#fff", lineHeight: 1.2 }}>{selectedAppt.patient}</h3>
                          <p style={{ margin: "3px 0 0", fontSize: 12, color: "rgba(255,255,255,0.65)" }}>
                            {selectedAppt.species || "Pet"}{selectedAppt.owner ? ` · ${selectedAppt.owner}` : ""}
                          </p>
                        </div>
                      </div>
                      <button onClick={() => setShowView(false)} style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 8, width: 32, height: 32, cursor: "pointer", color: "#fff", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>✕</button>
                    </div>

                    {/* Status + Purpose chips */}
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 700, color: "#fff", display: "inline-flex", alignItems: "center", gap: 5 }}>
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: cfg.dot === "#d97706" ? "#fbbf24" : "#fff", display: "inline-block" }} />
                        {selectedAppt.status}
                      </span>
                      <span style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.9)", display: "inline-flex", alignItems: "center", gap: 5 }}>
                        {purposeStyle.icon} {selectedAppt.purpose}
                      </span>
                      {!canEdit(selectedAppt) && selectedAppt.status === "Confirmed" && (
                        <span style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 20, padding: "4px 12px", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.85)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                          Locked
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── Body ── */}
                <div style={{ overflowY: "auto", flex: 1, padding: "20px 24px" }}>

                  {/* Admin action bar */}
                  {(selectedAppt.status === "Pending" || selectedAppt.status === "Confirmed") && (isAdmin || isEmployee) && (
                    <div style={{ background: "var(--bg)", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "12px 16px", marginBottom: 18, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                      <div>
                        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "var(--text)" }}>
                          {selectedAppt.status === "Pending" ? "Awaiting your approval" : "Confirmed & locked"}
                        </p>
                        <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--muted)" }}>
                          {selectedAppt.status === "Pending" ? "Approve to lock this appointment from edits." : "Mark as complete once the visit is done."}
                        </p>
                      </div>
                      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                        {selectedAppt.status === "Pending" && isAdmin && (
                          <>
                            <button className="btn btn-sm" style={{ ...S.btn, background: "#16a34a", color: "#fff", border: "none", display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12 }} disabled={approving} onClick={() => openApproveModal(selectedAppt)}>
                              {approving ? "Approving…" : <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>Approve</>}
                            </button>
                            <button className="btn btn-sm" style={{ ...S.btn, background: "#dc2626", color: "#fff", border: "none", fontSize: 12 }} onClick={() => cancelAppt(selectedAppt.id)}>Decline</button>
                          </>
                        )}
                        {selectedAppt.status === "Confirmed" && isAdmin && (
                          <button className="btn btn-sm" style={{ ...S.btn, background: "#1e3a8a", color: "#fff", border: "none", fontSize: 12 }} disabled={completing} onClick={() => completeAppt(selectedAppt.id)}>{completing ? "Saving…" : "Mark Complete"}</button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Schedule card */}
                  <div style={{ background: "#eff6ff", border: "1.5px solid #bfdbfe", borderRadius: 12, padding: "14px 16px", marginBottom: 14, display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: "#1e3a8a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: "#1e40af" }}>Scheduled</p>
                      <p style={{ margin: "3px 0 0", fontSize: 16, fontWeight: 800, color: "#1e3a8a" }}>
                        {new Date(selectedAppt.date).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                      </p>
                      <p style={{ margin: "2px 0 0", fontSize: 13, color: "#3b82f6", fontWeight: 600 }}>{selectedAppt.time}</p>
                    </div>
                  </div>

                  {/* Info grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                    {[
                      { label: "Owner", value: selectedAppt.owner || "—", icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg> },
                      { label: "Contact", value: selectedAppt.contact || "—", icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5 19.79 19.79 0 0 1 1.6 4.9 2 2 0 0 1 3.58 2.72h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.1a16 16 0 0 0 6 6z" /></svg> },
                      { label: "Species", value: selectedAppt.species || "—", icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round"><circle cx="7" cy="10" r="2" /><circle cx="17" cy="10" r="2" /><path d="M12 14c-3.3 0-6 2-6 4.5h12c0-2.5-2.7-4.5-6-4.5z" /></svg> },
                      { label: "Service By", value: selectedAppt.vet || "—", icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg> },
                     { label: "Room", value: selectedAppt.room || "Unassigned", icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg> },
                      { label: "Price", value: selectedAppt.price ? `₱${Number(selectedAppt.price).toLocaleString()}` : "—", icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="m17 5h9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7h6" /></svg> },
                    ].map(({ label, value, icon }) => (
                      <div key={label} style={{ background: "var(--bg)", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "10px 12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
                          {icon}
                          <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: "#94a3b8" }}>{label}</span>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Purpose badge full width */}
                  <div style={{ background: purposeStyle.bg, border: `1.5px solid ${purposeStyle.color}33`, borderRadius: 10, padding: "10px 14px", marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ width: 32, height: 32, borderRadius: 8, background: `${purposeStyle.color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: purposeStyle.color }}>
                      {purposeStyle.icon}
                    </span>
                    <div>
                      <p style={{ margin: 0, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: purposeStyle.color }}>Purpose</p>
                      <p style={{ margin: "2px 0 0", fontSize: 14, fontWeight: 700, color: purposeStyle.color }}>{selectedAppt.purpose}</p>
                    </div>
                  </div>

                  {/* Notes */}
                  {selectedAppt.notes && (
                    <div style={{ background: "#fffbeb", border: "1.5px solid #fde68a", borderRadius: 10, padding: "12px 14px" }}>
                      <p style={{ margin: "0 0 6px", fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: "#92400e", display: "flex", alignItems: "center", gap: 5 }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
                        Notes
                      </p>
                      <p style={{ margin: 0, fontSize: 13, color: "#78350f", lineHeight: 1.6 }}>{selectedAppt.notes}</p>
                    </div>
                  )}
                </div>

                {/* ── Footer ── */}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "14px 24px", borderTop: "1.5px solid var(--border)", background: "var(--bg)", flexShrink: 0 }}>
                  <button className="btn btn-ghost" style={S.btn} onClick={() => setShowView(false)}>Close</button>
                  {canEdit(selectedAppt) && (
                    <button className="btn btn-ghost" style={S.btn} onClick={() => openEdit(selectedAppt)}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 5 }}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                      Edit
                    </button>
                  )}
                  {(selectedAppt.status === "Pending" || selectedAppt.status === "Confirmed") && (
                    <button className="btn" style={{ ...S.btn, background: "#dc2626", color: "#fff", border: "none" }} onClick={() => cancelAppt(selectedAppt.id)}>Cancel Appointment</button>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </Layout>
  );
};

export default Appointment;