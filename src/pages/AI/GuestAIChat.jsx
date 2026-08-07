// src/pages/GuestAIChat.jsx
// AI Symptom Pre-Assessment for guest (non-logged-in) users
import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/GuestAIChat.css";

const API_URL = import.meta.env.VITE_API_URL || "https://vet-care-hospital-ai.onrender.com";

const PET_TYPES = ["Dog", "Cat"];

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
  Emergency: { color: "#dc2626", bg: "#fef2f2", border: "#fca5a5", label: "EMERGENCY — Go to vet NOW" },
  High: { color: "#ea580c", bg: "#fff7ed", border: "#fdba74", label: "HIGH — See a vet today" },
  Moderate: { color: "#d97706", bg: "#fffbeb", border: "#fde68a", label: "MODERATE — Vet visit in 1–2 days" },
  Low: { color: "#16a34a", bg: "#f0fdf4", border: "#86efac", label: "LOW — Monitor at home, routine visit okay" },
};

// ── SVG Icons ─────────────────────────────────────────────────────────────────
const AIIcon = ({ size = 24, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill={color} xmlns="http://www.w3.org/2000/svg">
    <path d="M32 8c-3.3 0-6 2.7-6 6 0 1.1.3 2.1.8 3H18c-3.3 0-6 2.7-6 6v20c0 3.3 2.7 6 6 6h28c3.3 0 6-2.7 6-6V23c0-3.3-2.7-6-6-6h-8.8c.5-.9.8-1.9.8-3 0-3.3-2.7-6-6-6zm0 4c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zM18 21h28c1.1 0 2 .9 2 2v20c0 1.1-.9 2-2 2H18c-1.1 0-2-.9-2-2V23c0-1.1.9-2 2-2zm6 6c-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4zm16 0c-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4zm-8 6c-3 0-8 1.5-8 4v2h16v-2c0-2.5-5-4-8-4z" />
  </svg>
);

const PetsIcon = ({ size = 24, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill={color} xmlns="http://www.w3.org/2000/svg">
    <path d="M11.9 8.4c1.3 0 2.1-1.9 2.1-3.1 0-1-.5-2.2-1.5-2.2-1.3 0-2.1 1.9-2.1 3.1 0 1 .5 2.2 1.5 2.2zm-3.8 0c1 0 1.5-1.2 1.5-2.2C9.6 4.9 8.8 3 7.5 3 6.5 3 6 4.2 6 5.2c-.1 1.3.7 3.2 2.1 3.2zm7.4-1c-1.3 0-2.2 1.8-2.2 3.1 0 .9.4 1.8 1.3 1.8 1.3 0 2.2-1.8 2.2-3.1 0-.9-.5-1.8-1.3-1.8zm-8.7 3.1c0-1.3-1-3.1-2.2-3.1-.9 0-1.3.9-1.3 1.8 0 1.3 1 3.1 2.2 3.1.9 0 1.3-.9 1.3-1.8zm3.2-.2c-2 0-4.7 3.2-4.7 5.4 0 1 .7 1.3 1.5 1.3 1.2 0 2.1-.8 3.2-.8 1 0 1.9.8 3 .8.8 0 1.7-.2 1.7-1.3 0-2.2-2.7-5.4-4.7-5.4z" />
  </svg>
);

const StethoscopeIcon = ({ size = 24, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" xmlns="http://www.w3.org/2000/svg">
    <path d="M9 14.2354V17.0001C9 19.0504 10.2341 20.8125 12 21.584M14.8824 22.0001C16.7691 22.0001 18.3595 20.7311 18.8465 19.0001" />
    <path d="M12.2857 3H12.3774C12.6902 3 12.8467 3 12.9785 3.01166C14.4267 3.13972 15.5746 4.28763 15.7026 5.73574C15.7143 5.86761 15.7143 6.02404 15.7143 6.3369V7.23529C15.7143 8.2172 15.5121 9.15189 15.1471 10M5.42857 3H5.3369C5.02404 3 4.86761 3 4.73574 3.01166C3.28763 3.13972 2.13972 4.28763 2.01166 5.73574C2 5.86761 2 6.02404 2 6.3369V7.521C2 11.2292 5.00609 14.2353 8.71429 14.2353C9.78788 14.2353 10.805 13.9936 11.7143 13.5617" />
    <circle cx="19" cy="16" r="3" />
    <path d="M12 2V4" /><path d="M6 2V4" />
  </svg>
);

const Icons = {
  AlertTriangle: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon-16">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" /><path d="M12 17h.01" />
    </svg>
  ),
  CheckCircle: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon-16">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  Zap: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon-14">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  Home: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon-14">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  Hospital: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon-16">
      <path d="M12 6v4" /><path d="M14 14h-4" /><path d="M14 18h-4" /><path d="M14 8h-4" />
      <path d="M18 12h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2h2" />
      <path d="M18 22V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v18" />
    </svg>
  ),
  Calendar: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon-16">
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" />
    </svg>
  ),
  UserPlus: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon-16">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <line x1="19" x2="19" y1="8" y2="14" /><line x1="22" x2="16" y1="11" y2="11" />
    </svg>
  ),
  RotateCcw: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon-14">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  ),
  ArrowLeft: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon-14">
      <path d="m12 19-7-7 7-7" /><path d="M19 12H5" />
    </svg>
  ),
  Send: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon-16">
      <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  ),
  MessageCircle: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon-18">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
};

const MAX_GUEST_QUESTIONS = 5;
const UrgencyIcon = ({ urgency, size = 36 }) => {
  const common = { width: size, height: size, fill: "none", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (urgency) {
    case "Emergency":
      return (
        <svg viewBox="0 0 24 24" stroke="#dc2626" {...common}>
          <path d="M12 2 2 22h20L12 2z" /><path d="M12 9v6" /><path d="M12 18h.01" />
        </svg>
      );
    case "High":
      return (
        <svg viewBox="0 0 24 24" stroke="#ea580c" {...common}>
          <path d="M12 2 2 22h20L12 2z" /><path d="M12 9v4" /><path d="M12 17h.01" />
        </svg>
      );
    case "Moderate":
      return (
        <svg viewBox="0 0 24 24" stroke="#d97706" {...common}>
          <circle cx="12" cy="12" r="10" /><path d="M12 8v4" /><path d="M12 16h.01" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" stroke="#16a34a" {...common}>
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      );
  }
};

// ── Responsive hook ───────────────────────────────────────────────────────────
const useIsMobile = (bp = 768) => {
  const [v, setV] = useState(typeof window !== "undefined" ? window.innerWidth < bp : false);
  useEffect(() => {
    const h = () => setV(window.innerWidth < bp);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, [bp]);
  return v;
};

// ── Step indicator ────────────────────────────────────────────────────────────
const StepDot = ({ n, active, done, label }) => (
  <div className="g-step-dot-wrap">
    <div className={`g-step-dot${done || active ? " on" : ""}`}>
      {done ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="g-step-dot-check"><polyline points="20 6 9 17 4 12" /></svg> : n}
    </div>
    <span className={`g-step-dot-label${active ? " on" : ""}`}>{label}</span>
  </div>
);

const StepLine = ({ done }) => <div className={`g-step-line${done ? " done" : ""}`} />;

// ── Typing dots ───────────────────────────────────────────────────────────────
const TypingDots = ({ light = false }) => (
  <div className="g-typing">
    {[0, 1, 2].map(i => (
      <span key={i} className={`g-typing-dot${light ? " light" : ""}`} style={{ animationDelay: `${i * 0.2}s` }} />
    ))}
  </div>
);

// ── Follow-up Chat (Guest) ────────────────────────────────────────────────────
const GuestFollowUpChat = ({ assessment, petName, petType, petAge, symptoms, onDone, onCreateAccount }) => {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: `I've completed the assessment for **${petName}**. The analysis suggests **${assessment.urgency}** urgency with a recommendation for **${assessment.recommendedService}**.\n\nDo you have any follow-up questions about ${petName}'s condition or the results?`,
      time: new Date(),
    }
  ]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const chatEndRef = useRef(null);
  const limitReached = questionCount >= MAX_GUEST_QUESTIONS;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatLoading]);

  const SUGGESTED = [
    "Is this contagious to other pets?",
    "What should I feed my pet now?",
    "How long will recovery take?",
    "Should I restrict activity?",
  ];

  const sendMessage = async (text) => {
    const userText = text || input.trim();
    if (!userText || chatLoading || limitReached) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: userText, time: new Date() }]);
    setChatLoading(true);
    setQuestionCount(c => c + 1);

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

Answer the owner's follow-up question helpfully and concisely. Do NOT repeat the full assessment. Always recommend consulting a vet for definitive diagnosis. IMPORTANT: Always reply in the SAME language the owner used in their question (English, Tagalog/Filipino, Taglish, Bisaya, or any other language) — detect it from their message and match it naturally.

Owner's question: ${userText}`;

    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: contextPrompt }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      const raw = data.content?.[0]?.text || "";
      setMessages(prev => [...prev, { role: "assistant", text: raw.trim(), time: new Date() }]);
    } catch (err) {
      console.error("Guest chat error:", err);
      setMessages(prev => [...prev, {
        role: "assistant",
        text: "Sorry, I couldn't process that right now. Please try again.",
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

  const formatText = (text) =>
    text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>');

  return (
    <div className="g-fc-container">
      {/* Header */}
      <div className="g-fc-header">
        <div className="g-fc-header-icon">
          <AIIcon size={18} color="#fff" />
        </div>
        <div>
          <div className="g-fc-header-title">Follow-up Questions</div>
          <div className="g-fc-header-sub">Ask anything about {petName}'s assessment</div>
        </div>
        <div className="g-fc-header-dot" />
      </div>

      {/* Messages */}
      <div className="g-fc-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`g-fc-msg-row${msg.role === "user" ? " user" : ""}`}>
            {msg.role === "assistant" && (
              <div className="g-fc-avatar">
                <AIIcon size={15} color="#fff" />
              </div>
            )}
            <div
              className={`g-fc-bubble${msg.role === "user" ? " user" : msg.isError ? " error" : ""}`}
              dangerouslySetInnerHTML={{ __html: formatText(msg.text) }}
            />
          </div>
        ))}
        {chatLoading && (
          <div className="g-fc-msg-row">
            <div className="g-fc-avatar">
              <AIIcon size={15} color="#fff" />
            </div>
            <div className="g-fc-typing-bubble">
              <TypingDots />
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Question counter */}
      <div className="g-fc-counter-wrap">
        <span className={`g-fc-counter${limitReached ? " limit" : ""}`}>
          {questionCount}/{MAX_GUEST_QUESTIONS} guest questions used
        </span>
      </div>

      {/* Suggested questions */}
      {messages.length <= 1 && !limitReached && (
        <div className="g-fc-suggested-wrap">
          <p className="g-fc-suggested-label">Suggested questions</p>
          <div className="g-fc-suggested-list">
            {SUGGESTED.map((q, i) => (
              <button key={i} onClick={() => sendMessage(q)} className="g-fc-suggested-chip">
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input, or locked notice once the guest limit is hit */}
      {limitReached ? (
        <div className="g-fc-locked">
          <p className="g-fc-locked-text">
            You've reached the {MAX_GUEST_QUESTIONS}-question limit for guests. Log in or create a free account to keep chatting with the AI.
          </p>
          <div className="g-fc-locked-actions">
            <button onClick={onDone} className="g-fc-locked-btn primary">
              Log In
            </button>
            <button onClick={onCreateAccount} className="g-fc-locked-btn secondary">
              Create Account
            </button>
          </div>
        </div>
      ) : (
        <div className="g-fc-input-row">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={`Ask about ${petName}'s condition…`}
            rows={1}
            disabled={chatLoading}
            className="g-fc-textarea"
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || chatLoading}
            className={`g-fc-send-btn${input.trim() && !chatLoading ? " active" : ""}`}
          >
            <Icons.Send />
          </button>
        </div>
      )}

      {/* Done CTA */}
      <div className="g-fc-done-wrap">
        <button onClick={onDone} className="g-fc-done-btn">
          <Icons.Calendar />
          Done asking — Proceed to Book
        </button>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const GuestAIChat = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [assessment, setAssessment] = useState(null);
  const [showChat, setShowChat] = useState(false);

  const [form, setForm] = useState({ petName: "", petType: "", petAge: "", symptoms: "", additionalNotes: "" });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const canStep2 = form.petName.trim() && form.petType && form.petAge;
  const canSubmit = form.symptoms.trim().length >= 10;

  const handleSubmit = async () => {
    if (!canSubmit || loading) return;
    setLoading(true); setError(""); setStep(3);

    try {
      const res = await fetch(`${API_URL}/api/pre-assess`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          petName: form.petName, petType: form.petType, petAge: form.petAge,
          symptoms: form.symptoms, additionalNotes: form.additionalNotes,
        }),
      });
      const parsed = await res.json();
      if (!res.ok) throw new Error(parsed?.error || `Server error: ${res.status}`);
      setAssessment(parsed);
      setShowChat(false);
      setStep(4);
    } catch (err) {
      console.error(err);
      setError(err.message || "AI assessment failed. Please try again.");
      setStep(2);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep(1); setAssessment(null); setError(""); setShowChat(false);
    setForm({ petName: "", petType: "", petAge: "", symptoms: "", additionalNotes: "" });
  };

  const urgency = assessment ? URGENCY_CONFIG[assessment.urgency] || URGENCY_CONFIG.Moderate : null;

  const handleBooking = () => navigate("/login", {
    state: {
      preAssessment: {
        petName: form.petName, petType: form.petType,
        recommendedService: assessment.recommendedService,
        urgency: assessment.urgency, summary: assessment.summary,
      },
      redirectTo: "/customer/appointments/new",
      message: `Log in to book an appointment for ${form.petName}`,
    }
  });

  const handleCreateAccount = () => navigate("/register", {
    state: {
      preAssessment: {
        petName: form.petName, petType: form.petType,
        recommendedService: assessment.recommendedService,
        urgency: assessment.urgency, summary: assessment.summary,
      },
      redirectTo: "/customer/appointments/new",
    }
  });

  return (
    <>
      <div className="g-bg-image" />
      <div className="g-bg-overlay" />

      <div className="g-page">

        {/* Top bar */}
        <div className={`g-topbar${isMobile ? " mobile" : ""}`}>
          <div className="g-topbar-brand">
            <img src="/image/446805041_881106557364617_1125518808684788316_n.jpg" alt="Logo" className={`g-topbar-logo${isMobile ? " mobile" : ""}`} />
            <div className="g-topbar-name-wrap">
              <div className={`g-topbar-name${isMobile ? " mobile" : ""}`}>
                {isMobile ? "Angeles Animal Care" : "Angeles Animal Care Hospital"}
              </div>
              {!isMobile && <div className="g-topbar-sub">AI Symptoms Pre-Assessment · Guest Access</div>}
            </div>
          </div>
          <div className="g-topbar-actions">
            {step === 4 && (
              <button onClick={reset} className={`g-topbar-btn g-topbar-btn-ghost${isMobile ? " mobile" : ""}`}>
                <Icons.RotateCcw /> New
              </button>
            )}
            <button onClick={() => navigate("/")} className={`g-topbar-btn g-topbar-btn-ghost${isMobile ? " mobile" : ""}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon-13"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
              {!isMobile && "Home"}
            </button>
            <button onClick={() => navigate("/login")} className={`g-topbar-btn g-topbar-btn-primary${isMobile ? " mobile" : ""}`}>
              {isMobile ? "Login" : "Back to Login"}
            </button>
          </div>
        </div>

        {/* Step indicator */}
        <div className="g-step-indicator">
          <StepDot n={1} active={step === 1} done={step > 1} label="Pet Info" />
          <StepLine done={step > 1} />
          <StepDot n={2} active={step === 2} done={step > 2} label="Symptoms" />
          <StepLine done={step > 2} />
          <StepDot n={3} active={step === 3} done={step > 3} label="Analyzing" />
          <StepLine done={step > 3} />
          <StepDot n={4} active={step === 4} done={false} label="Results" />
        </div>

        {/* Scrollable content */}
        <div className={`g-content-scroll${isMobile ? " mobile" : ""}`}>
          <div className="g-content-inner">

            {/* STEP 1 */}
            {step === 1 && (
              <>
                <div className={`g-intro-card${isMobile ? " mobile" : ""}`}>
                  <div className="g-intro-icon"><PetsIcon size={20} color="#fff" /></div>
                  <div>
                    <h2 className={`g-intro-title${isMobile ? " mobile" : ""}`}>Tell us about your pet</h2>
                    <p className="g-intro-sub">No account needed · Your info stays private</p>
                  </div>
                </div>

                <div>
                  <label className="g-field-label">Pet's Name <span className="g-field-required">*</span></label>
                  <input className="g-input" value={form.petName} onChange={e => set("petName", e.target.value)} placeholder="e.g. Buddy, Luna, Mochi…" />
                </div>

                <div>
                  <label className="g-field-label">Type of Pet <span className="g-field-required">*</span></label>
                  <div className="g-pettype-row">
                    {PET_TYPES.map(t => {
                      const active = form.petType === t;
                      return (
                        <button key={t} className={`g-pettype-btn${active ? " active" : ""}`} onClick={() => set("petType", t)}>
                          {t === "Cat"
                            ? <svg width="18" height="18" viewBox="0 0 16 16" fill={active ? "#fff" : "rgba(255,255,255,0.7)"} xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" clipRule="evenodd" d="M1 7L4.80061 1.43926C5.56059 0.527292 6.68638 0 7.8735 0H8V4L12 5L15 10L14.1875 11.2188C13.4456 12.3316 12.1967 13 10.8593 13H9L7 16H5L1 7ZM10 9C10.5523 9 11 8.55229 11 8C11 7.44772 10.5523 7 10 7C9.44771 7 9 7.44772 9 8C9 8.55229 9.44771 9 10 9Z" /><path d="M10 0.465878V2.43845L12 2.93845V0H11.8735C11.2125 0 10.5704 0.163501 10 0.465878Z" /></svg>
                            : <svg width="18" height="18" viewBox="0 0 16 16" fill={active ? "#fff" : "rgba(255,255,255,0.7)"} xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" clipRule="evenodd" d="M16 4V7C16 9.20914 14.2091 11 12 11H10V15H0V13L0.931622 10.8706C1.25226 10.9549 1.59036 11 1.94124 11C3.74931 11 5.32536 9.76947 5.76388 8.01538L3.82359 7.53031C3.60766 8.39406 2.83158 9.00001 1.94124 9.00001C1.87789 9.00001 1.81539 8.99702 1.75385 8.99119C1.02587 8.92223 0.432187 8.45551 0.160283 7.83121C0.0791432 7.64491 0.0266588 7.44457 0.00781272 7.23658C-0.0112323 7.02639 0.00407892 6.80838 0.0588889 6.58914L0.698705 4.02986C1.14387 2.24919 2.7438 1 4.57928 1H10L12 4H16ZM9 6C9.55229 6 10 5.55228 10 5C10 4.44772 9.55229 4 9 4C8.44771 4 8 4.44772 8 5C8 5.55228 8.44771 6 9 6Z" /></svg>
                          }
                          {t}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="g-field-label">Approximate Age <span className="g-field-required">*</span></label>
                  <div className="g-age-list">
                    {AGE_OPTIONS.map(a => {
                      const active = form.petAge === a;
                      return (
                        <button key={a} className={`g-age-btn${active ? " active" : ""}`} onClick={() => set("petAge", a)}>
                          <span className={`g-age-radio${active ? " active" : ""}`} />
                          {a}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button onClick={() => setStep(2)} disabled={!canStep2} className={`g-continue-btn${canStep2 ? " enabled g-btn" : ""}`}>
                  Continue to Symptoms →
                </button>
              </>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <>
                <div className={`g-intro-card${isMobile ? " mobile" : ""}`}>
                  <div className="g-intro-icon"><StethoscopeIcon size={20} color="#fff" /></div>
                  <div>
                    <h2 className={`g-intro-title${isMobile ? " mobile" : ""}`}>Describe {form.petName}'s symptoms</h2>
                    <p className="g-intro-sub">More detail = more accurate AI assessment.</p>
                  </div>
                </div>

                <div>
                  <label className="g-field-label">Tap common symptoms to add them</label>
                  <div className="g-symptom-wrap">
                    {QUICK_SYMPTOMS.map(s => {
                      const active = form.symptoms.includes(s);
                      return (
                        <button key={s} className={`g-symptom-chip${active ? " active" : ""}`} onClick={() => {
                          const curr = form.symptoms;
                          set("symptoms", active
                            ? curr.replace(s + ", ", "").replace(", " + s, "").replace(s, "").trim()
                            : curr ? curr + ", " + s : s);
                        }}>
                          {active && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="g-symptom-check"><polyline points="20 6 9 17 4 12" /></svg>}
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="g-field-label">Describe in detail <span className="g-field-required">*</span></label>
                  <textarea className="g-input" value={form.symptoms} onChange={e => set("symptoms", e.target.value)} placeholder={`e.g. ${form.petName} has been vomiting since this morning…`} rows={5} style={{ resize: "vertical" }} />
                  <p className="g-char-count">
                    {form.symptoms.length} chars {form.symptoms.length > 0 && form.symptoms.length < 10 && "— add more detail"}
                  </p>
                </div>

                <div>
                  <label className="g-field-label">Additional notes <span className="g-field-optional">(optional)</span></label>
                  <textarea className="g-input note" value={form.additionalNotes} onChange={e => set("additionalNotes", e.target.value)} placeholder="Recent diet changes, medications, when symptoms started…" rows={3} style={{ resize: "vertical" }} />
                </div>

                <div className="g-disclaimer-box">
                  <span className="g-disclaimer-icon"><Icons.AlertTriangle /></span>
                  <p className="g-disclaimer-text">
                    <strong>Disclaimer:</strong> This AI assessment is for informational purposes only and does not replace professional veterinary diagnosis.
                  </p>
                </div>

                {error && (
                  <div className="g-error-box">
                    <Icons.AlertTriangle /> {error}
                  </div>
                )}

                <div className="g-step2-actions">
                  <button onClick={() => setStep(1)} className="g-back-btn">
                    <Icons.ArrowLeft /> Back
                  </button>
                  <button onClick={handleSubmit} disabled={!canSubmit || loading} className={`g-submit-btn${canSubmit && !loading ? " enabled g-btn" : ""}`}>
                    <StethoscopeIcon size={16} color={canSubmit && !loading ? "#1e3a8a" : "rgba(255,255,255,0.4)"} /> Run Pre-Assessment
                  </button>
                </div>
              </>
            )}

            {/* STEP 3 */}
            {step === 3 && (
              <div className="g-analyzing-card">
                <div className="g-analyzing-icon">
                  <AIIcon size={30} color="#fff" />
                </div>
                <h3 className="g-analyzing-title">Analyzing symptoms...</h3>
                <p className="g-analyzing-sub">
                  Reviewing the symptoms for <strong style={{ color: "#fff" }}>{form.petName}</strong>
                </p>
                <TypingDots light />
                <div className="g-analyzing-tags">
                  {["Checking possible conditions", "Determining urgency", "Recommending service", "Generating summary"].map((t, i) => (
                    <span key={i} className="g-analyzing-tag" style={{ animationDelay: `${i * 0.3}s` }}>{t}</span>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 4: Results */}
            {step === 4 && assessment && urgency && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14, animation: "fadeUp 0.4s ease" }}>

                {/* Urgency banner */}
                <div className="g-urgency-banner" style={{ background: urgency.bg, borderColor: urgency.border }}>
                  <UrgencyIcon urgency={assessment.urgency} />
                  <div>
                    <div className="g-urgency-title" style={{ color: urgency.color }}>{urgency.label}</div>
                    <div className="g-urgency-reason" style={{ color: urgency.color }}>{assessment.urgencyReason}</div>
                  </div>
                </div>

                {/* Pet row */}
                <div className="g-pet-row">
                  <PetsIcon size={20} color="#fff" />
                  <div>
                    <div className="g-pet-row-title">{form.petName} · {form.petType} · {form.petAge}</div>
                    <div className="g-pet-row-sub">Assessment complete · Guest access</div>
                  </div>
                </div>

                {/* Summary */}
                <div className="g-card-light">
                  <p className="g-card-label">AI Summary</p>
                  <p className="g-summary-text">{assessment.summary}</p>
                </div>

                {/* Conditions + Service */}
                <div className={`g-grid-2${isMobile ? " mobile" : ""}`}>
                  <div className="g-conditions-card">
                    <p className="g-card-label">Possible Conditions</p>
                    {assessment.conditions?.map((c, i) => (
                      <div key={i} className="g-condition-item">
                        <span className="g-condition-dot" />
                        <span className="g-condition-text">{c}</span>
                      </div>
                    ))}
                    <p className="g-condition-note">Not a diagnosis — consult a vet.</p>
                  </div>
                  <div className="g-service-card">
                    <p className="g-service-label">Recommended Service</p>
                    <div className="g-service-value">
                      <Icons.Hospital /> {assessment.recommendedService}
                    </div>
                    <p className="g-service-note">Best match for {form.petName}'s symptoms.</p>
                  </div>
                </div>

                {/* Warning signs */}
                {assessment.warningSigns?.length > 0 && (
                  <div className="g-warning-card">
                    <p className="g-warning-label">
                      <Icons.Zap /> Watch for these warning signs
                    </p>
                    {assessment.warningSigns.map((w, i) => (
                      <div key={i} className="g-warning-item">
                        <span className="g-warning-bang">!</span>
                        <span className="g-warning-text">{w}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Home care tips */}
                {["Low", "Moderate"].includes(assessment.urgency) && assessment.homeCareTips?.length > 0 && (
                  <div className="g-homecare-card">
                    <p className="g-homecare-label">
                      <Icons.Home /> Home care tips in the meantime
                    </p>
                    {assessment.homeCareTips.map((t, i) => (
                      <div key={i} className="g-homecare-item">
                        <span className="g-homecare-icon"><Icons.CheckCircle /></span>
                        <span className="g-homecare-text">{t}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── Follow-up chat toggle ── */}
                {!showChat && (
                  <div className="g-chat-toggle-card">
                    <div className="g-chat-toggle-icon"><Icons.MessageCircle /></div>
                    <div className="g-chat-toggle-body">
                      <p className="g-chat-toggle-title">Still have questions?</p>
                      <p className="g-chat-toggle-sub">Ask the AI anything about {form.petName}'s condition before booking.</p>
                    </div>
                    <button onClick={() => setShowChat(true)} className="g-chat-toggle-btn">
                      Ask AI
                    </button>
                  </div>
                )}

                {/* ── Follow-up chat (fullscreen) ── */}
                {showChat && (
                  <div className="g-chat-fullscreen">
                    <button
                      onClick={() => setShowChat(false)}
                      aria-label="Close chat"
                      className="g-chat-fullscreen-close"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                    <div className="g-chat-fullscreen-inner">
                      <div className="g-chat-fullscreen-box">
                        <GuestFollowUpChat
                          assessment={assessment}
                          petName={form.petName}
                          petType={form.petType}
                          petAge={form.petAge}
                          symptoms={form.symptoms}
                          onDone={() => { setShowChat(false); handleBooking(); }}
                          onCreateAccount={() => { setShowChat(false); handleCreateAccount(); }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* CTAs */}
                <div className="g-cta-wrap">
                  <button onClick={handleBooking} className="g-cta-primary g-btn">
                    <Icons.Calendar /> Log in to Book an Appointment
                  </button>
                  <button onClick={() => navigate("/register", { state: { preAssessment: { petName: form.petName, petType: form.petType, recommendedService: assessment.recommendedService, urgency: assessment.urgency, summary: assessment.summary }, redirectTo: "/customer/appointments/new" } })} className="g-cta-secondary">
                    <Icons.UserPlus /> Create an Account to Book
                  </button>
                  <button onClick={reset} className="g-cta-tertiary">
                    <Icons.RotateCcw /> Start a New Assessment
                  </button>
                </div>

                <p className="g-disclaimer-footer">
                  This AI assessment does not replace professional veterinary advice. Always consult a licensed veterinarian.
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