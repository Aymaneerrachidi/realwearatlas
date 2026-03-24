/**
 * Download data as CSV.
 * @param {string} filename
 * @param {string[]} headers
 * @param {(string|number|null)[][]} rows
 */
export function downloadCSV(filename, headers, rows) {
  const escape = (v) => {
    const s = v == null ? '' : String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))].join('\r\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Download data as PDF using jsPDF + autoTable (lazy-loaded).
 * @param {string} filename
 * @param {string} title
 * @param {string[]} headers
 * @param {(string|number|null)[][]} rows
 */
export async function downloadPDF(filename, title, headers, rows) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const doc = new jsPDF({ orientation: rows[0]?.length > 6 ? 'landscape' : 'portrait' });

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(40, 40, 40);
  doc.text(title, 14, 18);

  // Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text(`RealWear Atlas  ·  Generated ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`, 14, 25);

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 30,
    styles: { fontSize: 8.5, cellPadding: 3, textColor: [40, 40, 40] },
    headStyles: { fillColor: [245, 166, 35], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 8.5 },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    margin: { left: 14, right: 14 },
  });

  doc.save(filename);
}

// ── Inventory export helpers ───────────────────────────────────
export const inventoryCSV = (items) => downloadCSV(
  `inventory_${today()}.csv`,
  ['Name','Brand','Category','Purchase Price (DH)','Purchase Date','Status','Submitted By','Notes'],
  items.map(i => [i.name, i.brand, i.category, i.purchase_price, i.purchase_date, i.status, i.submitted_by, i.notes])
);
export const inventoryPDF = (items) => downloadPDF(
  `inventory_${today()}.pdf`,
  'Inventory Report — RealWear Atlas',
  ['Name','Brand','Category','Cost (DH)','Date','Status','By'],
  items.map(i => [i.name, i.brand||'-', i.category, `${Number(i.purchase_price).toFixed(2)} DH`, i.purchase_date, i.status, i.submitted_by||'-'])
);

// ── Sales export helpers ──────────────────────────────────────
export const salesCSV = (sales) => downloadCSV(
  `sales_${today()}.csv`,
  ['Item','Brand','Category','Selling Price (DH)','Cost (DH)','Profit (DH)','Margin %','Sale Date','Platform','Buyer','Submitted By'],
  sales.map(s => [s.item_name, s.brand, s.category, s.selling_price, s.purchase_price, s.profit?.toFixed(2), s.margin, s.sale_date, s.platform, s.buyer_name, s.submitted_by])
);
export const salesPDF = (sales) => downloadPDF(
  `sales_${today()}.pdf`,
  'Sales Report — RealWear Atlas',
  ['Item','Category','Revenue (DH)','Cost (DH)','Profit (DH)','Margin','Date','By'],
  sales.map(s => [s.item_name, s.category, `${Number(s.selling_price).toFixed(2)} DH`, `${Number(s.purchase_price).toFixed(2)} DH`, `${Number(s.profit).toFixed(2)} DH`, `${s.margin}%`, s.sale_date, s.submitted_by||'-'])
);

// ── Expenses export helpers ──────────────────────────────────
export const expensesCSV = (exps) => downloadCSV(
  `expenses_${today()}.csv`,
  ['Date','Category','Amount (DH)','Notes','Submitted By'],
  exps.map(e => [e.expense_date, e.category, e.amount, e.notes, e.submitted_by])
);
export const expensesPDF = (exps) => downloadPDF(
  `expenses_${today()}.pdf`,
  'Expenses Report — RealWear Atlas',
  ['Date','Category','Amount (DH)','Notes','Submitted By'],
  exps.map(e => [e.expense_date, e.category, `${Number(e.amount).toFixed(2)} DH`, e.notes||'-', e.submitted_by||'-'])
);

function today() {
  return new Date().toISOString().split('T')[0];
}
