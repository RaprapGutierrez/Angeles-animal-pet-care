import React, { useState, useEffect, useCallback, useRef } from "react";
import Layout from "../components/layout";
import { supabase } from "../js/supabase";
import { useCurrentUser } from "../js/useCurrentUser";
import { useBranchFilter, withBranchId } from "../js/useBranchFilter";

// ── Icon paths (served from public/icon/) ─────────────────────
const branchIcon   = "/icon/branch.png";
const emailIcon    = "/icon/email.png";
const phoneIcon    = "/icon/phone.png";
const addressIcon  = "/icon/address.png";
const calendarIcon = "/icon/calendar.png";
const customerIcon = "/icon/customer.png";
const editIcon     = "/icon/edit.png";

const T = {
  royal:     "#2563eb",
  royalDark: "#1d4ed8",
  royalLight:"#eff6ff",
  text:      "#1e293b",
  muted:     "#64748b",
  border:    "#e2e8f0",
  bg:        "#f8fafc",
  success:   "#16a34a",
  warning:   "#f59e0b",
  danger:    "#dc2626",
};

const ROLE_GRADIENT = {
  Admin:    "linear-gradient(135deg, #6d28d9, #4f46e5)",
  Manager:  "linear-gradient(135deg, #1d4ed8, #0284c7)",
  Employee: "linear-gradient(135deg, #15803d, #16a34a)",
  Customer: "linear-gradient(135deg, #0f766e, #0891b2)",
};

const ROLE_BADGE_STYLE = {
  Admin:    { bg: "#ede9fe", color: "#6d28d9" },
  Manager:  { bg: "#dbeafe", color: "#1d4ed8" },
  Employee: { bg: "#dcfce7", color: "#15803d" },
  Customer: { bg: "#ccfbf1", color: "#0f766e" },
};

const APPT_STATUS = {
  scheduled: { bg: "#dbeafe", color: "#1d4ed8", label: "Scheduled" },
  Confirmed: { bg: "#dcfce7", color: "#15803d", label: "Confirmed" },
  confirmed: { bg: "#dcfce7", color: "#15803d", label: "Confirmed" },
  completed: { bg: "#f3f4f6", color: "#6b7280", label: "Completed" },
  Completed: { bg: "#f3f4f6", color: "#6b7280", label: "Completed" },
  cancelled: { bg: "#fef2f2", color: "#dc2626", label: "Cancelled" },
  Cancelled: { bg: "#fef2f2", color: "#dc2626", label: "Cancelled" },
  pending:   { bg: "#fef9c3", color: "#854d0e", label: "Pending" },
  Pending:   { bg: "#fef9c3", color: "#854d0e", label: "Pending" },
};

const fmtDate = (s) =>
  s ? new Date(s).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "—";

const fmtTime = (s) => {
  if (!s) return "—";
  try {
    if (s.includes("AM") || s.includes("PM")) return s;
    const [h, m] = s.split(":");
    const d = new Date();
    d.setHours(+h, +m);
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  } catch { return s; }
};

const fmtDateTime = (s) =>
  s ? new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

const Img = ({ src, size = 16, style }) => (
  <img
    src={src} alt="" width={size} height={size}
    style={{ objectFit: "contain", flexShrink: 0, display: "inline-block", verticalAlign: "middle", mixBlendMode: "multiply", ...style }}
    onError={(e) => { e.target.style.display = "none"; }}
  />
);

const InfoField = ({ label, value, icon }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
    <span style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</span>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {icon && (
        <span style={{ width: 24, height: 24, display: "inline-flex", alignItems: "center", justifyContent: "center", background: "#ffffff", borderRadius: 6, flexShrink: 0, border: `1px solid ${T.border}` }}>
          <Img src={icon} size={15} />
        </span>
      )}
      <span style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{value || "—"}</span>
    </div>
  </div>
);

const Card = ({ title, icon, children, style }) => (
  <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,.05)", ...style }}>
    {title && (
      <div style={{ padding: "16px 22px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 9 }}>
        {icon && (
          <span style={{ width: 26, height: 26, display: "inline-flex", alignItems: "center", justifyContent: "center", background: "#ffffff", border: `1px solid ${T.border}`, borderRadius: 7, flexShrink: 0 }}>
            <Img src={icon} size={15} />
          </span>
        )}
        <h3 style={{ fontSize: 14, fontWeight: 800, color: T.text, margin: 0 }}>{title}</h3>
      </div>
    )}
    <div style={{ padding: 22 }}>{children}</div>
  </div>
);

const MODAL_VARIANTS = {
  error:   { bg: "#fef2f2", border: "#fecaca", btnBg: "#dc2626" },
  success: { bg: "#f0fdf4", border: "#bbf7d0", btnBg: "#16a34a" },
  warning: { bg: "#fffbeb", border: "#fde68a", btnBg: "#d97706" },
  info:    { bg: "#eff6ff", border: "#bfdbfe", btnBg: "#2563eb" },
  confirm: { bg: "#fef2f2", border: "#fecaca", btnBg: "#dc2626" },
};

const Modal = ({ modal, onClose }) => {
  if (!modal) return null;
  const v = MODAL_VARIANTS[modal.type] || MODAL_VARIANTS.info;
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: "#fff", borderRadius: 16, padding: "32px 30px 28px", width: "100%", maxWidth: 420, boxShadow: "0 24px 64px rgba(0,0,0,.2)", position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 14, right: 14, background: "none", border: "none", cursor: "pointer", color: T.muted, fontSize: 18, lineHeight: 1, padding: 4 }}>✕</button>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: v.bg, border: `1.5px solid ${v.border}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
          <Img src={modal.type === "error" || modal.type === "confirm" ? addressIcon : modal.type === "success" ? calendarIcon : emailIcon} size={24} />
        </div>
        <h3 style={{ fontSize: 17, fontWeight: 800, color: T.text, margin: "0 0 8px" }}>{modal.title}</h3>
        <p style={{ fontSize: 13.5, color: T.muted, lineHeight: 1.6, margin: "0 0 24px" }}>{modal.message}</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          {modal.type === "confirm" && (
            <button onClick={onClose} style={{ padding: "9px 20px", border: `1.5px solid ${T.border}`, borderRadius: 9, background: "#fff", color: T.text, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
          )}
          <button onClick={() => { modal.onConfirm?.(); onClose(); }} style={{ padding: "9px 22px", border: "none", borderRadius: 9, background: v.btnBg, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            {modal.confirmLabel || "OK"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Image Crop / Resize Modal ─────────────────────────────────
const ImageCropModal = ({ imageSrc, onCancel, onSave }) => {
  const canvasRef  = useRef(null);
  const imgRef     = useRef(null);
  const [scale, setScale]     = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef(null);
  const SIZE = 280;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img    = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, SIZE, SIZE);
    const w = img.naturalWidth  * scale;
    const h = img.naturalHeight * scale;
    const x = SIZE / 2 - w / 2 + offsetX;
    const y = SIZE / 2 - h / 2 + offsetY;
    ctx.save();
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, x, y, w, h);
    ctx.restore();
    ctx.strokeStyle = "rgba(37,99,235,0.7)";
    ctx.lineWidth   = 3;
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 1.5, 0, Math.PI * 2);
    ctx.stroke();
  }, [scale, offsetX, offsetY]);

  useEffect(() => { draw(); }, [draw]);

  const onMouseDown = (e) => { setDragging(true); dragStart.current = { x: e.clientX - offsetX, y: e.clientY - offsetY }; };
  const onMouseMove = (e) => { if (!dragging) return; setOffsetX(e.clientX - dragStart.current.x); setOffsetY(e.clientY - dragStart.current.y); };
  const onMouseUp   = () => setDragging(false);
  const onTouchStart = (e) => { const t = e.touches[0]; setDragging(true); dragStart.current = { x: t.clientX - offsetX, y: t.clientY - offsetY }; };
  const onTouchMove  = (e) => { if (!dragging) return; const t = e.touches[0]; setOffsetX(t.clientX - dragStart.current.x); setOffsetY(t.clientY - dragStart.current.y); };

  const handleSave = () => {
    const out = document.createElement("canvas");
    out.width = 400; out.height = 400;
    const ctx   = out.getContext("2d");
    const img   = imgRef.current;
    const ratio = 400 / SIZE;
    const w     = img.naturalWidth  * scale * ratio;
    const h     = img.naturalHeight * scale * ratio;
    const x     = 200 - w / 2 + offsetX * ratio;
    const y     = 200 - h / 2 + offsetY * ratio;
    ctx.beginPath();
    ctx.arc(200, 200, 200, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, x, y, w, h);
    out.toBlob((blob) => onSave(blob), "image/jpeg", 0.92);
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(15,23,42,0.75)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 20, padding: "32px 28px 28px", width: "100%", maxWidth: 380, boxShadow: "0 32px 80px rgba(0,0,0,.3)", position: "relative" }}>
        <button onClick={onCancel} style={{ position: "absolute", top: 14, right: 14, background: "none", border: "none", cursor: "pointer", color: T.muted, fontSize: 18, padding: 4 }}>✕</button>
        <h3 style={{ fontSize: 16, fontWeight: 800, color: T.text, margin: "0 0 4px" }}>Adjust Profile Photo</h3>
        <p style={{ fontSize: 12, color: T.muted, margin: "0 0 20px" }}>Drag to reposition · Scroll or use slider to zoom</p>
        <img ref={imgRef} src={imageSrc} alt="" style={{ display: "none" }} onLoad={draw} />
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <canvas
            ref={canvasRef} width={SIZE} height={SIZE}
            style={{ borderRadius: "50%", cursor: dragging ? "grabbing" : "grab", boxShadow: "0 0 0 4px rgba(37,99,235,0.15), 0 8px 24px rgba(0,0,0,.15)", touchAction: "none", userSelect: "none" }}
            onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
            onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onMouseUp}
            onWheel={(e) => { e.preventDefault(); setScale((s) => Math.min(4, Math.max(0.3, s - e.deltaY * 0.002))); }}
          />
        </div>
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.5px" }}>Zoom</label>
            <span style={{ fontSize: 12, fontWeight: 700, color: T.royal }}>{Math.round(scale * 100)}%</span>
          </div>
          <input type="range" min="0.3" max="4" step="0.01" value={scale} onChange={(e) => setScale(parseFloat(e.target.value))} style={{ width: "100%", accentColor: T.royal }} />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: "10px 16px", border: `1.5px solid ${T.border}`, borderRadius: 10, background: "#fff", color: T.text, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
          <button onClick={handleSave} style={{ flex: 2, padding: "10px 16px", border: "none", borderRadius: 10, background: T.royal, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Save Photo</button>
        </div>
      </div>
    </div>
  );
};

// ── Helpers ───────────────────────────────────────────────────
const normalizeRole = (raw) => {
  if (!raw) return "Employee";
  const map = { admin: "Admin", manager: "Manager", employee: "Employee", customer: "Customer" };
  return map[String(raw).toLowerCase()] || raw;
};

// ── Avatar (supports photo URL) ───────────────────────────────
const Avatar = ({ firstName, lastName, role, size = 92, photoUrl, onClick, uploading }) => {
  const initials = [firstName, lastName].filter(Boolean).map((n) => n.charAt(0).toUpperCase()).join("") || "?";
  const grad     = ROLE_GRADIENT[role] || ROLE_GRADIENT.Employee;
  return (
    <div
      onClick={onClick}
      title={onClick ? "Change profile photo" : undefined}
      style={{
        width: size, height: size, borderRadius: "50%",
        background: photoUrl ? "transparent" : grad,
        color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.33, fontWeight: 800, flexShrink: 0,
        boxShadow: "0 6px 20px rgba(37,99,235,.35)",
        border: "3px solid rgba(255,255,255,0.9)",
        userSelect: "none", position: "relative",
        cursor: onClick ? "pointer" : "default", overflow: "hidden",
        transition: "box-shadow .2s",
      }}
    >
      {photoUrl
        ? <img src={photoUrl} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
        : initials
      }
      {onClick && (
        <div style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          background: "rgba(0,0,0,0.45)", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 4,
          opacity: uploading ? 1 : 0, transition: "opacity .2s",
          fontSize: 10, fontWeight: 700, color: "#fff", letterSpacing: "0.3px",
        }} className="avatar-overlay">
          {uploading
            ? <span style={{ animation: "spin 1s linear infinite", display: "inline-block", fontSize: 18 }}>⟳</span>
            : <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                <span>Change</span>
              </>
          }
        </div>
      )}
    </div>
  );
};

// ── Main Profile Component ────────────────────────────────────
const Profile = () => {
  // ── PATCH: replace getUserInfo() with useCurrentUser ───────────────────────
  const { user: authUser, loading: userLoading } = useCurrentUser();
  const { applyFilter } = useBranchFilter();

  const userId = authUser?.id ?? null;

  const [profile, setProfile] = useState(null);
  const [appointments, setAppointments]       = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [apptLoading, setApptLoading]         = useState(true);
  const [tab, setTab]                         = useState("upcoming");
  const [noUser, setNoUser]                   = useState(false);
  const [editing, setEditing]                 = useState(false);
  const [editForm, setEditForm]               = useState({ first_name: "", last_name: "", phone: "", address: "" });
  const [saving, setSaving]                   = useState(false);
  const [saveMsg, setSaveMsg]                 = useState("");
  const [modal, setModal]                     = useState(null);

  const [cropSrc, setCropSrc]               = useState(null);
  const [photoUrl, setPhotoUrl]             = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);

  const showModal  = useCallback((type, title, message, opts = {}) => setModal({ type, title, message, ...opts }), []);
  const closeModal = useCallback(() => setModal(null), []);

  // ── Fetch profile ─────────────────────────────────────────
  const fetchProfile = useCallback(async () => {
    if (!userId) { setNoUser(true); setLoading(false); return; }
    setLoading(true);

    const { data: { user: liveUser } } = await supabase.auth.getUser();
    const liveMeta      = liveUser?.user_metadata || {};
    const authFirstName = liveMeta.first_name || authUser?.firstName || "";
    const authLastName  = liveMeta.last_name  || authUser?.lastName  || "";

    const { data: dbRow } = await supabase.from("profiles").select("*").eq("id", userId).single();

    if (dbRow) {
      const needsSync =
        (authFirstName && authFirstName !== dbRow.first_name) ||
        (authLastName  && authLastName  !== dbRow.last_name);
      if (needsSync) {
        await supabase.from("profiles").update({ first_name: authFirstName, last_name: authLastName }).eq("id", userId);
      }
      const merged = { ...dbRow, first_name: authFirstName || dbRow.first_name, last_name: authLastName || dbRow.last_name };
      setProfile(merged);
      setEditForm({ first_name: merged.first_name, last_name: merged.last_name, phone: dbRow.phone || "", address: dbRow.address || "" });
      if (dbRow.avatar_url) setPhotoUrl(dbRow.avatar_url);
    } else {
      const fallback = {
        id: userId, email: authUser?.email || "", role: normalizeRole(authUser?.role),
        first_name: authFirstName, last_name: authLastName,
        phone: "", address: "", status: "Active", created_at: null, updated_at: null, avatar_url: null,
        branch_id: authUser?.branchId ?? null,
      };
      setProfile(fallback);
      setEditForm({ first_name: authFirstName, last_name: authLastName, phone: "", address: "" });
    }
    setLoading(false);
  }, [userId, authUser]);

  // ── Fetch appointments (branch-filtered) ──────────────────
  const fetchAppointments = useCallback(async () => {
    if (!userId) { setApptLoading(false); return; }
    setApptLoading(true);
    try {
      const { data: { user: liveUser } } = await supabase.auth.getUser();
      const liveMeta = liveUser?.user_metadata || {};
      const name = [liveMeta.first_name || authUser?.firstName, liveMeta.last_name || authUser?.lastName].filter(Boolean).join(" ");

      // ── PATCH: apply branch filter ──────────────────────────────────────────
      let q = supabase.from("appointments").select("*").ilike("owner", `%${name}%`).order("date", { ascending: true }).limit(50);
      q = applyFilter(q);
      const { data } = await q;
      setAppointments(data || []);
    } catch { setAppointments([]); }
    setApptLoading(false);
  }, [userId, authUser, applyFilter]);

  useEffect(() => {
    if (userLoading) return;
    fetchProfile();
    fetchAppointments();

    const profileChannel = supabase.channel("profile-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles", filter: `id=eq.${userId}` }, () => fetchProfile())
      .subscribe();

    const apptChannel = supabase.channel("profile-appts-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, () => fetchAppointments())
      .subscribe();

    return () => {
      supabase.removeChannel(profileChannel);
      supabase.removeChannel(apptChannel);
    };
  }, [fetchProfile, fetchAppointments, userId, userLoading]);

  // ── Photo pick ────────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { showModal("error", "Invalid File", "Please select an image file (JPG, PNG, WebP, etc.)."); return; }
    if (file.size > 8 * 1024 * 1024) { showModal("error", "File Too Large", "Please choose an image under 8 MB."); return; }
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // ── After crop: upload blob to Supabase Storage ───────────
  const handleCropSave = async (blob) => {
    setCropSrc(null);
    if (!userId) return;
    setUploadingPhoto(true);
    try {
      const path = `avatars/${userId}.jpg`;
      const { error: upErr } = await supabase.storage
        .from("profile-images")
        .upload(path, blob, { upsert: true, contentType: "image/jpeg" });
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage.from("profile-images").getPublicUrl(path);
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      // ── PATCH: include branch_id in upsert ─────────────────────────────────
      await supabase.from("profiles").upsert(
        withBranchId(authUser, { id: userId, avatar_url: publicUrl }),
        { onConflict: "id" }
      );

      setPhotoUrl(publicUrl);
      showModal("success", "Photo Updated", "Your profile photo has been saved successfully.");
    } catch (err) {
      showModal("error", "Upload Failed", err.message || "Could not upload photo. Please try again.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  // ── Save text profile ─────────────────────────────────────
  const saveProfile = async () => {
    if (!userId) return;
    setSaving(true);

    const newFirstName = editForm.first_name.trim();
    const newLastName  = editForm.last_name.trim();
    const newPhone     = editForm.phone.trim();
    const newAddress   = editForm.address.trim();

    const { error: authError } = await supabase.auth.updateUser({ data: { first_name: newFirstName, last_name: newLastName } });
    if (authError) { setSaving(false); showModal("error", "Save Failed", authError.message || "Could not update profile."); return; }

    // ── PATCH: include branch_id in upsert ─────────────────────────────────
    const payload = withBranchId(authUser, {
      id: userId,
      first_name: newFirstName,
      last_name: newLastName,
      phone: newPhone,
      address: newAddress,
      email: authUser?.email || profile?.email,
      role: profile?.role || normalizeRole(authUser?.role),
      status: profile?.status || "Active",
    });

    const { error: dbError } = await supabase.from("profiles").upsert(payload, { onConflict: "id" });

    setSaving(false);
    if (dbError) { showModal("error", "Save Failed", dbError.message || "Could not save profile."); return; }

    setSaveMsg("Profile updated successfully!");
    setEditing(false);
    setTimeout(() => setSaveMsg(""), 3000);
    window.location.reload();
  };

  // ── Derived lists ─────────────────────────────────────────
  const now      = new Date();
  const upcoming = appointments.filter((a) => {
    const d = new Date(a.date);
    return d >= now && !["Cancelled","cancelled","Completed","completed"].includes(a.status);
  });
  const past = appointments.filter((a) => {
    const d = new Date(a.date);
    return d < now || ["Completed","completed","Cancelled","cancelled"].includes(a.status);
  });
  const displayList = tab === "upcoming" ? upcoming : past;

  if (userLoading || loading) {
    return (
      <Layout>
        <div style={{ padding: 40, textAlign: "center", color: T.muted, fontSize: 14 }}>
          <span style={{ display: "inline-block", animation: "spin 1s linear infinite", fontSize: 24 }}>⟳</span>
          <p>Loading profile…</p>
        </div>
      </Layout>
    );
  }

  if (noUser || !profile) {
    return (
      <Layout>
        <div style={{ padding: 40, textAlign: "center", color: T.muted, fontSize: 14 }}>
          <Img src={customerIcon} size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
          <p>Could not load profile. Please log in again.</p>
        </div>
      </Layout>
    );
  }

  const roleNormalized = normalizeRole(profile.role);
  const roleStyle = ROLE_BADGE_STYLE[roleNormalized] || { bg: "#f3f4f6", color: "#4b5563" };
  const grad      = ROLE_GRADIENT[roleNormalized]    || ROLE_GRADIENT.Employee;
  const fullName  = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || authUser?.email?.split("@")[0] || "User";

  // ── Branch display from useCurrentUser (no more email parsing) ────────────
  const branchLabel = authUser?.branchId
    ? (profile.branch_name || `Branch ${authUser.branchId}`)
    : null;

  return (
    <Layout>
      <style>{`
        @keyframes fadeIn  { from { opacity:0; transform:translateY(8px);  } to { opacity:1; transform:translateY(0); } }
        @keyframes slideUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin    { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        .profile-page { animation: fadeIn .3s ease; }
        .appt-row { transition: background .15s; }
        .appt-row:hover { background: ${T.bg} !important; }
        .edit-inp { padding:9px 12px; border:1.5px solid ${T.border}; border-radius:8px; font-size:13px; font-family:inherit; background:#fff; color:${T.text}; outline:none; width:100%; box-sizing:border-box; transition:border-color .15s; }
        .edit-inp:focus { border-color:${T.royal}; box-shadow: 0 0 0 3px rgba(37,99,235,0.1); }
        .avatar-wrapper:hover .avatar-overlay { opacity: 1 !important; }
      `}</style>

      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />
      <Modal modal={modal} onClose={closeModal} />
      {cropSrc && <ImageCropModal imageSrc={cropSrc} onCancel={() => setCropSrc(null)} onSave={handleCropSave} />}

      <div className="profile-page" style={{ padding: "24px 28px", paddingTop: "calc(64px + 24px)", maxWidth: 960, margin: "0 auto" }}>

        {/* ── Hero Banner ── */}
        <div style={{ background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)", borderRadius: 18, padding: "32px 32px 0", marginBottom: 24, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -40, right: -40, width: 180, height: 180, borderRadius: "50%", background: grad, opacity: 0.15, filter: "blur(40px)" }} />
          <div style={{ position: "absolute", bottom: 0, left: 60, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />

          <div style={{ display: "flex", alignItems: "flex-end", gap: 24, position: "relative" }}>
            <div className="avatar-wrapper" style={{ paddingBottom: 28, position: "relative" }}>
              <Avatar
                firstName={profile.first_name} lastName={profile.last_name}
                role={roleNormalized} size={92} photoUrl={photoUrl}
                onClick={() => !uploadingPhoto && fileInputRef.current?.click()}
                uploading={uploadingPhoto}
              />
              {!uploadingPhoto && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  title="Change profile photo"
                  style={{ position: "absolute", bottom: 28, right: -4, width: 26, height: 26, borderRadius: "50%", background: T.royal, border: "2.5px solid #1e293b", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 2 }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                </div>
              )}
            </div>

            <div style={{ paddingBottom: 30, flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                <h1 style={{ fontSize: 24, fontWeight: 900, color: "#fff", margin: 0 }}>{fullName}</h1>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 12px", borderRadius: 20, background: roleStyle.bg, color: roleStyle.color }}>{roleNormalized}</span>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 12px", borderRadius: 20, background: profile.status === "Active" ? "#dcfce7" : "#fef2f2", color: profile.status === "Active" ? "#15803d" : "#dc2626" }}>{profile.status || "Active"}</span>
                {/* ── PATCH: branch from useCurrentUser, no more email parsing ── */}
                {branchLabel && (
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 12px", borderRadius: 20, background: "rgba(255,255,255,0.15)", color: "#e0e7ff", display: "flex", alignItems: "center", gap: 5 }}>
                    <Img src={branchIcon} size={12} style={{ filter: "brightness(0) invert(1)", opacity: 0.85, mixBlendMode: "normal" }} />
                    {branchLabel}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", display: "flex", alignItems: "center", gap: 6 }}>
                <Img src={emailIcon} size={12} style={{ filter: "brightness(0) invert(1)", opacity: 0.55, mixBlendMode: "normal" }} />
                {profile.email}
              </div>
              <div
                onClick={() => !uploadingPhoto && fileInputRef.current?.click()}
                style={{ marginTop: 10, fontSize: 11, color: "rgba(255,255,255,0.4)", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5, transition: "color .15s" }}
                title="Change profile photo"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
                {uploadingPhoto ? "Uploading…" : "Change photo"}
              </div>
            </div>

            <div style={{ paddingBottom: 28 }}>
              {!editing ? (
                <button onClick={() => setEditing(true)} style={{ padding: "9px 20px", background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 10, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", gap: 7 }}>
                  <Img src={editIcon} size={13} style={{ filter: "brightness(0) invert(1)", mixBlendMode: "normal" }} />
                  Edit Profile
                </button>
              ) : (
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => { setEditing(false); fetchProfile(); }} style={{ padding: "9px 16px", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 10, color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
                  <button onClick={saveProfile} disabled={saving} style={{ padding: "9px 20px", background: T.royal, border: "none", borderRadius: 10, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                    {saving ? "Saving…" : "Save"}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: "flex", borderTop: "1px solid rgba(255,255,255,0.08)", margin: "0 -32px", padding: "14px 32px", gap: 32 }}>
            {[
              { label: "Total Appointments", value: appointments.length },
              { label: "Upcoming",           value: upcoming.length },
              { label: "Completed",          value: appointments.filter((a) => ["Completed","completed"].includes(a.status)).length },
              { label: "Joined",             value: profile.created_at ? fmtDate(profile.created_at) : "—" },
            ].map((s) => (
              <div key={s.label}>
                <div style={{ fontSize: 18, fontWeight: 900, color: "#fff" }}>{s.value}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 1 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {saveMsg && (
          <div style={{ background: "#dcfce7", border: "1px solid #86efac", borderRadius: 10, padding: "10px 16px", marginBottom: 16, fontSize: 13, fontWeight: 600, color: "#15803d" }}>{saveMsg}</div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
          {/* Personal Information */}
          <Card title="Personal Information" icon={customerIcon}>
            {!editing ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                <InfoField label="First Name" value={profile.first_name} />
                <InfoField label="Last Name"  value={profile.last_name} />
                <InfoField label="Email"  value={profile.email}  icon={emailIcon} />
                <InfoField label="Phone"  value={profile.phone}  icon={phoneIcon} />
                <InfoField label="Role"   value={roleNormalized} />
                <InfoField label="Status" value={profile.status || "Active"} />
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {[
                  { label: "First Name", key: "first_name", placeholder: "Jane" },
                  { label: "Last Name",  key: "last_name",  placeholder: "Doe" },
                  { label: "Phone",      key: "phone",      placeholder: "+63 912 345 6789" },
                ].map((f) => (
                  <div key={f.key} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.5px" }}>{f.label}</label>
                    <input className="edit-inp" type="text" placeholder={f.placeholder} value={editForm[f.key]} onChange={(e) => setEditForm((v) => ({ ...v, [f.key]: e.target.value }))} />
                  </div>
                ))}
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.5px" }}>Email</label>
                  <input className="edit-inp" type="email" value={profile.email} disabled style={{ opacity: 0.55, cursor: "not-allowed" }} />
                </div>
              </div>
            )}
          </Card>

          {/* Account Details */}
          <Card title="Account Details" icon={branchIcon}>
            {!editing ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <InfoField label="User ID"      value={profile.id} />
                <InfoField label="Member Since" value={profile.created_at ? fmtDate(profile.created_at) : "—"} icon={calendarIcon} />
                {profile.updated_at && <InfoField label="Last Updated" value={fmtDateTime(profile.updated_at)} icon={calendarIcon} />}
                <InfoField label="Address" value={profile.address} icon={addressIcon} />
                {/* ── PATCH: use branchLabel from useCurrentUser ── */}
                <InfoField label="Branch" value={branchLabel || "—"} icon={branchIcon} />
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.5px" }}>Address</label>
                  <textarea className="edit-inp" rows={3} placeholder="Street, City, Province" value={editForm.address} onChange={(e) => setEditForm((v) => ({ ...v, address: e.target.value }))} style={{ resize: "vertical" }} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.5px" }}>User ID</label>
                  <input className="edit-inp" type="text" value={profile.id} disabled style={{ opacity: 0.5, cursor: "not-allowed", fontFamily: "monospace", fontSize: 11 }} />
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* My Schedule */}
        <Card title="My Schedule" icon={calendarIcon}>
          <div style={{ display: "flex", gap: 0, marginBottom: 20, background: T.bg, borderRadius: 10, padding: 4, width: "fit-content" }}>
            {[
              { key: "upcoming", label: `Upcoming (${upcoming.length})` },
              { key: "past",     label: `History (${past.length})` },
            ].map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: "8px 20px", borderRadius: 8, border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700, transition: "all .15s", background: tab === t.key ? "#fff" : "transparent", color: tab === t.key ? T.royal : T.muted, boxShadow: tab === t.key ? "0 1px 4px rgba(0,0,0,.08)" : "none" }}>
                {t.label}
              </button>
            ))}
          </div>

          {apptLoading ? (
            <div style={{ padding: 32, textAlign: "center", color: T.muted, fontSize: 13 }}>Loading appointments…</div>
          ) : displayList.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center" }}>
              <Img src={calendarIcon} size={36} style={{ marginBottom: 10, opacity: 0.3 }} />
              <p style={{ color: T.muted, fontSize: 13, margin: 0 }}>{tab === "upcoming" ? "No upcoming appointments." : "No appointment history yet."}</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr>
                    {["Pet","Veterinarian","Date","Time","Purpose","Status","Notes"].map((h) => (
                      <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: `1px solid ${T.border}`, background: T.bg, whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayList.map((a, i) => {
                    const st      = APPT_STATUS[a.status] || APPT_STATUS.pending;
                    const isToday = new Date(a.date).toDateString() === new Date().toDateString();
                    return (
                      <tr key={a.id} className="appt-row" style={{ background: isToday ? "#eff6ff" : i % 2 === 0 ? "#fff" : T.bg }}>
                        <td style={{ padding: "12px 14px", borderBottom: `1px solid ${T.border}`, verticalAlign: "middle" }}>
                          <div style={{ fontWeight: 700, color: isToday ? T.royal : T.text }}>{a.patient || "—"}</div>
                          {isToday && <div style={{ fontSize: 10, fontWeight: 700, color: T.royal, marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}><Img src={calendarIcon} size={10} />TODAY</div>}
                        </td>
                        <td style={{ padding: "12px 14px", borderBottom: `1px solid ${T.border}`, verticalAlign: "middle", color: T.muted, fontWeight: 600 }}>{a.vet    || "—"}</td>
                        <td style={{ padding: "12px 14px", borderBottom: `1px solid ${T.border}`, verticalAlign: "middle", whiteSpace: "nowrap" }}>{fmtDate(a.date)}</td>
                        <td style={{ padding: "12px 14px", borderBottom: `1px solid ${T.border}`, verticalAlign: "middle", whiteSpace: "nowrap", color: T.muted }}>{fmtTime(a.time)}</td>
                        <td style={{ padding: "12px 14px", borderBottom: `1px solid ${T.border}`, verticalAlign: "middle" }}>{a.purpose || "—"}</td>
                        <td style={{ padding: "12px 14px", borderBottom: `1px solid ${T.border}`, verticalAlign: "middle" }}>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: st.bg, color: st.color }}>{st.label}</span>
                        </td>
                        <td style={{ padding: "12px 14px", borderBottom: `1px solid ${T.border}`, verticalAlign: "middle", color: T.muted }}>{a.notes || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
};

export default Profile;