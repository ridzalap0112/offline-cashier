const modules = import.meta.glob('./*.png', { eager: true, import: 'default' });

const imageEntries = Object.entries(modules).map(([path, src]) => {
  const fileName = path.split('/').pop();
  return { fileName, src };
});

const imageByFileName = Object.fromEntries(
  imageEntries.map((entry) => [entry.fileName, entry.src])
);

const defaultImageMap = {
  'Aqua Botol': 'Aqua Botol.png',
  'Aqua Botol 330 ml': 'Aqua Botol.png',
  'Teh Botol': 'teh-botol.png',
  'Kopi Sachet': 'kopi-sachet.png',
  'Kopi Kapal Api + Gula': 'kopi-sachet.png',
  'Indomie Goreng': 'indomie-goreng.png',
  'Roti Tawar': 'roti-tawar.png',
  'Roti Tawar Sari Roti': 'roti-tawar.png',
  'Telur Ayam': 'telur-ayam.png',
  'Telur Ayam 1 kg': 'telur-ayam.png',
  Chitato: 'Chitato.png',
  'Chitato Party Pack': 'Chitato.png',
  Oreo: 'oreo.png',
  Permen: 'permen-milkita.png',
  'Permen Milkita': 'permen-milkita.png',
  Sampoerna: 'rokok-sampoerna.png',
  'Rokok Sampoerna': 'rokok-sampoerna.png',
  'Beras 1kg': 'Beras.png',
  'Beras Sania 1 kg': 'Beras.png',
  'Minyak Goreng': 'minyak-goreng.png',
  'Minyak Goreng Sania 2 L': 'minyak-goreng.png',
};

const normalizeValue = (value) => String(value || '').trim().toLowerCase();

const normalizedImageByFileName = Object.fromEntries(
  Object.keys(imageByFileName).map((fileName) => [normalizeValue(fileName), fileName])
);

export const PRODUCT_IMAGE_OPTIONS = imageEntries
  .map(({ fileName }) => fileName)
  .sort((a, b) => a.localeCompare(b));

export const getDefaultImageFile = (productName) => defaultImageMap[productName] || '';

export const normalizeImageFile = (value) => {
  const normalized = normalizeValue(value);
  return normalizedImageByFileName[normalized] || '';
};

export const getProductImageSrc = (imageFile) =>
  imageByFileName[normalizeImageFile(imageFile)] || '';

export const resolveProductImage = (product) => {
  const imageFile = normalizeImageFile(product?.image) || getDefaultImageFile(product?.name);
  return {
    fileName: imageFile,
    src: getProductImageSrc(imageFile),
  };
};
