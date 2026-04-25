import React, { useState, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { LANGS }          from '../i18n/index.js';
import { useLang }        from '../hooks/useStore.js';
import { getReportData }  from '../services/index.js';

const fmt    = (n) => 'Rp ' + Math.round(n).toLocaleString('id-ID');
const fmtShort = (n) => n >= 1_000_000 ? (n/1_000_000).toFixed(1)+'jt' : n >= 1000 ? (n/1000).toFixed(0)+'rb' : String(Math.round(n));

const COLORS = ['#1A6B45','#378ADD','#B45309','#993556'];

const S = {
  root:     { padding:'20px 24px', overflowY:'auto', height:'100%', display:'flex', flexDirection:'column', gap:20 },
  toolbar:  { display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' },
  pageTitle:{ fontSize:18, fontWeight:600, letterSpacing:'-0.4px', flex:1 },
  rangeBtn: { padding:'6px 14px', border:'0.5px solid rgba(0,0,0,0.14)', borderRadius:99, background:'transparent', fontSize:12, cursor:'pointer', color:'#6B6860', fontWeight:500, transition:'all .13s', fontFamily:'inherit' },
  rangeBtnA:{ background:'#1A6B45', color:'#fff', borderColor:'#1A6B45' },
  metrics:  { display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:10 },
  metric:   { background:'#F0EDE6', borderRadius:10, padding:'14px 16px' },
  mLabel:   { fontSize:12, color:'#6B6860', marginBottom:6 },
  mVal:     { fontSize:22, fontWeight:600, letterSpacing:'-0.5px', fontFamily:'DM Mono,monospace', color:'#1A1916' },
  mSub:     { fontSize:11, color:'#9E9C97', marginTop:3 },
  row2:     { display:'grid', gridTemplateColumns:'2fr 1fr', gap:16, minHeight:0 },
  card:     { background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:12, padding:'16px 18px' },
  cardTitle:{ fontSize:13, fontWeight:600, marginBottom:14, color:'#1A1916' },
  topItem:  { display:'flex', alignItems:'center', gap:10, padding:'7px 0', borderBottom:'0.5px solid rgba(0,0,0,0.06)' },
  topRank:  { fontSize:11, color:'#9E9C97', fontFamily:'DM Mono,monospace', minWidth:16 },
  topEmoji: { fontSize:20 },
  topInfo:  { flex:1 },
  topName:  { fontSize:13, fontWeight:500 },
  topSub:   { fontSize:11, color:'#9E9C97', fontFamily:'DM Mono,monospace' },
  topRev:   { fontSize:12, fontFamily:'DM Mono,monospace', fontWeight:500, color:'#1A6B45' },
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
      </div>

      {loading ? (
        <div style={S.noData}>…</div>
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
                      <stop offset="5%"  stopColor="#1A6B45" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#1A6B45" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                  <XAxis dataKey="date" tick={{ fontSize:11, fill:'#9E9C97' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={fmtShort} tick={{ fontSize:11, fill:'#9E9C97' }} axisLine={false} tickLine={false} width={48} />
                  <Tooltip
                    formatter={(v) => [fmt(v), t.totalSales]}
                    contentStyle={{ fontSize:12, borderRadius:8, border:'0.5px solid rgba(0,0,0,0.12)', fontFamily:'DM Mono,monospace' }}
                  />
                  <Area type="monotone" dataKey="sales" stroke="#1A6B45" strokeWidth={2} fill="url(#sg)" dot={false} activeDot={{ r:4 }} />
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
                  <span style={S.topEmoji}>{p.emoji}</span>
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
                    <Tooltip formatter={(v) => fmt(v)} contentStyle={{ fontSize:12, borderRadius:8, border:'0.5px solid rgba(0,0,0,0.12)' }} />
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
