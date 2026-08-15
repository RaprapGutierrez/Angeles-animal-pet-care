import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import Layout, { Modal } from "../../components/layout";
import { supabase, sb } from "../../js/Utils/supabase";
import { useCurrentUser } from "../../js/hooks/Usecurrentuser";
import { logActivity } from "../../js/Utils/logActivity";
import { withBranchId } from "../../js/hooks/Usebranchfilter";
import "../../styles/PatientRecord.css";

const userIcon = "/icon/user.png";
const checkIcon = "/icon/already-have-acc.png";
const plusIcon = "/icon/new-acc.png";

const Ic = ({ src, size = 14, style = {} }) => (
  <img
    src={src}
    alt=""
    width={size}
    height={size}
    style={{
      objectFit: "contain",
      flexShrink: 0,
      display: "inline-block",
      verticalAlign: "middle",
      mixBlendMode: "multiply",
      ...style,
    }}
    onError={(e) => {
      e.target.style.display = "none";
    }}
  />
);

const HEALTH_BADGE = {
  Good: "badge-green",
  Fair: "badge-yellow",
  Critical: "badge-red",
};
const STATUS_BADGE = { Admitted: "badge-blue", Outpatient: "badge-gray" };
const FREQ_OPTIONS = [
  "Once daily",
  "Twice daily",
  "Three times daily",
  "Every 8 hours",
  "Every 12 hours",
  "As needed",
  "Weekly",
  "Other",
];
const ROUTE_OPTIONS = [
  "Oral",
  "Topical",
  "Injection",
  "IV",
  "Eye drops",
  "Ear drops",
  "Other",
];
const DRUG_FORM_OPTIONS = [
  "Tablet",
  "Liquid",
  "Injectable",
  "Topical",
  "Capsule",
  "Powder",
  "Other",
];
const VACCINE_OPTIONS = [
  "Rabies Vaccine",
  "DHPP (Distemper, Hepatitis, Parainfluenza, Parvovirus)",
  "Bordetella (Kennel Cough)",
  "Canine Influenza",
  "Leptospirosis",
  "Lyme Disease",
  "FVRCP (Feline Viral Rhinotracheitis, Calicivirus, Panleukopenia)",
  "FeLV (Feline Leukemia)",
  "FIV (Feline Immunodeficiency Virus)",
  "Chlamydia Felis",
  "Other",
];
const VET_OPTIONS = ["Dr. Santos", "Dr. Reyes", "Dr. Cruz", "Dr. Garcia"];

const AGE_OPTIONS = [
  "Under 1 month (Newborn)",
  "1-3 months (Puppy/Kitten)",
  "4-6 months (Puppy/Kitten)",
  "7-12 months (Junior)",
  "1 year old (Young Adult)",
  "2 years old (Young Adult)",
  "3 years old (Adult)",
  "4 years old (Adult)",
  "5 years old (Adult)",
  "6 years old (Adult)",
  "7 years old (Mature Adult)",
  "8 years old (Mature Adult)",
  "9 years old (Senior)",
  "10 years old (Senior)",
  "11-15 years old (Senior)",
  "16+ years old (Senior)",
];

const DOG_BREEDS = [
  "Aspin (Mixed Breed)",
  "Shih Tzu",
  "Siberian Husky",
  "Labrador Retriever",
  "Golden Retriever",
  "German Shepherd",
  "Poodle",
  "Pomeranian",
  "Chihuahua",
  "Beagle",
  "Rottweiler",
  "Dachshund",
  "French Bulldog",
  "Bulldog",
  "Shiba Inu",
  "Japanese Spitz",
  "Belgian Malinois",
  "Doberman Pinscher",
  "Border Collie",
  "Cocker Spaniel",
  "Maltese",
  "Great Dane",
  "Boxer",
  "Pug",
  "Other",
];
const CAT_BREEDS = [
  "Puspin (Mixed Breed)",
  "Persian",
  "Siamese",
  "British Shorthair",
  "Scottish Fold",
  "Maine Coon",
  "Ragdoll",
  "Munchkin",
  "American Shorthair",
  "Bengal",
  "Sphynx",
  "Himalayan",
  "Turkish Angora",
  "Exotic Shorthair",
  "Other",
];

const ADD_TABS = ["info", "vaccination", "treatment"];
const OWNER_STEPS = { ASK: "ask", SEARCH: "search", FORM: "form" };

const T_PATIENTS = "patients";
const T_PROFILES = "profiles";
const T_ROOMS = "rooms";
const T_MESSAGES = "messages";
const T_VACCINATIONS = "vaccinations";
const T_TREATMENTS = "treatments";
const T_PRESCRIPTIONS = "prescriptions";
const T_APPOINTMENTS = "appointments";
const ROWS_PER_PAGE = 10;
const sanitizeContact = (v) => v.replace(/\D/g, "").slice(0, 11);
const sanitizeName = (v) => v.replace(/[^a-zA-Z\s'-]/g, "");

const Sk = ({ w = "100%", h = 14, r = 6, style = {} }) => (
  <div
    className="sk"
    style={{ width: w, height: h, borderRadius: r, flexShrink: 0, ...style }}
  />
);

const StatCardSkeleton = () => (
  <div
    style={{
      background: "var(--card)",
      border: "1.5px solid var(--border)",
      borderRadius: 16,
      padding: 20,
      display: "flex",
      flexDirection: "column",
      gap: 14,
      pointerEvents: "none",
    }}
  >
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div className="sk" style={{ width: 46, height: 46, borderRadius: 12 }} />
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <Sk w="45%" h={11} />
      <Sk w="30%" h={26} />
      <Sk w="60%" h={10} />
    </div>
  </div>
);

const TableRowSkeleton = () => (
  <tr>
    {[120, 100, 90, 110, 70, 60, 50, 80].map((w, i) => (
      <td
        key={i}
        style={{
          padding: "13px 14px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <Sk w={w} h={13} />
      </td>
    ))}
  </tr>
);

// ── Sub-components ────────────────────────────────────────────────────────────
const VaxFields = ({ form, setForm }) => (
  <div className="form-grid">
    <div className="form-group">
      <label>Vaccine Name *</label>
      <CustomSelect
        value={form.name}
        onChange={(val) => setForm({ ...form, name: val })}
        placeholder="Select vaccine"
        options={VACCINE_OPTIONS}
      />
    </div>
    <div className="form-group">
      <label>Date Given *</label>
      <DatePicker
        value={form.date_given}
        onChange={(val) => setForm({ ...form, date_given: val })}
        placeholder="Select date"
      />
    </div>
    <div className="form-group">
      <label>Next Due Date</label>
      <DatePicker
        value={form.next_due}
        onChange={(val) => setForm({ ...form, next_due: val })}
        placeholder="Select date"
      />
    </div>
    <div className="form-group">
      <label>Vet Attendant</label>
      <CustomSelect
        value={form.given_by}
        onChange={(val) => setForm({ ...form, given_by: val })}
        placeholder="— Select Vet —"
        options={VET_OPTIONS}
      />
    </div>
    <div className="form-group">
      <label>Number of Doses</label>
      <input
        type="text"
        inputMode="numeric"
        value={form.doses}
        onChange={(e) => setForm({ ...form, doses: e.target.value })}
        placeholder="e.g. 1"
      />
    </div>
    <div className="form-group">
      <label>Lot Number</label>
      <input
        type="text"
        value={form.lot_number}
        onChange={(e) => setForm({ ...form, lot_number: e.target.value })}
        placeholder="e.g. LN-2026-0417"
      />
    </div>
  </div>
);

const TreatFields = ({ form, setForm }) => (
  <div className="form-grid">
    <div className="form-group">
      <label>Date *</label>
      <input
        type="date"
        value={form.date}
        onChange={(e) => setForm({ ...form, date: e.target.value })}
      />
    </div>
    <div className="form-group">
      <label>Attending Vet</label>
      <CustomSelect
        value={form.vet}
        onChange={(val) => setForm({ ...form, vet: val })}
        placeholder="— Select Vet —"
        options={VET_OPTIONS}
      />
    </div>
    <div className="form-group form-full">
      <label>Diagnosis *</label>
      <input
        type="text"
        value={form.diagnosis}
        onChange={(e) => setForm({ ...form, diagnosis: e.target.value })}
        placeholder="e.g. Skin infection"
      />
    </div>
    <div className="form-group">
      <label>
        Temperature (°C) <span style={{ fontWeight: 400 }}>(optional)</span>
      </label>
      <input
        type="text"
        inputMode="numeric"
        value={form.heart_rate}
        onChange={(e) =>
          setForm({ ...form, heart_rate: e.target.value.replace(/\D/g, "") })
        }
        placeholder="e.g. 120"
      />
    </div>
    <div className="form-group">
      <label>
        Heart Rate (bpm) <span style={{ fontWeight: 400 }}>(optional)</span>
      </label>
      <input
        type="text"
        inputMode="numeric"
        value={form.heart_rate}
        onChange={(e) => setForm({ ...form, heart_rate: e.target.value })}
        placeholder="e.g. 120"
      />
    </div>
    <div className="form-group">
      <label>
        Weight (kg) <span style={{ fontWeight: 400 }}>(optional)</span>
      </label>
      <input
        type="text"
        inputMode="decimal"
        value={form.weight}
        onChange={(e) =>
          setForm({ ...form, weight: e.target.value.replace(/[^0-9.]/g, "") })
        }
        placeholder="e.g. 8.2"
      />
    </div>
    <div className="form-group form-full">
      <label>Notes</label>
      <textarea
        value={form.notes}
        onChange={(e) => setForm({ ...form, notes: e.target.value })}
        placeholder="Treatment details..."
        style={{ minHeight: 72 }}
      />
    </div>
  </div>
);

const RoomSelect = ({ value, onChange, rooms, accent = "#6366f1" }) => {
  const [open, setOpen] = React.useState(false);
  const [dropPos, setDropPos] = React.useState({ top: 0, left: 0, width: 0 });
  const triggerRef = React.useRef(null);
  const ref = React.useRef(null);
  const availableRooms = rooms.filter((r) => r.status === "Available");
  const unavailableRooms = rooms.filter((r) => r.status !== "Available");
  const selectedRoom = rooms.find((r) => r.number === value);
  const label = value
    ? `${value}${selectedRoom?.type ? ` · ${selectedRoom.type}` : ""}`
    : "— No room assigned —";

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
      const dropHeight = Math.min((rooms.length + 1) * 38, 260);
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

  const selectRoom = (num) => {
    onChange({ target: { value: num } });
    setOpen(false);
  };

  const OptionRow = ({ isEmpty, isSelected, optLabel, onClick }) => (
    <div
      onClick={onClick}
      style={{
        padding: "8px 10px",
        fontSize: 13,
        fontWeight: isSelected ? 700 : 500,
        color: isEmpty ? "#b0bac9" : isSelected ? accent : "var(--text)",
        cursor: isEmpty && !onClick ? "default" : "pointer",
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
        if (!isSelected && !isEmpty)
          e.currentTarget.style.background = "#f4f6fa";
      }}
      onMouseLeave={(e) => {
        if (!isSelected)
          e.currentTarget.style.background = isSelected
            ? `${accent}12`
            : "transparent";
      }}
    >
      <div
        style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}
      >
        {!isEmpty && (
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              flexShrink: 0,
              background: isSelected ? accent : "transparent",
              border: `1.5px solid ${isSelected ? accent : "#cbd5e1"}`,
              transition: "background 0.15s, border-color 0.15s",
            }}
          />
        )}
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
      {isSelected && !isEmpty && (
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
              background: "var(--card)",
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
            <OptionRow
              isEmpty
              optLabel="— No room assigned —"
              isSelected={!value}
              onClick={() => selectRoom("")}
            />
            {availableRooms.length > 0 && (
              <>
                <div
                  style={{
                    padding: "6px 10px 2px",
                    fontSize: 10,
                    fontWeight: 800,
                    color: "#94a3b8",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  Available
                </div>
                {availableRooms.map((r) => (
                  <OptionRow
                    key={r.id}
                    isEmpty={false}
                    isSelected={r.number === value}
                    optLabel={`${r.number}${r.type ? ` · ${r.type}` : ""}${r.infected ? " · Isolation" : ""}`}
                    onClick={() => selectRoom(r.number)}
                  />
                ))}
              </>
            )}
            {unavailableRooms.length > 0 && (
              <>
                <div
                  style={{
                    padding: "6px 10px 2px",
                    fontSize: 10,
                    fontWeight: 800,
                    color: "#94a3b8",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  Unavailable
                </div>
                {unavailableRooms.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      padding: "8px 10px",
                      fontSize: 13,
                      fontWeight: 500,
                      color: "#cbd5e1",
                      cursor: "not-allowed",
                      borderRadius: 8,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        flexShrink: 0,
                        border: "1.5px solid #e2e8f0",
                      }}
                    />
                    <span
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {r.number}
                      {r.type ? ` · ${r.type}` : ""} — {r.status}
                      {r.patient ? ` (${r.patient})` : ""}
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      {rooms.length === 0 ? (
        <div
          style={{
            padding: "9px 12px",
            border: "1.5px solid var(--border)",
            borderRadius: 8,
            fontSize: 13,
            color: "var(--muted)",
            background: "var(--bg)",
          }}
        >
          Loading rooms…
        </div>
      ) : (
        <div style={{ position: "relative", width: "100%" }}>
          <div
            ref={triggerRef}
            onClick={handleOpen}
            style={{
              width: "100%",
              padding: "8px 34px 8px 12px",
              border: "1.5px solid",
              borderRadius: 9,
              background: open
                ? "linear-gradient(135deg, #ffffff 0%, #f5f3ff 100%)"
                : "linear-gradient(to bottom, #ffffff 0%, #f8fafc 100%)",
              fontSize: 13,
              fontWeight: 600,
              color: value ? "var(--text)" : "#b0bac9",
              cursor: "pointer",
              userSelect: "none",
              boxSizing: "border-box",
              boxShadow: open
                ? `0 0 0 3px ${accent}22, 0 2px 8px rgba(0,0,0,0.08)`
                : "0 1px 3px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)",
              borderColor: open ? accent : "#dde3ec",
              transition:
                "border-color 0.18s, box-shadow 0.18s, background 0.18s",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              position: "relative",
              minHeight: 36,
            }}
            onMouseEnter={(e) => {
              if (!open) {
                e.currentTarget.style.borderColor = "#a5b4fc";
                e.currentTarget.style.boxShadow =
                  "0 2px 8px rgba(99,102,241,0.10), inset 0 1px 0 rgba(255,255,255,0.9)";
              }
            }}
            onMouseLeave={(e) => {
              if (!open) {
                e.currentTarget.style.borderColor = "#dde3ec";
                e.currentTarget.style.boxShadow =
                  "0 1px 3px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)";
              }
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
                transition: "background 0.18s",
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
                  transition: "transform 0.2s, stroke 0.18s",
                  transform: open ? "rotate(180deg)" : "rotate(0deg)",
                }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </div>
          {portal}
        </div>
      )}
      <div
        style={{
          marginTop: 5,
          fontSize: 11,
          color: "var(--muted)",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "#16a34a",
            display: "inline-block",
          }}
        />
        {availableRooms.length} available
        <span
          style={{
            marginLeft: 6,
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "#9ca3af",
            display: "inline-block",
          }}
        />
        {unavailableRooms.length} unavailable
      </div>
    </>
  );
};

const CredentialCard = ({ credentials, onClose }) => {
  const [copied, setCopied] = React.useState(false);
  const copyAll = () => {
    const text = `Name: ${credentials.fullName}\nEmail: ${credentials.email}\nPassword: ${credentials.password}`;
    navigator.clipboard?.writeText(text).catch(() => {
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1200,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          background: "var(--card)",
          borderRadius: 14,
          boxShadow: "0 24px 64px rgba(0,0,0,0.30)",
          width: "100%",
          maxWidth: 440,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            background: "linear-gradient(135deg,#f0fdf4,#dcfce7)",
            padding: "20px 24px 16px",
            borderBottom: "1px solid #bbf7d0",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "#16a34a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ic
                src={checkIcon}
                size={24}
                style={{
                  mixBlendMode: "normal",
                  filter: "brightness(0) invert(1)",
                }}
              />
            </div>
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: 16,
                  fontWeight: 800,
                  color: "#14532d",
                }}
              >
                Account Created!
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: 12,
                  color: "#16a34a",
                  marginTop: 2,
                }}
              >
                Share these credentials with the owner
              </p>
            </div>
          </div>
        </div>
        <div style={{ padding: "20px 24px" }}>
          {[
            ["Name", credentials.fullName],
            ["Email", credentials.email],
            ["Password", credentials.password],
          ].map(([label, value]) => (
            <div key={label} style={{ marginBottom: 12 }}>
              <p
                style={{
                  margin: "0 0 4px",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.4px",
                }}
              >
                {label}
              </p>
              <div
                style={{
                  background: "var(--bg)",
                  border: "1.5px solid var(--border)",
                  borderRadius: 8,
                  padding: "9px 14px",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--text)",
                  fontFamily: label === "Password" ? "monospace" : "inherit",
                }}
              >
                {value}
              </div>
            </div>
          ))}
          <div
            style={{
              background: "#fffbeb",
              border: "1px solid #fde68a",
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: 12,
              color: "#92400e",
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              marginTop: 4,
            }}
          >
            <span>
              Please save or share these credentials now. The password won't be
              shown again.
            </span>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            padding: "14px 24px",
            borderTop: "1px solid var(--border)",
          }}
        >
          <button
            className="btn btn-ghost"
            style={{ width: "auto" }}
            onClick={copyAll}
          >
            {copied ? "Copied!" : "Copy All"}
          </button>
          <button
            className="btn btn-primary"
            style={{ width: "auto" }}
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

const LiveToast = ({ message, show, type = "success" }) => {
  const cfg = {
    success: {
      accent: "#22c55e",
      iconBg: "#f0fdf4",
      iconColor: "#16a34a",
      labelBg: "#dcfce7",
      labelColor: "#166534",
      label: "Success",
      icon: (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ),
    },
    error: {
      accent: "#ef4444",
      iconBg: "#fef2f2",
      iconColor: "#dc2626",
      labelBg: "#fee2e2",
      labelColor: "#991b1b",
      label: "Error",
      icon: (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      ),
    },
    info: {
      accent: "#3b82f6",
      iconBg: "#eff6ff",
      iconColor: "#2563eb",
      labelBg: "#dbeafe",
      labelColor: "#1e40af",
      label: "Info",
      icon: (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      ),
    },
  };
  const c = cfg[type] || cfg.success;
  return (
    <div
      className="live-toast"
      style={{
        width: 340,
        pointerEvents: "none",
        position: "relative",
        opacity: show ? 1 : 0,
        transform: show
          ? "translateX(0) scale(1)"
          : "translateX(calc(100% + 32px)) scale(0.97)",
        transition:
          "transform 0.32s cubic-bezier(0.22,1,0.36,1), opacity 0.32s ease",
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        overflow: "hidden",
        boxShadow: "0 4px 20px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: c.accent,
        }}
      />
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 11,
          padding: "14px 14px 12px",
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            flexShrink: 0,
            background: c.iconBg,
            color: c.iconColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginTop: 1,
          }}
        >
          {c.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ marginBottom: 5 }}>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: c.labelColor,
                background: c.labelBg,
                borderRadius: 4,
                padding: "2px 7px",
              }}
            >
              {c.label}
            </span>
          </div>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text)",
              lineHeight: 1.4,
            }}
          >
            {message}
          </p>
        </div>
      </div>
      <div style={{ height: 2, background: `${c.accent}22` }}>
        <div
          style={{
            height: "100%",
            background: c.accent,
            opacity: 0.6,
            width: show ? "0%" : "100%",
            transition: show ? "width 3s linear" : "none",
          }}
        />
      </div>
    </div>
  );
};

const EditIcon = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const CustomSelect = ({
  value,
  onChange,
  options,
  placeholder = "—",
  accent = "#6366f1",
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
              background: "var(--card)",
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
            {[{ value: "", label: placeholder }, ...options].map((opt, i) => {
              const optVal = opt.value ?? opt;
              const optLabel = opt.label ?? opt;
              const isSelected = optVal === value;
              const isEmpty = optVal === "";
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
                    color: isEmpty
                      ? "#b0bac9"
                      : isSelected
                        ? accent
                        : "var(--text)",
                    cursor: isEmpty ? "default" : "pointer",
                    transition: "background 0.12s, color 0.12s",
                    background: isSelected ? `${accent}12` : "transparent",
                    borderRadius: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    marginBottom: i === 0 && !isEmpty ? 0 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected && !isEmpty)
                      e.currentTarget.style.background = "#f4f6fa";
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected)
                      e.currentTarget.style.background = isSelected
                        ? `${accent}12`
                        : "transparent";
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
                    {!isEmpty && (
                      <div
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          flexShrink: 0,
                          background: isSelected ? accent : "transparent",
                          border: `1.5px solid ${isSelected ? accent : "#cbd5e1"}`,
                          transition: "background 0.15s, border-color 0.15s",
                        }}
                      />
                    )}
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
                  {isSelected && !isEmpty && (
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
      {/* Trigger */}
      <div
        ref={triggerRef}
        onClick={handleOpen}
        style={{
          width: "100%",
          padding: "8px 34px 8px 12px",
          border: "1.5px solid",
          borderRadius: 9,
          background: open
            ? "linear-gradient(135deg, #ffffff 0%, #f5f3ff 100%)"
            : "linear-gradient(to bottom, #ffffff 0%, #f8fafc 100%)",
          fontSize: 13,
          fontWeight: 600,
          color: value ? "var(--text)" : "#b0bac9",
          cursor: "pointer",
          userSelect: "none",
          boxSizing: "border-box",
          boxShadow: open
            ? `0 0 0 3px ${accent}22, 0 2px 8px rgba(0,0,0,0.08)`
            : "0 1px 3px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)",
          borderColor: open ? accent : "#dde3ec",
          transition: "border-color 0.18s, box-shadow 0.18s, background 0.18s",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          position: "relative",
          minHeight: 36,
        }}
        onMouseEnter={(e) => {
          if (!open) {
            e.currentTarget.style.borderColor = "#a5b4fc";
            e.currentTarget.style.boxShadow =
              "0 2px 8px rgba(99,102,241,0.10), inset 0 1px 0 rgba(255,255,255,0.9)";
          }
        }}
        onMouseLeave={(e) => {
          if (!open) {
            e.currentTarget.style.borderColor = "#dde3ec";
            e.currentTarget.style.boxShadow =
              "0 1px 3px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)";
          }
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
            transition: "background 0.18s",
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
              transition: "transform 0.2s, stroke 0.18s",
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

const DatePicker = ({
  value,
  onChange,
  placeholder = "Pick a date",
  min = "",
}) => {
  const [open, setOpen] = React.useState(false);
  const [viewDate, setViewDate] = React.useState(() =>
    value ? new Date(value + "T00:00:00") : new Date(),
  );
  const triggerRef = React.useRef(null);
  const popRef = React.useRef(null);

  React.useEffect(() => {
    if (value) setViewDate(new Date(value + "T00:00:00"));
  }, [value]);

  React.useEffect(() => {
    const handler = (e) => {
      if (
        popRef.current &&
        !popRef.current.contains(e.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target)
      )
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const [popPos, setPopPos] = React.useState({
    top: 0,
    left: 0,
    width: 280,
    fixed: false,
  });
  const handleOpen = () => {
    if (!open && triggerRef.current) {
      const isMobile = window.innerWidth < 480;
      if (isMobile) {
        const popWidth = Math.min(320, window.innerWidth - 24);
        setPopPos({
          top: Math.max(12, (window.innerHeight - 360) / 2),
          left: (window.innerWidth - popWidth) / 2,
          width: popWidth,
          fixed: true,
        });
      } else {
        const rect = triggerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const popWidth = Math.max(rect.width, 280);
        let left = rect.left;
        const maxLeft = window.innerWidth - popWidth - 8;
        if (left > maxLeft) left = Math.max(8, maxLeft);
        setPopPos({
          top:
            spaceBelow > 320
              ? rect.bottom + 6
              : Math.max(8, rect.top - 310 - 6),
          left,
          width: popWidth,
          fixed: true,
        });
      }
    }
    setOpen((o) => !o);
  };

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const MONTHS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const todayStr = new Date().toISOString().split("T")[0];

  const selectDay = (day) => {
    const m = String(month + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    const str = `${year}-${m}-${d}`;
    if (min && str < min) return;
    onChange(str);
    setOpen(false);
  };

  const displayValue = value
    ? new Date(value + "T00:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : placeholder;

  const portal =
    open && typeof document !== "undefined"
      ? ReactDOM.createPortal(
          <div
            ref={popRef}
            style={{
              position: "fixed",
              top: popPos.top,
              left: popPos.left,
              width: popPos.width,
              zIndex: 99999,
              background: "var(--card)",
              border: "1.5px solid #e8edf4",
              borderRadius: 14,
              boxShadow:
                "0 16px 48px rgba(0,0,0,0.16), 0 4px 12px rgba(0,0,0,0.08)",
              overflow: "hidden",
              maxHeight: "calc(100vh - 24px)",
              overflowY: "auto",
            }}
          >
            {/* Header */}
            <div
              style={{
                background: "linear-gradient(135deg,#0f172a,#1e3a8a)",
                padding: "14px 16px 12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <button
                onClick={() => setViewDate(new Date(year, month - 1, 1))}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.2)",
                  background: "rgba(255,255,255,0.1)",
                  cursor: "pointer",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 800,
                    color: "#fff",
                    lineHeight: 1.2,
                  }}
                >
                  {MONTHS[month]}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "rgba(255,255,255,0.6)",
                    fontWeight: 600,
                  }}
                >
                  {year}
                </div>
              </div>
              <button
                onClick={() => setViewDate(new Date(year, month + 1, 1))}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.2)",
                  background: "rgba(255,255,255,0.1)",
                  cursor: "pointer",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>

            {/* Day labels */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7,1fr)",
                padding: "10px 12px 4px",
                gap: 2,
              }}
            >
              {DAY_LABELS.map((d, i) => (
                <div
                  key={d}
                  style={{
                    textAlign: "center",
                    fontSize: 10,
                    fontWeight: 800,
                    color:
                      i === 0 ? "#ef4444" : i === 6 ? "#3b82f6" : "#94a3b8",
                    padding: "3px 0",
                    textTransform: "uppercase",
                    letterSpacing: "0.4px",
                  }}
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Day grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7,1fr)",
                padding: "2px 12px 12px",
                gap: 2,
              }}
            >
              {cells.map((day, i) => {
                if (!day) return <div key={i} />;
                const m = String(month + 1).padStart(2, "0");
                const d = String(day).padStart(2, "0");
                const dateStr = `${year}-${m}-${d}`;
                const isSelected = dateStr === value;
                const isToday = dateStr === todayStr;
                const isDisabled = min && dateStr < min;
                const isSun = i % 7 === 0;
                const isSat = i % 7 === 6;
                return (
                  <div
                    key={i}
                    onClick={() => !isDisabled && selectDay(day)}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      fontWeight: isSelected ? 800 : isToday ? 700 : 500,
                      cursor: isDisabled ? "not-allowed" : "pointer",
                      background: isSelected
                        ? "linear-gradient(135deg,#1e3a8a,#3b82f6)"
                        : isToday
                          ? "#eff6ff"
                          : "transparent",
                      color: isSelected
                        ? "#fff"
                        : isDisabled
                          ? "#cbd5e1"
                          : isToday
                            ? "#1e40af"
                            : isSun
                              ? "#ef4444"
                              : isSat
                                ? "#3b82f6"
                                : "var(--text)",
                      border:
                        isToday && !isSelected ? "1.5px solid #bfdbfe" : "none",
                      boxShadow: isSelected
                        ? "0 2px 8px rgba(30,58,138,0.35)"
                        : "none",
                      transition: "background 0.12s",
                      margin: "auto",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected && !isDisabled)
                        e.currentTarget.style.background = "#f1f5f9";
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected)
                        e.currentTarget.style.background = isToday
                          ? "#eff6ff"
                          : "transparent";
                    }}
                  >
                    {day}
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div
              style={{
                padding: "8px 12px 10px",
                borderTop: "1px solid #f1f5f9",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <button
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#64748b",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  padding: "4px 8px",
                  borderRadius: 6,
                }}
              >
                Clear
              </button>
              <button
                onClick={() => {
                  selectDay(new Date().getDate());
                  setViewDate(new Date());
                }}
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#1e40af",
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  padding: "4px 10px",
                  borderRadius: 6,
                }}
              >
                Today
              </button>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div style={{ position: "relative" }}>
      <div
        ref={triggerRef}
        onClick={handleOpen}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 12px",
          border: "1.5px solid",
          borderColor: open ? "#6366f1" : "#dde3ec",
          borderRadius: 9,
          background: open
            ? "linear-gradient(135deg,#ffffff,#f5f3ff)"
            : "linear-gradient(to bottom,#ffffff,#f8fafc)",
          cursor: "pointer",
          userSelect: "none",
          minWidth: 160,
          boxShadow: open
            ? "0 0 0 3px rgba(99,102,241,0.12),0 2px 8px rgba(0,0,0,0.08)"
            : "0 1px 3px rgba(0,0,0,0.06),inset 0 1px 0 rgba(255,255,255,0.9)",
          transition: "all 0.18s",
        }}
        onMouseEnter={(e) => {
          if (!open) {
            e.currentTarget.style.borderColor = "#a5b4fc";
            e.currentTarget.style.boxShadow =
              "0 2px 8px rgba(99,102,241,0.10),inset 0 1px 0 rgba(255,255,255,0.9)";
          }
        }}
        onMouseLeave={(e) => {
          if (!open) {
            e.currentTarget.style.borderColor = "#dde3ec";
            e.currentTarget.style.boxShadow =
              "0 1px 3px rgba(0,0,0,0.06),inset 0 1px 0 rgba(255,255,255,0.9)";
          }
        }}
      >
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: 6,
            background: open ? "#6366f1" : "#f1f5f9",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            transition: "background 0.18s",
          }}
        >
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke={open ? "#fff" : "#94a3b8"}
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </div>
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: value ? "var(--text)" : "#b0bac9",
            flex: 1,
            whiteSpace: "nowrap",
          }}
        >
          {displayValue}
        </span>
        {value && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
            }}
            style={{
              width: 16,
              height: 16,
              borderRadius: "50%",
              background: "#e2e8f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <svg
              width="8"
              height="8"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#64748b"
              strokeWidth="3"
              strokeLinecap="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </div>
        )}
      </div>
      {portal}
    </div>
  );
};

// ─── Premium View Tab Components ──────────────────────────────────────────────

/** Patient Info Tab — Hero card + structured fields */
const PatientInfoTab = ({ patient, treatments = [] }) => {
  const healthColor =
    { Good: "#16a34a", Fair: "#d97706", Critical: "#dc2626" }[patient.health] ||
    "#64748b";
  const statusColor =
    { Admitted: "#1e3a8a", Outpatient: "#0891b2" }[patient.status] || "#64748b";
  const latestTreat = [...treatments].sort(
    (a, b) => new Date(b.date || 0) - new Date(a.date || 0),
  )[0];
  const latestTemp = latestTreat?.temp || patient.temp;
  const latestHR = latestTreat?.heart_rate || patient.heart_rate;
  const latestWeight = latestTreat?.weight || patient.weight;
  const hasVitals = latestTemp || latestHR || latestWeight;

  return (
    <div style={{ paddingTop: 4 }}>
      {/* Hero banner */}
      <div className="patient-hero">
        <div style={{ position: "relative", zIndex: 1 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              marginBottom: 14,
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                flexShrink: 0,
                background: patient.species === "Cat" ? "#f0fdf4" : "#eff6ff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 26,
                border: "2px solid rgba(255,255,255,0.2)",
              }}
            >
              {patient.species === "Cat" ? (
                <svg
                  width="26"
                  height="26"
                  viewBox="0 0 16 16"
                  fill="#16a34a"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M1 7L4.80061 1.43926C5.56059 0.527292 6.68638 0 7.8735 0H8V4L12 5L15 10L14.1875 11.2188C13.4456 12.3316 12.1967 13 10.8593 13H9L7 16H5L1 7ZM10 9C10.5523 9 11 8.55229 11 8C11 7.44772 10.5523 7 10 7C9.44771 7 9 7.44772 9 8C9 8.55229 9.44771 9 10 9Z"
                  />
                  <path d="M10 0.465878V2.43845L12 2.93845V0H11.8735C11.2125 0 10.5704 0.163501 10 0.465878Z" />
                </svg>
              ) : (
                <svg
                  width="26"
                  height="26"
                  viewBox="0 0 16 16"
                  fill="#1d4ed8"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M16 4V7C16 9.20914 14.2091 11 12 11H10V15H0V13L0.931622 10.8706C1.25226 10.9549 1.59036 11 1.94124 11C3.74931 11 5.32536 9.76947 5.76388 8.01538L3.82359 7.53031C3.60766 8.39406 2.83158 9.00001 1.94124 9.00001C1.87789 9.00001 1.81539 8.99702 1.75385 8.99119C1.02587 8.92223 0.432187 8.45551 0.160283 7.83121C0.0791432 7.64491 0.0266588 7.44457 0.00781272 7.23658C-0.0112323 7.02639 0.00407892 6.80838 0.0588889 6.58914C0.0588882 6.58914 0.0588896 6.58913 0.0588889 6.58914L0.698705 4.02986C1.14387 2.24919 2.7438 1 4.57928 1H10L12 4H16ZM9 6C9.55229 6 10 5.55228 10 5C10 4.44772 9.55229 4 9 4C8.44771 4 8 4.44772 8 5C8 5.55228 8.44771 6 9 6Z"
                  />
                </svg>
              )}
            </div>
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: 20,
                  fontWeight: 800,
                  color: "#fff",
                  lineHeight: 1.2,
                }}
              >
                {patient.name}
              </h2>
              <p
                style={{
                  margin: "4px 0 0",
                  fontSize: 13,
                  color: "rgba(255,255,255,0.65)",
                }}
              >
                {patient.species}
                {patient.breed ? ` · ${patient.breed}` : ""}
                {patient.gender ? ` · ${patient.gender}` : ""}
              </p>
            </div>
            <div
              style={{
                marginLeft: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 6,
                alignItems: "flex-end",
              }}
            >
              <span
                style={{
                  background: `${healthColor}22`,
                  border: `1.5px solid ${healthColor}66`,
                  color:
                    healthColor === "#16a34a"
                      ? "#bbf7d0"
                      : healthColor === "#d97706"
                        ? "#fde68a"
                        : "#fca5a5",
                  borderRadius: 20,
                  padding: "3px 12px",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {patient.health}
              </span>
              <span
                style={{
                  background: `${statusColor}22`,
                  border: `1.5px solid ${statusColor}55`,
                  color: "#bfdbfe",
                  borderRadius: 20,
                  padding: "3px 12px",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {patient.status}
              </span>
            </div>
          </div>
          {/* Quick stats row */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              {
                icon: (
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                ),
                label: patient.room
                  ? `Room ${patient.room}`
                  : "No Room Assigned",
              },
              {
                icon: (
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                ),
                label: patient.owner || "No Owner",
              },
              {
                icon: (
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5 19.79 19.79 0 0 1 1.6 4.9 2 2 0 0 1 3.58 2.72h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.1a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.5 17.5z" />
                  </svg>
                ),
                label: patient.contact || "No Contact",
              },
            ].map(({ icon, label }) => (
              <span
                key={label}
                style={{
                  background: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 8,
                  padding: "5px 10px",
                  fontSize: 12,
                  color: "rgba(255,255,255,0.8)",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span>{icon}</span> {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Fields grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {[
          { label: "Patient Name", value: patient.name },
          { label: "Species", value: patient.species },
          { label: "Breed", value: patient.breed || "—" },
          { label: "Sex / Gender", value: patient.gender || "—" },
          { label: "Age", value: patient.age || "—" },
          { label: "Owner Name", value: patient.owner || "—" },
          { label: "Contact Number", value: patient.contact || "—" },
          { label: "Owner Email", value: patient.owner_email || "—" },
          {
            label: "Assigned Room",
            value: patient.room ? `Room ${patient.room}` : "N/A",
          },
        ].map(({ label, value, icon }) => (
          <div key={label} className="info-field-card">
            <span className="info-field-label">{label}</span>
            <span className="info-field-value">{value}</span>
          </div>
        ))}

        {/* Latest Vital Signs — full width, optional */}
        {hasVitals && (
          <div style={{ gridColumn: "1 / -1" }}>
            <div
              style={{
                background: "#eff6ff",
                border: "1.5px solid #bfdbfe",
                borderRadius: 10,
                padding: "14px 16px",
                display: "flex",
                gap: 24,
                flexWrap: "wrap",
              }}
            >
              <div style={{ flex: "0 0 100%" }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: 10,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                    color: "#1e40af",
                  }}
                >
                  Latest Vital Signs
                  {latestTreat ? ` — ${latestTreat.date}` : ""}
                </p>
              </div>
              <div>
                <span
                  style={{
                    fontSize: 10,
                    color: "#64748b",
                    fontWeight: 700,
                    textTransform: "uppercase",
                  }}
                >
                  Temp
                </span>
                <br />
                <span
                  style={{ fontSize: 15, fontWeight: 700, color: "#1e293b" }}
                >
                  {latestTemp || "—"}
                  {latestTemp ? "°C" : ""}
                </span>
              </div>
              <div>
                <span
                  style={{
                    fontSize: 10,
                    color: "#64748b",
                    fontWeight: 700,
                    textTransform: "uppercase",
                  }}
                >
                  Heart Rate
                </span>
                <br />
                <span
                  style={{ fontSize: 15, fontWeight: 700, color: "#1e293b" }}
                >
                  {latestHR || "—"}
                  {latestHR ? " bpm" : ""}
                </span>
              </div>
              <div>
                <span
                  style={{
                    fontSize: 10,
                    color: "#64748b",
                    fontWeight: 700,
                    textTransform: "uppercase",
                  }}
                >
                  Weight
                </span>
                <br />
                <span
                  style={{ fontSize: 15, fontWeight: 700, color: "#1e293b" }}
                >
                  {latestWeight || "—"}
                  {latestWeight ? " kg" : ""}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Condition — full width */}
        {patient.condition && (
          <div style={{ gridColumn: "1 / -1" }}>
            <div
              style={{
                background: "#fffbeb",
                border: "1.5px solid #fde68a",
                borderRadius: 10,
                padding: "14px 16px",
              }}
            >
              <p
                style={{
                  margin: "0 0 6px",
                  fontSize: 10,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  color: "#92400e",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
                Condition / Diagnosis
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  color: "#78350f",
                  lineHeight: 1.6,
                  fontWeight: 500,
                }}
              >
                {patient.condition}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/** Vaccination Card Tab */
const VaxCard = ({ v, onEdit, onDelete, onPrint, isEditing }) => {
  const isExpired = v.next_due && new Date(v.next_due) < new Date();
  const isDueSoon =
    v.next_due &&
    !isExpired &&
    new Date(v.next_due) - new Date() < 30 * 24 * 3600 * 1000;

  return (
    <div className="vax-card">
      {/* Stamp */}
      <div className="vax-stamp">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#16a34a"
          strokeWidth="3"
          strokeLinecap="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span className="vax-stamp-text">VACC'D</span>
      </div>

      {/* Card header */}
      <div style={{ marginBottom: 12, paddingRight: 60 }}>
        <h4
          style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#14532d" }}
        >
          {v.name}
        </h4>
        {v.given_by && (
          <p
            style={{
              margin: "3px 0 0",
              fontSize: 12,
              color: "#16a34a",
              fontWeight: 600,
            }}
          >
            Administered by: {v.given_by}
          </p>
        )}
      </div>

      {/* Dates row */}
      <div
        style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}
      >
        <div
          style={{
            background: "#dcfce7",
            border: "1px solid #86efac",
            borderRadius: 8,
            padding: "6px 12px",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 10,
              fontWeight: 700,
              color: "#166534",
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            Date Given
          </p>
          <p
            style={{
              margin: "2px 0 0",
              fontSize: 13,
              fontWeight: 700,
              color: "#14532d",
            }}
          >
            {new Date(v.date_given).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        {v.next_due && (
          <div
            style={{
              background: isExpired
                ? "#fef2f2"
                : isDueSoon
                  ? "#fffbeb"
                  : "#f0fdf4",
              border: `1px solid ${isExpired ? "#fca5a5" : isDueSoon ? "#fde68a" : "#86efac"}`,
              borderRadius: 8,
              padding: "6px 12px",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 10,
                fontWeight: 700,
                color: isExpired
                  ? "#991b1b"
                  : isDueSoon
                    ? "#92400e"
                    : "#166534",
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              Next Due
            </p>
            <p
              style={{
                margin: "2px 0 0",
                fontSize: 13,
                fontWeight: 700,
                color: isExpired
                  ? "#dc2626"
                  : isDueSoon
                    ? "#d97706"
                    : "#14532d",
              }}
            >
              {new Date(v.next_due).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
            {isExpired && (
              <span
                style={{
                  fontSize: 10,
                  color: "#dc2626",
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 3,
                }}
              >
                <svg
                  width="9"
                  height="9"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                OVERDUE
              </span>
            )}
            {isDueSoon && (
              <span
                style={{
                  fontSize: 10,
                  color: "#d97706",
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 3,
                }}
              >
                <svg
                  width="9"
                  height="9"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                Due soon
              </span>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div
        style={{
          display: "flex",
          gap: 8,
          borderTop: "1px dashed #86efac",
          paddingTop: 10,
          marginTop: 4,
        }}
      >
        <button
          onClick={() => onEdit(v)}
          style={{
            background: "none",
            border: "none",
            color: "#16a34a",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 700,
            fontFamily: "inherit",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <EditIcon /> Edit
        </button>
        <button
          onClick={() => onDelete(v.id)}
          style={{
            background: "none",
            border: "none",
            color: "#ef4444",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 600,
            fontFamily: "inherit",
          }}
        >
          Delete
        </button>
      </div>
    </div>
  );
};

/** Treatment Paper Tab */
const TreatmentPaper = ({ t, onEdit, onDelete }) => (
  <div className="treat-paper treat-lines">
    {/* Corner fold */}
    <div
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        width: 0,
        height: 0,
        borderStyle: "solid",
        borderWidth: "0 24px 24px 0",
        borderColor: "transparent #e8e0c8 transparent transparent",
      }}
    />

    <div style={{ paddingLeft: 50 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 12,
          paddingRight: 20,
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 4,
            }}
          >
            <span
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 28,
                height: 28,
                borderRadius: 6,
                background: "#f1f5f9",
                flexShrink: 0,
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#64748b"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </span>
            <h4
              style={{
                margin: 0,
                fontSize: 15,
                fontWeight: 800,
                color: "#1e293b",
              }}
            >
              {t.diagnosis}
            </h4>
          </div>
          {t.vet && (
            <p
              style={{
                margin: 0,
                fontSize: 12,
                color: "#64748b",
                fontStyle: "italic",
              }}
            >
              Dr. {t.vet}
            </p>
          )}
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <p
            style={{
              margin: 0,
              fontSize: 11,
              color: "#94a3b8",
              fontWeight: 600,
            }}
          >
            {new Date(t.date).toLocaleDateString("en-US", {
              weekday: "short",
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* Notes — lined paper style */}
      {t.notes && (
        <div
          style={{
            borderTop: "1px solid rgba(147,197,253,0.4)",
            paddingTop: 10,
          }}
        >
          <p
            style={{
              margin: "0 0 4px",
              fontSize: 10,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: 1,
              color: "#94a3b8",
            }}
          >
            Clinical Notes
          </p>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              color: "#334155",
              lineHeight: 1.8,
              whiteSpace: "pre-wrap",
            }}
          >
            {t.notes}
          </p>
        </div>
      )}

      {/* Actions */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginTop: 12,
          borderTop: "1px solid #e8e0c8",
          paddingTop: 8,
        }}
      >
        <button
          onClick={() => onEdit(t)}
          style={{
            background: "none",
            border: "none",
            color: "#d97706",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 700,
            fontFamily: "inherit",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <EditIcon /> Edit
        </button>
        <button
          onClick={() => onDelete(t.id)}
          style={{
            background: "none",
            border: "none",
            color: "#ef4444",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 600,
            fontFamily: "inherit",
          }}
        >
          Delete
        </button>
      </div>
    </div>
  </div>
);

/** Prescription Slip */
const PrescriptionSlip = ({ rx, onEdit, onDelete }) => (
  <div className="rx-slip">
    {/* Header */}
    <div className="rx-slip-header" style={{ position: "relative" }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "rgba(255,255,255,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgba(255,255,255,0.9)"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M10.5 20H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H20a2 2 0 0 1 2 2v3" />
              <circle cx="18" cy="18" r="3" />
              <path d="m22 22-1.5-1.5" />
            </svg>
          </div>
          <div>
            <h4
              style={{
                margin: 0,
                fontSize: 15,
                fontWeight: 800,
                color: "#fff",
              }}
            >
              {rx.medicine}
            </h4>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.65)" }}>
              {rx.dosage}
            </span>
          </div>
        </div>
      </div>
      <span className="rx-symbol">℞</span>
      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
        <button
          onClick={() => onEdit(rx)}
          style={{
            background: "rgba(255,255,255,0.15)",
            border: "1px solid rgba(255,255,255,0.25)",
            color: "#fff",
            cursor: "pointer",
            fontSize: 11,
            fontWeight: 700,
            fontFamily: "inherit",
            borderRadius: 6,
            padding: "5px 10px",
          }}
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(rx.id)}
          style={{
            background: "rgba(239,68,68,0.25)",
            border: "1px solid rgba(239,68,68,0.4)",
            color: "#fca5a5",
            cursor: "pointer",
            fontSize: 11,
            fontWeight: 700,
            fontFamily: "inherit",
            borderRadius: 6,
            padding: "5px 10px",
          }}
        >
          Delete
        </button>
      </div>
    </div>

    {/* Body */}
    <div className="rx-slip-body">
      {/* Pill tags */}
      <div
        style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}
      >
        {rx.frequency && (
          <span className="rx-field-pill blue">
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>{" "}
            {rx.frequency}
          </span>
        )}
        {rx.route && (
          <span className="rx-field-pill green">
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <line x1="12" y1="2" x2="12" y2="6" />
              <path d="M12 14v8" />
              <path d="M8 10c0-2.2 1.8-4 4-4s4 1.8 4 4" />
            </svg>{" "}
            {rx.route}
          </span>
        )}
        {rx.duration && (
          <span className="rx-field-pill amber">
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>{" "}
            {rx.duration}
          </span>
        )}
        {rx.prescribed_by && (
          <span className="rx-field-pill">
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>{" "}
            {rx.prescribed_by}
          </span>
        )}
        {rx.date_prescribed && (
          <span className="rx-field-pill">
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>{" "}
            {new Date(rx.date_prescribed).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        )}
      </div>

      {/* Instructions */}
      {rx.instructions && (
        <div
          style={{
            background: "#fffbeb",
            border: "1px solid #fde68a",
            borderRadius: 8,
            padding: "8px 12px",
            display: "flex",
            gap: 8,
            alignItems: "flex-start",
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#d97706"
            strokeWidth="2.5"
            strokeLinecap="round"
            style={{ flexShrink: 0, marginTop: 1 }}
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <p
            style={{
              margin: 0,
              fontSize: 12,
              color: "#78350f",
              lineHeight: 1.5,
            }}
          >
            <strong>Instructions:</strong> {rx.instructions}
          </p>
        </div>
      )}
    </div>
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────
const PatientRecord = () => {
  const {
    user,
    isAdmin,
    seeAllBranches,
    loading: userLoading,
  } = useCurrentUser();
  const [branchFilter, setBranchFilter] = useState("");
  const [branches, setBranches] = useState([]);
  const [speciesFilter, setSpeciesFilter] = useState("all");

  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [patients, setPatients] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeModal, setActiveModal] = useState(null);
  const [activeTab, setActiveTab] = useState("info");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [vaccinations, setVaccinations] = useState([]);
  const [treatments, setTreatments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [serviceHistory, setServiceHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [savingPatient, setSavingPatient] = useState(false);
  const [rxSaving, setRxSaving] = useState(false);
  const [vaxSaving, setVaxSaving] = useState(false);
  const [treatSaving, setTreatSaving] = useState(false);
  const [showRxForm, setShowRxForm] = useState(false);
  const [showVaxForm, setShowVaxForm] = useState(false);
  const [showTreatForm, setShowTreatForm] = useState(false);
  const [editingVaxId, setEditingVaxId] = useState(null);
  const [editingTreatId, setEditingTreatId] = useState(null);
  const [editingRxId, setEditingRxId] = useState(null);
  const [editVaxForm, setEditVaxForm] = useState({
    name: "",
    date_given: "",
    next_due: "",
    given_by: "",
    doses: "",
    lot_number: "",
  });
  const [editTreatForm, setEditTreatForm] = useState({
    date: "",
    diagnosis: "",
    notes: "",
    vet: "",
    temp: "",
    heart_rate: "",
    weight: "",
  });
  const [editRxForm, setEditRxForm] = useState({
    medicine: "",
    concentration: "",
    drug_form: "",
    dosage: "",
    frequency: "Once daily",
    route: "Oral",
    duration: "",
    instructions: "",
    prescribed_by: "",
    date_prescribed: "",
  });
  const [pendingVax, setPendingVax] = useState([]);
  const [pendingTreat, setPendingTreat] = useState([]);
  const [addVaxForm, setAddVaxForm] = useState({
    name: "",
    date_given: new Date().toISOString().slice(0, 10),
    next_due: "",
    given_by: "",
    doses: "",
    lot_number: "",
  });
  const [addTreatForm, setAddTreatForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    diagnosis: "",
    notes: "",
    vet: "",
    temp: "",
    heart_rate: "",
    weight: "",
  });
  const [showAddVaxForm, setShowAddVaxForm] = useState(false);
  const [showAddTreatForm, setShowAddTreatForm] = useState(false);
  const [ownerStep, setOwnerStep] = useState(OWNER_STEPS.ASK);
  const [ownerSearchQuery, setOwnerSearchQuery] = useState("");
  const [ownerSearchRes, setOwnerSearchRes] = useState([]);
  const [ownerSearchLoading, setOwnerSearchLoading] = useState(false);
  const [selectedOwnerProfile, setSelectedOwnerProfile] = useState(null);
  const [existingPatients, setExistingPatients] = useState([]);
  const [loadingExistingPatients, setLoadingExistingPatients] = useState(false);
  const [petMode, setPetMode] = useState("new");
  const [existingAccModal, setExistingAccModal] = useState({
    show: false,
    email: "",
    existingName: "",
    onContinue: null,
  });
  const [appModal, setAppModal] = useState({
    show: false,
    title: "",
    message: "",
    onConfirm: null,
    onCancel: null,
    confirmText: "OK",
    cancelText: null,
    confirmColor: "var(--royal)",
  });
  const [typeDeleteModal, setTypeDeleteModal] = useState({
    show: false,
    title: "",
    message: "",
    recordLabel: "",
    typed: "",
    onConfirm: null,
  });
  const requireTypeToDelete = (title, message, recordLabel, onConfirm) =>
    setTypeDeleteModal({
      show: true,
      title,
      message,
      recordLabel,
      typed: "",
      onConfirm,
    });
  const closeTypeDeleteModal = () =>
    setTypeDeleteModal((m) => ({ ...m, show: false, typed: "" }));
  const [form, setForm] = useState({
    name: "",
    species: "",
    breed: "",
    gender: "",
    age: "",
    temp: "",
    heart_rate: "",
    weight: "",
    owner: "",
    owner_first: "",
    owner_last: "",
    owner_gender: "",
    contact: "",
    owner_email: "",
    condition: "",
    status: "Outpatient",
    health: "Good",
    room: "",
  });
  const [addPatientErrors, setAddPatientErrors] = useState({});
  const [rxForm, setRxForm] = useState({
    medicine: "",
    concentration: "",
    drug_form: "",
    dosage: "",
    frequency: "Once daily",
    route: "Oral",
    duration: "",
    instructions: "",
    prescribed_by: "",
    date_prescribed: new Date().toISOString().slice(0, 10),
  });
  const [vaxForm, setVaxForm] = useState({
    name: "",
    date_given: new Date().toISOString().slice(0, 10),
    next_due: "",
    given_by: "",
    doses: "",
    lot_number: "",
  });
  const [treatForm, setTreatForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    diagnosis: "",
    notes: "",
    vet: "",
    temp: "",
    heart_rate: "",
    weight: "",
  });
  const [toasts, setToasts] = useState([]);
  const toastTimer = useRef(null);
  const [editingPatient, setEditingPatient] = useState(null);
  const [editPatientForm, setEditPatientForm] = useState({
    name: "",
    species: "",
    breed: "",
    gender: "",
    age: "",
    temp: "",
    heart_rate: "",
    weight: "",
    owner: "",
    contact: "",
    owner_email: "",
    condition: "",
    status: "Outpatient",
    health: "Good",
    room: "",
  });
  const [editPatientOriginal, setEditPatientOriginal] = useState(null);
  const [editPatientSaving, setEditPatientSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const [deletedPatients, setDeletedPatients] = useState([]);
  const [showDeletedModal, setShowDeletedModal] = useState(false);

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ field }) => {
    const active = sortField === field;
    return (
      <svg
        width="10"
        height="10"
        viewBox="0 0 24 24"
        fill="none"
        stroke={active ? "var(--royal)" : "#cbd5e1"}
        strokeWidth="3"
        strokeLinecap="round"
        style={{
          marginLeft: 4,
          flexShrink: 0,
          transform:
            active && sortDir === "desc" ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 0.15s",
        }}
      >
        <polyline points="18 15 12 9 6 15" />
      </svg>
    );
  };

  useEffect(() => {
    if (!seeAllBranches) return;
    supabase
      .from("branches")
      .select("id, name")
      .then(({ data }) => setBranches(data || []));
  }, [seeAllBranches]);

  const showAlert = (title, message) =>
    setAppModal({
      show: true,
      title,
      message,
      onConfirm: () => setAppModal((m) => ({ ...m, show: false })),
      onCancel: null,
      confirmText: "OK",
      cancelText: null,
      confirmColor: "var(--royal)",
    });
  const showConfirm = (title, message, onConfirm, confirmColor = "#dc2626") =>
    setAppModal({
      show: true,
      title,
      message,
      onConfirm: () => {
        setAppModal((m) => ({ ...m, show: false }));
        onConfirm();
      },
      onCancel: () => setAppModal((m) => ({ ...m, show: false })),
      confirmText: "Yes, Delete",
      cancelText: "Cancel",
      confirmColor,
    });

  const showToast = (message, type = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type, show: true }]);
    setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, show: false } : t)),
      );
      setTimeout(
        () => setToasts((prev) => prev.filter((t) => t.id !== id)),
        400,
      );
    }, 3000);
  };

  const fetchPatients = async () => {
    setLoading(true);
    let q = supabase
      .from(T_PATIENTS)
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (!seeAllBranches && user?.branchId) q = q.eq("branch_id", user.branchId);
    if (seeAllBranches && branchFilter) q = q.eq("branch_id", branchFilter);
    const { data, error } = await q;
    if (!error) {
      setPatients(data || []);
      // Keep any currently-open record in sync with the latest DB state so
      // edits/vitals/etc. saved elsewhere never appear to "disappear" from an open view/edit modal.
      setSelectedPatient((prev) =>
        prev ? (data || []).find((pt) => pt.id === prev.id) || prev : prev,
      );
      setEditingPatient((prev) =>
        prev ? (data || []).find((pt) => pt.id === prev.id) || prev : prev,
      );
    }
    setLoading(false);
  };

  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

  const fetchDeletedPatients = async () => {
    let q = supabase
      .from(T_PATIENTS)
      .select("*")
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false });
    if (!seeAllBranches && user?.branchId) q = q.eq("branch_id", user.branchId);
    if (seeAllBranches && branchFilter) q = q.eq("branch_id", branchFilter);
    const { data, error } = await q;
    if (error) return;
    const now = Date.now();
    const expired = (data || []).filter(
      (p) => now - new Date(p.deleted_at).getTime() > THIRTY_DAYS_MS,
    );
    if (expired.length > 0)
      await supabase
        .from(T_PATIENTS)
        .delete()
        .in(
          "id",
          expired.map((p) => p.id),
        );
    setDeletedPatients(
      (data || []).filter(
        (p) => now - new Date(p.deleted_at).getTime() <= THIRTY_DAYS_MS,
      ),
    );
  };

  const fetchRooms = async () => {
    let q = supabase.from(T_ROOMS).select("*").order("number");
    if (!seeAllBranches && user?.branchId) q = q.eq("branch_id", user.branchId);
    if (seeAllBranches && branchFilter) q = q.eq("branch_id", branchFilter);
    const { data, error } = await q;
    if (!error && data) setRooms(data);
  };

  const fetchExistingPatientsForOwner = async (ownerName, ownerUserId) => {
    if (!ownerName && !ownerUserId) {
      setExistingPatients([]);
      return;
    }
    setLoadingExistingPatients(true);
    let q = supabase
      .from(T_PATIENTS)
      .select("id, name, species, breed, gender, owner, owner_user_id");
    if (ownerUserId) q = q.eq("owner_user_id", ownerUserId);
    else q = q.eq("owner", ownerName);
    const { data, error } = await q.order("name");
    if (!error) setExistingPatients(data || []);
    setLoadingExistingPatients(false);
  };

  useEffect(() => {
    if (user)
      logActivity(
        user,
        "Viewed patient records",
        "Opened patient records list",
      );
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchPatients();
    fetchRooms();
    fetchDeletedPatients();
    const patientChannel = supabase
      .channel("patients-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: T_PATIENTS },
        () => {
          fetchPatients();
          fetchDeletedPatients();
        },
      )
      .subscribe();
    const roomChannel = supabase
      .channel("rooms-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: T_ROOMS },
        () => fetchRooms(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(patientChannel);
      supabase.removeChannel(roomChannel);
    };
  }, [user, branchFilter]);

  const fetchMedical = async (patientId) => {
    const [vax, treat, rx] = await Promise.all([
      supabase.from(T_VACCINATIONS).select("*").eq("patient_id", patientId),
      supabase.from(T_TREATMENTS).select("*").eq("patient_id", patientId),
      supabase
        .from(T_PRESCRIPTIONS)
        .select("*")
        .eq("patient_id", patientId)
        .order("date_prescribed", { ascending: false }),
    ]);
    setVaccinations(vax.data || []);
    setTreatments(treat.data || []);
    setPrescriptions(rx.data || []);
  };

  const fetchServiceHistory = async (patient) => {
    if (!patient?.name) {
      setServiceHistory([]);
      return;
    }
    setLoadingHistory(true);
    // Match by patient name plus either the owner's display name or their linked
    // account id, so appointments still show up even if the owner name was
    // entered slightly differently than the patient record.
    let q = supabase
      .from(T_APPOINTMENTS)
      .select("*")
      .ilike("patient", patient.name.trim());
    if (patient.owner_user_id) {
      q = q.or(
        `owner.ilike.${patient.owner ? patient.owner.trim() : ""},user_id.eq.${patient.owner_user_id}`,
      );
    } else if (patient.owner) {
      q = q.ilike("owner", patient.owner.trim());
    }
    const { data, error } = await q.order("date", { ascending: false });
    if (!error) setServiceHistory(data || []);
    setLoadingHistory(false);
  };

  const filtered = patients.filter((p) => {
    const matchSearch =
      !search ||
      `${p.name} ${p.owner} ${p.species} ${p.breed} ${p.condition}`
        .toLowerCase()
        .includes(search.toLowerCase());
    const matchFilter =
      statusFilter === "all" ||
      p.status === statusFilter ||
      (statusFilter === "Critical" && p.health === "Critical");
    const matchSpecies = speciesFilter === "all" || p.species === speciesFilter;
    return matchSearch && matchFilter && matchSpecies;
  });
  const HEALTH_RANK = { Critical: 0, Fair: 1, Good: 2 };
  const STATUS_RANK = { Admitted: 0, Outpatient: 1 };
  let sortedFiltered = filtered;
  if (sortField) {
    sortedFiltered = [...filtered].sort((a, b) => {
      let av, bv;
      if (sortField === "created_at") {
        av = new Date(a.created_at || 0).getTime();
        bv = new Date(b.created_at || 0).getTime();
      } else if (sortField === "health") {
        av = HEALTH_RANK[a.health] ?? 99;
        bv = HEALTH_RANK[b.health] ?? 99;
      } else if (sortField === "status") {
        av = STATUS_RANK[a.status] ?? 99;
        bv = STATUS_RANK[b.status] ?? 99;
      } else if (sortField === "room") {
        av = a.room || "";
        bv = b.room || "";
      } else {
        av = (a[sortField] || "").toString().toLowerCase();
        bv = (b[sortField] || "").toString().toLowerCase();
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }
  const totalPages = Math.max(
    1,
    Math.ceil(sortedFiltered.length / ROWS_PER_PAGE),
  );
  const safePage = Math.min(currentPage, totalPages);
  const paginated = sortedFiltered.slice(
    (safePage - 1) * ROWS_PER_PAGE,
    safePage * ROWS_PER_PAGE,
  );
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, speciesFilter, sortField, sortDir]);

  useEffect(() => {
    if (ownerStep !== OWNER_STEPS.SEARCH) return;
    const run = async () => {
      setOwnerSearchLoading(true);
      const q = ownerSearchQuery.trim();
      let query = supabase
        .from(T_PROFILES)
        .select("id, first_name, last_name, email, role, branch_id")
        .in("role", ["customer", "Customer"])
        .limit(20);
      if (q)
        query = query.or(
          `first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%`,
        );
      const { data, error } = await query;
      const mapped = (data || []).map((p) => ({
        ...p,
        full_name:
          [p.first_name, p.last_name].filter(Boolean).join(" ") || p.email,
        branch_name: branches.find((b) => b.id === p.branch_id)?.name || null,
      }));
      setOwnerSearchRes(mapped);
      setOwnerSearchLoading(false);
    };
    if (!ownerSearchQuery.trim()) {
      run();
      return;
    }
    const t = setTimeout(run, 280);
    return () => clearTimeout(t);
  }, [ownerSearchQuery, ownerStep, branchFilter]);

  useEffect(() => {
    if (ownerStep !== OWNER_STEPS.FORM) return;
    const first = form.owner_first.trim().toLowerCase().replace(/\s+/g, "");
    const last = form.owner_last.trim().toLowerCase().replace(/\s+/g, "");
    if (!first && !last) return;
    const generated = `${first}${last ? "." + last : ""}@customer.com`;
    setForm((f) =>
      f.owner_email === generated ? f : { ...f, owner_email: generated },
    );
  }, [form.owner_first, form.owner_last, ownerStep]);

  if (userLoading) {
    return (
      <Layout>
        <div
          className="topbar"
          style={{ position: "sticky", top: 0, zIndex: 90, background: "#fff" }}
        >
          <div className="topbar-title">
            <div
              className="sk"
              style={{ width: 22, height: 22, borderRadius: 6 }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Sk w={160} h={16} />
              <Sk w={220} h={11} />
            </div>
          </div>
          <div className="topbar-actions">
            <Sk w={200} h={36} r={8} />
            <Sk w={120} h={36} r={8} />
          </div>
        </div>
        <div className="content">
          <div className="stat-grid" style={{ marginBottom: 20 }}>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </div>
          <div
            style={{
              background: "#fff",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--border)",
              boxShadow: "var(--shadow)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 22px",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <Sk w={120} h={15} />
              <Sk w={60} h={13} />
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {[140, 110, 90, 120, 80, 70, 60, 90].map((w, i) => (
                    <th
                      key={i}
                      style={{
                        padding: "11px 14px",
                        background: "var(--bg)",
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      <Sk w={w} h={11} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <TableRowSkeleton />
                <TableRowSkeleton />
                <TableRowSkeleton />
                <TableRowSkeleton />
              </tbody>
            </table>
          </div>
        </div>
      </Layout>
    );
  }

  const openAdd = () => {
    setForm({
      name: "",
      species: "",
      breed: "",
      gender: "",
      owner: "",
      owner_first: "",
      owner_last: "",
      owner_gender: "",
      contact: "",
      owner_email: "",
      condition: "",
      status: "Outpatient",
      health: "Good",
      room: "",
    });
    setAddPatientErrors({});
    setPendingVax([]);
    setPendingTreat([]);
    setAddVaxForm({
      name: "",
      date_given: new Date().toISOString().slice(0, 10),
      next_due: "",
      given_by: "",
    });
    setAddTreatForm({
      date: new Date().toISOString().slice(0, 10),
      diagnosis: "",
      notes: "",
      vet: "",
    });
    setShowAddVaxForm(false);
    setShowAddTreatForm(false);
    setActiveTab("info");
    setOwnerStep(OWNER_STEPS.ASK);
    setOwnerSearchQuery("");
    setOwnerSearchRes([]);
    setSelectedOwnerProfile(null);
    setExistingPatients([]);
    setPetMode("new");
    fetchRooms();
    setActiveModal("add");
  };

  const openView = (p) => {
    setSelectedPatient(p);
    setActiveTab("info");
    fetchMedical(p.id);
    fetchRooms();
    fetchServiceHistory(p);
    setShowRxForm(false);
    setShowVaxForm(false);
    setShowTreatForm(false);
    setEditingVaxId(null);
    setEditingTreatId(null);
    setEditingRxId(null);
    setActiveModal("view");
  };

  const closeModal = () => {
    setActiveModal(null);
    setActiveTab("info");
    setShowRxForm(false);
    setShowVaxForm(false);
    setShowTreatForm(false);
    setEditingVaxId(null);
    setEditingTreatId(null);
    setEditingRxId(null);
    setOwnerStep(OWNER_STEPS.ASK);
    setOwnerSearchQuery("");
    setOwnerSearchRes([]);
    setSelectedOwnerProfile(null);
  };

  const addPendingVax = () => {
    if (!addVaxForm.name || !addVaxForm.date_given) {
      showAlert("Missing Fields", "Vaccine name and date given are required.");
      return;
    }
    setPendingVax((prev) => [...prev, { ...addVaxForm, _key: Date.now() }]);
    setAddVaxForm({
      name: "",
      date_given: new Date().toISOString().slice(0, 10),
      next_due: "",
      given_by: "",
    });
    setShowAddVaxForm(false);
  };
  const removePendingVax = (key) =>
    setPendingVax((prev) => prev.filter((v) => v._key !== key));
  const addPendingTreat = () => {
    if (!addTreatForm.diagnosis) {
      showAlert("Missing Fields", "Diagnosis is required.");
      return;
    }
    setPendingTreat((prev) => [...prev, { ...addTreatForm, _key: Date.now() }]);
    setAddTreatForm({
      date: new Date().toISOString().slice(0, 10),
      diagnosis: "",
      notes: "",
      vet: "",
    });
    setShowAddTreatForm(false);
  };
  const removePendingTreat = (key) =>
    setPendingTreat((prev) => prev.filter((t) => t._key !== key));

  const generatePassword = (name) => {
    const clean = (name || "owner").trim().split(/\s+/)[0].toLowerCase();
    return `${clean}@VetCare${Math.floor(1000 + Math.random() * 9000)}`;
  };

  // Resolves which branch a newly created customer account should belong to:
  // - if staff can see all branches and has a branch filter active, use that
  // - otherwise fall back to the staff member's own branch
  const resolveOwnerBranchId = () =>
    seeAllBranches && branchFilter ? branchFilter : (user?.branchId ?? null);

  const ensureProfile = async (userId, email, fullName, sex = null) => {
    const parts = (fullName || "").trim().split(/\s+/);
    const first = parts[0] || "";
    const last = parts.slice(1).join(" ") || "";
    const branchId = resolveOwnerBranchId();
    const { error: ensureProfileError } = await supabase
      .from(T_PROFILES)
      .upsert(
        {
          id: userId,
          email,
          first_name: first,
          last_name: last,
          role: "Customer",
          sex: sex || null,
          branch_id: branchId,
        },
        { onConflict: "id", ignoreDuplicates: false },
      );
    if (ensureProfileError)
      console.error("ensureProfile upsert failed:", ensureProfileError.message);
    // Log so the account shows up in Admin & Security → Logs, tied to the staff member who created it
    if (user) {
      await supabase.from("activity_logs").insert([
        {
          user_id: user.id,
          user_name:
            user.fullName ||
            `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
            user.email,
          user_role: user.role,
          action: "Created customer account",
          details: `${fullName || email} · ${email} · Branch: ${branches.find((b) => b.id === branchId)?.name || "Unassigned"}`,
        },
      ]);
    }
  };

  const occupyRoom = async (roomNumber, patientName, diagnosis) => {
    if (!roomNumber) return;
    const room = rooms.find((r) => r.number === roomNumber);
    if (!room) return;
    await supabase
      .from(T_ROOMS)
      .update({
        status: "Occupied",
        patient: patientName || "",
        diagnosis: diagnosis || "",
      })
      .eq("id", room.id);
  };

  const freeRoom = async (roomNumber) => {
    if (!roomNumber) return;
    const { data } = await supabase
      .from(T_ROOMS)
      .select("id")
      .eq("number", roomNumber)
      .single();
    if (!data) return;
    await supabase
      .from(T_ROOMS)
      .update({ status: "Available", patient: "", diagnosis: "" })
      .eq("id", data.id);
  };

  const resolveOwnerFullName = () => {
    if (ownerStep === OWNER_STEPS.FORM)
      return (
        [form.owner_first.trim(), form.owner_last.trim()]
          .filter(Boolean)
          .join(" ") || ""
      );
    if (selectedOwnerProfile)
      return selectedOwnerProfile.full_name || form.owner;
    return form.owner.trim();
  };

  const executeSavePatient = async ({
    ownerUserId,
    ownerPassword,
    resolvedEmail,
    existingAccountFound = false,
    loginRateLimited = false,
  }) => {
    if (form.room) {
      const chosenRoom = rooms.find((r) => r.number === form.room);
      if (chosenRoom && chosenRoom.status !== "Available") {
        setSavingPatient(false);
        showAlert(
          "Room Unavailable",
          `Room ${form.room} is currently "${chosenRoom.status}"${chosenRoom.patient ? ` (${chosenRoom.patient})` : ""}. Please choose a different room.`,
        );
        return;
      }
    }
    const fullOwnerName = resolveOwnerFullName();
    const patientPayload = withBranchId(user, {
      name: form.name,
      species: form.species,
      breed: form.breed,
      gender: form.gender,
      age: form.age || null,
      temp: form.temp || null,
      heart_rate: form.heart_rate || null,
      weight: form.weight || null,
      owner: fullOwnerName,
      contact: form.contact,
      owner_email: resolvedEmail,
      condition: form.condition,
      status: form.status,
      health: form.health,
      room: form.room,
    });
    const insertPayload = {
      ...patientPayload,
      ...(ownerUserId ? { owner_user_id: ownerUserId } : {}),
    };
    const { data: ins, error: err } = await supabase
      .from(T_PATIENTS)
      .insert([insertPayload])
      .select()
      .single();
    if (err) {
      setSavingPatient(false);
      showAlert("Error", err.message);
      return;
    }
    const patientId = ins.id;
    const parallelTasks = [];
    if (form.room)
      parallelTasks.push(occupyRoom(form.room, form.name, form.condition));
    if (pendingVax.length > 0)
      parallelTasks.push(
        supabase.from(T_VACCINATIONS).insert(
          pendingVax.map(({ _key, ...v }) => ({
            ...v,
            patient_id: patientId,
          })),
        ),
      );
    if (pendingTreat.length > 0)
      parallelTasks.push(
        supabase.from(T_TREATMENTS).insert(
          pendingTreat.map(({ _key, ...t }) => ({
            ...t,
            patient_id: patientId,
          })),
        ),
      );
    if (parallelTasks.length > 0) await Promise.all(parallelTasks);
    if (ownerUserId) {
      const staffUser = sb.getUser();
      if (staffUser?.id) {
        const ownerName =
          selectedOwnerProfile?.full_name || fullOwnerName || "there";
        // fire-and-forget: don't block modal close on the welcome message
        supabase
          .from(T_MESSAGES)
          .insert([
            withBranchId(user, {
              sender_id: staffUser.id,
              receiver_id: ownerUserId,
              is_read: false,
              message: `Hello ${ownerName}! Welcome to Angeles Animal Care Hospital.\n\nYour pet ${form.name} (${form.species}) has been successfully registered. Feel free to message us anytime!`,
            }),
          ])
          .then(({ error: msgError }) => {
            if (msgError)
              console.error("Welcome message failed:", msgError.message);
          });
      }
    }
    setSavingPatient(false);
    fetchPatients();
    fetchRooms();
    closeModal();
    logActivity(
      user,
      "Created patient record",
      `Added new patient: ${form.name}`,
    );
    if (existingAccountFound) {
      showToast(`✓ ${form.name} registered & linked to existing account`);
    } else if (ownerPassword) {
      setCreatedCredentials({
        fullName: resolveOwnerFullName(),
        email: resolvedEmail,
        password: ownerPassword,
      });
      showToast(`✓ ${form.name} registered & owner account created`);
    } else if (ownerUserId) {
      showToast(`✓ ${form.name} registered — welcome message sent`);
    } else {
      showToast(`✓ ${form.name} registered successfully`);
    }
  };

  const validateAddPatient = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = "Patient name is required";
    else if (form.name.trim().length < 2)
      errs.name = "Patient name must be at least 2 characters";
    else if (form.name.trim().length > 50)
      errs.name = "Patient name must not exceed 50 characters";
    if (!form.species) errs.species = "Please select a species";
    if (ownerStep === OWNER_STEPS.FORM) {
      if (!form.owner_first.trim() && !form.owner_last.trim())
        errs.owner_first = "Enter at least a first or last name";
      else if (form.owner_first.trim() && form.owner_first.trim().length < 2)
        errs.owner_first = "First name must be at least 2 characters";
    }
    if (ownerStep === OWNER_STEPS.SEARCH && !selectedOwnerProfile)
      errs.owner_search = "Please select a customer account";
    if (form.contact && form.contact.length !== 11)
      errs.contact = "Contact number must be 11 digits";
    return errs;
  };

  const isAddPatientFormValid = () =>
    Object.keys(validateAddPatient()).length === 0;

  const savePatient = async () => {
    const errs = validateAddPatient();
    if (Object.keys(errs).length) {
      setAddPatientErrors(errs);
      showAlert(
        "Missing Fields",
        "Please fill in all required fields before filing this record.",
      );
      return;
    }
    if (savingPatient) return;

    const fullOwnerNameCheck = resolveOwnerFullName().trim();
    if (form.name.trim() && fullOwnerNameCheck) {
      const { data: dupData } = await supabase
        .from(T_PATIENTS)
        .select("id")
        .is("deleted_at", null)
        .ilike("name", form.name.trim())
        .ilike("owner", fullOwnerNameCheck);
      if (dupData && dupData.length > 0) {
        showAlert(
          "Patient Already Exists",
          `${form.name.trim()} already has a record under owner "${fullOwnerNameCheck}". Please open the existing record from the patient list instead of creating a duplicate — you can add vaccinations, treatments, or view its appointment history there.`,
        );
        return;
      }
    }

    setSavingPatient(true);
    let ownerUserId = null;
    let ownerPassword = null;
    const ownerEmail = form.owner_email?.trim().toLowerCase() || "";
    if (selectedOwnerProfile) {
      ownerUserId = selectedOwnerProfile.id;
      await ensureProfile(
        ownerUserId,
        selectedOwnerProfile.email,
        selectedOwnerProfile.full_name || form.owner,
        form.owner_gender,
      );
      await executeSavePatient({
        ownerUserId,
        ownerPassword: null,
        resolvedEmail: selectedOwnerProfile.email,
      });
      return;
    }
    const fullOwnerName = resolveOwnerFullName();
    if (ownerEmail) {
      ownerPassword = generatePassword(fullOwnerName);
      const {
        data: { session: staffSession },
      } = await supabase.auth.getSession();
      const { data: signUpData, error: signUpError } =
        await supabase.auth.signUp({
          email: ownerEmail,
          password: ownerPassword,
          options: {
            data: { full_name: fullOwnerName || ownerEmail, role: "customer" },
          },
        });
      if (staffSession) {
        await supabase.auth.setSession({
          access_token: staffSession.access_token,
          refresh_token: staffSession.refresh_token,
        });
      }
      if (signUpError) {
        if (signUpError.message?.toLowerCase().includes("already registered")) {
          const { data: existing } = await supabase
            .from(T_PROFILES)
            .select("id, first_name, last_name, email")
            .eq("email", ownerEmail)
            .single();
          ownerUserId = existing?.id || null;
          const existingFullName = existing
            ? [existing.first_name, existing.last_name]
                .filter(Boolean)
                .join(" ")
            : "";
          if (ownerUserId)
            await ensureProfile(
              ownerUserId,
              ownerEmail,
              existingFullName || fullOwnerName || ownerEmail,
              form.owner_gender,
            );
          setSavingPatient(false);
          setExistingAccModal({
            show: true,
            email: ownerEmail,
            existingName: existingFullName || "",
            onContinue: async () => {
              setExistingAccModal((m) => ({ ...m, show: false }));
              setSavingPatient(true);
              await executeSavePatient({
                ownerUserId,
                ownerPassword: null,
                resolvedEmail: ownerEmail,
                existingAccountFound: true,
              });
            },
          });
          return;
        } else if (signUpError.message?.toLowerCase().includes("rate limit")) {
          const { data: rateLimited } = await supabase
            .from(T_PROFILES)
            .select("id")
            .eq("email", ownerEmail)
            .single();
          const rateLimitedUserId = rateLimited?.id || null;
          if (rateLimitedUserId)
            await ensureProfile(
              rateLimitedUserId,
              ownerEmail,
              fullOwnerName || ownerEmail,
              form.owner_gender,
            );
          await executeSavePatient({
            ownerUserId: rateLimitedUserId,
            ownerPassword,
            resolvedEmail: ownerEmail,
            loginRateLimited: true,
          });
          return;
        } else {
          setSavingPatient(false);
          showAlert(
            "Account Error",
            `Could not create owner account: ${signUpError.message}`,
          );
          return;
        }
      } else {
        ownerUserId = signUpData?.user?.id || null;
        if (ownerUserId)
          await ensureProfile(
            ownerUserId,
            ownerEmail,
            fullOwnerName || ownerEmail,
            form.owner_gender,
          );
      }
    }
    await executeSavePatient({
      ownerUserId,
      ownerPassword,
      resolvedEmail: ownerEmail || null,
    });
  };

  const doDelete = async (id) => {
    const patient = patients.find((p) => p.id === id);
    const { error } = await supabase
      .from(T_PATIENTS)
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      showAlert("Error", error.message);
      return;
    }
    logActivity(
      user,
      "Deleted patient record",
      `Moved to Recently Deleted: ${patient?.name || id}`,
    );
    if (patient?.room) await freeRoom(patient.room);
    showToast(
      `${patient?.name || "Patient"} moved to Recently Deleted — permanently removed in 30 days`,
      "info",
    );
    fetchPatients();
    fetchRooms();
    fetchDeletedPatients();
    closeModal();
  };

  const restorePatient = async (id, name) => {
    const { error } = await supabase
      .from(T_PATIENTS)
      .update({ deleted_at: null })
      .eq("id", id);
    if (error) {
      showAlert("Error", error.message);
      return;
    }
    logActivity(
      user,
      "Restored patient record",
      `Restored patient: ${name || id}`,
    );
    showToast(`${name || "Patient"} restored`);
    fetchPatients();
    fetchDeletedPatients();
  };

  const permanentlyDeletePatient = (id, name) =>
    showConfirm(
      "Delete Permanently",
      `Permanently delete ${name || "this patient"}? This cannot be undone.`,
      async () => {
        const { error } = await supabase.from(T_PATIENTS).delete().eq("id", id);
        if (error) {
          showAlert("Error", error.message);
          return;
        }
        logActivity(
          user,
          "Permanently deleted patient record",
          `Removed patient: ${name || id}`,
        );
        showToast("Patient permanently deleted", "info");
        fetchDeletedPatients();
      },
    );

  const openEditPatient = (p) => {
    const initial = {
      name: p.name || "",
      species: p.species || "",
      breed: p.breed || "",
      gender: p.gender || "",
      age: p.age || "",
      temp: p.temp || "",
      heart_rate: p.heart_rate || "",
      weight: p.weight || "",
      owner: p.owner || "",
      contact: p.contact || "",
      owner_email: p.owner_email || "",
      condition: p.condition || "",
      status: p.status || "Outpatient",
      health: p.health || "Good",
      room: p.room || "",
    };
    setEditPatientForm(initial);
    setEditPatientOriginal(initial);
    setEditingPatient(p);
    fetchRooms();
  };

  const closeEditPatient = () => {
    setEditingPatient(null);
    setEditPatientOriginal(null);
  };

  const hasUnsavedPatientEdits = () =>
    editPatientOriginal &&
    JSON.stringify(editPatientForm) !== JSON.stringify(editPatientOriginal);

  const attemptCloseEditPatient = () => {
    if (hasUnsavedPatientEdits()) {
      showConfirm(
        "Discard Changes?",
        "You have unsaved changes to this patient's record. Do you want to discard them?",
        () => closeEditPatient(),
        "#dc2626",
      );
    } else {
      closeEditPatient();
    }
  };

  const isEditPatientFormValid = () => {
    if (!editPatientForm.name.trim() || !editPatientForm.species) return false;
    if (editPatientForm.contact && editPatientForm.contact.length !== 11)
      return false;
    return true;
  };

  const saveEditPatient = async () => {
    if (!editPatientForm.name || !editPatientForm.species) {
      showAlert("Missing Fields", "Patient name and species are required.");
      return;
    }
    if (editPatientSaving) return;

    if (editPatientForm.name.trim() && editPatientForm.owner.trim()) {
      const { data: dupData } = await supabase
        .from(T_PATIENTS)
        .select("id")
        .is("deleted_at", null)
        .neq("id", editingPatient.id)
        .ilike("name", editPatientForm.name.trim())
        .ilike("owner", editPatientForm.owner.trim());
      if (dupData && dupData.length > 0) {
        showAlert(
          "Patient Already Exists",
          `Another record for "${editPatientForm.name.trim()}" already exists under owner "${editPatientForm.owner.trim()}". Please use that record instead to avoid duplicate patients.`,
        );
        return;
      }
    }

    setEditPatientSaving(true);
    const oldRoom = editingPatient.room;
    const newRoom = editPatientForm.room;
    if (oldRoom && oldRoom !== newRoom) await freeRoom(oldRoom);
    if (newRoom && newRoom !== oldRoom) {
      const chosenRoom = rooms.find((r) => r.number === newRoom);
      if (chosenRoom && chosenRoom.status !== "Available") {
        setEditPatientSaving(false);
        showAlert(
          "Room Unavailable",
          `Room ${newRoom} is currently "${chosenRoom.status}"${chosenRoom.patient ? ` (${chosenRoom.patient})` : ""}. Please choose a different room.`,
        );
        return;
      }
      await occupyRoom(
        newRoom,
        editPatientForm.name,
        editPatientForm.condition,
      );
    }
    const { error } = await supabase
      .from(T_PATIENTS)
      .update({
        name: editPatientForm.name,
        species: editPatientForm.species,
        breed: editPatientForm.breed,
        gender: editPatientForm.gender,
        age: editPatientForm.age || null,
        temp: editPatientForm.temp || null,
        heart_rate: editPatientForm.heart_rate || null,
        weight: editPatientForm.weight || null,
        owner: editPatientForm.owner,
        contact: editPatientForm.contact,
        owner_email: editPatientForm.owner_email,
        condition: editPatientForm.condition,
        status: editPatientForm.status,
        health: editPatientForm.health,
        room: editPatientForm.room || null,
      })
      .eq("id", editingPatient.id);
    setEditPatientSaving(false);
    if (error) {
      showAlert("Error", error.message);
      return;
    }
    logActivity(
      user,
      "Updated patient record",
      `Edited patient: ${editPatientForm.name}`,
    );
    showToast(`✓ ${editPatientForm.name} updated successfully`);
    setEditPatientOriginal(null);
    closeEditPatient();
    fetchPatients();
    fetchRooms();
  };

  const saveVax = async () => {
    if (!vaxForm.name || !vaxForm.date_given) {
      showAlert("Missing Fields", "Vaccine name and date given are required.");
      return;
    }
    if (vaxSaving) return;
    setVaxSaving(true);
    const { error } = await supabase
      .from(T_VACCINATIONS)
      .insert([{ patient_id: selectedPatient.id, ...vaxForm }]);
    setVaxSaving(false);
    if (error) {
      showAlert("Error", error.message);
      return;
    }
    setVaxForm({
      name: "",
      date_given: new Date().toISOString().slice(0, 10),
      next_due: "",
      given_by: "",
      doses: "",
      lot_number: "",
    });
    setShowVaxForm(false);
    showToast("✓ Vaccination record saved");
    await fetchMedical(selectedPatient.id);
  };
  const startEditVax = (v) => {
    setEditingVaxId(v.id);
    setEditVaxForm({
      name: v.name,
      date_given: v.date_given,
      next_due: v.next_due || "",
      given_by: v.given_by || "",
      doses: v.doses || "",
      lot_number: v.lot_number || "",
    });
    setShowVaxForm(false);
  };
  const saveEditVax = async () => {
    if (!editVaxForm.name || !editVaxForm.date_given) {
      showAlert("Missing Fields", "Vaccine name and date given are required.");
      return;
    }
    if (vaxSaving) return;
    setVaxSaving(true);
    const { error } = await supabase
      .from(T_VACCINATIONS)
      .update(editVaxForm)
      .eq("id", editingVaxId);
    setVaxSaving(false);
    if (error) {
      showAlert("Error", error.message);
      return;
    }
    setEditingVaxId(null);
    showToast("✓ Vaccination updated");
    await fetchMedical(selectedPatient.id);
  };
  const deleteVax = (vaxId) => {
    const v = vaccinations.find((x) => x.id === vaxId);
    requireTypeToDelete(
      "Delete Vaccination",
      `This will permanently delete the "${v?.name || "vaccination"}" record. This cannot be undone.`,
      "DELETE",
      async () => {
        await supabase.from(T_VACCINATIONS).delete().eq("id", vaxId);
        showToast("Vaccination record deleted", "info");
        await fetchMedical(selectedPatient.id);
      },
    );
  };

  const printVaccination = (v) => {
    const patient = selectedPatient;
    const win = window.open("", "_blank", "width=650,height=800");
    if (!win) {
      showAlert(
        "Popup Blocked",
        "Please allow popups for this site to print the record.",
      );
      return;
    }
    const isExpired = v.next_due && new Date(v.next_due) < new Date();
    win.document.write(`
      <html>
        <head>
          <title>Vaccination Record - ${patient?.name || ""}</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #1e293b; }
            .header { text-align: center; border-bottom: 3px solid #16a34a; padding-bottom: 16px; margin-bottom: 24px; }
            .header h1 { margin: 0; font-size: 20px; color: #14532d; }
            .header p { margin: 4px 0 0; font-size: 12px; color: #64748b; }
            .patient-info { display: flex; justify-content: space-between; gap: 16px; margin-bottom: 24px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; }
            .patient-info div { font-size: 13px; }
            .patient-info strong { display: block; font-size: 10px; text-transform: uppercase; color: #94a3b8; margin-bottom: 3px; letter-spacing: 0.5px; }
            .vax-box { border: 2px solid #16a34a; border-radius: 10px; padding: 24px; position: relative; }
            .vax-box::before { content: 'VACCINATED'; position: absolute; top: 14px; right: 18px; font-size: 11px; font-weight: 800; color: #16a34a; border: 2px solid #16a34a; border-radius: 20px; padding: 3px 10px; letter-spacing: 1px; }
            .vax-name { font-size: 22px; font-weight: 800; color: #14532d; margin: 0 0 6px; }
            .vax-given-by { font-size: 13px; color: #16a34a; margin: 0 0 18px; }
            .dates { display: flex; gap: 16px; }
            .date-box { flex: 1; background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 12px 16px; }
            .date-box.expired { background: #fef2f2; border-color: #fca5a5; }
            .date-box label { display: block; font-size: 10px; text-transform: uppercase; color: #166534; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 4px; }
            .date-box.expired label { color: #991b1b; }
            .date-box span { font-size: 15px; font-weight: 700; color: #14532d; }
            .date-box.expired span { color: #dc2626; }
            .footer { margin-top: 32px; text-align: center; font-size: 11px; color: #94a3b8; font-style: italic; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Angeles Animal Care Hospital</h1>
            <p>Official Vaccination Record</p>
          </div>
          <div class="patient-info">
            <div><strong>Patient</strong>${patient?.name || "—"} (${patient?.species || ""}${patient?.breed ? " · " + patient.breed : ""})</div>
            <div><strong>Owner</strong>${patient?.owner || "—"}</div>
            <div><strong>Contact</strong>${patient?.contact || "—"}</div>
          </div>
          <div class="vax-box">
            <p class="vax-name">${v.name}</p>
            ${v.given_by ? `<p class="vax-given-by">Administered by: ${v.given_by}</p>` : ""}
            <div class="dates">
              <div class="date-box">
                <label>Date Given</label>
                <span>${new Date(v.date_given).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
              </div>
              ${
                v.next_due
                  ? `
              <div class="date-box ${isExpired ? "expired" : ""}">
                <label>${isExpired ? "Overdue Since" : "Next Due"}</label>
                <span>${new Date(v.next_due).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
              </div>`
                  : ""
              }
            </div>
          </div>
          <p class="footer">This is an official vaccination record issued by Angeles Animal Care Hospital. Please keep this document for your records.</p>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  };

  const saveTreat = async () => {
    if (!treatForm.diagnosis) {
      showAlert("Missing Fields", "Diagnosis is required.");
      return;
    }
    if (treatSaving) return;
    setTreatSaving(true);
    const { error } = await supabase
      .from(T_TREATMENTS)
      .insert([{ patient_id: selectedPatient.id, ...treatForm }]);
    setTreatSaving(false);
    if (error) {
      showAlert("Error", error.message);
      return;
    }
    setTreatForm({
      date: new Date().toISOString().slice(0, 10),
      diagnosis: "",
      notes: "",
      vet: "",
    });
    setShowTreatForm(false);
    showToast("✓ Treatment record saved");
    await fetchMedical(selectedPatient.id);
  };
  const startEditTreat = (t) => {
    setEditingTreatId(t.id);
    setEditTreatForm({
      date: t.date,
      diagnosis: t.diagnosis,
      notes: t.notes || "",
      vet: t.vet || "",
      temp: t.temp || "",
      heart_rate: t.heart_rate || "",
      weight: t.weight || "",
    });
    setShowTreatForm(false);
  };
  const saveEditTreat = async () => {
    if (!editTreatForm.diagnosis) {
      showAlert("Missing Fields", "Diagnosis is required.");
      return;
    }
    if (treatSaving) return;
    setTreatSaving(true);
    const { error } = await supabase
      .from(T_TREATMENTS)
      .update(editTreatForm)
      .eq("id", editingTreatId);
    setTreatSaving(false);
    if (error) {
      showAlert("Error", error.message);
      return;
    }
    setEditingTreatId(null);
    showToast("✓ Treatment updated");
    await fetchMedical(selectedPatient.id);
  };
  const deleteTreat = (treatId) => {
    const t = treatments.find((x) => x.id === treatId);
    requireTypeToDelete(
      "Delete Treatment",
      `This will permanently delete the treatment record${t?.diagnosis ? ` for "${t.diagnosis}"` : ""}${t?.date ? ` (${t.date})` : ""}. This cannot be undone.`,
      "DELETE",
      async () => {
        await supabase.from(T_TREATMENTS).delete().eq("id", treatId);
        showToast("Treatment record deleted", "info");
        await fetchMedical(selectedPatient.id);
      },
    );
  };

  const saveRx = async () => {
    if (!rxForm.medicine || !rxForm.dosage) {
      showAlert("Missing Fields", "Medicine name and dosage are required.");
      return;
    }
    if (rxSaving) return;
    setRxSaving(true);
    const { error } = await supabase
      .from(T_PRESCRIPTIONS)
      .insert([{ patient_id: selectedPatient.id, ...rxForm }]);
    setRxSaving(false);
    if (error) {
      showAlert("Error", error.message);
      return;
    }
    setRxForm({
      medicine: "",
      concentration: "",
      drug_form: "",
      dosage: "",
      frequency: "Once daily",
      route: "Oral",
      duration: "",
      instructions: "",
      prescribed_by: "",
      date_prescribed: new Date().toISOString().slice(0, 10),
    });
    setShowRxForm(false);
    showToast("✓ Prescription record saved");
    await fetchMedical(selectedPatient.id);
  };
  const startEditRx = (rx) => {
    setEditingRxId(rx.id);
    setEditRxForm({
      medicine: rx.medicine,
      concentration: rx.concentration || "",
      drug_form: rx.drug_form || "",
      dosage: rx.dosage,
      frequency: rx.frequency || "Once daily",
      route: rx.route || "Oral",
      duration: rx.duration || "",
      instructions: rx.instructions || "",
      prescribed_by: rx.prescribed_by || "",
      date_prescribed:
        rx.date_prescribed || new Date().toISOString().slice(0, 10),
    });
    setShowRxForm(false);
  };
  const saveEditRx = async () => {
    if (!editRxForm.medicine || !editRxForm.dosage) {
      showAlert("Missing Fields", "Medicine name and dosage are required.");
      return;
    }
    if (rxSaving) return;
    setRxSaving(true);
    const { error } = await supabase
      .from(T_PRESCRIPTIONS)
      .update(editRxForm)
      .eq("id", editingRxId);
    setRxSaving(false);
    if (error) {
      showAlert("Error", error.message);
      return;
    }
    setEditingRxId(null);
    showToast("✓ Prescription updated");
    await fetchMedical(selectedPatient.id);
  };
  const deleteRx = (rxId) => {
    const rx = prescriptions.find((x) => x.id === rxId);
    requireTypeToDelete(
      "Delete Prescription",
      `This will permanently delete the "${rx?.medicine || "prescription"}" record. This cannot be undone.`,
      "DELETE",
      async () => {
        await supabase.from(T_PRESCRIPTIONS).delete().eq("id", rxId);
        showToast("✓ Prescription deleted", "info");
        await fetchMedical(selectedPatient.id);
      },
    );
  };

  const thStyle = {
    padding: "8px 12px",
    background: "var(--bg)",
    fontSize: 11,
    fontWeight: 700,
    color: "var(--muted)",
    textAlign: "left",
    borderBottom: "1px solid var(--border)",
  };
  const tdStyle = {
    padding: "10px 12px",
    borderBottom: "1px solid var(--border)",
  };

  const S = {
    btn: {},
    th: thStyle,
    formBox: {
      background: "var(--bg)",
      border: "1.5px solid var(--border)",
      borderRadius: 10,
      padding: 20,
    },
    modalHeader: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "18px 24px",
    },
  };
  const VIEW_TABS = [
    "info",
    "vaccination",
    "treatment",
    "prescription",
    "services",
  ];

  const TabBar = ({ tabs, active, onSelect, counts = {} }) => (
    <div className="tab-bar">
      {tabs.map((t) => (
        <div
          key={t}
          className={`tab${active === t ? " active" : ""}`}
          onClick={() => onSelect(t)}
        >
          {t.charAt(0).toUpperCase() + t.slice(1)}
          {counts[t] > 0 && (
            <span
              style={{
                marginLeft: 6,
                background:
                  t === "prescription"
                    ? "#1e3a8a"
                    : t === "vaccination"
                      ? "#16a34a"
                      : "#d97706",
                color: "#fff",
                borderRadius: 10,
                fontSize: 10,
                padding: "1px 6px",
                fontWeight: 700,
              }}
            >
              {counts[t]}
            </span>
          )}
        </div>
      ))}
    </div>
  );

  const SectionHeader = ({ color, label, onAdd, showForm, onCancelForm }) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 16,
      }}
    >
      <h4 style={{ fontSize: 14, fontWeight: 700, color, margin: 0 }}>
        {label}
      </h4>
      {!showForm ? (
        <button
          className="btn btn-primary"
          style={{
            ...S.btn,
            fontSize: 13,
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
          }}
          onClick={onAdd}
        >
          <Ic
            src={plusIcon}
            size={12}
            style={{
              mixBlendMode: "normal",
              filter: "brightness(0) invert(1)",
            }}
          />{" "}
          Add
        </button>
      ) : (
        <button
          className="btn btn-ghost btn-sm pr-btn-auto"
          onClick={onCancelForm}
        >
          ✕ Cancel
        </button>
      )}
    </div>
  );

  const ownerIsConfirmed =
    ownerStep === OWNER_STEPS.FORM ||
    (ownerStep === OWNER_STEPS.SEARCH && selectedOwnerProfile);

  const OwnerStepUI = () => {
    if (ownerStep === OWNER_STEPS.ASK) {
      return (
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              borderRadius: 10,
              padding: "14px 18px",
              marginBottom: 18,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "#dbeafe",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Ic
                src={userIcon}
                size={20}
                style={{
                  mixBlendMode: "normal",
                  filter:
                    "brightness(0) saturate(100%) invert(20%) sepia(90%) saturate(800%) hue-rotate(210deg)",
                }}
              />
            </span>
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#1e40af",
                }}
              >
                Does the pet owner already have an account?
              </p>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "#3b82f6" }}>
                This helps us link the patient to an existing owner or create a
                new one.
              </p>
            </div>
          </div>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            <button
              onClick={() => {
                setOwnerStep(OWNER_STEPS.SEARCH);
                setOwnerSearchQuery("");
                setOwnerSearchRes([]);
                setSelectedOwnerProfile(null);
              }}
              style={{
                background: "#f0fdf4",
                border: "2px solid #bbf7d0",
                borderRadius: 12,
                padding: "20px 16px",
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "inherit",
              }}
            >
              <div style={{ marginBottom: 8 }}>
                <Ic
                  src={checkIcon}
                  size={28}
                  style={{ mixBlendMode: "normal" }}
                />
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#166534",
                  marginBottom: 4,
                }}
              >
                Yes, they have an account
              </div>
              <div style={{ fontSize: 12, color: "#16a34a", lineHeight: 1.4 }}>
                Search and link to an existing customer profile.
              </div>
            </button>
            <button
              onClick={() => {
                setOwnerStep(OWNER_STEPS.FORM);
                setSelectedOwnerProfile(null);
              }}
              style={{
                background: "#faf5ff",
                border: "2px solid #e9d5ff",
                borderRadius: 12,
                padding: "20px 16px",
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "inherit",
              }}
            >
              <div style={{ marginBottom: 8 }}>
                <Ic
                  src={plusIcon}
                  size={28}
                  style={{ mixBlendMode: "normal" }}
                />
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#6b21a8",
                  marginBottom: 4,
                }}
              >
                No, create a new account
              </div>
              <div style={{ fontSize: 12, color: "#9333ea", lineHeight: 1.4 }}>
                Fill in owner details and we'll set up their account.
              </div>
            </button>
          </div>
        </div>
      );
    }
    if (ownerStep === OWNER_STEPS.SEARCH) {
      return (
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 14,
            }}
          >
            <button
              onClick={() => {
                setOwnerStep(OWNER_STEPS.ASK);
                setSelectedOwnerProfile(null);
              }}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--muted)",
                fontSize: 13,
                fontFamily: "inherit",
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "4px 0",
              }}
            >
              ← Back
            </button>
            <h4
              style={{
                margin: 0,
                fontSize: 14,
                fontWeight: 700,
                color: "var(--text)",
              }}
            >
              Search Customer Account
            </h4>
          </div>
          <div
            style={{
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: 8,
              padding: "9px 14px",
              marginBottom: 12,
              fontSize: 12,
              color: "#166534",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span>
              Only showing <strong>Customer</strong> accounts.
            </span>
          </div>
          {selectedOwnerProfile ? (
            <div
              style={{
                background: "#f0fdf4",
                border: "1.5px solid #22c55e",
                borderRadius: 10,
                padding: "12px 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 14,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg,#22c55e,#16a34a)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 14,
                  }}
                >
                  {(selectedOwnerProfile.full_name ||
                    selectedOwnerProfile.email ||
                    "?")[0].toUpperCase()}
                </div>
                <div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#166534",
                    }}
                  >
                    {selectedOwnerProfile.full_name ||
                      selectedOwnerProfile.email}
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: "#16a34a" }}>
                    {selectedOwnerProfile.email}
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    fontSize: 11,
                    background: "#dcfce7",
                    color: "#166534",
                    borderRadius: 99,
                    padding: "3px 10px",
                    fontWeight: 700,
                  }}
                >
                  Selected
                </span>
                <button
                  onClick={() => setSelectedOwnerProfile(null)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#dc2626",
                    fontSize: 12,
                    fontFamily: "inherit",
                    fontWeight: 600,
                  }}
                >
                  Change
                </button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ position: "relative", marginBottom: 10 }}>
                <input
                  autoFocus
                  type="text"
                  value={ownerSearchQuery}
                  onChange={(e) => {
                    setOwnerSearchQuery(e.target.value);
                    setAddPatientErrors((er) => ({ ...er, owner_search: "" }));
                  }}
                  placeholder="Search by customer name or email…"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: `1.5px solid ${addPatientErrors.owner_search ? "#ef4444" : "var(--border)"}`,
                    borderRadius: 8,
                    fontSize: 13,
                    color: "var(--text)",
                    boxSizing: "border-box",
                    background: "var(--bg)",
                    outline: "none",
                    fontFamily: "inherit",
                  }}
                />
              </div>
              {addPatientErrors.owner_search && (
                <p
                  style={{ fontSize: 11, color: "#dc2626", margin: "0 0 10px" }}
                >
                  {addPatientErrors.owner_search}
                </p>
              )}
              {ownerSearchLoading && (
                <div style={{ padding: "10px 0" }}>
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 14px",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        marginBottom: 6,
                      }}
                    >
                      <div
                        className="sk"
                        style={{ width: 34, height: 34, borderRadius: "50%" }}
                      />
                      <div
                        style={{
                          flex: 1,
                          display: "flex",
                          flexDirection: "column",
                          gap: 6,
                        }}
                      >
                        <Sk w="50%" h={13} />
                        <Sk w="70%" h={11} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {!ownerSearchLoading &&
                ownerSearchQuery.trim() &&
                ownerSearchRes.length === 0 && (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "20px 0",
                      color: "var(--muted)",
                    }}
                  >
                    <p style={{ fontSize: 13, margin: 0 }}>
                      No customer accounts found for "
                      <strong>{ownerSearchQuery}</strong>"
                    </p>
                  </div>
                )}
              {ownerSearchRes.length > 0 && (
                <div
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    overflow: "hidden",
                    marginBottom: 4,
                  }}
                >
                  {ownerSearchRes.map((p, i) => (
                    <div
                      key={p.id}
                      onClick={() => {
                        setSelectedOwnerProfile(p);
                        setForm((prev) => ({
                          ...prev,
                          owner: p.full_name || prev.owner,
                          owner_email: p.email,
                        }));
                        setPetMode("new");
                        fetchExistingPatientsForOwner(p.full_name, p.id);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 14px",
                        borderBottom:
                          i < ownerSearchRes.length - 1
                            ? "1px solid var(--border)"
                            : "none",
                        cursor: "pointer",
                        background: "var(--card)",
                        transition: "background 0.12s",
                      }}
                      onMouseOver={(e) =>
                        (e.currentTarget.style.background = "#f0fdf4")
                      }
                      onMouseOut={(e) =>
                        (e.currentTarget.style.background = "var(--card)")
                      }
                    >
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: "50%",
                          background: "linear-gradient(135deg,#0ea5e9,#06b6d4)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#fff",
                          fontWeight: 700,
                          fontSize: 13,
                        }}
                      >
                        {(p.full_name || p.email || "?")[0].toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 13,
                            fontWeight: 600,
                            color: "var(--text)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {p.full_name || p.email}
                        </p>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 11,
                            color: "var(--muted)",
                          }}
                        >
                          {p.email}
                        </p>
                      </div>
                      <span
                        style={{
                          fontSize: 12,
                          color: "#16a34a",
                          fontWeight: 600,
                          flexShrink: 0,
                        }}
                      >
                        Select →
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          <div
            style={{
              borderTop: "1px solid var(--border)",
              marginTop: 16,
              paddingTop: 14,
            }}
          >
            {!selectedOwnerProfile && (
              <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>
                Can't find the owner?{" "}
                <button
                  onClick={() => {
                    setOwnerStep(OWNER_STEPS.FORM);
                    setSelectedOwnerProfile(null);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--royal)",
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: "inherit",
                    padding: 0,
                  }}
                >
                  Create a new account instead →
                </button>
              </p>
            )}
          </div>
        </div>
      );
    }
    if (ownerStep === OWNER_STEPS.FORM) {
      return (
        <div style={{ marginBottom: 18 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 12,
            }}
          >
            <button
              onClick={() => {
                setOwnerStep(OWNER_STEPS.ASK);
                setSelectedOwnerProfile(null);
              }}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--muted)",
                fontSize: 13,
                fontFamily: "inherit",
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "4px 0",
              }}
            >
              ← Back
            </button>
            <h4
              style={{
                margin: 0,
                fontSize: 14,
                fontWeight: 700,
                color: "var(--text)",
              }}
            >
              New Owner Details
            </h4>
          </div>
          <div
            style={{
              background: "#faf5ff",
              border: "1px solid #e9d5ff",
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: 12,
              color: "#6b21a8",
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
            }}
          >
            <Ic
              src={plusIcon}
              size={14}
              style={{ mixBlendMode: "normal", marginTop: 1 }}
            />
            <span>
              Fill in the owner's details and we'll automatically create a login
              account and send them a welcome message in{" "}
              <strong>Messages</strong>.
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  const VaxEditRow = ({ v }) => (
    <div
      style={{
        background: "#f0fdf4",
        border: "1.5px solid #86efac",
        borderRadius: 10,
        padding: 20,
        marginBottom: 8,
      }}
    >
      <p
        style={{
          margin: "0 0 12px",
          fontSize: 12,
          fontWeight: 700,
          color: "#166534",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <EditIcon /> Editing: {v.name}
      </p>
      <VaxFields form={editVaxForm} setForm={setEditVaxForm} />
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 8,
          marginTop: 8,
        }}
      >
        <button
          className="btn btn-ghost pr-btn-auto"
          onClick={() => setEditingVaxId(null)}
        >
          Cancel
        </button>
        <button
          className="btn btn-primary pr-btn-auto"
          onClick={saveEditVax}
          disabled={vaxSaving}
        >
          {vaxSaving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );

  const TreatEditRow = ({ t }) => (
    <div
      style={{
        background: "#fffbeb",
        border: "1.5px solid #fde68a",
        borderRadius: 10,
        padding: 20,
        marginBottom: 8,
      }}
    >
      <p
        style={{
          margin: "0 0 12px",
          fontSize: 12,
          fontWeight: 700,
          color: "#92400e",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <EditIcon /> Editing: {t.diagnosis}
      </p>
      <TreatFields form={editTreatForm} setForm={setEditTreatForm} />
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 8,
          marginTop: 8,
        }}
      >
        <button
          className="btn btn-ghost pr-btn-auto"
          onClick={() => setEditingTreatId(null)}
        >
          Cancel
        </button>
        <button
          className="btn btn-primary pr-btn-auto"
          onClick={saveEditTreat}
          disabled={treatSaving}
        >
          {treatSaving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );

  return (
    <Layout>
      <div
        className="toast-stack"
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 999999,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          pointerEvents: "none",
        }}
      >
        {toasts
          .slice()
          .reverse()
          .map((t) => (
            <LiveToast
              key={t.id}
              message={t.message}
              show={t.show}
              type={t.type}
            />
          ))}
      </div>
      <Modal
        show={appModal.show}
        title={appModal.title}
        message={appModal.message}
        onConfirm={appModal.onConfirm}
        onCancel={appModal.onCancel}
        confirmText={appModal.confirmText}
        cancelText={appModal.cancelText}
        confirmColor={appModal.confirmColor}
      />
      {typeDeleteModal.show && (
        <div className="pr-overlay" style={{ zIndex: 1200 }}>
          <div
            style={{
              background: "var(--card)",
              borderRadius: 14,
              boxShadow: "0 24px 64px rgba(0,0,0,0.30)",
              width: "100%",
              maxWidth: 420,
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "20px 24px 4px" }}>
              <h3
                style={{
                  margin: 0,
                  fontSize: 16,
                  fontWeight: 800,
                  color: "#dc2626",
                }}
              >
                {typeDeleteModal.title}
              </h3>
              <p
                style={{
                  margin: "8px 0 0",
                  fontSize: 13,
                  color: "var(--muted)",
                  lineHeight: 1.5,
                }}
              >
                {typeDeleteModal.message}
              </p>
            </div>
            <div style={{ padding: "16px 24px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  marginBottom: 6,
                }}
              >
                Type{" "}
                <span style={{ color: "#dc2626" }}>
                  {typeDeleteModal.recordLabel}
                </span>{" "}
                to confirm
              </label>
              <input
                type="text"
                autoFocus
                value={typeDeleteModal.typed}
                onChange={(e) =>
                  setTypeDeleteModal((m) => ({ ...m, typed: e.target.value }))
                }
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    typeDeleteModal.typed === typeDeleteModal.recordLabel
                  ) {
                    const fn = typeDeleteModal.onConfirm;
                    closeTypeDeleteModal();
                    fn && fn();
                  }
                }}
                placeholder={typeDeleteModal.recordLabel}
                style={{
                  width: "100%",
                  border: "1.5px solid var(--border)",
                  borderRadius: 8,
                  padding: "9px 12px",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--text)",
                  outline: "none",
                  fontFamily: "inherit",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                padding: "14px 24px",
                borderTop: "1px solid var(--border)",
              }}
            >
              <button
                className="btn btn-ghost pr-btn-auto"
                onClick={closeTypeDeleteModal}
              >
                Cancel
              </button>
              <button
                className="btn pr-btn-auto"
                disabled={typeDeleteModal.typed !== typeDeleteModal.recordLabel}
                onClick={() => {
                  const fn = typeDeleteModal.onConfirm;
                  closeTypeDeleteModal();
                  fn && fn();
                }}
                style={{
                  background:
                    typeDeleteModal.typed === typeDeleteModal.recordLabel
                      ? "#dc2626"
                      : "#fca5a5",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "8px 16px",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor:
                    typeDeleteModal.typed === typeDeleteModal.recordLabel
                      ? "pointer"
                      : "not-allowed",
                  fontFamily: "inherit",
                }}
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}
      {existingAccModal.show && (
        <div className="pr-overlay" style={{ zIndex: 1100 }}>
          <div
            style={{
              background: "var(--card)",
              borderRadius: 14,
              boxShadow: "0 24px 64px rgba(0,0,0,0.30)",
              width: "100%",
              maxWidth: 440,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                background: "linear-gradient(135deg,#fef3c7,#fde68a)",
                padding: "20px 24px 16px",
                borderBottom: "1px solid #fde68a",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    background: "#f59e0b",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ic
                    src={userIcon}
                    size={24}
                    style={{
                      mixBlendMode: "normal",
                      filter: "brightness(0) invert(1)",
                    }}
                  />
                </div>
                <div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: 16,
                      fontWeight: 800,
                      color: "#92400e",
                    }}
                  >
                    Account Already Exists
                  </h3>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 12,
                      color: "#b45309",
                      marginTop: 2,
                    }}
                  >
                    This email is already registered in the system
                  </p>
                </div>
              </div>
            </div>
            <div style={{ padding: "20px 24px" }}>
              <div
                style={{
                  background: "#fffbeb",
                  border: "1px solid #fde68a",
                  borderRadius: 10,
                  padding: "14px 16px",
                  marginBottom: 16,
                }}
              >
                <p
                  style={{
                    margin: "0 0 8px",
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#92400e",
                  }}
                >
                  {existingAccModal.email}
                </p>
                {existingAccModal.existingName && (
                  <p style={{ margin: 0, fontSize: 12, color: "#b45309" }}>
                    Registered as:{" "}
                    <strong>{existingAccModal.existingName}</strong>
                  </p>
                )}
              </div>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--text)",
                  margin: "0 0 16px",
                  lineHeight: 1.6,
                }}
              >
                The patient will be linked to the{" "}
                <strong>existing account</strong> automatically.
              </p>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                padding: "14px 24px",
                borderTop: "1px solid var(--border)",
              }}
            >
              <button
                className="btn btn-ghost pr-btn-auto"
                onClick={() =>
                  setExistingAccModal((m) => ({ ...m, show: false }))
                }
              >
                Cancel
              </button>{" "}
              <button
                className="btn btn-primary pr-btn-auto"
                style={{ background: "#f59e0b", borderColor: "#f59e0b" }}
                onClick={existingAccModal.onContinue}
              >
                Got it — Continue Saving
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── TOPBAR ── */}
      <div
        className="topbar patient-record-topbar"
        style={{
          "--pr-topbar-top": "68px",
          "--pr-topbar-left": "var(--current-sidebar-w, 62px)",
          position: "fixed",
          top: "var(--pr-topbar-top)",
          left: "var(--pr-topbar-left)",
          right: 0,
          zIndex: 40,
          background: "#fff",
        }}
      >
        <div className="topbar-title">
          <img src="/icon/patient_record.png" alt="" />
          <div>
            <h1>Patient Records</h1>
            <p>Manage all patient medical records</p>
          </div>
        </div>
        <div className="topbar-actions">
          {seeAllBranches && (
            <div style={{ position: "relative", width: 190 }}>
              <CustomSelect
                value={branchFilter}
                onChange={(val) => setBranchFilter(val)}
                placeholder="All Branches"
                accent="#7c3aed"
                options={branches.map((b) => ({ value: b.id, label: b.name }))}
              />
            </div>
          )}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "var(--bg)",
              border: "1.5px solid var(--border)",
              borderRadius: 8,
              padding: "8px 14px",
            }}
          >
            <img
              src="/icon/search.png"
              alt=""
              style={{
                width: 16,
                height: 16,
                filter: "brightness(0) saturate(100%) invert(40%)",
              }}
            />
            <input
              type="text"
              placeholder="Search patient, owner, species..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                border: "none",
                background: "transparent",
                fontSize: 13,
                color: "var(--text)",
                outline: "none",
                fontFamily: "inherit",
                width: 220,
              }}
            />
          </div>
          <button
            onClick={() => setShowDeletedModal(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "#fef2f2",
              border: "1.5px solid #fca5a5",
              color: "#dc2626",
              borderRadius: 8,
              padding: "8px 14px",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            </svg>
            Recently Deleted{" "}
            {deletedPatients.length > 0 ? `(${deletedPatients.length})` : ""}
          </button>
          <div
            className="fab-wrap"
            style={{
              position: "fixed",
              bottom: 28,
              right: 28,
              zIndex: 999,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.querySelector(".fab-tooltip").style.opacity = "1";
              e.currentTarget.querySelector(".fab-tooltip").style.transform =
                "translateX(0)";
              e.currentTarget.querySelector(".fab-btn").style.transform =
                "scale(1.1)";
              e.currentTarget.querySelector(".fab-btn").style.boxShadow =
                "0 6px 28px rgba(30,58,138,0.5)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.querySelector(".fab-tooltip").style.opacity = "0";
              e.currentTarget.querySelector(".fab-tooltip").style.transform =
                "translateX(8px)";
              e.currentTarget.querySelector(".fab-btn").style.transform =
                "scale(1)";
              e.currentTarget.querySelector(".fab-btn").style.boxShadow =
                "0 4px 20px rgba(30,58,138,0.4)";
            }}
          >
            <span
              className="fab-tooltip"
              style={{
                opacity: 0,
                transform: "translateX(8px)",
                transition: "opacity 0.2s ease, transform 0.2s ease",
                background: "linear-gradient(135deg, #0f172a, #1e3a8a)",
                color: "#fff",
                fontSize: 12,
                fontWeight: 700,
                padding: "8px 14px",
                borderRadius: 10,
                whiteSpace: "nowrap",
                pointerEvents: "none",
                boxShadow:
                  "0 8px 24px rgba(30,58,138,0.35), 0 2px 8px rgba(0,0,0,0.2)",
                border: "1px solid rgba(255,255,255,0.12)",
                display: "flex",
                alignItems: "center",
                gap: 7,
                letterSpacing: "0.2px",
                position: "relative",
              }}
            >
              <span
                style={{
                  display: "flex",
                  flexDirection: "column",
                  lineHeight: 1.2,
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 800, color: "#fff" }}>
                  Add Patient
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 500,
                    color: "rgba(255,255,255,0.55)",
                  }}
                >
                  Register new record
                </span>
              </span>
              {/* Arrow pointer */}
              <span
                style={{
                  position: "absolute",
                  right: -6,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 0,
                  height: 0,
                  borderTop: "6px solid transparent",
                  borderBottom: "6px solid transparent",
                  borderLeft: "6px solid #1e3a8a",
                }}
              />
            </span>
            <button
              onClick={openAdd}
              className="fab-btn"
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "linear-gradient(135deg,#1e3a8a,#3b82f6)",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 20px rgba(30,58,138,0.4)",
                transition: "transform 0.2s, box-shadow 0.2s",
                flexShrink: 0,
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#fff"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      {/* ── CONTENT ── */}
      <div
        className="content pr-page-content"
        style={{ paddingTop: "var(--pr-content-pad-top, 70px)", marginTop: 0 }}
      >
        <div
          className="pr-stat-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 14,
            marginBottom: "var(--pr-stat-gap-bottom, 24px)",
            marginTop: 0,
            overflowX: "hidden",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          {loading
            ? [1, 2, 3, 4].map((i) => <StatCardSkeleton key={i} />)
            : [
                {
                  label: "Total Patients",
                  value: patients.length,
                  icon: "/icon/attended.png",
                  color: "blue",
                  sub: "All registered patients",
                  filterValue: "all",
                },
                {
                  label: "Admitted",
                  value: patients.filter((p) => p.status === "Admitted").length,
                  icon: "/icon/admitted.png",
                  color: "green",
                  sub: "Currently admitted",
                  filterValue: "Admitted",
                },
                {
                  label: "Outpatient",
                  value: patients.filter((p) => p.status === "Outpatient")
                    .length,
                  icon: "/icon/outpatient.png",
                  color: "yellow",
                  sub: "Outpatient visits",
                  filterValue: "Outpatient",
                },
                {
                  label: "Critical",
                  value: patients.filter((p) => p.health === "Critical").length,
                  icon: "/icon/critical.png",
                  color: "red",
                  sub:
                    patients.filter((p) => p.health === "Critical").length > 0
                      ? "Needs attention"
                      : "All stable",
                  filterValue: "Critical",
                },
              ].map((sc, i) => (
                <div
                  key={i}
                  className={`stat-card-v2 ${sc.color} fade-in`}
                  style={{ animationDelay: `${i * 0.07}s`, cursor: "pointer" }}
                  role="button"
                  tabIndex={0}
                  title={`Show ${sc.label.toLowerCase()}`}
                  onClick={() => setStatusFilter(sc.filterValue)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setStatusFilter(sc.filterValue);
                    }
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start" }}>
                    <div className={`stat-icon-v2 ${sc.color}`}>
                      <img
                        src={sc.icon}
                        alt=""
                        style={{ width: 24, height: 24 }}
                      />
                    </div>
                  </div>
                  <div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 11,
                        fontWeight: 600,
                        color: "var(--muted)",
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      {sc.label}
                    </p>
                    <h3
                      style={{
                        margin: "4px 0 6px",
                        fontSize: 26,
                        fontWeight: 800,
                        lineHeight: 1,
                      }}
                    >
                      {sc.value}
                    </h3>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color:
                          sc.color === "red" && sc.value > 0
                            ? "#dc2626"
                            : "var(--muted)",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      {sc.color === "red" && sc.value > 0 && (
                        <svg
                          width="11"
                          height="11"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        >
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                          <line x1="12" y1="9" x2="12" y2="13" />
                          <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                      )}
                      {sc.sub}
                    </span>
                  </div>
                </div>
              ))}
        </div>

        <div className="pr-card">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 18px",
              borderBottom: "1px solid var(--border)",
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <h2 style={{ fontSize: 15, fontWeight: 700 }}>All Patients</h2>
            <div
              className="fade-in"
              style={{
                display: "flex",
                gap: 6,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              {[
                { label: "All", value: "all" },
                { label: "Admitted", value: "Admitted" },
                { label: "Outpatient", value: "Outpatient" },
                { label: "Critical", value: "Critical" },
              ].map((f) => (
                <button
                  key={f.value}
                  onClick={() => setStatusFilter(f.value)}
                  style={{
                    padding: "5px 14px",
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    border: "1.5px solid",
                    background:
                      statusFilter === f.value ? "var(--royal)" : "transparent",
                    color: statusFilter === f.value ? "#fff" : "var(--muted)",
                    borderColor:
                      statusFilter === f.value
                        ? "var(--royal)"
                        : "var(--border)",
                    transition: "all 0.15s",
                  }}
                >
                  {f.label}
                </button>
              ))}

              <div
                style={{
                  width: 1,
                  height: 20,
                  background: "var(--border)",
                  margin: "0 4px",
                }}
              />

              {[
                { label: "All Species", value: "all" },
                { label: "Dog", value: "Dog" },
                { label: "Cat", value: "Cat" },
              ].map((f) => (
                <button
                  key={f.value}
                  onClick={() => setSpeciesFilter(f.value)}
                  style={{
                    padding: "5px 14px",
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    border: "1.5px solid",
                    background:
                      speciesFilter === f.value
                        ? "var(--royal)"
                        : "transparent",
                    color: speciesFilter === f.value ? "#fff" : "var(--muted)",
                    borderColor:
                      speciesFilter === f.value
                        ? "var(--royal)"
                        : "var(--border)",
                    transition: "all 0.15s",
                  }}
                >
                  {f.label}
                </button>
              ))}

              <div
                style={{
                  width: 1,
                  height: 20,
                  background: "var(--border)",
                  margin: "0 4px",
                }}
              />

              <div style={{ width: 150 }}>
                <CustomSelect
                  value={
                    !sortField
                      ? ""
                      : sortField === "created_at" && sortDir === "desc"
                        ? "newest"
                        : sortField === "created_at" && sortDir === "asc"
                          ? "oldest"
                          : sortField === "name" && sortDir === "asc"
                            ? "az"
                            : ""
                  }
                  onChange={(val) => {
                    if (val === "newest") {
                      setSortField("created_at");
                      setSortDir("desc");
                    } else if (val === "oldest") {
                      setSortField("created_at");
                      setSortDir("asc");
                    } else if (val === "az") {
                      setSortField("name");
                      setSortDir("asc");
                    } else {
                      setSortField(null);
                    }
                  }}
                  placeholder="Sort by…"
                  options={[
                    { value: "newest", label: "Newest" },
                    { value: "oldest", label: "Oldest" },
                    { value: "az", label: "A-Z" },
                  ]}
                />
              </div>

              <span
                style={{ color: "var(--muted)", fontSize: 12, marginLeft: 6 }}
              >
                {sortedFiltered.length} record
                {sortedFiltered.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            {loading ? (
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 13,
                  minWidth: 780,
                }}
              >
                <thead>
                  <tr>
                    <th className="pr-th">Patient</th>
                    <th className="pr-th">Owner</th>
                    <th className="pr-th">Condition</th>
                    <th className="pr-th">Status</th>
                    <th className="pr-th">Health</th>
                    <th className="pr-th">Room</th>
                    <th className="pr-th">Registered</th>
                    <th style={{ ...S.th, textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <TableRowSkeleton />
                  <TableRowSkeleton />
                  <TableRowSkeleton />
                  <TableRowSkeleton />
                  <TableRowSkeleton />
                </tbody>
              </table>
            ) : (
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 13,
                  minWidth: 780,
                }}
              >
                <thead>
                  <tr>
                    {[
                      "Patient",
                      "Owner",
                      "Condition",
                      "Status",
                      "Health",
                      "Room",
                      "Registered",
                      "Actions",
                    ].map((h) => (
                      <th key={h} className="pr-th">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        style={{
                          textAlign: "center",
                          padding: "48px 20px",
                          color: "var(--muted)",
                        }}
                      >
                        <div style={{ marginBottom: 8 }}>
                          <svg
                            width="36"
                            height="36"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#cbd5e1"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          >
                            <circle cx="7" cy="10" r="2" />
                            <circle cx="17" cy="10" r="2" />
                            <circle cx="4" cy="6" r="1.5" />
                            <circle cx="20" cy="6" r="1.5" />
                            <path d="M12 14c-3.3 0-6 2-6 4.5h12c0-2.5-2.7-4.5-6-4.5z" />
                          </svg>
                        </div>
                        <div style={{ fontSize: 13 }}>
                          No patients match your search or filter.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginated.map((p, idx) => {
                      const criticalDot = {
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        flexShrink: 0,
                        display: "inline-block",
                      };
                      const healthDotColor =
                        {
                          Good: "#16a34a",
                          Fair: "#d97706",
                          Critical: "#dc2626",
                        }[p.health] || "#9ca3af";
                      const statusDotColor =
                        { Admitted: "#2563eb", Outpatient: "#9ca3af" }[
                          p.status
                        ] || "#9ca3af";
                      const initials = (p.owner || "?")
                        .split(" ")
                        .map((w) => w[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase();
                      return (
                        <tr
                          key={p.id}
                          className="fade-in"
                          style={{
                            cursor: "pointer",
                            background: "var(--card)",
                            animationDelay: `${idx * 0.06}s`,
                          }}
                          onClick={() => openView(p)}
                        >
                          {/* Patient */}
                          <td className="pr-td">
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                              }}
                            >
                              <div
                                style={{
                                  width: 34,
                                  height: 34,
                                  borderRadius: 10,
                                  flexShrink: 0,
                                  background:
                                    p.species === "Cat" ? "#f0fdf4" : "#eff6ff",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: 17,
                                }}
                              >
                                {p.species === "Cat" ? (
                                  <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 16 16"
                                    fill="#16a34a"
                                    xmlns="http://www.w3.org/2000/svg"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      clipRule="evenodd"
                                      d="M1 7L4.80061 1.43926C5.56059 0.527292 6.68638 0 7.8735 0H8V4L12 5L15 10L14.1875 11.2188C13.4456 12.3316 12.1967 13 10.8593 13H9L7 16H5L1 7ZM10 9C10.5523 9 11 8.55229 11 8C11 7.44772 10.5523 7 10 7C9.44771 7 9 7.44772 9 8C9 8.55229 9.44771 9 10 9Z"
                                    />
                                    <path d="M10 0.465878V2.43845L12 2.93845V0H11.8735C11.2125 0 10.5704 0.163501 10 0.465878Z" />
                                  </svg>
                                ) : (
                                  <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 16 16"
                                    fill="#1d4ed8"
                                    xmlns="http://www.w3.org/2000/svg"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      clipRule="evenodd"
                                      d="M16 4V7C16 9.20914 14.2091 11 12 11H10V15H0V13L0.931622 10.8706C1.25226 10.9549 1.59036 11 1.94124 11C3.74931 11 5.32536 9.76947 5.76388 8.01538L3.82359 7.53031C3.60766 8.39406 2.83158 9.00001 1.94124 9.00001C1.87789 9.00001 1.81539 8.99702 1.75385 8.99119C1.02587 8.92223 0.432187 8.45551 0.160283 7.83121C0.0791432 7.64491 0.0266588 7.44457 0.00781272 7.23658C-0.0112323 7.02639 0.00407892 6.80838 0.0588889 6.58914C0.0588882 6.58914 0.0588896 6.58913 0.0588889 6.58914L0.698705 4.02986C1.14387 2.24919 2.7438 1 4.57928 1H10L12 4H16ZM9 6C9.55229 6 10 5.55228 10 5C10 4.44772 9.55229 4 9 4C8.44771 4 8 4.44772 8 5C8 5.55228 8.44771 6 9 6Z"
                                    />
                                  </svg>
                                )}
                              </div>
                              <div>
                                <div
                                  style={{
                                    fontWeight: 600,
                                    fontSize: 13,
                                    color: "var(--text)",
                                  }}
                                >
                                  {p.name}
                                </div>
                                <div
                                  style={{
                                    fontSize: 11,
                                    color: "var(--muted)",
                                    marginTop: 1,
                                  }}
                                >
                                  {p.species}
                                  {p.breed ? ` · ${p.breed}` : ""}
                                  {p.gender ? ` · ${p.gender}` : ""}
                                </div>
                              </div>
                            </div>
                          </td>
                          {/* Owner */}
                          <td className="pr-td">
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                              }}
                            >
                              <div
                                style={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: "50%",
                                  flexShrink: 0,
                                  background: "var(--bg)",
                                  border: "1.5px solid var(--border)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: "var(--muted)",
                                }}
                              >
                                {initials}
                              </div>
                              <div>
                                <div
                                  style={{ fontSize: 13, color: "var(--text)" }}
                                >
                                  {p.owner || "—"}
                                </div>
                                {p.contact && (
                                  <div
                                    style={{
                                      fontSize: 11,
                                      color: "var(--muted)",
                                      marginTop: 1,
                                    }}
                                  >
                                    {p.contact}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          {/* Condition */}
                          <td className="pr-td">
                            {p.condition ? (
                              <span
                                style={{
                                  fontSize: 12,
                                  color: "var(--muted)",
                                  display: "block",
                                  maxWidth: 180,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                                title={p.condition}
                              >
                                {p.condition}
                              </span>
                            ) : (
                              <span
                                style={{
                                  fontSize: 12,
                                  color: "var(--muted)",
                                  fontStyle: "italic",
                                }}
                              >
                                No diagnosis
                              </span>
                            )}
                          </td>
                          {/* Status */}
                          <td className="pr-td">
                            <span
                              className={`badge ${STATUS_BADGE[p.status] || "badge-gray"}`}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 5,
                              }}
                            >
                              <span
                                style={{
                                  ...criticalDot,
                                  background: statusDotColor,
                                }}
                              />
                              {p.status}
                            </span>
                          </td>
                          {/* Health */}
                          <td className="pr-td">
                            <span
                              className={`badge ${HEALTH_BADGE[p.health] || "badge-gray"}`}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 5,
                              }}
                            >
                              <span
                                style={{
                                  ...criticalDot,
                                  background: healthDotColor,
                                  ...(p.health === "Critical"
                                    ? {
                                        animation:
                                          "sk-shimmer 1s ease-in-out infinite",
                                      }
                                    : {}),
                                }}
                              />
                              {p.health}
                            </span>
                          </td>
                          {/* Room */}
                          <td className="pr-td">
                            {p.room ? (
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4,
                                  background: "#eff6ff",
                                  border: "1px solid #bfdbfe",
                                  color: "#1e40af",
                                  borderRadius: 6,
                                  padding: "3px 9px",
                                  fontSize: 12,
                                  fontWeight: 600,
                                }}
                              >
                                <svg
                                  width="11"
                                  height="11"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                >
                                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                  <polyline points="9 22 9 12 15 12 15 22" />
                                </svg>{" "}
                                {p.room}
                              </span>
                            ) : (
                              <span
                                style={{
                                  fontSize: 12,
                                  color: "var(--muted)",
                                  fontStyle: "italic",
                                }}
                              >
                                Unassigned
                              </span>
                            )}
                          </td>
                          {/* Registered date */}
                          <td
                            className="pr-td"
                            style={{ whiteSpace: "nowrap" }}
                          >
                            {p.created_at ? (
                              <span
                                style={{ fontSize: 12, color: "var(--text)" }}
                              >
                                {new Date(p.created_at).toLocaleDateString(
                                  "en-US",
                                  {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  },
                                )}
                              </span>
                            ) : (
                              <span
                                style={{
                                  fontSize: 12,
                                  color: "var(--muted)",
                                  fontStyle: "italic",
                                }}
                              >
                                —
                              </span>
                            )}
                          </td>
                          {/* Actions */}
                          <td
                            className="pr-td"
                            style={{ textAlign: "left", padding: "8px 14px" }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div
                              style={{
                                display: "flex",
                                gap: 6,
                                justifyContent: "flex-start",
                                alignItems: "center",
                              }}
                            >
                              {/* View */}
                              <button
                                title="View"
                                className="btn btn-sm"
                                style={{
                                  ...S.btn,
                                  height: 28,
                                  padding: "0 10px",
                                  gap: 5,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  background: "#eff6ff",
                                  border: "1.5px solid #bfdbfe",
                                  color: "#1d4ed8",
                                  borderRadius: 20,
                                  fontSize: 11,
                                  fontWeight: 600,
                                }}
                                onClick={() => openView(p)}
                              >
                                <svg
                                  width="12"
                                  height="12"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                >
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                  <circle cx="12" cy="12" r="3" />
                                </svg>
                                View
                              </button>

                              {/* Edit */}
                              <button
                                title="Edit"
                                className="btn btn-sm"
                                style={{
                                  ...S.btn,
                                  height: 28,
                                  padding: "0 10px",
                                  gap: 5,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  background: "#f8fafc",
                                  border: "1.5px solid #e2e8f0",
                                  color: "#475569",
                                  borderRadius: 20,
                                  fontSize: 11,
                                  fontWeight: 600,
                                }}
                                onClick={() => openEditPatient(p)}
                              >
                                <svg
                                  width="12"
                                  height="12"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                                Edit
                              </button>

                              {/* Delete */}
                              <button
                                title="Delete"
                                className="btn btn-sm"
                                style={{
                                  ...S.btn,
                                  height: 28,
                                  padding: "0 10px",
                                  gap: 5,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  background: "#fef2f2",
                                  border: "1.5px solid #fca5a5",
                                  color: "#dc2626",
                                  borderRadius: 20,
                                  fontSize: 11,
                                  fontWeight: 600,
                                }}
                                onClick={() =>
                                  showConfirm(
                                    "Delete Patient",
                                    `Delete ${p.name}? This cannot be undone.`,
                                    () => doDelete(p.id),
                                  )
                                }
                              >
                                <svg
                                  width="12"
                                  height="12"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                >
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                  <path d="M10 11v6M14 11v6" />
                                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                                </svg>
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
        {/* Pagination */}
        {totalPages > 1 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              padding: "14px 18px",
              borderTop: "1px solid var(--border)",
            }}
          >
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              style={{
                padding: "6px 14px",
                borderRadius: 20,
                border: "1.5px solid var(--border)",
                background: "transparent",
                fontSize: 13,
                fontWeight: 600,
                color: safePage === 1 ? "var(--muted)" : "var(--text)",
                cursor: safePage === 1 ? "default" : "pointer",
                fontFamily: "inherit",
              }}
            >
              prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
              <button
                key={pg}
                onClick={() => setCurrentPage(pg)}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 20,
                  border: "1.5px solid",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "all 0.15s",
                  background: safePage === pg ? "var(--royal)" : "transparent",
                  color: safePage === pg ? "#fff" : "var(--text)",
                  borderColor:
                    safePage === pg ? "var(--royal)" : "var(--border)",
                }}
              >
                {pg}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              style={{
                padding: "6px 14px",
                borderRadius: 20,
                border: "1.5px solid var(--border)",
                background: "transparent",
                fontSize: 13,
                fontWeight: 600,
                color: safePage === totalPages ? "var(--muted)" : "var(--text)",
                cursor: safePage === totalPages ? "default" : "pointer",
                fontFamily: "inherit",
              }}
            >
              next
            </button>
          </div>
        )}
      </div>
      {/* ── ADD PATIENT MODAL ── */}
      {activeModal === "add" &&
        ReactDOM.createPortal(
          <div className="pr-overlay">
            <div className="pr-modal-wrap">
              <div style={{ flexShrink: 0 }}>
                {/* Clipboard top bar */}
                <div
                  style={{
                    background: "linear-gradient(135deg, #0f172a, #1e3a8a)",
                    padding: "10px 24px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    onClick={closeModal}
                    style={{
                      background: "none",
                      border: "none",
                      fontSize: 18,
                      cursor: "pointer",
                      color: "rgba(255,255,255,0.75)",
                      lineHeight: 1,
                      padding: "2px 6px",
                    }}
                  >
                    ✕
                  </button>
                </div>
                {/* Medical record header */}
                <div
                  style={{
                    background: "var(--bg)",
                    borderBottom: "2px solid var(--border)",
                    padding: "14px 24px 12px",
                    textAlign: "center",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 10,
                      marginBottom: 4,
                    }}
                  >
                    <img
                      src="/icon/patient_record.png"
                      alt=""
                      style={{ width: 22, height: 22, objectFit: "contain" }}
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                    <h3
                      style={{
                        margin: 0,
                        fontSize: 15,
                        fontWeight: 800,
                        color: "var(--text)",
                        letterSpacing: "0.3px",
                      }}
                    >
                      Angeles Pet Care
                    </h3>
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 11,
                      color: "var(--muted)",
                      letterSpacing: "0.5px",
                    }}
                  >
                    {ownerStep === OWNER_STEPS.ASK
                      ? "Step 1 — Verify owner account"
                      : "Patient Registration Record"}
                  </p>
                </div>
              </div>
              {ownerIsConfirmed && (
                <div
                  style={{
                    padding: "0 24px",
                    borderBottom: "1px solid var(--border)",
                    flexShrink: 0,
                  }}
                >
                  <TabBar
                    tabs={ADD_TABS}
                    active={activeTab}
                    onSelect={(t) => {
                      setActiveTab(t);
                      setShowAddVaxForm(false);
                      setShowAddTreatForm(false);
                    }}
                    counts={{
                      vaccination: pendingVax.length,
                      treatment: pendingTreat.length,
                    }}
                  />
                </div>
              )}
              <div className="pr-modal-body">
                {activeTab === "info" && <OwnerStepUI />}
                {activeTab === "info" && ownerIsConfirmed && (
                  <div style={{ paddingTop: 4 }}>
                    {/* ── Section: Patient Identity ── */}
                    <div
                      style={{
                        borderBottom: "1.5px solid #e2e8f0",
                        marginBottom: 0,
                      }}
                    >
                      <div
                        style={{
                          background: "var(--bg)",
                          borderBottom: "1px solid var(--border)",
                          padding: "6px 16px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 800,
                            textTransform: "uppercase",
                            letterSpacing: "1px",
                            color: "var(--muted)",
                          }}
                        >
                          Patient Information
                        </span>
                      </div>
                      {/* Row 1: Name · Gender · D.o.B / Species */}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "2fr 1fr 1fr",
                          borderBottom: "1px solid #e2e8f0",
                        }}
                      >
                        <div
                          style={{
                            padding: "10px 14px",
                            borderRight: "1px solid #e2e8f0",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: "#94a3b8",
                              textTransform: "uppercase",
                              letterSpacing: "0.8px",
                              marginBottom: 6,
                            }}
                          >
                            Patient Name{" "}
                            <span style={{ color: "#ef4444" }}>*</span>
                          </div>
                          <input
                            type="text"
                            value={form.name}
                            maxLength={50}
                            onChange={(e) => {
                              setForm({
                                ...form,
                                name: sanitizeName(e.target.value).slice(0, 50),
                              });
                              setAddPatientErrors((er) => ({
                                ...er,
                                name: "",
                              }));
                            }}
                            placeholder="e.g. Buddy"
                            style={{
                              width: "100%",
                              border: "none",
                              borderBottom: `1.5px solid ${addPatientErrors.name ? "#ef4444" : "#cbd5e1"}`,
                              background: "transparent",
                              fontSize: 13,
                              fontWeight: 600,
                              color: "var(--text)",
                              outline: "none",
                              padding: "2px 0",
                              fontFamily: "inherit",
                              boxSizing: "border-box",
                            }}
                          />
                          {addPatientErrors.name && (
                            <p
                              style={{
                                fontSize: 10,
                                color: "#dc2626",
                                margin: "4px 0 0",
                              }}
                            >
                              {addPatientErrors.name}
                            </p>
                          )}
                        </div>
                        <div
                          style={{
                            padding: "10px 14px",
                            borderRight: "1px solid #e2e8f0",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: "#94a3b8",
                              textTransform: "uppercase",
                              letterSpacing: "0.8px",
                              marginBottom: 6,
                            }}
                          >
                            Sex / Gender
                          </div>
                          <CustomSelect
                            value={form.gender}
                            onChange={(val) =>
                              setForm({ ...form, gender: val })
                            }
                            placeholder="—"
                            options={["Male", "Female", "Unknown"]}
                          />
                        </div>
                        <div style={{ padding: "10px 14px" }}>
                          <div
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: "#94a3b8",
                              textTransform: "uppercase",
                              letterSpacing: "0.8px",
                              marginBottom: 6,
                            }}
                          >
                            Species <span style={{ color: "#ef4444" }}>*</span>
                          </div>
                          <CustomSelect
                            value={form.species}
                            onChange={(val) => {
                              setForm({ ...form, species: val });
                              setAddPatientErrors((er) => ({
                                ...er,
                                species: "",
                              }));
                            }}
                            placeholder="—"
                            options={["Dog", "Cat"]}
                          />
                          {addPatientErrors.species && (
                            <p
                              style={{
                                fontSize: 10,
                                color: "#dc2626",
                                margin: "4px 0 0",
                              }}
                            >
                              {addPatientErrors.species}
                            </p>
                          )}
                        </div>
                      </div>
                      {/* Row 2: Breed · Status · Health · Room */}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "2fr 1fr 1fr 1fr",
                          borderBottom: "1px solid #e2e8f0",
                        }}
                      >
                        <div
                          style={{
                            padding: "10px 14px",
                            borderRight: "1px solid #e2e8f0",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: "#94a3b8",
                              textTransform: "uppercase",
                              letterSpacing: "0.8px",
                              marginBottom: 6,
                            }}
                          >
                            Breed
                          </div>
                          <CustomSelect
                            value={form.breed}
                            onChange={(val) => setForm({ ...form, breed: val })}
                            placeholder={
                              form.species
                                ? "Select breed"
                                : "Select species first"
                            }
                            options={
                              form.species === "Cat"
                                ? CAT_BREEDS
                                : form.species === "Dog"
                                  ? DOG_BREEDS
                                  : []
                            }
                          />
                        </div>
                        <div
                          style={{
                            padding: "10px 14px",
                            borderRight: "1px solid #e2e8f0",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: "#94a3b8",
                              textTransform: "uppercase",
                              letterSpacing: "0.8px",
                              marginBottom: 6,
                            }}
                          >
                            Status
                          </div>
                          <CustomSelect
                            value={form.status}
                            onChange={(val) =>
                              setForm({ ...form, status: val })
                            }
                            placeholder="—"
                            options={["Outpatient", "Admitted"]}
                          />
                        </div>
                        <div
                          style={{
                            padding: "10px 14px",
                            borderRight: "1px solid #e2e8f0",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: "#94a3b8",
                              textTransform: "uppercase",
                              letterSpacing: "0.8px",
                              marginBottom: 6,
                            }}
                          >
                            Health
                          </div>
                          <CustomSelect
                            value={form.health}
                            onChange={(val) =>
                              setForm({ ...form, health: val })
                            }
                            placeholder="—"
                            options={["Good", "Fair", "Critical"]}
                          />
                        </div>
                        <div style={{ padding: "10px 14px" }}>
                          <div
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: "#94a3b8",
                              textTransform: "uppercase",
                              letterSpacing: "0.8px",
                              marginBottom: 6,
                            }}
                          >
                            Room / Ward
                          </div>
                          <CustomSelect
                            value={form.room}
                            onChange={(val) => setForm({ ...form, room: val })}
                            placeholder="— None —"
                            options={rooms
                              .filter((r) => r.status === "Available")
                              .map((r) => ({
                                value: r.number,
                                label: `${r.number}${r.type ? ` · ${r.type}` : ""}`,
                              }))}
                          />
                        </div>
                      </div>
                      {/* Row 3: Age · Temp · Heart Rate · Weight (all optional) */}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr 1fr 1fr",
                        }}
                      >
                        <div
                          style={{
                            padding: "10px 14px",
                            borderRight: "1px solid #e2e8f0",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: "#94a3b8",
                              textTransform: "uppercase",
                              letterSpacing: "0.8px",
                              marginBottom: 6,
                            }}
                          >
                            Age{" "}
                            <span
                              style={{ fontWeight: 400, textTransform: "none" }}
                            >
                              (optional)
                            </span>
                          </div>
                          <CustomSelect
                            value={form.age}
                            onChange={(val) => setForm({ ...form, age: val })}
                            placeholder="Select age"
                            options={AGE_OPTIONS}
                          />
                        </div>
                        <div
                          style={{
                            padding: "10px 14px",
                            borderRight: "1px solid #e2e8f0",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: "#94a3b8",
                              textTransform: "uppercase",
                              letterSpacing: "0.8px",
                              marginBottom: 6,
                            }}
                          >
                            Temp (°C){" "}
                            <span
                              style={{ fontWeight: 400, textTransform: "none" }}
                            >
                              (optional)
                            </span>
                          </div>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={form.temp}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                temp: e.target.value.replace(/[^0-9.]/g, ""),
                              })
                            }
                            placeholder="e.g. 38.5"
                            style={{
                              width: "100%",
                              border: "none",
                              borderBottom: "1.5px solid #cbd5e1",
                              background: "transparent",
                              fontSize: 13,
                              fontWeight: 600,
                              color: "var(--text)",
                              outline: "none",
                              padding: "2px 0",
                              fontFamily: "inherit",
                              boxSizing: "border-box",
                            }}
                          />
                        </div>
                        <div
                          style={{
                            padding: "10px 14px",
                            borderRight: "1px solid #e2e8f0",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: "#94a3b8",
                              textTransform: "uppercase",
                              letterSpacing: "0.8px",
                              marginBottom: 6,
                            }}
                          >
                            Heart Rate (bpm){" "}
                            <span
                              style={{ fontWeight: 400, textTransform: "none" }}
                            >
                              (optional)
                            </span>
                          </div>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={form.heart_rate}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                heart_rate: e.target.value.replace(/\D/g, ""),
                              })
                            }
                            placeholder="e.g. 120"
                            style={{
                              width: "100%",
                              border: "none",
                              borderBottom: "1.5px solid #cbd5e1",
                              background: "transparent",
                              fontSize: 13,
                              fontWeight: 600,
                              color: "var(--text)",
                              outline: "none",
                              padding: "2px 0",
                              fontFamily: "inherit",
                              boxSizing: "border-box",
                            }}
                          />
                        </div>
                        <div style={{ padding: "10px 14px" }}>
                          <div
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: "#94a3b8",
                              textTransform: "uppercase",
                              letterSpacing: "0.8px",
                              marginBottom: 6,
                            }}
                          >
                            Weight (kg){" "}
                            <span
                              style={{ fontWeight: 400, textTransform: "none" }}
                            >
                              (optional)
                            </span>
                          </div>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={form.weight}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                weight: e.target.value.replace(/[^0-9.]/g, ""),
                              })
                            }
                            placeholder="e.g. 8.2"
                            style={{
                              width: "100%",
                              border: "none",
                              borderBottom: "1.5px solid #cbd5e1",
                              background: "transparent",
                              fontSize: 13,
                              fontWeight: 600,
                              color: "var(--text)",
                              outline: "none",
                              padding: "2px 0",
                              fontFamily: "inherit",
                              boxSizing: "border-box",
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* ── Section: Owner / Method of Admittance ── */}
                    <div style={{ borderBottom: "1.5px solid #e2e8f0" }}>
                      <div
                        style={{
                          background: "var(--bg)",
                          borderBottom: "1px solid var(--border)",
                          padding: "6px 16px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 800,
                            textTransform: "uppercase",
                            letterSpacing: "1px",
                            color: "var(--muted)",
                          }}
                        >
                          Owner / Admittance
                        </span>
                      </div>
                      {ownerStep === OWNER_STEPS.FORM ? (
                        <>
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "1fr 1fr",
                              borderBottom: "1px solid #e2e8f0",
                            }}
                          >
                            <div
                              style={{
                                padding: "10px 14px",
                                borderRight: "1px solid #e2e8f0",
                              }}
                            >
                              <div
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  color: "#94a3b8",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.8px",
                                  marginBottom: 6,
                                }}
                              >
                                Owner First Name{" "}
                                <span style={{ color: "#ef4444" }}>*</span>
                              </div>
                              <input
                                type="text"
                                value={form.owner_first}
                                onChange={(e) => {
                                  setForm({
                                    ...form,
                                    owner_first: sanitizeName(e.target.value),
                                  });
                                  setAddPatientErrors((er) => ({
                                    ...er,
                                    owner_first: "",
                                  }));
                                }}
                                placeholder="e.g. Juan"
                                style={{
                                  width: "100%",
                                  border: "none",
                                  borderBottom: `1.5px solid ${addPatientErrors.owner_first ? "#ef4444" : "#cbd5e1"}`,
                                  background: "transparent",
                                  fontSize: 13,
                                  fontWeight: 600,
                                  color: "var(--text)",
                                  outline: "none",
                                  padding: "2px 0",
                                  fontFamily: "inherit",
                                  boxSizing: "border-box",
                                }}
                              />
                              {addPatientErrors.owner_first && (
                                <p
                                  style={{
                                    fontSize: 10,
                                    color: "#dc2626",
                                    margin: "4px 0 0",
                                  }}
                                >
                                  {addPatientErrors.owner_first}
                                </p>
                              )}
                            </div>
                            <div style={{ padding: "10px 14px" }}>
                              <div
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  color: "#94a3b8",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.8px",
                                  marginBottom: 6,
                                }}
                              >
                                Owner Last Name{" "}
                                <span style={{ color: "#ef4444" }}>*</span>
                              </div>
                              <input
                                type="text"
                                value={form.owner_last}
                                onChange={(e) => {
                                  setForm({
                                    ...form,
                                    owner_last: sanitizeName(e.target.value),
                                  });
                                  setAddPatientErrors((er) => ({
                                    ...er,
                                    owner_first: "",
                                  }));
                                }}
                                placeholder="e.g. dela Cruz"
                                style={{
                                  width: "100%",
                                  border: "none",
                                  borderBottom: "1.5px solid #cbd5e1",
                                  background: "transparent",
                                  fontSize: 13,
                                  fontWeight: 600,
                                  color: "var(--text)",
                                  outline: "none",
                                  padding: "2px 0",
                                  fontFamily: "inherit",
                                  boxSizing: "border-box",
                                }}
                              />{" "}
                            </div>
                          </div>
                          <div style={{ borderBottom: "1px solid #e2e8f0" }}>
                            <div style={{ padding: "10px 14px" }}>
                              <div
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  color: "#94a3b8",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.8px",
                                  marginBottom: 6,
                                }}
                              >
                                Owner Sex / Gender
                              </div>
                              <CustomSelect
                                value={form.owner_gender}
                                onChange={(val) =>
                                  setForm({ ...form, owner_gender: val })
                                }
                                placeholder="—"
                                options={["Male", "Female"]}
                              />
                            </div>
                          </div>
                        </>
                      ) : (
                        <div
                          style={{
                            padding: "10px 14px",
                            borderBottom: "1px solid #e2e8f0",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: "#94a3b8",
                              textTransform: "uppercase",
                              letterSpacing: "0.8px",
                              marginBottom: 6,
                            }}
                          >
                            Owner Name
                          </div>
                          <input
                            type="text"
                            value={form.owner}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                owner: sanitizeName(e.target.value),
                              })
                            }
                            readOnly={!!selectedOwnerProfile}
                            style={{
                              width: "100%",
                              border: "none",
                              borderBottom: "1.5px solid #cbd5e1",
                              background: "transparent",
                              fontSize: 13,
                              fontWeight: 600,
                              color: selectedOwnerProfile
                                ? "#94a3b8"
                                : "var(--text)",
                              outline: "none",
                              padding: "2px 0",
                              fontFamily: "inherit",
                              boxSizing: "border-box",
                            }}
                          />
                        </div>
                      )}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          borderBottom: "1px solid #e2e8f0",
                        }}
                      >
                        <div
                          style={{
                            padding: "10px 14px",
                            borderRight: "1px solid #e2e8f0",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: "#94a3b8",
                              textTransform: "uppercase",
                              letterSpacing: "0.8px",
                              marginBottom: 6,
                            }}
                          >
                            Contact Number
                          </div>
                          <input
                            type="text"
                            value={form.contact}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                contact: sanitizeContact(e.target.value),
                              })
                            }
                            placeholder="e.g. 09170000000"
                            inputMode="numeric"
                            maxLength={11}
                            style={{
                              width: "100%",
                              border: "none",
                              borderBottom: "1.5px solid #cbd5e1",
                              background: "transparent",
                              fontSize: 13,
                              fontWeight: 600,
                              color: "var(--text)",
                              outline: "none",
                              padding: "2px 0",
                              fontFamily: "inherit",
                              boxSizing: "border-box",
                            }}
                          />
                          {form.contact && form.contact.length !== 11 && (
                            <p
                              style={{
                                fontSize: 10,
                                color: "#dc2626",
                                margin: "4px 0 0",
                              }}
                            >
                              Must be 11 digits.
                            </p>
                          )}
                        </div>{" "}
                        <div style={{ padding: "10px 14px" }}>
                          <div
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: "#94a3b8",
                              textTransform: "uppercase",
                              letterSpacing: "0.8px",
                              marginBottom: 4,
                            }}
                          >
                            Owner Email
                            {selectedOwnerProfile ? (
                              <span
                                style={{
                                  marginLeft: 6,
                                  color: "#16a34a",
                                  fontWeight: 700,
                                  textTransform: "none",
                                  letterSpacing: 0,
                                }}
                              >
                                ✓ linked
                              </span>
                            ) : ownerStep === OWNER_STEPS.FORM ? (
                              <span
                                style={{
                                  marginLeft: 6,
                                  color: "#94a3b8",
                                  fontWeight: 400,
                                  textTransform: "none",
                                  letterSpacing: 0,
                                  fontSize: 10,
                                }}
                              >
                                (auto-generated)
                              </span>
                            ) : (
                              <span
                                style={{
                                  marginLeft: 6,
                                  color: "#94a3b8",
                                  fontWeight: 400,
                                  textTransform: "none",
                                  letterSpacing: 0,
                                  fontSize: 10,
                                }}
                              >
                                (creates login)
                              </span>
                            )}
                          </div>
                          <input
                            type="email"
                            value={form.owner_email}
                            onChange={(e) =>
                              setForm({ ...form, owner_email: e.target.value })
                            }
                            placeholder="Enter owner first/last name above"
                            readOnly={
                              !!selectedOwnerProfile ||
                              ownerStep === OWNER_STEPS.FORM
                            }
                            style={{
                              width: "100%",
                              border: "none",
                              borderBottom: "1.5px solid #cbd5e1",
                              background: "transparent",
                              fontSize: 13,
                              fontWeight: 600,
                              color:
                                selectedOwnerProfile ||
                                ownerStep === OWNER_STEPS.FORM
                                  ? "#94a3b8"
                                  : "var(--text)",
                              outline: "none",
                              padding: "2px 0",
                              fontFamily: "inherit",
                              boxSizing: "border-box",
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* ── Section: Initial Symptoms ── */}
                    <div style={{ borderBottom: "1.5px solid #e2e8f0" }}>
                      <div
                        style={{
                          background: "var(--bg)",
                          borderBottom: "1px solid var(--border)",
                          padding: "6px 16px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 800,
                            textTransform: "uppercase",
                            letterSpacing: "1px",
                            color: "var(--muted)",
                          }}
                        >
                          Initial Condition / Diagnosis
                        </span>
                      </div>
                      <div style={{ padding: "12px 16px", minHeight: 70 }}>
                        <textarea
                          value={form.condition}
                          onChange={(e) =>
                            setForm({ ...form, condition: e.target.value })
                          }
                          placeholder="Describe the patient's condition, presenting symptoms, or initial diagnosis..."
                          style={{
                            width: "100%",
                            border: "none",
                            background: "transparent",
                            fontSize: 13,
                            color: "var(--text)",
                            outline: "none",
                            resize: "vertical",
                            minHeight: 60,
                            fontFamily: "inherit",
                            lineHeight: 1.8,
                            boxSizing: "border-box",
                            backgroundImage:
                              "repeating-linear-gradient(transparent, transparent 27px, rgba(147,197,253,0.25) 27px, rgba(147,197,253,0.25) 28px)",
                          }}
                        />
                      </div>
                    </div>

                    {/* ── Footer note ── */}
                    <div
                      style={{
                        padding: "8px 16px",
                        background: "var(--bg)",
                        borderTop: "1px solid var(--border)",
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          fontSize: 10,
                          color: "var(--muted)",
                          textAlign: "right",
                          fontStyle: "italic",
                        }}
                      >
                        Angeles Animal Care Hospital
                      </p>
                    </div>
                  </div>
                )}
                {activeTab === "vaccination" && ownerIsConfirmed && (
                  <div style={{ paddingTop: 4 }}>
                    <SectionHeader
                      color="#16a34a"
                      label="Vaccinations"
                      showForm={showAddVaxForm}
                      onAdd={() => setShowAddVaxForm(true)}
                      onCancelForm={() => setShowAddVaxForm(false)}
                    />
                    {showAddVaxForm && (
                      <div className="pr-form-box">
                        <VaxFields form={addVaxForm} setForm={setAddVaxForm} />
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "flex-end",
                            gap: 8,
                            marginTop: 8,
                          }}
                        >
                          <button
                            className="btn btn-ghost pr-btn-auto"
                            onClick={() => setShowAddVaxForm(false)}
                          >
                            Cancel
                          </button>
                          <button
                            className="btn btn-primary pr-btn-auto"
                            onClick={addPendingVax}
                          >
                            Add to List
                          </button>
                        </div>
                      </div>
                    )}
                    {pendingVax.length === 0 && !showAddVaxForm && (
                      <p
                        style={{
                          color: "var(--muted)",
                          fontSize: 13,
                          textAlign: "center",
                          padding: "28px 0",
                        }}
                      >
                        No vaccinations added yet.
                      </p>
                    )}
                    {pendingVax.length > 0 && (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: 12,
                        }}
                      >
                        {pendingVax.map((v) => (
                          <div key={v._key} className="vax-card">
                            <h4
                              style={{
                                margin: "0 0 4px",
                                fontSize: 14,
                                fontWeight: 800,
                                color: "#14532d",
                                paddingRight: 60,
                              }}
                            >
                              {v.name}
                            </h4>
                            {v.given_by && (
                              <p
                                style={{
                                  margin: "0 0 8px",
                                  fontSize: 12,
                                  color: "#16a34a",
                                }}
                              >
                                By: {v.given_by}
                              </p>
                            )}
                            <div style={{ fontSize: 12, color: "#166534" }}>
                              Given: {v.date_given}
                              {v.next_due ? ` · Due: ${v.next_due}` : ""}
                            </div>
                            <button
                              onClick={() => removePendingVax(v._key)}
                              style={{
                                marginTop: 8,
                                background: "none",
                                border: "none",
                                color: "#ef4444",
                                cursor: "pointer",
                                fontSize: 12,
                                fontWeight: 600,
                                fontFamily: "inherit",
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {activeTab === "treatment" && ownerIsConfirmed && (
                  <div style={{ paddingTop: 4 }}>
                    <SectionHeader
                      color="#d97706"
                      label="Treatments"
                      showForm={showAddTreatForm}
                      onAdd={() => setShowAddTreatForm(true)}
                      onCancelForm={() => setShowAddTreatForm(false)}
                    />
                    {showAddTreatForm && (
                      <div className="pr-form-box">
                        <TreatFields
                          form={addTreatForm}
                          setForm={setAddTreatForm}
                        />
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "flex-end",
                            gap: 8,
                            marginTop: 8,
                          }}
                        >
                          <button
                            className="btn btn-ghost pr-btn-auto"
                            onClick={() => setShowAddTreatForm(false)}
                          >
                            Cancel
                          </button>
                          <button
                            className="btn btn-primary pr-btn-auto"
                            onClick={addPendingTreat}
                          >
                            Add to List
                          </button>
                        </div>
                      </div>
                    )}
                    {pendingTreat.length === 0 && !showAddTreatForm && (
                      <p
                        style={{
                          color: "var(--muted)",
                          fontSize: 13,
                          textAlign: "center",
                          padding: "28px 0",
                        }}
                      >
                        No treatments added yet.
                      </p>
                    )}
                    {pendingTreat.length > 0 && (
                      <div>
                        {pendingTreat.map((t) => (
                          <div key={t._key} className="treat-paper">
                            <div style={{ paddingLeft: 50 }}>
                              <h4
                                style={{
                                  margin: "0 0 4px",
                                  fontSize: 14,
                                  fontWeight: 800,
                                  color: "#1e293b",
                                }}
                              >
                                {t.diagnosis}
                              </h4>
                              {t.vet && (
                                <p
                                  style={{
                                    margin: "0 0 4px",
                                    fontSize: 12,
                                    color: "#64748b",
                                    fontStyle: "italic",
                                  }}
                                >
                                  Dr. {t.vet}
                                </p>
                              )}
                              <p
                                style={{
                                  margin: "0 0 8px",
                                  fontSize: 12,
                                  color: "#94a3b8",
                                }}
                              >
                                {t.date}
                              </p>
                              {t.notes && (
                                <p
                                  style={{
                                    margin: "0 0 8px",
                                    fontSize: 13,
                                    color: "#334155",
                                    lineHeight: 1.6,
                                  }}
                                >
                                  {t.notes}
                                </p>
                              )}
                              <button
                                onClick={() => removePendingTreat(t._key)}
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "#ef4444",
                                  cursor: "pointer",
                                  fontSize: 12,
                                  fontWeight: 600,
                                  fontFamily: "inherit",
                                }}
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div
                className="pr-modal-footer"
                style={{
                  background: "var(--bg)",
                  borderTop: "2px solid var(--border)",
                  gap: 8,
                }}
              >
                {ownerIsConfirmed && activeTab !== "info" && (
                  <button
                    className="btn btn-ghost pr-btn-auto"
                    onClick={() => setActiveTab("info")}
                  >
                    ← Back to Info
                  </button>
                )}
                <div style={{ flex: 1 }} />
                <button
                  className="btn btn-ghost pr-btn-auto"
                  onClick={closeModal}
                >
                  Cancel
                </button>
                {ownerIsConfirmed && (
                  <button
                    className="btn btn-primary pr-btn-auto"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      background: "#0f172a",
                      borderColor: "#0f172a",
                      opacity:
                        !isAddPatientFormValid() || savingPatient ? 0.5 : 1,
                      cursor:
                        !isAddPatientFormValid() || savingPatient
                          ? "not-allowed"
                          : "pointer",
                    }}
                    onClick={savePatient}
                    disabled={savingPatient || !isAddPatientFormValid()}
                  >
                    <Ic
                      src={checkIcon}
                      size={13}
                      style={{
                        mixBlendMode: "normal",
                        filter: "brightness(0) invert(1)",
                      }}
                    />
                    {savingPatient
                      ? "Filing Record..."
                      : `File Record${pendingVax.length + pendingTreat.length > 0 ? ` + ${pendingVax.length + pendingTreat.length} Record(s)` : ""}`}
                  </button>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
      {/* ── VIEW PATIENT MODAL ── */}
      {activeModal === "view" && selectedPatient && (
        <div className="pr-overlay">
          <div className="pr-modal-wrap">
            <div
              className="pr-modal-header"
              style={{
                background: "var(--bg)",
                borderBottom: "1px solid var(--border)",
              }}
            >
              {" "}
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background:
                      selectedPatient.species === "Cat" ? "#f0fdf4" : "#eff6ff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {selectedPatient.species === "Cat" ? (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 16 16"
                      fill="#16a34a"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M1 7L4.80061 1.43926C5.56059 0.527292 6.68638 0 7.8735 0H8V4L12 5L15 10L14.1875 11.2188C13.4456 12.3316 12.1967 13 10.8593 13H9L7 16H5L1 7ZM10 9C10.5523 9 11 8.55229 11 8C11 7.44772 10.5523 7 10 7C9.44771 7 9 7.44772 9 8C9 8.55229 9.44771 9 10 9Z"
                      />
                      <path d="M10 0.465878V2.43845L12 2.93845V0H11.8735C11.2125 0 10.5704 0.163501 10 0.465878Z" />
                    </svg>
                  ) : (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 16 16"
                      fill="#1d4ed8"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M16 4V7C16 9.20914 14.2091 11 12 11H10V15H0V13L0.931622 10.8706C1.25226 10.9549 1.59036 11 1.94124 11C3.74931 11 5.32536 9.76947 5.76388 8.01538L3.82359 7.53031C3.60766 8.39406 2.83158 9.00001 1.94124 9.00001C1.87789 9.00001 1.81539 8.99702 1.75385 8.99119C1.02587 8.92223 0.432187 8.45551 0.160283 7.83121C0.0791432 7.64491 0.0266588 7.44457 0.00781272 7.23658C-0.0112323 7.02639 0.00407892 6.80838 0.0588889 6.58914C0.0588882 6.58914 0.0588896 6.58913 0.0588889 6.58914L0.698705 4.02986C1.14387 2.24919 2.7438 1 4.57928 1H10L12 4H16ZM9 6C9.55229 6 10 5.55228 10 5C10 4.44772 9.55229 4 9 4C8.44771 4 8 4.44772 8 5C8 5.55228 8.44771 6 9 6Z"
                      />
                    </svg>
                  )}
                </div>
                <div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: 17,
                      fontWeight: 700,
                      color: "var(--text)",
                    }}
                  >
                    {selectedPatient.name}
                    <span
                      className={`badge ${STATUS_BADGE[selectedPatient.status] || "badge-gray"}`}
                      style={{
                        marginLeft: 8,
                        fontSize: 11,
                        verticalAlign: "middle",
                      }}
                    >
                      {selectedPatient.status}
                    </span>
                    <span
                      className={`badge ${HEALTH_BADGE[selectedPatient.health] || "badge-gray"}`}
                      style={{
                        marginLeft: 5,
                        fontSize: 11,
                        verticalAlign: "middle",
                      }}
                    >
                      {selectedPatient.health}
                    </span>
                  </h3>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 12,
                      color: "var(--muted)",
                      marginTop: 2,
                    }}
                  >
                    {selectedPatient.species} · {selectedPatient.breed} · Owner:{" "}
                    {selectedPatient.owner}
                  </p>
                </div>
              </div>
              <button
                onClick={closeModal}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 20,
                  cursor: "pointer",
                  color: "var(--muted)",
                  lineHeight: 1,
                  padding: "2px 6px",
                }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                padding: "0 24px",
                borderBottom: "1px solid var(--border)",
                flexShrink: 0,
              }}
            >
              <TabBar
                tabs={VIEW_TABS}
                active={activeTab}
                onSelect={(t) => {
                  setActiveTab(t);
                  setShowRxForm(false);
                  setShowVaxForm(false);
                  setShowTreatForm(false);
                  setEditingVaxId(null);
                  setEditingTreatId(null);
                  setEditingRxId(null);
                }}
                counts={{
                  prescription: prescriptions.length,
                  vaccination: vaccinations.length,
                  treatment: treatments.length,
                  services: serviceHistory.length,
                }}
              />
            </div>

            <div className="pr-modal-body">
              {/* ── INFO TAB ── */}
              {activeTab === "info" && (
                <PatientInfoTab
                  patient={selectedPatient}
                  treatments={treatments}
                />
              )}

              {/* ── VACCINATION TAB ── */}
              {activeTab === "vaccination" && (
                <div style={{ paddingTop: 4 }}>
                  {/* Header bar */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 18,
                    }}
                  >
                    <div>
                      <h4
                        style={{
                          margin: 0,
                          fontSize: 14,
                          fontWeight: 800,
                          color: "#166534",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        >
                          <line x1="12" y1="2" x2="12" y2="6" />
                          <path d="M12 14v8" />
                          <path d="M8 10c0-2.2 1.8-4 4-4s4 1.8 4 4" />
                          <line x1="8" y1="18" x2="16" y2="18" />
                        </svg>
                        Vaccination Record
                      </h4>
                      <p
                        style={{
                          margin: "2px 0 0",
                          fontSize: 12,
                          color: "var(--muted)",
                        }}
                      >
                        {vaccinations.length} vaccination
                        {vaccinations.length !== 1 ? "s" : ""} on record
                      </p>
                    </div>
                    {!showVaxForm ? (
                      <button
                        className="btn btn-primary pr-btn-auto"
                        style={{
                          background: "#16a34a",
                          borderColor: "#16a34a",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                        onClick={() => {
                          setShowVaxForm(true);
                          setEditingVaxId(null);
                        }}
                      >
                        <Ic
                          src={plusIcon}
                          size={12}
                          style={{
                            mixBlendMode: "normal",
                            filter: "brightness(0) invert(1)",
                          }}
                        />{" "}
                        Add Vaccine
                      </button>
                    ) : (
                      <button
                        className="btn btn-ghost btn-sm pr-btn-auto"
                        onClick={() => setShowVaxForm(false)}
                      >
                        ✕ Cancel
                      </button>
                    )}
                  </div>

                  {showVaxForm && (
                    <div
                      style={{
                        ...S.formBox,
                        background: "#f0fdf4",
                        border: "1.5px solid #86efac",
                        marginBottom: 20,
                      }}
                    >
                      <VaxFields form={vaxForm} setForm={setVaxForm} />
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "flex-end",
                          gap: 8,
                          marginTop: 8,
                        }}
                      >
                        <button
                          className="btn btn-ghost pr-btn-auto"
                          onClick={() => setShowVaxForm(false)}
                        >
                          Cancel
                        </button>
                        <button
                          className="btn btn-primary"
                          style={{
                            ...S.btn,
                            background: "#16a34a",
                            borderColor: "#16a34a",
                          }}
                          onClick={saveVax}
                          disabled={vaxSaving}
                        >
                          {vaxSaving ? "Saving..." : "Save Vaccination"}
                        </button>
                      </div>
                    </div>
                  )}

                  {vaccinations.length === 0 && !showVaxForm ? (
                    <div style={{ textAlign: "center", padding: "40px 0" }}>
                      <div style={{ marginBottom: 8 }}>
                        <svg
                          width="40"
                          height="40"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#cbd5e1"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        >
                          <line x1="12" y1="2" x2="12" y2="6" />
                          <path d="M12 14v8" />
                          <path d="M8 10c0-2.2 1.8-4 4-4s4 1.8 4 4" />
                          <line x1="8" y1="18" x2="16" y2="18" />
                        </svg>
                      </div>
                      <p
                        style={{
                          color: "var(--muted)",
                          fontSize: 13,
                          margin: 0,
                        }}
                      >
                        No vaccination records yet.
                      </p>
                      <p
                        style={{
                          color: "var(--muted)",
                          fontSize: 12,
                          margin: "4px 0 0",
                        }}
                      >
                        Click <strong>Add Vaccine</strong> to get started.
                      </p>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 14,
                      }}
                    >
                      {vaccinations.map((v) => (
                        <React.Fragment key={v.id}>
                          {editingVaxId === v.id ? (
                            <div style={{ gridColumn: "1 / -1" }}>
                              <VaxEditRow v={v} />
                            </div>
                          ) : (
                            <VaxCard
                              v={v}
                              onEdit={startEditVax}
                              onDelete={deleteVax}
                              onPrint={printVaccination}
                              isEditing={editingVaxId === v.id}
                            />
                          )}{" "}
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── TREATMENT TAB ── */}
              {activeTab === "treatment" && (
                <div style={{ paddingTop: 4 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 18,
                    }}
                  >
                    <div>
                      <h4
                        style={{
                          margin: 0,
                          fontSize: 14,
                          fontWeight: 800,
                          color: "#92400e",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        >
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="16" y1="13" x2="8" y2="13" />
                          <line x1="16" y1="17" x2="8" y2="17" />
                        </svg>
                        Treatment Records
                      </h4>
                      <p
                        style={{
                          margin: "2px 0 0",
                          fontSize: 12,
                          color: "var(--muted)",
                        }}
                      >
                        {treatments.length} treatment
                        {treatments.length !== 1 ? "s" : ""} on file
                      </p>
                    </div>
                    {!showTreatForm ? (
                      <button
                        className="btn btn-primary pr-btn-auto"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                        onClick={() => {
                          setShowTreatForm(true);
                          setEditingTreatId(null);
                        }}
                      >
                        <Ic
                          src={plusIcon}
                          size={12}
                          style={{
                            mixBlendMode: "normal",
                            filter: "brightness(0) invert(1)",
                          }}
                        />{" "}
                        Add Treatment
                      </button>
                    ) : (
                      <button
                        className="btn btn-ghost btn-sm pr-btn-auto"
                        onClick={() => setShowTreatForm(false)}
                      >
                        ✕ Cancel
                      </button>
                    )}
                  </div>

                  {showTreatForm && (
                    <div style={{ ...S.formBox, marginBottom: 20 }}>
                      <TreatFields form={treatForm} setForm={setTreatForm} />
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "flex-end",
                          gap: 8,
                          marginTop: 8,
                        }}
                      >
                        <button
                          className="btn btn-ghost pr-btn-auto"
                          onClick={() => setShowTreatForm(false)}
                        >
                          Cancel
                        </button>
                        <button
                          className="btn btn-primary pr-btn-auto"
                          onClick={saveTreat}
                          disabled={treatSaving}
                        >
                          {treatSaving ? "Saving..." : "Save Treatment"}
                        </button>
                      </div>
                    </div>
                  )}

                  {treatments.length === 0 && !showTreatForm ? (
                    <div style={{ textAlign: "center", padding: "40px 0" }}>
                      <div style={{ marginBottom: 8 }}>
                        <svg
                          width="40"
                          height="40"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#cbd5e1"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        >
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="16" y1="13" x2="8" y2="13" />
                          <line x1="16" y1="17" x2="8" y2="17" />
                        </svg>
                      </div>
                      <p
                        style={{
                          color: "var(--muted)",
                          fontSize: 13,
                          margin: 0,
                        }}
                      >
                        No treatment records yet.
                      </p>
                    </div>
                  ) : (
                    <div>
                      {treatments.map((t) => (
                        <React.Fragment key={t.id}>
                          {editingTreatId === t.id ? (
                            <TreatEditRow t={t} />
                          ) : (
                            <TreatmentPaper
                              t={t}
                              onEdit={startEditTreat}
                              onDelete={deleteTreat}
                            />
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── SERVICES TAB ── */}
              {activeTab === "services" && (
                <div style={{ paddingTop: 4 }}>
                  <div style={{ marginBottom: 18 }}>
                    <h4
                      style={{
                        margin: 0,
                        fontSize: 14,
                        fontWeight: 800,
                        color: "#1e3a8a",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      >
                        <rect
                          x="3"
                          y="4"
                          width="18"
                          height="18"
                          rx="2"
                          ry="2"
                        />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      Service History
                    </h4>
                    <p
                      style={{
                        margin: "2px 0 0",
                        fontSize: 12,
                        color: "var(--muted)",
                      }}
                    >
                      {serviceHistory.length} visit
                      {serviceHistory.length !== 1 ? "s" : ""} on record
                    </p>
                  </div>

                  {loadingHistory ? (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 12,
                      }}
                    >
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          style={{
                            background: "var(--card)",
                            border: "1.5px solid var(--border)",
                            borderRadius: 12,
                            padding: 16,
                          }}
                        >
                          <Sk w="60%" h={14} style={{ marginBottom: 8 }} />
                          <Sk w="40%" h={11} />
                        </div>
                      ))}
                    </div>
                  ) : serviceHistory.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px 0" }}>
                      <div style={{ marginBottom: 8 }}>
                        <svg
                          width="40"
                          height="40"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#cbd5e1"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        >
                          <rect x="3" y="4" width="18" height="18" rx="2" />
                          <line x1="16" y1="2" x2="16" y2="6" />
                          <line x1="8" y1="2" x2="8" y2="6" />
                          <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                      </div>
                      <p
                        style={{
                          color: "var(--muted)",
                          fontSize: 13,
                          margin: 0,
                        }}
                      >
                        No service history yet.
                      </p>
                      <p
                        style={{
                          color: "var(--muted)",
                          fontSize: 12,
                          margin: "4px 0 0",
                        }}
                      >
                        Appointments booked for this pet will appear here.
                      </p>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 12,
                      }}
                    >
                      {(() => {
                        const purposeStyle = {
                          Consultation: {
                            bg: "#f8fafc",
                            color: "#475569",
                            icon: (
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                              >
                                <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.3.3 0 1 0 .3.3" />
                                <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4" />
                                <circle cx="20" cy="10" r="2" />
                              </svg>
                            ),
                          },
                          Vaccination: {
                            bg: "#f0fdf4",
                            color: "#15803d",
                            icon: (
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                              >
                                <line x1="12" y1="2" x2="12" y2="6" />
                                <path d="M12 14v8" />
                                <path d="M8 10c0-2.2 1.8-4 4-4s4 1.8 4 4" />
                              </svg>
                            ),
                          },
                          Deworming: {
                            bg: "#f3e8ff",
                            color: "#6d28d9",
                            icon: (
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                              >
                                <circle cx="6" cy="6" r="3" />
                                <circle cx="6" cy="18" r="3" />
                                <line x1="20" y1="4" x2="8.12" y2="15.88" />
                                <line x1="14.47" y1="14.48" x2="20" y2="20" />
                                <line x1="8.12" y1="8.12" x2="12" y2="12" />
                              </svg>
                            ),
                          },
                          Imaging: {
                            bg: "#eff6ff",
                            color: "#1d4ed8",
                            icon: (
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                              >
                                <rect
                                  x="3"
                                  y="3"
                                  width="18"
                                  height="18"
                                  rx="2"
                                />
                                <circle cx="9" cy="9" r="2" />
                                <path d="m21 15-5-5L5 21" />
                              </svg>
                            ),
                          },
                          Diagnostics: {
                            bg: "#fee2e2",
                            color: "#dc2626",
                            icon: (
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                              >
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                <line x1="12" y1="9" x2="12" y2="13" />
                                <line x1="12" y1="17" x2="12.01" y2="17" />
                              </svg>
                            ),
                          },
                        };
                        const STATUS_DOT = {
                          Confirmed: "#16a34a",
                          Pending: "#d97706",
                          Cancelled: "#dc2626",
                          Completed: "#2563eb",
                          Missed: "#6b7280",
                        };
                        return serviceHistory.map((a) => {
                          const style = purposeStyle[a.purpose] || {
                            bg: "#f8fafc",
                            color: "#475569",
                            icon: null,
                          };
                          return (
                            <div
                              key={a.id}
                              style={{
                                background: "var(--card)",
                                border: `1.5px solid ${style.color}33`,
                                borderRadius: 12,
                                padding: "14px 16px",
                                position: "relative",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 10,
                                  marginBottom: 8,
                                }}
                              >
                                <div
                                  style={{
                                    width: 34,
                                    height: 34,
                                    borderRadius: 9,
                                    background: style.bg,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: style.color,
                                    flexShrink: 0,
                                  }}
                                >
                                  {style.icon}
                                </div>
                                <div style={{ minWidth: 0 }}>
                                  <p
                                    style={{
                                      margin: 0,
                                      fontSize: 14,
                                      fontWeight: 800,
                                      color: style.color,
                                    }}
                                  >
                                    {a.purpose || "Service"}
                                  </p>
                                  <p
                                    style={{
                                      margin: "2px 0 0",
                                      fontSize: 11,
                                      color: "var(--muted)",
                                    }}
                                  >
                                    {selectedPatient.name}
                                  </p>
                                </div>
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  gap: 8,
                                  borderTop: "1px dashed var(--border)",
                                  paddingTop: 8,
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: 12,
                                    color: "var(--text)",
                                    fontWeight: 600,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 5,
                                  }}
                                >
                                  <svg
                                    width="12"
                                    height="12"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                  >
                                    <rect
                                      x="3"
                                      y="4"
                                      width="18"
                                      height="18"
                                      rx="2"
                                    />
                                    <line x1="16" y1="2" x2="16" y2="6" />
                                    <line x1="8" y1="2" x2="8" y2="6" />
                                    <line x1="3" y1="10" x2="21" y2="10" />
                                  </svg>
                                  {a.date}
                                  {a.time ? ` · ${a.time}` : ""}
                                </span>
                                <span
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    padding: "2px 8px",
                                    borderRadius: 20,
                                    background: `${STATUS_DOT[a.status] || "#9ca3af"}18`,
                                    color: STATUS_DOT[a.status] || "#64748b",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 4,
                                  }}
                                >
                                  <span
                                    style={{
                                      width: 6,
                                      height: 6,
                                      borderRadius: "50%",
                                      background:
                                        STATUS_DOT[a.status] || "#9ca3af",
                                      display: "inline-block",
                                    }}
                                  />
                                  {a.status}
                                </span>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  )}
                </div>
              )}

              {/* ── PRESCRIPTION TAB ── */}
              {activeTab === "prescription" && (
                <div style={{ paddingTop: 4 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 18,
                    }}
                  >
                    <div>
                      <h4
                        style={{
                          margin: 0,
                          fontSize: 14,
                          fontWeight: 800,
                          color: "#1e3a8a",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        >
                          <path d="M10.5 20H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H20a2 2 0 0 1 2 2v3" />
                          <circle cx="18" cy="18" r="3" />
                          <path d="m22 22-1.5-1.5" />
                        </svg>
                        Prescriptions
                      </h4>
                      <p
                        style={{
                          margin: "2px 0 0",
                          fontSize: 12,
                          color: "var(--muted)",
                        }}
                      >
                        {prescriptions.length} prescription
                        {prescriptions.length !== 1 ? "s" : ""} on file
                      </p>
                    </div>
                    {!showRxForm ? (
                      <button
                        className="btn btn-primary pr-btn-auto"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                        onClick={() => {
                          setShowRxForm(true);
                          setEditingRxId(null);
                        }}
                      >
                        <Ic
                          src={plusIcon}
                          size={12}
                          style={{
                            mixBlendMode: "normal",
                            filter: "brightness(0) invert(1)",
                          }}
                        />{" "}
                        Add Prescription
                      </button>
                    ) : (
                      <button
                        className="btn btn-ghost btn-sm pr-btn-auto"
                        onClick={() => setShowRxForm(false)}
                      >
                        ✕ Cancel
                      </button>
                    )}
                  </div>

                  {showRxForm && (
                    <div style={{ ...S.formBox, marginBottom: 20 }}>
                      <div className="form-grid">
                        <div className="form-group">
                          <label>Drug Name *</label>
                          <input
                            type="text"
                            value={rxForm.medicine}
                            onChange={(e) =>
                              setRxForm({ ...rxForm, medicine: e.target.value })
                            }
                            placeholder="e.g. Amoxicillin"
                          />
                        </div>
                        <div className="form-group">
                          <label>Concentration</label>
                          <input
                            type="text"
                            value={rxForm.concentration}
                            onChange={(e) =>
                              setRxForm({
                                ...rxForm,
                                concentration: e.target.value,
                              })
                            }
                            placeholder="e.g. 50mg/ml"
                          />
                        </div>
                        <div className="form-group">
                          <label>Form</label>
                          <select
                            value={rxForm.drug_form}
                            onChange={(e) =>
                              setRxForm({
                                ...rxForm,
                                drug_form: e.target.value,
                              })
                            }
                          >
                            <option value="">— Select —</option>
                            {DRUG_FORM_OPTIONS.map((f) => (
                              <option key={f}>{f}</option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Dosage *</label>
                          <input
                            type="text"
                            value={rxForm.dosage}
                            onChange={(e) =>
                              setRxForm({ ...rxForm, dosage: e.target.value })
                            }
                            placeholder="e.g. 250mg"
                          />
                        </div>
                        <div className="form-group">
                          <label>Frequency</label>
                          <select
                            value={rxForm.frequency}
                            onChange={(e) =>
                              setRxForm({
                                ...rxForm,
                                frequency: e.target.value,
                              })
                            }
                          >
                            {FREQ_OPTIONS.map((f) => (
                              <option key={f}>{f}</option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Route</label>
                          <select
                            value={rxForm.route}
                            onChange={(e) =>
                              setRxForm({ ...rxForm, route: e.target.value })
                            }
                          >
                            {ROUTE_OPTIONS.map((r) => (
                              <option key={r}>{r}</option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Duration</label>
                          <input
                            type="text"
                            value={rxForm.duration}
                            onChange={(e) =>
                              setRxForm({ ...rxForm, duration: e.target.value })
                            }
                            placeholder="e.g. 7 days"
                          />
                        </div>
                        <div className="form-group">
                          <label>Date Prescribed</label>
                          <input
                            type="date"
                            value={rxForm.date_prescribed}
                            onChange={(e) =>
                              setRxForm({
                                ...rxForm,
                                date_prescribed: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="form-group">
                          <label>Prescribed By</label>
                          <CustomSelect
                            value={rxForm.prescribed_by}
                            onChange={(val) =>
                              setRxForm({ ...rxForm, prescribed_by: val })
                            }
                            placeholder="— Select Vet —"
                            options={VET_OPTIONS}
                          />
                        </div>
                        <div className="form-group form-full">
                          <label>Notes</label>
                          <textarea
                            value={rxForm.instructions}
                            onChange={(e) =>
                              setRxForm({
                                ...rxForm,
                                instructions: e.target.value,
                              })
                            }
                            placeholder="Directions and special instructions..."
                            style={{ minHeight: 72 }}
                          />
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "flex-end",
                          gap: 8,
                          marginTop: 4,
                        }}
                      >
                        <button
                          className="btn btn-ghost pr-btn-auto"
                          onClick={() => setShowRxForm(false)}
                        >
                          Cancel
                        </button>
                        <button
                          className="btn btn-primary pr-btn-auto"
                          onClick={saveRx}
                          disabled={rxSaving}
                        >
                          {rxSaving ? "Saving..." : "Save Prescription"}
                        </button>
                      </div>
                    </div>
                  )}

                  {prescriptions.length === 0 && !showRxForm && (
                    <div style={{ textAlign: "center", padding: "40px 0" }}>
                      <div style={{ marginBottom: 8 }}>
                        <svg
                          width="40"
                          height="40"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#cbd5e1"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        >
                          <path d="M10.5 20H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H20a2 2 0 0 1 2 2v3" />
                          <circle cx="18" cy="18" r="3" />
                          <path d="m22 22-1.5-1.5" />
                        </svg>
                      </div>
                      <p
                        style={{
                          color: "var(--muted)",
                          fontSize: 13,
                          margin: 0,
                        }}
                      >
                        No prescription records yet.
                      </p>
                    </div>
                  )}

                  {prescriptions.map((rx) => (
                    <div key={rx.id}>
                      {editingRxId === rx.id ? (
                        <div
                          style={{
                            background: "#eff6ff",
                            border: "1.5px solid #bfdbfe",
                            borderRadius: 10,
                            padding: 20,
                            marginBottom: 12,
                          }}
                        >
                          <p
                            style={{
                              margin: "0 0 12px",
                              fontSize: 12,
                              fontWeight: 700,
                              color: "#1e40af",
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <EditIcon /> Editing: {rx.medicine}
                          </p>
                          <div className="form-grid">
                            <div className="form-group">
                              <label>Drug Name *</label>
                              <input
                                type="text"
                                value={editRxForm.medicine}
                                onChange={(e) =>
                                  setEditRxForm({
                                    ...editRxForm,
                                    medicine: e.target.value,
                                  })
                                }
                              />
                            </div>
                            <div className="form-group">
                              <label>Concentration</label>
                              <input
                                type="text"
                                value={editRxForm.concentration}
                                onChange={(e) =>
                                  setEditRxForm({
                                    ...editRxForm,
                                    concentration: e.target.value,
                                  })
                                }
                                placeholder="e.g. 50mg/ml"
                              />
                            </div>
                            <div className="form-group">
                              <label>Form</label>
                              <select
                                value={editRxForm.drug_form}
                                onChange={(e) =>
                                  setEditRxForm({
                                    ...editRxForm,
                                    drug_form: e.target.value,
                                  })
                                }
                              >
                                <option value="">— Select —</option>
                                {DRUG_FORM_OPTIONS.map((f) => (
                                  <option key={f}>{f}</option>
                                ))}
                              </select>
                            </div>
                            <div className="form-group">
                              <label>Dosage *</label>
                              <input
                                type="text"
                                value={editRxForm.dosage}
                                onChange={(e) =>
                                  setEditRxForm({
                                    ...editRxForm,
                                    dosage: e.target.value,
                                  })
                                }
                              />
                            </div>
                            <div className="form-group">
                              <label>Frequency</label>
                              <select
                                value={editRxForm.frequency}
                                onChange={(e) =>
                                  setEditRxForm({
                                    ...editRxForm,
                                    frequency: e.target.value,
                                  })
                                }
                              >
                                {FREQ_OPTIONS.map((f) => (
                                  <option key={f}>{f}</option>
                                ))}
                              </select>
                            </div>
                            <div className="form-group">
                              <label>Route</label>
                              <select
                                value={editRxForm.route}
                                onChange={(e) =>
                                  setEditRxForm({
                                    ...editRxForm,
                                    route: e.target.value,
                                  })
                                }
                              >
                                {ROUTE_OPTIONS.map((r) => (
                                  <option key={r}>{r}</option>
                                ))}
                              </select>
                            </div>
                            <div className="form-group">
                              <label>Duration</label>
                              <input
                                type="text"
                                value={editRxForm.duration}
                                onChange={(e) =>
                                  setEditRxForm({
                                    ...editRxForm,
                                    duration: e.target.value,
                                  })
                                }
                              />
                            </div>
                            <div className="form-group">
                              <label>Date Prescribed</label>
                              <input
                                type="date"
                                value={editRxForm.date_prescribed}
                                onChange={(e) =>
                                  setEditRxForm({
                                    ...editRxForm,
                                    date_prescribed: e.target.value,
                                  })
                                }
                              />
                            </div>
                            <div className="form-group">
                              <label>Prescribed By</label>
                              <CustomSelect
                                value={editRxForm.prescribed_by}
                                onChange={(val) =>
                                  setEditRxForm({
                                    ...editRxForm,
                                    prescribed_by: val,
                                  })
                                }
                                placeholder="— Select Vet —"
                                options={VET_OPTIONS}
                              />
                            </div>
                            <div className="form-group form-full">
                              <label>Notes</label>
                              <textarea
                                value={editRxForm.instructions}
                                onChange={(e) =>
                                  setEditRxForm({
                                    ...editRxForm,
                                    instructions: e.target.value,
                                  })
                                }
                                style={{ minHeight: 72 }}
                              />
                            </div>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "flex-end",
                              gap: 8,
                              marginTop: 8,
                            }}
                          >
                            <button
                              className="btn btn-ghost pr-btn-auto"
                              onClick={() => setEditingRxId(null)}
                            >
                              Cancel
                            </button>
                            <button
                              className="btn btn-primary pr-btn-auto"
                              onClick={saveEditRx}
                              disabled={rxSaving}
                            >
                              {rxSaving ? "Saving..." : "Save Changes"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <PrescriptionSlip
                          rx={rx}
                          onEdit={startEditRx}
                          onDelete={deleteRx}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pr-modal-footer">
              <button
                className="btn btn-ghost pr-btn-auto"
                onClick={closeModal}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {createdCredentials && (
        <CredentialCard
          credentials={createdCredentials}
          onClose={() => setCreatedCredentials(null)}
        />
      )}
      {/* ── RECENTLY DELETED MODAL ── */}
      {showDeletedModal && (
        <div className="pr-overlay">
          <div className="pr-modal-wrap" style={{ maxWidth: 640 }}>
            <div className="pr-modal-header">
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: 17,
                    fontWeight: 700,
                    color: "var(--text)",
                  }}
                >
                  Recently Deleted
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: 12,
                    color: "var(--muted)",
                    marginTop: 2,
                  }}
                >
                  Patients are permanently removed 30 days after deletion.
                </p>
              </div>
              <button
                onClick={() => setShowDeletedModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 20,
                  cursor: "pointer",
                  color: "var(--muted)",
                  lineHeight: 1,
                  padding: "2px 6px",
                }}
              >
                ✕
              </button>
            </div>
            <div className="pr-modal-body">
              {deletedPatients.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px 0",
                    color: "var(--muted)",
                  }}
                >
                  <p style={{ fontSize: 13, margin: 0 }}>
                    No recently deleted patients.
                  </p>
                </div>
              ) : (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 10 }}
                >
                  {deletedPatients.map((p) => {
                    const daysLeft = Math.max(
                      0,
                      30 -
                        Math.floor(
                          (Date.now() - new Date(p.deleted_at).getTime()) /
                            (24 * 60 * 60 * 1000),
                        ),
                    );
                    return (
                      <div
                        key={p.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 12,
                          border: "1px solid var(--border)",
                          borderRadius: 10,
                          padding: "12px 14px",
                          flexWrap: "wrap",
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: 13,
                              color: "var(--text)",
                            }}
                          >
                            {p.name}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--muted)" }}>
                            {p.species}
                            {p.breed ? ` · ${p.breed}` : ""}
                            {p.owner ? ` · Owner: ${p.owner}` : ""}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: daysLeft <= 5 ? "#dc2626" : "#92400e",
                              fontWeight: 600,
                              marginTop: 3,
                            }}
                          >
                            {daysLeft > 0
                              ? `${daysLeft} day${daysLeft !== 1 ? "s" : ""} left before permanent deletion`
                              : "Deleting soon"}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            onClick={() => restorePatient(p.id, p.name)}
                            style={{
                              background: "#f0fdf4",
                              border: "1.5px solid #86efac",
                              color: "#166534",
                              borderRadius: 8,
                              padding: "7px 14px",
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: "pointer",
                              fontFamily: "inherit",
                            }}
                          >
                            Restore
                          </button>
                          <button
                            onClick={() =>
                              permanentlyDeletePatient(p.id, p.name)
                            }
                            style={{
                              background: "#fef2f2",
                              border: "1.5px solid #fca5a5",
                              color: "#dc2626",
                              borderRadius: 8,
                              padding: "7px 14px",
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: "pointer",
                              fontFamily: "inherit",
                            }}
                          >
                            Delete Now
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="pr-modal-footer">
              <button
                className="btn btn-ghost pr-btn-auto"
                onClick={() => setShowDeletedModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── EDIT PATIENT MODAL ── */}{" "}
      {editingPatient && (
        <div className="pr-overlay" style={{ zIndex: 1050 }}>
          <div className="pr-modal-wrap" style={{ maxWidth: 680 }}>
            <div className="pr-modal-header">
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: 17,
                    fontWeight: 700,
                    color: "var(--text)",
                  }}
                >
                  Edit Patient — {editingPatient.name}
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: 12,
                    color: "var(--muted)",
                    marginTop: 2,
                  }}
                >
                  Update patient information below.
                </p>
              </div>
              <button
                onClick={attemptCloseEditPatient}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 20,
                  cursor: "pointer",
                  color: "var(--muted)",
                  lineHeight: 1,
                  padding: "2px 6px",
                }}
              >
                ✕
              </button>
            </div>
            <div className="pr-modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Patient Name *</label>
                  <input
                    type="text"
                    value={editPatientForm.name}
                    maxLength={50}
                    onChange={(e) =>
                      setEditPatientForm({
                        ...editPatientForm,
                        name: sanitizeName(e.target.value).slice(0, 50),
                      })
                    }
                    placeholder="e.g. Buddy"
                  />
                </div>
                <div className="form-group">
                  <label>Species *</label>
                  <CustomSelect
                    value={editPatientForm.species}
                    onChange={(val) =>
                      setEditPatientForm({ ...editPatientForm, species: val })
                    }
                    placeholder="Select"
                    options={["Dog", "Cat"]}
                  />
                </div>
                <div className="form-group">
                  <label>Breed</label>
                  <CustomSelect
                    value={editPatientForm.breed}
                    onChange={(val) =>
                      setEditPatientForm({ ...editPatientForm, breed: val })
                    }
                    placeholder={
                      editPatientForm.species
                        ? "Select breed"
                        : "Select species first"
                    }
                    options={
                      editPatientForm.species === "Cat"
                        ? CAT_BREEDS
                        : editPatientForm.species === "Dog"
                          ? DOG_BREEDS
                          : []
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Sex / Gender</label>
                  <CustomSelect
                    value={editPatientForm.gender}
                    onChange={(val) =>
                      setEditPatientForm({ ...editPatientForm, gender: val })
                    }
                    placeholder="Select"
                    options={["Male", "Female", "Unknown"]}
                  />
                </div>
                <div className="form-group">
                  <label>
                    Age <span style={{ fontWeight: 400 }}>(optional)</span>
                  </label>
                  <CustomSelect
                    value={editPatientForm.age}
                    onChange={(val) =>
                      setEditPatientForm({ ...editPatientForm, age: val })
                    }
                    placeholder="Select age"
                    options={AGE_OPTIONS}
                  />
                </div>
                <div className="form-group">
                  <label>
                    Temp (°C){" "}
                    <span style={{ fontWeight: 400 }}>(optional)</span>
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={editPatientForm.temp}
                    onChange={(e) =>
                      setEditPatientForm({
                        ...editPatientForm,
                        temp: e.target.value.replace(/[^0-9.]/g, ""),
                      })
                    }
                    placeholder="e.g. 38.5"
                  />
                </div>
                <div className="form-group">
                  <label>
                    Heart Rate (bpm){" "}
                    <span style={{ fontWeight: 400 }}>(optional)</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={editPatientForm.heart_rate}
                    onChange={(e) =>
                      setEditPatientForm({
                        ...editPatientForm,
                        heart_rate: e.target.value.replace(/\D/g, ""),
                      })
                    }
                    placeholder="e.g. 120"
                  />
                </div>
                <div className="form-group">
                  <label>
                    Weight (kg){" "}
                    <span style={{ fontWeight: 400 }}>(optional)</span>
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={editPatientForm.weight}
                    onChange={(e) =>
                      setEditPatientForm({
                        ...editPatientForm,
                        weight: e.target.value.replace(/[^0-9.]/g, ""),
                      })
                    }
                    placeholder="e.g. 8.2"
                  />
                </div>
                <div
                  className="form-full"
                  style={{
                    borderTop: "1px solid var(--border)",
                    margin: "4px 0",
                  }}
                />
                <div className="form-group">
                  <label>Owner Name</label>
                  <input
                    type="text"
                    value={editPatientForm.owner}
                    onChange={(e) =>
                      setEditPatientForm({
                        ...editPatientForm,
                        owner: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Owner Contact</label>
                  <input
                    type="text"
                    value={editPatientForm.contact}
                    onChange={(e) =>
                      setEditPatientForm({
                        ...editPatientForm,
                        contact: sanitizeContact(e.target.value),
                      })
                    }
                    inputMode="numeric"
                    maxLength={11}
                    placeholder="e.g. 09170000000"
                  />
                  {editPatientForm.contact &&
                    editPatientForm.contact.length !== 11 && (
                      <p
                        style={{
                          fontSize: 11,
                          color: "#dc2626",
                          margin: "4px 0 0",
                        }}
                      >
                        Must be 11 digits.
                      </p>
                    )}
                </div>
                <div className="form-group form-full">
                  <label>Owner Email</label>
                  <input
                    type="email"
                    value={editPatientForm.owner_email}
                    onChange={(e) =>
                      setEditPatientForm({
                        ...editPatientForm,
                        owner_email: e.target.value,
                      })
                    }
                    placeholder="owner@email.com"
                  />
                </div>
                <div
                  className="form-full"
                  style={{
                    borderTop: "1px solid var(--border)",
                    margin: "4px 0",
                  }}
                />
                <div className="form-group">
                  <label>Status</label>
                  <CustomSelect
                    value={editPatientForm.status}
                    onChange={(val) =>
                      setEditPatientForm({ ...editPatientForm, status: val })
                    }
                    placeholder="Select"
                    options={["Outpatient", "Admitted"]}
                  />
                </div>
                <div className="form-group">
                  <label>Health</label>
                  <CustomSelect
                    value={editPatientForm.health}
                    onChange={(val) =>
                      setEditPatientForm({ ...editPatientForm, health: val })
                    }
                    placeholder="Select"
                    options={["Good", "Fair", "Critical"]}
                  />
                </div>
                <div className="form-group">
                  <label>Room</label>
                  <RoomSelect
                    value={editPatientForm.room}
                    onChange={(e) =>
                      setEditPatientForm({
                        ...editPatientForm,
                        room: e.target.value,
                      })
                    }
                    rooms={rooms.map((r) =>
                      r.number === editingPatient.room &&
                      r.status !== "Available"
                        ? { ...r, status: "Available" }
                        : r,
                    )}
                  />
                </div>
                <div className="form-group form-full">
                  <label>Condition / Diagnosis</label>
                  <textarea
                    value={editPatientForm.condition}
                    onChange={(e) =>
                      setEditPatientForm({
                        ...editPatientForm,
                        condition: e.target.value,
                      })
                    }
                    placeholder="Describe condition..."
                  />
                </div>
              </div>
            </div>
            <div className="pr-modal-footer">
              <button
                className="btn btn-ghost pr-btn-auto"
                onClick={attemptCloseEditPatient}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary pr-btn-auto"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  opacity:
                    !isEditPatientFormValid() || editPatientSaving ? 0.5 : 1,
                  cursor:
                    !isEditPatientFormValid() || editPatientSaving
                      ? "not-allowed"
                      : "pointer",
                }}
                onClick={saveEditPatient}
                disabled={editPatientSaving || !isEditPatientFormValid()}
              >
                <Ic
                  src={checkIcon}
                  size={13}
                  style={{
                    mixBlendMode: "normal",
                    filter: "brightness(0) invert(1)",
                  }}
                />
                {editPatientSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default PatientRecord;
