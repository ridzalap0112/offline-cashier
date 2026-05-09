const fmt = (n) => `Rp ${Math.round(n || 0).toLocaleString('id-ID')}`;

const rangeLabel = (t, range) => t[range] || range;

export const buildReportSummary = ({ data, range, t }) => {
  const lines = [
    `${t.reportTitle} - ${rangeLabel(t, range)}`,
    `${t.totalSales}: ${fmt(data.totalSales)}`,
    `${t.totalTx}: ${data.txCount}`,
    `${t.totalProfit}: ${fmt(data.totalProfit)}`,
    `${t.avgTx}: ${fmt(data.avgTx)}`,
  ];

  if (data.topProducts?.length) {
    lines.push('', t.topProducts);
    data.topProducts.slice(0, 5).forEach((product, index) => {
      lines.push(`${index + 1}. ${product.name} - ${product.qty} ${t.qty} - ${fmt(product.revenue)}`);
    });
  }

  return lines.join('\n');
};

export const shareReportToWhatsApp = ({ data, range, t }) => {
  const text = buildReportSummary({ data, range, t });
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
};

export const exportReportPdf = async ({ data, range, t }) => {
  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const autoTable = autoTableModule.default;
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text(t.reportTitle, 14, 18);
  doc.setFontSize(10);
  doc.text(rangeLabel(t, range), 14, 26);

  autoTable(doc, {
    startY: 34,
    head: [['Metrik', 'Nilai']],
    body: [
      [t.totalSales, fmt(data.totalSales)],
      [t.totalTx, String(data.txCount)],
      [t.totalProfit, fmt(data.totalProfit)],
      [t.avgTx, fmt(data.avgTx)],
    ],
    styles: { fontSize: 10 },
    headStyles: { fillColor: [26, 107, 69] },
  });

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 10,
    head: [[t.topProducts, t.qty, t.revenue]],
    body: data.topProducts.map((product) => [
      product.name,
      String(product.qty),
      fmt(product.revenue),
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [26, 107, 69] },
  });

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 10,
    head: [[t.paymentBreak, t.revenue]],
    body: Object.entries(data.byMethod).map(([method, value]) => [
      t[method] || method,
      fmt(value),
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [26, 107, 69] },
  });

  doc.save(`laporan-kasir-${range}-${new Date().toISOString().slice(0, 10)}.pdf`);
};
