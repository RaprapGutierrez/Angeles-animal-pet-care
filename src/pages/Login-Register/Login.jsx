import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../js/Utils/supabase";
import "../../styles/Loginregister.css";
import { logActivity } from '../../js/Utils/logActivity';

const getRole = () => {
  try {
    const token = localStorage.getItem('hospital_jwt');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      localStorage.removeItem('hospital_jwt');
      localStorage.removeItem('user_role');
      return null;
    }
    return localStorage.getItem('user_role') || null;
  } catch { return null; }
};

// ── Alert Modal ───────────────────────────────────────────────────────────────
const AlertModal = ({ modal, onClose }) => {
  if (!modal) return null;
  const icons = {
    danger: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
    success: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>,
    warning: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>,
    info: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>,
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
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
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
    const t1 = setTimeout(() => setPhase("show"), 10);
    const t2 = setTimeout(() => onDone?.(), 1200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const roleIcon =
    roleLabel === "Customer"
      ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
      : role?.toLowerCase() === "super admin" || role?.toLowerCase() === "super_admin" || roleLabel === "Admin"
        ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
        : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;

  const displayRole = role || "User";

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 99999,
      background: "rgba(0,0,0,0.55)",
      display: "flex", alignItems: "center", justifyContent: "center",
      backdropFilter: "blur(6px)",
      opacity: 1,
    }}>
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
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg> {branch} Branch
            </span>
          </div>
        )}

        <div style={{ height: 3, borderRadius: 99, background: "#f1f5f9", overflow: "hidden" }}>
          <div style={{ height: "100%", borderRadius: 99, background: roleColor, animation: "progressFill 1.2s ease forwards" }} />
        </div>
        <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 10, marginBottom: 0 }}>Taking you in…</p>
      </div>
    </div>
  );
};

// ── Generate a 6-digit 2FA code ───────────────────────────────────────────────
const generateOtpCode = () => String(Math.floor(100000 + Math.random() * 900000));

// ── Send a 6-digit code to the user's phone for 2FA ───────────────────────────
// Stores the code in `two_factor_codes` (user_id, phone, code, expires_at).
// Actually dispatching the SMS requires an SMS provider (e.g. Twilio) — wire
// that in where marked below.
const sendTwoFACode = async (userId, phone) => {
  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  const { error: deleteErr } = await supabase.from("two_factor_codes").delete().eq("user_id", userId);
  if (deleteErr) console.error("two_factor_codes delete failed:", deleteErr);

  const { error } = await supabase
    .from("two_factor_codes")
    .insert([{ user_id: userId, phone, code, expires_at: expiresAt }]);
  if (error) {
    console.error("two_factor_codes insert failed:", error);
    return { error };
  }

  try {
    // TODO: replace with your SMS provider call (e.g. Twilio)
    // await fetch('/api/send-sms', { method: 'POST', body: JSON.stringify({ phone, code }) });
    console.log(`2FA code for ${phone}: ${code}`); // remove in production
  } catch (smsErr) {
    console.error("SMS send failed:", smsErr);
  }
  return { error: null };
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

// ── OTP-style digit input row ─────────────────────────────────────────────────
const OtpBoxes = React.forwardRef(({ length, value, onChange, autoFocus, onComplete, status = "default", disabled }, ref) => {
  const inputsRef = React.useRef([]);
  const digits = value.split("").concat(Array(length).fill("")).slice(0, length);

  React.useImperativeHandle(ref, () => ({
    focusFirst: () => inputsRef.current[0]?.focus(),
  }));

  const setDigit = (idx, char) => {
    const next = digits.slice();
    next[idx] = char;
    const joined = next.join("").replace(/\s+$/, "");
    onChange(joined);
    if (next.every((d) => d !== "") && next.join("").length === length) {
      onComplete?.(next.join(""));
    }
  };

  const handleChange = (idx, raw) => {
    const char = raw.replace(/\D/g, "").slice(-1);
    setDigit(idx, char);
    if (char && idx < length - 1) inputsRef.current[idx + 1]?.focus();
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === "Backspace") {
      if (digits[idx]) {
        setDigit(idx, "");
      } else if (idx > 0) {
        inputsRef.current[idx - 1]?.focus();
        setDigit(idx - 1, "");
      }
    } else if (e.key === "ArrowLeft" && idx > 0) {
      inputsRef.current[idx - 1]?.focus();
    } else if (e.key === "ArrowRight" && idx < length - 1) {
      inputsRef.current[idx + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;
    onChange(pasted);
    if (pasted.length === length) onComplete?.(pasted);
    const focusIdx = Math.min(pasted.length, length - 1);
    setTimeout(() => inputsRef.current[focusIdx]?.focus(), 0);
  };

  const borderColor = status === "success" ? "#198754" : status === "error" ? "#dc3545" : null;
  const [poppedIdx, setPoppedIdx] = React.useState(null);

  React.useEffect(() => {
    if (status === "success") {
      const t = setTimeout(() => setPoppedIdx(null), 400);
      return () => clearTimeout(t);
    }
  }, [status]);

  const rowAnim = status === "error" ? "pinShake 0.4s ease" : status === "success" ? "pinSuccessPulse 0.4s ease" : "none";

  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "center", animation: rowAnim }} onPaste={handlePaste}>
      {digits.map((d, idx) => (
        <input
          key={idx}
          ref={(el) => (inputsRef.current[idx] = el)}
          type="password"
          inputMode="numeric"
          maxLength={1}
          autoFocus={autoFocus && idx === 0}
          value={d}
          disabled={disabled}
          onChange={(e) => {
            const hadValue = !!digits[idx];
            handleChange(idx, e.target.value);
            if (!hadValue && e.target.value) {
              setPoppedIdx(idx);
              setTimeout(() => setPoppedIdx((cur) => (cur === idx ? null : cur)), 200);
            }
          }}
          onKeyDown={(e) => handleKeyDown(idx, e)}
          style={{
            width: 42,
            height: 50,
            textAlign: "center",
            fontSize: 20,
            fontWeight: 700,
            border: `1.5px solid ${borderColor || (d ? "#05328A" : "#e2e8f0")}`,
            borderRadius: 10,
            outline: "none",
            color: borderColor || "#0f172a",
            background: status === "success" ? "#f0fdf4" : status === "error" ? "#fef2f2" : "#fff",
            boxShadow: d && !borderColor ? "0 0 0 3px rgba(5,50,138,0.1)" : "none",
            transition: "border-color .15s, box-shadow .15s, background .15s",
            animation: poppedIdx === idx ? "pinDigitPop 0.2s ease" : "none",
          }}
        />
      ))}
    </div>
  );
});

// ── 2FA Modal (asks for phone first if missing, then verifies SMS code) ──────
const TwoFAModal = ({ step, phone, otp, error, success, sending, onChangePhone, onChangeOtp, onSubmitPhone, onSubmitOtp, onResend, onCancel, closing }) => {
  const isPhoneStep = step === "phone";
  const otpLength = 6;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 99999, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, animation: closing ? "pinOverlayOut 0.25s ease forwards" : "pinOverlayIn 0.2s ease" }}>
      <div style={{ background: "#fff", borderRadius: 16, overflow: "hidden", width: "100%", maxWidth: 380, boxShadow: "0 24px 64px rgba(0,0,0,0.3)", animation: closing ? "pinModalOut 0.25s cubic-bezier(0.4,0,1,1) forwards" : "pinModalIn 0.3s cubic-bezier(0.34,1.56,0.64,1)" }}>
        <div style={{ background: success ? "#198754" : "#05328A", padding: "16px 20px", transition: "background .2s" }}>
          <h5 style={{ margin: 0, fontWeight: 700, color: "#fff", fontSize: 15 }}>
            {success ? "Verified" : isPhoneStep ? "Add your phone number" : "Enter verification code"}
          </h5>
        </div>
        <div style={{ padding: "24px" }}>
          <p style={{ margin: "0 0 16px", fontSize: 13, color: "#475569", textAlign: "center" }}>
            {success
              ? "Signing you in…"
              : isPhoneStep
                ? "We need a phone number on file to send you a 2FA code for future logins."
                : `Enter the 6-digit code sent to ${phone}.`}
          </p>

          {isPhoneStep ? (
            <input
              type="tel"
              placeholder="+63 9XX XXX XXXX"
              value={phone}
              disabled={sending}
              onChange={(e) => onChangePhone(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSubmitPhone()}
              style={{ width: "100%", boxSizing: "border-box", padding: "10px 14px", fontSize: 14, border: `1.5px solid ${error ? "#dc3545" : "#e2e8f0"}`, borderRadius: 10, outline: "none", fontFamily: "inherit" }}
            />
          ) : (
            <OtpBoxes
              length={otpLength}
              value={otp}
              onChange={onChangeOtp}
              autoFocus
              disabled={success || sending}
              status={success ? "success" : error ? "error" : "default"}
              onComplete={onSubmitOtp}
            />
          )}

          {error && <p style={{ color: "#dc3545", fontSize: 12, margin: "16px 0 0", textAlign: "center" }}>{error}</p>}

          {!isPhoneStep && !success && (
            <p style={{ margin: "14px 0 0", fontSize: 12, color: "#94a3b8", textAlign: "center" }}>
              Didn't get a code?{" "}
              <button type="button" onClick={onResend} disabled={sending} style={{ background: "none", border: "none", color: "#2563eb", fontWeight: 700, cursor: "pointer", fontSize: 12, padding: 0 }}>
                Resend
              </button>
            </p>
          )}
        </div>
        {!success && (
          <div style={{ padding: "0 24px 24px", display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button onClick={onCancel} style={{ background: "#f1f5f9", color: "#475569", border: "none", borderRadius: 8, padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
            <button onClick={isPhoneStep ? onSubmitPhone : onSubmitOtp} disabled={sending} style={{ background: "#05328A", color: "#fff", border: "none", borderRadius: 8, padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              {sending ? "Please wait…" : isPhoneStep ? "Send Code" : "Verify"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

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
  const [twoFAStep, setTwoFAStep] = useState(null); // null | "phone" | "verify"
  const [phoneValue, setPhoneValue] = useState("");
  const [otpValue, setOtpValue] = useState("");
  const [twoFAError, setTwoFAError] = useState("");
  const [twoFASuccess, setTwoFASuccess] = useState(false);
  const [twoFAClosing, setTwoFAClosing] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [pendingSession, setPendingSession] = useState(null);

  const closeTwoFAModal = useCallback(() => {
    setTwoFAClosing(true);
    setTimeout(() => {
      setTwoFAStep(null);
      setTwoFAClosing(false);
    }, 250);
  }, []);
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
        .select("first_name, last_name, role, branch_id, status, phone")
        .eq("id", user.id)
        .single();

      // ── Auto-set status to Active on login ──
      await supabase
        .from("profiles")
        .update({ status: "Active" })
        .eq("id", user.id);

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

      // ── 2FA temporarily disabled ──────────────────────────────────────────
      // setPendingSession({ user, session, profile, role, fullName, branchName });
      // setOtpValue("");
      // setTwoFAError("");

      // if (profile?.phone) {
      //   setPhoneValue(profile.phone);
      //   setSendingCode(true);
      //   const { error: sendErr } = await sendTwoFACode(user.id, profile.phone);
      //   setSendingCode(false);
      //   if (sendErr) {
      //     showModal("danger", "Error", "Could not send verification code. Please try again.");
      //     return;
      //   }
      //   setTwoFAStep("verify");
      // } else {
      //   setPhoneValue("");
      //   setTwoFAStep("phone");
      // }

      await completeLogin(user, session, role, fullName, branchName);

    } catch (err) {
      console.error("Login error:", err);
      showModal("danger", "Login Failed", "Something went wrong. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const completeLogin = async (user, session, role, fullName, branchName) => {
    await logActivity(
      { id: user.id, fullName: fullName, email: email, role: role },
      'Login',
      'User logged in successfully'
    );

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
  };

  const handlePhoneSubmit = async () => {
    if (!pendingSession) return;
    const cleaned = phoneValue.trim();
    if (!/^\+?[0-9]{10,15}$/.test(cleaned)) {
      setTwoFAError("Please enter a valid phone number.");
      return;
    }
    setTwoFAError("");
    setSendingCode(true);
    const { user } = pendingSession;

    const { error: updateErr } = await supabase
      .from("profiles")
      .update({ phone: cleaned })
      .eq("id", user.id);
    if (updateErr) {
      setSendingCode(false);
      setTwoFAError("Could not save phone number. Please try again.");
      return;
    }

    const { error: sendErr } = await sendTwoFACode(user.id, cleaned);
    setSendingCode(false);
    if (sendErr) {
      setTwoFAError(`Could not send verification code: ${sendErr.message || sendErr.details || "unknown error"}`);
      return;
    }
    setOtpValue("");
    setTwoFAStep("verify");
  };

  const handleOtpSubmit = async () => {
    if (!pendingSession || twoFASuccess) return;
    const { user, session, role, fullName, branchName } = pendingSession;
    setTwoFAError("");

    if (otpValue.length !== 6) {
      setTwoFAError("Enter the 6-digit code.");
      return;
    }

    const { data: codeRow, error: fetchErr } = await supabase
      .from("two_factor_codes")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (fetchErr || !codeRow || codeRow.code !== otpValue || new Date(codeRow.expires_at) < new Date()) {
      setTwoFAError("Incorrect or expired code. Please try again.");
      setOtpValue("");
      return;
    }

    await supabase.from("two_factor_codes").delete().eq("user_id", user.id);

    // Correct code — show success state briefly, then animate out and finish logging in
    setTwoFASuccess(true);
    setTimeout(() => {
      setTwoFAClosing(true);
    }, 500);
    setTimeout(async () => {
      setTwoFAStep(null);
      setTwoFAClosing(false);
      setOtpValue("");
      setPhoneValue("");
      setTwoFAError("");
      setTwoFASuccess(false);
      setPendingSession(null);
      await completeLogin(user, session, role, fullName, branchName);
    }, 750);
  };

  const handleResendCode = async () => {
    if (!pendingSession) return;
    const { user } = pendingSession;
    setSendingCode(true);
    const { error } = await sendTwoFACode(user.id, phoneValue);
    setSendingCode(false);
    if (error) {
      setTwoFAError("Could not resend code. Please try again.");
    } else {
      setTwoFAError("");
      showModal("info", "Code Sent", "A new verification code has been sent to your phone.");
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
      {twoFAStep && (
        <TwoFAModal
          step={twoFAStep}
          phone={phoneValue}
          otp={otpValue}
          error={twoFAError}
          success={twoFASuccess}
          sending={sendingCode}
          closing={twoFAClosing}
          onChangePhone={setPhoneValue}
          onChangeOtp={setOtpValue}
          onSubmitPhone={handlePhoneSubmit}
          onSubmitOtp={handleOtpSubmit}
          onResend={handleResendCode}
          onCancel={() => { closeTwoFAModal(); setPendingSession(null); setPhoneValue(""); setOtpValue(""); setTwoFAError(""); }}
        />
      )}

      <div className="auth-screen login" style={{ minHeight: "100vh", minWidth: "100vw" }}>
        <div className="auth-bg" style={{ backgroundImage: "url('/image/bg.jpg')" }} />

        {/* ── Branding left ── */}
        <div className="auth-brand auth-brand-pos">
          <img
            src="/image/446805041_881106557364617_1125518808684788316_n.jpg"
            alt="Logo"
            className="auth-brand-logo"
          />
          <h1 style={{ color: "#ffffff", fontSize: 32, fontWeight: 400, fontFamily: "'Poetsen One', sans-serif", margin: "0 0 8px", WebkitTextStroke: "7px #4f46e5", paintOrder: "stroke fill" }}>Angeles Animal Pet Care</h1>
          <p className="auth-brand-subtitle">Your pets deserve the best care</p>
        </div>

        {/* ── Form right ── */}
        <div className="login-form-wrapper" style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "flex-end", padding: "24px 48px", zIndex: 10 }}>
          <div className="auth-form" style={{ maxWidth: 400, width: "100%", borderRadius: 20, boxShadow: "0 8px 48px rgba(0,0,0,0.18)", padding: "32px 32px 24px", background: "#fff", maxHeight: "95vh", overflowY: "auto" }}>

            <a
              href="/"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "#05328A", textDecoration: "none", marginBottom: 20, padding: "6px 10px", borderRadius: 8, background: "#f1f5f9", transition: "all .15s", fontFamily: "'Poetsen One', sans-serif", WebkitTextStroke: "3px #fff", paintOrder: "stroke fill" }}
              onMouseEnter={e => { e.currentTarget.style.background = "#e2e8f0"; e.currentTarget.style.color = "#1e293b"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#f1f5f9"; e.currentTarget.style.color = "#64748b"; }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg> Back to Information System
            </a>

            <div className="auth-logo-row" style={{ marginBottom: 28 }}>
              <img src="/image/446805041_881106557364617_1125518808684788316_n.jpg" alt="Logo" className="logo-img" />
              <div className="logo-text">
                <h1 style={{ fontFamily: "'Poetsen One', sans-serif", color: "#fff", WebkitTextStroke: "4px #05328A", paintOrder: "stroke fill" }}>Angeles Animal Pet Care</h1>
                <p style={{ fontFamily: "'Poetsen One', sans-serif" }}>Multi-Branch System</p>
              </div>
            </div>

            <h2 className="auth-heading-stroke">Hello Welcome!</h2>
            <p className="subtitle" style={{ fontFamily: "'Poetsen One', sans-serif" }}>Sign in to your account</p>

            {/* ── Email input ── */}
            <div className="input-group" style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#05328A", marginBottom: 5, fontFamily: "'Poetsen One', sans-serif" }}>
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
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#05328A", marginBottom: 5, fontFamily: "'Poetsen One', sans-serif" }}>
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
              <button type="button" onClick={handleLogin} disabled={loading} className="auth-btn-text-stroke">
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </div>

            <p className="switch-text" style={{ fontFamily: "'Poetsen One', sans-serif" }}>
              Don't have an account? <Link to="/register">Register</Link>
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
              <Link to="/ai-assessment" className="ai-assessment-link">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /><circle cx="12" cy="16" r="1" fill="currentColor" /></svg>
                Try AI Symptom Pre-Assessment (no login needed)
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;