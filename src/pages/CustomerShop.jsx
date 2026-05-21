import React, { useState, useEffect, useCallback } from "react";
import Layout from "../components/layout";
import { supabase } from "../js/supabase";
import { useCurrentUser } from "../js/useCurrentUser";

const Skeleton = ({ w = '100%', h = 14, r = 6, mb = 0 }) => (
  <div style={{
    width: w, height: h, borderRadius: r,
    background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.4s infinite',
    marginBottom: mb,
    flexShrink: 0,
  }} />
);

// ─── Branch-aware shop ────────────────────────────────────────────────────────
const CustomerShop = () => {
  // ── PATCH: replaced useBranchTables + getTable + getUserBranch ────────────
  const { user, loading: userLoading } = useCurrentUser();

  useEffect(() => {
    if (document.getElementById('shimmer-style')) return;
    const style = document.createElement('style');
    style.id = 'shimmer-style';
    style.textContent = `@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`;
    document.head.appendChild(style);
  }, []);

  // Unified table names — no per-branch prefixes
  const T_INVENTORY    = "inventory";
  const T_PROFILES     = "profiles";
  const T_TRANSACTIONS = "transactions";

  const [products, setProducts]           = useState([]);
  const [loading, setLoading]             = useState(true);
  const [cart]                   = useState([]);
  const [catFilter, setCatFilter]         = useState("All");
  const [search, setSearch]               = useState("");
  const [showCart, setShowCart]           = useState(false);
  const [showSuccess, setShowSuccess]     = useState(false);
  const [isMobile, setIsMobile]           = useState(window.innerWidth <= 640);
  const [showReceipts, setShowReceipts]   = useState(false);
  const [receipts, setReceipts]           = useState([]);
  const [receiptsLoading, setReceiptsLoading] = useState(false);
  const [expandedTx, setExpandedTx]       = useState(null);
  const [receiptSearch, setReceiptSearch] = useState("");

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 640);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // ── PATCH: user ID now comes directly from useCurrentUser ─────────────────
  const getCurrentUserId = useCallback(async () => {
    if (user?.id) return user.id;
    // Secondary fallback via Supabase auth session
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser?.id) return authUser.id;
    } catch { /* fall through */ }
    return null;
  }, [user]);

  // ── Fetch products from unified inventory table ───────────────────────────
  // PATCH: no branch filter on inventory for customers — they see all in-stock
  // items. If you need branch-scoping add: .eq('branch_id', user?.branchId)
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    let q = supabase.from(T_INVENTORY).select("*").gt("qty", 0).order("name");
    // Scope to customer's branch if branchId is available
    if (user?.branchId) q = q.eq("branch_id", user.branchId);
    const { data, error } = await q;
    if (!error) setProducts(data || []);
    setLoading(false);
  }, [user?.branchId]);

  useEffect(() => {
    if (userLoading) return;
    fetchProducts();

    const inventoryChannel = supabase
      .channel(`customer-shop-inventory-${user?.branchId || "all"}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: T_INVENTORY },
        () => { fetchProducts(); }
      ).subscribe();

    const txChannel = supabase
      .channel(`customer-shop-transactions-${user?.branchId || "all"}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: T_TRANSACTIONS },
        () => { if (showReceipts) fetchReceipts(); }
      ).subscribe();

    return () => {
      supabase.removeChannel(inventoryChannel);
      supabase.removeChannel(txChannel);
    };
  }, [fetchProducts, userLoading]);

  // ── Fetch receipts — scoped to this user ─────────────────────────────────
  const fetchReceipts = useCallback(async () => {
    setReceiptsLoading(true);
    const userId = await getCurrentUserId();

    if (!userId) {
      setReceipts([]);
      setReceiptsLoading(false);
      return;
    }

    // Primary: match by UUID client_id
    const { data: byId } = await supabase
      .from(T_TRANSACTIONS)
      .select("*")
      .eq("client_id", userId)
      .order("created_at", { ascending: false });

    // Fallback: match by name for older records without client_id
    const fullName = user?.fullName || null;
    const { data: byName } = fullName
      ? await supabase
        .from(T_TRANSACTIONS)
        .select("*")
        .eq("client", fullName)
        .order("created_at", { ascending: false })
      : { data: [] };

    // Merge + deduplicate by id
    const merged = [...(byId || []), ...(byName || [])];
    const unique = Array.from(new Map(merged.map(t => [t.id, t])).values())
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    setReceipts(unique);
    setReceiptsLoading(false);
  }, [getCurrentUserId, user?.fullName]);

  // ── Derived values ────────────────────────────────────────────────────────
  const categories = ["All", ...new Set(products.map(p => p.category))];
  const filtered = products.filter(p =>
    (catFilter === "All" || p.category === catFilter) &&
    (!search || p.name.toLowerCase().includes(search.toLowerCase()))
  );
  const total   = 0;
  const cartQty = 0;

  const filteredReceipts = receipts.filter(r => {
    const q = receiptSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      r.id?.toLowerCase().includes(q) ||
      r.payment?.toLowerCase().includes(q) ||
      new Date(r.created_at).toLocaleDateString().includes(q) ||
      (r.items || []).some(i => i.name?.toLowerCase().includes(q))
    );
  });

  const totalSpent = receipts.reduce((s, r) => s + Number(r.total || 0), 0);
  const thisMonth  = receipts.filter(r => {
    const d = new Date(r.created_at), now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  // ── Cart helpers ──────────────────────────────────────────────────────────
  const addToCart = (product) => {
    setCart(prev => {
      const ex = prev.find(i => i.id === product.id);
      if (ex) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const updateQty = (id, delta) => {
    setCart(prev =>
      prev.map(i => i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i)
        .filter(i => i.qty > 0)
    );
  };

  // ── Place order ───────────────────────────────────────────────────────────
  const placeOrder = async () => {
    if (cart.length === 0) return;
    const userId = await getCurrentUserId();

    // Use name from useCurrentUser — no extra profile fetch needed
    const clientName = user?.fullName || "Customer";
    const clientEmail = user?.email || null;

    // ── PATCH: insert includes branch_id ─────────────────────────────────
    const { error } = await supabase.from(T_TRANSACTIONS).insert([{
      client:        clientName,
      client_id:     userId || null,
      client_email:  clientEmail,
      items: cart.map(i => ({
        id: i.id, name: i.name, qty: i.qty, price: i.price, isCustom: false,
      })),
      subtotal: total,
      discount: 0,
      total,
      payment:   "Online Order",
      branch_id: user?.branchId ?? null,
    }]);

    if (error) { alert("Order error: " + error.message); return; }

    setCart([]);
    setShowCart(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 4500);
    fetchProducts();
  };

  // ── Payment badge colors ──────────────────────────────────────────────────
  const payColor = (p) => ({
    "Cash":         { bg: "#dcfce7", text: "#16a34a" },
    "Card":         { bg: "#dbeafe", text: "#1e40af" },
    "GCash":        { bg: "#faf5ff", text: "#7c3aed" },
    "Online Order": { bg: "#fff7ed", text: "#ea580c" },
  }[p] || { bg: "#f1f5f9", text: "#475569" });

  const ICONS = {
    Medicine:  <img src="/icon/medicine.png"    alt="Medicine"  width={40} height={40} />,
    Vaccine:   <img src="/icon/vaccines.png"    alt="Vaccine"   width={40} height={40} />,
    Supplies:  <img src="/icon/pet-supplies.png" alt="Supplies" width={40} height={40} />,
    Food:      <img src="/icon/pet-food.png"    alt="Food"      width={40} height={40} />,
    Equipment: <img src="/icon/equipments.png"  alt="Equipment" width={40} height={40} />,
    Other:     <img src="/icon/inventory_2.png" alt="Other"     width={40} height={40} />,
  };

  const S = {
    page: { width: "100%", minHeight: "100vh", display: "block" },
    topbar: {
      background: "#fff", borderBottom: "1px solid var(--border)",
      padding: isMobile ? "12px 16px" : "14px 28px",
      display: "flex", flexDirection: isMobile ? "column" : "row",
      alignItems: isMobile ? "flex-start" : "center", justifyContent: "space-between",
      position: "sticky", top: 68, zIndex: 50, width: "100%", boxSizing: "border-box", gap: isMobile ? 10 : 12,
    },
    cont: { padding: "24px 28px", paddingTop: "calc(var(--topbar-h) + var(--pagetop-h) + 20px)", width: "100%", boxSizing: "border-box" },
    btn: { width: "auto" },
    overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 16 },
  };

  // ── Early return guards — after all hooks ────────────────────────────────
  if (userLoading) {
    return (
      <Layout isCustomer>
        <div style={{ padding: '24px 28px', paddingTop: 'calc(var(--topbar-h) + var(--pagetop-h) + 20px)', width: '100%', boxSizing: 'border-box' }}>
          {/* Category filter skeleton */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {[...Array(5)].map((_, i) => <Skeleton key={i} w={80} h={32} r={99} />)}
          </div>
          {/* Product grid skeleton */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 16 }}>
            {[...Array(8)].map((_, i) => (
              <div key={i} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ height: 100, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Skeleton w={60} h={60} r={8} />
                </div>
                <div style={{ padding: 14 }}>
                  <Skeleton w="80%" h={13} r={5} mb={6} />
                  <Skeleton w="50%" h={11} r={4} mb={4} />
                  <Skeleton w="40%" h={11} r={4} mb={10} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Skeleton w={60} h={18} r={5} />
                    <Skeleton w={50} h={30} r={8} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Please log in</h2>
          <p style={{ fontSize: 13 }}>Your session could not be detected. Please sign in again.</p>
        </div>
      </Layout>
    );
  }

  // Branch label for receipts modal (derived from branchId if available)
  const branchLabel = user?.branchId ? `Branch ${user.branchId}` : "Your Branch";

  return (
    <Layout isCustomer>
      <style>{`
        @keyframes shopSlideIn { from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)} }
        @keyframes shopPop { from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)} }
        .shop-product-card { transition: all 0.2s; }
        .shop-product-card:hover { box-shadow:0 4px 20px rgba(30,58,138,0.12)!important; transform:translateY(-2px); }
        .receipt-row { transition: background 0.15s; }
        .receipt-row:hover { background: var(--bg) !important; }
      `}</style>

      <div style={S.page}>
        {/* ══ Topbar ══════════════════════════════════════════════════════════ */}
        <div style={S.topbar}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src="/icon/shopping_cart.png" alt="Shop" width={22} height={22} />
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", margin: 0 }}>Pet Shop</h1>
              <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>Browse and order pet products</p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, width: isMobile ? "100%" : "auto", flexWrap: "wrap" }}>
            {/* Search */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--bg)", border: "1.5px solid var(--border)", borderRadius: 8, padding: "8px 14px", flex: isMobile ? 1 : "none" }}>
              <img src="/icon/search.png" alt="Search" width={14} height={14} />
              <input type="text" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)}
                style={{ border: "none", background: "transparent", fontSize: 13, color: "var(--text)", outline: "none", fontFamily: "inherit", width: isMobile ? "100%" : 160 }} />
            </div>

            {/* My Receipts */}
            <button className="btn btn-ghost"
              style={{ ...S.btn, display: "flex", alignItems: "center", gap: 6 }}
              onClick={() => { setShowReceipts(true); fetchReceipts(); }}>
              🧾 My Receipts
              {receipts.length > 0 && (
                <span style={{ background: "var(--royal)", color: "#fff", borderRadius: 99, fontSize: 10, fontWeight: 700, padding: "1px 6px" }}>
                  {receipts.length}
                </span>
              )}
            </button>
          </div>
        </div>

        <div style={S.cont}>
          {/* Success banner */}
          {showSuccess && (
            <div style={{ background: "#dcfce7", border: "1px solid #86efac", borderRadius: 10, padding: "14px 20px", marginBottom: 20, display: "flex", alignItems: "center", gap: 12, animation: "shopSlideIn 0.3s ease both" }}>
              <span style={{ fontSize: 22 }}>✅</span>
              <div>
                <strong style={{ color: "#16a34a", fontSize: 14, display: "block" }}>Order placed successfully!</strong>
                <span style={{ color: "#15803d", fontSize: 12 }}>Our team will contact you shortly. Click <strong>My Receipts</strong> to view your order.</span>
              </div>
            </div>
          )}

          {/* Category filters */}
          <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
            {categories.map(c => (
              <button key={c} onClick={() => setCatFilter(c)}
                style={{ padding: "7px 16px", border: `1.5px solid ${catFilter === c ? "var(--royal)" : "var(--border)"}`, borderRadius: 99, background: catFilter === c ? "var(--royal)" : "#fff", color: catFilter === c ? "#fff" : "var(--muted)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", width: "auto", transition: "all 0.15s" }}>
                {c}
              </button>
            ))}
          </div>

          {/* Products grid */}
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 16 }}>
              {[...Array(8)].map((_, i) => (
                <div key={i} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ height: 100, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Skeleton w={60} h={60} r={8} />
                  </div>
                  <div style={{ padding: 14 }}>
                    <Skeleton w="80%" h={13} r={5} mb={6} />
                    <Skeleton w="50%" h={11} r={4} mb={4} />
                    <Skeleton w="40%" h={11} r={4} mb={10} />
                    <Skeleton w="100%" h={30} r={8} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 16 }}>
              {filtered.map(p => (
                <div key={p.id} className="shop-product-card"
                  style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
                  <div style={{ height: 100, background: "var(--light-blue)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {ICONS[p.category] || <img src="/icon/inventory_2.png" alt={p.category} width={40} height={40} />}
                  </div>
                  <div style={{ padding: 14 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, margin: "0 0 2px", color: "var(--text)" }}>{p.name}</p>
                    <p style={{ fontSize: 11, color: "var(--muted)", margin: "0 0 4px" }}>{p.category}</p>
                    <p style={{ fontSize: 11, color: p.qty <= 5 ? "#dc2626" : "var(--muted)", margin: "0 0 10px" }}>
                      Stock: {p.qty} {p.unit}
                    </p>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <strong style={{ fontSize: 15, color: "var(--royal)" }}>₱{Number(p.price).toFixed(2)}</strong>
                      <span style={{ fontSize: 11, color: p.qty <= 5 ? '#dc2626' : '#16a34a', fontWeight: 700, background: p.qty <= 5 ? '#fee2e2' : '#dcfce7', borderRadius: 20, padding: '3px 10px' }}>
                        {p.qty <= 5 ? 'Low Stock' : 'In Stock'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && (
                <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 40, color: "var(--muted)" }}>No products found</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ══ My Receipts Modal ═══════════════════════════════════════════════════ */}
      {showReceipts && (
        <div style={S.overlay}>
          <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 620, maxHeight: "90vh", overflowY: "auto", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.25)", animation: "shopPop 0.22s ease both" }}>
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0 }}>🧾 My Receipts</h3>
                <p style={{ margin: 0, fontSize: 12, color: "var(--muted)", fontWeight: 400 }}>
                  {branchLabel} — your transaction history
                </p>
              </div>
              <button className="btn btn-ghost btn-icon" style={S.btn}
                onClick={() => { setShowReceipts(false); setExpandedTx(null); setReceiptSearch(""); }}>✕</button>
            </div>

            <div className="modal-body" style={{ padding: 0 }}>
              {receiptsLoading ? (
                <div style={{ padding: 48, textAlign: "center", color: "var(--muted)" }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>⏳</div>
                  Loading your receipts...
                </div>
              ) : (
                <>
                  {receipts.length > 0 && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
                      {[
                        { label: "Total Visits",  value: receipts.length,             icon: "🧾", bg: "#eff6ff", text: "#1e40af" },
                        { label: "Total Spent",   value: `₱${totalSpent.toFixed(2)}`, icon: "💳", bg: "#f0fdf4", text: "#166534" },
                        { label: "This Month",    value: `${thisMonth} txn${thisMonth !== 1 ? "s" : ""}`, icon: "📅", bg: "#faf5ff", text: "#6b21a8" },
                      ].map((c, i) => (
                        <div key={i} style={{ background: c.bg, borderRadius: 10, padding: "12px 14px" }}>
                          <div style={{ fontSize: 18, marginBottom: 4 }}>{c.icon}</div>
                          <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: c.text, textTransform: "uppercase", letterSpacing: "0.3px" }}>{c.label}</p>
                          <p style={{ margin: "3px 0 0", fontSize: 15, fontWeight: 800, color: c.text }}>{c.value}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {receipts.length > 0 && (
                    <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--bg)", border: "1.5px solid var(--border)", borderRadius: 8, padding: "8px 12px" }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                        <input type="text" placeholder="Search by date, payment, or item name..."
                          value={receiptSearch} onChange={e => setReceiptSearch(e.target.value)}
                          style={{ border: "none", background: "transparent", fontSize: 12, color: "var(--text)", outline: "none", fontFamily: "inherit", width: "100%" }} />
                        {receiptSearch && (
                          <button onClick={() => setReceiptSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: 13, padding: 0, width: "auto" }}>✕</button>
                        )}
                      </div>
                    </div>
                  )}

                  {receipts.length === 0 ? (
                    <div style={{ padding: "48px 20px", textAlign: "center", color: "var(--muted)" }}>
                      <div style={{ fontSize: 48, marginBottom: 12 }}>🧾</div>
                      <p style={{ fontSize: 14, fontWeight: 600, margin: "0 0 4px" }}>No receipts yet</p>
                      <p style={{ fontSize: 12, margin: 0 }}>
                        Transactions from the clinic (POS) and online orders will appear here.
                      </p>
                    </div>
                  ) : filteredReceipts.length === 0 ? (
                    <div style={{ padding: "32px 20px", textAlign: "center", color: "var(--muted)" }}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
                      <p style={{ fontSize: 13 }}>No receipts matching "{receiptSearch}"</p>
                    </div>
                  ) : filteredReceipts.map(tx => {
                    const isOpen = expandedTx === tx.id;
                    const pc = payColor(tx.payment);
                    const itemCount = (tx.items || []).length;
                    return (
                      <div key={tx.id} style={{ borderBottom: "1px solid var(--border)" }}>
                        <div
                          className="receipt-row"
                          onClick={() => setExpandedTx(isOpen ? null : tx.id)}
                          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 20px", cursor: "pointer", background: isOpen ? "var(--light-blue)" : "#fff" }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 10, background: isOpen ? "var(--royal)" : "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0, transition: "all 0.15s" }}>
                              {isOpen ? "📄" : "🧾"}
                            </div>
                            <div>
                              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
                                {itemCount} item{itemCount !== 1 ? "s" : ""}
                                {tx.payment === "Online Order" && (
                                  <span style={{ marginLeft: 6, fontSize: 9, background: "#fff7ed", color: "#ea580c", borderRadius: 4, padding: "1px 5px", fontWeight: 700, verticalAlign: "middle" }}>ONLINE</span>
                                )}
                              </p>
                              <p style={{ margin: 0, fontSize: 11, color: "var(--muted)" }}>
                                {new Date(tx.created_at).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                              </p>
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ fontSize: 10, background: pc.bg, color: pc.text, borderRadius: 6, padding: "3px 8px", fontWeight: 700 }}>{tx.payment}</span>
                            <strong style={{ fontSize: 15, color: "var(--royal)" }}>₱{Number(tx.total).toFixed(2)}</strong>
                            <span style={{ fontSize: 11, color: "var(--muted)", display: "inline-block", transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▼</span>
                          </div>
                        </div>

                        {isOpen && (
                          <div style={{ padding: "0 20px 16px", background: "var(--light-blue)" }}>
                            <div style={{ fontFamily: "monospace", fontSize: 12, background: "#fff", borderRadius: 10, padding: 16, border: "1px dashed var(--border)", whiteSpace: "pre-wrap", lineHeight: 1.7 }}>
                              {`Angeles Animal Care Hospital
${branchLabel}
================================
Client : ${tx.client}
Date   : ${new Date(tx.created_at).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}
Time   : ${new Date(tx.created_at).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })}
--------------------------------
${(tx.items || []).map(i => `${(i.name || "").substring(0, 20).padEnd(20)} x${i.qty}\n  @ ₱${Number(i.price).toFixed(2)} = ₱${(i.qty * Number(i.price)).toFixed(2)}`).join("\n")}
--------------------------------
Subtotal : ₱${Number(tx.subtotal).toFixed(2)}
Discount : -₱${((Number(tx.subtotal) * Number(tx.discount)) / 100).toFixed(2)}
================================
TOTAL    : ₱${Number(tx.total).toFixed(2)}
Payment  : ${tx.payment}
================================
        Thank you! 🐾`}
                            </div>
                            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                              <button onClick={() => window.print()}
                                style={{ background: "none", border: "1px solid var(--border)", borderRadius: 7, padding: "6px 14px", fontSize: 12, cursor: "pointer", fontFamily: "inherit", color: "var(--text)", width: "auto" }}>
                                🖨 Print
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost" style={S.btn}
                onClick={() => { setShowReceipts(false); setExpandedTx(null); setReceiptSearch(""); }}>
                Close
              </button>
              <button className="btn btn-outline" style={{ ...S.btn, display: "flex", alignItems: "center", gap: 6 }}
                onClick={fetchReceipts} disabled={receiptsLoading}>
                {receiptsLoading ? "Refreshing…" : "🔄 Refresh"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default CustomerShop;