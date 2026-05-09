import { db } from '../db';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const TABLE_MAP = {
  products: 'products',
  transactions: 'transactions',
  transactionItems: 'transaction_items',
};

const toRemotePayload = (tableName, payload, recordId) => {
  const base = {
    local_id: recordId,
    synced_at: new Date().toISOString(),
  };

  if (tableName === 'products') {
    return {
      ...base,
      name: payload.name || '',
      category: payload.category || '',
      barcode: payload.barcode || '',
      image: payload.image || '',
      price: payload.price || 0,
      cost: payload.cost || 0,
      stock: payload.stock || 0,
      min_stock: payload.minStock || 0,
      created_at_local: payload.createdAt || null,
      updated_at_local: payload.updatedAt || null,
    };
  }

  if (tableName === 'transactions') {
    return {
      ...base,
      created_at_local: payload.createdAt || null,
      total: payload.total || 0,
      paid: payload.paid || 0,
      change: payload.change || 0,
      payment_method: payload.paymentMethod || '',
      cashier_id: payload.cashierId || null,
      status: payload.status || '',
    };
  }

  if (tableName === 'transactionItems') {
    return {
      ...base,
      transaction_id_local: payload.transactionId || null,
      product_id_local: payload.productId || null,
      product_name: payload.productName || '',
      barcode: payload.barcode || '',
      image: payload.image || '',
      qty: payload.qty || 0,
      price: payload.price || 0,
      cost: payload.cost || 0,
      subtotal: payload.subtotal || 0,
    };
  }

  return { ...base, ...payload };
};

export const isCloudSyncConfigured = () => Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

const supabaseRequest = async (path, options = {}) => {
  if (!isCloudSyncConfigured()) {
    throw new Error('Supabase belum dikonfigurasi.');
  }

  const response = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Supabase request failed: ${response.status}`);
  }

  return response;
};

export const enqueueSync = async ({ tableName, recordId, operation, payload }) => {
  if (!TABLE_MAP[tableName]) return null;

  return db.syncQueue.add({
    tableName,
    recordId,
    operation,
    payload,
    status: 'pending',
    attempts: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
};

const pushQueueItem = async (item) => {
  const remoteTable = TABLE_MAP[item.tableName];
  const payload = toRemotePayload(item.tableName, item.payload || {}, item.recordId);

  if (item.operation === 'delete') {
    await supabaseRequest(`${remoteTable}?local_id=eq.${encodeURIComponent(item.recordId)}`, {
      method: 'DELETE',
    });
    return;
  }

  await supabaseRequest(`${remoteTable}?on_conflict=local_id`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const syncPendingChanges = async () => {
  if (!isCloudSyncConfigured() || !navigator.onLine) {
    return { synced: 0, failed: 0, skipped: true };
  }

  const items = await db.syncQueue
    .where('status')
    .equals('pending')
    .sortBy('createdAt');

  let synced = 0;
  let failed = 0;

  for (const item of items) {
    try {
      await pushQueueItem(item);
      await db.syncQueue.update(item.id, {
        status: 'synced',
        syncedAt: Date.now(),
        updatedAt: Date.now(),
      });
      synced += 1;
    } catch (error) {
      failed += 1;
      await db.syncQueue.update(item.id, {
        attempts: (item.attempts || 0) + 1,
        lastError: error.message,
        updatedAt: Date.now(),
      });
    }
  }

  return { synced, failed, skipped: false };
};

export const getSyncStatus = async () => {
  const pending = await db.syncQueue.where('status').equals('pending').count();
  const failedItems = await db.syncQueue
    .where('status')
    .equals('pending')
    .filter((item) => Boolean(item.lastError))
    .toArray();

  return {
    configured: isCloudSyncConfigured(),
    online: navigator.onLine,
    pending,
    lastError: failedItems.at(-1)?.lastError || '',
  };
};

export const setupOnlineSync = () => {
  const syncNow = () => {
    syncPendingChanges().catch(() => {});
  };

  window.addEventListener('online', syncNow);
  if (navigator.onLine) syncNow();

  return () => window.removeEventListener('online', syncNow);
};
