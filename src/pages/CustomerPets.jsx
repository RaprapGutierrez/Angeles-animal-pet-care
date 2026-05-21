import React, { useState, useEffect, useMemo, useCallback } from "react";
import Layout from "../components/layout";
import { supabase } from "../js/supabase";
import { useCurrentUser } from "../js/useCurrentUser";

const HEALTH_BADGE = {
  Good: "badge-green",
  Fair: "badge-yellow",
  Critical: "badge-red",
};
const STATUS_BADGE = { Admitted: "badge-blue", Outpatient: "badge-gray" };

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

const CustomerPets = () => {
  // ── PATCH: replaced useBranchTables + getTable with useCurrentUser ────────
  const { user, loading: userLoading } = useCurrentUser();

   useEffect(() => {
    if (document.getElementById('shimmer-style')) return;
    const style = document.createElement('style');
    style.id = 'shimmer-style';
    style.textContent = `@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`;
    document.head.appendChild(style);
  }, []);

  // Unified table names — no per-branch prefixes
  const T_PATIENTS = "patients";
  const T_VAX      = "vaccinations";
  const T_TREAT    = "treatments";

  const userId    = user?.id ?? null;
  const userEmail = (user?.email || "").toLowerCase();

  const [pets, setPets]               = useState([]);
  const [loading, setLoading]         = useState(true);
  const [selected, setSelected]       = useState(null);
  const [tab, setTab]                 = useState("info");
  const [vaccinations, setVaccinations] = useState([]);
  const [treatments, setTreatments]   = useState([]);

  // ── Fetch pets matching THIS customer ────────────────────────────────────
  // Supports owner_user_id, user_id, and owner_email for backward compat
  const fetchPets = useCallback(async () => {
    if (userLoading) return;

    if (!userId && !userEmail) {
      setPets([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    const orParts = [];
    if (userId) {
      orParts.push(`owner_user_id.eq.${userId}`);
      orParts.push(`user_id.eq.${userId}`);
    }
    if (userEmail) orParts.push(`owner_email.eq.${userEmail}`);

    // ── PATCH: query unified patients table; branch_id already on rows ─────
    const { data, error } = await supabase
      .from(T_PATIENTS)
      .select("*")
      .or(orParts.join(","))
      .order("name");

    if (error) {
      console.error("[CustomerPets] Fetch error:", error.message);
      // Fallback: try email-only if OR query failed (e.g. bad UUID format)
      if (userEmail) {
        const { data: fallbackData } = await supabase
          .from(T_PATIENTS)
          .select("*")
          .eq("owner_email", userEmail)
          .order("name");
        setPets(fallbackData || []);
      } else {
        setPets([]);
      }
    } else {
      setPets(data || []);
    }
    setLoading(false);
  }, [userLoading, userId, userEmail]);

  // ── Mount + realtime ─────────────────────────────────────────────────────
  useEffect(() => {
    if (userLoading) return;
    fetchPets();

    const matches = (row) =>
      (userId && (row?.owner_user_id === userId || row?.user_id === userId)) ||
      (userEmail && (row?.owner_email || "").toLowerCase() === userEmail);

    const channel = supabase
      .channel(`customer-pets-realtime-${userId || userEmail}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: T_PATIENTS },
        (payload) => {
          if (matches(payload.new)) {
            setPets((prev) =>
              [...prev, payload.new].sort((a, b) =>
                (a.name || "").localeCompare(b.name || "")
              )
            );
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: T_PATIENTS },
        (payload) => {
          if (matches(payload.new)) {
            setPets((prev) =>
              prev.map((p) => (p.id === payload.new.id ? payload.new : p))
            );
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: T_PATIENTS },
        (payload) => {
          setPets((prev) => prev.filter((p) => p.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userLoading, fetchPets, userId, userEmail]);

  const openPet = async (pet) => {
    setSelected(pet);
    setTab("info");
    // ── PATCH: query unified vaccinations + treatments tables ─────────────
    const [vax, treat] = await Promise.all([
      supabase.from(T_VAX).select("*").eq("patient_id", pet.id),
      supabase.from(T_TREAT).select("*").eq("patient_id", pet.id),
    ]);
    setVaccinations(vax.data || []);
    setTreatments(treat.data || []);
  };

  const getSpeciesIcon = (species, size = 30) => {
    if (species === "Dog")
      return <img src="/icon/dog.png" alt="Dog" width={size} height={size} />;
    if (species === "Cat")
      return <img src="/icon/cat.png" alt="Cat" width={size} height={size} />;
    return <img src="/icon/dog.png" alt="Pet" width={size} height={size} />;
  };

  const S = {
    page: { width: "100%", minHeight: "100vh", display: "block" },
    topbar: {
      background: "#fff",
      borderBottom: "1px solid var(--border)",
      padding: "14px 28px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      position: "sticky",
      top: 68,
      zIndex: 50,
      width: "100%",
      boxSizing: "border-box",
    },
    cont: {
      padding: "24px 28px",
      paddingTop: "calc(var(--topbar-h) + var(--pagetop-h) + 20px)",
      width: "100%",
      boxSizing: "border-box",
    },
    btn: { width: "auto" },
  };

  // ── Early return guards — after all hooks ────────────────────────────────
  if (userLoading) {
    return (
      <Layout isCustomer>
        <div style={{ padding: '24px 28px', paddingTop: 'calc(var(--topbar-h) + var(--pagetop-h) + 20px)', width: '100%', boxSizing: 'border-box' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 16 }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 14, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <Skeleton w={52} h={52} r="50%" />
                  <div style={{ flex: 1 }}>
                    <Skeleton w="60%" h={16} r={6} mb={6} />
                    <Skeleton w="80%" h={11} r={5} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <Skeleton w={70} h={22} r={20} />
                  <Skeleton w={60} h={22} r={20} />
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
      <Layout isCustomer>
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

  return (
    <Layout isCustomer>
      <div style={S.page}>
        <div style={S.topbar}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src="/icon/paw.png" alt="Paw" width={22} height={22} />
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", margin: 0 }}>
                My Pets
              </h1>
              <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>
                View your registered pets and their health records
              </p>
            </div>
          </div>
          <button className="btn btn-primary" style={S.btn} onClick={fetchPets}>
            ↻ Refresh
          </button>
        </div>

        <div style={S.cont}>
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 16 }}>
              {[...Array(6)].map((_, i) => (
                <div key={i} style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 14, padding: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <Skeleton w={52} h={52} r="50%" />
                    <div style={{ flex: 1 }}>
                      <Skeleton w="60%" h={16} r={6} mb={6} />
                      <Skeleton w="80%" h={11} r={5} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Skeleton w={70} h={22} r={20} />
                    <Skeleton w={60} h={22} r={20} />
                  </div>
                </div>
              ))}
            </div>
          ) : pets.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--muted)" }}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>
                <img src="/icon/dog.png" alt="pet" width={64} height={64} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No pets found</h3>
              <p style={{ fontSize: 14 }}>
                Your pets will appear here once they have been registered at our clinic.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))",
                gap: 16,
              }}
            >
              {pets.map((pet) => (
                <div
                  key={pet.id}
                  onClick={() => openPet(pet)}
                  style={{
                    background: "#fff",
                    border: "1.5px solid var(--border)",
                    borderRadius: 14,
                    padding: 20,
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--royal)";
                    e.currentTarget.style.boxShadow = "0 4px 20px rgba(30,58,138,0.12)";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.boxShadow = "";
                    e.currentTarget.style.transform = "";
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <div
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: "50%",
                        background: "var(--light-blue)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {getSpeciesIcon(pet.species, 30)}
                    </div>
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 800, color: "var(--text)", margin: 0 }}>
                        {pet.name}
                      </h3>
                      <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>
                        {pet.species} • {pet.breed}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <span className={`badge ${STATUS_BADGE[pet.status] || "badge-gray"}`}>
                      {pet.status}
                    </span>
                    <span className={`badge ${HEALTH_BADGE[pet.health] || "badge-gray"}`}>
                      {pet.health}
                    </span>
                  </div>
                  {pet.condition && (
                    <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>
                      Condition: {pet.condition}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pet Detail Modal */}
      {selected && (
        <div
          style={{
            display: "flex",
            position: "fixed",
            top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.5)",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            style={{
              maxWidth: 560,
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              borderRadius: 16,
              background: "#fff",
              boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div className="modal-header">
              <h3>
                <img
                  src="/icon/paw.png"
                  alt="Paw"
                  width={16}
                  height={16}
                  style={{ verticalAlign: "middle", marginRight: 6 }}
                />
                {selected.name}
              </h3>
              <button
                className="btn btn-ghost btn-icon"
                style={{ width: "auto" }}
                onClick={() => setSelected(null)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="tab-bar">
                {["info", "vaccination", "treatment"].map((t) => (
                  <div
                    key={t}
                    className={`tab${tab === t ? " active" : ""}`}
                    onClick={() => setTab(t)}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </div>
                ))}
              </div>
              {tab === "info" && (
                <div style={{ paddingTop: 20 }}>
                  <div className="form-grid">
                    {[
                      ["Name", selected.name],
                      ["Species", selected.species],
                      ["Breed", selected.breed],
                      ["Condition", selected.condition || "—"],
                      ["Room", selected.room || "N/A"],
                    ].map(([l, v]) => (
                      <div className="form-group" key={l}>
                        <label style={{ fontWeight: 700 }}>{l}</label>
                        <p style={{ fontSize: 14 }}>{v}</p>
                      </div>
                    ))}
                    <div className="form-group">
                      <label style={{ fontWeight: 700 }}>Status</label>
                      <span className={`badge ${STATUS_BADGE[selected.status] || "badge-gray"}`}>
                        {selected.status}
                      </span>
                    </div>
                    <div className="form-group">
                      <label style={{ fontWeight: 700 }}>Health</label>
                      <span className={`badge ${HEALTH_BADGE[selected.health] || "badge-gray"}`}>
                        {selected.health}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              {tab === "vaccination" && (
                <div style={{ paddingTop: 20 }}>
                  {vaccinations.length === 0 ? (
                    <p style={{ color: "var(--muted)", fontSize: 13 }}>
                      No vaccination records.
                    </p>
                  ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr>
                          {["Vaccine", "Date Given", "Next Due", "Given By"].map((h) => (
                            <th
                              key={h}
                              style={{
                                padding: "8px 12px",
                                background: "var(--bg)",
                                fontSize: 11,
                                fontWeight: 700,
                                color: "var(--muted)",
                                textAlign: "left",
                                borderBottom: "1px solid var(--border)",
                              }}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {vaccinations.map((v, i) => (
                          <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                            <td style={{ padding: "10px 12px" }}>{v.name}</td>
                            <td style={{ padding: "10px 12px" }}>{v.date_given}</td>
                            <td style={{ padding: "10px 12px" }}>{v.next_due || "—"}</td>
                            <td style={{ padding: "10px 12px" }}>{v.given_by || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
              {tab === "treatment" && (
                <div style={{ paddingTop: 20 }}>
                  {treatments.length === 0 ? (
                    <p style={{ color: "var(--muted)", fontSize: 13 }}>
                      No treatment records.
                    </p>
                  ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr>
                          {["Date", "Diagnosis", "Notes", "Vet"].map((h) => (
                            <th
                              key={h}
                              style={{
                                padding: "8px 12px",
                                background: "var(--bg)",
                                fontSize: 11,
                                fontWeight: 700,
                                color: "var(--muted)",
                                textAlign: "left",
                                borderBottom: "1px solid var(--border)",
                              }}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {treatments.map((t, i) => (
                          <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                            <td style={{ padding: "10px 12px" }}>{t.date}</td>
                            <td style={{ padding: "10px 12px" }}>{t.diagnosis}</td>
                            <td style={{ padding: "10px 12px" }}>{t.notes || "—"}</td>
                            <td style={{ padding: "10px 12px" }}>{t.vet || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-ghost"
                style={{ width: "auto" }}
                onClick={() => setSelected(null)}
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

export default CustomerPets;