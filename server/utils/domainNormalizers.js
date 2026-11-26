/**
 * Canonical domain normalization helpers shared across StockLine Express controllers and services.
 * Ensures consistent machine keys, line-item shapes, totals, and safe regex queries.
 */

const cleanStr = (val) => String(val || '').trim();

const slugify = (val = '') =>
  cleanStr(val)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');

const escapeRegex = (val = '') => cleanStr(val).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const safeSearchRegex = (query = '') => {
  const escaped = escapeRegex(query);
  return escaped ? { $regex: escaped, $options: 'i' } : null;
};

const roundMoney = (num) => Math.round((Number(num) || 0) * 100) / 100;

const inferBrandFromMachineName = (machineName = '') => {
  const clean = cleanStr(machineName);
  if (!clean) return '';
  const firstWord = clean.split(/[\s/-]+/)[0] || '';
  return firstWord.length >= 2 ? firstWord : clean;
};

const normalizeMachineDetails = (raw = {}) => {
  if (!raw || typeof raw !== 'object') {
    return {
      machineModelId: null,
      machineName: '',
      model: '',
      type: '',
      hp: '',
      ton: '',
      cylinder: '',
      others: '',
      description: '',
      autoSaveToPriceCatalog: true,
    };
  }
  return {
    machineModelId: raw.machineModelId || null,
    machineName: cleanStr(raw.machineName),
    model: cleanStr(raw.model || raw.machineModel),
    type: cleanStr(raw.type || raw.machineType),
    hp: cleanStr(raw.hp),
    ton: cleanStr(raw.ton),
    cylinder: cleanStr(raw.cylinder || raw.cylender),
    others: cleanStr(raw.others),
    description: cleanStr(raw.description),
    autoSaveToPriceCatalog:
      raw.autoSaveToPriceCatalog !== undefined ? Boolean(raw.autoSaveToPriceCatalog) : true,
  };
};

const buildMachineKey = (md = {}) =>
  [
    md.machineName,
    md.model || md.machineModel,
    md.type || md.machineType,
    md.hp,
    md.ton,
    md.cylinder || md.cylender,
  ]
    .map((x) => cleanStr(x).toLowerCase())
    .filter(Boolean)
    .join('|');

const normalizeLineItem = (item = {}, { style = 'quotation', defaultName = '' } = {}) => {
  const qtyRaw = Number(item.quantity);
  const quantity = Number.isFinite(qtyRaw) && qtyRaw > 0 ? qtyRaw : 1;

  const unitPriceRaw =
    item.unitPrice !== undefined
      ? item.unitPrice
      : item.rate !== undefined
      ? item.rate
      : item.price !== undefined
      ? item.price
      : item.sellingPrice;
  const unitPrice = roundMoney(Math.max(0, Number(unitPriceRaw) || 0));

  const explicitTotal =
    item.lineTotal !== undefined
      ? item.lineTotal
      : item.subtotal !== undefined
      ? item.subtotal
      : item.amount !== undefined
      ? item.amount
      : item.total;
  const lineTotal =
    explicitTotal !== undefined && explicitTotal !== ''
      ? roundMoney(Math.max(0, Number(explicitTotal) || 0))
      : roundMoney(quantity * unitPrice);

  const resolvedName = cleanStr(item.name || item.productName || item.partName) || defaultName;
  const unit = cleanStr(item.unit) || 'pc';

  if (style === 'sale') {
    return {
      productId: item.productId || item.id || null,
      productName: resolvedName,
      sku: cleanStr(item.sku),
      description: cleanStr(item.description),
      quantity,
      unit,
      unitPrice,
      lineTotal,
    };
  }

  return {
    productId: item.productId || item.id || null,
    name: resolvedName,
    description: cleanStr(item.description),
    quantity,
    unit,
    unitPrice,
    lineTotal,
  };
};

const calculateDocumentTotals = (items = [], { subtotal, discount, tax, totalAmount } = {}) => {
  const computedSub =
    subtotal !== undefined
      ? Math.max(0, Number(subtotal) || 0)
      : (items || []).reduce((sum, it) => sum + (Number(it.lineTotal ?? Number(it.quantity) * Number(it.unitPrice)) || 0), 0);
  const subtotalVal = roundMoney(computedSub);
  const discountVal = roundMoney(Math.min(subtotalVal, Math.max(0, Number(discount) || 0)));
  const taxVal = roundMoney(Math.max(0, Number(tax) || 0));
  const explicitTotal = totalAmount !== undefined && totalAmount !== '' ? Number(totalAmount) : undefined;
  const totalVal =
    explicitTotal !== undefined && Number.isFinite(explicitTotal)
      ? roundMoney(Math.max(0, explicitTotal))
      : roundMoney(Math.max(0, subtotalVal - discountVal + taxVal));

  return {
    subtotal: subtotalVal,
    discount: discountVal,
    tax: taxVal,
    totalAmount: totalVal,
  };
};

module.exports = {
  cleanStr,
  slugify,
  escapeRegex,
  safeSearchRegex,
  roundMoney,
  inferBrandFromMachineName,
  normalizeMachineDetails,
  buildMachineKey,
  normalizeLineItem,
  calculateDocumentTotals,
};
