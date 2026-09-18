import React from "react";
import { Link } from "react-router-dom";

const CLINIC_NAME = "Angeles Animal Pet Care";
const CONTACT_EMAIL = "privacy@angelesanimalpetcare.com"; // update to your real contact

const PrivacyPolicy = () => (
  <div
    style={{
      maxWidth: 760,
      margin: "0 auto",
      padding: "48px 24px",
      fontFamily: "Inter, sans-serif",
      color: "#1e293b",
      lineHeight: 1.7,
    }}
  >
    <Link to="/" style={{ fontSize: 13, color: "#1e3a8a", fontWeight: 600 }}>
      ← Back
    </Link>
    <h1 style={{ fontSize: 26, fontWeight: 800, marginTop: 16 }}>
      Data Privacy Notice
    </h1>
    <p style={{ fontSize: 13, color: "#64748b" }}>
      Last updated: September 18, 2026
    </p>

    <p>
      {CLINIC_NAME} ("we", "our", "the clinic") is committed to protecting the
      personal data of our clients, patients (pets), and staff. This notice
      explains what information we collect, why we collect it, and how we
      protect it.
    </p>

    <h2 style={{ fontSize: 17, fontWeight: 700, marginTop: 28 }}>
      1. Information We Collect
    </h2>
    <ul>
      <li>Owner/client contact details (name, phone, email, address)</li>
      <li>Pet/patient records (medical history, treatments, vaccinations)</li>
      <li>Appointment and walk-in records</li>
      <li>Messages exchanged through the system</li>
      <li>Transaction and billing information</li>
    </ul>

    <h2 style={{ fontSize: 17, fontWeight: 700, marginTop: 28 }}>
      2. Why We Collect It
    </h2>
    <p>
      To provide veterinary care, schedule and manage appointments, process
      payments, communicate with clients, and maintain accurate medical records
      for your pet's continued care.
    </p>

    <h2 style={{ fontSize: 17, fontWeight: 700, marginTop: 28 }}>
      3. How We Protect It
    </h2>
    <ul>
      <li>Access to records is restricted by staff role and branch</li>
      <li>Data is encrypted in transit and at rest</li>
      <li>System activity is logged for accountability</li>
    </ul>

    <h2 style={{ fontSize: 17, fontWeight: 700, marginTop: 28 }}>
      4. Your Rights
    </h2>
    <p>
      You may request to access, correct, or ask us to delete your personal
      data, subject to record-keeping requirements for medical and legal
      purposes. Contact us at{" "}
      <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> for any
      privacy-related request.
    </p>

    <h2 style={{ fontSize: 17, fontWeight: 700, marginTop: 28 }}>
      5. Data Retention
    </h2>
    <p>
      Medical and transaction records are retained for as long as necessary to
      provide care and comply with applicable recordkeeping obligations.
    </p>
  </div>
);

export default PrivacyPolicy;
