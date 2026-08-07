import { useMemo, useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../../js/Utils/supabase";
import "../../styles/InformationSystemBranches.css";

/* ============================================================
*  Angeles Animal Care Hospital – Branch Information System
*  Self-contained React component (no external dependencies
*  beyond React itself + Tailwind-like inline styles)
* ============================================================ */

/* ── Utility: cn (classnames) ── */
function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

/* ── Lucide-style SVG Icons (inlined) ── */
const MapPin = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" />
  </svg>
);
const Clock = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);
const Phone = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.38 2 2 0 0 1 3.6 1.17h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.76a16 16 0 0 0 5.33 5.33l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);
const Search = ({ className, style }) => (
  <svg className={className} style={style} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
  </svg>
);
const ChevronDown = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6 9 6 6 6-6" />
  </svg>
);
const X = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18" /><path d="m6 6 12 12" />
  </svg>
);
const MapIcon = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" /><line x1="9" x2="9" y1="3" y2="18" /><line x1="15" x2="15" y1="6" y2="21" />
  </svg>
);
const ArrowRight = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
  </svg>
);
const Sparkles = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /><path d="M5 3v4" /><path d="M19 17v4" /><path d="M3 5h4" /><path d="M17 19h4" />
  </svg>
);
const Send = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" />
  </svg>
);
const Info = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
  </svg>
);
const Heart = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
  </svg>
);
const Shield = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
  </svg>
);
const AlertTriangle = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" />
  </svg>
);
const Bone = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 10c.7-.7 1.69 0 2.5 0a2.5 2.5 0 1 0 0-5 .5.5 0 0 1-.5-.5 2.5 2.5 0 1 0-5 0c0 .81.7 1.8 0 2.5l-7 7c-.7.7-1.69 0-2.5 0a2.5 2.5 0 0 0 0 5c.28 0 .5.22.5.5a2.5 2.5 0 1 0 5 0c0-.81-.7-1.8 0-2.5Z" />
  </svg>
);
const Stethoscope = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 2v2" /><path d="M5 2v2" /><path d="M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1" /><path d="M8 15a6 6 0 0 0 12 0v-3" /><circle cx="20" cy="10" r="2" />
  </svg>
);
const Syringe = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m18 2 4 4" /><path d="m17 7 3-3" /><path d="M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-2.5 0-3.4L15 5" /><path d="m9 11 4 4" /><path d="m5 19-3 3" /><path d="m14 4 6 6" />
  </svg>
);
const Pill = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" /><path d="m8.5 8.5 7 7" />
  </svg>
);
const Scalpel = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.5 3.5 9 15" /><path d="M9 15l-4.5 4.5a1.5 1.5 0 0 0 2.1 2.1L11 17" /><path d="m16.5 7.5 3-3" />
  </svg>
);
const ScanIcon = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" /><path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" /><line x1="7" x2="17" y1="12" y2="12" />
  </svg>
);
const Microscope = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 18h8" /><path d="M3 22h18" /><path d="M14 22a7 7 0 1 0 0-14h-1" /><path d="M9 14h2" /><path d="M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2Z" /><path d="M12 6V3a1 1 0 0 0-1-1H9.5a1 1 0 0 0-1 1v3" />
  </svg>
);
const Scissors = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><line x1="20" x2="8.12" y1="4" y2="15.88" /><line x1="14.47" x2="20" y1="14.48" y2="20" /><line x1="8.12" x2="12" y1="8.12" y2="12" />
  </svg>
);
const ShoppingBag = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" />
  </svg>
);
const Facebook = ({ className, style }) => (
  <svg className={className} style={style} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M22 12.06C22 6.53 17.52 2.04 12 2.04S2 6.53 2 12.06c0 4.99 3.66 9.13 8.44 9.88v-6.99H7.9v-2.89h2.54V9.85c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.44 2.89h-2.34V22c4.78-.75 8.44-4.89 8.44-9.94Z" />
  </svg>
);

/* ── Data ── */
const BRANCHES = [
  { id: 1, name: "Animal Care Hospital and Wellness Center", shortName: "Main Hospital", slug: "main-hospital", location: "Camachiles, Mabalacat City, Pampanga", lat: 15.19361315079041, lng: 120.58326675046828, region: "Central Luzon", type: "Hospital", tag: "Flagship Hospital", phone: "+63 919-067-5710", hours: "Open 24 / 7", services: ["Emergency Care", "Surgery", "Wellness", "Diagnostics", "Pharmacy", "Confinement"], isEmergency: true },
  { id: 2, name: "Angeles Pet Care Center – Mabiga", shortName: "Mabiga", slug: "mabiga", location: "Mabiga, Mabalacat City, Pampanga", lat: 15.208184858641259, lng: 120.57906383363806, region: "Central Luzon", type: "Clinic", tag: "Newly Opened", phone: "+63 (045) 000-0002", hours: "Mon–Sun · 8AM – 8PM", services: ["Consultation", "Vaccination", "Grooming"], isEmergency: false },
  { id: 3, name: "Angeles Pet Care Center – Friendship", shortName: "Friendship", slug: "friendship", location: "Friendship, Angeles City, Pampanga", lat: 15.136652961046165, lng: 120.56492647948312, region: "Central Luzon", type: "Clinic", tag: "Main Branch", phone: "+63 (045) 000-0003", hours: "Mon–Sun · 8AM – 8PM", services: ["Consultation", "Grooming", "Vaccination", "Pharmacy"], isEmergency: false },
  { id: 4, name: "Angeles Pet Care Center – Magalang", shortName: "Magalang", slug: "magalang", location: "Magalang, Pampanga", lat: 15.222566938150214, lng: 120.66177485250144, region: "Central Luzon", type: "Clinic", tag: null, phone: "+63 (045) 000-0004", hours: "Mon–Sun · 8AM – 7PM", services: ["Consultation", "Vaccination", "Grooming"], isEmergency: false },
  { id: 5, name: "Angeles Pet Care Center – San Fernando", shortName: "San Fernando", slug: "san-fernando", location: "San Fernando City, Pampanga", lat: 15.046763227392159, lng: 120.6696952101692, region: "Central Luzon", type: "Clinic", tag: null, phone: "+63 (045) 000-0005", hours: "Mon–Sun · 8AM – 8PM", services: ["Consultation", "Vaccination", "Grooming", "Pharmacy"], isEmergency: false },
  { id: 6, name: "Angeles Pet Care Center – Baguio", shortName: "Baguio", slug: "baguio", location: "Baguio City, Benguet", lat: 16.409453078055694, lng: 120.60083637951544, region: "CAR", type: "Clinic", tag: null, phone: "+63 (074) 000-0006", hours: "Mon–Sun · 8AM – 7PM", services: ["Consultation", "Vaccination", "Grooming"], isEmergency: false },
  { id: 7, name: "Angeles Pet Care Center – Tarlac", shortName: "Tarlac", slug: "tarlac", location: "Tarlac City, Tarlac", lat: 15.474645663508756, lng: 120.59270212552384, region: "Central Luzon", type: "Clinic", tag: null, phone: "+63 (045) 000-0007", hours: "Mon–Sun · 8AM – 7PM", services: ["Consultation", "Vaccination", "Grooming"], isEmergency: false },
  { id: 8, name: "Angeles Pet Care Center – Cabanatuan", shortName: "Cabanatuan", slug: "cabanatuan", location: "Cabanatuan City, Nueva Ecija", lat: 15.476150781734258, lng: 120.9512267371636, region: "Central Luzon", type: "Clinic", tag: null, phone: "+63 (044) 000-0008", hours: "Mon–Sun · 8AM – 7PM", services: ["Consultation", "Vaccination", "Grooming"], isEmergency: false },
  { id: 9, name: "Angeles Pet Care Center – Olongapo", shortName: "Olongapo", slug: "olongapo", location: "Olongapo City, Zambales", lat: 14.831106542250787, lng: 120.28053506598384, region: "Central Luzon", type: "Clinic", tag: null, phone: "+63 (047) 000-0009", hours: "Mon–Sun · 8AM – 7PM", services: ["Consultation", "Vaccination", "Grooming"], isEmergency: false },
  { id: 10, name: "Angeles Pet Care Center – Sucat", shortName: "Sucat", slug: "sucat", location: "Sucat, Parañaque City, Metro Manila", lat: 14.456176379926848, lng: 121.03637156412273, region: "NCR", type: "Clinic", tag: null, phone: "+63 (02) 000-0010", hours: "Mon–Sun · 8AM – 8PM", services: ["Consultation", "Vaccination", "Grooming", "Pharmacy"], isEmergency: false },
  { id: 11, name: "Angeles Pet Care Center – Cebu", shortName: "Cebu", slug: "cebu", location: "Cebu City, Cebu", lat: 10.385202520525738, lng: 123.97519838123732, region: "Visayas", type: "Clinic", tag: null, phone: "+63 (032) 000-0011", hours: "Mon–Sun · 8AM – 7PM", services: ["Consultation", "Vaccination", "Grooming"], isEmergency: false },
];

const REGION_COLORS = {
  "Central Luzon": { bg: "#e8e5ff", text: "#3d2fa0" },
  "NCR": { bg: "#ede9fe", text: "#7c3aed" },
  "CAR": { bg: "#d1fae5", text: "#065f46" },
  "Visayas": { bg: "#fef3c7", text: "#92400e" },
};

const REGIONS = ["All", ...Array.from(new Set(BRANCHES.map(b => b.region)))];
const TYPES = ["All", "Hospital", "Clinic"];

const TRIVIA_ITEMS = [
  { IconComp: Heart, tag: "Dog Fact", color: "#f59e0b", bg: "#fffbeb", title: "Dogs have a sense of time", body: "Studies show dogs can tell the difference between an hour and five hours. They adjust their excitement based on how long you've been gone." },
  { IconComp: Sparkles, tag: "Cat Fact", color: "#7c3aed", bg: "#f5f3ff", title: "Cats sleep 12–16 hours a day", body: "Cats are crepuscular predators — most active at dawn and dusk. Their long sleep conserves energy for hunting bursts." },
  { IconComp: Shield, tag: "Dog Health", color: "#3d2fa0", bg: "#e8e5ff", title: "Dental care prevents heart disease", body: "Periodontal bacteria in dogs can enter the bloodstream and damage heart valves. Brushing 3× per week reduces risk significantly." },
  { IconComp: AlertTriangle, tag: "Emergency Signs", color: "#dc2626", bg: "#fef2f2", title: "Normal pet temp: 38–39°C", body: "A temperature above 39.5°C indicates fever. Above 41°C is a life-threatening emergency requiring immediate care." },
  { IconComp: Bone, tag: "Nutrition", color: "#e11d48", bg: "#fff1f2", title: "Cooked bones are dangerous", body: "Cooked chicken, pork, and fish bones splinter easily and can puncture your pet's digestive tract — a life-threatening emergency." },
];

const FAQ_ITEMS = [
  { q: "What services do you offer?", a: "We offer consultations, vaccinations, grooming, surgery, emergency care, diagnostics, pharmacy, and confinement services depending on the branch." },
  { q: "Do I need an appointment?", a: "Walk-ins are welcome, but we recommend booking an appointment online or by phone to minimize waiting time." },
  { q: "Is the main hospital really open 24/7?", a: "Yes! Our Camachiles flagship hospital operates 24 hours a day, 7 days a week for emergencies and urgent care." },
  { q: "How do I book an appointment?", a: "You can book through our online portal by creating a customer account, or by calling your nearest branch directly." },
  { q: "What payment methods are accepted?", a: "We accept cash, major credit/debit cards, GCash, and Maya at all branches." },
];

const SERVICES = [
  { Icon: Stethoscope, title: "Consultation", desc: "Comprehensive check-ups and expert advice to keep your pet healthy at every stage of life.", color: "#3d2fa0", bg: "#e8e5ff" },
  { Icon: Syringe, title: "Vaccination", desc: "Core and lifestyle vaccines that protect your pet from common, preventable diseases.", color: "#f59e0b", bg: "#fffbeb" },
  { Icon: Pill, title: "Deworming", desc: "Routine parasite control to eliminate intestinal worms and keep your pet's gut healthy.", color: "#059669", bg: "#ecfdf5" },
  { Icon: Scalpel, title: "Surgery", desc: "Minor and major surgical procedures performed safely under expert veterinary care.", color: "#dc2626", bg: "#fef2f2" },
  { Icon: ScanIcon, title: "Imaging", desc: "On-site X-ray, ultrasound, and CT-scan for accurate, fast diagnostic imaging.", color: "#2563eb", bg: "#eff6ff" },
  { Icon: Microscope, title: "Diagnostic", desc: "In-house blood tests, test kits, and PCR testing for precise, timely results.", color: "#7c3aed", bg: "#f5f3ff" },
  { Icon: Scissors, title: "Grooming", desc: "Bathing, trimming, and full grooming services to keep your pet clean and comfortable.", color: "#db2777", bg: "#fdf2f8" },
  { Icon: ShoppingBag, title: "Pet Shop", desc: "Quality food, accessories, and supplies for every pet's everyday needs.", color: "#0d9488", bg: "#f0fdfa" },
];

// NOTE: global page CSS (fonts, keyframes, .slide-up, .pill, .branch-card,
// .flip-card, scrollbar, header/nav, etc.) now lives in
// InformationSystemBranches.css, imported at the top of this file.

function useSlideUp() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    const applyObserver = () => {
      document.querySelectorAll(".slide-up").forEach((el) => observer.observe(el));
    };
    applyObserver();
    const mutation = new MutationObserver(applyObserver);
    mutation.observe(document.body, { childList: true, subtree: true });
    return () => { observer.disconnect(); mutation.disconnect(); };
  }, []);
}

/* ── Tokens (replaces CSS vars) ── */
const T = {
  primary: "#3d2fa0",
  primaryFg: "#ffffff",
  accent: "#7c3aed",
  red: "#dc2626",
  amber: "#f59e0b",
  navy: "#1a1a4e",
  navyMid: "#2d1b69",
  bg: "#0f172a",
  card: "#ffffff",
  border: "#e0dcf8",
  muted: "#f3f0ff",
  mutedFg: "#6b5fa5",
  fg: "#1a1340",
};

/* ── Branch Detail Modal ── */
function BranchModal({ branch, onClose }) {
  if (!branch) return null;
  const isHospital = branch.type === "Hospital";
  const rc = REGION_COLORS[branch.region] || REGION_COLORS["Central Luzon"];

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "rgba(26,19,64,.45)", backdropFilter: "blur(6px)" }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="anim-scale-in"
        style={{ position: "relative", width: "100%", maxWidth: 520, background: T.card, borderRadius: 20, boxShadow: "0 32px 80px rgba(0,0,0,.25)", overflow: "hidden" }}
      >
        {/* top stripe */}
        <div style={{ height: 5, background: isHospital ? T.red : T.primary }} />

        <div style={{ padding: 24 }}>
          {/* Header row */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: isHospital ? "#fef2f2" : rc.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <MapPin className="" style={{ width: 20, height: 20, color: isHospital ? T.red : rc.text }} />
              </div>
              <div>
                <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, padding: "2px 8px", borderRadius: 4, background: isHospital ? "#fef2f2" : "#e8e5ff", color: isHospital ? T.red : T.primary }}>
                    {branch.type}
                  </span>
                  {branch.tag && (
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, padding: "2px 8px", borderRadius: 4, background: "#fffbeb", color: "#92400e", border: "1px solid #fde68a" }}>
                      {branch.tag}
                    </span>
                  )}
                </div>
                <h2 style={{ fontSize: 18, color: "#fff", lineHeight: 1.3, fontFamily: "'Poetsen One', sans-serif", WebkitTextStroke: "5px #05328A", paintOrder: "stroke fill" }}>{branch.name}</h2>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${T.border}`, background: T.muted, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: T.mutedFg, flexShrink: 0 }}
            >
              <X className="" style={{ width: 14, height: 14 }} />
            </button>
          </div>

          {/* Info grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
            {[
              { Icon: MapPin, label: "Address", value: branch.location },
              { Icon: Clock, label: "Hours", value: branch.hours, highlight: isHospital },
              { Icon: Phone, label: "Phone", value: branch.phone },
              { Icon: MapIcon, label: "Region", value: branch.region },
            ].map(({ Icon, label, value, highlight }) => (
              <div key={label} style={{ background: T.muted, borderRadius: 12, padding: 12, border: `1px solid ${T.border}` }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: T.mutedFg, marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 13, fontWeight: 500, display: "flex", alignItems: "flex-start", gap: 6, color: highlight ? T.red : T.fg }}>
                  <Icon className="" style={{ width: 13, height: 13, marginTop: 2, flexShrink: 0, color: highlight ? T.red : T.primary }} />
                  <span>{value}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Services */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: T.mutedFg, marginBottom: 10 }}>Services Offered</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {branch.services.map(s => (
                <span key={s} style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: .5, padding: "5px 10px", borderRadius: 8, background: rc.bg, color: rc.text, border: `1px solid ${rc.text}33` }}>
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, paddingTop: 16, borderTop: `1px solid ${T.border}` }}>
            <a href={`https://www.google.com/maps/search/?api=1&query=${branch.lat},${branch.lng}`} target="_blank" rel="noreferrer"
              style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 16px", borderRadius: 12, border: `1px solid ${T.border}`, background: T.muted, fontSize: 13, fontWeight: 600, color: T.mutedFg, textDecoration: "none" }}>
              <MapIcon className="" style={{ width: 14, height: 14 }} /> Directions
            </a>
            <a href={`tel:${branch.phone.replace(/\D/g, "")}`}
              style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 16px", borderRadius: 12, background: T.primary, color: "#fff", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
              <Phone className="" style={{ width: 14, height: 14 }} /> Call Branch
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Branch Card ── */
const BRANCH_IMAGES = {
  1: "/image/main-hospital-location.jpg",
  2: "/image/mabiga-location.jpg",
  3: "/image/Friendship-location.jpg",
  4: "/image/magalang-branch.jpg",
  5: "/image/San_Fernando-location.jpg",
  6: "/image/Baguio-location.jpg",
  7: "/image/Tarlac-location.jpg",
  8: "/image/cabanatuan-location.jpg",
  9: "/image/Ilongapo-location.jpg",
  10: "/image/sucat-locat.jpg",
  11: "/image/Cebu-location.jpg",
};

function BranchCard({ branch, index, onViewDetail }) {
  const isHospital = branch.type === "Hospital";
  const rc = REGION_COLORS[branch.region] || REGION_COLORS["Central Luzon"];

  return (
    <div
      className="flip-card anim-fade-up"
      style={{ height: 380, borderRadius: 18, animationDelay: `${index * 50}ms` }}
    >
      <div className="flip-inner" style={{ height: "100%" }}>

        {/* ── FRONT ── */}
        <article
          className="flip-front branch-card"
          style={{ border: `1px solid ${isHospital ? "#fca5a5" : T.border}`, display: "flex", flexDirection: "column" }}
        >
          <div style={{ height: 4, background: isHospital ? T.red : T.primary, flexShrink: 0 }} />
          <div style={{ padding: 20, display: "flex", flexDirection: "column", flex: 1 }}>

            {/* Top row */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 14 }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, padding: "2px 7px", borderRadius: 4, background: isHospital ? "#fef2f2" : "#e8e5ff", color: isHospital ? T.red : T.primary }}>
                  {branch.type}
                </span>
                {branch.tag && (
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, padding: "2px 7px", borderRadius: 4, background: "#fffbeb", color: "#92400e", border: "1px solid #fde68a" }}>
                    {branch.tag}
                  </span>
                )}
              </div>
              <span style={{ fontSize: 22, color: "#fff", fontWeight: 400, fontFamily: "'Poetsen One', sans-serif" }}>
                #{String(branch.id).padStart(2, "0")}
              </span>
            </div>

            <h3 style={{ fontSize: 19, color: "#fff", marginBottom: 8, lineHeight: 1.25, fontFamily: "'Poetsen One', sans-serif", WebkitTextStroke: "5px #05328A", paintOrder: "stroke fill" }}>{branch.shortName}</h3>

            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 7, background: rc.bg, color: rc.text, marginBottom: 14 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} />
              {branch.region}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
              {[
                { Icon: MapPin, value: branch.location, color: T.primary, textColor: T.mutedFg },
                { Icon: Clock, value: branch.hours, color: isHospital ? T.red : T.primary, textColor: isHospital ? T.red : T.mutedFg, bold: isHospital },
                { Icon: Phone, value: branch.phone, color: T.primary, textColor: T.mutedFg },
              ].map(({ Icon, value, color, textColor, bold }) => (
                <div key={value} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: textColor, fontWeight: bold ? 600 : 400 }}>
                  <Icon className="" style={{ width: 14, height: 14, marginTop: 2, flexShrink: 0, color }} />
                  <span>{value}</span>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 14 }}>
              {branch.services.slice(0, 3).map(s => (
                <span key={s} style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: .5, padding: "4px 8px", borderRadius: 5, background: T.muted, color: T.mutedFg }}>
                  {s}
                </span>
              ))}
              {branch.services.length > 3 && (
                <span style={{ fontSize: 10, fontWeight: 700, color: T.primary }}>+{branch.services.length - 3} more</span>
              )}
            </div>

            <div style={{ marginTop: "auto", paddingTop: 14, borderTop: `1px solid ${T.border}`, textAlign: "center" }}>
              <p style={{ fontSize: 11, color: T.mutedFg, opacity: .6 }}>Hover to see location →</p>
            </div>
          </div>
        </article>

        {/* ── BACK ── */}
        <div className="flip-back">
          <img src={BRANCH_IMAGES[branch.id]} alt={`${branch.shortName} location`} />
          <div className="flip-back-badge">
            <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>{branch.shortName}</div>
            <div style={{ fontSize: 11, opacity: .8, marginBottom: 12 }}>{branch.location}</div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <button
                onClick={() => onViewDetail(branch)}
                className="pill"
                style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, textTransform: "uppercase", padding: "7px 16px", borderRadius: 9, background: "#fff", color: T.primary, border: "none" }}
              >
                <ArrowRight className="" style={{ width: 13, height: 13 }} /> Details
              </button>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${branch.lat},${branch.lng}`}
                target="_blank" rel="noreferrer"
                style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 11, fontWeight: 700, textTransform: "uppercase", padding: "7px 16px", borderRadius: 9, background: "rgba(255,255,255,.2)", color: "#fff", border: "1px solid rgba(255,255,255,.4)", textDecoration: "none" }}
              >
                <MapIcon className="" style={{ width: 13, height: 13 }} /> Map
              </a>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

/* ── Skeleton Card ── */
function SkeletonCard() {
  return (
    <div style={{ background: T.card, borderRadius: 18, border: `1px solid ${T.border}`, overflow: "hidden", padding: 20 }}>
      <div className="skeleton" style={{ height: 4, marginBottom: 16 }} />
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
        <div className="skeleton" style={{ height: 18, width: 70 }} />
        <div className="skeleton" style={{ height: 28, width: 36 }} />
      </div>
      <div className="skeleton" style={{ height: 22, width: "75%", marginBottom: 8 }} />
      <div className="skeleton" style={{ height: 18, width: 90, marginBottom: 14 }} />
      {[1, 2, 3].map(i => (
        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <div className="skeleton" style={{ width: 14, height: 14, borderRadius: "50%", flexShrink: 0 }} />
          <div className="skeleton" style={{ height: 14, flex: 1 }} />
        </div>
      ))}
    </div>
  );
}

function FixedPortal({ children }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}

/* ── Header ── */
function Header({ onFAQClick }) {
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState("home");

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  useEffect(() => {
    const sections = ["emergency", "branches", "services", "ai", "pet-health", "faq"];

    const setup = () => {
      const els = sections.map(id => document.getElementById(id)).filter(Boolean);
      if (els.length === 0) return null;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setActiveSection(entry.target.id);
            } else if (entry.target.id === "emergency" && entry.boundingClientRect.top > 0) {
              setActiveSection("home");
            }
          });
        },
        { rootMargin: "-140px 0px -60% 0px", threshold: 0 }
      );

      els.forEach(el => observer.observe(el));
      return observer;
    };

    let observer = setup();
    const retry = setInterval(() => {
      if (!observer) observer = setup();
      else clearInterval(retry);
    }, 300);

    return () => { observer?.disconnect(); clearInterval(retry); };
  }, []);

  const [menuOpen, setMenuOpen] = useState(false);

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    setMenuOpen(false);
  };

  return (
    <header className="site-header" style={{ top: scrolled ? "8px" : "16px", transition: "top .3s" }}>
      <div style={{ background: "rgba(255,255,255,.95)", backdropFilter: "blur(12px)", borderRadius: 18, border: `1px solid ${T.border}`, boxShadow: scrolled ? "0 8px 40px rgba(61,47,160,.12)" : "0 4px 20px rgba(61,47,160,.07)", position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", height: 70 }}>

          {/* Logo */}
          <div
            style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const el = document.getElementById("page-top");
              if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          >
            <img
              src="/image/446805041_881106557364617_1125518808684788316_n.jpg"
              alt="Angeles Animal Care Logo"
              style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover" }}
            />
            <div>
              <div style={{ fontSize: 15, color: "#fff", fontFamily: "'Poetsen One', sans-serif", WebkitTextStroke: "5px #05328A", paintOrder: "stroke fill" }}>Angeles Animal Pet Care</div>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, color: "#05328A", fontFamily: "'Poetsen One', sans-serif" }}>Branch Network</div>
            </div>
          </div>

          {/* Hamburger */}
          <button
            className="header-hamburger pill"
            onClick={() => setMenuOpen(o => !o)}
            style={{ width: 38, height: 38, borderRadius: 10, background: T.muted, border: `1px solid ${T.border}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 5, cursor: "pointer" }}
          >
            {[0, 1, 2].map(i => <span key={i} style={{ width: 18, height: 2, borderRadius: 99, background: T.primary }} />)}
          </button>

          {/* Nav */}
          <nav className={`header-nav${menuOpen ? " open" : ""}`} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              onClick={() => scrollToSection("emergency")}
              className={`pill nav-link ${activeSection === "emergency" ? "active" : ""}`}
              style={{ fontSize: 13, fontWeight: 500, color: activeSection === "emergency" ? T.primary : T.mutedFg, padding: "7px 14px", borderRadius: 9, background: "transparent", border: "none", fontFamily: "'Poetsen One', sans-serif" }}
            >
              Emergency
            </button>
            <button
              onClick={() => scrollToSection("branches")}
              className={`pill nav-link ${activeSection === "branches" ? "active" : ""}`}
              style={{ fontSize: 13, fontWeight: 500, color: activeSection === "branches" ? T.primary : T.mutedFg, padding: "7px 14px", borderRadius: 9, background: "transparent", border: "none", fontFamily: "'Poetsen One', sans-serif" }}
            >
              Branches
            </button>
            <button
              onClick={() => scrollToSection("services")}
              className={`pill nav-link ${activeSection === "services" ? "active" : ""}`}
              style={{ fontSize: 13, fontWeight: 500, color: activeSection === "services" ? T.primary : T.mutedFg, padding: "7px 14px", borderRadius: 9, background: "transparent", border: "none", fontFamily: "'Poetsen One', sans-serif" }}
            >
              Services
            </button>
            <button
              onClick={() => scrollToSection("ai")}
              className={`pill nav-link ${activeSection === "ai" ? "active" : ""}`}
              style={{ fontSize: 13, fontWeight: 500, color: activeSection === "ai" ? T.primary : T.mutedFg, padding: "7px 14px", borderRadius: 9, background: "transparent", border: "none", fontFamily: "'Poetsen One', sans-serif" }}
            >
              AI Assistant
            </button>
            <button
              onClick={() => scrollToSection("pet-health")}
              className={`pill nav-link ${activeSection === "pet-health" ? "active" : ""}`}
              style={{ fontSize: 13, fontWeight: 500, color: activeSection === "pet-health" ? T.primary : T.mutedFg, padding: "7px 14px", borderRadius: 9, background: "transparent", border: "none", fontFamily: "'Poetsen One', sans-serif" }}
            >
              Pet Health
            </button>
            <button
              onClick={onFAQClick}
              className={`pill nav-link ${activeSection === "faq" ? "active" : ""}`}
              style={{ fontSize: 13, fontWeight: 500, color: activeSection === "faq" ? T.primary : T.mutedFg, padding: "7px 14px", borderRadius: 9, background: "transparent", border: "none", fontFamily: "'Poetsen One', sans-serif", webkittextstroke: "5px #05328A", paintorder: "stroke fill" }}
            >
              FAQ
            </button>
            <button
              className="pill"
              onClick={() => window.location.href = "/login"}
              style={{ fontSize: 13, fontWeight: 700, color: "#fff", background: T.primary, padding: "7px 16px", borderRadius: 9, border: "none", transition: "opacity .2s, transform .2s", fontFamily: "'Poetsen One', sans-serif" }}
              onMouseEnter={e => { e.currentTarget.style.opacity = ".85"; e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "translateY(0)"; }}
            >
              Sign In
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
}

/* ── Hero ── */
function Hero({ onBrowse }) {
  const stats = [
    { num: "11", label: "Locations Nationwide" },
    { num: "24/7", label: "Emergency Hospital" },
    { num: "10", label: "Veterinary Clinics" },
    { num: "4", label: "Regions & Growing" },
  ];
  return (
    <section style={{ position: "relative", minHeight: "85vh", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", paddingTop: 140, paddingBottom: 64, background: "#0f172a", position: "relative" }}>
      <div className="radial-glow" />
      {/* decorative circles */}
      <div style={{ position: "relative", zIndex: 10, maxWidth: 860, margin: "0 auto", padding: "0 24px", textAlign: "center" }}>
        <h1 className="anim-fade-up" style={{ fontSize: "clamp(36px,6vw,68px)", color: "#05328A", lineHeight: 1.1, marginBottom: 4, fontFamily: "'Poetsen One', sans-serif", WebkitTextStroke: "5px #ffffff", paintOrder: "stroke fill", marginTop: 0 }}>
          Compassionate care.
        </h1>
        <h1 className="anim-fade-up delay-100" style={{ fontSize: "clamp(36px,6vw,68px)", color: T.amber, lineHeight: 1.1, marginBottom: 20, fontFamily: "'Poetsen One', sans-serif", WebkitTextStroke: "4px #92400e", paintOrder: "stroke fill" }}>
          nationwide.
        </h1>

        <p className="anim-fade-up delay-200" style={{ fontSize: "clamp(14px,2vw,18px)", color: "rgba(255,255,255,.7)", maxWidth: 680, margin: "0 auto 36px", lineHeight: 1.7, fontFamily: "'Poetsen One', sans-serif" }}>
          Angeles Pet Care is renowned for its commitment to innovation and excellence in veterinary medicine. 10 Veterinary Clinics and 1 Veterinary Hospital, all committed to delivering advanced care, trusted expertise, and compassionate service.
        </p>

        {/* CTAs — stickers anchor to this wrapper specifically */}
        <div className="cta-wrap" style={{ position: "relative" }}>
          <div className="anim-fade-up delay-300" style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center", marginBottom: 56 }}>
            <button onClick={onBrowse} className="pill"
              style={{ padding: "14px 32px", borderRadius: 999, border: "2px solid #fff", background: "transparent", color: "#fff", fontSize: 15, fontWeight: 700, transition: "opacity .2s, transform .2s", fontFamily: "'Poetsen One', sans-serif" }}
              onMouseEnter={e => { e.currentTarget.style.opacity = ".85"; e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "translateY(0)"; }}>
              Browse Branches
            </button>
            <button className="pill"
              style={{ padding: "14px 32px", borderRadius: 999, border: "2px solid #fff", background: "#fff", color: "#05328A", fontSize: 15, fontWeight: 700, transition: "opacity .2s, transform .2s", fontFamily: "'Poetsen One', sans-serif" }}
              onMouseEnter={e => { e.currentTarget.style.opacity = ".85"; e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "translateY(0)"; }}>
              Book Appointment
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="stats-wrap" style={{ position: "relative" }}>
          <img
            src="../public/image/cat_wipe_bg.png"
            alt="Cute cat sticker"
            className="stats-sticker"
            style={{ position: "absolute", left: "2%", top: 0, transform: "translateY(-70%)", width: "clamp(64px,10vw,96px)", height: "auto", zIndex: 0, pointerEvents: "none", filter: "drop-shadow(0 6px 14px rgba(0,0,0,.4))" }}
          />
          <img
            src="../public/image/dog_wipe_bg.png"
            alt="Cute dog sticker"
            className="stats-sticker"
            style={{ position: "absolute", right: "2%", top: 0, transform: "translateY(-70%)", width: "clamp(70px,10.5vw,104px)", height: "auto", zIndex: 0, pointerEvents: "none", filter: "drop-shadow(0 6px 14px rgba(0,0,0,.4))" }}
          />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 12, justifyContent: "center", width: "100%" }}>
            {stats.map(s => (
              <div key={s.label} className="slide-up" style={{ position: "relative", zIndex: 1, background: "#fff", borderRadius: 18, padding: "18px 16px", textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,.2)", transition: "transform .2s, box-shadow .2s, opacity .2s", cursor: "default" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 16px 40px rgba(0,0,0,.3)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,.2)"; }}>
                <div style={{ fontSize: 36, fontWeight: 400, color: "#fff", fontFamily: "'Poetsen One', sans-serif", WebkitTextStroke: "5px #05328A", paintOrder: "stroke fill" }}>{s.num}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: `${T.navy}99`, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Emergency Banner ── */
function EmergencyBanner() {
  return (
    <section id="emergency" style={{ position: "relative", overflow: "hidden", padding: "56px 0", background: "#0f172a" }}>
      {/* Red bar */}
      <div style={{ position: "relative", zIndex: 10, maxWidth: 900, margin: "0 auto 28px", padding: "0 24px" }}>
        <div className="slide-up" style={{ background: T.red, borderRadius: 18, padding: "16px 24px", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", border: "2px solid #ffffff", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg xmlns="http://www.w3.org/2000/svg" height="22" width="22" viewBox="0 0 48 48" fill="#ffffff">
                <path d="M24 4C12.95 4 4 12.95 4 24s8.95 20 20 20 20-8.95 20-20S35.05 4 24 4zm-2 10h4v4h-4v-4zm0 8h4v12h-4V22z" />
              </svg>
            </div>
            <div style={{ color: "#fff" }}>
              <div style={{ fontSize: "clamp(16px,3vw,22px)", fontWeight: 400, textTransform: "uppercase", letterSpacing: 1, color: "#DC2626", fontFamily: "'Poetsen One', sans-serif", WebkitTextStroke: "5px #fff", paintOrder: "stroke fill" }}>PET EMERGENCY?</div>
              <div style={{ fontSize: 13, opacity: .9, fontFamily: "'Poetsen One', sans-serif" }}>Main Hospital in Camachiles is open 24/7</div>
            </div>
          </div>
          <button
            className="pill"
            onClick={() => window.location.href = "/emergency-guest"}
            style={{ background: "#fff", color: "#fff", padding: "10px 22px", borderRadius: 999, fontWeight: 700, fontSize: 13, border: "none", transition: "transform .2s", fontFamily: "'Poetsen One', sans-serif", WebkitTextStroke: "5px #DC2626", paintOrder: "stroke fill" }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; }}
          >
            Send Emergency
          </button>
        </div>
      </div>

      {/* Real branch map photo */}
      <div className="slide-up" style={{ position: "relative", zIndex: 10, maxWidth: 900, margin: "0 auto 44px", padding: "0 24px" }}>
        <div style={{ background: "#fff", borderRadius: 24, padding: 10, boxShadow: "0 24px 60px rgba(0,0,0,.35)", overflow: "hidden" }}>
          <img
            src="/image/489754169_1101655551976382_1839478234078227315_n.jpg"
            alt="Angeles Pet Care Center – Branches across the Philippines"
            style={{ width: "100%", height: "auto", borderRadius: 18, display: "block" }}
          />
        </div>
      </div>

      {/* Pet mascots flanking the map */}
      <div className="mascot-row" style={{ position: "relative", zIndex: 10, maxWidth: 900, margin: "-180px auto 0", padding: "0 24px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", pointerEvents: "none" }}>
        <img
          src="/image/cat_wipe_bg.png"
          alt="Cat mascot"
          style={{ width: "clamp(80px,10vw,130px)", height: "auto", objectFit: "contain", filter: "drop-shadow(0 8px 20px rgba(0,0,0,.5))", animation: "floatUp 3.5s ease-in-out infinite .6s" }}
        />
        <img
          src="/image/dog_wipe_bg.png"
          alt="Dog mascot"
          style={{ width: "clamp(90px,11vw,140px)", height: "auto", objectFit: "contain", filter: "drop-shadow(0 8px 20px rgba(0,0,0,.5))", animation: "floatUp 3s ease-in-out infinite" }}
        />
      </div>
    </section>
  );
}

/* ── Services Section ── */
function ServicesSection() {
  return (
    <section id="services" className="dark-section" style={{ paddingTop: 100, paddingBottom: 100 }}>
      <div className="radial-glow" />
      <img
        src="../public/image/cat_wipe_bg.png"
        alt="Cat sticker"
        style={{ position: "absolute", left: -30, bottom: 0, width: "clamp(110px,12vw,170px)", height: "auto", zIndex: 0, pointerEvents: "none", opacity: 0.95 }}
      />
      <img
        src="../public/image/dog_wipe_bg.png"
        alt="Dog sticker"
        style={{ position: "absolute", right: -30, bottom: 0, width: "clamp(110px,12vw,170px)", height: "auto", zIndex: 0, pointerEvents: "none", opacity: 0.95 }}
      />
      <div style={{ position: "relative", zIndex: 10, maxWidth: 1100, margin: "0 auto", padding: "0 24px" }}>

        <div className="slide-up" style={{ textAlign: "center", marginBottom: 48 }}>
          <h2 style={{ fontSize: "clamp(26px,4vw,44px)", color: "#fff", marginBottom: 12, fontFamily: "'Poetsen One', sans-serif", WebkitTextStroke: "5px #05328A", paintOrder: "stroke fill" }}>
            Our <em style={{ fontStyle: "normal", color: T.amber, WebkitTextStroke: "3px #92400e" }}>Services</em>
          </h2>
          <p style={{ color: "rgba(255,255,255,.6)", fontSize: 15, maxWidth: 560, margin: "0 auto" }}>
            From routine checkups to advanced diagnostics, every branch is equipped to care for your pet at every stage.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))", gap: 18 }}>
          {SERVICES.map((s, i) => (
            <div
              key={s.title}
              className="slide-up"
              style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 20, padding: "32px 22px", textAlign: "center", backdropFilter: "blur(8px)", transition: "transform .25s ease, box-shadow .25s ease, border-color .25s ease", transitionDelay: `${i * 50}ms` }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-6px)"; e.currentTarget.style.boxShadow = "0 16px 36px rgba(0,0,0,.3)"; e.currentTarget.style.borderColor = `${s.color}66`; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "rgba(255,255,255,.12)"; }}
            >
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: s.color, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px", boxShadow: `0 8px 20px ${s.color}55` }}>
                <s.Icon className="" style={{ width: 26, height: 26, color: "#fff" }} />
              </div>              <h3 style={{ fontSize: 17, color: "#fff", marginBottom: 8, fontFamily: "'Poetsen One', sans-serif", WebkitTextStroke: "5px #05328A", paintOrder: "stroke fill" }}>{s.title}</h3>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,.6)", lineHeight: 1.65 }}>{s.desc}</p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}

/* ── AI Section ── */
function AISection() {
  const [activeMsg, setActiveMsg] = useState(0);
  const messages = [
    { role: "bot", text: "Hi! I'm SeraphVet AI. Describe your pet's symptoms and I'll help you understand what might be going on." },
    { role: "user", text: "My dog has been vomiting and seems very tired since this morning." },
    { role: "bot", text: "I understand your concern. Vomiting combined with lethargy can have several causes. Can you tell me if your dog has eaten anything unusual?" },
  ];

  useEffect(() => {
    if (activeMsg >= messages.length) return;
    const t = setTimeout(() => setActiveMsg(m => m + 1), 1000 + activeMsg * 700);
    return () => clearTimeout(t);
  }, [activeMsg]);

  return (
    <section id="ai" className="dark-section" style={{ color: "#fff", paddingTop: 100, paddingBottom: 100 }}>
      <div className="radial-glow" />
      <div style={{ position: "absolute", inset: 0, opacity: .08, pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: 0, left: "25%", width: 320, height: 320, background: T.primary, borderRadius: "50%", filter: "blur(80px)" }} />
        <div style={{ position: "absolute", bottom: 0, right: "25%", width: 320, height: 320, background: T.accent, borderRadius: "50%", filter: "blur(80px)" }} />
      </div>

      <div style={{ position: "relative", zIndex: 10, maxWidth: 1100, margin: "0 auto", padding: "0 24px", display: "grid", gap: 32, gridTemplateColumns: "repeat(auto-fit, minmax(280px,1fr))", alignItems: "center" }}>
        {/* Left copy */}
        <div className="slide-up">
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 14px", borderRadius: 999, border: `1px solid ${T.primary}55`, background: `${T.primary}22`, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color: T.accent, marginBottom: 20 }}>
            <Sparkles className="" style={{ width: 13, height: 13 }} />
            SeraphVet AI
          </div>

          <h2 style={{ fontSize: "clamp(26px,4vw,44px)", lineHeight: 1.2, marginBottom: 20, fontFamily: "'Poetsen One', sans-serif", WebkitTextStroke: "5px #05328A", paintOrder: "stroke fill" }}>
            Worried about your{" "}
            <em style={{ color: "#455CD3", fontStyle: "normal", WebkitTextStroke: "3px #fff" }}>pet's symptoms?</em>
          </h2>

          <p style={{ fontSize: 16, opacity: .7, marginBottom: 28, lineHeight: 1.7 }}>
            Our AI assistant helps you understand what your pet might be experiencing — from minor issues to signs that need urgent veterinary attention.
          </p>

          {[
            { title: "Symptom Analysis", desc: "Our AI identifies patterns across hundreds of conditions" },
            { title: "Instant Guidance", desc: "Get immediate triage advice for home or vet care" },
            { title: "No Account Needed", desc: "Ask as a guest anytime — free and instant" },
          ].map((f, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 16 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: `${T.primary}33`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Sparkles className="" style={{ width: 14, height: 14, color: T.accent }} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{f.title}</div>
                <div style={{ fontSize: 13, opacity: .6 }}>{f.desc}</div>
              </div>
            </div>
          ))}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 24 }}>
            <button
              className="pill"
              onClick={() => window.location.href = "/guest-ai-chat"}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 22px", borderRadius: 12, background: T.primary, color: "#fff", fontSize: 14, fontWeight: 700, border: "none", transition: "opacity .2s, transform .2s" }}
              onMouseEnter={e => { e.currentTarget.style.opacity = ".85"; e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "translateY(0)"; }}
            >
              <Sparkles className="" style={{ width: 15, height: 15 }} /> Ask AI About My Pet
            </button>
            <button
              className="pill"
              onClick={() => window.location.href = "/login"}
              style={{ padding: "11px 22px", borderRadius: 12, border: "1px solid rgba(255,255,255,.2)", background: "transparent", color: "#fff", fontSize: 14, fontWeight: 600, transition: "opacity .2s, transform .2s" }}
              onMouseEnter={e => { e.currentTarget.style.opacity = ".85"; e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "translateY(0)"; }}
            >
              Sign in for full history
            </button>
          </div>

          <p style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 14, fontSize: 11, opacity: .45 }}>
            <Info className="" style={{ width: 13, height: 13 }} />
            AI guidance is informational only — always consult a licensed veterinarian.
          </p>
        </div>

        {/* Right chat */}
        <div className="slide-up" style={{ position: "relative" }}>
          <div style={{ background: "rgba(255,255,255,.06)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 20, padding: 22 }}>
            {/* Chat header */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 14, marginBottom: 14, borderBottom: "1px solid rgba(255,255,255,.1)" }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: T.primary, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🤖</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>SeraphVet AI</div>
                <div style={{ fontSize: 11, opacity: .6, display: "flex", alignItems: "center", gap: 6 }}>
                  <span className="anim-pulse-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80" }} />
                  Online · Ready to help
                </div>
              </div>
              <span style={{ marginLeft: "auto", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, padding: "3px 8px", borderRadius: 999, background: "rgba(74,222,128,.15)", color: "#4ade80", border: "1px solid rgba(74,222,128,.25)" }}>
                Guest
              </span>
            </div>

            {/* Messages */}
            <div style={{ minHeight: 200, display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
              {messages.slice(0, activeMsg).map((msg, i) => (
                <div key={i} className="anim-fade-in" style={{ display: "flex", gap: 8, flexDirection: msg.role === "user" ? "row-reverse" : "row" }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: msg.role === "bot" ? T.primary : "rgba(255,255,255,.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>
                    {msg.role === "bot" ? "🤖" : "🐕"}
                  </div>
                  <div style={{ padding: "9px 14px", borderRadius: msg.role === "bot" ? "4px 16px 16px 16px" : "16px 4px 16px 16px", fontSize: 13, maxWidth: "75%", background: msg.role === "bot" ? `${T.primary}33` : "rgba(255,255,255,.1)", border: `1px solid ${msg.role === "bot" ? `${T.primary}44` : "rgba(255,255,255,.15)"}` }}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {activeMsg < messages.length && messages[activeMsg]?.role === "bot" && (
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: T.primary, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>🤖</div>
                  <div style={{ padding: "12px 14px", borderRadius: "4px 16px 16px 16px", background: `${T.primary}33`, border: `1px solid ${T.primary}44`, display: "flex", gap: 4 }}>
                    {[0, 1, 2].map(j => <span key={j} className="anim-pulse-dot" style={{ width: 7, height: 7, borderRadius: "50%", background: `${T.primary}99`, animationDelay: `${j * .2}s` }} />)}
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.15)", borderRadius: 12, padding: "10px 14px" }}>
              <input readOnly placeholder="Describe your pet's symptoms…" style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#fff", fontSize: 13 }} />
              <button className="pill" style={{ width: 32, height: 32, borderRadius: 9, background: T.primary, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <Send className="" style={{ width: 13, height: 13, color: "#fff" }} />
              </button>
            </div>
          </div>

          {/* Floating badges — hidden on mobile to avoid overflow */}
          <div className="ai-badge" style={{ position: "absolute", top: -14, right: -14, background: "rgba(74,222,128,.15)", border: "1px solid rgba(74,222,128,.25)", backdropFilter: "blur(8px)", borderRadius: 12, padding: "8px 14px", textAlign: "center" }}>
            <div style={{ fontSize: 18, color: "#4ade80", fontFamily: "'Poetsen One', sans-serif", WebkitTextStroke: "1px rgba(74,222,128,.4)", paintOrder: "stroke fill" }}>24/7</div>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "rgba(74,222,128,.7)" }}>Available</div>
          </div>
          <div className="ai-badge" style={{ position: "absolute", bottom: -14, left: -14, background: `${T.primary}33`, border: `1px solid ${T.primary}55`, backdropFilter: "blur(8px)", borderRadius: 12, padding: "8px 14px", textAlign: "center" }}>
            <div style={{ fontSize: 18, color: T.accent, fontFamily: "'Poetsen One', sans-serif", WebkitTextStroke: "3px #fff", paintOrder: "stroke fill" }}>Free</div>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#e9d5ff" }}>No login</div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Section Divider ── */
function SectionDivider() {
  return (
    <div style={{ height: 2, background: "rgba(255,255,255,0.15)", margin: "0 auto", maxWidth: 900, borderRadius: 999 }} />
  );
}


/* ── Trivia Section ── */
const PET_DATA = {
  dog: {
    image: "/image/dog.png",
    label: "DOG",
    accent: "#f59e0b",
    accentBg: "linear-gradient(135deg, #fef3c7, #fde68a)",
    tabs: [
      { title: "Basic Information", content: `The dog (Canis lupus familiaris) is a domesticated mammal known for its loyalty, intelligence, and companionship. Dogs have been living alongside humans for thousands of years and are often considered one of the most versatile pets. Depending on the breed, a dog's lifespan typically ranges from 10 to 15 years, and their size can vary from very small to very large.` },
      { title: "Dog Breeds", content: `Common dog breeds include:\n• Golden Retriever\n• Labrador Retriever\n• German Shepherd\n• Siberian Husky\n• Pomeranian\n• Shih Tzu\n• Beagle` },
      { title: "Health & Diseases", content: `Dogs can experience various health conditions throughout their lives. Regular veterinary checkups, vaccinations, and proper nutrition help prevent many illnesses. Watch for: vomiting, diarrhea, loss of appetite, coughing, or unusual lethargy.\n\nCommon Diseases:\n• Rabies\n• Parvovirus\n• Distemper\n• Heartworm Disease\n• Tick Infestation` },
      { title: "Vaccination & Care", content: `Puppies require a series of vaccines during their first months, followed by booster shots. Regular grooming, dental care, exercise, and parasite prevention are essential.\n\nRecommended Vaccines:\n• Anti-Rabies Vaccine\n• 5-in-1 Vaccine\n• 8-in-1 Vaccine\n• Kennel Cough Vaccine` },
      { title: "Nutrition & Feeding", content: `A balanced diet is necessary for growth, energy, and immune health. Dogs require proteins, fats, vitamins, and minerals.\n\nRecommended Foods:\n• High-quality dog food\n• Cooked chicken\n• Cooked fish\n• Rice, vegetables, eggs\n\nFoods to Avoid:\n• Chocolate\n• Grapes & Raisins\n• Onions & Garlic\n• Alcohol` },
      { title: "Behavior & Facts", content: `Dogs are social animals that communicate through body language, vocalizations, and facial expressions. They can learn commands and form strong bonds with their owners.\n\nInteresting Facts:\n• Dogs have an exceptional sense of smell\n• Can understand dozens of words and commands\n• Puppies are born deaf and blind\n• Use tail movements to express emotions\n• Some dogs assist people with disabilities` },
    ],
  },
  cat: {
    image: "/image/cat.png",
    label: "CAT",
    accent: "#7c3aed",
    accentBg: "linear-gradient(135deg, #ede9fe, #ddd6fe)",
    tabs: [
      { title: "Basic Information", content: `The domestic cat (Felis catus) is a small carnivorous mammal that has been a companion to humans for thousands of years. Cats are known for their independence, agility, curiosity, and affectionate nature. They typically live between 12 and 18 years with proper care.` },
      { title: "Cat Breeds", content: `Common cat breeds include:\n• Persian\n• Siamese\n• Maine Coon\n• Bengal\n• British Shorthair\n• Ragdoll\n• Scottish Fold\n• Sphynx\n• American Shorthair\n• Russian Blue` },
      { title: "Health & Diseases", content: `Cats can develop illnesses caused by viruses, bacteria, parasites, genetics, or aging. Monitor for: loss of appetite, vomiting, diarrhea, excessive sleeping, or sudden behavior changes.\n\nCommon Diseases:\n• Rabies\n• Feline Upper Respiratory Infection\n• Feline Leukemia (FeLV)\n• Feline Immunodeficiency Virus (FIV)\n• Flea Infestation\n• Kidney Disease` },
      { title: "Vaccination & Care", content: `Kittens require a series of vaccines during their first few months, followed by booster vaccinations throughout adulthood.\n\nRecommended Vaccines:\n• Rabies Vaccine\n• FVRCP Vaccine\n• FeLV Vaccine\n\nBasic Care:\n• Regular brushing & nail trimming\n• Ear cleaning & dental care\n• Deworming\n• Annual health checkups` },
      { title: "Nutrition & Feeding", content: `Cats are obligate carnivores requiring nutrients found in animal-based proteins. Fresh water should always be available.\n\nRecommended Foods:\n• High-quality cat food\n• Cooked chicken & fish\n• Wet cat food\n• Cooked eggs\n\nFoods to Avoid:\n• Chocolate\n• Onions & Garlic\n• Grapes & Raisins\n• Alcohol & Caffeine\n• Raw bones` },
      { title: "Behavior & Facts", content: `Cats communicate through vocalizations, body posture, and tail movements. They are naturally curious and form strong bonds with their owners.\n\nInteresting Facts:\n• Cats sleep 12–16 hours each day\n• Each cat's nose print is unique\n• Cats can jump several times their own height\n• Whiskers help navigate tight spaces\n• Purring can signal comfort and healing` },
    ],
  },
};

function TriviaSection() {
  const [pet, setPet] = useState("dog");
  const [openTab, setOpenTab] = useState(null);
  const data = PET_DATA[pet];

  return (
    <section id="pet-health" className="dark-section" style={{ paddingTop: 100, paddingBottom: 100 }}>
      <div className="radial-glow" />
      <div style={{ position: "relative", zIndex: 10, maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>

        {/* Header */}
        <div className="slide-up" style={{ textAlign: "center", marginBottom: 40 }}>
          <h2 style={{ fontSize: "clamp(26px,4vw,44px)", color: "#fff", marginBottom: 12, fontFamily: "'Poetsen One', sans-serif", WebkitTextStroke: "5px #455CD3", paintOrder: "stroke fill" }}>
            Know Your Pet <em style={{ fontStyle: "normal", color: T.amber, WebkitTextStroke: "4px #92400e" }}>Better</em>
          </h2>
        </div>

        {/* Main card */}
        <div className="slide-up" style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 24, padding: 28, backdropFilter: "blur(8px)", overflowX: "hidden" }}>
          <div className="trivia-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 28, alignItems: "start" }}>

            {/* Left: pet image + switcher */}
            <div className="trivia-left" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, alignSelf: "stretch" }}>
              <div className="trivia-pet-img" style={{ width: "100%", maxWidth: 240, flex: 1, minHeight: 180, borderRadius: 20, background: data.accentBg, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", border: `2px solid ${data.accent}44` }}>
                <img src={data.image} alt={data.label} style={{ width: "75%", height: "75%", objectFit: "contain", filter: "drop-shadow(0 4px 12px rgba(0,0,0,.3))" }} />
              </div>
              {/* Switcher */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(0,0,0,.3)", borderRadius: 999, padding: "6px 14px", border: "1px solid rgba(255,255,255,.15)", alignSelf: "center" }}>
                <button
                  onClick={() => { setPet(p => p === "dog" ? "cat" : "dog"); setOpenTab(0); }}
                  className="pill"
                  style={{ width: 26, height: 26, borderRadius: "50%", background: "rgba(255,255,255,.15)", border: "1px solid rgba(255,255,255,.25)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, fontWeight: 700 }}
                >‹</button>
                <span style={{ fontSize: 13, fontWeight: 800, color: data.accent, letterSpacing: 2, textTransform: "uppercase", minWidth: 36, textAlign: "center" }}>{data.label}</span>
                <button
                  onClick={() => { setPet(p => p === "dog" ? "cat" : "dog"); setOpenTab(0); }}
                  className="pill"
                  style={{ width: 26, height: 26, borderRadius: "50%", background: "rgba(255,255,255,.15)", border: "1px solid rgba(255,255,255,.25)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, fontWeight: 700 }}
                >›</button>
              </div>
            </div>

            {/* Right: accordion tabs */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {data.tabs.map((tab, i) => (
                <div key={i} style={{ borderRadius: 12, border: `1px solid ${openTab === i ? data.accent + "66" : "rgba(255,255,255,.15)"}`, overflow: "hidden", transition: "border-color .2s" }}>
                  <button
                    onClick={() => setOpenTab(openTab === i ? -1 : i)}
                    className="pill"
                    style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 16px", background: openTab === i ? `${data.accent}22` : "rgba(255,255,255,.05)", border: "none", color: "#fff", fontSize: 13, fontWeight: 600, textAlign: "left", transition: "background .2s" }}
                  >
                    <span>{tab.title}</span>
                    <ChevronDown className="" style={{ width: 16, height: 16, color: data.accent, flexShrink: 0, transform: openTab === i ? "rotate(180deg)" : "rotate(0)", transition: "transform .25s" }} />
                  </button>
                  {openTab === i && (
                    <div className="anim-fade-in" style={{ padding: "12px 16px 14px", fontSize: 13, color: "rgba(255,255,255,.75)", lineHeight: 1.75, whiteSpace: "pre-line", borderTop: `1px solid ${data.accent}33` }}>
                      {tab.content}
                    </div>
                  )}
                </div>
              ))}
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}

/* ── Reviews Section ── */
function ReviewsSection() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supabase.from("reviews").select("*").order("created_at", { ascending: false }).limit(9)
      .then(({ data, error }) => {
        if (!active) return;
        if (!error) setReviews(data || []);
        setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const avgRating = reviews.length ? (reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length).toFixed(1) : null;

  return (
    <section id="reviews" className="dark-section" style={{ paddingTop: 100, paddingBottom: 100 }}>
      <div className="radial-glow" />
      <div style={{ position: "relative", zIndex: 10, maxWidth: 1100, margin: "0 auto", padding: "0 24px" }}>
        <div className="slide-up" style={{ textAlign: "center", marginBottom: 44 }}>
          <h2 style={{ fontSize: "clamp(26px,4vw,44px)", color: "#fff", marginBottom: 12, fontFamily: "'Poetsen One', sans-serif", WebkitTextStroke: "5px #05328A", paintOrder: "stroke fill" }}>
            What Pet Owners <em style={{ fontStyle: "normal", color: T.amber, WebkitTextStroke: "3px #92400e" }}>Say</em>
          </h2>
          {avgRating && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 6 }}>
              <div style={{ display: "flex", gap: 2 }}>
                {[1, 2, 3, 4, 5].map(s => (
                  <svg key={s} width="18" height="18" viewBox="0 0 24 24" fill={s <= Math.round(avgRating) ? "#f59e0b" : "none"} stroke={s <= Math.round(avgRating) ? "#f59e0b" : "rgba(255,255,255,.3)"} strokeWidth="1.5">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                ))}
              </div>
              <span style={{ color: "rgba(255,255,255,.7)", fontSize: 13, fontWeight: 600 }}>{avgRating} out of 5 ({reviews.length} reviews)</span>
            </div>
          )}
        </div>

        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px,1fr))", gap: 18 }}>
            {[1, 2, 3].map(i => (
              <div key={i} className="skeleton" style={{ height: 160, borderRadius: 18 }} />
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <p style={{ textAlign: "center", color: "rgba(255,255,255,.6)" }}>No reviews yet — be the first to share your experience!</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px,1fr))", gap: 18 }}>
            {reviews.map((r, i) => (
              <div key={r.id} className="slide-up" style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 18, padding: "22px 20px", backdropFilter: "blur(8px)", transitionDelay: `${i * 60}ms` }}>
                <div style={{ display: "flex", gap: 2, marginBottom: 10 }}>
                  {[1, 2, 3, 4, 5].map(s => (
                    <svg key={s} width="15" height="15" viewBox="0 0 24 24" fill={s <= (r.rating || 0) ? "#f59e0b" : "none"} stroke={s <= (r.rating || 0) ? "#f59e0b" : "rgba(255,255,255,.25)"} strokeWidth="1.5">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  ))}
                </div>
                {r.comment && <p style={{ fontSize: 14, color: "rgba(255,255,255,.8)", lineHeight: 1.7, marginBottom: 14 }}>"{r.comment}"</p>}
                <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{r.owner || "Pet Owner"}</div>
                {r.patient && <div style={{ fontSize: 12, color: "rgba(255,255,255,.5)" }}>Pet: {r.patient}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ── FAQ Section ── */
function FAQSection({ faqRef }) {  const [openIdx, setOpenIdx] = useState(null);

  return (
    <section ref={faqRef} id="faq" style={{ padding: "80px 0", background: "#f3f0ff" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, color: T.primary, marginBottom: 8 }}>FAQ</div>
          <h2 style={{ fontSize: "clamp(24px,4vw,38px)", color: "#fff", marginBottom: 12, fontFamily: "'Poetsen One', sans-serif", WebkitTextStroke: "7px #455CD3", paintOrder: "stroke fill" }}>Frequently Asked Questions</h2>
          <p style={{ color: T.mutedFg, fontSize: 15 }}>Quick answers to common questions about Angeles Animal Care Hospital.</p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {FAQ_ITEMS.map((item, i) => (
            <div key={i} className="slide-up" style={{ background: "#fff", borderRadius: 14, border: `1px solid ${T.border}`, overflow: "hidden", transitionDelay: `${i * 80}ms` }}>
              <button
                onClick={() => setOpenIdx(openIdx === i ? null : i)}
                className="pill"
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, padding: "18px 20px", textAlign: "left", background: "transparent", border: "none", fontSize: 15, fontWeight: 600, color: T.fg }}
              >
                {item.q}
                <ChevronDown className="" style={{ width: 18, height: 18, color: T.mutedFg, flexShrink: 0, transform: openIdx === i ? "rotate(180deg)" : "rotate(0)", transition: "transform .25s" }} />
              </button>
              {openIdx === i && (
                <div className="anim-fade-in" style={{ padding: "0 20px 18px", color: T.mutedFg, fontSize: 14, lineHeight: 1.7 }}>
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Footer ── */
function Footer({ onRegionClick }) {
  const byRegion = useMemo(() => {
    const map = {};
    BRANCHES.forEach(b => { if (!map[b.region]) map[b.region] = []; map[b.region].push(b); });
    return map;
  }, []);

  return (
    <footer style={{ background: "#0f172a", color: "#fff", position: "relative" }}>
      <div className="radial-glow" />
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "60px 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px,1fr))", gap: 28 }}>
          {/* Brand */}
          <div className="slide-up" style={{ gridColumn: "span 1" }}>
            <img
              src="/image/446805041_881106557364617_1125518808684788316_n.jpg"
              alt="Angeles Animal Care Logo"
              style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", marginBottom: 14 }}
            />
            <h3 style={{ fontSize: 18, marginBottom: 8, fontFamily: "'Poetsen One', sans-serif", WebkitTextStroke: "4px #455CD3", paintOrder: "stroke fill" }}>Angeles Animal Pet Care</h3>
            <p style={{ fontSize: 13, opacity: .6, lineHeight: 1.7, marginBottom: 14 }}>
              Providing compassionate veterinary care to pets across the Philippines since 2013.
            </p>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 9, background: `${T.red}33`, border: `1px solid ${T.red}44`, color: T.red, fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
              <Phone className="" style={{ width: 13, height: 13 }} />
              0919-067-5710
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, opacity: .5, marginBottom: 8 }}>Follow us</div>
              <a
                href="https://www.facebook.com/AngelesPetCareAnimalClinicAndHospital"
                target="_blank"
                rel="noreferrer"
                aria-label="Visit our Facebook page"
                style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: "50%", background: "#1877F2", color: "#fff", transition: "transform .2s, box-shadow .2s", flexShrink: 0, boxShadow: "0 2px 8px rgba(24,119,242,.4)" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 4px 14px rgba(24,119,242,.6)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(24,119,242,.4)"; }}
              >
                <Facebook className="" style={{ width: 14, height: 14 }} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, opacity: .5, marginBottom: 14 }}>Quick Links</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { label: "Find a Branch", href: "#branches" },
                { label: "FAQ", href: "#faq" },
                { label: "Patient Portal", href: "/login" },
                { label: "Create Account", href: "/login" },
                { label: "Book Appointment", href: "/login" },
              ].map(({ label, href }) => (
                <a
                  key={label}
                  href={href}
                  onClick={(e) => {
                    if (href.startsWith("#")) {
                      e.preventDefault();
                      const el = document.getElementById(href.slice(1));
                      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                    } else {
                      window.location.href = href;
                    }
                  }}
                  style={{ fontSize: 13, opacity: .7, color: "#fff", textDecoration: "none" }}
                >
                  {label}
                </a>
              ))}
            </div>
          </div>

          {/* Regions */}
          <div>
            <h4 style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, opacity: .5, marginBottom: 14 }}>Our Regions</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {Object.entries(byRegion).map(([region, branches]) => (
                <a
                  key={region}
                  href="#branches"
                  onClick={(e) => {
                    e.preventDefault();
                    onRegionClick?.(region);
                  }}
                  style={{ fontSize: 13, opacity: .7, color: "#fff", textDecoration: "none" }}
                >
                  {region} ({branches.length})
                </a>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div>
            <h4 style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, opacity: .5, marginBottom: 14 }}>Contact</h4>
            <div style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 8 }}>
              <p style={{ fontWeight: 700 }}>Main Hospital (24/7)</p>
              <p style={{ opacity: .6 }}>Camachiles, Mabalacat City, Pampanga</p>
              <p style={{ opacity: .6 }}>wellness.apcc@gmail.com</p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ borderTop: "1px solid rgba(255,255,255,.1)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 24px", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <p style={{ fontSize: 12, opacity: .5, margin: 0 }}>© {new Date().getFullYear()} Angeles Animal Care Hospital. All rights reserved.</p>
          </div>
          <div style={{ display: "flex", gap: 16 }}>
            {["Privacy Policy", "Terms of Service"].map(l => (
              <a key={l} href="#" style={{ fontSize: 12, opacity: .5, color: "#fff", textDecoration: "none" }}>{l}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ── Pills Filter ── */
function Pills({ label, options, value, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color: T.mutedFg }}>{label}:</span>
      {options.map(o => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className="pill"
          style={{ padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: value === o ? "linear-gradient(135deg, #60a5fa, #3b82f6)" : T.muted, color: value === o ? "#fff" : T.mutedFg, border: "none", backgroundImage: value === o ? "linear-gradient(135deg, #60a5fa, #3b82f6)" : "none" }}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

/* ── Main Export ── */
export default function InformationSystem() {
  useSlideUp();
  const [q, setQ] = useState("");
  const [region, setRegion] = useState("All");
  const [type, setType] = useState("All");
  const [loading, setLoading] = useState(true);
  const [selectedBranch, setSelectedBranch] = useState(null);

  const [scrolled, setScrolled] = useState(false);
  const faqRef = useRef(null);
  const branchRef = useRef(null);

  useEffect(() => {
    const h = () => {
      const rect = branchRef.current?.getBoundingClientRect();
      const branchTop = rect?.top ?? 999;
      setScrolled(branchTop <= 0);
    };
    h(); // run once immediately so the button reflects the correct state on load
    // capture:true is required here — plain "scroll" events don't bubble, so if
    // the page actually scrolls inside a nested container (common in app shells/
    // dashboard layouts) rather than the window itself, a listener on window would
    // never fire again after mount. Capture phase still sees it.
    window.addEventListener("scroll", h, true);
    window.addEventListener("resize", h);
    return () => {
      window.removeEventListener("scroll", h, true);
      window.removeEventListener("resize", h);
    };
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 1200);
    return () => clearTimeout(t);
  }, []);

  const filtered = useMemo(() => BRANCHES.filter(b => {
    const matchQ = !q || (b.name + b.location + b.region + b.services.join(" ")).toLowerCase().includes(q.toLowerCase());
    const matchR = region === "All" || b.region === region;
    const matchT = type === "All" || b.type === type;
    return matchQ && matchR && matchT;
  }), [q, region, type]);

  const scrollToFAQ = () => faqRef.current?.scrollIntoView({ behavior: "smooth" });
  const scrollToBranches = () => branchRef.current?.scrollIntoView({ behavior: "smooth" });

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a" }}>
      <div id="page-top" style={{ position: "absolute", top: 0, height: 1, width: 1 }} />
      <FixedPortal>
        <Header onFAQClick={scrollToFAQ} />
      </FixedPortal>

      {selectedBranch && (
        <FixedPortal>
          <BranchModal branch={selectedBranch} onClose={() => setSelectedBranch(null)} />
        </FixedPortal>
      )}
      <FixedPortal>
        <button
          onClick={() => document.getElementById("page-top")?.scrollIntoView({ behavior: "smooth", block: "start" })}
          title="Back to top"
          style={{
            position: "fixed", bottom: 28, right: 28, zIndex: 9000, width: 48, height: 48, borderRadius: "50%",
            background: T.primary, border: "none", color: "#fff", fontSize: 22, display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 20px rgba(61,47,160,.4)", cursor: "pointer",
            opacity: scrolled ? 1 : 0,
            transform: scrolled ? "translateY(0) scale(1)" : "translateY(12px) scale(.85)",
            pointerEvents: scrolled ? "auto" : "none",
            transition: "opacity .35s ease, transform .35s cubic-bezier(.34,1.56,.64,1)",
          }}
          onMouseEnter={e => { if (scrolled) e.currentTarget.style.transform = "translateY(-3px) scale(1)"; }}
          onMouseLeave={e => { if (scrolled) e.currentTarget.style.transform = "translateY(0) scale(1)"; }}
        >
          ↑
        </button>
      </FixedPortal>
      <Hero onBrowse={scrollToBranches} />
      <EmergencyBanner />

      {/* ── Branches Section ── */}
      <section ref={branchRef} id="branches" style={{ position: "relative", overflow: "hidden", padding: "80px 0", background: "#ffffff" }}>
        <img
          src="../public/image/cat_wipe_bg.png"
          alt="Cat sticker"
          className="branches-sticker-cat"
          style={{ position: "absolute", left: -20, bottom: -10, width: "clamp(64px,9vw,110px)", height: "auto", zIndex: 0, pointerEvents: "none", opacity: 0.95 }}
        />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 1100, margin: "0 auto", padding: "0 24px" }}>

          {/* Section header */}
          <div className="slide-up" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 20, marginBottom: 32 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, color: T.primary, marginBottom: 6 }}>Our Network</div>
              <h2 style={{ fontSize: "clamp(24px,4vw,38px)", color: "#ffffff", marginBottom: 6, fontFamily: "'Poetsen One', sans-serif", WebkitTextStroke: "8px #05328A", paintOrder: "stroke fill" }}>Find a branch near you</h2>
              <p style={{ color: T.mutedFg, fontSize: 15 }}>Filter by region or facility type to locate your nearest Angeles Pet Care location.</p>
            </div>
            <img
              src="../public/image/dog_wipe_bg.png"
              alt="Dog sticker"
              style={{ width: "clamp(64px,9vw,110px)", height: "auto", flexShrink: 0, pointerEvents: "none" }}
            />
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontSize: 40, color: "#fff", fontFamily: "'Poetsen One', sans-serif", WebkitTextStroke: "5px #05328A", paintOrder: "stroke fill" }}>{loading ? "—" : filtered.length}</span>
              <span style={{ fontSize: 13, color: T.mutedFg }}>of {BRANCHES.length} branches</span>
            </div>
          </div>

          {/* Controls */}
          <div className="slide-up" style={{ background: "#fff", borderRadius: 18, border: `1px solid ${T.border}`, padding: "16px 20px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16, marginBottom: 32, boxShadow: "0 2px 12px rgba(61,47,160,.06)" }}>
            <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
              <Search className="" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: T.mutedFg }} />
              <input
                type="text"
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Search by city, region, or service…"
                style={{ width: "100%", paddingLeft: 38, paddingRight: 14, paddingTop: 10, paddingBottom: 10, borderRadius: 12, border: `1px solid ${T.border}`, background: T.muted, fontSize: 14, outline: "none", fontFamily: "inherit", color: T.fg }}
              />
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
              <Pills label="Region" options={REGIONS} value={region} onChange={setRegion} />
              <Pills label="Type" options={TYPES} value={type} onChange={setType} />
            </div>
          </div>

          {/* Grid */}
          {loading ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 18, gridAutoRows: "380px" }}>
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "80px 0" }}>
              <Search className="" style={{ width: 40, height: 40, color: `${T.mutedFg}88`, margin: "0 auto 14px" }} />
              <p style={{ color: T.mutedFg, fontSize: 15 }}>No branches match your filters. Try adjusting your search.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 18 }}>
              {filtered.map((b, i) => (
                <div key={b.id} className="slide-up" style={{ transitionDelay: `${i * 60}ms` }}>
                  <BranchCard branch={b} index={i} onViewDetail={setSelectedBranch} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

       <ServicesSection />
      <div style={{ height: 24 }} />
      <AISection />
      <div style={{ height: 24 }} />
      <SectionDivider />
      <div style={{ height: 24 }} />
      <TriviaSection />
      <div style={{ height: 24 }} />
      <ReviewsSection />
      <div style={{ height: 24 }} />
      <FAQSection faqRef={faqRef} />
      <Footer
        onRegionClick={(region) => {
          setRegion(region);
          branchRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
      />
    </div>
  );
}