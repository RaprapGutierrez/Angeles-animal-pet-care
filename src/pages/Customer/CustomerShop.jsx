import React, { useState, useEffect, useCallback } from "react";
import Layout from "../../components/layout";
import { supabase } from "../../js/Utils/supabase";
import { useCurrentUser } from "../../js/hooks/Usecurrentuser";
import "../../styles/CustomerShop.css";

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

// ─── Branch-aware shop ────────────────────────────────────────────────────────
const CustomerShop = () => {
  // ── PATCH: replaced useBranchTables + getTable + getUserBranch ────────────
  const { user, loading: userLoading } = useCurrentUser();

  // Unified table names — no per-branch prefixes
  const T_INVENTORY = "inventory";
  const T_PROFILES = "profiles";
  const T_TRANSACTIONS = "transactions";

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart] = useState([]);
  const [catFilter, setCatFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [showCart, setShowCart] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 640);
  const [showReceipts, setShowReceipts] = useState(false);
  const [receipts, setReceipts] = useState([]);
  const [receiptsLoading, setReceiptsLoading] = useState(false);
  const [expandedTx, setExpandedTx] = useState(null);
  const [receiptSearch, setReceiptSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);

  const printReceiptText = (text) => {
    const w = window.open("", "PRINT", "height=650,width=420");
    if (!w) return;
    w.document.write(`<html><head><title>Receipt</title><style>
      body{font-family:monospace;font-size:12px;white-space:pre-wrap;padding:16px;}
    </style></head><body>${text.replace(/</g, "&lt;")}</body></html>`);
    w.document.close();
    w.focus();
    w.print();
    w.close();
  };

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
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (authUser?.id) return authUser.id;
    } catch {
      /* fall through */
    }
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
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: T_INVENTORY },
        () => {
          fetchProducts();
        },
      )
      .subscribe();

    const txChannel = supabase
      .channel(`customer-shop-transactions-${user?.branchId || "all"}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: T_TRANSACTIONS },
        () => {
          if (showReceipts) fetchReceipts();
        },
      )
      .subscribe();

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
    const unique = Array.from(
      new Map(merged.map((t) => [t.id, t])).values(),
    ).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    setReceipts(unique);
    setReceiptsLoading(false);
  }, [getCurrentUserId, user?.fullName]);

  // ── Derived values ────────────────────────────────────────────────────────
  const categories = ["All", ...new Set(products.map((p) => p.category))];
  const filtered = products.filter(
    (p) =>
      (catFilter === "All" || p.category === catFilter) &&
      (!search || p.name.toLowerCase().includes(search.toLowerCase())),
  );
  const total = 0;
  const cartQty = 0;

  const filteredReceipts = receipts.filter((r) => {
    const q = receiptSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      r.id?.toLowerCase().includes(q) ||
      r.payment?.toLowerCase().includes(q) ||
      new Date(r.created_at).toLocaleDateString().includes(q) ||
      (r.items || []).some((i) => i.name?.toLowerCase().includes(q))
    );
  });

  const totalSpent = receipts.reduce((s, r) => s + Number(r.total || 0), 0);
  const thisMonth = receipts.filter((r) => {
    const d = new Date(r.created_at),
      now = new Date();
    return (
      d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    );
  }).length;

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

  // ── Place order ───────────────────────────────────────────────────────────
  const placeOrder = async () => {
    if (cart.length === 0) return;
    const userId = await getCurrentUserId();

    // Use name from useCurrentUser — no extra profile fetch needed
    const clientName = user?.fullName || "Customer";
    const clientEmail = user?.email || null;

    // ── PATCH: insert includes branch_id ─────────────────────────────────
    const { error } = await supabase.from(T_TRANSACTIONS).insert([
      {
        client: clientName,
        client_id: userId || null,
        client_email: clientEmail,
        items: cart.map((i) => ({
          id: i.id,
          name: i.name,
          qty: i.qty,
          price: i.price,
          isCustom: false,
        })),
        subtotal: total,
        discount: 0,
        total,
        payment: "Online Order",
        branch_id: user?.branchId ?? null,
      },
    ]);

    if (error) {
      alert("Order error: " + error.message);
      return;
    }

    setCart([]);
    setShowCart(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 4500);
    fetchProducts();
  };

  // ── Payment badge colors ──────────────────────────────────────────────────
  const payColor = (p) =>
    ({
      Cash: { bg: "#dcfce7", text: "#16a34a" },
      Card: { bg: "#dbeafe", text: "#1e40af" },
      GCash: { bg: "#faf5ff", text: "#7c3aed" },
      "Online Order": { bg: "#fff7ed", text: "#ea580c" },
    })[p] || { bg: "#f1f5f9", text: "#475569" };

  const getProductDescription = (p) => {
    if (p.description) return p.description;
    const name = (p.name || "").toLowerCase();
    const descByName = {
      "amoxicillin 250mg":
        "A broad-spectrum antibiotic used to treat bacterial infections in dogs and cats, including skin, respiratory, and urinary tract infections.",
      "betadine solution":
        "An antiseptic solution used to clean and disinfect wounds, cuts, and skin infections before dressing.",
      "flea treatment":
        "A topical or oral treatment that kills fleas and prevents re-infestation, keeping your pet's coat and skin healthy.",
      "iv fluid (nacl 500ml)":
        "Sterile saline solution used for rehydration and fluid therapy during treatment, surgery, or recovery.",
      "rabies vaccine":
        "A core vaccine that protects pets against the rabies virus, required for licensing and boarding in most areas.",
      "distemper vaccine":
        "A core vaccine that protects dogs against canine distemper, a serious and often fatal viral disease.",
      "surgical gloves":
        "Disposable, sterile gloves used by veterinary staff during examinations, treatments, and surgical procedures.",
      "syringe 5ml":
        "A sterile, single-use syringe used for administering injections, vaccines, or oral medications accurately.",
      "dog canned food":
        "A nutritionally balanced wet food formulated to support your dog's daily dietary needs.",
    };
    if (descByName[name]) return descByName[name];

    const descByCategory = {
      Medicine:
        "A veterinary medicine used to treat or manage your pet's health condition as prescribed by our vets.",
      Vaccine:
        "A preventive vaccine that helps protect your pet from common and serious diseases.",
      Supplies:
        "A clinic supply item used during examinations, treatments, or procedures to keep care safe and sanitary.",
      Food: "A pet food product formulated to support your pet's nutrition and overall health.",
      Equipment:
        "Veterinary equipment used by our staff to support diagnosis, treatment, or pet care procedures.",
      Other:
        "A product available at our clinic to support your pet's health and care.",
    };
    return (
      descByCategory[p.category] || "No description available for this product."
    );
  };

  const ICONS = {
    Medicine: (
      <img src="/icon/medicine.png" alt="Medicine" width={40} height={40} />
    ),
    Vaccine: (
      <img src="/icon/vaccines.png" alt="Vaccine" width={40} height={40} />
    ),
    Supplies: (
      <img src="/icon/pet-supplies.png" alt="Supplies" width={40} height={40} />
    ),
    Food: <img src="/icon/pet-food.png" alt="Food" width={40} height={40} />,
    Equipment: (
      <img src="/icon/equipments.png" alt="Equipment" width={40} height={40} />
    ),
    Other: (
      <img src="/icon/inventory_2.png" alt="Other" width={40} height={40} />
    ),
  };

  const S = {
    page: { width: "100%", minHeight: "100vh", display: "block" },
    topbar: {
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
      flexWrap: "wrap",
    },
    cont: {
      padding: "12px 12px",
      paddingTop: 12,
      width: "100%",
      boxSizing: "border-box",
    },
    btn: { width: "auto" },
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

  // ── Early return guards — after all hooks ────────────────────────────────
  if (userLoading) {
    return (
      <Layout isCustomer>
        <div
          style={{
            padding: "24px 28px",
            paddingTop: "calc(var(--topbar-h) + var(--pagetop-h) + 20px)",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          {/* Category filter skeleton */}
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} w={80} h={32} r={99} />
            ))}
          </div>
          {/* Product grid skeleton */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))",
              gap: 16,
            }}
          >
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: 100,
                    background: "#f1f5f9",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Skeleton w={60} h={60} r={8} />
                </div>
                <div style={{ padding: 14 }}>
                  <Skeleton w="80%" h={13} r={5} mb={6} />
                  <Skeleton w="50%" h={11} r={4} mb={4} />
                  <Skeleton w="40%" h={11} r={4} mb={10} />
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
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

  // Branch label for receipts modal (derived from branchId if available)
  const branchLabel = user?.branchId
    ? `Branch ${user.branchId}`
    : "Your Branch";

  return (
    <Layout isCustomer>
      <div style={S.page}>
        {/* ══ Topbar ══════════════════════════════════════════════════════════ */}
        <div style={S.topbar} className="branches-topbar">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              minWidth: 0,
              flex: 1,
            }}
          >
            <img
              src="/icon/shopping_cart.png"
              alt="Shop"
              width={22}
              height={22}
              style={{ flexShrink: 0 }}
            />
            <div style={{ minWidth: 0 }}>
              <h1
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  color: "var(--text)",
                  margin: 0,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                Pet Shop
              </h1>
              <p
                style={{
                  fontSize: 11,
                  color: "var(--muted)",
                  margin: 0,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                Browse and order pet products
              </p>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
              flexShrink: 0,
            }}
          >
            {/* Search */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "var(--bg)",
                border: "1.5px solid var(--border)",
                borderRadius: 8,
                padding: "8px 14px",
                flex: isMobile ? 1 : "none",
              }}
            >
              <img src="/icon/search.png" alt="Search" width={14} height={14} />
              <input
                type="text"
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
                  width: isMobile ? "100%" : 160,
                }}
              />
            </div>

            {/* My Receipts */}
            <button
              className="btn btn-ghost"
              style={{
                ...S.btn,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
              onClick={() => {
                setShowReceipts(true);
                fetchReceipts();
              }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ width: 14, height: 14, marginRight: 6 }}
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              My Receipts
              {receipts.length > 0 && (
                <span
                  style={{
                    background: "var(--royal)",
                    color: "#fff",
                    borderRadius: 99,
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "1px 6px",
                  }}
                >
                  {receipts.length}
                </span>
              )}
            </button>
          </div>
        </div>

        <div style={S.cont} className="customer-shop-content">
          {/* Success banner */}
          {showSuccess && (
            <div
              style={{
                background: "#dcfce7",
                border: "1px solid #86efac",
                borderRadius: 10,
                padding: "14px 20px",
                marginBottom: 20,
                display: "flex",
                alignItems: "center",
                gap: 12,
                animation: "shopSlideIn 0.3s ease both",
              }}
            >
              <span style={{ color: "#16a34a" }}>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ width: 22, height: 22 }}
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </span>
              <div>
                <strong
                  style={{ color: "#16a34a", fontSize: 14, display: "block" }}
                >
                  Order placed successfully!
                </strong>
                <span style={{ color: "#15803d", fontSize: 12 }}>
                  Our team will contact you shortly. Click{" "}
                  <strong>My Receipts</strong> to view your order.
                </span>
              </div>
            </div>
          )}

          {/* Category filters */}
          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 20,
              flexWrap: "wrap",
            }}
          >
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCatFilter(c)}
                style={{
                  padding: "7px 16px",
                  border: `1.5px solid ${catFilter === c ? "var(--royal)" : "var(--border)"}`,
                  borderRadius: 99,
                  background: catFilter === c ? "var(--royal)" : "var(--card)",
                  color: catFilter === c ? "#fff" : "var(--muted)",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  width: "auto",
                  transition: "all 0.15s",
                }}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Products grid */}
          {loading ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))",
                gap: 16,
              }}
            >
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  style={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: 100,
                      background: "var(--bg)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
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
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))",
                gap: 16,
              }}
            >
              {filtered.map((p, i) => (
                <div
                  key={p.id}
                  className="shop-product-card fade-in"
                  onClick={() => setSelectedProduct(p)}
                  style={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    overflow: "hidden",
                    animationDelay: `${Math.min(i, 12) * 0.04}s`,
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      height: 100,
                      background: "var(--light-blue)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {ICONS[p.category] || (
                      <img
                        src="/icon/inventory_2.png"
                        alt={p.category}
                        width={40}
                        height={40}
                      />
                    )}
                  </div>
                  <div style={{ padding: 14 }}>
                    <p
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
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
                        margin: "0 0 4px",
                      }}
                    >
                      {p.category}
                    </p>
                    <p
                      style={{
                        fontSize: 11,
                        color: p.qty <= 5 ? "#dc2626" : "var(--muted)",
                        margin: "0 0 10px",
                      }}
                    >
                      Stock: {p.qty} {p.unit}
                    </p>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <strong style={{ fontSize: 15, color: "var(--royal)" }}>
                        ₱{Number(p.price).toFixed(2)}
                      </strong>
                      <span
                        style={{
                          fontSize: 11,
                          color: p.qty <= 5 ? "#dc2626" : "#16a34a",
                          fontWeight: 700,
                          background: p.qty <= 5 ? "#fee2e2" : "#dcfce7",
                          borderRadius: 20,
                          padding: "3px 10px",
                        }}
                      >
                        {p.qty <= 5 ? "Low Stock" : "In Stock"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && (
                <div
                  style={{
                    gridColumn: "1/-1",
                    textAlign: "center",
                    padding: 40,
                    color: "var(--muted)",
                  }}
                >
                  No products found
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ══ My Receipts Modal ═══════════════════════════════════════════════════ */}
      {showReceipts && (
        <div style={S.overlay}>
          <div
            style={{
              background: "var(--card)",
              borderRadius: 16,
              width: "100%",
              maxWidth: 620,
              maxHeight: "90vh",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
              animation: "shopPop 0.22s ease both",
            }}
          >
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0 }}>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ width: 14, height: 14 }}
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                  My Receipts
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: 12,
                    color: "var(--muted)",
                    fontWeight: 400,
                  }}
                >
                  {branchLabel} — your transaction history
                </p>
              </div>
              <button
                className="btn btn-ghost btn-icon"
                style={S.btn}
                onClick={() => {
                  setShowReceipts(false);
                  setExpandedTx(null);
                  setReceiptSearch("");
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  style={{ width: 14, height: 14 }}
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="modal-body" style={{ padding: 0 }}>
              {receiptsLoading ? (
                <div
                  style={{
                    padding: 48,
                    textAlign: "center",
                    color: "var(--muted)",
                  }}
                >
                  <div
                    style={{
                      marginBottom: 10,
                      display: "flex",
                      justifyContent: "center",
                      color: "var(--muted)",
                    }}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        width: 36,
                        height: 36,
                        animation: "spin 1s linear infinite",
                      }}
                    >
                      <line x1="12" y1="2" x2="12" y2="6" />
                      <line x1="12" y1="18" x2="12" y2="22" />
                      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
                      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
                      <line x1="2" y1="12" x2="6" y2="12" />
                      <line x1="18" y1="12" x2="22" y2="12" />
                      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
                      <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
                    </svg>
                  </div>
                  Loading your receipts...
                </div>
              ) : (
                <>
                  {receipts.length > 0 && (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3,1fr)",
                        gap: 12,
                        padding: "16px 20px",
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      {[
                        {
                          label: "Total Visits",
                          value: receipts.length,
                          icon: (
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              style={{ width: 18, height: 18 }}
                            >
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <polyline points="14 2 14 8 20 8" />
                            </svg>
                          ),
                          bg: "#eff6ff",
                          text: "#1e40af",
                        },
                        {
                          label: "Total Spent",
                          value: `₱${totalSpent.toFixed(2)}`,
                          icon: (
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              style={{ width: 18, height: 18 }}
                            >
                              <rect x="1" y="4" width="22" height="16" rx="2" />
                              <line x1="1" y1="10" x2="23" y2="10" />
                            </svg>
                          ),
                          bg: "#f0fdf4",
                          text: "#166534",
                        },
                        {
                          label: "This Month",
                          value: `${thisMonth} txn${thisMonth !== 1 ? "s" : ""}`,
                          icon: (
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              style={{ width: 18, height: 18 }}
                            >
                              <rect x="3" y="4" width="18" height="18" rx="2" />
                              <line x1="16" y1="2" x2="16" y2="6" />
                              <line x1="8" y1="2" x2="8" y2="6" />
                              <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                          ),
                          bg: "#faf5ff",
                          text: "#6b21a8",
                        },
                      ].map((c, i) => (
                        <div
                          key={i}
                          style={{
                            background: c.bg,
                            borderRadius: 10,
                            padding: "12px 14px",
                          }}
                        >
                          <div style={{ marginBottom: 4, color: c.text }}>
                            {c.icon}
                          </div>
                          <p
                            style={{
                              margin: 0,
                              fontSize: 10,
                              fontWeight: 700,
                              color: c.text,
                              textTransform: "uppercase",
                              letterSpacing: "0.3px",
                            }}
                          >
                            {c.label}
                          </p>
                          <p
                            style={{
                              margin: "3px 0 0",
                              fontSize: 15,
                              fontWeight: 800,
                              color: c.text,
                            }}
                          >
                            {c.value}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {receipts.length > 0 && (
                    <div
                      style={{
                        padding: "12px 20px",
                        borderBottom: "1px solid var(--border)",
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
                          padding: "8px 12px",
                        }}
                      >
                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#9ca3af"
                          strokeWidth="2.5"
                        >
                          <circle cx="11" cy="11" r="8" />
                          <path d="m21 21-4.35-4.35" />
                        </svg>
                        <input
                          type="text"
                          placeholder="Search by date, payment, or item name..."
                          value={receiptSearch}
                          onChange={(e) => setReceiptSearch(e.target.value)}
                          style={{
                            border: "none",
                            background: "transparent",
                            fontSize: 12,
                            color: "var(--text)",
                            outline: "none",
                            fontFamily: "inherit",
                            width: "100%",
                          }}
                        />
                        {receiptSearch && (
                          <button
                            onClick={() => setReceiptSearch("")}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: "var(--muted)",
                              padding: 0,
                              width: "auto",
                              display: "flex",
                              alignItems: "center",
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
                        )}
                      </div>
                    </div>
                  )}

                  {receipts.length === 0 ? (
                    <div
                      style={{
                        padding: "48px 20px",
                        textAlign: "center",
                        color: "var(--muted)",
                      }}
                    >
                      <div
                        style={{
                          marginBottom: 12,
                          display: "flex",
                          justifyContent: "center",
                          color: "var(--muted)",
                        }}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{ width: 48, height: 48 }}
                        >
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="16" y1="13" x2="8" y2="13" />
                          <line x1="16" y1="17" x2="8" y2="17" />
                        </svg>
                      </div>
                      <p
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          margin: "0 0 4px",
                        }}
                      >
                        No receipts yet
                      </p>
                      <p style={{ fontSize: 12, margin: 0 }}>
                        Transactions from the clinic (POS) and online orders
                        will appear here.
                      </p>
                    </div>
                  ) : filteredReceipts.length === 0 ? (
                    (<div
                      style={{
                        padding: "32px 20px",
                        textAlign: "center",
                        color: "var(--muted)",
                      }}
                    >
                      <div
                        style={{
                          marginBottom: 8,
                          display: "flex",
                          justifyContent: "center",
                          color: "var(--muted)",
                        }}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{ width: 32, height: 32 }}
                        >
                          <circle cx="11" cy="11" r="8" />
                          <path d="m21 21-4.35-4.35" />
                        </svg>
                      </div>
                      <p style={{ fontSize: 13 }}>
                        No receipts matching "{receiptSearch}"
                      </p>
                    </div>)()
                  ) : (
                    filteredReceipts.map((tx) => {
                      const isOpen = expandedTx === tx.id;
                      const pc = payColor(tx.payment);
                      const itemCount = (tx.items || []).length;
                      const receiptText = `Angeles Animal Care Hospital
${branchLabel}
================================
Client : ${tx.client}
Date   : ${new Date(tx.created_at).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}
Time   : ${new Date(tx.created_at).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })}
--------------------------------
${(tx.items || []).map((i) => `${(i.name || "").substring(0, 20).padEnd(20)} x${i.qty}\n  @ ₱${Number(i.price).toFixed(2)} = ₱${(i.qty * Number(i.price)).toFixed(2)}`).join("\n")}
--------------------------------
Subtotal : ₱${Number(tx.subtotal).toFixed(2)}
Discount : -₱${((Number(tx.subtotal) * Number(tx.discount)) / 100).toFixed(2)}
================================
TOTAL    : ₱${Number(tx.total).toFixed(2)}
Payment  : ${tx.payment}
================================
        Thank you!`;
                      return (
                        <div
                          key={tx.id}
                          style={{ borderBottom: "1px solid var(--border)" }}
                        >
                          <div
                            className="receipt-row"
                            onClick={() => setExpandedTx(isOpen ? null : tx.id)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "13px 20px",
                              cursor: "pointer",
                              background: isOpen
                                ? "var(--light-blue)"
                                : "var(--card)",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 12,
                              }}
                            >
                              <div
                                style={{
                                  width: 40,
                                  height: 40,
                                  borderRadius: 10,
                                  background: isOpen
                                    ? "var(--royal)"
                                    : "#f1f5f9",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: 18,
                                  flexShrink: 0,
                                  transition: "all 0.15s",
                                }}
                              >
                                {isOpen ? (
                                  <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="#fff"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    style={{ width: 18, height: 18 }}
                                  >
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                    <polyline points="14 2 14 8 20 8" />
                                  </svg>
                                ) : (
                                  <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="#64748b"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    style={{ width: 18, height: 18 }}
                                  >
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                    <polyline points="14 2 14 8 20 8" />
                                    <line x1="16" y1="13" x2="8" y2="13" />
                                    <line x1="16" y1="17" x2="8" y2="17" />
                                  </svg>
                                )}
                              </div>
                              <div>
                                <p
                                  style={{
                                    margin: 0,
                                    fontSize: 13,
                                    fontWeight: 700,
                                    color: "var(--text)",
                                  }}
                                >
                                  {itemCount} item{itemCount !== 1 ? "s" : ""}
                                  {tx.payment === "Online Order" && (
                                    <span
                                      style={{
                                        marginLeft: 6,
                                        fontSize: 9,
                                        background: "#fff7ed",
                                        color: "#ea580c",
                                        borderRadius: 4,
                                        padding: "1px 5px",
                                        fontWeight: 700,
                                        verticalAlign: "middle",
                                      }}
                                    >
                                      ONLINE
                                    </span>
                                  )}
                                </p>
                                <p
                                  style={{
                                    margin: 0,
                                    fontSize: 11,
                                    color: "var(--muted)",
                                  }}
                                >
                                  {new Date(tx.created_at).toLocaleDateString(
                                    "en-PH",
                                    {
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    },
                                  )}
                                </p>
                              </div>
                            </div>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 10,
                                  background: pc.bg,
                                  color: pc.text,
                                  borderRadius: 6,
                                  padding: "3px 8px",
                                  fontWeight: 700,
                                }}
                              >
                                {tx.payment}
                              </span>
                              <strong
                                style={{ fontSize: 15, color: "var(--royal)" }}
                              >
                                ₱{Number(tx.total).toFixed(2)}
                              </strong>
                              <span
                                style={{
                                  fontSize: 11,
                                  color: "var(--muted)",
                                  display: "inline-block",
                                  transform: isOpen ? "rotate(180deg)" : "none",
                                  transition: "transform 0.2s",
                                }}
                              >
                                ▼
                              </span>
                            </div>
                          </div>

                          {isOpen && (
                            <div
                              style={{
                                padding: "0 20px 16px",
                                background: "var(--light-blue)",
                              }}
                            >
                              <div
                                style={{
                                  fontFamily: "monospace",
                                  fontSize: 12,
                                  background: "var(--bg)",
                                  borderRadius: 10,
                                  padding: 16,
                                  border: "1px dashed var(--border)",
                                  whiteSpace: "pre-wrap",
                                  lineHeight: 1.7,
                                }}
                              >
                                {receiptText}
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "flex-end",
                                  marginTop: 10,
                                }}
                              >
                                <button
                                  onClick={() => printReceiptText(receiptText)}
                                  style={{
                                    background: "none",
                                    border: "1px solid var(--border)",
                                    borderRadius: 7,
                                    padding: "6px 14px",
                                    fontSize: 12,
                                    cursor: "pointer",
                                    fontFamily: "inherit",
                                    color: "var(--text)",
                                    width: "auto",
                                  }}
                                >
                                  <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    style={{
                                      width: 13,
                                      height: 13,
                                      marginRight: 5,
                                    }}
                                  >
                                    <polyline points="6 9 6 2 18 2 18 9" />
                                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                                    <rect x="6" y="14" width="12" height="8" />
                                  </svg>
                                  Print
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </>
              )}
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-ghost"
                style={S.btn}
                onClick={() => {
                  setShowReceipts(false);
                  setExpandedTx(null);
                  setReceiptSearch("");
                }}
              >
                Close
              </button>
              <button
                className="btn btn-outline"
                style={{
                  ...S.btn,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
                onClick={fetchReceipts}
                disabled={receiptsLoading}
              >
                {receiptsLoading ? (
                  "Refreshing…"
                ) : (
                  <>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ width: 13, height: 13, marginRight: 5 }}
                    >
                      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                      <path d="M3 3v5h5" />
                    </svg>
                    Refresh
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Product Detail Modal ═══════════════════════════════════════════════ */}
      {selectedProduct && (
        <div style={S.overlay} onClick={() => setSelectedProduct(null)}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--card)",
              borderRadius: isMobile ? 12 : 16,
              width: "100%",
              maxWidth: 420,
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
              animation: "shopPop 0.22s ease both",
            }}
          >
            <div
              style={{
                height: isMobile ? 110 : 140,
                background: "var(--light-blue)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
              }}
            >
              {ICONS[selectedProduct.category] || (
                <img
                  src="/icon/inventory_2.png"
                  alt={selectedProduct.category}
                  width={isMobile ? 44 : 56}
                  height={isMobile ? 44 : 56}
                />
              )}
              <button
                onClick={() => setSelectedProduct(null)}
                style={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.85)",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#334155"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  style={{ width: 14, height: 14 }}
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div style={{ padding: isMobile ? 16 : 20 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 10,
                  marginBottom: 6,
                  flexWrap: "wrap",
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontSize: isMobile ? 15 : 17,
                    fontWeight: 800,
                    color: "var(--text)",
                  }}
                >
                  {selectedProduct.name}
                </h3>
                <span
                  style={{
                    fontSize: 11,
                    color: selectedProduct.qty <= 5 ? "#dc2626" : "#16a34a",
                    fontWeight: 700,
                    background:
                      selectedProduct.qty <= 5 ? "#fee2e2" : "#dcfce7",
                    borderRadius: 20,
                    padding: "3px 10px",
                    flexShrink: 0,
                  }}
                >
                  {selectedProduct.qty <= 5 ? "Low Stock" : "In Stock"}
                </span>
              </div>
              <p
                style={{
                  margin: "0 0 14px",
                  fontSize: 12,
                  color: "var(--muted)",
                }}
              >
                {selectedProduct.category}
              </p>

              <div
                style={{
                  display: "flex",
                  flexDirection: isMobile ? "column" : "row",
                  gap: 10,
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    flex: 1,
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    padding: "10px 14px",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: 10,
                      fontWeight: 700,
                      color: "#94a3b8",
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    Price
                  </p>
                  <p
                    style={{
                      margin: "3px 0 0",
                      fontSize: 16,
                      fontWeight: 800,
                      color: "var(--royal)",
                    }}
                  >
                    ₱{Number(selectedProduct.price).toFixed(2)}
                  </p>
                </div>
                <div
                  style={{
                    flex: 1,
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    padding: "10px 14px",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: 10,
                      fontWeight: 700,
                      color: "#94a3b8",
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    Stock
                  </p>
                  <p
                    style={{
                      margin: "3px 0 0",
                      fontSize: 16,
                      fontWeight: 800,
                      color:
                        selectedProduct.qty <= 5 ? "#dc2626" : "var(--text)",
                    }}
                  >
                    {selectedProduct.qty} {selectedProduct.unit}
                  </p>
                </div>
              </div>

              <div>
                <p
                  style={{
                    margin: "0 0 6px",
                    fontSize: 10,
                    fontWeight: 700,
                    color: "#94a3b8",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  Description
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    color: "var(--text)",
                    lineHeight: 1.6,
                  }}
                >
                  {getProductDescription(selectedProduct)}
                </p>
              </div>
            </div>

            <div
              style={{
                padding: isMobile ? "12px 16px" : "14px 20px",
                borderTop: "1px solid var(--border)",
                display: "flex",
                justifyContent: isMobile ? "stretch" : "flex-end",
              }}
            >
              <button
                className="btn btn-ghost"
                style={isMobile ? { width: "100%" } : S.btn}
                onClick={() => setSelectedProduct(null)}
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

export default CustomerShop;
