import React, { useState, useCallback, useEffect } from "react";
import ReactDOM from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../js/Utils/supabase";
import "../../styles/Loginregister.css";

// ── Alert Modal ───────────────────────────────────────────────────────────────
const AlertModal = ({ modal, onClose }) => {
  if (!modal) return null;
  const icons = { danger: "❌", success: "✅", warning: "⚠️", info: "ℹ️" };
  const colors = {
    danger: "#dc3545",
    success: "#198754",
    warning: "#f59e0b",
    info: "#0dcaf0",
  };
  const color = colors[modal.type] || "#0d6efd";
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 16,
          overflow: "hidden",
          width: "100%",
          maxWidth: 420,
          boxShadow: "0 24px 64px rgba(0,0,0,0.3)",
        }}
      >
        <div
          style={{
            background: color,
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h5
            style={{
              margin: 0,
              fontWeight: 700,
              color: "#fff",
              fontSize: 15,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span>{icons[modal.type] || "ℹ️"}</span>
            {modal.title}
          </h5>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#fff",
              fontSize: 18,
              cursor: "pointer",
              lineHeight: 1,
              padding: 0,
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ padding: "24px 24px 16px", textAlign: "center" }}>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              color: "#374151",
              lineHeight: 1.6,
            }}
          >
            {modal.message}
          </p>
        </div>
        <div
          style={{
            padding: "0 24px 24px",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <button
            onClick={onClose}
            style={{
              background: color,
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "10px 40px",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Custom dropdown (matches Admin & Security) ─────────────────────────────
const CustomSelect = ({
  value,
  onChange,
  options,
  placeholder = "—",
  accent = "#05328A",
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
      setDropPos({
        top: showAbove
          ? rect.top + window.scrollY - dropHeight - 6
          : rect.bottom + window.scrollY + 6,
        left: rect.left + window.scrollX,
        width: rect.width,
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
              background: "#fff",
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
                    color: isSelected ? accent : "#0f172a",
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
                      e.currentTarget.style.background = "transparent";
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
          padding: "12px 34px 12px 12px",
          border: "1.5px solid",
          borderRadius: 10,
          background: open
            ? "linear-gradient(135deg, #ffffff 0%, #f5f3ff 100%)"
            : "#fff",
          fontSize: 13,
          fontWeight: 600,
          color: value ? "#0f172a" : "#94a3b8",
          cursor: "pointer",
          userSelect: "none",
          boxSizing: "border-box",
          boxShadow: open ? `0 0 0 3px ${accent}22` : "none",
          borderColor: open ? accent : "#e2e8f0",
          transition: "border-color 0.18s, box-shadow 0.18s",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          minHeight: 42,
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
              transition: "transform 0.2s",
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

// ── Register ──────────────────────────────────────────────────────────────────
const Register = () => {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    sex: "Male",
    branchId: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null);
  const [step, setStep] = useState(1);
  const navigate = useNavigate();

  useEffect(() => {
    document.body.style.paddingTop = "0";
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.paddingTop = "68px";
      document.body.style.overflow = "";
    };
  }, []);

  // NOTE: this branches fetch was previously duplicated as two identical
  // useEffect hooks (firing the same query twice on mount). Removed the
  // duplicate — this single effect is all that's needed.
  useEffect(() => {
    supabase
      .from("branches")
      .select("id, name")
      .order("name")
      .then(({ data }) => setBranches(data || []));
  }, []);

  const showModal = useCallback(
    (type, title, message) => setModal({ type, title, message }),
    [],
  );
  const closeModal = useCallback(() => setModal(null), []);
  const sanitizeName = (v) => v.replace(/[^a-zA-Z\s'-]/g, "");
  const sanitizePhone = (v) => v.replace(/[^0-9]/g, "").slice(0, 11);
  const set = (field) => (e) => {
    let value = e.target.value;
    if (field === "firstName" || field === "lastName")
      value = sanitizeName(value);
    if (field === "phoneNumber") value = sanitizePhone(value);
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleNextStep = () => {
    if (step === 1) {
      const { firstName, lastName, phoneNumber } = form;
      if (!firstName || !lastName || !phoneNumber) {
        showModal(
          "warning",
          "Missing Fields",
          "Please fill in your first name, last name, and contact number.",
        );
        return;
      }
      if (!/^[0-9]{11}$/.test(phoneNumber)) {
        showModal(
          "warning",
          "Invalid Contact Number",
          "Please Enter an 11-digit contact number.",
        );
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!form.branchId) {
        showModal(
          "warning",
          "Missing Branch",
          "Please select your preferred branch.",
        );
        return;
      }
      setStep(3);
    } else if (step === 3) {
      if (!form.email) {
        showModal(
          "warning",
          "Missing Email",
          "Please enter your email address.",
        );
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
        showModal(
          "warning",
          "Invalid Email",
          "Please enter a valid email address.",
        );
        return;
      }
      setStep(4);
    }
  };

  const handleBack = () => setStep((s) => Math.max(1, s - 1));

  const passwordStrength = () => {
    const p = form.password;
    if (!p) return null;
    const hasUpper = /[A-Z]/.test(p);
    const hasLower = /[a-z]/.test(p);
    const hasNumber = /[0-9]/.test(p);
    const hasSymbol = /[^A-Za-z0-9]/.test(p);
    const score = [
      p.length >= 8,
      hasUpper,
      hasLower,
      hasNumber,
      hasSymbol,
    ].filter(Boolean).length;
    if (score <= 1)
      return {
        label: "Too weak — add uppercase, numbers & symbols",
        color: "#dc2626",
        width: "20%",
        score,
      };
    if (score === 2)
      return {
        label: "Weak — needs more variety",
        color: "#f97316",
        width: "40%",
        score,
      };
    if (score === 3)
      return {
        label: "Fair — add symbols or uppercase",
        color: "#f59e0b",
        width: "60%",
        score,
      };
    if (score === 4)
      return {
        label: "Good — almost there!",
        color: "#84cc16",
        width: "80%",
        score,
      };
    return {
      label: "Strong password ✓",
      color: "#16a34a",
      width: "100%",
      score,
    };
  };
  const strength = passwordStrength();

  const handleRegister = async () => {
    const {
      firstName,
      lastName,
      phoneNumber,
      sex,
      branchId,
      email,
      password,
      confirmPassword,
    } = form;

    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      showModal(
        "warning",
        "Missing Fields",
        "Please fill in all required fields.",
      );
      return;
    }
    if (!branchId) {
      showModal(
        "warning",
        "Missing Branch",
        "Please go back and select your preferred branch.",
      );
      return;
    }
    if (password.length < 8) {
      showModal(
        "warning",
        "Weak Password",
        "Password must be at least 8 characters long.",
      );
      return;
    }
    if (!/[A-Z]/.test(password)) {
      showModal(
        "warning",
        "Weak Password",
        "Password must contain at least one uppercase letter (A–Z).",
      );
      return;
    }
    if (!/[0-9]/.test(password)) {
      showModal(
        "warning",
        "Weak Password",
        "Password must contain at least one number (0–9).",
      );
      return;
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      showModal(
        "warning",
        "Weak Password",
        "Password must contain at least one symbol (e.g. @, #, !, $).",
      );
      return;
    }
    if (password !== confirmPassword) {
      showModal(
        "danger",
        "Password Mismatch",
        "Passwords do not match. Please try again.",
      );
      return;
    }

    setLoading(true);
    try {
      const selectedBranch = branches.find(
        (b) => String(b.id) === String(branchId),
      );

      // Create a REAL, login-capable Supabase Auth account immediately —
      // no admin approval step for self-registered customers.
      const { data: signUpData, error: signUpError } =
        await supabase.auth.signUp({
          email: email.toLowerCase().trim(),
          password,
          options: {
            data: {
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              phone_number: phoneNumber.trim(),
              sex,
              role: "Customer",
              branch_id: branchId,
              branch: selectedBranch ? `${selectedBranch.name} Branch` : null,
            },
          },
        });

      if (signUpError) {
        showModal(
          "danger",
          "Registration Failed",
          signUpError.message ||
            "Could not create your account. Please try again.",
        );
        return;
      }

      const userId = signUpData?.user?.id;

      // Mirror the profile into your own "users" table so the rest of the
      // app (admin views, bookings, etc.) can query it like before.
      // NEW
      if (userId) {
        const { error: profileError } = await supabase.from("profiles").upsert(
          [
            {
              id: userId,
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              email: email.toLowerCase().trim(),
              phone_number: phoneNumber.trim(),
              sex,
              role: "Customer",
              branch_id: branchId || null,
              branch: selectedBranch ? `${selectedBranch.name} Branch` : null,
              status: "active",
            },
          ],
          { onConflict: "id", ignoreDuplicates: false },
        );

        if (profileError) {
          console.error("Profile upsert error:", profileError);
          showModal(
            "warning",
            "Account Created",
            "Your account was created, but some profile details couldn't be saved. You can update them later.",
          );
        }
      }

      // signUp() only returns a session if "Confirm email" is OFF in
      // Supabase Auth settings. If it didn't come back, explicitly sign
      // the user in right now so the account is usable immediately.
      let session = signUpData?.session;
      if (!session) {
        const { data: signInData, error: signInError } =
          await supabase.auth.signInWithPassword({
            email: email.toLowerCase().trim(),
            password,
          });
        if (!signInError) {
          session = signInData?.session;
        }
      }

      if (session) {
        showModal(
          "success",
          "Welcome!",
          "Your account has been created and you're now signed in.",
        );
        setTimeout(() => navigate("/dashboard"), 1600); // adjust to your customer landing route
      } else {
        // This only happens if Supabase still requires email confirmation.
        // Turn OFF "Confirm email" in Supabase Dashboard → Authentication
        // → Sign In / Providers → Email, so signup logs users in instantly.
        showModal(
          "warning",
          "Account Created",
          "Your account was created but couldn't be signed in automatically. Please check your Supabase email confirmation settings, or verify your email and sign in manually.",
        );
        setTimeout(() => navigate("/login"), 3200);
      }
    } catch (err) {
      console.error("Register error:", err);
      showModal(
        "danger",
        "Registration Failed",
        "Something went wrong. Please try again later.",
      );
    } finally {
      setLoading(false);
    }
  };
  return (
    <>
      <AlertModal modal={modal} onClose={closeModal} />

      <div
        className="auth-screen register"
        style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh" }}
      >
        <div
          className="auth-bg"
          style={{
            backgroundColor: "#0f172a",
            backgroundImage: `
            radial-gradient(circle at 18% 12%, rgba(99,102,241,0.10) 0%, transparent 45%),
            radial-gradient(circle at 88% 88%, rgba(30,58,138,0.10) 0%, transparent 50%),
            radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px),
            url('/image/bg.png')
          `,
            backgroundSize: "auto, auto, 28px 28px, cover",
            backgroundPosition: "center, center, center, center",
            backgroundRepeat: "no-repeat, no-repeat, repeat, no-repeat",
          }}
        />

        {/* ── Branding right ── */}
        <div
          className="auth-brand auth-brand-pos-right"
          style={{
            background: "rgba(255,255,255,0.08)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(255,255,255,0.18)",
            borderRadius: 20,
            padding: "20px 28px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
            width: "fit-content",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <img
            src="/image/446805041_881106557364617_1125518808684788316_n.jpg"
            alt="Logo"
            className="auth-brand-logo"
          />
          <h1
            style={{
              color: "#ffffff",
              fontSize: 32,
              fontWeight: 400,
              fontFamily: "'Poetsen One', sans-serif",
              margin: "0 0 8px",
              WebkitTextStroke: "7px #4f46e5",
              paintOrder: "stroke fill",
            }}
          >
            Angeles Animal Pet Care
          </h1>
          <p className="auth-brand-subtitle">
            Create your account and get started
          </p>
        </div>

        {/* ── Form left ── */}
        <div
          className="auth-form-wrapper"
          style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
            padding: "24px 48px",
            pointerEvents: "none",
            overflowY: "auto",
          }}
        >
          <div
            className="auth-form"
            style={{
              maxWidth: 400,
              width: "100%",
              borderRadius: 20,
              boxShadow: "0 8px 48px rgba(0,0,0,0.18)",
              padding: "24px 28px 20px",
              background: "#fff",
              pointerEvents: "all",
              maxHeight: "100vh",
              overflowY: "auto",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            <div className="auth-logo-row" style={{ marginBottom: 24 }}>
              <img
                src="/image/446805041_881106557364617_1125518808684788316_n.jpg"
                alt="Logo"
                className="logo-img"
              />
              <div className="logo-text">
                <h1>Angeles Animal Pet Care</h1>
                <p>Multi-Branch System</p>
              </div>
            </div>

            <h2 className="auth-heading-stroke">Create Account</h2>
            <p
              className="subtitle"
              style={{ fontFamily: "'Poetsen One', sans-serif" }}
            >
              Fill in the details below to register
            </p>

            {/* Step indicator */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 18,
              }}
            >
              {[1, 2, 3, 4].map((s) => (
                <React.Fragment key={s}>
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      fontWeight: 700,
                      background: step >= s ? "#05328A" : "#e2e8f0",
                      color: step >= s ? "#fff" : "#94a3b8",
                      fontFamily: "'Poetsen One', sans-serif",
                      flexShrink: 0,
                    }}
                  >
                    {step > s ? "✓" : s}
                  </div>
                  {s < 4 && (
                    <div
                      style={{
                        flex: 1,
                        height: 3,
                        borderRadius: 99,
                        background: step > s ? "#05328A" : "#e2e8f0",
                      }}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>

            {step === 1 && (
              <>
                {/* Name row */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                    gap: 10,
                    marginBottom: 14,
                  }}
                >
                  <div className="float-group">
                    <input
                      type="text"
                      placeholder=" "
                      value={form.firstName}
                      onChange={set("firstName")}
                      onKeyDown={(e) => e.key === "Enter" && handleNextStep()}
                      required
                    />
                    <label>First name</label>
                  </div>
                  <div className="float-group">
                    <input
                      type="text"
                      placeholder=" "
                      value={form.lastName}
                      onChange={set("lastName")}
                      onKeyDown={(e) => e.key === "Enter" && handleNextStep()}
                      required
                    />
                    <label>Last name</label>
                  </div>
                </div>

                <div className="float-group">
                  <input
                    type="tel"
                    placeholder=" "
                    value={form.phoneNumber}
                    onChange={set("phoneNumber")}
                    onKeyDown={(e) => e.key === "Enter" && handleNextStep()}
                    maxLength={11}
                    inputMode="numeric"
                    required
                  />
                  <label>Contact number</label>
                </div>

                <div className="input-group" style={{ marginTop: 4 }}>
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="auth-btn-text-stroke"
                  >
                    Next
                  </button>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 10,
                    marginBottom: 14,
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#94a3b8",
                        marginBottom: 5,
                      }}
                    >
                      Sex
                    </label>
                    <CustomSelect
                      value={form.sex}
                      onChange={(val) =>
                        setForm((prev) => ({ ...prev, sex: val }))
                      }
                      placeholder="Select sex"
                      accent="#05328A"
                      options={["Male", "Female"]}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#94a3b8",
                        marginBottom: 5,
                      }}
                    >
                      Preferred branch
                    </label>
                    <CustomSelect
                      value={form.branchId}
                      onChange={(val) =>
                        setForm((prev) => ({ ...prev, branchId: val }))
                      }
                      placeholder="Select branch"
                      accent="#05328A"
                      options={branches.map((b) => ({
                        value: b.id,
                        label: b.name,
                      }))}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                  <button
                    type="button"
                    onClick={handleBack}
                    style={{
                      flex: 1,
                      fontFamily: "'Poetsen One', sans-serif",
                      background: "#e2e8f0",
                      color: "#334155",
                      border: "none",
                      borderRadius: 10,
                      padding: "12px 0",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="auth-btn-text-stroke"
                    style={{ flex: 2 }}
                  >
                    Next
                  </button>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div className="float-group">
                  <input
                    type="text"
                    placeholder=" "
                    value={form.email}
                    onChange={set("email")}
                    onKeyDown={(e) => e.key === "Enter" && handleNextStep()}
                    required
                  />
                  <label>Email address</label>
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                  <button
                    type="button"
                    onClick={handleBack}
                    style={{
                      flex: 1,
                      fontFamily: "'Poetsen One', sans-serif",
                      background: "#e2e8f0",
                      color: "#334155",
                      border: "none",
                      borderRadius: 10,
                      padding: "12px 0",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="auth-btn-text-stroke"
                    style={{ flex: 2 }}
                  >
                    Next
                  </button>
                </div>
              </>
            )}

            {step === 4 && (
              <>
                <div className="float-group">
                  <input
                    type="password"
                    placeholder=" "
                    value={form.password}
                    onChange={set("password")}
                    onKeyDown={(e) => e.key === "Enter" && handleRegister()}
                    required
                  />
                  <label>Password</label>
                </div>

                {/* Password strength bar + requirements — only appears once the user starts typing */}
                {strength && (
                  <div style={{ marginBottom: 10, marginTop: -6 }}>
                    <div style={{ display: "flex", gap: 4, marginBottom: 5 }}>
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          style={{
                            flex: 1,
                            height: 4,
                            borderRadius: 99,
                            background:
                              i <= strength.score ? strength.color : "#e2e8f0",
                            transition: "background 0.3s",
                          }}
                        />
                      ))}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 4,
                        marginBottom: 4,
                      }}
                    >
                      {[
                        { label: "8+ chars", ok: form.password.length >= 8 },
                        { label: "Uppercase", ok: /[A-Z]/.test(form.password) },
                        { label: "Lowercase", ok: /[a-z]/.test(form.password) },
                        { label: "Number", ok: /[0-9]/.test(form.password) },
                        {
                          label: "Symbol",
                          ok: /[^A-Za-z0-9]/.test(form.password),
                        },
                      ].map((r) => (
                        <span
                          key={r.label}
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            padding: "2px 7px",
                            borderRadius: 99,
                            background: r.ok ? "#dcfce7" : "#f1f5f9",
                            color: r.ok ? "#16a34a" : "#94a3b8",
                          }}
                        >
                          {r.ok ? "✓" : "·"} {r.label}
                        </span>
                      ))}
                    </div>
                    <p
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        margin: 0,
                        color: strength.color,
                      }}
                    >
                      {strength.label}
                    </p>
                  </div>
                )}

                <div className="float-group">
                  <input
                    type="password"
                    placeholder=" "
                    value={form.confirmPassword}
                    onChange={set("confirmPassword")}
                    onKeyDown={(e) => e.key === "Enter" && handleRegister()}
                    required
                  />
                  <label>Confirm password</label>
                  {form.confirmPassword && (
                    <div
                      style={{
                        marginTop: 6,
                        fontSize: 11,
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        color:
                          form.password === form.confirmPassword
                            ? "#16a34a"
                            : "#dc2626",
                      }}
                    >
                      <span>
                        {form.password === form.confirmPassword ? "✅" : "❌"}
                      </span>
                      {form.password === form.confirmPassword
                        ? "Passwords match"
                        : "Passwords do not match"}
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                  <button
                    type="button"
                    onClick={handleBack}
                    style={{
                      flex: 1,
                      fontFamily: "'Poetsen One', sans-serif",
                      background: "#e2e8f0",
                      color: "#334155",
                      border: "none",
                      borderRadius: 10,
                      padding: "12px 0",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleRegister}
                    disabled={loading}
                    className="auth-btn-text-stroke"
                    style={{ flex: 2 }}
                  >
                    {loading ? "Creating account..." : "Create Account"}
                  </button>
                </div>
              </>
            )}

            <p
              style={{
                fontSize: 11,
                color: "#94a3b8",
                textAlign: "center",
                lineHeight: 1.5,
                marginBottom: 8,
              }}
            >
              By registering you agree to our terms of service and privacy
              policy.
            </p>

            <p
              className="switch-text"
              style={{ fontFamily: "'Poetsen One', sans-serif" }}
            >
              Already have an account? <Link to="/login">Sign In</Link>
            </p>

            <Link
              to="/ai-assessment"
              className="ai-assessment-link"
              style={{ marginTop: 8 }}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                <circle cx="12" cy="16" r="1" fill="currentColor" />
              </svg>
              Try AI Symptom Pre-Assessment (no login needed)
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default Register;
