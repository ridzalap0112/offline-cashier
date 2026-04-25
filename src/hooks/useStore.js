import { create } from 'zustand';

// ─── Language store ───────────────────────────────────────────────────────────
export const useLang = create((set) => ({
  lang: localStorage.getItem('kasir_lang') || 'id',
  setLang: (l) => {
    localStorage.setItem('kasir_lang', l);
    set({ lang: l });
  },
}));

// ─── App page store ───────────────────────────────────────────────────────────
export const usePage = create((set) => ({
  page: 'pos', // 'pos' | 'report' | 'products'
  setPage: (p) => set({ page: p }),
}));

// ─── Cart store ───────────────────────────────────────────────────────────────
export const useCart = create((set, get) => ({
  items:       {},   // { [productId]: qty }
  payMethod:   'cash',
  paidAmount:  '',
  lastTxId:    null,

  addItem: (product) => set((s) => {
    const current = s.items[product.id] || 0;
    const next    = Math.min(current + 1, product.stock);
    return { items: { ...s.items, [product.id]: next } };
  }),

  setQty: (productId, qty, maxStock) => set((s) => {
    if (qty <= 0) {
      const { [productId]: _, ...rest } = s.items;
      return { items: rest };
    }
    return { items: { ...s.items, [productId]: Math.min(qty, maxStock) } };
  }),

  setPayMethod:  (m) => set({ payMethod: m, paidAmount: '' }),
  setPaidAmount: (v) => set({ paidAmount: v }),
  addPaid:       (v) => set((s) => ({ paidAmount: String((parseInt(s.paidAmount) || 0) + v) })),

  getTotal: () => {
    const { items } = get();
    return Object.entries(items).reduce((sum, [id, qty]) => {
      const price = get()._priceMap?.[id] || 0;
      return sum + price * qty;
    }, 0);
  },

  // Injected by POS component after products load
  _priceMap: {},
  setPriceMap: (map) => set({ _priceMap: map }),

  clearCart:  () => set({ items: {}, paidAmount: '', lastTxId: null }),
  setLastTxId:(id) => set({ lastTxId: id }),
}));
