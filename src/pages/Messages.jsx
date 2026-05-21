import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Layout from "../components/layout";
import { supabase } from "../js/supabase";
import { useCurrentUser } from "../js/useCurrentUser";
import {
  CROSS_BRANCH_TABLE,
  getCrossBranchTargets,
  canMessageCrossBranch,
  isMessageableTarget,
  normBranch,
  normRole,
  BRANCH_LABEL,
} from "../js/crossBranch";

const toFullName = (p) =>
  `${p.first_name || ""} ${p.last_name || ""}`.trim() || p.email || "";

const fmtTime = (iso) => {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const fmtDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return "Today";
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
};

const groupByDate = (msgs) => {
  const groups = [];
  let last = null;
  msgs.forEach((m) => {
    const label = fmtDate(m.created_at);
    if (label !== last) { groups.push({ type: "divider", label }); last = label; }
    groups.push({ type: "msg", ...m });
  });
  return groups;
};

// ── Static table names ────────────────────────────────────────
const PROFILES_TABLE = "profiles";
const MESSAGES_TABLE = "messages";
const PATIENTS_TABLE = "patients";

// ── Avatar ────────────────────────────────────────────────────────────────────
const Avatar = ({ name, size = 38, me = false }) => {
  const initials = (name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const bg = me
    ? "linear-gradient(135deg,#6366f1,#8b5cf6)"
    : "linear-gradient(135deg,#0ea5e9,#38bdf8)";
  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <div style={{
        width: size, height: size, borderRadius: "50%", background: bg,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#fff", fontWeight: 700, fontSize: size * 0.36,
        letterSpacing: 0.5, boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
      }}>
        {initials}
      </div>
    </div>
  );
};

const RoleBadge = ({ role, branch }) => {
  const label = role === "customer" ? "Customer"
    : role === "employee" ? "Employee"
      : role === "manager" ? "Manager"
        : role === "super_admin" ? "Super Admin"
          : role;
  const colors = {
    customer: { bg: "#fef3c7", color: "#b45309" },
    employee: { bg: "#d1fae5", color: "#065f46" },
    manager: { bg: "#dbeafe", color: "#1d4ed8" },
    super_admin: { bg: "#ede9fe", color: "#5b21b6" },
  };
  const c = colors[role] || { bg: "#f3f4f6", color: "#374151" };
  const branchLabel = branch ? ` · ${BRANCH_LABEL[branch] || branch}` : "";
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 6,
      background: c.bg, color: c.color, marginLeft: 6, whiteSpace: "nowrap",
    }}>
      {label}{branchLabel}
    </span>
  );
};

const Modal = ({ show, title, message, type = "error", onClose, onConfirm, confirmText, cancelText }) => {
  if (!show) return null;
  const colors = {
    error: { bg: "#fef2f2", border: "#fecaca", icon: "#ef4444", btn: "#ef4444" },
    success: { bg: "#f0fdf4", border: "#bbf7d0", icon: "#22c55e", btn: "#22c55e" },
    info: { bg: "#eff6ff", border: "#bfdbfe", icon: "#3b82f6", btn: "#3b82f6" },
    confirm: { bg: "#fef2f2", border: "#fecaca", icon: "#ef4444", btn: "#ef4444" },
  };
  const c = colors[type] || colors.error;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 99999, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 18, padding: "32px 28px", maxWidth: 400, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: c.bg, border: `2px solid ${c.border}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c.icon} strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" />
          </svg>
        </div>
        <h3 style={{ textAlign: "center", margin: "0 0 8px", fontSize: 17, fontWeight: 700, color: "#111827" }}>{title}</h3>
        <p style={{ textAlign: "center", margin: "0 0 24px", fontSize: 14, color: "#6b7280", lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: "flex", gap: 10 }}>
          {cancelText && <button onClick={onClose} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "1.5px solid #e5e7eb", background: "#fff", color: "#374151", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>{cancelText}</button>}
          <button onClick={onConfirm || onClose} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "none", background: c.btn, color: "#fff", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>{confirmText || "OK"}</button>
        </div>
      </div>
    </div>
  );
};

// ── AddClientModal — filters search results by messaging rules ────────────────
const AddClientModal = ({ show, onClose, currentUser, existingClientIds, onAdd }) => {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(null);

  useEffect(() => { if (!show) { setSearch(""); setResults([]); } }, [show]);

  useEffect(() => {
    if (!show || !currentUser) return;
    const run = async () => {
      setLoading(true);

      const role = normRole(currentUser.role);
      const branch = normBranch(currentUser.branch);

      // ── Build the role+branch filter based on who this user can message ──
      // getCrossBranchTargets returns [{role, branch}] — branch="" means any branch
      const targets = getCrossBranchTargets(role, branch);

      // Build OR filter parts driven entirely by getCrossBranchTargets rules.
      // We no longer add a bare branch_id filter — that was too broad and pulled
      // in users that isMessageableTarget would then silently strip out.
      let orParts = [];

      // Role-based targets from crossBranch rules
      targets.forEach((t) => {
        if (t.branch) {
          orParts.push(`and(role.ilike.${t.role},branch_id.eq.${currentUser.branchId})`);
        } else {
          orParts.push(`role.ilike.${t.role}`);
        }
      });

      if (orParts.length === 0) { setResults([]); setLoading(false); return; }

      // Build a single combined OR filter so role-filter and name-search don't overwrite each other.
      // Each role/branch bucket is AND-ed with the name search inside it.
      let finalOrParts;
      const s = search.trim();
      if (s) {
        const nameFilter = `first_name.ilike.%${s}%,last_name.ilike.%${s}%,email.ilike.%${s}%`;
        // Wrap each bucket: and(<bucket_condition>,or(<name_conditions>))
        finalOrParts = orParts.map((part) => `and(${part},or(${nameFilter}))`);
      } else {
        finalOrParts = orParts;
      }

      const { data, error: fetchError } = await supabase
        .from(PROFILES_TABLE)
        .select("id,first_name,last_name,email,role,branch_id,status")
        .neq("id", currentUser.id)
        .ilike("status", "active")
        .or(finalOrParts.join(","))
        .order("first_name")
        .limit(60);

      console.log("[AddClientModal] orParts:", orParts);
      console.log("[AddClientModal] finalOrParts:", finalOrParts);
      console.log("[AddClientModal] raw results:", data, "error:", fetchError);

      // Client-side guard using isMessageableTarget
      // Client-side guard using isMessageableTarget
      const filtered = (data || [])
        .filter((p) => !existingClientIds.includes(p.id))
        .filter((p) =>
          isMessageableTarget(
            { role: normRole(role), branch: normBranch(branch) },
            { role: normRole(p.role), branch: normBranch(p.branch_id || "") }
          )
        )
        .map((p) => ({ ...p, full_name: toFullName(p), branch: normBranch(p.branch_id || "") }));

      setResults(filtered);
      setLoading(false);
    };
    const t = setTimeout(run, 260);
    return () => clearTimeout(t);
  }, [search, show, currentUser, existingClientIds]);

  const handleAdd = async (profile) => { setAdding(profile.id); await onAdd(profile); setAdding(null); };
  if (!show) return null;

  // ── Helper hint text per role ─────────────────────────────────────────────
  const hintText = () => {
    const r = normRole(currentUser?.role);
    if (r === "super_admin") return "You can message all managers across every branch.";
    if (r === "manager") return "You can message super admins, employees, and customers in your branch.";
    if (r === "employee") return "You can message managers and customers in your branch.";
    if (r === "customer") return "You can message managers and employees in your branch.";
    return "Search for a user to message.";
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 18, width: "100%", maxWidth: 460, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", display: "flex", flexDirection: "column", maxHeight: "80vh", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", borderBottom: "1px solid #f0f0f6" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#111827" }}>Start a Conversation</h3>
            <p style={{ margin: "3px 0 0", fontSize: 12, color: "#9ca3af" }}>{hintText()}</p>
          </div>
          <button onClick={onClose} style={{ background: "#f3f4f6", border: "none", cursor: "pointer", color: "#6b7280", width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>✕</button>
        </div>
        <div style={{ padding: "14px 22px", borderBottom: "1px solid #f0f0f6" }}>
          <div style={{ position: "relative" }}>
            <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
            <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email…"
              style={{ width: "100%", padding: "10px 12px 10px 36px", borderRadius: 10, border: "1.5px solid #e5e7eb", background: "#f8f9fc", fontSize: 13, color: "#111827", boxSizing: "border-box", outline: "none", fontFamily: "inherit" }} />
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading && <div style={{ padding: 24, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>Searching…</div>}
          {!loading && results.length === 0 && (
            <div style={{ padding: 32, textAlign: "center" }}>
              <div style={{ fontSize: 30, marginBottom: 8 }}>🔍</div>
              <div style={{ fontSize: 13, color: "#9ca3af" }}>{search.trim() ? "No users found." : "No available contacts based on your role."}</div>
            </div>
          )}
          {!loading && results.map((profile) => (
            <div key={profile.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 22px", borderBottom: "1px solid #f9f9f9" }}
              onMouseOver={(e) => e.currentTarget.style.background = "#f8f9fc"}
              onMouseOut={(e) => e.currentTarget.style.background = "transparent"}>
              <Avatar name={profile.full_name || profile.email} size={40} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13.5, color: "#111827", display: "flex", alignItems: "center", flexWrap: "wrap" }}>
                  {profile.full_name || profile.email}
                  <RoleBadge role={normRole(profile.role)} branch={profile.branch} />
                </div>
                <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>{profile.email}</div>
              </div>
              <button onClick={() => handleAdd(profile)} disabled={adding === profile.id}
                style={{ padding: "7px 16px", borderRadius: 8, border: "none", background: adding === profile.id ? "#e5e7eb" : "#6366f1", color: adding === profile.id ? "#9ca3af" : "#fff", fontWeight: 600, fontSize: 12, cursor: adding === profile.id ? "default" : "pointer", flexShrink: 0, fontFamily: "inherit" }}>
                {adding === profile.id ? "Adding…" : "Message"}
              </button>
            </div>
          ))}
        </div>
        <div style={{ padding: "12px 22px", borderTop: "1px solid #f0f0f6", display: "flex", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "9px 20px", borderRadius: 9, border: "1.5px solid #e5e7eb", background: "#fff", color: "#374151", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Done</button>
        </div>
      </div>
    </div>
  );
};

const ConversationMenu = ({ onDelete, onClear }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen((o) => !o)} style={{ width: 34, height: 34, borderRadius: "50%", border: "none", background: open ? "#f0f0f6" : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="#6b7280"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg>
      </button>
      {open && (
        <div style={{ position: "absolute", top: 40, right: 0, zIndex: 999, background: "#fff", borderRadius: 14, boxShadow: "0 8px 30px rgba(0,0,0,0.14)", border: "1px solid #f0f0f6", minWidth: 220, overflow: "hidden" }}>
          <button onClick={() => { onClear(); setOpen(false); }} style={{ width: "100%", padding: "12px 16px", border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#374151", fontWeight: 500, textAlign: "left" }}>
            <span style={{ width: 32, height: 32, borderRadius: 9, background: "#fef3c7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.2"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>
            </span>
            <div><div style={{ fontWeight: 600 }}>Clear messages</div><div style={{ fontSize: 11, color: "#9ca3af", marginTop: 1 }}>Remove from your view</div></div>
          </button>
          <div style={{ height: 1, background: "#f0f0f6", margin: "0 12px" }} />
          <button onClick={() => { onDelete(); setOpen(false); }} style={{ width: "100%", padding: "12px 16px", border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#dc2626", fontWeight: 500, textAlign: "left" }}>
            <span style={{ width: 32, height: 32, borderRadius: 9, background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.2"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" /></svg>
            </span>
            <div><div style={{ fontWeight: 600 }}>Delete conversation</div><div style={{ fontSize: 11, color: "#9ca3af", marginTop: 1 }}>Permanently delete all messages</div></div>
          </button>
        </div>
      )}
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// Main Messages component
// ═════════════════════════════════════════════════════════════════════════════
const Messages = () => {
  const { user, seeAllBranches, loading: userLoading } = useCurrentUser();

  const [clients, setClients] = useState([]);
  const [crossContacts, setCrossContacts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [unread, setUnread] = useState({});
  const [showAdd, setShowAdd] = useState(false);
  const [modal, setModal] = useState({ show: false, title: "", message: "", type: "error", onConfirm: null, confirmText: "OK", cancelText: null });
  const [mobileView, setMobileView] = useState("list");

  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const pollRef = useRef(null);

  const showModal = (title, message, type = "error", onConfirm = null, confirmText = "OK", cancelText = null) =>
    setModal({ show: true, title, message, type, onConfirm, confirmText, cancelText });
  const closeModal = () => setModal((m) => ({ ...m, show: false }));

  const currentUser = useMemo(() => user ? {
    id: user.id,
    email: user.email,
    name: user.fullName,
    role: normRole(user.role),
    branch: normBranch(user.branchId || ""),
    branchId: user.branchId,
  } : null, [user?.id, user?.email, user?.fullName, user?.role, user?.branchId]);

  // ── Same-branch contacts ─────────────────────────────────────────────────
  // initialLoadDone: tracks whether the very first fetch finished.
  // Background re-fetches (triggered by realtime) run silently — no setLoading(true)
  // so the sidebar never blanks/flickers while refreshing.
  const initialLoadDone = useRef(false);
  const fetchClientsRunning = useRef(false);
  const fetchClientsTimer = useRef(null);

  const fetchClients = useCallback(async () => {
    if (!currentUser) return;
    // Debounce — skip if called within 2 seconds of last run
    if (fetchClientsRunning.current) return;
    fetchClientsRunning.current = true;
    if (fetchClientsTimer.current) clearTimeout(fetchClientsTimer.current);

    // Only show the skeleton loader before the first successful load
    if (!initialLoadDone.current) setLoading(true);

    const [{ data: msgData, error }, { data: crossMsgData }] = await Promise.all([
      supabase.from(MESSAGES_TABLE).select("sender_id,receiver_id")
        .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`),
      supabase.from(CROSS_BRANCH_TABLE).select("sender_id,recipient_id")
        .or(`sender_id.eq.${currentUser.id},recipient_id.eq.${currentUser.id}`),
    ]);

    const allPartnerIds = [
      ...((msgData || []).map((m) => m.sender_id === currentUser.id ? m.receiver_id : m.sender_id)),
      ...((crossMsgData || []).map((m) => m.sender_id === currentUser.id ? m.recipient_id : m.sender_id)),
    ];

    if (!allPartnerIds.length) {
      setClients([]);
      setLoading(false);
      initialLoadDone.current = true;
      return;
    }

    const partnerIds = [...new Set(allPartnerIds)].filter(Boolean);
    if (!partnerIds.length) {
      setClients([]);
      setLoading(false);
      initialLoadDone.current = true;
      return;
    }

    const { data: profileData } = await supabase
      .from(PROFILES_TABLE)
      .select("id,first_name,last_name,email,role,branch_id")
      .in("id", partnerIds);

    const profileMap = Object.fromEntries(
      (profileData || []).map((p) => [p.id, { ...p, full_name: toFullName(p), branch: normBranch(p.branch_id || "") }])
    );

    const missingIds = partnerIds.filter((id) => !profileMap[id]);
    if (missingIds.length) {
      const { data: patientData } = await supabase
        .from(PATIENTS_TABLE)
        .select("owner_user_id,owner,owner_email")
        .in("owner_user_id", missingIds);
      (patientData || []).forEach((p) => {
        if (!profileMap[p.owner_user_id])
          profileMap[p.owner_user_id] = { id: p.owner_user_id, full_name: p.owner || null, email: p.owner_email || "", role: "customer", branch: currentUser.branch };
      });
    }

    const allowed = partnerIds
      .map((id) => profileMap[id] ?? { id, full_name: null, email: "", role: "", branch: "" })
      .filter((p) => isMessageableTarget(currentUser, p))
      .map((p) => ({
        ...p,
        isCrossBranch: canMessageCrossBranch(
          { role: currentUser.role, branch: currentUser.branch },
          { role: normRole(p.role), branch: normBranch(p.branch || "") }
        ),
      }));

    // Merge silently — keep existing list while update arrives to avoid flash
    setClients((prev) => {
      const same = prev.length === allowed.length && allowed.every((a, i) => prev[i]?.id === a.id);
      return same ? prev : allowed;
    });
    setLoading(false);
    initialLoadDone.current = true;
    fetchClientsRunning.current = false;
  }, [currentUser]);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  // ── Cross-branch / cross-role contacts ───────────────────────────────────
  const fetchCrossContacts = useCallback(async () => {
    if (!currentUser?.id) return;
    const targets = getCrossBranchTargets(currentUser.role, currentUser.branch);
    if (targets.length === 0) { setCrossContacts([]); return; }

    // Build OR filter — branch="" means any branch
    const orFilters = targets.map((t) =>
      t.branch
        ? `and(role.ilike.${t.role},branch_id.eq.${currentUser.branchId})`
        : `role.ilike.${t.role}`
    ).join(",");

    const { data, error } = await supabase
      .from(PROFILES_TABLE)
      .select("id,first_name,last_name,email,role,branch_id,branches(name)")
      .or(orFilters);

    if (error) { console.error("cross contacts:", error); return; }
    console.log("[fetchCrossContacts] orFilters:", orFilters, "data:", data);

    setCrossContacts(
      (data || [])
        .filter((p) => p.id !== currentUser.id)
        .map((p) => ({
          id: p.id,
          full_name: toFullName(p),
          email: p.email,
          role: normRole(p.role),
          branch: normBranch(p.branch_id || ""),
          branchName: p.branches?.name || `Branch ${p.branch_id}` || "",
          branch_id: p.branch_id,
          isCrossBranch: true,
        }))
    );
  }, [currentUser?.id, currentUser?.role, currentUser?.branch, currentUser?.branchId]);

  useEffect(() => { fetchCrossContacts(); }, [fetchCrossContacts]);

  // ── Fetch messages ────────────────────────────────────────────────────────
  // keepOptimistic: preserve _pending messages during a background refresh (avoids flicker)
  const fetchMessages = useCallback(async (partner, keepOptimistic = false) => {
    if (!partner?.id || !currentUser?.id) return;

    let fetched = [];
    if (partner.isCrossBranch) {
      const { data, error } = await supabase.from(CROSS_BRANCH_TABLE).select("*")
        .or(`and(sender_id.eq.${currentUser.id},recipient_id.eq.${partner.id}),and(sender_id.eq.${partner.id},recipient_id.eq.${currentUser.id})`)
        .order("created_at", { ascending: true });
      if (!error) fetched = (data || []).map((m) => ({ ...m, message: m.content, receiver_id: m.recipient_id }));
    } else {
      const { data, error } = await supabase.from(MESSAGES_TABLE).select("*")
        .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${partner.id}),and(sender_id.eq.${partner.id},receiver_id.eq.${currentUser.id})`)
        .order("created_at", { ascending: true });
      if (!error) fetched = data || [];
    }

    setMessages((prev) => {
      // Re-attach any still-pending optimistic messages so they don't disappear mid-flight
      const pending = keepOptimistic ? prev.filter((m) => m._pending) : [];
      return [...fetched, ...pending];
    });
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
  }, [currentUser]);

  // ── Subscribe to active conversation ─────────────────────────────────────
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (!selected || !currentUser) return;
    fetchMessages(selected);

    if (selected.isCrossBranch) {
      supabase.from(CROSS_BRANCH_TABLE).update({ is_read: true }).eq("recipient_id", currentUser.id).eq("sender_id", selected.id).eq("is_read", false);
    } else {
      supabase.from(MESSAGES_TABLE).update({ is_read: true }).eq("receiver_id", currentUser.id).eq("sender_id", selected.id).eq("is_read", false);
    }
    setUnread((prev) => ({ ...prev, [selected.id]: 0 }));

    const tableName = selected.isCrossBranch ? CROSS_BRANCH_TABLE : MESSAGES_TABLE;
    const channel = supabase.channel(`messages-rt-${tableName}-${selected.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: tableName }, (payload) => {
        const msg = payload.new || payload.old;
        if (!msg) return;
        const recipientField = selected.isCrossBranch ? msg.recipient_id : msg.receiver_id;
        const isRelevant = (msg.sender_id === currentUser.id && recipientField === selected.id) ||
          (msg.sender_id === selected.id && recipientField === currentUser.id);
        if (isRelevant) {
          if (msg.sender_id !== currentUser.id) {
            fetchMessages(selected);
          }
          // Debounce fetchClients on realtime events — wait 1.5s before re-fetching
          if (fetchClientsTimer.current) clearTimeout(fetchClientsTimer.current);
          fetchClientsTimer.current = setTimeout(() => fetchClients(), 1500);
        }
      }).subscribe();

    return () => {
      clearInterval(pollRef.current);
      if (fetchClientsTimer.current) clearTimeout(fetchClientsTimer.current);
      supabase.removeChannel(channel);
    };
  }, [selected, currentUser, fetchMessages, fetchClients]);

  // ── Unread badges ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser) return;
    const recompute = async () => {
      const counts = {};
      const { data: sameUnread } = await supabase.from(MESSAGES_TABLE).select("sender_id").eq("receiver_id", currentUser.id).eq("is_read", false);
      (sameUnread || []).forEach((m) => { counts[m.sender_id] = (counts[m.sender_id] || 0) + 1; });
      const { data: crossUnread } = await supabase.from(CROSS_BRANCH_TABLE).select("sender_id").eq("recipient_id", currentUser.id).eq("is_read", false);
      (crossUnread || []).forEach((m) => { counts[m.sender_id] = (counts[m.sender_id] || 0) + 1; });
      setUnread(counts);
    };
    recompute();
    // Poll every 10 seconds instead of realtime to avoid resource exhaustion
    const interval = setInterval(recompute, 10000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // ── Send ──────────────────────────────────────────────────────────────────
  const sendMessage = async () => {
    const text = newMsg.trim();
    if (!text || !selected || !currentUser?.id || sending) return;

    // ── Pre-flight permission check ──────────────────────────────────────
    const allowed = canMessageCrossBranch(
      { role: currentUser.role, branch: currentUser.branch },
      { role: normRole(selected.role || ""), branch: normBranch(selected.branch || "") }
    ); // same branch always ok

    if (!allowed) {
      showModal("Not Allowed", "You are not permitted to message this user.", "error");
      return;
    }

    setSending(true);

    const optimistic = {
      id: `tmp-${Date.now()}`, sender_id: currentUser.id, receiver_id: selected.id,
      message: text, is_read: false, created_at: new Date().toISOString(), _pending: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    setNewMsg("");
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80);

    // ── Determine which table to write to ──────────────────────────────
    // isCrossBranch flag is set on the contact object when it was loaded from crossContacts;
    // that is the ONLY reliable signal — don't re-derive from role comparison.
    const isCrossWrite = !!selected.isCrossBranch;

    console.log("[sendMessage] selected:", selected);
    console.log("[sendMessage] isCrossWrite:", isCrossWrite);
    console.log("[sendMessage] currentUser:", currentUser);

    let error, insertedRow;
    if (isCrossWrite) {
      const { data, error: e } = await supabase.from(CROSS_BRANCH_TABLE).insert([{
        sender_id: currentUser.id,
        sender_name: currentUser.name,
        sender_role: currentUser.role || "super_admin",
        sender_branch: currentUser.branch || "head_office",
        recipient_id: selected.id,
        recipient_name: selected.full_name || selected.email,
        recipient_role: selected.role || "manager",
        recipient_branch: selected.branch || "head_office",
        content: text,
      }]).select().single();
      error = e;
      if (data) insertedRow = { ...data, message: data.content, receiver_id: data.recipient_id };
    } else {
      const { data, error: e } = await supabase.from(MESSAGES_TABLE).insert([{
        sender_id: currentUser.id,
        receiver_id: selected.id,
        message: text,
        is_read: false,
        branch_id: user?.branchId ?? null,
      }]).select().single();
      error = e;
      insertedRow = data;
    }

    setSending(false);
    console.log("[sendMessage] error:", error, "insertedRow:", insertedRow);
    if (error) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      showModal("Failed to Send", `${error.message || error.code || "Unknown error"} (table: ${isCrossWrite ? "cross_branch_messages" : "messages"})`, "error");
    } else {
      // Swap the optimistic bubble for the real DB row — zero extra round-trip, no flicker
      setMessages((prev) =>
        prev.map((m) => m.id === optimistic.id ? { ...insertedRow, _confirmed: true } : m)
      );
    }
  };

  const handleClearMessages = () =>
    showModal("Clear Messages", `Remove all messages with ${selected?.full_name || selected?.email} from your view?`, "confirm",
      () => { setMessages([]); closeModal(); }, "Clear", "Cancel");

  const handleDeleteConversation = () => {
    const myId = currentUser?.id;
    showModal("Delete Conversation", `Permanently delete your conversation with ${selected?.full_name || selected?.email}?`, "confirm",
      async () => {
        closeModal(); setDeleting(true);
        if (selected.isCrossBranch) {
          const { data: rows } = await supabase.from(CROSS_BRANCH_TABLE).select("id")
            .or(`and(sender_id.eq.${myId},recipient_id.eq.${selected.id}),and(sender_id.eq.${selected.id},recipient_id.eq.${myId})`);
          const ids = (rows || []).map((r) => r.id);
          if (ids.length) await supabase.from(CROSS_BRANCH_TABLE).delete().in("id", ids);
        } else {
          const { data: rows } = await supabase.from(MESSAGES_TABLE).select("id")
            .or(`and(sender_id.eq.${myId},receiver_id.eq.${selected.id}),and(sender_id.eq.${selected.id},receiver_id.eq.${myId})`);
          const ids = (rows || []).map((r) => r.id);
          if (ids.length) await supabase.from(MESSAGES_TABLE).delete().in("id", ids);
        }
        setDeleting(false); setMessages([]); fetchClients();
      }, "Delete Forever", "Cancel");
  };

  const handleAddClient = async (profile) => {
    // super_admin → manager is always cross-branch
    // For all others, check if roles differ from same-branch pair
    const senderRole = normRole(currentUser.role);
    const recipientRole = normRole(profile.role);
    const senderBranch = normBranch(currentUser.branchId || "");
    const recipientBranch = normBranch(profile.branch_id || profile.branch || "");

    // Use cross_branch_messages when roles are different OR branches differ
    const isCross = senderRole !== recipientRole || senderBranch !== recipientBranch;

    setClients((prev) => prev.some((c) => c.id === profile.id) ? prev : [profile, ...prev]);

    if (currentUser?.id) {
      if (isCross) {
        await supabase.from(CROSS_BRANCH_TABLE).insert([{
          sender_id: currentUser.id,
          sender_name: currentUser.name,
          sender_role: currentUser.role || "super_admin",
          sender_branch: currentUser.branch || "head_office",
          recipient_id: profile.id,
          recipient_name: profile.full_name || profile.email,
          recipient_role: normRole(profile.role) || "manager",
          recipient_branch: normBranch(profile.branch_id || profile.branch || "") || "head_office",
          content: `Hello ${profile.full_name || "there"}! 👋`,
        }]);
      } else {
        await supabase.from(MESSAGES_TABLE).insert([{
          sender_id: currentUser.id,
          receiver_id: profile.id,
          message: `Hello ${profile.full_name || "there"}! 👋`,
          is_read: false,
          branch_id: user?.branchId ?? null,
        }]);
      }
    }

    setShowAdd(false);
    setSelected({
      ...profile,
      isCrossBranch: isCross,
      branch: normBranch(profile.branch_id || profile.branch || ""),
      role: normRole(profile.role),
    });
    inputRef.current?.focus();
  };


  const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;
  const mergedContacts = useMemo(() => [
    ...clients.map((c) => {
      const isCross = canMessageCrossBranch(
        { role: currentUser?.role || "", branch: currentUser?.branch || "" },
        { role: normRole(c.role), branch: normBranch(c.branch || "") }
      );
      return { ...c, isCrossBranch: isCross };
    }),
    ...crossContacts.filter((cc) => !clients.some((c) => c.id === cc.id)),
  ], [clients, crossContacts, currentUser?.role, currentUser?.branch]);
  const filteredClients = mergedContacts.filter((c) =>
    !search || (c.full_name || c.email || "").toLowerCase().includes(search.toLowerCase())
  );
  const grouped = groupByDate(messages);
  const existingClientIds = clients.map((c) => c.id);
  const totalUnread = Object.values(unread).reduce((a, b) => a + b, 0);

  return (
    <Layout>
      <style>{`
        @keyframes fadeIn  { from { opacity:0 } to { opacity:1 } }
        @keyframes slideUp { from { opacity:0;transform:translateY(14px) } to { opacity:1;transform:translateY(0) } }
        @keyframes popIn   { from { opacity:0;transform:translateY(5px) scale(0.97) } to { opacity:1;transform:translateY(0) scale(1) } }
        @keyframes shimmer { 0%{background-position:-200px 0} 100%{background-position:200px 0} }
        .msg-page * { box-sizing: border-box; }
        .client-row { transition: background 0.12s; cursor: pointer; }
        .client-row:hover { background: #f0f4ff !important; }
        .client-row.active { background: #eff0fe !important; border-left: 3px solid #6366f1 !important; }
        .msg-input:focus { outline: none; border-color: #6366f1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
        .send-btn:hover:not(:disabled) { background: #4f46e5 !important; transform: scale(1.05); }
        .send-btn:active:not(:disabled) { transform: scale(0.94) !important; }
        .send-btn { transition: background 0.15s, transform 0.12s; }
        .bubble { animation: popIn 0.18s ease; }
        .sidebar-scroll::-webkit-scrollbar, .chat-scroll::-webkit-scrollbar { width: 3px; }
        .sidebar-scroll::-webkit-scrollbar-thumb, .chat-scroll::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 4px; }
        .emoji-quick span { cursor: pointer; transition: transform 0.1s; display: inline-block; }
        .emoji-quick span:hover { transform: scale(1.35); }
      `}</style>

      {/* Pass full currentUser object so AddClientModal can apply role-based filtering */}
      <AddClientModal
        show={showAdd}
        onClose={() => setShowAdd(false)}
        currentUser={currentUser}
        existingClientIds={existingClientIds}
        onAdd={handleAddClient}
      />
      <Modal show={modal.show} title={modal.title} message={modal.message} type={modal.type} onClose={closeModal} onConfirm={modal.onConfirm} confirmText={modal.confirmText} cancelText={modal.cancelText} />

      <div className="msg-page" style={{ position: "fixed", top: 64, left: "var(--current-sidebar-w, 62px)", right: 0, bottom: 0, display: "grid", gridTemplateColumns: isMobile ? "1fr" : "300px 1fr", background: "#f4f6fb", overflow: "hidden" }}>

        {/* ══ LEFT SIDEBAR ══════════════════════════════════════════════════════ */}
        <div style={{ display: isMobile && mobileView === "chat" ? "none" : "flex", flexDirection: "column", background: "#fff", borderRight: "1.5px solid #eef0f6" }}>
          <div style={{ padding: "18px 18px 12px", borderBottom: "1px solid #f0f2f8" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <Avatar name={currentUser?.name} size={40} me />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{currentUser?.name || "Loading…"}</div>
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 1 }}>Messages</div>
              </div>
              <button onClick={() => setShowAdd(true)}
                style={{ width: 34, height: 34, borderRadius: "50%", border: "none", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 2px 8px rgba(99,102,241,0.35)", position: "relative" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  <line x1="12" y1="9" x2="12" y2="13" /><line x1="10" y1="11" x2="14" y2="11" />
                </svg>
                {totalUnread > 0 && (
                  <div style={{ position: "absolute", top: -3, right: -3, background: "#ef4444", color: "#fff", borderRadius: 99, fontSize: 9, fontWeight: 700, minWidth: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px", border: "2px solid #fff" }}>
                    {totalUnread > 9 ? "9+" : totalUnread}
                  </div>
                )}
              </button>
            </div>
            <div style={{ position: "relative" }}>
              <svg style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search conversations…"
                style={{ width: "100%", padding: "9px 12px 9px 32px", borderRadius: 10, border: "1.5px solid #eef0f6", background: "#f8f9fc", fontSize: 13, color: "#111827", outline: "none", fontFamily: "inherit" }} />
            </div>
          </div>

          <div style={{ padding: "10px 18px 6px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.6px" }}>Conversations</span>
            {filteredClients.length > 0 && <span style={{ fontSize: 11, color: "#9ca3af" }}>{filteredClients.length}</span>}
          </div>

          <div className="sidebar-scroll" style={{ flex: 1, overflowY: "auto" }}>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 18px" }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#f0f0f0" }} />
                  <div style={{ flex: 1 }}><div style={{ height: 12, borderRadius: 6, background: "#f0f0f0", marginBottom: 6, width: "60%" }} /></div>
                </div>
              ))
            ) : filteredClients.length === 0 ? (
              <div style={{ padding: 28, textAlign: "center" }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>💬</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#374151", marginBottom: 6 }}>No conversations yet</div>
                <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 14 }}>{search ? "No matches found." : "Start messaging someone"}</div>
                {!search && (
                  <button onClick={() => setShowAdd(true)} style={{ padding: "9px 20px", borderRadius: 9, border: "none", background: "#6366f1", color: "#fff", fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>+ New Message</button>
                )}
              </div>
            ) : filteredClients.map((c) => {
              const isActive = selected?.id === c.id;
              const badge = unread[c.id] || 0;
              return (
                <div key={c.id} className={`client-row ${isActive ? "active" : ""}`}
                  onClick={() => { setSelected(c); setMobileView("chat"); setTimeout(() => inputRef.current?.focus(), 100); }}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 18px", borderLeft: `3px solid ${isActive ? "#6366f1" : "transparent"}`, background: isActive ? "#eff0fe" : "transparent" }}>
                  <Avatar name={c.full_name || c.email} size={44} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: badge > 0 ? 700 : 600, fontSize: 13.5, color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "flex", alignItems: "center" }}>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{c.full_name || c.email || "Unknown"}</span>
                      {c.role && <RoleBadge role={normRole(c.role)} branch={c.isCrossBranch ? (c.branchName || c.branch) : ""} />}
                    </div>
                    <div style={{ fontSize: 11.5, color: badge > 0 ? "#6366f1" : "#9ca3af", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: badge > 0 ? 600 : 400 }}>
                      {c.email || "—"}
                    </div>
                  </div>
                  {badge > 0 && (
                    <div style={{ background: "#6366f1", color: "#fff", borderRadius: 99, fontSize: 10, fontWeight: 700, minWidth: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 6px" }}>
                      {badge}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {!loading && filteredClients.length > 0 && (
            <div style={{ padding: "10px 18px", borderTop: "1px solid #f0f2f8" }}>
              <button onClick={() => setShowAdd(true)}
                style={{ width: "100%", padding: "9px 0", borderRadius: 9, border: "1.5px dashed #c7d2fe", background: "#f5f3ff", color: "#6366f1", fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                New Conversation
              </button>
            </div>
          )}
        </div>

        {/* ══ RIGHT CHAT PANE ═══════════════════════════════════════════════════ */}
        <div style={{ display: isMobile && mobileView === "list" ? "none" : "flex", flexDirection: "column", overflow: "hidden" }}>
          {!selected ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, background: "#f4f6fb" }}>
              <div style={{ width: 90, height: 90, borderRadius: "50%", background: "linear-gradient(135deg,#ede9fe,#dbeafe)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#374151", marginBottom: 6 }}>Your Messages</div>
                <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 20 }}>Select a conversation or start a new one</div>
                <button onClick={() => setShowAdd(true)}
                  style={{ padding: "11px 26px", borderRadius: 11, border: "none", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 8, margin: "0 auto" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="10" y1="11" x2="14" y2="11" /></svg>
                  New Message
                </button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", background: "#fff", borderBottom: "1.5px solid #eef0f6", flexShrink: 0 }}>
                {isMobile && (
                  <button onClick={() => setMobileView("list")} style={{ background: "none", border: "none", cursor: "pointer", color: "#6366f1", fontSize: 20, lineHeight: 1, padding: "0 6px 0 0", flexShrink: 0 }}>←</button>
                )}
                <Avatar name={selected.full_name || selected.email} size={44} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#111827", display: "flex", alignItems: "center" }}>
                    {selected.full_name || selected.email}
                    {selected.role && <RoleBadge role={normRole(selected.role)} branch={selected.isCrossBranch ? (selected.branchName || selected.branch) : ""} />}
                  </div>
                </div>
                <ConversationMenu onClear={handleClearMessages} onDelete={handleDeleteConversation} />
              </div>

              {deleting && (
                <div style={{ padding: "10px 20px", background: "#fef2f2", borderBottom: "1px solid #fecaca", fontSize: 13, color: "#dc2626" }}>Deleting conversation…</div>
              )}

              <div className="chat-scroll" style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 2, background: "#f4f6fb" }}>
                {messages.length === 0 && !deleting && (
                  <div style={{ margin: "auto", textAlign: "center" }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>👋</div>
                    <div style={{ fontSize: 14, color: "#9ca3af" }}>No messages yet. Say hello!</div>
                  </div>
                )}
                {grouped.map((item, i) => {
                  if (item.type === "divider") return (
                    <div key={`d-${i}`} style={{ display: "flex", alignItems: "center", gap: 10, margin: "18px 0 8px" }}>
                      <div style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
                      <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, background: "#f4f6fb", padding: "2px 12px", borderRadius: 99, border: "1px solid #e5e7eb" }}>{item.label}</span>
                      <div style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
                    </div>
                  );
                  const me = item.sender_id === currentUser?.id;
                  return (
                    <div key={item.id} className="bubble" style={{ display: "flex", justifyContent: me ? "flex-end" : "flex-start", alignItems: "flex-end", gap: 8, marginTop: 3 }}>
                      {!me && <Avatar name={selected.full_name || selected.email} size={28} />}
                      <div style={{ maxWidth: "62%" }}>
                        <div style={{
                          background: me ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "#fff",
                          color: me ? "#fff" : "#111827",
                          padding: "10px 14px",
                          borderRadius: me ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                          fontSize: 14, lineHeight: 1.55,
                          opacity: item._pending ? 0.55 : 1,
                          boxShadow: me ? "0 3px 14px rgba(99,102,241,0.3)" : "0 1px 4px rgba(0,0,0,0.08)",
                          wordBreak: "break-word", whiteSpace: "pre-wrap",
                        }}>
                          {item.message}
                        </div>
                        <div style={{ fontSize: 10.5, color: "#9ca3af", marginTop: 4, display: "flex", alignItems: "center", gap: 4, justifyContent: me ? "flex-end" : "flex-start" }}>
                          {fmtTime(item.created_at)}
                          {me && !item._pending && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5"><path d="M20 6 9 17l-5-5" /></svg>}
                          {item._pending && <span style={{ fontStyle: "italic" }}>sending…</span>}
                        </div>
                      </div>
                      {me && <Avatar name={currentUser.name} size={28} me />}
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              <div style={{ background: "#fff", borderTop: "1.5px solid #eef0f6", flexShrink: 0 }}>
                <div className="emoji-quick" style={{ padding: "8px 18px 0", display: "flex", gap: 2 }}>
                  {[
                    { key: "like", text: "👍", svg: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" /><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" /></svg> },
                    { key: "heart", text: "❤️", svg: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg> },
                    { key: "smile", text: "😊", svg: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M8 13s1.5 2 4 2 4-2 4-2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" /></svg> },
                    { key: "laugh", text: "😂", svg: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M8 13s1.5 3 4 3 4-3 4-3" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" /><path d="M17 9c.5-1 .5-2 0-3" /><path d="M7 9c-.5-1-.5-2 0-3" /></svg> },
                    { key: "pray", text: "🙏", svg: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 11V7a5 5 0 0 0-10 0v4" /><path d="M12 2v5" /><path d="M6 11h12" /><path d="M6 11a6 6 0 0 0 12 0" /><path d="M12 17v5" /><path d="M9 20h6" /></svg> },
                    { key: "wave", text: "👋", svg: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0" /><line x1="12" y1="2" x2="12" y2="12" /></svg> },
                    { key: "check", text: "✅", svg: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg> },
                    { key: "paw", text: "🐾", svg: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="4" r="2" /><circle cx="18" cy="8" r="2" /><circle cx="4" cy="8" r="2" /><path d="M12 17c-2.5 0-6 1.5-6 4h12c0-2.5-3.5-4-6-4z" /><path d="M8 13c0-2.2 1.8-4 4-4s4 1.8 4 4" /></svg> },
                  ].map(({ key, text, svg }) => (
                    <span key={key} title={text} onClick={() => setNewMsg((p) => p + text)}
                      style={{ width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#6b7280", transition: "background 0.12s, color 0.12s" }}
                      onMouseOver={(e) => { e.currentTarget.style.background = "#f0f0f6"; e.currentTarget.style.color = "#6366f1"; e.currentTarget.querySelector("svg").style.stroke = "#6366f1"; }}
                      onMouseOut={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#6b7280"; e.currentTarget.querySelector("svg").style.stroke = "#6b7280"; }}>
                      {svg}
                    </span>
                  ))}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 18px 14px" }}>
                  <input
                    ref={inputRef} className="msg-input"
                    value={newMsg} onChange={(e) => setNewMsg(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    placeholder={`Message ${selected.full_name || selected.email}…`}
                    style={{ flex: 1, padding: "12px 18px", borderRadius: 26, border: "1.5px solid #e5e7eb", background: "#f8f9fc", fontSize: 14, color: "#111827", fontFamily: "inherit" }}
                  />
                  <button className="send-btn" onClick={sendMessage} disabled={sending || !newMsg.trim()}
                    style={{ width: 46, height: 46, borderRadius: "50%", border: "none", background: sending || !newMsg.trim() ? "#e5e7eb" : "linear-gradient(135deg,#6366f1,#8b5cf6)", cursor: sending || !newMsg.trim() ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={sending || !newMsg.trim() ? "#9ca3af" : "#fff"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 2 11 13" /><path d="M22 2 15 22 11 13 2 9l20-7z" />
                    </svg>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Messages;