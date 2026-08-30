// src/pages/CustomerAIChat.jsx
// AI Symptom Pre-Assessment for logged-in Customers
// Mirrors AIAssessment.jsx — direct Gemini call, branch-aware, useCurrentUser
import React, { useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../js/Utils/supabase";
import { useCurrentUser } from "../../js/hooks/Usecurrentuser";
import { Layout } from "../../components/layout";
import "../../styles/CustomerAIChat.css";

// ── Custom Icons ──────────────────────────────────────────────────────────────
const AIIcon = ({ size = 24, color = "currentColor" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill={color}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M32 8c-3.3 0-6 2.7-6 6 0 1.1.3 2.1.8 3H18c-3.3 0-6 2.7-6 6v20c0 3.3 2.7 6 6 6h28c3.3 0 6-2.7 6-6V23c0-3.3-2.7-6-6-6h-8.8c.5-.9.8-1.9.8-3 0-3.3-2.7-6-6-6zm0 4c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zM18 21h28c1.1 0 2 .9 2 2v20c0 1.1-.9 2-2 2H18c-1.1 0-2-.9-2-2V23c0-1.1.9-2 2-2zm6 6c-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4zm16 0c-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4zm-8 6c-3 0-8 1.5-8 4v2h16v-2c0-2.5-5-4-8-4z" />
  </svg>
);

const PetsIcon = ({ size = 24, color = "currentColor" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 20 20"
    fill={color}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M11.9 8.4c1.3 0 2.1-1.9 2.1-3.1 0-1-.5-2.2-1.5-2.2-1.3 0-2.1 1.9-2.1 3.1 0 1 .5 2.2 1.5 2.2zm-3.8 0c1 0 1.5-1.2 1.5-2.2C9.6 4.9 8.8 3 7.5 3 6.5 3 6 4.2 6 5.2c-.1 1.3.7 3.2 2.1 3.2zm7.4-1c-1.3 0-2.2 1.8-2.2 3.1 0 .9.4 1.8 1.3 1.8 1.3 0 2.2-1.8 2.2-3.1 0-.9-.5-1.8-1.3-1.8zm-8.7 3.1c0-1.3-1-3.1-2.2-3.1-.9 0-1.3.9-1.3 1.8 0 1.3 1 3.1 2.2 3.1.9 0 1.3-.9 1.3-1.8zm3.2-.2c-2 0-4.7 3.2-4.7 5.4 0 1 .7 1.3 1.5 1.3 1.2 0 2.1-.8 3.2-.8 1 0 1.9.8 3 .8.8 0 1.7-.2 1.7-1.3 0-2.2-2.7-5.4-4.7-5.4z" />
  </svg>
);

const StethoscopeIcon = ({ size = 24, color = "currentColor" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="1.5"
    strokeLinecap="round"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M9 14.2354V17.0001C9 19.0504 10.2341 20.8125 12 21.584M14.8824 22.0001C16.7691 22.0001 18.3595 20.7311 18.8465 19.0001" />
    <path d="M12.2857 3H12.3774C12.6902 3 12.8467 3 12.9785 3.01166C14.4267 3.13972 15.5746 4.28763 15.7026 5.73574C15.7143 5.86761 15.7143 6.02404 15.7143 6.3369V7.23529C15.7143 8.2172 15.5121 9.15189 15.1471 10M5.42857 3H5.3369C5.02404 3 4.86761 3 4.73574 3.01166C3.28763 3.13972 2.13972 4.28763 2.01166 5.73574C2 5.86761 2 6.02404 2 6.3369V7.521C2 11.2292 5.00609 14.2353 8.71429 14.2353C9.78788 14.2353 10.805 13.9936 11.7143 13.5617" />
    <circle cx="19" cy="16" r="3" />
    <path d="M12 2V4" />
    <path d="M6 2V4" />
  </svg>
);

const Icons = {
  AlertTriangle: () => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ width: 16, height: 16 }}
    >
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  ),
  CheckCircle: () => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ width: 16, height: 16 }}
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  Zap: () => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ width: 14, height: 14 }}
    >
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  Home: () => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ width: 14, height: 14 }}
    >
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  Calendar: () => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ width: 16, height: 16 }}
    >
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" />
      <line x1="3" x2="21" y1="10" y2="10" />
    </svg>
  ),
  MessageCircle: () => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ width: 18, height: 18 }}
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  RotateCcw: () => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ width: 14, height: 14 }}
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  ),
  Send: () => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ width: 16, height: 16 }}
    >
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  ),
};

// ── Custom Select (matches Appointments.jsx dropdown design) ──────────────────
const CustomSelect = ({
  value,
  onChange,
  options,
  placeholder = "—",
  accent = "#1e3a8a",
}) => {
  const [open, setOpen] = useState(false);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef(null);
  const ref = useRef(null);
  const selected = options.find((o) => (o.value ?? o) === value);
  const label = selected ? (selected.label ?? selected) : placeholder;

  useEffect(() => {
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
      let left = rect.left + window.scrollX;
      const maxLeft = window.scrollX + window.innerWidth - rect.width - 8;
      const minLeft = window.scrollX + 8;
      if (left > maxLeft) left = maxLeft;
      if (left < minLeft) left = minLeft;
      setDropPos({
        top: showAbove
          ? rect.top + window.scrollY - dropHeight - 6
          : rect.bottom + window.scrollY + 6,
        left,
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
                    if (!opt.disabled) {
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
                    cursor: opt.disabled ? "not-allowed" : "pointer",
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
                      e.currentTarget.style.background = "var(--bg, #f4f6fa)";
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
          background: "var(--card, #fff)",
          fontSize: 13,
          fontWeight: 600,
          color: value ? "var(--text)" : "#b0bac9",
          cursor: "pointer",
          userSelect: "none",
          boxSizing: "border-box",
          boxShadow: open
            ? `0 0 0 3px ${accent}22, 0 2px 8px rgba(0,0,0,0.08)`
            : "0 1px 3px rgba(0,0,0,0.06)",
          borderColor: open ? accent : "var(--border, #dde3ec)",
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

// ── DatePicker (same design as Appointments.jsx) ──────────────────────────────
const DatePicker = ({
  value,
  onChange,
  placeholder = "Pick a date",
  min = "",
}) => {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() =>
    value ? new Date(value + "T00:00:00") : new Date(),
  );
  const triggerRef = useRef(null);
  const popRef = useRef(null);

  useEffect(() => {
    if (value) setViewDate(new Date(value + "T00:00:00"));
  }, [value]);

  useEffect(() => {
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

  const [popPos, setPopPos] = useState({
    top: 0,
    left: 0,
    width: 280,
    fixed: false,
  });
  const handleOpen = () => {
    if (!open && triggerRef.current) {
      const isMobile = window.innerWidth < 480;
      if (isMobile) {
        const popWidth = Math.min(320, window.innerWidth - 24);
        setPopPos({
          top: Math.max(12, (window.innerHeight - 360) / 2),
          left: (window.innerWidth - popWidth) / 2,
          width: popWidth,
          fixed: true,
        });
      } else {
        const rect = triggerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const popWidth = Math.max(rect.width, 280);
        let left = rect.left;
        const maxLeft = window.innerWidth - popWidth - 8;
        if (left > maxLeft) left = Math.max(8, maxLeft);
        setPopPos({
          top:
            spaceBelow > 320
              ? rect.bottom + 6
              : Math.max(8, rect.top - 310 - 6),
          left,
          width: popWidth,
          fixed: true,
        });
      }
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
              position: "fixed",
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
              maxHeight: "calc(100vh - 24px)",
              overflowY: "auto",
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
          padding: "10px 12px",
          border: "1.5px solid",
          borderColor: open ? "#1e3a8a" : "var(--border)",
          borderRadius: 10,
          background: "var(--card)",
          cursor: "pointer",
          userSelect: "none",
          minWidth: 160,
          boxShadow: open
            ? "0 0 0 3px rgba(30,58,138,0.12),0 2px 8px rgba(0,0,0,0.08)"
            : "0 1px 3px rgba(0,0,0,0.06)",
          transition: "all 0.18s",
        }}
      >
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: 6,
            background: open ? "#1e3a8a" : "var(--bg)",
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
            fontSize: 14,
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

// ── Config ────────────────────────────────────────────────────────────────────
const API_URL =
  import.meta.env.VITE_API_URL || "https://vet-care-hospital-ai.onrender.com";
// const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`; --- IGNORE ---
const PET_TYPES = ["Dog", "Cat"];

const AGE_OPTIONS = [
  "0–3 months (Newborn)",
  "3–6 months (Young puppy/kitten)",
  "6–12 months (Puppy/Kitten)",
  "1–3 years (Young adult)",
  "3–7 years (Adult)",
  "7–10 years (Mature)",
  "10+ years (Senior)",
];

const QUICK_SYMPTOMS = [
  "Not eating",
  "Vomiting",
  "Diarrhea",
  "Lethargy",
  "Coughing",
  "Sneezing",
  "Limping",
  "Scratching",
  "Hair loss",
  "Swelling",
  "Difficulty breathing",
  "Drinking excessively",
  "Seizures",
  "Bleeding",
];

const URGENCY_CONFIG = {
  Emergency: {
    color: "#dc2626",
    bg: "#fef2f2",
    border: "#fca5a5",
    label: "EMERGENCY — Go to vet NOW",
  },
  High: {
    color: "#ea580c",
    bg: "#fff7ed",
    border: "#fdba74",
    label: "HIGH — See a vet today",
  },
  Moderate: {
    color: "#d97706",
    bg: "#fffbeb",
    border: "#fde68a",
    label: "MODERATE — Vet visit in 1–2 days",
  },
  Low: {
    color: "#16a34a",
    bg: "#f0fdf4",
    border: "#86efac",
    label: "LOW — Monitor at home, routine visit okay",
  },
};

const UrgencyIcon = ({ urgency, size = 36 }) => {
  const common = {
    width: size,
    height: size,
    fill: "none",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };
  switch (urgency) {
    case "Emergency":
      return (
        <svg viewBox="0 0 24 24" stroke="#dc2626" {...common}>
          <path d="M12 2 2 22h20L12 2z" />
          <path d="M12 9v6" />
          <path d="M12 18h.01" />
        </svg>
      );
    case "High":
      return (
        <svg viewBox="0 0 24 24" stroke="#ea580c" {...common}>
          <path d="M12 2 2 22h20L12 2z" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </svg>
      );
    case "Moderate":
      return (
        <svg viewBox="0 0 24 24" stroke="#d97706" {...common}>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4" />
          <path d="M12 16h.01" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" stroke="#16a34a" {...common}>
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      );
  }
};

const SERVICE_MAP = {
  "general check-up": "Checkup",
  checkup: "Checkup",
  "emergency care": "Emergency",
  emergency: "Emergency",
  vaccination: "Vaccination",
  "dental care": "Dental",
  dental: "Dental",
  "surgery consultation": "Surgery",
  surgery: "Surgery",
  grooming: "Grooming",
  "follow-up": "Follow-up",
};

// ── Step indicator ────────────────────────────────────────────────────────────
const StepDot = ({ n, active, done, label }) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 4,
    }}
  >
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: "50%",
        background: done ? "#16a34a" : active ? "#1e3a8a" : "#e2e8f0",
        color: done || active ? "#fff" : "#94a3b8",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: done ? 14 : 13,
        fontWeight: 800,
        transition: "all 0.2s",
        border: `2px solid ${done ? "#16a34a" : active ? "#1e3a8a" : "#e2e8f0"}`,
      }}
    >
      {done ? "✓" : n}
    </div>
    <span
      style={{
        fontSize: 10,
        fontWeight: active ? 700 : 500,
        color: done ? "#16a34a" : active ? "#1e3a8a" : "#94a3b8",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  </div>
);

const StepDotMobile = ({ n, active, done, label }) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 2,
    }}
  >
    <div
      style={{
        width: 26,
        height: 26,
        borderRadius: "50%",
        background: done ? "#16a34a" : active ? "#1e3a8a" : "#e2e8f0",
        color: done || active ? "#fff" : "#94a3b8",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: done ? 11 : 11,
        fontWeight: 800,
        transition: "all 0.2s",
        border: `2px solid ${done ? "#16a34a" : active ? "#1e3a8a" : "#e2e8f0"}`,
        flexShrink: 0,
      }}
    >
      {done ? "✓" : n}
    </div>
    <span
      style={{
        fontSize: 8,
        fontWeight: active ? 700 : 500,
        color: done ? "#16a34a" : active ? "#1e3a8a" : "#94a3b8",
        whiteSpace: "nowrap",
        maxWidth: 36,
        overflow: "hidden",
        textOverflow: "ellipsis",
        textAlign: "center",
        lineHeight: 1.2,
      }}
    >
      {label}
    </span>
  </div>
);

const StepLine = ({ done }) => (
  <div
    style={{
      flex: 1,
      height: 2,
      background: done ? "#16a34a" : "#e2e8f0",
      marginBottom: 20,
      transition: "background 0.3s",
    }}
  />
);

// ── Typing indicator ──────────────────────────────────────────────────────────
const TypingDots = () => (
  <div
    style={{ display: "flex", gap: 4, alignItems: "center", padding: "12px 0" }}
  >
    {[0, 1, 2].map((i) => (
      <span
        key={i}
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: "#1e3a8a",
          display: "inline-block",
          animation: `aiDot 1.2s ${i * 0.2}s infinite`,
        }}
      />
    ))}
  </div>
);

// ── Follow-up Chat Component ──────────────────────────────────────────────────
const FollowUpChat = ({
  assessment,
  petName,
  petType,
  petAge,
  symptoms,
  onProceedToBook,
}) => {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: `I've completed the assessment for **${petName}**. The analysis suggests **${assessment.urgency}** urgency with a recommendation for **${assessment.recommendedService}**.\n\nDo you have any follow-up questions about ${petName}'s condition, the assessment results, or what to expect? Feel free to ask anything — or proceed to book an appointment when you're ready.`,
      time: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatLoading]);

  const SUGGESTED_QUESTIONS = [
    "Is this condition contagious to other pets?",
    "What should I feed my pet right now?",
    "How long will recovery take?",
    "Should I restrict activity?",
  ];

  const sendMessage = async (text) => {
    const userText = text || input.trim();
    if (!userText || chatLoading) return;
    setInput("");

    const userMsg = { role: "user", text: userText, time: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setChatLoading(true);

    const contextPrompt = `You are a veterinary assistant AI for Angeles Animal Care Hospital. You have just completed a pre-assessment for a pet.

Pet Details:
- Name: ${petName}
- Type: ${petType}
- Age: ${petAge}
- Reported Symptoms: ${symptoms}

Assessment Results:
- Possible Conditions: ${assessment.conditions?.join(", ")}
- Urgency: ${assessment.urgency} — ${assessment.urgencyReason}
- Recommended Service: ${assessment.recommendedService}
- Summary: ${assessment.summary}

The pet owner is now asking a follow-up question. Answer helpfully, concisely, and in plain language. Always recommend consulting a vet for definitive diagnosis. Do NOT repeat the full assessment — just answer the specific question. IMPORTANT: Always reply in the SAME language the owner used in their question (English, Tagalog/Filipino, Taglish, Bisaya, or any other language) — detect it from their message and match it naturally.

Owner's question: ${userText}`;

    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: contextPrompt }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      const raw = data.content?.[0]?.text || "";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: raw.trim(), time: new Date() },
      ]);
    } catch (err) {
      console.error("Customer chat error:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Sorry, I couldn't process that question right now. Please try again or proceed to book your appointment.",
          time: new Date(),
          isError: true,
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatText = (text) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\n/g, "<br/>");
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 0,
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: 16,
        overflow: "hidden",
        boxShadow: "0 2px 12px rgba(30,58,138,0.06)",
        height: "100%",
      }}
    >
      {/* Chat header */}
      <div
        style={{
          background: "linear-gradient(135deg,#1a1a6e,#1e3a8a)",
          padding: "14px 18px",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <AIIcon size={18} color="#fff" />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>
            Follow-up Questions
          </div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.65)" }}>
            Ask anything about {petName}'s assessment · Powered by Gemini
          </div>
        </div>
        <div
          style={{
            marginLeft: "auto",
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#4ade80",
            boxShadow: "0 0 6px #4ade80",
          }}
        />
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          background: "var(--bg)",
        }}
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              flexDirection: msg.role === "user" ? "row-reverse" : "row",
              gap: 8,
              alignItems: "flex-start",
            }}
          >
            {msg.role === "assistant" && (
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg,#1a1a6e,#1e3a8a)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                <AIIcon size={15} color="#fff" />
              </div>
            )}
            <div
              style={{
                maxWidth: "78%",
                padding: "10px 14px",
                borderRadius:
                  msg.role === "user"
                    ? "16px 4px 16px 16px"
                    : "4px 16px 16px 16px",
                background:
                  msg.role === "user"
                    ? "#1e3a8a"
                    : msg.isError
                      ? "#fef2f2"
                      : "var(--card)",
                color:
                  msg.role === "user"
                    ? "#fff"
                    : msg.isError
                      ? "#dc2626"
                      : "var(--text)",
                fontSize: 13,
                lineHeight: 1.6,
                border:
                  msg.role === "assistant" ? "1px solid var(--border)" : "none",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              }}
              dangerouslySetInnerHTML={{ __html: formatText(msg.text) }}
            />
          </div>
        ))}

        {chatLoading && (
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "linear-gradient(135deg,#1a1a6e,#1e3a8a)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <AIIcon size={15} color="#fff" />
            </div>
            <div
              style={{
                padding: "10px 14px",
                borderRadius: "4px 16px 16px 16px",
                background: "var(--card)",
                border: "1px solid var(--border)",
              }}
            >
              <TypingDots />
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Suggested questions */}
      {messages.length <= 1 && (
        <div
          style={{
            padding: "10px 16px 0",
            background: "var(--bg)",
            borderTop: "1px solid var(--border)",
          }}
        >
          <p
            style={{
              fontSize: 11,
              color: "var(--muted)",
              fontWeight: 700,
              margin: "0 0 8px",
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            Suggested questions
          </p>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              paddingBottom: 10,
            }}
          >
            {SUGGESTED_QUESTIONS.map((q, i) => (
              <button
                key={i}
                onClick={() => sendMessage(q)}
                style={{
                  padding: "5px 12px",
                  borderRadius: 20,
                  border: "1.5px solid rgba(37,99,235,0.35)",
                  background: "rgba(37,99,235,0.10)",
                  color: "var(--royal, #2563eb)",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "all 0.15s",
                }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div
        style={{
          padding: "12px 16px",
          background: "var(--card)",
          borderTop: "1px solid var(--border)",
          display: "flex",
          gap: 8,
        }}
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder={`Ask about ${petName}'s condition…`}
          rows={1}
          disabled={chatLoading}
          style={{
            flex: 1,
            padding: "9px 12px",
            borderRadius: 10,
            border: "1.5px solid var(--border)",
            fontSize: 13,
            fontFamily: "inherit",
            outline: "none",
            resize: "none",
            lineHeight: 1.5,
            transition: "border-color 0.15s",
            background: "var(--bg)",
            color: "var(--text)",
          }}
          onFocus={(e) => (e.target.style.borderColor = "#1e3a8a")}
          onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
        />
        <button
          onClick={() => sendMessage()}
          disabled={!input.trim() || chatLoading}
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            border: "none",
            background: input.trim() && !chatLoading ? "#1e3a8a" : "#e2e8f0",
            color: input.trim() && !chatLoading ? "#fff" : "#94a3b8",
            cursor: input.trim() && !chatLoading ? "pointer" : "not-allowed",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
            flexShrink: 0,
            alignSelf: "flex-end",
            transition: "all 0.15s",
          }}
        >
          <Icons.Send />
        </button>
      </div>

      {/* Proceed CTA */}
      <div
        style={{
          padding: "12px 16px 16px",
          background: "var(--card)",
          borderTop: "1px solid var(--border)",
        }}
      >
        <button
          onClick={onProceedToBook}
          style={{
            width: "100%",
            padding: "13px",
            borderRadius: 12,
            border: "none",
            background: "linear-gradient(135deg,#1a1a6e,#1e3a8a)",
            color: "#fff",
            fontFamily: "inherit",
            fontSize: 14,
            fontWeight: 800,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <Icons.Calendar /> Done asking — Book Appointment →
        </button>
        <p
          style={{
            fontSize: 11,
            color: "#94a3b8",
            textAlign: "center",
            margin: "8px 0 0",
          }}
        >
          All your questions answered? Proceed to book.
        </p>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const CustomerAIChat = () => {
  const navigate = useNavigate();
  const { user, isAdmin, isCustomer, loading: userLoading } = useCurrentUser();

  const [step, setStep] = useState(1); // 1=pet info, 2=symptoms, 3=assessing, 4=results, 5=booking, 6=done
  const [error, setError] = useState("");
  const [assessing, setAssessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [assessment, setAssessment] = useState(null);
  const [saved, setSaved] = useState(null);
  const [history, setHistory] = useState([]);
  const [showChat, setShowChat] = useState(false);
  const [petMode, setPetMode] = useState("new");
  const [existingPatients, setExistingPatients] = useState([]);
  const [loadingExistingPatients, setLoadingExistingPatients] = useState(false);

  // Form state
  const [form, setForm] = useState({
    petName: "",
    petType: "Dog",
    petAge: "",
    symptoms: "",
    additionalNotes: "",
    ownerName: "",
    contact: "",
    vet: "",
    date: "",
    time: "",
    notes: "",
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setContact = (v) => set("contact", v.replace(/\D/g, "").slice(0, 11));

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
  const VETS = ["Dr. Santos", "Dr. Reyes", "Dr. Cruz", "Dr. Garcia"];
  const TODAY = new Date().toISOString().split("T")[0];
  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const [vets, setVets] = useState(VETS);
  const [vetSchedule, setVetSchedule] = useState({});
  const [vetTimeSchedule, setVetTimeSchedule] = useState({});
  const [takenSlots, setTakenSlots] = useState([]);

  useEffect(() => {
    const fetchVetSchedules = async () => {
      const { data } = await supabase.from("vet_schedules").select("*");
      if (data && data.length) {
        const days = {},
          times = {};
        data.forEach((row) => {
          days[row.vet] = row.days || [];
          times[row.vet] = row.times || [];
        });
        setVetSchedule(days);
        setVetTimeSchedule(times);
        setVets(data.map((row) => row.vet));
      }
    };
    fetchVetSchedules();
  }, []);

  useEffect(() => {
    const checkSlots = async () => {
      if (!form.vet || !form.date) {
        setTakenSlots([]);
        return;
      }
      const { data } = await supabase
        .from("appointments")
        .select("time")
        .eq("vet", form.vet)
        .eq("date", form.date)
        .in("status", ["Pending", "Confirmed"]);
      setTakenSlots((data || []).map((r) => r.time));
    };
    checkSlots();
  }, [form.vet, form.date]);

  const isVetAvailableOnDate = (vet, dateStr) => {
    if (!vet || !dateStr) return true;
    const sched = vetSchedule[vet];
    if (!sched) return true;
    return sched.includes(new Date(dateStr + "T00:00:00").getDay());
  };
  const isVetAvailableAtTime = (vet, time) => {
    if (!vet || !time) return true;
    const sched = vetTimeSchedule[vet];
    if (!sched) return true;
    return sched.includes(time);
  };

  useEffect(() => {
    if (user) set("ownerName", user.fullName || "");
  }, [user]);

  useEffect(() => {
    const fetchExistingPatients = async () => {
      if (!user?.id) return;
      setLoadingExistingPatients(true);
      const { data, error } = await supabase
        .from("patients")
        .select("id,name,species")
        .eq("owner_user_id", user.id)
        .order("name");
      if (!error) setExistingPatients(data || []);
      setLoadingExistingPatients(false);
    };
    fetchExistingPatients();
  }, [user]);

  const canStep2 = form.petName.trim() && form.petType && form.petAge;
  const canSubmit = form.symptoms.trim().length >= 10;

  // ── Call Gemini directly ──────────────────────────────────────────────────
  const analyzeSymptoms = async () => {
    if (!canSubmit) {
      setError("Please describe the symptoms in more detail.");
      return;
    }
    setError("");
    setAssessing(true);
    setStep(3);

    const prompt = `You are a veterinary triage AI assistant for Angeles Animal Care Hospital in the Philippines.

A pet owner has described symptoms for their ${form.petType} named "${form.petName}" (${form.petAge}).

SYMPTOMS: ${form.symptoms}
${form.additionalNotes ? `ADDITIONAL NOTES: ${form.additionalNotes}` : ""}

Analyze these symptoms and respond ONLY with valid JSON (no markdown, no backticks) in this exact format:
{
  "conditions": ["condition1", "condition2", "condition3"],
  "urgency": "Emergency" | "High" | "Moderate" | "Low",
  "urgencyReason": "1-2 sentence explanation of urgency",
  "recommendedService": "one of: General Check-up, Emergency Care, Vaccination, Dental Care, Surgery Consultation, Dermatology, Laboratory/Diagnostics, Grooming, Follow-up",
  "summary": "2-3 sentence plain-language summary for the owner",
  "warningSigns": ["warning sign 1", "warning sign 2"],
  "homeCareTips": ["tip 1", "tip 2"],
  "appointment_notes": "brief notes for the appointment form"
}

Rules:
- conditions: 2-4 most likely differentials (not diagnoses)
- Emergency = life-threatening; High = see vet today; Moderate = 1-2 days; Low = monitor + routine visit
- Always recommend professional veterinary consultation
- IMPORTANT: Write every text value above (urgencyReason, summary, warningSigns, homeCareTips, appointment_notes, and condition names) in the SAME language the owner used in SYMPTOMS/ADDITIONAL NOTES — English, Tagalog/Filipino, Taglish, Bisaya, or any other language. Detect it naturally from their wording and match it. Keep the JSON keys themselves exactly as shown above in English — only the values should switch language.`;

    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: prompt }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      const raw = (data.content?.[0]?.text || "").trim();
      const clean = raw
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();
      const parsed = JSON.parse(clean);

      setAssessment(parsed);
      set("notes", parsed.appointment_notes || "");
      setShowChat(false);
      setStep(4);
    } catch (err) {
      console.error(err);
      setError(err.message || "AI assessment failed. Please try again.");
      setStep(2);
    } finally {
      setAssessing(false);
    }
  };

  // ── Save pre_assessment + appointment ─────────────────────────────────────
  const bookAppointment = async () => {
    if (!form.date || !form.time) {
      setError("Please select a date and time.");
      return;
    }
    if (form.vet && !isVetAvailableOnDate(form.vet, form.date)) {
      setError(`${form.vet} is not available on this day.`);
      return;
    }
    if (form.vet && !isVetAvailableAtTime(form.vet, form.time)) {
      setError(`${form.vet} is not available at this time.`);
      return;
    }
    if (form.vet && takenSlots.includes(form.time)) {
      setError("This time slot was just taken. Please pick another.");
      return;
    }
    setSaving(true);
    setError("");

    const branchId = user?.branchId ?? null;

    const { data: assessmentRow } = await supabase
      .from("pre_assessments")
      .insert([
        {
          patient_id: user?.id ?? null,
          branch_id: branchId,
          symptoms: `${form.symptoms}${form.additionalNotes ? "\n\nAdditional: " + form.additionalNotes : ""}`,
          ai_conditions: assessment?.conditions || [],
          ai_service: assessment?.recommendedService || "General Check-up",
          ai_urgency: assessment?.urgency || "Moderate",
          ai_summary: assessment?.summary || "",
        },
      ])
      .select()
      .single();

    const purpose =
      SERVICE_MAP[(assessment?.recommendedService || "").toLowerCase()] ||
      assessment?.recommendedService ||
      "Checkup";

    const { data: apptRow, error: apptErr } = await supabase
      .from("appointments")
      .insert([
        {
          patient: form.petName,
          owner: form.ownerName,
          contact: form.contact,
          vet: purpose === "Grooming" ? "" : form.vet || "",
          date: form.date,
          time: form.time,
          purpose: purpose,
          notes: `[AI Assessment] ${assessment?.summary || ""}\n\n${form.notes}`,
          status: isAdmin ? "Confirmed" : "Pending",
          branch_id: branchId,
        },
      ])
      .select()
      .single();

    if (apptErr) {
      setError("Error saving appointment: " + apptErr.message);
      setSaving(false);
      return;
    }

    if (assessmentRow?.id && apptRow?.id) {
      await supabase
        .from("pre_assessments")
        .update({ appointment_id: apptRow.id })
        .eq("id", assessmentRow.id);
    }

    setHistory((h) => [
      {
        pet: form.petName,
        symptoms: form.symptoms.slice(0, 60) + "...",
        urgency: assessment?.urgency,
        service: assessment?.recommendedService,
        date: form.date,
      },
      ...h,
    ]);

    setSaved(apptRow);
    setSaving(false);
    setStep(6);
  };

  const reset = () => {
    setStep(1);
    setAssessment(null);
    setSaved(null);
    setError("");
    setShowChat(false);
    setPetMode("new");
    setForm({
      petName: "",
      petType: "Dog",
      petAge: "",
      symptoms: "",
      additionalNotes: "",
      ownerName: user?.fullName || "",
      contact: "",
      vet: "",
      date: "",
      time: "",
      notes: "",
    });
  };

  const urgency = assessment
    ? URGENCY_CONFIG[assessment.urgency] || URGENCY_CONFIG.Moderate
    : null;

  const S = {
    page: { width: "100%", background: "var(--bg)" },
    cont: { padding: "16px 12px 48px", maxWidth: 600, margin: "0 auto" },
    card: {
      background: "var(--card)",
      borderRadius: 16,
      border: "1px solid var(--border)",
      boxShadow: "0 2px 12px rgba(30,58,138,0.06)",
      padding: 24,
      marginBottom: 16,
    },
    inp: {
      width: "100%",
      padding: "11px 14px",
      borderRadius: 10,
      border: "1.5px solid var(--border)",
      fontSize: 14,
      fontFamily: "inherit",
      outline: "none",
      boxSizing: "border-box",
      transition: "border-color 0.15s",
      background: "var(--card)",
      color: "var(--text)",
    },
    label: {
      fontSize: 12,
      fontWeight: 700,
      color: "var(--muted)",
      display: "block",
      marginBottom: 8,
      textTransform: "uppercase",
      letterSpacing: "0.4px",
    },
  };

  if (userLoading)
    return (
      <div
        style={{
          ...S.page,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <p style={{ color: "#64748b" }}>Loading...</p>
      </div>
    );

  const STEPS = [
    "Pet Info",
    "Symptoms",
    "AI Analysis",
    "Assessment",
    "Book",
    "Done",
  ];

  return (
    <Layout>
      <div style={S.page}>
        {/* ── Page Header ── */}
        <div
          style={{
            background: "linear-gradient(135deg,#1a1a6e,#1e3a8a)",
            borderRadius: 16,
            padding: "16px 18px",
            marginBottom: 16,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              flex: 1,
              minWidth: 0,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "rgba(255,255,255,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <AIIcon size={22} color="#fff" />
            </div>
            <div style={{ minWidth: 0 }}>
              <h1
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  color: "#fff",
                  margin: "0 0 2px",
                  lineHeight: 1.3,
                }}
              >
                AI Symptom Pre-Assessment
              </h1>
              <p
                style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,0.65)",
                  margin: 0,
                  lineHeight: 1.4,
                }}
              >
                Describe symptoms · Get AI triage · Book
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            {step === 6 && (
              <button
                onClick={() => navigate("/customer/appointments")}
                style={{
                  background: "rgba(255,255,255,0.15)",
                  border: "1px solid rgba(255,255,255,0.3)",
                  borderRadius: 8,
                  padding: "7px 14px",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  color: "#fff",
                  fontFamily: "inherit",
                }}
              >
                View Appointments
              </button>
            )}
            {step === 4 && (
              <button
                onClick={reset}
                style={{
                  background: "rgba(255,255,255,0.15)",
                  border: "1px solid rgba(255,255,255,0.3)",
                  borderRadius: 8,
                  padding: "7px 14px",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  color: "#fff",
                  fontFamily: "inherit",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <Icons.RotateCcw /> New
              </button>
            )}
            {step > 1 && step < 6 && (
              <button
                onClick={reset}
                style={{
                  background: "rgba(255,255,255,0.15)",
                  border: "1px solid rgba(255,255,255,0.3)",
                  borderRadius: 8,
                  padding: "7px 14px",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  color: "#fff",
                  fontFamily: "inherit",
                }}
              >
                ← Start Over
              </button>
            )}
          </div>
        </div>

        {/* ── Step indicator ── */}
        <div
          style={{
            background: "var(--card)",
            borderBottom: "1px solid var(--border)",
            padding: "10px 12px",
            display: "flex",
            alignItems: "center",
            gap: 0,
            borderRadius: 12,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              maxWidth: 600,
              margin: "0 auto",
              display: "flex",
              alignItems: "center",
              gap: 0,
              width: "100%",
            }}
          >
            {STEPS.map((label, i) => (
              <React.Fragment key={label}>
                <StepDotMobile
                  n={i + 1}
                  active={step === i + 1}
                  done={step > i + 1}
                  label={label}
                />
                {i < STEPS.length - 1 && <StepLine done={step > i + 1} />}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* ── Content ── */}
        <div style={S.cont}>
          {/* ════ STEP 1: Pet Info ════ */}
          {step === 1 && (
            <div
              className="ai-enter"
              style={{ display: "flex", flexDirection: "column", gap: 18 }}
            >
              <div
                style={{
                  background: "linear-gradient(135deg,#1a1a6e,#1e3a8a)",
                  borderRadius: 16,
                  padding: "20px 24px",
                  display: "flex",
                  gap: 14,
                  alignItems: "center",
                }}
              >
                <div style={{ color: "#fff", opacity: 0.9 }}>
                  <PetsIcon size={36} color="#fff" />
                </div>
                <div>
                  <h2
                    style={{
                      fontSize: 17,
                      fontWeight: 800,
                      color: "#fff",
                      margin: "0 0 4px",
                    }}
                  >
                    Tell us about your pet
                  </h2>
                  <p
                    style={{
                      fontSize: 12,
                      color: "rgba(255,255,255,0.75)",
                      margin: 0,
                    }}
                  >
                    Our AI will analyze symptoms and suggest the right care.
                  </p>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 14,
                }}
              >
                <div>
                  <label style={S.label}>Your Name *</label>
                  <input
                    value={form.ownerName}
                    onChange={(e) => set("ownerName", e.target.value)}
                    placeholder="Your full name"
                    style={S.inp}
                    readOnly={isCustomer}
                  />
                </div>
                <div>
                  <label style={S.label}>Contact Number</label>
                  <input
                    value={form.contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="09XXXXXXXXX"
                    inputMode="numeric"
                    maxLength={11}
                    style={S.inp}
                  />
                  {form.contact && form.contact.length !== 11 && (
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
                </div>
              </div>

              <div>
                <label style={S.label}>Pet's Name *</label>
                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  {[
                    { key: "new", label: "New Pet" },
                    { key: "existing", label: "Existing Pet" },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setPetMode(key);
                        if (key === "new") set("petName", "");
                      }}
                      style={{
                        padding: "6px 16px",
                        borderRadius: 8,
                        border: `1.5px solid ${petMode === key ? "#1e3a8a" : "var(--border, #e2e8f0)"}`,
                        background:
                          petMode === key ? "#1e3a8a" : "var(--card, #fff)",
                        color:
                          petMode === key ? "#fff" : "var(--text, #374151)",
                        fontFamily: "inherit",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {petMode === "existing" ? (
                  loadingExistingPatients ? (
                    <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>
                      Loading your pets…
                    </p>
                  ) : existingPatients.length === 0 ? (
                    <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>
                      No registered pets found yet. Switch to "New Pet" to enter
                      one.
                    </p>
                  ) : (
                    <CustomSelect
                      value={form.petName}
                      onChange={(val) => {
                        const sel = existingPatients.find(
                          (p) => p.name === val,
                        );
                        set("petName", sel?.name || "");
                        if (sel?.species && PET_TYPES.includes(sel.species))
                          set("petType", sel.species);
                      }}
                      placeholder="— Select a pet —"
                      accent="#1e3a8a"
                      options={existingPatients.map((p) => ({
                        value: p.name,
                        label: p.name + (p.species ? ` (${p.species})` : ""),
                      }))}
                    />
                  )
                ) : (
                  <input
                    value={form.petName}
                    onChange={(e) => set("petName", e.target.value)}
                    placeholder="e.g. Buddy, Luna, Mochi…"
                    style={S.inp}
                  />
                )}
              </div>

              <div>
                <label style={S.label}>Type of Pet *</label>{" "}
                <div style={{ display: "flex", gap: 8 }}>
                  {PET_TYPES.map((t) => {
                    const active = form.petType === t;
                    return (
                      <button
                        key={t}
                        className="chip-btn"
                        onClick={() => set("petType", t)}
                        style={{
                          flex: 1,
                          padding: "12px 14px",
                          borderRadius: 12,
                          fontFamily: "inherit",
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: "pointer",
                          border: `1.5px solid ${active ? "#1e3a8a" : "var(--border, #e2e8f0)"}`,
                          background: active ? "#1e3a8a" : "var(--card, #fff)",
                          color: active ? "#fff" : "var(--text, #374151)",
                          transition: "all 0.15s",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                        }}
                      >
                        {t === "Cat" ? (
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 16 16"
                            fill={active ? "#fff" : "var(--text, #374151)"}
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              fillRule="evenodd"
                              clipRule="evenodd"
                              d="M1 7L4.80061 1.43926C5.56059 0.527292 6.68638 0 7.8735 0H8V4L12 5L15 10L14.1875 11.2188C13.4456 12.3316 12.1967 13 10.8593 13H9L7 16H5L1 7ZM10 9C10.5523 9 11 8.55229 11 8C11 7.44772 10.5523 7 10 7C9.44771 7 9 7.44772 9 8C9 8.55229 9.44771 9 10 9Z"
                            />
                            <path d="M10 0.465878V2.43845L12 2.93845V0H11.8735C11.2125 0 10.5704 0.163501 10 0.465878Z" />
                          </svg>
                        ) : (
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 16 16"
                            fill={active ? "#fff" : "var(--text, #374151)"}
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              fillRule="evenodd"
                              clipRule="evenodd"
                              d="M16 4V7C16 9.20914 14.2091 11 12 11H10V15H0V13L0.931622 10.8706C1.25226 10.9549 1.59036 11 1.94124 11C3.74931 11 5.32536 9.76947 5.76388 8.01538L3.82359 7.53031C3.60766 8.39406 2.83158 9.00001 1.94124 9.00001C1.87789 9.00001 1.81539 8.99702 1.75385 8.99119C1.02587 8.92223 0.432187 8.45551 0.160283 7.83121C0.0791432 7.64491 0.0266588 7.44457 0.00781272 7.23658C-0.0112323 7.02639 0.00407892 6.80838 0.0588889 6.58914L0.698705 4.02986C1.14387 2.24919 2.7438 1 4.57928 1H10L12 4H16ZM9 6C9.55229 6 10 5.55228 10 5C10 4.44772 9.55229 4 9 4C8.44771 4 8 4.44772 8 5C8 5.55228 8.44771 6 9 6Z"
                            />
                          </svg>
                        )}
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label style={S.label}>Approximate Age *</label>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 6 }}
                >
                  {AGE_OPTIONS.map((a) => {
                    const active = form.petAge === a;
                    return (
                      <button
                        key={a}
                        className="chip-btn"
                        onClick={() => set("petAge", a)}
                        style={{
                          padding: "10px 14px",
                          borderRadius: 10,
                          fontFamily: "inherit",
                          fontSize: 13,
                          fontWeight: 500,
                          cursor: "pointer",
                          textAlign: "left",
                          border: `1.5px solid ${active ? "#1e3a8a" : "var(--border, #e2e8f0)"}`,
                          background: active ? "#e8edf8" : "var(--card, #fff)",
                          color: active ? "#1e3a8a" : "var(--text, #374151)",
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          transition: "all 0.15s",
                        }}
                      >
                        <span
                          style={{
                            width: 16,
                            height: 16,
                            borderRadius: "50%",
                            flexShrink: 0,
                            border: `2px solid ${active ? "#1e3a8a" : "var(--border, #d1d5db)"}`,
                            background: active ? "#1e3a8a" : "transparent",
                            transition: "all 0.15s",
                          }}
                        />
                        {a}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={() => setStep(2)}
                disabled={!canStep2 || !form.ownerName.trim()}
                style={{
                  padding: 14,
                  borderRadius: 12,
                  border: "none",
                  background:
                    canStep2 && form.ownerName.trim() ? "#1e3a8a" : "#e2e8f0",
                  color: canStep2 && form.ownerName.trim() ? "#fff" : "#94a3b8",
                  fontFamily: "inherit",
                  fontSize: 14,
                  fontWeight: 800,
                  cursor:
                    canStep2 && form.ownerName.trim()
                      ? "pointer"
                      : "not-allowed",
                  transition: "all 0.15s",
                }}
              >
                Continue to Symptoms →
              </button>
            </div>
          )}

          {/* ════ STEP 2: Symptoms ════ */}
          {step === 2 && (
            <div
              className="ai-enter"
              style={{ display: "flex", flexDirection: "column", gap: 18 }}
            >
              <div
                style={{
                  background: "linear-gradient(135deg,#1a1a6e,#1e3a8a)",
                  borderRadius: 16,
                  padding: "20px 24px",
                  display: "flex",
                  gap: 14,
                  alignItems: "center",
                }}
              >
                <div style={{ color: "#fff", opacity: 0.9 }}>
                  <StethoscopeIcon size={36} color="#fff" />
                </div>
                <div>
                  <h2
                    style={{
                      fontSize: 17,
                      fontWeight: 800,
                      color: "#fff",
                      margin: "0 0 4px",
                    }}
                  >
                    Describe {form.petName}'s symptoms
                  </h2>
                  <p
                    style={{
                      fontSize: 12,
                      color: "rgba(255,255,255,0.75)",
                      margin: 0,
                    }}
                  >
                    More detail = more accurate AI assessment.
                  </p>
                </div>
              </div>

              <div>
                <label style={S.label}>Quick select common symptoms</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {QUICK_SYMPTOMS.map((s) => {
                    const active = form.symptoms.includes(s);
                    return (
                      <button
                        key={s}
                        className="chip-btn"
                        onClick={() => {
                          const curr = form.symptoms;
                          set(
                            "symptoms",
                            active
                              ? curr
                                  .replace(s + ", ", "")
                                  .replace(", " + s, "")
                                  .replace(s, "")
                                  .trim()
                              : curr
                                ? curr + ", " + s
                                : s,
                          );
                        }}
                        style={{
                          padding: "6px 12px",
                          borderRadius: 20,
                          fontFamily: "inherit",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                          border: `1.5px solid ${active ? "#1e3a8a" : "#e2e8f0"}`,
                          background: active ? "#e8edf8" : "#fff",
                          color: active ? "#1e3a8a" : "#64748b",
                          transition: "all 0.15s",
                        }}
                      >
                        {active ? "✓ " : ""}
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label style={S.label}>Describe symptoms in detail *</label>
                <textarea
                  value={form.symptoms}
                  onChange={(e) => set("symptoms", e.target.value)}
                  placeholder={`e.g. ${form.petName} has been vomiting since this morning, refuses to eat, and seems very tired…`}
                  rows={5}
                  style={{ ...S.inp, resize: "vertical", lineHeight: 1.6 }}
                />
                <p
                  style={{
                    fontSize: 11,
                    color: "#94a3b8",
                    margin: "4px 0 0",
                    textAlign: "right",
                  }}
                >
                  {form.symptoms.length} characters{" "}
                  {form.symptoms.length > 0 &&
                    form.symptoms.length < 10 &&
                    "— please add more detail"}
                </p>
              </div>

              <div>
                <label style={S.label}>
                  Additional notes{" "}
                  <span
                    style={{
                      fontSize: 11,
                      color: "#94a3b8",
                      fontWeight: 400,
                      textTransform: "none",
                    }}
                  >
                    (optional)
                  </span>
                </label>
                <textarea
                  value={form.additionalNotes}
                  onChange={(e) => set("additionalNotes", e.target.value)}
                  placeholder="Recent diet changes, medications, when symptoms started, known allergies…"
                  rows={3}
                  style={{
                    ...S.inp,
                    resize: "vertical",
                    fontSize: 13,
                    lineHeight: 1.6,
                  }}
                />
              </div>

              <div
                style={{
                  background: "rgba(217,119,6,0.12)",
                  border: "1px solid rgba(217,119,6,0.35)",
                  borderRadius: 10,
                  padding: "12px 14px",
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                }}
              >
                <span style={{ color: "#d97706", flexShrink: 0, marginTop: 1 }}>
                  <Icons.AlertTriangle />
                </span>
                <p
                  style={{
                    fontSize: 11,
                    color: "#d97706",
                    margin: 0,
                    lineHeight: 1.6,
                  }}
                >
                  <strong>Disclaimer:</strong> This AI assessment is for
                  informational purposes only and does not replace professional
                  veterinary diagnosis. For life-threatening emergencies, please
                  visit our clinic immediately.
                </p>
              </div>

              {error && (
                <div
                  style={{
                    background: "#fef2f2",
                    border: "1px solid #fca5a5",
                    borderRadius: 10,
                    padding: "12px 14px",
                    fontSize: 13,
                    color: "#dc2626",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Icons.AlertTriangle /> {error}
                </div>
              )}

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => setStep(1)}
                  style={{
                    padding: "13px 20px",
                    borderRadius: 12,
                    border: "1.5px solid var(--border)",
                    background: "var(--bg)",
                    fontFamily: "inherit",
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: "pointer",
                    color: "var(--muted)",
                  }}
                >
                  ← Back
                </button>
                <button
                  onClick={analyzeSymptoms}
                  disabled={!canSubmit}
                  style={{
                    flex: 1,
                    padding: 13,
                    borderRadius: 12,
                    border: "none",
                    background: canSubmit ? "#1e3a8a" : "#e2e8f0",
                    color: canSubmit ? "#fff" : "#94a3b8",
                    fontFamily: "inherit",
                    fontSize: 14,
                    fontWeight: 800,
                    cursor: canSubmit ? "pointer" : "not-allowed",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    transition: "all 0.15s",
                  }}
                >
                  <StethoscopeIcon
                    size={16}
                    color={canSubmit ? "#fff" : "#94a3b8"}
                  />{" "}
                  Analyze with Gemini AI
                </button>
              </div>
            </div>
          )}

          {/* ════ STEP 3: Assessing ════ */}
          {step === 3 && (
            <div
              className="ai-enter"
              style={{ ...S.card, textAlign: "center", padding: "48px 24px" }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg,#ede9fe,#dbeafe)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                  animation: "pulse 1.5s infinite",
                }}
              >
                <AIIcon size={30} color="#1e3a8a" />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
                Analyzing symptoms...
              </h3>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--muted)",
                  marginBottom: 20,
                }}
              >
                Gemini is reviewing the symptoms for{" "}
                <strong>{form.petName}</strong>
              </p>
              <TypingDots />
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  justifyContent: "center",
                  marginTop: 16,
                }}
              >
                {[
                  "Checking possible conditions",
                  "Determining urgency level",
                  "Recommending service",
                  "Generating summary",
                ].map((t, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: 11,
                      padding: "3px 10px",
                      borderRadius: 99,
                      background: "var(--bg)",
                      color: "var(--muted)",
                      animation: `pulse 1.5s ${i * 0.3}s infinite`,
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ════ STEP 4: Assessment Result ════ */}
          {step === 4 && assessment && urgency && (
            <div
              className="ai-enter"
              style={{ display: "flex", flexDirection: "column", gap: 16 }}
            >
              {/* Urgency banner */}
              <div
                style={{
                  background: urgency.bg,
                  border: `2px solid ${urgency.border}`,
                  borderRadius: 16,
                  padding: "18px 20px",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                <UrgencyIcon urgency={assessment.urgency} />
                <div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 800,
                      color: urgency.color,
                      marginBottom: 3,
                    }}
                  >
                    {urgency.label}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: urgency.color,
                      opacity: 0.85,
                      lineHeight: 1.5,
                    }}
                  >
                    {assessment.urgencyReason}
                  </div>
                </div>
              </div>

              {/* Pet row */}
              <div
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: "14px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div style={{ color: "#1e3a8a" }}>
                  <PetsIcon size={24} color="#1e3a8a" />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 800,
                      color: "var(--text)",
                    }}
                  >
                    {form.petName} · {form.petType} · {form.petAge}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--muted)",
                      marginTop: 2,
                    }}
                  >
                    Assessment complete · Owner: {form.ownerName}
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: 16,
                }}
              >
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: "var(--muted)",
                    textTransform: "uppercase",
                    letterSpacing: 0.8,
                    margin: "0 0 10px",
                  }}
                >
                  AI Summary
                </p>
                <p
                  style={{
                    fontSize: 14,
                    color: "var(--text)",
                    lineHeight: 1.7,
                    margin: 0,
                  }}
                >
                  {assessment.summary}
                </p>
              </div>

              {/* Conditions + Service */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    padding: "14px 16px",
                  }}
                >
                  <p
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: "var(--muted)",
                      textTransform: "uppercase",
                      letterSpacing: 0.8,
                      margin: "0 0 10px",
                    }}
                  >
                    Possible Conditions
                  </p>
                  {assessment.conditions?.map((c, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 8,
                        marginBottom: 6,
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: "#1e3a8a",
                          flexShrink: 0,
                          marginTop: 6,
                        }}
                      />
                      <span
                        style={{
                          fontSize: 12,
                          color: "var(--text)",
                          lineHeight: 1.5,
                        }}
                      >
                        {c}
                      </span>
                    </div>
                  ))}
                  <p
                    style={{
                      fontSize: 10,
                      color: "#94a3b8",
                      margin: "8px 0 0",
                    }}
                  >
                    Not a diagnosis — consult a vet.
                  </p>
                </div>
                <div
                  style={{
                    background: "rgba(37,99,235,0.12)",
                    border: "1px solid rgba(37,99,235,0.35)",
                    borderRadius: 12,
                    padding: "14px 16px",
                  }}
                >
                  <p
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: "var(--royal, #2563eb)",
                      textTransform: "uppercase",
                      letterSpacing: 0.8,
                      margin: "0 0 10px",
                    }}
                  >
                    Recommended Service
                  </p>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 800,
                      color: "var(--royal, #2563eb)",
                      marginBottom: 6,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <StethoscopeIcon size={16} color="var(--royal, #2563eb)" />{" "}
                    {assessment.recommendedService}
                  </div>
                  <p
                    style={{
                      fontSize: 11,
                      color: "var(--royal, #2563eb)",
                      margin: 0,
                      lineHeight: 1.5,
                    }}
                  >
                    Best match for {form.petName}'s symptoms.
                  </p>
                </div>
              </div>

              {/* Warning signs */}
              {assessment.warningSigns?.length > 0 && (
                <div
                  style={{
                    background: "rgba(234,88,12,0.12)",
                    border: "1px solid rgba(234,88,12,0.35)",
                    borderRadius: 12,
                    padding: "14px 16px",
                  }}
                >
                  <p
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: "#ea580c",
                      textTransform: "uppercase",
                      letterSpacing: 0.8,
                      margin: "0 0 10px",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Icons.Zap /> Watch for these warning signs
                  </p>
                  {assessment.warningSigns.map((w, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        gap: 8,
                        alignItems: "flex-start",
                        marginBottom: 6,
                      }}
                    >
                      <span
                        style={{
                          color: "#ea580c",
                          fontSize: 12,
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        !
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          color: "var(--text)",
                          lineHeight: 1.5,
                        }}
                      >
                        {w}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Home care tips */}
              {["Low", "Moderate"].includes(assessment.urgency) &&
                assessment.homeCareTips?.length > 0 && (
                  <div
                    style={{
                      background: "rgba(22,163,74,0.12)",
                      border: "1px solid rgba(22,163,74,0.35)",
                      borderRadius: 12,
                      padding: "14px 16px",
                    }}
                  >
                    <p
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        color: "#16a34a",
                        textTransform: "uppercase",
                        letterSpacing: 0.8,
                        margin: "0 0 10px",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <Icons.Home /> Home care tips in the meantime
                    </p>
                    {assessment.homeCareTips.map((t, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          gap: 8,
                          alignItems: "flex-start",
                          marginBottom: 6,
                        }}
                      >
                        <span style={{ color: "#16a34a", flexShrink: 0 }}>
                          <Icons.CheckCircle />
                        </span>
                        <span
                          style={{
                            fontSize: 12,
                            color: "var(--text)",
                            lineHeight: 1.5,
                          }}
                        >
                          {t}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

              {/* ── Follow-up Chat Toggle ── */}
              {!showChat && (
                <div
                  style={{
                    background: "rgba(37,99,235,0.10)",
                    border: "1.5px solid rgba(37,99,235,0.3)",
                    borderRadius: 14,
                    padding: "16px 20px",
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                  }}
                >
                  <span
                    style={{ color: "var(--royal, #2563eb)", flexShrink: 0 }}
                  >
                    <Icons.MessageCircle />
                  </span>
                  <div style={{ flex: 1 }}>
                    <p
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "var(--royal, #2563eb)",
                        margin: "0 0 3px",
                      }}
                    >
                      Have questions about this assessment?
                    </p>
                    <p
                      style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}
                    >
                      Ask Gemini AI anything about {form.petName}'s condition
                      before booking.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowChat(true)}
                    style={{
                      padding: "8px 16px",
                      borderRadius: 10,
                      border: "none",
                      background: "#1e3a8a",
                      color: "#fff",
                      fontFamily: "inherit",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      flexShrink: 0,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Ask Questions
                  </button>
                </div>
              )}

              {/* ── Follow-up Chat (fullscreen) ── */}
              {showChat && (
                <div
                  style={{
                    position: "fixed",
                    inset: 0,
                    zIndex: 99999,
                    background: "var(--bg)",
                    display: "flex",
                    flexDirection: "column",
                  }}
                  className="ai-enter"
                >
                  <button
                    onClick={() => setShowChat(false)}
                    aria-label="Close chat"
                    style={{
                      position: "absolute",
                      top: 14,
                      right: 14,
                      zIndex: 2,
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      border: "1px solid var(--border)",
                      background: "var(--card)",
                      color: "var(--text)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
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
                  <div
                    style={{
                      flex: 1,
                      minHeight: 0,
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "16px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <div
                      style={{
                        width: "100%",
                        maxWidth: 900,
                        height: "100%",
                        maxHeight: 800,
                        margin: "0 auto",
                      }}
                    >
                      <FollowUpChat
                        assessment={assessment}
                        petName={form.petName}
                        petType={form.petType}
                        petAge={form.petAge}
                        symptoms={form.symptoms}
                        onProceedToBook={() => {
                          setShowChat(false);
                          setStep(5);
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={reset}
                  style={{
                    padding: "12px 20px",
                    borderRadius: 12,
                    border: "1.5px solid var(--border)",
                    background: "var(--bg)",
                    fontFamily: "inherit",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    color: "var(--muted)",
                  }}
                >
                  Start Over
                </button>
                {!showChat && (
                  <button
                    onClick={() => setStep(5)}
                    style={{
                      flex: 1,
                      padding: 14,
                      borderRadius: 12,
                      border: "none",
                      background: "linear-gradient(135deg,#1a1a6e,#1e3a8a)",
                      color: "#fff",
                      fontFamily: "inherit",
                      fontSize: 14,
                      fontWeight: 800,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                    }}
                  >
                    <Icons.Calendar /> Book Appointment →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ════ STEP 5: Booking ════ */}
          {step === 5 && assessment && (
            <div
              className="ai-enter"
              style={{ display: "flex", flexDirection: "column", gap: 16 }}
            >
              <div style={S.card}>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
                  Confirm Appointment Details
                </h3>
                <p style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>
                  AI has pre-filled the form. Review and confirm.
                </p>

                <div
                  style={{
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    padding: 14,
                    marginBottom: 16,
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 4,
                  }}
                >
                  {[
                    ["Patient", form.petName],
                    ["Owner", form.ownerName],
                    ["Contact", form.contact || "—"],
                    ["Service", assessment.recommendedService],
                    ["Urgency", assessment.urgency],
                  ].map(([l, v]) => (
                    <div
                      key={l}
                      style={{
                        padding: "6px 0",
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          color: "var(--muted)",
                          fontWeight: 700,
                        }}
                      >
                        {l}:{" "}
                      </span>
                      <span style={{ fontSize: 13, color: "var(--text)" }}>
                        {v}
                      </span>
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 14,
                    marginBottom: 14,
                  }}
                >
                  {assessment.recommendedService !== "Grooming" && (
                    <div>
                      <label style={S.label}>Veterinarian</label>
                      <CustomSelect
                        value={form.vet}
                        onChange={(val) => set("vet", val)}
                        placeholder="Select Vet (optional)"
                        accent="#1e3a8a"
                        options={vets}
                      />
                      {form.vet &&
                        form.date &&
                        !isVetAvailableOnDate(form.vet, form.date) && (
                          <p
                            style={{
                              fontSize: 11,
                              color: "#dc2626",
                              margin: "4px 0 0",
                            }}
                          >
                            {form.vet} isn't available this day. Available:{" "}
                            {(vetSchedule[form.vet] || [])
                              .map((d) => DAY_NAMES[d])
                              .join(", ") || "—"}
                          </p>
                        )}
                    </div>
                  )}
                  <div>
                    <label style={S.label}>Date *</label>
                    <DatePicker
                      value={form.date}
                      min={TODAY}
                      onChange={(val) => set("date", val)}
                      placeholder="Select date"
                    />
                  </div>
                  <div>
                    <label style={S.label}>Time *</label>
                    <CustomSelect
                      value={form.time}
                      onChange={(val) => set("time", val)}
                      placeholder="Select Time"
                      accent="#1e3a8a"
                      options={TIMES.map((t) => {
                        const vetTimeBlocked =
                          form.vet && !isVetAvailableAtTime(form.vet, t);
                        const taken = !vetTimeBlocked && takenSlots.includes(t);
                        return {
                          value: t,
                          label:
                            t +
                            (vetTimeBlocked
                              ? " — Not this vet's hours"
                              : taken
                                ? " — Taken"
                                : ""),
                          disabled: vetTimeBlocked || taken,
                        };
                      })}
                    />
                  </div>
                  <div>
                    <label style={S.label}>Additional Notes</label>
                    <textarea
                      value={form.notes}
                      onChange={(e) => set("notes", e.target.value)}
                      rows={3}
                      style={{ ...S.inp, resize: "vertical" }}
                    />
                  </div>
                </div>

                <div
                  style={{
                    background: "rgba(217,119,6,0.12)",
                    border: "1px solid rgba(217,119,6,0.35)",
                    borderRadius: 8,
                    padding: "10px 14px",
                    fontSize: 12,
                    color: "#d97706",
                    marginBottom: 14,
                    display: "flex",
                    gap: 8,
                  }}
                >
                  <span style={{ flexShrink: 0 }}>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ width: 14, height: 14 }}
                    >
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  </span>
                  <span>
                    {isAdmin
                      ? "Appointment will be Confirmed immediately."
                      : "Appointment will be Pending until approved by staff."}
                  </span>
                </div>

                {error && (
                  <div
                    style={{
                      background: "#fef2f2",
                      border: "1px solid #fca5a5",
                      borderRadius: 8,
                      padding: "10px 14px",
                      fontSize: 13,
                      color: "#dc2626",
                      marginBottom: 14,
                    }}
                  >
                    {error}
                  </div>
                )}

                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={() => setStep(4)}
                    style={{
                      padding: "12px 20px",
                      borderRadius: 12,
                      border: "1.5px solid var(--border)",
                      background: "var(--bg)",
                      fontFamily: "inherit",
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                      color: "var(--muted)",
                    }}
                  >
                    ← Back
                  </button>
                  <button
                    onClick={bookAppointment}
                    disabled={saving || !form.date || !form.time}
                    style={{
                      flex: 1,
                      padding: 13,
                      borderRadius: 12,
                      border: "none",
                      background:
                        saving || !form.date || !form.time
                          ? "#e2e8f0"
                          : "linear-gradient(135deg,#1a1a6e,#1e3a8a)",
                      color:
                        saving || !form.date || !form.time ? "#94a3b8" : "#fff",
                      fontFamily: "inherit",
                      fontSize: 14,
                      fontWeight: 800,
                      cursor:
                        saving || !form.date || !form.time
                          ? "not-allowed"
                          : "pointer",
                    }}
                  >
                    {saving
                      ? "Saving…"
                      : isAdmin
                        ? "✓ Confirm Appointment"
                        : "Submit Appointment Request"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ════ STEP 6: Done ════ */}
          {step === 6 && saved && (
            <div
              className="ai-enter"
              style={{ ...S.card, textAlign: "center", padding: "48px 24px" }}
            >
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg,#f0fdf4,#dcfce7)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                  border: "2px solid #bbf7d0",
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#16a34a"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ width: 36, height: 36 }}
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h3
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  marginBottom: 8,
                  color: "#14532d",
                }}
              >
                {isAdmin ? "Appointment Confirmed!" : "Request Submitted!"}
              </h3>
              <p
                style={{
                  fontSize: 14,
                  color: "#64748b",
                  marginBottom: 20,
                  lineHeight: 1.6,
                }}
              >
                {isAdmin
                  ? `${form.petName}'s appointment has been confirmed for ${saved.date} at ${saved.time}.`
                  : `${form.petName}'s request has been submitted for ${saved.date} at ${saved.time}. Our staff will review and confirm shortly.`}
              </p>
              <div
                style={{
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 20,
                  display: "inline-block",
                  textAlign: "left",
                  minWidth: 280,
                }}
              >
                {[
                  ["Pet", form.petName],
                  ["Service", assessment?.recommendedService],
                  ["Date", saved.date],
                  ["Time", saved.time],
                  ["Status", saved.status],
                ].map(([l, v]) => (
                  <div
                    key={l}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "6px 0",
                      borderBottom: "1px solid #bbf7d0",
                      fontSize: 13,
                    }}
                  >
                    <span style={{ color: "#64748b", fontWeight: 600 }}>
                      {l}
                    </span>
                    <span style={{ fontWeight: 700, color: "#14532d" }}>
                      {v}
                    </span>
                  </div>
                ))}
              </div>
              <div
                style={{ display: "flex", gap: 10, justifyContent: "center" }}
              >
                <button
                  onClick={() => navigate("/customer/appointments")}
                  style={{
                    padding: "12px 20px",
                    borderRadius: 12,
                    border: "1.5px solid var(--border)",
                    background: "var(--bg)",
                    fontFamily: "inherit",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    color: "var(--royal, #2563eb)",
                  }}
                >
                  View Appointments
                </button>
                <button
                  onClick={reset}
                  style={{
                    padding: "12px 20px",
                    borderRadius: 12,
                    border: "none",
                    background: "linear-gradient(135deg,#1a1a6e,#1e3a8a)",
                    color: "#fff",
                    fontFamily: "inherit",
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  + New Assessment
                </button>
              </div>
            </div>
          )}

          {/* ── Session history ── */}
          {history.length > 0 && step !== 3 && (
            <div style={{ ...S.card, marginTop: 8 }}>
              <h3
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  marginBottom: 12,
                  color: "var(--muted)",
                }}
              >
                This Session — Previous Assessments
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {history.map((h, i) => {
                  const uc =
                    URGENCY_CONFIG[h.urgency] || URGENCY_CONFIG.Moderate;
                  return (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "10px 14px",
                        background: "var(--bg)",
                        borderRadius: 8,
                        border: "1px solid var(--border)",
                      }}
                    >
                      {" "}
                      <PetsIcon size={18} color="#1e3a8a" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 13,
                            fontWeight: 600,
                            color: "var(--text)",
                          }}
                        >
                          {h.pet} — {h.service}
                        </p>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 11,
                            color: "var(--muted)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {h.symptoms}
                        </p>
                      </div>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 99,
                          background: uc.color,
                          color: "#fff",
                          flexShrink: 0,
                        }}
                      >
                        {uc.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default CustomerAIChat;
