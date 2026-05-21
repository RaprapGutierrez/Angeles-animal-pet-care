import { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

/* ============================================================
 *  Angeles Animal Care Hospital – Branch Information System
 * ============================================================ */

const BRANCHES = [
  { id: 1,  name: "Animal Care Hospital and Wellness Center",  shortName: "Main Hospital",   slug: "main-hospital",   location: "Camachiles, Mabalacat City, Pampanga",  region: "Central Luzon", type: "Hospital", tag: "Flagship Hospital", phone: "+63 919-067-5710",   hours: "Open 24 / 7",         services: ["Emergency Care","Surgery","Wellness","Diagnostics","Pharmacy","Confinement"], isEmergency: true  },
  { id: 2,  name: "Angeles Pet Care Center – Mabiga",          shortName: "Mabiga",          slug: "mabiga",          location: "Mabiga, Mabalacat City, Pampanga",      region: "Central Luzon", type: "Clinic",   tag: "Newly Opened",      phone: "+63 (045) 000-0002", hours: "Mon–Sun · 8AM – 8PM",  services: ["Consultation","Vaccination","Grooming"], isEmergency: false },
  { id: 3,  name: "Angeles Pet Care Center – Friendship",      shortName: "Friendship",      slug: "friendship",      location: "Friendship, Angeles City, Pampanga",    region: "Central Luzon", type: "Clinic",   tag: "Main Branch",       phone: "+63 (045) 000-0003", hours: "Mon–Sun · 8AM – 8PM",  services: ["Consultation","Grooming","Vaccination","Pharmacy"], isEmergency: false },
  { id: 4,  name: "Angeles Pet Care Center – Magalang",        shortName: "Magalang",        slug: "magalang",        location: "Magalang, Pampanga",                    region: "Central Luzon", type: "Clinic",   tag: null,                phone: "+63 (045) 000-0004", hours: "Mon–Sun · 8AM – 7PM",  services: ["Consultation","Vaccination","Grooming"], isEmergency: false },
  { id: 5,  name: "Angeles Pet Care Center – San Fernando",    shortName: "San Fernando",    slug: "san-fernando",    location: "San Fernando City, Pampanga",           region: "Central Luzon", type: "Clinic",   tag: null,                phone: "+63 (045) 000-0005", hours: "Mon–Sun · 8AM – 8PM",  services: ["Consultation","Vaccination","Grooming","Pharmacy"], isEmergency: false },
  { id: 6,  name: "Angeles Pet Care Center – Baguio",          shortName: "Baguio",          slug: "baguio",          location: "Baguio City, Benguet",                  region: "CAR",           type: "Clinic",   tag: null,                phone: "+63 (074) 000-0006", hours: "Mon–Sun · 8AM – 7PM",  services: ["Consultation","Vaccination","Grooming"], isEmergency: false },
  { id: 7,  name: "Angeles Pet Care Center – Tarlac",          shortName: "Tarlac",          slug: "tarlac",          location: "Tarlac City, Tarlac",                   region: "Central Luzon", type: "Clinic",   tag: null,                phone: "+63 (045) 000-0007", hours: "Mon–Sun · 8AM – 7PM",  services: ["Consultation","Vaccination","Grooming"], isEmergency: false },
  { id: 8,  name: "Angeles Pet Care Center – Cabanatuan",      shortName: "Cabanatuan",      slug: "cabanatuan",      location: "Cabanatuan City, Nueva Ecija",          region: "Central Luzon", type: "Clinic",   tag: null,                phone: "+63 (044) 000-0008", hours: "Mon–Sun · 8AM – 7PM",  services: ["Consultation","Vaccination","Grooming"], isEmergency: false },
  { id: 9,  name: "Angeles Pet Care Center – Olongapo",        shortName: "Olongapo",        slug: "olongapo",        location: "Olongapo City, Zambales",               region: "Central Luzon", type: "Clinic",   tag: null,                phone: "+63 (047) 000-0009", hours: "Mon–Sun · 8AM – 7PM",  services: ["Consultation","Vaccination","Grooming"], isEmergency: false },
  { id: 10, name: "Angeles Pet Care Center – Sucat",           shortName: "Sucat",           slug: "sucat",           location: "Sucat, Parañaque City, Metro Manila",   region: "NCR",           type: "Clinic",   tag: null,                phone: "+63 (02) 000-0010",  hours: "Mon–Sun · 8AM – 8PM",  services: ["Consultation","Vaccination","Grooming","Pharmacy"], isEmergency: false },
  { id: 11, name: "Angeles Pet Care Center – Cebu",            shortName: "Cebu",            slug: "cebu",            location: "Cebu City, Cebu",                       region: "Visayas",       type: "Clinic",   tag: null,                phone: "+63 (032) 000-0011", hours: "Mon–Sun · 8AM – 7PM",  services: ["Consultation","Vaccination","Grooming"], isEmergency: false },
];

const BRANCH_ROUTES = {};

const BRANCH_IMAGES = {
  "main-hospital": "/image/main-hospital-location.jpg",
  "mabiga":        "/image/mabiga-location.jpg",
  "friendship":    "/image/Friendship-location.jpg",
  "magalang":      "/image/magalang-branch.jpg",
  "san-fernando":  "/image/San_Fernando-location.jpg",
  "baguio":        "/image/Baguio-location.jpg",
  "tarlac":        "/image/Tarlac-location.jpg",
  "cabanatuan":    "/image/cabanatuan-location.jpg",
  "olongapo":      "/image/Ilongapo-location.jpg",
  "sucat":         "/image/sucat-locat.jpg",
  "cebu":          "/image/Cebu-location.jpg",
};

const DOG_SHAPE = (color) => (
  <svg viewBox="0 0 64 64" width="32" height="32" fill={color}>
    <ellipse cx="32" cy="40" rx="18" ry="16"/>
    <ellipse cx="32" cy="22" rx="12" ry="11"/>
    <ellipse cx="21" cy="14" rx="6" ry="9" transform="rotate(-20 21 14)"/>
    <ellipse cx="43" cy="14" rx="6" ry="9" transform="rotate(20 43 14)"/>
    <ellipse cx="26" cy="24" rx="3" ry="2"/>
    <ellipse cx="38" cy="24" rx="3" ry="2"/>
    <ellipse cx="32" cy="29" rx="4" ry="3"/>
    <ellipse cx="18" cy="52" rx="4" ry="7" transform="rotate(10 18 52)"/>
    <ellipse cx="46" cy="52" rx="4" ry="7" transform="rotate(-10 46 52)"/>
  </svg>
);

const CAT_SHAPE = (color) => (
  <svg viewBox="0 0 64 64" width="32" height="32" fill={color}>
    <ellipse cx="32" cy="40" rx="17" ry="15"/>
    <ellipse cx="32" cy="23" rx="12" ry="11"/>
    <polygon points="20,14 14,2 26,10"/>
    <polygon points="44,14 50,2 38,10"/>
    <ellipse cx="26" cy="24" rx="2.5" ry="2"/>
    <ellipse cx="38" cy="24" rx="2.5" ry="2"/>
    <ellipse cx="32" cy="29" rx="3" ry="2"/>
    <ellipse cx="48" cy="42" rx="3" ry="10" transform="rotate(-30 48 42)"/>
    <ellipse cx="18" cy="54" rx="4" ry="6"/>
    <ellipse cx="46" cy="54" rx="4" ry="6"/>
  </svg>
);

const PAW_SHAPE = (color) => (
  <svg viewBox="0 0 64 64" width="32" height="32" fill={color}>
    <ellipse cx="32" cy="42" rx="14" ry="12"/>
    <ellipse cx="16" cy="28" rx="6" ry="8"/>
    <ellipse cx="32" cy="24" rx="6" ry="8"/>
    <ellipse cx="48" cy="28" rx="6" ry="8"/>
    <ellipse cx="24" cy="34" rx="5" ry="7"/>
  </svg>
);

const HEART_SHAPE = (color) => (
  <svg viewBox="0 0 64 64" width="32" height="32" fill={color}>
    <path d="M32 54 C32 54 6 38 6 22 C6 14 12 8 20 8 C25 8 30 11 32 15 C34 11 39 8 44 8 C52 8 58 14 58 22 C58 38 32 54 32 54Z"/>
  </svg>
);

const SHIELD_SHAPE = (color) => (
  <svg viewBox="0 0 64 64" width="32" height="32" fill={color}>
    <path d="M32 4 L54 14 L54 34 C54 46 44 56 32 60 C20 56 10 46 10 34 L10 14 Z"/>
  </svg>
);

const WARN_SHAPE = (color) => (
  <svg viewBox="0 0 64 64" width="32" height="32" fill={color}>
    <polygon points="32,4 60,58 4,58"/>
    <rect x="29" y="20" width="6" height="20" fill="#0a1628"/>
    <rect x="29" y="44" width="6" height="6" fill="#0a1628"/>
  </svg>
);

const LEAF_SHAPE = (color) => (
  <svg viewBox="0 0 64 64" width="32" height="32" fill={color}>
    <ellipse cx="32" cy="32" rx="20" ry="28" transform="rotate(-20 32 32)"/>
    <line x1="32" y1="10" x2="32" y2="58" stroke="#0a1628" strokeWidth="2"/>
  </svg>
);

const BONE_SHAPE = (color) => (
  <svg viewBox="0 0 64 64" width="32" height="32" fill={color}>
    <rect x="18" y="26" width="28" height="12" rx="6"/>
    <circle cx="14" cy="22" r="8"/>
    <circle cx="14" cy="42" r="8"/>
    <circle cx="50" cy="22" r="8"/>
    <circle cx="50" cy="42" r="8"/>
  </svg>
);

const TRIVIA_ITEMS_EXTENDED = [
  { shape: DOG_SHAPE,    tag:"Dog Fact",        category:"Dog",       color:"#f0b429", title:"Dogs have a sense of time", body:"Studies show dogs can tell the difference between an hour and five hours. They adjust their excitement level based on how long you've been gone — longer absence, more enthusiastic greeting! Dogs also follow daily routines and can anticipate regular events like feeding time or walks." },
  { shape: CAT_SHAPE,    tag:"Cat Fact",        category:"Cat",       color:"#a78bfa", title:"Cats sleep 12–16 hours a day", body:"Cats are crepuscular predators — most active at dawn and dusk. Their long sleep periods conserve energy for hunting bursts, even in domestic cats who've never hunted. Kittens and senior cats can sleep up to 20 hours a day." },
  { shape: SHIELD_SHAPE, tag:"Dog Health",      category:"Health",    color:"#34d399", title:"Regular dental care prevents heart disease", body:"Periodontal bacteria in dogs can enter the bloodstream and damage heart valves. Brushing your dog's teeth 3x per week significantly reduces this risk. Signs of dental disease include bad breath, yellow tartar, and reluctance to eat hard food." },
  { shape: CAT_SHAPE,    tag:"Cat Health",      category:"Health",    color:"#34d399", title:"Cats are obligate carnivores", body:"Unlike dogs, cats cannot synthesize taurine and arachidonic acid on their own. A diet lacking these animal-sourced nutrients causes dilated cardiomyopathy, retinal degeneration, and reproductive failure. Never feed cats a vegan diet." },
  { shape: DOG_SHAPE,    tag:"Behavior",        category:"Behavior",  color:"#60a5fa", title:"Tail wagging direction matters", body:"A tail wagging to the right signals positive feelings; to the left signals negative or anxious emotions. Speed and height also matter — a stiff, high wag can signal alertness or aggression, while a relaxed, low wag indicates friendliness." },
  { shape: CAT_SHAPE,    tag:"Behavior",        category:"Behavior",  color:"#60a5fa", title:"Slow blinking is a cat kiss", body:"When a cat slowly closes and opens its eyes at you, it's expressing deep trust and affection — the feline equivalent of a smile. You can 'slow blink' back to bond. Cats that do this with strangers are showing exceptional trust." },
  { shape: SHIELD_SHAPE, tag:"Prevention",      category:"Health",    color:"#34d399", title:"Vaccines need annual boosters", body:"Core vaccines like distemper, hepatitis, and parvovirus require yearly or 3-year boosters to maintain immunity. Puppies need a series starting at 6–8 weeks; kittens at 8 weeks. Missing boosters can leave your pet vulnerable even if previously vaccinated." },
  { shape: WARN_SHAPE,   tag:"Parasite Alert",  category:"Health",    color:"#fb923c", title:"Heartworm is transmitted by mosquitoes", body:"A single infected mosquito bite can transmit heartworm larvae to your dog or cat. Adult worms grow up to 30cm long inside the heart and lungs. Treatment is expensive, painful, and risky — monthly preventive medication costs less than ₱500/month." },
  { shape: PAW_SHAPE,    tag:"Fun Fact",        category:"Dog",       color:"#f0b429", title:"Dogs' noses are like fingerprints", body:"No two dogs have the same nose print pattern. The ridges and creases are unique identifiers — some kennel clubs already use nose prints for dog identification. Dogs also have a second smell organ called the Jacobson's organ that detects chemical signals undetectable to humans." },
  { shape: BONE_SHAPE,   tag:"Nutrition",       category:"Nutrition", color:"#f472b6", title:"Cooked bones are dangerous for pets", body:"Cooked chicken, pork, and fish bones splinter easily and can puncture or block your pet's digestive tract — a life-threatening emergency requiring surgery. Raw meaty bones are generally safer for dogs but always supervise and choose size-appropriate options." },
  { shape: WARN_SHAPE,   tag:"Emergency Signs", category:"Emergency", color:"#ef4444", title:"Normal pet temperature: 38–39°C", body:"A temperature above 39.5°C indicates fever. Above 41°C is a life-threatening emergency that can cause brain damage within minutes. Causes include infection, heatstroke, and toxin ingestion. Check with a rectal thermometer — ear thermometers are less accurate." },
  { shape: CAT_SHAPE,    tag:"Cat Fact",        category:"Cat",       color:"#a78bfa", title:"Indoor cats live nearly twice as long", body:"The average outdoor cat lives only 2–5 years; indoor cats live 12–18 years. Outdoor risks include vehicle strikes, dog attacks, infectious diseases like FIV and FeLV, parasites, and toxin exposure. An indoor cat with enrichment lives a longer, healthier life." },
  { shape: LEAF_SHAPE,   tag:"Nutrition",       category:"Nutrition", color:"#f472b6", title:"Cats are chronically dehydrated", body:"In the wild, cats get most moisture from prey (65–70% water). Dry kibble is only 10% water. Most cats on dry food diets are chronically mildly dehydrated, stressing the kidneys over time. Adding wet food or a water fountain significantly improves hydration." },
  { shape: HEART_SHAPE,  tag:"Dog Health",      category:"Health",    color:"#34d399", title:"Spaying/neutering extends life expectancy", body:"Spayed female dogs live 23% longer on average; neutered males 18% longer. Benefits include eliminating uterine infections (pyometra), drastically reducing mammary and testicular cancer risk, and reducing roaming behavior that leads to accidents." },
  { shape: CAT_SHAPE,    tag:"Cat Behavior",    category:"Behavior",  color:"#60a5fa", title:"Cats hide pain and illness", body:"Cats evolved as both predator and prey, making them masters at hiding weakness. By the time a cat shows obvious signs of illness — reduced appetite, lethargy, hiding — the condition is often advanced. Annual vet checkups are critical for early detection." },
  { shape: DOG_SHAPE,    tag:"Dog Behavior",    category:"Behavior",  color:"#60a5fa", title:"Dogs dream just like humans", body:"During REM sleep, dogs experience brain activity nearly identical to humans. They twitch, paddle their paws, and make sounds — likely replaying the day's events. Puppies and senior dogs dream more frequently than adult dogs." },
  { shape: BONE_SHAPE,   tag:"Nutrition",       category:"Nutrition", color:"#f472b6", title:"Obesity is the #1 preventable disease", body:"Over 50% of dogs and cats in the Philippines are overweight. Obesity leads to diabetes, joint disease, heart problems, and shortened lifespan by up to 2.5 years. A dog should have a visible waist and ribs you can feel — not see — under a thin fat layer." },
  { shape: WARN_SHAPE,   tag:"Toxic Foods",     category:"Emergency", color:"#ef4444", title:"Common human foods that kill pets", body:"Grapes and raisins cause acute kidney failure in dogs even in tiny amounts. Xylitol (in sugar-free gum) causes fatal liver failure. Onions and garlic destroy red blood cells. Chocolate causes seizures and heart arrhythmias. Keep these away from all pets." },
];

const FAQ_ITEMS = [
  { q: "What services do you offer?", a: "We offer consultations, vaccinations, grooming, surgery, emergency care, diagnostics, pharmacy, and confinement services depending on the branch." },
  { q: "Do I need an appointment?", a: "Walk-ins are welcome, but we recommend booking an appointment online or by phone to minimize waiting time." },
  { q: "Is the main hospital really open 24/7?", a: "Yes! Our Camachiles flagship hospital operates 24 hours a day, 7 days a week for emergencies and urgent care." },
  { q: "How do I book an appointment?", a: "You can book through our online portal by creating a customer account, or by calling your nearest branch directly." },
  { q: "What payment methods are accepted?", a: "We accept cash, major credit/debit cards, GCash, and Maya at all branches." },
  { q: "Do you treat all types of animals?", a: "We primarily treat companion animals (dogs and cats). Please call your nearest branch to inquire about exotic or other pets." },
];

const REGIONS_META = {
  "Central Luzon": { color: "#2563eb", bg: "#dbeafe" },
  "NCR":           { color: "#7c3aed", bg: "#ede9fe" },
  "CAR":           { color: "#059669", bg: "#d1fae5" },
  "Visayas":       { color: "#d97706", bg: "#fef3c7" },
};

const REGIONS = ["All", ...Array.from(new Set(BRANCHES.map((b) => b.region)))];
const TYPES   = ["All", "Hospital", "Clinic"];

/* ── Branch Detail Modal ── */
function BranchModal({ branch, onClose }) {
  if (!branch) return null;
  const isHospital = branch.type === "Hospital";
  const regionMeta = REGIONS_META[branch.region] || { color:"#2563eb", bg:"#dbeafe" };
  const accentColor = isHospital ? "#dc2626" : regionMeta.color;
  const branchImage = BRANCH_IMAGES[branch.slug];

  return (
    <div style={{ position:"fixed", inset:0, zIndex:500, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", padding:20, backdropFilter:"blur(4px)" }} onClick={onClose}>
      <div style={{ background:"#fff", borderRadius:20, width:"100%", maxWidth:600, maxHeight:"90vh", overflowY:"auto", boxShadow:"0 24px 64px rgba(0,0,0,0.35)", animation:"cardIn 0.3s ease both" }} onClick={e => e.stopPropagation()}>

        {/* Accent top bar */}
        <div style={{ height:6, background:accentColor, borderRadius:"20px 20px 0 0" }} />

        {/* Header */}
        <div style={{ padding:"20px 24px 0", display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div style={{ display:"flex", gap:12, alignItems:"center" }}>
            <div style={{ width:44, height:44, borderRadius:12, background:regionMeta.bg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <span style={{ width:14, height:14, borderRadius:"50%", background:accentColor, display:"block" }} />
            </div>
            <div>
              <div style={{ display:"flex", gap:6, alignItems:"center", marginBottom:3 }}>
                <span style={{ fontSize:10, fontWeight:800, letterSpacing:".08em", textTransform:"uppercase", padding:"2px 8px", borderRadius:6, background: isHospital ? "#fef2f2" : "#eff6ff", color: isHospital ? "#dc2626" : "#1d4ed8" }}>{branch.type}</span>
                {branch.tag && <span style={{ fontSize:10, fontWeight:800, padding:"2px 8px", borderRadius:6, background:"rgba(240,180,41,.12)", color:"#854d0e", border:"1px solid rgba(240,180,41,.3)" }}>{branch.tag}</span>}
              </div>
              <h2 style={{ fontFamily:"'DM Serif Display',serif", fontSize:20, color:"#0f1f4b", lineHeight:1.2 }}>{branch.name}</h2>
            </div>
          </div>
          <button onClick={onClose} style={{ width:34, height:34, borderRadius:10, border:"1.5px solid #e2e8f0", background:"#f8fafc", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"#64748b", flexShrink:0, fontSize:16 }}>✕</button>
        </div>

        {/* Branch photo */}
        {branchImage && (
          <div style={{ margin:"16px 24px 0", borderRadius:14, overflow:"hidden", border:"1px solid #e2e8f0", background:"#f1f5f9" }}>
            <img src={branchImage} alt={branch.name} style={{ width:"100%", display:"block", objectFit:"contain", background:"#f1f5f9" }} />
          </div>
        )}

        {/* Info grid */}
        <div style={{ padding:"16px 24px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          {[
            { icon:<PinIcon />,   label:"Address",  value:branch.location },
            { icon:<ClockIcon />, label:"Hours",    value:branch.hours, highlight: isHospital },
            { icon:<PhoneIcon />, label:"Phone",    value:branch.phone },
            { icon:null,          label:"Region",   value:branch.region },
          ].map(({ icon, label, value, highlight }, idx) => (
            <div key={label} style={{ background:"#f8fafc", border:"1.5px solid #e2e8f0", borderRadius:12, padding:"12px 14px", animation:`fadeSlideUp 0.4s cubic-bezier(.22,.68,0,1.2) ${idx * 80}ms both` }}>
              <div style={{ fontSize:10, fontWeight:800, textTransform:"uppercase", letterSpacing:1, color:"#94a3b8", marginBottom:5 }}>{label}</div>
              <div style={{ fontSize:13, fontWeight:600, color: highlight ? "#dc2626" : "#0f1f4b", display:"flex", alignItems:"flex-start", gap:6 }}>
                {icon && <span style={{ marginTop:1, color: highlight ? "#dc2626" : "#2563eb", flexShrink:0 }}>{icon}</span>}
                {value}
              </div>
            </div>
          ))}
        </div>

        {/* Services */}
        <div style={{ padding:"0 24px 16px", animation:"fadeSlideUp 0.45s cubic-bezier(.22,.68,0,1.2) 320ms both" }}>
          <div style={{ fontSize:10, fontWeight:800, textTransform:"uppercase", letterSpacing:1, color:"#94a3b8", marginBottom:8 }}>Services Offered</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
            {branch.services.map((s, si) => (
              <span key={s} style={{ fontSize:11, fontWeight:700, letterSpacing:".06em", textTransform:"uppercase", background: regionMeta.bg, color: regionMeta.color, padding:"5px 12px", borderRadius:8, border:`1px solid ${regionMeta.color}22`, animation:`scaleIn 0.35s cubic-bezier(.22,.68,0,1.2) ${400 + si * 50}ms both` }}>{s}</span>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding:"14px 24px 20px", borderTop:"1px solid #f1f5f9", display:"flex", gap:8, justifyContent:"flex-end", animation:"fadeSlideUp 0.4s cubic-bezier(.22,.68,0,1.2) 480ms both" }}>
          <a href={`https://maps.google.com/?q=${encodeURIComponent(branch.location)}`} target="_blank" rel="noreferrer"
            style={{ padding:"9px 18px", borderRadius:10, border:"1.5px solid #e2e8f0", background:"#f8fafc", fontSize:13, fontWeight:700, color:"#64748b", textDecoration:"none", display:"inline-flex", alignItems:"center", gap:6 }}>
            <MapIcon /> Directions
          </a>
          <a href={`tel:${branch.phone.replace(/\D/g,"")}`}
            style={{ padding:"9px 18px", borderRadius:10, background:"#0f1f4b", fontSize:13, fontWeight:700, color:"#fff", textDecoration:"none", display:"inline-flex", alignItems:"center", gap:6 }}>
            <PhoneIcon /> Call Branch
          </a>
        </div>
      </div>
    </div>
  );
}

/* ── Icons ── */
const PinIcon     = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>;
const ClockIcon   = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const PhoneIcon   = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.35 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6.13 6.13l.96-.96a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>;
const SearchIcon  = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const ChevronIcon = ({ open }) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.25s" }}><polyline points="6 9 12 15 18 9"/></svg>;
const XIcon       = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const MenuIcon    = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>;
const MapIcon     = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>;
const ArrowIcon   = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>;

/* ── Styles ── */
const styles = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600;700&display=swap');

.is-root { --navy:#0f1f4b; --navy2:#1a3470; --blue:#2563eb; --blue2:#1d4ed8; --blue-soft:#eff6ff; --blue-mid:#dbeafe; --gold:#f0b429; --gold2:#d69e0a; --red:#dc2626; --red-soft:#fef2f2; --green:#16a34a; --bg:#f0f4fc; --card:#fff; --text:#0f172a; --muted:#64748b; --border:rgba(15,31,75,0.08); --border2:rgba(15,31,75,0.14); --r:20px; --sha:0 1px 3px rgba(15,31,75,.04),0 6px 20px rgba(15,31,75,.07); --sha-lg:0 16px 48px rgba(15,31,75,.16); font-family:'DM Sans',system-ui,sans-serif; background:var(--bg); color:var(--text); min-height:100vh; scroll-behavior:smooth; }
.is-root *, .is-root *::before, .is-root *::after { box-sizing:border-box; margin:0; }
html { scroll-behavior: smooth; }

/* ── Header ── */
.is-header { position:sticky; top:0; z-index:200; background:rgba(255,255,255,0.92); backdrop-filter:blur(18px); border-bottom:1px solid var(--border2); }
.is-header-inner { max-width:1280px; margin:0 auto; padding:0 24px; height:66px; display:flex; align-items:center; gap:14px; }
.is-hamburger { width:40px; height:40px; border:1.5px solid var(--border2); border-radius:10px; background:#fff; display:flex; align-items:center; justify-content:center; cursor:pointer; color:var(--navy); transition:all .18s; flex-shrink:0; }
.is-hamburger:hover { background:var(--blue-soft); border-color:var(--blue); color:var(--blue); }
.is-brand { display:flex; align-items:center; gap:10px; flex:1; min-width:0; }
.is-brand-name { font-family:'DM Serif Display',serif; font-size:17px; color:var(--navy); line-height:1.2; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.is-brand-sub { font-size:10px; font-weight:600; letter-spacing:.12em; text-transform:uppercase; color:var(--muted); }
.is-header-nav { display:flex; align-items:center; gap:8px; margin-left:auto; }
.is-header-link { font-size:13px; font-weight:600; color:var(--muted); text-decoration:none; padding:7px 14px; border-radius:8px; transition:all .15s; background:none; border:none; cursor:pointer; font-family:inherit; }
.is-header-link:hover { color:var(--navy); background:var(--bg); }
.is-header-login { background:var(--navy); color:#fff!important; border-radius:8px; padding:8px 18px; font-size:13px; font-weight:700; text-decoration:none; transition:all .18s; border:none; cursor:pointer; font-family:inherit; }
.is-header-login:hover { background:var(--blue2); transform:translateY(-1px); box-shadow:0 4px 12px rgba(37,99,235,.3); }

/* ── Hamburger Drawer ── */
.is-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.45); z-index:290; opacity:0; pointer-events:none; transition:opacity .3s; }
.is-overlay.open { opacity:1; pointer-events:all; }
.is-drawer { position:fixed; top:0; left:0; bottom:0; width:340px; max-width:90vw; background:#fff; z-index:300; transform:translateX(-100%); transition:transform .35s cubic-bezier(.25,.46,.45,.94); box-shadow:none; overflow:hidden; display:flex; flex-direction:column; }
.is-drawer.open { transform:translateX(0); box-shadow:8px 0 48px rgba(0,0,0,.2); }
.is-drawer-head { padding:20px 20px 16px; background:linear-gradient(135deg,var(--navy) 0%,var(--navy2) 100%); color:#fff; display:flex; align-items:center; justify-content:space-between; flex-shrink:0; }
.is-drawer-head h3 { font-family:'DM Serif Display',serif; font-size:18px; }
.is-drawer-head p { font-size:11px; opacity:.7; margin-top:2px; }
.is-drawer-close { width:34px; height:34px; border:1.5px solid rgba(255,255,255,.25); border-radius:8px; background:rgba(255,255,255,.1); cursor:pointer; display:flex; align-items:center; justify-content:center; color:#fff; transition:all .15s; }
.is-drawer-close:hover { background:rgba(255,255,255,.2); }
.is-drawer-body { overflow-y:auto; flex:1; padding:12px 0 20px; }
.is-drawer-section { padding:0; margin-bottom:4px; }
.is-drawer-region-btn { width:100%; padding:12px 20px; background:none; border:none; cursor:pointer; display:flex; align-items:center; gap:10px; font-family:inherit; font-size:13px; font-weight:700; color:var(--navy); text-align:left; transition:background .15s; }
.is-drawer-region-btn:hover { background:var(--bg); }
.is-drawer-region-icon { width:32px; height:32px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:15px; flex-shrink:0; }
.is-drawer-region-label { flex:1; }
.is-drawer-region-count { font-size:10px; font-weight:800; padding:2px 8px; border-radius:20px; }
.is-drawer-branches { background:#f8fafc; border-top:1px solid var(--border); }
.is-drawer-branch-item { display:flex; align-items:center; gap:10px; padding:10px 20px 10px 36px; border-bottom:1px solid var(--border); cursor:pointer; transition:background .12s; text-decoration:none; }
.is-drawer-branch-item:hover { background:var(--blue-soft); }
.is-drawer-branch-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; }
.is-drawer-branch-name { font-size:13px; font-weight:600; color:var(--navy); flex:1; }
.is-drawer-branch-type { font-size:10px; font-weight:800; letter-spacing:.06em; text-transform:uppercase; padding:2px 7px; border-radius:20px; flex-shrink:0; }
.is-drawer-branch-arrow { color:var(--blue); opacity:0; transition:opacity .15s; }
.is-drawer-branch-item:hover .is-drawer-branch-arrow { opacity:1; }
.is-drawer-branch-has-page { border-left:3px solid var(--blue); }
.is-drawer-footer { padding:16px 20px; border-top:1px solid var(--border); flex-shrink:0; }
.is-drawer-emergency { display:flex; align-items:center; gap:12px; padding:12px 16px; background:var(--red-soft); border:1.5px solid rgba(220,38,38,.2); border-radius:12px; text-decoration:none; cursor:pointer; width:100%; background:var(--red-soft); border:1.5px solid rgba(220,38,38,.2); }
.is-drawer-emergency-text strong { display:block; font-size:13px; font-weight:800; color:var(--red); }
.is-drawer-emergency-text span { font-size:11px; color:#b91c1c; }

/* ── Hero ── */
.is-hero { position:relative; overflow:hidden; background:linear-gradient(150deg,#0a1628 0%,#0f1f4b 45%,#1a3470 75%,#1d4ed8 100%); color:#fff; padding:80px 24px 72px; }
.is-hero::before { content:''; position:absolute; inset:0; background-image:radial-gradient(circle at 20% 50%,rgba(37,99,235,.18) 0%,transparent 60%),radial-gradient(circle at 80% 20%,rgba(240,180,41,.08) 0%,transparent 50%); }
.is-hero-inner { position:relative; max-width:1280px; margin:0 auto; }
.is-eyebrow { display:inline-flex; align-items:center; gap:7px; padding:5px 14px; border-radius:999px; border:1px solid rgba(255,255,255,.15); background:rgba(255,255,255,.06); font-size:10px; font-weight:800; letter-spacing:.25em; text-transform:uppercase; color:rgba(255,255,255,.8); margin-bottom:20px; }
.is-eyebrow-dot { width:5px; height:5px; border-radius:50%; background:var(--gold); animation:dotPulse 2s ease-in-out infinite; }
.is-hero h1 { font-family:'DM Serif Display',serif; font-size:clamp(38px,5vw,64px); line-height:1.05; margin-bottom:18px; }
.is-hero h1 em { font-style:italic; color:var(--gold); }
.is-hero p { font-size:17px; line-height:1.7; color:rgba(255,255,255,.72); max-width:520px; margin-bottom:32px; }
.is-hero-cta { display:flex; gap:12px; flex-wrap:wrap; }
.is-hero-btn { padding:12px 24px; border-radius:10px; font-family:inherit; font-size:14px; font-weight:700; cursor:pointer; border:none; transition:all .2s; text-decoration:none; display:inline-flex; align-items:center; gap:7px; }
.is-hero-btn.primary { background:#fff; color:var(--navy); box-shadow:0 4px 16px rgba(0,0,0,.2); }
.is-hero-btn.primary:hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(0,0,0,.25); }
.is-hero-btn.outline { background:rgba(255,255,255,.08); color:#fff; border:1.5px solid rgba(255,255,255,.2); }
.is-hero-btn.outline:hover { background:rgba(255,255,255,.15); border-color:rgba(255,255,255,.4); }

/* ── Section ── */
.is-section { max-width:1280px; margin:0 auto; padding:64px 24px; }
.is-section-eyebrow { font-size:10px; font-weight:800; letter-spacing:.25em; text-transform:uppercase; color:var(--blue); margin-bottom:10px; }
.is-section h2 { font-family:'DM Serif Display',serif; font-size:clamp(28px,3.5vw,42px); color:var(--navy); line-height:1.15; margin-bottom:8px; }
.is-section-sub { color:var(--muted); font-size:15px; max-width:520px; }
.is-section-bar { display:flex; align-items:flex-end; justify-content:space-between; flex-wrap:wrap; gap:16px; margin-bottom:28px; }

/* ── Controls ── */
.is-controls { background:#fff; border-radius:16px; border:1px solid var(--border2); box-shadow:var(--sha); padding:16px; display:flex; gap:12px; align-items:center; flex-wrap:wrap; margin-bottom:28px; }
.is-search { position:relative; flex:1; min-width:200px; }
.is-search svg { position:absolute; left:13px; top:50%; transform:translateY(-50%); color:var(--muted); }
.is-search input { width:100%; padding:10px 14px 10px 38px; border:1.5px solid var(--border2); border-radius:10px; font-family:inherit; font-size:14px; color:var(--navy); background:#f8fafc; outline:none; transition:all .2s; }
.is-search input:focus { border-color:var(--blue); background:#fff; box-shadow:0 0 0 3px rgba(37,99,235,.12); }
.is-pills { display:flex; gap:5px; flex-wrap:wrap; align-items:center; }
.is-pills-label { font-size:10px; font-weight:800; letter-spacing:.15em; text-transform:uppercase; color:var(--muted); margin-right:2px; }
.is-pill { padding:6px 13px; border-radius:8px; border:1.5px solid var(--border2); background:#fff; font-family:inherit; font-size:12px; font-weight:700; color:rgba(15,31,75,.6); cursor:pointer; transition:all .15s; }
.is-pill:hover { border-color:var(--blue); color:var(--blue); }
.is-pill.active { background:var(--navy); border-color:var(--navy); color:#fff; }
.is-count { font-family:'DM Serif Display',serif; font-size:28px; font-weight:400; color:var(--navy); }
.is-count-label { font-size:12px; font-weight:600; color:var(--muted); margin-left:6px; }

/* ── Grid ── */
.is-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(310px,1fr)); gap:20px; }

/* ── Card ── */
.is-card { position:relative; background:#fff; border-radius:var(--r); border:1px solid var(--border); box-shadow:var(--sha); overflow:hidden; transition:transform .25s,box-shadow .25s; animation:cardIn .45s both; }
.is-card:hover { transform:translateY(-5px); box-shadow:var(--sha-lg); }
.is-card.hospital { border:1.5px solid rgba(220,38,38,.25); }
.is-card-accent { height:5px; }
.is-card-body { padding:22px; }
.is-card-top { display:flex; justify-content:space-between; align-items:flex-start; gap:8px; margin-bottom:16px; }
.is-chips { display:flex; gap:5px; flex-wrap:wrap; }
.is-chip { display:inline-flex; align-items:center; padding:3px 9px; border-radius:6px; font-size:10px; font-weight:800; letter-spacing:.07em; text-transform:uppercase; }
.is-chip-clinic { background:#eff6ff; color:#1d4ed8; }
.is-chip-hospital { background:#fef2f2; color:#dc2626; }
.is-chip-tag { background:rgba(240,180,41,.12); color:#854d0e; border:1px solid rgba(240,180,41,.3); }
.is-card-num { font-family:'DM Serif Display',serif; font-size:24px; color:rgba(15,31,75,.12); line-height:1; }
.is-card-name { font-family:'DM Serif Display',serif; font-size:21px; color:var(--navy); line-height:1.2; margin-bottom:4px; }
.is-card-region-badge { display:inline-flex; align-items:center; gap:4px; font-size:10px; font-weight:700; padding:2px 8px; border-radius:6px; }
.is-info { margin-top:16px; display:flex; flex-direction:column; gap:8px; }
.is-info-row { display:flex; gap:9px; align-items:flex-start; font-size:13px; line-height:1.45; color:rgba(15,31,75,.8); }
.is-info-row svg { color:var(--blue); margin-top:2px; flex-shrink:0; }
.is-info-row.emergency svg,.is-info-row.emergency { color:var(--red); font-weight:700; }
.is-services { margin-top:14px; display:flex; flex-wrap:wrap; gap:5px; }
.is-service { font-size:9px; font-weight:800; letter-spacing:.07em; text-transform:uppercase; color:rgba(15,31,75,.65); background:#f1f5fb; padding:4px 8px; border-radius:6px; }
.is-service-more { font-size:9px; font-weight:800; letter-spacing:.07em; text-transform:uppercase; color:var(--blue); padding:4px 0; }
.is-card-foot { margin-top:16px; padding-top:14px; border-top:1px solid var(--border); display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap; }
.is-card-foot a,.is-card-foot button { font-size:11px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; text-decoration:none; padding:7px 12px; border-radius:8px; transition:all .15s; font-family:inherit; cursor:pointer; border:none; display:inline-flex; align-items:center; gap:5px; }
.is-card-foot a.cta { background:var(--navy); color:#fff; }
.is-card-foot a.cta:hover { background:var(--blue2); }
.is-card-foot a.view-page { background:var(--red); color:#fff; }
.is-card-foot a.view-page:hover { background:#b91c1c; transform:translateY(-1px); }
.is-card-foot a.dir { color:var(--muted); border:1.5px solid var(--border2); }
.is-card-foot a.dir:hover { border-color:var(--blue); color:var(--blue); }

/* ── AI Section ── */
.is-ai-section { position:relative; overflow:hidden; background:linear-gradient(135deg,#0a1628 0%,#0f1f4b 50%,#1e1065 100%); }
.is-ai-section::before { content:''; position:absolute; inset:0; background-image:radial-gradient(ellipse at 10% 50%,rgba(99,102,241,.2) 0%,transparent 55%),radial-gradient(ellipse at 90% 20%,rgba(168,85,247,.12) 0%,transparent 50%),radial-gradient(ellipse at 50% 100%,rgba(37,99,235,.1) 0%,transparent 60%); pointer-events:none; }
.is-ai-grid { max-width:1280px; margin:0 auto; padding:72px 24px; display:grid; grid-template-columns:1fr 1fr; gap:64px; align-items:center; position:relative; }
.is-ai-badge { display:inline-flex; align-items:center; gap:8px; padding:5px 14px 5px 8px; border-radius:999px; border:1px solid rgba(99,102,241,.4); background:rgba(99,102,241,.12); font-size:10px; font-weight:800; letter-spacing:.2em; text-transform:uppercase; color:rgba(167,139,250,1); margin-bottom:20px; }
.is-ai-badge-dot { width:24px; height:24px; border-radius:50%; background:linear-gradient(135deg,#6366f1,#8b5cf6); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.is-ai-title { font-family:'DM Serif Display',serif; font-size:clamp(32px,3.5vw,48px); color:#fff; line-height:1.1; margin-bottom:16px; }
.is-ai-title em { font-style:italic; background:linear-gradient(90deg,#a78bfa,#818cf8); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
.is-ai-desc { font-size:15px; line-height:1.75; color:rgba(255,255,255,.65); margin-bottom:28px; max-width:480px; }
.is-ai-features { display:flex; flex-direction:column; gap:12px; margin-bottom:32px; }
.is-ai-feature { display:flex; align-items:flex-start; gap:12px; }
.is-ai-feature-icon { width:32px; height:32px; border-radius:8px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.is-ai-feature-text strong { display:block; font-size:13px; font-weight:700; color:#fff; margin-bottom:2px; }
.is-ai-feature-text span { font-size:12px; color:rgba(255,255,255,.5); line-height:1.5; }
.is-ai-btn { display:inline-flex; align-items:center; gap:10px; padding:14px 28px; border-radius:12px; font-family:inherit; font-size:14px; font-weight:800; cursor:pointer; border:none; text-decoration:none; background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%); color:#fff; box-shadow:0 4px 20px rgba(99,102,241,.45); transition:all .2s; letter-spacing:.02em; }
.is-ai-btn:hover { transform:translateY(-2px); box-shadow:0 8px 30px rgba(99,102,241,.55); }
.is-ai-btn-ghost { display:inline-flex; align-items:center; gap:8px; padding:14px 24px; border-radius:12px; font-family:inherit; font-size:13px; font-weight:700; cursor:pointer; border:1.5px solid rgba(255,255,255,.15); background:rgba(255,255,255,.05); color:rgba(255,255,255,.8); text-decoration:none; transition:all .2s; }
.is-ai-btn-ghost:hover { border-color:rgba(255,255,255,.35); background:rgba(255,255,255,.1); }
.is-ai-disclaimer { margin-top:16px; font-size:11px; color:rgba(255,255,255,.35); display:flex; align-items:center; gap:6px; }
.is-ai-widget { position:relative; }
.is-ai-chat-card { background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.1); border-radius:20px; padding:24px; backdrop-filter:blur(12px); }
.is-ai-chat-header { display:flex; align-items:center; gap:10px; margin-bottom:20px; padding-bottom:16px; border-bottom:1px solid rgba(255,255,255,.08); }
.is-ai-chat-avatar { width:38px; height:38px; border-radius:50%; background:linear-gradient(135deg,#6366f1,#8b5cf6); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.is-ai-chat-name { font-size:13px; font-weight:700; color:#fff; }
.is-ai-chat-status { font-size:11px; color:rgba(167,139,250,.8); display:flex; align-items:center; gap:5px; }
.is-ai-chat-status-dot { width:6px; height:6px; border-radius:50%; background:#34d399; flex-shrink:0; animation:dotPulse 2s ease-in-out infinite; }
.is-ai-messages { display:flex; flex-direction:column; gap:12px; margin-bottom:16px; }
.is-ai-msg { display:flex; gap:8px; align-items:flex-end; }
.is-ai-msg.user { flex-direction:row-reverse; }
.is-ai-msg-bubble { padding:10px 14px; border-radius:14px; font-size:13px; line-height:1.5; max-width:240px; }
.is-ai-msg.bot .is-ai-msg-bubble { background:rgba(99,102,241,.2); border:1px solid rgba(99,102,241,.3); color:#e0e7ff; border-radius:4px 14px 14px 14px; }
.is-ai-msg.user .is-ai-msg-bubble { background:rgba(255,255,255,.1); border:1px solid rgba(255,255,255,.15); color:rgba(255,255,255,.85); border-radius:14px 14px 4px 14px; }
.is-ai-msg-av { width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0; font-size:12px; }
.is-ai-input-row { display:flex; gap:8px; align-items:center; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12); border-radius:12px; padding:10px 14px; }
.is-ai-input-row input { flex:1; background:none; border:none; outline:none; font-family:inherit; font-size:13px; color:#fff; }
.is-ai-input-row input::placeholder { color:rgba(255,255,255,.3); }
.is-ai-symptoms { display:flex; flex-wrap:wrap; gap:6px; margin-top:16px; }
.is-ai-symptom-tag { padding:5px 11px; border-radius:20px; font-size:11px; font-weight:700; cursor:pointer; border:1px solid rgba(99,102,241,.35); background:rgba(99,102,241,.1); color:#a5b4fc; transition:all .15s; font-family:inherit; }
.is-ai-symptom-tag:hover { background:rgba(99,102,241,.25); border-color:rgba(99,102,241,.6); color:#c7d2fe; transform:translateY(-1px); }
.is-ai-orb { position:absolute; border-radius:50%; pointer-events:none; }

/* ── Skeleton ── */
.is-skeleton { background:linear-gradient(90deg,#e8edf5 25%,#f1f5fb 50%,#e8edf5 75%); background-size:400% 100%; animation:shimmer 1.5s infinite; border-radius:8px; }
@keyframes shimmer { 0%{background-position:100% 0} 100%{background-position:-100% 0} }
.is-card-skel { background:#fff; border-radius:var(--r); border:1px solid var(--border); box-shadow:var(--sha); overflow:hidden; padding:22px; }

/* ── FAQ ── */
.is-faq-section { background:linear-gradient(135deg,#f8fbff 0%,#eff6ff 100%); border-top:1px solid var(--border2); border-bottom:1px solid var(--border2); }
.is-faq-item { border-bottom:1px solid var(--border); }
.is-faq-item:last-child { border-bottom:none; }
.is-faq-q { width:100%; padding:18px 0; background:none; border:none; cursor:pointer; font-family:inherit; font-size:15px; font-weight:700; color:var(--navy); text-align:left; display:flex; justify-content:space-between; align-items:center; gap:16px; transition:color .15s; }
.is-faq-q:hover { color:var(--blue); }
.is-faq-a { font-size:14px; line-height:1.7; color:var(--muted); padding-bottom:18px; max-width:700px; }

/* ── Footer ── */
.is-footer { background:linear-gradient(150deg,#0a1628 0%,#0f1f4b 100%); color:rgba(255,255,255,.75); }
.is-footer-main { max-width:1280px; margin:0 auto; padding:56px 24px 40px; display:grid; grid-template-columns:2fr 1fr 1fr 1.5fr; gap:48px; }
.is-footer-brand h3 { font-family:'DM Serif Display',serif; font-size:22px; color:#fff; margin-bottom:10px; }
.is-footer-brand p { font-size:13px; line-height:1.7; max-width:280px; }
.is-footer-brand .is-footer-badge { display:inline-flex; align-items:center; gap:6px; background:rgba(220,38,38,.15); border:1px solid rgba(220,38,38,.3); border-radius:8px; padding:6px 12px; font-size:11px; font-weight:700; color:#f87171; margin-top:14px; }
.is-footer-col h4 { font-size:10px; font-weight:800; letter-spacing:.2em; text-transform:uppercase; color:rgba(255,255,255,.4); margin-bottom:14px; }
.is-footer-col a { display:block; font-size:13px; color:rgba(255,255,255,.65); text-decoration:none; margin-bottom:9px; transition:color .15s; }
.is-footer-col a:hover { color:#fff; }
.is-footer-col p { font-size:13px; margin-bottom:8px; }
.is-footer-col strong { color:rgba(255,255,255,.9); font-weight:700; }
.is-footer-bottom { border-top:1px solid rgba(255,255,255,.08); max-width:1280px; margin:0 auto; padding:18px 24px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; }
.is-footer-bottom p { font-size:12px; }
.is-footer-bottom-links { display:flex; gap:18px; }
.is-footer-bottom-links a { font-size:12px; color:rgba(255,255,255,.45); text-decoration:none; transition:color .15s; }
.is-footer-bottom-links a:hover { color:rgba(255,255,255,.8); }

/* ── Empty ── */
.is-empty { text-align:center; padding:72px 24px; color:var(--muted); }
.is-empty p { font-size:15px; margin-top:10px; }

/* ── Animations ── */
@keyframes cardIn { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
@keyframes dotPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(.7)} }
@keyframes floatOrb { 0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(-20px) scale(1.05)} }
@keyframes typeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
@keyframes fadeSlideUp { from{opacity:0;transform:translateY(32px)} to{opacity:1;transform:translateY(0)} }
@keyframes fadeSlideLeft { from{opacity:0;transform:translateX(32px)} to{opacity:1;transform:translateX(0)} }
@keyframes fadeSlideRight { from{opacity:0;transform:translateX(-32px)} to{opacity:1;transform:translateX(0)} }
@keyframes scaleIn { from{opacity:0;transform:scale(0.92)} to{opacity:1;transform:scale(1)} }
@keyframes countUp { from{opacity:0;transform:translateY(10px) scale(0.9)} to{opacity:1;transform:translateY(0) scale(1)} }
.reveal { opacity:0; }
.reveal.visible { animation:fadeSlideUp 0.6s cubic-bezier(.22,.68,0,1.2) both; }
.reveal-left { opacity:0; }
.reveal-left.visible { animation:fadeSlideLeft 0.6s cubic-bezier(.22,.68,0,1.2) both; }
.reveal-right { opacity:0; }
.reveal-right.visible { animation:fadeSlideRight 0.6s cubic-bezier(.22,.68,0,1.2) both; }
.reveal-scale { opacity:0; }
.reveal-scale.visible { animation:scaleIn 0.5s cubic-bezier(.22,.68,0,1.2) both; }

/* ── Responsive ── */
@media(max-width:900px) {
  .is-footer-main { grid-template-columns:1fr 1fr; gap:32px; }
  .is-ai-grid { grid-template-columns:1fr; gap:40px; }
}
@media(max-width:600px) {
  .is-header-inner { padding:0 16px; gap:10px; }
  .is-hero { padding:72px 20px 64px; }
  .is-hero h1 { font-size:34px; }
  .is-section { padding:48px 16px; }
  .is-footer-main { grid-template-columns:1fr; gap:28px; padding:40px 20px 28px; }
  .is-footer-bottom { flex-direction:column; align-items:flex-start; }
  .is-header-link { display:none; }
  .is-ai-grid { padding:48px 20px; }
}
`;

/* ── Skeleton Card ── */
function SkeletonCard() {
  return (
    <div className="is-card-skel">
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:16 }}>
        <div className="is-skeleton" style={{ width:80, height:20 }} />
        <div className="is-skeleton" style={{ width:36, height:28 }} />
      </div>
      <div className="is-skeleton" style={{ width:"75%", height:26, marginBottom:8 }} />
      <div className="is-skeleton" style={{ width:80, height:16, marginBottom:18 }} />
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {[1,2,3].map(i => (
          <div key={i} style={{ display:"flex", gap:10, alignItems:"center" }}>
            <div className="is-skeleton" style={{ width:13, height:13, borderRadius:"50%", flexShrink:0 }} />
            <div className="is-skeleton" style={{ flex:1, height:13 }} />
          </div>
        ))}
      </div>
      <div style={{ display:"flex", gap:6, marginTop:16, flexWrap:"wrap" }}>
        {[60,80,55].map((w,i) => <div key={i} className="is-skeleton" style={{ width:w, height:22, borderRadius:6 }} />)}
      </div>
      <div style={{ marginTop:18, paddingTop:14, borderTop:"1px solid #f1f5f9", display:"flex", justifyContent:"space-between" }}>
        <div className="is-skeleton" style={{ width:90, height:30, borderRadius:8 }} />
        <div className="is-skeleton" style={{ width:80, height:30, borderRadius:8 }} />
      </div>
    </div>
  );
}

/* ── Branch Card ── */
function BranchCard({ branch, index, onViewDetail }) {
  const isHospital = branch.type === "Hospital";
  const regionMeta = REGIONS_META[branch.region] || { color:"#2563eb", bg:"#dbeafe" };
  const accentColor = isHospital ? "#dc2626" : regionMeta.color;

  return (
    <article
      className={`is-card ${isHospital ? "hospital" : ""}`}
      style={{ animationDelay:`${index * 45}ms` }}
    >
      <div className="is-card-accent" style={{ background:accentColor }} />
      <div className="is-card-body">
        <div className="is-card-top">
          <div className="is-chips">
            <span className={`is-chip ${isHospital ? "is-chip-hospital" : "is-chip-clinic"}`}>
              {isHospital ? "Hospital" : "Clinic"}
            </span>
            {branch.tag && <span className="is-chip is-chip-tag">{branch.tag}</span>}
          </div>
          <span className="is-card-num">#{String(branch.id).padStart(2,"0")}</span>
        </div>

        <h3 className="is-card-name">{branch.shortName}</h3>
        <span className="is-card-region-badge" style={{ background:regionMeta.bg, color:regionMeta.color }}>
          <span style={{ width:6, height:6, borderRadius:"50%", background:regionMeta.color, flexShrink:0, display:"inline-block" }} />
          {branch.region}
        </span>

        <div className="is-info">
          <div className="is-info-row"><PinIcon /><span>{branch.location}</span></div>
          <div className={`is-info-row ${isHospital ? "emergency" : ""}`}><ClockIcon /><span>{branch.hours}</span></div>
          <div className="is-info-row"><PhoneIcon /><span>{branch.phone}</span></div>
        </div>

        <div className="is-services">
          {branch.services.slice(0,4).map(s => <span key={s} className="is-service">{s}</span>)}
          {branch.services.length > 4 && <span className="is-service-more">+{branch.services.length - 4} more</span>}
        </div>

        <div className="is-card-foot">
          <button className="cta" onClick={() => onViewDetail(branch)} style={{ border:"none", cursor:"pointer", fontFamily:"inherit" }}>
            <ArrowIcon /> View Details
          </button>
          <a className="dir" href={`https://maps.google.com/?q=${encodeURIComponent(branch.location)}`} target="_blank" rel="noreferrer">
            <MapIcon /> Directions
          </a>
        </div>
      </div>
    </article>
  );
}

/* ── AI Symptom Checker Section ─────────────────────────────────────────────── */
const QUICK_SYMPTOMS = [
  "Not eating", "Vomiting", "Limping", "Lethargy", "Itching", "Coughing",
  "Diarrhea", "Eye discharge", "Drinking too much", "Hair loss",
];

const DEMO_MESSAGES = [
  { role:"bot",  text:"Hi! I'm SeraphVet AI. Describe your pet's symptoms and I'll help you understand what might be going on. 🐾" },
  { role:"user", text:"My dog has been vomiting and seems very tired since this morning." },
  { role:"bot",  text:"I understand your concern. Vomiting combined with lethargy can have several causes. Can you tell me if your dog has eaten anything unusual, or if there's been a change in appetite?" },
];

function AISection() {
  // ── FIX: useNavigate must be called inside the component ──
  const navigate = useNavigate();
  const [activeMsg, setActiveMsg] = useState(0);

  useEffect(() => {
    if (activeMsg >= DEMO_MESSAGES.length) return;
    const t = setTimeout(() => setActiveMsg(m => m + 1), 900 + activeMsg * 600);
    return () => clearTimeout(t);
  }, [activeMsg]);

  const features = [
    {
      icon: "🔍",
      bg: "rgba(99,102,241,.2)",
      title: "Symptom Analysis",
      desc: "Describe what you're seeing — our AI identifies patterns across hundreds of conditions.",
    },
    {
      icon: "⚡",
      bg: "rgba(251,191,36,.15)",
      title: "Instant Guidance",
      desc: "Get immediate triage advice: home care, vet visit, or emergency care.",
    },
    {
      icon: "📋",
      bg: "rgba(52,211,153,.15)",
      title: "No Account Needed",
      desc: "Ask as a guest anytime — no login required to check symptoms.",
    },
  ];

  return (
    <section className="is-ai-section">
      {/* decorative orbs */}
      <div className="is-ai-orb" style={{ width:400, height:400, top:-100, right:-80, background:"radial-gradient(circle,rgba(99,102,241,.12) 0%,transparent 70%)", animation:"floatOrb 8s ease-in-out infinite" }} />
      <div className="is-ai-orb" style={{ width:300, height:300, bottom:-60, left:-60, background:"radial-gradient(circle,rgba(168,85,247,.1) 0%,transparent 70%)", animation:"floatOrb 10s ease-in-out infinite reverse" }} />

      <div className="is-ai-grid">
        {/* Left: copy */}
        <div>
          <div className="is-ai-badge">
            <div className="is-ai-badge-dot">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
            </div>
            SeraphVet AI · Powered by AI
          </div>

          <h2 className="is-ai-title">
            Worried about your<br /><em>pet's symptoms?</em>
          </h2>

          <p className="is-ai-desc">
            Our AI assistant can help you understand what your pet might be experiencing — 
            from minor issues to signs that need urgent veterinary attention. 
            Available 24/7, completely free, no login required.
          </p>

          <div className="is-ai-features">
            {features.map((f, i) => (
              <div key={i} className="is-ai-feature">
                <div className="is-ai-feature-icon" style={{ background: f.bg }}>
                  <span style={{ fontSize:16 }}>{f.icon}</span>
                </div>
                <div className="is-ai-feature-text">
                  <strong>{f.title}</strong>
                  <span>{f.desc}</span>
                </div>
              </div>
            ))}
          </div>

          {/* ── FIX: All navigation now uses navigate() instead of href ── */}
          <div style={{ display:"flex", alignItems:"center", flexWrap:"wrap", gap:8 }}>
            <button className="is-ai-btn" onClick={() => navigate("/guestai")}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
              Ask AI About My Pet
            </button>
            <button className="is-ai-btn-ghost" onClick={() => navigate("/login")}>
              Sign in for full history
            </button>
          </div>

          <p className="is-ai-disclaimer">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4m0-4h.01"/></svg>
            AI guidance is informational only — always consult a licensed veterinarian for diagnosis and treatment.
          </p>

          {/* Quick symptom tags */}
          <div style={{ marginTop:24 }}>
            <p style={{ fontSize:11, fontWeight:800, letterSpacing:".15em", textTransform:"uppercase", color:"rgba(255,255,255,.3)", marginBottom:10 }}>
              Common questions
            </p>
            <div className="is-ai-symptoms">
              {/* ── FIX: symptom tags use navigate() ── */}
              {QUICK_SYMPTOMS.map(s => (
                <button
                  key={s}
                  className="is-ai-symptom-tag"
                  onClick={() => navigate(`/guestai?q=${encodeURIComponent(s + " in my pet")}`)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: animated chat preview */}
        <div className="is-ai-widget">
          <div className="is-ai-chat-card">
            <div className="is-ai-chat-header">
              <div className="is-ai-chat-avatar">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
              </div>
              <div>
                <div className="is-ai-chat-name">SeraphVet AI</div>
                <div className="is-ai-chat-status">
                  <span className="is-ai-chat-status-dot" />
                  Online · Ready to help
                </div>
              </div>
              <div style={{ marginLeft:"auto", fontSize:10, fontWeight:700, padding:"3px 9px", borderRadius:20, background:"rgba(52,211,153,.15)", border:"1px solid rgba(52,211,153,.25)", color:"#6ee7b7" }}>
                Guest Mode
              </div>
            </div>

            <div className="is-ai-messages">
              {DEMO_MESSAGES.slice(0, activeMsg).map((msg, i) => (
                <div key={i} className={`is-ai-msg ${msg.role}`} style={{ animation:"typeIn 0.3s ease both" }}>
                  <div className="is-ai-msg-av" style={{
                    background: msg.role === "bot"
                      ? "linear-gradient(135deg,#6366f1,#8b5cf6)"
                      : "rgba(255,255,255,.1)",
                    border: msg.role === "user" ? "1px solid rgba(255,255,255,.15)" : "none",
                  }}>
                    {msg.role === "bot" ? "🤖" : "🐕"}
                  </div>
                  <div className="is-ai-msg-bubble">{msg.text}</div>
                </div>
              ))}

              {activeMsg < DEMO_MESSAGES.length && DEMO_MESSAGES[activeMsg]?.role === "bot" && (
                <div className="is-ai-msg bot">
                  <div className="is-ai-msg-av" style={{ background:"linear-gradient(135deg,#6366f1,#8b5cf6)" }}>🤖</div>
                  <div className="is-ai-msg-bubble" style={{ display:"flex", gap:4, alignItems:"center", padding:"12px 16px" }}>
                    {[0,1,2].map(i => (
                      <span key={i} style={{ width:6, height:6, borderRadius:"50%", background:"rgba(167,139,250,.7)", display:"inline-block", animation:`dotPulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="is-ai-input-row">
              <input placeholder="Describe your pet's symptoms…" readOnly />
              {/* ── FIX: send button uses navigate() ── */}
              <button
                onClick={() => navigate("/guestai")}
                style={{ width:32, height:32, borderRadius:8, background:"linear-gradient(135deg,#6366f1,#8b5cf6)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, border:"none", cursor:"pointer" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
            </div>

            <div style={{ marginTop:14, paddingTop:14, borderTop:"1px solid rgba(255,255,255,.07)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:10, color:"rgba(255,255,255,.3)", fontWeight:600 }}>No account required · Free to use</span>
              {/* ── FIX: "Start chatting" link uses navigate() ── */}
              <button
                onClick={() => navigate("/guestai")}
                style={{ fontSize:11, fontWeight:800, color:"#a78bfa", background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:4, letterSpacing:".04em", fontFamily:"inherit" }}
              >
                Start chatting <ArrowIcon />
              </button>
            </div>
          </div>

          {/* floating stat pills */}
          <div style={{ position:"absolute", top:-16, right:-16, background:"rgba(52,211,153,.15)", border:"1px solid rgba(52,211,153,.3)", borderRadius:12, padding:"10px 16px", backdropFilter:"blur(12px)" }}>
            <div style={{ fontSize:18, fontWeight:800, color:"#6ee7b7", fontFamily:"'DM Serif Display',serif" }}>24/7</div>
            <div style={{ fontSize:10, fontWeight:700, color:"rgba(110,231,183,.7)", textTransform:"uppercase", letterSpacing:".1em" }}>Available</div>
          </div>
          <div style={{ position:"absolute", bottom:-16, left:-16, background:"rgba(99,102,241,.15)", border:"1px solid rgba(99,102,241,.3)", borderRadius:12, padding:"10px 16px", backdropFilter:"blur(12px)" }}>
            <div style={{ fontSize:18, fontWeight:800, color:"#a78bfa", fontFamily:"'DM Serif Display',serif" }}>Free</div>
            <div style={{ fontSize:10, fontWeight:700, color:"rgba(167,139,250,.7)", textTransform:"uppercase", letterSpacing:".1em" }}>No login</div>
          </div>
        </div>
      </div>
    </section>
  );
}

const TRIVIA_CATEGORIES = ["All", "Dog", "Cat", "Health", "Behavior", "Nutrition", "Emergency"];

/* ── Trivia Section ── */
function TriviaSection() {
  const [active, setActive] = useState(0);
  const [category, setCategory] = useState("All");
  const [animKey, setAnimKey] = useState(0);

  const filtered = useMemo(() =>
    category === "All" ? TRIVIA_ITEMS_EXTENDED : TRIVIA_ITEMS_EXTENDED.filter(t => t.category === category),
  [category]);

  const safeActive = Math.min(active, filtered.length - 1);
  const item = filtered[safeActive];

  const handleSelect = (i) => { setActive(i); setAnimKey(k => k + 1); };
  const handleCategory = (c) => { setCategory(c); setActive(0); setAnimKey(k => k + 1); };

  return (
    <section style={{ background:"#0a1628", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", inset:0, backgroundImage:`url('/image/ChatGPT_Image_May_11__2026__10_22_49_PM.png')`, backgroundSize:"cover", backgroundPosition:"center", opacity:0.07 }} />
      <div style={{ position:"absolute", inset:0, background:"linear-gradient(180deg, rgba(10,22,40,0.6) 0%, rgba(10,22,40,0.2) 50%, rgba(10,22,40,0.7) 100%)", pointerEvents:"none" }} />

      <div style={{ position:"relative", maxWidth:1280, margin:"0 auto", padding:"80px 24px" }}>

        {/* Header */}
        <div style={{ textAlign:"center", marginBottom:48 }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"6px 16px", borderRadius:999, border:"1px solid rgba(240,180,41,.3)", background:"rgba(240,180,41,.08)", fontSize:10, fontWeight:800, letterSpacing:".25em", textTransform:"uppercase", color:"#f0b429", marginBottom:16 }}>
            {PAW_SHAPE("#f0b429")} Pet Health Knowledge Hub
          </div>
          <h2 style={{ fontFamily:"'DM Serif Display',serif", fontSize:"clamp(30px,4vw,48px)", color:"#fff", marginBottom:12, lineHeight:1.1 }}>
            Know Your Pet <em style={{ fontStyle:"italic", color:"#f0b429" }}>Better</em>
          </h2>
          <p style={{ color:"rgba(255,255,255,.55)", fontSize:16, maxWidth:560, margin:"0 auto 32px" }}>
            Science-backed facts, health tips, and behavior insights every pet owner in the Philippines should know.
          </p>

          {/* Category filter pills */}
          <div style={{ display:"flex", gap:8, justifyContent:"center", flexWrap:"wrap" }}>
            {TRIVIA_CATEGORIES.map(c => (
              <button key={c} onClick={() => handleCategory(c)}
                style={{ padding:"7px 16px", borderRadius:20, border:"1.5px solid", fontFamily:"inherit", fontSize:12, fontWeight:700, cursor:"pointer", transition:"all .15s",
                  borderColor: category===c ? "#f0b429" : "rgba(255,255,255,.15)",
                  background: category===c ? "rgba(240,180,41,.15)" : "rgba(255,255,255,.04)",
                  color: category===c ? "#f0b429" : "rgba(255,255,255,.6)",
                }}>
                {c}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"360px 1fr", gap:24, alignItems:"start" }}>

          {/* Left: scrollable list */}
          <div style={{ display:"flex", flexDirection:"column", gap:6, maxHeight:600, overflowY:"auto", paddingRight:4 }}>
            {filtered.map((t, i) => (
              <button key={i} onClick={() => handleSelect(i)}
                style={{ padding:"14px 16px", borderRadius:14, border:"1.5px solid", fontFamily:"inherit", cursor:"pointer", display:"flex", alignItems:"center", gap:12, textAlign:"left", transition:"all .18s",
                  borderColor: safeActive===i ? t.color+"66" : "rgba(255,255,255,.08)",
                  background: safeActive===i ? `${t.color}14` : "rgba(255,255,255,.03)",
                  boxShadow: safeActive===i ? `0 4px 20px ${t.color}22` : "none",
                }}>
                <div style={{ width:38, height:38, borderRadius:10, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center",
                  background: safeActive===i ? `${t.color}22` : "rgba(255,255,255,.06)",
                  border: `1px solid ${safeActive===i ? t.color+"44" : "rgba(255,255,255,.08)"}`,
                }}>
                  {t.shape(safeActive===i ? t.color : "rgba(255,255,255,0.4)")}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:9, fontWeight:800, letterSpacing:".15em", textTransform:"uppercase", color: safeActive===i ? t.color : "rgba(255,255,255,.3)", marginBottom:3 }}>{t.tag}</div>
                  <div style={{ fontSize:13, fontWeight:700, color: safeActive===i ? "#fff" : "rgba(255,255,255,.65)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{t.title}</div>
                </div>
                {safeActive===i && <div style={{ width:6, height:6, borderRadius:"50%", background:t.color, flexShrink:0 }} />}
              </button>
            ))}
          </div>

          {/* Right: detail card */}
          <div style={{ position:"sticky", top:90 }} key={animKey}>
            <div style={{ background:"rgba(255,255,255,.04)", border:`1.5px solid ${item.color}33`, borderRadius:24, overflow:"hidden", boxShadow:`0 20px 60px ${item.color}15`, animation:"cardIn .35s ease both" }}>
              <div style={{ height:4, background:`linear-gradient(90deg, ${item.color}, ${item.color}88)` }} />
              <div style={{ padding:"32px 36px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:24 }}>
                  <div style={{ width:64, height:64, borderRadius:18, background:`${item.color}18`, border:`2px solid ${item.color}44`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    {item.shape(item.color)}
                  </div>
                  <div>
                    <div style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"4px 12px", borderRadius:20, background:`${item.color}18`, border:`1px solid ${item.color}44`, marginBottom:6 }}>
                      <span style={{ width:6, height:6, borderRadius:"50%", background:item.color, flexShrink:0, display:"inline-block" }} />
                      <span style={{ fontSize:10, fontWeight:800, letterSpacing:".15em", textTransform:"uppercase", color:item.color }}>{item.tag}</span>
                    </div>
                    <div style={{ fontSize:11, color:"rgba(255,255,255,.35)", fontWeight:600 }}>{safeActive + 1} of {filtered.length} in {category}</div>
                  </div>
                </div>
                <h3 style={{ fontFamily:"'DM Serif Display',serif", fontSize:"clamp(22px,2.5vw,30px)", color:"#fff", marginBottom:16, lineHeight:1.2 }}>{item.title}</h3>
                <p style={{ fontSize:15, lineHeight:1.85, color:"rgba(255,255,255,.7)", marginBottom:28 }}>{item.body}</p>
                <div style={{ height:1, background:"rgba(255,255,255,.07)", marginBottom:24 }} />
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div style={{ display:"flex", gap:4 }}>
                    {filtered.map((_, i) => (
                      <button key={i} onClick={() => handleSelect(i)}
                        style={{ width: safeActive===i ? 20 : 6, height:6, borderRadius:3, border:"none", cursor:"pointer", transition:"all .2s",
                          background: safeActive===i ? item.color : "rgba(255,255,255,.2)",
                        }} />
                    ))}
                  </div>
                  <div style={{ display:"flex", gap:8 }}>
                    <button onClick={() => handleSelect(Math.max(0, safeActive-1))} disabled={safeActive===0}
                      style={{ width:40, height:40, borderRadius:10, border:`1.5px solid rgba(255,255,255,.12)`, background:"rgba(255,255,255,.06)", cursor: safeActive===0 ? "default" : "pointer", color: safeActive===0 ? "rgba(255,255,255,.2)" : "#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, fontFamily:"inherit", transition:"all .15s" }}>
                      ‹
                    </button>
                    <button onClick={() => handleSelect(Math.min(filtered.length-1, safeActive+1))} disabled={safeActive===filtered.length-1}
                      style={{ width:40, height:40, borderRadius:10, border:`1.5px solid ${safeActive===filtered.length-1 ? "rgba(255,255,255,.12)" : item.color+"66"}`, background: safeActive===filtered.length-1 ? "rgba(255,255,255,.06)" : `${item.color}18`, cursor: safeActive===filtered.length-1 ? "default" : "pointer", color: safeActive===filtered.length-1 ? "rgba(255,255,255,.2)" : item.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, fontFamily:"inherit", transition:"all .15s" }}>
                      ›
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom stat pills */}
            <div style={{ marginTop:16, display:"flex", gap:12 }}>
              <div style={{ flex:1, background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.08)", borderRadius:14, padding:"14px 18px", display:"flex", alignItems:"center", gap:10 }}>
                {PAW_SHAPE("rgba(255,255,255,0.5)")}
                <div>
                  <div style={{ fontSize:18, fontWeight:800, color:"#fff", fontFamily:"'DM Serif Display',serif" }}>{TRIVIA_ITEMS_EXTENDED.length}</div>
                  <div style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,.4)", textTransform:"uppercase", letterSpacing:".1em" }}>Total Facts</div>
                </div>
              </div>
              <div style={{ flex:1, background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.08)", borderRadius:14, padding:"14px 18px", display:"flex", alignItems:"center", gap:10 }}>
                {BONE_SHAPE("rgba(255,255,255,0.5)")}
                <div>
                  <div style={{ fontSize:18, fontWeight:800, color:"#fff", fontFamily:"'DM Serif Display',serif" }}>{TRIVIA_CATEGORIES.length - 1}</div>
                  <div style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,.4)", textTransform:"uppercase", letterSpacing:".1em" }}>Categories</div>
                </div>
              </div>
              <div style={{ flex:1, background:"rgba(240,180,41,.06)", border:"1px solid rgba(240,180,41,.15)", borderRadius:14, padding:"14px 18px", display:"flex", alignItems:"center", gap:10 }}>
                {SHIELD_SHAPE("#f0b429")}
                <div>
                  <div style={{ fontSize:13, fontWeight:800, color:"#f0b429" }}>Vet-Verified</div>
                  <div style={{ fontSize:10, fontWeight:700, color:"rgba(240,180,41,.5)", textTransform:"uppercase", letterSpacing:".1em" }}>Content</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── FAQ ── */
function FAQSection() {
  const [openIdx, setOpenIdx] = useState(null);
  return (
    <section className="is-faq-section" id="faq">
      <div className="is-section">
        <div className="is-section-bar">
          <div>
            <div className="is-section-eyebrow">FAQ</div>
            <h2>Frequently Asked Questions</h2>
            <p className="is-section-sub">Quick answers to common questions about Angeles Animal Care Hospital.</p>
          </div>
        </div>
        <div style={{ maxWidth:760 }}>
          {FAQ_ITEMS.map((item,i) => (
            <div key={i} className="is-faq-item">
              <button className="is-faq-q" onClick={() => setOpenIdx(openIdx === i ? null : i)}>
                {item.q}
                <ChevronIcon open={openIdx === i} />
              </button>
              {openIdx === i && <p className="is-faq-a">{item.a}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Hamburger Drawer ── */
function BranchDrawer({ open, onClose }) {
  const navigate = useNavigate();
  const grouped = useMemo(() => {
    const map = {};
    BRANCHES.forEach(b => {
      if (!map[b.region]) map[b.region] = [];
      map[b.region].push(b);
    });
    return map;
  }, []);

  const [expanded, setExpanded] = useState(null);
  const toggle = (region) => setExpanded(expanded === region ? null : region);

  const handleBranchClick = (b) => {
    onClose();
    const route = BRANCH_ROUTES[b.slug];
    if (route) {
      navigate(route);
    } else {
      const el = document.getElementById(`branch-${b.id}`);
      if (el) el.scrollIntoView({ behavior:"smooth" });
    }
  };

  return (
    <>
      <div className={`is-overlay${open ? " open" : ""}`} onClick={onClose} />
      <div className={`is-drawer${open ? " open" : ""}`}>
        <div className="is-drawer-head">
          <div>
            <h3>Our Branches</h3>
            <p>{BRANCHES.length} locations across the Philippines</p>
          </div>
          <button className="is-drawer-close" onClick={onClose}><XIcon /></button>
        </div>

        <div className="is-drawer-body">
          {Object.entries(grouped).map(([region, branches]) => {
            const meta = REGIONS_META[region] || { color:"#2563eb", bg:"#dbeafe" };
            const isOpen = expanded === region;
            return (
              <div key={region} className="is-drawer-section">
                <button className="is-drawer-region-btn" onClick={() => toggle(region)}>
                  <div className="is-drawer-region-icon" style={{ background:meta.bg }}>
                    <span style={{ width:10, height:10, borderRadius:"50%", background:meta.color, display:"block" }} />
                  </div>
                  <span className="is-drawer-region-label">{region}</span>
                  <span className="is-drawer-region-count" style={{ background:meta.bg, color:meta.color }}>
                    {branches.length}
                  </span>
                  <ChevronIcon open={isOpen} />
                </button>

                {isOpen && (
                  <div className="is-drawer-branches">
                    {branches.map(b => {
                      const hasPage = !!BRANCH_ROUTES[b.slug];
                      return (
                        <div
                          key={b.id}
                          className={`is-drawer-branch-item${hasPage ? " is-drawer-branch-has-page" : ""}`}
                          onClick={() => handleBranchClick(b)}
                        >
                          <span
                            className="is-drawer-branch-dot"
                            style={{ background:b.type === "Hospital" ? "#dc2626" : meta.color }}
                          />
                          <span className="is-drawer-branch-name">{b.shortName}</span>
                          <span
                            className="is-drawer-branch-type"
                            style={{ background:b.type === "Hospital" ? "#fef2f2" : meta.bg, color:b.type === "Hospital" ? "#dc2626" : meta.color }}
                          >
                            {b.type}
                          </span>
                          {hasPage && (
                            <span className="is-drawer-branch-arrow">
                              <ArrowIcon />
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="is-drawer-footer">
          <button
            className="is-drawer-emergency"
            onClick={() => { onClose(); navigate("/emergency?guest=true"); }}
            style={{ background:"var(--red-soft)", border:"1.5px solid rgba(220,38,38,.2)", borderRadius:12, width:"100%", cursor:"pointer", fontFamily:"inherit" }}
          >
            <div style={{ width:36, height:36, borderRadius:"50%", background:"rgba(220,38,38,.15)", border:"1.5px solid rgba(220,38,38,.3)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </div>
            <div className="is-drawer-emergency-text">
              <strong>Pet Emergency?</strong>
              <span>Main Hospital · Open 24/7</span>
            </div>
          </button>
        </div>
      </div>
    </>
  );
}

/* ── Header ── */
function Header({ onFAQClick, onLoginClick }) {
  return (
    <header className="is-header">
      <div className="is-header-inner">
        <div className="is-brand">
          <img
            src="/image/446805041_881106557364617_1125518808684788316_n.jpg"
            alt="Angeles Animal Care Hospital"
            style={{ width:38, height:38, borderRadius:"50%", objectFit:"cover", flexShrink:0, border:"2px solid rgba(15,31,75,0.1)" }}
          />
          <div>
            <div className="is-brand-name">Angeles Animal Care Hospital</div>
            <div className="is-brand-sub">Branch Network</div>
          </div>
        </div>
        <nav className="is-header-nav">
          <button className="is-header-link" onClick={onFAQClick}>FAQ</button>
          <a className="is-header-link" href="#branches">Branches</a>
          <button className="is-header-login" onClick={onLoginClick}>Sign In</button>
        </nav>
      </div>
    </header>
  );
}

/* ── Hero ── */
function Hero({ onBrowse, onBookAppointment }) {
  return (
    <>
      <section className="is-hero">
        <div className="is-hero-inner" style={{ gridTemplateColumns:"1fr", maxWidth:860, textAlign:"center" }}>
          <div>
            <div className="is-eyebrow" style={{ justifyContent:"center" }}><span className="is-eyebrow-dot" /> Official Branch Directory</div>
            <h1 style={{ fontSize:"clamp(36px,5vw,60px)" }}>Compassionate care, <em>nationwide.</em></h1>
            <p style={{ margin:"0 auto 28px", maxWidth:640, fontSize:17 }}>
              Angeles Pet Care is renowned for its commitment to innovation and excellence in the field of veterinary medicine.
              10 Veterinary Clinics and 1 Veterinary Hospital, all committed to delivering advanced care, trusted expertise,
              and compassionate service.
            </p>
            <div className="is-hero-cta" style={{ justifyContent:"center" }}>
              <button className="is-hero-btn primary" onClick={onBrowse}>Browse Branches</button>
              <button className="is-hero-btn outline" onClick={onBookAppointment}>Book Appointment</button>
            </div>
            <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap", marginTop:36 }}>
              {[
                { num:"11", label:"Locations Nationwide" },
                { num:"24/7", label:"Emergency Hospital" },
                { num:"10", label:"Veterinary Clinics" },
                { num:"4", label:"Regions & Growing" },
              ].map(s => (
                <div key={s.label} style={{ background:"rgba(255,255,255,.07)", border:"1px solid rgba(255,255,255,.12)", borderRadius:12, padding:"14px 22px", textAlign:"center", minWidth:110 }}>
                  <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:30, lineHeight:1, color:"#fff" }}>{s.num}</div>
                  <div style={{ fontSize:10, fontWeight:700, letterSpacing:".14em", textTransform:"uppercase", color:"rgba(255,255,255,.5)", marginTop:5 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Emergency box ── */}
      <div style={{ background:"#0f1f4b", padding:"20px 24px 0" }}>
        <div style={{ maxWidth:1280, margin:"0 auto" }}>
          <div style={{ background:"#dc2626", borderRadius:16, padding:"16px 24px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12, boxShadow:"0 4px 20px rgba(220,38,38,.3)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:36, height:36, borderRadius:"50%", background:"rgba(255,255,255,.2)", border:"1.5px solid rgba(255,255,255,.4)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              </div>
              <div>
                <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:15, fontWeight:700, color:"#fff", textTransform:"uppercase", letterSpacing:".06em" }}>Pet Emergency?</div>
                <div style={{ fontSize:12, color:"rgba(255,255,255,.85)" }}>Main Hospital in Camachiles is open <strong style={{ color:"#fff" }}>24/7</strong></div>
              </div>
            </div>
            <a href="/emergency?guest=true" style={{ background:"#fff", color:"#dc2626", padding:"9px 20px", borderRadius:999, fontWeight:800, fontSize:13, textDecoration:"none", boxShadow:"0 4px 12px rgba(0,0,0,.15)", flexShrink:0, whiteSpace:"nowrap" }}>
              Send Emergency
            </a>
          </div>
        </div>
      </div>

      {/* ── Branch Map Image ── */}
      <div style={{ background:"#0f1f4b", padding:"20px 24px 24px" }}>
        <div style={{ maxWidth:1280, margin:"0 auto", borderRadius:16, overflow:"hidden" }}>
          <img
            src="/image/489754169_1101655551976382_1839478234078227315_n.jpg"
            alt="Angeles Pet Care Center Branches across the Philippines"
            style={{ width:"100%", display:"block", objectFit:"contain", objectPosition:"center", background:"#0f1f4b" }}
          />
        </div>
      </div>
    </>
  );
}

/* ── Footer ── */
function Footer() {
  const byRegion = useMemo(() => {
    const map = {};
    BRANCHES.forEach(b => { if (!map[b.region]) map[b.region] = []; map[b.region].push(b); });
    return map;
  }, []);

  return (
    <footer className="is-footer">
      <div className="is-footer-main">
        <div className="is-footer-brand">
          <img src="/image/446805041_881106557364617_1125518808684788316_n.jpg" alt="Angeles Animal Care Hospital"
            style={{ width:64, height:64, borderRadius:"50%", objectFit:"cover", border:"3px solid rgba(255,255,255,0.15)", marginBottom:14 }} />
          <h3>Angeles Animal Care Hospital</h3>
          <p>Providing compassionate veterinary care to pets across the Philippines since 2013. Your pet's health is our commitment.</p>
          <div className="is-footer-badge" style={{ marginTop:14 }}>Emergency: 0919-067-5710</div>
        </div>
        <div className="is-footer-col">
          <h4>Quick Links</h4>
          <a href="#branches">Find a Branch</a>
          <a href="#faq">FAQ</a>
          <a href="/login">Patient Portal</a>
          <a href="/register">Create Account</a>
          <a href="/login">Book Appointment</a>
        </div>
        <div className="is-footer-col">
          <h4>Our Regions</h4>
          {Object.entries(byRegion).map(([region, branches]) => (
            <a key={region} href="#branches">{region} ({branches.length})</a>
          ))}
        </div>
        <div className="is-footer-col">
          <h4>Contact</h4>
          <p><strong>Main Hospital (24/7)</strong></p>
          <p>Camachiles, Mabalacat City, Pampanga</p>
          <p style={{ marginTop:12 }}><strong>Phone</strong></p>
          <p>0919-067-5710</p>
          <p style={{ marginTop:12 }}>
            <a href="mailto:wellness.apcc@gmail.com">wellness.apcc@gmail.com</a>
          </p>
        </div>
      </div>
      <div style={{ borderTop:"1px solid rgba(255,255,255,.08)" }}>
        <div className="is-footer-bottom" style={{ maxWidth:1280, margin:"0 auto", padding:"18px 24px" }}>
          <p>© {new Date().getFullYear()} Angeles Animal Care Hospital. All rights reserved.</p>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <img src="/image/seraphvet-logo.png" alt="SeraphVet" style={{ width:32, height:32, objectFit:"contain", opacity:0.8 }} />
            <span style={{ fontSize:11, color:"rgba(255,255,255,.4)", letterSpacing:"0.04em" }}>
              Made with <strong style={{ color:"rgba(255,255,255,.7)", fontWeight:700 }}>SeraphVet</strong>
            </span>
          </div>
          <div className="is-footer-bottom-links">
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
            <a href="#">Sitemap</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ── Pills ── */
function Pills({ label, options, value, onChange }) {
  return (
    <div className="is-pills">
      <span className="is-pills-label">{label}:</span>
      {options.map(o => (
        <button key={o} className={`is-pill${value === o ? " active" : ""}`} onClick={() => onChange(o)}>{o}</button>
      ))}
    </div>
  );
}

/* ── Scroll reveal hook ── */
function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          const delay = entry.target.dataset.delay || 0;
          setTimeout(() => entry.target.classList.add('visible'), Number(delay));
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    els.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  });
}

/* ── Main Export ── */
export default function InformationSystemBranches() {
  const navigate = useNavigate();
  const [q, setQ]           = useState("");
  const [region, setRegion] = useState("All");
  const [type, setType]     = useState("All");
  const [loading, setLoading]       = useState(true);
  const [selectedBranch, setSelectedBranch] = useState(null);

  const faqRef    = useRef(null);
  const branchRef = useRef(null);

  useScrollReveal();

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 1400);
    return () => clearTimeout(t);
  }, []);

  const filtered = useMemo(() => BRANCHES.filter(b => {
    const matchQ = !q || (b.name + b.location + b.region + b.services.join(" ")).toLowerCase().includes(q.toLowerCase());
    const matchR = region === "All" || b.region === region;
    const matchT = type === "All" || b.type === type;
    return matchQ && matchR && matchT;
  }), [q, region, type]);

  const scrollToFAQ      = () => faqRef.current?.scrollIntoView({ behavior:"smooth" });
  const scrollToBranches = () => branchRef.current?.scrollIntoView({ behavior:"smooth" });

  return (
    <div className="is-root">
      <style>{styles}</style>

      {selectedBranch && <BranchModal branch={selectedBranch} onClose={() => setSelectedBranch(null)} />}
      <Header
        onFAQClick={scrollToFAQ}
        onLoginClick={() => navigate("/login")}
      />
      <Hero
        onBrowse={scrollToBranches}
        onBookAppointment={() => navigate("/login")}
      />

      {/* ── Branches Section ── */}
      <section className="is-section" id="branches" ref={branchRef}>
        <div className="is-section-bar reveal">
          <div>
            <div className="is-section-eyebrow">Our Network</div>
            <h2>Find a branch near you</h2>
            <p className="is-section-sub">Filter by region or facility type to locate your nearest Angeles Pet Care location.</p>
          </div>
          <div>
            <span className="is-count">{loading ? "—" : filtered.length}</span>
            <span className="is-count-label">of {BRANCHES.length} branches</span>
          </div>
        </div>

        <div className="is-controls reveal" data-delay="100">
          <div className="is-search">
            <SearchIcon />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by city, region, or service…" />
          </div>
          <Pills label="Region" options={REGIONS} value={region} onChange={setRegion} />
          <Pills label="Type"   options={TYPES}   value={type}   onChange={setType}   />
        </div>

        {loading ? (
          <div className="is-grid">
            {Array.from({ length:6 }).map((_,i) => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="is-empty reveal">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" style={{ margin:"0 auto", display:"block" }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <p>No branches match your filters. Try adjusting your search.</p>
          </div>
        ) : (
          <div className="is-grid">
            {filtered.map((b,i) => (
              <div key={b.id} className="reveal" data-delay={i * 60}>
                <BranchCard branch={b} index={i} onViewDetail={setSelectedBranch} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── AI Symptom Checker Promo ── */}
      <AISection />

      {/* ── Pet Health Trivia ── */}
      <TriviaSection />

      <div ref={faqRef}><FAQSection /></div>
      <Footer />
    </div>
  );
}