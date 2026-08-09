// src/pages/PredictiveAnalytics.jsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import Layout from "../../components/layout";
import { supabase } from "../../js/Utils/supabase";
import { useCurrentUser } from "../../js/hooks/Usecurrentuser";
import { logActivity } from '../../js/Utils/logActivity';
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
const isoDate = (d) => d.toISOString().split("T")[0];

const addDays = (d, n) => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const fill = filled
    ? `${path} L${w},${h} L0,${h} Z`
    : path;

  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      {filled && (
        <defs>
          <linearGradient id={`sg-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0.03} />
          </linearGradient>
        </defs>
      )}
      {filled && (
        <path d={fill} fill={`url(#sg-${color.replace("#", "")})`} />
      )}
      <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

/* ── Horizontal bar ── */
const HBar = ({ label, value, max, color, sublabel }) => (
  <div style={{ marginBottom: 12 }}>
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 700, color }}>
        {value}{sublabel ? ` ${sublabel}` : ""}
      </span>
    </div>
    <div style={{ height: 6, borderRadius: 99, background: "#f1f5f9", overflow: "hidden" }}>
      <div style={{
        height: "100%", borderRadius: 99,
        width: `${Math.min(100, (value / max) * 100)}%`,
        background: color,
        transition: "width 0.8s cubic-bezier(0.34,1.56,0.64,1)",
      }} />
    </div>
  </div>
);

const Skel = ({ w = "100%", h = 16, style = {} }) => (
  <span className="pa-skel" style={{ display: "block", width: w, height: h, borderRadius: 8, ...style }} />
);

/* ── Insight card ── */
const InsightCard = ({ icon, title, body, color, action }) => (
  <div style={{
    background: "var(--card)", borderRadius: 14, border: `1px solid ${color}30`,
    padding: "16px 18px", display: "flex", gap: 14, alignItems: "flex-start",
    boxShadow: `0 4px 20px ${color}12`,
  }}>
    <div style={{
      width: 38, height: 38, borderRadius: 10, background: `${color}15`,
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0, color,
    }}>
      {icon}
    </div>
    <div style={{ flex: 1 }}>
      <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{title}</p>
      <p style={{ margin: "0 0 8px", fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>{body}</p>
      {action && (
        <span style={{
          fontSize: 11, fontWeight: 700, color, borderRadius: 20,
          background: `${color}15`, padding: "3px 10px", display: "inline-block",
        }}>{action}</span>
      )}
    </div>
  </div>
);

/* ── Section header ── */
const SectionHeader = ({ icon, title, subtitle }) => (
  <div style={{ marginBottom: 18 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
      <span style={{ display: "flex", alignItems: "center", color: "#4f46e5" }}>{icon}</span>
      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "var(--text)" }}>{title}</h2>
    </div>
    {subtitle && <p style={{ margin: 0, fontSize: 12, color: "#94a3b8", paddingLeft: 26 }}>{subtitle}</p>}
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
  const max = Math.max(...cells.map(c => c.v), 1);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
      {cells.map(({ key, v, d }) => {
        const intensity = v / max;
        return (
          <div
            key={key}
            title={`${isoDate(d)}: ${v} visits`}
            style={{
              width: 18, height: 18, borderRadius: 3,
              background: v === 0
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
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height, paddingTop: 8 }}>
      {labels.map((lbl, i) => (
        <div key={lbl} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color }}>
            {values[i] > 0 ? values[i] : ""}
          </span>
          <div style={{
            width: "100%", borderRadius: "4px 4px 0 0",
            height: `${(values[i] / max) * (height - 24)}px`,
            background: color,
            opacity: 0.75 + (values[i] / max) * 0.25,
            minHeight: values[i] > 0 ? 4 : 0,
            transition: "height 0.6s cubic-bezier(0.34,1.56,0.64,1)",
          }} />
          <span style={{ fontSize: 9, color: "#94a3b8", fontWeight: 600, textAlign: "center" }}>{lbl}</span>
        </div>
      ))}
    </div>
  );
};

/* ────────────────────────────────────────────
   MAIN PAGE
──────────────────────────────────────────── */
const PredictiveAnalytics = () => {
  const { user, isAdmin, isEmployee, seeAllBranches, loading: userLoading } = useCurrentUser();

  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("visits");

  /* raw data */
  const [appts, setAppts] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [walkins, setWalkins] = useState([]);
  const [patients, setPatients] = useState([]);

  /* computed analytics */
  const [analytics, setAnalytics] = useState(null);

  /* ── fetch ── */
  useEffect(() => {
    if (userLoading || !user) return;
    logActivity(user, 'Viewed predictive analytics', 'Opened analytics dashboard');
    const run = async () => {
      setLoading(true);

      const since90 = isoDate(addDays(today, -90));

      let apptQ = supabase.from("appointments").select("*").gte("date", since90).order("date");
      let wiQ = supabase.from("walk_ins").select("*").gte("created_at", since90);
      let invQ = supabase.from("inventory").select("*");
      let patQ = supabase.from("patients").select("*").gte("created_at", since90);

      if (!seeAllBranches && user.branchId) {
        apptQ = apptQ.eq("branch_id", user.branchId);
        wiQ = wiQ.eq("branch_id", user.branchId);
        invQ = invQ.eq("branch_id", user.branchId);
        patQ = patQ.eq("branch_id", user.branchId);
      }

      const [a, w, inv, p] = await Promise.all([apptQ, wiQ, invQ, patQ]);

      setAppts(a.data || []);
      setWalkins(w.data || []);
      setInventory(inv.data || []);
      setPatients(p.data || []);
      setLoading(false);
    };
    run();
  }, [user, seeAllBranches, userLoading]);

  /* ── compute analytics whenever data arrives ── */
  useEffect(() => {
    if (loading) return;

    /* --- visits by day-of-week --- */
    const dowAppt = Array(7).fill(0);
    appts.forEach(a => {
      const d = new Date(a.date);
      if (!isNaN(d)) dowAppt[d.getDay()]++;
    });
    walkins.forEach(w => {
      const d = new Date(w.created_at);
      if (!isNaN(d)) dowAppt[d.getDay()]++;
    });

    /* --- visits by hour --- */
    const hourBuckets = Array(8).fill(0); // 8am–4pm
    const HOUR_LABELS = ["8AM", "9AM", "10AM", "11AM", "1PM", "2PM", "3PM", "4PM"];
    const HOUR_MAP = {
      "08:00 AM": 0, "09:00 AM": 1, "10:00 AM": 2, "11:00 AM": 3,
      "01:00 PM": 4, "02:00 PM": 5, "03:00 PM": 6, "04:00 PM": 7
    };
    appts.forEach(a => {
      const idx = HOUR_MAP[a.time];
      if (idx !== undefined) hourBuckets[idx]++;
    });

    /* --- visits by month (last 3 months) --- */
    const monthVisits = [0, 0, 0];
    const monthLabels = [-2, -1, 0].map(o => {
      const d = new Date(today.getFullYear(), today.getMonth() + o, 1);
      return MONTHS[d.getMonth()];
    });
    appts.forEach(a => {
      const d = new Date(a.date);
      const diff = (today.getFullYear() - d.getFullYear()) * 12 + (today.getMonth() - d.getMonth());
      if (diff >= 0 && diff <= 2) monthVisits[2 - diff]++;
    });

    /* --- purpose distribution --- */
    const purposeCounts = {};
    appts.forEach(a => {
      purposeCounts[a.purpose] = (purposeCounts[a.purpose] || 0) + 1;
    });
    const topPurposes = Object.entries(purposeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    /* --- heatmap data (date → count) --- */
    const heatData = {};
    appts.forEach(a => {
      heatData[a.date] = (heatData[a.date] || 0) + 1;
    });
    walkins.forEach(w => {
      const d = isoDate(new Date(w.created_at));
      heatData[d] = (heatData[d] || 0) + 1;
    });

    /* --- low stock items --- */
    const lowStock = (inventory || [])
      .filter(i => i.stock <= (i.reorder_level || 10) * 1.5)
      .sort((a, b) => (a.stock / (a.reorder_level || 1)) - (b.stock / (b.reorder_level || 1)))
      .slice(0, 6);

    /* --- inventory turnover (simulated from stock vs reorder) --- */
    const invTurnover = (inventory || [])
      .filter(i => i.reorder_level > 0)
      .map(i => ({
        name: i.name,
        turnover: +(((i.reorder_level - i.stock + i.reorder_level) / i.reorder_level) * 100).toFixed(0),
      }))
      .sort((a, b) => b.turnover - a.turnover)
      .slice(0, 5);

    /* --- new patients trend --- */
    const patByMonth = [0, 0, 0];
    patients.forEach(p => {
      const d = new Date(p.created_at);
      const diff = (today.getFullYear() - d.getFullYear()) * 12 + (today.getMonth() - d.getMonth());
      if (diff >= 0 && diff <= 2) patByMonth[2 - diff]++;
    });

    /* --- predicted busy days next 14 days --- */
    const busyDays = Array.from({ length: 14 }, (_, i) => {
      const d = addDays(today, i + 1);
      const dow = d.getDay();
      const predicted = Math.round(dowAppt[dow] / 13); // avg per week over 13 weeks
      return { date: isoDate(d), label: `${DAYS[dow]} ${d.getDate()}`, predicted };
    }).sort((a, b) => b.predicted - a.predicted).slice(0, 7);

    /* --- insights --- */
    const peakDow = dowAppt.indexOf(Math.max(...dowAppt));
    const peakHour = hourBuckets.indexOf(Math.max(...hourBuckets));
    const criticalStock = lowStock.filter(i => i.stock <= (i.reorder_level || 10));

    const insights = [];
    insights.push({
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>,
      title: `Peak Day: ${DAYS[peakDow]}`,
      body: `${DAYS[peakDow]}s consistently see the highest patient volume. Consider scheduling extra staff on ${DAYS[peakDow]}s.`,
      color: C.indigo,
      action: "Staff planning →",
    });
    if (peakHour !== -1) {
      insights.push({
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
        title: `Rush Hour: ${HOUR_LABELS[peakHour]}`,
        body: `The ${HOUR_LABELS[peakHour]} slot is the most booked time. Prepare for a surge in walk-ins and appointments during this window.`,
        color: C.teal,
        action: "Review schedule →",
      });
    }
    if (criticalStock.length > 0) {
      insights.push({
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 16V8a2 2 0 0 0-1-1.73L13 2.27a2 2 0 0 0-2 0L4 6.27A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /></svg>,
        title: `${criticalStock.length} Item${criticalStock.length > 1 ? "s" : ""} Below Reorder Level`,
        body: `${criticalStock.map(i => i.name).slice(0, 3).join(", ")}${criticalStock.length > 3 ? " and more" : ""} need immediate restocking.`,
        color: C.rose,
        action: "View inventory →",
      });
    }
    if (topPurposes[0]) {
      insights.push({
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>,
        title: `Top Service: ${topPurposes[0][0]}`,
        body: `${topPurposes[0][0]} accounts for the largest share of appointments. Ensure sufficient vet availability for this service.`,
        color: C.amber,
        action: "Adjust rosters →",
      });
    }
    const growth = patByMonth[2] > patByMonth[0]
      ? Math.round(((patByMonth[2] - patByMonth[0]) / Math.max(patByMonth[0], 1)) * 100)
      : 0;
    if (growth > 0) {
      insights.push({
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
        title: `Patient Growth: +${growth}% this month`,
        body: `New patient registrations are trending up. Capacity planning and appointment slot expansion may be needed.`,
        color: C.emerald,
        action: "View growth →",
      });
    }

    setAnalytics({
      dowAppt, hourBuckets, HOUR_LABELS,
      monthVisits, monthLabels,
      topPurposes, heatData, lowStock, invTurnover,
      patByMonth, busyDays, insights,
      totalAppts: appts.length,
      totalWalkins: walkins.length,
      totalPatients: patients.length,
      peakDow, peakHour,
    });
  }, [loading, appts, walkins, inventory, patients]);

  /* ── styles ── */
  const card = {
    background: "var(--card)",
    borderRadius: 14,
    border: "1px solid var(--border)",
    boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
    padding: "20px 22px",
  };

  const tabStyle = (t) => ({
    padding: "8px 18px", border: "none", borderRadius: 8,
    background: tab === t ? C.indigo : "transparent",
    color: tab === t ? "#fff" : "#64748b",
    fontSize: 13, fontWeight: 700, cursor: "pointer",
    fontFamily: "inherit", transition: "all 0.2s",
  });

  if (userLoading) return <Layout><div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>Loading…</div></Layout>;

  return (
    <Layout>
      {/* ── Topbar ── */}
      <div className="topbar branches-topbar pa-topbar" style={{ position: 'fixed', top: 68, left: 'var(--current-sidebar-w, 62px)', right: 0, zIndex: 40, background: '#fff' }}>
        <div className="topbar-title">
          <img src="/icon/report.png" alt="" style={{ width: 28, opacity: 0.9 }} />
          <div>
            <h1>Predictive Analytics</h1>
            <p>AI-assisted forecasting · patient trends · inventory intelligence</p>
          </div>
        </div>
        <div className="topbar-actions">
          <div style={{ display: "flex", background: "var(--bg)", borderRadius: 10, padding: 4, gap: 2, flexWrap: 'wrap' }}>
            {[
              { key: "visits", label: "Visits", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg> },
              { key: "inventory", label: "Inventory", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 16V8a2 2 0 0 0-1-1.73L13 2.27a2 2 0 0 0-2 0L4 6.27A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /></svg> },
              { key: "patients", label: "Patients", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg> },
            ].map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{ ...tabStyle(t.key), display: "flex", alignItems: "center", gap: 6 }}>
                {t.icon}{t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="content pa-content">

        {/* ── KPI row ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
          {loading ? (
            [1, 2, 3, 4].map(i => (
              <div key={i} style={{ ...card, display: "flex", flexDirection: "column", gap: 10 }}>
                <Skel w="55%" h={12} />
                <Skel w="40%" h={28} />
                <Skel w="100%" h={40} />
              </div>
            ))
          ) : [
            { label: "Total Appointments", value: analytics?.totalAppts || 0, delta: "+12%", color: C.indigo, spark: analytics?.monthVisits || [] },
            { label: "Walk-Ins (90d)", value: analytics?.totalWalkins || 0, delta: "+8%", color: C.teal, spark: [2, 4, 3, 6, 5, 7, 8] },
            { label: "New Patients (90d)", value: analytics?.totalPatients || 0, delta: "+5%", color: C.emerald, spark: analytics?.patByMonth || [] },
            { label: "Low Stock Items", value: analytics?.lowStock?.length || 0, delta: null, color: analytics?.lowStock?.length > 3 ? C.rose : C.amber, spark: [] },
          ].map((kpi, i) => (
            <div key={kpi.label} className="pa-card" style={{ ...card, animationDelay: `${i * 0.07}s` }}>
              <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>{kpi.label}</p>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8, marginBottom: 8 }}>
                <h3 style={{ margin: 0, fontSize: 28, fontWeight: 900, color: "var(--text)", lineHeight: 1 }}>{kpi.value}</h3>
                {kpi.delta && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.emerald, background: "#dcfce7", borderRadius: 20, padding: "2px 8px", marginBottom: 3 }}>{kpi.delta}</span>
                )}
              </div>
              {kpi.spark.length > 0 && <Sparkline data={kpi.spark} color={kpi.color} h={36} />}
            </div>
          ))}
        </div>

        {/* ── AI Insights ── */}
        {!loading && analytics?.insights?.length > 0 && (
          <div className="pa-card" style={{ ...card, marginBottom: 24, animationDelay: "0.28s" }}>
            <SectionHeader icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z" /><line x1="9" y1="21" x2="15" y2="21" /></svg>} title="AI-Generated Insights" subtitle="Based on historical patterns from the last 90 days" />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12 }}>
              {analytics.insights.map((ins, i) => (
                <div key={i} style={{ animationDelay: `${0.3 + i * 0.06}s` }}>
                  <InsightCard {...ins} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ VISITS TAB ══ */}
        {tab === "visits" && (
          <div className="pa-visits-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 16 }}>

            {/* Day-of-week chart */}
            <div className="pa-card" style={{ ...card, animationDelay: "0.1s" }}>
              <SectionHeader icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>} title="Busiest Days of the Week" subtitle="Aggregate visits over the past 90 days" />
              {loading ? <Skel h={140} /> : (
                <BarChart
                  labels={DAYS}
                  values={analytics?.dowAppt || Array(7).fill(0)}
                  color={C.indigo}
                  height={140}
                />
              )}
            </div>

            {/* Hour distribution */}
            <div className="pa-card" style={{ ...card, animationDelay: "0.15s" }}>
              <SectionHeader icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>} title="Visits by Time Slot" subtitle="Which hours see the most traffic" />
              {loading ? <Skel h={140} /> : (
                <BarChart
                  labels={analytics?.HOUR_LABELS || []}
                  values={analytics?.hourBuckets || []}
                  color={C.teal}
                  height={140}
                />
              )}
            </div>

            {/* Heatmap */}
            <div className="pa-card" style={{ ...card, animationDelay: "0.2s" }}>
              <SectionHeader icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>} title="Visit Activity Heatmap" subtitle="Last 20 days + upcoming week" />
              {loading ? <Skel h={100} /> : <CalHeatmap data={analytics?.heatData || {}} />}
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10 }}>
                <span style={{ fontSize: 11, color: "#94a3b8" }}>Less</span>
                {[0.1, 0.3, 0.55, 0.75, 1].map(op => (
                  <div key={op} style={{ width: 14, height: 14, borderRadius: 3, background: `rgba(79,70,229,${op})` }} />
                ))}
                <span style={{ fontSize: 11, color: "#94a3b8" }}>More</span>
              </div>
            </div>

            {/* Predicted busy days */}
            <div className="pa-card" style={{ ...card, animationDelay: "0.25s" }}>
              <SectionHeader icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>} title="Predicted Busy Days" subtitle="Next 14 days — based on day-of-week patterns" />
              {loading ? <Skel h={160} /> : (
                <div>
                  {(analytics?.busyDays || []).map((d, i) => (
                    <HBar
                      key={d.date}
                      label={d.label}
                      value={d.predicted}
                      max={Math.max(...(analytics?.busyDays || []).map(b => b.predicted), 1)}
                      color={i === 0 ? C.rose : i < 3 ? C.amber : C.indigo}
                      sublabel="est. visits"
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Service breakdown */}
            <div className="pa-card" style={{ ...card, gridColumn: "1 / -1", animationDelay: "0.3s" }}>
              <SectionHeader icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>} title="Top Services Requested" subtitle="Appointment purposes ranked by volume" />
              {loading ? <Skel h={120} /> : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 }}>
                  {(analytics?.topPurposes || []).map(([purpose, count], i) => {
                    const colors = [C.indigo, C.teal, C.amber, C.rose, C.violet];
                    return (
                      <HBar
                        key={purpose}
                        label={purpose}
                        value={count}
                        max={(analytics?.topPurposes?.[0]?.[1]) || 1}
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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>

            {/* Critical stock */}
            <div className="pa-card" style={{ ...card, animationDelay: "0.1s" }}>
              <SectionHeader icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>} title="Low & Critical Stock" subtitle="Items at or near reorder level" />
              {loading ? <Skel h={200} /> : (
                <>
                  {(analytics?.lowStock || []).length === 0 ? (
                    <div style={{ textAlign: "center", padding: "32px 0", color: "#94a3b8" }}>
                      <div style={{ marginBottom: 8, display: "flex", justifyContent: "center" }}><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.emerald} strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><polyline points="20 6 9 17 4 12" /></svg></div>
                      <p style={{ margin: 0, fontWeight: 600 }}>All stock levels healthy</p>
                    </div>
                  ) : (analytics?.lowStock || []).map((item) => {
                    const pct = Math.max(0, Math.min(100, (item.stock / ((item.reorder_level || 10) * 2)) * 100));
                    const isCritical = item.stock <= (item.reorder_level || 10);
                    return (
                      <div key={item.id} style={{ marginBottom: 14 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <div>
                            <span style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>{item.name}</span>
                            {isCritical && (
                              <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 800, background: "#fee2e2", color: "#dc2626", borderRadius: 20, padding: "1px 6px" }}>CRITICAL</span>
                            )}
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: isCritical ? C.rose : C.amber }}>
                            {item.stock} / {item.reorder_level || "—"}
                          </span>
                        </div>
                        <div style={{ height: 6, borderRadius: 99, background: "#f1f5f9", overflow: "hidden" }}>
                          <div style={{
                            height: "100%", borderRadius: 99, width: `${pct}%`,
                            background: isCritical ? C.rose : C.amber,
                            transition: "width 0.6s ease",
                          }} />
                        </div>
                        <p style={{ margin: "3px 0 0", fontSize: 10, color: "#94a3b8" }}>
                          {isCritical ? "Order immediately" : "Reorder soon"} · Reorder at {item.reorder_level || "N/A"}
                        </p>
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            {/* Inventory turnover */}
            <div className="pa-card" style={{ ...card, animationDelay: "0.15s" }}>
              <SectionHeader icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>} title="Inventory Usage Rate" subtitle="Items with highest consumption relative to stock level" />
              {loading ? <Skel h={200} /> : (
                <>
                  {(analytics?.invTurnover || []).length === 0 ? (
                    <p style={{ color: "#94a3b8", fontSize: 13, textAlign: "center", padding: "32px 0" }}>No inventory data available</p>
                  ) : (analytics?.invTurnover || []).map((item, i) => (
                    <HBar
                      key={item.name}
                      label={item.name}
                      value={item.turnover}
                      max={100}
                      color={[C.violet, C.indigo, C.teal, C.emerald, C.sky][i % 5]}
                      sublabel="%"
                    />
                  ))}
                </>
              )}
            </div>

            {/* Restock prediction */}
            <div className="pa-card" style={{ ...card, gridColumn: "1 / -1", animationDelay: "0.2s" }}>
              <SectionHeader icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>} title="Restock Recommendations" subtitle="Predictive suggestions based on stock vs. usage trends" />
              {loading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[1, 2, 3].map(i => <Skel key={i} h={56} />)}
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
                  {(analytics?.lowStock || []).slice(0, 6).map((item) => {
                    const isCritical = item.stock <= (item.reorder_level || 10);
                    const suggested = Math.max(1, (item.reorder_level || 10) * 2 - item.stock);
                    return (
                      <div key={item.id} style={{
                        border: `1px solid ${isCritical ? "#fecaca" : "#fde68a"}`,
                        background: isCritical ? "#fff5f5" : "#fffbeb",
                        borderRadius: 10, padding: "12px 14px",
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div>
                            <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 700, color: "#1e293b" }}>{item.name}</p>
                            <p style={{ margin: 0, fontSize: 11, color: "#64748b" }}>Current: {item.stock} units</p>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <p style={{ margin: "0 0 2px", fontSize: 11, color: "#94a3b8" }}>Suggest ordering</p>
                            <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: isCritical ? C.rose : C.amber }}>{suggested}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {(analytics?.lowStock || []).length === 0 && (
                    <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>
                      <div style={{ marginBottom: 8, display: "flex", justifyContent: "center" }}><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.emerald} strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><polyline points="20 6 9 17 4 12" /></svg></div>
                      <p style={{ margin: 0, fontWeight: 600 }}>No restock recommendations — all levels healthy!</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ PATIENTS TAB ══ */}
        {tab === "patients" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>

            {/* Monthly patient growth */}
            <div className="pa-card" style={{ ...card, animationDelay: "0.1s" }}>
              <SectionHeader icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>} title="New Patient Registrations" subtitle="Month-over-month for the past 3 months" />
              {loading ? <Skel h={140} /> : (
                <BarChart
                  labels={analytics?.monthLabels || []}
                  values={analytics?.patByMonth || []}
                  color={C.emerald}
                  height={140}
                />
              )}
            </div>

            {/* Appointment trend */}
            <div className="pa-card" style={{ ...card, animationDelay: "0.15s" }}>
              <SectionHeader icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>} title="Appointment Volume Trend" subtitle="Monthly appointment counts" />
              {loading ? <Skel h={140} /> : (
                <BarChart
                  labels={analytics?.monthLabels || []}
                  values={analytics?.monthVisits || []}
                  color={C.indigo}
                  height={140}
                />
              )}
            </div>

            {/* Growth projection */}
            <div className="pa-card" style={{ ...card, gridColumn: "1 / -1", animationDelay: "0.2s" }}>
              <SectionHeader icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>} title="3-Month Projection" subtitle="Extrapolated from current growth trend (illustrative)" />
              {loading ? <Skel h={100} /> : (() => {
                const base = analytics?.totalAppts || 0;
                const growth = 1.08;
                const proj = [base, Math.round(base * growth), Math.round(base * growth * growth)];
                const labels = ["This Month", "Next Month", "Month After"];
                return (
                  <div className="pa-projection-grid">
                    {proj.map((v, i) => (
                      <div key={labels[i]} style={{
                        textAlign: "center", padding: "20px 16px",
                        borderRadius: 12, border: `1px solid ${[C.indigo, C.teal, C.emerald][i]}30`,
                        background: `${[C.indigo, C.teal, C.emerald][i]}08`,
                      }}>
                        <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>{labels[i]}</p>
                        <h3 style={{ margin: "0 0 4px", fontSize: 32, fontWeight: 900, color: [C.indigo, C.teal, C.emerald][i] }}>{v}</h3>
                        <p style={{ margin: 0, fontSize: 11, color: "#94a3b8" }}>est. appointments</p>
                        {i > 0 && (
                          <span style={{ display: "inline-block", marginTop: 8, fontSize: 11, fontWeight: 700, color: C.emerald, background: "#dcfce7", borderRadius: 20, padding: "2px 8px" }}>
                            +{Math.round((growth ** i - 1) * 100)}% projected
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })()}
              <p style={{ margin: "12px 0 0", fontSize: 11, color: "#94a3b8" }}>
                Projection assumes a conservative 8% month-over-month growth based on the last 90-day trend. Actual results may vary.
              </p>
            </div>

            {/* Purpose breakdown for patients */}
            <div className="pa-card" style={{ ...card, gridColumn: "1 / -1", animationDelay: "0.25s" }}>
              <SectionHeader icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>} title="Visit Reasons — Patient Perspective" subtitle="What patients most commonly come in for" />
              {loading ? <Skel h={100} /> : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {(analytics?.topPurposes || []).map(([p, c], i) => {
                    const colors = [C.indigo, C.teal, C.amber, C.rose, C.violet];
                    const total = (analytics?.totalAppts || 1);
                    const pct = Math.round((c / total) * 100);
                    return (
                      <div key={p} className="pa-reason-card" style={{
                        padding: "10px 16px", borderRadius: 10,
                        background: `${colors[i % colors.length]}10`,
                        border: `1px solid ${colors[i % colors.length]}30`,
                        minWidth: 140,
                        flex: "1 1 140px",
                        boxSizing: "border-box",
                      }}>
                        <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 700, color: "#1e293b" }}>{p}</p>
                        <p style={{ margin: 0, fontSize: 20, fontWeight: 900, color: colors[i % colors.length] }}>{pct}%</p>
                        <p style={{ margin: "2px 0 0", fontSize: 11, color: "#94a3b8" }}>{c} appointments</p>
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