import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import Layout from "../../components/layout";
import { supabase } from "../../js/Utils/supabase";
import { useCurrentUser } from "../../js/hooks/Usecurrentuser";
import { useBranchFilter, withBranchId } from "../../js/hooks/Usebranchfilter";
import "../../styles/CustomerAppointment.css";

const STATUS_BADGE = {
  Confirmed: "badge-green",
  Pending: "badge-yellow",
  Completed: "badge-blue",
  Cancelled: "badge-red",
};
const TIMES = [
  "08:00 AM",
  "09:00 AM",
  "10:00 AM",
  "11:00 AM",
  "01:00 PM",
  "02:00 PM",
  "03:00 PM",
  "04:00 PM",
];
const VETS = [
  "Any Available",
  "Dr. Santos",
  "Dr. Reyes",
  "Dr. Cruz",
  "Dr. Garcia",
];
const sanitizeContact = (v) => v.replace(/\D/g, "").slice(0, 11);

const SERVICE_META = {
  Consultation: {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="#475569"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ width: 16, height: 16 }}
      >
        <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.3.3 0 1 0 .3.3" />
        <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4" />
        <circle cx="20" cy="10" r="2" />
      </svg>
    ),
    color: "#475569",
    bg: "#f8fafc",
  },
  Vaccination: {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="#15803d"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ width: 16, height: 16 }}
      >
        <path d="m18 2 4 4" />
        <path d="m17 7 3-3" />
        <path d="M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-2.5 0-3.4L15 5" />
        <path d="m9 11 4 4" />
        <path d="m5 19-3 3" />
        <path d="m14 4 6 6" />
      </svg>
    ),
    color: "#15803d",
    bg: "#f0fdf4",
  },
  Deworming: {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="#6d28d9"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ width: 16, height: 16 }}
      >
        <path d="M6 3c0 4 3 4 3 8s-3 4-3 8" />
        <path d="M12 3c0 4 3 4 3 8s-3 4-3 8" />
        <path d="M18 3c0 4 3 4 3 8s-3 4-3 8" />
      </svg>
    ),
    color: "#6d28d9",
    bg: "#f3e8ff",
  },
  Imaging: {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="#1d4ed8"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ width: 16, height: 16 }}
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="9" cy="9" r="2" />
        <path d="m21 15-5-5L5 21" />
      </svg>
    ),
    color: "#1d4ed8",
    bg: "#eff6ff",
  },
  Diagnostics: {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="#dc2626"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ width: 16, height: 16 }}
      >
        <path d="M6 2v6" />
        <path d="M18 2v6" />
        <path d="M3 8h18" />
        <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
        <path d="M9 15h6" />
        <path d="M12 12v6" />
      </svg>
    ),
    color: "#dc2626",
    bg: "#fee2e2",
  },
  Grooming: {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="#7c3aed"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ width: 16, height: 16 }}
      >
        <circle cx="6" cy="6" r="3" />
        <circle cx="6" cy="18" r="3" />
        <line x1="20" y1="4" x2="8.12" y2="15.88" />
        <line x1="14.47" y1="14.48" x2="20" y2="20" />
        <line x1="8.12" y1="8.12" x2="12" y2="12" />
      </svg>
    ),
    color: "#7c3aed",
    bg: "#f3e8ff",
  },
};
const SERVICE_OPTIONS = [
  "Consultation",
  "Vaccination",
  "Deworming",
  "Imaging",
  "Diagnostics",
  "Grooming",
];

const Skeleton = ({ w = "100%", h = 14, r = 6, mb = 0 }) => (
  <div
    style={{
      width: w,
      height: h,
      borderRadius: r,
      background:
        "linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)",
      backgroundSize: "200% 100%",
      animation: "shimmer 1.4s infinite",
      marginBottom: mb,
      flexShrink: 0,
    }}
  />
);

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
                  className="cs-select-option"
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
        className="cs-select-trigger"
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
          className="cs-select-arrow"
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

const DatePicker = ({
  value,
  onChange,
  placeholder = "Pick a date",
  min = "",
}) => {
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

  const [popPos, setPopPos] = React.useState({ top: 0, left: 0 });
  const handleOpen = () => {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setPopPos({
        top:
          spaceBelow > 320
            ? rect.bottom + window.scrollY + 6
            : rect.top + window.scrollY - 310 - 6,
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
                "0 16px 48px rgba(0,0,0,0.16), 0 4px 12px rgba(0,0,0,0.08)",
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
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 800,
                    color: "#fff",
                    lineHeight: 1.2,
                  }}
                >
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
              {DAY_LABELS.map((d, i) => (
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
                    letterSpacing: "0.4px",
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
                const m = String(month + 1).padStart(2, "0");
                const d = String(day).padStart(2, "0");
                const dateStr = `${year}-${m}-${d}`;
                const isSelected = dateStr === value;
                const isToday = dateStr === todayStr;
                const isDisabled = min && dateStr < min;
                const isSun = i % 7 === 0;
                const isSat = i % 7 === 6;
                return (
                  <div
                    key={i}
                    onClick={() => !isDisabled && selectDay(day)}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      fontWeight: isSelected ? 800 : isToday ? 700 : 500,
                      cursor: isDisabled ? "not-allowed" : "pointer",
                      background: isSelected
                        ? "linear-gradient(135deg,#1e3a8a,#3b82f6)"
                        : isToday
                          ? "#eff6ff"
                          : "transparent",
                      color: isSelected
                        ? "#fff"
                        : isDisabled
                          ? "#cbd5e1"
                          : isToday
                            ? "#1e40af"
                            : isSun
                              ? "#ef4444"
                              : isSat
                                ? "#3b82f6"
                                : "var(--text)",
                      border:
                        isToday && !isSelected ? "1.5px solid #bfdbfe" : "none",
                      boxShadow: isSelected
                        ? "0 2px 8px rgba(30,58,138,0.35)"
                        : "none",
                      transition: "background 0.12s",
                      margin: "auto",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected && !isDisabled)
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
                alignItems: "center",
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
          minWidth: 160,
          boxShadow: open
            ? "0 0 0 3px rgba(99,102,241,0.12),0 2px 8px rgba(0,0,0,0.08)"
            : "0 1px 3px rgba(0,0,0,0.06),inset 0 1px 0 rgba(255,255,255,0.9)",
          transition: "all 0.18s",
        }}
        onMouseEnter={(e) => {
          if (!open) {
            e.currentTarget.style.borderColor = "#a5b4fc";
            e.currentTarget.style.boxShadow =
              "0 2px 8px rgba(99,102,241,0.10),inset 0 1px 0 rgba(255,255,255,0.9)";
          }
        }}
        onMouseLeave={(e) => {
          if (!open) {
            e.currentTarget.style.borderColor = "#dde3ec";
            e.currentTarget.style.boxShadow =
              "0 1px 3px rgba(0,0,0,0.06),inset 0 1px 0 rgba(255,255,255,0.9)";
          }
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

const PET_ICON_DOG = (color) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 16 16"
    fill={color}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M16 4V7C16 9.20914 14.2091 11 12 11H10V15H0V13L0.931622 10.8706C1.25226 10.9549 1.59036 11 1.94124 11C3.74931 11 5.32536 9.76947 5.76388 8.01538L3.82359 7.53031C3.60766 8.39406 2.83158 9.00001 1.94124 9.00001C1.87789 9.00001 1.81539 8.99702 1.75385 8.99119C1.02587 8.92223 0.432187 8.45551 0.160283 7.83121C0.0791432 7.64491 0.0266588 7.44457 0.00781272 7.23658C-0.0112323 7.02639 0.00407892 6.80838 0.0588889 6.58914L0.698705 4.02986C1.14387 2.24919 2.7438 1 4.57928 1H10L12 4H16ZM9 6C9.55229 6 10 5.55228 10 5C10 4.44772 9.55229 4 9 4C8.44771 4 8 4.44772 8 5C8 5.55228 8.44771 6 9 6Z"
    />
  </svg>
);
const PET_ICON_CAT = (color) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 16 16"
    fill={color}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M1 7L4.80061 1.43926C5.56059 0.527292 6.68638 0 7.8735 0H8V4L12 5L15 10L14.1875 11.2188C13.4456 12.3316 12.1967 13 10.8593 13H9L7 16H5L1 7ZM10 9C10.5523 9 11 8.55229 11 8C11 7.44772 10.5523 7 10 7C9.44771 7 9 7.44772 9 8C9 8.55229 9.44771 9 10 9Z"
    />
    <path d="M10 0.465878V2.43845L12 2.93845V0H11.8735C11.2125 0 10.5704 0.163501 10 0.465878Z" />
  </svg>
);

const PetPicker = ({ pets, value, onChange }) => {
  const [open, setOpen] = React.useState(false);
  const [dropPos, setDropPos] = React.useState({ top: 0, left: 0, width: 0 });
  const triggerRef = React.useRef(null);
  const ref = React.useRef(null);
  const selected = pets.find((p) => p.id === value);

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
      const dropHeight = Math.min((pets.length + 1) * 52, 280);
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

  const speciesColor = (sp) =>
    sp === "Cat"
      ? { bg: "#f0fdf4", color: "#15803d" }
      : { bg: "#eff6ff", color: "#1d4ed8" };

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
              maxHeight: 280,
              overflowY: "auto",
              padding: "6px",
            }}
          >
            {pets.map((mp) => {
              const isSelected = mp.id === value;
              const sc = speciesColor(mp.species);
              return (
                <div
                  key={mp.id}
                  onClick={() => {
                    onChange(mp.id);
                    setOpen(false);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 10px",
                    borderRadius: 9,
                    cursor: "pointer",
                    background: isSelected ? "#eff6ff" : "transparent",
                    transition: "background 0.12s",
                    marginBottom: 2,
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected)
                      e.currentTarget.style.background = "#f4f6fa";
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected)
                      e.currentTarget.style.background = "transparent";
                  }}
                >
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 9,
                      background: sc.bg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {mp.species === "Cat"
                      ? PET_ICON_CAT(sc.color)
                      : PET_ICON_DOG(sc.color)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "var(--text)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {mp.name}
                    </div>
                    {mp.species && (
                      <div
                        style={{
                          fontSize: 11,
                          color: sc.color,
                          fontWeight: 600,
                        }}
                      >
                        {mp.species}
                      </div>
                    )}
                  </div>
                  {isSelected && (
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 5,
                        background: "#1d4ed8",
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
          padding: selected ? "6px 34px 6px 8px" : "10px 34px 10px 12px",
          border: "1.5px solid",
          borderRadius: 9,
          background: open
            ? "linear-gradient(135deg,#ffffff,#f5f3ff)"
            : "linear-gradient(to bottom,#ffffff,#f8fafc)",
          cursor: "pointer",
          userSelect: "none",
          boxSizing: "border-box",
          boxShadow: open
            ? "0 0 0 3px rgba(99,102,241,0.12),0 2px 8px rgba(0,0,0,0.08)"
            : "0 1px 3px rgba(0,0,0,0.06),inset 0 1px 0 rgba(255,255,255,0.9)",
          borderColor: open ? "#6366f1" : "#dde3ec",
          transition: "all 0.18s",
          display: "flex",
          alignItems: "center",
          gap: 8,
          position: "relative",
          minHeight: 36,
        }}
        onMouseEnter={(e) => {
          if (!open) e.currentTarget.style.borderColor = "#a5b4fc";
        }}
        onMouseLeave={(e) => {
          if (!open) e.currentTarget.style.borderColor = "#dde3ec";
        }}
      >
        {selected ? (
          <>
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: 7,
                background: speciesColor(selected.species).bg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {selected.species === "Cat"
                ? PET_ICON_CAT(speciesColor(selected.species).color)
                : PET_ICON_DOG(speciesColor(selected.species).color)}
            </div>
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "var(--text)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                flex: 1,
              }}
            >
              {selected.name}
              {selected.species ? ` · ${selected.species}` : ""}
            </span>
          </>
        ) : (
          <span
            style={{ fontSize: 13, fontWeight: 600, color: "#b0bac9", flex: 1 }}
          >
            — Select a pet —
          </span>
        )}
        <div
          style={{
            position: "absolute",
            right: 10,
            top: "50%",
            transform: "translateY(-50%)",
            width: 20,
            height: 20,
            borderRadius: 6,
            background: open ? "#6366f1" : "#f1f5f9",
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

const Modal = ({
  show,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "OK",
  cancelText = null,
  confirmColor = "var(--royal)",
}) => {
  if (!show) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100000,
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
          {message && (
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>
              {message}
            </p>
          )}
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
          {cancelText && (
            <button
              className="btn btn-ghost"
              style={{ width: "auto" }}
              onClick={onCancel}
            >
              {cancelText}
            </button>
          )}
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

// ── Vet availability defaults — used only until the live schedule loads from Supabase ──
const DEFAULT_VET_SCHEDULE = {
  "Dr. Santos": [1, 3, 5], // Mon, Wed, Fri
  "Dr. Reyes": [2, 4, 6], // Tue, Thu, Sat
  "Dr. Cruz": [1, 2, 3, 4, 5], // Mon–Fri
  "Dr. Garcia": [3, 4, 5, 6], // Wed–Sat
};
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ── Vet time-of-day availability defaults ──
const DEFAULT_VET_TIME_SCHEDULE = {
  "Dr. Santos": ["08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM", "01:00 PM"],
  "Dr. Reyes": ["08:00 AM", "09:00 AM", "10:00 AM"],
  "Dr. Cruz": TIMES,
  "Dr. Garcia": ["09:00 AM", "10:00 AM", "02:00 PM", "03:00 PM"],
};

const CustomerAppointment = () => {
  // ── PATCH: replace useBranchTables + session JWT parsing ──────────────────
  const { user, loading: userLoading } = useCurrentUser();
  const { applyFilter } = useBranchFilter();

  const [appts, setAppts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [apptStatFilter, setApptStatFilter] = useState("");
  const filteredAppts =
    apptStatFilter === "upcoming"
      ? appts.filter((a) => a.status === "Confirmed" || a.status === "Pending")
      : apptStatFilter
        ? appts.filter((a) => a.status === apptStatFilter)
        : appts;
  const [saving, setSaving] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 640);

  // ── Multi-pet booking ─────────────────────────────────────────────────────
  const EMPTY_PET = {
    mode: "new",
    existingId: null,
    patient: "",
    species: "Dog",
    purpose: "Consultation",
    imagingType: "",
    vet: "Any Available",
    date: "",
    time: "",
    notes: "",
  };
  const [pets, setPets] = useState([{ ...EMPTY_PET }]);
  const [contact, setContact] = useState("");
  const [myPets, setMyPets] = useState([]);
  const [loadingMyPets, setLoadingMyPets] = useState(false);
  const [vetBookedTimes, setVetBookedTimes] = useState({});
  const [bookStep, setBookStep] = useState("service");

  // ── Live vet schedules (shared with staff Appointments page via Supabase) ──
  const [vetSchedule, setVetSchedule] = useState(DEFAULT_VET_SCHEDULE);
  const [vetTimeSchedule, setVetTimeSchedule] = useState(
    DEFAULT_VET_TIME_SCHEDULE,
  );

  const fetchVetSchedules = async () => {
    const { data, error } = await supabase.from("vet_schedules").select("*");
    if (error || !data || data.length === 0) return;
    const days = {};
    const times = {};
    data.forEach((row) => {
      days[row.vet] = row.days || [];
      times[row.vet] = row.times || [];
    });
    setVetSchedule((prev) => ({ ...prev, ...days }));
    setVetTimeSchedule((prev) => ({ ...prev, ...times }));
  };

  useEffect(() => {
    fetchVetSchedules();
    const ch = supabase
      .channel("customer-vet-schedules-rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vet_schedules" },
        () => fetchVetSchedules(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const isVetAvailableOnDate = (vet, dateStr) => {
    if (!vet || vet === "Any Available" || !dateStr) return true;
    const sched = vetSchedule[vet];
    if (!sched) return true;
    const day = new Date(dateStr + "T00:00:00").getDay();
    return sched.includes(day);
  };
  const isVetAvailableAtTime = (vet, time) => {
    if (!vet || vet === "Any Available" || !time) return true;
    const sched = vetTimeSchedule[vet];
    if (!sched) return true;
    return sched.includes(time);
  };
  const [showReviews, setShowReviews] = useState(false);
  const [allReviews, setAllReviews] = useState([]);
  const [loadingAllReviews, setLoadingAllReviews] = useState(false);

  const fetchVetBookedTimes = async (vet, date) => {
    if (!vet || vet === "Any Available" || !date) return;
    const key = `${vet}|${date}`;
    const { data, error } = await supabase
      .from("appointments")
      .select("time")
      .eq("vet", vet)
      .eq("date", date)
      .in("status", ["Pending", "Confirmed"]);
    if (!error) {
      setVetBookedTimes((prev) => ({
        ...prev,
        [key]: (data || []).map((r) => r.time),
      }));
    }
  };

  const getVetConflictFor = (pet) => {
    if (!pet.vet || pet.vet === "Any Available" || !pet.date || !pet.time)
      return null;
    if (!isVetAvailableOnDate(pet.vet, pet.date)) return "vet-day";
    if (!isVetAvailableAtTime(pet.vet, pet.time)) return "vet-time";
    const key = `${pet.vet}|${pet.date}`;
    if ((vetBookedTimes[key] || []).includes(pet.time)) return "vet-slot";
    return null;
  };
  const [myReviews, setMyReviews] = useState({});
  const [reviewModal, setReviewModal] = useState({
    show: false,
    appt: null,
    rating: 0,
    comment: "",
  });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [appModal, setAppModal] = useState({
    show: false,
    title: "",
    message: "",
    onConfirm: null,
    onCancel: null,
    confirmText: "OK",
    cancelText: null,
    confirmColor: "var(--royal)",
  });
  const showAlert = (title, message) =>
    setAppModal({
      show: true,
      title,
      message,
      onConfirm: () => setAppModal((m) => ({ ...m, show: false })),
      onCancel: null,
      confirmText: "OK",
      cancelText: null,
      confirmColor: "var(--royal)",
    });
  const showConfirm = (title, message, onConfirm) =>
    setAppModal({
      show: true,
      title,
      message,
      onConfirm: () => {
        setAppModal((m) => ({ ...m, show: false }));
        onConfirm();
      },
      onCancel: () => setAppModal((m) => ({ ...m, show: false })),
      confirmText: "Yes, Cancel It",
      cancelText: "No, Keep It",
      confirmColor: "#dc2626",
    });

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 640);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    supabase
      .from("inventory")
      .select("name, price, branch_id")
      .eq("category", "Service")
      .then(({ data }) => setServices(data || []));
  }, []);

  const getServicePrice = (purpose, branchId, imagingType) => {
    if (!purpose) return null;
    const lookupName =
      purpose === "Imaging" && imagingType
        ? `Imaging - ${imagingType}`
        : purpose;
    const exact = services.find(
      (s) => s.name === lookupName && String(s.branch_id) === String(branchId),
    );
    if (exact) return exact.price;
    const fallback = services.find(
      (s) => s.name === lookupName && s.branch_id == null,
    );
    if (fallback) return fallback.price;
    return null;
  };

  const fetchAppts = async () => {
    if (!user?.id) return;
    setLoading(true);

    // ── PATCH: filter by user_id + branch ─────────────────────────────────
    let q = supabase
      .from("appointments")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .order("time", { ascending: false });
    q = applyFilter(q);
    const { data, error } = await q;
    if (!error) setAppts(data || []);
    setLoading(false);
  };

  const fetchMyReviews = async () => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from("reviews")
      .select("appointment_id, rating, comment")
      .eq("user_id", user.id);
    if (!error && data) {
      const map = {};
      data.forEach((r) => {
        map[r.appointment_id] = r;
      });
      setMyReviews(map);
    }
  };

  const openReviewModal = (appt) =>
    setReviewModal({ show: true, appt, rating: 0, comment: "" });

  const fetchAllReviews = async () => {
    if (!user?.branchId) return;
    setLoadingAllReviews(true);
    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .eq("branch_id", user.branchId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (!error) setAllReviews(data || []);
    setLoadingAllReviews(false);
  };

  const openReviews = () => {
    fetchAllReviews();
    setShowReviews(true);
  };

  const submitReview = async () => {
    if (!reviewModal.rating) {
      showAlert(
        "Rating Required",
        "Please select a star rating before submitting.",
      );
      return;
    }
    setSubmittingReview(true);
    const { error } = await supabase.from("reviews").insert([
      {
        appointment_id: reviewModal.appt.id,
        user_id: user.id,
        owner: user.fullName || user.email || "Customer",
        patient: reviewModal.appt.patient,
        branch_id: reviewModal.appt.branch_id || null,
        rating: reviewModal.rating,
        comment: reviewModal.comment.trim(),
      },
    ]);
    setSubmittingReview(false);
    if (error) {
      showAlert("Error", error.message);
      return;
    }
    setMyReviews((prev) => ({
      ...prev,
      [reviewModal.appt.id]: {
        rating: reviewModal.rating,
        comment: reviewModal.comment.trim(),
      },
    }));
    setReviewModal({ show: false, appt: null, rating: 0, comment: "" });
    showAlert("Thank You!", "Your review has been submitted.");
  };

  const fetchMyPets = async () => {
    if (!user?.id) return;
    setLoadingMyPets(true);
    const { data, error } = await supabase
      .from("patients")
      .select("id, name, species")
      .eq("owner_user_id", user.id)
      .order("name");
    if (!error) setMyPets(data || []);
    setLoadingMyPets(false);
  };

  useEffect(() => {
    if (userLoading || !user?.id) return;
    fetchAppts();
    fetchMyReviews();

    const channel = supabase
      .channel(`customer-appts-realtime-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchAppts();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, userLoading]);

  // ── Pet list helpers ───────────────────────────────────────────────────
  const updatePet = (idx, patch) =>
    setPets((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  const addPet = () =>
    setPets((prev) => [
      ...prev,
      { ...EMPTY_PET, purpose: prev[0]?.purpose || EMPTY_PET.purpose },
    ]);
  const removePet = (idx) =>
    setPets((prev) => prev.filter((_, i) => i !== idx));

  const renderTimeOptions = (pet, idx) =>
    TIMES.map((t) => (
      <option key={t} value={t}>
        {t}
      </option>
    ));

  // ── Midnight booking notice ────────────────────────────────────────────
  // Bookings made between 12:00 AM and 6:00 AM are still saved, but staff
  // aren't monitoring the system overnight, so warn the customer up front
  // that approval will happen once the clinic opens in the morning.
  const isMidnightBookingHour = () => {
    const h = new Date().getHours();
    return h >= 0 && h < 6;
  };

  const saveAppt = async () => {
    for (const pet of pets) {
      if (pet.mode === "existing" && !pet.existingId) {
        showAlert(
          "Missing Fields",
          'Please select an existing pet for each entry, or switch to "New Pet".',
        );
        return;
      }
      if (pet.mode === "new" && !pet.patient.trim()) {
        showAlert(
          "Missing Fields",
          "Please enter a pet name for each new pet.",
        );
        return;
      }
      if (!pet.vet || pet.vet === "") {
        showAlert(
          "Missing Fields",
          "Please select a veterinarian for each pet.",
        );
        return;
      }
      if (!pet.date || !pet.time) {
        showAlert(
          "Missing Fields",
          "Please select a date and time for each pet.",
        );
        return;
      }
      if (pet.purpose === "Imaging" && !pet.imagingType) {
        showAlert(
          "Missing Fields",
          "Please select an imaging type (X-ray, Ultrasound, or CT-scan) for each pet.",
        );
        return;
      }
      const vetConflict = getVetConflictFor(pet);
      if (vetConflict === "vet-day") {
        showAlert(
          "Vet Unavailable",
          `${pet.vet} does not work on the selected date. Please choose a different day or vet.`,
        );
        return;
      }
      if (vetConflict === "vet-time") {
        showAlert(
          "Vet Unavailable",
          `${pet.vet} is not available at ${pet.time}. Please choose one of their available time slots.`,
        );
        return;
      }
      if (vetConflict === "vet-slot") {
        showAlert(
          "Time Slot Unavailable",
          `${pet.vet} is already booked at ${pet.time} on ${pet.date}. Please choose a different time.`,
        );
        return;
      }
    }
    if (saving) return;
    setSaving(true);

    try {
      for (const pet of pets) {
        const petName =
          pet.mode === "existing"
            ? myPets.find((mp) => mp.id === pet.existingId)?.name || ""
            : pet.patient.trim();
        const petSpecies =
          pet.mode === "existing"
            ? myPets.find((mp) => mp.id === pet.existingId)?.species || ""
            : pet.species;

        const { data: existingAppt } = await supabase
          .from("appointments")
          .select("id")
          .eq("patient", petName)
          .eq("date", pet.date)
          .eq("time", pet.time)
          .maybeSingle();

        if (existingAppt) {
          showAlert(
            "Already Booked",
            `${petName} already has an appointment on ${pet.date} at ${pet.time}. Please choose a different date or time.`,
          );
          setSaving(false);
          return;
        }

        const apptPayload = withBranchId(user, {
          user_id: user.id,
          patient: petName,
          species: petSpecies || null,
          owner: user.fullName || user.email || "Customer",
          contact: contact,
          vet: pet.vet === "Any Available" ? "TBD" : pet.vet,
          date: pet.date,
          time: pet.time,
          purpose: pet.purpose,
          price:
            getServicePrice(pet.purpose, user.branchId, pet.imagingType) || 0,
          status: "Pending",
          notes: pet.notes,
        });

        const { error } = await supabase
          .from("appointments")
          .insert([apptPayload]);
        if (error) {
          showAlert("Error", error.message);
          setSaving(false);
          return;
        }

        // Auto-register new pets only
        if (pet.mode === "new") {
          const { data: existingPet } = await supabase
            .from("patients")
            .select("id")
            .ilike("name", petName)
            .eq("owner_user_id", user.id)
            .maybeSingle();

          if (!existingPet) {
            const petPayload = withBranchId(user, {
              name: petName,
              owner_user_id: user.id,
              owner_email: user.email || null,
              status: "Outpatient",
              health: "Good",
              species: petSpecies || "",
              breed: "",
              condition: pet.notes || "",
            });
            const { error: petErr } = await supabase
              .from("patients")
              .insert([petPayload]);
            if (petErr) {
              console.error("Auto-register pet failed:", petErr.message);
              showAlert(
                "Pet Record Warning",
                `Your appointment was booked, but we couldn't save ${petName}'s pet profile automatically (${petErr.message}). Please contact staff to register ${petName} in your account.`,
              );
            }
          }
        }
      }

      if (isMidnightBookingHour()) {
        showAlert(
          "Request Submitted!",
          `Your appointment request${pets.length > 1 ? "s have" : " has"} been submitted. Since it's currently outside clinic hours (12:00 AM–6:00 AM), our staff will review and approve ${pets.length > 1 ? "them" : "it"} once the clinic opens in the morning. You will be notified as soon as ${pets.length > 1 ? "they are" : "it is"} confirmed.`,
        );
      } else {
        showAlert(
          "Request Submitted!",
          `Your appointment request${pets.length > 1 ? "s have" : " has"} been submitted and ${pets.length > 1 ? "are" : "is"} now pending approval. You will be notified once a staff member confirms ${pets.length > 1 ? "them" : "it"}.`,
        );
      }
      setShowModal(false);
      setPets([{ ...EMPTY_PET }]);
      setContact("");
      fetchAppts();
    } finally {
      setSaving(false);
    }
  };

  const cancelAppt = (id) => {
    showConfirm(
      "Cancel Appointment",
      "Are you sure you want to cancel this appointment? This cannot be undone.",
      async () => {
        await supabase
          .from("appointments")
          .update({ status: "Cancelled" })
          .eq("id", id);
        fetchAppts();
      },
    );
  };

  const today = new Date().toISOString().split("T")[0];
  const hasAnyConflict = pets.some((p) => getVetConflictFor(p));

  const isPetIncomplete = (pet) => {
    const hasPetIdentity =
      pet.mode === "existing" ? !!pet.existingId : !!pet.patient.trim();
    const hasVet = !!pet.vet;
    return !hasPetIdentity || !hasVet || !pet.date || !pet.time;
  };
  const isFormIncomplete =
    pets.some(isPetIncomplete) || !contact.trim() || contact.length !== 11;

  if (userLoading) {
    return (
      <Layout isCustomer>
        <div
          style={{
            padding: "20px 24px",
            paddingTop: "calc(var(--topbar-h) + var(--pagetop-h) + 20px)",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          {/* Stat cards skeleton */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3,1fr)",
              gap: 14,
              marginBottom: 18,
            }}
          >
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                style={{
                  background: "var(--card)",
                  borderRadius: 11,
                  border: "1px solid var(--border)",
                  padding: "16px 18px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <Skeleton w={38} h={38} r={8} />
                <div style={{ flex: 1 }}>
                  <Skeleton w="50%" h={10} r={5} mb={6} />
                  <Skeleton w="30%" h={22} r={6} />
                </div>
              </div>
            ))}
          </div>

          {/* Table skeleton */}
          <div
            style={{
              background: "var(--card)",
              borderRadius: 12,
              border: "1px solid var(--border)",
              overflow: "hidden",
            }}
          >
            {" "}
            <div
              style={{
                padding: "14px 18px",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Skeleton w={160} h={14} r={6} />
              <Skeleton w={60} h={12} r={5} />
            </div>
            <div style={{ padding: "0 18px" }}>
              {/* Table header */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr 80px",
                  gap: 12,
                  padding: "10px 0",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                {[...Array(7)].map((_, i) => (
                  <Skeleton key={i} w="70%" h={10} r={4} />
                ))}
              </div>
              {/* Table rows */}
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr 80px",
                    gap: 12,
                    padding: "14px 0",
                    borderBottom: "1px solid var(--border)",
                    alignItems: "center",
                  }}
                >
                  <Skeleton w="80%" h={13} r={5} />
                  <Skeleton w="70%" h={13} r={5} />
                  <Skeleton w="65%" h={13} r={5} />
                  <Skeleton w="60%" h={13} r={5} />
                  <Skeleton w="55%" h={13} r={5} />
                  <Skeleton w={60} h={22} r={20} />
                  <Skeleton w={55} h={28} r={7} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!user?.id) {
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
  }

  return (
    <Layout isCustomer>
      <Modal
        show={appModal.show}
        title={appModal.title}
        message={appModal.message}
        onConfirm={appModal.onConfirm}
        onCancel={appModal.onCancel}
        confirmText={appModal.confirmText}
        cancelText={appModal.cancelText}
        confirmColor={appModal.confirmColor}
      />

      {showReviews && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
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
              maxWidth: 560,
              maxHeight: "80vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 24px 64px rgba(0,0,0,0.28)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                background: "linear-gradient(135deg,#78350f,#d97706)",
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: 15,
                    fontWeight: 800,
                    color: "#fff",
                  }}
                >
                  Customer Reviews
                </h3>
                <p
                  style={{
                    margin: "4px 0 0",
                    fontSize: 12,
                    color: "rgba(255,255,255,0.85)",
                  }}
                >
                  {allReviews.length} review{allReviews.length !== 1 ? "s" : ""}
                </p>
              </div>
              <button
                onClick={() => setShowReviews(false)}
                style={{
                  background: "rgba(255,255,255,0.15)",
                  border: "none",
                  borderRadius: 8,
                  width: 30,
                  height: 30,
                  cursor: "pointer",
                  color: "#fff",
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ overflowY: "auto", flex: 1, padding: "14px 20px" }}>
              {loadingAllReviews ? (
                <p
                  style={{
                    textAlign: "center",
                    color: "var(--muted)",
                    padding: 20,
                  }}
                >
                  Loading reviews…
                </p>
              ) : allReviews.length === 0 ? (
                <p
                  style={{
                    textAlign: "center",
                    color: "var(--muted)",
                    padding: 20,
                  }}
                >
                  No reviews yet. Be the first to share your experience!
                </p>
              ) : (
                allReviews.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      borderBottom: "1px solid var(--border)",
                      padding: "12px 0",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 4,
                      }}
                    >
                      <span style={{ fontWeight: 700, fontSize: 13 }}>
                        {r.patient}
                        {r.owner ? ` · ${r.owner}` : ""}
                      </span>
                      <span style={{ fontSize: 11, color: "var(--muted)" }}>
                        {new Date(r.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 2, marginBottom: 6 }}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <svg
                          key={s}
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill={s <= r.rating ? "#f59e0b" : "none"}
                          stroke={s <= r.rating ? "#f59e0b" : "#cbd5e1"}
                          strokeWidth="1.5"
                        >
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                      ))}
                    </div>
                    {r.comment && (
                      <p
                        style={{
                          margin: 0,
                          fontSize: 13,
                          color: "var(--text)",
                          lineHeight: 1.5,
                        }}
                      >
                        {r.comment}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                padding: "12px 20px",
                borderTop: "1px solid var(--border)",
              }}
            >
              <button
                className="btn btn-ghost"
                style={{ width: "auto" }}
                onClick={() => setShowReviews(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ width: "100%", minHeight: "100vh", display: "block" }}>
        {/* ── Topbar ── */}
        <div
          className="branches-topbar"
          style={{
            background: "var(--card)",
            borderBottom: "1px solid var(--border)",
            padding: "10px 16px",
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            position: "fixed",
            top: 68,
            left: "var(--current-sidebar-w, 62px)",
            right: 0,
            zIndex: 40,
            boxSizing: "border-box",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <img
              src="/icon/attended.png"
              alt="Appointments"
              className="ca-topbar-icon"
              width={isMobile ? 18 : 20}
              height={isMobile ? 18 : 20}
            />
            <div>
              <h1
                style={{
                  fontSize: isMobile ? 15 : 18,
                  fontWeight: 800,
                  color: "var(--text)",
                  margin: 0,
                }}
              >
                My Appointments
              </h1>
              <p
                style={{
                  fontSize: isMobile ? 11 : 12,
                  color: "var(--muted)",
                  margin: 0,
                }}
              >
                Book and manage your pet appointments
              </p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={openReviews}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 14px",
                borderRadius: 8,
                border: "1.5px solid #fde68a",
                background: "#fffbeb",
                color: "#92400e",
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
                fill="currentColor"
                stroke="none"
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              Reviews
            </button>
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
                  Book Appointment
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 500,
                    color: "rgba(255,255,255,0.55)",
                  }}
                >
                  Request a visit
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
              onClick={() => {
                setPets([{ ...EMPTY_PET }]);
                setContact("");
                setBookStep("service");
                fetchMyPets();
                setShowModal(true);
              }}
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

        <div
          style={{
            padding: "12px",
            paddingTop: 122,
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          {appts.some((a) => a.status === "Pending") && (
            <div
              style={{
                background: "#fffbeb",
                border: "1.5px solid #fde68a",
                borderRadius: 10,
                padding: isMobile ? "10px 12px" : "12px 18px",
                marginBottom: isMobile ? 12 : 18,
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
              }}
            >
              <span style={{ color: "#d97706" }}>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  style={{ width: 18, height: 18 }}
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </span>
              <div>
                <p
                  style={{
                    margin: 0,
                    fontWeight: 700,
                    fontSize: isMobile ? 12 : 13,
                    color: "#92400e",
                  }}
                >
                  {appts.filter((a) => a.status === "Pending").length}{" "}
                  Appointment
                  {appts.filter((a) => a.status === "Pending").length > 1
                    ? "s"
                    : ""}{" "}
                  Awaiting Approval
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: isMobile ? 11 : 12,
                    color: "#b45309",
                    marginTop: 2,
                  }}
                >
                  Your request has been submitted. Please wait for a staff
                  member to confirm your appointment.
                </p>
              </div>
            </div>
          )}

          {(() => {
            return null;
          })()}
          {/* ── Stat cards ── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 12,
              marginBottom: 18,
            }}
          >
            {[
              {
                label: "Total",
                value: appts.length,
                icon: "/icon/attended.png",
                color: "#dbeafe",
                filter:
                  "invert(37%) sepia(90%) saturate(500%) hue-rotate(195deg) brightness(95%)",
                accent: "#3b82f6",
                sub: "All appointments",
                subColor: "var(--muted)",
                filterValue: "",
              },
              {
                label: "Upcoming",
                value: appts.filter(
                  (a) => a.status === "Confirmed" || a.status === "Pending",
                ).length,
                icon: "/icon/admitted.png",
                color: "#dcfce7",
                filter:
                  "invert(50%) sepia(60%) saturate(400%) hue-rotate(100deg) brightness(90%)",
                accent: "#16a34a",
                sub: "Confirmed & pending",
                subColor: "#16a34a",
                filterValue: "upcoming",
              },
              {
                label: "Pending",
                value: appts.filter((a) => a.status === "Pending").length,
                icon: "/icon/chat_bubble.png",
                color: "#fef9c3",
                filter:
                  "invert(70%) sepia(80%) saturate(500%) hue-rotate(5deg) brightness(95%)",
                accent: "#d97706",
                sub:
                  appts.filter((a) => a.status === "Pending").length === 0
                    ? "All cleared"
                    : "Awaiting approval",
                subColor:
                  appts.filter((a) => a.status === "Pending").length === 0
                    ? "#16a34a"
                    : "#d97706",
                filterValue: "Pending",
              },
              {
                label: "Cancelled",
                value: appts.filter((a) => a.status === "Cancelled").length,
                icon: "/icon/cancel.png",
                color: "#fee2e2",
                filter:
                  "invert(30%) sepia(80%) saturate(500%) hue-rotate(330deg) brightness(95%)",
                accent: "#dc2626",
                sub: "Cancelled requests",
                subColor: "var(--muted)",
                filterValue: "Cancelled",
              },
            ].map((sc, i) => (
              <div
                key={i}
                className="fade-in"
                role="button"
                tabIndex={0}
                onClick={() =>
                  setApptStatFilter((f) =>
                    f === sc.filterValue ? "" : sc.filterValue,
                  )
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setApptStatFilter((f) =>
                      f === sc.filterValue ? "" : sc.filterValue,
                    );
                  }
                }}
                style={{
                  background: "var(--card)",
                  borderRadius: 11,
                  border:
                    apptStatFilter === sc.filterValue
                      ? `1.5px solid ${sc.accent}`
                      : "1px solid var(--border)",
                  borderTop: `3px solid ${sc.accent}`,
                  boxSizing: "border-box",
                  padding: "16px 18px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  boxShadow:
                    apptStatFilter === sc.filterValue
                      ? `0 0 0 2px ${sc.accent}22`
                      : "var(--shadow)",
                  minWidth: 0,
                  overflow: "hidden",
                  transition:
                    "transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease",
                  cursor: "pointer",
                  animationDelay: `${i * 0.08}s`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-3px)";
                  e.currentTarget.style.boxShadow =
                    "0 8px 24px rgba(30,58,138,0.12)";
                  e.currentTarget.style.border =
                    "1px solid rgba(30,58,138,0.3)";
                  e.currentTarget.style.borderTop = `3px solid ${sc.accent}`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "";
                  e.currentTarget.style.boxShadow =
                    apptStatFilter === sc.filterValue
                      ? `0 0 0 2px ${sc.accent}22`
                      : "var(--shadow)";
                  e.currentTarget.style.border =
                    apptStatFilter === sc.filterValue
                      ? `1.5px solid ${sc.accent}`
                      : "1px solid var(--border)";
                  e.currentTarget.style.borderTop = `3px solid ${sc.accent}`;
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 9,
                    background: sc.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <img
                    src={sc.icon}
                    alt={sc.label}
                    width={20}
                    height={20}
                    style={{ filter: sc.filter, display: "block" }}
                  />
                </div>
                <div style={{ minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: 10,
                      color: "var(--muted)",
                      fontWeight: 700,
                      marginBottom: 3,
                      textTransform: "uppercase",
                      letterSpacing: "0.6px",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {sc.label}
                  </p>
                  <h3
                    style={{
                      fontSize: 24,
                      fontWeight: 800,
                      color: "var(--text)",
                      margin: "0 0 2px",
                      lineHeight: 1,
                    }}
                  >
                    {sc.value}
                  </h3>
                  <p
                    style={{
                      fontSize: 10,
                      color: sc.subColor || "var(--muted)",
                      margin: 0,
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {sc.sub}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* ── Appointments table ── */}
          <div
            style={{
              background: "var(--card)",
              borderRadius: 12,
              border: "1px solid var(--border)",
              boxShadow: "var(--shadow)",
              marginBottom: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: isMobile ? "10px 12px" : "14px 18px",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <h2 style={{ fontSize: isMobile ? 13 : 14, fontWeight: 700 }}>
                Appointment History
              </h2>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {apptStatFilter && (
                  <button
                    onClick={() => setApptStatFilter("")}
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--royal)",
                      background: "var(--light-blue)",
                      border: "none",
                      borderRadius: 6,
                      padding: "4px 10px",
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    Clear filter ✕
                  </button>
                )}
                <span
                  style={{
                    color: "var(--muted)",
                    fontSize: isMobile ? 11 : 12,
                  }}
                >
                  {filteredAppts.length} record
                  {filteredAppts.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
            <div
              style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 13,
                  minWidth: 780,
                }}
              >
                <thead>
                  <tr>
                    {[
                      "Pet",
                      "Veterinarian",
                      "Date & Time",
                      "Room",
                      "Purpose",
                      "Price",
                      "Status",
                      "Actions",
                    ].map((h) => (
                      <th
                        key={h}
                        style={{
                          background: "var(--bg)",
                          padding: "11px 14px",
                          textAlign: "left",
                          fontSize: 11,
                          fontWeight: 700,
                          color: "var(--muted)",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          borderBottom: "1px solid var(--border)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    [1, 2, 3, 4, 5].map((i) => (
                      <tr key={i}>
                        {[...Array(8)].map((_, j) => (
                          <td
                            key={j}
                            style={{
                              padding: "15px 14px",
                              borderBottom: "1px solid var(--border)",
                            }}
                          >
                            <Skeleton w="70%" h={13} r={5} />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : filteredAppts.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        style={{
                          textAlign: "center",
                          padding: 40,
                          color: "var(--muted)",
                        }}
                      >
                        {apptStatFilter
                          ? "No appointments match this filter"
                          : "No appointments yet"}
                      </td>
                    </tr>
                  ) : (
                    filteredAppts.map((a) => {
                      const statusDotColor =
                        {
                          Confirmed: "#16a34a",
                          Pending: "#d97706",
                          Cancelled: "#dc2626",
                          Completed: "#2563eb",
                        }[a.status] || "#9ca3af";
                      const purposeStyle = {
                        Consultation: { bg: "#f8fafc", color: "#475569" },
                        Vaccination: { bg: "#f0fdf4", color: "#15803d" },
                        Deworming: { bg: "#f3e8ff", color: "#6d28d9" },
                        Imaging: { bg: "#eff6ff", color: "#1d4ed8" },
                        Diagnostics: { bg: "#fee2e2", color: "#dc2626" },
                      }[a.purpose] || { bg: "#f8fafc", color: "#475569" };
                      return (
                        <tr
                          key={a.id}
                          className="fade-in"
                          onClick={() => {
                            setSelectedAppt(a);
                            setShowViewModal(true);
                          }}
                          style={{
                            background: "var(--card)",
                            animationDelay: `${filteredAppts.indexOf(a) * 0.05}s`,
                            cursor: "pointer",
                          }}
                        >
                          {/* Pet */}
                          <td
                            style={{
                              padding: "13px 14px",
                              borderBottom: "1px solid var(--border)",
                              color: "var(--text)",
                              verticalAlign: "middle",
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
                                  width: 34,
                                  height: 34,
                                  borderRadius: 10,
                                  flexShrink: 0,
                                  background: "#eff6ff",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <svg
                                  width="16"
                                  height="16"
                                  viewBox="0 0 16 16"
                                  fill="#1d4ed8"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path
                                    fillRule="evenodd"
                                    clipRule="evenodd"
                                    d="M16 4V7C16 9.20914 14.2091 11 12 11H10V15H0V13L0.931622 10.8706C1.25226 10.9549 1.59036 11 1.94124 11C3.74931 11 5.32536 9.76947 5.76388 8.01538L3.82359 7.53031C3.60766 8.39406 2.83158 9.00001 1.94124 9.00001C1.87789 9.00001 1.81539 8.99702 1.75385 8.99119C1.02587 8.92223 0.432187 8.45551 0.160283 7.83121C0.0791432 7.64491 0.0266588 7.44457 0.00781272 7.23658C-0.0112323 7.02639 0.00407892 6.80838 0.0588889 6.58914L0.698705 4.02986C1.14387 2.24919 2.7438 1 4.57928 1H10L12 4H16ZM9 6C9.55229 6 10 5.55228 10 5C10 4.44772 9.55229 4 9 4C8.44771 4 8 4.44772 8 5C8 5.55228 8.44771 6 9 6Z"
                                  />
                                </svg>
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, fontSize: 13 }}>
                                  {a.patient}
                                </div>
                                <div
                                  style={{
                                    fontSize: 11,
                                    color: "var(--muted)",
                                    marginTop: 1,
                                  }}
                                >
                                  {a.purpose}
                                </div>
                              </div>
                            </div>
                          </td>
                          {/* Vet */}
                          <td
                            style={{
                              padding: "13px 14px",
                              borderBottom: "1px solid var(--border)",
                              color: "var(--text)",
                              verticalAlign: "middle",
                            }}
                          >
                            <span style={{ fontSize: 13 }}>{a.vet || "—"}</span>
                          </td>
                          {/* Date & Time */}
                          <td
                            style={{
                              padding: "13px 14px",
                              borderBottom: "1px solid var(--border)",
                              verticalAlign: "middle",
                            }}
                          >
                            <div
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                background: "#eff6ff",
                                border: "1px solid #bfdbfe",
                                borderRadius: 8,
                                padding: "4px 10px",
                              }}
                            >
                              <svg
                                width="13"
                                height="13"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#1d4ed8"
                                strokeWidth="2"
                                strokeLinecap="round"
                              >
                                <rect
                                  x="3"
                                  y="4"
                                  width="18"
                                  height="18"
                                  rx="2"
                                  ry="2"
                                />
                                <line x1="16" y1="2" x2="16" y2="6" />
                                <line x1="8" y1="2" x2="8" y2="6" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                              </svg>
                              <div>
                                <div
                                  style={{
                                    fontWeight: 600,
                                    fontSize: 12,
                                    color: "#1e40af",
                                  }}
                                >
                                  {a.date}
                                </div>
                                <div style={{ fontSize: 11, color: "#3b82f6" }}>
                                  {a.time}
                                </div>
                              </div>
                            </div>
                          </td>
                          {/* Room */}
                          <td
                            style={{
                              padding: "13px 14px",
                              borderBottom: "1px solid var(--border)",
                              verticalAlign: "middle",
                            }}
                          >
                            {a.room ? (
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4,
                                  background: "#eff6ff",
                                  border: "1px solid #bfdbfe",
                                  color: "#1e40af",
                                  borderRadius: 6,
                                  padding: "3px 9px",
                                  fontSize: 12,
                                  fontWeight: 600,
                                }}
                              >
                                <svg
                                  width="11"
                                  height="11"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                >
                                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                  <polyline points="9 22 9 12 15 12 15 22" />
                                </svg>{" "}
                                {a.room}
                              </span>
                            ) : (
                              <span
                                style={{
                                  fontSize: 12,
                                  color: "var(--muted)",
                                  fontStyle: "italic",
                                }}
                              >
                                Unassigned
                              </span>
                            )}
                          </td>
                          {/* Purpose */}
                          <td
                            style={{
                              padding: "13px 14px",
                              borderBottom: "1px solid var(--border)",
                              verticalAlign: "middle",
                            }}
                          >
                            <span
                              style={{
                                fontSize: 11,
                                padding: "3px 9px",
                                borderRadius: 6,
                                fontWeight: 600,
                                background: purposeStyle.bg,
                                color: purposeStyle.color,
                              }}
                            >
                              {a.purpose}
                            </span>
                          </td>
                          {/* Price */}
                          <td
                            style={{
                              padding: "13px 14px",
                              borderBottom: "1px solid var(--border)",
                              verticalAlign: "middle",
                            }}
                          >
                            <span
                              style={{
                                fontSize: 12,
                                fontWeight: 700,
                                color: "#16a34a",
                              }}
                            >
                              {a.price
                                ? `₱${Number(a.price).toLocaleString()}`
                                : "—"}
                            </span>
                          </td>
                          {/* Status */}
                          <td
                            style={{
                              padding: "13px 14px",
                              borderBottom: "1px solid var(--border)",
                              verticalAlign: "middle",
                            }}
                          >
                            <span
                              className={`badge ${STATUS_BADGE[a.status] || "badge-gray"}`}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 5,
                              }}
                            >
                              <span
                                style={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: "50%",
                                  background: statusDotColor,
                                  flexShrink: 0,
                                  display: "inline-block",
                                }}
                              />
                              {a.status}
                            </span>
                          </td>
                          {/* Actions */}
                          <td
                            style={{
                              padding: "8px 14px",
                              borderBottom: "1px solid var(--border)",
                              verticalAlign: "middle",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                gap: 6,
                                justifyContent: "flex-start",
                                alignItems: "center",
                              }}
                            >
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
                                  fontFamily: "inherit",
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedAppt(a);
                                  setShowViewModal(true);
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
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                  <circle cx="12" cy="12" r="3" />
                                </svg>
                                View
                              </button>
                              {(a.status === "Pending" ||
                                a.status === "Confirmed") && (
                                <button
                                  title="Cancel"
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
                                    fontFamily: "inherit",
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    cancelAppt(a.id);
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
                                  Cancel
                                </button>
                              )}
                              {a.status === "Completed" &&
                                (myReviews[a.id] ? (
                                  <span
                                    title="Reviewed"
                                    style={{
                                      height: 28,
                                      padding: "0 10px",
                                      gap: 5,
                                      display: "inline-flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      background: "#fefce8",
                                      border: "1.5px solid #fde68a",
                                      color: "#a16207",
                                      borderRadius: 20,
                                      fontSize: 11,
                                      fontWeight: 600,
                                    }}
                                  >
                                    <svg
                                      width="12"
                                      height="12"
                                      viewBox="0 0 24 24"
                                      fill="currentColor"
                                      stroke="none"
                                    >
                                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                    </svg>
                                    Reviewed
                                  </span>
                                ) : (
                                  <button
                                    title="Rate Service"
                                    style={{
                                      height: 28,
                                      padding: "0 10px",
                                      gap: 5,
                                      display: "inline-flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      background: "#fefce8",
                                      border: "1.5px solid #fde68a",
                                      color: "#a16207",
                                      borderRadius: 20,
                                      fontSize: 11,
                                      fontWeight: 600,
                                      cursor: "pointer",
                                      fontFamily: "inherit",
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openReviewModal(a);
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
                                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                    </svg>
                                    Review
                                  </button>
                                ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          BOOK APPOINTMENT MODAL
      ══════════════════════════════════════════ */}
      {showModal && (
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
            overflowY: "auto",
          }}
        >
          <div
            style={{
              background: "var(--card)",
              borderRadius: 14,
              width: "100%",
              maxWidth: 620,
              maxHeight: "calc(100vh - 32px)",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 24px 64px rgba(0,0,0,0.28)",
              overflow: "hidden",
              margin: "auto",
            }}
          >
            {/* Clipboard top bar */}
            <div
              style={{
                background: "linear-gradient(135deg, #0f172a, #1e3a8a)",
                padding: "10px 24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderRadius: "14px 14px 0 0",
                flexShrink: 0,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 48,
                    height: 18,
                    background: "rgba(255,255,255,0.25)",
                    borderRadius: 4,
                    border: "2px solid rgba(255,255,255,0.35)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <div
                    style={{
                      width: 20,
                      height: 8,
                      background: "rgba(255,255,255,0.4)",
                      borderRadius: 2,
                    }}
                  />
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
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

            {/* Record header */}
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
                <img
                  src="/icon/appointment.png"
                  alt=""
                  style={{ width: 22, height: 22, objectFit: "contain" }}
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
                <h3
                  style={{
                    margin: 0,
                    fontSize: 15,
                    fontWeight: 800,
                    color: "var(--text)",
                    letterSpacing: "0.3px",
                  }}
                >
                  Appointment Record
                </h3>
              </div>
              <p style={{ margin: 0, fontSize: 11, color: "var(--muted)" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  Request will be reviewed by staff
                </span>
              </p>
            </div>

            {/* Modal body */}
            <div style={{ overflowY: "auto", flex: 1 }}>
              {bookStep === "service" && (
                <div style={{ padding: "18px 16px" }}>
                  <p
                    style={{
                      margin: "0 0 12px",
                      fontSize: 12,
                      fontWeight: 700,
                      color: "var(--muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.6px",
                    }}
                  >
                    Select a Service
                  </p>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(140px, 1fr))",
                      gap: 10,
                    }}
                  >
                    {SERVICE_OPTIONS.map((opt) => {
                      const meta = SERVICE_META[opt] || {
                        icon: (
                          <svg
                            viewBox="0 0 24 24"
                            fill="#475569"
                            style={{ width: 16, height: 16 }}
                          >
                            <path d="M8.5 12c1.4 0 2.5-1.6 2.5-3.5S9.9 5 8.5 5 6 6.6 6 8.5 7.1 12 8.5 12zm7 0c1.4 0 2.5-1.6 2.5-3.5S16.9 5 15.5 5 13 6.6 13 8.5s1.1 3.5 2.5 3.5zM4.5 15c1.1 0 2-1.3 2-2.8s-.9-2.8-2-2.8-2 1.3-2 2.8.9 2.8 2 2.8zm15 0c1.1 0 2-1.3 2-2.8s-.9-2.8-2-2.8-2 1.3-2 2.8.9 2.8 2 2.8zM12 13.5c-2.3 0-5.5 3-5.5 5.5 0 1.1.9 1.5 2 1.5 1.2 0 2.3-.8 3.5-.8s2.3.8 3.5.8c1.1 0 2-.4 2-1.5 0-2.5-3.2-5.5-5.5-5.5z" />
                          </svg>
                        ),
                        color: "#475569",
                        bg: "#f8fafc",
                      };
                      const price =
                        opt === "Imaging"
                          ? null
                          : getServicePrice(opt, user.branchId);
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => {
                            updatePet(0, {
                              purpose: opt,
                              imagingType: "",
                              vet: pets[0].vet,
                            });
                            setBookStep("form");
                          }}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 6,
                            padding: "16px 10px",
                            borderRadius: 12,
                            cursor: "pointer",
                            border: `1.5px solid ${meta.color}33`,
                            background: meta.bg,
                            fontFamily: "inherit",
                            transition: "transform 0.12s, box-shadow 0.12s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform =
                              "translateY(-2px)";
                            e.currentTarget.style.boxShadow = `0 6px 16px ${meta.color}22`;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.boxShadow = "none";
                          }}
                        >
                          <span style={{ display: "inline-flex" }}>
                            {meta.icon}
                          </span>
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                              color: meta.color,
                            }}
                          >
                            {opt}
                          </span>
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: "var(--muted)",
                            }}
                          >
                            {opt === "Imaging"
                              ? "Choose type next"
                              : price != null
                                ? `₱${Number(price).toLocaleString()}`
                                : "Contact clinic"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {bookStep === "form" &&
                pets.map((pet, idx) => {
                  return (
                    <div
                      key={idx}
                      style={{ borderBottom: "6px solid var(--bg)" }}
                    >
                      {/* Pet header bar */}
                      <div
                        style={{
                          background: "var(--bg)",
                          borderBottom: "1px solid var(--border)",
                          padding: "6px 16px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 800,
                            textTransform: "uppercase",
                            letterSpacing: "1px",
                            color: "var(--muted)",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                          }}
                        >
                          <svg
                            width="11"
                            height="11"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          >
                            <circle cx="7" cy="10" r="2" />
                            <circle cx="17" cy="10" r="2" />
                            <path d="M12 14c-3.3 0-6 2-6 4.5h12c0-2.5-2.7-4.5-6-4.5z" />
                          </svg>
                          Pet {idx + 1} of {pets.length}
                        </span>
                        {pets.length > 1 && (
                          <button
                            onClick={() => removePet(idx)}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: "#dc2626",
                              fontSize: 11,
                              fontWeight: 700,
                              padding: "2px 6px",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              fontFamily: "inherit",
                            }}
                          >
                            <svg
                              width="11"
                              height="11"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                            >
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                            Remove
                          </button>
                        )}
                      </div>

                      {/* Existing / New toggle */}
                      <div
                        style={{
                          padding: "10px 16px",
                          borderBottom: "1px solid #e2e8f0",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            border: "1.5px solid var(--border)",
                            borderRadius: 8,
                            overflow: "hidden",
                            width: "fit-content",
                            marginBottom: pet.mode === "existing" ? 10 : 0,
                          }}
                        >
                          {[
                            { key: "new", label: "New Pet" },
                            { key: "existing", label: "My Pets" },
                          ].map(({ key, label }) => (
                            <button
                              key={key}
                              type="button"
                              onClick={() =>
                                updatePet(
                                  idx,
                                  key === "existing"
                                    ? {
                                        mode: "existing",
                                        patient: "",
                                        species: "Dog",
                                      }
                                    : { mode: "new", existingId: null },
                                )
                              }
                              style={{
                                padding: "6px 16px",
                                border: "none",
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: "pointer",
                                fontFamily: "inherit",
                                transition: "all 0.15s",
                                background:
                                  pet.mode === key ? "var(--royal)" : "#fff",
                                color:
                                  pet.mode === key ? "#fff" : "var(--muted)",
                              }}
                            >
                              {label}
                            </button>
                          ))}
                        </div>

                        {pet.mode === "existing" ? (
                          loadingMyPets ? (
                            <div
                              style={{ fontSize: 12, color: "var(--muted)" }}
                            >
                              Loading your pets…
                            </div>
                          ) : myPets.length === 0 ? (
                            <div
                              style={{
                                fontSize: 12,
                                color: "var(--muted)",
                                background: "var(--bg)",
                                border: "1px solid var(--border)",
                                borderRadius: 8,
                                padding: "8px 12px",
                              }}
                            >
                              You don't have any registered pets yet. Switch to
                              "New Pet" to add one.
                            </div>
                          ) : (
                            <PetPicker
                              pets={myPets}
                              value={pet.existingId}
                              onChange={(id) => {
                                const sel = myPets.find((mp) => mp.id === id);
                                updatePet(idx, {
                                  existingId: sel?.id || null,
                                  species: sel?.species || "Dog",
                                });
                              }}
                            />
                          )
                        ) : (
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                              gap: 10,
                            }}
                          >
                            <div>
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
                                Pet Name{" "}
                                <span style={{ color: "#ef4444" }}>*</span>
                              </div>
                              <input
                                type="text"
                                value={pet.patient}
                                onChange={(e) =>
                                  updatePet(idx, { patient: e.target.value })
                                }
                                placeholder="e.g. Buddy"
                                style={{
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
                                }}
                              />
                            </div>
                            <div>
                              <div
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  color: "#94a3b8",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.8px",
                                  marginBottom: 8,
                                }}
                              >
                                Pet Type
                              </div>
                              <div style={{ display: "flex", gap: 8 }}>
                                {["Dog", "Cat"].map((type) => (
                                  <div
                                    key={type}
                                    onClick={() =>
                                      updatePet(idx, { species: type })
                                    }
                                    style={{
                                      flex: 1,
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 6,
                                      padding: "6px 10px",
                                      borderRadius: 8,
                                      cursor: "pointer",
                                      border: `1.5px solid ${pet.species === type ? (type === "Dog" ? "#1d4ed8" : "#15803d") : "#e2e8f0"}`,
                                      background:
                                        pet.species === type
                                          ? type === "Dog"
                                            ? "#eff6ff"
                                            : "#f0fdf4"
                                          : "transparent",
                                      transition: "all 0.15s",
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontSize: 12,
                                        fontWeight: 700,
                                        color:
                                          pet.species === type
                                            ? type === "Dog"
                                              ? "#1d4ed8"
                                              : "#15803d"
                                            : "#94a3b8",
                                      }}
                                    >
                                      {type}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Purpose · Vet */}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                          borderBottom: "1px solid #e2e8f0",
                        }}
                      >
                        <div
                          style={{
                            padding: "10px 16px",
                            borderRight: isMobile
                              ? "none"
                              : "1px solid #e2e8f0",
                            borderBottom: isMobile
                              ? "1px solid #e2e8f0"
                              : "none",
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
                            Purpose
                          </div>
                          <CustomSelect
                            value={pet.purpose}
                            onChange={(val) =>
                              updatePet(idx, {
                                purpose: val,
                                imagingType: "",
                                vet: pet.vet,
                              })
                            }
                            placeholder="— Select Purpose —"
                            options={SERVICE_OPTIONS}
                          />
                          {pet.purpose === "Imaging" && (
                            <div style={{ marginTop: 8 }}>
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
                                Imaging Type{" "}
                                <span style={{ color: "#ef4444" }}>*</span>
                              </div>
                              <CustomSelect
                                value={pet.imagingType}
                                onChange={(val) =>
                                  updatePet(idx, { imagingType: val })
                                }
                                placeholder="— Select Imaging Type —"
                                options={["X-ray", "Ultrasound", "CT-scan"]}
                              />
                            </div>
                          )}
                          {pet.purpose &&
                            (() => {
                              const price = getServicePrice(
                                pet.purpose,
                                user.branchId,
                                pet.imagingType,
                              );
                              return (
                                <div
                                  style={{
                                    marginTop: 8,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    background: "#f0fdf4",
                                    border: "1px solid #bbf7d0",
                                    borderRadius: 8,
                                    padding: "8px 12px",
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize: 11,
                                      fontWeight: 700,
                                      color: "#166534",
                                    }}
                                  >
                                    Service Price
                                  </span>
                                  <span
                                    style={{
                                      fontSize: 14,
                                      fontWeight: 800,
                                      color: "#16a34a",
                                    }}
                                  >
                                    {price != null
                                      ? `₱${Number(price).toLocaleString()}`
                                      : "Contact clinic"}
                                  </span>
                                </div>
                              );
                            })()}
                          <p
                            style={{
                              margin: "6px 0 0",
                              fontSize: 10,
                              color: "var(--muted)",
                              fontStyle: "italic",
                            }}
                          >
                            Price is fixed by the clinic and cannot be changed
                            here.
                          </p>
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
                            Preferred Vet{" "}
                            <span style={{ color: "#ef4444" }}>*</span>
                          </div>
                          <CustomSelect
                            value={pet.vet}
                            onChange={(val) => {
                              updatePet(idx, { vet: val, time: "" });
                              if (pet.date) fetchVetBookedTimes(val, pet.date);
                            }}
                            placeholder="— Select Vet —"
                            options={VETS}
                          />
                          {pet.vet &&
                            pet.vet !== "Any Available" &&
                            vetSchedule[pet.vet] && (
                              <p
                                style={{
                                  margin: "6px 0 0",
                                  fontSize: 10,
                                  color: "var(--muted)",
                                }}
                              >
                                Available days:{" "}
                                {vetSchedule[pet.vet]
                                  .map((d) => DAY_NAMES[d])
                                  .join(", ")}
                              </p>
                            )}
                          {pet.vet &&
                            pet.vet !== "Any Available" &&
                            vetTimeSchedule[pet.vet] && (
                              <p
                                style={{
                                  margin: "2px 0 0",
                                  fontSize: 10,
                                  color: "var(--muted)",
                                }}
                              >
                                Available times:{" "}
                                {vetTimeSchedule[pet.vet].join(", ")}
                              </p>
                            )}
                        </div>
                      </div>

                      {/* Date · Time */}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                          borderBottom: "1px solid #e2e8f0",
                        }}
                      >
                        <div
                          style={{
                            padding: "10px 16px",
                            borderRight: isMobile
                              ? "none"
                              : "1px solid #e2e8f0",
                            borderBottom: isMobile
                              ? "1px solid #e2e8f0"
                              : "none",
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
                            Date <span style={{ color: "#ef4444" }}>*</span>
                          </div>
                          <DatePicker
                            value={pet.date}
                            min={today}
                            onChange={(val) => {
                              updatePet(idx, { date: val, time: "" });
                              if (pet.vet && pet.vet !== "Any Available")
                                fetchVetBookedTimes(pet.vet, val);
                            }}
                            placeholder="Select date"
                          />
                          {pet.vet &&
                            pet.vet !== "Any Available" &&
                            pet.date &&
                            !isVetAvailableOnDate(pet.vet, pet.date) && (
                              <p
                                style={{
                                  margin: "6px 0 0",
                                  fontSize: 11,
                                  color: "#dc2626",
                                  fontWeight: 600,
                                }}
                              >
                                {pet.vet} isn't available on this day. Try{" "}
                                {vetSchedule[pet.vet]
                                  ?.map((d) => DAY_NAMES[d])
                                  .join(", ") || "another day"}
                                .
                              </p>
                            )}
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
                            Time <span style={{ color: "#ef4444" }}>*</span>
                          </div>
                          <CustomSelect
                            value={pet.time}
                            onChange={(val) => updatePet(idx, { time: val })}
                            placeholder="— Select Time —"
                            options={TIMES.map((t) => {
                              const vetKey =
                                pet.vet && pet.date
                                  ? `${pet.vet}|${pet.date}`
                                  : null;
                              const vetTaken =
                                vetKey &&
                                pet.vet !== "Any Available" &&
                                (vetBookedTimes[vetKey] || []).includes(t);
                              const vetDayBlocked =
                                pet.vet &&
                                pet.vet !== "Any Available" &&
                                pet.date &&
                                !isVetAvailableOnDate(pet.vet, pet.date);
                              const vetTimeBlocked =
                                pet.vet &&
                                pet.vet !== "Any Available" &&
                                !isVetAvailableAtTime(pet.vet, t);
                              const disabled =
                                vetTaken || vetDayBlocked || vetTimeBlocked;
                              let label = t;
                              if (vetDayBlocked)
                                label = `${t} — Vet unavailable`;
                              else if (vetTimeBlocked)
                                label = `${t} — Not this vet's hours`;
                              else if (vetTaken)
                                label = `${t} — Already booked`;
                              return { value: t, label, disabled };
                            })}
                          />
                        </div>
                      </div>

                      {/* Conflict banners */}
                      {getVetConflictFor(pet) === "vet-day" && (
                        <div
                          style={{
                            background: "#fee2e2",
                            borderTop: "1px solid #fca5a5",
                            padding: "10px 16px",
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <p
                            style={{
                              margin: 0,
                              color: "#b91c1c",
                              fontSize: 11,
                            }}
                          >
                            {pet.vet} doesn't work on this day. Please pick
                            another date or vet.
                          </p>
                        </div>
                      )}
                      {getVetConflictFor(pet) === "vet-time" && (
                        <div
                          style={{
                            background: "#fee2e2",
                            borderTop: "1px solid #fca5a5",
                            padding: "10px 16px",
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <p
                            style={{
                              margin: 0,
                              color: "#b91c1c",
                              fontSize: 11,
                            }}
                          >
                            {pet.vet} isn't available at this time. Available
                            times: {vetTimeSchedule[pet.vet]?.join(", ") || "—"}
                            .
                          </p>
                        </div>
                      )}
                      {getVetConflictFor(pet) === "vet-slot" && (
                        <div
                          style={{
                            background: "#fee2e2",
                            borderTop: "1px solid #fca5a5",
                            padding: "10px 16px",
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <p
                            style={{
                              margin: 0,
                              color: "#b91c1c",
                              fontSize: 11,
                            }}
                          >
                            {pet.vet} is already booked at that time. Please
                            pick a different slot.
                          </p>
                        </div>
                      )}

                      {/* Notes */}
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
                          Notes for this pet
                        </div>
                        <textarea
                          value={pet.notes}
                          onChange={(e) =>
                            updatePet(idx, { notes: e.target.value })
                          }
                          placeholder="Symptoms or concerns for this pet..."
                          style={{
                            width: "100%",
                            border: "1px solid var(--border)",
                            borderRadius: 8,
                            background: "transparent",
                            fontSize: 13,
                            color: "var(--text)",
                            outline: "none",
                            resize: "vertical",
                            minHeight: 50,
                            fontFamily: "inherit",
                            lineHeight: 1.6,
                            boxSizing: "border-box",
                            padding: "8px 10px",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}

              {bookStep === "form" && (
                <>
                  {/* Add another pet */}
                  <div
                    style={{
                      padding: "12px 16px",
                      borderBottom: "1.5px solid #e2e8f0",
                    }}
                  >
                    <button
                      type="button"
                      onClick={addPet}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: 8,
                        border: "1.5px dashed #c7d2fe",
                        background: "#f5f3ff",
                        color: "#6366f1",
                        fontWeight: 700,
                        fontSize: 12,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                      }}
                    >
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.8"
                      >
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      Add Another Pet
                    </button>
                  </div>

                  {/* Shared contact */}
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
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        <svg
                          width="11"
                          height="11"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        >
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                        Contact
                      </span>
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
                        Contact Number
                      </div>{" "}
                      <input
                        type="text"
                        value={contact}
                        onChange={(e) =>
                          setContact(sanitizeContact(e.target.value))
                        }
                        placeholder="e.g. 09170000000"
                        inputMode="numeric"
                        maxLength={11}
                        style={{
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
                        }}
                      />
                      {contact && contact.length !== 11 && (
                        <p
                          style={{
                            fontSize: 11,
                            color: "#dc2626",
                            margin: "4px 0 0",
                          }}
                        >
                          Contact number must be 11 digits.
                        </p>
                      )}
                      <div
                        style={{
                          background: "#eff6ff",
                          border: "1px solid #bfdbfe",
                          borderRadius: 8,
                          padding: "8px 12px",
                          fontSize: 11,
                          color: "#1e40af",
                          marginTop: 10,
                        }}
                      >
                        {pets.length > 1
                          ? "All appointments"
                          : "Your appointment"}{" "}
                        will be <strong>Pending</strong> until staff approves{" "}
                        {pets.length > 1 ? "them" : "it"}.
                      </div>
                    </div>
                  </div>
                </>
              )}

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

            {/* Modal footer */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
                padding: "14px 24px",
                borderTop: "2px solid var(--border)",
                background: "var(--bg)",
                flexShrink: 0,
                flexWrap: "wrap",
              }}
            >
              <div>
                {bookStep === "form" && (
                  <button
                    className="btn btn-ghost"
                    style={{ width: "auto" }}
                    onClick={() => setBookStep("service")}
                  >
                    ← Change Service
                  </button>
                )}
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  className="btn btn-ghost"
                  style={{ width: "auto" }}
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  style={{
                    width: "auto",
                    background: "#0f172a",
                    borderColor: "#0f172a",
                    opacity:
                      bookStep !== "form" || hasAnyConflict || isFormIncomplete
                        ? 0.5
                        : 1,
                    cursor:
                      bookStep !== "form" || hasAnyConflict || isFormIncomplete
                        ? "not-allowed"
                        : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                  onClick={saveAppt}
                  disabled={
                    saving ||
                    bookStep !== "form" ||
                    hasAnyConflict ||
                    isFormIncomplete
                  }
                  title={
                    bookStep !== "form"
                      ? "Please select a service first."
                      : isFormIncomplete
                        ? "Please fill in all required fields before submitting."
                        : undefined
                  }
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {saving
                    ? "Submitting..."
                    : pets.length > 1
                      ? `Submit ${pets.length} Requests`
                      : "Submit Request"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ VIEW APPOINTMENT MODAL ══ */}
      {showViewModal &&
        selectedAppt &&
        (() => {
          const statusTheme = {
            Confirmed: {
              dot: "#16a34a",
              text: "#166534",
              bg: "#f0fdf4",
              border: "#bbf7d0",
            },
            Pending: {
              dot: "#d97706",
              text: "#92400e",
              bg: "#fffbeb",
              border: "#fde68a",
            },
            Cancelled: {
              dot: "#dc2626",
              text: "#991b1b",
              bg: "#fef2f2",
              border: "#fecaca",
            },
            Completed: {
              dot: "#2563eb",
              text: "#1e40af",
              bg: "#eff6ff",
              border: "#bfdbfe",
            },
          }[selectedAppt.status] || {
            dot: "#9ca3af",
            text: "#475569",
            bg: "#f8fafc",
            border: "#e2e8f0",
          };

          const infoRow = (label, value, icon) => (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 7,
                  background: "var(--light-blue)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: 1,
                }}
              >
                {icon}
              </div>
              <div style={{ minWidth: 0 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: 9.5,
                    fontWeight: 700,
                    color: "#94a3b8",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  {label}
                </p>
                <p
                  style={{
                    margin: "2px 0 0",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--text)",
                    wordBreak: "break-word",
                  }}
                >
                  {value}
                </p>
              </div>
            </div>
          );

          const icons = {
            pet: (
              <svg
                viewBox="0 0 20 20"
                fill="#1e3a8a"
                style={{ width: 13, height: 13 }}
              >
                <path d="M11.9 8.4c1.3 0 2.1-1.9 2.1-3.1 0-1-.5-2.2-1.5-2.2-1.3 0-2.1 1.9-2.1 3.1 0 1 .5 2.2 1.5 2.2zm-3.8 0c1 0 1.5-1.2 1.5-2.2C9.6 4.9 8.8 3 7.5 3 6.5 3 6 4.2 6 5.2c-.1 1.3.7 3.2 2.1 3.2zm7.4-1c-1.3 0-2.2 1.8-2.2 3.1 0 .9.4 1.8 1.3 1.8 1.3 0 2.2-1.8 2.2-3.1 0-.9-.5-1.8-1.3-1.8zm-8.7 3.1c0-1.3-1-3.1-2.2-3.1-.9 0-1.3.9-1.3 1.8 0 1.3 1 3.1 2.2 3.1.9 0 1.3-.9 1.3-1.8zm3.2-.2c-2 0-4.7 3.2-4.7 5.4 0 1 .7 1.3 1.5 1.3 1.2 0 2.1-.8 3.2-.8 1 0 1.9.8 3 .8.8 0 1.7-.2 1.7-1.3 0-2.2-2.7-5.4-4.7-5.4z" />
              </svg>
            ),
            purpose: (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="#1e3a8a"
                strokeWidth="2"
                strokeLinecap="round"
                style={{ width: 13, height: 13 }}
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            ),
            vet: (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="#1e3a8a"
                strokeWidth="2"
                strokeLinecap="round"
                style={{ width: 13, height: 13 }}
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            ),
            room: (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="#1e3a8a"
                strokeWidth="2"
                strokeLinecap="round"
                style={{ width: 13, height: 13 }}
              >
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            ),
            date: (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="#1e3a8a"
                strokeWidth="2"
                strokeLinecap="round"
                style={{ width: 13, height: 13 }}
              >
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            ),
            time: (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="#1e3a8a"
                strokeWidth="2"
                strokeLinecap="round"
                style={{ width: 13, height: 13 }}
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            ),
            contact: (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="#1e3a8a"
                strokeWidth="2"
                strokeLinecap="round"
                style={{ width: 13, height: 13 }}
              >
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.59 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            ),
            notes: (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="#1e3a8a"
                strokeWidth="2"
                strokeLinecap="round"
                style={{ width: 13, height: 13 }}
              >
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            ),
          };

          return (
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(15,23,42,0.55)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 9999,
                padding: 16,
              }}
              onClick={() => {
                setShowViewModal(false);
                setSelectedAppt(null);
              }}
            >
              <div
                style={{
                  background: "var(--card)",
                  borderRadius: 16,
                  width: "100%",
                  maxWidth: 460,
                  boxShadow: "0 32px 80px rgba(0,0,0,0.35)",
                  overflow: "hidden",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div
                  style={{
                    background:
                      "linear-gradient(135deg,#0f172a 0%,#1e3a8a 100%)",
                    padding: "20px 22px 18px",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: -30,
                      right: -30,
                      width: 140,
                      height: 140,
                      borderRadius: "50%",
                      background: "rgba(255,255,255,0.04)",
                    }}
                  />
                  <div
                    style={{
                      position: "relative",
                      zIndex: 1,
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 10,
                          fontWeight: 700,
                          color: "rgba(255,255,255,0.55)",
                          textTransform: "uppercase",
                          letterSpacing: "0.6px",
                        }}
                      >
                        Appointment · #
                        {String(selectedAppt.id).slice(-6).toUpperCase()}
                      </p>
                      <h3
                        style={{
                          margin: "4px 0 0",
                          fontSize: 18,
                          fontWeight: 800,
                          color: "#fff",
                        }}
                      >
                        {selectedAppt.patient}
                      </h3>
                      <p
                        style={{
                          margin: "2px 0 0",
                          fontSize: 12,
                          color: "rgba(255,255,255,0.65)",
                        }}
                      >
                        {selectedAppt.purpose}
                        {selectedAppt.date ? ` · ${selectedAppt.date}` : ""}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setShowViewModal(false);
                        setSelectedAppt(null);
                      }}
                      style={{
                        background: "rgba(255,255,255,0.1)",
                        border: "none",
                        borderRadius: 8,
                        width: 28,
                        height: 28,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#fff",
                        flexShrink: 0,
                      }}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        style={{ width: 13, height: 13 }}
                      >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                  <div
                    style={{
                      position: "relative",
                      zIndex: 1,
                      marginTop: 14,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      background: "rgba(255,255,255,0.12)",
                      border: "1px solid rgba(255,255,255,0.18)",
                      borderRadius: 20,
                      padding: "4px 10px 4px 8px",
                    }}
                  >
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: statusTheme.dot,
                      }}
                    />
                    <span
                      style={{ fontSize: 11.5, fontWeight: 700, color: "#fff" }}
                    >
                      {selectedAppt.status}
                    </span>
                    {selectedAppt.status === "Pending" && (
                      <span
                        style={{
                          fontSize: 10.5,
                          color: "rgba(255,255,255,0.6)",
                        }}
                      >
                        · Awaiting approval
                      </span>
                    )}
                  </div>
                </div>

                {/* Body */}
                <div
                  style={{ padding: "18px 22px", background: "var(--card)" }}
                >
                  {/* Schedule section */}
                  <p
                    style={{
                      margin: "0 0 10px",
                      fontSize: 10,
                      fontWeight: 800,
                      color: "#94a3b8",
                      textTransform: "uppercase",
                      letterSpacing: "0.6px",
                    }}
                  >
                    Schedule
                  </p>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "14px 16px",
                      marginBottom: 18,
                    }}
                  >
                    {infoRow("Date", selectedAppt.date, icons.date)}
                    {infoRow("Time", selectedAppt.time, icons.time)}
                    {infoRow(
                      "Veterinarian",
                      selectedAppt.vet || "—",
                      icons.vet,
                    )}
                    {selectedAppt.room &&
                      infoRow("Room", selectedAppt.room, icons.room)}
                  </div>

                  <div
                    style={{
                      height: 1,
                      background: "var(--border)",
                      margin: "0 0 18px",
                    }}
                  />

                  {/* Patient & billing section */}
                  <p
                    style={{
                      margin: "0 0 10px",
                      fontSize: 10,
                      fontWeight: 800,
                      color: "#94a3b8",
                      textTransform: "uppercase",
                      letterSpacing: "0.6px",
                    }}
                  >
                    Patient & Billing
                  </p>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "14px 16px",
                    }}
                  >
                    {infoRow("Pet Name", selectedAppt.patient, icons.pet)}
                    {infoRow("Purpose", selectedAppt.purpose, icons.purpose)}
                    {infoRow(
                      "Contact",
                      selectedAppt.contact || "—",
                      icons.contact,
                    )}
                  </div>

                  {/* Price highlight */}
                  <div
                    style={{
                      marginTop: 16,
                      background: "var(--bg)",
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      padding: "12px 14px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "var(--muted)",
                      }}
                    >
                      Estimated Cost
                    </span>
                    <span
                      style={{
                        fontSize: 17,
                        fontWeight: 800,
                        color: "var(--royal)",
                      }}
                    >
                      {selectedAppt.price
                        ? `₱${Number(selectedAppt.price).toLocaleString()}`
                        : "—"}
                    </span>
                  </div>

                  {/* Notes */}
                  {selectedAppt.notes && (
                    <div style={{ marginTop: 16 }}>
                      <p
                        style={{
                          margin: "0 0 6px",
                          fontSize: 10,
                          fontWeight: 800,
                          color: "#94a3b8",
                          textTransform: "uppercase",
                          letterSpacing: "0.6px",
                        }}
                      >
                        Notes
                      </p>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 12.5,
                          color: "var(--text)",
                          lineHeight: 1.5,
                          background: "var(--bg)",
                          border: "1px solid var(--border)",
                          borderRadius: 8,
                          padding: "10px 12px",
                        }}
                      >
                        {selectedAppt.notes}
                      </p>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div
                  style={{
                    padding: "14px 22px",
                    borderTop: "1px solid var(--border)",
                    background: "var(--bg)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  {selectedAppt.status === "Pending" ||
                  selectedAppt.status === "Confirmed" ? (
                    <button
                      onClick={() => {
                        cancelAppt(selectedAppt.id);
                        setShowViewModal(false);
                        setSelectedAppt(null);
                      }}
                      style={{
                        padding: "9px 16px",
                        borderRadius: 8,
                        border: "1.5px solid #fca5a5",
                        background: "#fef2f2",
                        color: "#dc2626",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        style={{ width: 12, height: 12 }}
                      >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                      Cancel Appointment
                    </button>
                  ) : (
                    <span />
                  )}
                  <button
                    onClick={() => {
                      setShowViewModal(false);
                      setSelectedAppt(null);
                    }}
                    style={{
                      padding: "9px 22px",
                      borderRadius: 8,
                      border: "1px solid #e2e8f0",
                      background: "var(--card)",
                      color: "#64748b",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      {/* ══ REVIEW MODAL ══ */}
      {reviewModal.show && reviewModal.appt && (
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
              maxWidth: 420,
              boxShadow: "0 24px 64px rgba(0,0,0,0.28)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                background: "linear-gradient(135deg,#78350f,#d97706)",
                padding: "16px 20px",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: 15,
                  fontWeight: 800,
                  color: "#fff",
                }}
              >
                Rate Your Visit
              </h3>
              <p
                style={{
                  margin: "4px 0 0",
                  fontSize: 12,
                  color: "rgba(255,255,255,0.85)",
                }}
              >
                {reviewModal.appt.patient} — {reviewModal.appt.date}
              </p>
            </div>
            <div style={{ padding: "20px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 6,
                  marginBottom: 16,
                }}
              >
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg
                    key={star}
                    onClick={() =>
                      setReviewModal((m) => ({ ...m, rating: star }))
                    }
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill={star <= reviewModal.rating ? "#f59e0b" : "none"}
                    stroke={star <= reviewModal.rating ? "#f59e0b" : "#cbd5e1"}
                    strokeWidth="1.5"
                    style={{ cursor: "pointer" }}
                  >
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                ))}
              </div>
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
                Comments (optional)
              </div>
              <textarea
                value={reviewModal.comment}
                onChange={(e) =>
                  setReviewModal((m) => ({ ...m, comment: e.target.value }))
                }
                placeholder="Tell us about your experience..."
                style={{
                  width: "100%",
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  background: "transparent",
                  fontSize: 13,
                  color: "#0f172a",
                  outline: "none",
                  resize: "vertical",
                  minHeight: 70,
                  fontFamily: "inherit",
                  lineHeight: 1.6,
                  boxSizing: "border-box",
                  padding: "8px 10px",
                }}
              />
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                padding: "14px 20px",
                borderTop: "1px solid #e2e8f0",
              }}
            >
              <button
                className="btn btn-ghost"
                style={{ width: "auto" }}
                onClick={() =>
                  setReviewModal({
                    show: false,
                    appt: null,
                    rating: 0,
                    comment: "",
                  })
                }
              >
                Cancel
              </button>
              <button
                className="btn"
                style={{
                  width: "auto",
                  background: "#d97706",
                  color: "#fff",
                  border: "none",
                }}
                disabled={submittingReview}
                onClick={submitReview}
              >
                {submittingReview ? "Submitting..." : "Submit Review"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default CustomerAppointment;
