// src/pages/Appointments.jsx
import React, { useState, useEffect, useCallback } from "react";
import ReactDOM from "react-dom";
import Layout from "../components/layout";
import { supabase } from "../js/supabase";
import { useCurrentUser } from "../js/useCurrentUser";

const STATUS_BADGE = { Confirmed: "badge-green", Pending: "badge-yellow", Cancelled: "badge-red", Completed: "badge-blue" };
const STATUS_DOT = { Confirmed: "#16a34a", Pending: "#d97706", Cancelled: "#dc2626", Completed: "#1e3a8a" };
const VETS = ["Dr. Santos", "Dr. Reyes", "Dr. Cruz", "Dr. Garcia"];
const TIMES = ["08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM", "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM"];
const today = new Date().toISOString().split("T")[0];
const ROWS_PER_PAGE = 10;
const EMPTY = { patient: "", owner: "", ownerId: "", contact: "", vet: "", date: "", time: "", purpose: "Checkup", species: "", status: "Pending", notes: "" };

const canEdit = (appt) => appt?.status === "Pending";

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
        <div ref={ref} style={{ position: "absolute", top: dropPos.top, left: dropPos.left, width: dropPos.width, background: "#fff", borderRadius: 10, zIndex: 99999, boxShadow: "0 8px 24px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.08)", border: "1.5px solid #e2e8f0", maxHeight: 240, overflowY: "auto" }}>
          {[{ value: "", label: placeholder }, ...options].map((opt, i) => {
            const optVal = opt.value ?? opt;
            const optLabel = opt.label ?? opt;
            const isSelected = optVal === value;
            const isEmpty = optVal === "";
            return (
              <div key={i} onClick={() => { if (!opt.disabled && optVal !== "" || optVal === "") { onChange(optVal); setOpen(false); } }}
                style={{ padding: "9px 14px", fontSize: 13, fontWeight: isSelected ? 700 : 500, color: opt.disabled ? "#cbd5e1" : isEmpty ? "#94a3b8" : isSelected ? "#4f46e5" : "#1e293b", cursor: opt.disabled ? "not-allowed" : "pointer", transition: "background 0.1s", background: isSelected ? "#eff6ff" : "transparent", borderBottom: i < options.length ? "1px solid #f1f5f9" : "none", display: "flex", alignItems: "center", justifyContent: "space-between", opacity: opt.disabled ? 0.5 : 1 }}
                onMouseEnter={e => { if (!isSelected && !opt.disabled) e.currentTarget.style.background = "#f8fafc"; }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}>
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
    <div style={{ position: "relative", width: "100%" }}>
      <div ref={triggerRef} onClick={handleOpen}
        style={{ width: "100%", padding: "7px 28px 7px 10px", border: "1.5px solid #e2e8f0", borderRadius: 8, background: "linear-gradient(to bottom, #ffffff, #f8fafc)", fontSize: 13, fontWeight: 600, color: value ? "var(--text)" : "#94a3b8", cursor: "pointer", userSelect: "none", boxSizing: "border-box", boxShadow: open ? "0 0 0 3px rgba(99,102,241,0.12), 0 1px 3px rgba(0,0,0,0.06)" : "0 1px 3px rgba(0,0,0,0.06)", borderColor: open ? accent : "#e2e8f0", transition: "border-color 0.15s, box-shadow 0.15s", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span>{label}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0, transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>
      {portal}
    </div>
  );
};

/* ── Skeleton pulse keyframe (injected once) ── */
const SKELETON_STYLE = `
  @keyframes shimmer {
    0%   { background-position: -600px 0; }
    100% { background-position:  600px 0; }
  }
  .skel {
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 600px 100%;
    animation: shimmer 1.4s infinite linear;
    border-radius: 6px;
  }
`;

const STAT_CARD_STYLE = `
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
  .stat-card-v2.yellow::before { background: linear-gradient(90deg,#d97706,#f59e0b); }
  .stat-card-v2.green::before  { background: linear-gradient(90deg,#16a34a,#22c55e); }
  .stat-card-v2.red::before    { background: linear-gradient(90deg,#dc2626,#ef4444); }
  .stat-card-v2 .stat-icon-v2 {
    width: 46px; height: 46px; border-radius: 12px;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .stat-card-v2 .stat-icon-v2.blue   { background: #eff6ff; }
  .stat-card-v2 .stat-icon-v2.yellow { background: #fffbeb; }
  .stat-card-v2 .stat-icon-v2.green  { background: #f0fdf4; }
  .stat-card-v2 .stat-icon-v2.red    { background: #fff1f2; }
  .stat-card-v2 .stat-icon-v2.blue   img { filter: brightness(0) saturate(100%) invert(17%) sepia(82%) saturate(1200%) hue-rotate(210deg); }
  .stat-card-v2 .stat-icon-v2.yellow img { filter: brightness(0) saturate(100%) invert(52%) sepia(90%) saturate(600%) hue-rotate(10deg) brightness(0.9); }
  .stat-card-v2 .stat-icon-v2.green  img { filter: brightness(0) saturate(100%) invert(32%) sepia(80%) saturate(600%) hue-rotate(110deg) brightness(0.9); }
  .stat-card-v2 .stat-icon-v2.red    img { filter: brightness(0) saturate(100%) invert(20%) sepia(90%) saturate(1200%) hue-rotate(340deg) brightness(0.9); }
`;

const SkeletonStyle = () => (
  <style>{SKELETON_STYLE + STAT_CARD_STYLE}</style>
);

/* ── Reusable skeleton block ── */
const Skel = ({ w = "100%", h = 14, style = {} }) => (
  <span className="skel" style={{ display: "block", width: w, height: h, borderRadius: 6, ...style }} />
);

/* ── Skeleton for stat cards ── */
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
      <div style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 440, boxShadow: "0 20px 60px rgba(0,0,0,0.28)", overflow: "hidden" }}>
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
  const [appts, setAppts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("list");
  const [showBook, setShowBook] = useState(false);
  const [showView, setShowView] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [search, setSearch] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [calMonth, setCalMonth] = useState(new Date());
  const [approving, setApproving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [conflictType, setConflictType] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [modal, setModal] = useState({ show: false, title: "", message: "", confirmText: "OK", cancelText: null, confirmColor: "var(--royal)", onConfirm: null, onCancel: null });
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [currentPage, setCurrentPage] = useState(1);
  const toastTimerRef = React.useRef(null);

  const closeModal = () => setModal(m => ({ ...m, show: false }));
  const showAlert = (title, message) => setModal({ show: true, title, message, confirmText: "OK", cancelText: null, confirmColor: "var(--royal)", onConfirm: closeModal, onCancel: null });
  const showConfirm = (title, message, onConfirm, confirmText = "Confirm", confirmColor = "#dc2626") =>
    setModal({ show: true, title, message, confirmText, cancelText: "Cancel", confirmColor, onConfirm: () => { closeModal(); onConfirm(); }, onCancel: closeModal });

  useEffect(() => {
    if (seeAllBranches) supabase.from("branches").select("id,name").order("name").then(({ data }) => setBranches(data || []));
  }, [seeAllBranches]);

  useEffect(() => {
    if (userLoading || !user) return;
    const fetchCustomers = async () => {
      let q = supabase.from("profiles").select("id,first_name,last_name,phone").eq("role", "Customer").eq("status", "Active").order("first_name");
      if (!seeAllBranches && user.branchId) q = q.eq("branch_id", user.branchId);
      const { data } = await q;
      setCustomers(data || []);
    };
    fetchCustomers();
  }, [user, seeAllBranches, userLoading]);

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

  useEffect(() => { setCurrentPage(1); }, [search, filterDate, filterStatus]);

  const filtered = appts.filter(a => {
    const q = search.toLowerCase();
    if (isCustomer && user && a.user_id !== user.id) return false;
    return (
      (!search || `${a.patient} ${a.owner} ${a.vet}`.toLowerCase().includes(q)) &&
      (!filterDate || a.date === filterDate) &&
      (!filterStatus || a.status === filterStatus)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * ROWS_PER_PAGE, safePage * ROWS_PER_PAGE);

  const counts = {
    today: appts.filter(a => a.date === today).length,
    pending: appts.filter(a => a.status === "Pending").length,
    confirmed: appts.filter(a => a.status === "Confirmed").length,
    cancelled: appts.filter(a => a.status === "Cancelled").length,
  };

  const openBook = () => {
    setForm({ ...EMPTY, owner: isCustomer ? `${user.firstName} ${user.lastName}`.trim() : "", ownerId: isCustomer ? user.id : "" });
    setSelectedAppt(null); setEditMode(false); setConflictType(null); setShowBook(true);
  };

  const openEdit = (a) => {
    if (!canEdit(a)) {
      showAlert("Cannot Edit", a.status === "Confirmed" ? "Confirmed appointments cannot be edited." : a.status === "Completed" ? "Completed appointments cannot be modified." : "Cancelled appointments cannot be modified.");
      return;
    }
    setSelectedAppt(a); setForm({ ...EMPTY, ...a, ownerId: a.user_id || "" }); setEditMode(true); setConflictType(null); setShowBook(true); setShowView(false);
  };

  const LiveToast = ({ message, show, type = 'success' }) => {
    const colors = {
      success: { bg: '#1e293b', dot: '#22c55e' },
      error: { bg: '#7f1d1d', dot: '#ef4444' },
      info: { bg: '#1e3a8a', dot: '#60a5fa' },
      warning: { bg: '#78350f', dot: '#f59e0b' },
    };
    const c = colors[type] || colors.success;
    return (
      <div style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 99999,
        background: c.bg, color: '#fff', borderRadius: 10,
        padding: '11px 18px', fontSize: 13, fontWeight: 600,
        display: 'flex', alignItems: 'center', gap: 8,
        boxShadow: '0 8px 24px rgba(0,0,0,0.22)',
        opacity: show ? 1 : 0,
        transform: show ? 'translateY(0)' : 'translateY(10px)',
        transition: 'opacity 0.25s, transform 0.25s',
        pointerEvents: 'none', minWidth: 220,
      }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.dot, display: 'inline-block', flexShrink: 0 }} />
        {message}
      </div>
    );
  };

  const saveAppointment = async () => {
    if (!form.patient || !form.owner || !form.date || !form.time) { showAlert("Missing Fields", "Please fill in all required fields."); return; }
    if (form.purpose !== "Grooming" && !form.vet) { showAlert("Missing Fields", "Please select a veterinarian."); return; }
    if (conflictType) { showAlert("Time Slot Unavailable", "This time slot is already booked."); return; }

    let conflictQuery = supabase.from("appointments").select("id").eq("date", form.date).eq("time", form.time).in("status", ["Pending", "Confirmed"]);
    if (editMode && selectedAppt?.id) conflictQuery = conflictQuery.neq("id", selectedAppt.id);
    const { data: clashes } = await conflictQuery;
    if (clashes?.length) { showAlert("Time Slot Unavailable", "This slot was just booked by someone else."); await fetchAppts(); return; }

    const finalStatus = editMode ? form.status : (isAdmin ? "Confirmed" : "Pending");
    const payload = {
      patient: form.patient, owner: form.owner, user_id: form.ownerId || null,
      contact: form.contact, vet: form.purpose === "Grooming" ? "" : form.vet,
      date: form.date, time: form.time, purpose: form.purpose,
      species: form.species || null,
      notes: form.notes, status: finalStatus,
      ...(!editMode && !seeAllBranches && user?.branchId ? { branch_id: user.branchId } : {}),
      ...(!editMode && seeAllBranches && branchFilter ? { branch_id: Number(branchFilter) } : {}),
    };

    if (editMode) {
      const { error } = await supabase.from("appointments").update(payload).eq("id", selectedAppt.id);
      if (error) { showAlert("Error", error.message); return; }
    } else {
      const { error } = await supabase.from("appointments").insert([payload]);
      if (error) { showAlert("Error", error.message); return; }
    }
    setShowBook(false);
    if (editMode) {
      showToast('✓ Appointment updated successfully', 'success');
    } else if (isAdmin || isEmployee) {
      showToast('✓ Appointment confirmed successfully', 'success');
    } else {
      showToast('✓ Request submitted — awaiting staff approval', 'warning');
    }
  };

  const approveAppt = async (id) => {
    setApproving(true);
    const { error } = await supabase.from("appointments").update({ status: "Confirmed" }).eq("id", id);
    setApproving(false);
    if (error) { showAlert("Error", error.message); return; }
    showToast('✓ Appointment approved & locked', 'success');
  };

  const completeAppt = async (id) => {
    setCompleting(true);
    const { error } = await supabase.from("appointments").update({ status: "Completed" }).eq("id", id);
    setCompleting(false);
    if (error) { showAlert("Error", error.message); return; }
    showToast('✓ Appointment marked as completed', 'info');
  };

  const cancelAppt = (id) => showConfirm(
    "Cancel Appointment", "Are you sure you want to cancel this appointment?",
    async () => {
      const { error } = await supabase.from("appointments").update({ status: "Cancelled" }).eq("id", id);
      if (error) { showAlert("Error", error.message); return; }
      setShowView(false);
      showToast('Appointment cancelled', 'warning');
    },
    "Yes, Cancel", "#dc2626"
  );

  const showToast = (message, type = 'success') => {
    clearTimeout(toastTimerRef.current);
    setToast({ show: true, message, type });
    toastTimerRef.current = setTimeout(() => setToast(t => ({ ...t, show: false })), 3000);
  };

  const deleteAppt = (id) => showConfirm(
    "Delete Appointment", "Permanently delete this appointment?",
    async () => {
      const { error } = await supabase.from("appointments").delete().eq("id", id);
      if (error) { showAlert("Error", error.message); return; }
      setShowView(false);
      showToast('Appointment deleted', 'info');
    },
    "Yes, Delete", "#dc2626"
  );

  const changeMonth = dir => setCalMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + dir, 1));
  const calLabel = calMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const S = {
    btn: { width: "auto" },
    inp: { padding: "9px 12px", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 13, fontFamily: "inherit", background: "#fff", color: "var(--text)", outline: "none" },
    card: { background: "#fff", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", boxShadow: "var(--shadow)", width: "100%", marginBottom: 20 },
    th: { background: "var(--bg)", padding: "11px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" },
    td: { padding: "13px 14px", borderBottom: "1px solid var(--border)", color: "var(--text)", verticalAlign: "middle" },
  };

  const renderCalendar = () => {
    if (loading) return <CalendarSkeleton />;

    const days = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 0).getDate();
    const firstDay = new Date(calMonth.getFullYear(), calMonth.getMonth(), 1).getDay();
    const monthStr = `${calMonth.getFullYear()}-${String(calMonth.getMonth() + 1).padStart(2, "0")}`;
    const cells = [...Array(firstDay).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
          <div key={d} style={{ textAlign: "center", fontWeight: 700, fontSize: 12, color: "var(--muted)", padding: "8px 0" }}>{d}</div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const dateStr = `${monthStr}-${String(day).padStart(2, "0")}`;
          const dayAppts = appts.filter(a => {
            if (a.date !== dateStr) return false;
            if (!search) return true;
            const q = search.toLowerCase();
            return `${a.patient} ${a.owner} ${a.vet}`.toLowerCase().includes(q);
          });
          const isToday = dateStr === today;
          return (
            <div key={i} style={{ minHeight: 76, border: "1px solid var(--border)", borderRadius: 8, padding: 6, background: isToday ? "var(--light-blue)" : "#fff" }}>
              <div style={{ fontWeight: isToday ? 800 : 600, fontSize: 13, color: isToday ? "var(--royal)" : "var(--text)", marginBottom: 4 }}>{day}</div>
              {dayAppts.slice(0, 2).map(a => (
                <div key={a.id} onClick={() => { setSelectedAppt(a); setShowView(true); }}
                  style={{ fontSize: 10, padding: "2px 5px", borderRadius: 4, marginBottom: 2, cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", background: a.purpose === "Grooming" ? "#7c3aed" : a.status === "Pending" ? "#d97706" : "var(--royal)", color: "#fff" }}>
                  {a.time} {a.patient}
                </div>
              ))}
              {dayAppts.length > 2 && <div style={{ fontSize: 10, color: "var(--muted)" }}>+{dayAppts.length - 2} more</div>}
            </div>
          );
        })}
      </div>
    );
  };

  /* ── Full-page user loading state ── */
  if (userLoading) return (
    <Layout>
      <SkeletonStyle />
      <div className="topbar">
        <div className="topbar-title">
          <Skel w={32} h={32} style={{ borderRadius: 8, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <Skel w={160} h={20} style={{ marginBottom: 6 }} />
            <Skel w={220} h={13} />
          </div>
        </div>
      </div>
      <div className="content">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(195px,1fr))', gap: 14, marginBottom: 24 }}>
          {[1, 2, 3, 4].map(i => <StatCardSkeleton key={i} />)}
        </div>
        <div style={{ background: "#fff", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", boxShadow: "var(--shadow)", overflow: "hidden" }}>
          <div style={{ padding: "16px 22px", borderBottom: "1px solid var(--border)" }}>
            <Skel w={160} h={18} />
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>{["Patient", "Owner", "Veterinarian", "Date & Time", "Purpose", "Status", "Actions"].map(h => (
                <th key={h} style={S.th}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map(i => <TableRowSkeleton key={i} cols={7} />)}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );

  return (
    <Layout>
      <SkeletonStyle />
      <AppModal {...modal} />
      <LiveToast message={toast.message} show={toast.show} type={toast.type} />

      {/* ── TOPBAR ── */}
      <div className="topbar">
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
          <button className="btn btn-primary" onClick={openBook} style={{ ...S.btn, whiteSpace: "nowrap" }}>
            + {isCustomer ? "Book Appointment" : "New Appointment"}
          </button>
        </div>
      </div>

      {/* ── PAGE CONTENT ── */}
      <div className="content">
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
              { label: "Today's Appointments", value: counts.today,     icon: "/icon/calendar.png", color: "blue",   filter: "",          sub: "Scheduled today" },
              { label: "Pending Approval",      value: counts.pending,   icon: "/icon/pending.png",  color: "yellow", filter: "Pending",    sub: counts.pending > 0 ? "Needs attention" : "All cleared", subColor: counts.pending > 0 ? "#d97706" : undefined },
              { label: "Confirmed",             value: counts.confirmed, icon: "/icon/confirm.png",  color: "green",  filter: "Confirmed",  sub: "Approved & locked" },
              { label: "Cancelled",             value: counts.cancelled, icon: "/icon/cancel.png",   color: "red",    filter: "Cancelled",  sub: "Cancelled visits" },
            ].map((sc, i) => (
              <div key={i} className={`stat-card-v2 ${sc.color}`} style={{ cursor: 'pointer' }}
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
                    {sc.color === 'yellow' && sc.value > 0 && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
                    {sc.sub}
                  </span>
                </div>
              </div>
            ))
          }
        </div>

        {view === "list" && (
          <>
            <div style={{ ...S.card, padding: "14px 22px", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--bg)", border: "1.5px solid var(--border)", borderRadius: 8, padding: "8px 14px", flex: 1 }}>
                  <img src="/icon/search.png" alt="" style={{ width: 16, height: 16, filter: "brightness(0) saturate(100%) invert(40%)" }} />
                  <input type="text" placeholder="Search patient, vet, owner..." value={search} onChange={e => setSearch(e.target.value)} style={{ border: "none", background: "transparent", fontSize: 13, color: "var(--text)", outline: "none", fontFamily: "inherit", width: "100%" }} />
                </div>
                <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} style={{ ...S.inp, width: 160 }} />
                <div style={{ width: 140 }}>
                  <CustomSelect
                    value={filterStatus}
                    onChange={val => setFilterStatus(val)}
                    placeholder="All Status"
                    options={["Confirmed", "Pending", "Cancelled", "Completed"]}
                  />
                </div>
                {filterStatus && (
                  <button onClick={() => setFilterStatus("")} style={{ ...S.inp, padding: "9px 14px", cursor: "pointer", whiteSpace: "nowrap", color: "var(--muted)", fontSize: 12 }}>✕ Clear</button>
                )}
              </div>
            </div>

            <div style={S.card}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 22px", borderBottom: "1px solid var(--border)" }}>
                <h2 style={{ fontSize: 15, fontWeight: 700 }}>Appointments</h2>
                {loading
                  ? <Skel w={80} h={13} />
                  : <span style={{ color: "var(--muted)", fontSize: 13 }}>{filtered.length} records</span>
                }
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 780 }}>
                  <thead>
                    <tr>{["Patient", "Owner", "Veterinarian", "Date & Time", "Purpose", "Status", "Actions"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      [1, 2, 3, 4, 5, 6].map(i => <TableRowSkeleton key={i} cols={7} />)
                    ) : paginated.length === 0 ? (
                      <tr><td colSpan={7} style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>No appointments found</td></tr>
                    ) : paginated.map(a => {
                      const statusDotColor = { Confirmed: "#16a34a", Pending: "#d97706", Cancelled: "#dc2626", Completed: "#2563eb" }[a.status] || "#9ca3af";
                      const ownerInitials = (a.owner || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
                      const purposeStyle = {
                        Grooming: { bg: "#f3e8ff", color: "#6d28d9" },
                        Emergency: { bg: "#fee2e2", color: "#dc2626" },
                        Surgery: { bg: "#fff7ed", color: "#c2410c" },
                        Vaccination: { bg: "#f0fdf4", color: "#15803d" },
                        Dental: { bg: "#eff6ff", color: "#1d4ed8" },
                        Checkup: { bg: "#f8fafc", color: "#475569" },
                        "Follow-up": { bg: "#fefce8", color: "#a16207" },
                      }[a.purpose] || { bg: "#f8fafc", color: "#475569" };
                      return (
                        <tr key={a.id} style={{ cursor: "pointer", background: !canEdit(a) ? "#fafafa" : "#fff" }}
                          onClick={() => { setSelectedAppt(a); setShowView(true); }}>
                          {/* Patient */}
                          <td style={S.td}>
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
                          <td style={S.td}>
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
                          <td style={S.td}>
                            {a.purpose === "Grooming"
                              ? <span style={{ fontSize: 11, background: "#f3e8ff", color: "#7c3aed", borderRadius: 6, padding: "3px 9px", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><line x1="20" y1="4" x2="8.12" y2="15.88" /><line x1="14.47" y1="14.48" x2="20" y2="20" /><line x1="8.12" y1="8.12" x2="12" y2="12" /></svg>
                                Grooming
                              </span>
                              : <span style={{ fontSize: 13 }}>{a.vet || "—"}</span>}
                          </td>
                          {/* Date & Time */}
                          <td style={S.td}>
                            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "4px 10px" }}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                              <div>
                                <div style={{ fontWeight: 600, fontSize: 12, color: "#1e40af" }}>{a.date}</div>
                                <div style={{ fontSize: 11, color: "#3b82f6" }}>{a.time}</div>
                              </div>
                            </div>
                          </td>
                          {/* Purpose */}
                          <td style={S.td}>
                            <span style={{ fontSize: 11, padding: "3px 9px", borderRadius: 6, fontWeight: 600, background: purposeStyle.bg, color: purposeStyle.color }}>
                              {a.purpose}
                            </span>
                          </td>
                          {/* Status */}
                          <td style={S.td}>
                            <span className={`badge ${STATUS_BADGE[a.status] || "badge-gray"}`} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                              <span style={{ width: 6, height: 6, borderRadius: "50%", background: statusDotColor, flexShrink: 0, display: "inline-block" }} />
                              {a.status}
                            </span>
                          </td>
                          {/* Actions */}
                         <td style={{ ...S.td, textAlign: "left", padding: "8px 14px" }} onClick={e => e.stopPropagation()}>
                            <div style={{ display: "flex", gap: 6, justifyContent: "flex-start", alignItems: "center" }}>
                              {/* View */}
                              <button title="View" className="btn btn-sm" style={{ ...S.btn, height: 28, padding: "0 10px", gap: 5, display: "inline-flex", alignItems: "center", justifyContent: "center", background: "#eff6ff", border: "1.5px solid #bfdbfe", color: "#1d4ed8", borderRadius: 20, fontSize: 11, fontWeight: 600 }}
                                onClick={() => { setSelectedAppt(a); setShowView(true); }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                View
                              </button>
                              {/* Approve */}
                              {a.status === "Pending" && (isAdmin || isEmployee) && (
                                <button title="Approve" className="btn btn-sm" style={{ ...S.btn, height: 28, padding: "0 10px", gap: 5, display: "inline-flex", alignItems: "center", justifyContent: "center", background: "#f0fdf4", border: "1.5px solid #86efac", color: "#16a34a", borderRadius: 20, fontSize: 11, fontWeight: 600 }}
                                  onClick={() => showConfirm("Approve Appointment", `Approve appointment for ${a.patient} on ${a.date} at ${a.time}?`, () => approveAppt(a.id), "Approve & Lock", "#16a34a")}>
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                                  Approve
                                </button>
                              )}
                              {/* Edit */}
                              {canEdit(a) && (
                                <button title="Edit" className="btn btn-sm" style={{ ...S.btn, height: 28, padding: "0 10px", gap: 5, display: "inline-flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", border: "1.5px solid #e2e8f0", color: "#475569", borderRadius: 20, fontSize: 11, fontWeight: 600 }}
                                  onClick={() => openEdit(a)}>
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                  Edit
                                </button>
                              )}
                              {/* Mark Complete */}
                              {a.status === "Confirmed" && (isAdmin || isEmployee) && (
                                <button title="Mark Complete" className="btn btn-sm" style={{ ...S.btn, height: 28, padding: "0 10px", gap: 5, display: "inline-flex", alignItems: "center", justifyContent: "center", background: "#eff6ff", border: "1.5px solid #93c5fd", color: "#1e3a8a", borderRadius: 20, fontSize: 11, fontWeight: 600 }}
                                  onClick={() => showConfirm("Mark Complete", `Mark ${a.patient}'s appointment as completed?`, () => completeAppt(a.id), "Mark Complete", "#1e3a8a")}>
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                                  Done
                                </button>
                              )}
                              {/* Cancel */}
                              {(a.status === "Pending" || a.status === "Confirmed") && (
                                <button title="Cancel" className="btn btn-sm" style={{ ...S.btn, height: 28, padding: "0 10px", gap: 5, display: "inline-flex", alignItems: "center", justifyContent: "center", background: "#fef2f2", border: "1.5px solid #fca5a5", color: "#dc2626", borderRadius: 20, fontSize: 11, fontWeight: 600 }}
                                  onClick={() => cancelAppt(a.id)}>
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
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
                    style={{ width: 34, height: 34, borderRadius: 20, border: "1.5px solid", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
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
          <div style={S.card}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 22px", borderBottom: "1px solid var(--border)", gap: 12, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button onClick={() => changeMonth(-1)} style={{ padding: "6px 14px", border: "1px solid var(--border)", borderRadius: 8, background: "#fff", cursor: "pointer", fontSize: 16, fontFamily: "inherit", color: "var(--text)", fontWeight: 700, width: "auto" }}>‹</button>
                <span style={{ fontSize: 16, fontWeight: 700, minWidth: 180, textAlign: "center" }}>{calLabel}</span>
                <button onClick={() => changeMonth(1)} style={{ padding: "6px 14px", border: "1px solid var(--border)", borderRadius: 8, background: "#fff", cursor: "pointer", fontSize: 16, fontFamily: "inherit", color: "var(--text)", fontWeight: 700, width: "auto" }}>›</button>
                <button onClick={() => setCalMonth(new Date())} style={{ padding: "7px 16px", border: "1px solid var(--border)", borderRadius: 8, background: "#fff", cursor: "pointer", fontSize: 13, fontFamily: "inherit", fontWeight: 600, width: "auto" }}>Today</button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--bg)", border: "1.5px solid var(--border)", borderRadius: 8, padding: "8px 14px", minWidth: 220 }}>
                <img src="/icon/search.png" alt="" style={{ width: 15, height: 15, filter: "brightness(0) saturate(100%) invert(40%)" }} />
                <input type="text" placeholder="Search patient or owner..." value={search} onChange={e => setSearch(e.target.value)}
                  style={{ border: "none", background: "transparent", fontSize: 13, color: "var(--text)", outline: "none", fontFamily: "inherit", width: "100%" }} />
                {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: 14, lineHeight: 1, padding: 0, fontFamily: "inherit" }}>✕</button>}
              </div>
            </div>
            {/* Legend */}
            <div style={{ display: "flex", gap: 14, padding: "10px 22px", borderBottom: "1px solid var(--border)", flexWrap: "wrap" }}>
              {[
                { color: "var(--royal)", label: "Confirmed" },
                { color: "#d97706", label: "Pending" },
                { color: "#7c3aed", label: "Grooming" },
                { color: "#dc2626", label: "Emergency" },
              ].map(({ color, label }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: color, display: "inline-block" }} />
                  <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>{label}</span>
                </div>
              ))}
              {search && (
                <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--royal)", fontWeight: 600 }}>
                  Highlighting: "{search}"
                </span>
              )}
            </div>
            <div style={{ padding: 20 }}>{renderCalendar()}</div>
          </div>
        )}

        {/* ══ BOOK / EDIT MODAL ══ */}
        {showBook && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 16, overflowY: "auto" }}>
            <div style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 620, maxHeight: "calc(100vh - 32px)", display: "flex", flexDirection: "column", boxShadow: "0 24px 64px rgba(0,0,0,0.28)", overflow: "hidden", margin: "auto" }}>

              {/* ── Clipboard top bar ── */}
              <div style={{ background: "linear-gradient(135deg, #0f172a, #1e3a8a)", padding: "10px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", borderRadius: "14px 14px 0 0", flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {/* Clipboard clip */}
                  <div style={{ width: 48, height: 18, background: "rgba(255,255,255,0.25)", borderRadius: 4, border: "2px solid rgba(255,255,255,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ width: 20, height: 8, background: "rgba(255,255,255,0.4)", borderRadius: 2 }} />
                  </div>
                </div>
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

                {/* Section 1: Patient & Service */}
                <div style={{ borderBottom: "1.5px solid #e2e8f0" }}>
                  <div style={{ background: "#f1f5f9", borderBottom: "1px solid #e2e8f0", padding: "6px 16px" }}>
                    <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px", color: "#64748b", display: "inline-flex", alignItems: "center", gap: 5 }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="7" cy="10" r="2" /><circle cx="17" cy="10" r="2" /><circle cx="4" cy="6" r="1.5" /><circle cx="20" cy="6" r="1.5" /><path d="M12 14c-3.3 0-6 2-6 4.5h12c0-2.5-2.7-4.5-6-4.5z" /></svg>
                      Patient &amp; Service
                    </span>
                  </div>

                  {/* Row 1: Patient Name · Purpose */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: "1px solid #e2e8f0" }}>
                    <div style={{ padding: "10px 16px", borderRight: "1px solid #e2e8f0" }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>
                        Patient Name <span style={{ color: "#ef4444" }}>*</span>
                      </div>
                      <input
                        type="text" value={form.patient}
                        onChange={e => setForm({ ...form, patient: e.target.value })}
                        placeholder="e.g. Buddy"
                        style={{ width: "100%", border: "none", borderBottom: "1.5px solid #cbd5e1", background: "transparent", fontSize: 13, fontWeight: 600, color: "var(--text)", outline: "none", padding: "2px 0", fontFamily: "inherit", boxSizing: "border-box" }}
                      />
                    </div>
                    <div style={{ padding: "10px 16px" }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>Purpose</div>
                      <CustomSelect
                        value={form.purpose}
                        onChange={val => setForm({ ...form, purpose: val, vet: val === "Grooming" ? "" : form.vet })}
                        placeholder="— Select Purpose —"
                        options={["Checkup", "Vaccination", "Surgery", "Grooming", "Dental", "Emergency", "Follow-up"]}
                      />
                    </div>
                  </div>

                  {/* Row 1b: Species */}
                  <div style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <div style={{ padding: "10px 16px" }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>Species</div>
                      <CustomSelect
                        value={form.species}
                        onChange={val => setForm({ ...form, species: val })}
                        placeholder="— Select Species —"
                        options={["Dog", "Cat"]}
                      />
                    </div>
                  </div>

                  {/* Row 2: Veterinarian (or Grooming notice) */}
                  <div style={{ borderBottom: "1px solid #e2e8f0" }}>
                    {form.purpose !== "Grooming" ? (
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
                      </div>
                    ) : (
                      <div style={{ padding: "10px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: "#f3e8ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round"><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><line x1="20" y1="4" x2="8.12" y2="15.88" /><line x1="14.47" y1="14.48" x2="20" y2="20" /><line x1="8.12" y1="8.12" x2="12" y2="12" /></svg>
                        </div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "#6b21a8" }}>Grooming Service</div>
                          <div style={{ fontSize: 11, color: "#9333ea" }}>Handled by our dedicated grooming team — no vet required.</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Section 2: Schedule */}
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
                      <input
                        type="date" value={form.date} min={today}
                        onChange={e => setForm({ ...form, date: e.target.value })}
                        style={{ width: "100%", border: "none", borderBottom: "1.5px solid #cbd5e1", background: "transparent", fontSize: 13, fontWeight: 600, color: "var(--text)", outline: "none", padding: "2px 0", fontFamily: "inherit", boxSizing: "border-box" }}
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

                {/* Section 3: Owner / Contact */}
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
                            setForm({ ...form, ownerId: sel?.id || "", owner: sel ? `${sel.first_name} ${sel.last_name}`.trim() : "", contact: sel?.phone || "" });
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
                        onChange={e => setForm({ ...form, contact: e.target.value })}
                        placeholder="e.g. 0917-000-0000"
                        style={{ width: "100%", border: "none", borderBottom: "1.5px solid #cbd5e1", background: "transparent", fontSize: 13, fontWeight: 600, color: "var(--text)", outline: "none", padding: "2px 0", fontFamily: "inherit", boxSizing: "border-box" }}
                      />
                    </div>
                  </div>
                </div>

                {/* Section 4: Notes */}
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

                {/* Footer watermark */}
                <div style={{ padding: "6px 16px", background: "var(--bg)" }}>
                  <p style={{ margin: 0, fontSize: 10, color: "var(--muted)", textAlign: "right", fontStyle: "italic" }}>Angeles Animal Care Hospital</p>
                </div>
              </div>

              {/* ── Modal footer ── */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "14px 24px", borderTop: "2px solid #e2e8f0", background: "#f8fafc", flexShrink: 0 }}>
                <button className="btn btn-ghost" style={S.btn} onClick={() => setShowBook(false)}>Cancel</button>
                <button
                  className="btn btn-primary"
                  style={{ ...S.btn, background: "#0f172a", borderColor: "#0f172a", opacity: conflictType ? 0.5 : 1, cursor: conflictType ? "not-allowed" : "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}
                  onClick={saveAppointment}
                  disabled={!!conflictType}
                >
                  {editMode ? "Save Changes" : isAdmin
                    ? <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg> File Appointment</>
                    : "Submit Request"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══ VIEW MODAL ══ */}
        {showView && selectedAppt && (() => {
          const statusConfig = {
            Pending:   { hero: "linear-gradient(135deg, #78350f, #d97706)", badge: "#fef3c7", badgeText: "#92400e", border: "#fde68a", dot: "#d97706" },
            Confirmed: { hero: "linear-gradient(135deg, #14532d, #16a34a)", badge: "#dcfce7", badgeText: "#14532d", border: "#86efac", dot: "#16a34a" },
            Cancelled: { hero: "linear-gradient(135deg, #7f1d1d, #dc2626)", badge: "#fee2e2", badgeText: "#991b1b", border: "#fca5a5", dot: "#dc2626" },
            Completed: { hero: "linear-gradient(135deg, #1e3a8a, #2563eb)", badge: "#dbeafe", badgeText: "#1e3a8a", border: "#93c5fd", dot: "#2563eb" },
          };
          const cfg = statusConfig[selectedAppt.status] || statusConfig.Pending;
          const purposeStyle = {
            Grooming:    { bg: "#f3e8ff", color: "#6d28d9", icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg> },
            Emergency:   { bg: "#fee2e2", color: "#dc2626", icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> },
            Surgery:     { bg: "#fff7ed", color: "#c2410c", icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14.5 4.5L19.5 9.5L12 17L8 13L14.5 4.5Z"/><path d="M9 15L4.5 19.5"/><path d="M14.5 9.5L11 13"/></svg> },
            Vaccination: { bg: "#f0fdf4", color: "#15803d", icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="2" x2="12" y2="6"/><path d="M12 14v8"/><path d="M8 10c0-2.2 1.8-4 4-4s4 1.8 4 4"/></svg> },
            Dental:      { bg: "#eff6ff", color: "#1d4ed8", icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2C9 2 6 4 6 7c0 3 1 5 2 7s1.5 5 4 5 3-2 4-5 2-4 2-7c0-3-3-5-6-5z"/></svg> },
            Checkup:     { bg: "#f8fafc", color: "#475569", icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg> },
            "Follow-up": { bg: "#fefce8", color: "#a16207", icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.08-4.43"/></svg> },
          }[selectedAppt.purpose] || { bg: "#f8fafc", color: "#475569", icon: null };

          return (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 16 }}>
              <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 520, maxHeight: "92vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 64px rgba(0,0,0,0.30)", overflow: "hidden" }}>

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
                            ? <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" strokeLinecap="round"><path d="M12 5c-4.4 0-8 3.1-8 7 0 2.4 1.3 4.5 3.3 5.8L6 21h12l-1.3-3.2C18.7 16.5 20 14.4 20 12c0-3.9-3.6-7-8-7z"/><path d="M5 5 3 1l3 3M19 5l2-4-3 3"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/></svg>
                            : <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" strokeLinecap="round"><path d="M10 5.172C10 3.782 8.423 2.679 6.5 3c-2 .336-3.5 2.112-3.5 4v3a3 3 0 0 0 6 0V5.172zM14 5.172C14 3.782 15.577 2.679 17.5 3c2 .336 3.5 2.112 3.5 4v3a3 3 0 0 0-6 0V5.172z"/><path d="M8 14v.5M16 14v.5M11.25 16.25h1.5L12 17z"/><path d="M4.42 11.247A13.152 13.152 0 0 0 4 14.556C4 18.728 7.582 21 12 21s8-2.272 8-6.444c0-1.061-.162-2.2-.493-3.309"/></svg>
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
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
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
                    <div style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "12px 16px", marginBottom: 18, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
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
                            <button className="btn btn-sm" style={{ ...S.btn, background: "#16a34a", color: "#fff", border: "none", display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12 }} disabled={approving} onClick={() => approveAppt(selectedAppt.id)}>
                              {approving ? "Approving…" : <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>Approve</>}
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
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
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
                      { label: "Owner", value: selectedAppt.owner || "—", icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
                      { label: "Contact", value: selectedAppt.contact || "—", icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5 19.79 19.79 0 0 1 1.6 4.9 2 2 0 0 1 3.58 2.72h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.1a16 16 0 0 0 6 6z"/></svg> },
                      { label: "Species", value: selectedAppt.species || "—", icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round"><circle cx="7" cy="10" r="2"/><circle cx="17" cy="10" r="2"/><path d="M12 14c-3.3 0-6 2-6 4.5h12c0-2.5-2.7-4.5-6-4.5z"/></svg> },
                      { label: "Service By", value: selectedAppt.purpose === "Grooming" ? "Grooming Team" : (selectedAppt.vet || "—"), icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
                    ].map(({ label, value, icon }) => (
                      <div key={label} style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "10px 12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
                          {icon}
                          <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: "#94a3b8" }}>{label}</span>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>{value}</span>
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
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                        Notes
                      </p>
                      <p style={{ margin: 0, fontSize: 13, color: "#78350f", lineHeight: 1.6 }}>{selectedAppt.notes}</p>
                    </div>
                  )}
                </div>

                {/* ── Footer ── */}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "14px 24px", borderTop: "1.5px solid #e2e8f0", background: "#f8fafc", flexShrink: 0 }}>
                  <button className="btn btn-ghost" style={S.btn} onClick={() => setShowView(false)}>Close</button>
                  {canEdit(selectedAppt) && (
                    <button className="btn btn-ghost" style={S.btn} onClick={() => openEdit(selectedAppt)}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 5 }}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
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