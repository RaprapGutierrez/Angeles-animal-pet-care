import React, { useState, useEffect, useCallback, useMemo, memo } from "react";
import ReactDOM from "react-dom";
import { Layout } from "../../components/layout";
import { supabase } from "../../js/Utils/supabase";
import { useCurrentUser } from "../../js/hooks/Usecurrentuser";
import "../../styles/CustomerEmergency.css";

const Skeleton = ({ w = "100%", h = 14, r = 6, mb = 0 }) => (
  <div
    style={{
      width: w,
      height: h,
      borderRadius: r,
      background:
        "linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)",
      backgroundSize: "200% 100%",
      animation: "shimmer 1.4s infinite",
      marginBottom: mb,
      flexShrink: 0,
    }}
  />
);

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

// ── Cascading location data: Province → City → Street/Barangay ──
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
const PROVINCES = Object.keys(CITIES_BY_PROVINCE);

// ── Flat city list + reverse lookup, so City can be picked first ──
const CITY_TO_PROVINCE = {};
Object.entries(CITIES_BY_PROVINCE).forEach(([prov, cities]) => {
  cities.forEach((c) => {
    CITY_TO_PROVINCE[c] = prov;
  });
});
const ALL_CITIES = Object.keys(CITY_TO_PROVINCE).sort();

// ── Sanitizers ──────────────────────────────────────────────────────────────
const sanitizeName = (v) => v.replace(/[^a-zA-Z\s'-]/g, "");
const sanitizeContact = (v) => v.replace(/\D/g, "").slice(0, 11);

// ── Client-side rate limit: caps emergency submissions per device/session ──
const RATE_LIMIT_KEY = "emg_submit_log_customer";
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 3;

const checkAndRecordRateLimit = () => {
  const now = Date.now();
  let log = [];
  try {
    log = JSON.parse(localStorage.getItem(RATE_LIMIT_KEY) || "[]");
  } catch {
    log = [];
  }
  log = log.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (log.length >= RATE_LIMIT_MAX) {
    const minutesLeft = Math.max(
      1,
      Math.ceil((RATE_LIMIT_WINDOW_MS - (now - log[0])) / 60000),
    );
    return { allowed: false, minutesLeft };
  }
  log.push(now);
  localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(log));
  return { allowed: true };
};

// ── Reverse-geocode a browser Geolocation position into an approximate
// address, then map it onto our own option lists so dropdowns populate. ──
const reverseGeocode = async (lat, lon) => {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=16&addressdetails=1`,
    { headers: { Accept: "application/json" } },
  );
  if (!res.ok) throw new Error("Reverse geocoding failed");
  const data = await res.json();
  const addr = data.address || {};
  const rawCity =
    addr.city || addr.municipality || addr.town || addr.county || "";
  const rawProvince = addr.state || addr.province || "";
  const rawBarangay =
    addr.suburb || addr.village || addr.neighbourhood || addr.quarter || "";
  const rawStreet = [addr.road, addr.house_number].filter(Boolean).join(" ");

  const matchCity =
    ALL_CITIES.find((c) => c.toLowerCase() === rawCity.toLowerCase()) ||
    ALL_CITIES.find((c) => c.toLowerCase().includes(rawCity.toLowerCase())) ||
    "";
  const matchProvince = matchCity
    ? CITY_TO_PROVINCE[matchCity]
    : PROVINCES.find((p) => p.toLowerCase() === rawProvince.toLowerCase()) ||
      "";
  const cityBarangays = matchCity ? BARANGAYS_BY_CITY[matchCity] || [] : [];
  const matchBarangay =
    cityBarangays.find((b) => b.toLowerCase() === rawBarangay.toLowerCase()) ||
    cityBarangays.find((b) =>
      b.toLowerCase().includes(rawBarangay.toLowerCase()),
    ) ||
    "";

  return {
    province: matchProvince,
    city: matchCity,
    barangay: matchBarangay,
    street: rawStreet,
    matched: !!matchCity,
  };
};

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
  pending: {
    bg: "#fef9c3",
    border: "#fde047",
    text: "#854d0e",
    label: "Pending",
  },
  responding: {
    bg: "#dbeafe",
    border: "#93c5fd",
    text: "#1d4ed8",
    label: "Responding",
  },
  resolved: {
    bg: "#dcfce7",
    border: "#86efac",
    text: "#166534",
    label: "Resolved",
  },
};

// ── History Alert Card ───────────────────────────────────────────────────────
const HistoryCard = ({ a }) => {
  const status = a.status || "pending";
  const col = STATUS_COLORS[status] || STATUS_COLORS.pending;
  return (
    <div
      style={{
        background: "var(--bg)",
        border: `1px solid ${col.border}`,
        borderRadius: 10,
        padding: "12px 16px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 4,
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 6,
            minWidth: 0,
            maxWidth: "55%",
          }}
        >
          <img
            src="/icon/warning.png"
            alt=""
            style={{
              width: 14,
              height: 14,
              flexShrink: 0,
              marginTop: 2,
              filter:
                "brightness(0) saturate(100%) invert(20%) sepia(80%) saturate(2000%) hue-rotate(350deg)",
            }}
          />
          <strong
            style={{
              fontSize: 13,
              color: "#dc2626",
              lineHeight: 1.4,
              wordBreak: "break-word",
              minWidth: 0,
            }}
          >
            {a.type}
          </strong>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: col.text,
              background: "#fff",
              border: `1px solid ${col.border}`,
              borderRadius: 20,
              padding: "2px 8px",
              textTransform: "capitalize",
            }}
          >
            {col.label}
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
      <p style={{ fontSize: 12, color: "var(--text)", margin: "0 0 4px" }}>
        {a.description}
      </p>
      <p style={{ fontSize: 11, color: "var(--muted)", margin: 0 }}>
        Branch: {a.branch}
      </p>
      {a.updated_at && status !== "pending" && (
        <p style={{ fontSize: 10, color: "var(--muted)", margin: "4px 0 0" }}>
          Last updated:{" "}
          {new Date(a.updated_at).toLocaleString("en", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      )}
    </div>
  );
};

const CustomSelect = ({
  value,
  onChange,
  options,
  placeholder = "—",
  accent = "#dc2626",
  disabled = false,
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
    if (disabled) return;
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
              border: "1.5px solid var(--border, #e8edf4)",
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
                    if (!opt.disabled) {
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
                      : isSelected
                        ? accent
                        : "var(--text)",
                    cursor: opt.disabled ? "not-allowed" : "pointer",
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
                    if (!isSelected && !opt.disabled)
                      e.currentTarget.style.background = "var(--bg, #f4f6fa)";
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
          padding: "8px 34px 8px 12px",
          border: "1.5px solid",
          borderRadius: 9,
          background: disabled ? "var(--bg, #f8fafc)" : "var(--card, #fff)",
          fontSize: 13,
          fontWeight: 600,
          color: disabled ? "#cbd5e1" : value ? "var(--text)" : "#b0bac9",
          cursor: disabled ? "not-allowed" : "pointer",
          userSelect: "none",
          boxSizing: "border-box",
          boxShadow: open
            ? `0 0 0 3px ${accent}22, 0 2px 8px rgba(0,0,0,0.08)`
            : "0 1px 3px rgba(0,0,0,0.06)",
          borderColor: open ? accent : "var(--border, #dde3ec)",
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
            e.currentTarget.style.borderColor = "#fca5a5";
            e.currentTarget.style.boxShadow = "0 2px 8px rgba(220,38,38,0.10)";
          }
        }}
        onMouseLeave={(e) => {
          if (!open) {
            e.currentTarget.style.borderColor = "var(--border, #dde3ec)";
            e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.06)";
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

// ── Report Form ───────────────────────────────────────────────────────────────
const ReportForm = memo(
  ({ sending, onSend, defaultBranch, branchAvailability }) => {
    const [form, setForm] = useState({
      type: "",
      customType: "",
      contact_number: "",
      patient_name: "",
      pet_photo_url: "",
      province: "",
      city: "",
      barangay: "",
      street: "",
      branch: defaultBranch || "",
    });
    const [descErr, setDescErr] = useState("");
    const [typeErr, setTypeErr] = useState("");
    const [branchErr, setBranchErr] = useState("");
    const [contactErr, setContactErr] = useState("");
    const [rateLimitErr, setRateLimitErr] = useState("");
    const [locating, setLocating] = useState(false);
    const [locateStatus, setLocateStatus] = useState(null);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const photoInputRef = React.useRef(null);

    const detectLocation = () => {
      if (!("geolocation" in navigator)) {
        setLocateStatus({
          type: "error",
          message: "Location detection isn't supported on this device.",
        });
        return;
      }
      setLocating(true);
      setLocateStatus(null);
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const { latitude, longitude } = pos.coords;
            const result = await reverseGeocode(latitude, longitude);
            setForm((f) => ({
              ...f,
              province: result.province || f.province,
              city: result.city || f.city,
              barangay: result.barangay || f.barangay,
              street: result.street || f.street,
            }));
            setDescErr("");
            setLocateStatus(
              result.matched
                ? {
                    type: "ok",
                    message:
                      "Location detected and filled in. Please double-check it's correct.",
                  }
                : {
                    type: "partial",
                    message:
                      "We found your coordinates but couldn't match them to a listed area — please fill in the address manually.",
                  },
            );
          } catch {
            setLocateStatus({
              type: "error",
              message:
                "Couldn't determine your address automatically. Please fill it in manually.",
            });
          } finally {
            setLocating(false);
          }
        },
        () => {
          setLocating(false);
          setLocateStatus({
            type: "error",
            message:
              "Location permission denied or unavailable. Please fill in the address manually.",
          });
        },
        { enableHighAccuracy: true, timeout: 10000 },
      );
    };

    const uploadPetPhoto = async (file) => {
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        setContactErr("Please choose an image under 5MB.");
        return;
      }
      setUploadingPhoto(true);
      try {
        const ext = file.name.split(".").pop();
        const path = `emergency/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("attachments")
          .upload(path, file);
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage
          .from("attachments")
          .getPublicUrl(path);
        setForm((p) => ({ ...p, pet_photo_url: pub?.publicUrl || "" }));
      } catch (err) {
        setContactErr("Upload failed: " + err.message);
      } finally {
        setUploadingPhoto(false);
      }
    };

    const handleSend = useCallback(async () => {
      let hasErr = false;

      if (!form.type) {
        setTypeErr("Please select the emergency type.");
        hasErr = true;
      } else if (form.type === OTHER_TYPE && !form.customType.trim()) {
        setTypeErr("Please describe the emergency.");
        hasErr = true;
      } else {
        setTypeErr("");
      }

      if (!form.province) {
        setDescErr("Please select a province.");
        hasErr = true;
      } else if (!form.city) {
        setDescErr("Please select a city.");
        hasErr = true;
      } else if (!form.street.trim()) {
        setDescErr("Please enter the street/barangay.");
        hasErr = true;
      } else {
        setDescErr("");
      }

      if (!form.contact_number.trim()) {
        setContactErr("Please enter your contact number.");
        hasErr = true;
      } else if (form.contact_number.length !== 11) {
        setContactErr("Contact number must be 11 digits.");
        hasErr = true;
      } else {
        setContactErr("");
      }

      if (!form.branch) {
        setBranchErr("Please select the nearest branch.");
        hasErr = true;
      } else if (
        form.province &&
        form.city &&
        isLocationTooFar(form.branch, form.province, form.city)
      ) {
        const d = Math.round(
          distanceToBranchKm(form.branch, form.province, form.city),
        );
        setBranchErr(
          `${form.city} is about ${d}km from ${form.branch}, which is too far for this branch to respond. Please pick a closer branch.`,
        );
        hasErr = true;
      } else {
        setBranchErr("");
      }

      if (hasErr) return;

      const rl = checkAndRecordRateLimit();
      if (!rl.allowed) {
        setRateLimitErr(
          `Too many reports submitted from this device. Please wait about ${rl.minutesLeft} minute${rl.minutesLeft === 1 ? "" : "s"}, or call the branch directly for an urgent emergency.`,
        );
        return;
      }
      setRateLimitErr("");

      const finalLocation = [
        form.street.trim(),
        form.barangay,
        form.city,
        form.province,
      ]
        .filter(Boolean)
        .join(", ");
      const finalType =
        form.type === OTHER_TYPE ? form.customType.trim() : form.type;
      const result = await onSend({
        ...form,
        type: finalType,
        description: finalLocation,
      });
      if (result?.success) {
        setForm({
          type: "",
          customType: "",
          contact_number: "",
          patient_name: "",
          pet_photo_url: "",
          province: "",
          city: "",
          barangay: "",
          street: "",
          branch: defaultBranch || "",
        });
        setLocateStatus(null);
      }
    }, [form, onSend, defaultBranch]);

    const canSend = !!(
      form.type &&
      (form.type !== OTHER_TYPE || form.customType.trim()) &&
      form.province &&
      form.city &&
      form.street.trim() &&
      form.branch &&
      !isLocationTooFar(form.branch, form.province, form.city)
    );

    return (
      <div
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
            gap: 8,
            marginBottom: 4,
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
            }}
          />
          <h3
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: "#dc2626",
              margin: 0,
            }}
          >
            Report an Emergency
          </h3>
        </div>
        <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 16px" }}>
          Tell us about your pet's emergency. We'll respond as fast as possible.
        </p>
        <hr
          style={{
            border: "none",
            borderTop: "1px solid var(--border)",
            marginBottom: 20,
          }}
        />

        <div className="form-group" style={{ marginBottom: 14 }}>
          <label>Emergency Type</label>
          <CustomSelect
            value={form.type}
            onChange={(val) => {
              setForm((p) => ({ ...p, type: val }));
              setTypeErr("");
            }}
            options={EMERGENCY_TYPES.map((t) =>
              t === OTHER_TYPE
                ? { value: t, label: "Other (describe emergency)" }
                : t,
            )}
            placeholder="— Select Emergency Type —"
            accent="#dc2626"
          />
          {form.type === OTHER_TYPE && (
            <textarea
              value={form.customType}
              onChange={(e) => {
                setForm((p) => ({ ...p, customType: e.target.value }));
                setTypeErr("");
              }}
              placeholder="Briefly describe the emergency"
              style={{
                marginTop: 8,
                minHeight: 60,
                resize: "vertical",
                border: `1.5px solid ${typeErr ? "#f87171" : "var(--border)"}`,
                width: "100%",
                boxSizing: "border-box",
                borderRadius: 8,
                fontSize: 13,
                fontFamily: "inherit",
                padding: "8px 12px",
                background: "var(--card)",
                color: "var(--text)",
                outline: "none",
              }}
            />
          )}
          {typeErr && (
            <p style={{ fontSize: 11, color: "#dc2626", marginTop: 3 }}>
              {typeErr}
            </p>
          )}
        </div>

        <div className="form-group" style={{ marginBottom: 14 }}>
          <label>
            Your Contact Number <span style={{ color: "#dc2626" }}>*</span>
          </label>
          <input
            type="tel"
            inputMode="numeric"
            maxLength={11}
            value={form.contact_number}
            onChange={(e) => {
              setForm((p) => ({
                ...p,
                contact_number: sanitizeContact(e.target.value),
              }));
              setContactErr("");
            }}
            placeholder="e.g. 09170000000"
            style={{
              width: "100%",
              padding: "8px 12px",
              boxSizing: "border-box",
              border: `1.5px solid ${contactErr ? "#f87171" : "var(--border)"}`,
              borderRadius: 8,
              fontSize: 13,
              fontFamily: "inherit",
              background: "var(--card)",
              color: "var(--text)",
              outline: "none",
            }}
          />
          {contactErr && (
            <p style={{ fontSize: 11, color: "#dc2626", marginTop: 3 }}>
              {contactErr}
            </p>
          )}
        </div>

        <div className="form-group" style={{ marginBottom: 14 }}>
          <label>Patient (Pet) Name</label>
          <input
            type="text"
            value={form.patient_name}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                patient_name: sanitizeName(e.target.value),
              }))
            }
            placeholder="e.g. Brownie"
            style={{
              width: "100%",
              padding: "8px 12px",
              boxSizing: "border-box",
              border: "1.5px solid var(--border)",
              borderRadius: 8,
              fontSize: 13,
              fontFamily: "inherit",
              background: "var(--card)",
              color: "var(--text)",
              outline: "none",
            }}
          />
          <label style={{ marginTop: 8, display: "block" }}>
            Photo of Pet{" "}
            <span style={{ fontWeight: 400, fontSize: 11 }}>
              (optional — helps the vet prepare)
            </span>
          </label>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadPetPhoto(f);
              e.target.value = "";
            }}
          />
          {form.pet_photo_url ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                border: "1.5px solid var(--border)",
                borderRadius: 8,
                padding: 8,
                marginTop: 4,
              }}
            >
              <img
                src={form.pet_photo_url}
                alt="Pet"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 8,
                  objectFit: "cover",
                }}
              />
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, pet_photo_url: "" }))}
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#64748b",
                  background: "none",
                  border: "1px solid #e2e8f0",
                  borderRadius: 20,
                  padding: "5px 10px",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Remove
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              disabled={uploadingPhoto}
              style={{
                width: "100%",
                marginTop: 4,
                padding: "9px 12px",
                border: "1.5px dashed #fecaca",
                borderRadius: 8,
                background: "#fff7f7",
                color: "#dc2626",
                fontSize: 12,
                fontWeight: 700,
                cursor: uploadingPhoto ? "default" : "pointer",
                fontFamily: "inherit",
              }}
            >
              {uploadingPhoto ? "Uploading..." : "Take or Upload Photo"}
            </button>
          )}
        </div>

        <div className="form-group" style={{ marginBottom: 14 }}>
          <label>
            Location of Emergency <span style={{ color: "#dc2626" }}>*</span>
          </label>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              marginBottom: 8,
            }}
          >
            <button
              type="button"
              onClick={detectLocation}
              disabled={locating}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                background: "none",
                border: "1px solid #fecaca",
                color: "#dc2626",
                borderRadius: 20,
                padding: "3px 10px",
                fontSize: 11,
                fontWeight: 700,
                cursor: locating ? "default" : "pointer",
                fontFamily: "inherit",
              }}
            >
              {locating ? "Locating..." : "📍 Use my location"}
            </button>
          </div>
          {locateStatus && (
            <p
              style={{
                fontSize: 11,
                margin: "0 0 8px",
                color:
                  locateStatus.type === "ok"
                    ? "#16a34a"
                    : locateStatus.type === "partial"
                      ? "#d97706"
                      : "#dc2626",
              }}
            >
              {locateStatus.message}
            </p>
          )}
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
                value={form.province}
                onChange={(val) => {
                  setForm((p) => ({
                    ...p,
                    province: val,
                    city: CITY_TO_PROVINCE[p.city] === val ? p.city : "",
                    barangay:
                      CITY_TO_PROVINCE[p.city] === val ? p.barangay : "",
                  }));
                  setDescErr("");
                }}
                options={PROVINCES.map((p) => ({ value: p, label: p }))}
                placeholder="— Province —"
                accent="#dc2626"
                disabled={!form.type}
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
                value={form.city}
                onChange={(val) => {
                  setForm((p) => ({
                    ...p,
                    city: val,
                    province: CITY_TO_PROVINCE[val] || "",
                    barangay: BARANGAYS_BY_CITY[val]?.includes(p.barangay)
                      ? p.barangay
                      : "",
                  }));
                  setDescErr("");
                }}
                options={(form.province
                  ? CITIES_BY_PROVINCE[form.province] || []
                  : ALL_CITIES
                ).map((c) => ({ value: c, label: c }))}
                placeholder="— City —"
                accent="#dc2626"
                disabled={!form.province}
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
                form.city
                  ? form.barangay
                  : form.barangay
                    ? `${form.barangay}||${form.city}`
                    : ""
              }
              onChange={(val) => {
                if (form.city) {
                  setForm((p) => ({ ...p, barangay: val }));
                } else {
                  const [brgy, city] = val.split("||");
                  setForm((p) => ({
                    ...p,
                    barangay: brgy,
                    city,
                    province: CITY_TO_PROVINCE[city] || "",
                  }));
                }
                setDescErr("");
              }}
              options={
                form.city
                  ? (BARANGAYS_BY_CITY[form.city] || []).map((b) => ({
                      value: b,
                      label: b,
                    }))
                  : BARANGAY_CITY_OPTIONS
              }
              placeholder="— Barangay —"
              accent="#dc2626"
              disabled={!form.city}
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
              value={form.street}
              onChange={(e) => {
                setForm((p) => ({ ...p, street: e.target.value }));
                setDescErr("");
              }}
              placeholder="House No. / Street / Subdivision (optional)"
              disabled={!form.barangay}
              style={{
                width: "100%",
                padding: "8px 12px",
                boxSizing: "border-box",
                border: `1.5px solid ${descErr ? "#f87171" : "var(--border)"}`,
                borderRadius: 8,
                fontSize: 13,
                fontFamily: "inherit",
                background: !form.barangay
                  ? "var(--bg, #f8fafc)"
                  : "var(--card)",
                color: "var(--text)",
                outline: "none",
              }}
            />
          </div>
          {descErr && (
            <p style={{ fontSize: 11, color: "#dc2626", marginTop: 3 }}>
              {descErr}
            </p>
          )}
        </div>

        <div className="form-group" style={{ marginBottom: 20 }}>
          <label>
            Nearest Branch <span style={{ color: "#dc2626" }}>*</span>
          </label>
          <CustomSelect
            value={form.branch}
            onChange={(val) => {
              setForm((p) => ({ ...p, branch: val }));
              setBranchErr("");
            }}
            options={BRANCHES.map((b) => {
              const isAvail = branchAvailability?.[b] !== false;
              return {
                value: b,
                label: isAvail ? b : `${b} — Unavailable`,
                disabled: !isAvail,
              };
            })}
            placeholder="— Select Branch —"
            accent="#dc2626"
            disabled={!form.barangay}
          />
          {rateLimitErr && (
            <p style={{ fontSize: 11, color: "#dc2626", marginTop: 6 }}>
              {rateLimitErr}
            </p>
          )}
          {branchErr && (
            <p style={{ fontSize: 11, color: "#dc2626", marginTop: 3 }}>
              {branchErr}
            </p>
          )}
        </div>

        <button
          onClick={handleSend}
          disabled={sending || !canSend}
          style={{
            width: "100%",
            padding: "12px",
            background: sending || !canSend ? "#94a3b8" : "#dc2626",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 700,
            cursor: sending || !canSend ? "not-allowed" : "pointer",
            fontFamily: "inherit",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            strokeWidth="2"
            strokeLinecap="round"
            style={{ width: 16, height: 16 }}
          >
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
          </svg>
          {sending ? "Sending..." : "Send Emergency Alert to Staff"}
        </button>

        {form.branch &&
          form.province &&
          form.city &&
          isLocationTooFar(form.branch, form.province, form.city) && (
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
                viewBox="0 0 24 24"
                fill="none"
                stroke="#991b1b"
                strokeWidth="2"
                strokeLinecap="round"
                style={{ width: 14, height: 14, flexShrink: 0, marginTop: 1 }}
              >
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <path d="M12 9v4" />
                <path d="M12 17h.01" />
              </svg>
              <span>
                Cannot send: {form.city} is about{" "}
                {Math.round(
                  distanceToBranchKm(form.branch, form.province, form.city),
                )}
                km from {form.branch}, which is too far for this branch to
                respond. Please pick a closer branch.
              </span>
            </div>
          )}

        <div
          style={{
            marginTop: 12,
            padding: "8px 14px",
            background: "#fef3c7",
            border: "1px solid #fde68a",
            borderRadius: 8,
            fontSize: 12,
            color: "#92400e",
            display: "flex",
            alignItems: "flex-start",
            gap: 6,
          }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="#92400e"
            strokeWidth="2"
            strokeLinecap="round"
            style={{ width: 14, height: 14, flexShrink: 0, marginTop: 1 }}
          >
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
          </svg>
          <span>
            <strong>For life-threatening emergencies:</strong> Please also call
            us directly to ensure the fastest response possible.
          </span>
        </div>
      </div>
    );
  },
);

// ── Branch Status Cards ───────────────────────────────────────────────────────
const BranchCards = ({ alerts, branchAvailability }) => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
      gap: 10,
      marginTop: 20,
    }}
  >
    {BRANCHES.map((b) => {
      const branchAlerts = alerts.filter((a) => a.branch === b);
      const pending = branchAlerts.filter(
        (a) => (a.status || "pending") === "pending",
      ).length;
      const responding = branchAlerts.filter(
        (a) => a.status === "responding",
      ).length;
      const hasActive = pending > 0 || responding > 0;
      const isAvailable = branchAvailability[b] !== false; // default true if not set
      return (
        <div
          key={b}
          className="fade-in"
          style={{
            background: "var(--card)",
            borderRadius: 12,
            border: `1px solid ${!isAvailable ? "#fca5a5" : "var(--border)"}`,
            padding: "14px 16px",
            boxShadow: "var(--shadow)",
            animationDelay: `${0.25 + BRANCHES.indexOf(b) * 0.06}s`,
          }}
        >
          <p
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "var(--text)",
              margin: "0 0 6px",
              lineHeight: 1.3,
            }}
          >
            {b}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                flexShrink: 0,
                background: !isAvailable
                  ? "#94a3b8"
                  : hasActive
                    ? "#dc2626"
                    : "#16a34a",
                boxShadow: !isAvailable
                  ? "0 0 0 2px #f1f5f9"
                  : hasActive
                    ? "0 0 0 2px #fee2e2"
                    : "0 0 0 2px #dcfce7",
              }}
            />
            <span
              style={{
                fontSize: 11,
                color: !isAvailable
                  ? "#94a3b8"
                  : hasActive
                    ? "#dc2626"
                    : "#16a34a",
                fontWeight: 600,
              }}
            >
              {!isAvailable
                ? "Branch Unavailable"
                : hasActive
                  ? `${pending + responding} Alert${pending + responding > 1 ? "s" : ""} Active`
                  : "Emergency Line Available"}
            </span>
          </div>
          {!isAvailable && (
            <p
              style={{
                fontSize: 10,
                color: "#94a3b8",
                margin: "6px 0 0",
                lineHeight: 1.4,
              }}
            >
              Try another branch or call directly.
            </p>
          )}
        </div>
      );
    })}
  </div>
);

// ── Success Modal ─────────────────────────────────────────────────────────────
const SuccessModal = ({ onClose }) => (
  <div
    style={{
      position: "fixed",
      inset: 0,
      zIndex: 1000,
      background: "rgba(0,0,0,0.45)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <div
      style={{
        background: "var(--card)",
        borderRadius: 16,
        padding: "36px 32px",
        boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
        maxWidth: 380,
        width: "90%",
        textAlign: "center",
      }}
    >
      <div
        style={{
          marginBottom: 12,
          display: "flex",
          justifyContent: "center",
          color: "#dc2626",
        }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          style={{ width: 52, height: 52 }}
        >
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </svg>
      </div>
      <h2
        style={{
          fontSize: 18,
          fontWeight: 800,
          color: "#dc2626",
          margin: "0 0 8px",
        }}
      >
        Emergency Alert Sent!
      </h2>
      <p
        style={{
          fontSize: 13,
          color: "#64748b",
          margin: "0 0 24px",
          lineHeight: 1.6,
        }}
      >
        Your alert has been received by our staff. We will respond to your pet's
        emergency as fast as possible.
      </p>
      <div
        style={{
          background: "#fef3c7",
          border: "1px solid #fde68a",
          borderRadius: 8,
          padding: "10px 14px",
          fontSize: 12,
          color: "#92400e",
          marginBottom: 24,
          textAlign: "left",
          display: "flex",
          gap: 6,
          alignItems: "flex-start",
        }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="#92400e"
          strokeWidth="2"
          strokeLinecap="round"
          style={{ width: 14, height: 14, flexShrink: 0, marginTop: 1 }}
        >
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </svg>
        <span>
          <strong>For life-threatening cases:</strong> Please also call us
          directly for the fastest response.
        </span>
      </div>
      <button
        onClick={onClose}
        style={{
          width: "100%",
          padding: "11px",
          background: "#dc2626",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 700,
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        OK, Got It
      </button>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT — all hooks declared BEFORE any early return
// ─────────────────────────────────────────────────────────────────────────────
const CustomerEmergency = () => {
  // ── PATCH: replaced useBranchTables with useCurrentUser ──────────────────
  const { user, loading: userLoading } = useCurrentUser();

  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [branchAvailability, setBranchAvailability] = useState({});
  const [respondingToast, setRespondingToast] = useState(null);

  const userId = user?.id ?? null;
  const customerName = user?.fullName || user?.email || "Customer";

  const fetchAlerts = useCallback(async () => {
    if (userLoading || !userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    // Customers only see their own alerts — no branch filter needed here
    const { data, error } = await supabase
      .from("emergency_alerts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (!error) setAlerts(data || []);
    setLoading(false);
  }, [userLoading, userId]);

  useEffect(() => {
    if (userLoading) return;
    // Load branch availability
    const loadAvailability = async () => {
      const { data, error } = await supabase
        .from("branch_availability")
        .select("branch, available");
      if (data && data.length > 0) {
        const map = {};
        data.forEach((r) => {
          map[r.branch] = r.available;
        });
        // Fill in missing branches as true by default
        BRANCHES.forEach((b) => {
          if (map[b] === undefined) map[b] = true;
        });
        setBranchAvailability(map);
      } else {
        // No data at all — default everything to true
        const map = {};
        BRANCHES.forEach((b) => {
          map[b] = true;
        });
        setBranchAvailability(map);
      }
    };
    loadAvailability();
    const availCh = supabase
      .channel("branch-avail-customer-" + Date.now())
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "branch_availability" },
        (payload) => {
          if (payload.new?.branch) {
            setBranchAvailability((prev) => ({
              ...prev,
              [payload.new.branch]: payload.new.available,
            }));
          }
        },
      )
      .subscribe();

    fetchAlerts();

    const channel = supabase
      .channel(`customer-emergency-alerts-realtime-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "emergency_alerts",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setAlerts((prev) => [payload.new, ...prev].slice(0, 50));
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "emergency_alerts",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setAlerts((prev) => {
            const old = prev.find((a) => a.id === payload.new.id);
            if (
              old &&
              old.status !== "responding" &&
              payload.new.status === "responding"
            ) {
              setRespondingToast(payload.new.type || "your alert");
              setTimeout(() => setRespondingToast(null), 6000);
            }
            return prev.map((a) => (a.id === payload.new.id ? payload.new : a));
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "emergency_alerts" },
        (payload) => {
          setAlerts((prev) => prev.filter((a) => a.id !== payload.old.id));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(availCh);
    };
  }, [userLoading, fetchAlerts, userId]);

  const sendAlert = useCallback(
    async (formData) => {
      if (!formData.description.trim()) return;
      setSending(true);
      const payload = {
        type: formData.type,
        description: formData.description.trim(),
        guest_address: formData.description.trim(),
        branch: formData.branch,
        sent_by: customerName,
        user_id: userId,
        status: "pending",
        branch_id: user?.branchId ?? null,
        guest_contact: formData.contact_number?.trim() || null,
        patient_name: formData.patient_name?.trim() || null,
        pet_photo_url: formData.pet_photo_url || null,
      };
      const { error } = await supabase
        .from("emergency_alerts")
        .insert([payload])
        .select();
      if (error) {
        alert("Error: " + error.message);
        setSending(false);
        return;
      }
      setShowSuccess(true);
      setSending(false);
      return { success: true };
    },
    [customerName, userId, user?.branchId],
  );

  const S = {
    page: { width: "100%", minHeight: "100vh", display: "block" },
    topbar: {
      background: "var(--card)",
      borderBottom: "1px solid var(--border)",
      padding: "8px 12px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      position: "fixed",
      top: 68,
      left: "var(--current-sidebar-w, 62px)",
      right: 0,
      zIndex: 40,
      boxSizing: "border-box",
      gap: 6,
      flexWrap: "nowrap",
    },
    cont: {
      padding: "16px",
      paddingTop: 84,
      width: "100%",
      boxSizing: "border-box",
    },
  };

  // ── Early return AFTER all hooks ─────────────────────────────────────────
  if (userLoading) {
    return (
      <Layout isCustomer={true}>
        <div
          style={{
            padding: "24px 28px",
            paddingTop: "calc(var(--topbar-h) + var(--pagetop-h) + 20px)",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          {/* Banner skeleton */}
          <Skeleton w="100%" h={180} r={14} mb={24} />

          {/* Two-column grid skeleton */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 16,
            }}
          >
            {/* Report form skeleton */}
            <div
              style={{
                background: "var(--card, #fff)",
                borderRadius: 12,
                border: "1px solid var(--border)",
                padding: 24,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 16,
                }}
              >
                <Skeleton w={16} h={16} r="50%" />
                <Skeleton w="50%" h={15} r={6} />
              </div>
              <Skeleton w="80%" h={11} r={4} mb={20} />
              <Skeleton w="100%" h={1} r={0} mb={20} />
              <Skeleton w="30%" h={11} r={4} mb={6} />
              <Skeleton w="100%" h={38} r={8} mb={14} />
              <Skeleton w="40%" h={11} r={4} mb={6} />
              <Skeleton w="100%" h={100} r={8} mb={14} />
              <Skeleton w="35%" h={11} r={4} mb={6} />
              <Skeleton w="100%" h={38} r={8} mb={20} />
              <Skeleton w="100%" h={44} r={8} mb={12} />
              <Skeleton w="100%" h={48} r={8} />
            </div>

            {/* History panel skeleton */}
            <div
              style={{
                background: "var(--card, #fff)",
                borderRadius: 12,
                border: "1px solid var(--border)",
                padding: 24,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 4,
                }}
              >
                <Skeleton w={20} h={20} r={4} />
                <Skeleton w="55%" h={15} r={6} />
              </div>
              <Skeleton w="70%" h={11} r={4} mb={16} />
              <Skeleton w="100%" h={1} r={0} mb={16} />
              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    style={{
                      borderRadius: 10,
                      border: "1px solid #e2e8f0",
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
                      <Skeleton w="40%" h={13} r={5} />
                      <Skeleton w={60} h={20} r={20} />
                    </div>
                    <Skeleton w="90%" h={11} r={4} mb={6} />
                    <Skeleton w="35%" h={10} r={4} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Branch cards skeleton */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
              gap: 10,
              marginTop: 20,
            }}
          >
            {BRANCHES.map((_, i) => (
              <div
                key={i}
                style={{
                  background: "var(--card, #fff)",
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  padding: "14px 16px",
                }}
              >
                <Skeleton w="70%" h={12} r={5} mb={8} />
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Skeleton w={8} h={8} r="50%" />
                  <Skeleton w="80%" h={11} r={4} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
            Please log in
          </h2>
          <p style={{ fontSize: 13 }}>
            Your session could not be detected. Please sign in again.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout isCustomer={true}>
      {showSuccess && <SuccessModal onClose={() => setShowSuccess(false)} />}
      {respondingToast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 999999,
            background: "var(--card)",
            border: "1px solid #86efac",
            borderRadius: 12,
            boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
            padding: "14px 16px",
            maxWidth: 320,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 13,
              fontWeight: 700,
              color: "#16a34a",
            }}
          >
            🚨 Help is on the way!
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--muted)" }}>
            Our team is now responding to your report ({respondingToast}). A
            staff member will call you shortly — please keep your phone line
            open.
          </p>
        </div>
      )}
      <div style={S.page}>
        <div style={S.topbar} className="branches-topbar">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flex: 1,
              minWidth: 0,
              overflow: "hidden",
            }}
          >
            <img
              src="/icon/emergency_2.png"
              alt=""
              style={{
                width: 18,
                height: 18,
                flexShrink: 0,
                filter:
                  "brightness(0) saturate(100%) invert(17%) sepia(82%) saturate(1200%) hue-rotate(210deg)",
              }}
            />
            <div style={{ minWidth: 0 }}>
              <h1
                style={{
                  fontSize: 14,
                  fontWeight: 800,
                  color: "var(--text)",
                  margin: 0,
                  lineHeight: 1.2,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                Emergency Alert
              </h1>
              <p
                style={{
                  fontSize: 10,
                  color: "var(--muted)",
                  margin: 0,
                  lineHeight: 1.3,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                Report your pet's emergency directly to our staff
              </p>
            </div>
          </div>
          <button
            onClick={fetchAlerts}
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: "6px 10px",
              borderRadius: 8,
              border: "1.5px solid var(--border)",
              background: "var(--card, #fff)",
              cursor: "pointer",
              fontFamily: "inherit",
              color: "var(--text)",
              width: "auto",
              flexShrink: 0,
              whiteSpace: "nowrap",
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ width: 13, height: 13, marginRight: 5 }}
            >
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            Refresh
          </button>
        </div>

        <div style={S.cont}>
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
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 16,
            }}
          >
            {/* No default branch — the customer must actively choose one */}
            <div className="fade-in" style={{ animationDelay: "0.05s" }}>
              <ReportForm
                sending={sending}
                onSend={sendAlert}
                defaultBranch=""
                branchAvailability={branchAvailability}
              />
            </div>

            <div
              className="fade-in"
              style={{
                animationDelay: "0.15s",
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
                  gap: 8,
                  marginBottom: 4,
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--royal)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  style={{ width: 16, height: 16 }}
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
                <h3
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: "var(--royal)",
                    margin: 0,
                  }}
                >
                  My Emergency History
                </h3>
              </div>
              <p
                style={{
                  fontSize: 12,
                  color: "var(--muted)",
                  margin: "0 0 16px",
                }}
              >
                Track the status of alerts you've submitted.
              </p>
              <hr
                style={{
                  border: "none",
                  borderTop: "1px solid var(--border)",
                  marginBottom: 16,
                }}
              />

              {loading ? (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 12 }}
                >
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      style={{
                        borderRadius: 10,
                        border: "1px solid #e2e8f0",
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
                        <Skeleton w="40%" h={13} r={5} />
                        <Skeleton w={60} h={20} r={20} />
                      </div>
                      <Skeleton w="90%" h={11} r={4} mb={6} />
                      <Skeleton w="35%" h={10} r={4} />
                    </div>
                  ))}
                </div>
              ) : alerts.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 20px" }}>
                  <div
                    style={{
                      marginBottom: 12,
                      display: "flex",
                      justifyContent: "center",
                      color: "#16a34a",
                    }}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      style={{ width: 40, height: 40 }}
                    >
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                  </div>
                  <p
                    style={{
                      fontWeight: 700,
                      color: "var(--text)",
                      fontSize: 14,
                      margin: "0 0 6px",
                    }}
                  >
                    No emergency alerts submitted yet
                  </p>
                  <p style={{ color: "var(--muted)", fontSize: 12, margin: 0 }}>
                    Use the form to report your pet's emergency
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
                  {alerts.map((a) => (
                    <HistoryCard key={a.id} a={a} />
                  ))}
                </div>
              )}
            </div>
          </div>

          <BranchCards
            alerts={alerts}
            branchAvailability={branchAvailability}
          />
        </div>
      </div>
    </Layout>
  );
};

export default CustomerEmergency;
