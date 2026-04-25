import { db } from '../db';
import { getDefaultImageFile, normalizeImageFile } from '../assets/productImages.js';

const PAYMENT_METHODS = new Set(['cash', 'qris', 'debt']);

const makeError = (code, message, meta = {}) => {
  const error = new Error(message);
  error.code = code;
  error.meta = meta;
  return error;
};

const toMoneyInt = (value) => {
  const normalized = Number(value);
  if (!Number.isFinite(normalized)) return 0;
  return Math.max(0, Math.trunc(normalized));
};

const toPositiveInt = (value) => {
  const normalized = Number(value);
  if (!Number.isFinite(normalized)) return 0;
  return Math.trunc(normalized);
};

// ─── Product services ─────────────────────────────────────────────────────────
export const addProduct = (data) =>
  db.products.add({ ...data, stock: data.stock ?? 0, createdAt: Date.now() });

export const updateProduct = (id, data) => db.products.update(id, data);

export const deleteProduct = (id) => db.products.delete(id);

export const findByBarcode = (barcode) =>
  db.products.where('barcode').equals(barcode).first();

// ─── Transaction service ──────────────────────────────────────────────────────
/**
 * Save a full transaction atomically.
 * Reduces stock for each item in the same Dexie transaction.
 */
export const saveTransaction = async ({ items, paid, paymentMethod, cashierId }) => {
  return await db.transaction('rw', db.transactions, db.transactionItems, db.products, async () => {
    if (!Array.isArray(items) || items.length === 0) {
      throw makeError('EMPTY_CART', 'Keranjang masih kosong.');
    }

    if (!PAYMENT_METHODS.has(paymentMethod)) {
      throw makeError('INVALID_PAYMENT_METHOD', 'Metode pembayaran tidak valid.');
    }

    const cashierIdInt = toPositiveInt(cashierId);
    if (cashierIdInt <= 0) {
      throw makeError('INVALID_CASHIER', 'Kasir tidak valid.');
    }

    const qtyByProductId = new Map();
    for (const item of items) {
      const productId = toPositiveInt(item?.productId);
      const qty = toPositiveInt(item?.qty);

      if (productId <= 0) {
        throw makeError('INVALID_PRODUCT', 'Produk pada transaksi tidak valid.');
      }

      if (qty <= 0) {
        throw makeError('INVALID_QTY', 'Jumlah item harus lebih dari 0.', { productId });
      }

      qtyByProductId.set(productId, (qtyByProductId.get(productId) || 0) + qty);
    }

    const productIds = [...qtyByProductId.keys()];
    const products = await db.products.where('id').anyOf(productIds).toArray();
    const productMap = new Map(products.map((product) => [product.id, product]));

    if (products.length !== productIds.length) {
      const missingId = productIds.find((id) => !productMap.has(id));
      throw makeError('PRODUCT_NOT_FOUND', 'Ada produk yang sudah tidak tersedia.', { productId: missingId });
    }

    const resolvedItems = productIds.map((productId) => {
      const product = productMap.get(productId);
      const qty = qtyByProductId.get(productId);
      const price = toMoneyInt(product.price);
      const cost = toMoneyInt(product.cost);

      if (product.stock < qty) {
        throw makeError(
          'INSUFFICIENT_STOCK',
          `Stok ${product.name} tidak cukup. Sisa ${product.stock}.`,
          { productId, availableStock: product.stock, requestedQty: qty }
        );
      }

      return {
        productId,
        productName: product.name,
        barcode: product.barcode || '',
        image: normalizeImageFile(product.image) || getDefaultImageFile(product.name),
        qty,
        price,
        cost,
        subtotal: price * qty,
      };
    });

    const total = resolvedItems.reduce((sum, item) => sum + item.subtotal, 0);
    const normalizedPaid = paymentMethod === 'cash' ? toMoneyInt(paid) : total;

    if (paymentMethod === 'cash' && normalizedPaid < total) {
      throw makeError('INSUFFICIENT_PAYMENT', 'Uang bayar kurang dari total transaksi.', {
        total,
        paid: normalizedPaid,
      });
    }

    const change = paymentMethod === 'cash' ? normalizedPaid - total : 0;

    const txId = await db.transactions.add({
      createdAt: Date.now(),
      total,
      paid: normalizedPaid,
      change,
      paymentMethod,
      cashierId: cashierIdInt,
      status: 'done',
    });

    await db.transactionItems.bulkAdd(
      resolvedItems.map((item) => ({
        transactionId: txId,
        productId: item.productId,
        productName: item.productName,
        barcode: item.barcode,
        image: item.image,
        qty: item.qty,
        price: item.price,
        cost: item.cost,
        subtotal: item.subtotal,
      }))
    );

    for (const item of resolvedItems) {
      await db.products.update(item.productId, {
        stock: productMap.get(item.productId).stock - item.qty,
      });
    }

    return {
      txId,
      total,
      paid: normalizedPaid,
      change,
      paymentMethod,
      cashierId: cashierIdInt,
      items: resolvedItems,
    };
  });
};

// ─── Report service ───────────────────────────────────────────────────────────
export const getReportData = async (startTs, endTs) => {
  const txs = await db.transactions
    .where('createdAt').between(startTs, endTs, true, true)
    .filter((t) => t.status === 'done')
    .toArray();

  if (!txs.length) return { txs: [], totalSales: 0, totalProfit: 0, txCount: 0, avgTx: 0, byMethod: {}, topProducts: [], byDay: [] };

  // Totals
  const totalSales = txs.reduce((s, t) => s + t.total, 0);

  // Payment method breakdown
  const byMethod = txs.reduce((acc, t) => {
    acc[t.paymentMethod] = (acc[t.paymentMethod] || 0) + t.total;
    return acc;
  }, {});

  // Transaction items for profit & top products
  const txIds = txs.map((t) => t.id);
  const allItems = await db.transactionItems
    .where('transactionId').anyOf(txIds)
    .toArray();

  const productIds = [...new Set(allItems.map((i) => i.productId))];
  const products   = await db.products.where('id').anyOf(productIds).toArray();
  const prodMap    = Object.fromEntries(products.map((p) => [p.id, p]));

  let totalProfit = 0;
  const productQty = {};
  const productRev = {};
  const itemSnapshotMap = {};

  allItems.forEach((item) => {
    const p = prodMap[item.productId];
    const itemCost = toMoneyInt(item.cost ?? p?.cost);
    totalProfit += (item.price - itemCost) * item.qty;
    productQty[item.productId] = (productQty[item.productId] || 0) + item.qty;
    productRev[item.productId] = (productRev[item.productId] || 0) + item.subtotal;
    if (!itemSnapshotMap[item.productId]) {
      itemSnapshotMap[item.productId] = {
        name: item.productName,
        image: item.image,
      };
    }
  });

  const topProducts = Object.entries(productQty)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([id, qty]) => ({
      id,
      name:    itemSnapshotMap[id]?.name || prodMap[id]?.name || '?',
      image:   itemSnapshotMap[id]?.image || normalizeImageFile(prodMap[id]?.image) || getDefaultImageFile(prodMap[id]?.name),
      qty,
      revenue: productRev[id] || 0,
    }));

  // Daily aggregation for chart
  const dayMap = {};
  txs.forEach((t) => {
    const d = new Date(t.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    if (!dayMap[key]) dayMap[key] = { date: key, sales: 0, count: 0 };
    dayMap[key].sales += t.total;
    dayMap[key].count += 1;
  });
  const byDay = Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date));

  return {
    txs,
    totalSales,
    totalProfit,
    txCount: txs.length,
    avgTx:   totalSales / txs.length,
    byMethod,
    topProducts,
    byDay,
  };
};
