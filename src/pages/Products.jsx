import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db.js';
import { LANGS, CATEGORY_KEYS } from '../i18n/index.js';
import { useLang } from '../hooks/useStore.js';
import { addProduct, updateProduct, deleteProduct } from '../services/index.js';
import {
  PRODUCT_IMAGE_OPTIONS,
  getDefaultImageFile,
  getProductImageSrc,
  normalizeImageFile,
  resolveProductImage,
} from '../assets/productImages.js';

const fmt = (n) => 'Rp ' + Math.round(n).toLocaleString('id-ID');

const S = {
  root: { display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' },
  toolbar: { padding: '10px 16px', background: '#fff', borderBottom: '0.5px solid rgba(0,0,0,0.08)', display: 'flex', gap: 10, alignItems: 'center' },
  searchIn: { flex: 1, padding: '7px 12px', border: '0.5px solid rgba(0,0,0,0.14)', borderRadius: 8, fontSize: 13, background: '#F5F3EE', outline: 'none', fontFamily: 'inherit' },
  addBtn: { padding: '7px 16px', borderRadius: 8, border: 'none', background: '#1A6B45', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' },
  table: { flex: 1, overflowY: 'auto' },
  thead: { position: 'sticky', top: 0, background: '#F0EDE6', zIndex: 1 },
  th: { padding: '10px 14px', textAlign: 'left', fontSize: 11, color: '#6B6860', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', whiteSpace: 'nowrap', borderBottom: '0.5px solid rgba(0,0,0,0.08)' },
  tr: { borderBottom: '0.5px solid rgba(0,0,0,0.06)', transition: 'background .1s' },
  td: { padding: '10px 14px', fontSize: 13, color: '#1A1916' },
  mono: { fontFamily: 'DM Mono,monospace', fontSize: 12 },
  low: { color: '#B45309', fontWeight: 500 },
  actBtn: { padding: '4px 10px', borderRadius: 6, border: '0.5px solid rgba(0,0,0,0.14)', background: 'transparent', fontSize: 11, cursor: 'pointer', color: '#6B6860', marginRight: 4, transition: 'all .12s', fontFamily: 'inherit' },
  delBtn: { padding: '4px 10px', borderRadius: 6, border: '0.5px solid rgba(0,0,0,0.14)', background: 'transparent', fontSize: 11, cursor: 'pointer', color: '#C0392B', transition: 'all .12s', fontFamily: 'inherit' },
  overlay: { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 30 },
  modal: { background: '#fff', borderRadius: 16, padding: '22px 24px', width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', gap: 14 },
  modalT: { fontSize: 16, fontWeight: 600 },
  label: { fontSize: 12, color: '#6B6860', marginBottom: 4, display: 'block' },
  mInput: { width: '100%', padding: '8px 12px', border: '0.5px solid rgba(0,0,0,0.18)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none' },
  mSelect: { width: '100%', padding: '8px 12px', border: '0.5px solid rgba(0,0,0,0.18)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', background: '#fff' },
  mRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  mBtns: { display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 },
  cancelBtn: { padding: '9px 18px', borderRadius: 8, border: '0.5px solid rgba(0,0,0,0.14)', background: 'transparent', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' },
  saveBtn: { padding: '9px 18px', borderRadius: 8, border: 'none', background: '#1A6B45', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  imageCell: { width: 48 },
  thumb: { width: 36, height: 36, borderRadius: 10, objectFit: 'cover', display: 'block', background: '#F0EDE6', border: '0.5px solid rgba(0,0,0,0.08)' },
  thumbLg: { width: 84, height: 84, borderRadius: 14, objectFit: 'cover', display: 'block', background: '#F0EDE6', border: '0.5px solid rgba(0,0,0,0.08)' },
  imagePreviewWrap: { display: 'flex', alignItems: 'center', gap: 14 },
  previewMeta: { display: 'flex', flexDirection: 'column', gap: 4 },
  previewName: { fontSize: 12, color: '#6B6860' },
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

  const f = (key) => (e) => setForm((state) => ({ ...state, [key]: e.target.value }));
  const previewSrc = getProductImageSrc(form.image) || getProductImageSrc(getDefaultImageFile(form.name));

  return (
    <div style={{ ...S.root, position: 'relative' }}>
      <div style={S.toolbar}>
        <input style={S.searchIn} placeholder={t.search} value={search} onChange={(e) => setSearch(e.target.value)} />
        <button style={S.addBtn} onClick={openAdd}>+ {t.addProduct}</button>
      </div>

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
                    <div style={{ fontSize: 11, color: '#9E9C97', fontFamily: 'DM Mono,monospace' }}>{product.barcode}</div>
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
