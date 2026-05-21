import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { Layout } from '../components/layout';
import { supabase } from '../js/supabase';
import { useCurrentUser } from '../js/useCurrentUser';

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

const EMERGENCY_TYPES = [
  'Hit by Vehicle / Trauma',
  'Difficulty Breathing / Respiratory Distress',
  'Seizure / Convulsion',
  'Severe Bleeding / Open Wound',
  'Unconscious / Unresponsive',
  'Suspected Poisoning / Toxic Ingestion',
  'Broken Bone / Fracture',
  'Severe Vomiting / Diarrhea',
  'Eye / Ear Injury',
  'Allergic Reaction / Anaphylaxis',
  'Birthing Emergency / Dystocia',
  'Heatstroke / Hyperthermia',
  'Animal Bite / Fight Wound',
  'Choking / Airway Obstruction',
  'Cardiac Arrest / No Pulse',
  'Bloat / GDV (Gastric Dilatation)',
  'Urinary Blockage',
  'Paralysis / Cannot Walk',
  'Severe Lethargy / Collapse',
  'Suspected Fracture / Limping',
  'Other',
];

const BRANCHES = [
  'Main Branch',
  'Mabalacat Branch',
  'Tarlac City',
  'San Fernando Branch',
  'Angeles City',
];

const STATUS_COLORS = {
  pending: { bg: '#fef9c3', border: '#fde047', text: '#854d0e', label: 'Pending' },
  responding: { bg: '#dbeafe', border: '#93c5fd', text: '#1d4ed8', label: 'Responding' },
  resolved: { bg: '#dcfce7', border: '#86efac', text: '#166534', label: 'Resolved' },
};

// ── History Alert Card ───────────────────────────────────────────────────────
const HistoryCard = ({ a }) => {
  const status = a.status || 'pending';
  const col = STATUS_COLORS[status] || STATUS_COLORS.pending;
  return (
    <div style={{ background: col.bg, border: `1px solid ${col.border}`, borderRadius: 10, padding: '12px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img
            src="/icon/warning.png" alt=""
            style={{ width: 14, height: 14, filter: 'brightness(0) saturate(100%) invert(20%) sepia(80%) saturate(2000%) hue-rotate(350deg)' }}
          />
          <strong style={{ fontSize: 13, color: '#dc2626' }}>{a.type}</strong>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 10, fontWeight: 700, color: col.text,
            background: '#fff', border: `1px solid ${col.border}`,
            borderRadius: 20, padding: '2px 8px', textTransform: 'capitalize',
          }}>{col.label}</span>
          <span style={{ fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
            {new Date(a.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>
      <p style={{ fontSize: 12, color: 'var(--text)', margin: '0 0 4px' }}>{a.description}</p>
      <p style={{ fontSize: 11, color: 'var(--muted)', margin: 0 }}>Branch: {a.branch}</p>
    </div>
  );
};

// ── Report Form ───────────────────────────────────────────────────────────────
const ReportForm = memo(({ sending, onSend, defaultBranch }) => {
  const [form, setForm] = useState({
    type: EMERGENCY_TYPES[0],
    description: '',
    branch: defaultBranch || BRANCHES[0],
  });
  const [descErr, setDescErr] = useState('');

  const handleSend = useCallback(async () => {
    if (!form.description.trim()) {
      setDescErr('Please describe the emergency.');
      return;
    }
    setDescErr('');
    const result = await onSend(form);
    if (result?.success) {
      setForm({ type: EMERGENCY_TYPES[0], description: '', branch: defaultBranch || BRANCHES[0] });
    }
  }, [form, onSend, defaultBranch]);

  return (
    <div style={{
      background: '#fff', borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border)', padding: 24, boxShadow: 'var(--shadow)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <img src="/icon/warning.png" alt="" style={{ width: 16, height: 16, filter: 'brightness(0) saturate(100%) invert(20%) sepia(80%) saturate(2000%) hue-rotate(350deg)' }} />
        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#dc2626', margin: 0 }}>Report an Emergency</h3>
      </div>
      <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 16px' }}>
        Tell us about your pet's emergency. We'll respond as fast as possible.
      </p>
      <hr style={{ border: 'none', borderTop: '1px solid var(--border)', marginBottom: 20 }} />

      <div className="form-group" style={{ marginBottom: 14 }}>
        <label>Emergency Type</label>
        <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
          {EMERGENCY_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
      </div>

      <div className="form-group" style={{ marginBottom: 14 }}>
        <label>
          Describe the Emergency <span style={{ color: '#dc2626' }}>*</span>
        </label>
        <textarea
          value={form.description}
          onChange={e => { setForm(p => ({ ...p, description: e.target.value })); setDescErr(''); }}
          placeholder="Please describe your pet's condition in detail — what happened, how long ago, your pet's name, breed, age if possible."
          style={{
            minHeight: 100, resize: 'vertical',
            border: `1.5px solid ${descErr ? '#f87171' : 'var(--border)'}`,
          }}
        />
        {descErr && <p style={{ fontSize: 11, color: '#dc2626', marginTop: 3 }}>{descErr}</p>}
      </div>

      <div className="form-group" style={{ marginBottom: 20 }}>
        <label>Nearest Branch</label>
        <select value={form.branch} onChange={e => setForm(p => ({ ...p, branch: e.target.value }))}>
          {BRANCHES.map(b => <option key={b}>{b}</option>)}
        </select>
      </div>

      <button
        onClick={handleSend}
        disabled={sending}
        style={{
          width: '100%', padding: '12px',
          background: sending ? '#94a3b8' : '#dc2626',
          color: '#fff', border: 'none', borderRadius: 8,
          fontSize: 14, fontWeight: 700,
          cursor: sending ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}
      >
        🚨 {sending ? 'Sending...' : 'Send Emergency Alert to Staff'}
      </button>

      <div style={{
        marginTop: 12, padding: '8px 14px',
        background: '#fef3c7', border: '1px solid #fde68a',
        borderRadius: 8, fontSize: 12, color: '#92400e',
        display: 'flex', alignItems: 'flex-start', gap: 6,
      }}>
        <span>⚠️</span>
        <span>
          <strong>For life-threatening emergencies:</strong> Please also call us directly to ensure the fastest response possible.
        </span>
      </div>
    </div>
  );
});

// ── Branch Status Cards ───────────────────────────────────────────────────────
const BranchCards = ({ alerts }) => (
  <div style={{
    display: 'grid',
    gridTemplateColumns: `repeat(${BRANCHES.length}, 1fr)`,
    gap: 12,
    marginTop: 24,
  }}>
    {BRANCHES.map(b => {
      const branchAlerts = alerts.filter(a => a.branch === b);
      const pending = branchAlerts.filter(a => (a.status || 'pending') === 'pending').length;
      const responding = branchAlerts.filter(a => a.status === 'responding').length;
      const hasActive = pending > 0 || responding > 0;
      return (
        <div key={b} style={{
          background: '#fff', borderRadius: 12,
          border: '1px solid var(--border)', padding: '14px 16px',
          boxShadow: 'var(--shadow)',
        }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', margin: '0 0 6px', lineHeight: 1.3 }}>{b}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
              background: hasActive ? '#dc2626' : '#16a34a',
              boxShadow: hasActive ? '0 0 0 2px #fee2e2' : '0 0 0 2px #dcfce7',
            }} />
            <span style={{ fontSize: 11, color: hasActive ? '#dc2626' : '#16a34a', fontWeight: 600 }}>
              {hasActive
                ? `${pending + responding} Alert${pending + responding > 1 ? 's' : ''} Active`
                : 'Emergency Line Available'
              }
            </span>
          </div>
        </div>
      );
    })}
  </div>
);


// ── Success Modal ─────────────────────────────────────────────────────────────
const SuccessModal = ({ onClose }) => (
  <div style={{
    position: 'fixed', inset: 0, zIndex: 1000,
    background: 'rgba(0,0,0,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }}>
    <div style={{
      background: '#fff', borderRadius: 16, padding: '36px 32px',
      boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
      maxWidth: 380, width: '90%', textAlign: 'center',
    }}>
      <div style={{ fontSize: 52, marginBottom: 12 }}>🚨</div>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: '#dc2626', margin: '0 0 8px' }}>
        Emergency Alert Sent!
      </h2>
      <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 24px', lineHeight: 1.6 }}>
        Your alert has been received by our staff. We will respond to your pet's emergency as fast as possible.
      </p>
      <div style={{
        background: '#fef3c7', border: '1px solid #fde68a',
        borderRadius: 8, padding: '10px 14px',
        fontSize: 12, color: '#92400e',
        marginBottom: 24, textAlign: 'left',
        display: 'flex', gap: 6, alignItems: 'flex-start',
      }}>
        <span>⚠️</span>
        <span><strong>For life-threatening cases:</strong> Please also call us directly for the fastest response.</span>
      </div>
      <button
        onClick={onClose}
        style={{
          width: '100%', padding: '11px',
          background: '#dc2626', color: '#fff',
          border: 'none', borderRadius: 8,
          fontSize: 14, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit',
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

  const userId = user?.id ?? null;
  const customerName = user?.fullName || user?.email || 'Customer';

  const fetchAlerts = useCallback(async () => {
    if (userLoading || !userId) { setLoading(false); return; }
    setLoading(true);
    // Customers only see their own alerts — no branch filter needed here
    const { data, error } = await supabase
      .from('emergency_alerts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (!error) setAlerts(data || []);
    setLoading(false);
  }, [userLoading, userId]);

  useEffect(() => {
    if (userLoading) return;
    fetchAlerts();

    const channel = supabase
      .channel('customer-emergency-alerts-realtime')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'emergency_alerts' },
        (payload) => {
          if (payload.new?.user_id === userId) {
            setAlerts(prev => [payload.new, ...prev].slice(0, 50));
          }
        })
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'emergency_alerts' },
        (payload) => {
          if (payload.new?.user_id === userId) {
            setAlerts(prev => prev.map(a => a.id === payload.new.id ? payload.new : a));
          }
        })
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'emergency_alerts' },
        (payload) => {
          setAlerts(prev => prev.filter(a => a.id !== payload.old.id));
        })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userLoading, fetchAlerts, userId]);

  const sendAlert = useCallback(async (formData) => {
    if (!formData.description.trim()) return;
    setSending(true);
    const payload = {
      type: formData.type,
      description: formData.description.trim(),
      branch: formData.branch,
      sent_by: customerName,
      user_id: userId,
      status: 'pending',
      branch_id: user?.branchId ?? null,
    };
    const { error } = await supabase.from('emergency_alerts').insert([payload]).select();
    if (error) { alert('Error: ' + error.message); setSending(false); return; }
    setShowSuccess(true);
    setSending(false);
    return { success: true };
  }, [customerName, userId, user?.branchId]);

  const S = {
    page: { width: '100%', minHeight: '100vh', display: 'block' },
    topbar: {
      background: '#fff', borderBottom: '1px solid var(--border)',
      padding: '14px 28px', display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', position: 'fixed',
      top: 'var(--topbar-h)', zIndex: 50, width: '100%', boxSizing: 'border-box',
    },
    cont: {
      padding: '24px 28px',
      paddingTop: 'calc(var(--topbar-h) + var(--pagetop-h) + 20px)',
      width: '100%', boxSizing: 'border-box',
    },
  };

  // ── Early return AFTER all hooks ─────────────────────────────────────────
 if (userLoading) {
    return (
      <Layout isCustomer={true}>
        <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
        <div style={{ padding: '24px 28px', paddingTop: 'calc(var(--topbar-h) + var(--pagetop-h) + 20px)', width: '100%', boxSizing: 'border-box' }}>
          {/* Banner skeleton */}
          <Skeleton w="100%" h={180} r={14} mb={24} />

          {/* Two-column grid skeleton */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {/* Report form skeleton */}
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--border)', padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
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
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--border)', padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Skeleton w={20} h={20} r={4} />
                <Skeleton w="55%" h={15} r={6} />
              </div>
              <Skeleton w="70%" h={11} r={4} mb={16} />
              <Skeleton w="100%" h={1} r={0} mb={16} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[...Array(3)].map((_, i) => (
                  <div key={i} style={{ borderRadius: 10, border: '1px solid #e2e8f0', padding: '12px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${BRANCHES.length}, 1fr)`, gap: 12, marginTop: 24 }}>
            {BRANCHES.map((_, i) => (
              <div key={i} style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--border)', padding: '14px 16px' }}>
                <Skeleton w="70%" h={12} r={5} mb={8} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
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
        <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Please log in</h2>
          <p style={{ fontSize: 13 }}>Your session could not be detected. Please sign in again.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout isCustomer={true}>
      {showSuccess && <SuccessModal onClose={() => setShowSuccess(false)} />}
      <div style={S.page}>
        <div style={S.topbar}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img
              src="/icon/emergency_2.png" alt=""
              style={{ width: 22, height: 22, filter: 'brightness(0) saturate(100%) invert(17%) sepia(82%) saturate(1200%) hue-rotate(210deg)' }}
            />
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', margin: 0 }}>Emergency Alert</h1>
              <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>Report your pet's emergency directly to our staff</p>
            </div>
          </div>
          <button
            onClick={fetchAlerts}
            style={{ fontSize: 12, fontWeight: 700, padding: '7px 16px', borderRadius: 8, border: '1.5px solid var(--border)', background: '#fff', cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text)', width: 'auto' }}
          >
            🔄 Refresh
          </button>
        </div>

        <div style={S.cont}>
          <div style={{ borderRadius: 14, marginBottom: 24, overflow: 'hidden', width: '100%' }}>
            <img
              src="/image/emergency_alert_system.png"
              alt="Emergency Alert System"
              style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 14 }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {/* defaultBranch derived from user's branchId — falls back to first in list */}
            <ReportForm sending={sending} onSend={sendAlert} defaultBranch={BRANCHES[0]} />

            <div style={{
              background: '#fff', borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border)', padding: 24, boxShadow: 'var(--shadow)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 16 }}>📋</span>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--royal)', margin: 0 }}>My Emergency History</h3>
              </div>
              <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 16px' }}>
                Track the status of alerts you've submitted.
              </p>
              <hr style={{ border: 'none', borderTop: '1px solid var(--border)', marginBottom: 16 }} />

              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[...Array(3)].map((_, i) => (
                    <div key={i} style={{ borderRadius: 10, border: '1px solid #e2e8f0', padding: '12px 16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Skeleton w="40%" h={13} r={5} />
                        <Skeleton w={60} h={20} r={20} />
                      </div>
                      <Skeleton w="90%" h={11} r={4} mb={6} />
                      <Skeleton w="35%" h={10} r={4} />
                    </div>
                  ))}
                </div>
              ) : alerts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                  <p style={{ fontWeight: 700, color: 'var(--text)', fontSize: 14, margin: '0 0 6px' }}>
                    No emergency alerts submitted yet
                  </p>
                  <p style={{ color: 'var(--muted)', fontSize: 12, margin: 0 }}>
                    Use the form to report your pet's emergency
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 420, overflowY: 'auto' }}>
                  {alerts.map(a => <HistoryCard key={a.id} a={a} />)}
                </div>
              )}
            </div>
          </div>

          <BranchCards alerts={alerts} />
        </div>
      </div>
    </Layout>
  );
};

export default CustomerEmergency;