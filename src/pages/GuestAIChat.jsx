// src/pages/GuestAIChat.jsx
// AI Symptom Pre-Assessment for guest (non-logged-in) users
// Direct Gemini call — no server needed — mirrors AIAssessment.jsx pattern
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

// ── Config ────────────────────────────────────────────────────────────────────
const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;

const PET_TYPES = ["Dog", "Cat", "Bird", "Rabbit", "Hamster", "Fish", "Reptile", "Other"];

const AGE_OPTIONS = [
  "0–3 months (Newborn)",
  "3–6 months (Young puppy/kitten)",
  "6–12 months (Puppy/Kitten)",
  "1–3 years (Young adult)",
  "3–7 years (Adult)",
  "7–10 years (Mature)",
  "10+ years (Senior)",
];

const QUICK_SYMPTOMS = [
  "Not eating", "Vomiting", "Diarrhea", "Lethargy", "Coughing",
  "Sneezing", "Limping", "Scratching", "Hair loss", "Swelling",
  "Difficulty breathing", "Drinking excessively", "Seizures", "Bleeding",
];

const URGENCY_CONFIG = {
  Emergency: { color: "#dc2626", bg: "#fef2f2", border: "#fca5a5", icon: "🚨", label: "EMERGENCY — Go to vet NOW" },
  High:      { color: "#ea580c", bg: "#fff7ed", border: "#fdba74", icon: "⚠️", label: "HIGH — See a vet today" },
  Moderate:  { color: "#d97706", bg: "#fffbeb", border: "#fde68a", icon: "🔶", label: "MODERATE — Vet visit in 1–2 days" },
  Low:       { color: "#16a34a", bg: "#f0fdf4", border: "#86efac", icon: "✅", label: "LOW — Monitor at home, routine visit okay" },
};

// ── Responsive hook ───────────────────────────────────────────────────────────
const useIsMobile = (bp = 768) => {
  const [v, setV] = useState(typeof window !== "undefined" ? window.innerWidth < bp : false);
  React.useEffect(() => {
    const h = () => setV(window.innerWidth < bp);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, [bp]);
  return v;
};

// ── Step indicator ────────────────────────────────────────────────────────────
const StepDot = ({ n, active, done, label }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
    <div style={{
      width: 32, height: 32, borderRadius: "50%",
      background: done || active ? "#fff" : "rgba(255,255,255,0.2)",
      color: done || active ? "#1e3a8a" : "rgba(255,255,255,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: done ? 14 : 13, fontWeight: 800, transition: "all 0.2s",
      border: done || active ? "none" : "1.5px solid rgba(255,255,255,0.3)",
    }}>
      {done ? "✓" : n}
    </div>
    <span style={{ fontSize: 10, fontWeight: 600, color: active ? "#fff" : "rgba(255,255,255,0.55)", whiteSpace: "nowrap" }}>
      {label}
    </span>
  </div>
);

const StepLine = ({ done }) => (
  <div style={{ flex: 1, height: 2, marginBottom: 20, background: done ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.2)", transition: "background 0.3s" }} />
);

// ── Typing indicator ──────────────────────────────────────────────────────────
const TypingDots = () => (
  <div style={{ display: "flex", gap: 4, alignItems: "center", justifyContent: "center", padding: "12px 0" }}>
    {[0, 1, 2].map(i => (
      <span key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: "#fff", display: "inline-block", animation: `guestDot 1.2s ${i * 0.2}s infinite` }} />
    ))}
    <style>{`@keyframes guestDot{0%,80%,100%{transform:scale(0.7);opacity:0.4}40%{transform:scale(1);opacity:1}}`}</style>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
const GuestAIChat = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [step, setStep]         = useState(1); // 1=pet info, 2=symptoms, 3=assessing, 4=results
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [assessment, setAssessment] = useState(null);

  const [form, setForm] = useState({
    petName: "", petType: "", petAge: "",
    symptoms: "", additionalNotes: "",
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const canStep2  = form.petName.trim() && form.petType && form.petAge;
  const canSubmit = form.symptoms.trim().length >= 10;

  // ── Call Gemini directly ──────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!canSubmit || loading) return;
    setLoading(true); setError(""); setStep(3);

    const prompt = `You are a veterinary triage AI assistant for Angeles Animal Care Hospital in the Philippines.

A guest pet owner has described symptoms for their ${form.petType} named "${form.petName}" (${form.petAge}).

SYMPTOMS: ${form.symptoms}
${form.additionalNotes ? `ADDITIONAL NOTES: ${form.additionalNotes}` : ""}

Analyze these symptoms and respond ONLY with valid JSON (no markdown, no backticks) in this exact format:
{
  "conditions": ["condition1", "condition2", "condition3"],
  "urgency": "Emergency" | "High" | "Moderate" | "Low",
  "urgencyReason": "1-2 sentence explanation of urgency",
  "recommendedService": "one of: General Check-up, Emergency Care, Vaccination, Dental Care, Surgery Consultation, Dermatology, Laboratory/Diagnostics, Grooming, Follow-up",
  "summary": "2-3 sentence plain-language summary for the owner",
  "warningSigns": ["warning sign 1", "warning sign 2"],
  "homeCareTips": ["tip 1", "tip 2"]
}

Rules:
- conditions: 2-4 most likely differentials (not diagnoses)
- Emergency = life-threatening; High = see vet today; Moderate = 1-2 days; Low = monitor + routine visit
- Always recommend professional veterinary consultation
- Keep all text concise and in plain language`;

    try {
      const res = await fetch(GEMINI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
        }),
      });

      if (!res.ok) throw new Error(`Gemini error: ${res.status}`);
      const data  = await res.json();
      const raw   = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const clean = raw.replace(/```json?/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(clean);

      setAssessment(parsed);
      setStep(4);
    } catch (err) {
      console.error(err);
      setError("AI assessment failed. Please try again.");
      setStep(2);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep(1); setAssessment(null); setError("");
    setForm({ petName: "", petType: "", petAge: "", symptoms: "", additionalNotes: "" });
  };

  const urgency = assessment ? URGENCY_CONFIG[assessment.urgency] || URGENCY_CONFIG.Moderate : null;

  // ── Shared input style (glassmorphism on dark bg) ─────────────────────────
  const inputStyle = {
    width: "100%", padding: "11px 14px", borderRadius: 10,
    border: "1.5px solid rgba(255,255,255,0.3)",
    background: "rgba(255,255,255,0.12)", color: "#fff",
    fontSize: 14, fontFamily: "inherit", outline: "none",
    boxSizing: "border-box", lineHeight: 1.6,
    transition: "border-color 0.15s",
  };

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:.4} }
        body { margin: 0; font-family: 'Plus Jakarta Sans', sans-serif; }
        ::placeholder { color: rgba(255,255,255,0.4) !important; }
        .g-btn:hover  { filter: brightness(1.08); transform: translateY(-1px); }
        .g-chip:hover { border-color: rgba(255,255,255,0.7) !important; }
        .g-ghost:hover { background: rgba(255,255,255,0.15) !important; }
        .g-input:focus { border-color: rgba(255,255,255,0.7) !important; }
      `}</style>

      {/* ── Full-screen blurred background ── */}
      <div style={{ position: "fixed", inset: 0, background: "url(/image/bg-main-branch.png) center/cover no-repeat", filter: "brightness(0.35)", zIndex: 0 }} />
      <div style={{ position: "fixed", inset: 0, zIndex: 1, background: "linear-gradient(160deg, rgba(26,26,110,0.7) 0%, rgba(30,58,138,0.5) 100%)" }} />

      <div style={{ position: "fixed", inset: 0, zIndex: 2, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* ── Top bar ── */}
        <div style={{
          background: "rgba(255,255,255,0.06)", backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255,255,255,0.12)",
          padding: isMobile ? "12px 16px" : "14px 28px",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <img
              src="/image/446805041_881106557364617_1125518808684788316_n.jpg"
              alt="Logo"
              style={{ width: isMobile ? 30 : 36, height: isMobile ? 30 : 36, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(255,255,255,0.3)", flexShrink: 0 }}
            />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: isMobile ? 12 : 14, fontWeight: 800, color: "#fff", lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {isMobile ? "Angeles Animal Care" : "Angeles Animal Care Hospital"}
              </div>
              {!isMobile && (
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)" }}>
                  AI Symptoms Pre-Assessment · Guest Access · Powered by Gemini
                </div>
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            {step === 4 && (
              <button onClick={reset} className="g-ghost" style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 8, padding: isMobile ? "6px 10px" : "7px 14px", fontSize: isMobile ? 11 : 12, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", transition: "all 0.15s" }}>
                ← New
              </button>
            )}
            <button onClick={() => navigate("/login")} className="g-btn" style={{ background: "#fff", color: "#1e3a8a", border: "none", borderRadius: 8, padding: isMobile ? "6px 12px" : "7px 16px", fontSize: isMobile ? 11 : 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", transition: "all 0.15s" }}>
              {isMobile ? "Login" : "Back to Login"}
            </button>
          </div>
        </div>

        {/* ── Step indicator ── */}
        <div style={{
          background: "rgba(255,255,255,0.05)", backdropFilter: "blur(8px)",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          padding: "14px 24px",
          display: "flex", alignItems: "center", gap: 0,
          maxWidth: 560, margin: "0 auto", width: "100%", flexShrink: 0,
        }}>
          <StepDot n={1} active={step === 1} done={step > 1} label="Pet Info" />
          <StepLine done={step > 1} />
          <StepDot n={2} active={step === 2} done={step > 2} label="Symptoms" />
          <StepLine done={step > 2} />
          <StepDot n={3} active={step === 3} done={step > 3} label="Analyzing" />
          <StepLine done={step > 3} />
          <StepDot n={4} active={step === 4} done={false} label="Results" />
        </div>

        {/* ── Scrollable content ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? "20px 16px 40px" : "28px 16px 48px", animation: "fadeUp 0.3s ease" }}>
          <div style={{ maxWidth: 560, margin: "0 auto", display: "flex", flexDirection: "column", gap: 18 }}>

            {/* ════ STEP 1: Pet Info ════ */}
            {step === 1 && (
              <>
                <div style={{ background: "rgba(255,255,255,0.1)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 16, padding: isMobile ? "18px" : "22px 24px", display: "flex", gap: 14, alignItems: "center" }}>
                  <span style={{ fontSize: isMobile ? 32 : 40, flexShrink: 0 }}>🐾</span>
                  <div>
                    <h2 style={{ fontSize: isMobile ? 15 : 17, fontWeight: 800, color: "#fff", margin: "0 0 4px" }}>Tell us about your pet</h2>
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", margin: 0, lineHeight: 1.5 }}>
                      No account needed · Your info stays private · Powered by Gemini AI
                    </p>
                  </div>
                </div>

                {/* Pet name */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.8)", display: "block", marginBottom: 8 }}>
                    Pet's Name <span style={{ color: "#fca5a5" }}>*</span>
                  </label>
                  <input className="g-input" value={form.petName} onChange={e => set("petName", e.target.value)} placeholder="e.g. Buddy, Luna, Mochi…" style={inputStyle} />
                </div>

                {/* Pet type */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.8)", display: "block", marginBottom: 8 }}>
                    Type of Pet <span style={{ color: "#fca5a5" }}>*</span>
                  </label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {PET_TYPES.map(t => {
                      const active = form.petType === t;
                      return (
                        <button key={t} className="g-chip" onClick={() => set("petType", t)} style={{ padding: "8px 14px", borderRadius: 20, fontFamily: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer", border: `1.5px solid ${active ? "#fff" : "rgba(255,255,255,0.25)"}`, background: active ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.08)", color: "#fff", transition: "all 0.15s" }}>
                          {t}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Pet age */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.8)", display: "block", marginBottom: 8 }}>
                    Approximate Age <span style={{ color: "#fca5a5" }}>*</span>
                  </label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {AGE_OPTIONS.map(a => {
                      const active = form.petAge === a;
                      return (
                        <button key={a} className="g-chip" onClick={() => set("petAge", a)} style={{ padding: "10px 14px", borderRadius: 10, fontFamily: "inherit", fontSize: 13, fontWeight: 500, cursor: "pointer", textAlign: "left", border: `1.5px solid ${active ? "#fff" : "rgba(255,255,255,0.2)"}`, background: active ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.06)", color: "#fff", display: "flex", alignItems: "center", gap: 10, transition: "all 0.15s" }}>
                          <span style={{ width: 16, height: 16, borderRadius: "50%", flexShrink: 0, border: `2px solid ${active ? "#fff" : "rgba(255,255,255,0.35)"}`, background: active ? "#fff" : "transparent", transition: "all 0.15s" }} />
                          {a}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button onClick={() => setStep(2)} disabled={!canStep2} className={canStep2 ? "g-btn" : ""} style={{ padding: 13, borderRadius: 12, border: "none", background: canStep2 ? "#fff" : "rgba(255,255,255,0.15)", color: canStep2 ? "#1e3a8a" : "rgba(255,255,255,0.4)", fontFamily: "inherit", fontSize: 14, fontWeight: 800, cursor: canStep2 ? "pointer" : "not-allowed", transition: "all 0.15s" }}>
                  Continue to Symptoms →
                </button>
              </>
            )}

            {/* ════ STEP 2: Symptoms ════ */}
            {step === 2 && (
              <>
                <div style={{ background: "rgba(255,255,255,0.1)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 16, padding: isMobile ? "18px" : "22px 24px", display: "flex", gap: 14, alignItems: "center" }}>
                  <span style={{ fontSize: isMobile ? 32 : 40, flexShrink: 0 }}>🩺</span>
                  <div>
                    <h2 style={{ fontSize: isMobile ? 15 : 17, fontWeight: 800, color: "#fff", margin: "0 0 4px" }}>Describe {form.petName}'s symptoms</h2>
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", margin: 0, lineHeight: 1.5 }}>More detail = more accurate AI assessment.</p>
                  </div>
                </div>

                {/* Quick chips */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.8)", display: "block", marginBottom: 8 }}>
                    Tap common symptoms to add them
                  </label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {QUICK_SYMPTOMS.map(s => {
                      const active = form.symptoms.includes(s);
                      return (
                        <button key={s} className="g-chip" onClick={() => {
                          const curr = form.symptoms;
                          set("symptoms", active
                            ? curr.replace(s + ", ", "").replace(", " + s, "").replace(s, "").trim()
                            : curr ? curr + ", " + s : s
                          );
                        }} style={{ padding: "6px 12px", borderRadius: 20, fontFamily: "inherit", fontSize: 12, fontWeight: 600, cursor: "pointer", border: `1.5px solid ${active ? "#fff" : "rgba(255,255,255,0.22)"}`, background: active ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.07)", color: "#fff", transition: "all 0.15s" }}>
                          {active ? "✓ " : ""}{s}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Main textarea */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.8)", display: "block", marginBottom: 8 }}>
                    Describe in detail <span style={{ color: "#fca5a5" }}>*</span>
                  </label>
                  <textarea className="g-input" value={form.symptoms} onChange={e => set("symptoms", e.target.value)} placeholder={`e.g. ${form.petName} has been vomiting since this morning, refuses to eat, and seems very tired…`} rows={5} style={{ ...inputStyle, resize: "vertical" }} />
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", margin: "4px 0 0", textAlign: "right" }}>
                    {form.symptoms.length} chars {form.symptoms.length > 0 && form.symptoms.length < 10 && "— add more detail"}
                  </p>
                </div>

                {/* Additional notes */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.8)", display: "block", marginBottom: 8 }}>
                    Additional notes <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 400 }}>(optional)</span>
                  </label>
                  <textarea className="g-input" value={form.additionalNotes} onChange={e => set("additionalNotes", e.target.value)} placeholder="Recent diet changes, medications, when symptoms started, known allergies…" rows={3} style={{ ...inputStyle, resize: "vertical", fontSize: 13 }} />
                </div>

                {/* Disclaimer */}
                <div style={{ background: "rgba(253,230,138,0.15)", border: "1px solid rgba(253,230,138,0.35)", borderRadius: 10, padding: "12px 14px", display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 15, flexShrink: 0 }}>⚠️</span>
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", margin: 0, lineHeight: 1.6 }}>
                    <strong>Disclaimer:</strong> This AI assessment is for informational purposes only and does not replace professional veterinary diagnosis. For emergencies, visit our clinic immediately.
                  </p>
                </div>

                {error && (
                  <div style={{ background: "rgba(220,38,38,0.2)", border: "1px solid rgba(252,165,165,0.5)", borderRadius: 10, padding: "12px 14px", fontSize: 13, color: "#fca5a5", fontWeight: 600 }}>
                    ⚠️ {error}
                  </div>
                )}

                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => setStep(1)} className="g-ghost" style={{ padding: "13px 18px", borderRadius: 12, border: "1.5px solid rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.08)", color: "#fff", fontFamily: "inherit", fontSize: 14, fontWeight: 700, cursor: "pointer", transition: "all 0.15s" }}>
                    ← Back
                  </button>
                  <button onClick={handleSubmit} disabled={!canSubmit || loading} className={canSubmit && !loading ? "g-btn" : ""} style={{ flex: 1, padding: 13, borderRadius: 12, border: "none", background: canSubmit && !loading ? "#fff" : "rgba(255,255,255,0.15)", color: canSubmit && !loading ? "#1e3a8a" : "rgba(255,255,255,0.4)", fontFamily: "inherit", fontSize: 14, fontWeight: 800, cursor: canSubmit && !loading ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.15s" }}>
                    {loading
                      ? <><span style={{ animation: "pulse 1.2s infinite" }}>🤖</span> Analyzing with Gemini AI…</>
                      : "🔍 Run Pre-Assessment"}
                  </button>
                </div>
              </>
            )}

            {/* ════ STEP 3: Analyzing ════ */}
            {step === 3 && (
              <div style={{ background: "rgba(255,255,255,0.1)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 16, padding: "48px 24px", textAlign: "center" }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 16px", animation: "pulse 1.5s infinite" }}>🤖</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 8 }}>Analyzing symptoms...</h3>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 20 }}>
                  Gemini is reviewing the symptoms for <strong style={{ color: "#fff" }}>{form.petName}</strong>
                </p>
                <TypingDots />
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 16 }}>
                  {["Checking possible conditions", "Determining urgency", "Recommending service", "Generating summary"].map((t, i) => (
                    <span key={i} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 99, background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)", animation: `pulse 1.5s ${i * 0.3}s infinite` }}>{t}</span>
                  ))}
                </div>
              </div>
            )}

            {/* ════ STEP 4: Results ════ */}
            {step === 4 && assessment && urgency && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14, animation: "fadeUp 0.4s ease" }}>

                {/* Urgency banner */}
                <div style={{ background: urgency.bg, border: `2px solid ${urgency.border}`, borderRadius: 16, padding: "18px 20px", display: "flex", alignItems: "center", gap: 14 }}>
                  <span style={{ fontSize: 36, flexShrink: 0 }}>{urgency.icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: urgency.color, marginBottom: 3 }}>{urgency.label}</div>
                    <div style={{ fontSize: 12, color: urgency.color, opacity: 0.85, lineHeight: 1.5 }}>{assessment.urgencyReason}</div>
                  </div>
                </div>

                {/* Pet row */}
                <div style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 24 }}>🐾</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>{form.petName} · {form.petType} · {form.petAge}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", marginTop: 2 }}>Assessment complete · Guest access</div>
                  </div>
                </div>

                {/* Summary */}
                <div style={{ background: "rgba(255,255,255,0.97)", border: "1px solid #e2e8f0", borderRadius: 12, padding: 16 }}>
                  <p style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 10px" }}>AI Summary</p>
                  <p style={{ fontSize: 14, color: "#1e293b", lineHeight: 1.7, margin: 0 }}>{assessment.summary}</p>
                </div>

                {/* Conditions + Service */}
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
                  <div style={{ background: "rgba(255,255,255,0.97)", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 16px" }}>
                    <p style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 10px" }}>Possible Conditions</p>
                    {assessment.conditions?.map((c, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#1e3a8a", flexShrink: 0, marginTop: 6 }} />
                        <span style={{ fontSize: 12, color: "#374151", lineHeight: 1.5 }}>{c}</span>
                      </div>
                    ))}
                    <p style={{ fontSize: 10, color: "#94a3b8", margin: "8px 0 0" }}>Not a diagnosis — consult a vet.</p>
                  </div>
                  <div style={{ background: "#e8edf8", border: "1px solid #c7d4f0", borderRadius: 12, padding: "14px 16px" }}>
                    <p style={{ fontSize: 11, fontWeight: 800, color: "#1e3a8a", textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 10px" }}>Recommended Service</p>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#1e3a8a", marginBottom: 6 }}>🏥 {assessment.recommendedService}</div>
                    <p style={{ fontSize: 11, color: "#3b5998", margin: 0, lineHeight: 1.5 }}>Best match for {form.petName}'s symptoms.</p>
                  </div>
                </div>

                {/* Warning signs */}
                {assessment.warningSigns?.length > 0 && (
                  <div style={{ background: "#fff7ed", border: "1px solid #fdba74", borderRadius: 12, padding: "14px 16px" }}>
                    <p style={{ fontSize: 11, fontWeight: 800, color: "#ea580c", textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 10px" }}>⚡ Watch for these warning signs</p>
                    {assessment.warningSigns.map((w, i) => (
                      <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 6 }}>
                        <span style={{ color: "#ea580c", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>!</span>
                        <span style={{ fontSize: 12, color: "#92400e", lineHeight: 1.5 }}>{w}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Home care tips */}
                {["Low", "Moderate"].includes(assessment.urgency) && assessment.homeCareTips?.length > 0 && (
                  <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 12, padding: "14px 16px" }}>
                    <p style={{ fontSize: 11, fontWeight: 800, color: "#16a34a", textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 10px" }}>🏠 Home care tips in the meantime</p>
                    {assessment.homeCareTips.map((t, i) => (
                      <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 6 }}>
                        <span style={{ color: "#16a34a", fontSize: 12, flexShrink: 0 }}>✓</span>
                        <span style={{ fontSize: 12, color: "#166534", lineHeight: 1.5 }}>{t}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* CTAs */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <button
                    onClick={() => navigate("/login", {
                      state: {
                        preAssessment: {
                          petName: form.petName, petType: form.petType,
                          recommendedService: assessment.recommendedService,
                          urgency: assessment.urgency, summary: assessment.summary,
                        },
                        redirectTo: "/customer/appointments/new",
                        message: `Log in to book an appointment for ${form.petName}`,
                      }
                    })}
                    className="g-btn"
                    style={{ padding: 14, borderRadius: 12, border: "none", background: "#fff", color: "#1e3a8a", fontFamily: "inherit", fontSize: 15, fontWeight: 800, cursor: "pointer", transition: "all 0.15s", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                  >
                    📅 Log in to Book an Appointment
                  </button>

                  <button
                    onClick={() => navigate("/register", {
                      state: {
                        preAssessment: {
                          petName: form.petName, petType: form.petType,
                          recommendedService: assessment.recommendedService,
                          urgency: assessment.urgency, summary: assessment.summary,
                        },
                        redirectTo: "/customer/appointments/new",
                      }
                    })}
                    className="g-ghost"
                    style={{ padding: 12, borderRadius: 12, border: "1.5px solid rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.1)", color: "#fff", fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 0.15s" }}
                  >
                    🆕 Create an Account to Book
                  </button>

                  <button onClick={reset} className="g-ghost" style={{ padding: 11, borderRadius: 12, border: "1.5px solid rgba(255,255,255,0.2)", background: "transparent", color: "rgba(255,255,255,0.6)", fontFamily: "inherit", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}>
                    ← Start a New Assessment
                  </button>
                </div>

                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", textAlign: "center", lineHeight: 1.6, margin: "4px 0 0" }}>
                  ⚠️ This AI assessment does not replace professional veterinary advice. Always consult a licensed veterinarian for diagnosis and treatment.
                </p>
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
};

export default GuestAIChat;