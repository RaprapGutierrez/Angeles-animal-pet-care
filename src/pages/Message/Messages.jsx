import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useLocation } from "react-router-dom";
import Layout from "../../components/layout";
import { supabase } from "../../js/Utils/supabase";
import { useCurrentUser } from "../../js/hooks/Usecurrentuser";
import { usePresence } from "../../js/hooks/usePresence";
import { logActivity } from "../../js/Utils/logActivity";
import "../../styles/Messages.css";
import {
  CROSS_BRANCH_TABLE,
  getCrossBranchTargets,
  canMessageCrossBranch,
  isMessageableTarget,
  normBranch,
  normRole,
  BRANCH_LABEL,
} from "../../js/Utils/crossBranch";

const toFullName = (p) =>
  `${p.first_name || ""} ${p.last_name || ""}`.trim() || p.email || "";

const fmtTime = (iso) => {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const fmtDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return "Today";
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const groupByDate = (msgs) => {
  const groups = [];
  let last = null;
  msgs.forEach((m) => {
    const label = fmtDate(m.created_at);
    if (label !== last) {
      groups.push({ type: "divider", label });
      last = label;
    }
    groups.push({ type: "msg", ...m });
  });
  return groups;
};

// ── Static table names ────────────────────────────────────────
const PROFILES_TABLE = "profiles";
const MESSAGES_TABLE = "messages";
const PATIENTS_TABLE = "patients";

// ── Avatar ────────────────────────────────────────────────────────────────────
const Avatar = ({ name, size = 38, me = false, online = null }) => {
  const initials = (name || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const bg = me
    ? "linear-gradient(135deg,#6366f1,#8b5cf6)"
    : "linear-gradient(135deg,#0ea5e9,#38bdf8)";
  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          fontWeight: 700,
          fontSize: size * 0.36,
          letterSpacing: 0.5,
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        }}
      >
        {initials}
      </div>
      {online !== null && (
        <span
          style={{
            position: "absolute",
            bottom: -1,
            right: -1,
            width: Math.max(10, size * 0.28),
            height: Math.max(10, size * 0.28),
            borderRadius: "50%",
            border: "2px solid #fff",
            background: online ? "#22c55e" : "#9ca3af",
          }}
        />
      )}
    </div>
  );
};

const RoleBadge = ({ role, branch }) => {
  const label =
    role === "customer"
      ? "Customer"
      : role === "employee"
        ? "Employee"
        : role === "manager"
          ? "Manager"
          : role === "super_admin"
            ? "Super Admin"
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
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        padding: "2px 7px",
        borderRadius: 6,
        background: c.bg,
        color: c.color,
        marginLeft: 6,
        whiteSpace: "nowrap",
      }}
    >
      {label}
      {branchLabel}
    </span>
  );
};

const Modal = ({
  show,
  title,
  message,
  type = "error",
  onClose,
  onConfirm,
  confirmText,
  cancelText,
}) => {
  if (!show) return null;
  const colors = {
    error: {
      bg: "#fef2f2",
      border: "#fecaca",
      icon: "#ef4444",
      btn: "#ef4444",
    },
    success: {
      bg: "#f0fdf4",
      border: "#bbf7d0",
      icon: "#22c55e",
      btn: "#22c55e",
    },
    info: { bg: "#eff6ff", border: "#bfdbfe", icon: "#3b82f6", btn: "#3b82f6" },
    confirm: {
      bg: "#fef2f2",
      border: "#fecaca",
      icon: "#ef4444",
      btn: "#ef4444",
    },
  };
  const c = colors[type] || colors.error;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 18,
          padding: "32px 28px",
          maxWidth: 400,
          width: "100%",
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            background: c.bg,
            border: `2px solid ${c.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
          }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke={c.icon}
            strokeWidth="2.5"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4m0 4h.01" />
          </svg>
        </div>
        <h3
          style={{
            textAlign: "center",
            margin: "0 0 8px",
            fontSize: 17,
            fontWeight: 700,
            color: "#111827",
          }}
        >
          {title}
        </h3>
        <p
          style={{
            textAlign: "center",
            margin: "0 0 24px",
            fontSize: 14,
            color: "#6b7280",
            lineHeight: 1.5,
          }}
        >
          {message}
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          {cancelText && (
            <button
              onClick={onClose}
              style={{
                flex: 1,
                padding: "11px 0",
                borderRadius: 10,
                border: "1.5px solid #e5e7eb",
                background: "#fff",
                color: "#374151",
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={onConfirm || onClose}
            style={{
              flex: 1,
              padding: "11px 0",
              borderRadius: 10,
              border: "none",
              background: c.btn,
              color: "#fff",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            {confirmText || "OK"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── AddClientModal — filters search results by messaging rules ────────────────
const AddClientModal = ({
  show,
  onClose,
  currentUser,
  existingClientIds,
  onAdd,
}) => {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(null);

  useEffect(() => {
    if (!show) {
      setSearch("");
      setResults([]);
    }
  }, [show]);

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
          orParts.push(
            `and(role.ilike.${t.role},branch_id.eq.${currentUser.branchId})`,
          );
        } else {
          orParts.push(`role.ilike.${t.role}`);
        }
      });

      if (orParts.length === 0) {
        setResults([]);
        setLoading(false);
        return;
      }

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

      // Client-side guard using isMessageableTarget
      // Client-side guard using isMessageableTarget
      const filtered = (data || [])
        .filter((p) => !existingClientIds.includes(p.id))
        .filter((p) => {
          // Always allow messaging to/from super_admin regardless of direction
          if (
            normRole(role) === "super_admin" ||
            normRole(p.role) === "super_admin"
          )
            return true;
          return isMessageableTarget(
            { role: normRole(role), branch: normBranch(branch) },
            { role: normRole(p.role), branch: normBranch(p.branch_id || "") },
          );
        })
        .map((p) => ({
          ...p,
          full_name: toFullName(p),
          branch: normBranch(p.branch_id || ""),
        }));

      setResults(filtered);
      setLoading(false);
    };
    if (!search.trim()) {
      run();
      return;
    }
    const t = setTimeout(run, 260);
    return () => clearTimeout(t);
  }, [search, show, currentUser, existingClientIds]);

  const handleAdd = async (profile) => {
    setAdding(profile.id);
    await onAdd(profile);
    setAdding(null);
  };
  if (!show) return null;

  // ── Helper hint text per role ─────────────────────────────────────────────
  const hintText = () => {
    const r = normRole(currentUser?.role);
    if (r === "super_admin")
      return "You can message all managers across every branch.";
    if (r === "manager")
      return "You can message super admins, employees, and customers in your branch.";
    if (r === "employee")
      return "You can message managers and customers in your branch.";
    if (r === "customer")
      return "You can message managers and employees in your branch.";
    return "Search for a user to message.";
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9998,
        background: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 18,
          width: "100%",
          maxWidth: 460,
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
          display: "flex",
          flexDirection: "column",
          maxHeight: "80vh",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "18px 22px",
            borderBottom: "1px solid #f0f0f6",
          }}
        >
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 700,
                color: "#111827",
              }}
            >
              Start a Conversation
            </h3>
            <p style={{ margin: "3px 0 0", fontSize: 12, color: "#9ca3af" }}>
              {hintText()}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "#f3f4f6",
              border: "none",
              cursor: "pointer",
              color: "#6b7280",
              width: 30,
              height: 30,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
            }}
          >
            ✕
          </button>
        </div>
        <div
          style={{ padding: "14px 22px", borderBottom: "1px solid #f0f0f6" }}
        >
          <div style={{ position: "relative" }}>
            <svg
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
              }}
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#9ca3af"
              strokeWidth="2.5"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email…"
              style={{
                width: "100%",
                padding: "10px 12px 10px 36px",
                borderRadius: 10,
                border: "1.5px solid #e5e7eb",
                background: "#f8f9fc",
                fontSize: 13,
                color: "#111827",
                boxSizing: "border-box",
                outline: "none",
                fontFamily: "inherit",
              }}
            />
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading && (
            <div
              style={{
                padding: 24,
                textAlign: "center",
                color: "#9ca3af",
                fontSize: 13,
              }}
            >
              Searching…
            </div>
          )}
          {!loading && results.length === 0 && (
            <div style={{ padding: 32, textAlign: "center" }}>
              <svg
                width="30"
                height="30"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#9ca3af"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ marginBottom: 8 }}
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <div style={{ fontSize: 13, color: "#9ca3af" }}>
                {search.trim()
                  ? "No users found."
                  : "No available contacts based on your role."}
              </div>
            </div>
          )}
          {!loading &&
            results.map((profile) => (
              <div
                key={profile.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 22px",
                  borderBottom: "1px solid #f9f9f9",
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.background = "#f8f9fc")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <Avatar name={profile.full_name || profile.email} size={40} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 13.5,
                      color: "#111827",
                      display: "flex",
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    {profile.full_name || profile.email}
                    <RoleBadge
                      role={normRole(profile.role)}
                      branch={profile.branch}
                    />
                  </div>
                  <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>
                    {profile.email}
                  </div>
                </div>
                <button
                  onClick={() => handleAdd(profile)}
                  disabled={adding === profile.id}
                  style={{
                    padding: "7px 16px",
                    borderRadius: 8,
                    border: "none",
                    background: adding === profile.id ? "#e5e7eb" : "#6366f1",
                    color: adding === profile.id ? "#9ca3af" : "#fff",
                    fontWeight: 600,
                    fontSize: 12,
                    cursor: adding === profile.id ? "default" : "pointer",
                    flexShrink: 0,
                    fontFamily: "inherit",
                  }}
                >
                  {adding === profile.id ? "Adding…" : "Message"}
                </button>
              </div>
            ))}
        </div>
        <div
          style={{
            padding: "12px 22px",
            borderTop: "1px solid #f0f0f6",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "9px 20px",
              borderRadius: 9,
              border: "1.5px solid #e5e7eb",
              background: "#fff",
              color: "#374151",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

const ConversationMenu = ({ onDelete, onClear }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: 34,
          height: 34,
          borderRadius: "50%",
          border: "none",
          background: open ? "#f0f0f6" : "transparent",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="#6b7280">
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
        </svg>
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: 40,
            right: 0,
            zIndex: 999,
            background: "#fff",
            borderRadius: 14,
            boxShadow: "0 8px 30px rgba(0,0,0,0.14)",
            border: "1px solid #f0f0f6",
            minWidth: 220,
            overflow: "hidden",
          }}
        >
          <button
            onClick={() => {
              onClear();
              setOpen(false);
            }}
            style={{
              width: "100%",
              padding: "12px 16px",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 13,
              color: "#374151",
              fontWeight: 500,
              textAlign: "left",
            }}
          >
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: 9,
                background: "#fef3c7",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#d97706"
                strokeWidth="2.2"
              >
                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
              </svg>
            </span>
            <div>
              <div style={{ fontWeight: 600 }}>Clear messages</div>
              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 1 }}>
                Remove from your view
              </div>
            </div>
          </button>
          <div style={{ height: 1, background: "#f0f0f6", margin: "0 12px" }} />
          <button
            onClick={() => {
              onDelete();
              setOpen(false);
            }}
            style={{
              width: "100%",
              padding: "12px 16px",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 13,
              color: "#dc2626",
              fontWeight: 500,
              textAlign: "left",
            }}
          >
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: 9,
                background: "#fef2f2",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#dc2626"
                strokeWidth="2.2"
              >
                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
              </svg>
            </span>
            <div>
              <div style={{ fontWeight: 600 }}>Delete conversation</div>
              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 1 }}>
                Permanently delete all messages
              </div>
            </div>
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
  const onlineIds = usePresence(user?.id);
  const location = useLocation();

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
  const [modal, setModal] = useState({
    show: false,
    title: "",
    message: "",
    type: "error",
    onConfirm: null,
    confirmText: "OK",
    cancelText: null,
  });
  const [mobileView, setMobileView] = useState("list");

  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const pollRef = useRef(null);

  const showModal = (
    title,
    message,
    type = "error",
    onConfirm = null,
    confirmText = "OK",
    cancelText = null,
  ) =>
    setModal({
      show: true,
      title,
      message,
      type,
      onConfirm,
      confirmText,
      cancelText,
    });
  const closeModal = () => setModal((m) => ({ ...m, show: false }));

  const currentUser = useMemo(
    () =>
      user
        ? {
            id: user.id,
            email: user.email,
            name: user.fullName,
            role: normRole(user.role),
            branch: normBranch(user.branchId || ""),
            branchId: user.branchId,
          }
        : null,
    [user?.id, user?.email, user?.fullName, user?.role, user?.branchId],
  );

  // ── Same-branch contacts ─────────────────────────────────────────────────
  // initialLoadDone: tracks whether the very first fetch finished.
  // Background re-fetches (triggered by realtime) run silently — no setLoading(true)
  // so the sidebar never blanks/flickers while refreshing.
  const initialLoadDone = useRef(false);
  const fetchClientsRunning = useRef(false);
  const fetchClientsTimer = useRef(null);

  const fetchClients = useCallback(async () => {
    if (!currentUser) return;
    if (fetchClientsRunning.current) return;
    fetchClientsRunning.current = true;
    if (fetchClientsTimer.current) clearTimeout(fetchClientsTimer.current);
    try {
      if (!initialLoadDone.current) setLoading(true);

      // Query both message tables for this user's conversations
      const [sameResult, crossResult] = await Promise.all([
        supabase
          .from(MESSAGES_TABLE)
          .select("sender_id,receiver_id,created_at")
          .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
          .order("created_at", { ascending: false }),
        supabase
          .from(CROSS_BRANCH_TABLE)
          .select("sender_id,recipient_id,created_at")
          .or(
            `sender_id.eq.${currentUser.id},recipient_id.eq.${currentUser.id}`,
          )
          .order("created_at", { ascending: false }),
      ]);

      // Track the most recent message timestamp per conversation partner
      const lastMsgMap = {};
      (sameResult.data || []).forEach((m) => {
        const other =
          m.sender_id === currentUser.id ? m.receiver_id : m.sender_id;
        if (!other) return;
        if (
          !lastMsgMap[other] ||
          new Date(m.created_at) > new Date(lastMsgMap[other])
        ) {
          lastMsgMap[other] = m.created_at;
        }
      });
      (crossResult.data || []).forEach((m) => {
        const other =
          m.sender_id === currentUser.id ? m.recipient_id : m.sender_id;
        if (!other) return;
        if (
          !lastMsgMap[other] ||
          new Date(m.created_at) > new Date(lastMsgMap[other])
        ) {
          lastMsgMap[other] = m.created_at;
        }
      });

      const sameBranchPartnerIds = (sameResult.data || []).map((m) =>
        m.sender_id === currentUser.id ? m.receiver_id : m.sender_id,
      );

      const crossBranchPartnerIds = (crossResult.data || []).map((m) =>
        m.sender_id === currentUser.id ? m.recipient_id : m.sender_id,
      );

      const allPartnerIds = [
        ...new Set([...sameBranchPartnerIds, ...crossBranchPartnerIds]),
      ].filter(Boolean);

      if (!allPartnerIds.length) {
        setClients([]);
        setLoading(false);
        initialLoadDone.current = true;
        fetchClientsRunning.current = false;
        return;
      }

      // Fetch profiles with NO filters — super_admin from any branch must resolve
      const { data: profileData, error: profileError } = await supabase
        .from(PROFILES_TABLE)
        .select("id,first_name,last_name,email,role,branch_id")
        .in("id", allPartnerIds);

      const profileMap = {};
      (profileData || []).forEach((p) => {
        profileMap[p.id] = {
          ...p,
          full_name: toFullName(p),
          branch: normBranch(p.branch_id || ""),
        };
      });

      // For any IDs not found in profiles (e.g. deleted users), try patients
      const missingIds = allPartnerIds.filter((id) => !profileMap[id]);
      if (missingIds.length) {
        const { data: patientData } = await supabase
          .from(PATIENTS_TABLE)
          .select("owner_user_id,owner,owner_email")
          .in("owner_user_id", missingIds);
        (patientData || []).forEach((p) => {
          if (!profileMap[p.owner_user_id]) {
            profileMap[p.owner_user_id] = {
              id: p.owner_user_id,
              full_name: p.owner || null,
              email: p.owner_email || "",
              role: "customer",
              branch: currentUser.branch,
            };
          }
        });
      }

      const crossSet = new Set(crossBranchPartnerIds);
      const sameSet = new Set(sameBranchPartnerIds);

      const contacts = allPartnerIds
        .map((id) => profileMap[id] ?? null)
        .filter(Boolean)
        .filter((p) => {
          // If there's any message record in either table → always show, no gate.
          // isMessageableTarget is directional and blocks manager from seeing super_admin.
          if (crossSet.has(p.id)) return true;
          if (sameSet.has(p.id)) return true;
          return false;
        })
        .map((p) => ({
          ...p,
          full_name: p.full_name || toFullName(p),
          // Mark as cross if found in cross table OR either side is super_admin
          isCrossBranch:
            crossSet.has(p.id) ||
            normRole(p.role) === "super_admin" ||
            normRole(currentUser.role) === "super_admin",
          lastMessageAt: lastMsgMap[p.id] || null,
        }))
        .sort(
          (a, b) =>
            new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0),
        );

      setClients((prev) => {
        const same =
          prev.length === contacts.length &&
          contacts.every((a, i) => prev[i]?.id === a.id);
        return same ? prev : contacts;
      });

      setLoading(false);
      initialLoadDone.current = true;
    } catch (e) {
      // silently handled
    } finally {
      fetchClientsRunning.current = false;
      initialLoadDone.current = true;
    }
  }, [currentUser]);

  useEffect(() => {
    fetchClients();
    // Re-fetch after 2s to catch any messages that arrived before realtime subscribed
    const t = setTimeout(() => {
      fetchClientsRunning.current = false;
      fetchClients();
    }, 2000);
    return () => clearTimeout(t);
  }, [fetchClients]);

  useEffect(() => {
    if (user) logActivity(currentUser, "Viewed messages", "Opened messaging");
  }, []);

  // ── Cross-branch / cross-role contacts ───────────────────────────────────
  const fetchCrossContacts = useCallback(async () => {
    if (!currentUser?.id) return;
    const targets = getCrossBranchTargets(currentUser.role, currentUser.branch);
    if (targets.length === 0) {
      setCrossContacts([]);
      return;
    }

    // Build OR filter — branch="" means any branch
    const orFilters = targets
      .map((t) =>
        t.branch
          ? `and(role.ilike.${t.role},branch_id.eq.${currentUser.branchId})`
          : `role.ilike.${t.role}`,
      )
      .join(",");

    const { data, error } = await supabase
      .from(PROFILES_TABLE)
      .select("id,first_name,last_name,email,role,branch_id,branches(name)")
      .or(orFilters);

    if (error) return;
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
        })),
    );
  }, [
    currentUser?.id,
    currentUser?.role,
    currentUser?.branch,
    currentUser?.branchId,
  ]);

  useEffect(() => {
    fetchCrossContacts();
  }, [fetchCrossContacts]);

  // ── Fetch messages ────────────────────────────────────────────────────────
  // keepOptimistic: preserve _pending messages during a background refresh (avoids flicker)
  const fetchMessages = useCallback(
    async (partner, keepOptimistic = false) => {
      if (!partner?.id || !currentUser?.id) return;

      const isCrossRead =
        !!partner.isCrossBranch ||
        normRole(currentUser.role) === "super_admin" ||
        normRole(partner.role || "") === "super_admin";

      let fetched = [];

      // Always query BOTH tables — never rely solely on isCrossBranch flag.
      // This guarantees super_admin messages always appear for the manager.
      const [crossResult, sameResult] = await Promise.all([
        supabase
          .from(CROSS_BRANCH_TABLE)
          .select("*")
          .or(
            `and(sender_id.eq.${currentUser.id},recipient_id.eq.${partner.id}),and(sender_id.eq.${partner.id},recipient_id.eq.${currentUser.id})`,
          )
          .order("created_at", { ascending: true }),
        supabase
          .from(MESSAGES_TABLE)
          .select("*")
          .or(
            `and(sender_id.eq.${currentUser.id},receiver_id.eq.${partner.id}),and(sender_id.eq.${partner.id},receiver_id.eq.${currentUser.id})`,
          )
          .order("created_at", { ascending: true }),
      ]);

      const crossMsgs = (crossResult.data || []).map((m) => ({
        ...m,
        message: m.content,
        receiver_id: m.recipient_id,
        _source: "cross",
      }));
      const sameMsgs = (sameResult.data || []).map((m) => ({
        ...m,
        _source: "same",
      }));

      // Merge by unique id and sort chronologically
      const seenIds = new Set();
      fetched = [...crossMsgs, ...sameMsgs]
        .filter((m) => {
          if (!m.id || seenIds.has(m.id)) return false;
          seenIds.add(m.id);
          return true;
        })
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

      // Also mark this partner as cross-branch if we found cross messages
      if (crossMsgs.length > 0) {
        setSelected((prev) =>
          prev?.id === partner.id ? { ...prev, isCrossBranch: true } : prev,
        );
      }

      setMessages((prev) => {
        // Re-attach any still-pending optimistic messages so they don't disappear mid-flight
        const pending = keepOptimistic ? prev.filter((m) => m._pending) : [];
        return [...fetched, ...pending];
      });
      setTimeout(
        () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
        80,
      );
    },
    [currentUser],
  );

  // ── Global realtime listener for cross-branch messages ───────────────────
  useEffect(() => {
    if (!currentUser?.id) return;
    const globalCh = supabase
      .channel(`global-cross-${currentUser.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: CROSS_BRANCH_TABLE,
        },
        (payload) => {
          const msg = payload.new;
          if (!msg) return;
          if (
            msg.recipient_id === currentUser.id ||
            msg.sender_id === currentUser.id
          ) {
            if (fetchClientsTimer.current)
              clearTimeout(fetchClientsTimer.current);
            fetchClientsTimer.current = setTimeout(() => {
              fetchClientsRunning.current = false;
              fetchClients();
            }, 300);
            setSelected((prev) => {
              if (
                prev &&
                (prev.id === msg.sender_id || prev.id === msg.recipient_id)
              ) {
                fetchMessages(prev);
              }
              return prev;
            });
          }
        },
      )
      .subscribe();
    return () => supabase.removeChannel(globalCh);
  }, [currentUser?.id, fetchClients, fetchMessages]);

  // ── Subscribe to active conversation ─────────────────────────────────────
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (!selected || !currentUser) return;
    fetchMessages(selected);

    // Always mark both tables — ensures super_admin → manager messages get marked read
    supabase
      .from(CROSS_BRANCH_TABLE)
      .update({ is_read: true })
      .eq("recipient_id", currentUser.id)
      .eq("sender_id", selected.id)
      .eq("is_read", false);
    supabase
      .from(MESSAGES_TABLE)
      .update({ is_read: true })
      .eq("receiver_id", currentUser.id)
      .eq("sender_id", selected.id)
      .eq("is_read", false);
    setUnread((prev) => ({ ...prev, [selected.id]: 0 }));

    // Subscribe to BOTH tables so manager always sees super_admin messages in real time
    const channel = supabase
      .channel(`messages-rt-both-${selected.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: CROSS_BRANCH_TABLE },
        (payload) => {
          const msg = payload.new || payload.old;
          if (!msg) return;
          const isRelevant =
            (msg.sender_id === currentUser.id &&
              msg.recipient_id === selected.id) ||
            (msg.sender_id === selected.id &&
              msg.recipient_id === currentUser.id);
          if (isRelevant) {
            // Always refetch on UPDATE (e.g. is_read flips true) so "Seen" shows up for the sender.
            // For INSERT, skip only when it's our own optimistic send.
            if (
              payload.eventType === "UPDATE" ||
              msg.sender_id !== currentUser.id
            )
              fetchMessages(selected, true);
            if (fetchClientsTimer.current)
              clearTimeout(fetchClientsTimer.current);
            fetchClientsTimer.current = setTimeout(() => fetchClients(), 1500);
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: MESSAGES_TABLE },
        (payload) => {
          const msg = payload.new || payload.old;
          if (!msg) return;
          const isRelevant =
            (msg.sender_id === currentUser.id &&
              msg.receiver_id === selected.id) ||
            (msg.sender_id === selected.id &&
              msg.receiver_id === currentUser.id);
          if (isRelevant) {
            if (
              payload.eventType === "UPDATE" ||
              msg.sender_id !== currentUser.id
            )
              fetchMessages(selected, true);
            if (fetchClientsTimer.current)
              clearTimeout(fetchClientsTimer.current);
            fetchClientsTimer.current = setTimeout(() => fetchClients(), 1500);
          }
        },
      )
      .subscribe();

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
      const [{ data: sameUnread }, { data: crossUnread }] = await Promise.all([
        supabase
          .from(MESSAGES_TABLE)
          .select("sender_id")
          .eq("receiver_id", currentUser.id)
          .eq("is_read", false),
        supabase
          .from(CROSS_BRANCH_TABLE)
          .select("sender_id")
          .eq("recipient_id", currentUser.id)
          .eq("is_read", false),
      ]);
      (sameUnread || []).forEach((m) => {
        counts[m.sender_id] = (counts[m.sender_id] || 0) + 1;
      });
      (crossUnread || []).forEach((m) => {
        counts[m.sender_id] = (counts[m.sender_id] || 0) + 1;
      });
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
    const senderRole = normRole(currentUser.role);
    const recipientRole = normRole(selected.role || "");
    const allowed =
      senderRole === "super_admin" ||
      recipientRole === "super_admin" ||
      canMessageCrossBranch(
        { role: currentUser.role, branch: currentUser.branch },
        { role: recipientRole, branch: normBranch(selected.branch || "") },
      );

    if (!allowed) {
      showModal(
        "Not Allowed",
        "You are not permitted to message this user.",
        "error",
      );
      return;
    }

    setSending(true);

    const optimistic = {
      id: `tmp-${Date.now()}`,
      sender_id: currentUser.id,
      receiver_id: selected.id,
      message: text,
      is_read: false,
      created_at: new Date().toISOString(),
      _pending: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    setNewMsg("");
    setTimeout(
      () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
      80,
    );

    // ── Determine which table to write to ──────────────────────────────
    // Always use cross_branch_messages when either side is super_admin,
    // OR when the contact was flagged as cross-branch at selection time.
    const isCrossWrite =
      normRole(currentUser.role) === "super_admin" ||
      normRole(selected.role || "") === "super_admin" ||
      (!!selected.isCrossBranch &&
        normBranch(currentUser.branch) !== normBranch(selected.branch || ""));

    let error, insertedRow;
    if (isCrossWrite) {
      const { data, error: e } = await supabase
        .from(CROSS_BRANCH_TABLE)
        .insert([
          {
            sender_id: currentUser.id,
            sender_name: currentUser.name,
            sender_role: currentUser.role || "super_admin",
            sender_branch: currentUser.branch || "head_office",
            recipient_id: selected.id,
            recipient_name: selected.full_name || selected.email,
            recipient_role: selected.role || "manager",
            recipient_branch: selected.branch || "head_office",
            content: text,
          },
        ])
        .select()
        .single();
      error = e;
      if (data)
        insertedRow = {
          ...data,
          message: data.content,
          receiver_id: data.recipient_id,
        };
    } else {
      const { data, error: e } = await supabase
        .from(MESSAGES_TABLE)
        .insert([
          {
            sender_id: currentUser.id,
            receiver_id: selected.id,
            message: text,
            is_read: false,
            branch_id: user?.branchId ?? null,
          },
        ])
        .select()
        .single();
      error = e;
      insertedRow = data;
    }

    setSending(false);
    if (error) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      showModal(
        "Failed to Send",
        `${error.message || error.code || "Unknown error"} (table: ${isCrossWrite ? "cross_branch_messages" : "messages"})`,
        "error",
      );
    } else {
      // Swap the optimistic bubble for the real DB row — zero extra round-trip, no flicker
      setMessages((prev) =>
        prev.map((m) =>
          m.id === optimistic.id ? { ...insertedRow, _confirmed: true } : m,
        ),
      );
      // Bump this contact to the top of the sidebar immediately
      const sentAt = new Date().toISOString();
      setClients((prev) =>
        [...prev]
          .map((c) =>
            c.id === selected.id ? { ...c, lastMessageAt: sentAt } : c,
          )
          .sort(
            (a, b) =>
              new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0),
          ),
      );
    }
  };
  const handleClearMessages = () =>
    showModal(
      "Clear Messages",
      `Remove all messages with ${selected?.full_name || selected?.email} from your view?`,
      "confirm",
      () => {
        setMessages([]);
        closeModal();
      },
      "Clear",
      "Cancel",
    );

  const handleDeleteConversation = () => {
    const myId = currentUser?.id;
    showModal(
      "Delete Conversation",
      `Permanently delete your conversation with ${selected?.full_name || selected?.email}?`,
      "confirm",
      async () => {
        closeModal();
        setDeleting(true);
        const [{ data: crossRows }, { data: sameRows }] = await Promise.all([
          supabase
            .from(CROSS_BRANCH_TABLE)
            .select("id")
            .or(
              `and(sender_id.eq.${myId},recipient_id.eq.${selected.id}),and(sender_id.eq.${selected.id},recipient_id.eq.${myId})`,
            ),
          supabase
            .from(MESSAGES_TABLE)
            .select("id")
            .or(
              `and(sender_id.eq.${myId},receiver_id.eq.${selected.id}),and(sender_id.eq.${selected.id},receiver_id.eq.${myId})`,
            ),
        ]);
        const crossIds = (crossRows || []).map((r) => r.id);
        const sameIds = (sameRows || []).map((r) => r.id);
        if (crossIds.length)
          await supabase.from(CROSS_BRANCH_TABLE).delete().in("id", crossIds);
        if (sameIds.length)
          await supabase.from(MESSAGES_TABLE).delete().in("id", sameIds);
        setDeleting(false);
        setMessages([]);
        fetchClients();
      },
      "Delete Forever",
      "Cancel",
    );
  };

  const handleAddClient = async (profile) => {
    const senderRole = normRole(currentUser.role);
    const recipientRole = normRole(profile.role);
    const senderBranch = normBranch(currentUser.branchId || "");
    const recipientBranch = normBranch(
      profile.branch_id || profile.branch || "",
    );

    // Use cross_branch_messages when the sender is super_admin,
    // OR roles differ, OR branches differ — this ensures super_admin → manager
    // always writes to cross_branch_messages so the manager can read it.
    const isCross =
      senderRole === "super_admin" ||
      recipientRole === "super_admin" ||
      senderBranch !== recipientBranch;

    setClients((prev) =>
      prev.some((c) => c.id === profile.id) ? prev : [profile, ...prev],
    );

    if (currentUser?.id) {
      if (isCross) {
        await supabase.from(CROSS_BRANCH_TABLE).insert([
          {
            sender_id: currentUser.id,
            sender_name: currentUser.name,
            sender_role: currentUser.role || "super_admin",
            sender_branch: currentUser.branch || "head_office",
            recipient_id: profile.id,
            recipient_name: profile.full_name || profile.email,
            recipient_role: normRole(profile.role) || "manager",
            recipient_branch:
              normBranch(profile.branch_id || profile.branch || "") ||
              "head_office",
            content: `Hello ${profile.full_name || "there"}! 👋`,
          },
        ]);
      } else {
        await supabase.from(MESSAGES_TABLE).insert([
          {
            sender_id: currentUser.id,
            receiver_id: profile.id,
            message: `Hello ${profile.full_name || "there"}! 👋`,
            is_read: false,
            branch_id: user?.branchId ?? null,
          },
        ]);
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
  const mergedContacts = useMemo(
    () =>
      [
        // Keep isCrossBranch exactly as set by fetchClients — do NOT re-derive it here
        // because canMessageCrossBranch is directional and returns false for
        // manager→super_admin, which would hide the super admin from the sidebar.
        ...clients,
        ...crossContacts.filter((cc) => !clients.some((c) => c.id === cc.id)),
      ].sort(
        (a, b) =>
          new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0),
      ),
    [clients, crossContacts],
  );

  // ── Opened from a notification bell click (Layout passes {state:{openWith}}) ──
  // Selecting the conversation here triggers fetchMessages + the mark-as-read
  // calls in the "subscribe to active conversation" effect above, which is what
  // actually clears the unread badge/count everywhere else in the app.
  const openWithHandled = useRef(false);
  useEffect(() => {
    const openWithId = location.state?.openWith;
    if (!openWithId || openWithHandled.current || !currentUser?.id) return;
    openWithHandled.current = true;

    const existing = mergedContacts.find((c) => c.id === openWithId);
    if (existing) {
      setSelected(existing);
      setMobileView("chat");
      return;
    }

    // Not in the sidebar list yet (e.g. very first message) — fetch the profile directly
    supabase
      .from(PROFILES_TABLE)
      .select("id,first_name,last_name,email,role,branch_id")
      .eq("id", openWithId)
      .single()
      .then(({ data }) => {
        if (!data) return;
        setSelected({
          ...data,
          full_name: toFullName(data),
          branch: normBranch(data.branch_id || ""),
        });
        setMobileView("chat");
      });
  }, [location.state, currentUser?.id, mergedContacts]);
  const filteredClients = mergedContacts.filter(
    (c) =>
      !search ||
      (c.full_name || c.email || "")
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const grouped = groupByDate(messages);
  const existingClientIds = clients.map((c) => c.id);
  const totalUnread = Object.values(unread).reduce((a, b) => a + b, 0);

  return (
    <Layout>
      {/* Pass full currentUser object so AddClientModal can apply role-based filtering */}
      <AddClientModal
        show={showAdd}
        onClose={() => setShowAdd(false)}
        currentUser={currentUser}
        existingClientIds={existingClientIds}
        onAdd={handleAddClient}
      />
      <Modal
        show={modal.show}
        title={modal.title}
        message={modal.message}
        type={modal.type}
        onClose={closeModal}
        onConfirm={modal.onConfirm}
        confirmText={modal.confirmText}
        cancelText={modal.cancelText}
      />

      <div
        className="msg-page"
        style={{
          position: "fixed",
          top: 68,
          left: 0,
          right: 0,
          bottom: 0,
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "300px 1fr",
          background: "var(--bg)",
          overflow: "hidden",
        }}
      >
        {/* ══ LEFT SIDEBAR ══════════════════════════════════════════════════════ */}
        <div
          style={{
            display: isMobile && mobileView === "chat" ? "none" : "flex",
            flexDirection: "column",
            background: "var(--card)",
            borderRight: "1.5px solid var(--border)",
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "18px 18px 12px",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 14,
              }}
            >
              <Avatar name={currentUser?.name} size={40} me />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 14,
                    color: "var(--text)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {currentUser?.name || "Loading…"}
                </div>
                <div
                  style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}
                >
                  Messages
                </div>{" "}
              </div>
              {totalUnread > 0 && (
                <div
                  style={{
                    background: "#ef4444",
                    color: "#fff",
                    borderRadius: 99,
                    fontSize: 10,
                    fontWeight: 700,
                    minWidth: 18,
                    height: 18,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 5px",
                    flexShrink: 0,
                  }}
                >
                  {totalUnread > 9 ? "9+" : totalUnread}
                </div>
              )}
            </div>
            <div style={{ position: "relative" }}>
              <svg
                style={{
                  position: "absolute",
                  left: 11,
                  top: "50%",
                  transform: "translateY(-50%)",
                  pointerEvents: "none",
                }}
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#9ca3af"
                strokeWidth="2.5"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conversations…"
                style={{
                  width: "100%",
                  padding: "9px 12px 9px 32px",
                  borderRadius: 10,
                  border: "1.5px solid var(--border)",
                  background: "var(--bg)",
                  fontSize: 13,
                  color: "var(--text)",
                  outline: "none",
                  fontFamily: "inherit",
                }}
              />
            </div>
          </div>

          <div
            style={{
              padding: "10px 18px 6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.6px",
                }}
              >
                Conversations
              </span>
              {filteredClients.length > 0 && (
                <span style={{ fontSize: 11, color: "var(--muted)" }}>
                  {filteredClients.length}
                </span>
              )}
            </div>
            <button
              onClick={() => setShowAdd(true)}
              className="msg-add-btn"
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                border: "none",
                background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#fff"
                strokeWidth="2.8"
                strokeLinecap="round"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>

          <div
            className="sidebar-scroll"
            style={{ flex: 1, overflowY: "auto" }}
          >
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 18px",
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: "50%",
                      background: "#f0f0f0",
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        height: 12,
                        borderRadius: 6,
                        background: "#f0f0f0",
                        marginBottom: 6,
                        width: "60%",
                      }}
                    />
                  </div>
                </div>
              ))
            ) : filteredClients.length === 0 ? (
              <div style={{ padding: 28, textAlign: "center" }}>
                <svg
                  width="36"
                  height="36"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#c7d2fe"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ marginBottom: 10 }}
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#374151",
                    marginBottom: 6,
                  }}
                >
                  No conversations yet
                </div>
                <div
                  style={{ fontSize: 12, color: "#9ca3af", marginBottom: 14 }}
                >
                  {search ? "No matches found." : "Start messaging someone"}
                </div>
                {!search && (
                  <button
                    onClick={() => setShowAdd(true)}
                    style={{
                      padding: "9px 20px",
                      borderRadius: 9,
                      border: "none",
                      background: "#6366f1",
                      color: "#fff",
                      fontWeight: 600,
                      fontSize: 12,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    + New Message
                  </button>
                )}
              </div>
            ) : (
              filteredClients.map((c) => {
                const isActive = selected?.id === c.id;
                const badge = unread[c.id] || 0;
                return (
                  <div
                    key={c.id}
                    className={`client-row ${isActive ? "active" : ""}`}
                    onClick={() => {
                      setSelected(c);
                      setMobileView("chat");
                      setTimeout(() => inputRef.current?.focus(), 100);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 18px",
                      borderLeft: `3px solid ${isActive ? "#6366f1" : "transparent"}`,
                      background: isActive ? "#eff0fe" : "transparent",
                    }}
                  >
                    <Avatar
                      name={c.full_name || c.email}
                      size={44}
                      online={onlineIds.has(c.id)}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: badge > 0 ? 700 : 600,
                          fontSize: 13.5,
                          color: "var(--text)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        <span
                          style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {c.full_name || c.email || "Unknown"}
                        </span>
                        {c.role && (
                          <RoleBadge
                            role={normRole(c.role)}
                            branch={
                              c.isCrossBranch ? c.branchName || c.branch : ""
                            }
                          />
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: 11.5,
                          color: badge > 0 ? "#6366f1" : "var(--muted)",
                          marginTop: 2,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          fontWeight: badge > 0 ? 600 : 400,
                        }}
                      >
                        {c.email || "—"}
                      </div>
                    </div>
                    {badge > 0 && (
                      <div
                        style={{
                          minWidth: 20,
                          height: 20,
                          borderRadius: 20,
                          background: "#6366f1",
                          color: "#fff",
                          fontSize: 10.5,
                          fontWeight: 800,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: "0 6px",
                          flexShrink: 0,
                        }}
                      >
                        {badge > 9 ? "9+" : badge}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ══ RIGHT CHAT PANE ═══════════════════════════════════════════════════ */}
        <div
          style={{
            display: isMobile && mobileView === "list" ? "none" : "flex",
            flexDirection: "column",
            overflow: "hidden",
            minHeight: 0,
          }}
        >
          {!selected ? (
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 16,
                background: "var(--bg)",
              }}
            >
              {" "}
              <div
                style={{
                  width: 90,
                  height: 90,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg,#ede9fe,#dbeafe)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#6366f1"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: "var(--text)",
                    marginBottom: 6,
                  }}
                >
                  Your Messages
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--muted)",
                    marginBottom: 20,
                  }}
                >
                  Select a conversation or start a new one
                </div>
                <button
                  onClick={() => setShowAdd(true)}
                  style={{
                    padding: "11px 26px",
                    borderRadius: 11,
                    border: "none",
                    background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                    color: "#fff",
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    margin: "0 auto",
                  }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="10" y1="11" x2="14" y2="11" />
                  </svg>
                  New Message
                </button>
              </div>
            </div>
          ) : (
            <>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 20px",
                  background: "var(--card)",
                  borderBottom: "1.5px solid var(--border)",
                  flexShrink: 0,
                }}
              >
                {isMobile && (
                  <button
                    onClick={() => setMobileView("list")}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#6366f1",
                      fontSize: 20,
                      lineHeight: 1,
                      padding: "0 6px 0 0",
                      flexShrink: 0,
                    }}
                  >
                    ←
                  </button>
                )}
                <Avatar
                  name={selected.full_name || selected.email || "?"}
                  size={44}
                  online={onlineIds.has(selected.id)}
                />
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 15,
                      color: "var(--text)",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    {selected.full_name || selected.email || "Unknown User"}
                    {selected.role && (
                      <RoleBadge
                        role={normRole(selected.role)}
                        branch={
                          selected.isCrossBranch
                            ? selected.branchName || selected.branch
                            : ""
                        }
                      />
                    )}
                  </div>
                </div>
                <ConversationMenu
                  onClear={handleClearMessages}
                  onDelete={handleDeleteConversation}
                />
              </div>

              {deleting && (
                <div
                  style={{
                    padding: "10px 20px",
                    background: "#fef2f2",
                    borderBottom: "1px solid #fecaca",
                    fontSize: 13,
                    color: "#dc2626",
                  }}
                >
                  Deleting conversation…
                </div>
              )}

              <div
                className="chat-scroll"
                style={{
                  flex: 1,
                  overflowY: "auto",
                  overflowX: "hidden",
                  padding: "20px 24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                  background: "#f4f6fb",
                  minHeight: 0,
                }}
              >
                {messages.length === 0 && !deleting && (
                  <div style={{ margin: "auto", textAlign: "center" }}>
                    <svg
                      width="32"
                      height="32"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#c7d2fe"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ marginBottom: 8 }}
                    >
                      <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
                      <line x1="12" y1="2" x2="12" y2="12" />
                    </svg>
                    <div style={{ fontSize: 14, color: "#9ca3af" }}>
                      No messages yet. Say hello!
                    </div>
                  </div>
                )}
                {grouped.map((item, i) => {
                  if (item.type === "divider")
                    return (
                      <div
                        key={`d-${i}`}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          margin: "18px 0 8px",
                        }}
                      >
                        <div
                          style={{ flex: 1, height: 1, background: "#e5e7eb" }}
                        />
                        <span
                          style={{
                            fontSize: 11,
                            color: "#9ca3af",
                            fontWeight: 600,
                            background: "#f4f6fb",
                            padding: "2px 12px",
                            borderRadius: 99,
                            border: "1px solid #e5e7eb",
                          }}
                        >
                          {item.label}
                        </span>
                        <div
                          style={{ flex: 1, height: 1, background: "#e5e7eb" }}
                        />
                      </div>
                    );
                  const me = item.sender_id === currentUser?.id;
                  return (
                    <div
                      key={item.id}
                      className="bubble"
                      style={{
                        display: "flex",
                        justifyContent: me ? "flex-end" : "flex-start",
                        alignItems: "flex-end",
                        gap: 8,
                        marginTop: 3,
                      }}
                    >
                      {!me && (
                        <Avatar
                          name={selected.full_name || selected.email || "?"}
                          size={28}
                        />
                      )}
                      <div style={{ maxWidth: "62%" }}>
                        <div
                          style={{
                            background: me
                              ? "linear-gradient(135deg,#6366f1,#8b5cf6)"
                              : "#fff",
                            color: me ? "#fff" : "#111827",
                            padding: "10px 14px",
                            borderRadius: me
                              ? "18px 18px 4px 18px"
                              : "18px 18px 18px 4px",
                            fontSize: 14,
                            lineHeight: 1.55,
                            opacity: item._pending ? 0.55 : 1,
                            boxShadow: me
                              ? "0 3px 14px rgba(99,102,241,0.3)"
                              : "0 1px 4px rgba(0,0,0,0.08)",
                            wordBreak: "break-word",
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {item.message}
                        </div>
                        <div
                          style={{
                            fontSize: 10.5,
                            color: "#9ca3af",
                            marginTop: 4,
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            justifyContent: me ? "flex-end" : "flex-start",
                          }}
                        >
                          {fmtTime(item.created_at)}
                          {item._pending && (
                            <span style={{ fontStyle: "italic" }}>
                              sending…
                            </span>
                          )}
                          {me &&
                            !item._pending &&
                            (item.is_read ? (
                              <span
                                style={{ color: "#6366f1", fontWeight: 600 }}
                              >
                                Seen
                              </span>
                            ) : (
                              <svg
                                width="12"
                                height="12"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#9ca3af"
                                strokeWidth="2.5"
                              >
                                <path d="M20 6 9 17l-5-5" />
                              </svg>
                            ))}
                        </div>
                      </div>
                      {me && <Avatar name={currentUser.name} size={28} me />}
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              <div
                style={{
                  background: "#fff",
                  borderTop: "1.5px solid #eef0f6",
                  flexShrink: 0,
                  zIndex: 2,
                }}
              >
                <div
                  className="emoji-quick"
                  style={{ padding: "8px 18px 0", display: "flex", gap: 2 }}
                >
                  {["👍", "❤️", "😊", "😂", "🙏", "👋", "✅", "🐾"].map(
                    (text) => (
                      <span
                        key={text}
                        title={text}
                        onClick={() => setNewMsg((p) => p + text)}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          fontSize: 18,
                          transition: "background 0.12s, transform 0.1s",
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.background = "#f0f0f6";
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.background = "transparent";
                        }}
                      >
                        {text}
                      </span>
                    ),
                  )}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 18px 14px",
                  }}
                >
                  <input
                    ref={inputRef}
                    className="msg-input"
                    value={newMsg}
                    onChange={(e) => setNewMsg(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder={`Message ${selected.full_name || selected.email}…`}
                    style={{
                      flex: 1,
                      padding: "12px 18px",
                      borderRadius: 26,
                      border: "1.5px solid #e5e7eb",
                      background: "#f8f9fc",
                      fontSize: 14,
                      color: "#111827",
                      fontFamily: "inherit",
                    }}
                  />
                  <button
                    className="send-btn"
                    onClick={sendMessage}
                    disabled={sending || !newMsg.trim()}
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: "50%",
                      border: "none",
                      background:
                        sending || !newMsg.trim()
                          ? "#e5e7eb"
                          : "linear-gradient(135deg,#6366f1,#8b5cf6)",
                      cursor: sending || !newMsg.trim() ? "default" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={sending || !newMsg.trim() ? "#9ca3af" : "#fff"}
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M22 2 11 13" />
                      <path d="M22 2 15 22 11 13 2 9l20-7z" />
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
