// src/pages/PredictiveAnalytics.jsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import ReactDOM from "react-dom";
import Layout from "../../components/layout";
import { supabase } from "../../js/Utils/supabase";
import { useCurrentUser } from "../../js/hooks/Usecurrentuser";
import { logActivity } from "../../js/Utils/logActivity";
import "../../styles/PredictiveAnalytics.css";

/* ── palette ── */
const C = {
  indigo: "#4f46e5",
  teal: "#0d9488",
  amber: "#d97706",
  rose: "#e11d48",
  sky: "#0284c7",
  emerald: "#059669",
  violet: "#7c3aed",
  slate: "#475569",
};

/* ── tiny helpers ── */
const today = new Date();
const isoDate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;

const addDays = (d, n) => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};

const MONTHS = [
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
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/* ── Custom branch dropdown (matches Appointments.jsx) ── */
const CustomSelect = ({
  value,
  onChange,
  options,
  placeholder = "—",
  accent = "#6366f1",
  searchable = false,
}) => {
  const [open, setOpen] = React.useState(false);
  const [dropPos, setDropPos] = React.useState({ top: 0, left: 0, width: 0 });
  const [searchTerm, setSearchTerm] = React.useState("");
  const triggerRef = React.useRef(null);
  const ref = React.useRef(null);
  const selected = options.find((o) => (o.value ?? o) === value);
  const label = selected ? (selected.label ?? selected) : placeholder;
  const filteredOptions =
    searchable && searchTerm
      ? options.filter((o) =>
          String(o.label ?? o)
            .toLowerCase()
            .includes(searchTerm.toLowerCase()),
        )
      : options;

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
    if (!open) setSearchTerm("");
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
              maxHeight: 300,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {searchable && (
              <div
                style={{
                  padding: "6px 6px 4px",
                  borderBottom: "1px solid #f1f5f9",
                  flexShrink: 0,
                }}
              >
                <input
                  autoFocus
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="Search…"
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    borderRadius: 8,
                    border: "1.5px solid #e2e8f0",
                    fontSize: 13,
                    outline: "none",
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                    color: "var(--text)",
                    background: "var(--card)",
                  }}
                />
              </div>
            )}
            <div style={{ overflowY: "auto", padding: "5px" }}>
              {[{ value: "", label: placeholder }, ...filteredOptions].map(
                (opt, i) => {
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
                              transition:
                                "background 0.15s, border-color 0.15s",
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
                    </div>
                  );
                },
              )}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div
        ref={triggerRef}
        onClick={handleOpen}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          padding: "8px 12px",
          borderRadius: 10,
          border: `1.5px solid ${open ? accent : "#e2e8f0"}`,
          background: "var(--card)",
          cursor: "pointer",
          fontSize: 13,
          fontWeight: 600,
          color: value ? "var(--text)" : "#94a3b8",
          userSelect: "none",
        }}
      >
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke={accent}
          strokeWidth="3"
          strokeLinecap="round"
          style={{
            flexShrink: 0,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.15s",
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
      {portal}
    </>
  );
};

/* ────────────────────────────────────────────
   MINI SPARKLINE — pure SVG, zero deps
──────────────────────────────────────────── */
const Sparkline = ({ data = [], color = C.indigo, h = 40, filled = true }) => {
  if (!data.length) return null;
  const w = 120;
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * w,
    h - (v / max) * (h - 4) - 2,
  ]);
  const path = pts
    .map(
      (p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`,
    )
    .join(" ");
  const fill = filled ? `${path} L${w},${h} L0,${h} Z` : path;

  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      {filled && (
        <defs>
          <linearGradient
            id={`sg-${color.replace("#", "")}`}
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0.03} />
          </linearGradient>
        </defs>
      )}
      {filled && <path d={fill} fill={`url(#sg-${color.replace("#", "")})`} />}
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

/* ── Horizontal bar ── */
const HBar = ({ label, value, max, color, sublabel }) => (
  <div style={{ marginBottom: 12 }}>
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        marginBottom: 4,
      }}
    >
      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>
        {label}
      </span>
      <span style={{ fontSize: 12, fontWeight: 700, color }}>
        {value}
        {sublabel ? ` ${sublabel}` : ""}
      </span>
    </div>
    <div
      style={{
        height: 6,
        borderRadius: 99,
        background: "#f1f5f9",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: "100%",
          borderRadius: 99,
          width: `${Math.min(100, (value / max) * 100)}%`,
          background: color,
          transition: "width 0.8s cubic-bezier(0.34,1.56,0.64,1)",
        }}
      />
    </div>
  </div>
);

const Skel = ({ w = "100%", h = 16, style = {} }) => (
  <span
    className="pa-skel"
    style={{ display: "block", width: w, height: h, borderRadius: 8, ...style }}
  />
);

/* ── Insight card ── */
const InsightCard = ({
  icon,
  title,
  body,
  color,
  action,
  active,
  onAction,
}) => (
  <div
    style={{
      background: "var(--card)",
      borderRadius: 14,
      border: `1px solid ${active ? color : `${color}30`}`,
      padding: "16px 18px",
      display: "flex",
      gap: 14,
      alignItems: "flex-start",
      boxShadow: `0 4px 20px ${color}12`,
    }}
  >
    <div
      style={{
        width: 38,
        height: 38,
        borderRadius: 10,
        background: `${color}15`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        color,
      }}
    >
      {icon}
    </div>
    <div style={{ flex: 1 }}>
      <p
        style={{
          margin: "0 0 4px",
          fontSize: 13,
          fontWeight: 700,
          color: "var(--text)",
        }}
      >
        {title}
      </p>
      <p
        style={{
          margin: "0 0 8px",
          fontSize: 12,
          color: "var(--muted)",
          lineHeight: 1.5,
        }}
      >
        {body}
      </p>
      {action && (
        <button
          onClick={onAction}
          style={{
            fontSize: 11,
            fontWeight: 700,
            color,
            borderRadius: 20,
            background: active ? `${color}28` : `${color}15`,
            padding: "3px 10px",
            border: "none",
            cursor: "pointer",
            fontFamily: "inherit",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          {action}
          {active ? " ▲" : ""}
        </button>
      )}
    </div>
  </div>
);

/* ── Rule-based suggestions per insight type ── */
const genSuggestions = (type, ctx) => {
  switch (type) {
    case "peakDay":
      return [
        `Schedule 1–2 extra staff/vets on ${ctx.dayLabel}s.`,
        `Open extra appointment slots on ${ctx.dayLabel}s if capacity allows.`,
        `Consider light-duty or admin tasks on the slowest day to rebalance staff hours.`,
      ];
    case "rushHour":
      return [
        `Assign an extra tech or vet during the ${ctx.hourLabel} slot.`,
        `Cap new walk-in acceptance around ${ctx.hourLabel} to avoid overbooking.`,
        `Prepare exam rooms and supplies ahead of ${ctx.hourLabel} each day.`,
      ];
    case "criticalStock":
      return ctx.items.map(
        (i) =>
          `Reorder "${i.name}" — ${i.stock} left (reorder level ${i.reorder_level ?? "N/A"}).`,
      );
    case "topService":
      return [
        `Ensure at least one vet trained in ${ctx.purpose} is on duty daily.`,
        `Stock supplies for ${ctx.purpose} ahead of demand.`,
        `Consider a dedicated ${ctx.purpose} time block to speed up throughput.`,
      ];
    case "growth":
      return [
        `Open 1–2 more appointment slots per week to match the +${ctx.growth}% patient growth.`,
        `Review vet/staff capacity against the growth trend for next month.`,
      ];
    default:
      return [];
  }
};

/* ── Section header ── */
const SectionHeader = ({ icon, title, subtitle }) => (
  <div style={{ marginBottom: 18 }}>
    <div
      style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}
    >
      <span style={{ display: "flex", alignItems: "center", color: "#4f46e5" }}>
        {icon}
      </span>
      <h2
        style={{
          margin: 0,
          fontSize: 16,
          fontWeight: 800,
          color: "var(--text)",
        }}
      >
        {title}
      </h2>
    </div>
    {subtitle && (
      <p style={{ margin: 0, fontSize: 12, color: "#94a3b8", paddingLeft: 26 }}>
        {subtitle}
      </p>
    )}
  </div>
);

/* ── Mini calendar heatmap ── */
const CalHeatmap = ({ data = {} }) => {
  const cells = Array.from({ length: 28 }, (_, i) => {
    const d = addDays(today, i - 20);
    const key = isoDate(d);
    const v = data[key] || 0;
    return { key, v, d };
  });
  const max = Math.max(...cells.map((c) => c.v), 1);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
      {cells.map(({ key, v, d }) => {
        const intensity = v / max;
        return (
          <div
            key={key}
            title={`${isoDate(d)}: ${v} visits`}
            style={{
              width: 18,
              height: 18,
              borderRadius: 3,
              background:
                v === 0
                  ? "#f1f5f9"
                  : `rgba(79,70,229,${0.15 + intensity * 0.85})`,
              cursor: "default",
            }}
          />
        );
      })}
    </div>
  );
};

/* ── Vertical bar chart ── */
const BarChart = ({ labels, values, color = C.indigo, height = 120 }) => {
  const max = Math.max(...values, 1);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: 6,
        height,
        paddingTop: 8,
      }}
    >
      {labels.map((lbl, i) => (
        <div
          key={lbl}
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
          }}
        >
          <span style={{ fontSize: 10, fontWeight: 700, color }}>
            {values[i] > 0 ? values[i] : ""}
          </span>
          <div
            style={{
              width: "100%",
              borderRadius: "4px 4px 0 0",
              height: `${(values[i] / max) * (height - 24)}px`,
              background: color,
              opacity: 0.75 + (values[i] / max) * 0.25,
              minHeight: values[i] > 0 ? 4 : 0,
              transition: "height 0.6s cubic-bezier(0.34,1.56,0.64,1)",
            }}
          />
          <span
            style={{
              fontSize: 9,
              color: "#94a3b8",
              fontWeight: 600,
              textAlign: "center",
            }}
          >
            {lbl}
          </span>
        </div>
      ))}
    </div>
  );
};

/* ────────────────────────────────────────────
   MAIN PAGE
──────────────────────────────────────────── */
const PredictiveAnalytics = () => {
  const {
    user,
    isAdmin,
    isEmployee,
    seeAllBranches,
    loading: userLoading,
  } = useCurrentUser();

  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("visits");
  const [openInsight, setOpenInsight] = useState(null);
  const [branches, setBranches] = useState([]);
  const [branchFilter, setBranchFilter] = useState("");

  /* raw data */
  const [appts, setAppts] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [walkins, setWalkins] = useState([]);
  const [patients, setPatients] = useState([]);
  const [transactions, setTransactions] = useState([]);

  /* computed analytics */
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    if (seeAllBranches)
      supabase
        .from("branches")
        .select("id,name")
        .order("name")
        .then(({ data }) => setBranches(data || []));
  }, [seeAllBranches]);

  /* ── fetch ── */
  useEffect(() => {
    if (userLoading || !user) return;
    logActivity(
      user,
      "Viewed predictive analytics",
      "Opened analytics dashboard",
    );
    const run = async () => {
      setLoading(true);

      const since90 = isoDate(addDays(today, -90));

      let apptQ = supabase
        .from("appointments")
        .select("*")
        .gte("date", since90)
        .order("date");
      let wiQ = supabase.from("walkins").select("*").gte("arrived_at", since90);
      let invQ = supabase.from("inventory").select("*");
      let patQ = supabase
        .from("patients")
        .select("*")
        .gte("created_at", since90);
      let txnQ = supabase
        .from("transactions")
        .select("*")
        .gte("created_at", since90);

      if (!seeAllBranches && user.branchId) {
        apptQ = apptQ.eq("branch_id", user.branchId);
        wiQ = wiQ.eq("branch_id", user.branchId);
        invQ = invQ.eq("branch_id", user.branchId);
        patQ = patQ.eq("branch_id", user.branchId);
        txnQ = txnQ.eq("branch_id", user.branchId);
      }
      if (seeAllBranches && branchFilter) {
        apptQ = apptQ.eq("branch_id", branchFilter);
        wiQ = wiQ.eq("branch_id", branchFilter);
        invQ = invQ.eq("branch_id", branchFilter);
        patQ = patQ.eq("branch_id", branchFilter);
        txnQ = txnQ.eq("branch_id", branchFilter);
      }

      const [a, w, inv, p, tx] = await Promise.all([
        apptQ,
        wiQ,
        invQ,
        patQ,
        txnQ,
      ]);

      setAppts(a.data || []);
      setWalkins(w.data || []);
      setInventory(inv.data || []);
      setPatients(p.data || []);
      setTransactions(tx.data || []);
      setLoading(false);
    };
    run();
  }, [user, seeAllBranches, branchFilter, userLoading]);

  /* ── compute analytics whenever data arrives ── */
  useEffect(() => {
    if (loading) return;

    /* --- visits by day-of-week --- */
    const dowAppt = Array(7).fill(0);
    appts.forEach((a) => {
      const d = new Date(a.date);
      if (!isNaN(d)) dowAppt[d.getDay()]++;
    });
    walkins.forEach((w) => {
      const d = new Date(w.arrived_at);
      if (!isNaN(d)) dowAppt[d.getDay()]++;
    });

    /* --- visits by hour --- */
    const hourBuckets = Array(8).fill(0); // 8am–4pm
    const HOUR_LABELS = [
      "8AM",
      "9AM",
      "10AM",
      "11AM",
      "1PM",
      "2PM",
      "3PM",
      "4PM",
    ];
    const HOUR_MAP = {
      "08:00 AM": 0,
      "09:00 AM": 1,
      "10:00 AM": 2,
      "11:00 AM": 3,
      "01:00 PM": 4,
      "02:00 PM": 5,
      "03:00 PM": 6,
      "04:00 PM": 7,
    };
    appts.forEach((a) => {
      const idx = HOUR_MAP[a.time];
      if (idx !== undefined) hourBuckets[idx]++;
    });

    /* --- visits by month (last 3 months) --- */
    const monthVisits = [0, 0, 0];
    const monthLabels = [-2, -1, 0].map((o) => {
      const d = new Date(today.getFullYear(), today.getMonth() + o, 1);
      return MONTHS[d.getMonth()];
    });
    appts.forEach((a) => {
      const d = new Date(a.date);
      const diff =
        (today.getFullYear() - d.getFullYear()) * 12 +
        (today.getMonth() - d.getMonth());
      if (diff >= 0 && diff <= 2) monthVisits[2 - diff]++;
    });

    /* --- purpose distribution --- */
    const ALL_SERVICES = [
      "Consultation",
      "Vaccination",
      "Deworming",
      "Imaging",
      "Diagnostics",
      "Grooming",
    ];
    const purposeCounts = {};
    ALL_SERVICES.forEach((s) => {
      purposeCounts[s] = 0;
    });
    appts.forEach((a) => {
      if (!ALL_SERVICES.includes(a.purpose)) return;
      purposeCounts[a.purpose] = (purposeCounts[a.purpose] || 0) + 1;
    });
    const topPurposes = Object.entries(purposeCounts).sort(
      (a, b) => b[1] - a[1],
    );
    const purposeTotal = Object.values(purposeCounts).reduce(
      (s, n) => s + n,
      0,
    );

    /* --- heatmap data (date → count) --- */
    const heatData = {};
    appts.forEach((a) => {
      heatData[a.date] = (heatData[a.date] || 0) + 1;
    });
    walkins.forEach((w) => {
      const d = isoDate(new Date(w.arrived_at));
      heatData[d] = (heatData[d] || 0) + 1;
    });

    /* --- low stock items --- */
    const invQty = (i) => Number(i.stock ?? i.qty ?? 0);
    const invReorder = (i) => Number(i.reorder_level ?? i.threshold ?? 10);
    const invNorm = (inventory || []).map((i) => ({
      ...i,
      stock: invQty(i),
      reorder_level: invReorder(i),
    }));
    const lowStock = invNorm
      .filter((i) => i.stock <= i.reorder_level * 1.5)
      .sort(
        (a, b) =>
          a.stock / (a.reorder_level || 1) - b.stock / (b.reorder_level || 1),
      )
      .slice(0, 6);

    /* --- real sales velocity from POS transactions (last 90 days) --- */
    const DAYS_WINDOW = 90;
    const unitsSoldById = {};
    (transactions || []).forEach((t) => {
      if (t.voided_at) return; // skip voided sales
      if (t.status && t.status !== "Active") return;
      const items = Array.isArray(t.items) ? t.items : [];
      items.forEach((it) => {
        if (it.isCustom) return; // not a real inventory item, skip
        const qty = Number(it.qty) || 1;
        unitsSoldById[it.id] = (unitsSoldById[it.id] || 0) + qty;
      });
    });

    const salesVelocity = invNorm
      .map((i) => {
        const sold = unitsSoldById[i.id] || 0;
        const perDay = sold / DAYS_WINDOW;
        const daysLeft = perDay > 0 ? Math.round(i.stock / perDay) : Infinity;
        return {
          ...i,
          sold90d: sold,
          perWeek: +(perDay * 7).toFixed(1),
          daysLeft,
        };
      })
      .filter((i) => i.sold90d > 0);

    const bestSellers = [...salesVelocity]
      .sort((a, b) => b.sold90d - a.sold90d)
      .slice(0, 5);

    const restockNeeded = salesVelocity
      .filter((i) => Number.isFinite(i.daysLeft) && i.daysLeft <= 21)
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 8)
      .map((i) => {
        const suggestedQty = Math.max(1, Math.ceil(i.perWeek * 4 - i.stock)); // cover ~4 weeks of demand
        const priority =
          i.daysLeft <= 7 ? "Urgent" : i.daysLeft <= 14 ? "Soon" : "Plan ahead";
        return { ...i, suggestedQty, priority };
      });

    /* --- new patients trend --- */
    const walkinByMonth = [0, 0, 0];
    walkins.forEach((w) => {
      const d = new Date(w.arrived_at);
      const diff =
        (today.getFullYear() - d.getFullYear()) * 12 +
        (today.getMonth() - d.getMonth());
      if (diff >= 0 && diff <= 2) walkinByMonth[2 - diff]++;
    });
    const pctChange = (arr) => {
      const prev = arr[1];
      const curr = arr[2];
      if (!prev) return null;
      const pct = Math.round(((curr - prev) / prev) * 100);
      return `${pct >= 0 ? "+" : ""}${pct}%`;
    };
    const patByMonth = [0, 0, 0];
    patients.forEach((p) => {
      const d = new Date(p.created_at);
      const diff =
        (today.getFullYear() - d.getFullYear()) * 12 +
        (today.getMonth() - d.getMonth());
      if (diff >= 0 && diff <= 2) patByMonth[2 - diff]++;
    });

    /* --- predicted busy days next 14 days --- */
    const busyDays = Array.from({ length: 14 }, (_, i) => {
      const d = addDays(today, i + 1);
      const dow = d.getDay();
      const predicted = Math.round(dowAppt[dow] / 13); // avg per week over 13 weeks
      return {
        date: isoDate(d),
        label: `${DAYS[dow]} ${d.getDate()}`,
        predicted,
      };
    })
      .sort((a, b) => b.predicted - a.predicted)
      .slice(0, 7);

    /* --- insights --- */
    const peakDow = dowAppt.indexOf(Math.max(...dowAppt));
    const peakHour = hourBuckets.indexOf(Math.max(...hourBuckets));
    const criticalStock = lowStock.filter(
      (i) => i.stock <= (i.reorder_level || 10),
    );

    const insights = [];
    insights.push({
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
          <polyline points="17 6 23 6 23 12" />
        </svg>
      ),
      title: `Peak Day: ${DAYS[peakDow]}`,
      body: `${DAYS[peakDow]}s consistently see the highest patient volume. Consider scheduling extra staff on ${DAYS[peakDow]}s.`,
      color: C.indigo,
      action: "Staff planning →",
      type: "peakDay",
      suggestions: genSuggestions("peakDay", { dayLabel: DAYS[peakDow] }),
    });
    if (peakHour !== -1) {
      insights.push({
        icon: (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        ),
        title: `Rush Hour: ${HOUR_LABELS[peakHour]}`,
        body: `The ${HOUR_LABELS[peakHour]} slot is the most booked time. Prepare for a surge in walk-ins and appointments during this window.`,
        color: C.teal,
        action: "Review schedule →",
        type: "rushHour",
        suggestions: genSuggestions("rushHour", {
          hourLabel: HOUR_LABELS[peakHour],
        }),
      });
    }
    if (criticalStock.length > 0) {
      insights.push({
        icon: (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <path d="M21 16V8a2 2 0 0 0-1-1.73L13 2.27a2 2 0 0 0-2 0L4 6.27A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          </svg>
        ),
        title: `${criticalStock.length} Item${criticalStock.length > 1 ? "s" : ""} Below Reorder Level`,
        body: `${criticalStock
          .map((i) => i.name)
          .slice(0, 3)
          .join(
            ", ",
          )}${criticalStock.length > 3 ? " and more" : ""} need immediate restocking.`,
        color: C.rose,
        action: "View inventory →",
        type: "criticalStock",
        suggestions: genSuggestions("criticalStock", {
          items: criticalStock.slice(0, 6),
        }),
      });
    }
    if (topPurposes[0]) {
      insights.push({
        icon: (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        ),
        title: `Top Service: ${topPurposes[0][0]}`,
        body: `${topPurposes[0][0]} accounts for the largest share of appointments. Ensure sufficient vet availability for this service.`,
        color: C.amber,
        action: "Adjust rosters →",
        type: "topService",
        suggestions: genSuggestions("topService", {
          purpose: topPurposes[0][0],
        }),
      });
    }
    const growth =
      patByMonth[2] > patByMonth[0]
        ? Math.round(
            ((patByMonth[2] - patByMonth[0]) / Math.max(patByMonth[0], 1)) *
              100,
          )
        : 0;
    if (growth > 0) {
      insights.push({
        icon: (
          <svg
            width="18"
            height="18"
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
        title: `Patient Growth: +${growth}% this month`,
        body: `New patient registrations are trending up. Capacity planning and appointment slot expansion may be needed.`,
        color: C.emerald,
        action: "View growth →",
        type: "growth",
        suggestions: genSuggestions("growth", { growth }),
      });
    }

    setAnalytics({
      dowAppt,
      hourBuckets,
      HOUR_LABELS,
      monthVisits,
      monthLabels,
      topPurposes,
      purposeTotal,
      heatData,
      lowStock,
      bestSellers,
      restockNeeded,
      patByMonth,
      walkinByMonth,
      apptDelta: pctChange(monthVisits),
      walkinDelta: pctChange(walkinByMonth),
      patientDelta: pctChange(patByMonth),
      projGrowth:
        monthVisits[1] > 0
          ? Math.max(0.9, Math.min(1.5, monthVisits[2] / monthVisits[1]))
          : 1,
      busyDays,
      insights,
      totalAppts: appts.length,
      totalWalkins: walkins.length,
      totalPatients: patients.length,
      peakDow,
      peakHour,
    });
  }, [loading, appts, walkins, inventory, patients, transactions]);

  /* ── styles ── */
  const card = {
    background: "var(--card)",
    borderRadius: 14,
    border: "1px solid var(--border)",
    boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
    padding: "20px 22px",
  };

  const tabStyle = (t) => ({
    padding: "8px 18px",
    border: "none",
    borderRadius: 8,
    background: tab === t ? C.indigo : "transparent",
    color: tab === t ? "#fff" : "#64748b",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "all 0.2s",
  });

  if (userLoading)
    return (
      <Layout>
        <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>
          Loading…
        </div>
      </Layout>
    );

  return (
    <Layout>
      {/* ── Topbar ── */}
      <div
        className="topbar branches-topbar pa-topbar"
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
          <img
            src="/icon/predictive-analytics.webp"
            alt=""
            style={{ width: 28, opacity: 0.9 }}
          />
          <div>
            <h1>Predictive Analytics</h1>
            <p>
              {seeAllBranches
                ? branchFilter
                  ? `Forecasting for ${
                      branches.find(
                        (b) => String(b.id) === String(branchFilter),
                      )?.name || "selected branch"
                    }`
                  : "AI-assisted forecasting · patient trends · inventory intelligence — All Branches"
                : "AI-assisted forecasting · patient trends · inventory intelligence"}
            </p>
          </div>
        </div>
        <div className="topbar-actions">
          {seeAllBranches && branches.length > 0 && (
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
          <div
            style={{
              display: "flex",
              background: "var(--bg)",
              borderRadius: 10,
              padding: 4,
              gap: 2,
              flexWrap: "wrap",
            }}
          >
            {[
              {
                key: "visits",
                label: "Visits",
                icon: (
                  <svg
                    width="14"
                    height="14"
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
              },
              {
                key: "inventory",
                label: "Inventory",
                icon: (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <path d="M21 16V8a2 2 0 0 0-1-1.73L13 2.27a2 2 0 0 0-2 0L4 6.27A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  </svg>
                ),
              },
              {
                key: "patients",
                label: "Patients",
                icon: (
                  <svg
                    width="14"
                    height="14"
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
              },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  ...tabStyle(t.key),
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="content pa-content">
        {/* ── KPI row ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 12,
            marginBottom: 24,
          }}
        >
          {loading
            ? [1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  style={{
                    ...card,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  <Skel w="55%" h={12} />
                  <Skel w="40%" h={28} />
                  <Skel w="100%" h={40} />
                </div>
              ))
            : [
                {
                  label: "Total Appointments",
                  value: analytics?.totalAppts || 0,
                  delta: analytics?.apptDelta,
                  color: C.indigo,
                  spark: analytics?.monthVisits || [],
                },
                {
                  label: "Walk-Ins (90d)",
                  value: analytics?.totalWalkins || 0,
                  delta: analytics?.walkinDelta,
                  color: C.teal,
                  spark: analytics?.walkinByMonth || [],
                },
                {
                  label: "New Patients (90d)",
                  value: analytics?.totalPatients || 0,
                  delta: analytics?.patientDelta,
                  color: C.emerald,
                  spark: analytics?.patByMonth || [],
                },
                {
                  label: "Must-Buy Items",
                  value: analytics?.restockNeeded?.length || 0,
                  delta: null,
                  color:
                    analytics?.restockNeeded?.length > 3 ? C.rose : C.amber,
                  spark: [],
                },
              ].map((kpi, i) => (
                <div
                  key={kpi.label}
                  className="pa-card"
                  style={{ ...card, animationDelay: `${i * 0.07}s` }}
                >
                  <p
                    style={{
                      margin: "0 0 4px",
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#94a3b8",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    {kpi.label}
                  </p>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-end",
                      gap: 8,
                      marginBottom: 8,
                    }}
                  >
                    <h3
                      style={{
                        margin: 0,
                        fontSize: 28,
                        fontWeight: 900,
                        color: "var(--text)",
                        lineHeight: 1,
                      }}
                    >
                      {kpi.value}
                    </h3>
                    {kpi.delta && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: kpi.delta.startsWith("-") ? C.rose : C.emerald,
                          background: kpi.delta.startsWith("-")
                            ? "#fee2e2"
                            : "#dcfce7",
                          borderRadius: 20,
                          padding: "2px 8px",
                          marginBottom: 3,
                        }}
                      >
                        {kpi.delta}
                      </span>
                    )}
                  </div>
                  {kpi.spark.length > 0 && (
                    <Sparkline data={kpi.spark} color={kpi.color} h={36} />
                  )}
                </div>
              ))}
        </div>

        {/* ── AI Insights ── */}
        {!loading && analytics?.insights?.length > 0 && (
          <div
            className="pa-card"
            style={{ ...card, marginBottom: 24, animationDelay: "0.28s" }}
          >
            <SectionHeader
              icon={
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z" />
                  <line x1="9" y1="21" x2="15" y2="21" />
                </svg>
              }
              title="AI-Generated Insights"
              subtitle="Based on historical patterns from the last 90 days"
            />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
                gap: 12,
              }}
            >
              {analytics.insights.map((ins, i) => (
                <div key={i} style={{ animationDelay: `${0.3 + i * 0.06}s` }}>
                  <InsightCard
                    {...ins}
                    active={openInsight === i}
                    onAction={() =>
                      setOpenInsight(openInsight === i ? null : i)
                    }
                  />
                </div>
              ))}
            </div>
            {openInsight !== null &&
              analytics.insights[openInsight]?.suggestions?.length > 0 && (
                <div
                  style={{
                    marginTop: 12,
                    borderRadius: 12,
                    border: `1px solid ${analytics.insights[openInsight].color}30`,
                    background: `${analytics.insights[openInsight].color}08`,
                    padding: "14px 18px",
                  }}
                >
                  <p
                    style={{
                      margin: "0 0 8px",
                      fontSize: 12,
                      fontWeight: 700,
                      color: "var(--text)",
                    }}
                  >
                    Suggested actions
                  </p>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {analytics.insights[openInsight].suggestions.map((s, i) => (
                      <li
                        key={i}
                        style={{
                          fontSize: 12,
                          color: "var(--muted)",
                          marginBottom: 4,
                          lineHeight: 1.5,
                        }}
                      >
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
          </div>
        )}

        {/* ══ VISITS TAB ══ */}
        {tab === "visits" && (
          <div
            className="pa-visits-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: 16,
              alignItems: "start",
            }}
          >
            {/* Day-of-week chart */}
            <div
              className="pa-card"
              style={{ ...card, animationDelay: "0.1s" }}
            >
              <SectionHeader
                icon={
                  <svg
                    width="16"
                    height="16"
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
                }
                title="Busiest Days of the Week"
                subtitle="Aggregate visits over the past 90 days"
              />
              {loading ? (
                <Skel h={140} />
              ) : (
                <BarChart
                  labels={DAYS}
                  values={analytics?.dowAppt || Array(7).fill(0)}
                  color={C.indigo}
                  height={140}
                />
              )}
            </div>

            {/* Hour distribution */}
            <div
              className="pa-card"
              style={{ ...card, animationDelay: "0.15s" }}
            >
              <SectionHeader
                icon={
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
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                }
                title="Visits by Time Slot"
                subtitle="Which hours see the most traffic"
              />
              {loading ? (
                <Skel h={140} />
              ) : (
                <BarChart
                  labels={analytics?.HOUR_LABELS || []}
                  values={analytics?.hourBuckets || []}
                  color={C.teal}
                  height={140}
                />
              )}
            </div>

            {/* Heatmap */}
            <div
              className="pa-card"
              style={{ ...card, animationDelay: "0.2s" }}
            >
              <SectionHeader
                icon={
                  <svg
                    width="16"
                    height="16"
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
                }
                title="Visit Activity Heatmap"
                subtitle="Last 20 days + upcoming week"
              />
              {loading ? (
                <Skel h={100} />
              ) : (
                <CalHeatmap data={analytics?.heatData || {}} />
              )}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 10,
                }}
              >
                <span style={{ fontSize: 11, color: "#94a3b8" }}>Less</span>
                {[0.1, 0.3, 0.55, 0.75, 1].map((op) => (
                  <div
                    key={op}
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 3,
                      background: `rgba(79,70,229,${op})`,
                    }}
                  />
                ))}
                <span style={{ fontSize: 11, color: "#94a3b8" }}>More</span>
              </div>
            </div>

            {/* Predicted busy days */}
            <div
              className="pa-card"
              style={{ ...card, animationDelay: "0.25s" }}
            >
              <SectionHeader
                icon={
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                }
                title="Predicted Busy Days"
                subtitle="Next 14 days — based on day-of-week patterns"
              />
              {loading ? (
                <Skel h={160} />
              ) : (
                <div>
                  {(analytics?.busyDays || []).map((d, i) => (
                    <HBar
                      key={d.date}
                      label={d.label}
                      value={d.predicted}
                      max={Math.max(
                        ...(analytics?.busyDays || []).map((b) => b.predicted),
                        1,
                      )}
                      color={i === 0 ? C.rose : i < 3 ? C.amber : C.indigo}
                      sublabel="est. visits"
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Service breakdown */}
            <div
              className="pa-card"
              style={{ ...card, gridColumn: "1 / -1", animationDelay: "0.3s" }}
            >
              <SectionHeader
                icon={
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                  </svg>
                }
                title="Top Services Requested"
                subtitle="Appointment purposes ranked by volume"
              />
              {loading ? (
                <Skel h={120} />
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: 8,
                  }}
                >
                  {(analytics?.topPurposes || []).map(([purpose, count], i) => {
                    const colors = [
                      C.indigo,
                      C.teal,
                      C.amber,
                      C.rose,
                      C.violet,
                    ];
                    return (
                      <HBar
                        key={purpose}
                        label={purpose}
                        value={count}
                        max={analytics?.topPurposes?.[0]?.[1] || 1}
                        color={colors[i % colors.length]}
                        sublabel="appts"
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ INVENTORY TAB ══ */}
        {tab === "inventory" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 16,
              alignItems: "start",
            }}
          >
            {/* Most bought — recommend to buy more */}
            <div
              className="pa-card"
              style={{ ...card, animationDelay: "0.1s" }}
            >
              <SectionHeader
                icon={
                  <svg
                    width="16"
                    height="16"
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
                }
                title="Most Bought Products"
                subtitle="Top sellers from POS — recommended to restock more"
              />
              {loading ? (
                <Skel h={200} />
              ) : (
                <>
                  {(analytics?.bestSellers || []).length === 0 ? (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "32px 0",
                        color: "#94a3b8",
                      }}
                    >
                      <p style={{ margin: 0, fontWeight: 600 }}>
                        No sales data yet
                      </p>
                    </div>
                  ) : (
                    (analytics?.bestSellers || []).map((item, i) => {
                      const buyMore = Math.max(
                        1,
                        Math.ceil(item.perWeek * 4 - item.stock),
                      );
                      const runningLow =
                        Number.isFinite(item.daysLeft) && item.daysLeft <= 14;
                      return (
                        <div key={item.id} style={{ marginBottom: 14 }}>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              marginBottom: 4,
                            }}
                          >
                            <div>
                              <span
                                style={{
                                  fontSize: 13,
                                  fontWeight: 700,
                                  color: "#1e293b",
                                }}
                              >
                                {item.name}
                              </span>
                              {runningLow && (
                                <span
                                  style={{
                                    marginLeft: 6,
                                    fontSize: 9,
                                    fontWeight: 800,
                                    background: "#fee2e2",
                                    color: "#dc2626",
                                    borderRadius: 20,
                                    padding: "1px 6px",
                                  }}
                                >
                                  BUY MORE
                                </span>
                              )}
                            </div>
                            <span
                              style={{
                                fontSize: 12,
                                fontWeight: 700,
                                color: [
                                  C.violet,
                                  C.indigo,
                                  C.teal,
                                  C.emerald,
                                  C.sky,
                                ][i % 5],
                              }}
                            >
                              {item.sold90d} sold
                            </span>
                          </div>
                          <div
                            style={{
                              height: 6,
                              borderRadius: 99,
                              background: "#f1f5f9",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                height: "100%",
                                borderRadius: 99,
                                width: `${Math.min(
                                  100,
                                  (item.sold90d /
                                    (analytics?.bestSellers?.[0]?.sold90d ||
                                      1)) *
                                    100,
                                )}%`,
                                background: [
                                  C.violet,
                                  C.indigo,
                                  C.teal,
                                  C.emerald,
                                  C.sky,
                                ][i % 5],
                                transition: "width 0.6s ease",
                              }}
                            />
                          </div>
                          <p
                            style={{
                              margin: "3px 0 0",
                              fontSize: 10,
                              color: "#94a3b8",
                            }}
                          >
                            {item.perWeek}/wk sold · {item.stock} in stock ·
                            recommend buying {buyMore} more
                          </p>
                        </div>
                      );
                    })
                  )}
                </>
              )}
            </div>

            {/* Restock prediction */}

            {/* Restock prediction */}
            <div
              className="pa-card"
              style={{ ...card, gridColumn: "1 / -1", animationDelay: "0.2s" }}
            >
              <SectionHeader
                icon={
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                }
                title="Must-Buy Recommendations"
                subtitle="Predicted from sales velocity — items you need to buy more of soon"
              />
              {loading ? (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 10 }}
                >
                  {[1, 2, 3].map((i) => (
                    <Skel key={i} h={56} />
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                    gap: 12,
                  }}
                >
                  {(analytics?.restockNeeded || []).map((item) => {
                    const isCritical = item.priority === "Urgent";
                    const badgeColor =
                      item.priority === "Urgent"
                        ? C.rose
                        : item.priority === "Soon"
                          ? C.amber
                          : C.sky;
                    return (
                      <div
                        key={item.id}
                        style={{
                          border: `1px solid ${isCritical ? "#fecaca" : "#fde68a"}`,
                          background: isCritical ? "#fff5f5" : "#fffbeb",
                          borderRadius: 10,
                          padding: "12px 14px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                          }}
                        >
                          <div>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                marginBottom: 2,
                              }}
                            >
                              <p
                                style={{
                                  margin: 0,
                                  fontSize: 13,
                                  fontWeight: 700,
                                  color: "#1e293b",
                                }}
                              >
                                {item.name}
                              </p>
                              <span
                                style={{
                                  fontSize: 9,
                                  fontWeight: 800,
                                  color: "#fff",
                                  background: badgeColor,
                                  borderRadius: 20,
                                  padding: "1px 6px",
                                  textTransform: "uppercase",
                                }}
                              >
                                {item.priority} · buy more
                              </span>
                            </div>
                            <p
                              style={{
                                margin: 0,
                                fontSize: 11,
                                color: "#64748b",
                              }}
                            >
                              Current: {item.stock} units · {item.perWeek}/wk
                              sold
                            </p>
                            <p
                              style={{
                                margin: "2px 0 0",
                                fontSize: 11,
                                fontWeight: 700,
                                color: badgeColor,
                              }}
                            >
                              ~{item.daysLeft} day
                              {item.daysLeft === 1 ? "" : "s"} until stockout
                            </p>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <p
                              style={{
                                margin: "0 0 2px",
                                fontSize: 11,
                                color: "#94a3b8",
                              }}
                            >
                              Buy at least
                            </p>
                            <p
                              style={{
                                margin: 0,
                                fontSize: 18,
                                fontWeight: 900,
                                color: badgeColor,
                              }}
                            >
                              {item.suggestedQty}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {(analytics?.restockNeeded || []).length === 0 && (
                    <div
                      style={{
                        gridColumn: "1 / -1",
                        textAlign: "center",
                        padding: "40px 0",
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
                        <svg
                          width="32"
                          height="32"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke={C.emerald}
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                      <p style={{ margin: 0, fontWeight: 600 }}>
                        No restock recommendations — all levels healthy!
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ PATIENTS TAB ══ */}
        {tab === "patients" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 16,
              alignItems: "start",
            }}
          >
            {/* Monthly patient growth */}
            <div
              className="pa-card"
              style={{ ...card, animationDelay: "0.1s" }}
            >
              <SectionHeader
                icon={
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                    <polyline points="17 6 23 6 23 12" />
                  </svg>
                }
                title="New Patient Registrations"
                subtitle="Month-over-month for the past 3 months"
              />
              {loading ? (
                <Skel h={140} />
              ) : (
                <BarChart
                  labels={analytics?.monthLabels || []}
                  values={analytics?.patByMonth || []}
                  color={C.emerald}
                  height={140}
                />
              )}
            </div>

            {/* Appointment trend */}
            <div
              className="pa-card"
              style={{ ...card, animationDelay: "0.15s" }}
            >
              <SectionHeader
                icon={
                  <svg
                    width="16"
                    height="16"
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
                }
                title="Appointment Volume Trend"
                subtitle="Monthly appointment counts"
              />
              {loading ? (
                <Skel h={140} />
              ) : (
                <BarChart
                  labels={analytics?.monthLabels || []}
                  values={analytics?.monthVisits || []}
                  color={C.indigo}
                  height={140}
                />
              )}
            </div>

            {/* Growth projection */}
            <div
              className="pa-card"
              style={{ ...card, gridColumn: "1 / -1", animationDelay: "0.2s" }}
            >
              <SectionHeader
                icon={
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                }
                title="3-Month Projection"
                subtitle="Extrapolated from current growth trend (illustrative)"
              />
              {loading ? (
                <Skel h={100} />
              ) : (
                (() => {
                  const base = analytics?.totalAppts || 0;
                  const growth = analytics?.projGrowth || 1;
                  const proj = [
                    base,
                    Math.round(base * growth),
                    Math.round(base * growth * growth),
                  ];
                  const labels = ["This Month", "Next Month", "Month After"];
                  return (
                    <div className="pa-projection-grid">
                      {proj.map((v, i) => (
                        <div
                          key={labels[i]}
                          style={{
                            textAlign: "center",
                            padding: "20px 16px",
                            borderRadius: 12,
                            border: `1px solid ${[C.indigo, C.teal, C.emerald][i]}30`,
                            background: `${[C.indigo, C.teal, C.emerald][i]}08`,
                          }}
                        >
                          <p
                            style={{
                              margin: "0 0 6px",
                              fontSize: 11,
                              fontWeight: 700,
                              color: "#94a3b8",
                              textTransform: "uppercase",
                              letterSpacing: "0.06em",
                            }}
                          >
                            {labels[i]}
                          </p>
                          <h3
                            style={{
                              margin: "0 0 4px",
                              fontSize: 32,
                              fontWeight: 900,
                              color: [C.indigo, C.teal, C.emerald][i],
                            }}
                          >
                            {v}
                          </h3>
                          <p
                            style={{
                              margin: 0,
                              fontSize: 11,
                              color: "#94a3b8",
                            }}
                          >
                            est. appointments
                          </p>
                          {i > 0 &&
                            (() => {
                              const pctChange = Math.round(
                                (growth ** i - 1) * 100,
                              );
                              const isPositive = pctChange >= 0;
                              return (
                                <span
                                  style={{
                                    display: "inline-block",
                                    marginTop: 8,
                                    fontSize: 11,
                                    fontWeight: 700,
                                    color: isPositive ? C.emerald : C.rose,
                                    background: isPositive
                                      ? "#dcfce7"
                                      : "#fee2e2",
                                    borderRadius: 20,
                                    padding: "2px 8px",
                                  }}
                                >
                                  {isPositive ? "+" : ""}
                                  {pctChange}% projected
                                </span>
                              );
                            })()}
                        </div>
                      ))}
                    </div>
                  );
                })()
              )}
              <p style={{ margin: "12px 0 0", fontSize: 11, color: "#94a3b8" }}>
                Projection extrapolates the month-over-month change observed in
                the last 90 days (
                {Math.round(((analytics?.projGrowth || 1) - 1) * 100)}% per
                month). Actual results may vary.
              </p>
            </div>

            {/* Purpose breakdown for patients */}
            <div
              className="pa-card"
              style={{ ...card, gridColumn: "1 / -1", animationDelay: "0.25s" }}
            >
              <SectionHeader
                icon={
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                  </svg>
                }
                title="Visit Reasons — Patient Perspective"
                subtitle="What patients most commonly come in for"
              />
              {loading ? (
                <Skel h={100} />
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {(analytics?.topPurposes || []).map(([p, c], i) => {
                    const colors = [
                      C.indigo,
                      C.teal,
                      C.amber,
                      C.rose,
                      C.violet,
                    ];
                    const total = analytics?.purposeTotal || 1;
                    const pct = Math.round((c / total) * 100);
                    return (
                      <div
                        key={p}
                        className="pa-reason-card"
                        style={{
                          padding: "10px 16px",
                          borderRadius: 10,
                          background: `${colors[i % colors.length]}10`,
                          border: `1px solid ${colors[i % colors.length]}30`,
                          minWidth: 140,
                          flex: "1 1 140px",
                          boxSizing: "border-box",
                        }}
                      >
                        <p
                          style={{
                            margin: "0 0 2px",
                            fontSize: 13,
                            fontWeight: 700,
                            color: "#1e293b",
                          }}
                        >
                          {p}
                        </p>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 20,
                            fontWeight: 900,
                            color: colors[i % colors.length],
                          }}
                        >
                          {pct}%
                        </p>
                        <p
                          style={{
                            margin: "2px 0 0",
                            fontSize: 11,
                            color: "#94a3b8",
                          }}
                        >
                          {c} appointments
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default PredictiveAnalytics;
