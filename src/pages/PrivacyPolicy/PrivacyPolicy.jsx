import React from "react";
import { Link } from "react-router-dom";

const CLINIC_NAME = "Angeles Animal Pet Care";
const CONTACT_EMAIL = "privacy@angelesanimalpetcare.com"; // update to your real contact

const Section = ({ number, title, children }) => (
  <div style={{ marginBottom: 28 }}>
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginBottom: 10,
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          background: "linear-gradient(135deg,#1e3a8a,#3b82f6)",
          color: "#fff",
          fontSize: 13,
          fontWeight: 800,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {number}
      </div>
      <h2
        style={{ fontSize: 16, fontWeight: 800, margin: 0, color: "#0f172a" }}
      >
        {title}
      </h2>
    </div>
    <div
      style={{
        paddingLeft: 38,
        color: "#475569",
        fontSize: 14,
        lineHeight: 1.75,
      }}
    >
      {children}
    </div>
  </div>
);

const PrivacyPolicy = () => (
  <div
    style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg,#f8fafc 0%,#f0f3fa 100%)",
      fontFamily: "Inter, sans-serif",
    }}
  >
    {/* Hero header, matches dashboard style */}
    <div
      style={{
        background:
          "linear-gradient(135deg,#0f0c4a 0%,#1e3a8a 55%,#2d5fbf 100%)",
        padding: "40px 24px 56px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -60,
          right: -60,
          width: 260,
          height: 260,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.05)",
        }}
      />
      <div
        style={{
          maxWidth: 760,
          margin: "0 auto",
          position: "relative",
          zIndex: 1,
        }}
      >
        <Link
          to="/"
          style={{
            fontSize: 13,
            color: "rgba(255,255,255,0.8)",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          ← Back
        </Link>
        <p
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "rgba(125,211,252,0.8)",
            letterSpacing: 1.5,
            textTransform: "uppercase",
            margin: "18px 0 6px",
          }}
        >
          {CLINIC_NAME}
        </p>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#fff", margin: 0 }}>
          Data Privacy Notice
        </h1>
        <p
          style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 8 }}
        >
          Last updated: September 18, 2026
        </p>
      </div>
    </div>

    {/* Content card */}
    <div
      style={{ maxWidth: 760, margin: "-32px auto 60px", padding: "0 24px" }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 18,
          padding: "36px 40px",
          boxShadow: "0 8px 32px rgba(30,58,138,0.10)",
          border: "1.5px solid #e2e8f0",
        }}
      >
        <p
          style={{
            color: "#475569",
            fontSize: 14.5,
            lineHeight: 1.75,
            marginBottom: 32,
          }}
        >
          {CLINIC_NAME} ("we", "our", "the clinic") is committed to protecting
          the personal data of our clients, patients (pets), and staff. This
          notice explains what information we collect, why we collect it, and
          how we protect it.
        </p>

        <Section number="1" title="Information We Collect">
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <li>Owner/client contact details (name, phone, email, address)</li>
            <li>
              Pet/patient records (medical history, treatments, vaccinations)
            </li>
            <li>Appointment and walk-in records</li>
            <li>Messages exchanged through the system</li>
            <li>Transaction and billing information</li>
          </ul>
        </Section>

        <Section number="2" title="Why We Collect It">
          To provide veterinary care, schedule and manage appointments, process
          payments, communicate with clients, and maintain accurate medical
          records for your pet's continued care.
        </Section>

        <Section number="3" title="How We Protect It">
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <li>Access to records is restricted by staff role and branch</li>
            <li>Data is encrypted in transit and at rest</li>
            <li>System activity is logged for accountability</li>
          </ul>
        </Section>

        <Section number="4" title="Your Rights">
          You may request to access, correct, or ask us to delete your personal
          data, subject to record-keeping requirements for medical and legal
          purposes. Contact us at{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            style={{ color: "#1e3a8a", fontWeight: 700 }}
          >
            {CONTACT_EMAIL}
          </a>{" "}
          for any privacy-related request.
        </Section>

        <Section number="5" title="Data Retention">
          Medical and transaction records are retained for as long as necessary
          to provide care and comply with applicable recordkeeping obligations.
        </Section>
      </div>
    </div>
  </div>
);

export default PrivacyPolicy;
