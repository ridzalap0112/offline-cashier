import * as XLSX from 'xlsx';
import { db } from '../db.js';
import { getDefaultImageFile, normalizeImageFile } from '../assets/productImages.js';

const normalizeKey = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

const normalizeName = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9 ]+/g, '');

const toInt = (value, fallback = 0) => {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = Number(String(value).replace(/[^0-9.-]/g, ''));
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.trunc(parsed));
};

const findColumn = (headers, aliases) => {
  const aliasSet = new Set(aliases.map(normalizeKey));
  return headers.find((header) => aliasSet.has(normalizeKey(header))) || '';
};

const inferCategory = (name, fallback = 'Makanan') => {
  const value = normalizeName(name);
  if (value.includes('aqua') || value.includes('teh') || value.includes('kopi')) return 'Minuman';
  if (value.includes('rokok') || value.includes('sampoerna')) return 'Rokok';
  if (value.includes('beras') || value.includes('minyak') || value.includes('telur')) return 'Sembako';
  if (value.includes('oreo') || value.includes('permen') || value.includes('chitato')) return 'Snack';
  return fallback;
};

export const parseImportFile = async (file) => {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  const headers = rows.length ? Object.keys(rows[0]) : [];
  const nameColumn = findColumn(headers, ['Nama Produk', 'Product Name', 'Name', 'Produk']);
  const priceColumn = findColumn(headers, ['Harga', 'Price', 'Selling Price', 'Harga Jual']);
  const costColumn = findColumn(headers, ['Modal', 'Harga Modal', 'Cost', 'Cost Price']);
  const barcodeColumn = findColumn(headers, ['Barcode', 'Kode Barcode']);
  const categoryColumn = findColumn(headers, ['Kategori', 'Category']);
  const stockColumn = findColumn(headers, ['Stok', 'Stock']);
  const minStockColumn = findColumn(headers, ['Stok Minimum', 'Min Stock', 'Min. Stock']);
  const imageColumn = findColumn(headers, ['Image', 'Gambar', 'Asset', 'Image File']);

  if (!nameColumn || !priceColumn) {
    throw new Error('File import harus punya kolom nama produk dan harga.');
  }

  return {
    hasCostColumn: Boolean(costColumn),
    rows: rows
    .map((row) => ({
      name: String(row[nameColumn] || '').trim(),
      price: toInt(row[priceColumn], 0),
      cost: costColumn ? toInt(row[costColumn], null) : null,
      barcode: barcodeColumn ? String(row[barcodeColumn] || '').trim() : '',
      category: categoryColumn ? String(row[categoryColumn] || '').trim() : '',
      stock: stockColumn ? toInt(row[stockColumn], null) : null,
      minStock: minStockColumn ? toInt(row[minStockColumn], null) : null,
      image: imageColumn ? String(row[imageColumn] || '').trim() : '',
    }))
    .filter((row) => row.name && row.price > 0),
  };
};

export const importProductsFromRows = async (rows) => {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('Tidak ada data produk yang bisa diimpor.');
  }

  return db.transaction('rw', db.products, async () => {
    const existingProducts = await db.products.toArray();
    const byBarcode = new Map(
      existingProducts
        .filter((product) => product.barcode)
        .map((product) => [product.barcode, product])
    );
    const byName = new Map(
      existingProducts.map((product) => [normalizeName(product.name), product])
    );

    let created = 0;
    let updated = 0;

    for (const row of rows) {
      const existing =
        (row.barcode && byBarcode.get(row.barcode)) ||
        byName.get(normalizeName(row.name));

      const nextImage =
        normalizeImageFile(row.image) ||
        normalizeImageFile(existing?.image) ||
        getDefaultImageFile(row.name) ||
        '';

      const payload = {
        name: row.name,
        price: row.price,
        category: row.category || existing?.category || inferCategory(row.name),
        barcode: row.barcode || existing?.barcode || '',
        image: nextImage,
      };

      if (row.cost !== null) payload.cost = row.cost;
      else if (existing?.cost !== undefined) payload.cost = existing.cost;

      if (row.stock !== null) payload.stock = row.stock;
      else if (existing?.stock !== undefined) payload.stock = existing.stock;
      else payload.stock = 0;

      if (row.minStock !== null) payload.minStock = row.minStock;
      else if (existing?.minStock !== undefined) payload.minStock = existing.minStock;
      else payload.minStock = 5;

      if (existing) {
        await db.products.update(existing.id, payload);
        const merged = { ...existing, ...payload };
        byName.delete(normalizeName(existing.name));
        if (existing.barcode) byBarcode.delete(existing.barcode);
        if (merged.barcode) byBarcode.set(merged.barcode, merged);
        byName.set(normalizeName(merged.name), merged);
        updated += 1;
      } else {
        const id = await db.products.add({ ...payload, createdAt: Date.now() });
        const createdProduct = { id, ...payload };
        if (createdProduct.barcode) byBarcode.set(createdProduct.barcode, createdProduct);
        byName.set(normalizeName(createdProduct.name), createdProduct);
        created += 1;
      }
    }

    return {
      total: rows.length,
      created,
      updated,
    };
  });
};
