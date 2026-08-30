import React, { useState, useEffect, useRef, useCallback } from "react";
import ReactDOM from "react-dom";
import Layout from "../../components/layout";
import { supabase } from "../../js/Utils/supabase";
import { useCurrentUser } from "../../js/hooks/Usecurrentuser";
import { logActivity } from "../../js/Utils/logActivity";
import "../../styles/Report.css";

// ─── Custom dropdown (matches Appointments.jsx) ───────────────────────────────
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
                  className="report-select-option"
                  onMouseEnter={(e) => {
                    if (!isSelected && !opt.disabled && !isEmpty)
                      e.currentTarget.classList.add("hover");
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.classList.remove("hover");
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
        className="report-select-trigger"
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

// ─── Animated bar component ───────────────────────────────────────────────────
function AnimatedBar({ heightPct, color, delay = 0, label, valueLabel }) {
  const barRef = useRef(null);
  const [grown, setGrown] = useState(false);

  useEffect(() => {
    setGrown(false);
    const timer = setTimeout(() => setGrown(true), 60 + delay);
    return () => clearTimeout(timer);
  }, [heightPct, delay]);

  const barH = Math.max(4, heightPct * 148);

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        minWidth: 0,
      }}
    >
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: "var(--muted)",
          height: 14,
          lineHeight: "14px",
          opacity: grown && heightPct > 0 ? 1 : 0,
          transform:
            grown && heightPct > 0 ? "translateY(0)" : "translateY(4px)",
          transition: `opacity 0.3s ${delay + 200}ms, transform 0.3s ${delay + 200}ms`,
        }}
      >
        {valueLabel}
      </span>

      <div
        ref={barRef}
        style={{
          width: "100%",
          background: color,
          borderRadius: "5px 5px 2px 2px",
          height: `${barH}px`,
          transformOrigin: "bottom center",
          transform: grown ? "scaleY(1)" : "scaleY(0)",
          opacity: grown ? 1 : 0,
          transition: `transform 0.52s cubic-bezier(0.34,1.28,0.64,1) ${delay}ms, opacity 0.3s ease ${delay}ms`,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.18) 0%, transparent 60%)",
            borderRadius: "inherit",
          }}
        />
      </div>

      <span
        style={{
          fontSize: 10,
          color: "var(--muted)",
          textAlign: "center",
          lineHeight: 1.2,
        }}
      >
        {label}
      </span>
    </div>
  );
}

// ─── Animated count-up number ─────────────────────────────────────────────────
function CountUp({ value, prefix = "", suffix = "", duration = 800 }) {
  const [display, setDisplay] = useState(0);
  const startRef = useRef(null);
  const fromRef = useRef(0);

  useEffect(() => {
    fromRef.current = 0;
    setDisplay(0);
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      const cur = fromRef.current + (value - fromRef.current) * ease;
      setDisplay(cur);
      if (p < 1) startRef.current = requestAnimationFrame(tick);
      else {
        setDisplay(value);
        fromRef.current = value;
      }
    };
    startRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(startRef.current);
  }, [value, duration]);

  const formatted =
    typeof value === "number" && value >= 1000
      ? display.toLocaleString("en-PH", { maximumFractionDigits: 0 })
      : Math.round(display).toLocaleString();

  return (
    <>
      {prefix}
      {formatted}
      {suffix}
    </>
  );
}

// ─── Toast notification (stacked) ─────────────────────────────────────────────
function ToastItem({ message, show, type = "success" }) {
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
}

function ToastStack({ toasts }) {
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
        <ToastItem key={t.id} message={t.message} show={t.show} type={t.type} />
      ))}
    </div>
  );
}

// ─── Main Report Component ────────────────────────────────────────────────────
const Report = () => {
  const {
    user,
    isAdmin,
    isSuperAdmin,
    isManager,
    seeAllBranches,
    loading: userLoading,
  } = useCurrentUser();
  const isAdminLevel = isAdmin || isSuperAdmin;

  const [range, setRange] = useState("This Week");
  const [branchFilter, setBranchFilter] = useState("");
  const [branches, setBranches] = useState([]);
  const [stats, setStats] = useState({
    appointments: 0,
    sales: 0,
    patients: 0,
    lowStock: 0,
  });
  const [salesData, setSalesData] = useState([]);
  const [apptData, setApptData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState("");
  const [exportProgress, setExportProgress] = useState(0);
  const exportTimerRef = useRef(null);
  const [animKey, setAnimKey] = useState(0);
  const [pdfDownloaded, setPdfDownloaded] = useState(false);
  const [excelDownloaded, setExcelDownloaded] = useState(false);
  const [toasts, setToasts] = useState([]);
  const toastIdRef = useRef(0);
  const [dialog, setDialog] = useState({
    show: false,
    message: "",
    title: "",
    onConfirm: null,
  });
  const [showAllTx, setShowAllTx] = useState(false);
  const [allTransactions, setAllTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(false);
  const [branchStats, setBranchStats] = useState([]);
  const [branchStatsLoading, setBranchStatsLoading] = useState(false);

  const fetchBranchComparison = useCallback(async () => {
    if (!isAdminLevel || !seeAllBranches) return;
    setBranchStatsLoading(true);
    const { data: allBranches } = await supabase
      .from("branches")
      .select("id, name")
      .order("name");
    const results = await Promise.all(
      (allBranches || []).map(async (b) => {
        const [tx, appts, pat] = await Promise.all([
          supabase
            .from("transactions")
            .select("total,status")
            .eq("branch_id", b.id),
          supabase
            .from("appointments")
            .select("id", { count: "exact" })
            .eq("branch_id", b.id),
          supabase
            .from("patients")
            .select("id", { count: "exact" })
            .eq("branch_id", b.id)
            .is("deleted_at", null),
        ]);
        const activeTx = (tx.data || []).filter((t) => t.status !== "Voided");
        return {
          id: b.id,
          name: b.name,
          sales: activeTx.reduce((s, t) => s + Number(t.total || 0), 0),
          voided: (tx.data || []).length - activeTx.length,
          appointments: appts.count || 0,
          patients: pat.count || 0,
        };
      }),
    );
    setBranchStats(results.sort((a, b) => b.sales - a.sales));
    setBranchStatsLoading(false);
  }, [isAdminLevel, seeAllBranches]);

  useEffect(() => {
    fetchBranchComparison();
  }, [fetchBranchComparison]);

  const fetchAllTransactions = useCallback(async () => {
    setTxLoading(true);
    let q = supabase
      .from("transactions")
      .select("*")
      .order("created_at", { ascending: false });
    if (!seeAllBranches && user?.branchId) q = q.eq("branch_id", user.branchId);
    if (seeAllBranches && branchFilter) q = q.eq("branch_id", branchFilter);
    const { data, error } = await q;
    if (!error) setAllTransactions(data || []);
    setTxLoading(false);
  }, [user, seeAllBranches, branchFilter]);

  const showToast = (message, type = "success") => {
    const id = ++toastIdRef.current;
    setToasts((t) => [...t, { id, message, type, show: false }]);

    // trigger enter animation next tick
    requestAnimationFrame(() => {
      setToasts((t) => t.map((x) => (x.id === id ? { ...x, show: true } : x)));
    });

    // start exit after 3s, remove after transition finishes
    setTimeout(() => {
      setToasts((t) => t.map((x) => (x.id === id ? { ...x, show: false } : x)));
      setTimeout(() => {
        setToasts((t) => t.filter((x) => x.id !== id));
      }, 340);
    }, 3000);
  };

  const showConfirm = (message, onConfirm, title = "Download Again?") =>
    setDialog({ show: true, message, title, onConfirm });

  // ── Fetch available branches for admin dropdown ────────────────────────────
  useEffect(() => {
    if (!seeAllBranches) return;
    const fetchBranches = async () => {
      const { data } = await supabase
        .from("branches")
        .select("id, name")
        .order("name");
      setBranches(data || []);
    };
    fetchBranches();
  }, [seeAllBranches]);

  const fetchReports = useCallback(async () => {
    if (userLoading || !user) return;
    setLoading(true);

    const now = new Date();
    let startDate;

    if (range === "Today") {
      startDate = new Date(now.toDateString());
    } else if (range === "This Week") {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
    } else if (range === "This Month") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      startDate = new Date(now.getFullYear(), 0, 1);
    }

    const startStr = startDate.toISOString();

    try {
      // ── Build branch-filtered queries ──────────────────────────────────────
      let qAppts = supabase
        .from("appointments")
        .select("*")
        .gte("created_at", startStr);
      let qTx = supabase
        .from("transactions")
        .select("*")
        .gte("created_at", startStr);
      let qPat = supabase.from("patients").select("id", { count: "exact" });
      let qInv = supabase.from("inventory").select("id,qty,threshold");

      if (!seeAllBranches && user?.branchId) {
        qAppts = qAppts.eq("branch_id", user.branchId);
        qTx = qTx.eq("branch_id", user.branchId);
        qPat = qPat.eq("branch_id", user.branchId);
        qInv = qInv.eq("branch_id", user.branchId);
      }
      if (seeAllBranches && branchFilter) {
        qAppts = qAppts.eq("branch_id", branchFilter);
        qTx = qTx.eq("branch_id", branchFilter);
        qPat = qPat.eq("branch_id", branchFilter);
        qInv = qInv.eq("branch_id", branchFilter);
      }

      const [appts, tx, patients, inventory] = await Promise.all([
        qAppts,
        qTx,
        qPat,
        qInv,
      ]);

      setStats({
        appointments: (appts.data || []).length,
        sales: (tx.data || []).reduce((s, t) => s + Number(t.total || 0), 0),
        patients: patients.count || 0,
        lowStock: (inventory.data || []).filter(
          (i) => i.qty <= (i.threshold ?? 10),
        ).length,
      });

      const last7 = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return d.toISOString().split("T")[0];
      });

      setSalesData(
        last7.map((date) => ({
          date,
          total: (tx.data || [])
            .filter((t) => t.created_at?.startsWith(date))
            .reduce((s, t) => s + Number(t.total || 0), 0),
        })),
      );

      setApptData(
        last7.map((date) => ({
          date,
          count: (appts.data || []).filter(
            (a) => (a.date || a.created_at?.split("T")[0]) === date,
          ).length,
        })),
      );

      setAnimKey((k) => k + 1);
      setPdfDownloaded(false);
      setExcelDownloaded(false);
    } catch (err) {
      console.error(err);
    }

    setLoading(false);
  }, [range, user, userLoading, seeAllBranches, branchFilter]);

  useEffect(() => {
    if (userLoading || !user) return;
    fetchReports();

    const channels = [
      supabase
        .channel("report-appointments")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "appointments" },
          () => fetchReports(),
        )
        .subscribe(),
      supabase
        .channel("report-transactions")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "transactions" },
          () => fetchReports(),
        )
        .subscribe(),
      supabase
        .channel("report-patients")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "patients" },
          () => fetchReports(),
        )
        .subscribe(),
      supabase
        .channel("report-inventory")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "inventory" },
          () => fetchReports(),
        )
        .subscribe(),
    ];

    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch));
    };
  }, [range, user, userLoading, seeAllBranches, branchFilter, fetchReports]);

  // ── Resolve display branch label ───────────────────────────────────────────
  const branchLabel = (() => {
    if (!seeAllBranches)
      return user?.branchId ? `Branch ${user.branchId}` : "My Branch";
    if (branchFilter)
      return (
        branches.find((b) => b.id === branchFilter)?.name ?? "Selected Branch"
      );
    return "All Branches";
  })();

  // ── PDF Export ──────────────────────────────────────────────────────────────
  const handleExportPDF = () => {
    if (pdfDownloaded) {
      showConfirm(
        "You already downloaded this PDF report. Download it again?",
        runExportPDF,
        "Download Again?",
      );
      return;
    }
    runExportPDF();
  };

  const startExportProgress = () => {
    setExportProgress(0);
    if (exportTimerRef.current) clearInterval(exportTimerRef.current);
    exportTimerRef.current = setInterval(() => {
      setExportProgress((p) => {
        if (p >= 90) return p;
        const step =
          p < 50
            ? 6 + Math.random() * 6
            : p < 75
              ? 3 + Math.random() * 3
              : 1 + Math.random() * 2;
        return Math.min(90, p + step);
      });
    }, 160);
  };

  const finishExportProgress = () => {
    if (exportTimerRef.current) {
      clearInterval(exportTimerRef.current);
      exportTimerRef.current = null;
    }
    setExportProgress(100);
  };

  const runExportPDF = async () => {
    setExporting("pdf");
    startExportProgress();
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");
      const doc = new jsPDF();
      const now = new Date().toLocaleDateString("en-PH", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 58, 138);
      doc.text("Angeles Animal Care Hospital", 105, 18, { align: "center" });
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text(`${branchLabel} — Management Reports`, 105, 25, {
        align: "center",
      });
      doc.setFontSize(10);
      doc.text(`Report Range: ${range} | Generated: ${now}`, 105, 32, {
        align: "center",
      });
      doc.setDrawColor(200, 210, 232);
      doc.line(14, 36, 196, 36);
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 41, 59);
      doc.text("Summary Overview", 14, 44);
      autoTable(doc, {
        startY: 48,
        head: [["Metric", "Value"]],
        body: [
          ["Appointments", String(stats.appointments)],
          ["Total Sales", `PHP ${stats.sales.toLocaleString()}`],
          ["Total Patients", String(stats.patients)],
          ["Low Stock Items", String(stats.lowStock)],
        ],
        headStyles: {
          fillColor: [30, 58, 138],
          textColor: 255,
          fontStyle: "bold",
        },
        alternateRowStyles: { fillColor: [240, 245, 255] },
        styles: { fontSize: 11, cellPadding: 5 },
        columnStyles: { 0: { fontStyle: "bold" }, 1: { halign: "right" } },
        margin: { left: 14, right: 14 },
      });
      const sY = doc.lastAutoTable.finalY + 12;
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text("Sales — Last 7 Days", 14, sY);
      autoTable(doc, {
        startY: sY + 4,
        head: [["Date", "Day", "Total Sales (PHP)"]],
        body: salesData.map((d) => [
          d.date,
          new Date(d.date).toLocaleDateString("en", { weekday: "long" }),
          `PHP ${d.total.toLocaleString()}`,
        ]),
        headStyles: { fillColor: [30, 58, 138], textColor: 255 },
        alternateRowStyles: { fillColor: [240, 245, 255] },
        styles: { fontSize: 10, cellPadding: 4 },
        columnStyles: { 2: { halign: "right" } },
        margin: { left: 14, right: 14 },
      });
      const aY = doc.lastAutoTable.finalY + 12;
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text("Appointments — Last 7 Days", 14, aY);
      autoTable(doc, {
        startY: aY + 4,
        head: [["Date", "Day", "Appointments"]],
        body: apptData.map((d) => [
          d.date,
          new Date(d.date).toLocaleDateString("en", { weekday: "long" }),
          String(d.count),
        ]),
        headStyles: { fillColor: [34, 197, 94], textColor: 255 },
        alternateRowStyles: { fillColor: [240, 253, 244] },
        styles: { fontSize: 10, cellPadding: 4 },
        columnStyles: { 2: { halign: "right" } },
        margin: { left: 14, right: 14 },
      });
      const pc = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pc; i++) {
        doc.setPage(i);
        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.text(`Page ${i} of ${pc}`, 105, 290, { align: "center" });
        doc.text("Angeles Animal Care Hospital — Confidential", 14, 290);
      }
      doc.save(
        `Report_${range.replace(/ /g, "")}_${now.replace(/ /g, "")}.pdf`,
      );
      logActivity(user, "Exported report", `Downloaded PDF — ${range}`);
      setPdfDownloaded(true);
      finishExportProgress();
      showToast("PDF report downloaded successfully!", "success");
    } catch (err) {
      console.error(err);
      finishExportProgress();
      showToast("PDF export failed. Please try again.", "error");
    } finally {
      setTimeout(() => {
        setExporting("");
        setExportProgress(0);
      }, 450);
    }
  };

  // ── Excel Export ────────────────────────────────────────────────────────────
  const handleExportExcel = () => {
    if (excelDownloaded) {
      showConfirm(
        "You already downloaded this Excel report. Download it again?",
        runExportExcel,
        "Download Again?",
      );
      return;
    }
    runExportExcel();
  };

  const runExportExcel = async () => {
    setExporting("excel");
    startExportProgress();
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.aoa_to_sheet([
          ["Angeles Animal Care Hospital — Report"],
          [`Branch: ${branchLabel}`],
          [`Range: ${range}`],
          [`Generated: ${new Date().toLocaleDateString()}`],
          [],
          ["Metric", "Value"],
          ["Appointments", stats.appointments],
          ["Total Sales", stats.sales],
          ["Total Patients", stats.patients],
          ["Low Stock Items", stats.lowStock],
        ]),
        "Summary",
      );
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.aoa_to_sheet([
          ["Date", "Day", "Total Sales (₱)"],
          ...salesData.map((d) => [
            d.date,
            new Date(d.date).toLocaleDateString("en", { weekday: "long" }),
            d.total,
          ]),
        ]),
        "Sales",
      );
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.aoa_to_sheet([
          ["Date", "Day", "Appointments"],
          ...apptData.map((d) => [
            d.date,
            new Date(d.date).toLocaleDateString("en", { weekday: "long" }),
            d.count,
          ]),
        ]),
        "Appointments",
      );
      XLSX.writeFile(
        wb,
        `Report_${range.replace(/ /g, "_")}_${branchLabel.replace(/ /g, "_")}.xlsx`,
      );
      logActivity(user, "Exported report", `Downloaded Excel — ${range}`);
      setExcelDownloaded(true);
      finishExportProgress();
      showToast("Excel report downloaded successfully!", "success");
    } catch (err) {
      console.error(err);
      finishExportProgress();
      showToast("Excel export failed. Please try again.", "error");
    } finally {
      setTimeout(() => {
        setExporting("");
        setExportProgress(0);
      }, 450);
    }
  };

  // ── Derived chart values ────────────────────────────────────────────────────
  const maxSales = Math.max(...salesData.map((d) => d.total), 1);
  const maxAppts = Math.max(...apptData.map((d) => d.count), 1);
  const totalSalesWeek = salesData.reduce((s, d) => s + d.total, 0);
  const totalApptsWeek = apptData.reduce((s, d) => s + d.count, 0);

  const RANGE_COLORS = {
    Today: { bg: "#eff6ff", text: "#1e40af", border: "#bfdbfe" },
    "This Week": { bg: "#f0fdf4", text: "#166534", border: "#bbf7d0" },
    "This Month": { bg: "#faf5ff", text: "#6b21a8", border: "#e9d5ff" },
    "This Year": { bg: "#fff7ed", text: "#9a3412", border: "#fed7aa" },
  };
  const rc = RANGE_COLORS[range] || RANGE_COLORS["This Week"];

  const S = {
    page: { width: "100%", minHeight: "100vh", display: "block" },
    topbar: {
      background: "var(--card)",
      borderBottom: "1px solid var(--border)",
      padding: "14px 28px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      position: "fixed",
      top: 68,
      left: "var(--current-sidebar-w, 62px)",
      right: 0,
      zIndex: 40,
      boxSizing: "border-box",
      gap: 12,
    },
    card: {
      background: "var(--card)",
      borderRadius: "var(--radius-lg)",
      border: "1px solid var(--border)",
      boxShadow: "var(--shadow)",
      width: "100%",
      marginBottom: 20,
    },
    inp: {
      padding: "9px 12px",
      border: "1.5px solid var(--border)",
      borderRadius: 8,
      fontSize: 13,
      fontFamily: "inherit",
      background: "var(--card)",
      color: "var(--text)",
      outline: "none",
    },
    cont: {
      padding: "24px 28px",
      paddingTop:
        typeof window !== "undefined" && window.innerWidth <= 768 ? 0 : 122,
      boxSizing: "border-box",
    },
  };

  const statCards = [
    {
      label: range === "Today" ? "Today's Appointments" : "Appointments",
      value: stats.appointments,
      display: <CountUp key={`${animKey}-a`} value={stats.appointments} />,
      icon: "/icon/calendar.png",
      color: "blue",
      sub: `in ${range.toLowerCase()}`,
    },
    {
      label: range === "Today" ? "Today's Sales" : "Total Sales",
      value: stats.sales,
      display: <CountUp key={`${animKey}-s`} value={stats.sales} prefix="₱" />,
      icon: "/icon/money_bag.png",
      color: "green",
      sub: `in ${range.toLowerCase()}`,
    },
    {
      label: "Total Patients",
      value: stats.patients,
      display: <CountUp key={`${animKey}-p`} value={stats.patients} />,
      icon: "/icon/attended.png",
      color: "yellow",
      sub: "all time",
    },
    {
      label: "Low Stock Items",
      value: stats.lowStock,
      display: <CountUp key={`${animKey}-l`} value={stats.lowStock} />,
      icon: "/icon/warning.png",
      color: "red",
      sub: "need restocking",
    },
  ];

  return (
    <Layout>
      <ToastStack toasts={toasts} />

      {/* ══ Export Progress Modal ══ */}
      {exporting &&
        (() => {
          const pct = Math.round(exportProgress);
          const barColor = exporting === "pdf" ? "#dc2626" : "#16a34a";
          const barBg = exporting === "pdf" ? "#fef2f2" : "#f0fdf4";
          // Rough ETA estimate based on remaining progress (assumes similar pace to what's elapsed).
          const remainingPct = Math.max(0, 100 - pct);
          const etaSeconds =
            pct >= 100 ? 0 : Math.max(1, Math.round((remainingPct / 90) * 3));
          return (
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(15,23,42,0.55)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 999998,
                padding: 16,
              }}
            >
              <div
                style={{
                  background: "var(--card)",
                  borderRadius: 16,
                  width: "100%",
                  maxWidth: 340,
                  boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
                  padding: "30px 26px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 16,
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 14,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: barBg,
                  }}
                >
                  {pct >= 100 ? (
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={barColor}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <span
                      className="export-spin"
                      style={{
                        width: 24,
                        height: 24,
                        borderColor: barColor,
                        borderTopColor: "transparent",
                      }}
                    />
                  )}
                </div>
                <div>
                  <h3
                    style={{
                      margin: "0 0 4px",
                      fontSize: 15,
                      fontWeight: 700,
                      color: "var(--text)",
                    }}
                  >
                    {pct >= 100
                      ? exporting === "pdf"
                        ? "PDF Ready!"
                        : "Excel Ready!"
                      : exporting === "pdf"
                        ? "Generating PDF Report"
                        : "Generating Excel Report"}
                  </h3>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 12.5,
                      color: "var(--muted)",
                      lineHeight: 1.5,
                    }}
                  >
                    {pct >= 100
                      ? "Your download should start automatically."
                      : `Preparing your ${range.toLowerCase()} report for ${branchLabel}…`}
                  </p>
                </div>

                {/* Progress bar */}
                <div style={{ width: "100%" }}>
                  <div
                    style={{
                      width: "100%",
                      height: 8,
                      borderRadius: 99,
                      background: "var(--bg)",
                      border: "1px solid var(--border)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        borderRadius: 99,
                        width: `${pct}%`,
                        background: `linear-gradient(90deg, ${barColor}cc, ${barColor})`,
                        transition: "width 0.18s ease",
                      }}
                    />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginTop: 8,
                    }}
                  >
                    <span
                      style={{ fontSize: 12, fontWeight: 800, color: barColor }}
                    >
                      {pct}%
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--muted)",
                        fontWeight: 600,
                      }}
                    >
                      {pct >= 100 ? "Done" : `~${etaSeconds}s left`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      <div style={S.page}>
        {/* ══ Topbar ══════════════════════════════════════════════════════════ */}
        <div
          className="topbar report-topbar"
          style={{
            position: "fixed",
            top: 68,
            left: "var(--current-sidebar-w, 62px)",
            right: 0,
            zIndex: 40,
            background: "var(--card)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img
              src="/icon/reports.png"
              alt=""
              className="report-topbar-icon"
              style={{
                width: 22,
                height: 22,
                filter:
                  "brightness(0) saturate(100%) invert(17%) sepia(82%) saturate(1200%) hue-rotate(210deg)",
              }}
            />{" "}
            <div>
              <h1
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: "var(--text)",
                  margin: 0,
                }}
              >
                Reports
              </h1>
              <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>
                Manage all reports &amp; analytics — {branchLabel}
                <span
                  className="range-pill"
                  style={{
                    marginLeft: 8,
                    background: rc.bg,
                    color: rc.text,
                    border: `1px solid ${rc.border}`,
                  }}
                >
                  {range}
                </span>
              </p>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            {/* ── Admin branch filter dropdown ── */}
            {seeAllBranches && (
              <div style={{ width: 180 }}>
                <CustomSelect
                  value={branchFilter}
                  onChange={setBranchFilter}
                  placeholder="All Branches"
                  accent="#7c3aed"
                  options={branches.map((b) => ({
                    value: b.id,
                    label: b.name,
                  }))}
                />
              </div>
            )}

            <div style={{ width: 150 }}>
              <CustomSelect
                value={range}
                onChange={setRange}
                placeholder="Select Range"
                options={["Today", "This Week", "This Month", "This Year"]}
              />
            </div>

            {/* ── All Transactions Button (admin/super admin/manager only) ── */}
            {(isAdminLevel || isManager) && (
              <button
                className="btn btn-outline report-outline-btn"
                onClick={() => {
                  setShowAllTx(true);
                  fetchAllTransactions();
                }}
                style={{
                  width: "auto",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
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
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                All Transactions
              </button>
            )}

            {/* ── PDF Export Button ── */}
            <button
              className="btn btn-outline export-btn report-outline-btn"
              onClick={handleExportPDF}
              disabled={loading || !!exporting}
              style={{
                width: "auto",
                display: "flex",
                alignItems: "center",
                gap: 6,
                opacity: loading ? 0.55 : 1,
              }}
            >
              {exporting === "pdf" ? (
                <>
                  <span className="export-spin" />
                  Exporting…
                </>
              ) : (
                <>
                  <img
                    src="/icon/pdf-file.png"
                    alt="PDF"
                    className="report-pdf-icon"
                    style={{ width: 16, height: 16, objectFit: "contain" }}
                  />
                  PDF
                </>
              )}
            </button>

            {/* ── Excel Export Button ── */}
            <button
              className="btn btn-primary export-btn"
              onClick={handleExportExcel}
              disabled={loading || !!exporting}
              style={{
                width: "auto",
                display: "flex",
                alignItems: "center",
                gap: 6,
                opacity: loading ? 0.55 : 1,
              }}
            >
              {exporting === "excel" ? (
                <>
                  <span className="export-spin export-spin-light" />
                  Exporting…
                </>
              ) : (
                <>
                  <img
                    src="/icon/excel.png"
                    alt="Excel"
                    style={{
                      width: 16,
                      height: 16,
                      objectFit: "contain",
                      filter: "brightness(0) invert(1)",
                    }}
                  />
                  Excel
                </>
              )}
            </button>
          </div>
        </div>

        {/* ══ Content ═════════════════════════════════════════════════════════ */}
        <div style={S.cont}>
          {/* ── Stat cards ── */}
          <div
            className="report-stats-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(195px, 1fr))",
              gap: 14,
              marginBottom: 24,
            }}
          >
            {statCards.map((sc, i) => (
              <div
                key={`${animKey}-card-${i}`}
                style={{
                  background: "var(--card)",
                  border: "1.5px solid var(--border)",
                  borderRadius: 16,
                  padding: 20,
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                  position: "relative",
                  overflow: "hidden",
                  cursor: "default",
                  animationDelay: `${i * 100}ms`,
                  transition:
                    "transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease",
                  boxShadow: "0 2px 12px rgba(30,58,138,0.05)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-3px)";
                  e.currentTarget.style.boxShadow =
                    "0 8px 24px rgba(30,58,138,0.10)";
                  e.currentTarget.style.borderColor = "rgba(30,58,138,0.25)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow =
                    "0 2px 12px rgba(30,58,138,0.05)";
                  e.currentTarget.style.borderColor = "var(--border)";
                }}
              >
                {/* Top accent bar */}
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    borderRadius: "16px 16px 0 0",
                    background:
                      sc.color === "blue"
                        ? "linear-gradient(90deg,#1e3a8a,#3b82f6)"
                        : sc.color === "green"
                          ? "linear-gradient(90deg,#16a34a,#22c55e)"
                          : sc.color === "yellow"
                            ? "linear-gradient(90deg,#d97706,#f59e0b)"
                            : "linear-gradient(90deg,#dc2626,#ef4444)",
                  }}
                />

                {/* Icon */}
                <div style={{ display: "flex", alignItems: "flex-start" }}>
                  <div
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: 12,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background:
                        sc.color === "blue"
                          ? "#eff6ff"
                          : sc.color === "green"
                            ? "#f0fdf4"
                            : sc.color === "yellow"
                              ? "#fffbeb"
                              : "#fff1f2",
                    }}
                  >
                    <img
                      src={sc.icon}
                      alt={sc.label}
                      style={{
                        width: 24,
                        height: 24,
                        filter:
                          sc.color === "blue"
                            ? "brightness(0) saturate(100%) invert(17%) sepia(82%) saturate(1200%) hue-rotate(210deg)"
                            : sc.color === "green"
                              ? "brightness(0) saturate(100%) invert(32%) sepia(80%) saturate(600%) hue-rotate(110deg) brightness(0.9)"
                              : sc.color === "yellow"
                                ? "brightness(0) saturate(100%) invert(52%) sepia(90%) saturate(600%) hue-rotate(10deg) brightness(0.9)"
                                : "brightness(0) saturate(100%) invert(20%) sepia(90%) saturate(1200%) hue-rotate(340deg) brightness(0.9)",
                      }}
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
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {loading ? "—" : sc.display}
                  </h3>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--muted)",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    {sc.sub}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* ── Charts row ── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                typeof window !== "undefined" && window.innerWidth <= 768
                  ? "1fr"
                  : "1fr 1fr",
              gap: 20,
            }}
          >
            {/* ── Sales chart ── */}
            <div
              style={{ ...S.card, animationDelay: "180ms" }}
              className="report-chart-card"
            >
              <div
                style={{
                  padding: "16px 22px",
                  borderBottom: "1px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <h2
                    style={{ fontSize: 15, fontWeight: 700, margin: "0 0 2px" }}
                  >
                    Sales — Last 7 Days
                  </h2>
                  <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>
                    {loading ? (
                      "—"
                    ) : (
                      <span>
                        Total:{" "}
                        <strong style={{ color: "var(--royal)" }}>
                          ₱{totalSalesWeek.toLocaleString("en-PH")}
                        </strong>
                      </span>
                    )}
                  </p>
                </div>
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: "var(--royal)",
                  }}
                />
              </div>
              <div style={{ padding: "20px 20px 14px" }}>
                {loading ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-end",
                      gap: 8,
                      height: 180,
                    }}
                  >
                    {Array.from({ length: 7 }).map((_, i) => (
                      <div
                        key={i}
                        className="skeleton"
                        style={{
                          flex: 1,
                          height: `${40 + Math.random() * 80}px`,
                          borderRadius: "5px 5px 2px 2px",
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-end",
                        gap: 6,
                        height: 162,
                      }}
                    >
                      {salesData.map((d, i) => (
                        <div
                          key={`${animKey}-sb-${i}`}
                          className="bar-col"
                          style={{
                            flex: 1,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 4,
                            height: "100%",
                            justifyContent: "flex-end",
                          }}
                        >
                          <AnimatedBar
                            key={`${animKey}-bar-s-${i}`}
                            heightPct={d.total / maxSales}
                            color="var(--royal)"
                            delay={i * 55}
                            label={new Date(d.date).toLocaleDateString("en", {
                              weekday: "short",
                            })}
                            valueLabel={
                              d.total > 0
                                ? `₱${(d.total / 1000).toFixed(1)}k`
                                : ""
                            }
                          />
                        </div>
                      ))}
                    </div>
                    <div
                      style={{
                        height: 1,
                        background: "var(--border)",
                        margin: "6px 0 0",
                      }}
                    />
                  </>
                )}
              </div>
            </div>

            {/* ── Appointments chart ── */}
            <div
              style={{ ...S.card, animationDelay: "240ms" }}
              className="report-chart-card"
            >
              <div
                style={{
                  padding: "16px 22px",
                  borderBottom: "1px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <h2
                    style={{ fontSize: 15, fontWeight: 700, margin: "0 0 2px" }}
                  >
                    Appointments by Day
                  </h2>
                  <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>
                    {loading ? (
                      "—"
                    ) : (
                      <span>
                        Total:{" "}
                        <strong style={{ color: "#16a34a" }}>
                          {totalApptsWeek} appointment
                          {totalApptsWeek !== 1 ? "s" : ""}
                        </strong>
                      </span>
                    )}
                  </p>
                </div>
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: "#22c55e",
                  }}
                />
              </div>
              <div style={{ padding: "20px 20px 14px" }}>
                {loading ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-end",
                      gap: 8,
                      height: 180,
                    }}
                  >
                    {Array.from({ length: 7 }).map((_, i) => (
                      <div
                        key={i}
                        className="skeleton"
                        style={{
                          flex: 1,
                          height: `${30 + Math.random() * 90}px`,
                          borderRadius: "5px 5px 2px 2px",
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-end",
                        gap: 6,
                        height: 162,
                      }}
                    >
                      {apptData.map((d, i) => (
                        <div
                          key={`${animKey}-ab-${i}`}
                          className="bar-col"
                          style={{
                            flex: 1,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 4,
                            height: "100%",
                            justifyContent: "flex-end",
                          }}
                        >
                          <AnimatedBar
                            key={`${animKey}-bar-a-${i}`}
                            heightPct={d.count / maxAppts}
                            color="#22c55e"
                            delay={i * 55}
                            label={new Date(d.date).toLocaleDateString("en", {
                              weekday: "short",
                            })}
                            valueLabel={d.count > 0 ? String(d.count) : ""}
                          />
                        </div>
                      ))}
                    </div>
                    <div
                      style={{
                        height: 1,
                        background: "var(--border)",
                        margin: "6px 0 0",
                      }}
                    />
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ── Admin/Super Admin: Branch Performance Comparison ── */}
          {isAdminLevel && seeAllBranches && (
            <div
              style={{
                background: "linear-gradient(135deg,#1e1b4b,#312e81)",
                borderRadius: 14,
                padding: "18px 22px",
                marginBottom: 20,
                boxShadow: "0 8px 24px rgba(49,46,129,0.25)",
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
                    Branch Performance Comparison
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
                  {isSuperAdmin
                    ? "Super Admin — Full Access"
                    : "Administrator View"}
                </span>
              </div>

              {branchStatsLoading ? (
                <p
                  style={{
                    color: "rgba(255,255,255,0.6)",
                    fontSize: 12,
                    margin: 0,
                  }}
                >
                  Loading branch data…
                </p>
              ) : branchStats.length === 0 ? (
                <p
                  style={{
                    color: "rgba(255,255,255,0.6)",
                    fontSize: 12,
                    margin: 0,
                  }}
                >
                  No branch data available.
                </p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: 12,
                    }}
                  >
                    <thead>
                      <tr style={{ background: "rgba(255,255,255,0.06)" }}>
                        {[
                          "Branch",
                          "Total Sales",
                          "Voided Tx",
                          "Appointments",
                          "Patients",
                        ].map((h) => (
                          <th
                            key={h}
                            style={{
                              textAlign: "left",
                              padding: "8px 12px",
                              fontSize: 10,
                              fontWeight: 700,
                              color: "rgba(255,255,255,0.65)",
                              textTransform: "uppercase",
                              letterSpacing: 0.5,
                              borderBottom: "1px solid rgba(255,255,255,0.15)",
                              background: "transparent",
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {branchStats.map((b, i) => (
                        <tr
                          key={b.id}
                          style={{
                            borderBottom: "1px solid rgba(255,255,255,0.08)",
                            background: "transparent",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background =
                              "rgba(255,255,255,0.06)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                          }}
                        >
                          <td
                            style={{
                              padding: "10px 12px",
                              fontWeight: 700,
                              color: "#fff",
                              background: "transparent",
                            }}
                          >
                            {i === 0 && (
                              <span
                                style={{
                                  fontSize: 9,
                                  background: "#fbbf24",
                                  color: "#1e1b4b",
                                  borderRadius: 4,
                                  padding: "1px 6px",
                                  fontWeight: 800,
                                  marginRight: 6,
                                }}
                              >
                                TOP
                              </span>
                            )}
                            {b.name}
                          </td>
                          <td
                            style={{
                              padding: "10px 12px",
                              color: "#a5b4fc",
                              fontWeight: 700,
                              background: "transparent",
                            }}
                          >
                            ₱{b.sales.toLocaleString("en-PH")}
                          </td>
                          <td
                            style={{
                              padding: "10px 12px",
                              color:
                                b.voided > 0
                                  ? "#fca5a5"
                                  : "rgba(255,255,255,0.5)",
                              background: "transparent",
                            }}
                          >
                            {b.voided}
                          </td>
                          <td
                            style={{
                              padding: "10px 12px",
                              color: "rgba(255,255,255,0.8)",
                              background: "transparent",
                            }}
                          >
                            {b.appointments}
                          </td>
                          <td
                            style={{
                              padding: "10px 12px",
                              color: "rgba(255,255,255,0.8)",
                              background: "transparent",
                            }}
                          >
                            {b.patients}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>{" "}
                </div>
              )}
            </div>
          )}

          {/* ── Quick summary table ── */}
          {!loading && (
            <div
              style={{
                ...S.card,
                animationDelay: "300ms",
                animation: "reportFadeUp 0.4s ease 300ms both",
              }}
            >
              <div
                style={{
                  padding: "16px 22px",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>
                  Daily Breakdown — Sales
                </h2>
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
                      {["Day", "Date", "Sales", "Appointments"].map((h) => (
                        <th
                          key={h}
                          style={{
                            background: "var(--bg)",
                            padding: "10px 18px",
                            textAlign: "left",
                            fontSize: 11,
                            fontWeight: 700,
                            color: "var(--muted)",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                            borderBottom: "1px solid var(--border)",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {salesData.map((d, i) => {
                      const apptRow = apptData[i];
                      const isToday =
                        d.date === new Date().toISOString().split("T")[0];
                      return (
                        <tr
                          key={d.date}
                          style={{
                            borderBottom: "1px solid var(--border)",
                            background: isToday
                              ? "var(--light-blue)"
                              : "transparent",
                          }}
                        >
                          <td
                            style={{
                              padding: "11px 18px",
                              fontWeight: isToday ? 700 : 500,
                              color: "var(--text)",
                            }}
                          >
                            {new Date(d.date).toLocaleDateString("en", {
                              weekday: "long",
                            })}
                            {isToday && (
                              <span
                                style={{
                                  marginLeft: 6,
                                  fontSize: 10,
                                  background: "var(--royal)",
                                  color: "#fff",
                                  borderRadius: 4,
                                  padding: "1px 6px",
                                  fontWeight: 700,
                                }}
                              >
                                TODAY
                              </span>
                            )}
                          </td>
                          <td
                            style={{
                              padding: "11px 18px",
                              color: "var(--muted)",
                              fontSize: 12,
                            }}
                          >
                            {d.date}
                          </td>
                          <td
                            style={{
                              padding: "11px 18px",
                              fontWeight: 700,
                              color:
                                d.total > 0 ? "var(--royal)" : "var(--muted)",
                            }}
                          >
                            {d.total > 0
                              ? `₱${d.total.toLocaleString("en-PH")}`
                              : "—"}
                          </td>
                          <td
                            style={{
                              padding: "11px 18px",
                              color:
                                apptRow?.count > 0 ? "#16a34a" : "var(--muted)",
                              fontWeight: apptRow?.count > 0 ? 700 : 400,
                            }}
                          >
                            {apptRow?.count > 0 ? apptRow.count : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr
                      style={{
                        background: "var(--bg)",
                        borderTop: "2px solid var(--border)",
                      }}
                    >
                      <td
                        colSpan={2}
                        style={{
                          padding: "11px 18px",
                          fontWeight: 700,
                          fontSize: 13,
                        }}
                      >
                        Totals
                      </td>
                      <td
                        style={{
                          padding: "11px 18px",
                          fontWeight: 800,
                          color: "var(--royal)",
                          fontSize: 14,
                        }}
                      >
                        ₱{totalSalesWeek.toLocaleString("en-PH")}
                      </td>
                      <td
                        style={{
                          padding: "11px 18px",
                          fontWeight: 800,
                          color: "#16a34a",
                          fontSize: 14,
                        }}
                      >
                        {totalApptsWeek}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══ All Transactions Modal (incl. voided) ══ */}
      {showAllTx && (
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
              borderRadius: 14,
              width: "100%",
              maxWidth: 900,
              maxHeight: "90vh",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
            }}
          >
            <div
              style={{
                padding: "18px 22px",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                All Transactions — {branchLabel}
              </h3>
              <button
                className="btn btn-ghost btn-icon"
                style={{ width: "auto" }}
                onClick={() => setShowAllTx(false)}
              >
                ✕
              </button>
            </div>
            {isAdminLevel && (
              <div
                style={{
                  margin: "14px 22px 0",
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  borderRadius: 8,
                  padding: "9px 14px",
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
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <span>
                  Full audit access — includes voided transactions across{" "}
                  {seeAllBranches ? "all branches" : "this branch"}, as{" "}
                  {isSuperAdmin ? "Super Admin" : "an Administrator"}.
                </span>
              </div>
            )}
            <div style={{ padding: "16px 22px", overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 13,
                }}
              >
                <thead>
                  <tr>
                    {["Client", "Total", "Payment", "Date", "Status"].map(
                      (h) => (
                        <th
                          key={h}
                          style={{
                            background: "var(--bg)",
                            padding: "10px 12px",
                            textAlign: "left",
                            fontSize: 11,
                            fontWeight: 700,
                            color: "var(--muted)",
                            borderBottom: "1px solid var(--border)",
                          }}
                        >
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {txLoading ? (
                    <tr>
                      <td
                        colSpan={5}
                        style={{
                          textAlign: "center",
                          padding: 40,
                          color: "var(--muted)",
                        }}
                      >
                        Loading…
                      </td>
                    </tr>
                  ) : allTransactions.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        style={{
                          textAlign: "center",
                          padding: 40,
                          color: "var(--muted)",
                        }}
                      >
                        No transactions yet
                      </td>
                    </tr>
                  ) : (
                    allTransactions.map((t) => {
                      const isVoided = t.status === "Voided";
                      return (
                        <tr
                          key={t.id}
                          style={{
                            borderBottom: "1px solid var(--border)",
                            opacity: isVoided ? 0.55 : 1,
                            background: isVoided ? "#fef2f2" : "transparent",
                          }}
                        >
                          <td
                            style={{
                              padding: "10px 12px",
                              fontWeight: 600,
                              textDecoration: isVoided
                                ? "line-through"
                                : "none",
                            }}
                          >
                            {t.client}
                          </td>
                          <td
                            style={{
                              padding: "10px 12px",
                              fontWeight: 700,
                              color: "var(--royal)",
                            }}
                          >
                            ₱{Number(t.total).toLocaleString("en-PH")}
                          </td>
                          <td style={{ padding: "10px 12px" }}>{t.payment}</td>
                          <td
                            style={{
                              padding: "10px 12px",
                              fontSize: 12,
                              color: "var(--muted)",
                            }}
                          >
                            {new Date(t.created_at).toLocaleDateString()}
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                borderRadius: 99,
                                padding: "3px 9px",
                                background: isVoided ? "#fee2e2" : "#dcfce7",
                                color: isVoided ? "#991b1b" : "#166534",
                              }}
                            >
                              {isVoided ? "VOIDED" : "ACTIVE"}
                            </span>
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
      )}

      {/* ══ Confirm Dialog ══ */}
      {dialog.show && (
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
              borderRadius: 14,
              width: "100%",
              maxWidth: 380,
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "18px 22px 14px",
                borderBottom: "1px solid var(--border)",
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
                  background: "#eff6ff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <h3
                style={{
                  margin: 0,
                  fontSize: 15,
                  fontWeight: 700,
                  color: "var(--text)",
                }}
              >
                {dialog.title}
              </h3>
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
                {dialog.message}
              </p>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                padding: "12px 22px",
                borderTop: "1px solid var(--border)",
                background: "var(--bg)",
              }}
            >
              <button
                className="btn btn-ghost"
                style={{ width: "auto" }}
                onClick={() => setDialog((d) => ({ ...d, show: false }))}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                style={{
                  width: "auto",
                  background: "#0f172a",
                  borderColor: "#0f172a",
                }}
                onClick={() => {
                  dialog.onConfirm?.();
                  setDialog((d) => ({ ...d, show: false }));
                }}
              >
                Download Again
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Report;
