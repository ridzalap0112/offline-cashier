/**
 * Thermal printer service via Web Bluetooth API.
 *
 * Compatible with most ESC/POS printers (Epson, GOOJPRT, Xprinter, etc.)
 * that expose a BLE UART/Serial service.
 *
 * Common BLE UART UUIDs:
 *   Service:  0000ff00-0000-1000-8000-00805f9b34fb  (most generics)
 *   TX Char:  0000ff02-0000-1000-8000-00805f9b34fb
 *
 * Alternative Nordic UART (nRF):
 *   Service:  6e400001-b5a3-f393-e0a9-e50e24dcca9e
 *   TX Char:  6e400002-b5a3-f393-e0a9-e50e24dcca9e
 */

const PRINTER_SERVICE = '000018f0-0000-1000-8000-00805f9b34fb';
const PRINTER_CHAR    = '00002af1-0000-1000-8000-00805f9b34fb';

// Fallback UUIDs — if first fails, try these
const FALLBACK_PAIRS  = [
  ['0000ff00-0000-1000-8000-00805f9b34fb', '0000ff02-0000-1000-8000-00805f9b34fb'],
  ['6e400001-b5a3-f393-e0a9-e50e24dcca9e','6e400002-b5a3-f393-e0a9-e50e24dcca9e'],
];

let _device = null;
let _char   = null;

// ─── ESC/POS command helpers ──────────────────────────────────────────────────
const ESC = 0x1B;
const GS  = 0x1D;

const cmd = (...bytes) => Uint8Array.from(bytes);

const INIT        = cmd(ESC, 0x40);                    // Initialize printer
const ALIGN_LEFT  = cmd(ESC, 0x61, 0x00);
const ALIGN_CENTER= cmd(ESC, 0x61, 0x01);
const ALIGN_RIGHT = cmd(ESC, 0x61, 0x02);
const BOLD_ON     = cmd(ESC, 0x45, 0x01);
const BOLD_OFF    = cmd(ESC, 0x45, 0x00);
const DOUBLE_H    = cmd(GS,  0x21, 0x10);             // Double height text
const NORMAL_SIZE = cmd(GS,  0x21, 0x00);
const FEED        = cmd(0x0A);                         // Line feed
const CUT         = cmd(GS,  0x56, 0x42, 0x00);       // Partial cut

const encode = (text) => {
  const encoder = new TextEncoder();
  return encoder.encode(text + '\n');
};

const line = (char = '-', width = 32) => encode(char.repeat(width));

// ─── Connect to printer ───────────────────────────────────────────────────────
export const connectPrinter = async () => {
  if (!navigator.bluetooth) throw new Error('NO_BLUETOOTH');

  if (_device && _device.gatt.connected) return _char;

  const device = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: [
      PRINTER_SERVICE,
      ...FALLBACK_PAIRS.flatMap(([s]) => s),
    ],
  });

  const server = await device.gatt.connect();
  _device = device;

  // Try primary service first, then fallbacks
  let service, char;
  const pairs = [[PRINTER_SERVICE, PRINTER_CHAR], ...FALLBACK_PAIRS];

  for (const [svcUUID, charUUID] of pairs) {
    try {
      service = await server.getPrimaryService(svcUUID);
      char    = await service.getCharacteristic(charUUID);
      break;
    } catch { /* try next */ }
  }

  if (!char) throw new Error('CHAR_NOT_FOUND');
  _char = char;
  return char;
};

export const disconnectPrinter = () => {
  if (_device?.gatt.connected) _device.gatt.disconnect();
  _device = null;
  _char   = null;
};

// ─── Write chunks (BLE max ~20 bytes per write) ───────────────────────────────
const writeChunked = async (char, data, chunkSize = 20) => {
  for (let i = 0; i < data.length; i += chunkSize) {
    await char.writeValue(data.slice(i, i + chunkSize));
    await new Promise((r) => setTimeout(r, 20));
  }
};

const concat = (...arrays) => {
  const total  = arrays.reduce((s, a) => s + a.length, 0);
  const result = new Uint8Array(total);
  let offset   = 0;
  for (const arr of arrays) { result.set(arr, offset); offset += arr.length; }
  return result;
};

// ─── Build receipt bytes ──────────────────────────────────────────────────────
export const buildReceipt = ({ storeName, address, items, total, paid, change, paymentMethod, txId, cashier, lang = 'id' }) => {
  const fmt = (n) => 'Rp ' + Math.round(n).toLocaleString('id-ID');
  const padRight = (s, w) => String(s).substring(0, w).padEnd(w);
  const padLeft  = (s, w) => String(s).substring(0, w).padStart(w);
  const COL = 32;
  const PRICE_W = 10;
  const NAME_W  = COL - PRICE_W - 4;

  const labels = {
    id: { total: 'TOTAL', paid: 'BAYAR', change: 'KEMBALIAN', method: 'METODE', tx: 'NO TX', cashier: 'KASIR', thanks: 'Terima kasih!' },
    en: { total: 'TOTAL', paid: 'PAID',  change: 'CHANGE',    method: 'METHOD', tx: 'TX NO', cashier: 'CASHIER',thanks: 'Thank you!' },
    zh: { total: '合计',  paid: '实付',  change: '找零',      method: '支付',   tx: '单号',  cashier: '收银员', thanks: '谢谢惠顾！' },
  }[lang] || labels['id'];

  const parts = [
    INIT,
    ALIGN_CENTER,
    BOLD_ON, DOUBLE_H,
    encode(storeName),
    NORMAL_SIZE, BOLD_OFF,
    address ? encode(address) : new Uint8Array(0),
    FEED,
    ALIGN_LEFT,
    line(),
    ...items.map((item) => {
      const nameStr  = padRight(item.name, NAME_W);
      const qtyStr   = `x${item.qty}`;
      const priceStr = padLeft(fmt(item.subtotal), PRICE_W);
      return encode(`${nameStr} ${qtyStr} ${priceStr}`);
    }),
    line(),
    BOLD_ON,
    encode(`${padRight(labels.total, COL - PRICE_W)}${padLeft(fmt(total), PRICE_W)}`),
    BOLD_OFF,
    encode(`${padRight(labels.paid,  COL - PRICE_W)}${padLeft(fmt(paid),  PRICE_W)}`),
    encode(`${padRight(labels.change,COL - PRICE_W)}${padLeft(fmt(change),PRICE_W)}`),
    encode(`${labels.method}: ${paymentMethod.toUpperCase()}`),
    line(),
    encode(`${labels.tx}: ${String(txId).padStart(6,'0')}`),
    encode(`${labels.cashier}: ${cashier}`),
    encode(new Date().toLocaleString('id-ID')),
    line(),
    ALIGN_CENTER,
    BOLD_ON,
    encode(labels.thanks),
    BOLD_OFF,
    FEED, FEED, FEED,
    CUT,
  ];

  return concat(...parts);
};

// ─── Main print function ──────────────────────────────────────────────────────
export const printReceipt = async (receiptData) => {
  const char  = _char || await connectPrinter();
  const bytes = buildReceipt(receiptData);
  await writeChunked(char, bytes);
};
