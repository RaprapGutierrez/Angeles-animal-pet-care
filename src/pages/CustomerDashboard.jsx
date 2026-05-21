import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../js/supabase';
import { getNavLinks } from '../js/branchTables';
import Layout, { getNavIcon } from '../components/layout';
import { useCurrentUser } from '../js/useCurrentUser';
import { useBranchFilter } from '../js/useBranchFilter';

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

const CustomerDashboard = () => {
  const [pets, setPets] = useState([]);
  const [appts, setAppts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [time, setTime] = useState(new Date());
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 640);

  const { user, loading: userLoading } = useCurrentUser();
  const { applyFilter } = useBranchFilter();

  useEffect(() => {
    if (document.getElementById('shimmer-style')) return;
    const style = document.createElement('style');
    style.id = 'shimmer-style';
    style.textContent = `@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`;
    document.head.appendChild(style);
  }, []);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 640);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const role = user?.role || 'customer';

  const QUICK_LINKS = getNavLinks(role, user?.branchId)
    .filter(link => link.href && !link.isEmergency && !link.isAI && link.href !== '/customer/dashboard')
    .map(link => ({ label: link.label, to: link.href, icon: link.icon }));

  const qlCols = isMobile
    ? Math.min(QUICK_LINKS.length, 4)
    : Math.min(QUICK_LINKS.length, 6);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (userLoading || !user?.id) return;
    fetchData();

    // ── PATCH: use flat table names; realtime channels still work the same ──
    const patientsChannel = supabase
      .channel(`customer-dash-patients-${user.branchId || 'all'}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'patients' },
        () => { fetchData(); }
      ).subscribe();

    const apptsChannel = supabase
      .channel(`customer-dash-appts-${user.branchId || 'all'}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'appointments' },
        () => { fetchData(); }
      ).subscribe();

    return () => {
      supabase.removeChannel(patientsChannel);
      supabase.removeChannel(apptsChannel);
    };
  }, [user, userLoading]);

  const fetchData = async () => {
    if (!user?.id) return;
    setLoading(true);
    const name = user.fullName || '';

    // ── PATCH: apply branch filter to both queries ─────────────────────────
    const [petsRes, apptsRes] = await Promise.all([
      applyFilter(supabase.from('patients').select('*').ilike('owner', `%${name}%`)),
      applyFilter(
        supabase.from('appointments').select('*')
          .ilike('owner', `%${name}%`)
          .gte('date', new Date().toISOString().split('T')[0])
          .order('date')
          .limit(3)
      ),
    ]);
    setPets(petsRes.data || []);
    setAppts(apptsRes.data || []);
    setLoading(false);
  };

  const dateStr = time.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const STAT_CARDS = [
    { label: 'My Pets',        value: loading ? '—' : pets.length,                                      icon: '/icon/paw.png',         color: '#dbeafe', filter: 'invert(37%) sepia(90%) saturate(500%) hue-rotate(195deg) brightness(95%)' },
    { label: 'Upcoming Appts', value: loading ? '—' : appts.length,                                     icon: '/icon/appointment.png', color: '#dcfce7', filter: 'invert(50%) sepia(60%) saturate(400%) hue-rotate(100deg) brightness(90%)' },
    { label: 'Admitted Pets',  value: loading ? '—' : pets.filter(p => p.status === 'Admitted').length, icon: '/icon/admitted.png',    color: '#fef9c3', filter: 'invert(70%) sepia(80%) saturate(500%) hue-rotate(5deg) brightness(95%)' },
    { label: 'Pending Appts',  value: loading ? '—' : appts.filter(a => a.status === 'Pending').length, icon: '/icon/pending.png',     color: '#fee2e2', filter: 'invert(30%) sepia(80%) saturate(500%) hue-rotate(330deg) brightness(95%)' },
  ];

  // Show a proper loading/login state while user resolves
 if (userLoading) {
    return (
      <Layout isCustomer>
        <div style={{
          padding: isMobile ? '12px' : '24px 28px',
          paddingTop: isMobile ? '68px' : 'calc(var(--topbar-h) + 20px)',
          width: '100%', boxSizing: 'border-box',
        }}>
          {/* Banner skeleton */}
          <div style={{ background: '#e2e8f0', borderRadius: 14, padding: '22px 24px', marginBottom: 18 }}>
            <Skeleton w="40%" h={18} r={8} mb={8} />
            <Skeleton w="25%" h={12} r={6} />
          </div>

          {/* Stat cards skeleton */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: isMobile ? 8 : 14, marginBottom: 18 }}>
            {[...Array(4)].map((_, i) => (
              <div key={i} style={{ background: '#fff', borderRadius: 11, border: '1px solid var(--border)', padding: '15px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <Skeleton w={42} h={42} r={9} />
                <div style={{ flex: 1 }}>
                  <Skeleton w="60%" h={10} r={5} mb={6} />
                  <Skeleton w="35%" h={22} r={6} />
                </div>
              </div>
            ))}
          </div>

          {/* Quick links skeleton */}
          <Skeleton w="15%" h={10} r={4} mb={11} />
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${qlCols}, 1fr)`, gap: isMobile ? 6 : 10, marginBottom: 18 }}>
            {[...Array(qlCols)].map((_, i) => (
              <div key={i} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '13px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <Skeleton w={38} h={38} r={8} />
                <Skeleton w="70%" h={10} r={5} />
              </div>
            ))}
          </div>

          {/* Bottom panels skeleton */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
            {[0, 1].map(i => (
              <div key={i} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ padding: '13px 16px', borderBottom: '1px solid var(--border)' }}>
                  <Skeleton w="50%" h={13} r={6} />
                </div>
                <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[...Array(3)].map((_, j) => (
                    <div key={j} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <Skeleton w={30} h={30} r={7} />
                      <div style={{ flex: 1 }}>
                        <Skeleton w="70%" h={11} r={5} mb={5} />
                        <Skeleton w="45%" h={9} r={4} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  if (!user?.id) {
    return (
      <Layout>
        <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Please log in</h2>
          <p style={{ fontSize: 13 }}>Your session could not be detected. Please sign in again.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout isCustomer>
      <div style={{ width: '100%', display: 'block' }}>
        <div style={{
          padding: isMobile ? '12px' : '24px 28px',
          paddingTop: isMobile ? '68px' : 'calc(var(--topbar-h) + 20px)',
          width: '100%',
          boxSizing: 'border-box',
        }}>

          {/* ── Welcome Banner ── */}
          <div style={{
            background: 'linear-gradient(135deg,#1a1a6e,#1e3a8a,#3b5fc0)',
            borderRadius: 14,
            padding: isMobile ? '14px 16px' : '22px 24px',
            marginBottom: isMobile ? 12 : 18,
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'flex-start' : 'center',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
            gap: isMobile ? 6 : 0,
          }}>
            <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
            <div>
              <h1 style={{ fontSize: isMobile ? 15 : 20, fontWeight: 800, color: '#fff', marginBottom: 2 }}>
                Hello, <span style={{ color: '#7dd3fc' }}>{user.fullName || 'Pet Owner'}</span>!{' '}
                <img src="/icon/paw.png" alt="paw" width={isMobile ? 14 : 20} height={isMobile ? 14 : 20} style={{ verticalAlign: 'middle' }} />
              </h1>
              <p style={{ fontSize: isMobile ? 11 : 13, color: 'rgba(255,255,255,0.7)', margin: 0 }}>Welcome to your pet care portal</p>
            </div>
            <div style={{ textAlign: isMobile ? 'left' : 'right', color: 'rgba(255,255,255,0.6)', fontSize: isMobile ? 10 : 12, zIndex: 1 }}>
              <strong style={{ display: 'block', fontSize: isMobile ? 11 : 13, color: '#fff', fontWeight: 700 }}>{dateStr}</strong>
              {timeStr}
            </div>
          </div>

          {/* ── Stat Cards ── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2,1fr)',
            gap: isMobile ? 8 : 14,
            marginBottom: isMobile ? 12 : 18,
          }}>
            {STAT_CARDS.map((sc, i) => (
              <div key={i} style={{
                background: '#fff',
                borderRadius: 11,
                border: '1px solid var(--border)',
                padding: isMobile ? '10px 10px' : '15px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: isMobile ? 8 : 12,
                boxShadow: 'var(--shadow)',
                minWidth: 0,
                overflow: 'hidden',
              }}>
                <div style={{
                  width: isMobile ? 34 : 42,
                  height: isMobile ? 34 : 42,
                  borderRadius: 9,
                  background: sc.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <img src={sc.icon} alt={sc.label} width={isMobile ? 16 : 20} height={isMobile ? 16 : 20} style={{ filter: sc.filter }} />
                </div>
                <div style={{ minWidth: 0, overflow: 'hidden' }}>
                  <p style={{ fontSize: isMobile ? 10 : 11, color: 'var(--muted)', fontWeight: 600, marginBottom: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sc.label}</p>
                  <h3 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 800, color: 'var(--text)', margin: 0, lineHeight: 1 }}>{sc.value}</h3>
                </div>
              </div>
            ))}
          </div>

          {/* ── Quick Links ── */}
          <p style={{ fontSize: isMobile ? 10 : 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: isMobile ? 7 : 11 }}>QUICK ACCESS</p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${qlCols}, 1fr)`,
            gap: isMobile ? 6 : 10,
            marginBottom: isMobile ? 12 : 18,
          }}>
            {QUICK_LINKS.map(ql => (
              <Link key={ql.to} to={ql.to} style={{
                background: '#fff',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: isMobile ? '8px 4px' : '13px 8px',
                textAlign: 'center',
                textDecoration: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: isMobile ? 4 : 6,
                transition: 'all 0.2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--royal)'; e.currentTarget.style.background = 'var(--light-blue)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = '#fff'; }}>
                <div style={{
                  width: isMobile ? 30 : 38,
                  height: isMobile ? 30 : 38,
                  borderRadius: 8,
                  background: 'var(--light-blue)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <svg
                    width={isMobile ? 14 : 18}
                    height={isMobile ? 14 : 18}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--royal)"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {getNavIcon(ql.label, ql.to)}
                  </svg>
                </div>
                <span style={{ fontSize: isMobile ? 9 : 11, fontWeight: 600, color: 'var(--muted)', lineHeight: 1.2 }}>{ql.label}</span>
              </Link>
            ))}
          </div>

          {/* ── Upcoming Appointments + My Pets ── */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 10 : 14 }}>

            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? '10px 12px' : '13px 16px', borderBottom: '1px solid var(--border)' }}>
                <h3 style={{ fontSize: isMobile ? 12 : 13, fontWeight: 700, margin: 0 }}>Upcoming Appointments</h3>
                <Link to="/customer/appointments" style={{ fontSize: isMobile ? 10 : 11, color: 'var(--royal)', textDecoration: 'none', fontWeight: 600 }}>View All</Link>
              </div>
              <div>
                {loading
                  ? <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {[...Array(3)].map((_, j) => (
                        <div key={j} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <Skeleton w={30} h={30} r={7} />
                          <div style={{ flex: 1 }}>
                            <Skeleton w="70%" h={11} r={5} mb={5} />
                            <Skeleton w="45%" h={9} r={4} />
                          </div>
                        </div>
                      ))}
                    </div>
                  : appts.length === 0
                    ? <p style={{ padding: '12px 14px', color: 'var(--muted)', fontSize: 12 }}>No upcoming appointments</p>
                    : appts.map(a => (
                      <div key={a.id} style={{ display: 'flex', gap: 8, padding: isMobile ? '9px 12px' : '10px 16px', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
                        <div style={{ width: 30, height: 30, borderRadius: 7, background: 'var(--light-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <img src="/icon/attended.png" alt="appt" width={15} height={15} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 11, fontWeight: 600, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.patient} — {a.purpose}</p>
                          <p style={{ fontSize: 10, color: 'var(--muted)', margin: 0 }}>{a.date} • {a.vet}</p>
                        </div>
                        <span className={`badge ${a.status === 'Confirmed' ? 'badge-green' : 'badge-yellow'}`} style={{ fontSize: 9 }}>{a.status}</span>
                      </div>
                    ))
                }
              </div>
            </div>

            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? '10px 12px' : '13px 16px', borderBottom: '1px solid var(--border)' }}>
                <h3 style={{ fontSize: isMobile ? 12 : 13, fontWeight: 700, margin: 0 }}>My Pets</h3>
                <Link to="/customer/pets" style={{ fontSize: isMobile ? 10 : 11, color: 'var(--royal)', textDecoration: 'none', fontWeight: 600 }}>View All</Link>
              </div>
              <div>
                {loading
                  ? <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {[...Array(3)].map((_, j) => (
                        <div key={j} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <Skeleton w={30} h={30} r="50%" />
                          <div style={{ flex: 1 }}>
                            <Skeleton w="60%" h={11} r={5} mb={5} />
                            <Skeleton w="40%" h={9} r={4} />
                          </div>
                        </div>
                      ))}
                    </div>
                  : pets.length === 0
                    ? <p style={{ padding: '12px 14px', color: 'var(--muted)', fontSize: 12 }}>No pets registered</p>
                    : pets.slice(0, 4).map(p => (
                      <div key={p.id} style={{ display: 'flex', gap: 8, padding: isMobile ? '9px 12px' : '10px 16px', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--light-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <img
                            src={p.species === 'Dog' ? '/icon/dog.png' : p.species === 'Cat' ? '/icon/cat.png' : p.species === 'Bird' ? '/icon/bird.png' : '/icon/paw.png'}
                            alt={p.species} width={16} height={16}
                          />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 11, fontWeight: 600, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</p>
                          <p style={{ fontSize: 10, color: 'var(--muted)', margin: 0 }}>{p.species} • {p.breed}</p>
                        </div>
                        <span className={`badge ${p.health === 'Good' ? 'badge-green' : p.health === 'Fair' ? 'badge-yellow' : 'badge-red'}`} style={{ fontSize: 9 }}>{p.health}</span>
                      </div>
                    ))
                }
              </div>
            </div>

          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CustomerDashboard;