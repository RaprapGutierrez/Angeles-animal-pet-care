// Inventory.jsx
import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import ReactDOM from "react-dom";
import Layout from "../../components/layout";
import { supabase } from "../../js/Utils/supabase";
import { useCurrentUser } from "../../js/hooks/Usecurrentuser";
import { useBranchFilter, withBranchId } from "../../js/hooks/Usebranchfilter";
import { logActivity } from "../../js/Utils/logActivity";
import "../../styles/Inventory.css";

const Skel = ({ w = "100%", h = 16 }) => (
  <span
    className="skel"
    style={{ width: w, height: h, borderRadius: 8, display: "block" }}
  />
);

const useDebouncedValue = (value, delay = 350) => {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
};

/* ─── Shared CustomSelect / DatePicker (matches Appointments.jsx) ───────────── */
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
      const dropWidth = Math.min(
        Math.max(rect.width, 180),
        window.innerWidth - 16,
      );
      let left = rect.left + window.scrollX;
      const maxLeft = window.scrollX + window.innerWidth - dropWidth - 8;
      const minLeft = window.scrollX + 8;
      if (left > maxLeft) left = maxLeft;
      if (left < minLeft) left = minLeft;
      setDropPos({
        top: showAbove
          ? rect.top + window.scrollY - dropHeight - 6
          : rect.bottom + window.scrollY + 6,
        left,
        width: dropWidth,
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
                      e.currentTarget.style.background = "var(--bg)";
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
          background: "var(--card)",
          fontSize: 13,
          fontWeight: 600,
          color: value ? "var(--text)" : "#b0bac9",
          cursor: "pointer",
          userSelect: "none",
          boxSizing: "border-box",
          boxShadow: open
            ? `0 0 0 3px ${accent}22, 0 2px 8px rgba(0,0,0,0.08)`
            : "0 1px 3px rgba(0,0,0,0.06)",
          borderColor: open ? accent : "var(--border)",
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
            e.currentTarget.style.boxShadow = "0 2px 8px rgba(99,102,241,0.10)";
          }
        }}
        onMouseLeave={(e) => {
          if (!open) {
            e.currentTarget.style.borderColor = "var(--border)";
            e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.06)";
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
            background: open ? accent : "var(--bg)",
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

  const [popPos, setPopPos] = React.useState({ top: 0, left: 0, width: 280 });
  const handleOpen = () => {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const popHeight = 340;
      const popWidth = Math.max(rect.width, 280);
      const spaceBelow = window.innerHeight - rect.bottom;
      const showAbove = spaceBelow < popHeight + 10;
      let left = rect.left + window.scrollX;
      const maxLeft = window.scrollX + window.innerWidth - popWidth - 8;
      const minLeft = window.scrollX + 8;
      if (left > maxLeft) left = maxLeft;
      if (left < minLeft) left = minLeft;
      setPopPos({
        top: showAbove
          ? rect.top + window.scrollY - popHeight - 6
          : rect.bottom + window.scrollY + 6,
        left,
        width: popWidth,
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
              <button
                onClick={() => {
                  const oneYear = new Date();
                  oneYear.setFullYear(oneYear.getFullYear() + 1);
                  const str = oneYear.toISOString().split("T")[0];
                  setViewDate(oneYear);
                  onChange(str);
                  setOpen(false);
                }}
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#166534",
                  background: "#f0fdf4",
                  border: "1px solid #86efac",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  padding: "4px 10px",
                  borderRadius: 6,
                }}
              >
                +1 Year
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

/* ─── Constants ─────────────────────────────────────────────────────────────── */
const CATEGORIES = [
  "Medicine",
  "Vaccine",
  "Supplies",
  "Food",
  "Equipment",
  "Service",
  "Consultation",
  "Grooming",
  "Other",
];
const FORM_CATEGORIES = CATEGORIES.filter(
  (c) => c !== "Consultation" && c !== "Grooming",
);
const NO_STOCK_CATEGORIES = ["Service", "Consultation"];
const UNITS = [
  "pcs",
  "box",
  "bottle",
  "pack",
  "kg",
  "L",
  "tablet",
  "vial",
  "sachet",
];
const SUPPLIER_OPTIONS = [
  "MedVet Supplies Co.",
  "PetCare Distributors",
  "VetPharma Inc.",
  "Zoetis Philippines",
  "Provet Solutions",
  "Health Plus Veterinary Supply",
  "Other",
];
const EXPIRY_REQUIRED_CATEGORIES = ["Medicine", "Vaccine", "Food"];

const CAT_ICON = {
  Service: (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  ),
  Medicine: (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
      <path d="M8 12h8M12 8v8" />
    </svg>
  ),
  Vaccine: (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m18 2 4 4-14 14H4v-4L18 2z" />
      <path d="m14.5 5.5 4 4" />
      <path d="M3 22l3-3" />
      <path d="M9 3 6 6" />
    </svg>
  ),
  Supplies: (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 11V4a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h9" />
      <path d="M9 7h6M9 11h4M9 15h2" />
      <circle cx="17" cy="17" r="3" />
      <path d="m21 21-1.5-1.5" />
    </svg>
  ),
  Food: (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 2.343V8a2 2 0 0 0 2 2h5.657a2 2 0 0 0 1.414-3.414L11.414.929A2 2 0 0 0 10 2.343z" />
      <path d="M10 2v6h6" />
      <path d="M10.5 10C7.46 10 5 12.46 5 15.5S7.46 21 10.5 21 16 18.54 16 15.5 13.54 10 10.5 10z" />
    </svg>
  ),
  Equipment: (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18" />
    </svg>
  ),
  Consultation: (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  ),
  Grooming: (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="6" cy="6" r="3" />
      <path d="M6 9v12M6 9c0 3 4 6 4 9" />
      <path d="m14.5 2.5 7 7-7 7-3-3 4-4-4-4 3-3z" />
    </svg>
  ),
  Other: (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    </svg>
  ),
};
const CAT_COLOR = {
  Service: { bg: "#eef2ff", border: "#c7d2fe", text: "#4338ca" },
  Medicine: { bg: "#eff6ff", border: "#bfdbfe", text: "#1e40af" },
  Vaccine: { bg: "#f0fdf4", border: "#bbf7d0", text: "#166534" },
  Supplies: { bg: "#fef3c7", border: "#fde68a", text: "#92400e" },
  Food: { bg: "#fdf4ff", border: "#e9d5ff", text: "#6b21a8" },
  Equipment: { bg: "#f0fdf4", border: "#86efac", text: "#14532d" },
  Consultation: { bg: "#fff1f2", border: "#fecdd3", text: "#9f1239" },
  Grooming: { bg: "#fff7ed", border: "#fed7aa", text: "#9a3412" },
  Other: { bg: "#f8fafc", border: "#cbd5e1", text: "#475569" },
};

const getPermissions = (role) => {
  const r = (role || "").toLowerCase();
  if (["admin", "super_admin", "manager", "employee", "staff"].includes(r))
    return {
      canView: true,
      canAdd: true,
      canEdit: true,
      canDelete: true,
      canEditPrice: ["admin", "super_admin", "manager"].includes(r),
    };
  return {
    canView: false,
    canAdd: false,
    canEdit: false,
    canDelete: false,
    canEditPrice: false,
  };
};

/* ─── Small helpers ─────────────────────────────────────────────────────────── */
const EditIcon = () => (
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
);

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

/* ─── Expiry helper ──────────────────────────────────────────────────────────── */
const expiryInfo = (expiry) => {
  if (!expiry) return null;
  const days = Math.ceil(
    (new Date(expiry) - new Date()) / (1000 * 60 * 60 * 24),
  );
  return {
    days,
    expired: days < 0,
    soon: days >= 0 && days <= 30,
    critical: days >= 0 && days <= 7,
  };
};

/* ─── View Modal ─────────────────────────────────────────────────────────────── */
const ViewModal = ({ item, onClose, onEdit, onDelete }) => {
  if (!item) return null;
  const cat = item.category || "Other";
  const catStyle = CAT_COLOR[cat] || CAT_COLOR.Other;
  const icon = CAT_ICON[cat] || "📦";
  const isLow = item.qty <= (item.threshold ?? 10);
  const exp = expiryInfo(item.expiry);

  const isService = NO_STOCK_CATEGORIES.includes(item.category);
  const fields = [
    { label: "Category", value: item.category || "—" },
    ...(isService
      ? []
      : [
          {
            label: "Quantity",
            value: `${item.qty} ${item.unit || "pcs"}`,
            highlight: isLow ? "#dc2626" : undefined,
          },
          {
            label: "Low Threshold",
            value: `${item.threshold ?? 10} ${item.unit || "pcs"}`,
          },
        ]),
    { label: "Unit Price", value: `₱${Number(item.price || 0).toFixed(2)}` },
    { label: "Supplier", value: item.supplier || "—" },
    {
      label: "Expiry Date",
      value: item.expiry || "No expiry",
      helper: exp
        ? exp.expired
          ? `Expired on ${item.expiry} — remove from active stock.`
          : exp.critical
            ? `Expires in ${exp.days} day${exp.days === 1 ? "" : "s"} — reorder immediately.`
            : exp.soon
              ? `Expires in ${exp.days} days — plan to reorder soon.`
              : null
        : null,
      helperColor: exp
        ? exp.expired || exp.critical
          ? "#dc2626"
          : "#d97706"
        : undefined,
    },
  ];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0,0,0,0.50)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 10,
        overflowY: "auto",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          background: "var(--card)",
          borderRadius: 14,
          boxShadow: "0 24px 64px rgba(0,0,0,0.28)",
          width: "100%",
          maxWidth: 560,
          maxHeight: "calc(100vh - 20px)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          margin: "auto",
          boxSizing: "border-box",
        }}
      >
        {/* Modal header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "18px 24px",
            borderBottom: "1px solid var(--border)",
            background: "var(--bg)",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: `linear-gradient(135deg, ${catStyle.bg}, #fff)`,
                border: `1.5px solid ${catStyle.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                color: catStyle.text,
              }}
            >
              {React.cloneElement(icon, { width: 20, height: 20 })}
            </div>
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: 17,
                  fontWeight: 700,
                  color: "var(--text)",
                }}
              >
                {item.name}
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: 12,
                  color: "#64748b",
                  marginTop: 2,
                }}
              >
                {item.category} · {item.unit}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: 20,
              cursor: "pointer",
              color: "#94a3b8",
              lineHeight: 1,
              padding: "2px 6px",
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
          {/* Hero banner */}
          <div className="inv-item-hero" style={{ padding: "16px" }}>
            <div style={{ position: "relative", zIndex: 1 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  marginBottom: 14,
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    flexShrink: 0,
                    background: "rgba(255,255,255,0.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "2px solid rgba(255,255,255,0.2)",
                    color: "rgba(255,255,255,0.9)",
                    overflow: "hidden",
                  }}
                >
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt=""
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    React.cloneElement(icon, { width: 22, height: 22 })
                  )}
                </div>
                <div style={{ flex: "1 1 140px", minWidth: 0 }}>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: 18,
                      fontWeight: 800,
                      color: "#fff",
                      lineHeight: 1.25,
                      wordBreak: "break-word",
                    }}
                  >
                    {item.name}
                  </h2>
                  <p
                    style={{
                      margin: "4px 0 0",
                      fontSize: 12,
                      color: "rgba(255,255,255,0.65)",
                      wordBreak: "break-word",
                    }}
                  >
                    {item.category} · {item.unit}
                    {item.supplier ? ` · ${item.supplier}` : ""}
                  </p>
                </div>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 6,
                    width: "100%",
                  }}
                >
                  <span
                    style={{
                      background: isLow
                        ? "rgba(220,38,38,0.2)"
                        : "rgba(22,163,74,0.2)",
                      border: `1.5px solid ${isLow ? "rgba(220,38,38,0.4)" : "rgba(22,163,74,0.4)"}`,
                      color: isLow ? "#fca5a5" : "#bbf7d0",
                      borderRadius: 20,
                      padding: "3px 12px",
                      fontSize: 12,
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {isLow ? "Low Stock" : "In Stock"}
                  </span>
                  <span
                    style={{
                      background: "rgba(255,255,255,0.1)",
                      border: "1px solid rgba(255,255,255,0.2)",
                      color: "rgba(255,255,255,0.85)",
                      borderRadius: 20,
                      padding: "3px 12px",
                      fontSize: 12,
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {cat}
                  </span>
                </div>
              </div>

              {/* Quick stats row */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[
                  {
                    icon: (
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      >
                        <rect x="2" y="7" width="20" height="14" rx="2" />
                        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
                      </svg>
                    ),
                    label: `${item.qty} ${item.unit || "pcs"} in stock`,
                  },
                  {
                    icon: (
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      >
                        <line x1="12" y1="1" x2="12" y2="23" />
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                      </svg>
                    ),
                    label: `₱${Number(item.price || 0).toFixed(2)} per unit`,
                  },
                  ...(item.expiry
                    ? [
                        {
                          icon: (
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                            >
                              <rect x="3" y="4" width="18" height="18" rx="2" />
                              <line x1="16" y1="2" x2="16" y2="6" />
                              <line x1="8" y1="2" x2="8" y2="6" />
                              <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                          ),
                          label: `Expires ${item.expiry}`,
                        },
                      ]
                    : []),
                ].map(({ icon: ic, label }) => (
                  <span
                    key={label}
                    style={{
                      background: "rgba(255,255,255,0.1)",
                      border: "1px solid rgba(255,255,255,0.15)",
                      borderRadius: 8,
                      padding: "5px 10px",
                      fontSize: 12,
                      color: "rgba(255,255,255,0.8)",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <span>{ic}</span> {label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Fields grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
              gap: 10,
            }}
          >
            {fields.map(({ label, value, helper, helperColor }) => (
              <div key={label} className="inv-field-card">
                <span className="inv-field-label">{label}</span>
                <span className="inv-field-value">{value}</span>
                {helper && (
                  <p
                    style={{
                      margin: "4px 0 0",
                      fontSize: 11,
                      color: helperColor,
                      fontWeight: 600,
                    }}
                  >
                    {helper}
                  </p>
                )}
              </div>
            ))}

            {/* Stock bar — full width (hidden for services) */}
            {!isService && (
              <div style={{ gridColumn: "1 / -1" }}>
                <div
                  style={{
                    background: isLow ? "#fff5f5" : "#f0fdf4",
                    border: `1.5px solid ${isLow ? "#fca5a5" : "#86efac"}`,
                    borderRadius: 10,
                    padding: "14px 16px",
                  }}
                >
                  <p
                    style={{
                      margin: "0 0 8px",
                      fontSize: 10,
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: 1,
                      color: isLow ? "#dc2626" : "#16a34a",
                      display: "flex",
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
                      <line x1="18" y1="20" x2="18" y2="10" />
                      <line x1="12" y1="20" x2="12" y2="4" />
                      <line x1="6" y1="20" x2="6" y2="14" />
                    </svg>
                    Stock Level
                  </p>
                  <div
                    style={{
                      background: isLow ? "#fee2e2" : "#dcfce7",
                      borderRadius: 99,
                      height: 8,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        borderRadius: 99,
                        background: isLow
                          ? "linear-gradient(90deg,#ef4444,#dc2626)"
                          : "linear-gradient(90deg,#22c55e,#16a34a)",
                        width: `${Math.min(100, (item.qty / Math.max(item.threshold ?? 10, 1)) * 50)}%`,
                        transition: "width 0.6s ease",
                      }}
                    />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginTop: 5,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        color: isLow ? "#dc2626" : "#16a34a",
                        fontWeight: 700,
                      }}
                    >
                      {item.qty} / {(item.threshold ?? 10) * 2} units
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: isLow ? "#dc2626" : "#16a34a",
                        fontWeight: 700,
                      }}
                    >
                      Threshold: {item.threshold ?? 10}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Price history */}
        {Array.isArray(item.price_history) && item.price_history.length > 0 && (
          <div style={{ padding: "0 24px 16px" }}>
            <p
              style={{
                margin: "0 0 8px",
                fontSize: 10,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: 1,
                color: "#94a3b8",
              }}
            >
              Price History
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {item.price_history.map((h) => (
                <div
                  key={h.id}
                  style={{
                    fontSize: 12,
                    color: "var(--text)",
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    padding: "8px 10px",
                  }}
                >
                  <strong>
                    ₱{Number(h.old_price ?? 0).toFixed(2)} → ₱
                    {Number(h.new_price).toFixed(2)}
                  </strong>
                  {" — "}
                  {h.changed_by_name || "Unknown"} on{" "}
                  {new Date(h.changed_at).toLocaleDateString()}
                  <br />
                  <span style={{ color: "#94a3b8" }}>
                    Effective {h.effective_start}
                    {h.effective_end ? ` – ${h.effective_end}` : " – ongoing"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            padding: "12px 16px",
            borderTop: "1px solid var(--border)",
            background: "var(--bg)",
            flexShrink: 0,
            flexWrap: "wrap",
          }}
        >
          <button
            className="btn btn-ghost"
            style={{ width: "auto", flex: "1 1 auto", minWidth: 70 }}
            onClick={onClose}
          >
            Close
          </button>
          <button
            className="btn btn-ghost"
            style={{
              width: "auto",
              flex: "1 1 auto",
              minwidth: 70,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
            }}
            onClick={() => onEdit(item)}
          >
            <EditIcon /> Edit
          </button>
          <button
            className="btn btn-danger"
            style={{ width: "auto", flex: "1 1 auto", minWidth: 70 }}
            onClick={() => onDelete(item.id)}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Add / Edit Modal (patient-record style) ────────────────────────────────── */
const ItemFormModal = ({ item, onClose, onSave, saving, canEditPrice }) => {
  const isEdit = !!item?.id;
  const [form, setForm] = useState(
    item?.id
      ? {
          ...item,
          price_effective_start:
            item.price_effective_start ||
            new Date().toISOString().split("T")[0],
          price_effective_end: item.price_effective_end || "",
        }
      : {
          name: "",
          category: "Medicine",
          qty: 0,
          unit: "pcs",
          threshold: 10,
          price: 0,
          price_effective_start: new Date().toISOString().split("T")[0],
          price_effective_end: "",
          expiry: "",
          supplier: "",
          description: "",
        },
  );
  const initialFormRef = useRef(JSON.stringify(form));
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [otherSupplier, setOtherSupplier] = useState(
    () => !!form.supplier && !SUPPLIER_OPTIONS.includes(form.supplier),
  );
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef(null);

  const uploadItemImage = async (file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Please choose an image under 5MB.");
      return;
    }
    setUploadingImage(true);
    const ext = file.name.split(".").pop();
    const path = `inventory/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("attachments")
      .upload(path, file);
    if (upErr) {
      setUploadingImage(false);
      alert("Upload failed: " + upErr.message);
      return;
    }
    const { data: pub } = supabase.storage
      .from("attachments")
      .getPublicUrl(path);
    set("image_url", pub?.publicUrl || "");
    setUploadingImage(false);
  };
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const catStyle = CAT_COLOR[form.category] || CAT_COLOR.Other;
  const icon = CAT_ICON[form.category] || "📦";
  const isDirty = () => JSON.stringify(form) !== initialFormRef.current;
  const attemptClose = () => {
    if (isDirty()) setShowDiscardConfirm(true);
    else onClose();
  };

  const isFormValid = () => validateInventoryItem(form).valid;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 10,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          background: "var(--card)",
          borderRadius: 14,
          width: "100%",
          maxWidth: 600,
          maxHeight: "calc(100vh - 20px)",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
          boxSizing: "border-box",
        }}
      >
        {/* Clipboard bar */}
        <div className="inv-clipboard-bar" style={{ flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}></div>
          <button
            onClick={attemptClose}
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
        {/* Medical record header */}
        <div
          style={{
            background: "var(--bg,#f8fafc)",
            borderBottom: "2px solid var(--border,#e2e8f0)",
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
                background: catStyle.bg,
                border: `1px solid ${catStyle.border}`,
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
                stroke={catStyle.text}
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              </svg>
            </div>
            <h3
              style={{
                margin: 0,
                fontSize: 15,
                fontWeight: 800,
                color: "var(--text,#1e293b)",
                letterSpacing: "0.3px",
              }}
            >
              {isEdit ? "Edit Inventory Item" : "New Inventory Item"}
            </h3>
          </div>
          <p
            style={{
              margin: 0,
              fontSize: 11,
              color: "#64748b",
              letterSpacing: "0.5px",
            }}
          >
            {isEdit
              ? `Updating: ${item.name}`
              : "Fill in the item details below"}
          </p>
        </div>

        {/* Form body — section-divided like patient record */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {/* ── Section: Item Identity ── */}
          <div style={{ borderBottom: "1.5px solid #e2e8f0" }}>
            <div className="inv-section-label">Item Information</div>

            {/* Row: Item Photo */}
            <div
              style={{
                padding: "14px 16px",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              <div
                onClick={() => imageInputRef.current?.click()}
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 12,
                  border: `1.5px dashed ${catStyle.border}`,
                  background: form.image_url ? "transparent" : catStyle.bg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  flexShrink: 0,
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                {uploadingImage ? (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={catStyle.text}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    style={{ animation: "spin 0.8s linear infinite" }}
                  >
                    <circle cx="12" cy="12" r="9" strokeOpacity="0.3" />
                    <path d="M21 12a9 9 0 0 0-9-9" />
                  </svg>
                ) : form.image_url ? (
                  <img
                    src={form.image_url}
                    alt=""
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={catStyle.text}
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="9" cy="9" r="2" />
                    <path d="m21 15-5-5L5 21" />
                  </svg>
                )}
              </div>
              <div style={{ flex: 1 }}>
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
                  Item Photo{" "}
                  <span style={{ fontWeight: 400, textTransform: "none" }}>
                    (optional)
                  </span>
                </div>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadItemImage(f);
                    e.target.value = "";
                  }}
                />
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={uploadingImage}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 8,
                      border: `1.5px solid ${catStyle.border}`,
                      background: catStyle.bg,
                      color: catStyle.text,
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: uploadingImage ? "default" : "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    {uploadingImage
                      ? "Uploading..."
                      : form.image_url
                        ? "Change Photo"
                        : "Upload Photo"}
                  </button>
                  {form.image_url && (
                    <button
                      type="button"
                      onClick={() => set("image_url", "")}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 8,
                        border: "1.5px solid #fca5a5",
                        background: "#fef2f2",
                        color: "#dc2626",
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Row 1: Name · Category */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr",
                borderBottom: "1px solid #e2e8f0",
              }}
            >
              <div
                style={{
                  padding: "10px 16px",
                  borderRight: "none",
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
                  Item Name <span style={{ color: "#ef4444" }}>*</span>
                </div>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="e.g. Amoxicillin 250mg"
                  style={{
                    width: "100%",
                    border: "none",
                    borderBottom: "1.5px solid #cbd5e1",
                    background: "transparent",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--text,#1e293b)",
                    outline: "none",
                    padding: "2px 0",
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                  }}
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
                  Category
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(64px, 1fr))",
                    gap: 6,
                    marginTop: 4,
                  }}
                >
                  {FORM_CATEGORIES.map((c) => {
                    const cs = CAT_COLOR[c] || CAT_COLOR.Other;
                    const active = form.category === c;
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => set("category", c)}
                        style={{
                          padding: "7px 4px",
                          border: `2px solid ${active ? cs.border : "#e2e8f0"}`,
                          borderRadius: 9,
                          background: active ? cs.bg : "var(--card)",
                          cursor: "pointer",
                          fontFamily: "inherit",
                          textAlign: "center",
                          transition: "all 0.15s",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "center",
                            marginBottom: 3,
                            color: active ? cs.text : "#94a3b8",
                          }}
                        >
                          {React.cloneElement(CAT_ICON[c] || CAT_ICON.Other, {
                            width: 16,
                            height: 16,
                          })}
                        </div>
                        <div
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            color: active ? cs.text : "#94a3b8",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                            lineHeight: 1.2,
                          }}
                        >
                          {c}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Row: Description */}
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
                Description
              </div>
              <textarea
                value={form.description || ""}
                onChange={(e) => set("description", e.target.value)}
                placeholder="What is this item for? e.g. Antibiotic for bacterial infections..."
                style={{
                  width: "100%",
                  border: "1px solid var(--border,#e2e8f0)",
                  borderRadius: 8,
                  background: "transparent",
                  fontSize: 13,
                  color: "var(--text,#1e293b)",
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

            {/* Row 2: Qty · Unit · Threshold — hidden entirely for services */}
            {NO_STOCK_CATEGORIES.includes(form.category) ? (
              <div
                style={{
                  padding: "10px 16px",
                  borderBottom: "1px solid #e2e8f0",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  background: "#eef2ff",
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#4338ca"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4M12 8h.01" />
                </svg>
                <p
                  style={{
                    margin: 0,
                    fontSize: 12,
                    color: "#4338ca",
                    fontWeight: 600,
                  }}
                >
                  Services don't track stock — quantity and low-stock threshold
                  are not needed.
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))",
                  borderBottom: "1px solid #e2e8f0",
                }}
              >
                <div
                  style={{
                    padding: "10px 16px",
                    borderRight: "1px solid #e2e8f0",
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
                    Quantity
                  </div>
                  <input
                    type="number"
                    value={form.qty}
                    min={0}
                    onChange={(e) => set("qty", e.target.value)}
                    style={{
                      width: "100%",
                      border: "none",
                      borderBottom: "1.5px solid #cbd5e1",
                      background: "transparent",
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--text,#1e293b)",
                      outline: "none",
                      padding: "2px 0",
                      fontFamily: "inherit",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div
                  style={{
                    padding: "10px 16px",
                    borderRight: "1px solid #e2e8f0",
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
                    Unit
                  </div>
                  <CustomSelect
                    value={form.unit}
                    onChange={(val) => set("unit", val)}
                    placeholder="— Select Unit —"
                    options={UNITS}
                  />
                </div>
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
                    Low Threshold
                  </div>
                  <input
                    type="number"
                    value={form.threshold}
                    min={0}
                    onChange={(e) => set("threshold", e.target.value)}
                    style={{
                      width: "100%",
                      border: "none",
                      borderBottom: "1.5px solid #cbd5e1",
                      background: "transparent",
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--text,#1e293b)",
                      outline: "none",
                      padding: "2px 0",
                      fontFamily: "inherit",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* ── Section: Pricing & Supply ── */}
          <div style={{ borderBottom: "1.5px solid #e2e8f0" }}>
            <div className="inv-section-label">Pricing &amp; Supply</div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                borderBottom: "1px solid #e2e8f0",
              }}
            >
              <div
                style={{
                  padding: "10px 16px",
                  borderRight: "1px solid #e2e8f0",
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
                  Unit Price (₱)
                </div>
                <input
                  type="number"
                  value={form.price}
                  min={0}
                  step="0.01"
                  disabled={!canEditPrice}
                  onChange={(e) => set("price", e.target.value)}
                  style={{
                    width: "100%",
                    border: "none",
                    borderBottom: "1.5px solid #cbd5e1",
                    background: "transparent",
                    fontSize: 13,
                    fontWeight: 600,
                    color: canEditPrice ? "var(--text,#1e293b)" : "#94a3b8",
                    outline: "none",
                    padding: "2px 0",
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                    cursor: canEditPrice ? "text" : "not-allowed",
                  }}
                />
                {!canEditPrice && (
                  <p
                    style={{
                      fontSize: 11,
                      color: "#94a3b8",
                      margin: "4px 0 0",
                    }}
                  >
                    Only Managers, Admins, and Super Admins can change price.
                  </p>
                )}
              </div>
              {canEditPrice && (
                <div
                  style={{
                    padding: "10px 16px",
                    borderRight: "1px solid #e2e8f0",
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
                    Price Effective From{" "}
                    <span style={{ color: "#ef4444" }}>*</span>
                  </div>
                  <DatePicker
                    value={form.price_effective_start}
                    onChange={(val) => set("price_effective_start", val)}
                    placeholder="Select start date"
                  />
                </div>
              )}
              {canEditPrice && (
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
                    Price Effective Until{" "}
                    <span style={{ fontWeight: 400, textTransform: "none" }}>
                      (optional)
                    </span>
                  </div>
                  <DatePicker
                    value={form.price_effective_end}
                    onChange={(val) => set("price_effective_end", val)}
                    placeholder="No end date"
                    min={form.price_effective_start}
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
                  Supplier
                </div>
                <CustomSelect
                  value={
                    otherSupplier
                      ? "Other"
                      : SUPPLIER_OPTIONS.includes(form.supplier)
                        ? form.supplier
                        : ""
                  }
                  onChange={(val) => {
                    if (val === "Other") {
                      setOtherSupplier(true);
                      set("supplier", "");
                    } else {
                      setOtherSupplier(false);
                      set("supplier", val);
                    }
                  }}
                  placeholder="— Select Supplier —"
                  options={SUPPLIER_OPTIONS}
                />
                {otherSupplier && (
                  <input
                    type="text"
                    value={form.supplier}
                    onChange={(e) => set("supplier", e.target.value)}
                    placeholder="Enter supplier name"
                    autoFocus
                    style={{
                      width: "100%",
                      border: "none",
                      borderBottom: "1.5px solid #cbd5e1",
                      background: "transparent",
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--text,#1e293b)",
                      outline: "none",
                      padding: "6px 0 2px",
                      fontFamily: "inherit",
                      boxSizing: "border-box",
                    }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* ── Section: Expiry ── */}
          <div style={{ borderBottom: "1.5px solid #e2e8f0" }}>
            <div className="inv-section-label">Expiry / Validity</div>
            <div
              style={{
                padding: "12px 16px",
                display: "flex",
                alignItems: "center",
                gap: 14,
                flexWrap: "wrap",
              }}
            >
              <div style={{ flex: 1 }}>
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
                  Expiry Date{" "}
                  {EXPIRY_REQUIRED_CATEGORIES.includes(form.category) && (
                    <span style={{ color: "#ef4444" }}>*</span>
                  )}
                </div>
                <DatePicker
                  value={form.expiry}
                  onChange={(val) => set("expiry", val)}
                  placeholder="Select expiry date"
                />
                {EXPIRY_REQUIRED_CATEGORIES.includes(form.category) &&
                  !form.expiry && (
                    <p
                      style={{
                        fontSize: 11,
                        color: "#dc2626",
                        margin: "6px 0 0",
                      }}
                    >
                      Expiry date is required for {form.category} items.
                    </p>
                  )}
              </div>
              {form.expiry &&
                (() => {
                  const e = expiryInfo(form.expiry);
                  if (!e) return null;
                  const msg = e.expired
                    ? `This item expired on ${form.expiry} and should be pulled from stock.`
                    : e.critical
                      ? `Expires in ${e.days} day${e.days === 1 ? "" : "s"} — reorder immediately.`
                      : e.soon
                        ? `Expires in ${e.days} days — plan to reorder soon.`
                        : `${e.days} days remaining before expiry.`;
                  const color =
                    e.expired || e.critical
                      ? "#dc2626"
                      : e.soon
                        ? "#d97706"
                        : "#16a34a";
                  return (
                    <p
                      style={{
                        margin: "6px 0 0",
                        fontSize: 12,
                        color,
                        fontWeight: 600,
                        width: "100%",
                      }}
                    >
                      {msg}
                    </p>
                  );
                })()}
            </div>
          </div>

          {/* Footer note */}
          <div
            style={{
              padding: "8px 16px",
              background: "var(--bg,#f8fafc)",
              borderTop: "1px solid var(--border,#e2e8f0)",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 10,
                color: "#94a3b8",
                textAlign: "right",
                fontStyle: "italic",
              }}
            >
              Inventory Management System
            </p>
          </div>
        </div>

        {/* Modal footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            padding: "14px 24px",
            borderTop: "2px solid var(--border)",
            background: "var(--bg)",
            flexShrink: 0,
          }}
        >
          <button
            className="btn btn-ghost"
            style={{ width: "auto" }}
            onClick={attemptClose}
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
            onClick={() => onSave(form)}
            disabled={saving || !isFormValid()}
          >
            {saving ? "Saving..." : isEdit ? "Save Changes" : "Add Item"}
          </button>
        </div>

        {showDiscardConfirm && (
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
                maxWidth: 400,
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
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                  Discard Changes?
                </h3>
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
                  {isEdit
                    ? "You have unsaved changes to this item's record."
                    : "You have unsaved changes to this new item."}{" "}
                  Do you want to discard them?
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
                  onClick={() => setShowDiscardConfirm(false)}
                >
                  Keep Editing
                </button>
                <button
                  className="btn"
                  style={{
                    width: "auto",
                    background: "#dc2626",
                    color: "#fff",
                    border: "none",
                  }}
                  onClick={onClose}
                >
                  Discard
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── Shared inventory item validation (used by both the form's disabled-state check and the actual save) ─── */
const validateInventoryItem = (form) => {
  if (!form.name?.toString().trim())
    return { valid: false, message: "Item name is required" };
  if (EXPIRY_REQUIRED_CATEGORIES.includes(form.category) && !form.expiry)
    return {
      valid: false,
      message: `Expiry date is required for ${form.category} items.`,
    };
  const isServiceCat = NO_STOCK_CATEGORIES.includes(form.category);
  if (
    !isServiceCat &&
    (form.qty === "" ||
      form.qty == null ||
      isNaN(Number(form.qty)) ||
      Number(form.qty) < 0)
  )
    return {
      valid: false,
      message: "Quantity must be a valid number, 0 or greater",
    };
  if (
    form.price === "" ||
    form.price == null ||
    isNaN(Number(form.price)) ||
    Number(form.price) < 0
  )
    return {
      valid: false,
      message: "Price must be a valid number, 0 or greater",
    };
  if (
    !isServiceCat &&
    (form.threshold === "" ||
      form.threshold == null ||
      isNaN(Number(form.threshold)) ||
      Number(form.threshold) < 0)
  )
    return {
      valid: false,
      message: "Threshold must be a valid number, 0 or greater",
    };
  if (form.expiry && form.expiry < new Date().toISOString().split("T")[0])
    return { valid: false, message: "Expiry date cannot be in the past" };
  if (!form.price_effective_start)
    return { valid: false, message: "Price effective start date is required" };
  if (
    form.price_effective_end &&
    form.price_effective_end < form.price_effective_start
  )
    return {
      valid: false,
      message: "Price end date cannot be before the start date",
    };
  return { valid: true, message: "" };
};

/* ─── Main Component ─────────────────────────────────────────────────────────── */
const Inventory = () => {
  const { user, loading: userLoading } = useCurrentUser();
  const { applyFilter, seeAllBranches, branchId } = useBranchFilter();

  const perms = useMemo(() => getPermissions(user?.role), [user]);
  const isAdminRole = ["admin", "super_admin"].includes(
    (user?.role || "").toLowerCase(),
  );
  const isSuperAdminRole = (user?.role || "").toLowerCase() === "super_admin";
  const [adminView, setAdminView] = useState("table"); // "table" | "board" — board is admin-only

  const [items, setItems] = useState([]);
  const [itemsLite, setItemsLite] = useState([]); // lightweight full dataset for stat cards
  const [totalItemCount, setTotalItemCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 350);
  const [catFilter, setCatFilter] = useState("");
  const [stockFilter, setStockFilter] = useState("");
  const [expiryFilter, setExpiryFilter] = useState(false);

  // Modals
  const [viewItem, setViewItem] = useState(null); // view modal
  const [editItem, setEditItem] = useState(null); // add/edit modal (null = closed, {} = new, item = edit)
  const [deleteId, setDeleteId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletedItems, setDeletedItems] = useState([]);
  const [showDeletedModal, setShowDeletedModal] = useState(false);

  const [toasts, setToasts] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ROWS_PER_PAGE = 10;
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const handleSort = (key) => {
    setSortConfig((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" },
    );
  };

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

  const applyFilterRef = useRef(applyFilter);
  useEffect(() => {
    applyFilterRef.current = applyFilter;
  }, [applyFilter]);

  const expiryFilterRef = useRef(expiryFilter);
  useEffect(() => {
    expiryFilterRef.current = expiryFilter;
  }, [expiryFilter]);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("inventory")
      .select("*", { count: "exact" })
      .is("deleted_at", null);
    if (catFilter) q = q.eq("category", catFilter);
    if (stockFilter === "low") q = q.eq("is_low_stock", true);
    else if (stockFilter === "ok") q = q.eq("is_low_stock", false);
    if (expiryFilterRef.current) {
      const in30 = new Date();
      in30.setDate(in30.getDate() + 30);
      q = q
        .not("expiry", "is", null)
        .gte("expiry", new Date().toISOString().split("T")[0])
        .lte("expiry", in30.toISOString().split("T")[0]);
    }
    if (debouncedSearch.trim()) {
      const s = debouncedSearch.trim();
      q = q.or(`name.ilike.%${s}%,supplier.ilike.%${s}%,category.ilike.%${s}%`);
    }
    const sortColumn = sortConfig.key || "name";
    q = q.order(sortColumn, { ascending: sortConfig.direction !== "desc" });
    const from = (currentPage - 1) * ROWS_PER_PAGE;
    const to = from + ROWS_PER_PAGE - 1;
    q = q.range(from, to);
    const { data, error, count } = await applyFilterRef.current(q);
    if (!error) {
      setItems(data || []);
      setTotalItemCount(count || 0);
    }
    setLoading(false);
  }, [
    catFilter,
    stockFilter,
    debouncedSearch,
    sortConfig,
    currentPage,
    ROWS_PER_PAGE,
  ]);

  // Lightweight fetch (few columns, no pagination) that powers the stat cards,
  // low-stock banner, category board, and category/supplier aggregates —
  // these need visibility into the whole branch's inventory, not one page.
  const fetchItemsLite = useCallback(async () => {
    const { data, error } = await applyFilterRef.current(
      supabase
        .from("inventory")
        .select(
          "id, name, category, qty, threshold, price, expiry, supplier, is_low_stock, unit, image_url",
        )
        .is("deleted_at", null),
    );
    if (!error) setItemsLite(data || []);
  }, []);

  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

  const fetchDeletedItems = useCallback(async () => {
    const { data, error } = await applyFilterRef.current(
      supabase
        .from("inventory")
        .select("*")
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false }),
    );
    if (error) return;
    const now = Date.now();
    const expired = (data || []).filter(
      (i) => now - new Date(i.deleted_at).getTime() > THIRTY_DAYS_MS,
    );
    if (expired.length > 0)
      await supabase
        .from("inventory")
        .delete()
        .in(
          "id",
          expired.map((i) => i.id),
        );
    setDeletedItems(
      (data || []).filter(
        (i) => now - new Date(i.deleted_at).getTime() <= THIRTY_DAYS_MS,
      ),
    );
  }, []);

  useEffect(() => {
    if (userLoading) return;
    if (!perms.canView) {
      setLoading(false);
      return;
    }
    fetchItems();
    fetchItemsLite();
    fetchDeletedItems();
    if (user) logActivity(user, "Viewed inventory", "Opened inventory list");
  }, [
    userLoading,
    perms.canView,
    fetchItems,
    fetchItemsLite,
    fetchDeletedItems,
    expiryFilter,
  ]);

  useEffect(() => {
    if (userLoading || !perms.canView) return;
    const ch = supabase
      .channel("inventory-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "inventory" },
        () => {
          fetchItems();
          fetchItemsLite();
          fetchDeletedItems();
        },
      )
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [
    userLoading,
    perms.canView,
    fetchItems,
    fetchItemsLite,
    fetchDeletedItems,
  ]);

  const lowStock = useMemo(
    () => itemsLite.filter((i) => i.is_low_stock),
    [itemsLite],
  );
  const expiringSoon = useMemo(
    () =>
      itemsLite.filter((i) => {
        if (!i.expiry) return false;
        const days = (new Date(i.expiry) - new Date()) / (1000 * 60 * 60 * 24);
        return days <= 30 && days >= 0;
      }),
    [itemsLite],
  );

  // Items are already filtered, sorted, and paginated server-side in fetchItems().
  const filtered = items;
  const totalPages = Math.max(1, Math.ceil(totalItemCount / ROWS_PER_PAGE));
  const safePage = currentPage;
  const paginated = items;

  const openAdd = () =>
    perms.canAdd &&
    setEditItem({
      name: "",
      category: "Medicine",
      qty: 0,
      unit: "pcs",
      threshold: 10,
      price: 0,
      expiry: "",
      supplier: "",
    });
  const openEdit = (item, e) => {
    e?.stopPropagation();
    perms.canEdit && setEditItem(item);
  };
  const openView = async (item) => {
    setViewItem(item);
    const { data, error } = await supabase
      .from("inventory_price_history")
      .select("*")
      .eq("item_id", item.id)
      .order("changed_at", { ascending: false })
      .limit(20);
    if (!error)
      setViewItem((prev) =>
        prev?.id === item.id ? { ...prev, price_history: data || [] } : prev,
      );
  };

  const commitSave = async (form) => {
    setSaving(true);
    const isService = NO_STOCK_CATEGORIES.includes(form.category);
    const oldPrice = form.id
      ? Number(
          items.find((i) => i.id === form.id)?.price ??
            itemsLite.find((i) => i.id === form.id)?.price ??
            form.price,
        )
      : null;
    const newPrice = Number(form.price);
    const priceChanged = form.id ? oldPrice !== newPrice : true;
    const base = {
      name: form.name,
      category: form.category,
      qty: isService ? 999999 : Number(form.qty),
      unit: isService ? "service" : form.unit,
      threshold: isService ? 0 : Number(form.threshold),
      price: newPrice,
      price_effective_start: form.price_effective_start || null,
      price_effective_end: form.price_effective_end || null,
      expiry: form.expiry || null,
      supplier: form.supplier,
      description: form.description || null,
      image_url: form.image_url || null,
    };
    let itemId = form.id;
    if (form.id) {
      const { error } = await supabase
        .from("inventory")
        .update(base)
        .eq("id", form.id);
      if (error) {
        alert("Error: " + error.message);
        setSaving(false);
        return;
      }
      logActivity(user, "Updated inventory item", `Edited: ${form.name}`);
      showToast(`✓ ${form.name} updated`);
    } else {
      const payload = withBranchId(user, base);
      const { data: inserted, error } = await supabase
        .from("inventory")
        .insert([payload])
        .select()
        .single();
      if (error) {
        alert("Error: " + error.message);
        setSaving(false);
        return;
      }
      itemId = inserted?.id;
      logActivity(user, "Added inventory item", `Added: ${form.name}`);
      showToast(`✓ ${form.name} added to inventory`);
    }

    if (priceChanged && itemId) {
      const { error: histErr } = await supabase
        .from("inventory_price_history")
        .insert([
          {
            item_id: itemId,
            old_price: oldPrice,
            new_price: newPrice,
            effective_start:
              form.price_effective_start ||
              new Date().toISOString().split("T")[0],
            effective_end: form.price_effective_end || null,
            changed_by: user?.id || null,
            changed_by_name: user?.fullName || user?.email || "Unknown",
          },
        ]);
      if (histErr) console.error("Price history log failed:", histErr.message);
    }

    setSaving(false);
    setEditItem(null);
    if (form.id && viewItem?.id === form.id) setViewItem(null);
  };

  const handleSave = async (form) => {
    const check = validateInventoryItem(form);
    if (!check.valid) {
      alert(check.message);
      return;
    }
    if (form.id) {
      const existingPrice = Number(
        items.find((i) => i.id === form.id)?.price ??
          itemsLite.find((i) => i.id === form.id)?.price ??
          form.price,
      );
      if (Number(form.price) < existingPrice) {
        const ok = window.confirm(
          `You're lowering the price of "${form.name}" from ₱${existingPrice.toFixed(2)} to ₱${Number(form.price).toFixed(2)}. Continue?`,
        );
        if (!ok) return;
      }
    }
    await commitSave(form);
  };

  const doDelete = async (id) => {
    const item = items.find((i) => i.id === id);
    const { error } = await supabase
      .from("inventory")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      alert("Error: " + error.message);
      return;
    }
    setDeleteId(null);
    setViewItem(null);
    logActivity(
      user,
      "Deleted inventory item",
      `Moved to Recently Deleted: ${item?.name || id}`,
    );
    showToast(`${item?.name || "Item"} moved to Recently Deleted`, "info");
    fetchItems();
    fetchDeletedItems();
  };

  const toggleSelectRow = (id) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const toggleSelectAllOnPage = () => {
    const pageIds = paginated.map((i) => i.id);
    const allSelected = pageIds.every((id) => selectedIds.includes(id));
    setSelectedIds((prev) =>
      allSelected
        ? prev.filter((id) => !pageIds.includes(id))
        : [...new Set([...prev, ...pageIds])],
    );
  };

  const doBulkDelete = async () => {
    const { error } = await supabase
      .from("inventory")
      .update({ deleted_at: new Date().toISOString() })
      .in("id", selectedIds);
    if (error) {
      alert("Error: " + error.message);
      return;
    }
    logActivity(
      user,
      "Bulk deleted inventory items",
      `Moved to Recently Deleted: ${selectedIds.length} item(s)`,
    );
    showToast(
      `${selectedIds.length} item(s) moved to Recently Deleted`,
      "info",
    );
    setSelectedIds([]);
    setBulkConfirm(false);
    fetchItems();
    fetchDeletedItems();
  };

  const restoreItem = async (id, name) => {
    const { error } = await supabase
      .from("inventory")
      .update({ deleted_at: null })
      .eq("id", id);
    if (error) {
      alert("Error: " + error.message);
      return;
    }
    logActivity(user, "Restored inventory item", `Restored: ${name || id}`);
    showToast(`${name || "Item"} restored`);
    fetchItems();
    fetchDeletedItems();
  };

  const permanentlyDeleteItem = async (id, name) => {
    const { error } = await supabase.from("inventory").delete().eq("id", id);
    if (error) {
      alert("Error: " + error.message);
      return;
    }
    logActivity(
      user,
      "Permanently deleted inventory item",
      `Removed: ${name || id}`,
    );
    showToast("Item permanently deleted", "info");
    fetchDeletedItems();
  };

  if (userLoading) {
    return (
      <Layout>
        <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>
          <p style={{ fontSize: 13 }}>Loading...</p>
        </div>
      </Layout>
    );
  }
  if (!loading && !perms.canView) {
    return (
      <Layout>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "60vh",
            gap: 12,
          }}
        >
          <img
            src="/icon/inventory_2.png"
            alt=""
            style={{ width: 48, opacity: 0.3 }}
          />
          <h2 style={{ color: "var(--muted)", fontWeight: 700 }}>
            Access Restricted
          </h2>
          <p style={{ color: "var(--muted)", fontSize: 14 }}>
            You do not have permission to view Inventory.
          </p>
        </div>
      </Layout>
    );
  }

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

      {/* ── TOPBAR ── */}
      <div
        className="topbar inv-topbar"
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
          <img src="/icon/inventory_2.png" alt="" />
          <div>
            <h1>Inventory</h1>
            <p>Manage all inventory items</p>
          </div>
        </div>
        <div className="topbar-actions">
          <div style={{ width: 170 }}>
            <CustomSelect
              value={catFilter}
              onChange={setCatFilter}
              placeholder="All Categories"
              options={CATEGORIES}
            />
          </div>
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
            {deletedItems.length > 0 ? `(${deletedItems.length})` : ""}
          </button>
        </div>
      </div>
      {perms.canAdd && (
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
                Add Item
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  color: "rgba(255,255,255,0.55)",
                }}
              >
                Add inventory item
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
      )}

      <div className="content inv-page-content" style={{ paddingTop: 96 }}>
        {isAdminRole && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 18,
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#94a3b8",
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              Admin View:
            </span>
            <div
              style={{
                display: "flex",
                border: "1.5px solid #c7d2fe",
                borderRadius: 8,
                overflow: "hidden",
              }}
            >
              {[
                { key: "table", label: "Table" },
                { key: "board", label: "Category Board" },
              ].map((v) => (
                <button
                  key={v.key}
                  onClick={() => setAdminView(v.key)}
                  style={{
                    padding: "6px 16px",
                    border: "none",
                    background: adminView === v.key ? "#312e81" : "#f5f3ff",
                    color: adminView === v.key ? "#fff" : "#4338ca",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>
        )}
        {isAdminRole && (
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
                <h2
                  style={{
                    fontSize: 14,
                    fontWeight: 800,
                    color: "#fff",
                    margin: 0,
                  }}
                >
                  Admin Inventory Insights
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
                {isSuperAdminRole
                  ? "Super Admin — Full Access"
                  : "Administrator View"}
              </span>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
                gap: 12,
              }}
            >
              {[
                {
                  label: "Total Inventory Value",
                  value: `₱${itemsLite.reduce((sum, i) => sum + (Number(i.price) || 0) * (Number(i.qty) || 0), 0).toLocaleString()}`,
                },
                {
                  label: "Avg. Item Price",
                  value: itemsLite.length
                    ? `₱${(itemsLite.reduce((sum, i) => sum + (Number(i.price) || 0), 0) / itemsLite.length).toFixed(2)}`
                    : "₱0",
                },
                {
                  label: "Items Expired",
                  value: itemsLite.filter(
                    (i) => i.expiry && new Date(i.expiry) < new Date(),
                  ).length,
                },
                {
                  label: "Top Supplier",
                  value:
                    Object.entries(
                      itemsLite.reduce((acc, i) => {
                        if (i.supplier)
                          acc[i.supplier] = (acc[i.supplier] || 0) + 1;
                        return acc;
                      }, {}),
                    ).sort((a, b) => b[1] - a[1])[0]?.[0] || "—",
                },
              ].map((s) => (
                <div
                  key={s.label}
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 10,
                    padding: "12px 14px",
                  }}
                >
                  <p
                    style={{
                      margin: "0 0 4px",
                      fontSize: 10,
                      fontWeight: 700,
                      color: "rgba(255,255,255,0.55)",
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    {s.label}
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 18,
                      fontWeight: 800,
                      color: "#fff",
                    }}
                  >
                    {s.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Low stock alert */}
        {lowStock.length > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              background: "#fee2e2",
              border: "1px solid #fca5a5",
              borderRadius: 10,
              padding: "12px 16px",
              marginBottom: 20,
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#dc2626"
              strokeWidth="2"
              strokeLinecap="round"
              style={{ flexShrink: 0 }}
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <div>
              <strong style={{ color: "#dc2626", fontSize: 13 }}>
                Low Stock Alert
              </strong>
              <p style={{ fontSize: 12, color: "#dc2626", margin: 0 }}>
                {lowStock.map((i) => i.name).join(", ")}
              </p>
            </div>
          </div>
        )}

        {/* Stat cards */}
        <div
          className="inv-stats-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(195px,1fr))",
            gap: 14,
            marginBottom: 24,
          }}
        >
          {loading
            ? [1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  style={{
                    background: "#fff",
                    border: "1.5px solid var(--border)",
                    borderRadius: 16,
                    padding: 20,
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                  }}
                >
                  <div
                    className="skel"
                    style={{ width: 46, height: 46, borderRadius: 12 }}
                  />
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 6 }}
                  >
                    <Skel w="45%" h={11} />
                    <Skel w="30%" h={26} />
                    <Skel w="60%" h={10} />
                  </div>
                </div>
              ))
            : [
                {
                  label: "Total Items",
                  value: itemsLite.length,
                  icon: "/icon/inventory.png",
                  color: "blue",
                  sub: "All inventory items",
                  active: !catFilter && !stockFilter && !expiryFilter,
                  onClick: () => {
                    setCatFilter("");
                    setStockFilter("");
                    setExpiryFilter(false);
                  },
                },
                {
                  label: "Low Stock",
                  value: lowStock.length,
                  icon: "/icon/warning.png",
                  color: "red",
                  sub: lowStock.length > 0 ? "Reorder needed" : "All stocked",
                  active: stockFilter === "low",
                  onClick: () => {
                    setStockFilter((f) => (f === "low" ? "" : "low"));
                    setExpiryFilter(false);
                  },
                },
                {
                  label: "Expiring Soon",
                  value: expiringSoon.length,
                  icon: "/icon/appointment.png",
                  color: "yellow",
                  sub:
                    expiringSoon.length > 0
                      ? "Within 30 days"
                      : "None expiring",
                  active: expiryFilter,
                  onClick: () => {
                    setExpiryFilter((f) => !f);
                    setStockFilter("");
                  },
                },
                {
                  label: "Categories",
                  value: [...new Set(itemsLite.map((i) => i.category))].length,
                  icon: "/icon/category.png",
                  color: "green",
                  sub: "Distinct categories",
                  active: false,
                  onClick: () => {
                    setCatFilter("");
                    setStockFilter("");
                    setExpiryFilter(false);
                  },
                },
              ].map((sc, i) => (
                <div
                  key={i}
                  className={`stat-card-v2 ${sc.color} fade-in`}
                  style={{ animationDelay: `${i * 0.1}s`, cursor: "pointer" }}
                  role="button"
                  tabIndex={0}
                  onClick={sc.onClick}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      sc.onClick();
                    }
                  }}
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
                            : sc.color === "yellow" && sc.value > 0
                              ? "#d97706"
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
                      {sc.color === "yellow" && sc.value > 0 && (
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
                      )}
                      {sc.sub}
                    </span>
                  </div>
                </div>
              ))}
        </div>

        {/* Filter bar */}
        <div
          className="fade-in inv-card"
          style={{ padding: "14px 22px", marginBottom: 16 }}
        >
          <style>{`
            .inv-search-input::placeholder { color: #94a3b8; opacity: 1; }
          `}</style>
          <div
            style={{
              display: "flex",
              gap: 10,
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
                flex: "1 1 220px",
                minWidth: 200,
                maxWidth: 320,
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
                className="inv-search-input"
                placeholder="Search items, category, supplier..."
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
            {[
              { label: "All Stock", value: "" },
              { label: "Low Stock", value: "low" },
              { label: "In Stock", value: "ok" },
            ].map((f) => (
              <button
                key={f.value}
                onClick={() => setStockFilter(f.value)}
                style={{
                  padding: "5px 14px",
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  border: "1.5px solid",
                  background:
                    stockFilter === f.value ? "var(--royal)" : "transparent",
                  color: stockFilter === f.value ? "#fff" : "var(--muted)",
                  borderColor:
                    stockFilter === f.value ? "var(--royal)" : "var(--border)",
                  transition: "all 0.15s",
                }}
              >
                {f.label}
              </button>
            ))}
            <span
              style={{ color: "var(--muted)", fontSize: 12, marginLeft: 4 }}
            >
              {filtered.length} item{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* ── ADMIN-ONLY: Category Board View ── */}
        {isAdminRole && adminView === "board" ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 16,
            }}
          >
            {CATEGORIES.map((cat) => {
              const catItems = itemsLite.filter(
                (i) => (i.category || "Other") === cat,
              );
              if (catItems.length === 0) return null;
              const cs = CAT_COLOR[cat] || CAT_COLOR.Other;
              const totalValue = catItems.reduce(
                (sum, i) => sum + (Number(i.price) || 0) * (Number(i.qty) || 0),
                0,
              );
              return (
                <div
                  key={cat}
                  style={{
                    background: "var(--card)",
                    border: `1.5px solid ${cs.border}`,
                    borderRadius: 14,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      background: cs.bg,
                      padding: "12px 16px",
                      borderBottom: `1.5px solid ${cs.border}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <span style={{ color: cs.text }}>
                        {React.cloneElement(CAT_ICON[cat] || CAT_ICON.Other, {
                          width: 16,
                          height: 16,
                        })}
                      </span>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 800,
                          color: cs.text,
                        }}
                      >
                        {cat}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: cs.text,
                        background: "rgba(255,255,255,0.6)",
                        borderRadius: 20,
                        padding: "2px 9px",
                      }}
                    >
                      {catItems.length}
                    </span>
                  </div>
                  <div
                    style={{
                      padding: "10px 14px",
                      borderBottom: `1px dashed ${cs.border}`,
                    }}
                  >
                    <span style={{ fontSize: 11, color: "var(--muted)" }}>
                      Category value:{" "}
                    </span>
                    <strong style={{ fontSize: 13, color: cs.text }}>
                      ₱{totalValue.toLocaleString()}
                    </strong>
                  </div>
                  <div style={{ maxHeight: 320, overflowY: "auto" }}>
                    {catItems.map((i) => {
                      const isLow =
                        !NO_STOCK_CATEGORIES.includes(i.category) &&
                        i.qty <= (i.threshold ?? 10);
                      return (
                        <div
                          key={i.id}
                          onClick={() => openView(i)}
                          style={{
                            padding: "10px 14px",
                            borderBottom: "1px solid var(--border)",
                            cursor: "pointer",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <div style={{ minWidth: 0 }}>
                            <p
                              style={{
                                margin: 0,
                                fontSize: 12,
                                fontWeight: 600,
                                color: "var(--text)",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {i.name}
                            </p>
                            <p
                              style={{
                                margin: 0,
                                fontSize: 11,
                                color: "var(--muted)",
                              }}
                            >
                              ₱{Number(i.price || 0).toFixed(2)}
                            </p>
                          </div>
                          {!NO_STOCK_CATEGORIES.includes(i.category) && (
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: isLow ? "#dc2626" : "#16a34a",
                                flexShrink: 0,
                              }}
                            >
                              {i.qty} {i.unit}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="inv-card">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 22px",
                borderBottom: "1px solid var(--border)",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <h2 style={{ fontSize: 15, fontWeight: 700 }}>All Items</h2>
              {selectedIds.length > 0 ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    background: "#fef2f2",
                    border: "1.5px solid #fca5a5",
                    borderRadius: 8,
                    padding: "6px 12px",
                  }}
                >
                  <span
                    style={{ fontSize: 12, fontWeight: 700, color: "#991b1b" }}
                  >
                    {selectedIds.length} selected
                  </span>
                  <button
                    onClick={() => setBulkConfirm(true)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "5px 12px",
                      borderRadius: 6,
                      border: "none",
                      background: "#dc2626",
                      color: "#fff",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "inherit",
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
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                    Delete Selected
                  </button>
                  <button
                    onClick={() => setSelectedIds([])}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#991b1b",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    Clear
                  </button>
                </div>
              ) : (
                <span style={{ color: "var(--muted)", fontSize: 13 }}>
                  {filtered.length} items
                </span>
              )}
            </div>
            <div style={{ overflowX: "auto" }}>
              {loading ? (
                <div style={{ padding: "16px 22px" }}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        gap: 12,
                        alignItems: "center",
                        padding: "13px 0",
                        borderBottom: "1px solid #f1f5f9",
                      }}
                    >
                      <Skel w="25%" h={14} />
                      <Skel w="12%" h={22} />
                      <Skel w="8%" h={14} />
                      <Skel w="8%" h={14} />
                      <Skel w="10%" h={14} />
                      <Skel w="12%" h={14} />
                      <Skel w="12%" h={14} />
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
                      {perms.canDelete && (
                        <th
                          className="inv-th"
                          style={{ width: 36, textAlign: "center" }}
                        >
                          <input
                            type="checkbox"
                            checked={
                              paginated.length > 0 &&
                              paginated.every((i) => selectedIds.includes(i.id))
                            }
                            onChange={toggleSelectAllOnPage}
                            style={{ cursor: "pointer" }}
                          />
                        </th>
                      )}
                      {[
                        { label: "Item", key: "name" },
                        { label: "Category", key: "category" },
                        { label: "Stock", key: "qty" },
                        { label: "Price", key: "price" },
                        { label: "Expiry", key: "expiry" },
                        { label: "Supplier", key: "supplier" },
                        ...(perms.canEdit || perms.canDelete
                          ? [{ label: "Actions", key: null }]
                          : []),
                      ].map(({ label, key }) => (
                        <th
                          key={label}
                          className="inv-th"
                          onClick={() => key && handleSort(key)}
                          style={{
                            cursor: key ? "pointer" : "default",
                            userSelect: "none",
                          }}
                        >
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            {label}
                            {key && (
                              <svg
                                width="10"
                                height="10"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                                strokeLinecap="round"
                                style={{
                                  opacity: sortConfig.key === key ? 1 : 0.3,
                                  transform:
                                    sortConfig.key === key &&
                                    sortConfig.direction === "desc"
                                      ? "rotate(180deg)"
                                      : "none",
                                  transition: "transform 0.15s",
                                }}
                              >
                                <polyline points="18 15 12 9 6 15" />
                              </svg>
                            )}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7 + (perms.canDelete ? 1 : 0)}
                          style={{
                            textAlign: "center",
                            padding: 40,
                            color: "var(--muted)",
                          }}
                        >
                          <div style={{ marginBottom: 8 }}>
                            <svg
                              width="36"
                              height="36"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#cbd5e1"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                            >
                              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                              <line x1="12" y1="22.08" x2="12" y2="12" />
                            </svg>
                          </div>
                          <div style={{ fontSize: 13 }}>No items found</div>
                        </td>
                      </tr>
                    ) : (
                      paginated.map((item, idx) => {
                        const isService = NO_STOCK_CATEGORIES.includes(
                          item.category,
                        );
                        const isLow =
                          !isService && item.qty <= (item.threshold ?? 10);
                        const exp = expiryInfo(item.expiry);
                        const cat = item.category || "Other";
                        const cs = CAT_COLOR[cat] || CAT_COLOR.Other;
                        return (
                          <tr
                            key={item.id}
                            className="inv-row-hover fade-in"
                            style={{
                              background: isLow ? "#fff5f5" : "var(--card)",
                              transition: "background 0.15s",
                              animationDelay: `${idx * 0.06}s`,
                            }}
                            onClick={() => openView(item)}
                          >
                            {perms.canDelete && (
                              <td
                                className="inv-td"
                                style={{ textAlign: "center" }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedIds.includes(item.id)}
                                  onChange={() => toggleSelectRow(item.id)}
                                  style={{ cursor: "pointer" }}
                                />
                              </td>
                            )}
                            {/* Item name */}
                            <td className="inv-td">
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
                                    background: cs.bg,
                                    border: `1px solid ${cs.border}`,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    overflow: "hidden",
                                  }}
                                >
                                  {item.image_url ? (
                                    <img
                                      src={item.image_url}
                                      alt=""
                                      style={{
                                        width: "100%",
                                        height: "100%",
                                        objectFit: "cover",
                                      }}
                                    />
                                  ) : (
                                    <svg
                                      width="16"
                                      height="16"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke={cs.text}
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                    >
                                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                                      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                                      <line
                                        x1="12"
                                        y1="22.08"
                                        x2="12"
                                        y2="12"
                                      />
                                    </svg>
                                  )}
                                </div>{" "}
                                <div>
                                  <div
                                    style={{
                                      fontWeight: 600,
                                      fontSize: 13,
                                      color: "var(--text)",
                                    }}
                                  >
                                    {item.name}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: 11,
                                      color: "var(--muted)",
                                      marginTop: 1,
                                    }}
                                  >
                                    {item.unit}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Category badge */}
                            <td className="inv-td">
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 5,
                                  background: cs.bg,
                                  border: `1px solid ${cs.border}`,
                                  color: cs.text,
                                  borderRadius: 20,
                                  padding: "3px 10px",
                                  fontSize: 11,
                                  fontWeight: 700,
                                }}
                              >
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
                                {item.category}
                              </span>
                            </td>

                            {/* Stock */}
                            <td className="inv-td">
                              {isService ? (
                                <span
                                  style={{
                                    fontSize: 11,
                                    background: "#eef2ff",
                                    color: "#4338ca",
                                    padding: "3px 10px",
                                    borderRadius: 99,
                                    fontWeight: 700,
                                  }}
                                >
                                  Service — No stock tracking
                                </span>
                              ) : (
                                <div
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 3,
                                  }}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 6,
                                    }}
                                  >
                                    <strong
                                      style={{
                                        color: isLow
                                          ? "#dc2626"
                                          : "var(--text)",
                                        fontSize: 14,
                                      }}
                                    >
                                      {item.qty}
                                    </strong>
                                    <span
                                      style={{
                                        fontSize: 11,
                                        color: "var(--muted)",
                                      }}
                                    >
                                      {item.unit}
                                    </span>
                                    {isLow && (
                                      <span
                                        style={{
                                          fontSize: 10,
                                          background: "#fee2e2",
                                          color: "#dc2626",
                                          padding: "2px 6px",
                                          borderRadius: 99,
                                          fontWeight: 700,
                                        }}
                                      >
                                        Low
                                      </span>
                                    )}
                                  </div>
                                  <div
                                    style={{
                                      width: 80,
                                      height: 4,
                                      borderRadius: 99,
                                      background: isLow ? "#fee2e2" : "#dcfce7",
                                      overflow: "hidden",
                                    }}
                                  >
                                    <div
                                      style={{
                                        height: "100%",
                                        borderRadius: 99,
                                        background: isLow
                                          ? "#ef4444"
                                          : "#22c55e",
                                        width: `${Math.min(100, (item.qty / Math.max((item.threshold ?? 10) * 2, 1)) * 100)}%`,
                                      }}
                                    />
                                  </div>
                                </div>
                              )}
                            </td>

                            {/* Price */}
                            <td className="inv-td">
                              <span style={{ fontWeight: 600 }}>
                                ₱{Number(item.price || 0).toFixed(2)}
                              </span>
                            </td>

                            {/* Expiry */}
                            <td className="inv-td">
                              {item.expiry ? (
                                (() => {
                                  const color = exp?.expired
                                    ? "#dc2626"
                                    : exp?.soon
                                      ? "#d97706"
                                      : "var(--text)";
                                  return (
                                    <div>
                                      <span
                                        style={{
                                          color,
                                          fontWeight: exp?.soon ? 700 : 400,
                                        }}
                                      >
                                        {item.expiry}
                                      </span>
                                      {exp?.soon && !exp.expired && (
                                        <div
                                          style={{
                                            fontSize: 10,
                                            color: "#d97706",
                                            fontWeight: 700,
                                          }}
                                        >
                                          {exp.days}d left
                                        </div>
                                      )}
                                      {exp?.expired && (
                                        <div
                                          style={{
                                            fontSize: 10,
                                            color: "#dc2626",
                                            fontWeight: 700,
                                          }}
                                        >
                                          EXPIRED
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()
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

                            {/* Supplier */}
                            <td className="inv-td">
                              <span
                                style={{ fontSize: 12, color: "var(--muted)" }}
                              >
                                {item.supplier || "—"}
                              </span>
                            </td>

                            {/* Actions */}
                            {(perms.canEdit || perms.canDelete) && (
                              <td
                                className="inv-td"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    gap: 5,
                                    justifyContent: "flex-end",
                                    alignItems: "center",
                                    flexWrap: "nowrap",
                                  }}
                                >
                                  <button
                                    onClick={() => openView(item)}
                                    style={{
                                      background: "#eff6ff",
                                      border: "1.5px solid #bfdbfe",
                                      borderRadius: 20,
                                      height: 28,
                                      padding: "0 10px",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 5,
                                      cursor: "pointer",
                                      color: "#1d4ed8",
                                      fontSize: 11,
                                      fontWeight: 600,
                                      fontFamily: "inherit",
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
                                  {perms.canEdit && (
                                    <button
                                      onClick={(e) => openEdit(item, e)}
                                      style={{
                                        background: "#f8fafc",
                                        border: "1.5px solid #e2e8f0",
                                        borderRadius: 20,
                                        height: 28,
                                        padding: "0 10px",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 5,
                                        cursor: "pointer",
                                        color: "#475569",
                                        fontSize: 11,
                                        fontWeight: 600,
                                        fontFamily: "inherit",
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
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                      </svg>
                                      Edit
                                    </button>
                                  )}
                                  {perms.canDelete && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDeleteId(item.id);
                                      }}
                                      style={{
                                        background: "#fef2f2",
                                        border: "1.5px solid #fca5a5",
                                        borderRadius: 20,
                                        height: 28,
                                        padding: "0 10px",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 5,
                                        cursor: "pointer",
                                        color: "#dc2626",
                                        fontSize: 11,
                                        fontWeight: 600,
                                        fontFamily: "inherit",
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
                                        <path d="M10 11v6M14 11v6" />
                                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                                      </svg>
                                      Delete
                                    </button>
                                  )}{" "}
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              )}
            </div>
            {totalPages > 1 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                  padding: "14px 18px",
                  borderTop: "1px solid var(--border)",
                  background: "var(--card)",
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
                        flexShrink: 0,
                        background:
                          safePage === pg ? "var(--royal)" : "transparent",
                        color: safePage === pg ? "#fff" : "var(--text)",
                        borderColor:
                          safePage === pg ? "var(--royal)" : "var(--border)",
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
                      safePage === totalPages ? "var(--muted)" : "var(--text)",
                    cursor: safePage === totalPages ? "default" : "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  next
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── View Modal ── */}
      {viewItem && (
        <ViewModal
          item={viewItem}
          onClose={() => setViewItem(null)}
          onEdit={(item) => {
            setViewItem(null);
            openEdit(item);
          }}
          onDelete={(id) => setDeleteId(id)}
        />
      )}

      {/* ── Add / Edit Modal ── */}
      {editItem !== null && (
        <ItemFormModal
          item={editItem}
          onClose={() => setEditItem(null)}
          onSave={handleSave}
          saving={saving}
          canEditPrice={perms.canEditPrice}
        />
      )}

      {/* ── Delete Confirm ── */}
      {deleteId && (
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
              maxWidth: 400,
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
            }}
          >
            <div className="modal-header">
              <h3>Delete Item?</h3>
            </div>
            <div className="modal-body">
              <p style={{ color: "var(--muted)" }}>
                This item will move to Recently Deleted for 30 days before being
                permanently removed.
              </p>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-ghost inv-btn-auto"
                onClick={() => setDeleteId(null)}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger inv-btn-auto"
                onClick={() => doDelete(deleteId)}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bulk Delete Confirm ── */}
      {bulkConfirm && (
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
              maxWidth: 400,
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
            }}
          >
            <div className="modal-header">
              <h3>Delete {selectedIds.length} Item(s)?</h3>
            </div>
            <div className="modal-body">
              <p style={{ color: "var(--muted)" }}>
                These items will move to Recently Deleted for 30 days before
                being permanently removed.
              </p>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-ghost inv-btn-auto"
                onClick={() => setBulkConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger inv-btn-auto"
                onClick={doBulkDelete}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
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
                  Recently Deleted Items
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: 12,
                    color: "var(--muted)",
                    marginTop: 2,
                  }}
                >
                  Items are permanently removed 30 days after deletion.
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
              {deletedItems.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px 0",
                    color: "var(--muted)",
                  }}
                >
                  <p style={{ fontSize: 13, margin: 0 }}>
                    No recently deleted items.
                  </p>
                </div>
              ) : (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 10 }}
                >
                  {deletedItems.map((item) => {
                    const daysLeft = Math.max(
                      0,
                      30 -
                        Math.floor(
                          (Date.now() - new Date(item.deleted_at).getTime()) /
                            (24 * 60 * 60 * 1000),
                        ),
                    );
                    return (
                      <div
                        key={item.id}
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
                            {item.name}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--muted)" }}>
                            {item.category || "Other"}
                            {item.supplier ? ` · ${item.supplier}` : ""}
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
                            onClick={() => restoreItem(item.id, item.name)}
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
                            onClick={() =>
                              permanentlyDeleteItem(item.id, item.name)
                            }
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

export default Inventory;
