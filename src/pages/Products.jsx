import React, { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db.js';
import { LANGS, CATEGORY_KEYS } from '../i18n/index.js';
import { useLang } from '../hooks/useStore.js';
import { addProduct, updateProduct, deleteProduct } from '../services/index.js';
import { importProductsFromRows, parseImportFile } from '../services/productImport.js';
import {
  PRODUCT_IMAGE_OPTIONS,
  getDefaultImageFile,
  getProductImageSrc,
  normalizeImageFile,
  resolveProductImage,
} from '../assets/productImages.js';

const fmt = (n) => 'Rp ' + Math.round(n).toLocaleString('id-ID');

const S = {
  root: { display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: 'var(--bg)', padding: '22px 28px', gap: 14 },
  toolbar: { padding: '0 0 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 14, alignItems: 'center' },
  toolbarActions: { display: 'flex', gap: 8, alignItems: 'center' },
  downloadLink: { padding: '8px 0', border: 'none', borderBottom: '2px solid transparent', background: 'transparent', color: 'var(--text-2)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' },
  searchIn: { flex: 1, padding: '11px 0', border: 'none', borderBottom: '1px solid var(--border-md)', fontSize: 14, background: 'transparent', outline: 'none', fontFamily: 'inherit', color: 'var(--text)' },
  addBtn: { padding: '10px 16px', border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' },
  importBtn: { padding: '8px 0', border: 'none', borderBottom: '2px solid transparent', background: 'transparent', color: 'var(--text-2)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' },
  importHint: { padding: '0 0 8px', fontSize: 13, color: 'var(--text-2)', borderBottom: '1px solid var(--border)' },
  importStatus: { padding: '0 0 8px', fontSize: 13, color: 'var(--accent-txt)', borderBottom: '1px solid var(--border)' },
  importError: { padding: '0 0 8px', fontSize: 13, color: 'var(--rose)', borderBottom: '1px solid var(--border)' },
  table: { flex: 1, overflowY: 'auto', background: 'transparent', borderTop: '1px solid var(--border)' },
  thead: { position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 1 },
  th: { padding: '12px 14px', textAlign: 'left', fontSize: 11, color: 'var(--text-2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', whiteSpace: 'nowrap', borderBottom: '1px solid var(--border)' },
  tr: { borderBottom: '1px solid var(--border)', transition: 'background .1s' },
  td: { padding: '12px 14px', fontSize: 13, color: 'var(--text)' },
  mono: { fontFamily: 'var(--mono)', fontSize: 12 },
  low: { color: 'var(--amber)', fontWeight: 700 },
  actBtn: { padding: '6px 0', border: 'none', borderBottom: '1px solid var(--border-md)', background: 'transparent', fontSize: 12, cursor: 'pointer', color: 'var(--text-2)', marginRight: 12, transition: 'all .12s', fontFamily: 'inherit', fontWeight: 700 },
  delBtn: { padding: '6px 0', border: 'none', borderBottom: '1px solid #FECDD3', background: 'transparent', fontSize: 12, cursor: 'pointer', color: 'var(--rose)', transition: 'all .12s', fontFamily: 'inherit', fontWeight: 700 },
  overlay: { position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.28)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 30 },
  modal: { background: 'linear-gradient(180deg,#FFFFFF 0%,#FCFCFD 100%)', borderRadius: 18, border: '1px solid var(--border)', padding: '22px 24px', width: '100%', maxWidth: 440, display: 'flex', flexDirection: 'column', gap: 14, boxShadow: 'var(--shadow-md)' },
  modalT: { fontSize: 18, fontWeight: 700, color: 'var(--text)' },
  label: { fontSize: 12, color: 'var(--text-2)', marginBottom: 5, display: 'block', fontWeight: 600 },
  mInput: { width: '100%', padding: '10px 12px', border: '1px solid var(--border-md)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', color: 'var(--text)', background: '#fff' },
  mSelect: { width: '100%', padding: '10px 12px', border: '1px solid var(--border-md)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', background: '#fff', color: 'var(--text)' },
  mRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  mBtns: { display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 },
  cancelBtn: { padding: '10px 18px', borderRadius: 8, border: '1px solid var(--border-md)', background: '#fff', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text-2)', fontWeight: 600 },
  saveBtn: { padding: '10px 18px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,var(--accent) 0%,#0E7490 100%)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 10px 22px rgba(15,118,110,0.18)' },
  imageCell: { width: 48 },
  thumb: { width: 40, height: 40, objectFit: 'contain', display: 'block' },
  thumbLg: { width: 84, height: 84, borderRadius: 14, objectFit: 'cover', display: 'block', background: 'var(--surface2)', border: '1px solid var(--border)' },
  imagePreviewWrap: { display: 'flex', alignItems: 'center', gap: 14 },
  previewMeta: { display: 'flex', flexDirection: 'column', gap: 4 },
  previewName: { fontSize: 12, color: 'var(--text-2)' },
};

const EMPTY = {
  name: '',
  category: 'Minuman',
  price: '',
  cost: '',
  stock: '',
  minStock: '5',
  barcode: '',
  image: '',
};

export default function Products() {
  const { lang } = useLang();
  const t = LANGS[lang];
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [importState, setImportState] = useState({ type: '', message: '' });
  const fileInputRef = useRef(null);

  const products = useLiveQuery(() => db.products.orderBy('name').toArray(), []);

  const filtered = (products || []).filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setEditing(null);
    setForm({ ...EMPTY, image: getDefaultImageFile('Aqua Botol') || PRODUCT_IMAGE_OPTIONS[0] || '' });
    setModal(true);
  };

  const openEdit = (product) => {
    setEditing(product.id);
    setForm({
      name: product.name,
      category: product.category,
      price: String(product.price),
      cost: String(product.cost || ''),
      stock: String(product.stock),
      minStock: String(product.minStock || 5),
      barcode: product.barcode || '',
      image: normalizeImageFile(product.image) || getDefaultImageFile(product.name) || '',
    });
    setModal(true);
  };

  const handleSave = async () => {
    const data = {
      name: form.name.trim(),
      category: form.category,
      price: parseInt(form.price, 10) || 0,
      cost: parseInt(form.cost, 10) || 0,
      stock: parseInt(form.stock, 10) || 0,
      minStock: parseInt(form.minStock, 10) || 5,
      barcode: form.barcode.trim(),
      image: normalizeImageFile(form.image) || getDefaultImageFile(form.name.trim()) || '',
    };

    if (!data.name) return;

    if (editing) await updateProduct(editing, data);
    else await addProduct(data);

    setModal(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Hapus produk ini?')) await deleteProduct(id);
  };

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportState({ type: '', message: '' });

    try {
      const { rows, hasCostColumn } = await parseImportFile(file);
      const result = await importProductsFromRows(rows);
      const baseMessage = `${result.updated} updated, ${result.created} created from ${result.total} rows.`;
      const costNote = ' Cost data was not updated because the current file does not include a modal/cost column.';
      setImportState({
        type: 'success',
        message: hasCostColumn ? baseMessage : `${baseMessage}${costNote}`,
      });
    } catch (error) {
      console.error(error);
      setImportState({
        type: 'error',
        message: error.message || 'Import failed. Please check the file format.',
      });
    }
  };

  const f = (key) => (e) => setForm((state) => ({ ...state, [key]: e.target.value }));
  const previewSrc = getProductImageSrc(form.image) || getProductImageSrc(getDefaultImageFile(form.name));

  return (
    <div style={{ ...S.root, position: 'relative' }}>
      <div style={S.toolbar}>
        <input style={S.searchIn} placeholder={t.search} value={search} onChange={(e) => setSearch(e.target.value)} />
        <div style={S.toolbarActions}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            style={{ display: 'none' }}
            onChange={handleImportFile}
          />
          <button style={S.importBtn} onClick={handleImportClick}>
            {t.importProducts}
          </button>
          <a
            href="/templates/product-import-template.xlsx"
            download="product-import-template.xlsx"
            style={S.downloadLink}
          >
            Download XLSX
          </a>
          <a
            href="/templates/product-import-template.csv"
            download="product-import-template.csv"
            style={S.downloadLink}
          >
            Download CSV
          </a>
          <button style={S.addBtn} onClick={openAdd}>+ {t.addProduct}</button>
        </div>
      </div>

      {!importState.message && (
        <div style={S.importHint}>{t.importHint}</div>
      )}
      {importState.type === 'success' && (
        <div style={S.importStatus}>{importState.message}</div>
      )}
      {importState.type === 'error' && (
        <div style={S.importError}>{importState.message}</div>
      )}

      <div style={S.table}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={S.thead}>
            <tr>
              {['', t.name, t.category, t.price, t.cost, t.stock, ''].map((header, i) => (
                <th key={i} style={S.th}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((product) => {
              const low = product.stock <= (product.minStock || 5);
              const image = resolveProductImage(product);
              return (
                <tr key={product.id} style={S.tr} onMouseEnter={(e) => { e.currentTarget.style.background = '#F5F3EE'; }} onMouseLeave={(e) => { e.currentTarget.style.background = ''; }}>
                  <td style={{ ...S.td, ...S.imageCell }}>
                    {image.src ? <img src={image.src} alt={product.name} style={S.thumb} /> : <div style={S.thumb} />}
                  </td>
                  <td style={S.td}>
                    <div style={{ fontWeight: 500 }}>{product.name}</div>
                    <div style={{ fontSize: 11, color: '#9E9C97', fontFamily: 'var(--mono)' }}>{product.barcode}</div>
                  </td>
                  <td style={S.td}><span style={{ fontSize: 11, background: '#F0EDE6', color: '#6B6860', padding: '2px 8px', borderRadius: 99 }}>{product.category}</span></td>
                  <td style={{ ...S.td, ...S.mono }}>{fmt(product.price)}</td>
                  <td style={{ ...S.td, ...S.mono, color: '#9E9C97' }}>{product.cost ? fmt(product.cost) : '-'}</td>
                  <td style={{ ...S.td, ...S.mono, ...(low ? S.low : {}) }}>{product.stock}{low ? ' !' : ''}</td>
                  <td style={S.td}>
                    <button style={S.actBtn} onClick={() => openEdit(product)}>Edit</button>
                    <button style={S.delBtn} onClick={() => handleDelete(product.id)}>X</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modal && (
        <div style={S.overlay} onClick={(e) => e.target === e.currentTarget && setModal(false)}>
          <div style={S.modal}>
            <div style={S.modalT}>{editing ? 'Edit Product' : t.addProduct}</div>

            <div>
              <label style={S.label}>{t.name}</label>
              <input style={S.mInput} value={form.name} onChange={f('name')} placeholder="Aqua Botol" />
            </div>

            <div>
              <label style={S.label}>Product Image</label>
              <div style={S.imagePreviewWrap}>
                {previewSrc ? <img src={previewSrc} alt={form.name || 'Preview'} style={S.thumbLg} /> : <div style={S.thumbLg} />}
                <div style={S.previewMeta}>
                  <select style={S.mSelect} value={form.image} onChange={f('image')}>
                    <option value="">Select image asset</option>
                    {PRODUCT_IMAGE_OPTIONS.map((fileName) => (
                      <option key={fileName} value={fileName}>{fileName}</option>
                    ))}
                  </select>
                  <span style={S.previewName}>{form.image || 'No image selected'}</span>
                </div>
              </div>
            </div>

            <div>
              <label style={S.label}>{t.category}</label>
              <select style={S.mSelect} value={form.category} onChange={f('category')}>
                {CATEGORY_KEYS.filter(Boolean).map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </div>

            <div style={S.mRow}>
              <div>
                <label style={S.label}>{t.price}</label>
                <input style={S.mInput} type="number" value={form.price} onChange={f('price')} placeholder="3000" />
              </div>
              <div>
                <label style={S.label}>{t.cost}</label>
                <input style={S.mInput} type="number" value={form.cost} onChange={f('cost')} placeholder="2000" />
              </div>
            </div>

            <div style={S.mRow}>
              <div>
                <label style={S.label}>{t.stock}</label>
                <input style={S.mInput} type="number" value={form.stock} onChange={f('stock')} placeholder="50" />
              </div>
              <div>
                <label style={S.label}>{t.minStock}</label>
                <input style={S.mInput} type="number" value={form.minStock} onChange={f('minStock')} placeholder="5" />
              </div>
            </div>

            <div>
              <label style={S.label}>{t.barcode}</label>
              <input style={S.mInput} value={form.barcode} onChange={f('barcode')} placeholder="8992388..." />
            </div>

            <div style={S.mBtns}>
              <button style={S.cancelBtn} onClick={() => setModal(false)}>{t.cancel}</button>
              <button style={S.saveBtn} onClick={handleSave}>{t.save}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
