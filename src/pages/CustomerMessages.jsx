import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/layout';
import { supabase } from '../js/supabase';
import { useCurrentUser } from '../js/useCurrentUser';

/* ─────────────────────────────────────────
   Helpers (matched with admin/employee UI)
───────────────────────────────────────── */
const toFullName = (p) =>
  `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.email || '';

const fmtTime = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const fmtDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Today';
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
};

const groupByDate = (msgs) => {
  const groups = [];
  let last = null;
  msgs.forEach((m) => {
    const label = fmtDate(m.created_at);
    if (label !== last) { groups.push({ type: 'divider', label }); last = label; }
    groups.push({ type: 'msg', ...m });
  });
  return groups;
};

/* ─────────────────────────────────────────
   Avatar
───────────────────────────────────────── */
const Avatar = ({ name, size = 38, me = false }) => {
  const initials = (name || '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const bg = me
    ? 'linear-gradient(135deg,#6366f1,#8b5cf6)'
    : 'linear-gradient(135deg,#0ea5e9,#38bdf8)';
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <div style={{
        width: size, height: size, borderRadius: '50%', background: bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontWeight: 700, fontSize: size * 0.36,
        letterSpacing: 0.5, boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}>
        {initials}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────
   Modal
───────────────────────────────────────── */
const Modal = ({ show, title, message, type = 'info', onClose, onConfirm, confirmText, cancelText }) => {
  if (!show) return null;
  const colors = {
    error:   { bg: '#fef2f2', border: '#fecaca', icon: '#ef4444', btn: '#ef4444', hover: '#dc2626' },
    success: { bg: '#f0fdf4', border: '#bbf7d0', icon: '#22c55e', btn: '#22c55e', hover: '#16a34a' },
    info:    { bg: '#eff6ff', border: '#bfdbfe', icon: '#3b82f6', btn: '#3b82f6', hover: '#2563eb' },
    confirm: { bg: '#fef2f2', border: '#fecaca', icon: '#ef4444', btn: '#ef4444', hover: '#dc2626' },
  };
  const c = colors[type] || colors.info;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 18, padding: '32px 28px', maxWidth: 400, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: c.bg, border: `2px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          {(type === 'error' || type === 'confirm') && (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c.icon} strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" /></svg>
          )}
          {type === 'success' && (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c.icon} strokeWidth="2.5"><path d="M20 6 9 17l-5-5" /></svg>
          )}
          {type === 'info' && (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c.icon} strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4m0-4h.01" /></svg>
          )}
        </div>
        <h3 style={{ textAlign: 'center', margin: '0 0 8px', fontSize: 17, fontWeight: 700, color: '#111827' }}>{title}</h3>
        <p style={{ textAlign: 'center', margin: '0 0 24px', fontSize: 14, color: '#6b7280', lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: 'flex', gap: 10 }}>
          {cancelText && (
            <button onClick={onClose} style={{ flex: 1, padding: '11px 0', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>{cancelText}</button>
          )}
          <button onClick={onConfirm || onClose}
            style={{ flex: 1, padding: '11px 0', borderRadius: 10, border: 'none', background: c.btn, color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
            onMouseOver={(e) => e.currentTarget.style.background = c.hover}
            onMouseOut={(e) => e.currentTarget.style.background = c.btn}
          >
            {confirmText || 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────
   Conversation menu
───────────────────────────────────────── */
const ConversationMenu = ({ onDelete, onClear }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen((o) => !o)} style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', background: open ? '#f0f0f6' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="#6b7280"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg>
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 40, right: 0, zIndex: 999, background: '#fff', borderRadius: 14, boxShadow: '0 8px 30px rgba(0,0,0,0.14)', border: '1px solid #f0f0f6', minWidth: 220, overflow: 'hidden' }}>
          <button onClick={() => { onClear(); setOpen(false); }} style={{ width: '100%', padding: '12px 16px', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#374151', fontWeight: 500, textAlign: 'left' }}>
            <span style={{ width: 32, height: 32, borderRadius: 9, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.2"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>
            </span>
            <div><div style={{ fontWeight: 600 }}>Clear messages</div><div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>Remove from your view</div></div>
          </button>
          <div style={{ height: 1, background: '#f0f0f6', margin: '0 12px' }} />
          <button onClick={() => { onDelete(); setOpen(false); }} style={{ width: '100%', padding: '12px 16px', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#dc2626', fontWeight: 500, textAlign: 'left' }}>
            <span style={{ width: 32, height: 32, borderRadius: 9, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.2"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" /></svg>
            </span>
            <div><div style={{ fontWeight: 600 }}>Delete conversation</div><div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>Permanently delete all messages</div></div>
          </button>
        </div>
      )}
    </div>
  );
};

/* ═════════════════════════════════════════
   MAIN
═════════════════════════════════════════ */
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

const CustomerMessages = () => {
  // ── PATCH: replaced useBranchTables with useCurrentUser ──────────────────
  const { user, loading: userLoading } = useCurrentUser();

  // Table names are now unified — no per-branch prefixes needed
  const T_PROFILES = 'profiles';
  const T_MESSAGES = 'messages';

  const [selected, setSelected] = useState(null);
  const [staff,    setStaff]    = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMsg,   setNewMsg]   = useState('');
  const [search,   setSearch]   = useState('');
  const [sending,  setSending]  = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [unread,   setUnread]   = useState({});
  const [modal,    setModal]    = useState({ show: false, title: '', message: '', type: 'info', onConfirm: null, confirmText: 'OK', cancelText: null });
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  const myId   = user?.id ?? null;
  const myName = user?.fullName || user?.email || 'Customer';

  const closeModal = () => setModal((m) => ({ ...m, show: false }));
  const showModal  = (title, message, type = 'info', onConfirm = null, confirmText = 'OK', cancelText = null) =>
    setModal({ show: true, title, message, type, onConfirm, confirmText, cancelText });

  // ── Early return AFTER all hooks — moved to after hook declarations ───────
  // (hooks must run unconditionally, so we gate data fetching on userLoading)

  /* ── Fetch staff (admin/manager/employee) ── */
  useEffect(() => {
    if (userLoading || !myId) return;
    const fetchStaff = async () => {
      // ── PATCH: query unified profiles table; branch filter not needed for
      //    customers reaching out to staff (they can message any active staff)
      const { data } = await supabase
        .from(T_PROFILES)
        .select('id, first_name, last_name, email, role')
        .in('role', ['Admin', 'Manager', 'Employee'])
        .eq('status', 'Active')
        .order('first_name');

      const mapped = (data || []).map((p) => ({
        id:        p.id,
        full_name: toFullName(p),
        email:     p.email || '',
        role:      p.role,
      }));
      setStaff(mapped);
      if (mapped.length > 0 && !selected) setSelected(mapped[0]);
    };
    fetchStaff();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLoading, myId]);

  const fetchMessages = async (staffId) => {
    if (!myId || !staffId) return;
    const { data } = await supabase
      .from(T_MESSAGES)
      .select('*')
      .or(
        `and(sender_id.eq.${myId},receiver_id.eq.${staffId}),` +
        `and(sender_id.eq.${staffId},receiver_id.eq.${myId})`
      )
      .order('created_at');
    setMessages(data || []);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
  };

  /* ── Subscribe + mark read for active conversation ── */
  useEffect(() => {
    if (!selected || !myId) return;
    fetchMessages(selected.id);

    supabase.from(T_MESSAGES).update({ is_read: true })
      .eq('receiver_id', myId)
      .eq('sender_id', selected.id)
      .eq('is_read', false);
    setUnread((prev) => ({ ...prev, [selected.id]: 0 }));

    const sub = supabase.channel('customer-messages-' + selected.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: T_MESSAGES }, (payload) => {
        const msg = payload.new || payload.old;
        if (!msg) return;
        const relevant =
          (msg.sender_id === myId && msg.receiver_id === selected.id) ||
          (msg.sender_id === selected.id && msg.receiver_id === myId);
        if (relevant) fetchMessages(selected.id);
      })
      .subscribe();
    return () => { supabase.removeChannel(sub); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, myId]);

  /* ── Unread badge counts ── */
  useEffect(() => {
    if (!myId) return;
    const recompute = async () => {
      const { data } = await supabase
        .from(T_MESSAGES)
        .select('sender_id')
        .eq('receiver_id', myId)
        .eq('is_read', false);
      const counts = {};
      (data || []).forEach((m) => { counts[m.sender_id] = (counts[m.sender_id] || 0) + 1; });
      setUnread(counts);
    };
    recompute();
    const ch = supabase.channel('customer-unread')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: T_MESSAGES, filter: `receiver_id=eq.${myId}` },
        recompute)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [myId]);

  /* ── Send message (customer → staff) ── */
  const sendMessage = async () => {
    const text = newMsg.trim();
    if (!text || sending || !myId || !selected) return;
    setSending(true);
    const optimistic = {
      id: `tmp-${Date.now()}`, sender_id: myId, receiver_id: selected.id,
      message: text, is_read: false, created_at: new Date().toISOString(), _pending: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    setNewMsg('');
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);

    // ── PATCH: insert now includes branch_id ─────────────────────────────
    const { error } = await supabase.from(T_MESSAGES).insert([{
      sender_id:   myId,
      receiver_id: selected.id,
      message:     text,
      is_read:     false,
      branch_id:   user?.branchId ?? null,
    }]);
    setSending(false);
    if (error) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      showModal('Failed to Send', error.message, 'error');
    } else {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      fetchMessages(selected.id);
    }
  };

  const handleClearMessages = () =>
    showModal('Clear Messages', `Remove all messages with ${selected?.full_name} from your view?`, 'confirm',
      () => { setMessages([]); closeModal(); }, 'Clear', 'Cancel');

  const handleDeleteConversation = () => {
    showModal('Delete Conversation', `Permanently delete your conversation with ${selected?.full_name}?`, 'confirm',
      async () => {
        closeModal(); setDeleting(true);
        const { data: rows } = await supabase.from(T_MESSAGES).select('id')
          .or(`and(sender_id.eq.${myId},receiver_id.eq.${selected.id}),and(sender_id.eq.${selected.id},receiver_id.eq.${myId})`);
        const ids = (rows || []).map((r) => r.id);
        if (ids.length) await supabase.from(T_MESSAGES).delete().in('id', ids);
        setDeleting(false); setMessages([]);
      }, 'Delete Forever', 'Cancel');
  };

  // ── Render guard — after all hooks ───────────────────────────────────────
  if (userLoading) {
    return (
      <Layout>
        <div style={{
          position: 'fixed', top: 64, left: 0, right: 0, bottom: 0,
          display: 'grid', gridTemplateColumns: '300px 1fr',
          background: '#f4f6fb', overflow: 'hidden',
        }}>
          {/* Left sidebar skeleton */}
          <div style={{ background: '#fff', borderRight: '1.5px solid #eef0f6', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ padding: '18px 18px 12px', borderBottom: '1px solid #f0f2f8' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <Skeleton w={40} h={40} r="50%" />
                <div style={{ flex: 1 }}>
                  <Skeleton w="60%" h={13} r={5} mb={5} />
                  <Skeleton w="35%" h={10} r={4} />
                </div>
              </div>
              <Skeleton w="100%" h={36} r={10} />
            </div>

            {/* Section label */}
            <div style={{ padding: '10px 18px 6px' }}>
              <Skeleton w={40} h={10} r={4} />
            </div>

            {/* Staff rows */}
            <div style={{ flex: 1, padding: '0 0 8px' }}>
              {[...Array(6)].map((_, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px' }}>
                  <Skeleton w={44} h={44} r="50%" />
                  <div style={{ flex: 1 }}>
                    <Skeleton w="65%" h={13} r={5} mb={6} />
                    <Skeleton w="45%" h={11} r={4} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right chat pane skeleton */}
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Chat header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', background: '#fff', borderBottom: '1.5px solid #eef0f6' }}>
              <Skeleton w={44} h={44} r="50%" />
              <div style={{ flex: 1 }}>
                <Skeleton w="30%" h={14} r={5} mb={6} />
                <Skeleton w="15%" h={11} r={4} />
              </div>
            </div>

            {/* Chat bubbles */}
            <div style={{ flex: 1, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14, background: '#f4f6fb' }}>
              {[...Array(5)].map((_, i) => {
                const me = i % 2 === 0;
                return (
                  <div key={i} style={{ display: 'flex', justifyContent: me ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: 8 }}>
                    {!me && <Skeleton w={28} h={28} r="50%" />}
                    <Skeleton w={`${[40, 55, 35, 50, 45][i]}%`} h={40} r={me ? '18px 18px 4px 18px' : '18px 18px 18px 4px'} />
                    {me && <Skeleton w={28} h={28} r="50%" />}
                  </div>
                );
              })}
            </div>

            {/* Input area */}
            <div style={{ background: '#fff', borderTop: '1.5px solid #eef0f6', padding: '10px 18px 14px' }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <Skeleton w="100%" h={46} r={26} />
                <Skeleton w={46} h={46} r="50%" />
              </div>
            </div>
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

  const filteredStaff = staff.filter((d) =>
    !search || (d.full_name || d.email || '').toLowerCase().includes(search.toLowerCase())
  );
  const grouped = groupByDate(messages);
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
  const totalUnread = Object.values(unread).reduce((a, b) => a + b, 0);

  return (
    <Layout>
      <style>{`
        @keyframes fadeIn  { from { opacity:0 } to { opacity:1 } }
        @keyframes slideUp { from { opacity:0;transform:translateY(14px) } to { opacity:1;transform:translateY(0) } }
        @keyframes popIn   { from { opacity:0;transform:translateY(5px) scale(0.97) } to { opacity:1;transform:translateY(0) scale(1) } }
        @keyframes shimmer { 0%{background-position:-200px 0} 100%{background-position:200px 0} }

        .msg-page * { box-sizing: border-box; }
        .client-row { transition: background 0.12s; cursor: pointer; }
        .client-row:hover { background: #f0f4ff !important; }
        .client-row.active { background: #eff0fe !important; border-left: 3px solid #6366f1 !important; }
        .msg-input:focus { outline: none; border-color: #6366f1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
        .send-btn:hover:not(:disabled) { background: #4f46e5 !important; transform: scale(1.05); }
        .send-btn:active:not(:disabled) { transform: scale(0.94) !important; }
        .send-btn { transition: background 0.15s, transform 0.12s, box-shadow 0.15s; }
        .bubble { animation: popIn 0.18s ease; }
        .sidebar-scroll::-webkit-scrollbar, .chat-scroll::-webkit-scrollbar { width: 3px; }
        .sidebar-scroll::-webkit-scrollbar-thumb, .chat-scroll::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 4px; }
        .emoji-quick span { cursor: pointer; transition: transform 0.1s; display: inline-block; }
        .emoji-quick span:hover { transform: scale(1.35); }
      `}</style>

      <Modal show={modal.show} title={modal.title} message={modal.message} type={modal.type}
        onClose={closeModal} onConfirm={modal.onConfirm} confirmText={modal.confirmText} cancelText={modal.cancelText} />

      <div className="msg-page" style={{ position: 'fixed', top: 64, left: 0, right: 0, bottom: 0, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '300px 1fr', background: '#f4f6fb', overflow: 'hidden' }}>

        {/* ══ LEFT SIDEBAR ══ */}
        <div style={{ display: 'flex', flexDirection: 'column', background: '#fff', borderRight: '1.5px solid #eef0f6', boxShadow: '3px 0 12px rgba(0,0,0,0.04)' }}>
          <div style={{ padding: '18px 18px 12px', borderBottom: '1px solid #f0f2f8' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <Avatar name={myName} size={40} me />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{myName}</div>
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>Messages</div>
              </div>
              {totalUnread > 0 && (
                <div style={{ background: '#ef4444', color: '#fff', borderRadius: 99, fontSize: 10, fontWeight: 700, minWidth: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 6px' }}>
                  {totalUnread > 9 ? '9+' : totalUnread}
                </div>
              )}
            </div>

            <div style={{ position: 'relative' }}>
              <svg style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search staff…"
                style={{ width: '100%', padding: '9px 12px 9px 32px', borderRadius: 10, border: '1.5px solid #eef0f6', background: '#f8f9fc', fontSize: 13, color: '#111827', outline: 'none', fontFamily: 'inherit' }} />
            </div>
          </div>

          <div style={{ padding: '10px 18px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Staff</span>
            {filteredStaff.length > 0 && <span style={{ fontSize: 11, color: '#9ca3af' }}>{filteredStaff.length}</span>}
          </div>

          <div className="sidebar-scroll" style={{ flex: 1, overflowY: 'auto' }}>
            {filteredStaff.length === 0 ? (
              <div style={{ padding: 28, textAlign: 'center' }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>💬</div>
                <div style={{ fontSize: 13, color: '#9ca3af' }}>{search ? 'No matches found.' : 'No staff available'}</div>
              </div>
            ) : filteredStaff.map((c) => {
              const isActive = selected?.id === c.id;
              const badge = unread[c.id] || 0;
              return (
                <div key={c.id} className={`client-row ${isActive ? 'active' : ''}`}
                  onClick={() => { setSelected(c); setTimeout(() => inputRef.current?.focus(), 100); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderLeft: `3px solid ${isActive ? '#6366f1' : 'transparent'}`, background: isActive ? '#eff0fe' : 'transparent' }}
                >
                  <Avatar name={c.full_name || c.email} size={44} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: badge > 0 ? 700 : 600, fontSize: 13.5, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.full_name || c.email || 'Unknown'}
                    </div>
                    <div style={{ fontSize: 11.5, color: badge > 0 ? '#6366f1' : '#9ca3af', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: badge > 0 ? 600 : 400 }}>
                      {c.role || c.email || '—'}
                    </div>
                  </div>
                  {badge > 0 && (
                    <div style={{ background: '#6366f1', color: '#fff', borderRadius: 99, fontSize: 10, fontWeight: 700, minWidth: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 6px', boxShadow: '0 2px 8px rgba(99,102,241,0.4)' }}>
                      {badge}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ══ RIGHT CHAT PANE ══ */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {!selected ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: '#f4f6fb' }}>
              <div style={{ width: 90, height: 90, borderRadius: '50%', background: 'linear-gradient(135deg,#ede9fe,#dbeafe)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(99,102,241,0.15)' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Your Messages</div>
                <div style={{ fontSize: 13, color: '#9ca3af' }}>Select a staff member to start messaging</div>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', background: '#fff', borderBottom: '1.5px solid #eef0f6', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', flexShrink: 0 }}>
                <Avatar name={selected.full_name || selected.email} size={44} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>
                    {selected.full_name || selected.email}
                  </div>
                  <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 1 }}>
                    {selected.role || ''}
                  </div>
                </div>
                <ConversationMenu onClear={handleClearMessages} onDelete={handleDeleteConversation} />
              </div>

              {deleting && (
                <div style={{ padding: '10px 20px', background: '#fef2f2', borderBottom: '1px solid #fecaca', fontSize: 13, color: '#dc2626' }}>
                  Deleting conversation…
                </div>
              )}

              <div className="chat-scroll" style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 2, background: '#f4f6fb' }}>
                {messages.length === 0 && !deleting && (
                  <div style={{ margin: 'auto', textAlign: 'center' }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>👋</div>
                    <div style={{ fontSize: 14, color: '#9ca3af' }}>No messages yet. Say hello!</div>
                  </div>
                )}
                {grouped.map((item, i) => {
                  if (item.type === 'divider') return (
                    <div key={`d-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '18px 0 8px' }}>
                      <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
                      <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, background: '#f4f6fb', padding: '2px 12px', borderRadius: 99, border: '1px solid #e5e7eb' }}>{item.label}</span>
                      <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
                    </div>
                  );
                  const me = item.sender_id === myId;
                  return (
                    <div key={item.id} className="bubble" style={{ display: 'flex', justifyContent: me ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: 8, marginTop: 3 }}>
                      {!me && <Avatar name={selected.full_name || selected.email} size={28} />}
                      <div style={{ maxWidth: '62%' }}>
                        <div style={{
                          background: me ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : '#fff',
                          color: me ? '#fff' : '#111827',
                          padding: '10px 14px',
                          borderRadius: me ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                          fontSize: 14, lineHeight: 1.55,
                          opacity: item._pending ? 0.55 : 1,
                          boxShadow: me ? '0 3px 14px rgba(99,102,241,0.3)' : '0 1px 4px rgba(0,0,0,0.08)',
                          wordBreak: 'break-word', whiteSpace: 'pre-wrap',
                        }}>
                          {item.message}
                        </div>
                        <div style={{ fontSize: 10.5, color: '#9ca3af', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4, justifyContent: me ? 'flex-end' : 'flex-start' }}>
                          {fmtTime(item.created_at)}
                          {me && !item._pending && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5"><path d="M20 6 9 17l-5-5" /></svg>
                          )}
                          {item._pending && <span style={{ fontStyle: 'italic' }}>sending…</span>}
                        </div>
                      </div>
                      {me && <Avatar name={myName} size={28} me />}
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              <div style={{ background: '#fff', borderTop: '1.5px solid #eef0f6', flexShrink: 0 }}>
                <div className="emoji-quick" style={{ padding: '8px 18px 0', display: 'flex', gap: 6 }}>
                  {['👍', '❤️', '😊', '😂', '🙏', '👋', '✅', '🐾'].map((em) => (
                    <span key={em} style={{ fontSize: 18 }} onClick={() => setNewMsg((p) => p + em)}>{em}</span>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px 14px' }}>
                  <input
                    ref={inputRef}
                    className="msg-input"
                    value={newMsg}
                    onChange={(e) => setNewMsg(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    placeholder={`Message ${selected.full_name || selected.email}…`}
                    style={{ flex: 1, padding: '12px 18px', borderRadius: 26, border: '1.5px solid #e5e7eb', background: '#f8f9fc', fontSize: 14, color: '#111827', fontFamily: 'inherit', transition: 'border-color 0.15s, box-shadow 0.15s' }}
                  />
                  <button
                    className="send-btn"
                    onClick={sendMessage}
                    disabled={sending || !newMsg.trim()}
                    style={{ width: 46, height: 46, borderRadius: '50%', border: 'none', background: sending || !newMsg.trim() ? '#e5e7eb' : 'linear-gradient(135deg,#6366f1,#8b5cf6)', cursor: sending || !newMsg.trim() ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: newMsg.trim() ? '0 4px 14px rgba(99,102,241,0.4)' : 'none' }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={sending || !newMsg.trim() ? '#9ca3af' : '#fff'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 2 11 13" /><path d="M22 2 15 22 11 13 2 9l20-7z" />
                    </svg>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default CustomerMessages;