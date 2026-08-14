import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../js/Utils/supabase";
import { getNavLinks, getBranchId } from "../js/Utils/branchTables";
import "../styles/Layout.css";

// Converts a raw role string (from JWT/localStorage) into a canonical role name used across the app.
// === FUNCTION: normalizeRole ===
const normalizeRole = (raw) => {
  if (!raw) return "Employee";
  const map = {
    super_admin: "super_admin",
    superadmin: "super_admin",
    admin: "Admin",
    manager: "Manager",
    employee: "Employee",
    customer: "Customer",
  };
  return map[String(raw).toLowerCase()] || raw;
};

// Derives a branch name from a staff email address (e.g. name@branch.role.domain).
// Returns null if the email doesn't match the expected 3+ segment domain pattern.
const parseBranch = (email) => {
  if (!email) return null;
  const domain = email.split("@")[1] || "";
  const parts = domain.split(".");
  const ROLE_SEGMENTS = new Set([
    "admin",
    "manager",
    "employee",
    "staff",
    "vet",
  ]);
  if (parts.length < 3) return null;
  const candidate = parts[0].toLowerCase();
  if (!ROLE_SEGMENTS.has(parts[1]?.toLowerCase())) return null;
  const BRANCH_NAMES = {
    sf: "San Fernando",
    sanfernando: "San Fernando",
    mabalacat: "Mabalacat",
    main: "Main",
    angeles: "Angeles",
    tarlac: "Tarlac",
    magalang: "Magalang",
  };
  return (
    BRANCH_NAMES[candidate] ||
    candidate.charAt(0).toUpperCase() + candidate.slice(1)
  );
};

// Maps branch name → numeric ID (mirrors branchTables.js BRANCH_ID_MAP)
const BRANCH_NAME_TO_ID = {
  main: 1,
  mabalacat: 1,
  mabalacat2: 2,
  tarlac: 3,
  angeles: 4,
  angelescity: 4,
  sanfernando: 5,
  sf: 5,
  magalang: 6,
};

const BRANCH_COLORS = {
  1: "#7C3AED",
  2: "#0EA5E9",
  3: "#10B981",
  4: "#7C3AED",
  5: "#F59E0B",
  6: "#EF4444",
};

const BRANCH_DISPLAY_NAMES = {
  1: "Main",
  2: "Mabalacat 2",
  3: "Tarlac",
  4: "San Fernando",
  5: "Angeles",
  6: "Magalang",
};

const normalizeBranchKey = (b) =>
  String(b || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .trim();

// Maps any historical/legacy branch string variant to the current canonical name —
// mirrors Emergency.jsx's BRANCH_ALIASES so the toast query and Emergency.jsx agree.
const BRANCH_ALIASES = {
  main: "Main",
  "main branch": "Main",
  mabalacat: "Mabalacat 2",
  "mabalacat branch": "Mabalacat 2",
  "mabalacat 2": "Mabalacat 2",
  mabalacat2: "Mabalacat 2",
  tarlac: "Tarlac",
  "tarlac city": "Tarlac",
  "tarlac branch": "Tarlac",
  "san fernando": "San Fernando",
  "san fernando branch": "San Fernando",
  angeles: "Angeles",
  "angeles city": "Angeles",
  "angeles branch": "Angeles",
  magalang: "Magalang",
  "magalang branch": "Magalang",
};
const normalizeBranchName = (b) =>
  BRANCH_ALIASES[
    String(b || "")
      .toLowerCase()
      .trim()
  ] || b;

// Decodes the stored JWT to build a user object (name, role, email, branch, branchId)
// used throughout the layout for permissions and branch-specific theming.
const readUserInfo = () => {
  try {
    const token = localStorage.getItem("hospital_jwt");
    if (!token)
      return {
        name: "User",
        role: "Employee",
        email: "",
        id: "",
        branch: null,
        branchId: 4,
      };
    const payload = JSON.parse(atob(token.split(".")[1]));
    const meta = payload.user_metadata || {};
    const appMeta = payload.app_metadata || {};
    const firstName = meta.first_name || "";
    const lastName = meta.last_name || "";
    const name =
      firstName || lastName
        ? `${firstName} ${lastName}`.trim()
        : payload.email?.split("@")[0] || "User";
    // IMPORTANT: role/branch must come from the signed JWT only.
    // Never trust localStorage overrides here — they're editable via DevTools
    // and would let anyone grant themselves admin/super_admin client-side.
    const rawRole = appMeta.role || meta.role || payload.role || "Employee";
    const role = normalizeRole(rawRole);
    const email = payload.email || "";
    const branch = parseBranch(email) || appMeta.branch || null;

    // Resolve numeric branch ID
    const key = normalizeBranchKey(branch);
    const branchId = BRANCH_NAME_TO_ID[key] || 4;

    return { name, role, email, id: payload.sub || "", branch, branchId };
  } catch {
    return {
      name: "User",
      role: "Employee",
      email: "",
      id: "",
      branch: null,
      branchId: 4,
    };
  }
};

// Quick check for whether a normalized role string represents a customer account.
const roleIsCustomer = (role) => role === "Customer";

// Color tokens per emergency-alert status (pending/responding/resolved).
const STATUS_COLORS = {
  pending: {
    bg: "#fef9c3",
    border: "#fde047",
    text: "#854d0e",
    badge: "#f59e0b",
  },
  responding: {
    bg: "#dbeafe",
    border: "#93c5fd",
    text: "#1d4ed8",
    badge: "#2563eb",
  },
  resolved: {
    bg: "#dcfce7",
    border: "#86efac",
    text: "#166534",
    badge: "#16a34a",
  },
};
// Icon/color/label config per toast type (emergency, message, stock).
const TOAST_CONFIG = {
  emergency: {
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
    accent: "#e53e3e",
    iconBg: "#fff5f5",
    iconColor: "#e53e3e",
    label: "Emergency",
    labelBg: "#fff5f5",
    labelColor: "#c53030",
  },
  message: {
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    accent: "#3182ce",
    iconBg: "#ebf8ff",
    iconColor: "#3182ce",
    label: "Message",
    labelBg: "#ebf8ff",
    labelColor: "#2b6cb0",
  },
  stock: {
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      </svg>
    ),
    accent: "#d97706",
    iconBg: "#fffbeb",
    iconColor: "#d97706",
    label: "Inventory",
    labelBg: "#fffbeb",
    labelColor: "#b45309",
  },
};

// Renders a single auto-dismissing toast notification with enter/leave animation
// and an emergency-specific pulsing highlight.
const Toast = ({ id, type, title, body, onClose }) => {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const cfg = TOAST_CONFIG[type] || TOAST_CONFIG.message;

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 10);
    const t2 = setTimeout(() => {
      setLeaving(true);
      setTimeout(() => onClose(id), 320);
    }, 5500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [id, onClose]);

  const handleClose = () => {
    setLeaving(true);
    setTimeout(() => onClose(id), 320);
  };

  const toastStyleVars = {
    "--toast-accent": cfg.accent,
    "--toast-icon-bg": cfg.iconBg,
    "--toast-icon-color": cfg.iconColor,
    "--toast-label-bg": cfg.labelBg,
    "--toast-label-color": cfg.labelColor,
  };

  return (
    <div
      className={`toast-card ${visible && !leaving ? "enter" : "leave"} ${type === "emergency" ? "toast-emergency-pulse" : ""}`}
      style={toastStyleVars}
    >
      <style>{`
        @keyframes toastEmergencyPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(229,62,62,0.55); }
          50% { box-shadow: 0 0 0 8px rgba(229,62,62,0); }
        }
        .toast-emergency-pulse { animation: toastEmergencyPulse 1s ease-out infinite; border: 1px solid #e53e3e; }
      `}</style>
      <div className="toast-accent" />
      <div className="toast-body-row">
        <div className="toast-icon">{cfg.icon}</div>

        <div className="toast-content">
          <div className="toast-header-row">
            <span className="toast-label">{cfg.label}</span>
            <button className="toast-close-btn" onClick={handleClose}>
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <p className="toast-title">{title}</p>

          <p className="toast-body">{body}</p>
        </div>
      </div>

      <div className="toast-progress-track">
        <div className="toast-progress-fill" />
      </div>
    </div>
  );
};

// Stacks and renders the list of active toasts.
const ToastContainer = ({ toasts, onClose }) => (
  <div className="toast-container">
    {toasts.map((t) => (
      <div key={t.id} className="toast-item-wrap">
        <Toast {...t} onClose={onClose} />
      </div>
    ))}
  </div>
);

// Full-detail modal for a single emergency alert. Admins/managers can advance
// its status (pending → responding → resolved) from here.
const AlertDetailModal = ({ alert, onClose, onUpdateStatus, isAdmin }) => {
  const [updating, setUpdating] = useState(false);
  if (!alert) return null;
  const status = alert.status || "pending";
  const col = STATUS_COLORS[status] || STATUS_COLORS.pending;

  // === FUNCTION: AlertDetailModal > handleUpdate ===
  const handleUpdate = async (newStatus) => {
    setUpdating(true);
    await onUpdateStatus(alert.id, newStatus);
    setUpdating(false);
    onClose();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 99999,
        padding: 20,
      }}
    >
      <div
        style={{
          background: "var(--card)",
          borderRadius: 16,
          padding: "28px",
          maxWidth: 460,
          width: "100%",
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
          animation: "modalIn 0.18s ease",
        }}
      >
        <style>{`@keyframes modalIn { from { opacity:0; transform:scale(0.95) } to { opacity:1; transform:scale(1) } }`}</style>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ display: "flex", alignItems: "center" }}>
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#dc2626"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </span>
            <div>
              <h3
                style={{
                  fontSize: 16,
                  fontWeight: 800,
                  color: "#dc2626",
                  margin: 0,
                }}
              >
                {alert.type}
              </h3>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: col.text,
                  background: col.bg,
                  border: `1px solid ${col.border}`,
                  borderRadius: 20,
                  padding: "2px 10px",
                  textTransform: "capitalize",
                  display: "inline-block",
                  marginTop: 4,
                }}
              >
                {status}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "#f1f5f9",
              border: "none",
              borderRadius: 8,
              width: 32,
              height: 32,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#64748b",
              fontFamily: "inherit",
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div
          style={{
            background: "var(--bg)",
            borderRadius: 10,
            padding: "16px",
            marginBottom: 20,
          }}
        >
          <div style={{ marginBottom: 12 }}>
            <p
              style={{
                fontSize: 11,
                color: "#64748b",
                fontWeight: 600,
                margin: "0 0 4px",
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              Place of Emergency
            </p>
            <p
              style={{
                fontSize: 14,
                color: "#1e293b",
                margin: 0,
                lineHeight: 1.6,
              }}
            >
              {alert.location ||
                alert.guest_address ||
                "Location not specified"}
            </p>
          </div>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            {[
              { label: "Branch", value: alert.branch },
              { label: "Sent By", value: alert.sent_by },
              {
                label: "Date",
                value: new Date(alert.created_at).toLocaleDateString(),
              },
              {
                label: "Time",
                value: new Date(alert.created_at).toLocaleTimeString("en", {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
              },
            ].map((item) => (
              <div key={item.label}>
                <p
                  style={{
                    fontSize: 11,
                    color: "#64748b",
                    fontWeight: 600,
                    margin: "0 0 2px",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  {item.label}
                </p>
                <p
                  style={{
                    fontSize: 13,
                    color: "#1e293b",
                    margin: 0,
                    fontWeight: 600,
                  }}
                >
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>
        {isAdmin && status !== "resolved" && (
          <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
            {status === "pending" && (
              <button
                onClick={() => handleUpdate("responding")}
                disabled={updating}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontWeight: 700,
                  fontSize: 13,
                  background: "#dbeafe",
                  color: "#1d4ed8",
                  border: "1px solid #93c5fd",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="#1d4ed8"
                  stroke="none"
                >
                  <circle cx="12" cy="12" r="10" />
                </svg>
                Mark Responding
              </button>
            )}
            <button
              onClick={() => handleUpdate("resolved")}
              disabled={updating}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: 8,
                cursor: "pointer",
                fontFamily: "inherit",
                fontWeight: 700,
                fontSize: 13,
                background: "#dcfce7",
                color: "#166534",
                border: "1px solid #86efac",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              {updating ? (
                "Updating..."
              ) : (
                <>
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#166534"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>{" "}
                  Mark Resolved
                </>
              )}
            </button>
          </div>
        )}
        <button
          onClick={onClose}
          style={{
            width: "100%",
            padding: "10px",
            borderRadius: 8,
            cursor: "pointer",
            fontFamily: "inherit",
            fontWeight: 600,
            fontSize: 13,
            background: "transparent",
            color: "#64748b",
            border: "1px solid #e2e8f0",
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
};

// Reusable confirm/alert dialog (used for logout confirmation, session-expired prompt, etc).
export const Modal = ({
  show,
  title,
  message,
  type = "confirm",
  onConfirm,
  onCancel,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmColor = "var(--royal)",
}) => {
  if (!show) return null;
  return (
    <div className="apc-modal-overlay">
      <div
        className="apc-modal-box"
        style={{ "--modal-confirm-color": confirmColor }}
      >
        <h3 className="apc-modal-title">{title}</h3>
        <p className="apc-modal-message">{message}</p>
        <div className="apc-modal-actions">
          {onCancel && (
            <button className="apc-modal-btn-cancel" onClick={onCancel}>
              {cancelText}
            </button>
          )}
          <button className="apc-modal-btn-confirm" onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

// Maps nav-item keywords to inline SVG path data used as sidebar icons.
const NAV_ICONS = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </>
  ),
  patient: (
    <>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </>
  ),
  appointment: (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </>
  ),
  room: (
    <>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </>
  ),
  inventory: (
    <>
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    </>
  ),
  pos: (
    <>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8" />
      <path d="M12 17v4" />
    </>
  ),
  "point of sale": (
    <>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8" />
      <path d="M12 17v4" />
    </>
  ),
  "walk-in": (
    <>
      <path d="M13 4a1 1 0 1 0 2 0 1 1 0 0 0-2 0" />
      <path d="M7.5 17.5L9 13l3 2 2-5" />
      <path d="M9 13l-2 5" />
    </>
  ),
  walkin: (
    <>
      <path d="M13 4a1 1 0 1 0 2 0 1 1 0 0 0-2 0" />
      <path d="M7.5 17.5L9 13l3 2 2-5" />
      <path d="M9 13l-2 5" />
    </>
  ),
  report: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </>
  ),
  message: (
    <>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </>
  ),
  emergency: (
    <>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </>
  ),
  branch: (
    <>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M9 22V12h6v10" />
    </>
  ),
  admin: (
    <>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </>
  ),
  security: (
    <>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </>
  ),
  manager: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M20 21a8 8 0 1 0-16 0" />
      <path d="M12 14v7" />
      <path d="M9 17h6" />
    </>
  ),
  staff: (
    <>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  schedule: (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </>
  ),
  billing: (
    <>
      <rect x="1" y="4" width="22" height="16" rx="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </>
  ),
  ai: (
    <>
      <path d="M12 2a10 10 0 1 0 10 10" />
      <path d="M12 8v4l3 3" />
      <circle cx="18" cy="6" r="3" />
    </>
  ),
  shop: (
    <>
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </>
  ),
  pets: (
    <>
      <path d="M10 5.172C10 3.782 8.423 2.679 6.5 3c-2.823.47-4.113 6.006-4 7 .08.703 1.725 1.722 3.656 1 1.261-.472 1.96-1.45 2.344-2.5" />
      <path d="M14.267 5.172c0-1.39 1.577-2.493 3.5-2.172 2.823.47 4.113 6.006 4 7-.08.703-1.725 1.722-3.656 1-1.261-.472-1.96-1.45-2.344-2.5" />
      <path d="M8 14v.5" />
      <path d="M16 14v.5" />
      <path d="M11.25 16.25h1.5L12 17l-.75-.75z" />
      <path d="M4.42 11.247A13.152 13.152 0 0 0 4 14.556C4 18.728 7.582 21 12 21s8-2.272 8-6.444c0-1.061-.162-2.2-.493-3.309m-9.243-6.082A8.801 8.801 0 0 1 12 5c.78 0 1.5.108 2.161.306" />
    </>
  ),
  default: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" />
    </>
  ),
};

// Picks the best-matching icon from NAV_ICONS based on a nav item's label/href text.
export const getNavIcon = (label = "", href = "") => {
  const key = (label + " " + href).toLowerCase();
  for (const [k, svg] of Object.entries(NAV_ICONS)) {
    if (key.includes(k)) return svg;
  }
  return NAV_ICONS.default;
};

// Single sidebar navigation link: shows icon + label (when expanded), an unread
// badge, active/hover styling, and a floating tooltip when collapsed.
const SidebarItem = ({
  href,
  label,
  badge,
  isActive,
  isAI,
  isEmergency,
  isBranch,
  isPredictive,
  isExpanded,
  index = 0,
}) => {
  const [hovered, setHovered] = useState(false);
  const linkRef = useRef(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });

  let activeColor = "#7c3aed";
  if (isEmergency) activeColor = "#ef4444";
  if (isAI) activeColor = "#818cf8";

  const iconColor = isActive || hovered ? "#ffffff" : "rgba(255,255,255,0.55)";
  const svgPaths = getNavIcon(label, href);

  return (
    <Link
      ref={linkRef}
      to={href}
      // === FUNCTION: SidebarItem > onMouseEnter (positions tooltip) ===
      onMouseEnter={() => {
        setHovered(true);
        if (linkRef.current) {
          const rect = linkRef.current.getBoundingClientRect();
          setTooltipPos({
            top: rect.top + rect.height / 2,
            left: rect.right + 14,
          });
        }
      }}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        width: isExpanded ? "calc(100% - 0px)" : 44,
        height: 44,
        borderRadius: 12,
        marginBottom: 4,
        paddingLeft: isExpanded ? 12 : 0,
        paddingRight: isExpanded ? 8 : 0,
        justifyContent: isExpanded ? "flex-start" : "center",
        background: isActive
          ? `${activeColor}22`
          : hovered
            ? "rgba(255,255,255,0.08)"
            : "transparent",
        borderLeft: isActive
          ? `3px solid ${activeColor}`
          : "3px solid transparent",
        transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
        textDecoration: "none",
        flexShrink: 0,
        overflow: "hidden",
        animation: isExpanded
          ? `navItemSlideUp 0.3s cubic-bezier(0.4,0,0.2,1) ${index * 0.03}s both`
          : "none",
      }}
    >
      <span
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          width: 20,
          height: 20,
        }}
      >
        {isAI ? (
          <img
            src="/icon/artificial-intelligence.png?v=2"
            alt="AI"
            width={18}
            height={18}
            style={{
              filter: "brightness(0) invert(1)",
              opacity: isActive || hovered ? 1 : 0.55,
              transition: "opacity 0.18s",
              display: "block",
            }}
          />
        ) : isEmergency ? (
          <img
            src="/icon/siren.png"
            alt="Emergency"
            width={18}
            height={18}
            style={{
              filter: "brightness(0) invert(1)",
              opacity: isActive || hovered ? 1 : 0.55,
              transition: "opacity 0.18s",
              display: "block",
            }}
          />
        ) : isBranch ? (
          <img
            src="/icon/pin.png"
            alt="Branches"
            width={18}
            height={18}
            style={{
              filter: "brightness(0) invert(1)",
              opacity: isActive || hovered ? 1 : 0.55,
              transition: "opacity 0.18s",
              display: "block",
            }}
          />
        ) : isPredictive ? (
          <img
            src="/icon/predictive-analytics.png"
            alt="Predictive Analytics"
            width={18}
            height={18}
            style={{
              filter: "brightness(0) invert(1)",
              opacity: isActive || hovered ? 1 : 0.55,
              transition: "opacity 0.18s",
              display: "block",
            }}
          />
        ) : (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke={iconColor}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ transition: "stroke 0.18s", display: "block" }}
          >
            {svgPaths}
          </svg>
        )}
      </span>
      <span
        style={{
          marginLeft: 10,
          fontSize: 13,
          fontWeight: isActive ? 700 : 500,
          color: isActive || hovered ? "#fff" : "rgba(255,255,255,0.7)",
          whiteSpace: "nowrap",
          opacity: isExpanded ? 1 : 0,
          maxWidth: isExpanded ? 160 : 0,
          overflow: "hidden",
          transition:
            "opacity 0.2s cubic-bezier(0.4,0,0.2,1), max-width 0.25s cubic-bezier(0.4,0,0.2,1)",
          transitionDelay: isExpanded ? "0.06s" : "0s",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        {label}
        {isAI && (
          <span
            style={{
              background: "#818cf8",
              borderRadius: 4,
              fontSize: 9,
              fontWeight: 700,
              padding: "1px 4px",
              color: "#fff",
              letterSpacing: "0.02em",
            }}
          >
            AI
          </span>
        )}
      </span>

      {badge > 0 && (
        <span
          style={{
            marginLeft: isExpanded ? "auto" : undefined,
            position: isExpanded ? "relative" : "absolute",
            top: isExpanded ? undefined : 4,
            right: isExpanded ? undefined : 4,
            background: isEmergency ? "#ef4444" : "#2563eb",
            color: "#fff",
            borderRadius: isExpanded ? 20 : "50%",
            width: isExpanded ? "auto" : 16,
            height: isExpanded ? 18 : 16,
            minWidth: isExpanded ? 18 : undefined,
            fontSize: 9,
            fontWeight: 800,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: isExpanded ? "0 6px" : 0,
            border: isExpanded ? "none" : "2px solid #1e1b4b",
            flexShrink: 0,
            transition: "all 0.25s",
          }}
        >
          {badge > 9 ? "9+" : badge}
        </span>
      )}

      {!isExpanded && hovered && (
        <div
          style={{
            position: "fixed",
            left: tooltipPos.left,
            top: tooltipPos.top,
            transform: "translateY(-50%)",
            display: "flex",
            alignItems: "center",
            gap: 7,
            padding: "7px 12px",
            borderRadius: 7,
            background:
              "linear-gradient(90deg, hsla(231, 65%, 25%, 1) 0%, hsla(224, 64%, 33%, 1) 50%, hsla(236, 67%, 55%, 1) 100%)",
            border: "1px solid rgba(255,255,255,.1)",
            color: "#f1f5f9",
            whiteSpace: "nowrap",
            pointerEvents: "none",
            zIndex: 99999,
            boxShadow: "0 6px 20px rgba(0,0,0,.35), 0 2px 6px rgba(0,0,0,.2)",
            animation: "sidebarTooltip .15s ease-out",
          }}
        >
          <span
            style={{
              fontSize: 12.5,
              fontWeight: 600,
              letterSpacing: ".01em",
              color: "#f1f5f9",
            }}
          >
            {label}
          </span>

          {isAI && (
            <span
              style={{
                background: "rgba(129,140,248,.16)",
                color: "#a5b4fc",
                borderRadius: 4,
                padding: "1px 5px",
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: ".03em",
              }}
            >
              AI
            </span>
          )}

          <span
            style={{
              position: "absolute",
              left: -4,
              top: "50%",
              transform: "translateY(-50%) rotate(45deg)",
              width: 8,
              height: 8,
              background: "hsla(224, 64%, 33%, 1)",
              borderLeft: "1px solid rgba(255,255,255,.1)",
              borderBottom: "1px solid rgba(255,255,255,.1)",
            }}
          />
        </div>
      )}
    </Link>
  );
};

// Small badge in the sidebar showing the current branch name/color; collapses
// to a colored dot when the sidebar is not expanded.
const BranchPill = ({ branchId, branchName, isExpanded }) => {
  const color = BRANCH_COLORS[branchId] || "#7C3AED";
  const displayName =
    BRANCH_DISPLAY_NAMES[branchId] || branchName || "Main Branch";

  if (!isExpanded) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: 28,
          marginBottom: 8,
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: color,
            boxShadow: `0 0 6px ${color}88`,
          }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        margin: "0 8px 10px",
        padding: "6px 10px",
        borderRadius: 8,
        background: `${color}18`,
        border: `0.5px solid ${color}44`,
        display: "flex",
        alignItems: "center",
        gap: 7,
        transition: "all 0.25s",
      }}
    >
      <div
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: color,
          flexShrink: 0,
        }}
      />
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.07em",
            color: "rgba(255,255,255,0.38)",
            textTransform: "uppercase",
            marginBottom: 1,
          }}
        >
          Branch
        </div>
        <div
          style={{
            fontSize: 12,
            color: "#fff",
            fontWeight: 600,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {displayName}
        </div>
      </div>
    </div>
  );
};

// Tabbed dropdown (Emergency / Messages / Stock) shown from the topbar bell icon,
// listing each alert type with click-through to the alert detail modal.
const NotifDropdown = ({
  activeTab,
  setActiveTab,
  easAlerts,
  msgAlerts,
  stockAlerts,
  easCount,
  msgCount,
  stockCount,
  onAlertClick,
  onClose,
}) => {
  const tabIcons = {
    emergency: (
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
    messages: (
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    stock: (
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      </svg>
    ),
  };
  const tabs = [
    { key: "emergency", label: "Emergency", count: easCount, color: "#ef4444" },
    { key: "messages", label: "Messages", count: msgCount, color: "#2563eb" },
    { key: "stock", label: "Stock", count: stockCount, color: "#f59e0b" },
  ];

  const lists = {
    emergency: easAlerts,
    messages: msgAlerts,
    stock: stockAlerts,
  };
  const items = lists[activeTab] || [];

  // === FUNCTION: NotifDropdown > renderItem ===
  const renderItem = (item) => {
    if (activeTab === "emergency") {
      const col = STATUS_COLORS[item.status] || STATUS_COLORS.pending;
      return (
        <div
          key={item.id}
          onClick={() => {
            onAlertClick(item);
            onClose();
          }}
          style={{
            padding: "12px 14px",
            borderBottom: "1px solid #f1f5f9",
            cursor: "pointer",
            transition: "background 0.12s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg)")}
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 4,
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 800, color: "#dc2626" }}>
              {item.type}
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: col.text,
                background: col.bg,
                border: `1px solid ${col.border}`,
                borderRadius: 20,
                padding: "1px 8px",
                textTransform: "capitalize",
              }}
            >
              {item.status}
            </span>
          </div>
          <p
            style={{
              fontSize: 12,
              color: "#64748b",
              margin: "0 0 4px",
              lineHeight: 1.4,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="#94a3b8"
              stroke="none"
              style={{ flexShrink: 0 }}
            >
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
            </svg>
            {(
              item.location ||
              item.guest_address ||
              "Location not specified"
            )?.slice(0, 80)}
            {(item.location || item.guest_address)?.length > 80 ? "…" : ""}
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <span
              style={{
                fontSize: 10,
                color: "#94a3b8",
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
                stroke="#94a3b8"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M3 21h18M5 21V7l8-4v18M13 21V11l6 4v6" />
              </svg>
              {item.branch}
            </span>
            <span style={{ fontSize: 10, color: "#94a3b8" }}>
              {new Date(item.created_at).toLocaleTimeString("en", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>{" "}
        </div>
      );
    }
    if (activeTab === "messages") {
      return (
        <div
          key={item.id}
          style={{
            padding: "12px 14px",
            borderBottom: "1px solid #f1f5f9",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 4,
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "#7c3aed22",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 800,
                color: "#7c3aed",
                flexShrink: 0,
              }}
            >
              {(item.sender_name || item.sender_email || "?")
                .charAt(0)
                .toUpperCase()}
            </div>
            <div>
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#1e293b",
                  margin: 0,
                }}
              >
                {item.sender_name || item.sender_email || "Unknown"}
              </p>
              <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>
                {item.content?.slice(0, 60)}
                {item.content?.length > 60 ? "…" : ""}
              </p>
            </div>
          </div>
          <span style={{ fontSize: 10, color: "#94a3b8" }}>
            {new Date(item.created_at).toLocaleTimeString("en", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      );
    }
    if (activeTab === "stock") {
      const isLow = item.stock <= item.reorder_level;
      return (
        <div
          key={item.id}
          style={{ padding: "12px 14px", borderBottom: "1px solid #f1f5f9" }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 2,
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 700, color: "#1e293b" }}>
              {item.name}
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: isLow ? "#dc2626" : "#f59e0b",
                background: isLow ? "#fee2e2" : "#fef9c3",
                borderRadius: 20,
                padding: "1px 8px",
              }}
            >
              {isLow ? "Critical" : "Low"}
            </span>
          </div>
          <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>
            Stock: <strong style={{ color: "#dc2626" }}>{item.stock}</strong> /
            Reorder at: {item.reorder_level}
          </p>
          {item.branch && (
            <span
              style={{
                fontSize: 10,
                color: "#94a3b8",
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
              }}
            >
              <svg
                width="9"
                height="9"
                viewBox="0 0 24 24"
                fill="#94a3b8"
                stroke="none"
              >
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
              </svg>
              {item.branch}
            </span>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div
      className="notif-dropdown"
      style={{
        position: "absolute",
        top: "calc(100% + 10px)",
        right: 0,
        width: 340,
        background: "var(--card)",
        borderRadius: 14,
        boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
        border: "1px solid var(--border)",
        zIndex: 10000,
        overflow: "hidden",
        animation: "dropIn 0.15s ease",
      }}
    >
      <div
        style={{
          padding: "14px 16px 0",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <h4
            style={{
              margin: 0,
              fontSize: 14,
              fontWeight: 800,
              color: "var(--text)",
            }}
          >
            Notifications
          </h4>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#94a3b8",
              display: "flex",
              alignItems: "center",
              fontFamily: "inherit",
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div style={{ display: "flex", gap: 2 }}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1,
                padding: "6px 4px",
                border: "none",
                borderBottom:
                  activeTab === tab.key
                    ? `2px solid ${tab.color}`
                    : "2px solid transparent",
                background: "transparent",
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 700,
                color: activeTab === tab.key ? tab.color : "#94a3b8",
                fontFamily: "inherit",
                transition: "all 0.15s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
              }}
            >
              {tabIcons[tab.key]}
              {tab.label}
              {tab.count > 0 && (
                <span
                  style={{
                    background: tab.color,
                    color: "#fff",
                    borderRadius: "50%",
                    width: 16,
                    height: 16,
                    fontSize: 9,
                    fontWeight: 800,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {tab.count > 9 ? "9+" : tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
      <div style={{ maxHeight: 320, overflowY: "auto" }}>
        {items.length === 0 ? (
          <div
            style={{
              padding: "32px 16px",
              textAlign: "center",
              color: "#94a3b8",
            }}
          >
            <div
              style={{
                marginBottom: 8,
                display: "flex",
                justifyContent: "center",
              }}
            >
              {activeTab === "emergency" ? (
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#cbd5e1"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              ) : activeTab === "messages" ? (
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#cbd5e1"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              ) : (
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#cbd5e1"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                >
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                </svg>
              )}
            </div>
            <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>
              No {activeTab} alerts
            </p>
          </div>
        ) : (
          items.map(renderItem)
        )}
      </div>
    </div>
  );
};

// === FUNCTION: AvatarDropdown (component) ===
const AvatarDropdown = ({ user, onLogout, onClose, avatarUrl }) => {
  const color = BRANCH_COLORS[user.branchId] || "#7C3AED";
  const displayBranch = BRANCH_DISPLAY_NAMES[user.branchId] || user.branch;
  const profilePath =
    user.role?.toLowerCase() === "customer" ? "/customer/profile" : "/profile";

  const [darkMode, setDarkMode] = React.useState(
    () => localStorage.getItem("darkMode") === "1",
  );

  // === FUNCTION: AvatarDropdown > toggleDark ===
  const toggleDark = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("darkMode", next ? "1" : "0");
  };

  return (
    <div
      style={{
        position: "absolute",
        top: "calc(100% + 10px)",
        right: 0,
        width: 280,
        background: "var(--card)",
        borderRadius: 16,
        boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
        border: "1px solid var(--border)",
        zIndex: 10000,
        overflow: "hidden",
        animation: "dropIn 0.15s ease",
      }}
    >
      {/* Hero header */}
      <div
        style={{
          background: `linear-gradient(135deg, #0f172a, #1e3a8a)`,
          padding: "20px 18px 16px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -20,
            right: -20,
            width: 100,
            height: 100,
            borderRadius: "50%",
            background: `${color}22`,
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            position: "relative",
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              flexShrink: 0,
              overflow: "hidden",
              border: `2.5px solid ${color}`,
              background: `linear-gradient(135deg, ${color}, #4f46e5)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              fontWeight: 800,
              color: "#fff",
            }}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              user.name?.charAt(0)?.toUpperCase()
            )}
          </div>
          <div style={{ minWidth: 0 }}>
            <p
              style={{
                margin: 0,
                fontSize: 14,
                fontWeight: 800,
                color: "#fff",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {user.name}
            </p>
            <p
              style={{
                margin: "2px 0 8px",
                fontSize: 11,
                color: "rgba(255,255,255,0.5)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {user.email}
            </p>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#a78bfa",
                  background: "rgba(124,58,237,0.2)",
                  borderRadius: 20,
                  padding: "2px 9px",
                  border: "0.5px solid rgba(124,58,237,0.3)",
                }}
              >
                {user.role}
              </span>
              {displayBranch && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: "#fff",
                    background: `${color}30`,
                    borderRadius: 20,
                    padding: "2px 9px",
                    border: `0.5px solid ${color}55`,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 3,
                  }}
                >
                  <svg
                    width="8"
                    height="8"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    stroke="none"
                  >
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                  </svg>
                  {displayBranch}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: "6px" }}>
        {/* View Profile */}
        <Link
          to={profilePath}
          onClick={onClose}
          style={{
            width: "100%",
            padding: "9px 12px",
            borderRadius: 9,
            background: "transparent",
            color: "var(--text)",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
            textAlign: "left",
            display: "flex",
            alignItems: "center",
            gap: 10,
            transition: "background 0.12s",
            textDecoration: "none",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg)")}
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
        >
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
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          View Profile
        </Link>

        {/* Dark Mode Toggle */}
        <button
          onClick={toggleDark}
          style={{
            width: "100%",
            padding: "9px 12px",
            border: "none",
            borderRadius: 9,
            background: "transparent",
            color: "var(--text)",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
            textAlign: "left",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            transition: "background 0.12s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg)")}
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
        >
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {darkMode ? (
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
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
              >
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
            {darkMode ? "Light Mode" : "Dark Mode"}
          </span>
          {/* Toggle pill */}
          <div
            style={{
              width: 36,
              height: 20,
              borderRadius: 99,
              background: darkMode ? color : "#e2e8f0",
              position: "relative",
              transition: "background 0.2s",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 2,
                left: darkMode ? 18 : 2,
                width: 16,
                height: 16,
                borderRadius: "50%",
                background: "#fff",
                transition: "left 0.2s",
                boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
              }}
            />
          </div>
        </button>

        {/* Divider */}
        <div
          style={{ height: 1, background: "var(--border)", margin: "4px 0" }}
        />

        {/* Sign Out */}
        <button
          onClick={onLogout}
          style={{
            width: "100%",
            padding: "9px 12px",
            border: "none",
            borderRadius: 9,
            background: "transparent",
            color: "#ef4444",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
            textAlign: "left",
            display: "flex",
            alignItems: "center",
            gap: 10,
            transition: "background 0.12s",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "rgba(239,68,68,0.15)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
        >
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
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Sign Out
        </button>
      </div>
    </div>
  );
};

// Top-level app shell: sidebar navigation, topbar, notification/toast system,
// session-expiry and logout handling, and the routed page content.
export const Layout = ({ children }) => {
  const [showLogout, setShowLogout] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // === FUNCTION: Layout > useEffect (online/offline listener) ===
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const darkModeInitialized = useRef(false);
  if (!darkModeInitialized.current) {
    darkModeInitialized.current = true;
    if (localStorage.getItem("darkMode") === "1") {
      document.documentElement.classList.add("dark");
    }
  }
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutAnimating, setLogoutAnimating] = useState(false);
  const [showNotifDrop, setShowNotifDrop] = useState(false);
  const [showAvatar, setShowAvatar] = useState(false);
  const [activeTab, setActiveTab] = useState("emergency");
  const [selectedAlert, setSelectedAlert] = useState(null);

  // ── Sidebar: hover-to-expand ──
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [sidebarPinned, setSidebarPinned] = useState(false);
  const [showSidebarUser, setShowSidebarUser] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const sidebarHoverTimer = useRef(null);
  const isExpanded = sidebarPinned || mobileSidebarOpen;

  // === FUNCTION: Layout > handleSidebarEnter ===
  const handleSidebarEnter = () => {
    if (sidebarPinned) return;
    if (sidebarHoverTimer.current) clearTimeout(sidebarHoverTimer.current);
    setSidebarExpanded(true);
  };
  // === FUNCTION: Layout > handleSidebarLeave ===
  const handleSidebarLeave = () => {
    if (sidebarPinned) return;
    sidebarHoverTimer.current = setTimeout(() => {
      setSidebarExpanded(false);
      setShowSidebarUser(false);
    }, 200);
  };
  const togglePin = () => {
    setSidebarPinned((p) => !p);
    setSidebarExpanded(false);
  };
  const [easAlerts, setEasAlerts] = useState([]);
  const [msgAlerts, setMsgAlerts] = useState([]);
  const [stockAlerts, setStockAlerts] = useState([]);
  const [easCount, setEasCount] = useState(0);
  const [msgCount, setMsgCount] = useState(0);
  const [stockCount, setStockCount] = useState(0);
  const [custAppts, setCustAppts] = useState([]);
  const [custApptCount, setCustApptCount] = useState(0);
  const [custMsgCount, setCustMsgCount] = useState(0);
  const [custAlerts, setCustAlerts] = useState([]);
  const [custAlertCount, setCustAlertCount] = useState(0);

  // ── Toast state ──
  const [toasts, setToasts] = useState([]);
  const prevEasIds = useRef(new Set());
  const prevMsgIds = useRef(new Set());
  const prevStockIds = useRef(new Set());
  const isFirstLoad = useRef({ eas: true, msg: true, stock: true });
  const prevApprovedIds = useRef(new Set());
  const [approvedModal, setApprovedModal] = useState(null);
  const prevPatientIds = useRef(new Set());
  const prevAppointmentIds = useRef(new Set());
  const prevOccupiedRoomIds = useRef(new Set());
  const isFirstLoadExtra = useRef({
    patient: true,
    appointment: true,
    room: true,
  });
  const prevCustApptIds = useRef(new Set());
  const isFirstLoadCust = useRef(true);
  const prevCustAlertStatus = useRef(new Map());
  const isFirstLoadCustAlert = useRef(true);
  // Plays a short 3-beep tone via the Web Audio API when a new emergency alert arrives.
  // Reuses a single AudioContext instead of creating a new one each time —
  // repeated new contexts start "suspended" (no user gesture) and silently produce no sound.
  const audioCtxRef = useRef(null);
  // Unlocks audio on the very first click/keypress/touch anywhere on the page,
  // so the AudioContext isn't blocked by the browser's autoplay policy when the
  // first emergency alert arrives before the user has interacted with the tab.
  useEffect(() => {
    const unlock = () => {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (
          window.AudioContext || window.webkitAudioContext
        )();
      }
      if (audioCtxRef.current.state === "suspended") {
        audioCtxRef.current.resume();
      }
    };
    window.addEventListener("click", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    window.addEventListener("touchstart", unlock, { once: true });
    return () => {
      window.removeEventListener("click", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
    };
  }, []);
  // === FUNCTION: Layout > playEmergencySound ===
  const playEmergencySound = useCallback(() => {
    try {
      if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
        audioCtxRef.current = new (
          window.AudioContext || window.webkitAudioContext
        )();
      }
      const ctx = audioCtxRef.current;
      const startBeeps = () => {
        // === FUNCTION: Layout > playEmergencySound > beep ===
        const beep = (start, freq) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0.0001, ctx.currentTime + start);
          gain.gain.exponentialRampToValueAtTime(
            0.35,
            ctx.currentTime + start + 0.02,
          );
          gain.gain.exponentialRampToValueAtTime(
            0.0001,
            ctx.currentTime + start + 0.28,
          );
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + start);
          osc.stop(ctx.currentTime + start + 0.3);
        };
        beep(0, 880);
        beep(0.3, 660);
        beep(0.6, 880);
      };
      if (ctx.state === "suspended") {
        ctx.resume().then(startBeeps);
      } else {
        startBeeps();
      }
    } catch (e) {
      console.error("Alert sound error:", e);
    }
  }, []);

  // Adds a new toast to the queue; plays the emergency sound if the toast type is 'emergency'.
  const pushToast = useCallback(
    (type, title, body) => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev, { id, type, title, body }]);
      if (type === "emergency") playEmergencySound();
    },
    [playEmergencySound],
  );

  // Removes a toast from the active list by id (called on manual close or auto-timeout).
  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notifDropRef = useRef(null);
  const avatarDropRef = useRef(null);
  const sidebarUserRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  const user = readUserInfo();
  const [layoutAvatarUrl, setLayoutAvatarUrl] = useState(null);
  const [layoutFirstName, setLayoutFirstName] = useState(null);

  // === FUNCTION: Layout > useEffect (load + subscribe to profile avatar/name changes) ===
  useEffect(() => {
    if (!user.id) return;
    supabase
      .from("profiles")
      .select("avatar_url, first_name, last_name")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.avatar_url) setLayoutAvatarUrl(data.avatar_url);
        if (data?.first_name || data?.last_name)
          setLayoutFirstName(
            `${data.first_name || ""} ${data.last_name || ""}`.trim(),
          );
      });

    const ch = supabase
      .channel("layout-avatar")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new?.avatar_url)
            setLayoutAvatarUrl(payload.new.avatar_url);
          if (payload.new?.first_name || payload.new?.last_name)
            setLayoutFirstName(
              `${payload.new.first_name || ""} ${payload.new.last_name || ""}`.trim(),
            );
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user.id]);

  const isCustomer = roleIsCustomer(user.role);
  const isAdmin = user.role === "Admin" || user.role === "super_admin";
  const isManager = user.role === "Manager";

  // ── KEY FIX: pass branchId (number) to getNavLinks ──
  const navLinks = getNavLinks(user.role, user.branchId);

  const accentColor = BRANCH_COLORS[user.branchId] || "#7C3AED";
  const portalLabel = isCustomer
    ? "Customer Portal"
    : BRANCH_DISPLAY_NAMES[user.branchId]
      ? `${BRANCH_DISPLAY_NAMES[user.branchId]} · Management System`
      : "Management System";
  const avatarLetter = user.name?.charAt(0)?.toUpperCase() || "U";
  const totalUnread = easCount + msgCount + stockCount;

  const SIDEBAR_W = sidebarPinned ? 220 : 62;
  const SIDEBAR_TRANSITION = "width 0.4s cubic-bezier(0.25,0.8,0.25,1)";

  // Polls for newly-approved pending user accounts and pops the "Account Approved" modal.
  const fetchApprovedAccounts = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("pending_users")
        .select("*")
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(10);
      if (data) {
        data.forEach((acc) => {
          if (!prevApprovedIds.current.has(acc.id)) {
            setApprovedModal(acc);
          }
        });
        prevApprovedIds.current = new Set();
      }
    } catch (e) {
      console.error("Approved fetch error:", e);
    }
  }, []);

  // === FUNCTION: Layout > useEffect (staff/admin notification polling + realtime subscriptions) ===
  useEffect(() => {
    if (isCustomer) return;

    // === FUNCTION: fetchEmergencyAlerts ===
    const fetchEmergencyAlerts = async () => {
      try {
        const branchName = BRANCH_DISPLAY_NAMES[user.branchId] || user.branch;
        const easQuery = supabase
          .from("emergency_alerts")
          .select("*")
          .neq("status", "resolved")
          .order("created_at", { ascending: false })
          .limit(50);
        const { data: rawEasData } = await easQuery;
        const data =
          rawEasData && branchName
            ? rawEasData
                .filter(
                  (a) =>
                    normalizeBranchName(a.branch) ===
                    normalizeBranchName(branchName),
                )
                .slice(0, 20)
            : rawEasData;
        if (data) {
          setEasAlerts(data);
          setEasCount(data.length);
          if (!isFirstLoad.current.eas) {
            data.forEach((a) => {
              if (!prevEasIds.current.has(a.id)) {
                pushToast(
                  "emergency",
                  `🚨 ${a.type}`,
                  `${(a.location || a.guest_address)?.slice(0, 80) || "Location not specified"}${a.branch ? ` • ${a.branch}` : ""}`,
                );
              }
            });
          }
          isFirstLoad.current.eas = false;
          prevEasIds.current = new Set(data.map((a) => a.id));
        }
      } catch (e) {
        console.error("EAS fetch error:", e);
      }
    };

    // === FUNCTION: fetchMessages ===
    const fetchMessages = async () => {
      try {
        const branchName = BRANCH_DISPLAY_NAMES[user.branchId] || user.branch;
        let msgQuery = supabase
          .from("messages")
          .select("*, sender:sender_id(first_name, last_name, email)")
          .eq("read", false)
          .order("created_at", { ascending: false })
          .limit(20);
        if (branchName) {
          msgQuery = msgQuery.eq("branch", branchName);
        }
        const { data } = await msgQuery;
        if (data) {
          const enriched = data.map((m) => ({
            ...m,
            sender_name: m.sender
              ? `${m.sender.first_name || ""} ${m.sender.last_name || ""}`.trim()
              : null,
            sender_email: m.sender?.email || null,
          }));
          setMsgAlerts(enriched);
          setMsgCount(data.length);
          if (!isFirstLoad.current.msg) {
            enriched.forEach((m) => {
              if (!prevMsgIds.current.has(m.id)) {
                const sender = m.sender_name || m.sender_email || "Someone";
                pushToast(
                  "message",
                  `New message from ${sender}`,
                  m.content?.slice(0, 80) || m.message?.slice(0, 80) || "",
                );
              }
            });
          }
          isFirstLoad.current.msg = false;
          prevMsgIds.current = new Set(enriched.map((m) => m.id));
        }
      } catch (e) {
        console.error("Messages fetch error:", e);
      }
    };

    // === FUNCTION: fetchNewPatients ===
    const fetchNewPatients = async () => {
      try {
        const { data } = await supabase
          .from("patients")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(20);
        if (data) {
          if (!isFirstLoadExtra.current.patient) {
            data.forEach((p) => {
              if (!prevPatientIds.current.has(p.id)) {
                pushToast(
                  "message",
                  `🐾 New Patient: ${p.name || "Unnamed"}`,
                  `${p.species ? `${p.species} • ` : ""}${p.owner_name ? `Owner: ${p.owner_name}` : ""}`,
                );
              }
            });
          }
          isFirstLoadExtra.current.patient = false;
          prevPatientIds.current = new Set(data.map((p) => p.id));
        }
      } catch (e) {
        console.error("Patients fetch error:", e);
      }
    };

    // === FUNCTION: fetchNewAppointments ===
    const fetchNewAppointments = async () => {
      try {
        const { data } = await supabase
          .from("appointments")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(20);
        if (data) {
          if (!isFirstLoadExtra.current.appointment) {
            data.forEach((a) => {
              if (!prevAppointmentIds.current.has(a.id)) {
                pushToast(
                  "message",
                  `📅 New Appointment`,
                  `${a.patient_name || a.pet_name || "Patient"} • ${a.appointment_date ? new Date(a.appointment_date).toLocaleString("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}`,
                );
              }
            });
          }
          isFirstLoadExtra.current.appointment = false;
          prevAppointmentIds.current = new Set(data.map((a) => a.id));
        }
      } catch (e) {
        console.error("Appointments fetch error:", e);
      }
    };

    // === FUNCTION: fetchOccupiedRooms ===
    const fetchOccupiedRooms = async () => {
      try {
        const { data } = await supabase
          .from("rooms")
          .select("*")
          .eq("status", "occupied")
          .order("updated_at", { ascending: false })
          .limit(20);
        if (data) {
          if (!isFirstLoadExtra.current.room) {
            data.forEach((r) => {
              if (!prevOccupiedRoomIds.current.has(r.id)) {
                pushToast(
                  "stock",
                  `🏠 Room Occupied: ${r.name || r.room_number || "Room"}`,
                  `${r.patient_name ? `Patient: ${r.patient_name}` : ""}${r.branch ? ` • ${r.branch}` : ""}`,
                );
              }
            });
          }
          isFirstLoadExtra.current.room = false;
          prevOccupiedRoomIds.current = new Set(data.map((r) => r.id));
        }
      } catch (e) {
        console.error("Rooms fetch error:", e);
      }
    };

    // === FUNCTION: fetchStockAlerts ===
    const fetchStockAlerts = async () => {
      try {
        const { data } = await supabase
          .from("inventory")
          .select("*")
          .order("qty", { ascending: true })
          .limit(20);
        if (data) {
          const lowItems = data.filter((i) => i.qty <= (i.threshold ?? 10));
          setStockAlerts(lowItems);
          setStockCount(lowItems.length);
          if (!isFirstLoad.current.stock) {
            lowItems.forEach((item) => {
              if (!prevStockIds.current.has(item.id)) {
                pushToast(
                  "stock",
                  `Low Stock: ${item.name}`,
                  `Only ${item.qty} left (reorder at ${item.threshold ?? 10})${item.supplier ? ` • ${item.supplier}` : ""}`,
                );
              }
            });
          }
          isFirstLoad.current.stock = false;
          prevStockIds.current = new Set(lowItems.map((i) => i.id));
        }
      } catch (e) {
        console.error("Stock fetch error:", e);
      }
    };

    fetchEmergencyAlerts();
    fetchMessages();
    fetchStockAlerts();
    fetchNewPatients();
    fetchNewAppointments();
    fetchOccupiedRooms();

    // No branch filter here — branch names contain spaces which the Postgres Changes
    // filter syntax doesn't reliably encode, so filtered subscriptions silently never fire.
    // We fetch every change and let fetchEmergencyAlerts/fetchMessages do the branch
    // matching client-side (already alias-normalized) instead.
    const easSub = supabase
      .channel("eas-layout")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "emergency_alerts",
        },
        () => fetchEmergencyAlerts(),
      )
      .subscribe();
    const msgSub = supabase
      .channel("msg-layout")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
        },
        () => fetchMessages(),
      )
      .subscribe();
    const invSub = supabase
      .channel("inv-layout")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "inventory" },
        () => fetchStockAlerts(),
      )
      .subscribe();
    const patientSub = supabase
      .channel("patient-layout")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "patients" },
        () => fetchNewPatients(),
      )
      .subscribe();
    const apptSub = supabase
      .channel("appt-layout")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "appointments" },
        () => fetchNewAppointments(),
      )
      .subscribe();
    const roomSub = supabase
      .channel("room-layout")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rooms" },
        () => fetchOccupiedRooms(),
      )
      .subscribe();

    const approvedSub = supabase
      .channel("approved-layout")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "pending_users" },
        () => fetchApprovedAccounts(),
      )
      .subscribe();

    fetchApprovedAccounts();

    return () => {
      supabase.removeChannel(easSub);
      supabase.removeChannel(msgSub);
      supabase.removeChannel(invSub);
      supabase.removeChannel(approvedSub);
      supabase.removeChannel(patientSub);
      supabase.removeChannel(apptSub);
      supabase.removeChannel(roomSub);
    };
  }, [isCustomer]);

  /* ── Fetch customer notifications (their own appointments) ── */
  // === FUNCTION: Layout > useEffect (customer's own appointment polling + realtime subscription) ===
  useEffect(() => {
    if (!isCustomer || !user.id) return;

    // === FUNCTION: fetchCustAppts ===
    const fetchCustAppts = async () => {
      try {
        const name = user.name || "";
        const { data } = await supabase
          .from("appointments")
          .select("*")
          .ilike("owner", `%${name}%`)
          .order("created_at", { ascending: false })
          .limit(20);
        if (data) {
          setCustAppts(data);
          setCustApptCount(data.filter((a) => a.status === "Pending").length);
          if (!isFirstLoadCust.current) {
            data.forEach((a) => {
              if (!prevCustApptIds.current.has(a.id)) {
                pushToast(
                  "message",
                  `📅 ${a.status || "Appointment"} Update`,
                  `${a.patient || "Pet"} — ${a.purpose || ""} on ${a.date || ""}`,
                );
              }
            });
          }
          isFirstLoadCust.current = false;
          prevCustApptIds.current = new Set(data.map((a) => a.id));
        }
      } catch (e) {
        console.error("Customer appts fetch error:", e);
      }
    };

    fetchCustAppts();

    const custApptSub = supabase
      .channel(`cust-appt-notif-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments" },
        () => fetchCustAppts(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(custApptSub);
    };
  }, [isCustomer, user.id]);

  /* ── Fetch customer's total unread message count (for the sidebar badge) ── */
  useEffect(() => {
    if (!isCustomer || !user.id) return;

    const fetchCustMsgCount = async () => {
      try {
        const { data } = await supabase
          .from("messages")
          .select("id")
          .eq("receiver_id", user.id)
          .eq("is_read", false);
        setCustMsgCount(data?.length || 0);
      } catch (e) {
        console.error("Customer message count fetch error:", e);
      }
    };

    fetchCustMsgCount();

    const custMsgSub = supabase
      .channel(`cust-msg-badge-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${user.id}`,
        },
        () => fetchCustMsgCount(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(custMsgSub);
    };
  }, [isCustomer, user.id]);

  /* ── Fetch customer's own emergency alerts (for the notification bell) ── */
  useEffect(() => {
    if (!isCustomer || !user.id) return;

    const fetchCustAlerts = async () => {
      try {
        const { data } = await supabase
          .from("emergency_alerts")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20);
        if (data) {
          setCustAlerts(data);
          setCustAlertCount(data.filter((a) => a.status !== "resolved").length);
          if (!isFirstLoadCustAlert.current) {
            data.forEach((a) => {
              const prevStatus = prevCustAlertStatus.current.get(a.id);
              if (prevStatus === undefined) {
                pushToast(
                  "emergency",
                  `🚨 Emergency report received`,
                  `We've logged your ${a.type || "emergency"} report${a.branch ? ` for ${a.branch}` : ""}.`,
                );
              } else if (prevStatus !== a.status && a.status === "responding") {
                pushToast(
                  "emergency",
                  `🚨 Help is on the way!`,
                  `Our team is now responding to your emergency${a.branch ? ` at ${a.branch}` : ""}. Please stay calm and keep your phone line open.`,
                );
              } else if (prevStatus !== a.status && a.status === "resolved") {
                pushToast(
                  "emergency",
                  `✅ Emergency resolved`,
                  `Your ${a.type || "emergency"} report has been marked resolved.`,
                );
              }
            });
          }
          isFirstLoadCustAlert.current = false;
          prevCustAlertStatus.current = new Map(
            data.map((a) => [a.id, a.status]),
          );
        }
      } catch (e) {
        console.error("Customer alerts fetch error:", e);
      }
    };

    fetchCustAlerts();

    const custAlertSub = supabase
      .channel(`cust-alert-notif-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "emergency_alerts" },
        (payload) => {
          const row = payload.new || payload.old;
          if (row?.user_id === user.id) fetchCustAlerts();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(custAlertSub);
    };
  }, [isCustomer, user.id]);

  /* ── Inactivity-based session expiry watcher (1 hour of no activity) ── */
  const INACTIVITY_LIMIT_MS = 60 * 60 * 1000; // 1 hour
  const inactivityTimer = useRef(null);
  const loggingOutRef = useRef(false);

  // === FUNCTION: Layout > useEffect (sync loggingOutRef with loggingOut state) ===
  useEffect(() => {
    loggingOutRef.current = loggingOut;
  }, [loggingOut]);

  // === FUNCTION: Layout > useEffect (inactivity/session-expiry watcher) ===
  useEffect(() => {
    const token = localStorage.getItem("hospital_jwt");
    if (!token) return;

    // === FUNCTION: resetInactivityTimer ===
    const resetInactivityTimer = () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      inactivityTimer.current = setTimeout(() => {
        // Don't show the session-expired modal if the user is in the middle of logging out
        if (!loggingOutRef.current) setSessionExpired(true);
      }, INACTIVITY_LIMIT_MS);
    };

    const activityEvents = [
      "mousedown",
      "mousemove",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ];
    activityEvents.forEach((evt) =>
      window.addEventListener(evt, resetInactivityTimer),
    );

    resetInactivityTimer();

    return () => {
      activityEvents.forEach((evt) =>
        window.removeEventListener(evt, resetInactivityTimer),
      );
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, []);

  // === FUNCTION: Layout > useEffect (catch Supabase-level SIGNED_OUT/TOKEN_REFRESH_FAILED) ===
  // Only treat this as an unexpected session expiry if we're NOT in the middle of
  // a user-initiated logout (handleLogout already clears everything and redirects itself).
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (
        (event === "SIGNED_OUT" || event === "TOKEN_REFRESH_FAILED") &&
        !loggingOutRef.current
      ) {
        setSessionExpired(true);
      }
    });
    return () => sub?.subscription?.unsubscribe();
  }, []);

  /* ── Close mobile sidebar on route change ── */
  // === FUNCTION: Layout > useEffect (close mobile sidebar on route change) ===
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  /* ── Document title ── */
  useEffect(() => {
    document.title =
      totalUnread > 0
        ? `(${totalUnread}) Angeles Animal Pet Care`
        : "Angeles Animal Pet Care";
  }, [totalUnread]);

  /* ── Click outside to close dropdowns ── */
  useEffect(() => {
    const handler = (e) => {
      const target = e.target;
      if (notifDropRef.current && !notifDropRef.current.contains(target))
        setShowNotifDrop(false);
      if (avatarDropRef.current && !avatarDropRef.current.contains(target))
        setShowAvatar(false);
      if (sidebarUserRef.current && !sidebarUserRef.current.contains(target))
        setShowSidebarUser(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Updates an emergency alert's status in Supabase and syncs local state
  // (removes it from the list entirely once resolved).
  const handleUpdateAlertStatus = async (id, newStatus) => {
    try {
      await supabase
        .from("emergency_alerts")
        .update({ status: newStatus })
        .eq("id", id);
      setEasAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a)),
      );
      if (newStatus === "resolved") {
        setEasAlerts((prev) => prev.filter((a) => a.id !== id));
        setEasCount((prev) => Math.max(0, prev - 1));
      }
    } catch (e) {
      console.error("Update alert error:", e);
    }
  };

  // Signs the user out of Supabase, clears all locally-stored session keys,
  // plays the sign-out animation, then redirects to /login.
  const handleLogout = async () => {
    setShowLogout(false);
    setLoggingOut(true);
    setLogoutAnimating(true);
    setSessionExpired(false);
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);

    // Await sign-out so Supabase's own persisted session key is actually cleared
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error("SignOut error:", e);
    }

    // Clear every key the app writes on login
    localStorage.removeItem("hospital_jwt");
    localStorage.removeItem("user_branch");
    localStorage.removeItem("user_role");
    localStorage.removeItem("sb_token");
    localStorage.removeItem("sb_refresh_token");
    localStorage.removeItem("sb_user");
    sessionStorage.clear();

    // Redirect once the sign-out animation has played
    setTimeout(() => {
      window.location.href = "/login";
    }, 1800);
  };

  // Clears session storage and redirects to /login after the inactivity timeout modal is acknowledged.
  const handleSessionExpiredConfirm = () => {
    localStorage.removeItem("hospital_jwt");
    localStorage.removeItem("user_branch");
    localStorage.removeItem("user_role");
    localStorage.removeItem("sb_token");
    localStorage.removeItem("sb_refresh_token");
    localStorage.removeItem("sb_user");
    sessionStorage.clear();
    window.location.href = "/login";
  };

  return (
    <>
      {/* ── Offline Banner ── */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 9999999,
          transform: isOnline ? "translateY(-100%)" : "translateY(0)",
          transition: "transform 0.35s cubic-bezier(0.22,1,0.36,1)",
          pointerEvents: isOnline ? "none" : "all",
          visibility: isOnline ? "hidden" : "visible",
        }}
      >
        <div
          style={{
            background: "linear-gradient(135deg, #1e293b, #0f172a)",
            borderBottom: "2px solid #ef4444",
            padding: "10px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                flexShrink: 0,
                background: "rgba(239,68,68,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#ef4444"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <line x1="1" y1="1" x2="23" y2="23" />
                <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
                <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
                <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
                <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
                <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
                <line x1="12" y1="20" x2="12.01" y2="20" />
              </svg>
            </div>
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  fontWeight: 800,
                  color: "#fff",
                  lineHeight: 1.2,
                }}
              >
                No Internet Connection
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: 11,
                  color: "rgba(255,255,255,0.5)",
                  lineHeight: 1.3,
                }}
              >
                Some features may be unavailable. Check your network and try
                again.
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
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontSize: 10,
                fontWeight: 700,
                color: "#ef4444",
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: 20,
                padding: "3px 10px",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#ef4444",
                  display: "inline-block",
                  animation: "pulse-dot 1.5s infinite",
                }}
              />
              OFFLINE
            </span>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 8,
                padding: "6px 14px",
                color: "#fff",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
                display: "flex",
                alignItems: "center",
                gap: 6,
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(255,255,255,0.15)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "rgba(255,255,255,0.08)")
              }
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
                <path d="M23 4v6h-6" />
                <path d="M1 20v-6h6" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
              Retry
            </button>
          </div>
        </div>
        {/* reconnecting progress hint */}
        <div style={{ height: 2, background: "rgba(239,68,68,0.2)" }}>
          <div
            style={{
              height: "100%",
              background: "#ef4444",
              opacity: 0.6,
              animation: "toastProgress 8s linear infinite",
            }}
          />
        </div>
      </div>

      <ToastContainer toasts={toasts} onClose={removeToast} />

      {/* ── Logout overlay animation ── */}
      {logoutAnimating && (
        <div
          className="logout-overlay"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 999999,
            background: "rgba(15,10,40,0.92)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 20,
            padding: 20,
            boxSizing: "border-box",
          }}
        >
          {/* Logo */}
          <div
            className="logout-logo"
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              overflow: "hidden",
              border: "3px solid rgba(255,255,255,0.15)",
              boxShadow: `0 0 40px ${accentColor}66`,
              animation: "logoutSlideUp 0.4s ease forwards",
              marginBottom: 4,
              flexShrink: 0,
            }}
          >
            <img
              src="/image/446805041_881106557364617_1125518808684788316_n.jpg"
              alt="Logo"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>

          {/* Spinner ring */}
          <div
            className="logout-spinner"
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              border: `3px solid rgba(255,255,255,0.1)`,
              borderTop: `3px solid ${accentColor}`,
              animation: "logoutSpinner 0.8s linear infinite",
              flexShrink: 0,
            }}
          />

          {/* Text */}
          <div
            style={{
              textAlign: "center",
              animation: "logoutSlideUp 0.4s ease 0.1s both",
              maxWidth: "90vw",
            }}
          >
            <p
              className="logout-title"
              style={{
                margin: "0 0 6px",
                fontSize: 17,
                fontWeight: 800,
                color: "#fff",
                letterSpacing: 0.3,
              }}
            >
              Signing out…
            </p>
            <p
              className="logout-subtitle"
              style={{
                margin: 0,
                fontSize: 12,
                color: "rgba(255,255,255,0.45)",
              }}
            >
              Angeles Animal Pet Care
            </p>
          </div>

          {/* Accent bar at bottom */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 3,
              background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
            }}
          />
        </div>
      )}

      <Modal
        show={showLogout}
        title="Sign Out"
        message="Are you sure you want to sign out of Angeles Animal Pet Care?"
        onConfirm={() => {
          setShowLogout(false);
          handleLogout();
        }}
        onCancel={() => setShowLogout(false)}
        confirmText="Sign Out"
        cancelText="Cancel"
        confirmColor="#ef4444"
      />

      <Modal
        show={sessionExpired}
        title="Session Expired"
        message="Your session has expired for security reasons. Please log in again to continue."
        onConfirm={handleSessionExpiredConfirm}
        confirmText="Log In Again"
        confirmColor="#ef4444"
      />

      {selectedAlert && (
        <AlertDetailModal
          alert={selectedAlert}
          onClose={() => setSelectedAlert(null)}
          onUpdateStatus={handleUpdateAlertStatus}
          isAdmin={isAdmin || isManager}
        />
      )}

      <div
        style={{
          display: "flex",
          height: "100dvh",
          overflow: "hidden",
          "--current-sidebar-w": `${SIDEBAR_W}px`,
        }}
      >
        {/* ══════════════════════════════════════
              SIDEBAR
          ══════════════════════════════════════ */}
        {mobileSidebarOpen && (
          <div
            className="mobile-overlay"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}
        <aside
          className={`sidebar-shell${mobileSidebarOpen ? " mobile-open" : ""}`}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: SIDEBAR_W,
            minWidth: SIDEBAR_W,
            background: "var(--sidebar-bg)",
            display: "flex",
            flexDirection: "column",
            alignItems:
              isExpanded || mobileSidebarOpen ? "flex-start" : "center",
            paddingTop: 12,
            paddingBottom: 12,
            position: "fixed",
            top: 0,
            left: 0,
            bottom: 0,
            height: "100dvh",
            zIndex: 100,
            boxShadow: "4px 0 24px rgba(0,0,0,0.18)",
            overflow: "visible",
          }}
        >
          {/* Accent bar — color changes per branch */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 3,
              background: accentColor,
              transition: "background 0.3s",
            }}
          />

          {/* ── Logo row ── */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              width: "100%",
              paddingLeft: isExpanded ? 14 : 0,
              paddingRight: isExpanded ? 10 : 0,
              justifyContent: isExpanded ? "flex-start" : "center",
              marginTop: 8,
              marginBottom: 16,
              transition:
                "padding 0.3s cubic-bezier(0.4,0,0.2,1), justify-content 0.3s",
            }}
          >
            <div
              onClick={togglePin}
              style={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                overflow: "hidden",
                border: "2px solid rgba(255,255,255,0.15)",
                background: "#fff",
              }}
            >
              <img
                src="/image/446805041_881106557364617_1125518808684788316_n.jpg"
                alt="Logo"
                style={{
                  width: 38,
                  height: 38,
                  objectFit: "cover",
                  borderRadius: "50%",
                }}
              />
            </div>

            <div
              className={`sidebar-logo-text ${isExpanded ? "expanded" : "collapsed"}`}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flex: 1,
              }}
            >
              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 11,
                    fontWeight: 800,
                    color: "#fff",
                    lineHeight: 1.3,
                    whiteSpace: "normal",
                    wordBreak: "break-word",
                  }}
                >
                  {user.branchId === 1
                    ? "Angeles Animal Pet Care Hospital"
                    : "Angeles Animal Pet Care Center"}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: 10,
                    color: "rgba(255,255,255,0.45)",
                    lineHeight: 1.3,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: 130,
                  }}
                >
                  {BRANCH_DISPLAY_NAMES[user.branchId] ||
                    user.branch ||
                    "Management"}
                </p>
              </div>
              {/* X button when pinned or open on mobile */}
              {(sidebarPinned || mobileSidebarOpen) && (
                <button
                  className="sidebar-close-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (mobileSidebarOpen) setMobileSidebarOpen(false);
                    else setSidebarPinned(false);
                  }}
                  style={{
                    background: "rgba(255,255,255,0.1)",
                    border: "none",
                    borderRadius: 6,
                    width: 24,
                    height: 24,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    color: "rgba(255,255,255,0.6)",
                    fontSize: 14,
                    lineHeight: 1,
                    flexShrink: 0,
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
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Divider */}
          <div
            style={{
              width: isExpanded ? "calc(100% - 28px)" : 30,
              marginLeft: isExpanded ? 14 : 0,
              height: 1,
              background: "rgba(255,255,255,0.1)",
              marginBottom: 10,
              transition: "width 0.3s, margin-left 0.3s",
            }}
          />

          {/* ── Branch pill ── */}
          <BranchPill
            branchId={user.branchId}
            branchName={user.branch}
            isExpanded={isExpanded}
          />

          {/* ── Nav links ── */}
          <nav
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: isExpanded ? "flex-start" : "center",
              width: "100%",
              paddingLeft: 8,
              paddingRight: 8,
              overflowY: "auto",
              overflowX: "hidden", // ← changed from 'visible' to 'hidden'
              paddingTop: 0,
            }}
          >
            <span
              className={`sidebar-section-label ${isExpanded ? "expanded" : "collapsed"}`}
            >
              Navigation
            </span>

            {navLinks.map((link, idx) => {
              const isActive =
                location.pathname === link.href ||
                location.pathname.startsWith(link.href + "/");
              const isEmergency = link.href
                ?.toLowerCase()
                .includes("emergency");
              const isMessage =
                link.href?.toLowerCase().includes("message") ||
                link.label?.toLowerCase().includes("message");
              const isAI =
                /\bai\b/.test(link.href?.toLowerCase()) ||
                /\bai\b/.test(link.label?.toLowerCase());
              const isBranch =
                link.href?.toLowerCase().includes("branch") ||
                link.label?.toLowerCase().includes("branch");
              const isPredictive = link.href
                ?.toLowerCase()
                .includes("predictive");
              const badge = isEmergency
                ? easCount
                : isMessage
                  ? isCustomer
                    ? custMsgCount
                    : msgCount
                  : 0;

              return (
                <SidebarItem
                  key={link.href}
                  href={link.href}
                  label={link.label}
                  badge={badge}
                  isActive={isActive}
                  isEmergency={isEmergency}
                  isAI={isAI}
                  isBranch={isBranch}
                  isPredictive={isPredictive}
                  isExpanded={isExpanded}
                  index={idx}
                />
              );
            })}
          </nav>

          {/* Divider */}
          <div
            style={{
              width: isExpanded ? "calc(100% - 28px)" : 30,
              marginLeft: isExpanded ? 14 : 0,
              height: 1,
              background: "rgba(255,255,255,0.1)",
              marginBottom: 12,
              transition: "width 0.3s, margin-left 0.3s",
            }}
          />

          {/* ── Bottom: user row ── */}
          <div
            ref={sidebarUserRef}
            style={{ position: "relative", width: "100%" }}
          >
            {/* Sidebar User Dropdown */}
            {showSidebarUser && (
              <div
                style={{
                  position: "absolute",
                  bottom: "calc(100% + 10px)",
                  left: 8,
                  width: 240,
                  background: "#1e293b",
                  borderRadius: 12,
                  boxShadow: "0 -8px 32px rgba(0,0,0,0.4)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  overflow: "hidden",
                  animation: "dropIn 0.15s ease",
                  zIndex: 9999,
                }}
              >
                {/* User info header */}
                <div
                  style={{
                    padding: "14px 14px 10px",
                    borderBottom: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        flexShrink: 0,
                        background: `linear-gradient(135deg, ${accentColor}, #4f46e5)`,
                        overflow: "hidden",
                        border: "2px solid rgba(255,255,255,0.15)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 13,
                        fontWeight: 800,
                        color: "#fff",
                      }}
                    >
                      {layoutAvatarUrl ? (
                        <img
                          src={layoutAvatarUrl}
                          alt="Avatar"
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        avatarLetter
                      )}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 12,
                          fontWeight: 800,
                          color: "#fff",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {layoutFirstName || user.name}
                      </p>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 10,
                          color: "rgba(255,255,255,0.4)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <span
                    style={{
                      marginTop: 8,
                      display: "inline-block",
                      fontSize: 10,
                      fontWeight: 700,
                      color: accentColor,
                      background: `${accentColor}20`,
                      borderRadius: 20,
                      padding: "2px 10px",
                    }}
                  >
                    {user.role}
                  </span>
                </div>

                {/* Menu items */}
                <div style={{ padding: "6px" }}>
                  <Link
                    to={
                      user.role?.toLowerCase() === "customer"
                        ? "/customer/profile"
                        : "/profile"
                    }
                    onClick={() => setShowSidebarUser(false)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 9,
                      padding: "9px 10px",
                      borderRadius: 8,
                      color: "rgba(255,255,255,0.8)",
                      fontSize: 12,
                      fontWeight: 600,
                      textDecoration: "none",
                      transition: "background 0.12s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background =
                        "rgba(255,255,255,0.08)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    View Profile
                  </Link>

                  <button
                    onClick={() => {
                      const next =
                        !document.documentElement.classList.contains("dark");
                      document.documentElement.classList.toggle("dark", next);
                      localStorage.setItem("darkMode", next ? "1" : "0");
                    }}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 9,
                      padding: "9px 10px",
                      borderRadius: 8,
                      border: "none",
                      background: "transparent",
                      color: "rgba(255,255,255,0.8)",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      textAlign: "left",
                      transition: "background 0.12s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background =
                        "rgba(255,255,255,0.08)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <span
                      style={{ display: "flex", alignItems: "center", gap: 9 }}
                    >
                      {document.documentElement.classList.contains("dark") ? (
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        >
                          <circle cx="12" cy="12" r="5" />
                          <line x1="12" y1="1" x2="12" y2="3" />
                          <line x1="12" y1="21" x2="12" y2="23" />
                          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                          <line x1="1" y1="12" x2="3" y2="12" />
                          <line x1="21" y1="12" x2="23" y2="12" />
                          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                        </svg>
                      ) : (
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        >
                          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                        </svg>
                      )}
                      {document.documentElement.classList.contains("dark")
                        ? "Light Mode"
                        : "Dark Mode"}
                    </span>
                    <div
                      style={{
                        width: 36,
                        height: 20,
                        borderRadius: 99,
                        background: document.documentElement.classList.contains(
                          "dark",
                        )
                          ? accentColor
                          : "rgba(255,255,255,0.2)",
                        position: "relative",
                        transition: "background 0.2s",
                        flexShrink: 0,
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          top: 2,
                          left: document.documentElement.classList.contains(
                            "dark",
                          )
                            ? 18
                            : 2,
                          width: 16,
                          height: 16,
                          borderRadius: "50%",
                          background: "#fff",
                          transition: "left 0.2s",
                          boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
                        }}
                      />
                    </div>
                  </button>

                  <div
                    style={{
                      height: 1,
                      background: "rgba(255,255,255,0.08)",
                      margin: "4px 0",
                    }}
                  />

                  <button
                    onClick={() => {
                      setShowSidebarUser(false);
                      setShowLogout(true);
                    }}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 9,
                      padding: "9px 10px",
                      borderRadius: 8,
                      border: "none",
                      background: "transparent",
                      color: "#f87171",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      textAlign: "left",
                      transition: "background 0.12s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background =
                        "rgba(239,68,68,0.15)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    Sign Out
                  </button>
                </div>
              </div>
            )}

            <div
              onClick={() => setShowSidebarUser((v) => !v)}
              style={{
                display: "flex",
                flexDirection: isExpanded ? "row" : "column",
                alignItems: "center",
                gap: 8,
                width: "100%",
                paddingLeft: isExpanded ? 10 : 0,
                paddingRight: isExpanded ? 10 : 0,
                justifyContent: isExpanded ? "flex-start" : "center",
                cursor: "pointer",
                borderRadius: 10,
                padding: "6px 10px",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(255,255,255,0.07)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  flexShrink: 0,
                  background: `linear-gradient(135deg, ${accentColor}, #4f46e5)`,
                  border: "2px solid rgba(255,255,255,0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  fontSize: 13,
                  fontWeight: 800,
                  color: "#fff",
                }}
              >
                {layoutAvatarUrl ? (
                  <img
                    src={layoutAvatarUrl}
                    alt="Avatar"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      borderRadius: "50%",
                    }}
                  />
                ) : (
                  avatarLetter
                )}
              </div>

              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.5)",
                  whiteSpace: "nowrap",
                  opacity: isExpanded ? 1 : 0,
                  maxWidth: isExpanded ? 120 : 0,
                  overflow: "hidden",
                  display: isExpanded ? "block" : "none",
                  transition:
                    "opacity 0.2s, max-width 0.25s cubic-bezier(0.4,0,0.2,1)",
                  transitionDelay: isExpanded ? "0.06s" : "0s",
                }}
              >
                {layoutFirstName || user.name}
              </span>
            </div>
          </div>
        </aside>

        {/* ══════════════════════════════════════
              MAIN AREA
          ══════════════════════════════════════ */}
        <div
          className="main-content-area"
          onClick={() => {
            if (mobileSidebarOpen) setMobileSidebarOpen(false);
            else if (sidebarPinned) setSidebarPinned(false);
          }}
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            minWidth: 0,
            marginLeft: SIDEBAR_W,
            transition: "margin-left 0.4s cubic-bezier(0.25,0.8,0.25,1)",
            minHeight: "100vh",
          }}
        >
          {/* ── TOPBAR ── */}
          <header
            style={{
              height: 68,
              minHeight: 68,
              background: "var(--card)",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              paddingLeft: 20,
              paddingRight: 16,
              gap: 12,
              position: "fixed",
              top: 0,
              left: SIDEBAR_W,
              right: 0,
              zIndex: 99,
              overflow: "visible",
              transition: "left 0.4s cubic-bezier(0.25,0.8,0.25,1)",
            }}
          >
            <div
              style={{
                flex: 1,
                minWidth: 0,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <button
                onClick={() => setMobileSidebarOpen((v) => !v)}
                style={{
                  display: "none",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  border: "1px solid var(--border)",
                  background: "transparent",
                  cursor: "pointer",
                  flexShrink: 0,
                  color: "var(--text)",
                }}
                className="mobile-menu-btn"
                aria-label="Toggle menu"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
              <img
                src="/image/446805041_881106557364617_1125518808684788316_n.jpg"
                alt="APC Logo"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  objectFit: "cover",
                  flexShrink: 0,
                }}
              />
              <div style={{ minWidth: 0 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    fontWeight: 800,
                    color: "var(--text)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {user.branchId === 1
                    ? "Angeles Animal Pet Care Hospital"
                    : "Angeles Animal Pet Care Center"}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: 11,
                    color: "#94a3b8",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {portalLabel}
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
              {/* Bell */}
              <div ref={notifDropRef} style={{ position: "relative" }}>
                <button
                  onClick={() => {
                    setShowNotifDrop((v) => !v);
                    setShowAvatar(false);
                  }}
                  style={{
                    position: "relative",
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: showNotifDrop ? "var(--bg)" : "transparent",
                    border: "1px solid var(--border)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 16,
                    transition: "background 0.15s",
                    fontFamily: "inherit",
                  }}
                  onMouseEnter={(e) =>
                    !showNotifDrop &&
                    (e.currentTarget.style.background = "var(--bg)")
                  }
                  onMouseLeave={(e) =>
                    !showNotifDrop &&
                    (e.currentTarget.style.background = showNotifDrop
                      ? "var(--bg)"
                      : "transparent")
                  }
                  title="Notifications"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                  {(isCustomer ? custApptCount + custAlertCount : totalUnread) >
                    0 && (
                    <span
                      style={{
                        position: "absolute",
                        top: 4,
                        right: 4,
                        background: isCustomer
                          ? custAlertCount > 0
                            ? "#ef4444"
                            : "#2563eb"
                          : easCount > 0
                            ? "#ef4444"
                            : "#2563eb",
                        color: "#fff",
                        borderRadius: "50%",
                        width: 15,
                        height: 15,
                        fontSize: 8,
                        fontWeight: 800,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "2px solid #fff",
                        animation: (
                          isCustomer ? custAlertCount > 0 : easCount > 0
                        )
                          ? "pulse-dot 1.5s infinite"
                          : "none",
                      }}
                    >
                      {(isCustomer
                        ? custApptCount + custAlertCount
                        : totalUnread) > 9
                        ? "9+"
                        : isCustomer
                          ? custApptCount + custAlertCount
                          : totalUnread}
                    </span>
                  )}
                </button>
                {showNotifDrop &&
                  (isCustomer ? (
                    <div
                      className="notif-dropdown"
                      style={{
                        position: "absolute",
                        top: "calc(100% + 10px)",
                        right: 0,
                        width: 320,
                        background: "var(--card)",
                        borderRadius: 14,
                        boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
                        border: "1px solid var(--border)",
                        zIndex: 10000,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          padding: "14px 16px",
                          borderBottom: "1px solid var(--border)",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <h4
                          style={{
                            margin: 0,
                            fontSize: 14,
                            fontWeight: 800,
                            color: "var(--text)",
                          }}
                        >
                          My Appointments
                        </h4>
                        <button
                          onClick={() => setShowNotifDrop(false)}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "#94a3b8",
                            display: "flex",
                          }}
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                          >
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>
                      <div style={{ maxHeight: 440, overflowY: "auto" }}>
                        {/* ── Emergency reports box ── */}
                        <div
                          style={{
                            padding: "10px 14px 4px",
                            background: "#fef2f2",
                            borderBottom: "1px solid #fecaca",
                          }}
                        >
                          <h5
                            style={{
                              margin: 0,
                              fontSize: 11,
                              fontWeight: 800,
                              color: "#991b1b",
                              textTransform: "uppercase",
                              letterSpacing: "0.04em",
                            }}
                          >
                            🚨 My Emergency Reports
                          </h5>
                        </div>
                        {custAlerts.length === 0 ? (
                          <div
                            style={{
                              padding: "16px",
                              textAlign: "center",
                              color: "#94a3b8",
                              borderBottom: "1px solid var(--border)",
                            }}
                          >
                            <p
                              style={{
                                fontSize: 12,
                                fontWeight: 600,
                                margin: 0,
                              }}
                            >
                              No emergency reports yet
                            </p>
                          </div>
                        ) : (
                          custAlerts.map((a) => {
                            const statusColor =
                              a.status === "responding"
                                ? "#1d4ed8"
                                : a.status === "resolved"
                                  ? "#16a34a"
                                  : "#d97706";
                            const statusBg =
                              a.status === "responding"
                                ? "#dbeafe"
                                : a.status === "resolved"
                                  ? "#dcfce7"
                                  : "#fef3c7";
                            return (
                              <div
                                key={a.id}
                                style={{
                                  padding: "12px 14px",
                                  borderBottom: "1px solid #f1f5f9",
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    marginBottom: 4,
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize: 12,
                                      fontWeight: 700,
                                      color: "#1e293b",
                                    }}
                                  >
                                    {a.type || "Emergency"}
                                  </span>
                                  <span
                                    style={{
                                      fontSize: 9,
                                      fontWeight: 800,
                                      color: statusColor,
                                      background: statusBg,
                                      borderRadius: 6,
                                      padding: "2px 7px",
                                      textTransform: "capitalize",
                                    }}
                                  >
                                    {a.status}
                                  </span>
                                </div>
                                <p
                                  style={{
                                    fontSize: 11,
                                    color: "#64748b",
                                    margin: 0,
                                  }}
                                >
                                  {a.branch || ""}
                                  {a.branch && a.description ? " • " : ""}
                                  {a.description
                                    ? a.description.slice(0, 60)
                                    : ""}
                                </p>
                              </div>
                            );
                          })
                        )}

                        {/* ── Appointments box ── */}
                        <div
                          style={{
                            padding: "10px 14px 4px",
                            background: "var(--bg)",
                            borderBottom: "1px solid var(--border)",
                          }}
                        >
                          <h5
                            style={{
                              margin: 0,
                              fontSize: 11,
                              fontWeight: 800,
                              color: "#64748b",
                              textTransform: "uppercase",
                              letterSpacing: "0.04em",
                            }}
                          >
                            My Appointments
                          </h5>
                        </div>
                        {custAppts.length === 0 ? (
                          <div
                            style={{
                              padding: "32px 16px",
                              textAlign: "center",
                              color: "#94a3b8",
                            }}
                          >
                            <p
                              style={{
                                fontSize: 13,
                                fontWeight: 600,
                                margin: 0,
                              }}
                            >
                              No appointments yet
                            </p>
                          </div>
                        ) : (
                          custAppts.map((a) => (
                            <div
                              key={a.id}
                              style={{
                                padding: "12px 14px",
                                borderBottom: "1px solid #f1f5f9",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  marginBottom: 4,
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: 12,
                                    fontWeight: 700,
                                    color: "#1e293b",
                                  }}
                                >
                                  {a.patient} — {a.purpose}
                                </span>
                                <span
                                  className={`badge ${a.status === "Confirmed" ? "badge-green" : "badge-yellow"}`}
                                  style={{ fontSize: 9 }}
                                >
                                  {a.status}
                                </span>
                              </div>
                              <p
                                style={{
                                  fontSize: 11,
                                  color: "#64748b",
                                  margin: 0,
                                }}
                              >
                                {a.date} • {a.vet}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ) : (
                    <NotifDropdown
                      activeTab={activeTab}
                      setActiveTab={setActiveTab}
                      easAlerts={easAlerts}
                      msgAlerts={msgAlerts}
                      stockAlerts={stockAlerts}
                      easCount={easCount}
                      msgCount={msgCount}
                      stockCount={stockCount}
                      onAlertClick={setSelectedAlert}
                      onClose={() => setShowNotifDrop(false)}
                    />
                  ))}
              </div>

              {/* Avatar dropdown */}
              <div ref={avatarDropRef} style={{ position: "relative" }}>
                <button
                  onClick={() => {
                    setShowAvatar((v) => !v);
                    setShowNotifDrop(false);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "5px 10px 5px 5px",
                    borderRadius: 10,
                    border: "1px solid var(--border)",
                    background: showAvatar ? "var(--bg)" : "transparent",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) =>
                    !showAvatar &&
                    (e.currentTarget.style.background = "var(--bg)")
                  }
                  onMouseLeave={(e) =>
                    !showAvatar &&
                    (e.currentTarget.style.background = showAvatar
                      ? "var(--bg)"
                      : "transparent")
                  }
                >
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: "50%",
                      background: `linear-gradient(135deg, ${accentColor}, #4f46e5)`,
                      color: "#fff",
                      fontSize: 11,
                      fontWeight: 800,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      overflow: "hidden",
                    }}
                  >
                    {layoutAvatarUrl ? (
                      <img
                        src={layoutAvatarUrl}
                        alt="Avatar"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      avatarLetter
                    )}
                  </div>
                  <div style={{ textAlign: "left" }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 12,
                        fontWeight: 700,
                        color: "var(--text)",
                        lineHeight: 1.2,
                      }}
                    >
                      {layoutFirstName ? `${layoutFirstName}` : user.name}
                    </p>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 10,
                        color: "#94a3b8",
                        lineHeight: 1.2,
                      }}
                    >
                      {user.role}
                    </p>
                  </div>
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#94a3b8"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    style={{ marginLeft: 2 }}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                {showAvatar && (
                  <AvatarDropdown
                    user={{ ...user, name: layoutFirstName || user.name }}
                    avatarUrl={layoutAvatarUrl}
                    onLogout={() => {
                      setShowAvatar(false);
                      setShowLogout(true);
                    }}
                    onClose={() => setShowAvatar(false)}
                  />
                )}
              </div>
            </div>
          </header>

          {/* ── PAGE CONTENT ── */}
          <main
            style={{
              flex: 1,
              overflowY: "auto",
              overflowX: "hidden",
              padding: "0 24px 24px",
              background: "var(--bg)",
              minHeight: 0,
              marginTop: 68,
            }}
          >
            {children}
          </main>
        </div>
      </div>
      {approvedModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99999,
            padding: 16,
          }}
        >
          <div
            style={{
              background: "var(--card)",
              borderRadius: 16,
              padding: 32,
              maxWidth: 420,
              width: "100%",
              textAlign: "center",
              boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
            <h3
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: "#1e293b",
                margin: "0 0 8px",
              }}
            >
              Account Approved!
            </h3>
            <p style={{ fontSize: 14, color: "#64748b", margin: "0 0 20px" }}>
              The Admin has approved the account request.
            </p>
            <div
              style={{
                background: "var(--bg)",
                borderRadius: 10,
                padding: "16px",
                marginBottom: 24,
                textAlign: "left",
              }}
            >
              <p
                style={{
                  margin: "0 0 6px",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#1e293b",
                }}
              >
                {[approvedModal.first_name, approvedModal.last_name]
                  .filter(Boolean)
                  .join(" ")}
              </p>
              <p style={{ margin: "0 0 4px", fontSize: 12, color: "#64748b" }}>
                📧 {approvedModal.email}
              </p>
              <p style={{ margin: "0 0 4px", fontSize: 12, color: "#64748b" }}>
                🔑 Password:{" "}
                <code
                  style={{
                    background: "#e2e8f0",
                    padding: "1px 6px",
                    borderRadius: 4,
                    fontWeight: 700,
                  }}
                >
                  {approvedModal.password_hint}
                </code>
              </p>
              <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
                👤 Role: {approvedModal.role}
              </p>
            </div>
            <button
              onClick={() => setApprovedModal(null)}
              style={{
                background: "#16a34a",
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
              Got it!
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Layout;
