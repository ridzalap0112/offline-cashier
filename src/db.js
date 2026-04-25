import Dexie from 'dexie';

export const db = new Dexie('KasirWarungDB');

// ─── Schema version 1 ────────────────────────────────────────────────────────
// Only fields used in WHERE / orderBy need to be listed here.
// All other fields are stored automatically.
db.version(1).stores({
  products:         '++id, name, &barcode, category, stock',
  transactions:     '++id, createdAt, cashierId, status, paymentMethod',
  transactionItems: '++id, transactionId, productId',
  cashiers:         '++id, name, role',
});

// ─── Seed demo data on first run ─────────────────────────────────────────────
db.on('populate', async () => {
  await db.cashiers.bulkAdd([
    { name: 'Budi',  pin: '1234', role: 'cashier' },
    { name: 'Admin', pin: '0000', role: 'admin'   },
  ]);

  await db.products.bulkAdd([
    { name: 'Aqua Botol',    category: 'Minuman',  price: 3000,  cost: 2000, stock: 48,  minStock: 10, barcode: '8992388', emoji: '💧' },
    { name: 'Teh Botol',     category: 'Minuman',  price: 4000,  cost: 2800, stock: 24,  minStock: 6,  barcode: '8990123', emoji: '🍵' },
    { name: 'Kopi Sachet',   category: 'Minuman',  price: 2500,  cost: 1500, stock: 60,  minStock: 10, barcode: '8991111', emoji: '☕' },
    { name: 'Indomie Goreng',category: 'Makanan',  price: 3500,  cost: 2500, stock: 80,  minStock: 20, barcode: '8999999', emoji: '🍜' },
    { name: 'Roti Tawar',    category: 'Makanan',  price: 12000, cost: 9000, stock: 8,   minStock: 5,  barcode: '8993333', emoji: '🍞' },
    { name: 'Telur Ayam',    category: 'Makanan',  price: 2500,  cost: 1800, stock: 120, minStock: 30, barcode: '8994444', emoji: '🥚' },
    { name: 'Chitato',       category: 'Snack',    price: 8000,  cost: 6000, stock: 5,   minStock: 5,  barcode: '8995555', emoji: '🥔' },
    { name: 'Oreo',          category: 'Snack',    price: 5000,  cost: 3500, stock: 30,  minStock: 8,  barcode: '8996666', emoji: '🍪' },
    { name: 'Permen',        category: 'Snack',    price: 500,   cost: 300,  stock: 200, minStock: 50, barcode: '8997777', emoji: '🍬' },
    { name: 'Sampoerna',     category: 'Rokok',    price: 25000, cost: 22000,stock: 3,   minStock: 5,  barcode: '8998888', emoji: '🚬' },
    { name: 'Beras 1kg',     category: 'Sembako',  price: 13000, cost: 10000,stock: 50,  minStock: 10, barcode: '8990001', emoji: '🌾' },
    { name: 'Minyak Goreng', category: 'Sembako',  price: 18000, cost: 14000,stock: 15,  minStock: 5,  barcode: '8990002', emoji: '🫙' },
  ]);

  // Seed 30 days of random transactions for the report demo
  const now = Date.now();
  for (let d = 29; d >= 0; d--) {
    const dayStart = now - d * 86400000;
    const txCount  = Math.floor(Math.random() * 12) + 3;
    for (let t = 0; t < txCount; t++) {
      const products = await db.products.toArray();
      const itemCount = Math.floor(Math.random() * 3) + 1;
      const items = [];
      let total = 0;
      for (let i = 0; i < itemCount; i++) {
        const p   = products[Math.floor(Math.random() * products.length)];
        const qty = Math.floor(Math.random() * 3) + 1;
        items.push({ productId: p.id, qty, price: p.price, subtotal: p.price * qty });
        total += p.price * qty;
      }
      const methods = ['cash', 'qris', 'debt'];
      const method  = methods[Math.floor(Math.random() * methods.length)];
      const txId = await db.transactions.add({
        createdAt:     dayStart + Math.floor(Math.random() * 57600000),
        total,
        paid:          total,
        change:        0,
        paymentMethod: method,
        cashierId:     1,
        status:        'done',
      });
      await db.transactionItems.bulkAdd(items.map(it => ({ ...it, transactionId: txId })));
    }
  }
});

export default db;
