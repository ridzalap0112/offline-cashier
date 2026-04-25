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
  root: { display: 'grid', gridTemplateColumns: '1fr 300px', height: '100%', overflow: 'hidden' },
  left: { display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  searchBar: { padding: '10px 14px', background: '#fff', borderBottom: '0.5px solid rgba(0,0,0,0.08)', display: 'flex', gap: 8 },
  input: { flex: 1, padding: '7px 12px', border: '0.5px solid rgba(0,0,0,0.14)', borderRadius: 8, fontSize: 13, background: '#F5F3EE', outline: 'none', fontFamily: 'inherit' },
  catScroll: { display: 'flex', gap: 6, overflowX: 'auto', padding: '8px 14px', background: '#fff', borderBottom: '0.5px solid rgba(0,0,0,0.08)', scrollbarWidth: 'none' },
  pill: { padding: '5px 12px', borderRadius: 99, border: '0.5px solid rgba(0,0,0,0.14)', background: 'transparent', fontSize: 12, cursor: 'pointer', color: '#6B6860', whiteSpace: 'nowrap', transition: 'all .14s', fontFamily: 'inherit' },
  pillA: { background: '#1A6B45', color: '#fff', borderColor: '#1A6B45' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: 10, padding: '12px 14px', overflowY: 'auto', alignContent: 'start' },
  card: { background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 10, padding: 12, cursor: 'pointer', transition: 'all .13s', position: 'relative', userSelect: 'none' },
  cardLow: { borderColor: '#F59E0B' },
  thumb: { width: 52, height: 52, borderRadius: 14, objectFit: 'cover', display: 'block', background: '#F0EDE6', border: '0.5px solid rgba(0,0,0,0.08)', marginBottom: 8 },
  thumbSmall: { width: 34, height: 34, borderRadius: 10, objectFit: 'cover', display: 'block', background: '#F0EDE6', border: '0.5px solid rgba(0,0,0,0.08)' },
  name: { fontSize: 13, fontWeight: 500, lineHeight: 1.3, marginBottom: 4 },
  price: { fontSize: 12, fontFamily: 'DM Mono,monospace', color: '#1A6B45', fontWeight: 500 },
  stockTxt: { fontSize: 11, color: '#9E9C97', marginTop: 3 },
  stockWarn: { color: '#B45309', fontWeight: 500 },
  badge: { position: 'absolute', top: 7, right: 7, background: '#1A6B45', color: '#fff', fontSize: 10, width: 18, height: 18, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontFamily: 'DM Mono,monospace' },
  cart: { background: '#fff', borderLeft: '0.5px solid rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  cartHead: { padding: '12px 14px 10px', borderBottom: '0.5px solid rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  cartTitle: { fontSize: 14, fontWeight: 600 },
  countBadge: { fontSize: 11, background: '#F0EDE6', color: '#6B6860', padding: '2px 8px', borderRadius: 99 },
  cartItems: { flex: 1, overflowY: 'auto' },
  empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9E9C97', fontSize: 13, gap: 6 },
  emptyBox: { width: 36, height: 36, border: '1.5px dashed rgba(0,0,0,0.14)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, marginBottom: 4, background: '#F5F3EE' },
  ci: { padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 10 },
  ciInfo: { flex: 1, minWidth: 0 },
  ciName: { fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  ciPrice: { fontSize: 11, color: '#9E9C97', fontFamily: 'DM Mono,monospace' },
  ciCtrl: { display: 'flex', alignItems: 'center', gap: 5 },
  qBtn: { width: 22, height: 22, borderRadius: 6, border: '0.5px solid rgba(0,0,0,0.14)', background: '#F5F3EE', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1A1916', lineHeight: 1, transition: 'all .12s', fontFamily: 'inherit' },
  qNum: { fontSize: 13, fontWeight: 600, fontFamily: 'DM Mono,monospace', minWidth: 18, textAlign: 'center' },
  ciSub: { fontSize: 12, fontFamily: 'DM Mono,monospace', fontWeight: 500, minWidth: 60, textAlign: 'right' },
  footer: { borderTop: '0.5px solid rgba(0,0,0,0.08)', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 7 },
  sumRow: { display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6B6860' },
  sumTotal: { fontSize: 16, fontWeight: 600, color: '#1A1916', fontFamily: 'DM Mono,monospace' },
  divider: { border: 'none', borderTop: '0.5px solid rgba(0,0,0,0.08)' },
  payGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 5 },
  payBtn: { padding: '6px 4px', border: '0.5px solid rgba(0,0,0,0.14)', borderRadius: 7, background: 'transparent', fontSize: 11, cursor: 'pointer', color: '#6B6860', transition: 'all .13s', fontWeight: 500, fontFamily: 'inherit' },
  payBtnA: { background: '#E8F4EE', borderColor: '#1A6B45', color: '#0F4A30' },
  cashRow: { display: 'flex', alignItems: 'center', gap: 8 },
  cashLbl: { fontSize: 12, color: '#6B6860', whiteSpace: 'nowrap' },
  cashIn: { flex: 1, padding: '7px 10px', border: '0.5px solid rgba(0,0,0,0.14)', borderRadius: 7, fontFamily: 'DM Mono,monospace', fontSize: 13, color: '#1A1916', background: '#F5F3EE', outline: 'none' },
  numpad: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 4 },
  npBtn: { padding: '7px 4px', border: '0.5px solid rgba(0,0,0,0.14)', borderRadius: 7, background: '#F5F3EE', fontSize: 12, cursor: 'pointer', color: '#1A1916', transition: 'background .1s', fontFamily: 'inherit' },
  changeRow: { display: 'flex', justifyContent: 'space-between', fontSize: 13, fontFamily: 'DM Mono,monospace' },
  changePos: { fontWeight: 600, color: '#1A6B45' },
  changeNeg: { fontWeight: 600, color: '#C0392B' },
  btnRow: { display: 'flex', gap: 6 },
  clearBtn: { padding: '9px 10px', borderRadius: 10, border: '0.5px solid rgba(0,0,0,0.14)', background: 'transparent', fontSize: 12, cursor: 'pointer', color: '#6B6860', transition: 'all .13s', fontFamily: 'inherit' },
  checkBtn: { flex: 1, padding: '11px', borderRadius: 10, border: 'none', background: '#1A6B45', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all .14s', letterSpacing: '-0.2px', fontFamily: 'inherit' },
  checkDis: { background: 'rgba(0,0,0,0.1)', color: '#9E9C97', cursor: 'not-allowed' },
  printBtn: { padding: '8px 10px', borderRadius: 10, border: '0.5px solid rgba(0,0,0,0.14)', background: 'transparent', fontSize: 12, cursor: 'pointer', color: '#1A6B45', transition: 'all .13s', fontFamily: 'inherit', fontWeight: 500 },
  toast: { position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', background: '#1A6B45', color: '#fff', padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 500, pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 20, transition: 'opacity .3s' },
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
        storeName: 'Warung Maju Jaya',
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
    <div style={{ ...S.root, position: 'relative' }}>
      {toast.show && <div style={{ ...S.toast, opacity: toast.show ? 1 : 0 }}>{toast.msg}</div>}

      <div style={S.left}>
        <div style={S.searchBar}>
          <input
            style={S.input}
            placeholder={t.search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ ...S.catScroll, WebkitOverflowScrolling: 'touch' }}>
          {cats.map((category, i) => (
            <button
              key={i}
              style={{ ...S.pill, ...(activeCat === i ? S.pillA : {}) }}
              onClick={() => setActiveCat(i)}
            >
              {category}
            </button>
          ))}
        </div>

        <div style={S.grid}>
          {filtered.map((product) => {
            const inCart = cart.items[product.id] || 0;
            const low = product.stock <= (product.minStock || 5);
            const image = resolveProductImage(product);
            return (
              <div
                key={product.id}
                style={{ ...S.card, ...(low ? S.cardLow : {}) }}
                onClick={() => cart.addItem(product)}
                onMouseEnter={(e) => Object.assign(e.currentTarget.style, { borderColor: '#1A6B45' })}
                onMouseLeave={(e) => Object.assign(e.currentTarget.style, { borderColor: low ? '#F59E0B' : 'rgba(0,0,0,0.08)' })}
              >
                {inCart > 0 && <div style={S.badge}>{inCart}</div>}
                {image.src ? <img src={image.src} alt={product.name} style={S.thumb} /> : <div style={S.thumb} />}
                <div style={S.name}>{product.name}</div>
                <div style={S.price}>{fmt(product.price)}</div>
                <div style={{ ...S.stockTxt, ...(low ? S.stockWarn : {}) }}>
                  {t.stock}: {product.stock}{low ? ` · ${t.lowStock}` : ''}
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#9E9C97', padding: '2rem', fontSize: 13 }}>-</div>
          )}
        </div>
      </div>

      <div style={S.cart}>
        <div style={S.cartHead}>
          <span style={S.cartTitle}>{t.cartTitle}</span>
          <span style={S.countBadge}>{t.items(count)}</span>
        </div>

        <div style={S.cartItems}>
          {count === 0 ? (
            <div style={S.empty}>
              <div style={S.emptyBox}>Cart</div>
              <div>{t.emptyCart}</div>
              <div style={{ fontSize: 11, color: '#9E9C97' }}>{t.emptyHint}</div>
            </div>
          ) : (
            Object.entries(cart.items).map(([id, qty]) => {
              const product = (products || []).find((entry) => entry.id === Number(id));
              if (!product) return null;
              const sub = product.price * qty;
              const image = resolveProductImage(product);
              return (
                <div key={id} style={S.ci}>
                  {image.src ? <img src={image.src} alt={product.name} style={S.thumbSmall} /> : <div style={S.thumbSmall} />}
                  <div style={S.ciInfo}>
                    <div style={S.ciName}>{product.name}</div>
                    <div style={S.ciPrice}>{fmt(product.price)} x {qty}</div>
                  </div>
                  <div style={S.ciCtrl}>
                    <button style={S.qBtn} onClick={() => cart.setQty(Number(id), qty - 1, product.stock)}>-</button>
                    <span style={S.qNum}>{qty}</span>
                    <button style={S.qBtn} onClick={() => cart.setQty(Number(id), qty + 1, product.stock)}>+</button>
                  </div>
                  <div style={S.ciSub}>{fmt(sub)}</div>
                </div>
              );
            })
          )}
        </div>

        <div style={S.footer}>
          <div style={S.sumRow}><span>{t.subtotal}</span><span style={{ fontFamily: 'DM Mono,monospace' }}>{fmt(total)}</span></div>
          <hr style={S.divider} />
          <div style={{ ...S.sumRow, ...S.sumTotal }}><span>{t.total}</span><span>{fmt(total)}</span></div>

          <div style={{ fontSize: 11, color: '#6B6860', fontWeight: 500 }}>{t.payment}</div>
          <div style={S.payGrid}>
            {payKeys.map((key, i) => (
              <button
                key={key}
                style={{ ...S.payBtn, ...(cart.payMethod === key ? S.payBtnA : {}) }}
                onClick={() => cart.setPayMethod(key)}
              >
                {payLabels[i]}
              </button>
            ))}
          </div>

          {cart.payMethod === 'cash' && (
            <>
              <div style={S.cashRow}>
                <span style={S.cashLbl}>{t.paid}</span>
                <input
                  type="number"
                  style={S.cashIn}
                  placeholder="0"
                  value={cart.paidAmount}
                  onChange={(e) => cart.setPaidAmount(e.target.value)}
                />
              </div>
              <div style={S.numpad}>
                {quickAmts.map((value) => (
                  <button key={value} style={S.npBtn} onClick={() => cart.addPaid(value)}>
                    {(value / 1000).toFixed(0)}rb
                  </button>
                ))}
                <button style={S.npBtn} onClick={() => cart.setPaidAmount(String(total))}>={fmt(total).replace('Rp ', '')}</button>
                <button style={{ ...S.npBtn, color: '#C0392B' }} onClick={() => cart.setPaidAmount('')}>C</button>
                <button style={{ ...S.npBtn, color: '#C0392B' }} onClick={() => cart.setPaidAmount(String(Math.floor((parseInt(cart.paidAmount, 10) || 0) / 10)))}>⌫</button>
              </div>
              {cart.paidAmount && (
                <div style={S.changeRow}>
                  <span>{change >= 0 ? t.change : t.short}</span>
                  <span style={change >= 0 ? S.changePos : S.changeNeg}>{fmt(Math.abs(change))}</span>
                </div>
              )}
            </>
          )}

          {printStatus && <div style={{ fontSize: 11, color: '#1A6B45', textAlign: 'center' }}>{printStatus}</div>}

          <div style={S.btnRow}>
            <button style={S.clearBtn} onClick={cart.clearCart} disabled={!count}>{t.clear}</button>
            {lastTx && <button style={S.printBtn} onClick={handlePrint}>{t.printReceipt}</button>}
            <button
              style={{ ...S.checkBtn, ...((!count || (cart.payMethod === 'cash' && paid < total)) ? S.checkDis : {}) }}
              onClick={handleCheckout}
              disabled={!count || (cart.payMethod === 'cash' && paid < total)}
            >
              {t.checkout}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
