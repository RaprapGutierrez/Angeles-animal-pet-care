// src/pages/CustomerAIChat.jsx
// AI Symptom Pre-Assessment for logged-in Customers
// Mirrors AIAssessment.jsx — direct Gemini call, branch-aware, useCurrentUser
import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../js/supabase";
import { useCurrentUser } from "../js/useCurrentUser";

// ── Config ────────────────────────────────────────────────────────────────────
const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;

// const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`; --- IGNORE ---
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

const SERVICE_MAP = {
  "general check-up": "Checkup", "checkup": "Checkup",
  "emergency care": "Emergency", "emergency": "Emergency",
  "vaccination": "Vaccination",
  "dental care": "Dental", "dental": "Dental",
  "surgery consultation": "Surgery", "surgery": "Surgery",
  "grooming": "Grooming",
  "follow-up": "Follow-up",
};

// ── Step indicator ────────────────────────────────────────────────────────────
const StepDot = ({ n, active, done, label }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
    <div style={{
      width: 32, height: 32, borderRadius: "50%",
      background: done ? "#16a34a" : active ? "#1e3a8a" : "#e2e8f0",
      color: done || active ? "#fff" : "#94a3b8",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: done ? 14 : 13, fontWeight: 800, transition: "all 0.2s",
      border: `2px solid ${done ? "#16a34a" : active ? "#1e3a8a" : "#e2e8f0"}`,
    }}>
      {done ? "✓" : n}
    </div>
    <span style={{ fontSize: 10, fontWeight: active ? 700 : 500, color: done ? "#16a34a" : active ? "#1e3a8a" : "#94a3b8", whiteSpace: "nowrap" }}>
      {label}
    </span>
  </div>
);

const StepLine = ({ done }) => (
  <div style={{ flex: 1, height: 2, background: done ? "#16a34a" : "#e2e8f0", marginBottom: 20, transition: "background 0.3s" }} />
);

// ── Typing indicator ──────────────────────────────────────────────────────────
const TypingDots = () => (
  <div style={{ display: "flex", gap: 4, alignItems: "center", padding: "12px 0" }}>
    {[0, 1, 2].map(i => (
      <span key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "#1e3a8a", display: "inline-block", animation: `aiDot 1.2s ${i * 0.2}s infinite` }} />
    ))}
    <style>{`@keyframes aiDot{0%,80%,100%{transform:scale(0.7);opacity:0.5}40%{transform:scale(1);opacity:1}}`}</style>
  </div>
);

// ── Follow-up Chat Component ──────────────────────────────────────────────────
const FollowUpChat = ({ assessment, petName, petType, petAge, symptoms, onProceedToBook }) => {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: `I've completed the assessment for **${petName}**. The analysis suggests **${assessment.urgency}** urgency with a recommendation for **${assessment.recommendedService}**.\n\nDo you have any follow-up questions about ${petName}'s condition, the assessment results, or what to expect? Feel free to ask anything — or proceed to book an appointment when you're ready.`,
      time: new Date(),
    }
  ]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatLoading]);

  const SUGGESTED_QUESTIONS = [
    "Is this condition contagious to other pets?",
    "What should I feed my pet right now?",
    "How long will recovery take?",
    "Should I restrict activity?",
  ];

  const sendMessage = async (text) => {
    const userText = text || input.trim();
    if (!userText || chatLoading) return;
    setInput("");

    const userMsg = { role: "user", text: userText, time: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setChatLoading(true);

    const contextPrompt = `You are a veterinary assistant AI for Angeles Animal Care Hospital. You have just completed a pre-assessment for a pet.

Pet Details:
- Name: ${petName}
- Type: ${petType}
- Age: ${petAge}
- Reported Symptoms: ${symptoms}

Assessment Results:
- Possible Conditions: ${assessment.conditions?.join(", ")}
- Urgency: ${assessment.urgency} — ${assessment.urgencyReason}
- Recommended Service: ${assessment.recommendedService}
- Summary: ${assessment.summary}

The pet owner is now asking a follow-up question. Answer helpfully, concisely, and in plain language. Always recommend consulting a vet for definitive diagnosis. Do NOT repeat the full assessment — just answer the specific question.

Owner's question: ${userText}`;

    try {
      const res = await fetch(GEMINI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: contextPrompt }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 512 },
        }),
      });

      if (!res.ok) throw new Error(`Gemini error: ${res.status}`);
      const data = await res.json();
      const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

      setMessages(prev => [...prev, { role: "assistant", text: raw.trim(), time: new Date() }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: "assistant",
        text: "Sorry, I couldn't process that question right now. Please try again or proceed to book your appointment.",
        time: new Date(),
        isError: true,
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const formatText = (text) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br/>');
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 12px rgba(30,58,138,0.06)" }}>
      {/* Chat header */}
      <div style={{ background: "linear-gradient(135deg,#1a1a6e,#1e3a8a)", padding: "14px 18px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>🤖</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>Follow-up Questions</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.65)" }}>Ask anything about {petName}'s assessment · Powered by Gemini</div>
        </div>
        <div style={{ marginLeft: "auto", width: 8, height: 8, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 6px #4ade80" }} />
      </div>

      {/* Messages */}
      <div style={{ maxHeight: 360, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 12, background: "#f8fafc" }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: "flex", flexDirection: msg.role === "user" ? "row-reverse" : "row", gap: 8, alignItems: "flex-start" }}>
            {msg.role === "assistant" && (
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#1a1a6e,#1e3a8a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0, marginTop: 2 }}>🤖</div>
            )}
            <div style={{
              maxWidth: "78%",
              padding: "10px 14px",
              borderRadius: msg.role === "user" ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
              background: msg.role === "user" ? "#1e3a8a" : msg.isError ? "#fef2f2" : "#fff",
              color: msg.role === "user" ? "#fff" : msg.isError ? "#dc2626" : "#1e293b",
              fontSize: 13,
              lineHeight: 1.6,
              border: msg.role === "assistant" ? "1px solid #e2e8f0" : "none",
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            }}
              dangerouslySetInnerHTML={{ __html: formatText(msg.text) }}
            />
          </div>
        ))}

        {chatLoading && (
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#1a1a6e,#1e3a8a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>🤖</div>
            <div style={{ padding: "10px 14px", borderRadius: "4px 16px 16px 16px", background: "#fff", border: "1px solid #e2e8f0" }}>
              <TypingDots />
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Suggested questions */}
      {messages.length <= 1 && (
        <div style={{ padding: "10px 16px 0", background: "#f8fafc", borderTop: "1px solid #e2e8f0" }}>
          <p style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: 0.5 }}>Suggested questions</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, paddingBottom: 10 }}>
            {SUGGESTED_QUESTIONS.map((q, i) => (
              <button key={i} onClick={() => sendMessage(q)} style={{ padding: "5px 12px", borderRadius: 20, border: "1.5px solid #c7d4f0", background: "#e8edf8", color: "#1e3a8a", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}>
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div style={{ padding: "12px 16px", background: "#fff", borderTop: "1px solid #e2e8f0", display: "flex", gap: 8 }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder={`Ask about ${petName}'s condition…`}
          rows={1}
          disabled={chatLoading}
          style={{ flex: 1, padding: "9px 12px", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: 13, fontFamily: "inherit", outline: "none", resize: "none", lineHeight: 1.5, transition: "border-color 0.15s" }}
          onFocus={e => e.target.style.borderColor = "#1e3a8a"}
          onBlur={e => e.target.style.borderColor = "#e2e8f0"}
        />
        <button
          onClick={() => sendMessage()}
          disabled={!input.trim() || chatLoading}
          style={{ width: 38, height: 38, borderRadius: 10, border: "none", background: input.trim() && !chatLoading ? "#1e3a8a" : "#e2e8f0", color: input.trim() && !chatLoading ? "#fff" : "#94a3b8", cursor: input.trim() && !chatLoading ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0, alignSelf: "flex-end", transition: "all 0.15s" }}
        >
          ➤
        </button>
      </div>

      {/* Proceed CTA */}
      <div style={{ padding: "12px 16px 16px", background: "#fff", borderTop: "1px solid #f1f5f9" }}>
        <button
          onClick={onProceedToBook}
          style={{ width: "100%", padding: "13px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#1a1a6e,#1e3a8a)", color: "#fff", fontFamily: "inherit", fontSize: 14, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
        >
          📅 Done asking — Book Appointment →
        </button>
        <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", margin: "8px 0 0" }}>
          All your questions answered? Proceed to book.
        </p>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const CustomerAIChat = () => {
  const navigate = useNavigate();
  const { user, isAdmin, isCustomer, loading: userLoading } = useCurrentUser();

  const [step, setStep] = useState(1); // 1=pet info, 2=symptoms, 3=assessing, 4=results, 5=booking, 6=done
  const [error, setError] = useState("");
  const [assessing, setAssessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [assessment, setAssessment] = useState(null);
  const [saved, setSaved] = useState(null);
  const [history, setHistory] = useState([]);
  const [showChat, setShowChat] = useState(false);

  // Form state
  const [form, setForm] = useState({
    petName: "", petType: "Dog", petAge: "",
    symptoms: "", additionalNotes: "",
    ownerName: "", contact: "",
    vet: "", date: "", time: "", notes: "",
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const TIMES = ["08:00 AM","09:00 AM","10:00 AM","11:00 AM","01:00 PM","02:00 PM","03:00 PM","04:00 PM"];
  const VETS  = ["Dr. Santos", "Dr. Reyes", "Dr. Cruz", "Dr. Garcia"];
  const TODAY = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (user) set("ownerName", user.fullName || "");
  }, [user]);

  const canStep2 = form.petName.trim() && form.petType && form.petAge;
  const canSubmit = form.symptoms.trim().length >= 10;

  // ── Call Gemini directly ──────────────────────────────────────────────────
  const analyzeSymptoms = async () => {
    if (!canSubmit) { setError("Please describe the symptoms in more detail."); return; }
    setError(""); setAssessing(true); setStep(3);

    const prompt = `You are a veterinary triage AI assistant for Angeles Animal Care Hospital in the Philippines.

A pet owner has described symptoms for their ${form.petType} named "${form.petName}" (${form.petAge}).

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
  "homeCareTips": ["tip 1", "tip 2"],
  "appointment_notes": "brief notes for the appointment form"
}

Rules:
- conditions: 2-4 most likely differentials (not diagnoses)
- Emergency = life-threatening; High = see vet today; Moderate = 1-2 days; Low = monitor + routine visit
- Always recommend professional veterinary consultation`;

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
      const data = await res.json();
      const raw  = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const clean = raw.replace(/```json?/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(clean);

      setAssessment(parsed);
      set("notes", parsed.appointment_notes || "");
      setShowChat(false);
      setStep(4);
    } catch (err) {
      console.error(err);
      setError("AI assessment failed. Please try again.");
      setStep(2);
    } finally {
      setAssessing(false);
    }
  };

  // ── Save pre_assessment + appointment ─────────────────────────────────────
  const bookAppointment = async () => {
    if (!form.date || !form.time) { setError("Please select a date and time."); return; }
    setSaving(true); setError("");

    const branchId = user?.branchId ?? null;

    const { data: assessmentRow } = await supabase.from("pre_assessments").insert([{
      patient_id:    user?.id ?? null,
      branch_id:     branchId,
      symptoms:      `${form.symptoms}${form.additionalNotes ? "\n\nAdditional: " + form.additionalNotes : ""}`,
      ai_conditions: assessment?.conditions || [],
      ai_service:    assessment?.recommendedService || "General Check-up",
      ai_urgency:    assessment?.urgency || "Moderate",
      ai_summary:    assessment?.summary || "",
    }]).select().single();

    const purpose = SERVICE_MAP[(assessment?.recommendedService || "").toLowerCase()] || assessment?.recommendedService || "Checkup";

    const { data: apptRow, error: apptErr } = await supabase.from("appointments").insert([{
      patient:   form.petName,
      owner:     form.ownerName,
      contact:   form.contact,
      vet:       purpose === "Grooming" ? "" : (form.vet || ""),
      date:      form.date,
      time:      form.time,
      purpose:   purpose,
      notes:     `[AI Assessment] ${assessment?.summary || ""}\n\n${form.notes}`,
      status:    isAdmin ? "Confirmed" : "Pending",
      branch_id: branchId,
    }]).select().single();

    if (apptErr) { setError("Error saving appointment: " + apptErr.message); setSaving(false); return; }

    if (assessmentRow?.id && apptRow?.id) {
      await supabase.from("pre_assessments").update({ appointment_id: apptRow.id }).eq("id", assessmentRow.id);
    }

    setHistory(h => [{
      pet: form.petName, symptoms: form.symptoms.slice(0, 60) + "...",
      urgency: assessment?.urgency, service: assessment?.recommendedService, date: form.date,
    }, ...h]);

    setSaved(apptRow);
    setSaving(false);
    setStep(6);
  };

  const reset = () => {
    setStep(1); setAssessment(null); setSaved(null); setError(""); setShowChat(false);
    setForm({ petName: "", petType: "Dog", petAge: "", symptoms: "", additionalNotes: "", ownerName: user?.fullName || "", contact: "", vet: "", date: "", time: "", notes: "" });
  };

  const urgency = assessment ? URGENCY_CONFIG[assessment.urgency] || URGENCY_CONFIG.Moderate : null;

  const S = {
    page:   { width: "100%", minHeight: "100vh", display: "block", background: "linear-gradient(160deg, #f0f4ff 0%, #f8fafc 60%, #fff 100%)" },
    topbar: { background: "#fff", borderBottom: "1px solid #dde3f0", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "fixed", top: "var(--topbar-h, 0px)", zIndex: 50, width: "100%", boxSizing: "border-box", gap: 12 },
    cont:   { padding: "24px 16px 48px", paddingTop: "calc(var(--topbar-h, 0px) + 90px)", maxWidth: 600, margin: "0 auto" },
    card:   { background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", boxShadow: "0 2px 12px rgba(30,58,138,0.06)", padding: 24, marginBottom: 16 },
    inp:    { width: "100%", padding: "11px 14px", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box", transition: "border-color 0.15s" },
    label:  { fontSize: 12, fontWeight: 700, color: "#374151", display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.4px" },
  };

  if (userLoading) return (
    <div style={{ ...S.page, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: "#64748b" }}>Loading...</p>
    </div>
  );

  const STEPS = ["Pet Info", "Symptoms", "AI Analysis", "Assessment", "Book", "Done"];

  return (
    <>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:.5} }
        .ai-enter { animation: fadeUp 0.3s ease both; }
        .chip-btn { transition: all 0.15s !important; }
        .chip-btn:hover { transform: translateY(-1px); }
        input:focus, select:focus, textarea:focus { border-color: #1e3a8a !important; }
        .chat-suggest:hover { background: #c7d4f0 !important; }
      `}</style>

      <div style={S.page}>
        {/* ── Topbar ── */}
        <div style={S.topbar}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#1a1a6e,#1e3a8a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🤖</div>
            <div>
              <h1 style={{ fontSize: 16, fontWeight: 800, color: "#1e293b", margin: 0 }}>AI Symptom Pre-Assessment</h1>
              <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>Powered by Gemini · Angeles Animal Care Hospital</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {step === 6 && <button onClick={() => navigate("/customer/appointments")} style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", color: "#1e3a8a", fontFamily: "inherit" }}>View Appointments</button>}
            {step > 1 && step < 6 && <button onClick={reset} style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", color: "#64748b", fontFamily: "inherit" }}>← Start Over</button>}
          </div>
        </div>

        {/* ── Step indicator ── */}
        <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "14px 20px", display: "flex", alignItems: "center", gap: 0, position: "fixed", top: "calc(var(--topbar-h, 0px) + 60px)", width: "100%", boxSizing: "border-box", zIndex: 49 }}>
          <div style={{ maxWidth: 600, margin: "0 auto", display: "flex", alignItems: "center", gap: 0, width: "100%" }}>
            {STEPS.map((label, i) => (
              <React.Fragment key={label}>
                <StepDot n={i + 1} active={step === i + 1} done={step > i + 1} label={label} />
                {i < STEPS.length - 1 && <StepLine done={step > i + 1} />}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* ── Content ── */}
        <div style={S.cont}>

          {/* ════ STEP 1: Pet Info ════ */}
          {step === 1 && (
            <div className="ai-enter" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div style={{ background: "linear-gradient(135deg,#1a1a6e,#1e3a8a)", borderRadius: 16, padding: "20px 24px", display: "flex", gap: 14, alignItems: "center" }}>
                <span style={{ fontSize: 36 }}>🐾</span>
                <div>
                  <h2 style={{ fontSize: 17, fontWeight: 800, color: "#fff", margin: "0 0 4px" }}>Tell us about your pet</h2>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", margin: 0 }}>Our AI will analyze symptoms and suggest the right care.</p>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={S.label}>Your Name *</label>
                  <input value={form.ownerName} onChange={e => set("ownerName", e.target.value)} placeholder="Your full name" style={S.inp} readOnly={isCustomer} />
                </div>
                <div>
                  <label style={S.label}>Contact Number</label>
                  <input value={form.contact} onChange={e => set("contact", e.target.value)} placeholder="09XX-XXX-XXXX" style={S.inp} />
                </div>
              </div>

              <div>
                <label style={S.label}>Pet's Name *</label>
                <input value={form.petName} onChange={e => set("petName", e.target.value)} placeholder="e.g. Buddy, Luna, Mochi…" style={S.inp} />
              </div>

              <div>
                <label style={S.label}>Type of Pet *</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {PET_TYPES.map(t => {
                    const active = form.petType === t;
                    return (
                      <button key={t} className="chip-btn" onClick={() => set("petType", t)} style={{ padding: "8px 14px", borderRadius: 20, fontFamily: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer", border: `1.5px solid ${active ? "#1e3a8a" : "#e2e8f0"}`, background: active ? "#1e3a8a" : "#fff", color: active ? "#fff" : "#374151", transition: "all 0.15s" }}>
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label style={S.label}>Approximate Age *</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {AGE_OPTIONS.map(a => {
                    const active = form.petAge === a;
                    return (
                      <button key={a} className="chip-btn" onClick={() => set("petAge", a)} style={{ padding: "10px 14px", borderRadius: 10, fontFamily: "inherit", fontSize: 13, fontWeight: 500, cursor: "pointer", textAlign: "left", border: `1.5px solid ${active ? "#1e3a8a" : "#e2e8f0"}`, background: active ? "#e8edf8" : "#fff", color: active ? "#1e3a8a" : "#374151", display: "flex", alignItems: "center", gap: 10, transition: "all 0.15s" }}>
                        <span style={{ width: 16, height: 16, borderRadius: "50%", flexShrink: 0, border: `2px solid ${active ? "#1e3a8a" : "#d1d5db"}`, background: active ? "#1e3a8a" : "transparent", transition: "all 0.15s" }} />
                        {a}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button onClick={() => setStep(2)} disabled={!canStep2 || !form.ownerName.trim()} style={{ padding: 14, borderRadius: 12, border: "none", background: canStep2 && form.ownerName.trim() ? "#1e3a8a" : "#e2e8f0", color: canStep2 && form.ownerName.trim() ? "#fff" : "#94a3b8", fontFamily: "inherit", fontSize: 14, fontWeight: 800, cursor: canStep2 && form.ownerName.trim() ? "pointer" : "not-allowed", transition: "all 0.15s" }}>
                Continue to Symptoms →
              </button>
            </div>
          )}

          {/* ════ STEP 2: Symptoms ════ */}
          {step === 2 && (
            <div className="ai-enter" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div style={{ background: "linear-gradient(135deg,#1a1a6e,#1e3a8a)", borderRadius: 16, padding: "20px 24px", display: "flex", gap: 14, alignItems: "center" }}>
                <span style={{ fontSize: 36 }}>🩺</span>
                <div>
                  <h2 style={{ fontSize: 17, fontWeight: 800, color: "#fff", margin: "0 0 4px" }}>Describe {form.petName}'s symptoms</h2>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", margin: 0 }}>More detail = more accurate AI assessment.</p>
                </div>
              </div>

              <div>
                <label style={S.label}>Quick select common symptoms</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {QUICK_SYMPTOMS.map(s => {
                    const active = form.symptoms.includes(s);
                    return (
                      <button key={s} className="chip-btn" onClick={() => {
                        const curr = form.symptoms;
                        set("symptoms", active
                          ? curr.replace(s + ", ", "").replace(", " + s, "").replace(s, "").trim()
                          : curr ? curr + ", " + s : s
                        );
                      }} style={{ padding: "6px 12px", borderRadius: 20, fontFamily: "inherit", fontSize: 12, fontWeight: 600, cursor: "pointer", border: `1.5px solid ${active ? "#1e3a8a" : "#e2e8f0"}`, background: active ? "#e8edf8" : "#fff", color: active ? "#1e3a8a" : "#64748b", transition: "all 0.15s" }}>
                        {active ? "✓ " : ""}{s}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label style={S.label}>Describe symptoms in detail *</label>
                <textarea value={form.symptoms} onChange={e => set("symptoms", e.target.value)} placeholder={`e.g. ${form.petName} has been vomiting since this morning, refuses to eat, and seems very tired…`} rows={5} style={{ ...S.inp, resize: "vertical", lineHeight: 1.6 }} />
                <p style={{ fontSize: 11, color: "#94a3b8", margin: "4px 0 0", textAlign: "right" }}>
                  {form.symptoms.length} characters {form.symptoms.length > 0 && form.symptoms.length < 10 && "— please add more detail"}
                </p>
              </div>

              <div>
                <label style={S.label}>Additional notes <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 400, textTransform: "none" }}>(optional)</span></label>
                <textarea value={form.additionalNotes} onChange={e => set("additionalNotes", e.target.value)} placeholder="Recent diet changes, medications, when symptoms started, known allergies…" rows={3} style={{ ...S.inp, resize: "vertical", fontSize: 13, lineHeight: 1.6 }} />
              </div>

              <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "12px 14px", display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
                <p style={{ fontSize: 11, color: "#92400e", margin: 0, lineHeight: 1.6 }}>
                  <strong>Disclaimer:</strong> This AI assessment is for informational purposes only and does not replace professional veterinary diagnosis. For life-threatening emergencies, please visit our clinic immediately.
                </p>
              </div>

              {error && <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, padding: "12px 14px", fontSize: 13, color: "#dc2626", fontWeight: 600 }}>⚠️ {error}</div>}

              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setStep(1)} style={{ padding: "13px 20px", borderRadius: 12, border: "1.5px solid #e2e8f0", background: "#f8fafc", fontFamily: "inherit", fontSize: 14, fontWeight: 700, cursor: "pointer", color: "#64748b" }}>← Back</button>
                <button onClick={analyzeSymptoms} disabled={!canSubmit} style={{ flex: 1, padding: 13, borderRadius: 12, border: "none", background: canSubmit ? "#1e3a8a" : "#e2e8f0", color: canSubmit ? "#fff" : "#94a3b8", fontFamily: "inherit", fontSize: 14, fontWeight: 800, cursor: canSubmit ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.15s" }}>
                  🔍 Analyze with Gemini AI
                </button>
              </div>
            </div>
          )}

          {/* ════ STEP 3: Assessing ════ */}
          {step === 3 && (
            <div className="ai-enter" style={{ ...S.card, textAlign: "center", padding: "48px 24px" }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg,#ede9fe,#dbeafe)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 16px", animation: "pulse 1.5s infinite" }}>🤖</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Analyzing symptoms...</h3>
              <p style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>Gemini is reviewing the symptoms for <strong>{form.petName}</strong></p>
              <TypingDots />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 16 }}>
                {["Checking possible conditions", "Determining urgency level", "Recommending service", "Generating summary"].map((t, i) => (
                  <span key={i} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 99, background: "#f1f5f9", color: "#64748b", animation: `pulse 1.5s ${i * 0.3}s infinite` }}>{t}</span>
                ))}
              </div>
            </div>
          )}

          {/* ════ STEP 4: Assessment Result ════ */}
          {step === 4 && assessment && urgency && (
            <div className="ai-enter" style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Urgency banner */}
              <div style={{ background: urgency.bg, border: `2px solid ${urgency.border}`, borderRadius: 16, padding: "18px 20px", display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ fontSize: 36, flexShrink: 0 }}>{urgency.icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: urgency.color, marginBottom: 3 }}>{urgency.label}</div>
                  <div style={{ fontSize: 12, color: urgency.color, opacity: 0.85, lineHeight: 1.5 }}>{assessment.urgencyReason}</div>
                </div>
              </div>

              {/* Pet row */}
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 24 }}>🐾</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#1e293b" }}>{form.petName} · {form.petType} · {form.petAge}</div>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>Assessment complete · Owner: {form.ownerName}</div>
                </div>
              </div>

              {/* Summary */}
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 16 }}>
                <p style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 10px" }}>AI Summary</p>
                <p style={{ fontSize: 14, color: "#1e293b", lineHeight: 1.7, margin: 0 }}>{assessment.summary}</p>
              </div>

              {/* Conditions + Service */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 16px" }}>
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

              {/* ── Follow-up Chat Toggle ── */}
              {!showChat && (
                <div style={{ background: "linear-gradient(135deg,#f0f4ff,#e8edf8)", border: "1.5px solid #c7d4f0", borderRadius: 14, padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}>
                  <span style={{ fontSize: 28, flexShrink: 0 }}>💬</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#1e3a8a", margin: "0 0 3px" }}>Have questions about this assessment?</p>
                    <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>Ask Gemini AI anything about {form.petName}'s condition before booking.</p>
                  </div>
                  <button
                    onClick={() => setShowChat(true)}
                    style={{ padding: "8px 16px", borderRadius: 10, border: "none", background: "#1e3a8a", color: "#fff", fontFamily: "inherit", fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap" }}
                  >
                    Ask Questions
                  </button>
                </div>
              )}

              {/* ── Follow-up Chat ── */}
              {showChat && (
                <div className="ai-enter">
                  <FollowUpChat
                    assessment={assessment}
                    petName={form.petName}
                    petType={form.petType}
                    petAge={form.petAge}
                    symptoms={form.symptoms}
                    onProceedToBook={() => setStep(5)}
                  />
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={reset} style={{ padding: "12px 20px", borderRadius: 12, border: "1.5px solid #e2e8f0", background: "#f8fafc", fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer", color: "#64748b" }}>Start Over</button>
                {!showChat && (
                  <button onClick={() => setStep(5)} style={{ flex: 1, padding: 14, borderRadius: 12, border: "none", background: "linear-gradient(135deg,#1a1a6e,#1e3a8a)", color: "#fff", fontFamily: "inherit", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>
                    📅 Book Appointment →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ════ STEP 5: Booking ════ */}
          {step === 5 && assessment && (
            <div className="ai-enter" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={S.card}>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Confirm Appointment Details</h3>
                <p style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>AI has pre-filled the form. Review and confirm.</p>

                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: 14, marginBottom: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                  {[["Patient", form.petName], ["Owner", form.ownerName], ["Contact", form.contact || "—"], ["Service", assessment.recommendedService], ["Urgency", assessment.urgency]].map(([l, v]) => (
                    <div key={l} style={{ padding: "6px 0", borderBottom: "1px solid #e2e8f0" }}>
                      <span style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>{l}: </span>
                      <span style={{ fontSize: 13, color: "#1e293b" }}>{v}</span>
                    </div>
                  ))}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                  <div>
                    <label style={S.label}>Date *</label>
                    <input type="date" value={form.date} min={TODAY} onChange={e => set("date", e.target.value)} style={S.inp} />
                  </div>
                  <div>
                    <label style={S.label}>Time *</label>
                    <select value={form.time} onChange={e => set("time", e.target.value)} style={S.inp}>
                      <option value="">Select Time</option>
                      {TIMES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  {assessment.recommendedService !== "Grooming" && (
                    <div>
                      <label style={S.label}>Veterinarian</label>
                      <select value={form.vet} onChange={e => set("vet", e.target.value)} style={S.inp}>
                        <option value="">Select Vet (optional)</option>
                        {VETS.map(v => <option key={v}>{v}</option>)}
                      </select>
                    </div>
                  )}
                  <div>
                    <label style={S.label}>Additional Notes</label>
                    <textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={3} style={{ ...S.inp, resize: "vertical" }} />
                  </div>
                </div>

                <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#92400e", marginBottom: 14, display: "flex", gap: 8 }}>
                  <span>⏳</span>
                  <span>{isAdmin ? "Appointment will be Confirmed immediately." : "Appointment will be Pending until approved by staff."}</span>
                </div>

                {error && <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#dc2626", marginBottom: 14 }}>{error}</div>}

                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => setStep(4)} style={{ padding: "12px 20px", borderRadius: 12, border: "1.5px solid #e2e8f0", background: "#f8fafc", fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer", color: "#64748b" }}>← Back</button>
                  <button onClick={bookAppointment} disabled={saving || !form.date || !form.time} style={{ flex: 1, padding: 13, borderRadius: 12, border: "none", background: saving || !form.date || !form.time ? "#e2e8f0" : "linear-gradient(135deg,#1a1a6e,#1e3a8a)", color: saving || !form.date || !form.time ? "#94a3b8" : "#fff", fontFamily: "inherit", fontSize: 14, fontWeight: 800, cursor: saving || !form.date || !form.time ? "not-allowed" : "pointer" }}>
                    {saving ? "Saving…" : isAdmin ? "✓ Confirm Appointment" : "Submit Appointment Request"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ════ STEP 6: Done ════ */}
          {step === 6 && saved && (
            <div className="ai-enter" style={{ ...S.card, textAlign: "center", padding: "48px 24px" }}>
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg,#f0fdf4,#dcfce7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, margin: "0 auto 16px", border: "2px solid #bbf7d0" }}>✅</div>
              <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8, color: "#14532d" }}>
                {isAdmin ? "Appointment Confirmed!" : "Request Submitted!"}
              </h3>
              <p style={{ fontSize: 14, color: "#64748b", marginBottom: 20, lineHeight: 1.6 }}>
                {isAdmin
                  ? `${form.petName}'s appointment has been confirmed for ${saved.date} at ${saved.time}.`
                  : `${form.petName}'s request has been submitted for ${saved.date} at ${saved.time}. Our staff will review and confirm shortly.`}
              </p>
              <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: 16, marginBottom: 20, display: "inline-block", textAlign: "left", minWidth: 280 }}>
                {[["Pet", form.petName], ["Service", assessment?.recommendedService], ["Date", saved.date], ["Time", saved.time], ["Status", saved.status]].map(([l, v]) => (
                  <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #bbf7d0", fontSize: 13 }}>
                    <span style={{ color: "#64748b", fontWeight: 600 }}>{l}</span>
                    <span style={{ fontWeight: 700, color: "#14532d" }}>{v}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                <button onClick={() => navigate("/customer/appointments")} style={{ padding: "12px 20px", borderRadius: 12, border: "1.5px solid #e2e8f0", background: "#f8fafc", fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer", color: "#1e3a8a" }}>View Appointments</button>
                <button onClick={reset} style={{ padding: "12px 20px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#1a1a6e,#1e3a8a)", color: "#fff", fontFamily: "inherit", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>+ New Assessment</button>
              </div>
            </div>
          )}

          {/* ── Session history ── */}
          {history.length > 0 && step !== 3 && (
            <div style={{ ...S.card, marginTop: 8 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: "#94a3b8" }}>This Session — Previous Assessments</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {history.map((h, i) => {
                  const uc = URGENCY_CONFIG[h.urgency] || URGENCY_CONFIG.Moderate;
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                      <span style={{ fontSize: 18 }}>🐾</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{h.pet} — {h.service}</p>
                        <p style={{ margin: 0, fontSize: 11, color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.symptoms}</p>
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: uc.color, color: "#fff", flexShrink: 0 }}>{uc.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
};

export default CustomerAIChat;