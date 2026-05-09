import React, { useState, useEffect, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db.js';
import { LANGS, CATEGORIES, CATEGORY_KEYS } from '../i18n/index.js';
import { useLang, useCart } from '../hooks/useStore.js';
import { saveTransaction } from '../services/index.js';
import { printReceipt } from '../services/printer.js';
import { resolveProductImage } from '../assets/productImages.js';

const fmt = (n) => 'Rp ' + Math.round(n).toLocaleString('id-ID');

const getCheckoutErrorMessage = (error) => {
  switch (error?.code) {
    case 'EMPTY_CART':
    case 'INVALID_PRODUCT':
    case 'INVALID_QTY':
    case 'INVALID_PAYMENT_METHOD':
    case 'INVALID_CASHIER':
    case 'INSUFFICIENT_PAYMENT':
    case 'INSUFFICIENT_STOCK':
    case 'PRODUCT_NOT_FOUND':
      return error.message;
    default:
      return 'Transaksi gagal disimpan. Coba lagi.';
  }
};

const S = {
  root: { display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 380px', height: '100%', overflow: 'hidden', background: 'var(--bg)' },
  left: { display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  searchBar: { margin: '20px 24px 10px', padding: 14, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', display: 'flex', gap: 10, boxShadow: 'var(--shadow-sm)' },
  input: { flex: 1, padding: '12px 14px', border: '1px solid var(--border-md)', borderRadius: 8, fontSize: 14, background: '#fff', outline: 'none', fontFamily: 'inherit', color: 'var(--text)' },
  catScroll: { display: 'flex', gap: 8, overflowX: 'auto', margin: '0 24px', padding: 12, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', scrollbarWidth: 'none', boxShadow: 'var(--shadow-sm)' },
  pill: { padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border-md)', background: '#fff', fontSize: 13, cursor: 'pointer', color: 'var(--text-2)', whiteSpace: 'nowrap', transition: 'all .14s', fontFamily: 'inherit', fontWeight: 600 },
  pillA: { background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)', boxShadow: '0 8px 18px rgba(15,118,110,0.18)' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(178px,1fr))', gap: 16, padding: '18px 24px 24px', overflowY: 'auto', alignContent: 'start' },
  card: { background: 'linear-gradient(180deg,#FFFFFF 0%,#FCFCFD 100%)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 16, cursor: 'pointer', transition: 'transform .14s, box-shadow .14s, border-color .14s', position: 'relative', userSelect: 'none', boxShadow: 'var(--shadow-sm)' },
  cardLow: { borderColor: '#FDBA74', background: 'linear-gradient(180deg,#FFFFFF 0%,var(--amber-l) 100%)' },
  thumb: { width: 62, height: 62, borderRadius: 10, objectFit: 'cover', display: 'block', background: 'var(--surface2)', border: '1px solid var(--border)', marginBottom: 14 },
  thumbSmall: { width: 42, height: 42, borderRadius: 10, objectFit: 'cover', display: 'block', background: 'var(--surface2)', border: '1px solid var(--border)' },
  name: { fontSize: 14, fontWeight: 700, lineHeight: 1.35, marginBottom: 7, color: 'var(--text)' },
  price: { fontSize: 13, fontFamily: 'var(--mono)', color: 'var(--accent-txt)', fontWeight: 700 },
  stockTxt: { fontSize: 12, color: 'var(--text-2)', marginTop: 7 },
  stockWarn: { color: 'var(--amber)', fontWeight: 700 },
  badge: { position: 'absolute', top: 12, right: 12, background: 'var(--indigo)', color: '#fff', fontSize: 11, minWidth: 22, height: 22, padding: '0 6px', borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontFamily: 'var(--mono)', boxShadow: '0 8px 18px rgba(79,70,229,0.22)' },
  cart: { margin: '20px 20px 20px 0', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: 'var(--shadow-md)' },
  cartHead: { padding: '18px 20px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(135deg,#FFFFFF 0%,var(--indigo-l) 100%)' },
  cartTitle: { fontSize: 16, fontWeight: 800, color: 'var(--text)' },
  countBadge: { fontSize: 12, background: '#fff', color: 'var(--text-2)', padding: '4px 10px', borderRadius: 999, fontWeight: 700, border: '1px solid var(--border)' },
  cartItems: { flex: 1, overflowY: 'auto' },
  empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#667085', fontSize: 14, gap: 8, padding: 24, textAlign: 'center' },
  emptyBox: { width: 46, height: 46, border: '1px solid var(--border-md)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, marginBottom: 4, background: 'var(--surface2)', color: 'var(--text-2)', fontWeight: 700 },
  ci: { margin: '10px 12px 0', padding: 12, display: 'flex', alignItems: 'center', gap: 12, border: '1px solid var(--border)', borderRadius: 10, background: '#fff', boxShadow: 'var(--shadow-sm)' },
  ciInfo: { flex: 1, minWidth: 0 },
  ciName: { fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#101828' },
  ciPrice: { fontSize: 12, color: '#667085', fontFamily: 'var(--mono)', marginTop: 2 },
  ciCtrl: { display: 'flex', alignItems: 'center', gap: 6 },
  qBtn: { width: 28, height: 28, borderRadius: 7, border: '1px solid #D0D5DD', background: '#fff', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#101828', lineHeight: 1, transition: 'all .12s', fontFamily: 'inherit' },
  qNum: { fontSize: 13, fontWeight: 700, fontFamily: 'var(--mono)', minWidth: 20, textAlign: 'center' },
  ciSub: { fontSize: 13, fontFamily: 'var(--mono)', fontWeight: 600, minWidth: 72, textAlign: 'right', color: '#101828' },
  footer: { borderTop: '1px solid #EAECF0', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10, background: '#fff' },
  sumRow: { display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#475467' },
  sumTotal: { fontSize: 18, fontWeight: 700, color: '#101828', fontFamily: 'var(--mono)' },
  divider: { border: 'none', borderTop: '1px solid #EAECF0' },
  payGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 },
  payBtn: { padding: '9px 6px', border: '1px solid #D0D5DD', borderRadius: 8, background: '#fff', fontSize: 12, cursor: 'pointer', color: '#475467', transition: 'all .13s', fontWeight: 600, fontFamily: 'inherit' },
  payBtnA: { background: 'var(--accent-l)', borderColor: 'var(--accent)', color: 'var(--accent-txt)' },
  cashRow: { display: 'flex', alignItems: 'center', gap: 10 },
  cashLbl: { fontSize: 13, color: '#475467', whiteSpace: 'nowrap', fontWeight: 500 },
  cashIn: { flex: 1, padding: '10px 12px', border: '1px solid #D0D5DD', borderRadius: 8, fontFamily: 'var(--mono)', fontSize: 14, color: '#101828', background: '#fff', outline: 'none' },
  numpad: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 },
  npBtn: { padding: '9px 6px', border: '1px solid #D0D5DD', borderRadius: 8, background: '#F9FAFB', fontSize: 13, cursor: 'pointer', color: '#101828', transition: 'background .1s', fontFamily: 'inherit', fontWeight: 500 },
  changeRow: { display: 'flex', justifyContent: 'space-between', fontSize: 14, fontFamily: 'var(--mono)' },
  changePos: { fontWeight: 700, color: '#155E3B' },
  changeNeg: { fontWeight: 600, color: '#C0392B' },
  btnRow: { display: 'flex', gap: 8 },
  clearBtn: { padding: '11px 12px', borderRadius: 8, border: '1px solid #D0D5DD', background: '#fff', fontSize: 13, cursor: 'pointer', color: '#475467', transition: 'all .13s', fontFamily: 'inherit', fontWeight: 600 },
  checkBtn: { flex: 1, padding: '13px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,var(--accent) 0%,#0E7490 100%)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'all .14s', letterSpacing: 0, fontFamily: 'inherit', boxShadow: '0 10px 22px rgba(15,118,110,0.22)' },
  checkDis: { background: '#EAECF0', color: '#98A2B3', cursor: 'not-allowed' },
  printBtn: { padding: '11px 12px', borderRadius: 8, border: '1px solid var(--accent)', background: '#fff', fontSize: 13, cursor: 'pointer', color: 'var(--accent-txt)', transition: 'all .13s', fontFamily: 'inherit', fontWeight: 600 },
  toast: { position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', background: 'var(--accent)', color: '#fff', padding: '11px 18px', borderRadius: 8, fontSize: 14, fontWeight: 600, pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 20, transition: 'opacity .3s', boxShadow: 'var(--shadow-md)' },
};

export default function POS() {
  const { lang } = useLang();
  const t = LANGS[lang];
  const cats = CATEGORIES[lang];
  const cart = useCart();
  const [activeCat, setActiveCat] = useState(0);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState({ msg: '', show: false });
  const [printStatus, setPrintStatus] = useState('');
  const [lastTx, setLastTx] = useState(null);

  const products = useLiveQuery(() => db.products.orderBy('name').toArray(), []);

  useEffect(() => {
    if (!products) return;
    const map = {};
    products.forEach((product) => { map[product.id] = product.price; });
    cart.setPriceMap(map);
  }, [products]);

  const filtered = (products || []).filter((product) => {
    const matchSearch = product.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCat === 0 || product.category === CATEGORY_KEYS[activeCat];
    return matchSearch && matchCat;
  });

  const total = Object.entries(cart.items).reduce((sum, [id, qty]) => {
    const product = (products || []).find((item) => item.id === Number(id));
    return sum + (product ? product.price * qty : 0);
  }, 0);

  const paid = parseInt(cart.paidAmount, 10) || 0;
  const change = paid - total;
  const count = Object.values(cart.items).reduce((sum, qty) => sum + qty, 0);

  const showToast = useCallback((msg) => {
    setToast({ msg, show: true });
    setTimeout(() => setToast({ msg: '', show: false }), 2200);
  }, []);

  const handleCheckout = async () => {
    if (!products) return;

    const items = Object.entries(cart.items).map(([id, qty]) => {
      const product = products.find((entry) => entry.id === Number(id));
      return product ? { productId: product.id, qty } : null;
    }).filter(Boolean);

    if (!items.length) {
      showToast('Keranjang masih kosong.');
      return;
    }

    try {
      const result = await saveTransaction({
        items,
        paid: cart.payMethod === 'cash' ? paid : total,
        paymentMethod: cart.payMethod,
        cashierId: 1,
      });

      setLastTx({
        txId: result.txId,
        items: result.items.map((item) => ({
          productId: item.productId,
          name: item.productName,
          image: item.image,
          qty: item.qty,
          price: item.price,
          subtotal: item.subtotal,
        })),
        total: result.total,
        paid: result.paid,
        change: result.change,
        paymentMethod: result.paymentMethod,
      });

      cart.clearCart();
      showToast(t.successMsg);
    } catch (error) {
      console.error(error);
      showToast(getCheckoutErrorMessage(error));
    }
  };

  const handlePrint = async () => {
    if (!lastTx) return;
    setPrintStatus(t.connecting);

    try {
      await printReceipt({
        storeName: 'Ridzal POS',
        address: 'Jl. Sudirman No. 12',
        items: lastTx.items,
        total: lastTx.total,
        paid: lastTx.paid,
        change: lastTx.change,
        paymentMethod: lastTx.paymentMethod,
        txId: lastTx.txId,
        cashier: 'Budi',
        lang,
      });
      setPrintStatus(t.printOk);
    } catch (error) {
      if (error.message === 'NO_BLUETOOTH') setPrintStatus(t.noBluetooth);
      else setPrintStatus(t.printFail);
    }

    setTimeout(() => setPrintStatus(''), 3000);
  };

  const payKeys = ['cash', 'qris', 'debt'];
  const payLabels = [t.cash, t.qris, t.debt];
  const quickAmts = [5000, 10000, 20000, 50000, 100000, 200000];

  return (
    <div className="relative grid h-full grid-cols-[minmax(0,1fr)_420px] gap-5 overflow-hidden bg-[var(--bg)] px-6 pb-6 pt-5">
      {toast.show && (
        <div className="pointer-events-none absolute left-1/2 top-4 z-20 -translate-x-1/2 rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white shadow-[var(--shadow-md)]">
          {toast.msg}
        </div>
      )}

      <main className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[rgba(255,253,248,0.48)] shadow-[var(--shadow-sm)]">
        <div className="border-b border-[var(--border)] bg-white/60 p-4">
          <input
            className="h-14 w-full rounded-xl border border-[var(--border-md)] bg-white px-5 text-[15px] font-semibold text-[var(--text)] outline-none transition placeholder:font-medium placeholder:text-[var(--text-3)] focus:border-[var(--accent)] focus:ring-4 focus:ring-[rgba(139,94,52,0.12)]"
            placeholder={t.search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex gap-2 overflow-x-auto border-b border-[var(--border)] bg-[rgba(255,253,248,0.78)] px-4 py-3 pos-scrollbar">
          {cats.map((category, i) => (
            <button
              key={i}
              className={`whitespace-nowrap rounded-lg border px-4 py-2.5 text-sm font-bold transition ${
                activeCat === i
                  ? 'border-[var(--accent)] bg-[var(--accent)] text-white shadow-[0_10px_20px_rgba(139,94,52,0.2)]'
                  : 'border-[var(--border)] bg-white text-[var(--text-2)] hover:border-[var(--border-md)] hover:text-[var(--text)]'
              }`}
              onClick={() => setActiveCat(i)}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="grid flex-1 auto-rows-min grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-5 overflow-y-auto p-5 pos-scrollbar">
          {filtered.map((product) => {
            const inCart = cart.items[product.id] || 0;
            const low = product.stock <= (product.minStock || 5);
            const image = resolveProductImage(product);
            return (
              <button
                key={product.id}
                className={`group relative min-h-[236px] rounded-2xl border p-5 text-left shadow-[var(--shadow-sm)] transition hover:-translate-y-0.5 hover:border-[var(--accent)] hover:shadow-[var(--shadow-md)] ${
                  low
                    ? 'border-[#D89745] bg-[linear-gradient(180deg,#FFFDF8_0%,#FFF4DC_100%)]'
                    : 'border-[var(--border)] bg-[rgba(255,253,248,0.92)]'
                }`}
                onClick={() => cart.addItem(product)}
              >
                {inCart > 0 && (
                  <span className="absolute right-4 top-4 flex h-7 min-w-7 items-center justify-center rounded-full bg-[var(--accent)] px-2 font-mono text-xs font-bold text-white shadow-[0_10px_20px_rgba(139,94,52,0.22)]">
                    {inCart}
                  </span>
                )}
                <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl border border-[var(--border)] bg-white shadow-[var(--shadow-sm)]">
                  {image.src ? (
                    <img src={image.src} alt={product.name} className="h-[68px] w-[68px] rounded-xl object-contain" />
                  ) : (
                    <div className="h-[68px] w-[68px] rounded-xl bg-[var(--surface2)]" />
                  )}
                </div>
                <div className="line-clamp-2 min-h-[44px] text-base font-extrabold leading-snug text-[var(--text)]">{product.name}</div>
                <div className="mt-3 font-mono text-[15px] font-bold text-[var(--accent-txt)]">{fmt(product.price)}</div>
                <div className={`mt-3 text-sm font-bold ${low ? 'text-[var(--amber)]' : 'text-[var(--text-2)]'}`}>
                  {t.stock}: {product.stock}{low ? ` - ${t.lowStock}` : ''}
                </div>
              </button>
            );
          })}

          {filtered.length === 0 && (
            <div className="col-span-full rounded-xl border border-dashed border-[var(--border-md)] bg-white/50 p-10 text-center text-sm font-semibold text-[var(--text-3)]">
              -
            </div>
          )}
        </div>
      </main>

      <aside className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-md)]">
        <div className="flex items-center justify-between border-b border-[var(--border)] bg-[linear-gradient(135deg,#FFFDF8_0%,#F0DDC1_100%)] px-6 py-5">
          <span className="font-display text-lg font-extrabold text-[var(--text)]">{t.cartTitle}</span>
          <span className="rounded-full border border-[var(--border)] bg-white px-3 py-1 text-xs font-bold text-[var(--text-2)]">{t.items(count)}</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 pos-scrollbar">
          {count === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-sm font-semibold text-[var(--text-2)]">
              <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--accent-l)] font-mono text-sm font-bold text-[var(--accent-txt)]">0</div>
              <div>{t.emptyCart}</div>
              <div className="text-xs font-medium text-[var(--text-3)]">{t.emptyHint}</div>
            </div>
          ) : (
            Object.entries(cart.items).map(([id, qty]) => {
              const product = (products || []).find((entry) => entry.id === Number(id));
              if (!product) return null;
              const sub = product.price * qty;
              const image = resolveProductImage(product);
              return (
                <div key={id} className="mb-3 grid grid-cols-[44px_minmax(0,1fr)] gap-3 rounded-xl border border-[var(--border)] bg-white p-3 shadow-[var(--shadow-sm)]">
                  {image.src ? (
                    <img src={image.src} alt={product.name} className="h-11 w-11 rounded-lg border border-[var(--border)] object-contain" />
                  ) : (
                    <div className="h-11 w-11 rounded-lg border border-[var(--border)] bg-[var(--surface2)]" />
                  )}
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-[var(--text)]">{product.name}</div>
                    <div className="mt-1 font-mono text-xs font-medium text-[var(--text-2)]">{fmt(product.price)} x {qty}</div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <button className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)] bg-white text-lg leading-none text-[var(--text)] transition hover:bg-[var(--accent-l)]" onClick={() => cart.setQty(Number(id), qty - 1, product.stock)}>-</button>
                        <span className="min-w-5 text-center font-mono text-sm font-bold">{qty}</span>
                        <button className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)] bg-white text-lg leading-none text-[var(--text)] transition hover:bg-[var(--accent-l)]" onClick={() => cart.setQty(Number(id), qty + 1, product.stock)}>+</button>
                      </div>
                      <div className="font-mono text-sm font-bold text-[var(--text)]">{fmt(sub)}</div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="border-t border-[var(--border)] bg-white px-6 py-5">
          <div className="flex justify-between text-sm font-semibold text-[var(--text-2)]"><span>{t.subtotal}</span><span className="font-mono">{fmt(total)}</span></div>
          <div className="my-3 h-px bg-[var(--border)]" />
          <div className="flex justify-between text-lg font-extrabold text-[var(--text)]"><span>{t.total}</span><span className="font-mono">{fmt(total)}</span></div>

          <div className="mt-5 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--text-3)]">{t.payment}</div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {payKeys.map((key, i) => (
              <button
                key={key}
                className={`rounded-lg border px-2 py-3 text-sm font-bold transition ${
                  cart.payMethod === key
                    ? 'border-[var(--accent)] bg-[var(--accent-l)] text-[var(--accent-txt)]'
                    : 'border-[var(--border)] bg-white text-[var(--text-2)] hover:border-[var(--border-md)]'
                }`}
                onClick={() => cart.setPayMethod(key)}
              >
                {payLabels[i]}
              </button>
            ))}
          </div>

          {cart.payMethod === 'cash' && (
            <>
              <div className="mt-3 flex items-center gap-3">
                <span className="whitespace-nowrap text-sm font-semibold text-[var(--text-2)]">{t.paid}</span>
                <input
                  type="number"
                  className="h-12 min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-white px-3 font-mono text-sm text-[var(--text)] outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[rgba(139,94,52,0.12)]"
                  placeholder="0"
                  value={cart.paidAmount}
                  onChange={(e) => cart.setPaidAmount(e.target.value)}
                />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {quickAmts.map((value) => (
                  <button key={value} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-3 text-sm font-bold text-[var(--text)] transition hover:bg-[var(--accent-l)]" onClick={() => cart.addPaid(value)}>
                    {(value / 1000).toFixed(0)}rb
                  </button>
                ))}
                <button className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-3 text-sm font-bold text-[var(--text)] transition hover:bg-[var(--accent-l)]" onClick={() => cart.setPaidAmount(String(total))}>={fmt(total).replace('Rp ', '')}</button>
                <button className="rounded-lg border border-[var(--border)] bg-white px-2 py-3 text-sm font-bold text-[var(--danger)] transition hover:bg-[var(--danger-l)]" onClick={() => cart.setPaidAmount('')}>C</button>
                <button className="rounded-lg border border-[var(--border)] bg-white px-2 py-3 text-sm font-bold text-[var(--danger)] transition hover:bg-[var(--danger-l)]" onClick={() => cart.setPaidAmount(String(Math.floor((parseInt(cart.paidAmount, 10) || 0) / 10)))}>Del</button>
              </div>
              {cart.paidAmount && (
                <div className="mt-3 flex justify-between font-mono text-sm">
                  <span>{change >= 0 ? t.change : t.short}</span>
                  <span className={change >= 0 ? 'font-bold text-[var(--accent-txt)]' : 'font-bold text-[var(--danger)]'}>{fmt(Math.abs(change))}</span>
                </div>
              )}
            </>
          )}

          {printStatus && <div className="mt-3 text-center text-xs font-bold text-[var(--accent-txt)]">{printStatus}</div>}

          <div className="mt-4 flex gap-2">
            <button className="rounded-lg border border-[var(--border)] bg-white px-4 py-3.5 text-sm font-bold text-[var(--text-2)] transition hover:bg-[var(--surface)] disabled:cursor-not-allowed disabled:opacity-50" onClick={cart.clearCart} disabled={!count}>{t.clear}</button>
            {lastTx && <button className="rounded-lg border border-[var(--accent)] bg-white px-4 py-3.5 text-sm font-bold text-[var(--accent-txt)] transition hover:bg-[var(--accent-l)]" onClick={handlePrint}>{t.printReceipt}</button>}
            <button
              className="flex-1 rounded-lg bg-[var(--accent)] px-4 py-3.5 text-sm font-extrabold text-white shadow-[0_14px_24px_rgba(139,94,52,0.24)] transition hover:bg-[var(--accent-txt)] disabled:cursor-not-allowed disabled:bg-[var(--surface2)] disabled:text-[var(--text-3)] disabled:shadow-none"
              onClick={handleCheckout}
              disabled={!count || (cart.payMethod === 'cash' && paid < total)}
            >
              {t.checkout}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
