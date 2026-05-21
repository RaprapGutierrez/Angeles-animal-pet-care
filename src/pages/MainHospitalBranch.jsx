import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";

/* ============================================================
 *  Animal Care Hospital & Wellness Center — Main Branch Page
 *  Camachiles, Mabalacat City, Pampanga · Open 24/7
 * ============================================================ */

const BRANCH = {
  name: "Animal Care Hospital & Wellness Center",
  shortName: "Main Hospital",
  tag: "Flagship Hospital",
  type: "Hospital",
  location: "VIVAPE Center, Lot 2 Blk 6, Brgy. Camachiles, Mabalacat City, Pampanga",
  region: "Central Luzon",
  hours: "Open 24 / 7",
  phone: "0919-067-5710",
  email: "wellness.apcc@gmail.com",
  established: "2013",
  services: [
    { name: "Emergency Care",   icon: "🚨", desc: "24/7 life-saving emergency and critical care for your pets." },
    { name: "Surgery",          icon: "🔬", desc: "Advanced surgical procedures performed by experienced vets." },
    { name: "Wellness",         icon: "💊", desc: "Preventive care, nutrition counseling, and health check-ups." },
    { name: "Diagnostics",      icon: "🩻", desc: "X-ray, laboratory tests, and in-house diagnostic imaging." },
    { name: "Pharmacy",         icon: "💉", desc: "Full in-house pharmacy stocked with veterinary medicines." },
    { name: "Confinement",      icon: "🏥", desc: "24-hour monitored confinement and recovery ward." },
    { name: "Grooming",         icon: "✂️",  desc: "Professional grooming services for dogs and cats." },
    { name: "Vaccination",      icon: "🩹", desc: "Complete vaccination programs for puppies, kittens, and adults." },
  ],
};

/* ── Anniversary carousel images ── */
const CAROUSEL_IMAGES = [
  "/image/659095995_1393378589470742_2989406470381463044_n.jpg",   // anniversary poster
  "/image/672675334_1406428981499036_5194064879538016219_n.jpg",
  "/image/670870298_1406428948165706_3365835851445471143_n.jpg",
  "/image/672220868_1406428941499040_3703089939493593232_n.jpg",
  "/image/670226048_1406428938165707_4701138721142278759_n.jpg",
  "/image/671539182_1406428914832376_6201174285641876620_n.jpg",
  "/image/672013118_1406428921499042_3484761327445267791_n.jpg",
  "/image/671540769_1406428878165713_3752648918992931902_n.jpg",
  "/image/670260004_1406428871499047_8816875274548744087_n.jpg",
  "/image/670348684_1406428854832382_2810895362364742217_n.jpg",
  "/image/670795437_1406428754832392_8232943679219446149_n.jpg",
  "/image/671893869_1406429084832359_3002727526075765991_n.jpg",
  "/image/670207330_1406429088165692_892745496217266146_n.jpg",
  "/image/672674043_1406429081499026_5927751469395155213_n.jpg",
  "/image/672270499_1406429078165693_8360765542622275457_n.jpg",
  "/image/669141526_1406429041499030_486411476398414539_n.jpg",
  "/image/671692775_1406428984832369_8745781738073040946_n.jpg",
  "/image/506793976_10050063818443864_333745484112733140_n.jpg",   // reception interior
];

/* ── Icons ── */
const BackIcon  = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>;
const PinIcon   = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>;
const ClockIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const PhoneIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.35 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6.13 6.13l.96-.96a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>;
const MailIcon  = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>;
const MapIcon   = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>;
const ChevL     = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>;
const ChevR     = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>;

/* ── Styles ── */
const styles = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600;700&display=swap');

.mb-root { --navy:#0f1f4b; --navy2:#1a3470; --blue:#2563eb; --blue2:#1d4ed8; --blue-soft:#eff6ff; --gold:#f0b429; --red:#dc2626; --red-soft:#fef2f2; --green:#16a34a; --bg:#f0f4fc; --text:#0f172a; --muted:#64748b; --border:rgba(15,31,75,0.08); --border2:rgba(15,31,75,0.14); --r:20px; --sha:0 1px 3px rgba(15,31,75,.04),0 6px 20px rgba(15,31,75,.07); --sha-lg:0 16px 48px rgba(15,31,75,.16); font-family:'DM Sans',system-ui,sans-serif; background:var(--bg); color:var(--text); min-height:100vh; }
.mb-root *, .mb-root *::before, .mb-root *::after { box-sizing:border-box; margin:0; }

/* ── Top Bar ── */
.mb-topbar { position:sticky; top:0; z-index:200; background:rgba(255,255,255,0.94); backdrop-filter:blur(20px); border-bottom:1px solid var(--border2); }
.mb-topbar-inner { max-width:1280px; margin:0 auto; padding:0 24px; height:62px; display:flex; align-items:center; gap:14px; }
.mb-back-btn { display:flex; align-items:center; gap:6px; padding:8px 14px; border-radius:10px; border:1.5px solid var(--border2); background:#fff; color:var(--navy); font-family:inherit; font-size:13px; font-weight:700; cursor:pointer; transition:all .18s; text-decoration:none; }
.mb-back-btn:hover { border-color:var(--blue); color:var(--blue); background:var(--blue-soft); }
.mb-topbar-title { font-family:'DM Serif Display',serif; font-size:15px; color:var(--navy); flex:1; text-align:center; }
.mb-topbar-badge { background:var(--red); color:#fff; font-size:10px; font-weight:800; padding:4px 10px; border-radius:999px; letter-spacing:.08em; text-transform:uppercase; }

/* ── Hero ── */
.mb-hero { position:relative; background:linear-gradient(150deg,#0a1628 0%,#0f1f4b 50%,#1a3470 100%); color:#fff; overflow:hidden; }
.mb-hero-img { width:100%; height:420px; object-fit:cover; opacity:.35; display:block; }
.mb-hero-overlay { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:32px 24px; }
.mb-hero-badge { display:inline-flex; align-items:center; gap:6px; padding:5px 14px; border-radius:999px; border:1px solid rgba(255,255,255,.2); background:rgba(255,255,255,.07); font-size:10px; font-weight:800; letter-spacing:.2em; text-transform:uppercase; color:rgba(255,255,255,.85); margin-bottom:18px; }
.mb-hero-dot { width:6px; height:6px; border-radius:50%; background:#dc2626; animation:pulse24 1.5s ease-in-out infinite; }
.mb-hero h1 { font-family:'DM Serif Display',serif; font-size:clamp(28px,4vw,52px); line-height:1.1; margin-bottom:14px; }
.mb-hero h1 em { font-style:italic; color:var(--gold); }
.mb-hero-sub { font-size:15px; color:rgba(255,255,255,.7); max-width:560px; line-height:1.7; }
.mb-hero-pills { display:flex; gap:10px; flex-wrap:wrap; justify-content:center; margin-top:24px; }
.mb-hero-pill { display:flex; align-items:center; gap:6px; padding:8px 16px; border-radius:999px; background:rgba(255,255,255,.09); border:1px solid rgba(255,255,255,.15); font-size:13px; color:rgba(255,255,255,.85); font-weight:600; }

/* ── Info Strip ── */
.mb-info-strip { background:#fff; border-bottom:1px solid var(--border2); }
.mb-info-strip-inner { max-width:1280px; margin:0 auto; padding:20px 24px; display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:16px; }
.mb-info-item { display:flex; align-items:flex-start; gap:10px; }
.mb-info-icon { width:36px; height:36px; border-radius:10px; background:var(--blue-soft); display:flex; align-items:center; justify-content:center; color:var(--blue); flex-shrink:0; }
.mb-info-label { font-size:10px; font-weight:800; letter-spacing:.15em; text-transform:uppercase; color:var(--muted); margin-bottom:3px; }
.mb-info-val { font-size:13px; font-weight:600; color:var(--navy); line-height:1.4; }
.mb-info-val.emergency { color:var(--red); font-weight:800; }

/* ── Section ── */
.mb-section { max-width:1280px; margin:0 auto; padding:60px 24px; }
.mb-eyebrow { font-size:10px; font-weight:800; letter-spacing:.25em; text-transform:uppercase; color:var(--blue); margin-bottom:10px; }
.mb-section h2 { font-family:'DM Serif Display',serif; font-size:clamp(26px,3vw,40px); color:var(--navy); margin-bottom:8px; }
.mb-section-sub { font-size:15px; color:var(--muted); max-width:500px; margin-bottom:36px; }

/* ── Services Grid ── */
.mb-services { display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:16px; }
.mb-service-card { background:#fff; border-radius:16px; border:1px solid var(--border); padding:22px; box-shadow:var(--sha); transition:transform .22s,box-shadow .22s; }
.mb-service-card:hover { transform:translateY(-4px); box-shadow:var(--sha-lg); }
.mb-service-icon { font-size:28px; margin-bottom:12px; }
.mb-service-name { font-family:'DM Serif Display',serif; font-size:18px; color:var(--navy); margin-bottom:6px; }
.mb-service-desc { font-size:13px; color:var(--muted); line-height:1.6; }

/* ── Interior Photos ── */
.mb-photos { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
.mb-photo { border-radius:16px; overflow:hidden; box-shadow:var(--sha); }
.mb-photo img { width:100%; height:280px; object-fit:cover; display:block; transition:transform .4s; }
.mb-photo:hover img { transform:scale(1.04); }
.mb-photo-wide { grid-column:span 2; }
.mb-photo-wide img { height:360px; }

/* ── Carousel ── */
.mb-carousel-wrap { position:relative; border-radius:20px; overflow:hidden; box-shadow:var(--sha-lg); background:#0f1f4b; }
.mb-carousel-track { display:flex; transition:transform .5s cubic-bezier(.25,.46,.45,.94); }
.mb-carousel-slide { min-width:100%; position:relative; }
.mb-carousel-slide img { width:100%; height:480px; object-fit:cover; display:block; }
.mb-carousel-overlay { position:absolute; inset:0; background:linear-gradient(to top,rgba(10,22,40,.6) 0%,transparent 60%); }
.mb-carousel-btn { position:absolute; top:50%; transform:translateY(-50%); width:44px; height:44px; border-radius:50%; background:rgba(255,255,255,.15); border:1.5px solid rgba(255,255,255,.3); backdrop-filter:blur(8px); color:#fff; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all .18s; z-index:10; }
.mb-carousel-btn:hover { background:rgba(255,255,255,.3); }
.mb-carousel-btn.prev { left:16px; }
.mb-carousel-btn.next { right:16px; }
.mb-carousel-dots { display:flex; gap:6px; justify-content:center; margin-top:14px; flex-wrap:wrap; }
.mb-carousel-dot { width:8px; height:8px; border-radius:50%; background:rgba(15,31,75,.2); border:none; cursor:pointer; transition:all .2s; padding:0; }
.mb-carousel-dot.active { background:var(--navy); transform:scale(1.3); }
.mb-carousel-counter { position:absolute; bottom:16px; right:20px; background:rgba(0,0,0,.5); color:#fff; font-size:12px; font-weight:700; padding:4px 10px; border-radius:999px; backdrop-filter:blur(6px); }

/* ── Anniversary Section ── */
.mb-anniv { background:linear-gradient(135deg,#0f1f4b 0%,#1a3470 100%); padding:64px 24px; }
.mb-anniv-inner { max-width:1280px; margin:0 auto; }
.mb-anniv-eyebrow { font-size:10px; font-weight:800; letter-spacing:.25em; text-transform:uppercase; color:var(--gold); margin-bottom:10px; }
.mb-anniv h2 { font-family:'DM Serif Display',serif; font-size:clamp(26px,3vw,40px); color:#fff; margin-bottom:8px; }
.mb-anniv-sub { font-size:15px; color:rgba(255,255,255,.65); margin-bottom:36px; }

/* ── CTA ── */
.mb-cta { background:linear-gradient(135deg,var(--red) 0%,#b91c1c 100%); padding:64px 24px; text-align:center; }
.mb-cta h2 { font-family:'DM Serif Display',serif; font-size:clamp(28px,3.5vw,44px); color:#fff; margin-bottom:12px; }
.mb-cta p { font-size:16px; color:rgba(255,255,255,.8); margin-bottom:28px; }
.mb-cta-btns { display:flex; gap:12px; justify-content:center; flex-wrap:wrap; }
.mb-btn { padding:13px 28px; border-radius:10px; font-family:inherit; font-size:14px; font-weight:800; cursor:pointer; border:none; text-decoration:none; display:inline-flex; align-items:center; gap:8px; transition:all .2s; }
.mb-btn-white { background:#fff; color:var(--red); }
.mb-btn-white:hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(0,0,0,.2); }
.mb-btn-outline { background:rgba(255,255,255,.12); color:#fff; border:1.5px solid rgba(255,255,255,.3); }
.mb-btn-outline:hover { background:rgba(255,255,255,.22); }

/* ── Animations ── */
@keyframes pulse24 { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(.7)} }

/* ── Responsive ── */
@media(max-width:768px) {
  .mb-photos { grid-template-columns:1fr; }
  .mb-photo-wide { grid-column:span 1; }
  .mb-photo img,.mb-photo-wide img { height:220px; }
  .mb-carousel-slide img { height:280px; }
  .mb-info-strip-inner { grid-template-columns:1fr 1fr; }
}
@media(max-width:480px) {
  .mb-info-strip-inner { grid-template-columns:1fr; }
  .mb-topbar-title { display:none; }
}
`;

/* ── Auto Carousel ── */
function Carousel({ images, interval = 4000 }) {
  const [cur, setCur] = useState(0);
  const timerRef = useRef(null);

  const go = useCallback((idx) => {
    setCur((idx + images.length) % images.length);
  }, [images.length]);

  useEffect(() => {
    timerRef.current = setInterval(() => go(cur + 1), interval);
    return () => clearInterval(timerRef.current);
  }, [cur, go, interval]);

  const handleNav = (dir) => {
    clearInterval(timerRef.current);
    go(cur + dir);
  };

  return (
    <div>
      <div className="mb-carousel-wrap">
        <div
          className="mb-carousel-track"
          style={{ transform: `translateX(-${cur * 100}%)` }}
        >
          {images.map((src, i) => (
            <div key={i} className="mb-carousel-slide">
              <img src={src} alt={`Anniversary photo ${i + 1}`} loading="lazy" />
              <div className="mb-carousel-overlay" />
            </div>
          ))}
        </div>

        <button className="mb-carousel-btn prev" onClick={() => handleNav(-1)}>
          <ChevL />
        </button>
        <button className="mb-carousel-btn next" onClick={() => handleNav(1)}>
          <ChevR />
        </button>
        <div className="mb-carousel-counter">{cur + 1} / {images.length}</div>
      </div>

      <div className="mb-carousel-dots">
        {images.map((_, i) => (
          <button
            key={i}
            className={`mb-carousel-dot${i === cur ? " active" : ""}`}
            onClick={() => { clearInterval(timerRef.current); setCur(i); }}
          />
        ))}
      </div>
    </div>
  );
}

/* ── Main Export ── */
export default function MainHospitalBranch() {
  const navigate = useNavigate();

  return (
    <div className="mb-root">
      <style>{styles}</style>

      {/* ── Top Bar ── */}
      <div className="mb-topbar">
        <div className="mb-topbar-inner">
          <button className="mb-back-btn" onClick={() => navigate(-1)}>
            <BackIcon /> Back to Branches
          </button>
          <span className="mb-topbar-title">Animal Care Hospital & Wellness Center</span>
          <span className="mb-topbar-badge">Open 24/7</span>
        </div>
      </div>

      {/* ── Hero ── */}
      <div className="mb-hero">
        <img
          className="mb-hero-img"
          src="/image/433465391_834843408657599_1154591747328298554_n.jpg"
          alt="Animal Care Hospital and Wellness Center"
        />
        <div className="mb-hero-overlay">
          <div className="mb-hero-badge">
            <span className="mb-hero-dot" />
            Flagship Hospital · Open 24 / 7
          </div>
          <h1>Animal Care Hospital<br />&amp; <em>Wellness Center</em></h1>
          <p className="mb-hero-sub">
            Camachiles, Mabalacat City, Pampanga · Serving Central Luzon since 2013 with compassionate, expert veterinary care.
          </p>
          <div className="mb-hero-pills">
            <span className="mb-hero-pill">🚨 Emergency Care</span>
            <span className="mb-hero-pill">🔬 Surgery</span>
            <span className="mb-hero-pill">🏥 Confinement</span>
            <span className="mb-hero-pill">🩻 Diagnostics</span>
          </div>
        </div>
      </div>

      {/* ── Info Strip ── */}
      <div className="mb-info-strip">
        <div className="mb-info-strip-inner">
          <div className="mb-info-item">
            <div className="mb-info-icon"><ClockIcon /></div>
            <div>
              <div className="mb-info-label">Hours</div>
              <div className="mb-info-val emergency">Open 24 Hours · 7 Days</div>
            </div>
          </div>
          <div className="mb-info-item">
            <div className="mb-info-icon"><PhoneIcon /></div>
            <div>
              <div className="mb-info-label">Phone</div>
              <div className="mb-info-val">0919-067-5710</div>
            </div>
          </div>
          <div className="mb-info-item">
            <div className="mb-info-icon"><MailIcon /></div>
            <div>
              <div className="mb-info-label">Email</div>
              <div className="mb-info-val">wellness.apcc@gmail.com</div>
            </div>
          </div>
          <div className="mb-info-item">
            <div className="mb-info-icon"><PinIcon /></div>
            <div>
              <div className="mb-info-label">Address</div>
              <div className="mb-info-val">VIVAPE Center, Lot 2 Blk 6, Brgy. Camachiles, Mabalacat City</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Interior Photos ── */}
      <div className="mb-section" style={{ paddingBottom: 0 }}>
        <div className="mb-eyebrow">Inside the Hospital</div>
        <h2>Our Facility</h2>
        <p className="mb-section-sub">A clean, fully equipped hospital designed for your pet's comfort and recovery.</p>
        <div className="mb-photos">
          <div className="mb-photo mb-photo-wide">
            <img
              src="/image/506793976_10050063818443864_333745484112733140_n.jpg"
              alt="Hospital reception and lobby"
            />
          </div>
          <div className="mb-photo">
            <img
              src="/image/510796567_23886666877690324_2613413447065748375_n.jpg"
              alt="Hospital team"
            />
          </div>
          <div className="mb-photo">
            <img
              src="/image/433465391_834843408657599_1154591747328298554_n.jpg"
              alt="Animal Care Hospital banner"
            />
          </div>
        </div>
      </div>

      {/* ── Services ── */}
      <div className="mb-section">
        <div className="mb-eyebrow">What We Offer</div>
        <h2>Services Available</h2>
        <p className="mb-section-sub">Full-spectrum veterinary care under one roof — from routine wellness to advanced surgery.</p>
        <div className="mb-services">
          {BRANCH.services.map((s) => (
            <div key={s.name} className="mb-service-card">
              <div className="mb-service-icon">{s.icon}</div>
              <div className="mb-service-name">{s.name}</div>
              <div className="mb-service-desc">{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 13th Anniversary Carousel ── */}
      <div className="mb-anniv">
        <div className="mb-anniv-inner">
          <div className="mb-anniv-eyebrow">🎉 Celebrating 13 Years</div>
          <h2>13th Anniversary — April 14, 2026</h2>
          <p className="mb-anniv-sub">
            Relive the moments from our 13th anniversary celebration — free consultations, grooming discounts, vaccines, and more shared with the community we love.
          </p>
          <Carousel images={CAROUSEL_IMAGES} interval={4000} />
        </div>
      </div>

      {/* ── CTA ── */}
      <div className="mb-cta">
        <h2>Need Urgent Care for Your Pet?</h2>
        <p>Our team is available 24 hours a day, 7 days a week — no appointment needed for emergencies.</p>
        <div className="mb-cta-btns">
          <a className="mb-btn mb-btn-white" href="tel:09190675710">
            📞 Call Now · 0919-067-5710
          </a>
          <a className="mb-btn mb-btn-outline" href="/emergency?guest=true">
            🚨 Send Emergency Report
          </a>
          <a
            className="mb-btn mb-btn-outline"
            href={`https://maps.google.com/?q=${encodeURIComponent("VIVAPE Center, Lot 2 Blk 6, Brgy. Camachiles, Mabalacat City, Pampanga")}`}
            target="_blank"
            rel="noreferrer"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>
            Get Directions
          </a>
        </div>
      </div>
    </div>
  );
}
