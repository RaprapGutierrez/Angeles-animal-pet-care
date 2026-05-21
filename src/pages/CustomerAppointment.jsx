import React, { useState, useEffect } from 'react';
import Layout from '../components/layout';
import { Modal } from '../components/layout';
import { supabase } from '../js/supabase';
import { useCurrentUser } from '../js/useCurrentUser';
import { useBranchFilter, withBranchId } from '../js/useBranchFilter';

const STATUS_BADGE = { Confirmed: 'badge-green', Pending: 'badge-yellow', Completed: 'badge-blue', Cancelled: 'badge-red' };
const TIMES = ['08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM'];
const VETS = ['Any Available', 'Dr. Santos', 'Dr. Reyes', 'Dr. Cruz', 'Dr. Garcia'];
const MAX_GROOMERS = 2;

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

const CustomerAppointment = () => {
  // ── PATCH: replace useBranchTables + session JWT parsing ──────────────────
  const { user, loading: userLoading } = useCurrentUser();
  const { applyFilter } = useBranchFilter();

  useEffect(() => {
    if (document.getElementById('shimmer-style')) return;
    const style = document.createElement('style');
    style.id = 'shimmer-style';
    style.textContent = `@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`;
    document.head.appendChild(style);
  }, []);

  const [appts, setAppts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ patient: '', purpose: 'Checkup', vet: 'Any Available', date: '', time: '', contact: '', notes: '' });
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 640);

  const [conflictType, setConflictType] = useState(null);
  const [groomingUsed, setGroomingUsed] = useState(0);

  const [appModal, setAppModal] = useState({ show: false, title: '', message: '', onConfirm: null, onCancel: null, confirmText: 'OK', cancelText: null, confirmColor: 'var(--royal)' });
  const showAlert   = (title, message) => setAppModal({ show: true, title, message, onConfirm: () => setAppModal(m => ({ ...m, show: false })), onCancel: null, confirmText: 'OK', cancelText: null, confirmColor: 'var(--royal)' });
  const showConfirm = (title, message, onConfirm) => setAppModal({ show: true, title, message, onConfirm: () => { setAppModal(m => ({ ...m, show: false })); onConfirm(); }, onCancel: () => setAppModal(m => ({ ...m, show: false })), confirmText: 'Yes, Cancel It', cancelText: 'No, Keep It', confirmColor: '#dc2626' });

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 640);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const fetchAppts = async () => {
    if (!user?.id) return;
    setLoading(true);

    // ── PATCH: filter by user_id + branch ─────────────────────────────────
    let q = supabase.from('appointments').select('*').eq('user_id', user.id).order('date', { ascending: false });
    q = applyFilter(q);
    const { data, error } = await q;
    if (!error) setAppts(data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (userLoading || !user?.id) return;
    fetchAppts();

    const channel = supabase
      .channel(`customer-appts-realtime-${user.branchId || 'all'}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'appointments' },
        () => { fetchAppts(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, userLoading]);

  useEffect(() => {
    if (!form.date || !form.time || form.purpose !== 'Grooming') {
      setConflictType(null);
      setGroomingUsed(0);
      return;
    }
    const used = appts.filter(a =>
      a.purpose === 'Grooming' &&
      a.date === form.date &&
      a.time === form.time &&
      ['Pending', 'Confirmed'].includes(a.status)
    ).length;
    setGroomingUsed(used);
    setConflictType(used >= MAX_GROOMERS ? 'grooming' : null);
  }, [form.date, form.time, form.purpose, appts]);

  const renderTimeOptions = () => TIMES.map(t => {
    if (!form.date || form.purpose !== 'Grooming') {
      return <option key={t} value={t}>{t}</option>;
    }
    const used = appts.filter(a =>
      a.purpose === 'Grooming' && a.date === form.date && a.time === t &&
      ['Pending', 'Confirmed'].includes(a.status)
    ).length;
    const full  = used >= MAX_GROOMERS;
    const label = full
      ? `${t} — Full (${MAX_GROOMERS}/${MAX_GROOMERS} groomers busy)`
      : used > 0
        ? `${t} — ${used}/${MAX_GROOMERS} groomer busy`
        : `${t} — Available`;
    return <option key={t} value={t} disabled={full}>{label}</option>;
  });

  const saveAppt = async () => {
    if (!form.patient || !form.date || !form.time) {
      showAlert('Missing Fields', 'Please fill in Pet Name, Date, and Time.');
      return;
    }
    if (conflictType || saving) return;

    const { data: existing } = await supabase
      .from('appointments')
      .select('id')
      .eq('patient', form.patient)
      .eq('date', form.date)
      .eq('time', form.time)
      .maybeSingle();

    if (existing) {
      showAlert('Already Booked', `${form.patient} already has an appointment on ${form.date} at ${form.time}. Please choose a different date or time.`);
      return;
    }

    setSaving(true);

    // ── PATCH: include branch_id in appointment insert ─────────────────────
    const apptPayload = withBranchId(user, {
      user_id: user.id,
      patient: form.patient,
      owner:   user.fullName || user.email || 'Customer',
      contact: form.contact,
      vet:     form.purpose === 'Grooming' ? '' : (form.vet === 'Any Available' ? 'TBD' : form.vet),
      date:    form.date,
      time:    form.time,
      purpose: form.purpose,
      status:  'Pending',
      notes:   form.notes,
    });

    const { error } = await supabase.from('appointments').insert([apptPayload]);
    setSaving(false);

    if (error) { showAlert('Error', error.message); return; }

    // ── Auto-register pet in My Pets if not already there ──────────────────
    try {
      const { data: existingPet } = await supabase
        .from('patients')
        .select('id')
        .ilike('name', form.patient.trim())
        .eq('owner_user_id', user.id)
        .maybeSingle();

      if (!existingPet) {
        // ── PATCH: include branch_id in patient insert ─────────────────────
        const petPayload = withBranchId(user, {
          name:          form.patient.trim(),
          owner_user_id: user.id,
          owner_email:   user.email || null,
          status:        'Outpatient',
          health:        'Good',
          species:       '',
          breed:         '',
          condition:     form.notes || '',
        });
        const { error: petErr } = await supabase.from('patients').insert([petPayload]);
        if (petErr) console.warn('Auto-register pet failed:', petErr.message);
      }
    } catch (petErr) {
      console.warn('Auto-register pet error:', petErr);
    }

    showAlert('Request Submitted!', 'Your appointment request has been submitted and is now pending approval. You will be notified once a staff member confirms it.');
    setShowModal(false);
    setForm({ patient: '', purpose: 'Checkup', vet: 'Any Available', date: '', time: '', contact: '', notes: '' });
    fetchAppts();
  };

  const cancelAppt = (id) => {
    showConfirm('Cancel Appointment', 'Are you sure you want to cancel this appointment? This cannot be undone.', async () => {
      await supabase.from('appointments').update({ status: 'Cancelled' }).eq('id', id);
      fetchAppts();
    });
  };

  const STAT_CARDS = [
    { label: 'Total',    value: appts.length,                                                              icon: '/icon/attended.png',    color: 'blue',   filter: 'invert(37%) sepia(90%) saturate(500%) hue-rotate(195deg) brightness(95%)' },
    { label: 'Upcoming', value: appts.filter(a => a.status === 'Confirmed' || a.status === 'Pending').length, icon: '/icon/admitted.png', color: 'green',  filter: 'invert(50%) sepia(60%) saturate(400%) hue-rotate(100deg) brightness(90%)' },
    { label: 'Pending',  value: appts.filter(a => a.status === 'Pending').length,                         icon: '/icon/chat_bubble.png', color: 'yellow', filter: 'invert(70%) sepia(80%) saturate(500%) hue-rotate(5deg) brightness(95%)' },
  ];

  const isGrooming = form.purpose === 'Grooming';
  const today      = new Date().toISOString().split('T')[0];

  if (userLoading) {
    return (
      <Layout isCustomer>
        <div style={{ padding: '20px 24px', paddingTop: 'calc(var(--topbar-h) + var(--pagetop-h) + 20px)', width: '100%', boxSizing: 'border-box' }}>
          {/* Stat cards skeleton */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 18 }}>
            {[...Array(3)].map((_, i) => (
              <div key={i} style={{ background: '#fff', borderRadius: 11, border: '1px solid var(--border)', padding: '14px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <Skeleton w={38} h={38} r={8} />
                <div style={{ flex: 1 }}>
                  <Skeleton w="50%" h={10} r={5} mb={6} />
                  <Skeleton w="30%" h={22} r={6} />
                </div>
              </div>
            ))}
          </div>

          {/* Table skeleton */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Skeleton w={160} h={14} r={6} />
              <Skeleton w={60} h={12} r={5} />
            </div>
            <div style={{ padding: '0 18px' }}>
              {/* Table header */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr 80px', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                {[...Array(7)].map((_, i) => (
                  <Skeleton key={i} w="70%" h={10} r={4} />
                ))}
              </div>
              {/* Table rows */}
              {[...Array(5)].map((_, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr 80px', gap: 12, padding: '14px 0', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
                  <Skeleton w="80%" h={13} r={5} />
                  <Skeleton w="70%" h={13} r={5} />
                  <Skeleton w="65%" h={13} r={5} />
                  <Skeleton w="60%" h={13} r={5} />
                  <Skeleton w="55%" h={13} r={5} />
                  <Skeleton w={60} h={22} r={20} />
                  <Skeleton w={55} h={28} r={7} />
                </div>
              ))}
            </div>
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

      <div style={{ width: '100%', minHeight: '100vh', display: 'block' }}>
        {/* ── Topbar ── */}
        <div style={{
          background: '#fff', borderBottom: '1px solid var(--border)',
          padding: isMobile ? '10px 12px' : '13px 24px',
          display: 'flex', flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between',
          position: 'sticky', top: isMobile ? 56 : 68, zIndex: 50, width: '100%', boxSizing: 'border-box', gap: isMobile ? 8 : 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src="/icon/attended.png" alt="Appointments" width={isMobile ? 18 : 20} height={isMobile ? 18 : 20} />
            <div>
              <h1 style={{ fontSize: isMobile ? 15 : 18, fontWeight: 800, color: 'var(--text)', margin: 0 }}>My Appointments</h1>
              <p style={{ fontSize: isMobile ? 11 : 12, color: 'var(--muted)', margin: 0 }}>Book and manage your pet appointments</p>
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}
            style={{ width: 'auto', fontSize: isMobile ? 12 : 13, padding: isMobile ? '7px 14px' : '8px 16px', alignSelf: isMobile ? 'flex-start' : 'auto' }}>
            + Book Appointment
          </button>
        </div>

        <div style={{ padding: isMobile ? '12px' : '20px 24px', paddingTop: isMobile ? 'calc(56px + 48px + 12px)' : 'calc(var(--topbar-h) + var(--pagetop-h) + 20px)', width: '100%', boxSizing: 'border-box' }}>

          {appts.some(a => a.status === 'Pending') && (
            <div style={{
              background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 10,
              padding: isMobile ? '10px 12px' : '12px 18px', marginBottom: isMobile ? 12 : 18,
              display: 'flex', alignItems: 'flex-start', gap: 10,
            }}>
              <span style={{ fontSize: 18, lineHeight: 1 }}>🕐</span>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: isMobile ? 12 : 13, color: '#92400e' }}>
                  {appts.filter(a => a.status === 'Pending').length} Appointment{appts.filter(a => a.status === 'Pending').length > 1 ? 's' : ''} Awaiting Approval
                </p>
                <p style={{ margin: 0, fontSize: isMobile ? 11 : 12, color: '#b45309', marginTop: 2 }}>
                  Your request has been submitted. Please wait for a staff member to confirm your appointment.
                </p>
              </div>
            </div>
          )}

          {/* ── Stat cards ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 18 }}>
            {[
              { label: 'Total',    value: appts.length,                                                icon: '/icon/attended.png',    color: 'blue',   iconFilter: 'invert(37%) sepia(90%) saturate(500%) hue-rotate(195deg) brightness(95%)' },
              { label: 'Upcoming', value: appts.filter(a => a.status === 'Confirmed' || a.status === 'Pending').length, icon: '/icon/admitted.png', color: 'green',  iconFilter: 'invert(50%) sepia(60%) saturate(400%) hue-rotate(100deg) brightness(90%)' },
              { label: 'Pending',  value: appts.filter(a => a.status === 'Pending').length,            icon: '/icon/chat_bubble.png', color: 'yellow', iconFilter: 'invert(70%) sepia(80%) saturate(500%) hue-rotate(5deg) brightness(95%)' },
              { label: 'Cancelled',value: appts.filter(a => a.status === 'Cancelled').length,          icon: '/icon/cancel.png',      color: 'red',    iconFilter: 'invert(20%) sepia(90%) saturate(1200%) hue-rotate(340deg) brightness(0.9)' },
            ].map((sc, i) => (
              <div key={i} className="stat-card" style={{ padding: '14px 12px', gap: 10, borderRadius: 11 }}>
                <div className={`stat-icon-box ${sc.color}`} style={{ width: 38, height: 38, borderRadius: 8, flexShrink: 0 }}>
                  <img src={sc.icon} alt={sc.label} className="stat-box-img" style={{ width: 18, height: 18, filter: sc.iconFilter }} />
                </div>
                <div className="stat-info">
                  <p style={{ fontSize: 11 }}>{sc.label}</p>
                  <h3 style={{ fontSize: 22 }}>{sc.value}</h3>
                </div>
              </div>
            ))}
          </div>

          {/* ── Appointments table ── */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--border)', boxShadow: 'var(--shadow)', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? '10px 12px' : '14px 18px', borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ fontSize: isMobile ? 13 : 14, fontWeight: 700 }}>Appointment History</h2>
              <span style={{ color: 'var(--muted)', fontSize: isMobile ? 11 : 12 }}>{appts.length} records</span>
            </div>
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 780 }}>
                <thead>
                  <tr>{['Pet', 'Veterinarian', 'Date & Time', 'Purpose', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ background: 'var(--bg)', padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {loading ? (
                    [1,2,3,4,5].map(i => (
                      <tr key={i}>
                        {[...Array(6)].map((_, j) => (
                          <td key={j} style={{ padding: '15px 14px', borderBottom: '1px solid var(--border)' }}>
                            <Skeleton w="70%" h={13} r={5} />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : appts.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>No appointments yet</td></tr>
                  ) : appts.map(a => {
                    const statusDotColor = { Confirmed: '#16a34a', Pending: '#d97706', Cancelled: '#dc2626', Completed: '#2563eb' }[a.status] || '#9ca3af';
                    const purposeStyle = {
                      Grooming:    { bg: '#f3e8ff', color: '#6d28d9' },
                      Emergency:   { bg: '#fee2e2', color: '#dc2626' },
                      Surgery:     { bg: '#fff7ed', color: '#c2410c' },
                      Vaccination: { bg: '#f0fdf4', color: '#15803d' },
                      Dental:      { bg: '#eff6ff', color: '#1d4ed8' },
                      Checkup:     { bg: '#f8fafc', color: '#475569' },
                      'Follow-up': { bg: '#fefce8', color: '#a16207' },
                    }[a.purpose] || { bg: '#f8fafc', color: '#475569' };
                    return (
                      <tr key={a.id} style={{ background: '#fff' }}>
                        {/* Pet */}
                        <td style={{ padding: '13px 14px', borderBottom: '1px solid var(--border)', color: 'var(--text)', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="#1d4ed8" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" clipRule="evenodd" d="M16 4V7C16 9.20914 14.2091 11 12 11H10V15H0V13L0.931622 10.8706C1.25226 10.9549 1.59036 11 1.94124 11C3.74931 11 5.32536 9.76947 5.76388 8.01538L3.82359 7.53031C3.60766 8.39406 2.83158 9.00001 1.94124 9.00001C1.87789 9.00001 1.81539 8.99702 1.75385 8.99119C1.02587 8.92223 0.432187 8.45551 0.160283 7.83121C0.0791432 7.64491 0.0266588 7.44457 0.00781272 7.23658C-0.0112323 7.02639 0.00407892 6.80838 0.0588889 6.58914L0.698705 4.02986C1.14387 2.24919 2.7438 1 4.57928 1H10L12 4H16ZM9 6C9.55229 6 10 5.55228 10 5C10 4.44772 9.55229 4 9 4C8.44771 4 8 4.44772 8 5C8 5.55228 8.44771 6 9 6Z" /></svg>
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 13 }}>{a.patient}</div>
                              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{a.purpose}</div>
                            </div>
                          </div>
                        </td>
                        {/* Vet */}
                        <td style={{ padding: '13px 14px', borderBottom: '1px solid var(--border)', color: 'var(--text)', verticalAlign: 'middle' }}>
                          {a.purpose === 'Grooming'
                            ? <span style={{ fontSize: 11, background: '#f3e8ff', color: '#7c3aed', borderRadius: 6, padding: '3px 9px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>
                                Grooming
                              </span>
                            : <span style={{ fontSize: 13 }}>{a.vet || '—'}</span>
                          }
                        </td>
                        {/* Date & Time */}
                        <td style={{ padding: '13px 14px', borderBottom: '1px solid var(--border)', verticalAlign: 'middle' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '4px 10px' }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 12, color: '#1e40af' }}>{a.date}</div>
                              <div style={{ fontSize: 11, color: '#3b82f6' }}>{a.time}</div>
                            </div>
                          </div>
                        </td>
                        {/* Purpose */}
                        <td style={{ padding: '13px 14px', borderBottom: '1px solid var(--border)', verticalAlign: 'middle' }}>
                          <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 6, fontWeight: 600, background: purposeStyle.bg, color: purposeStyle.color }}>
                            {a.purpose}
                          </span>
                        </td>
                        {/* Status */}
                        <td style={{ padding: '13px 14px', borderBottom: '1px solid var(--border)', verticalAlign: 'middle' }}>
                          <span className={`badge ${STATUS_BADGE[a.status] || 'badge-gray'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusDotColor, flexShrink: 0, display: 'inline-block' }} />
                            {a.status}
                          </span>
                        </td>
                        {/* Actions */}
                        <td style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-start', alignItems: 'center' }}>
                            <button title="View" style={{ height: 28, padding: '0 10px', gap: 5, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#eff6ff', border: '1.5px solid #bfdbfe', color: '#1d4ed8', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                              onClick={() => { setSelectedAppt(a); setShowModal(true); }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                              View
                            </button>
                            {(a.status === 'Pending' || a.status === 'Confirmed') && (
                              <button title="Cancel" style={{ height: 28, padding: '0 10px', gap: 5, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#fef2f2', border: '1.5px solid #fca5a5', color: '#dc2626', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                                onClick={() => cancelAppt(a.id)}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                Cancel
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          BOOK APPOINTMENT MODAL
      ══════════════════════════════════════════ */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16, overflowY: 'auto' }}>
          <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 620, maxHeight: 'calc(100vh - 32px)', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.28)', overflow: 'hidden', margin: 'auto' }}>

            {/* Clipboard top bar */}
            <div style={{ background: 'linear-gradient(135deg, #0f172a, #1e3a8a)', padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: '14px 14px 0 0', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 48, height: 18, background: 'rgba(255,255,255,0.25)', borderRadius: 4, border: '2px solid rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 20, height: 8, background: 'rgba(255,255,255,0.4)', borderRadius: 2 }} />
                </div>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'rgba(255,255,255,0.75)', lineHeight: 1, padding: '2px 6px' }}>✕</button>
            </div>

            {/* Record header */}
            <div style={{ background: 'var(--bg)', borderBottom: '2px solid var(--border)', padding: '14px 24px 12px', textAlign: 'center', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 4 }}>
                <img src="/icon/appointment.png" alt="" style={{ width: 22, height: 22, objectFit: 'contain' }} onError={e => { e.target.style.display = 'none'; }} />
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--text)', letterSpacing: '0.3px' }}>Appointment Record</h3>
              </div>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--muted)' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  Request will be reviewed by staff
                </span>
              </p>
            </div>

            {/* Modal body */}
            <div style={{ overflowY: 'auto', flex: 1 }}>

              {/* Section 1: Patient & Service */}
              <div style={{ borderBottom: '1.5px solid #e2e8f0' }}>
                <div style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', padding: '6px 16px' }}>
                  <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="7" cy="10" r="2"/><circle cx="17" cy="10" r="2"/><path d="M12 14c-3.3 0-6 2-6 4.5h12c0-2.5-2.7-4.5-6-4.5z"/></svg>
                    Patient &amp; Service
                  </span>
                </div>

                {/* Pet Name · Purpose */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #e2e8f0' }}>
                  <div style={{ padding: '10px 16px', borderRight: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>
                      Pet Name <span style={{ color: '#ef4444' }}>*</span>
                    </div>
                    <input
                      type="text" value={form.patient}
                      onChange={e => setForm({ ...form, patient: e.target.value })}
                      placeholder="e.g. Buddy"
                      style={{ width: '100%', border: 'none', borderBottom: '1.5px solid #cbd5e1', background: 'transparent', fontSize: 13, fontWeight: 600, color: 'var(--text)', outline: 'none', padding: '2px 0', fontFamily: 'inherit', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div style={{ padding: '10px 16px' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>Purpose</div>
                    <select value={form.purpose} onChange={e => setForm({ ...form, purpose: e.target.value, vet: e.target.value === 'Grooming' ? '' : form.vet })}
                      style={{ width: '100%', border: 'none', borderBottom: '1.5px solid #cbd5e1', background: 'transparent', fontSize: 13, fontWeight: 600, color: 'var(--text)', outline: 'none', padding: '2px 0', fontFamily: 'inherit', boxSizing: 'border-box' }}>
                      <option>Checkup</option><option>Vaccination</option><option>Grooming</option>
                      <option>Dental</option><option>Emergency</option><option>Follow-up</option>
                    </select>
                  </div>
                </div>

                {/* Vet / Grooming notice */}
                <div style={{ borderBottom: '1px solid #e2e8f0' }}>
                  {!isGrooming ? (
                    <div style={{ padding: '10px 16px' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>Preferred Vet</div>
                      <select value={form.vet} onChange={e => setForm({ ...form, vet: e.target.value })}
                        style={{ width: '100%', border: 'none', borderBottom: '1.5px solid #cbd5e1', background: 'transparent', fontSize: 13, fontWeight: 600, color: 'var(--text)', outline: 'none', padding: '2px 0', fontFamily: 'inherit', boxSizing: 'border-box' }}>
                        {VETS.map(v => <option key={v}>{v}</option>)}
                      </select>
                    </div>
                  ) : (
                    <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f3e8ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#6b21a8' }}>Grooming Service</div>
                        <div style={{ fontSize: 11, color: '#9333ea' }}>Handled by our dedicated grooming team — no vet required.</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Section 2: Schedule */}
              <div style={{ borderBottom: '1.5px solid #e2e8f0' }}>
                <div style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', padding: '6px 16px' }}>
                  <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    Schedule
                  </span>
                </div>

                {/* Date · Time */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #e2e8f0' }}>
                  <div style={{ padding: '10px 16px', borderRight: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>
                      Date <span style={{ color: '#ef4444' }}>*</span>
                    </div>
                    <input type="date" value={form.date} min={today}
                      onChange={e => setForm({ ...form, date: e.target.value })}
                      style={{ width: '100%', border: 'none', borderBottom: '1.5px solid #cbd5e1', background: 'transparent', fontSize: 13, fontWeight: 600, color: 'var(--text)', outline: 'none', padding: '2px 0', fontFamily: 'inherit', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div style={{ padding: '10px 16px' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>
                      Time <span style={{ color: '#ef4444' }}>*</span>
                      {isGrooming && form.date && <span style={{ marginLeft: 6, fontSize: 10, color: '#7c3aed', fontWeight: 600 }}>groomer slots shown</span>}
                    </div>
                    <select value={form.time} onChange={e => setForm({ ...form, time: e.target.value })}
                      style={{ width: '100%', border: 'none', borderBottom: '1.5px solid #cbd5e1', background: 'transparent', fontSize: 13, fontWeight: 600, color: 'var(--text)', outline: 'none', padding: '2px 0', fontFamily: 'inherit', boxSizing: 'border-box' }}>
                      <option value="">Select time</option>
                      {renderTimeOptions()}
                    </select>
                  </div>
                </div>

                {/* Conflict banners */}
                {conflictType === 'grooming' && (
                  <div style={{ background: '#fee2e2', borderTop: '1px solid #fca5a5', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(220,38,38,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                    </div>
                    <div>
                      <p style={{ margin: 0, fontWeight: 700, color: '#991b1b', fontSize: 12 }}>✂️ Grooming Fully Booked at This Time</p>
                      <p style={{ margin: 0, color: '#b91c1c', fontSize: 11 }}>Both groomers ({MAX_GROOMERS}/{MAX_GROOMERS}) are booked on <strong>{form.date}</strong> at <strong>{form.time}</strong>. Please choose a different slot.</p>
                    </div>
                  </div>
                )}
                {isGrooming && form.date && form.time && !conflictType && (
                  <div style={{ background: '#f0fdf4', borderTop: '1px solid #bbf7d0', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>✂️</span>
                    <span style={{ fontSize: 12, color: '#15803d' }}>
                      <strong>{MAX_GROOMERS - groomingUsed} of {MAX_GROOMERS}</strong> groomer slot{(MAX_GROOMERS - groomingUsed) !== 1 ? 's' : ''} available on <strong>{form.date}</strong> at <strong>{form.time}</strong>.
                    </span>
                  </div>
                )}
              </div>

              {/* Section 3: Owner / Contact */}
              <div style={{ borderBottom: '1.5px solid #e2e8f0' }}>
                <div style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', padding: '6px 16px' }}>
                  <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    Owner / Contact
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #e2e8f0' }}>
                  <div style={{ padding: '10px 16px', borderRight: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>Contact Number</div>
                    <input type="text" value={form.contact}
                      onChange={e => setForm({ ...form, contact: e.target.value })}
                      placeholder="e.g. 0917-000-0000"
                      style={{ width: '100%', border: 'none', borderBottom: '1.5px solid #cbd5e1', background: 'transparent', fontSize: 13, fontWeight: 600, color: 'var(--text)', outline: 'none', padding: '2px 0', fontFamily: 'inherit', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center' }}>
                    <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '8px 12px', fontSize: 11, color: '#1e40af', width: '100%' }}>
                      ℹ️ Your appointment will be <strong>Pending</strong> until staff approves it.
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 4: Notes */}
              <div style={{ borderBottom: '1.5px solid #e2e8f0' }}>
                <div style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', padding: '6px 16px' }}>
                  <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                    Additional Notes
                  </span>
                </div>
                <div style={{ padding: '12px 16px', minHeight: 70 }}>
                  <textarea value={form.notes}
                    onChange={e => setForm({ ...form, notes: e.target.value })}
                    placeholder="Describe your pet's concern or any symptoms..."
                    style={{ width: '100%', border: 'none', background: 'transparent', fontSize: 13, color: 'var(--text)', outline: 'none', resize: 'vertical', minHeight: 64, fontFamily: 'inherit', lineHeight: 1.8, boxSizing: 'border-box', backgroundImage: 'repeating-linear-gradient(transparent, transparent 27px, rgba(147,197,253,0.25) 27px, rgba(147,197,253,0.25) 28px)' }}
                  />
                </div>
              </div>

              {/* Footer watermark */}
              <div style={{ padding: '6px 16px', background: 'var(--bg)' }}>
                <p style={{ margin: 0, fontSize: 10, color: 'var(--muted)', textAlign: 'right', fontStyle: 'italic' }}>Angeles Animal Care Hospital</p>
              </div>
            </div>

            {/* Modal footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 24px', borderTop: '2px solid #e2e8f0', background: '#f8fafc', flexShrink: 0 }}>
              <button className="btn btn-ghost" style={{ width: 'auto' }} onClick={() => setShowModal(false)}>Cancel</button>
              <button
                className="btn btn-primary"
                style={{ width: 'auto', background: '#0f172a', borderColor: '#0f172a', opacity: conflictType ? 0.5 : 1, cursor: conflictType ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                onClick={saveAppt}
                disabled={saving || !!conflictType}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                {saving ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default CustomerAppointment;