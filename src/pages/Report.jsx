import React, { useState, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { LANGS }          from '../i18n/index.js';
import { useLang }        from '../hooks/useStore.js';
import { getReportData }  from '../services/index.js';
import { exportReportPdf, shareReportToWhatsApp } from '../services/reportExport.js';
import { getProductImageSrc } from '../assets/productImages.js';

const fmt    = (n) => 'Rp ' + Math.round(n).toLocaleString('id-ID');
const fmtShort = (n) => n >= 1_000_000 ? (n/1_000_000).toFixed(1)+'jt' : n >= 1000 ? (n/1000).toFixed(0)+'rb' : String(Math.round(n));

const COLORS = ['#0F766E','#4F46E5','#B45309','#BE123C'];

const S = {
  root:     { padding:'22px 28px', overflowY:'auto', height:'100%', display:'flex', flexDirection:'column', gap:22, background:'var(--bg)' },
  toolbar:  { display:'flex', alignItems:'center', gap:18, flexWrap:'wrap', borderBottom:'1px solid var(--border)', padding:'0 0 16px' },
  pageTitle:{ fontSize:20, fontWeight:800, letterSpacing:0, flex:1, color:'var(--text)' },
  rangeBtn: { padding:'8px 0', border:'none', borderBottom:'2px solid transparent', background:'transparent', fontSize:13, cursor:'pointer', color:'var(--text-2)', fontWeight:700, transition:'all .13s', fontFamily:'inherit' },
  rangeBtnA:{ color:'var(--accent-txt)', borderBottom:'2px solid var(--accent)' },
  actionBtn:{ padding:'8px 0', border:'none', borderBottom:'2px solid transparent', background:'transparent', fontSize:13, cursor:'pointer', color:'var(--text-2)', fontWeight:700, fontFamily:'inherit' },
  actionBtnDisabled:{ opacity:0.45, cursor:'not-allowed' },
  metrics:  { display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))', gap:0, borderTop:'1px solid var(--border)', borderBottom:'1px solid var(--border)' },
  metric:   { padding:'18px 20px', borderRight:'1px solid var(--border)' },
  mLabel:   { fontSize:12, color:'var(--text-2)', marginBottom:6, fontWeight:600 },
  mVal:     { fontSize:23, fontWeight:700, letterSpacing:0, fontFamily:'var(--mono)', color:'var(--text)' },
  mSub:     { fontSize:11, color:'var(--text-3)', marginTop:3 },
  row2:     { display:'grid', gridTemplateColumns:'2fr 1fr', gap:28, minHeight:0 },
  card:     { borderTop:'1px solid var(--border)', padding:'18px 0 0' },
  cardTitle:{ fontSize:14, fontWeight:800, marginBottom:14, color:'var(--text)' },
  topItem:  { display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:'1px solid var(--border)' },
  topRank:  { fontSize:11, color:'var(--text-3)', fontFamily:'var(--mono)', minWidth:16 },
  topThumb: { width: 40, height: 40, objectFit: 'contain', display: 'block' },
  topInfo:  { flex:1 },
  topName:  { fontSize:13, fontWeight:500 },
  topSub:   { fontSize:11, color:'var(--text-3)', fontFamily:'var(--mono)' },
  topRev:   { fontSize:12, fontFamily:'var(--mono)', fontWeight:700, color:'var(--accent-txt)' },
  noData:   { textAlign:'center', color:'#9E9C97', padding:'3rem 0', fontSize:13 },
};

const RANGES = ['today','yesterday','last7','last30'];

function getRangeTs(key) {
  const now   = Date.now();
  const sod   = (d) => new Date(d).setHours(0,0,0,0);
  const eod   = (d) => new Date(d).setHours(23,59,59,999);
  const today = new Date();
  switch (key) {
    case 'today':     return [sod(today), eod(today)];
    case 'yesterday': { const y=new Date(today); y.setDate(y.getDate()-1); return [sod(y),eod(y)]; }
    case 'last7':     return [sod(new Date(now-6*86400000)), eod(today)];
    case 'last30':    return [sod(new Date(now-29*86400000)), eod(today)];
    default:          return [sod(today), eod(today)];
  }
}

export default function Report() {
  const { lang }      = useLang();
  const t             = LANGS[lang];
  const [range, setRange] = useState('today');
  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(true);
  const hasData = Boolean(data && data.txCount > 0);

  useEffect(() => {
    setLoading(true);
    const [start, end] = getRangeTs(range);
    getReportData(start, end).then((d) => { setData(d); setLoading(false); });
  }, [range]);

  const pieData = data ? Object.entries(data.byMethod).map(([k, v]) => ({
    name: t[k] || k,
    value: Math.round(v),
  })) : [];

  const chartData = (data?.byDay || []).map((d) => ({
    date: d.date.slice(5), // MM-DD
    sales: Math.round(d.sales),
    count: d.count,
  }));

  return (
    <div style={S.root}>
      {/* Toolbar */}
      <div style={S.toolbar}>
        <span style={S.pageTitle}>{t.reportTitle}</span>
        {RANGES.map((r) => (
          <button
            key={r}
            style={{ ...S.rangeBtn, ...(range===r ? S.rangeBtnA : {}) }}
            onClick={() => setRange(r)}
          >
            {t[r]}
          </button>
        ))}
        <button
          type="button"
          style={{ ...S.actionBtn, ...(!hasData ? S.actionBtnDisabled : {}) }}
          disabled={!hasData}
          onClick={() => exportReportPdf({ data, range, t })}
        >
          PDF
        </button>
        <button
          type="button"
          style={{ ...S.actionBtn, ...(!hasData ? S.actionBtnDisabled : {}) }}
          disabled={!hasData}
          onClick={() => shareReportToWhatsApp({ data, range, t })}
        >
          WhatsApp
        </button>
      </div>

      {loading ? (
        <div style={S.noData}>Loading...</div>
      ) : !data || data.txCount === 0 ? (
        <div style={S.noData}>{t.noData}</div>
      ) : (
        <>
          {/* Metrics */}
          <div style={S.metrics}>
            {[
              { label: t.totalSales,  val: fmt(data.totalSales),   sub: `${data.txCount} transaksi` },
              { label: t.totalTx,     val: data.txCount,            sub: t.totalTx },
              { label: t.totalProfit, val: fmt(data.totalProfit),   sub: '~' },
              { label: t.avgTx,       val: fmt(data.avgTx),         sub: 'per tx' },
            ].map(({ label, val, sub }) => (
              <div key={label} style={S.metric}>
                <div style={S.mLabel}>{label}</div>
                <div style={S.mVal}>{val}</div>
                <div style={S.mSub}>{sub}</div>
              </div>
            ))}
          </div>

          {/* Chart */}
          {chartData.length > 1 && (
            <div style={S.card}>
              <div style={S.cardTitle}>{t.salesChart}</div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData} margin={{ top:4, right:4, left:0, bottom:0 }}>
                  <defs>
                    <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#0F766E" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#0F766E" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                  <XAxis dataKey="date" tick={{ fontSize:11, fill:'#98A2B3' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={fmtShort} tick={{ fontSize:11, fill:'#98A2B3' }} axisLine={false} tickLine={false} width={48} />
                  <Tooltip
                    formatter={(v) => [fmt(v), t.totalSales]}
                    contentStyle={{ fontSize:12, borderRadius:10, border:'1px solid var(--border)', boxShadow:'var(--shadow-sm)', fontFamily:'var(--mono)' }}
                  />
                  <Area type="monotone" dataKey="sales" stroke="#0F766E" strokeWidth={2.5} fill="url(#sg)" dot={false} activeDot={{ r:4, fill:'#0F766E' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Bottom row: top products + payment pie */}
          <div style={S.row2}>
            {/* Top products */}
            <div style={S.card}>
              <div style={S.cardTitle}>{t.topProducts}</div>
              {data.topProducts.length === 0 ? (
                <div style={S.noData}>{t.noData}</div>
              ) : data.topProducts.map((p, i) => (
                <div key={p.id} style={{ ...S.topItem, borderBottom: i===data.topProducts.length-1?'none':'0.5px solid rgba(0,0,0,0.06)' }}>
                  <span style={S.topRank}>{i+1}</span>
                  {getProductImageSrc(p.image) ? (
                    <img src={getProductImageSrc(p.image)} alt={p.name} style={S.topThumb} />
                  ) : (
                    <div style={S.topThumb} />
                  )}
                  <div style={S.topInfo}>
                    <div style={S.topName}>{p.name}</div>
                    <div style={S.topSub}>{p.qty} {t.qty}</div>
                  </div>
                  <div style={S.topRev}>{fmt(p.revenue)}</div>
                </div>
              ))}
            </div>

            {/* Payment method pie */}
            <div style={S.card}>
              <div style={S.cardTitle}>{t.paymentBreak}</div>
              {pieData.length === 0 ? (
                <div style={S.noData}>{t.noData}</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="45%" outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => fmt(v)} contentStyle={{ fontSize:12, borderRadius:10, border:'1px solid var(--border)', boxShadow:'var(--shadow-sm)' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
