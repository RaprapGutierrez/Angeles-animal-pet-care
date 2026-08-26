import React, { useState, useEffect, useMemo, useCallback } from "react";
import Layout from "../../components/layout";
import { supabase } from "../../js/Utils/supabase";
import { useCurrentUser } from "../../js/hooks/Usecurrentuser";
import "../../styles/CustomerPets.css";

const HEALTH_BADGE = {
  Good: "badge-green",
  Fair: "badge-yellow",
  Critical: "badge-red",
};
const STATUS_BADGE = { Admitted: "badge-blue", Outpatient: "badge-gray" };

const DogIcon = ({ size = 24, color = "currentColor" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill={color}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M16 4V7C16 9.20914 14.2091 11 12 11H10V15H0V13L0.931622 10.8706C1.25226 10.9549 1.59036 11 1.94124 11C3.74931 11 5.32536 9.76947 5.76388 8.01538L3.82359 7.53031C3.60766 8.39406 2.83158 9.00001 1.94124 9.00001C1.87789 9.00001 1.81539 8.99702 1.75385 8.99119C1.02587 8.92223 0.432187 8.45551 0.160283 7.83121C0.0791432 7.64491 0.0266588 7.44457 0.00781272 7.23658C-0.0112323 7.02639 0.00407892 6.80838 0.0588889 6.58914L0.698705 4.02986C1.14387 2.24919 2.7438 1 4.57928 1H10L12 4H16ZM9 6C9.55229 6 10 5.55228 10 5C10 4.44772 9.55229 4 9 4C8.44771 4 8 4.44772 8 5C8 5.55228 8.44771 6 9 6Z"
    />
  </svg>
);
const CatIcon = ({ size = 24, color = "currentColor" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill={color}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M1 7L4.80061 1.43926C5.56059 0.527292 6.68638 0 7.8735 0H8V4L12 5L15 10L14.1875 11.2188C13.4456 12.3316 12.1967 13 10.8593 13H9L7 16H5L1 7ZM10 9C10.5523 9 11 8.55229 11 8C11 7.44772 10.5523 7 10 7C9.44771 7 9 7.44772 9 8C9 8.55229 9.44771 9 10 9Z"
    />
    <path d="M10 0.465878V2.43845L12 2.93845V0H11.8735C11.2125 0 10.5704 0.163501 10 0.465878Z" />
  </svg>
);

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

const CustomerPets = () => {
  // ── PATCH: replaced useBranchTables + getTable with useCurrentUser ────────
  const { user, loading: userLoading } = useCurrentUser();

  // Unified table names — no per-branch prefixes
  const T_PATIENTS = "patients";
  const T_VAX = "vaccinations";
  const T_TREAT = "treatments";
  const T_PRESCRIPTIONS = "prescriptions";

  const userId = user?.id ?? null;
  const userEmail = (user?.email || "").toLowerCase();

  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState("info");
  const [vaccinations, setVaccinations] = useState([]);
  const [treatments, setTreatments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [patientFiles, setPatientFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [previewZoom, setPreviewZoom] = useState(1);
  const fetchingRef = React.useRef(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 640);
  const [uploadingId, setUploadingId] = useState(null);
  const [imageErrors, setImageErrors] = useState({});
  const fileInputRefs = React.useRef({});

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 640);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // ── Fetch pets matching THIS customer ────────────────────────────────────
  // Supports owner_user_id, user_id, and owner_email for backward compat
  const fetchPets = useCallback(async () => {
    if (userLoading) return;

    if (!userId && !userEmail) {
      setPets([]);
      setLoading(false);
      return;
    }
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true);

    const orParts = [];
    if (userId) {
      orParts.push(`owner_user_id.eq.${userId}`);
    }
    if (userEmail) orParts.push(`owner_email.ilike.${userEmail}`);

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
          .ilike("owner_email", userEmail)
          .order("name");
        setPets(fallbackData || []);
      } else {
        setPets([]);
      }
    } else {
      setPets(data || []);
    }
    setLoading(false);
    fetchingRef.current = false;
  }, [userLoading, userId, userEmail]);

  // ── Mount + realtime ─────────────────────────────────────────────────────
  const stableKey = userId || userEmail || "";

  useEffect(() => {
    if (userLoading) return;
    fetchPets();

    const matches = (row) =>
      (userId && row?.owner_user_id === userId) ||
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
                (a.name || "").localeCompare(b.name || ""),
              ),
            );
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: T_PATIENTS },
        (payload) => {
          if (matches(payload.new)) {
            setPets((prev) =>
              prev.map((p) => (p.id === payload.new.id ? payload.new : p)),
            );
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: T_PATIENTS },
        (payload) => {
          setPets((prev) => prev.filter((p) => p.id !== payload.old.id));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLoading, stableKey]);

  const openPet = async (pet) => {
    setSelected(pet);
    setTab("info");
    setLoadingFiles(true);
    const [vax, treat, rx, files] = await Promise.all([
      supabase.from(T_VAX).select("*").eq("patient_id", pet.id),
      supabase.from(T_TREAT).select("*").eq("patient_id", pet.id),
      supabase
        .from(T_PRESCRIPTIONS)
        .select("*")
        .eq("patient_id", pet.id)
        .order("date_prescribed", { ascending: false }),
      supabase
        .from("patient_files")
        .select("*")
        .eq("patient_id", pet.id)
        .order("uploaded_at", { ascending: false }),
    ]);
    setVaccinations(vax.data || []);
    setTreatments(treat.data || []);
    setPrescriptions(rx.data || []);
    setPatientFiles(files.data || []);
    setLoadingFiles(false);
  };

  // ── Upload / change pet photo ────────────────────────────────────────────
  const MAX_IMAGE_MB = 5;
  const handleImageUpload = useCallback(
    async (pet, file) => {
      if (!pet || !file) return;
      setImageErrors((prev) => ({ ...prev, [pet.id]: "" }));

      if (!file.type.startsWith("image/")) {
        setImageErrors((prev) => ({
          ...prev,
          [pet.id]: "Please choose an image file.",
        }));
        return;
      }
      if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
        setImageErrors((prev) => ({
          ...prev,
          [pet.id]: `Image must be smaller than ${MAX_IMAGE_MB}MB.`,
        }));
        return;
      }

      setUploadingId(pet.id);
      try {
        const ext = file.name.split(".").pop();
        const path = `pets/${pet.id}-${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("pet-images")
          .upload(path, file, { upsert: true, cacheControl: "3600" });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from("pet-images")
          .getPublicUrl(path);

        const imageUrl = publicUrlData?.publicUrl;
        if (!imageUrl) throw new Error("Could not get image URL.");

        const { error: updateError } = await supabase
          .from(T_PATIENTS)
          .update({ image_url: imageUrl })
          .eq("id", pet.id);

        if (updateError) throw updateError;

        setPets((prev) =>
          prev.map((p) =>
            p.id === pet.id ? { ...p, image_url: imageUrl } : p,
          ),
        );
        setSelected((prev) =>
          prev && prev.id === pet.id ? { ...prev, image_url: imageUrl } : prev,
        );
      } catch (err) {
        console.error("[CustomerPets] Image upload error:", err.message);
        setImageErrors((prev) => ({
          ...prev,
          [pet.id]: "Upload failed. Please try again.",
        }));
      } finally {
        setUploadingId(null);
      }
    },
    [T_PATIENTS],
  );

  const triggerImagePick = (key) => {
    fileInputRefs.current[key]?.click();
  };

  const getSpeciesIcon = (species, size = 30, color = "var(--royal)") => {
    if (species === "Cat") return <CatIcon size={size} color={color} />;
    return <DogIcon size={size} color={color} />;
  };

  const renderPetAvatar = (pet, size = 30, shape = "circle") => {
    if (pet?.image_url) {
      return (
        <img
          src={pet.image_url}
          alt={pet.name || "Pet"}
          width={size}
          height={size}
          style={{
            objectFit: "cover",
            borderRadius: shape === "box" ? 8 : "50%",
            width: size,
            height: size,
          }}
        />
      );
    }
    return getSpeciesIcon(pet?.species, size);
  };

  const S = {
    page: { width: "100%", minHeight: "100vh", display: "block" },
    topbar: {
      background: "var(--card)",
      borderBottom: "1px solid var(--border)",
      padding: "10px 16px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      position: "fixed",
      top: 68,
      left: "var(--current-sidebar-w, 62px)",
      right: 0,
      zIndex: 40,
      boxSizing: "border-box",
      gap: 8,
    },
    cont: {
      padding: "12px 12px",
      paddingTop: 122,
      width: "100%",
      boxSizing: "border-box",
    },
    btn: { width: "auto" },
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
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))",
              gap: 16,
            }}
          >
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                style={{
                  background: "var(--card)",
                  border: "1.5px solid var(--border)",
                  borderRadius: 14,
                  padding: 20,
                }}
              >
                {" "}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 12,
                  }}
                >
                  <Skeleton w={52} h={52} r="50%" />
                  <div style={{ flex: 1 }}>
                    <Skeleton w="60%" h={16} r={6} mb={6} />
                    <Skeleton w="80%" h={11} r={5} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
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
              src="/icon/paw.png"
              alt="Paw"
              width={22}
              height={22}
              flexShrink={0}
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
                My Pets
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
                View your registered pets and their health records
              </p>
            </div>
          </div>
          <button className="btn btn-primary" style={S.btn} onClick={fetchPets}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ width: 14, height: 14, marginRight: 6 }}
            >
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            Refresh
          </button>
        </div>

        <div style={S.cont}>
          {loading ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))",
                gap: 16,
              }}
            >
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  style={{
                    background: "#fff",
                    border: "1.5px solid var(--border)",
                    borderRadius: 14,
                    padding: 20,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      marginBottom: 12,
                    }}
                  >
                    <Skeleton w={52} h={52} r="50%" />
                    <div style={{ flex: 1 }}>
                      <Skeleton w="60%" h={16} r={6} mb={6} />
                      <Skeleton w="80%" h={11} r={5} />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Skeleton w={70} h={22} r={20} />
                    <Skeleton w={60} h={22} r={20} />
                  </div>
                </div>
              ))}
            </div>
          ) : pets.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "60px 20px",
                color: "var(--muted)",
              }}
            >
              <div
                style={{
                  fontSize: 64,
                  marginBottom: 16,
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <DogIcon size={64} color="var(--muted)" />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
                No pets found
              </h3>
              <p style={{ fontSize: 14 }}>
                Your pets will appear here once they have been registered at our
                clinic.
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
              {pets.map((pet, i) => (
                <div
                  key={pet.id}
                  className="fade-in"
                  onClick={() => openPet(pet)}
                  style={{
                    background: "var(--card)",
                    border: "1.5px solid var(--border)",
                    borderRadius: 14,
                    padding: 20,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    animationDelay: `${i * 0.06}s`,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--royal)";
                    e.currentTarget.style.boxShadow =
                      "0 4px 20px rgba(30,58,138,0.12)";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.boxShadow = "";
                    e.currentTarget.style.transform = "";
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      marginBottom: 12,
                    }}
                  >
                    <div
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 14,
                        background: "var(--light-blue)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      {uploadingId === pet.id ? (
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="var(--royal)"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          style={{ animation: "spin 0.9s linear infinite" }}
                        >
                          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                        </svg>
                      ) : (
                        renderPetAvatar(pet, 30, "box")
                      )}
                    </div>
                    <div>
                      <h3
                        style={{
                          fontSize: 16,
                          fontWeight: 800,
                          color: "var(--text)",
                          margin: 0,
                        }}
                      >
                        {pet.name}
                      </h3>
                      <p
                        style={{
                          fontSize: 12,
                          color: "var(--muted)",
                          margin: 0,
                        }}
                      >
                        {pet.species} • {pet.breed}
                      </p>
                    </div>
                  </div>
                  {imageErrors[pet.id] && (
                    <p
                      style={{
                        fontSize: 11,
                        color: "#dc2626",
                        margin: "0 0 8px",
                      }}
                    >
                      {imageErrors[pet.id]}
                    </p>
                  )}
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <span
                      className={`badge ${STATUS_BADGE[pet.status] || "badge-gray"}`}
                    >
                      {pet.status}
                    </span>
                    <span
                      className={`badge ${HEALTH_BADGE[pet.health] || "badge-gray"}`}
                    >
                      {pet.health}
                    </span>
                  </div>
                  {pet.condition && (
                    <p
                      style={{
                        fontSize: 12,
                        color: "var(--muted)",
                        marginTop: 8,
                      }}
                    >
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
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.5)",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            style={{
              maxWidth: 680,
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              borderRadius: isMobile ? 10 : 14,
              background: "var(--card)",
              boxShadow: "0 24px 64px rgba(0,0,0,0.28)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: isMobile ? "14px 16px" : "18px 24px",
                borderBottom: "1px solid var(--border)",
                background: "var(--bg)",
                flexShrink: 0,
                gap: 8,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    flexShrink: 0,
                    background: "linear-gradient(135deg,#1e3a8a,#3b82f6)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                  }}
                >
                  {selected.image_url ? (
                    <img
                      src={selected.image_url}
                      alt={selected.name}
                      width={40}
                      height={40}
                      style={{
                        objectFit: "cover",
                        width: "100%",
                        height: "100%",
                      }}
                    />
                  ) : selected.species === "Cat" ? (
                    <CatIcon size={24} color="#fff" />
                  ) : (
                    <DogIcon size={24} color="#fff" />
                  )}
                </div>
                <div style={{ minWidth: 0 }}>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: isMobile ? 15 : 17,
                      fontWeight: 700,
                      color: "var(--text)",
                      display: "flex",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 6,
                    }}
                  >
                    <span
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        maxWidth: isMobile ? 120 : "none",
                      }}
                    >
                      {selected.name}
                    </span>
                    <span
                      className={`badge ${STATUS_BADGE[selected.status] || "badge-gray"}`}
                      style={{ fontSize: 11 }}
                    >
                      {selected.status}
                    </span>
                    <span
                      className={`badge ${HEALTH_BADGE[selected.health] || "badge-gray"}`}
                      style={{ fontSize: 11 }}
                    >
                      {selected.health}
                    </span>
                  </h3>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 12,
                      color: "var(--muted)",
                      marginTop: 2,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {selected.species}
                    {selected.breed ? ` · ${selected.breed}` : ""}
                    {selected.condition ? ` · ${selected.condition}` : ""}
                  </p>{" "}
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 20,
                  cursor: "pointer",
                  color: "var(--muted)",
                  lineHeight: 1,
                  padding: "2px 6px",
                  flexShrink: 0,
                }}
              >
                ✕
              </button>
            </div>

            {/* Tab Bar */}
            <div
              style={{
                padding: isMobile ? "0 12px" : "0 24px",
                borderBottom: "1px solid var(--border)",
                flexShrink: 0,
                display: "flex",
                gap: 0,
                overflowX: "auto",
                WebkitOverflowScrolling: "touch",
              }}
            >
              {[
                "info",
                "vaccination",
                "treatment",
                "prescription",
                "files",
              ].map((t) => (
                <div
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    padding: isMobile ? "10px 10px" : "12px 16px",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                    color: tab === t ? "var(--royal)" : "var(--muted)",
                    borderBottom:
                      tab === t
                        ? "2px solid var(--royal)"
                        : "2px solid transparent",
                    transition: "all 0.15s",
                    userSelect: "none",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                  {t === "vaccination" && vaccinations.length > 0 && (
                    <span
                      style={{
                        background: "#16a34a",
                        color: "#fff",
                        borderRadius: 10,
                        fontSize: 10,
                        padding: "1px 6px",
                        fontWeight: 700,
                      }}
                    >
                      {vaccinations.length}
                    </span>
                  )}
                  {t === "treatment" && treatments.length > 0 && (
                    <span
                      style={{
                        background: "#d97706",
                        color: "#fff",
                        borderRadius: 10,
                        fontSize: 10,
                        padding: "1px 6px",
                        fontWeight: 700,
                      }}
                    >
                      {treatments.length}
                    </span>
                  )}
                  {t === "prescription" && prescriptions.length > 0 && (
                    <span
                      style={{
                        background: "#1e3a8a",
                        color: "#fff",
                        borderRadius: 10,
                        fontSize: 10,
                        padding: "1px 6px",
                        fontWeight: 700,
                      }}
                    >
                      {prescriptions.length}
                    </span>
                  )}
                  {t === "files" && patientFiles.length > 0 && (
                    <span
                      style={{
                        background: "#475569",
                        color: "#fff",
                        borderRadius: 10,
                        fontSize: 10,
                        padding: "1px 6px",
                        fontWeight: 700,
                      }}
                    >
                      {patientFiles.length}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Modal Body */}
            <div
              style={{
                padding: isMobile ? "16px 14px" : "22px 24px",
                overflowY: "auto",
                flex: 1,
              }}
            >
              {/* INFO TAB */}
              {tab === "info" && (
                <div>
                  {/* Hero Banner */}
                  <div
                    style={{
                      background:
                        "linear-gradient(135deg, #0f172a 0%, #1e3a8a 60%, #2563eb 100%)",
                      borderRadius: 14,
                      padding: isMobile ? "16px 16px" : "20px 22px",
                      marginBottom: 20,
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        top: -40,
                        right: -40,
                        width: 180,
                        height: 180,
                        borderRadius: "50%",
                        background: "rgba(255,255,255,0.04)",
                      }}
                    />
                    <div style={{ position: "relative", zIndex: 1 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: isMobile ? 10 : 16,
                          marginBottom: 14,
                          flexWrap: "wrap",
                        }}
                      >
                        <div
                          style={{
                            width: 56,
                            height: 56,
                            borderRadius: 16,
                            flexShrink: 0,
                            background: "rgba(255,255,255,0.12)",
                            border: "2px solid rgba(255,255,255,0.2)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 26,
                            position: "relative",
                            overflow: "hidden",
                          }}
                        >
                          {uploadingId === selected.id ? (
                            <svg
                              width="20"
                              height="20"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#fff"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              style={{ animation: "spin 0.9s linear infinite" }}
                            >
                              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                            </svg>
                          ) : selected.image_url ? (
                            <img
                              src={selected.image_url}
                              alt={selected.name}
                              width={56}
                              height={56}
                              style={{
                                objectFit: "cover",
                                width: "100%",
                                height: "100%",
                              }}
                            />
                          ) : selected.species === "Cat" ? (
                            <CatIcon size={32} color="#fff" />
                          ) : (
                            <DogIcon size={32} color="#fff" />
                          )}
                          <input
                            ref={(el) => {
                              fileInputRefs.current["modal-" + selected.id] =
                                el;
                            }}
                            type="file"
                            accept="image/*"
                            style={{ display: "none" }}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleImageUpload(selected, file);
                              e.target.value = "";
                            }}
                          />
                          <button
                            onClick={() =>
                              triggerImagePick("modal-" + selected.id)
                            }
                            title="Change pet photo"
                            style={{
                              position: "absolute",
                              bottom: 0,
                              right: 0,
                              width: 22,
                              height: 22,
                              borderRadius: "50%",
                              background: "#fff",
                              border: "2px solid rgba(255,255,255,0.5)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                              padding: 0,
                            }}
                          >
                            <svg
                              width="11"
                              height="11"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#1e3a8a"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                              <circle cx="12" cy="13" r="4" />
                            </svg>
                          </button>
                        </div>
                        <div>
                          <h2
                            style={{
                              margin: 0,
                              fontSize: 20,
                              fontWeight: 800,
                              color: "#fff",
                              lineHeight: 1.2,
                            }}
                          >
                            {selected.name}
                          </h2>
                          <p
                            style={{
                              margin: "4px 0 0",
                              fontSize: 13,
                              color: "rgba(255,255,255,0.65)",
                            }}
                          >
                            {selected.species}
                            {selected.breed ? ` · ${selected.breed}` : ""}
                          </p>
                        </div>
                        <div
                          style={{
                            marginLeft: isMobile ? 0 : "auto",
                            display: "flex",
                            flexDirection: "row",
                            flexWrap: "wrap",
                            gap: 6,
                            alignItems: "flex-start",
                          }}
                        >
                          <span
                            style={{
                              background:
                                selected.health === "Good"
                                  ? "rgba(34,197,94,0.28)"
                                  : selected.health === "Critical"
                                    ? "rgba(239,68,68,0.28)"
                                    : "rgba(234,179,8,0.28)",
                              border: "1.5px solid rgba(255,255,255,0.2)",
                              color: "#fff",
                              borderRadius: 20,
                              padding: "3px 12px",
                              fontSize: 12,
                              fontWeight: 700,
                            }}
                          >
                            {selected.health}
                          </span>
                          <span
                            style={{
                              background: "rgba(255,255,255,0.15)",
                              border: "1.5px solid rgba(255,255,255,0.2)",
                              color: "#fff",
                              borderRadius: 20,
                              padding: "3px 12px",
                              fontSize: 12,
                              fontWeight: 700,
                            }}
                          >
                            {selected.status}
                          </span>
                        </div>
                      </div>
                      <div
                        style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
                      >
                        {[
                          {
                            icon: (
                              <svg
                                width="12"
                                height="12"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                              >
                                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                              </svg>
                            ),
                            label: selected.room
                              ? `Room ${selected.room}`
                              : "No Room",
                          },
                          {
                            icon: (
                              <svg
                                width="12"
                                height="12"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                              >
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                              </svg>
                            ),
                            label: selected.owner || "No Owner",
                          },
                        ].map(({ icon, label }) => (
                          <span
                            key={label}
                            style={{
                              background: "rgba(255,255,255,0.1)",
                              border: "1px solid rgba(255,255,255,0.15)",
                              borderRadius: 8,
                              padding: "5px 10px",
                              fontSize: 12,
                              color: "rgba(255,255,255,0.8)",
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            {icon} {label}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  {imageErrors[selected.id] && (
                    <p
                      style={{
                        fontSize: 12,
                        color: "#dc2626",
                        margin: "0 0 14px",
                      }}
                    >
                      {imageErrors[selected.id]}
                    </p>
                  )}
                  {/* Fields Grid */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                      gap: 10,
                    }}
                  >
                    {[
                      { label: "Patient Name", value: selected.name },
                      { label: "Species", value: selected.species },
                      { label: "Breed", value: selected.breed || "—" },
                      {
                        label: "Assigned Room",
                        value: selected.room ? `Room ${selected.room}` : "N/A",
                      },
                    ].map(({ label, value }) => (
                      <div
                        key={label}
                        style={{
                          background: "var(--bg)",
                          border: "1.5px solid var(--border)",
                          borderRadius: 10,
                          padding: "12px 14px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 800,
                            textTransform: "uppercase",
                            letterSpacing: 1,
                            color: "#94a3b8",
                          }}
                        >
                          {label}
                        </span>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: "var(--text)",
                            marginTop: 3,
                          }}
                        >
                          {value}
                        </div>
                      </div>
                    ))}
                    {selected.condition && (
                      <div
                        style={{
                          gridColumn: "1 / -1",
                          background: "#fffbeb",
                          border: "1.5px solid #fde68a",
                          borderRadius: 10,
                          padding: "14px 16px",
                        }}
                      >
                        <p
                          style={{
                            margin: "0 0 6px",
                            fontSize: 10,
                            fontWeight: 800,
                            textTransform: "uppercase",
                            letterSpacing: 1,
                            color: "#92400e",
                          }}
                        >
                          Condition
                        </p>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 14,
                            color: "#78350f",
                            lineHeight: 1.6,
                          }}
                        >
                          {selected.condition}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* VACCINATION TAB */}
              {tab === "vaccination" && (
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 16,
                    }}
                  >
                    <div>
                      <h4
                        style={{
                          margin: 0,
                          fontSize: 14,
                          fontWeight: 800,
                          color: "#166534",
                        }}
                      >
                        Vaccination Record
                      </h4>
                      <p
                        style={{
                          margin: "2px 0 0",
                          fontSize: 12,
                          color: "var(--muted)",
                        }}
                      >
                        {vaccinations.length} vaccination
                        {vaccinations.length !== 1 ? "s" : ""} on record
                      </p>
                    </div>
                  </div>
                  {vaccinations.length === 0 ? (
                    <p
                      style={{
                        color: "var(--muted)",
                        fontSize: 13,
                        textAlign: "center",
                        padding: "40px 0",
                      }}
                    >
                      No vaccination records.
                    </p>
                  ) : (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                        gap: 14,
                      }}
                    >
                      {vaccinations.map((v) => {
                        const isExpired =
                          v.next_due && new Date(v.next_due) < new Date();
                        const isDueSoon =
                          v.next_due &&
                          !isExpired &&
                          new Date(v.next_due) - new Date() <
                            30 * 24 * 3600 * 1000;
                        return (
                          <div
                            key={v.id}
                            style={{
                              background:
                                "linear-gradient(145deg,#f0fdf4,#fff)",
                              border: "1px solid #bbf7d0",
                              borderRadius: 14,
                              padding: "18px 20px",
                              position: "relative",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                right: 0,
                                height: 4,
                                background:
                                  "linear-gradient(90deg,#16a34a,#22c55e)",
                              }}
                            />
                            <div
                              style={{
                                position: "absolute",
                                top: 12,
                                right: 14,
                                width: 52,
                                height: 52,
                                borderRadius: "50%",
                                border: "2.5px solid #16a34a",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexDirection: "column",
                                background: "#f0fdf4",
                              }}
                            >
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#16a34a"
                                strokeWidth="3"
                                strokeLinecap="round"
                              >
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                              <span
                                style={{
                                  fontSize: 7,
                                  fontWeight: 800,
                                  color: "#16a34a",
                                  textTransform: "uppercase",
                                }}
                              >
                                VACC'D
                              </span>
                            </div>
                            <div style={{ marginBottom: 12, paddingRight: 60 }}>
                              <h4
                                style={{
                                  margin: 0,
                                  fontSize: 15,
                                  fontWeight: 800,
                                  color: "#14532d",
                                }}
                              >
                                {v.name}
                              </h4>
                              {v.given_by && (
                                <p
                                  style={{
                                    margin: "3px 0 0",
                                    fontSize: 12,
                                    color: "#16a34a",
                                  }}
                                >
                                  By: {v.given_by}
                                </p>
                              )}
                            </div>
                            <div
                              style={{
                                display: "flex",
                                gap: 8,
                                flexWrap: "wrap",
                              }}
                            >
                              <div
                                style={{
                                  background: "#dcfce7",
                                  border: "1px solid #86efac",
                                  borderRadius: 8,
                                  padding: "6px 10px",
                                }}
                              >
                                <p
                                  style={{
                                    margin: 0,
                                    fontSize: 10,
                                    fontWeight: 700,
                                    color: "#166534",
                                    textTransform: "uppercase",
                                  }}
                                >
                                  Date Given
                                </p>
                                <p
                                  style={{
                                    margin: "2px 0 0",
                                    fontSize: 12,
                                    fontWeight: 700,
                                    color: "#14532d",
                                  }}
                                >
                                  {new Date(v.date_given).toLocaleDateString(
                                    "en-US",
                                    {
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric",
                                    },
                                  )}
                                </p>
                              </div>
                              {v.next_due && (
                                <div
                                  style={{
                                    background: isExpired
                                      ? "#fef2f2"
                                      : isDueSoon
                                        ? "#fffbeb"
                                        : "#f0fdf4",
                                    border: `1px solid ${isExpired ? "#fca5a5" : isDueSoon ? "#fde68a" : "#86efac"}`,
                                    borderRadius: 8,
                                    padding: "6px 10px",
                                  }}
                                >
                                  <p
                                    style={{
                                      margin: 0,
                                      fontSize: 10,
                                      fontWeight: 700,
                                      color: isExpired
                                        ? "#991b1b"
                                        : isDueSoon
                                          ? "#92400e"
                                          : "#166534",
                                      textTransform: "uppercase",
                                    }}
                                  >
                                    Next Due
                                  </p>
                                  <p
                                    style={{
                                      margin: "2px 0 0",
                                      fontSize: 12,
                                      fontWeight: 700,
                                      color: isExpired
                                        ? "#dc2626"
                                        : isDueSoon
                                          ? "#d97706"
                                          : "#14532d",
                                    }}
                                  >
                                    {new Date(v.next_due).toLocaleDateString(
                                      "en-US",
                                      {
                                        year: "numeric",
                                        month: "short",
                                        day: "numeric",
                                      },
                                    )}
                                  </p>
                                  {isExpired && (
                                    <span
                                      style={{
                                        fontSize: 10,
                                        color: "#dc2626",
                                        fontWeight: 700,
                                      }}
                                    >
                                      OVERDUE
                                    </span>
                                  )}
                                  {isDueSoon && (
                                    <span
                                      style={{
                                        fontSize: 10,
                                        color: "#d97706",
                                        fontWeight: 700,
                                      }}
                                    >
                                      Due soon
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TREATMENT TAB */}
              {tab === "treatment" && (
                <div>
                  <div style={{ marginBottom: 16 }}>
                    <h4
                      style={{
                        margin: 0,
                        fontSize: 14,
                        fontWeight: 800,
                        color: "#92400e",
                      }}
                    >
                      Treatment Records
                    </h4>
                    <p
                      style={{
                        margin: "2px 0 0",
                        fontSize: 12,
                        color: "var(--muted)",
                      }}
                    >
                      {treatments.length} treatment
                      {treatments.length !== 1 ? "s" : ""} on file
                    </p>
                  </div>
                  {treatments.length === 0 ? (
                    <p
                      style={{
                        color: "var(--muted)",
                        fontSize: 13,
                        textAlign: "center",
                        padding: "40px 0",
                      }}
                    >
                      No treatment records.
                    </p>
                  ) : (
                    treatments.map((t) => (
                      <div
                        key={t.id}
                        style={{
                          background: "#fffef5",
                          border: "1px solid #e8e0c8",
                          borderRadius: 3,
                          padding: isMobile ? "16px 16px" : "20px 22px",
                          position: "relative",
                          boxShadow: "2px 3px 8px rgba(0,0,0,0.08)",
                          marginBottom: 12,
                        }}
                      >
                        {!isMobile && (
                          <div
                            style={{
                              position: "absolute",
                              left: 42,
                              top: 0,
                              bottom: 0,
                              width: 1,
                              background: "rgba(220,38,38,0.25)",
                            }}
                          />
                        )}
                        <div
                          style={{
                            position: "absolute",
                            top: 0,
                            right: 0,
                            width: 0,
                            height: 0,
                            borderStyle: "solid",
                            borderWidth: "0 24px 24px 0",
                            borderColor:
                              "transparent #e8e0c8 transparent transparent",
                          }}
                        />
                        <div style={{ paddingLeft: isMobile ? 0 : 50 }}>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              marginBottom: 8,
                              flexWrap: isMobile ? "wrap" : "nowrap",
                              gap: 6,
                            }}
                          >
                            <div>
                              <h4
                                style={{
                                  margin: 0,
                                  fontSize: 15,
                                  fontWeight: 800,
                                  color: "#1e293b",
                                }}
                              >
                                {t.diagnosis}
                              </h4>
                              {t.vet && (
                                <p
                                  style={{
                                    margin: "2px 0 0",
                                    fontSize: 12,
                                    color: "#64748b",
                                    fontStyle: "italic",
                                  }}
                                >
                                  Dr. {t.vet}
                                </p>
                              )}
                            </div>
                            <p
                              style={{
                                margin: 0,
                                fontSize: 11,
                                color: "#94a3b8",
                                fontWeight: 600,
                              }}
                            >
                              {new Date(t.date).toLocaleDateString("en-US", {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </p>
                          </div>
                          {t.notes && (
                            <p
                              style={{
                                margin: 0,
                                fontSize: 13,
                                color: "#334155",
                                lineHeight: 1.8,
                              }}
                            >
                              {t.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* PRESCRIPTION TAB */}
              {tab === "prescription" && (
                <div>
                  <div style={{ marginBottom: 16 }}>
                    <h4
                      style={{
                        margin: 0,
                        fontSize: 14,
                        fontWeight: 800,
                        color: "#1e3a8a",
                      }}
                    >
                      Prescriptions
                    </h4>
                    <p
                      style={{
                        margin: "2px 0 0",
                        fontSize: 12,
                        color: "var(--muted)",
                      }}
                    >
                      {prescriptions.length} prescription
                      {prescriptions.length !== 1 ? "s" : ""} on file
                    </p>
                  </div>
                  {prescriptions.length === 0 ? (
                    <p
                      style={{
                        color: "var(--muted)",
                        fontSize: 13,
                        textAlign: "center",
                        padding: "40px 0",
                      }}
                    >
                      No prescription records.
                    </p>
                  ) : (
                    prescriptions.map((rx) => (
                      <div
                        key={rx.id}
                        style={{
                          background: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: 10,
                          overflow: "hidden",
                          marginBottom: 12,
                          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                        }}
                      >
                        <div
                          style={{
                            background:
                              "linear-gradient(135deg,#1e3a8a,#1e40af)",
                            padding: "12px 16px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            position: "relative",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                            }}
                          >
                            <div
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: 10,
                                background: "rgba(255,255,255,0.15)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <svg
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="rgba(255,255,255,0.9)"
                                strokeWidth="2"
                                strokeLinecap="round"
                              >
                                <path d="M10.5 20H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H20a2 2 0 0 1 2 2v3" />
                                <circle cx="18" cy="18" r="3" />
                                <path d="m22 22-1.5-1.5" />
                              </svg>
                            </div>
                            <div>
                              <h4
                                style={{
                                  margin: 0,
                                  fontSize: 15,
                                  fontWeight: 800,
                                  color: "#fff",
                                }}
                              >
                                {rx.medicine}
                              </h4>
                              <span
                                style={{
                                  fontSize: 12,
                                  color: "rgba(255,255,255,0.65)",
                                }}
                              >
                                {rx.dosage}
                              </span>
                            </div>
                          </div>
                          <span
                            style={{
                              fontSize: 22,
                              fontWeight: 900,
                              color: "rgba(255,255,255,0.15)",
                              fontStyle: "italic",
                            }}
                          >
                            ℞
                          </span>
                        </div>
                        <div style={{ padding: "14px 16px" }}>
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 6,
                              marginBottom: rx.instructions ? 10 : 0,
                            }}
                          >
                            {rx.frequency && (
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4,
                                  background: "#eff6ff",
                                  border: "1px solid #bfdbfe",
                                  borderRadius: 20,
                                  padding: "3px 10px",
                                  fontSize: 11,
                                  color: "#1e40af",
                                  fontWeight: 600,
                                }}
                              >
                                {rx.frequency}
                              </span>
                            )}
                            {rx.route && (
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4,
                                  background: "#f0fdf4",
                                  border: "1px solid #bbf7d0",
                                  borderRadius: 20,
                                  padding: "3px 10px",
                                  fontSize: 11,
                                  color: "#166534",
                                  fontWeight: 600,
                                }}
                              >
                                {rx.route}
                              </span>
                            )}
                            {rx.duration && (
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4,
                                  background: "#fffbeb",
                                  border: "1px solid #fde68a",
                                  borderRadius: 20,
                                  padding: "3px 10px",
                                  fontSize: 11,
                                  color: "#92400e",
                                  fontWeight: 600,
                                }}
                              >
                                {rx.duration}
                              </span>
                            )}
                            {rx.prescribed_by && (
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4,
                                  background: "var(--bg)",
                                  border: "1px solid var(--border)",
                                  borderRadius: 20,
                                  padding: "3px 10px",
                                  fontSize: 11,
                                  color: "var(--muted)",
                                  fontWeight: 600,
                                }}
                              >
                                {rx.prescribed_by}
                              </span>
                            )}
                            {rx.date_prescribed && (
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4,
                                  background: "var(--bg)",
                                  border: "1px solid var(--border)",
                                  borderRadius: 20,
                                  padding: "3px 10px",
                                  fontSize: 11,
                                  color: "var(--muted)",
                                  fontWeight: 600,
                                }}
                              >
                                {new Date(
                                  rx.date_prescribed,
                                ).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </span>
                            )}
                          </div>
                          {rx.instructions && (
                            <div
                              style={{
                                background: "#fffbeb",
                                border: "1px solid #fde68a",
                                borderRadius: 8,
                                padding: "8px 12px",
                                display: "flex",
                                gap: 8,
                                alignItems: "flex-start",
                              }}
                            >
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#d97706"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                style={{ flexShrink: 0, marginTop: 1 }}
                              >
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                <line x1="12" y1="9" x2="12" y2="13" />
                                <line x1="12" y1="17" x2="12.01" y2="17" />
                              </svg>
                              <p
                                style={{
                                  margin: 0,
                                  fontSize: 12,
                                  color: "#78350f",
                                  lineHeight: 1.5,
                                }}
                              >
                                <strong>Instructions:</strong> {rx.instructions}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* FILES TAB — read-only, view only, no upload/delete for customers */}
              {tab === "files" && (
                <div>
                  <div style={{ marginBottom: 16 }}>
                    <h4
                      style={{
                        margin: 0,
                        fontSize: 14,
                        fontWeight: 800,
                        color: "#1e3a8a",
                      }}
                    >
                      Patient Files
                    </h4>
                    <p
                      style={{
                        margin: "2px 0 0",
                        fontSize: 12,
                        color: "var(--muted)",
                      }}
                    >
                      {patientFiles.length} file
                      {patientFiles.length !== 1 ? "s" : ""} on record
                    </p>
                  </div>
                  {loadingFiles ? (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                        gap: 12,
                      }}
                    >
                      {[1, 2].map((i) => (
                        <div
                          key={i}
                          style={{
                            background: "var(--card)",
                            border: "1.5px solid var(--border)",
                            borderRadius: 12,
                            padding: 16,
                          }}
                        >
                          <Skeleton w="60%" h={14} mb={8} />
                          <Skeleton w="40%" h={11} />
                        </div>
                      ))}
                    </div>
                  ) : patientFiles.length === 0 ? (
                    <p
                      style={{
                        color: "var(--muted)",
                        fontSize: 13,
                        textAlign: "center",
                        padding: "40px 0",
                      }}
                    >
                      No files uploaded yet.
                    </p>
                  ) : (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                        gap: 12,
                      }}
                    >
                      {patientFiles.map((f) => {
                        const isImage = f.type?.startsWith("image/");
                        return (
                          <div
                            key={f.id}
                            onClick={() => {
                              setPreviewZoom(1);
                              setPreviewFile(f);
                            }}
                            style={{
                              background: "var(--card)",
                              border: "1.5px solid var(--border)",
                              borderRadius: 12,
                              padding: 14,
                              display: "flex",
                              flexDirection: "column",
                              gap: 8,
                              cursor: "pointer",
                            }}
                          >
                            {isImage ? (
                              <img
                                src={f.url}
                                alt={f.name}
                                style={{
                                  width: "100%",
                                  height: 120,
                                  objectFit: "cover",
                                  borderRadius: 8,
                                }}
                              />
                            ) : (
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  height: 120,
                                  background: "var(--bg)",
                                  borderRadius: 8,
                                  color: "#1d4ed8",
                                  fontSize: 13,
                                  fontWeight: 600,
                                }}
                              >
                                📄 {f.name}
                              </div>
                            )}
                            <span
                              style={{
                                fontSize: 12,
                                color: "var(--text)",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                              title={f.name}
                            >
                              {f.name}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                padding: "14px 24px",
                borderTop: "1px solid var(--border)",
                flexShrink: 0,
              }}
            >
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

      {/* File Preview Modal */}
      {previewFile && (
        <div
          onClick={() => setPreviewFile(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 10000,
            background: "rgba(0,0,0,0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 900,
              width: "100%",
              maxHeight: "90vh",
              background: "var(--card)",
              borderRadius: 14,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 18px",
                borderBottom: "1px solid var(--border)",
                flexShrink: 0,
                gap: 10,
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--text)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={previewFile.name}
              >
                {previewFile.name}
              </span>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexShrink: 0,
                }}
              >
                {previewFile.type?.startsWith("image/") && (
                  <>
                    <button
                      onClick={() =>
                        setPreviewZoom((z) =>
                          Math.max(0.5, +(z - 0.25).toFixed(2)),
                        )
                      }
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 8,
                        border: "1px solid var(--border)",
                        background: "var(--bg)",
                        cursor: "pointer",
                        fontSize: 16,
                        fontWeight: 700,
                        color: "var(--text)",
                      }}
                    >
                      −
                    </button>
                    <span
                      style={{
                        fontSize: 12,
                        color: "var(--muted)",
                        minWidth: 36,
                        textAlign: "center",
                      }}
                    >
                      {Math.round(previewZoom * 100)}%
                    </span>
                    <button
                      onClick={() =>
                        setPreviewZoom((z) =>
                          Math.min(4, +(z + 0.25).toFixed(2)),
                        )
                      }
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 8,
                        border: "1px solid var(--border)",
                        background: "var(--bg)",
                        cursor: "pointer",
                        fontSize: 16,
                        fontWeight: 700,
                        color: "var(--text)",
                      }}
                    >
                      +
                    </button>
                  </>
                )}
                <a
                  href={previewFile.url}
                  download={previewFile.name}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 12px",
                    borderRadius: 8,
                    background: "var(--royal)",
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: 700,
                    textDecoration: "none",
                  }}
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#fff"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download
                </a>
                <button
                  onClick={() => setPreviewFile(null)}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: 20,
                    cursor: "pointer",
                    color: "var(--muted)",
                    lineHeight: 1,
                    padding: "2px 6px",
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Body */}
            <div
              style={{
                flex: 1,
                overflow: "auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#0f172a",
                padding: 20,
              }}
            >
              {previewFile.type?.startsWith("image/") ? (
                <img
                  src={previewFile.url}
                  alt={previewFile.name}
                  style={{
                    transform: `scale(${previewZoom})`,
                    transition: "transform 0.15s",
                    maxWidth: previewZoom === 1 ? "100%" : "none",
                    maxHeight: previewZoom === 1 ? "100%" : "none",
                  }}
                />
              ) : (
                <div style={{ textAlign: "center", color: "#fff" }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>📄</div>
                  <p style={{ fontSize: 14, marginBottom: 4 }}>
                    {previewFile.name}
                  </p>
                  <p style={{ fontSize: 12, color: "#94a3b8" }}>
                    Preview not available for this file type. Use the Download
                    button above.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default CustomerPets;
