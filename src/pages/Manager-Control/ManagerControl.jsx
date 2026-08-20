import React, { useState, useEffect, useCallback } from "react";
import Layout from "../../components/layout";
import { supabase, supabaseAdmin } from "../../js/Utils/supabase";
import { useCurrentUser } from "../../js/hooks/Usecurrentuser";
import "../../styles/ManagerControl.css";

// ── Helpers ───────────────────────────────────────────────────────────────────
const ROLE_BADGE = {
  admin: "badge-purple",
  manager: "badge-blue",
  employee: "badge-green",
  customer: "badge-gray",
  Admin: "badge-purple",
  Manager: "badge-blue",
  Employee: "badge-green",
  Customer: "badge-gray",
};
const AVATAR_COLORS = {
  Admin: { bg: "#ede9fe", color: "#6d28d9" },
  Manager: { bg: "#dbeafe", color: "#1d4ed8" },
  Employee: { bg: "#dcfce7", color: "#15803d" },
  Customer: { bg: "#f3f4f6", color: "#4b5563" },
};

const generateEmail = (
  firstName,
  lastName = "",
  role = "",
  existingEmails = [],
  branchAbbr = "",
) => {
  const cleanFirst = (firstName || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9]/g, "");
  const cleanLast = (lastName || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9]/g, "");
  const base =
    cleanFirst && cleanLast
      ? `${cleanFirst}${cleanLast}`
      : cleanFirst || cleanLast || "user";
  const prefix = branchAbbr ? `${branchAbbr}.` : "";
  const domain =
    role === "Customer"
      ? `${prefix}customer.com`
      : role === "Manager"
        ? `${prefix}manager.com`
        : `${prefix}employee.com`;
  const existing = existingEmails.map((e) => e?.toLowerCase());
  let email = `${base}@${domain}`;
  let counter = 1;
  while (existing.includes(email)) {
    email = `${base}${counter}@${domain}`;
    counter++;
  }
  return email;
};

const generatePassword = () => {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ",
    lower = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789",
    special = "!@#$%&*";
  const all = upper + lower + digits + special;
  const pick = (s) => s[Math.floor(Math.random() * s.length)];
  const arr = [
    pick(upper),
    pick(lower),
    pick(digits),
    pick(special),
    ...Array.from({ length: 4 }, () => pick(all)),
  ];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join("");
};

const sanitizeName = (v) => v.replace(/[^a-zA-Z\s'-]/g, "");

const fmtDate = (str) =>
  str
    ? new Date(str).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";
const fmtTime = (d) => {
  const pad = (n) => String(n).padStart(2, "0");
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const generateLogs = (users) => {
  const actions = [
    "Logged in",
    "Viewed dashboard",
    "Updated patient record",
    "Edited appointment",
    "Viewed reports",
    "Updated inventory",
    "Logged out",
  ];
  const logs = [];
  const now = new Date();
  users.slice(0, 12).forEach((u, i) => {
    const count = Math.floor(Math.random() * 3) + 1;
    for (let j = 0; j < count; j++) {
      const minsAgo = Math.floor(Math.random() * 1440);
      const ts = new Date(now - minsAgo * 60000);
      logs.push({
        id: `${u.id}-${j}`,
        user: u,
        action: actions[Math.floor(Math.random() * actions.length)],
        timestamp: ts,
        ip: `192.168.${Math.floor(Math.random() * 5)}.${Math.floor(Math.random() * 254) + 1}`,
        status: Math.random() > 0.08 ? "Success" : "Failed",
      });
    }
  });
  return logs.sort((a, b) => b.timestamp - a.timestamp);
};

// ── Sub-components ────────────────────────────────────────────────────────────
const Avatar = ({ firstName, lastName, role, size = 36 }) => {
  const initials =
    [firstName, lastName]
      .filter(Boolean)
      .map((n) => n.charAt(0).toUpperCase())
      .join("") || "?";
  const palette = AVATAR_COLORS[role] || { bg: "#f3f4f6", color: "#4b5563" };
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: palette.bg,
        color: palette.color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: size * 0.38,
        flexShrink: 0,
        border: `1.5px solid ${palette.color}22`,
        userSelect: "none",
      }}
    >
      {initials}
    </div>
  );
};

const ConfirmModal = ({
  show,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = "Confirm",
  type = "primary",
}) => {
  if (!show) return null;
  const colors = { primary: "#2563eb", danger: "#dc2626", success: "#16a34a" };
  const color = colors[type] || colors.primary;
  return (
    <>
      <div
        onClick={onCancel}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          zIndex: 1050,
        }}
      />
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1055,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
          pointerEvents: "none",
        }}
      >
        <div style={{ width: "100%", maxWidth: 480, pointerEvents: "all" }}>
          <div
            style={{
              background: "var(--card)",
              borderRadius: 16,
              overflow: "hidden",
              boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
            }}
          >
            <div
              style={{
                backgroundColor: color,
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <h5
                style={{
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 15,
                  margin: 0,
                }}
              >
                {title}
              </h5>
              <button
                onClick={onCancel}
                style={{
                  background: "none",
                  border: "none",
                  color: "#fff",
                  fontSize: 18,
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ padding: "20px 20px 8px" }}>
              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  color: "#374151",
                  lineHeight: 1.6,
                }}
              >
                {message}
              </p>
            </div>
            <div
              style={{
                padding: "12px 20px 16px",
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
              }}
            >
              <button
                onClick={onCancel}
                style={{
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: "8px 18px",
                  fontFamily: "inherit",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  color: "var(--text)",
                }}
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                style={{
                  backgroundColor: color,
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "8px 22px",
                  fontFamily: "inherit",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

const PendingCard = ({ req, onApprove, onReject }) => (
  <div
    style={{
      background: "#fffbeb",
      border: "1.5px solid #fde68a",
      borderRadius: 12,
      padding: "16px 18px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      flexWrap: "wrap",
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <Avatar
        firstName={req.first_name}
        lastName={req.last_name}
        role={req.role || "Employee"}
        size={42}
      />
      <div>
        <p
          style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#1e293b" }}
        >
          {[req.first_name, req.last_name].filter(Boolean).join(" ") || "—"}
        </p>
        <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>{req.email}</p>
        <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
          <span
            className={`badge ${ROLE_BADGE[req.role] || "badge-gray"}`}
            style={{ fontSize: 10 }}
          >
            {req.role}
          </span>
          <span
            style={{
              fontSize: 10,
              background: "#fee2e2",
              color: "#991b1b",
              borderRadius: 99,
              padding: "1px 8px",
              fontWeight: 700,
            }}
          >
            Awaiting Admin Approval
          </span>
        </div>
        <p style={{ margin: "4px 0 0", fontSize: 11, color: "#94a3b8" }}>
          Requested {fmtDate(req.created_at)} · by Manager
        </p>
      </div>
    </div>
    <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
      <button
        onClick={() => onApprove(req)}
        style={{
          padding: "7px 16px",
          borderRadius: 8,
          border: "none",
          background: "#16a34a",
          color: "#fff",
          fontSize: 12,
          fontWeight: 700,
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        ✓ Approve
      </button>
      <button
        onClick={() => onReject(req)}
        style={{
          padding: "7px 16px",
          borderRadius: 8,
          border: "1px solid #fca5a5",
          background: "#fef2f2",
          color: "#dc2626",
          fontSize: 12,
          fontWeight: 700,
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        ✕ Reject
      </button>
    </div>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
const ManagerControl = () => {
  // ── useCurrentUser replaces readUserInfo + useBranchTables ────────────────
  const {
    user,
    isAdmin,
    isSuperAdmin,
    seeAllBranches,
    loading: userLoading,
  } = useCurrentUser();

  const [branchName, setBranchName] = useState("");

  // Fetch branch name from branches table using user.branchId
  useEffect(() => {
    if (!user?.branchId) return;
    supabase
      .from("branches")
      .select("name")
      .eq("id", user.branchId)
      .single()
      .then(({ data }) => {
        if (data?.name) setBranchName(data.name);
      });
  }, [user?.branchId]);

  const branchLabel = branchName ? `${branchName} Branch` : "";
  const branchAbbr = branchName
    ? branchName
        .toLowerCase()
        .replace(/\s+/g, "")
        .replace(/[^a-z0-9]/g, "")
        .slice(0, 3)
    : "";

  const [users, setUsers] = useState([]);
  const [pending, setPending] = useState([]);
  const [pwdRequests, setPwdRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("users");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [logs, setLogs] = useState([]);
  const [logSearch, setLogSearch] = useState("");

  const fetchLogs = useCallback(async () => {
    const { data } = await supabase
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    setLogs(data || []);
  }, []);

  useEffect(() => {
    if (!userLoading && user) fetchLogs();
  }, [userLoading, user, fetchLogs]);

  useEffect(() => {
    if (!user) return;
    const logsSub = supabase
      .channel("realtime-activity-logs-manager")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "activity_logs" },
        (payload) => {
          setLogs((prev) => [payload.new, ...prev]);
        },
      )
      .subscribe();
    return () => supabase.removeChannel(logsSub);
  }, [user]);
  const [logRole, setLogRole] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [logsPage, setLogsPage] = useState(1);
  const ROWS_PER_PAGE = 10;
  const LOGS_PER_PAGE = 10;
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [deletedUsers, setDeletedUsers] = useState([]);
  const [showDeletedModal, setShowDeletedModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [addErrors, setAddErrors] = useState({});
  const [successModal, setSuccessModal] = useState(null);
  const [addForm, setAddForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    role: "Employee",
    status: "Pending Approval",
    sex: "Male",
    emailLocked: false,
  });

  // ── Fetch users — branch-scoped ───────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    let q = supabase
      .from("profiles")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (!seeAllBranches && user.branchId) q = q.eq("branch_id", user.branchId);
    const { data, error } = await q;
    if (!error) {
      const fetched = data || [];
      setUsers(fetched);
    }
    setLoading(false);
  }, [user, seeAllBranches]);

  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

  const fetchDeletedUsers = useCallback(async () => {
    if (!user) return;
    let q = supabase
      .from("profiles")
      .select("*")
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false });
    if (!seeAllBranches && user.branchId) q = q.eq("branch_id", user.branchId);
    const { data, error } = await q;
    if (error) return;
    const now = Date.now();
    const expired = (data || []).filter(
      (u) => now - new Date(u.deleted_at).getTime() > THIRTY_DAYS_MS,
    );
    if (expired.length > 0)
      await supabase
        .from("profiles")
        .delete()
        .in(
          "id",
          expired.map((u) => u.id),
        );
    setDeletedUsers(
      (data || []).filter(
        (u) => now - new Date(u.deleted_at).getTime() <= THIRTY_DAYS_MS,
      ),
    );
  }, [user, seeAllBranches]);

  // ── Fetch pending — branch-scoped ─────────────────────────────────────────
  const fetchPending = useCallback(async () => {
    if (!user) return;
    let q = supabase
      .from("pending_users")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (!seeAllBranches) q = q.eq("branch", branchLabel);
    const { data, error } = await q;
    if (!error) setPending(data || []);
  }, [user, seeAllBranches, branchLabel]);

  // ── Fetch password change requests — branch-scoped ────────────────────────
  const fetchPwdRequests = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("forgot_password_requests")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    let rows = data || [];
    if (!seeAllBranches && user.branchId && rows.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, branch_id")
        .in("id", rows.map((r) => r.user_id).filter(Boolean));
      const branchById = new Map((profs || []).map((p) => [p.id, p.branch_id]));
      rows = rows.filter((r) => branchById.get(r.user_id) === user.branchId);
    }
    setPwdRequests(rows);
  }, [user, seeAllBranches]);

  const approvePwdRequest = (req) => {
    setConfirm({
      title: "Approve Password Change",
      message: `Apply the new password requested by ${req.email}?`,
      type: "success",
      confirmLabel: "Approve",
      onConfirm: async () => {
        setConfirm(null);
        if (!seeAllBranches && user?.branchId) {
          const { data: prof } = await supabase
            .from("profiles")
            .select("branch_id")
            .eq("id", req.user_id)
            .single();
          if (!prof || prof.branch_id !== user.branchId) {
            setSuccessModal({
              error: true,
              message:
                "You don't have permission to approve a password change for a user outside your branch.",
            });
            setPwdRequests((prev) => prev.filter((r) => r.id !== req.id));
            return;
          }
        }
        const { error } = await supabaseAdmin.auth.admin.updateUserById(
          req.user_id,
          { password: req.new_password },
        );
        if (error) {
          setSuccessModal({ error: true, message: error.message });
          return;
        }
        await supabase
          .from("forgot_password_requests")
          .update({
            status: "approved",
            reviewed_at: new Date().toISOString(),
            reviewed_by: user.id,
          })
          .eq("id", req.id);
        setPwdRequests((prev) => prev.filter((r) => r.id !== req.id));
        await supabase.from("activity_logs").insert([
          {
            user_id: user.id,
            user_name: user.fullName || user.email,
            user_role: user.role,
            action: "Approved password change",
            details: `Password updated for ${req.email}`,
          },
        ]);
      },
    });
  };

  const rejectPwdRequest = (req) => {
    setConfirm({
      title: "Reject Request",
      message: `Reject the password change request from ${req.email}?`,
      type: "danger",
      confirmLabel: "Reject",
      onConfirm: async () => {
        setConfirm(null);
        await supabase
          .from("forgot_password_requests")
          .update({
            status: "rejected",
            reviewed_at: new Date().toISOString(),
            reviewed_by: user.id,
          })
          .eq("id", req.id);
        setPwdRequests((prev) => prev.filter((r) => r.id !== req.id));
      },
    });
  };

  useEffect(() => {
    if (userLoading || !user) return;
    fetchUsers();
    fetchPending();
    fetchDeletedUsers();
    fetchPwdRequests();

    const pendingSub = supabase
      .channel(`realtime-pending-manager-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "pending_users" },
        (payload) => {
          const req = payload.new;
          if (!seeAllBranches && req.branch !== branchLabel) return;
          setPending((prev) =>
            prev.find((r) => r.id === req.id) ? prev : [req, ...prev],
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "pending_users" },
        (payload) => {
          const updated = payload.new;
          if (updated.status !== "pending") {
            setPending((prev) => prev.filter((r) => r.id !== updated.id));
            if (updated.status === "approved") fetchUsers();
          } else {
            setPending((prev) =>
              prev.map((r) => (r.id === updated.id ? updated : r)),
            );
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "pending_users" },
        (payload) => {
          setPending((prev) => prev.filter((r) => r.id !== payload.old?.id));
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") fetchPending();
      });

    const profilesSub = supabase
      .channel(`realtime-profiles-manager-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "profiles" },
        (payload) => {
          const u = payload.new;
          if (!seeAllBranches && String(u.branch_id) !== String(user.branchId))
            return;
          setUsers((prev) =>
            prev.find((p) => p.id === u.id) ? prev : [u, ...prev],
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        (payload) => {
          const u = payload.new;
          if (!seeAllBranches && String(u.branch_id) !== String(user.branchId))
            return;
          setUsers((prev) =>
            prev.find((p) => p.id === u.id)
              ? prev.map((p) => (p.id === u.id ? { ...p, ...u } : p))
              : [u, ...prev],
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "profiles" },
        (payload) => {
          setUsers((prev) => prev.filter((p) => p.id !== payload.old?.id));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(pendingSub);
      supabase.removeChannel(profilesSub);
    };
  }, [
    fetchUsers,
    fetchPending,
    userLoading,
    user,
    seeAllBranches,
    branchLabel,
  ]);

  const fullName = (u) => {
    if (u.first_name || u.last_name)
      return `${u.first_name || ""} ${u.last_name || ""}`.trim();
    return u.name || "—";
  };

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      (!search ||
        `${fullName(u)} ${u.email || ""}`.toLowerCase().includes(q)) &&
      (!roleFilter || u.role === roleFilter)
    );
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [search, roleFilter]);
  useEffect(() => {
    setLogsPage(1);
  }, [logSearch, logRole]);

  const filteredLogs = logs.filter((l) => {
    const q = logSearch.toLowerCase();
    const isOwnLog =
      l.user_id === user?.id ||
      (l.user_name || "").toLowerCase() ===
        (user?.fullName || user?.email || "").toLowerCase();
    return (
      isOwnLog &&
      (!logSearch ||
        (l.user_name || "").toLowerCase().includes(q) ||
        (l.action || "").toLowerCase().includes(q) ||
        (l.details || "").toLowerCase().includes(q)) &&
      (!logRole || (l.user_role || "").toLowerCase() === logRole.toLowerCase())
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice(
    (safePage - 1) * ROWS_PER_PAGE,
    safePage * ROWS_PER_PAGE,
  );

  const logsTotalPages = Math.max(
    1,
    Math.ceil(filteredLogs.length / LOGS_PER_PAGE),
  );
  const safeLogsPage = Math.min(logsPage, logsTotalPages);
  const paginatedLogs = filteredLogs.slice(
    (safeLogsPage - 1) * LOGS_PER_PAGE,
    safeLogsPage * LOGS_PER_PAGE,
  );

  const counts = {
    total: users.length,
    active: users.filter((u) => u.status === "Active").length,
    pending: pending.filter((r) => r.status === "pending").length,
    staff: users.filter((u) => (u.role || "").toLowerCase() !== "customer")
      .length,
  };

  const openAddModal = () => {
    const pwd = generatePassword();
    setAddForm({
      first_name: "",
      last_name: "",
      email: "",
      password: pwd,
      role: "Employee",
      status: "Pending Approval",
      sex: "Male",
      emailLocked: false,
    });
    setAddErrors({});
    setShowPassword(false);
    setShowAddModal(true);
  };

  const handleFirstNameChange = (rawVal) => {
    const val = sanitizeName(rawVal);
    const existingEmails = users
      .map((u) => u.email?.toLowerCase())
      .filter(Boolean);
    setAddForm((f) => ({
      ...f,
      first_name: val,
      email: f.emailLocked
        ? f.email
        : generateEmail(val, f.last_name, f.role, existingEmails, branchAbbr),
    }));
    setAddErrors((er) => ({ ...er, first_name: "", email: "" }));
  };

  const handleEmailChange = (val) => {
    setAddForm((f) => ({ ...f, email: val, emailLocked: true }));
    setAddErrors((er) => ({ ...er, email: "" }));
  };

  const regeneratePassword = () =>
    setAddForm((f) => ({ ...f, password: generatePassword() }));

  const validateAdd = () => {
    const errs = {};
    if (!addForm.first_name.trim()) errs.first_name = "First name is required";
    else if (addForm.first_name.trim().length < 2)
      errs.first_name = "First name must be at least 2 characters";
    if (!addForm.last_name.trim()) errs.last_name = "Last name is required";
    else if (addForm.last_name.trim().length < 2)
      errs.last_name = "Last name must be at least 2 characters";
    if (!addForm.email.trim()) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addForm.email))
      errs.email = "Invalid email address";
    else if (
      users.some((u) => u.email?.toLowerCase() === addForm.email.toLowerCase())
    )
      errs.email = "Email already exists";
    if (!addForm.password.trim()) errs.password = "Password is required";
    else if (addForm.password.length < 8)
      errs.password = "Password must be at least 8 characters";
    else if (
      !/[A-Z]/.test(addForm.password) ||
      !/[a-z]/.test(addForm.password) ||
      !/[0-9]/.test(addForm.password)
    ) {
      errs.password =
        "Password must include an uppercase letter, a lowercase letter, and a number";
    }
    if (!addForm.role) errs.role = "Please select a role";
    if (!addForm.sex) errs.sex = "Please select a sex";
    return errs;
  };

  const isRequestFormValid = () => {
    if (!addForm.first_name.trim() || addForm.first_name.trim().length < 2)
      return false;
    if (!addForm.last_name.trim() || addForm.last_name.trim().length < 2)
      return false;
    if (
      !addForm.email.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addForm.email)
    )
      return false;
    if (!addForm.password.trim() || addForm.password.length < 8) return false;
    if (!addForm.sex) return false;
    if (!addForm.role) return false;
    return true;
  };

  const handleSubmitRequest = async () => {
    const errs = validateAdd();
    if (Object.keys(errs).length) {
      setAddErrors(errs);
      return;
    }
    setSaving(true);

    // Customer accounts don't need Admin approval — create them right away,
    // same as when a new pet owner is registered in Patient Records.
    if (addForm.role === "Customer") {
      const { data: signUpData, error: signUpError } =
        await supabase.auth.signUp({
          email: addForm.email.trim().toLowerCase(),
          password: addForm.password,
          options: {
            data: {
              full_name: `${addForm.first_name} ${addForm.last_name}`,
              role: "customer",
            },
          },
        });
      if (signUpError) {
        setSaving(false);
        setSuccessModal({ error: true, message: signUpError.message });
        return;
      }
      const newUserId = signUpData?.user?.id;
      if (newUserId) {
        await supabase.from("profiles").upsert(
          {
            id: newUserId,
            first_name: addForm.first_name.trim(),
            last_name: addForm.last_name.trim(),
            email: addForm.email.trim().toLowerCase(),
            role: "Customer",
            status: "Active",
            sex: addForm.sex || null,
            branch_id: user.branchId || null,
          },
          { onConflict: "id", ignoreDuplicates: false },
        );
      }
      setSaving(false);
      setShowAddModal(false);
      fetchUsers();
      setSuccessModal({
        name: `${addForm.first_name} ${addForm.last_name}`,
        approved: true,
      });
      await supabase.from("activity_logs").insert([
        {
          user_id: user.id,
          user_name: user.fullName || user.email,
          user_role: user.role,
          action: "Created customer account",
          details: `${addForm.first_name} ${addForm.last_name} (${addForm.email})`,
        },
      ]);
      return;
    }

    const { error } = await supabase.from("pending_users").insert([
      {
        first_name: addForm.first_name.trim(),
        last_name: addForm.last_name.trim(),
        email: addForm.email.trim().toLowerCase(),
        role: addForm.role,
        sex: addForm.sex,
        password_hint: addForm.password,
        branch_id: null,
        branch: branchLabel,
        requested_by: user.fullName || user.email,
        status: "pending",
      },
    ]);
    setSaving(false);
    if (error) {
      setSuccessModal({ error: true, message: error.message });
      return;
    }
    setShowAddModal(false);
    fetchPending();
    setSuccessModal({ name: `${addForm.first_name} ${addForm.last_name}` });
    await supabase.from("activity_logs").insert([
      {
        user_id: user.id,
        user_name: user.fullName || user.email,
        user_role: user.role,
        action: "Submitted account request",
        details: `Requested account for ${addForm.first_name} ${addForm.last_name} (${addForm.email})`,
      },
    ]);
  };

  const handleApprove = (req) => {
    setConfirm({
      title: "Approve Account Request",
      message: `Create account for ${[req.first_name, req.last_name].filter(Boolean).join(" ")} (${req.email}) with role "${req.role}"?`,
      type: "success",
      confirmLabel: "Approve & Create",
      onConfirm: async () => {
        setConfirm(null);
        let resolvedBranchId = req.branch_id ?? user.branchId ?? null;
        if (!resolvedBranchId && req.branch) {
          const branchName = req.branch.replace(/\s*Branch\s*$/i, "").trim();
          const { data: branchData } = await supabase
            .from("branches")
            .select("id")
            .ilike("name", branchName)
            .single();
          if (branchData?.id) resolvedBranchId = branchData.id;
        }
        const { data: newProfile, error } = await supabase
          .from("profiles")
          .insert([
            {
              first_name: req.first_name,
              last_name: req.last_name,
              email: req.email,
              role: req.role,
              status: "Active",
              branch_id: resolvedBranchId,
            },
          ])
          .select()
          .single();
        if (error) {
          setSuccessModal({ error: true, message: error.message });
          return;
        }
        if (newProfile)
          setUsers((prev) =>
            prev.find((p) => p.id === newProfile.id)
              ? prev
              : [newProfile, ...prev],
          );
        await supabase
          .from("pending_users")
          .update({ status: "approved", branch_id: resolvedBranchId })
          .eq("id", req.id);
        setPending((prev) => prev.filter((r) => r.id !== req.id));
        setSuccessModal({
          name: `${req.first_name} ${req.last_name}`,
          approved: true,
        });
      },
    });
  };

  const handleReject = (req) => {
    setConfirm({
      title: "Reject Request",
      message: `Reject the account request for ${[req.first_name, req.last_name].filter(Boolean).join(" ")}? This cannot be undone.`,
      type: "danger",
      confirmLabel: "Reject",
      onConfirm: async () => {
        setConfirm(null);
        await supabase
          .from("pending_users")
          .update({ status: "rejected" })
          .eq("id", req.id);
        fetchPending();
      },
    });
  };

  const handleRequestDelete = (u) => {
    setConfirm({
      title: "Delete User",
      message: `Delete ${fullName(u)} (${u.email})? This moves them to Recently Deleted for 30 days before permanent removal.`,
      type: "danger",
      confirmLabel: "Delete",
      onConfirm: async () => {
        setConfirm(null);
        const { error } = await supabase
          .from("profiles")
          .update({ deleted_at: new Date().toISOString() })
          .eq("id", u.id);
        if (error) {
          setSuccessModal({ error: true, message: error.message });
          return;
        }
        setUsers((prev) => prev.filter((p) => p.id !== u.id));
        fetchDeletedUsers();
        await supabase.from("activity_logs").insert([
          {
            user_id: user.id,
            user_name: user.fullName || user.email,
            user_role: user.role,
            action: "Deleted user account",
            details: `Moved to Recently Deleted: ${fullName(u)} (${u.email})`,
          },
        ]);
      },
    });
  };

  const restoreUser = (u) => {
    setConfirm({
      title: "Restore User",
      message: `Restore ${fullName(u)} (${u.email})?`,
      type: "success",
      confirmLabel: "Restore",
      onConfirm: async () => {
        setConfirm(null);
        const { error } = await supabase
          .from("profiles")
          .update({ deleted_at: null })
          .eq("id", u.id);
        if (error) {
          setSuccessModal({ error: true, message: error.message });
          return;
        }
        fetchUsers();
        fetchDeletedUsers();
        await supabase.from("activity_logs").insert([
          {
            user_id: user.id,
            user_name: user.fullName || user.email,
            user_role: user.role,
            action: "Restored user account",
            details: `Restored: ${fullName(u)} (${u.email})`,
          },
        ]);
      },
    });
  };

  const permanentlyDeleteUser = (u) => {
    setConfirm({
      title: "Delete Permanently",
      message: `Permanently delete ${fullName(u)} (${u.email})? This cannot be undone.`,
      type: "danger",
      confirmLabel: "Delete Forever",
      onConfirm: async () => {
        setConfirm(null);
        const { error } = await supabase
          .from("profiles")
          .delete()
          .eq("id", u.id);
        if (error) {
          setSuccessModal({ error: true, message: error.message });
          return;
        }
        fetchDeletedUsers();
        await supabase.from("activity_logs").insert([
          {
            user_id: user.id,
            user_name: user.fullName || user.email,
            user_role: user.role,
            action: "Permanently deleted user account",
            details: `Removed: ${fullName(u)} (${u.email})`,
          },
        ]);
      },
    });
  };

  const handleDeleteUser = (u) => {
    setConfirm({
      title: "Delete User",
      message: `Permanently delete ${fullName(u)} (${u.email})? This cannot be undone.`,
      type: "danger",
      confirmLabel: "Delete",
      onConfirm: async () => {
        setConfirm(null);
        const { error } = await supabase
          .from("profiles")
          .delete()
          .eq("id", u.id);
        if (error) {
          alert("Error: " + error.message);
          return;
        }
        fetchUsers();
      },
    });
  };

  // ── Show loading/login guard (after all hooks) ────────────────────────────
  if (userLoading)
    return (
      <Layout>
        <div style={{ padding: "40px 28px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4,1fr)",
              gap: 16,
              marginBottom: 24,
            }}
          >
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                style={{
                  borderRadius: 16,
                  border: "1.5px solid var(--border)",
                  padding: 20,
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                }}
              >
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 12,
                    background: "#e5e7eb",
                    animation: "pulse 1.5s ease-in-out infinite",
                  }}
                />
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  <div
                    style={{
                      width: 80,
                      height: 11,
                      borderRadius: 6,
                      background: "#e5e7eb",
                      animation: "pulse 1.5s ease-in-out infinite",
                    }}
                  />
                  <div
                    style={{
                      width: 50,
                      height: 26,
                      borderRadius: 6,
                      background: "#e5e7eb",
                      animation: "pulse 1.5s ease-in-out infinite",
                    }}
                  />
                  <div
                    style={{
                      width: 100,
                      height: 11,
                      borderRadius: 6,
                      background: "#e5e7eb",
                      animation: "pulse 1.5s ease-in-out infinite",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div
            style={{
              borderRadius: 12,
              border: "1.5px solid var(--border)",
              padding: 20,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 2fr 1fr 1fr 1fr",
                  gap: 12,
                  paddingBottom: 12,
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: "#e5e7eb",
                      animation: "pulse 1.5s ease-in-out infinite",
                    }}
                  />
                  <div
                    style={{
                      width: 110,
                      height: 13,
                      borderRadius: 6,
                      background: "#e5e7eb",
                      animation: "pulse 1.5s ease-in-out infinite",
                    }}
                  />
                </div>
                {[130, 60, 60, 70].map((w, j) => (
                  <div
                    key={j}
                    style={{
                      width: w,
                      height: 13,
                      borderRadius: 6,
                      background: "#e5e7eb",
                      animation: "pulse 1.5s ease-in-out infinite",
                      alignSelf: "center",
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </Layout>
    );
  if (!user)
    return (
      <Layout>
        <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
            Please log in
          </h2>
          <p style={{ fontSize: 13 }}>
            Your session could not be detected. Please sign in again.
          </p>
        </div>
      </Layout>
    );

  return (
    <Layout>
      <div className="mc-page">
        <div className="mc-topbar mc-topbar-pos">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              minWidth: 0,
            }}
          >
            <img
              src="/icon/manager.png"
              alt=""
              style={{
                width: 22,
                height: 22,
                flexShrink: 0,
                filter:
                  "brightness(0) saturate(100%) invert(17%) sepia(82%) saturate(1200%) hue-rotate(210deg)",
              }}
            />
            <div style={{ minWidth: 0 }}>
              <h1
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: "var(--text)",
                  margin: 0,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                Manager Control
              </h1>
              <p
                className="mc-subtitle"
                style={{
                  fontSize: 13,
                  color: "var(--muted)",
                  margin: 0,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {branchLabel} · User management &amp; access logs
              </p>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexShrink: 0,
            }}
          >
            <button
              onClick={() => setShowDeletedModal(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "#fef2f2",
                border: "1.5px solid #fca5a5",
                color: "#dc2626",
                borderRadius: 8,
                padding: "6px 12px",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
                whiteSpace: "nowrap",
              }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              </svg>
              Recently Deleted{" "}
              {deletedUsers.length > 0 ? `(${deletedUsers.length})` : ""}
            </button>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: "4px 10px",
                borderRadius: 6,
                background: "#dbeafe",
                color: "#1e3a8a",
                border: "1px solid #bfdbfe",
                whiteSpace: "nowrap",
              }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                style={{ marginRight: 4 }}
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              {isAdmin ? "Admin" : "Manager"} Mode · {branchLabel}
            </span>
          </div>
        </div>

        <div
          style={{
            position: "fixed",
            bottom: 28,
            right: 28,
            zIndex: 999,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.querySelector(".fab-tooltip").style.opacity = "1";
            e.currentTarget.querySelector(".fab-tooltip").style.transform =
              "translateX(0)";
            e.currentTarget.querySelector(".fab-btn").style.transform =
              "scale(1.1)";
            e.currentTarget.querySelector(".fab-btn").style.boxShadow =
              "0 6px 28px rgba(30,58,138,0.5)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.querySelector(".fab-tooltip").style.opacity = "0";
            e.currentTarget.querySelector(".fab-tooltip").style.transform =
              "translateX(8px)";
            e.currentTarget.querySelector(".fab-btn").style.transform =
              "scale(1)";
            e.currentTarget.querySelector(".fab-btn").style.boxShadow =
              "0 4px 20px rgba(30,58,138,0.4)";
          }}
        >
          <span
            className="fab-tooltip"
            style={{
              opacity: 0,
              transform: "translateX(8px)",
              transition: "opacity 0.2s ease, transform 0.2s ease",
              background: "linear-gradient(135deg, #0f172a, #1e3a8a)",
              color: "#fff",
              fontSize: 12,
              fontWeight: 700,
              padding: "8px 14px",
              borderRadius: 10,
              whiteSpace: "nowrap",
              pointerEvents: "none",
              boxShadow:
                "0 8px 24px rgba(30,58,138,0.35), 0 2px 8px rgba(0,0,0,0.2)",
              border: "1px solid rgba(255,255,255,0.12)",
              display: "flex",
              alignItems: "center",
              gap: 7,
              letterSpacing: "0.2px",
              position: "relative",
            }}
          >
            <span
              style={{
                display: "flex",
                flexDirection: "column",
                lineHeight: 1.2,
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 800, color: "#fff" }}>
                Request New User
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  color: "rgba(255,255,255,0.55)",
                }}
              >
                Send for Admin approval
              </span>
            </span>
            <span
              style={{
                position: "absolute",
                right: -6,
                top: "50%",
                transform: "translateY(-50%)",
                width: 0,
                height: 0,
                borderTop: "6px solid transparent",
                borderBottom: "6px solid transparent",
                borderLeft: "6px solid #1e3a8a",
              }}
            />
          </span>
          <button
            onClick={openAddModal}
            className="fab-btn"
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "linear-gradient(135deg,#1e3a8a,#3b82f6)",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 20px rgba(30,58,138,0.4)",
              transition: "transform 0.2s, box-shadow 0.2s",
              flexShrink: 0,
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#fff"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>

        <div className="mc-content mc-content-pos">
          {/* Stat cards */}
          <div
            className="mc-stats-grid"
            style={{ display: "grid", gap: 16, marginBottom: 24 }}
          >
            {[
              {
                label: "Total Users",
                value: counts.total,
                icon: "/icon/total_user.png",
                color: "blue",
                sub: "All accounts",
              },
              {
                label: "Active",
                value: counts.active,
                icon: "/icon/active_acc.png",
                color: "green",
                sub: "Currently active",
              },
              {
                label: "Pending Approval",
                value: counts.pending,
                icon: "/icon/pending.png",
                color: "yellow",
                sub: counts.pending > 0 ? "Needs attention" : "All cleared",
              },
              {
                label: "Staff",
                value: counts.staff,
                icon: "/icon/staff.png",
                color: "purple",
                sub: "Non-customer users",
              },
            ].map((sc, i) => (
              <div
                key={i}
                className={`stat-card-v2 ${sc.color}`}
                onClick={() => sc.color === "yellow" && setTab("pending")}
                style={{
                  cursor: sc.color === "yellow" ? "pointer" : "default",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start" }}>
                  <div className={`stat-icon-v2 ${sc.color}`}>
                    <img
                      src={sc.icon}
                      alt={sc.label}
                      style={{ width: 24, height: 24 }}
                    />
                  </div>
                </div>
                <div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--muted)",
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    {sc.label}
                  </p>
                  <h3
                    style={{
                      margin: "4px 0 6px",
                      fontSize: 26,
                      fontWeight: 800,
                      lineHeight: 1,
                    }}
                  >
                    {sc.value}
                  </h3>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--muted)",
                    }}
                  >
                    {sc.sub}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Pending banner */}
          {pending.filter((r) => r.status === "pending").length > 0 && (
            <div
              style={{
                background: "#fffbeb",
                border: "1.5px solid #fde68a",
                borderRadius: 10,
                padding: "12px 20px",
                marginBottom: 20,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: "rgba(217,119,6,0.12)",
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
                    stroke="#d97706"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <div>
                  <p
                    style={{
                      margin: 0,
                      fontWeight: 700,
                      fontSize: 14,
                      color: "#92400e",
                    }}
                  >
                    {pending.filter((r) => r.status === "pending").length}{" "}
                    Account Request
                    {pending.filter((r) => r.status === "pending").length > 1
                      ? "s"
                      : ""}{" "}
                    Awaiting Admin Approval
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: "#b45309" }}>
                    These requests need an Admin to approve before accounts are
                    created.
                  </p>
                </div>
              </div>
              <button
                className="btn mc-btn-auto"
                style={{
                  background: "#d97706",
                  color: "#fff",
                  border: "none",
                  fontSize: 13,
                  whiteSpace: "nowrap",
                }}
                onClick={() => setTab("pending")}
              >
                View Requests
              </button>
            </div>
          )}

          {/* Tabs */}
          <div
            style={{
              background: "var(--card)",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--border)",
              marginBottom: 20,
            }}
          >
            <div
              style={{
                display: "flex",
                borderBottom: "1px solid var(--border)",
                padding: "0 20px",
                overflowX: "auto",
              }}
            >
              {[
                { key: "users", label: "Users" },
                {
                  key: "pending",
                  label: `Pending Requests${pending.length > 0 ? ` (${pending.length})` : ""}`,
                },
                {
                  key: "pwdrequests",
                  label: `Password Requests${pwdRequests.length > 0 ? ` (${pwdRequests.length})` : ""}`,
                },
                { key: "logs", label: "Access Logs" },
              ].map((t) => (
                <div
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  style={{
                    padding: "14px 20px",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    borderBottom: `2px solid ${tab === t.key ? "var(--royal)" : "transparent"}`,
                    color: tab === t.key ? "var(--royal)" : "var(--muted)",
                    transition: "all 0.18s",
                    whiteSpace: "nowrap",
                  }}
                >
                  {t.label}
                </div>
              ))}
            </div>

            {/* ── Users tab ── */}
            {tab === "users" && (
              <div style={{ padding: 20 }}>
                <div
                  className="mc-search-row"
                  style={{
                    display: "flex",
                    gap: 10,
                    marginBottom: 16,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      background: "var(--bg)",
                      border: "1.5px solid var(--border)",
                      borderRadius: 8,
                      padding: "8px 14px",
                      flex: 1,
                      minWidth: 180,
                    }}
                  >
                    <img
                      src="/icon/search.png"
                      alt=""
                      style={{
                        width: 16,
                        height: 16,
                        filter: "brightness(0) saturate(100%) invert(40%)",
                      }}
                    />
                    <input
                      type="text"
                      placeholder="Search by name or email…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      style={{
                        border: "none",
                        background: "transparent",
                        fontSize: 13,
                        color: "var(--text)",
                        outline: "none",
                        fontFamily: "inherit",
                        width: "100%",
                      }}
                    />
                  </div>
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="mc-input"
                    style={{ width: 140 }}
                  >
                    <option value="">All Roles</option>
                    <option>Admin</option>
                    <option>Manager</option>
                    <option>Employee</option>
                    <option>Customer</option>
                  </select>
                </div>

                <div
                  style={{
                    background: "#eff6ff",
                    border: "1px solid #bfdbfe",
                    borderRadius: 8,
                    padding: "10px 14px",
                    marginBottom: 14,
                    fontSize: 12,
                    color: "#1e40af",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#1e40af"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>
                    As a Manager, you can <strong>request</strong> new user
                    accounts. Requests are sent to an Admin for final approval.
                  </span>
                </div>

                <div style={{ overflowX: "auto" }}>
                  {loading ? (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div
                          key={i}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "2fr 2fr 1fr 1fr 1fr",
                            gap: 12,
                            padding: "12px 14px",
                            borderBottom: "1px solid var(--border)",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                            }}
                          >
                            <div
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: "50%",
                                background: "#e5e7eb",
                                animation: "pulse 1.5s ease-in-out infinite",
                              }}
                            />
                            <div
                              style={{
                                width: 100,
                                height: 13,
                                borderRadius: 6,
                                background: "#e5e7eb",
                                animation: "pulse 1.5s ease-in-out infinite",
                              }}
                            />
                          </div>
                          {[120, 60, 60, 70].map((w, j) => (
                            <div
                              key={j}
                              style={{
                                width: w,
                                height: 13,
                                borderRadius: 6,
                                background: "#e5e7eb",
                                animation: "pulse 1.5s ease-in-out infinite",
                                alignSelf: "center",
                              }}
                            />
                          ))}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        fontSize: 13,
                      }}
                    >
                      <thead>
                        <tr>
                          {[
                            "User",
                            "Email",
                            "Sex",
                            "Role",
                            "Status",
                            "Joined",
                            "Actions",
                          ].map((h) => (
                            <th key={h} className="mc-th">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {paginated.length === 0 ? (
                          <tr>
                            <td
                              colSpan={7}
                              style={{
                                textAlign: "center",
                                padding: 40,
                                color: "var(--muted)",
                              }}
                            >
                              No users found
                            </td>
                          </tr>
                        ) : (
                          paginated.map((u) => (
                            <tr key={u.id}>
                              <td className="mc-td">
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 10,
                                  }}
                                >
                                  <Avatar
                                    firstName={u.first_name}
                                    lastName={u.last_name}
                                    role={u.role}
                                  />
                                  <div style={{ fontWeight: 600 }}>
                                    {fullName(u)}
                                  </div>
                                </div>
                              </td>
                              <td className="mc-td">{u.email || "—"}</td>
                              <td className="mc-td">
                                {u.sex ? (
                                  <span
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 4,
                                      fontSize: 11,
                                      fontWeight: 700,
                                      padding: "3px 10px",
                                      borderRadius: 20,
                                      background:
                                        u.sex === "Male"
                                          ? "#eff6ff"
                                          : u.sex === "Female"
                                            ? "#fdf2f8"
                                            : "#f3f4f6",
                                      color:
                                        u.sex === "Male"
                                          ? "#1d4ed8"
                                          : u.sex === "Female"
                                            ? "#be185d"
                                            : "#6b7280",
                                      border: `1px solid ${u.sex === "Male" ? "#bfdbfe" : u.sex === "Female" ? "#fbcfe8" : "#e5e7eb"}`,
                                    }}
                                  >
                                    {u.sex === "Male"
                                      ? "♂"
                                      : u.sex === "Female"
                                        ? "♀"
                                        : ""}{" "}
                                    {u.sex}
                                  </span>
                                ) : (
                                  <span
                                    style={{
                                      color: "var(--muted)",
                                      fontSize: 12,
                                    }}
                                  >
                                    —
                                  </span>
                                )}
                              </td>
                              <td className="mc-td">
                                <span
                                  className={`badge ${ROLE_BADGE[u.role] || "badge-gray"}`}
                                >
                                  {u.role || "—"}
                                </span>
                              </td>
                              <td className="mc-td">
                                <span
                                  className={`badge ${u.status === "Active" ? "badge-green" : "badge-red"}`}
                                >
                                  {u.status || "Active"}
                                </span>
                              </td>
                              <td className="mc-td">
                                <span
                                  style={{
                                    fontSize: 12,
                                    color: "var(--muted)",
                                  }}
                                >
                                  {fmtDate(u.created_at)}
                                </span>
                              </td>
                              <td className="mc-td">
                                <button
                                  title="Delete user — moves to Recently Deleted"
                                  onClick={() => handleRequestDelete(u)}
                                  style={{
                                    background: "none",
                                    border: "1px solid #fca5a5",
                                    borderRadius: 6,
                                    width: 30,
                                    height: 30,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    cursor: "pointer",
                                    color: "#dc2626",
                                  }}
                                >
                                  <svg
                                    width="13"
                                    height="13"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                  >
                                    <polyline points="3 6 5 6 21 6" />
                                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                    <path d="M10 11v6M14 11v6" />
                                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                                  </svg>
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
                {!loading && totalPages > 1 && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 4,
                      padding: "14px 18px",
                      borderTop: "1px solid var(--border)",
                      marginTop: 8,
                    }}
                  >
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={safePage === 1}
                      style={{
                        padding: "6px 14px",
                        borderRadius: 20,
                        border: "1.5px solid var(--border)",
                        background: "transparent",
                        fontSize: 13,
                        fontWeight: 600,
                        color: safePage === 1 ? "var(--muted)" : "var(--text)",
                        cursor: safePage === 1 ? "default" : "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      prev
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (pg) => (
                        <button
                          key={pg}
                          onClick={() => setCurrentPage(pg)}
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 20,
                            border: "1.5px solid",
                            fontSize: 13,
                            fontWeight: 700,
                            cursor: "pointer",
                            fontFamily: "inherit",
                            transition: "all 0.15s",
                            background:
                              safePage === pg ? "var(--royal)" : "transparent",
                            color: safePage === pg ? "#fff" : "var(--text)",
                            borderColor:
                              safePage === pg
                                ? "var(--royal)"
                                : "var(--border)",
                          }}
                        >
                          {pg}
                        </button>
                      ),
                    )}
                    <button
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={safePage === totalPages}
                      style={{
                        padding: "6px 14px",
                        borderRadius: 20,
                        border: "1.5px solid var(--border)",
                        background: "transparent",
                        fontSize: 13,
                        fontWeight: 600,
                        color:
                          safePage === totalPages
                            ? "var(--muted)"
                            : "var(--text)",
                        cursor: safePage === totalPages ? "default" : "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      next
                    </button>
                  </div>
                )}
                {!loading && (
                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 12,
                      color: "var(--muted)",
                      paddingLeft: 4,
                    }}
                  >
                    Showing {filtered.length} of {users.length} users
                  </div>
                )}
              </div>
            )}

            {/* ── Pending tab ── */}
            {tab === "pending" && (
              <div style={{ padding: 24 }}>
                <div style={{ marginBottom: 20 }}>
                  <h3
                    style={{ fontSize: 15, fontWeight: 700, margin: "0 0 4px" }}
                  >
                    Pending Account Requests
                  </h3>
                  <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>
                    View-only — requests submitted by this branch awaiting Admin
                    approval.
                  </p>
                </div>
                {pending.length === 0 ? (
                  <div style={{ padding: "40px 0", textAlign: "center" }}>
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: "50%",
                        background: "#f0fdf4",
                        border: "1.5px solid #86efac",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto 12px",
                      }}
                    >
                      <svg
                        width="26"
                        height="26"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#16a34a"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    <p style={{ color: "var(--muted)", fontSize: 14 }}>
                      No pending requests — all caught up!
                    </p>
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                    }}
                  >
                    {pending.map((req) => (
                      <div
                        key={req.id}
                        style={{
                          background: "#fffbeb",
                          border: "1.5px solid #fde68a",
                          borderRadius: 12,
                          padding: "16px 18px",
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          flexWrap: "wrap",
                        }}
                      >
                        <Avatar
                          firstName={req.first_name}
                          lastName={req.last_name}
                          role={req.role || "Employee"}
                          size={42}
                        />
                        <div style={{ flex: 1 }}>
                          <p
                            style={{
                              margin: 0,
                              fontSize: 14,
                              fontWeight: 700,
                              color: "#1e293b",
                            }}
                          >
                            {[req.first_name, req.last_name]
                              .filter(Boolean)
                              .join(" ") || "—"}
                          </p>
                          <p
                            style={{
                              margin: 0,
                              fontSize: 12,
                              color: "#64748b",
                            }}
                          >
                            {req.email}
                          </p>
                          <div
                            style={{ display: "flex", gap: 6, marginTop: 4 }}
                          >
                            <span
                              className={`badge ${ROLE_BADGE[req.role] || "badge-gray"}`}
                              style={{ fontSize: 10 }}
                            >
                              {req.role}
                            </span>
                            {req.sex && (
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 3,
                                  fontSize: 10,
                                  fontWeight: 700,
                                  padding: "1px 8px",
                                  borderRadius: 99,
                                  background:
                                    req.sex === "Male" ? "#dbeafe" : "#fce7f3",
                                  color:
                                    req.sex === "Male" ? "#1d4ed8" : "#be185d",
                                }}
                              >
                                {req.sex === "Male" ? "♂" : "♀"} {req.sex}
                              </span>
                            )}
                            <span
                              style={{
                                fontSize: 10,
                                borderRadius: 99,
                                padding: "1px 8px",
                                fontWeight: 700,
                                background:
                                  req.status === "approved"
                                    ? "#dcfce7"
                                    : req.status === "rejected"
                                      ? "#fee2e2"
                                      : "#fef9c3",
                                color:
                                  req.status === "approved"
                                    ? "#15803d"
                                    : req.status === "rejected"
                                      ? "#991b1b"
                                      : "#92400e",
                              }}
                            >
                              {req.status === "approved" ? (
                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 3,
                                  }}
                                >
                                  <svg
                                    width="9"
                                    height="9"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                  >
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                  Approved
                                </span>
                              ) : req.status === "rejected" ? (
                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 3,
                                  }}
                                >
                                  <svg
                                    width="9"
                                    height="9"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                  >
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                  </svg>
                                  Rejected
                                </span>
                              ) : (
                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 3,
                                  }}
                                >
                                  <svg
                                    width="9"
                                    height="9"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                  >
                                    <circle cx="12" cy="12" r="10" />
                                    <polyline points="12 6 12 12 16 14" />
                                  </svg>
                                  Awaiting Approval
                                </span>
                              )}
                            </span>
                          </div>
                          <p
                            style={{
                              margin: "4px 0 0",
                              fontSize: 11,
                              color: "#94a3b8",
                            }}
                          >
                            Requested {fmtDate(req.created_at)} · {req.branch}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Password Requests tab ── */}
            {tab === "pwdrequests" && (
              <div style={{ padding: 24 }}>
                <div style={{ marginBottom: 20 }}>
                  <h3
                    style={{ fontSize: 15, fontWeight: 700, margin: "0 0 4px" }}
                  >
                    Password Change Requests
                  </h3>
                  <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>
                    Employees submit a new password here; it only takes effect
                    once you approve it.
                  </p>
                </div>
                {pwdRequests.length === 0 ? (
                  <div style={{ padding: "40px 0", textAlign: "center" }}>
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: "50%",
                        background: "#f0fdf4",
                        border: "1.5px solid #86efac",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto 12px",
                      }}
                    >
                      <svg
                        width="26"
                        height="26"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#16a34a"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    <p style={{ color: "var(--muted)", fontSize: 14 }}>
                      No pending password requests.
                    </p>
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                    }}
                  >
                    {pwdRequests.map((req) => (
                      <div
                        key={req.id}
                        style={{
                          background: "#fffbeb",
                          border: "1.5px solid #fde68a",
                          borderRadius: 12,
                          padding: "16px 18px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 12,
                          flexWrap: "wrap",
                        }}
                      >
                        <div>
                          <p
                            style={{
                              margin: 0,
                              fontSize: 14,
                              fontWeight: 700,
                              color: "#1e293b",
                            }}
                          >
                            {req.email}
                          </p>
                          <p
                            style={{
                              margin: "2px 0 0",
                              fontSize: 11,
                              color: "#94a3b8",
                            }}
                          >
                            Requested {fmtDate(req.created_at)}
                          </p>
                        </div>
                        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                          <button
                            onClick={() => approvePwdRequest(req)}
                            style={{
                              padding: "7px 16px",
                              borderRadius: 8,
                              border: "none",
                              background: "#16a34a",
                              color: "#fff",
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: "pointer",
                              fontFamily: "inherit",
                            }}
                          >
                            ✓ Approve
                          </button>
                          <button
                            onClick={() => rejectPwdRequest(req)}
                            style={{
                              padding: "7px 16px",
                              borderRadius: 8,
                              border: "1px solid #fca5a5",
                              background: "#fef2f2",
                              color: "#dc2626",
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: "pointer",
                              fontFamily: "inherit",
                            }}
                          >
                            ✕ Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Logs tab ── */}
            {tab === "logs" && (
              <div style={{ padding: 20 }}>
                <div style={{ marginBottom: 16 }}>
                  <h3
                    style={{ fontSize: 15, fontWeight: 700, margin: "0 0 4px" }}
                  >
                    System Access Logs
                  </h3>
                  <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>
                    Track who accessed the system and what actions were
                    performed.
                  </p>
                </div>
                <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      background: "var(--bg)",
                      border: "1.5px solid var(--border)",
                      borderRadius: 8,
                      padding: "8px 14px",
                      flex: 1,
                    }}
                  >
                    <img
                      src="/icon/search.png"
                      alt=""
                      style={{
                        width: 16,
                        height: 16,
                        filter: "brightness(0) saturate(100%) invert(40%)",
                      }}
                    />
                    <input
                      type="text"
                      placeholder="Search by name, action or IP…"
                      value={logSearch}
                      onChange={(e) => setLogSearch(e.target.value)}
                      style={{
                        border: "none",
                        background: "transparent",
                        fontSize: 13,
                        color: "var(--text)",
                        outline: "none",
                        fontFamily: "inherit",
                        width: "100%",
                      }}
                    />
                  </div>
                  <select
                    value={logRole}
                    onChange={(e) => setLogRole(e.target.value)}
                    className="mc-input"
                    style={{ width: 140 }}
                  >
                    <option value="">All Roles</option>
                    <option>Admin</option>
                    <option>Manager</option>
                    <option>Employee</option>
                    <option>Customer</option>
                  </select>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: 13,
                    }}
                  >
                    <thead>
                      <tr>
                        {["User", "Role", "Action", "Time", "Status"].map(
                          (h) => (
                            <th key={h} className="mc-th">
                              {h}
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLogs.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            style={{
                              textAlign: "center",
                              padding: 40,
                              color: "var(--muted)",
                            }}
                          >
                            No logs found
                          </td>
                        </tr>
                      ) : (
                        paginatedLogs.map((l) => (
                          <tr key={l.id}>
                            <td className="mc-td">
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 9,
                                }}
                              >
                                <Avatar
                                  firstName={l.user_name?.split(" ")[0]}
                                  lastName={l.user_name?.split(" ")[1]}
                                  role={l.user_role}
                                  size={30}
                                />
                                <span style={{ fontWeight: 600 }}>
                                  {l.user_name || "—"}
                                </span>
                              </div>
                            </td>
                            <td className="mc-td">
                              <span
                                className={`badge ${ROLE_BADGE[l.user_role] || "badge-gray"}`}
                              >
                                {l.user_role || "—"}
                              </span>
                            </td>
                            <td className="mc-td">
                              <div style={{ fontWeight: 600, fontSize: 13 }}>
                                {l.action}
                              </div>
                              {l.details && (
                                <div
                                  style={{
                                    fontSize: 11,
                                    color: "var(--muted)",
                                    marginTop: 2,
                                  }}
                                >
                                  {l.details}
                                </div>
                              )}
                            </td>
                            <td className="mc-td">
                              <span
                                style={{ fontSize: 12, color: "var(--muted)" }}
                              >
                                {l.created_at
                                  ? fmtTime(new Date(l.created_at))
                                  : "—"}
                              </span>
                            </td>
                            <td className="mc-td">
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  padding: "3px 10px",
                                  borderRadius: 20,
                                  background:
                                    l.status === "Success"
                                      ? "#dcfce7"
                                      : "#fef2f2",
                                  color:
                                    l.status === "Success"
                                      ? "#15803d"
                                      : "#dc2626",
                                }}
                              >
                                {l.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {logsTotalPages > 1 && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 4,
                      padding: "14px 18px",
                      borderTop: "1px solid var(--border)",
                      marginTop: 8,
                    }}
                  >
                    <button
                      onClick={() => setLogsPage((p) => Math.max(1, p - 1))}
                      disabled={safeLogsPage === 1}
                      style={{
                        padding: "6px 14px",
                        borderRadius: 20,
                        border: "1.5px solid var(--border)",
                        background: "transparent",
                        fontSize: 13,
                        fontWeight: 600,
                        color:
                          safeLogsPage === 1 ? "var(--muted)" : "var(--text)",
                        cursor: safeLogsPage === 1 ? "default" : "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      prev
                    </button>
                    {Array.from(
                      { length: logsTotalPages },
                      (_, i) => i + 1,
                    ).map((pg) => (
                      <button
                        key={pg}
                        onClick={() => setLogsPage(pg)}
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 20,
                          border: "1.5px solid",
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: "pointer",
                          fontFamily: "inherit",
                          transition: "all 0.15s",
                          background:
                            safeLogsPage === pg
                              ? "var(--royal)"
                              : "transparent",
                          color: safeLogsPage === pg ? "#fff" : "var(--text)",
                          borderColor:
                            safeLogsPage === pg
                              ? "var(--royal)"
                              : "var(--border)",
                        }}
                      >
                        {pg}
                      </button>
                    ))}
                    <button
                      onClick={() =>
                        setLogsPage((p) => Math.min(logsTotalPages, p + 1))
                      }
                      disabled={safeLogsPage === logsTotalPages}
                      style={{
                        padding: "6px 14px",
                        borderRadius: 20,
                        border: "1.5px solid var(--border)",
                        background: "transparent",
                        fontSize: 13,
                        fontWeight: 600,
                        color:
                          safeLogsPage === logsTotalPages
                            ? "var(--muted)"
                            : "var(--text)",
                        cursor:
                          safeLogsPage === logsTotalPages
                            ? "default"
                            : "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      next
                    </button>
                  </div>
                )}
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 12,
                    color: "var(--muted)",
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "0 4px",
                  }}
                >
                  <span>
                    Showing {filteredLogs.length} of {logs.length} log entries
                  </span>
                  <button
                    className="btn btn-ghost btn-sm mc-btn-auto"
                    onClick={fetchLogs}
                  >
                    ↻ Refresh
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Add User Modal ── */}
      {showAddModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            style={{
              background: "var(--card)",
              borderRadius: 14,
              width: "100%",
              maxWidth: 500,
              maxHeight: "90vh",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
            }}
          >
            <div
              style={{
                padding: "18px 20px 14px",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div
                style={{ display: "flex", alignItems: "flex-start", gap: 12 }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: "#fffbeb",
                    border: "1.5px solid #fde68a",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#d97706"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <line x1="19" y1="8" x2="19" y2="14" />
                    <line x1="22" y1="11" x2="16" y2="11" />
                  </svg>
                </div>
                <div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: 16,
                      fontWeight: 700,
                      color: "#1e293b",
                      lineHeight: 1.3,
                      fontFamily: "inherit",
                    }}
                  >
                    Request New User Account
                  </h3>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      marginTop: 4,
                    }}
                  >
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#d97706"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    <span
                      style={{
                        fontSize: 12,
                        color: "#d97706",
                        fontWeight: 600,
                        fontFamily: "inherit",
                      }}
                    >
                      Will be sent to Admin for approval
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                style={{
                  background: "#f3f4f6",
                  border: "none",
                  borderRadius: 8,
                  width: 30,
                  height: 30,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "#64748b",
                  fontSize: 16,
                  flexShrink: 0,
                }}
              >
                ✕
              </button>
            </div>
            <div
              className="modal-body"
              style={{ display: "flex", flexDirection: "column", gap: 14 }}
            >
              <div
                style={{
                  background: "#fffbeb",
                  border: "1.5px solid #fde68a",
                  borderRadius: 8,
                  padding: "10px 14px",
                  fontSize: 12,
                  color: "#92400e",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#d97706"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  style={{ flexShrink: 0, marginTop: 1 }}
                >
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <span>
                  This request will be sent to an <strong>Admin</strong> for
                  review. The account is only created after approval.
                </span>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
              >
                <div className="form-group" style={{ margin: 0 }}>
                  <label>
                    First Name <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Jane"
                    value={addForm.first_name}
                    onChange={(e) => handleFirstNameChange(e.target.value)}
                    className={addErrors.first_name ? "mc-input-err" : ""}
                  />
                  {addErrors.first_name && (
                    <div className="mc-err-msg">{addErrors.first_name}</div>
                  )}
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>
                    Last Name <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Doe"
                    value={addForm.last_name}
                    onChange={(e) => {
                      const val = sanitizeName(e.target.value);
                      const existingEmails = users
                        .map((u) => u.email?.toLowerCase())
                        .filter(Boolean);
                      setAddForm((f) => ({
                        ...f,
                        last_name: val,
                        email: f.emailLocked
                          ? f.email
                          : generateEmail(
                              f.first_name,
                              val,
                              f.role,
                              existingEmails,
                              branchAbbr,
                            ),
                      }));
                      setAddErrors((er) => ({ ...er, last_name: "" }));
                    }}
                    className={addErrors.last_name ? "mc-input-err" : ""}
                  />
                  {addErrors.last_name && (
                    <div className="mc-err-msg">{addErrors.last_name}</div>
                  )}
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 4,
                  }}
                >
                  <label style={{ margin: 0 }}>
                    Email Address <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  {!addForm.emailLocked && addForm.email && (
                    <span
                      style={{
                        fontSize: 11,
                        color: "#16a34a",
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#16a34a"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      >
                        <circle cx="12" cy="12" r="3" />
                        <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
                      </svg>{" "}
                      Auto-generated
                    </span>
                  )}
                  {addForm.emailLocked && (
                    <button
                      type="button"
                      onClick={() => {
                        const existing = users
                          .map((u) => u.email?.toLowerCase())
                          .filter(Boolean);
                        setAddForm((f) => ({
                          ...f,
                          email: generateEmail(
                            f.first_name,
                            f.last_name,
                            f.role,
                            existing,
                            branchAbbr,
                          ),
                          emailLocked: false,
                        }));
                      }}
                      style={{
                        fontSize: 11,
                        color: "#2563eb",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontWeight: 600,
                        padding: 0,
                      }}
                    >
                      ↻ Reset to auto
                    </button>
                  )}
                </div>
                <input
                  type="email"
                  placeholder="Type first name to auto-generate…"
                  value={addForm.email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  className={addErrors.email ? "mc-input-err" : ""}
                />
                {addErrors.email && (
                  <div className="mc-err-msg">{addErrors.email}</div>
                )}
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 4,
                  }}
                >
                  <label style={{ margin: 0 }}>
                    Suggested Password{" "}
                    <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <span
                    style={{
                      fontSize: 11,
                      color: "#16a34a",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#16a34a"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>{" "}
                    Auto-generated
                  </span>
                </div>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={addForm.password}
                    onChange={(e) => {
                      setAddForm((f) => ({ ...f, password: e.target.value }));
                      setAddErrors((er) => ({ ...er, password: "" }));
                    }}
                    className={addErrors.password ? "mc-input-err" : "mc-input"}
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      fontFamily: showPassword ? "monospace" : "inherit",
                      paddingRight: 88,
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    style={{
                      position: "absolute",
                      right: 46,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--muted)",
                      padding: "0 4px",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    {showPassword ? (
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={regeneratePassword}
                    style={{
                      position: "absolute",
                      right: 8,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: 16,
                      color: "#2563eb",
                      padding: "0 4px",
                    }}
                  >
                    ↻
                  </button>
                </div>
                {addErrors.password && (
                  <div className="mc-err-msg">{addErrors.password}</div>
                )}
                <div
                  style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}
                >
                  This password will be shown to the Admin during approval.
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label>
                  Sex <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <select
                  value={addForm.sex}
                  onChange={(e) => {
                    setAddForm((f) => ({ ...f, sex: e.target.value }));
                    setAddErrors((er) => ({ ...er, sex: "" }));
                  }}
                  className={addErrors.sex ? "mc-input-err" : ""}
                >
                  <option>Male</option>
                  <option>Female</option>
                </select>
                {addErrors.sex && (
                  <div className="mc-err-msg">{addErrors.sex}</div>
                )}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
              >
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Role</label>
                  <select
                    value={addForm.role}
                    onChange={(e) => {
                      const newRole = e.target.value;
                      const existing = users
                        .map((u) => u.email?.toLowerCase())
                        .filter(Boolean);
                      setAddForm((f) => ({
                        ...f,
                        role: newRole,
                        email: f.emailLocked
                          ? f.email
                          : generateEmail(
                              f.first_name,
                              f.last_name,
                              newRole,
                              existing,
                              branchAbbr,
                            ),
                      }));
                      setAddErrors((er) => ({ ...er, role: "" }));
                    }}
                    className={addErrors.role ? "mc-input-err" : ""}
                  >
                    <option>Employee</option>
                    <option>Manager</option>
                    <option>Customer</option>
                  </select>
                  {addErrors.role && (
                    <div className="mc-err-msg">{addErrors.role}</div>
                  )}
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Branch</label>
                  <input
                    type="text"
                    value={branchLabel}
                    readOnly
                    className="mc-input"
                    style={{ background: "var(--bg)", color: "var(--muted)" }}
                  />
                </div>
              </div>

              <div
                style={{
                  background: "var(--bg)",
                  borderRadius: 10,
                  padding: "12px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  border: "1px solid var(--border)",
                }}
              >
                <Avatar
                  firstName={addForm.first_name || "?"}
                  lastName={addForm.last_name}
                  role={addForm.role}
                  size={40}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>
                    {[addForm.first_name, addForm.last_name]
                      .filter(Boolean)
                      .join(" ") || "Preview"}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>
                    {addForm.email || "email will appear here"}
                  </div>
                </div>
                <span
                  className={`badge ${ROLE_BADGE[addForm.role] || "badge-gray"}`}
                  style={{ marginLeft: "auto" }}
                >
                  {addForm.role}
                </span>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-ghost mc-btn-auto"
                onClick={() => setShowAddModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn mc-btn-auto"
                style={{
                  background: "#d97706",
                  color: "#fff",
                  border: "none",
                  opacity: !isRequestFormValid() || saving ? 0.5 : 1,
                  cursor:
                    !isRequestFormValid() || saving ? "not-allowed" : "pointer",
                }}
                onClick={handleSubmitRequest}
                disabled={saving || !isRequestFormValid()}
              >
                {saving ? (
                  "Submitting…"
                ) : (
                  <span
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#fff"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>{" "}
                    Submit for Approval
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        show={!!confirm}
        title={confirm?.title}
        message={confirm?.message}
        type={confirm?.type}
        confirmLabel={confirm?.confirmLabel}
        onConfirm={confirm?.onConfirm}
        onCancel={() => setConfirm(null)}
      />
      {successModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: "var(--card)",
              borderRadius: 16,
              padding: 32,
              maxWidth: 400,
              width: "100%",
              textAlign: "center",
              boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: successModal.error ? "#fef2f2" : "#f0fdf4",
                border: `1.5px solid ${successModal.error ? "#fca5a5" : "#86efac"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 12px",
              }}
            >
              {successModal.error ? (
                <svg
                  width="26"
                  height="26"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#dc2626"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                <svg
                  width="26"
                  height="26"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#16a34a"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
            <h3
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: "#1e293b",
                margin: "0 0 8px",
              }}
            >
              {successModal.error
                ? "Action Not Allowed"
                : successModal.approved
                  ? "Account Created!"
                  : successModal.deletion
                    ? "Deletion Request Sent!"
                    : "Request Submitted!"}
            </h3>
            <p style={{ fontSize: 14, color: "#64748b", margin: "0 0 24px" }}>
              {successModal.error
                ? successModal.message
                : successModal.approved
                  ? `Account for ${successModal.name} has been created successfully.`
                  : successModal.deletion
                    ? `A deletion request for ${successModal.name} has been sent to the Admin for approval.`
                    : `Your request for ${successModal.name} has been sent to the Admin for approval.`}
            </p>
            <button
              onClick={() => setSuccessModal(null)}
              style={{
                background: successModal.error ? "#dc2626" : "#2563eb",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "10px 32px",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {successModal.error ? "Close" : "Done"}
            </button>
          </div>
        </div>
      )}

      {showDeletedModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            style={{
              background: "var(--card)",
              borderRadius: 14,
              width: "100%",
              maxWidth: 560,
              maxHeight: "80vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
            }}
          >
            <div
              style={{
                padding: "18px 20px",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: 16,
                    fontWeight: 700,
                    color: "var(--text)",
                  }}
                >
                  Recently Deleted
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: 12,
                    color: "var(--muted)",
                    marginTop: 2,
                  }}
                >
                  Users are permanently removed 30 days after deletion.
                </p>
              </div>
              <button
                onClick={() => setShowDeletedModal(false)}
                style={{
                  background: "#f3f4f6",
                  border: "none",
                  borderRadius: 8,
                  width: 30,
                  height: 30,
                  cursor: "pointer",
                  color: "#64748b",
                  fontSize: 16,
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ padding: 20, overflowY: "auto", flex: 1 }}>
              {deletedUsers.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px 0",
                    color: "var(--muted)",
                  }}
                >
                  <p style={{ fontSize: 13, margin: 0 }}>
                    No recently deleted users.
                  </p>
                </div>
              ) : (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 10 }}
                >
                  {deletedUsers.map((u) => {
                    const daysLeft = Math.max(
                      0,
                      30 -
                        Math.floor(
                          (Date.now() - new Date(u.deleted_at).getTime()) /
                            (24 * 60 * 60 * 1000),
                        ),
                    );
                    return (
                      <div
                        key={u.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 12,
                          border: "1px solid var(--border)",
                          borderRadius: 10,
                          padding: "12px 14px",
                          flexWrap: "wrap",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                          }}
                        >
                          <Avatar
                            firstName={u.first_name}
                            lastName={u.last_name}
                            role={u.role}
                          />
                          <div>
                            <div
                              style={{
                                fontWeight: 700,
                                fontSize: 13,
                                color: "var(--text)",
                              }}
                            >
                              {fullName(u)}
                            </div>
                            <div
                              style={{ fontSize: 11, color: "var(--muted)" }}
                            >
                              {u.email}
                            </div>
                            <div
                              style={{
                                fontSize: 11,
                                color: daysLeft <= 5 ? "#dc2626" : "#92400e",
                                fontWeight: 600,
                                marginTop: 3,
                              }}
                            >
                              {daysLeft > 0
                                ? `${daysLeft} day${daysLeft !== 1 ? "s" : ""} left before permanent deletion`
                                : "Deleting soon"}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            onClick={() => restoreUser(u)}
                            style={{
                              background: "#f0fdf4",
                              border: "1.5px solid #86efac",
                              color: "#166534",
                              borderRadius: 8,
                              padding: "7px 14px",
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: "pointer",
                              fontFamily: "inherit",
                            }}
                          >
                            Restore
                          </button>
                          <button
                            onClick={() => permanentlyDeleteUser(u)}
                            style={{
                              background: "#fef2f2",
                              border: "1.5px solid #fca5a5",
                              color: "#dc2626",
                              borderRadius: 8,
                              padding: "7px 14px",
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: "pointer",
                              fontFamily: "inherit",
                            }}
                          >
                            Delete Now
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div
              style={{
                padding: "14px 20px",
                borderTop: "1px solid var(--border)",
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <button
                className="btn btn-ghost mc-btn-auto"
                onClick={() => setShowDeletedModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default ManagerControl;
