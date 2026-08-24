// ============================================================
// Walkins.jsx  — walk-in guest vs registered client toggle
// ============================================================
import React, { useState, useEffect, useRef, useCallback } from "react";
import ReactDOM from "react-dom";
import Layout from "../../components/layout";
import { supabase } from "../../js/Utils/supabase";
import { useCurrentUser } from "../../js/hooks/Usecurrentuser";
import { logActivity } from "../../js/Utils/logActivity";
import "../../styles/Walkins.css";

const Skel = ({ w = "100%", h = 16 }) => (
  <span
    className="skel"
    style={{ width: w, height: h, borderRadius: 8, display: "block" }}
  />
);

const STATUS_BADGE = {
  Waiting: "badge-yellow",
  Attended: "badge-green",
  Cancelled: "badge-red",
};
const VETS = ["Dr. Santos", "Dr. Reyes", "Dr. Cruz", "Dr. Garcia"];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const today = new Date().toISOString().split("T")[0];
const MAX_GROOMERS = 2;
const EMPTY_FORM = {
  patient: "",
  species: "Dog",
  breed: "",
  sex: "Unknown",
  room: "",
  owner: "",
  ownerFirstName: "",
  ownerLastName: "",
  ownerSex: "",
  owner_id: null,
  contact: "",
  purpose: "Checkup",
  vet: "",
  notes: "",
  status: "Attended",
  mode: "new",
  existingId: null,
  price: "",
};
const PURPOSES = ["Checkup", "Grooming", "Vaccination", "Consultation"];

const SERVICE_META = {
  Checkup: {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="#475569"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ width: 16, height: 16 }}
      >
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
    color: "#475569",
    bg: "#f8fafc",
  },
  Grooming: {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="#7c3aed"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ width: 16, height: 16 }}
      >
        <circle cx="6" cy="6" r="3" />
        <circle cx="6" cy="18" r="3" />
        <line x1="20" y1="4" x2="8.12" y2="15.88" />
        <line x1="14.47" y1="14.48" x2="20" y2="20" />
        <line x1="8.12" y1="8.12" x2="12" y2="12" />
      </svg>
    ),
    color: "#7c3aed",
    bg: "#f3e8ff",
  },
  Vaccination: {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="#15803d"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ width: 16, height: 16 }}
      >
        <path d="m18 2 4 4" />
        <path d="m17 7 3-3" />
        <path d="M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-2.5 0-3.4L15 5" />
        <path d="m9 11 4 4" />
        <path d="m5 19-3 3" />
        <path d="m14 4 6 6" />
      </svg>
    ),
    color: "#15803d",
    bg: "#f0fdf4",
  },
  Consultation: {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="#1d4ed8"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ width: 16, height: 16 }}
      >
        <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.3.3 0 1 0 .3.3" />
        <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4" />
        <circle cx="20" cy="10" r="2" />
      </svg>
    ),
    color: "#1d4ed8",
    bg: "#eff6ff",
  },
};
const DOG_BREEDS = [
  "Aspin (Askal)",
  "Shih Tzu",
  "Poodle",
  "Labrador Retriever",
  "Golden Retriever",
  "Chihuahua",
  "Siberian Husky",
  "Beagle",
  "German Shepherd",
  "Pomeranian",
  "Dachshund",
  "French Bulldog",
  "Rottweiler",
  "Others",
];
const CAT_BREEDS = [
  "Puspin (Native)",
  "Persian",
  "Siamese",
  "British Shorthair",
  "Maine Coon",
  "Ragdoll",
  "Scottish Fold",
  "American Shorthair",
  "Others",
];
const sanitizeContact = (v) => v.replace(/\D/g, "").slice(0, 11);
const sanitizeName = (v) => v.replace(/[^a-zA-Z\s'-]/g, "");
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

  React.useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  const handleOpen = () => {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const dropHeight = Math.min((options.length + 1) * 38, 240);
      const showAbove = spaceBelow < dropHeight + 60;
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
                    if ((!opt.disabled && optVal !== "") || optVal === "") {
                      onChange(optVal);
                      setOpen(false);
                    }
                  }}
                  style={{
                    padding: "8px 10px",
                    fontSize: 13,
                    fontWeight: isSelected ? 700 : 500,
                    color: opt.disabled
                      ? "#cbd5e1"
                      : isEmpty
                        ? "#b0bac9"
                        : isSelected
                          ? accent
                          : "var(--text)",
                    cursor: opt.disabled
                      ? "not-allowed"
                      : isEmpty
                        ? "default"
                        : "pointer",
                    transition: "background 0.12s, color 0.12s",
                    background: isSelected ? `${accent}12` : "transparent",
                    borderRadius: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    opacity: opt.disabled ? 0.45 : 1,
                    marginBottom: 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected && !opt.disabled && !isEmpty)
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
                          border: `1.5px solid ${isSelected ? accent : opt.disabled ? "#e2e8f0" : "#cbd5e1"}`,
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

const Toast = ({ message, show, type = "success" }) => {
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
    warning: {
      accent: "#f59e0b",
      iconBg: "#fffbeb",
      iconColor: "#d97706",
      labelBg: "#fef3c7",
      labelColor: "#92400e",
      label: "Warning",
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
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      ),
    },
  };
  const c = cfg[type] || cfg.success;
  return (
    <div
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

const Walkin = () => {
  const {
    user,
    isAdmin,
    seeAllBranches,
    loading: userLoading,
  } = useCurrentUser();

  const [toasts, setToasts] = useState([]);
  const [walkinCredentials, setWalkinCredentials] = useState(null);
  const toastTimer = useRef(null);

  const [branchFilter, setBranchFilter] = useState("");
  const [branches, setBranches] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [walkins, setWalkins] = useState([]);
  const [vetSchedule, setVetSchedule] = useState({});
  const [vetTimeSchedule, setVetTimeSchedule] = useState({});
  const [allVets, setAllVets] = useState(VETS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const [statusFilter, setStatusFilter] = useState(null); // null | 'Today' | 'Attended' | 'Waiting'
  const [search, setSearch] = useState("");
  const [formOriginal, setFormOriginal] = useState(null); // snapshot for unsaved-changes detection
  const ROWS_PER_PAGE = 10;
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const handleSort = (key) => {
    setSortConfig((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" },
    );
  };
  const [showModal, setShowModal] = useState(false);
  const [dialog, setDialog] = useState({
    show: false,
    message: "",
    type: "confirm",
    onConfirm: null,
    title: "",
  });
  const showAlert = (message, title = "Notice") =>
    setDialog({ show: true, message, type: "alert", onConfirm: null, title });
  const showConfirm = (message, onConfirm, title = "Confirm") =>
    setDialog({ show: true, message, type: "confirm", onConfirm, title });
  const [editItem, setEditItem] = useState(null);
  const [viewItem, setViewItem] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [conflictType, setConflictType] = useState(null);
  const [groomingUsed, setGroomingUsed] = useState(0);

  // ── Multi-pet booking (new walk-ins only; editing stays single-pet) ──────
  const EMPTY_PET = {
    mode: "new",
    existingId: null,
    patient: "",
    species: "Dog",
    breed: "",
    room: "",
    purpose: "Checkup",
    vet: "",
    notes: "",
  };
  const [extraPets, setExtraPets] = useState([]); // additional pets beyond the main `form`
  const [existingPatients, setExistingPatients] = useState([]); // this owner's known pets
  const [loadingExistingPatients, setLoadingExistingPatients] = useState(false);

  // ── Service step (mirrors Appointments.jsx booking flow) ────────────────
  const [bookStep, setBookStep] = useState("service"); // 'service' | 'form'
  const [services, setServices] = useState([]);

  useEffect(() => {
    supabase
      .from("inventory")
      .select("name, price, branch_id")
      .eq("category", "Service")
      .then(({ data }) => setServices(data || []));
  }, []);

  const getServicePrice = (purpose, branchId) => {
    if (!purpose) return null;
    const exact = services.find(
      (s) => s.name === purpose && String(s.branch_id) === String(branchId),
    );
    if (exact) return exact.price;
    const fallback = services.find(
      (s) => s.name === purpose && s.branch_id == null,
    );
    if (fallback) return fallback.price;
    return null;
  };

  const selectService = (val) => {
    const looked = getServicePrice(val, user?.branchId);
    setForm((prev) => ({
      ...prev,
      purpose: val,
      price: looked != null ? looked : "",
    }));
    setBookStep("form");
  };

  // ── Owner type toggle ─────────────────────────────────────────────────────
  const [ownerType, setOwnerType] = useState("walkin"); // 'walkin' | 'registered'
  const [clients, setClients] = useState([]);
  const [ownerSearch, setOwnerSearch] = useState("");
  const [showOwnerDrop, setShowOwnerDrop] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const ownerRef = useRef(null);

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

  // ── Fetch branches ────────────────────────────────────────────────────────
  useEffect(() => {
    supabase
      .from("branches")
      .select("id, name")
      .order("name")
      .then(({ data }) => setBranches(data || []));
  }, []);

  const fetchVetSchedules = useCallback(async () => {
    const { data, error } = await supabase.from("vet_schedules").select("*");
    if (error || !data || data.length === 0) return;
    const days = {};
    const times = {};
    data.forEach((row) => {
      days[row.vet] = row.days || [];
      times[row.vet] = row.times || [];
    });
    setAllVets(data.map((row) => row.vet));
    setVetSchedule(days);
    setVetTimeSchedule(times);
  }, []);

  const TIME_SLOTS = [
    "08:00 AM",
    "09:00 AM",
    "10:00 AM",
    "11:00 AM",
    "01:00 PM",
    "02:00 PM",
    "03:00 PM",
    "04:00 PM",
  ];
  const getNearestTimeSlot = () => {
    const now = new Date();
    const totalMin = now.getHours() * 60 + now.getMinutes();
    const slotMinutes = [480, 540, 600, 660, 780, 840, 900, 960];
    let closest = TIME_SLOTS[0];
    let closestDiff = Infinity;
    slotMinutes.forEach((sm, i) => {
      const diff = Math.abs(sm - totalMin);
      if (diff < closestDiff) {
        closestDiff = diff;
        closest = TIME_SLOTS[i];
      }
    });
    return closest;
  };
  const getAvailableVets = () => {
    const todayDow = new Date().getDay();
    const nearestSlot = getNearestTimeSlot();
    const available = allVets.filter((vet) => {
      const days = vetSchedule[vet];
      const times = vetTimeSchedule[vet];
      const dayOk = !days || days.length === 0 || days.includes(todayDow);
      const timeOk =
        !times || times.length === 0 || times.includes(nearestSlot);
      return dayOk && timeOk;
    });
    return available.length > 0 ? available : allVets;
  };

  const fetchRooms = useCallback(async () => {
    let q = supabase.from("rooms").select("*").order("number");

    if (!seeAllBranches && user?.branchId) {
      q = q.eq("branch_id", user.branchId);
    }

    if (seeAllBranches && branchFilter) {
      q = q.eq("branch_id", branchFilter);
    }

    const { data } = await q;
    setRooms(data || []);
  }, [user, seeAllBranches, branchFilter]);

  // ── Close dropdown on outside click ──────────────────────────────────────
  useEffect(() => {
    const h = (e) => {
      if (ownerRef.current && !ownerRef.current.contains(e.target))
        setShowOwnerDrop(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // ── Fetch registered clients (branch-scoped) ──────────────────────────────
  const fetchClients = useCallback(async () => {
    if (!user) return;
    let q = supabase
      .from("profiles")
      .select("id, first_name, last_name, email, phone, role")
      .eq("status", "Active")
      .in("role", ["customer", "Customer"])
      .order("first_name");
    if (!seeAllBranches && user?.branchId) q = q.eq("branch_id", user.branchId);
    if (seeAllBranches && branchFilter) q = q.eq("branch_id", branchFilter);
    const { data, error } = await q;
    if (error) {
      console.error("fetchClients error:", error.message);
      setClients([]);
      return;
    }
    setClients(
      (data || []).map((p) => ({
        ...p,
        full_name:
          `${p.first_name || ""} ${p.last_name || ""}`.trim() ||
          p.email ||
          "Unnamed",
      })),
    );
  }, [user, seeAllBranches, branchFilter]);

  // ── Fetch existing pets for the currently selected/typed owner ───────────
  const fetchExistingPatientsFor = async (ownerName, ownerUserId) => {
    if (!ownerName && !ownerUserId) {
      setExistingPatients([]);
      return;
    }
    setLoadingExistingPatients(true);
    let q = supabase
      .from("patients")
      .select("id, name, species, owner, owner_user_id");
    if (ownerUserId) q = q.eq("owner_user_id", ownerUserId);
    else q = q.eq("owner", ownerName);
    const { data, error } = await q.order("name");
    if (!error) setExistingPatients(data || []);
    setLoadingExistingPatients(false);
  };

  // ── Fetch walk-ins (branch-scoped) ────────────────────────────────────────
  const fetchWalkins = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    let q = supabase
      .from("walkins")
      .select("*")
      .order("arrived_at", { ascending: false });
    if (!seeAllBranches && user?.branchId) q = q.eq("branch_id", user.branchId);
    if (seeAllBranches && branchFilter) q = q.eq("branch_id", branchFilter);
    const { data, error } = await q;
    if (error) console.error("Fetch error:", error);
    else setWalkins(data || []);
    setLoading(false);
  }, [user, seeAllBranches, branchFilter]);

  useEffect(() => {
    if (user)
      logActivity(user, "Viewed walk-ins", "Opened walk-in registration");
  }, []);

  useEffect(() => {
    if (userLoading || !user) return;
    fetchWalkins();
    fetchRooms();
    fetchClients();
    fetchVetSchedules();

    const walkinChannel = supabase
      .channel("walkins-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "walkins" },
        (p) => setWalkins((prev) => [p.new, ...prev]),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "walkins" },
        (p) =>
          setWalkins((prev) =>
            prev.map((w) => (w.id === p.new.id ? p.new : w)),
          ),
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "walkins" },
        (p) => setWalkins((prev) => prev.filter((w) => w.id !== p.old.id)),
      )
      .subscribe();

    const profilesChannel = supabase
      .channel("walkin-profiles-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => fetchClients(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(walkinChannel);
      supabase.removeChannel(profilesChannel);
      clearTimeout(toastTimer.current);
    };
  }, [
    user,
    userLoading,
    seeAllBranches,
    branchFilter,
    fetchClients,
    fetchWalkins,
  ]);

  if (!userLoading && !user) {
    return (
      <Layout>
        <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
            Please log in
          </h2>
          <p style={{ fontSize: 13 }}>
            Your branch could not be detected. Please sign in again.
          </p>
        </div>
      </Layout>
    );
  }

  useEffect(() => {
    if (form.purpose !== "Grooming") {
      setConflictType(null);
      setGroomingUsed(0);
      return;
    }
    const excludeId = editItem?.id ?? null;
    const used = walkins.filter(
      (w) =>
        w.purpose === "Grooming" &&
        w.status === "Waiting" &&
        w.id !== excludeId,
    ).length;
    setGroomingUsed(used);
    setConflictType(used >= MAX_GROOMERS ? "grooming" : null);
  }, [form.purpose, walkins, editItem]);

  const todayWalkins = walkins.filter((w) => w.arrived_at?.startsWith(today));

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
  }, [walkins.length, statusFilter, search]);

  const baseFilteredWalkins =
    statusFilter === "Today"
      ? walkins.filter((w) => w.arrived_at?.startsWith(today))
      : statusFilter
        ? walkins.filter((w) => w.status === statusFilter)
        : walkins;

  const filteredWalkins = search
    ? baseFilteredWalkins.filter((w) =>
        `${w.patient} ${w.owner} ${w.vet}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      )
    : baseFilteredWalkins;

  const sortedWalkins = (() => {
    if (!sortConfig.key) return filteredWalkins;
    const { key, direction } = sortConfig;
    const arr = [...filteredWalkins];
    arr.sort((a, b) => {
      let av = (a[key] || "").toString().toLowerCase();
      let bv = (b[key] || "").toString().toLowerCase();
      if (av < bv) return direction === "asc" ? -1 : 1;
      if (av > bv) return direction === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  })();

  const totalPages = Math.max(
    1,
    Math.ceil(sortedWalkins.length / ROWS_PER_PAGE),
  );
  const safePage = Math.min(currentPage, totalPages);
  const paginated = sortedWalkins.slice(
    (safePage - 1) * ROWS_PER_PAGE,
    safePage * ROWS_PER_PAGE,
  );
  const isGrooming = form.purpose === "Grooming";

  const formatArrival = (iso) => {
    if (!iso) return { date: "—", time: "—" };
    const d = new Date(iso);
    return {
      date: d.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      time: d.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  };
  const arrivalDisplay = formatArrival(
    editItem ? editItem.arrived_at : new Date().toISOString(),
  );

  const branchLabel = (() => {
    if (!seeAllBranches) return "My Branch";
    if (branchFilter)
      return (
        branches.find((b) => b.id === branchFilter)?.name ?? "Selected Branch"
      );
    return "All Branches";
  })();

  const filteredClients = (() => {
    const q = ownerSearch.toLowerCase().trim();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.full_name.toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q) ||
        (c.phone || "").includes(q),
    );
  })();

  // ── Owner helpers ─────────────────────────────────────────────────────────
  const selectOwner = (client) => {
    setSelectedClient(client);
    setOwnerSearch(client.full_name);
    setShowOwnerDrop(false);
    setForm((prev) => ({
      ...prev,
      owner: client.full_name,
      owner_id: client.id,
      contact: client.phone || prev.contact,
    }));
    fetchExistingPatientsFor(client.full_name, client.id);
  };

  const clearOwner = (e) => {
    e?.stopPropagation();
    setSelectedClient(null);
    setOwnerSearch("");
    setForm((prev) => ({ ...prev, owner: "", owner_id: null, contact: "" }));
    setExistingPatients([]);
  };

  // ── Modal open/close ──────────────────────────────────────────────────────
  const snapshotWalkinState = (f, ot) =>
    JSON.stringify({ form: f, ownerType: ot });

  const openAdd = () => {
    setEditItem(null);
    setForm(EMPTY_FORM);
    setOwnerType("walkin");
    setConflictType(null);
    setGroomingUsed(0);
    setSelectedClient(null);
    setOwnerSearch("");
    setExtraPets([]);
    setExistingPatients([]);
    setFormOriginal(snapshotWalkinState(EMPTY_FORM, "walkin"));
    setBookStep("service");
    setShowModal(true);
  };

  const openView = (w) => setViewItem(w);

  const openEdit = (w) => {
    setEditItem(w);
    const initialOwnerType = w.owner_id ? "registered" : "walkin";
    const initialForm = {
      mode: "new",
      existingId: null,
      patient: w.patient || "",
      species: w.species || "Dog",
      room: w.room || "", // <-- Add this line
      owner: w.owner || "",
      owner_id: w.owner_id || null,
      contact: w.contact || "",
      purpose: w.purpose || "Checkup",
      vet: w.vet || "",
      notes: w.notes || "",
      status: w.status || "Waiting",
    };
    setOwnerType(initialOwnerType);
    setForm(initialForm);
    setConflictType(null);
    setGroomingUsed(0);
    setOwnerSearch(w.owner || "");
    const matched = clients.find(
      (c) => c.id === w.owner_id || c.full_name === w.owner,
    );
    setSelectedClient(matched || null);
    setFormOriginal(snapshotWalkinState(initialForm, initialOwnerType));
    setBookStep("form"); // editing skips the service-picker step
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditItem(null);
    setForm(EMPTY_FORM);
    setConflictType(null);
    setGroomingUsed(0);
    setSelectedClient(null);
    setOwnerSearch("");
    setOwnerType("walkin");
    setExtraPets([]);
    setExistingPatients([]);
    setFormOriginal(null);
    setBookStep("service");
  };
  const hasUnsavedWalkinEdits = () => {
    if (!formOriginal) return false;
    return snapshotWalkinState(form, ownerType) !== formOriginal;
  };

  const attemptCloseModal = () => {
    if (hasUnsavedWalkinEdits()) {
      showConfirm(
        "You have unsaved changes to this record. Do you want to discard them?",
        closeModal,
        "Discard Changes?",
      );
    } else {
      closeModal();
    }
  };
  // ── Save ──────────────────────────────────────────────────────────────────
  const generatePassword = (name) => {
    const clean = (name || "owner").replace(/\s+/g, "").toLowerCase();
    return `${clean}@VetCare${Math.floor(1000 + Math.random() * 9000)}`;
  };

  const upsertPatient = async () => {
    const { data: existing } = await supabase
      .from("patients")
      .select("id")
      .eq("name", form.patient.trim())
      .eq("owner", form.owner.trim())
      .maybeSingle();
    if (existing) return;

    let ownerUserId = ownerType === "registered" ? form.owner_id || null : null;
    let newCredentials = null;

    // For walk-in guests with no account, create one
    if (ownerType === "walkin" && form.owner.trim()) {
      const firstName =
        form.ownerFirstName.trim() || form.owner.trim().split(" ")[0];
      const lastName =
        form.ownerLastName.trim() ||
        form.owner.trim().split(" ").slice(1).join(" ") ||
        "";
      const generatedEmail = `${form.owner.trim().replace(/\s+/g, ".").toLowerCase()}${Math.floor(100 + Math.random() * 900)}@vetcare.local`;
      const generatedPassword = generatePassword(form.owner.trim());

      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp(
        {
          email: generatedEmail,
          password: generatedPassword,
          options: { data: { full_name: form.owner.trim(), role: "customer" } },
        },
      );

      if (!signUpErr && signUpData?.user?.id) {
        ownerUserId = signUpData.user.id;
        await supabase.from("profiles").upsert(
          [
            {
              id: ownerUserId,
              email: generatedEmail,
              first_name: firstName,
              last_name: lastName,
              role: "Customer",
              sex: form.ownerSex || null,
              branch_id: user?.branchId ?? null,
            },
          ],
          { onConflict: "id", ignoreDuplicates: false },
        );
        newCredentials = {
          fullName: form.owner.trim(),
          email: generatedEmail,
          password: generatedPassword,
        };
      }
    }

    await supabase.from("patients").insert([
      {
        name: form.patient.trim(),
        species: form.species || null,
        gender: form.sex || null,
        owner: form.owner.trim(),
        contact: form.contact.trim() || null,
        owner_user_id: ownerUserId,
        condition:
          form.purpose !== "Grooming" ? `Walk-in: ${form.purpose}` : "Grooming",
        status: "Outpatient",
        health: "Good",
        branch_id: user?.branchId ?? null,
      },
    ]);

    if (newCredentials) setWalkinCredentials(newCredentials);
  };

  // ── Extra pet list helpers ────────────────────────────────────────────
  const updateExtraPet = (idx, patch) =>
    setExtraPets((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)),
    );
  const addExtraPet = () => setExtraPets((prev) => [...prev, { ...EMPTY_PET }]);
  const removeExtraPet = (idx) =>
    setExtraPets((prev) => prev.filter((_, i) => i !== idx));

  const getGroomingUsedForExtra = (excludeIdx) => {
    const usedFromExisting = walkins.filter(
      (w) => w.purpose === "Grooming" && w.status === "Waiting",
    ).length;
    const usedFromMain = form.purpose === "Grooming" ? 1 : 0;
    const usedFromBatch = extraPets.filter(
      (p, i) => i !== excludeIdx && p.purpose === "Grooming",
    ).length;
    return usedFromExisting + usedFromMain + usedFromBatch;
  };

  // ── Form validation ───────────────────────────────────────────────────────
  const isMainPetValid = () => {
    if (form.mode === "existing") return !!form.existingId;
    return !!form.patient.trim();
  };

  const isOwnerValid = () => {
    if (ownerType === "registered") return !!selectedClient;
    if (!form.owner.trim()) return false;
    if (form.contact && form.contact.length !== 11) return false;
    return true;
  };

  const isExtraPetsValid = () => {
    for (const p of extraPets) {
      if (p.mode === "existing" && !p.existingId) return false;
      if (p.mode === "new" && !p.patient.trim()) return false;
    }
    return true;
  };

  const isFormValid = () =>
    isMainPetValid() && isOwnerValid() && isExtraPetsValid() && !conflictType;

  const saveWalkin = async () => {
    if (!form.patient.trim()) {
      showAlert("Please enter the patient (pet) name.", "Missing Field");
      return;
    }
    if (!form.owner.trim()) {
      showAlert("Please enter the owner name.", "Missing Field");
      return;
    }
    if (conflictType) {
      showAlert("Cannot save: grooming is fully booked.", "Fully Booked");
      return;
    }

    // Validate extra pets (only relevant for new walk-ins, not edit mode)
    if (!editItem) {
      for (const p of extraPets) {
        if (p.mode === "existing" && !p.existingId) {
          showAlert(
            'Please select an existing pet for each entry, or switch to "New Pet".',
            "Missing Field",
          );
          return;
        }
        if (p.mode === "new" && !p.patient.trim()) {
          showAlert(
            "Please enter a pet name for each new pet.",
            "Missing Field",
          );
          return;
        }
      }
      const groomingTotal = getGroomingUsedForExtra(-1);
      if (groomingTotal > MAX_GROOMERS) {
        showAlert(
          "One or more pets cannot be added: grooming is fully booked.",
          "Fully Booked",
        );
        return;
      }
    }

    setSaving(true);

    const payload = {
      patient: form.patient.trim(),
      species: form.species,
      sex: form.sex,
      room: form.room.trim(),
      owner: form.owner.trim(),
      owner_id: ownerType === "registered" ? form.owner_id || null : null,
      contact: form.contact.trim(),
      purpose: form.purpose,
      price: form.price === "" ? 0 : Number(form.price),
      vet: form.purpose === "Grooming" ? null : form.vet || null,
      notes: form.notes.trim(),
      status: form.status,
    };
    if (editItem) {
      const { error } = await supabase
        .from("walkins")
        .update(payload)
        .eq("id", editItem.id);
      setSaving(false);
      if (error) {
        showAlert("Error updating: " + error.message, "Error");
        return;
      }
      closeModal();
      logActivity(
        user,
        "Updated walk-in",
        `Edited walk-in for: ${form.patient}`,
      );
      showToast("✓ Walk-in updated successfully!");
      return;
    }

    // New walk-in(s): main pet + any extra pets, same owner
    const { error } = await supabase
      .from("walkins")
      .insert([
        {
          ...payload,
          arrived_at: new Date().toISOString(),
          branch_id: user?.branchId ?? null,
        },
      ])
      .select();
    if (error) {
      setSaving(false);
      showAlert("Error saving: " + error.message, "Error");
      return;
    }
    await upsertPatient();

    for (const p of extraPets) {
      const petName =
        p.mode === "existing"
          ? existingPatients.find((ep) => ep.id === p.existingId)?.name || ""
          : p.patient.trim();
      const petSpecies =
        p.mode === "existing"
          ? existingPatients.find((ep) => ep.id === p.existingId)?.species || ""
          : p.species;

      const extraPayload = {
        patient: petName,
        species: petSpecies || null,
        room: p.room ? p.room.trim() : "",
        owner: form.owner.trim(),
        owner_id: ownerType === "registered" ? form.owner_id || null : null,
        contact: form.contact.trim(),
        purpose: p.purpose,
        price: form.price === "" ? 0 : Number(form.price),
        vet: p.purpose === "Grooming" ? null : p.vet || null,
        notes: p.notes.trim(),
        status: "Attended",
        arrived_at: new Date().toISOString(),
        branch_id: user?.branchId ?? null,
      };
      const { error: extraErr } = await supabase
        .from("walkins")
        .insert([extraPayload])
        .select();
      if (extraErr) {
        console.warn("Extra pet walk-in failed:", extraErr.message);
        continue;
      }

      // Auto-register new pets only (existing ones are already in patients table)
      if (p.mode === "new" && petName) {
        const { data: existing } = await supabase
          .from("patients")
          .select("id")
          .eq("name", petName)
          .eq("owner", form.owner.trim())
          .maybeSingle();
        if (!existing) {
          await supabase.from("patients").insert([
            {
              name: petName,
              species: petSpecies || null,
              owner: form.owner.trim(),
              contact: form.contact.trim() || null,
              owner_user_id:
                ownerType === "registered" ? form.owner_id || null : null,
              condition:
                p.purpose !== "Grooming" ? `Walk-in: ${p.purpose}` : "Grooming",
              status: "Outpatient",
              health: "Good",
              branch_id: user?.branchId ?? null,
            },
          ]);
        }
      }
    }

    setSaving(false);
    closeModal();
    logActivity(
      user,
      "Registered walk-in",
      `Walk-in patient: ${form.patient} · Owner: ${form.owner}${extraPets.length ? ` (+${extraPets.length} more pet${extraPets.length > 1 ? "s" : ""})` : ""}`,
    );
    showToast(
      extraPets.length
        ? `✓ ${1 + extraPets.length} walk-ins registered for ${form.owner.trim()}!`
        : "✓ Walk-in registered & patient record created!",
    );
  };

  const updateStatus = async (id, status) => {
    const { error } = await supabase
      .from("walkins")
      .update({ status })
      .eq("id", id);
    if (error) showAlert("Error updating status: " + error.message, "Error");
  };

  const deleteWalkin = async (id) => {
    showConfirm(
      "Permanently delete this walk-in? This cannot be undone.",
      async () => {
        const { error } = await supabase.from("walkins").delete().eq("id", id);
        if (error)
          showAlert("Error deleting walk-in: " + error.message, "Error");
      },
      "Delete Walk-In",
    );
  };

  const toggleSelectRow = (id) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const toggleSelectAllOnPage = () => {
    const pageIds = paginated.map((w) => w.id);
    const allSelected = pageIds.every((id) => selectedIds.includes(id));
    setSelectedIds((prev) =>
      allSelected
        ? prev.filter((id) => !pageIds.includes(id))
        : [...new Set([...prev, ...pageIds])],
    );
  };

  const bulkDeleteWalkins = () => {
    showConfirm(
      `Permanently delete ${selectedIds.length} selected walk-in${selectedIds.length > 1 ? "s" : ""}? This cannot be undone.`,
      async () => {
        const { error } = await supabase
          .from("walkins")
          .delete()
          .in("id", selectedIds);
        if (error) {
          showAlert("Error deleting walk-ins: " + error.message, "Error");
          return;
        }
        logActivity(
          user,
          "Bulk deleted walk-ins",
          `Deleted ${selectedIds.length} walk-in(s): ${selectedIds.join(", ")}`,
        );
        showToast(`${selectedIds.length} walk-in(s) deleted`, "info");
        setSelectedIds([]);
      },
      "Delete Walk-Ins",
    );
  };

  const S = {
    page: { width: "100%", minHeight: "100vh", display: "block" },
    topbar: {
      background: "var(--card)",
      borderBottom: "1px solid var(--border)",
      padding: "10px 16px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      position: "fixed",
      top: 68,
      left: "var(--current-sidebar-w, 62px)",
      right: 0,
      zIndex: 40,
      boxSizing: "border-box",
      gap: 8,
      flexWrap: "wrap",
    },
    cont: { padding: "24px 28px", boxSizing: "border-box" },
    card: {
      background: "var(--card)",
      borderRadius: "var(--radius-lg)",
      border: "1px solid var(--border)",
      boxShadow: "var(--shadow)",
      width: "100%",
      marginBottom: 20,
    },
    th: {
      background: "var(--bg)",
      padding: "11px 14px",
      textAlign: "left",
      fontSize: 11,
      fontWeight: 700,
      color: "var(--muted)",
      textTransform: "uppercase",
      letterSpacing: "0.5px",
      borderBottom: "1px solid var(--border)",
    },
    td: {
      padding: "13px 14px",
      borderBottom: "1px solid var(--border)",
      color: "var(--text)",
      verticalAlign: "middle",
    },
    btn: { width: "auto" },
    inp: {
      padding: "9px 12px",
      border: "1.5px solid var(--border)",
      borderRadius: 8,
      fontSize: 13,
      fontFamily: "inherit",
      background: "var(--card)",
      color: "var(--text)",
      outline: "none",
    },
    textInput: {
      width: "100%",
      padding: "9px 12px",
      border: "1.5px solid var(--border)",
      borderRadius: 8,
      fontSize: 13,
      fontFamily: "inherit",
      outline: "none",
      boxSizing: "border-box",
    },
  };

  {
    /* Walk-in Guest — plain text inputs */
  }
  {
    ownerType === "walkin" && (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <label
            style={{
              fontSize: 11,
              color: "var(--muted)",
              fontWeight: 700,
              display: "block",
              marginBottom: 4,
            }}
          >
            Full Name *
          </label>
          <input
            type="text"
            placeholder="e.g. Juan dela Cruz"
            value={form.owner}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                owner: e.target.value,
                owner_id: null,
              }))
            }
            style={S.textInput}
          />
        </div>
        <div>
          <label
            style={{
              fontSize: 11,
              color: "var(--muted)",
              fontWeight: 700,
              display: "block",
              marginBottom: 4,
            }}
          >
            Contact
          </label>
          <input
            type="text"
            placeholder="e.g. 09xx-xxx-xxxx"
            value={form.contact}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, contact: e.target.value }))
            }
            style={S.textInput}
          />
        </div>
      </div>
    );
  }

  {
    /* Registered Client — searchable dropdown */
  }
  {
    ownerType === "registered" && (
      <div ref={ownerRef} style={{ position: "relative" }}>
        {selectedClient ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "#f0fdf4",
              border: "1.5px solid #bbf7d0",
              borderRadius: 8,
              padding: "9px 12px",
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "var(--royal)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: 13,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {(selectedClient.first_name?.[0] || "?").toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#166534",
                }}
              >
                {selectedClient.full_name}
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: 11,
                  color: "#16a34a",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {selectedClient.email || ""}
                {selectedClient.phone ? ` · ${selectedClient.phone}` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={clearOwner}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#dc2626",
                fontSize: 14,
                fontWeight: 700,
                padding: 0,
                width: "auto",
              }}
            >
              ✕
            </button>
          </div>
        ) : (
          <>
            <div
              onClick={() => setShowOwnerDrop(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "9px 12px",
                border: `1.5px solid ${showOwnerDrop ? "var(--royal)" : "var(--border)"}`,
                borderRadius: 8,
                background: "var(--card)",
                cursor: "text",
                boxSizing: "border-box",
                transition: "border-color 0.15s",
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#9ca3af"
                strokeWidth="2.5"
                style={{ flexShrink: 0 }}
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Search registered client name, email or phone..."
                value={ownerSearch}
                onChange={(e) => {
                  setOwnerSearch(e.target.value);
                  setShowOwnerDrop(true);
                }}
                onFocus={() => setShowOwnerDrop(true)}
                style={{
                  border: "none",
                  background: "transparent",
                  fontSize: 13,
                  color: "var(--text)",
                  outline: "none",
                  fontFamily: "inherit",
                  width: "100%",
                }}
              />
              {ownerSearch && (
                <button
                  type="button"
                  onClick={clearOwner}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--muted)",
                    fontSize: 14,
                    padding: 0,
                    width: "auto",
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            {showOwnerDrop && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  background: "#fff",
                  border: "1.5px solid var(--border)",
                  borderRadius: 10,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                  zIndex: 9999,
                  maxHeight: 220,
                  overflowY: "auto",
                  marginTop: 4,
                }}
              >
                <div
                  style={{
                    padding: "7px 12px 5px",
                    borderBottom: "1px solid var(--border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: "var(--muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    {branchLabel} Clients
                  </span>
                  <span style={{ fontSize: 10, color: "var(--muted)" }}>
                    {filteredClients.length} found
                  </span>
                </div>
                {clients.length === 0 ? (
                  <div
                    style={{
                      padding: "14px 16px",
                      textAlign: "center",
                      color: "var(--muted)",
                      fontSize: 13,
                    }}
                  >
                    <div style={{ marginBottom: 4 }}>
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#cbd5e1"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      >
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.35-4.35" />
                      </svg>
                    </div>
                    No clients in {branchLabel} yet.
                  </div>
                ) : filteredClients.length === 0 ? (
                  <div
                    style={{
                      padding: "14px 16px",
                      textAlign: "center",
                      color: "var(--muted)",
                      fontSize: 13,
                    }}
                  >
                    <div style={{ marginBottom: 4 }}>
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#cbd5e1"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      >
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.35-4.35" />
                      </svg>
                    </div>
                    No client matching "{ownerSearch}"
                  </div>
                ) : (
                  filteredClients.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => selectOwner(c)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "9px 12px",
                        cursor: "pointer",
                        borderBottom: "1px solid var(--border)",
                        transition: "background 0.12s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = "var(--light-blue)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "")
                      }
                    >
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          background: "var(--royal)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#fff",
                          fontSize: 12,
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {(c.first_name?.[0] || "?").toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 13,
                            fontWeight: 600,
                            color: "var(--text)",
                          }}
                        >
                          {c.full_name}
                        </p>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 11,
                            color: "var(--muted)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {c.email || ""}
                          {c.phone ? ` · ${c.phone}` : ""}
                        </p>
                      </div>
                      {c.role && (
                        <span
                          style={{
                            fontSize: 9,
                            background: "#dbeafe",
                            color: "#1e40af",
                            borderRadius: 4,
                            padding: "2px 5px",
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          {c.role.toUpperCase()}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Layout>
      <div
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
            <Toast key={t.id} message={t.message} show={t.show} type={t.type} />
          ))}
      </div>

      {walkinCredentials && (
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
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#fff"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
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
                    Walk-In Account Created!
                  </h3>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 12,
                      color: "#16a34a",
                      marginTop: 2,
                    }}
                  >
                    Patient record & owner account are ready
                  </p>
                </div>
              </div>
            </div>
            <div style={{ padding: "20px 24px" }}>
              {[
                ["Name", walkinCredentials.fullName],
                ["Email", walkinCredentials.email],
                ["Password", walkinCredentials.password],
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
                      fontFamily:
                        label === "Password" ? "monospace" : "inherit",
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
                  marginTop: 4,
                }}
              >
                Share these credentials with the owner. The password won't be
                shown again.
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
                onClick={() => {
                  navigator.clipboard?.writeText(
                    `Name: ${walkinCredentials.fullName}\nEmail: ${walkinCredentials.email}\nPassword: ${walkinCredentials.password}`,
                  );
                }}
              >
                Copy All
              </button>
              <button
                className="btn btn-primary"
                style={{ width: "auto" }}
                onClick={() => setWalkinCredentials(null)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
      <div style={S.page}>
        {/* ══ Topbar ══ */}
        <div style={S.topbar} className="walkin-topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img
              src="/icon/walkin.png"
              alt=""
              style={{
                width: 22,
                height: 22,
                flexShrink: 0,
                filter:
                  "brightness(0) saturate(100%) invert(17%) sepia(82%) saturate(1200%) hue-rotate(210deg)",
              }}
            />
            <div>
              <h1
                style={{
                  fontSize: 16,
                  fontWeight: 800,
                  color: "var(--text)",
                  margin: 0,
                }}
              >
                Walk-In Registration
              </h1>
              <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>
                {branchLabel} — Record walk-in visits
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {seeAllBranches && (
              <div style={{ width: 180 }}>
                <CustomSelect
                  value={branchFilter}
                  onChange={setBranchFilter}
                  placeholder="All Branches"
                  accent="#7c3aed"
                  options={branches.map((b) => ({
                    value: b.id,
                    label: b.name,
                  }))}
                />
              </div>
            )}
            <div
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
                e.currentTarget.querySelector(".fab-tooltip").style.opacity =
                  "1";
                e.currentTarget.querySelector(".fab-tooltip").style.transform =
                  "translateX(0)";
                e.currentTarget.querySelector(".fab-btn").style.transform =
                  "scale(1.1)";
                e.currentTarget.querySelector(".fab-btn").style.boxShadow =
                  "0 6px 28px rgba(30,58,138,0.5)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.querySelector(".fab-tooltip").style.opacity =
                  "0";
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
                  background: "linear-gradient(135deg,#0f172a,#1e3a8a)",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 700,
                  padding: "8px 14px",
                  borderRadius: 10,
                  whiteSpace: "nowrap",
                  pointerEvents: "none",
                  boxShadow: "0 8px 24px rgba(30,58,138,0.35)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
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
                  <span
                    style={{ fontSize: 12, fontWeight: 800, color: "#fff" }}
                  >
                    Register Walk-In
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 500,
                      color: "rgba(255,255,255,0.55)",
                    }}
                  >
                    Record a new visit
                  </span>
                </span>
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

        {/* ══ Content ══ */}
        <div className="content" style={{ paddingTop: 92 }}>
          <div
            className="wk-stats-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(195px,1fr))",
              gap: 14,
              marginBottom: 24,
            }}
          >
            {loading
              ? [1, 2, 3].map((i) => (
                  <div
                    key={i}
                    style={{
                      background: "var(--card)",
                      border: "1.5px solid var(--border)",
                      borderRadius: 16,
                      padding: 20,
                      display: "flex",
                      flexDirection: "column",
                      gap: 14,
                    }}
                  >
                    <div
                      className="skel"
                      style={{ width: 46, height: 46, borderRadius: 12 }}
                    />
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      <Skel w="45%" h={11} />
                      <Skel w="30%" h={26} />
                      <Skel w="60%" h={10} />
                    </div>
                  </div>
                ))
              : [
                  {
                    label: "Today's Walk-Ins",
                    value: todayWalkins.length,
                    icon: "/icon/walkin.png",
                    color: "blue",
                    sub: "Recorded today",
                    filter: "Today",
                  },
                  {
                    label: "Attended",
                    value: walkins.filter((w) => w.status === "Attended")
                      .length,
                    icon: "/icon/attended.png",
                    color: "green",
                    sub: "Visits completed",
                    filter: "Attended",
                  },
                  {
                    label: "Waiting",
                    value: walkins.filter((w) => w.status === "Waiting").length,
                    icon: "/icon/pending.png",
                    color: "yellow",
                    sub:
                      walkins.filter((w) => w.status === "Waiting").length > 0
                        ? "Currently in queue"
                        : "Queue clear",
                    filter: "Waiting",
                  },
                ].map((sc, i) => (
                  <div
                    key={i}
                    className={`stat-card-v2 ${sc.color} fade-in`}
                    onClick={() =>
                      setStatusFilter((prev) =>
                        prev === sc.filter ? null : sc.filter,
                      )
                    }
                    style={{
                      animationDelay: `${i * 0.1}s`,
                      cursor: "pointer",
                      opacity:
                        statusFilter && statusFilter !== sc.filter ? 0.55 : 1,
                      transition: "opacity 0.15s",
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
                            sc.color === "yellow" && sc.value > 0
                              ? "#d97706"
                              : "var(--muted)",
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        {sc.color === "yellow" && sc.value > 0 && (
                          <svg
                            width="11"
                            height="11"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                          >
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                        )}
                        {sc.sub}
                      </span>
                    </div>
                  </div>
                ))}
          </div>

          {/* Grooming alert banner */}
          {(() => {
            const gw = walkins.filter(
              (w) => w.purpose === "Grooming" && w.status === "Waiting",
            ).length;
            if (!gw) return null;
            const isFull = gw >= MAX_GROOMERS;
            return (
              <div
                style={{
                  background: isFull ? "#fef2f2" : "#f3e8ff",
                  border: `1.5px solid ${isFull ? "#fecaca" : "#d8b4fe"}`,
                  borderRadius: 10,
                  padding: "12px 20px",
                  marginBottom: 20,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <svg
                  width="20"
                  height="20"
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
                <div>
                  <p
                    style={{
                      margin: 0,
                      fontWeight: 700,
                      fontSize: 14,
                      color: isFull ? "#991b1b" : "#6b21a8",
                    }}
                  >
                    {isFull
                      ? `Grooming Fully Booked — Both groomers (${MAX_GROOMERS}/${MAX_GROOMERS}) are currently busy`
                      : `Grooming — ${gw}/${MAX_GROOMERS} groomer${gw > 1 ? "s" : ""} currently occupied`}
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 12,
                      color: isFull ? "#b91c1c" : "#7c3aed",
                    }}
                  >
                    {isFull
                      ? "No grooming walk-ins can be accepted right now."
                      : `${MAX_GROOMERS - gw} groomer slot${MAX_GROOMERS - gw > 1 ? "s" : ""} still available.`}
                  </p>
                </div>
              </div>
            );
          })()}

          <div style={S.card}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 22px",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <h2 style={{ fontSize: 15, fontWeight: 700 }}>Walk-In Records</h2>
              {selectedIds.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    background: "#fef2f2",
                    border: "1.5px solid #fca5a5",
                    borderRadius: 8,
                    padding: "6px 12px",
                  }}
                >
                  <span
                    style={{ fontSize: 12, fontWeight: 700, color: "#991b1b" }}
                  >
                    {selectedIds.length} selected
                  </span>
                  <button
                    onClick={bulkDeleteWalkins}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "5px 12px",
                      borderRadius: 6,
                      border: "none",
                      background: "#dc2626",
                      color: "#fff",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
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
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                    Delete Selected
                  </button>
                  <button
                    onClick={() => setSelectedIds([])}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#991b1b",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    Clear
                  </button>
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    background: "var(--bg)",
                    border: "1.5px solid var(--border)",
                    borderRadius: 8,
                    padding: "7px 12px",
                  }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#9ca3af"
                    strokeWidth="2.5"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search patient, owner, vet..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{
                      border: "none",
                      background: "transparent",
                      fontSize: 13,
                      color: "var(--text)",
                      outline: "none",
                      fontFamily: "inherit",
                      width: 200,
                    }}
                  />
                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--muted)",
                        fontSize: 13,
                        padding: 0,
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
                {statusFilter && (
                  <button
                    onClick={() => setStatusFilter(null)}
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--royal)",
                      background: "none",
                      border: "1px solid var(--royal)",
                      borderRadius: 20,
                      padding: "3px 10px",
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    ✕ Clear filter: {statusFilter}
                  </button>
                )}
                <span style={{ color: "var(--muted)", fontSize: 13 }}>
                  {filteredWalkins.length} of {walkins.length} total
                </span>
              </div>
            </div>
            <div style={{ overflowX: "auto" }}>
              {loading ? (
                <div style={{ padding: "16px 22px" }}>
                  {/* Table header skeleton */}
                  <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                    {["4%", "14%", "18%", "12%", "14%", "10%", "16%"].map(
                      (w, i) => (
                        <Skel key={i} w={w} h={13} />
                      ),
                    )}
                  </div>
                  {/* Table row skeletons */}
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        gap: 12,
                        alignItems: "center",
                        padding: "13px 0",
                        borderBottom: "1px solid #f1f5f9",
                      }}
                    >
                      <Skel w="4%" h={13} />
                      <div
                        style={{
                          width: "14%",
                          display: "flex",
                          flexDirection: "column",
                          gap: 6,
                        }}
                      >
                        <Skel w="80%" h={14} />
                        <Skel w="50%" h={11} />
                      </div>
                      <div
                        style={{
                          width: "18%",
                          display: "flex",
                          flexDirection: "column",
                          gap: 6,
                        }}
                      >
                        <Skel w="70%" h={13} />
                        <Skel w="55%" h={10} />
                        <Skel w="60%" h={10} />
                      </div>
                      <Skel w="12%" h={22} />
                      <Skel w="14%" h={13} />
                      <Skel w="10%" h={22} />
                      <div style={{ width: "16%", display: "flex", gap: 6 }}>
                        <Skel w="48%" h={28} />
                        <Skel w="48%" h={28} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 13,
                    minWidth: 640,
                  }}
                >
                  <thead>
                    <tr>
                      <th style={{ ...S.th, width: 36, textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={
                            paginated.length > 0 &&
                            paginated.every((w) => selectedIds.includes(w.id))
                          }
                          onChange={toggleSelectAllOnPage}
                          style={{ cursor: "pointer" }}
                        />
                      </th>
                      {[
                        { label: "#", key: null },
                        { label: "Patient", key: "patient" },
                        { label: "Owner", key: "owner" },
                        { label: "Purpose", key: "purpose" },
                        { label: "Vet / Service", key: "vet" },
                        { label: "Room", key: "room" },
                        { label: "Status", key: "status" },
                        { label: "Actions", key: null },
                      ].map(({ label, key }) => (
                        <th
                          key={label}
                          style={{
                            ...S.th,
                            cursor: key ? "pointer" : "default",
                            userSelect: "none",
                          }}
                          onClick={() => key && handleSort(key)}
                        >
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            {label}
                            {key && (
                              <svg
                                width="10"
                                height="10"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                                strokeLinecap="round"
                                style={{
                                  opacity: sortConfig.key === key ? 1 : 0.3,
                                  transform:
                                    sortConfig.key === key &&
                                    sortConfig.direction === "desc"
                                      ? "rotate(180deg)"
                                      : "none",
                                  transition: "transform 0.15s",
                                }}
                              >
                                <polyline points="18 15 12 9 6 15" />
                              </svg>
                            )}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredWalkins.length === 0 ? (
                      <tr>
                        <td
                          colSpan={9}
                          style={{
                            textAlign: "center",
                            padding: 40,
                            color: "var(--muted)",
                          }}
                        >
                          {" "}
                          {statusFilter
                            ? `No walk-ins match "${statusFilter}"`
                            : "No walk-ins recorded yet"}
                        </td>
                      </tr>
                    ) : (
                      paginated.map((w, idx) => {
                        const purposeIcons = {
                          Grooming: (
                            <svg
                              width="11"
                              height="11"
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
                          Emergency: (
                            <svg
                              width="11"
                              height="11"
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
                          Checkup: (
                            <svg
                              width="11"
                              height="11"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                            >
                              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                            </svg>
                          ),
                          Vaccination: (
                            <svg
                              width="11"
                              height="11"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                            >
                              <path d="m18 2 4 4" />
                              <path d="m17 7 3-3" />
                              <path d="M19 9 8.7 19.3a1 1 0 0 1-1.4 0l-3-3a1 1 0 0 1 0-1.4L14 5" />
                              <path d="m9 11 4 4" />
                              <path d="m5 19-3 3" />
                              <path d="m14 4 6 6" />
                            </svg>
                          ),
                          Dental: (
                            <svg
                              width="11"
                              height="11"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                            >
                              <path d="M12 2a5 5 0 0 1 5 5c0 5-5 13-5 13S7 12 7 7a5 5 0 0 1 5-5z" />
                            </svg>
                          ),
                          Other: (
                            <svg
                              width="11"
                              height="11"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                            >
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <polyline points="14 2 14 8 20 8" />
                            </svg>
                          ),
                        };
                        const purposeStyle = {
                          Grooming: { bg: "#f3e8ff", color: "#7c3aed" },
                          Emergency: { bg: "#fee2e2", color: "#dc2626" },
                          Checkup: { bg: "#eff6ff", color: "#1e40af" },
                          Vaccination: { bg: "#f0fdf4", color: "#166534" },
                          Dental: { bg: "#fef3c7", color: "#92400e" },
                          Other: { bg: "#f1f5f9", color: "#475569" },
                        }[w.purpose] || { bg: "#f1f5f9", color: "#475569" };
                        const ownerInitials = (w.owner || "?")
                          .split(" ")
                          .map((x) => x[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase();
                        return (
                          <tr
                            key={w.id}
                            className="wk-row-hover fade-in"
                            style={{
                              background: "var(--card)",
                              transition: "background 0.15s",
                              animationDelay: `${idx * 0.06}s`,
                            }}
                            onClick={() => openView(w)}
                          >
                            <td
                              style={{ ...S.td, textAlign: "center" }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                type="checkbox"
                                checked={selectedIds.includes(w.id)}
                                onChange={() => toggleSelectRow(w.id)}
                                style={{ cursor: "pointer" }}
                              />
                            </td>
                            <td style={S.td}>
                              <span
                                style={{
                                  fontSize: 11,
                                  color: "var(--muted)",
                                  fontWeight: 600,
                                }}
                              >
                                {(safePage - 1) * ROWS_PER_PAGE + idx + 1}
                              </span>
                            </td>
                            <td style={S.td}>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 9,
                                }}
                              >
                                <div
                                  style={{
                                    width: 34,
                                    height: 34,
                                    borderRadius: 10,
                                    flexShrink: 0,
                                    background:
                                      w.species === "Cat"
                                        ? "#f0fdf4"
                                        : "#eff6ff",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                >
                                  {w.species === "Cat" ? (
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
                                      fontWeight: 700,
                                      fontSize: 13,
                                      color: "var(--text)",
                                    }}
                                  >
                                    {w.patient}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: 11,
                                      color: "var(--muted)",
                                      marginTop: 1,
                                    }}
                                  >
                                    {w.species}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td style={S.td}>
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
                                    background: w.owner_id
                                      ? "var(--royal)"
                                      : "var(--bg)",
                                    border: "1.5px solid var(--border)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: 11,
                                    fontWeight: 700,
                                    color: w.owner_id ? "#fff" : "var(--muted)",
                                  }}
                                >
                                  {ownerInitials}
                                </div>
                                <div>
                                  <div
                                    style={{
                                      fontSize: 13,
                                      fontWeight: 600,
                                      color: "var(--text)",
                                    }}
                                  >
                                    {w.owner || "—"}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: 10,
                                      color: w.owner_id
                                        ? "var(--royal)"
                                        : "var(--muted)",
                                      fontWeight: 600,
                                      marginTop: 1,
                                    }}
                                  >
                                    {w.owner_id ? (
                                      <span
                                        style={{
                                          display: "inline-flex",
                                          alignItems: "center",
                                          gap: 3,
                                        }}
                                      >
                                        <svg
                                          width="9"
                                          height="9"
                                          viewBox="0 0 24 24"
                                          fill="var(--royal)"
                                          stroke="none"
                                        >
                                          <circle cx="12" cy="12" r="6" />
                                        </svg>{" "}
                                        Registered Client
                                      </span>
                                    ) : (
                                      <span
                                        style={{
                                          display: "inline-flex",
                                          alignItems: "center",
                                          gap: 3,
                                        }}
                                      >
                                        <svg
                                          width="10"
                                          height="10"
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="2"
                                          strokeLinecap="round"
                                        >
                                          <circle cx="12" cy="5" r="2" />
                                          <path d="M12 22V12m0 0l-3 3m3-3l3 3" />
                                          <path d="M9 9H5m14 0h-4" />
                                        </svg>{" "}
                                        Walk-in Guest
                                      </span>
                                    )}
                                  </div>
                                  {w.contact && (
                                    <div
                                      style={{
                                        fontSize: 11,
                                        color: "var(--muted)",
                                      }}
                                    >
                                      {w.contact}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td style={S.td}>
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 5,
                                  background: purposeStyle.bg,
                                  color: purposeStyle.color,
                                  borderRadius: 20,
                                  padding: "3px 10px",
                                  fontSize: 11,
                                  fontWeight: 700,
                                }}
                              >
                                {purposeIcons[w.purpose] || purposeIcons.Other}{" "}
                                {w.purpose}
                              </span>
                            </td>
                            <td style={S.td}>
                              {w.purpose === "Grooming" ? (
                                <span
                                  style={{
                                    fontSize: 11,
                                    background: "#f3e8ff",
                                    color: "#7c3aed",
                                    borderRadius: 20,
                                    padding: "3px 10px",
                                    fontWeight: 700,
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 4,
                                  }}
                                >
                                  <svg
                                    width="11"
                                    height="11"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="#7c3aed"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                  >
                                    <circle cx="6" cy="6" r="3" />
                                    <circle cx="6" cy="18" r="3" />
                                    <line x1="20" y1="4" x2="8.12" y2="15.88" />
                                    <line
                                      x1="14.47"
                                      y1="14.48"
                                      x2="20"
                                      y2="20"
                                    />
                                    <line x1="8.12" y1="8.12" x2="12" y2="12" />
                                  </svg>
                                  Grooming Team
                                </span>
                              ) : w.vet ? (
                                <span
                                  style={{
                                    fontSize: 13,
                                    color: "var(--text)",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 5,
                                  }}
                                >
                                  <svg
                                    width="13"
                                    height="13"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="#6366f1"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                  >
                                    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                                  </svg>
                                  {w.vet}
                                </span>
                              ) : (
                                <span
                                  style={{
                                    color: "var(--muted)",
                                    fontStyle: "italic",
                                    fontSize: 12,
                                  }}
                                >
                                  Unassigned
                                </span>
                              )}
                            </td>
                            <td style={S.td}>
                              {w.room ? (
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
                                  {w.room}
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
                            <td style={S.td}>
                              <span
                                className={`badge ${STATUS_BADGE[w.status] || "badge-gray"}`}
                              >
                                {w.status}
                              </span>
                            </td>
                            <td
                              style={S.td}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  gap: 5,
                                  alignItems: "center",
                                  flexWrap: "nowrap",
                                }}
                              >
                                <button
                                  onClick={() => {
                                    setViewItem(null);
                                    openEdit(w);
                                  }}
                                  style={{
                                    background: "none",
                                    border: "1px solid #e2e8f0",
                                    borderRadius: 20,
                                    height: 28,
                                    padding: "0 10px",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 5,
                                    cursor: "pointer",
                                    color: "#64748b",
                                    fontSize: 11,
                                    fontWeight: 600,
                                    fontFamily: "inherit",
                                  }}
                                >
                                  <svg
                                    width="11"
                                    height="11"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                  >
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                  </svg>
                                  Edit
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
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (pg) => (
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
                        background:
                          safePage === pg ? "var(--royal)" : "transparent",
                        color: safePage === pg ? "#fff" : "var(--text)",
                        borderColor:
                          safePage === pg ? "var(--royal)" : "var(--border)",
                      }}
                    >
                      {pg}
                    </button>
                  ),
                )}
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={safePage === totalPages}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 20,
                    border: "1.5px solid var(--border)",
                    background: "transparent",
                    fontSize: 13,
                    fontWeight: 600,
                    color:
                      safePage === totalPages ? "var(--muted)" : "var(--text)",
                    cursor: safePage === totalPages ? "default" : "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══ View Modal ══ */}
      {viewItem &&
        (() => {
          const w = viewItem;
          const statusColor =
            { Waiting: "#d97706", Attended: "#16a34a", Cancelled: "#dc2626" }[
              w.status
            ] || "#64748b";
          const purposeStyle = {
            Grooming: { bg: "#f3e8ff", color: "#7c3aed" },
            Emergency: { bg: "#fee2e2", color: "#dc2626" },
            Checkup: { bg: "#eff6ff", color: "#1e40af" },
            Vaccination: { bg: "#f0fdf4", color: "#166534" },
            Dental: { bg: "#fef3c7", color: "#92400e" },
            Other: { bg: "#f1f5f9", color: "#475569" },
          }[w.purpose] || { bg: "#f1f5f9", color: "#475569" };
          const arrival = formatArrival(w.arrived_at);
          return (
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 9999,
                padding: 16,
              }}
            >
              <div
                style={{
                  background: "var(--card)",
                  borderRadius: 16,
                  width: "100%",
                  maxWidth: 520,
                  maxHeight: "90vh",
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  boxShadow: "0 24px 64px rgba(0,0,0,0.28)",
                }}
              >
                {/* Hero banner */}
                <div
                  style={{
                    background:
                      "linear-gradient(135deg, #0f172a 0%, #1e3a8a 60%, #2563eb 100%)",
                    borderRadius: "16px 16px 0 0",
                    padding: "20px 22px",
                    position: "relative",
                    overflow: "hidden",
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: -40,
                      right: -40,
                      width: 180,
                      height: 180,
                      borderRadius: "50%",
                      background: "rgba(255,255,255,0.04)",
                      pointerEvents: "none",
                    }}
                  />
                  <div style={{ position: "relative", zIndex: 1 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 14,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 14,
                        }}
                      >
                        <div
                          style={{
                            width: 52,
                            height: 52,
                            borderRadius: 14,
                            flexShrink: 0,
                            background:
                              w.species === "Cat" ? "#f0fdf4" : "#eff6ff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            border: "2px solid rgba(255,255,255,0.2)",
                          }}
                        >
                          {w.species === "Cat" ? (
                            <svg
                              width="24"
                              height="24"
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
                              width="24"
                              height="24"
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
                            {w.patient}
                          </h2>
                          <p
                            style={{
                              margin: "4px 0 0",
                              fontSize: 13,
                              color: "rgba(255,255,255,0.65)",
                            }}
                          >
                            {w.species}
                            {w.owner ? ` · ${w.owner}` : ""}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setViewItem(null)}
                        style={{
                          background: "rgba(255,255,255,0.15)",
                          border: "1px solid rgba(255,255,255,0.25)",
                          borderRadius: 8,
                          width: 30,
                          height: 30,
                          cursor: "pointer",
                          color: "#fff",
                          fontSize: 15,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        ✕
                      </button>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <span
                        style={{
                          background: `${statusColor}33`,
                          border: `1.5px solid ${statusColor}66`,
                          color: "#fff",
                          borderRadius: 20,
                          padding: "4px 12px",
                          fontSize: 12,
                          fontWeight: 700,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        <span
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: "50%",
                            background: "#fff",
                            display: "inline-block",
                          }}
                        />
                        {w.status}
                      </span>
                      <span
                        style={{
                          background: "rgba(255,255,255,0.15)",
                          border: "1px solid rgba(255,255,255,0.2)",
                          borderRadius: 20,
                          padding: "4px 12px",
                          fontSize: 12,
                          fontWeight: 600,
                          color: "rgba(255,255,255,0.9)",
                        }}
                      >
                        {w.purpose}
                      </span>
                      {!w.owner_id ? (
                        <span
                          style={{
                            background: "rgba(255,255,255,0.1)",
                            border: "1px solid rgba(255,255,255,0.15)",
                            borderRadius: 20,
                            padding: "4px 12px",
                            fontSize: 11,
                            fontWeight: 700,
                            color: "rgba(255,255,255,0.8)",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <svg
                            width="10"
                            height="10"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                          >
                            <circle cx="12" cy="5" r="2" />
                            <path d="M12 22V12m0 0l-3 3m3-3l3 3" />
                            <path d="M9 9H5m14 0h-4" />
                          </svg>
                          Walk-in Guest
                        </span>
                      ) : (
                        <span
                          style={{
                            background: "rgba(255,255,255,0.1)",
                            border: "1px solid rgba(255,255,255,0.15)",
                            borderRadius: 20,
                            padding: "4px 12px",
                            fontSize: 11,
                            fontWeight: 700,
                            color: "rgba(255,255,255,0.8)",
                          }}
                        >
                          Registered Client
                        </span>
                      )}
                    </div>

                    {/* Quick stats row */}
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                        marginTop: 14,
                      }}
                    >
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
                          label: w.room ? `Room ${w.room}` : "No Room Assigned",
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
                              <circle cx="12" cy="12" r="10" />
                              <polyline points="12 6 12 12 16 14" />
                            </svg>
                          ),
                          label: `${arrival.date} · ${arrival.time}`,
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
                          label: w.contact || "No Contact",
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
                <div style={{ padding: "20px 22px", flex: 1 }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 10,
                    }}
                  >
                    {[
                      { label: "Owner Name", value: w.owner || "—" },
                      { label: "Contact Number", value: w.contact || "—" },
                      {
                        label: "Vet / Service",
                        value:
                          w.purpose === "Grooming"
                            ? "Grooming Team"
                            : w.vet || "Unassigned",
                      },
                      {
                        label: "Assigned Room",
                        value: w.room ? `Room ${w.room}` : "N/A",
                      },
                    ].map(({ label, value }) => (
                      <div
                        key={label}
                        style={{
                          background: "#f8fafc",
                          border: "1.5px solid var(--border)",
                          borderRadius: 10,
                          padding: "12px 14px",
                          display: "flex",
                          flexDirection: "column",
                          gap: 3,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 800,
                            textTransform: "uppercase",
                            letterSpacing: 1,
                            color: "#94a3b8",
                          }}
                        >
                          {label}
                        </span>
                        <span
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: "var(--text)",
                          }}
                        >
                          {value}
                        </span>
                      </div>
                    ))}

                    {/* Notes — full width */}
                    {w.notes && (
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
                            Notes / Remarks
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
                            {w.notes}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 10,
                    padding: "14px 22px",
                    borderTop: "1px solid var(--border)",
                    background: "var(--bg)",
                    flexShrink: 0,
                  }}
                >
                  <button
                    className="btn btn-ghost"
                    style={{ width: "auto" }}
                    onClick={() => setViewItem(null)}
                  >
                    Close
                  </button>
                  <button
                    className="btn btn-ghost"
                    style={{ width: "auto" }}
                    onClick={() => {
                      setViewItem(null);
                      openEdit(w);
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
                      strokeLinejoin="round"
                      style={{ marginRight: 5 }}
                    >
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    Edit
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

      {/* ══ Modal ══ */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            style={{
              background: "var(--card)",
              borderRadius: 14,
              width: "100%",
              maxWidth: 560,
              maxHeight: "90vh",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
            }}
          >
            {/* Clipboard bar */}
            <div
              className="wk-clipboard-bar"
              style={{ flexShrink: 0, justifyContent: "flex-end" }}
            >
              <button
                onClick={attemptCloseModal}
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

            {/* Record header */}
            <div
              style={{
                background: "var(--bg)",
                borderBottom: "2px solid var(--border)",
                padding: "14px 24px 12px",
                textAlign: "center",
                flexShrink: 0,
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
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--royal)"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <h3
                  style={{
                    margin: 0,
                    fontSize: 15,
                    fontWeight: 800,
                    color: "var(--text, #1e293b)",
                    letterSpacing: "0.3px",
                  }}
                >
                  {editItem ? "Edit Walk-In Record" : "Walk-In Registration"}
                </h3>
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: 11,
                  color: "#64748b",
                  letterSpacing: "0.5px",
                }}
              >
                {editItem
                  ? `Updating: ${editItem.patient}`
                  : "Fill in the visit details below"}
              </p>
            </div>

            <div style={{ flex: 1, overflowY: "auto" }}>
              {/* Step 1: Service picker (new walk-ins only) */}
              {!editItem && bookStep === "service" && (
                <div style={{ padding: "18px 16px" }}>
                  <p
                    style={{
                      margin: "0 0 12px",
                      fontSize: 12,
                      fontWeight: 700,
                      color: "var(--muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.6px",
                    }}
                  >
                    Select a Service
                  </p>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(140px, 1fr))",
                      gap: 10,
                    }}
                  >
                    {PURPOSES.map((opt) => {
                      const meta = SERVICE_META[opt] || SERVICE_META.Checkup;
                      const price = getServicePrice(opt, user?.branchId);
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => selectService(opt)}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 6,
                            padding: "16px 10px",
                            borderRadius: 12,
                            cursor: "pointer",
                            border: `1.5px solid ${meta.color}33`,
                            background: meta.bg,
                            fontFamily: "inherit",
                          }}
                        >
                          <span style={{ display: "inline-flex" }}>
                            {meta.icon}
                          </span>
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                              color: meta.color,
                            }}
                          >
                            {opt}
                          </span>
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: "var(--muted)",
                            }}
                          >
                            {price != null
                              ? `₱${Number(price).toLocaleString()}`
                              : "Contact clinic"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Section: Owner ── */}
              {(editItem || bookStep !== "service") && (
                <>
                  <div
                    style={{
                      borderBottom: "1.5px solid #e2e8f0",
                      position: "relative",
                      zIndex: showOwnerDrop ? 200 : "auto",
                    }}
                  >
                    <div className="wk-section-label">Owner / Client</div>
                    <div style={{ padding: "12px 16px" }}>
                      {/* Auto-detected branch */}
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          background: "#eff6ff",
                          border: "1px solid #bfdbfe",
                          borderRadius: 6,
                          padding: "4px 10px",
                          marginBottom: 10,
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#1e40af",
                        }}
                      >
                        <svg
                          width="11"
                          height="11"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        >
                          <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" />
                        </svg>
                        Branch:{" "}
                        {branches.find((b) => b.id === user?.branchId)?.name ||
                          "My Branch"}
                      </div>

                      {/* Toggle */}
                      <div
                        style={{
                          display: "flex",
                          border: "1.5px solid var(--border)",
                          borderRadius: 8,
                          overflow: "hidden",
                          marginBottom: 12,
                          width: "fit-content",
                        }}
                      >
                        {[
                          { key: "walkin", label: "Walk-in Guest" },
                          { key: "registered", label: "Registered Client" },
                        ].map(({ key, label }) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => {
                              setOwnerType(key);
                              clearOwner();
                            }}
                            style={{
                              padding: "7px 18px",
                              border: "none",
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: "pointer",
                              fontFamily: "inherit",
                              transition: "all 0.15s",
                              background:
                                ownerType === key ? "var(--royal)" : "#fff",
                              color:
                                ownerType === key ? "#fff" : "var(--muted)",
                            }}
                          >
                            {label}
                          </button>
                        ))}
                      </div>

                      {/* Walk-in Guest inputs */}
                      {ownerType === "walkin" && (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 10,
                          }}
                        >
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "1fr 1fr",
                              gap: 10,
                            }}
                          >
                            <div>
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
                                First Name{" "}
                                <span style={{ color: "#ef4444" }}>*</span>
                              </div>
                              <input
                                type="text"
                                placeholder="e.g. Juan"
                                value={form.ownerFirstName}
                                onChange={(e) => {
                                  const v = sanitizeName(e.target.value);
                                  setForm((prev) => ({
                                    ...prev,
                                    ownerFirstName: v,
                                    owner: `${v} ${prev.ownerLastName}`.trim(),
                                    owner_id: null,
                                  }));
                                }}
                                onBlur={() =>
                                  fetchExistingPatientsFor(
                                    form.owner.trim(),
                                    null,
                                  )
                                }
                                style={{
                                  width: "100%",
                                  border: "none",
                                  borderBottom: "1.5px solid #cbd5e1",
                                  background: "transparent",
                                  fontSize: 13,
                                  fontWeight: 600,
                                  color: "var(--text, #1e293b)",
                                  outline: "none",
                                  padding: "2px 0",
                                  fontFamily: "inherit",
                                  boxSizing: "border-box",
                                }}
                              />
                            </div>
                            <div>
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
                                Last Name{" "}
                                <span style={{ color: "#ef4444" }}>*</span>
                              </div>
                              <input
                                type="text"
                                placeholder="e.g. dela Cruz"
                                value={form.ownerLastName}
                                onChange={(e) => {
                                  const v = sanitizeName(e.target.value);
                                  setForm((prev) => ({
                                    ...prev,
                                    ownerLastName: v,
                                    owner: `${prev.ownerFirstName} ${v}`.trim(),
                                    owner_id: null,
                                  }));
                                }}
                                onBlur={() =>
                                  fetchExistingPatientsFor(
                                    form.owner.trim(),
                                    null,
                                  )
                                }
                                style={{
                                  width: "100%",
                                  border: "none",
                                  borderBottom: "1.5px solid #cbd5e1",
                                  background: "transparent",
                                  fontSize: 13,
                                  fontWeight: 600,
                                  color: "var(--text, #1e293b)",
                                  outline: "none",
                                  padding: "2px 0",
                                  fontFamily: "inherit",
                                  boxSizing: "border-box",
                                }}
                              />
                            </div>
                          </div>
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "1fr 1fr",
                              gap: 10,
                            }}
                          >
                            <div>
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
                                Sex
                              </div>
                              <CustomSelect
                                value={form.ownerSex}
                                onChange={(val) =>
                                  setForm((prev) => ({
                                    ...prev,
                                    ownerSex: val,
                                  }))
                                }
                                options={["Male", "Female"]}
                                placeholder="— Select Sex —"
                              />
                            </div>
                            <div>
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
                                Contact
                              </div>
                              <input
                                type="text"
                                placeholder="e.g. 09170000000"
                                value={form.contact}
                                onChange={(e) =>
                                  setForm((prev) => ({
                                    ...prev,
                                    contact: sanitizeContact(e.target.value),
                                  }))
                                }
                                inputMode="numeric"
                                maxLength={11}
                                style={{
                                  width: "100%",
                                  border: "none",
                                  borderBottom: "1.5px solid #cbd5e1",
                                  background: "transparent",
                                  fontSize: 13,
                                  fontWeight: 600,
                                  color: "var(--text, #1e293b)",
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
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Registered Client dropdown */}
                      {ownerType === "registered" && (
                        <div ref={ownerRef} style={{ position: "relative" }}>
                          {selectedClient ? (
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                background: "#f0fdf4",
                                border: "1.5px solid #bbf7d0",
                                borderRadius: 8,
                                padding: "9px 12px",
                              }}
                            >
                              <div
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: "50%",
                                  background: "var(--royal)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  color: "#fff",
                                  fontSize: 13,
                                  fontWeight: 700,
                                  flexShrink: 0,
                                }}
                              >
                                {(
                                  selectedClient.first_name?.[0] || "?"
                                ).toUpperCase()}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p
                                  style={{
                                    margin: 0,
                                    fontSize: 13,
                                    fontWeight: 700,
                                    color: "#166534",
                                  }}
                                >
                                  {selectedClient.full_name}
                                </p>
                                <p
                                  style={{
                                    margin: 0,
                                    fontSize: 11,
                                    color: "#16a34a",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {selectedClient.email || ""}
                                  {selectedClient.phone
                                    ? ` · ${selectedClient.phone}`
                                    : ""}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={clearOwner}
                                style={{
                                  background: "none",
                                  border: "none",
                                  cursor: "pointer",
                                  color: "#dc2626",
                                  fontSize: 14,
                                  fontWeight: 700,
                                  padding: 0,
                                  width: "auto",
                                }}
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <>
                              <div
                                onClick={() => setShowOwnerDrop(true)}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                  padding: "9px 12px",
                                  border: `1.5px solid ${showOwnerDrop ? "var(--royal)" : "var(--border)"}`,
                                  borderRadius: 8,
                                  background: "#fff",
                                  cursor: "text",
                                  boxSizing: "border-box",
                                  transition: "border-color 0.15s",
                                }}
                              >
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="#9ca3af"
                                  strokeWidth="2.5"
                                  style={{ flexShrink: 0 }}
                                >
                                  <circle cx="11" cy="11" r="8" />
                                  <path d="m21 21-4.35-4.35" />
                                </svg>
                                <input
                                  type="text"
                                  placeholder="Search by name, email or phone..."
                                  value={ownerSearch}
                                  onChange={(e) => {
                                    setOwnerSearch(e.target.value);
                                    setShowOwnerDrop(true);
                                  }}
                                  onFocus={() => setShowOwnerDrop(true)}
                                  style={{
                                    border: "none",
                                    background: "transparent",
                                    fontSize: 13,
                                    color: "var(--text)",
                                    outline: "none",
                                    fontFamily: "inherit",
                                    width: "100%",
                                  }}
                                />
                                {ownerSearch && (
                                  <button
                                    type="button"
                                    onClick={clearOwner}
                                    style={{
                                      background: "none",
                                      border: "none",
                                      cursor: "pointer",
                                      color: "var(--muted)",
                                      fontSize: 14,
                                      padding: 0,
                                      width: "auto",
                                    }}
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                              {showOwnerDrop && ownerSearch.trim() && (
                                <div
                                  style={{
                                    position: "absolute",
                                    top: "100%",
                                    left: 0,
                                    right: 0,
                                    background: "#fff",
                                    border: "1.5px solid var(--border)",
                                    borderRadius: 10,
                                    boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                                    zIndex: 9999,
                                    maxHeight: 220,
                                    overflowY: "auto",
                                    marginTop: 4,
                                  }}
                                >
                                  <div
                                    style={{
                                      padding: "7px 12px 5px",
                                      borderBottom: "1px solid var(--border)",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "space-between",
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontSize: 10,
                                        fontWeight: 700,
                                        color: "var(--muted)",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.5px",
                                      }}
                                    >
                                      {branchLabel} Clients
                                    </span>
                                    <span
                                      style={{
                                        fontSize: 10,
                                        color: "var(--muted)",
                                      }}
                                    >
                                      {filteredClients.length} found
                                    </span>
                                  </div>
                                  {clients.length === 0 ? (
                                    <div
                                      style={{
                                        padding: "14px 16px",
                                        textAlign: "center",
                                        color: "var(--muted)",
                                        fontSize: 13,
                                      }}
                                    >
                                      <div style={{ marginBottom: 4 }}>
                                        <svg
                                          width="20"
                                          height="20"
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="#cbd5e1"
                                          strokeWidth="1.5"
                                          strokeLinecap="round"
                                        >
                                          <circle cx="11" cy="11" r="8" />
                                          <path d="m21 21-4.35-4.35" />
                                        </svg>
                                      </div>
                                      No clients in {branchLabel} yet.
                                    </div>
                                  ) : filteredClients.length === 0 ? (
                                    <div
                                      style={{
                                        padding: "14px 16px",
                                        textAlign: "center",
                                        color: "var(--muted)",
                                        fontSize: 13,
                                      }}
                                    >
                                      <div style={{ marginBottom: 4 }}>
                                        <svg
                                          width="20"
                                          height="20"
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="#cbd5e1"
                                          strokeWidth="1.5"
                                          strokeLinecap="round"
                                        >
                                          <circle cx="11" cy="11" r="8" />
                                          <path d="m21 21-4.35-4.35" />
                                        </svg>
                                      </div>
                                      No client matching "{ownerSearch}"
                                    </div>
                                  ) : (
                                    filteredClients.map((c) => (
                                      <div
                                        key={c.id}
                                        onClick={() => selectOwner(c)}
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: 10,
                                          padding: "9px 12px",
                                          cursor: "pointer",
                                          borderBottom:
                                            "1px solid var(--border)",
                                          transition: "background 0.12s",
                                        }}
                                        onMouseEnter={(e) =>
                                          (e.currentTarget.style.background =
                                            "var(--light-blue)")
                                        }
                                        onMouseLeave={(e) =>
                                          (e.currentTarget.style.background =
                                            "")
                                        }
                                      >
                                        <div
                                          style={{
                                            width: 32,
                                            height: 32,
                                            borderRadius: "50%",
                                            background: "var(--royal)",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            color: "#fff",
                                            fontSize: 12,
                                            fontWeight: 700,
                                            flexShrink: 0,
                                          }}
                                        >
                                          {(
                                            c.first_name?.[0] || "?"
                                          ).toUpperCase()}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                          <p
                                            style={{
                                              margin: 0,
                                              fontSize: 13,
                                              fontWeight: 600,
                                              color: "var(--text)",
                                            }}
                                          >
                                            {c.full_name}
                                          </p>
                                          <p
                                            style={{
                                              margin: 0,
                                              fontSize: 11,
                                              color: "var(--muted)",
                                              overflow: "hidden",
                                              textOverflow: "ellipsis",
                                              whiteSpace: "nowrap",
                                            }}
                                          >
                                            {c.email || ""}
                                            {c.phone ? ` · ${c.phone}` : ""}
                                          </p>
                                        </div>
                                        {c.role && (
                                          <span
                                            style={{
                                              fontSize: 9,
                                              background: "#dbeafe",
                                              color: "#1e40af",
                                              borderRadius: 4,
                                              padding: "2px 5px",
                                              fontWeight: 700,
                                              flexShrink: 0,
                                            }}
                                          >
                                            {c.role.toUpperCase()}
                                          </span>
                                        )}
                                      </div>
                                    ))
                                  )}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── Section: Patient ── */}
                  <div style={{ borderBottom: "1.5px solid #e2e8f0" }}>
                    <div
                      className="wk-section-label"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>
                        Patient Information{" "}
                        {extraPets.length > 0
                          ? `(Pet 1 of ${1 + extraPets.length})`
                          : ""}
                      </span>
                      {!editItem && (
                        <button
                          style={{
                            padding: "3px 9px",
                            borderRadius: 6,
                            border: "1.5px dashed #c7d2fe",
                            background: "#f5f3ff",
                            color: "#6366f1",
                            fontWeight: 600,
                            fontSize: 11,
                            cursor: "pointer",
                            fontFamily: "inherit",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                          }}
                          onClick={addExtraPet}
                        >
                          <svg
                            width="10"
                            height="10"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.8"
                          >
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                          </svg>
                          Add Another Pet
                        </button>
                      )}
                    </div>
                    <div
                      style={{
                        padding: "10px 16px",
                        borderBottom: "1px solid #e2e8f0",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          border: "1.5px solid var(--border)",
                          borderRadius: 8,
                          overflow: "hidden",
                          width: "fit-content",
                          marginBottom: form.mode === "existing" ? 10 : 0,
                        }}
                      >
                        {[
                          { key: "new", label: "New Pet" },
                          { key: "existing", label: "Existing Pet" },
                        ].map(({ key, label }) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() =>
                              setForm((prev) =>
                                key === "existing"
                                  ? {
                                      ...prev,
                                      mode: "existing",
                                      existingId: null,
                                    }
                                  : { ...prev, mode: "new", existingId: null },
                              )
                            }
                            style={{
                              padding: "6px 16px",
                              border: "none",
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: "pointer",
                              fontFamily: "inherit",
                              background:
                                form.mode === key ? "var(--royal)" : "#fff",
                              color:
                                form.mode === key ? "#fff" : "var(--muted)",
                            }}
                          >
                            {label}
                          </button>
                        ))}
                      </div>

                      {form.mode === "existing" ? (
                        loadingExistingPatients ? (
                          <div style={{ fontSize: 12, color: "var(--muted)" }}>
                            Loading {form.owner || "owner"}'s pets…
                          </div>
                        ) : existingPatients.length === 0 ? (
                          <div
                            style={{
                              fontSize: 12,
                              color: "var(--muted)",
                              background: "var(--bg)",
                              border: "1px solid var(--border)",
                              borderRadius: 8,
                              padding: "8px 12px",
                            }}
                          >
                            No registered pets found for this owner yet. Switch
                            to "New Pet" to add one.
                          </div>
                        ) : (
                          <select
                            value={form.existingId || ""}
                            onChange={(e) => {
                              const sel = existingPatients.find(
                                (ep) => ep.id === e.target.value,
                              );
                              setForm((prev) => ({
                                ...prev,
                                existingId: sel?.id || null,
                                patient: sel?.name || "",
                                species: sel?.species || "Dog",
                              }));
                            }}
                            style={{
                              width: "100%",
                              border: "1.5px solid var(--border)",
                              borderRadius: 8,
                              background: "#fff",
                              fontSize: 13,
                              fontWeight: 600,
                              color: "var(--text)",
                              outline: "none",
                              padding: "8px 10px",
                              fontFamily: "inherit",
                              boxSizing: "border-box",
                            }}
                          >
                            <option value="">— Select a pet —</option>
                            {existingPatients.map((ep) => (
                              <option key={ep.id} value={ep.id}>
                                {ep.name}
                                {ep.species ? ` (${ep.species})` : ""}
                              </option>
                            ))}
                          </select>
                        )
                      ) : (
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "2fr 1fr 1fr",
                            gap: 10,
                          }}
                        >
                          <div>
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
                              value={form.patient}
                              onChange={(e) =>
                                setForm({
                                  ...form,
                                  patient: sanitizeName(e.target.value),
                                })
                              }
                              placeholder="Pet name"
                              style={{
                                width: "100%",
                                border: "none",
                                borderBottom: "1.5px solid #cbd5e1",
                                background: "transparent",
                                fontSize: 13,
                                fontWeight: 600,
                                color: "var(--text, #1e293b)",
                                outline: "none",
                                padding: "2px 0",
                                fontFamily: "inherit",
                                boxSizing: "border-box",
                              }}
                            />
                          </div>
                          <div>
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
                              Species
                            </div>
                            <CustomSelect
                              value={form.species}
                              onChange={(val) =>
                                setForm({ ...form, species: val, breed: "" })
                              }
                              options={["Dog", "Cat"]}
                              placeholder="— Select Species —"
                            />
                          </div>
                          <div>
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
                              Sex
                            </div>
                            <CustomSelect
                              value={form.sex}
                              onChange={(val) => setForm({ ...form, sex: val })}
                              options={["Male", "Female", "Unknown"]}
                              placeholder="— Select Sex —"
                            />
                          </div>
                        </div>
                      )}
                      {form.mode === "new" && form.species && (
                        <div style={{ marginTop: 10 }}>
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
                            options={
                              form.species === "Cat" ? CAT_BREEDS : DOG_BREEDS
                            }
                            placeholder={`— Select ${form.species} Breed —`}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── Extra pets (additional walk-ins for the same owner) ── */}
                  {!editItem &&
                    extraPets.map((p, idx) => (
                      <div
                        key={idx}
                        style={{ borderBottom: "1.5px solid #e2e8f0" }}
                      >
                        <div
                          className="wk-section-label"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <span>
                            Pet {idx + 2} of {1 + extraPets.length}
                          </span>
                          <button
                            onClick={() => removeExtraPet(idx)}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: "#dc2626",
                              fontSize: 11,
                              fontWeight: 700,
                              padding: "2px 6px",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              fontFamily: "inherit",
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
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                            Remove
                          </button>
                        </div>

                        <div
                          style={{
                            padding: "10px 16px",
                            borderBottom: "1px solid #e2e8f0",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              border: "1.5px solid var(--border)",
                              borderRadius: 8,
                              overflow: "hidden",
                              width: "fit-content",
                              marginBottom: p.mode === "existing" ? 10 : 0,
                            }}
                          >
                            {[
                              { key: "new", label: "New Pet" },
                              { key: "existing", label: "Existing Pet" },
                            ].map(({ key, label }) => (
                              <button
                                key={key}
                                type="button"
                                onClick={() =>
                                  updateExtraPet(
                                    idx,
                                    key === "existing"
                                      ? {
                                          mode: "existing",
                                          patient: "",
                                          species: "Dog",
                                        }
                                      : { mode: "new", existingId: null },
                                  )
                                }
                                style={{
                                  padding: "6px 16px",
                                  border: "none",
                                  fontSize: 12,
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  fontFamily: "inherit",
                                  transition: "all 0.15s",
                                  background:
                                    p.mode === key ? "var(--royal)" : "#fff",
                                  color:
                                    p.mode === key ? "#fff" : "var(--muted)",
                                }}
                              >
                                {label}
                              </button>
                            ))}
                          </div>

                          {p.mode === "existing" ? (
                            loadingExistingPatients ? (
                              <div
                                style={{ fontSize: 12, color: "var(--muted)" }}
                              >
                                Loading {form.owner || "owner"}'s pets…
                              </div>
                            ) : existingPatients.length === 0 ? (
                              <div
                                style={{
                                  fontSize: 12,
                                  color: "var(--muted)",
                                  background: "var(--bg)",
                                  border: "1px solid var(--border)",
                                  borderRadius: 8,
                                  padding: "8px 12px",
                                }}
                              >
                                No registered pets found for this owner yet.
                                Switch to "New Pet" to add one.
                              </div>
                            ) : (
                              <select
                                value={p.existingId || ""}
                                onChange={(e) => {
                                  const sel = existingPatients.find(
                                    (ep) => ep.id === e.target.value,
                                  );
                                  updateExtraPet(idx, {
                                    existingId: sel?.id || null,
                                    species: sel?.species || "Dog",
                                  });
                                }}
                                style={{
                                  width: "100%",
                                  border: "1.5px solid var(--border)",
                                  borderRadius: 8,
                                  background: "#fff",
                                  fontSize: 13,
                                  fontWeight: 600,
                                  color: "var(--text)",
                                  outline: "none",
                                  padding: "8px 10px",
                                  fontFamily: "inherit",
                                  boxSizing: "border-box",
                                }}
                              >
                                <option value="">— Select a pet —</option>
                                {existingPatients.map((ep) => (
                                  <option key={ep.id} value={ep.id}>
                                    {ep.name}
                                    {ep.species ? ` (${ep.species})` : ""}
                                  </option>
                                ))}
                              </select>
                            )
                          ) : (
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr",
                                gap: 10,
                              }}
                            >
                              <div>
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
                                  value={p.patient}
                                  onChange={(e) =>
                                    updateExtraPet(idx, {
                                      patient: sanitizeName(e.target.value),
                                    })
                                  }
                                  placeholder="Pet name"
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
                              <div>
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
                                  Species
                                </div>
                                <CustomSelect
                                  value={p.species}
                                  onChange={(val) =>
                                    updateExtraPet(idx, {
                                      species: val,
                                      breed: "",
                                    })
                                  }
                                  options={["Dog", "Cat"]}
                                  placeholder="— Select Species —"
                                />
                              </div>
                              {p.mode === "new" && p.species && (
                                <div
                                  style={{ gridColumn: "1 / -1", marginTop: 4 }}
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
                                    value={p.breed}
                                    onChange={(val) =>
                                      updateExtraPet(idx, { breed: val })
                                    }
                                    options={
                                      p.species === "Cat"
                                        ? CAT_BREEDS
                                        : DOG_BREEDS
                                    }
                                    placeholder={`— Select ${p.species} Breed —`}
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr 1fr",
                            borderBottom: "1px solid #e2e8f0",
                          }}
                        >
                          <div
                            style={{
                              padding: "10px 16px",
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
                              Purpose
                            </div>
                            <CustomSelect
                              value={p.purpose}
                              onChange={(val) =>
                                updateExtraPet(idx, {
                                  purpose: val,
                                  vet: val === "Grooming" ? "" : p.vet,
                                })
                              }
                              options={[
                                "Checkup",
                                "Vaccination",
                                "Emergency",
                                "Grooming",
                                "Dental",
                                "Other",
                              ]}
                              placeholder="— Select Purpose —"
                            />
                          </div>
                          <div style={{ padding: "10px 16px" }}>
                            {p.purpose !== "Grooming" ? (
                              <>
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
                                  Assign Vet
                                </div>
                                <CustomSelect
                                  value={p.vet}
                                  onChange={(val) =>
                                    updateExtraPet(idx, { vet: val })
                                  }
                                  options={getAvailableVets()}
                                  placeholder="Unassigned"
                                />
                              </>
                            ) : (
                              <div
                                style={{
                                  fontSize: 11,
                                  color: "#9333ea",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 6,
                                  paddingTop: 4,
                                }}
                              >
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="#7c3aed"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                >
                                  <circle cx="6" cy="6" r="3" />
                                  <circle cx="6" cy="18" r="3" />
                                  <line x1="20" y1="4" x2="8.12" y2="15.88" />
                                  <line x1="14.47" y1="14.48" x2="20" y2="20" />
                                  <line x1="8.12" y1="8.12" x2="12" y2="12" />
                                </svg>
                                Handled by grooming team
                              </div>
                            )}
                          </div>
                        </div>

                        <div style={{ padding: "10px 16px" }}>
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
                            Notes for this pet
                          </div>
                          <textarea
                            value={p.notes}
                            onChange={(e) =>
                              updateExtraPet(idx, { notes: e.target.value })
                            }
                            placeholder="Notes for this pet..."
                            style={{
                              width: "100%",
                              border: "1px solid var(--border)",
                              borderRadius: 8,
                              background: "transparent",
                              fontSize: 13,
                              color: "var(--text)",
                              outline: "none",
                              resize: "vertical",
                              minHeight: 50,
                              fontFamily: "inherit",
                              lineHeight: 1.6,
                              boxSizing: "border-box",
                              padding: "8px 10px",
                            }}
                          />
                        </div>
                      </div>
                    ))}

                  {/* ── Section: Arrival (Automatic) ── */}
                  <div style={{ borderBottom: "1.5px solid #e2e8f0" }}>
                    <div
                      className="wk-section-label"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>Arrival Date &amp; Time</span>
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          color: "#16a34a",
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
                          strokeWidth="3"
                          strokeLinecap="round"
                        >
                          <rect x="3" y="11" width="18" height="11" rx="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                        Auto-recorded
                      </span>
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        padding: "12px 16px",
                        gap: 14,
                      }}
                    >
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
                            borderRadius: 9,
                            background: "#eff6ff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#1d4ed8"
                            strokeWidth="2"
                            strokeLinecap="round"
                          >
                            <rect x="3" y="4" width="18" height="18" rx="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                          </svg>
                        </div>
                        <div>
                          <div
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: "#94a3b8",
                              textTransform: "uppercase",
                              letterSpacing: "0.8px",
                            }}
                          >
                            Date
                          </div>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                              color: "var(--text)",
                            }}
                          >
                            {arrivalDisplay.date}
                          </div>
                        </div>
                      </div>
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
                            borderRadius: 9,
                            background: "#f0fdf4",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#16a34a"
                            strokeWidth="2"
                            strokeLinecap="round"
                          >
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                        </div>
                        <div>
                          <div
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: "#94a3b8",
                              textTransform: "uppercase",
                              letterSpacing: "0.8px",
                            }}
                          >
                            Time
                          </div>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                              color: "var(--text)",
                            }}
                          >
                            {arrivalDisplay.time}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── Section: Visit Details ── */}
                  <div style={{ borderBottom: "1.5px solid #e2e8f0" }}>
                    <div
                      className="wk-section-label"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>Visit Details</span>
                    </div>

                    {/* Locked service + price (chosen in Step 1) */}
                    <div
                      style={{
                        padding: "10px 16px",
                        borderBottom: "1px solid #e2e8f0",
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      {(() => {
                        const meta =
                          SERVICE_META[form.purpose] || SERVICE_META.Checkup;
                        return (
                          <>
                            <div
                              style={{
                                width: 44,
                                height: 44,
                                borderRadius: 10,
                                background: meta.bg,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                              }}
                            >
                              {meta.icon}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  color: "#94a3b8",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.8px",
                                }}
                              >
                                Service
                              </div>
                              <div
                                style={{
                                  fontSize: 14,
                                  fontWeight: 800,
                                  color: meta.color,
                                }}
                              >
                                {form.purpose}
                              </div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <div
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  color: "#94a3b8",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.8px",
                                }}
                              >
                                Price
                              </div>
                              <div
                                style={{
                                  fontSize: 14,
                                  fontWeight: 800,
                                  color: "#16a34a",
                                }}
                              >
                                {form.price !== ""
                                  ? `₱${Number(form.price).toLocaleString()}`
                                  : "—"}
                              </div>
                            </div>
                            {!editItem && (
                              <button
                                type="button"
                                onClick={() => setBookStep("service")}
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: "#6366f1",
                                  background: "#f5f3ff",
                                  border: "1px solid #c7d2fe",
                                  borderRadius: 8,
                                  padding: "6px 10px",
                                  cursor: "pointer",
                                  fontFamily: "inherit",
                                  flexShrink: 0,
                                }}
                              >
                                Change
                              </button>
                            )}
                          </>
                        );
                      })()}
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        borderBottom: "1px solid #e2e8f0",
                      }}
                    >
                      <div
                        style={{ padding: "10px 16px", gridColumn: "1 / -1" }}
                      >
                        {!isGrooming ? (
                          <>
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
                              Assign Vet
                            </div>
                            <CustomSelect
                              value={form.vet}
                              onChange={(val) => setForm({ ...form, vet: val })}
                              options={getAvailableVets()}
                              placeholder="Unassigned"
                            />
                            <p
                              style={{
                                margin: "6px 0 0",
                                fontSize: 10,
                                color: "var(--muted)",
                              }}
                            >
                              Showing vets available right now
                            </p>
                            {form.vet && vetSchedule[form.vet] && (
                              <p
                                style={{
                                  margin: "4px 0 0",
                                  fontSize: 10,
                                  color: "var(--muted)",
                                }}
                              >
                                Available days:{" "}
                                {vetSchedule[form.vet]
                                  .map((d) => DAY_NAMES[d])
                                  .join(", ")}
                              </p>
                            )}
                            {form.vet && vetTimeSchedule[form.vet] && (
                              <p
                                style={{
                                  margin: "2px 0 0",
                                  fontSize: 10,
                                  color: "var(--muted)",
                                }}
                              >
                                Available times:{" "}
                                {vetTimeSchedule[form.vet].join(", ")}
                              </p>
                            )}
                          </>
                        ) : (
                          <div style={{ paddingTop: 4 }}>
                            <div
                              style={{
                                background: "#f3e8ff",
                                border: "1px solid #d8b4fe",
                                borderRadius: 8,
                                padding: "8px 12px",
                                fontSize: 12,
                                color: "#6b21a8",
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                              }}
                            >
                              <svg
                                width="12"
                                height="12"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#7c3aed"
                                strokeWidth="2"
                                strokeLinecap="round"
                              >
                                <circle cx="6" cy="6" r="3" />
                                <circle cx="6" cy="18" r="3" />
                                <line x1="20" y1="4" x2="8.12" y2="15.88" />
                                <line x1="14.47" y1="14.48" x2="20" y2="20" />
                                <line x1="8.12" y1="8.12" x2="12" y2="12" />
                              </svg>
                              <strong>Grooming</strong> — handled by our{" "}
                              {MAX_GROOMERS} groomers.
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ padding: "10px 16px" }}>
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
                        Assign Room
                      </div>

                      <CustomSelect
                        value={form.room}
                        onChange={(val) =>
                          setForm((prev) => ({ ...prev, room: val }))
                        }
                        options={rooms
                          .filter(
                            (r) =>
                              r.status === "Available" ||
                              r.number === form.room,
                          )
                          .map((r) => ({
                            value: r.number,
                            label: `${r.number}${r.type ? ` · ${r.type}` : ""}`,
                          }))}
                        placeholder="No room assigned"
                      />
                    </div>

                    {/* Status row — edit only */}
                    {editItem && (
                      <div
                        style={{
                          padding: "10px 16px",
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
                          Status
                        </div>
                        <CustomSelect
                          value={form.status}
                          onChange={(val) => setForm({ ...form, status: val })}
                          options={["Waiting", "Attended", "Cancelled"]}
                          placeholder="— Select Status —"
                        />
                      </div>
                    )}
                  </div>

                  {/* ── Section: Notes ── */}
                  <div style={{ borderBottom: "1.5px solid #e2e8f0" }}>
                    <div className="wk-section-label">Notes / Remarks</div>
                    <div style={{ padding: "12px 16px", minHeight: 70 }}>
                      <textarea
                        value={form.notes}
                        onChange={(e) =>
                          setForm({ ...form, notes: e.target.value })
                        }
                        placeholder="Additional notes, symptoms, or special instructions..."
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

                  {/* Conflict alerts */}
                  {conflictType === "grooming" && (
                    <div
                      style={{
                        margin: "0 16px 16px",
                        background: "#fef3c7",
                        border: "1.5px solid #fcd34d",
                        borderRadius: 8,
                        padding: "12px 16px",
                        fontSize: 13,
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          fontWeight: 700,
                          color: "#92400e",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#92400e"
                          strokeWidth="2"
                          strokeLinecap="round"
                        >
                          <circle cx="6" cy="6" r="3" />
                          <circle cx="6" cy="18" r="3" />
                          <line x1="20" y1="4" x2="8.12" y2="15.88" />
                          <line x1="14.47" y1="14.48" x2="20" y2="20" />
                          <line x1="8.12" y1="8.12" x2="12" y2="12" />
                        </svg>
                        Grooming Fully Booked Right Now
                      </p>
                      <p style={{ margin: "4px 0 0", color: "#b45309" }}>
                        Both groomers ({MAX_GROOMERS}/{MAX_GROOMERS}) are
                        currently busy.
                      </p>
                    </div>
                  )}
                  {isGrooming && !conflictType && (
                    <div
                      style={{
                        margin: "0 16px 16px",
                        background: "#f0fdf4",
                        border: "1px solid #bbf7d0",
                        borderRadius: 8,
                        padding: "10px 14px",
                        fontSize: 12,
                        color: "#15803d",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#15803d"
                        strokeWidth="2"
                        strokeLinecap="round"
                      >
                        <circle cx="6" cy="6" r="3" />
                        <circle cx="6" cy="18" r="3" />
                        <line x1="20" y1="4" x2="8.12" y2="15.88" />
                        <line x1="14.47" y1="14.48" x2="20" y2="20" />
                        <line x1="8.12" y1="8.12" x2="12" y2="12" />
                      </svg>
                      <span>
                        <strong>
                          {MAX_GROOMERS - groomingUsed} of {MAX_GROOMERS}
                        </strong>{" "}
                        groomer slot
                        {MAX_GROOMERS - groomingUsed !== 1 ? "s" : ""}{" "}
                        available.
                      </span>
                    </div>
                  )}
                  {!editItem &&
                    extraPets.some((p) => p.purpose === "Grooming") &&
                    getGroomingUsedForExtra(-1) > MAX_GROOMERS && (
                      <div
                        style={{
                          margin: "0 16px 16px",
                          background: "#fef3c7",
                          border: "1.5px solid #fcd34d",
                          borderRadius: 8,
                          padding: "12px 16px",
                          fontSize: 13,
                        }}
                      >
                        <p
                          style={{
                            margin: 0,
                            fontWeight: 700,
                            color: "#92400e",
                          }}
                        >
                          One or more additional pets can't be booked for
                          grooming — only {MAX_GROOMERS} groomer slots exist
                          total.
                        </p>
                      </div>
                    )}

                  {!isFormValid() && !conflictType && (
                    <div
                      style={{
                        margin: "0 16px 16px",
                        background: "#fff7ed",
                        border: "1px solid #fed7aa",
                        borderRadius: 8,
                        padding: "10px 14px",
                        fontSize: 12,
                        color: "#9a3412",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#9a3412"
                        strokeWidth="2"
                        strokeLinecap="round"
                        style={{ flexShrink: 0 }}
                      >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      <span>
                        {!isMainPetValid()
                          ? form.mode === "existing"
                            ? "Please select an existing pet."
                            : "Please enter the patient (pet) name."
                          : !isOwnerValid()
                            ? ownerType === "registered"
                              ? "Please select a registered client."
                              : !form.owner.trim()
                                ? "Please enter the owner name."
                                : "Contact number must be 11 digits."
                            : "Please complete all required fields for each additional pet."}
                      </span>
                    </div>
                  )}

                  {/* Footer note */}
                  <div
                    style={{
                      padding: "8px 16px",
                      background: "var(--bg, #f8fafc)",
                      borderTop: "1px solid var(--border, #e2e8f0)",
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontSize: 10,
                        color: "#94a3b8",
                        textAlign: "right",
                        fontStyle: "italic",
                      }}
                    >
                      Walk-In Registration System
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Modal footer */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
                padding: "14px 24px",
                borderTop: "2px solid var(--border)",
                background: "var(--bg)",
                flexShrink: 0,
                flexWrap: "wrap",
              }}
            >
              <div>
                {!editItem && bookStep !== "service" && (
                  <button
                    className="btn btn-ghost"
                    style={S.btn}
                    onClick={() => setBookStep("service")}
                  >
                    ← Change Service
                  </button>
                )}
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  className="btn btn-ghost"
                  style={S.btn}
                  onClick={attemptCloseModal}
                >
                  Cancel
                </button>
                {(editItem || bookStep !== "service") && (
                  <button
                    className="btn btn-primary"
                    style={{
                      ...S.btn,
                      background: "#0f172a",
                      borderColor: "#0f172a",
                      opacity: !isFormValid() || saving ? 0.5 : 1,
                      cursor:
                        !isFormValid() || saving ? "not-allowed" : "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                    onClick={saveWalkin}
                    disabled={saving || !isFormValid()}
                  >
                    {saving ? (
                      "Saving..."
                    ) : (
                      <>
                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        {editItem
                          ? "Save Changes"
                          : extraPets.length > 0
                            ? `Register ${1 + extraPets.length} Walk-Ins`
                            : "Register Walk-In"}
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ══ Dialog Modal ══ */}
      {dialog.show && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99999,
            padding: 16,
          }}
        >
          <div
            style={{
              background: "var(--card)",
              borderRadius: 14,
              width: "100%",
              maxWidth: 380,
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "18px 22px 14px",
                borderBottom: "1px solid var(--border)",
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
                  background: dialog.type === "confirm" ? "#fef2f2" : "#eff6ff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {dialog.type === "confirm" ? (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#dc2626"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                ) : (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                )}
              </div>
              <h3
                style={{
                  margin: 0,
                  fontSize: 15,
                  fontWeight: 700,
                  color: "var(--text)",
                }}
              >
                {dialog.title}
              </h3>
            </div>
            <div style={{ padding: "16px 22px" }}>
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  color: "var(--muted)",
                  lineHeight: 1.6,
                }}
              >
                {dialog.message}
              </p>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                padding: "12px 22px",
                borderTop: "1px solid var(--border)",
                background: "var(--bg)",
              }}
            >
              {dialog.type === "confirm" ? (
                <>
                  <button
                    className="btn btn-ghost"
                    style={{ width: "auto" }}
                    onClick={() => setDialog((d) => ({ ...d, show: false }))}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-danger"
                    style={{ width: "auto" }}
                    onClick={() => {
                      dialog.onConfirm?.();
                      setDialog((d) => ({ ...d, show: false }));
                    }}
                  >
                    Confirm
                  </button>
                </>
              ) : (
                <button
                  className="btn btn-primary"
                  style={{
                    width: "auto",
                    background: "#0f172a",
                    borderColor: "#0f172a",
                  }}
                  onClick={() => setDialog((d) => ({ ...d, show: false }))}
                >
                  OK
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Walkin;
