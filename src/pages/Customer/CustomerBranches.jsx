import React, { useState, useEffect, useRef, useCallback } from 'react';
import Layout from '../../components/layout';
import { supabase } from '../../js/Utils/supabase';
import "../../styles/CustomerBranches.css";
// No branch filter needed — CustomerBranches reads the public branches table
// which has no branch_id scoping (all customers see all active branches).

if (typeof document !== 'undefined' && !document.getElementById('leaflet-css')) {
  const css = document.createElement('link');
  css.id = 'leaflet-css';
  css.rel = 'stylesheet';
  css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  document.head.appendChild(css);
}

const makeDivIcon = (L) => L.divIcon({
  html: `<div style="
    width:36px;height:36px;border-radius:50% 50% 50% 0;
    background:linear-gradient(135deg,#1e3a8a,#3b5fc0);
    transform:rotate(-45deg);
    border:3px solid #fff;
    box-shadow:0 3px 10px rgba(30,58,138,0.4)">
  </div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -38],
  className: '',
});

const Skeleton = ({ w = '100%', h = 14, r = 6, mb = 0 }) => (
  <div style={{
    width: w, height: h, borderRadius: r,
    background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.4s infinite',
    marginBottom: mb,
    flexShrink: 0,
  }} />
);

const CustomerBranches = () => {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  const mapDivRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  const placeMarkers = useCallback((list) => {
    if (!window.L || !mapRef.current) {
      setTimeout(() => placeMarkers(list), 200);
      return;
    }
    const L = window.L;
    const map = mapRef.current;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const validCoords = [];
    list.forEach(b => {
      const lat = parseFloat(b.lat);
      const lng = parseFloat(b.lng);
      if (isNaN(lat) || isNaN(lng)) return;

      const marker = L.marker([lat, lng], { icon: makeDivIcon(L) }).addTo(map);
      marker.bindPopup(`
        <div style="font-family:sans-serif;min-width:220px;padding:4px">
          <div style="font-weight:800;font-size:14px;color:#1e3a8a;margin-bottom:4px">${b.name}</div>
          <div style="font-size:12px;color:#64748b;margin-bottom:4px;line-height:1.4">${b.address || ''}</div>
          <div style="font-size:12px;color:#64748b">${b.phone || ''}</div>
          <div style="margin-top:8px">
            <a href="https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}" target="_blank"
              style="font-size:12px;color:#1e3a8a;font-weight:700;text-decoration:none">
              View on Map →
            </a>
          </div>
        </div>`, { maxWidth: 280 });

      markersRef.current.push(marker);
      validCoords.push([lat, lng]);
    });

    if (validCoords.length > 0) {
      map.fitBounds(validCoords, { padding: [40, 40] });
    }
  }, []);

  // ── PATCH: branches table is global (no branch_id column) — no filter needed
  const fetchBranches = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('branches')
      .select('*')
      .eq('status', 'Active')
      .order('name');
    if (!error && data) setBranches(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchBranches(); }, [fetchBranches]);

  useEffect(() => {
    if (branches.length > 0) placeMarkers(branches);
  }, [branches, placeMarkers]);

  useEffect(() => {
    const initMap = () => {
      if (!mapDivRef.current || mapRef.current) return;
      const L = window.L;
      if (!L) return;

      const map = L.map(mapDivRef.current).setView([15.25, 120.58], 11);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);
      mapRef.current = map;

      setTimeout(() => {
        map.invalidateSize();
        if (branches.length > 0) placeMarkers(branches);
      }, 150);
    };

    if (window.L) {
      initMap();
    } else if (!document.getElementById('leaflet-js')) {
      const script = document.createElement('script');
      script.id = 'leaflet-js';
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = initMap;
      document.head.appendChild(script);
    } else {
      const poll = setInterval(() => {
        if (window.L) { clearInterval(poll); initMap(); }
      }, 100);
      return () => clearInterval(poll);
    }

    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const S = {
    page: { width: '100%', minHeight: '100vh', display: 'block' },
    topbar: {
      background: 'var(--card)', borderBottom: '1px solid var(--border)',
      padding: '8px 12px', display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', position: 'fixed',
      top: 68, left: 'var(--current-sidebar-w, 62px)', right: 0,
      zIndex: 40, boxSizing: 'border-box', gap: 6, flexWrap: 'nowrap',
    },
    cont: {
      padding: '12px 12px',
      paddingTop: 122,
      width: '100%', boxSizing: 'border-box',
    },
  };  

  return (
    <Layout>
      <div style={S.page}>
        {/* ── Top bar ── */}
        <div style={S.topbar} className="branches-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img
              src="/icon/branches.png" alt=""
              style={{ width: 22, height: 22, filter: 'brightness(0) saturate(100%) invert(17%) sepia(82%) saturate(1200%) hue-rotate(210deg)' }}
            />
            <div style={{ minWidth: 0 }}>
              <h1 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Our Branches</h1>
              <p style={{ fontSize: 11, color: 'var(--muted)', margin: 0, whiteSpace: 'nowrap' }}>Find a branch near you</p>
            </div>
          </div>
        </div>

        <div style={S.cont}>
          {/* Stat cards */}
          <div className="branches-stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, marginBottom: 24 }}>
            {[
              { label: 'Total Branches', value: branches.length, icon: '/icon/branches.png', color: '#dbeafe', filter: 'invert(37%) sepia(90%) saturate(500%) hue-rotate(195deg) brightness(95%)', accent: '#3b82f6', sub: 'All branches', subColor: 'var(--muted)' },
              { label: 'Active', value: branches.filter(b => b.status === 'Active').length, icon: '/icon/available.png', color: '#dcfce7', filter: 'invert(50%) sepia(60%) saturate(400%) hue-rotate(100deg) brightness(90%)', accent: '#16a34a', sub: 'Currently active', subColor: '#16a34a' },
            ].map((sc, i) => (
              <div key={i} className="fade-in" style={{
                animationDelay: `${i * 0.08}s`,
                background: 'var(--card)',
                borderRadius: 11,
                border: '1px solid var(--border)',
                borderTop: `3px solid ${sc.accent}`,
                boxSizing: 'border-box',
                padding: '16px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                boxShadow: 'var(--shadow)',
                minWidth: 0,
                overflow: 'hidden',
                transition: 'transform 0.18s ease, box-shadow 0.18s ease',
                cursor: 'default',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(30,58,138,0.12)'; e.currentTarget.style.border = '1px solid rgba(30,58,138,0.3)'; e.currentTarget.style.borderTop = `3px solid ${sc.accent}`; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'var(--shadow)'; e.currentTarget.style.border = '1px solid var(--border)'; e.currentTarget.style.borderTop = `3px solid ${sc.accent}`; }}
              >
                <div style={{ width: 40, height: 40, borderRadius: 9, background: sc.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <img src={sc.icon} alt={sc.label} width={20} height={20} style={{ filter: sc.filter, display: 'block' }} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.6px' }}>{sc.label}</p>
                  <h3 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', margin: '0 0 2px', lineHeight: 1 }}>{sc.value}</h3>
                  <p style={{ fontSize: 10, color: sc.subColor, margin: 0, fontWeight: 600 }}>{sc.sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Map */}
          <div style={{ background: 'var(--card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)', marginBottom: 24, overflow: 'hidden', position: 'relative', zIndex: 0 }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Branch Locations</h2>
            </div>
            <div ref={mapDivRef} style={{ height: 280, width: '100%', position: 'relative', zIndex: 0 }} />
          </div>

          {/* Branch cards */}
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 12 }}>
              {[...Array(4)].map((_, i) => (
                <div key={i} style={{ background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                  {/* Card header */}
                  <div style={{ height: 80, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Skeleton w={40} h={40} r={8} />
                  </div>
                  <div style={{ padding: 16 }}>
                    {/* Name + badge */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <Skeleton w="55%" h={14} r={5} />
                      <Skeleton w={55} h={22} r={20} />
                    </div>
                    {/* Address */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <Skeleton w={13} h={13} r={3} />
                      <Skeleton w="80%" h={11} r={4} />
                    </div>
                    {/* Phone + email */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <Skeleton w={13} h={13} r={3} />
                      <Skeleton w="35%" h={11} r={4} />
                      <Skeleton w={13} h={13} r={3} />
                      <Skeleton w="35%" h={11} r={4} />
                    </div>
                    {/* Manager */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                      <Skeleton w={13} h={13} r={3} />
                      <Skeleton w="50%" h={11} r={4} />
                    </div>
                    {/* Service tags */}
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Skeleton w={70} h={24} r={99} />
                      <Skeleton w={60} h={24} r={99} />
                      <Skeleton w={80} h={24} r={99} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 12 }}>
              {branches.map((b, i) => (
                <div key={b.id} className="fade-in"
                  style={{ background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', transition: 'all 0.2s', boxShadow: 'var(--shadow)', animationDelay: `${i * 0.06}s` }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 24px rgba(30,58,138,0.13)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow)'; e.currentTarget.style.transform = ''; }}>
                  <div style={{ height: 80, background: 'linear-gradient(135deg,var(--light-blue),#c7d7f5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src="/icon/branches.png" alt="" style={{ width: 40, height: 40, filter: 'brightness(0) saturate(100%) invert(17%) sepia(82%) saturate(1200%) hue-rotate(210deg)', opacity: 0.6 }} />
                  </div>
                  <div style={{ padding: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{b.name}</h3>
                      <span className={`badge ${b.status === 'Active' ? 'badge-green' : 'badge-red'}`}>{b.status}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 5, minWidth: 0 }}>
                      <img src="/icon/location.png" alt="" style={{ width: 13, height: 13, marginTop: 1, flexShrink: 0, filter: 'brightness(0) saturate(100%) invert(40%)' }} />
                      <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0, minwidth: 0 }}>{b.address}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5, minWidth: 0 }}>
                      <img src="/icon/phone.png" alt="" style={{ width: 13, height: 13, flexShrink: 0, filter: 'brightness(0) saturate(100%) invert(40%)' }} />
                      <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0, whiteSpace: 'nowrap' }}>{b.phone}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5, minWidth: 0 }}>
                      <img src="/icon/email.png" alt="" style={{ width: 13, height: 13, flexShrink: 0, filter: 'brightness(0) saturate(100%) invert(40%)' }} />
                      <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0, overflow: 'hidden', textoverflow: 'ellipsis', whitespace: 'nowrap', minwidth: 0 }}>{b.email}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                      <img src="/icon/admin.png" alt="" style={{ width: 13, height: 13, flexShrink: 0, filter: 'brightness(0) saturate(100%) invert(40%)' }} />
                      <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>Manager: <strong>{b.manager}</strong></p>
                    </div>
                    {b.services && b.services.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {b.services.map(svc => (
                          <span key={svc} style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: 'var(--light-blue)', color: 'var(--royal)' }}>{svc}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default CustomerBranches;