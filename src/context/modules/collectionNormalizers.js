/**
 * Uniform record normalizers used during API sync hydration inside AppDataContext.
 */

export const withNormalizedId = (row) => {
  if (!row || typeof row !== 'object') return row;
  const id = row._id || row.id;
  return { ...row, id, _id: id };
};

export const normalizeSupplierList = (list = []) => {
  const seen = new Set();
  const normalized = [];
  for (const s of list) {
    const item = withNormalizedId(s);
    const k = (item?.name || '').trim().toLowerCase();
    if (k && !seen.has(k)) {
      seen.add(k);
      normalized.push(item);
    }
  }
  return normalized;
};

export const normalizePurchaseRecord = (p) => {
  const tot = Number(p.total !== undefined ? p.total : p.totalAmount) || 0;
  return {
    ...withNormalizedId(p),
    total: tot,
    totalAmount: tot,
    date: p.date || p.createdAt,
  };
};

export const normalizeSaleRecord = (s) => {
  const tot = Number(s.total !== undefined ? s.total : s.totalAmount) || 0;
  const paid = Number(s.paidAmount !== undefined ? s.paidAmount : s.paymentStatus === 'paid' ? tot : 0) || 0;
  const due = Math.max(0, tot - paid);
  const inv = s.invoiceNo || s.invoiceNumber || `INV-${s._id || s.id}`;
  return {
    ...withNormalizedId(s),
    invoiceNo: inv,
    invoiceNumber: inv,
    total: tot,
    totalAmount: tot,
    paidAmount: paid,
    dueAmount: s.dueAmount !== undefined ? Number(s.dueAmount) : due,
    date: s.date || s.createdAt,
  };
};

export const normalizeQuotationRecord = (q) => {
  const tot = Number(q.totalAmount !== undefined ? q.totalAmount : q.total) || 0;
  return {
    ...withNormalizedId(q),
    totalAmount: tot,
    total: tot,
    date: q.date || q.createdAt,
  };
};

export const normalizeMoneyReceiptRecord = (r) => ({
  ...withNormalizedId(r),
  amount: Number(r.amount) || 0,
  date: r.date || r.createdAt,
});

export const normalizeOrderRecord = (o) => {
  const tot = Number(o.totalAmount !== undefined ? o.totalAmount : o.total) || 0;
  return {
    ...withNormalizedId(o),
    total: tot,
    totalAmount: tot,
    date: o.date || o.createdAt,
  };
};
