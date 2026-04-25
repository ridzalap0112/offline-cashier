import Dexie from 'dexie';
import { getDefaultImageFile } from './assets/productImages.js';

export const db = new Dexie('KasirWarungDB');

const SURVEY_PRODUCTS = {
  '8992388': { name: 'Aqua Botol 330 ml', price: 3000, category: 'Minuman' },
  '8990001': { name: 'Beras Sania 1 kg', price: 24000, category: 'Sembako' },
  '8995555': { name: 'Chitato Party Pack', price: 26000, category: 'Snack' },
  '8999999': { name: 'Indomie Goreng', price: 3000, category: 'Makanan' },
  '8991111': { name: 'Kopi Kapal Api + Gula', price: 18000, category: 'Minuman' },
  '8990002': { name: 'Minyak Goreng Sania 2 L', price: 39000, category: 'Sembako' },
  '8996666': { name: 'Oreo', price: 9000, category: 'Snack' },
  '8997777': { name: 'Permen Milkita', price: 13000, category: 'Snack' },
  '8993333': { name: 'Roti Tawar Sari Roti', price: 14000, category: 'Makanan' },
  '8998888': { name: 'Rokok Sampoerna', price: 39000, category: 'Rokok' },
  '8990123': { name: 'Teh Botol', price: 3500, category: 'Minuman' },
  '8994444': { name: 'Telur Ayam 1 kg', price: 29000, category: 'Sembako' },
};

// Schema version 1
db.version(1).stores({
  products: '++id, name, &barcode, category, stock',
  transactions: '++id, createdAt, cashierId, status, paymentMethod',
  transactionItems: '++id, transactionId, productId',
  cashiers: '++id, name, role',
});

// Schema version 2
db.version(2)
  .stores({
    products: '++id, name, &barcode, category, stock',
    transactions: '++id, createdAt, cashierId, status, paymentMethod',
    transactionItems: '++id, transactionId, productId',
    cashiers: '++id, name, role',
  })
  .upgrade(async (tx) => {
    await tx.table('products').toCollection().modify((product) => {
      if (!product.image) {
        product.image = getDefaultImageFile(product.name);
      }
      delete product.emoji;
    });

    await tx.table('transactionItems').toCollection().modify((item) => {
      if (!item.image && item.productName) {
        item.image = getDefaultImageFile(item.productName);
      }
      delete item.emoji;
    });
  });

db.version(3)
  .stores({
    products: '++id, name, &barcode, category, stock',
    transactions: '++id, createdAt, cashierId, status, paymentMethod',
    transactionItems: '++id, transactionId, productId',
    cashiers: '++id, name, role',
  })
  .upgrade(async (tx) => {
    await tx.table('products').toCollection().modify((product) => {
      const surveyProduct = SURVEY_PRODUCTS[product.barcode];
      if (!surveyProduct) return;
      product.name = surveyProduct.name;
      product.price = surveyProduct.price;
      product.category = surveyProduct.category;
      product.image = getDefaultImageFile(surveyProduct.name) || product.image || '';
    });
  });

db.version(4)
  .stores({
    products: '++id, name, &barcode, category, stock',
    transactions: '++id, createdAt, cashierId, status, paymentMethod',
    transactionItems: '++id, transactionId, productId',
    cashiers: '++id, name, role',
  })
  .upgrade(async (tx) => {
    await tx.table('products').toCollection().modify((product) => {
      const surveyProduct = SURVEY_PRODUCTS[product.barcode];
      if (!surveyProduct) return;
      product.name = surveyProduct.name;
      product.price = surveyProduct.price;
      product.category = surveyProduct.category;
      product.image = getDefaultImageFile(surveyProduct.name) || product.image || '';
    });
  });

db.on('populate', async () => {
  await db.cashiers.bulkAdd([
    { name: 'Budi', pin: '1234', role: 'cashier' },
    { name: 'Admin', pin: '0000', role: 'admin' },
  ]);

  await db.products.bulkAdd([
    { name: 'Aqua Botol 330 ml', category: 'Minuman', price: 3000, cost: 2000, stock: 48, minStock: 10, barcode: '8992388', image: getDefaultImageFile('Aqua Botol 330 ml') },
    { name: 'Teh Botol', category: 'Minuman', price: 3500, cost: 2800, stock: 24, minStock: 6, barcode: '8990123', image: getDefaultImageFile('Teh Botol') },
    { name: 'Kopi Kapal Api + Gula', category: 'Minuman', price: 18000, cost: 1500, stock: 60, minStock: 10, barcode: '8991111', image: getDefaultImageFile('Kopi Kapal Api + Gula') },
    { name: 'Indomie Goreng', category: 'Makanan', price: 3000, cost: 2500, stock: 80, minStock: 20, barcode: '8999999', image: getDefaultImageFile('Indomie Goreng') },
    { name: 'Roti Tawar Sari Roti', category: 'Makanan', price: 14000, cost: 9000, stock: 8, minStock: 5, barcode: '8993333', image: getDefaultImageFile('Roti Tawar Sari Roti') },
    { name: 'Telur Ayam 1 kg', category: 'Sembako', price: 29000, cost: 1800, stock: 120, minStock: 30, barcode: '8994444', image: getDefaultImageFile('Telur Ayam 1 kg') },
    { name: 'Chitato Party Pack', category: 'Snack', price: 26000, cost: 6000, stock: 5, minStock: 5, barcode: '8995555', image: getDefaultImageFile('Chitato Party Pack') },
    { name: 'Oreo', category: 'Snack', price: 9000, cost: 3500, stock: 30, minStock: 8, barcode: '8996666', image: getDefaultImageFile('Oreo') },
    { name: 'Permen Milkita', category: 'Snack', price: 13000, cost: 300, stock: 200, minStock: 50, barcode: '8997777', image: getDefaultImageFile('Permen Milkita') },
    { name: 'Rokok Sampoerna', category: 'Rokok', price: 39000, cost: 22000, stock: 3, minStock: 5, barcode: '8998888', image: getDefaultImageFile('Rokok Sampoerna') },
    { name: 'Beras Sania 1 kg', category: 'Sembako', price: 24000, cost: 10000, stock: 50, minStock: 10, barcode: '8990001', image: getDefaultImageFile('Beras Sania 1 kg') },
    { name: 'Minyak Goreng Sania 2 L', category: 'Sembako', price: 39000, cost: 14000, stock: 15, minStock: 5, barcode: '8990002', image: getDefaultImageFile('Minyak Goreng Sania 2 L') },
  ]);

  const now = Date.now();
  for (let d = 29; d >= 0; d -= 1) {
    const dayStart = now - d * 86400000;
    const txCount = Math.floor(Math.random() * 12) + 3;
    for (let t = 0; t < txCount; t += 1) {
      const products = await db.products.toArray();
      const itemCount = Math.floor(Math.random() * 3) + 1;
      const items = [];
      let total = 0;

      for (let i = 0; i < itemCount; i += 1) {
        const product = products[Math.floor(Math.random() * products.length)];
        const qty = Math.floor(Math.random() * 3) + 1;
        items.push({
          productId: product.id,
          productName: product.name,
          image: product.image || getDefaultImageFile(product.name),
          qty,
          price: product.price,
          cost: product.cost,
          subtotal: product.price * qty,
        });
        total += product.price * qty;
      }

      const methods = ['cash', 'qris', 'debt'];
      const method = methods[Math.floor(Math.random() * methods.length)];
      const txId = await db.transactions.add({
        createdAt: dayStart + Math.floor(Math.random() * 57600000),
        total,
        paid: total,
        change: 0,
        paymentMethod: method,
        cashierId: 1,
        status: 'done',
      });

      await db.transactionItems.bulkAdd(
        items.map((item) => ({ ...item, transactionId: txId }))
      );
    }
  }
});

export default db;
