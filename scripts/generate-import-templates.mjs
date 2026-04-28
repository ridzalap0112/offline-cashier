import fs from 'node:fs';
import path from 'node:path';
import * as XLSX from 'xlsx';

const rootDir = process.cwd();
const templatesDir = path.join(rootDir, 'templates');
const publicTemplatesDir = path.join(rootDir, 'public', 'templates');
const surveyPath = path.join(rootDir, 'katalog_produk.xlsx');

const knownCostMap = {
  'Aqua Botol 330 ml': 2000,
  'Beras Sania 1 kg': 10000,
  'Chitato Party Pack': 6000,
  'Indomie Goreng': 2500,
  'Kopi Kapal Api + Gula': 1500,
  'Minyak Goreng Sania 2 L': 14000,
  Oreo: 3500,
  'Permen Milkita': 300,
  'Roti Tawar Sari Roti': 9000,
  'Rokok Sampoerna': 22000,
  'Teh Botol': 2800,
  'Telur Ayam 1 kg': 1800,
  'Telur Ayam 1kg': 1800,
};

const templateRows = [
  {
    'Nama Produk': 'Aqua Botol 330 ml',
    Harga: 3000,
    Modal: 2200,
    Barcode: '8992388',
    Kategori: 'Minuman',
    Stok: 48,
    'Stok Minimum': 10,
    Image: 'Aqua Botol.png',
  },
  {
    'Nama Produk': 'Beras Sania 1 kg',
    Harga: 24000,
    Modal: 21000,
    Barcode: '8990001',
    Kategori: 'Sembako',
    Stok: 50,
    'Stok Minimum': 10,
    Image: 'Beras.png',
  },
  {
    'Nama Produk': 'Oreo',
    Harga: 9000,
    Modal: 7000,
    Barcode: '8996666',
    Kategori: 'Snack',
    Stok: 30,
    'Stok Minimum': 8,
    Image: 'oreo.png',
  },
];

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const writeWorkbook = (rows, filePath) => {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
  XLSX.writeFile(workbook, filePath);
};

const writeCsv = (rows, filePath) => {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  fs.writeFileSync(filePath, csv, 'utf8');
};

const buildSurveyStandardRows = () => {
  if (!fs.existsSync(surveyPath)) {
    return [];
  }

  const buffer = fs.readFileSync(surveyPath);
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  return rows
    .map((row) => ({
      'Nama Produk': row['Nama Produk'] || row['Product Name'] || row.Name || '',
      Harga: row.Harga || row.Price || '',
      Modal: row.Modal || row['Harga Modal'] || row.Cost || knownCostMap[row['Nama Produk'] || row['Product Name'] || row.Name || ''] || '',
      Barcode: row.Barcode || '',
      Kategori: row.Kategori || '',
      Stok: row.Stok || '',
      'Stok Minimum': row['Stok Minimum'] || row['Min Stock'] || '',
      Image: row.Image || '',
    }))
    .filter((row) => row['Nama Produk'] && row.Harga);
};

ensureDir(templatesDir);
ensureDir(publicTemplatesDir);

for (const baseDir of [templatesDir, publicTemplatesDir]) {
  writeCsv(templateRows, path.join(baseDir, 'product-import-template.csv'));
  writeWorkbook(templateRows, path.join(baseDir, 'product-import-template.xlsx'));
}

const surveyStandardRows = buildSurveyStandardRows();
if (surveyStandardRows.length) {
  for (const baseDir of [templatesDir, publicTemplatesDir]) {
    writeCsv(surveyStandardRows, path.join(baseDir, 'katalog-produk-survey-standar.csv'));
    writeWorkbook(surveyStandardRows, path.join(baseDir, 'katalog-produk-survey-standar.xlsx'));
  }
}
