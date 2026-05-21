import React, { useState, useEffect, useRef, useCallback } from "react";
import Layout from "../components/layout";
import { supabase } from "../js/supabase";
import { useCurrentUser } from "../js/useCurrentUser";
import { useBranchFilter, withBranchId } from "../js/useBranchFilter";

// ─── Animated helpers ─────────────────────────────────────────────────────────
function useAnimatedNumber(value, duration = 350) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);
  const rafRef = useRef(null);
  useEffect(() => {
    const from = prevRef.current, to = value;
    if (from === to) return;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setDisplay(from + (to - from) * ease);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else { setDisplay(to); prevRef.current = to; }
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
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [value]);
  const flash = color === "up" ? "#16a34a" : color === "down" ? "#dc2626" : null;
  return (
    <span style={{ display: "inline-block", color: flash || style.color || "inherit", transform: bump ? "scale(1.12)" : "scale(1)", transition: "transform 0.25s cubic-bezier(.34,1.56,.64,1), color 0.3s", ...style }}>
      {prefix}{animated.toFixed(2)}
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
      const t = setTimeout(() => { setDisplay(value); setAnim(false); prevRef.current = value; }, 150);
      return () => clearTimeout(t);
    }
  }, [value]);
  return (
    <span style={{ display: "inline-block", minWidth: 20, textAlign: "center", transform: anim ? "scale(1.4)" : "scale(1)", transition: "transform 0.2s cubic-bezier(.34,1.56,.64,1)", ...style }}>
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

const CUSTOM_TYPES = [
  { label: "Service", icon: ICONS.service, color: "#eff6ff", border: "#bfdbfe", text: "#1e40af" },
  { label: "Food", icon: ICONS.food, color: "#f0fdf4", border: "#bbf7d0", text: "#166534" },
  { label: "Medicine", icon: ICONS.medicine, color: "#faf5ff", border: "#e9d5ff", text: "#6b21a8" },
  { label: "Grooming", icon: ICONS.grooming, color: "#fff7ed", border: "#fed7aa", text: "#9a3412" },
  { label: "Consultation", icon: ICONS.consultation, color: "#f0fdfa", border: "#99f6e4", text: "#134e4a" },
  { label: "Other", icon: ICONS.other, color: "#f8fafc", border: "#e2e8f0", text: "#475569" },
];

// ─── Main Component ───────────────────────────────────────────────────────────
const PointOfSale = () => {
  const { user, loading: userLoading } = useCurrentUser();
  const { applyFilter } = useBranchFilter();

  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" && window.innerWidth <= 768);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [catFilter, setCatFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [payMethod, setPayMethod] = useState("Cash");
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastTx, setLastTx] = useState(null);
  const [showTx, setShowTx] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [showCustom, setShowCustom] = useState(false);
  const [customType, setCustomType] = useState(CUSTOM_TYPES[0]);
  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [customQty, setCustomQty] = useState(1);

  const [clients, setClients] = useState([]);
  const [clientSearch, setClientSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientType, setClientType] = useState('registered'); // 'registered' | 'walkin'
  const [walkinName, setWalkinName] = useState('');
  const [walkinContact, setWalkinContact] = useState('');
  const clientRef = useRef(null);

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  useEffect(() => {
    const h = (e) => { if (clientRef.current && !clientRef.current.contains(e.target)) setShowDropdown(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("inventory").select("*").gt("qty", 0).order("name");

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
      supabase.from("transactions").select("*").order("created_at", { ascending: false })
    );
    if (error) { console.error("fetchTransactions error:", error.message); setTransactions([]); return; }
    setTransactions(data || []);
  }, [applyFilter]);

  const fetchClients = useCallback(async () => {
    let query = supabase.from("profiles").select("id, first_name, last_name, email, phone, role")
      .eq("status", "Active").order("first_name");

    if (user?.branchId) {
      query = query.eq("branch_id", user.branchId);
    }

    const { data, error } = await query;
    if (error) { console.error("fetchClients error:", error.message); setClients([]); return; }
    setClients((data || []).map((p) => ({
      ...p,
      full_name: `${p.first_name || ""} ${p.last_name || ""}`.trim() || p.email || "Unnamed",
    })));
  }, [user]);

  useEffect(() => {
    if (userLoading || !user) return;
    fetchProducts();
    fetchClients();
    fetchTransactions();

    const inventoryChannel = supabase
      .channel("pos-inventory-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "inventory" }, () => fetchProducts())
      .subscribe();

    const profilesChannel = supabase
      .channel("pos-profiles-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => fetchClients())
      .subscribe();

    return () => {
      supabase.removeChannel(inventoryChannel);
      supabase.removeChannel(profilesChannel);
    };
  }, [userLoading, user, fetchProducts, fetchClients]);

  useEffect(() => {
    if (userLoading || !user) return;
    const txChannel = supabase
      .channel("pos-transactions-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, () => fetchTransactions())
      .subscribe();
    return () => supabase.removeChannel(txChannel);
  }, [userLoading, user, fetchTransactions]);

  const categories = ["All", ...new Set(products.map((p) => p.category))];
  const filtered = products.filter((p) =>
    (catFilter === "All" || p.category === catFilter) &&
    (!search || p.name.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredClients = (() => {
    const q = clientSearch.toLowerCase().trim();
    if (!q) return clients;
    return clients.filter((c) =>
      c.full_name.toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q) ||
      (c.phone || "").includes(q)
    );
  })();

  // ── Cart helpers ──────────────────────────────────────────────────────────
  const addToCart = (product) => {
    setCart((prev) => {
      const ex = prev.find((i) => i.id === product.id);
      if (ex) return prev.map((i) => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const updateQty = (id, delta) => {
    setCart((prev) =>
      prev.map((i) => i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i)
        .filter((i) => i.qty > 0)
    );
  };

  const getCategoryIcon = (category) => {
    const map = {
      "Service": ICONS.service, "Food": ICONS.food, "Medicine": ICONS.medicine,
      "Grooming": ICONS.grooming, "Consultation": ICONS.consultation, "Other": ICONS.other,
    };
    return map[category] || ICONS.other;
  };

  const addCustomItem = () => {
    if (!customName.trim()) { alert("Please enter an item name."); return; }
    const price = parseFloat(customPrice);
    if (isNaN(price) || price < 0) { alert("Please enter a valid price."); return; }
    const qty = Math.max(1, parseInt(customQty) || 1);
    setCart((prev) => [...prev, { id: `custom_${Date.now()}`, name: customName.trim(), category: customType.label, price, qty, isCustom: true, customIcon: customType.icon }]);
    setCustomName(""); setCustomPrice(""); setCustomQty(1);
    setCustomType(CUSTOM_TYPES[0]); setShowCustom(false);
  };

  const subtotal = cart.reduce((sum, i) => sum + Number(i.price) * i.qty, 0);
  const discountAmt = subtotal * (Number(discount) / 100);
  const total = subtotal - discountAmt;

  const processPayment = async () => {
    if (cart.length === 0) { alert("Cart is empty"); return; }

    // Validate based on client type
    if (clientType === 'registered' && !selectedClient) { alert("Please select a client"); return; }
    if (clientType === 'walkin' && !walkinName.trim()) { alert("Please enter the walk-in client name"); return; }

    const cartSnapshot = [...cart];
    const items = cartSnapshot.map((i) => ({ id: i.id, name: i.name, qty: i.qty, price: i.price, isCustom: i.isCustom || false }));

    const clientName = clientType === 'walkin' ? walkinName.trim() : selectedClient.full_name;
    const clientId = clientType === 'walkin' ? null : selectedClient.id;
    const clientEmail = clientType === 'walkin' ? null : (selectedClient.email || null);
    const clientContact = clientType === 'walkin' ? walkinContact.trim() : (selectedClient.phone || null);

    const txPayload = withBranchId(user, {
      client: clientName,
      client_id: clientId,
      client_email: clientEmail,
      client_contact: clientContact || null,
      is_walkin: clientType === 'walkin',
      items,
      subtotal,
      discount: Number(discount),
      total,
      payment: payMethod,
    });

    const { data, error } = await supabase.from("transactions").insert([txPayload]).select();
    if (error) { alert("Error: " + error.message); return; }
    if (!data?.length) { alert("Transaction failed — check RLS policies"); return; }

    for (const item of cartSnapshot) {
      if (!item.isCustom) {
        const product = products.find((p) => p.id === item.id);
        if (product) {
          await supabase.from("inventory").update({ qty: Math.max(0, product.qty - item.qty) }).eq("id", item.id);
        }
      }
    }

    setLastTx({
      ...data[0],
      items,
      // carry walk-in info into receipt if needed
      _walkinContact: clientType === 'walkin' ? walkinContact.trim() : (selectedClient?.phone || null),
      _isWalkin: clientType === 'walkin',
    });
    setShowReceipt(true);
    setCart([]);
    setSelectedClient(null);
    setClientSearch("");
    setWalkinName('');
    setWalkinContact('');
    setClientType('registered');
    setDiscount(0);
  };

  const voidTransaction = async (txId) => {
    if (!window.confirm("Void this transaction? This will permanently delete it. This cannot be undone.")) return;
    const { error } = await supabase.from("transactions").delete().eq("id", txId);
    if (error) { alert("Error voiding transaction: " + error.message); return; }
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
    setWalkinName('');
    setWalkinContact('');
  };

  const S = {
    page: { width: "100%", minHeight: "100vh", display: "block" },
    topbar: {
      background: "#fff", borderBottom: "1px solid var(--border)",
      padding: "14px 28px", display: "flex", alignItems: "center",
      justifyContent: "space-between", position: "fixed",
      top: "var(--topbar-h)", zIndex: 50,
      left: "var(--current-sidebar-w, 62px)", right: 0,
      boxSizing: "border-box", gap: 12,
      overflow: "hidden",                                          /* ← add this */
      transition: "left 0.3s cubic-bezier(0.4,0,0.2,1)",
    },
    cont: {
      padding: "24px 28px",
      paddingTop: "calc(var(--topbar-h) + var(--pagetop-h) + 20px)",
      width: "100%", boxSizing: "border-box",
    },
    btn: { width: "auto" },
    inp: { padding: "9px 12px", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 13, fontFamily: "inherit", background: "#fff", color: "var(--text)", outline: "none" },
    overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 16 },
  };

  return (
    <Layout>
      <style>{`
        @keyframes posSlideIn { from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)} }
        @keyframes posPulse   { 0%{box-shadow:0 0 0 0 rgba(59,130,246,0.4)}70%{box-shadow:0 0 0 8px rgba(59,130,246,0)}100%{box-shadow:0 0 0 0 rgba(59,130,246,0)} }
        .cart-item-enter { animation: posSlideIn 0.22s ease both; }
        .qty-btn { transition: all 0.15s; }
        .qty-btn:hover { background: var(--royal) !important; color: #fff !important; border-color: var(--royal) !important; }
        .qty-btn:active { transform: scale(0.84) !important; }
        .product-card { transition: all 0.18s cubic-bezier(.4,0,.2,1); cursor: pointer; }
        .product-card:hover { border-color: var(--royal) !important; background: #f0f5ff !important; transform: translateY(-3px); box-shadow: 0 6px 20px rgba(59,130,246,0.13) !important; }
        .client-option:hover { background: #f0f5ff !important; }
        .cat-pill { padding: 6px 14px; border-radius: 99px; border: 1.5px solid var(--border); background: #fff; font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.15s; color: var(--muted); white-space: nowrap; }
        .cat-pill.active { background: var(--royal); color: #fff; border-color: var(--royal); }
        .cat-pill:hover:not(.active) { border-color: var(--royal); color: var(--royal); }
        @keyframes shimmer { 0%{background-position:-600px 0} 100%{background-position:600px 0} }
        .skel { background: linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%); background-size: 600px 100%; animation: shimmer 1.4s infinite linear; border-radius: 8px; display: block; }
        .pay-method:hover { opacity: 0.85; }
        .process-btn:not(:disabled):hover { opacity: 0.88; transform: translateY(-1px); box-shadow: 0 4px 14px rgba(59,130,246,0.3); }
        .process-btn { transition: all 0.18s; }
}
      `}</style>

      {/* ── S.page wrapper ── */}
      <div style={S.page}>

        {/* ── Topbar ── */}
        <div style={S.topbar}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src="/icon/point_of_sale.png" alt="" style={{ width: 22, height: 22, filter: "brightness(0) saturate(100%) invert(17%) sepia(82%) saturate(1200%) hue-rotate(210deg)" }} />
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", margin: 0 }}>Point of Sale</h1>
              <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>Process transactions</p>
            </div>
          </div>
          <button className="btn btn-ghost" onClick={() => { setShowTx(true); fetchTransactions(); }} style={{ ...S.btn, display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg> Transactions
          </button>
        </div>

        {/* ── Content grid (Products + Cart) ── */}
        <div style={{ ...S.cont, display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 390px", gap: 20, minHeight: "calc(100vh - 160px)" }}>

          {/* ══ Products Panel ══ */}
          <div>
            <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--bg)", border: "1.5px solid var(--border)", borderRadius: 8, padding: "8px 14px", flex: 1, minWidth: 180 }}>
                <img src="/icon/search.png" alt="" style={{ width: 16, height: 16, filter: "brightness(0) saturate(100%) invert(40%)" }} />
                <input type="text" placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)}
                  style={{ border: "none", background: "transparent", fontSize: 13, color: "var(--text)", outline: "none", fontFamily: "inherit", width: "100%" }} />
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                {categories.map((c) => (
                  <button key={c} className={`cat-pill${catFilter === c ? " active" : ""}`} onClick={() => setCatFilter(c)}>{c}</button>
                ))}
              </div>
            </div>

            <button onClick={() => setShowCustom(true)}
              style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", marginBottom: 16, padding: "12px 18px", background: "linear-gradient(135deg,#eff6ff,#f0fdf4)", border: "1.5px dashed #93c5fd", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", boxSizing: "border-box", transition: "all 0.18s" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--royal)"; e.currentTarget.style.background = "#eff6ff"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#93c5fd"; e.currentTarget.style.background = "linear-gradient(135deg,#eff6ff,#f0fdf4)"; }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--royal)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: "#fff", fontSize: 20, lineHeight: 1 }}>+</span>
              </div>
              <div style={{ textAlign: "left" }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--royal)" }}>Add Custom Item</p>
                <p style={{ margin: 0, fontSize: 11, color: "var(--muted)" }}>Services, grooming, consultation & more</p>
              </div>
              <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
                {CUSTOM_TYPES.slice(0, 4).map((t) => (
                  <img key={t.label} src={t.icon} alt={t.label} style={{ width: 18, height: 18, objectFit: "contain", opacity: 0.7 }} />
                ))}
              </div>
            </button>

            {loading ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 12 }}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 14, textAlign: "center" }}>
                    {/* Icon placeholder */}
                    <div style={{ width: 48, height: 48, borderRadius: 12, margin: "0 auto 10px" }}>
                      <span className="skel" style={{ width: 48, height: 48, borderRadius: 12 }} />
                    </div>
                    {/* Name */}
                    <span className="skel" style={{ width: "80%", height: 13, marginBottom: 6, display: "block", margin: "0 auto 6px" }} />
                    {/* Category */}
                    <span className="skel" style={{ width: "55%", height: 11, marginBottom: 8, display: "block", margin: "0 auto 8px" }} />
                    {/* Price */}
                    <span className="skel" style={{ width: "45%", height: 14, display: "block", margin: "0 auto" }} />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
                <img src={ICONS.other} alt="" style={{ width: 36, height: 36, opacity: 0.4, marginBottom: 8 }} />
                <p style={{ fontSize: 14 }}>No products found</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 12 }}>
                {filtered.map((p) => (
                  <div key={p.id} className="product-card" onClick={() => addToCart(p)}
                    style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 10, padding: 14, cursor: "pointer", textAlign: "center" }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--light-blue)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
                      <img src={getCategoryIcon(p.category)} alt={p.category} style={{ width: 28, height: 28, objectFit: "contain" }} />
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 600, margin: "0 0 2px", color: "var(--text)" }}>{p.name}</p>
                    <p style={{ fontSize: 11, color: "var(--muted)", margin: "0 0 8px" }}>{p.category}</p>
                    <p style={{ fontSize: 14, fontWeight: 800, color: "var(--royal)", margin: 0 }}>₱{Number(p.price).toFixed(2)}</p>
                    <div style={{ marginTop: 6, display: "inline-flex", alignItems: "center", gap: 4, background: p.qty <= (p.threshold ?? 10) ? "#fef2f2" : "#f0fdf4", border: `1px solid ${p.qty <= (p.threshold ?? 10) ? "#fecaca" : "#bbf7d0"}`, borderRadius: 99, padding: "2px 8px" }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: p.qty <= (p.threshold ?? 10) ? "#dc2626" : "#16a34a", flexShrink: 0 }} />
                      <span style={{ fontSize: 10, fontWeight: 700, color: p.qty <= (p.threshold ?? 10) ? "#dc2626" : "#166534" }}>
                        {p.qty} {p.unit}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ══ Cart Panel ══ */}
          <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", display: "flex", flexDirection: "column", overflow: "visible", boxShadow: "var(--shadow)", height: "fit-content", position: isMobile ? "static" : "sticky", top: 140 }}>

            <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <img src={ICONS.cart} alt="Cart" style={{ width: 20, height: 20, objectFit: "contain" }} />
                <strong style={{ fontSize: 15, fontWeight: 700 }}>Cart</strong>
                {cart.length > 0 && (
                  <span style={{ background: "var(--royal)", color: "#fff", borderRadius: 99, fontSize: 11, fontWeight: 700, padding: "2px 7px", animation: "posPulse 0.4s ease" }}>
                    <AnimatedQty value={cart.reduce((s, i) => s + i.qty, 0)} />
                  </span>
                )}
              </div>
              {cart.length > 0 && (
                <button onClick={() => setCart([])} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 12, fontFamily: "inherit", width: "auto" }}>Clear all</button>
              )}
            </div>

            {/* ── Client selector ── */}
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", position: "relative" }} ref={clientRef}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 8 }}>Client</label>

              {/* Toggle: Registered vs Walk-in */}
              <div style={{ display: "flex", border: "1.5px solid var(--border)", borderRadius: 8, overflow: "hidden", marginBottom: 12 }}>
                {[
                  { key: "registered", label: "Registered" },
                  { key: "walkin", label: "Walk-in" },
                ].map(({ key, label }) => (
                  <button key={key} type="button"
                    onClick={() => { setClientType(key); clearClient(); }}
                    style={{
                      flex: 1, padding: "7px 0", border: "none", fontSize: 12, fontWeight: 600,
                      cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
                      background: clientType === key ? "var(--royal)" : "#fff",
                      color: clientType === key ? "#fff" : "var(--muted)",
                    }}>
                    {label}
                  </button>
                ))}
              </div>

              {/* Registered Client — searchable dropdown */}
              {clientType === "registered" && (
                selectedClient ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#f0fdf4", border: "1.5px solid #bbf7d0", borderRadius: 10, padding: "10px 14px" }}>
                    <div style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--royal)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
                      {(selectedClient.first_name?.[0] || "?").toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#166534" }}>{selectedClient.full_name}</p>
                      <p style={{ margin: 0, fontSize: 11, color: "#16a34a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {selectedClient.email || ""}{selectedClient.phone ? ` · ${selectedClient.phone}` : ""}
                      </p>
                    </div>
                    <button onClick={clearClient} style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", fontSize: 13, fontWeight: 700, fontFamily: "inherit", flexShrink: 0, padding: 0 }}>✕</button>
                  </div>
                ) : (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "9px 12px", border: `1.5px solid ${showDropdown ? "var(--royal)" : "var(--border)"}`, borderRadius: 8, boxSizing: "border-box", background: "#fff", cursor: "text", transition: "border-color 0.15s" }}
                      onClick={() => setShowDropdown(true)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5" style={{ flexShrink: 0 }}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                      <input
                        type="text"
                        placeholder="Search client name or email..."
                        value={clientSearch}
                        onChange={(e) => { setClientSearch(e.target.value); setShowDropdown(true); }}
                        onFocus={() => setShowDropdown(true)}
                        style={{ border: "none", background: "transparent", fontSize: 13, color: "var(--text)", outline: "none", fontFamily: "inherit", width: "100%" }}
                      />
                      {clientSearch && (
                        <button onClick={clearClient} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: 14, padding: 0, lineHeight: 1, width: "auto" }}>✕</button>
                      )}
                    </div>

                    {showDropdown && (
                      <div style={{ position: "absolute", top: "100%", left: 18, right: 18, background: "#fff", border: "1.5px solid var(--border)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 9999, maxHeight: 240, overflowY: "auto", marginTop: 4 }}>
                        <div style={{ padding: "8px 14px 6px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Clients</span>
                          <span style={{ fontSize: 10, color: "var(--muted)" }}>{filteredClients.length} found</span>
                        </div>
                        {clients.length === 0 ? (
                          <div style={{ padding: "14px 16px", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
                            <div style={{ marginBottom: 4 }}>
                              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                            </div>No clients found.
                          </div>
                        ) : filteredClients.length === 0 ? (
                          <div style={{ padding: "14px 16px", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
                            <div style={{ marginBottom: 4 }}>
                              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                            </div>No client matching "{clientSearch}"
                          </div>
                        ) : filteredClients.map((c) => (
                          <div key={c.id} className="client-option"
                            onClick={() => selectClient(c)}
                            style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid var(--border)", transition: "background 0.12s" }}>
                            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--royal)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                              {(c.first_name?.[0] || "?").toUpperCase()}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{c.full_name}</p>
                              <p style={{ margin: 0, fontSize: 11, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {c.email || ""}{c.phone ? ` · ${c.phone}` : ""}
                              </p>
                            </div>
                            {c.role && (
                              <span style={{ fontSize: 10, background: "#dbeafe", color: "#1e40af", borderRadius: 4, padding: "2px 6px", fontWeight: 700, flexShrink: 0 }}>
                                {c.role.toUpperCase()}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              )}

              {/* Walk-in Guest — plain text inputs */}
              {clientType === "walkin" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700, display: "block", marginBottom: 4 }}>Full Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Juan dela Cruz"
                      value={walkinName}
                      onChange={e => setWalkinName(e.target.value)}
                      style={{ width: "100%", padding: "9px 12px", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700, display: "block", marginBottom: 4 }}>Contact <span style={{ fontWeight: 400 }}>(optional)</span></label>
                    <input
                      type="text"
                      placeholder="e.g. 09xx-xxx-xxxx"
                      value={walkinContact}
                      onChange={e => setWalkinContact(e.target.value)}
                      style={{ width: "100%", padding: "9px 12px", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
                    />
                  </div>
                  {walkinName.trim() && (
                    <div style={{ background: "#f0fdf4", border: "1.5px solid #bbf7d0", borderRadius: 8, padding: "9px 12px", display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                        {walkinName.trim()[0].toUpperCase()}
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#166534" }}>{walkinName.trim()}</p>
                        <p style={{ margin: 0, fontSize: 10, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="5" r="2" /><path d="M12 22V12m0 0l-3 3m3-3l3 3" /><path d="M9 9H5m14 0h-4" /></svg>
                          Walk-in Guest{walkinContact ? ` · ${walkinContact}` : ""}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Cart items ── */}
            <div style={{ flex: 1, padding: "12px 18px", minHeight: 120, maxHeight: 260, overflowY: "auto" }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: "center", padding: "20px 0", color: "var(--muted)" }}>
                  <img src={ICONS.cart} alt="Cart" style={{ width: 36, height: 36, objectFit: "contain", opacity: 0.35, marginBottom: 8 }} />
                  <p style={{ fontSize: 13 }}>Cart is empty</p>
                </div>
              ) : cart.map((item) => (
                <div key={item.id} className="cart-item-enter" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 10 }}>
                    <img src={item.customIcon || getCategoryIcon(item.category)} alt={item.category} style={{ width: 20, height: 20, objectFit: "contain", flexShrink: 0, opacity: 0.85 }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</p>
                        {item.isCustom && <span style={{ fontSize: 9, background: "#dbeafe", color: "#1e40af", borderRadius: 4, padding: "1px 5px", fontWeight: 700, flexShrink: 0 }}>CUSTOM</span>}
                      </div>
                      <p style={{ fontSize: 11, color: "var(--muted)", margin: 0 }}>₱{Number(item.price).toFixed(2)} each</p>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", background: "var(--bg)", border: "1.5px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
                      <button className="qty-btn" onClick={() => updateQty(item.id, -1)} style={{ width: 28, height: 28, border: "none", background: "transparent", cursor: "pointer", fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                      <AnimatedQty value={item.qty} style={{ fontSize: 13, fontWeight: 700, minWidth: 22, textAlign: "center" }} />
                      <button className="qty-btn" onClick={() => updateQty(item.id, 1)} style={{ width: 28, height: 28, border: "none", background: "transparent", cursor: "pointer", fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Totals + payment ── */}
            <div style={{ padding: "16px 18px", borderTop: "1px solid var(--border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0" }}>
                <span style={{ color: "var(--muted)" }}>Subtotal</span>
                <AnimatedPrice value={subtotal} />
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13, padding: "4px 0" }}>
                <span style={{ color: "var(--muted)" }}>Discount (%)</span>
                <input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} min={0} max={100}
                  style={{ width: 64, padding: "4px 8px", border: "1.5px solid var(--border)", borderRadius: 6, fontSize: 13, textAlign: "right", fontFamily: "inherit", outline: "none" }} />
              </div>
              {Number(discount) > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0", color: "#dc2626" }}>
                  <span>Discount</span>
                  <AnimatedPrice value={discountAmt} style={{ color: "#dc2626" }} prefix="-₱" />
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 18, fontWeight: 800, padding: "10px 0", borderTop: "2px solid var(--border)", marginTop: 8 }}>
                <span>TOTAL</span>
                <AnimatedPrice value={total} duration={450} style={{ fontSize: 20, fontWeight: 800, color: "var(--royal)" }} />
              </div>

              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                {["Cash", "Card", "GCash"].map((m) => (
                  <button key={m} onClick={() => setPayMethod(m)} className="pay-method"
                    style={{ flex: 1, padding: "9px 0", border: `2px solid ${payMethod === m ? "var(--royal)" : "var(--border)"}`, borderRadius: 8, background: payMethod === m ? "var(--royal)" : "#fff", color: payMethod === m ? "#fff" : "var(--muted)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "all 0.18s", width: "auto", letterSpacing: "0.3px" }}>
                    {m}
                  </button>
                ))}
              </div>

              {(() => {
                const clientReady = clientType === "registered" ? !!selectedClient : !!walkinName.trim();
                const canPay = cart.length > 0 && clientReady;
                return (
                  <>
                    <style>{`#pay-btn:hover { opacity: 0.88; }`}</style>
                    <button className="process-btn" onClick={processPayment} disabled={!canPay}
                      style={{ width: "100%", padding: "14px 0", background: canPay ? "var(--royal)" : "#e5e7eb", color: canPay ? "#fff" : "#9ca3af", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: canPay ? "pointer" : "default", fontFamily: "inherit", letterSpacing: "0.3px" }}>
                      {!clientReady
                        ? (clientType === "registered" ? "Select a client first" : "Enter client name first")
                        : cart.length === 0 ? "Add items to cart"
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

      {/* ══ Add Custom Item Modal ══ */}
      {showCustom && (
        <div style={S.overlay}>
          <div style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 480, boxShadow: "0 24px 64px rgba(0,0,0,0.25)", overflow: "hidden" }}>
            <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Add Custom Item</h3>
                <p style={{ margin: 0, fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Service, food, or any custom charge</p>
              </div>
              <button onClick={() => setShowCustom(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--muted)", lineHeight: 1, padding: "2px 6px" }}>✕</button>
            </div>
            <div style={{ padding: "20px 24px" }}>
              <div style={{ marginBottom: 18 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 8 }}>Item Type</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                  {CUSTOM_TYPES.map((t) => (
                    <button key={t.label} onClick={() => setCustomType(t)}
                      style={{ padding: "10px 8px", border: `2px solid ${customType.label === t.label ? t.border : "var(--border)"}`, borderRadius: 10, background: customType.label === t.label ? t.color : "#fff", cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s", textAlign: "center" }}>
                      <div style={{ display: "flex", justifyContent: "center", marginBottom: 4 }}>
                        <img src={t.icon} alt={t.label} style={{ width: 26, height: 26, objectFit: "contain" }} />
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: customType.label === t.label ? t.text : "var(--muted)" }}>{t.label}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 6 }}>Item Name *</label>
                <input autoFocus type="text" value={customName} onChange={(e) => setCustomName(e.target.value)}
                  placeholder={`e.g. ${customType.label === "Service" ? "Rabies Vaccination" : "Custom item"}`}
                  style={{ width: "100%", padding: "10px 12px", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
                  onKeyDown={(e) => { if (e.key === "Enter") addCustomItem(); }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 6 }}>Price (₱) *</label>
                  <input type="number" value={customPrice} onChange={(e) => setCustomPrice(e.target.value)} placeholder="0.00" min="0" step="0.01"
                    style={{ width: "100%", padding: "10px 12px", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 6 }}>Quantity</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button onClick={() => setCustomQty((q) => Math.max(1, q - 1))} style={{ width: 36, height: 36, borderRadius: 8, border: "1.5px solid var(--border)", background: "var(--bg)", cursor: "pointer", fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>-</button>
                    <input type="number" value={customQty} onChange={(e) => setCustomQty(Math.max(1, parseInt(e.target.value) || 1))} min={1}
                      style={{ flex: 1, padding: "9px 0", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 14, fontWeight: 700, textAlign: "center", fontFamily: "inherit", outline: "none" }} />
                    <button onClick={() => setCustomQty((q) => q + 1)} style={{ width: 36, height: 36, borderRadius: 8, border: "1.5px solid var(--border)", background: "var(--bg)", cursor: "pointer", fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                  </div>
                </div>
              </div>
              {customName && customPrice && (
                <div style={{ background: customType.color, border: `1px solid ${customType.border}`, borderRadius: 10, padding: "12px 16px", marginBottom: 18, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <img src={customType.icon} alt={customType.label} style={{ width: 28, height: 28, objectFit: "contain" }} />
                    <div>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: customType.text }}>{customName}</p>
                      <p style={{ margin: 0, fontSize: 11, color: customType.text, opacity: 0.8 }}>{customType.label} · qty {customQty}</p>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: customType.text }}>₱{(parseFloat(customPrice || 0) * customQty).toFixed(2)}</p>
                    <p style={{ margin: 0, fontSize: 10, color: customType.text, opacity: 0.7 }}>₱{parseFloat(customPrice || 0).toFixed(2)} each</p>
                  </div>
                </div>
              )}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "14px 24px", borderTop: "1px solid var(--border)" }}>
              <button className="btn btn-ghost" style={S.btn} onClick={() => setShowCustom(false)}>Cancel</button>
              <button className="btn btn-primary" style={S.btn} onClick={addCustomItem}>Add to Cart</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Receipt Modal ══ */}
      {showReceipt && lastTx && (
        <div style={S.overlay}>
          <div style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 400, maxHeight: "90vh", overflowY: "auto", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>
            <div className="modal-header">
              <h3>Receipt</h3>
              <button className="btn btn-ghost btn-icon" style={S.btn} onClick={() => setShowReceipt(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ fontFamily: "monospace", fontSize: 12, background: "var(--bg)", borderRadius: 8, padding: 16, border: "1px dashed var(--border)", whiteSpace: "pre-wrap" }}>
                {`Angeles Animal Care Hospital\n============================\nClient: ${lastTx.client}${lastTx._isWalkin ? " (Walk-in)" : ""}\n${lastTx._walkinContact ? `Contact: ${lastTx._walkinContact}\n` : ""}Date:   ${new Date().toLocaleDateString()}\n----------------------------\n${(lastTx.items || []).map((i) => `${i.name.substring(0, 20).padEnd(20)} x${i.qty}\n  @ ₱${Number(i.price).toFixed(2)} = ₱${(i.qty * i.price).toFixed(2)}`).join("\n")}\n----------------------------\nSubtotal:     ₱${Number(lastTx.subtotal).toFixed(2)}\nDiscount:     -₱${((lastTx.subtotal * lastTx.discount) / 100).toFixed(2)}\n============================\nTOTAL:        ₱${Number(lastTx.total).toFixed(2)}\nPayment:      ${lastTx.payment}\n============================\nThank you!`}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" style={S.btn} onClick={() => window.print()}>Print</button>
              <button className="btn btn-primary" style={S.btn} onClick={() => setShowReceipt(false)}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Transaction History Modal ══ */}
      {showTx && (
        <div style={S.overlay}>
          <div style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 750, maxHeight: "90vh", overflowY: "auto", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>
            <div className="modal-header">
              <h3>Transaction History</h3>
              <button className="btn btn-ghost btn-icon" style={S.btn} onClick={() => setShowTx(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr>
                      {["Client", "Email", "Items", "Subtotal", "Discount", "Total", "Payment", "Date"].map((h) => (
                        <th key={h} style={{ background: "var(--bg)", padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--muted)", borderBottom: "1px solid var(--border)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.length === 0 ? (
                      <tr><td colSpan={8} style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>No transactions yet</td></tr>
                    ) : transactions.map((t) => (
                      <tr key={t.id} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "10px 12px", fontWeight: 600 }}>{t.client}</td>
                        <td style={{ padding: "10px 12px", color: "var(--muted)", fontSize: 11 }}>{t.client_email || "—"}</td>
                        <td style={{ padding: "10px 12px" }}>{(t.items || []).length} items</td>
                        <td style={{ padding: "10px 12px" }}>₱{Number(t.subtotal).toFixed(2)}</td>
                        <td style={{ padding: "10px 12px" }}>{t.discount}%</td>
                        <td style={{ padding: "10px 12px" }}><strong style={{ color: "var(--royal)" }}>₱{Number(t.total).toFixed(2)}</strong></td>
                        <td style={{ padding: "10px 12px" }}>{t.payment}</td>
                        <td style={{ padding: "10px 12px", fontSize: 12, color: "var(--muted)" }}>{new Date(t.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" style={S.btn} onClick={() => setShowTx(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

    </Layout>
  );
};

export default PointOfSale;