import React, { useState, useEffect, useRef, useCallback } from "react";
import ReactDOM from "react-dom";
import Layout from "../../components/layout";
import { supabase } from "../../js/Utils/supabase";
import { useCurrentUser } from "../../js/hooks/Usecurrentuser";
import { useBranchFilter, withBranchId } from "../../js/hooks/Usebranchfilter";
import { logActivity } from "../../js/Utils/logActivity";
import "../../styles/PointOfSale.css";

// ─── Animated helpers ─────────────────────────────────────────────────────────
function useAnimatedNumber(value, duration = 350) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);
  const rafRef = useRef(null);
  useEffect(() => {
    const from = prevRef.current,
      to = value;
    if (from === to) return;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setDisplay(from + (to - from) * ease);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else {
        setDisplay(to);
        prevRef.current = to;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);
  return display;
}

function AnimatedPrice({ value, style = {}, prefix = "₱", duration = 350 }) {
  const animated = useAnimatedNumber(value, duration);
  const prevRef = useRef(value);
  const [bump, setBump] = useState(false);
  const [color, setColor] = useState(null);
  useEffect(() => {
    if (value !== prevRef.current) {
      setColor(value > prevRef.current ? "up" : "down");
      setBump(true);
      const t1 = setTimeout(() => setBump(false), 350);
      const t2 = setTimeout(() => setColor(null), 600);
      prevRef.current = value;
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [value]);
  const flash =
    color === "up" ? "#16a34a" : color === "down" ? "#dc2626" : null;
  return (
    <span
      style={{
        display: "inline-block",
        color: flash || style.color || "inherit",
        transform: bump ? "scale(1.12)" : "scale(1)",
        transition: "transform 0.25s cubic-bezier(.34,1.56,.64,1), color 0.3s",
        ...style,
      }}
    >
      {prefix}
      {animated.toFixed(2)}
    </span>
  );
}

function AnimatedQty({ value, style = {} }) {
  const [display, setDisplay] = useState(value);
  const [anim, setAnim] = useState(false);
  const prevRef = useRef(value);
  useEffect(() => {
    if (value !== prevRef.current) {
      setAnim(true);
      const t = setTimeout(() => {
        setDisplay(value);
        setAnim(false);
        prevRef.current = value;
      }, 150);
      return () => clearTimeout(t);
    }
  }, [value]);
  return (
    <span
      style={{
        display: "inline-block",
        minWidth: 20,
        textAlign: "center",
        transform: anim ? "scale(1.4)" : "scale(1)",
        transition: "transform 0.2s cubic-bezier(.34,1.56,.64,1)",
        ...style,
      }}
    >
      {display}
    </span>
  );
}

const ICONS = {
  service: "/icon/service.png",
  food: "/icon/pet-food.png",
  medicine: "/icon/medicine.png",
  grooming: "/icon/gromming.png",
  consultation: "/icon/consultation.png",
  other: "/icon/others.png",
  cart: "/icon/cart.png",
};

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

// ─── Custom Select (matches Inventory's modal dropdown style) ────────────────
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
      const dropWidth = Math.max(rect.width, 180);
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
            {options.map((opt, i) => {
              const optVal = opt.value ?? opt;
              const optLabel = opt.label ?? opt;
              const isSelected = optVal === value;
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
                    color: isSelected ? accent : "var(--text)",
                    cursor: "pointer",
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
                    if (!isSelected)
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
                  {isSelected && (
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
          color: "var(--text)",
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

// ─── Main Component ───────────────────────────────────────────────────────────
const PointOfSale = () => {
  const {
    user,
    isAdmin,
    isManager,
    isSuperAdmin,
    loading: userLoading,
  } = useCurrentUser();
  const canVoid = isAdmin || isManager || isSuperAdmin;
  const { applyFilter } = useBranchFilter();
  const logActivityRef = React.useRef(null);
  useEffect(() => {
    if (typeof window !== "undefined") {
      import("../../js/Utils/logActivity").then((m) => {
        logActivityRef.current = m.logActivity;
      });
    }
  }, []);

  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" && window.innerWidth <= 768,
  );
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState(0);
  const DISCOUNT_CAP = 30; // max allowed discount percentage
  const [loading, setLoading] = useState(true);
  const [catFilter, setCatFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [payMethod, setPayMethod] = useState("Cash");
  const [amountGiven, setAmountGiven] = useState("");
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastTx, setLastTx] = useState(null);
  const [showTx, setShowTx] = useState(false);
  const [transactions, setTransactions] = useState([]);

  const [clients, setClients] = useState([]);
  const [clientSearch, setClientSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientType, setClientType] = useState("registered"); // 'registered' | 'walkin'
  const [walkinName, setWalkinName] = useState("");
  const [walkinContact, setWalkinContact] = useState("");
  const clientRef = useRef(null);

  const [confirmVoid, setConfirmVoid] = useState({ show: false, txId: null });

  const generateReceiptHTML = (tx) => {
    const dashLine =
      '<div style="border-top:1px dashed #999;margin:8px 0;"></div>';

    const itemsHTML = (tx.items || [])
      .map(
        (i) => `
        <div style="display:flex;justify-content:space-between;font-size:11.5px;padding:2px 0;">
          <span style="text-transform:uppercase;">${i.name}</span>
          <span>₱${(i.qty * i.price).toFixed(2)}</span>
        </div>`,
      )
      .join("");

    return `
      <div style="width:280px;margin:0 auto;font-family:'Courier New',monospace;color:#111;font-size:12px;line-height:1.5;">
        <div style="text-align:center;">
          <img src="/image/446805041_881106557364617_1125518808684788316_n-removebg-preview.png" alt="Logo" style="width:56px;height:56px;object-fit:contain;margin:0 auto 8px;display:block;" />
          <div style="font-weight:800;font-size:14px;">${branchInfo.name}</div>
          <div style="font-size:10.5px;color:#444;">${branchInfo.address}</div>
        </div>
        ${dashLine}
        <div style="text-align:center;font-weight:800;letter-spacing:1px;font-size:12px;">*** SALES RECEIPT ***</div>
        ${dashLine}
        <div style="display:flex;justify-content:space-between;font-size:11.5px;">
          <span>DATE: ${new Date().toLocaleDateString()}</span>
          <span>TIME: ${new Date().toLocaleTimeString()}</span>
        </div>
        <div style="margin-top:6px;font-size:11.5px;">
          CLIENT: ${tx.client}${tx._isWalkin ? " (Walk-in)" : ""}<br/>
          ${tx._walkinContact ? `CONTACT: ${tx._walkinContact}<br/>` : ""}
        </div>
        ${dashLine}
        ${itemsHTML}
        ${dashLine}
        <div style="display:flex;justify-content:space-between;"><span>SUBTOTAL</span><span>₱${Number(tx.subtotal).toFixed(2)}</span></div>
        ${
          Number(tx.discount) > 0
            ? `<div style="display:flex;justify-content:space-between;"><span>DISCOUNT (${tx.discount}%)</span><span>-₱${((tx.subtotal * tx.discount) / 100).toFixed(2)}</span></div>`
            : ""
        }
        <div style="display:flex;justify-content:space-between;font-weight:800;font-size:14px;margin-top:4px;"><span>TOTAL</span><span>₱${Number(tx.total).toFixed(2)}</span></div>
        <div style="display:flex;justify-content:space-between;margin-top:2px;"><span>PAYMENT</span><span>${tx.payment}</span></div>
        ${dashLine}
        <div style="text-align:center;font-weight:700;">Thank you for trusting us<br/>with Animal Care!</div>
      </div>
    `;
  };

  const printReceiptHTML = (html) => {
    const w = window.open("", "PRINT", "height=650,width=420");
    if (!w) return;
    w.document.write(`<html><head><title>Receipt</title><style>
      @page { size: 80mm auto; margin: 0; }
      * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      html, body { margin: 0; padding: 0; }
      body{font-family:'Courier New',monospace;background:#fff;width:80mm;padding:6mm 4mm;box-sizing:border-box;}
    </style></head><body>${html}</body></html>`);
    w.document.close();
    w.focus();
    w.print();
    w.close();
  };

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
    const h = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  useEffect(() => {
    const h = (e) => {
      if (clientRef.current && !clientRef.current.contains(e.target))
        setShowDropdown(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("inventory")
      .select("*")
      .gt("qty", 0)
      .order("name");

    // POS always filters by branch — even super_admin sells from one branch
    if (user?.branchId) {
      query = query.eq("branch_id", user.branchId);
    }

    const { data, error } = await query;
    if (!error) setProducts(data || []);
    setLoading(false);
  }, [user]);

  const fetchTransactions = useCallback(async () => {
    const { data, error } = await applyFilter(
      supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false }),
    );
    if (error) {
      console.error("fetchTransactions error:", error.message);
      setTransactions([]);
      return;
    }
    setTransactions(data || []);
  }, [applyFilter]);

  const fetchClients = useCallback(async () => {
    let query = supabase
      .from("profiles")
      .select("id, first_name, last_name, email, phone, role")
      .eq("status", "Active")
      .ilike("role", "customer")
      .order("first_name");

    if (user?.branchId) {
      query = query.eq("branch_id", user.branchId);
    }

    const { data, error } = await query;
    if (error) {
      console.error("fetchClients error:", error.message);
      setClients([]);
      return;
    }
    setClients(
      (data || []).map((p) => ({
        ...p,
        full_name:
          `${p.first_name || ""} ${p.last_name || ""}`.trim() ||
          p.email ||
          "Unnamed",
      })),
    );
  }, [user]);

  const [branchInfo, setBranchInfo] = useState({
    name: "Angeles Pet Care Hospital",
    address: "Camatchiles, Mabalacat City, Pampanga",
  });

  const fetchBranchInfo = useCallback(async () => {
    if (!user?.branchId) return;
    const { data, error } = await supabase
      .from("branches")
      .select("id, name, address, is_main")
      .eq("id", user.branchId)
      .maybeSingle();
    if (error || !data) return;
    setBranchInfo({
      name: data.is_main
        ? "Angeles Pet Care Hospital"
        : `Angeles Pet Care Clinic${data.name ? " — " + data.name : ""}`,
      address: data.address || "",
    });
  }, [user]);

  useEffect(() => {
    if (userLoading || !user) return;
    fetchProducts();
    fetchClients();
    fetchTransactions();
    fetchBranchInfo();

    const inventoryChannel = supabase
      .channel(`pos-inventory-realtime-${user?.branchId || "all"}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "inventory",
          ...(user?.branchId
            ? { filter: `branch_id=eq.${user.branchId}` }
            : {}),
        },
        () => fetchProducts(),
      )
      .subscribe();

    const profilesChannel = supabase
      .channel("pos-profiles-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => fetchClients(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(inventoryChannel);
      supabase.removeChannel(profilesChannel);
    };
  }, [userLoading, user, fetchProducts, fetchClients]);

  useEffect(() => {
    if (userLoading || !user) return;
    const txChannel = supabase
      .channel(`pos-transactions-realtime-${user?.branchId || "all"}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
          ...(user?.branchId
            ? { filter: `branch_id=eq.${user.branchId}` }
            : {}),
        },
        () => fetchTransactions(),
      )
      .subscribe();
    return () => supabase.removeChannel(txChannel);
  }, [userLoading, user, fetchTransactions]);

  const categories = ["All", ...new Set(products.map((p) => p.category))];
  const [sortBy, setSortBy] = useState("name");
  const filtered = products
    .filter(
      (p) =>
        (catFilter === "All" || p.category === catFilter) &&
        (!search || p.name.toLowerCase().includes(search.toLowerCase())),
    )
    .sort((a, b) => {
      if (sortBy === "price-asc") return Number(a.price) - Number(b.price);
      if (sortBy === "price-desc") return Number(b.price) - Number(a.price);
      if (sortBy === "stock") return Number(b.qty) - Number(a.qty);
      return a.name.localeCompare(b.name);
    });

  const filteredClients = (() => {
    const q = clientSearch.toLowerCase().trim();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.full_name.toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q) ||
        (c.phone || "").includes(q),
    );
  })();

  // ── Cart helpers ──────────────────────────────────────────────────────────
  const addToCart = (product) => {
    setCart((prev) => {
      const ex = prev.find((i) => i.id === product.id);
      if (ex)
        return prev.map((i) =>
          i.id === product.id ? { ...i, qty: i.qty + 1 } : i,
        );
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const updateQty = (id, delta) => {
    setCart((prev) =>
      prev
        .map((i) =>
          i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i,
        )
        .filter((i) => i.qty > 0),
    );
  };

  const getCategoryIcon = (category) => {
    const map = {
      Service: ICONS.service,
      Food: ICONS.food,
      Medicine: ICONS.medicine,
      Grooming: ICONS.grooming,
      Consultation: ICONS.consultation,
      Other: ICONS.other,
    };
    return map[category] || ICONS.other;
  };

  const subtotal = cart.reduce((sum, i) => sum + Number(i.price) * i.qty, 0);
  const discountAmt = subtotal * (Number(discount) / 100);
  const total = subtotal - discountAmt;

  const processPayment = async () => {
    if (cart.length === 0) {
      showToast("Cart is empty", "error");
      return;
    }

    // Validate based on client type
    if (clientType === "registered" && !selectedClient) {
      showToast("Please select a client", "error");
      return;
    }
    if (clientType === "walkin" && !walkinName.trim()) {
      showToast("Please enter the walk-in client name", "error");
      return;
    }

    const cartSnapshot = [...cart];
    const items = cartSnapshot.map((i) => ({
      id: i.id,
      name: i.name,
      qty: i.qty,
      price: i.price,
      isCustom: i.isCustom || false,
    }));

    const clientName =
      clientType === "walkin" ? walkinName.trim() : selectedClient.full_name;
    const clientId = clientType === "walkin" ? null : selectedClient.id;
    const clientEmail =
      clientType === "walkin" ? null : selectedClient.email || null;
    const clientContact =
      clientType === "walkin"
        ? walkinContact.trim()
        : selectedClient.phone || null;

    const txPayload = withBranchId(user, {
      client: clientName,
      client_id: clientId,
      client_email: clientEmail,
      client_contact: clientContact || null,
      is_walkin: clientType === "walkin",
      items,
      subtotal,
      discount: Number(discount),
      total,
      payment: payMethod,
    });

    const { data, error } = await supabase
      .from("transactions")
      .insert([txPayload])
      .select();
    if (error) {
      showToast("Error: " + error.message, "error");
      return;
    }
    if (!data?.length) {
      showToast("Transaction failed — check RLS policies", "error");
      return;
    }

    for (const item of cartSnapshot) {
      if (!item.isCustom) {
        const product = products.find((p) => p.id === item.id);
        if (product) {
          await supabase
            .from("inventory")
            .update({ qty: Math.max(0, product.qty - item.qty) })
            .eq("id", item.id);
        }
      }
    }

    logActivity(
      user,
      "Completed sale",
      `Sale total: ₱${total.toFixed(2)} · Client: ${clientName}`,
    );
    showToast(`✓ Payment of ₱${total.toFixed(2)} processed`);
    setLastTx({
      ...data[0],
      items,
      // carry walk-in info into receipt if needed
      _walkinContact:
        clientType === "walkin"
          ? walkinContact.trim()
          : selectedClient?.phone || null,
      _isWalkin: clientType === "walkin",
    });
    setShowReceipt(true);
    setCart([]);
    setSelectedClient(null);
    setClientSearch("");
    setWalkinName("");
    setWalkinContact("");
    setClientType("registered");
    setDiscount(0);
    setAmountGiven("");
  };

  const voidTransaction = (txId) => {
    if (!canVoid) {
      showToast("You don't have permission to void transactions", "error");
      return;
    }
    setConfirmVoid({ show: true, txId });
  };

  const confirmVoidTransaction = async () => {
    const txId = confirmVoid.txId;
    setConfirmVoid({ show: false, txId: null });
    const { error } = await supabase
      .from("transactions")
      .update({
        status: "Voided",
        voided_at: new Date().toISOString(),
        voided_by: user?.id || null,
      })
      .eq("id", txId);
    if (error) {
      showToast("Error voiding transaction: " + error.message, "error");
      return;
    }
    logActivity(user, "Voided transaction", `Voided transaction ID: ${txId}`);
    showToast("Transaction voided", "info");
    fetchTransactions();
  };

  const selectClient = (client) => {
    setSelectedClient(client);
    setClientSearch(client.full_name);
    setShowDropdown(false);
  };

  const clearClient = (e) => {
    e?.stopPropagation();
    setSelectedClient(null);
    setClientSearch("");
    setWalkinName("");
    setWalkinContact("");
  };

  const S = {
    page: { width: "100%", minHeight: "100vh", display: "block" },
    topbar: {},
    cont: {
      padding: "24px 28px",
      paddingTop:
        typeof window !== "undefined" && window.innerWidth <= 768 ? 0 : 76,
      width: "100%",
      boxSizing: "border-box",
    },
    btn: { width: "auto" },
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
    overlay: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999,
      padding: 16,
    },
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

      {/* ── S.page wrapper ── */}
      <div style={S.page}>
        {/* ── Topbar ── */}
        <div
          className="topbar pos-topbar"
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
              src="/icon/point_of_sale.png"
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
                }}
              >
                Point of Sale
              </h1>
              <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>
                Process transactions
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setShowTx(true);
              fetchTransactions();
            }}
            className="tx-history-btn"
            style={{
              ...S.btn,
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "var(--royal)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "9px 16px",
              fontSize: 13,
              fontWeight: 700,
              fontFamily: "inherit",
              cursor: "pointer",
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
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>{" "}
            Transactions
          </button>{" "}
        </div>

        {/* ── Content grid (Products + Cart) ── */}
        <div
          style={{
            ...S.cont,
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 390px",
            gap: 20,
            minHeight: "calc(100vh - 160px)",
          }}
        >
          {/* ══ Products Panel ══ */}
          <div>
            <div
              style={{
                display: "flex",
                gap: 10,
                marginBottom: 16,
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
                  flex: 1,
                  minWidth: 180,
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
                  className="pos-search-input"
                  placeholder="Search products..."
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
              <div
                className="fade-in"
                style={{
                  display: "flex",
                  gap: 6,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                {categories.map((c) => (
                  <button
                    key={c}
                    className={`cat-pill${catFilter === c ? " active" : ""}`}
                    onClick={() => setCatFilter(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <div style={{ width: 190, flexShrink: 0 }}>
                <CustomSelect
                  value={sortBy}
                  onChange={setSortBy}
                  accent="#6366f1"
                  options={[
                    { value: "name", label: "Sort: Name (A–Z)" },
                    { value: "price-asc", label: "Sort: Price (Low–High)" },
                    { value: "price-desc", label: "Sort: Price (High–Low)" },
                    { value: "stock", label: "Sort: Stock (High–Low)" },
                  ]}
                />
              </div>
            </div>

            {loading ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))",
                  gap: 12,
                }}
              >
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      background: "#fff",
                      border: "1px solid #e2e8f0",
                      borderRadius: 10,
                      padding: 14,
                      textAlign: "center",
                    }}
                  >
                    {/* Icon placeholder */}
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 12,
                        margin: "0 auto 10px",
                      }}
                    >
                      <span
                        className="skel"
                        style={{ width: 48, height: 48, borderRadius: 12 }}
                      />
                    </div>
                    {/* Name */}
                    <span
                      className="skel"
                      style={{
                        width: "80%",
                        height: 13,
                        marginBottom: 6,
                        display: "block",
                        margin: "0 auto 6px",
                      }}
                    />
                    {/* Category */}
                    <span
                      className="skel"
                      style={{
                        width: "55%",
                        height: 11,
                        marginBottom: 8,
                        display: "block",
                        margin: "0 auto 8px",
                      }}
                    />
                    {/* Price */}
                    <span
                      className="skel"
                      style={{
                        width: "45%",
                        height: 14,
                        display: "block",
                        margin: "0 auto",
                      }}
                    />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div
                style={{
                  padding: 40,
                  textAlign: "center",
                  color: "var(--muted)",
                }}
              >
                <img
                  src={ICONS.other}
                  alt=""
                  style={{
                    width: 36,
                    height: 36,
                    opacity: 0.4,
                    marginBottom: 8,
                  }}
                />
                <p style={{ fontSize: 14 }}>No products found</p>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))",
                  gap: 12,
                }}
              >
                {filtered.map((p, idx) => (
                  <div
                    key={p.id}
                    className="product-card fade-in"
                    onClick={() => addToCart(p)}
                    style={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      padding: 14,
                      cursor: "pointer",
                      textAlign: "center",
                      animationDelay: `${idx * 0.07}s`,
                    }}
                  >
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 12,
                        background: "var(--light-blue)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto 10px",
                      }}
                    >
                      <img
                        src={getCategoryIcon(p.category)}
                        alt={p.category}
                        style={{ width: 28, height: 28, objectFit: "contain" }}
                      />
                    </div>
                    <p
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        margin: "0 0 2px",
                        color: "var(--text)",
                      }}
                    >
                      {p.name}
                    </p>
                    <p
                      style={{
                        fontSize: 11,
                        color: "var(--muted)",
                        margin: "0 0 8px",
                      }}
                    >
                      {p.category}
                    </p>
                    <p
                      style={{
                        fontSize: 14,
                        fontWeight: 800,
                        color: "var(--royal)",
                        margin: 0,
                      }}
                    >
                      ₱{Number(p.price).toFixed(2)}
                    </p>
                    <div
                      style={{
                        marginTop: 6,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        background:
                          p.qty <= (p.threshold ?? 10) ? "#fef2f2" : "#f0fdf4",
                        border: `1px solid ${p.qty <= (p.threshold ?? 10) ? "#fecaca" : "#bbf7d0"}`,
                        borderRadius: 99,
                        padding: "2px 8px",
                      }}
                    >
                      <span
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: "50%",
                          background:
                            p.qty <= (p.threshold ?? 10)
                              ? "#dc2626"
                              : "#16a34a",
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color:
                            p.qty <= (p.threshold ?? 10)
                              ? "#dc2626"
                              : "#166534",
                        }}
                      >
                        {p.qty} {p.unit}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ══ Cart Panel ══ */}
          <div
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              display: "flex",
              flexDirection: "column",
              overflow: "visible",
              boxShadow: "var(--shadow)",
              height: "fit-content",
              position: isMobile ? "static" : "sticky",
              top: 140,
            }}
          >
            <div
              style={{
                padding: "16px 18px",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <img
                  src={ICONS.cart}
                  alt="Cart"
                  style={{ width: 20, height: 20, objectFit: "contain" }}
                />
                <strong style={{ fontSize: 15, fontWeight: 700 }}>Cart</strong>
                {cart.length > 0 && (
                  <span
                    style={{
                      background: "var(--royal)",
                      color: "#fff",
                      borderRadius: 99,
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "2px 7px",
                      animation: "posPulse 0.4s ease",
                    }}
                  >
                    <AnimatedQty value={cart.reduce((s, i) => s + i.qty, 0)} />
                  </span>
                )}
              </div>
              {cart.length > 0 && (
                <button
                  onClick={() => setCart([])}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--muted)",
                    cursor: "pointer",
                    fontSize: 12,
                    fontFamily: "inherit",
                    width: "auto",
                  }}
                >
                  Clear all
                </button>
              )}
            </div>

            {/* ── Client selector ── */}
            <div
              style={{
                padding: "14px 18px",
                borderBottom: "1px solid var(--border)",
                position: "relative",
              }}
              ref={clientRef}
            >
              <label
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  display: "block",
                  marginBottom: 8,
                }}
              >
                Client
              </label>

              {/* Toggle: Registered vs Walk-in */}
              <div
                style={{
                  display: "flex",
                  border: "1.5px solid var(--border)",
                  borderRadius: 8,
                  overflow: "hidden",
                  marginBottom: 12,
                }}
              >
                {[
                  { key: "registered", label: "Registered" },
                  { key: "walkin", label: "Walk-in" },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setClientType(key);
                      clearClient();
                    }}
                    style={{
                      flex: 1,
                      padding: "7px 0",
                      border: "none",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      transition: "all 0.15s",
                      background: clientType === key ? "var(--royal)" : "#fff",
                      color: clientType === key ? "#fff" : "var(--muted)",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Registered Client — searchable dropdown */}
              {clientType === "registered" &&
                (selectedClient ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      background: "#f0fdf4",
                      border: "1.5px solid #bbf7d0",
                      borderRadius: 10,
                      padding: "10px 14px",
                    }}
                  >
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: "50%",
                        background: "var(--royal)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#fff",
                        fontSize: 14,
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {(selectedClient.first_name?.[0] || "?").toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 13,
                          fontWeight: 700,
                          color: "#166534",
                        }}
                      >
                        {selectedClient.full_name}
                      </p>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 11,
                          color: "#16a34a",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {selectedClient.email || ""}
                        {selectedClient.phone
                          ? ` · ${selectedClient.phone}`
                          : ""}
                      </p>
                    </div>
                    <button
                      onClick={clearClient}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "#dc2626",
                        fontSize: 13,
                        fontWeight: 700,
                        fontFamily: "inherit",
                        flexShrink: 0,
                        padding: 0,
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        width: "100%",
                        padding: "9px 12px",
                        border: `1.5px solid ${showDropdown ? "var(--royal)" : "var(--border)"}`,
                        borderRadius: 8,
                        boxSizing: "border-box",
                        background: "var(--card)",
                        cursor: "text",
                        transition: "border-color 0.15s",
                      }}
                      onClick={() => setShowDropdown(true)}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#9ca3af"
                        strokeWidth="2.5"
                        style={{ flexShrink: 0 }}
                      >
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.35-4.35" />
                      </svg>
                      <input
                        type="text"
                        className="pos-search-input"
                        placeholder="Search client name or email..."
                        value={clientSearch}
                        onChange={(e) => {
                          setClientSearch(e.target.value);
                          setShowDropdown(true);
                        }}
                        onFocus={() => setShowDropdown(true)}
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
                      {clientSearch && (
                        <button
                          onClick={clearClient}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "var(--muted)",
                            fontSize: 14,
                            padding: 0,
                            lineHeight: 1,
                            width: "auto",
                          }}
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {showDropdown && (
                      <div
                        style={{
                          position: "absolute",
                          top: "100%",
                          left: 18,
                          right: 18,
                          background: "var(--card)",
                          border: "1.5px solid var(--border)",
                          borderRadius: 10,
                          boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                          zIndex: 9999,
                          maxHeight: 240,
                          overflowY: "auto",
                          marginTop: 4,
                        }}
                      >
                        <div
                          style={{
                            padding: "8px 14px 6px",
                            borderBottom: "1px solid var(--border)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: "var(--muted)",
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                            }}
                          >
                            Clients
                          </span>
                          <span style={{ fontSize: 10, color: "var(--muted)" }}>
                            {filteredClients.length} found
                          </span>
                        </div>
                        {clients.length === 0 ? (
                          <div
                            style={{
                              padding: "14px 16px",
                              textAlign: "center",
                              color: "var(--muted)",
                              fontSize: 13,
                            }}
                          >
                            <div style={{ marginBottom: 4 }}>
                              <svg
                                width="22"
                                height="22"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#cbd5e1"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                              >
                                <circle cx="11" cy="11" r="8" />
                                <path d="m21 21-4.35-4.35" />
                              </svg>
                            </div>
                            No clients found.
                          </div>
                        ) : filteredClients.length === 0 ? (
                          <div
                            style={{
                              padding: "14px 16px",
                              textAlign: "center",
                              color: "var(--muted)",
                              fontSize: 13,
                            }}
                          >
                            <div style={{ marginBottom: 4 }}>
                              <svg
                                width="22"
                                height="22"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#cbd5e1"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                              >
                                <circle cx="11" cy="11" r="8" />
                                <path d="m21 21-4.35-4.35" />
                              </svg>
                            </div>
                            No client matching "{clientSearch}"
                          </div>
                        ) : (
                          filteredClients.map((c) => (
                            <div
                              key={c.id}
                              className="client-option"
                              onClick={() => selectClient(c)}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 12,
                                padding: "10px 14px",
                                cursor: "pointer",
                                borderBottom: "1px solid var(--border)",
                                transition: "background 0.12s",
                              }}
                            >
                              <div
                                style={{
                                  width: 36,
                                  height: 36,
                                  borderRadius: "50%",
                                  background: "var(--royal)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  color: "#fff",
                                  fontSize: 13,
                                  fontWeight: 700,
                                  flexShrink: 0,
                                }}
                              >
                                {(c.first_name?.[0] || "?").toUpperCase()}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p
                                  style={{
                                    margin: 0,
                                    fontSize: 13,
                                    fontWeight: 600,
                                    color: "var(--text)",
                                  }}
                                >
                                  {c.full_name}
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
                                  {c.email || ""}
                                  {c.phone ? ` · ${c.phone}` : ""}
                                </p>
                              </div>
                              {c.role && (
                                <span
                                  style={{
                                    fontSize: 10,
                                    background: "#dbeafe",
                                    color: "#1e40af",
                                    borderRadius: 4,
                                    padding: "2px 6px",
                                    fontWeight: 700,
                                    flexShrink: 0,
                                  }}
                                >
                                  {c.role.toUpperCase()}
                                </span>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                ))}

              {/* Walk-in Guest — plain text inputs */}
              {clientType === "walkin" && (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 10 }}
                >
                  <div>
                    <label
                      style={{
                        fontSize: 11,
                        color: "var(--muted)",
                        fontWeight: 700,
                        display: "block",
                        marginBottom: 4,
                      }}
                    >
                      Full Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Juan dela Cruz"
                      value={walkinName}
                      onChange={(e) => setWalkinName(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        border: "1.5px solid var(--border)",
                        borderRadius: 8,
                        fontSize: 13,
                        fontFamily: "inherit",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        fontSize: 11,
                        color: "var(--muted)",
                        fontWeight: 700,
                        display: "block",
                        marginBottom: 4,
                      }}
                    >
                      Contact{" "}
                      <span style={{ fontWeight: 400 }}>(optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 09171234567"
                      value={walkinContact}
                      inputMode="numeric"
                      maxLength={11}
                      onChange={(e) =>
                        setWalkinContact(
                          e.target.value.replace(/\D/g, "").slice(0, 11),
                        )
                      }
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        border: "1.5px solid var(--border)",
                        borderRadius: 8,
                        fontSize: 13,
                        fontFamily: "inherit",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                    {walkinContact && walkinContact.length !== 11 && (
                      <p
                        style={{
                          fontSize: 10,
                          color: "#dc2626",
                          margin: "4px 0 0",
                        }}
                      >
                        Must be 11 digits.
                      </p>
                    )}
                  </div>
                  {walkinName.trim() && (
                    <div
                      style={{
                        background: "#f0fdf4",
                        border: "1.5px solid #bbf7d0",
                        borderRadius: 8,
                        padding: "9px 12px",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <div
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: "50%",
                          background: "#16a34a",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#fff",
                          fontSize: 13,
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {walkinName.trim()[0].toUpperCase()}
                      </div>
                      <div>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 12,
                            fontWeight: 700,
                            color: "#166534",
                          }}
                        >
                          {walkinName.trim()}
                        </p>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 10,
                            color: "#16a34a",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <svg
                            width="10"
                            height="10"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#16a34a"
                            strokeWidth="2"
                            strokeLinecap="round"
                          >
                            <circle cx="12" cy="5" r="2" />
                            <path d="M12 22V12m0 0l-3 3m3-3l3 3" />
                            <path d="M9 9H5m14 0h-4" />
                          </svg>
                          Walk-in Guest
                          {walkinContact ? ` · ${walkinContact}` : ""}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Cart items ── */}
            <div
              style={{
                flex: 1,
                padding: "12px 18px",
                minHeight: 120,
                maxHeight: 260,
                overflowY: "auto",
              }}
            >
              {cart.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "20px 0",
                    color: "var(--muted)",
                  }}
                >
                  <img
                    src={ICONS.cart}
                    alt="Cart"
                    style={{
                      width: 36,
                      height: 36,
                      objectFit: "contain",
                      opacity: 0.35,
                      marginBottom: 8,
                    }}
                  />
                  <p style={{ fontSize: 13 }}>Cart is empty</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.id}
                    className="cart-item-enter"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 0",
                      borderBottom: "1px solid var(--border)",
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
                      <img
                        src={item.customIcon || getCategoryIcon(item.category)}
                        alt={item.category}
                        style={{
                          width: 20,
                          height: 20,
                          objectFit: "contain",
                          flexShrink: 0,
                          opacity: 0.85,
                        }}
                      />
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                          }}
                        >
                          <p
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              margin: 0,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {item.name}
                          </p>
                          {item.isCustom && (
                            <span
                              style={{
                                fontSize: 9,
                                background: "#dbeafe",
                                color: "#1e40af",
                                borderRadius: 4,
                                padding: "1px 5px",
                                fontWeight: 700,
                                flexShrink: 0,
                              }}
                            >
                              CUSTOM
                            </span>
                          )}
                        </div>
                        <p
                          style={{
                            fontSize: 11,
                            color: "var(--muted)",
                            margin: 0,
                          }}
                        >
                          ₱{Number(item.price).toFixed(2)} each
                        </p>
                      </div>
                    </div>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          background: "var(--bg)",
                          border: "1.5px solid var(--border)",
                          borderRadius: 8,
                          overflow: "hidden",
                        }}
                      >
                        <button
                          className="qty-btn"
                          onClick={() => updateQty(item.id, -1)}
                          style={{
                            width: 28,
                            height: 28,
                            border: "none",
                            background: "transparent",
                            cursor: "pointer",
                            fontSize: 15,
                            fontWeight: 700,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min={1}
                          value={item.qty}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCart((prev) =>
                              prev.map((i) =>
                                i.id === item.id
                                  ? {
                                      ...i,
                                      qty:
                                        val === ""
                                          ? ""
                                          : Math.max(1, parseInt(val, 10) || 1),
                                    }
                                  : i,
                              ),
                            );
                          }}
                          onBlur={(e) => {
                            if (
                              e.target.value === "" ||
                              Number(e.target.value) < 1
                            ) {
                              setCart((prev) =>
                                prev.map((i) =>
                                  i.id === item.id ? { ...i, qty: 1 } : i,
                                ),
                              );
                            }
                          }}
                          style={{
                            width: 40,
                            height: 28,
                            border: "none",
                            borderLeft: "1.5px solid var(--border)",
                            borderRight: "1.5px solid var(--border)",
                            background: "transparent",
                            fontSize: 13,
                            fontWeight: 700,
                            textAlign: "center",
                            fontFamily: "inherit",
                            outline: "none",
                            color: "var(--text)",
                            MozAppearance: "textfield",
                          }}
                        />
                        <button
                          className="qty-btn"
                          onClick={() => updateQty(item.id, 1)}
                          style={{
                            width: 28,
                            height: 28,
                            border: "none",
                            background: "transparent",
                            cursor: "pointer",
                            fontSize: 15,
                            fontWeight: 700,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* ── Totals + payment ── */}
            <div
              style={{
                padding: "16px 18px",
                borderTop: "1px solid var(--border)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 13,
                  padding: "4px 0",
                }}
              >
                <span style={{ color: "var(--muted)" }}>Subtotal</span>
                <AnimatedPrice value={subtotal} />
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: 13,
                  padding: "4px 0",
                }}
              >
                <span style={{ color: "var(--muted)" }}>Discount (%)</span>
                <input
                  type="number"
                  value={discount}
                  min={0}
                  max={DISCOUNT_CAP}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "") {
                      setDiscount("");
                      return;
                    }
                    setDiscount(
                      Math.min(DISCOUNT_CAP, Math.max(0, Number(val))),
                    );
                  }}
                  style={{
                    width: 64,
                    padding: "4px 8px",
                    border: "1.5px solid var(--border)",
                    borderRadius: 6,
                    fontSize: 13,
                    textAlign: "right",
                    fontFamily: "inherit",
                    outline: "none",
                  }}
                />
              </div>
              {Number(discount) > 0 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 13,
                    padding: "4px 0",
                    color: "#dc2626",
                  }}
                >
                  <span>Discount</span>
                  <AnimatedPrice
                    value={discountAmt}
                    style={{ color: "#dc2626" }}
                    prefix="-₱"
                  />
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: 18,
                  fontWeight: 800,
                  padding: "10px 0",
                  borderTop: "2px solid var(--border)",
                  marginTop: 8,
                }}
              >
                <span>TOTAL</span>
                <AnimatedPrice
                  value={total}
                  duration={450}
                  style={{
                    fontSize: 20,
                    fontWeight: 800,
                    color: "var(--royal)",
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                {["Cash"].map((m) => (
                  <button
                    key={m}
                    onClick={() => setPayMethod(m)}
                    className="pay-method"
                    style={{
                      flex: 1,
                      padding: "9px 0",
                      border: `2px solid ${payMethod === m ? "var(--royal)" : "var(--border)"}`,
                      borderRadius: 8,
                      background:
                        payMethod === m ? "var(--royal)" : "var(--card)",
                      color: payMethod === m ? "#fff" : "var(--muted)",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      transition: "all 0.18s",
                      width: "auto",
                      letterSpacing: "0.3px",
                    }}
                  >
                    {m}
                  </button>
                ))}
              </div>

              <div style={{ marginBottom: 14 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 6,
                  }}
                >
                  <label
                    style={{
                      fontSize: 12,
                      color: "var(--muted)",
                      fontWeight: 600,
                    }}
                  >
                    Amount Received
                  </label>
                  {amountGiven !== "" && (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color:
                          Number(amountGiven) < total ? "#dc2626" : "#16a34a",
                      }}
                    >
                      {Number(amountGiven) < total
                        ? "Insufficient"
                        : "Sufficient"}
                    </span>
                  )}
                </div>
                <div style={{ position: "relative" }}>
                  <span
                    style={{
                      position: "absolute",
                      left: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      fontSize: 13,
                      color: "var(--muted)",
                      fontWeight: 600,
                      pointerEvents: "none",
                    }}
                  >
                    ₱
                  </span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="0.00"
                    value={amountGiven}
                    onChange={(e) => setAmountGiven(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 12px 10px 26px",
                      border: `1.5px solid ${amountGiven !== "" && Number(amountGiven) < total ? "#fca5a5" : "var(--border)"}`,
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: 700,
                      fontFamily: "inherit",
                      outline: "none",
                      boxSizing: "border-box",
                      color: "var(--text)",
                    }}
                  />
                </div>
                {amountGiven !== "" &&
                  Number(amountGiven) >= total &&
                  total > 0 && (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginTop: 8,
                        padding: "8px 12px",
                        background: "#f0fdf4",
                        border: "1px solid #bbf7d0",
                        borderRadius: 8,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          color: "#166534",
                          fontWeight: 600,
                        }}
                      >
                        Change
                      </span>
                      <AnimatedPrice
                        value={Number(amountGiven) - total}
                        style={{
                          fontSize: 15,
                          fontWeight: 800,
                          color: "#16a34a",
                        }}
                      />
                    </div>
                  )}
              </div>

              {(() => {
                const contactValid =
                  !walkinContact || walkinContact.length === 11;
                const clientReady =
                  clientType === "registered"
                    ? !!selectedClient
                    : !!walkinName.trim() && contactValid;
                const canPay = cart.length > 0 && clientReady;
                return (
                  <>
                    <button
                      className="process-btn"
                      onClick={processPayment}
                      disabled={!canPay}
                      style={{
                        width: "100%",
                        padding: "14px 0",
                        background: canPay ? "var(--royal)" : "#e5e7eb",
                        color: canPay ? "#fff" : "#9ca3af",
                        border: "none",
                        borderRadius: 10,
                        fontSize: 14,
                        fontWeight: 700,
                        cursor: canPay ? "pointer" : "default",
                        fontFamily: "inherit",
                        letterSpacing: "0.3px",
                      }}
                    >
                      {!clientReady
                        ? clientType === "registered"
                          ? "Select a client first"
                          : "Enter client name first"
                        : cart.length === 0
                          ? "Add items to cart"
                          : "Process Payment"}
                    </button>
                  </>
                );
              })()}
            </div>
          </div>
          {/* ══ End Cart Panel ══ */}
        </div>
        {/* ── End content grid ── */}
      </div>
      {/* ── End S.page ── */}

      {/* ══ Receipt Modal ══ */}
      {showReceipt && lastTx && (
        <div style={S.overlay}>
          <div
            style={{
              background: "#fff",
              borderRadius: 14,
              width: "100%",
              maxWidth: 400,
              maxHeight: "90vh",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
            }}
          >
            <div className="modal-header">
              <h3>Receipt</h3>
              <button
                className="btn btn-ghost btn-icon"
                style={S.btn}
                onClick={() => setShowReceipt(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div
                style={{
                  background: "#fff",
                  borderRadius: 8,
                  padding: "20px 16px",
                  border: "1px dashed var(--border)",
                }}
                dangerouslySetInnerHTML={{
                  __html: generateReceiptHTML(lastTx),
                }}
              />
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-ghost"
                style={S.btn}
                onClick={() => printReceiptHTML(generateReceiptHTML(lastTx))}
              >
                Print
              </button>
              <button
                className="btn btn-primary"
                style={S.btn}
                onClick={() => setShowReceipt(false)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Void Confirm Modal ══ */}
      {confirmVoid.show && (
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
                  background: "#fef2f2",
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
                  stroke="#dc2626"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
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
                Void Transaction?
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
                This transaction will be marked as voided but kept on record.
                This action can be reviewed later in transaction history.
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
                onClick={() => setConfirmVoid({ show: false, txId: null })}
              >
                Cancel
              </button>
              <button
                className="btn"
                style={{
                  width: "auto",
                  background: "#dc2626",
                  color: "#fff",
                  border: "none",
                }}
                onClick={confirmVoidTransaction}
              >
                Void Transaction
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Transaction History Modal ══ */}
      {showTx && (
        <div style={S.overlay}>
          <div
            style={{
              background: "#fff",
              borderRadius: 14,
              width: "100%",
              maxWidth: 750,
              maxHeight: "90vh",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
            }}
          >
            <div className="modal-header">
              <h3>Transaction History</h3>
              <button
                className="btn btn-ghost btn-icon"
                style={S.btn}
                onClick={() => setShowTx(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
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
                      {[
                        ...[
                          "Client",
                          "Email",
                          "Items",
                          "Subtotal",
                          "Discount",
                          "Total",
                          "Payment",
                          "Date",
                          "Status",
                        ],
                        ...(canVoid ? ["Actions"] : []),
                      ].map((h) => (
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
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.length === 0 ? (
                      <tr>
                        <td
                          colSpan={canVoid ? 10 : 9}
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
                      transactions.map((t) => {
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
                                color: "var(--muted)",
                                fontSize: 11,
                              }}
                            >
                              {t.client_email || "—"}
                            </td>
                            <td style={{ padding: "10px 12px" }}>
                              {(t.items || []).length} items
                            </td>
                            <td style={{ padding: "10px 12px" }}>
                              ₱{Number(t.subtotal).toFixed(2)}
                            </td>
                            <td style={{ padding: "10px 12px" }}>
                              {t.discount}%
                            </td>
                            <td style={{ padding: "10px 12px" }}>
                              <strong style={{ color: "var(--royal)" }}>
                                ₱{Number(t.total).toFixed(2)}
                              </strong>
                            </td>
                            <td style={{ padding: "10px 12px" }}>
                              {t.payment}
                            </td>
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
                            {canVoid && (
                              <td style={{ padding: "10px 12px" }}>
                                {!isVoided && (
                                  <button
                                    onClick={() => voidTransaction(t.id)}
                                    style={{
                                      background: "#fef2f2",
                                      border: "1.5px solid #fca5a5",
                                      color: "#dc2626",
                                      borderRadius: 8,
                                      padding: "5px 10px",
                                      fontSize: 11,
                                      fontWeight: 700,
                                      cursor: "pointer",
                                      fontFamily: "inherit",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 4,
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
                                    Void
                                  </button>
                                )}
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-ghost"
                style={S.btn}
                onClick={() => setShowTx(false)}
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

export default PointOfSale;
