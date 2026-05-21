import React, { useState, useEffect, useRef, useCallback } from 'react';
import Layout from '../components/layout';
import { supabase } from '../js/supabase';
import { useCurrentUser } from '../js/useCurrentUser';

// ─── Animated bar component ───────────────────────────────────────────────────
function AnimatedBar({ heightPct, color, delay = 0, label, valueLabel }) {
  const barRef = useRef(null);
  const [grown, setGrown] = useState(false);

  useEffect(() => {
    setGrown(false);
    const timer = setTimeout(() => setGrown(true), 60 + delay);
    return () => clearTimeout(timer);
  }, [heightPct, delay]);

  const barH = Math.max(4, heightPct * 148);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 0 }}>
      <span style={{
        fontSize: 10,
        fontWeight: 700,
        color: 'var(--muted)',
        height: 14,
        lineHeight: '14px',
        opacity: grown && heightPct > 0 ? 1 : 0,
        transform: grown && heightPct > 0 ? 'translateY(0)' : 'translateY(4px)',
        transition: `opacity 0.3s ${delay + 200}ms, transform 0.3s ${delay + 200}ms`,
      }}>
        {valueLabel}
      </span>

      <div ref={barRef} style={{
        width: '100%',
        background: color,
        borderRadius: '5px 5px 2px 2px',
        height: `${barH}px`,
        transformOrigin: 'bottom center',
        transform: grown ? 'scaleY(1)' : 'scaleY(0)',
        opacity: grown ? 1 : 0,
        transition: `transform 0.52s cubic-bezier(0.34,1.28,0.64,1) ${delay}ms, opacity 0.3s ease ${delay}ms`,
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, rgba(255,255,255,0.18) 0%, transparent 60%)',
          borderRadius: 'inherit',
        }} />
      </div>

      <span style={{ fontSize: 10, color: 'var(--muted)', textAlign: 'center', lineHeight: 1.2 }}>
        {label}
      </span>
    </div>
  );
}

// ─── Animated count-up number ─────────────────────────────────────────────────
function CountUp({ value, prefix = '', suffix = '', duration = 800 }) {
  const [display, setDisplay] = useState(0);
  const startRef = useRef(null);
  const fromRef = useRef(0);

  useEffect(() => {
    fromRef.current = 0;
    setDisplay(0);
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      const cur = fromRef.current + (value - fromRef.current) * ease;
      setDisplay(cur);
      if (p < 1) startRef.current = requestAnimationFrame(tick);
      else { setDisplay(value); fromRef.current = value; }
    };
    startRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(startRef.current);
  }, [value, duration]);

  const formatted = typeof value === 'number' && value >= 1000
    ? display.toLocaleString('en-PH', { maximumFractionDigits: 0 })
    : Math.round(display).toLocaleString();

  return <>{prefix}{formatted}{suffix}</>;
}

// ─── Main Report Component ────────────────────────────────────────────────────
const Report = () => {
  const { user, isAdmin, seeAllBranches, loading: userLoading } = useCurrentUser();

  const [range, setRange] = useState('This Week');
  const [branchFilter, setBranchFilter] = useState('');
  const [branches, setBranches] = useState([]);
  const [stats, setStats] = useState({ appointments: 0, sales: 0, patients: 0, lowStock: 0 });
  const [salesData, setSalesData] = useState([]);
  const [apptData, setApptData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState('');
  const [animKey, setAnimKey] = useState(0);

  // ── Fetch available branches for admin dropdown ────────────────────────────
  useEffect(() => {
    if (!seeAllBranches) return;
    const fetchBranches = async () => {
      const { data } = await supabase.from('branches').select('id, name').order('name');
      setBranches(data || []);
    };
    fetchBranches();
  }, [seeAllBranches]);

  const fetchReports = useCallback(async () => {
    if (userLoading || !user) return;
    setLoading(true);

    const now = new Date();
    let startDate;

    if (range === 'Today') {
      startDate = new Date(now.toDateString());
    } else if (range === 'This Week') {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
    } else if (range === 'This Month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      startDate = new Date(now.getFullYear(), 0, 1);
    }

    const startStr = startDate.toISOString();

    try {
      // ── Build branch-filtered queries ──────────────────────────────────────
      let qAppts = supabase.from('appointments').select('*').gte('created_at', startStr);
      let qTx    = supabase.from('transactions').select('*').gte('created_at', startStr);
      let qPat   = supabase.from('patients').select('id', { count: 'exact' });
      let qInv   = supabase.from('inventory').select('id,qty,threshold');

      if (!seeAllBranches && user?.branchId) {
        qAppts = qAppts.eq('branch_id', user.branchId);
        qTx    = qTx.eq('branch_id', user.branchId);
        qPat   = qPat.eq('branch_id', user.branchId);
        qInv   = qInv.eq('branch_id', user.branchId);
      }
      if (seeAllBranches && branchFilter) {
        qAppts = qAppts.eq('branch_id', branchFilter);
        qTx    = qTx.eq('branch_id', branchFilter);
        qPat   = qPat.eq('branch_id', branchFilter);
        qInv   = qInv.eq('branch_id', branchFilter);
      }

      const [appts, tx, patients, inventory] = await Promise.all([qAppts, qTx, qPat, qInv]);

      setStats({
        appointments: (appts.data || []).length,
        sales: (tx.data || []).reduce((s, t) => s + Number(t.total || 0), 0),
        patients: patients.count || 0,
        lowStock: (inventory.data || []).filter(i => i.qty <= (i.threshold ?? 10)).length,
      });

      const last7 = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return d.toISOString().split('T')[0];
      });

      setSalesData(last7.map(date => ({
        date,
        total: (tx.data || [])
          .filter(t => t.created_at?.startsWith(date))
          .reduce((s, t) => s + Number(t.total || 0), 0),
      })));

      setApptData(last7.map(date => ({
        date,
        count: (appts.data || [])
          .filter(a => (a.date || a.created_at?.split('T')[0]) === date)
          .length,
      })));

      setAnimKey(k => k + 1);
    } catch (err) {
      console.error(err);
    }

    setLoading(false);
  }, [range, user, userLoading, seeAllBranches, branchFilter]);

  useEffect(() => {
    if (userLoading || !user) return;
    fetchReports();

    const channels = [
      supabase.channel('report-appointments')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => fetchReports())
        .subscribe(),
      supabase.channel('report-transactions')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => fetchReports())
        .subscribe(),
      supabase.channel('report-patients')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'patients' }, () => fetchReports())
        .subscribe(),
      supabase.channel('report-inventory')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, () => fetchReports())
        .subscribe(),
    ];

    return () => { channels.forEach(ch => supabase.removeChannel(ch)); };
  }, [range, user, userLoading, seeAllBranches, branchFilter, fetchReports]);

  // ── Resolve display branch label ───────────────────────────────────────────
  const branchLabel = (() => {
    if (!seeAllBranches) return user?.branchId ? `Branch ${user.branchId}` : 'My Branch';
    if (branchFilter) return branches.find(b => b.id === branchFilter)?.name ?? 'Selected Branch';
    return 'All Branches';
  })();

  // ── PDF Export ──────────────────────────────────────────────────────────────
  const handleExportPDF = async () => {
    setExporting('pdf');
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      const doc = new jsPDF();
      const now = new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
      doc.setFontSize(18); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 58, 138);
      doc.text('Angeles Animal Care Hospital', 105, 18, { align: 'center' });
      doc.setFontSize(11); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 116, 139);
      doc.text(`${branchLabel} — Management Reports`, 105, 25, { align: 'center' });
      doc.setFontSize(10);
      doc.text(`Report Range: ${range} | Generated: ${now}`, 105, 32, { align: 'center' });
      doc.setDrawColor(200, 210, 232); doc.line(14, 36, 196, 36);
      doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 41, 59);
      doc.text('Summary Overview', 14, 44);
      autoTable(doc, {
        startY: 48,
        head: [['Metric', 'Value']],
        body: [
          ['Appointments', String(stats.appointments)],
          ['Total Sales', `PHP ${stats.sales.toLocaleString()}`],
          ['Total Patients', String(stats.patients)],
          ['Low Stock Items', String(stats.lowStock)],
        ],
        headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [240, 245, 255] },
        styles: { fontSize: 11, cellPadding: 5 },
        columnStyles: { 0: { fontStyle: 'bold' }, 1: { halign: 'right' } },
        margin: { left: 14, right: 14 },
      });
      const sY = doc.lastAutoTable.finalY + 12;
      doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.text('Sales — Last 7 Days', 14, sY);
      autoTable(doc, {
        startY: sY + 4,
        head: [['Date', 'Day', 'Total Sales (PHP)']],
        body: salesData.map(d => [d.date, new Date(d.date).toLocaleDateString('en', { weekday: 'long' }), `PHP ${d.total.toLocaleString()}`]),
        headStyles: { fillColor: [30, 58, 138], textColor: 255 },
        alternateRowStyles: { fillColor: [240, 245, 255] },
        styles: { fontSize: 10, cellPadding: 4 },
        columnStyles: { 2: { halign: 'right' } },
        margin: { left: 14, right: 14 },
      });
      const aY = doc.lastAutoTable.finalY + 12;
      doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.text('Appointments — Last 7 Days', 14, aY);
      autoTable(doc, {
        startY: aY + 4,
        head: [['Date', 'Day', 'Appointments']],
        body: apptData.map(d => [d.date, new Date(d.date).toLocaleDateString('en', { weekday: 'long' }), String(d.count)]),
        headStyles: { fillColor: [34, 197, 94], textColor: 255 },
        alternateRowStyles: { fillColor: [240, 253, 244] },
        styles: { fontSize: 10, cellPadding: 4 },
        columnStyles: { 2: { halign: 'right' } },
        margin: { left: 14, right: 14 },
      });
      const pc = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pc; i++) {
        doc.setPage(i); doc.setFontSize(9); doc.setTextColor(150);
        doc.text(`Page ${i} of ${pc}`, 105, 290, { align: 'center' });
        doc.text('Angeles Animal Care Hospital — Confidential', 14, 290);
      }
      doc.save(`Report_${range.replace(/ /g, '')}_${now.replace(/ /g, '')}.pdf`);
    } catch (err) { console.error(err); alert('PDF export failed.'); }
    finally { setExporting(''); }
  };

  // ── Excel Export ────────────────────────────────────────────────────────────
  const handleExportExcel = async () => {
    setExporting('excel');
    try {
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
        ['Angeles Animal Care Hospital — Report'],
        [`Branch: ${branchLabel}`],
        [`Range: ${range}`],
        [`Generated: ${new Date().toLocaleDateString()}`],
        [],
        ['Metric', 'Value'],
        ['Appointments', stats.appointments],
        ['Total Sales', stats.sales],
        ['Total Patients', stats.patients],
        ['Low Stock Items', stats.lowStock],
      ]), 'Summary');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
        ['Date', 'Day', 'Total Sales (₱)'],
        ...salesData.map(d => [d.date, new Date(d.date).toLocaleDateString('en', { weekday: 'long' }), d.total]),
      ]), 'Sales');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
        ['Date', 'Day', 'Appointments'],
        ...apptData.map(d => [d.date, new Date(d.date).toLocaleDateString('en', { weekday: 'long' }), d.count]),
      ]), 'Appointments');
      XLSX.writeFile(wb, `Report_${range.replace(/ /g, '_')}_${branchLabel.replace(/ /g, '_')}.xlsx`);
    } catch (err) { console.error(err); alert('Excel export failed.'); }
    finally { setExporting(''); }
  };

  // ── Derived chart values ────────────────────────────────────────────────────
  const maxSales = Math.max(...salesData.map(d => d.total), 1);
  const maxAppts = Math.max(...apptData.map(d => d.count), 1);
  const totalSalesWeek = salesData.reduce((s, d) => s + d.total, 0);
  const totalApptsWeek = apptData.reduce((s, d) => s + d.count, 0);

  const RANGE_COLORS = {
    'Today':      { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' },
    'This Week':  { bg: '#f0fdf4', text: '#166534', border: '#bbf7d0' },
    'This Month': { bg: '#faf5ff', text: '#6b21a8', border: '#e9d5ff' },
    'This Year':  { bg: '#fff7ed', text: '#9a3412', border: '#fed7aa' },
  };
  const rc = RANGE_COLORS[range] || RANGE_COLORS['This Week'];

  const S = {
    page:   { width: '100%', minHeight: '100vh', display: 'block' },
    topbar: { background: '#fff', borderBottom: '1px solid var(--border)', padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'fixed', top: 'var(--topbar-h)', zIndex: 99, left: 'var(--current-sidebar-w, 62px)', right: 0, boxSizing: 'border-box', gap: 12 },
    card:   { background: '#fff', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)', width: '100%', marginBottom: 20 },
    inp:    { padding: '9px 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', background: '#fff', color: 'var(--text)', outline: 'none' },
    cont:   { padding: '24px 28px', paddingTop: 'calc(var(--topbar-h) + 64px + 24px)', boxSizing: 'border-box' },
  };

  const statCards = [
    { label: range === 'Today' ? "Today's Appointments" : 'Appointments', value: stats.appointments, display: <CountUp key={`${animKey}-a`} value={stats.appointments} />, icon: '/icon/calendar.png', color: 'blue', sub: `in ${range.toLowerCase()}` },
    { label: range === 'Today' ? "Today's Sales" : 'Total Sales', value: stats.sales, display: <CountUp key={`${animKey}-s`} value={stats.sales} prefix="₱" />, icon: '/icon/money_bag.png', color: 'green', sub: `in ${range.toLowerCase()}` },
    { label: 'Total Patients', value: stats.patients, display: <CountUp key={`${animKey}-p`} value={stats.patients} />, icon: '/icon/attended.png', color: 'yellow', sub: 'all time' },
    { label: 'Low Stock Items', value: stats.lowStock, display: <CountUp key={`${animKey}-l`} value={stats.lowStock} />, icon: '/icon/warning.png', color: 'red', sub: 'need restocking' },
  ];

  return (
    <Layout>
      <style>{`
        @keyframes reportFadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes reportFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes reportBarGrow { from { transform: scaleY(0); opacity: 0; } to { transform: scaleY(1); opacity: 1; } }
        @keyframes reportSpin { to { transform: rotate(360deg); } }
        @keyframes reportShimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        .report-stat-card { animation: reportFadeUp 0.38s ease both; transition: box-shadow 0.2s, transform 0.2s; }
        .report-stat-card:hover { transform: translateY(-3px); box-shadow: 0 8px 28px rgba(30,58,138,0.10) !important; }
        .report-chart-card { animation: reportFadeIn 0.45s ease both; }
        .export-btn:hover:not(:disabled) { filter: brightness(1.07); transform: translateY(-1px); }
        .export-btn { transition: all 0.18s; }
        .range-pill { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 99px; font-size: 11px; font-weight: 700; letter-spacing: 0.3px; }
        .bar-col:hover .bar-fill { filter: brightness(1.12); }
        .bar-col { transition: all 0.15s; }
        .skeleton { background: linear-gradient(90deg, #f3f4f6 25%, #e9ecef 50%, #f3f4f6 75%); background-size: 200% 100%; animation: reportShimmer 1.4s infinite; border-radius: 8px; }
        .export-spin { width: 14px; height: 14px; border: 2px solid currentColor; border-top-color: transparent; border-radius: 50%; animation: reportSpin 0.6s linear infinite; display: inline-block; }
        .export-spin-light { border-color: rgba(255,255,255,0.5); border-top-color: #fff; }
      `}</style>

      <div style={S.page}>

        {/* ══ Topbar ══════════════════════════════════════════════════════════ */}
        <div style={S.topbar}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/icon/reports.png" alt=""
              style={{ width: 22, height: 22, filter: 'brightness(0) saturate(100%) invert(17%) sepia(82%) saturate(1200%) hue-rotate(210deg)' }} />
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', margin: 0 }}>Reports</h1>
              <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
                {branchLabel}
                <span className="range-pill" style={{ marginLeft: 8, background: rc.bg, color: rc.text, border: `1px solid ${rc.border}` }}>
                  {range}
                </span>
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>

            {/* ── Admin branch filter dropdown ── */}
            {seeAllBranches && (
              <select
                value={branchFilter}
                onChange={e => setBranchFilter(e.target.value)}
                style={{ ...S.inp, width: 180 }}
              >
                <option value="">All Branches</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            )}

            <select value={range} onChange={e => setRange(e.target.value)} style={{ ...S.inp, width: 140 }}>
              <option>Today</option>
              <option>This Week</option>
              <option>This Month</option>
              <option>This Year</option>
            </select>

            {/* ── PDF Export Button ── */}
            <button
              className="btn btn-outline export-btn"
              onClick={handleExportPDF}
              disabled={loading || !!exporting}
              style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: 6, opacity: loading ? 0.55 : 1 }}>
              {exporting === 'pdf' ? (
                <><span className="export-spin" />Exporting…</>
              ) : (
                <><img src="/icon/pdf-file.png" alt="PDF" style={{ width: 16, height: 16, objectFit: 'contain' }} />PDF</>
              )}
            </button>

            {/* ── Excel Export Button ── */}
            <button
              className="btn btn-primary export-btn"
              onClick={handleExportExcel}
              disabled={loading || !!exporting}
              style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: 6, opacity: loading ? 0.55 : 1 }}>
              {exporting === 'excel' ? (
                <><span className="export-spin export-spin-light" />Exporting…</>
              ) : (
                <><img src="/icon/excel.png" alt="Excel" style={{ width: 16, height: 16, objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />Excel</>
              )}
            </button>
          </div>
        </div>

        {/* ══ Content ═════════════════════════════════════════════════════════ */}
        <div style={S.cont}>

          {/* ── Stat cards ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(195px, 1fr))', gap: 14, marginBottom: 24 }}>
            {statCards.map((sc, i) => (
              <div
                key={`${animKey}-card-${i}`}
                style={{
                  background: 'var(--card)', border: '1.5px solid var(--border)',
                  borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column',
                  gap: 14, position: 'relative', overflow: 'hidden', cursor: 'default',
                  animationDelay: `${i * 65}ms`,
                  transition: 'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease',
                  boxShadow: '0 2px 12px rgba(30,58,138,0.05)',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(30,58,138,0.10)'; e.currentTarget.style.borderColor = 'rgba(30,58,138,0.25)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(30,58,138,0.05)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
              >
                {/* Top accent bar */}
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                  borderRadius: '16px 16px 0 0',
                  background: sc.color === 'blue' ? 'linear-gradient(90deg,#1e3a8a,#3b82f6)' : sc.color === 'green' ? 'linear-gradient(90deg,#16a34a,#22c55e)' : sc.color === 'yellow' ? 'linear-gradient(90deg,#d97706,#f59e0b)' : 'linear-gradient(90deg,#dc2626,#ef4444)',
                }} />

                {/* Icon */}
                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                  <div style={{
                    width: 46, height: 46, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: sc.color === 'blue' ? '#eff6ff' : sc.color === 'green' ? '#f0fdf4' : sc.color === 'yellow' ? '#fffbeb' : '#fff1f2',
                  }}>
                    <img src={sc.icon} alt={sc.label} style={{
                      width: 24, height: 24,
                      filter: sc.color === 'blue' ? 'brightness(0) saturate(100%) invert(17%) sepia(82%) saturate(1200%) hue-rotate(210deg)' : sc.color === 'green' ? 'brightness(0) saturate(100%) invert(32%) sepia(80%) saturate(600%) hue-rotate(110deg) brightness(0.9)' : sc.color === 'yellow' ? 'brightness(0) saturate(100%) invert(52%) sepia(90%) saturate(600%) hue-rotate(10deg) brightness(0.9)' : 'brightness(0) saturate(100%) invert(20%) sepia(90%) saturate(1200%) hue-rotate(340deg) brightness(0.9)',
                    }} />
                  </div>
                </div>

                {/* Value + label */}
                <div>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {sc.label}
                  </p>
                  <h3 style={{ margin: '4px 0 6px', fontSize: 26, fontWeight: 800, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                    {loading ? '—' : sc.display}
                  </h3>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    {sc.sub}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* ── Charts row ── */}
          <div style={{ display: 'grid', gridTemplateColumns: typeof window !== 'undefined' && window.innerWidth <= 768 ? '1fr' : '1fr 1fr', gap: 20 }}>

            {/* ── Sales chart ── */}
            <div style={{ ...S.card, animationDelay: '180ms' }} className="report-chart-card">
              <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 2px' }}>Sales — Last 7 Days</h2>
                  <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>
                    {loading ? '—' : (
                      <span>Total: <strong style={{ color: 'var(--royal)' }}>₱{totalSalesWeek.toLocaleString('en-PH')}</strong></span>
                    )}
                  </p>
                </div>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--royal)' }} />
              </div>
              <div style={{ padding: '20px 20px 14px' }}>
                {loading ? (
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 180 }}>
                    {Array.from({ length: 7 }).map((_, i) => (
                      <div key={i} className="skeleton" style={{ flex: 1, height: `${40 + Math.random() * 80}px`, borderRadius: '5px 5px 2px 2px' }} />
                    ))}
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 162 }}>
                      {salesData.map((d, i) => (
                        <div key={`${animKey}-sb-${i}`} className="bar-col" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                          <AnimatedBar key={`${animKey}-bar-s-${i}`} heightPct={d.total / maxSales} color="var(--royal)" delay={i * 55} label={new Date(d.date).toLocaleDateString('en', { weekday: 'short' })} valueLabel={d.total > 0 ? `₱${(d.total / 1000).toFixed(1)}k` : ''} />
                        </div>
                      ))}
                    </div>
                    <div style={{ height: 1, background: 'var(--border)', margin: '6px 0 0' }} />
                  </>
                )}
              </div>
            </div>

            {/* ── Appointments chart ── */}
            <div style={{ ...S.card, animationDelay: '240ms' }} className="report-chart-card">
              <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 2px' }}>Appointments by Day</h2>
                  <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>
                    {loading ? '—' : (
                      <span>Total: <strong style={{ color: '#16a34a' }}>{totalApptsWeek} appointment{totalApptsWeek !== 1 ? 's' : ''}</strong></span>
                    )}
                  </p>
                </div>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e' }} />
              </div>
              <div style={{ padding: '20px 20px 14px' }}>
                {loading ? (
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 180 }}>
                    {Array.from({ length: 7 }).map((_, i) => (
                      <div key={i} className="skeleton" style={{ flex: 1, height: `${30 + Math.random() * 90}px`, borderRadius: '5px 5px 2px 2px' }} />
                    ))}
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 162 }}>
                      {apptData.map((d, i) => (
                        <div key={`${animKey}-ab-${i}`} className="bar-col" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                          <AnimatedBar key={`${animKey}-bar-a-${i}`} heightPct={d.count / maxAppts} color="#22c55e" delay={i * 55} label={new Date(d.date).toLocaleDateString('en', { weekday: 'short' })} valueLabel={d.count > 0 ? String(d.count) : ''} />
                        </div>
                      ))}
                    </div>
                    <div style={{ height: 1, background: 'var(--border)', margin: '6px 0 0' }} />
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ── Quick summary table ── */}
          {!loading && (
            <div style={{ ...S.card, animationDelay: '300ms', animation: 'reportFadeUp 0.4s ease 300ms both' }}>
              <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--border)' }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Daily Breakdown — Sales</h2>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr>
                      {['Day', 'Date', 'Sales', 'Appointments'].map(h => (
                        <th key={h} style={{ background: 'var(--bg)', padding: '10px 18px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--border)' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {salesData.map((d, i) => {
                      const apptRow = apptData[i];
                      const isToday = d.date === new Date().toISOString().split('T')[0];
                      return (
                        <tr key={d.date} style={{ borderBottom: '1px solid var(--border)', background: isToday ? 'var(--light-blue)' : 'transparent' }}>
                          <td style={{ padding: '11px 18px', fontWeight: isToday ? 700 : 500, color: 'var(--text)' }}>
                            {new Date(d.date).toLocaleDateString('en', { weekday: 'long' })}
                            {isToday && <span style={{ marginLeft: 6, fontSize: 10, background: 'var(--royal)', color: '#fff', borderRadius: 4, padding: '1px 6px', fontWeight: 700 }}>TODAY</span>}
                          </td>
                          <td style={{ padding: '11px 18px', color: 'var(--muted)', fontSize: 12 }}>{d.date}</td>
                          <td style={{ padding: '11px 18px', fontWeight: 700, color: d.total > 0 ? 'var(--royal)' : 'var(--muted)' }}>
                            {d.total > 0 ? `₱${d.total.toLocaleString('en-PH')}` : '—'}
                          </td>
                          <td style={{ padding: '11px 18px', color: apptRow?.count > 0 ? '#16a34a' : 'var(--muted)', fontWeight: apptRow?.count > 0 ? 700 : 400 }}>
                            {apptRow?.count > 0 ? apptRow.count : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: 'var(--bg)', borderTop: '2px solid var(--border)' }}>
                      <td colSpan={2} style={{ padding: '11px 18px', fontWeight: 700, fontSize: 13 }}>Totals</td>
                      <td style={{ padding: '11px 18px', fontWeight: 800, color: 'var(--royal)', fontSize: 14 }}>
                        ₱{totalSalesWeek.toLocaleString('en-PH')}
                      </td>
                      <td style={{ padding: '11px 18px', fontWeight: 800, color: '#16a34a', fontSize: 14 }}>
                        {totalApptsWeek}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>
    </Layout>
  );
};

export default Report;