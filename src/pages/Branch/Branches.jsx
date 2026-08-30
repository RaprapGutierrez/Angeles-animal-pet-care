// src/pages/Branches.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import ReactDOM from "react-dom";
import Layout from "../../components/layout";
import { supabase } from "../../js/Utils/supabase";
import { useCurrentUser } from "../../js/hooks/Usecurrentuser";
import "../../styles/Branches.css";

if (
  typeof document !== "undefined" &&
  !document.getElementById("leaflet-css")
) {
  const css = document.createElement("link");
  css.id = "leaflet-css";
  css.rel = "stylesheet";
  css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
  document.head.appendChild(css);
}

// ── Toast component (stacked) ──
const BranchToastItem = ({ show, message, type = "success", onClose }) => {
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
        pointerEvents: "auto",
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
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "var(--muted)",
            fontSize: 16,
            cursor: "pointer",
            lineHeight: 1,
            padding: "2px 4px",
            flexShrink: 0,
            pointerEvents: "all",
          }}
        >
          ✕
        </button>
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

const BranchToastStack = ({ toasts, onClose }) => {
  const visible = toasts.slice(-3);
  return (
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
      {visible.map((t) => (
        <BranchToastItem
          key={t.id}
          show={t.show}
          message={t.message}
          type={t.type}
          onClose={() => onClose(t.id)}
        />
      ))}
    </div>
  );
};
const Skel = ({ w = "100%", h = 16 }) => (
  <span
    className="skel"
    style={{ width: w, height: h, borderRadius: 8, display: "block" }}
  />
);

// ── Custom dropdown (matches Appointments.jsx) ──
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
      const dropHeight = Math.min((options.length + 1) * 38, 240);
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
                    if ((!opt.disabled && optVal !== "") || optVal === "") {
                      onChange(optVal);
                      setOpen(false);
                    }
                  }}
                  style={{
                    padding: "8px 10px",
                    fontSize: 13,
                    fontWeight: isSelected ? 700 : 500,
                    color: opt.disabled
                      ? "#cbd5e1"
                      : isEmpty
                        ? "#b0bac9"
                        : isSelected
                          ? accent
                          : "var(--text)",
                    cursor: opt.disabled
                      ? "not-allowed"
                      : isEmpty
                        ? "default"
                        : "pointer",
                    transition: "background 0.12s, color 0.12s",
                    background: isSelected ? `${accent}12` : "transparent",
                    borderRadius: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    opacity: opt.disabled ? 0.45 : 1,
                    marginBottom: 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected && !opt.disabled && !isEmpty)
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
                          border: `1.5px solid ${isSelected ? accent : opt.disabled ? "#e2e8f0" : "#cbd5e1"}`,
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
            ? "linear-gradient(135deg, #ffffff 0%, #f5f3ff 100%)"
            : "linear-gradient(to bottom, #ffffff 0%, #f8fafc 100%)",
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

const makeDivIcon = (L) =>
  L.divIcon({
    html: `<div style="width:36px;height:36px;border-radius:50% 50% 50% 0;background:linear-gradient(135deg,#1e3a8a,#3b5fc0);transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 3px 10px rgba(30,58,138,0.4)"></div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -38],
    className: "",
  });

// ── Module definitions ──
const MODULE_ICONS = {
  dashboard: (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  ),
  appointment: (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  walkin: (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <circle cx="12" cy="7" r="3" />
      <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
    </svg>
  ),
  inventory: (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <path d="M21 16V8a2 2 0 0 0-1-1.73L13 2.27a2 2 0 0 0-2 0L4 6.27A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    </svg>
  ),
  billing: (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
    </svg>
  ),
  reports: (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  staff: (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  branches: (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  history: (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15 15" />
    </svg>
  ),
  profile: (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  ),
};

const ALL_MODULES = {
  admin: [
    { key: "dashboard", label: "Dashboard" },
    { key: "patient-records", label: "Patient Records" },
    { key: "appointment", label: "Appointment" },
    { key: "room-availability", label: "Room Status" },
    { key: "walkin", label: "Walk-in" },
    { key: "inventory", label: "Inventory" },
    { key: "billing", label: "Billing" },
    { key: "reports", label: "Reports" },
    { key: "messages", label: "Messages" },
    { key: "emergency", label: "Emergency" },
    { key: "staff", label: "Staff" },
    { key: "branches", label: "Branches" },
    { key: "predictive-analytics", label: "Predictive Analytics" },
    { key: "admin-security", label: "Admin Security" },
  ],
  manager: [
    { key: "dashboard", label: "Dashboard" },
    { key: "patient-records", label: "Patient Records" },
    { key: "appointment", label: "Appointment" },
    { key: "room-availability", label: "Room Status" },
    { key: "walkin", label: "Walk-in" },
    { key: "inventory", label: "Inventory" },
    { key: "billing", label: "Billing" },
    { key: "reports", label: "Reports" },
    { key: "messages", label: "Messages" },
    { key: "emergency", label: "Emergency" },
    { key: "staff", label: "Manager Control" },
    { key: "predictive-analytics", label: "Predictive Analytics" },
  ],
  employee: [
    { key: "dashboard", label: "Dashboard" },
    { key: "patient-records", label: "Patient Records" },
    { key: "appointment", label: "Appointment" },
    { key: "room-availability", label: "Room Status" },
    { key: "walkin", label: "Walk-in" },
    { key: "inventory", label: "Inventory" },
    { key: "billing", label: "Billing" },
    { key: "messages", label: "Messages" },
    { key: "emergency", label: "Emergency" },
    { key: "predictive-analytics", label: "Predictive Analytics" },
  ],
  customer: [
    { key: "dashboard", label: "Dashboard" },
    { key: "appointment", label: "Appointment" },
    { key: "walkin", label: "Walk-in" },
    { key: "history", label: "History" },
    { key: "profile", label: "Profile" },
  ],
};

const SERVICE_TRIGGER_MODULES = ["appointment", "walkin"];
const SERVICES_LIST = [
  "Checkup",
  "Surgery",
  "Vaccination",
  "Grooming",
  "Dental",
  "X-Ray",
  "Emergency",
];

const ROLE_COLORS = {
  admin: {
    bg: "#eff6ff",
    border: "#bfdbfe",
    text: "#1e40af",
    badge: "#1e3a8a",
  },
  manager: {
    bg: "#f0fdf4",
    border: "#bbf7d0",
    text: "#14532d",
    badge: "#15803d",
  },
  employee: {
    bg: "#faf5ff",
    border: "#e9d5ff",
    text: "#581c87",
    badge: "#7c3aed",
  },
  customer: {
    bg: "#fff7ed",
    border: "#fed7aa",
    text: "#7c2d12",
    badge: "#ea580c",
  },
};
const ROLE_LABELS = {
  admin: "Admin",
  manager: "Manager",
  employee: "Employee",
  customer: "Customer",
};

const defaultModules = () => ({
  admin: ALL_MODULES.admin.map((m) => m.key),
  manager: ALL_MODULES.manager.map((m) => m.key),
  employee: [],
  customer: [],
});

// Used when opening the Add Branch form — nothing pre-checked; the person
// creating the branch decides which modules each role should have.
const emptyModules = () => ({
  admin: [],
  manager: [],
  employee: [],
  customer: [],
});

// ── Branch form validation ──────────────────────────────────────────────────
const validateBranchForm = (form, isEdit) => {
  if (!form.name?.trim())
    return { valid: false, message: "Branch name is required" };
  if (!form.address?.trim())
    return { valid: false, message: "Address is required" };
  if (!form.phone?.trim())
    return { valid: false, message: "Phone number is required" };
  if (!isEdit && !form.email?.trim())
    return {
      valid: false,
      message: "Branch email is required to create a manager account",
    };
  if (
    form.email?.trim() &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
  ) {
    return { valid: false, message: "Please enter a valid email address" };
  }
  if (!form.lat?.toString().trim() || !form.lng?.toString().trim()) {
    return {
      valid: false,
      message:
        "Latitude and longitude are required so customers can find this branch on the map",
    };
  }
  const latNum = parseFloat(form.lat);
  const lngNum = parseFloat(form.lng);
  if (isNaN(latNum) || isNaN(lngNum))
    return {
      valid: false,
      message: "Latitude and longitude must be valid numbers",
    };
  if (latNum < -90 || latNum > 90)
    return { valid: false, message: "Latitude must be between -90 and 90" };
  if (lngNum < -180 || lngNum > 180)
    return { valid: false, message: "Longitude must be between -180 and 180" };
  if (Math.abs(latNum) < 0.0001 && Math.abs(lngNum) < 0.0001) {
    return {
      valid: false,
      message:
        "Coordinates look like a placeholder (0, 0) — please enter the exact pinned location",
    };
  }
  const latDecimals = (form.lat.toString().split(".")[1] || "").length;
  const lngDecimals = (form.lng.toString().split(".")[1] || "").length;
  if (latDecimals < 4 || lngDecimals < 4) {
    return {
      valid: false,
      message:
        "Please provide precise coordinates (at least 4 decimal places) so the branch is easy to find on the map",
    };
  }
  return { valid: true, message: "" };
};

const generatePassword = () => {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ",
    lower = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789",
    special = "!@#$%^&*";
  const all = upper + lower + digits + special;
  const rand = (s) => s[Math.floor(Math.random() * s.length)];
  const required = [rand(upper), rand(lower), rand(digits), rand(special)];
  const rest = Array.from({ length: 8 }, () => rand(all));
  return [...required, ...rest].sort(() => Math.random() - 0.5).join("");
};

// ── Module Selector sub-component ──
const ModuleSelector = ({ modules, onChange }) => {
  const [activeRole, setActiveRole] = useState("admin");
  const roleModules = ALL_MODULES[activeRole];
  const selected = modules[activeRole] || [];

  const toggleModule = (key) => {
    const next = selected.includes(key)
      ? selected.filter((k) => k !== key)
      : [...selected, key];
    onChange({ ...modules, [activeRole]: next });
  };

  const showServices = SERVICE_TRIGGER_MODULES.some((k) =>
    selected.includes(k),
  );

  return (
    <div
      style={{
        border: "1.5px solid var(--border)",
        borderRadius: 10,
        overflow: "hidden",
      }}
    >
      {/* Role tabs */}
      <div
        className="module-role-tabs"
        style={{
          display: "flex",
          borderBottom: "1.5px solid var(--border)",
          background: "#f8fafc",
        }}
      >
        {Object.keys(ALL_MODULES).map((role) => {
          const c = ROLE_COLORS[role];
          const isActive = activeRole === role;
          return (
            <button
              key={role}
              onClick={() => setActiveRole(role)}
              style={{
                flex: 1,
                padding: "8px 4px",
                fontSize: 12,
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                transition: "all 0.15s",
                background: isActive ? c.bg : "transparent",
                color: isActive ? c.text : "var(--muted)",
                borderBottom: isActive
                  ? `2px solid ${c.badge}`
                  : "2px solid transparent",
              }}
            >
              {ROLE_LABELS[role]}
              <span
                style={{
                  marginLeft: 4,
                  fontSize: 11,
                  background: isActive ? c.badge : "#e2e8f0",
                  color: isActive ? "#fff" : "var(--muted)",
                  padding: "1px 6px",
                  borderRadius: 99,
                }}
              >
                {(modules[role] || []).length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Module chips */}
      <div style={{ padding: "12px 14px", background: "#fff" }}>
        <p
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "var(--muted)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            margin: "0 0 10px",
          }}
        >
          Select modules for {ROLE_LABELS[activeRole]}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {roleModules.map((mod) => {
            const isOn = selected.includes(mod.key);
            const c = ROLE_COLORS[activeRole];
            return (
              <div
                key={mod.key}
                onClick={() => toggleModule(mod.key)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "5px 11px",
                  borderRadius: 99,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  userSelect: "none",
                  background: isOn ? c.badge : "#f1f5f9",
                  color: isOn ? "#fff" : "var(--muted)",
                  border: `1.5px solid ${isOn ? c.badge : "var(--border)"}`,
                }}
              >
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    opacity: isOn ? 1 : 0.6,
                  }}
                >
                  {MODULE_ICONS[mod.key]}
                </span>
                {mod.label}
                {isOn && (
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
            );
          })}
        </div>

        {/* Services — shown only when appointment or walk-in is active for this role */}
        {showServices && (
          <div
            style={{
              marginTop: 14,
              paddingTop: 12,
              borderTop: "1px dashed var(--border)",
            }}
          >
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "var(--muted)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                margin: "0 0 8px",
              }}
            >
              Available Services for {ROLE_LABELS[activeRole]}
            </p>
            {/* NOTE: Services are stored separately at top-level form.services — this just clarifies they apply */}
            <p style={{ fontSize: 11, color: "#64748b", margin: "0 0 8px" }}>
              ↳ The services below (set in the Services section) will be
              accessible under{" "}
              {SERVICE_TRIGGER_MODULES.filter((k) => selected.includes(k))
                .map(
                  (k) =>
                    ALL_MODULES[activeRole].find((m) => m.key === k)?.label,
                )
                .join(" & ")}{" "}
              for this role.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Branch View Panel ──
const BranchViewPanel = ({ branch }) => {
  const modules = branch.modules || {};
  const roles = Object.keys(ROLE_LABELS);

  return (
    <div
      className="view-panel"
      style={{
        borderTop: "1.5px solid var(--border)",
        padding: "14px 16px",
        background: "#f8fafc",
      }}
    >
      {/* Info row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "6px 16px",
          marginBottom: 12,
        }}
      >
        {[
          ["Email", branch.email],
          ["Manager", branch.manager],
          [
            "Coordinates",
            branch.lat && branch.lng ? `${branch.lat}, ${branch.lng}` : "—",
          ],
          ["Status", branch.status],
        ].map(([label, val]) => (
          <div key={label}>
            <p
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "#94a3b8",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                margin: "0 0 1px",
              }}
            >
              {label}
            </p>
            <p
              style={{
                fontSize: 12,
                color: "var(--text)",
                fontWeight: 600,
                margin: 0,
              }}
            >
              {val || "—"}
            </p>
          </div>
        ))}
      </div>

      {/* Services */}
      {branch.services && branch.services.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <p
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "#94a3b8",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              margin: "0 0 6px",
            }}
          >
            Services
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {branch.services.map((svc) => (
              <span
                key={svc}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "3px 10px",
                  borderRadius: 99,
                  background: "var(--light-blue)",
                  color: "var(--royal)",
                }}
              >
                {svc}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Modules per role */}
      {roles.some((r) => (modules[r] || []).length > 0) && (
        <div>
          <p
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "#94a3b8",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              margin: "0 0 8px",
            }}
          >
            Module Access
          </p>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}
          >
            {roles.map((role) => {
              const mods = modules[role] || [];
              if (!mods.length) return null;
              const c = ROLE_COLORS[role];
              return (
                <div
                  key={role}
                  style={{
                    background: c.bg,
                    border: `1px solid ${c.border}`,
                    borderRadius: 8,
                    padding: "8px 10px",
                  }}
                >
                  <p
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      color: c.text,
                      textTransform: "uppercase",
                      margin: "0 0 6px",
                    }}
                  >
                    {ROLE_LABELS[role]}
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                    {mods.map((k) => {
                      const def = ALL_MODULES[role]?.find((m) => m.key === k);
                      return def ? (
                        <span
                          key={k}
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            padding: "2px 7px",
                            borderRadius: 99,
                            background: c.badge,
                            color: "#fff",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 3,
                          }}
                        >
                          <span
                            style={{ display: "flex", alignItems: "center" }}
                          >
                            {MODULE_ICONS[def.key]}
                          </span>
                          {def.label}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const ConfirmDialog = ({
  show,
  title,
  message,
  accent = "#dc2626",
  confirmText = "Confirm",
  onConfirm,
  onCancel,
}) => {
  if (!show) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
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
          borderRadius: 14,
          width: "100%",
          maxWidth: 400,
          boxShadow: "0 20px 60px rgba(0,0,0,0.28)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            background:
              accent === "#dc2626"
                ? "linear-gradient(135deg,#fef2f2,#fee2e2)"
                : "linear-gradient(135deg,#fffbeb,#fef3c7)",
            padding: "18px 22px 14px",
            borderBottom: `1px solid ${accent}44`,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: "50%",
              background: accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {accent === "#dc2626" ? (
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#fff"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
            ) : (
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#fff"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            )}
          </div>
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: 15,
                fontWeight: 800,
                color: accent === "#dc2626" ? "#7f1d1d" : "#78350f",
              }}
            >
              {title}
            </h3>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: accent }}>
              {accent === "#dc2626"
                ? "This action cannot be undone"
                : "You have unsaved changes"}
            </p>
          </div>
        </div>
        <div style={{ padding: "16px 22px" }}>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              color: "var(--muted)",
              lineHeight: 1.6,
            }}
          >
            {message}
          </p>
        </div>
        <div
          style={{
            padding: "12px 22px 18px",
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
          }}
        >
          <button
            onClick={onCancel}
            style={{
              padding: "8px 18px",
              borderRadius: 8,
              border: "1.5px solid var(--border)",
              background: "var(--card)",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
              color: "var(--text)",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: "8px 18px",
              borderRadius: 8,
              border: "none",
              background: accent,
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

const Branches = () => {
  const { isAdmin, isSuperAdmin, isEmployee } = useCurrentUser();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editBranch, setEditBranch] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [createdAccount, setCreatedAccount] = useState(null);
  const [creating, setCreating] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [viewBranch, setViewBranch] = useState(null);
  const [toasts, setToasts] = useState([]);
  const toastIdRef = useRef(0);
  const [confirm, setConfirm] = useState({
    show: false,
    title: "",
    message: "",
    accent: "#dc2626",
    confirmText: "Confirm",
    onConfirm: null,
  });
  const [formDirty, setFormDirty] = useState(false);

  const showToast = (message, type = "success") => {
    const id = ++toastIdRef.current;
    setToasts((t) => [...t, { id, message, type, show: false }]);
    requestAnimationFrame(() => {
      setToasts((t) => t.map((x) => (x.id === id ? { ...x, show: true } : x)));
    });
    setTimeout(() => {
      setToasts((t) => t.map((x) => (x.id === id ? { ...x, show: false } : x)));
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 340);
    }, 3000);
  };

  const closeToast = (id) => {
    setToasts((t) => t.map((x) => (x.id === id ? { ...x, show: false } : x)));
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 340);
  };

  const mapDivRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  const [form, setForm] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    manager: "",
    status: "Active",
    services: [],
    lat: "",
    lng: "",
    modules: defaultModules(),
  });

  const placeMarkers = useCallback((list) => {
    if (!window.L || !mapRef.current) {
      setTimeout(() => placeMarkers(list), 200);
      return;
    }
    const L = window.L,
      map = mapRef.current;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    const validCoords = [];
    list.forEach((b) => {
      const lat = parseFloat(b.lat),
        lng = parseFloat(b.lng);
      if (isNaN(lat) || isNaN(lng)) return;
      const marker = L.marker([lat, lng], { icon: makeDivIcon(L) }).addTo(map);
      marker.bindPopup(
        `<div style="font-family:sans-serif;min-width:220px;padding:4px"><div style="font-weight:800;font-size:14px;color:#1e3a8a;margin-bottom:4px">${b.name}</div><div style="font-size:12px;color:#64748b;margin-bottom:4px">${b.address || ""}</div><div style="font-size:12px;color:#64748b">${b.phone || ""}</div></div>`,
        { maxWidth: 280 },
      );
      markersRef.current.push(marker);
      validCoords.push([lat, lng]);
    });
    if (validCoords.length > 0)
      map.fitBounds(validCoords, { padding: [40, 40] });
  }, []);

  const fetchBranches = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("branches")
      .select("*")
      .order("name");
    if (!error && data) setBranches(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);
  useEffect(() => {
    if (branches.length > 0) placeMarkers(branches);
  }, [branches, placeMarkers]);

  useEffect(() => {
    const initMap = () => {
      if (!mapDivRef.current || mapRef.current) return;
      const L = window.L;
      if (!L) return;
      const map = L.map(mapDivRef.current).setView([15.25, 120.58], 11);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);
      mapRef.current = map;
      setTimeout(() => {
        map.invalidateSize();
        if (branches.length > 0) placeMarkers(branches);
      }, 150);
    };
    if (window.L) {
      initMap();
    } else if (!document.getElementById("leaflet-js")) {
      const script = document.createElement("script");
      script.id = "leaflet-js";
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = initMap;
      document.head.appendChild(script);
    } else {
      const poll = setInterval(() => {
        if (window.L) {
          clearInterval(poll);
          initMap();
        }
      }, 100);
      return () => clearInterval(poll);
    }
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []); // eslint-disable-line

  const openAdd = () => {
    setForm({
      name: "",
      address: "",
      phone: "",
      email: "",
      manager: "",
      status: "Active",
      services: [],
      lat: "",
      lng: "",
      modules: emptyModules(),
    });
    setEditBranch(null);
    setFormDirty(false);
    setShowModal(true);
  };
  const openEdit = (b) => {
    setForm({
      ...b,
      services: b.services || [],
      lat: b.lat || "",
      lng: b.lng || "",
      modules: b.modules || defaultModules(),
    });
    setEditBranch(b);
    setFormDirty(false);
    setShowModal(true);
  };

  const handleModalClose = () => {
    if (formDirty) {
      setConfirm({
        show: true,
        title: "Discard Changes?",
        message:
          "You have unsaved changes. Are you sure you want to close without saving?",
        accent: "#f59e0b",
        confirmText: "Discard Changes",
        onConfirm: () => {
          setConfirm((c) => ({ ...c, show: false }));
          setShowModal(false);
          setFormDirty(false);
        },
      });
    } else {
      setShowModal(false);
    }
  };
  const toggleService = (svc) => {
    setFormDirty(true);
    setForm((prev) => ({
      ...prev,
      services: prev.services.includes(svc)
        ? prev.services.filter((s) => s !== svc)
        : [...prev.services, svc],
    }));
  };

  // Determine if services section should be shown (any role has appointment or walkin)
  const anyRoleHasServiceTrigger = Object.values(form.modules).some((mods) =>
    SERVICE_TRIGGER_MODULES.some((k) => mods.includes(k)),
  );

  const saveBranch = async () => {
    const check = validateBranchForm(form, !!editBranch);
    if (!check.valid) {
      showToast(check.message, "error");
      return;
    }
    setCreating(true);

    const payload = {
      name: form.name,
      address: form.address,
      phone: form.phone,
      email: form.email,
      manager: form.manager,
      status: form.status,
      services: form.services,
      lat: form.lat || null,
      lng: form.lng || null,
      modules: form.modules,
    };

    if (editBranch) {
      const { error } = await supabase
        .from("branches")
        .update(payload)
        .eq("id", editBranch.id);
      setCreating(false);
      if (error) {
        showToast("Failed to update branch: " + error.message, "error");
        return;
      }
      fetchBranches();
      setShowModal(false);
      setFormDirty(false);
      showToast("Branch updated successfully", "success");
    } else {
      const { error: insertError } = await supabase
        .from("branches")
        .insert([payload]);
      if (insertError) {
        setCreating(false);
        showToast("Error saving branch: " + insertError.message, "error");
        return;
      }

      try {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-branch-account`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({ email: form.email, branchName: form.name }),
          },
        );
        const result = await res.json();
        if (!result.success) throw new Error(result.error);
        setCreatedAccount({
          email: form.email,
          password: result.password,
          branchName: form.name,
        });
        showToast("Branch added & manager account created", "success");
      } catch (err) {
        showToast(
          `Branch saved! But account creation failed: ${err.message}`,
          "warning",
        );
      }

      setCreating(false);
      fetchBranches();
      setShowModal(false);
      setFormDirty(false);
    }
  };

  const doDelete = async () => {
    const { error } = await supabase
      .from("branches")
      .delete()
      .eq("id", deleteId);
    if (error) {
      showToast("Error deleting branch: " + error.message, "error");
      return;
    }
    fetchBranches();
    setDeleteId(null);
    showToast("Branch deleted", "info");
  };

  const handleDeleteClick = (id) => {
    setConfirm({
      show: true,
      title: "Delete Branch",
      message:
        "Are you sure you want to delete this branch? All associated data will be permanently removed and cannot be recovered.",
      accent: "#dc2626",
      confirmText: "Yes, Delete Branch",
      onConfirm: () => {
        setConfirm((c) => ({ ...c, show: false }));
        setDeleteId(id);
        doDelete();
      },
    });
  };

  return (
    <Layout>
      <BranchToastStack toasts={toasts} onClose={closeToast} />
      <div className="branches-page">
        <div className="branches-topbar-pos branches-topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img
              src="/icon/branches.png"
              alt=""
              style={{
                width: 22,
                height: 22,
                filter:
                  "brightness(0) saturate(100%) invert(17%) sepia(82%) saturate(1200%) hue-rotate(210deg)",
              }}
            />
            <div>
              <h1
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: "var(--text)",
                  margin: 0,
                  whiteSpace: "nowrap",
                }}
              >
                Branch Management
              </h1>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--muted)",
                  margin: 0,
                  whiteSpace: "nowrap",
                }}
              >
                Manage all hospital branches
              </p>
            </div>
            {isAdmin || isSuperAdmin ? (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "4px 10px",
                  borderRadius: 6,
                  background: "linear-gradient(135deg,#fef3c7,#fde68a)",
                  color: "#78350f",
                  border: "1.5px solid #f59e0b",
                  marginLeft: 10,
                }}
              >
                {isSuperAdmin
                  ? "Super Admin — Full Access"
                  : "Administrator View"}
              </span>
            ) : isEmployee ? (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "4px 10px",
                  borderRadius: 6,
                  background: "#f1f5f9",
                  color: "#475569",
                  border: "1px solid #e2e8f0",
                  marginLeft: 10,
                }}
              >
                Staff View
              </span>
            ) : null}
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
                  Add Branch
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 500,
                    color: "rgba(255,255,255,0.55)",
                  }}
                >
                  Register a new location
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
              onClick={openAdd}
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

        <div className="branches-content">
          <div
            className="branches-stats-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(195px,1fr))",
              gap: 14,
              marginBottom: 24,
            }}
          >
            {loading
              ? [1, 2].map((i) => (
                  <div key={i} className="stat-card">
                    <Skel w={48} h={48} />
                    <div
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      <Skel w="60%" h={12} />
                      <Skel w="40%" h={22} />
                    </div>
                  </div>
                ))
              : [
                  {
                    label: "Total Branches",
                    value: branches.length,
                    icon: "/icon/branches.png",
                    color: "blue",
                    sub: "All registered branches",
                  },
                  {
                    label: "Active",
                    value: branches.filter((b) => b.status === "Active").length,
                    icon: "/icon/available.png",
                    color: "green",
                    sub: "Currently operating",
                  },
                ].map((sc, i) => (
                  <div
                    key={i}
                    className={`stat-card-v2 ${sc.color} fade-in`}
                    style={{ animationDelay: `${i * 0.1}s` }}
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

          {(isAdmin || isSuperAdmin) && (
            <div
              style={{
                background: "linear-gradient(135deg,#1e1b4b,#312e81)",
                borderRadius: 14,
                padding: "18px 22px",
                marginBottom: 24,
                boxShadow: "0 8px 24px rgba(49,46,129,0.25)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 14,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  <h2 style={{ fontSize: 14, fontWeight: 800, color: "#fff", margin: 0 }}>
                    Branch Performance Overview
                  </h2>
                </div>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: "#fbbf24",
                    background: "rgba(251,191,36,0.15)",
                    border: "1px solid rgba(251,191,36,0.3)",
                    padding: "3px 9px",
                    borderRadius: 20,
                  }}
                >
                  Not visible to Employee/Manager
                </span>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {["Branch", "Status", "Services", "Modules Enabled"].map((h) => (
                        <th
                          key={h}
                          style={{
                            textAlign: "left",
                            fontSize: 10,
                            fontWeight: 700,
                            color: "rgba(255,255,255,0.5)",
                            textTransform: "uppercase",
                            letterSpacing: 0.5,
                            padding: "6px 10px",
                            borderBottom: "1px solid rgba(255,255,255,0.12)",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {branches.map((b) => {
                      const totalModules = Object.values(b.modules || {}).reduce(
                        (sum, arr) => sum + (arr?.length || 0),
                        0,
                      );
                      return (
                        <tr key={b.id}>
                          <td style={{ padding: "8px 10px", fontSize: 12, fontWeight: 700, color: "#fff" }}>
                            {b.name}
                          </td>
                          <td style={{ padding: "8px 10px", fontSize: 12, color: "rgba(255,255,255,0.75)" }}>
                            {b.status}
                          </td>
                          <td style={{ padding: "8px 10px", fontSize: 12, color: "rgba(255,255,255,0.75)" }}>
                            {(b.services || []).length}
                          </td>
                          <td style={{ padding: "8px 10px", fontSize: 12, color: "rgba(255,255,255,0.75)" }}>
                            {totalModules}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Map */}
          <div
            style={{
              background: "var(--card)",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--border)",
              boxShadow: "var(--shadow)",
              marginBottom: 24,
              overflow: "hidden",
              position: "relative",
              zIndex: 0,
            }}
          >
            <div
              style={{
                padding: "14px 20px",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>
                Branch Locations
              </h2>
            </div>
            <div
              ref={mapDivRef}
              style={{
                height: 420,
                width: "100%",
                position: "relative",
                zIndex: 0,
              }}
            />
          </div>

          {/* Branch Cards */}
          {loading ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))",
                gap: 12,
              }}
            >
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  style={{
                    background: "#fff",
                    border: "1.5px solid #e2e8f0",
                    borderRadius: 14,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{ height: 80, background: "#f1f5f9" }}
                    className="skel"
                  />
                  <div style={{ padding: 16 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 12,
                      }}
                    >
                      <Skel w="55%" h={14} />
                      <Skel w="20%" h={20} />
                    </div>
                    <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                      <Skel w={13} h={13} />
                      <Skel w="75%" h={12} />
                    </div>
                    <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                      <Skel w={13} h={13} />
                      <Skel w="50%" h={12} />
                    </div>
                    <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                      <Skel w={13} h={13} />
                      <Skel w="60%" h={12} />
                    </div>
                    <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                      <Skel w="25%" h={24} />
                      <Skel w="25%" h={24} />
                      <Skel w="25%" h={24} />
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <Skel w="30%" h={30} />
                      <Skel w="30%" h={30} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              className="branch-cards-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))",
                gap: 12,
                alignItems: "stretch",
              }}
            >
              {branches.map((b) => {
                const isExpanded = expandedId === b.id;
                return (
                  <div
                    key={b.id}
                    className="fade-in"
                    style={{
                      background: "var(--card)",
                      border: "1.5px solid var(--border)",
                      borderRadius: "var(--radius-lg)",
                      overflow: "hidden",
                      transition: "all 0.2s",
                      boxShadow: isExpanded
                        ? "0 4px 24px rgba(30,58,138,0.13)"
                        : "var(--shadow)",
                      display: "flex",
                      flexDirection: "column",
                      height: "100%",
                    }}
                  >
                    <div
                      style={{
                        height: 88,
                        background: "var(--light-blue)",
                        display: "flex",
                        alignItems: "flex-end",
                        justifyContent: "center",
                        overflow: "hidden",
                        position: "relative",
                        borderBottom: "1.5px solid #c7d2fe",
                      }}
                    >
                      <svg
                        viewBox="0 0 300 88"
                        xmlns="http://www.w3.org/2000/svg"
                        style={{
                          width: "100%",
                          height: "100%",
                          position: "absolute",
                          inset: 0,
                        }}
                      >
                        {/* sky bg */}
                        <rect width="300" height="88" fill="#eef2ff" />
                        {/* clouds */}
                        <ellipse
                          cx="60"
                          cy="22"
                          rx="22"
                          ry="9"
                          fill="#fff"
                          opacity="0.7"
                        />
                        <ellipse
                          cx="75"
                          cy="18"
                          rx="14"
                          ry="8"
                          fill="#fff"
                          opacity="0.7"
                        />
                        <ellipse
                          cx="230"
                          cy="28"
                          rx="18"
                          ry="7"
                          fill="#fff"
                          opacity="0.6"
                        />
                        <ellipse
                          cx="244"
                          cy="24"
                          rx="12"
                          ry="6"
                          fill="#fff"
                          opacity="0.6"
                        />
                        {/* ground */}
                        <rect
                          x="0"
                          y="76"
                          width="300"
                          height="12"
                          fill="#c7d2fe"
                        />
                        {/* left small building */}
                        <rect
                          x="20"
                          y="46"
                          width="36"
                          height="30"
                          rx="2"
                          fill="#a5b4fc"
                        />
                        <rect
                          x="26"
                          y="52"
                          width="7"
                          height="8"
                          rx="1"
                          fill="#e0e7ff"
                        />
                        <rect
                          x="38"
                          y="52"
                          width="7"
                          height="8"
                          rx="1"
                          fill="#e0e7ff"
                        />
                        <rect
                          x="26"
                          y="65"
                          width="7"
                          height="8"
                          rx="1"
                          fill="#e0e7ff"
                        />
                        <rect
                          x="38"
                          y="65"
                          width="7"
                          height="8"
                          rx="1"
                          fill="#e0e7ff"
                        />
                        {/* main center building */}
                        <rect
                          x="95"
                          y="22"
                          width="110"
                          height="54"
                          rx="3"
                          fill="#6366f1"
                        />
                        {/* main building windows */}
                        <rect
                          x="108"
                          y="30"
                          width="12"
                          height="10"
                          rx="1"
                          fill="#e0e7ff"
                          opacity="0.9"
                        />
                        <rect
                          x="127"
                          y="30"
                          width="12"
                          height="10"
                          rx="1"
                          fill="#e0e7ff"
                          opacity="0.9"
                        />
                        <rect
                          x="146"
                          y="30"
                          width="12"
                          height="10"
                          rx="1"
                          fill="#e0e7ff"
                          opacity="0.9"
                        />
                        <rect
                          x="165"
                          y="30"
                          width="12"
                          height="10"
                          rx="1"
                          fill="#e0e7ff"
                          opacity="0.9"
                        />
                        <rect
                          x="108"
                          y="46"
                          width="12"
                          height="10"
                          rx="1"
                          fill="#c7d2fe"
                          opacity="0.8"
                        />
                        <rect
                          x="127"
                          y="46"
                          width="12"
                          height="10"
                          rx="1"
                          fill="#e0e7ff"
                          opacity="0.9"
                        />
                        <rect
                          x="146"
                          y="46"
                          width="12"
                          height="10"
                          rx="1"
                          fill="#c7d2fe"
                          opacity="0.8"
                        />
                        <rect
                          x="165"
                          y="46"
                          width="12"
                          height="10"
                          rx="1"
                          fill="#e0e7ff"
                          opacity="0.9"
                        />
                        <rect
                          x="108"
                          y="62"
                          width="12"
                          height="10"
                          rx="1"
                          fill="#e0e7ff"
                          opacity="0.9"
                        />
                        <rect
                          x="165"
                          y="62"
                          width="12"
                          height="10"
                          rx="1"
                          fill="#c7d2fe"
                          opacity="0.8"
                        />
                        {/* main building door */}
                        <rect
                          x="135"
                          y="60"
                          width="30"
                          height="16"
                          rx="2"
                          fill="#312e81"
                        />
                        <circle cx="161" cy="68" r="2" fill="#a5b4fc" />
                        {/* right small building */}
                        <rect
                          x="244"
                          y="40"
                          width="40"
                          height="36"
                          rx="2"
                          fill="#818cf8"
                        />
                        <rect
                          x="250"
                          y="47"
                          width="8"
                          height="8"
                          rx="1"
                          fill="#e0e7ff"
                        />
                        <rect
                          x="263"
                          y="47"
                          width="8"
                          height="8"
                          rx="1"
                          fill="#e0e7ff"
                        />
                        <rect
                          x="250"
                          y="60"
                          width="8"
                          height="8"
                          rx="1"
                          fill="#e0e7ff"
                        />
                        <rect
                          x="263"
                          y="60"
                          width="8"
                          height="8"
                          rx="1"
                          fill="#e0e7ff"
                        />
                        {/* flag */}
                        <line
                          x1="150"
                          y1="8"
                          x2="150"
                          y2="22"
                          stroke="#4338ca"
                          strokeWidth="1.5"
                        />
                        <polygon points="150,8 162,12 150,16" fill="#dc2626" />
                      </svg>
                    </div>
                    <div
                      style={{
                        padding: 16,
                        display: "flex",
                        flexDirection: "column",
                        flex: 1,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          marginBottom: 8,
                          gap: 8,
                        }}
                      >
                        <h3
                          style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: "var(--text)",
                            margin: 0,
                            minWidth: 0,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {b.name}
                        </h3>
                        <span
                          className={`badge ${b.status === "Active" ? "badge-green" : "badge-red"}`}
                          style={{ flexShrink: 0 }}
                        >
                          {b.status}
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 6,
                          marginBottom: 5,
                        }}
                      >
                        <img
                          src="/icon/location.png"
                          alt=""
                          style={{
                            width: 13,
                            height: 13,
                            marginTop: 1,
                            flexShrink: 0,
                            filter: "brightness(0) saturate(100%) invert(40%)",
                          }}
                        />
                        <p
                          style={{
                            fontSize: 12,
                            color: "var(--muted)",
                            margin: 0,
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                            lineHeight: 1.4,
                          }}
                        >
                          {b.address}
                        </p>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          marginBottom: 5,
                        }}
                      >
                        <img
                          src="/icon/phone.png"
                          alt=""
                          style={{
                            width: 13,
                            height: 13,
                            flexShrink: 0,
                            filter: "brightness(0) saturate(100%) invert(40%)",
                          }}
                        />
                        <p
                          style={{
                            fontSize: 12,
                            color: "var(--muted)",
                            margin: 0,
                          }}
                        >
                          {b.phone}
                        </p>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          marginBottom: 10,
                        }}
                      >
                        <img
                          src="/icon/admin.png"
                          alt=""
                          style={{
                            width: 13,
                            height: 13,
                            flexShrink: 0,
                            filter: "brightness(0) saturate(100%) invert(40%)",
                          }}
                        />
                        <p
                          style={{
                            fontSize: 12,
                            color: "var(--muted)",
                            margin: 0,
                          }}
                        >
                          Manager: <strong>{b.manager}</strong>
                        </p>
                      </div>

                      {/* Service badges (compact preview) */}
                      <div style={{ minHeight: 26, marginBottom: 12 }}>
                        {b.services && b.services.length > 0 && !isExpanded && (
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 4,
                            }}
                          >
                            {b.services.slice(0, 3).map((svc) => (
                              <span
                                key={svc}
                                style={{
                                  fontSize: 11,
                                  fontWeight: 600,
                                  padding: "3px 10px",
                                  borderRadius: 99,
                                  background: "var(--light-blue)",
                                  color: "var(--royal)",
                                }}
                              >
                                {svc}
                              </span>
                            ))}
                            {b.services.length > 3 && (
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 600,
                                  padding: "3px 10px",
                                  borderRadius: 99,
                                  background: "#f1f5f9",
                                  color: "var(--muted)",
                                }}
                              >
                                +{b.services.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: 6,
                          flexWrap: "wrap",
                          marginTop: "auto",
                        }}
                      >
                        <button
                          title="Edit"
                          style={{
                            height: 28,
                            padding: "0 10px",
                            gap: 5,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: "#f8fafc",
                            border: "1.5px solid #e2e8f0",
                            color: "#475569",
                            borderRadius: 20,
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                          onClick={() => openEdit(b)}
                        >
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                          Edit
                        </button>
                        <button
                          title="Delete"
                          style={{
                            height: 28,
                            padding: "0 10px",
                            gap: 5,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: "#fef2f2",
                            border: "1.5px solid #fca5a5",
                            color: "#dc2626",
                            borderRadius: 20,
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                          onClick={() => handleDeleteClick(b.id)}
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
                            <path d="M10 11v6M14 11v6" />
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                          </svg>
                          Delete
                        </button>
                        <button
                          title="View"
                          style={{
                            height: 28,
                            padding: "0 10px",
                            gap: 5,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: "#eff6ff",
                            border: "1.5px solid #bfdbfe",
                            color: "#1d4ed8",
                            borderRadius: 20,
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: "pointer",
                            marginLeft: "auto",
                          }}
                          onClick={() => setViewBranch(b)}
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
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                          View
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── VIEW BRANCH MODAL ── */}
      {viewBranch && (
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
            className="branch-view-modal-box"
            style={{
              background: "var(--card)",
              borderRadius: 14,
              width: "100%",
              maxWidth: 520,
              maxHeight: "90vh",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
            }}
          >
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <img
                  src="/icon/branches.png"
                  alt=""
                  style={{
                    width: 18,
                    height: 18,
                    filter:
                      "brightness(0) saturate(100%) invert(17%) sepia(82%) saturate(1200%) hue-rotate(210deg)",
                  }}
                />
                <h3 style={{ margin: 0 }}>{viewBranch.name}</h3>
                <span
                  className={`badge ${viewBranch.status === "Active" ? "badge-green" : "badge-red"}`}
                >
                  {viewBranch.status}
                </span>
              </div>
              <button
                className="btn btn-primary branches-btn-auto"
                onClick={() => setViewBranch(null)}
              >
                Close
              </button>
            </div>
            <div
              className="modal-body"
              style={{ display: "flex", flexDirection: "column", gap: 20 }}
            >
              {/* Branch Image */}
              {(() => {
                const BRANCH_IMAGES = {
                  Angeles: "Friendship-angeles.jpg",
                  Magalang: "magalang.jpg",
                  Main: "main-hospital.jpg",
                  "San Fernando": "San_Fernando.jpg",
                  Tarlac: "Tarlac.jpg",
                  Mabiga: "mabiga.jpg",
                };
                const img = BRANCH_IMAGES[viewBranch.name];
                return img ? (
                  <div
                    style={{
                      borderRadius: 10,
                      overflow: "hidden",
                      border: "1.5px solid var(--border)",
                      background: "#f8fafc",
                    }}
                  >
                    <img
                      src={`/image/${img}`}
                      alt={viewBranch.name}
                      style={{
                        width: "100%",
                        height: "auto",
                        display: "block",
                      }}
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  </div>
                ) : null;
              })()}
              {/* Basic Info */}
              <div
                style={{
                  background: "#f8fafc",
                  borderRadius: 10,
                  border: "1.5px solid var(--border)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "10px 14px",
                    borderBottom: "1.5px solid var(--border)",
                    background: "#f1f5f9",
                  }}
                >
                  <p
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#64748b",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      margin: 0,
                    }}
                  >
                    Branch Info
                  </p>
                </div>
                {[
                  {
                    icon: (
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      >
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                    ),
                    label: "Address",
                    val: viewBranch.address,
                  },
                  {
                    icon: (
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      >
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.06 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16z" />
                      </svg>
                    ),
                    label: "Phone",
                    val: viewBranch.phone,
                  },
                  {
                    icon: (
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      >
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                    ),
                    label: "Email",
                    val: viewBranch.email,
                  },
                  {
                    icon: (
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      >
                        <circle cx="12" cy="8" r="4" />
                        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                      </svg>
                    ),
                    label: "Manager",
                    val: viewBranch.manager,
                  },
                  {
                    icon: (
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="2" y1="12" x2="22" y2="12" />
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                      </svg>
                    ),
                    label: "Coordinates",
                    val:
                      viewBranch.lat && viewBranch.lng
                        ? `${viewBranch.lat}, ${viewBranch.lng}`
                        : "—",
                  },
                ].map(({ icon, label, val }, i, arr) => (
                  <div
                    key={label}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      padding: "10px 14px",
                      borderBottom:
                        i < arr.length - 1 ? "1px solid var(--border)" : "none",
                      background: i % 2 === 0 ? "#fff" : "#f8fafc",
                    }}
                  >
                    <span
                      style={{
                        color: "#94a3b8",
                        flexShrink: 0,
                        marginTop: 2,
                        display: "flex",
                      }}
                    >
                      {icon}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: "#94a3b8",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          margin: "0 0 2px",
                        }}
                      >
                        {label}
                      </p>
                      <p
                        style={{
                          fontSize: 13,
                          color: "var(--text)",
                          fontWeight: 600,
                          margin: 0,
                          wordBreak: "break-word",
                        }}
                      >
                        {val || "—"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Services */}
              {viewBranch.services && viewBranch.services.length > 0 && (
                <div>
                  <p
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#94a3b8",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      margin: "0 0 8px",
                    }}
                  >
                    Services
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {viewBranch.services.map((svc) => (
                      <span
                        key={svc}
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          padding: "4px 12px",
                          borderRadius: 99,
                          background: "var(--light-blue)",
                          color: "var(--royal)",
                        }}
                      >
                        {svc}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Module Access per role */}
              {(() => {
                const modules = viewBranch.modules || {};
                const roles = Object.keys(ROLE_LABELS);
                const hasAny = roles.some((r) => (modules[r] || []).length > 0);
                if (!hasAny) return null;
                return (
                  <div>
                    <p
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#94a3b8",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        margin: "0 0 10px",
                      }}
                    >
                      Module Access
                    </p>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 10,
                      }}
                    >
                      {roles.map((role) => {
                        const mods = modules[role] || [];
                        if (!mods.length) return null;
                        const c = ROLE_COLORS[role];
                        return (
                          <div
                            key={role}
                            style={{
                              background: c.bg,
                              border: `1.5px solid ${c.border}`,
                              borderRadius: 10,
                              padding: "10px 12px",
                            }}
                          >
                            <p
                              style={{
                                fontSize: 11,
                                fontWeight: 800,
                                color: c.text,
                                textTransform: "uppercase",
                                letterSpacing: "0.04em",
                                margin: "0 0 8px",
                              }}
                            >
                              {ROLE_LABELS[role]}
                              <span
                                style={{
                                  marginLeft: 6,
                                  fontSize: 10,
                                  background: c.badge,
                                  color: "#fff",
                                  padding: "1px 6px",
                                  borderRadius: 99,
                                }}
                              >
                                {mods.length}
                              </span>
                            </p>
                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 4,
                              }}
                            >
                              {mods.map((k) => {
                                const def = ALL_MODULES[role]?.find(
                                  (m) => m.key === k,
                                );
                                return def ? (
                                  <span
                                    key={k}
                                    style={{
                                      fontSize: 11,
                                      fontWeight: 600,
                                      padding: "3px 8px",
                                      borderRadius: 99,
                                      background: c.badge,
                                      color: "#fff",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 4,
                                    }}
                                  >
                                    <span
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                      }}
                                    >
                                      {MODULE_ICONS[def.key]}
                                    </span>
                                    {def.label}
                                  </span>
                                ) : null;
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-primary branches-btn-auto"
                onClick={() => setViewBranch(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD/EDIT MODAL ── */}
      {showModal && (
        <div
          className="branch-modal-overlay"
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
            className="branch-modal-box"
            style={{
              background: "var(--card)",
              borderRadius: 14,
              width: "100%",
              maxWidth: 600,
              maxHeight: "90vh",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
            }}
          >
            <div>
              {!editBranch && (
                <div
                  className="branch-modal-banner"
                  style={{
                    height: 110,
                    background: "#eef2ff",
                    display: "flex",
                    alignItems: "flex-end",
                    justifyContent: "center",
                    overflow: "hidden",
                    position: "relative",
                    borderBottom: "1.5px solid #c7d2fe",
                  }}
                >
                  <svg
                    viewBox="0 0 600 110"
                    xmlns="http://www.w3.org/2000/svg"
                    style={{
                      width: "100%",
                      height: "100%",
                      position: "absolute",
                      inset: 0,
                    }}
                  >
                    <rect width="600" height="110" fill="#eef2ff" />
                    <ellipse
                      cx="100"
                      cy="32"
                      rx="30"
                      ry="12"
                      fill="#fff"
                      opacity="0.7"
                    />
                    <ellipse
                      cx="122"
                      cy="26"
                      rx="20"
                      ry="11"
                      fill="#fff"
                      opacity="0.7"
                    />
                    <ellipse
                      cx="470"
                      cy="36"
                      rx="26"
                      ry="10"
                      fill="#fff"
                      opacity="0.6"
                    />
                    <ellipse
                      cx="490"
                      cy="30"
                      rx="18"
                      ry="9"
                      fill="#fff"
                      opacity="0.6"
                    />
                    <rect x="0" y="96" width="600" height="14" fill="#c7d2fe" />
                    {/* left building */}
                    <rect
                      x="40"
                      y="58"
                      width="60"
                      height="38"
                      rx="2"
                      fill="#a5b4fc"
                    />
                    <rect
                      x="50"
                      y="66"
                      width="10"
                      height="10"
                      rx="1"
                      fill="#e0e7ff"
                    />
                    <rect
                      x="66"
                      y="66"
                      width="10"
                      height="10"
                      rx="1"
                      fill="#e0e7ff"
                    />
                    <rect
                      x="82"
                      y="66"
                      width="10"
                      height="10"
                      rx="1"
                      fill="#e0e7ff"
                    />
                    <rect
                      x="50"
                      y="82"
                      width="10"
                      height="10"
                      rx="1"
                      fill="#e0e7ff"
                    />
                    <rect
                      x="82"
                      y="82"
                      width="10"
                      height="10"
                      rx="1"
                      fill="#e0e7ff"
                    />
                    {/* center main building */}
                    <rect
                      x="200"
                      y="20"
                      width="200"
                      height="76"
                      rx="3"
                      fill="#6366f1"
                    />
                    <rect
                      x="218"
                      y="32"
                      width="16"
                      height="13"
                      rx="1"
                      fill="#e0e7ff"
                      opacity="0.9"
                    />
                    <rect
                      x="242"
                      y="32"
                      width="16"
                      height="13"
                      rx="1"
                      fill="#e0e7ff"
                      opacity="0.9"
                    />
                    <rect
                      x="266"
                      y="32"
                      width="16"
                      height="13"
                      rx="1"
                      fill="#e0e7ff"
                      opacity="0.9"
                    />
                    <rect
                      x="290"
                      y="32"
                      width="16"
                      height="13"
                      rx="1"
                      fill="#e0e7ff"
                      opacity="0.9"
                    />
                    <rect
                      x="314"
                      y="32"
                      width="16"
                      height="13"
                      rx="1"
                      fill="#c7d2fe"
                      opacity="0.9"
                    />
                    <rect
                      x="338"
                      y="32"
                      width="16"
                      height="13"
                      rx="1"
                      fill="#e0e7ff"
                      opacity="0.9"
                    />
                    <rect
                      x="218"
                      y="52"
                      width="16"
                      height="13"
                      rx="1"
                      fill="#c7d2fe"
                      opacity="0.8"
                    />
                    <rect
                      x="242"
                      y="52"
                      width="16"
                      height="13"
                      rx="1"
                      fill="#e0e7ff"
                      opacity="0.9"
                    />
                    <rect
                      x="266"
                      y="52"
                      width="16"
                      height="13"
                      rx="1"
                      fill="#e0e7ff"
                      opacity="0.9"
                    />
                    <rect
                      x="290"
                      y="52"
                      width="16"
                      height="13"
                      rx="1"
                      fill="#c7d2fe"
                      opacity="0.8"
                    />
                    <rect
                      x="314"
                      y="52"
                      width="16"
                      height="13"
                      rx="1"
                      fill="#e0e7ff"
                      opacity="0.9"
                    />
                    <rect
                      x="338"
                      y="52"
                      width="16"
                      height="13"
                      rx="1"
                      fill="#c7d2fe"
                      opacity="0.8"
                    />
                    <rect
                      x="218"
                      y="72"
                      width="16"
                      height="13"
                      rx="1"
                      fill="#e0e7ff"
                      opacity="0.9"
                    />
                    <rect
                      x="338"
                      y="72"
                      width="16"
                      height="13"
                      rx="1"
                      fill="#e0e7ff"
                      opacity="0.9"
                    />
                    {/* door */}
                    <rect
                      x="272"
                      y="72"
                      width="56"
                      height="24"
                      rx="2"
                      fill="#312e81"
                    />
                    <circle cx="324" cy="84" r="3" fill="#818cf8" />
                    {/* flag */}
                    <line
                      x1="300"
                      y1="6"
                      x2="300"
                      y2="20"
                      stroke="#4338ca"
                      strokeWidth="2"
                    />
                    <polygon points="300,6 318,11 300,16" fill="#dc2626" />
                    {/* right building */}
                    <rect
                      x="500"
                      y="50"
                      width="64"
                      height="46"
                      rx="2"
                      fill="#818cf8"
                    />
                    <rect
                      x="510"
                      y="60"
                      width="10"
                      height="10"
                      rx="1"
                      fill="#e0e7ff"
                    />
                    <rect
                      x="526"
                      y="60"
                      width="10"
                      height="10"
                      rx="1"
                      fill="#e0e7ff"
                    />
                    <rect
                      x="542"
                      y="60"
                      width="10"
                      height="10"
                      rx="1"
                      fill="#e0e7ff"
                    />
                    <rect
                      x="510"
                      y="76"
                      width="10"
                      height="10"
                      rx="1"
                      fill="#e0e7ff"
                    />
                    <rect
                      x="542"
                      y="76"
                      width="10"
                      height="10"
                      rx="1"
                      fill="#e0e7ff"
                    />
                  </svg>
                  <button
                    onClick={handleModalClose}
                    style={{
                      position: "absolute",
                      top: 10,
                      right: 14,
                      background: "rgba(255,255,255,0.8)",
                      border: "1px solid #c7d2fe",
                      borderRadius: 6,
                      width: 28,
                      height: 28,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      zIndex: 2,
                    }}
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#6366f1"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              )}
              {editBranch && (
                <div className="modal-header">
                  <h3>Edit Branch</h3>
                  <button
                    className="btn btn-ghost btn-icon branches-btn-auto"
                    onClick={handleModalClose}
                  >
                    ✕
                  </button>
                </div>
              )}
              {!editBranch && (
                <div
                  style={{
                    padding: "16px 24px 0",
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
                        fontWeight: 800,
                        color: "#1e1b4b",
                      }}
                    >
                      Add New Branch
                    </h3>
                    <p
                      style={{
                        margin: "2px 0 0",
                        fontSize: 12,
                        color: "#6366f1",
                      }}
                    >
                      A manager account will be created automatically
                    </p>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-body">
              {!editBranch && (
                <div
                  style={{
                    background: "#eff6ff",
                    border: "1px solid #bfdbfe",
                    borderRadius: 8,
                    padding: "10px 14px",
                    fontSize: 12,
                    color: "#1e40af",
                    marginBottom: 16,
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
                    stroke="#1e40af"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    style={{ marginTop: 1, flexShrink: 0 }}
                  >
                    <circle cx="12" cy="12" r="9" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>
                    Adding a branch will automatically create a{" "}
                    <strong>manager account</strong> using the email below. The
                    credentials will be shown after saving.
                  </span>
                </div>
              )}
              <div className="form-grid">
                <div className="form-group form-full">
                  <label>Branch Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => {
                      setFormDirty(true);
                      setForm({ ...form, name: e.target.value });
                    }}
                    placeholder="e.g. Tarlac City Branch"
                  />
                </div>
                <div className="form-group form-full">
                  <label>
                    Address <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => {
                      setFormDirty(true);
                      setForm({ ...form, address: e.target.value });
                    }}
                    placeholder="Full address"
                  />
                </div>
                <div className="form-group">
                  <label>
                    Phone <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={11}
                    value={form.phone}
                    onChange={(e) => {
                      const digitsOnly = e.target.value
                        .replace(/\D/g, "")
                        .slice(0, 11);
                      setFormDirty(true);
                      setForm({ ...form, phone: digitsOnly });
                    }}
                    placeholder="09XXXXXXXXX"
                  />
                </div>
                <div className="form-group">
                  <label>
                    Branch Email{" "}
                    {!editBranch && <span style={{ color: "#dc2626" }}>*</span>}
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => {
                      setFormDirty(true);
                      setForm({ ...form, email: e.target.value });
                    }}
                    placeholder="manager@ach.com"
                  />
                </div>
                <div className="form-group">
                  <label>Manager Name</label>
                  <input
                    type="text"
                    value={form.manager}
                    onChange={(e) => {
                      setFormDirty(true);
                      setForm({ ...form, manager: e.target.value });
                    }}
                  />
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <CustomSelect
                    value={form.status}
                    onChange={(val) => {
                      setFormDirty(true);
                      setForm({ ...form, status: val });
                    }}
                    placeholder="— Select Status —"
                    options={["Active", "Inactive"]}
                  />
                </div>
                <div className="form-group">
                  <label>
                    Latitude <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={form.lat}
                    onChange={(e) => {
                      setFormDirty(true);
                      setForm({ ...form, lat: e.target.value });
                    }}
                    placeholder="e.g. 15.205205"
                  />
                </div>
                <div className="form-group">
                  <label>
                    Longitude <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={form.lng}
                    onChange={(e) => {
                      setFormDirty(true);
                      setForm({ ...form, lng: e.target.value });
                    }}
                    placeholder="e.g. 120.580370"
                  />
                  {(form.lat || form.lng) &&
                    !validateBranchForm(form, !!editBranch).valid &&
                    validateBranchForm(form, !!editBranch)
                      .message.toLowerCase()
                      .includes("coordinate") && (
                      <p
                        style={{
                          fontSize: 11,
                          color: "#dc2626",
                          margin: "4px 0 0",
                        }}
                      >
                        {validateBranchForm(form, !!editBranch).message}
                      </p>
                    )}
                </div>

                {/* ── MODULE SELECTOR ── */}
                <div className="form-group form-full">
                  <label style={{ marginBottom: 8, display: "block" }}>
                    Module Access
                  </label>
                  <ModuleSelector
                    modules={form.modules}
                    onChange={(mods) => {
                      setFormDirty(true);
                      setForm((prev) => ({ ...prev, modules: mods }));
                    }}
                  />
                </div>

                {/* ── SERVICES — only when any role has appointment or walk-in ── */}
                {anyRoleHasServiceTrigger && (
                  <div className="form-group form-full">
                    <label
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      Services
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: "#64748b",
                          background: "#f1f5f9",
                          padding: "2px 8px",
                          borderRadius: 99,
                        }}
                      >
                        shown because Appointment / Walk-in is enabled
                      </span>
                    </label>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 8,
                        marginTop: 6,
                      }}
                    >
                      {SERVICES_LIST.map((svc) => (
                        <div
                          key={svc}
                          onClick={() => toggleService(svc)}
                          style={{
                            padding: "5px 12px",
                            borderRadius: 99,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                            background: form.services.includes(svc)
                              ? "var(--royal)"
                              : "var(--bg)",
                            color: form.services.includes(svc)
                              ? "#fff"
                              : "var(--muted)",
                            border: `1.5px solid ${form.services.includes(svc) ? "var(--royal)" : "var(--border)"}`,
                            transition: "all 0.15s",
                          }}
                        >
                          {svc}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-ghost branches-btn-auto"
                onClick={handleModalClose}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary branches-btn-auto"
                onClick={saveBranch}
                disabled={
                  creating || !validateBranchForm(form, !!editBranch).valid
                }
                style={{
                  opacity:
                    creating || !validateBranchForm(form, !!editBranch).valid
                      ? 0.5
                      : 1,
                  cursor:
                    creating || !validateBranchForm(form, !!editBranch).valid
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                {creating
                  ? "Saving…"
                  : editBranch
                    ? "Save Branch"
                    : "Add Branch & Create Account"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CREDENTIALS POPUP ── */}
      {createdAccount && (
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
              background: "#fff",
              borderRadius: 14,
              width: "100%",
              maxWidth: 400,
              boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                background: "linear-gradient(135deg,#f0fdf4,#dcfce7)",
                padding: "20px 24px 16px",
                borderBottom: "1px solid #bbf7d0",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    background: "#16a34a",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#fff"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: 16,
                      fontWeight: 800,
                      color: "#14532d",
                    }}
                  >
                    Branch Account Created!
                  </h3>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 12,
                      color: "#16a34a",
                      marginTop: 2,
                    }}
                  >
                    Share these credentials with the branch manager
                  </p>
                </div>
              </div>
            </div>
            <div style={{ padding: "20px 24px" }}>
              <p
                style={{
                  margin: "0 0 14px",
                  fontSize: 13,
                  color: "var(--muted)",
                }}
              >
                A manager account has been created for{" "}
                <strong>{createdAccount.branchName}</strong>.
              </p>
              {[
                ["Branch", createdAccount.branchName],
                ["Email", createdAccount.email],
                ["Password", createdAccount.password],
              ].map(([label, value]) => (
                <div key={label} style={{ marginBottom: 12 }}>
                  <p
                    style={{
                      margin: "0 0 4px",
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--muted)",
                      textTransform: "uppercase",
                    }}
                  >
                    {label}
                  </p>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      background: "#f8fafc",
                      border: "1.5px solid var(--border)",
                      borderRadius: 8,
                      padding: "9px 14px",
                    }}
                  >
                    <span
                      style={{
                        flex: 1,
                        fontSize: 13,
                        fontWeight: 600,
                        fontFamily:
                          label === "Password" ? "monospace" : "inherit",
                      }}
                    >
                      {value}
                    </span>
                    <button
                      className="btn btn-ghost btn-sm branches-btn-auto"
                      onClick={() => navigator.clipboard.writeText(value)}
                    >
                      Copy
                    </button>
                  </div>
                </div>
              ))}
              <div
                style={{
                  background: "#fffbeb",
                  border: "1px solid #fde68a",
                  borderRadius: 8,
                  padding: "10px 14px",
                  fontSize: 12,
                  color: "#92400e",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  marginTop: 4,
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#92400e"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  style={{ marginTop: 1, flexShrink: 0 }}
                >
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <span>
                  This password will <strong>not</strong> be shown again. Copy
                  it before closing. Tell the manager to change their password
                  after first login.
                </span>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                padding: "14px 24px",
                borderTop: "1px solid var(--border)",
              }}
            >
              <button
                className="btn btn-ghost branches-btn-auto"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `Branch: ${createdAccount.branchName}\nEmail: ${createdAccount.email}\nPassword: ${createdAccount.password}`,
                  );
                }}
              >
                Copy All
              </button>
              <button
                className="btn btn-primary branches-btn-auto"
                onClick={() => setCreatedAccount(null)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        {...confirm}
        onCancel={() => setConfirm((c) => ({ ...c, show: false }))}
      />
    </Layout>
  );
};

export default Branches;
