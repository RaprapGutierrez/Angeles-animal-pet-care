import React, { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import Layout from "../../components/layout";
import { supabase } from "../../js/Utils/supabase";
import { getNavLinks } from "../../js/Utils/branchTables";
import { useCurrentUser } from "../../js/hooks/Usecurrentuser";
import { useBranchFilter } from "../../js/hooks/Usebranchfilter";
import { logActivity } from "../../js/Utils/logActivity";
import "../../styles/Dashboard.css";

// ─── Module map for activity logger ──────────────────────────────────────────
const MODULE_MAP = {
  "/dashboard": { label: "Dashboard", color: "#1e3a8a" },
  "/patient-records": { label: "Patient Records", color: "#7c3aed" },
  "/appointments": { label: "Appointments", color: "#0891b2" },
  "/room-availability": { label: "Room Status", color: "#d97706" },
  "/inventory": { label: "Inventory", color: "#16a34a" },
  "/point-of-sale": { label: "Point of Sale", color: "#dc2626" },
  "/walk-in": { label: "Walk-In", color: "#9333ea" },
  "/messages": { label: "Messages", color: "#0284c7" },
  "/emergency": { label: "Emergency", color: "#ef4444" },
};

const STATUS_BADGE = {
  Confirmed: "badge-green",
  Pending: "badge-yellow",
  Cancelled: "badge-red",
  Completed: "badge-blue",
};
const STATUS_DOT = {
  Confirmed: "#16a34a",
  Pending: "#d97706",
  Cancelled: "#dc2626",
  Completed: "#1e3a8a",
};
const ROUTE_ICON_MAP = {
  "/patient-records": "/icon/patient_record.png",
  "/appointments": "/icon/appointment.png",
  "/room-availability": "/icon/room.png",
  "/inventory": "/icon/inventory_2.png",
  "/point-of-sale": "/icon/point_of_sale.png",
  "/walk-in": "/icon/walkin.png",
  "/messages": "/icon/chat.png",
  "/emergency": "/icon/emergency_dashboard.png",
  "/reports": "/icon/reports.png",
  "/branches": "/icon/branches.png",
  "/admin-security": "/icon/admin_2.png",
  "/manager-control": "/icon/manager.png",
  "/predictive-analytics": "/icon/predictive-analytics.png",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const normalizeRole = (r) => String(r || "").toLowerCase();

const Sk = ({ w = "100%", h = 14, r = 6, style = {} }) => (
  <div
    className="sk"
    style={{ width: w, height: h, borderRadius: r, flexShrink: 0, ...style }}
  />
);

const StatCardSkeleton = () => (
  <div
    style={{
      background: "var(--card)",
      border: "1.5px solid var(--border)",
      borderRadius: 16,
      padding: 20,
      display: "flex",
      flexDirection: "column",
      gap: 14,
    }}
  >
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div className="sk" style={{ width: 46, height: 46, borderRadius: 12 }} />
      <Sk w={50} h={10} r={6} />
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <Sk w="45%" h={11} />
      <Sk w="30%" h={26} />
      <Sk w="60%" h={10} />
    </div>
  </div>
);

const QuickLinkSkeleton = () => (
  <div
    style={{
      background: "var(--card)",
      border: "1.5px solid var(--border)",
      borderRadius: 14,
      padding: "18px 12px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 10,
    }}
  >
    <div className="sk" style={{ width: 46, height: 46, borderRadius: 12 }} />
    <Sk w="60%" h={11} />
  </div>
);

const AppointmentRowSkeleton = () => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 14,
      padding: "13px 20px",
      borderBottom: "1px solid var(--border)",
    }}
  >
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 5,
        minWidth: 52,
      }}
    >
      <Sk w={40} h={11} />
      <Sk w={8} h={8} r="50%" />
    </div>
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
      <Sk w="55%" h={13} />
      <Sk w="75%" h={10} />
    </div>
    <Sk w={64} h={22} r={8} />
  </div>
);

const WalkinRowSkeleton = () => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 14,
      padding: "13px 20px",
      borderBottom: "1px solid var(--border)",
    }}
  >
    <div
      className="sk"
      style={{ width: 38, height: 38, borderRadius: "50%" }}
    />
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
      <Sk w="55%" h={13} />
      <Sk w="70%" h={10} />
    </div>
    <Sk w={44} h={10} r={6} />
  </div>
);

// ─── DashCard ─────────────────────────────────────────────────────────────────
const DashCard = ({
  title,
  subtitle,
  badge,
  viewAllTo,
  viewAllLabel = "View All →",
  children,
}) => (
  <div className="dash-card">
    <div
      className="dash-card-header"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 20px",
        borderBottom: "1px solid var(--border)",
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>{title}</h3>
          {subtitle && (
            <p
              style={{
                margin: 0,
                fontSize: 11,
                color: "var(--muted)",
                marginTop: 2,
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
        {badge != null && badge > 0 && (
          <span
            style={{
              background: "#1e3a8a",
              color: "#fff",
              borderRadius: 20,
              fontSize: 10,
              fontWeight: 700,
              padding: "2px 8px",
              lineHeight: "16px",
            }}
          >
            {badge}
          </span>
        )}
      </div>
      {viewAllTo && (
        <Link
          to={viewAllTo}
          style={{
            fontSize: 12,
            color: "var(--royal)",
            textDecoration: "none",
            fontWeight: 600,
            padding: "5px 10px",
            borderRadius: 8,
            border: "1px solid rgba(30,58,138,0.15)",
            transition: "background 0.15s",
          }}
        >
          {viewAllLabel}
        </Link>
      )}
    </div>
    <div className="dash-card-body">{children}</div>
  </div>
);

const EmptySlate = ({ icon, text }) => (
  <div className="dash-empty-slate">
    <div className="dash-empty-icon">{icon}</div>
    <p
      style={{
        color: "var(--muted)",
        fontSize: 13,
        margin: 0,
        lineHeight: 1.5,
      }}
    >
      {text}
    </p>
  </div>
);

// ─── Today's Appointments ─────────────────────────────────────────────────────
const TodayAppointments = ({ appts, loading, pendingCount }) => (
  <DashCard
    title="Today's Appointments"
    subtitle={loading ? null : `${appts.length} scheduled`}
    badge={pendingCount}
    viewAllTo="/appointments"
  >
    {loading ? (
      [0, 1, 2, 3].map((i) => <AppointmentRowSkeleton key={i} />)
    ) : appts.length === 0 ? (
      <EmptySlate
        icon={
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        }
        text="No appointments scheduled for today"
      />
    ) : (
      appts.map((a) => (
        <div key={a.id} className="appt-row">
          {/* Time column */}
          <div style={{ textAlign: "center", minWidth: 52, flexShrink: 0 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: "var(--royal)",
                display: "block",
                lineHeight: 1.2,
              }}
            >
              {a.time}
            </span>
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: STATUS_DOT[a.status] || "#888",
                display: "inline-block",
                marginTop: 4,
              }}
            />
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                fontSize: 13,
                fontWeight: 700,
                margin: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {a.patient}
            </p>
            <span
              style={{
                fontSize: 11,
                color: "var(--muted)",
                display: "block",
                marginTop: 2,
              }}
            >
              {a.vet || "Grooming Team"} · {a.purpose}
            </span>
            {a.owner && (
              <span style={{ fontSize: 11, color: "var(--muted)" }}>
                Owner: {a.owner}
              </span>
            )}
          </div>

          {/* Badge */}
          <div style={{ flexShrink: 0, textAlign: "right" }}>
            <span
              className={`badge ${STATUS_BADGE[a.status] || "badge-gray"}`}
              style={{ fontSize: 10 }}
            >
              {a.status}
            </span>
            {a.status === "Pending" && (
              <p
                style={{
                  margin: "3px 0 0",
                  fontSize: 10,
                  color: "#d97706",
                  fontWeight: 600,
                }}
              >
                <span className="pending-dot" style={{ marginRight: 4 }} />
                Awaiting
              </p>
            )}
          </div>
        </div>
      ))
    )}
  </DashCard>
);

// ─── Today's Walk-ins ─────────────────────────────────────────────────────────
const TodayWalkins = ({ walkins, loading }) => (
  <DashCard
    title="Today's Walk-ins"
    subtitle={loading ? null : `${walkins.length} walk-ins today`}
    viewAllTo="/walk-in"
  >
    {loading ? (
      [0, 1, 2, 3].map((i) => <WalkinRowSkeleton key={i} />)
    ) : walkins.length === 0 ? (
      <EmptySlate
        icon={
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          >
            <circle cx="12" cy="5" r="2" />
            <path d="M9 12l-2 7M15 12l2 7M9 12h6M9 12l-1-4M15 12l1-4" />
          </svg>
        }
        text="No walk-ins recorded for today"
      />
    ) : (
      walkins.map((w, i) => {
        const name = w.patient_name || w.pet_name || "—";
        const initial = (w.patient_name || w.owner_name || "?")
          .charAt(0)
          .toUpperCase();
        return (
          <div key={w.id || i} className="walkin-row">
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                flexShrink: 0,
                background: "linear-gradient(135deg,#dbeafe,#bfdbfe)",
                color: "#1e3a8a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 15,
                fontWeight: 800,
              }}
            >
              {initial}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  margin: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {name}
              </p>
              <span style={{ fontSize: 11, color: "var(--muted)" }}>
                {w.owner_name || w.client_name || "Walk-in client"}
                {w.purpose ? ` · ${w.purpose}` : ""}
              </span>
            </div>
            <span
              style={{ fontSize: 11, color: "var(--muted)", flexShrink: 0 }}
            >
              {w.time ||
                (w.created_at
                  ? new Date(w.created_at).toLocaleTimeString("en", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "")}
            </span>
          </div>
        );
      })
    )}
  </DashCard>
);

// ─── Main Dashboard Component ─────────────────────────────────────────────────
const Dashboard = () => {
  const {
    user,
    isAdmin,
    isManager,
    isEmployee,
    seeAllBranches,
    loading: userLoading,
  } = useCurrentUser();
  const { applyFilter } = useBranchFilter();

  const location = useLocation();
  const [stats, setStats] = useState({
    patients: 0,
    appointments: 0,
    inventory: 0,
    sales: 0,
    messages: 0,
    pendingAppts: 0,
    walkins: 0,
  });
  const [todayAppts, setTodayAppts] = useState([]);
  const [todayWalkins, setTodayWalkins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [time, setTime] = useState(new Date());
  const [branchFilter, setBranchFilter] = useState("");
  const [branches, setBranches] = useState([]);

  // ── Clock ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // ── Fetch branches ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!seeAllBranches) return;
    supabase
      .from("branches")
      .select("id, name")
      .then(({ data }) => setBranches(data || []));
  }, [seeAllBranches]);

  const today = new Date().toISOString().split("T")[0];

  // ── Fetch dashboard data ───────────────────────────────────────────────────
  useEffect(() => {
    if (user)
      logActivity(user, "Viewed dashboard", "Opened the main dashboard");
  }, []);

  const fetchDashboard = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const patientsQ = applyFilter(
        supabase.from("patients").select("id", { count: "exact", head: true }),
      );
      const inventoryQ = applyFilter(
        supabase.from("inventory").select("id,qty,threshold"),
      );
      const transactionsQ = applyFilter(
        supabase.from("transactions").select("total").gte("created_at", today),
      );
      const addBranchOverride = (q) => {
        if (seeAllBranches && branchFilter)
          return q.eq("branch_id", branchFilter);
        return q;
      };

      const [patients, inventory, transactions] = await Promise.all([
        addBranchOverride(patientsQ),
        addBranchOverride(inventoryQ),
        addBranchOverride(transactionsQ),
      ]);

      const [{ count: sameUnread }, { count: crossUnread }] = await Promise.all(
        [
          supabase
            .from("messages")
            .select("id", { count: "exact", head: true })
            .eq("receiver_id", user.id)
            .eq("is_read", false),
          supabase
            .from("cross_branch_messages")
            .select("id", { count: "exact", head: true })
            .eq("recipient_id", user.id)
            .eq("is_read", false),
        ],
      );
      const messages = { count: (sameUnread || 0) + (crossUnread || 0) };

      const todaySales = (transactions.data || []).reduce(
        (s, t) => s + Number(t.total || 0),
        0,
      );
      const lowStockCount = (inventory.data || []).filter(
        (i) => i.qty <= (i.threshold ?? 10),
      ).length;

      let apptQ = supabase
        .from("appointments")
        .select("*")
        .eq("date", today)
        .order("time", { ascending: true });
      apptQ = applyFilter(apptQ);
      if (seeAllBranches && branchFilter)
        apptQ = apptQ.eq("branch_id", branchFilter);
      const { data: appts } = await apptQ;
      const apptList = appts || [];
      setTodayAppts(apptList);

      let wkQ = supabase
        .from("walkins")
        .select("*")
        .gte("created_at", `${today}T00:00:00`)
        .lte("created_at", `${today}T23:59:59`)
        .order("created_at", { ascending: true });
      wkQ = applyFilter(wkQ);
      if (seeAllBranches && branchFilter)
        wkQ = wkQ.eq("branch_id", branchFilter);
      const { data: wk } = await wkQ;
      const walkinList = wk || [];
      setTodayWalkins(walkinList);

      setStats({
        patients: patients.count || 0,
        appointments: apptList.length,
        inventory: lowStockCount,
        sales: todaySales,
        messages: messages.count || 0,
        pendingAppts: apptList.filter((a) => a.status === "Pending").length,
        walkins: walkinList.length,
      });
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!userLoading && user) fetchDashboard();
  }, [userLoading, user, branchFilter]);

  // ── Keep "Unread Messages" live: recompute whenever a message of ours
  // gets inserted or flipped to read (e.g. from the Messages page) ──
  useEffect(() => {
    if (!user?.id) return;

    const recomputeUnread = async () => {
      const [{ count: sameUnread }, { count: crossUnread }] =
        await Promise.all([
          supabase
            .from("messages")
            .select("id", { count: "exact", head: true })
            .eq("receiver_id", user.id)
            .eq("is_read", false),
          supabase
            .from("cross_branch_messages")
            .select("id", { count: "exact", head: true })
            .eq("recipient_id", user.id)
            .eq("is_read", false),
        ]);
      setStats((prev) => ({
        ...prev,
        messages: (sameUnread || 0) + (crossUnread || 0),
      }));
    };

    const ch = supabase
      .channel(`dash-unread-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${user.id}`,
        },
        () => recomputeUnread(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "cross_branch_messages",
          filter: `recipient_id=eq.${user.id}`,
        },
        () => recomputeUnread(),
      )
      .subscribe();

    return () => supabase.removeChannel(ch);
  }, [user?.id]);

  // ── Stat cards ────────────────────────────────────────────────────────────
  const STAT_CARDS = useMemo(() => {
    const cardPatients = {
      label: "Active Patients",
      value: stats.patients,
      icon: "/icon/active_acc.png",
      color: "purple",
      sub: "Total registered",
      subColor: "var(--muted)",
      to: "/patient-records",
      trend: null,
    };
    const cardLowStock = {
      label: "Low Stock Items",
      value: stats.inventory,
      icon: "/icon/warning.png",
      color: "yellow",
      sub: stats.inventory > 0 ? "Reorder needed" : "All stocked",
      subColor: stats.inventory > 0 ? "#dc2626" : "#16a34a",
      subIcon:
        stats.inventory > 0 ? (
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
        ) : (
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ),
      to: "/inventory",
    };
    const cardMessages = {
      label: "Unread Messages",
      value: stats.messages,
      icon: "/icon/chat_bubble.png",
      color: "blue",
      sub: "From clients",
      subColor: "var(--muted)",
      to: "/messages",
    };
    const cardAppointments = {
      label: "Today's Appointments",
      value: stats.appointments,
      icon: "/icon/appointment.png",
      color: "blue",
      sub: `${stats.pendingAppts} pending approval`,
      subColor: stats.pendingAppts > 0 ? "#d97706" : "var(--muted)",
      subIcon:
        stats.pendingAppts > 0 ? (
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
        ) : null,
      to: "/appointments",
    };
    const cardPending = {
      label: "Pending Approvals",
      value: stats.pendingAppts,
      icon: "/icon/pending.png",
      color: "yellow",
      sub: stats.pendingAppts > 0 ? "Needs attention" : "All cleared",
      subColor: stats.pendingAppts > 0 ? "#dc2626" : "#16a34a",
      subIcon:
        stats.pendingAppts > 0 ? (
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
        ) : (
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ),
      to: "/appointments",
    };
    const cardSales = {
      label: "Today's Sales",
      value: `₱${stats.sales.toLocaleString()}`,
      icon: "/icon/money_bag.png",
      color: "green",
      sub: "Revenue today",
      subColor: "#16a34a",
      subIcon: (
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <line x1="12" y1="19" x2="12" y2="5" />
          <polyline points="5 12 12 5 19 12" />
        </svg>
      ),
      to: "/point-of-sale",
    };
    const cardWalkins = {
      label: "Today's Walk-ins",
      value: stats.walkins,
      icon: "/icon/walkin.png",
      color: "blue",
      sub: "Walk-ins recorded",
      subColor: "var(--muted)",
      to: "/walk-in",
    };

    if (isAdmin)
      return [
        cardAppointments,
        cardPending,
        cardSales,
        cardPatients,
        cardLowStock,
        cardMessages,
      ];
    if (isManager)
      return [
        cardAppointments,
        cardPending,
        cardSales,
        cardPatients,
        cardLowStock,
        cardMessages,
      ];
    return [
      cardAppointments,
      cardPending,
      cardPatients,
      cardLowStock,
      cardMessages,
    ];
  }, [stats, isAdmin, isManager]);

  // ── Quick access links ─────────────────────────────────────────────────────
  const QUICK_LINKS = useMemo(
    () =>
      getNavLinks(user?.role || "", user?.branchId ?? null)
        .filter((link) => link.href && link.href !== "/dashboard")
        .map((link) => ({
          label: link.label,
          icon: ROUTE_ICON_MAP[link.href] || link.icon,
          to: link.href,
        })),
    [user],
  );

  const showPendingBanner = stats.pendingAppts > 0;

  const dateStr = time.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeStr = time.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const greeting = time.getHours() < 12 ? "Good day" : "Good night";

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (userLoading) {
    return (
      <Layout>
        <div className="dash-page-wrap">
          <div className="dash-page-inner">
            <div
              style={{
                background: "linear-gradient(135deg,#1a1a6e,#1e3a8a,#3b5fc0)",
                borderRadius: 18,
                padding: "28px 32px",
                marginBottom: 24,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                <div
                  className="sk"
                  style={{
                    width: 280,
                    height: 24,
                    borderRadius: 8,
                    background: "rgba(255,255,255,0.15)",
                  }}
                />
                <div
                  className="sk"
                  style={{
                    width: 360,
                    height: 14,
                    borderRadius: 6,
                    background: "rgba(255,255,255,0.10)",
                  }}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  alignItems: "flex-end",
                }}
              >
                <div
                  className="sk"
                  style={{
                    width: 200,
                    height: 16,
                    borderRadius: 6,
                    background: "rgba(255,255,255,0.15)",
                  }}
                />
                <div
                  className="sk"
                  style={{
                    width: 110,
                    height: 13,
                    borderRadius: 6,
                    background: "rgba(255,255,255,0.10)",
                  }}
                />
              </div>
            </div>
            <div
              className="sk"
              style={{
                width: 80,
                height: 11,
                borderRadius: 4,
                marginBottom: 14,
              }}
            />
            <div className="dash-stat-grid">
              {Array.from({ length: 6 }).map((_, i) => (
                <StatCardSkeleton key={i} />
              ))}
            </div>
            <div
              className="sk"
              style={{
                width: 100,
                height: 11,
                borderRadius: 4,
                marginBottom: 14,
              }}
            />
            <div className="dash-quick-grid">
              {Array.from({ length: 6 }).map((_, i) => (
                <QuickLinkSkeleton key={i} />
              ))}
            </div>
            <div className="dash-bottom-grid">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  style={{
                    background: "var(--card)",
                    border: "1.5px solid var(--border)",
                    borderRadius: 16,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      padding: "16px 20px",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    <div
                      className="sk"
                      style={{ width: 150, height: 14, borderRadius: 6 }}
                    />
                  </div>
                  {[0, 1, 2, 3].map((j) => (
                    <AppointmentRowSkeleton key={j} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="dash-page-wrap">
        <div className="dash-page-inner">
          {/* ── Hero header ───────────────────────────────────────────────── */}
          <div
            className="dash-fade-in"
            style={{
              background:
                "linear-gradient(135deg,#0f0c4a 0%,#1e3a8a 55%,#2d5fbf 100%)",
              borderRadius: 18,
              padding: "28px 32px",
              marginBottom: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 16,
              position: "relative",
              overflow: "hidden",
              boxShadow: "0 8px 32px rgba(30,58,138,0.18)",
            }}
          >
            {/* Decorative circles */}
            <div
              style={{
                position: "absolute",
                top: -60,
                right: -60,
                width: 260,
                height: 260,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.04)",
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: -40,
                right: 120,
                width: 160,
                height: 160,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.03)",
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: 20,
                right: "38%",
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "rgba(125,211,252,0.5)",
                pointerEvents: "none",
              }}
            />

            <div style={{ position: "relative", zIndex: 1 }}>
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "rgba(125,211,252,0.8)",
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                  margin: "0 0 6px",
                }}
              >
                ANGELES ANIMAL CARE HOSPITAL
              </p>
              <h1
                style={{
                  fontSize: 24,
                  fontWeight: 800,
                  color: "#fff",
                  margin: 0,
                  lineHeight: 1.2,
                }}
              >
                {greeting},{" "}
                <span
                  style={{
                    background: "linear-gradient(90deg,#7dd3fc,#bae6fd)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  {user?.firstName || user?.email?.split("@")[0] || "Staff"}
                </span>
              </h1>
              <p
                style={{
                  fontSize: 13.5,
                  color: "rgba(255,255,255,0.55)",
                  margin: "8px 0 0",
                }}
              >
                Here's a snapshot of everything happening today.
              </p>
            </div>

            <div
              style={{ textAlign: "right", position: "relative", zIndex: 1 }}
            >
              <strong
                style={{
                  display: "block",
                  fontSize: 15,
                  color: "#fff",
                  fontWeight: 700,
                  marginBottom: 4,
                }}
              >
                {dateStr}
              </strong>
              <span
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  fontVariantNumeric: "tabular-nums",
                  background: "linear-gradient(90deg,#7dd3fc,#93c5fd)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  letterSpacing: 1,
                }}
              >
                {timeStr}
              </span>
            </div>
          </div>

          {/* ── Pending appointments banner ───────────────────────────────── */}
          {showPendingBanner && (
            <div
              className="dash-fade-in"
              style={{
                background: "linear-gradient(135deg,#fffbeb,#fef3c7)",
                border: "1.5px solid #fde68a",
                borderRadius: 14,
                padding: "14px 20px",
                marginBottom: 24,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                boxShadow: "0 2px 12px rgba(217,119,6,0.10)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    flexShrink: 0,
                    background: "rgba(217,119,6,0.12)",
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
                    {stats.pendingAppts} Appointment
                    {stats.pendingAppts > 1 ? "s" : ""} Awaiting Approval
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 12,
                      color: "#b45309",
                      marginTop: 2,
                    }}
                  >
                    Review and approve pending appointment requests.
                  </p>
                </div>
              </div>
              <Link
                to="/appointments"
                style={{
                  padding: "9px 20px",
                  background: "linear-gradient(135deg,#d97706,#b45309)",
                  color: "#fff",
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 700,
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                  boxShadow: "0 2px 8px rgba(180,83,9,0.25)",
                }}
              >
                Review Now →
              </Link>
            </div>
          )}

          {/* ── Overview ──────────────────────────────────────────────────── */}
          <p className="dash-section-label">Overview</p>
          <div className="dash-stat-grid">
            {loading
              ? STAT_CARDS.map((_, i) => <StatCardSkeleton key={i} />)
              : STAT_CARDS.map((sc, i) => (
                  <Link
                    key={i}
                    to={sc.to}
                    className={`stat-card-v2 ${sc.color} dash-fade-in`}
                    style={{ animationDelay: `${i * 0.06}s` }}
                  >
                    {/* Top row: icon only */}
                    <div style={{ display: "flex", alignItems: "flex-start" }}>
                      <div className={`stat-icon-v2 ${sc.color}`}>
                        <img
                          src={sc.icon}
                          alt=""
                          style={{ width: 24, height: 24 }}
                        />
                      </div>
                    </div>

                    {/* Value + label */}
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
                          color: sc.subColor,
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        {sc.subIcon && (
                          <span
                            style={{
                              display: "flex",
                              alignItems: "center",
                              flexShrink: 0,
                            }}
                          >
                            {sc.subIcon}
                          </span>
                        )}
                        {sc.sub}
                      </span>
                    </div>
                  </Link>
                ))}
          </div>

          {/* ── Quick Access ──────────────────────────────────────────────── */}
          <p className="dash-section-label">Quick Access</p>
          <div className="dash-quick-grid">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <QuickLinkSkeleton key={i} />
                ))
              : QUICK_LINKS.map((ql, i) => (
                  <Link
                    key={ql.to}
                    to={ql.to}
                    className="quick-link-v2 dash-fade-in"
                    style={{ animationDelay: `${i * 0.05}s` }}
                  >
                    <div className="ql-icon-wrap">
                      <img
                        src={ql.icon}
                        alt=""
                        className="ql-icon-img"
                        style={{
                          width: 22,
                          height: 22,
                          filter:
                            "brightness(0) saturate(100%) invert(17%) sepia(82%) saturate(1200%) hue-rotate(210deg)",
                        }}
                      />
                    </div>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--muted)",
                        lineHeight: 1.3,
                      }}
                    >
                      {ql.label}
                    </span>
                  </Link>
                ))}
          </div>

          {/* ── Two bottom cards ──────────────────────────────────────────── */}
          <div className="dash-bottom-grid">
            <TodayAppointments
              appts={todayAppts}
              loading={loading}
              pendingCount={stats.pendingAppts}
            />
            <TodayWalkins walkins={todayWalkins} loading={loading} />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
