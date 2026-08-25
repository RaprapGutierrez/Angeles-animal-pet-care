// RoomAvailability.jsx
import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import Layout from "../../components/layout";
import { supabase, supabaseAdmin } from "../../js/Utils/supabase";
import { useCurrentUser } from "../../js/hooks/Usecurrentuser";
import { logActivity } from "../../js/Utils/logActivity";
import "../../styles/RoomAvailability.css";

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
const Skel = ({ w = "100%", h = 16 }) => (
  <span className="skel" style={{ width: w, height: h }} />
);

const statusKey = (s) => (s || "available").toLowerCase().replace(/\s+/g, "");
const sanitizeName = (v) => v.replace(/[^a-zA-Z\s'-]/g, "");

const STATUS_LABEL = {
  Available: "Available",
  Occupied: "Occupied",
  Quarantine: "Quarantine",
  Cleaning: "Cleaning",
};
const STATUS_COLOR = {
  Available: "#16a34a",
  Occupied: "#1e3a8a",
  Quarantine: "#dc2626",
  Cleaning: "#d97706",
};

const StatusPill = ({ status }) => (
  <span className={`status-pill ${statusKey(status)}`}>
    <span className={`status-dot ${statusKey(status)}`} />
    {status}
  </span>
);

/* ─── Room Card ───────────────────────────────────────────────────────────── */
const RoomCard = ({ room, onView }) => {
  const sk = room.infected ? "quarantine" : statusKey(room.status);
  const isOccupied = room.status !== "Available";
  return (
    <div className={`room-card ${sk}`} onClick={() => onView(room)}>
      <div className={`room-status-bar ${sk}`} />
      <div style={{ padding: "14px 16px 12px" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: "var(--text)",
                lineHeight: 1,
              }}
            >
              {room.number}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--muted)",
                marginTop: 2,
                fontWeight: 600,
              }}
            >
              {room.type || "General"}
              {room.infected ? (
                <>
                  {" "}
                  ·{" "}
                  <svg
                    style={{ display: "inline", verticalAlign: "middle" }}
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="#dc2626"
                  >
                    <circle cx="12" cy="12" r="10" />
                  </svg>{" "}
                  Isolation
                </>
              ) : (
                ""
              )}
            </div>
          </div>
          <StatusPill status={room.status} />
        </div>

        {/* Patient info */}
        {isOccupied && room.patient ? (
          <div
            style={{
              background: "var(--bg)",
              borderRadius: 8,
              padding: "8px 10px",
              marginBottom: 8,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                marginBottom: 4,
              }}
            >
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  background: STATUS_COLOR[room.status] + "22",
                  border: `1.5px solid ${STATUS_COLOR[room.status]}44`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  fontSize: 11,
                  fontWeight: 800,
                  color: STATUS_COLOR[room.status],
                }}
              >
                {(room.patient || "?").charAt(0).toUpperCase()}
              </div>
              <div
                style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}
              >
                {room.patient}
              </div>
            </div>
            {room.discharge_date && (
              <div
                style={{
                  fontSize: 10,
                  color: "var(--muted)",
                  marginTop: 4,
                  fontWeight: 600,
                }}
              >
                Discharge: {new Date(room.discharge_date).toLocaleDateString()}
              </div>
            )}
          </div>
        ) : isOccupied ? (
          <div
            style={{
              background: "#fef2f2",
              borderRadius: 8,
              padding: "8px 10px",
              marginBottom: 8,
            }}
          >
            <span
              style={{
                fontSize: 12,
                color: "#dc2626",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#dc2626"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              No patient assigned
            </span>
          </div>
        ) : (
          <div style={{ padding: "8px 0", marginBottom: 8 }}>
            <span
              style={{
                fontSize: 12,
                color: "#86efac",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#86efac"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Ready for admission
            </span>
          </div>
        )}

        {/* Footer hint */}
        <div
          style={{
            fontSize: 10,
            color: "var(--muted)",
            fontWeight: 600,
            letterSpacing: "0.3px",
            textAlign: "right",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 3,
          }}
        >
          Click to manage
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </div>
      </div>
    </div>
  );
};

/* ─── Skeleton Cards ──────────────────────────────────────────────────────── */
const CardSkel = () => (
  <div
    style={{
      background: "var(--card)",
      borderRadius: 16,
      border: "1.5px solid var(--border)",
      overflow: "hidden",
    }}
  >
    <div style={{ height: 5, background: "var(--border)" }} />
    <div style={{ padding: "14px 16px 12px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <div>
          <Skel w={60} h={20} />
          <div style={{ marginTop: 6 }}>
            <Skel w={80} h={11} />
          </div>
        </div>
        <Skel w={80} h={22} />
      </div>
      <div
        style={{
          background: "#f8fafc",
          borderRadius: 8,
          padding: "8px 10px",
          marginBottom: 8,
        }}
      >
        <Skel w="70%" h={13} />
        <div style={{ marginTop: 6 }}>
          <Skel w="50%" h={11} />
        </div>
      </div>
    </div>
  </div>
);

const StatCardSkeleton = () => (
  <div
    style={{
      background: "#fff",
      border: "1.5px solid var(--border)",
      borderRadius: 16,
      padding: 20,
      display: "flex",
      flexDirection: "column",
      gap: 14,
      pointerEvents: "none",
    }}
  >
    <div className="skel" style={{ width: 46, height: 46, borderRadius: 12 }} />
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <Skel w="45%" h={11} />
      <Skel w="30%" h={26} />
      <Skel w="60%" h={10} />
    </div>
  </div>
);

/* ─── View Modal ──────────────────────────────────────────────────────────── */
const ViewModal = ({ room, onClose, onEdit, onDelete }) => {
  if (!room) return null;
  const sk = statusKey(room.status);
  const color = STATUS_COLOR[room.status] || "#64748b";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.52)",
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
          borderRadius: 16,
          width: "100%",
          maxWidth: 460,
          boxShadow: "0 24px 64px rgba(0,0,0,0.28)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Top color bar */}
        <div
          style={{
            height: 6,
            background: `linear-gradient(90deg,${color},${color}99)`,
          }}
        />

        {/* Header */}
        <div
          style={{
            padding: "18px 22px 14px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 50,
                height: 50,
                borderRadius: 14,
                background: color + "18",
                border: `2px solid ${color}44`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                flexShrink: 0,
              }}
            >
              {room.infected ? (
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#dc2626"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              ) : room.status === "Available" ? (
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#16a34a"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : room.status === "Occupied" ? (
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#1e3a8a"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              ) : room.status === "Quarantine" ? (
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
              ) : (
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#d97706"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              )}
            </div>
            <div>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: "var(--text)",
                  lineHeight: 1,
                }}
              >
                Room {room.number}
              </div>
              <div
                style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}
              >
                {room.type || "General Ward"}
                {room.infected ? " · Isolation" : ""}
              </div>
              <div style={{ marginTop: 6 }}>
                <StatusPill status={room.status} />
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: 18,
              cursor: "pointer",
              color: "var(--muted)",
              lineHeight: 1,
              padding: "2px 4px",
            }}
          >
            ✕
          </button>
        </div>

        {/* Fields */}
        <div style={{ flex: 1 }}>
          {[
            { label: "Room Number", value: room.number },
            { label: "Type", value: room.type || "General" },
            { label: "Status", value: <StatusPill status={room.status} /> },
            {
              label: "Isolation",
              value: room.infected ? "Yes — Isolation / Infected" : "No",
            },
            {
              label: "Patient",
              value: room.patient || "— No patient assigned —",
            },
            {
              label: "Discharge Date",
              value: room.discharge_date
                ? new Date(room.discharge_date).toLocaleDateString()
                : "— Not set —",
            },
          ].map(({ label, value }) => (
            <div key={label} className="view-field-row">
              <div className="view-field-label">{label}</div>
              <div className="view-field-value">{value}</div>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div
          style={{
            padding: "14px 22px",
            borderTop: "1px solid var(--border)",
            display: "flex",
            gap: 8,
          }}
        >
          <button
            className="room-action-btn"
            style={{ background: "#eff6ff", color: "#1e40af" }}
            onClick={onEdit}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>{" "}
            Edit Room
          </button>
          <button
            className="room-action-btn"
            style={{ background: "#fef2f2", color: "#dc2626" }}
            onClick={onDelete}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6" />
              <path d="M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>{" "}
            Delete
          </button>
          <button
            className="room-action-btn"
            style={{ background: "#f1f5f9", color: "#475569" }}
            onClick={onClose}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>{" "}
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Custom Select ──────────────────────────────────────────────────────── */
const CustomSelect = ({
  value,
  onChange,
  options,
  placeholder = "—",
  accent = "#6366f1",
}) => {
  const [open, setOpen] = React.useState(false);
  const [dropPos, setDropPos] = React.useState({ top: 0, left: 0, width: 0 });
  const triggerRef = React.useRef(null);
  const ref = React.useRef(null);
  const selected = options.find((o) => (o.value ?? o) === value);
  const label = selected ? (selected.label ?? selected) : placeholder;

  React.useEffect(() => {
    const handler = (e) => {
      if (
        ref.current &&
        !ref.current.contains(e.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target)
      )
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleOpen = () => {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const dropHeight = Math.min((options.length + 1) * 38, 260);
      const showAbove = spaceBelow < dropHeight + 10;
      setDropPos({
        top: showAbove
          ? rect.top + window.scrollY - dropHeight - 6
          : rect.bottom + window.scrollY + 6,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
    setOpen((o) => !o);
  };

  const portal =
    open && typeof document !== "undefined"
      ? ReactDOM.createPortal(
          <div
            ref={ref}
            style={{
              position: "absolute",
              top: dropPos.top,
              left: dropPos.left,
              width: dropPos.width,
              background: "var(--card)",
              borderRadius: 12,
              zIndex: 99999,
              boxShadow:
                "0 16px 40px rgba(0,0,0,0.13), 0 4px 12px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.06)",
              border: "1.5px solid #e8edf4",
              maxHeight: 260,
              overflowY: "auto",
              padding: "5px",
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
                  onClick={() => {
                    onChange(optVal);
                    setOpen(false);
                  }}
                  style={{
                    padding: "8px 10px",
                    fontSize: 13,
                    fontWeight: isSelected ? 700 : 500,
                    color: isEmpty
                      ? "#b0bac9"
                      : isSelected
                        ? accent
                        : "var(--text)",
                    cursor: isEmpty ? "default" : "pointer",
                    transition: "background 0.12s, color 0.12s",
                    background: isSelected ? `${accent}12` : "transparent",
                    borderRadius: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    marginBottom: 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected && !isEmpty)
                      e.currentTarget.style.background = "#f4f6fa";
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected)
                      e.currentTarget.style.background = isSelected
                        ? `${accent}12`
                        : "transparent";
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      minWidth: 0,
                    }}
                  >
                    {!isEmpty && (
                      <div
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          flexShrink: 0,
                          background: isSelected ? accent : "transparent",
                          border: `1.5px solid ${isSelected ? accent : "#cbd5e1"}`,
                          transition: "background 0.15s, border-color 0.15s",
                        }}
                      />
                    )}
                    <span
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {optLabel}
                    </span>
                  </div>
                  {isSelected && !isEmpty && (
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 5,
                        background: accent,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <svg
                        width="9"
                        height="9"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#fff"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  )}
                </div>
              );
            })}
          </div>,
          document.body,
        )
      : null;

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <div
        ref={triggerRef}
        onClick={handleOpen}
        style={{
          width: "100%",
          padding: "8px 34px 8px 12px",
          border: "1.5px solid",
          borderRadius: 9,
          background: open
            ? "linear-gradient(135deg,#ffffff,#f5f3ff)"
            : "linear-gradient(to bottom,#ffffff,#f8fafc)",
          fontSize: 13,
          fontWeight: 600,
          color: value ? "var(--text)" : "#b0bac9",
          cursor: "pointer",
          userSelect: "none",
          boxSizing: "border-box",
          boxShadow: open
            ? `0 0 0 3px ${accent}22, 0 2px 8px rgba(0,0,0,0.08)`
            : "0 1px 3px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)",
          borderColor: open ? accent : "#dde3ec",
          transition: "border-color 0.18s, box-shadow 0.18s, background 0.18s",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          position: "relative",
          minHeight: 36,
        }}
        onMouseEnter={(e) => {
          if (!open) {
            e.currentTarget.style.borderColor = "#a5b4fc";
            e.currentTarget.style.boxShadow =
              "0 2px 8px rgba(99,102,241,0.10), inset 0 1px 0 rgba(255,255,255,0.9)";
          }
        }}
        onMouseLeave={(e) => {
          if (!open) {
            e.currentTarget.style.borderColor = "#dde3ec";
            e.currentTarget.style.boxShadow =
              "0 1px 3px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)";
          }
        }}
      >
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
          }}
        >
          {label}
        </span>
        <div
          style={{
            position: "absolute",
            right: 10,
            top: "50%",
            transform: "translateY(-50%)",
            width: 20,
            height: 20,
            borderRadius: 6,
            background: open ? accent : "#f1f5f9",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 0.18s",
            flexShrink: 0,
          }}
        >
          <svg
            width="9"
            height="9"
            viewBox="0 0 24 24"
            fill="none"
            stroke={open ? "#fff" : "#94a3b8"}
            strokeWidth="3"
            strokeLinecap="round"
            style={{
              transition: "transform 0.2s, stroke 0.18s",
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
            }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>
      {portal}
    </div>
  );
};

/* ─── Add / Edit Modal (PatientRecord style) ─────────────────────────────── */
const RoomFormModal = ({
  editRoom,
  form,
  setForm,
  onSave,
  onClose,
  saving,
  existingNumbers = [],
  validateRoom,
  unassignedPatients = [],
}) => {
  const isEdit = !!editRoom;
  const isFormValid = () => validateRoom(form, isEdit, existingNumbers).valid;
  const fieldStyle = {
    width: "100%",
    border: "none",
    borderBottom: "1.5px solid #cbd5e1",
    background: "transparent",
    fontSize: 13,
    fontWeight: 600,
    color: "var(--text)",
    outline: "none",
    padding: "2px 0",
    fontFamily: "inherit",
    boxSizing: "border-box",
  };
  const selectStyle = { ...fieldStyle };

  const DatePicker = ({ value, onChange, placeholder = "Pick a date" }) => {
    const [open, setOpen] = React.useState(false);
    const [viewDate, setViewDate] = React.useState(() =>
      value ? new Date(value + "T00:00:00") : new Date(),
    );
    const triggerRef = React.useRef(null);
    const popRef = React.useRef(null);
    React.useEffect(() => {
      if (value) setViewDate(new Date(value + "T00:00:00"));
    }, [value]);
    React.useEffect(() => {
      const handler = (e) => {
        if (
          popRef.current &&
          !popRef.current.contains(e.target) &&
          triggerRef.current &&
          !triggerRef.current.contains(e.target)
        )
          setOpen(false);
      };
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }, []);
    const [popPos, setPopPos] = React.useState({ top: 0, left: 0, width: 280 });
    const handleOpen = () => {
      if (!open && triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        setPopPos({
          top:
            spaceBelow > 320
              ? rect.bottom + window.scrollY + 6
              : rect.top + window.scrollY - 316,
          left: rect.left + window.scrollX,
          width: Math.max(rect.width, 280),
        });
      }
      setOpen((o) => !o);
    };
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [
      ...Array(firstDay).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];
    const MONTHS = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    const todayStr = new Date().toISOString().split("T")[0];
    const selectDay = (day) => {
      const str = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      onChange(str);
      setOpen(false);
    };
    const displayValue = value
      ? new Date(value + "T00:00:00").toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : placeholder;
    const portal =
      open && typeof document !== "undefined"
        ? ReactDOM.createPortal(
            <div
              ref={popRef}
              style={{
                position: "absolute",
                top: popPos.top,
                left: popPos.left,
                width: popPos.width,
                zIndex: 99999,
                background: "var(--card)",
                border: "1.5px solid #e8edf4",
                borderRadius: 14,
                boxShadow:
                  "0 16px 48px rgba(0,0,0,0.16),0 4px 12px rgba(0,0,0,0.08)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  background: "linear-gradient(135deg,#0f172a,#1e3a8a)",
                  padding: "14px 16px 12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <button
                  onClick={() => setViewDate(new Date(year, month - 1, 1))}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    border: "1px solid rgba(255,255,255,0.2)",
                    background: "rgba(255,255,255,0.1)",
                    cursor: "pointer",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>
                    {MONTHS[month]}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "rgba(255,255,255,0.6)",
                      fontWeight: 600,
                    }}
                  >
                    {year}
                  </div>
                </div>
                <button
                  onClick={() => setViewDate(new Date(year, month + 1, 1))}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    border: "1px solid rgba(255,255,255,0.2)",
                    background: "rgba(255,255,255,0.1)",
                    cursor: "pointer",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(7,1fr)",
                  padding: "10px 12px 4px",
                  gap: 2,
                }}
              >
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d, i) => (
                  <div
                    key={d}
                    style={{
                      textAlign: "center",
                      fontSize: 10,
                      fontWeight: 800,
                      color:
                        i === 0 ? "#ef4444" : i === 6 ? "#3b82f6" : "#94a3b8",
                      padding: "3px 0",
                      textTransform: "uppercase",
                    }}
                  >
                    {d}
                  </div>
                ))}
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(7,1fr)",
                  padding: "2px 12px 12px",
                  gap: 2,
                }}
              >
                {cells.map((day, i) => {
                  if (!day) return <div key={i} />;
                  const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const isSelected = dateStr === value;
                  const isToday = dateStr === todayStr;
                  const isSun = i % 7 === 0;
                  const isSat = i % 7 === 6;
                  return (
                    <div
                      key={i}
                      onClick={() => selectDay(day)}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        fontWeight: isSelected ? 800 : isToday ? 700 : 500,
                        cursor: "pointer",
                        background: isSelected
                          ? "linear-gradient(135deg,#1e3a8a,#3b82f6)"
                          : isToday
                            ? "#eff6ff"
                            : "transparent",
                        color: isSelected
                          ? "#fff"
                          : isToday
                            ? "#1e40af"
                            : isSun
                              ? "#ef4444"
                              : isSat
                                ? "#3b82f6"
                                : "var(--text)",
                        border:
                          isToday && !isSelected
                            ? "1.5px solid #bfdbfe"
                            : "none",
                        boxShadow: isSelected
                          ? "0 2px 8px rgba(30,58,138,0.35)"
                          : "none",
                        margin: "auto",
                        transition: "background 0.12s",
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected)
                          e.currentTarget.style.background = "#f1f5f9";
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected)
                          e.currentTarget.style.background = isToday
                            ? "#eff6ff"
                            : "transparent";
                      }}
                    >
                      {day}
                    </div>
                  );
                })}
              </div>
              <div
                style={{
                  padding: "8px 12px 10px",
                  borderTop: "1px solid #f1f5f9",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <button
                  onClick={() => {
                    onChange("");
                    setOpen(false);
                  }}
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#64748b",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    padding: "4px 8px",
                    borderRadius: 6,
                  }}
                >
                  Clear
                </button>
                <button
                  onClick={() => {
                    selectDay(new Date().getDate());
                    setViewDate(new Date());
                  }}
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#1e40af",
                    background: "#eff6ff",
                    border: "1px solid #bfdbfe",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    padding: "4px 10px",
                    borderRadius: 6,
                  }}
                >
                  Today
                </button>
              </div>
            </div>,
            document.body,
          )
        : null;
    return (
      <div style={{ position: "relative" }}>
        <div
          ref={triggerRef}
          onClick={handleOpen}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
            border: "1.5px solid",
            borderColor: open ? "#6366f1" : "#dde3ec",
            borderRadius: 9,
            background: open
              ? "linear-gradient(135deg,#ffffff,#f5f3ff)"
              : "linear-gradient(to bottom,#ffffff,#f8fafc)",
            cursor: "pointer",
            userSelect: "none",
            boxShadow: open
              ? "0 0 0 3px rgba(99,102,241,0.12),0 2px 8px rgba(0,0,0,0.08)"
              : "0 1px 3px rgba(0,0,0,0.06),inset 0 1px 0 rgba(255,255,255,0.9)",
            transition: "all 0.18s",
          }}
        >
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: 6,
              background: open ? "#6366f1" : "#f1f5f9",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              transition: "background 0.18s",
            }}
          >
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke={open ? "#fff" : "#94a3b8"}
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: value ? "var(--text)" : "#b0bac9",
              flex: 1,
              whiteSpace: "nowrap",
            }}
          >
            {displayValue}
          </span>
          {value && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              style={{
                width: 16,
                height: 16,
                borderRadius: "50%",
                background: "#e2e8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <svg
                width="8"
                height="8"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#64748b"
                strokeWidth="3"
                strokeLinecap="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </div>
          )}
        </div>
        {portal}
      </div>
    );
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.52)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 16,
        overflowY: "auto",
      }}
    >
      <div
        style={{
          background: "var(--card)",
          borderRadius: 14,
          width: "100%",
          maxWidth: 580,
          maxHeight: "calc(100vh - 32px)",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 24px 64px rgba(0,0,0,0.28)",
          overflow: "hidden",
          margin: "auto",
        }}
      >
        {/* ── Clipboard top bar ── */}
        <div
          style={{
            background: "linear-gradient(135deg, #0f172a, #1e3a8a)",
            padding: "10px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            borderRadius: "14px 14px 0 0",
            flexShrink: 0,
          }}
        >
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: 18,
              cursor: "pointer",
              color: "rgba(255,255,255,0.75)",
              lineHeight: 1,
              padding: "2px 6px",
            }}
          >
            ✕
          </button>
        </div>

        {/* ── Record header ── */}
        <div
          style={{
            background: "var(--bg)",
            borderBottom: "2px solid var(--border)",
            padding: "14px 24px 12px",
            textAlign: "center",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              marginBottom: 4,
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#1e40af"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <h3
              style={{
                margin: 0,
                fontSize: 15,
                fontWeight: 800,
                color: "var(--text)",
                letterSpacing: "0.3px",
              }}
            >
              {isEdit ? `Update Room ${editRoom.number}` : "New Room Record"}
            </h3>
          </div>
          <p style={{ margin: 0, fontSize: 11, color: "var(--muted)" }}>
            {isEdit
              ? "Edit room details and current occupancy status"
              : "Register a new room or ward to the system"}
          </p>
        </div>

        {/* ── Body ── */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          {/* Section 1: Room Identity */}
          <div style={{ borderBottom: "1.5px solid #e2e8f0" }}>
            <div
              style={{
                background: "var(--bg)",
                borderBottom: "1px solid var(--border)",
                padding: "6px 16px",
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                  color: "var(--muted)",
                }}
              >
                Room Identity
              </span>
            </div>

            {/* Row: Number · Type */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isEdit ? "1fr" : "1fr 1fr",
                borderBottom: "1px solid #e2e8f0",
              }}
            >
              {!isEdit && (
                <div
                  style={{
                    padding: "10px 16px",
                    borderRight: "1px solid #e2e8f0",
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: "#94a3b8",
                      textTransform: "uppercase",
                      letterSpacing: "0.8px",
                      marginBottom: 6,
                    }}
                  >
                    Room Number <span style={{ color: "#ef4444" }}>*</span>
                  </div>
                  <input
                    type="text"
                    value={form.number || ""}
                    onChange={(e) =>
                      setForm({ ...form, number: e.target.value })
                    }
                    placeholder="e.g. 101"
                    style={fieldStyle}
                  />
                </div>
              )}
              <div style={{ padding: "10px 16px" }}>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: "#94a3b8",
                    textTransform: "uppercase",
                    letterSpacing: "0.8px",
                    marginBottom: 6,
                  }}
                >
                  Ward Type
                </div>
                <CustomSelect
                  value={form.type}
                  onChange={(val) => setForm({ ...form, type: val })}
                  placeholder="Select type"
                  options={["General", "Isolation", "ICU", "Recovery"]}
                />
              </div>
            </div>

            {/* Row: Status · Isolation */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
              <div
                style={{
                  padding: "10px 16px",
                  borderRight: "1px solid #e2e8f0",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: "#94a3b8",
                    textTransform: "uppercase",
                    letterSpacing: "0.8px",
                    marginBottom: 6,
                  }}
                >
                  Status
                </div>
                <CustomSelect
                  value={form.status}
                  onChange={(val) => setForm({ ...form, status: val })}
                  placeholder="Select status"
                  options={["Available", "Occupied", "Quarantine", "Cleaning"]}
                />
              </div>
              <div style={{ padding: "10px 16px" }}>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: "#94a3b8",
                    textTransform: "uppercase",
                    letterSpacing: "0.8px",
                    marginBottom: 6,
                  }}
                >
                  Isolation / Infected
                </div>
                <CustomSelect
                  value={form.infected ? "yes" : "no"}
                  onChange={(val) =>
                    setForm({ ...form, infected: val === "yes" })
                  }
                  placeholder="Select"
                  options={[
                    { value: "no", label: "No" },
                    { value: "yes", label: "Yes — Isolation" },
                  ]}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Occupant */}
          <div style={{ borderBottom: "1.5px solid #e2e8f0" }}>
            <div
              style={{
                background: "#f1f5f9",
                borderBottom: "1px solid #e2e8f0",
                padding: "6px 16px",
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                  color: "#64748b",
                }}
              >
                Current Occupant
              </span>
            </div>
            {isEdit && (
              <div
                style={{
                  padding: "10px 16px",
                  borderBottom: "1px solid #e2e8f0",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: "#94a3b8",
                    textTransform: "uppercase",
                    letterSpacing: "0.8px",
                    marginBottom: 6,
                  }}
                >
                  Patient Name{" "}
                  {form.status === "Occupied" && (
                    <span style={{ color: "#ef4444" }}>*</span>
                  )}
                </div>
                <CustomSelect
                  value={form.patient || ""}
                  onChange={(val) => setForm({ ...form, patient: val })}
                  placeholder="Select unassigned patient"
                  options={unassignedPatients.map((p) => ({
                    value: p.name,
                    label: `${p.name}${p.owner ? ` — ${p.owner}` : ""} (${p.status})`,
                  }))}
                />
                {unassignedPatients.length === 0 && (
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>
                    No pending/confirmed appointments are waiting on a room
                    right now.
                  </div>
                )}
              </div>
            )}
            <div style={{ padding: "10px 16px" }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#94a3b8",
                  textTransform: "uppercase",
                  letterSpacing: "0.8px",
                  marginBottom: 6,
                }}
              >
                Discharge / Available Date
              </div>
              <DatePicker
                value={
                  form.discharge_date ? form.discharge_date.slice(0, 10) : ""
                }
                onChange={(val) => setForm({ ...form, discharge_date: val })}
                placeholder="Select discharge date"
              />
              <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 6 }}>
                Room auto-switches to Available once this date is reached
              </div>
            </div>
          </div>

          {/* Footer watermark */}
          <div style={{ padding: "6px 16px", background: "var(--bg)" }}>
            <p
              style={{
                margin: 0,
                fontSize: 10,
                color: "var(--muted)",
                textAlign: "right",
                fontStyle: "italic",
              }}
            >
              Angeles Animal Care Hospital
            </p>
          </div>
        </div>

        {/* ── Footer ── */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            padding: "14px 24px",
            borderTop: "2px solid #e2e8f0",
            background: "var(--bg)",
            flexShrink: 0,
          }}
        >
          <button
            className="btn btn-ghost"
            style={{ width: "auto" }}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary"
            style={{
              width: "auto",
              background: "#0f172a",
              borderColor: "#0f172a",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              opacity: !isFormValid() || saving ? 0.5 : 1,
              cursor: !isFormValid() || saving ? "not-allowed" : "pointer",
            }}
            onClick={onSave}
            disabled={saving || !isFormValid()}
          >
            {saving ? (
              "Saving..."
            ) : (
              <>
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {isEdit ? "Save Changes" : "Create Room"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Confirm Modal ───────────────────────────────────────────────────────── */
const ConfirmModal = ({
  show,
  title,
  message,
  onConfirm,
  onCancel,
  confirmColor = "#dc2626",
  confirmText = "Confirm",
}) => {
  if (!show) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.52)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
        padding: 16,
      }}
    >
      <div
        style={{
          background: "var(--card)",
          borderRadius: 14,
          width: "100%",
          maxWidth: 420,
          boxShadow: "0 20px 60px rgba(0,0,0,0.28)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "18px 22px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{title}</h3>
        </div>
        <div style={{ padding: "16px 22px" }}>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              lineHeight: 1.6,
              color: "var(--muted)",
            }}
          >
            {message}
          </p>
        </div>
        <div
          style={{
            padding: "12px 22px",
            borderTop: "1px solid var(--border)",
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
          }}
        >
          <button
            className="btn btn-ghost"
            style={{ width: "auto" }}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="btn"
            style={{
              width: "auto",
              background: confirmColor,
              color: "#fff",
              border: "none",
            }}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Toast ───────────────────────────────────────────────────────────────── */
const Toast = ({ message, show, type = "success" }) => {
  const cfg = {
    success: {
      accent: "#22c55e",
      iconBg: "#f0fdf4",
      iconColor: "#16a34a",
      labelBg: "#dcfce7",
      labelColor: "#166534",
      label: "Success",
      icon: (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ),
    },
    error: {
      accent: "#ef4444",
      iconBg: "#fef2f2",
      iconColor: "#dc2626",
      labelBg: "#fee2e2",
      labelColor: "#991b1b",
      label: "Error",
      icon: (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      ),
    },
    info: {
      accent: "#3b82f6",
      iconBg: "#eff6ff",
      iconColor: "#2563eb",
      labelBg: "#dbeafe",
      labelColor: "#1e40af",
      label: "Info",
      icon: (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      ),
    },
    warning: {
      accent: "#f59e0b",
      iconBg: "#fffbeb",
      iconColor: "#d97706",
      labelBg: "#fef3c7",
      labelColor: "#92400e",
      label: "Warning",
      icon: (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      ),
    },
  };
  const c = cfg[type] || cfg.success;
  return (
    <div
      style={{
        width: 340,
        pointerEvents: "none",
        opacity: show ? 1 : 0,
        transform: show
          ? "translateX(0) scale(1)"
          : "translateX(calc(100% + 32px)) scale(0.97)",
        transition:
          "transform 0.32s cubic-bezier(0.22,1,0.36,1), opacity 0.32s ease",
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        overflow: "hidden",
        boxShadow: "0 4px 20px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: c.accent,
        }}
      />
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 11,
          padding: "14px 14px 12px",
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            flexShrink: 0,
            background: c.iconBg,
            color: c.iconColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginTop: 1,
          }}
        >
          {c.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ marginBottom: 5 }}>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: c.labelColor,
                background: c.labelBg,
                borderRadius: 4,
                padding: "2px 7px",
              }}
            >
              {c.label}
            </span>
          </div>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text)",
              lineHeight: 1.4,
            }}
          >
            {message}
          </p>
        </div>
      </div>
      <div style={{ height: 2, background: `${c.accent}22` }}>
        <div
          style={{
            height: "100%",
            background: c.accent,
            opacity: 0.6,
            width: show ? "0%" : "100%",
            transition: show ? "width 3s linear" : "none",
          }}
        />
      </div>
    </div>
  );
};

/* ─── Shared room validation (used by both the form's disabled-state check and the actual save) ─── */
const validateRoom = (form, isEdit, existingNumbers = []) => {
  if (!isEdit) {
    const num = form.number?.toString().trim() || "";
    if (!num) return { valid: false, message: "Room number is required" };
    if (!/^[a-zA-Z0-9-]+$/.test(num))
      return {
        valid: false,
        message: "Room number can only contain letters, numbers, and dashes",
      };
    if (
      existingNumbers.some(
        (n) => n?.toString().trim().toLowerCase() === num.toLowerCase(),
      )
    )
      return {
        valid: false,
        message: "A room with this number already exists",
      };
  }
  if (form.status === "Occupied" && !form.patient?.toString().trim())
    return {
      valid: false,
      message: "Please assign a patient name for an occupied room",
    };
  if (form.patient && !/^[a-zA-Z\s'-]+$/.test(form.patient.trim()))
    return { valid: false, message: "Patient name can only contain letters" };
  if (
    form.status === "Occupied" &&
    form.discharge_date &&
    form.discharge_date < new Date().toISOString().split("T")[0]
  )
    return { valid: false, message: "Discharge date cannot be in the past" };
  return { valid: true, message: "" };
};

/* ─── Main Component ──────────────────────────────────────────────────────── */
const RoomAvailability = () => {
  const {
    user,
    isAdmin,
    seeAllBranches,
    loading: userLoading,
  } = useCurrentUser();

  const [branchFilter, setBranchFilter] = useState("");
  const [branches, setBranches] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");

  // Modals
  const [viewRoom, setViewRoom] = useState(null); // view modal
  const [formRoom, setFormRoom] = useState(null); // add/edit modal (null = closed, false = new, obj = edit)
  const [formOriginal, setFormOriginal] = useState(null); // snapshot of room being edited, for unsaved-changes detection
  const [form, setForm] = useState({
    number: "",
    type: "General",
    status: "Available",
    patient: "",
    diagnosis: "",
    infected: false,
    discharge_date: "",
  });
  const [saving, setSaving] = useState(false);
  const [unassignedPatients, setUnassignedPatients] = useState([]);

  const fetchUnassignedPatients = async () => {
    // Pull appointments that are NOT yet complete/cancelled (still active) and
    // don't already have a room. Completed/Cancelled visits never need a room.
    let q = supabase
      .from("appointments")
      .select("id, patient, owner, status, room, branch_id")
      .in("status", ["Pending", "Confirmed"])
      .or("room.is.null,room.eq.");
    if (user?.branchId && !seeAllBranches) q = q.eq("branch_id", user.branchId);
    const { data, error } = await q;
    if (error) {
      console.error("Unassigned patients fetch error:", error.message);
      setUnassignedPatients([]);
      return;
    }
    const seen = new Set();
    const unique = (data || [])
      .filter(
        (a) =>
          a.patient &&
          !seen.has(a.patient.toLowerCase().trim()) &&
          seen.add(a.patient.toLowerCase().trim()),
      )
      .map((a) => ({
        name: a.patient,
        owner: a.owner,
        status: a.status,
      }));
    setUnassignedPatients(unique);
  };
  const [confirm, setConfirm] = useState({ show: false });
  const [deletedRooms, setDeletedRooms] = useState([]);
  const [showDeletedModal, setShowDeletedModal] = useState(false);

  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = "success") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type, show: true }]);
    setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, show: false } : t)),
      );
      setTimeout(
        () => setToasts((prev) => prev.filter((t) => t.id !== id)),
        400,
      );
    }, 3000);
  };

  useEffect(() => {
    if (!seeAllBranches) return;
    supabase
      .from("branches")
      .select("id,name")
      .order("name")
      .then(({ data }) => setBranches(data || []));
  }, [seeAllBranches]);

  const fetchRooms = async () => {
    if (userLoading || !user) return;
    setLoading(true);
    let q = supabaseAdmin
      .from("rooms")
      .select("*")
      .is("deleted_at", null)
      .order("number");
    if (!seeAllBranches && user?.branchId) q = q.eq("branch_id", user.branchId);
    if (seeAllBranches && branchFilter) q = q.eq("branch_id", branchFilter);
    const { data, error } = await q;
    if (!error) {
      const list = data || [];
      await autoDischargeExpiredRooms(list);
      setRooms(list);
    }
    setLoading(false);
  };

  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

  const fetchDeletedRooms = async () => {
    if (userLoading || !user) return;
    let q = supabaseAdmin
      .from("rooms")
      .select("*")
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false });
    if (!seeAllBranches && user?.branchId) q = q.eq("branch_id", user.branchId);
    if (seeAllBranches && branchFilter) q = q.eq("branch_id", branchFilter);
    const { data, error } = await q;
    if (error) return;
    const now = Date.now();
    const expired = (data || []).filter(
      (r) => now - new Date(r.deleted_at).getTime() > THIRTY_DAYS_MS,
    );
    if (expired.length > 0)
      await supabase
        .from("rooms")
        .delete()
        .in(
          "id",
          expired.map((r) => r.id),
        );
    setDeletedRooms(
      (data || []).filter(
        (r) => now - new Date(r.deleted_at).getTime() <= THIRTY_DAYS_MS,
      ),
    );
  };

  // Automatically free up rooms that are stale: discharge date passed, OR marked
  // Occupied with no patient actually assigned (data mismatch / leftover state)
  const autoDischargeExpiredRooms = async (list) => {
    const now = new Date();
    const expired = (list || []).filter(
      (r) =>
        r.status === "Occupied" &&
        ((r.discharge_date && new Date(r.discharge_date) <= now) ||
          !r.patient ||
          !r.patient.toString().trim()),
    );
    if (expired.length === 0) return;
    for (const room of expired) {
      const reason =
        !room.patient || !room.patient.toString().trim()
          ? "no patient assigned"
          : "discharge date reached";
      room.status = "Available";
      room.patient = "";
      room.diagnosis = "";
      room.discharge_date = null;
      await supabaseAdmin
        .from("rooms")
        .update({
          status: "Available",
          patient: "",
          diagnosis: "",
          discharge_date: null,
        })
        .eq("id", room.id);
      logActivity(
        user,
        "Auto-released room",
        `Room ${room.number} automatically set to Available (${reason})`,
      );
    }
  };

  useEffect(() => {
    if (user)
      logActivity(user, "Viewed room availability", "Opened room availability");
  }, []);

  useEffect(() => {
    if (userLoading || !user) return;
    fetchRooms();
    fetchDeletedRooms();
    const ch = supabase
      .channel("rooms-availability-rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rooms" },
        () => {
          fetchRooms();
          fetchDeletedRooms();
        },
      )
      .subscribe();
    // Re-check discharge dates every minute even if no other change happens
    const dischargeTimer = setInterval(() => fetchRooms(), 60000);
    return () => {
      supabase.removeChannel(ch);
      clearInterval(dischargeTimer);
    };
  }, [user, userLoading, seeAllBranches, branchFilter]);

  const openCreate = () => {
    setForm({
      number: "",
      type: "General",
      status: "Available",
      patient: "",
      diagnosis: "",
      infected: false,
      discharge_date: "",
    });
    setFormOriginal(null);
    setFormRoom(false); // false = new
  };
  const openEdit = (room) => {
    setViewRoom(null);
    setForm({ ...room });
    setFormOriginal({ ...room });
    setFormRoom(room);
    fetchUnassignedPatients();
  };

  const hasUnsavedRoomEdits = () => {
    if (!formOriginal) return false;
    const norm = (f) =>
      JSON.stringify({
        number: f.number || "",
        type: f.type || "General",
        status: f.status || "Available",
        patient: f.patient || "",
        diagnosis: f.diagnosis || "",
        infected: !!f.infected,
        discharge_date: f.discharge_date
          ? f.discharge_date.toString().slice(0, 10)
          : "",
      });
    return norm(form) !== norm(formOriginal);
  };

  const attemptCloseFormRoom = () => {
    if (hasUnsavedRoomEdits()) {
      setConfirm({
        show: true,
        title: "Discard Changes?",
        message:
          "You have unsaved changes to this room's record. Do you want to discard them?",
        confirmText: "Discard",
        confirmColor: "#dc2626",
        onConfirm: () => {
          setConfirm({ show: false });
          setFormRoom(null);
          setFormOriginal(null);
        },
        onCancel: () => setConfirm({ show: false }),
      });
    } else {
      setFormRoom(null);
      setFormOriginal(null);
    }
  };

  const saveRoom = async () => {
    if (saving) return;
    const check = validateRoom(
      form,
      !!formRoom,
      rooms.map((r) => r.number),
    );
    if (!check.valid) {
      showToast(check.message, "error");
      return;
    }
    setSaving(true);
    const payload = {
      status: form.status,
      patient: form.status === "Available" ? "" : form.patient || "",
      diagnosis: form.status === "Available" ? "" : form.diagnosis || "",
      type: form.type,
      infected: form.infected,
      discharge_date:
        form.status === "Available" ? null : form.discharge_date || null,
    };
    if (formRoom) {
      // Edit
      const { error } = await supabaseAdmin
        .from("rooms")
        .update(payload)
        .eq("id", formRoom.id);
      setSaving(false);
      if (error) {
        showToast("Error: " + error.message, "error");
        return;
      }
      logActivity(user, "Updated room", `Edited room: ${formRoom.number}`);
      showToast(`✓ Room ${formRoom.number} updated`);
    } else {
      // Create
      if (!form.number?.toString().trim()) {
        setSaving(false);
        showToast("Room number is required", "error");
        return;
      }
      const { error } = await supabaseAdmin.from("rooms").insert([
        {
          ...payload,
          number: form.number,
          branch_id: user?.branchId ?? null,
        },
      ]);
      setSaving(false);
      if (error) {
        showToast("Error: " + error.message, "error");
        return;
      }
      logActivity(user, "Created room", `Added room: ${form.number}`);
      showToast(`✓ Room ${form.number} created`);
    }
    fetchRooms();
    setFormRoom(null);
    setFormOriginal(null);
  };

  const deleteRoom = (room) => {
    setConfirm({
      show: true,
      title: `Delete Room ${room.number}?`,
      message: `Room ${room.number} will move to Recently Deleted for 30 days before being permanently removed.`,
      confirmText: "Yes, Delete",
      confirmColor: "#dc2626",
      onConfirm: async () => {
        setConfirm({ show: false });
        const { error } = await supabaseAdmin
          .from("rooms")
          .update({ deleted_at: new Date().toISOString() })
          .eq("id", room.id);
        if (error) {
          showToast("Error: " + error.message, "error");
          return;
        }
        logActivity(
          user,
          "Deleted room",
          `Moved to Recently Deleted: Room ${room.number}`,
        );
        setViewRoom(null);
        showToast(`Room ${room.number} moved to Recently Deleted`, "info");
        fetchRooms();
        fetchDeletedRooms();
      },
      onCancel: () => setConfirm({ show: false }),
    });
  };

  const restoreRoom = (room) => {
    setConfirm({
      show: true,
      title: `Restore Room ${room.number}?`,
      message: `Room ${room.number} will be restored to the active room list.`,
      confirmText: "Restore",
      confirmColor: "#16a34a",
      onConfirm: async () => {
        setConfirm({ show: false });
        const { error } = await supabaseAdmin
          .from("rooms")
          .update({ deleted_at: null })
          .eq("id", room.id);
        if (error) {
          showToast("Error: " + error.message, "error");
          return;
        }
        logActivity(user, "Restored room", `Restored: Room ${room.number}`);
        showToast(`Room ${room.number} restored`);
        fetchRooms();
        fetchDeletedRooms();
      },
      onCancel: () => setConfirm({ show: false }),
    });
  };

  const permanentlyDeleteRoom = (room) => {
    setConfirm({
      show: true,
      title: "Delete Permanently",
      message: `Permanently delete Room ${room.number}? This cannot be undone.`,
      confirmText: "Delete Forever",
      confirmColor: "#dc2626",
      onConfirm: async () => {
        setConfirm({ show: false });
        const { error } = await supabaseAdmin
          .from("rooms")
          .delete()
          .eq("id", room.id);
        if (error) {
          showToast("Error: " + error.message, "error");
          return;
        }
        logActivity(
          user,
          "Permanently deleted room",
          `Removed: Room ${room.number}`,
        );
        showToast("Room permanently deleted", "info");
        fetchDeletedRooms();
      },
      onCancel: () => setConfirm({ show: false }),
    });
  };

  /* Derived */
  const counts = {
    available: rooms.filter((r) => r.status === "Available").length,
    occupied: rooms.filter((r) => r.status === "Occupied").length,
    quarantine: rooms.filter((r) => r.status === "Quarantine").length,
    cleaning: rooms.filter((r) => r.status === "Cleaning").length,
  };
  const totalRooms = rooms.length;
  const usageRate =
    totalRooms > 0 ? Math.round((counts.occupied / totalRooms) * 100) : 0;
  const usageByType = rooms.reduce((acc, r) => {
    const t = r.type || "General";
    if (!acc[t]) acc[t] = { total: 0, occupied: 0 };
    acc[t].total += 1;
    if (r.status === "Occupied") acc[t].occupied += 1;
    return acc;
  }, {});
  const filterMap = {
    All: rooms,
    Available: rooms.filter((r) => r.status === "Available"),
    Occupied: rooms.filter((r) => r.status === "Occupied"),
    Quarantine: rooms.filter((r) => r.status === "Quarantine"),
    Cleaning: rooms.filter((r) => r.status === "Cleaning"),
  };
  const filtered = filterMap[filter] || rooms;
  const generalRooms = filtered.filter((r) => !r.infected);
  const isolationRooms = filtered.filter((r) => r.infected);

  const branchLabel = seeAllBranches
    ? branchFilter
      ? (branches.find((b) => b.id === branchFilter)?.name ?? "Branch")
      : "All Branches"
    : "My Branch";

  const S = {
    inp: {
      padding: "9px 12px",
      border: "1.5px solid var(--border)",
      borderRadius: 8,
      fontSize: 13,
      fontFamily: "inherit",
      background: "#fff",
      color: "var(--text)",
      outline: "none",
    },
    card: {
      background: "#fff",
      borderRadius: "var(--radius-lg)",
      border: "1px solid var(--border)",
      boxShadow: "var(--shadow)",
      width: "100%",
      marginBottom: 20,
    },
  };

  const FILTER_TABS = [
    "All",
    "Available",
    "Occupied",
    "Quarantine",
    "Cleaning",
  ];
  const TAB_COLORS = {
    All: "var(--royal)",
    Available: "#16a34a",
    Occupied: "#1e3a8a",
    Quarantine: "#dc2626",
    Cleaning: "#d97706",
  };

  return (
    <Layout>
      <div
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 999999,
          display: "flex",
          flexDirection: "column-reverse",
          gap: 10,
          pointerEvents: "none",
        }}
      >
        {toasts.slice(-3).map((t) => (
          <Toast key={t.id} message={t.message} show={t.show} type={t.type} />
        ))}
      </div>
      <ConfirmModal {...confirm} />

      {/* ── TOPBAR ── */}
      <div
        className="topbar room-topbar"
        style={{
          position: "fixed",
          top: 68,
          left: "var(--current-sidebar-w, 62px)",
          right: 0,
          zIndex: 40,
          background: "#fff",
        }}
      >
        <div className="topbar-title">
          <img src="/icon/room.png" alt="" />
          <div>
            <h1>Room Availability</h1>
            <p>{branchLabel} — Monitor and manage room status</p>
          </div>
        </div>
        <div className="topbar-actions">
          {seeAllBranches && (
            <div style={{ width: 180 }}>
              <CustomSelect
                value={branchFilter}
                onChange={(val) => setBranchFilter(val)}
                placeholder="All Branches"
                accent="#7c3aed"
                options={branches.map((b) => ({ value: b.id, label: b.name }))}
              />
            </div>
          )}
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
              padding: "8px 14px",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            <svg
              width="13"
              height="13"
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
            {deletedRooms.length > 0 ? `(${deletedRooms.length})` : ""}
          </button>
          <div
            className="fab-wrap"
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
                background: "linear-gradient(135deg,#0f172a,#1e3a8a)",
                color: "#fff",
                fontSize: 12,
                fontWeight: 700,
                padding: "8px 14px",
                borderRadius: 10,
                whiteSpace: "nowrap",
                pointerEvents: "none",
                boxShadow: "0 8px 24px rgba(30,58,138,0.35)",
                border: "1px solid rgba(255,255,255,0.12)",
                display: "flex",
                alignItems: "center",
                gap: 7,
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
                  Add Room
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 500,
                    color: "rgba(255,255,255,0.55)",
                  }}
                >
                  Register new room
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
              onClick={openCreate}
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
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="content room-content" style={{ paddingTop: 24 }}>
        {/* Stat Cards */}
        <div
          className="room-stats-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(195px,1fr))",
            gap: 14,
            marginTop: 38,
            marginBottom: 20,
          }}
        >
          {loading
            ? [1, 2, 3, 4].map((i) => <StatCardSkeleton key={i} />)
            : [
                {
                  label: "Available",
                  value: counts.available,
                  icon: "/icon/available.png",
                  color: "green",
                  f: "Available",
                  sub:
                    counts.available > 0
                      ? "Ready for admission"
                      : "None available",
                },
                {
                  label: "Occupied",
                  value: counts.occupied,
                  icon: "/icon/confirm.png",
                  color: "blue",
                  f: "Occupied",
                  sub: "Currently in use",
                },
                {
                  label: "Quarantine",
                  value: counts.quarantine,
                  icon: "/icon/warning.png",
                  color: "red",
                  f: "Quarantine",
                  sub:
                    counts.quarantine > 0 ? "Needs attention" : "None flagged",
                },
                {
                  label: "Cleaning",
                  value: counts.cleaning,
                  icon: "/icon/cleaning.png",
                  color: "yellow",
                  f: "Cleaning",
                  sub: "Being sanitized",
                },
              ].map((sc, i) => (
                <div
                  key={i}
                  className={`stat-card-v2 ${sc.color} fade-in`}
                  onClick={() => setFilter((f) => (f === sc.f ? "All" : sc.f))}
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start" }}>
                    <div className={`stat-icon-v2 ${sc.color}`}>
                      <img
                        src={sc.icon}
                        alt=""
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
                        color:
                          sc.color === "red" && sc.value > 0
                            ? "#dc2626"
                            : "var(--muted)",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      {sc.color === "red" && sc.value > 0 && (
                        <svg
                          width="11"
                          height="11"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        >
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                          <line x1="12" y1="9" x2="12" y2="13" />
                          <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                      )}
                      {sc.sub}
                    </span>
                  </div>
                </div>
              ))}
        </div>

        {/* Filter tabs */}
        <div
          className="fade-in"
          style={{
            display: "flex",
            gap: 6,
            marginBottom: 20,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {FILTER_TABS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "6px 16px",
                borderRadius: 99,
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
                border: "1.5px solid",
                transition: "all 0.15s",
                background: filter === f ? TAB_COLORS[f] : "transparent",
                color: filter === f ? "#fff" : "var(--muted)",
                borderColor: filter === f ? TAB_COLORS[f] : "var(--border)",
              }}
            >
              {f}
            </button>
          ))}
          <span style={{ marginLeft: 4, color: "var(--muted)", fontSize: 12 }}>
            {filtered.length} room{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* ── Room Usage Tracking ── */}
        {!loading && totalRooms > 0 && (
          <div
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              boxShadow: "var(--shadow)",
              padding: "18px 22px",
              marginBottom: 20,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 14,
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: 14,
                  fontWeight: 700,
                  color: "var(--text)",
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                }}
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--royal)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <path d="M3 3v18h18" />
                  <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
                </svg>
                Room Usage
              </h3>
              <span
                style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}
              >
                {counts.occupied} of {totalRooms} rooms in use
              </span>
            </div>

            {/* Overall utilization bar */}
            <div style={{ marginBottom: 18 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--text)",
                  marginBottom: 5,
                }}
              >
                <span>Overall Utilization</span>
                <span
                  style={{
                    color:
                      usageRate >= 80
                        ? "#dc2626"
                        : usageRate >= 50
                          ? "#d97706"
                          : "#16a34a",
                  }}
                >
                  {usageRate}%
                </span>
              </div>
              <div
                style={{
                  background: "#f1f5f9",
                  borderRadius: 99,
                  height: 10,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    borderRadius: 99,
                    width: `${usageRate}%`,
                    transition: "width 0.5s ease",
                    background:
                      usageRate >= 80
                        ? "linear-gradient(90deg,#ef4444,#dc2626)"
                        : usageRate >= 50
                          ? "linear-gradient(90deg,#f59e0b,#d97706)"
                          : "linear-gradient(90deg,#22c55e,#16a34a)",
                  }}
                />
              </div>
            </div>

            {/* Breakdown by ward type */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: 14,
              }}
            >
              {Object.entries(usageByType).map(
                ([type, { total, occupied }]) => {
                  const rate =
                    total > 0 ? Math.round((occupied / total) * 100) : 0;
                  return (
                    <div key={type}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 11,
                          fontWeight: 700,
                          color: "var(--muted)",
                          marginBottom: 4,
                        }}
                      >
                        <span>{type}</span>
                        <span>
                          {occupied}/{total}
                        </span>
                      </div>
                      <div
                        style={{
                          background: "#f1f5f9",
                          borderRadius: 99,
                          height: 6,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            borderRadius: 99,
                            width: `${rate}%`,
                            transition: "width 0.5s ease",
                            background:
                              rate >= 80
                                ? "#dc2626"
                                : rate >= 50
                                  ? "#d97706"
                                  : "#16a34a",
                          }}
                        />
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          </div>
        )}

        {loading ? (
          <>
            {/* General section skeleton */}
            <div style={{ marginBottom: 8 }}>
              <Skel w={160} h={13} />
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))",
                gap: 16,
                marginBottom: 32,
              }}
            >
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <CardSkel key={i} />
              ))}
            </div>
          </>
        ) : (
          <>
            {/* General Wards */}
            {generalRooms.length > 0 && (
              <section style={{ marginBottom: 32 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 14,
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--muted)"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: 12,
                      fontWeight: 800,
                      color: "var(--muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.8px",
                    }}
                  >
                    General Wards
                  </h3>
                  <span
                    style={{
                      background: "#f1f5f9",
                      color: "var(--muted)",
                      borderRadius: 99,
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "2px 8px",
                    }}
                  >
                    {generalRooms.length}
                  </span>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill,minmax(210px,1fr))",
                    gap: 16,
                  }}
                >
                  {generalRooms.map((room) => (
                    <RoomCard key={room.id} room={room} onView={setViewRoom} />
                  ))}
                </div>
              </section>
            )}

            {/* Isolation Rooms */}
            {isolationRooms.length > 0 && (
              <section style={{ marginBottom: 32 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 14,
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#dc2626"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: 12,
                      fontWeight: 800,
                      color: "#dc2626",
                      textTransform: "uppercase",
                      letterSpacing: "0.8px",
                    }}
                  >
                    Isolation / Infected Rooms
                  </h3>
                  <span
                    style={{
                      background: "#fee2e2",
                      color: "#dc2626",
                      borderRadius: 99,
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "2px 8px",
                    }}
                  >
                    {isolationRooms.length}
                  </span>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill,minmax(210px,1fr))",
                    gap: 16,
                  }}
                >
                  {isolationRooms.map((room) => (
                    <RoomCard key={room.id} room={room} onView={setViewRoom} />
                  ))}
                </div>
              </section>
            )}

            {filtered.length === 0 && (
              <div
                style={{
                  textAlign: "center",
                  padding: "60px 0",
                  color: "var(--muted)",
                }}
              >
                <div style={{ marginBottom: 10 }}>
                  <svg
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#cbd5e1"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  >
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                </div>
                <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>
                  No rooms match this filter.
                </p>
                <p style={{ fontSize: 12, margin: "4px 0 0" }}>
                  Try selecting a different status or add a new room.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── View Modal ── */}
      {viewRoom && (
        <ViewModal
          room={viewRoom}
          onClose={() => setViewRoom(null)}
          onEdit={() => openEdit(viewRoom)}
          onDelete={() => deleteRoom(viewRoom)}
        />
      )}

      {/* ── Add / Edit Modal ── */}
      {formRoom !== null && (
        <RoomFormModal
          editRoom={formRoom || null}
          form={form}
          setForm={setForm}
          onSave={saveRoom}
          onClose={attemptCloseFormRoom}
          saving={saving}
          existingNumbers={rooms.map((r) => r.number)}
          validateRoom={validateRoom}
          unassignedPatients={unassignedPatients}
        />
      )}

      {/* ── Recently Deleted Modal ── */}
      {showDeletedModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.52)",
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
              boxShadow: "0 24px 64px rgba(0,0,0,0.28)",
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
                  Recently Deleted Rooms
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: 12,
                    color: "var(--muted)",
                    marginTop: 2,
                  }}
                >
                  Rooms are permanently removed 30 days after deletion.
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
              {deletedRooms.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px 0",
                    color: "var(--muted)",
                  }}
                >
                  <p style={{ fontSize: 13, margin: 0 }}>
                    No recently deleted rooms.
                  </p>
                </div>
              ) : (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 10 }}
                >
                  {deletedRooms.map((room) => {
                    const daysLeft = Math.max(
                      0,
                      30 -
                        Math.floor(
                          (Date.now() - new Date(room.deleted_at).getTime()) /
                            (24 * 60 * 60 * 1000),
                        ),
                    );
                    return (
                      <div
                        key={room.id}
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
                        <div>
                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: 13,
                              color: "var(--text)",
                            }}
                          >
                            Room {room.number}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--muted)" }}>
                            {room.type || "General"}
                            {room.patient
                              ? ` · Was housing: ${room.patient}`
                              : ""}
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
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            onClick={() => restoreRoom(room)}
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
                            onClick={() => permanentlyDeleteRoom(room)}
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
                className="btn btn-ghost"
                style={{ width: "auto" }}
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

export default RoomAvailability;
