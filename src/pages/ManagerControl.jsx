import React, { useState, useEffect, useCallback } from "react";
import Layout from "../components/layout";
import { supabase } from "../js/supabase";
import { useCurrentUser } from "../js/useCurrentUser";

// ── Helpers ───────────────────────────────────────────────────────────────────
const ROLE_BADGE = {
  admin: "badge-purple", manager: "badge-blue", employee: "badge-green", customer: "badge-gray",
  Admin: "badge-purple", Manager: "badge-blue", Employee: "badge-green", Customer: "badge-gray",
};
const AVATAR_COLORS = {
  Admin:    { bg: "#ede9fe", color: "#6d28d9" },
  Manager:  { bg: "#dbeafe", color: "#1d4ed8" },
  Employee: { bg: "#dcfce7", color: "#15803d" },
  Customer: { bg: "#f3f4f6", color: "#4b5563" },
};

const generateEmail = (firstName, role = "", branch = "", existingEmails = []) => {
  const base       = (firstName || "user").trim().toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9]/g, "");
  const branchSlug = String(branch || "").toLowerCase().replace(/\s+/g, "");
  let domain;
  if (role === "Customer") {
    domain = branchSlug.includes("sanfernando") || branchSlug.includes("sf") ? "sf.customer.com"
           : branchSlug.includes("mabalacat")                                 ? "mab.customer.com"
           : "customer.com";
  } else {
    domain = branchSlug.includes("sanfernando") || branchSlug.includes("sf") ? "sf.vetcare.com"
           : branchSlug.includes("mabalacat")                                 ? "mab.vetcare.com"
           : "vetcare.com";
  }
  const existing = existingEmails.map(e => e?.toLowerCase());
  let email = `${base}@${domain}`;
  let counter = 1;
  while (existing.includes(email)) { email = `${base}${counter}@${domain}`; counter++; }
  return email;
};

const generatePassword = () => {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ", lower = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789", special = "!@#$%&*";
  const all  = upper + lower + digits + special;
  const pick = s => s[Math.floor(Math.random() * s.length)];
  const arr  = [pick(upper), pick(lower), pick(digits), pick(special), ...Array.from({ length: 4 }, () => pick(all))];
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr.join("");
};

const fmtDate = str => str ? new Date(str).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
const fmtTime = d => {
  const pad = n => String(n).padStart(2, "0");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const generateLogs = (users) => {
  const actions = ["Logged in","Viewed dashboard","Updated patient record","Edited appointment","Viewed reports","Updated inventory","Logged out"];
  const logs = []; const now = new Date();
  users.slice(0, 12).forEach((u, i) => {
    const count = Math.floor(Math.random() * 3) + 1;
    for (let j = 0; j < count; j++) {
      const minsAgo = Math.floor(Math.random() * 1440);
      const ts = new Date(now - minsAgo * 60000);
      logs.push({ id: `${u.id}-${j}`, user: u, action: actions[Math.floor(Math.random() * actions.length)], timestamp: ts, ip: `192.168.${Math.floor(Math.random() * 5)}.${Math.floor(Math.random() * 254) + 1}`, status: Math.random() > 0.08 ? "Success" : "Failed" });
    }
  });
  return logs.sort((a, b) => b.timestamp - a.timestamp);
};

// ── Sub-components ────────────────────────────────────────────────────────────
const Avatar = ({ firstName, lastName, role, size = 36 }) => {
  const initials = [firstName, lastName].filter(Boolean).map(n => n.charAt(0).toUpperCase()).join("") || "?";
  const palette  = AVATAR_COLORS[role] || { bg: "#f3f4f6", color: "#4b5563" };
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: palette.bg, color: palette.color, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: size * 0.38, flexShrink: 0, border: `1.5px solid ${palette.color}22`, userSelect: "none" }}>
      {initials}
    </div>
  );
};

const ConfirmModal = ({ show, title, message, onConfirm, onCancel, confirmLabel = "Confirm", type = "primary" }) => {
  if (!show) return null;
  const colors = { primary: "#2563eb", danger: "#dc2626", success: "#16a34a" };
  const color  = colors[type] || colors.primary;
  return (
    <>
      <div onClick={onCancel} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1050 }} />
      <div style={{ position: "fixed", inset: 0, zIndex: 1055, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, pointerEvents: "none" }}>
        <div style={{ width: "100%", maxWidth: 480, pointerEvents: "all" }}>
          <div style={{ background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>
            <div style={{ backgroundColor: color, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h5 style={{ color: "#fff", fontWeight: 700, fontSize: 15, margin: 0 }}>{title}</h5>
              <button onClick={onCancel} style={{ background: "none", border: "none", color: "#fff", fontSize: 18, cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ padding: "20px 20px 8px" }}>
              <p style={{ margin: 0, fontSize: 14, color: "#374151", lineHeight: 1.6 }}>{message}</p>
            </div>
            <div style={{ padding: "12px 20px 16px", display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={onCancel} style={{ background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 18px", fontFamily: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#374151" }}>Cancel</button>
              <button onClick={onConfirm} style={{ backgroundColor: color, color: "#fff", border: "none", borderRadius: 8, padding: "8px 22px", fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{confirmLabel}</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

const PendingCard = ({ req, onApprove, onReject }) => (
  <div style={{ background: "#fffbeb", border: "1.5px solid #fde68a", borderRadius: 12, padding: "16px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <Avatar firstName={req.first_name} lastName={req.last_name} role={req.role || "Employee"} size={42} />
      <div>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#1e293b" }}>{[req.first_name, req.last_name].filter(Boolean).join(" ") || "—"}</p>
        <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>{req.email}</p>
        <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
          <span className={`badge ${ROLE_BADGE[req.role] || "badge-gray"}`} style={{ fontSize: 10 }}>{req.role}</span>
          <span style={{ fontSize: 10, background: "#fee2e2", color: "#991b1b", borderRadius: 99, padding: "1px 8px", fontWeight: 700 }}>Awaiting Admin Approval</span>
        </div>
        <p style={{ margin: "4px 0 0", fontSize: 11, color: "#94a3b8" }}>Requested {fmtDate(req.created_at)} · by Manager</p>
      </div>
    </div>
    <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
      <button onClick={() => onApprove(req)} style={{ padding: "7px 16px", borderRadius: 8, border: "none", background: "#16a34a", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>✓ Approve</button>
      <button onClick={() => onReject(req)}  style={{ padding: "7px 16px", borderRadius: 8, border: "1px solid #fca5a5", background: "#fef2f2", color: "#dc2626", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>✕ Reject</button>
    </div>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
const ManagerControl = () => {
  // ── useCurrentUser replaces readUserInfo + useBranchTables ────────────────
  const { user, isAdmin, seeAllBranches, loading: userLoading } = useCurrentUser();

  const [branchName, setBranchName] = useState("");

  // Fetch branch name from branches table using user.branchId
  useEffect(() => {
    if (!user?.branchId) return;
    supabase.from("branches").select("name").eq("id", user.branchId).single()
      .then(({ data }) => { if (data?.name) setBranchName(data.name); });
  }, [user?.branchId]);

  const branchLabel = branchName ? `${branchName} Branch` : "Main Branch";

  const [users,        setUsers]        = useState([]);
  const [pending,      setPending]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [tab,          setTab]          = useState("users");
  const [search,       setSearch]       = useState("");
  const [roleFilter,   setRoleFilter]   = useState("");
  const [logs,         setLogs]         = useState([]);
  const [logSearch,    setLogSearch]    = useState("");
  const [logRole,      setLogRole]      = useState("");
  const [saving,       setSaving]       = useState(false);
  const [confirm,      setConfirm]      = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [addErrors,    setAddErrors]    = useState({});
  const [addForm,      setAddForm]      = useState({
    first_name: "", last_name: "", email: "", password: "",
    role: "Employee", status: "Pending Approval", emailLocked: false,
  });

  // ── Fetch users — branch-scoped ───────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    let q = supabase.from("profiles").select("*").order("created_at", { ascending: false });
    if (!seeAllBranches && user.branchId) q = q.eq("branch_id", user.branchId);
    const { data, error } = await q;
    if (!error) { const fetched = data || []; setUsers(fetched); setLogs(generateLogs(fetched)); }
    setLoading(false);
  }, [user, seeAllBranches]);

  // ── Fetch pending — branch-scoped ─────────────────────────────────────────
  const fetchPending = useCallback(async () => {
    if (!user) return;
    let q = supabase.from("pending_users").select("*").eq("status", "pending").order("created_at", { ascending: false });
    if (!seeAllBranches && user.branchId) q = q.eq("branch_id", user.branchId);
    const { data, error } = await q;
    if (!error) setPending(data || []);
  }, [user, seeAllBranches]);

  useEffect(() => {
    if (userLoading || !user) return;
    fetchUsers();
    fetchPending();
  }, [fetchUsers, fetchPending, userLoading, user]);

  // ── Show loading/login guard ───────────────────────────────────────────────
  if (userLoading) return <Layout><div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>Loading…</div></Layout>;
  if (!user) return (
    <Layout>
      <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Please log in</h2>
        <p style={{ fontSize: 13 }}>Your session could not be detected. Please sign in again.</p>
      </div>
    </Layout>
  );

  const fullName = u => {
    if (u.first_name || u.last_name) return `${u.first_name || ""} ${u.last_name || ""}`.trim();
    return u.name || "—";
  };

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    return (!search || `${fullName(u)} ${u.email || ""}`.toLowerCase().includes(q)) && (!roleFilter || u.role === roleFilter);
  });

  const filteredLogs = logs.filter(l => {
    const q = logSearch.toLowerCase(); const name = fullName(l.user).toLowerCase();
    return (!logSearch || name.includes(q) || l.action.toLowerCase().includes(q) || l.ip.includes(q)) && (!logRole || l.user.role === logRole);
  });

  const counts = {
    total:   users.length,
    active:  users.filter(u => u.status === "Active").length,
    pending: pending.length,
    staff:   users.filter(u => (u.role || "").toLowerCase() !== "customer").length,
  };

  const openAddModal = () => {
    const pwd = generatePassword();
    setAddForm({ first_name: "", last_name: "", email: "", password: pwd, role: "Employee", status: "Pending Approval", emailLocked: false });
    setAddErrors({}); setShowPassword(false); setShowAddModal(true);
  };

  const handleFirstNameChange = (val) => {
    const existingEmails = users.map(u => u.email?.toLowerCase()).filter(Boolean);
    setAddForm(f => ({ ...f, first_name: val, email: f.emailLocked ? f.email : generateEmail(val, f.role, branchLabel, existingEmails) }));
    setAddErrors(er => ({ ...er, first_name: "", email: "" }));
  };

  const handleEmailChange = (val) => {
    setAddForm(f => ({ ...f, email: val, emailLocked: true }));
    setAddErrors(er => ({ ...er, email: "" }));
  };

  const regeneratePassword = () => setAddForm(f => ({ ...f, password: generatePassword() }));

  const validateAdd = () => {
    const errs = {};
    if (!addForm.first_name.trim()) errs.first_name = "First name is required";
    if (!addForm.last_name.trim())  errs.last_name  = "Last name is required";
    if (!addForm.email.trim())      errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addForm.email)) errs.email = "Invalid email address";
    else if (users.some(u => u.email?.toLowerCase() === addForm.email.toLowerCase())) errs.email = "Email already exists";
    if (!addForm.password.trim()) errs.password = "Password is required";
    return errs;
  };

  const handleSubmitRequest = async () => {
    const errs = validateAdd();
    if (Object.keys(errs).length) { setAddErrors(errs); return; }
    setSaving(true);
    const { error } = await supabase.from("pending_users").insert([{
      first_name:    addForm.first_name.trim(),
      last_name:     addForm.last_name.trim(),
      email:         addForm.email.trim().toLowerCase(),
      role:          addForm.role,
      password_hint: addForm.password,
      branch_id:     user.branchId ?? null,      // ── branch filter ──
      branch:        branchLabel,
      requested_by:  user.fullName || user.email,
      status:        "pending",
    }]);
    setSaving(false);
    if (error) { alert("Error: " + error.message); return; }
    setShowAddModal(false);
    fetchPending();
    alert(`✅ Account request submitted!\n\nYour request for ${addForm.first_name} ${addForm.last_name} has been sent to the Admin for approval.`);
  };

  const handleApprove = (req) => {
    setConfirm({
      title: "Approve Account Request",
      message: `Create account for ${[req.first_name, req.last_name].filter(Boolean).join(" ")} (${req.email}) with role "${req.role}"?`,
      type: "success", confirmLabel: "Approve & Create",
      onConfirm: async () => {
        setConfirm(null);
        const { error } = await supabase.from("profiles").insert([{
          first_name: req.first_name, last_name: req.last_name,
          email: req.email, role: req.role, status: "Active",
          branch_id: req.branch_id ?? user.branchId ?? null,   // ── branch filter ──
        }]);
        if (error) { alert("Error creating account: " + error.message); return; }
        await supabase.from("pending_users").update({ status: "approved" }).eq("id", req.id);
        fetchUsers(); fetchPending();
        alert(`✅ Account for ${req.first_name} ${req.last_name} has been created successfully!`);
      },
    });
  };

  const handleReject = (req) => {
    setConfirm({
      title: "Reject Request",
      message: `Reject the account request for ${[req.first_name, req.last_name].filter(Boolean).join(" ")}? This cannot be undone.`,
      type: "danger", confirmLabel: "Reject",
      onConfirm: async () => {
        setConfirm(null);
        await supabase.from("pending_users").update({ status: "rejected" }).eq("id", req.id);
        fetchPending();
      },
    });
  };

  const handleDeleteUser = (u) => {
    setConfirm({
      title: "Delete User",
      message: `Permanently delete ${fullName(u)} (${u.email})? This cannot be undone.`,
      type: "danger", confirmLabel: "Delete",
      onConfirm: async () => {
        setConfirm(null);
        const { error } = await supabase.from("profiles").delete().eq("id", u.id);
        if (error) { alert("Error: " + error.message); return; }
        fetchUsers();
      },
    });
  };

  const S = {
    page:   { width: "100%", minHeight: "100vh", display: "block" },
    topbar: { background: "#fff", borderBottom: "1px solid var(--border)", padding: "14px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "fixed", top: "var(--topbar-h)", zIndex: 99, width: "100%", boxSizing: "border-box", gap: 12 },
    cont:   { padding: "24px 28px", paddingTop: "calc(var(--topbar-h) + var(--pagetop-h) + 20px)", width: "100%", boxSizing: "border-box" },
    th:     { background: "var(--bg)", padding: "11px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: "1px solid var(--border)" },
    td:     { padding: "13px 14px", borderBottom: "1px solid var(--border)", color: "var(--text)", verticalAlign: "middle" },
    btn:    { width: "auto" },
    inp:    { padding: "9px 12px", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 13, fontFamily: "inherit", background: "#fff", color: "var(--text)", outline: "none" },
    inpErr: { padding: "9px 12px", border: "1.5px solid #f87171", borderRadius: 8, fontSize: 13, fontFamily: "inherit", background: "#fff", color: "var(--text)", outline: "none" },
    errMsg: { fontSize: 11, color: "#dc2626", marginTop: 4 },
  };

  return (
    <Layout>
      <div style={S.page}>
        <div style={S.topbar}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src="/icon/manager.png" alt="" style={{ width: 22, height: 22, filter: "brightness(0) saturate(100%) invert(17%) sepia(82%) saturate(1200%) hue-rotate(210deg)" }} />
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", margin: 0 }}>Manager Control</h1>
              <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>{branchLabel} · User management &amp; access logs</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 6, background: "#dbeafe", color: "#1e3a8a", border: "1px solid #bfdbfe" }}>
              🛡 {isAdmin ? "Admin" : "Manager"} Mode · {branchLabel}
            </span>
          </div>
        </div>

        <div style={S.cont}>
          {/* Stat cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 24 }}>
            {[
              { label: "Total Users",      value: counts.total,   icon: "/icon/total_user.png", color: "blue"   },
              { label: "Active",           value: counts.active,  icon: "/icon/active_acc.png", color: "green"  },
              { label: "Pending Approval", value: counts.pending, icon: "/icon/pending.png",    color: "yellow" },
              { label: "Staff",            value: counts.staff,   icon: "/icon/staff.png",      color: "purple" },
            ].map((sc, i) => (
              <div key={i} className="stat-card">
                <div className={`stat-icon-box ${sc.color}`}><img src={sc.icon} alt={sc.label} className="stat-box-img" /></div>
                <div className="stat-info"><p>{sc.label}</p><h3>{sc.value}</h3></div>
              </div>
            ))}
          </div>

          {/* Pending banner */}
          {pending.length > 0 && (
            <div style={{ background: "#fffbeb", border: "1.5px solid #fde68a", borderRadius: 10, padding: "12px 20px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 20 }}>⏳</span>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "#92400e" }}>{pending.length} Account Request{pending.length > 1 ? "s" : ""} Awaiting Admin Approval</p>
                  <p style={{ margin: 0, fontSize: 12, color: "#b45309" }}>These requests need an Admin to approve before accounts are created.</p>
                </div>
              </div>
              <button className="btn" style={{ ...S.btn, background: "#d97706", color: "#fff", border: "none", fontSize: 13, whiteSpace: "nowrap" }} onClick={() => setTab("pending")}>View Requests</button>
            </div>
          )}

          {/* Tabs */}
          <div style={{ background: "#fff", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", marginBottom: 20 }}>
            <div style={{ display: "flex", borderBottom: "1px solid var(--border)", padding: "0 20px" }}>
              {[
                { key: "users",   label: "Users" },
                { key: "pending", label: `Pending Approval${pending.length > 0 ? ` (${pending.length})` : ""}` },
                { key: "logs",    label: "Access Logs" },
              ].map(t => (
                <div key={t.key} onClick={() => setTab(t.key)} style={{ padding: "14px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", borderBottom: `2px solid ${tab === t.key ? "var(--royal)" : "transparent"}`, color: tab === t.key ? "var(--royal)" : "var(--muted)", transition: "all 0.18s", whiteSpace: "nowrap" }}>
                  {t.label}
                </div>
              ))}
            </div>

            {/* ── Users tab ── */}
            {tab === "users" && (
              <div style={{ padding: 20 }}>
                <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--bg)", border: "1.5px solid var(--border)", borderRadius: 8, padding: "8px 14px", flex: 1 }}>
                    <img src="/icon/search.png" alt="" style={{ width: 16, height: 16, filter: "brightness(0) saturate(100%) invert(40%)" }} />
                    <input type="text" placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)} style={{ border: "none", background: "transparent", fontSize: 13, color: "var(--text)", outline: "none", fontFamily: "inherit", width: "100%" }} />
                  </div>
                  <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={{ ...S.inp, width: 140 }}>
                    <option value="">All Roles</option>
                    <option>Admin</option><option>Manager</option><option>Employee</option><option>Customer</option>
                  </select>
                  <button className="btn btn-primary" style={{ ...S.btn, display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }} onClick={openAddModal}>
                    <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Request New User
                  </button>
                </div>

                <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 12, color: "#1e40af", display: "flex", alignItems: "center", gap: 8 }}>
                  <span>ℹ️</span>
                  <span>As a Manager, you can <strong>request</strong> new user accounts. Requests are sent to an Admin for final approval.</span>
                </div>

                <div style={{ overflowX: "auto" }}>
                  {loading ? (
                    <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>Loading…</div>
                  ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead><tr>{["User","Email","Role","Status","Joined"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                      <tbody>
                        {filtered.length === 0 ? (
                          <tr><td colSpan={5} style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>No users found</td></tr>
                        ) : filtered.map(u => (
                          <tr key={u.id}>
                            <td style={S.td}>
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <Avatar firstName={u.first_name} lastName={u.last_name} role={u.role} />
                                <div style={{ fontWeight: 600 }}>{fullName(u)}</div>
                              </div>
                            </td>
                            <td style={S.td}>{u.email || "—"}</td>
                            <td style={S.td}><span className={`badge ${ROLE_BADGE[u.role] || "badge-gray"}`}>{u.role || "—"}</span></td>
                            <td style={S.td}><span className={`badge ${u.status === "Active" ? "badge-green" : "badge-red"}`}>{u.status || "Active"}</span></td>
                            <td style={S.td}><span style={{ fontSize: 12, color: "var(--muted)" }}>{fmtDate(u.created_at)}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
                {!loading && <div style={{ marginTop: 12, fontSize: 12, color: "var(--muted)" }}>Showing {filtered.length} of {users.length} users</div>}
              </div>
            )}

            {/* ── Pending tab ── */}
            {tab === "pending" && (
              <div style={{ padding: 24 }}>
                <div style={{ marginBottom: 20 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 4px" }}>Pending Account Requests</h3>
                  <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>
                    {isAdmin ? "As an Admin, you can approve or reject these requests." : "Only Admins can approve these requests."}
                  </p>
                </div>
                {pending.length === 0 ? (
                  <div style={{ padding: "40px 0", textAlign: "center" }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                    <p style={{ color: "var(--muted)", fontSize: 14 }}>No pending requests — all caught up!</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {pending.map(req => (
                      <PendingCard key={req.id} req={req}
                        onApprove={isAdmin ? handleApprove : () => alert("Only Admins can approve requests.")}
                        onReject={isAdmin  ? handleReject  : () => alert("Only Admins can reject requests.")}
                      />
                    ))}
                  </div>
                )}
                {!isAdmin && pending.length > 0 && (
                  <div style={{ marginTop: 16, background: "#faf5ff", border: "1px solid #e9d5ff", borderRadius: 8, padding: "12px 16px", fontSize: 12, color: "#6b21a8", display: "flex", alignItems: "center", gap: 8 }}>
                    <span>🔒</span>
                    <span>Only <strong>Admin</strong> accounts can approve or reject these requests.</span>
                  </div>
                )}
              </div>
            )}

            {/* ── Logs tab ── */}
            {tab === "logs" && (
              <div style={{ padding: 20 }}>
                <div style={{ marginBottom: 16 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 4px" }}>System Access Logs</h3>
                  <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>Track who accessed the system and what actions were performed.</p>
                </div>
                <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--bg)", border: "1.5px solid var(--border)", borderRadius: 8, padding: "8px 14px", flex: 1 }}>
                    <img src="/icon/search.png" alt="" style={{ width: 16, height: 16, filter: "brightness(0) saturate(100%) invert(40%)" }} />
                    <input type="text" placeholder="Search by name, action or IP…" value={logSearch} onChange={e => setLogSearch(e.target.value)} style={{ border: "none", background: "transparent", fontSize: 13, color: "var(--text)", outline: "none", fontFamily: "inherit", width: "100%" }} />
                  </div>
                  <select value={logRole} onChange={e => setLogRole(e.target.value)} style={{ ...S.inp, width: 140 }}>
                    <option value="">All Roles</option>
                    <option>Admin</option><option>Manager</option><option>Employee</option><option>Customer</option>
                  </select>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead><tr>{["User","Role","Action","IP Address","Time","Status"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                    <tbody>
                      {filteredLogs.length === 0 ? (
                        <tr><td colSpan={6} style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>No logs found</td></tr>
                      ) : filteredLogs.map(l => (
                        <tr key={l.id}>
                          <td style={S.td}>
                            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                              <Avatar firstName={l.user.first_name} lastName={l.user.last_name} role={l.user.role} size={30} />
                              <span style={{ fontWeight: 600 }}>{fullName(l.user)}</span>
                            </div>
                          </td>
                          <td style={S.td}><span className={`badge ${ROLE_BADGE[l.user.role] || "badge-gray"}`}>{l.user.role || "—"}</span></td>
                          <td style={S.td}>{l.action}</td>
                          <td style={S.td}><code style={{ fontSize: 12, background: "var(--bg)", padding: "2px 6px", borderRadius: 4, color: "var(--muted)" }}>{l.ip}</code></td>
                          <td style={S.td}><span style={{ fontSize: 12, color: "var(--muted)" }}>{fmtTime(l.timestamp)}</span></td>
                          <td style={S.td}>
                            <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: l.status === "Success" ? "#dcfce7" : "#fef2f2", color: l.status === "Success" ? "#15803d" : "#dc2626" }}>
                              {l.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ marginTop: 14, fontSize: 12, color: "var(--muted)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>Showing {filteredLogs.length} of {logs.length} log entries</span>
                  <button className="btn btn-ghost btn-sm" style={S.btn} onClick={() => setLogs(generateLogs(users))}>↻ Refresh</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Add User Modal ── */}
      {showAddModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 500, maxHeight: "90vh", overflowY: "auto", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0 }}>Request New User Account</h3>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "#d97706", fontWeight: 600 }}>⏳ Will be sent to Admin for approval</p>
              </div>
              <button className="btn btn-ghost btn-icon" style={S.btn} onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ background: "#fffbeb", border: "1.5px solid #fde68a", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#92400e", display: "flex", alignItems: "flex-start", gap: 8 }}>
                <span>⚠️</span>
                <span>This request will be sent to an <strong>Admin</strong> for review. The account is only created after approval.</span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>First Name <span style={{ color: "#dc2626" }}>*</span></label>
                  <input type="text" placeholder="e.g. Jane" value={addForm.first_name} onChange={e => handleFirstNameChange(e.target.value)} style={addErrors.first_name ? S.inpErr : {}} />
                  {addErrors.first_name && <div style={S.errMsg}>{addErrors.first_name}</div>}
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Last Name <span style={{ color: "#dc2626" }}>*</span></label>
                  <input type="text" placeholder="e.g. Doe" value={addForm.last_name} onChange={e => { setAddForm(f => ({ ...f, last_name: e.target.value })); setAddErrors(er => ({ ...er, last_name: "" })); }} style={addErrors.last_name ? S.inpErr : {}} />
                  {addErrors.last_name && <div style={S.errMsg}>{addErrors.last_name}</div>}
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <label style={{ margin: 0 }}>Email Address <span style={{ color: "#dc2626" }}>*</span></label>
                  {!addForm.emailLocked && addForm.email && <span style={{ fontSize: 11, color: "#16a34a", fontWeight: 600 }}>✨ Auto-generated</span>}
                  {addForm.emailLocked && (
                    <button type="button" onClick={() => { const existing = users.map(u => u.email?.toLowerCase()).filter(Boolean); setAddForm(f => ({ ...f, email: generateEmail(f.first_name, f.role, branchLabel, existing), emailLocked: false })); }}
                      style={{ fontSize: 11, color: "#2563eb", background: "none", border: "none", cursor: "pointer", fontWeight: 600, padding: 0 }}>↻ Reset to auto</button>
                  )}
                </div>
                <input type="email" placeholder="Type first name to auto-generate…" value={addForm.email} onChange={e => handleEmailChange(e.target.value)} style={addErrors.email ? S.inpErr : {}} />
                {addErrors.email && <div style={S.errMsg}>{addErrors.email}</div>}
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <label style={{ margin: 0 }}>Suggested Password <span style={{ color: "#dc2626" }}>*</span></label>
                  <span style={{ fontSize: 11, color: "#16a34a", fontWeight: 600 }}>🔐 Auto-generated</span>
                </div>
                <div style={{ position: "relative" }}>
                  <input type={showPassword ? "text" : "password"} value={addForm.password} onChange={e => setAddForm(f => ({ ...f, password: e.target.value }))}
                    style={{ ...(addErrors.password ? S.inpErr : S.inp), width: "100%", boxSizing: "border-box", fontFamily: showPassword ? "monospace" : "inherit", paddingRight: 88 }} />
                  <button type="button" onClick={() => setShowPassword(v => !v)} style={{ position: "absolute", right: 46, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "var(--muted)", padding: "0 4px" }}>{showPassword ? "🙈" : "👁️"}</button>
                  <button type="button" onClick={regeneratePassword} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#2563eb", padding: "0 4px" }}>↻</button>
                </div>
                {addErrors.password && <div style={S.errMsg}>{addErrors.password}</div>}
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>This password will be shown to the Admin during approval.</div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Role</label>
                  <select value={addForm.role} onChange={e => setAddForm(f => ({ ...f, role: e.target.value }))}>
                    <option>Employee</option><option>Customer</option>
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Branch</label>
                  <input type="text" value={branchLabel} readOnly style={{ ...S.inp, background: "var(--bg)", color: "var(--muted)" }} />
                </div>
              </div>

              <div style={{ background: "var(--bg)", borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, border: "1px solid var(--border)" }}>
                <Avatar firstName={addForm.first_name || "?"} lastName={addForm.last_name} role={addForm.role} size={40} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{[addForm.first_name, addForm.last_name].filter(Boolean).join(" ") || "Preview"}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>{addForm.email || "email will appear here"}</div>
                </div>
                <span className={`badge ${ROLE_BADGE[addForm.role] || "badge-gray"}`} style={{ marginLeft: "auto" }}>{addForm.role}</span>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" style={S.btn} onClick={() => setShowAddModal(false)}>Cancel</button>
              <button className="btn" style={{ ...S.btn, background: "#d97706", color: "#fff", border: "none" }} onClick={handleSubmitRequest} disabled={saving}>
                {saving ? "Submitting…" : "⏳ Submit for Approval"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal show={!!confirm} title={confirm?.title} message={confirm?.message} type={confirm?.type} confirmLabel={confirm?.confirmLabel} onConfirm={confirm?.onConfirm} onCancel={() => setConfirm(null)} />
    </Layout>
  );
};

export default ManagerControl;