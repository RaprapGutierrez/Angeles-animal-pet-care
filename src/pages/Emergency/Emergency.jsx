import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  memo,
} from "react";
import ReactDOM from "react-dom";
import Layout, { Modal } from "../../components/layout";
import { supabase } from "../../js/Utils/supabase";
import { useNavigate } from "react-router-dom";
import { useCurrentUser } from "../../js/hooks/Usecurrentuser";
import { logActivity } from "../../js/Utils/logActivity";
import { withBranchId } from "../../js/hooks/Usebranchfilter";
import "../../styles/Emergency.css";

const Skel = ({ w = "100%", h = 16 }) => (
  <span
    className="skel"
    style={{ width: w, height: h, borderRadius: 8, display: "block" }}
  />
);

// ── Sanitizers ──────────────────────────────────────────────────────────────
const sanitizeName = (v) => v.replace(/[^a-zA-Z\s'-]/g, "");
const sanitizeContact = (v) => v.replace(/\D/g, "").slice(0, 11);

// ── Custom dropdown (red-themed, matches Appointments.jsx pattern) ──────────
const CustomSelect = ({
  value,
  onChange,
  options,
  placeholder = "—",
  accent = "#dc2626",
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef(null);
  const ref = useRef(null);
  const selected = options.find((o) => (o.value ?? o) === value);
  const label = selected ? (selected.label ?? selected) : placeholder;

  useEffect(() => {
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
    if (disabled) return;
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const dropHeight = Math.min((options.length + 1) * 38, 240);
      const showAbove = spaceBelow < dropHeight + 10;
      let left = rect.left + window.scrollX;
      const maxLeft = window.scrollX + window.innerWidth - rect.width - 8;
      const minLeft = window.scrollX + 8;
      if (left > maxLeft) left = maxLeft;
      if (left < minLeft) left = minLeft;
      setDropPos({
        top: showAbove
          ? rect.top + window.scrollY - dropHeight - 6
          : rect.bottom + window.scrollY + 6,
        left,
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
            className="emg-select-dropdown"
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
              border: "1.5px solid #fecaca",
              maxHeight: 260,
              overflowY: "auto",
              padding: "5px",
            }}
          >
            {options.map((opt, i) => {
              const optVal = opt.value ?? opt;
              const optLabel = opt.label ?? opt;
              const isSelected = optVal === value;
              const isDisabled = !!opt.disabled;
              return (
                <div
                  key={i}
                  onClick={() => {
                    if (!isDisabled) {
                      onChange(optVal);
                      setOpen(false);
                    }
                  }}
                  style={{
                    padding: "8px 10px",
                    fontSize: 13,
                    fontWeight: isSelected ? 700 : 500,
                    color: isDisabled
                      ? "#cbd5e1"
                      : isSelected
                        ? accent
                        : "var(--text)",
                    cursor: isDisabled ? "not-allowed" : "pointer",
                    transition: "background 0.12s, color 0.12s",
                    background: isSelected ? `${accent}12` : "transparent",
                    borderRadius: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    opacity: isDisabled ? 0.5 : 1,
                    marginBottom: 1,
                  }}
                  className="emg-select-option"
                  onMouseEnter={(e) => {
                    if (!isSelected && !isDisabled)
                      e.currentTarget.classList.add("hover");
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.classList.remove("hover");
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
                        border: `1.5px solid ${isSelected ? accent : isDisabled ? "#e2e8f0" : "#fca5a5"}`,
                        transition: "background 0.15s, border-color 0.15s",
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
          padding: "9px 34px 9px 12px",
          border: "1.5px solid",
          borderRadius: 9,
          background: disabled
            ? "#f8fafc"
            : open
              ? "linear-gradient(135deg, #ffffff 0%, #fef2f2 100%)"
              : "linear-gradient(to bottom, #ffffff 0%, #fefefe 100%)",
          fontSize: 13,
          fontWeight: 600,
          color: disabled ? "#cbd5e1" : value ? "var(--text)" : "#b0bac9",
          cursor: disabled ? "not-allowed" : "pointer",
          userSelect: "none",
          boxSizing: "border-box",
          boxShadow: open
            ? `0 0 0 3px ${accent}22, 0 2px 8px rgba(0,0,0,0.08)`
            : "0 1px 3px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)",
          borderColor: open ? accent : "#fecaca",
          transition: "border-color 0.18s, box-shadow 0.18s, background 0.18s",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          position: "relative",
          minHeight: 38,
        }}
        onMouseEnter={(e) => {
          if (!open && !disabled) {
            e.currentTarget.style.borderColor = "#fca5a5";
            e.currentTarget.style.boxShadow =
              "0 2px 8px rgba(220,38,38,0.10), inset 0 1px 0 rgba(255,255,255,0.9)";
          }
        }}
        onMouseLeave={(e) => {
          if (!open && !disabled) {
            e.currentTarget.style.borderColor = "#fecaca";
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
            background: open ? accent : "#fef2f2",
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
            stroke={open ? "#fff" : "#dc2626"}
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

// ─── Constants ────────────────────────────────────────────────────────────────
const EMERGENCY_TYPES = [
  "Hit by Vehicle / Trauma",
  "Difficulty Breathing / Respiratory Distress",
  "Seizure / Convulsion",
  "Severe Bleeding / Open Wound",
  "Unconscious / Unresponsive",
  "Suspected Poisoning / Toxic Ingestion",
  "Broken Bone / Fracture",
  "Severe Vomiting / Diarrhea",
  "Eye / Ear Injury",
  "Allergic Reaction / Anaphylaxis",
  "Birthing Emergency / Dystocia",
  "Heatstroke / Hyperthermia",
  "Animal Bite / Fight Wound",
  "Choking / Airway Obstruction",
  "Cardiac Arrest / No Pulse",
  "Bloat / GDV (Gastric Dilatation)",
  "Urinary Blockage",
  "Paralysis / Cannot Walk",
  "Severe Lethargy / Collapse",
  "Suspected Fracture / Limping",
  "Other",
];

const BRANCHES = ["Main", "Mabalacat 2", "Tarlac", "San Fernando", "Angeles"];
// availability is fetched inside EmergencyForm

// Maps any historical/legacy branch string variant to the current canonical name
// so old alerts (saved before branch names were standardized) still match.
const BRANCH_ALIASES = {
  main: "Main",
  "main branch": "Main",
  mabalacat: "Mabalacat 2",
  "mabalacat branch": "Mabalacat 2",
  "mabalacat 2": "Mabalacat 2",
  mabalacat2: "Mabalacat 2",
  tarlac: "Tarlac",
  "tarlac city": "Tarlac",
  "tarlac branch": "Tarlac",
  "san fernando": "San Fernando",
  "san fernando branch": "San Fernando",
  angeles: "Angeles",
  "angeles city": "Angeles",
  "angeles branch": "Angeles",
  magalang: "Magalang",
  "magalang branch": "Magalang",
};
const normalizeBranchName = (b) =>
  BRANCH_ALIASES[
    String(b || "")
      .toLowerCase()
      .trim()
  ] || b;
const CITIES_BY_PROVINCE = {
  // ── NCR ──
  "Metro Manila": [
    "Manila",
    "Quezon City",
    "Caloocan",
    "Las Piñas",
    "Makati",
    "Malabon",
    "Mandaluyong",
    "Marikina",
    "Muntinlupa",
    "Navotas",
    "Parañaque",
    "Pasay",
    "Pasig",
    "Pateros",
    "San Juan",
    "Taguig",
    "Valenzuela",
  ],
  // ── Region I – Ilocos Region ──
  "Ilocos Norte": ["Laoag City", "Batac City", "Pagudpud", "Vintar", "Bangui"],
  "Ilocos Sur": [
    "Vigan City",
    "Candon City",
    "Narvacan",
    "Santa Maria",
    "Cabugao",
  ],
  "La Union": ["San Fernando City", "Bauang", "Agoo", "Naguilian", "Bacnotan"],
  Pangasinan: [
    "Dagupan City",
    "San Carlos City",
    "Urdaneta City",
    "Alaminos City",
    "Lingayen",
    "Binmaley",
  ],
  // ── Region II – Cagayan Valley ──
  Batanes: ["Basco", "Itbayat", "Ivana", "Mahatao", "Sabtang", "Uyugan"],
  Cagayan: ["Tuguegarao City", "Aparri", "Gonzaga", "Sanchez-Mira", "Solana"],
  Isabela: ["Ilagan City", "Cauayan City", "Santiago City", "Roxas", "Alicia"],
  "Nueva Vizcaya": ["Bayombong", "Solano", "Bambang", "Bagabag"],
  Quirino: ["Cabarroguis", "Diffun", "Maddela"],
  // ── Region III – Central Luzon ──
  Aurora: ["Baler", "Casiguran", "Dilasag", "Maria Aurora"],
  Bataan: ["Balanga City", "Mariveles", "Orani", "Dinalupihan", "Samal"],
  Bulacan: [
    "Malolos City",
    "Meycauayan City",
    "San Jose del Monte City",
    "Baliuag",
    "Marilao",
    "Bocaue",
  ],
  "Nueva Ecija": [
    "Cabanatuan City",
    "Gapan City",
    "Palayan City",
    "San Jose City",
    "Muñoz City",
  ],
  Pampanga: [
    "Angeles City",
    "San Fernando City",
    "Mabalacat City",
    "Magalang",
    "Apalit",
    "Guagua",
  ],
  Tarlac: ["Tarlac City", "Capas", "Concepcion", "Paniqui", "Camiling"],
  Zambales: ["Olongapo City", "Iba", "Subic", "Botolan", "Castillejos"],
  // ── Region IV-A – CALABARZON ──
  Batangas: [
    "Batangas City",
    "Lipa City",
    "Tanauan City",
    "Santo Tomas",
    "Bauan",
    "Nasugbu",
  ],
  Cavite: [
    "Bacoor City",
    "Dasmariñas City",
    "Imus City",
    "Cavite City",
    "Tagaytay City",
    "General Trias City",
  ],
  Laguna: [
    "Calamba City",
    "Santa Rosa City",
    "San Pablo City",
    "Biñan City",
    "Cabuyao City",
    "Los Baños",
  ],
  Quezon: ["Lucena City", "Tayabas City", "Candelaria", "Sariaya", "Lucban"],
  Rizal: [
    "Antipolo City",
    "Cainta",
    "Taytay",
    "Angono",
    "Binangonan",
    "Rodriguez",
  ],
  // ── Region IV-B – MIMAROPA ──
  Marinduque: ["Boac", "Gasan", "Mogpog", "Santa Cruz"],
  "Occidental Mindoro": ["Mamburao", "San Jose", "Sablayan"],
  "Oriental Mindoro": ["Calapan City", "Puerto Galera", "Pinamalayan", "Roxas"],
  Palawan: [
    "Puerto Princesa City",
    "Coron",
    "El Nido",
    "Narra",
    "Brooke's Point",
  ],
  Romblon: ["Romblon", "Odiongan", "San Fernando"],
  // ── Region V – Bicol Region ──
  Albay: ["Legazpi City", "Tabaco City", "Ligao City", "Daraga"],
  "Camarines Norte": ["Daet", "Labo", "Jose Panganiban"],
  "Camarines Sur": ["Naga City", "Iriga City", "Pili", "Calabanga"],
  Catanduanes: ["Virac", "San Andres", "Bato"],
  Masbate: ["Masbate City", "Aroroy", "Mobo"],
  Sorsogon: ["Sorsogon City", "Bulan", "Gubat"],
  // ── Region VI – Western Visayas ──
  Aklan: ["Kalibo", "Boracay (Malay)", "Ibajay"],
  Antique: ["San Jose de Buenavista", "Sibalom", "Culasi"],
  Capiz: ["Roxas City", "Panay", "Pontevedra"],
  Guimaras: ["Jordan", "Buenavista", "Nueva Valencia"],
  Iloilo: ["Iloilo City", "Passi City", "Oton", "Pavia", "Santa Barbara"],
  "Negros Occidental": [
    "Bacolod City",
    "Bago City",
    "Silay City",
    "Talisay City",
    "Kabankalan City",
  ],
  // ── Region VII – Central Visayas ──
  Bohol: ["Tagbilaran City", "Panglao", "Tubigon", "Ubay"],
  Cebu: [
    "Cebu City",
    "Mandaue City",
    "Lapu-Lapu City",
    "Talisay City",
    "Toledo City",
    "Danao City",
  ],
  "Negros Oriental": [
    "Dumaguete City",
    "Bais City",
    "Bayawan City",
    "Tanjay City",
  ],
  Siquijor: ["Siquijor", "Larena", "Lazi"],
  // ── Region VIII – Eastern Visayas ──
  Biliran: ["Naval", "Caibiran", "Kawayan"],
  "Eastern Samar": ["Borongan City", "Guiuan", "Oras"],
  Leyte: ["Tacloban City", "Ormoc City", "Baybay City", "Palo"],
  "Northern Samar": ["Catarman", "Laoang", "Allen"],
  Samar: ["Catbalogan City", "Calbayog City", "Basey"],
  "Southern Leyte": ["Maasin City", "Sogod", "Liloan"],
  // ── Region IX – Zamboanga Peninsula ──
  "Zamboanga del Norte": ["Dipolog City", "Dapitan City", "Polanco"],
  "Zamboanga del Sur": ["Pagadian City", "Molave", "Aurora"],
  "Zamboanga Sibugay": ["Ipil", "Kabasalan", "Titay"],
  // ── Region X – Northern Mindanao ──
  Bukidnon: ["Malaybalay City", "Valencia City", "Manolo Fortich"],
  Camiguin: ["Mambajao", "Catarman", "Sagay"],
  "Lanao del Norte": ["Iligan City", "Tubod", "Kapatagan"],
  "Misamis Occidental": ["Oroquieta City", "Ozamiz City", "Tangub City"],
  "Misamis Oriental": [
    "Cagayan de Oro City",
    "Gingoog City",
    "El Salvador City",
  ],
  // ── Region XI – Davao Region ──
  "Davao de Oro": ["Nabunturan", "Monkayo", "Pantukan"],
  "Davao del Norte": ["Tagum City", "Panabo City", "Samal City"],
  "Davao del Sur": ["Digos City", "Bansalan", "Santa Cruz"],
  "Davao Occidental": ["Malita", "Santa Maria", "Jose Abad Santos"],
  "Davao Oriental": ["Mati City", "Baganga", "Caraga"],
  "Davao City": ["Davao City"],
  // ── Region XII – SOCCSKSARGEN ──
  Cotabato: ["Kidapawan City", "Midsayap", "Kabacan"],
  Sarangani: ["Alabel", "Malapatan", "Glan"],
  "South Cotabato": ["General Santos City", "Koronadal City", "Polomolok"],
  "Sultan Kudarat": ["Tacurong City", "Isulan", "Lambayong"],
  // ── Region XIII – Caraga ──
  "Agusan del Norte": ["Butuan City", "Cabadbaran City", "Buenavista"],
  "Agusan del Sur": ["Bayugan City", "Prosperidad", "San Francisco"],
  "Dinagat Islands": ["San Jose", "Basilisa", "Cagdianao"],
  "Surigao del Norte": ["Surigao City", "Del Carmen", "Dapa"],
  "Surigao del Sur": ["Tandag City", "Bislig City", "Lianga"],
  // ── CAR – Cordillera Administrative Region ──
  Abra: ["Bangued", "Boliney", "La Paz"],
  Apayao: ["Kabugao", "Luna", "Conner"],
  Benguet: ["Baguio City", "La Trinidad", "Itogon"],
  Ifugao: ["Lagawe", "Banaue", "Kiangan"],
  Kalinga: ["Tabuk City", "Rizal", "Pinukpuk"],
  "Mountain Province": ["Bontoc", "Sagada", "Besao"],
  // ── BARMM ──
  Basilan: ["Isabela City", "Lamitan City", "Maluso"],
  "Lanao del Sur": ["Marawi City", "Malabang", "Wao"],
  "Maguindanao del Norte": ["Datu Odin Sinsuat", "Parang", "Barira"],
  "Maguindanao del Sur": ["Buluan", "Datu Piang", "Sultan Kudarat"],
  Sulu: ["Jolo", "Patikul", "Indanan"],
  "Tawi-Tawi": ["Bongao", "Panglima Sugala", "Simunul"],
};
const PROVINCES = Object.keys(CITIES_BY_PROVINCE).sort();

// ── Flat city list + reverse lookup, so City can be picked first ──
const CITY_TO_PROVINCE = {};
Object.entries(CITIES_BY_PROVINCE).forEach(([prov, cities]) => {
  cities.forEach((c) => {
    CITY_TO_PROVINCE[c] = prov;
  });
});
const ALL_CITIES = Object.keys(CITY_TO_PROVINCE).sort();

// ── Barangay lists for the cities your branches actually serve ──
const BARANGAYS_BY_CITY = {
  "Angeles City": [
    "Agapito del Rosario",
    "Amsic",
    "Anunas",
    "Balibago",
    "Capaya",
    "Claro M. Recto",
    "Cuayan",
    "Cutcut",
    "Cutud",
    "Lourdes North West",
    "Lourdes Sur",
    "Lourdes Sur East",
    "Malabañas",
    "Margot",
    "Mining",
    "Ninoy Aquino (Marisol)",
    "Pampang",
    "Pandan",
    "Pulungbulu",
    "Pulung Cacutud",
    "Pulung Maragul",
    "Salapungan",
    "San Jose",
    "San Nicolas",
    "Santa Teresita",
    "Santa Trinidad",
    "Santo Cristo",
    "Santo Domingo",
    "Santo Rosario",
    "Sapalibutad",
    "Sapangbato",
    "Tabun",
    "Virgen Delos Remedios",
  ],
  "San Fernando City": [
    "Alasas",
    "Baliti",
    "Bulaon",
    "Calulut",
    "Del Carmen",
    "Del Pilar",
    "Del Rosario",
    "Dela Paz Norte",
    "Dela Paz Sur",
    "Dolores",
    "Juliana",
    "Lara",
    "Lourdes",
    "Magliman",
    "Maimpis",
    "Malino",
    "Malpitic",
    "Pandaras",
    "Panipuan",
    "Pulung Bulu",
    "Quebiauan",
    "Saguin",
    "San Agustin",
    "San Felipe",
    "San Isidro",
    "San Jose",
    "San Juan",
    "San Nicolas",
    "San Pedro",
    "Santa Lucia",
    "Santa Teresita",
    "Santo Niño",
    "Santo Rosario (Poblacion)",
    "Sindalan",
    "Telabastagan",
  ],
  "Mabalacat City": [
    "Atlu-Bola",
    "Bical",
    "Bundagul",
    "Cacutud",
    "Calumpang",
    "Camachiles",
    "Dapdap",
    "Dau",
    "Dolores",
    "Duquit",
    "Lakandula",
    "Mabiga",
    "Macapagal Village",
    "Mamatitang",
    "Mangalit",
    "Marcos Village",
    "Mawaque",
    "Paralayunan",
    "Poblacion",
    "San Francisco",
    "San Joaquin",
    "Santa Ines",
    "Santa Maria",
    "Santo Rosario",
    "Sapang Balen",
    "Sapang Biabas",
    "Tabun",
  ],
  "Tarlac City": [
    "Aguso",
    "Alvindia",
    "Amucao",
    "Armenia",
    "Asturias",
    "Atioc",
    "Balanti",
    "Balete",
    "Balibago I",
    "Balibago II",
    "Balingcanaway",
    "Banaba",
    "Bantog",
    "Baras-baras",
    "Batang-batang",
    "Binauganan",
    "Bora",
    "Buenavista",
    "Buhilit",
    "Burot",
    "Calingcuan",
    "Capehan",
    "Carangian",
    "Care",
    "Central",
    "Culipat",
    "Cut-cut I",
    "Cut-cut II",
    "Dalayap",
    "Dela Paz",
    "Dolores",
    "Laoang",
    "Ligtasan",
    "Lourdes",
    "Mabini",
    "Maligaya",
    "Maliwalo",
    "Mapalacsiao",
    "Mapalad",
    "Matatalaib",
    "Paraiso",
    "Poblacion",
    "Salapungan",
    "San Carlos",
    "San Francisco",
    "San Isidro",
    "San Jose",
    "San Jose de Urquico",
    "San Juan Bautista",
    "San Juan de Mata",
    "San Luis",
    "San Manuel",
    "San Miguel",
    "San Nicolas",
    "San Pablo",
    "San Pascual",
    "San Rafael",
    "San Roque",
    "San Sebastian",
    "San Vicente",
    "Santa Cruz",
    "Santa Maria",
    "Santo Cristo",
    "Santo Domingo",
    "Santo Niño",
    "Sapang Maragul",
    "Sapang Tagalog",
    "Sepung Calzada",
    "Sinait",
    "Suizo",
    "Tariji",
    "Tibag",
    "Tibagan",
    "Trinidad",
    "Ungot",
    "Villa Bacolor",
  ],
};

// Barangay names repeat across cities (e.g. "San Jose", "Dolores"), so options are
// keyed as "Barangay||City" to stay unique; the composite is split back apart on select.
const BARANGAY_CITY_OPTIONS = Object.entries(BARANGAYS_BY_CITY)
  .flatMap(([city, brgys]) =>
    brgys.map((b) => ({ value: `${b}||${city}`, label: `${b} — ${city}` })),
  )
  .sort((a, b) => a.label.localeCompare(b.label));

// ── Branch locations (lat/lng) ──
const BRANCH_COORDS = {
  Main: { lat: 15.1449, lng: 120.5887 },
  "Mabalacat 2": { lat: 15.2225, lng: 120.5735 },
  Tarlac: { lat: 15.4755, lng: 120.596 },
  "San Fernando": { lat: 15.0349, lng: 120.6842 },
  Angeles: { lat: 15.1449, lng: 120.5887 },
};

// ── City-level coords for the local service area (more accurate); everything
// else falls back to a province centroid, which is enough to catch far provinces ──
const CITY_COORDS = {
  "Angeles City": { lat: 15.1449, lng: 120.5887 },
  "San Fernando City": { lat: 15.0349, lng: 120.6842 },
  "Mabalacat City": { lat: 15.2225, lng: 120.5735 },
  Magalang: { lat: 15.2114, lng: 120.6572 },
  Apalit: { lat: 14.9578, lng: 120.7614 },
  Guagua: { lat: 14.9803, lng: 120.6333 },
  "Tarlac City": { lat: 15.4755, lng: 120.596 },
  Capas: { lat: 15.3167, lng: 120.5833 },
  Concepcion: { lat: 15.2667, lng: 120.6333 },
  Paniqui: { lat: 15.6667, lng: 120.5833 },
  Camiling: { lat: 15.6833, lng: 120.4167 },
};

// ── Province centroids (approximate) — used as a fallback for cities we
// don't have exact coords for, so far-off provinces are still caught ──
const PROVINCE_COORDS = {
  "Metro Manila": { lat: 14.5995, lng: 120.9842 },
  "Ilocos Norte": { lat: 18.1647, lng: 120.7116 },
  "Ilocos Sur": { lat: 17.5747, lng: 120.3869 },
  "La Union": { lat: 16.6159, lng: 120.321 },
  Pangasinan: { lat: 15.8949, lng: 120.2863 },
  Batanes: { lat: 20.4487, lng: 121.9702 },
  Cagayan: { lat: 17.6132, lng: 121.727 },
  Isabela: { lat: 16.9754, lng: 121.8107 },
  "Nueva Vizcaya": { lat: 16.3301, lng: 121.171 },
  Quirino: { lat: 16.2333, lng: 121.5667 },
  Aurora: { lat: 15.7333, lng: 121.5667 },
  Bataan: { lat: 14.6417, lng: 120.4818 },
  Bulacan: { lat: 14.7943, lng: 120.8794 },
  "Nueva Ecija": { lat: 15.5784, lng: 120.97 },
  Pampanga: { lat: 15.0794, lng: 120.62 },
  Tarlac: { lat: 15.4755, lng: 120.596 },
  Zambales: { lat: 15.5082, lng: 120.0691 },
  Batangas: { lat: 13.7565, lng: 121.0583 },
  Cavite: { lat: 14.2456, lng: 120.8786 },
  Laguna: { lat: 14.1699, lng: 121.2439 },
  Quezon: { lat: 13.9314, lng: 121.931 },
  Rizal: { lat: 14.6255, lng: 121.3086 },
  Marinduque: { lat: 13.4771, lng: 121.9032 },
  "Occidental Mindoro": { lat: 13.1024, lng: 120.7651 },
  "Oriental Mindoro": { lat: 13.0565, lng: 121.4069 },
  Palawan: { lat: 9.8349, lng: 118.7384 },
  Romblon: { lat: 12.5778, lng: 122.2695 },
  Albay: { lat: 13.1391, lng: 123.7437 },
  "Camarines Norte": { lat: 14.1389, lng: 122.7632 },
  "Camarines Sur": { lat: 13.6252, lng: 123.1829 },
  Catanduanes: { lat: 13.7089, lng: 124.2422 },
  Masbate: { lat: 12.3686, lng: 123.6151 },
  Sorsogon: { lat: 12.9743, lng: 124.0067 },
  Aklan: { lat: 11.8166, lng: 122.0942 },
  Antique: { lat: 10.9995, lng: 122.0995 },
  Capiz: { lat: 11.3889, lng: 122.6277 },
  Guimaras: { lat: 10.5928, lng: 122.6325 },
  Iloilo: { lat: 10.7202, lng: 122.5621 },
  "Negros Occidental": { lat: 10.6713, lng: 122.9511 },
  Bohol: { lat: 9.85, lng: 124.1435 },
  Cebu: { lat: 10.3157, lng: 123.8854 },
  "Negros Oriental": { lat: 9.3103, lng: 123.304 },
  Siquijor: { lat: 9.2168, lng: 123.5155 },
  Biliran: { lat: 11.5836, lng: 124.4649 },
  "Eastern Samar": { lat: 11.6112, lng: 125.4966 },
  Leyte: { lat: 11.2543, lng: 124.953 },
  "Northern Samar": { lat: 12.4644, lng: 124.6262 },
  Samar: { lat: 11.7761, lng: 124.9611 },
  "Southern Leyte": { lat: 10.383, lng: 125.081 },
  "Zamboanga del Norte": { lat: 8.1527, lng: 123.2577 },
  "Zamboanga del Sur": { lat: 7.8383, lng: 123.4362 },
  "Zamboanga Sibugay": { lat: 7.5222, lng: 122.834 },
  Bukidnon: { lat: 8.0515, lng: 125.0985 },
  Camiguin: { lat: 9.1735, lng: 124.73 },
  "Lanao del Norte": { lat: 8.1156, lng: 123.9377 },
  "Misamis Occidental": { lat: 8.5083, lng: 123.7833 },
  "Misamis Oriental": { lat: 8.5046, lng: 124.622 },
  "Davao de Oro": { lat: 7.5, lng: 126.05 },
  "Davao del Norte": { lat: 7.4479, lng: 125.8258 },
  "Davao del Sur": { lat: 6.7656, lng: 125.3284 },
  "Davao Occidental": { lat: 6.2, lng: 125.6167 },
  "Davao Oriental": { lat: 7.3172, lng: 126.542 },
  "Davao City": { lat: 7.1907, lng: 125.4553 },
  Cotabato: { lat: 7.2231, lng: 124.2452 },
  Sarangani: { lat: 5.95, lng: 125.2 },
  "South Cotabato": { lat: 6.335, lng: 124.8514 },
  "Sultan Kudarat": { lat: 6.5069, lng: 124.4238 },
  "Agusan del Norte": { lat: 8.9456, lng: 125.5319 },
  "Agusan del Sur": { lat: 8.3667, lng: 125.9333 },
  "Dinagat Islands": { lat: 10.1281, lng: 125.6086 },
  "Surigao del Norte": { lat: 9.7897, lng: 125.4966 },
  "Surigao del Sur": { lat: 8.75, lng: 126.15 },
  Abra: { lat: 17.5951, lng: 120.7983 },
  Apayao: { lat: 18.0177, lng: 121.171 },
  Benguet: { lat: 16.4023, lng: 120.596 },
  Ifugao: { lat: 16.83, lng: 121.171 },
  Kalinga: { lat: 17.4766, lng: 121.3557 },
  "Mountain Province": { lat: 17.0417, lng: 121.1084 },
  Basilan: { lat: 6.4297, lng: 121.9689 },
  "Lanao del Sur": { lat: 7.975, lng: 124.2367 },
  "Maguindanao del Norte": { lat: 7.0, lng: 124.4167 },
  "Maguindanao del Sur": { lat: 6.9, lng: 124.45 },
  Sulu: { lat: 6.05, lng: 121.0 },
  "Tawi-Tawi": { lat: 5.1339, lng: 119.9556 },
};

const MAX_BRANCH_DISTANCE_KM = 30;

const getLocationCoords = (province, city) =>
  CITY_COORDS[city] || PROVINCE_COORDS[province] || null;

const haversineKm = (a, b) => {
  if (!a || !b) return null;
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat),
    lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(h));
};

// Returns the distance in km, or null if we can't determine it (never blocks in that case)
const distanceToBranchKm = (branch, province, city) => {
  const branchCoords = BRANCH_COORDS[branch];
  const locCoords = getLocationCoords(province, city);
  if (!branchCoords || !locCoords) return null;
  return haversineKm(branchCoords, locCoords);
};

const isLocationTooFar = (branch, province, city) => {
  const dist = distanceToBranchKm(branch, province, city);
  return dist !== null && dist > MAX_BRANCH_DISTANCE_KM;
};
const OTHER_LOCATION = "__other__";
const OTHER_TYPE = "Other";
const STATUS_COLORS = {
  pending: { bg: "rgba(253,224,71,0.15)", border: "#fde047", text: "#fbbf24" },
  responding: {
    bg: "rgba(147,197,253,0.15)",
    border: "#93c5fd",
    text: "#60a5fa",
  },
  resolved: {
    bg: "rgba(134,239,172,0.15)",
    border: "#86efac",
    text: "#4ade80",
  },
};

// ─── Success Toast (stacked) ───────────────────────────────────────────────────
const ToastItem = ({ show, guestMode, variant = "submitted", onClose }) => {
  return (
    <div
      style={{
        width: 340,
        pointerEvents: "auto",
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
          background: "#22c55e",
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
            background: "#f0fdf4",
            color: "#16a34a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginTop: 1,
          }}
        >
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
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ marginBottom: 5 }}>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "#166534",
                background: "#dcfce7",
                borderRadius: 4,
                padding: "2px 7px",
              }}
            >
              {variant === "responding" ? "Update" : "Success"}
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
            {variant === "responding"
              ? "🚨 Help is on the way!"
              : guestMode
                ? "Emergency report submitted!"
                : "Emergency alert sent!"}
          </p>
          <p
            style={{
              margin: "3px 0 0",
              fontSize: 12,
              color: "var(--muted)",
              lineHeight: 1.4,
            }}
          >
            {variant === "responding"
              ? "Our team is now responding to your emergency. Please stay calm and keep your phone line open."
              : guestMode
                ? "Our team has been notified and will respond shortly."
                : "Staff and branches have been notified."}
          </p>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "var(--muted)",
            fontSize: 16,
            cursor: "pointer",
            lineHeight: 1,
            padding: "2px 4px",
            flexShrink: 0,
            pointerEvents: "all",
          }}
        >
          ✕
        </button>
      </div>
      <div style={{ height: 2, background: "#22c55e22" }}>
        <div
          style={{
            height: "100%",
            background: "#22c55e",
            opacity: 0.6,
            width: show ? "0%" : "100%",
            transition: show ? "width 3s linear" : "none",
          }}
        />
      </div>
    </div>
  );
};

const ToastStack = ({ toasts, onClose }) => {
  const visible = toasts.slice(-3);
  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 999999,
        display: "flex",
        flexDirection: "column-reverse",
        gap: 10,
        pointerEvents: "none",
      }}
    >
      {visible.map((t) => (
        <ToastItem
          key={t.id}
          show={t.show}
          guestMode={t.guestMode}
          variant={t.variant}
          onClose={() => onClose(t.id)}
        />
      ))}
    </div>
  );
};

// ─── Guest Banner ─────────────────────────────────────────────────────────────
const GuestBanner = ({ onExit }) => (
  <div
    style={{
      background: "linear-gradient(135deg, #dc2626, #b91c1c)",
      color: "#fff",
      padding: "10px 28px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      fontSize: 13,
      fontWeight: 600,
      fontFamily: "inherit",
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <img
          src="/icon/emergency_2.png"
          alt=""
          style={{ width: 15, height: 15, filter: "brightness(0) invert(1)" }}
        />
      </div>
      <span>
        Emergency Guest Access — Limited session. Your report will be sent to
        staff immediately.
      </span>
    </div>
    <button
      onClick={onExit}
      style={{
        background: "rgba(255,255,255,0.2)",
        border: "1px solid rgba(255,255,255,0.4)",
        color: "#fff",
        borderRadius: 6,
        padding: "4px 12px",
        fontSize: 12,
        fontWeight: 700,
        cursor: "pointer",
        fontFamily: "inherit",
        whiteSpace: "nowrap",
      }}
    >
      ✕ Exit
    </button>
  </div>
);

// ─── Alert Card ───────────────────────────────────────────────────────────────
const AlertCard = ({ a, showActions = false, onUpdateStatus }) => {
  const status = a.status || "pending";
  const col = STATUS_COLORS[status] || STATUS_COLORS.pending;
  const [actionLock, setActionLock] = useState(false);

  const handleAction = (id, nextStatus) => {
    if (actionLock) return;
    setActionLock(true);
    onUpdateStatus(id, nextStatus);
  };

  return (
    <div
      style={{
        background: col.bg,
        border: `1px solid ${col.border}`,
        borderRadius: 10,
        padding: "14px 16px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#dc2626",
              flexShrink: 0,
              marginTop: 1,
            }}
          />
          <strong style={{ fontSize: 13, color: "#dc2626", lineHeight: 1.3 }}>
            {a.type}
          </strong>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexShrink: 0,
            marginLeft: 8,
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: col.text,
              background: "var(--card)",
              border: `1px solid ${col.border}`,
              borderRadius: 99,
              padding: "3px 9px",
              textTransform: "capitalize",
              letterSpacing: "0.3px",
            }}
          >
            {status === "pending"
              ? "Pending"
              : status === "responding"
                ? "Responding"
                : "Resolved"}
          </span>
          <span
            style={{
              fontSize: 11,
              color: "var(--muted)",
              whiteSpace: "nowrap",
            }}
          >
            {new Date(a.created_at).toLocaleString("en", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          marginBottom: 8,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontSize: 10,
            color: "#94a3b8",
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
            stroke="#94a3b8"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          Reported:{" "}
          {new Date(a.created_at).toLocaleString("en", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
        {a.updated_at && a.status !== "pending" && (
          <span style={{ fontSize: 10, color: "#94a3b8" }}>
            · Last updated:{" "}
            {new Date(a.updated_at).toLocaleString("en", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
      </div>

      {a.description && (
        <p
          style={{
            fontSize: 12,
            color: "var(--muted)",
            margin: "0 0 8px",
            lineHeight: 1.5,
          }}
        >
          {a.description}
        </p>
      )}

      {(a.guest_contact || a.guest_address) && !a.guest_full_name && (
        <p style={{ fontSize: 11, color: "var(--muted)", margin: "0 0 8px" }}>
          {a.guest_contact ? (
            <span>
              Contact:{" "}
              <span style={{ fontWeight: 600, color: "var(--text)" }}>
                {a.guest_contact}
              </span>
            </span>
          ) : (
            ""
          )}
          {a.guest_contact && a.guest_address ? " · " : ""}
          {a.guest_address ? (
            <span>
              Location:{" "}
              <span style={{ fontWeight: 600, color: "var(--text)" }}>
                {a.guest_address}
              </span>
            </span>
          ) : (
            ""
          )}
        </p>
      )}

      {a.guest_full_name && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            marginBottom: 4,
          }}
        >
          <p style={{ fontSize: 11, color: "var(--muted)", margin: 0 }}>
            <span style={{ fontWeight: 600, color: "var(--text)" }}>
              {a.guest_full_name}
            </span>
            {a.guest_contact ? <span> · {a.guest_contact}</span> : ""}
            {a.guest_address ? <span> · {a.guest_address}</span> : ""}
          </p>
        </div>
      )}
      {a.patient_name && (
        <p style={{ fontSize: 11, color: "var(--muted)", margin: "0 0 4px" }}>
          Patient:{" "}
          <span style={{ fontWeight: 600, color: "var(--text)" }}>
            {a.patient_name}
          </span>
        </p>
      )}

      <p
        style={{
          fontSize: 11,
          color: "var(--muted)",
          margin: 0,
          borderTop: `1px solid var(--border)`,
          paddingTop: 8,
          marginTop: 6,
        }}
      >
        Branch: <strong style={{ color: "var(--text)" }}>{a.branch}</strong> ·
        Sent by: <strong style={{ color: "var(--text)" }}>{a.sent_by}</strong>
      </p>

      {showActions && status !== "resolved" && (
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          {status === "pending" && (
            <button
              onClick={() => handleAction(a.id, "responding")}
              disabled={actionLock}
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: "6px 14px",
                borderRadius: 6,
                cursor: actionLock ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                display: "flex",
                alignItems: "center",
                gap: 5,
                background: actionLock ? "#e2e8f0" : "#dbeafe",
                color: actionLock ? "#94a3b8" : "#1d4ed8",
                border: `1px solid ${actionLock ? "#cbd5e1" : "#93c5fd"}`,
                opacity: actionLock ? 0.7 : 1,
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: actionLock ? "#94a3b8" : "#1d4ed8",
                  display: "inline-block",
                }}
              />
              {actionLock ? "Updating..." : "Mark Responding"}
            </button>
          )}
          <button
            onClick={() => handleAction(a.id, "resolved")}
            disabled={actionLock}
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: "6px 14px",
              borderRadius: 6,
              cursor: actionLock ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              gap: 5,
              background: actionLock ? "#e2e8f0" : "#dcfce7",
              color: actionLock ? "#94a3b8" : "#166534",
              border: `1px solid ${actionLock ? "#cbd5e1" : "#86efac"}`,
              opacity: actionLock ? 0.7 : 1,
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
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {actionLock ? "Updating..." : "Mark Resolved"}
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Emergency Form ───────────────────────────────────────────────────────────
const EmergencyForm = memo(
  ({ guestMode, sending, onSend, onExit, userBranch }) => {
    const [branchAvailability, setBranchAvailability] = useState({});

    useEffect(() => {
      supabase
        .from("branch_availability")
        .select("branch, available")
        .then(({ data }) => {
          if (data) {
            const map = {};
            data.forEach((r) => {
              map[r.branch] = r.available;
            });
            setBranchAvailability(map);
          }
        });
    }, []);

    const [form, setForm] = useState({
      type: "",
      customType: "",
      contact_number: "",
      location_province: "",
      location_city: "",
      location_barangay: "",
      location_street: "",
      branch: userBranch || "",
      guest_full_name: "",
      guest_contact: "",
      guest_province: "",
      guest_city: "",
      guest_barangay: "",
      guest_street: "",
      patient_name: "",
    });
    const [errors, setErrors] = useState({});

    const set = (key, val) => {
      setForm((f) => ({ ...f, [key]: val }));
      setErrors((e) => ({ ...e, [key]: "" }));
    };

    const validate = () => {
      const errs = {};
      if (!form.branch) errs.branch = "Please select a branch.";
      else if (branchAvailability[form.branch] === false)
        errs.branch =
          "This branch is currently unavailable. Please select another branch.";
      if (!form.type) errs.type = "Please select the emergency type.";
      else if (form.type === OTHER_TYPE && !form.customType.trim())
        errs.type = "Please describe the emergency.";
      if (guestMode) {
        if (!form.guest_full_name.trim())
          errs.guest_full_name = "Full name is required.";
        if (!form.guest_contact.trim())
          errs.guest_contact = "Contact number is required.";
        if (!form.guest_barangay)
          errs.guest_address = "Please select a barangay.";
        else if (!form.guest_province)
          errs.guest_address = "Please select a province.";
        else if (!form.guest_city) errs.guest_address = "Please select a city.";
        else if (
          form.branch &&
          isLocationTooFar(form.branch, form.guest_province, form.guest_city)
        ) {
          const d = Math.round(
            distanceToBranchKm(
              form.branch,
              form.guest_province,
              form.guest_city,
            ),
          );
          errs.guest_address = `${form.guest_city} is about ${d}km from ${form.branch}, which is too far for this branch to respond. Please choose a closer branch or a nearer address.`;
        }
        if (!form.patient_name.trim())
          errs.patient_name = "Patient (pet) name is required.";
      } else {
        if (!form.contact_number.trim())
          errs.contact_number = "Contact number is required.";
        if (!form.location_barangay)
          errs.location = "Please select a barangay.";
        else if (!form.location_province)
          errs.location = "Please select a province.";
        else if (!form.location_city) errs.location = "Please select a city.";
        else if (
          form.branch &&
          isLocationTooFar(
            form.branch,
            form.location_province,
            form.location_city,
          )
        ) {
          const d = Math.round(
            distanceToBranchKm(
              form.branch,
              form.location_province,
              form.location_city,
            ),
          );
          errs.location = `${form.location_city} is about ${d}km from ${form.branch}, which is too far for this branch to respond. Please choose a closer branch or a nearer location.`;
        }
      }
      return errs;
    };

    const distanceOk = guestMode
      ? !isLocationTooFar(form.branch, form.guest_province, form.guest_city)
      : !isLocationTooFar(
          form.branch,
          form.location_province,
          form.location_city,
        );

    const canSend = !!(
      form.branch &&
      form.type &&
      (form.type !== OTHER_TYPE || form.customType.trim()) &&
      (guestMode
        ? form.guest_full_name.trim() &&
          form.guest_contact.trim() &&
          form.guest_barangay &&
          form.guest_province &&
          form.guest_city &&
          form.patient_name.trim()
        : form.contact_number.trim() &&
          form.location_barangay &&
          form.location_province &&
          form.location_city) &&
      distanceOk
    );

    const handleSend = useCallback(async () => {
      const errs = validate();
      if (Object.keys(errs).length) {
        setErrors(errs);
        return;
      }
      const finalForm = {
        ...form,
        type: form.type === OTHER_TYPE ? form.customType.trim() : form.type,
        location: [
          form.location_street.trim(),
          form.location_barangay,
          form.location_city,
          form.location_province,
        ]
          .filter(Boolean)
          .join(", "),
        guest_address: [
          form.guest_street.trim(),
          form.guest_barangay,
          form.guest_city,
          form.guest_province,
        ]
          .filter(Boolean)
          .join(", "),
      };
      const result = await onSend(finalForm);
      if (result?.success) {
        setForm({
          type: "",
          customType: "",
          contact_number: "",
          location_province: "",
          location_city: "",
          location_barangay: "",
          location_street: "",
          branch: userBranch || "",
          guest_full_name: "",
          guest_contact: "",
          guest_province: "",
          guest_city: "",
          guest_barangay: "",
          guest_street: "",
          patient_name: "",
        });
        setErrors({});
      }
    }, [form, onSend]);

    const inp = (hasErr) => ({
      width: "100%",
      padding: "9px 12px",
      boxSizing: "border-box",
      border: `1.5px solid ${hasErr ? "#f87171" : "var(--border)"}`,
      borderRadius: 8,
      fontSize: 13,
      fontFamily: "inherit",
      background: "var(--card)",
      color: "var(--text)",
      outline: "none",
      minHeight: 38,
    });
    const errStyle = { fontSize: 11, color: "#dc2626", marginTop: 3 };
    const labelStyle = {
      fontSize: 13,
      fontWeight: 600,
      color: "var(--text)",
      display: "block",
      marginBottom: 5,
    };

    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
        <div
          style={{
            background: "var(--card)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border)",
            padding: 24,
            boxShadow: "var(--shadow)",
            flex: 1,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <h3
            style={{
              fontSize: 15,
              fontWeight: 700,
              marginBottom: 4,
              color: "#dc2626",
              display: "flex",
              alignItems: "center",
              gap: 7,
            }}
          >
            <svg
              width="15"
              height="15"
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
            {guestMode ? "Report an Emergency" : "Send Emergency Alert"}
          </h3>
          {guestMode && (
            <p
              style={{
                fontSize: 12,
                color: "var(--muted)",
                marginBottom: 16,
                marginTop: 0,
              }}
            >
              No account needed. Fill in your details and we'll respond
              immediately.
            </p>
          )}
          <hr
            style={{
              border: "none",
              borderTop: "1px solid var(--border)",
              marginBottom: 20,
            }}
          />

          {guestMode && (
            <>
              {/* Row 1: Full Name + Contact */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                  marginBottom: 14,
                }}
              >
                <div>
                  <label style={labelStyle}>
                    Your Full Name <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Juan dela Cruz"
                    value={form.guest_full_name}
                    onChange={(e) =>
                      set("guest_full_name", sanitizeName(e.target.value))
                    }
                    style={inp(errors.guest_full_name)}
                  />
                  {errors.guest_full_name && (
                    <p style={errStyle}>{errors.guest_full_name}</p>
                  )}
                </div>
                <div>
                  <label style={labelStyle}>
                    Contact Number <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={11}
                    placeholder="e.g. 09XXXXXXXXX"
                    value={form.guest_contact}
                    onChange={(e) =>
                      set("guest_contact", sanitizeContact(e.target.value))
                    }
                    style={inp(errors.guest_contact)}
                  />
                  {form.guest_contact && form.guest_contact.length !== 11 && (
                    <p style={errStyle}>Contact number must be 11 digits.</p>
                  )}
                  {errors.guest_contact && (
                    <p style={errStyle}>{errors.guest_contact}</p>
                  )}
                </div>
              </div>
              {/* Row 2: Address + Patient Name */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                  marginBottom: 14,
                }}
              >
                <div>
                  <label style={labelStyle}>
                    Your Address <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 8,
                      marginBottom: 8,
                    }}
                  >
                    <div>
                      <label
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: "var(--muted)",
                          marginBottom: 4,
                          display: "block",
                        }}
                      >
                        Province
                      </label>
                      <CustomSelect
                        value={form.guest_province}
                        onChange={(val) => {
                          set("guest_province", val);
                          if (CITY_TO_PROVINCE[form.guest_city] !== val) {
                            set("guest_city", "");
                            set("guest_barangay", "");
                          }
                        }}
                        options={PROVINCES.map((p) => ({ value: p, label: p }))}
                        placeholder="— Province —"
                        accent="#dc2626"
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: "var(--muted)",
                          marginBottom: 4,
                          display: "block",
                        }}
                      >
                        City
                      </label>
                      <CustomSelect
                        value={form.guest_city}
                        onChange={(val) => {
                          set("guest_city", val);
                          set("guest_province", CITY_TO_PROVINCE[val] || "");
                          if (
                            !BARANGAYS_BY_CITY[val]?.includes(
                              form.guest_barangay,
                            )
                          )
                            set("guest_barangay", "");
                        }}
                        options={(form.guest_province
                          ? [
                              ...(CITIES_BY_PROVINCE[form.guest_province] ||
                                []),
                            ].sort()
                          : ALL_CITIES
                        ).map((c) => ({ value: c, label: c }))}
                        placeholder="— City —"
                        accent="#dc2626"
                        disabled={!form.guest_province}
                      />
                    </div>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <label
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: "var(--muted)",
                        marginBottom: 4,
                        display: "block",
                      }}
                    >
                      Barangay
                    </label>
                    <CustomSelect
                      value={
                        form.guest_city
                          ? form.guest_barangay
                          : form.guest_barangay
                            ? `${form.guest_barangay}||${form.guest_city}`
                            : ""
                      }
                      onChange={(val) => {
                        if (form.guest_city) {
                          set("guest_barangay", val);
                        } else {
                          const [brgy, city] = val.split("||");
                          set("guest_barangay", brgy);
                          set("guest_city", city);
                          set("guest_province", CITY_TO_PROVINCE[city] || "");
                        }
                      }}
                      options={
                        form.guest_city
                          ? (BARANGAYS_BY_CITY[form.guest_city] || []).map(
                              (b) => ({ value: b, label: b }),
                            )
                          : BARANGAY_CITY_OPTIONS
                      }
                      placeholder="— Barangay —"
                      accent="#dc2626"
                      disabled={!form.guest_city}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: "var(--muted)",
                        marginBottom: 4,
                        display: "block",
                      }}
                    >
                      Street
                    </label>
                    <input
                      type="text"
                      placeholder="House No. / Street / Subdivision (optional)"
                      value={form.guest_street}
                      onChange={(e) => set("guest_street", e.target.value)}
                      style={inp(errors.guest_address)}
                      disabled={!form.guest_barangay}
                    />
                  </div>
                  {errors.guest_address && (
                    <p style={errStyle}>{errors.guest_address}</p>
                  )}
                </div>
                <div>
                  <label style={labelStyle}>
                    Patient Name (Pet){" "}
                    <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Brownie"
                    value={form.patient_name}
                    onChange={(e) =>
                      set("patient_name", sanitizeName(e.target.value))
                    }
                    style={inp(errors.patient_name)}
                  />
                  {errors.patient_name && (
                    <p style={errStyle}>{errors.patient_name}</p>
                  )}
                </div>
              </div>
              <hr
                style={{
                  border: "none",
                  borderTop: "1px solid var(--border)",
                  marginBottom: 16,
                }}
              />
            </>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: 12,
              marginBottom: 14,
            }}
          >
            <div>
              <label style={labelStyle}>Emergency Type</label>
              <CustomSelect
                value={form.type}
                onChange={(val) => set("type", val)}
                placeholder="— Select Type —"
                accent="#dc2626"
                options={EMERGENCY_TYPES.map((t) => ({
                  value: t,
                  label: t === OTHER_TYPE ? "Other (describe emergency)" : t,
                }))}
              />
              {form.type === OTHER_TYPE && (
                <input
                  type="text"
                  placeholder="Briefly describe the emergency"
                  value={form.customType}
                  onChange={(e) => set("customType", e.target.value)}
                  style={{ ...inp(errors.type), marginTop: 8 }}
                />
              )}
              {errors.type && <p style={errStyle}>{errors.type}</p>}
            </div>
            <div>
              <label style={labelStyle}>Nearest Branch</label>
              <CustomSelect
                value={form.branch}
                onChange={(val) => set("branch", val)}
                placeholder="— Select Branch —"
                accent="#dc2626"
                options={BRANCHES.map((b) => {
                  const isAvailable = branchAvailability[b] !== false;
                  return {
                    value: b,
                    label: isAvailable ? b : `${b} — Unavailable`,
                    disabled: !isAvailable,
                  };
                })}
              />
              {branchAvailability[form.branch] === false && (
                <p
                  style={{
                    fontSize: 11,
                    color: "#dc2626",
                    marginTop: 4,
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
                    stroke="#dc2626"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  This branch is currently unavailable. Please select another.
                </p>
              )}
              {errors.branch && branchAvailability[form.branch] !== false && (
                <p style={errStyle}>{errors.branch}</p>
              )}
            </div>
          </div>

          {!guestMode && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr",
                gap: 12,
                marginBottom: 14,
              }}
            >
              <div>
                <label style={{ ...labelStyle, whiteSpace: "nowrap" }}>
                  Contact Number <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={11}
                  placeholder="e.g. 09XXXXXXXXX"
                  value={form.contact_number}
                  onChange={(e) =>
                    set("contact_number", sanitizeContact(e.target.value))
                  }
                  style={inp(errors.contact_number)}
                />
                {form.contact_number && form.contact_number.length !== 11 && (
                  <p style={errStyle}>Contact number must be 11 digits.</p>
                )}
                {errors.contact_number && (
                  <p style={errStyle}>{errors.contact_number}</p>
                )}
              </div>
              <div>
                <label style={{ ...labelStyle, whiteSpace: "nowrap" }}>
                  Location of Emergency{" "}
                  <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  <div>
                    <label
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: "var(--muted)",
                        marginBottom: 4,
                        display: "block",
                      }}
                    >
                      Province
                    </label>
                    <CustomSelect
                      value={form.location_province}
                      onChange={(val) => {
                        set("location_province", val);
                        if (CITY_TO_PROVINCE[form.location_city] !== val) {
                          set("location_city", "");
                          set("location_barangay", "");
                        }
                      }}
                      options={PROVINCES.map((p) => ({ value: p, label: p }))}
                      placeholder="— Province —"
                      accent="#dc2626"
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: "var(--muted)",
                        marginBottom: 4,
                        display: "block",
                      }}
                    >
                      City
                    </label>
                    <CustomSelect
                      value={form.location_city}
                      onChange={(val) => {
                        set("location_city", val);
                        set("location_province", CITY_TO_PROVINCE[val] || "");
                        if (
                          !BARANGAYS_BY_CITY[val]?.includes(
                            form.location_barangay,
                          )
                        )
                          set("location_barangay", "");
                      }}
                      options={(form.location_province
                        ? [
                            ...(CITIES_BY_PROVINCE[form.location_province] ||
                              []),
                          ].sort()
                        : ALL_CITIES
                      ).map((c) => ({ value: c, label: c }))}
                      placeholder="— City —"
                      accent="#dc2626"
                      disabled={!form.location_province}
                    />
                  </div>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--muted)",
                      marginBottom: 4,
                      display: "block",
                    }}
                  >
                    Barangay
                  </label>
                  <CustomSelect
                    value={
                      form.location_city
                        ? form.location_barangay
                        : form.location_barangay
                          ? `${form.location_barangay}||${form.location_city}`
                          : ""
                    }
                    onChange={(val) => {
                      if (form.location_city) {
                        set("location_barangay", val);
                      } else {
                        const [brgy, city] = val.split("||");
                        set("location_barangay", brgy);
                        set("location_city", city);
                        set("location_province", CITY_TO_PROVINCE[city] || "");
                      }
                    }}
                    options={
                      form.location_city
                        ? (BARANGAYS_BY_CITY[form.location_city] || []).map(
                            (b) => ({ value: b, label: b }),
                          )
                        : BARANGAY_CITY_OPTIONS
                    }
                    placeholder="— Barangay —"
                    accent="#dc2626"
                    disabled={!form.location_city}
                  />
                </div>
                <div>
                  <label
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--muted)",
                      marginBottom: 4,
                      display: "block",
                    }}
                  >
                    Street
                  </label>
                  <input
                    type="text"
                    placeholder="Street / Barangay / Subdivision"
                    value={form.location_street}
                    onChange={(e) => set("location_street", e.target.value)}
                    style={inp(errors.location)}
                    disabled={!form.location_barangay}
                  />
                </div>
                {errors.location && <p style={errStyle}>{errors.location}</p>}
              </div>
            </div>
          )}
        </div>

        <div style={{ maxWidth: 320, margin: "16px auto 0" }}>
          <button
            className="send-alert-btn"
            onClick={handleSend}
            disabled={sending || !canSend}
            style={{
              width: "100%",
              padding: "13px",
              background: sending || !canSend ? "#94a3b8" : "#dc2626",
              color: "#fff",
              border: "none",
              borderRadius: 9,
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: "0.3px",
              cursor: sending || !canSend ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {sending ? (
              <>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
                Sending...
              </>
            ) : (
              <>
                <img
                  src="/icon/emergency_2.png"
                  alt=""
                  style={{
                    width: 15,
                    height: 15,
                    filter: "brightness(0) invert(1)",
                  }}
                />
                Send Emergency Alert
              </>
            )}
          </button>
          {!distanceOk && form.branch && (
            <div
              style={{
                marginTop: 10,
                padding: "8px 14px",
                background: "#fee2e2",
                border: "1px solid #fecaca",
                borderRadius: 8,
                fontSize: 12,
                color: "#991b1b",
                display: "flex",
                alignItems: "flex-start",
                gap: 6,
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#991b1b"
                strokeWidth="2.5"
                strokeLinecap="round"
                style={{ flexShrink: 0, marginTop: 1 }}
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span>
                {guestMode
                  ? `Cannot send: ${form.guest_city} is about ${Math.round(distanceToBranchKm(form.branch, form.guest_province, form.guest_city))}km from ${form.branch}, which is too far for this branch to respond.`
                  : `Cannot send: ${form.location_city} is about ${Math.round(distanceToBranchKm(form.branch, form.location_province, form.location_city))}km from ${form.branch}, which is too far for this branch to respond.`}
              </span>
            </div>
          )}

          {guestMode && (
            <button
              onClick={onExit}
              style={{
                width: "100%",
                marginTop: 10,
                padding: "10px",
                background: "transparent",
                color: "#64748b",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              ← Back to Login
            </button>
          )}
        </div>
      </div>
    );
  },
);
// ─── Admin View ───────────────────────────────────────────────────────────────
const AdminView = ({
  alerts,
  loading,
  onRefresh,
  onUpdateStatus,
  userBranch,
  branchAvailable,
  onToggleAvailability,
}) => {
  const visibleAlerts = userBranch
    ? alerts.filter(
        (a) =>
          normalizeBranchName(a.branch) === normalizeBranchName(userBranch),
      )
    : alerts;
  const pending = visibleAlerts.filter((a) =>
    ["pending", "responding"].includes(a.status || "pending"),
  );
  const resolved = visibleAlerts.filter(
    (a) => (a.status || "pending") === "resolved",
  );
  const responding = visibleAlerts.filter(
    (a) => (a.status || "pending") === "responding",
  );
  const historyAlerts = alerts.filter(
    (a) =>
      ["responding", "resolved"].includes(a.status || "pending") &&
      normalizeBranchName(a.branch) === normalizeBranchName(userBranch),
  );

  const printSummaryReport = () => {
    const w = window.open("", "PRINT", "height=800,width=650");
    if (!w) return;
    const typeCounts = {};
    visibleAlerts.forEach((a) => {
      typeCounts[a.type] = (typeCounts[a.type] || 0) + 1;
    });
    const topTypes = Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const branchCounts = {};
    alerts.forEach((a) => {
      const b = normalizeBranchName(a.branch) || "Unknown";
      branchCounts[b] = (branchCounts[b] || 0) + 1;
    });
    const branchRows = Object.entries(branchCounts).sort((a, b) => b[1] - a[1]);
    const statusRows = [
      [
        "Pending",
        visibleAlerts.filter((a) => (a.status || "pending") === "pending")
          .length,
      ],
      ["Responding", responding.length],
      ["Resolved", resolved.length],
    ];
    const rowsHtml = (rows) =>
      rows
        .map(
          ([k, v]) =>
            `<tr><td style="padding:4px 8px;">${k}</td><td style="padding:4px 8px;text-align:right;">${v}</td></tr>`,
        )
        .join("");
    w.document.write(`<html><head><title>Emergency Summary Report</title><style>
      body{font-family:Arial,sans-serif;padding:24px;color:#111;}
      h1{font-size:18px;margin-bottom:2px;} p.sub{color:#666;font-size:12px;margin-top:0;}
      h2{font-size:14px;margin:20px 0 6px;border-bottom:1px solid #ccc;padding-bottom:4px;}
      table{width:100%;border-collapse:collapse;font-size:13px;}
      tr:nth-child(even){background:#f5f5f5;}
    </style></head><body>
      <h1>Angeles Animal Care Hospital — Emergency Summary Report</h1>
      <p class="sub">Generated: ${new Date().toLocaleString("en-PH")}</p>
      <h2>Top Emergency Types</h2><table>${rowsHtml(topTypes)}</table>
      <h2>Alerts by Branch</h2><table>${rowsHtml(branchRows)}</table>
      <h2>Resolution Status</h2><table>${rowsHtml(statusRows)}</table>
    </body></html>`);
    w.document.close();
    w.focus();
    w.print();
    w.close();
  };

  const [historyStatusFilter, setHistoryStatusFilter] = useState("");
  const [historyTypeFilter, setHistoryTypeFilter] = useState("");
  const historyTypeOptions = [...new Set(historyAlerts.map((a) => a.type))]
    .filter(Boolean)
    .sort();
  const filteredHistoryAlerts = historyAlerts.filter(
    (a) =>
      (!historyStatusFilter || a.status === historyStatusFilter) &&
      (!historyTypeFilter || a.type === historyTypeFilter),
  );

  return (
    <div className="emg-page">
      <div className="emergency-topbar emg-topbar-pos emg-topbar-card">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img
            src="/icon/emergency_2.png"
            alt=""
            className="emg-topbar-icon"
            style={{
              width: 22,
              height: 22,
              filter:
                "brightness(0) saturate(100%) invert(17%) sepia(82%) saturate(1200%) hue-rotate(210deg)",
            }}
          />{" "}
          <div>
            <h1
              style={{
                fontSize: 20,
                fontWeight: 800,
                color: "var(--text)",
                margin: 0,
              }}
            >
              Emergency Notifications
            </h1>
            <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>
              Monitor and manage incoming emergency alerts
            </p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={onToggleAvailability}
            style={{
              fontSize: 12,
              fontWeight: 700,
              padding: "7px 14px",
              borderRadius: 8,
              border: `1.5px solid ${branchAvailable ? "#86efac" : "#fca5a5"}`,
              background: branchAvailable ? "#f0fdf4" : "#fef2f2",
              color: branchAvailable ? "#16a34a" : "#dc2626",
              cursor: "pointer",
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: branchAvailable ? "#16a34a" : "#dc2626",
                display: "inline-block",
              }}
            />
            {branchAvailable ? "Branch Available" : "Branch Unavailable"}
          </button>
          <button
            onClick={onRefresh}
            style={{
              fontSize: 12,
              fontWeight: 700,
              padding: "7px 14px",
              borderRadius: 8,
              border: "1.5px solid var(--border)",
              background: "var(--card)",
              cursor: "pointer",
              fontFamily: "inherit",
              color: "var(--text)",
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
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M23 4v6h-6" />
              <path d="M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      <div className="emg-content">
        <div
          style={{
            borderRadius: 14,
            marginBottom: 24,
            overflow: "hidden",
            width: "100%",
          }}
        >
          <img
            src="/image/emergency_alert_system.png"
            alt="Emergency Alert System"
            style={{
              width: "100%",
              height: "auto",
              display: "block",
              borderRadius: 14,
            }}
          />
        </div>

        {/* ── Stats ── */}
        <div
          className="emg-stats-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(80px, 1fr))",
            gap: 10,
            marginBottom: 24,
          }}
        >
          {[
            {
              label: "Total Alerts",
              value: visibleAlerts.length,
              color: "#6366f1",
              bg: "#eef2ff",
              border: "#c7d2fe",
            },
            {
              label: "Pending",
              value: pending.length,
              color: "#dc2626",
              bg: "#fef2f2",
              border: "#fecaca",
            },
            {
              label: "Responding",
              value: responding.length,
              color: "#1d4ed8",
              bg: "#dbeafe",
              border: "#93c5fd",
            },
            {
              label: "Resolved",
              value: resolved.length,
              color: "#16a34a",
              bg: "#f0fdf4",
              border: "#86efac",
            },
          ].map((s, i) => (
            <div
              key={s.label}
              className="fade-in"
              style={{
                background: s.bg,
                border: `1px solid ${s.border}`,
                borderRadius: 12,
                padding: "18px 20px",
                position: "relative",
                overflow: "hidden",
                animationDelay: `${i * 0.1}s`,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: 3,
                  height: "100%",
                  background: s.color,
                  borderRadius: "12px 0 0 12px",
                }}
              />
              <div
                style={{
                  fontSize: 30,
                  fontWeight: 800,
                  color: s.color,
                  lineHeight: 1,
                  marginBottom: 4,
                }}
              >
                {s.value}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: s.color,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.4px",
                  opacity: 0.8,
                  wordBreak: "keep-all",
                  overflowWrap: "normal",
                }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* ── Summary Report Card ── */}
        <div
          className="emg-panel"
          style={{
            background: "var(--card)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border)",
            padding: 24,
            boxShadow: "var(--shadow)",
            marginBottom: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <h3
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: "var(--text)",
                margin: 0,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              Summary Report
            </h3>
            <button
              onClick={printSummaryReport}
              style={{
                fontSize: 12,
                fontWeight: 700,
                padding: "7px 14px",
                borderRadius: 8,
                border: "1.5px solid var(--border)",
                background: "var(--card)",
                cursor: "pointer",
                fontFamily: "inherit",
                color: "var(--text)",
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
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              Print
            </button>
          </div>
          <hr
            style={{
              border: "none",
              borderTop: "1px solid var(--border)",
              marginBottom: 16,
            }}
          />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 20,
            }}
          >
            <div>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  margin: "0 0 10px",
                }}
              >
                Top Emergency Types
              </p>
              {(() => {
                const counts = {};
                visibleAlerts.forEach((a) => {
                  counts[a.type] = (counts[a.type] || 0) + 1;
                });
                const top = Object.entries(counts)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5);
                if (top.length === 0)
                  return (
                    <p style={{ fontSize: 12, color: "var(--muted)" }}>
                      No data yet
                    </p>
                  );
                const max = top[0][1];
                return top.map(([type, count]) => (
                  <div key={type} style={{ marginBottom: 8 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 12,
                        color: "var(--text)",
                        marginBottom: 3,
                      }}
                    >
                      <span
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          maxWidth: 160,
                        }}
                      >
                        {type}
                      </span>
                      <strong>{count}</strong>
                    </div>
                    <div
                      style={{
                        background: "#fee2e2",
                        borderRadius: 99,
                        height: 6,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          background: "#dc2626",
                          borderRadius: 99,
                          width: `${(count / max) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ));
              })()}
            </div>
            <div>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  margin: "0 0 10px",
                }}
              >
                Alerts by Branch
              </p>
              {(() => {
                const counts = {};
                alerts.forEach((a) => {
                  const b = normalizeBranchName(a.branch) || "Unknown";
                  counts[b] = (counts[b] || 0) + 1;
                });
                const rows = Object.entries(counts).sort((a, b) => b[1] - a[1]);
                if (rows.length === 0)
                  return (
                    <p style={{ fontSize: 12, color: "var(--muted)" }}>
                      No data yet
                    </p>
                  );
                const max = rows[0][1];
                return rows.map(([branch, count]) => (
                  <div key={branch} style={{ marginBottom: 8 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 12,
                        color: "var(--text)",
                        marginBottom: 3,
                      }}
                    >
                      <span>{branch}</span>
                      <strong>{count}</strong>
                    </div>
                    <div
                      style={{
                        background: "#e0e7ff",
                        borderRadius: 99,
                        height: 6,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          background: "#6366f1",
                          borderRadius: 99,
                          width: `${(count / max) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ));
              })()}
            </div>
            <div>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  margin: "0 0 10px",
                }}
              >
                Resolution Status
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  {
                    label: "Pending",
                    value: visibleAlerts.filter(
                      (a) => (a.status || "pending") === "pending",
                    ).length,
                    color: "#dc2626",
                  },
                  {
                    label: "Responding",
                    value: responding.length,
                    color: "#1d4ed8",
                  },
                  {
                    label: "Resolved",
                    value: resolved.length,
                    color: "#16a34a",
                  },
                ].map((row) => (
                  <div
                    key={row.label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      fontSize: 12,
                    }}
                  >
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        color: "var(--text)",
                      }}
                    >
                      <span
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: "50%",
                          background: row.color,
                          display: "inline-block",
                        }}
                      />
                      {row.label}
                    </span>
                    <strong style={{ color: row.color }}>{row.value}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div
          className="emg-panels-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 16,
            marginBottom: 24,
          }}
        >
          {/* ── Pending panel ── */}
          <div
            className="emg-panel"
            style={{
              background: "var(--card)",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--border)",
              padding: 24,
              boxShadow: "var(--shadow)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <h3
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: "#dc2626",
                  margin: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <img
                  src="/icon/warning.png"
                  alt=""
                  style={{
                    width: 16,
                    height: 16,
                    filter:
                      "brightness(0) saturate(100%) invert(20%) sepia(80%) saturate(2000%) hue-rotate(350deg)",
                    flexShrink: 0,
                  }}
                />
                Pending Alerts
                {pending.length > 0 && (
                  <span
                    style={{
                      marginLeft: 8,
                      background: "#dc2626",
                      color: "#fff",
                      borderRadius: 20,
                      fontSize: 11,
                      padding: "1px 8px",
                      fontWeight: 800,
                    }}
                  >
                    {pending.length}
                  </span>
                )}
              </h3>
            </div>
            <hr
              style={{
                border: "none",
                borderTop: "1px solid var(--border)",
                marginBottom: 16,
              }}
            />
            {loading ? (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    style={{
                      background: "#fef9c3",
                      border: "1px solid #fde047",
                      borderRadius: 10,
                      padding: "12px 16px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 8,
                      }}
                    >
                      <Skel w="40%" h={13} />
                      <Skel w="20%" h={13} />
                    </div>
                    <Skel w="90%" h={12} style={{ marginBottom: 6 }} />
                    <Skel w="60%" h={11} />
                  </div>
                ))}
              </div>
            ) : pending.length === 0 ? (
              <div style={{ textAlign: "center", padding: "30px 0" }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    background: "#f0fdf4",
                    border: "1.5px solid #86efac",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 10px",
                  }}
                >
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#16a34a"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <p
                  style={{
                    color: "var(--muted)",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  All clear — no pending alerts
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  maxHeight: 420,
                  overflowY: "auto",
                }}
              >
                {pending.map((a) => (
                  <AlertCard
                    key={a.id + a.status}
                    a={a}
                    showActions={true}
                    onUpdateStatus={onUpdateStatus}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── History panel ── */}
          <div
            className="emg-panel"
            style={{
              background: "var(--card)",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--border)",
              padding: 24,
              boxShadow: "var(--shadow)",
            }}
          >
            <h3
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: "var(--royal)",
                margin: "0 0 12px",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              Alert History ({filteredHistoryAlerts.length}
              {filteredHistoryAlerts.length !== historyAlerts.length
                ? ` of ${historyAlerts.length}`
                : ""}
              )
            </h3>
            <div
              style={{
                display: "flex",
                gap: 8,
                marginBottom: 12,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <div style={{ width: 160 }}>
                <CustomSelect
                  value={historyStatusFilter}
                  onChange={setHistoryStatusFilter}
                  placeholder="All Statuses"
                  accent="#dc2626"
                  options={[
                    { value: "responding", label: "Responding" },
                    { value: "resolved", label: "Resolved" },
                  ]}
                />
              </div>
              <div style={{ width: 200 }}>
                <CustomSelect
                  value={historyTypeFilter}
                  onChange={setHistoryTypeFilter}
                  placeholder="All Types"
                  accent="#dc2626"
                  options={historyTypeOptions.map((t) => ({
                    value: t,
                    label: t,
                  }))}
                />
              </div>
              {(historyStatusFilter || historyTypeFilter) && (
                <button
                  onClick={() => {
                    setHistoryStatusFilter("");
                    setHistoryTypeFilter("");
                  }}
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
                    flexShrink: 0,
                  }}
                >
                  ✕ Clear filters
                </button>
              )}
            </div>
            <hr
              style={{
                border: "none",
                borderTop: "1px solid var(--border)",
                marginBottom: 16,
              }}
            />
            {loading ? (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    style={{
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: 10,
                      padding: "12px 16px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 8,
                      }}
                    >
                      <Skel w="35%" h={13} />
                      <Skel w="18%" h={13} />
                    </div>
                    <Skel w="85%" h={12} style={{ marginBottom: 6 }} />
                    <Skel w="55%" h={11} />
                  </div>
                ))}
              </div>
            ) : filteredHistoryAlerts.length === 0 ? (
              <p
                style={{
                  color: "var(--muted)",
                  fontSize: 13,
                  textAlign: "center",
                  padding: 20,
                }}
              >
                {historyAlerts.length === 0
                  ? "No alerts yet"
                  : "No alerts match these filters"}
              </p>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  maxHeight: 420,
                  overflowY: "auto",
                }}
              >
                {filteredHistoryAlerts.map((a) => (
                  <AlertCard
                    key={a.id + a.status}
                    a={a}
                    showActions={true}
                    onUpdateStatus={onUpdateStatus}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Staff View ───────────────────────────────────────────────────────────────
const StaffView = ({
  alerts,
  loading,
  sending,
  onSend,
  onExit,
  onUpdateStatus,
  userBranch,
  branchAvailable,
  onToggleAvailability,
}) => {
  const branchAlerts = userBranch
    ? alerts.filter(
        (a) =>
          normalizeBranchName(a.branch) === normalizeBranchName(userBranch),
      )
    : alerts;
  const pendingAlerts = branchAlerts.filter(
    (a) => (a.status || "pending") === "pending",
  );
  const historyAlerts = alerts.filter(
    (a) =>
      ["responding", "resolved"].includes(a.status || "pending") &&
      normalizeBranchName(a.branch) === normalizeBranchName(userBranch),
  );
  return (
    <div className="emg-page">
      <div className="emergency-topbar emg-topbar-pos emg-topbar-card">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img
            src="/icon/emergency_2.png"
            alt=""
            className="emg-topbar-icon"
            style={{
              width: 22,
              height: 22,
              filter:
                "brightness(0) saturate(100%) invert(17%) sepia(82%) saturate(1200%) hue-rotate(210deg)",
            }}
          />{" "}
          <div>
            <h1
              style={{
                fontSize: 20,
                fontWeight: 800,
                color: "var(--text)",
                margin: 0,
              }}
            >
              Emergency Notification
            </h1>
            <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>
              Send emergency alerts to branches
            </p>
          </div>
        </div>
        <button
          onClick={onToggleAvailability}
          style={{
            fontSize: 12,
            fontWeight: 700,
            padding: "7px 14px",
            borderRadius: 8,
            border: `1.5px solid ${branchAvailable ? "#86efac" : "#fca5a5"}`,
            background: branchAvailable ? "#f0fdf4" : "#fef2f2",
            color: branchAvailable ? "#16a34a" : "#dc2626",
            cursor: "pointer",
            fontFamily: "inherit",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: branchAvailable ? "#16a34a" : "#dc2626",
              display: "inline-block",
            }}
          />
          {branchAvailable ? "Branch Available" : "Branch Unavailable"}
        </button>
      </div>
      <div className="emg-content">
        <div
          style={{
            borderRadius: 14,
            marginBottom: 24,
            overflow: "hidden",
            width: "100%",
          }}
        >
          <img
            src="/image/emergency_alert_system.png"
            alt="Emergency Alert System"
            style={{
              width: "100%",
              height: "auto",
              display: "block",
              borderRadius: 14,
            }}
          />
        </div>

        <div
          className="emg-stats-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(80px, 1fr))",
            gap: 10,
            marginBottom: 24,
          }}
        >
          {[
            {
              label: "Total Alerts",
              value: branchAlerts.length,
              color: "#6366f1",
              bg: "#eef2ff",
              border: "#c7d2fe",
            },
            {
              label: "Pending",
              value: branchAlerts.filter(
                (a) => (a.status || "pending") === "pending",
              ).length,
              color: "#dc2626",
              bg: "#fef2f2",
              border: "#fecaca",
            },
            {
              label: "Responding",
              value: branchAlerts.filter((a) => a.status === "responding")
                .length,
              color: "#1d4ed8",
              bg: "#dbeafe",
              border: "#93c5fd",
            },
            {
              label: "Resolved",
              value: branchAlerts.filter((a) => a.status === "resolved").length,
              color: "#16a34a",
              bg: "#f0fdf4",
              border: "#86efac",
            },
          ].map((s, i) => (
            <div
              key={s.label}
              className="fade-in"
              style={{
                background: s.bg,
                border: `1px solid ${s.border}`,
                borderRadius: 12,
                padding: "18px 20px",
                position: "relative",
                overflow: "hidden",
                animationDelay: `${i * 0.1}s`,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: 3,
                  height: "100%",
                  background: s.color,
                  borderRadius: "12px 0 0 12px",
                }}
              />
              <div
                style={{
                  fontSize: 30,
                  fontWeight: 800,
                  color: s.color,
                  lineHeight: 1,
                  marginBottom: 4,
                }}
              >
                {s.value}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: s.color,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.4px",
                  opacity: 0.8,
                  wordBreak: "keep-all",
                  overflowWrap: "normal",
                }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>

        <div
          className="emg-panels-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 16,
            marginBottom: 24,
          }}
        >
          <EmergencyForm
            guestMode={false}
            sending={sending}
            onSend={onSend}
            onExit={onExit}
            userBranch={userBranch}
          />

          <div
            className="emg-panel"
            style={{
              background: "var(--card)",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--border)",
              padding: 24,
              boxShadow: "var(--shadow)",
            }}
          >
            <h3
              style={{
                fontSize: 15,
                fontWeight: 700,
                marginBottom: 16,
                color: "#dc2626",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <img
                src="/icon/warning.png"
                alt=""
                style={{
                  width: 16,
                  height: 16,
                  filter:
                    "brightness(0) saturate(100%) invert(20%) sepia(80%) saturate(2000%) hue-rotate(350deg)",
                  flexShrink: 0,
                }}
              />
              Pending Alerts
              {pendingAlerts.length > 0 && (
                <span
                  style={{
                    marginLeft: 4,
                    background: "#dc2626",
                    color: "#fff",
                    borderRadius: 20,
                    fontSize: 11,
                    padding: "1px 8px",
                    fontWeight: 800,
                  }}
                >
                  {pendingAlerts.length}
                </span>
              )}
            </h3>
            <hr
              style={{
                border: "none",
                borderTop: "1px solid var(--border)",
                marginBottom: 16,
              }}
            />
            {loading ? (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    style={{
                      background: "#fef9c3",
                      border: "1px solid #fde047",
                      borderRadius: 10,
                      padding: "12px 16px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 8,
                      }}
                    >
                      <Skel w="40%" h={13} />
                      <Skel w="20%" h={13} />
                    </div>
                    <Skel w="90%" h={12} style={{ marginBottom: 6 }} />
                    <Skel w="60%" h={11} />
                  </div>
                ))}
              </div>
            ) : pendingAlerts.length === 0 ? (
              <div style={{ textAlign: "center", padding: "30px 0" }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    background: "#f0fdf4",
                    border: "1.5px solid #86efac",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 10px",
                  }}
                >
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#16a34a"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <p
                  style={{
                    color: "var(--muted)",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  All clear — no pending alerts
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  maxHeight: 420,
                  overflowY: "auto",
                }}
              >
                {pendingAlerts.map((a) => (
                  <AlertCard
                    key={a.id + a.status}
                    a={a}
                    showActions={!!onUpdateStatus}
                    onUpdateStatus={onUpdateStatus}
                  />
                ))}
              </div>
            )}
          </div>

          <div
            className="emg-panel"
            style={{
              background: "var(--card)",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--border)",
              padding: 24,
              boxShadow: "var(--shadow)",
            }}
          >
            <h3
              style={{
                fontSize: 15,
                fontWeight: 700,
                marginBottom: 16,
                color: "var(--royal)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              Alert History ({historyAlerts.length})
            </h3>
            <hr
              style={{
                border: "none",
                borderTop: "1px solid var(--border)",
                marginBottom: 20,
              }}
            />
            {loading ? (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    style={{
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: 10,
                      padding: "12px 16px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 8,
                      }}
                    >
                      <Skel w="38%" h={13} />
                      <Skel w="18%" h={13} />
                    </div>
                    <Skel w="80%" h={12} style={{ marginBottom: 6 }} />
                    <Skel w="50%" h={11} />
                  </div>
                ))}
              </div>
            ) : historyAlerts.length === 0 ? (
              <p
                style={{
                  color: "var(--muted)",
                  fontSize: 13,
                  textAlign: "center",
                  padding: 20,
                }}
              >
                No alerts sent yet
              </p>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  maxHeight: 400,
                  overflowY: "auto",
                }}
              >
                {historyAlerts.map((a) => (
                  <AlertCard
                    key={a.id + a.status}
                    a={a}
                    showActions={true}
                    onUpdateStatus={onUpdateStatus}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Guest View ───────────────────────────────────────────────────────────────
const GuestView = ({ sending, onSend, onExit }) => (
  <div
    style={{
      width: "100%",
      minHeight: "100vh",
      display: "block",
      background: "#fff",
    }}
  >
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50 }}>
      <GuestBanner onExit={onExit} />
      <div
        style={{
          background: "#fff",
          borderBottom: "1px solid var(--border)",
          padding: "14px 28px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          boxSizing: "border-box",
        }}
      >
        <img
          src="/icon/emergency_2.png"
          alt=""
          style={{
            width: 22,
            height: 22,
            filter:
              "brightness(0) saturate(100%) invert(17%) sepia(82%) saturate(1200%) hue-rotate(210deg)",
          }}
        />
        <div>
          <h1
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: "var(--text)",
              margin: 0,
            }}
          >
            Emergency Report
          </h1>
          <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>
            Submit an emergency report — no account needed
          </p>
        </div>
      </div>
    </div>
    <div
      style={{
        padding: "24px 28px",
        paddingTop: 120,
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          borderRadius: 14,
          marginBottom: 24,
          overflow: "hidden",
          width: "100%",
        }}
      >
        <img
          src="/image/emergency_alert_system.png"
          alt="Emergency Alert System"
          style={{
            width: "100%",
            height: "auto",
            display: "block",
            borderRadius: 14,
          }}
        />
      </div>
      <div style={{ maxWidth: "100%", margin: "0 auto" }}>
        <EmergencyForm
          guestMode={true}
          sending={sending}
          onSend={onSend}
          onExit={onExit}
        />
        <div style={{ marginTop: 16, textAlign: "center" }}>
          <p style={{ fontSize: 13, color: "#64748b", marginBottom: 8 }}>
            Already have an account?
          </p>
          <a
            href="/login"
            style={{
              display: "inline-block",
              padding: "10px 28px",
              background: "#0f1f4b",
              color: "#fff",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Sign In to Your Account
          </a>
        </div>
      </div>
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const Emergency = ({ guestMode = false }) => {
  const {
    user,
    isAdmin,
    isCustomer,
    isManager,
    isEmployee,
    loading: userLoading,
  } = useCurrentUser();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [toasts, setToasts] = useState([]);
  const toastIdRef = useRef(0);
  const [trackedAlertId, setTrackedAlertId] = useState(null);

  const showRespondingToast = useCallback(() => {
    const id = ++toastIdRef.current;
    setToasts((t) => [
      ...t,
      { id, guestMode: true, variant: "responding", show: false },
    ]);
    requestAnimationFrame(() => {
      setToasts((t) => t.map((x) => (x.id === id ? { ...x, show: true } : x)));
    });
    setTimeout(() => {
      setToasts((t) => t.map((x) => (x.id === id ? { ...x, show: false } : x)));
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 340);
    }, 6000);
  }, []);

  // Listens for the staff marking THIS guest's own alert as "responding"
  useEffect(() => {
    if (!guestMode || !trackedAlertId) return;
    const ch = supabase
      .channel("guest-alert-" + trackedAlertId)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "emergency_alerts",
          filter: `guest_ref=eq.${trackedAlertId}`,
        },
        (payload) => {
          if (payload.new?.status === "responding") {
            showRespondingToast();
            setTrackedAlertId(null);
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [guestMode, trackedAlertId, showRespondingToast]);

  const showSuccessToast = useCallback((isGuest) => {
    const id = ++toastIdRef.current;
    setToasts((t) => [...t, { id, guestMode: isGuest, show: false }]);

    requestAnimationFrame(() => {
      setToasts((t) => t.map((x) => (x.id === id ? { ...x, show: true } : x)));
    });

    setTimeout(() => {
      setToasts((t) => t.map((x) => (x.id === id ? { ...x, show: false } : x)));
      setTimeout(() => {
        setToasts((t) => t.filter((x) => x.id !== id));
      }, 340);
    }, 3000);
  }, []);

  const closeToast = useCallback((id) => {
    setToasts((t) => t.map((x) => (x.id === id ? { ...x, show: false } : x)));
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 340);
  }, []);
  const [branchAvailable, setBranchAvailable] = useState(true);
  const [confirmStatusChange, setConfirmStatusChange] = useState(null); // { id, status, alertType }
  const navigate = useNavigate();
  const senderName = user
    ? `${user.firstName} ${user.lastName}`.trim() || user.email || "Staff"
    : "Staff";
  const BRANCH_ID_MAP = {
    1: "Main",
    2: "Mabalacat 2",
    3: "Tarlac",
    4: "San Fernando",
    5: "Angeles",
  };
  const userBranch =
    BRANCH_ID_MAP[user?.branchId] || user?.branch || user?.branchName || null;

  // ── Load / sync branch availability ──
  useEffect(() => {
    if (!userBranch) return;
    const load = async () => {
      const { data, error } = await supabase
        .from("branch_availability")
        .select("available")
        .eq("branch", userBranch)
        .single();
      if (data) {
        setBranchAvailable(data.available);
      } else {
        // No row yet — insert a default "available" row so upsert works next time
        await supabase.from("branch_availability").insert({
          branch: userBranch,
          available: true,
          updated_at: new Date().toISOString(),
        });
        setBranchAvailable(true);
      }
    };
    load();
    const ch = supabase
      .channel("branch-avail-staff-" + userBranch)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "branch_availability" },
        (payload) => {
          if (payload.new?.branch === userBranch) {
            setBranchAvailable(payload.new.available);
          }
        },
      )
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [userBranch]);

  const toggleAvailability = useCallback(async () => {
    if (!userBranch) return;
    const next = !branchAvailable;

    // Try UPDATE first, then INSERT if no row exists
    const { data: updateData, error: updateError } = await supabase
      .from("branch_availability")
      .update({ available: next, updated_at: new Date().toISOString() })
      .eq("branch", userBranch)
      .select();

    if (updateError) {
      console.error("Update failed:", updateError);
      return;
    }

    // If no row was updated, insert one
    if (!updateData || updateData.length === 0) {
      const { data: insertData, error: insertError } = await supabase
        .from("branch_availability")
        .insert({
          branch: userBranch,
          available: next,
          updated_at: new Date().toISOString(),
        })
        .select();
      if (insertError) {
        console.error("Insert failed:", insertError);
        return;
      }
    }

    setBranchAvailable(next);
  }, [branchAvailable, userBranch]);

  // ── Fetch all alerts (admin sees all; staff filters client-side to also catch legacy branch name strings) ──
  const fetchAlerts = useCallback(async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("emergency_alerts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (!error) {
      const rows = data || [];
      const filtered =
        !isAdmin && userBranch
          ? rows.filter(
              (a) =>
                normalizeBranchName(a.branch) ===
                normalizeBranchName(userBranch),
            )
          : rows;
      setAlerts(filtered);
    }
    setLoading(false);
  }, [isAdmin, userBranch]);

  useEffect(() => {
    fetchAlerts();

    const channel = supabase
      .channel("emergency-alerts-realtime-" + Date.now()) // ← unique channel name prevents stale subs
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "emergency_alerts" },
        (payload) => {
          const belongsToUser =
            isAdmin ||
            !userBranch ||
            normalizeBranchName(payload.new.branch) ===
              normalizeBranchName(userBranch);
          if (!belongsToUser) return;
          setAlerts((prev) => {
            const exists = prev.some((a) => a.id === payload.new.id);
            if (exists) return prev;
            return [payload.new, ...prev].slice(0, 50);
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "emergency_alerts" },
        (payload) => {
          setAlerts((prev) =>
            prev.map((a) =>
              a.id === payload.new.id ? { ...a, ...payload.new } : a,
            ),
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "emergency_alerts" },
        (payload) => {
          setAlerts((prev) => prev.filter((a) => a.id !== payload.old.id));
        },
      )
      .subscribe((status) => {
        if (status === "CLOSED" || status === "CHANNEL_ERROR") {
          fetchAlerts(); // fallback refetch if realtime drops
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAlerts]);

  useEffect(() => {
    if (guestMode) {
      document.body.style.paddingTop = "0";
      document.body.style.overflow = "auto";
    }
    return () => {
      if (guestMode) document.body.style.paddingTop = "68px";
    };
  }, [guestMode]);

  // ── Send alert — include branch_id from user ───────────────────────────────
  const sendAlert = useCallback(
    async (formData) => {
      setSending(true);
      const base = {
        type: formData.type,
        branch: formData.branch,
        status: "pending",
        sent_by: guestMode
          ? formData.guest_full_name?.trim() || "Emergency Guest"
          : senderName,
        ...(guestMode
          ? {
              guest_full_name: formData.guest_full_name?.trim() || null,
              guest_contact: formData.guest_contact?.trim() || null,
              guest_address: formData.guest_address?.trim() || null,
              patient_name: formData.patient_name?.trim() || null,
            }
          : {
              guest_contact: formData.contact_number?.trim() || null,
              guest_address: formData.location?.trim() || null,
            }),
      };

      const BRANCH_NAME_TO_ID = {
        Main: 1,
        "Mabalacat 2": 2,
        Tarlac: 3,
        "San Fernando": 4,
        Angeles: 5,
      };
      const guestRef = guestMode
        ? `g_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
        : undefined;
      const payload = guestMode
        ? {
            ...base,
            guest_ref: guestRef,
            branch_id: BRANCH_NAME_TO_ID[formData.branch] ?? null,
          }
        : withBranchId(user, base);
      const { error } = guestMode
        ? await supabase.from("emergency_alerts").insert([payload])
        : await supabase.from("emergency_alerts").insert([payload]).select();
      setSending(false);

      if (error) {
        alert("Error: " + error.message);
        return;
      }

      if (guestMode && guestRef) setTrackedAlertId(guestRef);

      logActivity(
        user || {
          id: "guest",
          fullName: formData.guest_full_name || "Guest",
          role: "guest",
        },
        "Sent emergency alert",
        `Type: ${formData.type} · Branch: ${formData.branch}`,
      );
      showSuccessToast(guestMode);
      return { success: true };
    },
    [guestMode, user, senderName],
  );

  const updateStatus = useCallback(
    async (id, status) => {
      // Update UI instantly
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status } : a)),
      );

      const { error } = await supabase
        .from("emergency_alerts")
        .update({ status })
        .eq("id", id);

      if (error) {
        console.error("Status update failed:", error.message);
        alert("Could not update status: " + error.message);
        fetchAlerts();
        return;
      }

      // ── Notify the user when staff marks "responding" ──
      if (status === "responding") {
        const alert = alerts.find((a) => a.id === id);
        if (alert?.user_id) {
          await supabase.from("notifications").insert([
            {
              user_id: alert.user_id,
              title: "🚨 Help is on the way!",
              message: `Our team is now responding to your emergency report (${alert.type}) at ${alert.branch}. Please stay calm and keep your phone line open.`,
              type: "emergency",
              is_read: false,
              created_at: new Date().toISOString(),
            },
          ]);
        }
      }
    },
    [fetchAlerts, alerts],
  );

  const requestStatusChange = useCallback(
    (id, status) => {
      if (status === "resolved") {
        const alert = alerts.find((a) => a.id === id);
        setConfirmStatusChange({
          id,
          status,
          alertType: alert?.type || "this alert",
        });
        return;
      }
      updateStatus(id, status);
    },
    [alerts, updateStatus],
  );

  const handleGuestExit = useCallback(() => {
    localStorage.removeItem("hospital_jwt");
    localStorage.removeItem("sb_user");
    navigate("/");
  }, [navigate]);

  // ── Render ──────────────────────────────────────────────────────────────────
  if (guestMode) {
    return (
      <>
        <ToastStack toasts={toasts} onClose={closeToast} />
        <GuestView
          sending={sending}
          onSend={sendAlert}
          onExit={handleGuestExit}
        />
      </>
    );
  }

  if (isAdmin) {
    return (
      <Layout>
        <ToastStack toasts={toasts} onClose={closeToast} />
        <AdminView
          alerts={alerts}
          loading={loading}
          onRefresh={fetchAlerts}
          onUpdateStatus={requestStatusChange}
          userBranch={userBranch}
          branchAvailable={branchAvailable}
          onToggleAvailability={toggleAvailability}
        />
        <Modal
          show={!!confirmStatusChange}
          title="Mark Alert as Resolved?"
          message={`Are you sure you want to mark "${confirmStatusChange?.alertType}" as resolved? This confirms the emergency has been fully addressed.`}
          confirmText="Yes, Mark Resolved"
          cancelText="Cancel"
          confirmColor="#16a34a"
          onConfirm={() => {
            updateStatus(confirmStatusChange.id, confirmStatusChange.status);
            setConfirmStatusChange(null);
          }}
          onCancel={() => setConfirmStatusChange(null)}
        />
      </Layout>
    );
  }

  if (isManager) {
    return (
      <Layout>
        <ToastStack toasts={toasts} onClose={closeToast} />
        <StaffView
          alerts={alerts}
          loading={loading}
          sending={sending}
          onSend={sendAlert}
          onExit={handleGuestExit}
          onUpdateStatus={requestStatusChange}
          userBranch={userBranch}
          branchAvailable={branchAvailable}
          onToggleAvailability={toggleAvailability}
        />
        <Modal
          show={!!confirmStatusChange}
          title="Mark Alert as Resolved?"
          message={`Are you sure you want to mark "${confirmStatusChange?.alertType}" as resolved? This confirms the emergency has been fully addressed.`}
          confirmText="Yes, Mark Resolved"
          cancelText="Cancel"
          confirmColor="#16a34a"
          onConfirm={() => {
            updateStatus(confirmStatusChange.id, confirmStatusChange.status);
            setConfirmStatusChange(null);
          }}
          onCancel={() => setConfirmStatusChange(null)}
        />
      </Layout>
    );
  }

  // Employee: can send alerts but cannot mark responding/resolved
  if (isEmployee) {
    return (
      <Layout>
        <ToastStack toasts={toasts} onClose={closeToast} />
        <StaffView
          alerts={alerts}
          loading={loading}
          sending={sending}
          onSend={sendAlert}
          onExit={handleGuestExit}
          onUpdateStatus={null}
          userBranch={userBranch}
          branchAvailable={branchAvailable}
          onToggleAvailability={toggleAvailability}
        />
      </Layout>
    );
  }

  // Fallback (any other authenticated staff role)
  return (
    <Layout>
      <ToastStack toasts={toasts} onClose={closeToast} />
      <StaffView
        alerts={alerts}
        loading={loading}
        sending={sending}
        onSend={sendAlert}
        onExit={handleGuestExit}
        onUpdateStatus={requestStatusChange}
        userBranch={userBranch}
      />
      <Modal
        show={!!confirmStatusChange}
        title="Mark Alert as Resolved?"
        message={`Are you sure you want to mark "${confirmStatusChange?.alertType}" as resolved? This confirms the emergency has been fully addressed.`}
        confirmText="Yes, Mark Resolved"
        cancelText="Cancel"
        confirmColor="#16a34a"
        onConfirm={() => {
          updateStatus(confirmStatusChange.id, confirmStatusChange.status);
          setConfirmStatusChange(null);
        }}
        onCancel={() => setConfirmStatusChange(null)}
      />
    </Layout>
  );
};

export default Emergency;
