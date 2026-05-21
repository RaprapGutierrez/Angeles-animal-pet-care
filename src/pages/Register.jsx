import React, { useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../js/supabase";
import "../styles/Loginregister.css";

// ── Alert Modal ───────────────────────────────────────────────────────────────
const AlertModal = ({ modal, onClose }) => {
  if (!modal) return null;
  const icons  = { danger: "❌", success: "✅", warning: "⚠️", info: "ℹ️" };
  const colors = { danger: "#dc3545", success: "#198754", warning: "#f59e0b", info: "#0dcaf0" };
  const color  = colors[modal.type] || "#0d6efd";
  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 99999, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "#fff", borderRadius: 16, overflow: "hidden", width: "100%", maxWidth: 420, boxShadow: "0 24px 64px rgba(0,0,0,0.3)" }}
      >
        <div style={{ background: color, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h5 style={{ margin: 0, fontWeight: 700, color: "#fff", fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}>
            <span>{icons[modal.type] || "ℹ️"}</span>
            {modal.title}
          </h5>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#fff", fontSize: 18, cursor: "pointer", lineHeight: 1, padding: 0 }}>✕</button>
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

// ── Register ──────────────────────────────────────────────────────────────────
const Register = () => {
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", password: "", confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [modal,   setModal]   = useState(null);
  const navigate = useNavigate();

  const showModal  = useCallback((type, title, message) => setModal({ type, title, message }), []);
  const closeModal = useCallback(() => setModal(null), []);
  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const passwordStrength = () => {
    const len = form.password.length;
    if (len === 0)  return null;
    if (len < 6)    return { label: "Too short",                             color: "#dc2626", width: "25%" };
    if (len < 10)   return { label: "Moderate — try adding numbers/symbols", color: "#f59e0b", width: "60%" };
    return           { label: "Strong password",                             color: "#16a34a", width: "100%" };
  };
  const strength = passwordStrength();

  const handleRegister = async () => {
    const { firstName, lastName, email, password, confirmPassword } = form;

    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      showModal("warning", "Missing Fields", "Please fill in all required fields.");
      return;
    }
    if (password.length < 6) {
      showModal("warning", "Weak Password", "Password must be at least 6 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      showModal("danger", "Password Mismatch", "Passwords do not match. Please try again.");
      return;
    }

    setLoading(true);
    try {
      // ── 1. Create auth user ───────────────────────────────────────────────
      const { data, error } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
        options: {
          data: {
            first_name: firstName.trim(),
            last_name:  lastName.trim(),
            role:       "customer",
          },
        },
      });

      if (error) {
        showModal("danger", "Registration Failed", error.message || "Could not create account. Please try again.");
        return;
      }

      const userId = data?.user?.id;

      // ── 2. Insert profile row (branch_id null = no branch yet for customers) ──
      // This is what useCurrentUser reads — keeping it in sync is critical.
      if (userId) {
        const { error: profileError } = await supabase.from("profiles").insert([{
          id:         userId,
          first_name: firstName.trim(),
          last_name:  lastName.trim(),
          email:      email.toLowerCase().trim(),
          role:       "customer",
          status:     "Active",
          branch_id:  null, // customers are not tied to a branch on registration
        }]);

        if (profileError) {
          // Profile insert failed — not fatal (trigger may handle it), just log
          console.warn("Profile insert warning:", profileError.message);
        }
      }

      // ── 3. Sign out immediately so the user verifies email first ──────────
      await supabase.auth.signOut();

      showModal(
        "success",
        "Account Created!",
        "Your account has been created successfully. Please check your email to verify your account, then sign in."
      );
      setTimeout(() => navigate("/login"), 3200);

    } catch (err) {
      console.error("Register error:", err);
      showModal("danger", "Registration Failed", "Something went wrong. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AlertModal modal={modal} onClose={closeModal} />

      <div className="auth-screen register">
        <div className="auth-bg" />

        {/* ── Branding right ── */}
        <div className="auth-brand">
          <img
            src="/image/446805041_881106557364617_1125518808684788316_n.jpg"
            alt="Logo"
            style={{ width: 100, height: 100, borderRadius: "50%", border: "4px solid rgba(255,255,255,0.8)", objectFit: "cover", marginBottom: 20, boxShadow: "0 8px 24px rgba(0,0,0,0.3)" }}
          />
          <h1>Angeles Animal Care Hospital</h1>
          <p>Create your account and get started</p>
        </div>

        {/* ── Form left ── */}
        <div className="auth-form-side">
          <div className="auth-form">

            <div className="auth-logo-row" style={{ marginBottom: 24 }}>
              <img src="/image/446805041_881106557364617_1125518808684788316_n.jpg" alt="Logo" className="logo-img" />
              <div className="logo-text">
                <h1>Angeles Animal Care Hospital</h1>
                <p>Multi-Branch System</p>
              </div>
            </div>

            <h2>Create Account</h2>
            <p className="subtitle">Fill in the details below to register</p>

            {/* Name row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div className="input-group">
                <input
                  type="text" placeholder="First name"
                  value={form.firstName} onChange={set("firstName")}
                  onKeyDown={e => e.key === "Enter" && handleRegister()} required
                />
              </div>
              <div className="input-group">
                <input
                  type="text" placeholder="Last name"
                  value={form.lastName} onChange={set("lastName")}
                  onKeyDown={e => e.key === "Enter" && handleRegister()} required
                />
              </div>
            </div>

            <div className="input-group">
              <input
                type="email" placeholder="Email address"
                value={form.email} onChange={set("email")}
                onKeyDown={e => e.key === "Enter" && handleRegister()} required
              />
            </div>

            <div className="input-group">
              <input
                type="password" placeholder="Password (min. 6 characters)"
                value={form.password} onChange={set("password")}
                onKeyDown={e => e.key === "Enter" && handleRegister()} required
              />
            </div>

            {/* Password strength bar */}
            {strength && (
              <div style={{ marginBottom: 10, marginTop: -6 }}>
                <div style={{ height: 4, borderRadius: 99, background: "#e2e8f0", overflow: "hidden", marginBottom: 4 }}>
                  <div style={{ height: "100%", borderRadius: 99, transition: "width 0.3s, background 0.3s", width: strength.width, background: strength.color }} />
                </div>
                <p style={{ fontSize: 10, fontWeight: 600, margin: 0, color: strength.color }}>{strength.label}</p>
              </div>
            )}

            <div className="input-group">
              <input
                type="password" placeholder="Confirm password"
                value={form.confirmPassword} onChange={set("confirmPassword")}
                onKeyDown={e => e.key === "Enter" && handleRegister()} required
              />
              {/* Password match indicator */}
              {form.confirmPassword && (
                <div style={{ marginTop: 6, fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 4, color: form.password === form.confirmPassword ? "#16a34a" : "#dc2626" }}>
                  <span>{form.password === form.confirmPassword ? "✅" : "❌"}</span>
                  {form.password === form.confirmPassword ? "Passwords match" : "Passwords do not match"}
                </div>
              )}
            </div>

            <div className="input-group" style={{ marginTop: 4 }}>
              <button type="button" onClick={handleRegister} disabled={loading}>
                {loading ? "Creating account..." : "Create Account"}
              </button>
            </div>

            <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", lineHeight: 1.5, marginBottom: 8 }}>
              By registering you agree to our terms of service and privacy policy.
            </p>

            <p className="switch-text">
              Already have an account? <Link to="/login">Sign In</Link>
            </p>

            <p className="switch-text" style={{ marginTop: 4 }}>
              <Link to="/ai-assessment" style={{ color: "#6366f1", fontSize: 12, fontWeight: 700 }}>
                🤖 Try AI Symptom Pre-Assessment (no login needed)
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Register;