import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../js/supabase";
import "../styles/Loginregister.css";

// ── Alert Modal ───────────────────────────────────────────────────────────────
const AlertModal = ({ modal, onClose }) => {
  if (!modal) return null;
  const icons = {
  danger:  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  success: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>,
  warning: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  info:    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
};
  const colors = { danger: "#dc3545", success: "#198754", warning: "#ffc107", info: "#0dcaf0" };
  const color = colors[modal.type] || "#0d6efd";
  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 99999, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "#fff", borderRadius: 16, overflow: "hidden", width: "100%", maxWidth: 420, boxShadow: "0 24px 64px rgba(0,0,0,0.3)", animation: "welcomeIn 0.25s cubic-bezier(0.34,1.56,0.64,1)" }}
      >
        <div style={{ background: color, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h5 style={{ margin: 0, fontWeight: 700, color: "#fff", fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}>
            <span>{icons[modal.type] || "ℹ️"}</span>
            {modal.title}
          </h5>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}>
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
</button>
        </div>
        <div style={{ padding: "24px 24px 16px", textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: 14, color: "#374151", lineHeight: 1.6 }}>{modal.message}</p>
        </div>
        <div style={{ padding: "0 24px 24px", display: "flex", justifyContent: "center" }}>
          <button onClick={onClose} style={{ background: color, color: "#fff", border: "none", borderRadius: 8, padding: "10px 40px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>OK</button>
        </div>
      </div>
    </div>
  );
};

// ── Welcome Popup — instant redirect, no delay ────────────────────────────────
const WelcomePopup = ({ name, role, branch, onDone }) => {
  const roleLabel = role?.charAt(0).toUpperCase() + role?.slice(1).toLowerCase() || "User";
  const roleColor =
    roleLabel === "Admin" || role?.toLowerCase() === "super admin" || role?.toLowerCase() === "super_admin"
      ? "#6366f1"
      : roleLabel === "Customer"
        ? "#16a34a"
        : "#2563eb";
  const roleBg =
    roleLabel === "Admin" || role?.toLowerCase() === "super admin" || role?.toLowerCase() === "super_admin"
      ? "#eef2ff"
      : roleLabel === "Customer"
        ? "#dcfce7"
        : "#dbeafe";
  const initial = name?.charAt(0)?.toUpperCase() || "?";
  const [phase, setPhase] = useState("enter");

  useEffect(() => {
    // Removed all delays — animate in briefly then redirect immediately
    const t1 = setTimeout(() => setPhase("show"), 30);
    const t2 = setTimeout(() => onDone?.(), 900); // ← was 2700ms, now 900ms
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const roleIcon =
  roleLabel === "Customer"
    ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
    : role?.toLowerCase() === "super admin" || role?.toLowerCase() === "super_admin" || roleLabel === "Admin"
      ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
      : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;

  const displayRole = role || "User";

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 99999,
      background: "rgba(0,0,0,0.55)",
      display: "flex", alignItems: "center", justifyContent: "center",
      backdropFilter: "blur(6px)",
      opacity: phase === "show" ? 1 : 0,
      transition: "opacity 0.25s ease",
    }}>
      <style>{`
        @keyframes welcomeSlideUp { from{opacity:0;transform:translateY(24px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes avatarPop  { 0%{transform:scale(0)} 70%{transform:scale(1.12)} 100%{transform:scale(1)} }
        @keyframes checkDraw  { from{stroke-dashoffset:60} to{stroke-dashoffset:0} }
        @keyframes ringPulse  { 0%{transform:scale(1);opacity:0.6} 100%{transform:scale(1.5);opacity:0} }
        @keyframes progressFill { from{width:0%} to{width:100%} }
      `}</style>

      <div style={{
        position: "relative", zIndex: 1, background: "#fff", borderRadius: 24,
        padding: "44px 40px 36px", maxWidth: 360, width: "100%", textAlign: "center",
        boxShadow: "0 32px 80px rgba(0,0,0,0.25)",
        animation: "welcomeSlideUp 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards",
      }}>
        <div style={{ position: "relative", width: 90, height: 90, margin: "0 auto 20px" }}>
          <div style={{ position: "absolute", inset: -8, borderRadius: "50%", border: `2px solid ${roleColor}`, animation: "ringPulse 1.4s ease-out infinite" }} />
          <div style={{ width: 90, height: 90, borderRadius: "50%", background: roleBg, border: `3px solid ${roleColor}30`, display: "flex", alignItems: "center", justifyContent: "center", animation: "avatarPop 0.4s cubic-bezier(0.34,1.56,0.64,1) 0.05s both" }}>
            <span style={{ fontSize: 36, fontWeight: 800, color: roleColor }}>{initial}</span>
          </div>
          <div style={{ position: "absolute", bottom: -2, right: -4, width: 28, height: 28, borderRadius: "50%", background: roleColor, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 2px 8px ${roleColor}55`, animation: "avatarPop 0.3s cubic-bezier(0.34,1.56,0.64,1) 0.2s both" }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <polyline points="2.5,7 5.5,10 11.5,4" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="60" strokeDashoffset="60" style={{ animation: "checkDraw 0.3s ease 0.3s forwards" }} />
            </svg>
          </div>
        </div>

        <p style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 4px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>Welcome back</p>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", margin: "0 0 6px", lineHeight: 1.2 }}>{name}</h2>

        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: roleBg, color: roleColor, borderRadius: 99, padding: "4px 12px", fontSize: 12, fontWeight: 700, marginBottom: branch ? 8 : 24 }}>
          {roleIcon} {displayRole}
        </span>

        {branch && (
          <div style={{ marginBottom: 24 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#f1f5f9", color: "#475569", borderRadius: 99, padding: "4px 12px", fontSize: 12, fontWeight: 700 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> {branch} Branch
            </span>
          </div>
        )}

        <div style={{ height: 3, borderRadius: 99, background: "#f1f5f9", overflow: "hidden" }}>
          <div style={{ height: "100%", borderRadius: 99, background: roleColor, animation: "progressFill 0.8s ease forwards" }} />
        </div>
        <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 10, marginBottom: 0 }}>Redirecting to your dashboard…</p>
      </div>
    </div>
  );
};

// ── Resolve redirect based on role ────────────────────────────────────────────
const resolveRedirect = (role) => {
  const r = (role || "").toLowerCase().replace(/\s+/g, "_");
  if (r === "customer") return "/customer/dashboard";
  return "/dashboard";
};

// ── Eye Icon — open ───────────────────────────────────────────────────────────
const EyeOpen = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

// ── Eye Icon — closed ─────────────────────────────────────────────────────────
const EyeOff = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

// ── Login ─────────────────────────────────────────────────────────────────────
const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null);
  const [welcome, setWelcome] = useState(null);
  // Track focus for input highlight
  const [focusedField, setFocusedField] = useState(null);
  const navigate = useNavigate();

  const showModal = useCallback((type, title, message) => setModal({ type, title, message }), []);
  const closeModal = useCallback(() => setModal(null), []);

  useEffect(() => {
    document.body.style.paddingTop = "0";
    return () => { document.body.style.paddingTop = "68px"; };
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      showModal("warning", "Missing Fields", "Please enter your email address and password.");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        showModal("danger", "Login Failed", error.message || "Invalid email or password. Please try again.");
        return;
      }

      const { user, session } = data;
      if (!user || !session) {
        showModal("danger", "Login Failed", "Session creation failed. Please try again.");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name, role, branch_id, status")
        .eq("id", user.id)
        .single();

      if (profile?.status && profile.status.toLowerCase() === "inactive") {
        await supabase.auth.signOut();
        showModal("danger", "Account Disabled", "Your account has been deactivated. Please contact the administrator.");
        return;
      }

      const role = profile?.role || user.user_metadata?.role || "Employee";
      const firstName = profile?.first_name || user.user_metadata?.first_name || "";
      const lastName = profile?.last_name || user.user_metadata?.last_name || "";
      const fullName = [firstName, lastName].filter(Boolean).join(" ") || email.split("@")[0];
      const branchId = profile?.branch_id ?? null;

      localStorage.setItem("user_role", role);

      let branchName = null;
      if (branchId) {
        const { data: branchRow } = await supabase
          .from("branches")
          .select("name")
          .eq("id", branchId)
          .single();
        branchName = branchRow?.name ?? null;
      }

      try {
        localStorage.setItem("sb_token", session.access_token);
        localStorage.setItem("sb_refresh_token", session.refresh_token || "");
        localStorage.setItem("sb_user", JSON.stringify(user));
        localStorage.setItem("hospital_jwt", session.access_token);
        if (branchName) localStorage.setItem("user_branch", branchName);
      } catch {
        console.warn("localStorage blocked — session held in memory only.");
      }

      const redirectTo = resolveRedirect(role);
      setWelcome({ name: fullName, role, branch: branchName, redirectTo });

    } catch (err) {
      console.error("Login error:", err);
      showModal("danger", "Login Failed", "Something went wrong. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  // ── Shared input wrapper style ─────────────────────────────────────────────
  const inputWrapStyle = (field) => ({
    position: "relative",
    display: "flex",
    alignItems: "center",
    width: "100%",
    border: `1.5px solid ${focusedField === field ? "#2563eb" : "#e2e8f0"}`,
    borderRadius: 10,
    background: "#fff",
    boxShadow: focusedField === field ? "0 0 0 3px rgba(37,99,235,0.1)" : "none",
    transition: "border-color 0.15s, box-shadow 0.15s",
    overflow: "hidden",
  });

  const inputStyle = {
    flex: 1,
    border: "none",
    outline: "none",
    background: "transparent",
    padding: "12px 14px",
    fontSize: 14,
    color: "#0f172a",
    fontFamily: "inherit",
    width: "100%",
    minWidth: 0,
  };

  const iconBtnStyle = {
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 40,
    height: "100%",
    minHeight: 44,
    background: "none",
    border: "none",
    borderLeft: "1.5px solid #f1f5f9",
    cursor: "pointer",
    color: "#94a3b8",
    padding: 0,
    transition: "color 0.15s, background 0.15s",
  };

  return (
    <>
      <AlertModal modal={modal} onClose={closeModal} />
      {welcome && (
        <WelcomePopup
          name={welcome.name}
          role={welcome.role}
          branch={welcome.branch}
          onDone={() => navigate(welcome.redirectTo)}
        />
      )}

      <div className="auth-screen login">
        <div className="auth-bg" />

        {/* ── Branding left ── */}
        <div className="auth-brand">
          <img
            src="/image/446805041_881106557364617_1125518808684788316_n.jpg"
            alt="Logo"
            style={{ width: 100, height: 100, borderRadius: "50%", border: "4px solid rgba(255,255,255,0.8)", objectFit: "cover", marginBottom: 20, boxShadow: "0 8px 24px rgba(0,0,0,0.3)" }}
          />
          <h1>Angeles Animal Care Hospital</h1>
          <p>Your pets deserve the best care</p>
        </div>

        {/* ── Form right ── */}
        <div className="auth-form-side">
          <div className="auth-form">

            <a
              href="/"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "#64748b", textDecoration: "none", marginBottom: 20, padding: "6px 10px", borderRadius: 8, background: "#f1f5f9", transition: "all .15s" }}
              onMouseEnter={e => { e.currentTarget.style.background = "#e2e8f0"; e.currentTarget.style.color = "#1e293b"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#f1f5f9"; e.currentTarget.style.color = "#64748b"; }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg> Back to Information System
            </a>

            <div className="auth-logo-row" style={{ marginBottom: 28 }}>
              <img src="/image/446805041_881106557364617_1125518808684788316_n.jpg" alt="Logo" className="logo-img" />
              <div className="logo-text">
                <h1>Angeles Animal Care Hospital</h1>
                <p>Multi-Branch System</p>
              </div>
            </div>

            <h2>Welcome Back!</h2>
            <p className="subtitle">Sign in to your account</p>

            {/* ── Email input ── */}
            <div className="input-group" style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 5 }}>
                Email address
              </label>
              <div style={inputWrapStyle("email")}>
                {/* Mail icon */}
                <span style={{ paddingLeft: 12, paddingRight: 4, color: "#94a3b8", display: "flex", alignItems: "center", flexShrink: 0 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </span>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField(null)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  required
                  autoComplete="email"
                  style={inputStyle}
                />
              </div>
            </div>

            {/* ── Password input ── */}
            <div className="input-group" style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 5 }}>
                Password
              </label>
              <div style={inputWrapStyle("password")}>
                {/* Lock icon */}
                <span style={{ paddingLeft: 12, paddingRight: 4, color: "#94a3b8", display: "flex", alignItems: "center", flexShrink: 0 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  required
                  autoComplete="current-password"
                  style={inputStyle}
                />
                {/* Show/hide toggle — outside the input, part of the wrapper */}
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  style={iconBtnStyle}
                  onMouseEnter={e => { e.currentTarget.style.color = "#2563eb"; e.currentTarget.style.background = "#f8fafc"; }}
                  onMouseLeave={e => { e.currentTarget.style.color = "#94a3b8"; e.currentTarget.style.background = "none"; }}
                >
                  {showPassword ? <EyeOff /> : <EyeOpen />}
                </button>
              </div>
            </div>

            <div className="input-group">
              <button type="button" onClick={handleLogin} disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </div>

            <p className="switch-text">
              Don't have an account? <Link to="/register">Register</Link>
            </p>

            <p className="switch-text" style={{ marginTop: 8 }}>
              <Link to="/" style={{ color: "#64748b", fontSize: 12 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> View branch information &amp; services
              </Link>
            </p>

            <p className="switch-text" style={{ marginTop: 4 }}>
              <Link to="/ai-assessment" style={{ color: "#6366f1", fontSize: 12, fontWeight: 700 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/><circle cx="12" cy="16" r="1" fill="currentColor"/></svg> Try AI Symptom Pre-Assessment (no login needed)
              </Link>
            </p>

          </div>
        </div>
      </div>
    </>
  );
};

export default Login;